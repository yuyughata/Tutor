import Link from 'next/link';
import { formatMoney, intervalLabel } from '@/lib/format';
import { planFor, savingPercent } from '@/lib/plans';
import type { Access, Plan } from '@/lib/types';

export function PlanCard({ plan, plans, access, signedIn }: { plan: Plan; plans: Plan[]; access: Access; signedIn: boolean }) {
  const free = !plan.billing_interval;
  const mine = access.active ? planFor(plans, access.plan)?.id === plan.id : free;
  const best = plan.billing_interval === 'quarterly';
  const saving = savingPercent(plans, plan);
  const checkout = `/checkout/?plan=${plan.id}`;
  const href = free ? (signedIn ? '/account/' : '/signup/') : signedIn ? checkout : `/signup/?next=${encodeURIComponent(checkout)}`;
  let cta = free ? (signedIn ? 'Your account' : 'Get started free') : access.active && !access.inGrace && mine ? 'Manage in account' : signedIn ? 'Choose this plan' : 'Sign up and subscribe';
  if (access.inGrace && !free) cta = 'Renew now';
  return (
    <article className={`card plan${best ? ' best' : ''}`} aria-labelledby={`plan-${plan.id}`}>
      {mine && <span className="tag you">{free ? 'Your plan' : 'Your plan'}</span>}
      {best && saving > 0 && <span className="tag">Save {saving}%</span>}
      <div>
        <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
        <p className="muted small" style={{ fontWeight: 700 }}>{plan.tagline}</p>
      </div>
      <div><span className="price">{free ? '₦0' : formatMoney(plan.price_minor, plan.currency)}</span> <span className="per">{free ? 'forever' : intervalLabel(plan.billing_interval)}</span></div>
      <ul>{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
      <Link href={mine && access.active && !access.inGrace && !free ? '/account/' : href} className={`btn block${free ? ' secondary' : ''}`}>{cta}</Link>
    </article>
  );
}
