/**
 * Deterministic seed generator — BUILD_SPEC §7 / §7.1.
 * Builds data/contracts.json, data/invoices.json, data/renewals.json and
 * data/service_events.json. Everything else in data/ is hand-written.
 *
 * Run with: npm run seed
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'data');

/** mulberry32 — small, fast, deterministic. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2026);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

/* ------------------------------------------------------------------ */
/* Contracts                                                           */
/* ------------------------------------------------------------------ */

// 25 software suppliers. Index 16 is CloudDesk, which becomes C-017.
const SOFTWARE = [
  'Nimbus HR Cloud',
  'DataVault',
  'CloudOps Suite',
  'HelpHub',
  'Larkfield CRM',
  'Meridian Payroll Cloud',
  'Orbit Analytics',
  'Tessellate BI',
  'Quillmark Docs',
  'Fernpath Security',
  'Blueline ERP',
  'Sandbar Testing Cloud',
  'Northwind Warehouse Suite',
  'Kestrel Expense',
  'Ridgeview Monitoring',
  'Palette Design Cloud',
  'CloudDesk', // index 16 → C-017
  'Junction API Gateway',
  'Marlowe Learning',
  'Ashgrove Invoicing',
  'Tidepool Storage',
  'Clearwater Email Suite',
  'Foxglove Scheduling',
  'Beacon Asset Tracker',
  'Stonebridge Procurement',
];

const OTHERS: { name: string; type: string }[] = [
  { name: 'BrightStaff Services', type: 'staffing' },
  { name: 'Peakline Talent', type: 'staffing' },
  { name: 'Anchor Workforce', type: 'staffing' },
  { name: 'Harrow Contract Staffing', type: 'staffing' },
  { name: 'Silverbirch Recruiting', type: 'staffing' },
  { name: 'SwiftShip Logistics', type: 'logistics' },
  { name: 'TransitOne Fleet', type: 'logistics' },
  { name: 'Coastline Freight', type: 'logistics' },
  { name: 'Ironwood Haulage', type: 'logistics' },
  { name: 'CleanCo Facilities', type: 'facilities' },
  { name: 'SecureGate Facilities', type: 'facilities' },
  { name: 'Greenhall Maintenance', type: 'facilities' },
  { name: 'Kaveri Consulting', type: 'consultants' },
  { name: 'Thornfield Advisory', type: 'consultants' },
  { name: 'PixelForge Agency', type: 'marketing' },
];

// 9 open yearly, 10 capped at 5%, 6 fixed. CloudDesk (index 16) is fixed:
// its current term held the price, which is exactly what the renewal reopens.
const OPEN_YEARLY_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const CAPPED_IDX = [9, 10, 11, 12, 13, 14, 15, 17, 18, 19];
const FIXED_IDX = [16, 20, 21, 22, 23, 24];

// Observed year-2 rises, asserted in tests/seed.test.ts.
const OPEN_RISES = [0.05, 0.055, 0.06, 0.06, 0.065, 0.065, 0.07, 0.07, 0.081];
const CAPPED_RISES = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.04, 0.04, 0.04, 0.04];

const OWNERS = ['Ananya Rao', 'Karan Malhotra', 'Meera Pillai'];

type Contract = {
  id: string;
  name: string;
  supplier: string;
  type: string;
  annualFeeInr: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expiring' | 'expired';
  owner: string;
  priceWording?: 'open_yearly' | 'capped_5' | 'fixed';
  noticeDays?: number;
  autoRenew?: boolean;
  seats?: number;
};

const contracts: Contract[] = [];
const wordingOf = new Map<number, 'open_yearly' | 'capped_5' | 'fixed'>();
const riseOf = new Map<number, number>();

OPEN_YEARLY_IDX.forEach((idx, i) => {
  wordingOf.set(idx, 'open_yearly');
  riseOf.set(idx, OPEN_RISES[i]);
});
CAPPED_IDX.forEach((idx, i) => {
  wordingOf.set(idx, 'capped_5');
  riseOf.set(idx, CAPPED_RISES[i]);
});
FIXED_IDX.forEach((idx) => {
  wordingOf.set(idx, 'fixed');
  riseOf.set(idx, 0);
});

// Software contracts C-001 … C-025, all running Nov 2024 → Nov 2026 so that
// 24 months of invoices give a clean year-1 / year-2 comparison.
SOFTWARE.forEach((name, idx) => {
  const id = `C-${String(idx + 1).padStart(3, '0')}`;
  const isCloudDesk = name === 'CloudDesk';
  const seats = isCloudDesk ? 500 : Math.round(between(40, 420) / 10) * 10;
  const unit = isCloudDesk ? 12000 : Math.round(between(1800, 14000) / 100) * 100;
  const annual = isCloudDesk ? 6000000 : seats * unit;
  contracts.push({
    id,
    name: isCloudDesk ? 'CloudDesk helpdesk subscription' : name,
    supplier: name,
    type: 'software',
    annualFeeInr: annual,
    startDate: '2024-12-01',
    endDate: '2026-11-30',
    status: isCloudDesk ? 'expiring' : rand() < 0.2 ? 'expiring' : 'active',
    owner: isCloudDesk ? 'Ananya Rao' : pick(OWNERS),
    priceWording: wordingOf.get(idx),
    // CloudDesk's current contract carries the 30-day notice the ledger
    // records as already agreed (§5.5, R-notice).
    noticeDays: isCloudDesk ? 30 : pick([30, 30, 60, 90, 30, 60]),
    autoRenew: true,
    seats,
  });
});

OTHERS.forEach((o, i) => {
  const id = `C-${String(26 + i).padStart(3, '0')}`;
  const annual = Math.round(between(8, 95)) * 100000;
  contracts.push({
    id,
    name: o.name,
    supplier: o.name,
    type: o.type,
    annualFeeInr: annual,
    startDate: '2025-04-01',
    endDate: '2027-03-31',
    status: 'active',
    owner: pick(OWNERS),
    noticeDays: pick([30, 60, 90]),
    autoRenew: rand() < 0.5,
  });
});

/* ------------------------------------------------------------------ */
/* Invoices: 24 months (Nov 2024 – Oct 2026) per software contract      */
/* ------------------------------------------------------------------ */

function monthsFrom(startYear: number, startMonth: number, count: number): string[] {
  const out: string[] = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

const INVOICE_MONTHS = monthsFrom(2024, 11, 24);

type Invoice = {
  contractId: string;
  month: string;
  amountInr: number;
  seats: number;
  unitPriceInr: number;
};

const invoices: Invoice[] = [];

SOFTWARE.forEach((name, idx) => {
  const c = contracts[idx];
  const rise = riseOf.get(idx) ?? 0;
  const year1Unit = Math.round(c.annualFeeInr / (c.seats ?? 1) / 12);
  const year2Unit = round6(year1Unit * (1 + rise));
  INVOICE_MONTHS.forEach((month, mi) => {
    const inYear2 = mi >= 12;
    const unit = inYear2 ? year2Unit : year1Unit;
    // Seat counts drift a little; the unit price is what the rise is read from.
    const seats = c.seats ?? 1;
    invoices.push({
      contractId: c.id,
      month,
      amountInr: Math.round(unit * seats),
      seats,
      unitPriceInr: unit,
    });
  });
});

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/* ------------------------------------------------------------------ */
/* Renewals: 22 past renewals of auto-renewing software contracts       */
/* ------------------------------------------------------------------ */

type Renewal = {
  id: string;
  contractId: string;
  supplier: string;
  renewedAt: string;
  noticeDays: number;
  reviewed: boolean;
  unusedShare?: number;
};

// 12 renewals in the 60–90 day notice group, 5 of them unreviewed.
// 10 renewals in the ≤ 30 day group, 1 of them unreviewed.
// Unused share on the 6 unreviewed ones: mean 0.18.
const LONG_NOTICE_UNREVIEWED_SHARES = [0.12, 0.15, 0.18, 0.21, 0.24];
const SHORT_NOTICE_UNREVIEWED_SHARE = 0.18;

const renewals: Renewal[] = [];
const renewalDates = [
  '2024-02-01', '2024-04-01', '2024-06-01', '2024-07-01', '2024-09-01', '2024-10-01',
  '2025-01-01', '2025-02-01', '2025-04-01', '2025-05-01', '2025-07-01', '2025-08-01',
  '2025-09-01', '2025-10-01', '2025-11-01', '2026-01-01', '2026-02-01', '2026-03-01',
  '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01',
];

let longUnreviewed = 0;
for (let i = 0; i < 12; i++) {
  const unreviewed = i < 5;
  const supplierIdx = i % SOFTWARE.length;
  renewals.push({
    id: `R-${String(i + 1).padStart(3, '0')}`,
    contractId: contracts[supplierIdx].id,
    supplier: SOFTWARE[supplierIdx],
    renewedAt: renewalDates[i],
    noticeDays: [60, 90, 60, 90, 75, 60, 90, 60, 90, 60, 75, 90][i],
    reviewed: !unreviewed,
    unusedShare: unreviewed ? LONG_NOTICE_UNREVIEWED_SHARES[longUnreviewed++] : undefined,
  });
}

for (let i = 0; i < 10; i++) {
  const unreviewed = i === 0;
  const supplierIdx = (i + 12) % SOFTWARE.length;
  renewals.push({
    id: `R-${String(i + 13).padStart(3, '0')}`,
    contractId: contracts[supplierIdx].id,
    supplier: SOFTWARE[supplierIdx],
    renewedAt: renewalDates[i + 12],
    noticeDays: [30, 30, 15, 30, 30, 20, 30, 30, 25, 30][i],
    reviewed: !unreviewed,
    unusedShare: unreviewed ? SHORT_NOTICE_UNREVIEWED_SHARE : undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Service events: CloudDesk uptime, Nov 2025 – Oct 2026                */
/* ------------------------------------------------------------------ */

const SERVICE_MONTHS = monthsFrom(2025, 11, 12);
// Exactly two months below 99.5%: Mar 2026 and Oct 2026.
const BREACHES: Record<string, number> = {
  '2026-03': 99.31,
  '2026-10': 99.12,
};

const serviceEvents = SERVICE_MONTHS.map((month) => ({
  contractId: 'C-017',
  month,
  uptimePct: BREACHES[month] ?? Math.round(between(99.52, 99.98) * 100) / 100,
}));

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

mkdirSync(DATA, { recursive: true });
const write = (file: string, value: unknown) => {
  writeFileSync(join(DATA, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  const n = Array.isArray(value) ? value.length : 1;
  console.log(`  ${file.padEnd(22)} ${n} rows`);
};

console.log('Generating seed data (mulberry32, seed 2026)…');
write('contracts.json', contracts);
write('invoices.json', invoices);
write('renewals.json', renewals);
write('service_events.json', serviceEvents);
console.log('Done.');
