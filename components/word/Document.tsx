'use client';

/** The signing copy, rendered as A4 pages with tracked changes — §4C. */
import { useEffect, useRef, useState } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import type { Clause, DocVersion } from '@/lib/types';

/** Ananya's revision colour, as Word assigns one colour per author. */
export const AUTHOR_COLOUR = '#A4262C';

const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN = 96;
const CONTENT_H = PAGE_H - MARGIN * 2;

const useStyles = makeStyles({
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: '24px' },
  page: {
    width: `${PAGE_W}px`,
    minHeight: `${PAGE_H}px`,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 4px rgba(0,0,0,0.14), 0 0 1px rgba(0,0,0,0.1)',
    ...shorthands.padding(`${MARGIN}px`),
    position: 'relative',
    fontFamily: "var(--font-carlito), Carlito, Calibri, 'Segoe UI', sans-serif",
    fontSize: '14.7px',
    lineHeight: '1.15',
    color: '#000',
  },
  docTitle: {
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '18.7px',
    marginBottom: '18px',
  },
  docSub: { textAlign: 'center', fontSize: '13px', color: '#444', marginBottom: '26px' },
  clause: { marginBottom: '8px', position: 'relative' },
  heading: { fontWeight: 700, marginBottom: '2px' },
  changeBar: {
    position: 'absolute',
    left: '-28px',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: '#767676',
  },
  pageNo: {
    position: 'absolute',
    bottom: '48px',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: '12px',
    color: '#767676',
  },
  anchor: { backgroundColor: '#FFF3CD', ...shorthands.borderRadius('2px') },
  commentsCol: {
    width: '280px',
    flexShrink: 0,
    ...shorthands.padding('0', '16px'),
  },
  commentCard: {
    backgroundColor: '#fff',
    ...shorthands.border('1px', 'solid', '#E0E0E0'),
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('10px', '12px'),
    marginBottom: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  commentHead: { display: 'flex', alignItems: 'center', columnGap: '8px', marginBottom: '6px' },
  commentAvatar: {
    width: '24px',
    height: '24px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: '#0C5E69',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentAuthor: { fontSize: '12.5px', fontWeight: tokens.fontWeightSemibold },
  commentTime: { fontSize: '11px', color: tokens.colorNeutralForeground3 },
  commentText: { fontSize: '13px', lineHeight: '18px', color: tokens.colorNeutralForeground1 },
  replyBox: {
    marginTop: '8px',
    ...shorthands.border('1px', 'solid', '#E0E0E0'),
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('5px', '8px'),
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

export interface TrackedEdit {
  clauseNo: string;
  /** Only the operative sentence is struck through. */
  before: string;
  after: string;
  /** The rest of the clause, which the amendment leaves alone. */
  tail?: string;
}

export interface CommentCard {
  clauseNo: string;
  author: string;
  initials: string;
  text: string;
}

/** Rough height of a clause, used to break pages the way Word would. */
function clauseHeight(c: Clause): number {
  const charsPerLine = 78;
  const lines = Math.ceil((`${c.no} ${c.title}`.length + c.text.length) / charsPerLine);
  return 22 + lines * 17 + 8;
}

export function paginate(clauses: Clause[], firstPageOffset = 150): Clause[][] {
  const pages: Clause[][] = [];
  let current: Clause[] = [];
  let used = firstPageOffset;
  for (const c of clauses) {
    const h = clauseHeight(c);
    if (used + h > CONTENT_H && current.length) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(c);
    used += h;
  }
  if (current.length) pages.push(current);
  return pages;
}

export function countWords(version: DocVersion): number {
  return version.clauses.reduce(
    (n, c) => n + c.text.split(/\s+/).filter(Boolean).length + c.title.split(/\s+/).length + 1,
    40,
  );
}

/** A clause with its tracked change shown in All Markup view. */
function ClauseBody({ clause, edit }: { clause: Clause; edit?: TrackedEdit }) {
  if (!edit) return <>{clause.text}</>;

  // Only the operative sentence is struck through. The rest of the clause is
  // untouched, which is what an amendment to one term actually looks like.
  return (
    <>
      <span style={{ color: AUTHOR_COLOUR, textDecoration: 'line-through' }}>{edit.before}</span>{' '}
      <span style={{ color: AUTHOR_COLOUR, textDecoration: 'underline' }}>{edit.after}</span>
      {edit.tail ? <span>{edit.tail}</span> : null}
    </>
  );
}

export function WordDocument({
  version,
  edits,
  comments,
  anchorRefs,
}: {
  version: DocVersion;
  edits: TrackedEdit[];
  comments: CommentCard[];
  anchorRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const s = useStyles();
  const pages = paginate(version.clauses);
  const editFor = (no: string) => edits.find((e) => e.clauseNo === no);

  const localRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [offsets, setOffsets] = useState<Record<string, number>>({});

  // Each comment card sits level with the text it is attached to. Measuring
  // the laid-out page is only possible after it has rendered.
  useEffect(() => {
    const next: Record<string, number> = {};
    for (const cm of comments) {
      const el = localRefs.current[cm.clauseNo];
      const page = el?.closest('[data-page]') as HTMLElement | null;
      if (el && page) {
        next[cm.clauseNo] = el.getBoundingClientRect().top - page.getBoundingClientRect().top;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffsets((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [comments, edits, version.id]);

  return (
    <div className={s.stack}>
      {pages.map((clauses, pageIndex) => (
        <div key={pageIndex} style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div className={s.page} data-page={pageIndex}>
            {pageIndex === 0 && (
              <>
                <div className={s.docTitle}>MASTER SERVICES AGREEMENT</div>
                <div className={s.docSub}>
                  between Meridian Foods Private Limited and CloudDesk Technologies Private Limited
                  <br />
                  Helpdesk subscription · renewal term from 1 December 2026
                </div>
              </>
            )}

            {clauses.map((c) => {
              const edit = editFor(c.no);
              const hasComment = comments.some((cm) => cm.clauseNo === c.no);
              return (
                <div
                  key={c.no}
                  className={s.clause}
                  ref={(el) => {
                    if (anchorRefs) anchorRefs.current[c.no] = el;
                    localRefs.current[c.no] = el;
                  }}
                >
                  {edit && <span className={s.changeBar} />}
                  <div className={s.heading}>
                    {c.no} {c.title}
                  </div>
                  <div className={hasComment ? s.anchor : undefined}>
                    <ClauseBody clause={c} edit={edit} />
                  </div>
                </div>
              );
            })}

            <div className={s.pageNo}>{pageIndex + 1}</div>
          </div>

          <div className={s.commentsCol} style={{ position: 'relative', minHeight: PAGE_H }}>
            {comments
              .filter((cm) => clauses.some((c) => c.no === cm.clauseNo))
              .map((cm) => (
                <div
                  key={cm.clauseNo}
                  className={s.commentCard}
                  style={
                    offsets[cm.clauseNo] !== undefined
                      ? { position: 'absolute', top: offsets[cm.clauseNo], left: 16, right: 16 }
                      : undefined
                  }
                >
                  <div className={s.commentHead}>
                    <span className={s.commentAvatar}>{cm.initials}</span>
                    <span>
                      <span className={s.commentAuthor}>{cm.author}</span>{' '}
                      <span className={s.commentTime}>Just now</span>
                    </span>
                  </div>
                  <div className={s.commentText}>{cm.text}</div>
                  <div className={s.replyBox}>Reply</div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
