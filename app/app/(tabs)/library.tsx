import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../src/components/Chip';
import { ProgressRing } from '../../src/components/ProgressRing';
import { gardenFor, goalProgress, unseenBadges } from '../../src/lib/badges';
import { EmptyState } from '../../src/components/EmptyState';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { StoryCard } from '../../src/components/StoryCard';
import { getStories } from '../../src/data/repository';
import { useDownloads } from '../../src/data/downloads';
import { useLibrary, type Award } from '../../src/state/library';
import { useReadingLevel } from '../../src/state/profiles';
import { colors, fonts, radius, space, type, themed } from '../../src/theme';
import type { Story } from '../../src/types';
import { useTheme } from '../../src/state/theme';

type Tab = 'continue' | 'favorites' | 'finished' | 'words' | 'saved';
const COPY: Record<Tab, { emoji: string; title: string; body: string }> = {
  continue: { emoji: '📖', title: 'Nothing in progress', body: 'Start a story and it will wait for you here.' },
  favorites: { emoji: '💜', title: 'No favourites yet', body: 'Tap the heart on any story to keep it close.' },
  finished: { emoji: '🏆', title: 'No finished stories yet', body: 'Reach The End and your story lands here.' },
  words: { emoji: '🔍', title: 'No words yet', body: 'Tap a glowing word in a story, then press "I learned it" to collect it here.' },
  saved: { emoji: '⬇️', title: 'Nothing saved for offline', body: 'Open a story and choose "Save for offline" to read it without a connection.' },
};
const awardTitle = (a: Award) =>
  a.kind === 'week' ? 'Top reader of the week' : a.kind === 'month' ? 'Top reader of the month' : a.kind === 'all_time' ? 'All-time top reader' : 'Special reading reward';
const TABS: { id: Tab; label: string }[] = [
  { id: 'continue', label: 'Reading' }, { id: 'favorites', label: 'Favourites' }, { id: 'finished', label: 'Finished' }, { id: 'words', label: 'Words' }, { id: 'saved', label: 'Saved' },
];

export default function Library() {
  useTheme(); // re-render when the theme changes
  const level = useReadingLevel();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { favorites, progress, stats, learnedWords, awards, badges, badgesSeen, markBadgesSeen } = useLibrary();
  const downloads = useDownloads();
  const [tab, setTab] = useState<Tab>('continue');
  const [q, setQ] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(() => getStories(level).then(setStories).catch(() => setStories([])), [level]);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  // Badges earned since the reader last looked get a "New" tag; they count as seen once this screen has shown them.
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);
  useEffect(() => {
    const fresh = unseenBadges(badges, badgesSeen).map((b) => b.id);
    if (fresh.length) { setNewBadgeIds((cur) => [...cur, ...fresh.filter((i) => !cur.includes(i))]); markBadgesSeen(fresh); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges, badgesSeen]);
  const goal = goalProgress(stats.week);
  const garden = gardenFor(learnedWords.length);
  const earnedCount = badges.filter((b) => b.earned).length;

  const words = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? learnedWords.filter((w) => w.word.toLowerCase().includes(needle) || w.storyTitle.toLowerCase().includes(needle)) : learnedWords;
  }, [learnedWords, q]);

  const shown = useMemo(() => {
    const by = (s: Story) => progress[s.slug];
    // Saved stories come from the device, so this tab works with no connection at all.
    let list: Story[] =
      tab === 'words' ? []
      : tab === 'saved' ? downloads.list.map((d) => d.story)
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <Text accessibilityRole="header" style={styles.title}>My books</Text>
      <OfflineBanner />

      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} accessibilityElementsHidden />
        <TextInput value={q} onChangeText={setQ} placeholder="Search my books" placeholderTextColor={colors.lock} accessibilityLabel="Search my books" returnKeyType="search" style={styles.input} />
      </View>

      <View style={styles.stats} accessibilityRole="summary" accessibilityLabel={`Stories finished: ${stats.week} this week, ${stats.month} this month, ${stats.all} in total`}>
        {([['This week', stats.week], ['This month', stats.month], ['All time', stats.all]] as const).map(([label, n]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statNum}>{n}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.goal} accessibilityLabel={goal.reached ? `Weekly goal reached: ${goal.count} stories this week` : `Weekly goal: ${goal.count} of ${goal.goal} stories this week`}>
        <ProgressRing pct={goal.pct} label={`${Math.min(goal.count, 99)}`} sub={`of ${goal.goal}`} />
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>{goal.reached ? 'Weekly goal reached! 🎉' : 'Weekly reading goal'}</Text>
          <Text style={styles.goalText}>
            {goal.reached ? `${goal.count} stories this week. Keep going if you like!`
              : goal.count === 0 ? `Finish ${goal.goal} stories this week.`
              : `${goal.count} ${goal.count === 1 ? 'story' : 'stories'} so far. ${goal.left} more to go!`}
          </Text>
          <Text style={styles.goalNote}>A fresh start every Monday.</Text>
        </View>
      </View>

      <View style={styles.badges}>
        <View style={styles.badgeHead}>
          <Text style={styles.trophyHead} accessibilityRole="header">Badges</Text>
          <Text style={styles.badgeCount}>{earnedCount} of {badges.length}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeGrid} tabIndex={0} accessibilityLabel="Badges, scroll sideways">
          {badges.map((b) => (
            <View
              key={b.id}
              style={[styles.badge, b.earned ? styles.badgeOn : styles.badgeOff]}
              accessibilityLabel={b.earned ? `${b.title}, earned${newBadgeIds.includes(b.id) ? ', new' : ''}. ${b.hint}` : `${b.title}, not earned yet. ${b.hint}`}
            >
              <Text style={[styles.badgeEmoji, !b.earned && { opacity: 0.25 }]}>{b.emoji}</Text>
              <Text style={styles.badgeTitle} numberOfLines={2}>{b.title}</Text>
              {newBadgeIds.includes(b.id) && b.earned && <Text style={styles.badgeNew}>NEW</Text>}
              {!b.earned && <Text style={styles.badgeHint} numberOfLines={3}>{b.hint}</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      {awards.length > 0 && (
        <View style={styles.trophies}>
          <Text style={styles.trophyHead} accessibilityRole="header">Rewards</Text>
          <View style={{ gap: 8 }}>
            {awards.map((a) => (
              <View key={`${a.kind}-${a.periodLabel}`} style={styles.trophy} accessibilityLabel={`${awardTitle(a)}${a.note ? `. ${a.note}` : ''}`}>
                <Text style={{ fontSize: 26 }}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trophyTitle}>{awardTitle(a)}</Text>
                  {!!a.note && <Text style={styles.trophyNote}>{a.note}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => <Chip key={t.id} label={t.label} active={tab === t.id} onPress={() => setTab(t.id)} />)}
      </ScrollView>

      {tab === 'words' ? (
        words.length === 0 ? (
          <EmptyState {...(q.trim() ? { emoji: '🔎', title: 'No matches', body: `Nothing in this list matches "${q.trim()}".` } : COPY.words)} />
        ) : (
          <View style={styles.wordList}>
            <View style={styles.garden} accessibilityLabel={`Word garden: ${garden.stage.name}. ${garden.next ? `${garden.toNext} more ${garden.toNext === 1 ? 'word' : 'words'} to grow into ${garden.next.name.toLowerCase()}.` : 'Fully grown!'}`}>
              <Text style={styles.gardenPlant}>{garden.stage.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gardenName}>Your word garden: {garden.stage.name.toLowerCase()}</Text>
                <Text style={styles.gardenText}>{garden.next ? `${garden.toNext} more ${garden.toNext === 1 ? 'word' : 'words'} to grow into ${garden.next.name.toLowerCase()} ${garden.next.emoji}` : 'Your garden is fully grown!'}</Text>
                <View style={styles.gardenTrack}><View style={[styles.gardenFill, { width: `${Math.round(garden.pct * 100)}%` }]} /></View>
                <Text style={styles.gardenFlowers} numberOfLines={2}>{'🌼'.repeat(Math.min(learnedWords.length, 24))}</Text>
              </View>
            </View>
            <Text style={styles.wordCount}>{learnedWords.length === 1 ? '1 word explored' : `${learnedWords.length} words explored`}</Text>
            {words.map((w) => (
              <View key={w.wordId} style={styles.wordCard}>
                <Text style={styles.wordName}>{w.word}</Text>
                <Text style={styles.wordMeaning}>{w.meaning}</Text>
                <Text style={styles.wordFrom}>from {w.storyTitle}</Text>
              </View>
            ))}
          </View>
        )
      ) : shown.length === 0 ? (
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

const styles = themed(() => StyleSheet.create({
  title: { ...type.display, color: colors.ink, paddingHorizontal: space.md, marginBottom: space.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: space.md, paddingHorizontal: 16, minHeight: 50, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  input: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  tabs: { gap: 8, paddingHorizontal: space.md, marginTop: space.md, marginBottom: space.lg },
  stats: { flexDirection: 'row', gap: 10, marginHorizontal: space.md, marginTop: space.md },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  statNum: { fontFamily: fonts.black, fontSize: 28, color: colors.primaryDeep },
  statLabel: { ...type.small, color: colors.ink, fontFamily: fonts.bold },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: space.md, marginTop: space.md, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  goalTitle: { ...type.heading, color: colors.ink },
  goalText: { ...type.body, color: colors.ink, marginTop: 2 },
  goalNote: { ...type.small, color: colors.muted, marginTop: 4 },
  badges: { marginTop: space.md },
  badgeHead: { paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  badgeCount: { ...type.small, color: colors.muted, fontFamily: fonts.bold },
  badgeGrid: { gap: 8, paddingHorizontal: space.md },
  badge: { width: 108, minHeight: 112, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.md },
  badgeOn: { backgroundColor: colors.amberSoft },
  badgeOff: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  badgeEmoji: { fontSize: 32 },
  badgeTitle: { fontFamily: fonts.black, fontSize: 13, color: colors.ink, textAlign: 'center', marginTop: 4 },
  badgeHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 2 },
  badgeNew: { fontFamily: fonts.black, fontSize: 10, color: colors.onAction, backgroundColor: colors.action, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, marginTop: 4, overflow: 'hidden' },
  garden: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: radius.lg, backgroundColor: colors.secondarySoft },
  gardenPlant: { fontSize: 56 },
  gardenName: { ...type.heading, color: colors.ink },
  gardenText: { ...type.small, color: colors.ink, marginTop: 2 },
  gardenTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surface, marginTop: 8, overflow: 'hidden' },
  gardenFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 4 },
  gardenFlowers: { fontSize: 16, marginTop: 8 },
  trophies: { marginHorizontal: space.md, marginTop: space.md },
  trophyHead: { ...type.heading, color: colors.ink, marginBottom: 6 },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.amberSoft },
  trophyTitle: { ...type.heading, color: colors.ink },
  trophyNote: { ...type.small, color: colors.ink, marginTop: 2 },
  wordList: { paddingHorizontal: space.md, gap: 10 },
  wordCount: { ...type.heading, color: colors.muted },
  wordCard: { padding: 14, borderRadius: radius.md, backgroundColor: colors.secondarySoft, gap: 2 },
  wordName: { fontFamily: fonts.black, fontSize: 22, color: colors.ink },
  wordMeaning: { ...type.body, color: colors.ink },
  wordFrom: { ...type.small, color: colors.secondaryDeep, fontFamily: fonts.bold, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.md },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 3 },
  savedTag: { ...type.small, color: colors.secondaryDeep, fontFamily: fonts.bold, marginTop: 4 },
}));
