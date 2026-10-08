// Admin password support: email a reset code, or set a temporary password.
// Deployed with verify_jwt on; the handler additionally requires the caller to be an admin.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleSupport } from '../_shared/support.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('WEB_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const input = await req.json().catch(() => ({}));

  const result = await handleSupport(req.headers.get('Authorization'), input, {
    getCaller: async (jwt) => { const { data } = await service.auth.getUser(jwt); return data.user ? { id: data.user.id, email: data.user.email ?? null } : null; },
    isAdmin: async (id) => { const { data } = await service.from('profiles').select('is_admin').eq('id', id).maybeSingle(); return !!data?.is_admin; },
    findParentByEmail: async (email) => { const { data } = await service.from('profiles').select('id, email, is_admin').ilike('email', email).maybeSingle(); return data ? { id: data.id, email: data.email, is_admin: data.is_admin } : null; },
    sendReset: async (email) => { const { error } = await anon.auth.resetPasswordForEmail(email); if (error) throw new Error(error.message); },
    setPassword: async (id, password) => { const { error } = await service.auth.admin.updateUserById(id, { password }); if (error) throw new Error(error.message); },
    log: async (row) => { await service.from('admin_actions').insert(row); },
  }).catch((e) => ({ status: 502, body: { error: e instanceof Error ? e.message : 'Something went wrong' } }));

  return json(result.body, result.status);
});
