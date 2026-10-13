// A signed-in Premium parent must stay signed in when the phone is offline, even after the access token has expired.
// Needs the app web export on :8097 (see README). Run: node offline-session-e2e.cjs
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const state = createState();
  state.access = { active: true, status: 'active', plan: 'monthly', current_period_end: new Date(Date.now() + 20 * 864e5).toISOString(), access_until: new Date(Date.now() + 25 * 864e5).toISOString(), in_grace: false };
  await install(ctx, state);
  await ctx.route(/genova\.test/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'genova website' }));
  const page = await ctx.newPage();
  let fails = 0;
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 6).join(' | ')); await page.screenshot({ path: `${process.env.OUT || '.'}/fail-offline-${name.replace(/\W+/g, '-')}.png` }).catch(() => {}); } };
  const tab = (n) => page.getByRole('tab', { name: n, exact: true }).first();
  const gate = async () => { const t = await page.getByText(/^(one|two|three|four|five|six|seven|eight|nine)(, (one|two|three|four|five|six|seven|eight|nine)){2}$/).first().innerText(); for (const w of t.split(', ')) { await page.getByLabel(w, { exact: true }).click(); await page.waitForTimeout(120); } };
  const openGrownups = async () => { const g = page.getByText('Tap these numbers in order'); await g.waitFor({ timeout: 2500 }).catch(async () => { await tab('Grown-ups').click(); await g.waitFor({ timeout: 8000 }); }); await gate(); };

  await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
  await step('sign in as a Premium parent', async () => {
    await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Spark', { exact: true }).click(); await page.getByText("Let's read!").click();
    await page.getByText('TITLE OF THE WEEK').waitFor();
    await openGrownups();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('parent@example.com'); await page.getByLabel('Password', { exact: true }).fill('secret123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('Not now', { exact: true }).click({ timeout: 8000 }).catch(() => {}); // passcode offer
    await page.waitForTimeout(500); await tab('Home').click(); await tab('Grown-ups').click();
    await page.getByText('Premium is active').waitFor({ timeout: 8000 });
  });
  await step('offline + expired access token: still signed in, still Premium', async () => {
    // age the stored sign-in so the access token has expired (the refresh token is still valid)
    await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x)); const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) - 600; localStorage.setItem(k, JSON.stringify(s)); });
    state.down = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('TITLE OF THE WEEK').waitFor({ timeout: 15000 }).catch(() => {}); // cached catalogue
    await openGrownups();
    await page.getByText('Premium is active').waitFor({ timeout: 8000 });
    if (await page.getByRole('button', { name: 'Sign in', exact: true }).count()) throw new Error('a signed-in parent was asked to sign in while offline');
  });
  await step('back online: the sign-in refreshes by itself', async () => {
    state.down = false; const before = state.calls.filter((c) => c.path === '/auth/v1/token').length;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    for (let i = 0; i < 60 && state.calls.filter((c) => c.path === '/auth/v1/token').length === before; i++) await page.waitForTimeout(250);
    if (state.calls.filter((c) => c.path === '/auth/v1/token').length === before) throw new Error('no token refresh after the connection came back');
    await page.getByText('Premium is active').waitFor({ timeout: 8000 });
  });
  await step('signing out while offline works and shows sign-in', async () => {
    state.down = true;
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor({ timeout: 8000 });
    state.down = false;
  });
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
