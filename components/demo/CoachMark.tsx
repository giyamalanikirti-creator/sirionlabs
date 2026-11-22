'use client';

/**
 * In-app guidance (walkthrough brief A2, A3). The app shows the way; the rail is the map.
 *
 *  - The next action's element gets a ring (guide-600, 2 px, 2 px offset, soft
 *    pulse; static under reduced motion) and a small "Next · {label}" tag
 *    anchored to it, flipping and shifting so it never covers the element.
 *  - If the element isn't on screen, the first visible step on the way to it
 *    is ringed instead: a closed disclosure's trigger, a tab, a link. If there
 *    is nothing on this screen, the in-frame bar (NextBar) takes over.
 *  - The ring stays until the action is done: a first click, a route change,
 *    a re-render or AskSirion opening don't clear it. Esc hides only the tag.
 *    "Hide hints" in the rail is the only off switch.
 *  - The in-frame bar offers the next step when the last action is done.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useDemo } from '@/lib/store';
import { useGuideUi } from '@/lib/guideUi';
import { appOf, isReadingPage } from '@/lib/demo/guideState';
import type { ScriptAction } from '@/lib/demo/script';
import { useGuide } from './useGuide';

interface Pos {
  top: number;
  left: number;
  above: boolean;
  arrowLeft: number;
}

const TIP_H = 30;
/** Above Fluent dialogs and drawers, so a target inside a dialog keeps its tag. */
const Z_TAG = 2147483000;
/** The tag's width from its text (12 px semibold), so it can sit flush and never wrap. */
const tagWidth = (text: string) => Math.min(480, Math.round(text.length * 7.1) + 28);

/** The visible part of the element, or null when too little of it is usable. */
function visibleRect(el: HTMLElement): DOMRect | null {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return null;
  const r = el.getBoundingClientRect();
  let top = r.top;
  let bottom = r.bottom;
  let left = r.left;
  let right = r.right;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p);
    if (/(auto|scroll|hidden|clip)/.test(o.overflowY + o.overflowX)) {
      const pr = p.getBoundingClientRect();
      top = Math.max(top, pr.top);
      bottom = Math.min(bottom, pr.bottom);
      left = Math.max(left, pr.left);
      right = Math.min(right, pr.right);
    }
  }
  top = Math.max(top, 0);
  bottom = Math.min(bottom, window.innerHeight);
  const need = Math.min(r.height, 140) - 2;
  if (bottom - top < need || right - left < 8) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}

/** Scroll the nearest scrolling ancestor (never an overflow-hidden frame) so the element sits in its middle. */
function scrollToCentre(el: HTMLElement) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) {
      const pr = p.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      p.scrollTop += r.top + r.height / 2 - (pr.top + pr.height / 2);
      return;
    }
  }
}

const byTour = (t: string) => [...document.querySelectorAll<HTMLElement>(`[data-tour="${t}"]`)];
/** In the DOM and laid out (inside a scroller counts, even if scrolled away). */
const laidOut = (t: string) => byTour(t).find((el) => el.offsetParent !== null);

interface Resolved {
  el: HTMLElement;
  /** The tag's text after "Next · ". */
  label: string;
  /** True when this is the action's own element, not a step on the way. */
  final: boolean;
}

/**
 * The first visible element on the way to the action's target:
 * the target itself, else a closed <details> around it, else its declared
 * `via` steps (innermost first), else a link on this page to the action's page.
 */
function resolve(a: ScriptAction): Resolved | null {
  const t = laidOut(a.target);
  if (t) return { el: t, label: a.label, final: true };
  /* Rendered but folded away: open the disclosure first. */
  for (const el of byTour(a.target)) {
    const details = el.closest('details:not([open])');
    const summary = details?.querySelector(':scope > summary') as HTMLElement | null;
    if (summary && summary.offsetParent !== null) return { el: summary, label: `Open ${summary.textContent?.trim().split('\n')[0].slice(0, 48) ?? 'this section'}`, final: false };
  }
  for (const v of [...(a.via ?? [])].reverse()) {
    const el = laidOut(v.target);
    if (!el) continue;
    const details = el.closest('details:not([open])');
    const summary = details?.querySelector(':scope > summary') as HTMLElement | null;
    if (summary && summary.offsetParent !== null) return { el: summary, label: `Open ${summary.textContent?.trim().slice(0, 48)}`, final: false };
    return { el, label: v.label, final: false };
  }
  /* Another page in the same app: a visible link that goes there. */
  const path = a.href.split('?')[0];
  const frame = document.getElementById('app-frame');
  const link = frame
    ? [...frame.querySelectorAll<HTMLAnchorElement>('a[href]')].find((l) => {
        const h = l.getAttribute('href') ?? '';
        return h.split('?')[0] === path && l.offsetParent !== null && !l.closest('[data-demo-chrome]');
      })
    : undefined;
  if (link && path !== window.location.pathname) return { el: link, label: a.label, final: false };
  return null;
}

/** Anchor a box of w × h next to rect r: below if it fits, else above; shifted to stay on screen. */
function anchor(r: DOMRect, w: number, h: number): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const above = r.bottom + 10 + h > vh && r.top - 10 - h > 0;
  const top = above ? r.top - 10 - h : Math.min(r.bottom + 10, vh - h - 8);
  const centre = r.left + r.width / 2;
  const left = Math.min(Math.max(8, centre - w / 2), vw - w - 8);
  return { top, left, above, arrowLeft: Math.min(Math.max(14, centre - left), w - 14) };
}

const samePos = (a: Pos | null, b: Pos | null) => a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.above === b.above && a.arrowLeft === b.arrowLeft);

export function CoachMark() {
  const g = useGuide();
  const pathname = usePathname();
  const hidden = useGuideUi((s) => s.hintsHidden);
  const dismissed = useGuideUi((s) => s.dismissedAction);
  const dismiss = useGuideUi((s) => s.dismissAction);
  const setOffscreen = useGuideUi((s) => s.setOffscreen);
  const [pos, setPos] = useState<Pos | null>(null);
  const [label, setLabel] = useState('');
  const action = g.target?.action;
  const sameApp = action ? appOf(action.href) === appOf(pathname) : false;
  /* Nothing is ringed on reading pages (the case, Sirion today…): the viewer reads first. */
  const active = Boolean(g.hydrated && action && !hidden && !isReadingPage(pathname, g.started));
  const actionId = active ? action!.id : undefined;
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  /* Count a press on any walkthrough element, so actions with no state of their own still tick. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const id = (e.target as HTMLElement | null)?.closest?.('[data-tour]')?.getAttribute('data-tour');
      if (id) useDemo.getState().markTour(id);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  /* Esc hides the tag for this action only. The ring stays. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && actionRef.current) dismiss(actionRef.current.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  /* Ring the first visible element on the way to the target, and follow it as panes re-render, resize and scroll. */
  useEffect(() => {
    const clear = () => document.querySelectorAll('.tour-target').forEach((el) => el.classList.remove('tour-target'));
    if (!actionId || !sameApp) {
      clear();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to anchor on this screen
      setPos(null);
      setOffscreen(actionId && !sameApp ? actionId : undefined);
      return;
    }
    let userScrolled: string | undefined;
    let frame = 0;
    const onUserScroll = () => {
      const a = actionRef.current;
      if (a) userScrolled = `${a.id}:true`;
    };
    const place = () => {
      frame = 0;
      const a = actionRef.current;
      if (!a) return;
      const found = resolve(a);
      document.querySelectorAll('.tour-target').forEach((el) => {
        if (el !== found?.el) el.classList.remove('tour-target');
      });
      if (!found) {
        setOffscreen(a.id);
        setPos((p) => (p === null ? p : null));
        return;
      }
      if (!found.el.classList.contains('tour-target')) found.el.classList.add('tour-target');
      /* Bring it into view, so the tag never points at something half hidden. Once the viewer
         scrolls by hand for this action, leave the scrolling to them. */
      const key = `${a.id}:${found.final}`;
      if (userScrolled !== key && !visibleRect(found.el)) scrollToCentre(found.el);
      const r = visibleRect(found.el);
      setOffscreen(r ? undefined : a.id);
      setLabel(found.label);
      if (!r) {
        setPos((p) => (p === null ? p : null));
        return;
      }
      const next = anchor(r, tagWidth(`Next · ${found.label}`), TIP_H);
      setPos((p) => (samePos(p, next) ? p : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(place);
    };
    place();
    const mo = new MutationObserver((records) => {
      /* Our own tag moving is not a reason to re-place. */
      if (records.every((r) => (r.target as HTMLElement).closest?.('[data-coach-root]'))) return;
      schedule();
    });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'hidden', 'aria-selected', 'aria-expanded', 'data-tour', 'disabled'] });
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    const appFrame = document.getElementById('app-frame');
    if (appFrame) ro.observe(appFrame);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('wheel', onUserScroll, { passive: true });
    window.addEventListener('touchmove', onUserScroll, { passive: true });
    /* A slow safety net for layout changes no observer reports (CSS transitions). */
    const id = window.setInterval(schedule, 800);
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchmove', onUserScroll);
      window.clearInterval(id);
      if (frame) window.cancelAnimationFrame(frame);
      clear();
    };
  }, [actionId, sameApp, pathname, setOffscreen]);

  const marker =
    g.hydrated && action ? (
      <span hidden data-guide-next={action.id} data-guide-target={action.target} data-guide-href={action.href} data-guide-active={active ? '1' : '0'} />
    ) : null;

  const showTag = active && pos && dismissed !== action!.id;
  return (
    <>
      {marker}
      {showTag &&
        createPortal(
          <div data-coach-root role="status" className="ds-scope pointer-events-none fixed" style={{ top: pos.top, left: pos.left, zIndex: Z_TAG }}>
            <div data-coach-label className="guide-solid guide-bob relative whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] font-semibold leading-[16px] text-white shadow-pop">
              Next · {label}
              <span aria-hidden className="guide-solid absolute h-2 w-2 rotate-45" style={{ left: pos.arrowLeft - 4, ...(pos.above ? { bottom: -4 } : { top: -4 }) }} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
