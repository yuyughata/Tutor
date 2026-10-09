import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { badgeStates, type BadgeState, type Completion } from '../lib/badges';
import { getCategorySlugs } from '../data/repository';
import { statsFrom, type Stats } from '../lib/story';
import type { LearnedWord, Story, StoryWord } from '../types';
import { useAuth } from './auth';
import { load, save } from './storage';
import { useProfiles } from './profiles';

export type Progress = { page: number; finished: boolean };
type Data = {
  favorites: Record<string, string[]>; // childId -> story slugs
  progress: Record<string, Record<string, Progress>>; // childId -> slug -> progress
  completions: Record<string, Completion[]>; // childId -> every time a story was finished (feeds week / month / all-time counts)
  words: Record<string, LearnedWord[]>; // childId -> words explored
  badgesSeen: Record<string, string[]>; // childId -> badge ids already celebrated
};
const EMPTY: Data = { favorites: {}, progress: {}, completions: {}, words: {}, badgesSeen: {} };

/** A reward the Genova team has given this reader. */
export type Award = { kind: 'week' | 'month' | 'all_time' | 'custom'; periodLabel: string; stories: number | null; note: string | null; at: string };

type Ctx = {
  favorites: string[];
  progress: Record<string, Progress>;
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (story: Story) => void;
  saveProgress: (story: Story, page: number, finished: boolean) => void;
  trackStart: (story: Story) => void;
  /** Different stories this reader finished this week / this month / ever (device time). */
  stats: Stats;
  learnedWords: LearnedWord[];
  hasLearned: (wordId: string) => boolean;
  learnWord: (story: Story, word: StoryWord) => void;
  awards: Award[];
  /** Every milestone badge with whether it is earned (worked out on the device). */
  badges: BadgeState[];
  badgesSeen: string[];
  markBadgesSeen: (ids: string[]) => void;
};

const KEY = 'genova.library.v1';
const LibraryContext = createContext<Ctx | null>(null);

// Local-first favourites and reading progress per child, mirrored to Supabase when the
// story has a real (uuid) id, i.e. when the catalogue comes from the backend.
export function LibraryProvider({ children }: { children: ReactNode }) {
  const { active } = useProfiles();
  const [data, setData] = useState<Data>(EMPTY);
  const { session } = useAuth();
  const [awards, setAwards] = useState<Award[]>([]);
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    load<Data>(KEY, EMPTY).then((d) => setData({ ...EMPTY, ...d }));
  }, []);

  const commit = useCallback((next: Data) => {
    setData(next);
    save(KEY, next);
  }, []);

  const childId = active?.id;
  const synced = (story: Story) => !!supabase && /^[0-9a-f-]{36}$/i.test(story.id) && !!childId;

  // The category list (from the saved copy) is only needed for the "Explorer" badge.
  const doneCount = (data.completions[active?.id ?? ''] ?? []).length;
  useEffect(() => { getCategorySlugs().then(setCategorySlugs).catch(() => {}); }, [childId, doneCount]);

  // Rewards given by the team are read from the account, so they show on every device (and refresh when the app comes back).
  useEffect(() => {
    setAwards([]);
    if (!supabase || !session || !childId) return;
    const fetchAwards = () => supabase!.from('reader_awards').select('kind, period_label, stories, note, created_at').eq('child_id', childId).order('created_at', { ascending: false })
      .then(({ data: rows }) => { if (rows) setAwards(rows.map((r) => ({ kind: r.kind, periodLabel: r.period_label, stories: r.stories, note: r.note, at: r.created_at }))); });
    fetchAwards();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') fetchAwards(); });
    return () => sub.remove();
  }, [session, childId]);

  const value = useMemo<Ctx>(() => {
    const favorites = (childId && data.favorites[childId]) || [];
    const progress = (childId && data.progress[childId]) || {};
    const completions = (childId && data.completions[childId]) || [];
    const learnedWords = (childId && data.words[childId]) || [];
    // Stories finished before completions were recorded still count toward "all time".
    const finishedBefore = Object.entries(progress).filter(([, p]) => p.finished).map(([slug]) => slug);
    const stats = statsFrom(completions);
    stats.all = new Set([...completions.map((c) => c.slug), ...finishedBefore]).size;
    const badges = badgeStates({ storiesFinished: stats.all, completions, wordsLearned: learnedWords.length, categorySlugs });
    const badgesSeen = (childId && data.badgesSeen[childId]) || [];
    return {
      favorites,
      progress,
      stats,
      badges,
      badgesSeen,
      markBadgesSeen: (ids) => {
        if (!childId || !ids.length) return;
        const cur = ref.current.badgesSeen[childId] ?? [];
        const next = [...cur, ...ids.filter((i) => !cur.includes(i))];
        if (next.length !== cur.length) commit({ ...ref.current, badgesSeen: { ...ref.current.badgesSeen, [childId]: next } });
      },
      learnedWords,
      awards,
      hasLearned: (wordId) => learnedWords.some((w) => w.wordId === wordId),
      learnWord: (story, word) => {
        if (!childId || learnedWords.some((w) => w.wordId === word.id)) return;
        const entry: LearnedWord = { wordId: word.id, word: word.word, meaning: word.meaning, example: word.example, storySlug: story.slug, storyTitle: story.title, at: new Date().toISOString() };
        commit({ ...ref.current, words: { ...ref.current.words, [childId]: [entry, ...learnedWords] } });
        if (synced(story) && /^[0-9a-f-]{36}$/i.test(word.id)) supabase!.from('child_words').upsert({ child_id: childId, word_id: word.id }).then(() => {});
      },
      isFavorite: (slug) => favorites.includes(slug),
      toggleFavorite: (story) => {
        if (!childId) return;
        const cur = ref.current.favorites[childId] ?? [];
        const on = !cur.includes(story.slug);
        commit({ ...ref.current, favorites: { ...ref.current.favorites, [childId]: on ? [...cur, story.slug] : cur.filter((s) => s !== story.slug) } });
        if (synced(story)) {
          if (on) supabase!.from('favorites').upsert({ child_id: childId, story_id: story.id }).then(() => {});
          else supabase!.from('favorites').delete().match({ child_id: childId, story_id: story.id }).then(() => {});
        }
      },
      saveProgress: (story, page, finished) => {
        if (!childId) return;
        const cur = ref.current.progress[childId] ?? {};
        const prev = cur[story.slug];
        const next: Progress = { page, finished: finished || !!prev?.finished };
        // Reaching The End records a completion; reading the same story again on the same day is not counted twice.
        const done = ref.current.completions[childId] ?? [];
        const today = new Date().toDateString();
        const completions = finished && !done.some((c) => c.slug === story.slug && new Date(c.at).toDateString() === today)
          ? [...done, { slug: story.slug, at: new Date().toISOString(), chapters: !!story.hasChapters, cats: story.categories }] : done;
        commit({ ...ref.current, progress: { ...ref.current.progress, [childId]: { ...cur, [story.slug]: next } }, completions: { ...ref.current.completions, [childId]: completions } });
        if (finished && completions !== done && synced(story)) {
          supabase!.from('story_completions').upsert({ child_id: childId, story_id: story.id }, { onConflict: 'child_id,story_id,completed_day', ignoreDuplicates: true }).then(() => {});
        }
        if (synced(story)) {
          supabase!.from('reading_progress').upsert({
            child_id: childId, story_id: story.id, last_page: page,
            finished_at: next.finished ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
          }).then(() => {});
        }
      },
      trackStart: (story) => {
        // First-party, anonymous "reads" count that feeds the Popular shelf.
        if (synced(story)) supabase!.from('read_events').insert({ child_id: childId, story_id: story.id }).then(() => {});
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, childId, commit, awards, categorySlugs]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
