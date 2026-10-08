import { h, icon, field, fmtDate, num, toast, busy, toDateInput } from '../ui.js';

const STATUS = { active: ['Active', 'live'], trialing: ['Trial', 'live'], past_due: ['Past due', 'scheduled'], canceled: ['Cancelled', 'bad'], none: ['Free', 'draft'] };

export async function render(ctx) {
  const { api } = ctx;
  const body = h('div', {});
  let timer;

  async function load(search) {
    const rows = await api.listSubscribers(search);
    body.replaceChildren(rows.length ? h('div', { class: 'card', style: { padding: '8px 8px 4px' } }, h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Parent', 'Joined', 'Readers', 'Plan', 'Access', 'Renews / ends', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((r) => {
        const [label, kind] = STATUS[r.status] || [r.status, 'draft'];
        const expired = r.current_period_end && new Date(r.current_period_end) < new Date();
        return h('tr', {}, h('td', {}, h('b', {}, r.email || '(no email)')), h('td', { class: 'small muted nowrap' }, fmtDate(r.joined_at)), h('td', {}, num(r.readers)),
          h('td', { class: 'small' }, r.plan || '—'), h('td', {}, h('span', { class: `pill ${kind}` }, label)),
          h('td', { class: 'small nowrap', style: { color: expired ? 'var(--danger)' : '' } }, fmtDate(r.current_period_end)),
          h('td', {}, h('button', { class: 'btn sm secondary', onclick: () => manage(r, () => load(search)) }, 'Manage')));
      }))))) : h('div', { class: 'card empty' }, h('div', { class: 'big' }, '👪'), h('h2', {}, 'No parents found'), h('p', {}, 'Accounts appear here as parents sign up in the app or on the website.')));
  }

  async function manage(r, done) {
    const status = h('select', {}, [['active', 'Active (full access)'], ['trialing', 'Trial'], ['past_due', 'Past due (no access)'], ['canceled', 'Cancelled (no access)']].map(([v, l]) => h('option', { value: v, selected: r.status === v }, l)));
    const until = h('input', { type: 'date', value: toDateInput(r.current_period_end || new Date(Date.now() + 365 * 86_400_000).toISOString()) });
    const plan = h('input', { type: 'text', value: r.plan || 'comp', maxlength: 40 });
    await ctx.modal((close) => {
      const save = h('button', { class: 'btn' }, 'Save access');
      save.onclick = busy(save, async () => {
        await api.setEntitlement(r.parent_id, status.value, until.value ? new Date(until.value + 'T23:59:59').toISOString() : null, plan.value.trim());
        toast('Access updated'); close(true);
      });
      return h('div', {}, h('h2', {}, 'Manage access'), h('p', { class: 'muted' }, r.email),
        h('div', { class: 'callout', style: { marginBottom: '16px' } }, 'Use this for reviewers, partners or support fixes. A later Paystack payment or cancellation event will override what you set here.'),
        field('Access', status), field('Until', until, 'Leave a date so complimentary access doesn\'t last forever.'), field('Label', plan, 'Shown in the plan column, e.g. "comp" or "app review".'),
        h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancel'), save));
    });
    done();
  }

  const search = h('input', { type: 'search', placeholder: 'Search by email', 'aria-label': 'Search parents' });
  search.oninput = () => { clearTimeout(timer); timer = setTimeout(() => load(search.value.trim()), 250); };
  await load('');
  return h('div', {}, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Subscribers'), h('p', {}, 'Parents and their access. Payments are handled on the web with Paystack.'))),
    h('div', { style: { maxWidth: '320px', marginBottom: '16px' } }, search), body);
}
