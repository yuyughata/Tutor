import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { load, save } from '../state/storage';
import type { Art, Story, StoryPage, StoryWord } from '../types';

/**
 * Stories saved for offline reading. Text and story details are kept in app storage; on iOS and Android the
 * pictures are copied into the app's document folder too (the web build keeps their URLs, so it needs a connection
 * for pictures). Saved premium stories are only readable while the account still has access.
 */
export type SavedStory = {
  story: Story;
  savedAt: string;
  bytes: number;
  imagesOffline: boolean;
  coverLocal?: string;
  pages: StoryPage[]; // imageUrl points at a local file when imagesOffline
  words?: StoryWord[]; // the word explorer words, so they work offline
};

const KEY = 'genova.downloads.v1';
let state: Record<string, SavedStory> = {};
let busy: Record<string, number> = {}; // slug -> 0..1 progress while saving
let ready = false;
const listeners = new Set<() => void>();
const emit = () => { snapshot = { saved: state, busy }; listeners.forEach((l) => l()); };
let snapshot = { saved: state, busy };

export async function initDownloads() {
  if (ready) return;
  state = await load<Record<string, SavedStory>>(KEY, {});
  ready = true;
  emit();
}
const persist = () => save(KEY, state);

const native = Platform.OS !== 'web';
const extOf = (url: string) => (url.split('?')[0].split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'jpg';

async function fetchTo(dir: Directory, name: string, url: string): Promise<{ uri: string; bytes: number } | null> {
  if (!/^https?:/.test(url)) return null; // sample art and data URLs are already on the device
  try {
    const file = await File.downloadFileAsync(url, new File(dir, name), { idempotent: true });
    return { uri: file.uri, bytes: file.size ?? 0 };
  } catch { return null; }
}

/** Save a story for offline reading. `pages` must already be loaded (the caller checked access). */
export async function saveStory(story: Story, pages: StoryPage[], words: StoryWord[] = []): Promise<void> {
  busy = { ...busy, [story.slug]: 0 }; emit();
  let bytes = JSON.stringify(pages).length + JSON.stringify(words).length;
  let coverLocal: string | undefined;
  let outPages = pages;
  let imagesOffline = false;
  try {
    if (native) {
      const dir = new Directory(Paths.document, 'genova', story.slug);
      dir.create({ intermediates: true, idempotent: true });
      const total = pages.length + 1;
      let done = 0;
      const cover = story.coverUrl ? await fetchTo(dir, `cover.${extOf(story.coverUrl)}`, story.coverUrl) : null;
      if (cover) { coverLocal = cover.uri; bytes += cover.bytes; }
      busy = { ...busy, [story.slug]: ++done / total }; emit();
      outPages = [];
      for (const p of pages) {
        let imageUrl = p.imageUrl;
        if (p.imageUrl) {
          const got = await fetchTo(dir, `${p.position}.${extOf(p.imageUrl)}`, p.imageUrl);
          if (got) { imageUrl = got.uri; bytes += got.bytes; imagesOffline = true; }
        }
        outPages.push({ ...p, imageUrl });
        busy = { ...busy, [story.slug]: ++done / total }; emit();
      }
      if (!pages.some((p) => p.imageUrl)) imagesOffline = true; // sample art is drawn on the device
    }
    state = { ...state, [story.slug]: { story, savedAt: new Date().toISOString(), bytes, imagesOffline: native ? imagesOffline : false, coverLocal, pages: outPages, words } };
    persist();
  } finally {
    const { [story.slug]: _gone, ...rest } = busy; busy = rest; emit();
  }
}

export function removeStory(slug: string) {
  if (native) { try { new Directory(Paths.document, 'genova', slug).delete(); } catch { /* already gone */ } }
  const { [slug]: _gone, ...rest } = state;
  state = rest; persist(); emit();
}

export function removeAll() {
  for (const slug of Object.keys(state)) removeStory(slug);
}

export const getSaved = (slug: string): SavedStory | undefined => state[slug];
export const listSaved = (): SavedStory[] => Object.values(state).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
export const totalBytes = () => Object.values(state).reduce((n, s) => n + s.bytes, 0);
export const artOf = (p: StoryPage): Art | undefined => p.art;

export function useDownloads() {
  const snap = useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => snapshot, () => snapshot);
  return {
    saved: snap.saved,
    busy: snap.busy,
    isSaved: (slug: string) => !!snap.saved[slug],
    progress: (slug: string) => snap.busy[slug],
    list: Object.values(snap.saved).sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    bytes: Object.values(snap.saved).reduce((n, s) => n + s.bytes, 0),
  };
}

export const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
