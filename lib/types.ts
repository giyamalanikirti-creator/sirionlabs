// Data model — BUILD_SPEC §6.

export type TermKey =
  | 'term'
  | 'price'
  | 'payment'
  | 'service_credit'
  | 'liability_cap'
  | 'renewal_notice'
  | 'exit_support';

export type TermValue =
  | { kind: 'term'; years: number }
  | { kind: 'price'; wording: 'fixed' }
  | { kind: 'price'; wording: 'open_yearly'; fromYear: number }
  | { kind: 'price'; wording: 'capped'; capPct: number; fromYear: number }
  | { kind: 'payment'; days: number }
  | { kind: 'service_credit'; pct: number; uptimeTarget: number }
  | { kind: 'liability_cap'; months: number }
  | { kind: 'renewal_notice'; days: number }
  | { kind: 'exit_support'; days: number; free: boolean };

export interface Person {
  id: string;
  name: string;
  email: string;
  org: 'meridian' | 'clouddesk' | 'other';
  role: string;
}

export interface Attachment {
  fileName: string;
  sizeKb: number;
  versionId?: string;
  fingerprint?: string;
  dealIdTag?: string | null;
}

/** The ONLY thing the matcher sees — no body, by type. */
export interface EmailHeader {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  sentAt: string;
  attachments: Attachment[];
}

export interface EmailMessage extends EmailHeader {
  body: string;
  mailboxes: string[];
}

export interface Thread {
  id: string;
  subject: string;
  dealId?: string;
  participants?: string[];
  mailboxes?: string[];
}

export interface Clause {
  no: string;
  title: string;
  text: string;
  termKey?: TermKey;
}

export interface DocVersion {
  id: string;
  fileName: string;
  author: 'buyer' | 'supplier';
  sentAt: string;
  dealIdTag: string | null;
  declaredTrackedChanges: string[];
  clauses: Clause[];
}

export type RowState =
  | 'agreed'
  | 'open'
  | 'changed'
  | 'needs_confirmation'
  | 'reopened'
  | 'missing_at_signing';

export interface SourceRef {
  kind: 'email' | 'version' | 'call_note' | 'manual';
  messageId?: string;
  versionId?: string;
  clauseNo?: string;
  quote: string;
  at: string;
  byPersonId: string;
}

export type ThreatKind =
  | 'supplier_ask'
  | 'version_change'
  | 'side_offer'
  | 'new_ask'
  | 'sent_concession'
  | 'signing_copy';

export interface Threat {
  id: string;
  kind: ThreatKind;
  value: TermValue;
  source: SourceRef;
  active: boolean;
  hidden?: boolean;
}

export interface HistoryEntry {
  at: string;
  text: string;
  source: SourceRef;
}

/** An agreement that holds only if another term holds (review fix B2): "60 days if you sign for 3 years". */
export interface TermCondition {
  /** "if Meridian signs for 3 years" */
  text: string;
  dependsOn: { termKey: TermKey; required: string };
  source: SourceRef;
}

export type ConditionState = 'met' | 'not_met' | 'unknown';

export interface LedgerRow {
  id: string;
  dealId: string;
  termKey: TermKey;
  label: string;
  /** Agreed value, or our latest ask if the row is open. */
  position: TermValue;
  state: RowState;
  source: SourceRef;
  reason?: string;
  approvedBy?: { personId: string; source: SourceRef; condition?: string };
  history: HistoryEntry[];
  threats: Threat[];
  supplierNote: string;
  owner: 'commercial' | 'legal';
  pendingConfirmation?: {
    quote: string;
    messageId: string;
    alternatives: { value: TermValue; source: SourceRef }[];
  };
  signing?: 'match' | 'gap' | 'inserted' | 'waived';
  waiveReason?: string;
  /** Set when the lead offered a playbook fallback or walk-away at signing. */
  playbookPosition?: 'fallback' | 'walk-away';
  /** Set when the supplier's acceptance was conditional on another term. */
  condition?: TermCondition;
  /** The reader's confidence for the latest value it wrote (0–1). Absent when a person or a clause set it. */
  confidence?: number;
}

export interface PriceTag {
  /** Expected ₹ a year averaged over the term, in lakh. */
  costLakhPerYr: number | null;
  overTermLakh?: number;
  /** e.g. one more year's fees for a renewal that slips through. */
  exposureLakh?: number;
  confidence: 'high' | 'medium' | 'low' | 'formula' | 'none';
  n?: number;
  basis: 'own_invoices' | 'own_renewals' | 'own_service_events' | 'formula' | 'none';
  /** Plain sentences built from the numbers. */
  proof: string[];
  formula: string;
  /** Per-year costs over the term, for the hover card. */
  byYear?: number[];
}

export interface Deal {
  id: string;
  supplier: string;
  supplierDomain: string;
  supplierType: 'software' | 'staffing' | 'logistics' | 'facilities' | 'consultants' | 'marketing';
  annualFeeInr: number;
  seats?: number;
  termYears: number;
  termStart: string;
  ownerId: string;
  businessOwnerId?: string;
  stage: 'rounds' | 'signing' | 'signed';
  interactive: boolean;
  /** Mirrors the hidden custom XML part that a tagged draft carries. */
  dealIdTag?: string | null;
  display?: {
    round: number;
    threads: number;
    rows: { agreed: number; open: number; needs: number; reopened: number };
    atRiskLakh: number;
  };
}

export interface Obligation {
  id: string;
  contractId: string;
  title: string;
  detail?: string;
  due?: string;
  reminder?: string;
  recurring?: string;
  owner: string;
  clauseNo: string;
  ledgerRowId: string;
}

export interface InvoiceRule {
  id: string;
  contractId: string;
  kind: 'fixed_monthly' | 'service_credit';
  amountInr?: number;
  pct?: number;
  uptimeTarget?: number;
  validTo: string;
  clauseNo: string;
  ledgerRowId: string;
}

export interface Invoice {
  id: string;
  contractId: string;
  month: string;
  amountInr: number;
  uptime?: number;
}

/* ---- Supporting seed shapes ---- */

export interface PastContract {
  id: string;
  name: string;
  supplier: string;
  type: Deal['supplierType'];
  annualFeeInr: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expiring' | 'expired';
  owner: string;
  priceWording?: 'open_yearly' | 'capped_5' | 'fixed';
  noticeDays?: number;
  autoRenew?: boolean;
}

export interface PastInvoice {
  contractId: string;
  month: string;
  amountInr: number;
  seats: number;
  unitPriceInr: number;
}

export interface PastRenewal {
  id: string;
  contractId: string;
  renewedAt: string;
  noticeDays: number;
  reviewed: boolean;
  unusedShare?: number;
}

export interface ServiceEvent {
  contractId: string;
  month: string;
  uptimePct: number;
}

/* ---- AI route shapes ---- */

export type ReaderAction =
  | 'proposes'
  | 'accepts'
  | 'accepts_if'
  | 'rejects'
  | 'unclear'
  | 'retracts';

export interface ReaderUpdate {
  messageId: string;
  termKey: TermKey;
  action: ReaderAction;
  byPersonId: string;
  value?: TermValue;
  alternatives?: TermValue[];
  condition?: string;
  quote: string;
  confidence: number;
  reason: string;
}

export interface ReaderStatement {
  kind: 'claims_all_changes_accepted' | 'claims_final' | 'other';
  quote: string;
}

export interface ReaderResult {
  updates: ReaderUpdate[];
  mentions: string[];
  statements: ReaderStatement[];
  diff?: ClauseChange[];
  source: AiSource;
}

export type AiSource = 'live' | 'cached' | 'rules';

export interface ClauseChange {
  clauseNo: string;
  termKey?: TermKey;
  kind: 'modified' | 'added' | 'removed';
  before: string;
  after: string;
  hidden: boolean;
}

export interface SendCheckMatch {
  rowId: string;
  termKey: TermKey;
  value: TermValue;
  quote: string;
  costLakhPerYr: number | null;
  overTermLakh?: number;
  agreedPlain: string;
  sourcePlain: string;
  approverName?: string;
}

export interface SendCheckResult {
  decision: 'allow' | 'warn' | 'could_not_check';
  checkedBy: 'none' | 'ai' | 'rules';
  match?: SendCheckMatch;
  dialog?: {
    title: string;
    markdown: string;
    plain: string;
    takeActionLabel: string;
  };
  source: AiSource;
}

export interface SigningGap {
  rowId: string;
  termKey: TermKey;
  label: string;
  agreedPlain: string;
  docPlain: string;
  clauseNo: string;
  clauseText: string;
  costLakhPerYr: number | null;
  priceTag: PriceTag;
  note?: string;
  sourceChip: string;
  source: SourceRef;
}

export interface SigningResult {
  gaps: SigningGap[];
  matches: {
    rowId: string;
    termKey: TermKey;
    label: string;
    agreedPlain: string;
    clauseNo: string;
    note?: string;
  }[];
  needsConfirmation: { rowId: string; label: string }[];
  totalAtRiskLakh: number;
  dealIdTag: string | null;
}
