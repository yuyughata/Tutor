// Renders every email template to standalone HTML for preview (docs/email-templates) and builds the Supabase Auth
// email templates (supabase/auth-email-templates) in the same design.
//   node --experimental-strip-types tools/email/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderEmail } from '../../supabase/functions/_shared/email.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const templates = JSON.parse(readFileSync(join(here, 'templates.json'), 'utf8'));

export const SAMPLE = {
  parent_email: 'ada.parent@example.com', plan: 'Premium Quarterly', amount: '₦12,000', paid_date: '9 October 2026',
  access_until: '9 January 2027', renew_date: '9 January 2027', due_date: '9 January 2027', what: 'passcode',
  story_title: 'Luna and the Firefly', synopsis: 'Luna follows a tiny light through the garden and learns where fireflies go at dawn.',
  story_url: 'https://genova.example/', cover_url: 'https://genova.example/cover.png', site_url: 'https://genova.example', support_email: 'support@custar.com',
  message: '# Three new bedtime stories\nOn Friday we are adding three gentle new stories for our youngest readers.\n\n- Bedtime for Bear\n- The Sleepy Moon\n- Ten Little Stars\n\n[See what is new](https://genova.example/)',
};

mkdirSync(join(root, 'docs', 'email-templates'), { recursive: true });
const index = [];
for (const t of templates) {
  const vars = { ...SAMPLE };
  if (t.key === 'support_received') vars.message = 'My tablet still shows the Free plan after I paid yesterday.';
  const r = renderEmail(t.subject, t.body, vars, { eyebrow: t.eyebrow });
  writeFileSync(join(root, 'docs', 'email-templates', `${t.key}.html`), r.html);
  index.push({ key: t.key, name: t.name, subject: r.subject, eyebrow: t.eyebrow, description: t.description, automatic: t.automatic });
}
writeFileSync(join(here, 'index.json'), JSON.stringify(index, null, 1));

// ---- Supabase Auth emails (sent by Supabase, not by our functions): same design, Go-template placeholders kept as they are ----
const auth = [
  { file: 'confirm-signup', subject: 'Confirm your Genova account', eyebrow: 'Confirm your email', body: '# Confirm your email\n\nThanks for joining Genova. Confirm your email address to finish creating your account.\n\n[Confirm email]({{ .ConfirmationURL }})\n\nIf you did not create a Genova account, you can safely ignore this email.' },
  { file: 'reset-password', subject: 'Your Genova code', eyebrow: 'Password reset', body: '# Your reset code\n\nEnter this code in the Genova app or on the website to choose a new password. It works once and expires in one hour.\n\n`{{ .Token }}`\n\nIf you did not ask to reset your password, ignore this email. Your password stays as it is.' },
  { file: 'email-change', subject: 'Confirm your new Genova email', eyebrow: 'Email change', body: '# Confirm your new email\n\nConfirm that {{ .NewEmail }} is the email address you want to use for your Genova account.\n\n[Confirm new email]({{ .ConfirmationURL }})\n\nIf you did not ask for this change, please contact us right away.' },
];
mkdirSync(join(root, 'supabase', 'auth-email-templates'), { recursive: true });
for (const a of auth) writeFileSync(join(root, 'supabase', 'auth-email-templates', `${a.file}.html`), renderEmail(a.subject, a.body, { site_url: '{{ .SiteURL }}' }, { eyebrow: a.eyebrow }).html);
writeFileSync(join(here, 'auth.json'), JSON.stringify(auth.map((a) => ({ file: a.file, subject: a.subject, eyebrow: a.eyebrow })), null, 1));
console.log(`${templates.length} templates and ${auth.length} auth templates written`);
