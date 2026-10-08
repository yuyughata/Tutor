// Gives a signed-in parent a one-time Paystack link to update their card or cancel their subscription.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('WEB_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'Sign in first.' }, 401);

  // billing_accounts is server-only: read it with the service role, but only for the caller's own row.
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: acct } = await service.from('billing_accounts').select('paystack_subscription_code').eq('parent_id', user.id).maybeSingle();
  if (!acct?.paystack_subscription_code) return json({ error: 'No subscription to manage yet.' }, 404);

  const res = await fetch(`https://api.paystack.co/subscription/${encodeURIComponent(acct.paystack_subscription_code)}/manage/link`, {
    headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` },
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.data?.link) return json({ error: out?.message ?? 'Could not open subscription settings.' }, 502);
  return json({ url: out.data.link });
});
