// Landing page screenshots for the UI PDF: one image per section (desktop) and three phone screens.
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const out = process.env.OUT; const BASE = 'http://localhost:8096';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1.5 });
  const state = createState(); await install(ctx, state, { host: 'cjdrlddvbyfataumdztg.supabase.co' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const settle = async () => {
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 160)); } window.scrollTo(0, 0); document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); });
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
    await page.addStyleTag({ content: '.wa-float,.sticky-cta{display:none !important}' });
    await page.waitForTimeout(1200);
  };
  await settle();
  const box = async (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; }, sel);
  const clip = async (name, fromSel, toSel) => {
    const a = fromSel ? (await box(fromSel)).top : 0; const b = (await box(toSel || fromSel)).bottom;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true, clip: { x: 0, y: Math.floor(a), width: 1200, height: Math.ceil(b - a) } }); console.log('shot', name);
  };
  await clip('w01a-landing-hero', null, '.value-strip');
  await clip('w01b-landing-about', '#about');
  await clip('w01c-landing-pillars', '#pillars');
  await clip('w01d-landing-levels', '#levels');
  await clip('w01e-landing-app', '#app');
  await clip('w01f-landing-plans', '#plans');
  await clip('w01g-landing-faq', '#faq');
  await clip('w01h-landing-products', '#products');
  await clip('w01i-landing-preorder', '#preorder');
  await clip('w01j-landing-grp', '#grp');
  await clip('w01k-landing-grp-form', '#grp-form');
  await clip('w01l-landing-library', '#library');
  await clip('w01m-landing-testimonials', 'section:has(.testi-grid)');
  await clip('w01n-landing-cta-footer', 'section:has(.cta-band)', 'footer.site-foot');

  // phone
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await install(pctx, createState(), { host: 'cjdrlddvbyfataumdztg.supabase.co' });
  const p = await pctx.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: '.wa-float{display:none !important}' }); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/w01p-landing-phone-top.png` });
  await p.getByRole('button', { name: 'Menu' }).click(); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/w01q-landing-phone-menu.png` }); await p.getByRole('button', { name: 'Menu' }).click();
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); document.querySelector('#app').scrollIntoView(); });
  await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/w01r-landing-phone-app.png` });
  await p.evaluate(() => document.querySelector('#plans').scrollIntoView()); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/w01s-landing-phone-plans.png` });
  console.log('ALL CAPTURED'); await browser.close();
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
