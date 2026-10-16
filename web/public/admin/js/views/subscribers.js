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

const GENDER = { female: 'Female', male: 'Male', prefer_not_to_say: 'Prefer not to say' };
/** "First Last" from the details a parent added on the website, or '' when they have not added a name. */
const fullName = (d) => [d?.first_name, d?.last_name].filter(Boolean).join(' ');

const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
};

export async function render(ctx) {
  const { api } = ctx;
  const body = h('div', {});
  let timer;
  const selected = new Set(); // parent ids ticked for bulk delete
  let current = [];

  async function load(search) {
    const rows = await api.listSubscribers(search);
    current = rows;
    for (const id of [...selected]) if (!rows.some((r) => r.parent_id === id)) selected.delete(id);
    const deletable = rows.filter((r) => !r.is_admin);
    const bulk = h('div', { class: 'row', style: { margin: '0 0 12px', alignItems: 'center' }, hidden: !selected.size });
    const paintBulk = () => {
      bulk.hidden = !selected.size;
      bulk.replaceChildren(h('span', { class: 'small' }, `${selected.size} selected`), h('button', { class: 'btn sm danger', onclick: () => deleteAccounts(rows.filter((r) => selected.has(r.parent_id)), () => load(search)) }, `Delete ${selected.size} account${selected.size === 1 ? '' : 's'}`), h('button', { class: 'btn sm ghost', onclick: () => { selected.clear(); load(search); } }, 'Clear'));
    };
    paintBulk();
    const all = h('input', { type: 'checkbox', 'aria-label': 'Select all parents on this list', checked: deletable.length > 0 && deletable.every((r) => selected.has(r.parent_id)), disabled: !deletable.length });
    all.onchange = () => { for (const r of deletable) all.checked ? selected.add(r.parent_id) : selected.delete(r.parent_id); load(search); };
    body.replaceChildren(bulk, rows.length ? h('div', { class: 'card', style: { padding: '8px 8px 4px' } }, h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, all), ['Parent', 'Joined', 'Readers', 'Plan', 'Access', 'Access until', ''].map((t, i) => h('th', { class: i === 1 || i === 2 ? 'hide-sm' : '' }, t)))),
      h('tbody', {}, rows.map((r) => {
        const [label, kind] = accessState(r);
        const until = r.access_until ?? null;
        const pick = h('input', { type: 'checkbox', 'aria-label': `Select ${r.email}`, checked: selected.has(r.parent_id), disabled: r.is_admin, title: r.is_admin ? 'Admins cannot be deleted here' : '' });
        pick.onchange = () => { pick.checked ? selected.add(r.parent_id) : selected.delete(r.parent_id); paintBulk(); all.checked = deletable.every((x) => selected.has(x.parent_id)); };
        return h('tr', {},
          h('td', {}, pick),
          h('td', {}, h('b', {}, r.email || '(no email)'), r.is_admin ? h('span', { class: 'pill purple', style: { marginLeft: '8px' } }, 'Admin') : null,
            fullName(r.details) ? h('div', { class: 'small muted' }, fullName(r.details)) : null),
          h('td', { class: 'small muted nowrap hide-sm' }, fmtDate(r.joined_at)), h('td', { class: 'hide-sm' }, num(r.readers)),
          h('td', { class: 'small' }, r.plan || '—'), h('td', {}, h('span', { class: `pill ${kind}` }, label)),
          h('td', { class: 'small nowrap', style: { color: r.has_access || !until ? '' : 'var(--danger)' } }, r.has_access && !until && r.status !== 'none' ? 'No end date' : fmtDate(until)),
          h('td', {}, h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
            h('button', { class: 'btn sm secondary', onclick: () => manage(r, () => load(search)) }, 'Access'),
            h('button', { class: 'btn sm ghost', 'aria-label': `Details for ${r.email}`, onclick: () => showDetails(r) }, 'Details'),
            h('button', { class: 'btn sm ghost', title: 'Password help', onclick: () => passwordHelp(r) }, 'Password'),
            r.is_admin ? null : h('button', { class: 'btn sm ghost', style: { color: 'var(--danger)' }, 'aria-label': `Delete account ${r.email}`, onclick: () => deleteAccounts([r], () => { selected.delete(r.parent_id); load(search); }) }, 'Delete'))));
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

  /** The optional details a parent added on their Account page (read-only here). */
  async function showDetails(r) {
    const d = r.details;
    const rows = d ? [
      ['Name', fullName(d)], ['Phone', d.phone ? h('a', { href: `tel:${d.phone.replace(/[^0-9+]/g, '')}` }, d.phone) : ''],
      ['Email', h('a', { href: `mailto:${r.email}` }, r.email)], ['Address', d.address], ['State', d.state], ['Gender', GENDER[d.gender] || ''],
    ] : [];
    await ctx.modal((close) => h('div', {}, h('h2', {}, 'Parent details'), h('p', { class: 'muted' }, r.email),
      d ? h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(80px, 110px) 1fr', gap: '10px 14px', margin: '12px 0 18px' } },
        rows.flatMap(([k, v]) => [h('div', { class: 'small muted' }, k), h('div', { style: { fontWeight: '700', wordBreak: 'break-word' } }, v || h('span', { class: 'muted' }, 'Not given'))]))
        : h('div', { class: 'callout', style: { margin: '12px 0 18px' } }, 'This parent has not added their details yet. They can do it on the Account page of the website.'),
      d?.updated_at ? h('p', { class: 'small muted' }, `Last updated ${fmtDate(d.updated_at)}`) : null,
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => close(true) }, 'Close'))));
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

  /** Delete one or several parent accounts. One account: type its email. Several: type DELETE. */
  async function deleteAccounts(list, done) {
    if (!list.length) return;
    const many = list.length > 1;
    const word = many ? 'DELETE' : list[0].email;
    const pending = [...list]; // accounts still to delete (a retry only tries the ones that failed)
    await ctx.modal((close) => {
      const typed = h('input', { type: 'text', autocomplete: 'off', spellcheck: false, 'aria-label': many ? 'Type DELETE to confirm' : 'Type the account email to confirm' });
      const force = h('input', { type: 'checkbox', id: 'del-force' });
      const forceRow = h('label', { class: 'small', for: 'del-force', hidden: true, style: { display: 'none', marginTop: '10px', gap: '8px', alignItems: 'center' } }, force, 'Delete anyway. I will cancel their Paystack subscription myself.');
      const result = h('div', { class: 'callout bad', hidden: true, role: 'alert', style: { marginTop: '12px' } });
      const go = h('button', { class: 'btn danger', disabled: true }, many ? `Delete ${list.length} accounts` : 'Delete account');
      typed.oninput = () => { go.disabled = typed.value.trim().toLowerCase() !== word.toLowerCase(); };
      go.onclick = busy(go, async () => {
        result.hidden = true;
        const failed = [];
        let removed = 0;
        for (const r of [...pending]) {
          try { await api.supportDeleteAccount(r.email, force.checked); removed++; pending.splice(pending.indexOf(r), 1); } catch (e) { failed.push(`${r.email}: ${e.message}`); }
        }
        if (!failed.length) { toast(removed === 1 ? 'Account deleted' : `${removed} accounts deleted`); close(true); return; }
        if (failed.some((f) => /active Paystack subscription/.test(f))) { forceRow.hidden = false; forceRow.style.display = 'flex'; }
        result.textContent = `${removed ? `${removed} deleted. ` : ''}Not deleted: ${failed.join(' | ')}`; result.hidden = false;
        if (removed) done();
      });
      return h('div', {}, h('h2', {}, many ? `Delete ${list.length} accounts?` : 'Delete this account?'),
        h('div', { class: 'callout bad', style: { marginBottom: '14px' } }, 'This cannot be undone. The sign-in, reader profiles, reading progress, favourites, learned words, awards and support messages are removed for good. The person would have to sign up again.'),
        many ? h('ul', { class: 'small', style: { maxHeight: '140px', overflow: 'auto', margin: '0 0 12px', paddingLeft: '18px' } }, list.map((r) => h('li', {}, r.email))) : h('p', {}, h('b', {}, list[0].email)),
        h('p', { class: 'small muted' }, 'Admin accounts cannot be deleted here. A record of who was deleted stays in the support log (Settings).'),
        field(many ? 'Type DELETE to confirm' : 'Type the account email to confirm', typed), forceRow, result,
        h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancel'), go));
    });
    done();
  }

  const search = h('input', { type: 'search', placeholder: 'Search by email', 'aria-label': 'Search parents' });
  search.oninput = () => { clearTimeout(timer); timer = setTimeout(() => load(search.value.trim()), 250); };
  await load('');
  return h('div', {}, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Subscribers'), h('p', {}, 'Parents, their plan and access. Premium lapses 5 days after a missed renewal. Tick accounts to delete them in one go, for example demo accounts.'))),
    h('div', { style: { maxWidth: '320px', marginBottom: '16px' } }, search), body);
}
