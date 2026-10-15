// Word hunt (post-story word search): Spark easy, Seeker harder, shuffled every attempt, solvable, accessible.
// Needs the app web export on :8097.
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const out = process.env.OUT || '.';
  let fails = 0;
  const open = async (level) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const state = createState(); await install(ctx, state);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
    await page.goto('http://localhost:8097/', { waitUntil: 'networkidle' });
    await page.getByLabel("Reader's name").fill('Ada'); await page.getByText(level, { exact: true }).click(); await page.getByText("Let's read!").click();
    await page.getByText('TITLE OF THE WEEK').waitFor();
    return { ctx, page, errors };
  };
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 8).join(' | ')); } };
  const audit = async (page, name) => {
    await page.addScriptTag({ content: AXE }).catch(() => {});
    const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => `${v.id}x${v.nodes.length} :: ` + v.nodes.slice(0, 2).map((n) => n.html.slice(0, 140)).join(' || ')));
    console.log(`  axe ${name}: ${r.length ? r.join(', ') : 'no violations'}`);
    if (r.length) throw new Error('axe violations in ' + name);
  };
  const toEnd = async (page, title, pages) => {
    await page.getByText(title).first().click(); await page.getByRole('button', { name: /^Start reading/ }).click();
    for (let i = 0; i < pages; i++) { await page.getByLabel('Next page').click(); await page.waitForTimeout(250); }
    await page.getByText('The End', { exact: true }).waitFor();
  };
  // read the grid and the word list from the screen
  const read = async (page) => page.evaluate(() => {
    const cells = [...document.querySelectorAll('[aria-label*=", row "]')].map((e) => { const m = /^([A-Z]), row (\d+), column (\d+)/.exec(e.getAttribute('aria-label')); return m ? { l: m[1], r: +m[2] - 1, c: +m[3] - 1, el: null } : null; }).filter(Boolean);
    const size = Math.max(...cells.map((x) => x.r)) + 1;
    const words = [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((l) => /^[A-Z]{3,10}(, found)?$/.test(l)).map((l) => l.replace(', found', ''));
    return { size, grid: Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => cells.find((x) => x.r === r && x.c === c).l)), words };
  });
  const DIRS = [[0, 1], [1, 0], [1, 1]]; // words only ever read FORWARDS: across, down, or diagonally down-right (never backwards)
  const locate = (grid, word) => {
    const n = grid.length;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of DIRS) {
      let ok = true; for (let i = 0; i < word.length && ok; i++) { const rr = r + dr * i, cc = c + dc * i; if (rr < 0 || cc < 0 || rr >= n || cc >= n || grid[rr][cc] !== word[i]) ok = false; }
      if (ok) return { a: [r, c], b: [r + dr * (word.length - 1), c + dc * (word.length - 1)], dir: [dr, dc] };
    }
    return null;
  };
  const cell = (page, r, c, grid) => page.getByRole('button', { name: new RegExp(`^${grid[r][c]}, row ${r + 1}, column ${c + 1}(,|$)`) });

  const a = await open('Spark'); let { page } = a; let firstGrid;
  await step('Spark: the story ends with a word hunt button (Sunrise has none)', async () => {
    await toEnd(page, 'Luna and the Firefly', 2);
    await page.getByRole('button', { name: 'Play the word hunt' }).waitFor();
    await page.screenshot({ path: `${out}/puzzle-end.png` });
  });
  await step('Spark: easy 7x7 grid, 4 words, explained', async () => {
    await page.getByRole('button', { name: 'Play the word hunt' }).click();
    await page.getByRole('heading', { name: 'Word hunt' }).waitFor(); await page.getByText(/Tap the first letter of a word, then its last letter/).waitFor();
    const g = await read(page); firstGrid = g.grid;
    if (g.size !== 7) throw new Error('Spark grid should be 7x7, got ' + g.size);
    if (g.words.length !== 4) throw new Error('Spark has 4 words, got ' + g.words.join());
    for (const w of g.words) { const loc = locate(g.grid, w); if (!loc) throw new Error(w + ' is not in the grid'); if (loc.dir[0] < 0 || loc.dir[1] < 0) throw new Error('Spark words run forwards only: ' + w); }
    await page.getByText('0 of 4 found').waitFor();
    await page.screenshot({ path: `${out}/puzzle-spark.png` }); await audit(page, 'word hunt (Spark)');
  });
  await step('Spark: a wrong pick is gentle, a hint glows, then every word can be found', async () => {
    const g = await read(page);
    await cell(page, 0, 0, g.grid).click(); await cell(page, 1, 3, g.grid).click(); await page.getByText('Not a word yet. Keep looking!').waitFor();
    await page.getByRole('button', { name: 'Show a hint' }).click(); await page.getByText('A word starts at the glowing letter.').waitFor();
    let n = 0;
    for (const w of g.words) {
      const loc = locate(g.grid, w);
      await cell(page, loc.a[0], loc.a[1], g.grid).click(); await cell(page, loc.b[0], loc.b[1], g.grid).click(); n++;
      await page.getByText(`${n} of 4 found`).waitFor();
      if (n === 2) { await page.screenshot({ path: `${out}/puzzle-spark-progress.png` }); }
    }
    await page.getByText('You found them all!').waitFor();
    await page.screenshot({ path: `${out}/puzzle-spark-done.png` }); await audit(page, 'word hunt (finished)');
  });
  await step('every attempt is shuffled: new grid, and the 4 words vary across attempts', async () => {
    const sets = new Set(); let sameGrid = 0;
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /new puzzle/i }).click(); await page.getByText('0 of 4 found').waitFor();
      const g = await read(page); sets.add(g.words.slice().sort().join()); if (JSON.stringify(g.grid) === JSON.stringify(firstGrid)) sameGrid++;
    }
    console.log('  different word sets in 6 attempts:', sets.size);
    if (sameGrid) throw new Error('a new puzzle repeated the first grid'); if (sets.size < 2) throw new Error('the same 4 words every time');
  });
  await step('closing returns to the story end; the Sunrise story has no word hunt', async () => {
    await page.getByRole('button', { name: 'Done' }).click(); await page.getByText('The End', { exact: true }).waitFor();
    await page.getByLabel('Close story').click(); await page.getByLabel('Back').click();
    await page.getByText('Bedtime for Bear').first().click(); await page.getByRole('button', { name: /^Start reading/ }).click();
    await page.getByLabel('Next page').click(); await page.getByLabel('Next page').click(); await page.getByText('The End', { exact: true }).waitFor();
    if (await page.getByRole('button', { name: 'Play the word hunt' }).count()) throw new Error('Sunrise must not have a word hunt');
  });
  console.log(a.errors.length ? 'page errors: ' + a.errors.join(' | ') : 'no page errors'); await a.ctx.close();

  const b = await open('Seeker'); page = b.page;
  await step('Seeker: bigger 10x10 grid, 6 words, any direction, solvable', async () => {
    await toEnd(page, 'The Snow Trek', 4);
    await page.getByRole('button', { name: 'Play the word hunt' }).click(); await page.getByRole('heading', { name: 'Word hunt' }).waitFor();
    await page.getByText(/Words can go across, down or diagonally, and always read forwards/).waitFor();
    const dirs = new Set(); let total = 0;
    for (let round = 0; round < 6; round++) {
      const g = await read(page);
      if (g.size !== 10) throw new Error('Seeker grid should be 10x10, got ' + g.size); if (g.words.length !== 6) throw new Error('Seeker has 6 words, got ' + g.words.length);
      if (round === 0) { await page.screenshot({ path: `${out}/puzzle-seeker.png` }); await audit(page, 'word hunt (Seeker)'); }
      let n = 0;
      for (const w of g.words) { const loc = locate(g.grid, w); if (!loc) throw new Error(w + ' missing'); dirs.add(loc.dir.join()); await cell(page, loc.a[0], loc.a[1], g.grid).click(); await cell(page, loc.b[0], loc.b[1], g.grid).click(); n++; await page.getByText(`${n} of 6 found`).waitFor(); total++; }
      await page.getByText('You found them all!').waitFor();
      if (round === 0) await page.screenshot({ path: `${out}/puzzle-seeker-done.png` });
      await page.getByRole('button', { name: /Play again/ }).click(); await page.getByText('0 of 6 found').waitFor();
    }
    console.log('  Seeker directions seen over 6 attempts:', dirs.size);
    if (dirs.size < 3) throw new Error('Seeker words should run across, down and diagonally (all forwards)');
  });
  console.log(b.errors.length ? 'page errors: ' + b.errors.join(' | ') : 'no page errors'); await b.ctx.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
