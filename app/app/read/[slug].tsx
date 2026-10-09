import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Picture } from '../../src/components/Picture';
import { Tap } from '../../src/components/Tap';
import { getPages, getStory, getWords } from '../../src/data/repository';
import { ChapterSheet } from '../../src/components/ChapterSheet';
import { StarBurst } from '../../src/components/StarBurst';
import { WordSheet } from '../../src/components/WordSheet';
import { announce, useReducedMotion } from '../../src/lib/a11y';
import { unseenBadges, type BadgeState } from '../../src/lib/badges';
import { chaptersOf, chapterAt, splitByWords, wordPageIndex, type Chapter } from '../../src/lib/story';
import { useAuth } from '../../src/state/auth';
import { useLibrary } from '../../src/state/library';
import { useReadingLevel } from '../../src/state/profiles';
import { load, save } from '../../src/state/storage';
import { colors, fonts, radius, readerFontBase, readerThemes, shadow, space, type, type ReaderThemeName, themed } from '../../src/theme';
import type { Story, StoryPage, StoryWord } from '../../src/types';
import { useTheme } from '../../src/state/theme';

const MIN_DELTA = -4;
const MAX_DELTA = 10;
const THEMES: ReaderThemeName[] = ['day', 'sepia', 'night'];

type Item = { kind: 'page'; page: StoryPage } | { kind: 'end' };

/** "Chapter 2" and its title above the page text; on a chapter's first page the title is large. Tapping opens the chapter list. */
function ChapterHeading({ chapters, at, color, muted, onOpen }: { chapters: Chapter[]; at: number; color: string; muted: string; onOpen: () => void }) {
  const ch = chapterAt(chapters, at);
  if (!ch) return null;
  const opens = ch.firstPage === at;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`Chapter ${ch.index}: ${ch.title}. Open the chapter list`}
      onPress={onOpen}
      style={styles.chapter}
    >
      <Text style={[styles.chapterNo, { color: muted }]}>CHAPTER {ch.index}{opens ? '' : ` · ${ch.title.toUpperCase()}`}</Text>
      {opens && <Text style={[styles.chapterTitle, { color }]}>{ch.title}</Text>}
    </Tap>
  );
}

export default function Reader() {
  useTheme(); // re-render when the theme changes
  const { slug, page: pageParam } = useLocalSearchParams<{ slug: string; page?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Each page needs a fixed height (the height of the reader). Without it, a horizontal list on the web lets a page grow to fit
  // its text, and the page text could not scroll when it was long.
  const [listH, setListH] = useState(height);
  const band = useReadingLevel();
  const { progress, saveProgress, trackStart, stats, hasLearned, badges, badgesSeen, markBadgesSeen } = useLibrary();
  const { canRead, accessReady } = useAuth();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlatList<Item>>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [pages, setPages] = useState<StoryPage[] | null>(null);
  const [index, setIndex] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [delta, setDelta] = useState(0);
  const [themeName, setThemeNameState] = useState<ReaderThemeName>('day');
  // The reader remembers Day / Sepia / Night between stories (each app theme has its own set of three).
  useEffect(() => { load<ReaderThemeName>('genova.readerMode.v1', 'day').then((m) => { if (THEMES.includes(m)) setThemeNameState(m); }); }, []);
  const setThemeName = (m: ReaderThemeName) => { setThemeNameState(m); save('genova.readerMode.v1', m); };
  const theme = readerThemes[themeName];

  const [words, setWords] = useState<StoryWord[]>([]);
  const [wordSheet, setWordSheet] = useState<StoryWord[] | null>(null);
  const [chapterSheet, setChapterSheet] = useState(false);

  // The End: a one-time star burst, and a card for badges earned that the reader has not seen yet.
  const [freshBadges, setFreshBadges] = useState<BadgeState[]>([]);
  const burstDone = useRef(false);
  const [burst, setBurst] = useState(false);

  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { if (story) getWords(story).then(setWords).catch(() => setWords([])); }, [story]);

  useEffect(() => { getStory(slug).then(setStory).catch(() => { setStory(null); setPages([]); }); }, [slug]);

  const readable = story ? canRead(story) : null;
  useEffect(() => {
    if (!story || !accessReady) return;
    setFailed(false);
    if (!readable) { setPages([]); return; } // locked (or a saved premium story whose access has lapsed)
    getPages(story).then((p) => {
      setPages(p);
      if (p.length) {
        const saved = progress[story.slug];
        // A chapter chosen on the story page wins over the saved place.
        const jump = pageParam !== undefined && Number.isFinite(Number(pageParam)) ? Math.max(0, Math.min(p.length - 1, Number(pageParam))) : null;
        const at = jump ?? (saved && !saved.finished ? Math.min(saved.page, p.length - 1) : 0);
        setStart(at);
        setIndex(at);
        trackStart(story);
      }
    }).catch(() => { setFailed(true); setPages([]); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, accessReady, readable, attempt]);

  const items: Item[] = pages ? [...pages.map((page) => ({ kind: 'page' as const, page })), { kind: 'end' as const }] : [];
  const last = items.length - 1;

  const chapters = story?.hasChapters && pages ? chaptersOf(pages) : [];
  // Where each explorer word shows (the page it was assigned to, else the first page that has it).
  const wordPages = pages ? words.map((w) => ({ w, at: wordPageIndex(pages, w.word, w.page) })) : [];

  const atTheEnd = !!pages && pages.length > 0 && index === pages.length;
  useEffect(() => {
    if (!atTheEnd) { setFreshBadges([]); return; }
    if (!burstDone.current) { burstDone.current = true; setBurst(true); }
    const fresh = unseenBadges(badges, badgesSeen);
    if (fresh.length) {
      setFreshBadges(fresh);
      markBadgesSeen(fresh.map((b) => b.id));
      announce(`New ${fresh.length === 1 ? 'badge' : 'badges'}: ${fresh.map((b) => b.title).join(', ')}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atTheEnd]);

  const onIndex = useCallback((i: number) => {
    setIndex(i);
    if (pages) {
      const ch = chapterAt(chapters, i);
      const opens = ch && ch.firstPage === i ? `Chapter ${ch.index}: ${ch.title}. ` : '';
      announce(i >= pages.length ? 'The End' : `${opens}Page ${i + 1} of ${pages.length}`);
    }
    if (story && pages) saveProgress(story, Math.min(i, pages.length - 1), i >= pages.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, pages, saveProgress]);

  const go = (i: number) => {
    const to = Math.max(0, Math.min(last, i));
    listRef.current?.scrollToIndex({ index: to, animated: !reduceMotion });
    onIndex(to);
  };

  if (!pages) return <ActivityIndicator style={{ marginTop: 160 }} color={colors.primary} />;

  if (failed) {
    return (
      <View style={styles.locked}>
        <View style={styles.lockBadge}><Ionicons name="cloud-offline" size={36} color={colors.primaryDeep} /></View>
        <Text style={styles.lockedTitle}>Can't open this story</Text>
        <Text style={styles.lockedText}>Check your connection and try again. Stories you saved for offline open without internet.</Text>
        <Button label="Try again" onPress={() => { setPages(null); setAttempt((n) => n + 1); }} />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }
  if (pages.length === 0) {
    return (
      <View style={styles.locked}>
        <View style={styles.lockBadge}><Ionicons name="lock-closed" size={36} color={colors.primaryDeep} /></View>
        <Text style={styles.lockedTitle}>{story?.title ?? 'This story'}</Text>
        <Text style={styles.lockedText}>This is a Premium story. Ask a grown-up to sign in to read it.</Text>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const fontSize = readerFontBase[band] + delta;
  const artH = Math.min(width * 0.88, height * 0.46, 480);
  const atEnd = index === last;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={themeName === 'night' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
      {start !== null && (
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={start}
          keyExtractor={(it, i) => (it.kind === 'page' ? `p${it.page.position}` : `end${i}`)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== index) onIndex(i);
          }}
          renderItem={({ item, index: at }) =>
            item.kind === 'page' ? (
              <View style={{ width, height: listH }}>
                <Picture uri={item.page.imageUrl} art={item.page.art} style={{ width, height: artH + insets.top, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }} />
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.textWrap}>
                  <View style={styles.column}>
                  <ChapterHeading chapters={chapters} at={at} color={theme.ink} muted={theme.muted} onOpen={() => setChapterSheet(true)} />
                  <Text accessibilityRole="text" style={[styles.text, { fontSize, lineHeight: fontSize * 1.5, color: theme.ink }]}>
                    {splitByWords(item.page.text, wordPages.filter((x) => x.at === at).map((x) => ({ id: x.w.id, word: x.w.word }))).map((seg, k) =>
                      seg.wordId ? (
                        <Text
                          key={k}
                          accessibilityRole="button"
                          accessibilityLabel={`${seg.text}. New word. Tap to learn what it means`}
                          onPress={() => setWordSheet(words.filter((w) => w.id === seg.wordId))}
                          style={styles.hot}
                        >{seg.text}</Text>
                      ) : seg.text,
                    )}
                  </Text>
                  {wordPages.filter((x) => x.at === at).map(({ w }) => (
                    <Tap
                      key={w.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Explore the word ${w.word}`}
                      onPress={() => setWordSheet([w])}
                      style={styles.explore}
                    >
                      <Ionicons name="search" size={18} color={colors.secondaryDeep} />
                      <Text style={styles.exploreText}>Explore the word “{w.word}”</Text>
                      {hasLearned(w.id) && <Ionicons name="checkmark-circle" size={18} color={colors.secondaryDeep} />}
                    </Tap>
                  ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={{ width, height: listH }} contentContainerStyle={[styles.end, { paddingTop: insets.top + 56 }]}>
                {burst && at === last && <StarBurst />}
                <Text style={{ fontSize: 64 }}>🌟</Text>
                <Text style={[styles.endTitle, { color: theme.ink }]}>The End</Text>
                <Text style={[styles.endSub, { color: theme.muted }]}>You finished "{story?.title}". Great reading!</Text>
                {freshBadges.length > 0 && (
                  <View style={styles.newBadge} accessibilityLiveRegion="polite">
                    <Text style={styles.newBadgeKick}>NEW {freshBadges.length === 1 ? 'BADGE' : 'BADGES'}!</Text>
                    {freshBadges.map((b) => (
                      <View key={b.id} style={styles.newBadgeRow} accessibilityLabel={`${b.title}. ${b.hint}`}>
                        <Text style={{ fontSize: 34 }}>{b.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.newBadgeTitle}>{b.title}</Text>
                          <Text style={styles.newBadgeHint}>{b.hint}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {stats.week > 0 && (
                  <Text style={[styles.endStat, { color: theme.ink }]}>{stats.week === 1 ? '1 story' : `${stats.week} stories`} finished this week</Text>
                )}
                {words.length > 0 && (
                  <View style={styles.endWords}>
                    <Text style={[styles.endWordsTitle, { color: theme.ink }]}>{words.length === 1 ? 'Your new word' : 'Your new words'}</Text>
                    <View style={styles.endChips}>
                      {words.map((w) => (
                        <Tap key={w.id} accessibilityRole="button" accessibilityLabel={`${w.word}${hasLearned(w.id) ? ', learned' : ''}. Tap to see what it means`} onPress={() => setWordSheet([w])} style={styles.wordChip}>
                          <Text style={styles.wordChipText}>{w.word}</Text>
                          {hasLearned(w.id) && <Ionicons name="checkmark-circle" size={16} color={colors.secondaryDeep} />}
                        </Tap>
                      ))}
                    </View>
                  </View>
                )}
                <View style={{ gap: 10, marginTop: 20, alignSelf: 'stretch', paddingHorizontal: space.lg }}>
                  <Button label="Read again" icon="refresh" variant="secondary" onPress={() => go(0)} />
                  <Button label="More stories" icon="library" onPress={() => router.dismissAll()} />
                </View>
              </ScrollView>
            )
          }
        />
      )}
      </View>

      {/* top controls float over the illustration */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Tap accessibilityRole="button" accessibilityLabel="Close story" onPress={() => router.back()} style={[styles.round, shadow.soft]}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Tap>
        <View style={styles.dots} accessibilityRole="progressbar" accessibilityLabel={`Page ${Math.min(index + 1, pages.length)} of ${pages.length}`}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i <= Math.min(index, pages.length - 1) && styles.dotOn]} />
          ))}
        </View>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`Reading theme: ${themeName}. Tap to change`}
          onPress={() => setThemeName(THEMES[(THEMES.indexOf(themeName) + 1) % THEMES.length])}
          style={[styles.round, shadow.soft]}
        >
          <Ionicons name={theme.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.ink} />
        </Tap>
      </View>

      {story && <WordSheet story={story} words={wordSheet} onClose={() => setWordSheet(null)} />}
      <ChapterSheet
        visible={chapterSheet}
        chapters={chapters}
        currentIndex={chapterAt(chapters, Math.min(index, pages.length - 1))?.index}
        onPick={(c: Chapter) => { setChapterSheet(false); go(c.firstPage); }}
        onClose={() => setChapterSheet(false)}
      />

      {/* bottom bar */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14, backgroundColor: theme.bg }]}>
        <View style={styles.size}>
          <Tap accessibilityRole="button" accessibilityLabel="Smaller text" onPress={() => setDelta((d) => Math.max(MIN_DELTA, d - 2))} style={styles.sizeBtn}>
            <Text style={[styles.sizeTxt, { fontSize: 14 }]}>A</Text>
          </Tap>
          <Tap accessibilityRole="button" accessibilityLabel="Larger text" onPress={() => setDelta((d) => Math.min(MAX_DELTA, d + 2))} style={styles.sizeBtn}>
            <Text style={[styles.sizeTxt, { fontSize: 22 }]}>A</Text>
          </Tap>
        </View>
        <View style={{ flex: 1 }} />
        <Tap accessibilityRole="button" accessibilityLabel="Previous page" disabled={index === 0} onPress={() => go(index - 1)} style={[styles.nav, styles.prev, index === 0 && { opacity: 0.35 }]}>
          <Ionicons name="arrow-back" size={26} color={colors.primaryDeep} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={atEnd ? 'The end' : 'Next page'} disabled={atEnd} onPress={() => go(index + 1)} style={[styles.nav, styles.next, shadow.soft, atEnd && { opacity: 0.35 }]}>
          <Ionicons name="arrow-forward" size={26} color={colors.onAction} />
        </Tap>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  top: { position: 'absolute', top: 0, left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(35,35,35,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  dot: { width: 22, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { backgroundColor: colors.amber },
  // a comfortable reading column: on a tablet or computer the text stays centred instead of running edge to edge
  column: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  textWrap: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 110 },
  text: { fontFamily: fonts.bold, textAlign: 'justify' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingTop: 10 },
  size: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: radius.pill, padding: 4 },
  sizeBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sizeTxt: { fontFamily: fonts.black, color: colors.primaryDeep },
  nav: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  prev: { backgroundColor: colors.primarySoft },
  next: { backgroundColor: colors.action },
  chapter: { marginBottom: space.md, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  chapterNo: { ...type.label },
  chapterTitle: { ...type.display, fontSize: 28, marginTop: 2 },
  hot: { backgroundColor: colors.amberSoft, color: colors.ink, textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  explore: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, marginTop: space.lg, borderRadius: radius.pill, backgroundColor: colors.secondarySoft },
  exploreText: { fontFamily: fonts.bold, fontSize: 15, color: colors.secondaryDeep },
  end: { alignItems: 'center', justifyContent: 'center', paddingBottom: 120, flexGrow: 1 },
  newBadge: { alignSelf: 'stretch', marginHorizontal: space.lg, marginTop: space.md, padding: 14, borderRadius: radius.lg, backgroundColor: colors.amberSoft, gap: 8 },
  newBadgeKick: { ...type.label, color: '#7a5a00', textAlign: 'center' },
  newBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  newBadgeTitle: { ...type.heading, color: colors.ink },
  newBadgeHint: { ...type.small, color: colors.ink },
  endStat: { ...type.heading, marginTop: 14 },
  endWords: { alignItems: 'center', marginTop: space.lg, paddingHorizontal: space.lg },
  endWordsTitle: { ...type.heading },
  endChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  wordChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.secondarySoft },
  wordChipText: { fontFamily: fonts.black, fontSize: 17, color: colors.secondaryDeep },
  endTitle: { ...type.display, fontSize: 40, marginTop: 8 },
  endSub: { ...type.body, textAlign: 'center', marginTop: 6, paddingHorizontal: space.lg },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: 12, backgroundColor: colors.bg },
  lockBadge: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { ...type.title, color: colors.ink, textAlign: 'center' },
  lockedText: { ...type.body, color: colors.muted, textAlign: 'center', marginBottom: 8 },
}));
