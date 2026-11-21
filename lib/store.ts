'use client';

/** Demo state — BUILD_SPEC §11. One store, persisted, with a Reset action. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AiSource,
  DocVersion,
  EmailMessage,
  Invoice,
  LedgerRow,
  ReaderResult,
  TermKey,
  TermValue,
} from '@/lib/types';
import {
  FIXTURES,
  STEP_CLOCK,
  type Step,
  applyReaderResult,
  initialLedger,
  ledgerAtStep,
} from '@/lib/demo/steps';
import {
  applySentConcession,
  closeAllThreats,
  confirmRow as confirmRowEngine,
  applyPlaybookPositionForRow,
  noteOnRow,
  editRow as editRowEngine,
  addCallTerm as addCallTermEngine,
  acceptTheirs as acceptTheirsEngine,
  flagForConfirmation as flagForConfirmationEngine,
  insertWordingForRow,
  markSigningGaps,
  waiveGapForRow,
} from '@/lib/engines/ledger';
import { signingCheck, supplierReturn } from '@/lib/engines/signing';
import { handover, type ContractRecord, demoInvoices, FAST_FORWARD_INVOICE } from '@/lib/engines/handover';
import { extractValue } from '@/lib/engines/diff';
import { CLARIFY_REPLY, CLARIFY_REPLY_QUOTE, cloudDeskDeal, messageById, personById, personName, versionById } from '@/lib/data';
import { APPROVAL_KIND_LABEL, approvalRoute, type ApprovalRequest } from '@/lib/engines/approvals';
import { worstThreat } from '@/lib/engines/atRisk';
import { priceChange } from '@/lib/engines/pricing';
import { plainValue } from '@/lib/plain';
import { formatDateTime } from '@/lib/format';

export type Role = 'lead' | 'it_head' | 'cfo' | 'legal';

export interface SendOutcome {
  at: string;
  personId: string;
  termKey?: TermKey;
  decision: 'allow' | 'warn' | 'could_not_check';
  choice?: 'loop_in' | 'dont_send' | 'send_anyway' | 'edit' | 'fix_attachment';
  /** Which of the send check's cases fired. */
  guardCase?: 'reopen' | 'give_away' | 'contradicts_pending' | 'outdated_attachment';
  reason?: string;
  actionable?: boolean;
}

/** Privacy and admin settings (the /settings page). */
export interface AdminSettings {
  mailboxes: Record<string, boolean>;
  retentionYears: number;
  /** Business owners (e.g. Vikram) see the cost workings behind a ₹ figure. */
  ownersSeeWorkings: boolean;
  /** Business owners see playbook fallbacks and walk-away positions. */
  ownersSeeFallbacks: boolean;
  /** Demo only: simulate the send-time check service being down (review fix C5). */
  sendCheckDown?: boolean;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  mailboxes: { ananya: true, vikram: true, deals: true, karan: false, meera: false },
  retentionYears: 7,
  ownersSeeWorkings: false,
  ownersSeeFallbacks: true,
};

/** Org setup for Microsoft 365 (the /setup checklist). Starts complete in the demo. */
export interface SetupState {
  enabled: boolean;
  consented: boolean;
  group: boolean;
  deployed: boolean;
  /** Auto-track deals above ₹25 lakh a year instead of asking the owner. */
  autoTrackAbove25: boolean;
}

export const SETUP_COMPLETE: SetupState = { enabled: true, consented: true, group: true, deployed: true, autoTrackAbove25: false };

export interface ReviewRequest {
  kind: 'review' | 'approval';
  personId: string;
  versionId: string;
  at: string;
}

export interface Notice {
  at: string;
  text: string;
  forPersonId: string;
  read?: boolean;
  rowId?: string;
  /** Short heading, e.g. "Vikram's reply needs you". */
  title?: string;
  /** A held draft the notice is about (Loop in Ananya). */
  draft?: { fromPersonId: string; body: string; subject: string; to: string[] };
  href?: string;
}

interface DemoState {
  clock: string;
  sirionRole: Role;
  ledger: LedgerRow[];
  readMessageIds: string[];
  readerRuns: Record<string, AiSource>;
  linkedThreadIds: string[];
  dismissedThreadIds: string[];
  /** Threads linked automatically (same supplier domain), which can be undone. */
  autoLinkedThreadIds: string[];
  ledgerBeforeLink?: LedgerRow[];
  /** Supplier files filed in Sirion as the next version (Sirion's plugin does this today). */
  syncedVersionIds: string[];
  reviewRequests: ReviewRequest[];
  /** Rounds the lead has answered with "Respond to round". */
  respondedMessageIds: string[];
  clarifySentAt?: string;
  /** New deals started from an email (SwiftShip). */
  startedDealIds: string[];
  approvals: ApprovalRequest[];
  settings: AdminSettings;
  setup: SetupState;
  /** Ananya has seen "What Deal Ledger reads in your mailbox". */
  firstRunSeen: boolean;
  /** Deals whose email is tracked (the owner said Track, or Sirion was set to). */
  trackedDealIds: string[];
  /** Suppliers the owner said never to offer tracking for. */
  neverTrackDomains: string[];
  /** Walkthrough buttons pressed (data-tour ids), for the script bar. */
  tourClicks: string[];
  /** Vikram has seen that his thread was linked. */
  linkNoticeSeen: boolean;
  /** Business owners added to a deal's connected mailboxes, by deal. */
  dealPeople: Record<string, string[]>;
  disputeEmail?: EmailMessage;
  sentVia?: 'email' | 'portal';
  sentMessages: EmailMessage[];
  drafts: Record<string, string>;
  sendOutcomes: SendOutcome[];
  signing: {
    versionId: 'v6';
    inserted: TermKey[];
    /** Inserted while Track Changes was off: the text changed with no markup. */
    untracked?: TermKey[];
    waived: { termKey: TermKey; reason: string }[];
    sentBackAt?: string;
    checkedAt?: string;
    returnedCopy?: DocVersion;
    submittedCopy?: DocVersion;
  };
  signedAt?: string;
  contract?: ContractRecord;
  invoices: Invoice[];
  invoiceFastForward: boolean;
  disputeRaised: boolean;
  invoiceResolved: boolean;
  notices: Notice[];
  completedSteps: Step[];
  events: { at: string; text: string }[];
  lastToast?: { at: number; text: string };

  // actions
  setClock: (iso: string) => void;
  /** Word's Track Changes switch (signing copy). */
  trackChanges: boolean;
  setTrackChanges: (on: boolean) => void;
  /** The quick path is running (review fix B3): three actions on the §9.3 hero. */
  quickPath: boolean;
  setQuickPath: (on: boolean) => void;
  /** What a business owner's choice at Send left on a term (review fix C5). */
  termHolds: Partial<Record<TermKey, 'waiting_lead' | 'conceded_pending'>>;
  setTermHold: (termKey: TermKey, hold?: 'waiting_lead' | 'conceded_pending') => void;
  setRole: (role: Role) => void;
  startStage: (step: 1 | 2 | 3 | 4 | 5, restart?: boolean) => void;
  previewStage: (step: 1 | 2 | 3 | 4 | 5) => void;
  advanceTo: (step: Step) => void;
  markRead: (messageId: string) => void;
  applyReader: (result: ReaderResult, opts: { messageId?: string; versionId?: string }) => void;
  linkThread: (threadId: string) => void;
  autoLinkThread: (threadId: string) => void;
  undoLink: (threadId: string) => void;
  syncVersion: (versionId: string) => void;
  unsyncVersion: (versionId: string) => void;
  requestReview: (kind: 'review' | 'approval', versionId: string) => void;
  respondToRound: (messageId: string) => void;
  clarifyCredit: () => void;
  applyPlaybookPosition: (rowId: string, value: TermValue, label: 'fallback' | 'walk-away') => void;
  signAndSave: () => void;
  startDeal: (dealId: string) => void;
  requestApproval: (req: Omit<ApprovalRequest, 'id' | 'at' | 'status' | 'approverId' | 'rule'>) => ApprovalRequest;
  decideApproval: (id: string, approve: boolean) => void;
  editRow: (rowId: string, value: TermValue, reason: string) => void;
  addCallTerm: (termKey: TermKey, value: TermValue, withPersonId: string, note: string) => void;
  requestAcceptTheirs: (rowId: string) => void;
  updateSettings: (patch: Partial<AdminSettings>) => void;
  updateSetup: (patch: Partial<SetupState>) => void;
  resetSetup: () => void;
  seeFirstRun: () => void;
  trackDeal: (dealId: string, people?: string[]) => void;
  stopTracking: (dealId: string) => void;
  neverTrack: (domain: string) => void;
  addPersonToDeal: (dealId: string, personId: string) => void;
  removePersonFromDeal: (dealId: string, personId: string) => void;
  seeLinkNotice: () => void;
  markTour: (id: string) => void;
  sendDispute: (message: EmailMessage) => void;
  flagRow: (rowId: string, docValue: TermValue | null, where: string) => void;
  dismissThread: (threadId: string) => void;
  confirmRow: (rowId: string, value: TermValue, note?: string) => void;
  setDraft: (key: string, body: string) => void;
  recordSend: (outcome: SendOutcome) => void;
  rateLastWarning: (personId: string, actionable: boolean) => void;
  sendConcession: (termKey: TermKey, value: TermValue, quote: string, personId: string, reason?: string) => void;
  loopInLead: (draft: { fromPersonId: string; body: string; subject: string; to: string[] }, rowId?: string, title?: string) => void;
  sendMessage: (message: EmailMessage) => void;
  runSigningCheck: () => void;
  insertWording: (rowId: string) => void;
  insertAll: () => void;
  waiveGap: (rowId: string, reason: string) => void;
  sendBack: (via?: 'email' | 'portal') => void;
  sign: () => void;
  saveToSirion: () => void;
  fastForwardInvoice: () => void;
  raiseDispute: () => void;
  resolveInvoice: () => void;
  addNotice: (notice: Notice) => void;
  readNotices: () => void;
  toast: (text: string) => void;
  logEvent: (text: string) => void;
  reset: () => void;
}

/** Add a term to the inserted list, and note whether it went in with Track Changes off. */
function markInserted(s: Pick<DemoState, 'signing' | 'trackChanges'>, termKey: TermKey): DemoState['signing'] {
  const untracked = new Set(s.signing.untracked ?? []);
  if (s.trackChanges) untracked.delete(termKey);
  else untracked.add(termKey);
  return { ...s.signing, inserted: [...new Set([...s.signing.inserted, termKey])], untracked: [...untracked] };
}

const BASE = {
  clock: STEP_CLOCK[0],
  sirionRole: 'lead' as Role,
  ledger: initialLedger(),
  readMessageIds: [] as string[],
  readerRuns: {} as Record<string, AiSource>,
  linkedThreadIds: [] as string[],
  dismissedThreadIds: [] as string[],
  autoLinkedThreadIds: [] as string[],
  ledgerBeforeLink: undefined,
  syncedVersionIds: [] as string[],
  reviewRequests: [] as ReviewRequest[],
  respondedMessageIds: [] as string[],
  clarifySentAt: undefined,
  startedDealIds: [] as string[],
  approvals: [] as ApprovalRequest[],
  settings: DEFAULT_SETTINGS,
  setup: SETUP_COMPLETE,
  firstRunSeen: true,
  trackedDealIds: ['D-CLOUDDESK'] as string[],
  neverTrackDomains: [] as string[],
  linkNoticeSeen: false,
  tourClicks: [] as string[],
  dealPeople: { 'D-CLOUDDESK': ['vikram'] } as Record<string, string[]>,
  disputeEmail: undefined,
  sentVia: undefined,
  sentMessages: [] as EmailMessage[],
  drafts: {} as Record<string, string>,
  sendOutcomes: [] as SendOutcome[],
  signing: { versionId: 'v6' as const, inserted: [] as TermKey[], waived: [] as { termKey: TermKey; reason: string }[] },
  signedAt: undefined,
  contract: undefined,
  invoices: [] as Invoice[],
  invoiceFastForward: false,
  trackChanges: true,
  quickPath: false,
  termHolds: {} as Partial<Record<TermKey, 'waiting_lead' | 'conceded_pending'>>,
  disputeRaised: false,
  invoiceResolved: false,
  notices: [] as Notice[],
  completedSteps: [0] as Step[],
  events: [{ at: STEP_CLOCK[0], text: 'Demo started. Ledger loaded from rounds 1–3.' }],
  lastToast: undefined,
};

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => ({
      ...BASE,

      setClock: (iso) => set({ clock: iso }),
      setQuickPath: (quickPath) => set({ quickPath }),
      setTermHold: (termKey, hold) =>
        set((s) => {
          const next = { ...s.termHolds };
          if (hold) next[termKey] = hold;
          else delete next[termKey];
          return { termHolds: next };
        }),
      setTrackChanges: (on) =>
        set((s) => ({
          trackChanges: on,
          events: [...s.events, { at: s.clock, text: `Track Changes turned ${on ? 'on' : 'off'} in Word.` }],
        })),
      setRole: (sirionRole) => set({ sirionRole }),

      logEvent: (text) =>
        set((s) => ({ events: [...s.events, { at: s.clock, text }] })),

      toast: (text) => set({ lastToast: { at: Date.now(), text } }),

      markRead: (messageId) =>
        set((s) =>
          s.readMessageIds.includes(messageId)
            ? s
            : { readMessageIds: [...s.readMessageIds, messageId] },
        ),

      startStage: (step, restart = false) => {
        if (step === 5) return;
        const state = get();
        const previous = (step - 1) as Step;
        const alreadyStarted = state.clock >= STEP_CLOCK[step];
        if ((restart && alreadyStarted) || state.clock < STEP_CLOCK[previous]) {
          state.advanceTo(previous);
        }
      },

      previewStage: (step) => {
        if (step === 5) {
          get().advanceTo(6);
          return;
        }
        if (step === 4) {
          get().advanceTo(3);
          get().setClock(STEP_CLOCK[4]);
          get().runSigningCheck();
          return;
        }
        get().advanceTo(step);
      },

      /** Replay every earlier step from cached fixtures, with no AI calls. */
      advanceTo: (step) => {
        const rows = ledgerAtStep(step);
        const completed: Step[] = [];
        for (let i = 0; i <= step; i++) completed.push(i as Step);
        const readIds = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
        if (step >= 1) readIds.push('M8');
        if (step >= 2) readIds.push('M9', 'M10', 'M11', 'M12', 'T2');
        if (step >= 3) readIds.push('M13');
        if (step >= 4) readIds.push('M14');

        set({
          ...BASE,
          sirionRole: get().sirionRole,
          settings: get().settings,
          setup: get().setup,
          firstRunSeen: get().firstRunSeen,
          clock: STEP_CLOCK[step],
          ledger: rows,
          completedSteps: completed,
          readMessageIds: readIds,
          linkedThreadIds: step >= 2 ? ['T2'] : [],
          autoLinkedThreadIds: step >= 2 ? ['T2'] : [],
          syncedVersionIds: step >= 1 ? ['v4'] : [],
          readerRuns: Object.fromEntries(readIds.map((id) => [id, 'cached' as AiSource])),
          events: [
            ...get().events,
            { at: STEP_CLOCK[step], text: `Jumped to step ${step} using cached results.` },
          ],
        });

        if (step >= 5) {
          get().runSigningCheck();
          get().insertAll();
          get().sendBack();
          get().sign();
        }
        if (step >= 6) get().fastForwardInvoice();
      },

      applyReader: (result, opts) => {
        const { rows, events } = applyReaderResult(get().ledger, result.updates, opts.versionId);
        set((s) => ({
          ledger: rows,
          completedSteps: opts.messageId === 'M8' && !s.completedSteps.includes(1) ? [...s.completedSteps, 1] : s.completedSteps,
          readerRuns: opts.messageId
            ? { ...s.readerRuns, [opts.messageId]: result.source }
            : s.readerRuns,
          events: [...s.events, ...events.map((text) => ({ at: s.clock, text }))],
        }));
      },

      linkThread: (threadId) => {
        if (get().linkedThreadIds.includes(threadId)) return;
        set((s) => ({
          linkedThreadIds: [...s.linkedThreadIds, threadId],
          events: [
            ...s.events,
            { at: s.clock, text: `Thread ${threadId} linked to CloudDesk. Bodies read for the first time.` },
          ],
        }));
      },

      autoLinkThread: (threadId) => {
        const state = get();
        if (state.linkedThreadIds.includes(threadId) || state.dismissedThreadIds.includes(threadId)) return;
        set((s) => ({
          ledgerBeforeLink: s.ledger,
          linkedThreadIds: [...s.linkedThreadIds, threadId],
          autoLinkedThreadIds: [...s.autoLinkedThreadIds, threadId],
          events: [
            ...s.events,
            { at: s.clock, text: `Thread ${threadId} linked to CloudDesk automatically: same supplier domain, and Rohan named its sender.` },
          ],
        }));
      },

      undoLink: (threadId) => {
        const state = get();
        const { [threadId]: _dropped, ...runs } = state.readerRuns;
        void _dropped;
        set((s) => ({
          ledger: s.ledgerBeforeLink ?? s.ledger,
          ledgerBeforeLink: undefined,
          readerRuns: runs,
          linkedThreadIds: s.linkedThreadIds.filter((id) => id !== threadId),
          autoLinkedThreadIds: s.autoLinkedThreadIds.filter((id) => id !== threadId),
          dismissedThreadIds: [...s.dismissedThreadIds, threadId],
          completedSteps: threadId === 'T2' && !s.completedSteps.includes(2) ? [...s.completedSteps, 2] : s.completedSteps,
          events: [...s.events, { at: s.clock, text: `Link undone: thread ${threadId} is not this deal, and what was read from it was removed.` }],
        }));
      },

      syncVersion: (versionId) => {
        if (get().syncedVersionIds.includes(versionId)) return;
        set((s) => ({
          syncedVersionIds: [...s.syncedVersionIds, versionId],
          events: [...s.events, { at: s.clock, text: `${versionId} filed in Sirion as the next version of the CloudDesk contract.` }],
        }));
      },

      unsyncVersion: (versionId) =>
        set((s) => ({
          syncedVersionIds: s.syncedVersionIds.filter((id) => id !== versionId),
          events: [...s.events, { at: s.clock, text: `${versionId} removed from the contract's versions.` }],
        })),

      requestReview: (kind, versionId) => {
        const personId = kind === 'review' ? 'arjun' : 'neha';
        set((s) => ({
          reviewRequests: [...s.reviewRequests, { kind, personId, versionId, at: s.clock }],
          events: [...s.events, { at: s.clock, text: `${versionId} sent for ${kind}.` }],
        }));
      },

      respondToRound: (messageId) => {
        set((s) => ({
          respondedMessageIds: s.respondedMessageIds.includes(messageId) ? s.respondedMessageIds : [...s.respondedMessageIds, messageId],
          events: [...s.events, { at: s.clock, text: 'Round 4 answered: reply drafted and v5 prepared with clause 14.2 restored as a tracked change.' }],
        }));
      },

      clarifyCredit: () => {
        const state = get();
        if (state.clarifySentAt) return;
        const rows = confirmRowEngine(state.ledger, 'R-credit', { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 }, {
          at: CLARIFY_REPLY.sentAt,
          byPersonId: 'rohan',
          source: {
            kind: 'email',
            messageId: CLARIFY_REPLY.id,
            quote: CLARIFY_REPLY_QUOTE,
            at: CLARIFY_REPLY.sentAt,
            byPersonId: 'rohan',
          },
        });
        set((s) => ({
          clarifySentAt: s.clock,
          ledger: rows,
          sentMessages: [...s.sentMessages, CLARIFY_REPLY],
          completedSteps: s.completedSteps.includes(2) ? s.completedSteps : [...s.completedSteps, 2],
          events: [
            ...s.events,
            { at: CLARIFY_REPLY.sentAt, text: 'Rohan replied in the supplier thread: 10% service credit. Written to the ledger with his quote.' },
          ],
        }));
      },

      applyPlaybookPosition: (rowId, value, label) => {
        const rows = applyPlaybookPositionForRow(get().ledger, rowId, value, label, get().clock);
        const row = rows.find((r) => r.id === rowId);
        if (!row) return;
        set((s) => ({
          ledger: rows,
          signing: markInserted(s, row.termKey),
          events: [...s.events, { at: s.clock, text: `Proposed in Word · ${row.label}: playbook ${label} ${s.trackChanges ? 'as a tracked change' : 'with Track Changes off (no markup)'}.` }],
        }));
        if (label === 'walk-away') {
          const agreedRow = ledgerAtStep(4).find((r) => r.id === rowId);
          const tag = agreedRow ? priceChange(cloudDeskDeal, agreedRow.position, value) : null;
          get().requestApproval({
            kind: 'walk_away',
            rowId,
            termKey: row.termKey,
            label: row.label,
            change: `walk-away offered: ${plainValue(value)}`,
            costLakhPerYr: tag?.costLakhPerYr == null ? null : row.termKey === 'renewal_notice' ? tag.costLakhPerYr / cloudDeskDeal.termYears : tag.costLakhPerYr,
            requestedById: 'ananya',
          });
        }
      },

      requestApproval: (req) => {
        const row = get().ledger.find((r) => r.id === req.rowId);
        const route = approvalRoute(row ?? { owner: 'commercial', termKey: req.termKey }, req.costLakhPerYr);
        const self = route.approverId === req.requestedById;
        const request: ApprovalRequest = {
          ...req,
          id: `AP-${get().approvals.length + 1}`,
          at: get().clock,
          approverId: route.approverId,
          rule: route.rule,
          status: self ? 'approved' : 'pending',
          decidedAt: self ? get().clock : undefined,
        };
        set((s) => ({
          approvals: [...s.approvals, request],
          ledger: noteOnRow(
            s.ledger,
            req.termKey,
            s.clock,
            self
              ? `${APPROVAL_KIND_LABEL[req.kind]}: within ${personName(req.requestedById)}'s limit, approved and logged.`
              : `${APPROVAL_KIND_LABEL[req.kind]}: approval requested from ${personName(route.approverId)} (${route.rule}).`,
            req.requestedById,
          ),
          events: [...s.events, { at: s.clock, text: `Approval ${self ? 'logged' : 'requested'}: ${req.label}, ${req.change} → ${personName(route.approverId)}.` }],
        }));
        if (self && req.kind === 'accept_theirs' && req.value) {
          set((s) => ({ ledger: acceptTheirsEngine(s.ledger, req.rowId, req.value as TermValue, { at: s.clock, byPersonId: req.requestedById }) }));
        }
        return request;
      },

      decideApproval: (id, approve) => {
        const req = get().approvals.find((a) => a.id === id);
        if (!req || req.status !== 'pending') return;
        set((s) => {
          let ledger = noteOnRow(
            s.ledger,
            req.termKey,
            s.clock,
            `${personName(req.approverId)} ${approve ? 'approved' : 'rejected'}: ${APPROVAL_KIND_LABEL[req.kind].toLowerCase()} (${req.change}).`,
            req.approverId,
          );
          if (approve && req.kind === 'accept_theirs' && req.value) {
            ledger = acceptTheirsEngine(ledger, req.rowId, req.value as TermValue, { at: s.clock, byPersonId: req.requestedById, approvedById: req.approverId });
          }
          return {
            ledger,
            approvals: s.approvals.map((a) => (a.id === id ? { ...a, status: approve ? 'approved' : 'rejected', decidedAt: s.clock } : a)),
            notices: [
              ...s.notices,
              {
                at: s.clock,
                forPersonId: 'ananya',
                rowId: req.rowId,
                title: `${personName(req.approverId)} ${approve ? 'approved' : 'rejected'}: ${req.label}`,
                text: req.change,
              },
            ],
            events: [...s.events, { at: s.clock, text: `${personName(req.approverId)} ${approve ? 'approved' : 'rejected'} ${req.label}: ${req.change}.` }],
          };
        });
      },

      editRow: (rowId, value, reason) => {
        const rows = editRowEngine(get().ledger, rowId, value, { reason, at: get().clock, byPersonId: 'ananya' });
        const row = rows.find((r) => r.id === rowId);
        set((s) => ({ ledger: rows, events: [...s.events, { at: s.clock, text: `${row?.label ?? rowId} edited: ${reason}` }] }));
      },

      addCallTerm: (termKey, value, withPersonId, note) => {
        const rows = addCallTermEngine(get().ledger, termKey, value, { withPersonId, note, at: get().clock, byPersonId: 'ananya' });
        set((s) => ({ ledger: rows, events: [...s.events, { at: s.clock, text: `Term agreed on a call logged: ${plainValue(value)} with ${personName(withPersonId)}.` }] }));
      },

      requestAcceptTheirs: (rowId) => {
        const row = get().ledger.find((r) => r.id === rowId);
        if (!row) return;
        const threat = worstThreat(row, cloudDeskDeal);
        if (!threat) return;
        const tag = priceChange(cloudDeskDeal, row.position, threat.value);
        const cost = tag.costLakhPerYr === null ? null : row.termKey === 'renewal_notice' ? tag.costLakhPerYr / cloudDeskDeal.termYears : tag.costLakhPerYr;
        get().requestApproval({
          kind: 'accept_theirs',
          rowId,
          termKey: row.termKey,
          label: row.label,
          change: `${plainValue(row.position)} → ${plainValue(threat.value)}`,
          costLakhPerYr: cost,
          requestedById: 'ananya',
          value: threat.value,
        });
      },

      updateSetup: (patch) =>
        set((s) => ({
          setup: { ...s.setup, ...patch },
          events: [...s.events, { at: s.clock, text: `Setup: ${Object.entries(patch).map(([k, v]) => `${k} ${v ? 'done' : 'off'}`).join(', ')}.` }],
        })),

      resetSetup: () =>
        set((s) => ({
          setup: { enabled: false, consented: false, group: false, deployed: false, autoTrackAbove25: s.setup.autoTrackAbove25 },
          firstRunSeen: false,
          events: [...s.events, { at: s.clock, text: 'Setup reset: replaying the Microsoft 365 connection.' }],
        })),

      seeFirstRun: () => set({ firstRunSeen: true }),

      trackDeal: (dealId, people = []) =>
        set((s) => ({
          trackedDealIds: s.trackedDealIds.includes(dealId) ? s.trackedDealIds : [...s.trackedDealIds, dealId],
          dealPeople: { ...s.dealPeople, [dealId]: [...new Set([...(s.dealPeople[dealId] ?? []), ...people])] },
          events: [...s.events, { at: s.clock, text: `${dealId}: email tracking started by Ananya Rao${people.length ? `, with ${people.map(personName).join(', ')}` : ''}.` }],
        })),

      stopTracking: (dealId) =>
        set((s) => ({
          trackedDealIds: s.trackedDealIds.filter((id) => id !== dealId),
          events: [...s.events, { at: s.clock, text: `${dealId}: email tracking stopped. The ledger and its sources are kept.` }],
        })),

      neverTrack: (domain) =>
        set((s) => ({
          neverTrackDomains: [...new Set([...s.neverTrackDomains, domain])],
          events: [...s.events, { at: s.clock, text: `Never track ${domain}: the owner declined.` }],
        })),

      addPersonToDeal: (dealId, personId) =>
        set((s) => ({
          dealPeople: { ...s.dealPeople, [dealId]: [...new Set([...(s.dealPeople[dealId] ?? []), personId])] },
          settings: { ...s.settings, mailboxes: { ...s.settings.mailboxes, [personId]: true } },
          events: [...s.events, { at: s.clock, text: `${personName(personId)} added to ${dealId}: only their threads with this supplier are read.` }],
        })),

      removePersonFromDeal: (dealId, personId) =>
        set((s) => ({
          dealPeople: { ...s.dealPeople, [dealId]: (s.dealPeople[dealId] ?? []).filter((p) => p !== personId) },
          events: [...s.events, { at: s.clock, text: `${personName(personId)} removed from ${dealId}: their mailbox is no longer read for this supplier.` }],
        })),

      seeLinkNotice: () => set({ linkNoticeSeen: true }),

      markTour: (id) => set((s) => (s.tourClicks.includes(id) ? s : { tourClicks: [...s.tourClicks, id] })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      flagRow: (rowId, docValue, where) => {
        const rows = flagForConfirmationEngine(get().ledger, rowId, docValue, { at: get().clock, byPersonId: 'ananya', where });
        const row = rows.find((r) => r.id === rowId);
        set((s) => ({ ledger: rows, events: [...s.events, { at: s.clock, text: `${row?.label ?? rowId} flagged in ${where}: sent to Needs confirming.` }] }));
      },

      sendDispute: (message) =>
        set((s) => ({
          disputeRaised: true,
          disputeEmail: message,
          sentMessages: [...s.sentMessages, message],
          events: [...s.events, { at: s.clock, text: `Dispute sent to CloudDesk on INV-CD-2712, quoting clause 9.1 and Rohan's email of 14 Nov.` }],
        })),

      startDeal: (dealId) =>
        set((s) => ({
          startedDealIds: s.startedDealIds.includes(dealId) ? s.startedDealIds : [...s.startedDealIds, dealId],
          events: [...s.events, { at: s.clock, text: `${dealId} created from an email, with the intake filled in from the email and the PDF quote.` }],
        })),

      signAndSave: () => {
        get().sign();
        if (get().signedAt) get().saveToSirion();
      },

      dismissThread: (threadId) =>
        set((s) => ({
          dismissedThreadIds: [...s.dismissedThreadIds, threadId],
          completedSteps: threadId === 'T2' && !s.completedSteps.includes(2) ? [...s.completedSteps, 2] : s.completedSteps,
          events: [...s.events, { at: s.clock, text: `Thread ${threadId} marked as not this deal.` }],
        })),

      confirmRow: (rowId, value, note) => {
        const rows = confirmRowEngine(get().ledger, rowId, value, {
          note,
          at: get().clock,
          byPersonId: 'ananya',
        });
        const row = rows.find((r) => r.id === rowId);
        set((s) => ({
          ledger: rows,
          completedSteps: s.completedSteps.includes(2) ? s.completedSteps : [...s.completedSteps, 2],
          events: [
            ...s.events,
            { at: s.clock, text: `${row?.label ?? rowId} confirmed at ${plainValue(value)}.` },
          ],
        }));
      },

      setDraft: (key, body) => set((s) => ({ drafts: { ...s.drafts, [key]: body } })),

      recordSend: (outcome) =>
        set((s) => ({
          sendOutcomes: [...s.sendOutcomes, outcome],
          completedSteps:
            outcome.personId === 'vikram' && (outcome.choice || outcome.decision === 'allow') && s.clock >= STEP_CLOCK[3] && !s.completedSteps.includes(3)
              ? [...s.completedSteps, 3]
              : s.completedSteps,
        })),

      rateLastWarning: (personId, actionable) => {
        const outcomes = get().sendOutcomes;
        const index = outcomes.findLastIndex((outcome) => outcome.personId === personId && outcome.decision === 'warn');
        if (index < 0) return;
        set({ sendOutcomes: outcomes.map((outcome, i) => i === index ? { ...outcome, actionable } : outcome) });
        get().toast('Warning feedback saved.');
      },

      loopInLead: (draft, rowId, title) =>
        set((s) => ({
          drafts: { ...s.drafts, [`held-${draft.fromPersonId}`]: draft.body },
          notices: [
            ...s.notices,
            {
              at: s.clock,
              forPersonId: 'ananya',
              rowId,
              title: title ?? `${personById(draft.fromPersonId)?.name.split(' ')[0] ?? 'A colleague'}'s reply needs you`,
              text: `Held as a draft with you on Cc: “${draft.body.length > 140 ? `${draft.body.slice(0, 140)}…` : draft.body}”`,
              draft,
              href: rowId ? `/deals/D-CLOUDDESK?row=${rowId}#${rowId}` : '/outlook/ananya',
            },
          ],
          events: [...s.events, { at: s.clock, text: `${personById(draft.fromPersonId)?.name ?? draft.fromPersonId} looped in procurement before replying to the supplier.` }],
        })),

      sendConcession: (termKey, value, quote, personId, reason) => {
        const at = get().clock;
        let rows = applySentConcession(get().ledger, termKey, value, {
          kind: 'email',
          quote,
          at,
          byPersonId: personId,
        });
        if (reason) rows = noteOnRow(rows, termKey, at, `Reopened by ${personById(personId)?.name.split(' ')[0] ?? personId} · ${reason}`, personId);
        const row = rows.find((r) => r.termKey === termKey);
        set((s) => ({
          ledger: rows,
          notices: personId === 'ananya' ? s.notices : [
            ...s.notices,
            {
              at,
              forPersonId: 'ananya',
              rowId: row?.id,
              title: `Reopened by ${personById(personId)?.name.split(' ')[0] ?? personId}${reason ? ` · ${reason}` : ''}`,
              text: `${personById(personId)?.name.split(' ')[0] ?? 'A colleague'} told CloudDesk "${quote}" (${formatDateTime(at)}). Agreed: ${plainValue(
                row?.position ?? value,
              )}.`,
            },
          ],
          events: [
            ...s.events,
            { at, text: `${row?.label ?? termKey} reopened: our side conceded by email${reason ? ` (${reason})` : ''}.` },
          ],
        }));
      },

      sendMessage: (message) =>
        set((s) => ({
          sentMessages: [...s.sentMessages, message],
          events: [...s.events, { at: s.clock, text: `Email sent: ${message.subject}` }],
        })),

      runSigningCheck: () => {
        const v6 = versionById('v6')!;
        const result = signingCheck(get().ledger, v6, cloudDeskDeal);
        const rows = markSigningGaps(
          get().ledger,
          result.gaps.map((g) => ({
            rowId: g.rowId,
            value: extractValue(v6.clauses.find((c) => c.no === g.clauseNo)!)!,
            clauseNo: g.clauseNo,
            versionId: 'v6',
          })),
          result.matches.map((m) => m.rowId),
        );
        set((s) => ({
          ledger: rows,
          signing: { ...s.signing, checkedAt: s.clock },
          events: [
            ...s.events,
            { at: s.clock, text: `Signing copy checked: ${result.gaps.length} gaps found.` },
          ],
        }));
      },

      insertWording: (rowId) => {
        const rows = insertWordingForRow(get().ledger, rowId, get().clock);
        const row = rows.find((r) => r.id === rowId);
        if (!row) return;
        set((s) => ({
          ledger: rows,
          signing: markInserted(s, row.termKey),
          events: [
            ...s.events,
            { at: s.clock, text: `Proposed in Word · ${row.label}: agreed wording ${s.trackChanges ? 'as a tracked change' : 'with Track Changes off (no markup)'}.` },
          ],
        }));
      },

      insertAll: () => {
        const gaps = get().ledger.filter((r) => r.signing === 'gap');
        gaps.forEach((g) => get().insertWording(g.id));
      },

      waiveGap: (rowId, reason) => {
        const rows = waiveGapForRow(get().ledger, rowId, reason, get().clock);
        const row = rows.find((r) => r.id === rowId);
        if (!row) return;
        set((s) => ({
          ledger: rows,
          signing: {
            ...s.signing,
            waived: [...s.signing.waived, { termKey: row.termKey, reason }],
          },
          events: [...s.events, { at: s.clock, text: `${row.label}: gap waived — ${reason}` }],
        }));
        const gap = signingCheck(get().ledger, versionById('v6')!, cloudDeskDeal).gaps.find((g) => g.rowId === rowId);
        get().requestApproval({
          kind: 'waive',
          rowId,
          termKey: row.termKey,
          label: row.label,
          change: `signing copy wording kept · ${reason}`,
          costLakhPerYr: gap?.costLakhPerYr == null ? null : row.termKey === 'renewal_notice' ? gap.costLakhPerYr / cloudDeskDeal.termYears : gap.costLakhPerYr,
          requestedById: 'ananya',
          reason,
        });
      },

      sendBack: (via = 'email') => {
        const state = get();
        if (state.signing.sentBackAt || !state.signing.checkedAt) return;
        const original = signingCheck(state.ledger, versionById('v6')!, cloudDeskDeal);
        if (original.needsConfirmation.length || original.gaps.some((gap) =>
          !state.signing.inserted.includes(gap.termKey) && !state.signing.waived.some((row) => row.termKey === gap.termKey),
        )) return;
        const at = state.clock;
        const untracked = state.signing.untracked?.length ?? 0;
        const count = state.signing.inserted.length - untracked;
        const sent: EmailMessage = {
          id: 'M15',
          threadId: 'T1',
          from: 'ananya.rao@meridian.example',
          to: ['priya.nair@clouddesk.example'],
          cc: ['rohan.iyer@clouddesk.example'],
          subject: 'RE: CloudDesk signing copy',
          sentAt: at,
          attachments: [
            {
              fileName: 'CloudDesk_MSA_v7.docx',
              sizeKb: 95,
              versionId: 'v7',
              fingerprint: 'fp-v7',
              dealIdTag: 'DL-CLOUDDESK-2026',
            },
          ],
          body: via === 'portal'
            ? 'Shared with CloudDesk in the Sirion counterparty portal: v7 with tracked changes and comments, for review and signature.'
            : 'Thanks Priya. Please review the attached copy and return it for signature. Ananya',
          mailboxes: ['ananya'],
        };
        set((s) => ({
          signing: { ...s.signing, sentBackAt: at, submittedCopy: supplierReturn(versionById('v6')!, state.ledger, at) },
          sentVia: via,
          sentMessages: [...s.sentMessages, sent],
          completedSteps: s.completedSteps.includes(4) ? s.completedSteps : [...s.completedSteps, 4],
          events: [
            ...s.events,
            {
              at,
              text: `Saved to Sirion as v7 · sent back to CloudDesk ${via === 'portal' ? 'through the Sirion counterparty portal' : 'by email'} with ${count} tracked change${count === 1 ? '' : 's'}${untracked ? ` and ${untracked} untracked edit${untracked === 1 ? '' : 's'} CloudDesk will see with no markup` : ''}.`,
            },
          ],
        }));
      },

      sign: () => {
        const at = STEP_CLOCK[5];
        const state = get();
        if (!state.signing.sentBackAt || state.signedAt) return;
        const submitted = state.signing.submittedCopy;
        const copy = submitted
          ? { ...submitted, sentAt: at }
          : supplierReturn(versionById('v6')!, state.ledger.filter((row) => state.signing.inserted.includes(row.termKey)), at);
        const result = signingCheck(state.ledger, copy, cloudDeskDeal);
        const matched = new Set(result.matches.map((row) => row.rowId));
        const waived = new Set(state.signing.waived.map((row) => row.termKey));
        if (result.needsConfirmation.length || state.ledger.some((row) => !matched.has(row.id) && !waived.has(row.termKey))) {
          state.toast('The returned copy still has terms to verify.');
          return;
        }
        const rows = closeAllThreats(state.ledger, at).map((row): LedgerRow =>
          matched.has(row.id) ? { ...row, signing: 'match' } : row,
        );
        set((s) => ({
          ledger: rows,
          signing: { ...s.signing, returnedCopy: copy },
          signedAt: at,
          clock: at,
          completedSteps: s.completedSteps.includes(5) ? s.completedSteps : [...s.completedSteps, 5],
          events: [
            ...s.events,
            { at, text: 'CloudDesk returned v7. The signed clauses were checked against the ledger.' },
            ...s.signing.inserted.map((t) => ({ at, text: `Accepted by CloudDesk · ${s.ledger.find((r) => r.termKey === t)?.label ?? t}: in the signed copy.` })),
          ],
        }));
      },

      saveToSirion: () => {
        const state = get();
        if (!state.signedAt || state.contract) return;
        const copy = state.signing.returnedCopy ?? versionById('v6')!;
        const record = handover(state.ledger, copy, cloudDeskDeal);
        set((s) => ({
          contract: record,
          invoices: demoInvoices(record),
          events: [
            ...s.events,
            {
              at: s.clock,
              text: `Handed over to Sirion as ${record.id}: ${record.obligations.length} obligations and ${record.rules.length} invoice rules.`,
            },
          ],
        }));
      },

      fastForwardInvoice: () => {
        if (!get().contract) get().saveToSirion();
        if (!get().contract) return;
        set((s) => ({
          invoiceFastForward: true,
          clock: STEP_CLOCK[6],
          invoices: s.invoices.some((i) => i.id === FAST_FORWARD_INVOICE.id)
            ? s.invoices
            : [...s.invoices, FAST_FORWARD_INVOICE],
          completedSteps: s.completedSteps.includes(6) ? s.completedSteps : [...s.completedSteps, 6],
          events: [
            ...s.events,
            { at: STEP_CLOCK[6], text: 'Invoice INV-CD-2712 flagged against clause 9.1.' },
          ],
        }));
      },

      raiseDispute: () =>
        set((s) => ({
          disputeRaised: true,
          events: [...s.events, { at: s.clock, text: 'Dispute raised on INV-CD-2712.' }],
        })),

      resolveInvoice: () =>
        set((s) => ({
          invoiceResolved: true,
          events: [...s.events, { at: s.clock, text: 'INV-CD-2712 marked resolved.' }],
        })),

      addNotice: (notice) => set((s) => ({ notices: [...s.notices, notice] })),

      readNotices: () =>
        set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),

      reset: () => {
        set({
          ...BASE,
          ledger: initialLedger(),
          events: [{ at: STEP_CLOCK[0], text: 'Demo reset.' }],
        });
        // Session-only state elsewhere (the AskSirion conversation) clears on this.
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('deal-ledger-reset'));
      },
    }),
    {
      name: 'deal-ledger-demo',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // A toast belongs to the moment it was raised; never replay it after a reload.
      partialize: (state) => {
        const { lastToast: _toast, ...rest } = state;
        void _toast;
        return rest;
      },
    },
  ),
);

/** Cached reader result for a message, used when there is no API key. */
export function cachedReaderFor(messageId: string): ReaderResult | null {
  const map: Record<string, keyof typeof FIXTURES> = {
    M8: 'M8',
    M12: 'M12',
    M13: 'M13',
    M14: 'M14',
  };
  const key = map[messageId];
  if (!key) return null;
  return { ...FIXTURES[key], source: 'cached' } as ReaderResult;
}

export { messageById };
