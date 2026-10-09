-- 0007: minimal email designs. Adds the small label above each email's title (eyebrow), rewrites every template for the new
-- layout (headline, receipt tables, notes, pictures, buttons) and adds two templates: payment_failed and support_received.
-- Template syntax: "# Headline", "## Section", "- bullet", "- Label: value" (becomes a summary table), "> note",
-- "![alt](url)" picture, "[Label](url)" amber button, `code` big code box, {{variables}}.

alter table email_templates add column if not exists eyebrow text;

update email_templates set eyebrow = 'Welcome', variables = '{parent_email,site_url,support_email}', body = $b$# Welcome to Genova

Your account is ready. Genova is where children read stories chosen for their level, one picture and a few lines at a time.

## Get started
- Open the Genova app and sign in with {{parent_email}}.
- Add a reader for each child and choose their reading level.
- Start with the free stories, or choose Premium for the whole library.

[Explore plans]({{site_url}}/plans/)

Questions? Reply to this email or write to {{support_email}}.$b$ where key = 'welcome';

update email_templates set eyebrow = 'Receipt', subject = 'Your Genova receipt', variables = '{parent_email,plan,amount,paid_date,access_until,site_url,support_email}', body = $b$# Thank you. Premium is on.

Your payment went through and every story is now unlocked for your readers.

## Details
- Plan: {{plan}}
- Amount paid: {{amount}}
- Date: {{paid_date}}
- Premium until: {{access_until}}
- Account: {{parent_email}}

Sign in to the Genova app with this email and your stories unlock on the device.

[Manage subscription]({{site_url}}/account/)

Please keep this email as your receipt.$b$ where key = 'subscription_confirmation';

update email_templates set eyebrow = 'Payment due', variables = '{parent_email,plan,amount,due_date,access_until,site_url,support_email}', body = $b$# Your Premium payment is due

> Amount due: {{amount}}. Please pay by {{due_date}} to keep Premium.

## Details
- Plan: {{plan}}
- Amount due: {{amount}}
- Due date: {{due_date}}
- Premium stays on until: {{access_until}}

After that date your account moves to the Free plan. Renew in a minute and nothing changes for your readers.

[Renew now]({{site_url}}/account/)

If you have already paid, thank you, and please ignore this message.$b$ where key = 'renewal_due';

update email_templates set eyebrow = 'New story', variables = '{story_title,synopsis,story_url,cover_url,site_url}', body = $b$![{{story_title}}]({{cover_url}})

# {{story_title}}

{{synopsis}}

[Read it now]({{story_url}})

Happy reading from all of us at CUSTAR.$b$ where key = 'new_title';

update email_templates set eyebrow = 'From the Genova team', variables = '{message,site_url}', body = $b${{message}}

With love from the Genova team at CUSTAR.$b$ where key = 'broadcast';

update email_templates set eyebrow = 'Subscription cancelled', variables = '{parent_email,plan,access_until,site_url,support_email}', body = $b$# Your subscription has been cancelled

You will not be charged again. Premium stays on until {{access_until}}, so your readers can keep going until then.

## What happens next
- After {{access_until}} your account moves to the Free plan.
- Reader profiles and favourites are kept.
- Stories you saved offline that need Premium will lock.

Changed your mind? You can come back any time.

[Subscribe again]({{site_url}}/plans/)

We would love to know how we can do better. Just reply to this email.$b$ where key = 'cancellation';

update email_templates set eyebrow = 'Security', variables = '{parent_email,what,site_url,support_email}', body = $b$# Your {{what}} was changed

The {{what}} for {{parent_email}} was just updated.

> If this was you, there is nothing more to do. If it was not, reset your password now and tell us.

[Reset your password]({{site_url}}/forgot-password/)

Need help? Write to {{support_email}}.$b$ where key = 'security_change';

update email_templates set eyebrow = 'Renewal reminder', body = $b$# Your Premium renews soon

A quick heads-up, no action needed.

## Renewal details
- Plan: {{plan}}
- Amount: {{amount}}
- Renews on: {{renew_date}}

Your card is charged automatically and Premium carries on without a break. You can change or cancel any time before then.

[Manage subscription]({{site_url}}/account/)

Questions? Write to {{support_email}}.$b$ where key = 'renewal_upcoming';

update email_templates set eyebrow = 'Premium ending', body = $b$# Your Premium ends on {{access_until}}

You cancelled, so it will not renew. Your readers keep full access until that date.

## What happens next
- After {{access_until}} your account moves to the Free plan.
- Reader profiles and favourites are kept.
- Stories you saved offline that need Premium will lock.

Changed your mind? Subscribe again and Premium carries on.

[Subscribe again]({{site_url}}/plans/)

Thank you for reading with us.$b$ where key = 'access_ending';

update email_templates set eyebrow = 'Last chance', body = $b$# Last chance to keep Premium

> Your last payment did not go through. Premium stays on until {{access_until}}.

## To keep Premium
- Plan: {{plan}}
- Amount due: {{amount}}
- Renew before: {{access_until}}

After that your account moves to the Free plan automatically.

[Renew now]({{site_url}}/account/)

If you have already paid, thank you, and please ignore this message. Need help? Write to {{support_email}}.$b$ where key = 'grace_ending';

insert into email_templates (key, name, description, subject, eyebrow, body, variables, automatic) values
('payment_failed', 'Payment failed', 'Sent when a renewal payment does not go through.', 'We could not take your Genova payment', 'Payment unsuccessful',
$b$# We could not take your payment

Your last Genova Premium payment did not go through. This can happen when a card has expired, has too little balance, or was declined by the bank.

> Good news: Premium stays on until {{access_until}}. Update your payment details before then and nothing changes.

## Details
- Plan: {{plan}}
- Amount due: {{amount}}
- Premium stays on until: {{access_until}}

[Update payment details]({{site_url}}/account/)

If you need a hand, write to {{support_email}} and we will help.$b$,
 '{parent_email,plan,amount,access_until,site_url,support_email}', true),
('support_received', 'Support message received', 'Sent to a parent right after they contact support.', 'We have your message', 'Support',
$b$# We have your message

Thank you for getting in touch. Our team will reply to {{parent_email}}, usually within one working day.

## What you sent
> {{message}}

In the meantime you can manage your account any time.

[Open your account]({{site_url}}/account/)$b$,
 '{parent_email,message,site_url,support_email}', true)
on conflict (key) do nothing;
