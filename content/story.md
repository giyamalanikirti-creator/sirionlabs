# Deal Ledger

**Sign the supplier deal you negotiated.** Suppliers agree better terms in email; the final Word draft keeps the old wording; it passes the playbook, so it gets signed. Deal Ledger checks the signing copy against what was actually agreed, with the source email one click away.

Follow **Ananya Rao, Procurement Lead at Meridian Foods**, as she closes CloudDesk’s software renewal.

<!-- component:case-at-a-glance -->

## 1. Why start with negotiation?

It is the last stage where a lost term costs one tracked change to fix, and the only one where the evidence sits outside the document, in email.

<!-- component:why-negotiation -->

<!-- component:product-scope -->

**Assumed:** Meridian is an Indian company with 3,000 employees and about 2,500 suppliers, on Microsoft 365 and Sirion, with three years of invoice, renewal and uptime history behind every ₹ estimate.

<!-- collapse:Assumptions -->

<!-- component:assumptions -->

<!-- /collapse -->

## 2. Who needs to stay aligned?

Procurement owns the deal; everyone else either changes a term or pays for it. Nobody outside Ananya adopts a new tool.

<!-- component:stakeholder-cards -->

<!-- component:stakeholder-map -->

## 3. Where terms get lost

What a company agrees and what it signs are two different documents, and nobody compares them. Three ways it happens in the demo:

<!-- component:loss-patterns -->

<!-- component:exposure-chart -->

## 4. Walk through the CloudDesk renewal

Five steps over one week, across three people and three tools. Each card opens the live screen.

<!-- component:journey-timeline -->

<!-- component:handoff-chain -->

## 5. How we’ll know it works

<!-- component:metrics-panel -->

**Reference.** Open only if you need the detail.

<!-- collapse:How this works -->

### The complete ledger: one durable record per deal

Each term includes **term type and value; status** (*agreed, open, reopened, conceded, needs confirming*); **verified source line** (email, document version or call note); **who stated or agreed it** and when; **conditions**; **approval owner and dependency**; **model confidence**; **current draft match**; **expected annual exposure**; and **full edit/change history**. Negotiation status and draft-match status are separate: a term can be *agreed in email* but *missing from v6*. Any authorised user correction is logged. Call agreements enter with a human-entered call note as their source and are marked for confirmation; Teams transcripts with quotations are a later phase.

**Approvals:** A concession or waiver projected to cost **₹1 lakh a year or more** is routed to the CFO; Legal-owned terms go to Legal regardless of monetary estimate. “Accept theirs,” “Send anyway,” walk-away decisions and waiving a signing gap each create a clear audit event and required approval workflow. Approval is not inferred from a CC or an already-sent email.

### Sirion today versus Deal Ledger

| Area | **Today in Sirion** | **New · Deal Ledger** |
| --- | --- | --- |
| Outlook | Match a contract; find or sync a supplier attachment as the next version; IssueDetection summary; send for review/approval; open in Word | Extract and verify the email agreement; connect side threads; show priced gaps; prepare an evidence-based response; check at Send |
| Word | Contract record and Content Library; playbook review; Redline Agent's preferred/fallback/walk-away; document and version comparisons; approval/publish | Compare *actual negotiated positions* with the draft; conditional agreement check; word-level agreed changes; cost and confidence; final signing check |
| Sirion CLM | Repository, approvals, Calendar/obligations and invoice matching | Preserve deal-specific sources through handover; trace later invoice issues back to signed clauses and negotiation evidence |
| AskSirion | Assistant for repository and contract questions | Answers a **fixed set of live-negotiation question types** from the ledger, with a Deal Ledger source marker and an **Open in Deal Ledger** action |

**AskSirion is an entry point, not the product.** Deal Ledger brings information to people as the round lands, before Send, and at signing. AskSirion handles follow-up questions such as “What did CloudDesk agree on price?”, “Does this copy match the agreement?” and “Which live negotiations have the highest exposure?” The model may classify a supported question, but any amount or count comes from the **same deterministic ledger engines** and the user's permissions. A business owner never gains access to another person's unlinked mailbox. Teams and Slack as assistant channels are out of scope.

<!-- /collapse -->

<!-- collapse:Architecture & privacy -->

### How it connects

**Microsoft 365 Outlook add-in** (permission-scoped supplier threads, header-first matching, Send-time checks) and **Word add-in** (review, redlines and final-file comparison) both use **one server-side Deal Ledger service**. That service contains a language reader, quotation/source verifier, structured ledger, term/version matcher, deterministic financial engines, and approval routing. The service synchronises authorised decisions with Sirion's existing **repository/version history → approval workflow → Calendar/obligations → invoice reconciliation**. Sirion's supplier portal can handle the ordinary share/sign process. No add-in holds a model API key; language processing runs server-side. The prototype's Send check is rules-based rather than claiming an LLM was called.

<!-- component:architecture -->

**Setup and permissions:** the connection timeline below runs from a one-time admin step to the handover, and the table lists every moment that needs a person.

<!-- component:connection-flow -->

**Privacy and exits:** Only connected mailboxes and threads on live deals' supplier domains are read. No internal-only email is read or checked. Email bodies are not retained in Deal Ledger; only necessary **verified quotations plus source metadata** are kept. Business owners see the position and headline ₹ warning, not sensitive costing workings. Stop tracking, disconnect a mailbox, remove a participant or unlink a thread; retain the required audit event. Supplier-facing redlines and draft replies never include internal ₹ estimates, limits, names of approvers, peer data or leverage assessments. Gmail/Google Workspace, Teams transcripts and Slack are expansion paths, not working-prototype claims.

<!-- /collapse -->

<!-- collapse:Financial methodology -->

### Financial logic: all numbers calculated by code

> **Expected cost = historically observed chance / magnitude of the adverse outcome × exposed monetary base, expressed as an annual average over the specific contract term.** These are estimates to help prioritise negotiation, not realised losses or legal entitlements. Each row's calculated annual amount reconciles to the deal headline; unpriced risks sit outside the total.

| Term type | How the estimate is computed | What the user sees |
| --- | --- | --- |
| **Annual price revision** | Apply a comparable observed increase to later years of the contract, then average incremental fees over the term | CloudDesk: 6.4% historical yearly increase across nine comparable contracts; ~₹3.8 lakh extra in year 2 + ~₹7.9 lakh in year 3 = ~₹3.9 lakh/year over three years |
| **Renewal notice** | Use historical unreviewed-renewal incidence and unused-seat/renewal cost; annualise the **one-time** expected exposure over the contract term | Annual contribution *and* full next-renewal exposure, separately; the notice change from 30 to 90 days is not itself a cash cost |
| **Payment terms** | Financing rate × affected payments × days brought forward / 365 | A 15-day change on ₹60 lakh at a hypothetical 10% annual financing rate is approximately ₹25,000/year |
| **Service credits** | Difference in credit percentage × monthly fee × historically affected months | CloudDesk: (10% − 5%) × ₹5 lakh/month × 2 observed uptime misses = ₹50,000/year, conditional on the signed SLA |
| **Legal-owned risks** | Do not manufacture a price without defensible data | **Not priced: Legal review required** |

**Live-round reconciliation:** ~₹3.9 lakh price-revision exposure + ₹50,000 service-credit exposure = **₹4.4 lakh/year** for the CloudDesk state before round 4. A later signing-copy total is recomputed from the clauses still mismatched in *that* version. In the prototype, v6 on its own reconciles to ₹5.3 lakh/year (price ₹3.9 lakh + renewal notice ₹1.1 lakh + payment ₹25,000). It is never copied from an earlier scenario or added to the live-round figure. Version, scope, as-of time, itemised rows and assumptions are shown together everywhere.

**Confidence and missing history:** Invoices, renewal history and uptime records are Meridian's primary source. Fewer than **eight genuinely comparable records** calls for an explicit low-data warning and, if necessary, **Not priced**. Optional anonymised peer outcomes are a reference band and negotiation leverage, **not an input to Meridian's own ₹ headline**.

<!-- /collapse -->

<!-- collapse:Peer benchmarks -->

### What other companies saw: optional peer benchmark (sample data)

Sirion could offer a **contributor-only, opt-in “give to get”** view of anonymised outcomes for comparable clause types. The peer line shows **median and middle 50%**, never raw contracts or organisation identities. It appears only if at least **five contributing companies and 20 qualifying contracts** exist, data are at least one quarter old, and the displayed rates are rounded sufficiently (for example to 0.5 percentage points). Show **category-level**, never supplier-specific, pricing comparisons. Access is governed by company opt-in and legal/privacy review because cross-company pricing data can be competition-sensitive. Peer lines are internal and never enter supplier-facing content. **Every peer figure in the prototype is sample data.**

<!-- /collapse -->

<!-- collapse:Sources and scope of claims -->

- **The assignment's requirements:** one lifecycle stage, clear primary users, stated assumptions, a working multi-person journey and five case sections **inside** the prototype; no separate slide deck is required.
- **Sirion's documented current capabilities:** [contract negotiation](https://www.sirion.ai/platform/create/contract-negotiation/) and [the Sirion plug-in use cases](https://www.sirion.ai/sirion-university/contracting-use-cases/create/plug-in/). Labels such as **Today in Sirion** refer to these published platform capabilities; any exact demo-specific screen should still be treated as a representation.
- **WorldCC/Deloitte (2023), 8.6%:** [Deloitte's contract management lifecycle insights](https://www.deloitte.com/us/en/services/tax/articles/contract-management-lifecycle-insights.html). This is lifecycle-wide industry research, **not** the CloudDesk estimate.
- **WorldCC/Ironclad (2026), 11%:** [Closing the Procurement Value Gap](https://info.worldcc.com/closing-the-procurement-value-gap). A different lifecycle-wide industry finding, not additive to 8.6%.
- **Harvey, {{keep:19 October 2026}}:** [the entire-agreement clause article](https://www.harvey.ai/blog/entire-agreement-clause). Evidence that side communications and the signed instrument can diverge; not evidence that every competitor lacks this feature.
- **Dottr's related email-native workflow:** [Dottr's media page](https://www.dottr.ai/media). Email-sourced drafting and review exist; the proposed differentiation is a persistent, audited agreement ledger, side-thread ambiguity handling, Send-time check and signing/handover verification.
- **Microsoft Smart Alerts developer guidance:** [OnMessageSend and OnAppointmentSend events](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/onmessagesend-onappointmentsend-events). Do not describe every send mode as an unconditional free-send option; send-mode and client behaviour matter.

<!-- /collapse -->
