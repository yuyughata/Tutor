import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../theme';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: space.sm, paddingHorizontal: space.md },
});
