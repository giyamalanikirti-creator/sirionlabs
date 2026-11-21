/**
 * What turning Word's Track Changes off would do, worked out from the file's
 * state. Pure: the Word mock shows these lines in the prompt before switching
 * off, and in the pane while edits are untracked.
 */
import { formatLakhPerYear } from '@/lib/format';

export interface TrackChangesInput {
  /** Agreed terms this copy still gets wrong, with their expected cost a year (lakh), if priced. */
  openGaps: { label: string; costLakhPerYr: number | null }[];
  /** Changes already marked in the file. */
  trackedCount: number;
  /** Edits already made with tracking off. */
  untrackedCount: number;
  /** The signing copy, about to go back to the supplier. */
  isSigningCopy: boolean;
  supplier: string;
}

export interface Consequence {
  tone: 'risk' | 'warn' | 'info';
  text: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The consequences of turning Track Changes off, most serious first. */
export function trackChangesOffConsequences(i: TrackChangesInput): Consequence[] {
  const out: Consequence[] = [
    {
      tone: 'warn',
      text: `Edits from now on change the text with no markup. ${i.supplier} won't see what changed or who changed it.`,
    },
  ];
  if (i.openGaps.length) {
    const priced = i.openGaps.filter((g) => g.costLakhPerYr !== null);
    const cost = priced.reduce((sum, g) => sum + (g.costLakhPerYr ?? 0), 0);
    out.unshift({
      tone: 'risk',
      text:
        `${plural(i.openGaps.length, 'agreed term')} still to fix here${priced.length ? ` (${formatLakhPerYear(cost)} if signed as is)` : ''}. ` +
        `Fixed without tracking, ${i.supplier} ${i.isSigningCopy ? 'may sign without reviewing them, and can later say they were never shown' : 'may miss them in their review'}.`,
    });
  }
  if (i.trackedCount) out.push({ tone: 'info', text: `${plural(i.trackedCount, 'change')} already marked stay marked.` });
  out.push({ tone: 'info', text: 'Deal Ledger still checks the text against what was agreed, so the signing check is not affected.' });
  return out;
}

/** The one-line warning shown while the file has untracked edits. */
export function untrackedWarning(untrackedCount: number, supplier: string): string | null {
  if (!untrackedCount) return null;
  return `${plural(untrackedCount, 'edit')} ${untrackedCount === 1 ? 'is' : 'are'} not tracked. ${supplier} will see the new wording with no markup, so ${untrackedCount === 1 ? 'it' : 'they'} may go unreviewed. Say so in your email, or undo and redo with Track Changes on.`;
}
