-- The app has no purchase buttons (store policy). Its "Change plan" button asks the send-email function to email
-- the parent this message instead: a link to the website's plans page. Editable in Admin > Email > Templates.
insert into email_templates (key, name, description, subject, eyebrow, body, variables, automatic) values
('change_plan', 'Subscribe to change your plan', 'Sent when a parent taps "Change plan" in the app. Links to the plans page on the website.', 'Subscribe to change your plan', 'Your plan',
$b$# Subscribe to change your plan

You asked to change your Genova plan. Plans are managed on our website, so use the button below to choose one. It only takes a minute.

> Premium unlocks every story in the library, with new stories added every week.

[Choose a plan]({{plans_url}})

This email was sent to {{parent_email}}. Need help? Write to {{support_email}}.$b$,
 '{parent_email,plans_url,site_url,support_email}', true)
on conflict (key) do nothing;
