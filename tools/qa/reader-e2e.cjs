// Reader features: chapters, Word Explorer, long page text scrolling, reading stats. Needs the app web export on :8097.
const { chromium } = require(process.env.PW);
const { install, createState, LONG } = require('./mockbackend.cjs');
const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const state = createState();
  await install(ctx, state);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  let fails = 0;
  const out = process.env.OUT || '.';
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 9).join(' | ')); await page.screenshot({ path: `${out}/fail-${name.replace(/\W+/g, '-')}.png` }).catch(() => {}); } };
  const tab = (n) => page.getByRole('tab', { name: n, exact: true }).first();
  const audit = async (name) => {
    await page.addScriptTag({ content: AXE }).catch(() => {});
    const r = await page.evaluate(async () => { const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }); return res.violations.map((v) => `${v.id}[${v.impact}]x${v.nodes.length} :: ` + v.nodes.slice(0, 2).map((n) => n.html.slice(0, 160) + ' => ' + (n.any[0]?.message || n.all[0]?.message || '')).join(' || ')); });
    console.log(`  axe ${name}: ${r.length ? r.join(', ') : 'no violations'}`);
    if (r.length) throw new Error('axe violations in ' + name);
  };
  const shot = (n) => page.screenshot({ path: `${out}/r-${n}.png` });

  await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
  await step('onboard as a Seeker and open the chaptered book', async () => {
    await page.getByLabel("Reader's name").fill('Ada'); await page.getByText('Seeker', { exact: true }).click(); await page.getByText("Let's read!").click();
    await page.getByText('TITLE OF THE WEEK').waitFor();
    await page.getByText('The Snow Trek').first().click();
  });
  await step('story page lists the chapters and the new words', async () => {
    await page.getByRole('heading', { name: 'Chapters' }).waitFor();
    await page.getByText('The Icy Climb', { exact: true }).waitFor(); await page.getByText('The Cave', { exact: true }).waitFor();
    await page.getByText('3 new words to explore').waitFor(); await page.getByText('howled · silent · cavern').waitFor();
    await shot('detail'); await audit('story detail (chapters + words)');
  });
  await step('start reading: chapter heading, glowing word opens the Word Explorer', async () => {
    await page.getByRole('button', { name: /^Start reading/ }).click();
    await page.getByText('CHAPTER 1', { exact: true }).waitFor(); await page.getByText('The Icy Climb', { exact: true }).last().waitFor();
    await page.getByRole('button', { name: /^howled\. New word/ }).waitFor();
    await shot('page1'); await audit('reader page with chapter + word');
    await page.getByRole('button', { name: /^howled\. New word/ }).click();
    await page.getByRole('dialog', { name: 'Word explorer' }).waitFor(); await page.getByText('made a long, loud sound').waitFor(); await page.getByText('“The wolf howled.”').waitFor();
    await page.waitForTimeout(700); await shot('word-sheet'); await audit('word sheet');
    await page.getByRole('button', { name: 'I learned it' }).click(); await page.getByRole('button', { name: 'Learned!' }).waitFor();
    if (!state.calls.some((c) => c.path === '/rest/v1/child_words' && c.method === 'POST')) throw new Error('learned word was not synced');
    await page.getByRole('button', { name: 'Close word explorer' }).click();
    await page.getByRole('button', { name: 'Explore the word howled' }).waitFor();
  });
  await step('long page text scrolls and the last line is reachable', async () => {
    await page.getByLabel('Next page').click();
    await page.getByText(/Sentence 1:/).waitFor(); await page.waitForTimeout(900); // let the page finish sliding in
    const info = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && d.textContent.includes('Sentence 1:') && /auto|scroll/.test(getComputedStyle(d).overflowY)).pop();
      if (!el) return null;
      return { sh: el.scrollHeight, ch: el.clientHeight, top: el.scrollTop };
    });
    if (!info) throw new Error('no scrollable container holds the long text');
    console.log('  scroller:', JSON.stringify(info));
    await shot('long-top');
    let box = await page.getByText(/Sentence 1:/).boundingBox();
    for (let i = 0; i < 30 && Math.abs(box.x - 24) > 2; i++) { await page.waitForTimeout(200); box = await page.getByText(/Sentence 1:/).boundingBox(); }
    await page.mouse.move(box.x + 40, box.y + 40);
    console.log('  at point:', await page.evaluate((pt) => { const chain = []; let n = document.elementFromPoint(pt.x, pt.y); while (n && chain.length < 6) { chain.push(n.tagName + ' oy=' + getComputedStyle(n).overflowY + ' ' + n.scrollTop + '/' + n.scrollHeight + '/' + n.clientHeight); n = n.parentElement; } return chain.join(' < '); }, { x: box.x + 40, y: box.y + 40 }), JSON.stringify(box));
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(120); }
    const after = await page.evaluate(() => { const el = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && d.textContent.includes('Sentence 1:') && /auto|scroll/.test(getComputedStyle(d).overflowY)).pop(); return el ? el.scrollTop : -1; });
    if (!(after > 100)) throw new Error('wheel did not scroll the text, scrollTop=' + after);
    const last = await page.getByText(/THE-VERY-LAST-LINE/).boundingBox();
    const bar = await page.getByLabel('Next page').boundingBox();
    console.log('  last line bottom', Math.round(last.y + last.height), 'next-button top', Math.round(bar.y));
    if (last.y + last.height > bar.y - 4) throw new Error('last line hides behind the bottom bar');
    await shot('long-bottom');
  });
  await step('chapter picker jumps to chapter 2', async () => {
    await page.getByRole('button', { name: /^Chapter 1: The Icy Climb/ }).first().click();
    await page.getByRole('dialog', { name: 'Chapters' }).waitFor(); await page.waitForTimeout(700); await shot('chapter-sheet'); await audit('chapter sheet');
    await page.getByRole('button', { name: 'Chapter 2: The Cave', exact: true }).click();
    await page.getByText('CHAPTER 2', { exact: true }).waitFor(); await page.getByText(/Deep inside the/).waitFor();
    await page.getByRole('button', { name: /^cavern\. New word/ }).waitFor();
    await page.getByLabel('Next page').click();
    await page.getByText('CHAPTER 2 · THE CAVE').waitFor(); // later pages of a chapter keep a small label
  });
  await step('The End: words explored and stories finished this week', async () => {
    await page.getByLabel('Next page').click();
    await page.getByText('The End', { exact: true }).waitFor(); await page.getByText('1 story finished this week').waitFor();
    await page.getByText('Your new words').waitFor();
    await page.getByRole('button', { name: /^howled, learned/ }).waitFor();
    await page.getByText('NEW BADGES!').waitFor();
    for (const t of ['First story', 'Chapter reader', 'Word finder']) await page.getByText(t, { exact: true }).waitFor();
    if (await page.getByText('Word wizard', { exact: true }).count()) throw new Error('Word wizard needs 10 words');
    await shot('end'); await audit('the end');
    if (!state.calls.some((c) => c.path === '/rest/v1/story_completions' && c.method === 'POST')) throw new Error('completion was not synced');
    const n = state.calls.filter((c) => c.path === '/rest/v1/story_completions' && c.method === 'POST').length;
    await page.getByLabel('Previous page').click(); await page.getByLabel('Next page').click(); await page.waitForTimeout(300);
    if (state.calls.filter((c) => c.path === '/rest/v1/story_completions' && c.method === 'POST').length !== n) throw new Error('same-day re-finish should not be sent twice');
  });
  await step('My books: week / month / all-time counts, Words tab', async () => {
    await page.getByLabel('Close story').click(); await page.getByLabel('Back').click();
    await page.reload({ waitUntil: 'networkidle' });
    await tab('My books').click();
    await page.getByText('This week', { exact: true }).waitFor(); await page.getByText('This month', { exact: true }).waitFor(); await page.getByText('All time', { exact: true }).waitFor();
    await page.getByLabel('Stories finished: 1 this week, 1 this month, 1 in total').waitFor();
    await page.getByRole('heading', { name: 'Badges' }).waitFor(); await page.getByText('3 of 9').waitFor();
    if (await page.getByText('Weekly reading goal').count()) throw new Error('the weekly goal is switched off');
    await page.getByLabel(/^First story, earned\./).waitFor(); await page.getByLabel(/^Explorer, not earned yet/).waitFor();
    if (await page.getByText('NEW', { exact: true }).count()) throw new Error('badges shown on The End must not be tagged new again');
    await shot('my-books-badges'); await audit('my books (badges, goal)');
    await page.getByRole('button', { name: 'Words' }).click();
    await page.getByText('Your word garden: a sprout').waitFor(); await page.getByText('2 more words to grow into a leafy plant').waitFor(); await page.getByText('1 word explored').waitFor(); await page.getByText('made a long, loud sound').waitFor(); await page.getByText('from The Snow Trek').waitFor();
    await shot('my-books-words'); await audit('my books (words)');
  });
  await step('detail "chapter 2" opens the reader at that chapter', async () => {
    await tab('Home').click(); await page.getByText('The Snow Trek').first().click();
    await page.getByRole('button', { name: /^Read chapter 2: The Cave/ }).click();
    await page.getByText('CHAPTER 2', { exact: true }).waitFor(); await page.getByText(/Deep inside the/).waitFor();
  });
  await step('The End: star burst plays with motion, and is skipped with reduced motion', async () => {
    const reach = async (reduced) => {
      const c2 = await browser.newContext({ viewport: { width: 390, height: 780 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await install(c2, createState());
      const p2 = await c2.newPage();
      await p2.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
      await p2.getByLabel("Reader's name").fill('Bo'); await p2.getByText('Seeker', { exact: true }).click(); await p2.getByText("Let's read!").click();
      await p2.getByText('The Snow Trek').first().click();
      await p2.getByRole('button', { name: /^Read chapter 2: The Cave/ }).click();
      await p2.getByText('CHAPTER 2', { exact: true }).waitFor();
      await p2.getByLabel('Next page').click(); await p2.waitForTimeout(1200); await p2.getByLabel('Next page').click();
      await p2.getByText('The End', { exact: true }).waitFor({ timeout: 8000 });
      await p2.waitForTimeout(250);
      const n = await p2.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.children.length === 0 && /^[⭐✨🌟]$/u.test(d.textContent.trim())).length);
      const card = await p2.getByText('NEW BADGE', { exact: false }).count();
      await c2.close();
      return { n, card };
    };
    const moving = await reach(false); const still = await reach(true);
    console.log('  burst pieces with motion:', moving.n, ' with reduced motion:', still.n, ' badge card:', moving.card);
    if (moving.n - still.n !== 10) throw new Error(`the burst should add 10 star pieces (with motion ${moving.n}, reduced ${still.n})`);
    if (!moving.card || !still.card) throw new Error('new badge card should show either way');
  });
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
