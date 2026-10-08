import { h, field, toast, busy, renderLegal, fmtDate, fmtDateTime, ago } from '../ui.js';

const ACTION_LABEL = { send_reset: 'Sent reset email', set_password: 'Set temporary password' };

export async function render(ctx) {
  const { api } = ctx;

  // ---------- admins ----------
  const list = h('div', {});
  async function reload() {
    const admins = await api.listAdmins();
    list.replaceChildren(...admins.map((a) => {
      const you = a.id === ctx.me.id;
      const rm = h('button', { class: 'btn danger sm', disabled: you, title: you ? 'You cannot remove yourself' : '' }, 'Remove');
      rm.onclick = busy(rm, async () => {
        if (!(await ctx.confirm({ title: `Remove ${a.email}?`, body: 'They will lose access to this dashboard.', confirmLabel: 'Remove admin', danger: true }))) return;
        await api.setAdmin(a.email, false); toast('Admin removed'); await reload();
      });
      return h('div', { class: 'row', style: { padding: '10px 0', borderTop: '1px solid var(--line)' } }, h('b', { class: 'grow' }, a.email), you ? h('span', { class: 'pill purple' }, 'You') : null, rm);
    }));
  }
  const email = h('input', { type: 'email', placeholder: 'colleague@custar.com' });
  const add = h('button', { class: 'btn' }, 'Make admin');
  add.onclick = busy(add, async () => {
    const v = email.value.trim(); if (!v) throw new Error('Enter an email address.');
    await api.setAdmin(v, true); email.value = ''; toast(`${v} is now an admin`); await reload();
  });

  // ---------- privacy policy ----------
  let doc = await api.getLegal('privacy-policy');
  let dirty = false;
  ctx.guard = () => dirty;
  const title = h('input', { type: 'text', maxlength: 80 });
  const text = h('textarea', { class: 'mono', rows: 18, spellcheck: true, 'aria-label': 'Privacy policy text' });
  const meta = h('p', { class: 'small muted', style: { margin: '0 0 12px' } });
  const preview = h('div', { class: 'card', style: { boxShadow: 'none', background: 'var(--bg)' } });
  const paint = () => {
    title.value = doc.title; text.value = doc.body;
    meta.textContent = `Version ${doc.version} · last updated ${fmtDate(doc.updated_at)}. Shown in the app (Grown-ups, Privacy) and on the website (/privacy).`;
    preview.replaceChildren(h('h2', {}, doc.title), renderLegal(doc.body));
  };
  const live = () => { dirty = title.value !== doc.title || text.value !== doc.body; preview.replaceChildren(h('h2', {}, title.value || 'Privacy Policy'), renderLegal(text.value)); saveBtn.disabled = !dirty; };
  title.oninput = live; text.oninput = live;
  const saveBtn = h('button', { class: 'btn', disabled: true }, 'Publish update');
  saveBtn.onclick = busy(saveBtn, async () => {
    if (!title.value.trim() || !text.value.trim()) throw new Error('The policy needs a title and some text.');
    if (!(await ctx.confirm({ title: 'Publish this policy?', body: 'The new text appears in the app and on the website straight away, and the version number goes up.', confirmLabel: 'Publish' }))) return;
    doc = await api.saveLegal('privacy-policy', title.value.trim(), text.value);
    dirty = false; paint(); saveBtn.disabled = true; toast(`Privacy policy updated (version ${doc.version})`);
  });
  const revert = h('button', { class: 'btn ghost' }, 'Discard changes');
  revert.onclick = () => { paint(); dirty = false; saveBtn.disabled = true; };

  // ---------- support log ----------
  const logBox = h('div', { class: 'log' });
  const actions = await api.listSupportActions();
  logBox.replaceChildren(...(actions.length
    ? actions.map((a) => h('div', { class: 'row' }, h('b', { class: 'grow' }, ACTION_LABEL[a.action] || a.action), h('span', { class: 'muted' }, a.target_email || ''), h('span', { class: 'muted small nowrap', title: fmtDateTime(a.created_at) }, ago(a.created_at))))
    : [h('p', { class: 'muted', style: { margin: 0 } }, 'No password support actions yet.')]));

  await reload(); paint();
  return h('div', {}, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Settings'), h('p', {}, 'Admins, the privacy policy and support activity.'))),
    h('div', { class: 'grid', style: { gap: '16px' } },
      h('div', { class: 'card', style: { maxWidth: '760px' } }, h('h2', {}, 'Privacy policy'), meta,
        h('div', { class: 'grid cols-2', style: { alignItems: 'start' } },
          h('div', {}, field('Title', title), field('Text', text, 'Use "# Heading" for section titles, "- " for bullet points, and a blank line between paragraphs.'),
            h('div', { class: 'row' }, saveBtn, revert)),
          h('div', {}, h('label', { class: 'f' }, 'Preview (as parents see it)'), preview))),
      h('div', { class: 'card', style: { maxWidth: '640px' } }, h('h2', {}, 'Admins'), list,
        h('div', { class: 'row', style: { marginTop: '18px', alignItems: 'flex-end' } }, h('div', { class: 'grow' }, field('Add an admin', email, 'They need to have signed up on the website first.')), h('div', { style: { marginBottom: '16px' } }, add))),
      h('div', { class: 'card', style: { maxWidth: '640px' } }, h('h2', {}, 'Support log'), h('p', { class: 'small muted', style: { marginTop: 0 } }, 'Password resets done from the Subscribers page.'), logBox)));
}
