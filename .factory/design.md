# Haptic Speaking Pacer — visual thesis

## Direction: topographic cartography

Speaking pace behaves like terrain: a calm cadence follows a navigable contour,
while acceleration climbs into tightly packed lines. The interface is a field
map for that invisible terrain. Fine contour rules carry real information
(target band, pace samples, session progress); they are never decorative card
filler. The live experience pares down to one large state, one pace reading,
and one stop control so it can be used by touch without watching.

## Palette

The light treatment is a folded field map in warm paper and ink. The dark
treatment becomes a night-navigation chart. Both meet WCAG AA for body copy.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--ground` | `#F1ECDD` | `#101A18` | map paper / night field |
| `--surface` | `#FCF9EF` | `#172522` | raised controls |
| `--ink` | `#172B28` | `#F4F0E4` | primary text (≥ 11:1) |
| `--muted` | `#53635E` | `#B7C2BC` | secondary text (≥ 4.5:1) |
| `--contour` | `#B8AD90` | `#526660` | map rules |
| `--moss` | `#176B52` | `#62D0A5` | actions / in-band |
| `--moss-ink` | `#FFFFFF` | `#0C241C` | action contrast |
| `--ochre` | `#A34F12` | `#F2A65A` | too-fast warning |
| `--danger` | `#9A3434` | `#FF8F89` | errors |

Color never stands alone: every pace state also has a word, a symbol, and a
distinct haptic pattern.

## Type and spacing

Headings use Georgia (the humanist, engraved character of map titles); UI and
body use the native system sans stack for extremely fast, private, offline
delivery. No font files or third-party requests. Numerals use tabular figures.
The type scale is 14 / 16 / 20 / 25 / 39 / clamp(52–82) px. An 8 px spatial
grid governs layout, with 4 px allowed for optical corrections. Text measure
is capped at 68 characters. Touch targets are at least 48 px.

## Interaction grammar and depth

- A target pace is a shaded elevation band. The live marker moves vertically
  through it; “steady”, “slow”, and “fast” remain explicit text labels.
- Primary controls are solid moss lozenges with a small north-arrow notch;
  secondary controls are paper buttons bounded by a one-pixel ink rule.
- Sessions appear as trail entries, not generic floating cards. A contour
  density sparkline shows drift at a glance.
- Setup is progressive: permission rationale → 20 second calibration → chosen
  target. Permission errors stay in context and always offer a retry.
- Focus is a 3 px ochre double-ring, like a marked waypoint.

## Motion policy

State changes use 180–240 ms opacity and transform transitions. A single
waypoint marker eases between pace samples; haptic feedback is the primary
motion-equivalent. There are no ambient loops. With `prefers-reduced-motion`,
transforms and smooth scrolling are removed and state changes are instant.

## Asset plan and prompt sheet

The hero is an original, abstract relief-map still life: layered cut-paper
contours become a calm sound path and a small tactile pulse. It explains the
product without implying transcription or a literal smartwatch UI. App icons
are deterministic hand-authored SVG/PNG derivatives of the contour waypoint.

**Shared art direction:** top-down tactile paper relief map; concentric contour
layers forming a gentle vocal waveform valley; one small emerald waypoint and
subtle pulse rings; warm bone paper, charcoal-green ink, muted clay/ochre;
soft raking morning light; fibrous paper and embossed edges; quiet, precise,
editorial, ample negative space; no people, devices, interface screenshots,
letters, numbers, logos, watermark, gradients, neon, glossy 3D, or medical
symbols.

**Hero prompt:** “Use case: stylized-concept. Asset type: responsive landing
page hero illustration. Primary request: a topographic relief map whose layered
contours subtly become a measured speaking rhythm. Scene: top-down abstract
paper terrain. Subject: a calm valley path with one emerald tactile waypoint
and three faint concentric pulse impressions. Style: handcrafted cut-paper
editorial still life, precise cartographic linework. Composition: landscape,
main relief centered right with breathing room around edges. Lighting: soft
raking morning light. Palette/materials: warm bone paper, charcoal green ink,
muted clay ochre, fibrous paper, embossed edges. Constraints: abstract and
non-medical; no people, no device, no UI, no text, no letters, no numbers, no
logos, no watermark, no gradients, no neon, no glossy 3D.”

## Provenance

The hero is generated for this product with the factory Azure image deployment
(`factory-image`) on 2026-08-28 using the prompt above, then manually reviewed
and resized/encoded locally. It is original project artwork; generated-imagery
disclosure appears in the site footer. Icons and interface contour graphics are
hand-authored for this repository and MIT-licensed with the source.
