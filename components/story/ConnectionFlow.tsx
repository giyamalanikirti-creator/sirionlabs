/** How email and Word get connected to Sirion: admin once → track → link → Send check → Word → publish → handover. */
import Link from 'next/link';
import { CAPTURE_ADDRESS, CONNECTED_GROUP } from '@/lib/settings';

const STEPS = [
  { title: 'Admin, once', lines: ['Consent: read connected', 'mailboxes; deploy add-ins'] },
  { title: 'Track', lines: ['Owner says yes on the', 'first supplier email'] },
  { title: 'Link', lines: ['Strong matches link', 'with Undo; weak ones ask'] },
  { title: 'Check at Send', lines: ['Anyone replying to a', 'tracked supplier'] },
  { title: 'Word', lines: ['Tagged file opens', 'connected, on Review'] },
  { title: 'Publish', lines: ['Signing check first;', 'asks only on a gap'] },
  { title: 'Handover', lines: ['Obligations and', 'invoice rules'] },
];

const PROMPTS = [
  ['Track this negotiation?', 'The deal owner opens a supplier email that matches a record in Negotiating, not yet tracked', 'Deal owner', 'That supplier’s threads in connected mailboxes, from when the record opened'],
  ['Link this thread?', 'A weak match, e.g. Rohan names Vikram', 'Deal owner', 'Headers only until linked; then that one thread'],
  ['This looks like the CloudDesk MSA', 'A contract file opens in Word without the Sirion tag', 'Whoever opens it', 'The file’s clause text, compared with versions Sirion holds'],
  ['Publish gate', 'Publish when an agreed term is missing from the copy', 'Deal owner', 'Nothing new: the copy against the ledger'],
];

export function ConnectionFlow() {
  return (
    <section className="my-10" id="how-it-connects">
      <h2 className="text-[18px] text-teal-title">How it connects</h2>
      <p className="mt-1 text-[13px] text-muted">
        Admins set up once; nobody is onboarded. Three prompts in the whole flow, each at a moment of intent, plus the publish gate.
      </p>
      <div role="list" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Admin once, then track, link, check at Send, Word, publish and handover">
        {STEPS.map((st, i) => (
          <div
            role="listitem"
            key={st.title}
            className={`rounded-lg border px-3 py-2.5 ${i === 0 ? 'border-line bg-white' : i === STEPS.length - 1 ? 'border-teal-900 bg-mint/40' : 'border-teal-900 bg-white'}`}
          >
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold leading-[18px] text-teal-900">
              <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-teal-900 text-[10px] leading-none text-white">{i + 1}</span>
              <span className="min-w-0">{st.title}</span>
            </div>
            <div className="mt-1 text-[11.5px] leading-[16px] text-muted">{st.lines.join(' ')}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-3 font-semibold">Prompt</th>
              <th className="py-2 pr-3 font-semibold">When</th>
              <th className="py-2 pr-3 font-semibold">Who is asked</th>
              <th className="py-2 font-semibold">What is read</th>
            </tr>
          </thead>
          <tbody>
            {PROMPTS.map((r) => (
              <tr key={r[0]} className="border-b border-line/70 align-top">
                <td className="py-2 pr-3 font-medium text-ink">{r[0]}</td>
                <td className="py-2 pr-3 text-ink">{r[1]}</td>
                <td className="py-2 pr-3 text-ink">{r[2]}</td>
                <td className="py-2 text-ink">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[12.5px] leading-[19px] text-ink">
        <li>
          <strong>Permissions.</strong> Admin consent to read connected mailboxes only (limited to the “{CONNECTED_GROUP}” group); add-ins deployed by IT;
          suppliers connect nothing and never see the ledger.
        </li>
        <li>
          <strong>Strong signals act on their own,</strong> visibly, with Undo. Business owners never need to open the add-in: the check at Send and{' '}
          {CAPTURE_ADDRESS} cover them, and they are told once when one of their threads is linked.
        </li>
        <li>
          <strong>Fail open.</strong> If the add-in isn&apos;t deployed to someone, they aren&apos;t signed in, or the check at Send takes more than about
          3 seconds, the email sends as usual. Word opens as usual, and the pane says what is missing.
        </li>
        <li>
          <strong>Word recognises a file</strong> by the Sirion tag every stored version carries; if a supplier re-saved it, by comparing clause text with
          the versions Sirion holds; and otherwise by search or upload. Saving in Word never creates a Sirion version on its own; Publish does.
        </li>
        <li>
          <strong>Off-ramps.</strong> Stop tracking (the ledger is kept), unlink a thread (its quotes are removed and logged), remove a person from a deal,
          or turn a mailbox off.
        </li>
        <li>
          <strong>Gmail and Google Workspace</strong> follow the same flow with a Workspace add-on and the Gmail API; out of scope for this demo.
        </li>
      </ul>
      <p className="mt-3 text-[13px] font-semibold text-ink">The pilot path</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-[19px] text-ink">
        <li>First release: the deal owner selects a thread explicitly, or the team copies a shared capture mailbox (deals@).</li>
        <li>Later: background discovery across mailboxes, once the customer&apos;s admin configures access.</li>
      </ul>
      <p className="mt-3 text-[12px]">
        <Link href="/setup" className="font-medium text-teal-900 underline">See how this was set up</Link> ·{' '}
        <Link href="/outlook/ananya?msg=M1&prequel=1" className="font-medium text-teal-900 underline">The first prompt, 1 Nov</Link>
      </p>
    </section>
  );
}
