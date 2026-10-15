'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { friendly } from '@/lib/errors';
import { safeNext } from '@/lib/format';
import { PasswordField } from '@/components/PasswordField';
import { getSupabase } from '@/lib/supabase';

export function SignupClient() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'), '/plans/');
  const { ready, session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => { if (ready && session) router.replace(next); }, [ready, session, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 8) return setError('Choose a password with at least 8 characters.');
    if (password !== password2) return setError('The two passwords do not match.');
    setBusy(true);
    const { data, error: err } = await getSupabase().auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (err) return setError(friendly(err.message));
    if (data.session) {
      // best effort: welcome email (does nothing until email is activated in the admin)
      void getSupabase().functions.invoke('send-email', { body: { action: 'self', template: 'welcome' } }).catch(() => undefined);
      router.replace(next);
    } else setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <div className="wrap auth"><div className="card stack">
        <h1>Check your email</h1>
        <p>We sent a confirmation link to <b>{email}</b>. Open it to finish creating your account, then sign in.</p>
        <Link className="btn" href={`/login/?next=${encodeURIComponent(next)}`}>Go to sign in</Link>
      </div></div>
    );
  }
  return (
    <div className="wrap auth">
      <form className="card" onSubmit={submit}>
        <h1>Create your account</h1>
        <p className="muted" style={{ fontWeight: 700, marginBottom: 20 }}>For parents and guardians. You will add your children inside the app.</p>
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><div className="hint">Use this same email to sign in on the Genova app.</div></div>
        <PasswordField id="password" label="Password" autoComplete="new-password" required value={password} onChange={setPassword} hint="At least 8 characters." shown={show} onToggle={() => setShow((v) => !v)} />
        <PasswordField id="password2" label="Repeat password" autoComplete="new-password" required value={password2} onChange={setPassword2} shown={show} onToggle={() => setShow((v) => !v)} />
        {error && <div className="notice bad" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
        <button className="btn block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="center small" style={{ marginTop: 18, fontWeight: 700 }}>
          Already have an account? <Link href={`/login/?next=${encodeURIComponent(next)}`}>Sign in</Link><br />
          By continuing you agree to our <Link href="/privacy/">privacy policy</Link>.
        </p>
      </form>
    </div>
  );
}
