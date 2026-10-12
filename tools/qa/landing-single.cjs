// Checks the single-file landing page (docs/Genova_Landing_Page.html): it is self-contained and its behaviour works.
const { chromium } = require(process.env.PW);
const fs = require('fs');
const path = require('path');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
const FILE = 'file://' + path.resolve(__dirname, '..', '..', 'docs', 'Genova_Landing_Page.html');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  let fails = 0;
  const external = new Set();
  const run = async (width, fn) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u) && !/fonts\.(googleapis|gstatic)/.test(u)) external.add(u); });
    await page.goto(FILE, { waitUntil: 'load' });
    await fn(page); if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    await ctx.close();
  };
  const step = async (name, width, fn) => { try { await run(width, fn); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 4).join(' | ')); } };

  await step('desktop: content preserved and new app section present', 1280, async (p) => {
    for (const t of ['Stories That Stay and', 'Reading is where it starts. Character is where it goes.', 'Seven pillars. One whole child.', 'Every child reads differently.', 'From struggling reader to confident reader', 'A real library where children walk in, pick a book, and read.', 'Real homes. Real reading wins.', 'Genova stories, in your child', 'Simple plans', 'Good questions, honest answers.']) {
      if (!(await p.locator('body').innerText()).includes(t) && !(await p.content()).includes(t.replace(/'/g, '&#39;'))) throw new Error('missing: ' + t);
    }
    for (const [store, label] of [['android', 'Download for Android'], ['ios', 'Download for iOS']]) {
      const a = p.locator(`#app a[data-store="${store}"]`); if ((await a.count()) !== 1 || !(await a.innerText()).includes(label)) throw new Error('missing store button: ' + label);
    }
    // Storybook bundles and every "Shop ..." button are switched off (kept as INACTIVE comments)
    const links = await p.$$eval('a[href*="selar.com"], #products, a[href="#products"]', (a) => a.length); if (links !== 0) throw new Error('bundle/shop elements still visible: ' + links);
    const shop = (await p.locator('body').innerText()).match(/Shop (the )?(Storybooks|\w+ Books)|Storybook Bundles|Order \w+ P1/); if (shop) throw new Error('shop text visible: ' + shop[0]);
    for (const old of ['₦5,000', '₦12,000', '₦2,500']) if ((await p.locator('body').innerText()).includes(old)) throw new Error('old price visible: ' + old);
    for (const price of ['₦3,000', '₦7,500']) if (!(await p.locator('body').innerText()).includes(price)) throw new Error('new price missing: ' + price);
    const wa = await p.$$eval('a[href*="wa.me"]', (a) => a.map((x) => x.getAttribute('href')));
    if (wa.length < 2) throw new Error('WhatsApp links missing');
    for (const h of wa) { const u = new URL(h); if (u.pathname !== '/2348128787969') throw new Error('wrong WhatsApp number: ' + h); if (decodeURIComponent(u.searchParams.get('text') || '') !== "Hello, my name is [Insert your name] I'd like to inquire about.....") throw new Error('wrong WhatsApp message: ' + h); }
    if ((await p.content()).includes('2349015487736')) throw new Error('the old WhatsApp number is still in the page');
    const txt = await p.locator('body').innerText();
    if (/\bAges?\b|Age\(s\)|child_ages/.test(txt) || (await p.content()).includes('child_ages')) throw new Error('age text found');
    if (await p.locator('img').evaluateAll((im) => im.filter((i) => !i.src.startsWith('data:')).length)) throw new Error('an image is not inlined');
  });
  await step('desktop: every image loads', 1280, async (p) => {
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
    await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  });
  await step('desktop: scroll reveal shows content', 1280, async (p) => {
    await p.evaluate(() => document.querySelector('#pillars').scrollIntoView()); await p.waitForTimeout(1600);
    const o = await p.$eval('#pillars .pillar-card', (e) => getComputedStyle(e).opacity); if (Number(o) < 0.99) throw new Error('pillar card still hidden: ' + o);
  });
  await step('desktop: the Title Catalog section and its buttons are hidden', 1280, async (p) => {
    const txt = await p.locator('body').innerText();
    for (const t of ['The Title Catalog', 'Browse the Catalog', 'Open the full catalog', 'Title Catalog']) if (txt.includes(t)) throw new Error('still visible: ' + t);
    if (await p.locator('#catalog').isVisible().catch(() => false)) throw new Error('#catalog is visible');
    if (await p.locator('a[href="#catalog"],[data-catalog-open]').count()) throw new Error('something still links to the catalog');
    if (!(await p.getByText('This is the whole point.').isVisible())) throw new Error('the "whole point" card is gone');
    if (!(await p.getByText('Seven Pillars,').first().isVisible())) throw new Error('pillars heading missing');
  });
  await step('desktop: forms have no age field and are labelled', 1280, async (p) => {
    for (const id of ['preorderForm', 'grpForm']) {
      const f = p.locator('#' + id); if (!(await f.count())) throw new Error('missing form ' + id);
      const unlabeled = await f.locator('input:not([type=hidden]),select,textarea').evaluateAll((els) => els.filter((e) => !document.querySelector(`label[for="${e.id}"]`)).length); if (unlabeled) throw new Error(id + ': unlabeled fields ' + unlabeled);
      if (!(await f.getByText('privacy policy').count())) throw new Error(id + ': privacy link missing');
    }
  });
  await step('desktop: no accessibility violations (WCAG A/AA)', 1280, async (p) => {
    await p.addScriptTag({ content: AXE });
    await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => `${v.id}[${v.impact}]x${v.nodes.length}: ` + v.nodes.slice(0, 2).map((n) => n.html.slice(0, 110)).join(' || ')));
    if (r.length) throw new Error(r.join(' ;; '));
  });
  await step('phone: no sideways scroll, menu opens and closes', 390, async (p) => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1]) throw new Error('horizontal scroll ' + w);
    await p.locator('#menuToggle').click(); await p.locator('#mobileMenu.open').waitFor();
    await p.locator('#mobileMenu').getByRole('link', { name: 'Reading Levels' }).click(); await p.waitForTimeout(300);
    if (await p.locator('#mobileMenu.open').count()) throw new Error('menu stayed open');
  });
  const bad = [...external].filter((u) => !/selar\.com|wa\.me|formspree\.io/.test(u));
  console.log('  external requests made on load:', bad.length ? bad.join(', ') : 'none (only fonts)');
  if (bad.length) fails++;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
