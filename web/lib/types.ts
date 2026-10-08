export type Plan = {
  id: string; name: string; tagline: string | null; price_minor: number; currency: string;
  billing_interval: 'monthly' | 'quarterly' | null; paystack_plan_code: string | null; features: string[]; sort_order: number;
};
export type Access = {
  active: boolean; status: string | null; plan: string | null;
  currentPeriodEnd: string | null; accessUntil: string | null; inGrace: boolean;
};
export const FREE_ACCESS: Access = { active: false, status: null, plan: null, currentPeriodEnd: null, accessUntil: null, inGrace: false };
