'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PremiumBadge } from '@/components/PremiumBadge';
import { PrivacyDialog } from '@/components/PrivacyDialog';
import { useAuth } from '@/lib/auth';
import { functionError } from '@/lib/errors';
import { formatMoney, intervalLabel } from '@/lib/format';
import { savingPercent } from '@/lib/plans';
import { getSupabase } from '@/lib/supabase';

export function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get('plan') || 'monthly';
  const { ready, session, email, access, plans } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    if (ready && !session) router.replace(`/login/?next=${encodeURIComponent(`/checkout/?plan=${planId}`)}`);
  }, [ready, session, router, planId]);

  const plan = plans.find((p) => p.id === planId && p.billing_interval);
  const alreadyActive = access.active && !access.inGrace && access.status === 'active';

  async function pay() {
    if (!agreed) { setError('Please read the privacy policy and tick the consent box to continue.'); return; }
    setBusy(true); setError(null);
    const { data, error: err } = await getSupabase().functions.invoke('paystack-checkout', { body: { plan: planId, consent: agreed } });
    if (err || !data?.url) { setError(err ? await functionError(err) : data?.error ?? 'Could not start checkout.'); setBusy(false); return; }
    window.location.href = data.url; // Paystack's secure payment page
  }

  if (!ready || !session) return <div className="wrap page-top"><p className="muted" aria-live="polite"><span className="spinner" /> Loading…</p></div>;
  if (plans.length && !plan) {
    return <div className="wrap page-top"><h1>That plan is not available</h1><p>Pick one of our plans instead.</p><p style={{ marginTop: 20 }}><Link className="btn" href="/plans/">See plans</Link></p></div>;
  }

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <div className="page-top"><h1>Checkout</h1><p>You are one step away from the whole Genova library.</p></div>
      {access.active && (
        <div className="banner" style={{ marginBottom: 20 }}>
          <PremiumBadge access={access} large detail />
          <span style={{ fontWeight: 800 }}>{alreadyActive ? 'You already have Premium, so there is nothing to pay right now.' : 'Your renewal is overdue. Paying now keeps your Premium going.'}</span>
        </div>
      )}
      {plan && (
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div><h3>{plan.name}</h3><p className="muted small" style={{ fontWeight: 700 }}>{plan.tagline}{savingPercent(plans, plan) ? ` · save ${savingPercent(plans, plan)}%` : ''}</p></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 32, fontWeight: 900 }}>{formatMoney(plan.price_minor, plan.currency)}</div><div className="muted small" style={{ fontWeight: 800 }}>{intervalLabel(plan.billing_interval)}</div></div>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)' }} />
          <dl className="facts"><dt>Account</dt><dd>{email}</dd><dt>Renews</dt><dd>Automatically {intervalLabel(plan.billing_interval)}. Cancel any time.</dd></dl>
          <div className="consent">
            <input id="consent" type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(null); }} />
            <label htmlFor="consent">
              I am the parent or guardian. I have read the <button type="button" className="linkbtn" onClick={() => setPolicyOpen(true)}>privacy policy</button> and I consent to Genova handling my child&apos;s reader profile (first name or nickname, avatar, reading level and reading activity) as it describes.
            </label>
          </div>
          {error && <div className="notice bad" role="alert">{error}</div>}
          <button className="btn big block" onClick={pay} disabled={busy || alreadyActive || !agreed}>{busy ? 'Opening secure payment…' : `Pay ${formatMoney(plan.price_minor, plan.currency)} with Paystack`}</button>
          <p className="muted small" style={{ fontWeight: 600 }}>
            You will be taken to Paystack to pay securely; we never see your card details. If a renewal fails you keep Premium for 5 more days, then your account moves back to Free automatically. Your consent is saved with your account.
          </p>
        </div>
      )}
      <PrivacyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} onAgree={() => { setAgreed(true); setError(null); }} />
      <p style={{ marginTop: 20 }}><Link href="/plans/">← Back to plans</Link></p>
    </div>
  );
}
