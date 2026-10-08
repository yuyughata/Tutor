import { h, icon, fmtDate, field, toast, busy, toDateInput, storyState } from '../ui.js';

const LABEL = { week: 'Title of the Week', month: 'Title of the Month' };
const DAY = 86_400_000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** Sensible defaults: next Monday for 7 days, or the 1st of next month for a month. */
function defaults(type, slots) {
  const last = slots.filter((s) => s.type === type).map((s) => new Date(s.ends_at).getTime()).sort((a, b) => b - a)[0];
  const from = startOfDay(Math.max(Date.now(), last || 0));
  if (type === 'week') return [from, new Date(from.getTime() + 7 * DAY)];
  const end = new Date(from); end.setMonth(end.getMonth() + 1);
  return [from, end];
}

export async function render(ctx) {
  const { api } = ctx;
  const root = h('div', {});
  let slots = [], stories = [];

  async function reload() {
    [slots, stories] = await Promise.all([api.listFeatured(), api.listStories()]);
    root.replaceChildren(
      h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Featured'), h('p', {}, 'Choose the stories highlighted on the app home screen.'))),
      h('div', { class: 'grid cols-2' }, panel('week'), panel('month')));
  }

  function panel(type) {
    const now = Date.now();
    const mine = slots.filter((s) => s.type === type).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const cur = mine.find((s) => new Date(s.starts_at) <= now && now < new Date(s.ends_at));
    const next = mine.filter((s) => new Date(s.starts_at) > now);
    const past = mine.filter((s) => new Date(s.ends_at) <= now).reverse().slice(0, 3);
    const add = h('button', { class: 'btn sm', onclick: () => edit(type) }, icon('plus'), 'Schedule');
    return h('div', { class: 'card' },
      h('div', { class: 'row', style: { marginBottom: '14px' } }, h('h2', { class: 'grow' }, LABEL[type]), add),
      cur ? h('div', { class: 'row', style: { marginBottom: '16px', alignItems: 'flex-start', flexWrap: 'nowrap' } },
        cur.stories?.cover_url ? h('img', { class: 'thumb', style: { width: '66px', height: '88px' }, src: cur.stories.cover_url, alt: '' }) : h('div', { class: 'thumb', style: { width: '66px', height: '88px' } }),
        h('div', {}, h('span', { class: 'pill live' }, 'On now'), h('h3', { style: { marginTop: '6px' } }, cur.stories?.title || 'Unknown story'), h('div', { class: 'small muted' }, `${fmtDate(cur.starts_at)} → ${fmtDate(cur.ends_at)}`)))
        : h('div', { class: 'callout bad', style: { marginBottom: '16px' } }, `Nothing is featured right now. The home screen has an empty ${LABEL[type]} slot.`),
      h('h3', { class: 'muted small', style: { textTransform: 'uppercase', letterSpacing: '.6px', margin: '4px 0 8px' } }, 'Scheduled'),
      next.length ? next.map((s) => item(s)) : h('p', { class: 'muted small' }, 'Nothing scheduled after this.'),
      past.length ? [h('h3', { class: 'muted small', style: { textTransform: 'uppercase', letterSpacing: '.6px', margin: '18px 0 8px' } }, 'Recent'), past.map((s) => item(s, true))] : null);
  }

  function item(s, dim) {
    const del = h('button', { class: 'icon-btn', title: 'Remove', 'aria-label': `Remove ${s.stories?.title}` }, icon('trash'));
    del.onclick = busy(del, async () => {
      if (!(await ctx.confirm({ title: 'Remove this slot?', body: `"${s.stories?.title}" will no longer be featured for ${fmtDate(s.starts_at)} → ${fmtDate(s.ends_at)}.`, confirmLabel: 'Remove', danger: true }))) return;
      await api.deleteFeatured(s.id); toast('Removed'); await reload();
    });
    return h('div', { class: 'row', style: { padding: '8px 0', borderTop: '1px solid var(--line)', opacity: dim ? 0.6 : 1, flexWrap: 'nowrap' } },
      h('div', { class: 'grow' }, h('b', {}, s.stories?.title || 'Unknown story'), h('div', { class: 'small muted' }, `${fmtDate(s.starts_at)} → ${fmtDate(s.ends_at)}`)),
      h('button', { class: 'icon-btn', title: 'Edit', 'aria-label': `Edit ${s.stories?.title}`, onclick: () => edit(s.type, s) }, icon('calendar')), del);
  }

  async function edit(type, slot) {
    const options = stories.filter((s) => storyState(s) !== 'draft');
    if (!options.length) return toast('Publish a story first. Only live or scheduled stories can be featured.', 'err');
    const [d0, d1] = slot ? [new Date(slot.starts_at), new Date(slot.ends_at)] : defaults(type, slots);
    const pick = h('select', {}, options.map((s) => h('option', { value: s.id, selected: slot?.story_id === s.id }, s.title)));
    const from = h('input', { type: 'date', value: toDateInput(d0.toISOString()) });
    const to = h('input', { type: 'date', value: toDateInput(d1.toISOString()) });
    await ctx.modal((close) => {
      const err = h('div', { class: 'callout bad', hidden: true, role: 'alert', style: { marginTop: '12px' } });
      const save = h('button', { class: 'btn' }, 'Save');
      save.onclick = busy(save, async () => {
        err.hidden = true;
        const starts = startOfDay(from.value + 'T00:00'), ends = startOfDay(to.value + 'T00:00');
        if (!(ends > starts)) { err.textContent = 'The end date must be after the start date.'; err.hidden = false; return; }
        try { await api.saveFeatured({ id: slot?.id, type, story_id: pick.value, starts_at: starts.toISOString(), ends_at: ends.toISOString() }); }
        catch (e) { err.textContent = e.message; err.hidden = false; return; }
        toast('Saved'); close(true);
      });
      return h('div', {}, h('h2', {}, `${slot ? 'Edit' : 'Schedule'} ${LABEL[type]}`),
        h('p', { class: 'muted' }, 'Runs from the start date until the end date (midnight).'),
        field('Story', pick), h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Starts', from)), h('div', { class: 'grow' }, field('Ends', to))), err,
        h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancel'), save));
    });
    await reload();
  }

  await reload();
  return root;
}
