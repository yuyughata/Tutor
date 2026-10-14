// The two landing-page forms save to the database (no Formspree), have a WhatsApp alternative, and the
// "Parents are noticing" section sits above the Genova app section.
// Runs on the website (needs the website export on :8096) and on the single-file page (build it first).
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const fs = require('fs'); const path = require('path');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
const TARGETS = [['website', 'http://localhost:8096/'], ['single file', 'file://' + path.resolve(__dirname, '../../docs/Genova_Landing_Page.html')]];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  let fails = 0;
  for (const [label, url] of TARGETS) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const state = createState(); state.formRequests = [];
    await install(ctx, state, { host: 'cjdrlddvbyfataumdztg.supabase.co' });
    const external = []; await ctx.route(/formspree\.io/, (r) => { external.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage();
    const step = async (name, fn) => { try { await fn(); console.log('ok   ', label, '-', name); } catch (e) { fails++; console.log('FAIL ', label, '-', name, '-', e.message.split('\n').slice(0, 5).join(' | ')); await page.screenshot({ path: `${process.env.OUT || '.'}/fail-forms-${label.replace(/\W/g, '')}-${name.replace(/\W+/g, '-')}.png`, fullPage: false }).catch(() => {}); } };
    await page.goto(url, { waitUntil: 'networkidle' }); await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important}' });
    const waText = async (formSel) => { const a = page.locator(`${formSel} a.btn-wa`); if (await a.count() !== 1) throw new Error('WhatsApp button missing in ' + formSel); const href = await a.getAttribute('href'); if (!/^https:\/\/wa\.me\/2348128787969\?text=/.test(href)) throw new Error('bad link ' + href); if ((await a.getAttribute('target')) !== '_blank') throw new Error('should open in a new tab'); return decodeURIComponent(href.split('text=')[1]); };

    await step('section order: parents are noticing, then the app', async () => {
      const ids = await page.evaluate(() => { const secs = [...document.querySelectorAll('.lp section')]; const idx = (f) => secs.findIndex(f); return { grp: idx((s) => s.id === 'grp'), noticing: idx((s) => /Parents are noticing/i.test(s.textContent)), app: idx((s) => s.id === 'app'), plans: idx((s) => s.id === 'plans') }; });
      if (!(ids.grp < ids.noticing && ids.noticing < ids.app && ids.app < ids.plans)) throw new Error(JSON.stringify(ids));
    });
    await step('GRP form saves to the database', async () => {
      await page.locator('#grpForm-full_name').fill('Amaka Johnson'); await page.locator('#grpForm-phone').fill('08012345678'); await page.locator('#grpForm-email').fill('amaka@example.com');
      await page.locator('#grpForm-reading_level').selectOption({ label: 'Reads with help' }); await page.locator('#grpForm-mode').selectOption({ label: 'Online' }); await page.locator('#grpForm-comments').fill('Evenings please');
      await page.locator('#grpForm button[type=submit]').click();
      await page.locator('#grpForm .form-status').getByText(/Thank you/).waitFor({ timeout: 6000 });
      const r = state.formRequests.at(-1); if (r.fn !== 'submit_grp_request') throw new Error(r.fn);
      const b = r.body; const want = { p_full_name: 'Amaka Johnson', p_phone: '08012345678', p_email: 'amaka@example.com', p_reading_level: 'Reads with help', p_mode: 'Online', p_comments: 'Evenings please', p_website: '' };
      for (const k of Object.keys(want)) if (b[k] !== want[k]) throw new Error(`${k}: ${JSON.stringify(b[k])}`);
      if (!b.p_source) throw new Error('no source');
      if ((await page.locator('#grpForm-full_name').inputValue()) !== '') throw new Error('form not cleared');
    });
    await step('title form saves to the database', async () => {
      await page.locator('#preorderForm-full_name').fill('Chidi Okafor'); await page.locator('#preorderForm-phone').fill('+234 809 876 5432'); await page.locator('#preorderForm-email').fill('chidi@example.com');
      await page.locator('#preorderForm-storybook_title').fill('Amazing Adventures'); await page.locator('#preorderForm-reader_level').selectOption({ index: 2 });
      await page.locator('#preorderForm button[type=submit]').click();
      await page.locator('#preorderForm .form-status').getByText(/Thank you/).waitFor({ timeout: 6000 });
      const r = state.formRequests.at(-1); if (r.fn !== 'submit_title_request') throw new Error(r.fn);
      if (r.body.p_storybook_title !== 'Amazing Adventures' || !/Spark/.test(r.body.p_reader_level) || r.body.p_comments !== null) throw new Error(JSON.stringify(r.body));
    });
    await step('a database error message is shown to the visitor', async () => {
      await page.locator('#grpForm-full_name').fill('Rate Limited'); await page.locator('#grpForm-phone').fill('08012345678'); await page.locator('#grpForm-email').fill('a@example.com');
      await page.locator('#grpForm-reading_level').selectOption({ index: 1 }); await page.locator('#grpForm-mode').selectOption({ index: 1 });
      await page.locator('#grpForm button[type=submit]').click();
      await page.locator('#grpForm .form-status').getByText('You have already sent a few requests. We will be in touch soon.').waitFor({ timeout: 6000 });
      if ((await page.locator('#grpForm-full_name').inputValue()) !== 'Rate Limited') throw new Error('the form should keep what was typed');
    });
    await step('WhatsApp alternative on both forms', async () => {
      const g = await waText('#grpForm'); const t = await waText('#preorderForm');
      if (!/^Hello, my name is \[Insert your name\] I'd like to request a spot in the Genova Reading Program\.$/.test(g)) throw new Error(g);
      if (!/^Hello, my name is \[Insert your name\] I'd like to request a storybook title\.$/.test(t)) throw new Error(t);
    });
    await step('no Formspree anywhere', async () => {
      const html = await page.content(); if (/formspree/i.test(html) || external.length) throw new Error('formspree still referenced: ' + external.join());
    });
    await step('axe: no WCAG A/AA violations on the form sections', async () => {
      await page.addScriptTag({ content: AXE });
      const v = await page.evaluate(async () => (await window.axe.run(['#grp-form', '#preorder'], { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id}x${x.nodes.length}: ${x.nodes[0].html.slice(0, 120)}`));
      if (v.length) throw new Error(v.join(' || '));
    });
    await ctx.close();
  }
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
