// The word hunt (word search) played after a story. Pure functions, no React Native imports, so they are unit tested in Node.
// Every attempt is a new puzzle: words are re-picked (when the story has more than needed), re-placed and the
// empty squares re-filled, so the grid never looks the same twice.

export type PuzzleLevel = 'spark' | 'seeker';
export type Cell = { r: number; c: number };
export type Placement = { word: string; cells: Cell[] };
export type Puzzle = { level: PuzzleLevel; size: number; grid: string[][]; placements: Placement[] };
export type Rng = () => number;

type Dir = [number, number];
const RIGHT: Dir = [0, 1], DOWN: Dir = [1, 0], DOWN_RIGHT: Dir = [1, 1];
/** Words are always spelled FORWARDS, the way a child reads: left to right, top to bottom, or diagonally down to the right. Never backwards. */
const FORWARD: Dir[] = [RIGHT, DOWN, DOWN_RIGHT];

/** Spark (Emergent Reader): a small grid, 4 words, only left-to-right and top-to-bottom.
 *  Seeker (Developing Reader): a bigger grid, 6 words, across, down or diagonally down-right: still always forwards. */
export const PUZZLE_RULES: Record<PuzzleLevel, { size: number; count: number; dirs: Dir[]; label: string }> = {
  spark: { size: 7, count: 4, dirs: [RIGHT, DOWN], label: 'Easy' },
  seeker: { size: 10, count: 6, dirs: FORWARD, label: 'Challenge' },
};
export const MIN_WORDS = 3;

/** Does this level get a word hunt? Sunrise readers are still being read to, so they do not. */
export const hasPuzzle = (level: string): level is PuzzleLevel => level === 'spark' || level === 'seeker';

/** "Fire-fly!" -> "FIREFLY". Letters A to Z only, at least 3 of them, otherwise "". */
export function normalizeWord(w: string): string {
  const s = (w || '').toUpperCase().replace(/[^A-Z]/g, '');
  return s.length >= 3 ? s : '';
}

export function shuffled<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** The words for one attempt: valid, unique, short enough for the grid, re-shuffled and cut to the level's count. */
export function pickWords(level: PuzzleLevel, words: string[], rng: Rng = Math.random): string[] {
  const { size, count } = PUZZLE_RULES[level];
  const clean = [...new Set(words.map(normalizeWord).filter((w) => w && w.length <= size))];
  return shuffled(clean, rng).slice(0, count);
}

const inside = (n: number, r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n;

function attempt(level: PuzzleLevel, words: string[], rng: Rng): { grid: string[][]; placements: Placement[] } {
  const { size, dirs } = PUZZLE_RULES[level];
  const grid: string[][] = Array.from({ length: size }, () => Array<string>(size).fill(''));
  const placements: Placement[] = [];
  for (const word of words) {
    let placed: Placement | null = null;
    for (let tries = 0; tries < 300 && !placed; tries++) {
      const [dr, dc] = dirs[Math.floor(rng() * dirs.length)];
      const r0 = Math.floor(rng() * size), c0 = Math.floor(rng() * size);
      const cells: Cell[] = [];
      let ok = true;
      for (let i = 0; i < word.length && ok; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        if (!inside(size, r, c) || (grid[r][c] !== '' && grid[r][c] !== word[i])) ok = false; else cells.push({ r, c });
      }
      if (ok) placed = { word, cells };
    }
    if (placed) { placed.cells.forEach((cell, i) => { grid[cell.r][cell.c] = word[i]; }); placements.push(placed); }
  }
  return { grid, placements };
}

/** How many times a word is spelled forwards (right, down or diagonally down-right) in a full grid. */
export function countForward(grid: string[][], word: string): number {
  const n = grid.length;
  let count = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of FORWARD) {
    let i = 0;
    while (i < word.length && inside(n, r + dr * i, c + dc * i) && grid[r + dr * i][c + dc * i] === word[i]) i++;
    if (i === word.length) count++;
  }
  return count;
}

/** Safety net: every word must read letter by letter, in order, along a straight FORWARD line of the finished grid. */
export function puzzleIsValid(p: Puzzle): boolean {
  return p.placements.every((pl) => {
    if (pl.cells.length !== pl.word.length || pl.cells.some((c) => !inside(p.size, c.r, c.c))) return false;
    if (pl.cells.map((c) => p.grid[c.r][c.c]).join('') !== pl.word) return false;
    const dr = pl.cells[1].r - pl.cells[0].r, dc = pl.cells[1].c - pl.cells[0].c;
    return FORWARD.some(([r, c]) => r === dr && c === dc) && pl.cells.every((c, i) => c.r === pl.cells[0].r + dr * i && c.c === pl.cells[0].c + dc * i);
  });
}

/** Build a fresh puzzle. Returns null when no usable words could be placed. A puzzle is only handed out after it has been checked. */
export function buildPuzzle(level: PuzzleLevel, storyWords: string[], rng: Rng = Math.random): Puzzle | null {
  for (let n = 0; n < 5; n++) { const p = buildOnce(level, storyWords, rng); if (!p) return null; if (puzzleIsValid(p)) return p; }
  return null;
}

function buildOnce(level: PuzzleLevel, storyWords: string[], rng: Rng): Puzzle | null {
  const { size } = PUZZLE_RULES[level];
  const words = pickWords(level, storyWords, rng).sort((a, b) => b.length - a.length); // long words first fit best
  if (!words.length) return null;
  let best = attempt(level, words, rng);
  for (let n = 0; n < 40 && best.placements.length < words.length; n++) {
    const next = attempt(level, words, rng); // a crowded grid sometimes cannot take every word: try again
    if (next.placements.length > best.placements.length) best = next;
  }
  if (!best.placements.length) return null;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const base = best.grid.map((row) => [...row]);
  // Fill the empty squares with random letters. If the fill happens to spell one of the words a second time, fill again.
  for (let n = 0; n < 30; n++) {
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) best.grid[r][c] = base[r][c] === '' ? A[Math.floor(rng() * 26)] : base[r][c];
    if (best.placements.every((p) => countForward(best.grid, p.word) === 1)) break;
  }
  return { level, size, grid: best.grid, placements: shuffled(best.placements, rng) };
}

/** The squares on the straight line from a to b (inclusive), or null when they are not in a row, column or diagonal. */
export function lineCells(a: Cell, b: Cell): Cell[] | null {
  const dr = b.r - a.r, dc = b.c - a.c;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const n = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr), sc = Math.sign(dc);
  return Array.from({ length: n + 1 }, (_, i) => ({ r: a.r + sr * i, c: a.c + sc * i }));
}

/**
 * The word spelled by the line from a to b, if it is one of the puzzle's words not yet found. Words only ever read
 * forwards (left to right, top to bottom, or diagonally down to the right), so the order the child taps the two ends
 * does not matter: the line is always read from its first letter. Reads the letters, so an extra copy of a word that
 * the random fill happened to make also counts, but a word spelled backwards never does.
 */
export function checkSelection(p: Puzzle, a: Cell, b: Cell, found: ReadonlySet<string>): { word: string; cells: Cell[] } | null {
  let cells = lineCells(a, b);
  if (!cells || cells.length < 2) return null;
  const first = cells[0], last = cells[cells.length - 1];
  if (last.r < first.r || (last.r === first.r && last.c < first.c)) cells = [...cells].reverse(); // start from the end that comes first
  const dr = Math.sign(cells[1].r - cells[0].r), dc = Math.sign(cells[1].c - cells[0].c);
  if (!FORWARD.some(([r, c]) => r === dr && c === dc)) return null; // up-right and down-left lines would be read backwards
  const text = cells.map((x) => p.grid[x.r][x.c]).join('');
  const word = p.placements.map((x) => x.word).find((w) => !found.has(w) && w === text);
  return word ? { word, cells } : null;
}

/** A hint: the first letter of a word that has not been found yet. */
export function hintFor(p: Puzzle, found: ReadonlySet<string>, rng: Rng = Math.random): { word: string; cell: Cell } | null {
  const left = p.placements.filter((x) => !found.has(x.word));
  if (!left.length) return null;
  const pick = left[Math.floor(rng() * left.length)];
  return { word: pick.word, cell: pick.cells[0] };
}
