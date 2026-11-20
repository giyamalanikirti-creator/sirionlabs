'use client';

/** "Ask Deal Ledger" inside the Outlook and Word panes: always visible at the bottom of the pane. */
import { useState } from 'react';
import { Badge, Button, Input, tokens } from '@fluentui/react-components';
import { SendRegular, SparkleRegular } from '@fluentui/react-icons';
import { useAsk } from '@/lib/useAsk';
import { useDemo } from '@/lib/store';
import type { Viewer } from '@/lib/engines/advisor';
import type { TermKey } from '@/lib/types';
import { TERM_LABELS } from '@/lib/plain';

export function AskBox({ viewer = 'lead', termKey }: { viewer?: Viewer; termKey?: TermKey }) {
  const { turns, ask, busy, clear } = useAsk({ viewer, termKey });
  const toast = useDemo((s) => s.toast);
  const [q, setQ] = useState('');
  const last = turns.at(-1);
  const starter = termKey ? `What should I put for ${TERM_LABELS[termKey].toLowerCase()} instead?` : 'What should I put for renewal notice instead?';
  const chips = viewer === 'owner' ? ['What is agreed with CloudDesk?', 'Can I agree to a yearly price review?', starter] : [starter, 'What’s at risk?', 'What should I do next?'];

  return (
    <div style={{ borderTop: `1px solid ${tokens.colorNeutralStroke2}`, padding: '8px 12px', background: tokens.colorNeutralBackground2, flexShrink: 0 }}>
      {last && (
        <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 8, padding: 8, borderRadius: 6, background: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}` }}>
          <div style={{ fontSize: 11.5, color: tokens.colorNeutralForeground3, marginBottom: 4 }}>You asked: {last.question}</div>
          {last.pending ? (
            <div style={{ fontSize: 12.5 }}>Thinking…</div>
          ) : last.answer ? (
            <div style={{ fontSize: 12.5, lineHeight: '18px' }}>
              <div style={{ fontWeight: 600, color: tokens.colorBrandForeground1, marginBottom: 2 }}>{last.answer.title}</div>
              {last.text ? <p style={{ margin: 0 }}>{last.text}</p> : last.answer.lines.map((l) => <p key={l} style={{ margin: '0 0 4px' }}>{l}</p>)}
              {last.answer.options?.map((o) => (
                <div key={o.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, borderTop: `1px solid ${tokens.colorNeutralStroke3}`, padding: '3px 0' }}>
                  <span><strong>{o.label}</strong> · {o.value}</span>
                  <span style={{ color: tokens.colorNeutralForeground3, textAlign: 'right' }}>{o.cost}</span>
                </div>
              ))}
              {last.answer.wording && (
                <div style={{ marginTop: 6, padding: 6, borderRadius: 4, background: tokens.colorNeutralBackground3, fontSize: 11.5 }}>
                  {last.answer.wording}
                  <div>
                    <Button size="small" appearance="outline" style={{ marginTop: 4 }} onClick={() => { void navigator.clipboard?.writeText(last.answer!.wording!); toast('Wording copied.'); }}>
                      Copy supplier-safe wording
                    </Button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Badge size="small" appearance="outline" color="informative">{last.source === 'live' ? 'AI-worded · engine figures' : 'From the ledger'}</Badge>
                <Button size="small" appearance="outline" onClick={clear}>Clear</Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12, fontWeight: 600, color: tokens.colorBrandForeground1 }}>
        <SparkleRegular /> Ask Deal Ledger
      </div>
      {!last && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {chips.map((c) => (
            <Button key={c} size="small" appearance="outline" disabled={busy} onClick={() => void ask(c)} style={{ fontSize: 11, minWidth: 0 }}>
              {c}
            </Button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
          setQ('');
        }}
        style={{ display: 'flex', gap: 6 }}
      >
        <Input size="small" value={q} onChange={(_, d) => setQ(d.value)} placeholder="What should I put instead?" style={{ flex: 1, minWidth: 0 }} maxLength={500} />
        <Button size="small" appearance="primary" type="submit" icon={<SendRegular />} disabled={busy || !q.trim()} aria-label="Ask" />
      </form>
    </div>
  );
}
