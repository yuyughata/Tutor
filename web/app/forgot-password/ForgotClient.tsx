'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { friendly } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

type Step = 'email' | 'code' | 'password';

/** Reset a forgotten password with a code sent to the parent's email (same flow as the app). */
export function ForgotClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(useSearchParams().get('email') ?? '');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const lastSent = useRef(0);
  const sb = getSupabase;

  async function send(e?: React.FormEvent) {
    e?.preventDefault(); setError(null);
    if (step === 'code' && Date.now() - lastSent.current < 60_000) return setError('Please wait a minute before asking for another code.');
    setBusy(true);
    const { error: err } = await sb().auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (err) return setError(friendly(err.message));
    lastSent.current = Date.now();
    setNote(`We sent a code to ${email.trim()}. It can take a minute to arrive; check your spam folder too.`);
    setStep('code');
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    const { error: err } = await sb().auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type: 'recovery' });
    setBusy(false);
    if (err) return setError(friendly(err.message));
    setStep('password');
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (pw.length < 8) return setError('Choose a password with at least 8 characters.');
    if (pw !== pw2) return setError('The two passwords do not match.');
    setBusy(true);
    const { error: err } = await sb().auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(friendly(err.message));
    router.replace('/account/');
  }

  return (
    <div className="wrap auth">
      <div className="card">
        {step === 'email' && (
          <form onSubmit={send}>
            <h1>Forgot your password?</h1>
            <p className="muted" style={{ fontWeight: 700, marginBottom: 20 }}>Enter the email you registered with. We will send you a code to reset it.</p>
            <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            {error && <div className="notice bad" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn block" disabled={busy || !email.includes('@')}>{busy ? 'Sending…' : 'Send me a code'}</button>
          </form>
        )}
        {step === 'code' && (
          <form onSubmit={verify}>
            <h1>Enter the code</h1>
            {note && <p className="muted" style={{ fontWeight: 700, margin: '6px 0 20px' }}>{note}</p>}
            <div className="field"><label htmlFor="code">Code from the email</label><input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} style={{ fontSize: 26, letterSpacing: 6, textAlign: 'center' }} /></div>
            {error && <div className="notice bad" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn block" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Continue'}</button>
            <p className="center" style={{ marginTop: 14 }}><button type="button" className="btn ghost" onClick={() => send()} disabled={busy}>Send a new code</button></p>
          </form>
        )}
        {step === 'password' && (
          <form onSubmit={save}>
            <h1>Choose a new password</h1>
            <p className="muted" style={{ fontWeight: 700, margin: '6px 0 20px' }}>Use at least 8 characters.</p>
            <div className="field"><label htmlFor="pw">New password</label><input id="pw" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="field"><label htmlFor="pw2">Repeat new password</label><input id="pw2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
            {error && <div className="notice bad" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn block" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
          </form>
        )}
        <p className="center small" style={{ marginTop: 18, fontWeight: 700 }}><Link href="/login/">Back to sign in</Link></p>
      </div>
    </div>
  );
}
