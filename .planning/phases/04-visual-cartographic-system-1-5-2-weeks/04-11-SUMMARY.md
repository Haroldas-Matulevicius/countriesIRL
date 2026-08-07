---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 11
subsystem: render
tags: [d4-15, d4-14, d4-16, composition-text, untrusted-input, refusal-not-truncation, u-6, paint-order, png-pixels]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-10`'s bands — the layer the title sits in, `resolveBandExtents`, and the measured lesson that probe ORDER decides which claim speaks"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-04`'s two `unicode-range` faces for one family, and `EXPORT_FONT_FACE_SUPPRESSION_FLAG` as the control seam"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-01`'s inline-attribute technique, `WATER_PRESETS`, `utils/contrast.ts`, and the `MapStylePanel` this plan adds a fifth section to"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-07`'s shared `.panel-*` vocabulary in `editor.css`"
provides:
  - "`src/utils/compositionText.ts` — `characterBoundFor`, `sanitizeCompositionText`, `getCompositionTextBlockingMessage`, `resolveCompositionTextLines`, `compositionTextLength`, `hasCompositionText`, `TEXT_SAFE_INSET`, the size-step tables, and the three byte-exact § 9 refusals"
  - "`g[data-layer=\"text\"]` — the LAST composition layer, outside the camera, after the legend; fill/family/size/weight/anchor all inline attributes"
  - "Six `VisibleCompositionSettings` fields: `title`, `titleSize`, `subtitle`, `subtitleSize`, `attribution`, `textAlignment`, all sanitised at the reducer boundary"
  - "`src/components/CompositionTextPanel.tsx` — the `Text` section INSIDE the `Map style` flyout, plus `src/styles/controls/compositionText.css` (3 rules)"
  - "`text-blocked` as a `CompositionExportTransactionOutcome` variant, read BEFORE the camera lease. `ExportFailureReason` unchanged"
  - "`COMPOSITION_FONT_FAMILY` in `interFontFace.ts` — the ONE composition font stack, aliased by `LegendOverlay`"
  - "`export.spec.ts` `describe(\"composition text\")` ×3, and a threshold parameter on `measureLegendCrops`"
  - "`LEGEND_SAFE_INSET` exported from `legend.ts`"
affects: [04-12, 04-13, 04-14, 04-16]

actuals:
  tokens: 61000
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "PRESENCE FIRST, THEN CORRECTNESS for any gate about text — an ink count goes green for the wrong font, the wrong size, and the wrong string"
    - "A crop DERIVED from the subject's own layout must be bounded to the frame: an off-frame `drawImage` source rect yields transparent black, which every ink counter reads as solid ink"
    - "An assertion that tries to RECOVER a constant from a downstream rounded value cannot fail — `floor()` ate a 2% advance difference at all three legend sizes"
    - "A behavioural absence claim needs its COUNTERFACTUAL in the same test, or it is vacuously true of the empty case"
    - "Sanitise at the state boundary and do NOT escape: the serializer escapes text nodes, and pre-escaping is double-escaping"

key-files:
  created:
    - src/utils/compositionText.ts
    - src/utils/compositionText.test.ts
    - src/components/CompositionTextPanel.tsx
    - src/styles/controls/compositionText.css
  modified:
    - src/types/composition.ts
    - src/constants/mapStyle.ts
    - src/providers/CompositionStateProvider.tsx
    - src/components/MapCanvas.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapStylePanel.tsx
    - src/components/LegendOverlay.tsx
    - src/components/ToastRegion.tsx
    - src/components/ToastRegion.test.tsx
    - src/hooks/useCompositionExportTransaction.ts
    - src/hooks/useCompositionExportTransaction.test.tsx
    - src/styles/interFontFace.ts
    - src/styles/uiContract.test.ts
    - src/utils/legend.ts
    - src/utils/export.test.ts
    - src/App.tsx
    - src/main.tsx
    - tests/e2e/export.spec.ts
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/export.md

key-decisions:
  - "OWNER GATE Decision A = `text-in-map-style`. The rail-height floor is MEASURED at 552px by `04-01`, not the 540px § 6.1 estimated; an eighth row is ~600px and Phase 5's `05-05` Data HUD needs that headroom. The rail cannot scroll instead — a tooltip must escape the 48px column and `overflow-y: auto` computes `overflow-x: auto`"
  - "OWNER GATE Decision B = `ink-one`. Arithmetic: `#4B5563` (L 0.0889) needs a surface at L >= 0.575, i.e. near-white water only, retiring three of four shipped presets; `#111827` (L 0.0091) needs only L >= 0.2164. ⚠ SHIPS UNREVIEWED — see § The owner gate"
  - "Text baselines are anchored to the SQUARE's edge by `TEXT_SAFE_INSET`, NOT to a band extent. The plan asked for band-relative placement; a band is a backdrop, not a container, and band-relative baselines would make every text pixel gate a function of band height"
  - "ONE alignment control for all three fields. § 6.8's control contract lists exactly one Alignment row; § 4.2's per-row Anchor column names where each line can sit. Reported as a spec disagreement, not silently resolved"
  - "`MAX_COMPOSITION_TEXT_LENGTH` is 100 code points — deliberately ABOVE the largest character bound (49), because the product refuses rather than truncates and a creator has to be able to overshoot"
  - "`CompositionTextSize` / `Alignment` / `Anchor` are declared in `types/composition.ts`, not in `utils/compositionText.ts`, because that module imports `utils/legend.ts` which imports the types module — a type-only cycle the compiler erases is still a cycle in the module graph"
  - "The bands-versus-legend ordering measured ON THE BAND is HELD OUT and the swatch assertion replaces it. The legend background is 90% opaque, so `04-10`'s largest band signal (3.490 luminance) arrives underneath as 0.35; measured max delta inside the legend box is 3 of 765"
  - "`imports the shell sheet last` was rewritten as an ORDERING because a `grep -c` returns 1 whether `editor.css` is first, last, or middle — measured both ways"
  - "`COMPOSITION_FONT_FAMILY` moved into `interFontFace.ts` rather than the text layer authoring a second copy of `LegendOverlay`'s stack"

requirements-completed: [D4-15]

coverage:
  - id: D1
    description: "Title, subtitle, and attribution render as `<text>` in `g[data-layer=\"text\"]`, outside the camera, painted last — over the bands and the legend"
    requirement: "D4-15"
    verification:
      - kind: unit
        ref: "export.test.ts#leaves the composition preserved (clone layer order [null, surface, paint, camera, bands, legend, text])"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#the captured clone keeps wrapped geography (same order on the real fixture)"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#composition text › at a forced overlap the PNG paints bands, then legend, then text (installed Chrome 151.0.7922.76)"
        status: pass
    human_judgment: false
  - id: D2
    description: "An empty field renders NO `<text>` at all, so no family is registered in `collectCompositionFonts`"
    requirement: "D4-15"
    verification:
      - kind: unit
        ref: "compositionText.test.ts#renders nothing at all for an all-empty composition / omits only the empty field, keeping the others"
        status: pass
      - kind: unit
        ref: "export.test.ts#registers no family for a composition with no type, and would if an empty <text> existed (the counterfactual)"
        status: pass
      - kind: unit
        ref: "export.test.ts#the EMPTY subtitle contributed no element at all"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#composition text › clearing the title takes the ink away (0 ink, and the node count drops to 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Character bounds are derived per size step from Inter's 1.0202em worst-case advance; the counter turns --destructive at the bound and exceeding it refuses export"
    requirement: "D4-15"
    verification:
      - kind: unit
        ref: "compositionText.test.ts#returns the tabulated title/subtitle/attribution bounds (literals 27/22/17 · 45/38/31 · 49)"
        status: pass
      - kind: unit
        ref: "compositionText.test.ts#derives every bound from the viewBox, the inset, and the recorded advance"
        status: pass
      - kind: unit
        ref: "compositionText.test.ts#uses the recorded 1.0202em advance, not a naive one-em assumption"
        status: pass
      - kind: other
        ref: "`CompositionTextPanel.renderCounter` and `App`'s export blocker both call `characterBoundFor` — ONE derivation, so the counter cannot disagree with the blocker"
        status: pass
    human_judgment: false
  - id: D4
    description: "Text that overflows the square blocks Export PNG synchronously with a per-field message and offers no retry"
    requirement: "D4-15"
    verification:
      - kind: unit
        ref: "compositionText.test.ts#returns the title / subtitle / attribution message for an over-bound field, byte-exact"
        status: pass
      - kind: unit
        ref: "useCompositionExportTransaction.test.tsx#reports the composition-text blocker before acquiring a lease or a busy lock"
        status: pass
      - kind: unit
        ref: "ToastRegion.test.tsx#surfaces a title / subtitle / attribution that will not fit, without a refresh instruction or retry"
        status: pass
    human_judgment: false
  - id: D5
    description: "Phase 4 adds no new ExportFailureReason variants; only new refusal reasons"
    requirement: "D4-15"
    verification:
      - kind: other
        ref: "`git diff src/types/ui.ts` across all four commits — EMPTY. `text-blocked` is a `CompositionExportTransactionOutcome` variant"
        status: pass
    human_judgment: false
  - id: D6
    description: "Creator text is SVG text content, never markup; the <text> element is never built by string concatenation"
    requirement: "D4-15"
    verification:
      - kind: other
        ref: "grep -cE 'innerHTML|dangerouslySetInnerHTML|insertAdjacentHTML' src/components/MapCanvas.tsx src/components/CompositionTextPanel.tsx — 0 and 0"
        status: pass
      - kind: unit
        ref: "export.test.ts#the cloned title's textContent is the sentinel — it reached the clone as a text node"
        status: pass
    human_judgment: false
  - id: D7
    description: "Control characters are stripped and length is bounded before the value reaches composition state"
    requirement: "D4-15"
    verification:
      - kind: unit
        ref: "compositionText.test.ts#strips control characters, newlines, and bidi overrides / bounds the length in code points / never splits a surrogate pair"
        status: pass
      - kind: other
        ref: "`canonicalizeCompositionText` in `CompositionStateProvider` — every SET_MAP_STYLE write crosses it"
        status: pass
    human_judgment: false
  - id: D8
    description: "All composition ink is `#111827` written as an inline fill attribute, never a class and never a host var()"
    requirement: "D4-15"
    verification:
      - kind: other
        ref: "grep -cE 'fill=\\{?\"?var\\(' src/components/MapCanvas.tsx — 0"
        status: pass
      - kind: unit
        ref: "export.test.ts#the cloned title carries fill #111827, font-size 44, font-weight 600, text-anchor start"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#expectTitleRendered — the live <text> carries the literal, asserted before any pixel claim"
        status: pass
    human_judgment: false
  - id: D9
    description: "The three refusals pass through ToastRegion's allowlist and assertion 23's counts move deliberately with a stated reason in the same commit"
    requirement: "D4-15"
    verification:
      - kind: unit
        ref: "uiContract.test.ts#pins the allowlist entry counts as hard numbers (25 → 28, 14 → 17, reason in `5c13750`)"
        status: pass
      - kind: unit
        ref: "ToastRegion.test.tsx ×3 — each pairs the rendered string with the classifier that emits it"
        status: pass
    human_judgment: false
  - id: D10
    description: "At a deliberately forced band/legend overlap, the PNG paint order is bands then legend then text"
    requirement: "D4-15"
    verification:
      - kind: e2e
        ref: "export.spec.ts#composition text › at a forced overlap — legend swatch reads #DE2D26 exactly under a max-height band (bands→legend); title inks 2,557 px inside the 90%-opaque legend background against 0 without it (legend→text)"
        status: pass
      - kind: other
        ref: "The third reading — bands-versus-legend measured ON THE BAND — is HELD OUT with the measurement that justifies it. See § What this plan does NOT claim"
        status: partial
    human_judgment: false

status: complete
---

# Phase 4 Plan 11: Composition Text Summary

**The creator's own words now reach the exported PNG, and the ones that will not fit refuse it
instead of being clipped.** Title, subtitle, and attribution render as `<text>` in a new
`g[data-layer="text"]` — the last composition layer, every declaration inline, the value set as
React children so it can only ever become a text node. Bounds are character counts derived from
the repository's own recorded 1.0202em advance, because Vitest runs on `node` and text measurement
is impossible there. Three byte-exact refusals block `Export PNG` **before** a camera lease is
taken.

## Performance

| Gate | Before | After |
|---|---|---|
| Unit (Vitest, `node`) | 791 / 791, 46 files | **822 / 822**, 47 files |
| Playwright (installed Chrome **151.0.7922.76**) | 126 / 126 | **129 / 129** |
| `npm run lint` | clean | clean |
| `npm run build` (`tsc -b && vite build`) | clean | clean |
| `npm run data:world:check` | PASS | PASS (248 / 195 / 207; mesh 327 geometries) |
| Selector inventory | 335 | **338** (+3 — see below) |
| Bundle `index.js` | 693.05 kB (298.91 kB gz) | 700.33 kB (301.01 kB gz) |
| Bundle `index.css` | — | 49.84 kB (8.03 kB gz) |
| New npm packages | — | **ZERO**; `package.json` and `package-lock.json` untouched |

## The owner gate — answered, not stopped on

Task 1 is a `checkpoint:decision`. It arrived **already answered**, and both answers are recorded
in code as well as here.

**Decision A — `text-in-map-style`.** A fourth `Text` section inside the existing `Map style`
panel, rather than an eighth rail row.

- **The rail cannot become a scroll container.** A tooltip has to escape the 48px column, and
  `overflow-y: auto` computes `overflow-x: auto`, which would clip every rail tooltip.
- **`04-01` MEASURED the rail-height floor at 552px, not the 540px `04-UI-SPEC.md § 6.1`
  estimated.** Seven rows already sits at 552; an eighth would be ~600px. Phase 5's `05-05` Data
  HUD is the eighth row and needs that headroom.
- **Accepted cost, stated not glossed:** "Map style" stretches to cover typed content, and the
  panel becomes five sections and **will** scroll. A *panel* scrolling is fine — it is the *rail*
  that must not.

**Decision B — `ink-one`.** A single composition ink `#111827` for all composition type.

- The arithmetic is decisive, not aesthetic. A second grey ink `#4B5563` has relative luminance
  **0.0889** and needs a surface of **L ≥ 0.575** to clear AA 4.5:1 — i.e. **near-white water
  only**, which would retire most of the water-preset feature `04-01` just shipped (warm paper
  `#F5EFE6`, cool tint `#EAF2F7`, soft grey `#E9EBEE`).
- `#111827` has luminance **0.0091**, needing only **L ≥ 0.216** (the shipped constant rounds up
  to **0.2164**), so every surface lighter than mid-grey stays legal.
- Hierarchy is carried by **size and weight only** — attribution reads secondary because it is 20
  units at weight 400 in a corner, not because it is grey.

> ⚠ **`ink-one` / U-6 SHIPS UNREVIEWED.** It is the one place `04-UI-SPEC.md` knowingly departs
> from the owner's Eurostat reference image, which sets attribution in small grey type, and
> `04-UI-SPEC.md § 12` names U-6 as **the row most worth the owner's eye**. **The owner has not
> seen it.** Nothing in this plan should read as though they had. It is flagged for
> `04-ACCEPTANCE.md`.

**Authorization, recorded in the required words:** both decisions were answered under a **blanket,
in-advance, sight-unseen proceed-authorization**. It **authorizes proceeding**; it is **not a
content review** and it is **not hash-bound** (Immutable Safety Constraint 8).

## ⚠ What this plan does NOT claim

- **⛔ A12 — actually opening the exported PNG and looking at whether the latin-ext diacritics
  render as the RIGHT GLYPHS — is a PHYSICAL CHECK scheduled in `04-16`, and it is NOT performed
  here.** `04-VALIDATION.md` lists it as manual precisely because an automated byte difference
  proves *something changed*, not that it is *correct*. It was never performed in Phase 3,
  **skipped is not passed**, and it cannot be inherited. Gate B proves that the embedded faces
  changed the raster; it does not and cannot prove the glyphs are right.
- **Nobody opened any exported PNG and looked at it.** Every gate below proves that *specific
  sampled pixels carry specific values in a specific order*, plus that specific strings and
  attributes are present in the live DOM. That is narrower than "the title looks right".
- **The band-versus-legend ordering measured ON THE BAND is HELD OUT**, with the reason measured.
  See § The held-out reading.
- **No Phase 3 UAT cell is cited.** Nine of its twelve were never performed.
- **Installed Chrome 151.0.7922.76 only.** Every number here was taken on `.76`. **Edge is not
  installed on this machine**, so no Edge, Firefox, or Safari result exists or may be cited.
- **No screen-reader pass, no touch-target check, no physical 200% zoom, and no dark-theme
  review** was performed on the `Text` section. The counter is `aria-live="off"` and each field is
  wired to its counter with `aria-describedby`; that these read sensibly aloud is A9 and was not
  performed.
- **No claim that composition text survives a save/load round trip.** It is not persisted — see
  Known Stubs.
- **The `Map style` panel's scrolling was not measured at any viewport.** Decision A accepts that
  it scrolls; nobody checked at what height it starts to.

## What shipped

### Task 2 — the text module (`21d4dc0`)

`src/utils/compositionText.ts` holds the size tables, the bounds, the sanitiser, the refusals, and
the layout — all pure, all `node`-testable.

`characterBoundFor(role, size)` is `floor(1016 / (size × 1.0202))`, where **1016** is
`MAP_VIEWBOX_SIZE − 2 × TEXT_SAFE_INSET` and **1.0202em** is the `W` advance
`LEGEND_CHARACTERS_PER_LINE` already records. It is **not a new measurement**: `04-11` and `04-13`
derive from the same number, and whoever moves one moves both. `legend.ts` now **exports**
`LEGEND_SAFE_INSET`, and `TEXT_SAFE_INSET` *is* that constant — two 32s in two modules is how they
stop agreeing.

The tests assert the seven § 4.2 literals (27 / 22 / 17 · 45 / 38 / 31 · 49) **and**, separately,
that the derivation reproduces each one from `MAP_VIEWBOX_SIZE` and `TEXT_SAFE_INSET` rather than
from pasted numbers.

`sanitizeCompositionText` strips `Cc`/`Cf`/`Zl`/`Zp` (`Cf` is where the bidi overrides live) and
bounds the length in **code points**, so a surrogate pair is never split. It deliberately leaves
`<`, `>`, and `&` intact, with the reason asserted: the value is SVG text content and
`XMLSerializer` escapes those itself, so pre-escaping would double-escape.

`getCompositionTextBlockingMessage` returns one of three byte-exact § 9 strings or `null`.
**`ExportFailureReason` gained no variant** — `git diff src/types/ui.ts` across all four commits is
empty.

### Task 3 — the layer, the controls, and the allowlist (`5c13750`)

`g[data-layer="text"]` is the **last** child of `svg.map-canvas`, outside the camera and after the
legend, completing U-8's bands → legend → text order. Each line is one `<text>` carrying an inline
`fill="#111827"`, `font-family`, `font-size`, `font-weight`, and `text-anchor`. The value is
`{line.value}` — React children — so it can only ever become a text node.

`resolveCompositionTextLines` is the one reader of what renders and where; `MapCanvas` maps over
its output. That makes "an empty field renders no `<text>`" a pure property rather than a JSX
conditional nobody can assert.

`CompositionTextPanel` is the fifth `Map style` section. **Zero new pill classes** — the size and
alignment rows are the existing `.panel-pills` / `.panel-pill` radios, the fields are
`.panel-field`, the labels are `.map-style__sublabel`, and the counter rides
`.map-style__readout` for its `tabular-nums`.

`useCompositionExportTransaction` reads `getCompositionTextBlocker` immediately after the legend
blocker and **before** any lease, busy lock, or clone. The new outcome is `text-blocked`, which is
not an `ExportFailureReason`.

### Task 4 — the PNG gates (`2abf60c`)

Three gates, three claims. Numbers in § Measured numbers.

### Rules (`7340618`)

`frontend.md` § Creator text in the composition and `export.md` § Composition text, landed in the
same commit as the behaviour they describe. Both files were at two `Last updated` entries, so in
both the two oldest were merged into one line in the same edit.

## Measured numbers

All in installed Chrome **151.0.7922.76**, water `Warm paper` (`#F5EFE6`), title at the medium
step (44 / weight 600), default world camera.

| Measurement | Value |
|---|---|
| Title-region ink below `DARK_INK_THRESHOLD` (100), title set | **2,842** |
| The same region, title cleared | **0** |
| Blank flood-fill control through the same counter | **0** |
| latin-ext crop ink, faces embedded / suppressed | **3,291** / **3,023** |
| latin-ext crop pixels differing between the two | **4,875** |
| Text-over-legend crop ink, title set / cleared | **2,557** / **0** |
| Legend swatch under a max-height band, correct order | **(222, 45, 38)** = `#DE2D26` exactly |
| The same swatch with bands moved AFTER the legend | **(233, 137, 129)** |
| Max band-on / band-off channel delta INSIDE the legend box | **3 of 765** |
| Max band-on / band-off channel delta OUTSIDE it, same frame | **9 of 765** |
| Legend geometry (derived and DOM-checked) | `translate(32 32)`, 336 × 96 |

### The derived floors

| Constant | Value | Derivation |
|---|---|---|
| `MIN_TITLE_INK_PIXELS` | **1,000** | under half the measured 2,842, against a control of 0 |
| `MIN_FONT_CROP_INK_PIXELS` | **1,000** | under a third of the smaller measured crop (3,023) |
| `MIN_FONT_CROP_DIFF_PIXELS` | **1,500** | under a third of the measured 4,875 |
| `MIN_TEXT_OVER_LEGEND_INK_PIXELS` | **800** | under a third of the measured 2,557, against a control of 0 |

Deliberately not tight. This repository has shipped a `<= 1px` tolerance that passed against its
own 1px probe when the real disagreement was 6e-14.

## The held-out reading, and why the replacement is stronger

**Held out:** bands-versus-legend measured **on the band** — i.e. sampling a legend-interior pixel
and showing it moves when the band is toggled.

**It cannot be sampled unambiguously, and that is a measurement rather than an impression.** The
legend background is `#FFFFFF` at **90% opacity**, so anything beneath it arrives attenuated to a
tenth. The largest band signal this product can produce anywhere in the top band is `04-10`'s
measured **3.490 luminance** (Ellesmere, Warm paper); under the legend that is **0.35** — below
`04-10`'s own noise floor arithmetic. Measured directly in this plan by scanning every pixel of
the legend box across a band-on / band-off pair: the **maximum channel delta is 3 of 765**, and
**9 of 765** outside the legend in the same frame. An assertion built on that could not fail on
its own subject.

**What replaced it is a stronger claim, not a weaker one.** The legend's colour swatch is a fully
opaque `#DE2D26` fill sitting inside the top band's extent. With the band dragged to its
`BAND_MAX_HEIGHT` cap it reads **exactly** `(222, 45, 38)` — no attenuation, no tolerance. Under
the reversed DOM order the same pixel measured **(233, 137, 129)**, a 92-level shift in green.
That is the RED proof and the non-vacuity evidence in one.

The band-before-legend ordering is *also* asserted structurally on the real sanitized clone
(`export.test.ts` ×2, `export.spec.ts` ×1, as `[null, surface, paint, camera, bands, legend,
text]`), and DOM order is paint order in SVG — but a structural assertion is a different claim from
a pixel one and is not offered as a substitute.

## RED Proofs

Every mutation was made in place after copying the file to
`/private/tmp/claude-501/…/scratchpad`, and restored by **copying back** — never `git checkout --`.
`git status` was clean of source modifications after each.

### 0 — the TDD RED for Task 2 was NOT import-shaped

The first run could have failed with `Cannot find module './compositionText'` — the shape `04-02`
recorded as proving no behaviour assertion can fail. A stub module with **every export present and
wrong** was written first instead, producing **19 failed | 5 passed**: real behaviour failures
(`expected 0 to be 27`, `expected undefined to be 'start'`, …).

**The five that passed against the stub are recorded, because they are the weak half of five
pairs.** `renders nothing at all for an all-empty composition` passes against a resolver that
always returns `[]`; `leaves ordinary latin-ext characters intact` and `leaves the markup
characters` pass against an identity sanitiser; `returns null when everything fits` passes against
a classifier that always returns null. Each has a discriminating partner that went RED — `omits
only the empty field, keeping the others`, the strip test, and the three message tests.

**One of the five was a gate that could not fail, and it was replaced rather than kept.** A test
tried to *recover* the 1.0202em advance from `LEGEND_CHARACTERS_PER_LINE` — and passed against a
stub whose advance was **1**, because `floor()` eats the difference at all three legend sizes
(10 / 7 / 6 either way). It now names the difference instead: a naive one-em advance gives a medium
title a bound of **23** where the measurement gives **22**, asserted as a strict inequality.

### 1 — the recorded advance (unit)

**Subject:** `src/utils/compositionText.ts`, `WIDEST_CHARACTER_ADVANCE_EM` `1.0202` → `1`.
**Command:** `npx vitest run src/utils/compositionText.test.ts` → **4 failed | 20 passed**.

```
FAIL  characterBoundFor > returns the tabulated title bounds
AssertionError: expected 28 to be 27 // Object.is equality
FAIL  characterBoundFor > uses the recorded 1.0202em advance, not a naive one-em assumption
AssertionError: expected 1 to be 1.0202 // Object.is equality
```

Worth recording: `derives every bound from the viewBox, the inset, and the recorded advance`
**stayed GREEN** through this mutation, because it recomputes from the very constant it imports.
That is the "gate asserting a constant the test imports" shape — which is precisely why the
literal-table test exists beside it, and why both halves are kept.

### 2 — the stylesheet ORDERING (unit), and the count that could not fail

The plan requires `editor.css`-last to be asserted as an **ordering**, never as a count. Measured
both ways under the mutation:

```
grep -c "^import './styles/editor.css';" src/main.tsx   →  1  under the mutation
                                                        →  1  when correct
```

**Subject:** `src/main.tsx`, `compositionText.css` **moved** to after the `editor.css` import (a
pure reorder, not a duplicate — a duplicate would also trip assertion 20 and prove nothing about
ordering).

```
AssertionError: editor.css is no longer the LAST stylesheet main.tsx imports, so the shell's
structural rules stopped winning over the surface rules of equal specificity beneath them. That
is a silent restyle, not a lint nit.
Expected: "./styles/editor.css"
Received: "./styles/controls/compositionText.css"
```

**Exactly one gate reddened.** Assertion 20's set-equality check stayed GREEN, which is what makes
this a proof about ordering rather than about membership.

### 3 — the export-transaction ORDERING (unit)

**Subject:** `src/hooks/useCompositionExportTransaction.ts`, the text-blocker read moved below
`handle.freezeAndSnapshot()`.

```
AssertionError: the text blocker is read AFTER the camera freeze, so an over-long title costs the
creator a lease and a busy lock before it refuses.
Expected: < 1
Received:   2
```

### 4 — the `<text>` OUTSIDE the viewBox (PNG), Gate A's required proof

**Subject:** `src/utils/compositionText.ts`, `anchorX('left')` → `TEXT_SAFE_INSET + 5000`.

**The first run of this proof DEFEATED the gates, and that is the most valuable thing in this
plan.** The title-ink crop is *derived from the text's own layout*, so it moved with the text —
and `drawImage` from a source rect off the bitmap yields **transparent black**, which every ink
counter in the suite reads as solid ink. Gate B's content floors passed on **28,050 phantom
pixels**, and the failure surfaced on the `diffAB` assertion with a message blaming a silent font
fallback. Gate A's control assertion would likewise have failed with the wrong diagnosis.

`titleInkRegion` now bounds its crop to the 1080 frame before anything is sampled. Re-run with the
same mutation, all three gates redden and all three name the actual cause:

```
Error: the title crop runs off the right of the 1080 frame, where every sampled pixel is
transparent black and reads as ink.
```

With the crop guarded and the text merely absent rather than off-frame, Gate A reads:

```
Error: the title region carries 0 ink pixels against a floor of 1000. The creator's title did not
reach the exported PNG at all.
  Expected: > 1000
  Received:   0
```

### 5 — the font injection dropped (PNG), Gate B's required proof

**Subject:** `src/utils/export.ts`, `injectExportFontFace` returns immediately.

```
Error: only 0 pixels differ between the embedded and font-suppressed exports, against a floor of
1500. The composition names Inter, but the vendored bytes are not what rasterised the title - it
fell back silently, which is the failure mode that produces no error anywhere.
  Expected: > 1500
  Received:   0
```

**Gates A and C stayed GREEN.** The two claims — "text rendered" and "the vendored face rendered
it" — are demonstrably separate, measured rather than argued.

### 6 — the DOM order reversed (PNG), Gate C's required proof, run TWICE

The plan prescribes one mutation ("reverse the DOM order of the bands and text groups"). Gate C
makes **two** ordering claims, so it got **two** mutations — one per claim — because a single
mutation cannot show that two probes are independent.

**6a — text moved BEFORE the legend.** Only Gate C reddened, on the legend→text claim:

```
Error: the title inked 0 pixels inside the legend region against a floor of 800. The <text>
exists and carries the right string, so the legend background is painting OVER it - the paint
order is legend after text.
```

**6b — bands moved AFTER the legend.** Only Gate C reddened, on the bands→legend claim:

```
Error: the legend swatch at (68, 80) does not read #DE2D26. A band at its cap is covering it, so
the band is painting AFTER the legend instead of before it.
- Expected  222, 45, 38
+ Received  233, 137, 129
```

Gates A and B stayed green through both.

**Gate C's probe ORDER was changed in response to 6a.** With the mutation from RED proof 4 in
place, the legend→text message fired for text that had never reached the frame at all — a missing
subject reporting as a mis-ordered one, `04-10`'s exact recorded shape. A **pixel presence probe**
now runs ahead of both ordering claims.

## Deviations from Plan

### 1. [Rule 1 — the plan's placement rule would couple text to band height] Baselines are anchored to the square's edge

**Plan text:** *"Title and subtitle sit in the top band; attribution sits in the bottom band, or at
the bottom edge inset by `TEXT_SAFE_INSET` when the bottom band is off."*

**What shipped:** all three baselines are anchored to the **square's** edge by `TEXT_SAFE_INSET`,
independent of `resolveBandExtents`. At the shipped defaults the outcome is identical — the title
and subtitle land inside the 120-unit top band and the attribution inside the bottom one — so this
is not a visible change out of the box.

**Why.** A band is a backdrop for type, not a container. Making a baseline a function of band
height means (a) a creator who drags a band shut takes their title off the top of the square with
it, and (b) **every text pixel gate becomes a function of band height**, which is precisely the
coupling that made `04-10`'s own gates hard to write. It also leaves `resolveBandExtents` with
exactly one consumer, `04-12`'s legend inset, as `04-10` intended. Recorded as a decision, not an
oversight. **Commit:** `5c13750`.

### 2. [Reported, not silently resolved] `04-UI-SPEC.md § 4.2` and § 6.8 disagree about alignment

§ 6.8's control contract lists **one** Alignment row with three pills and no per-field qualifier.
§ 4.2's per-row *Anchor* column gives the title `start`/`middle`/`end` but the attribution only
`start (bottom-left) or end (bottom-right)`.

**Resolved in favour of § 6.8's control contract:** one `textAlignment` governs all three fields,
so a centred attribution is reachable. Reading § 4.2 as prescriptive would mean a second, differently
shaped pill row for one field. Reported here rather than resolved silently, per the standing rule.
**Commit:** `5c13750`.

### 3. [Rule 3 — blocking] The composition-text TYPES live in `types/composition.ts`

`compositionText.ts` imports `LEGEND_SAFE_INSET` from `utils/legend.ts`, which imports
`types/composition.ts`. Declaring `CompositionTextSize` in `compositionText.ts` and importing it
into `types/composition.ts` would close a cycle. A `import type` cycle is erased by the compiler,
but `general.md` forbids circular dependencies and a cycle that only survives because it is erased
is still a cycle in the module graph. The three types are declared beside `StrokeWeight` — which is
where the composition vocabulary already lives — and re-exported from `compositionText.ts` so
consumers still have one import site. **Commit:** `5c13750`.

### 4. [Rule 2 — missing critical functionality] Two greps matched my own prose

The threat register's `innerHTML|dangerouslySetInnerHTML|insertAdjacentHTML` grep and the
`fill=var(` grep both returned non-zero **because the new comment in `MapCanvas.tsx` spelled
them** — `04-10` tripped this exact shape twice with its own writing. Both passages were reworded
and both greps return **0**, with the reason recorded inline so the next author does not
reintroduce it. **Commit:** `5c13750`.

### 5. [Rule 3 — blocking] Six files the plan did not list

| File | Why it had to change |
|---|---|
| `src/constants/mapStyle.ts` | `DEFAULT_COMPOSITION_SETTINGS` is the ONE default settings object; six new fields need six defaults, and the `Text` section's labels belong beside `BAND_LABELS` |
| `src/providers/CompositionStateProvider.tsx` | `canonicalizeSettings` is the ONE boundary every write crosses — sanitising anywhere else would leave the panel, `Reset Map Style`, and `04-14`'s V3 record each free to forget (T-04-11-02) |
| `src/components/MapWorkspace.tsx` | The only component holding both the settings and `MapCanvas`; six prop lines |
| `src/components/LegendOverlay.tsx` | It held the ONLY copy of the composition font stack, and the text layer would have been the second. Aliased to `COMPOSITION_FONT_FAMILY` instead |
| `src/styles/interFontFace.ts` | The new home for that one stack |
| `src/utils/legend.ts` | `LEGEND_SAFE_INSET` exported so `TEXT_SAFE_INSET` can BE it rather than restate 32 |

### 6. [Reported] Only Task 2 was TDD, and only Task 2 is claimed as such

Tasks 3 and 4 were RED-proved by mutating **their own subjects** afterwards, not written test-first.

## Selector inventory

**335 → 338**, measured before and after by running assertion 21 and reading the reported number.

| Rule | File | Why it is not folded into something existing |
|---|---|---|
| `.composition-text__group` | `controls/compositionText.css` | a field, its counter, and its size pills are ONE control at `--space-xs`; the section's own `--space-md` is the distance BETWEEN fields, and reusing it leaves a counter floating equidistant between two inputs |
| `.composition-text__field` | `controls/compositionText.css` | `.panel-field` is MONOSPACED, authored for `#RRGGBB` entry. A creator's title is prose and takes the interface family at `--text-body-sm` (§ 6.8). It rides `.panel-field` for the box and overrides only the type |
| `.composition-text__counter--over` | `controls/compositionText.css` | the counter's `--destructive` state. The BASE is `.map-style__readout`, reused rather than copied — a counter *is* a readout, and `tabular-nums` is exactly what stops the number jogging as a creator types |

**The `Text` section otherwise cost ZERO**, and **the exported type cost zero structurally**: the
fill, family, size, weight, and anchor on every composition `<text>` are attributes, because the
clone is rasterised as an isolated document and a stylesheet rule cannot reach it.

## Export safety

- **PNG is exactly 1080 × 1080** — asserted from the `IHDR` on all six frames across the three
  gates.
- **No network entered the export path.** No `@import`, no URL, no fetch. `exportMapPng`'s
  signature did not widen and it still knows nothing about composition state.
- **Clone contract intact:** `layerOrder` is now `[null, 'surface', 'paint', 'camera', 'bands',
  'legend', 'text']`. The text layer is appended AFTER both the camera and the legend, so it shifts
  neither index and `isPreservedComposition`'s camera-before-legend check still holds. Asserted in
  all three places `04-10` named.
- **`ExportFailureReason` gained no variant.** `git diff src/types/ui.ts` across all four commits is
  empty.
- **Zero package-manager installs.** `package.json` and `package-lock.json` untouched, verified by
  `git diff --name-only`.
- **No file was deleted** by any of the four commits (`git diff --diff-filter=D` empty).

## Known Stubs

| Stub | File | Why |
|---|---|---|
| The six text settings are **not persisted** | `src/utils/storage.ts` | Same family as `surfaceColor`, the fills, the weights, and the four band fields. A saved composition reloads with no title. `04-14` owns the V3 record, and it also owns the pre-parse length budget for these strings (T-04-11-03's storage half) |
| **The legend still sits inside the top band** | `src/utils/legend.ts` | Carried forward from `04-10`, unchanged and not this plan's. `resolveBandExtents` is still exported and unread. `04-12` owns the band-aware inset. `04-11` makes it more visible, because the title now shares that space |
| The subtitle's `<textarea rows=2>` is a **single-line** field | `src/utils/compositionText.ts` | Newlines are stripped as `Cc`. The two rows are room to read a long line, not multi-line content — the character bound is a single-line derivation a wrapped value would silently escape. If multi-line subtitles are ever wanted, the bound and the layout both change |
| The `Map style` panel's **scroll behaviour is unmeasured** | `src/styles/editor.css` | Decision A accepts that five sections scroll. Nobody measured at what viewport height it starts to, or whether the scroll container's behaviour is acceptable |

## Threat Flags

None. Every surface this plan adds is inside the existing composition-state → clone → raster path
that `04-01` and `04-10` already mapped; no new network endpoint, auth path, file access, or schema
boundary. The one genuinely new trust boundary — creator keyboard → serialized `<text>` — is
`T-04-11-01`, which the plan's own `<threat_model>` names and which is mitigated structurally
(children, not markup) with the grep at zero.

## Verification

```
npm run lint                                    clean
npm test                                        822/822, 47 files
npm run build                                   clean (tsc -b && vite build)
npx playwright test --project=chrome            129/129, installed Chrome 151.0.7922.76
npm run data:world:check                        PASS (248 / 195 / 207; mesh 327 geometries)
```

## Notes for `04-12`, `04-13`, `04-14`, and `04-16`

- **`04-12`: the legend inset now has a second neighbour.** The title's baseline is
  `TEXT_SAFE_INSET + titleFontSize` = 76 at the medium step, and the subtitle sits below it. A
  band-aware legend inset that pushes the legend down to `LEGEND_SAFE_INSET +
  resolveBandExtents(...).top` will put it **under** the title rather than beside it. Whether that
  is right is a design question nobody has answered; it is not automatically an improvement.
- **`04-13`: the advance is shared.** `WIDEST_CHARACTER_ADVANCE_EM` and
  `LEGEND_CHARACTERS_PER_LINE` derive from ONE measurement. If the legend caption re-measures,
  move both in the same commit — and note that an assertion trying to *recover* the advance from
  the legend table cannot fail.
- **`04-14`: six new fields need V3 storage, and the strings need a PRE-PARSE budget.**
  `sanitizeCompositionText` bounds length at 100 code points *after* parsing; the storage boundary
  checks limits *before* `JSON.parse`, and that is the half `04-11` does not cover (T-04-11-03).
- **`04-16`: A12 is OPEN and physical.** Nothing here satisfies it. Also open for `04-16`: the
  `Text` section has had no screen-reader pass, no touch-target measurement, no 200% zoom check,
  and no dark-theme review.
- **A new composition layer joins FOUR assertions, not three.** `export.test.ts` ×2,
  `export.spec.ts`'s clone summary, and now the forced-overlap pixel gate.
- **Any future gate about text asserts PRESENCE before CORRECTNESS.** An ink count goes green for
  the wrong font, the wrong size, and the wrong string.
- **Any DERIVED crop must be bounded to the 1080 frame.** An off-frame `drawImage` source rect
  yields transparent black, and every ink counter in this suite reads that as solid ink.

## Self-Check: PASSED

- `src/utils/compositionText.ts`, `src/utils/compositionText.test.ts`,
  `src/components/CompositionTextPanel.tsx`, `src/styles/controls/compositionText.css` — all FOUND
- `21d4dc0` · `5c13750` · `2abf60c` · `7340618` — all four present in `git log`
- `grep -c 'data-layer="text"' src/components/MapCanvas.tsx` — **1**; the group is a SIBLING of the
  camera and follows `{legendSlot}`
- `grep -cE 'innerHTML|dangerouslySetInnerHTML|insertAdjacentHTML' src/components/MapCanvas.tsx` — **0**
- `grep -cE 'fill=\{?"?var\(' src/components/MapCanvas.tsx` — **0**
- `git diff src/types/ui.ts` across all four commits — **empty**
- last `./styles/*.css` import in `main.tsx` is line 37; `editor.css` import is line 37 — **equal**
- `grep -c "^\*Last updated:"` — **2** in `frontend.md` and **2** in `export.md`
- `git diff --name-only 21d4dc0~1 HEAD | grep package` — **no match**
- `git diff --diff-filter=D --name-only 21d4dc0~1 HEAD` — **empty**
- `.planning/STATE.md` and `.planning/ROADMAP.md` — **untouched**, verified by `git status`
- **No forbidden gsd-sdk verb was run** (`state.advance-plan`, `state.update-progress`,
  `roadmap.update-plan-progress`)
- The scratch Playwright probe (`zzmeasure.spec.ts`) was deleted before the commit that could have
  captured it; `git status --short` was clean of source modifications after every RED proof
