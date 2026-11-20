'use client';

/**
 * Smart Alerts — BUILD_SPEC §4E.
 * Modelled on Microsoft's onMessageSend behaviour in new Outlook and Outlook
 * on the web: a short progress dialog while the check runs, then a modal whose
 * title is the add-in name, whose message is capped at 500 characters, and
 * whose three buttons are the Take Action button (our own label, ≤ 20 chars),
 * Don't Send, and Send Anyway.
 */
import { useEffect, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  FluentProvider,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import ReactMarkdown from 'react-markdown';
import { Mark } from '@/components/sirion/Mark';
import { dealLedgerTheme } from '@/lib/fluentTheme';
import { AiBadge } from './PaneFrame';
import type { AiSource } from '@/lib/types';

export function ProgressDialog({ open }: { open: boolean }) {
  return (
    <Dialog open={open} modalType="non-modal">
      <DialogSurface style={{ maxWidth: 360 }}>
        <DialogBody>
          <DialogContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Spinner size="tiny" />
              <span style={{ fontSize: 13.5 }}>Deal Ledger is checking your message…</span>
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export function SmartAlertDialog({
  open,
  markdown,
  title,
  takeActionLabel,
  source,
  actionable,
  onAssess,
  onTakeAction,
  onDontSend,
  onSendAnyway,
}: {
  open: boolean;
  markdown: string;
  title: string;
  takeActionLabel: string;
  source: AiSource;
  actionable?: boolean;
  onAssess?: (value: boolean) => void;
  onTakeAction: () => void;
  onDontSend: () => void;
  onSendAnyway?: () => void;
}) {
  const reviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => reviewButton.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Dialog open={open} modalType="alert">
      <DialogSurface style={{ maxWidth: 480 }}>
        <FluentProvider theme={dealLedgerTheme}>
          <DialogBody>
            <DialogTitle>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mark size={18} tone="dark" />
                <span style={{ fontSize: 16 }}>{title}</span>
              </span>
            </DialogTitle>
            <DialogContent>
              <div
                style={{ fontSize: 13.5, lineHeight: '20px', color: tokens.colorNeutralForeground1 }}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>,
                    strong: ({ children }) => (
                      <strong style={{ fontWeight: 600 }}>{children}</strong>
                    ),
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
              <div style={{ marginTop: 6 }}>
                <AiBadge source={source} />
              </div>
              {onAssess && (
                <div role="group" aria-label="Was this warning actionable?" style={{ marginTop: 12 }}>
                  <span style={{ marginRight: 8 }}>Was this warning actionable?</span>
                  <Button size="small" appearance={actionable === true ? 'primary' : 'subtle'} aria-pressed={actionable === true} onClick={() => onAssess(true)}>Yes</Button>
                  <Button size="small" appearance={actionable === false ? 'primary' : 'subtle'} aria-pressed={actionable === false} onClick={() => onAssess(false)}>No</Button>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={onTakeAction} ref={reviewButton}>
                {takeActionLabel}
              </Button>
              <Button appearance="secondary" onClick={onDontSend}>
                Don&apos;t Send
              </Button>
              {onSendAnyway && <Button appearance="subtle" onClick={onSendAnyway}>
                Send Anyway
              </Button>}
            </DialogActions>
          </DialogBody>
        </FluentProvider>
      </DialogSurface>
    </Dialog>
  );
}
