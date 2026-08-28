# Handoff — Haptic Speaking Pacer v0.1.0

## What was built

Pace Trail is a finished local-first rehearsal PWA and Capacitor 6 iOS app.
The main workflow is: choose or calibrate a pace band, grant microphone access,
practice without watching the display, receive a native haptic cue after
sustained fast speech, stop, and review the private session trail.

The app includes:

- an on-device energy-pulse pace estimator with no recording, transcription,
  server audio, or retained audio frames;
- 20-second baseline calibration, target range controls, live quiet/slow/
  steady/fast states, cooldown-aware haptics, and clear microphone recovery;
- derived one-second session samples in IndexedDB, result summaries, accessible
  chart alternatives, unlimited JSON/CSV export, JSON import, and clear-all;
- genuinely useful free pacing with a $7 Full Trail one-time unlock for more
  than three visible sessions and two alternate patterns;
- checkout, returned-license capture, once-daily verify caching, offline-first
  optimistic unlock, revoked-license handling, and paste-to-restore against the
  Sociobot billing contract (pilot API by default in staging);
- installable PWA manifest, icon and splash assets, versioned app-shell service
  worker, offline fallback, update notice, network state, and independent
  `/privacy/` and `/terms/` routes;
- topographic-cartography light/dark design, original generated paper-relief
  hero art, deterministic product icon, safe-area layouts, 390 px treatment,
  designed focus, semantic HTML, and reduced-motion behavior;
- Capacitor iOS identifier `in.sociobot.haptic_speaking_pacer`, native Haptics,
  iOS microphone usage disclosure, custom native icon/splash, and version
  `0.1.0` (build 1);
- macOS GitHub Actions workflow that tests/builds/syncs, archives with
  `CODE_SIGNING_ALLOWED=NO`, makes and validates
  `haptic-speaking-pacer-unsigned.ipa`, writes `SHA256SUMS`, and attaches files
  to release `v0.1.0`. A signed path is conditionally available.

## How to run and verify

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Deploy command: `npm run build`

Deploy root: `dist/` (`dist/index.html` exists at that exact root)

iOS sync command: `npm run cap:sync`

Verification completed on 2026-08-28:

- `npm test`: 4/4 unit tests pass (classification, session summary, calibrated
  target boundaries, CSV ownership export).
- `npm run build`: passes TypeScript strict checking and Vite production build.
- `npm run test:e2e`: 4/4 Playwright 1.58.2 Chromium tests pass, including
  390×844, light and dark Axe scans, skip-link keyboard focus, legal routes,
  settings persistence, offline service-worker reload, and denied-microphone
  recovery.
- `/opt/fleet/lib/verify-url.sh`: HTTP 200, load 538 ms on the local preview,
  no console/page errors, title present, `lang=en`, exactly one h1, main
  landmark present, zero missing image alts, and zero unlabeled buttons.
- Lighthouse 12.2.1 mobile/local preview: Performance 100, Accessibility 100,
  Best Practices 100, SEO 92; LCP 1.6 s, CLS 0, TBT 0 ms. Lighthouse 12 no
  longer emits a PWA category.
- Production assets: 42.7 KB application JS + 0.94 KB native web bridge JS,
  16.3 KB CSS, 37.7 KB mobile hero WebP, 95.3 KB desktop hero WebP. No font
  download. All are below the 200/50/120/300 KB budgets.
- `npm audit --omit=dev`: zero runtime vulnerabilities.
- Native plist and Xcode project were inspected locally: identifier is correct,
  marketing version is 0.1.0, build is 1, and the microphone purpose string is
  present. The IPA intentionally is not produced in this Linux worker; the
  workflow validates >1 MB, unzips it, and checks `CFBundleIdentifier` on macOS.

## Needs operator action

1. Register `haptic-speaking-pacer` with the Sociobot billing factory. For the
   production static build set
   `VITE_BILLING_API_BASE=https://api.sociobot.in/api/v1`; staging intentionally
   defaults to `https://pilot-api.sociobot.in/api/v1`.
2. Push tag `v0.1.0` (or manually dispatch “Build iOS IPA”) so GitHub Actions
   creates the release assets. Confirm the landing-page latest-release link and
   `SHA256SUMS` after the first successful run.
3. Unsigned output needs no Apple secrets and can be installed with AltStore,
   Sideloadly, or Xcode. To enable the workflow’s signed App Store Connect path,
   add exactly these GitHub Actions secrets:
   - `APPLE_TEAM_ID`
   - `APPLE_CERTIFICATE_BASE64` (Apple Distribution `.p12`, base64 encoded)
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_PROVISIONING_PROFILE_BASE64` (distribution `.mobileprovision`,
     base64 encoded for `in.sociobot.haptic_speaking_pacer`)
   - `APPLE_PROVISIONING_PROFILE_NAME` (profile name, not UUID)
   - `APPLE_KEYCHAIN_PASSWORD` (ephemeral CI keychain password)
4. App Store/TestFlight submission, review metadata, privacy nutrition labels,
   and final distribution signing require the owner’s Apple Developer account.

## Known gaps and honest constraints

- Capacitor provides an iPhone companion, not a WatchKit target. Haptics occur
  on the iPhone (including while held or pocketed); browser vibration depends
  on browser/device support. A standalone Apple Watch target and phone/watch
  relay are the clearest v1.1 extension, but were not implied by the mandated
  Capacitor-only stack and cannot be claimed here.
- Estimated WPM is intentionally approximate. It infers syllable-like vocal
  energy pulses and cannot distinguish overlapping speakers or reliably work
  in loud rooms. The product makes this limitation visible before and after a
  session and does not position itself as clinical assessment.
- The release download cannot exist until the operator runs the macOS workflow.
  The app points at the stable `releases/latest/download/...` URL that will
  resolve after that release is created.
- A real-device pass remains advisable for microphone sensitivity across phone
  models and the subjective strength of all three native haptic patterns.

## Source and asset provenance

The generated hero source, factory sidecar, exact prompt, review, visual tokens,
and licensing notes are in `assets/src/` and `.factory/design.md`. The shipped
WebPs are optimized derivatives. All icons and contour charts were authored for
this product. No third-party fonts, stock assets, runtime CDNs, or analytics are
used.
