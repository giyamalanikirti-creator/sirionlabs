/** How Deal Ledger fits with Microsoft 365 and Sirion's existing tools. */

const TEAL = '#0C5E69';
const MINT = '#E3F2EF';
const LINE = '#C9D4D4';
const INK = '#1F2A2E';
const MUTED = '#5F7377';

function Box({ x, y, w, h, title, lines, tone = 'plain', dashed = false }: {
  x: number; y: number; w: number; h: number; title: string; lines: string[]; tone?: 'plain' | 'teal' | 'mint'; dashed?: boolean;
}) {
  const fill = tone === 'teal' ? TEAL : tone === 'mint' ? MINT : '#fff';
  const text = tone === 'teal' ? '#fff' : INK;
  const sub = tone === 'teal' ? 'rgba(255,255,255,0.85)' : MUTED;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={tone === 'teal' ? TEAL : LINE} strokeDasharray={dashed ? '5 4' : undefined} />
      <text x={x + 12} y={y + 22} fontSize={13} fontWeight={600} fill={text}>{title}</text>
      {lines.map((l, i) => (
        <text key={l} x={x + 12} y={y + 40 + i * 15} fontSize={11} fill={sub}>{l}</text>
      ))}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, dashed = false, both = false }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean; both?: boolean }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MUTED} strokeWidth={1.4} strokeDasharray={dashed ? '4 4' : undefined}
      markerEnd="url(#arrow)" markerStart={both ? 'url(#arrow-start)' : undefined} />
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="my-8">
      <h2 className="text-[18px] text-teal-title">How it fits with Sirion</h2>
      <p className="mt-1 text-[13px] text-muted">
        Two Microsoft 365 add-ins feed one ledger service, which hands agreed terms to the Sirion tools that already exist.
      </p>
      <svg viewBox="0 0 760 440" role="img" aria-label="Architecture: Outlook and Word add-ins connect to the Deal Ledger service, which connects to Sirion's repository, approvals, obligations, invoice reconciliation and counterparty portal." className="mt-4 w-full">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={MUTED} />
          </marker>
          <marker id="arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={MUTED} />
          </marker>
        </defs>

        <text x={10} y={18} fontSize={10.5} fontWeight={700} fill={MUTED} letterSpacing="0.06em">MICROSOFT 365</text>
        <Box x={10} y={28} w={240} h={96} title="Outlook add-in" lines={['Reads supplier-domain threads only', 'Header first; internal email never', 'Check at Send (Smart Alerts,', 'sends as usual after ~3 s)']} />
        <Box x={262} y={28} w={240} h={96} title="Word add-in" lines={['Signing check when the copy arrives', 'Agreed / fallback / walk-away, priced', 'Supplier-safe tracked changes']} />
        <Box x={514} y={28} w={236} h={96} title="Teams transcripts" lines={['Future source: terms agreed', 'in meetings, with exact quotes', 'Today: “Add term agreed on a call”']} dashed />

        <Arrow x1={130} y1={124} x2={250} y2={176} both />
        <Arrow x1={382} y1={124} x2={382} y2={176} both />
        <Arrow x1={632} y1={124} x2={520} y2={176} dashed />

        <text x={10} y={170} fontSize={10.5} fontWeight={700} fill={TEAL} letterSpacing="0.06em">NEW</text>
        <Box x={140} y={178} w={480} h={110} title="Deal Ledger service" tone="teal" lines={[
          'Reader: typed terms with exact quotes; low confidence → a person',
          'Ledger: rows, sources, who agreed, approvals, full history',
          'Engines: ₹ from your own invoices and renewals (never the model)',
          'Send check · signing check · approval routing by value',
        ]} />

        <Arrow x1={190} y1={288} x2={80} y2={340} both />
        <Arrow x1={290} y1={288} x2={228} y2={340} both />
        <Arrow x1={380} y1={288} x2={380} y2={340} />
        <Arrow x1={470} y1={288} x2={532} y2={340} />
        <Arrow x1={570} y1={288} x2={680} y2={340} both />

        <text x={10} y={334} fontSize={10.5} fontWeight={700} fill={MUTED} letterSpacing="0.06em">SIRION TODAY</text>
        <Box x={10} y={342} w={140} h={84} title="Repository" tone="mint" lines={['Contract record', 'and versions']} />
        <Box x={158} y={342} w={140} h={84} title="Approvals" tone="mint" lines={['Routed by value', '(CFO, Legal)']} />
        <Box x={306} y={342} w={148} h={84} title="Obligations agent" tone="mint" lines={['Deadlines and', 'renewal brief']} />
        <Box x={462} y={342} w={146} h={84} title="Invoice check" tone="mint" lines={['Reconciliation', 'against signed terms']} />
        <Box x={616} y={342} w={134} h={84} title="Counterparty" tone="mint" lines={['portal: share v7', 'for signature']} />
      </svg>
      <figcaption className="mt-2 text-[11.5px] text-muted">
        The add-ins never hold an API key; the model runs only on the server and only reads text. Every ₹ figure is computed by the engines.
      </figcaption>
    </figure>
  );
}
