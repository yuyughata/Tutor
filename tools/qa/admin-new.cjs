const { chromium } = require(process.env.PW);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.GENOVA={demo:true};' }));
  await page.route(/fonts\.googleapis|cdn\.jsdelivr/, (r) => r.abort());
  const out = process.env.OUT; let fails = 0;
  const step = async (n, f) => { try { await f(); console.log('ok  ', n); } catch (e) { fails++; console.log('FAIL', n, e.message.split('\n')[0]); await page.screenshot({ path: `${out}/fail-${n.replace(/\W+/g,'-')}.png` }); } };
  const nav = (n) => page.locator('.nav').getByRole('link', { name: n });
  await page.goto('http://localhost:8098/admin/index.html', { waitUntil: 'load' });
  await page.getByPlaceholder('you@custar.com').fill('barry@custar.com'); await page.getByPlaceholder('Password').fill('secret123'); await page.getByRole('button', { name: 'Sign in' }).click();
  await page.locator('.nav').waitFor();
  await step('access dialog', async () => {
    await nav('Subscribers').click(); await page.getByText('amara@example.com').waitFor();
    await page.getByRole('button', { name: 'Access' }).nth(1).click(); await page.locator('dialog').waitFor();
    await page.locator('dialog select').selectOption('canceled'); await page.getByRole('button', { name: 'Save access' }).click();
    await page.getByText('Access updated').waitFor();
  });
  await step('password reset email', async () => {
    await page.getByRole('button', { name: 'Password' }).first().click(); await page.locator('dialog').waitFor();
    await page.locator('dialog').getByRole('button', { name: 'Send reset email' }).click();
    await page.locator('dialog').last().getByRole('button', { name: 'Send', exact: true }).click();
    await page.getByText(/Reset email sent to/).waitFor();
    await page.screenshot({ path: `${out}/pw1.png` });
  });
  await step('temp password', async () => {
    await page.getByRole('button', { name: 'Set temporary password' }).click();
    await page.getByRole('button', { name: 'Set password' }).click();
    await page.getByText(/Password set\. Share it/).waitFor();
    await page.screenshot({ path: `${out}/pw2.png` });
    await page.getByRole('button', { name: 'Done' }).click();
  });
  await step('settings privacy editor', async () => {
    await nav('Settings').click(); await page.getByRole('heading', { name: 'Privacy policy', exact: true }).waitFor();
    const ta = page.getByLabel('Privacy policy text'); await ta.fill((await ta.inputValue()) + '\n\n# Contact\nEmail us.');
    await page.locator('.card h1, .card h2, .card h3').filter({ hasText: 'Contact' }).first().waitFor();
    await page.getByRole('button', { name: 'Publish update' }).click();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByText(/Privacy policy updated \(version/).waitFor();
    await page.getByText('Set temporary password').first().waitFor().catch(() => {});
    await page.screenshot({ path: `${out}/settings.png`, fullPage: true });
  });
  await step('levels filter', async () => {
    await nav('Stories').click(); await page.getByText('Luna and the Firefly').first().waitFor();
    const txt = await page.locator('body').innerText();
    if (/\b(2-4|5-8|9-12|Ages?)\b/.test(txt)) throw new Error('age text visible: ' + txt.match(/.{20}\b(2-4|5-8|9-12|Ages?)\b.{20}/)?.[0]);
  });
  console.log(errs.length ? 'page errors: ' + errs.join('|') : 'no page errors', fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close();
})();
