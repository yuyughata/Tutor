// A signed-in parent sends a message to the admins. Saved to support_requests (visible in the dashboard)
// and, when email is activated, announced to the support inbox. Deploy with verify_jwt on.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createMailer } from '../_shared/email.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': Deno.env.get('WEB_URL') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const TOPICS = ['sign_in', 'subscription', 'app', 'story', 'other'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await service.auth.getUser(jwt);
  if (!user?.email) return json({ error: 'Sign in first.' }, 401);

  const { topic = 'other', message = '' } = await req.json().catch(() => ({}));
  const text = String(message).trim();
  if (text.length < 5) return json({ error: 'Please tell us a little more.' }, 400);
  if (text.length > 4000) return json({ error: 'That message is too long. Please shorten it.' }, 400);

  // at most 5 requests per hour per parent
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await service.from('support_requests').select('id', { count: 'exact', head: true }).eq('parent_id', user.id).gte('created_at', since);
  if ((count ?? 0) >= 5) return json({ error: 'You have sent a few messages already. We will reply soon.' }, 429);

  const { error } = await service.from('support_requests').insert({ parent_id: user.id, email: user.email, topic: TOPICS.includes(topic) ? topic : 'other', message: text });
  if (error) return json({ error: 'Could not send your message. Please try again.' }, 500);

  // best effort: tell the support inbox
  try {
    const { data: s } = await service.from('email_settings').select('api_key, from_name, from_email, reply_to, notify_email, enabled').eq('id', true).maybeSingle();
    if (s?.enabled && s.notify_email) {
      const mailer = createMailer({
        settings: async () => s,
        template: async () => ({ key: 'support_notice', subject: 'New Genova support request from {{parent_email}}', body: '# New support request\n- From: {{parent_email}}\n- Topic: {{topic}}\n\n{{message}}\n\n[Open the dashboard]({{site_url}}/admin/)' }),
        log: async (row) => { await service.from('email_log').insert(row); },
      });
      await mailer.sendOne(s.notify_email, { parent_email: user.email, topic: String(topic), message: text, site_url: (Deno.env.get('WEB_URL') ?? '').replace(/\/$/, '') }, { template: 'support_notice', campaign: 'support' });
    }
  } catch { /* the request is saved; the notice is optional */ }
  return json({ ok: true });
});
