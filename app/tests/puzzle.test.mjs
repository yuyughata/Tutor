import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPuzzle, countForward, puzzleIsValid, pickWords, normalizeWord, lineCells, checkSelection, hintFor, hasPuzzle, PUZZLE_RULES, shuffled } from '../src/lib/puzzle.ts';

const rngFrom = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const WORDS = ['Luna', 'firefly', 'window', 'moon', 'garden', 'sparkle'];
const letters = (p, cells) => cells.map((c) => p.grid[c.r][c.c]).join('');

test('words are normalised to A-Z and need 3 letters', () => {
  assert.equal(normalizeWord('Fire-fly!'), 'FIREFLY'); assert.equal(normalizeWord('ox'), ''); assert.equal(normalizeWord(' é '), '');
  assert.deepEqual(pickWords('spark', ['Luna', 'luna', 'LUNA!', 'ox', 'enormousword']).sort(), ['LUNA']);
});

test('only Spark and Seeker get a puzzle', () => { assert.equal(hasPuzzle('sunrise'), false); assert.equal(hasPuzzle('spark'), true); assert.equal(hasPuzzle('seeker'), true); });

test('Spark: 7x7, 4 words, only forwards (right or down); every word is really in the grid', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const p = buildPuzzle('spark', WORDS, rngFrom(seed));
    assert.equal(p.size, 7); assert.equal(p.grid.length, 7); assert.ok(p.grid.every((row) => row.length === 7 && row.every((x) => /^[A-Z]$/.test(x))));
    assert.equal(p.placements.length, 4);
    for (const pl of p.placements) {
      assert.equal(letters(p, pl.cells), pl.word);
      const dr = pl.cells[1].r - pl.cells[0].r, dc = pl.cells[1].c - pl.cells[0].c;
      assert.ok((dr === 0 && dc === 1) || (dr === 1 && dc === 0), 'Spark words only go right or down');
    }
  }
});

test('Seeker: 10x10, 6 words, across, down and diagonal-down-right all appear (always forwards)', () => {
  const dirs = new Set(); const words = ['MOUNTAIN', 'WIND', 'RIDGE', 'CAVERN', 'SUNRISE', 'SILENT', 'HOWLED', 'TREK'];
  for (let seed = 1; seed <= 80; seed++) {
    const p = buildPuzzle('seeker', words, rngFrom(seed));
    assert.equal(p.size, 10); assert.equal(p.placements.length, 6);
    for (const pl of p.placements) { assert.equal(letters(p, pl.cells), pl.word); dirs.add(`${pl.cells[1].r - pl.cells[0].r},${pl.cells[1].c - pl.cells[0].c}`); }
  }
  assert.deepEqual([...dirs].sort(), ['0,1', '1,0', '1,1']);
});

test('every attempt is different: new grid and a different choice of words', () => {
  const grids = new Set(), picks = new Set();
  for (let seed = 1; seed <= 30; seed++) { const p = buildPuzzle('spark', WORDS, rngFrom(seed)); grids.add(JSON.stringify(p.grid)); picks.add(p.placements.map((x) => x.word).sort().join()); }
  assert.ok(grids.size >= 29, 'grids repeat too often: ' + grids.size); assert.ok(picks.size >= 5, 'word choice barely changes: ' + picks.size);
  assert.deepEqual(shuffled([1, 2, 3, 4, 5], rngFrom(3)).sort(), [1, 2, 3, 4, 5]);
});

test('fewer words than the level asks for: all of them are used; too long words are dropped; nothing usable gives null', () => {
  assert.equal(buildPuzzle('spark', ['LUNA', 'MOON', 'STAR'], rngFrom(1)).placements.length, 3);
  assert.equal(buildPuzzle('spark', ['LUNA', 'MOON', 'EXTRAORDINARY'], rngFrom(1)).placements.length, 2);
  assert.equal(buildPuzzle('spark', ['ox', 'a'], rngFrom(1)), null);
});

test('lines and selections: forwards, backwards, diagonals, bad lines, and each word only once', () => {
  assert.equal(lineCells({ r: 0, c: 0 }, { r: 1, c: 2 }), null);
  assert.deepEqual(lineCells({ r: 2, c: 3 }, { r: 2, c: 1 }), [{ r: 2, c: 3 }, { r: 2, c: 2 }, { r: 2, c: 1 }]);
  assert.equal(lineCells({ r: 0, c: 0 }, { r: 3, c: 3 }).length, 4);
  const p = buildPuzzle('seeker', ['MOUNTAIN', 'WIND', 'RIDGE', 'CAVERN', 'SUNRISE', 'SILENT'], rngFrom(7));
  const pl = p.placements[0]; const a = pl.cells[0], b = pl.cells[pl.cells.length - 1];
  assert.equal(checkSelection(p, a, b, new Set()).word, pl.word);
  assert.equal(checkSelection(p, b, a, new Set()).word, pl.word, 'tapping the last letter first works too: the line is always read forwards');
  assert.equal(checkSelection(p, a, b, new Set([pl.word])), null, 'a found word is not found twice');
  assert.equal(checkSelection(p, a, a, new Set()), null);
  const h = hintFor(p, new Set([pl.word]), rngFrom(2)); assert.notEqual(h.word, pl.word);
  assert.equal(hintFor(p, new Set(p.placements.map((x) => x.word))), null);
});

test('rules match the product: Spark basic, Seeker harder', () => {
  assert.ok(PUZZLE_RULES.seeker.size > PUZZLE_RULES.spark.size && PUZZLE_RULES.seeker.count > PUZZLE_RULES.spark.count && PUZZLE_RULES.seeker.dirs.length === 3 && PUZZLE_RULES.spark.dirs.length === 2);
});

const FORWARD = ['0,1', '1,0', '1,1'];
const WORD_SETS = [
  ['FLOWER', 'KEMI', 'SEED', 'SNAIL', 'WATER', 'SOIL', 'PATIENT', 'SHOOT'],
  ['BEACON', 'LIGHTHOUSE', 'KEEPER', 'SECRET', 'LAMP', 'WAVES', 'STORM', 'ROCKS'],
  ['MOUNTAIN', 'WIND', 'RIDGE', 'CAVERN', 'SUNRISE', 'SILENT', 'HOWLED', 'TREK'],
  ['LUNA', 'MOON', 'STAR', 'NOON', 'LEVEL', 'RADAR'],
];

test('words are spelled FORWARDS only, in the right order, in every puzzle (thousands of random ones)', () => {
  for (const level of ['spark', 'seeker']) for (let seed = 1; seed <= 600; seed++) for (const words of WORD_SETS) {
    const p = buildPuzzle(level, words, rngFrom(seed * 7 + words.length));
    for (const pl of p.placements) {
      assert.equal(letters(p, pl.cells), pl.word, `${pl.word} must read letter by letter, in order`);
      const dir = `${pl.cells[1].r - pl.cells[0].r},${pl.cells[1].c - pl.cells[0].c}`;
      assert.ok(FORWARD.includes(dir), `${pl.word} runs ${dir}: that would be backwards`);
      assert.ok(PUZZLE_RULES[level].dirs.some(([r, c]) => `${r},${c}` === dir));
      for (let i = 1; i < pl.cells.length; i++) assert.equal(`${pl.cells[i].r - pl.cells[i - 1].r},${pl.cells[i].c - pl.cells[i - 1].c}`, dir, 'a straight line, no jumps');
      assert.ok(countForward(p.grid, pl.word) >= 1);
      if (!['NOON', 'LEVEL', 'RADAR'].includes(pl.word)) assert.equal(countForward(p.grid, pl.word), 1, `${pl.word} should appear once`);
    }
  }
});

test('a word spelled backwards or with swapped letters is never accepted', () => {
  const p = { level: 'seeker', size: 4, grid: [['B', 'E', 'A', 'C'], ['O', 'N', 'X', 'X'], ['N', 'O', 'C', 'E'], ['X', 'X', 'X', 'X']], placements: [{ word: 'BEACON', cells: [] }, { word: 'FLOWER', cells: [] }] };
  const row = (r) => [{ r, c: 0 }, { r, c: 3 }];
  assert.equal(checkSelection({ ...p, size: 6, grid: [['N', 'O', 'C', 'A', 'E', 'B'], ...Array(5).fill(Array(6).fill('X'))], placements: [{ word: 'BEACON', cells: [] }] }, { r: 0, c: 0 }, { r: 0, c: 5 }, new Set()), null, 'NOCAEB must not count as BEACON');
  const q = { level: 'seeker', size: 6, grid: [['F', 'L', 'O', 'W', 'R', 'E'], ...Array(5).fill(Array(6).fill('X'))], placements: [{ word: 'FLOWER', cells: [] }] };
  assert.equal(checkSelection(q, { r: 0, c: 0 }, { r: 0, c: 5 }, new Set()), null, 'FLOWRE must not count as FLOWER');
  const ok = { ...q, grid: [['F', 'L', 'O', 'W', 'E', 'R'], ...Array(5).fill(Array(6).fill('X'))] };
  assert.equal(checkSelection(ok, { r: 0, c: 0 }, { r: 0, c: 5 }, new Set()).word, 'FLOWER');
  assert.equal(checkSelection(ok, { r: 0, c: 5 }, { r: 0, c: 0 }, new Set()).word, 'FLOWER', 'tap order does not matter');
  // a word that only exists upwards-diagonal (read from bottom-left to top-right) is not forwards
  const up = { level: 'seeker', size: 6, grid: Array.from({ length: 6 }, () => Array(6).fill('X')), placements: [{ word: 'CAT', cells: [] }] };
  up.grid[2][0] = 'C'; up.grid[1][1] = 'A'; up.grid[0][2] = 'T';
  assert.equal(checkSelection(up, { r: 2, c: 0 }, { r: 0, c: 2 }, new Set()), null);
});

test('the safety check rejects a puzzle whose word is scrambled or backwards', () => {
  const p = buildPuzzle('spark', WORDS, rngFrom(5));
  assert.ok(puzzleIsValid(p));
  const bad = JSON.parse(JSON.stringify(p)); const pl = bad.placements[0]; const [x, y] = [pl.cells[0], pl.cells[1]];
  [bad.grid[x.r][x.c], bad.grid[y.r][y.c]] = [bad.grid[y.r][y.c], bad.grid[x.r][x.c]]; // swap two letters of a word
  if (bad.grid[x.r][x.c] !== p.grid[x.r][x.c]) assert.equal(puzzleIsValid(bad), false);
  const back = JSON.parse(JSON.stringify(p)); back.placements[0].cells.reverse(); back.placements[0].word = [...back.placements[0].word].reverse().join('');
  assert.equal(puzzleIsValid(back), false, 'a word placed backwards is invalid');
});
