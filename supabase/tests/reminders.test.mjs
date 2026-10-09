import test from 'node:test';
import assert from 'node:assert/strict';
import { handleReminders } from '../functions/_shared/reminders.ts';

const settings = { api_key: 're_test_key_123', from_name: 'Genova', from_email: 'hello@custar.com', reply_to: null, enabled: true };
const cand = (over = {}) => ({ parent_id: 'p1', email: 'a@x.com', kind: 'renewal_upcoming', plan_id: 'monthly', plan_name: 'Premium Monthly', amount_minor: 500000, currency: 'NGN', period_end: '2026-11-10T10:00:00Z', access_until: '2026-11-15T10:00:00Z', ...over });

function setup(over = {}) {
  const st = { claims: new Set(), released: [], logs: [], sent: [], settings: { ...settings }, due: [cand(), cand({ parent_id: 'p2', email: 'b@x.com', kind: 'grace_ending', plan_id: 'quarterly', plan_name: 'Premium Quarterly', amount_minor: 1200000 })], status: 200 };
  const deps = {
    jobSecret: async () => 's3cret',
    getCaller: async (jwt) => (jwt === 'admin' || jwt === 'parent' ? { id: jwt } : null),
    isAdmin: async (id) => id === 'admin',
    settings: async () => st.settings,
    template: async (k) => ({ key: k, subject: 'Hi {{renew_date}}', body: '{{plan}} {{amount}} {{renew_date}} {{access_until}}' }),
    log: async (r) => { st.logs.push(r); },
    candidates: async () => st.due,
    claim: async (c) => { const k = `${c.parent_id}|${c.kind}|${c.period_end}`; if (st.claims.has(k)) return false; st.claims.add(k); return true; },
    release: async (c) => { st.released.push(c); st.claims.delete(`${c.parent_id}|${c.kind}|${c.period_end}`); },
    fetch: async (url, init) => { const msgs = JSON.parse(init.body); st.sent.push(...msgs); return new Response(JSON.stringify(st.status === 200 ? { data: msgs.map((_, i) => ({ id: 'i' + i })) } : { message: 'domain not verified' }), { status: st.status }); },
    siteUrl: 'https://site.test', supportEmail: 'support@custar.com', ...over,
  };
  return { st, deps };
}
const run = (h, input, deps) => handleReminders({ jobSecret: null, authorization: null, ...h }, input, deps);

test('rejects anonymous callers, wrong secrets, and non-admin users', async () => {
  const { deps } = setup();
  assert.equal((await run({}, {}, deps)).status, 401);
  assert.equal((await run({ jobSecret: 'nope' }, {}, deps)).status, 401);
  assert.equal((await run({ authorization: 'Bearer parent' }, {}, deps)).status, 403);
  assert.equal((await run({ authorization: 'Bearer ghost' }, {}, deps)).status, 401);
});

test('the cron secret sends each due reminder once, with its own template and details', async () => {
  const { st, deps } = setup();
  const r = await run({ jobSecret: 's3cret' }, {}, deps);
  assert.deepEqual([r.status, r.body.sent, r.body.failed], [200, 2, 0]);
  assert.equal(st.sent.length, 2);
  assert.match(st.sent[0].text, /Premium Monthly .*5,000.* 10 November 2026 15 November 2026/);
  assert.equal(st.sent[0].subject, 'Hi 10 November 2026');
  assert.deepEqual(st.logs.map((l) => [l.template, l.campaign, l.status]), [['renewal_upcoming', 'reminder:renewal_upcoming', 'sent'], ['grace_ending', 'reminder:grace_ending', 'sent']]);
  // running again the same day sends nothing new (already claimed)
  const again = await run({ jobSecret: 's3cret' }, {}, deps);
  assert.deepEqual([again.body.sent, again.body.alreadySent], [0, 2]);
});

test('an admin can preview with dryRun and nothing is sent or claimed', async () => {
  const { st, deps } = setup();
  const r = await run({ authorization: 'Bearer admin' }, { dryRun: true }, deps);
  assert.deepEqual([r.body.due, r.body.byKind.renewal_upcoming, r.body.byKind.grace_ending], [2, 1, 1]);
  assert.equal(st.sent.length, 0); assert.equal(st.claims.size, 0);
});

test('nothing is sent or claimed while email is not activated', async () => {
  const { st, deps } = setup();
  st.settings.enabled = false;
  const r = await run({ jobSecret: 's3cret' }, {}, deps);
  assert.equal(r.body.sent, 0); assert.equal(r.body.skipped, 2); assert.match(r.body.note, /not activated/);
  assert.equal(st.claims.size, 0);
});

test('a failed send gives the reservation back so the next run retries', async () => {
  const { st, deps } = setup(); st.status = 422;
  const r = await run({ jobSecret: 's3cret' }, {}, deps);
  assert.deepEqual([r.body.sent, r.body.failed, r.body.firstError], [0, 2, 'domain not verified']);
  assert.equal(st.released.length, 2); assert.equal(st.claims.size, 0);
});

test('a missing job secret means the header can never authenticate', async () => {
  const { deps } = setup({ jobSecret: async () => null });
  assert.equal((await run({ jobSecret: 'anything' }, {}, deps)).status, 401);
});
