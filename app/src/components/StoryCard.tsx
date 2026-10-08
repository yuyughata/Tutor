import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import type { Story } from '../types';

type Props = { story: Story; size?: 'small' | 'large'; locked?: boolean };

export function StoryCard({ story, size = 'small', locked = !story.isFree }: Props) {
  const large = size === 'large';
  return (
    <Link href={{ pathname: '/story/[slug]', params: { slug: story.slug } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${story.title}${locked ? ', locked' : ''}`}
        style={[styles.card, large ? styles.large : styles.small]}
      >
        <Image source={story.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.scrim} />
        {locked && (
          <View style={styles.lock}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        )}
        <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={2}>
          {story.title}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.surface },
  small: { width: 150, height: 190 },
  large: { flex: 1, height: 200 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.22)' },
  title: { color: '#fff', fontWeight: '700', fontSize: 15, padding: 12 },
  titleLarge: { fontSize: 18 },
  lock: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radius.pill, padding: 6 },
  lockText: { fontSize: 12 },
});
