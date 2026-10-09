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

const isHttp = (u: string) => /^https?:\/\//i.test(u) || /^\{\{\s*\./.test(u); // the second form is a Supabase Auth placeholder such as {{ .ConfirmationURL }}
const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

// ---- look and feel: quiet, spacious, one accent (amber), hairlines instead of boxes ----
const FONT = "'Nunito','Avenir Next',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const INK = '#232323', SOFT = '#4a4650', MUTED = '#8a8490', LINE = '#ebe7e2', PAPER = '#f6f4f0', AMBER = '#ffbe00';
const P = `margin:0 0 18px;font-size:16px;line-height:1.7;color:${SOFT}`;

/** Wordmark: "Genova" with an amber o. */
const wordmark = (size: number) => `<span class="ink" style="font-size:${size}px;font-weight:900;letter-spacing:-0.04em;color:${INK}">Gen<span style="color:${AMBER}">o</span>va</span>`;

/**
 * Turn the plain template body into a branded, minimal HTML email plus a plain-text alternative.
 * Syntax: "# Title" (first one is the big headline), "## Section", "- bullet", "- Label: value" lines become a
 * summary table (receipts), "> text" is a highlighted note, "![alt](url)" a picture, "[Label](url)" an amber button,
 * a line wrapped in backticks is a big code box, "**bold**", a blank line between paragraphs, {{variables}}.
 */
export function renderEmail(subject: string, body: string, vars: Vars, opts: { eyebrow?: string | null } = {}): { subject: string; html: string; text: string } {
  const filled = fill(body, vars).replace(/\r\n/g, '\n').trim();
  const blocks: string[] = [];
  const textParts: string[] = [];
  let list: string[] = [];
  let para: string[] = [];
  let sawTitle = false;

  const flushPara = () => {
    if (!para.length) return;
    blocks.push(`<p style="${P}" class="soft">${para.map(inline).join('<br>')}</p>`);
    textParts.push(para.join('\n')); para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    // "Label: value" lines are a summary (receipt) table; a line with a label and no value is left out
    const kv = list.map((l) => l.match(/^([^:]{1,40}):\s*(.*)$/));
    if (kv.every(Boolean)) {
      const rows = kv.map((m) => ({ k: m![1].trim(), v: m![2].trim() })).filter((r) => r.v);
      if (rows.length) {
        blocks.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;border-collapse:collapse">${rows.map((r, i) => {
          const strong = /^(amount|total)/i.test(r.k);
          return `<tr><td class="line mut" style="padding:13px 0;border-top:1px solid ${LINE};${i === rows.length - 1 ? `border-bottom:1px solid ${LINE};` : ''}font-size:14px;color:${MUTED}">${esc(r.k)}</td><td align="right" class="line ink" style="padding:13px 0;border-top:1px solid ${LINE};${i === rows.length - 1 ? `border-bottom:1px solid ${LINE};` : ''}font-size:${strong ? 18 : 15}px;font-weight:${strong ? 900 : 700};color:${INK}">${esc(r.v)}</td></tr>`;
        }).join('')}</table>`);
        textParts.push(rows.map((r) => `${r.k}: ${r.v}`).join('\n'));
      }
    } else {
      blocks.push(`<ul style="margin:0 0 22px;padding-left:20px;font-size:16px;line-height:1.7;color:${SOFT}" class="soft">${list.map((l) => `<li style="margin-bottom:6px;padding-left:2px">${inline(l)}</li>`).join('')}</ul>`);
      textParts.push(list.map((l) => `- ${l}`).join('\n'));
    }
    list = [];
  };
  const flush = () => { flushPara(); flushList(); };

  for (const raw of filled.split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const btn = line.match(/^\[([^\]]+)\]\((\{\{[^}]*\}\}|[^)\s]+)\)$/);
    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]*)\)$/);
    const code = line.match(/^`([^`]+)`$/);
    if (img) { flush(); if (img[2] && /^https:\/\//i.test(img[2])) { blocks.push(`<p style="margin:0 0 28px;text-align:center"><img src="${esc(img[2])}" alt="${esc(img[1])}" width="320" style="display:inline-block;width:100%;max-width:320px;height:auto;border-radius:14px;border:0"></p>`); } continue; }
    if (line.startsWith('# ') || line.startsWith('## ')) {
      flush();
      const text = line.replace(/^#+\s*/, '');
      if (line.startsWith('# ') && !sawTitle) { sawTitle = true; blocks.push(`<h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;font-weight:900;letter-spacing:-0.02em;color:${INK}" class="ink">${inline(text)}</h1>`); textParts.push(text.toUpperCase()); }
      else { blocks.push(`<h2 style="margin:30px 0 10px;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED}" class="mut">${inline(text)}</h2>`); textParts.push(text.toUpperCase()); }
      continue;
    }
    if (line.startsWith('> ')) { flush(); blocks.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr><td class="note" style="background:#fbf7ea;border-left:3px solid ${AMBER};padding:16px 18px;font-size:16px;line-height:1.6;font-weight:700;color:${INK};border-radius:0 10px 10px 0">${inline(line.slice(2))}</td></tr></table>`); textParts.push(line.slice(2)); continue; }
    if (code) { flush(); blocks.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 26px"><tr><td align="center" class="note ink" style="background:${PAPER};border-radius:12px;padding:20px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;line-height:1;font-weight:700;letter-spacing:0.28em;color:${INK}">${esc(code[1])}</td></tr></table>`); textParts.push(code[1]); continue; }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2)); continue; }
    if (btn && isHttp(btn[2])) {
      flush();
      blocks.push(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 26px"><tr><td style="background:${AMBER};border-radius:999px"><a href="${esc(btn[2])}" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:800;letter-spacing:0.01em;color:${INK};text-decoration:none">${esc(btn[1])}</a></td></tr></table>`);
      textParts.push(`${btn[1]}: ${btn[2]}`);
      continue;
    }
    flushList(); para.push(line);
  }
  flush();

  const subj = fill(subject, vars).trim();
  const site = vars.site_url ? String(vars.site_url).replace(/\/$/, '') : '';
  const link = (label: string, path: string) => (site ? `<a href="${esc(site + path)}" style="color:${MUTED};text-decoration:underline">${label}</a>` : label);
  const eyebrow = opts.eyebrow ? `<p style="margin:0 0 14px;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED}" class="mut"><span style="display:inline-block;width:22px;height:3px;background:${AMBER};vertical-align:middle;margin-right:10px;border-radius:2px"></span>${esc(opts.eyebrow)}</p>` : '';
  const pre = (textParts.find((t) => t.length > 30) ?? subj).replace(/\s+/g, ' ').slice(0, 110);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(subj)}</title>
<style>
@media (prefers-color-scheme: dark){.page{background:#121114!important}.card{background:#1b191e!important;border-color:#2a272e!important}.ink{color:#f3f0f6!important}.soft{color:#cfc9d6!important}.mut{color:#9d97a6!important}.line{border-color:#2a272e!important}.note{background:#26231a!important;color:#f3f0f6!important}}
@media (max-width:520px){.pad{padding:28px 22px!important}}
</style></head>
<body class="page" style="margin:0;padding:0;background:${PAPER};font-family:${FONT};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="page" style="background:${PAPER}"><tr><td align="center" style="padding:36px 14px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td align="center" style="padding:0 0 22px">${wordmark(26)}</td></tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:18px;overflow:hidden">
    <tr><td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,#ab46d2 0%,#10a19c 55%,${AMBER} 100%)">&nbsp;</td></tr>
    <tr><td class="pad" style="padding:40px 42px 22px">${eyebrow}${blocks.join('')}</td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td align="center" class="mut" style="padding:26px 20px 0;font-size:12px;line-height:1.7;color:${MUTED}">
    ${link('Your account', '/account/')} &nbsp;·&nbsp; ${link('Privacy', '/privacy/')} &nbsp;·&nbsp; ${link('Contact support', '/account/#support')}<br>
    Genova is a children's storybook app by CUSTAR.<br>You are receiving this because you have a Genova account.
  </td></tr></table>
</td></tr></table></body></html>`;
  return { subject: subj, html, text: textParts.join('\n\n') + (site ? `\n\n--\nGenova, a CUSTAR storybook app. ${site}` : '') };
}

export type MailSettings = { api_key: string | null; from_name: string; from_email: string | null; reply_to: string | null; enabled: boolean };
export type TemplateRow = { key: string; subject: string; body: string; eyebrow?: string | null };
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
        const rendered = renderEmail(opts.subjectOverride ?? tpl.subject, tpl.body, { ...baseVars, ...r.vars, parent_email: r.vars?.parent_email ?? r.to }, { eyebrow: tpl.eyebrow });
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
