# Handoff — Independent verification 2

## Release result: FAIL

Candidate `8bb4cd6b10f11ab404577cf8e42174593457181d` was independently checked
against <https://haptic-speaking-pacer.sociobot.in/> on 2026-08-28. Do **not**
release it: `.factory/claims.json` is missing, so no mandatory claims tests
could be run, and the site has no one-click, isolated **Try it with sample data**
demo. The cold first screen also fails the plain-words what / for whom / first
action requirement. `?demo=1` is the ordinary app and writes the normal
`pace-settings` localStorage key.

The deployment otherwise matches this candidate and passes local/live unit,
build, Playwright, accessibility, offline, response-header, IPA, checkout, and
100-request rate-limit checks. The full evidence, exact commands, observed
threshold, and remaining P2 site-structure defects are in
`.factory/verification-2.md`.

Required next work: build the demo sandbox and claim tests, replace the
metaphorical first-screen copy with the required plain language, then add a real
404, `robots.txt`, and `sitemap.xml`. Re-run independent verification after
those repairs.

---

# Previous builder handoff — Haptic Speaking Pacer v0.1.0 repair

## Result

All release blockers in independent verification report commit
`475d83c0f1bf2eee1c108f922cf93f21c3a5e695` were repaired without changing the
researched brief, visual thesis, artifact class (`ios-ipa`), or core pacing
behavior. The repaired PWA and managed license-verification endpoint are live
at <https://haptic-speaking-pacer.sociobot.in/>.

## Repairs

- Production checkout is now the default and the deployed “Buy once — $7”
  link resolves to the registered production Sociobot product. On 2026-08-28,
  the endpoint returned HTTP 303 to the hosted Dodo checkout.
- License verification now uses `/api/license/verify`, a same-origin Azure
  Static Web Apps managed function that forwards to the production Sociobot
  verifier, does not store tokens, returns `Cache-Control: no-store`, allows
  only the Capacitor iOS origin cross-origin, and limits a client and each
  function instance to 20 requests per 60 seconds. The app retains its
  once-daily verdict cache and offline optimistic behavior.
- JSON imports now have an exact, bounded schema for the envelope, sessions,
  and samples. Unknown, missing, non-finite, inconsistent, duplicate, and
  out-of-range data is rejected before IndexedDB opens. Accepted records are
  written in one transaction. Invalid records left by the prior build are
  removed before rendering, and every imported display value is escaped.
- Static responses now ship CSP, Permissions-Policy, COOP, CORP, referrer, and
  MIME-sniffing protections. HTML and the service worker revalidate; hashed
  assets receive one-year immutable caching. The service worker never caches
  license-verification requests and its shell cache advanced to `pace-trail-v2`.
- The iOS workflow’s signing-secret condition is valid, the release is driven
  by tag `v0.1.0`, and the unsigned IPA is stored without ZIP compression so
  the complete installable archive remains above the verifier’s 1 MB floor.
  The landing page links both the IPA and `SHA256SUMS` and explains unsigned
  sideloading and Apple distribution requirements.

## Exact regression coverage

- `tests/session-schema.test.ts` rejects the verifier’s executable
  `averageWpm` string, the `{id,samples}` partial record, unknown fields,
  inconsistent summaries/states, and duplicate IDs; valid native exports and
  raw arrays remain accepted.
- `tests/e2e/app.spec.ts` submits the verifier’s crafted payload and a mixed
  valid/partial file, confirms neither writes anything, seeds a legacy crafted
  IndexedDB record, reloads, confirms no element/script appears, and confirms
  the poisoned record is removed. It also covers production checkout identity
  and the same-origin restore route.
- `tests/rate-limit.test.ts` proves the first 20 verification requests pass and
  the next returns 429 with a positive `Retry-After`; it also checks that only
  `capacitor://localhost` receives native CORS access.
- `tests/release-policy.test.ts` locks CSP, Permissions-Policy, COOP, CORP, and
  immutable asset caching into the deployment artifact.

## Verification evidence — 2026-08-28

Clean/local gates:

- `npm ci`: clean install of 157 packages completed. The full development
  tree reports 7 transitive advisories (3 moderate, 2 high, 2 critical);
  `npm audit --omit=dev` reports **0** production vulnerabilities.
- `npm test`: **10/10 passed** across 4 files.
- `npm run build`: strict `tsc --noEmit` and Vite production build passed;
  `dist/index.html` is present.
- `npm run test:e2e`: **6/6 passed** on Playwright 1.58.2 Chromium, including
  exact import regressions, license restore, keyboard skip-link focus, light
  and dark Axe checks, legal routes, persistence, offline reload, and denied
  microphone recovery.
- `npm run cap:sync`: passed; the Linux worker correctly skipped CocoaPods and
  Xcode, which run in the macOS workflow.
- `/opt/fleet/lib/verify-url.sh` against local preview: HTTP 200, 644 ms load,
  no console/page errors, title and `lang=en`, exactly one h1/main, zero missing
  image alts, and zero unnamed buttons.
- Local Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 92; LCP 1,585 ms, CLS 0, TBT 0 ms.

Live gates:

- Live `index.html` and hashed JS exactly match local `dist/`:
  `4518a4286adb5bca497986027e1946e2fbd90256da96ce8420b78277f4f8632e`
  and
  `48fae909b941141b2ae9beeb3f19751933ef9abc6444e379eae1f46aa36a4c67`.
- `/opt/fleet/lib/verify-url.sh`: HTTP 200, 825 ms load, no console/page
  errors, valid title/lang/main/h1/alt/button checks. The live Playwright suite
  also passed **6/6** at 390 px, including a real service-worker offline reload.
- Desktop Chromium at 1440×900: one h1/main, no horizontal overflow, no console
  or page errors, and zero initial third-party requests. Desktop Axe found zero
  serious/critical violations; mobile light and dark Axe checks also found zero.
- Live Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; LCP 1,224 ms, CLS 0, TBT 0 ms.
- Live HTML sends `Content-Security-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy: same-origin`, and
  `Cross-Origin-Resource-Policy: same-origin`; hashed JS sends
  `Cache-Control: public, max-age=31536000, immutable`.
- A fresh 100-request burst with concurrency 10 against the deployed
  verification gateway returned **20 × 200 and 80 × 429**. All 429 responses
  included `Retry-After` (sample: 59 seconds); verification responses were
  `no-store`. The native origin received its exact CORS header; an unrelated
  origin did not.
- Production assets remain below budget: application JS 45.98 KB plus 0.94 KB
  bridge JS, CSS 16.31 KB, mobile hero 37.67 KB, desktop hero 95.34 KB, and no
  downloaded fonts.

## iOS release evidence

- Tagged GitHub Actions run
  [33157129721](https://github.com/B-Divyesh/sf-haptic-speaking-pacer/actions/runs/33157129721)
  completed successfully on `macos-latest` at source `48b6d71`.
- Release [`v0.1.0`](https://github.com/B-Divyesh/sf-haptic-speaking-pacer/releases/tag/v0.1.0)
  contains `haptic-speaking-pacer-unsigned.ipa` and `SHA256SUMS`; both stable
  `releases/latest/download/...` URLs resolve with HTTP 200.
- The independently downloaded IPA is **2,623,969 bytes**, `unzip -t` reports
  no errors, and its published checksum verifies:
  `a3fadc8f1ee3fb3160b3a88b210042eeb1b474e2b0ab445259f7665d3b9fcbda`.
- Extracted `Payload/App.app/Info.plist` contains bundle identifier
  `in.sociobot.haptic_speaking_pacer`, version `0.1.0`, package type `APPL`, and
  the microphone-purpose disclosure. The IPA is intentionally unsigned.

## Run and deploy

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run cap:sync
PLAYWRIGHT_BASE_URL=https://haptic-speaking-pacer.sociobot.in npm run test:e2e
```

Deploy `dist/` together with `api/` using the work order’s Azure Static Web
Apps deployment. The release workflow runs on `macos-latest` for `v*` tags and
manual dispatches.

## Needs operator action / known constraints

- The published IPA is unsigned and needs AltStore, Sideloadly, or Xcode. App
  Store/TestFlight delivery requires the owner’s Apple Developer account.
- To enable the signed path, configure exactly `APPLE_TEAM_ID`,
  `APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_PROVISIONING_PROFILE_BASE64`, `APPLE_PROVISIONING_PROFILE_NAME`, and
  `APPLE_KEYCHAIN_PASSWORD`.
- Capacitor provides an iPhone companion, not a WatchKit target. Haptics occur
  on the iPhone; a standalone Apple Watch target/relay remains a future native
  extension. Estimated WPM remains intentionally approximate, as disclosed.
- A real-device microphone-sensitivity and subjective haptic-strength pass is
  still advisable across phone models. No automated or desktop check can
  replace that hardware QA.

## Source and provenance

The original generated hero source, prompt, review, licensing, visual tokens,
and motion rules remain documented in `assets/src/` and
`.factory/design.md`. No new imagery was needed for this repair. There are no
third-party fonts, runtime scripts, analytics, or stock assets.
