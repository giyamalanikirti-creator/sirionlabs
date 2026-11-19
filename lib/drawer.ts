'use client';

import { create } from 'zustand';
import type { SourceRef } from '@/lib/types';

interface DrawerState {
  source: SourceRef | null;
  /** When set, the drawer renders inside a pane instead of over the page. */
  inline: boolean;
  open: (source: SourceRef, inline?: boolean) => void;
  close: () => void;
}

export const useSourceDrawer = create<DrawerState>((set) => ({
  source: null,
  inline: false,
  open: (source, inline = false) => set({ source, inline }),
  close: () => set({ source: null, inline: false }),
}));
