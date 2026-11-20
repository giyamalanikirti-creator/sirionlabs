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

**What is Sirion today and what is new.** Each block in the Outlook pane is marked. Sirion's plugin already matches the deal, files the attachment as the next version, shows an IssueDetection playbook summary, sends for review or approval and opens the draft in Word; its Word add-in shows Redline Agent suggestions with preferred, fallback and walk-away positions. Deal Ledger adds the email side: what was agreed in the text, the side threads, the check at Send, a ₹ figure on every gap and a recommended move with its leverage.

**The check at Send warns, never blocks.** It runs as an Outlook Smart Alerts add-in on the Send event. If it cannot finish in about three seconds, or the user is not signed in, the email is sent as usual. The user can always choose Send anyway; the choice is logged against the ledger row.

### How the financial estimates work

- **Pricing:** Average the projected additional fees over the contract term. Expected increases come from comparable invoices.
- **Renewal notice:** Estimate the cost of an unreviewed renewal using historical rates and unused seats. Divide this one-time estimate by the contract length for the annual headline. Show the full renewal exposure separately. Every screen uses the same headline, “₹X a year if signed as is”, and each row's share adds up to it.
- **Payment:** Estimate the financing cost of paying earlier.
- **Service credit:** Use the agreed credit difference and the number of affected months in the uptime history.

### Related work

Sirion offers a negotiation workspace with Word support. Dottr describes drafting agreements from terms shared in an email thread and reviewing the result. Deal Ledger focuses on linking ambiguous side conversations, checking replies before send, and verifying the signed terms before handover.

- [Sirion’s contract negotiation platform](https://www.sirion.ai/platform/create/contract-negotiation/)
- [Dottr’s email negotiation walkthrough](https://www.dottr.ai/media)
