-- Email the admins when a visitor sends the "Request a GRP spot" or "Request a title" form (0014).
-- An AFTER INSERT trigger asks the notify-request edge function (through pg_net, authenticated with a random secret in
-- job_secrets, like the reminder job) to send the email. It only passes the request id; the function reads the row itself.
-- A failure to queue the call is swallowed, so a notification problem can never stop a visitor's request being saved.
insert into job_secrets (name, value) values ('requests', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict do nothing;

create function private.notify_new_request() returns trigger
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  begin
    perform net.http_post(
      url := 'https://cjdrlddvbyfataumdztg.supabase.co/functions/v1/notify-request',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', (select value from public.job_secrets where name = 'requests')),
      body := jsonb_build_object('kind', tg_argv[0], 'id', new.id)
    );
  exception when others then
    null;
  end;
  return new;
end $$;
revoke execute on function private.notify_new_request() from public, anon, authenticated;

create trigger grp_requests_notify after insert on grp_requests for each row execute function private.notify_new_request('grp');
create trigger title_requests_notify after insert on title_requests for each row execute function private.notify_new_request('title');

insert into email_templates (key, name, description, subject, eyebrow, body, variables, automatic) values
('new_request', 'New form request (to the team)', 'Sent to the team when a visitor sends the Request a GRP spot or Request a title form on the website.', 'New {{kind_label}}: {{name}}', 'New request',
$b$# New {{kind_label}}

Someone just sent a form on the Genova website. Reply quickly while they are interested.

## Details
{{details}}

{{comments_block}}

[Open in the dashboard]({{site_url}}/admin/)

{{whatsapp_block}}$b$,
 '{kind_label,name,details,comments_block,whatsapp_block,site_url}', true)
on conflict (key) do nothing;
