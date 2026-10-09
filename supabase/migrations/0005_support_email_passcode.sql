-- 0005: support requests, checkout consent, parent passcode, email (Resend) settings/templates/log.
-- Applied to GenovaStorybook in three parts (a: support/consent/passcode, b: email tables, c: template seeds).

-- ---------- a. Support requests from parents to the admin inbox ----------
create table support_requests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles (id) on delete cascade,
  email text not null,
  topic text not null default 'other' check (topic in ('sign_in', 'subscription', 'app', 'story', 'other')),
  message text not null check (char_length(message) between 5 and 4000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index support_requests_status_idx on support_requests (status, created_at desc);
alter table support_requests enable row level security;
create policy "parent reads own support" on support_requests for select using (parent_id = (select auth.uid()));
create policy "parent creates support" on support_requests for insert with check (parent_id = (select auth.uid()) and status = 'open');
create policy "admin reads support" on support_requests for select using (private.is_admin((select auth.uid())));
create policy "admin updates support" on support_requests for update using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));

-- Privacy-policy consent given by a parent at checkout (written by the checkout edge function)
create table consents (
  id bigint generated always as identity primary key,
  parent_id uuid not null references profiles (id) on delete cascade,
  document text not null default 'privacy-policy',
  version int not null,
  plan text,
  created_at timestamptz not null default now()
);
alter table consents enable row level security;
create policy "parent reads own consents" on consents for select using (parent_id = (select auth.uid()));
create policy "admin reads consents" on consents for select using (private.is_admin((select auth.uid())));

-- Parent passcode (4 digits, stored only as a salted hash) used by the parental gate
create table parent_passcodes (
  parent_id uuid primary key references profiles (id) on delete cascade,
  salt text not null,
  hash text not null,
  updated_at timestamptz not null default now()
);
alter table parent_passcodes enable row level security;
create policy "own passcode read" on parent_passcodes for select using (parent_id = (select auth.uid()));
create policy "own passcode insert" on parent_passcodes for insert with check (parent_id = (select auth.uid()));
create policy "own passcode update" on parent_passcodes for update using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));

-- ---------- b. Email (Resend): settings, templates, log ----------
-- Settings hold the Resend API key, so the table has RLS on and NO policies: only edge functions (service role) can read it.
create table email_settings (
  id boolean primary key default true check (id),
  provider text not null default 'resend',
  api_key text,
  from_name text not null default 'Genova',
  from_email text,
  reply_to text,
  notify_email text,                      -- where new support requests are announced
  enabled boolean not null default false, -- "activated" by an admin once the key is verified
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);
alter table email_settings enable row level security;
insert into email_settings (id) values (true) on conflict do nothing;

create table email_templates (
  key text primary key,
  name text not null,
  description text,
  subject text not null,
  body text not null,
  variables text[] not null default '{}',
  automatic boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table email_templates enable row level security;
create policy "admin reads templates" on email_templates for select using (private.is_admin((select auth.uid())));
create policy "admin writes templates" on email_templates for update using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));

create table email_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  template text,
  campaign text,
  recipient text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  resend_id text,
  sent_by uuid references profiles (id) on delete set null
);
create index email_log_created_idx on email_log (created_at desc);
alter table email_log enable row level security;
create policy "admin reads email log" on email_log for select using (private.is_admin((select auth.uid())));

-- What the dashboard may know about the connection (never the key itself)
create function admin_email_status() returns table (configured boolean, key_hint text, from_name text, from_email text, reply_to text, notify_email text, enabled boolean, verified_at timestamptz)
language sql stable security definer set search_path = public, private as $$
  select s.api_key is not null, case when s.api_key is null then null else '••••' || right(s.api_key, 4) end,
         s.from_name, s.from_email, s.reply_to, s.notify_email, s.enabled, s.verified_at
  from email_settings s where private.is_admin(auth.uid());
$$;
revoke execute on function admin_email_status() from public, anon;
grant execute on function admin_email_status() to authenticated;

-- Who an email campaign goes to (edge functions only)
create function email_audience(kind text) returns table (parent_id uuid, email text, status text, plan text, access_until timestamptz)
language sql stable security definer set search_path = public, private as $$
  select p.id, p.email, coalesce(e.status::text, 'none'), e.plan,
         case when e.parent_id is null then null
              when e.current_period_end is null and e.status in ('active', 'trialing') then null
              else private.access_until(e.status, e.current_period_end) end
  from profiles p left join entitlements e on e.parent_id = p.id
  where p.email is not null
    and case kind
      when 'all' then true
      when 'subscribers' then private.has_active_entitlement(p.id)
      when 'free' then not private.has_active_entitlement(p.id)
      when 'past_due' then e.status = 'past_due' or (e.status in ('active', 'trialing') and e.current_period_end < now() and private.has_active_entitlement(p.id))
      when 'expiring' then private.has_active_entitlement(p.id) and e.current_period_end is not null and e.current_period_end + interval '5 days' < now() + interval '7 days'
      else false end;
$$;
revoke execute on function email_audience(text) from public, anon, authenticated;
grant execute on function email_audience(text) to service_role;

-- ---------- c. Email template seeds (editable in the admin dashboard) ----------
-- Body syntax: "# Heading", "- bullet", blank line between paragraphs, "[Label](url)" alone on a line = button, {{variables}}.
insert into email_templates (key, name, description, subject, body, variables, automatic) values
('welcome', 'Welcome', 'Sent when a parent creates an account on the website.', 'Welcome to Genova',
$b$Hi there,

Welcome to Genova, the storybook app by CUSTAR. Your account is ready.

# Get started
- Open the Genova app and sign in with {{parent_email}}.
- Add a reader for each child and pick their reading level.
- Read the free stories right away, or go Premium for the full library.

[See plans]({{site_url}}/plans/)

If you need a hand, reply to this email or write to {{support_email}}.$b$,
 '{parent_email,site_url,support_email}', true),
('subscription_confirmation', 'Subscription confirmation and receipt', 'Sent after a successful Paystack payment.', 'Your Genova Premium receipt',
$b$Thank you! Your payment was received and Premium is on.

# Receipt
- Plan: {{plan}}
- Amount paid: {{amount}}
- Premium is active until: {{access_until}}

Sign in to the Genova app with {{parent_email}} and every story unlocks on your device.

[Manage your subscription]({{site_url}}/account/)

Keep this email as your receipt. Questions? Write to {{support_email}}.$b$,
 '{parent_email,plan,amount,access_until,site_url,support_email}', true),
('renewal_due', 'Expiration and amount due', 'Sent when a payment fails or a subscription is about to lapse.', 'Your Genova Premium needs renewing',
$b$Hello,

Your Genova Premium ({{plan}}) payment is due.

# What is due
- Amount due: {{amount}}
- Due date: {{due_date}}
- Premium stays on until: {{access_until}}

After that date your account moves back to the Free plan. Renew in a minute and nothing changes for your readers.

[Renew now]({{site_url}}/account/)

If you have already paid, thank you, and please ignore this message.$b$,
 '{parent_email,plan,amount,due_date,access_until,site_url,support_email}', true),
('new_title', 'New title release', 'Announce a new or upcoming story.', 'New on Genova: {{story_title}}',
$b$Something new to read!

# {{story_title}}
{{synopsis}}

[Read it now]({{story_url}})

Happy reading from all of us at CUSTAR.$b$,
 '{story_title,synopsis,story_url,site_url}', false),
('broadcast', 'Admin broadcast', 'Free-form message to a group of parents.', 'A message from Genova',
$b${{message}}

With love from the Genova team at CUSTAR.$b$,
 '{message,site_url}', false),
('cancellation', 'Cancellation', 'Sent when a subscription is cancelled.', 'Your Genova subscription was cancelled',
$b$Hello,

Your Genova Premium subscription has been cancelled. You will not be charged again.

# What happens now
- Premium stays on until {{access_until}}.
- After that your account moves to the Free plan. Reader profiles and favourites are kept.

Changed your mind? You can come back any time.

[Subscribe again]({{site_url}}/plans/)

We would love to know how we can do better. Just reply to this email.$b$,
 '{parent_email,plan,access_until,site_url,support_email}', true),
('security_change', 'Passcode or password changed', 'Sent when a parent changes their passcode or password.', 'Your Genova {{what}} was changed',
$b$Hello,

The {{what}} for {{parent_email}} was just changed.

If this was you, there is nothing more to do. If it was not you, reset your password right away and tell us.

[Reset your password]({{site_url}}/forgot-password/)

Contact {{support_email}} if you need help.$b$,
 '{parent_email,what,site_url,support_email}', true)
on conflict (key) do nothing;
