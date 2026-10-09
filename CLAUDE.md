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
- `supabase/migrations/0001–0007` (all applied to the live project), `supabase/functions/` (paystack-checkout, paystack-webhook, paystack-manage, admin-user-support, send-email, support-request, send-reminders), `supabase/tests/`.
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

## Batch 2 (built, session of 2026-10-09)
- 5.1 Contact support: `support_requests` table, `support-request` function, website account card, admin **Support** inbox, link in the app's Grown-ups account card.
- 5.2 Checkout consent: checkbox + privacy pop-up (`PrivacyDialog`), `paystack-checkout` requires `consent: true` and writes `consents`.
- 6 Email (Resend): admin **Email** view (Connection = paste API key then Activate, Send to groups, Templates, History); `email_settings` (service-role only), `email_templates` (7), `email_log`; functions `send-email` (admin actions + `self` for welcome/passcode-changed) and the webhook sends receipt / cancellation / payment-due automatically. Shared code: `supabase/functions/_shared/email.ts`, `emailAdmin.ts` (tests: `supabase/tests/email.test.mjs`).
- 7 Themes: main actions are amber (`colors.action`) everywhere (app, website, admin). Accent themes purple and teal (`colors.primary*` / `secondary*`), chosen in Grown-ups > Appearance. Mechanism: `colors` is a live mutable object, `applyTheme()` swaps it, `themed(() => StyleSheet.create(...))` rebuilds styles lazily, and screens call `useTheme()` to re-render. Any new screen must call `useTheme()` and use `themed()` for styles that use colours. Each theme has its own Day/Sepia/Night reader modes (`readerThemes`).
- 8 Passcode: `parent_passcodes` (salted hash only), `src/state/passcode.tsx`, `PinPad`, `app/passcode.tsx`; gate (`src/state/gate.tsx`) uses the PIN when signed in with a passcode, otherwise the number-word puzzle; 5 wrong tries lock for 60 s; "Forgot passcode?" re-checks the account password. The gate waits until the passcode state is known (never falls back to the puzzle on launch).
- 9 Kiosk: `src/state/kiosk.tsx` + local native module `app/modules/genova-kiosk` (Android Lock Task Mode) + `docs/KIOSK.md`. **Kotlin not compiled or run on a device yet.**

## Email designs (built, migration 0007)
One minimal layout for every email (`renderEmail` in `supabase/functions/_shared/email.ts`): wordmark, white card with a thin brand bar, small label (`email_templates.eyebrow`), big headline, hairline receipt table for "- Label: value" lines, "> note", "![alt](https://...)" picture, amber "[Button](url)", `code` box, dark-mode styles, plain-text twin, footer links. 12 templates: welcome, subscription_confirmation, renewal_due, payment_failed, cancellation, new_title, broadcast, security_change, renewal_upcoming, access_ending, grace_ending, support_received. Supabase Auth emails (confirm signup, reset code with `{{ .Token }}`, change email) are separate HTML in `supabase/auth-email-templates/` to paste into the Supabase dashboard. Previews: `docs/email-templates/*.html`, `docs/Genova_Email_Templates.pdf`. Regenerate with `python3 tools/email/extract_templates.py && node --experimental-strip-types tools/email/build.mjs && PW=<playwright> node tools/email/gallery.cjs`. The webhook sends `payment_failed` on `invoice.payment_failed`; `support-request` also sends `support_received` to the parent.

## Scheduled reminders (built, migration 0006)
Daily pg_cron job `send-reminder-emails` (08:00 UTC = 09:00 Nigeria) -> pg_net -> edge function `send-reminders` (verify_jwt off; authenticates with the `x-job-secret` header = `job_secrets.reminders`, or an admin JWT for "Run now"). Rules in `email_reminder_rules` (renewal_upcoming 3 days, access_ending 3 days, grace_ending 2 days; editable in Admin > Email > Reminders). `reminder_candidates()` picks who is due; `email_reminders` records one send per (parent, kind, period_end) so nothing repeats; the claim is released if sending fails. Tests: `supabase/tests/reminders.test.mjs`. On a new project run `select private.schedule_reminders('https://<ref>.supabase.co/functions/v1');`.

## Backlog
- Email domain verification and the first real Resend test.
- Paystack: the live secret key must be set as the Supabase secret `PAYSTACK_SECRET_KEY` (dashboard > Edge Functions > Secrets); it was shared in chat once, so roll it in the Paystack dashboard and set the new value. The webhook URL in Paystack must be the Supabase function URL, not another site's.

## Not yet verified (be honest about this)
- Nothing has run against the live Supabase project or Paystack. Paystack webhook payload field names were written from docs; check one test-mode payment in `payment_events`.
- Reset Password email template must include `{{ .Token }}`; configure SMTP (Resend) for real delivery.
- Secrets unset: `PAYSTACK_SECRET_KEY`, `WEB_URL`, `SUPPORT_EMAIL` (optional), `PAYSTACK_PLAN_MONTHLY`, `PAYSTACK_PLAN_QUARTERLY`. Resend key is entered in the admin, not as a secret. `EXPO_PUBLIC_WEB_URL` blank until the site is deployed.
- No physical-device run (iOS/Android); no first admin created yet.
