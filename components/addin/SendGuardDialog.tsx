'use client';

/**
 * The alert at Send (Outlook Smart Alerts, "soft block" mode: the user can
 * always send). One finding at a time, with the cost, who is affected, the
 * sentence in the draft, and three ways forward: loop in procurement (or fix
 * the attachment), edit the reply, or send anyway with a reason.
 */
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  FluentProvider,
  ToggleButton,
  tokens,
} from '@fluentui/react-components';
import { Mark } from '@/components/sirion/Mark';
import { dealLedgerTheme } from '@/lib/fluentTheme';
import { formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import type { GuardFinding } from '@/lib/engines/sendGuard';

export const SEND_ANYWAY_REASONS = ['Relationship', 'Approved verbally', 'Other'] as const;
export type SendAnywayReason = (typeof SEND_ANYWAY_REASONS)[number];

export function SendGuardDialog({
  finding,
  others,
  primaryLabel,
  onPrimary,
  onEdit,
  onSendAnyway,
  showWorkings = true,
  showFallback = true,
  whyHref,
  note,
}: {
  /** e.g. "Ananya is copied, but hasn't approved this change." */
  note?: string;
  finding: GuardFinding;
  others: GuardFinding[];
  /** "Loop in Ananya", "Attach v5 instead", or undefined when Edit reply is the main action. */
  primaryLabel?: string;
  onPrimary?: () => void;
  onEdit: () => void;
  onSendAnyway: (reason: SendAnywayReason) => void;
  /** Business owners see the ₹ figure but, by default, not the cost workings (Privacy and admin). */
  showWorkings?: boolean;
  showFallback?: boolean;
  /** For people outside procurement: a short explainer of why the check ran. */
  whyHref?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<SendAnywayReason | null>(null);
  const moved = finding.dealBeforeLakh !== undefined && finding.dealAfterLakh !== undefined && Math.abs(finding.dealAfterLakh - finding.dealBeforeLakh) > 0.005;

  return (
    <Dialog open modalType="alert">
      <DialogSurface style={{ maxWidth: 520 }}>
        <FluentProvider theme={dealLedgerTheme}>
          <DialogBody>
            <DialogTitle>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mark size={18} tone="dark" />
                <span style={{ fontSize: 16 }}>{finding.title}</span>
              </span>
            </DialogTitle>
            <DialogContent>
              <div style={{ fontSize: 13.5, lineHeight: '20px' }}>
                {note && (
                  <p style={{ margin: '0 0 8px', padding: '6px 8px', borderRadius: 4, background: '#FFF4CE', color: '#3D2E00' }}>{note}</p>
                )}
                {finding.agreedText && (
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Agreed:</strong> {finding.agreedText}. <strong>Your reply:</strong> {finding.replyText}.
                  </p>
                )}

                {finding.costLakhPerYr !== null && (
                  <div style={{ margin: '0 0 8px' }}>
                    <span style={{ fontSize: 20, fontWeight: 600, color: tokens.colorPaletteDarkOrangeForeground1 }}>
                      {formatLakh(finding.costLakhPerYr)}
                    </span>{' '}
                    <span style={{ color: tokens.colorNeutralForeground3 }}>{HEADLINE_SUFFIX}</span>
                    {finding.costNote && <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>{finding.costNote}</div>}
                    {moved && (
                      <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                        CloudDesk would go from {formatLakh(finding.dealBeforeLakh)} to {formatLakh(finding.dealAfterLakh)} {HEADLINE_SUFFIX}.
                      </div>
                    )}
                    {showWorkings && finding.proof.length > 0 && (
                      <details style={{ fontSize: 12, marginTop: 4 }}>
                        <summary style={{ cursor: 'pointer', color: tokens.colorBrandForeground1 }}>How calculated</summary>
                        {finding.proof.map((p) => (
                          <p key={p} style={{ margin: '4px 0 0', color: tokens.colorNeutralForeground2 }}>{p}</p>
                        ))}
                      </details>
                    )}
                  </div>
                )}
                {finding.costLakhPerYr === null && finding.costNote && (
                  <p style={{ margin: '0 0 8px', color: tokens.colorNeutralForeground3 }}>{finding.costNote}</p>
                )}

                {finding.affected && <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{finding.affected}</p>}

                {finding.quote && (
                  <p style={{ margin: '0 0 8px', fontSize: 12.5 }}>
                    In your draft:{' '}
                    <mark style={{ background: '#FFF1B8', padding: '1px 3px', borderRadius: 3 }}>{finding.quote}</mark>
                  </p>
                )}
                {finding.attachment && (
                  <p style={{ margin: '0 0 8px', fontSize: 12.5 }}>
                    Attached: <mark style={{ background: '#FFF1B8', padding: '1px 3px', borderRadius: 3 }}>{finding.attachment.fileName}</mark>
                  </p>
                )}
                {showFallback && finding.fallback && (
                  <p style={{ margin: '0 0 8px', fontSize: 12.5, color: tokens.colorNeutralForeground2 }}>
                    Fallback, if something has to give: {finding.fallback}
                  </p>
                )}
                {others.length > 0 && (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                    Also in this reply: {others.map((o) => o.title.replace(/^This reply would |\.$/g, '')).join('; ')}.
                  </p>
                )}

                {asking && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: tokens.colorNeutralBackground3 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Why send anyway?</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {SEND_ANYWAY_REASONS.map((r) => (
                        <ToggleButton key={r} size="small" checked={reason === r} onClick={() => setReason(r)}>
                          {r}
                        </ToggleButton>
                      ))}
                    </div>
                    <div style={{ fontSize: 11.5, marginTop: 6, color: tokens.colorNeutralForeground3 }}>
                      The term is marked reopened with your reason, and procurement is told.
                    </div>
                  </div>
                )}
                <p style={{ margin: '10px 0 0', fontSize: 11, color: tokens.colorNeutralForeground3 }}>
                  Checked against the CloudDesk ledger. This warns but never blocks: if the check cannot finish, the email sends as usual.
                  {whyHref && (
                    <>
                      {' '}
                      <a href={whyHref} target="_blank" rel="noreferrer" style={{ color: tokens.colorBrandForeground1 }}>
                        Why am I seeing this?
                      </a>
                    </>
                  )}
                </p>
              </div>
            </DialogContent>
            <DialogActions data-tour="guard-actions">
              {asking ? (
                <>
                  <Button appearance="primary" disabled={!reason} onClick={() => reason && onSendAnyway(reason)}>
                    Send
                  </Button>
                  <Button appearance="secondary" onClick={() => setAsking(false)}>
                    Back
                  </Button>
                </>
              ) : (
                <>
                  {primaryLabel && onPrimary && (
                    <Button appearance="primary" onClick={onPrimary}>
                      {primaryLabel}
                    </Button>
                  )}
                  <Button appearance={primaryLabel ? 'secondary' : 'primary'} onClick={onEdit}>
                    Edit reply
                  </Button>
                  <Button appearance="outline" onClick={() => setAsking(true)}>
                    Send anyway
                  </Button>
                </>
              )}
            </DialogActions>
          </DialogBody>
        </FluentProvider>
      </DialogSurface>
    </Dialog>
  );
}
