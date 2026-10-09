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
node admin-new.cjs      # admin demo mode: access dialog, password help, privacy editor       (needs :8098)
```
Each prints `ok`/`FAIL` per step and `ALL PASSED`. Failures leave a `fail-*.png` in `OUT`.
Stop servers with their PID (`kill %1`), not `pkill -f`.

## Screenshots and the UI PDF
```sh
node mobile-shots2.cjs && node site-shots.cjs && node admin-shots2.cjs     # write PNGs to $OUT (m*, w*, a*)
SHOTS=$OUT python3 build_pdf.py                                            # builds .work/ui-screens.html
HTML=$PWD/.work/ui-screens.html PDF=$PWD/../../docs/Genova_UI_Screens.pdf node print_pdf.cjs
```
Edit the captions and page order at the top of `build_pdf.py`.

## Other tests (no browser)
- `cd web && npm test` (admin data layer; needs `app/node_modules`)
- `cd supabase && node --experimental-strip-types --test tests/support.test.mjs tests/paystack.test.mjs`
- Typecheck: `cd app && npm run typecheck`, `cd web && npm run typecheck`
- SQL rollback tests were run ad hoc through the Supabase SQL tool with `raise exception` at the end of a DO block (so nothing persists) and simulated claims via `set_config('request.jwt.claims', ...)`.
