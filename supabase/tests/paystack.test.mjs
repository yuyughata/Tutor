import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { interpretEvent, verifySignature } from '../functions/_shared/paystack.ts';

const secret = 'sk_test_abc';
const sign = (body) => createHmac('sha512', secret).update(body).digest('hex');

test('accepts a correct signature and rejects tampering', async () => {
  const body = JSON.stringify({ event: 'charge.success', data: { amount: 100 } });
  assert.equal(await verifySignature(body, sign(body), secret), true);
  assert.equal(await verifySignature(body + ' ', sign(body), secret), false);
  assert.equal(await verifySignature(body, null, secret), false);
  assert.equal(await verifySignature(body, 'deadbeef', secret), false);
  assert.equal(await verifySignature(body, sign(body), ''), false);
});

test('subscription.create activates with next payment date and codes', () => {
  const e = interpretEvent({ event: 'subscription.create', data: {
    subscription_code: 'SUB_1', email_token: 'tok', next_payment_date: '2026-11-08T00:00:00.000Z',
    customer: { email: 'Mum@Example.com', customer_code: 'CUS_1' }, plan: { plan_code: 'PLN_m', interval: 'monthly' } } });
  assert.equal(e.action, 'activate');
  assert.equal(e.email, 'mum@example.com');
  assert.equal(e.customerCode, 'CUS_1');
  assert.equal(e.subscriptionCode, 'SUB_1');
  assert.equal(e.emailToken, 'tok');
  assert.equal(e.periodEnd, '2026-11-08T00:00:00.000Z');
  assert.equal(e.plan, 'PLN_m');
});

test('charge.success grants access only for plan charges, using metadata.user_id', () => {
  const paid = interpretEvent({ event: 'charge.success', data: {
    status: 'success', reference: 'r1', paid_at: '2026-10-08T10:00:00.000Z', metadata: { user_id: 'u1' },
    customer: { email: 'a@b.c', customer_code: 'CUS_1' }, plan: { plan_code: 'PLN_y', interval: 'annually' } } });
  assert.equal(paid.action, 'activate');
  assert.equal(paid.userId, 'u1');
  assert.ok(Date.parse(paid.periodEnd) > Date.parse('2027-10-01'));
  const oneOff = interpretEvent({ event: 'charge.success', data: { status: 'success', reference: 'r2', customer: { email: 'a@b.c' }, plan: {} } });
  assert.equal(oneOff.action, 'ignore');
  const failed = interpretEvent({ event: 'charge.success', data: { status: 'failed', reference: 'r3', plan: { plan_code: 'P' } } });
  assert.equal(failed.action, 'ignore');
});

test('checkout metadata names our plan id, which beats the Paystack plan code', () => {
  const e = interpretEvent({ event: 'charge.success', data: { status: 'success', reference: 'r9', paid_at: '2026-10-08T10:00:00.000Z', metadata: { user_id: 'u1', plan: 'quarterly' },
    customer: { email: 'a@b.c' }, plan: { plan_code: 'PLN_q', interval: 'quarterly' } } });
  assert.equal(e.plan, 'quarterly');
  assert.ok(Date.parse(e.periodEnd) > Date.parse('2026-12-30') && Date.parse(e.periodEnd) < Date.parse('2027-01-20'), 'a quarterly charge grants about 3 months');
});

test('payment failure, disable and unknown events', () => {
  assert.equal(interpretEvent({ event: 'invoice.payment_failed', data: { customer: { email: 'a@b.c' } } }).action, 'past_due');
  assert.equal(interpretEvent({ event: 'subscription.disable', data: { subscription_code: 'SUB_1' } }).action, 'cancel');
  assert.equal(interpretEvent({ event: 'subscription.not_renew', data: {} }).action, 'ignore');
  assert.equal(interpretEvent({ event: 'transfer.success', data: {} }).action, 'ignore');
  assert.equal(interpretEvent({}).action, 'ignore');
});

test('renewal via invoice.update uses the subscription next payment date', () => {
  const e = interpretEvent({ event: 'invoice.update', data: { paid: true, invoice_code: 'INV_1',
    customer: { email: 'a@b.c', customer_code: 'CUS_1' }, subscription: { subscription_code: 'SUB_1', next_payment_date: '2026-12-01T00:00:00.000Z' } } });
  assert.equal(e.action, 'activate');
  assert.equal(e.periodEnd, '2026-12-01T00:00:00.000Z');
  assert.equal(e.subscriptionCode, 'SUB_1');
});
