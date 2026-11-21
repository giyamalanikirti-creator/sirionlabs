'use client';

/**
 * AskSirion: the floating launcher and its panel, bottom right of the app
 * frame (never over the guide rail). Mounted once inside <main id="app-frame">
 * so it persists across routes. Brief §3.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Maximize2, X } from 'lucide-react';
import { SirionMark } from '@/components/sirion/SirionMark';
import { useAsk } from '@/lib/ask/store';
import { scopeFor, widen } from '@/lib/ask/scope';
import { useDemo } from '@/lib/store';
import { useGuide } from '@/components/demo/useGuide';
import { AskConversation } from './AskConversation';

const TIP_KEY = 'asksirion-tip-seen';

function readTip(): boolean {
  try {
    return localStorage.getItem(TIP_KEY) === '1';
  } catch {
    return true;
  }
}
function writeTip() {
  try {
    localStorage.setItem(TIP_KEY, '1');
  } catch {
    // Private window or blocked storage: the tip simply shows again next time.
  }
}

export function AskLauncher() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const open = useAsk((s) => s.open);
  const setOpen = useAsk((s) => s.setOpen);
  const toggle = useAsk((s) => s.toggle);
  const unread = useAsk((s) => s.unread);
  const thinking = useAsk((s) => s.turns.some((t) => t.pending));
  const queued = useAsk((s) => s.queued);
  const widenedFor = useAsk((s) => s.widenedFor);
  const setWidened = useAsk((s) => s.widen);
  const linked = useDemo((s) => s.linkedThreadIds);
  const g = useGuide();

  const routeKey = `${pathname}?${params.toString()}`;
  const baseScope = scopeFor(pathname, params.toString(), linked);
  const scope = widenedFor === routeKey ? widen(baseScope) : baseScope;
  const step = g.current === 7 ? undefined : g.current;

  const microsoft = pathname.startsWith('/outlook') || pathname.startsWith('/word');
  const size = microsoft ? 48 : 56;
  /* Outlook and Word: sit above the pane footer (and Word's status bar). */
  const bottomBase = pathname.startsWith('/word') ? 76 : pathname.startsWith('/outlook') ? 52 : 24;
  const right = microsoft ? 20 : 24;
  const hidden = pathname.startsWith('/ask');

  const [lift, setLift] = useState(0);
  const [modal, setModal] = useState(false);
  const [frame, setFrame] = useState({ w: 1200, h: 800 });
  const [tip, setTip] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  /* Frame size: panel height, and the narrow-frame sheet below 1100 px. */
  useLayoutEffect(() => {
    const el = document.getElementById('app-frame');
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrame({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Collision rules: move up off a coach-mark target; hide under a modal dialog. */
  useEffect(() => {
    const check = () => {
      setModal(Boolean(document.querySelector('[aria-modal="true"]:not([data-asksirion]), [role="alertdialog"]')));
      // Coach-mark targets and key task buttons (data-ask-avoid): never under the launcher.
      const targets = [...document.querySelectorAll('.tour-target, [data-ask-avoid]')];
      const frameEl = document.getElementById('app-frame');
      if (!targets.length || !frameEl) return setLift(0);
      const f = frameEl.getBoundingClientRect();
      const box = { left: f.right - right - size - 8, right: f.right - right + 8, top: f.bottom - bottomBase - size - 8, bottom: f.bottom - bottomBase + 8 };
      let lift = 0;
      for (const el of targets) {
        const t = el.getBoundingClientRect();
        if (!t.width || !t.height) continue;
        const overlaps = t.right > box.left && t.left < box.right && t.bottom > box.top && t.top < box.bottom;
        if (overlaps) lift = Math.max(lift, Math.round(box.bottom - t.top + 16));
      }
      setLift(lift);
    };
    check();
    const id = window.setInterval(check, 300);
    return () => window.clearInterval(id);
  }, [size, bottomBase, right]);

  /* First visit only: a one-time tooltip. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage once after mount
    setTip(!readTip());
  }, []);

  /* Ctrl/⌘ + J toggles; Esc closes. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggle();
        setTip(false);
        writeTip();
      } else if (e.key === 'Escape' && useAsk.getState().open) {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, setOpen]);

  /* A question sent from the guide rail or /today: ask it with this screen's scope. */
  useEffect(() => {
    if (!queued) return;
    const q = useAsk.getState().takeQueued();
    if (q) void useAsk.getState().ask(q.prompt, scope, { intent: q.intent, step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued]);

  if (hidden || modal) return null;

  const narrow = frame.w < 1100;
  const bottom = bottomBase + lift;
  const panelH = Math.min(640, frame.h - 120);
  const state = thinking ? 'thinking' : open ? 'open' : 'idle';

  return (
    <div className="ds-scope">
      {open && narrow && <button aria-label="Close AskSirion" onClick={() => setOpen(false)} className="absolute inset-0 z-[60] cursor-default bg-ink/25" />}
      {open && (
        <div
          role="dialog"
          aria-label="AskSirion"
          data-asksirion
          className={`ask-panel-in absolute z-[70] flex flex-col overflow-hidden border border-line bg-white shadow-[0_18px_48px_rgba(31,42,46,0.22)] ${narrow ? 'bottom-0 right-0 top-0 w-[420px] max-w-full rounded-none' : 'w-[400px] rounded-2xl'}`}
          style={narrow ? undefined : { right, bottom: bottom + size + 12, height: Math.max(360, panelH) }}
        >
          <header className="flex items-center gap-2 bg-[#0C5E69] px-3 py-2.5 text-white">
            <SirionMark size={22} colour="#FFFFFF" />
            <span className="text-[15px] font-semibold tracking-tight">AskSirion</span>
            <span className="ml-1 inline-flex min-w-0 items-center gap-1 rounded-full bg-white/15 py-[2px] pl-2.5 pr-1 text-[12px] font-medium">
              <span className="truncate">{scope.label}</span>
              {scope.kind !== 'all' ? (
                <button onClick={() => setWidened(routeKey)} aria-label="Widen to all contracts" title="Widen to all contracts" className="grid h-4 w-4 place-items-center rounded-full hover:bg-white/25">
                  <X size={11} />
                </button>
              ) : (
                <span className="w-1" />
              )}
            </span>
            <span className="ml-auto flex items-center gap-0.5">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push('/ask');
                }}
                aria-label="Expand"
                title="Expand"
                className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/15"
              >
                <Maximize2 size={14} />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close AskSirion" className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/15">
                <X size={16} />
              </button>
            </span>
          </header>
          <AskConversation scope={scope} step={step} onNavigate={() => setOpen(false)} />
        </div>
      )}

      <div className="ask-launcher absolute z-[65] flex items-center gap-2" style={{ right, bottom, transition: 'bottom 200ms ease-out' }}>
        {tip && !open && (
          <button
            onClick={() => {
              setTip(false);
              writeTip();
            }}
            className="absolute bottom-full right-0 mb-3 w-max max-w-[240px] rounded-lg bg-ink px-3 py-2 text-left text-[13px] font-medium text-white shadow-lg"
          >
            Ask anything about your contracts
            <span className="block text-[11.5px] font-normal text-white/70">Ctrl + J · click to dismiss</span>
            <span aria-hidden className="absolute -bottom-1 right-5 h-2.5 w-2.5 rotate-45 bg-ink" />
          </button>
        )}
        {!open && (
          <span className="ask-label rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-teal-900 shadow-md ring-1 ring-line">AskSirion</span>
        )}
        <span className="relative shrink-0">
        <button
          ref={launcherRef}
          onClick={() => {
            toggle();
            setTip(false);
            writeTip();
          }}
          aria-label={open ? 'Close AskSirion' : 'Open AskSirion'}
          aria-expanded={open}
          data-state={state}
          className="ask-orb grid shrink-0 place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
          style={{ width: size, height: size }}
        >
          <span className="ask-orb-ring" aria-hidden />
          <span className="ask-orb-disc" aria-hidden />
          <span className="relative">
            {open ? <X size={size * 0.42} color="#FFFFFF" strokeWidth={2.4} /> : <SirionMark size={Math.round(size * 0.5)} colour="#FFFFFF" />}
          </span>
        </button>
        {unread && !open && <span role="status" aria-label="New answer" className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#12A37A]" />}
        </span>
      </div>
    </div>
  );
}
