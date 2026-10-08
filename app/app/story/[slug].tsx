import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Picture } from '../../src/components/Picture';
import { Tap } from '../../src/components/Tap';
import { getHome, getStory } from '../../src/data/repository';
import { useAuth } from '../../src/state/auth';
import { useGate } from '../../src/state/gate';
import { useLibrary } from '../../src/state/library';
import { useAgeBand } from '../../src/state/profiles';
import { colors, radius, shadow, space, type } from '../../src/theme';
import type { Category, Story } from '../../src/types';

function Fact({ icon, label, bg, fg }: { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.fact, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={fg} />
      <Text style={[styles.factText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function StoryDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ask = useGate();
  const band = useAgeBand();
  const { canRead } = useAuth();
  const { isFavorite, toggleFavorite, progress } = useLibrary();
  const [story, setStory] = useState<Story | null | undefined>(undefined);
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    getStory(slug).then(setStory).catch(() => setStory(null));
    getHome(band).then((h) => setCats(h.categories)).catch(() => {});
  }, [slug, band]);

  if (story === undefined) return <ActivityIndicator style={{ marginTop: 160 }} color={colors.purple} />;
  if (story === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState emoji="🔎" title="Story not found" body="It may have been moved. Head back and pick another." />
        <View style={{ alignItems: 'center' }}><Button label="Go back" onPress={() => router.back()} /></View>
      </View>
    );
  }

  const fav = isFavorite(story.slug);
  const p = progress[story.slug];
  const readable = canRead(story);
  const heroH = Math.min(width, 520) * 0.92;
  const resume = p && !p.finished && p.page > 0;

  const read = () => router.push({ pathname: '/read/[slug]', params: { slug: story.slug } });
  const unlock = async () => {
    if (await ask()) router.dismissTo('/grownups');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: heroH }}>
          <Picture uri={story.coverUrl} art={story.art} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(35,35,35,0.35)', 'transparent']} style={[styles.topShade, { height: insets.top + 90 }]} />
        </View>

        <View style={[styles.sheet, shadow.lift]}>
          <Text style={styles.title} accessibilityRole="header">{story.title}</Text>
          <Text style={styles.by}>by {story.author}</Text>

          <View style={styles.facts}>
            <Fact icon="happy" label={`Ages ${story.ageBand}`} bg={colors.purpleSoft} fg={colors.purpleDeep} />
            <Fact icon="albums" label={`${story.pageCount} pages`} bg={colors.tealSoft} fg="#0b6f6b" />
            <Fact icon="time" label={`${story.readingMinutes} min`} bg={colors.amberSoft} fg="#7a5a00" />
          </View>

          <Text style={styles.synopsis}>{story.synopsis}</Text>

          {story.categories.length > 0 && (
            <View style={styles.tags}>
              {story.categories.map((c) => (
                <Text key={c} style={styles.tag}>#{cats.find((x) => x.slug === c)?.name ?? c}</Text>
              ))}
            </View>
          )}

          <View style={{ marginTop: space.lg, gap: 10 }}>
            {readable ? (
              <Button label={resume ? `Continue from page ${p.page + 1}` : p?.finished ? 'Read again' : 'Start reading'} icon="book" onPress={read} />
            ) : (
              <>
                <View style={styles.premium}>
                  <Ionicons name="lock-closed" size={18} color={colors.purpleDeep} />
                  <Text style={styles.premiumText}>This is a Premium story. A grown-up can unlock it by signing in.</Text>
                </View>
                <Button label="Ask a grown-up" icon="shield-checkmark" onPress={unlock} />
              </>
            )}
            <View style={styles.soonRow}>
              {(['Listen', 'Watch'] as const).map((l) => (
                <View key={l} accessibilityState={{ disabled: true }} accessibilityLabel={`${l}, coming soon`} style={styles.soon}>
                  <Ionicons name={l === 'Listen' ? 'headset' : 'play-circle'} size={18} color={colors.lock} />
                  <Text style={styles.soonText}>{l} · soon</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Tap accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.round, shadow.soft]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={fav ? 'Remove from favourites' : 'Add to favourites'}
          accessibilityState={{ selected: fav }}
          onPress={() => toggleFavorite(story)}
          style={[styles.round, shadow.soft]}
        >
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={24} color={fav ? colors.purple : colors.ink} />
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  sheet: { flexGrow: 1, paddingBottom: 48, marginTop: -36, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, paddingTop: space.lg },
  title: { ...type.display, fontSize: 28, color: colors.ink },
  by: { ...type.body, color: colors.muted, marginTop: 2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.pill },
  factText: { ...type.heading, fontSize: 14 },
  synopsis: { ...type.body, fontSize: 17, lineHeight: 26, color: colors.ink, marginTop: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  tag: { ...type.heading, fontSize: 14, color: colors.purpleDeep },
  premium: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.purpleSoft, borderRadius: radius.md, padding: 14 },
  premiumText: { ...type.body, flex: 1, color: colors.ink },
  soonRow: { flexDirection: 'row', gap: 10 },
  soon: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: radius.pill, backgroundColor: colors.border },
  soonText: { ...type.heading, fontSize: 14, color: colors.lock },
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
});
