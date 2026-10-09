// Scheduled reminder emails: who gets what today. Written against injected dependencies so it can be unit tested.
import { createMailer, longDate, money, type LogRow, type MailSettings, type TemplateRow, type Vars } from './email.ts';

export type Candidate = {
  parent_id: string; email: string; kind: string; plan_id: string | null; plan_name: string | null;
  amount_minor: number | null; currency: string | null; period_end: string; access_until: string | null;
};

export type ReminderDeps = {
  /** The shared secret the daily cron job sends (null if not set up). */
  jobSecret: () => Promise<string | null>;
  getCaller: (jwt: string) => Promise<{ id: string } | null>;
  isAdmin: (userId: string) => Promise<boolean>;
  settings: () => Promise<MailSettings | null>;
  template: (key: string) => Promise<TemplateRow | null>;
  log: (row: LogRow) => Promise<void>;
  /** Everyone due a reminder right now and not yet sent one for this billing period. */
  candidates: () => Promise<Candidate[]>;
  /** Reserve (parent, kind, period). False if it was already sent or is being sent. */
  claim: (c: Candidate) => Promise<boolean>;
  /** Give the reservation back when the email did not go out, so tomorrow's run retries. */
  release: (c: Candidate) => Promise<void>;
  fetch?: typeof fetch;
  siteUrl: string;
  supportEmail: string;
};

export type RunResult = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string): RunResult => ({ status, body: { error } });

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function handleReminders(headers: { jobSecret: string | null; authorization: string | null }, input: unknown, deps: ReminderDeps): Promise<RunResult> {
  // Caller is either the daily cron job (shared secret) or a signed-in admin pressing "Run now".
  let trusted = false;
  const secret = headers.jobSecret ? await deps.jobSecret() : null;
  if (headers.jobSecret && secret && same(headers.jobSecret, secret)) trusted = true;
  if (!trusted) {
    const jwt = headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    if (!jwt) return fail(401, 'Not allowed.');
    const caller = await deps.getCaller(jwt);
    if (!caller) return fail(401, 'Your session has expired. Sign in again.');
    if (!(await deps.isAdmin(caller.id))) return fail(403, 'Only admins can do that.');
  }
  const dryRun = (input as { dryRun?: boolean } | null)?.dryRun === true;

  const due = await deps.candidates();
  const byKind: Record<string, number> = {};
  for (const c of due) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
  if (dryRun) return { status: 200, body: { due: due.length, byKind } };

  const s = await deps.settings();
  if (!s?.enabled || !s.api_key || !s.from_email) {
    return { status: 200, body: { due: due.length, byKind, sent: 0, failed: 0, skipped: due.length, note: 'Email is not activated, so nothing was sent. Reminders will go out once it is.' } };
  }

  const mailer = createMailer({ settings: deps.settings, template: deps.template, log: deps.log, fetch: deps.fetch });
  const common: Vars = { site_url: deps.siteUrl, support_email: deps.supportEmail };
  let sent = 0, failed = 0, already = 0;
  let firstError: string | undefined;
  for (const c of due) {
    if (!(await deps.claim(c))) { already++; continue; }
    const vars: Vars = {
      ...common, parent_email: c.email, plan: c.plan_name ?? c.plan_id ?? 'Premium',
      amount: c.amount_minor ? money(c.amount_minor, c.currency ?? 'NGN') : '',
      renew_date: longDate(c.period_end), due_date: longDate(c.period_end), access_until: longDate(c.access_until),
    };
    const r = await mailer.sendOne(c.email, vars, { template: c.kind, campaign: `reminder:${c.kind}` });
    if (r.sent) sent++;
    else { failed++; firstError ??= r.firstError ?? 'Not sent'; await deps.release(c); }
  }
  return { status: 200, body: { due: due.length, byKind, sent, failed, skipped: 0, alreadySent: already, ...(firstError ? { firstError } : {}) } };
}
