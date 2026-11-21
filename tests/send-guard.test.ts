/** The check at Send (sendGuard), the supplier emails, the row → email links and the headline explanation. */
import { describe, expect, it } from 'vitest';
import { extractClaims, rewriteFor, sendGuard } from '@/lib/engines/sendGuard';
import { explainHeadline } from '@/lib/engines/explain';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { isSupplierSafe } from '@/lib/engines/wording';
import { cloudDeskDeal, dealById, deals, messageById } from '@/lib/data';
import { initialLedger, ledgerAtStep, stepOne, stepTwoAfterLink, stepTwoBeforeLink } from '@/lib/demo/steps';
import { SUPPLIER_MAIL } from '@/lib/demo/supplierMail';
import { rowsForDeal, riskEmailForDeal } from '@/lib/demo/supplierInbox';
import { currentVersionId, outlookHrefForRow } from '@/lib/demo/rowEmail';
import { STEP_CLOCK } from '@/lib/demo/steps';
import { formatLakh } from '@/lib/format';

const deal = cloudDeskDeal;
const TO = ['rohan.iyer@clouddesk.example'];
const rows3 = ledgerAtStep(3);
const run = (body: string, rows = rows3, attachments: { fileName: string; versionId?: string }[] = []) =>
  sendGuard({ to: TO, cc: [], body, attachments, rows, deal, currentVersionId: 'v5' });

describe('send check: the five cases', () => {
  it('1 · reopens fixed pricing, with the CFO approval and the pane figure', () => {
    const r = run('Yearly price review is fine.');
    const f = r.findings[0];
    expect(f.case).toBe('reopen');
    expect(f.title).toBe('This reply would reopen fixed pricing.');
    expect(formatLakh(f.costLakhPerYr)).toBe('₹3.9 lakh');
    expect(f.costNote).toBe('₹11.8 lakh over the term');
    expect(f.affected).toBe("Neha Kapoor's CFO approval depends on this.");
    expect(f.quote).toBe('Yearly price review is fine.');
    expect(run('Sure, we can revisit pricing.').findings[0].case).toBe('reopen');
  });

  it('2 · gives away the reopened notice term, priced the same way as the pane', () => {
    const f = run('90 days notice works for us.').findings[0];
    expect(f.case).toBe('give_away');
    expect(formatLakh(f.costLakhPerYr)).toBe('₹1.1 lakh');
    expect(f.costNote).toContain('₹3.4 lakh at the next renewal');
    expect(f.fallback).toContain('60 days');
    expect(f.agreedText).toContain('v3');
  });

  it('3 · contradicts a credit still waiting for confirmation', () => {
    const pending = stepTwoAfterLink(stepTwoBeforeLink(stepOne(initialLedger()).rows).rows).rows;
    const f = run('5% credits is fine', pending).findings[0];
    expect(f.case).toBe('contradicts_pending');
    expect(formatLakh(f.costLakhPerYr)).toBe('₹50,000');
  });

  it('4 · an outdated attachment', () => {
    const f = run('Please see attached.', rows3, [{ fileName: 'CloudDesk_MSA_v4.docx', versionId: 'v4' }]).findings[0];
    expect(f.case).toBe('outdated_attachment');
    expect(f.title).toBe('This is v4. Current is v5 in Sirion.');
    expect(f.attachment?.currentFileName).toBe('CloudDesk_MSA_v5.docx');
  });

  it('5 · a reply consistent with the ledger sends with no warning', () => {
    const r = run("Confirming 30 days' notice for renewal and fixed pricing for the term.");
    expect(r.checked).toBe(true);
    expect(r.findings).toHaveLength(0);
    expect(r.consistent.map((c) => c.termKey).sort()).toEqual(['price', 'renewal_notice']);
  });

  it('internal-only email is never checked', () => {
    const r = sendGuard({ to: ['neha.kapoor@meridian.example'], cc: [], body: 'Yearly price review is fine.', attachments: [], rows: rows3, deal, currentVersionId: 'v5' });
    expect(r.checked).toBe(false);
    expect(r.findings).toHaveLength(0);
  });

  it('deferrals and refusals state nothing', () => {
    expect(extractClaims("Let's discuss pricing when Ananya is back.")).toHaveLength(0);
    expect(extractClaims('We cannot accept a yearly price revision.')).toHaveLength(0);
  });

  it('every suggested rewrite is supplier-safe and passes the check itself', () => {
    for (const row of rows3) {
      const text = rewriteFor(row);
      expect(isSupplierSafe(text)).toBe(true);
      expect(run(text).findings).toHaveLength(0);
    }
  });

  it('the uptime target is never read as a service credit', () => {
    const claims = extractClaims('The service credit is 10% of the monthly fee for any month below 99.5% uptime.');
    expect(claims).toEqual([expect.objectContaining({ termKey: 'service_credit', value: { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 } })]);
  });
});

describe('supplier emails in Outlook', () => {
  it('every quote is an exact substring of its source email', () => {
    for (const d of SUPPLIER_MAIL) {
      for (const row of d.rows) {
        expect(messageById(row.emailId)?.body).toContain(row.quote);
      }
    }
  });

  it('every listed deal has rows that match its counts on the Deals list, and an email to open', () => {
    for (const d of deals.filter((x) => !x.interactive)) {
      const rows = rowsForDeal(d.id);
      const counts = {
        agreed: rows.filter((r) => r.state === 'agreed').length,
        open: rows.filter((r) => r.state === 'open').length,
        needs: rows.filter((r) => r.state === 'needs_confirmation').length,
        reopened: rows.filter((r) => r.state === 'reopened' || r.state === 'missing_at_signing').length,
      };
      expect(counts, d.id).toEqual(dealById(d.id)!.display!.rows);
      expect(riskEmailForDeal(d.id), d.id).toBeTruthy();
    }
  });

  it('the TransitOne transit fee opens its email', () => {
    const row = rowsForDeal('D-TRANSITONE').find((r) => r.label === 'Transit fee')!;
    expect(messageById(row.outlookId!)?.body).toContain('transit fee');
  });

  it('no supplier email arrives after 14 Nov 09:30, so opening one never moves the demo clock', () => {
    for (const d of SUPPLIER_MAIL) for (const m of d.emails) expect(m.sentAt <= '2026-11-14T09:30:00+05:30').toBe(true);
  });
});

describe('Open in Outlook opens the email behind the risk', () => {
  it('maps each CloudDesk risk to its email', () => {
    const at1 = ledgerAtStep(1);
    expect(outlookHrefForRow(at1.find((r) => r.id === 'R-notice')!, deal)).toBe('/outlook/ananya?msg=M8');
    const at3 = ledgerAtStep(3);
    expect(outlookHrefForRow(at3.find((r) => r.id === 'R-price')!, deal)).toBe('/outlook/vikram?msg=M13');
    const pending = stepTwoAfterLink(stepTwoBeforeLink(stepOne(initialLedger()).rows).rows).rows;
    expect(outlookHrefForRow(pending.find((r) => r.id === 'R-credit')!, deal)).toBe('/outlook/ananya?msg=M12');
  });

  it('knows the current version on the demo clock', () => {
    expect(currentVersionId(STEP_CLOCK[1])).toBe('v4');
    expect(currentVersionId(STEP_CLOCK[3])).toBe('v5');
    expect(currentVersionId(STEP_CLOCK[4], '2026-11-19T10:00:00+05:30')).toBe('v7');
  });
});

describe('how the headline is calculated', () => {
  it('₹4.4 lakh at the start is ₹3.9 lakh (price) + ₹50,000 (service credit)', () => {
    const x = explainHeadline(initialLedger(), deal);
    expect(x.sumText).toBe('₹3.9 lakh + ₹50,000 = ₹4.4 lakh a year');
    expect(x.otherRisks.map((r) => r.label)).toContain('Approval');
  });

  it('lines always add up to the headline', () => {
    for (const step of [0, 1, 2, 3, 4] as const) {
      const rows = ledgerAtStep(step);
      const x = explainHeadline(rows, deal);
      expect(x.lines.reduce((s, l) => s + l.shareLakh, 0)).toBeCloseTo(dealAtRisk(rows, deal), 6);
    }
  });
});

describe('the Respond to round reply passes its own check', () => {
  it('a sentence quoting the supplier’s value and restating ours reads as ours', async () => {
    const { roundReply } = await import('@/lib/engines/replyCopy');
    const { versionById } = await import('@/lib/data');
    const body = roundReply({ rows: ledgerAtStep(1), prev: versionById('v4')!, attached: versionById('v5')!, roundMessageId: 'M8', deal, greeting: 'Rohan', signOff: 'Ananya' }).body;
    const r = sendGuard({ to: TO, cc: [], body, attachments: [{ fileName: 'CloudDesk_MSA_v5.docx', versionId: 'v5' }], rows: ledgerAtStep(1), deal, currentVersionId: 'v4' });
    expect(r.findings).toHaveLength(0);
  });
});
