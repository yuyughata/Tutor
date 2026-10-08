import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { StoryCard } from '../../src/components/StoryCard';
import { getStories } from '../../src/data/repository';
import { useDownloads } from '../../src/data/downloads';
import { useLibrary } from '../../src/state/library';
import { useReadingLevel } from '../../src/state/profiles';
import { colors, fonts, radius, space, type } from '../../src/theme';
import type { Story } from '../../src/types';

type Tab = 'continue' | 'favorites' | 'finished' | 'saved';
const COPY: Record<Tab, { emoji: string; title: string; body: string }> = {
  continue: { emoji: '📖', title: 'Nothing in progress', body: 'Start a story and it will wait for you here.' },
  favorites: { emoji: '💜', title: 'No favourites yet', body: 'Tap the heart on any story to keep it close.' },
  finished: { emoji: '🏆', title: 'No finished stories yet', body: 'Reach The End and your story lands here.' },
  saved: { emoji: '⬇️', title: 'Nothing saved for offline', body: 'Open a story and choose "Save for offline" to read it without a connection.' },
};
const TABS: { id: Tab; label: string }[] = [
  { id: 'continue', label: 'Reading' }, { id: 'favorites', label: 'Favourites' }, { id: 'finished', label: 'Finished' }, { id: 'saved', label: 'Saved' },
];

export default function Library() {
  const level = useReadingLevel();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { favorites, progress } = useLibrary();
  const downloads = useDownloads();
  const [tab, setTab] = useState<Tab>('continue');
  const [q, setQ] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(() => getStories(level).then(setStories).catch(() => setStories([])), [level]);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  const shown = useMemo(() => {
    const by = (s: Story) => progress[s.slug];
    // Saved stories come from the device, so this tab works with no connection at all.
    let list: Story[] =
      tab === 'saved' ? downloads.list.map((d) => d.story)
      : tab === 'favorites' ? stories.filter((s) => favorites.includes(s.slug))
      : tab === 'finished' ? stories.filter((s) => by(s)?.finished)
      : stories.filter((s) => by(s) && !by(s).finished);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((s) => s.title.toLowerCase().includes(needle));
    return list;
  }, [tab, stories, favorites, progress, downloads.list, q]);

  const gap = 14;
  const cardW = (Math.min(width, 640) - space.md * 2 - gap) / 2;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} colors={[colors.purple]} />}
    >
      <Text accessibilityRole="header" style={styles.title}>My books</Text>
      <OfflineBanner />

      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} accessibilityElementsHidden />
        <TextInput value={q} onChangeText={setQ} placeholder="Search my books" placeholderTextColor={colors.lock} accessibilityLabel="Search my books" returnKeyType="search" style={styles.input} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => <Chip key={t.id} label={t.label} active={tab === t.id} onPress={() => setTab(t.id)} />)}
      </ScrollView>

      {shown.length === 0 ? (
        <EmptyState {...(q.trim() ? { emoji: '🔎', title: 'No matches', body: `Nothing in this list matches "${q.trim()}".` } : COPY[tab])} />
      ) : (
        <View style={[styles.grid, { gap }]}>
          {shown.map((s) => {
            const saved = downloads.isSaved(s.slug);
            return (
              <View key={s.id} style={{ width: cardW }}>
                <StoryCard story={s} width={cardW} />
                {saved && tab !== 'saved' && <Text style={styles.savedTag} accessibilityLabel="Saved for offline">⬇ Saved</Text>}
                {tab === 'continue' && progress[s.slug] && (
                  <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={`Page ${progress[s.slug].page + 1} of ${s.pageCount}`}>
                    <View style={[styles.fill, { width: `${Math.min(100, ((progress[s.slug].page + 1) / Math.max(1, s.pageCount)) * 100)}%` }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.ink, paddingHorizontal: space.md, marginBottom: space.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: space.md, paddingHorizontal: 16, minHeight: 50, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  input: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  tabs: { gap: 8, paddingHorizontal: space.md, marginTop: space.md, marginBottom: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.md },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.teal, borderRadius: 3 },
  savedTag: { ...type.small, color: colors.tealDeep, fontFamily: fonts.bold, marginTop: 4 },
});
