import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../lib/a11y';
import { useLibrary } from '../state/library';
import { useTheme } from '../state/theme';
import { colors, fonts, radius, shadow, space, type, themed } from '../theme';
import type { Story, StoryWord } from '../types';
import { Button } from './Button';
import { Tap } from './Tap';

/** Word Explorer: the new word(s) of a story with a child-friendly meaning, an example, and an "I learned it" button. */
export function WordSheet({ story, words, onClose }: { story: Story; words: StoryWord[] | null; onClose: () => void }) {
  useTheme();
  const reduceMotion = useReducedMotion();
  const { hasLearned, learnWord } = useLibrary();
  return (
    <Modal visible={!!words} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.card, shadow.lift]} accessibilityViewIsModal role="dialog" aria-label="Word explorer">
          <View style={styles.head}>
            <View style={styles.kickerRow}>
              <Ionicons name="search" size={16} color={colors.secondaryDeep} />
              <Text style={styles.kicker}>WORD EXPLORER</Text>
            </View>
            <Tap accessibilityRole="button" accessibilityLabel="Close word explorer" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Tap>
          </View>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: space.md }}>
            {(words ?? []).map((w) => {
              const learned = hasLearned(w.id);
              return (
                <View key={w.id} style={styles.word}>
                  <Text style={styles.wordText} accessibilityRole="header">{w.word}</Text>
                  <Text style={styles.meaning}>{w.meaning}</Text>
                  {!!w.example && <Text style={styles.example}>“{w.example}”</Text>}
                  <Button
                    label={learned ? 'Learned!' : 'I learned it'}
                    icon={learned ? 'checkmark-circle' : 'star'}
                    variant={learned ? 'secondary' : 'primary'}
                    disabled={learned}
                    onPress={() => learnWord(story, w)}
                    style={{ marginTop: 6 }}
                  />
                </View>
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
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { ...type.label, color: colors.secondaryDeep },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  word: { backgroundColor: colors.secondarySoft, borderRadius: radius.lg, padding: space.md, gap: 6 },
  wordText: { fontFamily: fonts.black, fontSize: 30, color: colors.ink },
  meaning: { ...type.body, fontSize: 18, lineHeight: 26, color: colors.ink },
  example: { ...type.body, fontStyle: 'italic', color: colors.muted },
}));
