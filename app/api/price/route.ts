import { NextResponse } from 'next/server';
import { priceRequestSchema } from '@/lib/server/schemas';
import { priceChange } from '@/lib/engines/pricing';
import { dealById } from '@/lib/data';
import type { TermValue } from '@/lib/types';

/** Engine only. No model is involved in any ₹ figure. */
export async function POST(request: Request) {
  const parsed = priceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const deal = dealById(parsed.data.dealId);
  if (!deal) return NextResponse.json({ error: 'Unknown deal' }, { status: 404 });

  return NextResponse.json(
    priceChange(deal, parsed.data.from as TermValue, parsed.data.to as TermValue),
  );
}
