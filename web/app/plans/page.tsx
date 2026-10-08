'use client';
import Link from 'next/link';
import { PlanCard } from '@/components/PlanCard';
import { PremiumBadge } from '@/components/PremiumBadge';
import { useAuth } from '@/lib/auth';

export default function PlansPage() {
  const { plans, access, session, ready } = useAuth();
  return (
    <div className="wrap">
      <div className="page-top">
        <h1>Choose how you read</h1>
        <p>Payments happen here on the website, never inside the app. Pick a plan, pay securely with Paystack, then sign in on the app with the same email.</p>
      </div>

      {ready && session && access.active && (
        <div className="banner" style={{ marginTop: 28 }}>
          <PremiumBadge access={access} large detail />
          <span style={{ fontWeight: 800 }}>{access.inGrace ? 'Your renewal is overdue. Renew now to keep Premium.' : 'Thank you for being a Premium family.'}</span>
          <Link href="/account/" className="btn secondary" style={{ marginLeft: 'auto' }}>Manage account</Link>
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        {!plans.length ? <p className="muted" aria-live="polite">Loading plans…</p> : (
          <div className="plans">{plans.map((p) => <PlanCard key={p.id} plan={p} plans={plans} access={access} signedIn={!!session} />)}</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 32 }}>
        <h3>If a payment does not go through</h3>
        <p className="muted" style={{ fontWeight: 600, marginTop: 8 }}>You keep Premium for 5 days after a missed renewal. If it still has not been paid after that, your account moves back to the Free plan automatically. You can resubscribe whenever you like.</p>
      </div>
    </div>
  );
}
