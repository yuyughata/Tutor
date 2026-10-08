import { supabase } from '../lib/supabase';
import * as mock from './mock';
import type { AgeBand, HomeData, Story, StoryPage } from '../types';

// Younger children may read down the band ladder; older bands are hidden.
const bandOrder: AgeBand[] = ['2-4', '5-8', '9-12'];
const inBand = (s: Story, band: AgeBand) => bandOrder.indexOf(s.ageBand) <= bandOrder.indexOf(band);

// ---------- Supabase source ----------
type StoryRow = {
  id: string; slug: string; title: string; synopsis: string; cover_url: string | null;
  age_band: AgeBand; is_free: boolean; page_count: number; reading_minutes: number; published_at: string;
  authors: { name: string } | null;
  story_categories: { categories: { slug: string } | null }[];
};

const STORY_SELECT =
  'id, slug, title, synopsis, cover_url, age_band, is_free, page_count, reading_minutes, published_at,' +
  ' authors(name), story_categories(categories(slug))';

function toStory(r: StoryRow, reads: Map<string, number>): Story {
  return {
    id: r.id, slug: r.slug, title: r.title, synopsis: r.synopsis, coverUrl: r.cover_url ?? '',
    author: r.authors?.name ?? 'CUSTAR', ageBand: r.age_band, isFree: r.is_free,
    pageCount: r.page_count, readingMinutes: r.reading_minutes, publishedAt: r.published_at,
    categories: r.story_categories.flatMap((c) => (c.categories ? [c.categories.slug] : [])),
    reads30d: reads.get(r.id) ?? 0,
  };
}

async function remoteStories(): Promise<Story[]> {
  const [{ data: rows, error }, { data: pop }] = await Promise.all([
    supabase!.from('stories').select(STORY_SELECT).eq('status', 'published').order('published_at', { ascending: false }),
    supabase!.from('popular_stories').select('story_id, reads_30d'),
  ]);
  if (error) throw error;
  const reads = new Map((pop ?? []).map((p) => [p.story_id as string, p.reads_30d as number]));
  return (rows as unknown as StoryRow[]).map((r) => toStory(r, reads));
}

// ---------- public API ----------
export async function getStories(band: AgeBand): Promise<Story[]> {
  const all = supabase ? await remoteStories() : mock.stories;
  return all.filter((s) => inBand(s, band));
}

export async function getHome(band: AgeBand): Promise<HomeData> {
  const all = await getStories(band);
  let weekSlug: string | undefined = mock.featured.week;
  let monthSlug: string | undefined = mock.featured.month;
  let categories = mock.categories;

  if (supabase) {
    const now = new Date().toISOString();
    const [{ data: slots }, { data: cats }] = await Promise.all([
      supabase.from('featured_slots').select('type, stories(slug)').lte('starts_at', now).gt('ends_at', now),
      supabase.from('categories').select('slug, name').order('sort_order'),
    ]);
    const slugFor = (t: string) =>
      (slots ?? []).find((s) => s.type === t)?.stories as unknown as { slug: string } | undefined;
    weekSlug = slugFor('week')?.slug;
    monthSlug = slugFor('month')?.slug;
    categories = cats ?? [];
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
  const { data } = supabase
    ? { data: (await remoteStories()).find((s) => s.slug === slug) ?? null }
    : { data: mock.stories.find((s) => s.slug === slug) ?? null };
  return data;
}

/** Pages are paywalled by RLS: a locked story returns [] for a non-subscriber. */
export async function getPages(story: Story): Promise<StoryPage[]> {
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
  return (data ?? []).map((p) => ({ position: p.position, imageUrl: p.image_url, text: p.text }));
}
