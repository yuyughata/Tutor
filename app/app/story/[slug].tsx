import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStory } from '../../src/data/repository';
import { colors, radius, space } from '../../src/theme';
import type { Story } from '../../src/types';

export default function StoryDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [story, setStory] = useState<Story | null | undefined>(undefined);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    getStory(slug).then(setStory).catch(() => setStory(null));
  }, [slug]);

  if (story === undefined) return <ActivityIndicator style={{ marginTop: 120 }} color={colors.primaryDark} />;
  if (story === null) return <Text style={styles.empty}>Story not found.</Text>;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
      <View>
        <Image source={story.coverUrl} style={styles.cover} contentFit="cover" />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.meta}>
          {story.author} · Ages {story.ageBand} · {story.pageCount} pages · {story.readingMinutes} min
        </Text>
        <Text style={styles.synopsis}>{story.synopsis}</Text>

        <View style={styles.actions}>
          <Link href={{ pathname: '/read/[slug]', params: { slug: story.slug } }} asChild>
            <Pressable accessibilityRole="button" style={styles.read}>
              <Text style={styles.readText}>{story.isFree ? 'Read' : '🔒 Read'}</Text>
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fav ? 'Remove from favourites' : 'Add to favourites'}
            onPress={() => setFav((f) => !f)}
            style={styles.heart}
          >
            <Text style={{ fontSize: 22 }}>{fav ? '❤️' : '🤍'}</Text>
          </Pressable>
        </View>

        {/* Phase 2 and 3 slots */}
        <View style={styles.actions}>
          {['Listen', 'Watch'].map((label) => (
            <View key={label} accessibilityState={{ disabled: true }} style={styles.soon}>
              <Text style={styles.soonText}>{label} · soon</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 4 / 3 },
  back: { position: 'absolute', left: space.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, lineHeight: 30, color: colors.ink },
  body: { padding: space.md, gap: space.sm },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink },
  meta: { color: colors.muted },
  synopsis: { fontSize: 16, lineHeight: 24, color: colors.ink, marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  read: { flex: 1, backgroundColor: colors.primaryDark, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  readText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  heart: { width: 52, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  soon: { flex: 1, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', backgroundColor: '#E5E7EB' },
  soonText: { color: colors.lock, fontWeight: '600' },
  empty: { marginTop: 120, textAlign: 'center', color: colors.muted },
});
