/**
 * AskSirion: Sirion's on-demand assistant. It answers a fixed set of question
 * types from the contract repository (today) and, through Deal Ledger, from
 * the ledger (new). Every figure comes from the engines; a model may only
 * classify the question.
 */
import type { ContractRecord } from '@/lib/engines/handover';
import type { Invoice, LedgerRow, SourceRef, TermKey } from '@/lib/types';

export type Surface = 'sirion' | 'ananya' | 'vikram' | 'word' | 'ask';
export type ScopeKind = 'all' | 'deal' | 'thread' | 'doc';
export type Persona = 'ananya' | 'vikram';

export interface AskScope {
  kind: ScopeKind;
  surface: Surface;
  persona: Persona;
  dealId?: string;
  threadId?: string;
  messageId?: string;
  versionId?: string;
  /** For the scope chip: "CloudDesk MSA", "This email", "v6", "All contracts". */
  label: string;
}

export type IntentId =
  | 'repo_search'
  | 'contract_summary'
  | 'clause_lookup'
  | 'agreed_term'
  | 'round_changes'
  | 'open_terms'
  | 'other_threads'
  | 'can_i_agree'
  | 'signing_match'
  | 'explain_figure'
  | 'portfolio_at_risk'
  | 'invoice_mismatch'
  | 'draft_reply'
  | 'suggest_term';

export interface Slots {
  term?: TermKey;
  /** A number the user typed: "99.5", "90 days", "₹12,000", "₹3.9 lakh". */
  value?: string;
  /** "round 4" → 4. */
  round?: number;
  /** Words the question is about, for clause lookup: "termination", "liability". */
  topic?: string;
  /** A supplier named in the question. */
  dealId?: string;
}

export type Routed = { intent: IntentId; slots: Slots; confidence: number } | { fallback: true; slots: Slots };

export interface SourceChipSpec {
  /** filter: Sirion's own "Status: Negotiating" chips. ledger: drawn from Deal Ledger. count: a list. */
  kind: 'filter' | 'ledger' | 'count';
  label: string;
  href?: string;
}

export interface AskAction {
  label: string;
  /** Go here. */
  href?: string;
  /** Copy this text (an internal note). */
  copy?: string;
  /** Show this toast instead of navigating. */
  toast?: string;
  primary?: boolean;
  /** Lands on a Deal Ledger view. */
  ledger?: boolean;
}

export interface AskFigure {
  lakh: number;
  /** "₹3.9 lakh a year (expected)" */
  text: string;
  /** Over-the-term or once-per-renewal line, shown in grey. */
  sub?: string;
  /** "Based on 9 of your contracts" */
  basis?: string;
  confidence?: 'high' | 'medium' | 'low' | 'formula';
}

export interface AskQuote {
  source: SourceRef;
  /** "Rohan Iyer · 14 Nov, 10:05" */
  label: string;
}

export interface AskListItem {
  label: string;
  detail?: string;
  /** Formatted ₹ or count, shown on the right. */
  value?: string;
  href?: string;
}

export interface AskChartRow {
  label: string;
  lakh: number;
  valueText: string;
  highlight?: boolean;
  href?: string;
}

export interface AskAnswer {
  intent: IntentId | 'fallback' | 'not_found';
  source: 'repository' | 'deal-ledger' | 'none';
  /** True when any part of the answer came from the ledger: shows the Deal Ledger badge and "Open in Deal Ledger". */
  usesLedger: boolean;
  sources: SourceChipSpec[];
  /** One to three sentences, built from engine output. */
  text: string[];
  figure?: AskFigure;
  quotes: AskQuote[];
  /** When sources disagree: both, with dates, and which wins. */
  conflict?: string[];
  list?: AskListItem[];
  chart?: { rows: AskChartRow[]; total: string; footnote?: string };
  /** Supplier-safe text that can be pasted into a reply. */
  wording?: string;
  actions: AskAction[];
  followUps: string[];
  /** The term this answer was about, inherited by follow-ups. */
  term?: TermKey;
  /** Every figure in the answer, as text: a model rephrase may use only these. */
  facts: string[];
}

/** What answer.ts reads from the demo store. Pure input: same state, same answer. */
export interface AskState {
  clock: string;
  ledger: LedgerRow[];
  linkedThreadIds: string[];
  mailboxes: Record<string, boolean>;
  ownersSeeFallbacks: boolean;
  syncedVersionIds: string[];
  signing: { inserted: TermKey[]; waived: { termKey: TermKey; reason: string }[]; checkedAt?: string; sentBackAt?: string };
  signedAt?: string;
  contract?: ContractRecord;
  invoices: Invoice[];
  invoiceFastForward: boolean;
}

export interface AskTurn {
  id: number;
  question: string;
  scope: AskScope;
  intent?: IntentId;
  answer?: AskAnswer;
  pending?: boolean;
  /** How the question was classified. */
  via?: 'chip' | 'rules' | 'live';
}
