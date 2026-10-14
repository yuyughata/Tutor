-- Landing-page forms stored in the database (replaces Formspree): "Request a GRP spot" and "Request a title".
-- Visitors are not signed in, so they cannot write to the tables directly: they call the two submit_* functions
-- (SECURITY DEFINER; they validate, ignore bots that fill the hidden "website" field, and rate-limit).
-- Only admins can read and update the rows (status and a private note), in the admin dashboard "Requests" view.

create table grp_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (char_length(phone) between 6 and 25),
  email text not null check (char_length(email) between 5 and 200 and email like '%@%'),
  reading_level text not null check (char_length(reading_level) between 1 and 80),
  mode text not null check (mode in ('On site', 'Online')),
  comments text check (char_length(comments) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'done')),
  admin_note text check (char_length(admin_note) <= 2000),
  source text check (char_length(source) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index grp_requests_status_idx on grp_requests (status, created_at desc);

create table title_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (char_length(phone) between 6 and 25),
  email text not null check (char_length(email) between 5 and 200 and email like '%@%'),
  storybook_title text check (char_length(storybook_title) <= 200),
  reader_level text not null check (char_length(reader_level) between 1 and 80),
  comments text check (char_length(comments) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'done')),
  admin_note text check (char_length(admin_note) <= 2000),
  source text check (char_length(source) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index title_requests_status_idx on title_requests (status, created_at desc);

create function touch_request() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger grp_requests_touch before update on grp_requests for each row execute function touch_request();
create trigger title_requests_touch before update on title_requests for each row execute function touch_request();

alter table grp_requests enable row level security;
alter table title_requests enable row level security;
create policy "admin reads grp requests" on grp_requests for select using (private.is_admin((select auth.uid())));
create policy "admin updates grp requests" on grp_requests for update using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));
create policy "admin reads title requests" on title_requests for select using (private.is_admin((select auth.uid())));
create policy "admin updates title requests" on title_requests for update using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));

create function submit_grp_request(
  p_full_name text, p_phone text, p_email text, p_reading_level text, p_mode text,
  p_comments text default null, p_source text default null, p_website text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  n text := btrim(coalesce(p_full_name, ''));
  ph text := btrim(coalesce(p_phone, ''));
  em text := lower(btrim(coalesce(p_email, '')));
  lv text := btrim(coalesce(p_reading_level, ''));
  md text := btrim(coalesce(p_mode, ''));
begin
  if btrim(coalesce(p_website, '')) <> '' then return; end if; -- hidden field: only bots fill it in
  if char_length(n) < 2 or char_length(n) > 120 then raise exception 'Please enter your full name.'; end if;
  if ph !~ '^[0-9+() -]{6,25}$' then raise exception 'Please enter a valid phone number.'; end if;
  if em !~ '^[^@ ]+@[^@ ]+[.][^@ ]+$' or char_length(em) > 200 then raise exception 'Please enter a valid email address.'; end if;
  if char_length(lv) < 1 or char_length(lv) > 80 then raise exception 'Please choose a reading level.'; end if;
  if md not in ('On site', 'Online') then raise exception 'Please choose On site or Online.'; end if;
  if char_length(coalesce(p_comments, '')) > 2000 then raise exception 'Your comment is too long. Please shorten it.'; end if;
  if (select count(*) from grp_requests where created_at > now() - interval '1 hour' and (lower(email) = em or phone = ph)) >= 3 then
    raise exception 'You have already sent a few requests. We will be in touch soon.';
  end if;
  if (select count(*) from grp_requests where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'We are receiving a lot of requests right now. Please try again later or message us on WhatsApp.';
  end if;
  insert into grp_requests (full_name, phone, email, reading_level, mode, comments, source)
  values (n, ph, em, lv, md, nullif(btrim(coalesce(p_comments, '')), ''), left(nullif(btrim(coalesce(p_source, '')), ''), 200));
end $$;

create function submit_title_request(
  p_full_name text, p_phone text, p_email text, p_reader_level text,
  p_storybook_title text default null, p_comments text default null, p_source text default null, p_website text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  n text := btrim(coalesce(p_full_name, ''));
  ph text := btrim(coalesce(p_phone, ''));
  em text := lower(btrim(coalesce(p_email, '')));
  lv text := btrim(coalesce(p_reader_level, ''));
begin
  if btrim(coalesce(p_website, '')) <> '' then return; end if;
  if char_length(n) < 2 or char_length(n) > 120 then raise exception 'Please enter your full name.'; end if;
  if ph !~ '^[0-9+() -]{6,25}$' then raise exception 'Please enter a valid phone number.'; end if;
  if em !~ '^[^@ ]+@[^@ ]+[.][^@ ]+$' or char_length(em) > 200 then raise exception 'Please enter a valid email address.'; end if;
  if char_length(lv) < 1 or char_length(lv) > 80 then raise exception 'Please choose a reader level.'; end if;
  if char_length(coalesce(p_storybook_title, '')) > 200 then raise exception 'That title is too long. Please shorten it.'; end if;
  if char_length(coalesce(p_comments, '')) > 2000 then raise exception 'Your comment is too long. Please shorten it.'; end if;
  if (select count(*) from title_requests where created_at > now() - interval '1 hour' and (lower(email) = em or phone = ph)) >= 3 then
    raise exception 'You have already sent a few requests. We will be in touch soon.';
  end if;
  if (select count(*) from title_requests where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'We are receiving a lot of requests right now. Please try again later or message us on WhatsApp.';
  end if;
  insert into title_requests (full_name, phone, email, storybook_title, reader_level, comments, source)
  values (n, ph, em, nullif(btrim(coalesce(p_storybook_title, '')), ''), lv, nullif(btrim(coalesce(p_comments, '')), ''), left(nullif(btrim(coalesce(p_source, '')), ''), 200));
end $$;

revoke all on function submit_grp_request(text, text, text, text, text, text, text, text) from public;
revoke all on function submit_title_request(text, text, text, text, text, text, text, text) from public;
grant execute on function submit_grp_request(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function submit_title_request(text, text, text, text, text, text, text, text) to anon, authenticated;
