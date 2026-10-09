// Daily scheduled reminder emails (renewal coming up, Premium ending after cancelling, last chance after a missed payment).
// Called by the pg_cron job `send-reminder-emails` with the x-job-secret header, or by an admin ("Run now").
// Deploy with verify_jwt OFF: the handler does its own authentication.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleReminders } from '../_shared/reminders.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': Deno.env.get('WEB_URL') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-job-secret' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const input = await req.json().catch(() => ({}));

  const result = await handleReminders({ jobSecret: req.headers.get('x-job-secret'), authorization: req.headers.get('Authorization') }, input, {
    jobSecret: async () => (await service.from('job_secrets').select('value').eq('name', 'reminders').maybeSingle()).data?.value ?? null,
    getCaller: async (jwt) => { const { data } = await service.auth.getUser(jwt); return data.user ? { id: data.user.id } : null; },
    isAdmin: async (id) => { const { data } = await service.from('profiles').select('is_admin').eq('id', id).maybeSingle(); return !!data?.is_admin; },
    settings: async () => (await service.from('email_settings').select('api_key, from_name, from_email, reply_to, enabled').eq('id', true).maybeSingle()).data,
    template: async (key) => (await service.from('email_templates').select('key, subject, body').eq('key', key).maybeSingle()).data,
    log: async (row) => { await service.from('email_log').insert(row); },
    candidates: async () => { const { data, error } = await service.rpc('reminder_candidates'); if (error) throw new Error(error.message); return data ?? []; },
    claim: async (c) => { const { error } = await service.from('email_reminders').insert({ parent_id: c.parent_id, kind: c.kind, period_end: c.period_end }); return !error; },
    release: async (c) => { await service.from('email_reminders').delete().eq('parent_id', c.parent_id).eq('kind', c.kind).eq('period_end', c.period_end); },
    siteUrl: (Deno.env.get('WEB_URL') ?? '').replace(/\/$/, ''),
    supportEmail: Deno.env.get('SUPPORT_EMAIL') ?? 'support@custar.com',
  }).catch((e) => ({ status: 502, body: { error: e instanceof Error ? e.message : 'Something went wrong' } }));

  return json(result.body, result.status);
});
