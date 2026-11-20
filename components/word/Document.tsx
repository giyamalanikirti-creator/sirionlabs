'use client';

/** The signing copy, rendered as A4 pages with tracked changes — §4C. */
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import type { Clause, DocVersion } from '@/lib/types';

/** Ananya's revision colour, as Word assigns one colour per author. */
export const AUTHOR_COLOUR = '#A4262C';

const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN = 96;
const CONTENT_H = PAGE_H - MARGIN * 2;

const useStyles = makeStyles({
  stack: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: '24px' },
  page: {
    width: `min(${PAGE_W}px, 100%)`,
    boxSizing: 'border-box',
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
    marginTop: '24px',
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
    marginTop: '8px',
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

export interface ClauseMarker {
  tone: 'ok' | 'warn' | 'risk' | 'muted';
  title: string;
}

const MARKER_COLOUR: Record<ClauseMarker['tone'], string> = {
  ok: '#107C10',
  warn: '#C19C00',
  risk: '#C50F1F',
  muted: '#A0A0A0',
};

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
function ClauseBody({ clause, edit, highlighted }: { clause: Clause; edit?: TrackedEdit; highlighted: boolean }) {
  if (!edit) {
    if (!highlighted) return <>{clause.text}</>;
    const end = clause.text.indexOf('. ') + 1;
    return <><mark>{end ? clause.text.slice(0, end) : clause.text}</mark>{end ? clause.text.slice(end) : ''}</>;
  }

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
  highlightedClause,
  markers = {},
  notes = {},
  editingClause,
  editText = '',
  onEditText,
  onClauseClick,
  chips = {},
  onMarkerClick,
}: {
  version: DocVersion;
  edits: TrackedEdit[];
  comments: CommentCard[];
  highlightedClause?: string;
  anchorRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  /** Deal Ledger's gutter marker per clause: matches, differs, waiting. */
  markers?: Record<string, ClauseMarker>;
  /** Inline notes under a clause, e.g. the edit guard's warning. */
  notes?: Record<string, React.ReactNode>;
  /** The clause being edited in place. */
  editingClause?: string;
  editText?: string;
  onEditText?: (text: string) => void;
  onClauseClick?: (clauseNo: string) => void;
  /** Pane chrome beside a clause heading, e.g. "₹3.9L/yr". Never part of the document text. */
  chips?: Record<string, string>;
  onMarkerClick?: (clauseNo: string) => void;
}) {
  const s = useStyles();
  const pages = paginate(version.clauses);
  const editFor = (no: string) => edits.find((e) => e.clauseNo === no);

  return (
    <div className={s.stack}>
      {pages.map((clauses, pageIndex) => (
        <div key={pageIndex} style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
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
              const comment = comments.find((cm) => cm.clauseNo === c.no);
              return (
                <div
                  key={c.no}
                  className={s.clause}
                  ref={(el) => {
                    if (anchorRefs) anchorRefs.current[c.no] = el;
                  }}
                  onClick={onClauseClick && editingClause !== c.no ? () => onClauseClick(c.no) : undefined}
                  style={onClauseClick && editingClause !== c.no ? { cursor: 'text' } : undefined}
                >
                  {edit && <span className={s.changeBar} />}
                  {markers[c.no] && (
                    <span
                      title={markers[c.no].title}
                      aria-label={markers[c.no].title}
                      role={onMarkerClick ? 'button' : undefined}
                      onClick={onMarkerClick ? (e) => { e.stopPropagation(); onMarkerClick(c.no); } : undefined}
                      style={{
                        cursor: onMarkerClick ? 'pointer' : undefined,
                        position: 'absolute',
                        left: '-52px',
                        top: '3px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: MARKER_COLOUR[markers[c.no].tone],
                        boxShadow: '0 0 0 2px #fff',
                      }}
                    />
                  )}
                  <div className={s.heading}>
                    {c.no} {c.title}
                    {chips[c.no] && (
                      <span
                        contentEditable={false}
                        aria-hidden
                        onClick={onMarkerClick ? (e) => { e.stopPropagation(); onMarkerClick(c.no); } : undefined}
                        style={{
                          marginLeft: 8,
                          padding: '1px 6px',
                          borderRadius: 999,
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#C50F1F',
                          background: '#FDF3F4',
                          border: '1px solid #F1BBBC',
                          cursor: onMarkerClick ? 'pointer' : undefined,
                          userSelect: 'none',
                        }}
                      >
                        {chips[c.no]}
                      </span>
                    )}
                  </div>
                  {editingClause === c.no ? (
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => onEditText?.(e.target.value)}
                      aria-label={`Edit clause ${c.no}`}
                      style={{
                        width: '100%',
                        minHeight: 90,
                        font: 'inherit',
                        lineHeight: 1.3,
                        border: '1px solid #0C5E69',
                        borderRadius: 2,
                        padding: 4,
                        color: AUTHOR_COLOUR,
                        resize: 'vertical',
                      }}
                    />
                  ) : (
                    <div className={comment ? s.anchor : undefined}>
                      <ClauseBody clause={c} edit={edit} highlighted={highlightedClause === c.no} />
                    </div>
                  )}
                  {notes[c.no]}
                  {comment && <aside className={s.commentCard} aria-label="Comment on this clause">
                    <div className={s.commentHead}>
                      <span className={s.commentAvatar}>{comment.initials}</span>
                      <span className={s.commentAuthor}>{comment.author}</span>
                    </div>
                    <div className={s.commentText}>{comment.text}</div>
                  </aside>}
                </div>
              );
            })}

            <div className={s.pageNo}>{pageIndex + 1}</div>
          </div>

        </div>
      ))}
    </div>
  );
}
