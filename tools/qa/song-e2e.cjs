// Song feature in the app: hints while reading, the song loads at the start, it unlocks on The End and plays on tap.
// Needs the app web export on :8097 (see README).
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const out = process.env.OUT || '.';
  let fails = 0;
  const open = async (over = {}, reduced = true) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const state = createState(over); await install(ctx, state);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
    await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
    await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Spark', { exact: true }).click(); await page.getByText("Let's read!").click();
    await page.getByText('TITLE OF THE WEEK').waitFor();
    return { ctx, state, page, errors };
  };
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 8).join(' | ')); } };
  const audit = async (page, name) => {
    await page.addScriptTag({ content: AXE }).catch(() => {});
    const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => `${v.id}x${v.nodes.length} :: ` + v.nodes.slice(0, 2).map((n) => n.html.slice(0, 140)).join(' || ')));
    console.log(`  axe ${name}: ${r.length ? r.join(', ') : 'no violations'}`);
    if (r.length) throw new Error('axe violations in ' + name);
  };
  const songGets = (state) => state.calls.filter((c) => c.method === 'GET' && c.path.startsWith('/storage/v1/object/sign/songs/')).length;

  const a = await open();
  const { page, state } = a;
  await step('story page tells the reader it has a song', async () => {
    await page.getByText('Luna and the Firefly').first().click();
    await page.getByText('Has a song', { exact: true }).waitFor();
    await page.screenshot({ path: `${out}/song-detail.png` });
  });
  await step('hint on page 1 and the song is already loading before the end', async () => {
    await page.getByRole('button', { name: /^Start reading/ }).click();
    await page.getByText('A little song is waiting for you at the end').waitFor();
    for (let i = 0; i < 30 && !songGets(state); i++) await page.waitForTimeout(100);
    if (!songGets(state)) throw new Error('the song file was not requested while reading page 1');
    if (!state.calls.some((c) => c.method === 'POST' && c.path.startsWith('/storage/v1/object/sign/songs/'))) throw new Error('no signed link requested');
    await page.screenshot({ path: `${out}/song-hint-first.png` }); await audit(page, 'reader page with song hint');
  });
  await step('last page reminds the reader the song is next', async () => {
    await page.getByLabel('Next page').click();
    await page.getByText('Last page! Turn it to unlock your song').waitFor();
    await page.screenshot({ path: `${out}/song-hint-last.png` });
  });
  await step('The End: song unlocked, plays only when tapped, shows progress', async () => {
    await page.getByLabel('Next page').click();
    await page.getByText('SONG UNLOCKED!').waitFor(); await page.getByText('The Firefly Song', { exact: true }).waitFor();
    const play = page.getByRole('button', { name: 'Play the song The Firefly Song' });
    await play.waitFor(); await page.waitForTimeout(800);
    if (await play.isDisabled()) throw new Error('the song should be loaded and ready by The End');
    await page.getByText(/^0:00 \/ 0:0[5-9]/).waitFor();
    await page.screenshot({ path: `${out}/song-end.png` }); await audit(page, 'The End with the song card');
    await play.click();
    await page.getByRole('button', { name: 'Pause the song The Firefly Song' }).waitFor();
    await page.waitForTimeout(1600);
    const t = await page.getByText(/^\d:\d\d \/ \d:\d\d$/).innerText();
    if (/^0:00 /.test(t)) throw new Error('time did not advance: ' + t);
    console.log('  playing:', t);
    await page.screenshot({ path: `${out}/song-playing.png` });
    await page.getByRole('button', { name: 'Pause the song The Firefly Song' }).click();
    await page.getByRole('button', { name: 'Play the song The Firefly Song' }).waitFor();
  });
  await step('going back a page stops the song', async () => {
    await page.getByRole('button', { name: 'Play the song The Firefly Song' }).click();
    await page.getByRole('button', { name: 'Pause the song The Firefly Song' }).waitFor();
    await page.getByLabel('Previous page').click();
    await page.getByLabel('Next page').click();
    await page.getByRole('button', { name: 'Play the song The Firefly Song' }).waitFor({ timeout: 4000 });
  });
  await step('stories without a song show no hint and no card', async () => {
    await page.getByLabel('Close story').click(); await page.getByLabel('Back').click();
    await page.getByText('Bedtime for Bear').first().click();
    if (await page.getByText('Has a song', { exact: true }).count()) throw new Error('Bear has no song');
    await page.getByRole('button', { name: /^Start reading/ }).click();
    await page.getByText('Bear yawned a great big yawn.').waitFor();
    if (await page.getByText(/song/i).count()) throw new Error('no song text expected on a story without a song');
    await page.getByLabel('Next page').click(); await page.getByLabel('Next page').click(); await page.getByText('The End', { exact: true }).waitFor();
    if (await page.getByText('SONG UNLOCKED!').count()) throw new Error('no song card expected');
  });
  console.log(a.errors.length ? 'page errors: ' + a.errors.join(' | ') : 'no page errors');
  await a.ctx.close();

  const b = await open({ songDown: true });
  await step('if the song cannot be fetched the reader never sees a hint or a card', async () => {
    await b.page.getByText('Luna and the Firefly').first().click();
    await b.page.getByRole('button', { name: /^Start reading/ }).click();
    await b.page.getByText('Late one evening, Luna sat by her window.').waitFor(); await b.page.waitForTimeout(800);
    if (await b.page.getByText(/song is waiting/i).count()) throw new Error('hint shown without a song');
    await b.page.getByLabel('Next page').click(); await b.page.getByLabel('Next page').click(); await b.page.getByText('The End', { exact: true }).waitFor();
    if (await b.page.getByText('SONG UNLOCKED!').count()) throw new Error('card shown without a song');
  });
  await b.ctx.close();

  const c = await open({}, false);
  await step('hint fades in with motion on', async () => {
    await c.page.getByText('Luna and the Firefly').first().click(); await c.page.getByRole('button', { name: /^Start reading/ }).click();
    await c.page.getByText('A little song is waiting for you at the end').waitFor();
  });
  await c.ctx.close();

  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
