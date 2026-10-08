import { formatDate } from '@/lib/format';
import type { Access } from '@/lib/types';

function Crown() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8zm2.6 13h12.8v-1.6H5.6V21z" />
    </svg>
  );
}

/**
 * The parent's Premium badge, shown on the pages where they pay and manage their plan.
 * Gold when active; outlined amber when payment is overdue but still inside the 5-day grace period.
 */
export function PremiumBadge({ access, large = false, detail = false }: { access: Access; large?: boolean; detail?: boolean }) {
  if (!access.active) return null;
  const warn = access.inGrace || access.status === 'past_due';
  const cancelled = access.status === 'canceled';
  const until = formatDate(access.accessUntil ?? access.currentPeriodEnd);
  const label = warn ? 'Premium · payment overdue' : cancelled ? 'Premium · ends soon' : 'Premium';
  return (
    <span className={`premium${warn ? ' warn' : ''}${large ? ' lg' : ''}`} role="status" aria-label={`${label}${until && detail ? `, until ${until}` : ''}`}>
      <Crown />
      <span>{label}</span>
      {detail && until && <small>{warn || cancelled ? `until ${until}` : `renews ${formatDate(access.currentPeriodEnd)}`}</small>}
    </span>
  );
}
