/**
 * AskSirion answers. Pure: (intent, slots, scope, state) in, AskAnswer out.
 * Every ₹ figure, count and date comes from the same engines the Deal Ledger
 * screens use, so the same question in the same state gives the same figure
 * everywhere. Supplier-facing text goes through the supplier-safe builders.
 */
import { cloudDeskDeal, dealById, deals, messageById, messages, pastContracts, personName, threadById, versionById, versions } from '@/lib/data';
import { dealAtRisk, rowPriceTag, worstThreat } from '@/lib/engines/atRisk';
import { explainHeadline, COST_RULE } from '@/lib/engines/explain';
import { signingCheck } from '@/lib/engines/signing';
import { approvalRoute } from '@/lib/engines/approvals';
import { priceChange } from '@/lib/engines/pricing';
import { extractValue } from '@/lib/engines/diff';
import { checkInvoice } from '@/lib/engines/invoices';
import { FAST_FORWARD_INVOICE } from '@/lib/engines/handover';
import { matchAllThreads, toHeader } from '@/lib/engines/matcher';
import { askSupplierDraft, HOLDING_REPLY, isSupplierSafe } from '@/lib/engines/wording';
import { BRIGHTSTAFF, BRIGHTSTAFF_SIGNING_COPY, listedAtRisk } from '@/lib/demo/moreDeals';
import { internalConflicts, precedenceClause } from '@/lib/engines/conflicts';
import { nextActionFor } from '@/lib/demo/nextAction';
import { roundsBy, ROUNDS } from '@/lib/demo/rounds';
import { STEP_CLOCK } from '@/lib/demo/steps';
import { latestVersionId as latestVersion } from '@/lib/engines/headline';
import { formatDateLong, formatDateShort, formatDateTime, formatInr, formatLakh } from '@/lib/format';
import { plainSentence, plainValue, sameValue, TERM_LABELS } from '@/lib/plain';
import { CONTRACT_ID } from '@/lib/settings';
import type { LedgerRow, SourceRef, TermKey, TermValue } from '@/lib/types';
import { answer as advise } from './advisor';
import { CLAUSE_TOPICS, INTENT_BY_ID } from './intents';
import type { AskAction, AskAnswer, AskQuote, AskScope, AskState, IntentId, Slots, SourceChipSpec } from './types';
import { shiftText } from '@/lib/demo/timeShift';

const deal = cloudDeskDeal;
/** "Annual price" reads as "Price" in chips and lists. */
const short = (label: string) => (label === 'Annual price' ? 'Price' : label);
const DEAL_HREF = `/deals/${deal.id}`;
export const LEDGER_LINKS = {
  row: (rowId: string) => `${DEAL_HREF}?row=${rowId}`,
  ledger: `${DEAL_HREF}/ledger`,
  threads: `${DEAL_HREF}?tab=threads`,
  rounds: `${DEAL_HREF}?tab=rounds`,
  signingTab: `${DEAL_HREF}?tab=signing`,
};

/* ------------------------------------------------------------------ */
/* State helpers                                                       */
/* ------------------------------------------------------------------ */

/** The latest copy of the CloudDesk contract at this point on the clock. */
export const latestVersionId = (s: AskState): string => latestVersion(s);

function versionValue(versionId: string, term: TermKey): TermValue | null {
  const v = versionById(versionId);
  const clause = v?.clauses.find((c) => c.termKey === term);
  return clause ? extractValue(clause) : null;
}

const quoteOf = (src: SourceRef): AskQuote => ({
  source: src,
  label: src.kind === 'version' ? `${src.versionId} · clause ${src.clauseNo}` : `${personName(src.byPersonId)} · ${formatDateTime(src.at)}`,
});

/** The figure a Deal Ledger screen shows for a row: its share of the headline, a year. */
function rowFigure(rows: LedgerRow[], row: LedgerRow) {
  const line = explainHeadline(rows, deal).lines.find((l) => l.rowId === row.id);
  if (!line) return undefined;
  const tag = rowPriceTag(row, deal);
  return {
    lakh: line.shareLakh,
    text: `${formatLakh(line.shareLakh)} a year (expected)`,
    sub: line.onceLakh ? `${formatLakh(line.onceLakh)} at the next renewal, spread over the ${deal.termYears}-year term` : tag?.overTermLakh ? `${formatLakh(tag.overTermLakh)} over the ${deal.termYears}-year term` : undefined,
    basis: tag?.n ? `Based on ${tag.n} of your ${row.termKey === 'renewal_notice' ? 'renewals' : row.termKey === 'service_credit' ? 'months of uptime records' : 'contracts'}` : undefined,
    confidence: tag && tag.confidence !== 'none' ? tag.confidence : undefined,
  } as AskAnswer['figure'];
}

function emailChip(s: AskState): SourceChipSpec {
  const rounds = roundsBy(s.clock).length;
  const dealThreads = ['T1', 'T3', 'T4', ...(s.linkedThreadIds.includes('T2') ? ['T2'] : [])];
  const mailboxes = 1 + (s.linkedThreadIds.includes('T2') && s.mailboxes.vikram ? 1 : 0);
  return { kind: 'ledger', label: `Email: ${rounds} rounds · ${dealThreads.length} threads · ${mailboxes} mailbox${mailboxes === 1 ? '' : 'es'}`, href: LEDGER_LINKS.threads };
}

function dealChips(s: AskState, extra: SourceChipSpec[] = []): SourceChipSpec[] {
  return [
    { kind: 'filter', label: `Status: ${s.signedAt ? 'Signed' : 'Negotiating'}` },
    { kind: 'filter', label: 'Deal: CloudDesk MSA' },
    ...extra,
  ];
}

const openInLedger = (href: string, label = 'Open in Deal Ledger'): AskAction => ({ label, href, primary: true, ledger: true });

function base(intent: IntentId, partial: Partial<AskAnswer>): AskAnswer {
  const def = INTENT_BY_ID[intent];
  return {
    intent,
    source: def.source,
    usesLedger: def.source === 'deal-ledger',
    sources: [],
    text: [],
    quotes: [],
    actions: [],
    followUps: [],
    facts: [],
    ...partial,
  };
}

/** Collect every ₹ figure and percentage in an answer, for the live rephrase guard. */
function withFacts(a: AskAnswer): AskAnswer {
  const facts = [...a.text, a.figure?.text ?? '', a.figure?.sub ?? '', ...(a.list ?? []).map((l) => `${l.label} ${l.detail ?? ''} ${l.value ?? ''}`), ...(a.chart?.rows ?? []).map((r) => r.valueText), a.chart?.total ?? '', ...(a.conflict ?? [])].filter(Boolean);
  return { ...a, facts };
}

const supplierMsgHref = (s: AskState, persona: AskScope['persona']) => {
  if (persona === 'vikram') return '/outlook/vikram?msg=M13';
  const last = messages
    .filter((m) => m.threadId === 'T1' && m.sentAt <= s.clock && m.from.endsWith(`@${deal.supplierDomain}`))
    .at(-1);
  return `/outlook/ananya?msg=${last?.id ?? 'M8'}`;
};

/* ------------------------------------------------------------------ */
/* Fallbacks                                                           */
/* ------------------------------------------------------------------ */

export function fallbackAnswer(suggestions: string[]): AskAnswer {
  return {
    intent: 'fallback',
    source: 'none',
    usesLedger: false,
    sources: [],
    text: ['In this prototype AskSirion answers questions about your contracts and live negotiations. Try one of these:'],
    quotes: [],
    actions: [],
    followUps: suggestions.slice(0, 3),
    facts: [],
  };
}

function notFound(what: string, suggestions: string[]): AskAnswer {
  return {
    intent: 'not_found',
    source: 'none',
    usesLedger: false,
    sources: [],
    text: [`Not found in ${what}.`],
    quotes: [],
    actions: [],
    followUps: suggestions.slice(0, 3),
    facts: [],
  };
}

/* ------------------------------------------------------------------ */
/* Contracts (Sirion repository, today)                                */
/* ------------------------------------------------------------------ */

function quarterWindow(clock: string, which: 'this' | 'next'): [string, string, string] {
  const d = new Date(clock);
  let q = Math.floor(d.getUTCMonth() / 3) + (which === 'next' ? 1 : 0);
  let y = d.getUTCFullYear();
  if (q > 3) {
    q = 0;
    y += 1;
  }
  const start = new Date(Date.UTC(y, q * 3, 1));
  const end = new Date(Date.UTC(y, q * 3 + 3, 0));
  const label = `${formatDateShort(start.toISOString())}–${formatDateLong(end.toISOString())}`;
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10), label];
}

function repoSearch(question: string, s: AskState): AskAnswer {
  const q = question.toLowerCase();
  const type = (['software', 'staffing', 'logistics', 'facilities', 'consultants', 'marketing'] as const).find((t) => q.includes(t.replace(/s$/, '')));
  const d = new Date(s.clock);
  let window: [string, string, string];
  if (/\bnext quarter\b/.test(q)) window = quarterWindow(s.clock, 'next');
  else if (/\bthis month\b/.test(q)) {
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    window = [s.clock.slice(0, 7) + '-01', end.toISOString().slice(0, 10), new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(d)];
  } else if (/\b(this|next) year\b/.test(q)) {
    const y = d.getUTCFullYear() + (/\bnext year\b/.test(q) ? 1 : 0);
    window = [`${y}-01-01`, `${y}-12-31`, String(y)];
  } else window = quarterWindow(s.clock, 'this');
  const found = pastContracts
    .filter((c) => !type || c.type === type)
    .filter((c) => c.endDate >= window[0] && c.endDate <= window[1])
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
  const typeLabel = type ? `${type[0].toUpperCase()}${type.slice(1)}` : 'All types';
  return withFacts(
    base('repo_search', {
      sources: [
        { kind: 'filter', label: `Type: ${typeLabel}` },
        { kind: 'filter', label: `Renews: ${window[2]}` },
        { kind: 'count', label: `${found.length} contract${found.length === 1 ? '' : 's'} →`, href: '/contracts' },
      ],
      text: found.length
        ? [`${found.length} ${type ?? ''} contract${found.length === 1 ? '' : 's'} come${found.length === 1 ? 's' : ''} up for renewal in ${window[2]}.`.replace('  ', ' ')]
        : [`No ${type ?? ''} contracts come up for renewal in ${window[2]}.`.replace('  ', ' ')],
      list: found.slice(0, 6).map((c) => ({
        label: c.name,
        detail: `${c.id} · ends ${formatDateLong(c.endDate)}${c.noticeDays ? ` · ${c.noticeDays} days' notice` : ''}${c.autoRenew ? ' · auto-renews' : ''}`,
        value: `${formatLakh(c.annualFeeInr / 1e5)} a year`,
      })),
      actions: [{ label: `${found.length} contracts →`, href: '/contracts', primary: true }],
      followUps: ['Summarise the CloudDesk MSA', 'Which live negotiations would cost the most if signed today?'],
    }),
  );
}

function contractSummary(s: AskState): AskAnswer {
  const vId = latestVersionId(s);
  const v = vId === 'v7' ? undefined : versionById(vId);
  const value = (t: TermKey) => {
    if (s.contract || vId === 'v7') return plainValue(s.ledger.find((r) => r.termKey === t)?.position, deal.termYears);
    return plainValue(versionValue(vId, t), deal.termYears);
  };
  const keyTerms = (['price', 'payment', 'renewal_notice', 'service_credit', 'liability_cap', 'exit_support'] as TermKey[]).map((t) => `${TERM_LABELS[t]}: ${value(t).toLowerCase()}`);
  const signed = Boolean(s.signedAt);
  return withFacts(
    base('contract_summary', {
      usesLedger: false,
      sources: [
        { kind: 'filter', label: `Status: ${signed ? 'Signed' : 'Negotiating'}` },
        { kind: 'filter', label: 'Deal: CloudDesk MSA' },
        { kind: 'filter', label: `Version: ${vId}` },
      ],
      text: [
        `CloudDesk MSA (${CONTRACT_ID}) between Meridian Foods and CloudDesk Technologies: a helpdesk subscription for ${deal.seats} seats at ${formatInr(deal.annualFeeInr)} a year, for ${deal.termYears} years from ${formatDateLong(deal.termStart)}.`,
        signed
          ? `Signed on ${formatDateShort(s.signedAt!)} (v7).${s.contract ? ` ${s.contract.obligations.length} obligations and ${s.contract.rules.length} invoice rules are tracked in Sirion.` : ''}`
          : `${v ? `${v.id} (${v.author === 'supplier' ? 'from CloudDesk' : 'ours'}, ${formatDateShort(v.sentAt)})` : vId} is the latest draft.`,
      ],
      list: keyTerms.map((k) => ({ label: k.split(': ')[0], detail: k.split(': ')[1] })),
      actions: [{ label: 'Open contract', href: signed && s.contract ? `/contracts/${CONTRACT_ID}` : DEAL_HREF, primary: true }],
      followUps: ['What’s the termination notice in CloudDesk?', 'Which terms are still open?', 'Does this copy match what we agreed?'],
    }),
  );
}

function clauseLookup(question: string, slots: Slots, s: AskState): AskAnswer {
  const vId = latestVersionId(s);
  const v = versionById(vId === 'v7' ? 'v6' : vId)!;
  const topic = CLAUSE_TOPICS.find(([name]) => name === slots.topic);
  const clause = topic
    ? v.clauses.find((c) => c.no === topic[2])
    : slots.term
      ? v.clauses.find((c) => c.termKey === slots.term)
      : v.clauses.find((c) => question.toLowerCase().includes(c.title.toLowerCase()));
  if (!clause) return notFound('CloudDesk’s contract, emails or drafts', ['What’s the termination notice in CloudDesk?', 'Summarise the CloudDesk MSA']);
  const first = clause.text.split(/(?<=\.)\s/).slice(0, 2).join(' ');
  return withFacts(
    base('clause_lookup', {
      usesLedger: false,
      sources: [
        { kind: 'filter', label: 'Deal: CloudDesk MSA' },
        { kind: 'filter', label: `Version: ${vId}` },
        { kind: 'filter', label: `Clause: ${clause.no}` },
      ],
      text: [
        topic?.[0] === 'termination'
          ? `There is no separate termination clause. Clause ${clause.no} (${clause.title}) sets the notice: ${first}`
          : `Clause ${clause.no} (${clause.title}): ${first}`,
      ],
      quotes: [{ source: { kind: 'version', versionId: v.id, clauseNo: clause.no, quote: first, at: v.sentAt, byPersonId: v.author === 'supplier' ? 'rohan' : 'ananya' }, label: `${v.id} · clause ${clause.no}` }],
      actions: [{ label: 'Open in Word', href: `/word/${vId === 'v7' ? 'v7' : v.id}?from=sirion`, primary: true }],
      followUps: clause.termKey ? [`What did CloudDesk agree on ${TERM_LABELS[clause.termKey].toLowerCase().replace('annual ', '')}?`] : ['Summarise the CloudDesk MSA'],
      term: clause.termKey,
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Negotiations (Deal Ledger, new)                                     */
/* ------------------------------------------------------------------ */

const TERM_PICK = ['What did CloudDesk agree on price?', 'What was agreed on renewal notice?', 'What was agreed on service credit?'];

function agreedTerm(question: string, slots: Slots, scope: AskScope, s: AskState): AskAnswer {
  const rows = s.ledger;
  if (!slots.term) {
    if (/\b(on|about|for)\s+\w+/.test(question.toLowerCase()) && !/\b(with|from) clouddesk\b/i.test(question)) {
      return notFound('CloudDesk’s contract, emails or drafts', TERM_PICK);
    }
    // Every term, with where it was agreed.
    return withFacts(
      base('agreed_term', {
        sources: dealChips(s, [emailChip(s)]),
        text: [
          scope.persona === 'vikram'
            ? 'Ananya leads the commercials. These are the agreed positions; if CloudDesk raises one with you, loop her in rather than agreeing in a reply.'
            : `Every term with CloudDesk, and where it was agreed.`,
        ],
        list: rows.map((r) => ({
          label: r.label,
          detail: `${plainValue(r.position, deal.termYears)}${r.state === 'agreed' ? '' : ' · not settled'} · ${r.source.kind === 'email' ? `${personName(r.source.byPersonId)}, ${formatDateShort(r.source.at)}` : r.source.kind === 'version' ? `${r.source.versionId}, clause ${r.source.clauseNo}` : formatDateShort(r.source.at)}`,
          href: LEDGER_LINKS.row(r.id),
        })),
        actions: [openInLedger(LEDGER_LINKS.ledger)],
        followUps: TERM_PICK,
      }),
    );
  }
  const row = rows.find((r) => r.termKey === slots.term)!;
  const label = TERM_LABELS[row.termKey];
  const agreed = plainValue(row.position, deal.termYears).toLowerCase();
  const vId = latestVersionId(s);
  const draftValue = vId === 'v7' ? null : versionValue(vId, row.termKey);
  const draftDiffers = draftValue && !sameValue(draftValue, row.position);
  const who = personName(row.source.byPersonId);
  const settled = row.state === 'agreed' || row.state === 'reopened' || row.state === 'missing_at_signing';
  const text: string[] = [];
  if (settled) {
    text.push(
      row.source.kind === 'email'
        ? `${row.source.byPersonId === 'rohan' || row.source.byPersonId === 'priya' ? 'CloudDesk' : who} agreed the ${label.toLowerCase()}: ${plainSentence(row.position, deal.termYears)}. ${who} confirmed it on ${formatDateTime(row.source.at)}.`
        : `${label} is agreed at ${agreed} (${row.source.kind === 'version' ? `${row.source.versionId}, clause ${row.source.clauseNo}` : `${row.source.kind === 'call_note' ? 'call note' : 'noted'}, ${formatDateShort(row.source.at)}`}).`,
    );
  } else {
    const threat = worstThreat(row, deal);
    text.push(`${label} is not agreed yet. Your position: ${agreed}.${threat ? ` CloudDesk’s last: ${plainValue(threat.value, deal.termYears).toLowerCase()} (${formatDateShort(threat.source.at)}).` : ''}`);
  }
  const threat = worstThreat(row, deal);
  if (threat && settled && threat.source.kind === 'email' && threat.kind === 'new_ask') {
    text.push(`${personName(threat.source.byPersonId)} asked again on ${formatDateShort(threat.source.at)} for ${plainValue(threat.value, deal.termYears).toLowerCase()}.`);
  }
  if (draftValue) text.push(draftDiffers ? `The latest draft (${vId}) says ${plainValue(draftValue, deal.termYears).toLowerCase()}.` : `The latest draft (${vId}) says the same.`);
  if (vId === 'v7') text.push('The signed copy (v7) has it.');

  const conflict = draftDiffers && settled
    ? [
        `Email (${formatDateShort(row.source.at)}): ${agreed}`,
        `Draft ${vId} (${formatDateShort(versionById(vId)!.sentAt)}): ${plainValue(draftValue, deal.termYears).toLowerCase()}`,
        `${versionById(vId)!.sentAt > row.source.at ? `${vId} is newer, but the` : 'The'} agreed position comes from email; the draft has not caught up.`,
      ]
    : undefined;
  const previous = row.history.length > 1 ? row.history.at(-2) : undefined;
  if (previous && previous.source.kind === 'email' && previous.at < row.source.at && !sameValue(row.position, row.position)) {
    text.push(`Previously: ${previous.text}`);
  }
  const figure = row.owner === 'legal' ? undefined : rowFigure(rows, row);
  if (row.owner === 'legal') text.push('Not priced: Legal-owned term.');
  return withFacts(
    base('agreed_term', {
      sources: dealChips(s, [{ kind: 'filter', label: `Term: ${short(label)}` }, { kind: 'filter', label: `Version: ${vId}` }, emailChip(s), ...(row.source.kind === 'email' ? [{ kind: 'ledger' as const, label: `Agreed in email: ${formatDateShort(row.source.at)}`, href: LEDGER_LINKS.row(row.id) }] : [])]),
      text: text.slice(0, 3),
      figure: figure ? { ...figure, text: `${figure.text}` } : undefined,
      quotes: row.source.quote ? [quoteOf(row.source)] : [],
      conflict,
      actions: [openInLedger(LEDGER_LINKS.row(row.id))],
      followUps: [row.termKey === 'renewal_notice' ? 'and price?' : 'and renewal notice?', 'Which terms are still open?', ...(figure ? [`How is ${formatLakh(figure.lakh)} worked out?`] : [])],
      term: row.termKey,
    }),
  );
}

function roundChanges(slots: Slots, scope: AskScope, s: AskState): AskAnswer {
  const happened = roundsBy(s.clock);
  const byMessage = scope.messageId ? ROUNDS.find((r) => r.messageId === scope.messageId) : undefined;
  const round = slots.round ? ROUNDS.find((r) => r.no === slots.round) : byMessage ?? happened.at(-1);
  if (!round) return notFound('CloudDesk’s emails or drafts: no round has arrived yet', ['Summarise the CloudDesk MSA']);
  if (round.at > s.clock) {
    return withFacts(
      base('round_changes', {
        sources: dealChips(s, [emailChip(s)]),
        text: [`Round ${round.no} hasn’t happened yet on the demo clock (${formatDateTime(round.at)}). The latest is round ${happened.at(-1)?.no ?? 0}.`],
        actions: [openInLedger(LEDGER_LINKS.rounds)],
        followUps: [`What changed in round ${happened.at(-1)?.no ?? 1}?`],
      }),
    );
  }
  const moved = s.ledger.filter((r) => r.history.some((h) => h.at === round.at)).map((r) => ({ row: r, entry: r.history.find((h) => h.at === round.at)! }));
  const message = messageById(round.messageId);
  const from = personName(round.who);
  return withFacts(
    base('round_changes', {
      sources: dealChips(s, [{ kind: 'filter', label: `Round: ${round.no}` }, ...(round.kind === 'version' ? [{ kind: 'filter' as const, label: `Version: ${round.ref}` }] : []), emailChip(s)]),
      text: [
        `Round ${round.no} came from ${from} on ${formatDateTime(round.at)}${round.kind === 'version' ? ` with ${round.ref}` : ', in the email itself'}. ${moved.length ? `${moved.length} term${moved.length === 1 ? '' : 's'} moved:` : 'No agreed term moved.'}`,
      ],
      list: moved.map(({ row, entry }) => ({ label: row.label, detail: entry.text, href: LEDGER_LINKS.row(row.id) })),
      quotes: message ? [quoteOf({ kind: 'email', messageId: message.id, quote: message.body.split(/(?<=\.)\s/)[0], at: message.sentAt, byPersonId: round.who })] : [],
      actions: [openInLedger(LEDGER_LINKS.rounds), { label: 'Open thread', href: `/outlook/ananya?msg=${round.messageId}` }],
      followUps: ['Which terms are still open?', 'What did CloudDesk agree on price?'],
    }),
  );
}

function openTerms(scope: AskScope, s: AskState): AskAnswer {
  const rows = s.ledger;
  const x = explainHeadline(rows, deal);
  const open = rows.filter((r) => r.state !== 'agreed' || worstThreat(r, deal));
  const list = open.map((r) => {
    const t = worstThreat(r, deal);
    const line = x.lines.find((l) => l.rowId === r.id);
    return {
      label: r.label,
      detail: `You: ${plainValue(r.position, deal.termYears).toLowerCase()}${t ? ` · CloudDesk: ${plainValue(t.value, deal.termYears).toLowerCase()}` : ''}${r.state === 'needs_confirmation' ? ' · needs confirming' : r.state === 'reopened' ? ' · reopened' : ''}`,
      value: line ? `${formatLakh(line.shareLakh)} a year` : r.owner === 'legal' ? 'Not priced' : undefined,
      href: LEDGER_LINKS.row(r.id),
    };
  });
  return withFacts(
    base('open_terms', {
      sources: dealChips(s, [emailChip(s), { kind: 'count', label: `${open.length} open →`, href: LEDGER_LINKS.ledger }]),
      text: open.length
        ? [`${open.length} term${open.length === 1 ? ' is' : 's are'} not settled with CloudDesk. Expected cost if signed as is: ${formatLakh(x.totalLakh)} a year.`]
        : ['Nothing is open: every term matches what was agreed.'],
      figure: open.length && x.totalLakh > 0 ? { lakh: x.totalLakh, text: `${formatLakh(x.totalLakh)} a year (expected)`, sub: x.sumText } : undefined,
      list,
      actions: [openInLedger(LEDGER_LINKS.ledger), ...(scope.persona === 'ananya' && open.length ? [{ label: 'Draft reply', href: `${supplierMsgHref(s, scope.persona)}&draft=${encodeURIComponent(draftFor(open[0], s).text)}` }] : [])],
      followUps: open[0] ? [`What should I put for ${open[0].label.toLowerCase().replace('annual ', '')} instead?`, `How is ${formatLakh(x.totalLakh)} worked out?`] : ['Does this copy match what we agreed?'],
      term: open[0]?.termKey,
    }),
  );
}

function otherThreads(scope: AskScope, s: AskState): AskAnswer {
  const matches = matchAllThreads(messages.map(toHeader), deals, versions);
  const t2Linked = s.linkedThreadIds.includes('T2');
  const t2 = matches.T2;
  const list: AskAnswer['list'] = [];
  const text: string[] = [];
  if (scope.persona === 'vikram') {
    // Vikram sees his own thread and the deal's agreed positions, never Ananya's unlinked threads.
    list.push({ label: threadById('T2')!.subject, detail: `Your thread with Rohan · ${t2Linked ? 'linked to the CloudDesk negotiation' : 'not linked yet'}`, href: '/outlook/vikram?msg=M13' });
    list.push({ label: threadById('T1')!.subject, detail: 'The supplier thread · Ananya leads the commercials' });
    text.push(`Ananya leads the CloudDesk negotiation in the main supplier thread. ${t2Linked ? 'Your thread with Rohan is linked to it, so what you agree there is checked against what Ananya agreed.' : 'Your thread with Rohan is not linked yet.'}`);
  } else {
    for (const id of ['T1', 'T3', 'T4']) {
      const t = threadById(id)!;
      list.push({ label: t.subject, detail: `Linked · ${t.participants?.map((p) => personName(p).split(' ')[0]).join(', ')}`, href: LEDGER_LINKS.threads });
    }
    if (!s.mailboxes.vikram) {
      text.push('Rohan mentions Vikram, but Vikram’s mailbox isn’t connected, so his side of the conversation can’t be checked.');
      list.push({ label: 'Vikram Shah’s mailbox', detail: 'Not connected · nothing in it is read' });
    } else if (t2Linked) {
      text.push('Yes. Vikram Shah (IT) has a thread with Rohan on uptime. It was linked to this deal, with Undo, and his “5% would be fine” was checked against Ananya’s 10%.');
      list.push({ label: threadById('T2')!.subject, detail: 'Linked · Vikram, Rohan · read', href: LEDGER_LINKS.threads });
    } else {
      text.push(`Possibly. One thread in Vikram Shah’s mailbox matches CloudDesk by sender (${t2?.strength ?? 'weak'} match). Body not read yet.`);
      list.push({ label: `${formatDateShort(messages.find((m) => m.threadId === 'T2')!.sentAt)} · rohan.iyer@clouddesk.example → Vikram Shah`, detail: `${t2?.strength === 'strong' ? 'Strong' : 'Weak'} match · metadata only · body not read yet` });
    }
    text.unshift(`${list.filter((l) => l.detail?.startsWith('Linked')).length} threads are linked to the CloudDesk deal.`);
  }
  return withFacts(
    base('other_threads', {
      sources: dealChips(s, [emailChip(s)]),
      text,
      list,
      actions: [openInLedger(LEDGER_LINKS.threads)],
      followUps: ['Which terms are still open?', 'What did CloudDesk agree on service credit?'],
    }),
  );
}

function canIAgree(question: string, slots: Slots, scope: AskScope, s: AskState): AskAnswer {
  const term = slots.term ?? 'service_credit';
  const row = s.ledger.find((r) => r.termKey === term)!;
  const label = TERM_LABELS[term];
  const position = plainSentence(row.position, deal.termYears);
  // What they are asking for: the live threat, else the latest value anyone offered that differs.
  const threat = worstThreat(row, deal) ?? [...row.threats].filter((t) => !sameValue(t.value, row.position)).sort((a, b) => a.source.at.localeCompare(b.source.at)).at(-1) ?? null;
  const asked = threat ? plainSentence(threat.value, deal.termYears) : null;
  const tag = threat ? priceChange(deal, row.position, threat.value) : null;
  const lakh = tag?.costLakhPerYr === null || tag?.costLakhPerYr === undefined ? null : term === 'renewal_notice' ? tag.costLakhPerYr / deal.termYears : tag.costLakhPerYr;
  const route = approvalRoute(row, lakh);
  const approver = personName(route.approverId);
  const owner = scope.persona === 'vikram' ? 'Ananya' : 'Your';
  const text = [
    asked
      ? `${owner === 'Your' ? 'Your' : 'Ananya’s'} position on ${label.toLowerCase()} is ${position}. CloudDesk is asking for ${asked.replace(/ below [\d.]+% uptime$/, '')}.`
      : `${owner === 'Your' ? 'Your' : 'Ananya’s'} position on ${label.toLowerCase()} is ${position}, and nothing is asking to move it.`,
  ];
  if (lakh !== null && asked) text.push(`Agreeing would cost an expected ${formatLakh(lakh)} a year${tag?.proof[0] ? ` (${tag.proof[0].replace(/\.$/, '')})` : ''}.`);
  else if (row.owner === 'legal') text.push('Not priced: Legal-owned term.');
  text.push(`A change on this term needs ${route.approverId === 'ananya' && scope.persona === 'ananya' ? 'your' : `${approver}’s`} sign-off.`);
  const note = `Hi Ananya, Rohan is asking me about ${label.toLowerCase()}${asked ? ` (${asked})` : ''}. I haven't agreed anything. Can you take it from here? Thanks, Vikram`;
  void question;
  return withFacts(
    base('can_i_agree', {
      sources: dealChips(s, [{ kind: 'filter', label: `Term: ${short(label)}` }, emailChip(s)]),
      text,
      figure: lakh !== null && asked ? { lakh, text: `${formatLakh(lakh)} a year (expected)`, basis: tag?.n ? `Based on ${tag.n} ${term === 'service_credit' ? 'months of uptime records' : 'of your contracts'}` : undefined, confidence: tag && tag.confidence !== 'none' ? tag.confidence : undefined } : undefined,
      quotes: [quoteOf(row.source), ...(threat ? [quoteOf(threat.source)] : [])].filter((q) => q.source.quote),
      actions:
        scope.persona === 'vikram'
          ? [{ label: 'Draft a note to Ananya', copy: note, primary: true }, openInLedger(LEDGER_LINKS.row(row.id))].map((a, i) => ({ ...a, primary: i === 0 }))
          : [openInLedger(LEDGER_LINKS.row(row.id))],
      followUps: ['What did CloudDesk agree on price?', 'Did anyone else talk to CloudDesk?'],
      term,
    }),
  );
}

/** The signing check, as the Word pane runs it. Fixed and waived gaps are left out of the cost. */
export function signingSummary(s: AskState) {
  const arrived = s.clock >= STEP_CLOCK[4];
  const vId = s.signedAt ? 'v7' : arrived ? 'v6' : latestVersionId(s);
  const version = versionById(vId === 'v7' ? 'v6' : vId)!;
  const result = signingCheck(s.ledger, version, deal);
  const fixed = (t: TermKey) => s.signing.inserted.includes(t) || s.signing.waived.some((w) => w.termKey === t);
  const open = vId === 'v6' || vId === 'v7' ? result.gaps.filter((g) => !fixed(g.termKey)) : result.gaps;
  const annual = (g: (typeof result.gaps)[number]) => (g.costLakhPerYr ?? 0) / (g.termKey === 'renewal_notice' ? deal.termYears : 1);
  const totalLakh = open.reduce((sum, g) => sum + annual(g), 0);
  return { arrived, vId, result, open, totalLakh, annual, fixedCount: result.gaps.length - open.length };
}

function signingMatch(s: AskState): AskAnswer {
  const { arrived, vId, result, open, totalLakh, annual, fixedCount } = signingSummary(s);
  const href = s.signedAt ? LEDGER_LINKS.signingTab : arrived ? '/word/v6?from=sirion' : `/word/${vId}?from=sirion`;
  const text: string[] = [];
  if (s.signedAt) {
    text.push('The signed copy (v7) has every agreed term. Signed and handed over to Sirion.');
  } else {
    if (!arrived) text.push(`The signing copy hasn’t arrived yet (expected ${formatDateShort(STEP_CLOCK[4])}). ${vId} is the latest draft:`);
    text.push(
      open.length
        ? `${open.length} agreed term${open.length === 1 ? ' is' : 's are'} not in ${arrived ? 'this copy' : vId}. Expected cost if signed as is: ${formatLakh(totalLakh)} a year.`
        : `Every agreed term is in ${arrived ? 'this copy' : vId}${fixedCount ? ` once your ${fixedCount} fix${fixedCount === 1 ? '' : 'es'} are accepted` : ''}.`,
    );
    if (open.length) text.push(`${open.map((g) => `${short(g.label)} (${formatLakh(annual(g))})`).join(' · ')}. ${result.matches.length} term${result.matches.length === 1 ? '' : 's'} match what was agreed.`);
  }
  return withFacts(
    base('signing_match', {
      sources: dealChips(s, [{ kind: 'filter', label: `Version: ${vId}` }, emailChip(s)]),
      text,
      figure: open.length && !s.signedAt ? { lakh: totalLakh, text: `${formatLakh(totalLakh)} a year (expected)`, sub: 'if signed as is' } : undefined,
      list: s.signedAt ? undefined : open.map((g) => ({ label: `${g.clauseNo} · ${g.label}`, detail: `Agreed: ${g.agreedPlain.toLowerCase()} · this copy: ${g.docPlain.toLowerCase()}`, value: formatLakh(annual(g)), href: LEDGER_LINKS.row(g.rowId) })),
      quotes: open.slice(0, 2).map((g) => quoteOf(g.source)).filter((q) => q.source.quote),
      actions: [openInLedger(href, s.signedAt ? 'Open in Deal Ledger' : 'Open signing check')],
      followUps: open[0] ? [`Draft a reply asking CloudDesk to restore the ${open[0].label.toLowerCase().replace('annual ', '')}`, `How is ${formatLakh(totalLakh)} worked out?`] : ['Which live negotiations would cost the most if signed today?'],
      term: open[0]?.termKey,
    }),
  );
}

function explainFigure(slots: Slots, s: AskState): AskAnswer {
  const x = explainHeadline(s.ledger, deal);
  const sign = signingSummary(s);
  // Which figure: a term, a ₹ figure the user typed, or the headline.
  const typed = slots.value?.startsWith('₹') ? slots.value.replace(/\s+/g, ' ') : undefined;
  let line = slots.term ? x.lines.find((l) => s.ledger.find((r) => r.id === l.rowId)?.termKey === slots.term) : undefined;
  if (!line && typed) line = x.lines.find((l) => formatLakh(l.shareLakh) === typed || (l.onceLakh && formatLakh(l.onceLakh) === typed));
  if (!line && typed && typed !== formatLakh(x.totalLakh)) {
    // The signing check's figure and its rows.
    const gap = sign.result.gaps.find((g) => formatLakh(sign.annual(g)) === typed || formatLakh(g.costLakhPerYr) === typed);
    if (gap) {
      return withFacts(
        base('explain_figure', {
          sources: dealChips(s, [{ kind: 'filter', label: `Term: ${short(gap.label)}` }, { kind: 'filter', label: 'Version: v6' }]),
          text: [`${gap.label}: agreed ${gap.agreedPlain.toLowerCase()}, the signing copy says ${gap.docPlain.toLowerCase()}.`, ...gap.priceTag.proof.slice(0, 2)],
          figure: { lakh: sign.annual(gap), text: `${formatLakh(sign.annual(gap))} a year (expected)` },
          list: gap.priceTag.proof.slice(2).map((p) => ({ label: p })),
          actions: [openInLedger(LEDGER_LINKS.row(gap.rowId))],
          followUps: ['Does this copy match what we agreed?'],
          term: gap.termKey,
        }),
      );
    }
    if (formatLakh(sign.totalLakh) === typed && sign.open.length) {
      return withFacts(
        base('explain_figure', {
          sources: dealChips(s, [{ kind: 'filter', label: 'Version: v6' }]),
          text: [COST_RULE[0], `The signing copy misses ${sign.open.length} agreed terms: ${sign.open.map((g) => `${short(g.label)} ${formatLakh(sign.annual(g))}`).join(' + ')} = ${formatLakh(sign.totalLakh)} a year.`],
          figure: { lakh: sign.totalLakh, text: `${formatLakh(sign.totalLakh)} a year (expected)` },
          actions: [openInLedger('/word/v6?from=sirion', 'Open signing check')],
          followUps: ['Does this copy match what we agreed?'],
        }),
      );
    }
    // No such figure right now: say so, and explain the figure there is. No guessing.
    const headline = explainFigure({}, s);
    return { ...headline, text: [`There is no ${typed} figure on CloudDesk right now. The current figure is ${formatLakh(x.totalLakh)} a year:`, ...headline.text.slice(1)] };
  }
  if (line) {
    const row = s.ledger.find((r) => r.id === line!.rowId)!;
    const fig = rowFigure(s.ledger, row);
    return withFacts(
      base('explain_figure', {
        sources: dealChips(s, [{ kind: 'filter', label: `Term: ${short(line.label)}` }, emailChip(s)]),
        text: [line.summary, line.proof[0]],
        figure: fig,
        list: line.proof.slice(1).map((p) => ({ label: p })),
        quotes: [quoteOf(row.source)].filter((q) => q.source.quote),
        actions: [openInLedger(LEDGER_LINKS.row(row.id))],
        followUps: [`What should I put for ${line.label.toLowerCase().replace('annual ', '')} instead?`, `How is ${formatLakh(x.totalLakh)} worked out?`],
        term: row.termKey,
      }),
    );
  }
  if (slots.term) {
    const row = s.ledger.find((r) => r.termKey === slots.term)!;
    return withFacts(
      base('explain_figure', {
        sources: dealChips(s, [{ kind: 'filter', label: `Term: ${short(TERM_LABELS[slots.term])}` }]),
        text: [row.owner === 'legal' ? `${row.label} has no ₹ figure: it is a Legal-owned term.` : `${row.label} has no ₹ figure right now: nothing is asking to move it from ${plainValue(row.position, deal.termYears).toLowerCase()}.`],
        actions: [openInLedger(LEDGER_LINKS.row(row.id))],
        followUps: [`How is ${formatLakh(x.totalLakh)} worked out?`],
        term: row.termKey,
      }),
    );
  }
  return withFacts(
    base('explain_figure', {
      sources: dealChips(s, [emailChip(s)]),
      text: [COST_RULE[0], x.lines.length ? `${x.sumText}. ${x.totalText}` : x.totalText],
      figure: x.totalLakh > 0 ? { lakh: x.totalLakh, text: `${formatLakh(x.totalLakh)} a year (expected)`, sub: 'if signed as is' } : undefined,
      list: x.lines.map((l) => ({ label: l.label, detail: l.summary, value: `${formatLakh(l.shareLakh)} a year`, href: LEDGER_LINKS.row(l.rowId) })),
      actions: [openInLedger(LEDGER_LINKS.ledger)],
      followUps: x.lines[0] ? [`Why is ${x.lines[0].label.toLowerCase().replace('annual ', '')} worth ${formatLakh(x.lines[0].shareLakh)}?`] : [],
    }),
  );
}

/** Every live negotiation: expected ₹ a year if its latest draft were signed today. Same figures as the Deals list. */
export function portfolio(s: AskState) {
  const others = deals
    .filter((d) => !d.interactive && d.stage !== 'signed')
    .map((d) => ({ id: d.id, label: d.supplier, lakh: listedAtRisk(d), highlight: false }));
  const cloud = s.signedAt ? null : { id: deal.id, label: 'CloudDesk MSA', lakh: dealAtRisk(s.ledger, deal), highlight: true };
  const rows = [...(cloud ? [cloud] : []), ...others].sort((a, b) => b.lakh - a.lakh);
  const totalLakh = rows.reduce((sum, r) => sum + r.lakh, 0);
  return { rows, totalLakh, cloudSigned: !cloud };
}

function portfolioAtRisk(s: AskState): AskAnswer {
  const p = portfolio(s);
  const top = p.rows[0];
  return withFacts(
    base('portfolio_at_risk', {
      sources: [
        { kind: 'filter', label: 'Status: Negotiating' },
        { kind: 'filter', label: 'All suppliers' },
        { kind: 'ledger', label: `Deal Ledger: ${p.rows.length} live negotiations` },
        { kind: 'count', label: `${p.rows.length} negotiations →`, href: '/deals' },
      ],
      text: [`${top.label} would cost the most if signed today: ${formatLakh(top.lakh)} a year (expected).`, 'Each figure is the expected ₹ a year if that deal’s latest draft were signed as is.'],
      chart: {
        rows: p.rows.map((r) => ({ label: r.label, lakh: r.lakh, valueText: formatLakh(r.lakh), highlight: r.highlight, href: `/deals/${r.id}`, action: nextActionFor(dealById(r.id)!, s) })),
        total: `Total if every latest draft were signed today: ${formatLakh(p.totalLakh)} a year`,
        footnote: p.cloudSigned ? 'CloudDesk MSA: signed · every agreed term in' : undefined,
      },
      actions: [{ label: `${p.rows.length} negotiations →`, href: '/deals', primary: true, ledger: true }, { label: 'Open deal', href: `/deals/${top.id}` }],
      followUps: ['Which terms are still open?', 'Show software contracts renewing this quarter'],
    }),
  );
}

function invoiceMismatch(s: AskState): AskAnswer {
  const price = s.ledger.find((r) => r.termKey === 'price')!;
  if (!s.contract || !s.invoiceFastForward) {
    return withFacts(
      base('invoice_mismatch', {
        sources: dealChips(s),
        text: [
          s.contract
            ? shiftText('No invoice mismatch yet. Every CloudDesk invoice so far matches the signed price. December 2027’s invoice arrives on 5 Dec 2027.')
            : 'There is nothing to check yet: CloudDesk isn’t signed, so no invoices are billed against it. After signing, every invoice is checked against the agreed price.',
        ],
        actions: [openInLedger(s.contract ? `/contracts/${CONTRACT_ID}?tab=invoices` : LEDGER_LINKS.ledger, s.contract ? 'Open invoices' : 'Open in Deal Ledger')],
        followUps: ['What did CloudDesk agree on price?'],
      }),
    );
  }
  const flags = checkInvoice(FAST_FORWARD_INVOICE, s.contract.rules);
  const over = flags.find((f) => f.kind === 'over_agreed_price');
  if (!over) {
    return withFacts(base('invoice_mismatch', { sources: dealChips(s), text: [`${FAST_FORWARD_INVOICE.id} matches the signed contract.`], actions: [{ label: 'Open invoice', href: `/contracts/${CONTRACT_ID}?tab=invoices`, primary: true }] }));
  }
  return withFacts(
    base('invoice_mismatch', {
      sources: dealChips(s, [{ kind: 'filter', label: `Invoice: ${FAST_FORWARD_INVOICE.id}` }, { kind: 'filter', label: `Clause: ${over.clauseNo}` }, { kind: 'ledger', label: `Agreed in email: ${formatDateShort(price.source.at)}`, href: LEDGER_LINKS.row(price.id) }]),
      text: [
        `${FAST_FORWARD_INVOICE.id} for December 2027 bills ${formatInr(FAST_FORWARD_INVOICE.amountInr)}. Clause ${over.clauseNo} of the signed contract fixes ${formatInr(over.expectedInr!)} a month, so it is ${formatInr(over.overInr!)} over.`,
        `The fixed price traces back to ${personName(price.source.byPersonId)}’s email of ${formatDateShort(price.source.at)}.`,
      ],
      quotes: [quoteOf(price.source)].filter((q) => q.source.quote),
      list: [
        { label: 'Invoice line', detail: `December 2027 · ${formatInr(FAST_FORWARD_INVOICE.amountInr)}` },
        { label: `Contract clause ${over.clauseNo}`, detail: `${formatInr(over.expectedInr!)} a month, fixed` },
        { label: 'Original email', detail: `${personName(price.source.byPersonId)}, ${formatDateShort(price.source.at)}` },
      ],
      actions: [{ label: 'Open invoice', href: `/contracts/${CONTRACT_ID}?tab=invoices`, primary: true }, openInLedger(LEDGER_LINKS.row(price.id))].map((a, i) => ({ ...a, primary: i === 0 })),
      followUps: ['What did CloudDesk agree on price?'],
      term: 'price',
    }),
  );
}

/** A supplier-safe draft for a term, from the existing builders. */
export function draftFor(row: LedgerRow, s: AskState): { text: string; safe: boolean } {
  const vId = latestVersionId(s);
  const v = versionById(vId === 'v7' ? 'v6' : vId)!;
  const clause = v.clauses.find((c) => c.termKey === row.termKey);
  const docValue = clause ? extractValue(clause) : null;
  const agreedWhen = row.source.kind === 'email' ? `in your email of ${formatDateShort(row.source.at)}` : row.source.kind === 'version' ? `in ${row.source.versionId}` : `on ${formatDateShort(row.source.at)}`;
  const text =
    clause && docValue && !sameValue(docValue, row.position)
      ? askSupplierDraft({ greetingName: 'Rohan', clauseNo: clause.no, fileName: v.fileName, docPlain: plainValue(docValue, deal.termYears), agreedPlain: plainValue(row.position, deal.termYears), agreedWhen })
      : `Hi Rohan, on ${TERM_LABELS[row.termKey].toLowerCase().replace('annual ', '')}: we agreed ${plainValue(row.position, deal.termYears).toLowerCase()} ${agreedWhen}. Could you keep that in the next copy? Thanks, Ananya`;
  return { text, safe: isSupplierSafe(text) };
}

function draftReply(slots: Slots, scope: AskScope, s: AskState): AskAnswer {
  if (scope.persona === 'vikram') {
    return withFacts(
      base('draft_reply', {
        sources: dealChips(s),
        text: ['Ananya leads the commercials, so the reply to Rohan should hand pricing to her rather than agree or refuse.'],
        wording: HOLDING_REPLY,
        actions: [{ label: 'Open as Outlook draft', href: `/outlook/vikram?msg=M13&draft=${encodeURIComponent(HOLDING_REPLY)}`, primary: true }],
        followUps: ['Can I tell Rohan 99.5% uptime is fine?'],
      }),
    );
  }
  const flagged = s.ledger.filter((r) => worstThreat(r, deal));
  const row = slots.term ? s.ledger.find((r) => r.termKey === slots.term)! : flagged[0] ?? s.ledger.find((r) => r.termKey === 'price')!;
  const draft = draftFor(row, s);
  const wording = draft.safe ? draft.text : 'Hi Rohan, could you restore the wording we agreed in the next copy? Thanks, Ananya';
  return withFacts(
    base('draft_reply', {
      sources: dealChips(s, [{ kind: 'filter', label: `Term: ${short(row.label)}` }, emailChip(s)]),
      text: [`A reply to Rohan on ${row.label.toLowerCase()}, using what was agreed (${plainValue(row.position, deal.termYears).toLowerCase()}). It is supplier-safe: no ₹, no internal names, no limits.`],
      wording,
      quotes: [quoteOf(row.source)].filter((q) => q.source.quote),
      actions: [{ label: 'Open as Outlook draft', href: `${supplierMsgHref(s, 'ananya')}&draft=${encodeURIComponent(wording)}`, primary: true }, openInLedger(LEDGER_LINKS.row(row.id))].map((a, i) => ({ ...a, primary: i === 0 })),
      followUps: ['Which terms are still open?'],
      term: row.termKey,
    }),
  );
}

function suggestTerm(question: string, slots: Slots, scope: AskScope, s: AskState): AskAnswer {
  const viewer = scope.persona === 'vikram' ? 'owner' : 'lead';
  const a = advise(question, { rows: s.ledger, deal, termKey: slots.term, viewer, showFallbacks: viewer === 'lead' || s.ownersSeeFallbacks });
  const row = a.termKey ? s.ledger.find((r) => r.termKey === a.termKey) : undefined;
  return withFacts(
    base('suggest_term', {
      sources: dealChips(s, [...(row ? [{ kind: 'filter' as const, label: `Term: ${short(row.label)}` }] : []), emailChip(s)]),
      text: a.lines.slice(0, 3),
      list: a.options?.map((o) => ({ label: o.label, detail: o.value, value: o.cost })),
      wording: a.wording,
      quotes: row?.source.quote ? [quoteOf(row.source)] : [],
      actions: [openInLedger(row ? LEDGER_LINKS.row(row.id) : LEDGER_LINKS.ledger)],
      followUps: ['Which terms are still open?', 'Draft a reply asking CloudDesk to restore the fixed price'],
      term: a.termKey,
    }),
  );
}

/** Review fix C11: BrightStaff's signing copy disagrees with itself; answered from the internal_conflict finding. */
function internalConflictAnswer(s: AskState): AskAnswer {
  const conflict = internalConflicts(BRIGHTSTAFF_SIGNING_COPY.clauses)[0];
  const [body, schedule] = conflict.clauses;
  const email = BRIGHTSTAFF.emails.find((e) => e.id === 'B4')!;
  void s;
  return withFacts(
    base('internal_conflict', {
      sources: [
        { kind: 'filter', label: 'Deal: BrightStaff Services' },
        { kind: 'filter', label: `Version: ${BRIGHTSTAFF_SIGNING_COPY.versionId}` },
        { kind: 'ledger', label: `Agreed in email: ${formatDateShort(email.at)}`, href: '/deals/D-BRIGHTSTAFF' },
      ],
      text: [
        `${body.ref} says ${body.value}${body.unit}; the ${schedule.ref} says ${schedule.value}${schedule.unit}. The same signing copy states two different markups.`,
        `${email.fromName} agreed ${body.value}${body.unit} by email on ${formatDateShort(email.at)}. Correct the rate card before signature; after signature, which rate applies is for the contract owner to decide.`,
      ],
      list: [
        ...conflict.clauses.map((c) => ({ label: c.ref, detail: `“${c.text}”`, value: `${c.value}${c.unit}` })),
        { label: 'Order of precedence', detail: precedenceClause(BRIGHTSTAFF_SIGNING_COPY) },
      ],
      actions: [{ label: 'Open in Deal Ledger', href: '/deals/D-BRIGHTSTAFF', primary: true, ledger: true }],
      followUps: ['Which live negotiations would cost the most if signed today?'],
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function buildAnswer(intent: IntentId, slots: Slots, scope: AskScope, s: AskState, question = '', suggestions: string[] = []): AskAnswer {
  if (intent === 'internal_conflict') return internalConflictAnswer(s);
  // A ledger question about a deal other than CloudDesk: send it to that deal's page.
  const other = slots.dealId && slots.dealId !== deal.id ? dealById(slots.dealId) : undefined;
  if (other && INTENT_BY_ID[intent].source === 'deal-ledger' && intent !== 'portfolio_at_risk') {
    return withFacts({
      ...base(intent, {}),
      sources: [{ kind: 'filter', label: `Deal: ${other.supplier}` }],
      text: [`In this prototype Deal Ledger reads the full rounds for CloudDesk only. ${other.supplier} is tracked at ${formatLakh(listedAtRisk(other))} a year if signed as is; its deal page has the detail.`],
      actions: [openInLedger(`/deals/${other.id}`)],
      followUps: suggestions.slice(0, 2),
    });
  }
  switch (intent) {
    case 'repo_search':
      return repoSearch(question, s);
    case 'contract_summary':
      return contractSummary(s);
    case 'clause_lookup':
      return clauseLookup(question, slots, s);
    case 'agreed_term':
      return agreedTerm(question, slots, scope, s);
    case 'round_changes':
      return roundChanges(slots, scope, s);
    case 'open_terms':
      return openTerms(scope, s);
    case 'other_threads':
      return otherThreads(scope, s);
    case 'can_i_agree':
      return canIAgree(question, slots, scope, s);
    case 'signing_match':
      return signingMatch(s);
    case 'explain_figure':
      return explainFigure(slots, s);
    case 'portfolio_at_risk':
      return portfolioAtRisk(s);
    case 'invoice_mismatch':
      return invoiceMismatch(s);
    case 'draft_reply':
      return draftReply(slots, scope, s);
    case 'suggest_term':
      return suggestTerm(question, slots, scope, s);
  }
}
