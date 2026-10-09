const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const out = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const state = createState();
  await install(ctx, state);
  await ctx.route(/genova\.test/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'site' }));
  const page = await ctx.newPage();
  const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message.slice(0, 200)));
  let failures = 0;
  const shot = async (n) => { await page.waitForTimeout(700); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { failures++; console.log('FAIL', name, '-', e.message.split('\n')[0]); await shot('fail-' + name.replace(/\W+/g, '-')).catch(() => {}); } };
  const gate = async () => { const t = await page.getByText(/^(one|two|three|four|five|six|seven|eight|nine)(, (one|two|three|four|five|six|seven|eight|nine)){2}$/).first().innerText(); for (const w of t.split(', ')) { await page.getByLabel(w, { exact: true }).click(); await page.waitForTimeout(150); } };
  const tab = (n) => page.getByRole('tab', { name: n, exact: true }).first();

  await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
  await step('welcome', async () => { await page.getByLabel("Reader's name").waitFor(); await shot('m01-welcome'); });
  await step('profile filled', async () => { await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Spark', { exact: true }).click(); await page.getByLabel('owl').click(); await shot('m02-profile-filled'); });
  await step('home', async () => { await page.getByText("Let's read!").click(); await page.getByText('TITLE OF THE WEEK').waitFor(); await shot('m03-home'); });
  await step('home scrolled', async () => { await page.mouse.move(195, 500); await page.mouse.wheel(0, 760); await shot('m04-home-shelves'); await page.mouse.wheel(0, -2000); });
  await step('library empty', async () => { await tab('My books').click(); await page.getByText('Nothing in progress').waitFor(); await shot('m05-mybooks-empty'); await tab('Home').click(); });
  await step('detail + favourite', async () => { await page.getByLabel(/^Title of the week/i).click(); await page.getByText('Start reading').waitFor(); await page.getByLabel('Add to favourites').click(); await shot('m06-story-detail'); });
  await step('reader day', async () => { await page.getByText('Start reading').click(); await page.getByLabel('Next page').waitFor(); await shot('m07-reader-day'); });
  await step('reader sepia', async () => { await page.getByLabel(/^Reading theme/).click(); await page.getByLabel('Next page').click(); await shot('m08-reader-sepia'); });
  await step('reader night', async () => { await page.getByLabel(/^Reading theme/).click(); await page.getByLabel('Larger text').click(); await shot('m09-reader-night-large'); });
  await step('reader end', async () => { await page.getByLabel('Next page').click(); await page.getByText('The End').first().waitFor(); await shot('m10-reader-end'); await page.getByText('More stories').click(); await page.getByText('TITLE OF THE WEEK').waitFor(); });
  await step('partial progress', async () => {
    await page.mouse.move(195, 500); await page.mouse.wheel(0, 760);
    await page.getByLabel(/^Bedtime for Bear/).first().click(); await page.getByText('Start reading').click(); await page.getByLabel('Next page').click(); await page.getByLabel('Close story').click();
    await page.getByLabel('Back').click(); await page.getByText('TITLE OF THE WEEK').waitFor();
  });
  await step('library tabs', async () => {
    await tab('My books').click(); await page.getByText('Bedtime for Bear').first().waitFor(); await shot('m11-mybooks-reading');
    await page.getByRole('button', { name: 'Favourites' }).click(); await page.getByText('Luna and the Firefly').first().waitFor(); await shot('m12-mybooks-favourites');
    await page.getByRole('button', { name: 'Finished' }).click(); await shot('m13-mybooks-finished'); await tab('Home').click();
  });
  await step('premium locked', async () => { await page.getByLabel(/^Title of the month/i).click(); await page.getByText('Ask a grown-up').first().waitFor(); await shot('m14-story-premium-locked'); });
  await step('parental gate', async () => { await page.getByText('Ask a grown-up', { exact: true }).last().click(); await page.getByText('Tap these numbers in order').waitFor(); await shot('m15-parental-gate'); await gate(); });
  await step('grown-ups signed out', async () => { await page.getByText('Add a reader').first().waitFor(); await shot('m16-grownups'); });
  await step('sign in', async () => {
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByText('Use the same email you register with on the Genova website.', { exact: true }).waitFor();
    await page.getByLabel('Email', { exact: true }).fill('parent@example.com'); await shot('m19-sign-in');
  });
  await step('forgot password', async () => {
    await page.getByRole('button', { name: 'Forgot password?' }).click(); await page.getByRole('button', { name: 'Send me a code' }).click();
    await page.getByText('Enter the code').waitFor(); await page.getByLabel('Code from the email').fill('123456'); await shot('m20-forgot-code');
    await page.getByRole('button', { name: 'Continue' }).click(); await page.getByText('Choose a new password').waitFor();
    await page.getByLabel('New password', { exact: true }).fill('newpass123'); await page.getByLabel('Repeat new password', { exact: true }).fill('newpass123'); await shot('m21-forgot-new-password');
    await page.getByRole('button', { name: 'Save new password' }).click(); await page.getByText('All set').waitFor(); await shot('m22-forgot-done'); await page.getByRole('button', { name: 'Done' }).click();
  });
  await step('grown-ups premium', async () => {
    state.access = { active: true, status: 'active', plan: 'monthly', current_period_end: new Date(Date.now() + 20 * 864e5).toISOString(), access_until: new Date(Date.now() + 25 * 864e5).toISOString(), in_grace: false };
    await page.waitForTimeout(500); await tab('Home').click(); await tab('Grown-ups').click(); await page.getByText('Premium is active').waitFor({ timeout: 6000 }); await shot('m23-grownups-premium');
  });
  await step('privacy', async () => { await page.getByRole('button', { name: 'Read our privacy policy' }).click(); await page.getByText('Version 3').waitFor(); await shot('m24-privacy-policy'); await page.getByRole('button', { name: 'Close' }).click(); });
  await step('save for offline', async () => {
    await tab('Home').click(); await page.getByLabel(/^Title of the month/i).click(); await page.getByText('Start reading').waitFor();
    await page.getByRole('button', { name: 'Save for offline' }).click(); await page.getByText(/Saved for offline/).first().waitFor({ timeout: 6000 }); await shot('m25-story-saved');
    await page.getByLabel('Back').click();
  });
  await step('saved tab', async () => { await tab('My books').click(); await page.getByRole('button', { name: 'Saved' }).click(); await page.getByText('The Dragon Who Hated Fire').first().waitFor(); await shot('m26-mybooks-saved'); });
  await step('edit reader', async () => { await tab('Grown-ups').click(); await page.waitForTimeout(800); if (await page.getByText('Tap these numbers in order').count()) await gate(); await page.getByLabel(/^Edit Ada/).click(); await page.getByLabel("Reader's name").waitFor(); await shot('m17-edit-reader'); await page.getByText('Cancel', { exact: true }).click(); });
  await step('switch reader', async () => {
    await page.getByText('Add a reader').first().click(); await page.getByLabel("Reader's name").fill('Kofi'); await page.getByText('Sunrise', { exact: true }).click(); await page.getByLabel('bear', { exact: true }).click(); await page.getByText('Save', { exact: true }).click();
    await tab('Home').click(); await page.getByLabel(/^Reading as/).click(); await page.getByText("Who's reading?").waitFor(); await shot('m18-switch-reader');
  });
  console.log(logs.join('\n') || 'no page errors'); console.log(failures ? failures + ' FAILED' : 'ALL CAPTURED');
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
