import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../theme';

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.sub}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.xl },
  head: { paddingHorizontal: space.md, marginBottom: 14 },
  title: { ...type.title, color: colors.ink },
  sub: { ...type.small, color: colors.muted, marginTop: 2 },
});
