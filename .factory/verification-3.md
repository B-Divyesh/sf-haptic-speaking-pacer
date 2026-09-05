# Practice a steady speaking pace — independent verification 3

**Implementation candidate reviewed:** `f18c61586de3a8541e40d5fbc06c4819810ab3a9` (`fix: keep mobile landing facts in first screen`)
**Documentation base reviewed:** `c902cd9b442e38470b8d540ef48f12f208d8f904` (`docs: record repaired release verification`)
**Live URL:** <https://haptic-speaking-pacer.sociobot.in/>
**Date:** 2026-09-05

## Verdict: FAIL

There are four P1 claim-contract findings and four untested or incompletely
tested public claims. All declared commands pass, but that is not sufficient
for a PASS because the demo's stated four results are not all available to a
visitor and several visitor-facing promises have no complete matching claim
test.

## Findings

### P1 — the sample says it opens four rehearsals but only exposes three

`/demo/` seeds four sessions, but an unlicensed fresh visitor sees only three
`.session-list > li` entries. The fourth is hidden by the paid-history lock.
The page still says **“Four saved rehearsals”** and `.factory/claims.json`
states **“The demo opens with four populated speaking pace rehearsals.”**

The declared `@claim:demo-sample-results` test passes only because it checks
the “Four saved rehearsals” heading, one named session, and a count of **3**
visible session entries. It does not prove four accessible sample results.
This is a false and incompletely tested demo claim. Make all four shipped
sample sessions visible in demo mode, or change the public claim to match the
visible result; then assert all four names/results in the claim test.

### P1 — the paid-unlock claim test does not test alternate tap patterns

The `paid-unlock` claim promises a verified $7 license **“reveals all saved
sessions and alternate tap patterns.”** Its test restores a fixture license
and asserts only that four session entries are visible. It never asserts that
the Two taps and Three taps controls become enabled or selectable. The
alternate-pattern part of this public claim is untested.

### P1 — automatic fast-pace cues are a public claim with no claim entry

The landing page says: **“After sustained fast speech, the app sends a tactile
cue.”** `haptic-cue` proves only the manually invoked **Test selected tap**
control. There is no `claims.json` entry or tagged demo test that drives fast
readings through the real practice flow and asserts the automatic cue. This is
an unlisted public claim.

For diagnostic evidence only, a fresh live browser with a controlled local
audio fixture reached **“Over your band”** at 154 WPM and recorded the one-tap
vibration after seven seconds; stopping released the mock media track. That
manual observation does not replace the required declared demo claim test.

### P1 — privacy promises exceed the local-audio-processing claim test

The privacy page promises that raw audio is not **recorded, transcribed,
uploaded, or retained**, and that free use has no analytics, advertising
pixels, third-party fonts, cookies, or tracking scripts. The sole related
claim, `local-audio-processing`, records browser requests during a demo export
and proves same-origin requests only. It does not assert the no-recording,
no-transcription, no-retention, or no-tracking portions of those public
promises. These are unlisted/incompletely tested privacy claims.

## Declared claim commands

All eight commands were run independently after `npm ci` and passed. They are
not marked as failures; the findings above describe gaps between their
assertions and their public wording.

| Claim | Result | Independent observable evidence |
| --- | --- | --- |
| `demo-sandbox` | pass, incomplete | Reset/Start for real preserved a seeded real setting and removed `demo:pace-settings`; it did not resolve the four-results issue. |
| `demo-sample-results` | pass, false/incomplete | Test asserted its current three visible list entries, while the public claim says four. |
| `offline-reload` | pass | A fresh demo context reloaded while offline after service-worker activation. |
| `local-audio-processing` | pass, incomplete | Request log contained only same-origin requests during demo export. |
| `data-export` | pass | JSON had four sessions; CSV had its header plus four rows. |
| `pace-band` | pass | Demo controls persisted both 60 and 240 WPM only under `demo:pace-settings`. |
| `haptic-cue` | pass, incomplete | Browser vibration fixture observed the manual selected-tap cue, not automatic sustained-fast feedback. |
| `paid-unlock` | pass, incomplete | Fixture license exposed session four; alternate tap-pattern controls were not asserted. |

## Quality gates and live checks that passed

```text
npm ci                                      pass (Node 22; full dev audit reports 7 transitive tool advisories)
npm test                                    pass (10 tests)
npm run build                               pass; dist/ produced
npm run test:e2e                            pass (15 tests)
npm run cap:sync                            pass (Linux correctly skipped CocoaPods/Xcode)
npm audit --omit=dev --json                 pass (0 production vulnerabilities)
PLAYWRIGHT_BASE_URL=https://haptic-speaking-pacer.sociobot.in npm run test:e2e
                                             pass (15 tests)
```

- The live HTML, main JS, and CSS SHA-256 values matched this fresh build.
- Fresh desktop (1440 x 900) and iPhone 13 (390 x 664 CSS viewport) browsers
  had no unexpected console/page errors, one `h1`, one `main`, no horizontal
  overflow, and no serious or critical Axe findings on `/`, `/demo/`,
  `/privacy/`, `/terms/`, or the designed `/404` page. The browser's console
  records the expected failed-resource message for an HTTP 404 navigation;
  this is not a defect.
- Before scrolling on phone, the job was **“Practice a steady speaking pace”**
  (116–210 px), the audience was **“For presenters and teachers…”**
  (224–303 px), the action was **“Try it with sample data”** (321–373 px), and
  the three facts ended at 616 px within the 664 px viewport.
- Keyboard smoke checks passed: Tab reached the skip link; the restore dialog
  moved focus to its close button and Escape returned focus to its opener.
  Reduced-motion primary-control duration was `0.00001s`.
- Demo isolation check passed: a real `pace-settings` value of 110–140
  survived entering `?demo=1`, changing the demo setting, Reset demo, and
  Start for real; `demo:pace-settings` was removed on exit. The persistent
  banner was present.
- `/`, `/demo/`, `/privacy/`, `/terms/`, `/robots.txt`, and `/sitemap.xml`
  returned 200. `/404` and an unknown route returned the designed page with
  HTTP 404. Route titles were product-specific. All checked internal and
  linked GitHub artifact URLs returned 200 after redirects.
- Live headers include CSP, Permissions-Policy, COOP, CORP, Referrer-Policy,
  and `nosniff`; hashed JS/CSS are `max-age=31536000, immutable`; the service
  worker is `no-cache`; the license response is `no-store`.
- Checkout returned HTTP 303. The downloaded unsigned IPA was 2,623,969 bytes,
  passed `unzip -t`, matched published SHA-256
  `a3fadc8f1ee3fb3160b3a88b210042eeb1b474e2b0ab445259f7665d3b9fcbda`, and
  contains `in.sociobot.haptic_speaking_pacer`, version `0.1.0`, and the
  microphone disclosure.
- A fresh 100-request live verification burst returned 46 HTTP 200 and 54
  HTTP 429. All 54 429 responses carried a positive `Retry-After`; their
  cache control was `no-store`.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Production checkout used the pilot endpoint | Fixed: production checkout returned HTTP 303. |
| IPA was unavailable | Fixed: the release IPA downloaded, passed integrity, checksum, and plist checks. |
| Import allowed XSS/partial writes | Fixed: current schema and browser test reject crafted and partial records atomically. |
| License verification lacked rate limiting | Fixed: the live burst received 429 responses with `Retry-After`. |
| Security headers and immutable caching were absent | Fixed: live response/header checks passed. |
| No claims manifest or isolated demo | Fixed in structure: manifest, `/demo`, isolated storage, banner, reset, and exit all exist; the four-results claim remains defective. |
| First screen was unclear; crawler files/real 404 missing | Fixed: live first screen met the job/audience/action check, and robots, sitemap, and true styled 404 are present. |

## Required follow-up

1. Repair the four-session demo presentation and its test.
2. Add complete claim coverage for alternate patterns, automatic fast-pace
   feedback, and the stated privacy behavior, or remove/narrow promises that
   cannot be demonstrated in the sandbox.
3. Re-run every declared claim command and independent live QA after a product
   implementation commit and deployment.

The IPA remains intentionally unsigned; Apple signing remains the documented
operator step and is not a verification finding.
