// Screenshots every email design and builds docs/Genova_Email_Templates.pdf.
//   PW=<playwright path> node tools/email/gallery.cjs
const { chromium } = require(process.env.PW);
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const work = path.join(__dirname, '.work'); fs.mkdirSync(work, { recursive: true });
const items = [
  ...JSON.parse(fs.readFileSync(path.join(__dirname, 'index.json'), 'utf8')).map((t) => ({ file: path.join(root, 'docs', 'email-templates', `${t.key}.html`), title: t.name, sub: t.subject, note: t.automatic ? 'Sent automatically' : 'Sent by the team', group: 'Genova emails' })),
  ...JSON.parse(fs.readFileSync(path.join(__dirname, 'auth.json'), 'utf8')).map((a) => ({ file: path.join(root, 'supabase', 'auth-email-templates', `${a.file}.html`), title: a.eyebrow, sub: a.subject, note: 'Sent by Supabase Auth', group: 'Account emails' })),
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  // placeholder cover for the "new story" email
  const cp = await b.newPage({ viewport: { width: 480, height: 640 } });
  await cp.setContent('<body style="margin:0"><div style="width:480px;height:640px;display:grid;place-items:center;font-size:230px;background:linear-gradient(160deg,#10a19c,#ab46d2 70%,#ffbe00)">🦋</div></body>');
  fs.writeFileSync(path.join(root, 'docs', 'email-templates', 'cover.png'), await cp.screenshot({ type: 'png' })); await cp.close();
  const page = await b.newPage({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 1.5 });
  const shots = [];
  for (const [i, it] of items.entries()) {
    let html = fs.readFileSync(it.file, 'utf8').replace('https://genova.example/cover.png', 'cover.png');
    const tmp = path.join(root, 'docs', 'email-templates', `.tmp-${i}.html`); fs.writeFileSync(tmp, html);
    await page.goto('file://' + tmp); await page.waitForTimeout(300);
    const out = path.join(work, `e${i}.png`); await page.screenshot({ path: out, fullPage: true }); fs.unlinkSync(tmp);
    shots.push({ ...it, img: out });
  }
  const FONT = path.join(root, 'app', 'node_modules', '@expo-google-fonts', 'nunito');
  const css = `@font-face{font-family:Nunito;font-weight:600;src:url(file://${FONT}/600SemiBold/Nunito_600SemiBold.ttf)}@font-face{font-family:Nunito;font-weight:900;src:url(file://${FONT}/900Black/Nunito_900Black.ttf)}
@page{size:297mm 210mm;margin:0}*{box-sizing:border-box;margin:0}body{font-family:Nunito,sans-serif;color:#232323;-webkit-print-color-adjust:exact}
.page{width:297mm;height:210mm;padding:12mm 14mm;page-break-after:always;background:#f6f4f0;position:relative;overflow:hidden}
.cover{background:#232323;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:26mm}.cover h1{font-size:54pt;font-weight:900;letter-spacing:-.03em;line-height:1}.cover p{font-size:14pt;margin-top:8mm;max-width:170mm;color:#d9d4de;line-height:1.5}
.logo{font-size:22pt;font-weight:900;margin-bottom:22mm}.logo i{font-style:normal;color:#ffbe00}.bar{position:absolute;left:0;right:0;top:0;height:3mm;background:linear-gradient(90deg,#ab46d2,#10a19c 55%,#ffbe00)}
h2{font-size:15pt;font-weight:900;margin-bottom:5mm}.row{display:flex;gap:8mm;justify-content:center;align-items:flex-start}
figure{width:88mm}figure img{display:block;width:100%;max-height:150mm;object-fit:cover;object-position:top;border-radius:3mm;box-shadow:0 1.5mm 5mm rgba(35,35,35,.18)}
figcaption{margin-top:3mm;font-size:8.5pt;line-height:1.4;color:#6b6472}figcaption b{display:block;font-size:10.5pt;color:#232323}figcaption i{font-style:normal;color:#7a5a00;font-weight:900}
.foot{position:absolute;left:14mm;bottom:6mm;font-size:7.5pt;color:#8a8490}
ul{margin:4mm 0 0 5mm;font-size:11pt;line-height:1.6}li{margin-bottom:2mm}.notes{max-width:230mm}`;
  let body = `<section class="page cover"><div class="logo">Gen<i>o</i>va</div><h1>Email designs</h1><p>Quiet, spacious and consistent: one headline, short copy, hairline receipts, a single amber action. Light and dark mode, readable on a phone, with a plain-text version of every message.</p></section>`;
  for (let i = 0; i < shots.length; i += 3) {
    const grp = shots.slice(i, i + 3);
    body += `<section class="page"><div class="bar"></div><h2>${grp[0].group}</h2><div class="row">${grp.map((s) => `<figure><img src="file://${s.img}"><figcaption><b>${s.title}</b>${s.sub}<br><i>${s.note}</i></figcaption></figure>`).join('')}</div><div class="foot">Genova · Email designs</div></section>`;
  }
  body += `<section class="page"><div class="bar"></div><h2>How they fit together</h2><div class="notes"><ul>
<li><b>Edit anything</b> in Admin &gt; Email &gt; Templates: subject, label, text. Preview before saving. Syntax: "# Headline", "## Section", "- Label: value" for receipt rows, "&gt; note", "![picture](url)", "[Button](url)".</li>
<li><b>Automatic:</b> welcome, receipt, payment failed, cancellation, passcode/password changed, support message received, and three scheduled reminders (renewal coming up, Premium ending, last chance).</li>
<li><b>Sent by the team:</b> new story and broadcast, to any group, from Admin &gt; Email &gt; Send.</li>
<li><b>Account emails</b> (confirm email, reset code, change email) are sent by Supabase Auth. Paste the HTML from supabase/auth-email-templates into Supabase &gt; Authentication &gt; Email Templates.</li>
<li><b>Ideas for later:</b> reading milestones ("Ada finished 10 stories"), a weekly "new this week" digest, a win-back email for lapsed subscribers, and an invoice PDF attachment.</li></ul></div></section>`;
  const html = path.join(work, 'gallery.html'); fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${body}</body>`);
  const pg = await b.newPage(); await pg.goto('file://' + html); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400);
  await pg.pdf({ path: path.join(root, 'docs', 'Genova_Email_Templates.pdf'), width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  await b.close(); console.log('pdf written');
})();
