import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../state/auth';
import { colors, radius, shadow, type } from '../theme';
import type { Story } from '../types';
import { Picture } from './Picture';
import { Tap } from './Tap';

export const CARD_W = 148;

export function openStory(slug: string) {
  router.push({ pathname: '/story/[slug]', params: { slug } });
}

/** Shelf card: cover first, then title and a quiet meta line. */
export function StoryCard({ story, width = CARD_W }: { story: Story; width?: number }) {
  const { canRead } = useAuth();
  const locked = !canRead(story);
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${story.title}. Ages ${story.ageBand}. ${story.readingMinutes} minutes.${locked ? ' Locked.' : ''}`}
      onPress={() => openStory(story.slug)}
      style={{ width }}
    >
      <View style={[styles.cover, shadow.soft]}>
        <Picture uri={story.coverUrl} art={story.art} style={StyleSheet.absoluteFill} />
        {locked && (
          <View style={styles.lock}>
            <Ionicons name="lock-closed" size={13} color={colors.ink} />
          </View>
        )}
        {story.isFree && (
          <View style={styles.free}>
            <Text style={styles.freeText}>FREE</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
      <Text style={styles.meta}>Ages {story.ageBand} · {story.readingMinutes} min</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  cover: { aspectRatio: 3 / 4, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.purpleSoft },
  lock: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  free: { position: 'absolute', left: 10, bottom: 10, backgroundColor: colors.amber, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  freeText: { fontFamily: 'Nunito_900Black', fontSize: 11, letterSpacing: 0.6, color: colors.onAmber },
  title: { ...type.heading, color: colors.ink, marginTop: 10 },
  meta: { ...type.small, color: colors.muted, marginTop: 2 },
});
