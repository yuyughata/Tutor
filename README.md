# Genova

Children's storybook app by CUSTAR. Product scope: [`docs/MVP_BRIEF.md`](docs/MVP_BRIEF.md).

## Layout
- `app/` — Expo (React Native, TypeScript, Expo Router) mobile app.
- `supabase/migrations/0001_init.sql` — schema, row-level security, storage buckets.
- `supabase/seed.sql` — three sample stories for local development.
- `supabase/functions/` — `paystack-checkout` (starts a subscription) and `paystack-webhook` (grants access).
- `supabase/tests/` — unit tests for the Paystack logic.
- `web/` — the parent-facing subscribe page (`index.html`) and the **admin dashboard / CMS** (`admin/`). Both read `web/config.js`.

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

## Admin dashboard and CMS
`web/admin/` is a static site (no build step): host the `web/` folder anywhere (Netlify, Cloudflare Pages, Vercel, S3...) and open `/admin/`.
Locally: `cd web && npx http-server . -p 8080`, then http://localhost:8080/admin/.

What it does:
- **Dashboard** — live stories, active subscribers, child readers, reads over time, top stories, recent Paystack payments,
  and warnings (no Title of the Week, drafts waiting, launch-catalogue progress).
- **Stories** — search and filter; create and edit stories: details, categories, free/premium, cover upload, pages with
  image upload (drag to reorder, or pick many images at once to create pages in order), live phone preview,
  a publish checklist, and **draft / live / scheduled** publishing. Unsaved-changes guard and Ctrl/Cmd+S.
- **Featured** — schedule Title of the Week and Title of the Month; overlapping slots of the same kind are rejected by the database.
- **Categories** — add, rename, reorder, delete.
- **Subscribers** — search parents and grant complimentary access (app-store reviewers, partners).
- **Settings** — add or remove admins (the last admin can't be removed).

**Making the first admin.** Sign up once (on the website or in the app), then run this in the Supabase SQL editor:
```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```
After that, admins can add other admins from Settings. Non-admin accounts that sign in to the dashboard see "No admin access".

Preview without a backend: uncomment `demo: true` in `web/config.js` (sample data, nothing is saved).

Tests: `node --test web/admin/tests/api.test.mjs` runs the real data layer against a recording fake network.

## Supabase project (GenovaStorybook)
Project ref `cjdrlddvbyfataumdztg`. Applied migrations: `0001_init` (schema, RLS, storage buckets),
`0002_admin_cms` (scheduled publishing, admin access, page counts, featured-slot overlap guard, admin functions, seed author and categories),
`0003_harden_helpers` (access helpers moved to a private schema). The repo's migration files are the source of truth.
Story art: covers go to the public `covers` bucket; page images go to the private `pages` bucket and are shown through signed URLs.
Note: the Supabase tooling used here blocks `DROP`/`DELETE` statements, so `0002` uses `ALTER POLICY` instead of drop-and-recreate and page saving is done from the dashboard.

## Payments (Paystack, on the web)
The app never shows prices or purchase buttons. Parents subscribe on the website; the app unlocks
when the webhook writes an `entitlements` row.

1. In the Paystack dashboard create a monthly and a yearly **Plan** and note the `PLN_...` codes.
2. Set Supabase secrets:
   ```sh
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... \
     PAYSTACK_PLAN_MONTHLY=PLN_... PAYSTACK_PLAN_YEARLY=PLN_... \
     PAYSTACK_AMOUNT_MONTHLY=250000 PAYSTACK_AMOUNT_YEARLY=2400000 \
     WEB_URL=https://your-genova-site
   ```
   Amounts are in the minor unit (kobo, pesewas, cents) and only a fallback; the plan's own price wins.
3. Deploy: `supabase functions deploy paystack-checkout` and
   `supabase functions deploy paystack-webhook --no-verify-jwt` (Paystack sends no Supabase JWT; the
   `x-paystack-signature` HMAC is the authentication).
4. In Paystack → Settings → API Keys & Webhooks, set the webhook URL to
   `https://<project>.supabase.co/functions/v1/paystack-webhook`.
5. Copy `web/config.example.js` to `web/config.js`, fill it in, and host `web/` anywhere static.
   Set `EXPO_PUBLIC_WEB_URL` in `app/.env` so the Grown-ups screen can link to it (behind the parental gate).

Run the webhook logic tests: `node --experimental-strip-types --test supabase/tests/paystack.test.mjs`.

**Before going live:** the webhook reads Paystack payload fields defensively, but the field names
(`next_payment_date`, `subscription.next_payment_date`, `plan.plan_code`, `metadata.user_id`, ...)
were written from Paystack's docs and could not be checked against a live delivery here. Subscribe once in
test mode, inspect the stored row in `payment_events`, and adjust `supabase/functions/_shared/paystack.ts`
if anything differs. Also check which currencies your Paystack account can bill in.

## Status
Built:
- Brand UI (CUSTAR purple / teal / amber / charcoal, Nunito): Home with Title of the Week and Month, Popular,
  New and categories; story detail; reader (image over text, text size, three reading themes, resume,
  The End screen); My books (reading, favourites, finished); floating tab bar.
- Reader profiles with age bands (first-run "Who's reading?"), parental gate, Grown-ups area, parent sign-in.
- Favourites and reading progress per reader, saved on device and synced to Supabase when signed in.
- Schema + RLS, signed URLs for private story art, Paystack checkout + webhook, web subscribe page.

Not yet built: offline downloads, in-app search, audio and video (Phase 2 and 3). The app has been type-checked, bundled and exercised in a browser;
it has not been run on a physical iOS or Android device.
The admin dashboard was tested end to end in a browser against sample data, and its data layer was tested against
the real supabase-js client with a fake network. It has not yet been used against the live project (the build
sandbox could not reach supabase.co), so do a first sign-in and one save as a smoke test.
