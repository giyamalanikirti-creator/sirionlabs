import 'server-only';

/** Builds the plain-text context the AI routes send. */
import type { ClauseChange, EmailMessage, LedgerRow } from '@/lib/types';
import { people } from '@/lib/data';
import { plainValue, TERM_LABELS } from '@/lib/plain';
import { READER_MAX_BODY_CHARS } from '@/lib/settings';

export function ledgerSnapshot(rows: LedgerRow[]): string {
  return rows
    .map((r) => {
      const live = r.threats
        .filter((t) => t.active)
        .map((t) => `${t.kind}: ${plainValue(t.value)}`)
        .join('; ');
      return `- ${r.termKey} (${TERM_LABELS[r.termKey]}): our position ${plainValue(
        r.position,
      )}; state ${r.state}${live ? `; live offers against it — ${live}` : ''}`;
    })
    .join('\n');
}

export function peopleDirectory(): string {
  return people
    .map(
      (p) =>
        `- ${p.id}: ${p.name}, ${p.role}, ${
          p.org === 'clouddesk' ? 'SUPPLIER (the other side)' : 'OUR SIDE'
        }`,
    )
    .join('\n');
}

export function messagesBlock(messages: EmailMessage[]): string {
  return messages
    .map((m) => {
      const body = m.body.slice(0, READER_MAX_BODY_CHARS);
      return `--- messageId: ${m.id}
from: ${m.from}
to: ${m.to.join(', ')}
cc: ${m.cc.join(', ') || '(none)'}
sent: ${m.sentAt}
subject: ${m.subject}
body:
${body}
---`;
    })
    .join('\n');
}

export function diffBlock(changes: ClauseChange[]): string {
  if (!changes.length) return '';
  return changes
    .map(
      (c) =>
        `- clause ${c.clauseNo}${c.termKey ? ` (${c.termKey})` : ''}: ${
          c.hidden ? 'NOT declared as a tracked change. ' : ''
        }was "${c.before}" now "${c.after}"`,
    )
    .join('\n');
}
