-- 0011: word hunt (word search) words per story. Spark and Seeker readers can play it after a story.
-- Up to 8 words (characters, key words, events); each is letters A-Z only, 3 to 10 long. The app picks 4 (Spark) or 6 (Seeker) at random every attempt.
create function puzzle_words_ok(w text[]) returns boolean language sql immutable set search_path = public as $$
  select coalesce(cardinality(w), 0) <= 8 and not exists (select 1 from unnest(w) x where x !~ '^[A-Z]{3,10}$');
$$;
alter table stories add column puzzle_words text[] not null default '{}';
alter table stories add constraint stories_puzzle_words_valid check (puzzle_words_ok(puzzle_words));
