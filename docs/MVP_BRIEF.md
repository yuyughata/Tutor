# Genova — MVP Brief (by CUSTAR)

## Context
Genova is a children's storybook app from CUSTAR. CUSTAR writes the first catalogue and will later open it to outside authors. The product grows in three stages: **text storybooks → audio narration → video animation**. The MVP is stage 1 only. Payments happen on the web, so the app works as a "reader" app. The reference mock (StoryNest) supplies the visual language: soft gradients, rounded cards, thumbnail-led browsing, and a clean reader with a text-size control.

The repo (`yuyughata/tutor`) is empty, so this is a greenfield build.

## Decisions confirmed
| Area | Decision |
|---|---|
| Platforms | iOS + Android, React Native (Expo) |
| Audience | Children from first listening to independent reading, grouped by **reading level**, never by age (see below) |
| Access model | Parent account and subscription on the web. Child profiles inside the app. A free sample library is open without signing in. |
| Backend | Supabase (Auth, Postgres, Storage/CDN, RLS) + Paystack (web checkout and subscriptions) |

## Brand
CUSTAR colours drive the UI: purple `#ab46d2` (primary actions), teal `#10a19c` (secondary and success), amber `#ffbe00` (highlights and badges) and charcoal `#232323` (text). Charcoal text is used on teal and amber because white on `#10a19c` is only 3.2:1 contrast. Typeface: Nunito.

## Product goals
1. A child can open the app and be reading a story within 3 taps.
2. Parents can subscribe on the web and have the app unlock automatically.
3. CUSTAR staff can publish a story without an engineer.
4. The data model leaves room for audio and video without a rewrite.

## Users
- **Parent / guardian** (buyer and account owner): subscribes, creates child profiles, sets each reader's reading level.
- **Child** (reader): browses by thumbnail and reads.
- **CUSTAR editor** (internal): creates, schedules and features stories.
- **External author** (post-MVP): submits stories.

Reading levels (drive content filtering and reader typography). Ages are never shown anywhere in the product:
- **Sunrise** (Assisted Reader): a grown-up reads along. Very large type, 1–2 sentences per page.
- **Spark** (Emergent Reader): early readers. Medium type, short paragraphs.
- **Seeker** (Developing Reader): independent readers. Smaller type, longer text, chapters.

## MVP scope

### In scope
**1. Home screen**, adapted from the reference. The thumbnail is the hero for every section:
- Title of the Week: a large featured card.
- Title of the Month: a second featured card.
- Popular: a horizontal carousel, ranked by reads over a rolling 30 days.
- New: a horizontal carousel, newest first.
- Categories chips (e.g. Adventure, Animals, Bedtime, Fantasy), filtered to the child's reading level.
- Header with the child-profile avatar and a search icon.

**2. Story detail screen**
- Cover, title, author ("CUSTAR"), reading level, category tags, page count and reading time, synopsis.
- "Read" button, plus a favourite (heart) toggle.
- Disabled placeholder slots for "Listen" and "Watch", which will light up in later phases.

**3. Reader**
- One page per screen: **full-width illustration on top, text underneath**.
- Swipe or tap for next/previous, with a progress bar and a page counter.
- Text size control (`− / +`, as in the reference), and light/dark/sepia reading themes.
- Resumes from the last page read.
- Last page: "The End" with next-story suggestions.
- The layout is designed so an audio bar and word highlighting can be added later without redesigning the screen.

**4. Library**
- Favourites, Continue Reading, Finished.
- Optional download for offline reading (pages are cached on device).

**5. Accounts and profiles**
- Parent sign-in (email + password and magic link). Child profiles hold a name, an avatar and a reading level, with no personal data collected from children.
- A **parental gate** (a simple adult-level challenge) guards the profile switcher, settings, and any link to the web.

**6. Subscription and access (web-paid)**
- Free tier: a sample set (about 5 stories, to be decided by CUSTAR) readable without an account.
- Premium: the full catalogue. Plans: **Free**, **Paid ₦5,000 per month**, **Paid ₦12,000 per quarter**.
- Grace rule: a subscriber who has not renewed 5 days after the due date moves to Free automatically (enforced in the database, so the app, site and webhook agree).
- The web checkout is built on Paystack: a plan page on the Genova website that starts a Paystack subscription transaction (plans are created in the Paystack dashboard). Billing management links to Paystack's subscription management email flow.
- A Paystack webhook (Supabase Edge Function, HMAC-SHA512 verified, idempotent) writes the `entitlements` row in Supabase, and the app reads it on launch and whenever it returns to the foreground.
- The app shows **no prices or purchase buttons**. Locked titles show a lock icon and a neutral message: "Ask a grown-up to sign in."

**7. Internal CMS** (an admin web page, which can start as Supabase Studio plus a small admin UI)
- Create a story: metadata, upload page images and write page text, reorder pages.
- Set status (draft, scheduled, published), the free flag, and the reading level.
- Curate "Title of the Week" and "Title of the Month" by picking a story and dates.

### Out of scope for the MVP
- Audio narration, video animation, and word-by-word highlighting.
- External author onboarding and royalties.
- In-app purchases and in-app pricing.
- Social features, comments, ads, and any third-party advertising SDKs.
- Gamification, quizzes, and rewards.
- Multi-language content (the schema should allow it).

## Data model (Supabase / Postgres)
- `profiles` (parent): id (= auth user), email, is_admin
- `billing_accounts` (server-only): parent_id, paystack_customer_code, paystack_subscription_code, paystack_email_token
- `payment_events` (server-only): webhook dedupe key, event, payload
- `child_profiles`: id, parent_id, name, avatar, age_band
- `stories`: id, slug, title, synopsis, cover_url, author_id, age_band, status, is_free, page_count, published_at
- `story_pages`: id, story_id, position, image_url, text, *(future: audio_url, audio_timings, video_url)*
- `categories`, `story_categories`
- `authors`: id, name, bio (CUSTAR is the only author at MVP)
- `featured_slots`: id, type (`week`|`month`), story_id, starts_at, ends_at
- `reading_progress`: child_id, story_id, last_page, finished_at
- `favorites`: child_id, story_id
- `read_events`: child_id, story_id, started_at (feeds Popular)
- `entitlements`: parent_id, status, plan, current_period_end (written only by the webhook)

Security:
- RLS on every table.
- Published stories are readable by anyone. Locked stories' pages are readable only with an active entitlement or the free flag. Images sit in private storage behind signed URLs.
- Children never have their own auth accounts. All child data hangs off the parent.

Future media is additive: audio and video fields on `story_pages` and a media bucket, with no migrations that break existing rows.

## Architecture
- **App**: Expo (React Native) + TypeScript, Expo Router, TanStack Query, a local cache for offline reads.
- **Backend**: Supabase Auth, Postgres, Storage/CDN, and Edge Functions for Paystack checkout and the Paystack webhook.
- **Web**: a lightweight site (Next.js or similar) hosting the landing page, plans and checkout, the account page, and the admin CMS.
- **Images**: authored at a fixed ratio (suggest 4:3), served in several sizes.

## Key risks and open items
1. **App-store rules for web-paid kids apps.** Kids Category (Apple) and Google's Families policy restrict external links, purchases, analytics and ads. The "no prices, no buy links, parental gate" approach is the safe default, but the current rules (including any external-link entitlement for reader apps) must be checked before submission.
2. **Children's privacy.** COPPA, GDPR-K, and UK Children's Code apply. No third-party analytics or ad SDKs. First-party, anonymous usage data only. A privacy policy and parent consent flow are needed before launch.
3. **Content pipeline is the real bottleneck.** The app is only as good as the catalogue. Target **15–20 launch stories** across the three reading levels, with illustration production planned in parallel with the build.
4. **The reading range is wide.** Sunrise and Seeker experiences differ a lot. If the budget is tight, consider launching with Sunrise and Spark and adding Seeker after.
5. **Offline reading** adds complexity (cache invalidation, entitlement checks offline). It is the first candidate to cut if the schedule slips.
6. **Illustration style and rights.** Confirm ownership terms for all artwork and text, particularly before opening to external authors.

## Success metrics (first 90 days)
- Activation: ≥ 70% of new profiles open a story in session one.
- Completion: ≥ 50% of started stories are finished.
- Retention: ≥ 30% of child profiles return in week 2.
- Conversion: free-to-paid rate, tracked on the web (target set by CUSTAR).
- Catalogue: ≥ 15 stories published at launch, and a new story each week thereafter.

## Phased roadmap
| Phase | Focus | Contents |
|---|---|---|
| **0 — Foundations** | Setup | Repo, Expo app shell, Supabase project, design tokens and UI kit from the reference, story content template |
| **1 — MVP (text)** | This brief | Home, detail, reader, library, profiles, web subscription, CMS |
| **2 — Audio** | Narration | Per-page audio, audio/text toggle (as in the reference), word highlighting, background playback |
| **3 — Video** | Animation | Animated pages or short clips per story, streaming and caching |
| **4 — Creators** | Platform | External author portal, review workflow, revenue share |

## Suggested MVP build sequence
1. Design system and screens (home, detail, reader) in Figma, based on the reference.
2. Supabase schema, RLS policies, storage buckets, and seed data with 3 sample stories.
3. Expo app: home → detail → reader against seeded data.
4. Auth, parent/child profiles, parental gate.
5. Paystack web checkout, webhook, entitlement gating in the app.
6. Admin CMS and the featured-slot scheduler.
7. Library features, offline cache, polish, accessibility (dynamic type, screen-reader labels, reduced motion).
8. Beta with real families, then store submission.

## Verification (once building starts)
- Seed a story in Supabase, read it end to end on iOS and Android simulators, and confirm that progress resumes.
- Verify that an unsubscribed parent sees locked titles and cannot fetch their page images (RLS and signed URLs). Then subscribe through Paystack test mode and confirm unlock within seconds.
- Confirm that the Title of the Week/Month slots change on schedule.
- Run the parental gate, privacy, and store-policy checklists before TestFlight and Play internal testing.
