/** How email and Word get connected: setup state, tracking, people, the M1 counts and Word fingerprinting. */
import { describe, expect, it } from 'vitest';
import { useDemo } from '@/lib/store';
import { closestVersion } from '@/lib/engines/fingerprint';
import { readByRules } from '@/lib/engines/previewRules';
import { messageById, versionById, versions } from '@/lib/data';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { cloudDeskDeal } from '@/lib/data';

const s = () => useDemo.getState();

describe('org setup', () => {
  it('starts not connected (connecting is walkthrough step 1), can be completed, reset and replayed', () => {
    s().reset();
    expect(s().setup).toMatchObject({ enabled: false, consented: false, group: false, deployed: false });
    s().updateSetup({ enabled: true, consented: true, group: true, deployed: true });
    expect(s().setup.deployed).toBe(true);
    s().resetSetup();
    expect(s().setup).toMatchObject({ enabled: false, consented: false, group: false, deployed: false });
    expect(s().firstRunSeen).toBe(false);
    s().updateSetup({ enabled: true, consented: true, group: true, deployed: true });
    expect(s().setup.deployed).toBe(true);
  });
});

describe('tracking a negotiation', () => {
  it('Track adds the deal and the people, and turns their mailbox on for this deal', () => {
    s().reset();
    s().updateSettings({ mailboxes: { ...s().settings.mailboxes, vikram: false } });
    s().stopTracking('D-CLOUDDESK');
    expect(s().trackedDealIds).not.toContain('D-CLOUDDESK');
    s().trackDeal('D-CLOUDDESK', ['vikram']);
    s().addPersonToDeal('D-CLOUDDESK', 'vikram');
    expect(s().trackedDealIds).toContain('D-CLOUDDESK');
    expect(s().dealPeople['D-CLOUDDESK']).toContain('vikram');
    expect(s().settings.mailboxes.vikram).toBe(true);
  });

  it('stopping keeps the ledger', () => {
    s().advanceTo(1);
    const before = dealAtRisk(s().ledger, cloudDeskDeal);
    s().stopTracking('D-CLOUDDESK');
    expect(dealAtRisk(s().ledger, cloudDeskDeal)).toBeCloseTo(before, 6);
  });

  it('the prequel toast uses real counts: 1 email, and the terms the rules reader finds in M1', () => {
    const terms = readByRules(messageById('M1')!.body);
    expect(terms.map((t) => t.termKey).sort()).toEqual(['payment', 'price']);
  });
});

describe('Word recognises a file without the Sirion tag', () => {
  it('compares clause text with the versions Sirion held before the file arrived', () => {
    const m = closestVersion(versionById('v6')!, versions)!;
    expect(m.versionId).toBe('v4');
    expect(m.same).toBe(15);
    expect(m.total).toBe(17);
  });
  it('the first version has nothing to compare with, so Word offers search instead', () => {
    expect(closestVersion(versionById('v1')!, versions)).toBeNull();
  });
});
