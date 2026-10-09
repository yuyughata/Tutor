import test from 'node:test';
import assert from 'node:assert/strict';
import { fill, renderEmail, createMailer, verifyResendKey, money } from '../functions/_shared/email.ts';
import { handleEmail } from '../functions/_shared/emailAdmin.ts';

test('fill replaces variables and blanks unknown ones', () => {
  assert.equal(fill('Hi {{ name }}, {{missing}}!', { name: 'Ada' }), 'Hi Ada, !');
});

test('renderEmail builds headline, sections, bullets, buttons and escapes HTML', () => {
  const r = renderEmail('Hello {{n}}', '# Receipt for {{n}}\n\n## Next steps\n- Open the app\n- Add a reader\n\n<script>x</script> **bold**\n\n[Open]({{u}})', { n: 'Ada', u: 'https://x.test/a', site_url: 'https://x.test' }, { eyebrow: 'Receipt' });
  assert.equal(r.subject, 'Hello Ada');
  assert.match(r.html, /<h1[^>]*>Receipt for Ada<\/h1>/);
  assert.match(r.html, /<h2[^>]*>Next steps<\/h2>/);
  assert.match(r.html, /<li[^>]*>Open the app<\/li>/);
  assert.match(r.html, /href="https:\/\/x\.test\/a"[^>]*>Open<\/a>/);
  assert.match(r.html, /&lt;script&gt;x&lt;\/script&gt; <strong>bold<\/strong>/);
  assert.doesNotMatch(r.html, /<script>/);
  assert.match(r.html, />Receipt<\/p>/); // eyebrow label
  assert.match(r.html, /prefers-color-scheme: dark/); // dark mode styles
  assert.match(r.html, /href="https:\/\/x\.test\/account\/"/); // footer links
  assert.match(r.text, /Open: https:\/\/x\.test\/a/);
});

test('"Label: value" lists become a summary table and blank values are left out', () => {
  const r = renderEmail('s', '# Receipt\n- Plan: Premium\n- Amount paid: ₦5,000\n- Discount:\n- Date: 1 Nov 2026', {});
  assert.match(r.html, /<table[^>]*>.*Plan.*Premium.*Amount paid.*₦5,000.*Date.*1 Nov 2026/s);
  assert.doesNotMatch(r.html, /Discount/);
  assert.doesNotMatch(r.html, /<ul/);
  assert.match(r.text, /Amount paid: ₦5,000/);
});

test('a note, a picture and a code box render, and an empty picture is skipped', () => {
  const r = renderEmail('s', '![Cover](https://img.test/c.png)\n![none]()\n\n# Hi\n\n> Pay by Friday\n\n`123456`', {});
  assert.match(r.html, /<img src="https:\/\/img\.test\/c\.png" alt="Cover"/);
  assert.doesNotMatch(r.html, /alt="none"/);
  assert.match(r.html, /Pay by Friday/);
  assert.match(r.html, />123456<\/td>/);
  assert.doesNotMatch(renderEmail('s', '![x](http://insecure.test/a.png)', {}).html, /<img src="http:/);
});

test('Supabase Auth placeholders survive rendering', () => {
  const r = renderEmail('s', '`{{ .Token }}`\n\n[Confirm]({{ .ConfirmationURL }})', {});
  assert.match(r.html, /\{\{ \.Token \}\}/);
  assert.match(r.html, /href="\{\{ \.ConfirmationURL \}\}"/);
});

test('buttons only accept http(s) links', () => {
  const r = renderEmail('s', '[Click](javascript:alert(1))', {});
  assert.doesNotMatch(r.html, /href="javascript/);
});

const settings = { api_key: 're_test_key_123', from_name: 'Genova', from_email: 'hello@custar.com', reply_to: null, enabled: true };
const tpl = { key: 'broadcast', subject: 'Hi', body: '{{message}}' };
function fakeFetch(calls, status = 200, body = null) {
  return async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return new Response(JSON.stringify(body ?? { data: JSON.parse(init.body).map((_, i) => ({ id: 'id' + i })) }), { status }); };
}

test('mailer sends through the Resend batch endpoint, logs each recipient, uses the key', async () => {
  const calls = [], logs = [];
  const m = createMailer({ settings: async () => settings, template: async () => tpl, log: async (r) => { logs.push(r); }, fetch: fakeFetch(calls) });
  const r = await m.send([{ to: 'a@x.com', vars: { message: 'one' } }, { to: 'b@x.com', vars: { message: 'two' } }], { template: 'broadcast', campaign: 'c1' });
  assert.deepEqual([r.sent, r.failed, r.skipped], [2, 0, 0]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails/batch');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test_key_123');
  assert.equal(calls[0].body[0].from, 'Genova <hello@custar.com>');
  assert.deepEqual(calls[0].body.map((x) => x.to[0]), ['a@x.com', 'b@x.com']);
  assert.deepEqual(logs.map((l) => [l.recipient, l.status, l.resend_id]), [['a@x.com', 'sent', 'id0'], ['b@x.com', 'sent', 'id1']]);
});

test('mailer skips quietly when email is not activated', async () => {
  const calls = [], logs = [];
  const m = createMailer({ settings: async () => ({ ...settings, enabled: false }), template: async () => tpl, log: async (r) => { logs.push(r); }, fetch: fakeFetch(calls) });
  const r = await m.sendOne('a@x.com', {}, { template: 'broadcast' });
  assert.equal(r.skipped, 1); assert.equal(calls.length, 0); assert.equal(logs.length, 0);
  await m.sendOne('a@x.com', {}, { template: 'broadcast', logSkipped: true });
  assert.equal(logs[0].status, 'skipped');
});

test('mailer batches in groups of 50 and records failures', async () => {
  const calls = [], logs = [];
  const m = createMailer({ settings: async () => settings, template: async () => tpl, log: async (r) => { logs.push(r); }, fetch: fakeFetch(calls, 422, { message: 'domain not verified' }) });
  const r = await m.send(Array.from({ length: 120 }, (_, i) => ({ to: `u${i}@x.com` })), { template: 'broadcast' });
  assert.equal(calls.length, 3); assert.deepEqual([r.sent, r.failed], [0, 120]); assert.equal(r.firstError, 'domain not verified');
  assert.equal(logs.filter((l) => l.status === 'failed').length, 120);
});

test('verifyResendKey accepts a restricted (sending-only) key and rejects an invalid one', async () => {
  const f = (status, body) => async () => new Response(JSON.stringify(body), { status });
  assert.equal((await verifyResendKey('k', f(200, { data: [] }))).ok, true);
  assert.equal((await verifyResendKey('k', f(401, { name: 'restricted_api_key', message: 'x' }))).ok, true);
  const bad = await verifyResendKey('k', f(400, { name: 'validation_error', message: 'API key is invalid' }));
  assert.deepEqual([bad.ok, bad.error], [false, 'API key is invalid']);
});

test('money formats naira', () => assert.match(money(500000), /5,000/));

// ---------- request handler ----------
function deps(over = {}) {
  const state = { settings: { ...settings, enabled: false, notify_email: null }, saved: [], logs: [], sent: [], selfCount: 0, audience: [{ parent_id: 'p1', email: 'p1@x.com', status: 'active', plan: 'monthly', access_until: '2026-12-01T00:00:00Z' }, { parent_id: 'p2', email: 'p2@x.com', status: 'active', plan: 'quarterly', access_until: null }] };
  const d = {
    getCaller: async (jwt) => (jwt === 'admin' ? { id: 'a1', email: 'admin@x.com' } : jwt === 'parent' ? { id: 'u1', email: 'parent@x.com' } : null),
    isAdmin: async (id) => id === 'a1',
    settings: async () => state.settings,
    saveSettings: async (p) => { state.saved.push(p); state.settings = { ...state.settings, ...p }; },
    verifyKey: async () => ({ ok: true }),
    audience: async () => state.audience,
    template: async (k) => (k === 'nope' ? null : { key: k, subject: 'S {{story_title}}', body: '{{message}} {{plan}}' }),
    log: async (r) => { state.logs.push(r); },
    recentSelfSends: async () => state.selfCount,
    fetch: async (url, init) => { state.sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ data: JSON.parse(init.body).map((_, i) => ({ id: 'i' + i })) }), { status: 200 }); },
    siteUrl: 'https://site.test', supportEmail: 'support@custar.com', ...over,
  };
  return { d, state };
}
const run = (jwt, input, d) => handleEmail(jwt ? `Bearer ${jwt}` : null, input, d);

test('requires sign-in, and admin for admin actions', async () => {
  const { d } = deps();
  assert.equal((await run(null, { action: 'count', audience: 'all' }, d)).status, 401);
  assert.equal((await run('bad', { action: 'count', audience: 'all' }, d)).status, 401);
  assert.equal((await run('parent', { action: 'count', audience: 'all' }, d)).status, 403);
  assert.equal((await run('parent', { action: 'save_settings' }, d)).status, 403);
});

test('save_settings validates, and a new key switches email off until activated', async () => {
  const { d, state } = deps();
  state.settings.enabled = true;
  assert.equal((await run('admin', { action: 'save_settings', from_email: 'nope' }, d)).status, 400);
  assert.equal((await run('admin', { action: 'save_settings', from_email: 'a@b.co', api_key: 'sk_wrong' }, d)).status, 400);
  const ok = await run('admin', { action: 'save_settings', from_email: 'a@b.co', from_name: 'Genova', api_key: 're_abcdefgh12345' }, d);
  assert.equal(ok.status, 200);
  assert.equal(state.settings.api_key, 're_abcdefgh12345'); assert.equal(state.settings.enabled, false);
  // leaving the key blank keeps the stored key
  await run('admin', { action: 'save_settings', from_email: 'c@d.co', api_key: '' }, d);
  assert.equal(state.settings.api_key, 're_abcdefgh12345'); assert.equal(state.settings.from_email, 'c@d.co');
});

test('activate needs a key and from address, and a key Resend accepts', async () => {
  const { d, state } = deps();
  state.settings.api_key = null;
  assert.equal((await run('admin', { action: 'activate' }, d)).status, 400);
  state.settings.api_key = 're_abcdefgh12345'; state.settings.from_email = null;
  assert.equal((await run('admin', { action: 'activate' }, d)).status, 400);
  state.settings.from_email = 'a@b.co';
  const bad = deps({ verifyKey: async () => ({ ok: false, error: 'API key is invalid' }) });
  bad.state.settings = state.settings;
  assert.match((await run('admin', { action: 'activate' }, bad.d)).body.error, /API key is invalid/);
  assert.equal((await run('admin', { action: 'activate' }, d)).status, 200);
  assert.equal(state.settings.enabled, true); assert.ok(state.settings.verified_at);
  assert.equal((await run('admin', { action: 'deactivate' }, d)).status, 200); assert.equal(state.settings.enabled, false);
});

test('send refuses while not activated, then sends to the audience with per-person variables', async () => {
  const { d, state } = deps();
  const notYet = await run('admin', { action: 'send', template: 'broadcast', audience: 'subscribers', vars: { message: 'Hi!' } }, d);
  assert.equal(notYet.status, 400); assert.match(notYet.body.error, /not activated/);
  state.settings.enabled = true;
  const r = await run('admin', { action: 'send', template: 'broadcast', audience: 'subscribers', subject: 'Big news', vars: { message: 'Hi!' } }, d);
  assert.deepEqual([r.status, r.body.sent, r.body.failed], [200, 2, 0]);
  assert.equal(state.sent[0][0].subject, 'Big news');
  assert.match(state.sent[0][0].text, /Hi! monthly/);
  assert.match(state.sent[0][1].text, /Hi! quarterly/);
  assert.ok(state.logs.every((l) => l.sent_by === 'a1'));
});

test('send validates audience, template and single recipient', async () => {
  const { d, state } = deps(); state.settings.enabled = true;
  assert.equal((await run('admin', { action: 'send', template: 'broadcast', audience: 'bogus' }, d)).status, 400);
  assert.equal((await run('admin', { action: 'send', template: 'nope', audience: 'all' }, d)).status, 404);
  assert.equal((await run('admin', { action: 'send', template: 'broadcast', audience: 'one', to: 'bad' }, d)).status, 400);
  const one = await run('admin', { action: 'send', template: 'broadcast', audience: 'one', to: 'Solo@X.com', vars: { message: 'm' } }, d);
  assert.equal(one.body.sent, 1); assert.equal(state.sent[0][0].to[0], 'solo@x.com');
  state.audience = [];
  assert.equal((await run('admin', { action: 'send', template: 'broadcast', audience: 'free' }, d)).status, 400);
});

test('count and preview', async () => {
  const { d } = deps();
  assert.equal((await run('admin', { action: 'count', audience: 'subscribers' }, d)).body.count, 2);
  assert.equal((await run('admin', { action: 'count', audience: 'x' }, d)).status, 400);
  const p = await run('admin', { action: 'preview', template: 'welcome', subject: 'Yo {{story_title}}', body: '# Hi\n{{message}}' }, d);
  assert.equal(p.body.subject, 'Yo Luna and the Firefly'); assert.match(p.body.html, /Your message appears here/);
});

test('self emails: only welcome and security_change, only to the caller, rate limited', async () => {
  const { d, state } = deps(); state.settings.enabled = true;
  assert.equal((await run('parent', { action: 'self', template: 'broadcast' }, d)).status, 400);
  const ok = await run('parent', { action: 'self', template: 'security_change', what: 'passcode' }, d);
  assert.equal(ok.status, 200); assert.deepEqual(state.sent[0][0].to, ['parent@x.com']);
  state.selfCount = 3;
  assert.equal((await run('parent', { action: 'self', template: 'welcome' }, d)).status, 429);
});

test('test email reports an inactive account clearly', async () => {
  const { d } = deps();
  const r = await run('admin', { action: 'test', to: 'me@x.com' }, d);
  assert.equal(r.status, 400); assert.match(r.body.error, /not activated/);
});
