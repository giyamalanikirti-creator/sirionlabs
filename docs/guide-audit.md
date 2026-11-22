# Walkthrough guidance audit

Why the demo couldn't be followed from inside the apps, and what changed (walkthrough brief A1).

## How it was checked

A Playwright run (1440 × 900, `DEMO_MODE=cached`, no API key) loads each step's state and then, for every `SCRIPT` action and every quick-path action, records:
- whether the action's `data-tour` target is in the page;
- whether it is visible (laid out, inside its scroll area and not covered);
- whether it carries the coach-mark ring.

The coach mark exposes the action it is serving as a hidden `[data-guide-next]` marker, so the run reads the same `SCRIPT` the rail uses.

Two runs:
- **Jump:** `g` then the step number, then each action in turn.
- **Play-through:** a fresh visit, clicking only what the app highlights, the step-complete card or the in-frame bar.

## Before

| Step | Action | `href` | `data-tour` target | Found | Visible | Highlighted | Cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1a Open Rohan's email | `/outlook/ananya?msg=M8` | `msg-M8` | No | No | No | The target is in another app (the viewer starts on Home). Only the switcher's "Next" dot pointed there. Nothing in the app frame said where to go. |
| 1 | 1b Compare clause 14.2 | `/outlook/ananya?msg=M8` | `compare-14.2` | Yes | Yes | Yes | None |
| 1 | 1c Respond to round | `/outlook/ananya?msg=M8` | `respond-round` | Yes | No | No | The review-fixes C2 rule "go quiet after the first click in step 1" switched the coach mark off. Opening Compare also pushed the button below the fold of the pane. |
| 1 | 1d Send the reply with v5 | `/outlook/ananya?msg=M8` | `compose-send` | Yes | Yes | No | The same C2 quiet rule |
| 2 | 2a Open "fine with that" | `/outlook/ananya?msg=M12` | `msg-M12` | Yes | Yes | Not needed | Done on arrival: step 1's Next opens this email |
| 2 | 2b Draft clarification | `/outlook/ananya?msg=M12` | `send-clarification` | Yes | Yes | Yes | None |
| 2 | 2c Send it to Rohan | `/outlook/ananya?msg=M12` | `compose-send` | Yes | Yes | Yes | None. Rohan's reply lands 1.2 s after Send, and leaving the page before then loses it. |
| 3 | 3a Open Rohan's price ask | `/outlook/vikram?msg=M13` | `msg-M13` | Yes | Yes | Not needed | Done on arrival: step 2's Next opens this email |
| 3 | 3b Reply | `/outlook/vikram?msg=M13` | `reply` | Yes | Yes | Yes | None |
| 3 | 3c Press Send | `/outlook/vikram?msg=M13` | `compose-send` | Yes | Yes | Yes | None |
| 3 | 3d Loop in, edit or send anyway | `/outlook/vikram?msg=M13` | `guard-actions` | Yes | Yes | Yes | None |
| 4 | 4a Open the payment card (§9.3) | `/word/v6?from=sirion&clause=9.3` | `issue-9.3` | Yes* | Yes* | Yes* | *Only while the Review tab is active. On Compare, Draft or Approve the target isn't rendered and nothing was ringed: there was no route through the tab. |
| 4 | 4b Fix all with agreed wording | `/word/v6?from=sirion` | `insert-all` | Yes* | Yes* | Yes* | The same inactive-tab gap |
| 4 | 4c Send back to CloudDesk | `/word/v6?from=sirion` | `send-back` | Yes* | Yes* | Yes* | The same inactive-tab gap |
| 5 | 5a Review and save | `/contracts/C-2026-0417?tab=obligations` | `review-save` | Yes* | Yes* | Yes* | *On the Obligations tab only. On any other contract tab, nothing was ringed. |
| 6 | 6a Go to December's invoice | `/contracts/C-2026-0417?tab=invoices` | `tour-invoice` | Not needed | Not needed | Not needed | Done on arrival: step 5's Next fast-forwards the invoice and sets the clock |
| 6 | 6b Raise dispute | `/contracts/C-2026-0417?tab=invoices` | `raise-dispute` | Yes* | Yes* | Yes* | The same inactive-tab gap (Invoices) |
| 6 | 6c Send the dispute | `/contracts/C-2026-0417?tab=invoices` | `send-dispute` | Yes* | Yes* | Yes* | The same inactive-tab gap |
| Quick | q1 Check signing copy | `/outlook/ananya?msg=M14` | `quick-check` | Yes | Yes | No | The coach mark was switched off for the whole quick path, and quick actions had no target. The marker served the walkthrough's step-4 action instead. |
| Quick | q2 Propose 60 days | `/word/v6?from=sirion&clause=9.3` | `propose-agreed` | Yes | Yes | No | Coach mark off. The target name was shared by every issue card's button, so it couldn't point at §9.3. |
| Quick | q3 See what it drives after signing | `/contracts/C-2026-0417?tab=obligations&focus=renewal` | `handover-renewal` | No | No | No | Coach mark off, and the target is in another app. Reaching it replays step 5 from saved results, which also cleared the quick path's earlier ticks, so q1 came back as not done. |

**Other causes checked:**
- **Hide hints and Esc:** these lived in memory only (no `localStorage`), so they didn't carry over. But Esc removed the ring as well as the label.
- **The rail:** below 1360 px it was collapsed by default and opened as an overlay. A collapse was saved in `localStorage` (`deal-ledger-rail`), so a new viewer could start with the rail closed.
- **Clicking the rail row first:** not needed. The coach mark appeared on its own whenever it was active.
- **Moved `data-tour` attributes** (C2 disclosures, the removed `AskBox`, pane restructuring): no stale targets were found. Every target in steps 1 to 6 still exists. The gaps were tabs and other apps, not missing attributes.
- **AskSirion open:** the label was hidden while the panel covered the target, and the ring stayed.

## Fixes

| Cause | Fix |
| --- | --- |
| C2 quiet rule | Removed. The ring stays until the action is done (A2). |
| Esc removed the ring | Esc now hides only the label for that action. "Hide hints" is the only off switch. It lasts for the session (`sessionStorage`), and Reset demo turns it back on. |
| Target pushed below the fold after the action changes | The ringed element is scrolled into view whenever layout hides it. Once the viewer scrolls by hand for that action, scrolling is left to them. |
| Target on an inactive tab | `SCRIPT` actions take an optional `via` (Word's Review tab, the contract's Obligations and Invoices tabs). The coach mark rings the tab ("Next · Review tab"), then the target. Sirion tabs now carry `role="tab"` and `data-tour="tab-{id}"`. |
| Target inside a closed disclosure | Found automatically: a closed `<details>` around the target or a `via` gets its `<summary>` ringed ("Next · Open …"). |
| Target in another app or on another page | Switcher ring and "Next" dot, plus the new in-frame bar ("Next: {action} in {app} [Open {app} →]"). The bar pushes the app down and goes when the viewer arrives. A visible link to the page is ringed if there is one. |
| End of a step | A "step complete" card next to the last action's element (or the top right of the frame) offers the rail's Next move, plus "Stay here". |
| Quick path had no targets | Quick actions now have the same shape as walkthrough actions (`target`, `href`, `via`), and the coach mark serves them. q2 points at `propose-9.3` (per-clause target). Reaching q3 keeps the earlier ticks. |
| Rail collapsed by default, remembered across visits | The rail is open and docked at every width (264 px, or 232 px below 1280). « collapses it for this tab's session only. Reset demo reopens it. The old `localStorage` key is deleted on load. |
| Re-render tracking | `setInterval(250)` was replaced with `MutationObserver` and `ResizeObserver` (debounced to one frame), plus scroll and resize listeners and a slow 800 ms safety net. |

## After

Play-through from a fresh visit, clicking only what the app highlights (1440 × 900):

| Step | Action | `data-tour` target | Found | Visible | Highlighted | Reached by |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1a Open Rohan's email | `msg-M8` | Yes | Yes | Yes | In-frame bar on Home ("Open Ananya · Outlook"), then the email ringed in the list |
| 1 | 1b Compare clause 14.2 | `compare-14.2` | Yes | Yes | Yes | On arrival |
| 1 | 1c Respond to round | `respond-round` | Yes | Yes | Yes | Scrolled into view once Compare opens |
| 1 | 1d Send the reply with v5 | `compose-send` | Yes | Yes | Yes | On arrival |
| 1 | Step complete | | | | | Card: "Next: Resolve side thread →" |
| 2 | 2a Open "fine with that" | `msg-M12` | Yes | Yes | Not needed | Done on arrival: Next opens the email |
| 2 | 2b Draft clarification | `send-clarification` | Yes | Yes | Yes | On arrival |
| 2 | 2c Send it to Rohan | `compose-send` | Yes | Yes | Yes | On arrival |
| 3 | 3a Open Rohan's price ask | `msg-M13` | Yes | Yes | Not needed | Done on arrival: Next opens the email |
| 3 | 3b Reply | `reply` | Yes | Yes | Yes | On arrival |
| 3 | 3c Press Send | `compose-send` | Yes | Yes | Yes | On arrival |
| 3 | 3d Loop in, edit or send anyway | `guard-actions` | Yes | Yes | Yes | On arrival (dialog) |
| 3 | 3e Risky reply: use the suggested wording (only after Edit reply) | `use-suggested-wording` | Yes | Yes | Yes | On arrival |
| 3 | 3f Send the edited reply (only after Edit reply) | `compose-send` | Yes | Yes | Yes | On arrival |
| 4 | 4a Open the payment card | `issue-9.3` | Yes | Yes | Yes | On arrival. From another Word tab, via "Next · Review tab" |
| 4 | 4b Fix all with agreed wording | `insert-all` | Yes | Yes | Yes | On arrival |
| 4 | 4c Send back to CloudDesk | `send-back` | Yes | Yes | Yes | On arrival |
| 5 | 5a Review and save | `review-save` | Yes | Yes | Yes | On arrival |
| 6 | 6a Go to December's invoice | `tour-invoice` | Not needed | Not needed | Not needed | Done on arrival: step 5's Next moves the clock to December |
| 6 | 6b Raise dispute | `raise-dispute` | Yes | Yes | Yes | On arrival. From another contract tab, via "Next · Invoices tab" |
| 6 | 6c Send the dispute | `send-dispute` | Yes | Yes | Yes | On arrival |
| 6 | Done | | | | | Card: "After signing done · Back to Home →" |
| Quick | q1 Check signing copy | `quick-check` | Yes | Yes | Yes | On arrival |
| Quick | q2 Propose 60 days | `propose-9.3` | Yes | Yes | Yes | On arrival (Review tab and §9.3 card as `via` if closed) |
| Quick | q3 See what it drives after signing | `handover-renewal` | Yes | Yes | Done on arrival | In-frame bar in Word ("Open Sirion platform") |
| Quick | Done | | | | | Card: "Quick look done · Start the full walkthrough →" |

**Survival checks** (same run):
- **Opening AskSirion:** the ring and label stay.
- **Leaving for the deal page and coming back:** the bar shows on the deal page, and the ring returns in Outlook.
- **An unrelated click:** the ring stays.
- **Esc:** the label goes and the ring stays.

**Rail checks:** open and docked on load and through all six steps, and with AskSirion open.

| Window | Rail width |
| --- | --- |
| 1440 × 900 | 264 px |
| 1366 × 768 | 264 px |
| 1280 × 800 | 264 px |
| 1180 × 800 | 232 px |

**Collapse checks:** a collapse lasts across navigation and reload in the same tab. A new tab opens with the rail open.

**Three actions are done on arrival:**
- **2a and 3a:** the step's Next opens the email that the action asks for.
- **6a:** step 5's Next moves the clock to the invoice.

These are not highlight failures, so they are left as they were. The brief didn't ask for the step flow to change.

**Later changes:**
- **Edit reply:** Edit reply no longer ends step 3. Two actions follow it (3e and 3f), so the guidance carries on until the edited reply is sent.
- **Stay here:** after Stay here on a step-complete card, the in-frame bar keeps offering the next step.
- **Colour:** the next step's ring, label and buttons use an orange accent (`--guide-cta`) that no app on screen uses, and they bob.
- **Word:** clicking an issue card anywhere outside its buttons scrolls the document to that clause and highlights it.
