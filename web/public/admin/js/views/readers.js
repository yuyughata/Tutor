import { h, icon, field, fmtDate, fmtDateTime, num, toast, busy } from '../ui.js';
import { levelName } from '../levels.js';

const TABS = [['week', 'This week'], ['month', 'This month'], ['all_time', 'All time']];
const AWARD_TITLE = { week: 'a top reader of the week', month: 'a top reader of the month', all_time: 'a top reader of all time' };
const PHRASE = { week: 'this week', month: 'this month', all_time: 'in total' };
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Reader leaderboard: who finished the most different stories this week, this month and ever (Nigerian time, weeks start on Monday). */
export async function render(ctx) {
  const { api } = ctx;
  let period = 'week';
  const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Period' });
  const note = h('p', { class: 'muted small' });
  const body = h('div', {});

  const paintTabs = () => tabs.replaceChildren(...TABS.map(([id, label]) => h('button', { type: 'button', 'aria-pressed': String(period === id), onclick: () => { period = id; paintTabs(); load(); } }, label)));

  async function load() {
    body.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    const rows = await api.listLeaderboard(period, 20);
    const first = rows[0];
    note.textContent = period === 'all_time' ? 'Every story finished since the start. Reading the same story again does not add to the count.'
      : period === 'week' ? `Week starting Monday ${first?.period_start ? fmtDate(first.period_start) : ''}. Different stories finished, counted in Nigerian time.`
      : `Month starting ${first?.period_start ? fmtDate(first.period_start) : ''}. Different stories finished, counted in Nigerian time.`;
    body.replaceChildren(rows.length ? h('div', { class: 'card', style: { padding: '8px 8px 4px' } }, h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['#', 'Reader', 'Level', 'Parent', 'Stories', 'Last finished', ''].map((t, i) => h('th', { class: i === 2 || i === 3 || i === 5 ? 'hide-sm' : '' }, t)))),
      h('tbody', {}, rows.map((r) => h('tr', {},
        h('td', { class: 'nowrap' }, MEDAL[r.pos] ? h('span', { 'aria-label': `Rank ${r.pos}` }, MEDAL[r.pos]) : String(r.pos)),
        h('td', {}, h('b', {}, r.child_name)),
        h('td', { class: 'small hide-sm' }, levelName(r.reading_level)),
        h('td', { class: 'small muted hide-sm' }, r.parent_email || '—'),
        h('td', {}, h('b', {}, num(r.stories))),
        h('td', { class: 'small nowrap muted hide-sm' }, fmtDateTime(r.last_completed)),
        h('td', {}, r.awarded ? h('span', { class: 'pill live' }, 'Awarded') : h('button', { class: 'btn sm secondary', onclick: () => award(r) }, icon('trophy'), 'Give award'))))))))
      : h('div', { class: 'card empty' }, h('div', { class: 'big' }, '📚'), h('h2', {}, 'Nobody yet'), h('p', {}, 'Readers appear here once they finish stories.')));
  }

  async function award(r) {
    const status = await api.emailStatus().catch(() => ({ enabled: false }));
    const noteBox = h('textarea', { rows: 3, maxlength: 300, placeholder: 'A short personal note (optional)' });
    noteBox.value = `Well done, ${r.child_name}!`;
    const send = h('input', { type: 'checkbox', checked: !!status.enabled, disabled: !status.enabled || !r.parent_email });
    await ctx.modal((close) => {
      const go = h('button', { class: 'btn' }, icon('trophy'), 'Give award');
      go.onclick = busy(go, async () => {
        await api.giveAward({ child_id: r.child_id, kind: period, period_label: r.period_label, stories: r.stories, note: noteBox.value });
        let mailed = false;
        if (send.checked) {
          try {
            await api.emailSend({ template: 'reader_award', audience: 'one', to: r.parent_email, campaign: `award:${period}`, vars: { child_name: r.child_name, award_title: AWARD_TITLE[period], stories: String(r.stories), period_phrase: PHRASE[period], note: noteBox.value.trim() } });
            mailed = true;
          } catch (e) { toast(`Award saved, but the email failed: ${e.message}`, 'err'); }
        }
        toast(mailed ? `Award given and ${r.parent_email} emailed` : 'Award given');
        close(true);
      });
      return h('div', {}, h('h2', {}, 'Give an award'),
        h('p', { class: 'muted' }, `${r.child_name} finished ${r.stories} ${r.stories === 1 ? 'story' : 'stories'} (${TABS.find((t) => t[0] === period)[1].toLowerCase()}). The award appears in their My books page in the app.`),
        field('Note', noteBox, 'Shown with the award in the app and in the email.'),
        h('label', { class: 'switch' }, send, h('span', {}, status.enabled ? `Email ${r.parent_email || 'the parent'}` : 'Email is not activated yet (Email > Connection)')),
        h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancel'), go));
    });
    load();
  }

  paintTabs();
  await load();
  return h('div', {}, h('div', { class: 'row', style: { marginBottom: '8px' } }, h('h1', { class: 'grow' }, 'Top readers'), tabs), note,
    h('p', { class: 'small muted' }, 'You can reward the readers at the top as time goes on. Children\'s names are only visible to admins.'), body);
}
