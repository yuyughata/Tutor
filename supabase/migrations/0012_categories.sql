-- Category list updated 2026-10-13: Adventure, Family & Friendship, Character & Growth, Nature, Emotional,
-- Culture & History, Faith, Investigation, Health & Wellbeing, Sports.
insert into categories (slug, name, sort_order) values
  ('adventure', 'Adventure', 1), ('family-friendship', 'Family & Friendship', 2), ('character-growth', 'Character & Growth', 3),
  ('nature', 'Nature', 4), ('emotional', 'Emotional', 5), ('culture-history', 'Culture & History', 6), ('faith', 'Faith', 7),
  ('investigation', 'Investigation', 8), ('health-wellbeing', 'Health & Wellbeing', 9), ('sports', 'Sports', 10)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

-- Demo stories moved to the new categories (matched by title).
insert into story_categories (story_id, category_id)
select s.id, c.id from (values
  ('Kemi and the Slow Seed','nature'),('Kemi and the Slow Seed','character-growth'),
  ('Luna and the Firefly','nature'),('Luna and the Firefly','adventure'),
  ('The Child and the Snow Leopard','adventure'),('The Child and the Snow Leopard','nature'),
  ('The Curious Little Fox','adventure'),('The Curious Little Fox','nature'),
  ('The Lighthouse Keeper''s Secret','adventure'),('The Lighthouse Keeper''s Secret','investigation'),
  ('The River That Forgot Its Song','nature'),('The River That Forgot Its Song','emotional'),
  ('Tobi and the Rainy Day Drum','adventure'),('Tobi and the Rainy Day Drum','character-growth')
) v(title, slug) join stories s on s.title = v.title join categories c on c.slug = v.slug
on conflict do nothing;

-- Retire the old categories (their story links go with them).
delete from categories where slug in ('animals', 'bedtime', 'fantasy');
