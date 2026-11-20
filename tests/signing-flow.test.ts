import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});
const { useDemo } = await import('@/lib/store');
afterAll(() => vi.unstubAllGlobals());

describe('signing workflow', () => {
  beforeEach(() => {
    useDemo.getState().advanceTo(4);
    useDemo.getState().runSigningCheck();
  });

  it('keeps unresolved terms when opening handover with only one correction', () => {
    useDemo.getState().insertWording('R-price');
    useDemo.getState().startStage(5, true);
    useDemo.getState().sendBack();
    useDemo.getState().sign();

    const state = useDemo.getState();
    expect(state.signing.inserted).toEqual(['price']);
    expect(state.ledger.filter((row) => row.signing === 'gap')).toHaveLength(2);
    expect(state.signing.sentBackAt).toBeUndefined();
    expect(state.signedAt).toBeUndefined();
  });

  it('verifies the copy submitted to CloudDesk before signing', () => {
    useDemo.getState().insertAll();
    useDemo.getState().sendBack();
    const submitted = useDemo.getState().signing.submittedCopy;
    expect(submitted?.id).toBe('v7');

    useDemo.getState().sign();
    const state = useDemo.getState();
    expect(state.signing.returnedCopy?.clauses).toEqual(submitted?.clauses);
    expect(state.ledger.filter((row) => row.signing === 'match')).toHaveLength(7);
  });
});
