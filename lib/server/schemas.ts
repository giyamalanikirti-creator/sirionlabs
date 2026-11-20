import { z } from 'zod';

/**
 * Typed values the model may return. It never returns money.
 * The three price wordings share kind='price', so this is a plain union
 * rather than a discriminated one; the price variants are themselves
 * discriminated on `wording`.
 */
const priceValueSchema = z.discriminatedUnion('wording', [
  z.object({ kind: z.literal('price'), wording: z.literal('fixed') }),
  z.object({
    kind: z.literal('price'),
    wording: z.literal('open_yearly'),
    fromYear: z.number().default(2),
  }),
  z.object({
    kind: z.literal('price'),
    wording: z.literal('capped'),
    capPct: z.number(),
    fromYear: z.number().default(2),
  }),
]);

export const termValueSchema = z.union([
  z.object({ kind: z.literal('term'), years: z.number() }),
  priceValueSchema,
  z.object({ kind: z.literal('payment'), days: z.number() }),
  z.object({
    kind: z.literal('service_credit'),
    pct: z.number(),
    uptimeTarget: z.number().default(99.5),
  }),
  z.object({ kind: z.literal('liability_cap'), months: z.number() }),
  z.object({ kind: z.literal('renewal_notice'), days: z.number() }),
  z.object({ kind: z.literal('exit_support'), days: z.number(), free: z.boolean() }),
]);

export const termKeySchema = z.enum([
  'term',
  'price',
  'payment',
  'service_credit',
  'liability_cap',
  'renewal_notice',
  'exit_support',
]);

export const readerUpdateSchema = z.object({
  messageId: z.string(),
  termKey: termKeySchema,
  action: z.enum(['proposes', 'accepts', 'accepts_if', 'rejects', 'unclear', 'retracts']),
  byPersonId: z.string(),
  value: termValueSchema.optional(),
  alternatives: z.array(termValueSchema).optional(),
  condition: z.string().optional(),
  quote: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export const readerOutputSchema = z.object({
  updates: z.array(readerUpdateSchema).default([]),
  mentions: z.array(z.string()).default([]),
  statements: z
    .array(
      z.object({
        kind: z.enum(['claims_all_changes_accepted', 'claims_final', 'other']),
        quote: z.string(),
      }),
    )
    .default([]),
});

export const readerRequestSchema = z.object({
  linkedThreadIds: z.array(z.string()).max(10).default([]),
  dealId: z.string(),
  messageIds: z.array(z.string()).min(1).max(6),
});

export const sendCheckOutputSchema = z.object({
  concedes: z.boolean(),
  termKey: termKeySchema.optional(),
  value: termValueSchema.optional(),
  quote: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const sendCheckRequestSchema = z.object({
  fromPersonId: z.string(),
  to: z.array(z.string()).default([]),
  cc: z.array(z.string()).default([]),
  body: z.string().max(2000),
  threadId: z.string().optional(),
});

export const priceRequestSchema = z.object({
  dealId: z.string(),
  termKey: termKeySchema,
  from: termValueSchema,
  to: termValueSchema,
});

/* ---- JSON Schemas handed to the model as tool input schemas ---- */

export { PROPOSE_LEDGER_UPDATES_SCHEMA } from '@/lib/readerPrompt';

const TERM_VALUE_JSON = {
  type: 'object',
  description:
    'A typed term value. Never include money: the application computes every ₹ figure itself.',
  properties: {
    kind: {
      type: 'string',
      enum: [
        'term',
        'price',
        'payment',
        'service_credit',
        'liability_cap',
        'renewal_notice',
        'exit_support',
      ],
    },
    years: { type: 'number', description: 'For kind=term' },
    wording: {
      type: 'string',
      enum: ['fixed', 'open_yearly', 'capped'],
      description: 'For kind=price',
    },
    capPct: { type: 'number', description: 'For price wording=capped' },
    fromYear: { type: 'number', description: 'Contract year the revision starts, default 2' },
    days: { type: 'number', description: 'For payment, renewal_notice, exit_support' },
    pct: { type: 'number', description: 'For service_credit' },
    uptimeTarget: { type: 'number', description: 'For service_credit, default 99.5' },
    months: { type: 'number', description: 'For liability_cap' },
    free: { type: 'boolean', description: 'For exit_support' },
  },
  required: ['kind'],
} as const;

export const CHECK_CONCESSION_SCHEMA = {
  type: 'object',
  properties: {
    concedes: {
      type: 'boolean',
      description: 'True only if our side gives ground on a term in this draft.',
    },
    termKey: {
      type: 'string',
      enum: [
        'term',
        'price',
        'payment',
        'service_credit',
        'liability_cap',
        'renewal_notice',
        'exit_support',
      ],
    },
    value: TERM_VALUE_JSON,
    quote: { type: 'string', description: 'An exact substring of the draft.' },
    confidence: { type: 'number' },
  },
  required: ['concedes', 'confidence'],
} as const;
