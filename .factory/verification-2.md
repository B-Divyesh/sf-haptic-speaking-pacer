# Independent verification 2 — FAIL

**Candidate:** `8bb4cd6b10f11ab404577cf8e42174593457181d` (`docs: record repaired release evidence`)  
**Repository / branch:** `B-Divyesh/sf-haptic-speaking-pacer`, `main`  
**Live URL:** <https://haptic-speaking-pacer.sociobot.in/>  
**Date:** 2026-08-28  
**Verdict:** **FAIL** — the current deployment does match the candidate and many technical gates pass, but the required claims contract and the required isolated, one-click sample-data demo are absent. The cold first screen also fails the plain-words acceptance test.

## Required first checks

### Claims tests — release blocker (P0)

`.factory/claims.json` does not exist in this clean checkout. I therefore could not enumerate or run the mandatory claim tests through a demo entry point. A search of the repository found no `@claim:` test tags. This alone is a release-blocking finding under the work order.

The live site and README nevertheless make material claims, including “No audio leaves your device,” “Nothing is recorded or transcribed,” “Works offline after the first visit,” on-device processing, JSON/CSV export, a 20-second baseline, and a $7 one-time unlock. With no manifest, none has the required one-to-one, sandboxed observable test. This is also an unlisted-claims failure.

### First-read test — release blocker (P0)

Fresh cold Chromium at 1440 × 900 showed:

> **Find a pace you can feel.** Rehearse without watching a timer. Pace Trail estimates your speaking rhythm and gives one discreet tap when you run fast.

My first-read interpretation is: it is a private speech-practice pacer that gives a haptic cue when someone talks fast; it seems intended for a person rehearsing, though it does not say presenter, teacher, or another intended user; the apparent first action is **Start a practice** (with **Learn my baseline** as a competing second action). The metaphorical headline does not state the job in plain words, the first-screen sentence does not name who it is for, and there is no visible **Try it with sample data** action. It therefore fails the mandatory what / for whom / what to click first test.

### Demo sandbox — release blocker (P0/P1)

There is no `.factory/demo.md`, `/demo` route, sample dataset, demo banner, Reset demo action, Start for real action, or `demo:` storage namespace. Opening `https://haptic-speaking-pacer.sociobot.in/?demo=1` returns the ordinary app, with no sample/demo/reset control. In a fresh browser, changing the pace control at that URL wrote the normal `localStorage` key `pace-settings`, demonstrating that the nominal demo URL is not isolated from real data. The product cannot be tried in one click without microphone permission and no claims can be tested in the mandated clean demo sandbox.

## Other defects

### P2 — missing real 404, robots.txt, and sitemap.xml

`/not-a-route` and `/404` return the normal landing app with HTTP 200, rather than a styled 404 response. `/robots.txt` and `/sitemap.xml` return HTTP 404. The site-structure contract requires all three.

## What passed

### Clean local gates

- Clean checkout was exactly `8bb4cd6b10f11ab404577cf8e42174593457181d` with a clean worktree before this documentation change.
- `npm ci` completed (157 packages). `npm audit --omit=dev --json` reported **0** production vulnerabilities. The full development install reported 7 transitive advisories (3 moderate, 2 high, 2 critical).
- `npm test` passed: **10 tests / 4 files**. There is no separate lint script; `npm run build` performs `tsc --noEmit` and Vite production build, and passed. `dist/` was produced.
- `npm run test:e2e` passed: **6/6** Playwright 1.58.2 tests. They cover mobile accessibility, invalid/partial JSON import rejection, restore UI, settings persistence, offline reload, and blocked-microphone recovery.
- `npm run cap:sync` passed and copied the built PWA into iOS. On this Linux verifier it correctly warned that CocoaPods and Xcode are unavailable.
- The exact same live suite passed: `PLAYWRIGHT_BASE_URL=https://haptic-speaking-pacer.sociobot.in npm run test:e2e` → **6/6**.

### Live identity, browser, and accessibility

- Fresh build and live response hashes match exactly: `index.html` `4518a4286adb5bca497986027e1946e2fbd90256da96ce8420b78277f4f8632e` and main JavaScript `48fae909b941141b2ae9beeb3f19751933ef9abc6444e379eae1f46aa36a4c67`. The IPA's embedded copies of both files have the same hashes too.
- Cold live desktop made only same-origin requests for the HTML, JS, CSS, icon, and hero art; it produced no console or page errors. This is useful manual evidence, but is not a substitute for the missing claims test.
- Playwright Axe scans on `/`, `/privacy/`, and `/terms/`, at desktop and 390 px mobile with reduced motion, found **zero serious or critical violations**. Each route had one `h1` and one `main`, no horizontal overflow, and no console or page errors. Keyboard Tab focused the skip link; source defines the visible 3 px `:focus-visible` ring. Reduced-motion button transition was `0.01ms`.
- Live offline reload after a successful first load passed in the deployed Playwright suite. This behaviour is still an unlisted claim until it is exercised from the required demo sandbox.

### Privacy, response policy, performance, and rate limiting

- The live HTML has a restrictive same-origin CSP, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Referrer-Policy`, and `X-Content-Type-Options: nosniff`. Hashed JS/CSS use `Cache-Control: public, max-age=31536000, immutable`; `sw.js` and HTML use no-cache. The license endpoint uses `Cache-Control: no-store`.
- CORS on the same-origin license gateway allowed `capacitor://localhost` and did not grant an arbitrary `https://evil.example` origin.
- A fresh 100-request burst at concurrency 10 to `/api/license/verify?license=qa-burst-…` returned **20 × 200 then 80 × 429**. All sampled 429 responses supplied `Retry-After` (49–53 seconds). Observed threshold: **20 requests per approximately 60 seconds**. A smaller concurrent 25-request exploratory burst all returned 200, so this limiting appears to be distributed/concurrency-sensitive; the mandated 100-request burst did enforce the advertised boundary.
- Fresh build assets meet size budgets: main JS 46,069 bytes (16,337 gzip), bridge JS 935 bytes, CSS 16,312 bytes, mobile hero 37,672 bytes, desktop hero 95,340 bytes, and no downloaded fonts.

### IPA and checkout

- The production checkout endpoint returned HTTP 303 to a Dodo hosted checkout.
- The landing-page IPA link resolved. The downloaded unsigned IPA is 2,623,969 bytes; `unzip -t` reported no errors; its SHA-256 is `a3fadc8f1ee3fb3160b3a88b210042eeb1b474e2b0ab445259f7665d3b9fcbda`, matching the release `SHA256SUMS`. Its `Info.plist` contains bundle identifier `in.sociobot.haptic_speaking_pacer`, version `0.1.0`, and microphone usage disclosure. The workflow correctly keeps signed packaging conditional on `APPLE_TEAM_ID`.

## Verification commands

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run cap:sync
PLAYWRIGHT_BASE_URL=https://haptic-speaking-pacer.sociobot.in npm run test:e2e
```

## Required release repairs

1. Add `.factory/claims.json` covering every visitor-facing claim and one independently runnable `@claim:<id>` demo-based test per entry.
2. Add `/demo` or `?demo=1` with realistic shipped sample sessions, a first-screen **Try it with sample data** action, persistent demo banner, Reset demo and Start for real controls, and isolated `demo:` persistence. Document it in `.factory/demo.md`.
3. Rewrite the first screen in plain words to state the speech-pace cue job, its intended user, and the sample-data action. Add the required real 404, `robots.txt`, and `sitemap.xml`.

