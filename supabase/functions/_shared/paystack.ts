// Pure Paystack helpers (no Deno-only APIs) so they can be unit tested under Node.

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Paystack signs the raw request body with HMAC-SHA512 using the secret key (hex digest). */
export async function signBody(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody)));
}

export async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const expected = await signBody(rawBody, secret);
  if (expected.length !== signature.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
  return diff === 0;
}

const DAY = 86_400_000;
const INTERVAL_MS: Record<string, number> = {
  hourly: DAY / 24, daily: DAY, weekly: 7 * DAY, monthly: 31 * DAY, quarterly: 92 * DAY, biannually: 184 * DAY, annually: 366 * DAY,
};

export type Interpreted = {
  action: 'activate' | 'past_due' | 'cancel' | 'ignore';
  dedupeKey: string;
  userId?: string;
  email?: string;
  customerCode?: string;
  subscriptionCode?: string;
  emailToken?: string;
  plan?: string;
  periodEnd?: string; // ISO
};

// deno-lint-ignore no-explicit-any
type Any = any;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
const isoOrUndef = (v: unknown): string | undefined => {
  const s = str(v);
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

/**
 * Turn a Paystack webhook payload into an entitlement action.
 * Field names follow Paystack's documented payloads but are read defensively; confirm
 * against a real test-mode delivery before going live.
 */
export function interpretEvent(body: Any, now = Date.now()): Interpreted {
  const event = str(body?.event) ?? 'unknown';
  const d: Any = body?.data ?? {};
  const customer: Any = d.customer ?? {};
  const sub: Any = d.subscription ?? {};
  const plan: Any = d.plan ?? sub.plan ?? {};

  const base = {
    userId: str(d.metadata?.user_id),
    email: str(customer.email)?.toLowerCase(),
    customerCode: str(customer.customer_code),
    subscriptionCode: str(d.subscription_code) ?? str(sub.subscription_code),
    emailToken: str(d.email_token) ?? str(sub.email_token),
    plan: str(plan.plan_code) ?? str(plan.name),
  };
  const ref = str(d.reference) ?? str(d.subscription_code) ?? str(d.invoice_code) ?? str(d.id)?.toString() ?? String(d.id ?? '');
  const dedupeKey = `${event}:${ref || JSON.stringify(d).length}:${str(d.paid_at) ?? str(d.createdAt) ?? ''}`;

  switch (event) {
    case 'subscription.create':
      return { ...base, dedupeKey, action: 'activate', periodEnd: isoOrUndef(d.next_payment_date) };
    case 'invoice.update':
    case 'invoice.create': {
      // A paid invoice renews access; an unpaid one is handled by invoice.payment_failed.
      if (event === 'invoice.update' && d.paid === false) return { ...base, dedupeKey, action: 'ignore' };
      if (event === 'invoice.create') return { ...base, dedupeKey, action: 'ignore' };
      return { ...base, dedupeKey, action: 'activate', periodEnd: isoOrUndef(sub.next_payment_date) };
    }
    case 'charge.success': {
      if (d.status && d.status !== 'success') return { ...base, dedupeKey, action: 'ignore' };
      // Only subscription charges grant access (initialised with a plan).
      if (!str(plan.plan_code) && !str(plan.name)) return { ...base, dedupeKey, action: 'ignore' };
      const paidAt = Date.parse(str(d.paid_at) ?? '') || now;
      const ms = INTERVAL_MS[String(plan.interval ?? 'monthly').toLowerCase()] ?? INTERVAL_MS.monthly;
      return { ...base, dedupeKey, action: 'activate', periodEnd: new Date(paidAt + ms).toISOString() };
    }
    case 'invoice.payment_failed':
      return { ...base, dedupeKey, action: 'past_due' };
    case 'subscription.disable':
      return { ...base, dedupeKey, action: 'cancel' };
    // subscription.not_renew: access continues until the period ends, so nothing to change.
    default:
      return { ...base, dedupeKey, action: 'ignore' };
  }
}
