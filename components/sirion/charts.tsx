'use client';

/**
 * Recharts wrappers styled to the Sirion reference screenshots (§4A):
 * stacked bars with rounded tops, thick donuts with outside leader labels,
 * single-series teal bars, and a mint-bars-plus-periwinkle-line trend.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const SERIES = ['#828BFC', '#0C5E69', '#B1D0CA', '#4364B2', '#E0E767'];
const GRID = '#EDF1F1';
const TICK = { fill: '#7D9093', fontSize: 11 };

const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #E6EBEB',
    boxShadow: '0 4px 16px rgba(31,42,46,0.12)',
    fontSize: 12,
    padding: '8px 10px',
  },
  labelStyle: { color: '#1F2A2E', fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: '#35454A', padding: 0 },
};

/** Legends sit below the plot, square swatches, 11px muted text. */
function ChartLegend() {
  return (
    <Legend
      verticalAlign="bottom"
      align="center"
      height={28}
      iconType="square"
      iconSize={9}
      wrapperStyle={{ fontSize: 11, color: '#7D9093', paddingTop: 6 }}
    />
  );
}

/* ---------------- Single-series horizontal bars ---------------- */

export function HBars({
  data,
  height = 260,
  unit = '',
  color = '#0C5E69',
}: {
  data: { name: string; value: number }[];
  height?: number;
  unit?: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={118}
        />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fill: 'rgba(12,94,105,0.05)' }}
          formatter={(v: number) => [`${v}${unit}`, 'At risk']}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Stacked vertical bars ---------------- */

export function StackedBars({
  data,
  keys,
  height = 260,
  colors = [SERIES[1], SERIES[2]],
}: {
  data: Record<string, string | number>[];
  keys: { key: string; label: string }[];
  height?: number;
  colors?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(12,94,105,0.05)' }} />
        {ChartLegend()}
        {keys.map((k, i) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            name={k.label}
            stackId="a"
            fill={colors[i % colors.length]}
            barSize={30}
            radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Donut with outside leader labels ---------------- */

export function Donut({
  data,
  height = 260,
  colors = SERIES,
  centerLabel,
  centerValue,
  unit = '%',
}: {
  data: { name: string; value: number }[];
  height?: number;
  colors?: string[];
  centerLabel?: string;
  centerValue?: string;
  unit?: string;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 14, right: 70, bottom: 14, left: 70 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="74%"
            paddingAngle={1}
            stroke="#FFFFFF"
            strokeWidth={2}
            labelLine={{ stroke: '#C9D4D4', strokeWidth: 1 }}
            label={({ name, value }: { name?: string; value?: number }) => `${name} ${value}${unit}`}
            fontSize={11}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [`${v}${unit}`, n]} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-semibold text-teal-900">{centerValue}</span>
          {centerLabel && <span className="mt-0.5 text-[11px] text-muted">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------------- Mint bars + periwinkle line ---------------- */

export function TrendBarsLine({
  data,
  barKey,
  barLabel,
  lineKey,
  lineLabel,
  height = 260,
  lineUnit = '%',
  reference,
}: {
  data: Record<string, string | number>[];
  barKey: string;
  barLabel: string;
  lineKey: string;
  lineLabel: string;
  height?: number;
  lineUnit?: string;
  reference?: { y: number; label: string };
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}${lineUnit}`}
        />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(12,94,105,0.05)' }} />
        {ChartLegend()}
        <Bar
          yAxisId="left"
          dataKey={barKey}
          name={barLabel}
          fill={SERIES[2]}
          barSize={26}
          radius={[4, 4, 0, 0]}
        />
        {reference && (
          <ReferenceLine
            yAxisId="right"
            y={reference.y}
            stroke="#C2410C"
            strokeDasharray="4 4"
            label={{
              value: reference.label,
              position: 'insideTopRight',
              fill: '#C2410C',
              fontSize: 10,
            }}
          />
        )}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={lineKey}
          name={lineLabel}
          stroke={SERIES[0]}
          strokeWidth={2}
          dot={{ r: 3, fill: SERIES[0], strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Simple line with a guardrail ---------------- */

export function GuardrailLine({
  data,
  lineKey,
  lineLabel,
  height = 240,
  reference,
  unit = '',
}: {
  data: Record<string, string | number>[];
  lineKey: string;
  lineLabel: string;
  height?: number;
  reference?: { y: number; label: string };
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={TICK}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}${unit}`}
        />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}${unit}`, lineLabel]} />
        {reference && (
          <ReferenceLine
            y={reference.y}
            stroke="#C2410C"
            strokeDasharray="4 4"
            label={{
              value: reference.label,
              position: 'insideTopRight',
              fill: '#C2410C',
              fontSize: 10,
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey={lineKey}
          name={lineLabel}
          stroke={SERIES[1]}
          strokeWidth={2}
          dot={{ r: 3.5, fill: SERIES[1], strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** A small square swatch used in hand-built legends. */
export function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
      <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />
      {label}
    </span>
  );
}
