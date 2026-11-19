/**
 * Thread matcher — BUILD_SPEC §8.5.
 *
 * This function sees EmailHeader only. It has no parameter through which a
 * body could reach it, which is how the header-first privacy rule is kept
 * true by type rather than by discipline.
 */
import type { Deal, DocVersion, EmailHeader } from '@/lib/types';
import { CAPTURE_ADDRESS } from '@/lib/settings';

export const SIGNAL_WEIGHTS = {
  supplierDomain: 0.4,
  fingerprint: 0.3,
  dealIdTag: 0.2,
  subjectName: 0.1,
  captureAddress: 0.6,
} as const;

export type MatchStrength = 'strong' | 'weak' | 'none';

export interface MatchSignals {
  supplierDomain: boolean;
  fingerprint: boolean;
  dealIdTag: boolean;
  subjectName: boolean;
  captureAddress: boolean;
}

export interface MatchResult {
  dealId?: string;
  score: number;
  signals: MatchSignals;
  strength: MatchStrength;
}

export function strengthOf(score: number): MatchStrength {
  if (score >= 0.6) return 'strong';
  if (score >= 0.3) return 'weak';
  return 'none';
}

const domainOf = (address: string) => address.split('@')[1]?.toLowerCase() ?? '';

function scoreForDeal(
  headers: EmailHeader[],
  deal: Deal,
  fingerprintDeal: Map<string, string>,
): { score: number; signals: MatchSignals } {
  const addresses = headers.flatMap((h) => [h.from, ...h.to, ...h.cc]);
  const attachments = headers.flatMap((h) => h.attachments);
  const subjects = headers.map((h) => h.subject.toLowerCase()).join(' | ');

  const signals: MatchSignals = {
    supplierDomain: addresses.some((a) => domainOf(a) === deal.supplierDomain.toLowerCase()),
    fingerprint: attachments.some(
      (a) => a.fingerprint && fingerprintDeal.get(a.fingerprint) === deal.id,
    ),
    dealIdTag: Boolean(deal.dealIdTag) && attachments.some((a) => a.dealIdTag === deal.dealIdTag),
    subjectName: subjects.includes(deal.supplier.toLowerCase()),
    captureAddress: addresses.some((a) => a.toLowerCase() === CAPTURE_ADDRESS),
  };

  let score = 0;
  if (signals.supplierDomain) score += SIGNAL_WEIGHTS.supplierDomain;
  if (signals.fingerprint) score += SIGNAL_WEIGHTS.fingerprint;
  if (signals.dealIdTag) score += SIGNAL_WEIGHTS.dealIdTag;
  if (signals.subjectName) score += SIGNAL_WEIGHTS.subjectName;

  // The capture address only lifts a thread that already points at this deal.
  // Otherwise every mail copied to deals@ would match every open deal at 0.6.
  if (signals.captureAddress && score > 0) {
    score += SIGNAL_WEIGHTS.captureAddress;
  } else {
    signals.captureAddress = signals.captureAddress && score > 0;
  }

  return { score: Math.min(1, round2(score)), signals };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Match one thread's headers against the open deals. */
export function matchThread(
  headers: EmailHeader[],
  deals: Deal[],
  versions: DocVersion[],
  versionsDealId = 'D-CLOUDDESK',
): MatchResult {
  const fingerprintDeal = new Map<string, string>();
  versions.forEach((v) => fingerprintDeal.set(`fp-${v.id}`, versionsDealId));

  const active = deals.filter((d) => d.stage !== 'signed');

  let best: MatchResult = {
    score: 0,
    signals: {
      supplierDomain: false,
      fingerprint: false,
      dealIdTag: false,
      subjectName: false,
      captureAddress: false,
    },
    strength: 'none',
  };

  for (const deal of active) {
    const { score, signals } = scoreForDeal(headers, deal, fingerprintDeal);
    if (score > best.score) {
      best = { dealId: deal.id, score, signals, strength: strengthOf(score) };
    }
  }

  if (best.score === 0) return { ...best, dealId: undefined, strength: 'none' };
  return { ...best, strength: strengthOf(best.score) };
}

/** Convenience: match every thread in a set of headers, grouped by threadId. */
export function matchAllThreads(
  headers: EmailHeader[],
  deals: Deal[],
  versions: DocVersion[],
): Record<string, MatchResult> {
  const byThread = new Map<string, EmailHeader[]>();
  for (const h of headers) {
    const list = byThread.get(h.threadId) ?? [];
    list.push(h);
    byThread.set(h.threadId, list);
  }
  const out: Record<string, MatchResult> = {};
  for (const [threadId, hs] of byThread) {
    out[threadId] = matchThread(hs, deals, versions);
  }
  return out;
}

/** Strip a message down to a header. The only safe way to feed the matcher. */
export function toHeader(m: EmailHeader & { body?: string }): EmailHeader {
  return {
    id: m.id,
    threadId: m.threadId,
    from: m.from,
    to: m.to,
    cc: m.cc,
    subject: m.subject,
    sentAt: m.sentAt,
    attachments: m.attachments,
  };
}
