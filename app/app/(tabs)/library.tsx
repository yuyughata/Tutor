import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { StoryCard } from '../../src/components/StoryCard';
import { getStories } from '../../src/data/repository';
import { useLibrary } from '../../src/state/library';
import { useAgeBand } from '../../src/state/profiles';
import { colors, space, type } from '../../src/theme';
import type { Story } from '../../src/types';

type Tab = 'continue' | 'favorites' | 'finished';
const COPY: Record<Tab, { emoji: string; title: string; body: string }> = {
  continue: { emoji: '📖', title: 'Nothing in progress', body: 'Start a story and it will wait for you here.' },
  favorites: { emoji: '💜', title: 'No favourites yet', body: 'Tap the heart on any story to keep it close.' },
  finished: { emoji: '🏆', title: 'No finished stories yet', body: 'Reach The End and your story lands here.' },
};

export default function Library() {
  const band = useAgeBand();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { favorites, progress } = useLibrary();
  const [tab, setTab] = useState<Tab>('continue');
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    getStories(band).then(setStories).catch(() => setStories([]));
  }, [band]);

  const shown = useMemo(() => {
    const by = (s: Story) => progress[s.slug];
    if (tab === 'favorites') return stories.filter((s) => favorites.includes(s.slug));
    if (tab === 'finished') return stories.filter((s) => by(s)?.finished);
    return stories.filter((s) => by(s) && !by(s).finished);
  }, [tab, stories, favorites, progress]);

  const gap = 14;
  const cardW = (Math.min(width, 640) - space.md * 2 - gap) / 2;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>My books</Text>
      <View style={styles.tabs}>
        <Chip label="Reading" active={tab === 'continue'} onPress={() => setTab('continue')} />
        <Chip label="Favourites" active={tab === 'favorites'} onPress={() => setTab('favorites')} />
        <Chip label="Finished" active={tab === 'finished'} onPress={() => setTab('finished')} />
      </View>
      {shown.length === 0 ? (
        <EmptyState {...COPY[tab]} />
      ) : (
        <View style={[styles.grid, { gap }]}>
          {shown.map((s) => (
            <View key={s.id} style={{ width: cardW }}>
              <StoryCard story={s} width={cardW} />
              {tab === 'continue' && progress[s.slug] && (
                <View style={styles.track} accessibilityLabel={`Page ${progress[s.slug].page + 1} of ${s.pageCount}`}>
                  <View style={[styles.fill, { width: `${Math.min(100, ((progress[s.slug].page + 1) / s.pageCount) * 100)}%` }]} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.ink, paddingHorizontal: space.md },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: space.md, marginTop: space.md, marginBottom: space.lg, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.md },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.teal, borderRadius: 3 },
});
