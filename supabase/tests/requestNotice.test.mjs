import test from 'node:test';
import assert from 'node:assert/strict';
import { handleNewRequest, whatsappLink } from '../functions/_shared/requestNotice.ts';

const ID = '11111111-2222-3333-4444-555555555555';
const TEMPLATE = { key: 'new_request', subject: 'New {{kind_label}}: {{name}}', eyebrow: 'New request', body: '# New {{kind_label}}\n\n## Details\n{{details}}\n\n{{comments_block}}\n\n[Open in the dashboard]({{site_url}}/admin/)\n\n{{whatsapp_block}}' };
const GRP = { full_name: 'Amaka Johnson', phone: '0812 878 7969', email: 'amaka@x.com', reading_level: 'Spark', mode: 'Online', comments: 'Please call after 5pm.' };

function deps(over = {}) {
  const state = { sent: [], logs: [] };
  const d = {
    jobSecret: async () => 'secret',
    loadRequest: async (kind, id) => (id === ID ? (kind === 'grp' ? GRP : { full_name: 'Tunde Ade', phone: '+234 803 111 2222', email: 't@x.com', storybook_title: 'The Brave Drum', reader_level: 'Seeker', comments: null }) : null),
    settings: async () => ({ api_key: 're_x', from_name: 'Genova', from_email: 'hello@custar.ng', reply_to: null, notify_email: 'team@custar.ng', enabled: true }),
    adminEmails: async () => ['boss@custar.ng', 'second@custar.ng'],
    template: async () => TEMPLATE,
    log: async (r) => { state.logs.push(r); },
    fetch: async (url, init) => { state.sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ data: [{ id: 'm1' }, { id: 'm2' }] }), { status: 200 }); },
    siteUrl: 'https://site.test/Genova',
    ...over,
  };
  return { d, state };
}
const run = (secret, input, d) => handleNewRequest(secret, input, d);

test('only the database trigger (right secret) may call it', async () => {
  const { d, state } = deps();
  assert.equal((await run(null, { kind: 'grp', id: ID }, d)).status, 401);
  assert.equal((await run('wrong', { kind: 'grp', id: ID }, d)).status, 401);
  assert.equal((await run('secret', { kind: 'grp', id: ID }, deps({ jobSecret: async () => null }).d)).status, 401);
  assert.equal(state.sent.length, 0);
});

test('rejects unknown kinds, bad ids and missing requests', async () => {
  const { d } = deps();
  assert.equal((await run('secret', { kind: 'x', id: ID }, d)).status, 400);
  assert.equal((await run('secret', { kind: 'grp', id: 'nope' }, d)).status, 400);
  assert.equal((await run('secret', { kind: 'grp', id: '99999999-2222-3333-4444-555555555555' }, d)).status, 404);
});

test('a GRP request emails the saved notification address with the details, a dashboard button and WhatsApp', async () => {
  const { d, state } = deps();
  const r = await run('secret', { kind: 'grp', id: ID }, d);
  assert.equal(r.status, 200); assert.equal(r.body.sent, 1);
  const mail = state.sent[0][0];
  assert.deepEqual(mail.to, ['team@custar.ng']);
  assert.equal(mail.subject, 'New GRP spot request: Amaka Johnson');
  for (const t of ['Amaka Johnson', '0812 878 7969', 'amaka@x.com', 'Spark', 'Online', 'Please call after 5pm.']) assert.match(mail.html, new RegExp(t.replace(/[.]/g, '\\.')), t);
  assert.match(mail.html, /href="https:\/\/site\.test\/Genova\/admin\/"/);
  assert.match(mail.html, /href="https:\/\/wa\.me\/2348128787969"/);
  assert.equal(state.logs.at(-1).status, 'sent');
});

test('a title request lists the title and level, and leaves out empty comments', async () => {
  const { d, state } = deps();
  const r = await run('secret', { kind: 'title', id: ID }, d);
  assert.equal(r.status, 200);
  const mail = state.sent[0][0];
  assert.equal(mail.subject, 'New title request: Tunde Ade');
  assert.match(mail.html, /The Brave Drum/); assert.match(mail.html, /Seeker/);
  assert.doesNotMatch(mail.html, /Comments/);
  assert.match(mail.html, /href="https:\/\/wa\.me\/2348031112222"/);
});

test('with no notification address, every admin is emailed', async () => {
  const { d, state } = deps({ settings: async () => ({ api_key: 're_x', from_name: 'Genova', from_email: 'hello@custar.ng', reply_to: null, notify_email: null, enabled: true }) });
  const r = await run('secret', { kind: 'grp', id: ID }, d);
  assert.equal(r.body.sent, 2);
  assert.deepEqual(state.sent[0].map((m) => m.to[0]), ['boss@custar.ng', 'second@custar.ng']);
});

test('nobody to tell, or email not activated: nothing is sent and nothing breaks', async () => {
  const none = deps({ settings: async () => ({ api_key: 're_x', from_name: 'Genova', from_email: 'h@x.ng', reply_to: null, notify_email: null, enabled: true }), adminEmails: async () => [] });
  assert.deepEqual((await run('secret', { kind: 'grp', id: ID }, none.d)).body, { skipped: 'no one to notify' });
  const off = deps({ settings: async () => ({ api_key: null, from_name: 'Genova', from_email: null, reply_to: null, notify_email: 'team@custar.ng', enabled: false }) });
  const r = await run('secret', { kind: 'grp', id: ID }, off.d);
  assert.equal(r.status, 200); assert.equal(r.body.skipped, 1); assert.equal(off.state.sent.length, 0);
  assert.equal(off.state.logs.at(-1).status, 'skipped');
});

test('visitor text cannot add headings, buttons or links to the email', async () => {
  const evil = { ...GRP, full_name: 'Eve\n# Pwned\n[Click](https://evil.test)', comments: 'hi\n\n[Click](https://evil.test)\n# Big' };
  const { d, state } = deps({ loadRequest: async () => evil });
  await run('secret', { kind: 'grp', id: ID }, d);
  const html = state.sent[0][0].html;
  assert.doesNotMatch(html, /href="https:\/\/evil\.test/); assert.doesNotMatch(html, /<h1[^>]*>[^<]*Pwned/);
});

test('a Resend failure is reported (502) and logged', async () => {
  const { d, state } = deps({ fetch: async () => new Response(JSON.stringify({ message: 'domain not verified' }), { status: 403 }) });
  const r = await run('secret', { kind: 'grp', id: ID }, d);
  assert.equal(r.status, 502); assert.equal(r.body.firstError, 'domain not verified');
  assert.equal(state.logs.at(-1).status, 'failed');
});

test('whatsappLink handles Nigerian and international numbers', () => {
  assert.equal(whatsappLink('08128787969'), 'https://wa.me/2348128787969');
  assert.equal(whatsappLink('+234 812 878 7969'), 'https://wa.me/2348128787969');
  assert.equal(whatsappLink('0044 7700 900123'), 'https://wa.me/447700900123');
  assert.equal(whatsappLink('123'), '');
});
