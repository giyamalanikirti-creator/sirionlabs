'use client';

/**
 * The case, rendered from content/story.md. Markers in the markdown place the
 * diagrams beside the text that explains them, and fold the long reference
 * sections into collapsibles:
 *   <!-- component:stakeholder-map | architecture | connection-flow -->
 *   <!-- collapse:Title --> … <!-- /collapse -->
 */
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SirionCard } from '@/components/sirion/ui';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { ConnectionFlow } from './ConnectionFlow';
import { StakeholderMap } from './StakeholderMap';
import { Assumptions } from './Assumptions';
import { CaseAtAGlance, ExposureChart, HandoffChain, JourneyTimeline, LossPatterns, MetricsPanel, ProductScope, StakeholderCards, WhyNegotiation } from './Visuals';

const COMPONENTS: Record<string, () => React.ReactElement> = {
  'stakeholder-map': StakeholderMap,
  architecture: ArchitectureDiagram,
  'connection-flow': ConnectionFlow,
  assumptions: Assumptions,
  'case-at-a-glance': CaseAtAGlance,
  'why-negotiation': WhyNegotiation,
  'product-scope': ProductScope,
  'stakeholder-cards': StakeholderCards,
  'loss-patterns': LossPatterns,
  'exposure-chart': ExposureChart,
  'journey-timeline': JourneyTimeline,
  'handoff-chain': HandoffChain,
  'metrics-panel': MetricsPanel,
};

type Node = { kind: 'md'; text: string } | { kind: 'component'; name: string } | { kind: 'collapse'; title: string; children: Node[] };

const MARKER = /<!--\s*(component:([\w-]+)|collapse:([^>]+?)|\/collapse)\s*-->/g;

function parse(markdown: string): Node[] {
  const root: Node[] = [];
  const stack: Node[][] = [root];
  let last = 0;
  for (const m of markdown.matchAll(MARKER)) {
    const text = markdown.slice(last, m.index);
    if (text.trim()) stack.at(-1)!.push({ kind: 'md', text });
    last = (m.index ?? 0) + m[0].length;
    if (m[2]) stack.at(-1)!.push({ kind: 'component', name: m[2] });
    else if (m[3]) {
      const node: Node = { kind: 'collapse', title: m[3].trim(), children: [] };
      stack.at(-1)!.push(node);
      stack.push(node.children);
    } else if (stack.length > 1) stack.pop();
  }
  const tail = markdown.slice(last);
  if (tail.trim()) stack.at(-1)!.push({ kind: 'md', text: tail });
  return root;
}

/** "2. Stakeholder map: whose incentives collide?" → "2-stakeholder-map": short, stable anchors for links from Home and the rail. */
export function sectionId(text: string): string {
  return text
    .split(':')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function headings(markdown: string) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => {
      const text = line.replace(/^##\s+/, '').trim();
      return { text: text.split(':')[0], id: sectionId(text) };
    });
}

function Heading({ children }: { children?: React.ReactNode }) {
  const text = String(children);
  return (
    <h2 id={sectionId(text)} className="scroll-mt-6">
      {text}
    </h2>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h2: Heading }}>
      {text}
    </ReactMarkdown>
  );
}

function Render({ nodes }: { nodes: Node[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.kind === 'md') return <Markdown key={i} text={n.text} />;
        if (n.kind === 'component') {
          const C = COMPONENTS[n.name];
          return C ? <C key={i} /> : null;
        }
        return (
          <details key={i} className="mt-6 rounded-lg border border-line p-4" id={sectionId(n.title)}>
            <summary className="cursor-pointer font-semibold text-teal-900">{n.title}</summary>
            <div className="mt-2">
              <Render nodes={n.children} />
            </div>
          </details>
        );
      })}
    </>
  );
}

export function StoryView({ markdown }: { markdown: string }) {
  const nodes = parse(markdown);
  const toc = headings(markdown);
  const extras = [...markdown.matchAll(/<!--\s*collapse:([^>]+?)\s*-->/g)].map((m) => ({ text: m[1].trim(), id: sectionId(m[1].trim()) }));
  const [active, setActive] = useState(toc[0]?.id);

  /* A link such as /story#how-it-connects can point inside a collapsed section: open it and scroll there. */
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      for (let p: HTMLElement | null = el; p; p = p.parentElement) if (p instanceof HTMLDetailsElement) p.open = true;
      el.scrollIntoView({ block: 'start' });
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);

  return (
    <div className="flex gap-8">
      <aside className="sticky top-0 hidden w-60 shrink-0 self-start lg:block">
        <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-wide text-muted">On this page</p>
        <nav className="space-y-0.5">
          {toc.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={() => setActive(h.id)}
              className={[
                'block rounded-md px-3 py-[7px] text-[12px] leading-[17px] transition-colors',
                active === h.id ? 'bg-white font-medium text-teal-900 shadow-card' : 'text-ink/70 hover:bg-white/60',
              ].join(' ')}
            >
              {h.text}
            </a>
          ))}
        </nav>
        {extras.length > 0 && (
          <>
            <p className="mb-2 mt-4 px-3 text-[10.5px] font-semibold uppercase tracking-wide text-muted">More detail</p>
            <nav className="space-y-0.5">
              {extras.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={() => {
                    const el = document.getElementById(h.id);
                    if (el instanceof HTMLDetailsElement) el.open = true;
                  }}
                  className="block rounded-md px-3 py-[6px] text-[12px] leading-[17px] text-ink/70 hover:bg-white/60"
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        <SirionCard bodyClassName="px-8 py-8 lg:px-12">
          <article className="story-prose max-w-3xl">
            <Render nodes={nodes} />
          </article>
        </SirionCard>
      </div>
    </div>
  );
}
