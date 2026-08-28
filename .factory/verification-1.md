# Independent verification 1 — FAIL

**Candidate:** `c239d37e064c341283c757bafcb79fed4caca129` (`docs: record verification and operator handoff`)  
**Repository / branch:** `B-Divyesh/sf-haptic-speaking-pacer`, `main`  
**Live URL tested:** <https://haptic-speaking-pacer.sociobot.in/>  
**Date:** 2026-08-28  
**Verdict:** **FAIL** — the deployment matches the candidate, but release-blocking
purchase, IPA delivery, import security, and API rate-limit requirements fail.

## Release blockers

### P0 — live one-time purchase checkout is not usable

The exact deployed bundle contains the default
`https://pilot-api.sociobot.in/api/v1` billing base rather than the production
Sociobot endpoint. Fresh request evidence:

```text
GET https://pilot-api.sociobot.in/api/v1/products/haptic-speaking-pacer/checkout
→ 404
{"error":"enabled factory product","status":404}
```

The live “Buy once — $7” link therefore cannot complete the advertised
one-time unlock. This also confirms the prior claimed deployment/operator gap
is still present in the actual candidate deployment, not merely a local
configuration issue.

### P0 — required iOS IPA is unavailable

The live install CTA points to:

```text
https://github.com/B-Divyesh/sf-haptic-speaking-pacer/releases/latest/download/haptic-speaking-pacer-unsigned.ipa
→ HTTP 404
```

No IPA could be downloaded, sized (>1 MB), unzipped, or installed. The
repository’s macOS workflow and native project are present, and static source
inspection confirms `in.sociobot.haptic_speaking_pacer`, version `0.1.0` / build
`1`, and an iOS microphone description; that is not a substitute for the
required installable `ios-ipa` artifact.

### P1 — JSON import permits persistent same-origin XSS

`importSessions` only checks that `id` is a string and `samples` is an array.
It then renders imported numeric/session fields through `innerHTML` without
escaping or schema validation. In a clean local browser profile, importing one
session whose `averageWpm` was:

```html
<img src=x onerror="window.__qaXss=1">
```

reported “Imported 1 session.” The injected image was present after reload and
`window.__qaXss === true`. This can read the app’s local storage/IndexedDB,
including an optimistic license token, and make outbound requests. Absence of a
live CSP compounds the impact.

Malformed structural input also reaches IndexedDB before later code rejects it:
`{"sessions":[{"id":"only-id-and-samples","samples":[]}]}`. It is not
validly handled as an atomic rejected import, risking a poisoned local session
store.

### P1 — license verification endpoint has no observed rate limit

The user-facing verify endpoint exists:

```text
GET https://pilot-api.sociobot.in/api/v1/products/haptic-speaking-pacer/verify?license=qa-invalid-token
→ 200 {"expires_at":null,"reason":"invalid","valid":false}
```

A fresh burst of 100 invalid-token requests, 10 concurrent, produced **100 ×
HTTP 200**. No request returned `429`, and no `Retry-After` header was present.
The observed threshold is therefore **greater than 100 requests** (not
acceptable under the work order’s mandatory rate-limit check).

## Additional defects

### P2 — production security and cache response policy is incomplete

The live HTML and hashed JS response include HSTS, `nosniff`, and a referrer
policy, but neither includes `Content-Security-Policy`, `Permissions-Policy`,
COOP, nor CORP. All tested HTML and hashed asset responses use
`Cache-Control: public, must-revalidate, max-age=30`; hashed static assets are
not served with long-lived immutable caching.

## What passed

### Clean checkout, tests, and build

- Checkout was clean at the requested candidate before verification. `npm ci`
  completed. `npm audit` reported 7 total dependency
  advisories in the full tree (3 moderate, 2 high, 2 critical); the production
  dependency audit (`npm audit --omit=dev`) reported zero.
- `npm test`: **4/4** Vitest tests passed.
- `npm run build`: passed TypeScript `--noEmit` and Vite production build.
- `npm run test:e2e`: **4/4** Playwright 1.58.2 Chromium tests passed.
- The exact production build is `dist/`; main JS is 42,738 bytes raw plus a
  935-byte haptics bridge, CSS 16,312 bytes, mobile hero 37,672 bytes, desktop
  hero 95,340 bytes, with no downloaded fonts. All are within the stated
  static budgets.

### Live/candidate identity and browser QA

- SHA-256 of live `index.html`, `app-B3i93jAm.js`, and `app-V1J_1U3i.css`
  exactly matched this fresh build. The deployment is current candidate code.
- Live `/`, `/privacy/`, `/terms/`, and `/sw.js` each returned HTTP 200.
- Fresh Chromium runs at 1440×900 and 390×844, in both local preview and the
  live deployment, had one `h1`, one `main`, no horizontal mobile overflow,
  no console errors, no page errors, and no automatic third-party requests.
  Initial free use made no outbound request.
- Axe scans had **zero serious or critical violations** in each tested
  desktop/mobile configuration. Keyboard Tab focused the visible skip link;
  the defined focus ring is 3px. With reduced motion, a sampled button
  transition was `0.01ms` and no overflow occurred.
- Visual review of desktop and 390px mobile found the primary action and
  privacy disclosure visible; mobile stacks intentionally and remains
  readable. Light/dark theme, legal pages, and target-band persistence passed.
- Boundary target bands 60–75 and 210–240 WPM held the 15-WPM minimum. A
  syntactically invalid JSON import displayed its recovery message.
- With a controlled fake microphone/audio graph, practice entered the live
  “Right on the trail” state, showed the active/no-recording disclosure,
  stopped its media track, and produced a result screen without errors. The
  repository’s denied-microphone recovery test also passed.

### Privacy, PWA, and performance

- Static/runtime review found no analytics, cookies set by the app, runtime
  CDN/font request, recording, transcription, or audio upload. Microphone
  requests are audio-only. Derived sessions use IndexedDB and settings use
  localStorage; export/import and clear controls are present.
- A first-load service-worker check followed by offline reload passed: the
  home shell rendered and the offline status strip appeared. Source inspection
  confirms versioned cache cleanup, `clients.claim()`, and an update listener
  that posts `SKIP_WAITING`; an actual deployed-revision update could not be
  induced without changing the candidate response.
- Local Lighthouse 13.4.1 (mobile preset) scored Performance **100**,
  Accessibility **100**, SEO **92**; LCP 1,656 ms, CLS 0, TBT 0 ms.

## Required remediation before a re-verification

1. Deploy a production build configured for the registered production Sociobot
   product; verify the checkout redirects and a restore/verify path works.
2. Run the macOS release workflow, publish the unsigned IPA and SHA256SUMS,
   then make the landing-page download resolve and verify the archive.
3. Strictly schema-validate imports before any write, reject unknown/invalid
   fields atomically, and render all user-imported values as text/escaped
   values (not interpolated HTML). Add regression tests for XSS and malformed
   input persistence.
4. Apply server-side verification rate limiting that returns 429 plus
   `Retry-After`; retest and record the threshold.
5. Add an appropriate CSP/Permissions-Policy and immutable caching for hashed
   assets.
