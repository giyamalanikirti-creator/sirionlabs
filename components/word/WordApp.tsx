'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Spinner, Tab, TabList, makeStyles } from '@fluentui/react-components';
import { CompareTab, DraftTab, LensTab, SirionTab, STATUS_TEXT } from '@/components/addin/WordTabs';
import { guardClauseEdit, lensForVersion, type ClauseLens } from '@/lib/engines/wordLens';
import { cloudDeskDeal } from '@/lib/data';
import { formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import { CONTRACT_ID } from '@/lib/settings';

type PaneTab = 'check' | 'lens' | 'draft' | 'compare' | 'sirion';

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
  const [tab, setTab] = useState<PaneTab>(versionId === 'v6' || versionId === 'v7' ? 'check' : versionId === 'v5' ? 'draft' : 'lens');
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

  /* The ledger lens runs on the file as it now reads, including edits typed here. */
  const working = useMemo(
    () => (version ? { ...version, clauses: version.clauses.map((cl) => (localEdits[cl.no] ? { ...cl, text: localEdits[cl.no] } : cl)) } : undefined),
    [version, localEdits],
  );
  const lens = useMemo(() => (working ? lensForVersion(working, rows, cloudDeskDeal) : []), [working, rows]);
  const markers = Object.fromEntries(
    lens.map((l) => [
      l.clauseNo,
      {
        tone: l.status === 'matches' ? 'ok' : l.status === 'differs' ? 'risk' : l.status === 'pending' ? 'warn' : 'muted',
        title: `${l.label}: ${STATUS_TEXT[l.status]}${l.status === 'differs' ? ` (agreed ${l.agreedPlain.toLowerCase()})` : ''}`,
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
            />
          </div>
        </div>
        {paneOpen && (
          <PaneFrame width={350} onClose={() => setPaneOpen(false)} footerHref="/deals/D-CLOUDDESK/ledger">
            <TabList size="small" selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as PaneTab)} style={{ marginBottom: 10, flexWrap: 'wrap' }}>
              {(versionId === 'v6' || versionId === 'v7') && <Tab value="check">Signing</Tab>}
              <Tab value="lens">Ledger</Tab>
              {versionId !== 'v7' && <Tab value="draft">Draft</Tab>}
              <Tab value="compare">Compare</Tab>
              <Tab value="sirion">Sirion</Tab>
            </TabList>
            {tab === 'check' && (versionId === 'v6' ? (
              checkedAt ? <SigningPane rows={rows} version={version} onGoToClause={goToClause} /> : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <Spinner size="tiny" /> Checking the signing copy against the ledger…
                </div>
              )
            ) : (
              <SigningPane rows={rows} version={version} onGoToClause={goToClause} />
            ))}
            {tab === 'lens' && <LensTab version={version} lens={lens} onGoTo={goToClause} />}
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
            {tab === 'sirion' && (
              <SirionTab
                version={version}
                onInsertPreferred={(no, text) => {
                  setLocalEdits((m) => ({ ...m, [no]: text }));
                  goToClause(no);
                  toast(`Preferred clause inserted in ${no} from the Content Library.`);
                }}
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
