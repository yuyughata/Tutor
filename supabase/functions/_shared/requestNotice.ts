// "A visitor sent a form": email the team so they can reply quickly. Called by the database trigger (migration 0018)
// through pg_net with the x-job-secret header; written against small injected dependencies so it can be unit tested.
import { createMailer, type LogRow, type MailSettings, type TemplateRow, type Vars } from './email.ts';

export type RequestKind = 'grp' | 'title';
export type RequestRow = Record<string, string | null | undefined>;
export type NoticeDeps = {
  jobSecret: () => Promise<string | null>;
  loadRequest: (kind: RequestKind, id: string) => Promise<RequestRow | null>;
  settings: () => Promise<(MailSettings & { notify_email: string | null }) | null>;
  /** Used when no notification address is saved: every admin account's email. */
  adminEmails: () => Promise<string[]>;
  template: (key: string) => Promise<TemplateRow | null>;
  log: (row: LogRow) => Promise<void>;
  fetch?: typeof fetch;
  siteUrl: string;
};
export type NoticeResult = { status: number; body: Record<string, unknown> };

const fail = (status: number, error: string): NoticeResult => ({ status, body: { error } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** One line, no markdown structure: visitor text can never add headings, buttons or rows to the email. */
const clean = (s: unknown, max = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** wa.me wants the number with its country code and no symbols; a Nigerian 0xxxxxxxxxx number becomes 234xxxxxxxxxx. */
export function whatsappLink(phone: string): string {
  let d = phone.replace(/[^0-9]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 11) d = '234' + d.slice(1);
  return d.length >= 8 ? `https://wa.me/${d}` : '';
}

export async function handleNewRequest(secretHeader: string | null, input: unknown, deps: NoticeDeps): Promise<NoticeResult> {
  const expected = await deps.jobSecret();
  if (!expected || !secretHeader || !same(secretHeader, expected)) return fail(401, 'Not allowed.');

  const { kind, id } = (input ?? {}) as { kind?: string; id?: string };
  if ((kind !== 'grp' && kind !== 'title') || typeof id !== 'string' || !UUID.test(id)) return fail(400, 'Unknown request.');
  const row = await deps.loadRequest(kind, id);
  if (!row) return fail(404, 'Request not found.');

  const s = await deps.settings();
  const notify = clean(s?.notify_email, 200);
  const to = notify ? [notify] : [...new Set((await deps.adminEmails()).map((e) => e.trim()).filter(Boolean))];
  if (!to.length) return { status: 200, body: { skipped: 'no one to notify' } };

  const lines: [string, string][] = [['Name', clean(row.full_name, 120)], ['Phone', clean(row.phone, 25)], ['Email', clean(row.email, 200)]];
  if (kind === 'grp') lines.push(['Reading level', clean(row.reading_level, 80)], ['How', clean(row.mode, 20)]);
  else lines.push(['Storybook title', clean(row.storybook_title, 200)], ['Reader level', clean(row.reader_level, 80)]);
  const comments = clean(row.comments, 600);
  const wa = whatsappLink(clean(row.phone, 25));
  const vars: Vars = {
    kind_label: kind === 'grp' ? 'GRP spot request' : 'title request',
    name: clean(row.full_name, 120),
    details: lines.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join('\n'),
    comments_block: comments ? `## Comments\n> ${comments}` : '',
    whatsapp_block: wa ? `[Reply on WhatsApp](${wa})` : '',
    site_url: deps.siteUrl,
  };
  const mailer = createMailer({ settings: deps.settings, template: deps.template, log: deps.log, fetch: deps.fetch });
  const r = await mailer.send(to.map((email) => ({ to: email })), { template: 'new_request', campaign: `new ${kind} request`, logSkipped: true }, vars);
  return { status: r.failed ? 502 : 200, body: { ...r } };
}
