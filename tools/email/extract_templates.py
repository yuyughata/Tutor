"""Rebuild tools/email/templates.json from the SQL migrations (0005 seeds, 0006 seeds, 0007 rewrites).
The database is the source of truth at run time; this snapshot exists so the designs can be previewed offline."""
import re, json, os
M = os.path.join(os.path.dirname(__file__), '..', '..', 'supabase', 'migrations')
rd = lambda n: open(os.path.join(M, n)).read()
T = {}
ins6 = re.compile(r"\('(\w+)', '([^']*)', '([^']*)', '([^']*)',\n\$b\$(.*?)\$b\$,\n '([^']*)', (true|false)\)", re.S)
for f in ('0005_support_email_passcode.sql', '0006_scheduled_reminders.sql'):
    for k, name, desc, subj, body, vars_, auto in ins6.findall(rd(f)):
        T[k] = dict(key=k, name=name, description=desc, subject=subj, eyebrow=None, body=body, variables=vars_.strip('{}').split(','), automatic=auto == 'true')
s7 = rd('0007_email_designs.sql')
for m in re.finditer(r"update email_templates set eyebrow = '([^']*)'(.*?)where key = '(\w+)';", s7, re.S):
    eb, rest, k = m.groups()
    t = T[k]; t['eyebrow'] = eb
    sub = re.search(r"subject = '([^']*)'", rest.split('$b$')[0]);  t['subject'] = sub.group(1) if sub else t['subject']
    var = re.search(r"variables = '([^']*)'", rest.split('$b$')[0]); t['variables'] = var.group(1).strip('{}').split(',') if var else t['variables']
    t['body'] = re.search(r"\$b\$(.*?)\$b\$", rest, re.S).group(1)
for k, name, desc, subj, eb, body, vars_ in re.findall(r"\('(\w+)', '([^']*)', '([^']*)', '([^']*)', '([^']*)',\n\$b\$(.*?)\$b\$,\n '([^']*)', true\)", s7, re.S):
    T[k] = dict(key=k, name=name, description=desc, subject=subj, eyebrow=eb, body=body, variables=vars_.strip('{}').split(','), automatic=True)
order = ['welcome', 'subscription_confirmation', 'renewal_due', 'payment_failed', 'cancellation', 'new_title', 'broadcast', 'security_change', 'renewal_upcoming', 'access_ending', 'grace_ending', 'support_received']
out = [T[k] for k in order]
assert set(T) == set(order), set(T) ^ set(order)
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'templates.json'), 'w'), indent=1, ensure_ascii=False)
print(len(out), 'templates')
