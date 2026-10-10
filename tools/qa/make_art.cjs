// Draws friendly sample artwork (emoji on brand gradients) for the fake backend's covers and story pages, so screenshots look like a real catalogue.
// Output: $ART_DIR (default .work/art) as cover1..4.png and p1..p10.png. Use with QA_ART_DIR=<that folder>.
const { chromium } = require(process.env.PW);
const out = process.env.ART_DIR || require('path').join(__dirname, '.work', 'art');
const sets = [ // [cover emoji, [page emojis], colours]
  ['🌙', ['🌙', '✨'], ['#10a19c', '#3b1f5c']],
  ['🐉', ['🐉', '🎂'], ['#7a2e99', '#10a19c']],
  ['🐻', ['🐻', '😴'], ['#10a19c', '#ffbe00']],
  ['🏔️', ['🧒', '🐆', '🏕️', '🌄'], ['#ab46d2', '#232323']],
];
(async () => {
  require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const draw = async (name, emoji, w, h, [c1, c2], extra) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<body style="margin:0"><div style="position:relative;width:${w}px;height:${h}px;display:grid;place-items:center;font-size:${Math.round(Math.min(w, h) * 0.5)}px;background:linear-gradient(135deg,${c1},${c2});overflow:hidden"><span style="position:absolute;left:8%;top:10%;font-size:${Math.round(h * 0.12)}px;opacity:.9">${extra[0]}</span><span style="position:absolute;right:9%;bottom:12%;font-size:${Math.round(h * 0.13)}px;opacity:.9">${extra[1]}</span>${emoji}</div></body>`);
    await p.screenshot({ path: `${out}/${name}.png` }); await p.close();
  };
  let pn = 1;
  for (let i = 0; i < sets.length; i++) {
    const [ce, pages, cols] = sets[i];
    await draw(`cover${i + 1}`, ce, 450, 600, cols, ['⭐', '☁️']);
    for (let k = 0; k < pages.length; k++) await draw(`p${pn++}`, pages[k], 600, 450, k % 2 ? [cols[1], cols[0]] : cols, [['🌿', '⭐', '❄️', '✨'][k % 4], ['☁️', '🌸', '🍃', '🌟'][k % 4]]);
  }
  await b.close(); console.log('art written to', out);
})();
