/** BUILD_SPEC §8.5 — header-first matching. */
import { describe, expect, it } from 'vitest';
import { matchThread, matchAllThreads, toHeader } from '@/lib/engines/matcher';
import { deals, messages, versions } from '@/lib/data';

const headers = messages.map(toHeader);
const matches = matchAllThreads(headers, deals, versions);

describe('thread scores', () => {
  const expected: Record<string, number> = {
    T1: 1.0,
    T2: 0.5,
    T3: 0.7,
    T4: 0.7,
    D1: 0,
    D2: 0,
    D4: 0,
  };

  for (const [threadId, score] of Object.entries(expected)) {
    it(`${threadId} scores ${score}`, () => {
      expect(matches[threadId].score).toBeCloseTo(score, 5);
    });
  }

  it('T1 is a strong match to CloudDesk on all four signals', () => {
    const m = matches.T1;
    expect(m.dealId).toBe('D-CLOUDDESK');
    expect(m.strength).toBe('strong');
    expect(m.signals).toMatchObject({
      supplierDomain: true,
      fingerprint: true,
      dealIdTag: true,
      subjectName: true,
    });
  });

  it('T2 is weak, so its bodies are not read until the lead links it', () => {
    expect(matches.T2.strength).toBe('weak');
    expect(matches.T2.signals.fingerprint).toBe(false);
    expect(matches.T2.signals.dealIdTag).toBe(false);
  });

  it('T3 and T4 reach the deal through the capture address', () => {
    for (const id of ['T3', 'T4']) {
      expect(matches[id].dealId).toBe('D-CLOUDDESK');
      expect(matches[id].strength).toBe('strong');
      expect(matches[id].signals.captureAddress).toBe(true);
      expect(matches[id].signals.supplierDomain).toBe(false);
    }
  });

  it('D3 is a strong match to the SwiftShip deal, not to CloudDesk', () => {
    expect(matches.D3.dealId).toBe('D-SWIFTSHIP');
    expect(matches.D3.strength).toBe('strong');
  });

  it('D1, D2 and D4 match nothing', () => {
    for (const id of ['D1', 'D2', 'D4']) {
      expect(matches[id].strength).toBe('none');
      expect(matches[id].dealId).toBeUndefined();
    }
  });

  it('ByteKart is not an active deal, so its quote never matches', () => {
    expect(matches.D2.signals.supplierDomain).toBe(false);
  });
});

describe('what the matcher can see', () => {
  it('scores a thread from headers alone', () => {
    const t1 = headers.filter((h) => h.threadId === 'T1');
    const result = matchThread(t1, deals, versions);
    expect(result.score).toBe(1);
    // The header type carries no body field at all.
    expect(Object.keys(t1[0])).not.toContain('body');
  });

  it('an internal thread with no deals@ and no supplier name scores zero', () => {
    const d4 = headers.filter((h) => h.threadId === 'D4');
    expect(matchThread(d4, deals, versions).score).toBe(0);
  });
});
