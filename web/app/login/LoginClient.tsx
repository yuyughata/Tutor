'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { friendly } from '@/lib/errors';
import { safeNext } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';

export function LoginClient() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const { ready, session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (ready && session) router.replace(next); }, [ready, session, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) return setError(friendly(err.message));
    router.replace(next);
  }
  return (
    <div className="wrap auth">
      <form className="card" onSubmit={submit}>
        <h1>Welcome back</h1>
        <p className="muted" style={{ fontWeight: 700, marginBottom: 20 }}>Sign in to manage your plan.</p>
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <div className="notice bad" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
        <button className="btn block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="center small" style={{ marginTop: 18, fontWeight: 700 }}>
          <Link href={`/forgot-password/${email ? `?email=${encodeURIComponent(email)}` : ''}`}>Forgot your password?</Link><br />
          New here? <Link href={`/signup/?next=${encodeURIComponent(next)}`}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
