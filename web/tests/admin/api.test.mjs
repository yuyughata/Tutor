// Runs the real api.js with the real supabase-js against a recording fake network,
// so we can assert the exact requests the dashboard would send to Supabase.
//   node --test web/tests/admin/api.test.mjs                       (uses the copy in app/node_modules)
//   SUPABASE_JS=/path/to/supabase-js/dist/main/index.js node --test ...   (test the exact version the page loads from the CDN)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createApi, API_METHODS } from '../../public/admin/js/api.js';
import { createDemoApi } from '../../public/admin/js/demo.js';

const { createClient } = process.env.SUPABASE_JS
  ? createRequire(import.meta.url)(process.env.SUPABASE_JS)
  : await import('../../../app/node_modules/@supabase/supabase-js/dist/index.mjs');

function harness(handler) {
  const calls = [];
  const fakeFetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = (init.method || 'GET').toUpperCase();
    let body = init.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* not json */ } }
    const call = { method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, headers: new Headers(init.headers) };
    calls.push(call);
    const [status, payload] = handler(call) || [200, []];
    return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
  };
  const sb = createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fakeFetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return { api: createApi(sb), calls };
}
const rest = (c, table) => c.path === `/rest/v1/${table}`;

test('real and demo APIs expose exactly the same methods', () => {
  const { api } = harness(() => null);
  const demo = createDemoApi();
  for (const m of API_METHODS) {
    assert.equal(typeof api[m], 'function', `api.${m}`);
    assert.equal(typeof demo[m], 'function', `demo.${m}`);
  }
});

test('saveStory: upserts the story, diffs categories, and reorders pages in safe steps', async () => {
  const { api, calls } = harness((c) => {
    if (c.method === 'GET' && rest(c, 'story_categories')) return [200, [{ category_id: 'c1' }, { category_id: 'c2' }]];
    if (c.method === 'GET' && rest(c, 'story_pages')) return [200, [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]];
    if (c.path.startsWith('/storage/')) return [200, []];
    return [201, []];
  });
  const story = { id: 's1', slug: 'my-story', title: 'My story', synopsis: 'x', cover_url: 'https://c/x.png', author_id: 'a1', reading_level: 'spark', status: 'published', is_free: true, reading_minutes: 3, published_at: null };
  await api.saveStory(story, ['c2', 'c3'], [
    { id: 'p3', image_url: 's1/c.png', text: 'third becomes first' },
    { id: null, image_url: 's1/new.png', text: 'brand new second' },
    { id: 'p1', image_url: 's1/a.png', text: 'first becomes third' },
  ]);

  const writes = calls.filter((c) => c.method !== 'GET' && c.path.startsWith('/rest/v1/'));
  const up = writes[0];
  assert.equal(up.method, 'POST'); assert.equal(rest(up, 'stories'), true); assert.equal(up.query.on_conflict, 'id');
  assert.equal(up.body.slug, 'my-story'); assert.equal(up.body.is_free, true); assert.equal(up.body.status, 'published');
  assert.equal('page_count' in up.body, false, 'page_count is maintained by a trigger, never written');
  assert.equal('is_admin' in up.body, false);

  const delCat = writes.find((c) => c.method === 'DELETE' && rest(c, 'story_categories'));
  assert.equal(delCat.query.category_id, 'in.(c1)'); assert.equal(delCat.query.story_id, 'eq.s1');
  const addCat = writes.find((c) => c.method === 'POST' && rest(c, 'story_categories'));
  assert.deepEqual(addCat.body, [{ story_id: 's1', category_id: 'c3' }]);

  const delPages = writes.find((c) => c.method === 'DELETE' && rest(c, 'story_pages'));
  assert.equal(delPages.query.id, 'in.(p2)', 'only the removed page is deleted');
  const pageWrites = writes.filter((c) => c.method === 'POST' && rest(c, 'story_pages'));
  assert.equal(pageWrites.length, 3);
  assert.deepEqual(pageWrites[0].body.map((r) => [r.id, r.position]), [['p3', 10001], ['p1', 10003]], 'survivors are parked on temporary positions first');
  assert.deepEqual(pageWrites[1].body.map((r) => [r.id, r.position]), [['p3', 1], ['p1', 3]], 'then written to their final positions');
  assert.deepEqual(pageWrites[2].body.map((r) => [r.id ?? null, r.position, r.text]), [[null, 2, 'brand new second']], 'new pages are inserted last, without an id');
  assert.ok(calls.indexOf(delPages) < calls.indexOf(pageWrites[0]), 'deletes happen before the shuffle');
});

test('saveStory with no pages and no categories only touches the story', async () => {
  const { api, calls } = harness((c) => (c.method === 'GET' ? [200, []] : [201, []]));
  await api.saveStory({ id: 's2', slug: 's', title: 't', synopsis: '', cover_url: '', reading_level: 'sunrise', status: 'draft', is_free: false, reading_minutes: 1, published_at: null }, [], []);
  const writes = calls.filter((c) => c.method !== 'GET' && c.path.startsWith('/rest/v1/'));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.cover_url, null, 'empty cover is stored as null');
});

test('rpc calls use the right function names and argument names', async () => {
  const { api, calls } = harness((c) => (c.path.endsWith('admin_stats') ? [200, { stories_live: 2 }] : [200, []]));
  assert.deepEqual(await api.stats(), { stories_live: 2 });
  await api.listSubscribers('amy');
  await api.setEntitlement('parent-1', 'active', '2027-01-01T00:00:00.000Z', 'comp');
  await api.setAdmin('a@b.c', true);
  const rpc = (name) => calls.find((c) => c.path === `/rest/v1/rpc/${name}`);
  assert.deepEqual(rpc('admin_people').body, { search: 'amy' });
  assert.deepEqual(rpc('admin_set_entitlement').body, { p_parent: 'parent-1', p_status: 'active', p_until: '2027-01-01T00:00:00.000Z', p_plan: 'comp' });
  assert.deepEqual(rpc('admin_set_admin').body, { p_email: 'a@b.c', p_admin: true });
});

test('featured slots and categories use upsert on id', async () => {
  const { api, calls } = harness((c) => (c.method === 'GET' ? [200, []] : [201, { id: 'x', slug: 'friendship', name: 'Friendship', sort_order: 5 }]));
  await api.saveFeatured({ type: 'week', story_id: 's1', starts_at: '2026-10-12T00:00:00.000Z', ends_at: '2026-10-19T00:00:00.000Z' });
  const f = calls.find((c) => c.method === 'POST' && rest(c, 'featured_slots'));
  assert.equal(f.query.on_conflict, 'id'); assert.equal(f.body.type, 'week'); assert.equal('id' in f.body, false);
  await api.saveCategory({ name: 'Friendship', slug: 'friendship', sort_order: 5 });
  assert.ok(calls.find((c) => c.method === 'POST' && rest(c, 'categories')));
});

test('database errors become friendly messages', async () => {
  const cases = [
    [{ code: '23505', message: 'duplicate key value violates unique constraint "stories_slug_key"', details: 'Key (slug)=(x) already exists.' }, /URL name/],
    [{ code: '23P01', message: 'conflicting key value violates exclusion constraint "featured_no_overlap"' }, /overlaps/],
    [{ code: '42501', message: 'permission denied' }, /not allowed/],
    [{ code: '42501', message: 'new row violates row-level security policy for table "stories"' }, /not allowed/],
  ];
  for (const [err, re] of cases) {
    const { api } = harness(() => [400, err]);
    await assert.rejects(() => api.deleteFeatured('x'), re);
  }
});

test('image uploads are validated before any network call', async () => {
  const { api, calls } = harness(() => null);
  await assert.rejects(() => api.uploadCover('s1', { name: 'x.pdf', type: 'application/pdf', size: 10 }), /JPG, PNG/);
  await assert.rejects(() => api.uploadPageImage('s1', { name: 'x.png', type: 'image/png', size: 9 * 1024 * 1024 }), /8 MB/);
  assert.equal(calls.length, 0);
});

test('page images already stored as URLs are used as-is; storage paths get signed', async () => {
  const { api, calls } = harness((c) => (c.path.includes('/object/sign/') ? [200, { signedURL: '/object/sign/pages/s1/a.png?token=t' }] : [200, []]));
  assert.equal(await api.pageImageUrl('https://x/y.png'), 'https://x/y.png');
  assert.equal(await api.pageImageUrl('data:image/png;base64,AAA'), 'data:image/png;base64,AAA');
  const url = await api.pageImageUrl('s1/a.png');
  assert.match(url, /token=t/);
  await api.pageImageUrl('s1/a.png');
  assert.equal(calls.filter((c) => c.path.includes('/object/sign/')).length, 1, 'signed URLs are cached');
});

test('privacy policy: read and update only the policy row', async () => {
  const row = { slug: 'privacy-policy', title: 'Privacy Policy', body: 'x', version: 2, updated_at: '2026-10-09T00:00:00Z' };
  const { api, calls } = harness((c) => (c.method === 'GET' ? [200, row] : [200, { ...row, body: 'new', version: 3 }]));
  assert.equal((await api.getLegal()).version, 2);
  const out = await api.saveLegal('privacy-policy', 'Privacy Policy', 'new');
  assert.equal(out.version, 3);
  const patch = calls.find((c) => c.method === 'PATCH');
  assert.equal(patch.query.slug, 'eq.privacy-policy');
  assert.deepEqual(patch.body, { title: 'Privacy Policy', body: 'new' }, 'version and timestamps are set by the database, never by the page');
});

test('password support goes through the edge function and surfaces its error message', async () => {
  const { api, calls } = harness((c) => {
    if (c.path === '/functions/v1/admin-user-support') return c.body.email === 'nobody@x.com' ? [404, { error: 'No account found for that email.' }] : [200, { ok: true }];
    return [200, []];
  });
  assert.deepEqual(await api.supportSendReset('a@b.c'), { ok: true });
  assert.deepEqual(calls.find((c) => c.path === '/functions/v1/admin-user-support').body, { action: 'send_reset', email: 'a@b.c' });
  await api.supportSetPassword('a@b.c', 'Temp-pass-123');
  assert.deepEqual(calls.filter((c) => c.path === '/functions/v1/admin-user-support')[1].body, { action: 'set_password', email: 'a@b.c', password: 'Temp-pass-123' });
  await assert.rejects(() => api.supportSendReset('nobody@x.com'), /No account found/);
});
