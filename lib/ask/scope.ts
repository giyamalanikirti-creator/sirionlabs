/**
 * Where AskSirion was opened from decides its default scope and persona
 * (brief §3.5), and which three questions it suggests (§8.3).
 */
import { messageById, threadById } from '@/lib/data';
import { GUIDE_STAGES, AFTER_SIGNING } from '@/lib/demo/guide';
import { INTENT_BY_ID } from './intents';
import type { AskScope, IntentId } from './types';

const DEAL = 'D-CLOUDDESK';

export function scopeFor(pathname: string, search: string, linkedThreadIds: string[] = []): AskScope {
  const params = new URLSearchParams(search);
  if (pathname.startsWith('/outlook/')) {
    const persona = pathname.startsWith('/outlook/vikram') ? 'vikram' : 'ananya';
    const msg = params.get('msg') ?? (persona === 'vikram' ? 'M13' : undefined);
    const message = msg ? messageById(msg) : undefined;
    const thread = message ? threadById(message.threadId) : undefined;
    const forDeal = thread?.dealId === DEAL || (thread && linkedThreadIds.includes(thread.id)) || thread?.id === 'T2';
    if (message && forDeal) {
      return { kind: 'thread', surface: persona, persona, dealId: DEAL, threadId: thread!.id, messageId: message.id, label: 'This email' };
    }
    return { kind: 'all', surface: persona, persona, label: 'All contracts' };
  }
  if (pathname.startsWith('/word/')) {
    const versionId = pathname.split('/')[2] || 'v6';
    return { kind: 'doc', surface: 'word', persona: 'ananya', dealId: DEAL, versionId, label: versionId };
  }
  const surface = pathname.startsWith('/ask') ? 'ask' : 'sirion';
  if (pathname.startsWith(`/deals/${DEAL}`) || pathname.startsWith('/contracts/C-2026-0417')) {
    return { kind: 'deal', surface, persona: 'ananya', dealId: DEAL, label: 'CloudDesk MSA' };
  }
  return { kind: 'all', surface, persona: 'ananya', label: 'All contracts' };
}

/** "All contracts", keeping the surface and persona. */
export function widen(scope: AskScope): AskScope {
  return { kind: 'all', surface: scope.surface, persona: scope.persona, label: 'All contracts' };
}

const DEFAULTS: Record<string, IntentId[]> = {
  all: ['portfolio_at_risk', 'repo_search', 'contract_summary'],
  deal: ['open_terms', 'agreed_term', 'explain_figure'],
  'thread:ananya': ['round_changes', 'agreed_term', 'open_terms'],
  'thread:vikram': ['can_i_agree', 'agreed_term', 'other_threads'],
  doc: ['signing_match', 'clause_lookup', 'draft_reply'],
};

const DEFAULT_PROMPTS: Partial<Record<IntentId, string>> = {
  agreed_term: 'What did CloudDesk agree on price?',
  explain_figure: 'How is the CloudDesk figure worked out?',
};

/** Three questions for this surface, scope and walkthrough step. Step questions come first when they fit the scope. */
export interface Suggestion {
  prompt: string;
  intent: IntentId;
}

export function suggestionsFor(scope: AskScope, step?: number): Suggestion[] {
  const stage = step === 6 ? AFTER_SIGNING : step && step >= 1 && step <= 5 ? GUIDE_STAGES[step - 1] : undefined;
  const stepAsks = (stage && 'ask' in stage ? stage.ask ?? [] : []).filter((a) => INTENT_BY_ID[a.intent].scopes.includes(scope.kind)).map((a) => ({ prompt: a.prompt, intent: a.intent }));
  const key = scope.kind === 'thread' ? `thread:${scope.persona}` : scope.kind;
  const defaults = (DEFAULTS[key] ?? DEFAULTS.all).map((id) => ({ prompt: DEFAULT_PROMPTS[id] ?? INTENT_BY_ID[id].suggestion, intent: id }));
  const seen = new Set<string>();
  return [...stepAsks, ...defaults].filter((x) => !seen.has(x.prompt) && seen.add(x.prompt)).slice(0, 3);
}
