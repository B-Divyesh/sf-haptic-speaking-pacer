# Handoff — Haptic Speaking Pacer repair 2

## Release result: repaired and deployed

The implementation deployed to <https://haptic-speaking-pacer.sociobot.in/> is
`f18c61586de3a8541e40d5fbc06c4819810ab3a9` (`fix: keep mobile landing facts
in first screen`). The product repair began in
`f106649e79197e2992f7d01565c53cecdda4f389`; the dedicated `/404` status fix
is `e4a029f9619c717983375b72a2db12f6308585aa`.

Documentation evidence is separately committed as
`96f9476838e10e68cf6be54f68360256efca4fbe` (`docs: add plain language product
audit`). This handoff follows that documentation commit. The deployed static
artifact is unchanged by the later documentation commits.

## What changed

- Added `/demo` and `?demo=1`. The demo ships four named, realistic practice
  sessions with pace charts, target bands, and accessible sample tables.
- Isolated all demo persistence: `demo:pace-settings`, `demo:pace-theme`,
  demo-prefixed license keys, and the `demo:pace-trail` IndexedDB database.
  Demo never reads or writes `pace-trail` or real localStorage keys.
- Added the persistent **Demo — sample data, nothing is saved** banner,
  **Reset demo**, and **Start for real**. Reset restores sample sessions and
  clears demo settings/license state; leaving demo clears its namespace.
- Rewrote the first screen in plain language. It now says the job, names
  presenters and teachers, leads with **Try it with sample data**, explains
  the next screen, and shows three short facts.
- Added `.factory/claims.json`, eight independent demo-based claim checks, and
  `.factory/demo.md`. The checks assert outcomes: isolated storage, seeded
  output, offline reload, request origins, JSON/CSV content, target endpoints,
  device-vibration fallback, and post-verification history access.
- Added `/404` as a true HTTP 404, a designed 404 page, `robots.txt`, and
  `sitemap.xml`. The response override renders the 404 page without converting
  its status to 200.
- Added route-specific metadata, canonical URLs, social metadata, a PWA cache
  version update, and the copy audit/catalog description required by the
  factory contract.

## Verification

Clean setup and local quality gates completed on 2026-09-05:

```sh
npm ci
npm run build
npm test
npm run test:e2e
npm run cap:sync
npm audit --omit=dev --json
```

- Build: passed; main JS is 51.60 kB raw / 17.73 kB gzip and CSS is 18.73 kB
  raw / 5.09 kB gzip.
- Unit/integration tests: 10 passed.
- Browser suite: 15 passed locally and 15 passed against production HTTPS.
  The suite includes Axe serious/critical checks, mobile layout, keyboard skip
  link, import recovery, offline reload, legal pages, demo isolation, demo
  reset, sample output, export content, license restore, and static routes.
- Every command in `.factory/claims.json` was run independently from the
  documented clean setup; all eight passed.
- `npm run cap:sync` passed. It correctly skipped CocoaPods/Xcode work in this
  Linux worker; iOS archive generation remains in the macOS GitHub Action.
- Production dependency audit: 0 vulnerabilities. The full development tree
  still has the pre-existing transitive development-tool advisories reported by
  `npm ci`; they are not production dependencies.

Live verification after the final deployment:

- Fresh desktop and iPhone-sized contexts had no console/page errors or
  horizontal overflow. The job is **Practice a steady speaking pace**; the
  audience is presenters and teachers; the first action is **Try it with
  sample data**. All three facts are visible in the first phone screen.
- `/`, `/demo/`, `/robots.txt`, and `/sitemap.xml` return 200. `/404` and an
  unknown route return a designed page with HTTP 404.
- The demo banner, populated results, Reset demo, and Start for real controls
  were present in both fresh contexts. Offline demo reload passed in a fresh
  browser context after service-worker activation.
- Production headers include CSP, Permissions-Policy, COOP, CORP, Referrer-
  Policy, and `nosniff`.
- The production checkout endpoint returned HTTP 303. The published unsigned
  IPA is 2,623,969 bytes; its checksum and archive integrity passed, and its
  bundle identifier is `in.sociobot.haptic_speaking_pacer`.
- A fresh 100-request license-verification burst observed 53 HTTP 200 and 47
  HTTP 429 responses; every sampled 429 included `Retry-After` (58–60 s).
  The distributed allowance is concurrency-sensitive, but the live boundary
  and retry instruction are present.

## Earlier findings and current disposition

Verification 1 findings remain addressed: production checkout, IPA delivery,
schema-safe import/rendering, response headers, and license gateway rate
limiting were retained and rechecked where externally observable.

Verification 2 findings are all fixed: claims manifest/tests, isolated
one-click sample demo, plain first-screen copy, real 404, `robots.txt`, and
`sitemap.xml` are now present and live.

## Known limits and operator follow-up

- The IPA is intentionally unsigned. Install with AltStore, Sideloadly, or
  Xcode. App Store/TestFlight distribution requires the owner's Apple Developer
  account and signing configuration in the existing GitHub Action.
- The Capacitor companion provides iPhone haptics. A standalone WatchKit
  extension/relay is not in this release.
- Pace estimates remain approximate and are not clinical speech assessment.
  Real-device checks of microphone sensitivity and haptic strength across phone
  models are still worthwhile.
- The paid offer metadata is in `/work/.evidence/billing-offer.json`. It is a
  $7 USD one-time `Full Trail` license for unlimited visible history and
  alternate patterns; the product validates it through the same-origin
  license endpoint. A checkout redirect alone is not treated as entitlement
  proof; the demo regression test verifies the post-validation unlock state.
