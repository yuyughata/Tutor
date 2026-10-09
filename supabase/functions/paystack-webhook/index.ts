// Paystack webhook -> entitlements. Deploy with --no-verify-jwt (Paystack sends no Supabase JWT);
// authenticity comes from the x-paystack-signature HMAC.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { interpretEvent, verifySignature } from '../_shared/paystack.ts';
import { createMailer, longDate, money } from '../_shared/email.ts';

const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const raw = await req.text(); // verify against the raw bytes, never re-serialised JSON
  if (!(await verifySignature(raw, req.headers.get('x-paystack-signature'), secret))) {
    return new Response('invalid signature', { status: 401 });
  }

  const mailer = createMailer({
    settings: async () => (await admin.from('email_settings').select('api_key, from_name, from_email, reply_to, enabled').eq('id', true).maybeSingle()).data,
    template: async (key) => (await admin.from('email_templates').select('key, subject, body').eq('key', key).maybeSingle()).data,
    log: async (row) => { await admin.from('email_log').insert(row); },
  });
  const siteUrl = (Deno.env.get('WEB_URL') ?? '').replace(/\/$/, '');

  const body = JSON.parse(raw);
  const evt = interpretEvent(body);

  // Idempotency: Paystack retries, so ignore a delivery we've already stored.
  const { error: dupe } = await admin.from('payment_events').insert({ dedupe_key: evt.dedupeKey, event: body.event ?? 'unknown', payload: body });
  if (dupe?.code === '23505') return new Response('duplicate', { status: 200 });
  if (dupe) return new Response('storage error', { status: 500 }); // non-2xx makes Paystack retry

  if (evt.action === 'ignore') return new Response('ok', { status: 200 });

  // Resolve the parent: known customer code -> metadata.user_id -> email.
  let parentId: string | undefined;
  if (evt.customerCode) {
    const { data } = await admin.from('billing_accounts').select('parent_id').eq('paystack_customer_code', evt.customerCode).maybeSingle();
    parentId = data?.parent_id;
  }
  if (!parentId && evt.subscriptionCode) {
    const { data } = await admin.from('billing_accounts').select('parent_id').eq('paystack_subscription_code', evt.subscriptionCode).maybeSingle();
    parentId = data?.parent_id;
  }
  if (!parentId && evt.userId) {
    const { data } = await admin.from('profiles').select('id').eq('id', evt.userId).maybeSingle();
    parentId = data?.id;
  }
  if (!parentId && evt.email) {
    const { data } = await admin.from('profiles').select('id').ilike('email', evt.email).maybeSingle();
    parentId = data?.id;
  }
  if (!parentId) return new Response('no matching parent', { status: 200 }); // logged in payment_events; don't retry forever

  const now = new Date().toISOString();

  if (evt.customerCode || evt.subscriptionCode || evt.emailToken) {
    const update: Record<string, string> = { parent_id: parentId, updated_at: now };
    if (evt.customerCode) update.paystack_customer_code = evt.customerCode;
    if (evt.subscriptionCode) update.paystack_subscription_code = evt.subscriptionCode;
    if (evt.emailToken) update.paystack_email_token = evt.emailToken;
    const { error } = await admin.from('billing_accounts').upsert(update);
    if (error) return new Response('billing upsert failed', { status: 500 });
  }

  const statusFor = { activate: 'active', past_due: 'past_due', cancel: 'canceled' } as const;
  const ent: Record<string, string | null> = { parent_id: parentId, status: statusFor[evt.action as keyof typeof statusFor], updated_at: now };
  if (evt.plan) ent.plan = evt.plan;
  if (evt.periodEnd) ent.current_period_end = evt.periodEnd;
  const { error } = await admin.from('entitlements').upsert(ent);
  if (error) return new Response('entitlement upsert failed', { status: 500 });

  // Best-effort emails. A failure here must never make Paystack retry the webhook.
  try {
    const eventName = String(body.event ?? '');
    const template = eventName === 'charge.success' && evt.action === 'activate' ? 'subscription_confirmation'
      : eventName === 'subscription.disable' ? 'cancellation'
      : eventName === 'invoice.payment_failed' ? 'renewal_due' : null;
    if (template) {
      const { data: profile } = await admin.from('profiles').select('email').eq('id', parentId).maybeSingle();
      const { data: access } = await admin.from('entitlements').select('plan, current_period_end').eq('parent_id', parentId).maybeSingle();
      const { data: plan } = await admin.from('plans').select('name, price_minor, currency').eq('id', access?.plan ?? evt.plan ?? '').maybeSingle();
      const paid = Number(body.data?.amount);
      const minor = template === 'subscription_confirmation' && paid > 0 ? paid : plan?.price_minor ?? 0;
      if (profile?.email) {
        await mailer.sendOne(profile.email, {
          parent_email: profile.email, plan: plan?.name ?? evt.plan ?? 'Premium', amount: minor ? money(minor, plan?.currency ?? 'NGN') : '',
          access_until: longDate(access?.current_period_end ? new Date(Date.parse(access.current_period_end) + (template === 'renewal_due' ? 5 * 86_400_000 : 0)).toISOString() : null),
          due_date: longDate(access?.current_period_end), site_url: siteUrl, support_email: Deno.env.get('SUPPORT_EMAIL') ?? 'support@custar.com',
        }, { template, campaign: 'automatic' });
      }
    }
  } catch (_e) { /* ignore */ }

  return new Response('ok', { status: 200 });
});
