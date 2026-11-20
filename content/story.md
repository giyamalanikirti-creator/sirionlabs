# About this case

*Student project for the Sirion ISB assignment.*

Deal Ledger keeps one source-linked record of what has actually been agreed with a supplier, across email threads, side threads and Word versions. It estimates the financial impact of pricing, payment, credits and renewal discrepancies, warns people in Outlook before they concede an agreed term by email, checks the signing copy against what was agreed, and hands the agreed terms to Sirion's tracking agents after signing.

## 1. Why this stage

We chose negotiation because it is where the money terms are set. All three results in the brief, unreviewed auto-renewals, missed service levels and invoices that don't match, trace back to what was agreed and whether it made it into the contract. Intake comes before any terms exist, and a repository can only track what was written down. If an agreed term never reaches the signing copy, no tracking agent can enforce it later.

The assignment brief reports a product-lead observation about agreements getting lost between negotiation and signing. The industry sources below provide context. CloudDesk and its records are illustrative.

## 2. The problem

### The problem statement

By the time a supplier contract is signed, nobody can say with confidence what was agreed. The terms live in a dozen places: the latest Word draft, a sentence in an email, a side thread the business owner had with the account manager, a call nobody wrote down. The signing copy is checked by reading it, which means checking it against memory rather than against a record.

### How negotiation actually happens

A mid-value supplier renewal at a 3,000-person company does not run in a contract workspace. It runs like this:

- The supplier sends a draft. Procurement marks it up and sends it back.
- Two or three terms get settled **in the email body**, not in the document. "OK on 60 days if you sign for 3 years" is an agreement; it is never a tracked change.
- The business owner has a **separate thread** with the same account manager about something else entirely — an outage, a support ticket — and concedes something in passing.
- Finance and Legal approve by email, often conditionally: "approved, provided the price is fixed for the term."
- A clean signing copy arrives with a covering note saying every change has been accepted.

Four things go wrong, and they compound:

1. **The record is the inbox.** There is no single place that says what is agreed, so the answer depends on who you ask.
2. **Side threads are invisible.** The person who makes a concession is often not the person who owns the commercial terms.
3. **Nothing is priced.** "90 days' notice instead of 30" sounds administrative. It is not.
4. **The signing copy is checked against memory.** A clause that quietly moved back is very hard to spot in a 20-page document, especially when the change was never declared as a tracked change.

### Evidence

- A Sirion product lead (cited by role in the brief) makes the point that most negotiation still happens over email and in Word, outside any contract system.
- Sirion's own March 2026 article on negotiating over email and Word describes the same pattern.
- WorldCC puts the value lost to poor contracting at **almost 9% of contract value**.
- The CCM Institute / Sirion *Most Negotiated Terms 2026* work finds **16%** — we use that figure for **active terms that need ongoing management** (price, service levels, renewals), not as a claim about side threads.

> A note on our own numbers: every ₹ figure in this prototype is computed from Meridian Foods' own invoices, renewals and uptime records. None of the four figures above is used in any calculation. They explain why the problem matters; they do not price anything.

## 3. Stakeholder map

| Who | What they want | Where they clash |
| --- | --- | --- |
| **Procurement lead** (Ananya Rao) | One defensible record of what was agreed, and a signed copy that matches it | Does not see the business owner's side threads |
| **Business owner / Head of IT** (Vikram Shah) | The service working, and the supplier relationship staying easy | Will trade a commercial term to keep a technical conversation moving |
| **CFO** (Neha Kapoor) | Spend inside the approved envelope, on the conditions she approved | Approves a commitment conditionally, then never sees whether the condition held |
| **Legal** (Arjun Mehta) | Liability, data protection and termination to standard | Reviews a draft at one point in time; later drafts move without them |
| **Supplier** (CloudDesk) | The best terms they can get, signed quickly | Every ambiguity resolves in their favour by default |

The clash that costs the most is between the lead and the business owner: the lead owns the commercial position, the business owner has the day-to-day relationship, and the supplier talks to both.

## 4. Journey and pain points

| Stage | What happens | Where it hurts |
| --- | --- | --- |
| 1. Renewal approaches | A reminder fires, or nobody notices | Short notice removes all leverage |
| 2. Positions set | Internal asks agreed, approvals sought | Approvals arrive by email, with conditions attached |
| 3. Rounds | Drafts and emails go back and forth | Terms settle in email text that no document records |
| 4. Side conversations | The business owner talks to the supplier | Concessions are made by people who do not own the term |
| 5. Signing copy | A clean copy arrives, "all changes accepted" | Checked against memory; quiet edits survive |
| 6. After signing | Obligations and invoices | Nothing to enforce against except the clause, and no history behind it |

**Pain, ranked by what it costs us**

1. **An agreed term missing from the signed copy.** This is the one that converts straight into money, every year of the term.
2. **A concession made in a side thread.** Cheap to make, expensive to undo, and nobody with the commercial position in their head is in the room.
3. **A renewal notice that quietly lengthens.** Looks administrative, raises the chance of an unreviewed auto-renewal.
4. **An invoice that does not match the agreed price.** Caught late, disputed from memory.
5. **Time lost reconstructing what was agreed.** Not a line item, but it is where the week goes.

## 5. How it works

Four capabilities, plus the handover.

**1. Read the round.** When a supplier email arrives, the reader proposes updates to a ledger of terms. It returns typed values through a forced tool call — `{ kind: 'payment', days: 45 }` — and an exact quote from the message. A quote that cannot be found in the source is dropped before anything is written. Attached drafts are diffed against the last version *we* sent, not against the supplier's own previous draft, because that is the comparison that shows what moved away from us.

**2. Pull in side threads.** Threads are matched to a deal from **headers only** — sender and recipient domains, subject, attachment fingerprints, a hidden deal ID in the file, and whether the thread was copied to `deals@`. A strong match is read. A weak match is shown to the lead with its signals, and nothing in it is read until the lead links it. Threads that match nothing are never opened at all.

**3. Warn at Send.** When someone replies to a supplier on an active deal, the draft is checked against the ledger before it leaves. If it concedes a term that is already agreed, a Smart Alert shows what was agreed, where it was agreed, who approved it, and what the change would cost per year. Three buttons: loop in procurement, don't send, or send anyway. Sending anyway is allowed — it reopens the row and tells the lead.

**4. Check the signing copy.** Every row is compared with the corresponding clause in the signing copy, and each difference is priced and sorted by rupees. "Insert agreed wording" puts the agreed sentence in as a tracked change with a supplier-safe note attached. Nothing is sent to the supplier automatically.

**The handover.** On signing, the agreed terms become obligations and invoice rules in the Sirion contract record. Each one links to its clause **and** to its ledger row, so the email history travels with it. When an invoice later comes in above the agreed price, the flag cites the signed clause and the email behind it.

**Autonomy.** Deal Ledger acts on internal records (the ledger, Sirion obligations) but never on the supplier: a person always decides and sends.

## 6. What Sirion has, and what we add

| Sirion already has | What Deal Ledger adds |
| --- | --- |
| A contract repository and structured obligations | A record of what was agreed **before** there is a contract to store |
| A negotiation workspace for deals Legal runs | Capture for the deals that never enter it, because they live in email |
| Clause libraries and playbooks | A Word add-in that checks the signing copy against *this deal's* agreed state, not just against the playbook |
| Obligation and invoice agents after signing | The agreed terms, source-linked, handed to those agents at signing |
| Analytics on signed contracts | A ₹ figure on each term **while it is still negotiable** |

> Sirion's negotiation workspace is the right home for deals that Legal runs. But at a 3,000-person company, most mid-value supplier deals, and almost every business-owner side thread, stay in email. Deal Ledger doesn't ask anyone to change tools. It brings those deals into the same Sirion record from where they already happen.

## 7. Competitors

> Others do parts of this: Dottr pulls agreed terms from email, Luminance keeps negotiation history, and Harvey spots hidden edits. We found no one who combines all four: capturing side threads, warning at the moment of Send, checking the signing copy against what was agreed, and handing those terms to post-signing agents.

## 8. How the ₹ figures work

Every figure is an **expected ₹ a year, averaged over the term**, computed from Meridian Foods' own data. The model never returns a number. Exposure — the worst case, rather than the expected case — is shown as secondary grey text, so the two are never confused.

**Price.** Expected yearly rise `r`: an open yearly revision uses the mean observed rise across our own software contracts that allow one; a capped rise uses `min(0.92 × cap, r_open)`, where 0.92 is how much of a stated cap our suppliers have actually taken. Year `k` cost is `fee × ((1 + r)^(k − fromYear + 1) − 1)`.

> 9 of your software contracts allow a yearly price revision. Their prices rose 6.4% a year on average (invoices, 2024–26). On ₹60 lakh, that is ₹3.8 lakh in year 2 and ₹7.9 lakh in year 3: ₹3.9 lakh a year averaged over the 3-year term.

**Renewal notice.** `pSlip(group)` is the share of our past renewals in that notice window that went through without a review. The cost is `(pSlip(to) − pSlip(from)) × unused share × fee`.

> With 60–90 days' notice, 5 of your 12 past renewals went through without a review. With 30 days, 1 of 10 did. Unreviewed renewals carried 18% unused seats on average. (5/12 − 1/10) × 18% × ₹60 lakh = ₹3.4 lakh expected at the next renewal.

**Payment terms.** `(fromDays − toDays) / 365 × fee × cost of money`, using Finance's own 10%.

> Paying 15 days sooner on ₹60 lakh a year, at Finance's 10% cost of money: 15 ÷ 365 × ₹60 lakh × 10% ≈ ₹25,000 a year.

**Service credits.** `(fromPct − toPct) / 100 × (fee / 12) × months missed in the last 12`.

> CloudDesk missed 99.5% uptime in 2 of the last 12 months. The gap between a 10% and a 5% credit on a ₹5 lakh monthly fee, twice a year, is ₹50,000 a year.

**Terms with no ₹ figure.** The length of the term, the liability cap and exit support carry no yearly figure. The term shows the commitment instead (₹1.8 crore over three years); the others say "No ₹ figure" and are owned by Legal. A notice window we have no history for (31–59 days) returns "Not enough history" rather than a guess.

Every figure carries its confidence, its sample size and the sentences above, one hover away.

## 9. Architecture, and prototype versus real product

Four layers:

1. **Capture** — Outlook add-in and a `deals@` capture mailbox. Header-first matching decides what may be read.
2. **Reason** — a server-side model with forced tool use returns typed values and exact quotes. A state machine, not the model, decides what the ledger says.
3. **Price** — pure functions over our own invoices, renewals and uptime records. No model input.
4. **Hand over** — obligations, invoice rules and documents into the Sirion contract record.

| In the real product | In this prototype |
| --- | --- |
| A real Office add-in, Smart Alerts through `onMessageSend`, a custom XML part carrying the deal ID | Outlook and Word are mocked faithfully in Fluent UI; the deal ID is a field on the attachment |
| Microsoft Graph for mail and files | Scripted messages and structured versions in `data/` |
| Real `.docx` parsing | Versions are structured JSON with the real clause patterns |
| Sirion APIs, Obligations and Invoice agents | A mock contract record built by the same handover function |
| SSO and multi-user sync | A role switcher, a mailbox switcher and `localStorage` |

The engines, the state machine, the matcher, the pricing and the signing check are all real code with tests. What is mocked is the plumbing around them.

## 10. Data and privacy

- **Our own data only.** Every ₹ figure comes from Meridian Foods' invoices, renewals and uptime records. No supplier claim and no market benchmark enters a calculation.
- **Header-first reading.** The matcher's only input is an email header. It has no parameter through which a body could reach it. Bodies go to the reader for strong matches, or after the lead links a weak one. The personal threads (the offsite plan and laptop quotes) score zero and are never opened; the API refuses them outright.
- **Internal mail is read only if copied to `deals@`.** That is a deliberate, visible opt-in rather than blanket access to the mailbox.
- **Supplier-safe output.** Anything the supplier could see — inserted clause text, Word comments, drafts — is checked for ₹ figures, the words lakh and crore, internal names, approvals and limits. Tests enforce it.
- **Nothing is sent automatically.** Every email and every tracked change is sent by a person.
- **No training on customer data.** The model reads a message to answer one question and returns a typed result.

## 11. Success metrics

**North star.** The share of audited signed contracts with every agreed term reflected. Reviewers sample signed contracts and independently compare them with the underlying correspondence, so a missed extraction can count as a failure. Report authorised waivers separately.

**Signals**

- ₹ of concessions avoided at Send
- Time from the final supplier email to a complete Sirion record
- Reader accuracy on the 32-item test set
- Share of rated warnings reviewers judge actionable
- Invoice disputes settled from the source rather than from memory

**Guardrail.** Days from the final supplier email to signature. If checking the copy slows deals down, it is not worth having.

**Rethink if**

- Reviewers judge few warnings actionable. Compare their feedback with override rates to distinguish noisy warnings from deliberate commercial decisions.
- More than 3 rows per deal need confirming — we are pushing our uncertainty onto people
- Reader accuracy stays low — the capture is not trustworthy enough to build on
- Negotiations get slower

## 12. What we are not building, and why

| Not building | Why |
| --- | --- |
| Automatic replies to suppliers | A concession is a commercial decision. A person sends every email. |
| A clause library or playbook engine | Sirion has one. We check against *this deal's* agreed state, which is the gap. |
| Contract drafting or generation | The supplier's paper is the starting point for these deals. |
| A new place to negotiate | Asking people to move tools is exactly why the problem exists. |
| Scoring or ranking suppliers | Out of scope, and it would invite gaming. |
| Reading every internal email | Internal mail is read only when copied to `deals@`. The privacy cost is not worth the coverage. |

## 13. Assumptions

- Meridian Foods has at least ~20 past software contracts with invoice history. Below that the price figure is marked low-confidence rather than shown as fact.
- Finance will state a cost of money. We use 10% and make it a setting.
- The supplier's drafts keep a hidden deal ID once we have added one — true of custom XML parts in practice, and the reason it is one signal among five rather than the only one.
- The procurement lead will confirm an ambiguous acceptance within a day or so. If that is wrong, rows pile up in "needs confirmation", which is exactly the guardrail we watch.
- Business owners will not stop having side threads. The design assumes they continue.

## Sources

- Smart Alerts behaviour, button labels and the 500-character limit on `errorMessage`: Microsoft Learn, `SmartAlertsEventCompletedOptions` and the `onMessageSend` event documentation.
- Task pane default widths (320 px in Outlook on the web, 330 px in Word): Microsoft Learn, Office.TaskPane and task-pane design guidance.
- Fluent UI React v9 setup and theming: Fluent 2 design system documentation.
- Sirion platform capabilities and collaboration features: sirion.ai product pages.
- WorldCC on value lost to poor contracting; CCM Institute / Sirion, *Most Negotiated Terms 2026*; Sirion's March 2026 article on negotiating over email and Word — as cited in the product brief.
- Product brief: "Sirion Deal Ledger: problem, solution and architecture" (19 Nov 2026), with the corrections recorded in §0 of the build spec.
