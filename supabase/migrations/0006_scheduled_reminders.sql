-- 0006: scheduled reminder emails. Applied to GenovaStorybook in two parts (a: tables and candidate query, b: templates and cron job).
-- A daily pg_cron job calls the send-reminders edge function through pg_net, authenticated with a random secret kept in job_secrets.

-- ---------- a. rules, sent-log, job secret, who needs a reminder today ----------
create table email_reminder_rules (
  kind text primary key check (kind in ('renewal_upcoming', 'access_ending', 'grace_ending')),
  enabled boolean not null default true,
  days int not null check (days between 1 and 14),
  updated_at timestamptz not null default now()
);
alter table email_reminder_rules enable row level security;
create policy "admin reads reminder rules" on email_reminder_rules for select using (private.is_admin((select auth.uid())));
create policy "admin updates reminder rules" on email_reminder_rules for update using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));
insert into email_reminder_rules (kind, enabled, days) values ('renewal_upcoming', true, 3), ('access_ending', true, 3), ('grace_ending', true, 2) on conflict do nothing;

-- one row per reminder actually sent: a parent gets each kind once per billing period
create table email_reminders (
  parent_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  period_end timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (parent_id, kind, period_end)
);
alter table email_reminders enable row level security;
create policy "admin reads reminders" on email_reminders for select using (private.is_admin((select auth.uid())));

-- server-only secrets (RLS on, no policies): the cron job and the edge function both read the same value
create table job_secrets (
  name text primary key,
  value text not null
);
alter table job_secrets enable row level security;
insert into job_secrets (name, value) values ('reminders', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict do nothing;

create function reminder_candidates() returns table (parent_id uuid, email text, kind text, plan_id text, plan_name text, amount_minor int, currency text, period_end timestamptz, access_until timestamptz)
language sql stable security definer set search_path = public, private as $$
  with base as (
    select p.id as pid, p.email as mail, e.status as st, e.plan as plan, e.current_period_end as pe,
           private.access_until(e.status, e.current_period_end) as au
    from entitlements e join profiles p on p.id = e.parent_id
    where p.email is not null and e.current_period_end is not null and e.plan is distinct from 'comp'
  )
  select b.pid, b.mail, r.kind, pl.id, pl.name, pl.price_minor, pl.currency, b.pe, b.au
  from base b
  join email_reminder_rules r on r.enabled and (
       (r.kind = 'renewal_upcoming' and b.st in ('active', 'trialing') and b.pe > now() and b.pe <= now() + make_interval(days => r.days))
    or (r.kind = 'access_ending' and b.st = 'canceled' and b.pe > now() and b.pe <= now() + make_interval(days => r.days))
    or (r.kind = 'grace_ending' and b.st in ('active', 'trialing', 'past_due') and b.pe <= now() and b.au > now() and b.au <= now() + make_interval(days => r.days))
  )
  left join plans pl on pl.id = b.plan or pl.paystack_plan_code = b.plan
  where not exists (select 1 from email_reminders x where x.parent_id = b.pid and x.kind = r.kind and x.period_end = b.pe);
$$;
revoke execute on function reminder_candidates() from public, anon, authenticated;
grant execute on function reminder_candidates() to service_role;

-- ---------- b. templates and the daily job ----------
insert into email_templates (key, name, description, subject, body, variables, automatic) values
('renewal_upcoming', 'Renewal coming up', 'Sent a few days before an active subscription renews (scheduled reminder).', 'Your Genova Premium renews on {{renew_date}}',
$b$Hello,

A quick heads-up: your Genova Premium renews soon.

# Renewal details
- Plan: {{plan}}
- Amount: {{amount}}
- Renews on: {{renew_date}}

There is nothing to do. Your card is charged automatically and Premium carries on without a break. To change or cancel, you can do it any time before then.

[Manage your subscription]({{site_url}}/account/)

Questions? Write to {{support_email}}.$b$,
 '{parent_email,plan,amount,renew_date,access_until,site_url,support_email}', true),
('access_ending', 'Premium ending (cancelled)', 'Sent a few days before a cancelled subscription runs out (scheduled reminder).', 'Your Genova Premium ends on {{access_until}}',
$b$Hello,

You cancelled your Genova Premium subscription, so it will not renew. Premium stays on until {{access_until}}.

# What happens next
- After {{access_until}} your account moves to the Free plan.
- Reader profiles and favourites are kept.
- Stories you saved for offline reading that need Premium will lock.

Changed your mind? Subscribe again and Premium carries on.

[Subscribe again]({{site_url}}/plans/)

Thank you for reading with us.$b$,
 '{parent_email,plan,access_until,site_url,support_email}', true),
('grace_ending', 'Last chance to renew', 'Sent when the 5-day grace period after a missed payment is about to end (scheduled reminder).', 'Last chance to keep Genova Premium',
$b$Hello,

Your last Genova Premium payment did not go through. You still have Premium for now, but only until {{access_until}}.

# To keep Premium
- Renew before {{access_until}}.
- Amount due: {{amount}} ({{plan}}).

After that, your account moves to the Free plan automatically.

[Renew now]({{site_url}}/account/)

If you have already paid, thank you, and please ignore this message. Need help? Write to {{support_email}}.$b$,
 '{parent_email,plan,amount,access_until,site_url,support_email}', true)
on conflict (key) do nothing;

-- Schedules (or re-schedules) the daily job. Run it once per project with that project's functions URL:
--   select private.schedule_reminders('https://<project-ref>.supabase.co/functions/v1');
create function private.schedule_reminders(functions_url text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'send-reminder-emails';
  -- every day at 08:00 UTC (09:00 in Nigeria)
  perform cron.schedule('send-reminder-emails', '0 8 * * *', format(
    $cmd$select net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', (select value from public.job_secrets where name = 'reminders')), body := '{}'::jsonb)$cmd$,
    rtrim(functions_url, '/') || '/send-reminders'));
end $$;
revoke execute on function private.schedule_reminders(text) from public, anon, authenticated;
select private.schedule_reminders('https://cjdrlddvbyfataumdztg.supabase.co/functions/v1');
