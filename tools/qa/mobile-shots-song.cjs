// App screenshots for the song feature (a Spark reader on the fake backend): story page, hint, The End with the song card.
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const out = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const state = createState(); await install(ctx, state);
  const page = await ctx.newPage(); let failures = 0;
  const shot = async (n) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { failures++; console.log('FAIL', name, '-', e.message.split('\n')[0]); } };
  await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
  await step('onboard', async () => { await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Spark', { exact: true }).click(); await page.getByLabel('owl').click(); await page.getByText("Let's read!").click(); await page.getByText('TITLE OF THE WEEK').waitFor(); });
  await step('detail', async () => { await page.getByText('Luna and the Firefly').first().click(); await page.getByText('Has a song', { exact: true }).waitFor(); await shot('m44-story-has-song'); });
  await step('hint', async () => { await page.getByRole('button', { name: /^Start reading/ }).click(); await page.getByText('A little song is waiting for you at the end').waitFor(); await shot('m45-reader-song-hint'); });
  await step('last page', async () => { await page.getByLabel('Next page').click(); await page.getByText('Last page! Turn it to unlock your song').waitFor(); await page.waitForTimeout(600); await shot('m46-reader-song-last'); });
  await step('end', async () => {
    await page.getByLabel('Next page').click(); await page.getByText('SONG UNLOCKED!').waitFor(); await page.waitForTimeout(800);
    await shot('m47-end-song-ready');
    await page.getByRole('button', { name: 'Play the song The Firefly Song' }).click(); await page.getByRole('button', { name: 'Pause the song The Firefly Song' }).waitFor(); await page.waitForTimeout(1500);
    await shot('m48-end-song-playing');
  });
  console.log(failures ? failures + ' FAILED' : 'ALL CAPTURED');
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
