const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: process.env.REDUCE ? 'reduce' : 'no-preference' });
  const state = createState();
  await install(ctx, state);
  await ctx.route(/genova\.test/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'genova website' }));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  let fails = 0;
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 9).join(' | ')); await page.screenshot({ path: `${process.env.OUT}/fail-${name.replace(/\W+/g, '-')}.png` }).catch(() => {}); } };
  const text = async () => (await page.locator('body').innerText());
  const noAges = async (where) => { const t = await text(); const m = t.match(/\bAges?\b|\b2\s?[–-]\s?4\b|\b5\s?[–-]\s?8\b|\b9\s?[–-]\s?12\b|\bLittle\b|\bExplorer\b|\bAdventurer\b/); if (m) throw new Error(`${where}: found "${m[0]}"`); };
  const gate = async () => { const t = await page.getByText(/^(one|two|three|four|five|six|seven|eight|nine)(, (one|two|three|four|five|six|seven|eight|nine)){2}$/).first().innerText(); for (const w of t.split(', ')) { await page.getByLabel(w, { exact: true }).click(); await page.waitForTimeout(120); } };
  const tab = (n) => page.getByRole('tab', { name: n, exact: true }).first();
  const audit = async (name) => {
    await page.addScriptTag({ content: AXE }).catch(() => {});
    const r = await page.evaluate(async () => { const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }); return res.violations.map((v) => `${v.id}[${v.impact}]x${v.nodes.length}`); });
    console.log(`  axe ${name}: ${r.length ? r.join(', ') : 'no violations'}`);
  };

  await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
  await step('onboarding shows reading levels, no ages', async () => {
    await page.getByLabel("Reader's name").waitFor();
    for (const t of ['Sunrise', 'Assisted Reader', 'Spark', 'Emergent Reader', 'Seeker', 'Developing Reader']) await page.getByText(t, { exact: true }).first().waitFor({ timeout: 3000 });
    await noAges('onboarding');
    await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Spark', { exact: true }).click();
    await audit('onboarding');
    await page.getByText("Let's read!").click();
  });
  await step('home from backend, no ages', async () => {
    await page.getByText('TITLE OF THE WEEK').waitFor(); await page.getByText('Spark · 4 min').first().waitFor(); await noAges('home');
    if (!state.calls.some((c) => c.path === '/rest/v1/stories')) throw new Error('stories were not fetched');
    await audit('home');
  });
  await step('premium story is locked when signed out', async () => {
    await page.getByLabel(/^Title of the month/i).click(); await page.getByText('Premium story. A grown-up'.slice(0, 18), { exact: false }).first().waitFor();
    await page.getByText('Ask a grown-up', { exact: true }).waitFor(); await noAges('detail'); await audit('story detail (locked)');
    await page.getByLabel('Back').click();
  });
  await step('sign-in screen text and website link', async () => {
    await tab('Grown-ups').click(); await page.getByText('Tap these numbers in order').waitFor(); await gate();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('Use the same email you register with on the Genova website.', { exact: true }).waitFor();
    await audit('sign-in');
    // the "create an account" button sends parents to the website's sign-up page (same tab on web, system browser on a phone)
    const p2 = await ctx.newPage(); await p2.goto('http://localhost:8097/sign-in', { waitUntil: 'networkidle' });
    await p2.getByRole('button', { name: /Create an account on the Genova website/ }).click(); await p2.waitForURL(/genova\.test\/signup/, { timeout: 5000 }); await p2.close();
  });
  await step('wrong password message', async () => {
    await page.getByLabel('Email', { exact: true }).fill('parent@example.com'); await page.getByLabel('Password', { exact: true }).fill('nope-nope'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('That email or password is not right.').waitFor();
  });
  await step('forgot password with emailed code', async () => {
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByText('Forgot your password?').waitFor();
    if ((await page.getByLabel('Email', { exact: true }).last().inputValue()) !== 'parent@example.com') throw new Error('email not carried over');
    await page.getByRole('button', { name: 'Send me a code' }).click(); await page.getByText('Enter the code').waitFor();
    if (state.recoverFor !== 'parent@example.com') throw new Error('recover not requested');
    await page.getByLabel('Code from the email').fill('000000'); await page.getByRole('button', { name: 'Continue' }).click(); await page.getByText(/not right or has expired/).waitFor();
    await page.getByLabel('Code from the email').fill('123456'); await page.getByRole('button', { name: 'Continue' }).click(); await page.getByText('Choose a new password').waitFor();
    await page.getByLabel('New password', { exact: true }).fill('newpass123'); await page.getByLabel('Repeat new password', { exact: true }).fill('different1'); await page.getByRole('button', { name: 'Save new password' }).click(); await page.getByText('do not match').waitFor();
    await page.getByLabel('Repeat new password', { exact: true }).fill('newpass123'); await page.getByRole('button', { name: 'Save new password' }).click(); await page.getByText('All set').waitFor();
    if (state.newPassword !== 'newpass123') throw new Error('password not updated');
    await audit('forgot password');
    await page.getByRole('button', { name: 'Done' }).click();
  });
  await step('premium unlocks after sign-in', async () => {
    state.access = { active: true, status: 'active', plan: 'monthly', current_period_end: new Date(Date.now() + 20 * 864e5).toISOString(), access_until: new Date(Date.now() + 25 * 864e5).toISOString(), in_grace: false };
    await page.waitForTimeout(500); await tab('Home').click(); await tab('Grown-ups').click(); await page.getByText('Premium is active').waitFor({ timeout: 6000 }); await audit('grown-ups (premium)');
  });
  await step('privacy policy pop-up', async () => {
    await page.getByRole('button', { name: 'Read our privacy policy' }).click(); await page.getByText('Version 3').waitFor(); await page.getByText('Our promise to families').waitFor();
    await audit('privacy policy'); await page.getByRole('button', { name: 'Close' }).click();
  });
  await step('read premium story + save for offline', async () => {
    await tab('Home').click(); await page.getByLabel(/^Title of the month/i).click(); await page.getByText('Start reading').waitFor();
    await page.getByRole('button', { name: 'Save for offline' }).click(); await page.getByText(/Saved for offline/).first().waitFor({ timeout: 6000 }); await audit('story detail (saved)');
    await page.getByText('Start reading').click(); await page.getByText('Ember was a dragon with a secret.').waitFor(); await audit('reader');
    await page.getByLabel('Close story').click(); await page.getByLabel('Back').click();
  });
  await step('my books: saved tab, search', async () => {
    await tab('My books').click(); await page.getByRole('button', { name: 'Saved' }).click(); await page.getByText('The Dragon Who Hated Fire').first().waitFor();
    await page.getByLabel('Search my books').fill('zzz'); await page.getByText('No matches').waitFor(); await page.getByLabel('Search my books').fill(''); await audit('my books');
  });
  await step('backend down: catalogue from cache, saved story still reads', async () => {
    state.down = true; await page.reload({ waitUntil: 'networkidle' });
    await tab('Home').click();
    await page.getByText('TITLE OF THE WEEK').waitFor({ timeout: 8000 }); await page.getByText('Luna and the Firefly').first().waitFor();
    await tab('My books').click(); await page.getByRole('button', { name: 'Saved' }).click();
    await page.getByRole('button', { name: /^The Dragon Who Hated Fire/ }).last().click();
    await page.getByText('Start reading').click(); await page.getByText('Ember was a dragon with a secret.').waitFor({ timeout: 6000 });
    await page.getByLabel('Close story').click(); await page.getByLabel('Back').click();
  });
  await step('backend down: unsaved story shows a clear error, not "premium"', async () => {
    await tab('Home').click(); await page.getByText('Luna and the Firefly').first().click(); await page.getByText('Start reading').click();
    await page.getByText("Can't open this story").waitFor({ timeout: 8000 }); await page.getByRole('button', { name: 'Back' }).click(); await page.getByLabel('Back').click();
  });
  await step('privacy policy falls back to the saved copy when offline', async () => {
    await tab('Grown-ups').click(); await page.getByText('Tap these numbers in order').waitFor(); await gate();
    await page.getByRole('button', { name: 'Read our privacy policy' }).click(); await page.getByText(/saved copy/).waitFor({ timeout: 6000 }); await page.getByText('Our promise to families').waitFor();
  });
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
