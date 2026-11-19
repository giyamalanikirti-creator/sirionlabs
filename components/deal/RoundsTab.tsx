'use client';

import { FileText, Mail } from 'lucide-react';
import { SirionCard } from '@/components/sirion/ui';
import { SourceChip } from '@/components/sirion/SourceChip';
import { messageById, versionById, personName } from '@/lib/data';
import { formatDateTime } from '@/lib/format';
import type { LedgerRow } from '@/lib/types';

/** The six rounds of this negotiation, in order (§10.3). */
const ROUNDS = [
  { no: 1, at: '2026-11-01T11:20:00+05:30', kind: 'version', ref: 'v1', messageId: 'M1', who: 'rohan' },
  { no: 2, at: '2026-11-06T12:40:00+05:30', kind: 'version', ref: 'v3', messageId: 'M3', who: 'rohan' },
  { no: 3, at: '2026-11-10T09:15:00+05:30', kind: 'email', ref: 'M5', messageId: 'M5', who: 'rohan' },
  { no: 4, at: '2026-11-14T10:05:00+05:30', kind: 'version', ref: 'v4', messageId: 'M8', who: 'rohan' },
  { no: 5, at: '2026-11-16T17:45:00+05:30', kind: 'email', ref: 'M12', messageId: 'M12', who: 'rohan' },
  { no: 6, at: '2026-11-19T09:30:00+05:30', kind: 'version', ref: 'v6', messageId: 'M14', who: 'priya' },
] as const;

export function RoundsTab({ rows }: { rows: LedgerRow[] }) {
  /** Which terms moved in each round, read from the rows' own history. */
  const movedIn = (at: string) =>
    rows
      .filter((r) => r.history.some((h) => h.at === at))
      .map((r) => ({
        label: r.label,
        text: r.history.find((h) => h.at === at)!.text,
      }));

  return (
    <SirionCard
      title="Rounds"
      caption="Each exchange that moved a term, whether it arrived as a document or as a sentence in an email."
    >
      <ol className="relative space-y-6 border-l border-line pl-6">
        {ROUNDS.map((round) => {
          const moved = movedIn(round.at);
          const message = messageById(round.messageId);
          const version = round.kind === 'version' ? versionById(round.ref) : undefined;
          const isLive = new Date(round.at) <= new Date();
          return (
            <li key={round.no} className="relative">
              <span
                className={`absolute -left-[31px] top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-semibold ${
                  isLive ? 'bg-teal-900 text-white' : 'bg-page text-muted'
                }`}
              >
                {round.no}
              </span>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[13.5px] font-medium text-ink">
                  Round {round.no} · {formatDateTime(round.at)}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted">
                  {round.kind === 'version' ? <FileText size={12} /> : <Mail size={12} />}
                  {round.kind === 'version' ? version?.fileName : 'Email'} ·{' '}
                  {personName(round.who)}
                </span>
              </div>

              {message && (
                <p className="mt-1.5 max-w-2xl text-[12.5px] leading-[19px] text-muted">
                  “{message.body}”
                </p>
              )}

              {moved.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {moved.map((m) => (
                    <li
                      key={m.label}
                      className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]"
                    >
                      <span className="font-medium text-ink">{m.label}:</span>
                      <span className="text-muted">{m.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] text-muted">
                  Nothing on the ledger moved in this round.
                </p>
              )}

              {message && (
                <div className="mt-2">
                  <SourceChip
                    source={{
                      kind: 'email',
                      messageId: message.id,
                      quote: '',
                      at: message.sentAt,
                      byPersonId: round.who,
                    }}
                    label="Open the email"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </SirionCard>
  );
}
