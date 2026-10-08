import { h, icon, field, fmtDate, num, toast, busy, toDateInput } from '../ui.js';

/** Plain-language access state: combines the stored status with the 5-day grace rule. */
function accessState(r) {
  const ended = r.current_period_end && new Date(r.current_period_end) < new Date();
  if (r.has_access) {
    if (r.status === 'canceled') return ['Ends at period end', 'scheduled'];
    if (r.status === 'past_due') return ['Past due · grace', 'scheduled'];
    if (ended) return ['Renewal late · grace', 'scheduled'];
    return [r.plan === 'comp' ? 'Complimentary' : 'Premium', 'live'];
  }
  if (r.status === 'none') return ['Free', 'draft'];
  return ['Free · lapsed', 'bad'];
}

const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
};

export async function render(ctx) {
  const { api } = ctx;
  const body = h('div', {});
  let timer;

  async function load(search) {
    const rows = await api.listSubscribers(search);
    body.replaceChildren(rows.length ? h('div', { class: 'card', style: { padding: '8px 8px 4px' } }, h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Parent', 'Joined', 'Readers', 'Plan', 'Access', 'Access until', ''].map((t, i) => h('th', { class: i === 1 || i === 2 ? 'hide-sm' : '' }, t)))),
      h('tbody', {}, rows.map((r) => {
        const [label, kind] = accessState(r);
        const until = r.access_until ?? null;
        return h('tr', {},
          h('td', {}, h('b', {}, r.email || '(no email)'), r.is_admin ? h('span', { class: 'pill purple', style: { marginLeft: '8px' } }, 'Admin') : null),
          h('td', { class: 'small muted nowrap hide-sm' }, fmtDate(r.joined_at)), h('td', { class: 'hide-sm' }, num(r.readers)),
          h('td', { class: 'small' }, r.plan || '—'), h('td', {}, h('span', { class: `pill ${kind}` }, label)),
          h('td', { class: 'small nowrap', style: { color: r.has_access || !until ? '' : 'var(--danger)' } }, r.has_access && !until && r.status !== 'none' ? 'No end date' : fmtDate(until)),
          h('td', {}, h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
            h('button', { class: 'btn sm secondary', onclick: () => manage(r, () => load(search)) }, 'Access'),
            h('button', { class: 'btn sm ghost', title: 'Password help', onclick: () => passwordHelp(r) }, 'Password'))));
      }))))) : h('div', { class: 'card empty' }, h('div', { class: 'big' }, '👪'), h('h2', {}, 'No parents found'), h('p', {}, 'Accounts appear here as parents sign up on the website.')));
  }

  async function manage(r, done) {
    const status = h('select', {}, [['active', 'Active (full access)'], ['trialing', 'Trial'], ['past_due', 'Past due (5-day grace)'], ['canceled', 'Cancelled (until end date)'], ['expired', 'Expired (Free)']].map(([v, l]) => h('option', { value: v, selected: r.status === v }, l)));
    const until = h('input', { type: 'date', value: toDateInput(r.current_period_end || new Date(Date.now() + 365 * 86_400_000).toISOString()) });
    const plan = h('input', { type: 'text', value: r.plan || 'comp', maxlength: 40 });
    await ctx.modal((close) => {
      const save = h('button', { class: 'btn' }, 'Save access');
      save.onclick = busy(save, async () => {
        await api.setEntitlement(r.parent_id, status.value, until.value ? new Date(until.value + 'T23:59:59').toISOString() : null, plan.value.trim());
        toast('Access updated'); close(true);
      });
      return h('div', {}, h('h2', {}, 'Manage access'), h('p', { class: 'muted' }, r.email),
        h('div', { class: 'callout', style: { marginBottom: '16px' } }, 'Use this for reviewers, partners or support fixes. Access runs until the date below plus a 5-day grace period (none for Cancelled). A later Paystack payment or cancellation event overrides what you set here.'),
        field('Access', status), field('Paid until', until, 'Leave a date so complimentary access doesn\'t last forever.'), field('Label', plan, 'Shown in the plan column, e.g. "comp" or "app review".'),
        h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancel'), save));
    });
    done();
  }

  async function passwordHelp(r) {
    await ctx.modal((close) => {
      const sendBtn = h('button', { class: 'btn secondary' }, icon('check'), 'Send reset email');
      sendBtn.onclick = busy(sendBtn, async () => {
        if (!(await ctx.confirm({ title: 'Send a reset email?', body: `${r.email} will get an email with a code to choose a new password.`, confirmLabel: 'Send' }))) return;
        await api.supportSendReset(r.email); toast(`Reset email sent to ${r.email}`);
      });
      const pw = h('input', { type: 'text', value: randomPassword(), autocomplete: 'off', spellcheck: false, 'aria-label': 'Temporary password', style: { fontFamily: 'ui-monospace, monospace' } });
      const regen = h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { pw.value = randomPassword(); } }, 'Generate another');
      const result = h('div', { class: 'callout ok', hidden: true, role: 'status', style: { marginTop: '12px' } });
      const setBtn = h('button', { class: 'btn' }, 'Set temporary password');
      setBtn.onclick = busy(setBtn, async () => {
        if (pw.value.length < 8) throw new Error('Use at least 8 characters.');
        if (!(await ctx.confirm({ title: 'Replace their password?', body: `${r.email} must use the new password to sign in. Share it securely and ask them to change it after signing in.`, confirmLabel: 'Set password', danger: true }))) return;
        await api.supportSetPassword(r.email, pw.value);
        result.textContent = `Password set. Share it with the parent now; it is not shown again: ${pw.value}`; result.hidden = false; toast('Temporary password set');
      });
      return h('div', {}, h('h2', {}, 'Password help'), h('p', { class: 'muted' }, r.email),
        h('div', { class: 'card', style: { boxShadow: 'none', marginBottom: '14px' } }, h('h3', {}, 'Best option: email a reset code'), h('p', { class: 'muted small' }, 'The parent chooses their own password. Nothing sensitive passes through you.'), sendBtn),
        h('div', { class: 'card', style: { boxShadow: 'none' } }, h('h3', {}, 'If email is not working: set a temporary password'),
          field('Temporary password', h('div', {}, pw, regen)), setBtn, result),
        h('p', { class: 'small muted' }, 'Both actions are recorded in the support log (Settings).'),
        h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => close(true) }, 'Done')));
    });
  }

  const search = h('input', { type: 'search', placeholder: 'Search by email', 'aria-label': 'Search parents' });
  search.oninput = () => { clearTimeout(timer); timer = setTimeout(() => load(search.value.trim()), 250); };
  await load('');
  return h('div', {}, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Subscribers'), h('p', {}, 'Parents, their plan and access. Premium lapses 5 days after a missed renewal.'))),
    h('div', { style: { maxWidth: '320px', marginBottom: '16px' } }, search), body);
}
