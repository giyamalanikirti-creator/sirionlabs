/**
 * Emails in Vikram's mailbox before the walkthrough's 18 Nov moment, so the
 * IT head's side of the story reads on its own: why procurement leads the
 * commercials, CloudDesk's own report of the October outages, and an IT
 * supplier proposal he is copied on.
 */
import type { EmailMessage } from '@/lib/types';
import { deepShift } from '@/lib/demo/timeShift';

export const IT_MAIL: EmailMessage[] = deepShift([
  {
    id: 'V1',
    threadId: 'TV1',
    from: 'ananya.rao@meridian.example',
    to: ['vikram.shah@meridian.example'],
    cc: [],
    subject: 'CloudDesk renewal: where we are',
    sentAt: '2026-11-12T09:10:00+05:30',
    attachments: [],
    body:
      "Hi Vikram, a quick note on the CloudDesk renewal. I'm leading the commercials with Rohan. Pricing fixed for the full three years is the condition Neha approved the commitment on, so please don't agree anything on price, notice or payment in your threads with CloudDesk. If Rohan raises any of it, copy me and I'll pick it up. Uptime and onboarding questions are all yours. Thanks, Ananya",
    mailboxes: ['vikram'],
  },
  {
    id: 'V2',
    threadId: 'TV2',
    from: 'status@clouddesk.example',
    to: ['vikram.shah@meridian.example'],
    cc: [],
    subject: 'CloudDesk incident report: October',
    sentAt: '2026-11-13T08:30:00+05:30',
    attachments: [],
    body:
      'Monthly availability for Meridian Foods in October was 99.12%, below the 99.5% target. Two incidents on 9 and 23 October affected sign-in for up to 3 hours. Root-cause reports are attached to your service portal. CloudDesk Service Desk',
    mailboxes: ['vikram'],
  },
]);
