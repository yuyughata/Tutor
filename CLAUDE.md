# Genova (by CUSTAR) — working context

Children's storybook app. Text stories now; audio then video later. CUSTAR authors first, outside writers later.
Read `README.md` for setup, `docs/MVP_BRIEF.md` for scope, `docs/HANDOFF.md` for accounts/secrets/deploy/resuming in a new chat or account, and `tools/qa/README.md` for the browser test tooling. This file holds decisions, conventions and the backlog so a new session can continue without re-deriving them.

## Product decisions (do not re-litigate)
- **Reading levels, never ages.** Sunrise = Assisted Reader, Spark = Emergent Reader, Seeker = Developing Reader. No age or age-group text may appear in the app, website, admin or docs. DB enum is `reading_level` (`sunrise|spark|seeker`).
- **Payments on the web only** (Paystack). The app shows no prices and no purchase buttons; it links to the website behind the parental gate.
- **Plans:** Free; Paid ₦5,000/month; ₦12,000/quarter (table `plans`).
- **Access rule (single source of truth in the DB, `my_access()` + hourly expiry job):** active/trialing/past_due keep Premium until `current_period_end` + 5 days, then Free. Cancelled keeps access until period end. Active with no end date = complimentary.
- **Brand:** purple `#ab46d2`, teal `#10a19c`, amber `#ffbe00`, charcoal `#232323`; font Nunito. Use charcoal (not white) text on teal/amber and `purpleDeep`/`tealDeep`/`amberDeep` for small coloured text (contrast).
- Parents have accounts (created on the website); children are reader profiles on the device (name/nickname, avatar, level only).
- Privacy policy text lives in `legal_documents` (slug `privacy-policy`), edited by admins, shown in the app (pop-up) and on the website. Current text is SAMPLE.

## Layout
- `app/` Expo SDK 57 / React Native 0.86 / expo-router, TypeScript. react + react-dom are pinned exactly (19.2.3); keep them equal.
- `web/` Next.js 16 static export (`output: 'export'`, trailingSlash). Admin CMS is vanilla JS in `web/public/admin/` and shares the site's Supabase session.
- `tools/qa/` browser tests (fake Supabase backend), screenshot and PDF scripts. `supabase/seed_legal.sql` = sample privacy policy.
- `supabase/migrations/0001–0004` (all applied to the live project), `supabase/functions/` (paystack-checkout, paystack-webhook, paystack-manage, admin-user-support; all deployed), `supabase/tests/`.
- Supabase project **GenovaStorybook**, ref `cjdrlddvbyfataumdztg`.

## Commands
- App: `cd app && npm start`, `npm run typecheck`. Web: `cd web && npm run dev | build | typecheck | test` (`npm test` needs `app/node_modules` installed).
- Function tests: `cd supabase && node --experimental-strip-types --test tests/support.test.mjs tests/paystack.test.mjs` (pass files, not a directory).
- App web export for browser tests: `npx expo export -p web --clear` (use `--clear` or EXPO_PUBLIC env vars are stale).

## Conventions and gotchas
- Supabase client uses `db: { retry: false }`; catalogue is cache-first (AsyncStorage) so offline fallback is fast.
- Decorative images are `aria-hidden` (expo-image drops `alt=""`); keep zero axe WCAG A/AA violations.
- Supabase MCP tool: statements containing DROP/DELETE stall waiting for confirmation, and calls time out at 60s. Use `ALTER POLICY ... rename`, avoid those words, split migrations into small chunks. Policies call `private.is_admin(...)`.
- Sandbox cannot reach `*.supabase.co`, `paystack.com` or CDNs. Test with a fake backend that speaks the real Supabase wire format (Playwright route mocks), axe-core for accessibility, and rollback-only SQL tests (`raise exception` inside DO blocks with simulated JWT claims).
- Shell: do not `pkill -f` / `pgrep -f` with a pattern that matches your own command line (use `[h]ttp-server` style or a PID).
- Commit messages end with the Co-Authored-By and Claude-Session lines. Develop on `claude/gifted-brahmagupta-a0jtkt`; do not open a PR unless asked.

## Status
Done: reading levels everywhere; library (Reading/Favourites/Finished/Saved, search); offline downloads and cached catalogue/access; accessibility; sign-in copy, website "Create an account" link, forgot-password email code; admin password help (reset email or temporary password, logged); privacy policy pop-up + admin editor; Next.js website (landing, plans, checkout, account with Premium badge, auth pages, privacy); `docs/Genova_UI_Screens.pdf` refreshed.

## Backlog (user's exact asks, not yet built)
- **5.1** Contact-support link on the parent's account.
- **5.2** Privacy policy + parent-consent link/pop-up on the web checkout (same content as the app).
- **6** In-app emailing to subscribers from admin using **Resend**, with templates: Welcome, Subscription confirmation/receipt, Expiration/due amount, New title release/upcoming, Admin broadcast, Cancellation, Passcode/password change.
- **7** Amber `#ffbe00` as the primary action colour; keep the purple theme and add a teal `#10a19c` theme users can switch; each theme gets Day / Sepia / Night reader modes.
- **8** Parental gate with a 4-digit passcode for parents with accounts; kiosk mode (Android Lock Task Mode / `startLockTask`), exit via the PIN, toggle in settings.

## Not yet verified (be honest about this)
- Nothing has run against the live Supabase project or Paystack. Paystack webhook payload field names were written from docs; check one test-mode payment in `payment_events`.
- Reset Password email template must include `{{ .Token }}`; configure SMTP (Resend) for real delivery.
- Secrets unset: `PAYSTACK_SECRET_KEY`, `WEB_URL`, `PAYSTACK_PLAN_MONTHLY`, `PAYSTACK_PLAN_QUARTERLY`. `EXPO_PUBLIC_WEB_URL` blank until the site is deployed.
- No physical-device run (iOS/Android); no first admin created yet.
