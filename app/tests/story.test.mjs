import test from 'node:test';
import assert from 'node:assert/strict';
import { chaptersOf, chapterAt, wordsAllowed, splitByWord, splitByWords, wordPageIndex, statsFrom, weekStart, monthStart, songHint, clock } from '../src/lib/story.ts';

test('chapters start at titled pages and pages belong to the latest chapter', () => {
  const pages = [{ chapterTitle: 'The Climb' }, {}, { chapterTitle: ' The Cave ' }, {}, {}];
  const ch = chaptersOf(pages);
  assert.deepEqual(ch, [{ index: 1, title: 'The Climb', firstPage: 0 }, { index: 2, title: 'The Cave', firstPage: 2 }]);
  assert.equal(chapterAt(ch, 1).index, 1); assert.equal(chapterAt(ch, 2).index, 2); assert.equal(chapterAt(ch, 4).title, 'The Cave');
  assert.equal(chapterAt([], 3), undefined);
  assert.deepEqual(chaptersOf([{ chapterTitle: '   ' }, {}]), []);
});

test('one explorer word for Spark, three for Seeker, none for Sunrise', () => {
  assert.deepEqual(['sunrise', 'spark', 'seeker'].map(wordsAllowed), [0, 1, 3]);
});

test('splitByWord highlights whole words only, any case, with a plural s', () => {
  const t = 'The glimmer was a Glimmer of glimmers, not glimmering.';
  const segs = splitByWord(t, 'glimmer');
  assert.deepEqual(segs.filter((s) => s.match).map((s) => s.text), ['glimmer', 'Glimmer', 'glimmers']);
  assert.equal(segs.map((s) => s.text).join(''), t);
  assert.deepEqual(splitByWord('nothing here', 'moon'), [{ text: 'nothing here', match: false }]);
  assert.deepEqual(splitByWord('abc', ''), [{ text: 'abc', match: false }]);
  assert.equal(splitByWord('a (b) c.d', 'c.d').filter((s) => s.match).length, 1); // regex characters are escaped
  assert.equal(splitByWord('über-brave', 'brave').filter((s) => s.match).length, 1);
});

test('wordPageIndex prefers the assigned page, else the first page containing the word', () => {
  const pages = [{ position: 1, text: 'one' }, { position: 2, text: 'a brave kai' }, { position: 3, text: 'so brave' }];
  assert.equal(wordPageIndex(pages, 'brave'), 1);
  assert.equal(wordPageIndex(pages, 'brave', 3), 2);
  assert.equal(wordPageIndex(pages, 'brave', 9), 1);
  assert.equal(wordPageIndex(pages, 'moon'), -1);
});

test('stats count different stories this week, this month and ever (Monday start)', () => {
  const now = new Date(2026, 9, 14, 15, 0); // Wed 14 Oct 2026
  assert.equal(weekStart(now).getDay(), 1); assert.equal(weekStart(now).getDate(), 12);
  assert.equal(monthStart(now).getDate(), 1);
  const at = (y, m, d) => new Date(y, m, d, 9).toISOString();
  const done = [
    { slug: 'a', at: at(2026, 9, 12) }, { slug: 'a', at: at(2026, 9, 13) }, // same story twice this week
    { slug: 'b', at: at(2026, 9, 14) },
    { slug: 'c', at: at(2026, 9, 3) }, // earlier this month
    { slug: 'd', at: at(2026, 8, 20) }, // last month
  ];
  assert.deepEqual(statsFrom(done, now), { week: 2, month: 3, all: 4 });
  assert.deepEqual(statsFrom([], now), { week: 0, month: 0, all: 0 });
  const sunday = new Date(2026, 9, 11, 23, 0); // Sunday belongs to the week that started Mon 5 Oct
  assert.equal(weekStart(sunday).getDate(), 5);
});

test('several explorer words are marked in one page of text', () => {
  const segs = splitByWords('The wind howled. A silent cat; howled again!', [{ id: 'a', word: 'howled' }, { id: 'b', word: 'silent' }]);
  assert.deepEqual(segs.filter((s) => s.wordId).map((s) => [s.text, s.wordId]), [['howled', 'a'], ['silent', 'b'], ['howled', 'a']]);
  assert.equal(segs.map((s) => s.text).join(''), 'The wind howled. A silent cat; howled again!');
});

test('song hints appear on a few pages only: first, middle of a longer story, last', () => {
  const shown = (n) => Array.from({ length: n }, (_, i) => songHint(i, n)).map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(shown(1), [0]);
  assert.deepEqual(shown(3), [0, 2]);
  assert.deepEqual(shown(4), [0, 3]);
  assert.deepEqual(shown(5), [0, 2, 4]);
  assert.deepEqual(shown(10), [0, 4, 9]);
  assert.match(songHint(0, 6), /at the end/); assert.match(songHint(5, 6), /Last page/); assert.match(songHint(2, 6), /Halfway/);
  assert.equal(songHint(-1, 4), null); assert.equal(songHint(4, 4), null); assert.equal(songHint(0, 0), null);
});

test('clock formats seconds as m:ss and survives bad numbers', () => {
  assert.equal(clock(75), '1:15'); assert.equal(clock(9.9), '0:09'); assert.equal(clock(600), '10:00');
  assert.equal(clock(NaN), '0:00'); assert.equal(clock(-3), '0:00'); assert.equal(clock(Infinity), '0:00');
});
