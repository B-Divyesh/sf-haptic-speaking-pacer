# Haptic Speaking Pacer (Pace Trail)

Pace Trail is a private rehearsal aid for presenters, teachers, and anyone who
wants a discreet cue when their speaking pace runs fast. It estimates cadence
from microphone energy on the device, sends a tactile nudge after sustained
fast speech, and makes a private post-session pace trail. It never records,
uploads, or transcribes speech.

Live PWA: <https://haptic-speaking-pacer.sociobot.in>

## What v1 includes

- 20-second natural-pace calibration and adjustable 60–240 WPM target band
- live speech-activity and approximate WPM estimates without transcription
- native iPhone haptics through Capacitor, with browser vibration fallback
- private IndexedDB session history, accessible chart tables, JSON/CSV export,
  JSON import, and complete local deletion
- installable, offline-capable PWA with light/dark and reduced-motion support
- optional $7 one-time Full Trail license for unlimited visible history and
  alternate tap patterns; the core pacer, calibration, custom targets, export,
  accessibility, and safety information are free
- unsigned iOS IPA release workflow, plus an operator-enabled signed path

Pace estimates are approximate and are not a clinical speech assessment. Room
noise, microphone placement, accent, and pauses can affect results. Continuous
microphone processing uses battery; it ends when a practice stops.

## Develop and verify

Requires Node.js 22+.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

`npm run build` is the reproducible deploy command. It writes `dist/`, with
`dist/index.html` at the required static root. End-to-end tests use the pinned
Playwright 1.58.2 Chromium binary and cover the 390 px layout, serious/critical
Axe findings, legal pages, settings persistence, atomic import rejection, and
a real offline reload. Run the same suite against the deployed product with
`PLAYWRIGHT_BASE_URL=https://haptic-speaking-pacer.sociobot.in npm run test:e2e`.

## iOS

The native wrapper uses Capacitor 6 and the app identifier
`in.sociobot.haptic_speaking_pacer`.

```sh
npm run cap:sync
```

The macOS GitHub Actions workflow archives without code signing, packages
`haptic-speaking-pacer-unsigned.ipa`, validates its identifier and minimum
size, creates `SHA256SUMS`, and attaches both to release `v0.1.0`. Install the
unsigned IPA with AltStore, Sideloadly, or Xcode. App Store/TestFlight delivery
requires the owner’s Apple Developer credentials. The optional signed workflow
path and required secrets are documented in `.factory/handoff.md`.

## Architecture and privacy

The stack is Vite + strict vanilla TypeScript, the Web Audio API, IndexedDB,
and Capacitor Haptics. Runtime code and assets are self-hosted. There are no
analytics, cookies, ad pixels, external fonts, or third-party runtime CDNs.
Only license purchase/verification contacts the Sociobot billing API. See
[`/privacy`](https://haptic-speaking-pacer.sociobot.in/privacy/) and
[`/terms`](https://haptic-speaking-pacer.sociobot.in/terms/).

The topographic visual rationale and generated-art provenance are in
`.factory/design.md`. Factory verification and known limitations are in
`.factory/handoff.md`.

Production checkout uses the registered Sociobot billing product. License
verification goes through the same-origin managed API, which applies a
20-request-per-minute client limit before forwarding to Sociobot. A staging
checkout can be selected explicitly with `VITE_BILLING_API_BASE`.

## Deploy

Deploy the contents of `dist/` as a static site with independent routes for
`/privacy/` and `/terms/`. Do not deploy `ios/` as web content. The factory
owns infrastructure, DNS, billing registration, and release signing.

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
