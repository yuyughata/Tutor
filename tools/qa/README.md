# QA tooling (browser tests, screenshots, PDF)

These scripts test the **real app, website and admin code** in a headless browser against a **fake Supabase backend** (`mockbackend.cjs`)
that speaks Supabase's real wire format (auth, REST, RPC, storage, functions). They need no internet, no Supabase project and no Paystack.
They were written because the original build sandbox could not reach `*.supabase.co`. They do **not** replace a smoke test on the live project.

## One-time setup
```sh
cd tools/qa && npm install                 # axe-core + playwright
npx playwright install chromium            # or set CHROME=/path/to/chrome
cd ../../app && npm install
cd ../web && npm install
```
Variables used by the scripts: `PW` (path to the playwright package, e.g. `$PWD/node_modules/playwright`), `AXE` (path to `axe-core/axe.min.js`),
`OUT` (folder for screenshots), `SBUMD` (supabase-js UMD file, `web/node_modules/@supabase/supabase-js/dist/umd/supabase.js`), `CHROME` (optional browser path).

## Serve what is being tested
```sh
# App web export (point it at the fake backend host the mock expects)
cd app && EXPO_PUBLIC_SUPABASE_URL=https://mock.supabase.test EXPO_PUBLIC_SUPABASE_ANON_KEY=anon EXPO_PUBLIC_WEB_URL=https://genova.test \
  npx expo export -p web --clear --output-dir ../tools/qa/.work/app
node tools/qa/spa.cjs tools/qa/.work/app 8097 &       # SPA server with index fallback

# Website (uses the real project URL baked into web/lib/config.ts; the mock is installed on that host)
cd web && npm run build && node ../tools/qa/spa.cjs out 8096 &

# Admin (static files)
cd web && npx http-server public -p 8098 -c-1 &
```

## Run
```sh
cd tools/qa
export PW=$PWD/node_modules/playwright AXE=$PWD/node_modules/axe-core/axe.min.js SBUMD=$PWD/../../web/node_modules/@supabase/supabase-js/dist/umd/supabase.js OUT=$PWD/.work/out
mkdir -p $OUT
node app-e2e.cjs        # app: levels, sign-in, forgot password, privacy, offline, axe audits  (needs :8097)
node site-e2e.cjs       # website: plans, checkout, account, badge, grace state, admin gate, axe audits (needs :8096)
node reader-e2e.cjs     # app reader: chapters, Word Explorer, long page text scrolls, stats (needs :8097)
node landing-single.cjs # single-file landing page docs/Genova_Landing_Page.html (build it first: node ../site/build_landing.mjs)
node admin-new.cjs      # admin demo mode: access dialog, password help, privacy editor, chapters + words editor, Readers leaderboard + award (needs :8098)
```
Each prints `ok`/`FAIL` per step and `ALL PASSED`. Failures leave a `fail-*.png` in `OUT`.
Stop servers with their PID (`kill %1`), not `pkill -f`.

## Screenshots and the UI PDF
Serve the app export (:8097), the website export `web/out` (:8096) and the admin (`http-server public` on :8098) as above, then:
```sh
export PW=... AXE=... OUT=$PWD/.work/shots QA_ART_DIR=$PWD/.work/art
mkdir -p $OUT && node make_art.cjs                      # friendly sample cover/page artwork for the fake backend (optional)
node mobile-shots2.cjs && node mobile-shots3.cjs        # app screens (Spark reader, then Seeker: chapters, words, badges, rewards)
node site-shots.cjs && node landing-shots.cjs           # website pages, landing sections and phone shots
node admin-shots2.cjs                                   # admin screens (demo mode)
SHOTS=$OUT python3 build_pdf.py                         # -> .work/ui-screens.html (cuts tall shots into page-sized slices)
HTML=$PWD/.work/ui-screens.html node check_pdf_layout.cjs   # fails if anything spills off a page
HTML=$PWD/.work/ui-screens.html PDF=$PWD/../../docs/Genova_UI_Screens.pdf node print_pdf.cjs
```
The PDF is compressed by default (JPEG, screen-resolution images, about 7.5 MB); `COMPRESS=0 SHOTS=$OUT python3 build_pdf.py` makes a lossless version (about 28 MB). Edit captions and page order at the top of `build_pdf.py`. Layout rules: up to 4 phones per page (a bigger group continues on the next page), website and landing shots two per page in slices, admin shots wide with tall ones continued over pages.
