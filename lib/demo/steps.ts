/**
 * The demo's five moments, expressed as pure ledger transitions.
 * The Zustand store and the golden-number tests both run through here, so the
 * numbers on screen and the numbers in tests cannot drift apart.
 * BUILD_SPEC §11 and §15.
 */
import type { LedgerRow, ReaderResult, ReaderUpdate, TermValue } from '@/lib/types';
import {
  cloudDeskDeal,
  ledgerInitial,
  messages,
  OUR_PERSON_IDS,
  SUPPLIER_PERSON_IDS,
  versionById,
} from '@/lib/data';
import { applyReaderUpdates, applyVersionChanges, confirmRow } from '@/lib/engines/ledger';
import { diffVersions, extractValue, lastOwnVersion } from '@/lib/engines/diff';
import { versions } from '@/lib/data';

import readerM8 from '@/data/fixtures/reader_M8.json';
import readerM12 from '@/data/fixtures/reader_M12.json';
import readerT2 from '@/data/fixtures/reader_T2.json';
import readerM13 from '@/data/fixtures/reader_M13.json';
import readerM14 from '@/data/fixtures/reader_M14.json';
import { deepShift, sh, shiftText } from '@/lib/demo/timeShift';

export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const STEP_CLOCK: Record<Step, string> = {
  0: sh('2026-11-14T10:00:00+05:30'),
  1: sh('2026-11-14T10:05:00+05:30'),
  2: sh('2026-11-16T17:45:00+05:30'),
  3: sh('2026-11-18T10:50:00+05:30'),
  4: sh('2026-11-19T09:30:00+05:30'),
  5: sh('2026-11-21T12:00:00+05:30'),
  6: sh('2027-12-05T10:00:00+05:30'),
};

export const STEP_TITLES: Record<Step, string> = {
  0: 'Where the deal stands',
  1: 'A supplier email is read as a round',
  2: 'A side thread is pulled into the same deal',
  3: 'Warning at Send',
  4: 'Signing check',
  5: 'Handover to Sirion',
  6: 'An invoice that does not match',
};

export const FIXTURES = deepShift({
  M8: readerM8 as unknown as Omit<ReaderResult, 'source'>,
  M12: readerM12 as unknown as Omit<ReaderResult, 'source'>,
  T2: readerT2 as unknown as Omit<ReaderResult, 'source'>,
  M13: readerM13 as unknown as Omit<ReaderResult, 'source'>,
  M14: readerM14 as unknown as Omit<ReaderResult, 'source'>,
});

const applyOpts = {
  supplierOrgPersonIds: SUPPLIER_PERSON_IDS,
  ourPersonIds: OUR_PERSON_IDS,
};

export function initialLedger(): LedgerRow[] {
  return JSON.parse(JSON.stringify(ledgerInitial)) as LedgerRow[];
}

/** Apply a set of reader updates plus, optionally, the attached version diff. */
export function applyReaderResult(
  rows: LedgerRow[],
  updates: ReaderUpdate[],
  versionId?: string,
): { rows: LedgerRow[]; events: string[] } {
  const res = applyReaderUpdates(rows, updates, messages, applyOpts);
  let next = res.rows;
  const events = [...res.events];

  if (versionId) {
    const version = versionById(versionId);
    const prev = version ? lastOwnVersion(versions, version.sentAt) : null;
    if (version && prev) {
      const changes = diffVersions(prev, version);
      const applied = applyVersionChanges(next, changes, version, (ch) =>
        extractValue({ no: ch.clauseNo, title: '', text: ch.after, termKey: ch.termKey }),
      );
      next = applied.rows;
      events.push(...applied.events);
    }
  }

  return { rows: next, events };
}

/* ---- The moments ---- */

/** Moment 1: round 4 read from M8 and the v4 diff. */
export function stepOne(rows: LedgerRow[]) {
  return applyReaderResult(rows, FIXTURES.M8.updates, 'v4');
}

/** Moment 2a: M12 read before the side thread is linked. */
export function stepTwoBeforeLink(rows: LedgerRow[]) {
  return applyReaderResult(rows, FIXTURES.M12.updates);
}

/** Moment 2b: the side thread is linked and everything re-read. */
export function stepTwoAfterLink(rows: LedgerRow[]) {
  return applyReaderResult(rows, FIXTURES.T2.updates);
}

/** Moment 2c: the lead confirms the value. */
export function stepTwoConfirm(
  rows: LedgerRow[],
  value: TermValue = { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 },
  note = shiftText('Confirmed with Rohan by phone, 16 Nov'),
) {
  return confirmRow(rows, 'R-credit', value, {
    note,
    at: STEP_CLOCK[2],
    byPersonId: 'ananya',
  });
}

/** Moment 3 arrives: M13 reopens the price as a new ask. */
export function stepThree(rows: LedgerRow[]) {
  return applyReaderResult(rows, FIXTURES.M13.updates);
}

/** Moment 4 arrives: M14 claims everything is accepted. The copy is checked. */
export function stepFour(rows: LedgerRow[]) {
  return applyReaderResult(rows, FIXTURES.M14.updates);
}

/**
 * The ledger as it stands at the start of a given step, with no AI calls.
 * This is what the demo guide's "Go" button replays.
 */
export function ledgerAtStep(step: Step): LedgerRow[] {
  let rows = initialLedger();
  if (step >= 1) rows = stepOne(rows).rows;
  if (step >= 2) {
    rows = stepTwoBeforeLink(rows).rows;
    rows = stepTwoAfterLink(rows).rows;
    rows = stepTwoConfirm(rows);
  }
  if (step >= 3) rows = stepThree(rows).rows;
  if (step >= 4) rows = stepFour(rows).rows;
  return rows;
}

export const demoDeal = cloudDeskDeal;
