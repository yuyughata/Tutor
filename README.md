# Genova

Children's storybook app by CUSTAR. Product scope: [`docs/MVP_BRIEF.md`](docs/MVP_BRIEF.md).

## Layout
- `app/` — Expo (React Native, TypeScript, Expo Router) mobile app.
- `web/` — Next.js website (static export): landing, plans and checkout, account (Premium badge, manage subscription), sign-up / sign-in / forgot password, privacy policy, and the **admin dashboard / CMS** at `/admin/` (`web/public/admin`).
- `supabase/migrations/` — `0001`–`0004` (schema + RLS, admin CMS, hardened helpers, reading levels / access rules / plans / legal documents).
- `supabase/seed.sql` — three sample stories for local development; `supabase/seed_legal.sql` — sample privacy policy.
- `tools/qa/` — browser tests, screenshots and PDF build ([README](tools/qa/README.md)).
- `CLAUDE.md` and [`docs/HANDOFF.md`](docs/HANDOFF.md) — context, accounts, deploy and how to resume in a new chat or account.
- `supabase/functions/` — `paystack-checkout`, `paystack-webhook`, `paystack-manage`, `admin-user-support`.
- `supabase/tests/` — unit tests for the Paystack and support logic.

## Reading levels, plans, access
- Readers and stories use **Sunrise** (Assisted Reader), **Spark** (Emergent Reader) and **Seeker** (Developing Reader). Ages are not stored or shown.
- Plans (table `plans`, editable in the DB): Free, Paid ₦5,000 / month, ₦12,000 / quarter.
- Access rule (one source of truth: `my_access()` and an hourly job): Premium lasts until the paid-until date **+ 5 days**; after that the account is Free. Cancelled plans end at the paid-until date.

## Run the app
```sh
cd app
npm install
npm start          # press i / a for simulators, w for web
npm run typecheck
```
With no environment variables the app runs on built-in sample stories (`app/src/data/mock.ts`)
and stores readers, favourites and progress on the device.
To use Supabase, copy `app/.env.example` to `app/.env` and fill in the project URL and anon key.

## Website and admin dashboard
```sh
cd web
npm install
npm run dev       # http://localhost:3000   (admin at /admin/)
npm run build     # static export to web/out - host on Netlify, Cloudflare Pages, Vercel, S3...
npm test          # admin data-layer tests
```
Optional env vars (defaults point at the GenovaStorybook project): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
The admin is served from `web/public/admin/` and shares the website's sign-in session; it reads `web/public/config.js`.

What it does:
- **Dashboard** — live stories, active subscribers, child readers, reads over time, top stories, recent Paystack payments,
  and warnings (no Title of the Week, drafts waiting, launch-catalogue progress).
- **Stories** — search and filter; create and edit stories: details, categories, free/premium, cover upload, pages with
  image upload (drag to reorder, or pick many images at once to create pages in order), live phone preview,
  a publish checklist, and **draft / live / scheduled** publishing. Unsaved-changes guard and Ctrl/Cmd+S.
- **Featured** — schedule Title of the Week and Title of the Month; overlapping slots of the same kind are rejected by the database.
- **Categories** — add, rename, reorder, delete.
- **Subscribers** — search parents, set access (partners, reviewers, support fixes), and help with passwords: send a reset email or set a temporary password. Every action is logged.
- **Settings** — edit the **privacy policy** (shown in the app and on the website, with live preview and version numbers), add or remove admins, and view the support log.

**Making the first admin.** Sign up once (on the website or in the app), then run this in the Supabase SQL editor:
```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```
After that, admins can add other admins from Settings. Non-admin accounts that sign in to the dashboard see "No admin access".

Preview without a backend: uncomment `demo: true` in `web/public/config.js` (sample data, nothing is saved).

Tests: `node --test web/tests/admin/api.test.mjs` (set `SUPABASE_JS` to the supabase-js UMD file) runs the real data layer against a recording fake network.

## Supabase project (GenovaStorybook)
Project ref `cjdrlddvbyfataumdztg`. Applied migrations: `0001_init` (schema, RLS, storage buckets),
`0002_admin_cms` (scheduled publishing, admin access, page counts, featured-slot overlap guard, admin functions, seed author and categories),
`0003_harden_helpers` (access helpers moved to a private schema),
`0004_levels_access_plans_policy` (reading levels, 5-day grace access rule, plans, privacy policy, admin support log, hourly expiry job). The repo's migration files are the source of truth.
Story art: covers go to the public `covers` bucket; page images go to the private `pages` bucket and are shown through signed URLs.
Note: the Supabase tooling used here blocks `DROP`/`DELETE` statements, so `0002` uses `ALTER POLICY` instead of drop-and-recreate and page saving is done from the dashboard.

## Payments (Paystack, on the web)
The app never shows prices or purchase buttons. Parents subscribe on the website; the app unlocks
when the webhook writes the subscription.

1. In the Paystack dashboard create a **monthly** (₦5,000) and a **quarterly** (₦12,000) Plan and note the `PLN_...` codes.
2. Set Supabase secrets:
   ```sh
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... \
     PAYSTACK_PLAN_MONTHLY=PLN_... PAYSTACK_PLAN_QUARTERLY=PLN_... \
     WEB_URL=https://your-genova-site
   ```
3. Deploy (already deployed to the project): `paystack-checkout`, `paystack-manage`, `admin-user-support`, and
   `paystack-webhook --no-verify-jwt` (Paystack sends no Supabase JWT; the `x-paystack-signature` HMAC authenticates it).
4. Paystack → Settings → API Keys & Webhooks: webhook URL
   `https://cjdrlddvbyfataumdztg.supabase.co/functions/v1/paystack-webhook`.
5. Host `web/out`, then set `EXPO_PUBLIC_WEB_URL` in `app/.env` to its URL (the Grown-ups screen and the sign-in "Create an account" link use it).

## Password reset by email code
Supabase → Authentication → Email Templates → **Reset Password**: include `{{ .Token }}` (the 6-digit code) in the message, e.g.
"Your Genova code is {{ .Token }}". For real delivery, configure custom SMTP (Resend recommended) under Authentication → SMTP.

Run the logic tests: `cd supabase && node --experimental-strip-types --test tests/support.test.mjs tests/paystack.test.mjs`.

**Before going live:** the webhook reads Paystack payload fields defensively, but the field names
(`next_payment_date`, `plan.plan_code`, `metadata.user_id`, ...) were written from Paystack's docs and could not be
checked against a live delivery here. Subscribe once in test mode, inspect the stored row in `payment_events`, and
adjust `supabase/functions/_shared/paystack.ts` if anything differs.

## Status
Built:
- App: brand UI, Home (Week/Month, Popular, New, categories), story detail, reader (text size, three themes, resume, The End),
  **My books** (Reading, Favourites, Finished, Saved), offline reading (downloads and cached catalogue/access), reading-level readers,
  parental gate, Grown-ups area, sign-in with forgot-password email code, privacy policy pop-up, accessibility
  (dynamic type, screen-reader labels, reduced motion; zero axe WCAG A/AA violations on web export).
- Website: landing, plans, checkout (Paystack), account with Premium badge and manage-subscription, sign-up/sign-in/reset, privacy.
- Admin: dashboard, stories CMS, featured, categories, subscribers (access + password help), settings (privacy editor, admins, support log).
- Backend: schema + RLS, 5-day grace access rule, Paystack checkout/webhook/manage, admin password support.

Not yet built: audio and video (Phase 2 and 3), plus the queued items: contact-support link, consent on checkout, Resend email templates,
amber primary + teal theme + Day/Sepia/Night per theme, 4-digit passcode and kiosk mode.

Verification caveat: everything was exercised against a fake Supabase backend that speaks the real wire format and with SQL rollback tests;
nothing has been run against the live Supabase/Paystack (the build sandbox could not reach them), nor on a physical device.
Do a first sign-in, one story save, and one Paystack test payment as smoke tests.
