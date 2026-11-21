# Deal Ledger

**Before you sign, check the supplier's final draft against what your team actually agreed in email.**

**The problem:** The promises made during a negotiation live in emails, side conversations and calls; the contract that gets signed lives in Word. A draft can pass the company's legal playbook and still lose a commercial term the supplier already conceded.

**The solution:** Deal Ledger adds an evidence-backed, deal-specific agreement check to Sirion's existing negotiation workflow. It reads permitted supplier conversations, records each position with its source and status, warns before someone gives away a term, compares the signing copy with the agreed positions, and carries the signed outcome into obligations and invoice checks. It never negotiates, sends or approves a concession on its own.

**The question this case answers:** Can Ananya Rao, Meridian Foods' procurement owner, sign CloudDesk's renewal knowing it contains what her team actually agreed?

### The agency boundary

| Rung | Role in the prototype |
| --- | --- |
| **1. Watch** | Read only allowed supplier threads, checking headers before linking candidates. |
| **2. Record** | Extract typed terms with verified exact quotations, confidence and human-correctable status. |
| **3. Price** | Calculate ₹ exposure from invoices, renewals and uptime records using deterministic code. |
| **4. Prepare** | Propose tracked Word edits and supplier-safe replies; a person must apply/send them. |
| **5. Interrupt** | Warn at Send; require a reason and approver at the separate final Publish gate. |

### Three product decisions

| Decision | Choice | Why |
| --- | --- | --- |
| **Who we build for** | Procurement is the primary user; business owners are protected at Send; Finance and Legal receive traceable handovers. Suppliers are not users. | Procurement owns what gets signed, but many concessions happen in other people's inboxes. No solution should require 2,500 suppliers to install something. |
| **How much the product does** | Watch → Record → Price → Prepare → Interrupt. It may file a version, propose a term, suggest a tracked change and warn at Send; it never sends, accepts, signs or grants an approval for a human. | The irreversibility of a signed term warrants human control and clear evidence. |
| **Assumptions** | Meridian is an India-based company with 3,000 employees and ~2,500 suppliers. Microsoft 365 and Word are used for negotiations; Sirion is its CLM; connected invoice, renewal and uptime histories support estimates. | The product needs a live contract record, scoped mailbox access and enough historical evidence to estimate risk. |

## 1. Why negotiation?

**Negotiation is the last point where a lost term can be corrected before signature.** Intake makes work visible, and a repository makes signed documents searchable. Neither answers whether a supplier's latest document reflects the agreement reached across an email thread and several Word rounds. A clause that quietly reverts to the supplier's wording may cause no policy violation and no error message, because the supplier's position can be within the company playbook while still being worse than the position negotiated for this deal.

This is the difference between **policy compliance** and **deal fidelity**. Consider CloudDesk's signing copy: §9.3 provides payment in 45 days. Sirion's company playbook allows 45 days, so a playbook-only review can pass it. Yet Rohan agreed to 60 days on 10 November **if Meridian committed for three years**. The same draft's §3.1 gives CloudDesk a three-year term. The condition is met, but the buyer would pay 15 days earlier than agreed. Deal Ledger checks both clauses against the source email, shows the condition and proposes the specific correction.

The strongest objection is that much of the financial leakage happens *after* signature, during delivery, renewals and invoicing. That is precisely why the negotiation check matters: post-signature systems can enforce only the terms that survive into the executed document. If the wrong notice period, escalator or service-credit language is signed, a calendar or invoice checker cannot recover the email concession on its own. Deal Ledger therefore concentrates on negotiation, then shows a narrow, traceable handover to Sirion's existing post-signature workflows rather than trying to rebuild the entire lifecycle.

**Where we start:** procurement-led supplier renewals negotiated by email and Word, especially where a business stakeholder speaks to the supplier in parallel and a previous contract or invoice history exists. CloudDesk is the end-to-end demonstration; BrightStaff tests inconsistent clauses and schedules; SwiftShip tests the next expansion case, a new deal arriving as a PDF quote.

**Why Sirion:** Sirion already has contract records, version history, IssueDetection and Redline Agent in Word, playbooks, approvals and post-signature obligations. Deal Ledger extends that installed workflow with a new source of truth: **what this supplier agreed in this negotiation**, not another generic drafting assistant. Sirion describes its existing playbook-led negotiation and redlining on its [contract negotiation page](https://www.sirion.ai/platform/create/contract-negotiation/).

## 2. Stakeholder map: whose incentives collide?

| Stakeholder | What they want / how they are measured | Where the conflict occurs | What Deal Ledger gives them |
| --- | --- | --- | --- |
| **Ananya Rao · Procurement / deal owner** | Negotiated savings captured in the signed contract; on-time close; controlled renewals | She owns the deal but cannot see every supplier side thread or reread six Word versions | A priced, editable ledger; evidence-linked differences; one signing check |
| **Vikram Shah · IT / business owner** | Go-live date, service uptime, no supplier friction | He may concede a commercial term to keep delivery moving without knowing the approval threshold | One timely warning at Send; an editable supplier-safe reply; a route to Ananya |
| **Neha Kapoor · Finance / CFO approver** | Protected cash, valid approval for the ₹1.8 crore three-year commitment, invoices matching the contract | She approves conditions before signing but learns of drift only through exceptions | Approval dependency on the ledger, routed concessions and clause-backed invoice traceability |
| **Arjun · Legal** | Defensible liability and notice language, few unnecessary escalations, quick turnaround | Legal checks compliance of a particular version, not a separate commercial promise in email | Playbook and deal-specific gaps side by side; Legal-owned exceptions routed to Legal |
| **IT / Microsoft 365 and Sirion admin** | Limited permissions, predictable deployment, auditability and adoption | Wider mailbox visibility would improve recall but reduce employee trust | Scoped add-in deployment, narrow consent, header-first linking, transparent off-ramps |
| **Rohan / Priya · CloudDesk supplier team** | Close this quarter, preserve flexibility, avoid repeated revisions | Rohan may concede in email while the final Word copy is prepared from Priya's template | No new supplier tool: clear ordinary emails, Word tracked changes and fewer ambiguous rounds |

<!-- component:stakeholder-map -->

**The relationship map:** Procurement owns the commercial position; the supplier talks to Procurement, the business owner, Finance and Legal. The **dashed direct line between Vikram and Rohan** is crucial: it shows why a concession can be made without reaching the deal owner. This is an incentive problem, not proof that either party acted in bad faith.

**Five conflicts the experience must handle:**

1. **Speed versus protection.** Vikram needs the implementation unblocked; Ananya needs the original service-credit concession preserved. The Send check presents the cost and routes the issue without stopping his work by default.
2. **Policy versus the actual deal.** Legal accepts 45-day payment; Procurement negotiated 60 days conditional on a three-year term. Word must flag the missing negotiated benefit even when the clause passes the playbook.
3. **Authority versus conversation.** A business-owner email can sound like acceptance despite no commercial mandate. The ledger records who said it and which approval is still needed; copying Procurement is not treated as approval.
4. **Visibility versus privacy.** Supplier conversations contain evidence, but broad mailbox surveillance is unacceptable. Read only opted-in, live-deal supplier threads in connected mailboxes, beginning with headers.
5. **Signing versus downstream accountability.** Finance pays for a clause it may never have negotiated. Carry the signed clause, email source and approval into an invoice exception, not merely a generic alert.

## 3. The problem: the signed document forgets the conversation

**Problem statement:** What the company agrees and what the company signs can be two different things, and a standard playbook review does not prove they are the same.

Three recurrent failures illustrate the gap:

- **The quiet reversion.** Rohan's round-4 email says pricing will be fixed, while the file may still carry an annual revision. The attachment also quietly moves CloudDesk's renewal notice in §14.2 from 30 to 90 days, making Meridian's decision deadline 60 days earlier. The text of the email and the contents of the attachment require separate checks.
- **The unrecorded side concession.** Vikram and Rohan discuss a 10% versus a 5% service credit. “Fine with that” could refer to either. It must remain **needs confirming**, not be guessed into “agreed.” A later reply from Rohan can become the actual source of agreement.
- **The contract that contradicts itself.** BrightStaff's clause 6 says 8%, while the signed Schedule 2 rate card says 10%. The invoice follows the schedule. This is an internal signed-document conflict that needs an owner, not an automatic supplier accusation.

**Why this is material, and what is evidence rather than an assumption.** WorldCC and Deloitte's 2023 research found average contract value erosion of **8.6%**, across the contract lifecycle: an industry-wide estimate, not a Meridian result. WorldCC's *Closing the Procurement Value Gap* research with Ironclad, published in **2026**, puts cumulative leakage at about **11%**, including missed negotiation savings, unrecorded changes and poor renewal planning. These are distinct studies and should not be added together. A {{keep:19 October 2026}} Harvey article also explicitly discusses emails and side promises not reaching the executed agreement. None of these publications proves that Deal Ledger's specific product will work; the prototype and the pilot must test that claim.

**A falsifiable first-week diagnostic:** Audit 20 historical supplier contracts, reconstruct the supplier-side negotiated positions from available correspondence and compare them with executed documents. Count (a) positions missing despite passing the playbook, (b) renewals without documented review and (c) invoice exceptions traceable to such gaps. The hypothesis is **one to three omitted positions per contract**, with at least some carrying financial value; it is not an observed Meridian fact. If the count is close to zero, our proposed differentiation is weak.

### The financial problem, on the live CloudDesk round

CloudDesk is a **₹60 lakh annual / three-year / ₹1.8 crore committed** software renewal. At the live-round state shown on Home before Rohan's round-4 email, the prototype's annual expected exposure is **₹4.4 lakh if signed as is**: approximately **₹3.9 lakh** from possible annual price revision and **₹50,000** from the service-credit difference. These are *expected, modelled exposures on a specific draft and ledger state*, not realised losses, invoice overpayments or credits already due. A later version can have a different set of gaps and a different total; the amount is always recalculated and labelled by **version, scope and as-of time**.

### The dashboard is part of the evidence

The live dashboard on [Home](/#workspace) keeps its visuals and their distinct denominators:

- **Signing-quality north-star trend:** **50% ({{keep:Jan–Mar 2026}}) → 58% (Apr–Jun) → 65% (Jul–Sep)**. The latest point is **13 of 20 audited contracts** signed with no agreed term missing; three newer contracts await audit. These are illustrative demo numbers, obtained by independent correspondence audit, not by the product grading itself.
- **Where agreement actually happens:** **42% of 214 negotiated terms** in the last six months were agreed **outside the formal contract document** (supplier email, side threads and calls).
- **Value at risk, open portfolio:** **₹20.3 lakh a year** across **12 open deals**, with **₹4.4 lakh** attributed to the live CloudDesk snapshot and **₹15.9 lakh** to the other 11, shown with the **“If signed as is, by open deal” top-eight bar chart**. This is an expected annual average, not a cash loss; a one-time renewal exposure is annualised over the contract term and its full one-time exposure is shown too.

## 4. Working prototype: one deal, five connected moments, one downstream proof

**Journey:** Ananya's Outlook → Ananya's side-thread review → Vikram's Outlook Send → Word signing-copy check → Sirion handover → Finance's invoice exception. Every time the state changes, the same ledger drives the deal page, the add-ins, the portfolio figures and AskSirion.

| Cross-person handoff | What crosses the boundary |
| --- | --- |
| Vikram's supplier side thread → Ananya | The exact statement, ambiguity flag and service-credit ledger row |
| Vikram presses Send → Ananya | An edited reply, a procurement handoff or a logged unapproved concession |
| Ananya's emails → Word | A verified agreed position becomes a proposed tracked change |
| Reviewed Word version → Sirion | The actual executed terms become owner-linked obligations and invoice rules |
| Signed clause → Neha in Finance | An invoice variance is explained through the precise clause and earlier evidence |

### A. Supplier round lands: Ananya, Outlook, 14 November

Rohan emails CloudDesk MSA v4. Sirion's existing Outlook add-in identifies the contract and can sync the attachment as the next counterparty version. **New:** Deal Ledger separately reads the supplier email, proposes typed commercial terms with **exact quotations**, and checks every quotation against the permitted original message before using it. The round card distinguishes **“What the email says,” “What the attached document changed” and “What remains open.”** It flags the untracked §14.2 notice-period change and surfaces the apparent fixed-pricing commitment. Each position retains the sender, timestamp, quote, source, confidence and any condition.

**Respond to round** prepares a reply and a tracked v5. The reply acknowledges resolved terms, specifies the changes requested and explicitly says the service credit remains open. A human reviews and sends it. A proposed edit is **not** recorded as supplier-accepted merely because it appears in Meridian's outgoing v5.

### B. Side thread appears: Ananya, Outlook, 16 November

A supplier-domain thread involving Vikram may belong to the CloudDesk deal. Candidate matching uses **headers only**: sender/recipient domain, participants, subject/thread identifiers and the known deal. Where the live supplier round explicitly names the colleague and the supplier domain matches, the candidate can be linked **automatically with visible Undo**; otherwise the owner must confirm. Body text is not read before a thread is linked. Ananya can unlink it later, removing its derived quotations and logging the change.

Once linked, Deal Ledger displays the 10% and 5% service-credit positions side by side. It does not resolve the ambiguous phrase “fine with that” on its own. The term remains **needs confirming** and the product drafts one precise supplier question. The response, when received, becomes the auditable source.

### C. A business-owner reply is checked: Vikram, Outlook, 18 November

Vikram is replying directly to Rohan. He need not open Sirion or a separate dashboard. The Send check compares recipients, draft text and attachment names against the *current* ledger. It looks for a reply that reopens an agreed term, gives away an open term, settles something still needing confirmation, or attaches an obsolete version. Internal-only messages are **never checked**.

One consolidated alert points to the exact sentence, a modelled annual cost and the approval at risk. Vikram can choose **Loop in Procurement**, **Edit reply** (insert a supplier-safe alternative for his review), or **Send anyway** with a reason. That last choice sends the email, records a reopened/conceded status and notifies Ananya; it **does not mean that Finance or Legal approved it**. A clean reply may show **“Checked against ledger ✓.”**

In a production Outlook add-in, the non-blocking warning is designed around the Smart Alerts **prompt-user** behaviour, where Send Anyway is possible; the demo uses deterministic rules. If the add-in is missing, the user is not signed in, or the check cannot finish within its short target (~3 seconds), the experience fails open and visibly says **“Not checked”** rather than implying protection. Actual client-timeout and send behaviour must follow Microsoft's platform constraints.

### D. Check the signing copy: Ananya, Word, 19 November

The supplier returns a clean v6. Sirion for Word already checks against **company policy** with IssueDetection and Redline Agent. **Deal Ledger adds a second, deal-specific check** against the email ledger. The Word pane keeps the familiar **contract record → Review → Approve → Publish** structure and marks blocks **Today in Sirion** or **New · Deal Ledger**.

**One Review list** merges playbook issues and email-agreement discrepancies, prioritised by expected annual cost and approval criticality. Each finding card shows (1) the agreed term and its verified source quote, date and person; (2) the draft's clause and word-level change; (3) condition/dependency status; (4) expected **₹ per year if signed as is**, with confidence and two lines of calculation; (5) the playbook **preferred / fallback / walk-away** ladder; and (6) four actions: **Insert agreed wording**, **Ask supplier**, **Accept theirs** (routed for approval), or **Reading is wrong** (correct the ledger with an audit entry). Peer outcomes are an **internal reference only**, not the source of the monetary headline.

**The hero gap, payment clause §9.3:**

> **Company playbook:** 45 days is permitted. **Deal agreement:** Rohan agreed to **60 days**, conditional on a **three-year term**. **Draft:** §9.3 says **45 days**. **Condition check:** §3.1 does give three years. **Result:** The draft passes policy but loses 15 days of working capital. The illustrative model estimates approximately **₹25,000 a year**, subject to the configured financing rate.

**Insert agreed wording** creates a visible tracked change, **45 → 60**, in Word with a supplier-safe comment. The state progresses in three distinct events: **proposed in Word → saved to Sirion as v7 → accepted by supplier**. Only an actual supplier acceptance closes the third step. A re-saved or stripped Word document can be matched by Sirion tag, then clause similarity with stored versions, then a manual contract selection. Saving in Word alone must not silently create a new Sirion version.

**Publish/signing gate:** Re-read the precise final file and compare it with every *agreed* term and approval dependency. A missing position cannot be published silently. The owner must fix it or record a reason and named approver, with the decision logged. A warning at Send is non-blocking; the **Publish gate is a separate, stronger control**. Never claim an unapproved waiver is approved.

### E. Handover: Sirion, 21 November

Before activation, compare the signed copy with reviewed v7. Then take only **signed** commitments into Sirion's existing obligations, Calendar and invoice-rule workflows: notice period, actual expiry and renewal decision dates; signed prices/escalators; payment rules; service-level credit definitions. Every obligation has **an owner, a due date, a clause reference and a link to the negotiation evidence**. If the deadline falls on a weekend, display both the contractual date and the adjusted working-day reminder. A notices clause such as “received next working day” goes to Legal to confirm; Deal Ledger does not silently interpret it as a settled legal determination.

### F. Prove the chain on an invoice: Neha, Finance

At the later December 2027 invoice event, the CloudDesk discrepancy of **₹32,000** is explained in one trace: **invoice line → signed clause → email position and approval trail**. It is not labelled an automatic financial recovery. BrightStaff provides a second path: **clause 6 = 8%**, **Schedule 2 = 10%**, and the invoice follows Schedule 2. Because two signed sections conflict, route it to the contract owner for interpretation before raising a supplier dispute. SwiftShip remains the next expansion flow (new email/PDF quote) rather than distracting from the CloudDesk renewal.

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

## 5. Success metrics: did the signed contract actually get better?

### North star

**Share of independently audited signed contracts in which *every supplier term truly agreed during negotiation is present in the executed copy*.** Report authorised waivers as a **separate** measure rather than counting them as a flawless signing outcome. An independent reviewer reconstructs the agreed positions from original source evidence, then checks the signed document. The illustrated **65% / 13 of 20** and its **50% → 58% → 65%** historical trend are on Home, tagged **demo data**.

### The decisive differentiation test

**Of all material discrepancies independently confirmed, what percentage passed Sirion's normal company playbook review yet contradicted a supplier-specific agreed position?** If few real catches fall in this category, Deal Ledger should become a smaller feature inside IssueDetection rather than a separate product.

**Pilot:** Re-run the **same 20 already-signed historical deals** through (a) normal Sirion review and (b) Sirion + Deal Ledger. Have a reviewer blind to the tool's output adjudicate what is a material catch and what is noise. Use the same access scope and case mix. Separately measure time impact on live deals; a historical replay alone cannot establish behavioural benefit.

### Supporting measures

- **Coverage:** share of negotiated terms with verified source evidence, by email, side thread and call note. Count inaccessible/unlinked conversations separately; a low false-positive rate is meaningless if the tool reads little.
- **Material findings:** confirmed meaningful missing positions per deal, especially those missed by existing playbook checks.
- **At Send:** share of risky proposed replies edited or routed to an authorised owner, versus sent anyway with a logged exception; report warning usefulness.
- **Speed:** minutes added to Word review; days from the last supplier round to signature; time to resolve an ambiguous term.
- **After signature:** share of invoice variances traced to an exact signed clause and source within one working day.
- **Money:** expected ₹ protected **with source assumptions**, separately from any later independently verified realised savings.

### Guardrails and decisions to reverse course

- **False “agreed” labels:** proposed target **below 2% of labelled terms**. A model that confidently invents agreement is unsafe even if it catches many deviations.
- **Extra reviewer minutes:** compare against normal Sirion. Do not add time without extra independently confirmed material catches.
- **Ambiguity at signing:** track unresolved or manually confirmed rows. Do not make uncertainty disappear into a fabricated agreement.
- **Deployment coverage:** if fewer than half of relevant supplier mailboxes can be connected in the pilot, narrow the offer to the owner-selected-thread and final-signing-copy check.
- **Decision rules:** rethink or fold into IssueDetection if almost all catches are already in the playbook; pause automation if false agreement exceeds 2%; stop expanding if review/signing time increases without meaningful gains; test meeting/transcript ingestion if email is not where deals are actually concluded.

<!-- collapse:Sources and scope of claims -->

- **The assignment's requirements:** one lifecycle stage, clear primary users, stated assumptions, a working multi-person journey and five case sections **inside** the prototype; no separate slide deck is required.
- **Sirion's documented current capabilities:** [contract negotiation](https://www.sirion.ai/platform/create/contract-negotiation/) and [the Sirion plug-in use cases](https://www.sirion.ai/sirion-university/contracting-use-cases/create/plug-in/). Labels such as **Today in Sirion** refer to these published platform capabilities; any exact demo-specific screen should still be treated as a representation.
- **WorldCC/Deloitte (2023), 8.6%:** [Deloitte's contract management lifecycle insights](https://www.deloitte.com/us/en/services/tax/articles/contract-management-lifecycle-insights.html). This is lifecycle-wide industry research, **not** the CloudDesk estimate.
- **WorldCC/Ironclad (2026), 11%:** [Closing the Procurement Value Gap](https://info.worldcc.com/closing-the-procurement-value-gap). A different lifecycle-wide industry finding, not additive to 8.6%.
- **Harvey, {{keep:19 October 2026}}:** [the entire-agreement clause article](https://www.harvey.ai/blog/entire-agreement-clause). Evidence that side communications and the signed instrument can diverge; not evidence that every competitor lacks this feature.
- **Dottr's related email-native workflow:** [Dottr's media page](https://www.dottr.ai/media). Email-sourced drafting and review exist; the proposed differentiation is a persistent, audited agreement ledger, side-thread ambiguity handling, Send-time check and signing/handover verification.
- **Microsoft Smart Alerts developer guidance:** [OnMessageSend and OnAppointmentSend events](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/onmessagesend-onappointmentsend-events). Do not describe every send mode as an unconditional free-send option; send-mode and client behaviour matter.

<!-- /collapse -->
