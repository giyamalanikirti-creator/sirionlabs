import type { Metadata } from 'next';
import './globals.css';
import { DemoChrome } from '@/components/demo/DemoChrome';

/*
 * Fonts load through a stylesheet link rather than next/font/google so the
 * production build never has to reach fonts.googleapis.com. Inter carries the
 * Sirion side; Carlito is metric-compatible with Calibri and carries the Word
 * mock's page body (§3).
 */
/** Every request renders on today's date (the story is anchored to it), so no page is prerendered with a stale date. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Deal Ledger',
  description:
    'One source-linked record of what has actually been agreed with a supplier.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Carlito:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DemoChrome>{children}</DemoChrome>
      </body>
    </html>
  );
}
