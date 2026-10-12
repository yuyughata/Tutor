import type { LearnedWord, ReadingLevel, Story, StoryPage } from '../types';

// Pure helpers for chapters, the word explorer and reading stats (no React Native imports, so they are unit tested in Node).

export type Chapter = { index: number; title: string; /** 0-based index of the chapter's first page */ firstPage: number };

/** Chapters of a book: every page with a chapter title starts a new one. */
export function chaptersOf(pages: Pick<StoryPage, 'chapterTitle'>[]): Chapter[] {
  const out: Chapter[] = [];
  pages.forEach((p, i) => { if (p.chapterTitle?.trim()) out.push({ index: out.length + 1, title: p.chapterTitle.trim(), firstPage: i }); });
  return out;
}

/** The chapter a page belongs to (the last chapter that started on or before it). */
export function chapterAt(chapters: Chapter[], pageIndex: number): Chapter | undefined {
  let found: Chapter | undefined;
  for (const c of chapters) if (c.firstPage <= pageIndex) found = c;
  return found;
}

/** How many explorer words a story at this level has: Spark 1, Seeker 3, Sunrise none. */
export const wordsAllowed = (level: ReadingLevel): number => (level === 'spark' ? 1 : level === 'seeker' ? 3 : 0);

export type Segment = { text: string; match: boolean };
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Split text so every whole-word occurrence of `word` (any case, optional plural "s") is its own matching segment. */
export function splitByWord(text: string, word: string): Segment[] {
  const w = word.trim();
  if (!w) return [{ text, match: false }];
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escapeRe(w)}s?)(?![\\p{L}\\p{N}])`, 'giu');
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), match: false });
    out.push({ text: m[0], match: true });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out.length ? out : [{ text, match: false }];
}

export type WordSegment = { text: string; wordId?: string };

/** Like splitByWord for several explorer words at once; matching segments carry the id of their word. */
export function splitByWords(text: string, words: { id: string; word: string }[]): WordSegment[] {
  let segs: WordSegment[] = [{ text }];
  for (const w of words) {
    segs = segs.flatMap((seg) => (seg.wordId ? [seg] : splitByWord(seg.text, w.word).map((x) => (x.match ? { text: x.text, wordId: w.id } : { text: x.text }))));
  }
  return segs;
}

/** Index of the page where the word shows: the page it is assigned to, else the first page that contains it. */
export function wordPageIndex(pages: Pick<StoryPage, 'position' | 'text'>[], word: string, assigned?: number): number {
  if (assigned) { const i = pages.findIndex((p) => p.position === assigned); if (i >= 0) return i; }
  return pages.findIndex((p) => splitByWord(p.text, word).some((s) => s.match));
}

export type Stats = { week: number; month: number; all: number };

/** Monday 00:00 of the week that contains `now` (device time). */
export function weekStart(now: Date): Date {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
export const monthStart = (now: Date): Date => new Date(now.getFullYear(), now.getMonth(), 1);

/** Different stories finished this week, this month and ever. Reading one story twice only counts once per period. */
export function statsFrom(completions: { slug: string; at: string }[], now = new Date()): Stats {
  const w = weekStart(now).getTime(), m = monthStart(now).getTime();
  const uniq = (from: number) => new Set(completions.filter((c) => new Date(c.at).getTime() >= from).map((c) => c.slug)).size;
  return { week: uniq(w), month: uniq(m), all: uniq(-Infinity) };
}

export const wordKey = (w: Pick<LearnedWord, 'wordId'>) => w.wordId;

/**
 * The gentle hint shown on a page while reading a story that has a song. Only a few pages carry one so it stays a
 * treat and not a nag: the first page, the middle of a longer story, and the last page. Returns null elsewhere.
 */
export function songHint(pageIndex: number, pageCount: number): string | null {
  if (pageCount < 1 || pageIndex < 0 || pageIndex >= pageCount) return null;
  if (pageIndex === 0) return 'A little song is waiting for you at the end';
  if (pageIndex === pageCount - 1) return 'Last page! Turn it to unlock your song';
  if (pageCount >= 5 && pageIndex === Math.floor((pageCount - 1) / 2)) return 'Halfway there! Keep reading to unlock your song';
  return null;
}

/** 75 -> "1:15" (never negative or NaN). */
export function clock(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export type BrowseRow = { slug: string; name: string; icon?: string; stories: Story[] };
export const OTHER_ROW = '_other';
export const SHELF_LIMIT = 10; // the "Popular" and "New" shelves show the first 10; everything lives in the browse rows below

/**
 * The "Browse all stories" rows: one row per category holding EVERY story in it (old and new, newest first), in the
 * categories' own order. A story in two categories shows in both. Stories with no category go in a last "More stories" row.
 * With `selected` set, only that category's row is returned (an empty array when it has no stories).
 */
export function browseRows(stories: Story[], categories: { slug: string; name: string; icon?: string }[], selected: string | null = null): BrowseRow[] {
  const newest = [...stories].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const known = new Set(categories.map((c) => c.slug));
  const rows: BrowseRow[] = categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, stories: newest.filter((s) => s.categories.includes(c.slug)) }));
  const loose = newest.filter((s) => !s.categories.some((c) => known.has(c)));
  if (loose.length) rows.push({ slug: OTHER_ROW, name: 'More stories', stories: loose });
  return rows.filter((r) => r.stories.length && (selected === null || r.slug === selected));
}
