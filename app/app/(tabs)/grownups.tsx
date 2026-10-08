import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Tap } from '../../src/components/Tap';
import { useAuth } from '../../src/state/auth';
import { useGate } from '../../src/state/gate';
import { useProfiles } from '../../src/state/profiles';
import { colors, radius, shadow, space, type } from '../../src/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

function Card({ children }: { children: React.ReactNode }) {
  return <View style={[styles.card, shadow.soft]}>{children}</View>;
}

export default function GrownUps() {
  const insets = useSafeAreaInsets();
  const ask = useGate();
  const { configured, session, entitlement, signOut, refresh } = useAuth();
  const { children: kids, active, select } = useProfiles();
  const [unlocked, setUnlocked] = useState(false);
  // Keep the latest refresh in a ref so the focus effect below only re-runs on focus, not on every auth update.
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  // Every visit starts locked behind the parental gate.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      setUnlocked(false);
      ask().then((ok) => {
        if (!live) return;
        if (ok) { setUnlocked(true); refreshRef.current(); } else router.navigate('/');
      });
      return () => { live = false; };
    }, [ask]),
  );

  if (!unlocked) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Ionicons name="shield-checkmark" size={64} color={colors.purple} />
        <Text style={[type.title, { color: colors.ink, marginTop: 12 }]}>Grown-ups area</Text>
        <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: 8 }]}>This part of the app is just for parents and guardians.</Text>
        <Button label="Unlock" icon="lock-open" onPress={() => ask().then((ok) => ok && setUnlocked(true))} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140, paddingHorizontal: space.md, gap: 16 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Grown-ups</Text>

      <Card>
        <Text style={styles.cardTitle}>Account</Text>
        {!configured ? (
          <Text style={styles.body}>Accounts aren't switched on in this version of the app. All free stories are available.</Text>
        ) : session ? (
          <>
            <Text style={styles.body}>{session.user.email}</Text>
            <View style={[styles.badge, entitlement.active ? styles.badgeOn : styles.badgeOff]}>
              <Ionicons name={entitlement.active ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={entitlement.active ? '#0b6f6b' : colors.muted} />
              <Text style={[styles.badgeText, { color: entitlement.active ? '#0b6f6b' : colors.muted }]}>
                {entitlement.active ? 'Premium is active' : 'Free plan'}
              </Text>
            </View>
            {WEB_URL && (
              <Button label={entitlement.active ? 'Manage on the web' : 'Get Premium on the web'} icon="open-outline" variant="secondary" onPress={() => Linking.openURL(WEB_URL)} />
            )}
            <Button label="Sign out" variant="ghost" onPress={signOut} />
          </>
        ) : (
          <>
            <Text style={styles.body}>Sign in with your parent account to unlock Premium stories on this device.</Text>
            <Button label="Sign in" icon="log-in" onPress={() => router.push('/sign-in')} />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Readers</Text>
        {kids.map((k) => (
          <View key={k.id} style={styles.row}>
            <Tap accessibilityRole="button" accessibilityLabel={`Read as ${k.name}`} onPress={() => select(k.id)} style={styles.rowMain}>
              <Avatar id={k.avatar} size={44} ring={active?.id === k.id ? colors.teal : undefined} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{k.name}</Text>
                <Text style={styles.meta}>Ages {k.ageBand}{active?.id === k.id ? ' · reading now' : ''}</Text>
              </View>
            </Tap>
            <Tap accessibilityRole="button" accessibilityLabel={`Edit ${k.name}`} onPress={() => router.push({ pathname: '/profile/new', params: { id: k.id } })} style={styles.edit}>
              <Ionicons name="create-outline" size={20} color={colors.purpleDeep} />
            </Tap>
          </View>
        ))}
        <Button label="Add a reader" icon="add" variant="secondary" onPress={() => router.push('/profile/new')} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Privacy</Text>
        <Text style={styles.body}>No ads. No tracking. Genova collects only a child's first name or nickname and age group, so we can show the right stories.</Text>
      </Card>
      <Text style={styles.footer}>Genova · a CUSTAR product · v0.1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  title: { ...type.display, color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: 12 },
  cardTitle: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  badgeOn: { backgroundColor: colors.tealSoft },
  badgeOff: { backgroundColor: colors.border },
  badgeText: { ...type.heading, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { ...type.heading, color: colors.ink },
  meta: { ...type.small, color: colors.muted },
  edit: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  footer: { ...type.small, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
