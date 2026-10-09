const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
const HOST = 'cjdrlddvbyfataumdztg.supabase.co';
const BASE = 'http://localhost:8096';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const state = createState();
  await install(ctx, state, { host: HOST });
  await ctx.route(/paystack\.test/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>paystack stub</h1>' }));
  await ctx.route(/cdn\.jsdelivr/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(process.env.SBUMD, 'utf8') }));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  let fails = 0;
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 5).join(' | ').slice(0, 400)); await page.screenshot({ path: `${process.env.OUT}/fail-${name.replace(/\W+/g, '-')}.png`, fullPage: true }).catch(() => {}); } };
  const text = () => page.locator('body').innerText();
  const noAges = async (where) => { const t = await text(); const m = t.match(/\bAges?\b|\b2\s?[–-]\s?4\b|\b5\s?[–-]\s?8\b|\b9\s?[–-]\s?12\b|\bLittle\b|\bExplorer\b|\bAdventurer\b|\bage group/i); if (m) throw new Error(`${where}: found "${m[0]}"`); };
  const audit = async (name) => {
    await page.addScriptTag({ content: AXE }).catch(() => {});
    const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => `${v.id}[${v.impact}]x${v.nodes.length}`));
    console.log(`  axe ${name}: ${r.length ? r.join(', ') : 'no violations'}`);
  };
  const goto = (p) => page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
  const premium = (over = {}) => ({ active: true, status: 'active', plan: 'monthly', current_period_end: new Date(Date.now() + 20 * 864e5).toISOString(), access_until: new Date(Date.now() + 25 * 864e5).toISOString(), in_grace: false, ...over });

  await step('landing: levels without ages, plans and prices', async () => {
    await goto('/');
    await page.getByRole('heading', { name: /Stories that grow/ }).waitFor();
    for (const t of ['Sunrise', 'Assisted Reader', 'Spark', 'Emergent Reader', 'Seeker', 'Developing Reader']) await page.getByText(t, { exact: true }).first().waitFor();
    await page.getByText('₦5,000').first().waitFor(); await page.getByText('₦12,000').first().waitFor(); await page.getByText('Save 20%').first().waitFor();
    await noAges('landing'); await audit('landing');
  });
  await step('plans (signed out): CTAs go to sign-up with the plan', async () => {
    await goto('/plans/'); await page.getByRole('heading', { name: 'Choose how you read' }).waitFor();
    const href = await page.getByRole('link', { name: 'Sign up and subscribe' }).last().getAttribute('href');
    if (!/signup\/\?next=%2Fcheckout%2F%3Fplan%3Dquarterly/.test(href)) throw new Error('href ' + href);
    await noAges('plans'); await audit('plans');
  });
  await step('sign up then land on checkout for the chosen plan', async () => {
    await goto('/signup/?next=' + encodeURIComponent('/checkout/?plan=quarterly'));
    await page.getByLabel('Email', { exact: true }).fill('parent@example.com'); await page.getByLabel('Password', { exact: true }).fill('secret123'); await page.getByLabel('Repeat password').fill('secret123');
    await audit('signup'); await page.getByRole('button', { name: 'Create account' }).click();
    await page.getByRole('heading', { name: 'Checkout' }).waitFor({ timeout: 8000 });
    await page.getByText('Premium Quarterly').first().waitFor(); await page.getByText('₦12,000').first().waitFor(); await page.getByText('every 3 months').first().waitFor();
    if (await page.locator('.premium').count()) throw new Error('free user should not see the Premium badge');
    await audit('checkout (free user)');
  });
  await step('pay with Paystack starts checkout and redirects', async () => {
    const payBtn = page.getByRole('button', { name: /Pay ₦12,000 with Paystack/ });
    if (!(await payBtn.isDisabled())) throw new Error('Pay must stay disabled until the parent consents');
    await page.getByRole('button', { name: 'privacy policy' }).click();
    await page.getByRole('dialog').getByText('Version 3').waitFor(); await page.getByRole('dialog').getByText('Our promise to families').waitFor(); await audit('privacy dialog');
    await page.getByRole('button', { name: 'I have read it and I agree' }).click();
    if (!(await page.getByLabel(/I am the parent or guardian/).isChecked())) throw new Error('agreeing in the dialog should tick the consent box');
    await audit('checkout (consent ticked)');
    await payBtn.click(); await page.waitForURL(/paystack\.test/, { timeout: 8000 });
    const call = state.calls.find((c) => c.path === '/functions/v1/paystack-checkout');
    if (!call || call.body.plan !== 'quarterly' || call.body.consent !== true) throw new Error('checkout call: ' + JSON.stringify(call?.body));
  });
  await step('checkout shows a clear message when the server refuses', async () => {
    state.checkoutError = 'You already have an active Premium subscription.'; await goto('/checkout/?plan=monthly');
    await page.getByLabel(/I am the parent or guardian/).check();
    await page.getByRole('button', { name: /Pay ₦5,000/ }).click(); await page.getByRole('alert').getByText('already have an active Premium').waitFor(); state.checkoutError = null;
  });
  await step('account (free)', async () => {
    await goto('/account/'); await page.getByRole('heading', { name: 'Your account' }).waitFor(); await page.getByText('Free plan').first().waitFor(); await page.getByRole('link', { name: 'Get Premium' }).waitFor();
    if (await page.locator('.premium:not(:has-text("Free"))').count()) throw new Error('unexpected Premium badge'); await audit('account (free)');
  });
  await step('contact support from the account page', async () => {
    await goto('/account/'); await page.getByRole('heading', { name: 'Contact support' }).waitFor();
    await page.getByRole('button', { name: 'Send to support' }).isDisabled().then((d) => { if (!d) throw new Error('send should be disabled with no message'); });
    await page.getByLabel('What is it about?').selectOption('subscription'); await page.getByLabel('Your message').fill('I paid but my app still shows Free.');
    await page.getByRole('button', { name: 'Send to support' }).click(); await page.getByText('Our team has your message').waitFor();
    const call = state.calls.find((c) => c.path === '/functions/v1/support-request');
    if (!call || call.body.topic !== 'subscription') throw new Error('support call: ' + JSON.stringify(call?.body));
    await page.getByText('Your recent messages').waitFor(); await page.getByText('I paid but my app still shows Free.').waitFor(); await audit('account support');
    await page.getByRole('link', { name: 'Contact support' }).first().waitFor();
  });
  await step('Premium badge on checkout, plans, account and header', async () => {
    state.access = premium();
    await goto('/account/?paid=1'); await page.getByText('Payment received. Welcome to Premium').waitFor({ timeout: 8000 });
    await page.locator('.site-head .premium').waitFor(); await page.locator('main .premium', { hasText: 'Premium' }).first().waitFor();
    await page.getByText('Premium Monthly').first().waitFor(); await page.getByText('Active', { exact: true }).waitFor(); await audit('account (premium)');
    await goto('/plans/'); await page.locator('main .banner .premium').waitFor(); await page.getByText('Thank you for being a Premium family.').waitFor(); await page.getByText('Your plan').first().waitFor(); await audit('plans (premium)');
    await goto('/checkout/?plan=monthly'); await page.locator('main .banner .premium').waitFor(); await page.getByText('You already have Premium').waitFor();
    if (!(await page.getByRole('button', { name: /Pay ₦5,000/ }).isDisabled())) throw new Error('pay should be disabled while Premium is active');
    await audit('checkout (premium)');
  });
  await step('grace period: overdue warning, amber badge, renew', async () => {
    state.access = premium({ status: 'past_due', in_grace: true, current_period_end: new Date(Date.now() - 2 * 864e5).toISOString(), access_until: new Date(Date.now() + 3 * 864e5).toISOString() });
    await goto('/account/'); await page.getByText('Your last payment did not go through').waitFor(); await page.locator('main .premium.warn').waitFor();
    await page.getByText('Payment overdue (grace period)').waitFor(); await page.getByRole('link', { name: 'Renew now' }).waitFor();
    await goto('/checkout/?plan=monthly'); await page.getByText('Your renewal is overdue').waitFor(); await page.getByLabel(/I am the parent or guardian/).check();
    if (await page.getByRole('button', { name: /Pay ₦5,000/ }).isDisabled()) throw new Error('late payers must be able to pay');
  });
  await step('manage subscription opens Paystack', async () => {
    state.access = premium(); await goto('/account/'); await page.getByRole('button', { name: 'Manage or cancel subscription' }).click(); await page.waitForURL(/paystack\.test\/manage/, { timeout: 8000 });
  });
  await step('sign out, wrong password, forgot password with a code', async () => {
    state.access = null; await goto('/account/'); await page.getByRole('button', { name: 'Sign out' }).click(); await page.waitForURL(BASE + '/');
    await goto('/login/'); await page.getByLabel('Email').fill('parent@example.com'); await page.getByLabel('Password').fill('wrong-password'); await page.getByRole('button', { name: 'Sign in' }).click(); await page.getByText('That email or password is not right.').waitFor(); await audit('login');
    await page.getByRole('link', { name: 'Forgot your password?' }).click(); await page.getByRole('heading', { name: 'Forgot your password?' }).waitFor();
    if ((await page.getByLabel('Email').inputValue()) !== 'parent@example.com') throw new Error('email not carried over');
    await page.getByRole('button', { name: 'Send me a code' }).click(); await page.getByRole('heading', { name: 'Enter the code' }).waitFor(); if (state.recoverFor !== 'parent@example.com') throw new Error('recover not requested');
    await page.getByLabel('Code from the email').fill('000000'); await page.getByRole('button', { name: 'Continue' }).click(); await page.getByText(/not right or has expired/).waitFor();
    await page.getByLabel('Code from the email').fill('123456'); await page.getByRole('button', { name: 'Continue' }).click(); await page.getByRole('heading', { name: 'Choose a new password' }).waitFor(); await audit('forgot password');
    await page.getByLabel('New password', { exact: true }).fill('brandnew123'); await page.getByLabel('Repeat new password').fill('brandnew123'); await page.getByRole('button', { name: 'Save new password' }).click();
    await page.getByRole('heading', { name: 'Your account' }).waitFor({ timeout: 8000 }); if (state.newPassword !== 'brandnew123') throw new Error('password not saved');
  });
  await step('privacy policy page (same content as the app)', async () => {
    await goto('/privacy/'); await page.getByText('Version 3').waitFor(); await page.getByText('Our promise to families').waitFor(); await noAges('privacy'); await audit('privacy');
  });
  await step('admin CMS is hosted at /admin/ and shares the sign-in', async () => {
    // still signed in as a parent from the steps above: the admin app must see that session and refuse
    await goto('/admin/'); await page.getByText('No admin access').waitFor({ timeout: 8000 }); if (!/Genova Admin/.test(await page.title())) throw new Error('title ' + (await page.title()));
    await noAges('admin (no access)');
    // an admin account gets the dashboard
    state.isAdmin = true; await goto('/admin/'); await page.getByRole('link', { name: 'Dashboard' }).waitFor({ timeout: 8000 });
    for (const n of ['Stories', 'Featured', 'Categories', 'Subscribers', 'Settings']) await page.locator('.nav').getByRole('link', { name: n }).waitFor();
    state.isAdmin = false;
  });
  await step('mobile layout has no horizontal scroll', async () => {
    await page.setViewportSize({ width: 375, height: 800 }); await page.waitForTimeout(300);
    for (const p of ['/', '/plans/', '/login/', '/privacy/']) { await goto(p); const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 1) throw new Error(`${p} overflows by ${w}px`); }
    await goto('/plans/'); await page.screenshot({ path: `${process.env.OUT}/mobile-plans.png`, fullPage: true });
  });
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
