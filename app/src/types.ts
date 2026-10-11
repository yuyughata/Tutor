export type ReadingLevel = 'sunrise' | 'spark' | 'seeker';

export type Category = { slug: string; name: string; icon?: string };

/** Offline illustration used by sample data and as a fallback while art loads. */
export type Art = { emoji: string; colors: [string, string]; extras?: string[] };

export type Story = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  coverUrl: string;
  art?: Art;
  author: string;
  level: ReadingLevel;
  isFree: boolean;
  pageCount: number;
  readingMinutes: number;
  publishedAt: string;
  categories: string[]; // category slugs
  /** The story's song (one MP3, optional). It unlocks on The End; `path` is the private storage path. */
  song?: { title: string; path: string; seconds?: number };
  reads30d: number;
  /** The book is split into chapters (a page with a chapter title starts one). */
  hasChapters?: boolean;
};

export type StoryPage = { position: number; imageUrl?: string; art?: Art; text: string; /** Set on the first page of a chapter. */ chapterTitle?: string };

/** A new word to explore in a story (1 for Spark stories, 3 for Seeker stories). */
export type StoryWord = { id: string; word: string; meaning: string; example?: string; /** Page position (1-based) where the word appears. */ page?: number };

/** A word a reader has explored, kept on the device. */
export type LearnedWord = { wordId: string; word: string; meaning: string; example?: string; storySlug: string; storyTitle: string; at: string };

export type HomeData = {
  week: Story | null;
  month: Story | null;
  popular: Story[];
  latest: Story[];
  categories: Category[];
};

export type ChildProfile = { id: string; name: string; avatar: string; level: ReadingLevel };

/** A song ready to play: `url` is a short-lived signed link, or a file on the device when the story is saved offline. */
export type SongSource = { title: string; url: string; seconds?: number };
