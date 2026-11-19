'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

const WordApp = dynamic(() => import('@/components/word/WordApp').then((m) => m.WordApp), {
  ssr: false,
  loading: () => <div style={{ padding: 24, fontSize: 13 }}>Loading Word…</div>,
});

export default function WordPage({ params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = use(params);
  return <WordApp versionId={versionId} />;
}
