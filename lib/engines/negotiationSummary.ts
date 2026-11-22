/**
 * "Negotiation so far" (walkthrough brief, Part B): the whole story of one
 * negotiation in one place, built by code from the store. No model, no ₹.
 *
 * Each tracked term sits in exactly one group, from two separate facts
 * (review fix A5): where the negotiation stands (negotiationStatus) and what
 * the latest version says (draftMatch).
 *   Agreed and in {latest}          agreed + matches
 *   Agreed, but {latest} says …     agreed + differs / missing / conflict
 *   Open                            everything else, ambiguous included
 * plus what people are waiting on and the exceptions logged so far.
 *
 * Clock-aware: only rounds, sends and approvals at or before the clock count,
 * and "latest version" is the latest received or saved by then. Counts come
 * from selectTermCounts; round lines from the Outlook pane's roundSummary.
 * Internal only: nothing here goes into a supplier-facing string.
 */
import type { Deal, DocVersion, LedgerRow, SourceRef, TermKey } from '@/lib/types';
import { cloudDeskDeal, personName, versionById, versions } from '@/lib/data';
import { latestVersionId } from './headline';
import { selectTermCounts, termStatuses, type TermCounts } from './termStatus';
import { conditionState } from './conditions';
import { extractValue } from './diff';
import { roundSummary } from './replyCopy';
import { plainValue, TERM_LABELS } from '@/lib/plain';
import { formatDateShort, formatDateTime } from '@/lib/format';
import { ROUNDS, roundsBy } from '@/lib/demo/rounds';

export interface SummaryState {
  clock: string;
  ledger: LedgerRow[];
  syncedVersionIds: string[];
  signedAt?: string;
  sendOutcomes: { at: string; personId: string; termKey?: TermKey; choice?: string; reason?: string; guardCase?: string }[];
  approvals: { kind: string; label: string; termKey: TermKey; status: string; approverId: string; requestedById: string; reason?: string; at: string }[];
  termHolds: Partial<Record<TermKey, 'waiting_lead' | 'conceded_pending'>>;
  signing: { returnedCopy?: DocVersion; submittedCopy?: DocVersion };
}

export type SummaryMode = 'deal' | 'handover';
export type GroupKey = 'agreed_in' | 'agreed_differs' | 'open' | 'waiting' | 'exceptions';

export interface SummaryTermLine {
  rowId: string;
  termKey: TermKey;
  label: string;
  /** "Annual price: fixed for 3 years" */
  text: string;
  /** "v6: yearly revision" (agreed, but the draft says otherwise). */
  draftText?: string;
  /** "If the term is 3 years · met" */
  condition?: { text: string; state: 'met' | 'not_met' | 'unknown' };
  source: SourceRef;
  /** For "Open §": Word at this clause. */
  clauseNo?: string;
  wordHref?: string;
  /** Open terms: each side's last position, with its date and source. */
  sides?: { text: string; source: SourceRef }[];
  /** "Supplier reply ambiguous", "Your proposal, not confirmed by CloudDesk". */
  status?: string;
  /** The term's next action. */
  action?: { label: string; href: string; kind?: 'draft_clarification' };
  /** Agreed at the start and never moved: folded under "other terms unchanged". */
  unchanged?: boolean;
}

export interface SummaryNote {
  text: string;
  at: string;
}

export interface SummaryGroup {
  key: GroupKey;
  title: string;
  terms: SummaryTermLine[];
  notes: SummaryNote[];
}

export interface SummaryRound {
  no: number;
  at: string;
  /** "14 Nov" */
  date: string;
  messageId: string;
  who: string;
  /** The Outlook pane's one-line round summary (same generator). */
  summary: string;
  href: string;
}

export interface NegotiationSummary {
  dealId: string;
  mode: SummaryMode;
  title: string;
  asOf: string;
  versionId: string;
  round: number;
  /** "Round 4 · last move: Rohan (CloudDesk), 14 Nov · latest version v4" */
  headline: string;
  counts: TermCounts;
  /** "7 tracked terms · 5 agreed and in v4 · 1 agreed, changed in v4 · 1 open" */
  countsLine: string;
  /** The collapsed card: "Round 4 · 5 agreed and in v4 · 1 agreed, changed in v4 · 1 open" */
  collapsedLine: string;
  groups: SummaryGroup[];
  rounds: SummaryRound[];
  /** Names of the agreed terms that never moved, for the "n other terms unchanged" fold. */
  unchangedTerms: string[];
}

const SUPPLIER = new Set(['rohan', 'priya']);
const first = (id: string) => personName(id).split(' ')[0];

/** The version a person would call "latest" at this clock: received or saved by then. */
function latestVersion(s: SummaryState): DocVersion {
  const id = latestVersionId(s);
  if (id === 'v7') return s.signing.returnedCopy ?? s.signing.submittedCopy ?? versionById('v6')!;
  return versionById(id)!;
}

function previousVersion(v: DocVersion): DocVersion | undefined {
  return versions.filter((x) => x.sentAt < v.sentAt).sort((a, b) => a.sentAt.localeCompare(b.sentAt)).at(-1);
}

/** The round line: the same generator as the Outlook pane's round summary. */
function roundLine(round: (typeof ROUNDS)[number], rows: LedgerRow[], deal: Deal): string {
  const at = (iso: string) => versions.filter((v) => v.sentAt <= iso).at(-1);
  const next = round.kind === 'version' ? versionById(round.ref) : at(round.at);
  const prev = round.kind === 'version' && next ? previousVersion(next) : next;
  if (!next || !prev) return `${first(round.who)} sent the first draft.`;
  return roundSummary({ rows, prev, next, roundMessageId: round.messageId, from: first(round.who), deal }).text;
}

function sideVerb(personId: string, owner: string): string {
  if (SUPPLIER.has(personId)) return 'proposed';
  return personId === owner ? 'asked' : 'offered';
}

export function buildNegotiationSummary(state: SummaryState, dealId: string = cloudDeskDeal.id, clock: string = state.clock, mode: SummaryMode = 'deal'): NegotiationSummary {
  const deal = cloudDeskDeal;
  const s = { ...state, clock };
  const version = latestVersion(s);
  const vid = state.signedAt ? 'v7' : version.id;
  const rows = state.ledger;
  const statuses = termStatuses(rows, version, deal);
  const counts = selectTermCounts(rows, version, deal);
  const happened = roundsBy(clock);
  const last = happened.at(-1);
  const supplier = deal.supplier;

  const agreedIn: SummaryTermLine[] = [];
  const differs: SummaryTermLine[] = [];
  const open: SummaryTermLine[] = [];

  for (const row of rows) {
    const st = statuses.find((t) => t.rowId === row.id)!;
    const value = plainValue(row.position, deal.termYears).toLowerCase();
    const cond = conditionState(row, version, deal);
    const base: SummaryTermLine = {
      rowId: row.id,
      termKey: row.termKey,
      label: row.label,
      text: `${row.label}: ${value}`,
      source: row.source,
      clauseNo: st.clauseNo,
      condition: row.condition && cond ? { text: row.condition.text.replace(/^if /, 'If '), state: cond.state } : undefined,
    };
    if (st.negotiation === 'agreed' && st.draft === 'matches') {
      agreedIn.push({ ...base, unchanged: row.history.length <= 1 });
    } else if (st.negotiation === 'agreed') {
      const clause = version.clauses.find((c) => c.termKey === row.termKey);
      const docValue = clause ? extractValue(clause) : null;
      differs.push({
        ...base,
        draftText:
          st.draft === 'missing'
            ? `${vid}: not in this copy`
            : st.draft === 'internal_conflict'
              ? `${vid}: two clauses disagree`
              : `${vid}: ${docValue ? plainValue(docValue, deal.termYears).toLowerCase() : 'different wording'}`,
        wordHref: st.clauseNo ? `/word/${vid === 'v7' ? 'v6' : vid}?from=sirion&clause=${st.clauseNo}` : undefined,
      });
    } else {
      const alternatives = row.pendingConfirmation?.alternatives ?? [];
      const sides =
        alternatives.length > 0
          ? alternatives.map((a) => ({
              text: `${first(a.source.byPersonId)} ${sideVerb(a.source.byPersonId, deal.ownerId)} ${plainValue(a.value, deal.termYears).toLowerCase()} (${formatDateShort(a.source.at)})`,
              source: a.source,
            }))
          : [{ text: `${SUPPLIER.has(row.source.byPersonId) ? supplier : first(row.source.byPersonId)} ${sideVerb(row.source.byPersonId, deal.ownerId)} ${value} (${formatDateShort(row.source.at)})`, source: row.source }];
      const ambiguous = st.negotiation === 'ambiguous';
      open.push({
        ...base,
        sides,
        status: ambiguous
          ? 'Supplier reply ambiguous'
          : st.negotiation === 'buyer_proposed'
            ? `Your proposal, not confirmed by ${supplier}`
            : st.negotiation === 'supplier_proposed'
              ? `${supplier}'s proposal, not agreed`
              : 'Open',
        action: ambiguous && row.pendingConfirmation
          ? { label: 'Draft clarification', href: `/outlook/ananya?msg=${row.pendingConfirmation.messageId}`, kind: 'draft_clarification' }
          : { label: `Confirm ${row.label.toLowerCase()}`, href: `/deals/${dealId}?row=${row.id}` },
      });
    }
  }

  /* Waiting on: handoffs and approvals not yet answered. */
  const waiting: SummaryNote[] = [];
  const outcomes = state.sendOutcomes.filter((o) => o.at <= clock);
  for (const [termKey, hold] of Object.entries(state.termHolds) as [TermKey, string][]) {
    if (hold !== 'waiting_lead') continue;
    const o = outcomes.findLast((x) => x.termKey === termKey && x.choice === 'loop_in');
    waiting.push({
      text: `${first(deal.ownerId)}: decision on ${TERM_LABELS[termKey].toLowerCase()}. ${o ? first(o.personId) : 'A colleague'} looped ${first(deal.ownerId)} in; the reply to ${first(last?.who ?? 'rohan')} is held until then.`,
      at: o?.at ?? clock,
    });
  }
  for (const a of state.approvals.filter((x) => x.status === 'pending' && x.at <= clock)) {
    waiting.push({ text: `${first(a.approverId)}: approval for ${a.label.toLowerCase()}, requested by ${first(a.requestedById)}.`, at: a.at });
  }

  /* Exceptions: Send anyway and Publish anyway, with the reason given. */
  const exceptions: SummaryNote[] = [];
  for (const o of outcomes.filter((x) => x.choice === 'send_anyway')) {
    const what = o.guardCase === 'give_away' ? 'gives away' : o.guardCase === 'contradicts_pending' ? 'settles' : 'reopens';
    const term = o.termKey ? TERM_LABELS[o.termKey].toLowerCase() : 'a term';
    exceptions.push({ text: `${first(o.personId)} sent a reply that ${what} ${term} without sign-off${o.reason ? `. Reason: “${o.reason}”` : ''}.`, at: o.at });
  }
  for (const a of state.approvals.filter((x) => x.at <= clock && x.kind !== 'send_anyway')) {
    const verb = a.kind === 'publish_anyway' ? 'published with a gap on' : a.kind === 'waive' ? 'waived the gap on' : a.kind === 'accept_theirs' ? `accepted ${supplier}'s wording on` : a.kind === 'walk_away' ? 'offered the walk-away position on' : 'made an exception on';
    exceptions.push({ text: `${first(a.requestedById)} ${verb} ${a.label.toLowerCase()}${a.reason ? `. Reason: “${a.reason}”` : ''}.`, at: a.at });
  }

  const latestWord = vid;
  const groups: SummaryGroup[] = [
    { key: 'agreed_in' as const, title: `Agreed and in ${latestWord}`, terms: agreedIn, notes: [] },
    { key: 'agreed_differs' as const, title: `Agreed, but ${latestWord} says otherwise`, terms: differs, notes: [] },
    { key: 'open' as const, title: mode === 'handover' ? 'Unresolved at signature' : 'Open', terms: open, notes: [] },
    { key: 'waiting' as const, title: 'Waiting on', terms: [], notes: waiting },
    { key: 'exceptions' as const, title: 'Exceptions', terms: [], notes: exceptions },
  ].filter((g) => g.terms.length || g.notes.length);

  const rounds: SummaryRound[] = happened.map((r) => ({
    no: r.no,
    at: r.at,
    date: formatDateShort(r.at),
    messageId: r.messageId,
    who: personName(r.who),
    summary: roundLine(r, rows, deal),
    href: `/outlook/ananya?msg=${r.messageId}`,
  }));

  const agreedTotal = counts.total - counts.notAgreed;
  const changed = agreedTotal - counts.matchesAgreed;
  const parts = [
    `${counts.matchesAgreed} agreed and in ${latestWord}`,
    changed ? `${changed} agreed, changed in ${latestWord}` : '',
    counts.notAgreed ? `${counts.notAgreed} ${mode === 'handover' ? 'unresolved' : 'open'}` : '',
  ].filter(Boolean);
  const roundNo = last?.no ?? 0;
  const lastMove = last ? `last move: ${first(last.who)} (${supplier}), ${formatDateShort(last.at)}` : 'no rounds yet';

  return {
    dealId,
    mode,
    title: `Negotiation so far · ${supplier} MSA`,
    asOf: `as of ${formatDateTime(clock)}`,
    versionId: latestWord,
    round: roundNo,
    headline: `Round ${roundNo} · ${lastMove} · latest version ${latestWord}`,
    counts,
    countsLine: `${counts.total} tracked terms · ${parts.join(' · ')}`,
    collapsedLine: `Round ${roundNo} · ${parts.join(' · ')}`,
    groups,
    rounds,
    unchangedTerms: agreedIn.filter((t) => t.unchanged).map((t) => t.label),
  };
}

/** Every piece of text in the summary, for the supplier-safe and no-₹ tests. */
export function summaryText(s: NegotiationSummary): string[] {
  return [
    s.title,
    s.asOf,
    s.headline,
    s.countsLine,
    s.collapsedLine,
    ...s.groups.flatMap((g) => [g.title, ...g.notes.map((n) => n.text), ...g.terms.flatMap((t) => [t.text, t.draftText ?? '', t.status ?? '', t.condition?.text ?? '', ...(t.sides ?? []).map((x) => x.text), t.action?.label ?? ''])]),
    ...s.rounds.map((r) => r.summary),
  ].filter(Boolean);
}
