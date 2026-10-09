import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../lib/a11y';

const PIECES = ['⭐', '✨', '🌟', '✨', '⭐', '🌟', '✨', '⭐', '🌟', '✨'];

/** A one-time burst of ten star emoji. Skipped entirely when the device asks for reduced motion. */
export function StarBurst({ distance = 140 }: { distance?: number }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [reduced, t]);
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {PIECES.map((p, i) => {
        const a = (i / PIECES.length) * 2 * Math.PI;
        return (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute', fontSize: 26,
              opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * distance] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * distance] }) },
                { scale: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.3, 1.25, 0.9] }) },
              ],
            }}
          >{p}</Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
