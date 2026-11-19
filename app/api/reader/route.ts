import { NextResponse } from 'next/server';
import { forcedToolCall, MODEL_SMART, fixturesOnly } from '@/lib/server/anthropic';
import { PROPOSE_LEDGER_UPDATES_SCHEMA, readerOutputSchema, readerRequestSchema } from '@/lib/server/schemas';
import { READER_SYSTEM, readerUserContent } from '@/lib/server/prompts';
import { diffBlock, ledgerSnapshot, messagesBlock, peopleDirectory } from '@/lib/server/context';
import { messageById, versionById, versions, threadById } from '@/lib/data';
import { diffVersions, lastOwnVersion } from '@/lib/engines/diff';
import { quoteFound } from '@/lib/engines/ledger';
import { matchThread, toHeader } from '@/lib/engines/matcher';
import { deals } from '@/lib/data';
import { initialLedger } from '@/lib/demo/steps';
import { READER_MAX_MESSAGES, READER_MAX_TOKENS, READER_TIMEOUT_MS } from '@/lib/settings';
import type { AiSource, ClauseChange, LedgerRow } from '@/lib/types';

import readerM8 from '@/data/fixtures/reader_M8.json';
import readerM12 from '@/data/fixtures/reader_M12.json';
import readerT2 from '@/data/fixtures/reader_T2.json';
import readerM13 from '@/data/fixtures/reader_M13.json';
import readerM14 from '@/data/fixtures/reader_M14.json';

export const maxDuration = 60;

const FIXTURES: Record<string, unknown> = {
  M8: readerM8,
  M12: readerM12,
  M13: readerM13,
  M14: readerM14,
  T2: readerT2,
};

function fixtureFor(messageIds: string[]): unknown {
  // Reading the linked side thread means re-reading M12 against both offers.
  if (messageIds.includes('M9') || messageIds.includes('M10')) return FIXTURES.T2;
  for (const id of messageIds) {
    if (FIXTURES[id]) return FIXTURES[id];
  }
  return { updates: [], mentions: [], statements: [] };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = readerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request', detail: parsed.error.format() }, { status: 400 });
  }

  const { messageIds } = parsed.data;
  if (messageIds.length > READER_MAX_MESSAGES) {
    return NextResponse.json({ error: 'Too many messages' }, { status: 400 });
  }

  const messages = messageIds.map(messageById).filter(Boolean) as NonNullable<
    ReturnType<typeof messageById>
  >[];
  if (messages.length !== messageIds.length) {
    return NextResponse.json({ error: 'Unknown message' }, { status: 400 });
  }

  /*
   * Header-first guard (§9.3). A body is only ever sent to the model when its
   * thread matches this deal. A personal or unrelated thread is refused here,
   * before any text leaves the server.
   */
  for (const m of messages) {
    const thread = threadById(m.threadId);
    const threadHeaders = messages.filter((x) => x.threadId === m.threadId).map(toHeader);
    const match = matchThread(threadHeaders, deals, versions);
    const linked = Boolean(thread?.dealId) || match.strength !== 'none';
    if (!linked) {
      return NextResponse.json(
        {
          error: 'This thread does not match an active deal, so its body is never read.',
          threadId: m.threadId,
        },
        { status: 400 },
      );
    }
  }

  /* The diff of any attached version, computed by the engine, not the model. */
  let changes: ClauseChange[] = [];
  let versionId: string | undefined;
  for (const m of messages) {
    const attached = m.attachments.find((a) => a.versionId);
    if (!attached?.versionId) continue;
    const version = versionById(attached.versionId);
    if (!version) continue;
    const prev = lastOwnVersion(versions, version.sentAt);
    if (!prev) continue;
    versionId = version.id;
    changes = diffVersions(prev, version);
  }

  const rows: LedgerRow[] = initialLedger();

  const result = await forcedToolCall({
    model: MODEL_SMART,
    system: READER_SYSTEM,
    userContent: readerUserContent({
      ledgerSnapshot: ledgerSnapshot(rows),
      people: peopleDirectory(),
      messages: messagesBlock(messages),
      diff: diffBlock(changes),
    }),
    toolName: 'propose_ledger_updates',
    toolDescription:
      'Propose updates to the ledger of agreed terms, based only on the messages given. Never compute money.',
    inputSchema: PROPOSE_LEDGER_UPDATES_SCHEMA,
    maxTokens: READER_MAX_TOKENS,
    timeoutMs: READER_TIMEOUT_MS,
  });

  let source: AiSource = 'cached';
  let output = fixtureFor(messageIds);

  if (result) {
    const validated = readerOutputSchema.safeParse(result.input);
    if (validated.success) {
      output = validated.data;
      source = 'live';
    } else {
      console.error('[reader] model output failed validation, using fixture');
    }
  } else if (!fixturesOnly()) {
    // A live call was attempted and failed. The fixture keeps the demo alive.
    source = 'cached';
  }

  /* Drop any update whose quote is not in its message (§9.1). */
  const parsedOut = readerOutputSchema.parse(output);
  const kept = parsedOut.updates.filter((u) => {
    const m = messageById(u.messageId);
    if (!m) return false;
    const ok = quoteFound(u.quote, m.body);
    if (!ok) console.warn('[reader] dropped an update: quote not found', u.messageId, u.quote);
    return ok;
  });

  return NextResponse.json({
    updates: kept,
    mentions: parsedOut.mentions,
    statements: parsedOut.statements,
    diff: changes,
    versionId,
    source,
  });
}
