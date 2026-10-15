import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSupport } from '../functions/_shared/support.ts';

function deps(over = {}) {
  const calls = { reset: [], set: [], log: [], del: [] };
  const d = {
    getCaller: async (jwt) => (jwt === 'admin-jwt' ? { id: 'a1', email: 'admin@x.com' } : jwt === 'parent-jwt' ? { id: 'p1', email: 'p@x.com' } : null),
    isAdmin: async (id) => id === 'a1',
    findParentByEmail: async (email) => ({ 'mum@x.com': { id: 'p2', email: 'mum@x.com', is_admin: false }, 'boss@x.com': { id: 'a2', email: 'boss@x.com', is_admin: true }, 'payer@x.com': { id: 'p3', email: 'payer@x.com', is_admin: false }, 'admin@x.com': { id: 'a1', email: 'admin@x.com', is_admin: true } })[email] ?? null,
    hasLiveSubscription: async (id) => id === 'p3',
    deleteAccount: async (id) => { calls.del.push(id); },
    sendReset: async (e) => { calls.reset.push(e); },
    setPassword: async (id, pw) => { calls.set.push([id, pw]); },
    log: async (row) => { calls.log.push(row); },
    ...over,
  };
  return { d, calls };
}
const run = (auth, input, d) => handleSupport(auth, input, d);

test('requires a signed-in admin', async () => {
  const { d, calls } = deps();
  assert.equal((await run(null, { action: 'send_reset', email: 'mum@x.com' }, d)).status, 401);
  assert.equal((await run('Bearer bogus', { action: 'send_reset', email: 'mum@x.com' }, d)).status, 401);
  assert.equal((await run('Bearer parent-jwt', { action: 'send_reset', email: 'mum@x.com' }, d)).status, 403);
  assert.deepEqual(calls, { reset: [], set: [], log: [], del: [] }, 'nothing happens for non-admins');
});

test('send_reset emails the parent and logs it', async () => {
  const { d, calls } = deps();
  const r = await run('Bearer admin-jwt', { action: 'send_reset', email: '  Mum@X.com ' }, d);
  assert.equal(r.status, 200);
  assert.deepEqual(calls.reset, ['mum@x.com']);
  assert.deepEqual(calls.log, [{ admin_id: 'a1', action: 'send_reset', target_email: 'mum@x.com' }]);
});

test('set_password validates, applies, and never logs the password', async () => {
  const { d, calls } = deps();
  assert.equal((await run('Bearer admin-jwt', { action: 'set_password', email: 'mum@x.com', password: 'short' }, d)).status, 400);
  assert.equal((await run('Bearer admin-jwt', { action: 'set_password', email: 'mum@x.com', password: 'x'.repeat(80) }, d)).status, 400);
  assert.equal(calls.set.length, 0);
  const ok = await run('Bearer admin-jwt', { action: 'set_password', email: 'mum@x.com', password: 'Temp-pass-123' }, d);
  assert.equal(ok.status, 200);
  assert.deepEqual(calls.set, [['p2', 'Temp-pass-123']]);
  assert.equal(JSON.stringify(calls.log).includes('Temp-pass-123'), false);
});

test('admin accounts can only be reset by email; unknown emails and actions are rejected', async () => {
  const { d, calls } = deps();
  assert.equal((await run('Bearer admin-jwt', { action: 'set_password', email: 'boss@x.com', password: 'Temp-pass-123' }, d)).status, 403);
  assert.equal((await run('Bearer admin-jwt', { action: 'send_reset', email: 'boss@x.com' }, d)).status, 200);
  assert.equal((await run('Bearer admin-jwt', { action: 'send_reset', email: 'ghost@x.com' }, d)).status, 404);
  assert.equal((await run('Bearer admin-jwt', { action: 'nuke', email: 'mum@x.com' }, d)).status, 400);
  assert.equal((await run('Bearer admin-jwt', { action: 'send_reset', email: 'nope' }, d)).status, 400);
  assert.equal(calls.set.length, 0);
});

test('delete_account needs the typed email, and refuses admins and yourself', async () => {
  const { d, calls } = deps();
  assert.equal((await run('Bearer parent-jwt', { action: 'delete_account', email: 'mum@x.com', confirm_email: 'mum@x.com' }, d)).status, 403);
  assert.equal((await run('Bearer admin-jwt', { action: 'delete_account', email: 'mum@x.com' }, d)).status, 400, 'no confirmation');
  assert.equal((await run('Bearer admin-jwt', { action: 'delete_account', email: 'mum@x.com', confirm_email: 'other@x.com' }, d)).status, 400, 'wrong confirmation');
  assert.equal((await run('Bearer admin-jwt', { action: 'delete_account', email: 'boss@x.com', confirm_email: 'boss@x.com' }, d)).status, 403, 'admins are protected');
  assert.equal((await run('Bearer admin-jwt', { action: 'delete_account', email: 'admin@x.com', confirm_email: 'admin@x.com' }, d)).status, 403, 'not yourself');
  assert.equal((await run('Bearer admin-jwt', { action: 'delete_account', email: 'ghost@x.com', confirm_email: 'ghost@x.com' }, d)).status, 404);
  assert.deepEqual(calls.del, [], 'nothing was deleted');
});

test('delete_account removes the account and logs the email only', async () => {
  const { d, calls } = deps();
  const r = await run('Bearer admin-jwt', { action: 'delete_account', email: ' Mum@X.com ', confirm_email: 'MUM@x.com' }, d);
  assert.equal(r.status, 200);
  assert.deepEqual(calls.del, ['p2']);
  assert.deepEqual(calls.log, [{ admin_id: 'a1', action: 'delete_account', target_email: 'mum@x.com' }]);
});

test('delete_account warns about a running Paystack subscription unless forced', async () => {
  const { d, calls } = deps();
  const blocked = await run('Bearer admin-jwt', { action: 'delete_account', email: 'payer@x.com', confirm_email: 'payer@x.com' }, d);
  assert.equal(blocked.status, 409);
  assert.match(String(blocked.body.error), /Paystack/);
  assert.deepEqual(calls.del, []);
  const forced = await run('Bearer admin-jwt', { action: 'delete_account', email: 'payer@x.com', confirm_email: 'payer@x.com', force: true }, d);
  assert.equal(forced.status, 200);
  assert.deepEqual(calls.del, ['p3']);
});
