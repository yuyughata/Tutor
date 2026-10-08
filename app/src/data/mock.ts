import type { Category, Story, StoryPage } from '../types';

const img = (seed: string, w = 800, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const categories: Category[] = [
  { slug: 'adventure', name: 'Adventure' },
  { slug: 'animals', name: 'Animals' },
  { slug: 'bedtime', name: 'Bedtime' },
  { slug: 'fantasy', name: 'Fantasy' },
];

const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();

export const stories: Story[] = [
  {
    id: 'b1', slug: 'the-curious-little-fox', title: 'The Curious Little Fox',
    synopsis: 'A little fox follows a trail of glowing berries deep into the forest.',
    coverUrl: img('fox', 600, 450), author: 'CUSTAR', ageBand: '2-4', isFree: true,
    pageCount: 3, readingMinutes: 2, publishedAt: ago(2), categories: ['animals', 'adventure'], reads30d: 41,
  },
  {
    id: 'b2', slug: 'luna-and-the-firefly', title: 'Luna and the Firefly',
    synopsis: 'Luna follows a tiny light through the garden and learns where fireflies go at dawn.',
    coverUrl: img('firefly', 600, 450), author: 'CUSTAR', ageBand: '5-8', isFree: true,
    pageCount: 3, readingMinutes: 4, publishedAt: ago(9), categories: ['bedtime', 'fantasy'], reads30d: 87,
  },
  {
    id: 'b3', slug: 'the-child-and-the-snow-leopard', title: 'The Child and the Snow Leopard',
    synopsis: 'A brave journey across frozen mountains to discover courage and friendship.',
    coverUrl: img('leopard', 600, 450), author: 'CUSTAR', ageBand: '9-12', isFree: false,
    pageCount: 3, readingMinutes: 6, publishedAt: ago(20), categories: ['adventure', 'animals', 'fantasy'], reads30d: 64,
  },
];

export const pages: Record<string, StoryPage[]> = {
  'the-curious-little-fox': [
    { position: 1, imageUrl: img('fox1'), text: 'Fox woke up and sniffed the air. Something smelled sweet.' },
    { position: 2, imageUrl: img('fox2'), text: 'A trail of glowing berries led past the old oak tree.' },
    { position: 3, imageUrl: img('fox3'), text: 'At the end of the trail, all his friends were waiting. Surprise!' },
  ],
  'luna-and-the-firefly': [
    { position: 1, imageUrl: img('ff1'), text: 'Late one evening, Luna sat by her window, watching the moon rise slowly above the trees.' },
    { position: 2, imageUrl: img('ff2'), text: 'Suddenly, a soft sparkle danced across her room. It was unlike anything she had ever seen: warm, bright, and gentle.' },
    { position: 3, imageUrl: img('ff3'), text: 'Luna followed the tiny light into the garden, where dozens more were waiting among the leaves.' },
  ],
  'the-child-and-the-snow-leopard': [
    { position: 1, imageUrl: img('sl1'), text: 'The mountain wind howled as Kai tightened his scarf and took his first step onto the ice.' },
    { position: 2, imageUrl: img('sl2'), text: 'Two pale eyes watched from the ridge. A snow leopard, silent as falling snow, was following him.' },
    { position: 3, imageUrl: img('sl3'), text: 'By nightfall, Kai had stopped being afraid. Side by side, they walked on toward the sunrise.' },
  ],
};

export const featured = { week: 'luna-and-the-firefly', month: 'the-child-and-the-snow-leopard' };
