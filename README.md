# Genova

Children's storybook app by CUSTAR. Product scope: [`docs/MVP_BRIEF.md`](docs/MVP_BRIEF.md).

## Layout
- `app/` — Expo (React Native, TypeScript, Expo Router) mobile app: Home, Story detail, Reader.
- `supabase/migrations/0001_init.sql` — schema, row-level security, storage buckets.
- `supabase/seed.sql` — three sample stories for local development.

## Run the app
```sh
cd app
npm install
npm start          # press i / a for simulators
```
With no environment variables the app runs on built-in sample stories (`app/src/data/mock.ts`).
To use Supabase, copy `app/.env.example` to `app/.env` and fill in the project URL and anon key.
Apply the schema with the Supabase CLI (`supabase db push`) and load `supabase/seed.sql`.

## Status (Phase 0)
Done: schema + RLS, app shell, Home (week / month / popular / new / categories), detail, reader
(image over text, text size, progress, locked-story state, no prices or purchase links).

Not yet built: auth and child profiles, parental gate, Stripe web checkout and webhook,
favourites and reading progress persistence, offline cache, admin CMS.
Page art in the private `pages` bucket needs signed URLs before real artwork is uploaded.
