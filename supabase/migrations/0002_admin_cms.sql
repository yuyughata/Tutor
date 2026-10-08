-- Genova admin dashboard + CMS support
-- Scheduled publishing, admin read access, page counts, featured-slot guard, admin-only RPCs.

create extension if not exists btree_gist with schema extensions;

-- ---------- scheduled publishing ----------
-- A story is live once it is published or scheduled AND its publish time has arrived.
create function is_live(s story_status, at timestamptz) returns boolean
language sql stable set search_path = public as $$
  select s in ('published', 'scheduled') and at is not null and at <= now();
$$;

alter table stories add column updated_at timestamptz not null default now();
alter table stories add constraint scheduled_needs_date check (status <> 'scheduled' or published_at is not null);

create function stories_before_write() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  if new.status = 'draft' then new.published_at := null; end if; -- unpublishing resets the date
  return new;
end $$;

create trigger stories_before_write before insert or update on stories
for each row execute function stories_before_write();

-- alter (not drop/create) so the migration can also be applied from tools that block DROP statements
alter policy "published stories" on stories
  using (is_live(status, published_at) or is_admin((select auth.uid())));
alter policy "published stories" on stories rename to "live stories";

create or replace function can_read_story(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from stories s
    where s.id = sid
      and is_live(s.status, s.published_at)
      and (s.is_free or has_active_entitlement(auth.uid()))
  ) or is_admin(auth.uid());
$$;

create or replace view popular_stories with (security_invoker = false) as
select s.id as story_id, count(e.id) as reads_30d
from stories s
left join read_events e
  on e.story_id = s.id and e.started_at > now() - interval '30 days'
where is_live(s.status, s.published_at)
group by s.id;

-- ---------- page count stays correct automatically ----------
create function sync_page_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare sid uuid := coalesce(new.story_id, old.story_id);
begin
  update stories set page_count = (select count(*) from story_pages where story_id = sid) where id = sid;
  return null;
end $$;

create trigger story_pages_count after insert or update or delete on story_pages
for each row execute function sync_page_count();

-- ---------- one Title of the Week / Month at a time ----------
alter table featured_slots add constraint featured_no_overlap
  exclude using gist (type with =, tstzrange(starts_at, ends_at) with &&);

-- ---------- admin read access ----------
create policy "admin read profiles" on profiles for select using (is_admin((select auth.uid())));
create policy "admin read entitlements" on entitlements for select using (is_admin((select auth.uid())));
create policy "admin read payment events" on payment_events for select using (is_admin((select auth.uid())));
create policy "admin read reads" on read_events for select using (is_admin((select auth.uid())));

-- ---------- admin-only functions ----------
create function admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin(auth.uid()) then raise exception 'not authorised' using errcode = '42501'; end if;
  return jsonb_build_object(
    'stories_live', (select count(*) from stories where is_live(status, published_at)),
    'stories_scheduled', (select count(*) from stories where status in ('scheduled', 'published') and published_at > now()),
    'stories_draft', (select count(*) from stories where status = 'draft'),
    'parents', (select count(*) from profiles),
    'readers', (select count(*) from child_profiles),
    'subscribers', (select count(*) from entitlements
                    where status in ('active', 'trialing') and (current_period_end is null or current_period_end > now())),
    'reads_7d', (select count(*) from read_events where started_at > now() - interval '7 days'),
    'reads_30d', (select count(*) from read_events where started_at > now() - interval '30 days'),
    'reads_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'reads', d.reads) order by d.day), '[]'::jsonb)
                     from (select g::date as day, count(e.id) as reads
                           from generate_series(current_date - 13, current_date, interval '1 day') g
                           left join read_events e on e.started_at::date = g::date
                           group by 1) d),
    'top_stories', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'reads', t.reads) order by t.reads desc), '[]'::jsonb)
                    from (select s.id, s.title, count(e.id) as reads
                          from stories s
                          left join read_events e on e.story_id = s.id and e.started_at > now() - interval '30 days'
                          group by s.id, s.title
                          order by reads desc, s.title
                          limit 5) t)
  );
end $$;

create function admin_subscribers(search text default null)
returns table (parent_id uuid, email text, joined_at timestamptz, status text, plan text, current_period_end timestamptz, readers bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.created_at, coalesce(e.status::text, 'none'), e.plan, e.current_period_end,
         (select count(*) from child_profiles c where c.parent_id = p.id)
  from profiles p
  left join entitlements e on e.parent_id = p.id
  where is_admin(auth.uid())
    and (search is null or search = '' or p.email ilike '%' || search || '%')
  order by p.created_at desc
  limit 200;
$$;

-- Complimentary / manual access (e.g. app-store reviewers, partners). Paystack events still override it.
create function admin_set_entitlement(p_parent uuid, p_status entitlement_status, p_until timestamptz, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin(auth.uid()) then raise exception 'not authorised' using errcode = '42501'; end if;
  insert into entitlements (parent_id, status, plan, current_period_end, updated_at)
  values (p_parent, p_status, p_plan, p_until, now())
  on conflict (parent_id) do update
    set status = excluded.status, plan = excluded.plan, current_period_end = excluded.current_period_end, updated_at = now();
end $$;

create function admin_set_admin(p_email text, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if not is_admin(auth.uid()) then raise exception 'not authorised' using errcode = '42501'; end if;
  select id into target from profiles where lower(email) = lower(p_email);
  if target is null then raise exception 'No account found for %. They need to sign up first.', p_email; end if;
  if not p_admin and (select count(*) from profiles where is_admin) <= 1 then
    raise exception 'You cannot remove the last admin.';
  end if;
  update profiles set is_admin = p_admin where id = target;
end $$;

revoke execute on function admin_stats() from public, anon;
revoke execute on function admin_subscribers(text) from public, anon;
revoke execute on function admin_set_entitlement(uuid, entitlement_status, timestamptz, text) from public, anon;
revoke execute on function admin_set_admin(text, boolean) from public, anon;
grant execute on function admin_stats() to authenticated;
grant execute on function admin_subscribers(text) to authenticated;
grant execute on function admin_set_entitlement(uuid, entitlement_status, timestamptz, text) to authenticated;
grant execute on function admin_set_admin(text, boolean) to authenticated;

-- ---------- storage hygiene ----------
update storage.buckets
set file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id in ('covers', 'pages');

-- ---------- reference data ----------
insert into authors (id, name, bio) values
  ('00000000-0000-0000-0000-0000000000a1', 'CUSTAR', 'Stories created by the CUSTAR team.')
on conflict (id) do nothing;

insert into categories (slug, name, sort_order) values
  ('adventure', 'Adventure', 1),
  ('animals', 'Animals', 2),
  ('bedtime', 'Bedtime', 3),
  ('fantasy', 'Fantasy', 4)
on conflict (slug) do nothing;
