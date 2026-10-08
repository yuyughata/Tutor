import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Picture } from '../../src/components/Picture';
import { Tap } from '../../src/components/Tap';
import { getPages, getStory } from '../../src/data/repository';
import { useLibrary } from '../../src/state/library';
import { useAgeBand } from '../../src/state/profiles';
import { colors, fonts, radius, readerFontBase, readerThemes, shadow, space, type, type ReaderThemeName } from '../../src/theme';
import type { Story, StoryPage } from '../../src/types';

const MIN_DELTA = -4;
const MAX_DELTA = 10;
const THEMES: ReaderThemeName[] = ['day', 'sepia', 'night'];

type Item = { kind: 'page'; page: StoryPage } | { kind: 'end' };

export default function Reader() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const band = useAgeBand();
  const { progress, saveProgress, trackStart } = useLibrary();
  const listRef = useRef<FlatList<Item>>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [pages, setPages] = useState<StoryPage[] | null>(null);
  const [index, setIndex] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [delta, setDelta] = useState(0);
  const [themeName, setThemeName] = useState<ReaderThemeName>('day');
  const theme = readerThemes[themeName];

  useEffect(() => {
    (async () => {
      const s = await getStory(slug);
      setStory(s);
      const p = s ? await getPages(s) : [];
      setPages(p);
      if (s && p.length) {
        const saved = progress[s.slug];
        const at = saved && !saved.finished ? Math.min(saved.page, p.length - 1) : 0;
        setStart(at);
        setIndex(at);
        trackStart(s);
      }
    })().catch(() => setPages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const items: Item[] = pages ? [...pages.map((page) => ({ kind: 'page' as const, page })), { kind: 'end' as const }] : [];
  const last = items.length - 1;

  const onIndex = useCallback((i: number) => {
    setIndex(i);
    if (story && pages) saveProgress(story, Math.min(i, pages.length - 1), i >= pages.length);
  }, [story, pages, saveProgress]);

  const go = (i: number) => {
    const to = Math.max(0, Math.min(last, i));
    listRef.current?.scrollToIndex({ index: to, animated: true });
    onIndex(to);
  };

  if (!pages) return <ActivityIndicator style={{ marginTop: 160 }} color={colors.purple} />;

  if (pages.length === 0) {
    return (
      <View style={styles.locked}>
        <View style={styles.lockBadge}><Ionicons name="lock-closed" size={36} color={colors.purpleDeep} /></View>
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
          renderItem={({ item }) =>
            item.kind === 'page' ? (
              <View style={{ width, flex: 1 }}>
                <Picture uri={item.page.imageUrl} art={item.page.art} style={{ width, height: artH + insets.top, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }} />
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.textWrap}>
                  <Text accessibilityRole="text" style={[styles.text, { fontSize, lineHeight: fontSize * 1.5, color: theme.ink }]}>{item.page.text}</Text>
                </ScrollView>
              </View>
            ) : (
              <View style={[styles.end, { width, paddingTop: insets.top + 80 }]}>
                <Text style={{ fontSize: 76 }}>🌟</Text>
                <Text style={[styles.endTitle, { color: theme.ink }]}>The End</Text>
                <Text style={[styles.endSub, { color: theme.muted }]}>You finished "{story?.title}". Great reading!</Text>
                <View style={{ gap: 10, marginTop: 20, alignSelf: 'stretch', paddingHorizontal: space.lg }}>
                  <Button label="Read again" icon="refresh" variant="secondary" onPress={() => go(0)} />
                  <Button label="More stories" icon="library" onPress={() => router.dismissAll()} />
                </View>
              </View>
            )
          }
        />
      )}

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

      {/* bottom bar */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
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
          <Ionicons name="arrow-back" size={26} color={colors.purpleDeep} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={atEnd ? 'The end' : 'Next page'} disabled={atEnd} onPress={() => go(index + 1)} style={[styles.nav, styles.next, shadow.soft, atEnd && { opacity: 0.35 }]}>
          <Ionicons name="arrow-forward" size={26} color={colors.onPurple} />
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(35,35,35,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  dot: { width: 22, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { backgroundColor: colors.amber },
  textWrap: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 110 },
  text: { fontFamily: fonts.bold, textAlign: 'left' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.md, paddingTop: 10 },
  size: { flexDirection: 'row', backgroundColor: colors.purpleSoft, borderRadius: radius.pill, padding: 4 },
  sizeBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sizeTxt: { fontFamily: fonts.black, color: colors.purpleDeep },
  nav: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  prev: { backgroundColor: colors.purpleSoft },
  next: { backgroundColor: colors.purple },
  end: { alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  endTitle: { ...type.display, fontSize: 40, marginTop: 8 },
  endSub: { ...type.body, textAlign: 'center', marginTop: 6, paddingHorizontal: space.lg },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: 12, backgroundColor: colors.bg },
  lockBadge: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { ...type.title, color: colors.ink, textAlign: 'center' },
  lockedText: { ...type.body, color: colors.muted, textAlign: 'center', marginBottom: 8 },
});
