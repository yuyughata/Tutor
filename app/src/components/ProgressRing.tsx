import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, themed } from '../theme';

const DOTS = 12;

/** A ring of dots that fill up with progress (0..1). Plain Views, so there is nothing to download and nothing to animate. */
export function ProgressRing({ pct, size = 92, label, sub }: { pct: number; size?: number; label: string; sub?: string }) {
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * DOTS);
  const dot = Math.round(size * 0.13);
  const r = size / 2 - dot / 2;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: DOTS }, (_, i) => {
        const a = (i / DOTS) * 2 * Math.PI - Math.PI / 2;
        return (
          <View
            key={i}
            style={{ position: 'absolute', width: dot, height: dot, borderRadius: dot / 2, left: size / 2 + r * Math.cos(a) - dot / 2, top: size / 2 + r * Math.sin(a) - dot / 2, backgroundColor: i < filled ? colors.secondary : colors.border }}
          />
        );
      })}
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
        {!!sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.black, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
}));
