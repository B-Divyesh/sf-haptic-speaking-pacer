# Haptic Speaking Pacer

Practice a steady speaking pace with a discreet device cue. It is for
presenters, teachers, and anyone rehearsing clear speech without watching a
screen.

Start with the [sample-data demo](https://haptic-speaking-pacer.sociobot.in/demo).
It opens four populated rehearsals and does not change real sessions or
settings. The live PWA is at <https://haptic-speaking-pacer.sociobot.in>.

## What it does

- sets a 60–240 words-per-minute target band
- shows estimated pace and an accessible session chart
- sends the selected tactile test cue through device vibration when available
- exports all saved sessions as JSON and CSV
- works offline after its first visit
- keeps free-practice browser requests on the product origin

Pace estimates are approximate. Room noise, microphone placement, accent, and
pauses can affect results. This is not a clinical speech assessment.

## License

The free pacer includes calibration, custom targets, export, accessibility,
and safety information. A verified $7 one-time license shows unlimited saved
sessions and alternate tap patterns. Sociobot/Dodo is the merchant of record.
See the [terms](https://haptic-speaking-pacer.sociobot.in/terms/) and
[privacy policy](https://haptic-speaking-pacer.sociobot.in/privacy/).

## Develop and verify

Requires Node.js 22+.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

`npm run build` writes `dist/`. End-to-end tests use pinned Playwright 1.58.2
Chromium. Every visitor-facing product claim is listed in
[`.factory/claims.json`](.factory/claims.json), with an independently runnable
command that begins from the sample-data demo. The sandbox design is documented
in [`.factory/demo.md`](.factory/demo.md).

Run the same browser suite against the deployed product:

```sh
PLAYWRIGHT_BASE_URL=https://haptic-speaking-pacer.sociobot.in npm run test:e2e
```

## iOS

The native wrapper uses Capacitor 6 and the app identifier
`in.sociobot.haptic_speaking_pacer`.

```sh
npm run cap:sync
```

The macOS GitHub Actions workflow packages an unsigned IPA and SHA256SUMS in
the release. Install the unsigned IPA with AltStore, Sideloadly, or Xcode. App
Store and TestFlight delivery require the owner’s Apple Developer account. The
optional signed path is documented in `.factory/handoff.md`.

## Architecture and privacy

The stack is Vite + strict vanilla TypeScript, the Web Audio API, IndexedDB,
and Capacitor Haptics. Runtime code and assets are self-hosted. A license
purchase or verification contacts the Sociobot billing API; free practice does
not make an off-origin request.

The topographic visual rationale and generated-art provenance are in
`.factory/design.md`. Factory verification and known limitations are in
`.factory/handoff.md`.

Production checkout uses the registered Sociobot billing product. License
verification goes through the same-origin managed API. A staging checkout can
be selected explicitly with `VITE_BILLING_API_BASE`.

## Deploy

Deploy `dist/` together with `api/` using `public/staticwebapp.config.json`.
The static site has real `/demo`, `/privacy/`, `/terms/`, `/404`, `robots.txt`,
and `sitemap.xml` routes. Do not deploy `ios/` as web content. The factory owns
infrastructure, DNS, billing registration, and release signing.

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
