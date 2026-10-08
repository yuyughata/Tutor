-- Access helpers move to a schema the API does not expose; policies reference them by OID so nothing else changes.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_admin(uuid) set schema private;
alter function public.has_active_entitlement(uuid) set schema private;
alter function public.can_read_story(uuid) set schema private;

alter function private.is_admin(uuid) set search_path = public, private;
alter function private.has_active_entitlement(uuid) set search_path = public, private;
alter function private.can_read_story(uuid) set search_path = public, private;

alter function public.admin_stats() set search_path = public, private;
alter function public.admin_subscribers(text) set search_path = public, private;
alter function public.admin_set_entitlement(uuid, entitlement_status, timestamptz, text) set search_path = public, private;
alter function public.admin_set_admin(text, boolean) set search_path = public, private;

-- Trigger functions never need to be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_page_count() from public, anon, authenticated;
