import type { Art, Category, Story, StoryPage } from '../types';

// Sample catalogue that works fully offline: illustrations are drawn from `art`, not downloaded.
export const categories: Category[] = [
  { slug: 'adventure', name: 'Adventure', icon: 'compass' },
  { slug: 'animals', name: 'Animals', icon: 'paw' },
  { slug: 'bedtime', name: 'Bedtime', icon: 'moon' },
  { slug: 'fantasy', name: 'Fantasy', icon: 'sparkles' },
];

const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();

const arts: Record<string, Art> = {
  fox: { emoji: '🦊', colors: ['#ffbe00', '#ab46d2'], extras: ['🌲', '🍓', '✨'] },
  firefly: { emoji: '🌙', colors: ['#10a19c', '#3b1f5c'], extras: ['✨', '🌿', '🏡'] },
  leopard: { emoji: '🐆', colors: ['#ab46d2', '#232323'], extras: ['❄️', '🏔️', '⛰️'] },
  bear: { emoji: '🐻', colors: ['#10a19c', '#ffbe00'], extras: ['🌛', '⭐', '🍯'] },
  dragon: { emoji: '🐉', colors: ['#7a2e99', '#10a19c'], extras: ['🔥', '🏰', '☁️'] },
  boat: { emoji: '⛵', colors: ['#10a19c', '#ab46d2'], extras: ['🌊', '🐠', '☀️'] },
};

type Seed = Omit<Story, 'coverUrl' | 'author' | 'pageCount'> & { artKey: string };
const seeds: Seed[] = [
  { id: 'b1', slug: 'the-curious-little-fox', title: 'The Curious Little Fox', artKey: 'fox',
    synopsis: 'A little fox follows a trail of glowing berries deep into the forest.',
    ageBand: '2-4', isFree: true, readingMinutes: 2, publishedAt: ago(2), categories: ['animals', 'adventure'], reads30d: 41 },
  { id: 'b2', slug: 'luna-and-the-firefly', title: 'Luna and the Firefly', artKey: 'firefly',
    synopsis: 'Luna follows a tiny light through the garden and learns where fireflies go at dawn.',
    ageBand: '5-8', isFree: true, readingMinutes: 4, publishedAt: ago(9), categories: ['bedtime', 'fantasy'], reads30d: 87 },
  { id: 'b3', slug: 'the-child-and-the-snow-leopard', title: 'The Child and the Snow Leopard', artKey: 'leopard',
    synopsis: 'A brave journey across frozen mountains to discover courage and friendship.',
    ageBand: '9-12', isFree: false, readingMinutes: 6, publishedAt: ago(20), categories: ['adventure', 'animals', 'fantasy'], reads30d: 64 },
  { id: 'b4', slug: 'bedtime-for-bear', title: 'Bedtime for Bear', artKey: 'bear',
    synopsis: 'Bear has counted every star twice. Why is sleep so hard to find tonight?',
    ageBand: '2-4', isFree: true, readingMinutes: 2, publishedAt: ago(1), categories: ['bedtime', 'animals'], reads30d: 52 },
  { id: 'b5', slug: 'the-dragon-who-hated-fire', title: 'The Dragon Who Hated Fire', artKey: 'dragon',
    synopsis: 'Ember would rather bake cakes than burn castles. Can a gentle dragon change a kingdom?',
    ageBand: '5-8', isFree: false, readingMinutes: 5, publishedAt: ago(5), categories: ['fantasy', 'adventure'], reads30d: 73 },
  { id: 'b6', slug: 'captain-pip-and-the-paper-boat', title: 'Captain Pip and the Paper Boat', artKey: 'boat',
    synopsis: 'One paper boat, one big puddle, and an ocean of imagination.',
    ageBand: '5-8', isFree: false, readingMinutes: 4, publishedAt: ago(14), categories: ['adventure'], reads30d: 38 },
];

export const stories: Story[] = seeds.map(({ artKey, ...s }) => ({
  ...s, coverUrl: '', art: arts[artKey], author: 'CUSTAR', pageCount: 3,
}));

const scene = (artKey: string, emoji: string, extras: string[]): Art => ({ emoji, colors: arts[artKey].colors, extras });

export const pages: Record<string, StoryPage[]> = {
  'the-curious-little-fox': [
    { position: 1, art: scene('fox', '🦊', ['🌅', '🌲']), text: 'Fox woke up and sniffed the air. Something smelled sweet.' },
    { position: 2, art: scene('fox', '🍓', ['🌳', '✨', '🦊']), text: 'A trail of glowing berries led past the old oak tree.' },
    { position: 3, art: scene('fox', '🎉', ['🐰', '🦉', '🦊']), text: 'At the end of the trail, all his friends were waiting. Surprise!' },
  ],
  'luna-and-the-firefly': [
    { position: 1, art: scene('firefly', '🌙', ['🏡', '⭐']), text: 'Late one evening, Luna sat by her window, watching the moon rise slowly above the trees.' },
    { position: 2, art: scene('firefly', '✨', ['🧒', '🌙']), text: 'Suddenly, a soft sparkle danced across her room. It was unlike anything she had ever seen: warm, bright, and gentle.' },
    { position: 3, art: scene('firefly', '🌿', ['✨', '✨', '🧒']), text: 'Luna followed the tiny light into the garden, where dozens more were waiting among the leaves.' },
  ],
  'the-child-and-the-snow-leopard': [
    { position: 1, art: scene('leopard', '🏔️', ['❄️', '🧒']), text: 'The mountain wind howled as Kai tightened his scarf and took his first step onto the ice.' },
    { position: 2, art: scene('leopard', '🐆', ['❄️', '🌨️']), text: 'Two pale eyes watched from the ridge. A snow leopard, silent as falling snow, was following him.' },
    { position: 3, art: scene('leopard', '🌄', ['🐆', '🧒']), text: 'By nightfall, Kai had stopped being afraid. Side by side, they walked on toward the sunrise.' },
  ],
  'bedtime-for-bear': [
    { position: 1, art: scene('bear', '🐻', ['🌛', '⭐']), text: 'Bear yawned a great big yawn. But his eyes would not close.' },
    { position: 2, art: scene('bear', '🍯', ['🐝', '⭐']), text: 'He counted stars. One, two, three... he counted them twice!' },
    { position: 3, art: scene('bear', '😴', ['🌙', '💤']), text: 'Then Mama hummed a little song, and Bear fell fast asleep.' },
  ],
  'the-dragon-who-hated-fire': [
    { position: 1, art: scene('dragon', '🐉', ['🏰', '☁️']), text: 'Ember was a dragon with a secret. She did not like fire one little bit.' },
    { position: 2, art: scene('dragon', '🎂', ['🐉', '🔥']), text: 'Instead, she used her warm breath to bake the fluffiest cakes in the kingdom.' },
    { position: 3, art: scene('dragon', '👑', ['🏰', '🎉']), text: 'The king tasted one slice and declared Ember the royal baker. Hooray!' },
  ],
  'captain-pip-and-the-paper-boat': [
    { position: 1, art: scene('boat', '⛵', ['🌧️', '🌊']), text: 'After the rain, Pip found the biggest puddle he had ever seen.' },
    { position: 2, art: scene('boat', '🌊', ['⛵', '🐠']), text: 'He folded a paper boat, and in a blink, the puddle became an ocean.' },
    { position: 3, art: scene('boat', '🏝️', ['⛵', '☀️']), text: 'Captain Pip sailed to the farthest island and planted his flag. What an adventure!' },
  ],
};

export const featured = { week: 'luna-and-the-firefly', month: 'the-dragon-who-hated-fire' };
