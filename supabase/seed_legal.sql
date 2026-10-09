-- Sample privacy policy (placeholder wording; have it reviewed by a lawyer, then edit it in the admin: Settings > Privacy policy).
-- Run once after the migrations on a fresh project. Safe to re-run: it never overwrites an edited policy.
insert into legal_documents (slug, title, body) values ('privacy-policy', 'Privacy Policy', $body$SAMPLE TEXT: this is placeholder wording. Have it reviewed by a lawyer before launch, then replace it from the admin dashboard (Settings, Privacy policy).

# Our promise to families
Genova is a children's storybook app made by CUSTAR. We built it so children can read safely. We do not show ads, we do not track children across other apps or websites, and we never sell personal information.

# Who we are
CUSTAR ("we", "us") runs the Genova app and the Genova website. If you have a question about this policy, contact us at the support address shown in the app and on the website.

# What we collect
From parents and guardians:
- Your email address and a password (stored securely) so you can sign in.
- Your subscription status. Payments are handled by Paystack. We never see or store your card details.

From children, only what is needed to make the app work:
- A first name or nickname, a buddy avatar and a reading level, chosen by the parent or guardian.
- Reading activity: which stories were started or finished, favourites, and the page last read.

We do not ask children for their surname, address, phone number, photos or location.

# How we use it
- To show stories that suit each reader and to remember where they stopped.
- To unlock Premium stories for subscribed accounts.
- To count how many times each story is read, so we can see which stories families enjoy. These counts are not linked to a child's identity in any report.
- To contact parents about their account, such as receipts, renewal reminders and password resets.

# What we do not do
- We do not show third-party advertising.
- We do not use advertising or behavioural tracking tools.
- We do not sell or rent personal information.
- We do not let children contact other people through the app.

# Parental consent and control
Children use Genova under the supervision of a parent or guardian. Parents create the account, add the child profiles and can edit or remove them at any time from the Grown-ups area. Areas meant for parents are protected by a parental gate.

# Keeping information safe
Data is stored with a reputable cloud provider, encrypted in transit, and protected by access rules so that each family can only reach its own information. Only a small number of CUSTAR staff can access the administration tools, and sensitive actions are logged.

# How long we keep it
We keep account information while the account is active. If you ask us to close the account, we will erase the account and the child profiles within a reasonable time, except for records we must keep by law, such as payment receipts.

# Your rights
You can ask to see, correct or erase the information we hold about you and your child, or withdraw consent, by contacting us. Where the Nigeria Data Protection Act or other local laws apply, you have the rights those laws give you.

# Changes to this policy
If we make important changes we will tell parents by email or inside the app before they take effect. The version number and date of the last update are shown with this policy.
$body$) on conflict (slug) do nothing;
