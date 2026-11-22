'use client';

/**
 * UI-only state for the demo shell. Two choices last for the browser tab's
 * session only (sessionStorage, wrapped in try/catch) and never carry over to a
 * new visit, so a new viewer always starts with the rail open and hints on:
 *   - railCollapsed: the viewer pressed « (A4)
 *   - hintsHidden: "Hide hints" (A2)
 * Reset demo clears both.
 */
import { create } from 'zustand';

const KEY = 'deal-ledger-guide-ui';

interface Saved {
  railCollapsed?: boolean;
  hintsHidden?: boolean;
}

function read(): Saved {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? '{}') as Saved;
  } catch {
    return {};
  }
}
function write(v: Saved) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* private window: the choice lasts until reload */
  }
}

interface GuideUi {
  loaded: boolean;
  hintsHidden: boolean;
  railCollapsed: boolean;
  /** Esc hides the label for this action only; the ring stays. */
  dismissedAction?: string;
  /** "Stay here" on a step-complete card: keyed "step-3" or "quick". */
  stayed: string[];
  /** The coach mark found nothing on this screen to ring for this action: the in-frame bar takes over. */
  offscreenAction?: string;
  load: () => void;
  setHintsHidden: (v: boolean) => void;
  setRailCollapsed: (v: boolean) => void;
  dismissAction: (id?: string) => void;
  stay: (key: string) => void;
  setOffscreen: (id?: string) => void;
  resetUi: () => void;
}

export const useGuideUi = create<GuideUi>()((set, get) => ({
  loaded: false,
  hintsHidden: false,
  railCollapsed: false,
  dismissedAction: undefined,
  stayed: [],
  offscreenAction: undefined,
  load: () => {
    if (get().loaded) return;
    const v = read();
    set({ loaded: true, hintsHidden: Boolean(v.hintsHidden), railCollapsed: Boolean(v.railCollapsed) });
    /* An older build remembered a collapsed rail across visits; drop it so it can't carry over. */
    try {
      window.localStorage.removeItem('deal-ledger-rail');
    } catch {
      /* nothing to drop */
    }
  },
  setHintsHidden: (hintsHidden) => {
    set({ hintsHidden });
    write({ hintsHidden, railCollapsed: get().railCollapsed });
  },
  setRailCollapsed: (railCollapsed) => {
    set({ railCollapsed });
    write({ hintsHidden: get().hintsHidden, railCollapsed });
  },
  dismissAction: (dismissedAction) => set({ dismissedAction }),
  stay: (key) => set((s) => ({ stayed: s.stayed.includes(key) ? s.stayed : [...s.stayed, key] })),
  setOffscreen: (offscreenAction) => {
    if (get().offscreenAction !== offscreenAction) set({ offscreenAction });
  },
  resetUi: () => {
    set({ hintsHidden: false, railCollapsed: false, dismissedAction: undefined, stayed: [], offscreenAction: undefined });
    write({});
  },
}));
