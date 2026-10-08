import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Story } from '../types';
import { load, save } from './storage';
import { useProfiles } from './profiles';

export type Progress = { page: number; finished: boolean };
type Data = {
  favorites: Record<string, string[]>; // childId -> story slugs
  progress: Record<string, Record<string, Progress>>; // childId -> slug -> progress
};

type Ctx = {
  favorites: string[];
  progress: Record<string, Progress>;
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (story: Story) => void;
  saveProgress: (story: Story, page: number, finished: boolean) => void;
  trackStart: (story: Story) => void;
};

const KEY = 'genova.library.v1';
const LibraryContext = createContext<Ctx | null>(null);

// Local-first favourites and reading progress per child, mirrored to Supabase when the
// story has a real (uuid) id, i.e. when the catalogue comes from the backend.
export function LibraryProvider({ children }: { children: ReactNode }) {
  const { active } = useProfiles();
  const [data, setData] = useState<Data>({ favorites: {}, progress: {} });
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    load<Data>(KEY, { favorites: {}, progress: {} }).then(setData);
  }, []);

  const commit = useCallback((next: Data) => {
    setData(next);
    save(KEY, next);
  }, []);

  const childId = active?.id;
  const synced = (story: Story) => !!supabase && /^[0-9a-f-]{36}$/i.test(story.id) && !!childId;

  const value = useMemo<Ctx>(() => {
    const favorites = (childId && data.favorites[childId]) || [];
    const progress = (childId && data.progress[childId]) || {};
    return {
      favorites,
      progress,
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
        commit({ ...ref.current, progress: { ...ref.current.progress, [childId]: { ...cur, [story.slug]: next } } });
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
  }, [data, childId, commit]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
