import type { LearnedWord, ReadingLevel, StoryPage } from '../types';

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
