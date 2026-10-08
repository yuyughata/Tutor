-- Genova (CUSTAR) — initial schema
-- Children never have auth accounts; all child data hangs off the parent.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type age_band as enum ('2-4', '5-8', '9-12');
create type story_status as enum ('draft', 'scheduled', 'published');
create type featured_type as enum ('week', 'month');
create type entitlement_status as enum ('active', 'trialing', 'past_due', 'canceled');

-- ---------- parents ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  avatar text not null default 'fox',
  age_band age_band not null,
  created_at timestamptz not null default now()
);
create index on child_profiles (parent_id);

create table entitlements (
  parent_id uuid primary key references profiles (id) on delete cascade,
  status entitlement_status not null,
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Paystack identifiers. Server-only: RLS is enabled with no policies, so only the
-- service role (edge functions) can read or write. email_token can cancel a subscription.
create table billing_accounts (
  parent_id uuid primary key references profiles (id) on delete cascade,
  paystack_customer_code text unique,
  paystack_subscription_code text unique,
  paystack_email_token text,
  updated_at timestamptz not null default now()
);

-- Idempotency + audit log for webhook deliveries (service role only).
create table payment_events (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,
  event text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------- catalogue ----------
create table authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text
);

create table stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  synopsis text not null default '',
  cover_url text,
  author_id uuid references authors (id),
  age_band age_band not null,
  status story_status not null default 'draft',
  is_free boolean not null default false,
  page_count int not null default 0,
  reading_minutes int not null default 3,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index on stories (status, published_at desc);

create table story_pages (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  position int not null,
  image_url text not null,
  text text not null,
  -- future phases (additive): audio_url text, audio_timings jsonb, video_url text
  unique (story_id, position)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

create table story_categories (
  story_id uuid references stories (id) on delete cascade,
  category_id uuid references categories (id) on delete cascade,
  primary key (story_id, category_id)
);

create table featured_slots (
  id uuid primary key default gen_random_uuid(),
  type featured_type not null,
  story_id uuid not null references stories (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);
create index on featured_slots (type, starts_at);

-- ---------- child activity ----------
create table reading_progress (
  child_id uuid references child_profiles (id) on delete cascade,
  story_id uuid references stories (id) on delete cascade,
  last_page int not null default 0,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, story_id)
);

create table favorites (
  child_id uuid references child_profiles (id) on delete cascade,
  story_id uuid references stories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (child_id, story_id)
);

create table read_events (
  id bigint generated always as identity primary key,
  child_id uuid references child_profiles (id) on delete set null,
  story_id uuid not null references stories (id) on delete cascade,
  started_at timestamptz not null default now()
);
create index on read_events (story_id, started_at);

-- ---------- access helpers ----------
create function has_active_entitlement(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from entitlements
    where parent_id = uid
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

create function is_admin(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.id = uid), false);
$$;

create function can_read_story(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from stories s
    where s.id = sid
      and s.status = 'published'
      and (s.is_free or has_active_entitlement(auth.uid()))
  ) or is_admin(auth.uid());
$$;

-- Popular = reads over a rolling 30 days. Rows are public; only counts are exposed.
create view popular_stories with (security_invoker = false) as
select s.id as story_id, count(e.id) as reads_30d
from stories s
left join read_events e
  on e.story_id = s.id and e.started_at > now() - interval '30 days'
where s.status = 'published'
group by s.id;

-- ---------- auto-create parent profile on signup ----------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ---------- row level security ----------
alter table profiles enable row level security;
alter table child_profiles enable row level security;
alter table entitlements enable row level security;
alter table billing_accounts enable row level security;
alter table payment_events enable row level security;
alter table authors enable row level security;
alter table stories enable row level security;
alter table story_pages enable row level security;
alter table categories enable row level security;
alter table story_categories enable row level security;
alter table featured_slots enable row level security;
alter table reading_progress enable row level security;
alter table favorites enable row level security;
alter table read_events enable row level security;

-- parents: own row only (is_admin is not client-writable; billing ids live in billing_accounts)
create policy "own profile read" on profiles for select using (id = auth.uid());

-- child profiles: owned by the signed-in parent
create policy "own children" on child_profiles for all
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- entitlements: readable by the owner, written only by the service role (webhook)
create policy "own entitlement read" on entitlements for select using (parent_id = auth.uid());

-- catalogue metadata is public once published; admins see everything
create policy "published stories" on stories for select
  using (status = 'published' or is_admin(auth.uid()));
create policy "admin write stories" on stories for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "public authors" on authors for select using (true);
create policy "admin write authors" on authors for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "public categories" on categories for select using (true);
create policy "admin write categories" on categories for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "public story categories" on story_categories for select using (true);
create policy "admin write story categories" on story_categories for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "public featured" on featured_slots for select using (true);
create policy "admin write featured" on featured_slots for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- pages (the paywalled content): free stories for anyone, otherwise active entitlement
create policy "readable pages" on story_pages for select using (can_read_story(story_id));
create policy "admin write pages" on story_pages for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- child activity: only through the owning parent
create policy "own progress" on reading_progress for all
  using (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = auth.uid()))
  with check (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = auth.uid()));

create policy "own favorites" on favorites for all
  using (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = auth.uid()))
  with check (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = auth.uid()));

create policy "own read events insert" on read_events for insert
  with check (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = auth.uid()));

grant select on popular_stories to anon, authenticated;

-- ---------- storage ----------
-- Covers are public; page art is private and served by signed URLs after can_read_story().
insert into storage.buckets (id, name, public) values
  ('covers', 'covers', true),
  ('pages', 'pages', false)
on conflict (id) do nothing;

create policy "admin upload covers" on storage.objects for all
  using (bucket_id = 'covers' and is_admin(auth.uid()))
  with check (bucket_id = 'covers' and is_admin(auth.uid()));

create policy "admin upload pages" on storage.objects for all
  using (bucket_id = 'pages' and is_admin(auth.uid()))
  with check (bucket_id = 'pages' and is_admin(auth.uid()));

-- page objects are stored at pages/<story_id>/<position>.<ext>
create policy "read pages with access" on storage.objects for select
  using (
    bucket_id = 'pages'
    and can_read_story(((storage.foldername(name))[1])::uuid)
  );
