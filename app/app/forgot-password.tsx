import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/auth';
import { colors, fonts, radius, space, type, themed } from '../src/theme';
import { useTheme } from '../src/state/theme';

type Step = 'email' | 'code' | 'password' | 'done';

/** Reset a forgotten password with a code sent to the parent's email. */
export default function ForgotPassword() {
  useTheme(); // re-render when the theme changes
  const params = useLocalSearchParams<{ email?: string }>();
  const { requestReset, verifyReset, setNewPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const lastSent = useRef(0);

  const run = async (fn: () => Promise<string | null>, next: Step) => {
    setBusy(true); setMsg(null);
    const err = await fn();
    setBusy(false);
    if (err) return setMsg(err);
    setStep(next);
  };
  const send = () => run(async () => {
    const err = await requestReset(email.trim());
    if (!err) { lastSent.current = Date.now(); setNote(`We sent a code to ${email.trim()}. It can take a minute to arrive; check your spam folder too.`); }
    return err;
  }, 'code');
  const resend = async () => {
    if (Date.now() - lastSent.current < 60_000) return setMsg('Please wait a minute before asking for another code.');
    setBusy(true); setMsg(null);
    const err = await requestReset(email.trim());
    setBusy(false);
    if (err) setMsg(err); else { lastSent.current = Date.now(); setNote('A new code is on its way.'); }
  };
  const save = () => {
    if (pw.length < 8) return setMsg('Choose a password with at least 8 characters.');
    if (pw !== pw2) return setMsg('The two passwords do not match.');
    return run(() => setNewPassword(pw), 'done');
  };

  const titles: Record<Step, string> = { email: 'Forgot your password?', code: 'Enter the code', password: 'Choose a new password', done: 'All set' };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: 8 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>RESET PASSWORD</Text>
        <Text accessibilityRole="header" style={styles.title}>{titles[step]}</Text>

        {step === 'email' && (
          <>
            <Text style={styles.body}>Enter the email you registered with on the Genova website. We will send you a code to reset your password.</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.lock} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" accessibilityLabel="Email" style={styles.input} />
          </>
        )}
        {step === 'code' && (
          <>
            {note && <Text style={styles.body}>{note}</Text>}
            <TextInput value={code} onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))} placeholder="Code from the email" placeholderTextColor={colors.lock} keyboardType="number-pad" maxLength={10} autoComplete="one-time-code" textContentType="oneTimeCode" accessibilityLabel="Code from the email" style={[styles.input, styles.code]} />
          </>
        )}
        {step === 'password' && (
          <>
            <Text style={styles.body}>Use at least 8 characters.</Text>
            <TextInput value={pw} onChangeText={setPw} placeholder="New password" placeholderTextColor={colors.lock} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" accessibilityLabel="New password" style={styles.input} />
            <TextInput value={pw2} onChangeText={setPw2} placeholder="Repeat new password" placeholderTextColor={colors.lock} secureTextEntry autoCapitalize="none" autoComplete="new-password" accessibilityLabel="Repeat new password" style={styles.input} />
          </>
        )}
        {step === 'done' && <Text style={styles.body}>Your password has been changed and you are signed in. You can close this screen.</Text>}

        {msg && <Text style={styles.msg} accessibilityLiveRegion="polite" accessibilityRole="alert">{msg}</Text>}

        {step === 'email' && <Button label="Send me a code" onPress={send} loading={busy} disabled={!email.includes('@')} style={{ marginTop: 8 }} />}
        {step === 'code' && (
          <>
            <Button label="Continue" onPress={() => run(() => verifyReset(email.trim(), code), 'password')} loading={busy} disabled={code.length < 6} style={{ marginTop: 8 }} />
            <Button label="Send a new code" variant="ghost" onPress={resend} disabled={busy} />
          </>
        )}
        {step === 'password' && <Button label="Save new password" onPress={save} loading={busy} disabled={pw.length === 0} style={{ marginTop: 8 }} />}
        {step === 'done' ? <Button label="Done" onPress={() => { router.dismissAll(); }} style={{ marginTop: 8 }} /> : <Button label="Cancel" variant="ghost" onPress={() => router.back()} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  kicker: { ...type.label, color: colors.primaryDeep },
  title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.muted, marginBottom: 8 },
  input: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 18, minHeight: 56, marginTop: 8 },
  code: { fontSize: 26, letterSpacing: 6, textAlign: 'center' },
  msg: { ...type.body, color: colors.danger, marginTop: 4 },
}));
