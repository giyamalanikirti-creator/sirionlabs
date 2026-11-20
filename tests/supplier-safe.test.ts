/** BUILD_SPEC §2 and §8.6 — nothing the supplier sees may leak internals. */
import { describe, expect, it } from 'vitest';
import {
  HOLDING_REPLY,
  RESTORE_NOTICE_DRAFT,
  RESPOND_ROUND_DRAFT,
  CLARIFY_DRAFT,
  agreedWording,
  isSupplierSafe,
  supplierSafetyReason,
} from '@/lib/engines/wording';
import { ledgerInitial, versionById, cloudDeskDeal } from '@/lib/data';
import { ledgerAtStep } from '@/lib/demo/steps';
import { signingCheck } from '@/lib/engines/signing';

describe('supplier notes', () => {
  for (const row of ledgerInitial) {
    it(`${row.label} note is supplier-safe`, () => {
      expect(supplierSafetyReason(row.supplierNote)).toBeNull();
    });
  }
});

describe('agreed wording inserted into the signing copy', () => {
  const rows = ledgerAtStep(4);
  for (const row of rows) {
    it(`${row.label} wording is supplier-safe`, () => {
      const text = agreedWording(row.termKey, row.position);
      expect(supplierSafetyReason(text)).toBeNull();
    });
  }

  it('uses INR rather than a rupee sign in clause text', () => {
    const text = agreedWording('price', { kind: 'price', wording: 'fixed' });
    expect(text).toContain('INR 12,000');
    expect(text).not.toContain('₹');
  });
});

describe('drafts we offer to send', () => {
  it('the holding reply is supplier-safe', () => {
    expect(supplierSafetyReason(HOLDING_REPLY)).toBeNull();
  });

  it('the restore-notice draft is supplier-safe', () => {
    expect(supplierSafetyReason(RESTORE_NOTICE_DRAFT)).toBeNull();
    expect(supplierSafetyReason(RESPOND_ROUND_DRAFT)).toBeNull();
    expect(supplierSafetyReason(CLARIFY_DRAFT)).toBeNull();
  });
});

describe('the check itself', () => {
  const unsafe: [string, string][] = [
    ['This is worth ₹3.4 lakh a year to us.', 'money'],
    ['That is about 3 lakh over the term.', 'lakh'],
    ['Rs 25,000 a year.', 'Rs'],
    ['Neha Kapoor approved this.', 'name'],
    ['This was approved internally.', 'approved'],
    ['It is above my limit.', 'limit'],
    ['Per our internal policy.', 'internal'],
  ];
  for (const [text, why] of unsafe) {
    it(`rejects ${why}`, () => {
      expect(isSupplierSafe(text)).toBe(false);
    });
  }

  it('allows ordinary supplier-facing sentences', () => {
    expect(isSupplierSafe('Reflects the 30-day notice in your drafts of 1 Nov.')).toBe(true);
    expect(isSupplierSafe('Thanks Rohan, the signing copy looks close.')).toBe(true);
  });

  it('does not trip over "limitation of liability"', () => {
    expect(isSupplierSafe('See the limitation of liability in clause 12.1.')).toBe(true);
  });
});

describe('Word comments built from the signing check', () => {
  const rows = ledgerAtStep(4);
  const result = signingCheck(rows, versionById('v6')!, cloudDeskDeal);

  it('every gap carries a supplier-safe note for the comment card', () => {
    for (const gap of result.gaps) {
      const row = rows.find((r) => r.id === gap.rowId)!;
      expect(supplierSafetyReason(row.supplierNote)).toBeNull();
    }
  });

  it('the internal gap note is never shown to the supplier', () => {
    // "Neha Kapoor's approval depends on this" is for us, not for the comment.
    expect(isSupplierSafe(result.gaps[0].note!)).toBe(false);
  });
});
