'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { makeStyles, shorthands, tokens, Button } from '@fluentui/react-components';
import { useChromeStyles, FolderPane, OutlookHeader, OutlookRail, OutlookRibbon } from './chrome';
import { MessageList } from './MessageList';
import { ReadingPane } from './ReadingPane';
import { Compose } from './Compose';
import { PaneFrame } from '@/components/addin/PaneFrame';
import { AnanyaPane } from '@/components/addin/AnanyaPane';
import { VikramPane } from '@/components/addin/VikramPane';
import { ProgressDialog, SmartAlertDialog } from '@/components/addin/SmartAlertDialog';
import { NextStage } from '@/components/demo/NextStage';
import { TrySentence } from './TrySentence';
import { useDemo, cachedReaderFor } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { initialLedger, STEP_CLOCK } from '@/lib/demo/steps';
import {
  cloudDeskDeal,
  inboxFor,
  messageById,
  personById,
  sentItemsFor,
  threadById,
} from '@/lib/data';
import { buildDialog, TAKE_ACTION_LABEL } from '@/lib/engines/sendDialog';
import type { AiSource, EmailMessage, ReaderResult, SendCheckResult } from '@/lib/types';
import type { Step } from '@/lib/demo/steps';

/** Which demo step each scripted message belongs to (§11). */
const MESSAGE_STEP: Partial<Record<string, Step>> = { M8: 1, M12: 2, M13: 3, M14: 4 };

const useStyles = makeStyles({
  split: { display: 'flex', flexGrow: 1, minHeight: 0 },
  readingWrap: { display: 'flex', flexGrow: 1, minWidth: 0 },
  paneToggle: {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    zIndex: 5,
  },
  rightRail: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '0px',
  },
  relative: { position: 'relative', display: 'flex', flexGrow: 1, minWidth: 0, minHeight: 0 },
  sentNote: {
    ...shorthands.padding('10px', '20px'),
    fontSize: '12.5px',
    color: tokens.colorNeutralForeground3,
  },
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
  const completedSteps = useDemo((st) => st.completedSteps);

  const rows = hydrated ? storedLedger : initialLedger();

  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [paneOpen, setPaneOpen] = useState(person === 'ananya');
  const [busy, setBusy] = useState(false);
  const [readerSource, setReaderSource] = useState<AiSource>();

  // Compose state
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [ccAdded, setCcAdded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [alert, setAlert] = useState<SendCheckResult | null>(null);
  const [actionable, setActionable] = useState<boolean>();
  const showPreview = params.get('result') === 'warning';
  const dismissPreview = () => router.replace('/outlook/vikram?msg=M13');
  const previewDialog = showPreview && hydrated
    ? buildDialog(rows, cloudDeskDeal, 'price', { kind: 'price', wording: 'open_yearly', fromYear: 2 })
    : null;
  const [loopIn, setLoopIn] = useState<SendCheckResult['match'] | undefined>();

  const inbox = useMemo(() => {
    const base = hydrated ? inboxFor(person, clock) : inboxFor(person, clock);
    return base;
  }, [person, clock, hydrated]);

  const sent = useMemo(() => {
    const seeded = sentItemsFor(person, clock);
    const extra = sentMessages.filter(
      (m) => m.from.toLowerCase() === owner.email.toLowerCase(),
    );
    return [...extra, ...seeded].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [person, clock, sentMessages, owner.email]);

  const list = folder === 'inbox' ? inbox : sent;
  const selected = selectedId ? messageById(selectedId) ?? sent.find((m) => m.id === selectedId) : undefined;

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
      setReaderSource(result.source);
      applyReader(result, { messageId: tag, versionId: result.versionId });
    } catch {
      // The demo must never break: fall back to the stored fixture.
      const cached = cachedReaderFor(tag);
      if (cached) {
        setReaderSource('cached');
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
    const message = messageById(id);
    if (!message || readIds.includes(id)) return;
    markRead(id);
    if (!threadById(message.threadId)?.dealId) return;
    void runReader([id], id);
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
    const wanted = params.get('msg');
    if (!wanted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs with the URL
      if (!selectedId && inbox.length) openMessage(inbox[0].id);
      return;
    }
    const target = messageById(wanted);
    const step = MESSAGE_STEP[wanted];

    if (target && step !== undefined) {
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
  }, [params, inbox.length, clock, hydrated]);

  /* Linking the side thread reads it, and re-reads the ambiguous message. */
  const linkedT2 = linkedThreads.includes('T2');
  useEffect(() => {
    if (!hydrated || !linkedT2) return;
    if (readerRuns.T2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reader is an external call
    void runReader(['M9', 'M10', 'M12'], 'T2');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedT2, hydrated]);

  /* ---- Compose ---- */

  const replyTo = 'rohan.iyer@clouddesk.example';

  const openReply = (body = '') => {
    setComposing(true);
    setDraft(body);
    setLoopIn(undefined);
    setCcAdded(false);
  };

  const doSend = async () => {
    setChecking(true);
    const cc = ccAdded ? [lead.email] : [];
    let result: SendCheckResult = { decision: 'allow', checkedBy: 'none', source: 'rules' };
    try {
      const response = await fetch('/api/send-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPersonId: person,
          to: [replyTo],
          cc,
          body: draft,
          threadId: selected?.threadId,
        }),
      });
      if (!response.ok) throw new Error('send-check failed');
      result = (await response.json()) as SendCheckResult;
    } catch {
      result = {
        decision: 'could_not_check',
        checkedBy: 'rules',
        source: 'rules',
        dialog: {
          title: 'Deal Ledger',
          markdown:
            "Deal Ledger couldn't check this email against the CloudDesk ledger. Loop in procurement before you send?",
          plain: '',
          takeActionLabel: TAKE_ACTION_LABEL,
        },
      };
    } finally {
      // A short, visible pause: the user waits on the message, as in Outlook.
      await new Promise((r) => setTimeout(r, 900));
      setChecking(false);
    }

    if (result.decision === 'allow') {
      finishSend(result);
      return;
    }
    setActionable(undefined);
    setAlert(result);
  };

  const finishSend = (result: SendCheckResult, choice?: 'send_anyway') => {
    const message: EmailMessage = {
      id: `SENT-${sentMessages.length + 1}`,
      threadId: selected?.threadId ?? 'T2',
      from: owner.email,
      to: [replyTo],
      cc: ccAdded ? [lead.email] : [],
      subject: selected ? `RE: ${selected.subject.replace(/^RE:\s*/i, '')}` : 'RE: CloudDesk',
      sentAt: clock,
      attachments: [],
      body: draft,
      mailboxes: [person],
    };
    sendMessage(message);
    recordSend({
      at: clock,
      personId: person,
      termKey: result.match?.termKey,
      decision: result.decision,
      choice,
      actionable: choice ? actionable : undefined,
    });
    setComposing(false);
    setAlert(null);
    setDraft('');
    if (person === 'vikram' && ccAdded) {
      const termKey = loopIn?.termKey;
      useDemo.getState().addNotice({
        at: clock,
        forPersonId: 'ananya',
        text: 'Vikram escalated the supplier request. Ananya now has one term to review.',
        rowId: rows.find((row) => row.termKey === termKey)?.id,
      });
    }
    toast('Sent');
    setFolder('sent');
  };

  const onTakeAction = () => {
    if (alert?.match) setLoopIn(alert.match);
    setPaneOpen(true);
    recordSend({
      at: clock,
      personId: person,
      termKey: alert?.match?.termKey,
      decision: alert?.decision ?? 'warn',
      choice: 'loop_in',
      actionable,
    });
    setAlert(null);
  };

  const onSendAnyway = () => {
    if (alert?.match) {
      sendConcession(alert.match.termKey, alert.match.value, alert.match.quote, person);
    }
    finishSend(alert!, 'send_anyway');
  };

  const onDontSend = () => {
    recordSend({
      at: clock,
      personId: person,
      termKey: alert?.match?.termKey,
      decision: alert?.decision ?? 'warn',
      choice: 'dont_send',
      actionable,
    });
    setAlert(null);
  };

  const unread = inbox.filter((m) => !readIds.includes(m.id)).length;

  return (
    <div className={chrome.app}>
      <OutlookHeader owner={owner} />
      <div className={chrome.body}>
        <OutlookRail />
        <div className={chrome.main}>
          <OutlookRibbon
            onReply={() => openReply()}
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
                if (next) setSelectedId(next.id);
              }}
            />
            <MessageList
              messages={list}
              selectedId={selectedId}
              readIds={readIds}
              clock={clock}
              folder={folder}
              onSelect={openMessage}
            />
            <div className={s.relative}>
              {composing ? (
                <Compose
                  to={[replyTo]}
                  cc={ccAdded ? [lead.email] : []}
                  subject={selected ? `RE: ${selected.subject.replace(/^RE:\s*/i, '')}` : 'RE: CloudDesk'}
                  value={draft}
                  onChange={setDraft}
                  onSend={doSend}
                  onDiscard={() => {
                    setComposing(false);
                    setDraft('');
                  }}
                  sending={checking}
                />
              ) : (
                <ReadingPane message={selected} onReply={() => openReply()} showHistory />
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
              <PaneFrame width={320} source={readerSource ?? (selected ? readerRuns[selected.id] : undefined)} onClose={() => setPaneOpen(false)}>
                {person === 'ananya' ? (
                  <AnanyaPane
                    rows={rows}
                    openMessageId={selected?.id}
                    busy={busy}
                    onDraftReply={(body) => openReply(body)}
                  />
                ) : (
                  <>
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
                      toast('Holding reply ready. It contains no figures or names.');
                    }}
                  />
                  {completedSteps.includes(3) && <NextStage step={4} />}
                  </>
                )}
              </PaneFrame>
            )}
          </div>
        </div>
      </div>

      {person === 'vikram' && composing && (
        <TrySentence onPick={(sentence) => setDraft(sentence)} />
      )}

      <ProgressDialog open={checking} />
      {previewDialog && !alert && (
        <SmartAlertDialog
          open
          title={previewDialog.title}
          markdown={previewDialog.markdown}
          takeActionLabel="Try this step"
          source="cached"
          onTakeAction={() => {
            dismissPreview();
            openReply('Yearly price revision is fine with us.');
          }}
          onDontSend={() => dismissPreview()}
        />
      )}
      {alert?.dialog && (
        <SmartAlertDialog
          open
          markdown={alert.dialog.markdown}
          title={alert.dialog.title}
          takeActionLabel={alert.dialog.takeActionLabel}
          source={alert.source}
          actionable={actionable}
          onAssess={alert.decision === 'warn' ? setActionable : undefined}
          onTakeAction={onTakeAction}
          onDontSend={onDontSend}
          onSendAnyway={onSendAnyway}
        />
      )}
    </div>
  );
}
