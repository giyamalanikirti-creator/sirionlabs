'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { makeStyles, Button } from '@fluentui/react-components';
import { useChromeStyles, FolderPane, OutlookHeader, OutlookRail, OutlookRibbon } from './chrome';
import { MessageList } from './MessageList';
import { ReadingPane } from './ReadingPane';
import { Compose } from './Compose';
import { PaneFrame } from '@/components/addin/PaneFrame';
import { AnanyaPane, type DraftOptions } from '@/components/addin/AnanyaPane';
import { VikramPane } from '@/components/addin/VikramPane';
import { ProgressDialog } from '@/components/addin/SmartAlertDialog';
import { SendGuardDialog } from '@/components/addin/SendGuardDialog';
import { sendGuard, type GuardFinding, type GuardResult } from '@/lib/engines/sendGuard';
import { currentVersionId } from '@/lib/demo/rowEmail';
import { TrySentence, type TryChip } from './TrySentence';
import { SwiftShipPane } from '@/components/addin/SwiftShipPane';
import { SWIFTSHIP_MESSAGES } from '@/lib/demo/moreDeals';
import { dealIdForMessage } from '@/lib/demo/supplierInbox';
import { SupplierDealPane } from '@/components/addin/SupplierDealPane';
import { FirstRunCard, LinkNotice, PREQUEL_CLOCK, prequelDate, SetupGapNotice, TrackCard } from '@/components/addin/ConnectPanes';
import { Block } from '@/components/addin/SirionBlocks';
import { CONTRACT_ID } from '@/lib/settings';
import { useDemo, cachedReaderFor } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { initialLedger, STEP_CLOCK } from '@/lib/demo/steps';
import {
  cloudDeskDeal,
  inboxFor,
  messageById,
  personById,
  personByEmail,
  sentItemsFor,
  threadById,
  deals,
  personName,
} from '@/lib/data';
import type { EmailMessage, ReaderResult, SendCheckResult } from '@/lib/types';

/** A CloudDesk contract file, as attached in Outlook. */
const fileFor = (versionId: string) => ({ fileName: `CloudDesk_MSA_${versionId}.docx`, versionId });
import type { Step } from '@/lib/demo/steps';

/** Which demo step each scripted message belongs to (§11). */
const MESSAGE_STEP: Partial<Record<string, Step>> = { M8: 1, M12: 2, M13: 3, M14: 4 };

const useStyles = makeStyles({
  paneToggle: {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    zIndex: 5,
  },
  relative: { position: 'relative', display: 'flex', flexGrow: 1, minWidth: 0, minHeight: 0 },
});

type Person = 'ananya' | 'vikram';

export function OutlookApp({ person }: { person: Person }) {
  const chrome = useChromeStyles();
  const s = useStyles();
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();

  const owner = personById(person)!;
  const lead = personById('ananya')!;

  const clock = useDemo((st) => st.clock);
  const storedLedger = useDemo((st) => st.ledger);
  const readIds = useDemo((st) => st.readMessageIds);
  const readerRuns = useDemo((st) => st.readerRuns);
  const linkedThreads = useDemo((st) => st.linkedThreadIds);
  const sentMessages = useDemo((st) => st.sentMessages);
  const markRead = useDemo((st) => st.markRead);
  const applyReader = useDemo((st) => st.applyReader);
  const recordSend = useDemo((st) => st.recordSend);
  const sendConcession = useDemo((st) => st.sendConcession);
  const sendMessage = useDemo((st) => st.sendMessage);
  const toast = useDemo((st) => st.toast);
  const setClock = useDemo((st) => st.setClock);
  const advanceTo = useDemo((st) => st.advanceTo);
  const settings = useDemo((st) => st.settings);
  const mailboxOn = !hydrated || settings.mailboxes[person] !== false;
  const isOwner = person !== 'ananya';

  const rows = hydrated ? storedLedger : initialLedger();

  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [paneOpen, setPaneOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const wantedMessage = params.get('msg');

  // Compose state
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [ccAdded, setCcAdded] = useState(false);
  /** Edit reply (review fix C5): the sentence to change; the check re-runs on every edit. */
  const [editQuote, setEditQuote] = useState<{ quote: string; rewrite?: string } | null>(null);
  const checkDown = useDemo((st) => Boolean(st.settings.sendCheckDown));
  const [checking, setChecking] = useState(false);
  const [draftOpts, setDraftOpts] = useState<DraftOptions>({});
  const [attachments, setAttachments] = useState<{ fileName: string; versionId: string }[]>([]);
  const [guard, setGuard] = useState<GuardResult | null>(null);
  const showPreview = person === 'vikram' && params.get('result') === 'warning';
  const [loopIn, setLoopIn] = useState<SendCheckResult['match'] | undefined>();
  const sentBackAt = useDemo((st) => st.signing.sentBackAt);
  const currentVersion = currentVersionId(clock, sentBackAt);

  /* How it got connected: the prequel on 1 Nov, setup gaps (fail open), and whether CloudDesk is tracked. */
  const prequel = person === 'ananya' && params.get('prequel') === '1';
  const viewClock = prequel ? PREQUEL_CLOCK : clock;
  const setup = useDemo((st) => st.setup);
  const setupGap = !hydrated
    ? undefined
    : !setup.enabled
      ? ('not_enabled' as const)
      : !setup.consented
        ? ('not_consented' as const)
        : !setup.group
          ? ('no_group' as const)
          : !setup.deployed
            ? ('not_deployed' as const)
            : undefined;
  const tracked = useDemo((st) => st.trackedDealIds).includes(cloudDeskDeal.id);
  const firstRunSeen = useDemo((st) => st.firstRunSeen);
  const [prequelGotIt, setPrequelGotIt] = useState(false);

  const inbox = useMemo(() => [
    ...inboxFor(person, viewClock),
    ...(prequel ? [] : sentMessages.filter((message) => message.mailboxes.includes(person) && message.from !== owner.email)),
  ].sort((a, b) => b.sentAt.localeCompare(a.sentAt)), [person, viewClock, prequel, owner.email, sentMessages]);

  const sent = useMemo(() => {
    const seeded = sentItemsFor(person, viewClock);
    const extra = sentMessages.filter(
      (m) => m.from.toLowerCase() === owner.email.toLowerCase(),
    );
    return [...extra, ...seeded].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [person, viewClock, sentMessages, owner.email]);

  const list = folder === 'inbox' ? inbox : sent;
  const selected = list.find((message) => message.id === selectedId);
  const selectedThread = selected && threadById(selected.threadId);
  const cloudDeskContext = selectedThread?.dealId === cloudDeskDeal.id ||
    selectedThread?.id === 'T2' && (person === 'vikram' || linkedThreads.includes('T2') || selected?.cc.includes(owner.email)) ||
    // A strong match by sender domain (e.g. CloudDesk's own status email to Vikram).
    Boolean(selected && selected.from.toLowerCase().endsWith(`@${cloudDeskDeal.supplierDomain}`));
  const internalOnly = Boolean(
    selected && [selected.from, ...selected.to, ...selected.cc].every((a) => a.toLowerCase().endsWith('@meridian.example')),
  );
  const readerSource = selected?.id === 'M12' && linkedThreads.includes('T2')
    ? readerRuns.T2
    : selected && readerRuns[selected.id];

  /** Run the reader for a deal message that has not been read yet. */
  const runReader = async (messageIds: string[], tag: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: 'D-CLOUDDESK', messageIds, linkedThreadIds: useDemo.getState().linkedThreadIds }),
      });
      if (!response.ok) throw new Error(`reader ${response.status}`);
      const result = (await response.json()) as ReaderResult & { versionId?: string };
      if (tag === 'M12' && useDemo.getState().readerRuns.T2) return;
      applyReader(result, { messageId: tag, versionId: result.versionId });
    } catch {
      // The demo must never break: fall back to the stored fixture.
      const cached = cachedReaderFor(tag);
      if (cached) {
        if (tag === 'M12' && useDemo.getState().readerRuns.T2) return;
        applyReader(cached, { messageId: tag, versionId: tag === 'M8' ? 'v4' : undefined });
      }
    } finally {
      setBusy(false);
    }
  };

  /**
   * Opening a message is a user action, so marking it read and running the
   * reader happen here rather than as a consequence of rendering.
   */
  const openMessage = (id: string) => {
    setSelectedId(id);
    setComposing(false);
    setLoopIn(undefined);
    setCcAdded(false);
    setEditQuote(null);
    const message = messageById(id);
    if (useDemo.getState().settings.mailboxes[person] === false) {
      setSelectedId(id);
      markRead(id);
      return;
    }
    const live = !prequel && !setupGap && useDemo.getState().trackedDealIds.includes(cloudDeskDeal.id);
    if (live && person === 'ananya' && message && threadById(message.threadId)?.dealId === cloudDeskDeal.id) {
      // Sirion's plugin files the supplier's draft as the next version on its own; Undo is in the pane.
      const state = useDemo.getState();
      for (const file of message.attachments) {
        if (file.versionId && !state.readMessageIds.includes(id)) state.syncVersion(file.versionId);
      }
      // Same supplier domain, and Rohan names Vikram: link the side thread, with Undo.
      // Only when Vikram's mailbox is connected: otherwise the pane says it can't be checked.
      if (id === 'M12' && state.settings.mailboxes.vikram !== false) state.autoLinkThread('T2');
      // The clean copy has arrived: run the signing check without waiting for a button.
      if (id === 'M14' && !state.signing.checkedAt) state.runSigningCheck();
    }
    if (useDemo.getState().readMessageIds.includes(id)) return;
    markRead(id);
    if (live && message && threadById(message.threadId)?.dealId === cloudDeskDeal.id) void runReader([id], id);
  };

  /*
   * Deep link from the dashboard or the demo guide: ?msg=M8.
   * A link to a later moment is a request to be at that moment, so we replay
   * the earlier steps from cached results first — exactly what the guide's Go
   * does — and then move the clock so the message is delivered. Without this,
   * someone who lands straight on Vikram's mailbox would see a ledger in which
   * the price was never agreed, and the warning would make no sense.
   */
  useEffect(() => {
    if (!hydrated) return;
    const wanted = wantedMessage;
    if (!wanted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs with the URL
      if (!selectedId && inbox.length) openMessage(inbox[0].id);
      return;
    }
    const target = messageById(wanted);
    const step = MESSAGE_STEP[wanted];

    if (target?.mailboxes.includes(person) && step !== undefined) {
      const prior = (step - 1) as Step;
      if (clock < STEP_CLOCK[prior]) {
        advanceTo(prior);
        return;
      }
    }

    if (target && target.sentAt > clock && target.mailboxes.includes(person)) {
      setClock(target.sentAt);
      return;
    }
    if (inbox.some((m) => m.id === wanted)) {
      setFolder('inbox');
      openMessage(wanted);

    } else if (!selectedId && inbox.length) {
      openMessage(inbox[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedMessage, clock, hydrated]);

  /* Linking the side thread reads it, and re-reads the ambiguous message. */
  const linkedT2 = linkedThreads.includes('T2');
  useEffect(() => {
    if (!hydrated || !linkedT2 || person !== 'ananya') return;
    if (readerRuns.T2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reader is an external call
    void runReader(['M9', 'M10', 'M12'], 'T2');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedT2, hydrated]);

  /* ---- Compose ---- */

  const replyTo = draftOpts.to ?? (selected ? (folder === 'sent' ? selected.to : [selected.from]) : []);
  const replySubject = draftOpts.subject ?? (selected ? `RE: ${selected.subject.replace(/^RE:\s*/i, '')}` : '');
  const [replyAllCc, setReplyAllCc] = useState<string[]>([]);
  const cc = [...new Set([...replyAllCc, ...(ccAdded ? [lead.email] : [])])];

  const openReply = (body = '', replyAll = false, opts: DraftOptions = {}) => {
    // Vikram replying to Rohan's price request: start from the reply he would write, so the check at Send has something to catch.
    if (!body && person === 'vikram' && selected?.id === 'M13') body = 'Yearly price revision is fine with us.';
    setDraftOpts(opts);
    setAttachments(opts.attachVersionId ? [fileFor(opts.attachVersionId)] : []);
    setReplyAllCc(replyAll && selected ? [...selected.to, ...selected.cc].filter((address) => address !== owner.email && !replyTo.includes(address)) : []);
    setComposing(true);
    setDraft(body);
    setLoopIn(undefined);
    setCcAdded(false);
    setEditQuote(null);
  };

  /** The check at Send: deterministic, against the live ledger. Warns, never blocks. */
  const doSend = async (bodyOverride?: string) => {
    const body = bodyOverride ?? draft;
    setChecking(true);
    let result: GuardResult;
    // Fail open: not connected, not deployed or not tracked means the email sends as usual.
    if (!mailboxOn || setupGap || !tracked) {
      finishSend(body, 'allow');
      return;
    }
    // The check service is down (demo toggle): send normally, and say it was not checked.
    if (checkDown) {
      finishSend(body, 'allow');
      toast('Sent. Deal check unavailable: this email was not checked.');
      return;
    }
    try {
      result = sendGuard({
        to: replyTo,
        cc,
        body,
        attachments,
        rows,
        deal: cloudDeskDeal,
        currentVersionId: currentVersion,
        dealDomains: deals.map((d) => d.supplierDomain.toLowerCase()),
        at: clock,
      });
    } catch {
      // The check could not run: send as usual, as Outlook does when an add-in times out.
      result = { checked: false, findings: [], consistent: [] };
    }
    // A short, visible pause: the user waits on the message, as in Outlook.
    await new Promise((r) => setTimeout(r, 700));
    setChecking(false);

    if (!result.findings.length) {
      finishSend(body, result.checked ? 'allow' : 'allow');
      if (result.checked) toast('Checked against ledger ✓ Sent.');
      return;
    }
    setGuard(result);
    recordSend({ at: clock, personId: person, termKey: result.findings[0].termKey, decision: 'warn', guardCase: result.findings[0].case });
  };

  const finishSend = (body: string, decision: 'allow' | 'warn', choice?: 'send_anyway', guardCase?: GuardFinding['case'], reason?: string) => {
    const message: EmailMessage = {
      id: `SENT-${sentMessages.length + 1}`,
      threadId: selected?.threadId ?? 'T2',
      from: owner.email,
      to: replyTo,
      cc,
      subject: replySubject,
      sentAt: clock,
      attachments: attachments.map((a) => ({
        fileName: a.fileName,
        sizeKb: 94,
        versionId: a.versionId,
        fingerprint: `fp-${a.versionId}`,
        dealIdTag: cloudDeskDeal.dealIdTag,
      })),
      body,
      mailboxes: [person, ...[...replyTo, ...cc].flatMap((address) => {
        const recipient = personByEmail(address)?.id;
        return recipient === 'ananya' || recipient === 'vikram' ? [recipient] : [];
      })],
    };
    sendMessage(message);
    if (decision === 'allow' || choice) {
      recordSend({ at: clock, personId: person, decision, choice, guardCase, reason });
    }
    setComposing(false);
    setGuard(null);
    setDraft('');
    setAttachments([]);
    if (!choice) toast('Sent');
    if (draftOpts.kind === 'clarify') {
      // Rohan answers in the same supplier thread; his reply becomes the source for the row.
      setTimeout(() => {
        useDemo.getState().clarifyCredit();
        useDemo.getState().toast('Rohan replied: 10% service credit. Written to the ledger with his quote.');
        setFolder('inbox');
        setSelectedId('M12R');
      }, 1200);
    }
    if (draftOpts.kind === 'respond') useDemo.getState().syncVersion('v5');
    setDraftOpts({});
    setFolder('sent');
    setSelectedId(message.id);
    setLoopIn(undefined);
    setCcAdded(false);
    setEditQuote(null);
  };

  const topFinding = guard?.findings[0];

  /** Loop in Ananya: Cc her, hold the reply as a draft, and put it on her Home and pane. */
  const onLoopIn = () => {
    if (!topFinding) return;
    setCcAdded(true);
    if (topFinding.rowId && topFinding.termKey && topFinding.value) {
      setLoopIn({
        rowId: topFinding.rowId,
        termKey: topFinding.termKey,
        value: topFinding.value,
        quote: topFinding.quote ?? '',
        costLakhPerYr: topFinding.costLakhPerYr,
        overTermLakh: undefined,
        agreedPlain: topFinding.agreedText ?? '',
        sourcePlain: '',
        approverName: undefined,
      });
    }
    const label = rows.find((r) => r.id === topFinding.rowId)?.label.toLowerCase() ?? 'a term';
    useDemo.getState().loopInLead({ fromPersonId: person, body: draft, subject: replySubject, to: replyTo }, topFinding.rowId, `${owner.name.split(' ')[0]} needs a decision on ${label}`);
    if (topFinding.termKey) useDemo.getState().setTermHold(topFinding.termKey, 'waiting_lead');
    recordSend({ at: clock, personId: person, termKey: topFinding.termKey, decision: 'warn', choice: 'loop_in', guardCase: topFinding.case });
    setPaneOpen(true);
    setGuard(null);
    toast(`Draft saved. ${lead.name.split(' ')[0]} is on Cc and has been told.`);
  };

  /** Edit reply: put the supplier-safe wording in place of the offending sentence. */
  const onEdit = () => {
    if (!topFinding) return;
    recordSend({ at: clock, personId: person, termKey: topFinding.termKey, decision: 'warn', choice: 'edit', guardCase: topFinding.case });
    setGuard(null);
    if (topFinding.quote) setEditQuote({ quote: topFinding.quote, rewrite: topFinding.rewrite });
    toast('Change or remove the highlighted sentence. The check re-runs as you edit.');
  };
  /** Re-run the check on the edited draft: the warning clears only when no sentence concedes. */
  const editStillConcedes = (() => {
    if (!editQuote) return false;
    try {
      return sendGuard({ to: replyTo, cc, body: draft, attachments, rows, deal: cloudDeskDeal, currentVersionId: currentVersion, dealDomains: deals.map((d) => d.supplierDomain.toLowerCase()), at: clock }).findings.some((f) => f.case !== 'outdated_attachment');
    } catch {
      return false;
    }
  })();

  const onFixAttachment = () => {
    const att = topFinding?.attachment;
    if (!att) return;
    setAttachments((list) => list.map((a) => (a.versionId === att.versionId ? fileFor(att.currentVersionId) : a)));
    recordSend({ at: clock, personId: person, decision: 'warn', choice: 'fix_attachment', guardCase: 'outdated_attachment' });
    setGuard(null);
    toast(`${att.currentFileName} attached instead. Press Send when ready.`);
  };

  const onSendAnyway = (reason: string) => {
    if (!guard || !topFinding) return;
    let approver: string | undefined;
    for (const f of guard.findings) {
      if (f.termKey && f.value && f.quote) {
        sendConcession(f.termKey, f.value, f.quote, person, reason);
        // A concession sent anyway is routed for approval by value, not just logged.
        const route = useDemo.getState().requestApproval({
          kind: 'send_anyway',
          rowId: f.rowId!,
          termKey: f.termKey,
          label: rows.find((r) => r.id === f.rowId)?.label ?? f.termKey,
          change: `told the supplier “${f.quote}”`,
          costLakhPerYr: f.costLakhPerYr,
          requestedById: person,
          reason,
        });
        if (route.status === 'pending') approver = personName(route.approverId);
      }
    }
    if (person !== 'ananya' && topFinding.termKey) {
      const label = rows.find((r) => r.id === topFinding.rowId)?.label.toLowerCase() ?? 'term';
      useDemo.getState().logEvent(`Exception for review: ${owner.name.split(' ')[0]} sent a ${label} concession without the term owner's sign-off.`);
      useDemo.getState().setTermHold(topFinding.termKey, 'conceded_pending');
    }
    finishSend(draft, 'warn', 'send_anyway', topFinding.case, reason);
    toast(`Sent. Marked reopened (${reason})${approver ? `; approval requested from ${approver}` : ''}${person === 'ananya' ? '' : '. Ananya has been told'}.`);
  };

  /* "Ask the supplier" from Word: once the message is open, start the reply with the supplier-safe draft. */
  const askDraft = params.get('draft');
  useEffect(() => {
    if (!hydrated || !askDraft || !selected || selected.id !== wantedMessage || composing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once from the URL
    openReply(askDraft.slice(0, 1500));
    router.replace(`/outlook/${person}?msg=${wantedMessage}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, askDraft, selected?.id]);

  /* The guide's "see the result" link: open the reply and press Send for the presenter. */
  useEffect(() => {
    if (!showPreview || !hydrated || selected?.id !== 'M13' || composing) return;
    router.replace('/outlook/vikram?msg=M13');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once from the URL
    openReply();
    void doSend('Yearly price revision is fine with us.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, hydrated, selected?.id]);

  const supplierReply = replyTo.some((address) => address.endsWith(`@${cloudDeskDeal.supplierDomain}`));
  const olderVersion = (() => {
    const n = Number(currentVersion.replace(/\D/g, ''));
    return n > 1 ? `v${n - 1}` : undefined;
  })();
  const chips: TryChip[] = [
    { label: 'Yearly review is fine', text: 'Yearly price review is fine with us.' },
    { label: '90 days notice works', text: "90 days' notice for renewal works for us." },
    { label: '5% credits is fine', text: 'A 5% service credit is fine.' },
    ...(olderVersion ? [{ label: `Attach older draft (${olderVersion})`, attachVersionId: olderVersion }] : []),
    { label: 'Confirm 30 days and fixed pricing', text: "Confirming 30 days' notice for renewal and fixed pricing for the term." },
  ];
  const onChip = (chip: TryChip) => {
    if (chip.text) setDraft(chip.text);
    if (chip.attachVersionId) setAttachments([fileFor(chip.attachVersionId)]);
  };

  const unread = inbox.filter((m) => !readIds.includes(m.id)).length;
  const reviewingSirionDraft = composing && Boolean(draftOpts.kind);

  return (
    <div className={chrome.app}>
      <OutlookHeader owner={owner} />
      <div className={chrome.body}>
        <OutlookRail />
        <div className={chrome.main}>
          <OutlookRibbon
            onReply={() => openReply()}
            onReplyAll={() => openReply('', true)}
            onApps={() => setPaneOpen((v) => !v)}
            appsActive={paneOpen}
            replyDisabled={!selected || composing}
          />
          <div className={chrome.panes}>
            <FolderPane
              owner={owner}
              unread={unread}
              active={folder}
              onSelect={(f) => {
                setFolder(f);
                setComposing(false);
                const next = f === 'inbox' ? inbox[0] : sent[0];
                if (next) openMessage(next.id);
                else setSelectedId(undefined);
              }}
            />
            {!reviewingSirionDraft && (
              <MessageList
                messages={list}
                selectedId={selectedId}
                readIds={readIds}
                clock={viewClock}
                folder={folder}
                onSelect={openMessage}
              />
            )}
            <div className={s.relative}>
              {composing ? (
                <Compose
                  to={replyTo}
                  cc={cc}
                  subject={replySubject}
                  chips={supplierReply && <TrySentence chips={chips} onPick={onChip} />}
                  value={draft}
                  onChange={setDraft}
                  onSend={() => void doSend()}
                  onDiscard={() => {
                    setComposing(false);
                    setDraftOpts({});
                    setAttachments([]);
                    setDraft('');
                    setLoopIn(undefined);
                    setCcAdded(false);
                    setEditQuote(null);
                  }}
                  sending={checking}
                  draftedBySirion={reviewingSirionDraft}
                  attachments={attachments.map((a) => a.fileName)}
                  summary={draftOpts.summary}
                  notice={
                    checkDown ? (
                      <div role="status" style={{ padding: '6px 20px', background: '#FFF4CE', borderBottom: '1px solid #F2DF9C', fontSize: 12.5, color: '#3D2E00' }}>
                        Deal check unavailable. This email was not checked.
                      </div>
                    ) : editQuote ? (
                      <div role="status" style={{ padding: '8px 20px', background: editStillConcedes ? '#FFF4CE' : '#DFF6DD', borderBottom: '1px solid #E0E0E0', fontSize: 12.5, lineHeight: '18px' }}>
                        {editStillConcedes ? (
                          <>
                            <strong>Risky reply.</strong> Change or remove: <mark style={{ background: '#FDE68A' }}>“{editQuote.quote}”</mark>
                            {editQuote.rewrite && (
                              <Button
                                size="small"
                                appearance="primary"
                                data-tour="use-suggested-wording"
                                onClick={() => setDraft((d) => d.replace(editQuote.quote, editQuote.rewrite!))}
                                style={{ marginLeft: 10 }}
                              >
                                Use suggested wording
                              </Button>
                            )}
                          </>
                        ) : (
                          <>No sentence concedes an agreed term now. Ready to send.</>
                        )}
                      </div>
                    ) : undefined
                  }
                  onRemoveAttachment={(name) => setAttachments((list) => list.filter((a) => a.fileName !== name))}
                />
              ) : (
                <ReadingPane message={selected} onReply={() => openReply()} onReplyAll={() => openReply('', true)} />
              )}

              {!paneOpen && (
                <div className={s.paneToggle}>
                  <Button appearance="primary" size="small" onClick={() => setPaneOpen(true)}>
                    Open Deal Ledger
                  </Button>
                </div>
              )}
            </div>

            {paneOpen && (
              <PaneFrame width={340} source={cloudDeskContext ? readerSource : undefined} footerHref={cloudDeskContext ? undefined : '/deals'} onClose={() => setPaneOpen(false)}>
                {setupGap ? (
                  <SetupGapNotice gap={setupGap} />
                ) : !mailboxOn ? (
                  <p style={{ fontSize: 13 }}>
                    This mailbox is not connected to Deal Ledger, so nothing in it is read and replies are not checked. An admin can
                    connect it under Privacy and admin.
                  </p>
                ) : selected && SWIFTSHIP_MESSAGES.some((m) => m.id === selected.id) ? (
                  <SwiftShipPane messageId={selected.id} />
                ) : selected && dealIdForMessage(selected.id) ? (
                  <SupplierDealPane dealId={dealIdForMessage(selected.id)!} messageId={selected.id} />
                ) : !cloudDeskContext ? (
                  <p style={{ fontSize: 13 }}>
                    {internalOnly
                      ? 'Internal email: Deal Ledger never reads it.'
                      : 'No linked deal for this message.'}
                  </p>
                ) : person === 'ananya' && prequel ? (
                  <>
                    <Block title="Matched contract" kind="today">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{cloudDeskDeal.supplier} MSA</div>
                      <div style={{ fontSize: 11.5, color: '#707070' }}>
                        {CONTRACT_ID} · Negotiating · current v1 · matched by sender domain ({cloudDeskDeal.supplierDomain})
                      </div>
                    </Block>
                    {!prequelGotIt && <FirstRunCard onDone={() => setPrequelGotIt(true)} />}
                    {prequelGotIt && (
                      <TrackCard
                        asOf={PREQUEL_CLOCK}
                        onTracked={(summary) => {
                          // Jumping to step 0 resets the demo state, so the toast goes after it.
                          advanceTo(0);
                          toast(summary);
                          router.push('/');
                        }}
                      />
                    )}
                    <p style={{ fontSize: 11.5, color: '#707070' }}>Prequel · {prequelDate}. Nothing is read until the owner says Track.</p>
                  </>
                ) : person === 'ananya' && !tracked ? (
                  <>
                    {!firstRunSeen && <FirstRunCard />}
                    <TrackCard asOf={clock} onTracked={(summary) => toast(summary)} />
                  </>
                ) : person === 'ananya' ? (
                  <>
                  {!firstRunSeen && <FirstRunCard />}
                  <AnanyaPane
                    rows={rows}
                    openMessageId={selected?.id}
                    busy={busy}
                    onDraftReply={(body, opts) => openReply(body, false, opts)}
                  />
                  </>
                ) : (
                  <>
                  <LinkNotice />
                  <VikramPane
                    rows={rows}
                    loopIn={loopIn}
                    ccAdded={ccAdded}
                    onAddCc={() => {
                      setCcAdded(true);
                      toast(`${lead.name} added to Cc`);
                    }}
                    onHoldingReply={(body) => {
                      setDraft(body);
                      setComposing(true);
                      toast('Holding reply added to draft.');
                    }}
                  />
                  {loopIn && <details style={{ marginTop: 12, fontSize: 12 }}>
                    <summary>Rate this warning</summary>
                    <Button size="small" onClick={() => useDemo.getState().rateLastWarning(person, true)}>Useful</Button>
                    <Button size="small" onClick={() => useDemo.getState().rateLastWarning(person, false)}>Not useful</Button>
                  </details>}
                  </>
                )}
              </PaneFrame>
            )}
          </div>
        </div>
      </div>

      <ProgressDialog open={checking} />
      {topFinding && guard && (
        <SendGuardDialog
          finding={topFinding}
          others={guard.findings.slice(1)}
          primaryLabel={
            topFinding.case === 'outdated_attachment'
              ? `Attach ${topFinding.attachment!.currentVersionId} instead`
              : person !== 'ananya'
                ? `Loop in ${lead.name.split(' ')[0]}`
                : undefined
          }
          onPrimary={topFinding.case === 'outdated_attachment' ? onFixAttachment : person !== 'ananya' ? onLoopIn : undefined}
          onEdit={onEdit}
          onSendAnyway={onSendAnyway}
          note={person !== 'ananya' && ccAdded && !loopIn ? `${lead.name.split(' ')[0]} is copied, but hasn't approved this change.` : undefined}
          showWorkings={!isOwner || settings.ownersSeeWorkings}
          showFallback={!isOwner || settings.ownersSeeFallbacks}
          whyHref={isOwner ? '/story#how-it-connects' : undefined}
        />
      )}
    </div>
  );
}
