import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPages, getStory } from '../../src/data/repository';
import { useProfile } from '../../src/profile';
import { colors, radius, readerFontBase, space } from '../../src/theme';
import type { Story, StoryPage } from '../../src/types';

const MIN_DELTA = -4;
const MAX_DELTA = 10;

export default function Reader() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { ageBand } = useProfile();
  const listRef = useRef<FlatList<StoryPage>>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [pages, setPages] = useState<StoryPage[] | null>(null);
  const [index, setIndex] = useState(0);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await getStory(slug);
      setStory(s);
      setPages(s ? await getPages(s) : []);
    })().catch(() => setPages([]));
  }, [slug]);

  if (!pages) return <ActivityIndicator style={{ marginTop: 120 }} color={colors.primaryDark} />;

  if (pages.length === 0) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>{story?.title ?? 'Story'}</Text>
        {/* No prices or purchase links in the app. */}
        <Text style={styles.lockedText}>Ask a grown-up to sign in to read this story.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const fontSize = readerFontBase[ageBand] + delta;
  const last = pages.length - 1;
  const go = (i: number) => listRef.current?.scrollToIndex({ index: Math.max(0, Math.min(last, i)), animated: true });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: pages.length, now: index + 1 }}>
          <View style={[styles.fill, { width: `${((index + 1) / pages.length) * 100}%` }]} />
        </View>
        <Text style={styles.count}>{index + 1}/{pages.length}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => String(p.position)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <View style={{ width }}>
            <Image source={item.imageUrl} style={{ width, aspectRatio: 4 / 3 }} contentFit="cover" />
            <View style={styles.textWrap}>
              <Text style={[styles.text, { fontSize, lineHeight: fontSize * 1.45 }]}>{item.text}</Text>
              {i === last && <Text style={styles.end}>The End 🌙</Text>}
            </View>
          </View>
        )}
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Smaller text" onPress={() => setDelta((d) => Math.max(MIN_DELTA, d - 2))} style={styles.round}>
          <Text style={styles.roundText}>−</Text>
        </Pressable>
        <View style={styles.nav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous page" disabled={index === 0} onPress={() => go(index - 1)} style={[styles.navBtn, index === 0 && { opacity: 0.35 }]}>
            <Text style={styles.navText}>‹ Back</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next page" disabled={index === last} onPress={() => go(index + 1)} style={[styles.navBtn, styles.navPrimary, index === last && { opacity: 0.35 }]}>
            <Text style={[styles.navText, { color: '#fff' }]}>Next ›</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Larger text" onPress={() => setDelta((d) => Math.min(MAX_DELTA, d + 2))} style={styles.round}>
          <Text style={styles.roundText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingBottom: 8 },
  close: { fontSize: 20, color: colors.ink },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  count: { color: colors.muted, fontVariant: ['tabular-nums'] },
  textWrap: { padding: space.lg, flex: 1 },
  text: { color: colors.ink },
  end: { marginTop: space.lg, fontSize: 20, fontWeight: '800', color: colors.primaryDark, textAlign: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: 8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#CFE9E5', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 24, color: colors.primaryDark, fontWeight: '700' },
  nav: { flex: 1, flexDirection: 'row', gap: space.sm },
  navBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center', backgroundColor: '#F3F4F6' },
  navPrimary: { backgroundColor: colors.primaryDark },
  navText: { fontWeight: '800', color: colors.ink },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  lockedIcon: { fontSize: 48 },
  lockedTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  lockedText: { color: colors.muted, textAlign: 'center', fontSize: 16 },
  closeBtn: { marginTop: space.md, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.primaryDark },
  closeText: { color: '#fff', fontWeight: '800' },
});
