import { NextResponse } from 'next/server';
import { forcedToolCall, MODEL_FAST, fixturesOnly } from '@/lib/server/anthropic';
import { CHECK_CONCESSION_SCHEMA, sendCheckOutputSchema, sendCheckRequestSchema } from '@/lib/server/schemas';
import { SEND_CHECK_SYSTEM, sendCheckUserContent } from '@/lib/server/prompts';
import { ledgerSnapshot } from '@/lib/server/context';
import { cloudDeskDeal, deals, personById } from '@/lib/data';
import { checkByRules } from '@/lib/engines/sendRules';
import { priceChange } from '@/lib/engines/pricing';
import { rowForTerm } from '@/lib/engines/ledger';
import { approverFor, buildDialog, sourcePlain } from '@/lib/engines/sendDialog';
import { ledgerAtStep } from '@/lib/demo/steps';
import { sameValue, plainValue } from '@/lib/plain';
import { SEND_CONFIDENCE_MIN, SEND_MAX_DRAFT_CHARS, SEND_MAX_TOKENS, SEND_TIMEOUT_MS } from '@/lib/settings';
import type { AiSource, LedgerRow, SendCheckResult, TermValue } from '@/lib/types';

export const maxDuration = 60;

const domainOf = (address: string) => address.split('@')[1]?.toLowerCase() ?? '';

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sendCheckRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { fromPersonId, to, cc, body } = parsed.data;
  if (body.length > SEND_MAX_DRAFT_CHARS) {
    return NextResponse.json({ error: 'Draft too long' }, { status: 400 });
  }

  /* Step 1, no AI: is any recipient on an active deal's supplier domain? */
  const recipients = [...to, ...cc];
  const activeDomains = deals
    .filter((d) => d.stage !== 'signed')
    .map((d) => d.supplierDomain.toLowerCase());
  const supplierRecipient = recipients.some((r) => activeDomains.includes(domainOf(r)));

  if (!supplierRecipient) {
    const allow: SendCheckResult = { decision: 'allow', checkedBy: 'none', source: 'rules' };
    return NextResponse.json(allow);
  }

  /*
   * The ledger the warning is measured against. The client sends nothing but
   * the draft, so the server rebuilds the state at the point in the demo where
   * the business owner can reply: price agreed, credit confirmed.
   */
  const rows: LedgerRow[] = ledgerAtStep(3);

  /* Step 2: the model, or the rules when it is unavailable. */
  let concedes = false;
  let value: TermValue | undefined;
  let quote: string | undefined;
  let confidence = 0;
  let checkedBy: SendCheckResult['checkedBy'] = 'rules';
  let source: AiSource = 'rules';

  const ai = await forcedToolCall({
    model: MODEL_FAST,
    system: SEND_CHECK_SYSTEM,
    userContent: sendCheckUserContent({
      ledgerSnapshot: ledgerSnapshot(rows),
      fromName: personById(fromPersonId)?.name ?? fromPersonId,
      draft: body,
    }),
    toolName: 'check_concession',
    toolDescription:
      'Report whether this draft concedes a term that is already agreed. Never compute money.',
    inputSchema: CHECK_CONCESSION_SCHEMA,
    maxTokens: SEND_MAX_TOKENS,
    timeoutMs: SEND_TIMEOUT_MS,
  });

  let aiKey: string | undefined;

  if (ai) {
    const validated = sendCheckOutputSchema.safeParse(ai.input);
    if (validated.success) {
      concedes = validated.data.concedes;
      aiKey = validated.data.termKey;
      value = validated.data.value as TermValue | undefined;
      quote = validated.data.quote;
      confidence = validated.data.confidence;
      checkedBy = 'ai';
      source = 'live';
    }
  }

  if (checkedBy !== 'ai') {
    const rules = checkByRules(body);
    concedes = rules.concedes;
    aiKey = rules.termKey;
    value = rules.value;
    quote = rules.quote;
    confidence = rules.confidence;
    checkedBy = 'rules';
    source = fixturesOnly() ? 'cached' : 'rules';
  }

  /* Step 3, the engine: is this really a move away from our position? */
  if (!concedes || !aiKey || !value || confidence < SEND_CONFIDENCE_MIN) {
    const allow: SendCheckResult = { decision: 'allow', checkedBy, source };
    return NextResponse.json(allow);
  }

  const row = rowForTerm(rows, aiKey as never);
  if (!row || sameValue(row.position, value)) {
    const allow: SendCheckResult = { decision: 'allow', checkedBy, source };
    return NextResponse.json(allow);
  }

  const tag = priceChange(cloudDeskDeal, row.position, value);
  const dialog = buildDialog(rows, cloudDeskDeal, row.termKey, value);

  const result: SendCheckResult = {
    decision: 'warn',
    checkedBy,
    source,
    match: {
      rowId: row.id,
      termKey: row.termKey,
      value,
      quote: quote ?? body.slice(0, 120),
      costLakhPerYr: tag.costLakhPerYr,
      overTermLakh: tag.overTermLakh,
      agreedPlain: plainValue(row.position, cloudDeskDeal.termYears),
      sourcePlain: sourcePlain(row.source),
      approverName: approverFor(rows, row.termKey),
    },
    dialog: dialog ?? undefined,
  };

  return NextResponse.json(result);
}
