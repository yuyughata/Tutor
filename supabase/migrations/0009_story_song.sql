-- 0009: one MP3 song per story. The admin browser compresses the file before upload; the app plays it after the story.

-- ---------- a. columns ----------
alter table stories add column song_path text check (song_path is null or char_length(song_path) between 5 and 200);
alter table stories add column song_title text check (song_title is null or char_length(song_title) between 1 and 80);
alter table stories add column song_seconds int check (song_seconds is null or song_seconds between 1 and 900);
alter table stories add column song_bytes int check (song_bytes is null or song_bytes between 1 and 3145728);

-- ---------- b. private bucket (songs/<story_id>/<uuid>.mp3), same access rule as page art ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('songs', 'songs', false, 3145728, array['audio/mpeg'])
on conflict (id) do nothing;

create policy "admin manage songs" on storage.objects for all
  using (bucket_id = 'songs' and private.is_admin((select auth.uid())))
  with check (bucket_id = 'songs' and private.is_admin((select auth.uid())));

create policy "read songs with access" on storage.objects for select
  using (bucket_id = 'songs' and private.can_read_story(((storage.foldername(name))[1])::uuid));
