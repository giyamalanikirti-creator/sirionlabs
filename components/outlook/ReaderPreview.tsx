'use client';

import { useState } from 'react';
import { Button, Field, Textarea } from '@fluentui/react-components';
import { PREVIEW_EMAIL, REPLAY_EXTRACTION, type Extraction } from '@/lib/demo/reader-preview';

interface PreviewResult {
  source: 'live' | 'replayed' | 'unavailable';
  extraction: Extraction | null;
}

export function ReaderPreview() {
  const [email, setEmail] = useState(PREVIEW_EMAIL);
  const [result, setResult] = useState<PreviewResult>();
  const [busy, setBusy] = useState(false);

  async function readEmail() {
    setBusy(true);
    setResult(undefined);
    try {
      const response = await fetch('/api/reader-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Preview unavailable');
      setResult(await response.json());
    } catch {
      setResult({ source: 'unavailable', extraction: null });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details style={{ margin: '12px 0', fontSize: 13 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Try your own email</summary>
      <p style={{ margin: '8px 0' }}>Preview what the reader extracts from a supplier email.</p>
      <Field label="Supplier email">
        <Textarea value={email} maxLength={2500} resize="vertical" disabled={busy} onChange={(_, data) => {
          setEmail(data.value);
          setResult(undefined);
        }} />
      </Field>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        <Button size="small" appearance="primary" disabled={busy || !email.trim()} onClick={readEmail}>{busy ? 'Reading…' : 'Extract term'}</Button>
        <Button size="small" disabled={busy} onClick={() => {
          setEmail(PREVIEW_EMAIL);
          setResult({ source: 'replayed', extraction: REPLAY_EXTRACTION });
        }}>Replay example</Button>
      </div>
      <div aria-live="polite">
        {result?.source === 'unavailable' && <p>Live inference is unavailable. Replay the example to see a saved extraction.</p>}
        {result?.extraction && (
          <dl style={{ marginTop: 8 }}>
            <dt><strong>{result.source === 'live' ? 'Live extraction' : 'Replayed extraction'}</strong></dt>
            <dd>{result.extraction.term || 'No supported term found'}</dd>
            {result.extraction.quote && <><dt>Exact quote</dt><dd>“{result.extraction.quote}”</dd></>}
            <dt>Condition</dt><dd>{result.extraction.condition || 'None identified'}</dd>
            <dt>Uncertainty</dt><dd>{result.extraction.uncertainty}</dd>
          </dl>
        )}
      </div>
    </details>
  );
}
