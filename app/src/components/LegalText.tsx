import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../theme';

/** Renders the policy's simple format: "# Heading", "- bullet", blank-line separated paragraphs. */
export function LegalText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) nodes.push(<Text key={i} accessibilityRole="header" style={styles.h}>{line.slice(2)}</Text>);
    else if (line.startsWith('- ')) nodes.push(<View key={i} style={styles.li}><Text style={styles.dot} accessibilityElementsHidden>•</Text><Text style={styles.p}>{line.slice(2)}</Text></View>);
    else if (line.trim()) nodes.push(<Text key={i} style={styles.p}>{line}</Text>);
  });
  return <View>{nodes}</View>;
}

const styles = StyleSheet.create({
  h: { ...type.title, fontSize: 18, color: colors.ink, marginTop: space.lg, marginBottom: 6 },
  p: { ...type.body, color: colors.ink, flexShrink: 1, marginBottom: 8 },
  li: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  dot: { ...type.body, color: colors.purple },
});
