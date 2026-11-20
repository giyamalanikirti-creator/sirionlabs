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
  insertWordingForRow,
  markSigningGaps,
  waiveGapForRow,
} from '@/lib/engines/ledger';
import { signingCheck, supplierReturn } from '@/lib/engines/signing';
import { handover, type ContractRecord, demoInvoices, FAST_FORWARD_INVOICE } from '@/lib/engines/handover';
import { extractValue } from '@/lib/engines/diff';
import { CLARIFY_REPLY, CLARIFY_REPLY_QUOTE, cloudDeskDeal, messageById, versionById } from '@/lib/data';
import { plainValue } from '@/lib/plain';
import { formatDateTime } from '@/lib/format';

export type Role = 'lead' | 'it_head' | 'cfo' | 'legal';

export interface SendOutcome {
  at: string;
  personId: string;
  termKey?: TermKey;
  decision: 'allow' | 'warn' | 'could_not_check';
  choice?: 'loop_in' | 'dont_send' | 'send_anyway';
  actionable?: boolean;
}

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
  sentMessages: EmailMessage[];
  drafts: Record<string, string>;
  sendOutcomes: SendOutcome[];
  signing: {
    versionId: 'v6';
    inserted: TermKey[];
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
  guideOpen: boolean;
  lastToast?: { at: number; text: string };

  // actions
  setClock: (iso: string) => void;
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
  dismissThread: (threadId: string) => void;
  confirmRow: (rowId: string, value: TermValue, note?: string) => void;
  setDraft: (key: string, body: string) => void;
  recordSend: (outcome: SendOutcome) => void;
  rateLastWarning: (personId: string, actionable: boolean) => void;
  sendConcession: (termKey: TermKey, value: TermValue, quote: string, personId: string) => void;
  sendMessage: (message: EmailMessage) => void;
  runSigningCheck: () => void;
  insertWording: (rowId: string) => void;
  insertAll: () => void;
  waiveGap: (rowId: string, reason: string) => void;
  sendBack: () => void;
  sign: () => void;
  saveToSirion: () => void;
  fastForwardInvoice: () => void;
  raiseDispute: () => void;
  resolveInvoice: () => void;
  addNotice: (notice: Notice) => void;
  readNotices: () => void;
  setGuideOpen: (open: boolean) => void;
  toast: (text: string) => void;
  logEvent: (text: string) => void;
  reset: () => void;
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
  sentMessages: [] as EmailMessage[],
  drafts: {} as Record<string, string>,
  sendOutcomes: [] as SendOutcome[],
  signing: { versionId: 'v6' as const, inserted: [] as TermKey[], waived: [] as { termKey: TermKey; reason: string }[] },
  signedAt: undefined,
  contract: undefined,
  invoices: [] as Invoice[],
  invoiceFastForward: false,
  disputeRaised: false,
  invoiceResolved: false,
  notices: [] as Notice[],
  completedSteps: [0] as Step[],
  events: [{ at: STEP_CLOCK[0], text: 'Demo started. Ledger loaded from rounds 1–3.' }],
  guideOpen: false,
  lastToast: undefined,
};

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => ({
      ...BASE,

      setClock: (iso) => set({ clock: iso }),
      setRole: (sirionRole) => set({ sirionRole }),

      logEvent: (text) =>
        set((s) => ({ events: [...s.events, { at: s.clock, text }] })),

      toast: (text) => set({ lastToast: { at: Date.now(), text } }),

      setGuideOpen: (guideOpen) => set({ guideOpen }),

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
          signing: { ...s.signing, inserted: [...new Set([...s.signing.inserted, row.termKey])] },
          events: [...s.events, { at: s.clock, text: `${row.label}: playbook ${label} inserted as a tracked change.` }],
        }));
      },

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
            (outcome.choice || outcome.personId === 'vikram' && outcome.decision === 'allow' && s.clock === STEP_CLOCK[3]) && !s.completedSteps.includes(3)
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

      sendConcession: (termKey, value, quote, personId) => {
        const at = get().clock;
        const rows = applySentConcession(get().ledger, termKey, value, {
          kind: 'email',
          quote,
          at,
          byPersonId: personId,
        });
        const row = rows.find((r) => r.termKey === termKey);
        set((s) => ({
          ledger: rows,
          notices: [
            ...s.notices,
            {
              at,
              forPersonId: 'ananya',
              rowId: row?.id,
              text: `Vikram told CloudDesk "${quote}" (${formatDateTime(at)}). Agreed: ${plainValue(
                row?.position ?? value,
              )}.`,
            },
          ],
          events: [
            ...s.events,
            { at, text: `${row?.label ?? termKey} reopened: our side conceded by email.` },
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
          signing: { ...s.signing, inserted: [...new Set([...s.signing.inserted, row.termKey])] },
          events: [
            ...s.events,
            { at: s.clock, text: `${row.label}: agreed wording inserted as a tracked change.` },
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
      },

      sendBack: () => {
        const state = get();
        if (state.signing.sentBackAt || !state.signing.checkedAt) return;
        const original = signingCheck(state.ledger, versionById('v6')!, cloudDeskDeal);
        if (original.needsConfirmation.length || original.gaps.some((gap) =>
          !state.signing.inserted.includes(gap.termKey) && !state.signing.waived.some((row) => row.termKey === gap.termKey),
        )) return;
        const at = state.clock;
        const count = state.signing.inserted.length;
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
          body: 'Thanks Priya. Please review the attached copy and return it for signature. Ananya',
          mailboxes: ['ananya'],
        };
        set((s) => ({
          signing: { ...s.signing, sentBackAt: at, submittedCopy: supplierReturn(versionById('v6')!, state.ledger, at) },
          sentMessages: [...s.sentMessages, sent],
          completedSteps: s.completedSteps.includes(4) ? s.completedSteps : [...s.completedSteps, 4],
          events: [...s.events, { at, text: `v7 sent back to CloudDesk with ${count} tracked changes.` }],
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
          events: [...s.events, { at, text: 'CloudDesk returned v7. The signed clauses were checked against the ledger.' }],
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

      reset: () =>
        set({
          ...BASE,
          ledger: initialLedger(),
          events: [{ at: STEP_CLOCK[0], text: 'Demo reset.' }],
        }),
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
