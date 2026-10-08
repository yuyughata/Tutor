# Genova

Children's storybook app by CUSTAR. Product scope: [`docs/MVP_BRIEF.md`](docs/MVP_BRIEF.md).

## Layout
- `app/` — Expo (React Native, TypeScript, Expo Router) mobile app.
- `supabase/migrations/0001_init.sql` — schema, row-level security, storage buckets.
- `supabase/seed.sql` — three sample stories for local development.
- `supabase/functions/` — `paystack-checkout` (starts a subscription) and `paystack-webhook` (grants access).
- `supabase/tests/` — unit tests for the Paystack logic.
- `web/` — the parent-facing subscribe page (sign in, pick a plan, pay with Paystack).

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

Not yet built: admin CMS (use Supabase Studio meanwhile), offline downloads, in-app search,
audio and video (Phase 2 and 3). The app has been type-checked, bundled and exercised in a browser;
it has not been run on a physical iOS or Android device.
