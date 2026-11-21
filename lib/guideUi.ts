'use client';

/** UI-only state for the demo shell: hints on/off, the rail overlay. Not persisted. */
import { create } from 'zustand';

interface GuideUi {
  hintsHidden: boolean;
  /** Esc dismisses the coach mark for the current action only. */
  dismissedAction?: string;
  railOverlay: boolean;
  setHintsHidden: (v: boolean) => void;
  dismissAction: (id?: string) => void;
  setRailOverlay: (v: boolean) => void;
}

export const useGuideUi = create<GuideUi>()((set) => ({
  hintsHidden: false,
  dismissedAction: undefined,
  railOverlay: false,
  setHintsHidden: (hintsHidden) => set({ hintsHidden }),
  dismissAction: (dismissedAction) => set({ dismissedAction }),
  setRailOverlay: (railOverlay) => set({ railOverlay }),
}));
