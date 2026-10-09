import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Tap } from '../../src/components/Tap';
import { formatBytes, removeAll, useDownloads } from '../../src/data/downloads';
import { levelFull } from '../../src/levels';
import { SUPPORT_EMAIL, WEB_URL } from '../../src/lib/webLinks';
import { useAuth } from '../../src/state/auth';
import { useGate } from '../../src/state/gate';
import { useKiosk } from '../../src/state/kiosk';
import { usePasscode } from '../../src/state/passcode';
import { useProfiles } from '../../src/state/profiles';
import { colors, radius, shadow, space, themeOptions, themes, type, themed } from '../../src/theme';
import { useTheme as useThemeCtx } from '../../src/state/theme';


function Card({ children }: { children: React.ReactNode }) {
  return <View style={[styles.card, shadow.soft]}>{children}</View>;
}

export default function GrownUps() {
  const { theme, setTheme } = useThemeCtx(); // also re-renders this screen when the theme changes
  const passcode = usePasscode();
  const kiosk = useKiosk();
  const [kioskMsg, setKioskMsg] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const ask = useGate();
  const { configured, session, entitlement, signOut, refresh } = useAuth();
  const { children: kids, active, select } = useProfiles();
  const [unlocked, setUnlocked] = useState(false);
  const downloads = useDownloads();
  const [confirmClear, setConfirmClear] = useState(false);
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
        <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
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
            <View style={[styles.badge, entitlement.inGrace ? styles.badgeWarn : entitlement.active ? styles.badgeOn : styles.badgeOff]} accessible accessibilityLabel={entitlement.inGrace ? 'Payment overdue' : entitlement.active ? 'Premium is active' : 'Free plan'}>
              <Ionicons name={entitlement.inGrace ? 'alert-circle' : entitlement.active ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={entitlement.inGrace ? colors.amberDeep : entitlement.active ? colors.secondaryDeep : colors.muted} />
              <Text style={[styles.badgeText, { color: entitlement.inGrace ? colors.amberDeep : entitlement.active ? colors.secondaryDeep : colors.muted }]}>
                {entitlement.inGrace ? 'Payment overdue' : entitlement.active ? 'Premium is active' : 'Free plan'}
              </Text>
            </View>
            {entitlement.inGrace && entitlement.until && (
              <Text style={styles.body}>Renew on the website before {new Date(entitlement.until).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} to keep Premium. After that your account moves back to the Free plan.</Text>
            )}
            {WEB_URL && (
              <Button label="Manage my account on the web" icon="open-outline" variant="secondary" onPress={() => Linking.openURL(`${WEB_URL}/account/`)} />
            )}
            <Button label="Contact support" icon="chatbubble-ellipses-outline" variant="secondary" onPress={() => Linking.openURL(WEB_URL ? `${WEB_URL}/account/#support` : `mailto:${SUPPORT_EMAIL}`)} />
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
        <Text accessibilityRole="header" style={styles.cardTitle}>Appearance</Text>
        <Text style={styles.body}>Pick a look for the whole app. Every theme has Day, Sepia and Night modes in the reader.</Text>
        <View style={styles.themes} accessibilityRole="radiogroup">
          {themeOptions.map((o) => {
            const t = themes[o.id];
            const on = theme === o.id;
            return (
              <Tap key={o.id} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }} accessibilityLabel={`${o.name} theme. ${o.blurb}`} onPress={() => setTheme(o.id)} style={[styles.tile, on && styles.tileOn]}>
                <View style={styles.swatches}>
                  {[t.primary, t.action, t.secondary].map((c, i) => <View key={i} style={[styles.swatch, { backgroundColor: c }]} />)}
                </View>
                <Text style={styles.name}>{o.name}{on ? ' ✓' : ''}</Text>
                <Text style={styles.meta}>{o.blurb}</Text>
              </Tap>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text accessibilityRole="header" style={styles.cardTitle}>Passcode and kiosk mode</Text>
        {!session ? (
          <Text style={styles.body}>Sign in with your parent account to create a 4-digit passcode. It locks this area from children, and lets you turn on kiosk mode.</Text>
        ) : (
          <>
            <Text style={styles.body}>{passcode.hasPasscode ? 'Your 4-digit passcode protects this area.' : 'Create a 4-digit passcode so only you can open this area. Without one, a number puzzle is used.'}</Text>
            <Button label={passcode.hasPasscode ? 'Change passcode' : 'Create passcode'} icon="keypad-outline" variant="secondary" onPress={() => router.push('/passcode')} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} nativeID="kioskLabel">Kiosk mode</Text>
                <Text style={styles.meta}>Keeps a child inside Genova. Leaving it needs your passcode.</Text>
              </View>
              <Switch
                accessibilityLabel="Kiosk mode" accessibilityHint="Keeps a child inside Genova until the passcode is entered" value={kiosk.enabled}
                trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff"
                onValueChange={async (on) => {
                  setKioskMsg(null);
                  if (!on && !(await ask({ fresh: true }))) return; // leaving kiosk mode always asks again
                  setKioskMsg(await kiosk.setEnabled(on));
                }}
              />
            </View>
            {kioskMsg && <Text style={[styles.meta, { color: colors.danger }]} accessibilityLiveRegion="polite">{kioskMsg}</Text>}
            {kiosk.enabled && (
              <Text style={styles.meta}>
                {kiosk.nativeSupported
                  ? kiosk.deviceOwner ? 'Locked. Only your passcode can leave kiosk mode.' : 'Android may ask you to confirm "screen pinning". For a lock that cannot be bypassed, set this tablet up as a dedicated device (see docs/KIOSK.md).'
                  : 'The back button no longer leaves the app. On iPhone and iPad also turn on Guided Access (Settings, Accessibility), and on Android use a build with kiosk support.'}
              </Text>
            )}
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Readers</Text>
        {kids.map((k) => (
          <View key={k.id} style={styles.row}>
            <Tap accessibilityRole="button" accessibilityLabel={`Read as ${k.name}`} onPress={() => select(k.id)} style={styles.rowMain}>
              <Avatar id={k.avatar} size={44} ring={active?.id === k.id ? colors.secondary : undefined} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{k.name}</Text>
                <Text style={styles.meta}>{levelFull(k.level)}{active?.id === k.id ? ' · reading now' : ''}</Text>
              </View>
            </Tap>
            <Tap accessibilityRole="button" accessibilityLabel={`Edit ${k.name}`} onPress={() => router.push({ pathname: '/profile/new', params: { id: k.id } })} style={styles.edit}>
              <Ionicons name="create-outline" size={20} color={colors.primaryDeep} />
            </Tap>
          </View>
        ))}
        <Button label="Add a reader" icon="add" variant="secondary" onPress={() => router.push('/profile/new')} />
      </Card>

      <Card>
        <Text accessibilityRole="header" style={styles.cardTitle}>Offline reading</Text>
        <Text style={styles.body}>
          {downloads.list.length === 0 ? 'No stories saved on this device. Open a story and choose "Save for offline".' : `${downloads.list.length} ${downloads.list.length === 1 ? 'story' : 'stories'} saved · ${formatBytes(downloads.bytes)} on this device.`}
        </Text>
        {downloads.list.length > 0 && (
          <Button label={confirmClear ? 'Tap again to remove all' : 'Remove all downloads'} icon="trash-outline" variant="danger" onPress={() => { if (!confirmClear) return setConfirmClear(true); removeAll(); setConfirmClear(false); }} />
        )}
      </Card>

      <Card>
        <Text accessibilityRole="header" style={styles.cardTitle}>Privacy</Text>
        <Text style={styles.body}>No ads. No tracking. Genova collects only a child's first name or nickname and reading level, so we can show the right stories.</Text>
        <Button label="Read our privacy policy" icon="document-text-outline" variant="secondary" onPress={() => router.push('/legal/privacy')} />
      </Card>
      <Text style={styles.footer}>Genova · a CUSTAR product · v0.1</Text>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  title: { ...type.display, color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: 12 },
  cardTitle: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  badgeOn: { backgroundColor: colors.secondarySoft },
  badgeOff: { backgroundColor: colors.border },
  badgeWarn: { backgroundColor: colors.amberSoft },
  badgeText: { ...type.heading, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { ...type.heading, color: colors.ink },
  meta: { ...type.small, color: colors.muted },
  themes: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, padding: 12, gap: 4 },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  swatches: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  edit: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  footer: { ...type.small, color: colors.muted, textAlign: 'center', marginTop: 4 },
}));
