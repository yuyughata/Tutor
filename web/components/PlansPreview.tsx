'use client';
import { useAuth } from '@/lib/auth';
import { PlanCard } from './PlanCard';

export function PlansPreview() {
  const { plans, access, session } = useAuth();
  if (!plans.length) return <p className="muted" aria-live="polite">Loading plans…</p>;
  return <div className="plans">{plans.map((p) => <PlanCard key={p.id} plan={p} plans={plans} access={access} signedIn={!!session} />)}</div>;
}
