/** Review fix C9: never file on the supplier domain alone when two agreements match; re-opening never adds a version. */
import { afterAll, describe, expect, it, vi } from 'vitest';
import { CLOUDDESK_AGREEMENTS, fileDecision } from '@/lib/engines/filing';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
const { useDemo } = await import('@/lib/store');
afterAll(() => vi.unstubAllGlobals());

describe('filing', () => {
  it('one open CloudDesk agreement: files automatically', () => {
    expect(fileDecision('rohan.iyer@clouddesk.example', CLOUDDESK_AGREEMENTS.slice(0, 1))).toMatchObject({ kind: 'auto', reason: 'only_match' });
  });
  it('two open CloudDesk agreements, domain only: asks the user to choose', () => {
    const d = fileDecision('rohan.iyer@clouddesk.example', CLOUDDESK_AGREEMENTS);
    expect(d.kind).toBe('choose');
    if (d.kind === 'choose') expect(d.options.map((o) => o.contractId)).toEqual(['C-2026-0417', 'C-2026-0388']);
  });
  it('a Deal ID inside the file decides even with two', () => {
    expect(fileDecision('rohan.iyer@clouddesk.example', CLOUDDESK_AGREEMENTS, { dealIdTag: 'DL-CLOUDDESK-2026' })).toMatchObject({ kind: 'auto', reason: 'deal_id' });
  });
  it('opening the same attachment again leads to v4, not a new version', () => {
    useDemo.getState().reset();
    useDemo.getState().syncVersion('v4');
    useDemo.getState().syncVersion('v4');
    expect(useDemo.getState().syncedVersionIds.filter((id) => id === 'v4')).toHaveLength(1);
  });
});
