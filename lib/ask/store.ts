'use client';

/**
 * The AskSirion conversation for this session. It survives moving between
 * apps (client-side navigation) and clears on Reset demo. Not persisted.
 */
import { create } from 'zustand';
import { useDemo } from '@/lib/store';
import { buildAnswer, fallbackAnswer } from './answer';
import { route } from './router';
import { suggestionsFor } from './scope';
import type { AskScope, AskState, AskTurn, IntentId, Slots } from './types';
import type { TermKey } from '@/lib/types';

/** Long enough that the thinking state is visible in cached mode. */
export const THINKING_MS = 750;

export function toAskState(): AskState {
  const s = useDemo.getState();
  return {
    clock: s.clock,
    ledger: s.ledger,
    linkedThreadIds: s.linkedThreadIds,
    mailboxes: s.settings.mailboxes,
    ownersSeeFallbacks: s.settings.ownersSeeFallbacks,
    syncedVersionIds: s.syncedVersionIds,
    signing: s.signing,
    signedAt: s.signedAt,
    contract: s.contract,
    invoices: s.invoices,
    invoiceFastForward: s.invoiceFastForward,
  };
}

interface AskStore {
  open: boolean;
  turns: AskTurn[];
  /** An answer arrived while the panel was closed. */
  unread: boolean;
  /** Scope widened to all contracts by the user, for this route. */
  widenedFor?: string;
  /** A question to ask as soon as the launcher knows the scope (from the guide rail or /today). */
  queued?: { prompt: string; intent?: IntentId };
  openWith: (prompt: string, intent?: IntentId) => void;
  takeQueued: () => { prompt: string; intent?: IntentId } | undefined;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  widen: (routeKey: string | undefined) => void;
  clear: () => void;
  ask: (question: string, scope: AskScope, opts?: { intent?: IntentId; step?: number }) => Promise<void>;
}

let nextId = 1;

async function classify(question: string, scope: AskScope, prev?: { intent?: IntentId; term?: TermKey }) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, scope: scope.kind, prev }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { intent?: IntentId; slots?: Slots; fallback?: boolean; source: 'live' | 'rules' };
      if (data.source === 'live') return data;
    }
  } catch {
    // Never a dead end: route in the browser.
  }
  const r = route(question, scope, prev);
  return 'fallback' in r ? { fallback: true, slots: r.slots, source: 'rules' as const } : { intent: r.intent, slots: r.slots, source: 'rules' as const };
}

export const useAsk = create<AskStore>((set, get) => ({
  open: false,
  turns: [],
  unread: false,
  setOpen: (open) => set({ open, unread: open ? false : get().unread }),
  toggle: () => get().setOpen(!get().open),
  widen: (routeKey) => set({ widenedFor: routeKey }),
  clear: () => set({ turns: [], unread: false, widenedFor: undefined, queued: undefined }),
  openWith: (prompt, intent) => set({ open: true, unread: false, queued: { prompt, intent } }),
  takeQueued: () => {
    const q = get().queued;
    if (q) set({ queued: undefined });
    return q;
  },
  ask: async (question, scope, opts = {}) => {
    const q = question.trim().slice(0, 500);
    if (!q || get().turns.some((t) => t.pending)) return;
    const id = nextId++;
    set((st) => ({ turns: [...st.turns, { id, question: q, scope, pending: true }] }));
    const started = Date.now();
    const last = [...get().turns].reverse().find((t) => t.answer && !t.pending);
    const prev = last ? { intent: last.intent, term: last.answer?.term } : undefined;
    const routed = opts.intent
      ? { intent: opts.intent, slots: route(q, scope, prev).slots, source: 'chip' as const }
      : await classify(q, scope, prev);
    const wait = THINKING_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const suggestions = suggestionsFor(scope, opts.step).map((x) => x.prompt);
    const state = toAskState();
    const answer =
      'intent' in routed && routed.intent
        ? buildAnswer(routed.intent, routed.slots ?? {}, scope, state, q, suggestions)
        : fallbackAnswer(suggestions);
    set((st) => ({
      turns: st.turns.map((t) =>
        t.id === id ? { ...t, pending: false, answer, intent: 'intent' in routed ? routed.intent : undefined, via: routed.source === 'chip' ? 'chip' : routed.source } : t,
      ),
      unread: !st.open,
    }));
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('deal-ledger-reset', () => useAsk.getState().clear());
}
