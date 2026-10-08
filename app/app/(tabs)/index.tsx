import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { Picture } from '../../src/components/Picture';
import { Section } from '../../src/components/Section';
import { openStory, StoryCard } from '../../src/components/StoryCard';
import { Tap } from '../../src/components/Tap';
import { getHome } from '../../src/data/repository';
import { useGate } from '../../src/state/gate';
import { useAgeBand, useProfiles } from '../../src/state/profiles';
import { colors, radius, shadow, space, type } from '../../src/theme';
import type { HomeData, Story } from '../../src/types';

function Shelf({ stories }: { stories: Story[] }) {
  if (!stories.length) return <Text style={styles.none}>Nothing here yet. Try another category.</Text>;
  return (
    <FlatList
      horizontal
      data={stories}
      keyExtractor={(s) => s.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.md, gap: 14 }}
      renderItem={({ item }) => <StoryCard story={item} />}
    />
  );
}

function WeekHero({ story }: { story: Story }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`Title of the week: ${story.title}`} onPress={() => openStory(story.slug)} style={[styles.hero, shadow.lift]} scaleTo={0.98}>
      {/* art owns the upper part so the title never sits on top of the illustration */}
      <Picture uri={story.coverUrl} art={story.art} style={styles.heroArt} />
      <LinearGradient colors={['rgba(42,24,54,0)', 'rgba(42,24,54,1)']} locations={[0.34, 0.66]} style={StyleSheet.absoluteFill} />
      <View style={styles.pill}>
        <Ionicons name="star" size={13} color={colors.onAmber} />
        <Text style={styles.pillText}>TITLE OF THE WEEK</Text>
      </View>
      <View style={styles.heroBody}>
        <Text style={styles.heroTitle} numberOfLines={2}>{story.title}</Text>
        <Text style={styles.heroSub} numberOfLines={2}>{story.synopsis}</Text>
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          <Button label="Read now" icon="book" onPress={() => openStory(story.slug)} style={{ minHeight: 46 }} />
        </View>
      </View>
    </Tap>
  );
}

function MonthCard({ story }: { story: Story }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`Title of the month: ${story.title}`} onPress={() => openStory(story.slug)} style={[styles.month, shadow.soft]}>
      <Picture uri={story.coverUrl} art={story.art} style={styles.monthArt} />
      <View style={{ flex: 1 }}>
        <View style={styles.tealPill}>
          <Ionicons name="calendar" size={12} color={colors.onTeal} />
          <Text style={styles.tealPillText}>TITLE OF THE MONTH</Text>
        </View>
        <Text style={styles.monthTitle} numberOfLines={2}>{story.title}</Text>
        <Text style={styles.monthMeta}>Ages {story.ageBand} · {story.readingMinutes} min read</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.lock} />
    </Tap>
  );
}

export default function Home() {
  const band = useAgeBand();
  const { active } = useProfiles();
  const ask = useGate();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(false);
    getHome(band).then(setData).catch(() => setError(true));
  }, [band]);

  const filter = (list: Story[]) => (category ? list.filter((s) => s.categories.includes(category)) : list);
  const switchChild = async () => {
    if (await ask()) router.push('/profile/switch');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.purpleSoft, colors.bg]} style={styles.wash} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hi}>Hi{active ? `, ${active.name}` : ''}! 👋</Text>
            <Text style={styles.hiSub}>What shall we read today?</Text>
          </View>
          {active && (
            <Tap accessibilityRole="button" accessibilityLabel={`Reading as ${active.name}. Switch reader (grown-ups only)`} onPress={switchChild} style={styles.avatarBtn}>
              <Avatar id={active.avatar} size={48} ring={colors.surface} />
            </Tap>
          )}
        </View>

        {error && (
          <>
            <EmptyState emoji="🛜" title="Can't reach the library" body="Check your connection and try again." />
            <View style={{ alignItems: 'center' }}>
              <Button label="Try again" variant="secondary" onPress={() => { setError(false); getHome(band).then(setData).catch(() => setError(true)); }} />
            </View>
          </>
        )}
        {!data && !error && <ActivityIndicator style={{ marginTop: 80 }} color={colors.purple} />}

        {data && (
          <>
            {data.week && <WeekHero story={data.week} />}
            {data.month && <MonthCard story={data.month} />}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginTop: space.xl }}>
              <Chip label="All" icon="apps" active={category === null} onPress={() => setCategory(null)} />
              {data.categories.map((c) => (
                <Chip key={c.slug} label={c.name} icon={c.icon} active={category === c.slug} onPress={() => setCategory(c.slug)} />
              ))}
            </ScrollView>

            <Section title="Popular right now" subtitle="Most read this month">
              <Shelf stories={filter(data.popular)} />
            </Section>
            <Section title="New stories" subtitle="Fresh off the press">
              <Shelf stories={filter(data.latest)} />
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, marginBottom: space.md },
  hi: { ...type.display, color: colors.ink },
  hiSub: { ...type.body, color: colors.muted, marginTop: 2 },
  avatarBtn: { borderRadius: 30, ...shadow.soft },
  hero: { marginHorizontal: space.md, aspectRatio: 0.92, borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#2a1836' },
  heroArt: { position: 'absolute', top: 0, left: 0, right: 0, height: '66%' },
  pill: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.amber, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  pillText: { ...type.label, color: colors.onAmber },
  heroBody: { padding: 20 },
  heroTitle: { ...type.display, color: '#fff' },
  heroSub: { ...type.body, color: 'rgba(255,255,255,0.88)', marginTop: 4 },
  month: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: space.md, marginTop: 14, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface },
  monthArt: { width: 84, height: 84, borderRadius: radius.md },
  tealPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tealSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  tealPillText: { ...type.label, fontSize: 10, color: '#0b6f6b' },
  monthTitle: { ...type.heading, color: colors.ink, marginTop: 6 },
  monthMeta: { ...type.small, color: colors.muted, marginTop: 2 },
  chips: { paddingHorizontal: space.md, gap: 10 },
  none: { ...type.body, color: colors.muted, paddingHorizontal: space.md },
});
