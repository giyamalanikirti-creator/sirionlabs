'use client';

/**
 * How email gets connected, inside the Outlook pane: the first-run card, the
 * "Track this negotiation?" prompt, the mailbox-not-connected variant of the
 * side-thread card, the business owner's link notice, and the fail-open
 * notice when setup is not finished. Every prompt says what will be read.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Button, Checkbox, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle, tokens } from '@fluentui/react-components';
import { ArrowUndoRegular } from '@fluentui/react-icons';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal, messages, personById, personName, threadById } from '@/lib/data';
import { readByRules } from '@/lib/engines/previewRules';
import { CAPTURE_ADDRESS, CONTRACT_ID } from '@/lib/settings';
import { formatDateShort } from '@/lib/format';
import { Block, OriginTag } from './SirionBlocks';
import { usePaneStyles } from './paneStyles';

/** First time the pane opens for a user: one card, never shown again. */
export function FirstRunCard({ onDone }: { onDone?: () => void }) {
  const s = usePaneStyles();
  const seen = useDemo((st) => st.seeFirstRun);
  return (
    <Block title="What Deal Ledger reads in your mailbox" kind="new" accent>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: '18px' }}>
        <li>Supplier threads on live deals only.</li>
        <li>Never internal email.</li>
        <li>Only the quoted line is kept, never the whole email.</li>
      </ul>
      <div className={s.actions}>
        <Button
          size="small"
          appearance="primary"
          onClick={() => {
            seen();
            onDone?.();
          }}
        >
          Got it
        </Button>
        <Link href="/settings" style={{ fontSize: 12, alignSelf: 'center' }}>
          Privacy and admin
        </Link>
      </div>
      <p className={s.grey}>Signed in with your Microsoft account. Nothing to install: IT deployed the add-in.</p>
    </Block>
  );
}

/** "Track this negotiation in email?": asked once, of the deal owner, when a supplier email matches a record in Negotiating. */
export function TrackCard({ asOf, onTracked }: { asOf: string; onTracked: (summary: string) => void }) {
  const s = usePaneStyles();
  const trackDeal = useDemo((st) => st.trackDeal);
  const addPerson = useDemo((st) => st.addPersonToDeal);
  const neverTrack = useDemo((st) => st.neverTrack);
  const never = useDemo((st) => st.neverTrackDomains).includes(cloudDeskDeal.supplierDomain);
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [people, setPeople] = useState<string[]>([]);
  const owner = personById(cloudDeskDeal.ownerId)!;
  const business = personById(cloudDeskDeal.businessOwnerId ?? '')!;

  const thread = messages.filter((m) => m.threadId === 'T1' && m.sentAt <= asOf);
  const threads = new Set(thread.map((m) => m.threadId)).size;
  const terms = thread.flatMap((m) => readByRules(m.body));

  if (never) {
    return (
      <MessageBar intent="info" style={{ marginBottom: 10 }}>
        <MessageBarBody>Not tracked: you chose never to track {cloudDeskDeal.supplierDomain}.</MessageBarBody>
      </MessageBar>
    );
  }
  if (collapsed) {
    return (
      <p className={s.note}>
        <Button size="small" appearance="transparent" onClick={() => setCollapsed(false)}>
          Track this negotiation in email…
        </Button>
      </p>
    );
  }

  return (
    <Block title="Track this negotiation in email?" kind="new" accent>
      <p style={{ fontSize: 12.5, lineHeight: '18px', margin: 0 }}>
        Deal Ledger will read {cloudDeskDeal.supplier} threads ({cloudDeskDeal.supplierDomain}) in connected mailboxes, from when the record opened
        ({threads} thread, {thread.length} email so far). Internal email is never read.
      </p>
      <p style={{ fontSize: 12, margin: '8px 0 0' }}>
        On our side: {owner.name}
        {people.map((p) => `, ${personName(p)}`).join('')} ·{' '}
        <Button size="small" appearance="transparent" style={{ padding: 0, minWidth: 0 }} onClick={() => setAdding((v) => !v)}>
          add people
        </Button>
      </p>
      {adding && (
        <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: tokens.colorNeutralBackground3 }}>
          <Checkbox
            checked={people.includes(business.id)}
            onChange={(_, d) => setPeople(d.checked ? [business.id] : [])}
            label={`${business.name} (${business.role})`}
          />
          <div className={s.grey}>
            Adds {business.name.split(' ')[0]} to the connected mailboxes for {cloudDeskDeal.supplierDomain} only. They get an email: “{owner.name.split(' ')[0]} added you to the{' '}
            {cloudDeskDeal.supplier} negotiation. Deal Ledger will read your {cloudDeskDeal.supplier} threads only.” [Leave]
          </div>
        </div>
      )}
      <div className={s.actions}>
        <Button
          size="small"
          appearance="primary"
          onClick={() => {
            trackDeal(cloudDeskDeal.id, people);
            people.forEach((p) => addPerson(cloudDeskDeal.id, p));
            onTracked(`Tracking ${cloudDeskDeal.supplier}. ${thread.length} email read, ${terms.length} terms found.`);
          }}
        >
          Track negotiation
        </Button>
        <Button size="small" onClick={() => setCollapsed(true)}>Not now</Button>
        <Button size="small" appearance="subtle" onClick={() => neverTrack(cloudDeskDeal.supplierDomain)}>Never for this supplier</Button>
      </div>
      <p className={s.grey}>Asked once, of the deal owner. Matched to {CONTRACT_ID} by sender domain.</p>
    </Block>
  );
}

/** Slim banner once a negotiation is tracked. */
export function TrackedBanner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, padding: '4px 8px', marginBottom: 8, borderRadius: 4, background: tokens.colorBrandBackground2 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: tokens.colorBrandBackground }} />
      Tracked · {cloudDeskDeal.supplier} MSA ·{' '}
      <Link href="/deals/D-CLOUDDESK/ledger">Ledger</Link>
    </div>
  );
}

/** Step 2 when the business owner's mailbox is not connected: say so, and offer two ways in. */
export function NotConnectedCard({ onAskCopy }: { onAskCopy: () => void }) {
  const s = usePaneStyles();
  const addPerson = useDemo((st) => st.addPersonToDeal);
  const autoLink = useDemo((st) => st.autoLinkThread);
  const toast = useDemo((st) => st.toast);
  const vikram = personById('vikram')!;
  return (
    <Block title="Side thread" kind="new" accent>
      <p style={{ fontSize: 12.5, lineHeight: '18px', margin: 0 }}>
        Rohan mentions {vikram.name}. {vikram.name.split(' ')[0]}&apos;s mailbox isn&apos;t connected, so his side of the conversation can&apos;t be checked.
      </p>
      <div className={s.actions}>
        <Button size="small" appearance="primary" onClick={onAskCopy}>
          Ask {vikram.name.split(' ')[0]} to copy deals@
        </Button>
        <Button
          size="small"
          onClick={() => {
            addPerson(cloudDeskDeal.id, 'vikram');
            autoLink('T2');
            toast(`${vikram.name} added to this deal. Only his ${cloudDeskDeal.supplier} threads are read.`);
          }}
        >
          Add {vikram.name.split(' ')[0]} to this deal
        </Button>
      </div>
      <p className={s.grey}>Copying {CAPTURE_ADDRESS} links a thread with no add-in needed.</p>
    </Block>
  );
}

export const ASK_COPY_DRAFT = `Hi Vikram, Rohan mentioned your thread with him on CloudDesk uptime. Could you copy ${CAPTURE_ADDRESS} on it, so it's linked to the CloudDesk negotiation? Thanks, Ananya`;

/** The business owner is told, once, that one of their threads was linked. */
export function LinkNotice() {
  const linked = useDemo((st) => st.linkedThreadIds).includes('T2');
  const seen = useDemo((st) => st.linkNoticeSeen);
  const see = useDemo((st) => st.seeLinkNotice);
  const undo = useDemo((st) => st.undoLink);
  const toast = useDemo((st) => st.toast);
  if (!linked || seen) return null;
  const thread = threadById('T2');
  return (
    <MessageBar intent="info" layout="multiline" style={{ marginBottom: 10 }}>
      <MessageBarBody>
        <MessageBarTitle>Your thread was linked</MessageBarTitle>
        “{thread?.subject}” was linked to the {cloudDeskDeal.supplier} negotiation (owner {personName(cloudDeskDeal.ownerId)}). Only this thread is read.
      </MessageBarBody>
      <MessageBarActions>
        <Button size="small" onClick={see}>OK</Button>
        <Button
          size="small"
          icon={<ArrowUndoRegular />}
          onClick={() => {
            undo('T2');
            see();
            toast('Unlinked. Nothing from this thread stays in the ledger.');
          }}
        >
          Unlink
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}

/** Fail open: if setup is not finished, email works as usual and the pane says what is missing. */
export function SetupGapNotice({ gap }: { gap: 'not_enabled' | 'not_consented' | 'no_group' | 'not_deployed' }) {
  const s = usePaneStyles();
  const text = {
    not_enabled: 'Deal Ledger is not turned on in Sirion yet.',
    not_consented: 'Microsoft 365 is not connected yet: an M365 admin has to approve.',
    no_group: 'No mailboxes are connected yet.',
    not_deployed: 'The add-in is not deployed to you yet, so the check at Send is off.',
  }[gap];
  return (
    <div>
      <MessageBar intent="warning" style={{ marginBottom: 10 }}>
        <MessageBarBody>
          <MessageBarTitle>Not connected</MessageBarTitle>
          {text} Email works as usual.
        </MessageBarBody>
      </MessageBar>
      <p className={s.note}>
        <OriginTag kind="new" /> An admin finishes this once in <Link href="/setup">Sirion → Settings → Microsoft 365 connection</Link>.
      </p>
    </div>
  );
}

export const PREQUEL_CLOCK = '2026-11-01T11:30:00+05:30';
export const prequelDate = formatDateShort(PREQUEL_CLOCK);
