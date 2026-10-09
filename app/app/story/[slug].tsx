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
import { formatBytes, removeStory, saveStory, useDownloads } from '../../src/data/downloads';
import { getChapters, getHome, getPages, getStory, getWords } from '../../src/data/repository';
import { levelFull } from '../../src/levels';
import { useAuth } from '../../src/state/auth';
import { useGate } from '../../src/state/gate';
import { useLibrary } from '../../src/state/library';
import { useReadingLevel } from '../../src/state/profiles';
import { colors, fonts, radius, shadow, space, type, themed } from '../../src/theme';
import type { Chapter } from '../../src/lib/story';
import type { Category, Story, StoryWord } from '../../src/types';
import { useTheme } from '../../src/state/theme';

function Fact({ icon, label, bg, fg }: { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.fact, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={fg} />
      <Text style={[styles.factText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function StoryDetail() {
  useTheme(); // re-render when the theme changes
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ask = useGate();
  const band = useReadingLevel();
  const { canRead } = useAuth();
  const { isFavorite, toggleFavorite, progress } = useLibrary();
  const [story, setStory] = useState<Story | null | undefined>(undefined);
  const [cats, setCats] = useState<Category[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [words, setWords] = useState<StoryWord[]>([]);
  const downloads = useDownloads();
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getStory(slug).then(setStory).catch(() => setStory(null));
    getHome(band).then((h) => setCats(h.categories)).catch(() => {});
  }, [slug, band]);

  useEffect(() => {
    if (!story) return;
    getChapters(story).then(setChapters).catch(() => setChapters([]));
    getWords(story).then(setWords).catch(() => setWords([]));
  }, [story]);

  if (story === undefined) return <ActivityIndicator style={{ marginTop: 160 }} color={colors.primary} />;
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

  const savedInfo = downloads.saved[story.slug];
  const progressNow = downloads.progress(story.slug);
  const toggleSave = async () => {
    setSaveError(null);
    if (savedInfo) return removeStory(story.slug);
    try {
      const pages = await getPages(story, { fresh: true });
      if (!pages.length) throw new Error('empty');
      await saveStory(story, pages, await getWords(story));
    } catch {
      setSaveError("Couldn't save this story. Check your connection and try again.");
    }
  };
  const read = (page?: number) => router.push({ pathname: '/read/[slug]', params: page === undefined ? { slug: story.slug } : { slug: story.slug, page: String(page) } });
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
            <Fact icon="sparkles" label={levelFull(story.level)} bg={colors.primarySoft} fg={colors.primaryDeep} />
            <Fact icon="albums" label={`${story.pageCount} pages`} bg={colors.secondarySoft} fg={colors.secondaryDeep} />
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

          {chapters.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle} accessibilityRole="header">Chapters</Text>
              {chapters.map((c) => (
                <Tap
                  key={c.index}
                  accessibilityRole="button"
                  accessibilityLabel={readable ? `Read chapter ${c.index}: ${c.title}` : `Chapter ${c.index}: ${c.title}`}
                  accessibilityState={{ disabled: !readable }}
                  disabled={!readable}
                  onPress={() => read(c.firstPage)}
                  style={styles.chapterRow}
                >
                  <View style={styles.chapterNum}><Text style={styles.chapterNumText}>{c.index}</Text></View>
                  <Text style={styles.chapterName}>{c.title}</Text>
                  {readable && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
                </Tap>
              ))}
            </View>
          )}

          {words.length > 0 && (
            <View style={styles.wordsCard} accessibilityLabel={`New ${words.length === 1 ? 'word' : 'words'} to explore: ${words.map((w) => w.word).join(', ')}`}>
              <Ionicons name="search" size={18} color={colors.secondaryDeep} />
              <View style={{ flex: 1 }}>
                <Text style={styles.wordsTitle}>{words.length === 1 ? 'A new word to explore' : `${words.length} new words to explore`}</Text>
                <Text style={styles.wordsList}>{words.map((w) => w.word).join(' · ')}</Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: space.lg, gap: 10 }}>
            {readable ? (
              <Button label={resume ? `Continue from page ${p.page + 1}` : p?.finished ? 'Read again' : 'Start reading'} icon="book" onPress={() => read()} />
            ) : (
              <>
                <View style={styles.premium}>
                  <Ionicons name="lock-closed" size={18} color={colors.primaryDeep} />
                  <Text style={styles.premiumText}>This is a Premium story. A grown-up can unlock it by signing in.</Text>
                </View>
                <Button label="Ask a grown-up" icon="shield-checkmark" onPress={unlock} />
              </>
            )}
            {readable && (
              <>
                <Button
                  label={progressNow !== undefined ? `Saving… ${Math.round(progressNow * 100)}%` : savedInfo ? `Saved for offline · ${formatBytes(savedInfo.bytes)}` : 'Save for offline'}
                  icon={savedInfo ? 'checkmark-circle' : 'cloud-download-outline'}
                  variant="secondary"
                  disabled={progressNow !== undefined}
                  onPress={toggleSave}
                />
                {savedInfo && <Text style={styles.savedHint}>Tap again to remove it from this device.</Text>}
                {saveError && <Text style={styles.saveErr} accessibilityRole="alert" accessibilityLiveRegion="polite">{saveError}</Text>}
              </>
            )}
            <View style={styles.soonRow}>
              {(['Listen', 'Watch'] as const).map((l) => (
                <View key={l} accessibilityState={{ disabled: true }} accessibilityLabel={`${l}, coming soon`} style={styles.soon}>
                  <Ionicons name={l === 'Listen' ? 'headset' : 'play-circle'} size={18} color="#5a5360" />
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
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={24} color={fav ? colors.primary : colors.ink} />
        </Tap>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  sheet: { flexGrow: 1, paddingBottom: 48, marginTop: -36, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, paddingTop: space.lg },
  title: { ...type.display, fontSize: 28, color: colors.ink },
  by: { ...type.body, color: colors.muted, marginTop: 2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.pill },
  factText: { ...type.heading, fontSize: 14 },
  synopsis: { ...type.body, fontSize: 17, lineHeight: 26, color: colors.ink, marginTop: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  tag: { ...type.heading, fontSize: 14, color: colors.primaryDeep },
  block: { marginTop: space.lg, gap: 8 },
  blockTitle: { ...type.title, color: colors.ink, marginBottom: 2 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  chapterNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  chapterNumText: { fontFamily: fonts.black, fontSize: 15, color: colors.onPrimary },
  chapterName: { ...type.heading, flex: 1, color: colors.ink },
  wordsCard: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: space.lg, padding: 14, borderRadius: radius.md, backgroundColor: colors.secondarySoft },
  wordsTitle: { ...type.heading, color: colors.secondaryDeep },
  wordsList: { fontFamily: fonts.black, fontSize: 17, color: colors.ink, marginTop: 2 },
  premium: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 14 },
  premiumText: { ...type.body, flex: 1, color: colors.ink },
  savedHint: { ...type.small, color: colors.muted, textAlign: 'center' },
  saveErr: { ...type.small, color: colors.danger, textAlign: 'center' },
  soonRow: { flexDirection: 'row', gap: 10 },
  soon: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: radius.pill, backgroundColor: '#f1ebf4' },
  soonText: { ...type.heading, fontSize: 14, color: '#5a5360' },
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
}));
