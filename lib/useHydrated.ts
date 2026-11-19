'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * The demo store is persisted to localStorage, so the first client render must
 * match the server's. Components read this before showing stored state:
 * false while rendering on the server, true once the client has taken over.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
