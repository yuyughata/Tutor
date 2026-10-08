// Supabase-backed data layer for the admin CMS.
// createApi(sb) takes a supabase-js client so it can be unit tested with a fake transport.

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function friendly(error) {
  const code = error?.code;
  const msg = error?.message || 'Something went wrong';
  if (code === '23505') return new Error(/slug/.test(error.message + (error.details || '')) ? 'That URL name (slug) is already used by another story.' : 'That already exists.');
  if (code === '23P01') return new Error('That overlaps an existing slot of the same kind. Pick different dates.');
  if (code === '42501' || /row-level security/i.test(msg)) return new Error('Your account is not allowed to do that.');
  if (code === '23503') return new Error('That item is still in use elsewhere.');
  return new Error(msg);
}
const unwrap = ({ data, error }) => { if (error) throw friendly(error); return data; };

const extOf = (file) => (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
function checkImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Please choose a JPG, PNG, WebP or GIF image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('That image is over 8 MB. Please use a smaller one.');
}
const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function createApi(sb) {
  const signedCache = new Map();

  async function removeFolder(bucket, folder, keep = []) {
    const { data } = await sb.storage.from(bucket).list(folder, { limit: 1000 });
    const stale = (data || []).map((f) => `${folder}/${f.name}`).filter((p) => !keep.includes(p));
    if (stale.length) await sb.storage.from(bucket).remove(stale);
  }

  async function support(body) {
    const { data, error } = await sb.functions.invoke('admin-user-support', { body });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch { /* not json */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  return {
    demo: false,

    // ---------- auth ----------
    async session() { return unwrap(await sb.auth.getSession()).session; },
    async signIn(email, password) { unwrap(await sb.auth.signInWithPassword({ email, password })); },
    async signOut() { await sb.auth.signOut(); },
    onAuthChange(cb) { return sb.auth.onAuthStateChange((_e, s) => cb(s)).data.subscription; },
    async me() {
      const { session } = unwrap(await sb.auth.getSession());
      if (!session) return null;
      const row = unwrap(await sb.from('profiles').select('id, email, is_admin').eq('id', session.user.id).maybeSingle());
      return { id: session.user.id, email: session.user.email, isAdmin: !!row?.is_admin };
    },

    // ---------- dashboard ----------
    async stats() { return unwrap(await sb.rpc('admin_stats')); },
    async recentPayments() {
      const rows = unwrap(await sb.from('payment_events').select('id, event, payload, received_at').order('received_at', { ascending: false }).limit(8));
      return rows.map((r) => ({
        id: r.id, event: r.event, at: r.received_at,
        email: r.payload?.data?.customer?.email || null,
        amount: typeof r.payload?.data?.amount === 'number' ? r.payload.data.amount / 100 : null,
        currency: r.payload?.data?.currency || null,
      }));
    },

    // ---------- stories ----------
    async listStories() {
      return unwrap(await sb.from('stories')
        .select('id, slug, title, synopsis, cover_url, reading_level, status, is_free, page_count, reading_minutes, published_at, updated_at, authors(name), story_categories(category_id)')
        .order('updated_at', { ascending: false }));
    },
    async getStory(id) {
      const story = unwrap(await sb.from('stories')
        .select('id, slug, title, synopsis, cover_url, author_id, reading_level, status, is_free, reading_minutes, published_at, updated_at, story_categories(category_id)')
        .eq('id', id).maybeSingle());
      if (!story) return null;
      const pages = unwrap(await sb.from('story_pages').select('id, position, image_url, text').eq('story_id', id).order('position'));
      return { ...story, categoryIds: story.story_categories.map((c) => c.category_id), pages };
    },

    /** Saves metadata, categories and pages; `pages` is the new order. Returns the story id. */
    async saveStory(story, categoryIds, pages) {
      const row = {
        id: story.id, slug: story.slug, title: story.title, synopsis: story.synopsis, cover_url: story.cover_url || null,
        author_id: story.author_id || null, reading_level: story.reading_level, status: story.status, is_free: !!story.is_free,
        reading_minutes: story.reading_minutes, published_at: story.published_at || null,
      };
      unwrap(await sb.from('stories').upsert(row, { onConflict: 'id' }));

      // categories: apply only the difference
      const have = unwrap(await sb.from('story_categories').select('category_id').eq('story_id', story.id)).map((c) => c.category_id);
      const removed = have.filter((c) => !categoryIds.includes(c));
      const added = categoryIds.filter((c) => !have.includes(c));
      if (removed.length) unwrap(await sb.from('story_categories').delete().eq('story_id', story.id).in('category_id', removed));
      if (added.length) unwrap(await sb.from('story_categories').insert(added.map((category_id) => ({ story_id: story.id, category_id }))));

      // pages: (position, story) is unique, so shuffle in three safe steps:
      // 1) remove pages that were deleted, 2) park survivors on temporary positions, 3) write final order.
      const existing = unwrap(await sb.from('story_pages').select('id').eq('story_id', story.id)).map((p) => p.id);
      const keepIds = pages.filter((p) => p.id).map((p) => p.id);
      const gone = existing.filter((id) => !keepIds.includes(id));
      if (gone.length) unwrap(await sb.from('story_pages').delete().in('id', gone));
      const kept = pages.map((p, i) => ({ p, position: i + 1 })).filter(({ p }) => p.id);
      if (kept.length) {
        unwrap(await sb.from('story_pages').upsert(kept.map(({ p, position }) => (
          { id: p.id, story_id: story.id, position: 10000 + position, image_url: p.image_url, text: p.text })), { onConflict: 'id' }));
      }
      const finalRows = pages.map((p, i) => ({ ...(p.id ? { id: p.id } : {}), story_id: story.id, position: i + 1, image_url: p.image_url || '', text: p.text || '' }));
      const withId = finalRows.filter((r) => r.id);
      const fresh = finalRows.filter((r) => !r.id);
      if (withId.length) unwrap(await sb.from('story_pages').upsert(withId, { onConflict: 'id' }));
      if (fresh.length) unwrap(await sb.from('story_pages').insert(fresh));

      // tidy up page images that are no longer referenced (best effort)
      try { await removeFolder('pages', story.id, pages.map((p) => p.image_url).filter(Boolean)); } catch { /* ignore */ }
      return story.id;
    },
    async setStoryStatus(id, status, publishedAt) {
      unwrap(await sb.from('stories').update({ status, published_at: publishedAt ?? null }).eq('id', id));
    },
    async deleteStory(id) {
      unwrap(await sb.from('stories').delete().eq('id', id));
      try { await removeFolder('pages', id); await removeFolder('covers', id); } catch { /* ignore */ }
    },
    async uploadCover(storyId, file) {
      checkImage(file);
      const path = `${storyId}/${Date.now()}.${extOf(file)}`;
      const { error } = await sb.storage.from('covers').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
      if (error) throw friendly(error);
      try { await removeFolder('covers', storyId, [path]); } catch { /* ignore */ }
      return sb.storage.from('covers').getPublicUrl(path).data.publicUrl;
    },
    async uploadPageImage(storyId, file) {
      checkImage(file);
      const path = `${storyId}/${uuid()}.${extOf(file)}`;
      const { error } = await sb.storage.from('pages').upload(path, file, { contentType: file.type, cacheControl: '3600' });
      if (error) throw friendly(error);
      return path;
    },
    /** Page art lives in a private bucket; admins preview it through short-lived signed URLs. */
    async pageImageUrl(path) {
      if (!path) return '';
      if (/^(https?:|data:|blob:)/.test(path)) return path;
      const hit = signedCache.get(path);
      if (hit && hit.exp > Date.now()) return hit.url;
      const { data, error } = await sb.storage.from('pages').createSignedUrl(path, 3600);
      if (error) return '';
      signedCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
      return data.signedUrl;
    },

    // ---------- reference data ----------
    async listAuthors() { return unwrap(await sb.from('authors').select('id, name').order('name')); },
    async listCategories() { return unwrap(await sb.from('categories').select('id, slug, name, sort_order').order('sort_order').order('name')); },
    async saveCategory(c) {
      const row = { slug: c.slug, name: c.name, sort_order: c.sort_order ?? 0, ...(c.id ? { id: c.id } : {}) };
      return unwrap(await sb.from('categories').upsert(row, { onConflict: 'id' }).select().single());
    },
    async deleteCategory(id) { unwrap(await sb.from('categories').delete().eq('id', id)); },

    // ---------- featured ----------
    async listFeatured() {
      return unwrap(await sb.from('featured_slots')
        .select('id, type, story_id, starts_at, ends_at, stories(title, cover_url)').order('starts_at', { ascending: false }));
    },
    async saveFeatured(s) {
      const row = { type: s.type, story_id: s.story_id, starts_at: s.starts_at, ends_at: s.ends_at, ...(s.id ? { id: s.id } : {}) };
      unwrap(await sb.from('featured_slots').upsert(row, { onConflict: 'id' }));
    },
    async deleteFeatured(id) { unwrap(await sb.from('featured_slots').delete().eq('id', id)); },

    // ---------- people ----------
    async listSubscribers(search) { return unwrap(await sb.rpc('admin_people', { search: search || null })); },
    async setEntitlement(parentId, status, until, plan) {
      unwrap(await sb.rpc('admin_set_entitlement', { p_parent: parentId, p_status: status, p_until: until, p_plan: plan || null }));
    },
    // ---------- privacy policy ----------
    async getLegal(slug = 'privacy-policy') {
      return unwrap(await sb.from('legal_documents').select('slug, title, body, version, updated_at').eq('slug', slug).maybeSingle());
    },
    async saveLegal(slug, title, body) {
      return unwrap(await sb.from('legal_documents').update({ title, body }).eq('slug', slug).select('slug, title, body, version, updated_at').single());
    },

    // ---------- password support (runs in an edge function with service-role access) ----------
    async supportSendReset(email) { return support({ action: 'send_reset', email }); },
    async supportSetPassword(email, password) { return support({ action: 'set_password', email, password }); },
    async listSupportActions() {
      return unwrap(await sb.from('admin_actions').select('id, action, target_email, created_at').order('created_at', { ascending: false }).limit(8));
    },
    async listAdmins() { return unwrap(await sb.from('profiles').select('id, email').eq('is_admin', true).order('email')); },
    async setAdmin(email, isAdmin) { unwrap(await sb.rpc('admin_set_admin', { p_email: email, p_admin: isAdmin })); },
  };
}

export const API_METHODS = [
  'session', 'signIn', 'signOut', 'onAuthChange', 'me', 'stats', 'recentPayments', 'listStories', 'getStory', 'saveStory',
  'setStoryStatus', 'deleteStory', 'uploadCover', 'uploadPageImage', 'pageImageUrl', 'listAuthors', 'listCategories',
  'saveCategory', 'deleteCategory', 'listFeatured', 'saveFeatured', 'deleteFeatured', 'listSubscribers', 'setEntitlement',
  'getLegal', 'saveLegal', 'supportSendReset', 'supportSetPassword', 'listSupportActions', 'listAdmins', 'setAdmin',
];
