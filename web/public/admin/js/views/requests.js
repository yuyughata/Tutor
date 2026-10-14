import { h, icon, fmtDateTime, ago, field, toast, busy } from '../ui.js';

const KINDS = [['grp', 'Reading Program (GRP) spots'], ['title', 'Title requests']];
const STATUS = { new: 'New', contacted: 'Contacted', done: 'Done' };
const PILL = { new: 'scheduled', contacted: 'purple', done: 'live' };

/** "080 123 4567", "+234 801 234 5678" and "2348012345678" all become 2348012345678 for wa.me. */
export const waNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  return d.startsWith('234') ? d : d.startsWith('0') ? `234${d.slice(1)}` : d;
};
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Requests from the two forms on the landing page: "Request a GRP spot" and "Request a Title". */
export async function render(ctx) {
  const { api } = ctx;
  let kind = 'grp';
  let filter = 'new';
  const list = h('div', {});
  const kindTabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Which form' });
  const statusTabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filter' });
  const counts = { grp: 0, title: 0 };

  const paintTabs = () => {
    kindTabs.replaceChildren(...KINDS.map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(kind === v), onclick: () => { kind = v; paintTabs(); load(); } }, counts[v] ? `${l} (${counts[v]} new)` : l)));
    statusTabs.replaceChildren(...[['new', 'New'], ['contacted', 'Contacted'], ['done', 'Done'], ['', 'All']].map(([v, l]) =>
      h('button', { type: 'button', 'aria-pressed': String(filter === v), onclick: () => { filter = v; paintTabs(); load(); } }, l)));
  };

  async function refreshCounts() { Object.assign(counts, await api.newRequestCounts()); paintTabs(); }

  async function load() {
    const rows = await api.listRequests(kind, filter || undefined);
    list.replaceChildren(...(rows.length ? rows.map(card) : [h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🎉'), h('h2', {}, filter === 'new' ? 'No new requests' : 'Nothing here'), h('p', {}, kind === 'grp' ? 'Requests for a Reading Program spot appear here.' : 'Title requests appear here.'))]));
  }

  async function setStatus(r, status, noteValue) {
    await api.updateRequest(kind, r.id, { status, admin_note: noteValue.trim() || null });
    toast(`Marked ${STATUS[status].toLowerCase()}`); await refreshCounts(); await load();
  }

  function detail(r) {
    const rows = kind === 'grp'
      ? [['Reading level', r.reading_level], ['Mode', r.mode]]
      : [['Storybook title', r.storybook_title || '—'], ['Reader level', r.reader_level]];
    return h('dl', { class: 'small', style: { display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 14px', margin: '12px 0' } },
      ...rows.flatMap(([k, v]) => [h('dt', { class: 'muted' }, k), h('dd', { style: { margin: 0 } }, v)]));
  }

  function card(r) {
    const note = h('textarea', { rows: 2, 'aria-label': 'Note for the team', placeholder: 'Private note (only admins see this)' }); note.value = r.admin_note || '';
    const actions = [];
    if (r.status === 'new') { const b = h('button', { class: 'btn' }, icon('check'), 'Mark contacted'); b.onclick = busy(b, () => setStatus(r, 'contacted', note.value)); actions.push(b); }
    if (r.status !== 'done') { const b = h('button', { class: r.status === 'new' ? 'btn secondary' : 'btn' }, icon('check'), 'Mark done'); b.onclick = busy(b, () => setStatus(r, 'done', note.value)); actions.push(b); }
    if (r.status !== 'new') { const b = h('button', { class: 'btn ghost sm' }, 'Back to new'); b.onclick = busy(b, () => setStatus(r, 'new', note.value)); actions.push(b); }
    const save = h('button', { class: 'btn ghost sm' }, 'Save note');
    save.onclick = busy(save, async () => { await api.updateRequest(kind, r.id, { admin_note: note.value.trim() || null }); toast('Note saved'); });
    const what = kind === 'grp' ? 'the Genova Reading Program' : 'your title request';
    const wa = `https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(`Hello ${r.full_name.split(' ')[0]}, this is Genova (CUSTAR) about ${what}.`)}`;
    return h('div', { class: 'card', style: { marginBottom: '14px' } },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('div', {}, h('b', {}, r.full_name), h('div', { class: 'small muted' }, h('span', { title: fmtDateTime(r.created_at) }, ago(r.created_at)), r.source ? ` · from ${r.source}` : '')),
        h('span', { class: `pill ${PILL[r.status]}` }, STATUS[r.status])),
      h('div', { class: 'row small', style: { gap: '14px', marginTop: '8px' } },
        h('a', { href: `tel:${r.phone.replace(/[^\d+]/g, '')}` }, r.phone), h('a', { href: `mailto:${r.email}` }, r.email)),
      detail(r),
      r.comments ? h('p', { style: { whiteSpace: 'pre-wrap', margin: '0 0 12px' } }, r.comments) : null,
      field('Note', note),
      h('div', { class: 'row' }, ...actions,
        h('a', { class: 'btn secondary', href: wa, target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp'),
        h('a', { class: 'btn secondary', href: `mailto:${r.email}?subject=${encodeURIComponent('Genova: your request')}` }, 'Email'), save));
  }

  const exportBtn = h('button', { class: 'btn secondary sm', type: 'button' }, 'Download all as CSV');
  exportBtn.onclick = busy(exportBtn, async () => {
    const rows = await api.listRequests(kind);
    const cols = kind === 'grp'
      ? [['created_at', 'Received'], ['full_name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['reading_level', 'Reading level'], ['mode', 'Mode'], ['comments', 'Comments'], ['status', 'Status'], ['admin_note', 'Note']]
      : [['created_at', 'Received'], ['full_name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['storybook_title', 'Storybook title'], ['reader_level', 'Reader level'], ['comments', 'Comments'], ['status', 'Status'], ['admin_note', 'Note']];
    const csv = [cols.map((c) => csvCell(c[1])).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c[0]])).join(','))].join('\r\n');
    const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })), download: `genova-${kind === 'grp' ? 'grp-requests' : 'title-requests'}.csv` });
    document.body.append(a); a.click(); a.remove(); toast('Downloaded');
  });

  await refreshCounts(); await load();
  return h('div', {},
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Requests'), h('p', {}, 'What visitors send from the two forms on the landing page: Request a GRP spot, and Request a Title.')), exportBtn),
    kindTabs, h('div', { style: { height: '10px' } }), statusTabs, h('div', { style: { height: '18px' } }), list);
}
