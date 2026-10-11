-- Rollback-only check for migration 0009 (run in the SQL editor): the RAISE rolls everything back.
-- Expected message: "RESULT anon free=1 premium=0" (a free story's song is readable, a Premium story's is not, without access).
do $$
declare a uuid; fr uuid := gen_random_uuid(); pr uuid := gen_random_uuid(); n_free int; n_prem int;
begin
  select id into a from authors limit 1;
  insert into stories (id, slug, title, synopsis, reading_level, status, is_free, published_at, author_id) values
    (fr, 'zz-song-free', 'F', 's', 'spark', 'published', true, now() - interval '1 day', a),
    (pr, 'zz-song-prem', 'P', 's', 'spark', 'published', false, now() - interval '1 day', a);
  insert into storage.objects (bucket_id, name) values ('songs', fr::text || '/a.mp3'), ('songs', pr::text || '/b.mp3');
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n_free from storage.objects where bucket_id = 'songs' and name like fr::text || '/%';
  select count(*) into n_prem from storage.objects where bucket_id = 'songs' and name like pr::text || '/%';
  reset role;
  raise exception 'RESULT anon free=% premium=%', n_free, n_prem;
end $$;
