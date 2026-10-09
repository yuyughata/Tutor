const { chromium } = require(process.env.PW);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.GENOVA={demo:true};' }));
  await page.route(/fonts\.googleapis|cdn\.jsdelivr/, (r) => r.abort());
  const out = process.env.OUT; let fails = 0;
  const step = async (n, f) => { try { await f(); console.log('ok  ', n); } catch (e) { fails++; console.log('FAIL', n, e.message.split('\n').slice(0, 4).join(' | ')); await page.screenshot({ path: `${out}/fail-${n.replace(/\W+/g,'-')}.png` }); } };
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
  await step('email: connect, activate, test', async () => {
    await nav('Email').click(); await page.getByRole('heading', { name: 'Resend connection' }).waitFor();
    await page.getByRole('button', { name: 'Activate email' }).click(); await page.getByText('Add your Resend API key first.').waitFor();
    await page.getByLabel('Resend API key').fill('sk_wrong'); await page.getByLabel('From email', { exact: false }).first().fill('hello@custar.com').catch(() => {});
    await page.locator('input[type=email]').first().fill('hello@custar.com');
    await page.getByRole('button', { name: 'Save settings' }).click(); await page.getByText('does not look like a Resend API key').waitFor();
    await page.getByLabel('Resend API key').fill('re_testkey12345678'); await page.getByRole('button', { name: 'Save settings' }).click(); await page.getByText('Settings saved').waitFor();
    await page.getByRole('button', { name: 'Activate email' }).click(); await page.getByText(/Email is on\. Verified/).waitFor();
    await page.getByRole('button', { name: 'Send test email' }).click(); await page.getByText(/Test email sent to/).waitFor();
    await page.screenshot({ path: `${out}/email-connection.png`, fullPage: true });
  });
  await step('email: send broadcast', async () => {
    await page.getByRole('button', { name: 'Send', exact: true }).click(); await page.getByRole('heading', { name: 'Write an email' }).waitFor();
    await page.getByRole('button', { name: /^Send$/ }).last().click();
    await page.getByText('Fill in "Message" first.').waitFor();
    await page.locator('[data-var=message]').fill('# Big news\nNew stories every week!');
    await page.getByRole('button', { name: 'Preview' }).click(); await page.locator('iframe.mail-preview').waitFor({ state: 'visible' });
    await page.screenshot({ path: `${out}/email-send.png`, fullPage: true });
    await page.getByRole('button', { name: /^Send$/ }).last().click(); await page.getByRole('button', { name: 'Send now' }).click();
    await page.getByText(/Sent to \d+ people/).waitFor();
  });
  await step('email: scheduled reminders', async () => {
    await page.getByRole('button', { name: 'Reminders', exact: true }).click(); await page.getByRole('heading', { name: 'Scheduled reminders' }).waitFor();
    await page.getByText('Renewal coming up').first().waitFor(); await page.getByText('Last chance after a missed payment').waitFor();
    const days = page.getByLabel('Days before for Last chance after a missed payment'); await days.fill('9');
    await page.getByRole('button', { name: 'Save' }).nth(1).click(); await page.getByText('Choose a whole number of days from 1 to 4.').waitFor();
    await days.fill('3'); await page.getByRole('button', { name: 'Save' }).nth(1).click(); await page.getByText('Reminder saved').waitFor();
    await page.getByRole('button', { name: 'Check who is due now' }).click(); await page.getByText('3 reminders due today').waitFor();
    await page.getByRole('button', { name: 'Send due reminders now' }).click(); await page.getByRole('button', { name: 'Send now' }).click(); await page.getByText('Sent 3 reminders').waitFor();
    await page.screenshot({ path: `${out}/email-reminders.png`, fullPage: true });
  });
  await step('email: templates and history', async () => {
    await page.getByRole('button', { name: 'Templates', exact: true }).click(); await page.getByRole('heading', { name: 'Welcome' }).waitFor();
    const subj = page.locator('input[type=text]').first(); await subj.fill('Welcome to Genova!'); await page.getByRole('button', { name: 'Save template' }).click(); await page.getByText('Template saved').waitFor();
    await page.screenshot({ path: `${out}/email-templates.png`, fullPage: true });
    await page.getByRole('button', { name: 'History', exact: true }).click(); await page.getByText('parent1@example.com').first().waitFor();
  });
  await step('editor: chapters and Word Explorer', async () => {
    await page.evaluate(() => { location.hash = '#/stories/s3'; });
    await page.getByRole('heading', { name: 'Word Explorer' }).waitFor();
    if (!(await page.getByLabel('This book has chapters').isChecked())) throw new Error('chapters switch should be on for the snow leopard book');
    await page.getByLabel('Chapter title for page 1').waitFor(); await page.getByText('Chapter 1 starts here').waitFor();
    if ((await page.getByLabel('Chapter title for page 1').inputValue()) !== 'The Icy Climb') throw new Error('chapter title not loaded');
    for (const n of [1, 2, 3]) await page.getByLabel(`Word ${n}`, { exact: true }).waitFor();
    await page.getByLabel('Word 2', { exact: true }).fill('zzzz'); await page.getByText(/does not appear in the text of page 2/).waitFor();
    await page.screenshot({ path: `${out}/editor-chapters-words.png`, fullPage: true });
    await page.getByRole('button', { name: /^Spark/ }).click(); await page.getByLabel('Word 2', { exact: true }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: /^Sunrise/ }).click(); await page.getByText(/Sunrise stories are for assisted reading/).waitFor();
    await page.getByRole('button', { name: /^Seeker/ }).click(); await page.getByLabel('Word 3', { exact: true }).waitFor();
    await page.getByLabel('This book has chapters').uncheck(); await page.getByLabel('Chapter title for page 1').waitFor({ state: 'detached' });
    await page.getByLabel('This book has chapters').check(); await page.getByLabel('Chapter title for page 1').waitFor();
  });
  await step('editor: a half-filled word cannot be saved', async () => {
    await page.getByLabel('Word 1', { exact: true }).fill('howled'); await page.getByLabel('Meaning of word 1').fill('');
    await page.getByRole('button', { name: 'Save' }).first().click();
    await page.getByText(/finish each Word Explorer word/).waitFor();
    await page.evaluate(() => { location.hash = '#/stories'; }); await page.waitForTimeout(300);
    const ok = await page.locator('dialog, .toast').count(); void ok;
  });
  await step('readers leaderboard and award', async () => {
    page.on('dialog', (d) => d.accept());
    await nav('Readers').click(); await page.getByRole('heading', { name: 'Top readers' }).waitFor();
    await page.getByRole('row', { name: /Ada/ }).waitFor(); await page.getByLabel('Rank 1').waitFor();
    const first = await page.locator('tbody tr').first().innerText(); if (!/Ada/.test(first)) throw new Error('Ada should lead this week: ' + first);
    await page.getByRole('button', { name: 'All time' }).click(); await page.getByRole('row', { name: /Tobi/ }).waitFor();
    const top = await page.locator('tbody tr').first().innerText(); if (!/Tobi/.test(top)) throw new Error('Tobi should lead all time: ' + top);
    await page.getByRole('button', { name: 'This week' }).click(); await page.getByRole('row', { name: /Ada/ }).waitFor();
    await page.screenshot({ path: `${out}/readers.png`, fullPage: true });
    await page.getByRole('row', { name: /Ada/ }).getByRole('button', { name: 'Give award' }).click(); await page.locator('dialog').waitFor();
    await page.screenshot({ path: `${out}/readers-award.png` });
    await page.locator('dialog').getByRole('button', { name: 'Give award' }).click(); await page.getByText(/Award given and amara@example.com emailed/).waitFor();
    await page.getByRole('row', { name: /Ada/ }).getByText('Awarded').waitFor();
  });
  await step('support inbox', async () => {
    await nav('Support').click(); await page.getByText('I paid yesterday').waitFor();
    await page.screenshot({ path: `${out}/support.png`, fullPage: true });
    await page.getByRole('button', { name: 'Mark resolved' }).click(); await page.getByText('Marked resolved').waitFor(); await page.getByText('All caught up').waitFor();
  });
  console.log(errs.length ? 'page errors: ' + errs.join('|') : 'no page errors', fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close();
})();
