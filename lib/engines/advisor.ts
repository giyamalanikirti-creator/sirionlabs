/**
 * "Ask Deal Ledger": answers questions like "What should I put for renewal
 * notice instead?" from the ledger, the playbook and the pricing engine.
 *
 * This is the rules answer. It always works (no key, no network). When a
 * model is available, /api/ask asks it to phrase the same facts, and rejects
 * any reply that contains a ₹ figure or percentage not in these facts.
 */
import type { Deal, LedgerRow, TermKey } from '@/lib/types';
import { playbookOptions, recommendedMove, rowHeadlineShare } from './playbook';
import { worstThreat } from './atRisk';
import { explainHeadline } from './explain';
import { peerChange } from './peers';
import { agreedWording } from './wording';
import { sourceLine } from './ledgerView';
import { formatLakh } from '@/lib/format';
import { plainValue, TERM_LABELS } from '@/lib/plain';

export type AskIntent = 'suggest' | 'explain' | 'risk' | 'next' | 'wording' | 'agreed';
export type Viewer = 'lead' | 'owner';

export interface AskOption {
  label: string;
  value: string;
  cost: string;
}

export interface AskAnswer {
  intent: AskIntent;
  termKey?: TermKey;
  title: string;
  lines: string[];
  options?: AskOption[];
  /** Supplier-safe wording that can be pasted into a draft or a clause. */
  wording?: string;
  /** Every number and fact the answer may use; the model is held to these. */
  facts: string[];
  followUps: string[];
}

const TERM_WORDS: [TermKey, RegExp][] = [
  ['renewal_notice', /\b(notice|renewal|renew|auto-?renew)\b/i],
  ['service_credit', /\b(service credits?|credits?|sla|uptime|availability)\b/i],
  ['payment', /\b(payment|pay|invoice|net ?\d+|days to pay)\b/i],
  ['price', /\b(price|pricing|fees?|rate|revision|increase|cap)\b/i],
  ['liability_cap', /\bliabilit/i],
  ['exit_support', /\b(exit|termination assistance|data export)\b/i],
  ['term', /\b(term length|initial term|years?|duration)\b/i],
];

export function detectTerm(question: string): TermKey | undefined {
  return TERM_WORDS.find(([, re]) => re.test(question))?.[0];
}

export function detectIntent(question: string): AskIntent {
  const q = question.toLowerCase();
  if (/\b(what is agreed|what's agreed|what’s agreed|agreed terms|what did we agree|already agreed)\b/.test(q)) return 'agreed';
  if (/\b(instead|what should i (put|ask|offer|propose)|suggest|alternative|counter|propose|fallback|walk-?away|middle ground|compromise)\b/.test(q)) return 'suggest';
  if (/\b(why|how (is|was|did)|calculat|explain|where does|₹|worth)\b/.test(q)) return 'explain';
  if (/\b(wording|clause text|draft|write|email|reply|say to)\b/.test(q)) return 'wording';
  if (/\b(next|what do i do|what now|should i)\b/.test(q)) return 'next';
  if (/\b(risk|exposure|at stake|summary|status|where are we)\b/.test(q)) return 'risk';
  return 'suggest';
}

function costText(row: LedgerRow, lakh: number | null, termYears = 3): string {
  if (lakh === null) return 'not priced';
  if (lakh <= 0) return 'no expected cost';
  return row.termKey === 'renewal_notice' ? `${formatLakh(lakh / termYears)} a year (${formatLakh(lakh)} at the next renewal)` : `${formatLakh(lakh)} a year`;
}

export function answer(
  question: string,
  ctx: { rows: LedgerRow[]; deal: Deal; termKey?: TermKey; viewer?: Viewer; showFallbacks?: boolean },
): AskAnswer {
  const viewer = ctx.viewer ?? 'lead';
  const showFallbacks = ctx.showFallbacks ?? true;
  const intent = detectIntent(question);
  const flagged = ctx.rows.filter((r) => worstThreat(r, ctx.deal) || r.state === 'needs_confirmation');
  const termKey = detectTerm(question) ?? ctx.termKey ?? (intent === 'suggest' || intent === 'wording' ? flagged[0]?.termKey : undefined);
  const row = termKey ? ctx.rows.find((r) => r.termKey === termKey) : undefined;
  const followUps = [
    'What should I put for renewal notice instead?',
    'What’s at risk on this deal?',
    'Why is price worth so much?',
    'Draft wording I can send for payment terms',
  ];

  if ((intent === 'risk' || !row) && intent !== 'next' && intent !== 'agreed') {
    const x = explainHeadline(ctx.rows, ctx.deal);
    const lines = [
      `${ctx.deal.supplier}: ${formatLakh(x.totalLakh)} a year if signed as is.`,
      ...x.lines.map((l) => `${l.label}: ${l.summary} ${formatLakh(l.shareLakh)} a year.`),
      ...(x.notPriced.length ? [`Not priced: ${x.notPriced.join(', ')}.`] : []),
    ];
    return { intent: 'risk', title: 'What’s at risk', lines, facts: lines, followUps };
  }

  if (intent === 'agreed') {
    const lines = ctx.rows.map((r) => `${r.label}: ${plainValue(r.position, ctx.deal.termYears)}${r.state === 'agreed' ? '' : ' (not settled yet)'} · ${sourceLine(r.source).split(':')[0]}`);
    const head = viewer === 'owner' ? 'Procurement leads the commercials. If the supplier raises any of these with you, loop in Ananya rather than agreeing in your reply.' : 'Every term, with where it was agreed.';
    return { intent, title: `What is agreed with ${ctx.deal.supplier}`, lines: [head, ...lines], facts: [head, ...lines], followUps };
  }

  if (intent === 'next') {
    const lines = flagged.length
      ? flagged.map((r) => {
          const move = recommendedMove(r, ctx.deal);
          return `${r.label}: ${move?.ask ?? `Confirm ${plainValue(r.position).toLowerCase()}.`}`;
        })
      : ['Nothing is open: every term matches what was agreed.'];
    return { intent: 'next', title: 'What to do next', lines, facts: lines, followUps };
  }

  // A specific term from here on.
  const r = row!;
  const threat = worstThreat(r, ctx.deal);
  const share = rowHeadlineShare(r, ctx.deal);
  const agreed = plainValue(r.position, ctx.deal.termYears);
  const label = TERM_LABELS[r.termKey];
  const opts = playbookOptions(r, ctx.deal).filter((o) => showFallbacks || o.kind === 'agreed');
  const move = recommendedMove(r, ctx.deal);
  const peer = threat ? peerChange(ctx.deal, r.position, threat.value) : null;
  const wording = agreedWording(r.termKey, r.position);

  const head = threat
    ? `${label}: agreed ${agreed.toLowerCase()} (${sourceLine(r.source)}). The supplier wants ${plainValue(threat.value, ctx.deal.termYears).toLowerCase()}, which would cost ${costText(r, share === null ? null : r.termKey === 'renewal_notice' ? share * ctx.deal.termYears : share, ctx.deal.termYears)}.`
    : `${label}: agreed ${agreed.toLowerCase()} (${sourceLine(r.source)}). Nothing is asking to move it.`;

  if (intent === 'explain') {
    const x = explainHeadline(ctx.rows, ctx.deal).lines.find((l) => l.rowId === r.id);
    const lines = x ? [head, ...x.proof] : [head, 'This term has no ₹ figure: there is no live change to price.'];
    return { intent, termKey: r.termKey, title: `Why ${label.toLowerCase()} is priced this way`, lines, facts: lines, followUps };
  }

  if (intent === 'wording') {
    const lines = [head, 'Wording you can paste into the clause or a reply. It is supplier-safe: no ₹, no internal names, no limits.'];
    return { intent, termKey: r.termKey, title: `Wording for ${label.toLowerCase()}`, lines, wording, facts: [...lines, wording], followUps };
  }

  const lines = [head];
  if (move) {
    lines.push(`Put instead: ${move.ask}`);
    if (showFallbacks && move.fallback) lines.push(`If something has to give: ${move.fallback}`);
    if (move.leverage) lines.push(`Your leverage: ${move.leverage}`);
  } else {
    lines.push(`Keep ${agreed.toLowerCase()}: it is what was agreed.`);
  }
  if (peer?.landed && viewer === 'lead') {
    lines.push(`Other companies (sample data): ${peer.landed.map((l) => `${Math.round(l.share * 100)}% ${l.label}`).join(', ')}.`);
  }
  const options = opts.map((o) => ({ label: o.label, value: `${o.plain}${o.condition ? `, ${o.condition}` : ''}`, cost: o.costText }));
  return {
    intent: 'suggest',
    termKey: r.termKey,
    title: `What to put for ${label.toLowerCase()}`,
    lines,
    options,
    wording,
    facts: [...lines, ...options.map((o) => `${o.label}: ${o.value} · ${o.cost}`), wording],
    followUps,
  };
}

/** Every ₹ amount and percentage in a text, for checking a model's reply against the facts. */
export function numbersIn(text: string): string[] {
  return [...text.matchAll(/₹\s?[\d,.]+(?:\s?(?:lakh|crore))?|\d+(?:\.\d+)?\s?%/gi)].map((m) => m[0].replace(/\s+/g, ' ').trim());
}
