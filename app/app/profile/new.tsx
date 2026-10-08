import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Tap } from '../../src/components/Tap';
import { useProfiles } from '../../src/state/profiles';
import { avatars, colors, fonts, radius, space, type } from '../../src/theme';
import type { AgeBand } from '../../src/types';

const BANDS: { id: AgeBand; label: string; emoji: string; hint: string }[] = [
  { id: '2-4', label: 'Little', emoji: '🧸', hint: 'Ages 2–4' },
  { id: '5-8', label: 'Explorer', emoji: '🧭', hint: 'Ages 5–8' },
  { id: '9-12', label: 'Adventurer', emoji: '🗺️', hint: 'Ages 9–12' },
];

export default function ProfileEditor() {
  const { first, id } = useLocalSearchParams<{ first?: string; id?: string }>();
  const { children: kids, add, update, remove } = useProfiles();
  const insets = useSafeAreaInsets();
  const editing = id ? kids.find((k) => k.id === id) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [avatar, setAvatar] = useState(editing?.avatar ?? 'fox');
  const [band, setBand] = useState<AgeBand | null>(editing?.ageBand ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const valid = name.trim().length > 0 && band !== null;
  const save = () => {
    if (!valid || !band) return;
    if (editing) update(editing.id, { name: name.trim(), avatar, ageBand: band });
    else add({ name: name.trim(), avatar, ageBand: band });
    if (first) router.replace('/');
    else router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space.md, paddingTop: first ? insets.top + 24 : space.lg, paddingBottom: insets.bottom + 32, gap: 8 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>{first ? 'WELCOME TO GENOVA' : editing ? 'EDIT READER' : 'NEW READER'}</Text>
        <Text style={styles.title}>{first ? "Who's reading?" : editing ? `About ${editing.name}` : 'Add a reader'}</Text>

        <Text style={styles.label}>Name or nickname</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ada"
          placeholderTextColor={colors.lock}
          maxLength={30}
          autoCapitalize="words"
          accessibilityLabel="Reader's name"
          style={styles.input}
        />

        <Text style={styles.label}>Pick a buddy</Text>
        <View style={styles.avatars}>
          {avatars.map((a) => (
            <Tap key={a.id} accessibilityRole="button" accessibilityLabel={a.id} accessibilityState={{ selected: avatar === a.id }} onPress={() => setAvatar(a.id)} style={styles.avatarCell}>
              <Avatar id={a.id} size={64} ring={avatar === a.id ? colors.purple : 'transparent'} />
            </Tap>
          ))}
        </View>

        <Text style={styles.label}>Reading level</Text>
        <View style={{ gap: 10 }}>
          {BANDS.map((b) => {
            const on = band === b.id;
            return (
              <Tap key={b.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setBand(b.id)} style={[styles.band, on && styles.bandOn]}>
                <Text style={{ fontSize: 30 }}>{b.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bandTitle}>{b.label}</Text>
                  <Text style={styles.bandHint}>{b.hint}</Text>
                </View>
                <View style={[styles.radio, on && styles.radioOn]} />
              </Tap>
            );
          })}
        </View>

        <View style={{ marginTop: space.lg, gap: 8 }}>
          <Button label={first ? "Let's read!" : 'Save'} icon="checkmark" onPress={save} disabled={!valid} />
          {editing && kids.length > 1 && (
            <Button
              label={confirmDelete ? 'Tap again to remove' : 'Remove this reader'}
              variant="danger"
              onPress={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                remove(editing.id);
                router.back();
              }}
            />
          )}
          {!first && <Button label="Cancel" variant="ghost" onPress={() => router.back()} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kicker: { ...type.label, color: colors.purple },
  title: { ...type.display, color: colors.ink, marginBottom: 8 },
  label: { ...type.heading, color: colors.ink, marginTop: 18, marginBottom: 6 },
  input: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 18, height: 58 },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarCell: { padding: 2 },
  band: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  bandOn: { borderColor: colors.purple, backgroundColor: colors.purpleSoft },
  bandTitle: { ...type.heading, color: colors.ink },
  bandHint: { ...type.small, color: colors.muted },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.lock },
  radioOn: { borderColor: colors.purple, backgroundColor: colors.purple },
});
