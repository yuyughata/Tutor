import { createApi } from './api.js';
import { h, icon, clear, toast, modal, confirmDialog, busy, field } from './ui.js';
import * as dashboard from './views/dashboard.js';
import * as stories from './views/stories.js';
import * as editor from './views/editor.js';
import * as featured from './views/featured.js';
import * as categories from './views/categories.js';
import * as subscribers from './views/subscribers.js';
import * as settings from './views/settings.js';

const app = document.getElementById('app');
const logo = () => h('span', {}, 'Gen', h('i', {}, 'o'), 'va');
const cfg = window.GENOVA || {};

const NAV = [
  { path: 'dashboard', label: 'Dashboard', icon: 'dashboard', view: dashboard },
  { path: 'stories', label: 'Stories', icon: 'book', view: stories },
  { path: 'featured', label: 'Featured', icon: 'star', view: featured },
  { path: 'categories', label: 'Categories', icon: 'tag', view: categories },
  { path: 'subscribers', label: 'Subscribers', icon: 'users', view: subscribers },
  { path: 'settings', label: 'Settings', icon: 'settings', view: settings },
];

function message(title, body) {
  clear(app).append(h('div', { class: 'login' }, h('div', { class: 'card' },
    h('div', { class: 'brand' }, logo()), h('h2', {}, title), h('p', { class: 'muted' }, body))));
}

async function createBackend() {
  if (cfg.demo) {
    const { createDemoApi } = await import('./demo.js');
    return createDemoApi();
  }
  if (window.__noConfig || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    message('Almost there', 'Copy web/config.example.js to web/config.js and add your Supabase project URL and anon key.');
    return null;
  }
  if (!window.supabase) {
    message("Couldn't load Supabase", 'The Supabase library failed to load. Check your connection and refresh.');
    return null;
  }
  return createApi(window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey));
}

const api = await createBackend();
if (api) boot();

async function boot() {
  let me = null;
  try { me = await api.me(); } catch (e) { return message('Could not reach the server', e.message); }
  if (api.demo && !document.querySelector('.demo-banner')) document.body.prepend(h('div', { class: 'demo-banner' }, 'Demo mode: sample data, nothing is saved'));
  if (!me) return renderLogin();
  if (!me.isAdmin) return renderNoAccess(me);
  renderShell(me);
}

function renderLogin() {
  const email = h('input', { type: 'email', autocomplete: 'email', required: true, placeholder: 'you@custar.com' });
  const pw = h('input', { type: 'password', autocomplete: 'current-password', required: true, placeholder: 'Password' });
  const err = h('div', { class: 'callout bad', hidden: true, role: 'alert' });
  const btn = h('button', { class: 'btn', type: 'submit', style: { width: '100%' } }, 'Sign in');
  const form = h('form', {
    onsubmit: busy(btn, async (e) => {
      e.preventDefault();
      err.hidden = true;
      try { await api.signIn(email.value.trim(), pw.value); } catch (x) { err.textContent = /invalid/i.test(x.message) ? 'That email or password is not right.' : x.message; err.hidden = false; return; }
      boot();
    }),
  }, field('Email', email), field('Password', pw), err, btn);
  clear(app).append(h('div', { class: 'login' }, h('div', { class: 'card' },
    h('div', { class: 'brand' }, logo()),
    h('p', { class: 'muted', style: { marginTop: 0 } }, 'Admin dashboard · CUSTAR'), form)));
  email.focus();
}

function renderNoAccess(me) {
  clear(app).append(h('div', { class: 'login' }, h('div', { class: 'card' },
    h('div', { class: 'brand' }, logo()),
    h('h2', {}, 'No admin access'),
    h('p', { class: 'muted' }, `${me.email} is signed in but isn't an admin. Ask an existing admin to add you in Settings.`),
    h('button', { class: 'btn secondary', onclick: async () => { await api.signOut(); boot(); } }, 'Sign out'))));
}

// ---------- shell + router ----------
function renderShell(me) {
  const view = h('main', { id: 'view', tabindex: '-1' });
  const nav = h('nav', { class: 'nav', 'aria-label': 'Main' }, NAV.map((n) =>
    h('a', { href: `#/${n.path}`, 'data-path': n.path, 'aria-label': n.label, title: n.label }, icon(n.icon), h('span', {}, n.label))));
  clear(app).append(h('div', { class: 'shell' },
    h('aside', { class: 'side' },
      h('div', { class: 'brand' }, logo(), h('small', {}, 'Admin')), nav,
      h('div', { class: 'who' }, h('span', { class: 'muted' }, 'Signed in as'), h('b', {}, me.email),
        h('button', { onclick: async () => { await api.signOut(); location.hash = ''; boot(); } }, 'Sign out'))),
    view));

  const ctx = {
    api, me, view, guard: null,
    toast, modal, confirm: confirmDialog,
    go: (path) => { location.hash = `#/${path}`; },
  };

  let current = location.hash;
  let reverting = false;
  const route = async () => {
    if (reverting) { reverting = false; return; }
    if (ctx.guard && ctx.guard() && !window.confirm('You have unsaved changes. Leave without saving?')) {
      reverting = true; location.hash = current; return;
    }
    ctx.guard = null;
    current = location.hash;
    const [first = 'dashboard', second] = location.hash.replace(/^#\/?/, '').split('/');
    const path = first || 'dashboard';
    nav.querySelectorAll('a').forEach((a) => {
      if (a.dataset.path === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const mod = path === 'stories' && second ? editor : (NAV.find((n) => n.path === path)?.view ?? dashboard);
    clear(view).append(h('p', { class: 'muted' }, 'Loading…'));
    try {
      const node = await mod.render(ctx, { id: second });
      clear(view).append(node);
    } catch (e) {
      clear(view).append(h('div', { class: 'card' }, h('h2', {}, 'Something went wrong'), h('p', { class: 'muted' }, e.message),
        h('button', { class: 'btn secondary', onclick: route }, 'Try again')));
    }
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', (e) => { if (ctx.guard && ctx.guard()) { e.preventDefault(); e.returnValue = ''; } });
  route();
}
