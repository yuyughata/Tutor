-- Reading levels, 5-day grace access, plans, privacy policy, admin audit log.
-- Applied to GenovaStorybook as several smaller migrations (the tooling blocks DROP/DELETE statements).

-- ---------- 1. reading levels (age groups are never shown to users) ----------
alter type age_band rename to reading_level;
alter type reading_level rename value '2-4' to 'sunrise';      -- Assisted Reader
alter type reading_level rename value '5-8' to 'spark';        -- Emergent Reader
alter type reading_level rename value '9-12' to 'seeker';      -- Developing Reader
alter table stories rename column age_band to reading_level;
alter table child_profiles rename column age_band to reading_level;

-- ---------- 2. premium access rules ----------
-- (run separately: ALTER TYPE ... ADD VALUE cannot be used in the transaction that adds it)
alter type entitlement_status add value if not exists 'expired';

-- active / trialing / past_due keep access for 5 days after the paid period ends (grace for a failed renewal);
-- after that the parent is back on the Free plan automatically. canceled keeps access until the paid period
-- ends (no grace). An active entitlement with no end date (complimentary access) never lapses.
create function private.access_until(s entitlement_status, period_end timestamptz) returns timestamptz
language sql immutable set search_path = public as $$
  select case s
    when 'active' then period_end + interval '5 days'
    when 'trialing' then period_end + interval '5 days'
    when 'past_due' then period_end + interval '5 days'
    when 'canceled' then period_end
    else '-infinity'::timestamptz
  end;
$$;

create or replace function private.has_active_entitlement(uid uuid) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from entitlements e
    where e.parent_id = uid
      and (
        (e.current_period_end is null and e.status in ('active', 'trialing'))
        or private.access_until(e.status, e.current_period_end) > now()
      )
  );
$$;

create function public.my_access()
returns table (active boolean, status text, plan text, current_period_end timestamptz, access_until timestamptz, in_grace boolean)
language sql stable security definer set search_path = public, private as $$
  select private.has_active_entitlement(auth.uid()),
         e.status::text, e.plan, e.current_period_end,
         case when e.current_period_end is null and e.status in ('active', 'trialing') then null
              else private.access_until(e.status, e.current_period_end) end,
         (e.current_period_end is not null and e.current_period_end < now() and private.has_active_entitlement(auth.uid()) and e.status <> 'canceled')
  from entitlements e
  where e.parent_id = auth.uid();
$$;
revoke execute on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- ---------- 3. plans ----------
create table plans (
  id text primary key,
  name text not null,
  tagline text,
  price_minor int not null default 0,          -- kobo
  currency text not null default 'NGN',
  billing_interval text,                       -- 'monthly' | 'quarterly' | null for Free
  paystack_plan_code text,                     -- PLN_... from the Paystack dashboard
  features jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true
);
alter table plans enable row level security;
create policy "public plans" on plans for select using (true);
create policy "admin write plans" on plans for all using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));

insert into plans (id, name, tagline, price_minor, billing_interval, features, sort_order) values
  ('free', 'Free', 'A taste of Genova', 0, null,
   '["A growing set of free stories", "Reader profiles for every child", "Favourites and reading progress", "No ads, ever"]', 1),
  ('monthly', 'Premium Monthly', 'Pay month to month', 500000, 'monthly',
   '["Every story in the library", "New stories every week", "Read offline", "Cancel any time"]', 2),
  ('quarterly', 'Premium Quarterly', 'Best value: save 20%', 1200000, 'quarterly',
   '["Everything in Monthly", "Three months for the price of 2.4", "Cancel any time"]', 3)
on conflict (id) do nothing;

-- ---------- 4. legal documents (privacy policy), editable from the admin dashboard ----------
create table legal_documents (
  slug text primary key check (slug in ('privacy-policy')),
  title text not null,
  body text not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);
alter table legal_documents enable row level security;
create policy "public legal read" on legal_documents for select using (true);
create policy "admin legal write" on legal_documents for all using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));

create function legal_documents_before_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.body is distinct from old.body or new.title is distinct from old.title then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger legal_documents_before_update before update on legal_documents
for each row execute function legal_documents_before_update();
revoke execute on function legal_documents_before_update() from public, anon, authenticated;

-- The sample privacy policy text is seeded in supabase/seed.sql (and was inserted into GenovaStorybook directly).

-- ---------- 5. audit log of sensitive admin actions (written by edge functions) ----------
create table admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references profiles (id) on delete set null,
  action text not null,
  target_email text,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table admin_actions enable row level security;
create policy "admin read actions" on admin_actions for select using (private.is_admin((select auth.uid())));

-- ---------- 6. admin people list with real access status, and dashboard counts ----------
create function admin_people(search text default null)
returns table (parent_id uuid, email text, joined_at timestamptz, status text, plan text, current_period_end timestamptz, access_until timestamptz, has_access boolean, readers bigint, is_admin boolean)
language sql stable security definer set search_path = public, private as $$
  select p.id, p.email, p.created_at, coalesce(e.status::text, 'none'), e.plan, e.current_period_end,
         case when e.parent_id is null then null
              when e.current_period_end is null and e.status in ('active', 'trialing') then null
              else private.access_until(e.status, e.current_period_end) end,
         private.has_active_entitlement(p.id),
         (select count(*) from child_profiles c where c.parent_id = p.id),
         p.is_admin
  from profiles p
  left join entitlements e on e.parent_id = p.id
  where private.is_admin(auth.uid())
    and (search is null or search = '' or p.email ilike '%' || search || '%')
  order by p.created_at desc
  limit 200;
$$;
revoke execute on function admin_people(text) from public, anon;
grant execute on function admin_people(text) to authenticated;
-- (admin_stats() was also replaced so "subscribers" counts everyone with current Premium access and adds "past_due".)

-- ---------- 7. hourly tidy-up: record lapsed subscribers as expired ----------
create extension if not exists pg_cron;
create function private.expire_lapsed_entitlements() returns int
language plpgsql security definer set search_path = public, private as $$
declare n int;
begin
  update entitlements
     set status = 'expired', updated_at = now()
   where status in ('active', 'trialing', 'past_due')
     and current_period_end is not null
     and current_period_end + interval '5 days' < now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function private.expire_lapsed_entitlements() from public, anon, authenticated;
select cron.schedule('expire-lapsed-subscriptions', '17 * * * *', 'select private.expire_lapsed_entitlements()');
