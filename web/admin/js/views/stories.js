import { h, icon, fmtDate, statusPill, storyState, toast, busy } from '../ui.js';

export async function render(ctx) {
  const { api } = ctx;
  let [all, cats] = await Promise.all([api.listStories(), api.listCategories()]);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const filters = { q: '', state: 'all', band: 'all' };
  const body = h('div', {});

  const draw = () => {
    const q = filters.q.trim().toLowerCase();
    const rows = all.filter((s) => (!q || s.title.toLowerCase().includes(q))
      && (filters.state === 'all' || storyState(s) === filters.state)
      && (filters.band === 'all' || s.age_band === filters.band));
    body.replaceChildren(rows.length ? h('div', { class: 'card', style: { padding: '8px 8px 4px' } }, h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['', 'Story', 'Status', 'Ages', 'Pages', 'Access', 'Categories', 'Updated', ''].map((t) => h('th', { class: ['Ages', 'Pages', 'Categories', 'Updated'].includes(t) ? 'hide-sm' : '' }, t)))),
      h('tbody', {}, rows.map((s) => row(s)))))) : h('div', { class: 'card empty' }, h('div', { class: 'big' }, '📚'),
      h('h2', {}, all.length ? 'No stories match' : 'No stories yet'), h('p', {}, all.length ? 'Try a different filter.' : 'Create the first Genova story.'),
      all.length ? null : h('a', { class: 'btn', href: '#/stories/new' }, icon('plus'), 'New story')));
  };

  function row(s) {
    const state = storyState(s);
    const go = () => ctx.go(`stories/${s.id}`);
    const del = h('button', { class: 'icon-btn', title: 'Delete story', 'aria-label': `Delete ${s.title}` }, icon('trash'));
    del.onclick = busy(del, async (e) => {
      e.stopPropagation();
      if (!(await ctx.confirm({ title: `Delete "${s.title}"?`, body: 'This removes the story, its pages and images for good. Children who started it will lose their place.', confirmLabel: 'Delete story', danger: true }))) return;
      await api.deleteStory(s.id);
      all = all.filter((x) => x.id !== s.id);
      toast('Story deleted'); draw();
    });
    const toggle = h('button', { class: 'btn sm secondary' }, state === 'draft' ? 'Publish' : 'Unpublish');
    toggle.onclick = busy(toggle, async (e) => {
      e.stopPropagation();
      if (state === 'draft') {
        if (!s.cover_url || s.page_count < 1) { toast('Add a cover and at least one page before publishing.', 'err'); return go(); }
        await api.setStoryStatus(s.id, 'published', null);
      } else await api.setStoryStatus(s.id, 'draft', null);
      all = await api.listStories(); toast(state === 'draft' ? 'Published' : 'Moved back to drafts'); draw();
    });
    return h('tr', { class: 'click', tabindex: 0, onclick: go, onkeydown: (e) => e.key === 'Enter' && go() },
      h('td', {}, s.cover_url ? h('img', { class: 'thumb', src: s.cover_url, alt: '' }) : h('div', { class: 'thumb' })),
      h('td', {}, h('b', {}, s.title), h('div', { class: 'small muted' }, s.slug)),
      h('td', {}, statusPill(state), state === 'scheduled' ? h('div', { class: 'small muted' }, fmtDate(s.published_at)) : null),
      h('td', { class: 'hide-sm' }, s.age_band), h('td', { class: 'hide-sm' }, String(s.page_count)),
      h('td', {}, s.is_free ? h('span', { class: 'pill free' }, 'FREE') : h('span', { class: 'pill purple' }, 'Premium')),
      h('td', { class: 'hide-sm' }, h('span', { class: 'small muted' }, s.story_categories.map((c) => catName.get(c.category_id)).filter(Boolean).join(', ') || '—')),
      h('td', { class: 'small muted nowrap hide-sm' }, fmtDate(s.updated_at)),
      h('td', {}, h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, toggle, del)));
  }

  const search = h('input', { type: 'search', placeholder: 'Search stories', 'aria-label': 'Search stories', oninput: (e) => { filters.q = e.target.value; draw(); } });
  const seg = (key, options) => {
    const wrap = h('div', { class: 'seg', role: 'group' });
    const paint = () => wrap.replaceChildren(...options.map(([v, label]) =>
      h('button', { 'aria-pressed': String(filters[key] === v), onclick: () => { filters[key] = v; paint(); draw(); } }, label)));
    paint(); return wrap;
  };
  draw();
  return h('div', {},
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Stories'), h('p', {}, `${all.length} in the library`)),
      h('a', { class: 'btn', href: '#/stories/new' }, icon('plus'), 'New story')),
    h('div', { class: 'row', style: { marginBottom: '16px' } }, h('div', { style: { width: '260px', maxWidth: '100%' } }, search),
      seg('state', [['all', 'All'], ['live', 'Live'], ['scheduled', 'Scheduled'], ['draft', 'Drafts']]),
      seg('band', [['all', 'All ages'], ['2-4', '2–4'], ['5-8', '5–8'], ['9-12', '9–12']])),
    body);
}
