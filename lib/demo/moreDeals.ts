/**
 * Two more scripted deals, each showing a different pattern from CloudDesk.
 *
 * BrightStaff: a markup cap agreed in email by the HR head, but the rate card
 * table in the signing copy says something else; after signing, a timesheet
 * invoice overbills.
 *
 * SwiftShip: a new deal that starts from an email (no contract yet). A fuel
 * surcharge is agreed partly on a call and partly in email, and the supplier
 * sends a PDF quote rather than a Word file.
 *
 * Text lives here; every ₹ figure is computed by lib/engines/otherTerms.ts.
 */
import type { EmailMessage } from '@/lib/types';
import { fuelSurchargeGap, markupGap } from '@/lib/engines/otherTerms';

export interface ScriptedEmail {
  id: string;
  from: string;
  fromName: string;
  to: string;
  at: string;
  subject: string;
  body: string;
  side?: boolean;
  attachment?: string;
}

export interface ScriptedTurn {
  round: number;
  side: 'theirs' | 'ours';
  file: string;
  format: 'Word' | 'PDF';
  at: string;
  emailId: string;
  note: string;
}

export interface ScriptedRow {
  id: string;
  label: string;
  agreed: string;
  state: 'agreed' | 'open' | 'needs_confirmation' | 'missing_at_signing';
  sourceEmailId?: string;
  sourceQuote?: string;
  sourceNote?: string;
  /** The email Outlook should open for this row, when it is not the source itself (e.g. a side thread Ananya never saw). */
  outlookEmailId?: string;
  fileSays?: string;
  costLakhPerYr?: number;
  proof?: string[];
  move?: { ask: string; fallback?: string; leverage?: string };
}

export interface ScriptedDeal {
  dealId: string;
  supplier: string;
  pattern: string;
  patternDetail: string;
  ownerId: string;
  emails: ScriptedEmail[];
  turns: ScriptedTurn[];
  rows: ScriptedRow[];
  afterSigning?: { title: string; lines: string[]; overbillInr: number };
  intake?: { fields: { label: string; value: string; from: string }[] };
}

/* ---------------- BrightStaff ---------------- */

const BRIGHTSTAFF_VALUE_INR = 8_500_000;
export const brightStaffGap = markupGap(BRIGHTSTAFF_VALUE_INR, 8, 10);

export const BRIGHTSTAFF: ScriptedDeal = {
  dealId: 'D-BRIGHTSTAFF',
  supplier: 'BrightStaff Services',
  ownerId: 'karan',
  pattern: 'A rate card table that disagrees with the email',
  patternDetail:
    'The 8% markup cap was agreed in email by the HR head, outside procurement. The signing copy keeps the clause text but the rate card table still says 10%.',
  emails: [
    { id: 'B1', from: 'sunita.rao@brightstaff.example', fromName: 'Sunita Rao (BrightStaff)', to: 'Karan Malhotra', at: '2026-11-02T11:00:00+05:30', subject: 'BrightStaff contractor agreement 2026–28', body: 'Attached is our draft for the contractor agreement. Rate card in Schedule 2. Sunita', attachment: 'BrightStaff_MSA_v1.docx' },
    { id: 'B2', from: 'karan.malhotra@meridian.example', fromName: 'Karan Malhotra', to: 'Sunita Rao', at: '2026-11-05T15:20:00+05:30', subject: 'RE: BrightStaff contractor agreement 2026–28', body: 'Thanks Sunita. We need the markup capped at 8% over pass-through pay. Revised draft attached. Karan', attachment: 'BrightStaff_MSA_v2.docx' },
    { id: 'B3', from: 'sunita.rao@brightstaff.example', fromName: 'Sunita Rao (BrightStaff)', to: 'Deepa Menon (HR head)', at: '2026-11-07T10:15:00+05:30', subject: 'Contractor onboarding for January', body: 'Deepa, to start the January batch on time, can we close the markup at 9%? Sunita', side: true },
    { id: 'B4', from: 'deepa.menon@meridian.example', fromName: 'Deepa Menon (HR head)', to: 'Sunita Rao', at: '2026-11-07T12:40:00+05:30', subject: 'RE: Contractor onboarding for January', body: 'We can go with the 8% markup cap that Karan sent, and we will confirm the January batch this week. Deepa', side: true },
    { id: 'B5', from: 'sunita.rao@brightstaff.example', fromName: 'Sunita Rao (BrightStaff)', to: 'Karan Malhotra', at: '2026-11-13T17:10:00+05:30', subject: 'BrightStaff signing copy', body: 'Signing copy attached with the 8% cap in clause 6. Please sign by 30 Nov. Sunita', attachment: 'BrightStaff_MSA_v3.docx' },
  ],
  turns: [
    { round: 1, side: 'theirs', file: 'BrightStaff_MSA_v1.docx', format: 'Word', at: '2026-11-02T11:00:00+05:30', emailId: 'B1', note: 'Markup 12% in clause 6 and the rate card.' },
    { round: 2, side: 'ours', file: 'BrightStaff_MSA_v2.docx', format: 'Word', at: '2026-11-05T15:20:00+05:30', emailId: 'B2', note: 'Markup capped at 8% in clause 6 and the rate card.' },
    { round: 3, side: 'theirs', file: 'BrightStaff_MSA_v3.docx', format: 'Word', at: '2026-11-13T17:10:00+05:30', emailId: 'B5', note: 'Clause 6 says 8%. Rate card table, row “Markup on pay”, says 10%.' },
  ],
  rows: [
    { id: 'B-term', label: 'Term', agreed: '2 years from 15 Dec 2026', state: 'agreed', sourceEmailId: 'B2', sourceNote: 'In v2, unchanged since' },
    {
      id: 'B-markup',
      label: 'Markup cap',
      agreed: '8% over pass-through pay',
      state: 'missing_at_signing',
      sourceEmailId: 'B4',
      sourceQuote: 'We can go with the 8% markup cap that Karan sent',
      outlookEmailId: 'B5',
      fileSays: 'Clause 6: 8%. Rate card table: 10%',
      costLakhPerYr: brightStaffGap.costLakhPerYr,
      proof: brightStaffGap.proof,
      move: {
        ask: 'Ask BrightStaff to correct the rate card to 8% before signing.',
        fallback: '9% from year 2 only, which their own email asked for.',
        leverage: 'Their HR contact confirmed 8% in writing on 7 Nov, and clause 6 already says 8%.',
      },
    },
    { id: 'B-payment', label: 'Payment terms', agreed: '30 days from timesheet approval', state: 'agreed', sourceEmailId: 'B2', sourceNote: 'In v2, unchanged since' },
    { id: 'B-replacement', label: 'Replacement', agreed: 'Free replacement within 10 working days', state: 'agreed', sourceEmailId: 'B2', sourceNote: 'In v2, unchanged since' },
  ],
  afterSigning: {
    title: 'January timesheet invoice, if the rate card is signed as is',
    overbillInr: brightStaffGap.perMonthInr,
    lines: [
      'Invoice INV-BS-0127 bills pass-through pay at the rate card markup of 10%.',
      'The ledger records 8%, agreed by email on 7 Nov. Sirion’s invoice reconciliation flags the difference every month.',
    ],
  },
};

/* ---------------- SwiftShip ---------------- */

const SWIFTSHIP_FREIGHT_INR = 3_600_000;
/** Average retail diesel price, ₹ a litre, Jun–Nov 2026 (demo data). */
export const DIESEL_BY_MONTH = [93.4, 94.1, 92.8, 93.6, 94.5, 95.0];
export const swiftShipGap = fuelSurchargeGap(SWIFTSHIP_FREIGHT_INR, 0.5, 92, 88, DIESEL_BY_MONTH);

export const SWIFTSHIP_MESSAGES: EmailMessage[] = [
  {
    id: 'S1',
    threadId: 'TS1',
    from: 'imran.khan@swiftship.example',
    to: ['ananya.rao@meridian.example'],
    cc: [],
    subject: 'SwiftShip: outbound freight for Meridian, 2027–28',
    sentAt: '2026-11-11T16:30:00+05:30',
    attachments: [],
    body: 'Hi Ananya, good speaking today. As discussed, the fuel surcharge would start only when diesel is above ₹92 a litre, at 0.5% of freight for each ₹1 above that. Formal quote to follow. Imran',
    mailboxes: ['ananya'],
  },
  {
    id: 'S2',
    threadId: 'TS1',
    from: 'imran.khan@swiftship.example',
    to: ['ananya.rao@meridian.example'],
    cc: [],
    subject: 'RE: SwiftShip: outbound freight for Meridian, 2027–28',
    sentAt: '2026-11-12T11:05:00+05:30',
    attachments: [{ fileName: 'SwiftShip_Quote_Meridian.pdf', sizeKb: 212, fingerprint: 'fp-ss-quote' }],
    body: 'Please find our quote attached: ₹36 lakh a year for outbound freight, two-year term, payment in 45 days. Imran',
    mailboxes: ['ananya'],
  },
];

export const SWIFTSHIP: ScriptedDeal = {
  dealId: 'D-SWIFTSHIP',
  supplier: 'SwiftShip Logistics',
  ownerId: 'ananya',
  pattern: 'A new deal that starts from an email, with a PDF quote',
  patternDetail:
    'There is no contract in Sirion yet. The fuel surcharge was agreed partly on a call and confirmed in email; the PDF quote uses a lower diesel threshold. “Start deal from this email” fills in the intake from the email and the PDF.',
  emails: [
    { id: 'S1', from: 'imran.khan@swiftship.example', fromName: 'Imran Khan (SwiftShip)', to: 'Ananya Rao', at: '2026-11-11T16:30:00+05:30', subject: SWIFTSHIP_MESSAGES[0].subject, body: SWIFTSHIP_MESSAGES[0].body },
    { id: 'S2', from: 'imran.khan@swiftship.example', fromName: 'Imran Khan (SwiftShip)', to: 'Ananya Rao', at: '2026-11-12T11:05:00+05:30', subject: SWIFTSHIP_MESSAGES[1].subject, body: SWIFTSHIP_MESSAGES[1].body, attachment: 'SwiftShip_Quote_Meridian.pdf' },
    { id: 'S3', from: 'vikram.shah@meridian.example', fromName: 'Vikram Shah', to: 'Imran Khan', at: '2026-11-13T09:20:00+05:30', subject: 'Warehouse slots for January', body: 'Imran, the January volumes look fine. Whatever surcharge you and Ananya settle is OK with us. Vikram', side: true },
    { id: 'S4', from: 'ananya.rao@meridian.example', fromName: 'Ananya Rao', to: 'Imran Khan', at: '2026-11-13T14:00:00+05:30', subject: 'RE: SwiftShip: outbound freight for Meridian, 2027–28', body: 'Thanks Imran. Your quote has the surcharge starting at ₹88 a litre; on the call and in your email of 11 Nov it was ₹92. Our draft with ₹92 is attached. Ananya', attachment: 'SwiftShip_Agreement_v2.docx' },
  ],
  turns: [
    { round: 1, side: 'theirs', file: 'SwiftShip_Quote_Meridian.pdf', format: 'PDF', at: '2026-11-12T11:05:00+05:30', emailId: 'S2', note: 'Read from the PDF: fuel surcharge above ₹88 a litre.' },
    { round: 2, side: 'ours', file: 'SwiftShip_Agreement_v2.docx', format: 'Word', at: '2026-11-13T14:00:00+05:30', emailId: 'S4', note: 'Surcharge threshold set to the agreed ₹92 a litre.' },
  ],
  rows: [
    {
      id: 'S-fuel',
      label: 'Fuel surcharge',
      agreed: '0.5% of freight per ₹1 above ₹92 a litre',
      state: 'open',
      sourceEmailId: 'S1',
      sourceQuote: 'the fuel surcharge would start only when diesel is above ₹92 a litre, at 0.5% of freight for each ₹1 above that',
      sourceNote: 'Agreed on a call on 11 Nov, confirmed in Imran’s email the same day',
      fileSays: 'PDF quote: above ₹88 a litre',
      costLakhPerYr: swiftShipGap.costLakhPerYr,
      proof: swiftShipGap.proof,
      move: {
        ask: 'Hold the ₹92 threshold from Imran’s own email.',
        fallback: '₹90 a litre, if they cap the surcharge at 3% of freight.',
        leverage: 'The ₹92 figure is in SwiftShip’s own writing; the quote changed it without saying so.',
      },
    },
    { id: 'S-price', label: 'Freight price', agreed: '₹36 lakh a year', state: 'agreed', sourceEmailId: 'S2', sourceQuote: '₹36 lakh a year for outbound freight' },
    { id: 'S-term', label: 'Term', agreed: '2 years', state: 'agreed', sourceEmailId: 'S2', sourceQuote: 'two-year term' },
    { id: 'S-payment', label: 'Payment terms', agreed: 'Not agreed yet: quote says 45 days, playbook prefers 60', state: 'open', sourceEmailId: 'S2', sourceQuote: 'payment in 45 days' },
  ],
  intake: {
    fields: [
      { label: 'Supplier', value: 'SwiftShip Logistics', from: 'Sender domain swiftship.example' },
      { label: 'Category', value: 'Logistics · outbound freight', from: 'Email subject' },
      { label: 'Annual value', value: '₹36 lakh', from: 'PDF quote, page 1' },
      { label: 'Term', value: '2 years from 1 Jan 2027', from: 'PDF quote, page 1' },
      { label: 'Owner', value: 'Ananya Rao', from: 'Recipient' },
      { label: 'Fuel surcharge', value: '0.5% per ₹1 above ₹92 a litre', from: 'Email, 11 Nov (after the call)' },
    ],
  },
};

export const SCRIPTED_DEALS: Record<string, ScriptedDeal> = {
  [BRIGHTSTAFF.dealId]: BRIGHTSTAFF,
  [SWIFTSHIP.dealId]: SWIFTSHIP,
};

/** The headline for a scripted deal: the same "₹ a year if signed as is" as CloudDesk. */
export function scriptedAtRisk(deal: ScriptedDeal): number {
  return deal.rows.reduce((sum, row) => sum + (row.state !== 'agreed' ? row.costLakhPerYr ?? 0 : 0), 0);
}

/** The figure a deals list shows for a non-CloudDesk deal: exact for scripted deals, seed value otherwise. */
export function listedAtRisk(deal: { id: string; display?: { atRiskLakh: number } }): number {
  const scripted = SCRIPTED_DEALS[deal.id];
  return scripted ? scriptedAtRisk(scripted) : deal.display?.atRiskLakh ?? 0;
}

/** BrightStaff emails Ananya is copied on (the HR side thread is not in her mailbox). */
export const BRIGHTSTAFF_MESSAGES: EmailMessage[] = BRIGHTSTAFF.emails
  .filter((e) => !e.side)
  .map((e) => ({
    id: e.id,
    threadId: 'TB1',
    from: e.from,
    to: [e.to.startsWith('Karan') ? 'karan.malhotra@meridian.example' : 'sunita.rao@brightstaff.example'],
    cc: ['ananya.rao@meridian.example'],
    subject: e.subject,
    sentAt: e.at,
    attachments: e.attachment ? [{ fileName: e.attachment, sizeKb: 88, fingerprint: `fp-${e.id}` }] : [],
    body: e.body,
    mailboxes: ['ananya'],
  }));
