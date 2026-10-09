# Genova handoff: continue in a new chat or a different account

Everything needed to keep building lives in this repo. Start with `CLAUDE.md` (decisions, conventions, backlog), then this file.
Secrets are **never** stored in the repo; the "Accounts and secrets" table says where each one lives.

## 1. Get the code
```sh
git clone https://github.com/yuyughata/Tutor.git && cd Tutor
git checkout claude/gifted-brahmagupta-a0jtkt     # latest work; merge to main when you are happy
cd app && npm install && cd ../web && npm install && cd ../tools/qa && npm install
```
Run: `cd app && npm start` (press `w` for web, `i`/`a` for simulators); `cd web && npm run dev` (site at :3000, admin at :3000/admin/).
With no `app/.env` the app runs on built-in sample stories. To use the live backend copy `app/.env.example` to `app/.env`.

## 2. Resume with Claude in a new chat or account
1. Give Claude access to the GitHub repo `yuyughata/Tutor` (Claude Code on the web: connect GitHub and select the repo; the Claude GitHub app must be installed on it).
2. `CLAUDE.md` loads automatically. First message to send:
   > Read CLAUDE.md and docs/HANDOFF.md, then continue with the Backlog in CLAUDE.md (scheduled reminder emails, first real Resend test, device test of kiosk mode). Work on branch `claude/gifted-brahmagupta-a0jtkt`.
3. To let Claude change the live database/functions, connect the **Supabase** connector (the account that owns the project) so it can run migrations and deploy functions. Without it, Claude can still edit code and you apply SQL and deploys yourself (section 4).
4. Ask Claude to keep `CLAUDE.md` current at the end of each batch.

## 3. Accounts and secrets
| Service | What it is used for | Where the secret lives | Status |
|---|---|---|---|
| GitHub `yuyughata/Tutor` | Code | Your GitHub login | exists |
| Supabase project **GenovaStorybook**, ref `cjdrlddvbyfataumdztg`, URL `https://cjdrlddvbyfataumdztg.supabase.co` | Auth, Postgres, storage, edge functions | Owner's Supabase account. Anon key is public (in `app/.env.example`, `web/lib/config.ts`, `web/public/config.js`). **Service-role key** is only inside Supabase (functions read it automatically); never commit it | exists, migrations 0001-0006 applied, 7 functions deployed |
| Paystack | Subscriptions on the web | `PAYSTACK_SECRET_KEY` as a Supabase function secret | **not set up yet** |
| Resend | Receipts, welcome, reminders, broadcasts (Admin > Email) and, optionally, Supabase auth emails via SMTP | The API key is pasted into Admin > Email > Connection (stored server-side only). SMTP creds, if used, go in Supabase Auth settings | **not set up yet** |
| Web hosting (Netlify / Cloudflare Pages / Vercel) | Hosts `web/out` | Host dashboard | **not deployed yet** |
| Expo (EAS), Apple Developer, Google Play | Store builds | Your accounts | **not set up yet** (`app.json`: `com.custar.genova`) |

**Moving to a different Supabase account** (or if the project is lost): follow section 4 on a new project, then replace the URL/anon key in `app/.env`, `web/lib/config.ts` (or `NEXT_PUBLIC_SUPABASE_*` env vars) and `web/public/config.js`.

## 4. Backend setup (new project, or to verify the existing one)
1. **Database:** run `supabase/migrations/0001` to `0006` in order (SQL editor, or `supabase db push`). Then run `supabase/seed_legal.sql` (sample privacy policy). Optionally run `supabase/seed.sql` for three demo stories (they use placeholder picsum images).
   `0006` schedules the daily reminder job for ONE functions URL: on a new project run `select private.schedule_reminders('https://<project-ref>.supabase.co/functions/v1');` (it needs pg_cron and pg_net enabled).
   `0004` enables `pg_cron` and schedules the hourly job that moves lapsed subscribers to Free.
2. **Storage:** buckets `covers` (public) and `pages` (private, signed URLs) are created by migration `0001`.
3. **Auth settings** (Supabase > Authentication):
   - Email provider on, "Confirm email" per your preference (the website/app handle both).
   - URL Configuration: Site URL = your website URL.
   - Email Templates > **Reset Password**: the message must contain `{{ .Token }}` (the 6-digit code the app and website ask for).
   - SMTP: configure custom SMTP (Resend recommended). Supabase's built-in sender is heavily rate-limited.
4. **Edge functions** (`supabase login`, `supabase link --project-ref <ref>`):
   ```sh
   supabase functions deploy paystack-checkout
   supabase functions deploy paystack-manage
   supabase functions deploy admin-user-support
   supabase functions deploy send-email
   supabase functions deploy support-request
   supabase functions deploy send-reminders --no-verify-jwt   # called by the daily cron job with its own secret
   supabase functions deploy paystack-webhook --no-verify-jwt     # Paystack sends no Supabase JWT; its HMAC signature authenticates it
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... WEB_URL=https://your-site \
     PAYSTACK_PLAN_MONTHLY=PLN_... PAYSTACK_PLAN_QUARTERLY=PLN_...
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically.)
5. **Paystack dashboard:** Paystack allows ONE webhook URL per mode (test/live) per business. Use a Paystack business that is not already pointing its webhook at another site. Create two Plans (monthly ₦5,000, quarterly ₦12,000) and copy their `PLN_...` codes; Settings > API Keys & Webhooks: webhook URL `https://<ref>.supabase.co/functions/v1/paystack-webhook`.
   Prices shown on the site come from the `plans` table; the amount charged comes from the Paystack plan, so keep them equal.
6. **First admin:** sign up once on the website, then run
   `update public.profiles set is_admin = true where email = 'you@example.com';`
   After that admins add other admins from the dashboard (Settings).
7. **Smoke test on the live project** (never done yet): sign up, sign in on the admin, create and publish a story with images, read it in the app, run one Paystack test payment and check the row in `payment_events` and the Premium badge, then try the forgot-password code.
   Paystack's real webhook field names have not been verified; if anything differs adjust `supabase/functions/_shared/paystack.ts` (its tests are in `supabase/tests/`).

## 5. Deploy the website and admin
```sh
cd web && npm run build          # static site in web/out (includes /admin/)
```
Upload `web/out` to Netlify/Cloudflare Pages/Vercel (build command `npm run build`, publish directory `out`). Optional env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
Then set `EXPO_PUBLIC_WEB_URL` in `app/.env` (the app's "Create an account" and "Manage on the web" links use it) and `WEB_URL` in the function secrets.

## 6. Build and publish the mobile app
```sh
cd app && npm i -g eas-cli && eas login && eas build:configure
eas build -p android --profile preview      # test build (APK)
eas build -p ios --profile preview          # needs an Apple Developer account
```
Set the `EXPO_PUBLIC_*` values as EAS environment variables (they are public). Before store submission read the risks in `docs/MVP_BRIEF.md` (Kids Category and Families policy, children's privacy, review of the privacy policy text).
Kiosk mode needs a native build (Android Lock Task Mode); it will not work in Expo Go. Read `docs/KIOSK.md` (device-owner setup for dedicated tablets) and test it on a real Android device before release.

## 7. Day-to-day workflow
- Content: stories are created in the admin (`/admin/`): cover, pages with images and text, reading level, free or Premium, draft/live/scheduled; Title of the Week/Month in Featured. Target 15-20 launch stories.
- Code: edit, then `npm run typecheck` (app and web), `npm test` (web), the Paystack tests, and the QA scripts in `tools/qa` (see its README). Keep zero axe violations.
- Database changes: add a new numbered file in `supabase/migrations/` (never edit applied ones), apply it, and note it in `README.md` and `CLAUDE.md`. The Supabase tool used earlier stalls on statements containing DROP or DELETE (details in `CLAUDE.md`).
- Privacy policy text: edit in the admin (Settings). The seeded text is a sample and needs legal review before launch.
- Regenerate `docs/Genova_UI_Screens.pdf` with the steps in `tools/qa/README.md` after UI changes.

## 8. What is done and what is next
See the Status and Backlog sections of `CLAUDE.md` (items 5.1, 5.2, 6, 7, 8). Also remaining before launch: smoke test on the live project, device testing, legal review, store listings.
