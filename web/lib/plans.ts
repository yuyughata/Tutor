import type { Plan } from './types';

/** The stored plan is our plan id ('monthly'), or a Paystack plan code when it came from a webhook. */
export function planFor(plans: Plan[], stored: string | null): Plan | undefined {
  if (!stored) return undefined;
  return plans.find((p) => p.id === stored || p.paystack_plan_code === stored);
}
export function planLabel(plans: Plan[], stored: string | null): string {
  if (!stored) return 'Free';
  if (stored === 'comp') return 'Complimentary Premium';
  return planFor(plans, stored)?.name ?? 'Premium';
}
/** "Save 20%" for the quarterly plan versus paying monthly. */
export function savingPercent(plans: Plan[], plan: Plan): number {
  const monthly = plans.find((p) => p.billing_interval === 'monthly');
  if (!monthly || plan.billing_interval !== 'quarterly') return 0;
  return Math.round((1 - plan.price_minor / (monthly.price_minor * 3)) * 100);
}
