---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 10
subsystem: render
tags: [d4-16, d4-14, bands, linear-gradient, referenced-ids, export-firewall, a7, png-pixels]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-01`'s `rect[data-layer=\"surface\"]` — the inline-attribute technique, `WATER_PRESETS`, and `settings.surfaceColor` as creator-controlled state"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-09`'s layer ordering, its `data-editor-only` highlight layer, and its measured lesson that an editor-only element painted only from CSS makes its own removal gate unable to fail"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-07`'s shared `.panel-*` vocabulary in `editor.css`"
provides:
  - "`src/utils/bands.ts` — `BAND_MAX_HEIGHT` (derived 154), `BAND_DEFAULT_HEIGHT` (derived 120), `BAND_KEYBOARD_STEP`, `clampBandHeight`, `bandGradientStops`, `resolveBandExtents`"
  - "`defs[data-layer=\"paint\"]` — two `<linearGradient>`s with INLINE LITERAL stops derived from `settings.surfaceColor`, ids kept alive by `fill=\"url(#…)\"`"
  - "`g[data-layer=\"bands\"]` — edge-anchored rects OUTSIDE the camera, before the legend (U-8)"
  - "`g[data-layer=\"band-handles\"]` — `data-editor-only`, `role=\"slider\"`, 88-unit hit area, arrows ±8, Home/End"
  - "Four `VisibleCompositionSettings` fields: `topBandVisible` (true), `topBandHeight` (120), `bottomBandVisible` (false), `bottomBandHeight` (120), all clamped at the reducer"
  - "`MapStylePanel` § `Bands` — two toggles and two `tabular-nums` readouts, zero new pill classes"
  - "`export.spec.ts` `describe(\"band\")` ×2, and three new `export.test.ts` clone assertions"
  - "The reference-aware id gate that replaced `clone.ids === 0` in BOTH `export.spec.ts` and `fixtures/export.html`"
affects: [04-11, 04-12, 04-13, 04-14, 04-16]

actuals:
  tokens: 25000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A referenced `id` is PAINT; a gate asserting `clone.ids === 0` confirms the break it exists to catch. Assert unreferenced-ids, dangling-references, AND non-vacuity"
    - "Removal and inversion are TWO failure modes and need two probes; the presence probe must run FIRST or a deleted band reports an inversion"
    - "A probe pair is only independent if one stays GREEN through the other's mutation — measured, not argued"
    - "A layer whose colour equals the surface colour is invisible over the surface BY DESIGN, so its pixel gate needs a column that crosses something else AND an assertion that it does"
    - "A CSS-pixel target is not a viewBox user unit; derive the unit count from the scale at the SMALLEST targeted canvas rather than reaching for a resize observer the contract forbids"

key-files:
  created:
    - src/utils/bands.ts
    - src/utils/bands.test.ts
  modified:
    - src/types/composition.ts
    - src/constants/mapStyle.ts
    - src/constants/colors.ts
    - src/providers/CompositionStateProvider.tsx
    - src/components/MapCanvas.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapStylePanel.tsx
    - src/App.tsx
    - src/styles/MapCanvas.css
    - src/styles/controls/mapStyle.css
    - src/styles/editor.css
    - src/styles/uiContract.test.ts
    - src/utils/export.test.ts
    - tests/e2e/export.spec.ts
    - tests/e2e/fixtures/export.html
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/export.md

key-decisions:
  - "The band gate uses a non-white surface AND a land-crossing column, because MEASUREMENT showed either alone is insufficient: over open water a `Warm paper` band reads 239.626 with the band on and 239.626 with it off"
  - "The gate covers BOTH bands. The plan asked for three samples inside the TOP band's extent; that band spans 80-85 N at the default camera, which is open Arctic Ocean at almost every meridian. The top-band gate was kept (Ellesmere, spread 3.490) and a bottom-band gate ADDED over Antarctica (spread 7.481, continental at every longitude sampled)"
  - "The presence probe runs BEFORE the ordering probe. With it second, deleting the band flattened the column and the ORDERING assertion spoke — reporting an inversion for a removal, one mutation reddening a claim it is not about"
  - "The plan's inversion mutation ('swap the two gradient stops') produces a REMOVAL, not an inversion: SVG clamps a descending stop offset to the preceding one, so the whole gradient went to opacity 0. The real inversion swaps the OPACITIES with offsets kept ascending"
  - "`clone.ids === 0` was REPLACED in the spec and the fixture, not re-baselined. `coding-rules/export.md` already said that assertion confirms the break; the band gradients are the first referenced ids the product ships, so it finally bit"
  - "`04-09`'s four-corner land/water discrimination MOVED past `BAND_MAX_HEIGHT` rather than being re-baselined: the top band paints the surface colour at full opacity along y=0, so those corners measured the band"
  - "The handle's hit area is 88 user units, derived as 44 / 0.5 at the 540px canvas floor. Sizing it from the rendered scale needs a resize observer inside `MapCanvas`, and `uiContract.test.ts` keeps that class of observer out of that file. Adding `MapCanvas.tsx` to the owner list was considered and REFUSED — that file is the one the invariant is about"
  - "Arrow keys move the VALUE, not the handle's position (`role=\"slider\"` semantics), so the top and bottom handles agree about which way is bigger and the announcement matches the behaviour"
  - "`BAND_FALLBACK_STOP_COLOR` is declared in `bands.ts` rather than imported from `constants/mapStyle.ts`, because that module imports `BAND_DEFAULT_HEIGHT` and the reverse edge would be a cycle. `bands.test.ts` imports both and asserts them equal, so the duplication is a checked claim"

requirements-completed: [D4-16, D4-14]

coverage:
  - id: D1
    description: "A band is two `<rect>`s filled from `<linearGradient>`s with `stop-opacity` fading 1 to 0, vertical, anchored to the square's top and bottom edges"
    requirement: "D4-16"
    verification:
      - kind: unit
        ref: "bands.test.ts#fades the surface colour from fully opaque to fully transparent"
        status: pass
      - kind: unit
        ref: "export.test.ts#carries the inline literal stops, opaque to transparent, into the clone"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#band › fade from the creator water colour, anchored to their own edges (installed Chrome 151.0.7922.76)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The band's colour is derived from `settings.surfaceColor` and written as an inline literal `stop-color` — not a host `var()`, not a subtree `<style>`"
    requirement: "D4-16"
    verification:
      - kind: unit
        ref: "bands.test.ts#returns the canonical uppercase form in BOTH stops"
        status: pass
      - kind: other
        ref: "grep -cE 'stop-color=\"var\\(|stopColor=\\{?`?var\\(' src/components/MapCanvas.tsx — 0"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#band › the near sample moves towards the creator's water at 239.626, from land at 230.864"
        status: pass
    human_judgment: false
  - id: D3
    description: "The gradient ids are referenced by `fill=\"url(#...)\"`, so `collectReferencedIds` keeps them and the sanitizer does not silently take the gradient with the id"
    requirement: "D4-16"
    verification:
      - kind: unit
        ref: "export.test.ts#keeps both gradient ids alive because the band rects reference them"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#the captured clone keeps wrapped geography and drops duplicate semantics (unreferencedIds [], danglingReferences [], ids 1)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Top band ON by default, bottom band OFF; default height `MAP_VIEWBOX_SIZE / 9` = 120; cap `Math.floor(MAP_VIEWBOX_SIZE / 7)` = 154 written as the derivation; a request above the cap clamps"
    requirement: "D4-16"
    verification:
      - kind: unit
        ref: "bands.test.ts#caps a band at one seventh of the square / defaults a band to one ninth"
        status: pass
      - kind: unit
        ref: "bands.test.ts#clamps a request for one fifth of the square down to the cap (asserted against the literal 154)"
        status: pass
      - kind: unit
        ref: "bands.test.ts#derives both from the viewBox rather than from a pasted 1080"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#band › a request past the cap is CLAMPED, not accepted"
        status: pass
    human_judgment: false
  - id: D5
    description: "The band layer sits OUTSIDE `[data-layer=\"camera\"]`, so it does not pan or zoom with the map, and before the legend (U-8)"
    requirement: "D4-16"
    verification:
      - kind: unit
        ref: "export.test.ts#keeps the composition preserved (clone layer order [null, surface, paint, camera, bands, legend])"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#the captured clone keeps wrapped geography (same layer order on the real fixture)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The PNG band gate fails on removal AND on inversion, via two probes neither of which proves the other, plus a bands-off flat control"
    requirement: "D4-16"
    verification:
      - kind: e2e
        ref: "export.spec.ts#band › presence probe (removal), ordering probe (inversion), flat control — RED-proved on all three, see § RED Proofs"
        status: pass
    human_judgment: false
  - id: D7
    description: "The band gate uses a non-white surface AND a sample column crossing land, and asserts its own samples are land"
    requirement: "D4-16"
    verification:
      - kind: e2e
        ref: "export.spec.ts#band › the preset is looked up in WATER_PRESETS and asserted not to be DEFAULT_SURFACE_COLOR; each sample's bands-off value asserted equal to the uncoloured fill"
        status: pass
    human_judgment: false
  - id: D8
    description: "Band drag handles carry `data-editor-only`, a 44px hit area, and keyboard equivalents — arrows ±8, Home and End to min and max (A7)"
    requirement: "D4-14"
    verification:
      - kind: unit
        ref: "export.test.ts#removes the band drag handles, so an affordance cannot reach the PNG"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#band › resize handles are keyboard-operable and meet the 44px target (58.67 x 58.67 CSS px at 1280x720)"
        status: pass
    human_judgment: false
  - id: D9
    description: "Band height is exposed for `04-12`/`04-13` to read rather than duplicate"
    requirement: "D4-16"
    verification:
      - kind: unit
        ref: "bands.test.ts#resolveBandExtents ×3 — the ONE reader of visibility + height, consumed by MapCanvas today and by 04-12's legend inset next"
        status: pass
    human_judgment: false

status: complete
---

# Phase 4 Plan 10: The Title and Footer Gradient Bands Summary

**Overlaid type has something to sit on, and the gate that proves it can tell a missing band from an
upside-down one.** Two edge-anchored rects fade from the creator's own water colour to transparent,
serialized into the PNG as inline literal gradient stops whose ids survive sanitisation only because
the rects reference them. The measured trap the whole plan turns on: a band fading from the surface
colour is **invisible over the surface**, so a gate that samples open water measures nothing and
passes — this one samples land, on a non-white surface, and says so.

## Performance

| Gate | Before | After |
|---|---|---|
| Unit (Vitest, `node`) | 770 / 770, 45 files | **791 / 791**, 46 files |
| Playwright (installed Chrome **151.0.7922.76**) | 124 / 124 | **126 / 126** |
| `npm run lint` | clean | clean |
| `npm run build` (`tsc -b && vite build`) | clean | clean |
| `npm run data:world:check` | PASS | PASS (248 / 195 / 207; mesh 327 geometries) |
| Selector inventory | 332 | **335** (+2 handle, +1 readout — see below) |
| Bundle `index.js` | 686.09 kB (297.14 kB gz) | 693.05 kB (298.91 kB gz) |
| New npm packages | — | **ZERO**; `package.json` and `package-lock.json` untouched |

## ⚠ What this plan does NOT claim

- **Nobody opened the exported PNG and looked at it.** Every gate here proves that *specific sampled
  pixels carry specific values in a specific order*. That is narrower than "the band looks right";
  the cartographic-resemblance review is owned by **`04-16`**.
- **No Phase 3 UAT cell is cited.** Nine of its twelve were never performed; skipped is not passed.
- **Installed Chrome 151.0.7922.76 only.** Chrome auto-updated earlier in this phase (`.75` → `.76`);
  every number below was taken on `.76`. **Edge is not installed on this machine**, so no Edge,
  Firefox, or Safari result exists or may be cited.
- **The 44px claim is a Playwright bounding-box read at 1280 × 720, not a physical touch-target
  check.** A4's ⛔ physical cell is a different claim and is not inherited or satisfied here.
- **No dark-theme review, no screen-reader pass, no physical 200 % zoom** was performed on the
  `Bands` section or the on-canvas handles. The handle is `role="slider"` with `aria-valuenow` /
  `min` / `max` as *attributes*; that they read sensibly aloud is A9 and was not performed.
- **No claim about band-versus-legend overlap ordering at a forced overlap.** That is `04-11`'s
  held-out backstop, where bands, legend, and text all exist.
- **No claim that the bands survive a save/load round trip.** They are not persisted — see
  Known Stubs.

## What shipped

### Task 1 — the band geometry module (`cfe80b6`)

`src/utils/bands.ts` holds the cap and the default as **derivations**: `BAND_MAX_HEIGHT =
Math.floor(MAP_VIEWBOX_SIZE / 7)` and `BAND_DEFAULT_HEIGHT = MAP_VIEWBOX_SIZE / 9`, with the
arithmetic in the doc comment in the style `LEGEND_CHARACTERS_PER_LINE` already uses. The tests
assert the **literals** 154 and 120, and `grep -cE "Math\.floor\(.*7\)" src/utils/bands.test.ts`
returns **0** — the expected value is never an expression that recomputes the thing under test.

A third assertion closes the gap the two literals leave open: `BAND_MAX_HEIGHT * 7 <=
MAP_VIEWBOX_SIZE < (BAND_MAX_HEIGHT + 1) * 7` and `BAND_DEFAULT_HEIGHT * 9 === MAP_VIEWBOX_SIZE`, so
a module that hard-coded 154 and 120 and never read the viewBox fails.

`resolveBandExtents` is the **one reader** of `visible ? height : 0`. `MapCanvas` places the rects
from it; `04-12`'s band-aware legend inset consumes it instead of re-deriving it.

### Task 2 — the serialized layers (`fac55cd`)

`defs[data-layer="paint"]` sits between the surface rect and the camera, holding two
`<linearGradient>`s. They share **one** stop pair from `bandGradientStops(settings.surfaceColor)`;
what aims each band at its own edge is the gradient's `y1`/`y2` vector, so an inversion is a change
to that vector rather than a second set of stops that can drift out of step with the first.

`g[data-layer="bands"]` is outside the camera and before the legend. `g[data-layer="band-handles"]`
sits after the legend, carries `data-editor-only`, and is rendered only when there is a writer to
call — a read-only composition (the export fixture) has nothing to drag.

### Task 3 — the controls and the gate (`ac64c87`)

`MapStylePanel` § `Bands`: two toggles, two `tabular-nums` readouts, and a hint line. **Zero new
pill classes** — `editor.css`'s `.panel-pill input[type="radio"]` was **widened** to
`.panel-pill input` rather than gaining a `[type="checkbox"]` copy beside it, which is the
duplicated-pill defect `04-UI-SPEC.md § 11` rule 1 names by name. Net selector cost: zero.

## Measured numbers

All taken in installed Chrome **151.0.7922.76** at the default world camera, water set to
`Warm paper` (`#F5EFE6`), uncoloured land at `#E5E7EB`. Luminance is Rec. 709 on the 0–255 scale.

| Measurement | Value |
|---|---|
| Water (`#F5EFE6`) luminance | **239.626** |
| Uncoloured land (`#E5E7EB`) luminance | **230.864** |
| **Top band**, x = meridian −73.3° (Ellesmere), y 66 / 90 / 114 | **234.281 / 233.000 / 230.791** |
| **Bottom band**, x = meridian 0° (Queen Maud Land), y 1070 / 1020 / 970 | **238.485 / 235.209 / 231.004** |
| Bands OFF, both columns, all six rows | **230.864** at every one |
| Measured flat-control disagreement | **0.000** |
| Near-to-far span: top / bottom | **3.490** / **7.481** |
| Smallest adjacent step seen | **1.281** (top band, near→mid) |
| Presence sum (Σ\|on − off\|): top / bottom | **5.626** / **12.106** |
| Presence sum under the INVERSION mutation, top | **18.946** (3.4× the right-way-up value) |
| Whole-frame ink, bands on / bands off (`DARK_INK_THRESHOLD` 100) | **8,400 / 8,400** |
| Handle box at 1280 × 720, at 44 user units | **58.67 × 29.33 CSS px** |
| Handle box at 1280 × 720, at 88 user units | **58.67 × 58.67 CSS px** |
| Pacific fixture, band-free rows: y 180 / y 920 | land / water at both edges |

### The derived thresholds

| Constant | Value | Derivation |
|---|---|---|
| `MIN_BAND_DELTA` | **1.5** | under half the *smaller* measured near-to-far span (3.490) |
| `MIN_BAND_PRESENCE` | **2.5** | under half the *smaller* measured presence sum (5.626) |
| `NOISE_FLOOR` | **0.25** | a quarter of one 8-bit level, against a measured disagreement of **0.000** and 5.1× below the smallest real step (1.281) |

Not guessed, and deliberately not tight: this repository has shipped a `<= 1px` tolerance that
passed against its own 1px probe when the real disagreement was 6e-14. The real disagreement here is
zero, and 0.25 is what stops the gate flapping on a future anti-aliasing change without letting a
1.281 signal through.

## The two probes, and why they are two

A gradient band is exactly the subject where a naive gate goes green on a wrong result. "Band pixels
are lighter" is satisfied by an upside-down band, because *some* band pixels are still lighter.

| Probe | Asserts | Removal | Inversion |
|---|---|---|---|
| **presence** (runs first) | Σ\|on − off\| across the three rows > 2.5 | **RED** (0.000) | green (18.946) |
| **ordering** (runs second) | near > mid > far pairwise, plus near−far > 1.5 | RED | **RED** |

**Independence is measured, not argued.** The inversion RED proof left the presence probe green at
**18.946** — recorded by scaffolding the assertion to print. The two are demonstrably separate
claims and not one claim written twice.

**Order is load-bearing, and it was wrong first.** With presence second, the removal proof reddened
the *ordering* assertion, whose message reads *"the band is upside down in the exported PNG"* — one
mutation reddening a claim it is not about, and the exact shape this phase keeps hitting. Presence
was moved ahead of ordering so each message names its own failure mode. That reorder is the reason
RED proof 2 below reads the way it does.

## RED Proofs

Every mutation was made in place after copying the file to
`/private/tmp/claude-501/.../scratchpad`, and restored by **copying back** — never
`git checkout --`. `git status` was clean of source modifications after each.

### 1 — the clamp (unit), Task 1's required proof

**Subject:** `src/utils/bands.ts`, `clampBandHeight` reduced to `return requested;`.
**Command:** `npx vitest run src/utils/bands.test.ts` → **4 failed | 14 passed**.

```
FAIL  clampBandHeight > clamps a request for one fifth of the square down to the cap
AssertionError: expected 216 to be 154 // Object.is equality
FAIL  clampBandHeight > floors a negative request at zero
AssertionError: expected -40 to be +0 // Object.is equality
FAIL  clampBandHeight > returns the default for a non-finite request
AssertionError: expected NaN to be 120 // Object.is equality
FAIL  resolveBandExtents > clamps through the same cap the drag handle obeys
AssertionError: expected { top: 400, bottom: -12 } to strictly equal { top: 154, bottom: +0 }
```

Restored; `git status --short` showed only the two new untracked files.

### 2 — REMOVAL (PNG)

**Subject:** `src/components/MapCanvas.tsx`, both band `<rect>`s deleted from
`g[data-layer="bands"]`.

```
Error: top band: the column moved 0.000 away from the bands-off control against a floor of 2.5.
The band did not reach the exported PNG at all.
  Expected: > 2.5
  Received:   0
```

The **presence** probe, naming its own failure. The A7 test reddened in the same run
(`rect[data-band="top"]` no longer exists), which is correct: that assertion is about the rect.

### 3 — INVERSION (PNG), the one a naive gate survives

**First attempt was wrong and is recorded as such.** The plan says "swap the two gradient stops".
Swapping the destructured pair emits `<stop offset="100%" …/><stop offset="0%" …/>`, and **SVG
clamps a descending stop offset to the preceding one** — so the whole gradient collapsed to opacity
0 and the gate reported `the column moved 0.000 … the band did not reach the exported PNG at all`.
That is a *removal*, not an inversion; the mutation did not exercise the claim it was meant to.

**The real inversion** swaps the stop **opacities** in `src/utils/bands.ts` with the offsets kept
ascending (`0%` → opacity 0, `100%` → opacity 1):

```
Error: top band: the row nearest the band's anchored edge (235.4212) is not lighter than the
middle row (237.4172). The gradient is running the WRONG WAY - the band is upside down in the
exported PNG.
  Expected: > 237.4172
  Received:   235.4212
```

The **ordering** probe. In the same run the **presence probe stayed GREEN**; scaffolded to print,
it measured **18.946** against the floor of 2.5. Two failure modes, two probes, neither proving the
other.

### 4 — the FALSE FLAT CONTROL (PNG)

**Subject:** `src/utils/bands.ts`, `resolveBandExtents` made to ignore visibility, so a band renders
even when its toggle is off.

```
Error: top band: sample 0 reads 234.2808 with bands off, not the uncoloured land at 230.864. …
  Expected: 230.864
  Received: 234.2808
```

That is the **land check**, which runs before the max-min flatness line. Scaffolded with the land
check disabled, the flatness line reddens too:

```
Error: top band: the bands-off column is not flat, so the ordering below cannot be attributed
to the band.
  Expected: <= 0.25
  Received:    3.4894000000000176
```

Both halves of the flat control fail on this mutation. The land check's message was **rewritten in
response**: it originally said only *"the column has drifted onto water"*, which is the wrong
diagnosis for this cause. It now names both causes and says which number distinguishes them.

### Two gates I tripped with PROSE, both recorded

Neither is a band defect; both are the "a grep pattern matched a comment" shape this phase keeps
finding, arriving from my own writing:

- `editorConfig.test.ts`'s **one-storage-site** gate went red because a new comment in
  `CompositionStateProvider.tsx` contained the word `localStorage`. Reworded to "stored bytes".
- `uiContract.test.ts`'s **resize-observer ownership** gate went red because a comment in
  `MapCanvas.tsx` spelled the identifier. Lower-cased, with the reason recorded inline.

### The TDD RED for Task 1 was import-shaped first, and that proves nothing

The first `npx vitest run src/utils/bands.test.ts` failed with `Cannot find module './bands'` —
`04-02` recorded this exact shape as a RED that proves no behaviour assertion can fail. A stub
module was written with every export present and wrong, which produced **15 failed | 3 passed** —
real behaviour failures — before the implementation landed. The three that passed against an
identity clamp (`clampBandHeight(120)`, `(0)`, `(154)`) are exactly the cases a clamp cannot
distinguish, which is why the load-bearing case is the one-fifth request.

## Deviations from Plan

### 1. [Rule 1 — the plan's premise was measurably wrong] The top band is over open ocean

**Found during:** Task 3's measurement pass. **Issue:** the plan requires three samples "all inside
the top band's extent". At the default world camera the top band (y 0–120) spans **80 °N to 85 °N**,
which is open Arctic Ocean at almost every meridian — and a band fading from the water colour is
invisible over water **by design**. Measured across five columns: with bands on and with bands off,
an ocean column reads **239.626 at every row**. The plan's own warning ("a gate sampling
white-on-white measures nothing and passes") applies to a *non-white* surface too, because the band
colour *is* the surface colour.

**Fix, and it is an addition rather than a substitution:**

- The **top-band** gate was kept and its samples placed on the only landmass under the band —
  Ellesmere Island at meridian −73.3°, rows 66 / 90 / 114, all inside the 120-unit extent. Land
  begins around y = 78 at that meridian, which is why the three rows sit in the band's lower half.
  Span **3.490**.
- A **bottom-band** gate was **added** over Antarctica at meridian 0°, rows 1070 / 1020 / 970. The
  signal is **2.1× larger** (span 7.481) and the column is continental rather than a scatter of
  Arctic islands. It also exercises the bottom toggle and the opposite anchor edge, so a single
  shared sign error cannot satisfy both.
- Both gates assert their own samples are **land** in the bands-off control. A column that drifts
  onto ocean now goes RED instead of quietly measuring nothing. This is not hypothetical: at
  meridian −73.3° the *bottom* rows read water (the Bellingshausen Sea), which is why the two gates
  use different meridians.

**Commit:** `ac64c87`.

### 2. [Rule 1 — bug in the plan's prescribed mutation] "Swap the two gradient stops" is a removal

Recorded in full under RED Proof 3. SVG clamps descending stop offsets, so swapping the stop
*elements* zeroes the gradient rather than flipping it. The real inversion swaps the opacities.
Anyone re-running this proof from the plan's text alone would record a removal and believe they had
proved inversion coverage.

### 3. [Rule 1] `clone.ids === 0` — the assertion `export.md` already warned about

**Found during:** the full Playwright run. **Issue:** `export.spec.ts` and `fixtures/export.html`
both asserted the sanitized clone carries zero ids. `coding-rules/export.md` has said since `03-11`
that *"a test that asserts `clone.ids === 0` **confirms** that break instead of catching it"* — the
band gradients are the first referenced ids the product ships, so it finally bit. **Fix:** the
fixture now reports `referencedIds`, `danglingReferences`, and `unreferencedIds`, and the spec
asserts no unreferenced id survives, no reference dangles, and at least one reference exists (the
first two are vacuous at zero). `clone.ids` is asserted at **1**, not 2 — the bottom band is off, so
its gradient has no rect pointing at it and is correctly stripped. That number is the discriminating
evidence that the strip rule *discriminates*. **Commit:** `ac64c87`.

### 4. [Rule 1] `04-09`'s four-corner sample was contaminated — moved, not re-baselined

**Found during:** the full Playwright run. **Issue:** `04-09` moved the land-versus-water
discrimination onto the four PNG corners. The top band is on by default and paints the surface
colour at **full opacity along y = 0**, so the top corners measured **(254, 254, 254)** — the band,
not the land. **Re-baselining them would have kept the test green and killed the claim**, because a
banded corner reads the water colour whatever is underneath it. **Fix:** the *opacity* assertion
stays on all four corners (a `fill` cannot touch alpha); the *colour* discrimination moved to rows
past `BAND_MAX_HEIGHT`, structurally out of reach of any band the product can draw including one
dragged to the cap. The structural half is asserted (`expect(row).toBeGreaterThan(BAND_MAX_HEIGHT)`);
the exact rows are measured, because the two nearest structural candidates are contaminated by
geography — y = 155 lands on a boundary stroke at the left edge and y = 200 is already open water at
the right. **Commit:** `ac64c87`.

### 5. [Rule 2 — missing critical functionality] A 44-unit hit area is 29.3 CSS pixels

**Found during:** Task 3's measurement pass. **Issue:** `04-UI-SPEC.md § 6.6` asks for a 44px hit
area. A viewBox user unit is not a CSS pixel: at 1280 × 720 the full-bleed canvas renders the 1080
square at 720 CSS px, so the handle measured **58.67 × 29.33 CSS px** — under the target, silently.

**Fix, and the discarded first attempt is worth recording.** I first sized the hit area from a
`ResizeObserver` on the canvas, which produced an exact 58.67 × 44 box at every viewport — and
tripped `uiContract.test.ts`'s **resize-observer ownership** gate, which exists so that no observer
can re-derive projection, camera, or export geometry. **Adding `MapCanvas.tsx` to that owner list
was considered and refused:** that file is the one the invariant is about, and a list extended to
cover its own subject is a loosened scan. The observer was reverted. The hit area is **88 user
units** instead, derived as `44 / 0.5` where 0.5 is the scale at the **540px canvas floor** measured
in Chrome during `04-07`. Re-measured: **58.67 × 58.67 CSS px** at 1280 × 720, and 44 × 44 at the
540px floor. Asserted on both axes in the A7 gate. **Commit:** `ac64c87`.

### 6. [Rule 3 — blocking] Seven files the plan did not list

| File | Why it had to change |
|---|---|
| `src/providers/CompositionStateProvider.tsx` | `MapStylePatch` and `canonicalizeSettings` are the ONE boundary every band write crosses. Clamping anywhere else would leave the drag, the keyboard step, and `04-14`'s V3 record each free to grow their own cap (T-04-10-01) |
| `src/components/MapWorkspace.tsx` | The only component holding both the settings and `MapCanvas`; five prop lines |
| `src/constants/colors.ts` | `BAND_HANDLE_COLOR` — a hex literal in a `.tsx` is forbidden and the exemption list is closed at `LegendOverlay.tsx`. Deliberately *not* named `*_BORDER_COLOR`: it paints editor chrome, not map geometry, so it is not in the mode-invariant set `uiContract.test.ts` gates |
| `src/styles/editor.css` | `.panel-pill input[type="radio"]` widened to `.panel-pill input` so the checkbox toggles ride the existing pill. A copy would be the § 11 rule 1 defect; net selector cost zero |
| `tests/e2e/fixtures/export.html` | The reference-aware id summary — see Deviation 3 |
| `.planning/coding-rules/frontend.md`, `.planning/coding-rules/export.md` | The rule lands with the code (CLAUDE.md § Update Process). Both were at two `Last updated` entries, so in both the two oldest were merged in the same edit |

### 7. [Reported, not silently resolved] Probe order changed after the first RED proof

The plan lists the presence-style control last. Measured: with it last, the removal mutation reddens
the *ordering* assertion and reports an inversion. The probes were reordered so each owns its
failure mode. Recorded because the plan's text, followed literally, produces a gate whose message
lies about what broke.

### 8. [Reported] Arrow-key semantics are value-based, not position-based

`04-UI-SPEC.md` A7 says "↑/↓ ±8 units" without saying ±8 of *what*. The handle is `role="slider"`
with `aria-valuenow` = the band height, so **ArrowUp/ArrowRight increase the height** and
Down/Left decrease it, for both edges. Aiming the arrows at the handle's *position* would make the
top and bottom handles disagree about which way is bigger and would contradict what a screen reader
announces. Recorded as a decision rather than an accident.

### 9. Task 2 and Task 3 were not TDD, and are not claimed as such

Only Task 1 carries `tdd="true"` and only Task 1 was run test-first. Every other new assertion was
RED-proved by mutating **its own subject** afterwards.

## Selector inventory

**332 → 335**, measured before and after by running the assertion with the ceiling at 0.

| Rule | File | Why it is not folded into something existing |
|---|---|---|
| `.map-band-handle` | `MapCanvas.css` | the `ns-resize` cursor — an SVG attribute cannot express it |
| `.map-band-handle:focus-visible` | `MapCanvas.css` | the focus ring — same reason |
| `.map-style__readout` | `controls/mapStyle.css` | shares a size and colour with `.map-style__sublabel`, but only the readout owes the reader `tabular-nums`; merging them would put a fixed advance on three prose labels to save one selector |

**The bands themselves cost ZERO**, and the `Bands` panel section cost zero. Everything the gradient
layers need — the `<defs>`, the two `<linearGradient>`s, the literal stops, the two rects, the
`pointer-events`, the `aria-hidden` — is an attribute, because they reach the export clone and a
rule in `MapCanvas.css` does not. Everything the handle *paints* is likewise inline, which is what
keeps its removal gate able to fail (`04-09`'s measured lesson).

## Export safety

- **PNG is exactly 1080 × 1080** — asserted from the `IHDR` on both frames in the band gate.
- **No network entered the export path.** No `@import`, no URL, no fetch. The gradients are inline
  literals; `exportMapPng`'s signature did not widen and it still knows nothing about composition
  state.
- **Clone contract intact:** `layerOrder` is now `[null, 'surface', 'paint', 'camera', 'bands',
  'legend']` — three sibling insertions, all of which shift the camera and legend indices equally,
  so `isPreservedComposition`'s camera-before-legend order check still holds and is asserted. The
  camera's surviving children are unchanged (`['countries', 'borders']`). The three white opacity
  layers are untouched. The refusal reasons are unchanged.
- **The handles are provably absent** from the sanitized clone, asserted three ways: the group is
  gone, `[role="slider"]` is gone, and no element carries the handle line's inline stroke sentinel.
- **Zero package-manager installs.** `package.json` and `package-lock.json` untouched across all
  three commits, verified by `git diff --name-only`.
- **No file was deleted** by any of the three commits (`git diff --diff-filter=D` empty).

## Verification

```
npm run lint                                    clean
npm test                                        791/791, 46 files
npm run build                                   clean (tsc -b && vite build)
npx playwright test --project=chrome            126/126, installed Chrome 151.0.7922.76
npm run data:world:check                        PASS (248 / 195 / 207; mesh 327 geometries)
```

## Known Stubs

| Stub | File | Why |
|---|---|---|
| The four band settings are **not persisted** | `src/utils/storage.ts` | Same family as `surfaceColor`, `uncoloredFill`, `borderColor`, `interiorWeight`, `coastlineWeight`. A saved composition reloads with the top band on at 120 and the bottom off. `04-14` owns the V3 record |
| **The legend sits inside the top band today** | `src/utils/legend.ts` | `resolveBandExtents` is exported and unread. The legend's default is still `{x: 32, y: 32}`, and the top band now reaches y = 120, so a top-left legend overlaps it. Paint order is bands → legend, so the legend draws **on top** and stays legible — but it is visually crowded. `04-12` owns the band-aware inset (`topInset = LEGEND_SAFE_INSET + resolveBandExtents(...).top`), and doing it here would have moved exported pixels in a plan that does not own the legend |
| `tests/e2e/fixtures/export.html` renders the bands but exercises no bottom band | `tests/e2e/fixtures/export.html` | Deliberate, and it is what makes the `ids === 1` assertion discriminating: with the bottom gradient unreferenced, the fixture proves the strip rule strips. The real-app `band` gate covers both |

Nothing in this plan closes a stub carried forward from `04-08` or `04-09`.

## Notes for `04-11`, `04-12` and later

- **`resolveBandExtents` is the seam. Consume it; do not re-derive `visible ? height : 0`.**
  `04-12`'s `topInset = LEGEND_SAFE_INSET + resolveBandExtents(settings).top`. Two copies of that
  expression is how the legend ends up under a band the creator has grown.
- **Toggling a band or dragging a handle MOVES EXPORTED PIXELS once `04-12` lands.** That is
  intended and must be gated per-property, never by a re-baselined image.
- **The clone's SVG child order is now asserted in three places** (`export.test.ts` ×2,
  `export.spec.ts` ×1). `g[data-layer="text"]` goes between the legend and the handles; add it in
  all three or one of them fails.
- **A new referenced id owes the same evidence the gradients did.** The strip rule is
  reference-aware, and the failure when you get it wrong is *silent* — the `<defs>` stays, the
  `url(#…)` still reads fine, and the layer simply does not rasterise.
- **A band is invisible over the surface colour, always.** Any future gate on a band, or on text
  sitting in one, needs a column that crosses something that is not the water — and an assertion
  that it does.
- **`04-09`'s Australian coastline sample is still structural, but the corner samples are not
  where they were.** The Pacific fixture's land/water rows are now y = 180 and y = 920. If `04-11`
  adds a layer that can reach either, move the sample rather than the number.
- **The 44px hit area is 88 user units and the derivation matters.** If the canvas floor ever drops
  below 540px, 88 stops clearing 44 CSS px. Re-derive; do not reach for a resize observer inside
  `MapCanvas`.

## Self-Check: PASSED

- `src/utils/bands.ts`, `src/utils/bands.test.ts` — both FOUND
- `src/components/MapCanvas.tsx`, `src/components/MapStylePanel.tsx`, `src/styles/MapCanvas.css`,
  `src/styles/controls/mapStyle.css`, `tests/e2e/export.spec.ts`,
  `.planning/coding-rules/frontend.md`, `.planning/coding-rules/export.md` — all FOUND
- `cfe80b6` · `fac55cd` · `ac64c87` — all three present in `git log`
- `grep -c 'data-layer="bands"' src/components/MapCanvas.tsx` — **2** (the layer and its comment);
  the group is a SIBLING of the camera, verified by exactly one `</g>` between the camera's opening
  tag and the bands group
- `grep -cE 'stop-color="var\(|stopColor=\{?\`?var\(' src/components/MapCanvas.tsx` — **0**
- `grep -cE "Math\.floor\(.*7\)" src/utils/bands.test.ts` — **0**; `grep -n "154"` and `grep -n "120"`
  both return hits inside assertions
- `grep -c "^\*Last updated:"` — **2** in `frontend.md` and **2** in `export.md`
- `git diff --name-only cfe80b6~1 HEAD | grep package` — **no match**
- `git diff --diff-filter=D --name-only cfe80b6~1 HEAD` — **empty**
- `.planning/STATE.md` and `.planning/ROADMAP.md` — **untouched**, verified by `git status`
- **No forbidden gsd-sdk verb was run** (`state.advance-plan`, `state.update-progress`,
  `roadmap.update-plan-progress`)
- `git status --short` — clean of source modifications after every RED proof; the two scratch
  Playwright probes (`zzmeasure.spec.ts`, `zzprobe.spec.ts`) were deleted before the first commit
  that could have captured them
