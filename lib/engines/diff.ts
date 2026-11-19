/** Diff engine — BUILD_SPEC §8.3. Word-level clause diff and value parsing. */
import { diffWords } from 'diff';
import type { Clause, ClauseChange, DocVersion, TermValue } from '@/lib/types';

/**
 * Parse a clause back into a typed value using the §5.4 patterns.
 * Returns null when the clause carries no money or legal term we track.
 */
export function extractValue(clause: Clause): TermValue | null {
  const t = clause.text;

  switch (clause.termKey) {
    case 'term': {
      const m = t.match(/Initial Term is (\d+)/);
      return m ? { kind: 'term', years: Number(m[1]) } : null;
    }
    case 'price': {
      if (/are fixed for the Initial Term/.test(t)) return { kind: 'price', wording: 'fixed' };
      const cap = t.match(/from the start of contract year (\d+) by no more than ([\d.]+) percent/);
      if (cap) {
        return { kind: 'price', wording: 'capped', capPct: Number(cap[2]), fromYear: Number(cap[1]) };
      }
      if (/may revise the Fees once in each contract year/.test(t)) {
        return { kind: 'price', wording: 'open_yearly', fromYear: 2 };
      }
      return null;
    }
    case 'payment': {
      const m = t.match(/within (\d+) \([a-z-]+\) days of receipt/);
      return m ? { kind: 'payment', days: Number(m[1]) } : null;
    }
    case 'service_credit': {
      const pct = t.match(/credit ([\d.]+) percent/);
      const target = t.match(/falls below ([\d.]+)%/);
      return pct && target
        ? { kind: 'service_credit', pct: Number(pct[1]), uptimeTarget: Number(target[1]) }
        : null;
    }
    case 'liability_cap': {
      const m = t.match(/in the (\d+) \([a-z-]+\) months before the claim/);
      return m ? { kind: 'liability_cap', months: Number(m[1]) } : null;
    }
    case 'renewal_notice': {
      const m = t.match(/gives (\d+) \([a-z-]+\) days' written notice/);
      return m ? { kind: 'renewal_notice', days: Number(m[1]) } : null;
    }
    case 'exit_support': {
      const days = t.match(/up to ([a-z-]+) \((\d+)\) days of exit support/);
      const free = /at no additional charge/.test(t);
      return days ? { kind: 'exit_support', days: Number(days[2]), free } : null;
    }
    default:
      return null;
  }
}

/** Compare two versions clause by clause, by clause number. */
export function diffVersions(prev: DocVersion, next: DocVersion): ClauseChange[] {
  const prevByNo = new Map(prev.clauses.map((c) => [c.no, c]));
  const nextByNo = new Map(next.clauses.map((c) => [c.no, c]));
  const changes: ClauseChange[] = [];

  for (const [no, nextClause] of nextByNo) {
    const prevClause = prevByNo.get(no);
    if (!prevClause) {
      changes.push({
        clauseNo: no,
        termKey: nextClause.termKey,
        kind: 'added',
        before: '',
        after: nextClause.text,
        hidden: !next.declaredTrackedChanges.includes(no),
      });
      continue;
    }
    if (prevClause.text !== nextClause.text) {
      changes.push({
        clauseNo: no,
        termKey: nextClause.termKey,
        kind: 'modified',
        before: prevClause.text,
        after: nextClause.text,
        hidden: !next.declaredTrackedChanges.includes(no),
      });
    }
  }

  for (const [no, prevClause] of prevByNo) {
    if (!nextByNo.has(no)) {
      changes.push({
        clauseNo: no,
        termKey: prevClause.termKey,
        kind: 'removed',
        before: prevClause.text,
        after: '',
        hidden: !next.declaredTrackedChanges.includes(no),
      });
    }
  }

  return changes.sort((a, b) => compareClauseNo(a.clauseNo, b.clauseNo));
}

export function compareClauseNo(a: string, b: string): number {
  const [am, an] = a.split('.').map(Number);
  const [bm, bn] = b.split('.').map(Number);
  return am - bm || an - bn;
}

export type DiffPart = { value: string; added?: boolean; removed?: boolean };

/** Word-level parts for rendering a clause change in the source drawer. */
export function wordDiff(before: string, after: string): DiffPart[] {
  return diffWords(before, after).map((p) => ({
    value: p.value,
    added: p.added,
    removed: p.removed,
  }));
}

/** The last version our side sent before this one (v4 is compared with v2). */
export function lastOwnVersion(versions: DocVersion[], before: string): DocVersion | null {
  const ours = versions
    .filter((v) => v.author === 'buyer' && v.sentAt < before)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  return ours.length ? ours[ours.length - 1] : null;
}
