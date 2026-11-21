'use client';

/**
 * The in-app coach mark: the element for the next action pulses in the guide
 * colour, with a small anchored tooltip ("Step 1 · Compare clause 14.2") that
 * flips above or below and shifts sideways so it never covers its target.
 * One at a time. Gone when the action is done, on Esc, or with "Hide hints".
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDemo } from '@/lib/store';
import { useGuideUi } from '@/lib/guideUi';
import { useGuide, visibleTarget } from './useGuide';

interface Pos {
  top: number;
  left: number;
  above: boolean;
  arrowLeft: number;
}

const TIP_W = 240;
const TIP_H = 44;

/** The part of the element's box not cut off by scrolling ancestors or the window, or null if none shows. */
function visibleRect(el: HTMLElement, strict = false): DOMRect | null {
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
  /* Strict: most of the element must show (used to decide whether to scroll it into view). */
  const need = strict ? Math.min(r.height, 60) - 2 : 8;
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

export function CoachMark() {
  const g = useGuide();
  const hidden = useGuideUi((s) => s.hintsHidden);
  const dismissed = useGuideUi((s) => s.dismissedAction);
  const dismiss = useGuideUi((s) => s.dismissAction);
  const [pos, setPos] = useState<Pos | null>(null);
  const action = g.next?.action;
  const active = Boolean(g.hydrated && action && !hidden && dismissed !== action.id);
  const target = active ? action!.target : undefined;

  /* Count a press on any walkthrough element, so actions with no state of their own still tick. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const id = (e.target as HTMLElement | null)?.closest?.('[data-tour]')?.getAttribute('data-tour');
      if (id) useDemo.getState().markTour(id);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && action) dismiss(action.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [action, dismiss]);

  /* Pulse the target and keep the tooltip anchored as panes open and pages scroll. */
  useEffect(() => {
    const clear = () => document.querySelectorAll('.tour-target').forEach((el) => el.classList.remove('tour-target'));
    if (!target) {
      clear();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no target: nothing to anchor
      setPos(null);
      return;
    }
    let scrolled = false;
    const place = () => {
      document.querySelectorAll('.tour-target').forEach((el) => {
        if (el.getAttribute('data-tour') !== target) el.classList.remove('tour-target');
      });
      const el = visibleTarget(target);
      if (!el) {
        setPos(null);
        return;
      }
      el.classList.add('tour-target');
      /* Bring the next button into view once, so the hint is never pointing at something half hidden. */
      if (!scrolled && !visibleRect(el, true)) scrollToCentre(el);
      scrolled = true;
      const r = visibleRect(el);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!r) {
        setPos(null);
        return;
      }
      /* Something on top (the AskSirion panel, a drawer): no hint pointing at a hidden button. */
      const onTop = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (onTop && !el.contains(onTop) && !onTop.contains(el)) {
        setPos(null);
        return;
      }
      const above = r.bottom + 10 + TIP_H > vh;
      const top = above ? r.top - 10 - TIP_H : r.bottom + 10;
      const centre = r.left + r.width / 2;
      const left = Math.min(Math.max(8, centre - TIP_W / 2), vw - TIP_W - 8);
      setPos({ top, left, above, arrowLeft: Math.min(Math.max(12, centre - left), TIP_W - 12) });
    };
    place();
    const id = window.setInterval(place, 250);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      clear();
    };
  }, [target]);

  if (!active || !pos || typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="status"
      className="ds-scope pointer-events-none fixed z-[250]"
      style={{ top: pos.top, left: pos.left, width: TIP_W }}
    >
      <div className="relative rounded-lg bg-guide-600 px-3 py-2 text-[12px] font-semibold leading-[16px] text-white shadow-pop">
        Step {g.next!.step === 6 ? 'after signing' : g.next!.step} · {action!.label}
        <span className="block text-[11px] font-normal text-white/80">Press here · Esc to hide</span>
        <span
          aria-hidden
          className="absolute h-2.5 w-2.5 rotate-45 bg-guide-600"
          style={{ left: pos.arrowLeft - 5, ...(pos.above ? { bottom: -5 } : { top: -5 }) }}
        />
      </div>
    </div>,
    document.body,
  );
}
