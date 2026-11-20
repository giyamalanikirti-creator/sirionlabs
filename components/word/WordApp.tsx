'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, makeStyles } from '@fluentui/react-components';
import { useWordStyles, WordRibbon, WordStatusBar, WordTitleBar } from './chrome';
import { countWords, paginate, WordDocument, type CommentCard, type TrackedEdit } from './Document';
import { PaneFrame } from '@/components/addin/PaneFrame';
import { SigningPane } from '@/components/addin/SigningPane';
import { RoundDiffPane } from '@/components/addin/RoundDiffPane';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { versionById, versions } from '@/lib/data';
import { ledgerAtStep, STEP_CLOCK } from '@/lib/demo/steps';
import { agreedWording } from '@/lib/engines/wording';
import { diffVersions, extractValue, lastOwnVersion } from '@/lib/engines/diff';

const useLocal = makeStyles({
  canvasInner: { display: 'flex', justifyContent: 'center' },
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
  const [highlightedClause, setHighlightedClause] = useState(versionId === 'v6' || versionId === 'v7' ? '9.1' : undefined);
  const anchorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rows = hydrated ? storedRows : ledgerAtStep(4);

  /* Opening the signing copy means the demo is at step 4. */
  useEffect(() => {
    if (!hydrated || versionId !== 'v6') return;
    if (clock < STEP_CLOCK[3]) {
      advanceTo(3);
      return;
    }
    if (clock < STEP_CLOCK[4]) setClock(STEP_CLOCK[4]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, versionId, clock]);

  useEffect(() => {
    if (versionId === 'v6' || versionId === 'v7') anchorRefs.current['9.1']?.scrollIntoView({ block: 'center' });
  }, [versionId, version]);

  /* Tracked changes and comments come from the rows whose wording we inserted. */
  const { edits, comments } = useMemo(() => {
    if (!version) return { edits: [] as TrackedEdit[], comments: [] as CommentCard[] };
    const e: TrackedEdit[] = [];
    const c: CommentCard[] = [];
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
    return { edits: e, comments: c };
  }, [rows, version]);

  const goToClause = (clauseNo: string) => {
    setHighlightedClause(clauseNo);
    const el = anchorRefs.current[clauseNo];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!version) {
    return <div style={{ padding: 32, fontSize: 13 }}>That version is not in the demo data.</div>;
  }

  const pages = paginate(version.clauses).length;
  const prev = lastOwnVersion(versions, version.sentAt);
  const roundChanges = prev ? diffVersions(prev, version) : [];

  return (
    <div className={s.app}>
      <WordTitleBar fileName={version.fileName.replace('.docx', '')} />
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
            />
          </div>
        </div>
        {paneOpen && (
          <PaneFrame width={330} onClose={() => setPaneOpen(false)}>
            {versionId === 'v6' ? (
              checkedAt ? <SigningPane rows={rows} version={version} onGoToClause={goToClause} /> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <p>CloudDesk says it accepted the changes. Compare the signing copy with the ledger before sending it for signature.</p>
                  <Button appearance="primary" onClick={runSigningCheck}>Run signing check</Button>
                </div>
              )
            ) : versionId === 'v7' ? (
              <SigningPane rows={rows} version={version} onGoToClause={goToClause} />
            ) : (
              <RoundDiffPane version={version} changes={roundChanges} />
            )}
          </PaneFrame>
        )}
      </div>
      <WordStatusBar pages={pages} words={countWords(version)} />
    </div>
  );
}
