import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPuzzle, pickWords, normalizeWord, lineCells, checkSelection, hintFor, hasPuzzle, PUZZLE_RULES, shuffled } from '../src/lib/puzzle.ts';

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

test('Seeker: 10x10, 6 words, all eight directions appear across attempts', () => {
  const dirs = new Set(); const words = ['MOUNTAIN', 'WIND', 'RIDGE', 'CAVERN', 'SUNRISE', 'SILENT', 'HOWLED', 'TREK'];
  for (let seed = 1; seed <= 80; seed++) {
    const p = buildPuzzle('seeker', words, rngFrom(seed));
    assert.equal(p.size, 10); assert.equal(p.placements.length, 6);
    for (const pl of p.placements) { assert.equal(letters(p, pl.cells), pl.word); dirs.add(`${pl.cells[1].r - pl.cells[0].r},${pl.cells[1].c - pl.cells[0].c}`); }
  }
  assert.equal(dirs.size, 8);
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
  assert.equal(checkSelection(p, b, a, new Set()).word, pl.word, 'selecting backwards works too');
  assert.equal(checkSelection(p, a, b, new Set([pl.word])), null, 'a found word is not found twice');
  assert.equal(checkSelection(p, a, a, new Set()), null);
  const h = hintFor(p, new Set([pl.word]), rngFrom(2)); assert.notEqual(h.word, pl.word);
  assert.equal(hintFor(p, new Set(p.placements.map((x) => x.word))), null);
});

test('rules match the product: Spark basic, Seeker harder', () => {
  assert.ok(PUZZLE_RULES.seeker.size > PUZZLE_RULES.spark.size && PUZZLE_RULES.seeker.count > PUZZLE_RULES.spark.count && PUZZLE_RULES.seeker.dirs.length === 8 && PUZZLE_RULES.spark.dirs.length === 2);
});
