'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Spinner, Tab, TabList, makeStyles } from '@fluentui/react-components';
import { CompareTab, DraftTab, STATUS_TEXT, withAgreedWording } from '@/components/addin/WordTabs';
import { ApproveTab, IssueCard, WordHeader, type IssueActions } from '@/components/addin/WordReview';
import { guardClauseEdit, lensForVersion, reviewIssues, type ClauseLens, type ReviewIssue } from '@/lib/engines/wordLens';
import type { LedgerRow } from '@/lib/types';
import { cloudDeskDeal, personName } from '@/lib/data';
import { formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import { CONTRACT_ID } from '@/lib/settings';

type PaneTab = 'review' | 'draft' | 'compare' | 'approve';

const omit = (m: Record<string, string>, key: string) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== key));
import Link from 'next/link';
import { OriginTag } from '@/components/addin/SirionBlocks';
import { useDemo as useDemoStore } from '@/lib/store';
import { useWordStyles, WordRibbon, WordStatusBar, WordTitleBar } from './chrome';
import { countWords, paginate, WordDocument, type ClauseMarker, type CommentCard, type TrackedEdit } from './Document';
import { PaneFrame } from '@/components/addin/PaneFrame';
import { SigningPane } from '@/components/addin/SigningPane';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { versionById } from '@/lib/data';
import { ledgerAtStep, STEP_CLOCK } from '@/lib/demo/steps';
import { agreedWording } from '@/lib/engines/wording';
import { diffVersions, extractValue } from '@/lib/engines/diff';

const useLocal = makeStyles({
  canvasInner: { display: 'flex', justifyContent: 'center', minWidth: 0 },
});

export function WordApp({ versionId }: { versionId: string }) {
  const s = useWordStyles();
  const local = useLocal();
  const hydrated = useHydrated();

  const returned = useDemo((st) => st.signing.returnedCopy);
  const version = versionId === 'v7' ? (hydrated ? returned : undefined) : versionById(versionId);
  const storedRows = useDemo((st) => st.ledger);
  const advanceTo = useDemo((st) => st.advanceTo);
  const runSigningCheck = useDemo((st) => st.runSigningCheck);
  const setClock = useDemo((st) => st.setClock);
  const clock = useDemo((st) => st.clock);
  const checkedAt = useDemo((st) => st.signing.checkedAt);

  const [paneOpen, setPaneOpen] = useState(true);
  const [highlightedClause, setHighlightedClause] = useState<string>();
  const [tab, setTab] = useState<PaneTab>('review');
  const [expanded, setExpanded] = useState<string>();
  /** Edits typed in Word in this session, by clause: the whole new clause text. */
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const [localComments, setLocalComments] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string>();
  const [editText, setEditText] = useState('');
  const logEvent = useDemo((st) => st.logEvent);
  const toast = useDemo((st) => st.toast);
  const anchorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rows = hydrated ? storedRows : ledgerAtStep(4);

  /* Opening the signing copy means the demo is at step 4. */
  useEffect(() => {
    if (!hydrated || versionId !== 'v6') return;
    if (clock < STEP_CLOCK[3]) {
      advanceTo(3);
      return;
    }
    if (clock < STEP_CLOCK[4]) {
      setClock(STEP_CLOCK[4]);
      return;
    }
    // The clean copy has arrived: check it on its own rather than waiting for a button.
    if (!checkedAt) runSigningCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, versionId, clock, checkedAt]);

  useEffect(() => {
    if (versionId === 'v7') anchorRefs.current['9.1']?.scrollIntoView({ block: 'center' });
  }, [versionId, version]);

  /* Tracked changes and comments come from the rows whose wording we inserted. */
  const { edits, comments } = useMemo(() => {
    if (!version) return { edits: [] as TrackedEdit[], comments: [] as CommentCard[] };
    const e: TrackedEdit[] = [];
    const c: CommentCard[] = [];
    if (version.id === 'v5') {
      // Our turn: v5 restores clause 14.2, shown as a tracked change against the supplier's v4.
      const v4 = versionById('v4');
      for (const change of v4 ? diffVersions(v4, version) : []) {
        e.push({ clauseNo: change.clauseNo, before: change.before, after: change.after, tail: '' });
        c.push({
          clauseNo: change.clauseNo,
          author: 'Ananya Rao',
          initials: 'AR',
          text: rows.find((row) => row.termKey === change.termKey)?.supplierNote ?? 'Restored to the wording agreed in v3.',
        });
      }
      return { edits: e, comments: c };
    }
    for (const row of rows) {
      if (version.id !== 'v6' || row.signing !== 'inserted') continue;
      const clause = version.clauses.find((cl) => cl.termKey === row.termKey);
      if (!clause) continue;
      const docValue = extractValue(clause);
      // The clause text is the pattern sentence followed by ordinary prose.
      // Rebuilding the pattern from the value tells us exactly how much of the
      // clause the amendment replaces, so the rest is left untouched.
      const operative = docValue ? agreedWording(row.termKey, docValue) : clause.text;
      const tail = clause.text.startsWith(operative)
        ? clause.text.slice(operative.length)
        : '';
      e.push({
        clauseNo: clause.no,
        before: clause.text.startsWith(operative) ? operative : clause.text,
        after: agreedWording(row.termKey, row.position),
        tail,
      });
      c.push({
        clauseNo: clause.no,
        author: 'Ananya Rao',
        initials: 'AR',
        text: row.supplierNote,
      });
    }
    // Edits typed in Word replace any earlier markup on that clause.
    for (const [no, text] of Object.entries(localEdits)) {
      const clause = version.clauses.find((cl) => cl.no === no);
      if (!clause || text === clause.text) continue;
      const i = e.findIndex((x) => x.clauseNo === no);
      const edit = { clauseNo: no, before: clause.text, after: text, tail: '' };
      if (i >= 0) e[i] = edit;
      else e.push(edit);
      if (localComments[no]) {
        const j = c.findIndex((x) => x.clauseNo === no);
        const comment = { clauseNo: no, author: 'Ananya Rao', initials: 'AR', text: localComments[no] };
        if (j >= 0) c[j] = comment;
        else c.push(comment);
      }
    }
    return { edits: e, comments: c };
  }, [rows, version, localEdits, localComments]);

  /* The ledger lens runs on the file as it now reads: inserted wording and edits typed here included. */
  const working = useMemo(() => {
    if (!version) return undefined;
    return {
      ...version,
      clauses: version.clauses.map((cl) => {
        const edit = edits.find((e) => e.clauseNo === cl.no);
        return edit && version.id !== 'v5' ? { ...cl, text: `${edit.after}${edit.tail ?? ''}` } : cl;
      }),
    };
  }, [version, edits]);
  const review = useMemo(() => (working ? reviewIssues(working, rows, cloudDeskDeal) : { issues: [], matches: 0 }), [working, rows]);
  const chips = Object.fromEntries(
    review.issues
      .filter((i) => i.costLakhPerYr !== null && i.costLakhPerYr > 0)
      .map((i) => [i.clauseNo, `${formatLakh(i.costLakhPerYr).replace(' lakh', 'L')}/yr`]),
  );
  const lens = useMemo(() => (working ? lensForVersion(working, rows, cloudDeskDeal) : []), [working, rows]);
  const markers = Object.fromEntries(
    lens.map((l) => [
      l.clauseNo,
      {
        tone: l.status === 'matches' ? 'ok' : l.status === 'differs' ? 'risk' : l.status === 'pending' ? 'warn' : 'muted',
        title:
          l.status === 'differs'
            ? `${l.label}${l.costLakhPerYr !== null ? ` · ${formatLakh(l.costLakhPerYr)} a year` : ''}\nAgreed: ${l.agreedPlain}\nThis draft: ${l.docPlain}`
            : `${l.label}: ${STATUS_TEXT[l.status]}`,
      } as ClauseMarker,
    ]),
  );
  const editingClause = editing && version ? version.clauses.find((cl) => cl.no === editing) : undefined;
  const liveGuard = editingClause ? guardClauseEdit(editingClause, editText, rows, cloudDeskDeal) : null;
  const notes: Record<string, React.ReactNode> = {};
  const noteFor = (l: ClauseLens) => (
    <div
      contentEditable={false}
      style={{ marginTop: 4, padding: '4px 8px', borderLeft: '3px solid #C50F1F', background: '#FDF3F4', fontFamily: 'Segoe UI, sans-serif', fontSize: 12, lineHeight: '16px', color: '#3B0509' }}
    >
      Deal Ledger: agreed {l.agreedPlain.toLowerCase()}, this says {l.docPlain.toLowerCase()}
      {l.costLakhPerYr !== null ? ` · ${formatLakh(l.costLakhPerYr)} ${HEADLINE_SUFFIX}` : ''} · {l.source.split(':')[0]}
    </div>
  );
  if (liveGuard?.status === 'differs' && editing) notes[editing] = noteFor(liveGuard);
  for (const l of lens) if (localEdits[l.clauseNo] && l.status === 'differs' && l.clauseNo !== editing) notes[l.clauseNo] = noteFor(l);

  const startEdit = (no: string) => {
    if (!working) return;
    setTab('draft');
    setEditing(no);
    setEditText(working.clauses.find((cl) => cl.no === no)?.text ?? '');
  };
  const commitEdit = () => {
    if (!editing) return;
    setLocalEdits((m) => ({ ...m, [editing]: editText }));
    const l = liveGuard;
    logEvent(`Clause ${editing} edited in Word${l?.status === 'differs' ? `: differs from what was agreed (${l.agreedPlain})` : ''}.`);
    toast(l?.status === 'differs' ? 'Kept as a tracked change. It differs from what was agreed and is flagged.' : 'Kept as a tracked change.');
    setEditing(undefined);
  };

  const insertWording = useDemo((st) => st.insertWording);
  const applyPlaybook = useDemo((st) => st.applyPlaybookPosition);
  const waiveGap = useDemo((st) => st.waiveGap);
  const requestApproval = useDemo((st) => st.requestApproval);
  const flagRow = useDemo((st) => st.flagRow);
  const sendBack = useDemo((st) => st.sendBack);
  const sentBackAt = useDemo((st) => st.signing.sentBackAt);

  const rowOf = (i: ReviewIssue) => (i.lens ? rows.find((r) => r.id === i.lens!.rowId) : undefined);
  const isSigningGap = (row?: LedgerRow) => versionId === 'v6' && row?.signing === 'gap';
  const putLocal = (no: string, text: string, comment?: string) => {
    setLocalEdits((m) => ({ ...m, [no]: text }));
    if (comment) setLocalComments((m) => ({ ...m, [no]: comment }));
  };

  const issueActions: IssueActions = {
    onInsertAgreed: (issue) => {
      const row = rowOf(issue);
      const clause = version?.clauses.find((c) => c.no === issue.clauseNo);
      if (!row || !clause) return;
      if (isSigningGap(row)) insertWording(row.id);
      else putLocal(clause.no, withAgreedWording(clause, row), row.supplierNote);
      goToClause(clause.no);
      logEvent(`Clause ${clause.no}: agreed wording inserted in Word (${version!.id}).`);
      toast(`Agreed wording inserted in clause ${clause.no}, with a supplier-safe comment.`);
    },
    onUseRung: (issue, value, key) => {
      const row = rowOf(issue);
      const clause = version?.clauses.find((c) => c.no === issue.clauseNo);
      if (!row || !clause) return;
      if (isSigningGap(row) && key !== 'preferred') applyPlaybook(row.id, value, key);
      else {
        const first = clause.text.indexOf('. ');
        putLocal(clause.no, agreedWording(row.termKey, value) + (first >= 0 ? clause.text.slice(first + 1) : ''), 'Proposed wording for this clause.');
      }
      goToClause(clause.no);
      toast(`Playbook ${key} inserted in clause ${clause.no} as a tracked change.`);
    },
    onAccept: (issue, reason) => {
      const row = rowOf(issue);
      if (!row || !issue.lens) return;
      if (isSigningGap(row)) waiveGap(row.id, reason);
      else
        requestApproval({
          kind: 'accept_theirs',
          rowId: row.id,
          termKey: row.termKey,
          label: row.label,
          change: `${issue.lens.agreedPlain} → ${issue.lens.docPlain} (accepted in Word)`,
          costLakhPerYr: issue.costLakhPerYr,
          requestedById: 'ananya',
          reason,
          value: issue.lens.docValue ?? undefined,
        });
      const last = useDemo.getState().approvals.at(-1);
      toast(last?.status === 'pending' ? `Waiver logged. Approval requested from ${personName(last.approverId)}.` : 'Waiver logged, within your limit.');
    },
    onNotRight: (issue) => {
      const row = rowOf(issue);
      if (!row) return;
      flagRow(row.id, issue.lens?.docValue ?? null, `Word (${version!.fileName})`);
      toast('Sent to Needs confirming. Correct it on the ledger page; the edit is logged.');
    },
    onGoTo: (no) => goToClause(no),
  };

  const emailGaps = review.issues.filter((i) => i.sources.includes('email') && i.lens?.status === 'differs' && rowOf(i)?.signing !== 'waived');
  const insertAll = () => emailGaps.forEach((g) => issueActions.onInsertAgreed(g));
  const onPublished = (anyway: boolean, reason?: string) => {
    if (anyway && emailGaps.length) {
      const first = rowOf(emailGaps[0])!;
      requestApproval({
        kind: 'publish_anyway',
        rowId: first.id,
        termKey: first.termKey,
        label: `${emailGaps.length} agreed terms`,
        change: `${version!.id} published without ${emailGaps.map((g) => g.label.toLowerCase()).join(', ')}`,
        costLakhPerYr: emailGaps.reduce((sum, g) => sum + (g.costLakhPerYr ?? 0), 0),
        requestedById: 'ananya',
        reason,
      });
      logEvent(`${version!.id} published to Sirion with ${emailGaps.length} agreed terms missing · reason: ${reason}.`);
      toast('Published anyway. Logged to the deal activity, and sent for approval.');
      return;
    }
    logEvent(`${version!.id} published to Sirion after the signing check: every agreed term is in the copy.`);
    if (versionId === 'v6' && !sentBackAt && useDemo.getState().signing.checkedAt) sendBack('portal');
    void fetch('/api/handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: cloudDeskDeal.id, rows, signedVersionId: version!.id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((record: { obligations?: unknown[] } | null) => {
        toast(
          record?.obligations
            ? `Published to Sirion. On signature, the Obligations agent creates ${record.obligations.length} obligations from the agreed terms.`
            : 'Published to Sirion.',
        );
      })
      .catch(() => toast('Published to Sirion.'));
  };

  const openIssue = (no: string) => {
    setTab('review');
    setExpanded(no);
    requestAnimationFrame(() => document.getElementById(`issue-${no}`)?.scrollIntoView({ block: 'nearest' }));
  };

  const goToClause = (clauseNo: string) => {
    setHighlightedClause(clauseNo);
    const el = anchorRefs.current[clauseNo];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!version) {
    return <div style={{ padding: 32, fontSize: 13 }}>This document version is unavailable.</div>;
  }

  const pages = paginate(version.clauses).length;

  return (
    <div className={s.app}>
      <WordTitleBar fileName={version.fileName.replace('.docx', '')} />
      {Object.keys(localEdits).length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', background: '#EEF6F7', fontSize: 12.5, borderBottom: '1px solid #D6E4E6' }}>
          <OriginTag kind="today" />
          {Object.keys(localEdits).length} tracked change{Object.keys(localEdits).length === 1 ? '' : 's'} in this file
          {lens.some((l) => localEdits[l.clauseNo] && l.status === 'differs') && (
            <span style={{ color: '#C50F1F' }}>· {lens.filter((l) => localEdits[l.clauseNo] && l.status === 'differs').length} differ from what was agreed</span>
          )}
          <Button
            size="small"
            appearance="primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              logEvent(`${version.id} edited in Word and saved back to Sirion as a new version with ${Object.keys(localEdits).length} tracked changes.`);
              toast(`Saved to Sirion as a new version of ${CONTRACT_ID}. The ledger checked it on save.`);
            }}
          >
            Save to Sirion as new version
          </Button>
        </div>
      )}
      {versionId === 'v4' && hydrated && clock < STEP_CLOCK[4] && (
        <div style={{ padding: '6px 16px', background: '#FFF8E5', fontSize: 12.5, borderBottom: '1px solid #F2E2B3' }}>
          The signing copy arrives on 19 Nov (step 4). This is v4, the draft that came with Rohan&apos;s round-4 email.
        </div>
      )}
      <WordRibbon
        paneOpen={paneOpen}
        onTogglePane={() => setPaneOpen((v) => !v)}
        trackChanges
      />
      <div className={s.body}>
        <div className={s.canvas}>
          <div className={local.canvasInner}>
            <WordDocument
              version={version}
              edits={edits}
              comments={comments}
              anchorRefs={anchorRefs}
              highlightedClause={highlightedClause}
              markers={paneOpen ? markers : {}}
              notes={paneOpen ? notes : {}}
              editingClause={editing}
              editText={editText}
              onEditText={setEditText}
              onClauseClick={versionId !== 'v7' ? startEdit : undefined}
              chips={paneOpen ? chips : {}}
              onMarkerClick={openIssue}
            />
          </div>
        </div>
        {paneOpen && (
          <PaneFrame width={350} onClose={() => setPaneOpen(false)} footerHref="/deals/D-CLOUDDESK/ledger">
            {working && <WordHeader version={version} rows={rows} issues={review.issues} matches={review.matches} />}
            <TabList size="small" selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as PaneTab)} style={{ marginBottom: 10 }}>
              <Tab value="review">Review</Tab>
              {versionId !== 'v7' && <Tab value="draft">Draft</Tab>}
              <Tab value="compare">Compare</Tab>
              <Tab value="approve">Approve</Tab>
            </TabList>
            {tab === 'review' && (versionId === 'v7' ? (
              <SigningPane rows={rows} version={version} onGoToClause={goToClause} />
            ) : versionId === 'v6' && !checkedAt ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <Spinner size="tiny" /> Checking the signing copy against the ledger…
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{versionId === 'v6' ? 'Signing check' : 'Review'}</span>
                  <span style={{ display: 'flex', gap: 4 }}><OriginTag kind="today" /><OriginTag kind="new" /></span>
                </div>
                {review.issues.map((issue) => (
                  <IssueCard
                    key={issue.clauseNo}
                    issue={issue}
                    version={working ?? version}
                    rows={rows}
                    expanded={expanded === issue.clauseNo}
                    onToggle={() => setExpanded((e) => (e === issue.clauseNo ? undefined : issue.clauseNo))}
                    actions={issueActions}
                    resolvedLabel={rowOf(issue)?.signing === 'waived' ? 'Accepted · waiver logged' : undefined}
                  />
                ))}
                <div style={{ fontSize: 12, color: '#707070', padding: '4px 2px 8px' }}>
                  {review.matches} clause{review.matches === 1 ? '' : 's'} match what was agreed
                </div>
                {emailGaps.length > 1 && versionId !== 'v6' && (
                  <Button appearance="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={insertAll}>
                    Insert all {emailGaps.length} agreed wordings
                  </Button>
                )}
                {versionId === 'v6' && <SigningPane rows={rows} version={version} onGoToClause={goToClause} compact />}
              </div>
            ))}
            {tab === 'draft' && (
              <>
                {versionId === 'v5' && <OurTurnPane edits={edits} />}
                <DraftTab
                  version={version}
                  rows={rows}
                  localEdits={localEdits}
                  editing={editing}
                  editText={editText}
                  onStartEdit={startEdit}
                  onEditText={setEditText}
                  onCommit={commitEdit}
                  onCancel={() => setEditing(undefined)}
                  onRevert={(no) => {
                    setLocalEdits((m) => omit(m, no));
                    setLocalComments((m) => omit(m, no));
                  }}
                  onInsert={(no, text, rowId) => {
                    setLocalEdits((m) => ({ ...m, [no]: text }));
                    const row = rows.find((r) => r.id === rowId);
                    if (row) setLocalComments((m) => ({ ...m, [no]: row.supplierNote }));
                    setEditing(undefined);
                    goToClause(no);
                    logEvent(`Clause ${no}: agreed wording inserted from the ledger in Word.`);
                    toast(`Agreed wording inserted in clause ${no}, with a supplier-safe comment.`);
                  }}
                  onGoTo={goToClause}
                />
              </>
            )}
            {tab === 'compare' && <CompareTab version={version} rows={rows} onGoTo={goToClause} />}
            {tab === 'approve' && (
              <ApproveTab
                version={version}
                gaps={emailGaps}
                onInsertAll={insertAll}
                onReview={() => {
                  setTab('review');
                  if (emailGaps[0]) openIssue(emailGaps[0].clauseNo);
                }}
                onPublished={onPublished}
              />
            )}
          </PaneFrame>
        )}
      </div>
      <WordStatusBar pages={pages} words={countWords(version)} />
    </div>
  );
}

/** v5 is our turn: what we changed, and the next step. */
function OurTurnPane({ edits }: { edits: TrackedEdit[] }) {
  const responded = useDemoStore((st) => st.respondedMessageIds.includes('M8'));
  return (
    <div style={{ display: 'grid', gap: 10, fontSize: 12.5, lineHeight: '18px' }}>
      <div>
        <OriginTag kind="new" />
      </div>
      <strong>Our turn · round 5 · v5</strong>
      <p>
        {edits.length} tracked change{edits.length === 1 ? '' : 's'} against CloudDesk&apos;s v4, each with a
        supplier-safe comment. Everything else in v4 matches the ledger.
      </p>
      {edits.map((edit) => (
        <p key={edit.clauseNo} style={{ background: '#F3F6F6', borderRadius: 4, padding: '6px 8px' }}>
          Clause {edit.clauseNo}: restored to the agreed wording.
        </p>
      ))}
      <p style={{ color: '#5F7377' }}>
        {responded ? 'The reply to Rohan is drafted in Outlook with this file attached.' : 'Use “Respond to round” in Outlook to draft the reply with this file attached.'}
      </p>
      <Link href="/outlook/ananya?msg=M8">Back to Outlook</Link>
    </div>
  );
}
