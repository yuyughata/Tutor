// Tiny DOM + UI toolkit. Everything is built with textContent/attributes (never innerHTML
// with data), so story titles or parent emails can't inject markup.

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'draggable') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const clear = (el) => { el.replaceChildren(); return el; };

// Static, trusted SVG paths only.
const ICONS = {
  dashboard: '<path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM20 19v3H6.5"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  tag: '<path d="M20.6 13.4 13.4 20.600a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.600a2 2 0 0 1 0 2.800zM7 7h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.900M16 3.100a4 4 0 0 1 0 7.8"/>',
  settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.300l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.2-1.300L14.3 3h-4l-.4 2.400A7 7 0 0 0 7.7 6.700l-2.4-1-2 3.4 2 1.600a7.4 7.4 0 0 0 0 2.600l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.2 1.300l.4 2.400h4l.4-2.400a7 7 0 0 0 2.2-1.300l2.4 1 2-3.4-2-1.600c.1-.4.1-.9.1-1.300z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/>',
  image: '<path d="M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M9 9.500a1 1 0 1 0 0-.01"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  calendar: '<path d="M3 5h18v16H3zM3 10h18M8 3v4m8-4v4"/>',
  search: '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3"/>',
  wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 0 2-3h12M16 14h.01"/>',
  baby: '<path d="M9 12h.01M15 12h.01M10 16c.7.6 1.3.9 2 .9s1.3-.3 2-.9M12 3a5 5 0 0 0-5 5v1H5a2 2 0 0 0 0 4h1a6 6 0 0 0 12 0h1a2 2 0 0 0 0-4h-2V8a5 5 0 0 0-5-5z"/>',
  mail: '<path d="M3 5h18v14H3zM3 7l9 6 9-6"/>',
  help: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  logout: '<path d="M9 21H5V3h4m7 4 5 5-5 5m5-5H9"/>',
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const tmp = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${ICONS[name] || ''}</svg>`, 'image/svg+xml');
  for (const n of [...tmp.documentElement.childNodes]) svg.append(document.importNode(n, true));
  return svg;
}

// ---------- formatting ----------
const dtf = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const dtt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fmtDate = (v) => (v ? dtf.format(new Date(v)) : '—');
export const fmtDateTime = (v) => (v ? dtt.format(new Date(v)) : '—');
export const num = (n) => new Intl.NumberFormat().format(n ?? 0);
export function ago(v) {
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  const t = [[60, 's'], [60, 'm'], [24, 'h'], [30, 'd'], [12, 'mo']];
  let n = Math.abs(s), u = 's';
  for (const [d, label] of t) { u = label; if (n < d) break; n = Math.floor(n / d); u = label === 'mo' ? 'y' : u; }
  return s < 0 ? `in ${n}${u}` : `${n}${u} ago`;
}
export const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
// <input type="datetime-local"> <-> ISO
export const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
export const toDateInput = (iso) => toLocalInput(iso).slice(0, 10);

export const STATUS_LABEL = { live: 'Live', draft: 'Draft', scheduled: 'Scheduled' };
/** Effective state of a story from its stored status and publish time. */
export function storyState(s) {
  if (s.status === 'draft') return 'draft';
  return s.published_at && new Date(s.published_at) <= new Date() ? 'live' : 'scheduled';
}
export const statusPill = (state) => h('span', { class: `pill ${state}` }, STATUS_LABEL[state]);

// ---------- toast / dialogs ----------
export function toast(message, kind = 'ok') {
  const el = h('div', { class: `toast ${kind}`, role: kind === 'err' ? 'alert' : 'status' }, message);
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), kind === 'err' ? 6500 : 3200);
}

/** Open a <dialog> built by `build(close)`; resolves with whatever close() is given. */
export function modal(build) {
  return new Promise((resolve) => {
    const dlg = h('dialog');
    const close = (value) => { dlg.close(); dlg.remove(); resolve(value); };
    append(dlg, [build(close)]);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(undefined); });
    document.body.append(dlg);
    dlg.showModal();
  });
}
export const confirmDialog = ({ title, body, confirmLabel = 'Confirm', danger = false }) =>
  modal((close) => h('div', {},
    h('h2', {}, title), h('p', { class: 'muted' }, body),
    h('div', { class: 'actions' },
      h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancel'),
      h('button', { class: `btn ${danger ? 'danger' : ''}`, onclick: () => close(true) }, confirmLabel))));

export const field = (label, control, hint) =>
  h('div', { class: 'field' }, h('label', { class: 'f' }, label), control, hint ? h('div', { class: 'hint' }, hint) : null);

/** Wrap an async click handler: disables the button, reports errors as toasts. */
export function busy(btn, fn) {
  return async (...a) => {
    if (btn.disabled) return;
    btn.disabled = true;
    try { return await fn(...a); } catch (e) { toast(e.message || String(e), 'err'); } finally { btn.disabled = false; }
  };
}

/** Renders the privacy policy's simple format: "# Heading", "- bullet", blank-line separated paragraphs. */
export function renderLegal(text) {
  const root = h('div', { class: 'legal' });
  let list = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) { if (!list) { list = h('ul', {}); root.append(list); } list.append(h('li', {}, line.slice(2))); continue; }
    list = null;
    if (line.startsWith('# ')) root.append(h('h3', {}, line.slice(2)));
    else if (line.trim()) root.append(h('p', {}, line));
  }
  return root;
}
