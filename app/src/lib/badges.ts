// Pure helpers for milestone badges, the weekly goal and the word garden. No React Native imports, so they are unit tested in Node.
// Everything is worked out on the device from data the app already keeps; nothing is fetched or downloaded.

/** One finished story. `chapters` and `cats` are copied from the story at the time, so badges need no catalogue lookup. */
export type Completion = { slug: string; at: string; chapters?: boolean; cats?: string[] };

export type BadgeId = 'stories-1' | 'stories-5' | 'stories-10' | 'stories-25' | 'stories-50' | 'chapter-book' | 'word-1' | 'word-10' | 'all-categories';
export type BadgeDef = { id: BadgeId; emoji: string; title: string; hint: string };

export const BADGES: BadgeDef[] = [
  { id: 'stories-1', emoji: '🌟', title: 'First story', hint: 'Finish your first story' },
  { id: 'stories-5', emoji: '📚', title: '5 stories', hint: 'Finish 5 different stories' },
  { id: 'stories-10', emoji: '🏅', title: '10 stories', hint: 'Finish 10 different stories' },
  { id: 'stories-25', emoji: '🏆', title: '25 stories', hint: 'Finish 25 different stories' },
  { id: 'stories-50', emoji: '👑', title: '50 stories', hint: 'Finish 50 different stories' },
  { id: 'chapter-book', emoji: '📖', title: 'Chapter reader', hint: 'Finish a book with chapters' },
  { id: 'word-1', emoji: '🔍', title: 'Word finder', hint: 'Learn your first new word' },
  { id: 'word-10', emoji: '🧠', title: 'Word wizard', hint: 'Learn 10 new words' },
  { id: 'all-categories', emoji: '🧭', title: 'Explorer', hint: 'Finish a story in every category' },
];

export type BadgeInput = {
  /** Different stories finished, ever (includes stories finished before completions were recorded). */
  storiesFinished: number;
  completions: Completion[];
  wordsLearned: number;
  /** Slugs of every category in the library; empty when unknown, which keeps "Explorer" locked. */
  categorySlugs: string[];
};

export type BadgeState = BadgeDef & { earned: boolean };

/** Every badge with whether it has been earned. */
export function badgeStates(i: BadgeInput): BadgeState[] {
  const covered = new Set(i.completions.flatMap((c) => c.cats ?? []));
  const earned: Record<BadgeId, boolean> = {
    'stories-1': i.storiesFinished >= 1,
    'stories-5': i.storiesFinished >= 5,
    'stories-10': i.storiesFinished >= 10,
    'stories-25': i.storiesFinished >= 25,
    'stories-50': i.storiesFinished >= 50,
    'chapter-book': i.completions.some((c) => c.chapters),
    'word-1': i.wordsLearned >= 1,
    'word-10': i.wordsLearned >= 10,
    'all-categories': i.categorySlugs.length > 0 && i.categorySlugs.every((s) => covered.has(s)),
  };
  return BADGES.map((b) => ({ ...b, earned: earned[b.id] }));
}

/** Earned badges the reader has not been shown yet. */
export const unseenBadges = (states: BadgeState[], seen: string[]): BadgeState[] => states.filter((b) => b.earned && !seen.includes(b.id));

/** Stories to finish in a week. The goal never carries over and a missed week costs nothing. */
export const WEEKLY_GOAL = 3;

export function goalProgress(week: number, goal = WEEKLY_GOAL) {
  const pct = goal > 0 ? Math.min(1, week / goal) : 0;
  return { count: week, goal, pct, reached: week >= goal, left: Math.max(0, goal - week) };
}

export type GardenStage = { min: number; emoji: string; name: string };
export const GARDEN: GardenStage[] = [
  { min: 0, emoji: '🌰', name: 'A seed' },
  { min: 1, emoji: '🌱', name: 'A sprout' },
  { min: 3, emoji: '🌿', name: 'A leafy plant' },
  { min: 6, emoji: '🪴', name: 'A potted plant' },
  { min: 10, emoji: '🌷', name: 'A flower' },
  { min: 20, emoji: '🌻', name: 'A sunflower' },
  { min: 40, emoji: '🌳', name: 'A tall tree' },
];

/** The plant for a number of learned words, and how many more words until it grows. */
export function gardenFor(words: number) {
  let idx = 0;
  GARDEN.forEach((g, i) => { if (words >= g.min) idx = i; });
  const next = GARDEN[idx + 1];
  return { stage: GARDEN[idx], next: next ?? null, toNext: next ? next.min - words : 0, pct: next ? (words - GARDEN[idx].min) / (next.min - GARDEN[idx].min) : 1 };
}
