// Builds ONE self-contained HTML file of the Genova landing page (all CSS, images, catalog data and scripts inlined),
// from the same sources the website uses: web/content/*.html, web/app/design.css, web/public/{img,catalog.json,landing.js}.
//
//   node tools/site/build_landing.mjs [outfile]            -> docs/Genova_Landing_Page.html
//   SITE_URL=https://genova.example node tools/site/build_landing.mjs
//
// SITE_URL (optional) points the sign-in / sign-up / account / privacy links at the live website. Without it those links stay
// site-relative (/signup/ ...), which is right when this file is uploaded to the same domain as the website.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const web = path.join(root, 'web');
const out = process.argv[2] || path.join(root, 'docs', 'Genova_Landing_Page.html');
const SITE = (process.env.SITE_URL || '').replace(/\/$/, '');
const read = (...p) => fs.readFileSync(path.join(web, ...p), 'utf8');

// ---- navigation: one source of truth (components/SiteHeader.tsx) ----
const headerSrc = read('components', 'SiteHeader.tsx');
const nav = [...headerSrc.matchAll(/\{ href: '([^']+)', label: '([^']+)' \}/g)].map((m) => ({ href: m[1], label: m[2] }));
if (nav.length < 6) throw new Error('could not read NAV_LINKS from SiteHeader.tsx');

// ---- fonts, css ----
const fontsUrl = read('app', 'layout.tsx').match(/const FONTS = '([^']+)'/)[1];
const css = read('app', 'design.css');

// ---- images -> data URIs ----
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const inlineImages = (html) => html.replace(/(["'(])\/img\/([\w.-]+)/g, (_m, q, f) => {
  const p = path.join(web, 'public', 'img', f);
  return `${q}data:${mime[path.extname(f)]};base64,${fs.readFileSync(p).toString('base64')}`;
});

// ---- links ----
const hash = (html) => html.replace(/href="\/#/g, 'href="#').replace(/href="\/plans\/"/g, 'href="#plans"');
const site = (html) => html.replace(/href="(\/(?:signup|login|account|privacy|support|admin)\/[^"]*)"/g, (_m, p) => `href="${SITE}${p}"`);
const fix = (html) => site(hash(html));

// ---- fragments ----
const frag = (n) => fs.readFileSync(path.join(web, 'content', n), 'utf8');
const header = `
<header class="site-head">
  <div class="nav">
    <a href="#top" class="logo-link" aria-label="Custar Genova home"><img class="logo-img" src="/img/genova-logo.png" width="92" height="40" alt="Custar Genova logo"></a>
    <nav class="nav-links" aria-label="Main">
      ${nav.map((l) => `<a href="${l.href}">${l.label}</a>`).join('\n      ')}
    </nav>
    <div class="nav-cta">
      <a href="/login/" class="nav-account">Sign in</a>
      <a href="/signup/" class="btn btn-primary btn-sm">Get started</a>
    </div>
    <button class="menu-toggle" id="menuToggle" aria-label="Menu" aria-expanded="false" aria-controls="mobileMenu">☰</button>
  </div>
  <nav class="mobile-menu" id="mobileMenu" aria-label="Menu">
    ${nav.map((l) => `<a href="${l.href}">${l.label}</a>`).join('\n    ')}
    <a href="/login/">Sign in</a>
    <a href="/signup/" class="btn btn-primary btn-block">Get started</a>
  </nav>
</header>`;

// Plans as they are seeded in the database (supabase/migrations/0004). On the website these cards are live from the database.
const PLANS = [
  { id: 'free', name: 'Free', tag: 'A taste of Genova', price: '₦0', per: 'forever', features: ['A growing set of free stories', 'Reader profiles for every child', 'Favourites and reading progress', 'No ads, ever'], cta: 'Get started free', href: '/signup/', free: true },
  { id: 'monthly', name: 'Premium Monthly', tag: 'Pay month to month', price: '₦5,000', per: 'per month', features: ['Every story in the library', 'New stories every week', 'Read offline', 'Cancel any time'], cta: 'Sign up and subscribe', href: '/signup/?next=%2Fcheckout%2F%3Fplan%3Dmonthly' },
  { id: 'quarterly', name: 'Premium Quarterly', tag: 'Best value: save 20%', price: '₦12,000', per: 'every 3 months', features: ['Everything in Monthly', 'Three months for the price of 2.4', 'Cancel any time'], cta: 'Sign up and subscribe', href: '/signup/?next=%2Fcheckout%2F%3Fplan%3Dquarterly', best: true, save: 20 },
];
const plans = `
  <section id="plans" class="plans-section" aria-label="Plans">
    <div class="wrap">
${frag('landing-plans-head.html')}
      <div class="plans">
        ${PLANS.map((p) => `<article class="plan${p.best ? ' best' : ''}" aria-labelledby="plan-${p.id}">
          ${p.best ? `<span class="tag">Save ${p.save}%</span>` : ''}
          <div><h3 id="plan-${p.id}">${p.name}</h3><p class="muted small" style="font-weight:600">${p.tag}</p></div>
          <div><span class="price">${p.price}</span> <span class="per">${p.per}</span></div>
          <ul>${p.features.map((f) => `<li>${f}</li>`).join('')}</ul>
          <a href="${p.href}" class="btn block${p.free ? ' secondary' : ''}">${p.cta}</a>
        </article>`).join('\n        ')}
      </div>
    </div>
  </section>`;

const footer = `
<footer class="site-foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <img class="foot-logo" src="/img/genova-logo.png" width="83" height="36" alt="Custar Genova logo">
        <p class="blurb">A storybook world built on seven pillars of wholesome development, for families raising readers, thinkers, and people of real character.</p>
      </div>
      <div class="foot-col"><h5>Explore</h5>
        <a href="/#about">About Genova</a><a href="/#pillars">7 Pillars</a><a href="/#levels">Reading Levels</a><a href="/#products">Storybooks</a><a href="/#catalog">Title Catalog</a></div>
      <div class="foot-col"><h5>Programs</h5>
        <a href="/#grp">Reading Program (GRP)</a><a href="/#grp-form">Request a Session</a><a href="/#preorder">Request a Title</a><a href="/#library">Genova Library</a></div>
      <div class="foot-col"><h5>Genova App</h5>
        <a href="/#app">About the app</a><a href="/plans/">Plans</a><a href="/account/">Your account</a><a href="/support/">Help and support</a><a href="/account/#support">Contact support</a><a href="/privacy/">Privacy policy</a></div>
      <div class="foot-col"><h5>Get In Touch</h5>
        <a class="foot-email" href="mailto:Custarlc25@gmail.com">Custarlc25@gmail.com</a>
        <a href="https://wa.me/2349015487736" target="_blank" rel="noopener noreferrer">WhatsApp Us</a>
        <div class="foot-socials"><span>IG</span><span>FB</span><span>TT</span></div></div>
    </div>
    <div class="foot-bottom">
      <span>© ${new Date().getFullYear()} Custar. Built for a generation of bright minds. Payments are processed securely by Paystack.</span>
      <span>Built in homes, Reaching for the world.</span>
    </div>
  </div>
</footer>`;

const body = [
  frag('landing-a.html'), frag('landing-app.html'), plans, frag('landing-faq.html'), frag('landing-b.html'), frag('landing-modal.html'), frag('landing-float.html'),
].join('\n');

const html = `<!DOCTYPE html>
<html lang="en" class="js">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Genova · Storybooks That Stay and Grow With Them</title>
<meta name="description" content="Genova storybooks stay and grow with your child. Rooted in family and faith culture, crafted to spark a love for reading and nurture confident readers and well-grounded learners.">
<meta name="theme-color" content="#6C2BD9">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsUrl}" rel="stylesheet">
<style>
${css}
</style>
</head>
<body class="page-body">
<a class="skip" href="#top">Skip to content</a>
${inlineImages(fix(header))}
<main id="main">
<div class="lp" id="top">
${inlineImages(fix(body))}
</div>
</main>
${inlineImages(fix(footer))}

<script type="application/json" id="catalogData">${fs.readFileSync(path.join(web, 'public', 'catalog.json'), 'utf8').trim().replace(/</g, '\\u003c')}</script>
<script>
${fs.readFileSync(path.join(web, 'public', 'landing.js'), 'utf8')}
</script>
<script>
  (function () {
    window.genovaLanding.init();
    var btn = document.getElementById('menuToggle'), menu = document.getElementById('mobileMenu');
    function set(open) { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.textContent = open ? '✕' : '☰'; }
    btn.addEventListener('click', function () { set(!menu.classList.contains('open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  })();
</script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(html.length / 1048576).toFixed(2)} MB)`);
