import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type, themed } from '../theme';

export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxl },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { ...type.title, color: colors.ink, textAlign: 'center' },
  body: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: 6 },
}));
