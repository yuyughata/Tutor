-- 0008: Word Explorer, chapters, reading leaderboard and awards. Applied to GenovaStorybook in two parts (a: tables, b: functions + award email).

-- ---------- a. schema ----------
-- chapters: a book can opt in; a page with a chapter_title starts a new chapter
alter table stories add column has_chapters boolean not null default false;
alter table story_pages add column chapter_title text check (chapter_title is null or char_length(chapter_title) between 1 and 80);

-- word explorer: 1 word per Spark story, 3 per Seeker story, none for Sunrise
create table story_words (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  word text not null check (char_length(word) between 2 and 40),
  meaning text not null check (char_length(meaning) between 3 and 200),
  example text check (example is null or char_length(example) <= 200),
  page_position int check (page_position is null or page_position >= 1),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index story_words_story_idx on story_words (story_id, sort_order);
create unique index story_words_unique_word on story_words (story_id, lower(word));
alter table story_words enable row level security;
create policy "live story words" on story_words for select using (
  exists (select 1 from stories s where s.id = story_id and is_live(s.status, s.published_at)) or private.is_admin((select auth.uid())));
create policy "admin write words" on story_words for all using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));

create function words_allowed(l reading_level) returns int language sql immutable set search_path = public as $$
  select case l when 'spark' then 1 when 'seeker' then 3 else 0 end;
$$;
create function story_words_limit() returns trigger language plpgsql set search_path = public as $$
declare lvl reading_level; allowed int;
begin
  select reading_level into lvl from stories where id = new.story_id;
  allowed := words_allowed(lvl);
  if (select count(*) from story_words where story_id = new.story_id) >= allowed then
    raise exception 'A % story can have % word(s) in the word explorer.', lvl, allowed using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger story_words_limit before insert on story_words for each row execute function story_words_limit();
revoke execute on function story_words_limit() from public, anon, authenticated;

-- words a child has explored (kept by the owning parent)
create table child_words (
  child_id uuid not null references child_profiles (id) on delete cascade,
  word_id uuid not null references story_words (id) on delete cascade,
  learned_at timestamptz not null default now(),
  primary key (child_id, word_id)
);
alter table child_words enable row level security;
create policy "own child words" on child_words for all
  using (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = (select auth.uid())))
  with check (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "admin reads child words" on child_words for select using (private.is_admin((select auth.uid())));

-- every finished story, with a time, so readers can be ranked by week, month and all time
create table story_completions (
  id bigint generated always as identity primary key,
  child_id uuid not null references child_profiles (id) on delete cascade,
  story_id uuid not null references stories (id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_day date not null default ((now() at time zone 'Africa/Lagos')::date),
  unique (child_id, story_id, completed_day)
);
create index story_completions_when_idx on story_completions (completed_at);
alter table story_completions enable row level security;
create policy "own completions" on story_completions for all
  using (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = (select auth.uid())))
  with check (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "admin reads completions" on story_completions for select using (private.is_admin((select auth.uid())));

-- rewards the team has given
create table reader_awards (
  id bigint generated always as identity primary key,
  child_id uuid not null references child_profiles (id) on delete cascade,
  kind text not null check (kind in ('week', 'month', 'all_time', 'custom')),
  period_label text not null,
  stories int,
  note text,
  awarded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (child_id, kind, period_label)
);
alter table reader_awards enable row level security;
create policy "parent reads own awards" on reader_awards for select using (exists (select 1 from child_profiles c where c.id = child_id and c.parent_id = (select auth.uid())));
create policy "admin reads awards" on reader_awards for select using (private.is_admin((select auth.uid())));
create policy "admin gives awards" on reader_awards for insert with check (private.is_admin((select auth.uid())) and awarded_by = (select auth.uid()));

-- ---------- b. leaderboard, chapter list, award email ----------
-- finished stories so far count toward the leaderboard (the existing finish time is all we know)
insert into story_completions (child_id, story_id, completed_at, completed_day)
select child_id, story_id, finished_at, (finished_at at time zone 'Africa/Lagos')::date from reading_progress where finished_at is not null
on conflict do nothing;

-- who read the most: week and month are calendar periods in Nigerian time (Monday start); all_time has no start
create function admin_leaderboard(p_period text, p_limit int default 20)
returns table (pos bigint, child_id uuid, child_name text, avatar text, reading_level reading_level, parent_email text, stories int, last_completed timestamptz, period_start timestamptz, period_label text, awarded boolean)
language plpgsql stable security definer set search_path = public, private as $$
#variable_conflict use_column
declare start_ts timestamptz; lbl text;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Only admins can do that.' using errcode = '42501'; end if;
  if p_period = 'week' then
    start_ts := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
    lbl := to_char(start_ts at time zone 'Africa/Lagos', 'IYYY-"W"IW');
  elsif p_period = 'month' then
    start_ts := date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
    lbl := to_char(start_ts at time zone 'Africa/Lagos', 'YYYY-MM');
  elsif p_period = 'all_time' then
    start_ts := '-infinity'; lbl := 'all-time';
  else
    raise exception 'Unknown period.' using errcode = '22023';
  end if;
  return query
    with agg as (
      select c.child_id as cid, count(distinct c.story_id)::int as n, max(c.completed_at) as last_at
      from story_completions c where c.completed_at >= start_ts group by c.child_id
    )
    select rank() over (order by a.n desc), a.cid, cp.name, cp.avatar, cp.reading_level, p.email, a.n, a.last_at,
           case when p_period = 'all_time' then null::timestamptz else start_ts end, lbl,
           exists (select 1 from reader_awards r where r.child_id = a.cid and r.kind = p_period and r.period_label = lbl)
    from agg a join child_profiles cp on cp.id = a.cid join profiles p on p.id = cp.parent_id
    order by 1, a.last_at
    limit greatest(1, least(p_limit, 100));
end $$;
revoke execute on function admin_leaderboard(text, int) from public, anon;
grant execute on function admin_leaderboard(text, int) to authenticated;

-- chapter titles of a live book (titles only, so they show before a locked story is opened)
create function story_chapter_list(p_story uuid) returns table (chapter int, title text, first_page int)
language sql stable security definer set search_path = public, private as $$
  select (row_number() over (order by sp.position))::int, sp.chapter_title, sp.position
  from story_pages sp join stories s on s.id = sp.story_id
  where sp.story_id = p_story and sp.chapter_title is not null and s.has_chapters
    and (is_live(s.status, s.published_at) or private.is_admin(auth.uid()))
  order by sp.position;
$$;
revoke execute on function story_chapter_list(uuid) from public;
grant execute on function story_chapter_list(uuid) to anon, authenticated;

insert into email_templates (key, name, description, subject, eyebrow, body, variables, automatic) values
('reader_award', 'Reader award', 'Sent when the team rewards a top reader.', '{{child_name}} is {{award_title}}!', 'Reader award',
$b$# {{child_name}} is {{award_title}}

Congratulations! {{child_name}} finished {{stories}} stories {{period_phrase}}, which makes them one of our top readers.

> Thank you for reading with us. Keep going!

{{note}}

[Keep reading]({{site_url}}/)$b$,
 '{parent_email,child_name,award_title,stories,period_phrase,note,site_url}', false)
on conflict (key) do nothing;
