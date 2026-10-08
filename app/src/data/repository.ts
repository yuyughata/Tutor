import { supabase } from '../lib/supabase';
import { load, save } from '../state/storage';
import { getSaved, listSaved } from './downloads';
import * as mock from './mock';
import type { ReadingLevel, HomeData, Story, StoryPage } from '../types';

// A reader sees stories at their level and the levels below it; harder levels are hidden.
const levelOrder: ReadingLevel[] = ['sunrise', 'spark', 'seeker'];
const inBand = (s: Story, band: ReadingLevel) => levelOrder.indexOf(s.level) <= levelOrder.indexOf(band);

// ---------- Supabase source ----------
type StoryRow = {
  id: string; slug: string; title: string; synopsis: string; cover_url: string | null;
  reading_level: ReadingLevel; is_free: boolean; page_count: number; reading_minutes: number; published_at: string;
  authors: { name: string } | null;
  story_categories: { categories: { slug: string } | null }[];
};

const STORY_SELECT =
  'id, slug, title, synopsis, cover_url, reading_level, is_free, page_count, reading_minutes, published_at,' +
  ' authors(name), story_categories(categories(slug))';

function toStory(r: StoryRow, reads: Map<string, number>): Story {
  return {
    id: r.id, slug: r.slug, title: r.title, synopsis: r.synopsis, coverUrl: r.cover_url ?? '',
    author: r.authors?.name ?? 'CUSTAR', level: r.reading_level, isFree: r.is_free,
    pageCount: r.page_count, readingMinutes: r.reading_minutes, publishedAt: r.published_at,
    categories: r.story_categories.flatMap((c) => (c.categories ? [c.categories.slug] : [])),
    reads30d: reads.get(r.id) ?? 0,
  };
}

const CACHE_STORIES = 'genova.cache.stories.v1';
const CACHE_HOME = 'genova.cache.home.v1';

/**
 * The catalogue, kept for offline use: a successful fetch refreshes the cache; if the network fails we fall back to
 * the last cached copy, then to stories saved for offline reading, and only then give up.
 */
async function remoteStories(): Promise<Story[]> {
  const cached = await load<Story[] | null>(CACHE_STORIES, null);
  const fresh = fetchStories().then((s) => { save(CACHE_STORIES, s); return s; });
  if (cached?.length) {
    // Cached catalogue on hand: never make the reader wait long on a slow or missing connection.
    // The refresh keeps running in the background and updates the cache for next time.
    return Promise.race([fresh.catch(() => cached), new Promise<Story[]>((resolve) => setTimeout(() => resolve(cached), 2500))]);
  }
  try {
    return await fresh;
  } catch (e) {
    const saved = listSaved().map((x) => x.story);
    if (saved.length) return saved;
    throw e;
  }
}

async function fetchStories(): Promise<Story[]> {
  const [{ data: rows, error }, { data: pop }] = await Promise.all([
    // Live = published or scheduled, and its publish time has arrived (RLS enforces the same rule for parents).
    supabase!.from('stories').select(STORY_SELECT)
      .in('status', ['published', 'scheduled'])
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
    supabase!.from('popular_stories').select('story_id, reads_30d'),
  ]);
  if (error) throw error;
  const reads = new Map((pop ?? []).map((p) => [p.story_id as string, p.reads_30d as number]));
  return (rows as unknown as StoryRow[]).map((r) => toStory(r, reads));
}

// ---------- public API ----------
export async function getStories(band: ReadingLevel): Promise<Story[]> {
  const all = supabase ? await remoteStories() : mock.stories;
  return all.filter((s) => inBand(s, band));
}

export async function getHome(band: ReadingLevel): Promise<HomeData> {
  const all = await getStories(band);
  let weekSlug: string | undefined = mock.featured.week;
  let monthSlug: string | undefined = mock.featured.month;
  let categories = mock.categories;

  if (supabase) {
    try {
      const now = new Date().toISOString();
      const [{ data: slots, error: e1 }, { data: cats, error: e2 }] = await Promise.all([
        supabase.from('featured_slots').select('type, stories(slug)').lte('starts_at', now).gt('ends_at', now),
        supabase.from('categories').select('slug, name').order('sort_order'),
      ]);
      if (e1 || e2) throw e1 ?? e2;
      const slugFor = (t: string) =>
        (slots ?? []).find((s) => s.type === t)?.stories as unknown as { slug: string } | undefined;
      weekSlug = slugFor('week')?.slug;
      monthSlug = slugFor('month')?.slug;
      const icons: Record<string, string> = Object.fromEntries(mock.categories.map((c) => [c.slug, c.icon ?? 'book']));
      categories = (cats ?? []).map((c) => ({ ...c, icon: icons[c.slug] ?? 'book' }));
      save(CACHE_HOME, { weekSlug, monthSlug, categories });
    } catch {
      // offline: reuse the last featured picks and categories
      const cached = await load<{ weekSlug?: string; monthSlug?: string; categories: typeof categories } | null>(CACHE_HOME, null);
      weekSlug = cached?.weekSlug; monthSlug = cached?.monthSlug; categories = cached?.categories ?? [];
    }
  }

  const bySlug = (slug?: string) => all.find((s) => s.slug === slug) ?? null;
  return {
    week: bySlug(weekSlug),
    month: bySlug(monthSlug),
    popular: [...all].sort((a, b) => b.reads30d - a.reads30d),
    latest: [...all].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    categories,
  };
}

export async function getStory(slug: string): Promise<Story | null> {
  const saved = getSaved(slug)?.story;
  try {
    const all = supabase ? await remoteStories() : mock.stories;
    return all.find((s) => s.slug === slug) ?? saved ?? null;
  } catch {
    return saved ?? null;
  }
}

/**
 * Pages are paywalled by RLS: a locked story returns [] for a non-subscriber.
 * A story saved for offline reading is read from the device (pass `fresh` to bypass that, e.g. when saving).
 * Throws when the network fails, so callers can tell "locked" from "offline".
 */
export async function getPages(story: Story, opts: { fresh?: boolean } = {}): Promise<StoryPage[]> {
  const saved = opts.fresh ? undefined : getSaved(story.slug);
  if (saved) return saved.pages;
  if (!supabase) {
    // Mirror the server rule in mock mode: only free stories are readable.
    return story.isFree ? mock.pages[story.slug] ?? [] : [];
  }
  const { data, error } = await supabase
    .from('story_pages')
    .select('position, image_url, text')
    .eq('story_id', story.id)
    .order('position');
  if (error) throw error;
  const rows = data ?? [];
  // Private bucket: image_url holds a storage path, served through short-lived signed URLs.
  const paths = rows.filter((p) => !/^https?:/.test(p.image_url)).map((p) => p.image_url as string);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from('pages').createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  return rows.map((p) => ({ position: p.position, imageUrl: signed.get(p.image_url) ?? p.image_url, text: p.text }));
}
