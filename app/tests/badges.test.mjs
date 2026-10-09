import test from 'node:test';
import assert from 'node:assert/strict';
import { badgeStates, unseenBadges, goalProgress, gardenFor, BADGES } from '../src/lib/badges.ts';

const base = { storiesFinished: 0, completions: [], wordsLearned: 0, categorySlugs: ['animals', 'bedtime'] };
const ids = (states) => states.filter((b) => b.earned).map((b) => b.id);

test('nothing is earned at the start', () => {
  assert.deepEqual(ids(badgeStates(base)), []);
  assert.equal(badgeStates(base).length, BADGES.length);
});

test('story count badges unlock at 1, 5, 10, 25 and 50', () => {
  for (const [n, want] of [[1, ['stories-1']], [4, ['stories-1']], [5, ['stories-1', 'stories-5']], [10, ['stories-1', 'stories-5', 'stories-10']], [25, ['stories-1', 'stories-5', 'stories-10', 'stories-25']], [50, ['stories-1', 'stories-5', 'stories-10', 'stories-25', 'stories-50']]]) {
    assert.deepEqual(ids(badgeStates({ ...base, storiesFinished: n })), want, `at ${n}`);
  }
});

test('finishing a chapter book and learning words', () => {
  const s = badgeStates({ ...base, storiesFinished: 1, completions: [{ slug: 'trek', at: '2026-10-01T10:00:00Z', chapters: true }], wordsLearned: 1 });
  assert.deepEqual(ids(s), ['stories-1', 'chapter-book', 'word-1']);
  assert.ok(ids(badgeStates({ ...base, wordsLearned: 10 })).includes('word-10'));
  assert.ok(!ids(badgeStates({ ...base, wordsLearned: 9 })).includes('word-10'));
});

test('Explorer needs a finished story in every category, and stays locked while the category list is unknown', () => {
  const c = (cats) => ({ slug: cats.join(), at: 'x', cats });
  assert.ok(!ids(badgeStates({ ...base, completions: [c(['animals'])] })).includes('all-categories'));
  assert.ok(ids(badgeStates({ ...base, completions: [c(['animals']), c(['bedtime', 'fantasy'])] })).includes('all-categories'));
  assert.ok(!ids(badgeStates({ ...base, categorySlugs: [], completions: [c(['animals'])] })).includes('all-categories'));
});

test('unseen badges are the earned ones not shown before', () => {
  const s = badgeStates({ ...base, storiesFinished: 5, wordsLearned: 1 });
  assert.deepEqual(unseenBadges(s, ['stories-1']).map((b) => b.id), ['stories-5', 'word-1']);
  assert.deepEqual(unseenBadges(s, ['stories-1', 'stories-5', 'word-1']), []);
});

test('weekly goal: progress is capped at the goal and a missed week costs nothing', () => {
  assert.deepEqual(goalProgress(0), { count: 0, goal: 3, pct: 0, reached: false, left: 3 });
  assert.equal(goalProgress(2).left, 1);
  const done = goalProgress(5); assert.equal(done.pct, 1); assert.equal(done.reached, true); assert.equal(done.left, 0);
});

test('word garden grows with learned words', () => {
  assert.equal(gardenFor(0).stage.emoji, '🌰'); assert.equal(gardenFor(0).toNext, 1);
  assert.equal(gardenFor(1).stage.emoji, '🌱'); assert.equal(gardenFor(2).toNext, 1);
  assert.equal(gardenFor(10).stage.emoji, '🌷');
  const top = gardenFor(60); assert.equal(top.stage.emoji, '🌳'); assert.equal(top.next, null); assert.equal(top.pct, 1);
});
