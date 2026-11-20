'use client';

/** Edit a typed term value: the fields depend on the kind of term. */
import type { TermValue } from '@/lib/types';

const input = 'mt-1 w-full rounded-md border border-line px-2.5 py-1.5 text-[12.5px] font-normal';

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block text-[12px] font-medium text-ink">
      {label}
      <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={input} />
    </label>
  );
}

export function ValueEditor({ value, onChange }: { value: TermValue; onChange: (v: TermValue) => void }) {
  switch (value.kind) {
    case 'price': {
      const wording = value.wording;
      return (
        <div className="space-y-2">
          <label className="block text-[12px] font-medium text-ink">
            Price wording
            <select
              value={wording}
              onChange={(e) => {
                const w = e.target.value;
                if (w === 'fixed') onChange({ kind: 'price', wording: 'fixed' });
                else if (w === 'open_yearly') onChange({ kind: 'price', wording: 'open_yearly', fromYear: 2 });
                else onChange({ kind: 'price', wording: 'capped', capPct: 5, fromYear: 3 });
              }}
              className={input}
            >
              <option value="fixed">Fixed for the term</option>
              <option value="capped">Yearly revision, capped</option>
              <option value="open_yearly">Yearly revision, no cap</option>
            </select>
          </label>
          {value.wording === 'capped' && (
            <div className="grid grid-cols-2 gap-2">
              <Num label="Cap %" value={value.capPct} onChange={(n) => onChange({ ...value, capPct: n })} />
              <Num label="From year" value={value.fromYear} onChange={(n) => onChange({ ...value, fromYear: n })} />
            </div>
          )}
        </div>
      );
    }
    case 'payment':
      return <Num label="Payment within (days)" value={value.days} onChange={(n) => onChange({ ...value, days: n })} />;
    case 'renewal_notice':
      return <Num label="Renewal notice (days)" value={value.days} onChange={(n) => onChange({ ...value, days: n })} />;
    case 'service_credit':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Num label="Credit %" value={value.pct} step={0.5} onChange={(n) => onChange({ ...value, pct: n })} />
          <Num label="Uptime target %" value={value.uptimeTarget} step={0.1} onChange={(n) => onChange({ ...value, uptimeTarget: n })} />
        </div>
      );
    case 'liability_cap':
      return <Num label="Cap (months of fees)" value={value.months} onChange={(n) => onChange({ ...value, months: n })} />;
    case 'term':
      return <Num label="Term (years)" value={value.years} onChange={(n) => onChange({ ...value, years: n })} />;
    case 'exit_support':
      return (
        <div className="grid grid-cols-2 items-end gap-2">
          <Num label="Exit support (days)" value={value.days} onChange={(n) => onChange({ ...value, days: n })} />
          <label className="flex items-center gap-2 pb-2 text-[12px]">
            <input type="checkbox" checked={value.free} onChange={(e) => onChange({ ...value, free: e.target.checked })} /> At no charge
          </label>
        </div>
      );
  }
}
