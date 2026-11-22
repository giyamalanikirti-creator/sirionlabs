'use client';

/**
 * The four destinations, as buttons that carry each app's identity. The active
 * one is filled in its colour; the one holding the next walkthrough action
 * gets a guide-accent ring and a "Next" badge and takes you to that screen.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { STEP_CLOCK } from '@/lib/demo/steps';
import { appOf, type AppKey } from '@/lib/demo/guideState';
import { APPS, AppIcon } from './apps';
import { useGuide } from './useGuide';

function activeApp(pathname: string): AppKey {
  return appOf(pathname);
}

export function AppSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const clock = useDemo((s) => s.clock);
  const g = useGuide();
  const active = activeApp(pathname);
  const nextAction = g.target?.action;
  const nextApp = nextAction ? appOf(nextAction.href) : undefined;
  const v6 = hydrated && clock >= STEP_CLOCK[4];

  return (
    <nav aria-label="Switch app" className="flex items-center gap-2">
      {(['sirion', 'ananya', 'vikram', 'word'] as AppKey[]).map((key) => {
        const a = APPS[key];
        const isActive = key === active;
        const isNext = hydrated && key === nextApp && !isActive;
        const caption = key === 'word' ? (v6 ? 'Signing copy' : 'Latest draft') : a.caption;
        const href = key === 'word' ? (v6 ? '/word/v6?from=sirion' : '/word/v4?from=sirion') : a.href;
        return (
          <button
            key={key}
            onClick={() => (isNext ? g.openAction(nextAction!) : router.push(href))}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'relative flex h-9 items-center gap-2 rounded-lg px-3 text-left transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guide-200',
              isActive ? 'text-white' : 'border border-white/[0.22] bg-white/[0.08] text-white hover:bg-white/[0.14]',
              isNext ? 'ring-2 ring-[#1F6FD1] ring-offset-2 ring-offset-ink' : '',
            ].join(' ')}
            style={isActive ? { background: a.colour } : undefined}
          >
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
              style={{ background: isActive && key !== 'sirion' ? 'rgba(255,255,255,0.18)' : '#FFFFFF' }}
            >
              <AppIcon app={key} size={14} light={isActive && key !== 'sirion'} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="whitespace-nowrap text-[14px] font-semibold">{a.label}</span>
              {caption && <span className="mt-0.5 whitespace-nowrap text-[11px] font-normal text-white/75">{caption}</span>}
            </span>
            {a.persona && (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/20 text-[11px] font-semibold">{a.persona}</span>
            )}
            {isActive && <span aria-hidden className="absolute bottom-[-8px] left-3 right-3 h-[3px] rounded-full bg-white" />}
            {isNext && (
              <span className="guide-solid guide-bob absolute -right-2 -top-2 rounded-full px-1.5 py-[1px] text-[10.5px] font-semibold text-white shadow">Next</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
