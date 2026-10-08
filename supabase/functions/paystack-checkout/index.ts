// Called by the website with the parent's Supabase JWT.
// Starts a Paystack subscription checkout for the chosen plan and returns the hosted payment URL.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('WEB_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Paystack plan codes (PLN_...) live on the plans table (admins can fill them in) with env vars as a fallback.
const ENV_CODE: Record<string, string | undefined> = {
  monthly: Deno.env.get('PAYSTACK_PLAN_MONTHLY'),
  quarterly: Deno.env.get('PAYSTACK_PLAN_QUARTERLY'),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: 'Sign in first.' }, 401);

  const { plan: planId = 'monthly' } = await req.json().catch(() => ({}));
  const { data: plan } = await supabase.from('plans').select('id, price_minor, currency, paystack_plan_code, billing_interval').eq('id', planId).eq('active', true).maybeSingle();
  if (!plan || !plan.billing_interval) return json({ error: 'That plan is not available.' }, 400);
  const code = plan.paystack_plan_code || ENV_CODE[plan.id];
  if (!code) return json({ error: 'Payments for this plan are not set up yet. Please try again soon.' }, 503);

  // Don't double-charge someone whose Premium is current. Late payers (grace period) may pay to renew.
  const { data: access } = await supabase.rpc('my_access');
  const a = Array.isArray(access) ? access[0] : access;
  if (a?.active && !a.in_grace && a.status === 'active') return json({ error: 'You already have an active Premium subscription.' }, 409);

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      amount: String(plan.price_minor), // the plan's own amount wins; this is the fallback
      currency: plan.currency,
      plan: code,
      callback_url: `${Deno.env.get('WEB_URL') ?? ''}/account?paid=1`,
      metadata: { user_id: user.id, plan: plan.id },
    }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.data?.authorization_url) return json({ error: out?.message ?? 'Could not start checkout.' }, 502);
  return json({ url: out.data.authorization_url });
});
