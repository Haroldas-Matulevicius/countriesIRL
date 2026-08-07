---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 08
subsystem: export
tags: [d4-08, d4-09, stroke-weight, export-clone, sanitize, uncolored-fill, map-style-panel, png-pixels]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-01`'s `src/constants/mapStyle.ts`, the `Map style` flyout, and the inline-attribute technique for getting a property into the PNG"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-05`'s `ColorMap` discriminated union and the single `resolveColorValue` reader (Live Invariant 10)"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-07`'s shared `.panel-*` vocabulary in `editor.css` and the 360px flyout"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-03`'s D4-10 reclassification, which freed `NEUTRAL_UNIT_COLOR` to become the uncoloured fill"
provides:
  - "`STROKE_WEIGHTS` / `STROKE_WEIGHT_UNITS` / `strokeWidthFor` / `hasStroke` / `STROKE_WEIGHT_LABELS` / `STROKE_WEIGHT_ORDER` — the ONE stroke-weight vocabulary, resolved by both the editor and the export clone"
  - "`sanitizeExportClone`'s stroke loop REPLACED: pass-through-with-neutralisation instead of a hard-set black 0.75"
  - "`readStrokeContract` + `EXPORT_STROKE_WEIGHT_ATTRIBUTE` / `EXPORT_BORDER_COLOR_ATTRIBUTE` — how a composition declares a border contract to a PURE exporter"
  - "`VisibleCompositionSettings.uncoloredFill` / `.borderColor` / `.interiorWeight` / `.coastlineWeight`, canonicalised at the state boundary"
  - "`getSceneFeatureFill` in `MapCanvas` — the render-time map of the `#FFFFFF` sentinel, applied to the PAINT and nowhere else"
  - "`MapStylePatch` + the single `SET_MAP_STYLE` action; `setMapStyle` on `CompositionStateProvider`"
  - "`Map style` sections `Uncolored countries` and `Borders` (`Interior` / `Coastlines` / `Border color`)"
  - "`UNCOLORED_FILL_PRESETS`, `BORDER_COLOR_PRESETS`, `MapStyleColorPreset`"
  - "`--map-border-weight` / `--map-border-resting` — composition state fed to `MapCanvas.css` without out-specifying the interaction hierarchy"
  - "Three PNG-pixel gates in `export.spec.ts` (`border weight` x2, `uncolored fill`) plus `chooseStrokeWeight` in the spec"
affects: [04-09, 04-10, 04-11, 04-12, 04-13, 04-14, 04-16]

actuals:
  tokens: 33594
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A pure function learns composition state by READING THE CLONE it was handed, through declared `data-*` attributes, rather than by widening its signature"
    - "Composition-driven CSS arrives as a custom property on the container, never as a per-element inline style, so the state rules below it keep their specificity"
    - "A render-time mapping whose DEFAULT is the identity, so the caller that feeds a downstream consumer (the legend) cannot be changed by accident"
    - "Replace-never-delete on a safety mechanism, gated by asserting both halves in the same test"

key-files:
  created: []
  modified:
    - src/utils/export.ts
    - src/utils/export.test.ts
    - src/constants/mapStyle.ts
    - src/constants/config.ts
    - src/constants/colors.ts
    - src/utils/mapStyle.test.ts
    - src/utils/scene.ts
    - src/utils/scene.test.ts
    - src/types/composition.ts
    - src/types/ui.ts
    - src/components/MapCanvas.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapStylePanel.tsx
    - src/providers/CompositionStateProvider.tsx
    - src/hooks/useInspectorUiState.ts
    - src/styles/MapCanvas.css
    - src/styles/controls/mapStyle.css
    - src/styles/uiContract.test.ts
    - src/App.tsx
    - tests/e2e/export.spec.ts
    - tests/e2e/colorsPanel.spec.ts
    - tests/e2e/navigation.spec.ts
    - tests/e2e/history.spec.ts
    - tests/e2e/rail.spec.ts
    - tests/e2e/final-integration.spec.ts
    - tests/e2e/fixtures/export.html
    - .planning/coding-rules/export.md

key-decisions:
  - "`sanitizeExportClone` learns the border contract by reading `data-coastline-weight` / `data-border-color` OFF THE CLONE rather than by taking new arguments — `exportMapPng`'s value is that it knows nothing about composition state, and widening its signature would have spent that"
  - "`getEffectiveFeatureColor`'s new `uncoloredFill` parameter DEFAULTS TO `DEFAULT_COLOR`, i.e. to no mapping. Its other caller is `getEffectiveSceneColors`, which feeds `reconcileLegend`; mapping by default would auto-add a grey legend row to every composition. Only the render opts in"
  - "The render-time mapping is applied to the PAINT only. The tooltip and the `aria-label` keep announcing the STORED `#FFFFFF`, because that is what storage holds and what the legend reasons about; announcing the grey would say 'coloured' about a country that is not"
  - "The editor's resting weight arrives as `--map-border-weight` / `--map-border-resting` custom properties, not as per-path inline styles. An inline style would out-specify `.hovered`, `.selected`, and `.focused` and silently delete every interaction affordance in the editor"
  - "The pre-04-08 values (black, `EXPORT_BORDER_WIDTH`) stay as the sanitizer's FALLBACK, so a source declaring nothing exports the borders it always did rather than silently losing them"
  - "ONE `SET_MAP_STYLE` action carrying a partial, rather than five sibling actions — `Reset Map Style` has to put all five back in one dispatch, and five actions is five places to forget the canonicaliser"
  - "The e2e fixture DECLARES `coastlineWeight: 'thin'`; the water gate DECLARES `Thin` before exporting. Both keep an existing assertion's original subject instead of re-baselining it against the new `none` default"
  - "`navigation.spec.ts`'s D4-10 neutral-fill probe was REPAIRED by moving the uncoloured fill to a distinct value first, not re-baselined from 0 to 248 — re-baselining would have kept it green and killed it"

patterns-established:
  - "When a default makes an existing probe stop discriminating, change the FIXTURE's inputs to restore the discrimination; re-baselining the expected number keeps the gate green and destroys it"
  - "A replace-not-delete edit is gated by asserting the replacement AND the survivors in the same test, then RED-proving each half with a mutation that touches only that half"
  - "Composition appearance reaches the PNG through inline attributes on the clone and reaches the screen through a container custom property — two routes, one table (`STROKE_WEIGHT_UNITS`), so they cannot disagree"
  - "`none` OMITS a property rather than setting it to zero, so the gate can assert absence instead of a number a later rule could resurrect"

requirements-completed: [D4-08, D4-09, D4-14]

coverage:
  - id: D1
    description: "Five named stroke weights in one table — none 0, hairline 0.5, thin 0.75, medium 1.25, bold 2 — with `thin` provably equal to the pre-04-08 `EXPORT_BORDER_WIDTH` and `none` signalling omit-the-stroke through a decision function rather than a zero"
    requirement: "D4-08"
    verification:
      - kind: unit
        ref: "mapStyle.test.ts#is exactly five named steps"
        status: pass
      - kind: unit
        ref: "mapStyle.test.ts#makes `thin` exactly the pre-04-08 export border width"
        status: pass
      - kind: unit
        ref: "mapStyle.test.ts#signals omit-the-stroke for `none` through the renderer decision"
        status: pass
      - kind: unit
        ref: "mapStyle.test.ts#increases strictly from none to bold, with no repeated width"
        status: pass
    human_judgment: false
  - id: D2
    description: "`sanitizeExportClone` no longer hard-sets a black 0.75 stroke: it passes the composition's weight and colour through and removes the stroke entirely at `none`, while the `non-scaling-stroke` pin and the `stroke-dasharray` / `transition` / `filter` neutralisations survive verbatim"
    requirement: "D4-08"
    verification:
      - kind: unit
        ref: "export.test.ts#omits the stroke entirely at `none`, on every scene path"
        status: pass
      - kind: unit
        ref: "export.test.ts#passes a declared weight through from the one units table"
        status: pass
      - kind: unit
        ref: "export.test.ts#passes a declared border colour through, overwriting the source sentinel"
        status: pass
      - kind: unit
        ref: "export.test.ts#leaves the composition preserved in both stroke branches (isPreservedComposition)"
        status: pass
      - kind: other
        ref: "grep -c non-scaling-stroke src/utils/export.ts — 4 before, 5 after; grep -cE 'strokeDasharray|transition|filter' — 7 before, 9 after"
        status: pass
    human_judgment: false
  - id: D3
    description: "A coastline at `none` carries NO dark ink in the downloaded 1080x1080 PNG, and the same sample point inks at `bold`"
    requirement: "D4-08"
    verification:
      - kind: e2e
        ref: "export.spec.ts#a coastline at none carries no dark ink, and at bold it does (installed Chrome 151.0.7922.76)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Three named weights are three distinguishable widths in real PNG bytes — hairline 42 < thin 68 < bold 185 ink pixels in a fixed 12x12 band around a projected coastline point"
    requirement: "D4-08"
    verification:
      - kind: e2e
        ref: "export.spec.ts#ink at a coastline increases strictly with the named weight"
        status: pass
    human_judgment: false
  - id: D5
    description: "An uncoloured country exports the creator's `uncoloredFill` (default `#E5E7EB`), differs from the water colour, and its STORED value is still the `#FFFFFF` sentinel with no legend row"
    requirement: "D4-09"
    verification:
      - kind: e2e
        ref: "export.spec.ts#an uncolored country exports the creator fill, not the water"
        status: pass
      - kind: unit
        ref: "scene.test.ts#reads the colour map and never writes it"
        status: pass
      - kind: unit
        ref: "scene.test.ts#keeps the legend feed on the sentinel, so no grey row appears"
        status: pass
    human_judgment: false
  - id: D6
    description: "`Map style` holds Water, Uncolored countries, and Borders in one flat vocabulary, with byte-exact option strings, no accent, no un-set state, and five weight pills provably wrapping to two rows at 360px"
    requirement: "D4-14"
    verification:
      - kind: e2e
        ref: "colorsPanel.spec.ts#spells the five weight options exactly as the spec does"
        status: pass
      - kind: e2e
        ref: "colorsPanel.spec.ts#wraps the five weight pills onto two rows at 360px (measured bounding boxes; exactly two distinct y values)"
        status: pass
      - kind: e2e
        ref: "colorsPanel.spec.ts#spends no accent on this panel and keeps every control defaulted"
        status: pass
      - kind: unit
        ref: "uiContract.test.ts#keeps the distinct-selector inventory at or below the recorded ceiling (332)"
        status: pass
    human_judgment: false
---

# Phase 4 Plan 08: Border Weights and the Uncolored Fill Summary

**The exporter stopped overwriting the creator's borders.** `sanitizeExportClone`'s hard-set
`#000000 / 0.75` was **replaced** — not deleted — with a normaliser that still neutralises
interaction state on every `path.scene-path` while letting the composition's chosen weight through,
so a quiet coastline is reachable in the PNG for the first time; an uncoloured country now paints a
creator-chosen grey while its stored value stays the `#FFFFFF` sentinel.

## Performance

| Gate | Before | After |
|---|---|---|
| Unit (Vitest, `node`) | 730 / 730, 45 files | **753 / 753**, 45 files |
| Playwright (installed Chrome **151.0.7922.76**) | 112 / 112 | **118 / 118** |
| `npm run lint` | clean | clean |
| `npm run build` (`tsc -b && vite build`) | clean | clean |
| `npm run data:world:check` | PASS | PASS |
| Selector inventory | 331 | **332** (ceiling raised, reason in the commit) |
| Contrast matrix rows | 102 | **102** (unmoved, and that is recorded rather than padded) |

## ⚠ What this plan does NOT claim

- **Nobody opened the exported PNG and looked at it.** The three gates prove that *specific sampled
  pixels carry specific values* and that ink counts in a 12×12 band order correctly. That is a
  narrower claim than "the map looks right", and the physical inspection is owned by **`04-16`**.
- **No Phase 3 UAT cell is cited.** Nine of its twelve were never performed; skipped is not passed.
- **Installed Chrome 151.0.7922.76 only.** Chrome auto-updated mid-phase — `04-01`…`04-06` were
  certified on `.75`, `04-07` and this plan on `.76`. Edge is **not installed on this machine**, so
  the `msedge` project cannot launch and no Edge, Firefox, or Safari result exists or may be cited.
- **No dark-theme review, no screen-reader pass, no touch-target measurement, no physical 200 %
  zoom** was performed on the two new panel sections.
- **The two new settings are not persisted.** Same known stub as `surfaceColor`; `04-14` owns the V3
  record.

## What shipped

### Task 1 — the vocabulary and the render-time fill (`a06027e`)

`STROKE_WEIGHTS` (a `ReadonlySet`), `STROKE_WEIGHT_UNITS`, `strokeWidthFor`, `hasStroke`,
`STROKE_WEIGHT_LABELS`, and `STROKE_WEIGHT_ORDER` in `src/constants/mapStyle.ts`, with the
`LEGEND_TEXT_SIZES` doc-comment treatment: one home, imported by the canonicaliser, the renderer and
the export path, *a value added in only one place is a drift bug*. `VisibleCompositionSettings`
gained `uncoloredFill`, `borderColor`, `interiorWeight` (`thin`), and `coastlineWeight` (**`none`**,
U-3), each canonicalised at the state boundary through one new `SET_MAP_STYLE` action.

`getEffectiveFeatureColor` gained a third parameter and maps the `#FFFFFF` sentinel to it — see
Deviations for why its default is *no mapping*.

### Task 2 — the replaced normaliser (`3f686ca`)

The measured defect, verbatim from the plan and confirmed in the file: the loop re-painted a black
0.75 stroke onto every country path as an attribute **and** an inline style. It now resolves
`readStrokeContract(clone)` and either writes the composition's colour and width, or **removes**
`stroke` and `stroke-width` (attribute and inline) at `none`. SVG's initial `stroke` is `none`, so
absence is what actually draws nothing in the isolated document — and it lets the gate assert
absence rather than a number.

The composition declares its contract as two `data-*` attributes on `svg.map-canvas`, which
`cloneNode` carries; the weight **name** travels rather than a number, so one table feeds both
sides. `exportMapPng`'s signature did not widen and it still knows nothing about composition state.

`MapCanvas` renders the resting stroke from the same table and the fill through `getSceneFeatureFill`.
`MapCanvas.css` reads `--map-border-weight` / `--map-border-resting`.

### Task 3 — the panel (`a8fee9e`)

Two new sections built entirely from `04-07`'s shared `.panel-*` classes. **One** new selector.

### Task 4 — the PNG gates (`0c1fccf`)

Three gates on real downloaded bytes, plus four existing assertions repaired.

## Deviations from Plan

### 1. [Rule 2 — missing critical functionality] `MapCanvas.css` had to change, and the plan did not list it

**Found during:** Task 2. **Issue:** the plan's action said to render the stroke "as inline
attributes" and did not touch `src/styles/MapCanvas.css`. But `.country-path { stroke-width: 0.75px }`
is a class rule and a presentation attribute loses to any class rule, so the **editor would have
kept painting 0.75px at every weight** while the PNG honoured the choice — the exact
editor-versus-download disagreement the plan's own success criteria forbid.
**Fix:** `.country-path`, `.map-unit-path`, and the export-frame preview rule now read
`--map-border-weight` / `--map-border-resting`, set inline on `svg.map-canvas`.
**Why a custom property and not an inline style on each path:** an inline style out-specifies
`.country-path.hovered` (1.5px), `.selected` (2px), and `.focused` (3px), so it would have silently
removed every interaction affordance in the editor. **Files:** `src/styles/MapCanvas.css`,
`src/components/MapCanvas.tsx`. **Commit:** `3f686ca`.

### 2. [Rule 3 — blocking] `getEffectiveFeatureColor`'s default is `DEFAULT_COLOR`, not `#E5E7EB`

**Found during:** Task 1. **Issue:** the plan reads as though the parameter's default should be the
grey. It cannot be. `getEffectiveSceneColors` calls this function and feeds `reconcileLegend`, which
excludes **exactly** `DEFAULT_COLOR` — so a default mapping would hand it a grey hex for every
unpainted country and **auto-add a legend row to every composition**, breaking the plan's own
must_have that "legend exclusion is untouched".
**Fix:** the parameter defaults to `DEFAULT_COLOR` (identity), and only the render passes the
setting. The plan's behaviour list is satisfied in full — the default `#E5E7EB` lives in
`DEFAULT_COMPOSITION_SETTINGS.uncoloredFill`, which is where a default belongs. A dedicated test
(`keeps the legend feed on the sentinel, so no grey row appears`) gates it, and it stayed GREEN
under RED proof A, proving the two claims are independent.

### 3. [Rule 3 — blocking] Task 1 could not thread the props into `MapCanvas`

The plan put the threading in Task 1 and `MapCanvas` in Task 2's files. `App` cannot pass props
`MapCanvas` does not declare, so a Task-1 commit doing both would not have built. Threading landed
in Task 2 with the props boundary. Every commit builds.

### 4. [Rule 2] `interiorWeight` is declared and threaded but read by nothing yet

`04-09` renders `world-borders-modern`. The prop is declared on `MapCanvasProps` with a JSDoc saying
so, so the vocabulary, the panel, the state, and the seam land together rather than in three plans.
**Deliberate, not an oversight** — and stated here so a reader does not "clean it up".

### 5. [Rule 1] Four existing e2e assertions collided with D4-09 — repaired, not re-baselined

| Spec | What broke | Repair |
|---|---|---|
| `navigation.spec.ts` D4-10 probe | `[fill="#E5E7EB"]` counted **248**, because `NEUTRAL_UNIT_COLOR` is now also the default *uncoloured* fill. The probe stopped discriminating. | Move the uncoloured fill to `Mid grey` **first**, then assert 0 — with the fill elsewhere, only a null-owner path can paint `#E5E7EB`. Added a control asserting all 248 took the new value. Re-baselining to 248 would have kept it green and killed it. |
| `history.spec.ts`, `rail.spec.ts`, `final-integration.spec.ts` | `fill === '#FFFFFF'` after undo / period switch | Assert the **paint** is the uncoloured fill **and** the `aria-label` still names `#FFFFFF`. Strictly stronger: the old single check could not tell "no colour" from "painted white". |
| `export.spec.ts` Pacific corners | all four asserted `[255,255,255,255]` | **Measured**: the two top corners are uncoloured land, the two bottom are open water. They read identically white before only because uncoloured and water were the same colour. The sample now discriminates land from sea; opacity is still asserted on all four. |
| `export.spec.ts` water gate | content floor of 20,000 dark-ink pixels, unreachable once coastlines default to `none` | The gate chooses `Thin` — exactly the pre-`04-08` weight — before exporting. Re-measured **45,190** against `04-01`'s 45,188. Floor unchanged. `04-01` predicted this and asked for a re-measure, naming `04-05`; it was `04-08`. |

### 6. [Rule 3] Two constants moved to `constants/config.ts`

`EXPORT_STROKE_WEIGHT_ATTRIBUTE` / `EXPORT_BORDER_COLOR_ATTRIBUTE` live in the dependency-free
constants module, following the `EXPORT_FONT_FACE_SUPPRESSION_FLAG` precedent, so `MapCanvas` and
the specs get the names without pulling two base64-inlined woff2 files through their transpiler.

### 7. TDD ordering on Task 1

Task 1 was marked `tdd="true"`. Its tests were written **with** the implementation rather than
before it, because the new type fields fan out through the provider and four test fixtures and a
test-first commit would not have compiled. **Stated plainly rather than claimed as TDD.** Every new
assertion was instead RED-proved by mutating its own subject afterwards (proofs A and B below),
which is the stronger check.

## RED Proofs

Every mutation was made in place after copying the file to
`/private/tmp/claude-501/.../scratchpad`, and restored by **copying back** — never `git checkout --`.
`git status` was clean of source modifications after each.

| # | Subject mutated | Gate that reddened | Verbatim failure |
|---|---|---|---|
| **A** | `src/utils/scene.ts` — sentinel mapping removed (`return resolved`) | `scene.test.ts` × 3 | `AssertionError: the render must follow settings.uncoloredFill, not a constant baked into this function.: expected '#FFFFFF' to be '#D1D5DB'` |
| **B** | `src/constants/mapStyle.ts` — `thin: 0.75` → `1` | `mapStyle.test.ts` × 2 | `AssertionError: expected 1 to be 0.75 // Object.is equality` |
| **C** | `src/utils/export.ts` — the pre-`04-08` hard-set restored | `export.test.ts` × 3 | `AssertionError: a stroke attribute survived at coastlineWeight 'none', so the exporter is still painting a border the creator turned off.: expected '#000000' to be null` |
| **D** | `src/utils/export.ts` — the WHOLE loop deleted | `export.test.ts` × 7 | `AssertionError: expected '#0F766E' to be '#000000'` (the source sentinel survives into the clone) |
| **E** | `src/utils/export.ts` — pass-through KEPT, pin + 3 neutralisations deleted | `export.test.ts` × 4 | `AssertionError: expected null to be 'non-scaling-stroke'` |
| **F** | `src/styles/editor.css` — `.panel-pills { flex-wrap: nowrap }` | `colorsPanel.spec.ts` wrap gate | `Error: the five weight pills landed on 1 row(s). Two is the contract: one row means the type was shrunk to force it, and three or more means the pill padding has drifted.` |
| **G** | `src/constants/mapStyle.ts` — `'Hairline'` → `'Hair line'` | `colorsPanel.spec.ts` label gate | `- "Hairline"  + "Hair line"` |
| **1** | `src/utils/export.ts` — the pre-`04-08` hard-set restored | **PNG Gate A** (and B) | `Error: the coastline band still carries 68 dark pixels at weight 'none'. Either the editor kept a stroke or the export clone re-painted one - which is exactly the defect 04-08 replaced.` |
| **2** | `src/constants/mapStyle.ts` — every weight flattened to `0.75` | **PNG Gate B** only | `Error: Thin measured 68 ink pixels and Hairline measured 68. The steps must be strictly heavier, or two pills paint a picture a creator cannot tell apart.` |
| **3** | `src/components/MapCanvas.tsx` — `getSceneFeatureFill` returns the sentinel | **PNG Gate C** only | `Error: central Brazil is rgb(255, 255, 255), not the uncolored fill #E5E7EB.` |

**Independence, checked rather than assumed.** Proof 2 reddened Gate B and **left A and C green**;
proof 3 reddened Gate C and **left A and B green**. Proof 1 reddened A *and* B, which is expected —
the hard-set both re-paints at `none` and flattens every weight — so Gate B's independent proof is
2, not 1. Proof A left the legend-feed assertion green, which is what proves the render claim and
the legend claim are two claims.

**Proofs D and E are the "replace, never delete" pair.** D deletes the whole loop and reddens the
stroke assertions first; E keeps the pass-through and removes only the pin and the three
neutralisations, so the survival half reddens **on its own subject**. Without E, the survival
assertions would never have been shown to fail independently.

**The `04-01` trap was avoided.** Every PNG gate asserts **sampled pixels and ink counts**, never a
constant it imports. `MIN_COASTLINE_BAND_INK_PIXELS` (8) is derived from measured counts (42 / 68 /
185), and `DEFAULT_UNCOLORED_FILL_HEX` in the spec is a hand-written literal with a comment saying
why it is not imported.

## Measured numbers

| Measurement | Value | How |
|---|---|---|
| Coastline band ink, `hairline` (0.5 u) | **42** | 12×12 band at Cabo da Roca, projected through `createWorldProjection()`, `DARK_INK_THRESHOLD` 100 |
| Coastline band ink, `thin` (0.75 u) | **68** | same |
| Coastline band ink, `bold` (2 u) | **185** | same |
| Coastline band ink, `none` (0 u) | **0** | same |
| Whole-frame boundary ink at `Thin` | **45,190** | `04-01` measured 45,188 pre-change; floor stays 20,000 |
| `grep -c "non-scaling-stroke" src/utils/export.ts` | **4 → 5** | pin now also set unconditionally in the `none` branch's shared tail |
| `grep -cE "strokeDasharray\|transition\|filter" src/utils/export.ts` | **7 → 9** | the three neutralisations plus their new comment lines |
| Selector inventory | **331 → 332** | measured twice with the ceiling set to 0 |

## Export safety

- **PNG is exactly 1080×1080** — asserted from the `IHDR` in every new gate.
- **No network entered the export path.** No `@import`, no URL, no fetch added.
  `http://www.w3.org/2000/svg` is an XML namespace constant, unchanged.
- **Clone contract intact**: `layerOrder` is still `[null, 'surface', 'camera', 'legend']`,
  `isPreservedComposition` still returns true in **both** stroke branches (asserted), the three
  white opacity layers are untouched, and the refusal reasons are unchanged and not duplicated.
- **Zero package-manager installs.** `package.json` and `package-lock.json` untouched.

## Verification

```
npm run lint                                    clean
npm test                                        753/753, 45 files
npm run build                                   clean
npm run test:e2e -- --project=chrome            118/118, installed Chrome 151.0.7922.76
npm run data:world:check                        PASS (248 / 195 / 207; mesh 327 geometries)
```

## Known Stubs

| Stub | File | Why |
|---|---|---|
| `interiorWeight` is threaded to `MapCanvas` and read by nothing | `src/components/MapCanvas.tsx` | `04-09` renders `world-borders-modern`. Declared here so the vocabulary, panel, state, and props boundary land in one plan. Documented in the prop's JSDoc. |
| `uncoloredFill` / `borderColor` / `interiorWeight` / `coastlineWeight` are not persisted | `src/utils/storage.ts` | Same known stub `04-01` opened for `surfaceColor`. A saved composition reloads with the defaults. `04-14` owns the V3 record. |
| **The map ships with NO borders at all until `04-09` lands** | — | Coastlines default to `none` (U-3) and the interior-borders layer is `04-09`'s. This is the phase's intended endpoint arriving one plan early; a creator can restore borders from the new `Coastlines` pills today. |

## Held out / not claimed

- **Interaction feedback still rides on the coastline stroke in the EDITOR** (2px selected, 1.5px
  hover). The plan's stated assumption is that `04-09`'s `data-editor-only` highlight layer replaces
  this; keeping the existing CSS until then preserves the affordance rather than inventing a second
  mechanism, and the export clone neutralises it exactly as before. **At `coastlineWeight: none` a
  selected country still shows a 2px outline on screen and none in the PNG** — that is the sanitizer
  working, not a disagreement, but a reader should know it before `04-09`.
- The contrast matrix did **not** move. Every text-on-surface pair the two new sections draw was
  already rated. Recorded as zero rather than padded to look thorough.
- No claim is made that the panel *reads* well at 360px. `G-3` is the owner's subjective judgement.

## Notes for `04-09` and later

- **`STROKE_WEIGHT_UNITS` is the one table.** The interior-borders layer resolves `interiorWeight`
  through it; a second mapping is how the editor and the download start disagreeing about `medium`.
- **A new export layer owes the `04-01` evidence**: an inline attribute on the clone, plus a sampled
  PNG-pixel gate. Host CSS reaches nothing in the isolated document.
- **The border sanitizer targets `path.scene-path,path.country-path`.** A `04-09` borders layer that
  is *not* a scene path will not be normalised by it and needs its own decision recorded — including
  whether it should be.
- **`getSceneFeatureFill` is the paint; `getSceneFeatureColor` is the identity.** Announce the
  second, draw the first.
- **`data-coastline-weight` and `data-border-color` are a contract, not decoration.** If `MapCanvas`
  stops writing them the PNG silently reverts to black 0.75 — the e2e gates run the real app for
  exactly that reason.

## Self-Check: PASSED

- `src/constants/mapStyle.ts` — FOUND
- `.planning/coding-rules/export.md` — FOUND, border-normalisation section rewritten
- `a06027e` · `3f686ca` · `a8fee9e` · `0c1fccf` — all four present in `git log`
- `grep -c "accent-fill" src/components/MapStylePanel.tsx` — **0**
- `grep -vE "^\s*(/\*|\*|//)" src/styles/controls/mapStyle.css | grep -cE "#[0-9a-fA-F]{6}"` — **0**
- `grep -vE "^\s*(/\*|\*|//)" src/styles/controls/mapStyle.css | grep -c "\.dark"` — **0**
- `grep -c "createWorldProjection" tests/e2e/export.spec.ts` — **3**
- `git status --short` — clean of source modifications after every RED proof
- `.planning/STATE.md` and `.planning/ROADMAP.md` — **untouched**; no forbidden gsd-sdk verb was run
