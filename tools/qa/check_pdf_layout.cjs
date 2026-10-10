// Opens the generated HTML and reports any page whose content spills past the page or into the footer.
const { chromium } = require(process.env.PW);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  await p.goto('file://' + process.env.HTML, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(() => [...document.querySelectorAll('section.page')].map((pg, i) => {
    const r = pg.getBoundingClientRect(); const foot = pg.querySelector('.foot'); const limit = foot ? foot.getBoundingClientRect().top - 1 : r.bottom;
    let worst = 0, who = '';
    pg.querySelectorAll('.head, .head *, figure, figure *, .toc, .map, .found, .found *').forEach((el) => { const b = el.getBoundingClientRect(); if (b.height && b.bottom > limit && b.bottom - limit > worst) { worst = b.bottom - limit; who = el.tagName + '.' + (el.className || ''); } if (b.right > r.right + 1) { worst = Math.max(worst, 999); who = 'right edge ' + el.tagName; } });
    const mm = (px) => (px * 25.4 / 96).toFixed(1);
    return { page: i + 1, over_mm: worst ? mm(worst) : 0, who };
  }));
  const bad = res.filter((r) => r.over_mm > 0);
  console.log(`${res.length} pages checked;`, bad.length ? 'OVERFLOW on ' + bad.map((r) => `p${r.page} (${r.over_mm}mm ${r.who})`).join(', ') : 'nothing overflows');
  await b.close(); process.exit(bad.length ? 1 : 0);
})();
