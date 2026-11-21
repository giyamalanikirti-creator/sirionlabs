/**
 * Emails and simple ledgers for every listed supplier other than CloudDesk,
 * BrightStaff and SwiftShip (those two are in moreDeals.ts).
 *
 * Every row's quote is an exact substring of its source email (tested), and
 * every row with something at stake opens that email in Outlook. The emails
 * are dated on or before 14 Nov 09:30, so opening one never moves the demo
 * clock past a CloudDesk moment.
 */
import type { EmailMessage } from '@/lib/types';
import { deepShift } from '@/lib/demo/timeShift';

export interface MailRow {
  id: string;
  label: string;
  agreed: string;
  state: 'agreed' | 'open' | 'needs_confirmation' | 'reopened';
  emailId: string;
  quote: string;
  note?: string;
}

export interface DealMail {
  dealId: string;
  emails: EmailMessage[];
  rows: MailRow[];
}

const A = 'ananya.rao@meridian.example';

function mail(
  id: string,
  dealId: string,
  from: string,
  sentAt: string,
  subject: string,
  body: string,
  extra: Partial<EmailMessage> = {},
): EmailMessage {
  return {
    id,
    threadId: `TX-${dealId}`,
    from,
    to: [A],
    cc: [],
    subject,
    sentAt,
    attachments: [],
    body,
    mailboxes: ['ananya'],
    ...extra,
  };
}

export const SUPPLIER_MAIL: DealMail[] = deepShift([
  {
    dealId: 'D-NIMBUS',
    emails: [
      mail('N1', 'D-NIMBUS', 'kavya.iyer@nimbushr.example', '2026-11-12T15:55:00+05:30', 'Nimbus HR Cloud: renewal questionnaire',
        "Hi Ananya, ahead of the February renewal we would like to apply a 7% price increase and move to 60 days' notice for renewal. We can keep 200 seats and 24x5 support as today. Payment terms and data export to be confirmed in the questionnaire. Kavya"),
      mail('N2', 'D-NIMBUS', 'karan.malhotra@meridian.example', '2026-11-13T11:20:00+05:30', 'FW: Nimbus renewal',
        'Ananya, for context: the 2024 contract fixed the price for two years, and on Tuesday we agreed a 2-year renewal term with Nimbus. Karan'),
    ],
    rows: [
      { id: 'N-term', label: 'Term', agreed: '2-year renewal', state: 'agreed', emailId: 'N2', quote: 'we agreed a 2-year renewal term with Nimbus' },
      { id: 'N-seats', label: 'Seats', agreed: '200 seats', state: 'agreed', emailId: 'N1', quote: 'We can keep 200 seats and 24x5 support as today' },
      { id: 'N-support', label: 'Support hours', agreed: '24x5', state: 'agreed', emailId: 'N1', quote: 'We can keep 200 seats and 24x5 support as today' },
      { id: 'N-price', label: 'Annual price', agreed: 'Fixed (2024 contract)', state: 'reopened', emailId: 'N1', quote: 'we would like to apply a 7% price increase', note: 'Nimbus asks for a 7% increase' },
      { id: 'N-notice', label: 'Renewal notice', agreed: 'Not agreed yet', state: 'open', emailId: 'N1', quote: "move to 60 days' notice for renewal" },
      { id: 'N-payment', label: 'Payment terms', agreed: 'Not agreed yet', state: 'open', emailId: 'N1', quote: 'Payment terms and data export to be confirmed' },
      { id: 'N-export', label: 'Data export', agreed: 'Not agreed yet', state: 'open', emailId: 'N1', quote: 'Payment terms and data export to be confirmed' },
    ],
  },
  {
    dealId: 'D-CLEANCO',
    emails: [
      mail('C1', 'D-CLEANCO', 'operations@cleanco.example', '2026-11-11T10:30:00+05:30', 'CleanCo: confirmed terms for 2027–28',
        'Thanks Karan. Confirming the monthly fee of ₹1,50,000, 22 staff across both sites, payment in 30 days and a 2-year term. Deep cleaning every quarter is included. We would like to discuss the penalty for missed shifts separately. Asha',
        { to: ['karan.malhotra@meridian.example'], cc: [A] }),
      mail('C2', 'D-CLEANCO', 'ap@meridian.example', '2026-11-13T16:12:00+05:30', 'Invoice approval pending: CleanCo Facilities',
        'Invoice 4471 from CleanCo bills ₹1,62,000 for October against a monthly fee of ₹1,50,000. It is waiting on your approval. Accounts Payable'),
    ],
    rows: [
      { id: 'C-fee', label: 'Monthly fee', agreed: '₹1,50,000 a month', state: 'agreed', emailId: 'C1', quote: 'Confirming the monthly fee of ₹1,50,000' },
      { id: 'C-staff', label: 'Staffing', agreed: '22 staff across both sites', state: 'agreed', emailId: 'C1', quote: '22 staff across both sites' },
      { id: 'C-payment', label: 'Payment terms', agreed: '30 days', state: 'agreed', emailId: 'C1', quote: 'payment in 30 days' },
      { id: 'C-term', label: 'Term', agreed: '2 years', state: 'agreed', emailId: 'C1', quote: 'a 2-year term' },
      { id: 'C-deep', label: 'Deep cleaning', agreed: 'Every quarter, included', state: 'agreed', emailId: 'C1', quote: 'Deep cleaning every quarter is included' },
      { id: 'C-penalty', label: 'Missed-shift penalty', agreed: 'Not agreed yet', state: 'open', emailId: 'C1', quote: 'We would like to discuss the penalty for missed shifts separately' },
    ],
  },
  {
    dealId: 'D-DATAVAULT',
    emails: [
      mail('DV1', 'D-DATAVAULT', 'sales@datavault.example', '2026-11-10T14:00:00+05:30', 'DataVault proposal for Meridian',
        'Hi Ananya, our proposal: storage at ₹2.5 lakh a month, with a price review every year in line with CPI. Uptime 99.9%, with service credits to be agreed. Payment in 30 days. On exit, data is returned within 60 days at our standard rates. Nikhil',
        { cc: ['vikram.shah@meridian.example'], mailboxes: ['ananya', 'vikram'] }),
      mail('DV2', 'D-DATAVAULT', 'vikram.shah@meridian.example', '2026-11-12T09:45:00+05:30', 'RE: DataVault proposal for Meridian',
        'Ananya, we agreed on a three-year term on Tuesday’s call. Everything else in their proposal is still open. Vikram'),
    ],
    rows: [
      { id: 'DV-term', label: 'Term', agreed: '3 years', state: 'agreed', emailId: 'DV2', quote: 'we agreed on a three-year term' },
      { id: 'DV-price', label: 'Storage price', agreed: 'Not agreed yet', state: 'open', emailId: 'DV1', quote: 'storage at ₹2.5 lakh a month' },
      { id: 'DV-review', label: 'Price review', agreed: 'Not agreed yet', state: 'open', emailId: 'DV1', quote: 'a price review every year in line with CPI' },
      { id: 'DV-credit', label: 'Service credit', agreed: 'Not agreed yet', state: 'open', emailId: 'DV1', quote: 'with service credits to be agreed' },
      { id: 'DV-payment', label: 'Payment terms', agreed: 'Not agreed yet', state: 'open', emailId: 'DV1', quote: 'Payment in 30 days' },
      { id: 'DV-exit', label: 'Exit support', agreed: 'Not agreed yet', state: 'open', emailId: 'DV1', quote: 'data is returned within 60 days at our standard rates' },
    ],
  },
  {
    dealId: 'D-HELPHUB',
    emails: [
      mail('H1', 'D-HELPHUB', 'ravi.kumar@helphub.example', '2026-11-12T12:10:00+05:30', 'HelpHub signing copy',
        'Signing copy attached. As discussed: 150 agents at ₹8,000 a year, a 1-year term, payment in 45 days, 99.5% uptime and exit support at no cost. On the onboarding fee, OK with that. Ravi',
        { to: ['meera.pillai@meridian.example'], cc: [A], attachments: [{ fileName: 'HelpHub_Agreement_signing.docx', sizeKb: 74, fingerprint: 'fp-hh' }] }),
      mail('H2', 'D-HELPHUB', 'meera.pillai@meridian.example', '2026-11-12T16:40:00+05:30', 'HelpHub onboarding fee: which option?',
        'Ananya, HelpHub replied “OK with that” on the onboarding fee, but we had offered two options: waive it, or take 50% off. I will ask Ravi which one he accepted. Meera'),
    ],
    rows: [
      { id: 'H-seats', label: 'Agents and price', agreed: '150 agents at ₹8,000 a year', state: 'agreed', emailId: 'H1', quote: '150 agents at ₹8,000 a year' },
      { id: 'H-term', label: 'Term', agreed: '1 year', state: 'agreed', emailId: 'H1', quote: 'a 1-year term' },
      { id: 'H-payment', label: 'Payment terms', agreed: '45 days', state: 'agreed', emailId: 'H1', quote: 'payment in 45 days' },
      { id: 'H-uptime', label: 'Uptime', agreed: '99.5%', state: 'agreed', emailId: 'H1', quote: '99.5% uptime' },
      { id: 'H-exit', label: 'Exit support', agreed: 'At no cost', state: 'agreed', emailId: 'H1', quote: 'exit support at no cost' },
      { id: 'H-onboarding', label: 'Onboarding fee', agreed: 'Waived or 50% off: unclear', state: 'needs_confirmation', emailId: 'H1', quote: 'On the onboarding fee, OK with that', note: 'Two options were open' },
    ],
  },
  {
    dealId: 'D-CLOUDOPS',
    emails: [
      mail('CO1', 'D-CLOUDOPS', 'deals@cloudops.example', '2026-11-11T17:05:00+05:30', 'CloudOps Suite: updated proposal',
        "Hi Meera, our updated proposal: we'd like a 6% yearly price increase, 90 days' renewal notice, liability capped at 3 months' fees and payment in 30 days. The weekly usage summary continues as today. Arun",
        { to: ['meera.pillai@meridian.example'], cc: [A] }),
      mail('CO2', 'D-CLOUDOPS', 'meera.pillai@meridian.example', '2026-11-12T10:15:00+05:30', 'CloudOps: where we are',
        'Ananya, we agreed 70 nodes and a 2-year term with CloudOps on Monday; the rest is still being negotiated. Meera'),
    ],
    rows: [
      { id: 'CO-nodes', label: 'Nodes', agreed: '70 nodes', state: 'agreed', emailId: 'CO2', quote: 'we agreed 70 nodes and a 2-year term' },
      { id: 'CO-term', label: 'Term', agreed: '2 years', state: 'agreed', emailId: 'CO2', quote: 'we agreed 70 nodes and a 2-year term' },
      { id: 'CO-price', label: 'Price increase', agreed: 'Not agreed yet', state: 'open', emailId: 'CO1', quote: "we'd like a 6% yearly price increase" },
      { id: 'CO-notice', label: 'Renewal notice', agreed: 'Not agreed yet', state: 'open', emailId: 'CO1', quote: "90 days' renewal notice" },
      { id: 'CO-liability', label: 'Liability cap', agreed: 'Not agreed yet', state: 'open', emailId: 'CO1', quote: "liability capped at 3 months' fees" },
      { id: 'CO-payment', label: 'Payment terms', agreed: 'Not agreed yet', state: 'open', emailId: 'CO1', quote: 'payment in 30 days' },
    ],
  },
  {
    dealId: 'D-PIXELFORGE',
    emails: [
      mail('P1', 'D-PIXELFORGE', 'accounts@pixelforge.example', '2026-11-13T14:30:00+05:30', 'PixelForge: draft v3',
        'Thanks Karan. The retainer of ₹2,33,000 a month, 4 campaigns a quarter and the 1-year term stay as agreed. Our v3 draft moves ownership of final artwork to transfer only on full payment. Payment terms and the termination notice are still open. Leela',
        { to: ['karan.malhotra@meridian.example'], cc: [A], attachments: [{ fileName: 'PixelForge_MSA_v3.docx', sizeKb: 66, fingerprint: 'fp-pf3' }] }),
    ],
    rows: [
      { id: 'P-retainer', label: 'Retainer', agreed: '₹2,33,000 a month', state: 'agreed', emailId: 'P1', quote: 'The retainer of ₹2,33,000 a month' },
      { id: 'P-campaigns', label: 'Campaigns', agreed: '4 a quarter', state: 'agreed', emailId: 'P1', quote: '4 campaigns a quarter' },
      { id: 'P-term', label: 'Term', agreed: '1 year', state: 'agreed', emailId: 'P1', quote: 'the 1-year term stay as agreed' },
      { id: 'P-ip', label: 'IP ownership', agreed: 'Meridian owns final artwork on delivery (v2)', state: 'reopened', emailId: 'P1', quote: 'moves ownership of final artwork to transfer only on full payment', note: 'v3 changes it' },
      { id: 'P-payment', label: 'Payment terms', agreed: 'Not agreed yet', state: 'open', emailId: 'P1', quote: 'Payment terms and the termination notice are still open' },
      { id: 'P-termination', label: 'Termination notice', agreed: 'Not agreed yet', state: 'open', emailId: 'P1', quote: 'Payment terms and the termination notice are still open' },
    ],
  },
  {
    dealId: 'D-TRANSITONE',
    emails: [
      mail('TR1', 'D-TRANSITONE', 'sanjay.patil@transitone.example', '2026-11-13T09:40:00+05:30', 'TransitOne: Pune–Mumbai lane contract',
        'Hi Meera, confirming 12 trucks on the Pune–Mumbai lane and a 2-year term. For the new contract we need a transit fee of ₹1,800 per trip to cover toll and permit changes, a fuel surcharge linked to diesel, and payment in 30 days. Sanjay',
        { to: ['meera.pillai@meridian.example'], cc: [A] }),
    ],
    rows: [
      { id: 'TR-fleet', label: 'Fleet', agreed: '12 trucks, Pune–Mumbai', state: 'agreed', emailId: 'TR1', quote: 'confirming 12 trucks on the Pune–Mumbai lane' },
      { id: 'TR-term', label: 'Term', agreed: '2 years', state: 'agreed', emailId: 'TR1', quote: 'a 2-year term' },
      { id: 'TR-transit', label: 'Transit fee', agreed: 'Not agreed yet', state: 'open', emailId: 'TR1', quote: 'a transit fee of ₹1,800 per trip to cover toll and permit changes', note: 'New ask from TransitOne' },
      { id: 'TR-fuel', label: 'Fuel surcharge', agreed: 'Not agreed yet', state: 'open', emailId: 'TR1', quote: 'a fuel surcharge linked to diesel' },
      { id: 'TR-payment', label: 'Payment terms', agreed: 'Not agreed yet', state: 'open', emailId: 'TR1', quote: 'payment in 30 days' },
    ],
  },
  {
    dealId: 'D-KAVERI',
    emails: [
      mail('K1', 'D-KAVERI', 'ops@kaveri.example', '2026-11-13T12:00:00+05:30', 'Kaveri Consulting: signing copy',
        'Signing copy attached: 2 consultants at ₹60,000 a day for 125 days, expenses capped at 5% of fees, payment in 30 days and IP assigned to Meridian. Please sign by 25 Nov. Lakshmi',
        { to: ['karan.malhotra@meridian.example'], cc: [A], attachments: [{ fileName: 'Kaveri_SOW_signing.docx', sizeKb: 58, fingerprint: 'fp-kv' }] }),
    ],
    rows: [
      { id: 'K-rates', label: 'Day rates', agreed: '₹60,000 a day, 2 consultants, 125 days', state: 'agreed', emailId: 'K1', quote: '2 consultants at ₹60,000 a day for 125 days' },
      { id: 'K-expenses', label: 'Expenses', agreed: 'Capped at 5% of fees', state: 'agreed', emailId: 'K1', quote: 'expenses capped at 5% of fees' },
      { id: 'K-payment', label: 'Payment terms', agreed: '30 days', state: 'agreed', emailId: 'K1', quote: 'payment in 30 days' },
      { id: 'K-ip', label: 'IP ownership', agreed: 'Assigned to Meridian', state: 'agreed', emailId: 'K1', quote: 'IP assigned to Meridian' },
    ],
  },
  {
    dealId: 'D-SECUREGATE',
    emails: [
      mail('SG1', 'D-SECUREGATE', 'contracts@securegate.example', '2026-11-12T11:25:00+05:30', 'SecureGate: proposal for both sites',
        "Proposal for both sites: 14 guards at ₹62,000 a guard a month. We've agreed the 1-year term. Overtime rates, the replacement time for absent guards and payment terms will follow in our draft. Imtiaz",
        { to: ['meera.pillai@meridian.example'], cc: [A] }),
    ],
    rows: [
      { id: 'SG-term', label: 'Term', agreed: '1 year', state: 'agreed', emailId: 'SG1', quote: "We've agreed the 1-year term" },
      { id: 'SG-rate', label: 'Guard rate', agreed: 'Not agreed yet', state: 'open', emailId: 'SG1', quote: '14 guards at ₹62,000 a guard a month' },
      { id: 'SG-overtime', label: 'Overtime rates', agreed: 'Not agreed yet', state: 'open', emailId: 'SG1', quote: 'Overtime rates, the replacement time for absent guards and payment terms will follow' },
      { id: 'SG-replacement', label: 'Replacement time', agreed: 'Not agreed yet', state: 'open', emailId: 'SG1', quote: 'Overtime rates, the replacement time for absent guards and payment terms will follow' },
    ],
  },
]);

export const dealMailFor = (dealId: string) => SUPPLIER_MAIL.find((d) => d.dealId === dealId);
