import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { StarBurst } from '../../src/components/StarBurst';
import { Tap } from '../../src/components/Tap';
import { getStory } from '../../src/data/repository';
import { announce } from '../../src/lib/a11y';
import { buildPuzzle, checkSelection, hasPuzzle, hintFor, MIN_WORDS, PUZZLE_RULES, type Cell, type Puzzle } from '../../src/lib/puzzle';
import { useTheme } from '../../src/state/theme';
import { colors, fonts, radius, space, type, themed } from '../../src/theme';
import type { Story } from '../../src/types';

/** Soft tints for the words as they are found (all readable with dark text). */
const tints = () => [colors.amberSoft, colors.secondarySoft, colors.primarySoft, '#ffe1d6', '#dff0ff', '#e6f7d9'];

/**
 * The word hunt: a word search played after a story. Spark gets a small, easy grid; Seeker a bigger one where words can
 * go any way. Every new attempt is a fresh, shuffled puzzle. Tap the first letter of a word, then its last letter.
 */
export default function WordHunt() {
  useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [story, setStory] = useState<Story | null | undefined>(undefined);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [first, setFirst] = useState<Cell | null>(null);
  const [found, setFound] = useState<{ word: string; cells: Cell[] }[]>([]);
  const [hint, setHint] = useState<Cell | null>(null);
  const [note, setNote] = useState('');
  const [attempt, setAttempt] = useState(1);

  const fresh = useCallback((s: Story) => {
    setPuzzle(hasPuzzle(s.level) ? buildPuzzle(s.level, s.puzzleWords ?? []) : null);
    setFirst(null); setFound([]); setHint(null); setNote('');
  }, []);
  useEffect(() => { getStory(slug).then((s) => { setStory(s); if (s) fresh(s); }).catch(() => setStory(null)); }, [slug, fresh]);

  const foundWords = useMemo(() => new Set(found.map((f) => f.word)), [found]);
  const total = puzzle?.placements.length ?? 0;
  const done = total > 0 && found.length === total;

  const cellState = (r: number, c: number) => {
    const i = found.findIndex((f) => f.cells.some((x) => x.r === r && x.c === c));
    return { foundAt: i, word: i >= 0 ? found[i].word : undefined };
  };

  const tap = (cell: Cell) => {
    if (!puzzle || done) return;
    setHint(null);
    if (!first) { setFirst(cell); setNote(''); return; }
    if (first.r === cell.r && first.c === cell.c) { setFirst(null); return; }
    const hit = checkSelection(puzzle, first, cell, foundWords);
    if (hit) {
      const next = [...found, hit];
      setFound(next); setFirst(null); setNote(`You found ${hit.word}!`);
      announce(next.length === total ? 'You found all the words!' : `Found ${hit.word}. ${total - next.length} to go.`);
    } else {
      setFirst(cell); setNote('Not a word yet. Keep looking!'); // a gentle nudge, and the tapped letter starts a new try
    }
  };

  if (story === undefined) return <ActivityIndicator style={{ marginTop: 160 }} color={colors.primary} />;

  const rules = story && hasPuzzle(story.level) ? PUZZLE_RULES[story.level] : null;
  if (!story || !rules || !puzzle || (story.puzzleWords?.length ?? 0) < MIN_WORDS) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 24 }]}>
        <Ionicons name="grid" size={44} color={colors.primaryDeep} />
        <Text style={styles.heading}>No word hunt for this story yet</Text>
        <Button label="Close" onPress={() => router.back()} />
      </View>
    );
  }

  const size = puzzle.size;
  const boardW = Math.min(width - space.md * 2, 440);
  const cellW = Math.floor((boardW - 12) / size);
  const palette = tints();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: space.md, alignItems: 'center', gap: 14 }}>
        <View style={styles.top}>
          <Tap accessibilityRole="button" accessibilityLabel="Close the word hunt" onPress={() => router.back()} style={styles.round}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </Tap>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.title}>Word hunt</Text>
            <Text style={styles.sub} numberOfLines={1}>{story.title} · {rules.label}</Text>
          </View>
        </View>

        <Text style={styles.how}>
          {done ? 'You found every word. Great reading!' : `Find the hidden words. Tap the first letter of a word, then its last letter.${story.level === 'seeker' ? ' Words can go across, down, diagonally or backwards.' : ''}`}
        </Text>

        <View style={[styles.board, { width: cellW * size + 12 }]} accessible={false} accessibilityLabel="Word search grid">
          {puzzle.grid.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((letter, c) => {
                const st = cellState(r, c);
                const selected = first?.r === r && first?.c === c;
                const hinted = hint?.r === r && hint?.c === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`${letter}, row ${r + 1}, column ${c + 1}${st.word ? `, part of ${st.word}` : ''}`}
                    accessibilityState={{ selected }}
                    onPress={() => tap({ r, c })}
                    style={[
                      styles.cell, { width: cellW, height: cellW },
                      st.foundAt >= 0 && { backgroundColor: palette[st.foundAt % palette.length] },
                      hinted && styles.hinted,
                      selected && { backgroundColor: colors.action },
                    ]}
                  >
                    <Text style={[styles.letter, { fontSize: Math.round(cellW * 0.5) }, selected && { color: colors.onAction }]}>{letter}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={styles.note} accessibilityLiveRegion="polite">{done ? '' : note || (first ? 'Now tap the last letter.' : ' ')}</Text>

        <View style={styles.listBox}>
          <Text style={styles.listTitle}>{found.length} of {total} found</Text>
          <View style={styles.words}>
            {puzzle.placements.map((p) => {
              const ok = foundWords.has(p.word);
              return (
                <View key={p.word} style={[styles.chip, ok && styles.chipOn]} accessible accessibilityLabel={`${p.word}${ok ? ', found' : ''}`}>
                  {ok && <Ionicons name="checkmark-circle" size={16} color={colors.secondaryDeep} />}
                  <Text style={[styles.chipText, ok && { textDecorationLine: 'line-through', color: colors.muted }]}>{p.word}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {done ? (
          <View style={styles.win}>
            <StarBurst />
            <Text style={{ fontSize: 44 }}>🌟</Text>
            <Text style={styles.winTitle}>You found them all!</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {!done && <Button label="Show a hint" icon="bulb-outline" variant="secondary" onPress={() => { const h = hintFor(puzzle, foundWords); if (h) { setHint(h.cell); setFirst(null); setNote(`A word starts at the glowing letter.`); announce(`Hint: a word starts at row ${h.cell.r + 1}, column ${h.cell.c + 1}`); } }} />}
          <Button label={done ? 'Play again with a new puzzle' : 'New puzzle'} icon="shuffle" variant={done ? 'primary' : 'secondary'} onPress={() => { fresh(story); setAttempt((n) => n + 1); announce('A new puzzle'); }} />
          <Button label="Done" variant="ghost" onPress={() => router.back()} />
        </View>
        <Text style={styles.attempt} accessibilityElementsHidden importantForAccessibility="no">Puzzle {attempt}</Text>
      </ScrollView>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: 14, backgroundColor: colors.bg },
  heading: { ...type.title, color: colors.ink, textAlign: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { ...type.display, color: colors.ink },
  sub: { ...type.small, color: colors.muted },
  how: { ...type.body, color: colors.ink, textAlign: 'center', maxWidth: 440 },
  board: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 6, borderWidth: 1, borderColor: colors.border },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  letter: { fontFamily: fonts.black, color: colors.ink },
  hinted: { borderWidth: 3, borderColor: colors.amber },
  note: { ...type.small, color: colors.primaryDeep, minHeight: 20, textAlign: 'center' },
  listBox: { alignSelf: 'stretch', maxWidth: 440, gap: 8 },
  listTitle: { ...type.label, color: colors.muted, textAlign: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.secondarySoft, borderColor: colors.secondarySoft },
  chipText: { fontFamily: fonts.black, fontSize: 15, letterSpacing: 1, color: colors.ink },
  win: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  winTitle: { ...type.title, color: colors.ink },
  actions: { alignSelf: 'stretch', maxWidth: 440, gap: 10, marginTop: 6 },
  attempt: { ...type.small, color: colors.muted },
}));
