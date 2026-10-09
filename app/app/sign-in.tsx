import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/auth';
import { colors, fonts, radius, space, type, themed } from '../src/theme';
import { useTheme } from '../src/state/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

export default function SignIn() {
  useTheme(); // re-render when the theme changes
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) setMsg(/invalid login/i.test(err) ? 'That email or password is not right.' : err);
    else router.replace({ pathname: '/passcode', params: { first: '1' } }); // asks for a passcode if there isn't one yet
  };
  const openWebsite = () => {
    if (WEB_URL) Linking.openURL(`${WEB_URL.replace(/\/$/, '')}/signup`);
    else setMsg('The Genova website address is not set up in this build yet.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: 8 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>PARENT ACCOUNT</Text>
        <Text accessibilityRole="header" style={styles.title}>Welcome back</Text>
        <Text style={styles.body}>Use the same email you register with on the Genova website.</Text>

        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.lock} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" accessibilityLabel="Email" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.lock} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" accessibilityLabel="Password" style={styles.input} />
        {msg && <Text style={styles.msg} accessibilityLiveRegion="polite" accessibilityRole="alert">{msg}</Text>}

        <Button label="Sign in" onPress={submit} loading={busy} disabled={!email.includes('@') || password.length < 6} style={{ marginTop: 8 }} />
        <Button label="Forgot password?" variant="ghost" onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })} />
        <Button label="Create an account on the Genova website" icon="open-outline" variant="secondary" onPress={openWebsite} />
        <Text style={styles.hint}>Register and subscribe on the website, then come back here and sign in.</Text>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  kicker: { ...type.label, color: colors.primaryDeep },
  title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.muted, marginBottom: 12 },
  input: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 18, minHeight: 56, marginTop: 8 },
  msg: { ...type.body, color: colors.danger, marginTop: 4 },
  hint: { ...type.small, color: colors.muted, textAlign: 'center' },
}));
