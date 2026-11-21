'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Check, ChevronDown, CircleHelp, Search } from 'lucide-react';
import { useDemo, type Role } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { formatDateTime } from '@/lib/format';
import { dealById } from '@/lib/data';


const ROLES: { id: Role; name: string; role: string; initials: string }[] = [
  { id: 'lead', name: 'Ananya Rao', role: 'Procurement lead', initials: 'AR' },
  { id: 'it_head', name: 'Vikram Shah', role: 'Head of IT', initials: 'VS' },
  { id: 'cfo', name: 'Neha Kapoor', role: 'CFO', initials: 'NK' },
  { id: 'legal', name: 'Arjun Mehta', role: 'Legal counsel', initials: 'AM' },
];

const CRUMBS: Record<string, string> = {
  '/': 'Home',
  '/deals': 'Deals',
  '/contracts': 'Contracts',
  '/insights': 'Insights',
  '/settings': 'Privacy and admin',
  '/today': 'Sirion today vs Deal Ledger',
  '/story': 'Story',
  '/ask': 'AskSirion',
};

function breadcrumb(pathname: string): string[] {
  if (CRUMBS[pathname]) return ['Deal Ledger', CRUMBS[pathname]];
  if (pathname.startsWith('/deals/')) {
    const id = decodeURIComponent(pathname.split('/')[2] ?? '');
    const name = id === 'D-CLOUDDESK' ? 'CloudDesk renewal 2026-29' : dealById(id)?.supplier ?? id;
    return pathname.endsWith('/ledger') ? ['Deal Ledger', 'Deals', name, 'Ledger'] : ['Deal Ledger', 'Deals', name];
  }
  if (pathname.startsWith('/contracts/')) return ['Deal Ledger', 'Contracts', decodeURIComponent(pathname.split('/')[2] ?? '')];
  return ['Deal Ledger'];
}

export function TopBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const role = useDemo((s) => s.sirionRole);
  const setRole = useDemo((s) => s.setRole);
  const notices = useDemo((s) => s.notices);
  const readNotices = useDemo((s) => s.readNotices);

  const [roleOpen, setRoleOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const current = ROLES.find((r) => r.id === (hydrated ? role : 'lead'))!;
  const unread = hydrated ? notices.filter((n) => !n.read).length : 0;
  const crumbs = breadcrumb(pathname);

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-6 border-b border-line bg-white px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-page px-3 py-1.5 text-[13px]">
          {crumbs.map((c, i) => (
            <span key={c} className={`flex items-center gap-1.5 ${i === crumbs.length - 1 ? 'min-w-0' : 'shrink-0'}`}>
              {i > 0 && <span className="text-muted/50">/</span>}
              <span className={i === crumbs.length - 1 ? 'truncate text-ink' : 'text-muted'}>{c}</span>
            </span>
          ))}
        </div>
      </div>

      <button aria-label="Search" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-page text-muted 2xl:hidden">
        <Search size={15} strokeWidth={2} />
      </button>
      <div className="hidden min-w-[240px] max-w-sm flex-1 items-center gap-2 rounded-md border border-line bg-page px-3 py-[7px] 2xl:flex">
        <Search size={14} className="shrink-0 text-muted" strokeWidth={2} />
        <input
          placeholder="Search deals, contracts and terms"
          className="w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted"
        />
      </div>


      <div className="flex shrink-0 items-center gap-1">
        <div className="relative">
          <button
            onClick={() => setRoleOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-ink transition-colors hover:bg-page"
          >
            <span className="hidden text-muted xl:inline">Viewing as:</span>
            <span className="font-medium">{current.name}</span>
            <span className="hidden text-muted lg:inline">· {current.role}</span>
            <ChevronDown size={13} className="text-muted" />
          </button>
          {roleOpen && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setRoleOpen(false)} />
              <div className="dl-fade-in absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-line bg-white py-1.5 shadow-pop">
                <p className="px-3 pb-1.5 pt-1 text-[10.5px] uppercase tracking-wide text-muted">
                  Switch role
                </p>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRole(r.id);
                      setRoleOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-page"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-900 text-[10.5px] font-semibold text-white">
                      {r.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ink">{r.name}</span>
                      <span className="block truncate text-[11px] text-muted">{r.role}</span>
                    </span>
                    {r.id === role && <Check size={14} className="text-teal-900" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setBellOpen((v) => !v);
              if (!bellOpen) readNotices();
            }}
            aria-label="Notifications"
            className="relative rounded-md p-2 text-muted transition-colors hover:bg-page hover:text-ink"
          >
            <Bell size={17} strokeWidth={1.7} />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setBellOpen(false)} />
              <div className="dl-fade-in absolute right-0 top-full z-20 mt-1 w-96 rounded-lg border border-line bg-white shadow-pop">
                <p className="border-b border-line px-4 py-2.5 text-[12px] font-medium text-ink">
                  Notifications
                </p>
                <div className="max-h-80 overflow-y-auto">
                  {notices.length === 0 && (
                    <p className="px-4 py-6 text-center text-[12.5px] text-muted">
                      Nothing yet.
                    </p>
                  )}
                  {[...notices].reverse().map((n, i) => (
                    <div key={i} className="border-b border-line/60 px-4 py-3 last:border-0">
                      <p className="text-[12.5px] leading-[18px] text-ink">{n.text}</p>
                      <p className="mt-1 text-[11px] text-muted">{formatDateTime(n.at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          aria-label="Help"
          className="rounded-md p-2 text-muted transition-colors hover:bg-page hover:text-ink"
        >
          <CircleHelp size={17} strokeWidth={1.7} />
        </button>

        <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-[11px] font-semibold text-white">
          {current.initials}
        </span>
      </div>
    </header>
  );
}
