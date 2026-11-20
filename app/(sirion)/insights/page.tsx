'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { EmptyState, PageHeader, SirionCard } from '@/components/sirion/ui';
import { GuardrailLine, StackedBars, TrendBarsLine } from '@/components/sirion/charts';
import { guardrails, kpiHistory, sendWarnings, signingGapsData } from '@/lib/data';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import {
  NEEDS_CONFIRMATION_RETHINK,
  PRE_PILOT_MEDIAN_DAYS,
  SEND_ANYWAY_RETHINK,
} from '@/lib/settings';
import evalResults from '@/data/reader_eval_results.json';

interface EvalItem {
  id: string;
  text: string;
  expected: string;
  got: string;
  score: 'correct' | 'safe' | 'wrong';
}

interface EvalFile {
  model?: string;
  ranAt?: string;
  mode?: string;
  notRun?: boolean;
  totals?: { correct: number; safe: number; wrong: number; total: number };
  items?: EvalItem[];
}

export default function InsightsPage() {
  const hydrated = useHydrated();
  const outcomes = useDemo((s) => s.sendOutcomes);
  const data = evalResults as EvalFile;

  // Short axis labels so five categories fit without colliding.
  const SHORT: Record<string, string> = {
    'Renewal notice': 'Renewal',
    'Service credits': 'Credits',
  };
  const gapsData = signingGapsData.byTerm.map((t) => ({
    name: SHORT[t.term] ?? t.term,
    fixed: t.fixed,
    waived: t.waived,
  }));

  const warningsData = sendWarnings.months.map((m, i) => ({
    name: m,
    shown: sendWarnings.shown[i],
    looped: Math.round(sendWarnings.loopedInShare[i] * 100),
  }));

  const sendAnywayData = sendWarnings.months.map((m, i) => ({
    name: m,
    shown: sendWarnings.shown[i],
    sendAnyway: Math.round((1 - sendWarnings.loopedInShare[i]) * 100),
  }));

  const confirmData = guardrails.months.map((m, i) => ({
    name: m,
    rows: guardrails.rowsNeedingConfirmationPerDeal[i],
  }));

  const daysData = guardrails.quarters.map((q, i) => ({
    name: q.split(' ')[0],
    days: guardrails.medianDaysFinalEmailToSignature[i],
  }));

  const northStarData = kpiHistory.northStar.map((q) => ({
    name: q.quarter.split(' ')[0],
    pct: Math.round((q.clean / q.audited) * 100),
  }));

  const liveSendAnyway = hydrated
    ? outcomes.filter((o) => o.choice === 'send_anyway').length
    : 0;
  const ratedWarnings = hydrated ? outcomes.filter((outcome) => outcome.decision === 'warn' && outcome.actionable !== undefined) : [];
  const actionableWarnings = ratedWarnings.filter((outcome) => outcome.actionable).length;
  const liveWarnings = hydrated ? outcomes.filter((o) => o.decision === 'warn').length : 0;

  return (
    <>
      <PageHeader
        title="Insights"
        caption="How well the tool is working, and the lines at which we would rethink it."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReaderAccuracy data={data} />
        <SirionCard title="Gaps caught at signing" caption={signingGapsData.window} sample>
          <StackedBars
            data={gapsData}
            keys={[
              { key: 'fixed', label: 'Fixed before signing' },
              { key: 'waived', label: 'Waived with a reason' },
            ]}
            height={262}
          />
        </SirionCard>

        <SirionCard title="Send warnings" caption="Shown, and how often procurement was looped in" sample>
          <TrendBarsLine
            data={warningsData}
            barKey="shown"
            barLabel="Warnings shown"
            lineKey="looped"
            lineLabel="Looped in procurement"
            height={262}
          />
        </SirionCard>


        <SirionCard
          title="Send Anyway rate"
          caption={`Rethink if above ${Math.round(SEND_ANYWAY_RETHINK * 100)}% for two months running`}
          sample
        >
          <TrendBarsLine
            data={sendAnywayData}
            barKey="shown"
            barLabel="Warnings shown"
            lineKey="sendAnyway"
            lineLabel="Sent anyway"
            height={250}
            reference={{ y: SEND_ANYWAY_RETHINK * 100, label: 'Rethink line' }}
          />
          {hydrated && liveWarnings > 0 && (
            <p className="mt-2 text-[11.5px] text-muted">
              This session: {liveSendAnyway} of {liveWarnings} warnings sent anyway.
            </p>
          )}
        </SirionCard>

        <SirionCard title="Warnings reviewers judged actionable" caption="Feedback is collected after reviewing the warning.">
          <p className="text-2xl font-semibold text-teal-900">{ratedWarnings.length ? `${Math.round(actionableWarnings / ratedWarnings.length * 100)}%` : '—'}</p>
          <p className="mt-1 text-sm text-muted">{ratedWarnings.length ? `${actionableWarnings} of ${ratedWarnings.length} rated warnings in this session` : 'No warnings rated in this session.'}</p>
        </SirionCard>

        <SirionCard
          title="Rows needing confirmation per deal"
          caption={`Rethink above ${NEEDS_CONFIRMATION_RETHINK} — it would mean we are asking people too often`}
          sample
        >
          <GuardrailLine
            data={confirmData}
            lineKey="rows"
            lineLabel="Rows per deal"
            height={250}
            reference={{ y: NEEDS_CONFIRMATION_RETHINK, label: 'Rethink line' }}
          />
        </SirionCard>

        <SirionCard
          title="Days from the final supplier email to signature"
          caption="Guardrail: this should not rise. If checking slows deals down, it is not worth it."
          sample
        >
          <GuardrailLine
            data={daysData}
            lineKey="days"
            lineLabel="Median days"
            height={250}
            unit="d"
            reference={{ y: PRE_PILOT_MEDIAN_DAYS, label: 'Pre-pilot median' }}
          />
        </SirionCard>

        <SirionCard
          title="North star, audited"
          caption={`Share of signed contracts with no agreed term missing · next audit ${kpiHistory.nextAudit}`}
          sample
          className="lg:col-span-2"
        >
          <GuardrailLine
            data={northStarData}
            lineKey="pct"
            lineLabel="Clean at signing"
            height={230}
            unit="%"
          />
          <p className="mt-1 text-[11.5px] leading-[17px] text-muted">
            Measured by sampling the email trail of signed contracts and checking whether any term
            agreed there is missing from the signed copy. The audit is done by people, not by this
            tool, so missed extractions count as failures. Report authorised waivers separately. Track time to signature and the share of warnings reviewers judge actionable alongside this measure.
          </p>
        </SirionCard>
      </div>
    </>
  );
}

function ReaderAccuracy({ data }: { data: EvalFile }) {
  const [open, setOpen] = useState(false);

  if (!data || data.notRun || !data.totals || !data.items) {
    return (
      <SirionCard title="Reader accuracy">
        <EmptyState
          title="Accuracy results pending"
          body="The 32-example live reader assessment has no published score yet."
        />
      </SirionCard>
    );
  }

  const { correct, safe, wrong, total } = data.totals;

  return (
    <SirionCard
      title="Reader accuracy"
      caption={`${data.model} · run ${(data.ranAt ?? '').slice(0, 10)}${
        data.mode === 'rules' ? ' · rules fallback, no API key' : ''
      }`}
    >
      <div className="flex flex-wrap gap-8">
        <Figure value={correct} total={total} label="correct" tone="teal" />
        <Figure value={safe} total={total} label="safe (sent to a person)" tone="lime" />
        <Figure value={wrong} total={total} label="wrong" tone="danger" />
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-page">
        <span className="bg-teal-900" style={{ width: `${(correct / total) * 100}%` }} />
        <span className="bg-lime" style={{ width: `${(safe / total) * 100}%` }} />
        <span className="bg-danger" style={{ width: `${(wrong / total) * 100}%` }} />
      </div>

      <p className="mt-3 text-[11.5px] leading-[17px] text-muted">
        “Safe” means the reader expected an acceptance but was not confident enough, so it asked a
        person instead of writing a fact. That is the failure we want.
      </p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-teal-900"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {open ? 'Hide' : 'Show'} all {total} items
      </button>

      {open && (
        <div className="thin-scroll mt-2 max-h-72 overflow-y-auto rounded-lg border border-line">
          {data.items.map((item) => (
            <div key={item.id} className="border-b border-line/70 px-3 py-2.5 last:border-0">
              <p className="text-[12px] leading-[17px] text-ink">“{item.text}”</p>
              <p className="mt-1 text-[11px] text-muted">
                expected <span className="text-ink">{item.expected}</span> · got{' '}
                <span className="text-ink">{item.got}</span>
                <span
                  className={`ml-2 rounded px-1.5 py-[1px] text-[10px] font-medium ${
                    item.score === 'correct'
                      ? 'bg-mint text-teal-900'
                      : item.score === 'safe'
                        ? 'bg-lime text-ink'
                        : 'bg-danger text-white'
                  }`}
                >
                  {item.score}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </SirionCard>
  );
}

function Figure({
  value,
  total,
  label,
  tone,
}: {
  value: number;
  total: number;
  label: string;
  tone: 'teal' | 'lime' | 'danger';
}) {
  const colour =
    tone === 'teal' ? 'text-teal-900' : tone === 'lime' ? 'text-ink' : 'text-danger';
  return (
    <div>
      <p className={`text-[28px] font-semibold leading-none ${colour}`}>
        {value}
        <span className="text-[14px] font-normal text-muted"> / {total}</span>
      </p>
      <p className="mt-1 text-[11.5px] text-muted">{label}</p>
    </div>
  );
}
