import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Section } from '../src/components/Section';
import { StoryCard } from '../src/components/StoryCard';
import { getHome } from '../src/data/repository';
import { useProfile } from '../src/profile';
import { colors, radius, space } from '../src/theme';
import type { HomeData, Story } from '../src/types';

function Row({ stories }: { stories: Story[] }) {
  return (
    <FlatList
      horizontal
      data={stories}
      keyExtractor={(s) => s.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.md, gap: space.sm }}
      renderItem={({ item }) => <StoryCard story={item} />}
    />
  );
}

export default function Home() {
  const { ageBand } = useProfile();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(false);
    getHome(ageBand).then(setData).catch(() => setError(true));
  }, [ageBand]);

  if (error) return <Text style={styles.msg}>Couldn't load stories. Pull down to try again.</Text>;
  if (!data) return <ActivityIndicator style={{ marginTop: 120 }} color={colors.primaryDark} />;

  const filter = (list: Story[]) => (category ? list.filter((s) => s.categories.includes(category)) : list);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }}>
        <Text style={styles.brand}>Genova</Text>

        <View style={styles.featuredRow}>
          {data.week && (
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Title of the Week</Text>
              <StoryCard story={data.week} size="large" />
            </View>
          )}
          {data.month && (
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Title of the Month</Text>
              <StoryCard story={data.month} size="large" />
            </View>
          )}
        </View>

        <Section title="Categories">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.md, gap: space.sm }}>
            {[{ slug: null, name: 'All' }, ...data.categories].map((c) => {
              const active = c.slug === category;
              return (
                <Pressable
                  key={c.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setCategory(c.slug)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Section>

        <Section title="Popular"><Row stories={filter(data.popular)} /></Section>
        <Section title="New"><Row stories={filter(data.latest)} /></Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 28, fontWeight: '900', color: colors.ink, paddingHorizontal: space.md },
  featuredRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md, marginTop: space.md },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6, textTransform: 'uppercase' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primaryDark },
  chipText: { fontWeight: '600', color: colors.ink },
  msg: { marginTop: 120, textAlign: 'center', color: colors.muted },
});
