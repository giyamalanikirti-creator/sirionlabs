'use client';

/**
 * How Word recognises a file. 1) Sirion tag: connected, no prompt. 2) No tag:
 * compare clause text with known versions and offer to connect. 3) Nothing
 * matches: search Sirion or upload as a new contract.
 */
import { useState } from 'react';
import { Button, Input, MessageBar, MessageBarBody, tokens } from '@fluentui/react-components';
import { useDemo } from '@/lib/store';
import { messages, pastContracts, personByEmail, versions } from '@/lib/data';
import { closestVersion } from '@/lib/engines/fingerprint';
import { formatDateShort } from '@/lib/format';
import { CONTRACT_ID } from '@/lib/settings';
import type { DocVersion } from '@/lib/types';
import { Block } from './SirionBlocks';
import { usePaneStyles } from './paneStyles';

export type WordConnection = 'connected' | 'suggest' | 'search' | 'none';

export function WordConnect({
  version,
  state,
  onConnect,
  onState,
}: {
  version: DocVersion;
  state: Exclude<WordConnection, 'connected'>;
  onConnect: (how: 'fingerprint' | 'search') => void;
  onState: (s: WordConnection) => void;
}) {
  const s = usePaneStyles();
  const toast = useDemo((st) => st.toast);
  const logEvent = useDemo((st) => st.logEvent);
  const [query, setQuery] = useState('');
  const match = closestVersion(version, versions);
  const carrier = messages.find((m) => m.attachments.some((a) => a.versionId === version.id));
  const sender = carrier ? personByEmail(carrier.from) : undefined;

  if (state === 'suggest' && match) {
    return (
      <Block title="Not tagged by Sirion" kind="new" accent>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>This looks like the CloudDesk MSA</div>
        <p style={{ fontSize: 12.5, margin: '4px 0 0' }}>
          Closest to {match.versionId}
          {carrier ? `; received from ${sender?.name ?? carrier.from} on ${formatDateShort(carrier.sentAt)}` : ''}.
        </p>
        <p className={s.grey}>
          The file has no Sirion tag (it was re-saved outside Sirion), so its clause text was compared with the versions Sirion holds: {match.same} of{' '}
          {match.total} clauses are identical to {match.versionId}. Nothing else in the file is read.
        </p>
        <div className={s.actions}>
          <Button size="small" appearance="primary" onClick={() => onConnect('fingerprint')}>
            Connect as {version.id}
          </Button>
          <Button size="small" onClick={() => onState('search')}>Choose another contract</Button>
          <Button size="small" appearance="outline" onClick={() => onState('none')}>Not a Sirion contract</Button>
        </div>
      </Block>
    );
  }

  if (state === 'none') {
    return (
      <div>
        <MessageBar intent="info" style={{ marginBottom: 10 }}>
          <MessageBarBody>Not connected. Deal Ledger is off for this file; Word works as usual.</MessageBarBody>
        </MessageBar>
        <Button size="small" onClick={() => onState('search')}>Connect to a Sirion contract…</Button>
      </div>
    );
  }

  const results = [
    { id: CONTRACT_ID, name: 'CloudDesk MSA (negotiating)', scripted: true },
    ...pastContracts.map((c) => ({ id: c.id, name: c.name, scripted: false })),
  ].filter((c) => !query || `${c.id} ${c.name}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <Block title="Not connected to Sirion" kind="new" accent>
      <p className={s.grey} style={{ marginTop: 0 }}>No Sirion tag, and the clause text matches no version Sirion holds.</p>
      <Input size="small" placeholder="Search contracts" value={query} onChange={(_, d) => setQuery(d.value)} style={{ width: '100%', marginTop: 6 }} />
      <div style={{ marginTop: 6, maxHeight: 220, overflowY: 'auto' }}>
        {results.slice(0, 8).map((c) => (
          <div key={c.id} className={s.listRow}>
            <span className={s.listName}>
              <span style={{ display: 'block', fontWeight: 600 }}>{c.name}</span>
              <span className={s.listValue}>{c.id}</span>
            </span>
            <Button
              size="small"
              appearance={c.scripted ? 'primary' : 'subtle'}
              onClick={() => (c.scripted ? onConnect('search') : toast('Only the CloudDesk negotiation is scripted in this demo.'))}
            >
              Connect
            </Button>
          </div>
        ))}
      </div>
      <div className={s.actions}>
        <Button
          size="small"
          onClick={() => {
            logEvent(`${version.fileName} uploaded to Sirion as a new contract; intake prefilled from the file.`);
            toast('Uploaded to Sirion as a new contract record, with the intake prefilled from the file.');
          }}
        >
          Upload as a new contract
        </Button>
      </div>
      <p style={{ fontSize: 11, color: tokens.colorNeutralForeground3, marginTop: 6 }}>As Ironclad does: when the link is lost, reconnect by hand.</p>
    </Block>
  );
}
