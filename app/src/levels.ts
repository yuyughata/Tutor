import type { ReadingLevel } from './types';

// Reading levels replace age groups everywhere a user can see. Ages are never shown.
export const LEVELS: { id: ReadingLevel; name: string; descriptor: string; emoji: string }[] = [
  { id: 'sunrise', name: 'Sunrise', descriptor: 'Assisted Reader', emoji: '🌅' },
  { id: 'spark', name: 'Spark', descriptor: 'Emergent Reader', emoji: '✨' },
  { id: 'seeker', name: 'Seeker', descriptor: 'Developing Reader', emoji: '🔭' },
];

export const DEFAULT_LEVEL: ReadingLevel = 'spark';
export const levelOf = (id: ReadingLevel) => LEVELS.find((l) => l.id === id) ?? LEVELS[1];
/** "Spark" */
export const levelName = (id: ReadingLevel) => levelOf(id).name;
/** "Spark · Emergent Reader" */
export const levelFull = (id: ReadingLevel) => `${levelOf(id).name} · ${levelOf(id).descriptor}`;
