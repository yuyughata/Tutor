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
  await step('delete accounts: typed confirmation, subscription warning, bulk', async () => {
    const dlg = page.locator('dialog').last();
    await page.getByLabel('Delete account tunde@example.com').click(); await dlg.waitFor();
    const del = dlg.getByRole('button', { name: 'Delete account' });
    if (!(await del.isDisabled())) throw new Error('Delete should be disabled until the email is typed');
    await dlg.getByLabel('Type the account email to confirm').fill('wrong@example.com');
    if (!(await del.isDisabled())) throw new Error('Delete should stay disabled for a wrong email');
    await dlg.getByLabel('Type the account email to confirm').fill('tunde@example.com'); await del.click();
    await page.getByText('Account deleted').first().waitFor(); await page.locator('dialog').waitFor({ state: 'detached' }).catch(() => {});
    await page.locator('table').getByText('tunde@example.com').waitFor({ state: 'detached' });
    // a parent with a running subscription: warned first, then can be deleted anyway
    await page.getByLabel('Delete account zainab@example.com').click(); await dlg.waitFor();
    await dlg.getByLabel('Type the account email to confirm').fill('zainab@example.com'); await dlg.getByRole('button', { name: 'Delete account' }).click();
    await dlg.getByText(/active Paystack subscription/).waitFor();
    await dlg.getByLabel(/Delete anyway/).check(); await dlg.getByRole('button', { name: 'Delete account' }).click();
    await page.getByText('Account deleted').first().waitFor();
    await page.locator('table').getByText('zainab@example.com').waitFor({ state: 'detached' });
    // admins cannot be ticked
    if (!(await page.getByLabel('Select you@custar.example').isDisabled())) throw new Error('admin row should not be selectable');
    // bulk: tick two, type DELETE
    await page.getByLabel('Select review@apple.example').check(); await page.getByLabel('Select kofi@example.com').check();
    await page.getByRole('button', { name: 'Delete 2 accounts' }).first().click(); await dlg.waitFor();
    await dlg.getByLabel('Type DELETE to confirm').fill('delete'); await dlg.getByRole('button', { name: 'Delete 2 accounts' }).click();
    await dlg.getByText(/1 deleted\. Not deleted: kofi@example\.com/).waitFor();
    await dlg.getByLabel(/Delete anyway/).check(); await dlg.getByRole('button', { name: 'Delete 2 accounts' }).click();
    await page.getByText('Account deleted').first().waitFor();
    for (const e of ['review@apple.example', 'kofi@example.com']) await page.locator('table').getByText(e).waitFor({ state: 'detached' });
    await page.getByText('amara@example.com').waitFor();
    await page.screenshot({ path: `${out}/delete-accounts.png` });
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
    await page.getByRole('button', { name: 'Activate email' }).click(); await page.getByText('Type the "From email" first').waitFor();
    await page.getByLabel('Resend API key').fill('sk_wrong'); await page.getByLabel('From email', { exact: false }).first().fill('hello@custar.com').catch(() => {});
    await page.locator('input[type=email]').first().fill('hello@custar.com');
    await page.getByRole('button', { name: 'Save settings' }).click(); await page.getByText('does not look like a Resend API key').waitFor();
    // Activate saves what is typed (key + From email) by itself, no separate Save needed
    await page.getByLabel('Resend API key').fill('re_testkey12345678'); await page.getByRole('button', { name: 'Activate email' }).click(); await page.getByText(/Email is on\. Verified/).waitFor();
    await page.getByRole('button', { name: 'Save settings' }).click(); await page.getByText('Settings saved').waitFor();
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
    await page.getByRole('button', { name: /^Sunrise/ }).click(); await page.getByText(/Sunrise stories are for assisted reading, so they have no Word Explorer/).waitFor();
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
  await step('editor: word hunt words (suggest, validate, add, remove; none for Sunrise)', async () => {
    await page.evaluate(() => { location.hash = '#/stories/s2'; });
    await page.getByRole('heading', { name: 'Word hunt', exact: true }).waitFor();
    await page.getByText(/No words yet, so readers will not see a word hunt/).waitFor();
    await page.getByRole('button', { name: 'Suggest from the story' }).click();
    await page.locator('.chips [aria-label^="Remove "]').first().waitFor();
    const n = await page.locator('.chips [aria-label^="Remove "]').count(); if (n < 3 || n > 8) throw new Error('suggestions should be 3 to 8 words, got ' + n);
    await page.getByLabel('Add a word for the word hunt').fill('ox'); await page.getByRole('button', { name: 'Add', exact: true }).click(); await page.getByText(/Use letters only, 3 to 10 of them/).waitFor();
    await page.getByLabel('Add a word for the word hunt').fill('zebra'); await page.keyboard.press('Enter');
    await page.getByLabel('Remove ZEBRA').waitFor();
    await page.getByLabel('Remove ZEBRA').click(); if (await page.getByLabel('Remove ZEBRA').count()) throw new Error('word not removed');
    await page.screenshot({ path: `${out}/editor-word-hunt.png`, fullPage: true });
    await page.addScriptTag({ path: process.env.AXE });
    const v = await page.evaluate(async () => (await axe.run(document.querySelector('.editor'), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => x.id + ':' + x.nodes.map((n) => n.html.slice(0, 90)).join('~')));
    if (v.length) throw new Error('axe: ' + v.join(','));
    await page.getByRole('button', { name: /^Sunrise/ }).click(); await page.getByText(/Sunrise stories are for assisted reading, so they have no word hunt/).waitFor();
    await page.getByRole('button', { name: /^Spark/ }).click(); await page.getByLabel('Add a word for the word hunt').waitFor();
  });
  await step('editor: song upload is made light, previewed, and needs a title', async () => {
    const { execFileSync } = require('child_process');
    const mp3 = `${out}/sample-song.mp3`;
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=40', '-f', 'lavfi', '-i', 'anoisesrc=d=40:c=pink:a=0.05', '-filter_complex', '[0][1]amix=inputs=2,aformat=channel_layouts=stereo', '-ar', '44100', '-b:a', '192k', mp3]);
    const original = require('fs').statSync(mp3).size;
    await page.evaluate(() => { location.hash = '#/stories/s2'; });
    await page.getByRole('heading', { name: 'Song', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Choose an MP3 song' }).waitFor();
    await page.locator('input[type=file][accept^="audio"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
    await page.getByText('Please choose an MP3 file.').waitFor();
    await page.locator('input[type=file][accept^="audio"]').setInputFiles(mp3);
    await page.getByLabel('Song title').waitFor({ timeout: 30000 });
    const title = await page.getByLabel('Song title').inputValue(); if (title !== 'sample song') throw new Error('title should come from the file name, got ' + title);
    const meta = await page.locator('.song-meta').innerText();
    const kb = Number((meta.match(/(\d+) KB/) || [])[1]);
    if (!kb || kb * 1024 > original / 3) throw new Error(`song not light enough: ${meta} (original ${original})`);
    if (!/0:40/.test(meta)) throw new Error('duration missing: ' + meta);
    await page.getByLabel('Song preview').waitFor();
    await page.getByText('Song has a title').waitFor();
    if (!(await page.locator('li.ok', { hasText: 'Song has a title' }).count())) throw new Error('checklist should tick the song title');
    await page.getByLabel('Song title').fill('');
    if (await page.locator('li.ok', { hasText: 'Song has a title' }).count()) throw new Error('empty title must not tick');
    await page.getByLabel('Song title').fill('Luna Lullaby');
    console.log('     song', meta, 'from', Math.round(original / 1024), 'KB');
    await page.screenshot({ path: `${out}/editor-song.png`, fullPage: true });
    await page.addScriptTag({ path: process.env.AXE });
    const v = await page.evaluate(async () => (await axe.run(document.querySelector('.editor'), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => x.id + ':' + x.nodes.map((n) => n.html.slice(0, 90)).join('~')));
    if (v.length) throw new Error('axe: ' + v.join(','));
    await page.getByRole('button', { name: /^Sunrise/ }).click(); await page.getByRole('button', { name: 'Draft', exact: true }).click(); await page.getByRole('button', { name: 'Save' }).first().click(); await page.waitForTimeout(600); const tt = await page.locator('.toast').last().innerText(); if (!/^Saved|^Draft saved/.test(tt)) throw new Error('save: ' + tt);
    await page.getByLabel('Song title').waitFor();
    await page.getByRole('button', { name: 'Remove song' }).click(); await page.getByRole('button', { name: 'Choose an MP3 song' }).waitFor();
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
  await step('requests inbox: GRP spots and title requests from the landing-page forms', async () => {
    await nav('Requests').click(); await page.getByRole('heading', { name: 'Requests' }).waitFor();
    await page.getByRole('button', { name: /Reading Program \(GRP\) spots \(1 new\)/ }).waitFor();
    await page.getByText('Amaka Johnson').waitFor(); await page.getByText('Reads with help').waitFor(); await page.getByText('Evenings').first().waitFor().catch(() => {});
    const wa = await page.getByRole('link', { name: 'WhatsApp' }).first().getAttribute('href');
    if (!/^https:\/\/wa\.me\/2348012345678\?text=/.test(wa)) throw new Error('WhatsApp link: ' + wa);
    await page.screenshot({ path: `${out}/requests.png`, fullPage: true });
    await page.getByRole('button', { name: 'Mark contacted' }).click(); await page.getByText('Marked contacted').waitFor();
    await page.getByRole('button', { name: 'Contacted', exact: true }).click(); await page.getByText('Amaka Johnson').waitFor();
    await page.getByRole('button', { name: /Title requests/ }).click(); await page.getByRole('button', { name: 'New', exact: true }).click();
    await page.getByText('Chidi Okafor').waitFor(); await page.getByText('Amazing Adventures / Combo Pack P1').waitFor();
    await page.getByRole('button', { name: 'Mark done' }).click(); await page.getByText('Marked done').waitFor(); await page.getByText('No new requests').waitFor();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all as CSV' }).click()]);
    if (!/title-requests\.csv$/.test(dl.suggestedFilename())) throw new Error(dl.suggestedFilename());
  });
  console.log(errs.length ? 'page errors: ' + errs.join('|') : 'no page errors', fails ? fails + ' FAILED' : 'ALL PASSED');
  await browser.close();
})();
