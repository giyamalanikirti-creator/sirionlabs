/**
 * Writes the hand-authored seed files in data/ — BUILD_SPEC §5 and §7.
 * Run once; the JSON it writes is the committed source of truth.
 * (npm run seed only regenerates contracts / invoices / renewals / service events.)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'data');
mkdirSync(DATA, { recursive: true });

const write = (file: string, value: unknown) => {
  writeFileSync(join(DATA, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  console.log(`  ${file.padEnd(24)} ${Array.isArray(value) ? value.length : 1}`);
};

/* ================================================================== */
/* §5.1 People                                                         */
/* ================================================================== */

const people = [
  { id: 'ananya', name: 'Ananya Rao', email: 'ananya.rao@meridian.example', org: 'meridian', role: 'Procurement lead' },
  { id: 'vikram', name: 'Vikram Shah', email: 'vikram.shah@meridian.example', org: 'meridian', role: 'Head of IT' },
  { id: 'neha', name: 'Neha Kapoor', email: 'neha.kapoor@meridian.example', org: 'meridian', role: 'CFO' },
  { id: 'arjun', name: 'Arjun Mehta', email: 'arjun.mehta@meridian.example', org: 'meridian', role: 'Legal counsel' },
  { id: 'karan', name: 'Karan Malhotra', email: 'karan.malhotra@meridian.example', org: 'meridian', role: 'Procurement' },
  { id: 'meera', name: 'Meera Pillai', email: 'meera.pillai@meridian.example', org: 'meridian', role: 'Procurement' },
  { id: 'rohan', name: 'Rohan Iyer', email: 'rohan.iyer@clouddesk.example', org: 'clouddesk', role: 'Account director' },
  { id: 'priya', name: 'Priya Nair', email: 'priya.nair@clouddesk.example', org: 'clouddesk', role: 'Contracts manager' },
  { id: 'deals', name: 'Deal Ledger capture', email: 'deals@meridian.example', org: 'meridian', role: 'Shared mailbox' },
];

const E = Object.fromEntries(people.map((p) => [p.id, p.email])) as Record<string, string>;

/* ================================================================== */
/* §5.2 Threads                                                        */
/* ================================================================== */

const threads = [
  { id: 'T1', subject: 'CloudDesk renewal 2026–29', dealId: 'D-CLOUDDESK', participants: ['ananya', 'rohan', 'priya'], mailboxes: ['ananya'] },
  { id: 'T2', subject: 'CloudDesk uptime in October', participants: ['vikram', 'rohan'], mailboxes: ['vikram'] },
  { id: 'T3', subject: 'CloudDesk liability cap: Legal OK?', dealId: 'D-CLOUDDESK', participants: ['ananya', 'arjun'], mailboxes: ['ananya'] },
  { id: 'T4', subject: 'CloudDesk 3-year commitment: approval', dealId: 'D-CLOUDDESK', participants: ['ananya', 'neha'], mailboxes: ['ananya'] },
  { id: 'D1', subject: 'Team offsite plan', participants: ['vikram'], mailboxes: ['vikram'] },
  { id: 'D2', subject: 'Laptop refresh quotes', participants: ['vikram'], mailboxes: ['vikram'] },
  { id: 'D3', subject: 'SwiftShip: revised lane rates', dealId: 'D-SWIFTSHIP', participants: ['ananya'], mailboxes: ['ananya'] },
  { id: 'D4', subject: 'Q3 spend review', participants: ['ananya', 'neha'], mailboxes: ['ananya'] },
];

/* ================================================================== */
/* §5.3 Scripted messages — bodies exactly as specified                */
/* ================================================================== */

const att = (fileName: string, sizeKb: number, versionId: string, dealIdTag: string | null) => [
  { fileName, sizeKb, versionId, fingerprint: `fp-${versionId}`, dealIdTag },
];

const TAG = 'DL-CLOUDDESK-2026';

type Msg = {
  id: string; threadId: string; from: string; to: string[]; cc: string[];
  subject: string; sentAt: string; attachments: ReturnType<typeof att> | [];
  body: string; mailboxes: string[];
};

const scripted: Msg[] = [
  {
    id: 'M1', threadId: 'T1', from: E.rohan, to: [E.ananya], cc: [E.priya],
    subject: 'CloudDesk renewal 2026–29', sentAt: '2026-11-01T11:20:00+05:30',
    attachments: att('CloudDesk_MSA_v1.docx', 84, 'v1', null),
    body: 'Hi Ananya, attached is our renewal draft for the next term. Pricing moves to our standard yearly revision and payment stays at 45 days. Happy to discuss. Rohan',
    mailboxes: ['ananya'],
  },
  {
    id: 'M2', threadId: 'T1', from: E.ananya, to: [E.rohan], cc: [E.priya],
    subject: 'RE: CloudDesk renewal 2026–29', sentAt: '2026-11-03T16:05:00+05:30',
    attachments: att('CloudDesk_MSA_v2.docx', 88, 'v2', TAG),
    body: "Thanks Rohan. Our markup is attached. We'd like the price fixed for the term, payment in 60 days and 10% service credits for any month below 99.5% uptime. We could look at a 3-year term if the price is fixed. Ananya",
    mailboxes: ['ananya'],
  },
  {
    id: 'M3', threadId: 'T1', from: E.rohan, to: [E.ananya], cc: [E.priya],
    subject: 'RE: CloudDesk renewal 2026–29', sentAt: '2026-11-06T12:40:00+05:30',
    attachments: att('CloudDesk_MSA_v3.docx', 89, 'v3', TAG),
    body: 'Revised draft attached. A yearly revision is standard for us, but we can look at 60 days if you commit to three years. Rohan',
    mailboxes: ['ananya'],
  },
  {
    id: 'M4', threadId: 'T3', from: E.arjun, to: [E.ananya], cc: [E.deals],
    subject: 'CloudDesk liability cap: Legal OK?', sentAt: '2026-11-07T15:10:00+05:30',
    attachments: [],
    body: "Liability cap at 12 months' fees is fine from Legal. Approved. Arjun",
    mailboxes: ['ananya'],
  },
  {
    id: 'M5', threadId: 'T1', from: E.rohan, to: [E.ananya], cc: [E.priya],
    subject: 'RE: CloudDesk renewal 2026–29', sentAt: '2026-11-10T09:15:00+05:30',
    attachments: [],
    body: 'OK on 60 days if you sign for 3 years. And yes, 30 days of exit support at no charge works for us. Rohan',
    mailboxes: ['ananya'],
  },
  {
    id: 'M6', threadId: 'T4', from: E.neha, to: [E.ananya], cc: [E.deals],
    subject: 'CloudDesk 3-year commitment: approval', sentAt: '2026-11-12T17:30:00+05:30',
    attachments: [],
    body: 'Approved: 3-year commitment with CloudDesk up to ₹1.8 crore, provided the price is fixed for the term. Neha',
    mailboxes: ['ananya'],
  },
  {
    id: 'M7', threadId: 'T1', from: E.ananya, to: [E.rohan], cc: [E.priya],
    subject: 'RE: CloudDesk renewal 2026–29', sentAt: '2026-11-13T10:10:00+05:30',
    attachments: [],
    body: 'Great. On service credits, we need 10% of the monthly fee for any month below 99.5% uptime. Ananya',
    mailboxes: ['ananya'],
  },
  {
    id: 'M8', threadId: 'T1', from: E.rohan, to: [E.ananya], cc: [E.priya],
    subject: 'RE: CloudDesk renewal 2026–29', sentAt: '2026-11-14T10:05:00+05:30',
    attachments: att('CloudDesk_MSA_v4.docx', 91, 'v4', TAG),
    body: 'Good news: we can hold the price at ₹12,000 a seat for the full three years. Updated draft attached. Rohan',
    mailboxes: ['ananya'],
  },
  {
    id: 'M9', threadId: 'T2', from: E.rohan, to: [E.vikram], cc: [],
    subject: 'CloudDesk uptime in October', sentAt: '2026-11-15T09:40:00+05:30',
    attachments: [],
    body: 'Sorry again about the October outages, Vikram. On credits, would 5% work for you? Ananya asked for 10%. Rohan',
    mailboxes: ['vikram'],
  },
  {
    id: 'M10', threadId: 'T2', from: E.vikram, to: [E.rohan], cc: [],
    subject: 'RE: CloudDesk uptime in October', sentAt: '2026-11-15T10:02:00+05:30',
    attachments: [],
    body: '5% would be fine from our side, the main thing for us is uptime. Vikram',
    mailboxes: ['vikram'],
  },
  {
    id: 'M11', threadId: 'T1', from: E.ananya, to: [E.rohan], cc: [E.priya],
    subject: 'RE: CloudDesk renewal 2026–29', sentAt: '2026-11-15T15:30:00+05:30',
    attachments: att('CloudDesk_MSA_v5.docx', 92, 'v5', TAG),
    body: "Rohan, v4 changes the renewal notice in 14.2 to 90 days. We agreed 30, so I've put it back in the attached. Ananya",
    mailboxes: ['ananya'],
  },
  {
    id: 'M12', threadId: 'T1', from: E.rohan, to: [E.ananya], cc: [E.priya, E.vikram],
    subject: 'RE: CloudDesk renewal 2026–29', sentAt: '2026-11-16T17:45:00+05:30',
    attachments: [],
    body: 'Spoke to Vikram yesterday. On service credits, fine with that. Clean signing copy to follow this week. Rohan',
    mailboxes: ['ananya', 'vikram'],
  },
  {
    id: 'M13', threadId: 'T2', from: E.rohan, to: [E.vikram], cc: [],
    subject: 'RE: CloudDesk uptime in October', sentAt: '2026-11-18T10:50:00+05:30',
    attachments: [],
    body: 'One more thing, Vikram: could we keep a yearly price review in the contract? Our hosting costs move every year. Rohan',
    mailboxes: ['vikram'],
  },
  {
    id: 'M14', threadId: 'T1', from: E.priya, to: [E.ananya], cc: [E.rohan],
    subject: 'CloudDesk signing copy', sentAt: '2026-11-19T09:30:00+05:30',
    attachments: att('CloudDesk_MSA_v6.docx', 94, 'v6', TAG),
    body: "Please find the signing copy attached. We've accepted your changes and tidied the draft. Kindly sign by 25 Nov. Priya",
    mailboxes: ['ananya'],
  },
];

/* Decoys and filler so the inboxes look real. None mention CloudDesk. */
const decoys: Msg[] = [
  {
    id: 'D1-1', threadId: 'D1', from: 'priyanka.das@meridian.example', to: [E.vikram], cc: [],
    subject: 'Team offsite plan', sentAt: '2026-11-13T12:15:00+05:30', attachments: [],
    body: 'Venue shortlist for the offsite is in the sheet.', mailboxes: ['vikram'],
  },
  {
    id: 'D2-1', threadId: 'D2', from: 'sales@bytekart.example', to: [E.vikram], cc: [],
    subject: 'Laptop refresh quotes', sentAt: '2026-11-16T11:05:00+05:30',
    attachments: [{ fileName: 'ByteKart_Quote_40.pdf', sizeKb: 212, versionId: undefined, fingerprint: undefined, dealIdTag: null }] as never,
    body: 'Quote for 40 laptops attached.', mailboxes: ['vikram'],
  },
  {
    id: 'D3-1', threadId: 'D3', from: 'rates@swiftship.example', to: [E.ananya], cc: [],
    subject: 'SwiftShip: revised lane rates', sentAt: '2026-11-17T14:20:00+05:30',
    attachments: [{ fileName: 'SwiftShip_Lane_Rates_Q1.xlsx', sizeKb: 46, versionId: undefined, fingerprint: undefined, dealIdTag: 'DL-SWIFTSHIP-2026' }] as never,
    body: 'Revised lane rates for Q1 attached.', mailboxes: ['ananya'],
  },
  {
    id: 'D4-1', threadId: 'D4', from: E.neha, to: [E.ananya], cc: [],
    subject: 'Q3 spend review', sentAt: '2026-11-11T09:05:00+05:30', attachments: [],
    body: 'Can we go through Q3 spend on Monday?', mailboxes: ['ananya'],
  },
];

const fillerAnanya: [string, string, string, string][] = [
  ['F-A1', 'Procurement weekly: open requisitions', 'ops.desk@meridian.example', '2026-11-18T08:30:00+05:30'],
  ['F-A2', 'Policy update: travel claims from December', 'people@meridian.example', '2026-11-17T17:40:00+05:30'],
  ['F-A3', 'Your SpendWise digest for November', 'digest@spendwise.example', '2026-11-17T07:00:00+05:30'],
  ['F-A4', 'Invoice approval pending: CleanCo Facilities', 'ap@meridian.example', '2026-11-16T10:12:00+05:30'],
  ['F-A5', 'Nimbus HR Cloud: renewal questionnaire', 'accounts@nimbushr.example', '2026-11-14T15:55:00+05:30'],
  ['F-A6', 'Reminder: supplier risk training due', 'learning@meridian.example', '2026-11-13T09:20:00+05:30'],
  ['F-A7', 'Canteen vendor: new menu from Monday', 'admin@meridian.example', '2026-11-12T13:05:00+05:30'],
];

const fillerVikram: [string, string, string, string][] = [
  ['F-V1', 'Change window Saturday 02:00–05:00', 'noc@meridian.example', '2026-11-18T09:10:00+05:30'],
  ['F-V2', 'Ticket volumes last week', 'servicedesk@meridian.example', '2026-11-17T18:25:00+05:30'],
  ['F-V3', 'DataVault: scheduled maintenance notice', 'status@datavault.example', '2026-11-17T06:45:00+05:30'],
  ['F-V4', 'New starter kit: 6 joiners in December', 'people@meridian.example', '2026-11-16T14:35:00+05:30'],
  ['F-V5', 'Security patch rollout: phase 2 complete', 'infosec@meridian.example', '2026-11-15T16:50:00+05:30'],
  ['F-V6', 'Your weekly CloudOps Suite summary', 'reports@cloudops.example', '2026-11-14T07:30:00+05:30'],
  ['F-V7', 'Asset audit: laptops pending return', 'itam@meridian.example', '2026-11-12T11:15:00+05:30'],
];

const PREVIEWS: Record<string, string> = {
  'F-A1': 'Eleven requisitions are waiting for a second approver this week.',
  'F-A2': 'From 1 December, claims go through the new form. Nothing else changes.',
  'F-A3': 'Your category spend moved 4% against last month. Full digest inside.',
  'F-A4': 'Invoice 4471 is waiting on your approval since Thursday.',
  'F-A5': 'Please complete the short questionnaire before the renewal call.',
  'F-A6': 'The supplier risk module takes about 20 minutes and is due Friday.',
  'F-A7': 'The new winter menu starts Monday. Feedback form is at the bottom.',
  'F-V1': 'Core switches will be unavailable for roughly 40 minutes.',
  'F-V2': 'Volumes are down 8% week on week. Backlog is steady at 34 tickets.',
  'F-V3': 'Maintenance on 22 November, 01:00–03:00 IST. No action needed.',
  'F-V4': 'Six joiners start on 1 December. Kit requests are in the sheet.',
  'F-V5': 'Phase 2 completed overnight with no rollbacks.',
  'F-V6': 'Uptime, incidents and spend for the week ending 13 November.',
  'F-V7': 'Nine laptops are still showing as assigned to leavers.',
};

const filler: Msg[] = [...fillerAnanya, ...fillerVikram].map(([id, subject, from, sentAt]) => ({
  id,
  threadId: `TH-${id}`,
  from,
  to: [id.startsWith('F-A') ? E.ananya : E.vikram],
  cc: [],
  subject,
  sentAt,
  attachments: [],
  body: PREVIEWS[id],
  mailboxes: [id.startsWith('F-A') ? 'ananya' : 'vikram'],
}));

const messages = [...scripted, ...decoys, ...filler].sort((a, b) => a.sentAt.localeCompare(b.sentAt));

/* Filler threads so every message has one. */
const fillerThreads = filler.map((m) => ({
  id: m.threadId,
  subject: m.subject,
  participants: [],
  mailboxes: m.mailboxes,
}));

/* ================================================================== */
/* §5.4 Contract versions                                              */
/* ================================================================== */

const words: Record<number, string> = {
  1: 'one', 3: 'three', 5: 'five', 6: 'six', 10: 'ten', 12: 'twelve',
  30: 'thirty', 45: 'forty-five', 60: 'sixty', 90: 'ninety',
};

const feesFixed =
  'The Fees are INR 12,000 per Seat per year for 500 Seats (INR 60,00,000 per year) and are fixed for the Initial Term.';
const feesOpen =
  'The Fees are INR 12,000 per Seat per year for 500 Seats (INR 60,00,000 per year). Supplier may revise the Fees once in each contract year by written notice.';
const payment = (n: number) =>
  `Customer shall pay each undisputed invoice within ${n} (${words[n]}) days of receipt.`;
const credit = (p: number) =>
  `If Availability in any month falls below 99.5%, Supplier shall credit ${p} percent (${p}%) of that month's Fees against the next invoice.`;
const liability = (n: number) =>
  `Each party's total liability under this Agreement shall not exceed the Fees paid or payable in the ${n} (${words[n]}) months before the claim.`;
const notice = (n: number) =>
  `This Agreement renews for successive one (1) year terms unless either party gives ${n} (${words[n]}) days' written notice before the end of the then-current term.`;
const exitFree =
  'On expiry or termination, Supplier shall provide up to thirty (30) days of exit support, including data export, at no additional charge.';
const exitPaid =
  "On expiry or termination, Supplier shall provide up to thirty (30) days of exit support, including data export, at Supplier's then-current daily rates.";
const term = (n: number) => `The Initial Term is ${n} (${words[n]}) year(s) from 1 December 2026.`;

/*
 * Original, plain, non-money clauses, written for this prototype.
 * Long enough that the signing copy runs to three pages and reads like a real
 * agreement rather than a stub. Nothing here is copied from any template.
 */
const STATIC_CLAUSES = [
  {
    no: '1.1', title: 'Definitions',
    text: 'In this Agreement, "Seat" means one named user permitted to sign in to the Service; "Availability" means the percentage of minutes in a calendar month during which the Service responds to a sign-in request; "Initial Term" has the meaning given in clause 3.1; and "Working Day" means a day other than a Saturday, Sunday or public holiday in Maharashtra. Words in the singular include the plural and the other way round. Headings are for reading convenience only and do not affect meaning. A reference to a clause is a reference to a clause of this Agreement, and a reference to writing includes email.',
  },
  {
    no: '2.1', title: 'The Service',
    text: 'Supplier shall make the CloudDesk helpdesk service available to Customer over the internet for the Initial Term and any renewal term. Supplier shall provide the service in line with the description in Schedule 1 and shall not reduce any material feature during a contract year without Customer\'s written consent. Supplier shall give Customer at least thirty (30) days\' written notice before it changes the way the service is hosted, and shall keep all Customer data within India for the duration of this Agreement. Planned maintenance shall take place outside Customer\'s published business hours wherever reasonably possible, and Supplier shall give at least five (5) Working Days\' notice of it.',
  },
  {
    no: '4.1', title: 'Seats and usage',
    text: 'Customer may add Seats at any time at the rate set out in clause 9.1, charged pro rata for the remainder of the contract year. Customer may reduce Seats at the start of any contract year on thirty (30) days\' written notice, provided the total does not fall below four hundred (400) Seats. Supplier shall not charge a fee for reassigning a Seat from one named user to another, and shall not count a user who has left Customer\'s organisation as occupying a Seat once Customer has deactivated that user. Supplier shall make usage reporting available to Customer at no additional charge.',
  },
  {
    no: '5.1', title: 'Data protection',
    text: 'Each party shall comply with applicable data protection law. Supplier processes Customer personal data only on Customer\'s documented instructions and for the purpose of providing the service, and shall not use that data to train any model or to develop any other product. Supplier shall notify Customer without undue delay, and in any event within seventy-two (72) hours, after becoming aware of a personal data breach affecting Customer data. Supplier shall impose on each of its sub-processors terms no less protective than those in this clause, and shall remain responsible to Customer for the acts and omissions of each sub-processor.',
  },
  {
    no: '6.1', title: 'Confidentiality',
    text: 'Each party shall keep the other party\'s confidential information in confidence and shall not disclose it to any third party except to its own staff and advisers who need it to perform this Agreement and who are bound by obligations of confidence. This clause does not apply to information that is public through no fault of the receiving party, that the receiving party already held without restriction, or that a party is required by law or by a regulator to disclose, provided that party gives the other as much notice of the requirement as it lawfully can. This clause survives the end of this Agreement for three (3) years.',
  },
  {
    no: '7.1', title: 'Warranties',
    text: 'Supplier warrants that it has the right to grant the rights it grants under this Agreement, that it shall provide the service with reasonable skill and care and in line with good industry practice, and that the service does not and will not infringe the intellectual property rights of any third party. Supplier further warrants that it shall not knowingly introduce any virus or disabling code into the service, and that it holds and shall maintain the certifications listed in Schedule 2 for the duration of this Agreement.',
  },
  {
    no: '8.1', title: 'Support and escalation',
    text: 'Supplier shall provide support between 09:00 and 19:00 India Standard Time on Working Days, and shall acknowledge a priority one incident within thirty (30) minutes at any hour. Supplier shall name an account contact and an escalation contact, and shall tell Customer in writing within five (5) Working Days if either changes. Where an incident remains unresolved after four (4) hours, Supplier shall escalate it to its head of service delivery and shall give Customer a written update at least once every two (2) hours until it is resolved.',
  },
  {
    no: '13.1', title: 'Force majeure',
    text: 'Neither party is liable for a failure to perform caused by an event beyond its reasonable control, including flood, fire, earthquake, war, civil unrest, strike other than by its own staff, or the failure of a public telecommunications network. The affected party shall tell the other as soon as it reasonably can, shall take reasonable steps to limit the effect, and shall resume performance as soon as the event allows. If the event continues for more than thirty (30) consecutive days, either party may end this Agreement on written notice without liability for that termination.',
  },
  {
    no: '16.1', title: 'Notices',
    text: 'A notice under this Agreement must be in writing and sent to the address or email address set out in the order form, or to any address notified in writing after the date of this Agreement. A notice sent by email is treated as received on the next Working Day in the place of receipt, and a notice sent by hand is treated as received when it is delivered. A notice of termination or of a claim must also be sent by courier to the recipient\'s registered office.',
  },
  {
    no: '17.1', title: 'Governing law and disputes',
    text: 'This Agreement is governed by the laws of India. The courts of Mumbai have exclusive jurisdiction over any dispute arising out of or in connection with it, and each party submits to that jurisdiction. Before either party starts proceedings, the parties shall refer the dispute to a senior representative of each of them, who shall meet within ten (10) Working Days and try in good faith to settle it. This clause does not prevent either party from seeking an injunction at any time.',
  },
];

type ClauseSpec = {
  term: number; price: 'fixed' | 'open'; payment: number; credit: number;
  liability: number; notice: number; exit: 'free' | 'paid';
};

const VERSION_SPECS: Record<string, ClauseSpec> = {
  v1: { term: 1, price: 'open', payment: 45, credit: 5, liability: 6, notice: 30, exit: 'paid' },
  v2: { term: 3, price: 'fixed', payment: 60, credit: 10, liability: 12, notice: 30, exit: 'free' },
  v3: { term: 3, price: 'open', payment: 45, credit: 5, liability: 12, notice: 30, exit: 'paid' },
  v4: { term: 3, price: 'fixed', payment: 60, credit: 10, liability: 12, notice: 90, exit: 'free' },
  v5: { term: 3, price: 'fixed', payment: 60, credit: 10, liability: 12, notice: 30, exit: 'free' },
  v6: { term: 3, price: 'open', payment: 45, credit: 10, liability: 12, notice: 90, exit: 'free' },
};

const VERSION_META: Record<string, { author: 'buyer' | 'supplier'; sentAt: string; tag: string | null; declared: string[] }> = {
  v1: { author: 'supplier', sentAt: '2026-11-01T11:20:00+05:30', tag: null, declared: [] },
  v2: { author: 'buyer', sentAt: '2026-11-03T16:05:00+05:30', tag: TAG, declared: ['3.1', '9.1', '9.3', '11.2', '12.1', '15.1'] },
  v3: { author: 'supplier', sentAt: '2026-11-06T12:40:00+05:30', tag: TAG, declared: ['9.1', '9.3', '11.2', '15.1'] },
  // v4's 14.2 change is deliberately NOT declared — the hidden edit.
  v4: { author: 'supplier', sentAt: '2026-11-14T10:05:00+05:30', tag: TAG, declared: ['9.1'] },
  v5: { author: 'buyer', sentAt: '2026-11-15T15:30:00+05:30', tag: TAG, declared: ['14.2'] },
  v6: { author: 'supplier', sentAt: '2026-11-19T09:30:00+05:30', tag: TAG, declared: ['11.2'] },
};

/*
 * Each money clause keeps the §5.4 pattern sentence first, word for word,
 * because the signing-check parsers read values back out of it. The sentences
 * after it are ordinary contract prose and are never parsed.
 */
const TAIL = {
  term: ' The Initial Term begins on the commencement date set out in the order form.',
  price:
    ' All Fees are exclusive of goods and services tax, which Customer shall pay at the rate in force at the time of supply.',
  payment:
    ' Customer shall raise any dispute about an invoice within fifteen (15) days of receipt, and the parties shall settle a disputed amount within thirty (30) days of agreeing it.',
  service_credit:
    ' Supplier shall apply the credit without Customer having to claim it, and shall set it out as a separate line on the next invoice.',
  liability:
    " Nothing in this Agreement limits either party's liability for death or personal injury caused by negligence, for fraud, or for any other liability that cannot lawfully be limited.",
  notice:
    ' Customer may give notice by email to the address set out in the order form, and Supplier shall acknowledge that notice within two (2) Working Days.',
  exit:
    ' Supplier shall provide the export in a documented, machine-readable format and shall delete Customer data within sixty (60) days of the end of the exit period.',
};

function buildClauses(s: ClauseSpec) {
  const money = [
    { no: '3.1', title: 'Term', text: term(s.term) + TAIL.term, termKey: 'term' },
    {
      no: '9.1', title: 'Fees',
      text: (s.price === 'fixed' ? feesFixed : feesOpen) + TAIL.price,
      termKey: 'price',
    },
    { no: '9.3', title: 'Payment', text: payment(s.payment) + TAIL.payment, termKey: 'payment' },
    { no: '11.2', title: 'Service credits', text: credit(s.credit) + TAIL.service_credit, termKey: 'service_credit' },
    { no: '12.1', title: 'Limitation of liability', text: liability(s.liability) + TAIL.liability, termKey: 'liability_cap' },
    { no: '14.2', title: 'Renewal and notice', text: notice(s.notice) + TAIL.notice, termKey: 'renewal_notice' },
    { no: '15.1', title: 'Exit support', text: (s.exit === 'free' ? exitFree : exitPaid) + TAIL.exit, termKey: 'exit_support' },
  ];
  const all = [...STATIC_CLAUSES, ...money];
  // Document order by clause number.
  return all.sort((a, b) => {
    const [am, an] = a.no.split('.').map(Number);
    const [bm, bn] = b.no.split('.').map(Number);
    return am - bm || an - bn;
  });
}

const versions = Object.keys(VERSION_SPECS).map((id) => ({
  id,
  fileName: `CloudDesk_MSA_${id}.docx`,
  author: VERSION_META[id].author,
  sentAt: VERSION_META[id].sentAt,
  dealIdTag: VERSION_META[id].tag,
  declaredTrackedChanges: VERSION_META[id].declared,
  clauses: buildClauses(VERSION_SPECS[id]),
}));

/* ================================================================== */
/* §5.5 Ledger at demo start                                           */
/* ================================================================== */

const src = (o: Partial<Record<string, unknown>>) => o;

const ledgerInitial = [
  {
    id: 'R-term', dealId: 'D-CLOUDDESK', termKey: 'term', label: 'Term',
    position: { kind: 'term', years: 3 },
    state: 'agreed',
    source: src({ kind: 'email', messageId: 'M5', quote: 'OK on 60 days if you sign for 3 years', at: '2026-11-10T09:15:00+05:30', byPersonId: 'rohan' }),
    reason: 'Traded for 60-day payment',
    approvedBy: {
      personId: 'neha',
      source: src({ kind: 'email', messageId: 'M6', quote: 'provided the price is fixed for the term', at: '2026-11-12T17:30:00+05:30', byPersonId: 'neha' }),
      condition: 'provided the price is fixed for the term',
    },
    history: [
      { at: '2026-11-03T16:05:00+05:30', text: 'We offered a 3-year term if the price is fixed.', source: src({ kind: 'email', messageId: 'M2', quote: 'We could look at a 3-year term if the price is fixed', at: '2026-11-03T16:05:00+05:30', byPersonId: 'ananya' }) },
      { at: '2026-11-10T09:15:00+05:30', text: 'CloudDesk agreed: 3 years, traded for 60-day payment.', source: src({ kind: 'email', messageId: 'M5', quote: 'OK on 60 days if you sign for 3 years', at: '2026-11-10T09:15:00+05:30', byPersonId: 'rohan' }) },
      { at: '2026-11-12T17:30:00+05:30', text: 'Neha Kapoor approved the commitment, on condition the price is fixed.', source: src({ kind: 'email', messageId: 'M6', quote: 'provided the price is fixed for the term', at: '2026-11-12T17:30:00+05:30', byPersonId: 'neha' }) },
    ],
    threats: [],
    supplierNote: 'Reflects the 3-year term agreed in your email of 10 Nov.',
    owner: 'commercial',
  },
  {
    id: 'R-price', dealId: 'D-CLOUDDESK', termKey: 'price', label: 'Annual price',
    position: { kind: 'price', wording: 'fixed' },
    state: 'open',
    source: src({ kind: 'email', messageId: 'M2', quote: "We'd like the price fixed for the term", at: '2026-11-03T16:05:00+05:30', byPersonId: 'ananya' }),
    history: [
      { at: '2026-11-01T11:20:00+05:30', text: 'CloudDesk opened with its standard yearly revision.', source: src({ kind: 'email', messageId: 'M1', quote: 'Pricing moves to our standard yearly revision', at: '2026-11-01T11:20:00+05:30', byPersonId: 'rohan' }) },
      { at: '2026-11-03T16:05:00+05:30', text: 'We asked for the price to be fixed for the term.', source: src({ kind: 'email', messageId: 'M2', quote: "We'd like the price fixed for the term", at: '2026-11-03T16:05:00+05:30', byPersonId: 'ananya' }) },
      { at: '2026-11-06T12:40:00+05:30', text: 'CloudDesk held its position in v3, clause 9.1.', source: src({ kind: 'version', versionId: 'v3', clauseNo: '9.1', quote: 'Supplier may revise the Fees once in each contract year by written notice.', at: '2026-11-06T12:40:00+05:30', byPersonId: 'rohan' }) },
    ],
    threats: [
      {
        id: 'TH-price-v3', kind: 'supplier_ask',
        value: { kind: 'price', wording: 'open_yearly', fromYear: 2 },
        source: src({ kind: 'version', versionId: 'v3', clauseNo: '9.1', quote: 'Supplier may revise the Fees once in each contract year by written notice.', at: '2026-11-06T12:40:00+05:30', byPersonId: 'rohan' }),
        active: true,
      },
    ],
    supplierNote: 'Reflects the fixed pricing agreed in your email of 14 Nov.',
    owner: 'commercial',
  },
  {
    id: 'R-payment', dealId: 'D-CLOUDDESK', termKey: 'payment', label: 'Payment terms',
    position: { kind: 'payment', days: 60 },
    state: 'agreed',
    source: src({ kind: 'email', messageId: 'M5', quote: 'OK on 60 days if you sign for 3 years', at: '2026-11-10T09:15:00+05:30', byPersonId: 'rohan' }),
    reason: 'Traded for the 3-year term',
    approvedBy: { personId: 'ananya', source: src({ kind: 'manual', quote: 'Within the procurement lead\'s own limit', at: '2026-11-10T09:20:00+05:30', byPersonId: 'ananya' }) },
    history: [
      { at: '2026-11-03T16:05:00+05:30', text: 'We asked for payment in 60 days.', source: src({ kind: 'email', messageId: 'M2', quote: 'payment in 60 days', at: '2026-11-03T16:05:00+05:30', byPersonId: 'ananya' }) },
      { at: '2026-11-10T09:15:00+05:30', text: 'CloudDesk agreed to 60 days against a 3-year term.', source: src({ kind: 'email', messageId: 'M5', quote: 'OK on 60 days if you sign for 3 years', at: '2026-11-10T09:15:00+05:30', byPersonId: 'rohan' }) },
    ],
    threats: [],
    supplierNote: 'Reflects the 60-day payment terms agreed in your email of 10 Nov.',
    owner: 'commercial',
  },
  {
    id: 'R-credit', dealId: 'D-CLOUDDESK', termKey: 'service_credit', label: 'Service credit',
    position: { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 },
    state: 'open',
    source: src({ kind: 'email', messageId: 'M7', quote: 'we need 10% of the monthly fee for any month below 99.5% uptime', at: '2026-11-13T10:10:00+05:30', byPersonId: 'ananya' }),
    history: [
      { at: '2026-11-03T16:05:00+05:30', text: 'We asked for 10% credits below 99.5% uptime.', source: src({ kind: 'email', messageId: 'M2', quote: '10% service credits for any month below 99.5% uptime', at: '2026-11-03T16:05:00+05:30', byPersonId: 'ananya' }) },
      { at: '2026-11-13T10:10:00+05:30', text: 'We restated 10% after v3 came back at 5%.', source: src({ kind: 'email', messageId: 'M7', quote: 'we need 10% of the monthly fee for any month below 99.5% uptime', at: '2026-11-13T10:10:00+05:30', byPersonId: 'ananya' }) },
    ],
    threats: [
      {
        id: 'TH-credit-v3', kind: 'supplier_ask',
        value: { kind: 'service_credit', pct: 5, uptimeTarget: 99.5 },
        source: src({ kind: 'version', versionId: 'v3', clauseNo: '11.2', quote: "Supplier shall credit 5 percent (5%) of that month's Fees against the next invoice.", at: '2026-11-06T12:40:00+05:30', byPersonId: 'rohan' }),
        active: true,
      },
    ],
    supplierNote: 'Reflects the 10% service credit confirmed on 16 Nov.',
    owner: 'commercial',
  },
  {
    id: 'R-liability', dealId: 'D-CLOUDDESK', termKey: 'liability_cap', label: 'Liability cap',
    position: { kind: 'liability_cap', months: 12 },
    state: 'agreed',
    source: src({ kind: 'version', versionId: 'v3', clauseNo: '12.1', quote: 'shall not exceed the Fees paid or payable in the 12 (twelve) months before the claim', at: '2026-11-06T12:40:00+05:30', byPersonId: 'rohan' }),
    reason: 'Legal standard',
    approvedBy: {
      personId: 'arjun',
      source: src({ kind: 'email', messageId: 'M4', quote: "Liability cap at 12 months' fees is fine from Legal", at: '2026-11-07T15:10:00+05:30', byPersonId: 'arjun' }),
    },
    history: [
      { at: '2026-11-03T16:05:00+05:30', text: 'We marked the cap up from 6 to 12 months in v2.', source: src({ kind: 'version', versionId: 'v2', clauseNo: '12.1', quote: 'shall not exceed the Fees paid or payable in the 12 (twelve) months before the claim', at: '2026-11-03T16:05:00+05:30', byPersonId: 'ananya' }) },
      { at: '2026-11-07T15:10:00+05:30', text: 'Legal approved the 12-month cap.', source: src({ kind: 'email', messageId: 'M4', quote: "Liability cap at 12 months' fees is fine from Legal", at: '2026-11-07T15:10:00+05:30', byPersonId: 'arjun' }) },
    ],
    threats: [],
    supplierNote: 'Reflects the liability cap in your draft of 6 Nov.',
    owner: 'legal',
  },
  {
    id: 'R-notice', dealId: 'D-CLOUDDESK', termKey: 'renewal_notice', label: 'Renewal notice',
    position: { kind: 'renewal_notice', days: 30 },
    state: 'agreed',
    source: src({ kind: 'version', versionId: 'v3', clauseNo: '14.2', quote: "unless either party gives 30 (thirty) days' written notice", at: '2026-11-06T12:40:00+05:30', byPersonId: 'rohan' }),
    reason: 'Keeps the exit window short. Unchanged since v1 and the same as the current contract.',
    approvedBy: { personId: 'ananya', source: src({ kind: 'manual', quote: 'Within the procurement lead\'s own limit', at: '2026-11-06T13:00:00+05:30', byPersonId: 'ananya' }) },
    history: [
      { at: '2026-11-01T11:20:00+05:30', text: 'v1 carried the 30-day notice from the current contract.', source: src({ kind: 'version', versionId: 'v1', clauseNo: '14.2', quote: "unless either party gives 30 (thirty) days' written notice", at: '2026-11-01T11:20:00+05:30', byPersonId: 'rohan' }) },
      { at: '2026-11-06T12:40:00+05:30', text: 'Unchanged in v3.', source: src({ kind: 'version', versionId: 'v3', clauseNo: '14.2', quote: "unless either party gives 30 (thirty) days' written notice", at: '2026-11-06T12:40:00+05:30', byPersonId: 'rohan' }) },
    ],
    threats: [],
    supplierNote: 'Restores the 30-day notice in your drafts of 1 Nov and 6 Nov.',
    owner: 'commercial',
  },
  {
    id: 'R-exit', dealId: 'D-CLOUDDESK', termKey: 'exit_support', label: 'Exit support',
    position: { kind: 'exit_support', days: 30, free: true },
    state: 'agreed',
    source: src({ kind: 'email', messageId: 'M5', quote: '30 days of exit support at no charge works for us', at: '2026-11-10T09:15:00+05:30', byPersonId: 'rohan' }),
    approvedBy: { personId: 'ananya', source: src({ kind: 'manual', quote: 'Within the procurement lead\'s own limit', at: '2026-11-10T09:20:00+05:30', byPersonId: 'ananya' }) },
    history: [
      { at: '2026-11-10T09:15:00+05:30', text: 'CloudDesk agreed to 30 days of free exit support.', source: src({ kind: 'email', messageId: 'M5', quote: '30 days of exit support at no charge works for us', at: '2026-11-10T09:15:00+05:30', byPersonId: 'rohan' }) },
    ],
    threats: [],
    supplierNote: 'Reflects the exit support agreed in your email of 10 Nov.',
    owner: 'commercial',
  },
];

/* ================================================================== */
/* Wording library (§8.6) and deals (§7.2)                             */
/* ================================================================== */

const wordingLibrary = {
  term: 'The Initial Term is {n} ({words}) year(s) from 1 December 2026.',
  price_fixed: feesFixed,
  price_open_yearly: feesOpen,
  price_capped:
    'The Fees are INR 12,000 per Seat per year for 500 Seats (INR 60,00,000 per year). Supplier may revise the Fees once in each contract year from the start of contract year {fromYear} by no more than {capPct} percent ({capPct}%).',
  payment: 'Customer shall pay each undisputed invoice within {n} ({words}) days of receipt.',
  service_credit:
    "If Availability in any month falls below {target}%, Supplier shall credit {p} percent ({p}%) of that month's Fees against the next invoice.",
  liability_cap:
    "Each party's total liability under this Agreement shall not exceed the Fees paid or payable in the {n} ({words}) months before the claim.",
  renewal_notice:
    "This Agreement renews for successive one (1) year terms unless either party gives {n} ({words}) days' written notice before the end of the then-current term.",
  exit_support_free: exitFree,
  exit_support_paid: exitPaid,
};

const deals = [
  {
    id: 'D-CLOUDDESK', supplier: 'CloudDesk', supplierDomain: 'clouddesk.example',
    supplierType: 'software', annualFeeInr: 6000000, seats: 500, termYears: 3,
    termStart: '2026-12-01', ownerId: 'ananya', businessOwnerId: 'vikram',
    stage: 'rounds', interactive: true, dealIdTag: TAG,
  },
  { id: 'D-SWIFTSHIP', supplier: 'SwiftShip Logistics', supplierDomain: 'swiftship.example', supplierType: 'logistics', annualFeeInr: 3600000, termYears: 2, termStart: '2027-01-01', ownerId: 'ananya', stage: 'rounds', interactive: false, dealIdTag: 'DL-SWIFTSHIP-2026', display: { round: 3, threads: 4, rows: { agreed: 4, open: 2, needs: 1, reopened: 0 }, atRiskLakh: 3.6 } },
  { id: 'D-NIMBUS', supplier: 'Nimbus HR Cloud', supplierDomain: 'nimbushr.example', supplierType: 'software', annualFeeInr: 2400000, termYears: 2, termStart: '2027-02-01', ownerId: 'ananya', stage: 'rounds', interactive: false, display: { round: 2, threads: 3, rows: { agreed: 3, open: 3, needs: 0, reopened: 1 }, atRiskLakh: 2.9 } },
  { id: 'D-BRIGHTSTAFF', supplier: 'BrightStaff Services', supplierDomain: 'brightstaff.example', supplierType: 'staffing', annualFeeInr: 8500000, termYears: 2, termStart: '2026-12-15', ownerId: 'karan', stage: 'signing', interactive: false, display: { round: 5, threads: 6, rows: { agreed: 6, open: 0, needs: 0, reopened: 0 }, atRiskLakh: 4.2 } },
  { id: 'D-CLEANCO', supplier: 'CleanCo Facilities', supplierDomain: 'cleanco.example', supplierType: 'facilities', annualFeeInr: 1800000, termYears: 3, termStart: '2027-01-01', ownerId: 'karan', stage: 'rounds', interactive: false, display: { round: 4, threads: 2, rows: { agreed: 5, open: 1, needs: 0, reopened: 0 }, atRiskLakh: 0.9 } },
  { id: 'D-DATAVAULT', supplier: 'DataVault', supplierDomain: 'datavault.example', supplierType: 'software', annualFeeInr: 3000000, termYears: 3, termStart: '2027-03-01', ownerId: 'ananya', stage: 'rounds', interactive: false, display: { round: 1, threads: 2, rows: { agreed: 1, open: 5, needs: 0, reopened: 0 }, atRiskLakh: 2.4 } },
  { id: 'D-HELPHUB', supplier: 'HelpHub', supplierDomain: 'helphub.example', supplierType: 'software', annualFeeInr: 1200000, termYears: 2, termStart: '2026-12-01', ownerId: 'meera', stage: 'signing', interactive: false, display: { round: 4, threads: 3, rows: { agreed: 5, open: 0, needs: 1, reopened: 0 }, atRiskLakh: 0.8 } },
  { id: 'D-CLOUDOPS', supplier: 'CloudOps Suite', supplierDomain: 'cloudops.example', supplierType: 'software', annualFeeInr: 4200000, termYears: 3, termStart: '2027-04-01', ownerId: 'meera', stage: 'rounds', interactive: false, display: { round: 2, threads: 3, rows: { agreed: 2, open: 4, needs: 0, reopened: 0 }, atRiskLakh: 3.1 } },
  { id: 'D-PIXELFORGE', supplier: 'PixelForge Agency', supplierDomain: 'pixelforge.example', supplierType: 'marketing', annualFeeInr: 2800000, termYears: 1, termStart: '2027-01-01', ownerId: 'karan', stage: 'rounds', interactive: false, display: { round: 3, threads: 2, rows: { agreed: 3, open: 2, needs: 0, reopened: 1 }, atRiskLakh: 1.6 } },
  { id: 'D-TRANSITONE', supplier: 'TransitOne Fleet', supplierDomain: 'transitone.example', supplierType: 'logistics', annualFeeInr: 2200000, termYears: 2, termStart: '2027-02-01', ownerId: 'meera', stage: 'rounds', interactive: false, display: { round: 2, threads: 2, rows: { agreed: 2, open: 3, needs: 0, reopened: 0 }, atRiskLakh: 1.1 } },
  { id: 'D-KAVERI', supplier: 'Kaveri Consulting', supplierDomain: 'kaveri.example', supplierType: 'consultants', annualFeeInr: 1500000, termYears: 1, termStart: '2026-12-01', ownerId: 'karan', stage: 'signing', interactive: false, display: { round: 4, threads: 2, rows: { agreed: 4, open: 0, needs: 0, reopened: 0 }, atRiskLakh: 0.5 } },
  { id: 'D-SECUREGATE', supplier: 'SecureGate Facilities', supplierDomain: 'securegate.example', supplierType: 'facilities', annualFeeInr: 900000, termYears: 2, termStart: '2027-03-01', ownerId: 'meera', stage: 'rounds', interactive: false, display: { round: 1, threads: 1, rows: { agreed: 1, open: 3, needs: 0, reopened: 0 }, atRiskLakh: 0.3 } },
];

/* ================================================================== */
/* §7.3 Dashboard and insights sample data                             */
/* ================================================================== */

const kpiHistory = {
  northStar: [
    { quarter: 'Jan–Mar 2026', clean: 9, audited: 18 },
    { quarter: 'Apr–Jun 2026', clean: 11, audited: 19 },
    { quarter: 'Jul–Sep 2026', clean: 13, audited: 20 },
  ],
  nextAudit: 'Jan 2027',
  signedSinceLastAudit: 3,
  prePilotMedianDays: 9,
};

const termsFound = {
  windowMonths: 6,
  totalTerms: 214,
  split: [
    { source: 'Word versions', pct: 58 },
    { source: 'Supplier email text', pct: 27 },
    { source: 'Side threads', pct: 9 },
    { source: 'Call notes', pct: 6 },
  ],
};

const signingGaps = {
  window: 'Jun–Nov 2026',
  byTerm: [
    { term: 'Price', fixed: 6, waived: 1 },
    { term: 'Payment', fixed: 4, waived: 1 },
    { term: 'Renewal notice', fixed: 6, waived: 0 },
    { term: 'Service credits', fixed: 3, waived: 1 },
    { term: 'Other', fixed: 2, waived: 1 },
  ],
};

const sendWarnings = {
  months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  shown: [3, 5, 4, 7, 6, 5],
  loopedInShare: [0.33, 0.4, 0.5, 0.57, 0.67, 0.6],
};

const guardrails = {
  months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  rowsNeedingConfirmationPerDeal: [1.6, 1.4, 1.3, 1.2, 1.2, 1.1],
  quarters: ['Jan–Mar 2026', 'Apr–Jun 2026', 'Jul–Sep 2026'],
  medianDaysFinalEmailToSignature: [9, 7, 6],
};

/* ================================================================== */

console.log('Writing hand-authored seed files…');
write('people.json', people);
write('threads.json', [...threads, ...fillerThreads]);
write('messages.json', messages);
write('versions.json', versions);
write('ledger_initial.json', ledgerInitial);
write('wording_library.json', wordingLibrary);
write('deals.json', deals);
write('kpi_history.json', kpiHistory);
write('terms_found.json', termsFound);
write('signing_gaps.json', signingGaps);
write('send_warnings.json', sendWarnings);
write('guardrails.json', guardrails);
console.log('Done.');
