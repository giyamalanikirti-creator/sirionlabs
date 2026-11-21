'use client';

/**
 * The stakeholder map from §3 of the story: the lead at the centre, the people
 * who move terms around her, and the clash written on each line.
 */
export function StakeholderMap() {
  return (
    <figure className="my-6 rounded-xl border border-line bg-page/60 p-5">
      <svg viewBox="0 0 720 360" className="w-full" role="img" aria-label="Stakeholder map">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#B6C4C4" />
          </marker>
        </defs>

        {/* lines */}
        <Line x1={360} y1={150} x2={150} y2={70} label="does not see the side threads" lx={215} ly={95} />
        <Line x1={360} y1={190} x2={150} y2={290} label="condition on the approval" lx={200} ly={262} />
        <Line x1={400} y1={150} x2={580} y2={70} label="reviews one draft, not the next" lx={470} ly={95} />
        <Line x1={400} y1={190} x2={580} y2={290} label="every ambiguity falls their way" lx={470} ly={262} />
        <Line x1={150} y1={95} x2={560} y2={285} label="" lx={0} ly={0} dashed />

        {/* centre */}
        <g>
          <rect x={282} y={142} width={156} height={56} rx={10} fill="#0C5E69" />
          <text x={360} y={166} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">
            Procurement lead
          </text>
          <text x={360} y={183} textAnchor="middle" fill="#B1D0CA" fontSize="11">
            owns the agreed position
          </text>
        </g>

        <Node x={56} y={44} title="Business owner" sub="has the side threads" />
        <Node x={56} y={264} title="CFO" sub="approves, conditionally" />
        <Node x={520} y={44} title="Legal" sub="reviews a point in time" />
        <Node x={520} y={264} title="Supplier" sub="talks to everyone" tone="supplier" />

        <text x={360} y={338} textAnchor="middle" fill="#5B6D71" fontSize="10.5">
          Dashed line: the business owner and the supplier talk directly. That is where most
          unrecorded concessions are made.
        </text>
      </svg>
      <figcaption className="mt-2 text-[11.5px] leading-[17px] text-muted">
        The lead owns the commercial position, but three of the four lines into the supplier do not
        pass through her.
      </figcaption>
    </figure>
  );
}

function Line({
  x1,
  y1,
  x2,
  y2,
  label,
  lx,
  ly,
  dashed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  lx: number;
  ly: number;
  dashed?: boolean;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={dashed ? '#C2410C' : '#B6C4C4'}
        strokeWidth={dashed ? 1.4 : 1.2}
        strokeDasharray={dashed ? '5 4' : undefined}
        markerEnd={dashed ? undefined : 'url(#arrow)'}
      />
      {label && (
        <text x={lx} y={ly} textAnchor="middle" fill="#5B6D71" fontSize="10.5">
          {label}
        </text>
      )}
    </g>
  );
}

function Node({
  x,
  y,
  title,
  sub,
  tone = 'internal',
}: {
  x: number;
  y: number;
  title: string;
  sub: string;
  tone?: 'internal' | 'supplier';
}) {
  const fill = tone === 'supplier' ? '#FEF3C7' : '#FFFFFF';
  const stroke = tone === 'supplier' ? '#B45309' : '#E6EBEB';
  const titleColour = tone === 'supplier' ? '#B45309' : '#1F2A2E';
  return (
    <g>
      <rect x={x} y={y} width={144} height={52} rx={10} fill={fill} stroke={stroke} />
      <text x={x + 72} y={y + 22} textAnchor="middle" fill={titleColour} fontSize="12.5" fontWeight="600">
        {title}
      </text>
      <text x={x + 72} y={y + 38} textAnchor="middle" fill="#5B6D71" fontSize="10.5">
        {sub}
      </text>
    </g>
  );
}
