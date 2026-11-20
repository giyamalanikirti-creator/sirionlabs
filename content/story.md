# About this case

Can Ananya sign CloudDesk’s renewal knowing it still contains the terms she agreed?

## 1. Why negotiation

Price, payment, renewal notice and service credits are settled before a contract is signed. Once a term is missing from the signed copy, reminders and invoice checks can only enforce what the document says. A Sirion product lead we spoke to described negotiations moving between email and Word. Sirion describes the same workflow in its article on contract negotiation. [Sirion’s article on Word and email negotiations](https://www.sirion.ai/library/contract-insights/contract-negotiation-software-vs-email/)

## 2. The problem

A supplier can confirm one term in email and change another in the attachment. CloudDesk confirmed fixed pricing but moved renewal notice from 30 to 90 days, which means Meridian must decide 60 days earlier. In a separate thread, the supplier’s “fine with that” could refer to either a 10% or 5% service credit.

WorldCC research estimates that businesses lose almost 9% of value through poor contract management. The CloudDesk figures use the case’s invoice and renewal history. [WorldCC’s contract management whitepaper](https://info.worldcc.com/contract-management-aug-2025)

## 3. Stakeholder map

| Who | What they need |
| --- | --- |
| Ananya · Procurement | Track what was agreed and protect the negotiated terms through signature. |
| Vikram · IT | Keep the supplier relationship moving while protecting the commercial terms. |
| Neha · Finance | See that the three-year commitment only proceeds with fixed pricing. |
| Arjun · Legal | See that later drafts retain the liability language Legal reviewed. |
| Rohan · CloudDesk | Reach a decision and retain flexibility as hosting costs rise. |

## 4. The walkthrough

1. **Review the supplier round.** Rohan’s v4 is filed in Sirion as round 4 on its own. The round card shows what the email says (price fixed), what the file also changed (14.2 now 90 days, untracked) and what stayed the same (payment). One action, Respond to round, drafts the reply and prepares v5 with tracked changes.
2. **Resolve the side thread.** The side thread links itself (same supplier domain, and Rohan names Vikram), with Undo. When “fine with that” could mean two offers, the clarifying question is already drafted in the supplier thread, and Rohan’s answer becomes the source.
3. **Check a reply.** The same deal, seen from Vikram’s inbox. He sees what his reply would reopen, who approved the original deal, and what the change could cost.
4. **Verify the signing copy.** The check runs when the clean copy arrives. Each gap offers the agreed wording, the playbook fallback or the walk-away, each priced.
5. **See the handover.** One screen turns signed terms into obligations and invoice checks. The December invoice is ₹32,000 above the signed price.

Two more suppliers show other patterns: BrightStaff (a rate card table that disagrees with the email, then a timesheet invoice that overbills) and SwiftShip (a new deal started from an email, with the terms read from a PDF quote).

## 5. Success measures

**North star:** The share of audited signed contracts with every agreed term reflected in the signed copy. Reviewers compare a sample with the original correspondence and report authorised waivers separately.

Also track days from the final supplier email to signature and the share of rated warnings reviewers found useful. Revisit the workflow if signing takes longer, too many rows need human confirmation, or warnings rarely help people make a decision.

<!-- technical-appendix -->

### How it works

The reader proposes terms with exact quotations. Deal Ledger checks those quotations against the message before using them. Thread matching uses headers only; a thread from the supplier's own domain that the round names is linked automatically, with Undo, and anything weaker needs a person. The send check compares drafts with the current ledger. Word compares clauses with agreed positions and rechecks the returned copy.

**The full ledger.** Each deal has a ledger page in Sirion: every term with its status (agreed, open, reopened, conceded, needs confirming), the source line (email, version or call), who agreed it, the approval that depends on it, the reader's confidence, and a change history across all terms. Any row can be corrected, and the edit is logged. Terms agreed on a call are added with the call note as the source; Teams meeting transcripts are the next source. Concessions (Accept theirs, Send anyway, a walk-away, a waived gap) are routed for approval by value: the CFO at ₹1 lakh a year or more, Legal for Legal-owned terms.

**In Word.** Sirion's Word add-in checks a draft against the company playbook. Deal Ledger adds a second check against what was actually agreed with this supplier in email, and puts an expected ₹-a-year figure on every clause that differs, with the working shown and, as a cross-check, what other companies saw when they accepted the same term. The pane keeps Sirion's structure (contract record, review, approve and publish) and marks each block as Sirion today or new. One Review list merges playbook issues and agreed-in-email differences, sorted by ₹. Each card shows the agreed value with its exact source, the draft's wording as a word-level change, the expected cost with its confidence, two lines of working, the playbook ladder, and four actions: insert the agreed wording, ask the supplier, accept the change (routed for approval) or flag that the reading is wrong. Publish runs the signing check first, so a copy with an agreed term missing cannot be published without a reason and an approver.

**Privacy.** Only connected mailboxes are read, and only threads on a live deal's supplier domain. Internal-only email is never read or checked. Email bodies are not stored; only the quoted line is kept. Business owners see agreed terms and the ₹ figure in a warning, not the cost workings.

**What is Sirion today and what is new.** Each block in the Outlook pane is marked. Sirion's plugin already matches the deal, files the attachment as the next version, shows an IssueDetection playbook summary, sends for review or approval and opens the draft in Word; its Word add-in shows Redline Agent suggestions with preferred, fallback and walk-away positions. Deal Ledger adds the email side: what was agreed in the text, the side threads, the check at Send, a ₹ figure on every gap and a recommended move with its leverage.

**The check at Send warns, never blocks.** It runs for anyone at Meridian replying to a supplier with a live deal; internal-only email is never checked. It reads recipients, the body and attachment names, and compares them with the ledger: a reply that reopens an agreed term, gives away an open one, settles a term still being confirmed, or attaches an older version gets one alert with the cost, the approval at risk and the sentence in the draft. The choices are Loop in procurement, Edit reply (a supplier-safe rewrite goes in place) or Send anyway with a one-tap reason, which marks the term reopened and tells procurement. A reply that matches the ledger sends with “Checked against ledger ✓”. In production this is an Outlook Smart Alerts add-in in the mode that lets the user send anyway; if the user is not signed in or the check takes longer than about three seconds, the email sends as usual. The demo's check is deterministic rules, no model.

### How the financial estimates work

> **Expected cost = how often this kind of term has cost you before × the money it applies to, spread per year over the contract term.**
> Base rates come from your own invoices, renewals and uptime records. The AI only reads which term changed; every ₹ figure is calculated by code.

- **Pricing:** Average the projected additional fees over the contract term. Expected increases come from comparable invoices.
- **Renewal notice:** Estimate the cost of an unreviewed renewal using historical rates and unused seats. Divide this one-time estimate by the contract length for the annual headline. Show the full renewal exposure separately. Every screen uses the same headline, “₹X a year if signed as is”, and each row's share adds up to it.
- **Payment:** Estimate the financing cost of paying earlier.
- **Service credit:** Use the agreed credit difference and the number of affected months in the uptime history.

### Related work

Sirion offers a negotiation workspace with Word support. Dottr describes drafting agreements from terms shared in an email thread and reviewing the result. Deal Ledger focuses on linking ambiguous side conversations, checking replies before send, and verifying the signed terms before handover.

- [Sirion’s contract negotiation platform](https://www.sirion.ai/platform/create/contract-negotiation/)
- [Dottr’s email negotiation walkthrough](https://www.dottr.ai/media)

### What other companies saw (peer benchmarks, sample data)

With customer opt-in ("give to get"), Sirion could show anonymised outcomes from other buyers who accepted the same term: a cross-check on your own history, a fallback where your history is thin, and leverage (where other companies landed when a supplier made the same ask). Your own data stays the primary figure whenever you have at least 8 comparable records, and the headline uses your own data only. Guardrails: a benchmark cell is shown only with at least 5 companies and 20 contracts; aggregates only (median and middle half), with no contract text or company IDs; at least a quarter old and rounded to 0.5 points; category level, with no supplier-named figures, because sharing pricing between companies can raise competition-law questions; and opt-in per company, where only contributors get access. Peer lines are internal and never appear in anything the supplier sees. Every peer figure in this prototype is sample data.
