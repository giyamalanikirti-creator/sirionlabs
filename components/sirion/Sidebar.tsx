'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileText, Handshake, Home, LineChart } from 'lucide-react';
import { Mark } from './Mark';

const NAV = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/deals', icon: Handshake, label: 'Deals' },
  { href: '/contracts', icon: FileText, label: 'Contracts' },
  { href: '/insights', icon: LineChart, label: 'Insights' },
  { href: '/story', icon: BookOpen, label: 'About this case' },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 bg-teal-900 py-3">
      <Link href="/" className="mb-3 flex h-10 w-10 items-center justify-center" aria-label="Deal Ledger home">
        <Mark size={28} tone="light" />
      </Link>

      {NAV.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={[
              'group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              active ? 'bg-white' : 'hover:bg-white/12',
            ].join(' ')}
          >
            <Icon
              size={19}
              strokeWidth={1.7}
              className={active ? 'text-teal-900' : 'text-white/85 group-hover:text-white'}
            />
            <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-white group-hover:block">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
