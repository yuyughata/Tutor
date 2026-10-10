// App screenshots for chapters, Word Explorer, badges, word garden and rewards (a Seeker reader on the fake backend).
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const out = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const state = createState(); await install(ctx, state);
  await ctx.route(/genova\.test/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'site' }));
  const page = await ctx.newPage(); let failures = 0;
  const shot = async (n) => { await page.waitForTimeout(800); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { failures++; console.log('FAIL', name, '-', e.message.split('\n')[0]); await shot('fail-' + name.replace(/\W+/g, '-')).catch(() => {}); } };
  const tab = (n) => page.getByRole('tab', { name: n, exact: true }).first();
  const gate = async () => { const t = await page.getByText(/^(one|two|three|four|five|six|seven|eight|nine)(, (one|two|three|four|five|six|seven|eight|nine)){2}$/).first().innerText(); for (const w of t.split(', ')) { await page.getByLabel(w, { exact: true }).click(); await page.waitForTimeout(150); } };

  await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
  await step('onboard', async () => { await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Seeker', { exact: true }).click(); await page.getByLabel('owl').click(); await page.getByText("Let's read!").click(); await page.getByText('TITLE OF THE WEEK').waitFor(); });
  await step('detail', async () => { await page.getByText('The Snow Trek').first().click(); await page.getByRole('heading', { name: 'Chapters' }).waitFor(); await page.mouse.move(195, 500); await page.mouse.wheel(0, 330); await shot('m36-story-chapters-words'); });
  await step('reader page', async () => { await page.mouse.wheel(0, -2000); await page.getByRole('button', { name: /^Start reading/ }).click(); await page.getByText('CHAPTER 1', { exact: true }).waitFor(); await shot('m37-reader-chapter-word'); });
  await step('word sheet', async () => { await page.getByRole('button', { name: /^howled\. New word/ }).click(); await page.getByRole('dialog', { name: 'Word explorer' }).waitFor(); await page.waitForTimeout(500); await shot('m38-word-sheet'); await page.getByRole('button', { name: 'I learned it' }).click(); await page.getByRole('button', { name: 'Close word explorer' }).click(); });
  await step('long text', async () => { await page.getByLabel('Next page').click(); await page.getByText(/Sentence 1:/).waitFor(); await page.waitForTimeout(600); const b = await page.getByText(/Sentence 1:/).boundingBox(); await page.mouse.move(b.x + 40, b.y + 40); for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(100); } await shot('m40-long-text-scrolls'); });
  await step('chapter sheet', async () => { await page.getByRole('button', { name: /^Chapter 1: The Icy Climb/ }).first().click(); await page.getByRole('dialog', { name: 'Chapters' }).waitFor(); await page.waitForTimeout(500); await shot('m39-chapter-sheet'); await page.getByRole('button', { name: 'Chapter 2: The Cave', exact: true }).click(); await page.getByText('CHAPTER 2', { exact: true }).waitFor(); });
  await step('the end', async () => { await page.getByLabel('Next page').click(); await page.getByLabel('Next page').click(); await page.getByText('The End', { exact: true }).waitFor(); await shot('m41-end-words-stats'); });
  await step('learn the other words', async () => {
    for (const w of ['silent', 'cavern']) { await page.getByRole('button', { name: new RegExp('^' + w + '(, learned)?\\. Tap to see') }).click(); await page.getByRole('button', { name: 'I learned it' }).click(); await page.getByRole('button', { name: 'Close word explorer' }).click(); await page.waitForTimeout(300); }
    await page.getByLabel('Close story').click(); await page.getByLabel('Back').click();
  });
  await step('sign in for rewards', async () => {
    await tab('Grown-ups').click(); await page.getByText('Tap these numbers in order').waitFor(); await gate();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByLabel('Email', { exact: true }).fill('parent@example.com'); await page.getByLabel('Password', { exact: true }).fill('secret123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByText('Premium is active').or(page.getByText(/Free plan|Signed in/)).first().waitFor({ timeout: 8000 }).catch(() => {});
    if (await page.getByText('Not now', { exact: true }).count()) await page.getByText('Not now', { exact: true }).click();
    state.awards = [{ kind: 'week', period_label: '2026-W41', stories: 3, note: 'Well done, Ada! Three stories this week.', created_at: new Date().toISOString() }];
    await page.reload({ waitUntil: 'networkidle' });
  });
  await step('my books', async () => {
    await page.waitForTimeout(800); if (await page.getByText('Tap these numbers in order').count()) await page.getByText('Cancel', { exact: true }).click();
    await tab('My books').click(); await page.getByRole('heading', { name: 'Badges' }).waitFor(); await page.getByText('Top reader of the week').waitFor({ timeout: 6000 }); await shot('m43-mybooks-badges');
    await page.getByRole('button', { name: 'Words' }).click(); await page.getByText(/Your word garden/).waitFor(); await shot('m42-mybooks-words');
  });
  console.log(failures ? failures + ' FAILED' : 'ALL CAPTURED'); await browser.close();
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
