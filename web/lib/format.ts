export function formatMoney(minor: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
}
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
export const intervalLabel = (i: string | null) => (i === 'monthly' ? 'per month' : i === 'quarterly' ? 'every 3 months' : '');
/** Only same-site relative paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined, fallback = '/account/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}
