const { chromium } = require(process.env.PW);
const fs = require('fs');
const out = process.env.OUT;
const FONT = require('path').join(__dirname, '..', '..', 'app', 'node_modules', '@expo-google-fonts', 'nunito');
const fontFile = { 600: `${FONT}/600SemiBold/Nunito_600SemiBold.ttf`, 700: `${FONT}/800ExtraBold/Nunito_800ExtraBold.ttf`, 800: `${FONT}/800ExtraBold/Nunito_800ExtraBold.ttf`, 900: `${FONT}/900Black/Nunito_900Black.ttf` };
const fontCss = Object.keys(fontFile).map((w) => `@font-face{font-family:'Nunito';font-weight:${w};src:url(http://fonts.test/${w}.ttf)}`).join('\n');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });

  // nicer placeholder artwork to upload (rendered with emoji, like the app's sample art)
  const art = async (emoji, w, h, c1, c2) => {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<body style="margin:0"><div style="width:${w}px;height:${h}px;display:grid;place-items:center;font-size:${Math.round(Math.min(w, h) * 0.55)}px;background:linear-gradient(135deg,${c1},${c2})">${emoji}</div></body>`);
    const buf = await p.screenshot({ type: 'png' }); await p.close(); return { name: 'art.png', mimeType: 'image/png', buffer: buf };
  };
  const cover = await art('🐢', 450, 600, '#10a19c', '#ffbe00');
  const pagesArt = [await art('🐢', 600, 450, '#ffbe00', '#ab46d2'), await art('⛰️', 600, 450, '#ab46d2', '#232323'), await art('🌄', 600, 450, '#10a19c', '#ab46d2')];

  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.GENOVA={demo:true};' }));
  await page.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: 'text/css', body: fontCss }));
  await page.route(/fonts\.test\/(\d+)\.ttf/, (r) => r.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(fontFile[r.request().url().match(/(\d+)\.ttf/)[1]]) }));
  await page.route(/cdn\.jsdelivr/, (r) => r.abort());
  const shot = async (n, full) => {
    if (!n.startsWith('a06')) await page.evaluate(() => document.getElementById('toasts')?.replaceChildren());
    await page.waitForTimeout(450);
    if (full) { // tall pages: grow the viewport so sticky elements (sidebar, save bar) sit in their natural places
      const vp = page.viewportSize(); const h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: vp.width, height: Math.max(vp.height, h) }); await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${n}.png` }); await page.setViewportSize(vp);
    } else await page.screenshot({ path: `${out}/${n}.png` });
    console.log('shot', n);
  };
  let failures = 0;
  const step = async (name, fn) => { try { await fn(); } catch (e) { failures++; console.log('FAIL', name, '-', e.message.split('\n')[0]); await shot('fail-' + name.replace(/\W+/g, '-')).catch(() => {}); } };
  const nav = (name) => page.locator('.nav').getByRole('link', { name });

  await page.goto('http://localhost:8098/admin/index.html', { waitUntil: 'load' });
  await page.addStyleTag({ content: '.demo-banner{display:none !important}' });
  await step('login', async () => { await page.getByRole('button', { name: 'Sign in' }).waitFor(); await shot('a01-login'); });
  await step('dashboard', async () => {
    await page.getByPlaceholder('you@custar.com').fill('barry@custar.com'); await page.getByPlaceholder('Password').fill('secret123'); await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor(); await page.getByText('Payment received').waitFor(); await shot('a02-dashboard', true);
  });
  await step('stories', async () => { await nav('Stories').click(); await page.getByRole('heading', { name: 'Stories', exact: true }).waitFor(); await shot('a03-stories'); });
  await step('editor existing', async () => { await page.getByText('Luna and the Firefly').first().click(); await page.getByRole('heading', { name: 'Edit story' }).waitFor(); await shot('a04-story-editor', true); });
  await step('new story filled', async () => {
    await nav('Stories').click(); await page.getByRole('link', { name: 'New story' }).first().click(); await page.getByRole('heading', { name: 'New story' }).waitFor();
    await page.locator('input[maxlength="80"]').fill('The Brave Little Turtle');
    await page.locator('textarea[maxlength="400"]').fill('A turtle, a very tall hill and a view that changes everything.');
    await page.getByRole('button', { name: 'Animals', exact: true }).click(); await page.getByRole('button', { name: 'Adventure', exact: true }).click();
    await page.locator('.cover-drop input[type=file]').setInputFiles(cover);
    await page.locator('input[type=file][multiple]').setInputFiles(pagesArt);
    await page.waitForFunction(() => document.querySelectorAll('.page-card').length === 3);
    const t = page.locator('.page-card textarea');
    await t.nth(0).fill('Once upon a time, a small turtle woke up and looked at the hill.'); await t.nth(1).fill('He decided to climb it, one slow step at a time.'); await t.nth(2).fill('At the top, he could see the whole wide world.');
    await page.getByRole('button', { name: 'Live', exact: true }).click(); await page.locator('.page-card textarea').first().focus();
    await page.waitForFunction(() => document.querySelectorAll('.checklist li.ok').length === 6); await shot('a05-new-story-ready', true);
  });
  await step('new story validation', async () => {
    page.once('dialog', (d) => d.accept()); await nav('Stories').click(); await page.getByRole('link', { name: 'New story' }).first().click();
    await page.locator('input[maxlength="80"]').fill('Untitled idea'); await page.getByRole('button', { name: 'Live', exact: true }).click(); await page.getByRole('button', { name: 'Save', exact: true }).click(); await shot('a06-publish-checklist');
    await page.getByRole('button', { name: 'Schedule', exact: true }).click(); await page.waitForTimeout(300);
    page.once('dialog', (d) => d.accept());
  });
  await step('featured', async () => { await nav('Featured').click(); await page.getByRole('heading', { name: 'Featured', exact: true }).waitFor(); await shot('a07-featured'); });
  await step('featured dialog', async () => { await page.getByRole('button', { name: 'Schedule' }).first().click(); await page.locator('dialog').waitFor(); await shot('a08-schedule-featured'); await page.locator('dialog').getByRole('button', { name: 'Cancel' }).click(); });
  await step('categories', async () => { await nav('Categories').click(); await page.getByRole('heading', { name: 'Categories', exact: true }).waitFor(); await shot('a09-categories'); });
  await step('subscribers', async () => { await nav('Subscribers').click(); await page.getByText('amara@example.com').waitFor(); await shot('a10-subscribers'); await page.getByRole('button', { name: 'Access' }).nth(3).click(); await page.locator('dialog').waitFor(); await shot('a11-manage-access'); await page.locator('dialog').getByRole('button', { name: 'Cancel' }).click(); await page.getByRole('button', { name: 'Password' }).first().click(); await page.locator('dialog').waitFor(); await shot('a11b-password-help'); await page.locator('dialog').getByRole('button', { name: 'Done' }).click(); });
  await step('settings', async () => { await nav('Settings').click(); await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor(); await shot('a12-settings', true); });
  await step('email + support', async () => {
    await nav('Email').click(); await page.getByRole('heading', { name: 'Resend connection' }).waitFor(); await shot('a15-email-connection', true);
    await page.getByLabel('Resend API key').fill('re_demokey12345678'); await page.locator('input[type=email]').first().fill('hello@custar.com');
    await page.getByRole('button', { name: 'Save settings' }).click(); await page.getByText('Settings saved').waitFor(); await page.getByRole('button', { name: 'Activate email' }).click(); await page.getByText(/Email is on\. Verified/).waitFor(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Send', exact: true }).click(); await page.getByRole('heading', { name: 'Write an email' }).waitFor(); await page.locator('[data-var=message]').fill('# New stories every week\nThree new bedtime stories land on Friday.\n\n- Luna and the Firefly\n- Bedtime for Bear'); await page.getByRole('button', { name: 'Preview' }).click(); await page.locator('iframe.mail-preview').waitFor({ state: 'visible' }); await shot('a16-email-send', true);
    await page.getByRole('button', { name: 'Templates', exact: true }).click(); await page.getByRole('heading', { name: 'Welcome' }).waitFor(); await page.getByRole('button', { name: 'Preview' }).click(); await page.locator('iframe.mail-preview').waitFor({ state: 'visible' }); await shot('a17-email-templates', true);
    await nav('Support').click(); await page.getByText('I paid yesterday').waitFor(); await shot('a18-support');
  });
  await step('mobile', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.setViewportSize({ width: 390, height: 844 });
    await nav('Dashboard').click(); await page.getByRole('heading', { name: 'Dashboard' }).waitFor(); await shot('a13-mobile-dashboard');
    await nav('Stories').click(); await page.getByText('Luna and the Firefly').first().click(); await page.getByRole('heading', { name: 'Edit story' }).waitFor(); await shot('a14-mobile-editor');
  });
  console.log(failures ? failures + ' FAILED' : 'ALL CAPTURED');
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
