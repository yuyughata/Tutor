import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSupport } from '../functions/_shared/support.ts';

function deps(over = {}) {
  const calls = { reset: [], set: [], log: [] };
  const d = {
    getCaller: async (jwt) => (jwt === 'admin-jwt' ? { id: 'a1', email: 'admin@x.com' } : jwt === 'parent-jwt' ? { id: 'p1', email: 'p@x.com' } : null),
    isAdmin: async (id) => id === 'a1',
    findParentByEmail: async (email) => ({ 'mum@x.com': { id: 'p2', email: 'mum@x.com', is_admin: false }, 'boss@x.com': { id: 'a2', email: 'boss@x.com', is_admin: true } })[email] ?? null,
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
  assert.deepEqual(calls, { reset: [], set: [], log: [] }, 'nothing happens for non-admins');
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
