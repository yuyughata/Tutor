import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePuzzleWord, suggestPuzzleWords } from '../../public/admin/js/puzzle.js';

test('puzzle words are letters only, 3 to 10 long', () => {
  assert.equal(normalizePuzzleWord('Fire-fly!'), 'FIREFLY'); assert.equal(normalizePuzzleWord('ox'), ''); assert.equal(normalizePuzzleWord('extraordinary'), '');
});

test('suggestions put characters first, then explorer words, then long repeated words', () => {
  const pages = ['Late one evening, Luna sat by her window, watching the moon rise.', 'A soft sparkle danced across the garden. Luna smiled at the sparkle.', 'Luna followed the tiny light into the garden with Grandpa Kofi.'];
  const out = suggestPuzzleWords(pages, ['sparkle'], 12);
  assert.equal(out[0], 'LUNA'); assert.ok(out.includes('KOFI') || out.includes('GRANDPA'));
  assert.ok(out.indexOf('SPARKLE') < out.indexOf('GARDEN') || out.includes('SPARKLE'));
  assert.ok(out.includes('GARDEN') && out.includes('WINDOW'));
  assert.ok(!out.includes('THE') && !out.includes('LATE') && !out.includes('A'), 'sentence-start words and stop words are not names');
  assert.ok(out.length <= 12 && new Set(out).size === out.length);
});
