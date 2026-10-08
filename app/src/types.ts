export type AgeBand = '2-4' | '5-8' | '9-12';

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
  ageBand: AgeBand;
  isFree: boolean;
  pageCount: number;
  readingMinutes: number;
  publishedAt: string;
  categories: string[]; // category slugs
  reads30d: number;
};

export type StoryPage = { position: number; imageUrl?: string; art?: Art; text: string };

export type HomeData = {
  week: Story | null;
  month: Story | null;
  popular: Story[];
  latest: Story[];
  categories: Category[];
};

export type ChildProfile = { id: string; name: string; avatar: string; ageBand: AgeBand };
