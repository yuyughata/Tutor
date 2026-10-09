const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const out = process.env.OUT; const BASE = 'http://localhost:8096';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const state = createState(); await install(ctx, state, { host: 'cjdrlddvbyfataumdztg.supabase.co' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  let fails = 0;
  const shot = async (n, full = true) => {
    await page.waitForTimeout(600);
    if (full) { const h = await page.evaluate(() => document.documentElement.scrollHeight); await page.setViewportSize({ width: 1200, height: Math.min(Math.max(h, 700), 2600) }); await page.waitForTimeout(300); }
    await page.screenshot({ path: `${out}/${n}.png` }); await page.setViewportSize({ width: 1200, height: 800 }); console.log('shot', n);
  };
  const step = async (name, fn) => { try { await fn(); } catch (e) { fails++; console.log('FAIL', name, e.message.split('\n')[0]); await shot('fail-' + name.replace(/\W+/g, '-')).catch(() => {}); } };
  const go = (p) => page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
  const premium = (o = {}) => ({ active: true, status: 'active', plan: 'quarterly', current_period_end: new Date(Date.now() + 40 * 864e5).toISOString(), access_until: new Date(Date.now() + 45 * 864e5).toISOString(), in_grace: false, ...o });
  await step('landing', async () => { await go('/'); await page.getByRole('heading', { name: /Stories that grow/ }).waitFor(); await shot('w01-landing'); });
  await step('plans', async () => { await go('/plans/'); await page.getByRole('heading', { name: 'Choose how you read' }).waitFor(); await shot('w02-plans'); });
  await step('signup', async () => { await go('/signup/?next=' + encodeURIComponent('/checkout/?plan=quarterly')); await page.getByLabel('Email', { exact: true }).fill('parent@example.com'); await page.getByLabel('Password', { exact: true }).fill('secret123'); await shot('w03-signup'); await page.getByLabel('Repeat password').fill('secret123'); await page.getByRole('button', { name: 'Create account' }).click(); });
  await step('checkout', async () => { await page.getByRole('heading', { name: 'Checkout' }).waitFor({ timeout: 8000 }); await page.getByText('Premium Quarterly').first().waitFor(); await shot('w04-checkout'); });
  await step('account free', async () => { await go('/account/'); await page.getByRole('heading', { name: /Account/ }).first().waitFor(); await shot('w05-account-free'); });
  await step('account premium', async () => { state.access = premium(); await go('/account/'); await page.getByText(/Premium/).first().waitFor(); await shot('w06-account-premium'); });
  await step('account overdue', async () => { state.access = premium({ status: 'past_due', in_grace: true, current_period_end: new Date(Date.now() - 2 * 864e5).toISOString(), access_until: new Date(Date.now() + 3 * 864e5).toISOString() }); await go('/account/'); await page.getByText(/Renew now|overdue/i).first().waitFor(); await shot('w07-account-overdue'); });
  await step('checkout consent', async () => { state.access = null; await go('/checkout/?plan=quarterly'); await page.getByLabel(/I am the parent or guardian/).waitFor(); await shot('w11-checkout-consent'); await page.getByRole('button', { name: 'privacy policy' }).click(); await page.getByRole('dialog').getByText('Version 3').waitFor(); await page.waitForTimeout(400); await shot('w12-checkout-policy-popup', false); await page.getByRole('button', { name: 'I have read it and I agree' }).click(); });
  await step('account support', async () => { state.access = premium(); await go('/account/'); await page.getByRole('heading', { name: 'Contact support' }).waitFor(); await page.getByLabel('Your message').fill('My tablet still shows the Free plan after I paid.'); await page.getByRole('button', { name: 'Send to support' }).click(); await page.getByText('Our team has your message').waitFor(); await shot('w13-account-support'); });
  await step('login', async () => { await page.getByRole('button', { name: /Sign out/ }).click().catch(() => {}); await go('/login/'); await page.getByLabel('Email', { exact: true }).waitFor(); await shot('w08-login'); });
  await step('forgot', async () => { await go('/forgot-password/'); await page.getByLabel('Email', { exact: true }).fill('parent@example.com'); await page.getByRole('button', { name: /Send/ }).click(); await page.getByLabel(/Code/).waitFor(); await shot('w09-forgot'); });
  await step('privacy', async () => { await go('/privacy/'); await page.getByText('Our promise to families').waitFor(); await shot('w10-privacy'); });
  console.log(errs.join('|') || 'no page errors', fails ? fails + ' FAILED' : 'ALL CAPTURED');
  await browser.close();
})();
