'use client';

/**
 * Deal Ledger for Word: the Review and Approve tabs.
 *
 * Sirion's Word add-in (today) checks a draft against the company playbook.
 * Deal Ledger (new) adds a second check against what was agreed with this
 * supplier in email, puts an expected ₹-a-year figure on every clause that
 * differs with the working shown, and, as a cross-check, what other companies
 * saw when they accepted the same term (sample data).
 */
import { useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal, messages, personByEmail, personName } from '@/lib/data';
import { useSourceDrawer } from '@/lib/drawer';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { approvalRoute } from '@/lib/engines/approvals';
import { wordDiff } from '@/lib/engines/diff';
import { COST_RULE } from '@/lib/engines/explain';
import { PEER_MIN_COMPANIES, PEER_MIN_CONTRACTS } from '@/lib/engines/peers';
import { PLAYBOOK } from '@/lib/engines/playbook';
import { agreedWording, askSupplierDraft } from '@/lib/engines/wording';
import type { ReviewIssue } from '@/lib/engines/wordLens';
import { formatDateShort, formatLakh, formatPct, HEADLINE_SUFFIX } from '@/lib/format';
import { plainValue, sameValue } from '@/lib/plain';
import { CONTRACT_ID } from '@/lib/settings';
import type { DocVersion, LedgerRow, TermValue } from '@/lib/types';
import { OriginTag, PaneHeadlineExplainer } from './SirionBlocks';
import { StatusIcon } from './WordTabs';
import { usePaneStyles } from './paneStyles';

const BASIS_NOUN: Record<string, string> = {
  price: 'software contracts',
  renewal_notice: 'past renewals',
  service_credit: 'months of uptime',
};

function SourceBadge({ kind }: { kind: 'playbook' | 'email' }) {
  return kind === 'playbook' ? (
    <Badge size="small" appearance="outline" color="informative" title="Sirion IssueDetection, against the playbook (today)">Playbook</Badge>
  ) : (
    <Badge size="small" appearance="filled" color="brand" title="Deal Ledger, against what was agreed in email (new)">Agreed in email</Badge>
  );
}

function SamplePill() {
  return (
    <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '1px 6px', borderRadius: 999, background: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground3 }}>
      Sample data
    </span>
  );
}

/** Where the agreed value came from, in a supplier-safe phrase: "on 14 Nov", "in v3". */
function agreedWhen(row: LedgerRow): string {
  if (row.source.kind === 'version') return `in ${row.source.versionId}`;
  if (row.source.kind === 'call_note') return `on our call of ${formatDateShort(row.source.at)}`;
  return `by email on ${formatDateShort(row.source.at)}`;
}

/** The email a reply about this file goes to: the supplier's email that carried it, else Rohan's round email. */
function carrierFor(version: DocVersion) {
  const m = messages.find((x) => x.attachments.some((a) => a.versionId === version.id));
  return m && personByEmail(m.from)?.org === 'clouddesk' ? m : messages.find((x) => x.id === 'M8')!;
}

/* ------------------------------------------------------------------ */
/* Pane header: contract record (today) and the headline card (new)    */
/* ------------------------------------------------------------------ */

export function WordHeader({
  version,
  rows,
  issues,
  matches,
  connectedBy = 'tag',
}: {
  version: DocVersion;
  rows: LedgerRow[];
  issues: ReviewIssue[];
  matches: number;
  connectedBy?: 'tag' | 'fingerprint' | 'search';
}) {
  const s = usePaneStyles();
  const signedAt = useDemo((st) => st.signedAt);
  const differs = issues.filter((i) => i.sources.includes('email') && i.costLakhPerYr !== null);
  const total = differs.reduce((sum, i) => sum + (i.costLakhPerYr ?? 0), 0);
  const playbookCount = issues.filter((i) => i.sources.includes('playbook')).length;
  const deal = dealAtRisk(rows, cloudDeskDeal);
  const sameAsDeal = Math.abs(deal - total) < 0.005;
  const role = version.id === 'v6' ? 'Signing copy' : version.id === 'v7' ? 'Returned copy' : version.author === 'buyer' ? 'Our draft' : 'Supplier draft';

  return (
    <>
      <section className={s.card} style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {cloudDeskDeal.supplier} · {CONTRACT_ID} · {version.id}
          </span>
          <OriginTag kind="today" />
        </div>
        <div className={s.grey}>
          {role} · {personName(cloudDeskDeal.ownerId)} · {signedAt ? 'Signed' : 'Negotiating'}
        </div>
        <div style={{ fontSize: 11.5, marginTop: 4, color: tokens.colorPaletteGreenForeground1 }}>
          ● Connected · {cloudDeskDeal.supplier} MSA · {version.id} · Tracked negotiation
          <span style={{ color: tokens.colorNeutralForeground3 }}>
            {' '}
            ({connectedBy === 'tag' ? 'Sirion tag in the file' : connectedBy === 'fingerprint' ? 'matched by clause text, now tagged' : 'chosen by you, now tagged'})
          </span>
        </div>
      </section>

      <section className={s.card} style={{ borderColor: tokens.colorBrandStroke1, boxShadow: `inset 3px 0 0 ${tokens.colorBrandBackground}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span className={s.sectionLabel} style={{ margin: 0 }}>If signed as is</span>
          <OriginTag kind="new" />
        </div>
        <div style={{ marginTop: 4 }}>
          <span className={s.money}>{formatLakh(total)}</span> <span className={s.moneySuffix}>a year (expected)</span>
        </div>
        <div className={s.grey}>
          {differs.length} clause{differs.length === 1 ? '' : 's'} differ{differs.length === 1 ? 's' : ''} from what was agreed · playbook issues: {playbookCount} · {matches} match
        </div>
        {sameAsDeal ? (
          <PaneHeadlineExplainer rows={rows} />
        ) : (
          <>
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 11.5, cursor: 'pointer', color: tokens.colorBrandForeground1 }}>How is this worked out?</summary>
              <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: '16px' }}>
                <div style={{ background: tokens.colorNeutralBackground3, borderRadius: 4, padding: '6px 8px', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>{COST_RULE[0]}</div>
                  <div style={{ color: tokens.colorNeutralForeground3 }}>{COST_RULE[1]}</div>
                </div>
                {differs.map((i) => (
                  <p key={i.clauseNo} style={{ margin: '4px 0' }}>
                    <strong>{i.label}:</strong> this file says {i.lens!.docPlain.toLowerCase()}; agreed {i.lens!.agreedPlain.toLowerCase()}. {i.lens!.proof[0]} →{' '}
                    <strong>{formatLakh(i.costLakhPerYr)} a year</strong>.
                  </p>
                ))}
                {differs.length === 0 && <p style={{ margin: '4px 0' }}>Every priced clause in this file matches what was agreed.</p>}
              </div>
            </details>
            <PaneHeadlineExplainer rows={rows} label={`Whole deal, every open term: ${formatLakh(deal)} ${HEADLINE_SUFFIX} (as on the deal page and in Outlook)`} />
          </>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Issue card                                                          */
/* ------------------------------------------------------------------ */

export interface IssueActions {
  onInsertAgreed: (issue: ReviewIssue) => void;
  onUseRung: (issue: ReviewIssue, value: TermValue, label: 'preferred' | 'fallback' | 'walk-away') => void;
  onAccept: (issue: ReviewIssue, reason: string) => void;
  onNotRight: (issue: ReviewIssue) => void;
  onGoTo: (clauseNo: string) => void;
}

export function IssueCard({
  issue,
  version,
  rows,
  expanded,
  onToggle,
  actions,
  resolvedLabel,
}: {
  issue: ReviewIssue;
  version: DocVersion;
  rows: LedgerRow[];
  expanded: boolean;
  onToggle: () => void;
  actions: IssueActions;
  resolvedLabel?: string;
}) {
  const s = usePaneStyles();
  const openSource = useSourceDrawer((st) => st.open);
  const [accepting, setAccepting] = useState(false);
  const [reason, setReason] = useState('');
  const l = issue.lens;
  const row = l ? rows.find((r) => r.id === l.rowId) : undefined;
  const clause = version.clauses.find((c) => c.no === issue.clauseNo);
  const priced = issue.costLakhPerYr !== null;
  const route = row && l ? approvalRoute(row, issue.costLakhPerYr) : null;

  const collapsed = (
    <div onClick={onToggle} data-tour={`issue-${issue.clauseNo}`} style={{ cursor: 'pointer' }}>
      <div className={s.termHead}>
        <span className={s.termName} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {expanded ? <ChevronDownRegular fontSize={12} /> : <ChevronRightRegular fontSize={12} />}
          {l ? <StatusIcon status={l.status} /> : null} {issue.clauseNo} · {issue.label}
        </span>
        {priced ? (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: tokens.colorPaletteRedForeground1, whiteSpace: 'nowrap' }}>{formatLakh(issue.costLakhPerYr)}</span>
        ) : null}
      </div>
      <div className={s.tags} style={{ marginTop: 2 }}>
        {issue.sources.map((k) => <SourceBadge key={k} kind={k} />)}
        {resolvedLabel && <Badge size="small" appearance="filled" color="informative">{resolvedLabel}</Badge>}
      </div>
      {l ? (
        <div style={{ fontSize: 12, marginTop: 4, lineHeight: '17px' }}>
          <div>Agreed: {l.agreedPlain}</div>
          <div>This draft: {l.docPlain}</div>
        </div>
      ) : (
        <div style={{ fontSize: 12, marginTop: 4 }}>{issue.playbook?.text} · no ₹ figure (playbook issue)</div>
      )}
    </div>
  );

  if (!expanded || !l || !row || !clause) {
    return <section className={s.card} id={`issue-${issue.clauseNo}`}>{collapsed}</section>;
  }

  const agreedText = agreedWording(row.termKey, row.position);
  const firstStop = clause.text.indexOf('. ');
  const draftSentence = l.docValue && firstStop >= 0 ? clause.text.slice(0, firstStop + 1) : clause.text;
  const parts = wordDiff(agreedText, draftSentence);
  const entry = PLAYBOOK[row.termKey];
  const rungs: { key: 'preferred' | 'fallback' | 'walk-away'; label: string; value: TermValue; condition?: string }[] = entry
    ? [
        { key: 'preferred', label: 'Preferred', value: entry.preferred },
        ...(entry.fallback ? [{ key: 'fallback' as const, label: 'Fallback', value: entry.fallback.value, condition: entry.fallback.condition }] : []),
        ...(entry.walkAway ? [{ key: 'walk-away' as const, label: 'Walk-away', value: entry.walkAway.value, condition: entry.walkAway.condition }] : []),
      ]
    : [];
  const draftOnLadder = rungs.some((r) => l.docValue && sameValue(r.value, l.docValue));
  const carrier = carrierFor(version);
  const greeting = personByEmail(carrier.from)?.name.split(' ')[0] ?? 'Rohan';
  const askHref = `/outlook/ananya?msg=${carrier.id}&draft=${encodeURIComponent(
    askSupplierDraft({ greetingName: greeting, clauseNo: clause.no, fileName: version.fileName, docPlain: l.docPlain, agreedPlain: l.agreedPlain, agreedWhen: agreedWhen(row) }),
  )}`;

  return (
    <section className={s.card} id={`issue-${issue.clauseNo}`} style={{ borderColor: tokens.colorPaletteRedBorder1 }}>
      {collapsed}

      {/* 2 · Agreed, with the exact source */}
      <p className={s.sectionLabel}>Agreed</p>
      <div style={{ fontSize: 12.5 }}>{l.agreedPlain}</div>
      <div className={s.tags}>
        <Badge appearance="outline" color="informative" size="small" style={{ cursor: 'pointer' }} onClick={() => openSource(row.source, true)}>
          Source · {row.source.kind === 'email' ? `${personName(row.source.byPersonId)}, ${formatDateShort(row.source.at)}` : row.source.kind === 'version' ? `${row.source.versionId}, clause ${row.source.clauseNo}` : `call, ${formatDateShort(row.source.at)}`}
        </Badge>
      </div>
      {row.source.kind === 'email' && row.source.quote && <div className={s.quote}>“{row.source.quote}”</div>}

      {/* 3 · This draft says, with a word diff against the agreed wording */}
      <p className={s.sectionLabel}>This draft says</p>
      <div className={s.quote} style={{ fontSize: 12, lineHeight: '17px' }}>
        {parts.map((p, i) =>
          p.removed ? (
            <span key={i} style={{ textDecoration: 'line-through', color: tokens.colorPaletteGreenForeground1 }}>{p.value}</span>
          ) : p.added ? (
            <span key={i} style={{ textDecoration: 'underline', color: tokens.colorPaletteRedForeground1, fontWeight: 600 }}>{p.value}</span>
          ) : (
            <span key={i}>{p.value}</span>
          ),
        )}
      </div>
      <div className={s.grey}>Struck through: the agreed wording this draft drops. Underlined: what it says instead.</div>

      {/* 4 · Expected cost */}
      {priced && (
        <>
          <p className={s.sectionLabel}>Expected cost</p>
          <div>
            <span style={{ fontSize: 22, fontWeight: 600, color: tokens.colorPaletteRedForeground1 }}>{formatLakh(issue.costLakhPerYr)}</span>{' '}
            <span className={s.moneySuffix}>a year</span>
          </div>
          {l.overTermLakh !== undefined && <div className={s.grey}>{formatLakh(l.overTermLakh)} over {cloudDeskDeal.termYears} years</div>}
          {l.onceLakh !== undefined && (
            <div className={s.grey}>
              {formatLakh(l.onceLakh)} at the next renewal{l.exposureLakh ? ` · ${formatLakh(l.exposureLakh)} full exposure` : ''}
            </div>
          )}
          <div className={s.tags}>
            <Badge size="small" appearance="tint" color={l.confidence === 'high' ? 'success' : l.confidence === 'formula' ? 'informative' : 'warning'}>
              {l.confidence === 'formula'
                ? "Formula · Finance's cost of money"
                : `Based on ${l.n ?? '—'} of your ${BASIS_NOUN[row.termKey] ?? 'records'} · ${l.confidence ?? 'low'}`}
            </Badge>
          </div>

          {/* 5 · How we worked this out */}
          <p className={s.sectionLabel}>How we worked this out</p>
          <div style={{ fontSize: 11.5, lineHeight: '16px' }}>
            {l.proof.slice(0, 2).map((p) => (
              <div key={p}>{p}</div>
            ))}
          </div>
          {l.formula && (
            <details style={{ fontSize: 11, marginTop: 2 }}>
              <summary style={{ cursor: 'pointer', color: tokens.colorBrandForeground1 }}>Show the sum</summary>
              <code style={{ fontSize: 11 }}>{l.formula}</code>
              <div className={s.grey}>{COST_RULE[0]}</div>
            </details>
          )}
          {row.termKey === 'renewal_notice' && (
            <div className={s.grey} title="A 90-day notice means deciding three months before renewal; in this company's history those decisions were missed more often." style={{ marginTop: 4 }}>
              Why can a longer notice cost more? Deciding three months early is missed more often in your own history.
            </div>
          )}
        </>
      )}

      {/* 6 · What other companies saw */}
      {issue.peer && (
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, background: tokens.colorNeutralBackground2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600 }}>{issue.peer.primary === 'peer' ? 'Based on other companies on Sirion' : 'What other companies saw'}</span>
            <SamplePill />
          </div>
          {issue.peer.text.map((t) => (
            <div key={t} style={{ fontSize: 11.5, lineHeight: '16px', marginTop: 2 }}>{t}</div>
          ))}
          {issue.peer.disagrees && <div style={{ fontSize: 11.5, marginTop: 2, fontWeight: 600 }}>Your history and other companies disagree. The figure uses yours.</div>}
          {issue.peer.landed && (
            <div style={{ fontSize: 11, marginTop: 4, color: tokens.colorNeutralForeground3 }}>
              Where they landed when a supplier asked for this: {issue.peer.landed.map((x) => `${formatPct(x.share)} ${x.label}`).join(' · ')}
            </div>
          )}
          <details style={{ fontSize: 11, marginTop: 4 }}>
            <summary style={{ cursor: 'pointer', color: tokens.colorBrandForeground1 }}>How peer data works</summary>
            <ul style={{ margin: '4px 0 0', paddingLeft: 16, lineHeight: '15px' }}>
              <li>Shown only for cells with at least {PEER_MIN_COMPANIES} companies and {PEER_MIN_CONTRACTS} contracts.</li>
              <li>Aggregates only (median and middle half); no contract text, company or contract IDs.</li>
              <li>At least a quarter old; percentages rounded to 0.5 points.</li>
              <li>Category level (software, India, 1–3 years, ₹25 lakh–₹1 crore a year). No supplier-named figures.</li>
              <li>Opt-in per company: contributors get access, others do not. The headline uses your own data only.</li>
            </ul>
          </details>
        </div>
      )}

      {/* 7 · Ladder (Sirion's playbook positions) */}
      {rungs.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span className={s.sectionLabel} style={{ margin: 0 }}>Playbook ladder</span>
            <OriginTag kind="today" />
          </div>
          {rungs.map((r) => {
            const isAgreed = sameValue(r.value, row.position);
            const isDraft = l.docValue ? sameValue(r.value, l.docValue) : false;
            return (
              <div key={r.key} className={s.listRow} style={{ alignItems: 'flex-start' }}>
                <span className={s.listName}>
                  <span style={{ fontWeight: 600 }}>{r.label}</span> · {plainValue(r.value, cloudDeskDeal.termYears)}
                  {r.condition ? `, ${r.condition}` : ''}
                  <span style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    {isAgreed && <Badge size="extra-small" appearance="filled" color="success">Agreed</Badge>}
                    {isDraft && <Badge size="extra-small" appearance="filled" color="danger">This draft</Badge>}
                  </span>
                </span>
                {!isAgreed && r.key !== 'preferred' && (
                  <Button size="small" appearance="outline" onClick={() => actions.onUseRung(issue, r.value, r.key)}>
                    Use
                  </Button>
                )}
              </div>
            );
          })}
          {!draftOnLadder && <div className={s.grey}>This draft ({l.docPlain.toLowerCase()}) is outside the ladder.</div>}
        </>
      )}

      {/* 8 · Actions */}
      <div className={s.actions}>
        <Button size="small" appearance="primary" onClick={() => actions.onInsertAgreed(issue)}>Insert agreed wording</Button>
        <Link href={askHref}><Button size="small">Ask the supplier</Button></Link>
        <Button size="small" onClick={() => setAccepting(true)}>Accept this change</Button>
        <Button size="small" appearance="outline" onClick={() => actions.onNotRight(issue)}>Not right?</Button>
      </div>
      <div className={s.grey} style={{ marginTop: 4 }}>
        The inserted wording carries a supplier-safe comment: no ₹, no internal names, no peer data.
      </div>

      <Dialog open={accepting} onOpenChange={(_, d) => !d.open && setAccepting(false)}>
        <DialogSurface style={{ maxWidth: 440 }}>
          <DialogBody>
            <DialogTitle>Accept this change?</DialogTitle>
            <DialogContent>
              <p style={{ fontSize: 13, margin: '0 0 8px' }}>
                {issue.label}: agreed {l.agreedPlain.toLowerCase()}, this copy says {l.docPlain.toLowerCase()}.
                {priced ? ` Expected cost ${formatLakh(issue.costLakhPerYr)} a year.` : ''}
              </p>
              {route && (
                <p style={{ fontSize: 12.5, margin: '0 0 10px', fontWeight: 600 }}>
                  Needs approval: {personName(route.approverId)} · {route.rule}
                </p>
              )}
              <Field label="Reason (logged as a waiver)" required>
                <Textarea value={reason} onChange={(_, d) => setReason(d.value)} placeholder="e.g. Agreed on a call in return for faster onboarding" />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setAccepting(false)}>Cancel</Button>
              <Button
                appearance="primary"
                disabled={!reason.trim()}
                onClick={() => {
                  actions.onAccept(issue, reason.trim());
                  setAccepting(false);
                  setReason('');
                }}
              >
                Accept and request approval
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Approve tab: Sirion's actions, with the publish gate                */
/* ------------------------------------------------------------------ */

export function ApproveTab({
  version,
  gaps,
  onInsertAll,
  onReview,
  onPublished,
}: {
  version: DocVersion;
  gaps: ReviewIssue[];
  onInsertAll: () => void;
  onReview: () => void;
  onPublished: (anyway: boolean, reason?: string) => void;
}) {
  const s = usePaneStyles();
  const contract = useDemo((st) => st.contract);
  const request = useDemo((st) => st.requestReview);
  const logEvent = useDemo((st) => st.logEvent);
  const toast = useDemo((st) => st.toast);
  const [gateOpen, setGateOpen] = useState(false);
  const [anyway, setAnyway] = useState(false);
  const [reason, setReason] = useState('');
  const total = gaps.reduce((sum, g) => sum + (g.costLakhPerYr ?? 0), 0);
  const route = approvalRoute({ owner: 'commercial', termKey: 'price' }, total);

  return (
    <div>
      <section className={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={s.sectionLabel} style={{ margin: 0 }}>Approve and publish</span>
          <OriginTag kind="today" />
        </div>
        <div className={s.actions}>
          <Button size="small" onClick={() => { request('approval', version.id); toast(`${version.id} sent to ${personName('neha')} for approval.`); }}>Send for approval</Button>
          <Button size="small" onClick={() => { logEvent(`${version.id} approved in Word.`); toast(`${version.id} approved.`); }}>Approve</Button>
          <Button size="small" onClick={() => { logEvent(`${version.id} rejected in Word.`); toast(`${version.id} rejected.`); }}>Reject</Button>
        </div>
        <Button appearance="primary" style={{ width: '100%', marginTop: 10 }} onClick={() => { setAnyway(false); setGateOpen(true); }}>
          Publish to Sirion
        </Button>
        <div className={s.grey} style={{ marginTop: 4 }}>
          <OriginTag kind="new" /> Publish runs the signing check first.
        </div>
      </section>

      <section className={s.card} style={contract ? undefined : { opacity: 0.55 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={s.sectionLabel} style={{ margin: 0 }}>Obligations in Word</span>
          <OriginTag kind="today" />
        </div>
        {contract ? (
          contract.obligations.map((o) => (
            <div key={o.id} className={s.grey} style={{ marginTop: 4 }}>
              {o.title} · clause {o.clauseNo}
            </div>
          ))
        ) : (
          <p className={s.grey} style={{ marginTop: 4 }}>Available once the contract is signed and saved to Sirion.</p>
        )}
      </section>

      <Dialog open={gateOpen} onOpenChange={(_, d) => !d.open && setGateOpen(false)}>
        <DialogSurface style={{ maxWidth: 480 }}>
          <DialogBody>
            <DialogTitle>
              {gaps.length ? `${gaps.length} agreed term${gaps.length === 1 ? ' is' : 's are'} not in this copy.` : 'Every agreed term is in this copy.'}
            </DialogTitle>
            <DialogContent>
              {gaps.length ? (
                <>
                  <p style={{ fontSize: 13.5, margin: '0 0 6px' }}>
                    Expected cost if published as is: <strong>{formatLakh(total)} a year</strong>.
                  </p>
                  <p style={{ fontSize: 12.5, margin: '0 0 8px' }}>
                    {gaps.map((g) => `${g.label} (${g.costLakhPerYr !== null ? formatLakh(g.costLakhPerYr) : 'not priced'})`).join(' · ')}
                  </p>
                  {anyway && (
                    <>
                      <p style={{ fontSize: 12.5, fontWeight: 600, margin: '0 0 6px' }}>
                        Needs approval: {personName(route.approverId)} · {route.rule}
                      </p>
                      <Field label="Reason (logged to the deal's activity)" required>
                        <Textarea value={reason} onChange={(_, d) => setReason(d.value)} />
                      </Field>
                    </>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 13.5 }}>Publishing to Sirion. On signature, the agreed terms hand over to Sirion&apos;s tracking agents.</p>
              )}
            </DialogContent>
            <DialogActions>
              {gaps.length ? (
                anyway ? (
                  <>
                    <Button appearance="primary" disabled={!reason.trim()} onClick={() => { onPublished(true, reason.trim()); setGateOpen(false); }}>Publish anyway</Button>
                    <Button onClick={() => setAnyway(false)}>Back</Button>
                  </>
                ) : (
                  <>
                    <Button appearance="primary" onClick={() => { onInsertAll(); setGateOpen(false); }}>Insert all agreed wording</Button>
                    <Button onClick={() => { onReview(); setGateOpen(false); }}>Review one by one</Button>
                    <Button appearance="outline" onClick={() => setAnyway(true)}>Publish anyway…</Button>
                  </>
                )
              ) : (
                <Button appearance="primary" onClick={() => { onPublished(false); setGateOpen(false); }}>Publish</Button>
              )}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
