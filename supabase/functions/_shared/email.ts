// Email rendering and sending (Resend), written against small injected dependencies so it can be unit tested.
// Template body syntax (same family as the privacy policy editor):
//   "# Heading", "- bullet", a blank line between paragraphs, "[Label](https://url)" alone on a line = button, {{variables}}.

export type Vars = Record<string, string | number | null | undefined>;

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replace {{name}} placeholders. Unknown or empty variables become an empty string. */
export function fill(text: string, vars: Vars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => {
    const v = vars[k];
    return v === null || v === undefined ? '' : String(v);
  });
}

const isHttp = (u: string) => /^https?:\/\//i.test(u);
const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

/** Turn the plain template body into branded HTML plus a plain-text alternative. */
export function renderEmail(subject: string, body: string, vars: Vars): { subject: string; html: string; text: string } {
  const filled = fill(body, vars).replace(/\r\n/g, '\n').trim();
  const blocks: string[] = [];
  const textParts: string[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushPara = () => { if (para.length) { blocks.push(`<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#232323">${para.map(inline).join('<br>')}</p>`); textParts.push(para.join('\n')); para = []; } };
  const flushList = () => { if (list.length) { blocks.push(`<ul style="margin:0 0 16px;padding-left:22px;font-size:16px;line-height:1.55;color:#232323">${list.map((l) => `<li style="margin-bottom:4px">${inline(l)}</li>`).join('')}</ul>`); textParts.push(list.map((l) => `- ${l}`).join('\n')); list = []; } };
  for (const raw of filled.split('\n')) {
    const line = raw.trim();
    const btn = line.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith('# ')) { flushPara(); flushList(); blocks.push(`<h2 style="margin:22px 0 8px;font-size:20px;line-height:1.25;color:#232323">${inline(line.slice(2))}</h2>`); textParts.push(line.slice(2).toUpperCase()); continue; }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2)); continue; }
    if (btn && isHttp(btn[2])) {
      flushPara(); flushList();
      blocks.push(`<p style="margin:8px 0 20px"><a href="${esc(btn[2])}" style="display:inline-block;background:#ffbe00;color:#232323;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:16px">${esc(btn[1])}</a></p>`);
      textParts.push(`${btn[1]}: ${btn[2]}`);
      continue;
    }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  const subj = fill(subject, vars).trim();
  const html = `<!doctype html><html><body style="margin:0;background:#fbf8fd;font-family:Nunito,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8fd"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#ab46d2;padding:22px 28px;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">Gen<span style="color:#ffbe00">o</span>va</td></tr>
<tr><td style="padding:28px 28px 8px">${blocks.join('')}</td></tr>
<tr><td style="padding:8px 28px 26px;font-size:12px;line-height:1.5;color:#6b6472;border-top:1px solid #ece3f1">Genova is a children's storybook app by CUSTAR.${vars.site_url ? ` <a href="${esc(String(vars.site_url))}" style="color:#7a2e99">${esc(String(vars.site_url).replace(/^https?:\/\//, ''))}</a>` : ''}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: subj, html, text: textParts.join('\n\n') };
}

export type MailSettings = { api_key: string | null; from_name: string; from_email: string | null; reply_to: string | null; enabled: boolean };
export type TemplateRow = { key: string; subject: string; body: string };
export type LogRow = { template: string | null; campaign: string | null; recipient: string; status: 'sent' | 'failed' | 'skipped'; error?: string | null; resend_id?: string | null; sent_by?: string | null };

export type MailDeps = {
  settings: () => Promise<MailSettings | null>;
  template: (key: string) => Promise<TemplateRow | null>;
  log: (row: LogRow) => Promise<void>;
  fetch?: typeof fetch;
};

export type SendOne = { to: string; vars?: Vars };
export type SendOpts = { template: string; subjectOverride?: string; campaign?: string; sentBy?: string; logSkipped?: boolean };
export type SendSummary = { sent: number; failed: number; skipped: number; firstError?: string };

const RESEND = 'https://api.resend.com';

export function createMailer(deps: MailDeps) {
  const doFetch = deps.fetch ?? fetch;

  async function send(recipients: SendOne[], opts: SendOpts, baseVars: Vars = {}): Promise<SendSummary> {
    const out: SendSummary = { sent: 0, failed: 0, skipped: 0 };
    const s = await deps.settings();
    if (!s?.enabled || !s.api_key || !s.from_email) {
      out.skipped = recipients.length;
      if (opts.logSkipped) for (const r of recipients) await deps.log({ template: opts.template, campaign: opts.campaign ?? null, recipient: r.to, status: 'skipped', error: 'Email is not activated', sent_by: opts.sentBy ?? null });
      return out;
    }
    const tpl = await deps.template(opts.template);
    if (!tpl) { out.failed = recipients.length; out.firstError = `Unknown template "${opts.template}"`; return out; }
    const from = s.from_name ? `${s.from_name} <${s.from_email}>` : s.from_email;
    // Resend's batch endpoint takes up to 100 messages; 50 keeps requests small.
    for (let i = 0; i < recipients.length; i += 50) {
      const chunk = recipients.slice(i, i + 50);
      const messages = chunk.map((r) => {
        const rendered = renderEmail(opts.subjectOverride ?? tpl.subject, tpl.body, { ...baseVars, ...r.vars, parent_email: r.vars?.parent_email ?? r.to });
        return { from, to: [r.to], subject: rendered.subject, html: rendered.html, text: rendered.text, ...(s.reply_to ? { reply_to: s.reply_to } : {}) };
      });
      let ids: (string | null)[] = [];
      let error: string | null = null;
      try {
        const res = await doFetch(`${RESEND}/emails/batch`, { method: 'POST', headers: { Authorization: `Bearer ${s.api_key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) error = body?.message ?? `Resend answered ${res.status}`;
        else ids = (body?.data ?? []).map((d: { id?: string }) => d?.id ?? null);
      } catch (e) { error = e instanceof Error ? e.message : 'Could not reach Resend'; }
      for (let j = 0; j < chunk.length; j++) {
        if (error) { out.failed++; out.firstError ??= error; }
        else out.sent++;
        await deps.log({ template: opts.template, campaign: opts.campaign ?? null, recipient: chunk[j].to, status: error ? 'failed' : 'sent', error, resend_id: ids[j] ?? null, sent_by: opts.sentBy ?? null });
      }
    }
    return out;
  }

  return { send, sendOne: (to: string, vars: Vars, opts: SendOpts) => send([{ to, vars }], opts) };
}

/** Check a Resend API key. A key limited to "sending access" is rejected by the domains endpoint with restricted_api_key, which still proves the key is real. */
export async function verifyResendKey(apiKey: string, doFetch: typeof fetch = fetch): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await doFetch(`${RESEND}/domains`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    if (body?.name === 'restricted_api_key') return { ok: true };
    return { ok: false, error: body?.message ?? `Resend answered ${res.status}` };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Resend' }; }
}

export const money = (minor: number, currency = 'NGN') => new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
export const longDate = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
