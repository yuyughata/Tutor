'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PremiumBadge } from '@/components/PremiumBadge';
import { useAuth } from '@/lib/auth';
import { friendly, functionError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { planLabel } from '@/lib/plans';
import { getSupabase } from '@/lib/supabase';

export function AccountClient() {
  const router = useRouter();
  const params = useSearchParams();
  const justPaid = params.get('paid') === '1';
  const { ready, session, email, access, plans, refreshAccess, signOut } = useAuth();
  const [confirming, setConfirming] = useState(justPaid);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false); // signing out on purpose: go home, not to the sign-in page
  const [error, setError] = useState<string | null>(null);
  const tries = useRef(0);

  useEffect(() => { if (ready && !session && !leaving) router.replace('/login/?next=%2Faccount%2F'); }, [ready, session, leaving, router]);

  // After Paystack sends the parent back, the webhook may take a few seconds: check until Premium shows up.
  useEffect(() => {
    if (!justPaid || !session || access.active) { if (access.active) setConfirming(false); return; }
    const t = setInterval(async () => {
      tries.current += 1;
      const a = await refreshAccess();
      if (a.active || tries.current >= 20) { setConfirming(false); clearInterval(t); }
    }, 3000);
    return () => clearInterval(t);
  }, [justPaid, session, access.active, refreshAccess]);

  async function manage() {
    setBusy(true); setError(null);
    const { data, error: err } = await getSupabase().functions.invoke('paystack-manage', { body: {} });
    if (err || !data?.url) { setError(err ? await functionError(err) : data?.error ?? 'Could not open subscription settings.'); setBusy(false); return; }
    window.location.href = data.url;
  }

  if (!ready || !session) return <div className="wrap page-top"><p className="muted" aria-live="polite"><span className="spinner" /> Loading…</p></div>;

  const status = access.inGrace ? 'Payment overdue (grace period)' : access.status === 'canceled' ? 'Cancelled, ends at the end of your paid period' : access.active ? 'Active' : access.status === 'expired' ? 'Expired. Back on the Free plan' : 'Free plan';
  const nextKey = access.inGrace || access.status === 'canceled' ? 'Premium ends' : 'Renews on';
  const nextDate = access.inGrace || access.status === 'canceled' ? access.accessUntil : access.currentPeriodEnd;

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="page-top"><h1>Your account</h1><p>{email}</p></div>

      {justPaid && confirming && <div className="notice ok" role="status" style={{ marginBottom: 20 }}><span className="spinner" /> Confirming your payment with Paystack. This usually takes a few seconds…</div>}
      {justPaid && !confirming && access.active && <div className="notice ok" role="status" style={{ marginBottom: 20 }}>Payment received. Welcome to Premium! Open the Genova app and sign in with this email.</div>}
      {justPaid && !confirming && !access.active && <div className="notice" role="status" style={{ marginBottom: 20 }}>We have not heard back from Paystack yet. If you were charged, Premium will appear here shortly. Refresh this page in a minute.</div>}

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 26 }}>Your plan</h2>
          {access.active ? <PremiumBadge access={access} large /> : <span className="premium" style={{ background: 'var(--line)', boxShadow: 'none', color: 'var(--muted)' }}>Free plan</span>}
        </div>
        {access.inGrace && <div className="notice" role="alert">Your last payment did not go through. You keep Premium until {formatDate(access.accessUntil)}. Renew before then, or your account will move back to the Free plan.</div>}
        <dl className="facts">
          <dt>Plan</dt><dd>{access.active || access.status ? planLabel(plans, access.plan) : 'Free'}</dd>
          <dt>Status</dt><dd>{status}</dd>
          {access.active && nextDate && <><dt>{nextKey}</dt><dd>{formatDate(nextDate)}</dd></>}
        </dl>
        {error && <div className="notice bad" role="alert">{error}</div>}
        <div className="row">
          {!access.active && <Link href="/plans/" className="btn">Get Premium</Link>}
          {access.inGrace && <Link href={`/checkout/?plan=${plans.find((p) => p.id === access.plan || p.paystack_plan_code === access.plan)?.id ?? 'monthly'}`} className="btn">Renew now</Link>}
          {access.active && access.status !== 'canceled' && <button className="btn secondary" onClick={manage} disabled={busy}>{busy ? 'Opening…' : 'Manage or cancel subscription'}</button>}
        </div>
        <p className="muted small" style={{ fontWeight: 600 }}>Sign in on the Genova app with <b>{email}</b> and your Premium stories unlock on that device.</p>
      </div>

      <PasswordCard />

      <div className="row" style={{ marginTop: 28 }}>
        <button className="btn ghost" onClick={async () => { setLeaving(true); await signOut(); router.replace('/'); }}>Sign out</button>
        <Link href="/privacy/" className="btn ghost">Privacy policy</Link>
      </div>
    </div>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (pw.length < 8) return setMsg({ ok: false, text: 'Choose a password with at least 8 characters.' });
    if (pw !== pw2) return setMsg({ ok: false, text: 'The two passwords do not match.' });
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: friendly(error.message) });
    setPw(''); setPw2(''); setMsg({ ok: true, text: 'Password changed.' });
  }
  return (
    <form className="card" style={{ marginTop: 24 }} onSubmit={save}>
      <h3 style={{ marginBottom: 14 }}>Change password</h3>
      <div className="field"><label htmlFor="pw">New password</label><input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div className="field"><label htmlFor="pw2">Repeat new password</label><input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
      {msg && <div className={`notice ${msg.ok ? 'ok' : 'bad'}`} role="status" style={{ marginBottom: 14 }}>{msg.text}</div>}
      <button className="btn secondary" disabled={busy || !pw}>{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}
