// Request handling for the send-email edge function, against injected dependencies so it can be unit tested.
import { createMailer, renderEmail, longDate, type LogRow, type MailSettings, type TemplateRow, type Vars } from './email.ts';

export type Settings = MailSettings & { notify_email: string | null };
export type AudienceRow = { parent_id: string; email: string; status: string; plan: string | null; access_until: string | null };

export type EmailDeps = {
  getCaller: (jwt: string) => Promise<{ id: string; email: string | null } | null>;
  isAdmin: (userId: string) => Promise<boolean>;
  settings: () => Promise<Settings | null>;
  saveSettings: (patch: Partial<Settings> & { verified_at?: string | null; updated_by?: string }) => Promise<void>;
  verifyKey: (apiKey: string) => Promise<{ ok: boolean; error?: string }>;
  audience: (kind: string) => Promise<AudienceRow[]>;
  template: (key: string) => Promise<TemplateRow | null>;
  log: (row: LogRow) => Promise<void>;
  recentSelfSends: (recipient: string, template: string, sinceIso: string) => Promise<number>;
  fetch?: typeof fetch;
  siteUrl: string;
  supportEmail: string;
  now?: () => number;
};

export type Result = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string): Result => ({ status, body: { error } });
const okEmail = (s: unknown) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const AUDIENCES = ['all', 'subscribers', 'free', 'past_due', 'expiring'] as const;
const SELF_TEMPLATES = ['welcome', 'security_change'];
const MAX_RECIPIENTS = 1000;

export async function handleEmail(authHeader: string | null, input: unknown, deps: EmailDeps): Promise<Result> {
  const jwt = authHeader?.replace(/^Bearer\s+/i, '') || '';
  if (!jwt) return fail(401, 'Sign in first.');
  const caller = await deps.getCaller(jwt);
  if (!caller) return fail(401, 'Your session has expired. Sign in again.');
  const inp = (input ?? {}) as Record<string, unknown>;
  const action = String(inp.action ?? '');
  const mailer = createMailer({ settings: deps.settings, template: deps.template, log: deps.log, fetch: deps.fetch });
  const common: Vars = { site_url: deps.siteUrl, support_email: deps.supportEmail };

  // ---- a signed-in parent may trigger a few emails to themselves only ----
  if (action === 'self') {
    const template = String(inp.template ?? '');
    if (!SELF_TEMPLATES.includes(template) || !caller.email) return fail(400, 'Not allowed.');
    const since = new Date((deps.now?.() ?? Date.now()) - 3_600_000).toISOString();
    if ((await deps.recentSelfSends(caller.email, template, since)) >= 3) return fail(429, 'Too many emails. Try again later.');
    const what = inp.what === 'passcode' ? 'passcode' : 'password';
    const r = await mailer.sendOne(caller.email, { ...common, parent_email: caller.email, what }, { template, sentBy: caller.id });
    return { status: 200, body: { ...r } };
  }

  if (!(await deps.isAdmin(caller.id))) return fail(403, 'Only admins can do that.');

  switch (action) {
    case 'save_settings': {
      const from_email = String(inp.from_email ?? '').trim();
      const reply_to = String(inp.reply_to ?? '').trim();
      const notify_email = String(inp.notify_email ?? '').trim();
      const from_name = String(inp.from_name ?? 'Genova').trim().slice(0, 60) || 'Genova';
      if (from_email && !okEmail(from_email)) return fail(400, 'The "from" address is not a valid email.');
      if (reply_to && !okEmail(reply_to)) return fail(400, 'The reply-to address is not a valid email.');
      if (notify_email && !okEmail(notify_email)) return fail(400, 'The support notification address is not a valid email.');
      const patch: Parameters<EmailDeps['saveSettings']>[0] = { from_name, from_email: from_email || null, reply_to: reply_to || null, notify_email: notify_email || null, updated_by: caller.id };
      const key = typeof inp.api_key === 'string' ? inp.api_key.trim() : '';
      if (key) {
        if (!/^re_[A-Za-z0-9_\-]{8,}$/.test(key)) return fail(400, 'That does not look like a Resend API key (it starts with re_).');
        // a new key must be activated again
        Object.assign(patch, { api_key: key, enabled: false, verified_at: null });
      }
      await deps.saveSettings(patch);
      await deps.log({ template: null, campaign: 'settings', recipient: caller.email ?? caller.id, status: 'sent', error: key ? 'API key replaced' : 'Settings saved', sent_by: caller.id });
      return { status: 200, body: { ok: true } };
    }
    case 'activate': {
      const s = await deps.settings();
      if (!s?.api_key) return fail(400, 'Add your Resend API key first.');
      if (!s.from_email) return fail(400, 'Add the "from" email address first.');
      const check = await deps.verifyKey(s.api_key);
      if (!check.ok) return fail(400, `Resend did not accept that key: ${check.error ?? 'unknown error'}`);
      await deps.saveSettings({ enabled: true, verified_at: new Date(deps.now?.() ?? Date.now()).toISOString(), updated_by: caller.id });
      return { status: 200, body: { ok: true } };
    }
    case 'deactivate':
      await deps.saveSettings({ enabled: false, updated_by: caller.id });
      return { status: 200, body: { ok: true } };
    case 'test': {
      const to = String(inp.to ?? caller.email ?? '').trim();
      if (!okEmail(to)) return fail(400, 'Enter a valid email address.');
      const r = await mailer.sendOne(to, { ...common, message: 'This is a test email from the Genova dashboard. If you can read this, email sending works.' }, { template: 'broadcast', subjectOverride: 'Genova test email', campaign: 'test', sentBy: caller.id, logSkipped: true });
      if (r.skipped) return fail(400, 'Email is not activated yet.');
      if (r.failed) return fail(502, r.firstError ?? 'The test email could not be sent.');
      return { status: 200, body: { ok: true } };
    }
    case 'preview': {
      const t = await deps.template(String(inp.template ?? ''));
      const subject = typeof inp.subject === 'string' ? inp.subject : t?.subject;
      const body = typeof inp.body === 'string' ? inp.body : t?.body;
      const eyebrow = typeof inp.eyebrow === 'string' ? inp.eyebrow : t?.eyebrow;
      if (subject === undefined || body === undefined) return fail(404, 'Unknown template.');
      const vars = { ...common, parent_email: 'parent@example.com', plan: 'Premium Monthly', amount: '₦5,000', access_until: '30 November 2026', paid_date: '1 November 2026', due_date: '25 November 2026', what: 'passcode', story_title: 'Luna and the Firefly', synopsis: 'Luna follows a tiny light through the garden.', story_url: `${deps.siteUrl}/`, message: 'Your message appears here.', ...((inp.vars as Vars) ?? {}) };
      const r = renderEmail(subject, body, vars, { eyebrow });
      return { status: 200, body: { subject: r.subject, html: r.html } };
    }
    case 'count': {
      const kind = String(inp.audience ?? '');
      if (!AUDIENCES.includes(kind as (typeof AUDIENCES)[number])) return fail(400, 'Unknown audience.');
      return { status: 200, body: { count: (await deps.audience(kind)).length } };
    }
    case 'send': {
      const template = String(inp.template ?? '');
      if (!(await deps.template(template))) return fail(404, 'Unknown template.');
      const extra = ((inp.vars ?? {}) as Vars);
      const subject = typeof inp.subject === 'string' && inp.subject.trim() ? inp.subject.trim() : undefined;
      let rows: AudienceRow[];
      if (inp.audience === 'one') {
        const to = String(inp.to ?? '').trim().toLowerCase();
        if (!okEmail(to)) return fail(400, 'Enter a valid email address.');
        rows = [{ parent_id: '', email: to, status: '', plan: null, access_until: null }];
      } else {
        if (!AUDIENCES.includes(String(inp.audience) as (typeof AUDIENCES)[number])) return fail(400, 'Choose who to send to.');
        rows = await deps.audience(String(inp.audience));
      }
      if (rows.length === 0) return fail(400, 'No one is in that group yet.');
      if (rows.length > MAX_RECIPIENTS) return fail(400, `That is more than ${MAX_RECIPIENTS} people. Send to a smaller group.`);
      const recipients = rows.map((r) => ({ to: r.email, vars: { parent_email: r.email, plan: r.plan ?? '', access_until: longDate(r.access_until), due_date: longDate(r.access_until), ...extra } as Vars }));
      const campaign = typeof inp.campaign === 'string' && inp.campaign.trim() ? inp.campaign.trim().slice(0, 80) : `${template} ${new Date(deps.now?.() ?? Date.now()).toISOString().slice(0, 10)}`;
      const r = await mailer.send(recipients, { template, subjectOverride: subject, campaign, sentBy: caller.id, logSkipped: true }, common);
      if (r.skipped) return fail(400, 'Email is not activated yet. Open the Connection tab and activate Resend.');
      return { status: 200, body: { ...r } };
    }
    default:
      return fail(400, 'Unknown action.');
  }
}
