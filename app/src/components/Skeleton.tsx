import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../lib/a11y';
import { colors, radius, space, themed } from '../theme';

/** A softly pulsing placeholder. Holds still when the device asks for reduced motion. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const o = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduced) { o.setValue(0.7); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(o, { toValue: 0.55, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, o]);
  return <Animated.View style={[{ backgroundColor: colors.primarySoft, borderRadius: radius.lg, opacity: o }, style]} />;
}

/** Placeholder for the home screen while stories load. */
export function HomeSkeleton() {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading stories" style={{ paddingHorizontal: space.md }}>
      <Skeleton style={{ aspectRatio: 0.92, borderRadius: radius.xl }} />
      <Skeleton style={{ height: 108, marginTop: 14 }} />
      <View style={styles.row}>{[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: 148, aspectRatio: 3 / 4 }} />)}</View>
    </View>
  );
}
const styles = themed(() => StyleSheet.create({ row: { flexDirection: 'row', gap: 14, marginTop: space.xl } }));
