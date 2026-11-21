'use client';

import { X } from 'lucide-react';
import { useSourceDrawer } from '@/lib/drawer';
import { messageById, personByEmail, personName, versionById, versions } from '@/lib/data';
import { formatDateTime } from '@/lib/format';
import { diffVersions, wordDiff } from '@/lib/engines/diff';
import type { SourceRef } from '@/lib/types';

/** Highlight the quoted sentence inside the body. */
function Highlighted({ body, quote }: { body: string; quote: string }) {
  const at = body.toLowerCase().indexOf(quote.toLowerCase());
  if (at < 0 || !quote) return <>{body}</>;
  return (
    <>
      {body.slice(0, at)}
      <mark className="rounded bg-mint px-[2px] py-[1px] text-ink">
        {body.slice(at, at + quote.length)}
      </mark>
      {body.slice(at + quote.length)}
    </>
  );
}

function EmailSource({ source }: { source: SourceRef }) {
  const m = source.messageId ? messageById(source.messageId) : undefined;
  if (!m) return <p className="text-[12.5px] text-muted">This email is unavailable.</p>;
  const from = personByEmail(m.from);

  return (
    <div>
      <h3 className="text-[15px] text-ink">{m.subject}</h3>
      <dl className="mt-3 space-y-1.5 border-b border-line pb-4 text-[12px]">
        <Row label="From">
          {from?.name ?? m.from} <span className="text-muted">&lt;{m.from}&gt;</span>
        </Row>
        <Row label="To">{m.to.join(', ')}</Row>
        {m.cc.length > 0 && <Row label="Cc">{m.cc.join(', ')}</Row>}
        <Row label="Sent">{formatDateTime(m.sentAt)}</Row>
        {m.attachments.length > 0 && (
          <Row label="Attached">{m.attachments.map((a) => a.fileName).join(', ')}</Row>
        )}
      </dl>
      <p className="mt-4 whitespace-pre-wrap text-[13px] leading-[21px] text-ink">
        <Highlighted body={m.body} quote={source.quote} />
      </p>
      <p className="mt-5 rounded-lg bg-page p-3 text-[11.5px] leading-[17px] text-muted">
        The highlighted words are the exact text the ledger stores as the source for this term. A
        quote that cannot be found in the message is dropped before anything is written.
      </p>
    </div>
  );
}

function VersionSource({ source }: { source: SourceRef }) {
  const version = source.versionId ? versionById(source.versionId) : undefined;
  const clause = version?.clauses.find((c) => c.no === source.clauseNo);
  if (!version || !clause) {
    return <p className="text-[12.5px] text-muted">This clause is unavailable.</p>;
  }

  const ordered = [...versions].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const idx = ordered.findIndex((v) => v.id === version.id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const change = prev
    ? diffVersions(prev, version).find((c) => c.clauseNo === clause.no)
    : undefined;

  return (
    <div>
      <h3 className="text-[15px] text-ink">
        Clause {clause.no} · {clause.title}
      </h3>
      <p className="mt-1 text-[12px] text-muted">
        {version.fileName} · {version.author === 'supplier' ? 'CloudDesk' : 'Meridian Foods'} ·{' '}
        {formatDateTime(version.sentAt)}
      </p>

      {change?.hidden && (
        <p className="mt-3 inline-flex rounded-md bg-amber-bg px-2.5 py-1 text-[11.5px] font-medium text-amber-fg">
          Hidden edit: not shown as a tracked change
        </p>
      )}

      <div className="mt-4 rounded-lg border border-line bg-page p-4 text-[13px] leading-[21px] text-ink">
        {clause.text}
      </div>

      {change && prev && (
        <>
          <p className="mt-5 text-[11px] uppercase tracking-wide text-muted">
            What changed since {prev.id}
          </p>
          <div className="mt-2 rounded-lg border border-line p-4 text-[13px] leading-[22px]">
            {wordDiff(change.before, change.after).map((part, i) => (
              <span
                key={i}
                className={
                  part.added
                    ? 'bg-mint/60 text-teal-900 underline decoration-teal-900/40'
                    : part.removed
                      ? 'bg-danger/10 text-danger line-through'
                      : 'text-ink'
                }
              >
                {part.value}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NoteSource({ source }: { source: SourceRef }) {
  return (
    <div>
      <h3 className="text-[15px] text-ink">
        {source.kind === 'call_note' ? 'Call note' : 'Noted by hand'}
      </h3>
      <p className="mt-1 text-[12px] text-muted">
        {personName(source.byPersonId)} · {formatDateTime(source.at)}
      </p>
      <div className="mt-4 rounded-lg border border-line bg-page p-4 text-[13px] leading-[21px] text-ink">
        {source.quote}
      </div>
      <p className="mt-5 rounded-lg bg-page p-3 text-[11.5px] leading-[17px] text-muted">
        A person wrote this. It is kept beside the email so anyone reading the ledger later can see
        how the term was settled, not just what it says.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-ink">{children}</dd>
    </div>
  );
}

export function SourceDrawerBody({ source }: { source: SourceRef }) {
  if (source.kind === 'email') return <EmailSource source={source} />;
  if (source.kind === 'version') return <VersionSource source={source} />;
  return <NoteSource source={source} />;
}

/** The docked drawer used across the Sirion platform. */
export function SourceDrawer() {
  const { source, inline, close } = useSourceDrawer();
  if (!source || inline) return null;

  return (
    <div className="ds-scope fixed inset-0 z-[120] flex justify-end">
      <button aria-label="Close" onClick={close} className="absolute inset-0 bg-ink/20" />
      <aside className="dl-slide-in relative flex h-full w-[420px] max-w-full flex-col border-l border-line bg-white shadow-drawer">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Source</p>
          <button
            onClick={close}
            className="rounded p-1.5 text-muted transition-colors hover:bg-page hover:text-ink"
          >
            <X size={15} />
          </button>
        </header>
        <div className="thin-scroll flex-1 overflow-y-auto px-5 py-5">
          <SourceDrawerBody source={source} />
        </div>
      </aside>
    </div>
  );
}
