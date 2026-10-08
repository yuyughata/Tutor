// Design tokens, taken from the reference: soft mint/lavender gradients, rounded cards.
export const colors = {
  bg: '#F6FAF3',
  surface: '#FFFFFF',
  ink: '#1F2A37',
  muted: '#6B7280',
  primary: '#2DD4BF',
  primaryDark: '#0F766E',
  accent: '#A78BFA',
  gradient: ['#C7F0DB', '#E4E3FB', '#FDF1D8'] as const,
  lock: '#9CA3AF',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// Reader type scale per age band (younger children get larger type).
export const readerFontBase = { '2-4': 28, '5-8': 22, '9-12': 18 } as const;
