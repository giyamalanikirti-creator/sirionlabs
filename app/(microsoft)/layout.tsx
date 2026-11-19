'use client';

import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { NarrowNotice } from '@/components/microsoft/NarrowNotice';

/**
 * Client-only so Griffel never has to run through SSR (§3).
 * Tailwind preflight is disabled globally, so nothing here is reset by it.
 */
export default function MicrosoftLayout({ children }: { children: React.ReactNode }) {
  return (
    <FluentProvider theme={webLightTheme} style={{ height: '100%' }}>
      <NarrowNotice />
      {children}
    </FluentProvider>
  );
}
