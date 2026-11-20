'use client';

import { useState } from 'react';
import { Badge, Button, Field, Textarea, tokens } from '@fluentui/react-components';
import { PREVIEW_EMAIL, REPLAY_EXTRACTION, type Extraction } from '@/lib/demo/reader-preview';
import { readByRules, type PreviewTerm } from '@/lib/engines/previewRules';

interface PreviewResult {
  source: 'live' | 'replayed' | 'rules';
  extraction: Extraction | null;
  terms: PreviewTerm[];
}

/** "Try your own email": paste anything; every term comes back with a confidence and an exact quote. */
export function ReaderPreview() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<PreviewResult>();
  const [busy, setBusy] = useState(false);

  async function readEmail() {
    setBusy(true);
    setResult(undefined);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch('/api/reader-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error('Preview unavailable');
      setResult(await response.json());
    } catch {
      // Never a dead end: read it with the rules in the browser.
      setResult({ source: 'rules', extraction: null, terms: readByRules(email) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details style={{ margin: '12px 0', fontSize: 13 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Try your own email</summary>
      <p style={{ margin: '8px 0' }}>Paste any supplier email. Each term comes back with its exact quote and how sure the reader is. Below {Math.round(0.75 * 100)}% it goes to “Needs confirming”, not the ledger.</p>
      <Field label="Supplier email">
        <Textarea placeholder="Paste or type a supplier email" value={email} maxLength={2500} resize="vertical" disabled={busy} onChange={(_, data) => {
          setEmail(data.value);
          setResult(undefined);
        }} />
      </Field>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        <Button size="small" appearance="primary" disabled={busy || !email.trim()} onClick={readEmail}>{busy ? 'Reading…' : 'Read this email'}</Button>
        <Button size="small" disabled={busy} onClick={() => {
          setEmail(PREVIEW_EMAIL);
          setResult({ source: 'replayed', extraction: REPLAY_EXTRACTION, terms: readByRules(PREVIEW_EMAIL) });
        }}>Example</Button>
      </div>
      <div aria-live="polite" style={{ marginTop: 8 }}>
        {result?.extraction && (
          <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: tokens.colorNeutralBackground3, fontSize: 12 }}>
            <strong>{result.source === 'live' ? 'Model reading' : 'Saved example'}:</strong> {result.extraction.term || 'No supported term'}
            {result.extraction.quote && <div>“{result.extraction.quote}”</div>}
            <div style={{ color: tokens.colorNeutralForeground3 }}>{result.extraction.uncertainty}</div>
          </div>
        )}
        {result && (
          <>
            <div style={{ fontSize: 11.5, color: tokens.colorNeutralForeground3, marginBottom: 4 }}>
              Rules reader · {result.terms.length} term{result.terms.length === 1 ? '' : 's'} found
            </div>
            {result.terms.length === 0 && <p style={{ fontSize: 12 }}>No supported term found. Nothing would be written to the ledger.</p>}
            {result.terms.map((t, i) => (
              <div key={i} style={{ borderTop: `1px solid ${tokens.colorNeutralStroke3}`, padding: '6px 0', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                  <strong>{t.term}: {t.value}</strong>
                  <Badge size="small" appearance="filled" color={t.needsConfirming ? 'warning' : t.kind === 'agreement' ? 'success' : 'informative'}>
                    {t.needsConfirming ? `Needs confirming · ${t.kind}` : t.kind}
                  </Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '3px 0' }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: tokens.colorNeutralBackground4 }}>
                    <div style={{ width: `${t.confidence * 100}%`, height: 4, borderRadius: 2, background: t.confidence < 0.75 ? tokens.colorPaletteMarigoldBackground3 : tokens.colorBrandBackground }} />
                  </div>
                  <span style={{ fontSize: 11 }}>{Math.round(t.confidence * 100)}%</span>
                </div>
                <div style={{ color: tokens.colorNeutralForeground2 }}>“{t.quote}”</div>
                {t.condition && <div style={{ color: tokens.colorNeutralForeground3 }}>Condition: {t.condition}</div>}
                <div style={{ color: tokens.colorNeutralForeground3 }}>{t.why}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </details>
  );
}
