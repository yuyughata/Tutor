import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';
import { useReducedMotion } from '../lib/a11y';
import { useTheme } from '../state/theme';
import { colors, fonts, radius, themed } from '../theme';

/** A small friendly pill on a few pages: there is a song waiting at the end of this story. Fades in; still when motion is reduced. */
export function SongHint({ text }: { text: string }) {
  useTheme();
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { fade.setValue(1); return; }
    Animated.timing(fade, { toValue: 1, duration: 600, delay: 250, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [fade, reduced]);
  return (
    <Animated.View style={[styles.pill, { opacity: fade }]} accessibilityRole="text" accessibilityLabel={text}>
      <Ionicons name="musical-notes" size={16} color={colors.secondaryDeep} />
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = themed(() => StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, borderRadius: radius.pill, backgroundColor: colors.secondarySoft },
  text: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.secondaryDeep, flexShrink: 1 },
}));
