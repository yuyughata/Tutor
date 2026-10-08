import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Tap } from '../../src/components/Tap';
import { useProfiles } from '../../src/state/profiles';
import { colors, radius, shadow, space, type } from '../../src/theme';

export default function SwitchReader() {
  const { children: kids, active, select } = useProfiles();
  return (
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={() => router.back()} />
      <View style={[styles.sheet, shadow.lift]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Who's reading?</Text>
        <View style={styles.row}>
          {kids.map((k) => (
            <Tap
              key={k.id}
              accessibilityRole="button"
              accessibilityLabel={k.name}
              accessibilityState={{ selected: active?.id === k.id }}
              onPress={() => { select(k.id); router.back(); }}
              style={styles.cell}
            >
              <Avatar id={k.avatar} size={76} ring={active?.id === k.id ? colors.purple : 'transparent'} />
              <Text style={styles.name} numberOfLines={1}>{k.name}</Text>
            </Tap>
          ))}
        </View>
        <Button label="Add a reader" icon="add" variant="secondary" onPress={() => { router.back(); setTimeout(() => router.push('/profile/new'), 50); }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(35,35,35,0.5)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, paddingBottom: space.xl, gap: 16 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  title: { ...type.title, color: colors.ink, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18 },
  cell: { alignItems: 'center', width: 92, gap: 6 },
  name: { ...type.heading, color: colors.ink },
});
