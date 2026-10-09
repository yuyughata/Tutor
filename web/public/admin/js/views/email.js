import { h, icon, field, toast, busy, fmtDateTime, ago } from '../ui.js';

const AUDIENCES = [
  ['subscribers', 'Everyone with Premium'],
  ['past_due', 'Payment overdue (in the 5-day grace period)'],
  ['expiring', 'Premium ending within 7 days'],
  ['free', 'Free parents'],
  ['all', 'All parents'],
  ['one', 'One person…'],
];
// which variables the sender fills in by hand, per template
const MANUAL = {
  broadcast: [['message', 'Message', 'textarea', 'Write your message. Use "# Heading", "- bullets" and a blank line between paragraphs.']],
  new_title: [['story_title', 'Story title', 'text'], ['synopsis', 'Short description', 'textarea'], ['story_url', 'Link', 'text', 'Where the button goes. Must start with https://']],
};
const STATUS_PILL = { sent: 'live', failed: 'bad', skipped: 'draft' };

export async function render(ctx) {
  const { api } = ctx;
  const body = h('div', {});
  let status = await api.emailStatus();
  let templates = await api.listEmailTemplates();
  let tab = status.configured ? 'send' : 'connection';
  let dirty = false;
  ctx.guard = () => dirty;

  const pill = h('span', { class: 'pill' });
  const paintPill = () => { pill.className = `pill ${status.enabled ? 'live' : status.configured ? 'scheduled' : 'draft'}`; pill.textContent = status.enabled ? 'Email is on' : status.configured ? 'Not activated' : 'Not connected'; };
  paintPill();

  const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Email sections' });
  const paintTabs = () => tabs.replaceChildren(...[['send', 'Send'], ['templates', 'Templates'], ['connection', 'Connection'], ['history', 'History']].map(([id, label]) =>
    h('button', { type: 'button', 'aria-pressed': String(tab === id), onclick: async () => { if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return; dirty = false; tab = id; paintTabs(); await show(); } }, label)));

  async function show() {
    body.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    try { body.replaceChildren(await { send, templates: tpl, connection, history }[tab]()); } catch (e) { body.replaceChildren(h('div', { class: 'callout bad' }, e.message)); }
  }
  const preview = (frame, template, subject, text, vars) => async () => {
    const r = await api.emailPreview(template, subject, text, vars);
    frame.srcdoc = r.html; frame.hidden = false; frame.title = `Preview: ${r.subject}`;
  };
  const frameEl = () => h('iframe', { class: 'mail-preview', hidden: true, sandbox: '', title: 'Email preview' });

  // ---------------- send ----------------
  function send() {
    if (!status.enabled) return h('div', { class: 'card empty' }, h('div', { class: 'big' }, '✉️'), h('h2', {}, 'Activate email first'),
      h('p', {}, 'Connect your Resend account on the Connection tab, then come back here to message your parents.'),
      h('button', { class: 'btn', onclick: () => { tab = 'connection'; paintTabs(); show(); } }, 'Open Connection'));
    const tplSel = h('select', {}, templates.map((t) => h('option', { value: t.key, selected: t.key === 'broadcast' }, t.name)));
    const audSel = h('select', {}, AUDIENCES.map(([v, l]) => h('option', { value: v }, l)));
    const to = h('input', { type: 'email', placeholder: 'parent@example.com' });
    const toField = field('Email address', to); toField.hidden = true;
    const subject = h('input', { type: 'text', maxlength: 160 });
    const dyn = h('div', {});
    const count = h('span', { class: 'muted small' });
    const frame = frameEl();
    const values = {};
    const cur = () => templates.find((t) => t.key === tplSel.value);

    async function paintCount() {
      toField.hidden = audSel.value !== 'one';
      if (audSel.value === 'one') { count.textContent = ''; return; }
      count.textContent = 'Counting…';
      try { const n = await api.emailCount(audSel.value); count.textContent = `${n} ${n === 1 ? 'parent' : 'parents'} will get this.`; } catch { count.textContent = ''; }
    }
    async function paintTemplate() {
      const t = cur(); subject.value = t.subject; frame.hidden = true;
      for (const k of Object.keys(values)) delete values[k];
      const rows = MANUAL[t.key] || [];
      const nodes = [];
      if (t.key === 'new_title') {
        const stories = (await api.listStories()).filter((s) => s.status === 'published');
        const pick = h('select', {}, h('option', { value: '' }, 'Pick a story to fill this in…'), stories.map((s) => h('option', { value: s.id }, s.title)));
        pick.onchange = () => { const s = stories.find((x) => x.id === pick.value); if (!s) return; for (const [k, v] of [['story_title', s.title], ['synopsis', s.synopsis || ''], ['story_url', `${location.origin}/`]]) { values[k] = v; const el = dyn.querySelector(`[data-var="${k}"]`); if (el) el.value = v; } };
        nodes.push(field('Story', pick));
      }
      for (const [k, label, kind, hint] of rows) {
        const el = kind === 'textarea' ? h('textarea', { rows: k === 'message' ? 8 : 3, 'data-var': k }) : h('input', { type: 'text', 'data-var': k });
        el.oninput = () => { values[k] = el.value; };
        nodes.push(field(label, el, hint));
      }
      if (!rows.length) nodes.push(h('p', { class: 'muted small' }, 'This template fills itself in for each parent.'));
      dyn.replaceChildren(...nodes);
    }
    tplSel.onchange = paintTemplate; audSel.onchange = paintCount;
    const prevBtn = h('button', { class: 'btn secondary', type: 'button' }, 'Preview');
    prevBtn.onclick = busy(prevBtn, () => preview(frame, tplSel.value, subject.value, undefined, values)());
    const sendBtn = h('button', { class: 'btn', type: 'button' }, icon('check'), 'Send');
    sendBtn.onclick = busy(sendBtn, async () => {
      const t = cur();
      if (audSel.value === 'one' && !to.value.trim()) throw new Error('Enter an email address.');
      for (const [k, label] of (MANUAL[t.key] || [])) if (!String(values[k] || '').trim()) throw new Error(`Fill in "${label}" first.`);
      const who = audSel.value === 'one' ? to.value.trim() : `${AUDIENCES.find((a) => a[0] === audSel.value)[1].toLowerCase()} (${await api.emailCount(audSel.value)} people)`;
      if (!(await ctx.confirm({ title: 'Send this email?', body: `"${subject.value}" will go to ${who}. This cannot be undone.`, confirmLabel: 'Send now' }))) return;
      const r = await api.emailSend({ template: t.key, audience: audSel.value, to: to.value.trim(), subject: subject.value.trim(), vars: { ...values } });
      if (r.failed) toast(`Sent ${r.sent}, ${r.failed} failed. See History for the reason.`, 'err'); else toast(`Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}`);
    });
    paintTemplate(); paintCount();
    return h('div', { class: 'grid cols-2', style: { alignItems: 'start' } },
      h('div', { class: 'card' }, h('h2', {}, 'Write an email'),
        field('Template', tplSel), field('Send to', audSel, null), toField, h('p', { style: { margin: '-8px 0 14px' } }, count),
        field('Subject', subject), dyn, h('div', { class: 'row' }, sendBtn, prevBtn)),
      h('div', { class: 'card' }, h('h2', {}, 'Preview'), h('p', { class: 'small muted' }, 'Shown with sample details. Each parent gets their own.'), frame));
  }

  // ---------------- templates ----------------
  function tpl() {
    const list = h('div', {});
    const editor = h('div', {});
    let selected = templates[0].key;
    const paintList = () => list.replaceChildren(...templates.map((t) => h('button', { type: 'button', class: `tpl-item${t.key === selected ? ' on' : ''}`, onclick: async () => { if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return; dirty = false; selected = t.key; paintList(); paintEditor(); } },
      h('b', {}, t.name), h('span', { class: 'small muted' }, t.automatic ? 'Sent automatically' : 'Sent by you'))));
    function paintEditor() {
      const t = templates.find((x) => x.key === selected);
      const subject = h('input', { type: 'text', value: t.subject, maxlength: 160 });
      const text = h('textarea', { class: 'mono', rows: 16, 'aria-label': 'Email text' }); text.value = t.body;
      const frame = frameEl();
      const save = h('button', { class: 'btn', disabled: true }, 'Save template');
      const live = () => { dirty = subject.value !== t.subject || text.value !== t.body; save.disabled = !dirty; };
      subject.oninput = live; text.oninput = live;
      save.onclick = busy(save, async () => {
        if (!subject.value.trim() || !text.value.trim()) throw new Error('The template needs a subject and some text.');
        const row = await api.saveEmailTemplate(t.key, subject.value.trim(), text.value);
        templates = templates.map((x) => (x.key === row.key ? row : x)); dirty = false; paintList(); paintEditor(); toast('Template saved');
      });
      const prev = h('button', { class: 'btn secondary', type: 'button' }, 'Preview');
      prev.onclick = busy(prev, () => preview(frame, t.key, subject.value, text.value)());
      editor.replaceChildren(h('div', { class: 'card' }, h('h2', {}, t.name), h('p', { class: 'small muted', style: { marginTop: 0 } }, t.description),
        field('Subject', subject), field('Text', text, `Use "# Heading", "- bullet", a blank line between paragraphs, and "[Button label](https://link)" on its own line for a button. Details you can use: ${t.variables.map((v) => `{{${v}}}`).join(' ')}`),
        h('div', { class: 'row' }, save, prev), frame));
    }
    paintList(); paintEditor();
    return h('div', { class: 'tpl-layout' }, h('div', { class: 'tpl-list card' }, list), editor);
  }

  // ---------------- connection ----------------
  function connection() {
    const key = h('input', { type: 'password', autocomplete: 'off', spellcheck: false, placeholder: status.configured ? `Saved ${status.key_hint}. Leave blank to keep it.` : 're_xxxxxxxxxxxxxxxx', 'aria-label': 'Resend API key' });
    const fromName = h('input', { type: 'text', value: status.from_name || 'Genova', maxlength: 60 });
    const fromEmail = h('input', { type: 'email', value: status.from_email || '', placeholder: 'hello@yourdomain.com' });
    const replyTo = h('input', { type: 'email', value: status.reply_to || '', placeholder: 'support@yourdomain.com (optional)' });
    const notify = h('input', { type: 'email', value: status.notify_email || '', placeholder: 'Where new support requests are announced (optional)' });
    const state = h('div', { class: `callout ${status.enabled ? 'ok' : ''}`, role: 'status' });
    const paintState = () => {
      state.className = `callout ${status.enabled ? 'ok' : ''}`;
      state.textContent = status.enabled ? `Email is on. Verified ${fmtDateTime(status.verified_at)}.` : status.configured ? 'Your key is saved but email is switched off. Press Activate to check it with Resend and turn email on.' : 'Not connected yet. Follow the steps below.';
    };
    paintState();
    const save = h('button', { class: 'btn secondary' }, 'Save settings');
    const reload = async () => { status = await api.emailStatus(); paintPill(); paintState(); };
    save.onclick = busy(save, async () => {
      await api.emailSaveSettings({ api_key: key.value.trim(), from_name: fromName.value.trim(), from_email: fromEmail.value.trim(), reply_to: replyTo.value.trim(), notify_email: notify.value.trim() });
      key.value = ''; await reload(); toast('Settings saved'); await show();
    });
    const activate = h('button', { class: 'btn' }, status.enabled ? 'Email is on' : 'Activate email');
    activate.disabled = status.enabled;
    activate.onclick = busy(activate, async () => { await api.emailActivate(); await reload(); toast('Email is on'); await show(); });
    const off = h('button', { class: 'btn ghost' }, 'Switch off');
    off.hidden = !status.enabled;
    off.onclick = busy(off, async () => { if (!(await ctx.confirm({ title: 'Switch email off?', body: 'No emails will be sent, including receipts and welcome messages, until you activate it again.', confirmLabel: 'Switch off', danger: true }))) return; await api.emailDeactivate(); await reload(); toast('Email is off'); await show(); });
    const testTo = h('input', { type: 'email', value: ctx.me.email, 'aria-label': 'Send a test to' });
    const test = h('button', { class: 'btn secondary' }, 'Send test email');
    test.onclick = busy(test, async () => { await api.emailTest(testTo.value.trim()); toast(`Test email sent to ${testTo.value.trim()}`); });
    return h('div', { class: 'grid cols-2', style: { alignItems: 'start' } },
      h('div', { class: 'card' }, h('h2', {}, 'Resend connection'), state,
        h('div', { style: { height: '14px' } }),
        field('Resend API key', key, 'Stored on the server only. It is never shown again, only its last four characters.'),
        field('From name', fromName), field('From email', fromEmail, 'Must be an address on a domain you verified in Resend.'), field('Reply-to', replyTo), field('Support notifications', notify),
        h('div', { class: 'row' }, save, activate, off),
        h('hr', { style: { border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' } }),
        h('h3', {}, 'Send a test'), h('div', { class: 'row', style: { marginTop: '10px', flexWrap: 'nowrap' } }, h('div', { class: 'grow' }, testTo), test)),
      h('div', { class: 'card' }, h('h2', {}, 'How to set up Resend (free)'),
        h('ol', { class: 'steps' },
          h('li', {}, 'Create a free account at ', h('b', {}, 'resend.com'), '. The free plan includes 3,000 emails a month (100 a day).'),
          h('li', {}, 'Open ', h('b', {}, 'Domains'), ' and add your domain (for example custar.com). Add the DNS records Resend shows, then wait for it to say Verified.'),
          h('li', {}, 'Open ', h('b', {}, 'API Keys'), ' and create a key. "Sending access" is enough. Copy it (it starts with re_).'),
          h('li', {}, 'Paste the key here, fill in the From email on your verified domain, press ', h('b', {}, 'Save settings'), ', then ', h('b', {}, 'Activate email'), '.'),
          h('li', {}, 'Send yourself a test.')),
        h('p', { class: 'small muted' }, 'No domain yet? Resend lets a new account send from onboarding@resend.dev, but only to the email address you signed up with. Good for testing only.'),
        h('p', { class: 'small muted' }, 'Once on, these send automatically: welcome email, subscription receipt, payment-due notice, cancellation, and passcode/password change alerts. Edit the wording on the Templates tab.')));
  }

  // ---------------- history ----------------
  async function history() {
    const rows = await api.listEmailLog(100);
    return rows.length ? h('div', { class: 'card', style: { padding: '8px 8px 4px' } }, h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['When', 'To', 'Email', 'Result'].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((r) => h('tr', {},
        h('td', { class: 'small muted nowrap', title: fmtDateTime(r.created_at) }, ago(r.created_at)), h('td', {}, r.recipient),
        h('td', { class: 'small' }, r.campaign || r.template || '—'),
        h('td', {}, h('span', { class: `pill ${STATUS_PILL[r.status]}` }, r.status), r.error ? h('div', { class: 'small muted' }, r.error) : null))))))
    ) : h('div', { class: 'card empty' }, h('div', { class: 'big' }, '📭'), h('h2', {}, 'Nothing sent yet'), h('p', {}, 'Every email, automatic or sent by you, is listed here.'));
  }

  paintTabs(); await show();
  return h('div', {}, h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Email'), h('p', {}, 'Message your parents with Resend. Receipts and reminders go out by themselves.')), pill), tabs, h('div', { style: { height: '18px' } }), body);
}
