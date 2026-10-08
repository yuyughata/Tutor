// Reading levels replace age bands everywhere a person can see. Nothing here ever shows a child's age.
export const LEVELS = [
  { id: 'sunrise', name: 'Sunrise', descriptor: 'Assisted Reader', emoji: '🌅', blurb: 'Big pictures, a sentence or two a page, made for reading together.' },
  { id: 'spark', name: 'Spark', descriptor: 'Emergent Reader', emoji: '✨', blurb: 'Short pages and friendly words for children finding their feet.' },
  { id: 'seeker', name: 'Seeker', descriptor: 'Developing Reader', emoji: '🔭', blurb: 'Longer, richer stories for confident readers who want more.' },
] as const;
