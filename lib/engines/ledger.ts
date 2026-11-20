/**
 * Ledger state machine — BUILD_SPEC §8.4.
 *
 * Every function here is pure: rows in, rows out. Each transition appends a
 * HistoryEntry, and no proposal is ever applied if its quote is not an exact
 * substring of the message it claims to come from.
 */
import type {
  ClauseChange,
  DocVersion,
  EmailMessage,
  LedgerRow,
  ReaderUpdate,
  SourceRef,
  TermKey,
  TermValue,
  Threat,
} from '@/lib/types';
import { READER_CONFIDENCE_MIN } from '@/lib/settings';
import { plainValue, sameValue } from '@/lib/plain';
import { personName } from '@/lib/data';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Whitespace-normalised substring test, used before any update is applied. */
export function quoteFound(quote: string, body: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!quote.trim()) return false;
  return norm(body).includes(norm(quote));
}

function addHistory(row: LedgerRow, at: string, text: string, source: SourceRef) {
  row.history = [...row.history, { at, text, source }];
}

function deactivate(row: LedgerRow, kinds: Threat['kind'][]) {
  row.threats = row.threats.map((t) => (kinds.includes(t.kind) ? { ...t, active: false } : t));
}

function addThreat(row: LedgerRow, threat: Threat) {
  const existing = row.threats.find(
    (t) => t.kind === threat.kind && sameValue(t.value, threat.value),
  );
  if (existing) {
    row.threats = row.threats.map((t) => (t === existing ? { ...threat } : t));
    return;
  }
  row.threats = [...row.threats, threat];
}

export function rowForTerm(rows: LedgerRow[], termKey: TermKey): LedgerRow | undefined {
  return rows.find((r) => r.termKey === termKey);
}

/* ------------------------------------------------------------------ */
/* Reader proposals                                                    */
/* ------------------------------------------------------------------ */

export interface ApplyResult {
  rows: LedgerRow[];
  applied: ReaderUpdate[];
  dropped: { update: ReaderUpdate; reason: string }[];
  events: string[];
}

export function applyReaderUpdates(
  rows: LedgerRow[],
  updates: ReaderUpdate[],
  messages: EmailMessage[],
  opts: { supplierOrgPersonIds: string[]; ourPersonIds: string[] },
): ApplyResult {
  const next = clone(rows);
  const byId = new Map(messages.map((m) => [m.id, m]));
  const applied: ReaderUpdate[] = [];
  const dropped: { update: ReaderUpdate; reason: string }[] = [];
  const events: string[] = [];

  for (const u of updates) {
    const msg = byId.get(u.messageId);
    if (!msg) {
      dropped.push({ update: u, reason: 'message not found' });
      continue;
    }
    if (!quoteFound(u.quote, msg.body)) {
      dropped.push({ update: u, reason: 'quote not found in the message' });
      continue;
    }
    const row = rowForTerm(next, u.termKey);
    if (!row) {
      dropped.push({ update: u, reason: 'no ledger row for that term' });
      continue;
    }

    const source: SourceRef = {
      kind: 'email',
      messageId: msg.id,
      quote: u.quote,
      at: msg.sentAt,
      byPersonId: u.byPersonId,
    };
    const fromSupplier = opts.supplierOrgPersonIds.includes(u.byPersonId);

    switch (u.action) {
      case 'accepts':
      case 'accepts_if': {
        if (!fromSupplier) {
          // Our own side cannot "accept" its own offer into the ledger.
          dropped.push({ update: u, reason: 'acceptance must come from the other side' });
          continue;
        }
        if (u.confidence < READER_CONFIDENCE_MIN || (u.alternatives?.length ?? 0) > 1) {
          toNeedsConfirmation(row, u, source);
          events.push(`${row.label}: needs confirmation (${msg.id}).`);
          applied.push(u);
          break;
        }
        const value = u.value ?? row.position;
        row.position = value;
        row.state = 'agreed';
        row.source = source;
        deactivate(row, ['supplier_ask', 'side_offer']);
        delete row.pendingConfirmation;
        if (u.action === 'accepts_if' && u.condition) {
          row.approvedBy = row.approvedBy ?? undefined;
          row.reason = row.reason ? `${row.reason}. ${u.condition}` : u.condition;
        }
        addHistory(
          row,
          msg.sentAt,
          `Agreed: ${plainValue(value)}${u.condition ? ` (${u.condition})` : ''}.`,
          source,
        );
        events.push(`${row.label}: agreed at ${plainValue(value)}.`);
        applied.push(u);
        break;
      }

      case 'unclear': {
        toNeedsConfirmation(row, u, source);
        events.push(`${row.label}: needs confirmation (${msg.id}).`);
        applied.push(u);
        break;
      }

      case 'proposes': {
        if (!u.value) {
          dropped.push({ update: u, reason: 'proposal with no value' });
          continue;
        }
        if (fromSupplier) {
          const kind = row.state === 'agreed' ? 'new_ask' : 'supplier_ask';
          addThreat(row, {
            id: `TH-${row.termKey}-${msg.id}`,
            kind,
            value: u.value,
            source,
            active: true,
          });
          if (row.state === 'open') row.state = 'changed';
          addHistory(
            row,
            msg.sentAt,
            `${row.state === 'agreed' ? 'New ask' : 'Proposed'}: ${plainValue(u.value)}.`,
            source,
          );
          events.push(
            `${row.label}: ${row.state === 'agreed' ? 'new ask' : 'proposal'} — ${plainValue(
              u.value,
            )}.`,
          );
        } else {
          // Our own side offering something in a side thread.
          addThreat(row, {
            id: `TH-${row.termKey}-${msg.id}`,
            kind: 'side_offer',
            value: u.value,
            source,
            active: true,
          });
          addHistory(
            row,
            msg.sentAt,
            `Our side offered ${plainValue(u.value)} in a side thread.`,
            source,
          );
          events.push(`${row.label}: side offer of ${plainValue(u.value)}.`);
        }
        applied.push(u);
        break;
      }

      case 'retracts': {
        row.threats = row.threats.map((t) =>
          t.source.messageId === u.messageId ? { ...t, active: false } : t,
        );
        addHistory(row, msg.sentAt, 'Earlier position retracted.', source);
        applied.push(u);
        break;
      }

      case 'rejects': {
        addHistory(row, msg.sentAt, `Rejected: ${u.reason}`, source);
        applied.push(u);
        break;
      }
    }
  }

  return { rows: next, applied, dropped, events };
}

function toNeedsConfirmation(row: LedgerRow, u: ReaderUpdate, source: SourceRef) {
  const alternatives = (u.alternatives ?? []).map((value) => {
    // Several threats can carry the same number — the supplier's old draft and
    // a fresh side offer, say. The lead needs the most recent one, because that
    // is the offer the ambiguous reply is most likely answering.
    const matching = row.threats
      .filter((t) => sameValue(t.value, value))
      .sort((a, b) => b.source.at.localeCompare(a.source.at));
    const ourAsk = sameValue(row.position, value) ? row.source : undefined;
    const best = matching[0]?.source ?? ourAsk ?? row.source;
    return { value, source: best };
  });
  const list = alternatives.length
    ? alternatives
    : [
        { value: row.position, source: row.source },
        ...row.threats.filter((t) => t.active).map((t) => ({ value: t.value, source: t.source })),
      ];
  row.state = 'needs_confirmation';
  row.pendingConfirmation = {
    quote: u.quote,
    messageId: u.messageId,
    alternatives: list,
  };
  addHistory(row, source.at, `Ambiguous: "${u.quote}". Needs a person to confirm.`, source);
}

/* ------------------------------------------------------------------ */
/* Confirmation by the lead                                            */
/* ------------------------------------------------------------------ */

export function confirmRow(
  rows: LedgerRow[],
  rowId: string,
  value: TermValue,
  opts: { note?: string; at: string; byPersonId: string; messageId?: string; source?: SourceRef },
): LedgerRow[] {
  const next = clone(rows);
  const row = next.find((r) => r.id === rowId);
  if (!row) return next;

  const callNote: SourceRef | null = opts.note
    ? { kind: 'call_note', quote: opts.note, at: opts.at, byPersonId: opts.byPersonId }
    : null;
  const emailSource: SourceRef | null = row.pendingConfirmation
    ? {
        kind: 'email',
        messageId: row.pendingConfirmation.messageId,
        quote: row.pendingConfirmation.quote,
        at: opts.at,
        byPersonId: 'rohan',
      }
    : null;

  // The side offers the lead has now ruled out, kept as history.
  const ruledOut = row.threats.filter((t) => t.active && !sameValue(t.value, value));

  row.position = value;
  row.state = 'agreed';
  row.source = opts.source ?? callNote ?? emailSource ?? row.source;
  if (value.kind === 'service_credit') {
    row.supplierNote = `Reflects the ${value.pct}% service credit for months below ${value.uptimeTarget}% uptime.`;
  }
  deactivate(row, ['side_offer', 'supplier_ask']);
  delete row.pendingConfirmation;

  for (const t of ruledOut) {
    if (t.kind !== 'side_offer') continue;
    addHistory(
      row,
      t.source.at,
      `${personName(t.source.byPersonId)} offered ${plainValue(
        t.value,
      )} in a side thread.`,
      t.source,
    );
  }
  addHistory(
    row,
    opts.at,
    `Confirmed at ${plainValue(value)}${opts.note ? ` — ${opts.note}` : ''}.`,
    row.source,
  );
  return next;
}

/* ------------------------------------------------------------------ */
/* Version changes                                                     */
/* ------------------------------------------------------------------ */

export function applyVersionChanges(
  rows: LedgerRow[],
  changes: ClauseChange[],
  version: DocVersion,
  extract: (change: ClauseChange) => TermValue | null,
): { rows: LedgerRow[]; events: string[] } {
  const next = clone(rows);
  const events: string[] = [];

  for (const ch of changes) {
    if (!ch.termKey) continue;
    const row = rowForTerm(next, ch.termKey);
    if (!row) continue;
    const value = extract(ch);
    if (!value) continue;
    if (sameValue(value, row.position)) {
      // A later supplier version that matches us closes the old threat.
      if (version.author === 'supplier') {
        row.threats = row.threats.map((t) =>
          t.kind === 'version_change' ? { ...t, active: false } : t,
        );
      }
      continue;
    }

    const source: SourceRef = {
      kind: 'version',
      versionId: version.id,
      clauseNo: ch.clauseNo,
      quote: ch.after,
      at: version.sentAt,
      byPersonId: version.author === 'supplier' ? 'rohan' : 'ananya',
    };

    addThreat(row, {
      id: `TH-${row.termKey}-${version.id}`,
      kind: 'version_change',
      value,
      source,
      active: true,
      hidden: ch.hidden,
    });

    if (row.state === 'agreed') {
      row.state = 'reopened';
      events.push(
        `${row.label}: reopened by ${version.id}, clause ${ch.clauseNo}${
          ch.hidden ? ' (not shown as a tracked change)' : ''
        }.`,
      );
    } else if (row.state === 'open') {
      row.state = 'changed';
      events.push(`${row.label}: changed this round in ${version.id}.`);
    }

    addHistory(
      row,
      version.sentAt,
      `${plainValue(row.position)} → ${plainValue(value)} in ${version.id}, clause ${
        ch.clauseNo
      }${ch.hidden ? ' (not shown as a tracked change)' : ''}.`,
      source,
    );
  }

  return { rows: next, events };
}

/* ------------------------------------------------------------------ */
/* Our own side conceding by email                                     */
/* ------------------------------------------------------------------ */

export function applySentConcession(
  rows: LedgerRow[],
  termKey: TermKey,
  value: TermValue,
  source: SourceRef,
): LedgerRow[] {
  const next = clone(rows);
  const row = rowForTerm(next, termKey);
  if (!row) return next;
  addThreat(row, {
    id: `TH-${termKey}-sent-${source.at}`,
    kind: 'sent_concession',
    value,
    source,
    active: true,
  });
  if (row.state === 'agreed') row.state = 'reopened';
  addHistory(
    row,
    source.at,
    `Our side told the supplier: "${source.quote}". Agreed position was ${plainValue(
      row.position,
    )}.`,
    source,
  );
  return next;
}

/* ------------------------------------------------------------------ */
/* Signing                                                             */
/* ------------------------------------------------------------------ */

export function markSigningGaps(
  rows: LedgerRow[],
  gaps: { rowId: string; value: TermValue; clauseNo: string; versionId: string }[],
  matchedRowIds: string[],
): LedgerRow[] {
  const next = clone(rows);
  for (const row of next) {
    if (matchedRowIds.includes(row.id)) {
      row.signing = 'match';
      continue;
    }
    const gap = gaps.find((g) => g.rowId === row.id);
    if (!gap) continue;
    row.signing = 'gap';
    if (row.state === 'agreed' || row.state === 'reopened') row.state = 'missing_at_signing';
    addThreat(row, {
      id: `TH-${row.termKey}-signing`,
      kind: 'signing_copy',
      value: gap.value,
      source: {
        kind: 'version',
        versionId: gap.versionId,
        clauseNo: gap.clauseNo,
        quote: '',
        at: '',
        byPersonId: 'priya',
      },
      active: true,
    });
  }
  return next;
}

export function insertWordingForRow(
  rows: LedgerRow[],
  rowId: string,
  at: string,
): LedgerRow[] {
  const next = clone(rows);
  const row = next.find((r) => r.id === rowId);
  if (!row) return next;
  row.signing = 'inserted';
  row.state = 'agreed';
  addHistory(
    row,
    at,
    `Agreed wording inserted in the signing copy as a tracked change. Waiting for the supplier to accept.`,
    { kind: 'manual', quote: 'Inserted in the signing copy', at, byPersonId: 'ananya' },
  );
  return next;
}

export function waiveGapForRow(
  rows: LedgerRow[],
  rowId: string,
  reason: string,
  at: string,
): LedgerRow[] {
  const next = clone(rows);
  const row = next.find((r) => r.id === rowId);
  if (!row) return next;
  row.signing = 'waived';
  row.waiveReason = reason;
  row.state = 'agreed';
  addHistory(row, at, `Gap waived: ${reason}`, {
    kind: 'manual',
    quote: reason,
    at,
    byPersonId: 'ananya',
  });
  return next;
}

/** At signing every live threat ends — the signed clause is what is enforced. */
export function closeAllThreats(rows: LedgerRow[], at: string): LedgerRow[] {
  const next = clone(rows);
  for (const row of next) {
    row.threats = row.threats.map((t) => ({ ...t, active: false }));
    if (row.state !== 'agreed') row.state = 'agreed';
    if (!row.signing) row.signing = 'match';
    addHistory(row, at, 'Signed. This term is now enforced from the signed clause.', {
      kind: 'manual',
      quote: 'Signed copy v7',
      at,
      byPersonId: 'ananya',
    });
  }
  return next;
}

/**
 * The lead chose a playbook fallback or walk-away position instead of the
 * agreed wording. The ledger now records that position as what we are
 * offering, so the returned copy is checked against it, and the history keeps
 * what had been agreed before.
 */
export function applyPlaybookPositionForRow(
  rows: LedgerRow[],
  rowId: string,
  value: TermValue,
  label: 'fallback' | 'walk-away',
  at: string,
): LedgerRow[] {
  const next = clone(rows);
  const row = next.find((r) => r.id === rowId);
  if (!row) return next;
  const before = row.position;
  row.position = value;
  row.signing = 'inserted';
  row.state = 'agreed';
  row.playbookPosition = label;
  addHistory(
    row,
    at,
    `Playbook ${label} offered instead of the agreed ${plainValue(before)}: ${plainValue(value)}. Inserted as a tracked change.`,
    { kind: 'manual', quote: `Playbook ${label}: ${plainValue(value)}`, at, byPersonId: 'ananya' },
  );
  return next;
}

/** Add a line to a row's history (e.g. why someone sent anyway). */
export function noteOnRow(rows: LedgerRow[], termKey: TermKey, at: string, text: string, byPersonId: string): LedgerRow[] {
  const next = clone(rows);
  const row = rowForTerm(next, termKey);
  if (!row) return next;
  addHistory(row, at, text, { kind: 'manual', quote: text, at, byPersonId });
  return next;
}
