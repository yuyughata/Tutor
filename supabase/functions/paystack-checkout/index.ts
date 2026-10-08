// Called by the web subscribe page with the parent's Supabase JWT.
// Starts a Paystack subscription checkout and returns the hosted payment URL.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('WEB_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Plan codes (PLN_...) are created in the Paystack dashboard. Amount is in the minor unit
// (kobo/pesewas/cents) and is only a fallback: the plan's own amount wins.
const PLANS: Record<string, { code?: string; amount?: string }> = {
  monthly: { code: Deno.env.get('PAYSTACK_PLAN_MONTHLY'), amount: Deno.env.get('PAYSTACK_AMOUNT_MONTHLY') },
  yearly: { code: Deno.env.get('PAYSTACK_PLAN_YEARLY'), amount: Deno.env.get('PAYSTACK_AMOUNT_YEARLY') },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return json({ error: 'sign in required' }, 401);

  const { plan = 'monthly' } = await req.json().catch(() => ({}));
  const chosen = PLANS[plan];
  if (!chosen?.code) return json({ error: 'unknown plan' }, 400);

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      amount: chosen.amount ?? '0',
      plan: chosen.code,
      callback_url: `${Deno.env.get('WEB_URL') ?? ''}/?paid=1`,
      metadata: { user_id: user.id },
    }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.data?.authorization_url) return json({ error: out?.message ?? 'could not start checkout' }, 502);
  return json({ url: out.data.authorization_url });
});
