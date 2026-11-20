// Typed access to the seed data. Everything else imports from here.
import peopleJson from '@/data/people.json';
import threadsJson from '@/data/threads.json';
import messagesJson from '@/data/messages.json';
import versionsJson from '@/data/versions.json';
import ledgerInitialJson from '@/data/ledger_initial.json';
import dealsJson from '@/data/deals.json';
import kpiHistoryJson from '@/data/kpi_history.json';
import termsFoundJson from '@/data/terms_found.json';
import signingGapsJson from '@/data/signing_gaps.json';
import sendWarningsJson from '@/data/send_warnings.json';
import guardrailsJson from '@/data/guardrails.json';
import contractsJson from '@/data/contracts.json';

import type {
  Deal,
  DocVersion,
  EmailMessage,
  LedgerRow,
  PastContract,
  Person,
  Thread,
} from '@/lib/types';
import { DEMO_DEAL_ID } from '@/lib/settings';

export const people = peopleJson as Person[];
export const threads = threadsJson as Thread[];
export const messages = messagesJson as unknown as EmailMessage[];
export const versions = versionsJson as unknown as DocVersion[];
export const ledgerInitial = ledgerInitialJson as unknown as LedgerRow[];
export const deals = dealsJson as unknown as Deal[];
export const pastContracts = contractsJson as PastContract[];

export const kpiHistory = kpiHistoryJson;
export const termsFound = termsFoundJson;
export const signingGapsData = signingGapsJson;
export const sendWarnings = sendWarningsJson;
export const guardrails = guardrailsJson;

export const cloudDeskDeal = deals.find((d) => d.id === DEMO_DEAL_ID)!;

export const personById = (id: string): Person | undefined => people.find((p) => p.id === id);
export const personByEmail = (email: string): Person | undefined =>
  people.find((p) => p.email.toLowerCase() === email.toLowerCase());
export const personName = (id: string): string => personById(id)?.name ?? id;

/**
 * Scripted replies that arrive in response to something the user does in the
 * demo (they are not in the seeded inbox). The source drawer can still open them.
 */
export const CLARIFY_REPLY: EmailMessage = {
  id: 'M12R',
  threadId: 'T1',
  from: 'rohan.iyer@clouddesk.example',
  to: ['ananya.rao@meridian.example'],
  cc: ['priya.nair@clouddesk.example'],
  subject: 'RE: CloudDesk renewal 2026–29',
  sentAt: '2026-11-16T18:20:00+05:30',
  attachments: [],
  body:
    'Sorry for the confusion, Ananya. We accept the 10% service credit for any month below 99.5% uptime, as you proposed on 13 Nov. Rohan',
  mailboxes: ['ananya'],
};
export const CLARIFY_REPLY_QUOTE = 'We accept the 10% service credit for any month below 99.5% uptime';

const EXTRA_MESSAGES: EmailMessage[] = [CLARIFY_REPLY];
export function registerExtraMessages(list: EmailMessage[]) {
  for (const m of list) if (!EXTRA_MESSAGES.some((x) => x.id === m.id)) EXTRA_MESSAGES.push(m);
}

export const messageById = (id: string): EmailMessage | undefined =>
  messages.find((m) => m.id === id) ?? EXTRA_MESSAGES.find((m) => m.id === id);
export const versionById = (id: string): DocVersion | undefined => versions.find((v) => v.id === id);
export const threadById = (id: string): Thread | undefined => threads.find((t) => t.id === id);
export const dealById = (id: string): Deal | undefined => deals.find((d) => d.id === id);

export const SUPPLIER_PERSON_IDS = people
  .filter((p) => p.org === 'clouddesk')
  .map((p) => p.id);
export const OUR_PERSON_IDS = people.filter((p) => p.org === 'meridian').map((p) => p.id);

/** Messages visible in a mailbox at a point on the demo clock. */
export function inboxFor(mailbox: string, clockIso: string): EmailMessage[] {
  return messages
    .filter((m) => m.mailboxes.includes(mailbox))
    .filter((m) => m.sentAt <= clockIso)
    .filter((m) => personByEmail(m.from)?.id !== mailbox)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/** Messages this mailbox has sent, by the demo clock. */
export function sentItemsFor(mailbox: string, clockIso: string): EmailMessage[] {
  const me = personById(mailbox);
  if (!me) return [];
  return messages
    .filter((m) => m.from.toLowerCase() === me.email.toLowerCase())
    .filter((m) => m.sentAt <= clockIso)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export const DEAL_THREAD_IDS = ['T1', 'T3', 'T4'];
