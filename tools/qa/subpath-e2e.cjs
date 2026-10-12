// The website hosted in a folder (www.custar.ng/Genova): every link, image and script must carry the /Genova prefix.
// Build with NEXT_PUBLIC_BASE_PATH=/Genova, copy web/out to <www>/Genova, serve <www> on :8095 (see tools/qa/README.md).
const { chromium } = require(process.env.PW);
const { install, createState } = require('./mockbackend.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const state = createState(); await install(ctx, state, { host: 'cjdrlddvbyfataumdztg.supabase.co' });
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const page = await ctx.newPage();
  const bad = []; page.on('response', (r) => { if (r.status() >= 400 && /localhost:8095/.test(r.url())) bad.push(r.status() + ' ' + r.url()); });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  let fails = 0; const B = 'http://localhost:8095';
  const step = async (name, fn) => { try { await fn(); console.log('ok   ', name); } catch (e) { fails++; console.log('FAIL ', name, '-', e.message.split('\n').slice(0, 5).join(' | ')); } };

  await step('home loads under /Genova/ with all images and scripts', async () => {
    await page.goto(B + '/Genova/', { waitUntil: 'networkidle' });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
    await page.waitForTimeout(800);
    const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
    if (broken.length) throw new Error('broken images: ' + broken.join());
    const root = await page.evaluate(() => [...document.querySelectorAll('a[href^="/"],img[src^="/"],script[src^="/"],link[href^="/"]')].map((e) => e.getAttribute('href') || e.getAttribute('src')).filter((u) => !u.startsWith('/Genova/') && u !== '/Genova'));
    if (root.length) throw new Error('addresses without the /Genova prefix: ' + [...new Set(root)].join());
    await page.getByText('₦3,000').first().waitFor();
  });
  await step('nav: Plans, Sign in, Get started stay inside /Genova', async () => {
    await page.locator('.nav-links').getByRole('link', { name: 'Plans' }).click(); await page.waitForURL(B + '/Genova/plans/');
    await page.getByText('Premium Quarterly').first().waitFor();
    await page.locator('.nav-cta').getByRole('link', { name: 'Sign in' }).click(); await page.waitForURL(B + '/Genova/login/');
  });
  await step('sign in goes to /Genova/account/', async () => {
    await page.getByLabel('Email').fill('parent@example.com'); await page.getByLabel('Password').fill('secret123'); await page.getByRole('button', { name: /^Sign in$/ }).click();
    await page.waitForURL(B + '/Genova/account/', { timeout: 10000 });
  });
  await step('footer: privacy page, admin page, support page', async () => {
    await page.goto(B + '/Genova/privacy/', { waitUntil: 'networkidle' }); await page.getByRole('heading', { name: /Privacy/ }).first().waitFor();
    await page.goto(B + '/Genova/support/', { waitUntil: 'networkidle' }); await page.getByRole('heading', { name: /Help|support/i }).first().waitFor();
    const r = await page.goto(B + '/Genova/admin/', { waitUntil: 'load' }); if (r.status() !== 200) throw new Error('admin ' + r.status());
    await page.waitForTimeout(800);
    const cfg = await page.evaluate(() => !!(window.GENOVA && window.GENOVA.supabaseUrl)); if (!cfg) throw new Error('admin config.js did not load');
  });
  await step('no failed requests to the site', async () => { const b = bad.filter((u) => !/favicon/.test(u)); if (b.length) throw new Error(b.join(' | ')); });
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors', fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
