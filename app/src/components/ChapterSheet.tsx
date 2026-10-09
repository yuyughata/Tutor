import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Chapter } from '../lib/story';
import { useReducedMotion } from '../lib/a11y';
import { useTheme } from '../state/theme';
import { colors, fonts, radius, shadow, space, type, themed } from '../theme';
import { Tap } from './Tap';

/** Contents of a chaptered book; tapping a chapter jumps to its first page. */
export function ChapterSheet({ visible, chapters, currentIndex, onPick, onClose }: {
  visible: boolean; chapters: Chapter[]; currentIndex?: number; onPick: (c: Chapter) => void; onClose: () => void;
}) {
  useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.card, shadow.lift]} accessibilityViewIsModal role="dialog" aria-label="Chapters">
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">Chapters</Text>
            <Tap accessibilityRole="button" accessibilityLabel="Close chapters" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Tap>
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 8 }}>
            {chapters.map((c) => {
              const here = currentIndex === c.index;
              return (
                <Tap
                  key={c.index}
                  accessibilityRole="button"
                  accessibilityLabel={`Chapter ${c.index}: ${c.title}${here ? ', you are here' : ''}`}
                  onPress={() => onPick(c)}
                  style={[styles.row, here && styles.rowHere]}
                >
                  <View style={styles.num}><Text style={styles.numText}>{c.index}</Text></View>
                  <Text style={styles.rowTitle}>{c.title}</Text>
                  {here && <Ionicons name="bookmark" size={18} color={colors.primaryDeep} />}
                </Tap>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(35,35,35,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  card: { width: '100%', maxWidth: 560, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, paddingBottom: space.xl },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  title: { ...type.title, color: colors.ink },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.bg },
  rowHere: { backgroundColor: colors.primarySoft },
  num: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.black, fontSize: 16, color: colors.onPrimary },
  rowTitle: { ...type.heading, flex: 1, color: colors.ink },
}));
