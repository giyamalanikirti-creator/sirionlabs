import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signingCheck } from '@/lib/engines/signing';
import { dealById, versionById } from '@/lib/data';
import type { LedgerRow } from '@/lib/types';

const schema = z.object({
  dealId: z.string(),
  versionId: z.string(),
  rows: z.array(z.any()),
});

/** Engine only. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const deal = dealById(parsed.data.dealId);
  const version = versionById(parsed.data.versionId);
  if (!deal || !version) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(signingCheck(parsed.data.rows as LedgerRow[], version, deal));
}
