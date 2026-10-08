// In-memory stand-in for api.js. Used only when config.js sets `demo: true`
// (previewing the dashboard, UI testing). Nothing is saved; reloading resets it.
// It mirrors the database rules that matter to the UI: publish dates, overlap guard, last-admin guard.

const svgArt = (emoji, c1, c2) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="195" font-size="130" text-anchor="middle">${emoji}</text></svg>`);
const art = {
  fox: svgArt('🦊', '#ffbe00', '#ab46d2'), moon: svgArt('🌙', '#10a19c', '#3b1f5c'), leopard: svgArt('🐆', '#ab46d2', '#232323'),
  bear: svgArt('🐻', '#10a19c', '#ffbe00'), dragon: svgArt('🐉', '#7a2e99', '#10a19c'), boat: svgArt('⛵', '#10a19c', '#ab46d2'),
};
const day = 86_400_000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString();
const uid = () => 'd-' + Math.random().toString(16).slice(2, 10);
const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 40));

export function createDemoApi() {
  let signedIn = false;
  const cats = [
    { id: 'c1', slug: 'adventure', name: 'Adventure', sort_order: 1 }, { id: 'c2', slug: 'animals', name: 'Animals', sort_order: 2 },
    { id: 'c3', slug: 'bedtime', name: 'Bedtime', sort_order: 3 }, { id: 'c4', slug: 'fantasy', name: 'Fantasy', sort_order: 4 },
  ];
  const authors = [{ id: 'a1', name: 'CUSTAR' }];
  const mk = (id, title, band, free, status, pub, key, cover, categoryIds, texts) => ({
    id, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''), title, synopsis: `The story of ${title}.`, cover_url: cover,
    author_id: 'a1', reading_level: band, status, is_free: free, reading_minutes: 3, published_at: pub, updated_at: iso(-Math.random() * 9),
    categoryIds, pages: texts.map((t, i) => ({ id: uid(), position: i + 1, image_url: art[key], text: t })),
  });
  const stories = [
    mk('s1', 'The Curious Little Fox', 'sunrise', true, 'published', iso(-12), 'fox', art.fox, ['c2', 'c1'], ['Fox woke up and sniffed the air.', 'A trail of glowing berries led past the old oak tree.', 'All his friends were waiting. Surprise!']),
    mk('s2', 'Luna and the Firefly', 'spark', true, 'published', iso(-30), 'moon', art.moon, ['c3', 'c4'], ['Late one evening, Luna sat by her window.', 'A soft sparkle danced across her room.']),
    mk('s3', 'The Child and the Snow Leopard', 'seeker', false, 'published', iso(-45), 'leopard', art.leopard, ['c1', 'c2'], ['The mountain wind howled.', 'Two pale eyes watched from the ridge.', 'Side by side, they walked on.']),
    mk('s4', 'The Dragon Who Hated Fire', 'spark', false, 'scheduled', iso(6), 'dragon', art.dragon, ['c4'], ['Ember was a dragon with a secret.', 'She baked the fluffiest cakes.']),
    mk('s5', 'Bedtime for Bear', 'sunrise', true, 'draft', null, 'bear', art.bear, ['c3'], ['Bear yawned a great big yawn.']),
    mk('s6', 'Captain Pip and the Paper Boat', 'spark', false, 'draft', null, 'boat', '', [], []),
  ];
  const featured = [
    { id: 'f1', type: 'week', story_id: 's2', starts_at: iso(-2), ends_at: iso(5) },
    { id: 'f2', type: 'month', story_id: 's3', starts_at: iso(-10), ends_at: iso(20) },
  ];
  const GRACE = 5 * day;
  const people = [
    { parent_id: 'p1', email: 'amara@example.com', joined_at: iso(-60), status: 'active', plan: 'monthly', current_period_end: iso(11), readers: 2 },
    { parent_id: 'p2', email: 'kofi@example.com', joined_at: iso(-41), status: 'active', plan: 'quarterly', current_period_end: iso(80), readers: 1 },
    { parent_id: 'p3', email: 'zainab@example.com', joined_at: iso(-20), status: 'past_due', plan: 'monthly', current_period_end: iso(-2), readers: 3 },
    { parent_id: 'p4', email: 'tunde@example.com', joined_at: iso(-9), status: 'none', plan: null, current_period_end: null, readers: 1 },
    { parent_id: 'p5', email: 'review@apple.example', joined_at: iso(-3), status: 'active', plan: 'comp', current_period_end: iso(30), readers: 1 },
    { parent_id: 'me', email: 'you@custar.example', joined_at: iso(-90), status: 'none', plan: null, current_period_end: null, readers: 0 },
  ];
  // same rule as the database: 5 days of grace after a missed renewal, cancelled keeps what was paid for
  const accessUntil = (p) => {
    if (!p.current_period_end) return p.status === 'active' || p.status === 'trialing' ? null : undefined;
    const end = new Date(p.current_period_end).getTime();
    if (['active', 'trialing', 'past_due'].includes(p.status)) return new Date(end + GRACE).toISOString();
    if (p.status === 'canceled') return p.current_period_end;
    return undefined;
  };
  const hasAccess = (p) => { const u = accessUntil(p); return u === null || (u !== undefined && new Date(u) > new Date()); };
  let legal = { slug: 'privacy-policy', title: 'Privacy Policy', version: 1, updated_at: iso(-3), body: 'SAMPLE TEXT: placeholder wording.\n\n# Our promise to families\nGenova is a children\'s storybook app made by CUSTAR. We do not show ads and we never sell personal information.\n\n# What we collect\n- Parent email address\n- A child\'s first name or nickname, avatar and reading level\n- Reading activity such as stories started and finished' };
  const supportLog = [{ id: 1, action: 'send_reset', target_email: 'amara@example.com', created_at: iso(-1) }];
  let admins = [{ id: 'me', email: 'you@custar.example' }];
  const state = (s) => (s.status === 'draft' ? 'draft' : new Date(s.published_at) <= new Date() ? 'live' : 'scheduled');

  const apply = (s) => { // what the database triggers do
    if (s.status === 'published' && !s.published_at) s.published_at = new Date().toISOString();
    if (s.status === 'draft') s.published_at = null;
    s.updated_at = new Date().toISOString();
    s.page_count = s.pages.length;
  };
  stories.forEach((s) => { s.page_count = s.pages.length; });

  return {
    demo: true,
    async session() { return signedIn ? { user: { id: 'me' } } : null; },
    async signIn(email, password) { if (!email || !password) throw new Error('Enter your email and password.'); signedIn = true; },
    async signOut() { signedIn = false; },
    onAuthChange() { return { unsubscribe() {} }; },
    async me() { return signedIn ? { id: 'me', email: 'you@custar.example', isAdmin: true } : null; },

    async stats() {
      const reads = Array.from({ length: 14 }, (_, i) => ({ day: new Date(Date.now() - (13 - i) * day).toISOString().slice(0, 10), reads: 20 + ((i * 37) % 55) }));
      return delay({
        stories_live: stories.filter((s) => state(s) === 'live').length,
        stories_scheduled: stories.filter((s) => state(s) === 'scheduled').length,
        stories_draft: stories.filter((s) => s.status === 'draft').length,
        parents: people.length, readers: people.reduce((n, p) => n + p.readers, 0),
        subscribers: people.filter(hasAccess).length, past_due: people.filter((p) => p.status === 'past_due' && hasAccess(p)).length,
        reads_7d: reads.slice(-7).reduce((n, r) => n + r.reads, 0), reads_30d: reads.reduce((n, r) => n + r.reads, 0) * 2,
        reads_by_day: reads,
        top_stories: [{ id: 's2', title: 'Luna and the Firefly', reads: 187 }, { id: 's3', title: 'The Child and the Snow Leopard', reads: 142 }, { id: 's1', title: 'The Curious Little Fox', reads: 96 }],
      });
    },
    async recentPayments() {
      return delay([
        { id: 1, event: 'charge.success', at: iso(-0.1), email: 'amara@example.com', amount: 2500, currency: 'NGN' },
        { id: 2, event: 'subscription.create', at: iso(-1.2), email: 'kofi@example.com', amount: null, currency: null },
        { id: 3, event: 'invoice.payment_failed', at: iso(-2), email: 'zainab@example.com', amount: null, currency: null },
      ]);
    },

    async listStories() {
      return delay(stories.map((s) => ({ ...s, pages: undefined, authors: { name: 'CUSTAR' }, story_categories: s.categoryIds.map((category_id) => ({ category_id })) })));
    },
    async getStory(id) { const s = stories.find((x) => x.id === id); return delay(s || null); },
    async saveStory(story, categoryIds, pages) {
      if (stories.some((s) => s.slug === story.slug && s.id !== story.id)) throw new Error('That URL name (slug) is already used by another story.');
      const next = { ...story, categoryIds: [...categoryIds], pages: pages.map((p, i) => ({ id: p.id || uid(), position: i + 1, image_url: p.image_url, text: p.text })) };
      apply(next);
      const i = stories.findIndex((s) => s.id === story.id);
      if (i >= 0) stories[i] = next; else stories.unshift(next);
      return story.id;
    },
    async setStoryStatus(id, status, publishedAt) { const s = stories.find((x) => x.id === id); s.status = status; s.published_at = publishedAt ?? null; apply(s); await delay(0); },
    async deleteStory(id) { const i = stories.findIndex((s) => s.id === id); if (i >= 0) stories.splice(i, 1); for (let k = featured.length - 1; k >= 0; k--) if (featured[k].story_id === id) featured.splice(k, 1); await delay(0); },
    async uploadCover(_id, file) { return readFile(file); },
    async uploadPageImage(_id, file) { return readFile(file); },
    async pageImageUrl(path) { return path || ''; },

    async listAuthors() { return delay(authors); },
    async listCategories() { return delay([...cats].sort((a, b) => a.sort_order - b.sort_order)); },
    async saveCategory(c) {
      if (cats.some((x) => x.slug === c.slug && x.id !== c.id)) throw new Error('That already exists.');
      if (c.id) Object.assign(cats.find((x) => x.id === c.id), c); else cats.push({ id: uid(), ...c });
      return delay(c);
    },
    async deleteCategory(id) { const i = cats.findIndex((c) => c.id === id); if (i >= 0) cats.splice(i, 1); stories.forEach((s) => { s.categoryIds = s.categoryIds.filter((c) => c !== id); }); await delay(0); },

    async listFeatured() {
      const rows = featured.map((f) => { const s = stories.find((x) => x.id === f.story_id); return { ...f, stories: s ? { title: s.title, cover_url: s.cover_url } : null }; });
      return delay(rows.sort((a, b) => b.starts_at.localeCompare(a.starts_at)));
    },
    async saveFeatured(s) {
      const a = new Date(s.starts_at).getTime(), b = new Date(s.ends_at).getTime();
      if (b <= a) throw new Error('The end must be after the start.');
      if (featured.some((f) => f.type === s.type && f.id !== s.id && a < new Date(f.ends_at).getTime() && new Date(f.starts_at).getTime() < b)) {
        throw new Error('That overlaps an existing slot of the same kind. Pick different dates.');
      }
      if (s.id) Object.assign(featured.find((f) => f.id === s.id), s); else featured.push({ id: uid(), ...s });
      await delay(0);
    },
    async deleteFeatured(id) { const i = featured.findIndex((f) => f.id === id); if (i >= 0) featured.splice(i, 1); await delay(0); },

    async listSubscribers(search) {
      const q = (search || '').toLowerCase();
      return delay(people.filter((p) => !q || p.email.includes(q)).sort((a, b) => b.joined_at.localeCompare(a.joined_at))
        .map((p) => ({ ...p, access_until: accessUntil(p) ?? null, has_access: hasAccess(p), is_admin: admins.some((a) => a.id === p.parent_id) })));
    },
    async setEntitlement(parentId, status, until, plan) { Object.assign(people.find((p) => p.parent_id === parentId), { status, current_period_end: until, plan: plan || null }); await delay(0); },
    async getLegal() { return delay(legal); },
    async saveLegal(_slug, title, body) { legal = { ...legal, title, body, version: legal.version + (title !== legal.title || body !== legal.body ? 1 : 0), updated_at: new Date().toISOString() }; return delay(legal); },
    async supportSendReset(email) {
      if (!people.some((p) => p.email === email)) throw new Error('No account found for that email.');
      supportLog.unshift({ id: Date.now(), action: 'send_reset', target_email: email, created_at: new Date().toISOString() }); return delay({ ok: true });
    },
    async supportSetPassword(email, password) {
      if (!people.some((p) => p.email === email)) throw new Error('No account found for that email.');
      if (!password || password.length < 8) throw new Error('Use at least 8 characters.');
      supportLog.unshift({ id: Date.now(), action: 'set_password', target_email: email, created_at: new Date().toISOString() }); return delay({ ok: true });
    },
    async listSupportActions() { return delay(supportLog.slice(0, 8)); },
    async listAdmins() { return delay(admins); },
    async setAdmin(email, isAdmin) {
      const p = people.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (!p) throw new Error(`No account found for ${email}. They need to sign up first.`);
      if (!isAdmin && admins.length <= 1) throw new Error('You cannot remove the last admin.');
      admins = admins.filter((a) => a.id !== p.parent_id);
      if (isAdmin) admins.push({ id: p.parent_id, email: p.email });
      await delay(0);
    },
  };
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose a JPG, PNG, WebP or GIF image.'));
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read that file.'));
    r.readAsDataURL(file);
  });
}
