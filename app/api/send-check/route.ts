/**
 * POST /api/send-check — the check at Send, as the Outlook Smart Alerts
 * add-in would call it. Deterministic (lib/engines/sendGuard.ts), no model:
 * the same engine the demo's Outlook runs in the browser, so the two agree.
 * The add-in treats any error or a reply slower than about 3 seconds as
 * "send as usual": it warns, never blocks.
 */
import { NextResponse } from 'next/server';
import { sendCheckRequestSchema } from '@/lib/server/schemas';
import { cloudDeskDeal, deals } from '@/lib/data';
import { sendGuard } from '@/lib/engines/sendGuard';
import { ledgerAtStep } from '@/lib/demo/steps';
import { SEND_MAX_DRAFT_CHARS } from '@/lib/settings';
import type { LedgerRow } from '@/lib/types';

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = sendCheckRequestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const { to, cc, body, ledger, attachments, currentVersionId } = parsed.data;
  if (body.length > SEND_MAX_DRAFT_CHARS) return NextResponse.json({ error: 'Draft too long' }, { status: 400 });

  // Keep the server's evidence and approvals; take current positions and states from the session.
  const rows: LedgerRow[] = ledgerAtStep(3).map((row) => {
    const current = ledger?.find((item) => item.termKey === row.termKey && item.position.kind === row.termKey);
    return current ? { ...row, position: current.position, state: current.state } : row;
  });

  const result = sendGuard({
    to,
    cc,
    body,
    attachments,
    rows,
    deal: cloudDeskDeal,
    currentVersionId: currentVersionId ?? 'v5',
    dealDomains: deals.map((d) => d.supplierDomain.toLowerCase()),
  });
  return NextResponse.json({ decision: result.findings.length ? 'warn' : 'allow', ...result });
}
