import { h, icon, num, ago, fmtDate, statusPill, storyState } from '../ui.js';

function stat(iconName, bg, fg, n, label, sub) {
  const ico = h('div', { class: 'ico', style: { background: bg, color: fg } }, icon(iconName));
  return h('div', { class: 'card stat' }, ico, h('div', { class: 'n' }, num(n)), h('div', { class: 'l' }, label), sub ? h('div', { class: 'small muted' }, sub) : null);
}

function chart(rows) {
  const max = Math.max(1, ...rows.map((r) => r.reads));
  return h('div', {},
    h('div', { class: 'bars', role: 'img', 'aria-label': `Reads per day, last ${rows.length} days` },
      rows.map((r) => h('div', { style: { height: `${Math.max(3, (r.reads / max) * 100)}%` }, title: `${r.day}: ${r.reads} reads` }))),
    h('div', { class: 'bars-x' }, rows.map((r, i) => h('span', {}, i % 3 === 0 ? r.day.slice(8) : ''))));
}

const EVENT_LABEL = {
  'charge.success': ['Payment received', 'live'], 'subscription.create': ['New subscription', 'live'],
  'subscription.disable': ['Subscription cancelled', 'bad'], 'invoice.payment_failed': ['Payment failed', 'bad'], 'invoice.update': ['Invoice updated', 'draft'],
};

export async function render(ctx) {
  const { api } = ctx;
  const [stats, slots, payments, list] = await Promise.all([api.stats(), api.listFeatured(), api.recentPayments(), api.listStories()]);
  const now = Date.now();
  const current = (t) => slots.find((s) => s.type === t && new Date(s.starts_at) <= now && now < new Date(s.ends_at));
  const upcoming = (t) => slots.find((s) => s.type === t && new Date(s.starts_at) > now);

  const alerts = [];
  for (const [t, label] of [['week', 'Title of the Week'], ['month', 'Title of the Month']]) {
    const cur = current(t);
    if (!cur) alerts.push({ kind: 'bad', text: `No ${label} is set right now, so that slot is empty on the home screen.`, link: '#/featured', cta: 'Schedule one' });
    else if (!upcoming(t) && new Date(cur.ends_at) - now < 2 * 86_400_000) alerts.push({ kind: '', text: `${label} "${cur.stories?.title}" ends ${ago(cur.ends_at)} and nothing is scheduled next.`, link: '#/featured', cta: 'Schedule next' });
  }
  const incomplete = list.filter((s) => s.status === 'draft');
  if (incomplete.length) alerts.push({ kind: '', text: `${incomplete.length} draft${incomplete.length > 1 ? 's' : ''} waiting to be finished.`, link: '#/stories', cta: 'Open stories' });
  const liveCount = stats.stories_live;
  if (liveCount < 15) alerts.push({ kind: '', text: `${liveCount} of the 15 launch stories are live.`, link: '#/stories/new', cta: 'New story' });

  const scheduled = list.filter((s) => storyState(s) === 'scheduled').sort((a, b) => a.published_at.localeCompare(b.published_at));

  return h('div', {},
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Dashboard'), h('p', {}, 'How Genova is doing today.')),
      h('a', { class: 'btn', href: '#/stories/new' }, icon('plus'), 'New story')),
    h('div', { class: 'grid cols-4' },
      stat('book', 'var(--purple-soft)', 'var(--purple-deep)', stats.stories_live, 'Live stories', `${stats.stories_scheduled} scheduled · ${stats.stories_draft} drafts`),
      stat('wallet', 'var(--teal-soft)', 'var(--teal-deep)', stats.subscribers, 'Active subscribers', `${num(stats.parents)} parent accounts`),
      stat('baby', 'var(--amber-soft)', 'var(--amber-deep)', stats.readers, 'Child readers', null),
      stat('eye', 'var(--purple-soft)', 'var(--purple-deep)', stats.reads_7d, 'Stories started (7 days)', `${num(stats.reads_30d)} in 30 days`)),
    alerts.length ? h('div', { class: 'grid', style: { marginTop: '16px' } }, alerts.map((a) =>
      h('div', { class: `callout ${a.kind}` }, h('span', { class: 'grow' }, a.text), h('a', { href: a.link, style: { color: 'inherit', fontWeight: 900 } }, a.cta)))) : null,
    h('div', { class: 'grid cols-2', style: { marginTop: '16px' } },
      h('div', { class: 'card' }, h('h2', {}, 'Stories started, last 14 days'), chart(stats.reads_by_day)),
      h('div', { class: 'card' }, h('h2', {}, 'Top stories this month'),
        stats.top_stories.length && stats.top_stories[0].reads > 0
          ? h('div', { class: 'grid', style: { gap: '12px' } }, stats.top_stories.map((t) => h('div', {},
            h('div', { class: 'row' }, h('b', { class: 'grow' }, t.title), h('span', { class: 'muted' }, `${num(t.reads)} reads`)),
            h('div', { class: 'meter' }, h('i', { style: { width: `${(t.reads / stats.top_stories[0].reads) * 100}%` } })))))
          : h('p', { class: 'muted' }, 'No reads yet. They appear once children start opening stories.'))),
    h('div', { class: 'grid cols-2', style: { marginTop: '16px' } },
      h('div', { class: 'card' }, h('h2', {}, 'Coming up'),
        scheduled.length ? h('div', { class: 'grid', style: { gap: '10px' } }, scheduled.slice(0, 5).map((s) => h('a', { href: `#/stories/${s.id}`, class: 'row', style: { textDecoration: 'none', color: 'inherit' } },
          h('b', { class: 'grow' }, s.title), statusPill('scheduled'), h('span', { class: 'muted small nowrap' }, fmtDate(s.published_at)))))
          : h('p', { class: 'muted' }, 'Nothing scheduled. Schedule a story to publish itself on a date.')),
      h('div', { class: 'card' }, h('h2', {}, 'Recent payments'),
        payments.length ? h('div', { class: 'grid', style: { gap: '10px' } }, payments.map((p) => {
          const [label, kind] = EVENT_LABEL[p.event] || [p.event, 'draft'];
          return h('div', { class: 'row' }, h('span', { class: `pill ${kind}` }, label), h('span', { class: 'grow small muted' }, p.email || ''),
            p.amount != null ? h('b', {}, `${p.currency || ''} ${num(p.amount)}`) : null, h('span', { class: 'small muted nowrap' }, ago(p.at)));
        })) : h('p', { class: 'muted' }, 'No payments yet. Paystack events show up here once the webhook is connected.'))));
}
