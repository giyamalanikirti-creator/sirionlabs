'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { SirionCard } from '@/components/sirion/ui';
import { StakeholderMap } from './StakeholderMap';

/** Pull the "## " headings out so the table of contents is never out of date. */
function headings(markdown: string) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => {
      const text = line.replace(/^##\s+/, '').trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return { text, id };
    });
}

const MAP_ANCHOR = '## 4. Journey and pain points';

function Heading({ children }: { children?: React.ReactNode }) {
  const text = String(children);
  const id = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return (
    <h2 id={id} className="scroll-mt-6">
      {text}
    </h2>
  );
}

export function StoryView({ markdown }: { markdown: string }) {
  const toc = headings(markdown);
  const [active, setActive] = useState(toc[0]?.id);

  /* The stakeholder visual belongs with §3, right after its table. */
  const splitAt = markdown.indexOf(MAP_ANCHOR);
  const before = splitAt < 0 ? markdown : markdown.slice(0, splitAt);
  const after = splitAt < 0 ? '' : markdown.slice(splitAt);

  return (
    <div className="flex gap-8">
      <aside className="sticky top-0 hidden w-60 shrink-0 self-start lg:block">
        <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
          On this page
        </p>
        <nav className="space-y-0.5">
          {toc.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={() => setActive(h.id)}
              className={[
                'block rounded-md px-3 py-[7px] text-[12px] leading-[17px] transition-colors',
                active === h.id
                  ? 'bg-white font-medium text-teal-900 shadow-card'
                  : 'text-ink/70 hover:bg-white/60',
              ].join(' ')}
            >
              {h.text}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <SirionCard bodyClassName="px-8 py-8 lg:px-12">
          <article className="story-prose max-w-3xl">
            <ReactMarkdown components={{ h2: Heading }}>{before}</ReactMarkdown>
            <StakeholderMap />
            {after && <ReactMarkdown components={{ h2: Heading }}>{after}</ReactMarkdown>}
          </article>
        </SirionCard>
      </div>
    </div>
  );
}
