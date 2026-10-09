# Genova launch guide: web, Apple App Store, Google Play

Step by step, in the order you should do things. Facts about store rules and prices were checked on 9 October 2026 against Apple's and Google's pages where possible; stores change their rules often, so every "verify" note means: look at the live page before you rely on it.

**What you are launching**
| Piece | Where it lives | Hosting |
|---|---|---|
| Website, parent accounts, checkout, admin dashboard | `web/` (Next.js static export, admin at `/admin/`) | Cloudflare Pages (recommended), Netlify or Vercel |
| Backend (database, login, storage, functions, daily jobs) | Supabase project `cjdrlddvbyfataumdztg` | Supabase (use the Pro plan for launch) |
| Payments | Paystack, on the website only | Paystack |
| Email | Resend | Resend |
| Mobile app (iOS + Android) | `app/` (Expo) | Apple App Store, Google Play, built with EAS |

---

## 0. Read this first

### 0.1 The one decision that can block the stores: the "web payment" link
Genova takes payment only on the website. Both stores have rules about apps that point to outside payment:

- **Apple.** Kids Category apps "must not include links out of the app, purchasing opportunities, or other distractions to kids unless reserved for a designated area behind a parental gate" (guideline 1.3). Genova's Grown-ups area is behind the parental gate, which fits. Separately, Apple wants subscriptions to use in-app purchase unless an exception applies (3.1.1). The exception that fits a storybook app is **Reader apps** (3.1.3(a)): you may let people sign in to content bought elsewhere and offer free-tier account creation and account management, and you can apply for the **External Link Account Entitlement** to show an *informational* link to your website to create or manage an account. No entitlement is needed for apps in the **United States** storefront. I found nothing that says Reader apps and the Kids Category cannot be combined, and nothing that says they can, so ask Apple (see 6.7).
- **Google.** Outside the US, Google Play expects digital subscriptions bought through apps to use Google Play billing, and Nigeria is not on the list of countries with alternative billing (Google's list: EEA, Australia, Brazil, India, Indonesia, Japan, South Africa, South Korea, UK, US). I could not find Google's exact wording for apps that only *sign users in* to subscriptions bought elsewhere, and I found no Families-policy text that allows or bans links to outside payment in children's apps. Treat any in-app "buy on our website" button on Android as risky until Google confirms.

**What I did in the code to keep you safe:**
- The app never shows prices or a purchase button. Grown-ups now has one neutral button, "Manage my account on the web" (no "Get Premium"), and the sign-in screen links to "Create an account on the Genova website" (account creation).
- `EXPO_PUBLIC_WEB_LINKS=off` hides every link-out. `eas.json` has two production profiles: `production` (iOS, links on) and `production-android` (links off). Locked stories already only say "Ask a grown-up".

**Recommended plan:** ship iOS with the neutral account link and apply for the Reader entitlement (or launch the US storefront first, where it is not needed); ship Android with links off: parents create their account on your website (you tell them there, on social media and in your own marketing), then sign in to the app. Revisit when Google or Apple answer. **Fallback** if a store rejects it: add in-app purchase through RevenueCat (store fee 15–30%; a larger build) or remove the link and rely on word of mouth plus your website.

### 0.2 Time and money
| Item | Cost | Lead time |
|---|---|---|
| Apple Developer Program (organization) | US$99 per year | D-U-N-S number up to ~30 days if you do not have one, then Apple's checks (days) |
| Google Play Console | US$25 once | Organization verification with D-U-N-S, about a day to a few weeks (Google allows about a month to finish) |
| Personal Play account only | free | **Closed test with at least 12 testers for 14 days in a row** before production |
| Supabase Pro | about US$25 per month | minutes |
| Domain | about US$10–20 per year | minutes |
| Cloudflare Pages, Resend free tier (3,000 emails per month) | free | minutes |
| Expo EAS | free tier has limited builds; paid plan if you build often | minutes |

Prices were not re-checked on the vendors' pages; check at checkout. **Start the D-U-N-S request and both developer accounts today.** They are the slowest part and they run in parallel with everything else.

### 0.3 Order of work (about 4 to 6 weeks, mostly waiting)
1. Week 0: company details, D-U-N-S, Apple and Google accounts, domain, Supabase Pro, Resend domain.
2. Weeks 1–2: backend to production, website live, Paystack live, email live. Smoke test with a real payment.
3. Weeks 2–3: icons and screenshots, internal builds, TestFlight and Play internal testing.
4. Weeks 3–5: Play closed test (14 days if personal account), App Review (usually 1–3 days, plan for rejections), production.

---

## 1. Before anything: accounts, company and legal

1. **Company.** Use CUSTAR's registered legal name on everything (Apple, Google, Paystack, the privacy policy, the website footer). Apple's and Google's organization accounts need a legal entity, its D-U-N-S number, a company website and a company email on your own domain (not Gmail).
2. **D-U-N-S number.** Free from Dun & Bradstreet (search "D-U-N-S number request" with your CAC registration). Ask for it first.
3. **Domain.** Buy one, for example `genova.ng`, `genova.app` or a subdomain like `genova.custar.com`. You need it for the website, email sending and the privacy policy URL.
4. **Professional email addresses** on that domain: `support@…` (shown to parents), `hello@…` (Resend "from").
5. **Legal text, reviewed by a lawyer.** The privacy policy in the database is SAMPLE text. Get it reviewed (Nigeria Data Protection Act 2023; COPPA and GDPR-K if you serve those regions). Also add a Terms of Service page and a refund/cancellation statement. Edit the policy in Admin > Settings; the app and website update at once.
6. **Account deletion.** Both stores and data-protection law expect people to be able to delete their account. Today the website's `/support/` page tells parents to email for deletion (done within 30 days). Google's Data safety form asks for a web link for deletion requests (use `https://<your-site>/support/`). Before launch, ask me to build a self-service "Delete my account" button; it is the cleaner answer for reviewers.
7. **Age information in store forms.** Genova shows no ages inside the product, but the stores require age declarations in their *own* forms (Apple age rating and Kids age band; Google target audience and IARC rating). Answer them honestly based on your stories. That is compliance, not product UI.

---

## 2. Backend to production (Supabase, Paystack, Resend)

### 2.1 Supabase
1. Open the project (ref `cjdrlddvbyfataumdztg`) > **Billing** and move it to **Pro**. Free projects are paused after about a week of low activity, which would take the app and website offline. Pro cannot be paused ([source](https://supabase.com/docs/guides/platform/free-project-pausing)).
2. **Authentication > URL Configuration:** Site URL = your website (for example `https://genova.example`). Add `https://genova.example/**` to Redirect URLs.
3. **Authentication > Email Templates:** paste the three HTML files from `supabase/auth-email-templates/` (Confirm signup, Reset Password, Change Email Address). The reset template must contain `{{ .Token }}` (the 6-digit code). Subjects are in `tools/email/auth.json`.
4. **Authentication > SMTP Settings:** turn on custom SMTP with Resend (host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `hello@your-domain`). Supabase's built-in email is rate-limited and poorly delivered.
5. **Authentication > Providers > Email:** keep "Confirm email" on if you want verified addresses (the website and app handle it). Set a minimum password length of 8.
6. **Backups:** Pro includes daily backups; also do a test restore into a spare project once.
7. **Function secrets** (Project Settings > Edge Functions > Secrets). Enter them in the dashboard yourself; never paste secrets into chat or code:
   - `PAYSTACK_SECRET_KEY` = your Paystack **live** secret key. **The key you shared in chat is exposed: roll it in the Paystack dashboard first and use the new one.**
   - `WEB_URL` = `https://genova.example` (no trailing slash)
   - `PAYSTACK_PLAN_MONTHLY`, `PAYSTACK_PLAN_QUARTERLY` = the `PLN_…` codes from 2.2
   - `SUPPORT_EMAIL` = `support@your-domain` (optional)
8. **Functions** are already deployed (`paystack-checkout`, `paystack-manage`, `paystack-webhook` without JWT, `admin-user-support`, `send-email`, `support-request`, `send-reminders` without JWT). On a new project follow `docs/HANDOFF.md` section 4.
9. **Daily reminders job** is scheduled (09:00 Nigeria time). Check in the SQL editor: `select jobname, schedule, active from cron.job;` should list `send-reminder-emails` and `expire-lapsed-subscriptions`.
10. **First admin:** sign up on the website, then in the SQL editor: `update public.profiles set is_admin = true where email = 'you@your-domain';`

### 2.2 Paystack (live)
1. In Paystack, complete **business verification** for live mode.
2. **Plans:** Dashboard > Products > Plans. Create **Genova Premium Monthly** (₦5,000, monthly) and **Genova Premium Quarterly** (₦12,000, quarterly). Copy both `PLN_…` codes into the Supabase secrets above. The amount charged comes from the Paystack plan, so it must match the prices on the website (`plans` table).
3. **Webhook:** Settings > API Keys & Webhooks > Live Webhook URL = `https://cjdrlddvbyfataumdztg.supabase.co/functions/v1/paystack-webhook`.
   **Paystack allows one webhook URL per mode.** The URL you sent earlier (`lotwise.ng/...`) belongs to another site. If that site uses the same Paystack business, create a separate Paystack business for Genova, or have that site forward events to Genova's function. Do not swap the URL until you decide.
4. **Smoke test with a real payment:** subscribe on the website with a small plan on a test account, then check: (a) the account page shows the Premium badge, (b) in the SQL editor `select event, created_at from payment_events order by created_at desc limit 5;` shows the events, (c) the receipt email arrives. **If Premium does not appear,** open `payment_events` and compare the stored payload to `supabase/functions/_shared/paystack.ts`; I wrote the field names from Paystack's docs and could not test them live.
5. Cancel that test subscription from the account page (Manage or cancel subscription).

### 2.3 Resend (email)
1. Create an account at resend.com. Add your domain (Domains) and add the DNS records it shows; wait for **Verified**.
2. Create an API key ("Sending access" is enough).
3. In the admin: **Email > Connection**: paste the key, set From email (`hello@your-domain`), Reply-to (`support@…`), and "Support notifications" (the inbox that gets new support requests). Press **Save settings**, then **Activate email**, then **Send test email**.
4. Check the received test in Gmail and on a phone, in light and dark mode.

### 2.4 Content
Publish your launch stories in the admin (aim for 15–20, with Title of the Week and Month set). Remove demo/sample stories you do not want. Create a complimentary reviewer account (see 6.8).

---

## 3. Host the website

The site is a static export: `cd web && npm run build` creates `web/out/` (including `/admin/`). Any static host works. **Cloudflare Pages** is recommended (free, fast, headers file supported).

### 3.1 Cloudflare Pages with GitHub (recommended)
1. Cloudflare dashboard > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**; pick the `Tutor` repository and the branch you want live (merge `claude/gifted-brahmagupta-a0jtkt` into `main` first if you prefer).
2. Build settings: **Framework preset: None**. **Root directory: `web`**. **Build command: `npm run build`**. **Build output directory: `out`**. Do not use the "next-on-pages" preset; this is a static export.
3. **Environment variables** (Production): `NODE_VERSION` = `22`. Optional: `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (defaults already point at the GenovaStorybook project).
4. **Save and Deploy.** Open the `*.pages.dev` address and click through: home, plans, sign up, log in, `/privacy/`, `/support/`, `/admin/`.
5. **Custom domain:** the project's **Custom domains** tab > add `genova.example` (and `www`), follow the DNS prompts. HTTPS is automatic.
6. Redeploys happen on every push to the chosen branch.

### 3.2 Netlify or Vercel instead
- **Netlify:** New site from Git, base directory `web`, build `npm run build`, publish directory `out`, env `NODE_VERSION=22`. The `_headers` file works as is.
- **Vercel:** import the repo, Root Directory `web`, Framework Next.js (output `export` is detected), no env needed. `_headers` is ignored on Vercel; add the same headers in `vercel.json` if you use it.

### 3.3 Direct upload (no Git)
`cd web && npm run build && npx wrangler pages deploy out` (Cloudflare) or drag `web/out` into Netlify Drop.

### 3.4 After the site is live
1. Supabase secret `WEB_URL` = the live address (step 2.1.7), and Supabase **Site URL** (2.1.2). Without them checkout returns and email links point nowhere.
2. In the app config (section 4) set `EXPO_PUBLIC_WEB_URL` to the same address.
3. **Protect the admin:** it already has `noindex`, `no-store` and a `robots.txt` block. For a stronger lock add **Cloudflare Access** (Zero Trust, free for a few users) in front of `/admin/*` so only CUSTAR staff emails reach the login page at all.
4. Add the site to Google Search Console if you want search visibility.
5. Re-run the checks: sign up, log in, forgot password (code email arrives), checkout opens Paystack, the account page shows the plan.

---

## 4. Prepare the mobile app (once)

### 4.1 What is already in the repo
- `app/app.json`: name, `version` 1.0.0, bundle id and package `com.custar.genova` (**cannot be changed after you publish**), icons and splash, no unneeded permissions, encryption declaration for Apple.
- `app/eas.json`: build profiles `preview` (installable test builds), `production` (store builds), `production-android` (links off) and submit settings.
- `app/assets/*`: **placeholder** icon, adaptive icon, splash mark and favicon. Replace them with CUSTAR's final artwork (see 4.2).
- Native Android kiosk module (`app/modules/genova-kiosk`): must be tested on a real device (`docs/KIOSK.md`).

### 4.2 What you must supply
- **Final app icon:** 1024×1024 PNG, no transparency, no rounded corners (replace `app/assets/icon.png`). Android adaptive icon foreground 1024×1024 transparent PNG with the logo inside the central 66% (replace `adaptive-icon.png`). Splash mark (replace `splash-icon.png`).
- **Screenshots** for the listings (4.3) and a **feature graphic** 1024×500 for Google Play.
- **Short and long descriptions**, keywords, support URL (`https://<site>/support/`), privacy policy URL (`https://<site>/privacy/`), marketing URL (the site).

### 4.3 Screenshot sizes (verify in each console)
- Apple: iPhone 6.9" and 6.5" sets are the usual required ones; if the app supports iPad (`supportsTablet: true`) add iPad 13". Use the same screens you show to parents; avoid showing ages. (Apple's 2.3.8: screenshots must suit a 4+ rating.)
- Google: at least 2 phone screenshots (aim for 5–8), plus 7" and 10" tablet screenshots if you want tablet featuring.
- The UI PDF (`docs/Genova_UI_Screens.pdf`) shows candidate screens; capture real device screenshots at the right sizes for the listing.

### 4.4 Set up EAS (Expo's build service)
```sh
npm install -g eas-cli
eas login                        # create a free account at expo.dev first
cd app
eas init                         # links the project and adds extra.eas.projectId to app.json
```
Add the website address as an EAS environment variable (public value, not a secret):
```sh
eas env:create --name EXPO_PUBLIC_WEB_URL --value https://genova.example --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_WEB_URL --value https://genova.example --environment preview --visibility plaintext
```
(or add it in the Expo dashboard under Environment variables). `eas.json` already carries the Supabase URL and public anon key.

### 4.5 Make test builds
```sh
cd app
eas build --profile preview --platform android   # an .apk you can install directly
eas build --profile preview --platform ios       # needs your Apple Developer account (section 6)
```
Install the Android build on a real phone and test the whole list in 4.6.

### 4.6 Test checklist before any submission
- Sign up on the website, then sign in on the app; add a reader; read a free story; read a Premium story with a paid account.
- Save a story for offline, switch on airplane mode, read it.
- Forgot password: code arrives, new password works.
- Create the grown-up passcode; the gate asks for it; five wrong tries lock it; "Forgot passcode" works.
- Both themes (Purple and Teal), all three reader modes.
- Kiosk mode on Android: see `docs/KIOSK.md` (pin prompt, Back does nothing, wrong PIN refuses, right PIN releases). **If the store reviewer questions the device-admin component** the kiosk module declares, you can remove the `<receiver>` from `app/modules/genova-kiosk/android/src/main/AndroidManifest.xml`; screen pinning still works without it.
- No ads, no third-party analytics SDKs (Kids Category and Families rules). Do not add any without a lawyer.

---

## 5. Version numbers (every release)
`eas.json` uses `appVersionSource: remote` and `autoIncrement: true` for production, so EAS bumps the build number (iOS) and versionCode (Android) for you. Change the human version (`"version"` in `app/app.json`, for example `1.0.1`) when you ship something users should notice.

---

## 6. Apple App Store (iOS)

### 6.1 Enroll
1. Go to developer.apple.com/programs > **Enroll**. Choose **Organization**. You need the D-U-N-S number, legal entity name, company website and a work email on the company domain. Pay US$99 per year. Apple may call to verify. (Confirm Nigeria is on Apple's list of supported regions on the enrollment page.)
2. Turn on two-factor authentication for the Apple ID that will be the **Account Holder**. Add teammates in App Store Connect > Users and Access.

### 6.2 Create the app record
1. App Store Connect > **Apps** > **+** > **New App**: Platform iOS, Name **Genova** (must be unique; have a fallback like "Genova Stories"), Primary language English, Bundle ID `com.custar.genova` (registered the first time EAS builds; if it is not in the list, run step 6.4 first), SKU `genova-ios`, user access Full.
2. Open the app > **App Information**. Note the **Apple ID** number (the "ascAppId"). Put it in `app/eas.json` under `submit.production.ios.ascAppId`.

### 6.3 Kids Category and the age rating
- In **App Information** choose a primary category (Education or Books) and, if you want the Kids Category, a **Kids age band** (you pick one band). Apps in the Kids Category follow guidelines 1.3 and 5.1.4: no third-party analytics or ads, no links out or purchase prompts except in an area behind a parental gate, and a privacy policy. Genova's parental gate and passcode are built for this.
- **Age Rating:** answer the questionnaire truthfully (no violence, no user-generated content, no web access beyond the website link behind the gate). Expect a 4+ result.
- If you do **not** choose the Kids Category, Apple's 2.3.8 stops you using wording that implies children are the main audience in the name, subtitle, icon, screenshots or description.

### 6.4 Build and upload
```sh
cd app
eas build --profile production --platform ios     # first time: sign in with your Apple ID when asked; EAS creates certificates and the bundle id
eas credentials --platform ios                     # one-time: App Store Connect: Manage your API Key -> set up for EAS Submit
eas submit --platform ios --profile production     # uploads the build to App Store Connect
```
Keep the `.p8` API key file private; Apple lets you download it only once. Do not commit it (`.gitignore` already blocks `*.p8`). Use a role with only upload rights, not the Account Holder, for automation ([Expo submit docs](https://docs.expo.dev/submit/ios)).

### 6.5 TestFlight (internal testing)
After processing (minutes to an hour) the build appears under **TestFlight**. Answer the export-compliance question if shown (the app only uses standard encryption, and `ITSAppUsesNonExemptEncryption` is already `false`). Add internal testers (up to 100 App Store Connect users) and test on real iPhones and an iPad.

### 6.6 Fill in the store listing
In the app's **iOS App** version page: screenshots, promotional text, description, keywords (100 characters), support URL `https://<site>/support/`, marketing URL, **version** text, copyright "© 2026 CUSTAR", build (select the processed build).
**App Privacy** (privacy "nutrition label"): declare honestly. For Genova that is roughly: *Contact info > Email address* and *Name* (the reader nickname), *Identifiers > User ID*, *Usage data > Product interaction* (reading activity); all linked to the user, used for **app functionality**, **not used for tracking**, no third-party advertising or analytics. Payment card details are handled by Paystack on the web, never collected by the app. Add the privacy policy URL `https://<site>/privacy/`.

### 6.7 The Reader entitlement and the link
Apple's rule for informational links is in guideline 3.1.3(a). To show the account link outside the US storefront, request the **External Link Account Entitlement** in your Apple Developer account (search "External Link Account Entitlement" or "Reader app" in Contact Us > App Store). Describe: "Genova is a children's e-book/storybook reader app. Content is accessed with an account created and managed on our website. The app has no in-app purchases and shows no prices; a link behind a parental gate lets a parent create and manage their account." Ask in the same message whether it can be used in the Kids Category and get the answer in writing. In **App Review notes** repeat this.
If they say no: remove the link for that storefront (build with `EXPO_PUBLIC_WEB_LINKS=off`) and rely on the website for sign-up.

### 6.8 Review notes and a demo account
Apple reviewers must be able to use every feature. In **App Review Information** give: a **demo parent account** (email + password) with **Premium access**. Create it on the website, then in the admin go to Subscribers > Access and set it to complimentary (long end date, label "app review"). Add notes: "Genova is a children's storybook app. Parents create accounts on our website; children are reader profiles on the device. Payments happen only on the website; the app has no purchases. Grown-up areas are behind a parental gate (a 4-digit passcode once the parent creates one, otherwise a number puzzle). Kiosk mode is optional and off by default. No ads or third-party analytics."

### 6.9 Submit and release
1. **Add for Review** > **Submit**. Typical review time is 1–3 days; rejections are common the first time and are fixed by replying or resubmitting.
2. Choose **Manually release** so you control the launch day.
3. After approval press **Release**.

---

## 7. Google Play (Android)

### 7.1 Create the developer account
1. Go to play.google.com/console > create account, pay the one-time US$25. Choose **Organization** (needs your D-U-N-S number and company documents; Google verifies identity, which can take days; allow a few weeks).
2. A **personal** account created after 13 November 2023 must run a **closed test with at least 12 testers opted in for 14 days in a row** before production access ([Google's rule, summarised by third parties](https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338)). Organization accounts appear to be exempt; confirm in your own Play Console dashboard.

### 7.2 Create the app
Play Console > **Create app**: name **Genova**, default language, **App** (not game), **Free**, accept the declarations.

### 7.3 Build the bundle
```sh
cd app
eas build --profile production-android --platform android   # makes an .aab (links to the website are OFF in this profile)
```
EAS creates and stores the signing key. Enrol in **Play App Signing** (the default), which lets Google hold the final signing key.

### 7.4 Service account for automatic uploads
Needed for `eas submit` (Expo docs: [Android submit](https://docs.expo.dev/eas/submit/android/)):
1. Google Cloud console > create a project (or reuse) > **IAM & Admin > Service accounts** > create one > **Keys** > add a **JSON** key and download it.
2. Play Console > **Users and permissions** > **Invite new users** > use the service account email, give it **Release manager** rights for the Genova app only (not account-wide admin).
3. Save the file as `app/play-service-account.json`. It is git-ignored. **Never commit it.** (Or upload it to your Expo project's Android credentials in the dashboard.)

### 7.5 First release: internal testing
```sh
eas submit --platform android --profile production-android   # sends the .aab to the internal testing track as a draft
```
Newer Expo docs say `eas submit` can create the first release; some older pages say the first upload must be done by hand in the Play Console. If it fails on a brand-new app, upload the `.aab` manually once under **Test and release > Testing > Internal testing > Create new release**, and use `eas submit` from then on.
Add yourself and testers (an email list) and open the internal-testing link on a real Android phone.

### 7.6 App content declarations (must all be green before production)
In **Policy and programs > App content** complete:
- **Privacy policy:** `https://<site>/privacy/`.
- **Ads:** No ads.
- **App access:** "All or some functionality is restricted": give the **demo parent account** with Premium (see 6.8) and instructions.
- **Content rating:** the IARC questionnaire (expect an "Everyone"-type rating).
- **Target audience and content:** this is where you declare it is for children. Choose the child age groups that match your stories. This opts the app into Google's **Families Policy**: no advertising SDKs, no advertising ID, only approved SDKs, and the app must comply with children's privacy laws ([Families policy](https://support.google.com/googleplay/android-developer/answer/9893335)). Genova has no ad or analytics SDKs.
- **Data safety:** collected data: email address, name (reader nickname), user ID, app interactions (reading activity); encrypted in transit: yes; users can request deletion: yes, with the deletion web link `https://<site>/support/`; no data sold; no data shared with third parties except the payment processor on the website (not in the app). Be accurate.
- **Government, news, health, financial features:** answer No.
- **Device admin / kiosk:** if Play review asks about the `DeviceAdminReceiver`, explain it only allows Lock Task (kiosk) mode on dedicated tablets set up by a parent; or remove it (7.3 note).

### 7.7 Store listing
**Main store listing:** app name (30 characters), short description (80), full description (4,000), **app icon 512×512** PNG, **feature graphic 1024×500**, **phone screenshots** (at least 2) and tablet screenshots. Add category (Books & Reference or Education), email `support@…`, website, and privacy policy URL. For paid-looking wording: do not mention buying or prices if your build has links off.

### 7.8 Closed testing (and the 12-tester rule)
**Test and release > Testing > Closed testing > Create track**, upload the same build, add a testers email list (or Google Group) of **12+ real people**, ask them to **opt in and keep the app installed for 14 continuous days**. Then press **Apply for production** in the Dashboard. Organization accounts: skip this and go to production if the console allows it.

### 7.9 Production and staged rollout
**Production > Create release**, choose the tested build, add release notes, set a **staged rollout** (for example 20%), watch the **Android vitals** and crash reports for a few days, then raise to 100%. Review usually takes from hours to a few days.

---

## 8. After launch
- **Monitor:** Supabase > Logs (Edge Functions, Auth), the admin Dashboard and Email > History. Check `payment_events` after the first real customers.
- **Do not add third-party analytics or crash SDKs** to the app without checking the Kids/Families rules. Use first-party measures (the admin dashboard) instead.
- **Updating the app:** change code, bump `"version"` if users should notice, then `eas build --profile production --platform ios` and `--profile production-android --platform android`, then `eas submit` for each, and submit the new version for review. Android and iOS reviews take days; the website updates in minutes by pushing to Git.
- **Yearly:** renew the Apple Developer Program (US$99) and watch for certificate or API key expiry emails. Rotate Paystack, Resend and Supabase keys at least yearly and whenever a person with access leaves.
- **Support:** answer the Support inbox in the admin (messages from parents and the support email); the "Support message received" email is sent automatically.
- **Store policy changes:** subscribe to Apple Developer news and Play Console policy emails; the payment-link rules in section 0.1 are the likeliest to change.

---

## 9. Master checklist
**Accounts and legal**
- [ ] D-U-N-S number requested
- [ ] Apple Developer (organization) enrolled
- [ ] Google Play Console (organization) verified
- [ ] Domain, support and hello email addresses
- [ ] Privacy policy reviewed by a lawyer and published in the admin
- [ ] Terms of Service and refund statement on the website
- [ ] Account deletion route live (support page now; self-service button recommended)

**Backend**
- [ ] Supabase on Pro; Site URL and redirect URLs set
- [ ] Custom SMTP (Resend) and the three Supabase Auth email templates pasted
- [ ] Secrets set: `PAYSTACK_SECRET_KEY` (rolled key), `WEB_URL`, plan codes, `SUPPORT_EMAIL`
- [ ] Paystack live: plans created, webhook URL set to Genova's function, test payment succeeded
- [ ] Resend domain verified, email activated, test email received
- [ ] First admin created; launch stories published; reviewer account (complimentary Premium) created

**Website**
- [ ] Cloudflare Pages (or Netlify/Vercel) deployed, custom domain on HTTPS
- [ ] `/support/`, `/privacy/`, `/plans/`, sign-up, login, checkout and account checked on a phone
- [ ] Admin locked down (Cloudflare Access recommended)

**App**
- [ ] Final icon, splash, screenshots, feature graphic, descriptions
- [ ] `eas init` done; `EXPO_PUBLIC_WEB_URL` set in EAS; `ascAppId` filled in `eas.json`
- [ ] Preview builds tested on real iPhone and Android (checklist 4.6, kiosk included)
- [ ] iOS: App Store Connect record, privacy labels, age rating, Kids band, review notes, demo account, entitlement request; TestFlight; submitted
- [ ] Android: Play app, content declarations, Data safety, closed test (if required), service account, production rollout

---

## 10. If a store rejects the app
- **"Links out or purchasing" (Apple 1.3 or 3.1.1):** point the reviewer to the parental gate and the reader entitlement; or rebuild with `EXPO_PUBLIC_WEB_LINKS=off`, resubmit, and say so.
- **"Payments" (Google):** rebuild with links off (the `production-android` profile already does this) and remove any text about buying on the website from the listing.
- **"Demo account does not work":** check the complimentary access date in Admin > Subscribers, and that the password was typed correctly.
- **"Privacy / Data safety mismatch":** make the form match what the app collects (email, reader nickname, user ID, reading activity) and the privacy policy text.
- **Rejected for the kiosk/device-admin component:** remove the receiver (see 4.6) and rely on screen pinning.

---

## Sources used
- Apple App Store Review Guidelines (1.3 Kids Category, 5.1.4, 3.1.1, 3.1.3(a), 2.3.6, 2.3.8): [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/); Apple's Kids page: [developer.apple.com/app-store/kids-apps](https://developer.apple.com/app-store/kids-apps/)
- Reader app link-out background: [9to5Mac](https://9to5mac.com/2022/03/30/apple-enables-external-link-support-in-reader-apps/), [Macworld summary](https://www.macworld.com/article/627837/apples-slightly-looser-restrictions-on-reader-apps-are-now-in-effect.html)
- Google Play closed-testing requirement for personal accounts and organization verification: [Google Play help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB), [Android Authority](https://androidauthority.com/google-play-app-testing-requirement-3510580), [Choicely summary](https://www.choicely.com/blog/google-play-12-tester-rule)
- Google alternative billing countries (Nigeria not listed): [Google Play help](https://support.google.com/googleplay/answer/11174377?hl=en); US external content links program: [Google Play help](https://support.google.com/googleplay/android-developer/answer/16470497?hl=en)
- Families policy: [Google Play help](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- Expo submit and EAS: [iOS](https://docs.expo.dev/submit/ios), [Android](https://docs.expo.dev/eas/submit/android/), [eas.json submit](https://docs.expo.dev/submit/eas-json)
- Supabase free-project pausing: [supabase.com/docs/guides/platform/free-project-pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
