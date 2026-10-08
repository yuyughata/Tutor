import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Button } from '../src/components/Button';
import { useAuth } from '../src/state/auth';
import { colors, fonts, radius, space, type } from '../src/theme';

export default function SignIn() {
  const { signIn, signUp } = useAuth();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const err = await (creating ? signUp : signIn)(email.trim(), password);
    setBusy(false);
    if (err) setMsg(err);
    else router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: 8 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>PARENT ACCOUNT</Text>
        <Text style={styles.title}>{creating ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={styles.body}>Use the same email you subscribed with on the Genova website.</Text>

        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.lock} keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="Email" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" placeholderTextColor={colors.lock} secureTextEntry autoCapitalize="none" autoComplete={creating ? 'new-password' : 'current-password'} accessibilityLabel="Password" style={styles.input} />
        {msg && <Text style={styles.msg} accessibilityLiveRegion="polite">{msg}</Text>}

        <Button label={creating ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} disabled={!email.includes('@') || password.length < 8} style={{ marginTop: 8 }} />
        <Button label={creating ? 'I already have an account' : 'New here? Create an account'} variant="ghost" onPress={() => { setCreating((c) => !c); setMsg(null); }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kicker: { ...type.label, color: colors.purple },
  title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.muted, marginBottom: 12 },
  input: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 18, height: 56, marginTop: 8 },
  msg: { ...type.body, color: colors.danger, marginTop: 4 },
});
