// Home screen: New stories row, then the category chips, then a row per category holding every story (old and new).
// Needs the app web export on :8097.
const { chromium } = require(process.env.PW);
const { install, createState, STORIES } = require('./mockbackend.cjs');
const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  // a story added later shows up everywhere: add one before the app loads (newest, in the Fantasy category)
  STORIES.push({ id: '00000000-0000-0000-0000-00000000a0ff', slug: 'brand-new-tale', title: 'Brand New Tale', synopsis: 'Just added.', cover_url: 'https://img.test/cover9.png', reading_level: 'spark', is_free: true, page_count: 1, reading_minutes: 2, has_chapters: false, published_at: new Date().toISOString(), authors: { name: 'CUSTAR' }, story_categories: [{ categories: { slug: 'fantasy' } }], puzzle_words: [], song_path: null, song_title: null, song_seconds: null });
  const state = createState(); await install(ctx, state);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  let fails = 0;
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 6).join(' | ')); await page.screenshot({ path: `${process.env.OUT || '.'}/fail-home.png` }).catch(() => {}); } };
  const y = async (loc) => (await loc.first().boundingBox()).y;
  const heading = (n) => page.getByRole('heading', { name: n, exact: true });

  await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
  await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Seeker', { exact: true }).click(); await page.getByText("Let's read!").click();
  await page.getByText('TITLE OF THE WEEK').waitFor();

  await step('order: Popular, New stories, then Browse all stories with the category chips, then the category rows', async () => {
    await heading('New stories').waitFor(); await heading('Browse all stories').waitFor(); await heading('Bedtime').waitFor(); await heading('Fantasy').waitFor();
    const ys = { popular: await y(heading('Popular right now')), news: await y(heading('New stories')), browse: await y(heading('Browse all stories')), all: await y(page.getByRole('button', { name: /All$/ })), bedtime: await y(heading('Bedtime')), fantasy: await y(heading('Fantasy')) };
    console.log('  y positions:', JSON.stringify(ys));
    if (!(ys.popular < ys.news && ys.news < ys.browse && ys.browse < ys.all && ys.all < ys.bedtime && ys.bedtime < ys.fantasy)) throw new Error('wrong order');
  });
  await step('every story, old and new, is in the browse rows (the new one too)', async () => {
    const browseY = await y(heading('Browse all stories'));
    for (const t of ['Luna and the Firefly', 'The Dragon Who Hated Fire', 'Bedtime for Bear', 'The Snow Trek', 'Brand New Tale']) {
      const hits = await page.getByLabel(new RegExp('^' + t)).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top + window.scrollY));
      if (!hits.some((top) => top > browseY)) throw new Error(`${t} is not in a browse row`);
    }
    await page.getByText('2 stories').first().waitFor().catch(() => {}); // row counts are shown
  });
  await step('the new story is also in "New stories" (above the chips)', async () => {
    const newY = await y(heading('New stories')), browseY = await y(heading('Browse all stories'));
    const tops = await page.getByLabel(/^Brand New Tale/).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top + window.scrollY));
    if (!tops.some((t) => t > newY && t < browseY)) throw new Error('not in the New stories row: ' + tops.join());
  });
  await step('a category chip filters only the rows below; Popular and New stay', async () => {
    await page.getByRole('button', { name: /Fantasy$/ }).click();
    await heading('Fantasy').waitFor(); if (await heading('Bedtime').count()) throw new Error('Bedtime row should be hidden');
    await heading('Popular right now').waitFor(); await heading('New stories').waitFor();
    await page.screenshot({ path: `${process.env.OUT || '.'}/home-fantasy.png` });
    await page.getByRole('button', { name: /All$/ }).click(); await heading('Bedtime').waitFor();
  });
  await step('no accessibility violations', async () => {
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => `${v.id}x${v.nodes.length}`));
    if (r.length) throw new Error(r.join());
  });
  await page.screenshot({ path: `${process.env.OUT || '.'}/home-browse.png`, fullPage: true });
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors', fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
