import { h, icon, fmtDateTime, ago, field, toast, busy } from '../ui.js';

const TOPIC = { sign_in: 'Signing in', subscription: 'Subscription or payment', app: 'The app', story: 'A story', other: 'Something else' };

export async function render(ctx) {
  const { api } = ctx;
  let filter = 'open';
  const list = h('div', {});
  const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filter' });
  const paintTabs = () => tabs.replaceChildren(...[['open', 'Open'], ['resolved', 'Resolved'], ['', 'All']].map(([v, l]) =>
    h('button', { type: 'button', 'aria-pressed': String(filter === v), onclick: () => { filter = v; paintTabs(); load(); } }, l)));

  async function load() {
    const rows = await api.listSupportRequests(filter || undefined);
    list.replaceChildren(...(rows.length ? rows.map(card) : [h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🎉'), h('h2', {}, filter === 'open' ? 'All caught up' : 'Nothing here'), h('p', {}, 'Messages from parents appear here.'))]));
  }

  function card(r) {
    const note = h('textarea', { rows: 2, 'aria-label': 'Note for the team', placeholder: 'Private note (only admins see this)' }); note.value = r.admin_note || '';
    const toggle = h('button', { class: r.status === 'open' ? 'btn' : 'btn secondary' }, r.status === 'open' ? icon('check') : null, r.status === 'open' ? 'Mark resolved' : 'Reopen');
    toggle.onclick = busy(toggle, async () => { await api.updateSupportRequest(r.id, { status: r.status === 'open' ? 'resolved' : 'open', admin_note: note.value.trim() || null }); toast(r.status === 'open' ? 'Marked resolved' : 'Reopened'); await load(); });
    const saveNote = h('button', { class: 'btn ghost sm' }, 'Save note');
    saveNote.onclick = busy(saveNote, async () => { await api.updateSupportRequest(r.id, { admin_note: note.value.trim() || null }); toast('Note saved'); });
    const reply = h('a', { class: 'btn secondary', href: `mailto:${r.email}?subject=${encodeURIComponent('Re: your Genova support request')}` }, 'Reply by email');
    return h('div', { class: 'card', style: { marginBottom: '14px' } },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', {}, h('b', {}, r.email), h('div', { class: 'small muted' }, `${TOPIC[r.topic] || r.topic} · `, h('span', { title: fmtDateTime(r.created_at) }, ago(r.created_at)))),
        h('span', { class: `pill ${r.status === 'open' ? 'scheduled' : 'live'}` }, r.status === 'open' ? 'Open' : 'Resolved')),
      h('p', { style: { whiteSpace: 'pre-wrap', margin: '12px 0' } }, r.message),
      field('Note', note), h('div', { class: 'row' }, toggle, reply, saveNote));
  }

  paintTabs(); await load();
  return h('div', {}, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Support'), h('p', {}, 'Messages parents send from their account on the website and in the app.'))), tabs, h('div', { style: { height: '18px' } }), list);
}
