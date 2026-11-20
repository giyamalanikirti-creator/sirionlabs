import 'server-only';

/**
 * Server-only AI plumbing — BUILD_SPEC §9.
 * The API key never leaves this module's call stack. Every route validates
 * input and output with zod, requests a typed tool response, times out, and falls back
 * to a fixture or to rules so the demo cannot break.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { AiSource } from '@/lib/types';

export const MODEL_SMART = process.env.MODEL_SMART || 'claude-sonnet-5-5';
export const MODEL_FAST = process.env.MODEL_FAST || 'claude-haiku-5-5';

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isCachedMode(): boolean {
  return (process.env.DEMO_MODE || 'live').toLowerCase() === 'cached';
}

/** True when we should not even try a live call. */
export function fixturesOnly(): boolean {
  return isCachedMode() || !hasApiKey();
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface ToolCallOptions {
  model: string;
  system: string;
  userContent: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
}

/**
 * One model request for typed tool output. Returns the tool input, or null if anything at all
 * goes wrong — the caller then falls back.
 */
export async function callModelTool(
  opts: ToolCallOptions,
): Promise<{ input: unknown; source: AiSource } | null> {
  if (fixturesOnly()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const response = await getClient().messages.create(
      {
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: `${opts.system}\nReturn your result by calling ${opts.toolName} once, even if there is no matching term. Do not return plain text.`,
        tools: [
          {
            name: opts.toolName,
            description: opts.toolDescription,
            input_schema: opts.inputSchema as Anthropic.Tool['input_schema'],
          },
        ],
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content: opts.userContent }],
      },
      { signal: controller.signal },
    );

    const block = response.content.find((c) => c.type === 'tool_use' && c.name === opts.toolName);
    if (!block || block.type !== 'tool_use') return null;
    return { input: block.input, source: 'live' };
  } catch (error) {
    console.error('[deal-ledger] AI call failed, falling back:', (error as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
