import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { PIN_LENGTH, PinPad } from '../src/components/PinPad';
import { announce } from '../src/lib/a11y';
import { usePasscode } from '../src/state/passcode';
import { useTheme } from '../src/state/theme';
import { colors, space, type, themed } from '../src/theme';

/** Create or change the parent's 4-digit passcode. Right after sign-in (`?first=1`) it only appears if there isn't one yet. */
export default function PasscodeScreen() {
  useTheme(); // re-render when the theme changes
  const { first } = useLocalSearchParams<{ first?: string }>();
  const { ready, hasPasscode, set } = usePasscode();
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const afterSignIn = first === '1';

  useEffect(() => { if (afterSignIn && ready && hasPasscode && !done) router.back(); }, [afterSignIn, ready, hasPasscode, done]);

  const onChange = async (v: string) => {
    setPin(v); setMessage(null);
    if (v.length < PIN_LENGTH) return;
    if (firstPin === null) { setFirstPin(v); setPin(''); announce('Repeat the passcode'); return; }
    if (firstPin !== v) { setFirstPin(null); setPin(''); setMessage('The two passcodes did not match. Start again.'); return; }
    setBusy(true);
    const err = await set(v);
    setBusy(false);
    if (err) { setMessage(err); setFirstPin(null); setPin(''); } else { setDone(true); announce('Passcode saved'); }
  };

  if (afterSignIn && !ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (done) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.kicker}>ALL SET</Text>
        <Text accessibilityRole="header" style={styles.title}>Passcode saved</Text>
        <Text style={styles.body}>Use it whenever a child needs a grown-up, and to leave kiosk mode. We emailed you a note that it changed.</Text>
        <Button label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>GROWN-UP PASSCODE</Text>
      <Text accessibilityRole="header" style={styles.title}>{firstPin === null ? (hasPasscode ? 'Choose a new passcode' : 'Create your passcode') : 'Repeat the passcode'}</Text>
      <Text style={styles.body}>
        {firstPin === null ? 'A 4-digit code only you know. It replaces the number puzzle, so children cannot open the Grown-ups area.' : 'Type the same 4 digits again to confirm.'}
      </Text>
      <PinPad value={pin} onChange={onChange} disabled={busy} />
      <Text style={styles.err} accessibilityLiveRegion="polite">{message ?? ''}</Text>
      <Button label={afterSignIn ? 'Not now' : 'Cancel'} variant="ghost" onPress={() => router.back()} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: space.lg, gap: 8, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...type.label, color: colors.primaryDeep },
  title: { ...type.display, color: colors.ink, textAlign: 'center' },
  body: { ...type.body, color: colors.muted, textAlign: 'center', marginBottom: 8, maxWidth: 360 },
  err: { ...type.small, color: colors.danger, minHeight: 18, textAlign: 'center', marginVertical: 6 },
}));
