/**
 * Walks the whole demo script from §15 in a real browser and checks every
 * number on screen. Start the app first, then: npm run smoke
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ||
  '/usr/bin/google-chrome';
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

const b = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
await p.setRequestInterception(true);
p.on('request', (request) => {
  if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(request.url()).hostname)) {
    void request.respond({ status: 200, contentType: 'text/css', body: '' });
  } else {
    void request.continue();
  }
});
const errs = [];
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|404 \(Not Found\)/.test(m.text())) errs.push(`console: ${m.text().slice(0,200)}`); });

const w = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (t) => {
  const h = await p.waitForFunction((label) => [...document.querySelectorAll('button,a')]
    .find((element) => element.getClientRects().length && element.textContent.trim().startsWith(label)),
  { timeout: 10_000 }, t).catch((error) => {
    throw new Error(`Waiting for "${t}" at ${p.url()}`, { cause: error });
  });
  const el = h.asElement();
  if (!el) throw new Error(`button not found: ${t}`);
  await el.click();
};
const text = () => p.evaluate(() => document.body.innerText);
let failed = 0;
const check = (label, cond) => {
  if (!cond) failed++;
  console.log(`${cond ? '✓' : '✗'} ${label}`);
};

const t0 = Date.now();

// Step 0
await p.goto(`${BASE}/`, { waitUntil: 'networkidle0' }); await w(2200);
let t = await text();
check('step 0 · dashboard north star 65%', /65%/.test(t));
check('step 0 · ₹25.8 lakh at risk', /₹25\.8 lakh/.test(t));
check('step 0 · 42% outside the document', /42%/.test(t));

// Step 1
await click('Review supplier update'); await w(2500);
t = await text();
check('step 1 · price agreed from the email', /Fixed for 3 years/.test(t));
check('step 1 · renewal reopened, hidden edit', /Not shown as a tracked change/.test(t));
check('step 1 · expected cost at the next renewal', /₹3\.4 lakh\s+expected at the next renewal/.test(t));
await click('Compare clause 14.2');
check('step 1 · comparison highlights both notice windows', await p.$$eval('mark', (nodes) => nodes.map((node) => node.textContent).join(',') === '30,90'));
check('step 1 · reminder and deadline shown', /Last day to give notice.*Internal reminder/s.test(await text()));
await p.evaluate(() => [...document.querySelectorAll('summary')].find((node) => node.textContent === 'Try your own email').click());
await click('Replay example');
check('step 1 · reader replay names its evidence and condition', /Replayed extraction.*Exact quote.*Condition.*Uncertainty/s.test(await text()));
await click('Reply all');
const replyAll = await p.waitForSelector('textarea[placeholder="Type your reply"]');
const recipients = await replyAll.evaluate((editor) => editor.closest('section').innerText);
check('Outlook · Reply all includes the sender and original Cc', recipients.includes('rohan.iyer@clouddesk.example') && recipients.includes('priya.nair@clouddesk.example'));
await click('Discard');

// Step 2
await click('Next · Resolve side thread'); await w(2300);
t = await text();
check('step 2 · weak match shown, body not read', /Weak match \(0\.5\)\. Body not read yet\./.test(t));
await click('Link to this deal'); await w(3200);
t = await text();
check('step 2 · ambiguity sent to a person', /Needs confirmation/.test(t));
check('step 2 · both offers named with dates', /10%.*13 Nov/s.test(t) && /5%.*15 Nov/s.test(t));
check('step 2 · no offer selected', await p.$('input[type=radio]:checked') === null);
check('step 2 · clarification available', /Ask CloudDesk to clarify/.test(t));
await p.click('input[type=radio][value="10"]');
await p.type('input[placeholder*="Confirmed with Rohan"]', 'Confirmed with Rohan by phone');
await click('Confirm'); await w(800);
t = await text();
check('step 2 · confirmation attributed to Ananya', /Confirmed by Ananya Rao on 16 Nov/.test(t));

// Step 3
await click('Next · Check reply'); await w(2200);
await click('Reply'); await w(900);
await p.evaluate(() => [...document.querySelectorAll('summary')].find((node) => node.textContent === 'Try a reply').click());
await click('Yearly price revision is fine with us.'); await w(500);
await click('Send'); await w(3200);
t = await text();
check('step 3 · Smart Alert names the figure', /₹3\.9 lakh a year/.test(t));
check('step 3 · names the CFO approval', /CFO approval from Neha Kapoor depends on fixed pricing/.test(t));
check('step 3 · three buttons', /Send Anyway/.test(t) && /Don't Send/.test(t) && /Loop in procurement/.test(t));
check('step 3 · initial focus stays on safe review', await p.evaluate(() => document.activeElement?.textContent?.trim() === 'Loop in procurement'));
await click('Yes');
await click('Loop in procurement'); await w(1600);
t = await text();
check('step 3 · fallback offered at ₹92,000', /₹92,000/.test(t));
await click('Add Ananya to Cc');
await click('Use a holding reply'); await w(1200);
await click('Send'); await w(2800);
t = await text();
check('step 3 · holding reply sent with no warning', /Sent/.test(t));
check('step 3 · sent message opens with Ananya in Cc', /Cc: ananya\.rao@meridian\.example/.test(t));

// Step 4
await click('Next · Verify signing copy'); await w(2000);
await click('Run signing check'); await w(600);
t = await text();
check('step 4 · 3 unresolved gaps', /4 matched · 0 awaiting supplier acceptance · 3 unresolved/.test(t));
check('step 4 · 4 rows match', /4 of 7 rows match/.test(t));
await click('Insert agreed wording'); await w(650);
check('step 4 · the proposed edit still awaits acceptance', /4 matched · 1 awaiting supplier acceptance · 2 unresolved/.test(await text()));
check('step 4 · exact supplier comment is visible', /Supplier comment/.test(await text()));
await click('Insert all'); await w(700);
await click('Send back to CloudDesk'); await w(1600);

// Step 5
await click('Next · See handover'); await w(1800);
await click('Verify returned copy and sign'); await w(1400);
await click('Save to Sirion'); await w(1600);
await w(800);
t = await text();
check('step 5 · renewal deadline 31 Oct 2029', /31 Oct 2029/.test(t));
check('step 5 · reminder 16 Sep 2029', /16 Sep 2029/.test(t));
check('step 5 · obligations link to ledger rows', /ledger row: R-notice/.test(t));

// Step 6
await click('Next · See December invoice'); await w(1200);
t = await text();
check('step 6 · ₹32,000 over the agreed price', /₹32,000 above the signed price/.test(t));
check('step 6 · defaults to the exception', /Exceptions \(1\)/.test(t) && !/INV-CD-2612/.test(t));
check('step 6 · cites clause 9.1', /Clause 9\.1 of the signed contract/.test(t));
check('step 6 · cites the 14 Nov email', /email of 14 Nov 2026/.test(t));

// Dashboard after signing
await p.goto(`${BASE}/`, { waitUntil: 'networkidle0' }); await w(2000);
t = await text();
check('after signing · at risk drops to ₹21.4 lakh', /₹21\.4 lakh/.test(t));
check('after signing · 4 signed since', /4 signed since/.test(t));

// Insights + story
await p.goto(`${BASE}/insights`, { waitUntil: 'networkidle0' }); await w(1800);
t = await text();
check('insights · reader accuracy honest about not being run', /Not run yet/.test(t));
check('insights · rethink lines present', /Rethink/.test(t));
check('insights · actionable warning feedback counted', /1 of 1 rated warnings/.test(t));
await p.goto(`${BASE}/story`, { waitUntil: 'networkidle0' }); await w(1500);
t = await text();
check('story · all 13 sections + sources', /13\. Assumptions/.test(t) && /Sources/.test(t));
check('story · Markdown tables rendered', (await p.$$('article table')).length > 0);

await p.goto(`${BASE}/outlook/vikram`, { waitUntil: 'networkidle0' });
await p.click('[aria-label="Team offsite plan"]');
check('Outlook · unrelated mail has no CloudDesk ledger', /No linked deal for this message/.test(await text()));
await click('Reply');
check('Outlook · unrelated reply goes to the sender', /priyanka\.das@meridian\.example/.test(await p.$eval('section:has(textarea)', (node) => node.innerText)));

console.log(`\nwalltime ${(Date.now()-t0)/1000}s (includes scripted waits)`);
console.log(errs.length ? '\nPAGE ERRORS:\n' + errs.join('\n') : '\nno page errors');
await b.close();
if (failed || errs.length) process.exitCode = 1;
