# Deal Ledger

One source-linked record of what has actually been agreed with a supplier, across email
threads, side threads and Word versions.

Student prototype for the Sirion ISB assignment. **Not a Sirion or Microsoft product. All
names, companies and figures are fictional.**

## What it does

Three surfaces that share one demo state:

- **Sirion-style app** — dashboard, deals list, the deal ledger, a mock Sirion contract
  record, insights and the written story.
- **Outlook mock** — two mailboxes with our Deal Ledger add-in pane and a Smart Alerts
  dialog that fires on Send.
- **Word mock** — the supplier's signing copy with our signing-check pane, tracked
  changes and supplier-safe comments.

Five moments, about three minutes. Open the **Demo guide** in the dark strip at the top;
every step's **Go** button replays the earlier steps from cached results, so you can start
anywhere.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

The whole demo runs **with no API key**. Every AI call falls back to a stored fixture or to
rules, and the pane says which: "AI: live", "AI: cached" or "Checked by rules".

To run the AI live:

```bash
cp .env.example .env.local
# set ANTHROPIC_API_KEY and DEMO_MODE=live
npm run dev
```

## Checks

```bash
npm test             # 122 tests: engines, golden numbers, matcher, signing, supplier-safe text
npm run lint
npm run build
npm run smoke        # walks the whole demo in a browser and checks every number on screen
```

`npm run smoke` needs the dev server running and Chrome on the machine
(`CHROME_PATH=... npm run smoke` if it is not at `/usr/bin/google-chrome`).

```bash
npm run seed         # regenerates data/contracts|invoices|renewals|service_events (deterministic)
npm run eval:reader  # scores the reader against the 32-item set; needs an API key
```

## How to read the code

| Where | What |
| --- | --- |
| `lib/engines/` | Pure, tested functions. **Every ₹ figure in the app comes from here**, never from the model. |
| `lib/engines/pricing.ts` | The four formulas, with their proof sentences. |
| `lib/engines/ledger.ts` | The state machine: what each event does to a row. |
| `lib/engines/matcher.ts` | Thread matching. Takes `EmailHeader`, which has no body field — the privacy rule is kept by the type system. |
| `lib/server/` | Server-only AI. Forced tool use, zod validation, timeouts, fixtures. |
| `lib/demo/steps.ts` | The five moments as pure ledger transitions. The store and the tests both run through it. |
| `data/` | All seed data. Hand-written files plus four generated deterministically from seed 2026. |
| `content/story.md` | The written answer, rendered at `/story`. |

## Ground rules this build keeps

1. **Numbers come from code.** The model returns typed values (`{ kind: 'payment', days: 45 }`)
   and exact quotes. It never returns money.
2. **Quotes are verified.** An update whose quote is not an exact substring of its source is
   dropped before anything is written.
3. **Header-first reading.** Bodies are read only for strong matches, or after the lead links a
   weak one. `/api/reader` returns 400 for a thread that matches nothing.
4. **Supplier-safe output.** Anything the supplier could see is checked for ₹ figures, lakh,
   crore, internal names, approvals and limits. Tests enforce it.
5. **The demo never breaks.** No API key, no network, an error or a timeout all fall back to a
   fixture or to rules.
6. **No Microsoft or Sirion logos.** Product names appear as plain text beside a "Mock" pill, and
   the app uses its own name and mark throughout.

## Deploying

`npm run build` and `npm test` must pass, `.env.local` must not be committed, and
`docs/design-reference/` is git-ignored. Then import the repo into Vercel and set
`ANTHROPIC_API_KEY`, `DEMO_MODE`, `MODEL_FAST` and `MODEL_SMART` for Production and Preview.
The AI routes set `maxDuration = 60` and time out well inside it.
