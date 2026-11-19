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
const errs = [];
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|404 \(Not Found\)/.test(m.text())) errs.push(`console: ${m.text().slice(0,200)}`); });

const w = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (t) => {
  const h = await p.evaluateHandle((t) => [...document.querySelectorAll('button,a')].find((e) => (e.textContent||'').trim().startsWith(t)), t);
  const el = h.asElement();
  if (!el) throw new Error(`button not found: ${t}`);
  await el.click();
};
const text = () => p.evaluate(() => document.body.innerText);
const check = (label, cond, detail='') => console.log(`${cond ? '✓' : '✗'} ${label}${detail ? '  — ' + detail : ''}`);

const t0 = Date.now();

// Step 0
await p.goto(`${BASE}/`, { waitUntil: 'networkidle0' }); await w(2200);
let t = await text();
check('step 0 · dashboard north star 65%', /65%/.test(t));
check('step 0 · ₹25.8 lakh at risk', /₹25\.8 lakh/.test(t));
check('step 0 · 42% outside the document', /42%/.test(t));

// Step 1
await p.goto(`${BASE}/outlook/ananya?msg=M8`, { waitUntil: 'networkidle0' }); await w(1800);
await p.goto(`${BASE}/outlook/ananya?msg=M8`, { waitUntil: 'networkidle0' }); await w(2800);
t = await text();
check('step 1 · price agreed from the email', /Fixed for 3 years/.test(t));
check('step 1 · renewal reopened, hidden edit', /Not shown as a tracked change/.test(t));
check('step 1 · ₹3.4 lakh a year', /₹3\.4 lakh/.test(t));
check('step 1 · header ₹3.9 lakh at risk', /₹3\.9 lakh\s+a year at risk/.test(t));

// Step 2
await p.goto(`${BASE}/outlook/ananya?msg=M12`, { waitUntil: 'networkidle0' }); await w(1800);
await p.goto(`${BASE}/outlook/ananya?msg=M12`, { waitUntil: 'networkidle0' }); await w(2800);
t = await text();
check('step 2 · weak match shown, body not read', /Weak match \(0\.5\)\. Body not read yet\./.test(t));
await click('Link to this deal'); await w(3200);
t = await text();
check('step 2 · ambiguity sent to a person', /Needs confirmation/.test(t));
check('step 2 · both offers named with dates', /10%.*13 Nov/s.test(t) && /5%.*15 Nov/s.test(t));
await click('Confirm'); await w(1800);
t = await text();
check('step 2 · header drops to ₹3.4 lakh', /₹3\.4 lakh\s+a year at risk/.test(t));

// Step 3
await p.goto(`${BASE}/outlook/vikram?msg=M13`, { waitUntil: 'networkidle0' }); await w(1800);
await p.goto(`${BASE}/outlook/vikram?msg=M13`, { waitUntil: 'networkidle0' }); await w(2500);
await click('Reply'); await w(900);
await click('Yearly price revision is fine with us.'); await w(500);
await click('Send'); await w(3200);
t = await text();
check('step 3 · Smart Alert names the figure', /₹3\.9 lakh a year/.test(t));
check('step 3 · names the CFO approval', /approved by Neha Kapoor/.test(t));
check('step 3 · three buttons', /Send Anyway/.test(t) && /Don't Send/.test(t) && /Loop in procurement/.test(t));
await click('Loop in procurement'); await w(1600);
t = await text();
check('step 3 · fallback offered at ₹92,000', /₹92,000/.test(t));
await click('Use a holding reply'); await w(1200);
await click('Send'); await w(2800);
t = await text();
check('step 3 · holding reply sent with no warning', /Sent/.test(t));

// Step 4
await p.goto(`${BASE}/word/v6`, { waitUntil: 'networkidle0' }); await w(2000);
await p.goto(`${BASE}/word/v6`, { waitUntil: 'networkidle0' }); await w(2600);
t = await text();
check('step 4 · 3 gaps worth ₹7.6 lakh', /₹7\.6 lakh\s+a year across 3 gaps/.test(t));
check('step 4 · 4 rows match', /4 of 7 rows match/.test(t));
await click('Insert all'); await w(2200);
t = await text();
check('step 4 · ready to sign 7 of 7', /Ready to sign: 7 of 7 rows match/.test(t));
await click('Send back to CloudDesk'); await w(1600);

// Step 5
await p.goto(`${BASE}/contracts/C-2026-0417`, { waitUntil: 'networkidle0' }); await w(1800);
await click('Fast-forward: CloudDesk signs'); await w(1400);
await click('Save to Sirion'); await w(1600);
await click('Obligations'); await w(1200);
t = await text();
check('step 5 · renewal deadline 31 Oct 2029', /31 Oct 2029/.test(t));
check('step 5 · reminder 16 Sep 2029', /16 Sep 2029/.test(t));
check('step 5 · obligations link to ledger rows', /ledger row: R-notice/.test(t));

// Step 6
await click('Invoices'); await w(1200);
await click('Fast-forward to Dec 2027'); await w(1800);
t = await text();
check('step 6 · ₹32,000 over the agreed price', /₹32,000 above the agreed price/.test(t));
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
await p.goto(`${BASE}/story`, { waitUntil: 'networkidle0' }); await w(1500);
t = await text();
check('story · all 13 sections + sources', /13\. Assumptions/.test(t) && /Sources/.test(t));

console.log(`\nwalltime ${(Date.now()-t0)/1000}s (includes scripted waits)`);
console.log(errs.length ? '\nPAGE ERRORS:\n' + errs.join('\n') : '\nno page errors');
await b.close();
