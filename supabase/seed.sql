-- Sample catalogue for local development. Image URLs are placeholders (picsum);
-- replace with real CUSTAR artwork uploaded to the covers/pages buckets.

insert into authors (id, name, bio) values
  ('00000000-0000-0000-0000-0000000000a1', 'CUSTAR', 'Stories created by the CUSTAR team.');

insert into categories (slug, name, sort_order) values
  ('adventure', 'Adventure', 1),
  ('animals', 'Animals', 2),
  ('bedtime', 'Bedtime', 3),
  ('fantasy', 'Fantasy', 4);

insert into stories (id, slug, title, synopsis, cover_url, author_id, age_band, status, is_free, page_count, reading_minutes, published_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'the-curious-little-fox', 'The Curious Little Fox',
   'A little fox follows a trail of glowing berries deep into the forest.',
   'https://picsum.photos/seed/fox/600/450', '00000000-0000-0000-0000-0000000000a1', '2-4', 'published', true, 3, 2, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000b2', 'luna-and-the-firefly', 'Luna and the Firefly',
   'Luna follows a tiny light through the garden and learns where fireflies go at dawn.',
   'https://picsum.photos/seed/firefly/600/450', '00000000-0000-0000-0000-0000000000a1', '5-8', 'published', true, 3, 4, now() - interval '9 days'),
  ('00000000-0000-0000-0000-0000000000b3', 'the-child-and-the-snow-leopard', 'The Child and the Snow Leopard',
   'A brave journey across frozen mountains to discover courage and friendship.',
   'https://picsum.photos/seed/leopard/600/450', '00000000-0000-0000-0000-0000000000a1', '9-12', 'published', false, 3, 6, now() - interval '20 days');

insert into story_pages (story_id, position, image_url, text) values
  ('00000000-0000-0000-0000-0000000000b1', 1, 'https://picsum.photos/seed/fox1/800/600', 'Fox woke up and sniffed the air. Something smelled sweet.'),
  ('00000000-0000-0000-0000-0000000000b1', 2, 'https://picsum.photos/seed/fox2/800/600', 'A trail of glowing berries led past the old oak tree.'),
  ('00000000-0000-0000-0000-0000000000b1', 3, 'https://picsum.photos/seed/fox3/800/600', 'At the end of the trail, all his friends were waiting. Surprise!'),
  ('00000000-0000-0000-0000-0000000000b2', 1, 'https://picsum.photos/seed/ff1/800/600', 'Late one evening, Luna sat by her window, watching the moon rise slowly above the trees.'),
  ('00000000-0000-0000-0000-0000000000b2', 2, 'https://picsum.photos/seed/ff2/800/600', 'Suddenly, a soft sparkle danced across her room. It was unlike anything she had ever seen: warm, bright, and gentle.'),
  ('00000000-0000-0000-0000-0000000000b2', 3, 'https://picsum.photos/seed/ff3/800/600', 'Luna followed the tiny light into the garden, where dozens more were waiting among the leaves.'),
  ('00000000-0000-0000-0000-0000000000b3', 1, 'https://picsum.photos/seed/sl1/800/600', 'The mountain wind howled as Kai tightened his scarf and took his first step onto the ice.'),
  ('00000000-0000-0000-0000-0000000000b3', 2, 'https://picsum.photos/seed/sl2/800/600', 'Two pale eyes watched from the ridge. A snow leopard, silent as falling snow, was following him.'),
  ('00000000-0000-0000-0000-0000000000b3', 3, 'https://picsum.photos/seed/sl3/800/600', 'By nightfall, Kai had stopped being afraid. Side by side, they walked on toward the sunrise.');

insert into story_categories (story_id, category_id)
select s.id, c.id from stories s, categories c where
  (s.slug = 'the-curious-little-fox' and c.slug in ('animals', 'adventure')) or
  (s.slug = 'luna-and-the-firefly' and c.slug in ('bedtime', 'fantasy')) or
  (s.slug = 'the-child-and-the-snow-leopard' and c.slug in ('adventure', 'animals', 'fantasy'));

insert into featured_slots (type, story_id, starts_at, ends_at) values
  ('week',  '00000000-0000-0000-0000-0000000000b2', date_trunc('week', now()),  date_trunc('week', now()) + interval '7 days'),
  ('month', '00000000-0000-0000-0000-0000000000b3', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month');
