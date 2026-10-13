-- 2026-10-13, second round: Investigation becomes "Discovery & Science"; add Media & Technology and Business;
-- keep Bedtime. Animals and Fantasy are retired (see the last statement).
update categories set slug = 'discovery-science', name = 'Discovery & Science', sort_order = 8 where slug = 'investigation';
insert into categories (slug, name, sort_order) values ('media-technology', 'Media & Technology', 11), ('business', 'Business', 12)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
update categories set sort_order = 13 where slug = 'bedtime';

-- Retire Animals and Fantasy (their story links go with them). Bedtime stays.
delete from categories where slug in ('animals', 'fantasy');
