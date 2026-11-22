/**
 * The question types AskSirion answers in this prototype. Each has the scopes
 * it works in, a suggestion chip, and weighted patterns the cached router
 * scores a typed question against. Anything that scores too low gets the
 * fallback, so nothing is answered by guesswork.
 */
import type { TermKey } from '@/lib/types';
import type { IntentId, ScopeKind } from './types';

export interface IntentDef {
  id: IntentId;
  source: 'repository' | 'deal-ledger';
  scopes: ScopeKind[];
  /** The suggestion chip, and the first phrasing it must route from. */
  suggestion: string;
  /** Other ways people ask it; the router tests use these. */
  phrasings: string[];
  patterns: [RegExp, number][];
  /** The answer needs a term; follow-ups can supply it ("and renewal?"). */
  needsTerm?: boolean;
}

const ANY: ScopeKind[] = ['all', 'deal', 'thread', 'doc'];

export const INTENTS: IntentDef[] = [
  {
    id: 'repo_search',
    source: 'repository',
    scopes: ['all'],
    suggestion: 'Show software contracts renewing this quarter',
    phrasings: ['Which contracts expire this quarter?', 'List staffing contracts ending this year', 'Find software contracts up for renewal next quarter'],
    patterns: [
      [/\b(show|list|find|which|any)\b.*\bcontracts\b/, 2],
      [/\bcontracts?\b.*\b(renew\w*|expir\w*|ending|end|up for renewal|due)\b/, 2],
      [/\b(this|next) (quarter|month|year)\b/, 1],
    ],
  },
  {
    id: 'contract_summary',
    source: 'repository',
    scopes: ['all', 'deal', 'doc', 'thread'],
    suggestion: 'Summarise the CloudDesk MSA',
    phrasings: ['Give me an overview of the CloudDesk contract', 'Summary of this contract', 'Tell me about the CloudDesk agreement'],
    patterns: [
      [/\bsummar(y|ise|ize|ised|ized)\b/, 3],
      [/\boverview\b/, 3],
      [/\btell me about\b/, 2],
      [/\bkey (terms|points)\b/, 2],
    ],
  },
  {
    id: 'clause_lookup',
    source: 'repository',
    scopes: ['deal', 'doc', 'thread', 'all'],
    suggestion: 'What’s the termination notice in CloudDesk?',
    phrasings: ['What does the contract say about liability?', 'Show me the governing law clause', 'Which clause covers data protection?'],
    patterns: [
      [/\bclause\b/, 2],
      [/\b(say|says)\b/, 2],
      [/\b(termination|terminate|liability|confidential\w*|governing law|force majeure|data protection|warrant\w*|support hours|escalation|notices?)\b/, 1.5],
      [/\bwhat('?s| is) the\b/, 0.5],
    ],
  },
  {
    id: 'agreed_term',
    source: 'deal-ledger',
    scopes: ['deal', 'thread', 'doc', 'all'],
    suggestion: 'What did CloudDesk agree on price?',
    phrasings: ['What was agreed on renewal notice?', 'Where did we land on payment terms?', 'What has Ananya agreed with CloudDesk?'],
    patterns: [
      [/\bagree(d|ment on)?\b/, 3],
      [/\bwhere did we land\b/, 3],
      [/\b(our|the) (position|deal) on\b/, 2],
      [/\bsettled\b/, 1.5],
    ],
  },
  {
    id: 'round_changes',
    source: 'deal-ledger',
    scopes: ['deal', 'thread'],
    suggestion: 'What changed in Rohan’s round 4?',
    phrasings: ['What did the last round change?', 'What moved in the new draft?', 'Anything walked back in round 4?'],
    patterns: [
      [/\bround\b/, 2.5],
      [/\b(what )?(changed|moved|walked back|is new)\b/, 2.5],
      [/\bnew (draft|version)\b/, 1.5],
      [/\bchanges?\b/, 1],
    ],
  },
  {
    id: 'open_terms',
    source: 'deal-ledger',
    scopes: ['deal', 'thread', 'doc'],
    suggestion: 'Which terms are still open?',
    phrasings: ['What is not agreed yet?', 'Anything still outstanding with CloudDesk?', 'What’s left to close on this deal?'],
    patterns: [
      [/\b(still )?(open|outstanding|unresolved|pending)\b/, 2.5],
      [/\bnot (yet )?(agreed|settled)\b/, 4],
      [/\bleft to (agree|close|settle)\b/, 3],
    ],
  },
  {
    id: 'other_threads',
    source: 'deal-ledger',
    scopes: ['deal', 'thread'],
    suggestion: 'Did anyone else talk to CloudDesk?',
    phrasings: ['Who else is emailing CloudDesk?', 'Are there other threads with this supplier?', 'Any side threads on this deal?'],
    patterns: [
      [/\b(anyone|who) else\b/, 3],
      [/\bother (threads?|emails?|people|conversations?|mailboxes)\b/, 3],
      [/\bside threads?\b/, 3],
      [/\b(talk|talked|talking|emailing|spoke|speaking)\b/, 1],
    ],
  },
  {
    id: 'can_i_agree',
    source: 'deal-ledger',
    scopes: ['thread', 'deal'],
    suggestion: 'Can I tell Rohan 99.5% uptime is fine?',
    phrasings: ['Is it ok to accept a 5% service credit?', 'Should I agree to a yearly price review?', 'Am I allowed to say yes to 45 days payment?'],
    patterns: [
      [/\bcan (i|we)\b/, 2.5],
      [/\b(is it|would it be) (ok|okay|fine|alright)\b/, 2.5],
      [/\bshould (i|we) (agree|accept|say yes)\b/, 3],
      [/\b(allowed|okay|ok) to\b/, 2],
      [/\b(say yes|accept|agree to)\b/, 1],
    ],
    needsTerm: true,
  },
  {
    id: 'signing_match',
    source: 'deal-ledger',
    scopes: ['doc', 'deal'],
    suggestion: 'Does this copy match what we agreed?',
    phrasings: ['Is the signing copy safe to sign?', 'Is anything missing from the signing copy?', 'Does v6 differ from what was agreed?'],
    patterns: [
      [/\bmatch(es)?\b/, 2.5],
      [/\bsigning copy\b/, 2.5],
      [/\b(safe|ready|ok) to sign\b/, 3],
      [/\b(this|the) (copy|draft|file)\b/, 1],
      [/\b(missing|differ\w*)\b/, 1.5],
      [/\b(match\w*|differ\w*)\b.*\bagreed\b/, 2],
    ],
  },
  {
    id: 'explain_figure',
    source: 'deal-ledger',
    scopes: ANY,
    suggestion: 'How is ₹3.9 lakh worked out?',
    phrasings: ['Why is renewal notice worth so much?', 'Explain the ₹5.3 lakh figure', 'Where does the cost on price come from?'],
    patterns: [
      [/\b(worked out|calculated|calculate|computed)\b/, 3],
      [/\bexplain\b/, 2.5],
      [/\bwhere does\b.*\bcome from\b/, 3],
      [/\bwhy\b.*\b(worth|cost|lakh|figure|much|expensive)\b/, 3],
      [/₹\s?[\d.,]+/, 1],
    ],
  },
  {
    id: 'portfolio_at_risk',
    source: 'deal-ledger',
    scopes: ['all', 'deal'],
    suggestion: 'Which live negotiations would cost the most if signed today?',
    phrasings: ['Which deals are most at risk?', 'Show the portfolio at risk', 'Biggest exposure across all negotiations'],
    patterns: [
      [/\b(negotiations|deals|portfolio)\b/, 2],
      [/\b(most|biggest|largest|worst|top)\b/, 1.5],
      [/\b(at risk|exposure|cost)\b/, 1],
      [/\bacross (all|every)\b/, 2],
    ],
  },
  {
    id: 'invoice_mismatch',
    source: 'deal-ledger',
    scopes: ['deal', 'all', 'thread', 'doc'],
    suggestion: 'Why doesn’t this invoice match?',
    phrasings: ['Is CloudDesk overcharging us?', 'Why is December’s invoice higher?', 'What is wrong with the invoice?'],
    patterns: [
      [/\binvoices?\b/, 3],
      [/\b(overcharg\w*|over-?bill\w*|billed|billing)\b/, 3],
    ],
  },
  {
    id: 'draft_reply',
    source: 'deal-ledger',
    scopes: ['thread', 'deal', 'doc'],
    suggestion: 'Draft a reply asking CloudDesk to restore the fixed price',
    phrasings: ['Write an email to Rohan about the renewal notice', 'Help me reply to CloudDesk on payment', 'Draft an email asking to put 30 days back'],
    patterns: [
      [/\b(draft|write|compose)\b/, 3],
      [/\breply\b/, 2],
      [/\bemail (to|for)\b/, 2],
    ],
  },
  {
    id: 'suggest_term',
    source: 'deal-ledger',
    scopes: ['deal', 'thread', 'doc'],
    suggestion: 'What should I put for renewal notice instead?',
    phrasings: ['What can I offer on service credits?', 'Suggest a fallback on price', 'What’s a good counter on payment terms?'],
    patterns: [
      [/\binstead\b/, 3],
      [/\bwhat (should|can) (i|we) (put|ask|offer|propose|counter)\b/, 3],
      [/\b(fallback|walk-?away|counter|compromise|middle ground|suggest)\b/, 2.5],
    ],
  },
  {
    id: 'internal_conflict',
    source: 'deal-ledger',
    scopes: ['deal', 'all', 'doc'],
    suggestion: 'Why do clause 6 and Schedule 2 disagree?',
    phrasings: ['Is the BrightStaff contract inconsistent?', 'Which markup applies, the clause or the rate card?', 'Does the signing copy contradict itself?'],
    patterns: [
      [/\b(disagree\w*|conflict\w*|inconsistent|contradict\w*)\b/, 3],
      [/\b(schedule 2|rate card|clause 6)\b/, 2.5],
      [/\bmarkup\b/, 1.5],
    ],
  },
  {
    id: 'negotiation_summary',
    source: 'deal-ledger',
    scopes: ['deal', 'thread', 'doc'],
    suggestion: 'Summarise the CloudDesk negotiation so far',
    phrasings: ['Summarise the negotiation', 'Where are we with CloudDesk?', 'Negotiation so far', 'Recap the CloudDesk negotiation'],
    patterns: [
      [/\bnegotiation so far\b/, 6],
      [/\b(summar\w*|recap|catch me up)\b.*\bnegotiation\b/, 5],
      [/\bwhere (are|do) we (stand )?with\b/, 5],
      [/\bso far\b/, 2],
    ],
  },
];

export const INTENT_BY_ID = Object.fromEntries(INTENTS.map((i) => [i.id, i])) as Record<IntentId, IntentDef>;

/** BUILD brief §4.3: words that name each term. */
export const TERM_SYNONYMS: [TermKey, RegExp][] = [
  ['service_credit', /\b(service credits?|credits?|uptime|sla|availability|99\.5)\b/],
  ['renewal_notice', /\b(renewal|renew|notice|auto-?renew\w*)\b/],
  ['payment', /\b(payment|payment terms|pay|net ?\d+|\d+ days to pay)\b/],
  ['price', /\b(price|pricing|fees?|rate|per seat|revision|review|escalation|increase)\b/],
  ['liability_cap', /\b(liability|cap)\b/],
  ['exit_support', /\b(exit support|exit|data export)\b/],
  ['term', /\b(initial term|term length|contract length|duration|how many years)\b/],
];

/** Topics for clause lookup that are not ledger terms. */
export const CLAUSE_TOPICS: [string, RegExp, string][] = [
  ['termination', /\b(termination|terminate|notice to terminate)\b/, '14.2'],
  ['liability', /\bliabilit\w*\b/, '12.1'],
  ['confidentiality', /\bconfidential\w*\b/, '6.1'],
  ['governing law', /\b(governing law|jurisdiction|disputes?)\b/, '17.1'],
  ['force majeure', /\bforce majeure\b/, '13.1'],
  ['data protection', /\b(data protection|personal data|privacy)\b/, '5.1'],
  ['warranties', /\bwarrant\w*\b/, '7.1'],
  ['support', /\b(support hours|support|escalation)\b/, '8.1'],
  ['notices', /\bnotices\b/, '16.1'],
  ['seats', /\bseats?\b/, '4.1'],
];
