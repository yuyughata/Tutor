// Email (Resend) for the admin dashboard: connection settings, templates preview, test and campaign sends,
// plus a few self-service emails (welcome, passcode/password changed). Deploy with verify_jwt on.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleEmail } from '../_shared/emailAdmin.ts';
import { verifyResendKey } from '../_shared/email.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': Deno.env.get('WEB_URL') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const input = await req.json().catch(() => ({}));

  const result = await handleEmail(req.headers.get('Authorization'), input, {
    getCaller: async (jwt) => { const { data } = await service.auth.getUser(jwt); return data.user ? { id: data.user.id, email: data.user.email ?? null } : null; },
    isAdmin: async (id) => { const { data } = await service.from('profiles').select('is_admin').eq('id', id).maybeSingle(); return !!data?.is_admin; },
    settings: async () => (await service.from('email_settings').select('api_key, from_name, from_email, reply_to, notify_email, enabled').eq('id', true).maybeSingle()).data,
    saveSettings: async (patch) => { const { error } = await service.from('email_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', true); if (error) throw new Error(error.message); },
    verifyKey: (key) => verifyResendKey(key),
    audience: async (kind) => { const { data, error } = await service.rpc('email_audience', { kind }); if (error) throw new Error(error.message); return data ?? []; },
    template: async (key) => (await service.from('email_templates').select('key, subject, body').eq('key', key).maybeSingle()).data,
    log: async (row) => { await service.from('email_log').insert(row); },
    recentSelfSends: async (recipient, template, since) => (await service.from('email_log').select('id', { count: 'exact', head: true }).eq('recipient', recipient).eq('template', template).gte('created_at', since)).count ?? 0,
    siteUrl: (Deno.env.get('WEB_URL') ?? '').replace(/\/$/, ''),
    supportEmail: Deno.env.get('SUPPORT_EMAIL') ?? 'support@custar.com',
  }).catch((e) => ({ status: 502, body: { error: e instanceof Error ? e.message : 'Something went wrong' } }));

  return json(result.body, result.status);
});
