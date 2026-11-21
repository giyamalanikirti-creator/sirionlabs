'use client';

/**
 * The demo bar (52 px, ink): our mark and "Deal Ledger · prototype", the app
 * switcher in the centre and a small menu on the right.
 * Reset lives in the guide rail's footer, away from the switcher.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { Mark } from '@/components/sirion/Mark';
import { AppSwitcher } from './AppSwitcher';

export function DemoStrip() {
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  return (
    <header className="ds-scope relative flex h-[52px] shrink-0 items-center gap-4 bg-ink px-4 text-white">
      <div className="flex shrink-0 items-center gap-2">
        <Mark size={24} tone="light" />
        <span className="hidden whitespace-nowrap text-[14px] font-semibold xl:inline">
          Deal Ledger <span className="font-normal text-white/60">· prototype</span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        <AppSwitcher />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setMenu((v) => !v)}
          aria-label="More"
          aria-expanded={menu}
          className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-guide-200"
        >
          <MoreHorizontal size={18} />
        </button>
        {menu && (
          <div role="menu" className="absolute right-4 top-[48px] z-[200] w-56 rounded-lg border border-line bg-white py-1 text-ink shadow-pop">
            {[
              ['About this case', '/story'],
              ['How it was set up', '/setup'],
              ['Privacy and admin', '/settings'],
            ].map(([label, href]) => (
              <button
                key={href}
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  router.push(href);
                }}
                className="block w-full px-3 py-2 text-left text-[13px] hover:bg-page"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
