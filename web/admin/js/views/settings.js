import { h, field, toast, busy } from '../ui.js';

export async function render(ctx) {
  const { api } = ctx;
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
  await reload();
  return h('div', {}, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Settings'), h('p', {}, 'Who can use this dashboard.'))),
    h('div', { class: 'card', style: { maxWidth: '640px' } }, h('h2', {}, 'Admins'), list,
      h('div', { class: 'row', style: { marginTop: '18px', alignItems: 'flex-end' } }, h('div', { class: 'grow' }, field('Add an admin', email, 'They need to have signed up (in the app or on the website) first.')), h('div', { style: { marginBottom: '16px' } }, add))));
}
