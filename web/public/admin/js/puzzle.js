// Helpers for the word hunt words card in the story editor (plain JS, tested in web/tests/admin/puzzle.test.mjs).
// The app builds a different word search from these words on every attempt (see app/src/lib/puzzle.ts).

export const MAX_PUZZLE_WORDS = 8;

/** "Fire-fly!" -> "FIREFLY". Letters A to Z only; returns "" when shorter than 3 or longer than 10 letters. */
export function normalizePuzzleWord(w) {
  const s = String(w || '').toUpperCase().replace(/[^A-Z]/g, '');
  return s.length >= 3 && s.length <= 10 ? s : '';
}

const STOP = new Set('about after again against along because before behind being below between could every first found from have into just little more most other over said some than that their them then there these they this those through under very want were what when where which while with without would your'.split(' '));

/**
 * Suggest up to `limit` words from a story: names (capitalised words that do not start a sentence), then the
 * Word Explorer words, then the longest words that repeat. Characters, key words and events tend to come out first.
 */
export function suggestPuzzleWords(texts, extra = [], limit = MAX_PUZZLE_WORDS) {
  const lower = new Set();                  // words seen in lower case: those are ordinary words, not names
  const caps = new Map();                   // capitalised words: { total, midSentence }
  const common = new Map();
  for (const t of texts) {
    for (const m of String(t).matchAll(/[A-Za-z][A-Za-z'’-]*/g)) {
      const raw = m[0];
      const w = normalizePuzzleWord(raw.replace(/['’]s$/i, ''));
      if (!w || STOP.has(w.toLowerCase())) continue;
      const before = String(t).slice(0, m.index).trimEnd();
      const startOfSentence = before === '' || /[.!?]["”’']?$/.test(before);
      if (/^[A-Z]/.test(raw)) { const c = caps.get(w) || { total: 0, mid: 0 }; c.total++; if (!startOfSentence) c.mid++; caps.set(w, c); }
      else { lower.add(w); if (w.length >= 5) common.set(w, (common.get(w) || 0) + 1); }
    }
  }
  // a name is capitalised everywhere, and either shows up mid-sentence or is repeated
  const names = [...caps.entries()].filter(([w, c]) => !lower.has(w) && (c.mid > 0 || c.total > 1)).sort((a, b) => b[1].total - a[1].total || b[0].length - a[0].length).map(([w]) => w);
  const rank = [...common.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([w]) => w);
  const out = [];
  for (const w of [...names, ...extra.map(normalizePuzzleWord), ...rank]) if (w && !out.includes(w)) out.push(w);
  return out.slice(0, limit);
}
