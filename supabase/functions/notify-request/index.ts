// Emails the team when a visitor sends a landing-page form. Called by the database trigger (migration 0018) through
// pg_net with the x-job-secret header, never from a browser. Deploy with verify_jwt OFF: the handler does its own authentication.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleNewRequest } from '../_shared/requestNotice.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const input = await req.json().catch(() => ({}));
  const result = await handleNewRequest(req.headers.get('x-job-secret'), input, {
    jobSecret: async () => (await service.from('job_secrets').select('value').eq('name', 'requests').maybeSingle()).data?.value ?? null,
    loadRequest: async (kind, id) => (await service.from(kind === 'grp' ? 'grp_requests' : 'title_requests').select('*').eq('id', id).maybeSingle()).data,
    settings: async () => (await service.from('email_settings').select('api_key, from_name, from_email, reply_to, notify_email, enabled').eq('id', true).maybeSingle()).data,
    adminEmails: async () => ((await service.from('profiles').select('email').eq('is_admin', true)).data ?? []).map((p: { email: string | null }) => p.email ?? ''),
    template: async (key) => (await service.from('email_templates').select('key, subject, body, eyebrow').eq('key', key).maybeSingle()).data,
    log: async (row) => { await service.from('email_log').insert(row); },
    siteUrl: (Deno.env.get('WEB_URL') || 'https://www.custar.ng/Genova').replace(/\/$/, ''),
  }).catch((e) => ({ status: 502, body: { error: e instanceof Error ? e.message : 'Something went wrong' } }));
  return json(result.body, result.status);
});
