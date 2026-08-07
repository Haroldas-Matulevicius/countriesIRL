---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 12
subsystem: render
status: complete
tags: [d4-11, d4-13, legend, one-way, storage-migration, band-aware-inset, g-1, oq-3, cd-3, cd-4, cd-7, u-14, png-pixels, selector-ceiling-down]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-10`'s `resolveBandExtents` — the ONE reader of how far each band reaches, which this plan's legend inset consumes rather than re-deriving"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-11`'s `g[data-layer=\"text\"]` as the last composition layer, the title baseline of 76 that made the under-vs-beside question concrete, `COMPOSITION_INK_COLOR`, and the phantom-pixel rule for derived crops"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-05`'s `resolveColorValue` chokepoint — the legend still receives resolved hexes and dedupes by hex, unchanged"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    provides: "`03-UAT.md` § Gaps `G-1`, the carried-forward complaint this plan measures and does NOT claim to resolve"
provides:
  - "`LegendState` reduced to three fields — `entries`, `position`, `textSize`. `theme`, `backgroundOpacity`, and `borderStyle` are GONE, permanently"
  - "A chrome-free `LegendOverlay`: no background rect, no border, no fill opacity. Labels take `COMPOSITION_INK_COLOR`, imported from `utils/contrast.ts`"
  - "`getLegendCornerPosition(corner, bounds, bandExtents)` — the band-aware inset, `LEGEND_SAFE_INSET + bandExtents.top` / `.bottom`. `bandExtents` is REQUIRED on it, on `resolveLegendPosition`, on `resolveLegendRender`, and on `validateActiveLegend`"
  - "`resolveLegendBounds(legend, effectiveColors)` — the legend's box alone, for callers that need placement-free bounds"
  - "`bandExtents` props on `LegendOverlay` and `LegendEditor`; `legendBandExtents` derived once in `App`"
  - "A V2 record carrying the three deleted fields loads with `ok: true` and NO warning — asserted in both directions"
  - "`coding-rules/storage.md` § A removed field is not a damaged one"
  - "`tests/e2e/legend.spec.ts` § G-1 investigation — the legend's geometry, type, swatch, and band overlap recorded as assertions from the running editor"
  - "`export.spec.ts` § `04-12 D4-13: toggling the top band moves the exported legend by exactly the band height` — a per-property PNG gate with no baseline image"
  - "`expectRegionInsideFrame` in `export.spec.ts` — every derived crop bounded to the 1080 frame absolutely"
affects: [04-13, 04-14, 04-16]

actuals:
  tokens: 49000
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "An invariant that can no longer be violated is RETIRED in place, never silently deleted — a reader who finds a row missing cannot tell whether it was dropped or was never true"
    - "A field this version no longer MODELS is not corruption. Only a value that is INVALID is. Reporting the first fires a creator-facing corruption toast on every reopened map for a migration that succeeded"
    - "Delete a control's CSS in the same commit as the control and LOWER the ceiling — a selector inventory that only ever rises is a budget nobody spends down"
    - "A derived geometry parameter is REQUIRED, never defaulted to zero: a silent `{top: 0, bottom: 0}` is indistinguishable from a call site that forgot, and the compiler is the only reliable catch"
    - "When a change removes the mechanism a pixel gate depended on, say so and re-point the gate — a green assertion whose subject the change neutralised is worse than no assertion"
    - "Assert an ABSENCE explicitly (`not.toContain`, `toHaveCount(0)`). A deleted `expect` proves nothing and reads as coverage"

key-files:
  created: []
  modified:
    - src/types/composition.ts
    - src/utils/legend.ts
    - src/utils/legend.test.ts
    - src/utils/storage.ts
    - src/utils/storage.test.ts
    - src/providers/CompositionStateProvider.tsx
    - src/components/LegendOverlay.tsx
    - src/components/LegendOverlay.test.tsx
    - src/components/LegendEditor.tsx
    - src/components/LegendEditor.test.tsx
    - src/hooks/useCompositionSaveTransaction.ts
    - src/hooks/useCompositionSaveTransaction.test.tsx
    - src/hooks/useCompositionLoadTransaction.ts
    - src/hooks/useCompositionLoadTransaction.test.tsx
    - src/hooks/useCompositionState.test.tsx
    - src/styles/controls/legendEditor.css
    - src/styles/uiContract.test.ts
    - src/App.tsx
    - tests/e2e/legend.spec.ts
    - tests/e2e/export.spec.ts
    - tests/e2e/persistence.spec.ts
    - tests/e2e/fixtures/legend.html
    - tests/e2e/fixtures/export.html
    - tests/e2e/support/historicalFixture.ts
    - Design.md
    - .planning/REQUIREMENTS.md
    - .planning/coding-rules/general.md
    - .planning/coding-rules/storage.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UI-SPEC.md

key-decisions:
  - "OWNER GATE = `legend-delete-chrome`. Three persisted fields leave `LegendState` permanently. Answered under a **blanket, in-advance, sight-unseen proceed-authorization** — it authorizes proceeding, it is **not** a content review, and it is **not** hash-bound (Immutable Safety Constraint 8)"
  - "The open question `04-11` handed forward is answered: the legend goes UNDER the title block, not beside it. The reference puts it there, D4-13 specifies ~14%, and 152 clears a title baseline of 76"
  - "The inset is DERIVED from `resolveBandExtents`, never a hard-coded `y = 152`. RED-proved: hard-coding 152 reddens the band-at-cap case at `expected 152 to be 186`"
  - "`bandExtents` is a REQUIRED parameter, not one defaulted to `{top: 0, bottom: 0}`. Every call site had to state its band configuration, and the compiler enforced it"
  - "A CUSTOM legend position is deliberately NOT band-aware. A creator who dragged the legend somewhere chose that spot; the band inset is a preset's resting place, not a no-go zone"
  - "`DEFAULT_LEGEND_POSITION` is UNCHANGED at `{x: 32, y: 32, preset: 'top-left'}`. The arithmetic moves it, so no stored value had to be written back and no migration is implied by D4-13"
  - "A V2 record's three deleted fields are silent, not repaired. `isRepaired` raises `composition-repaired`, which reaches the creator as a corruption toast — counting a dropped field would alarm on every reopened map forever"
  - "`export.spec.ts`'s **legend-before-text PIXEL assertion is RETIRED**, said plainly rather than left green. It worked because a 90%-opaque panel attenuated the glyphs; with the panel gone the crop reads the same either way. Replaced by a live-DOM layer-order assertion and an honestly relabelled co-occupancy claim"
  - "The per-property PNG gate landed in `export.spec.ts`, not `legend.spec.ts` as planned — every PNG decode helper lives there, and a second decode path in another spec is how two sampled-pixel assertions quietly start decoding differently"
  - "Legend labels take `COMPOSITION_INK_COLOR` imported from `utils/contrast.ts` rather than a fourth `#111827` literal: the legend and the composition text now sit on one surface"

requirements-completed: [D4-11, D4-13]
---

# Phase 4 Plan 12: Legend chrome deletion and the band-aware inset — Summary

The legend lost its box outright and moved below the title block: `theme`,
`backgroundOpacity`, and `borderStyle` are deleted from `LegendState`
permanently, and a top-anchored preset is now inset by
`LEGEND_SAFE_INSET + bandExtents.top` — `{x: 32, y: 152}` at the Phase 4
defaults, derived from `04-10`'s `resolveBandExtents` rather than from a
literal.

---

## Task 1 — the owner gate, answered

**Decision: `legend-delete-chrome`.** `theme`, `backgroundOpacity`, and
`borderStyle` are removed from `LegendState` permanently, making the bare
legend the only reachable state.

**Reasoning recorded:**

- It is **D4-11 as already decided by the owner**; the gate re-confirmed the
  one-way move rather than reopening it.
- The alternative keeps a **parallel legacy renderer with its own gates** — the
  two-models-coexisting complexity that produced the `G-3` complaint in the
  first place. Deleting makes the restrained look **structural**, so the box
  stops being *reachable* rather than becoming an unfashionable default.

**Creator-visible consequence, explicitly acknowledged and accepted:** every
saved map reopens with **no legend box** — no background panel, no border, no
fill opacity — regardless of what it was saved with. A creator who deliberately
chose a dark legend theme and 90 % background opacity **will not get it back**,
and that map's exported PNG **will differ from one they may already have
posted**. There is nothing to restore the fields from once V3 records are
written.

**Not deleted, and verified surviving:** `textSize`, `position`, entry labels,
entry ordering, and `LEGEND_MAX_ACTIVE_ENTRIES = 30` with
`LEGEND_OVERFLOW_MESSAGE` still gating export unchanged.

**Authorization, in the required words:** answered under a **blanket,
in-advance, sight-unseen proceed-authorization**. It **authorizes proceeding**;
it is **not a content review** and it is **not hash-bound** (Immutable Safety
Constraint 8).

The gate was not stopped on — the answer was supplied with the task and
recorded here.

---

## Task 2 — what the legend measurably is, before naming a cause

Measured from the **real app** on **installed Chrome 151.0.7922.76**, one
country painted red, at the default preset. Recorded as assertions in
`tests/e2e/legend.spec.ts` § *G-1 investigation*, not as prose that nothing
re-checks.

| property | measured (pre-fix) |
|---|---|
| top edge | `y = 32` — **2.96 %** of the 1080 square |
| left edge | `x = 32` — the same rule the title, subtitle, and attribution align on |
| footprint | **336 × 96** (one column) — **8.89 %** of frame height |
| overlap with the top band | **88 units of the legend sit inside** the 120-unit title band |
| label type | 32 user units, weight 600 |
| swatch | 24 × 24, `stroke="#9CA3AF"` |

The block cross-checks the DOM against `resolveLegendRender` **first**, so
every fraction below it is a measurement of the legend rather than of an
arbitrary rectangle.

### Every legend property that could plausibly read as "off", classified

| # | property | measured / current | classification |
|---|---|---|---|
| 1 | **vertical position** — 2.96 % from the top, inside the title band | `y = 32` | **addressed by this plan** (Task 4 → `y = 152`, 14.07 %, zero band overlap) |
| 2 | **total footprint versus the reference's ~8 % of frame height** | 96 units = 8.89 % at one entry; 3 columns × 10 two-line rows reaches 760 = 70 % | **partly addressed by `04-13`** — the bar form changes the growth curve. At one entry it is already at the reference; the problem is how it scales |
| 3 | **`LEGEND_COLUMN_WIDTH: 288` row layout versus the reference's contiguous bar** | a 288-unit column per entry, 1–3 columns | **addressed by `04-13`** — this is the bar form's whole subject |
| 4 | **entry gap** — `LEGEND_ENTRY_GAP` 8 with `LEGEND_ENTRY_HEIGHT` 48 | 56 units per single-line row | **still open.** Untouched here; `04-13` may or may not revisit it |
| 5 | **label typography** — 32 units at weight 600 for a legend label | same weight as a title | **still open.** Weight 600 on meta text is a deliberate Phase 3 choice (D-25) that nobody has re-examined against the reference |
| 6 | **swatch size and shape** — 24 × 24 with `rx="4"` and a 2-unit `#9CA3AF` stroke | unchanged | **still open.** The reference uses flat bar segments with no stroke |
| 7 | **the box itself** — background, border, fill opacity | deleted | **addressed by this plan** (Task 3) |
| 8 | **left alignment** — hugging the 32 rule | `x = 32`, unchanged | **not a defect.** Confirmed to match the reference |

### CD-7, corrected and recorded

`04-CONTEXT.md` OPEN QUESTION 3 attributes a known-wrong placement formula in
`03-UI-SPEC.md` to the legend. **It is not the legend's.** The RED-proved
defect is **`.map-navigation`'s `inset-inline-end`**, which lands the floating
camera cluster inside the frame corner at every aspect ratio. The **advice**
— verify against the running editor before committing to a cause — **stands**,
and this task is that verification. The **stated cause does not apply to
`G-1`**. The correction is recorded in the spec block's doc comment, where a
reader will look for it.

### ⛔ What this task does NOT claim

**`G-1` is NOT resolved, and this plan does not claim it is.** The complaint
is subjective — *"the legend is a bit too high"*, then *"I dont know the entire
legend is off and just not write"*. Whether the owner considers it answered is
a **`checkpoint:human-verify` in `04-13`**, after both the position change and
the new bar form exist, and `04-VALIDATION.md` lists cartographic resemblance
as manual-only. **`OQ-3` stays OPEN.**

---

## Task 3 — the chrome, deleted; four documents, amended

### The cascade

Removed outright: `LegendTheme`, `LegendBorderStyle`, the three `LegendState`
fields, `LEGEND_THEMES`, `LEGEND_BORDER_STYLES`,
`DEFAULT_LEGEND_BACKGROUND_OPACITY`, `BACKGROUND_OPACITY_MIN` / `MAX` / `STEP`,
`isBackgroundOpacityValid`, three `LegendValidationIssue` members and their
`validateLegend` branches, `normalizeLegend`'s three normalisations,
`normalizeLegendOpacity` and its four range constants, `THEME_COLORS`,
`getBackgroundOpacity`, `getBorderWidth`, `LegendThemeColors`, `getStyleState`,
`setTheme`, `THEME_OPTIONS`, `BORDER_OPTIONS`, and
`MIN`/`MAX_LEGEND_BACKGROUND_OPACITY` in the provider. `LegendStyleState`
collapsed to `Pick<LegendState, 'textSize'>`; `canonicalizeLegendStyle` and
`areLegendsEqual` shrank with it; both composition transactions' clone shapes
lost three lines each.

Legend labels now take **`COMPOSITION_INK_COLOR`** imported from
`utils/contrast.ts` — the same `#111827` the title, subtitle, and attribution
use — rather than a fourth literal. The legend and the composition text now sit
on one surface; two spellings of the ink is how they stop agreeing.

`LegendEditor`'s three chrome `<fieldset>`s are gone. **`Legend text size`
survives**, and the **`Position` picker is byte-identical**, announcements
included.

### The one deliberate behaviour, and the storage boundary

A V2 record carrying all three deleted fields loads with **`ok: true` and
`warnings: []`**. `isRepaired` deliberately ignores their presence: it is what
raises `composition-repaired`, and that reaches the creator as a corruption
toast — counting a dropped field would fire it on **every reopened saved map**,
forever, for a migration that succeeded. The distinction is *"field removed by
this version"* versus *"value invalid"*, and only the second is reported. Both
directions are asserted in `storage.test.ts` and both were RED-proved.

**What `04-14` inherits, stated explicitly.** The SAVE side changed too:
`useCompositionSaveTransaction` no longer writes the three fields, so the V2
legend record it emits is `{entries, position, textSize}` — three keys, not
six. `tests/e2e/persistence.spec.ts` now asserts that saved **key set** rather
than a dropped value, so a field creeping back reddens it. No bound moved:
`MAX_STORED_LEGEND_ENTRIES` (512), `MAX_LEGEND_LABEL_LENGTH` (32), and the
pre-`JSON.parse` raw-length check are untouched. `04-05`'s note still stands
unchanged beside this: saves still resolve colour values to hex at
serialization, and `04-14` owns the V3 bump for both.

### Selector inventory: 338 → 335, LOWERED

**Measured both ways** by running the assertion with the ceiling at 0: **338
before, 335 after.** The delta is exactly three rules in
`src/styles/controls/legendEditor.css`, deleted with the controls they styled:

| rule | what it styled |
|---|---|
| `.legend-editor > fieldset > label` | the opacity slider's Porcelain label card |
| `.legend-editor > fieldset > label > span` | that card's weight-500 heading |
| `.legend-editor input[type="range"]` | the slider itself |

`Theme` and `Border` left at **zero cost**, because they had reused
`.legend-editor fieldset fieldset` and `.legend-editor__pill` — which the
surviving `Text size` group still needs. Reuse makes a deletion cheap as well
as an addition. The reason is stated in the ceiling's own doc comment and in
the commit.

### The four document amendments — all annotated, none rewritten

1. **`coding-rules/general.md` — Live Invariant 8 RETIRED (CD-4).** The row
   stays, struck through, dated, with the reason: the field it governed no
   longer exists, so the 0–1-fraction repair has nothing to repair. It names
   its live successor (`storage.md` § A removed field is not a damaged one).
2. **`REQUIREMENTS.md` F4.5 — supersession annotation (CD-3).**
   `git diff .planning/REQUIREMENTS.md` shows **only additions** on the F4.5
   lines: 13 insertions, 0 deletions. Original requirement text untouched, in
   the style F2 / F3 / F7 already carry.
3. **`Design.md` § 4 — the legend colour exemption amended.** The superseded
   paragraph is struck through, not deleted. The exemption now covers exactly
   one literal (`stroke="#9CA3AF"`); the label ink left it entirely; the
   name-collision warning is retired with the field it warned about.
4. **`03-UI-SPEC.md` — two dated annotations.** U-14 on the ghost-gray
   placeholder and counter rows (resolved in favour of the `Design.md` § 2
   measurement: 3.88:1 on Porcelain, 3.60:1 on Powder in dark — a placeholder
   is text), and a D4-11 note on the "four `<fieldset>`s" paragraph. Both rows
   preserved verbatim.

Plus **`coding-rules/storage.md`** gained § *A removed field is not a damaged
one*, landed in the same commit as the behaviour.

### `03-UI-SPEC.md` divergences — this is the THIRD

Recorded because the plan asked for it: U-14 joins **CD-1's width amendment**
and the **still-unannotated `.map-navigation` `inset-inline-end` placement
formula** as known divergences in that approved document. The third is now
annotated; the `.map-navigation` one is still not, and this plan did not touch
it.

### U-14, honestly: the code already did this

`.legend-editor__counter` already carried `--themely-slate-blue`, with the
reason inline, before this plan. There was **no code change to make** — the
missing piece was the spec annotation. An approved spec saying ghost gray while
the code says slate blue is a divergence, not a fix, and it is now recorded as
one. There is also **no `placeholder` attribute** on the label input at all, so
half of U-14's subject does not currently exist in the DOM; the rule is
annotated for whoever adds one.

---

## Task 4 — the band-aware inset

### The open question `04-11` handed forward, answered

`04-11` measured the title baseline at **76** while the legend's inset was
**32**, and flagged that a band-aware inset would push the legend *under* the
title rather than beside it — "a design question nobody has answered."

**Answered: under the title is correct.** The reference has the title at the
top and the legend **below** it, left-aligned. `D4-13` and this phase's plan
text already specify ~14 % down the square, *"below the title block and hugging
the left edge, by an inset that follows the top band's height rather than a
hard-coded number."* 14 % of 1080 ≈ 151; the derived value is **152**, which
clears a baseline of 76 comfortably. `04-11`'s observation was the intended
layout, not a conflict.

### The implementation

`getLegendCornerPosition(corner, bounds, bandExtents)` insets a top-anchored
preset by `LEGEND_SAFE_INSET + bandExtents.top` and a bottom-anchored one by
the bottom band, clamped into the legal range for the current bounds.
`bandExtents` comes from **`resolveBandExtents`** — consumed, never
re-derived; there is no second `visible ? height : 0` anywhere.

`bandExtents` is **required**, not defaulted, on `getLegendCornerPosition`,
`resolveLegendPosition`, `resolveLegendRender`, and `validateActiveLegend`. A
silent `{top: 0, bottom: 0}` is indistinguishable from a call site that forgot,
and the compiler is the only thing that catches that reliably. `App` derives
`legendBandExtents` once and hands it to the overlay, the editor, and the
export gate, so all three place the legend identically.

`resolveLegendBounds` was split out for callers that need the box and not the
placement — a band **moves** the legend, it never resizes it.

**Live Invariant 3 holds.** Only `getLegendCornerPosition` changed;
`resolveLegendPosition` / `resolveLegendRender` remain the only readers of
`legend.position` on a render or export path. Verified by counting raw
`legend.position` occurrences per file against `33dd939` (pre-plan):
`CompositionStateProvider.tsx` 2 → 2, `LegendEditor.tsx` 5 → 5,
`useCompositionLoadTransaction.ts` 1 → 1, `useCompositionSaveTransaction.ts`
1 → 1, `App.tsx` 1 → 1 — **byte-identical, no new reader.**

> ⚠ **Honest note on the acceptance criterion as literally written.** The plan
> asked for `grep -rn "legend.position" src/ … | grep -v "legend.ts\|\.test\."`
> to return **nothing**. It does not, and it did not before this plan either:
> the surviving hits are a disclosure label, the reducer's canonicaliser,
> `.preset` reads for radio checked-state, two clone copies, and the two calls
> into the chokepoint itself. None is a raw read on a render or export path,
> which is what Invariant 3 actually says. The count-per-file comparison above
> is the check that can fail on the real subject.

`DEFAULT_LEGEND_POSITION` is **unchanged** at `{x: 32, y: 32, preset:
'top-left'}` — the arithmetic moves it, so nothing had to be written back to
stored state and D4-13 implies no migration of its own.

A **custom** position (`preset === null`) is deliberately **not** band-aware.
A creator who dragged the legend somewhere chose that spot; the band inset is a
preset's resting place, not a no-go zone.

### TDD

Seven behaviours were written as `legend.test.ts` cases first. **Five went red
as behaviour assertions** (not as import errors — the shape `04-02` caught):

```
expected 32 to be 152 // Object.is equality
expected 32 to be 186 // Object.is equality
expected 808 to be 688 // Object.is equality
expected { x: 32, y: 32, preset: 'top-left' } to deeply equal { x: 32, y: 152, preset: 'top-left' }
```

The other two — "top band off leaves the bare inset" and "a legend that would
leave the square is still clamped" — are **invariance** cases and correctly
passed before and after. Each number is asserted **twice**: as a literal, and
reproduced from `LEGEND_SAFE_INSET + bandHeight`.

### The per-property PNG gate

`export.spec.ts` § *`04-12` D4-13: toggling the top band moves the exported
legend by exactly the band height*. Two real downloads, **no baseline image
anywhere in this phase**:

0. both frames exactly **1080 × 1080**, read from the IHDR;
1. both derived crops bounded to that frame **absolutely** by the new
   `expectRegionInsideFrame` — `04-11` measured **28,050 phantom pixels** from
   an off-bitmap crop that `drawImage` filled with transparent black and an ink
   counter read as solid ink;
2. the geometry property: `regionOn.y − regionOff.y === BAND_DEFAULT_HEIGHT`,
   `x` untouched, band-on clears the band and band-off sits where it was;
3. **content floor first**, then a blank control at zero ink through the **same
   counter at the same threshold**;
4. the load-bearing claim: four samples of the opaque `#DE2D26` swatch —
   present at the band-on point in the band-on frame, present at the band-off
   point in the band-off frame, and **absent at the other's point in each** —
   so neither direction can be satisfied by a legend that simply vanished.

**The floor is derived from a measurement, and the threshold nearly destroyed
the gate.** At the default `INK_CHANNEL_THRESHOLD` (240) the crop measured
**36,225** — the whole rectangle, because `Warm paper` is (245, 239, 230) and
two channels sit under 240. At `DARK_INK_THRESHOLD` (100) it measures **2,085**
band-on and **2,062** band-off. Floor set at **1,000**, under half the smaller.
Both numbers and the 36,225 trap are recorded in the constant's doc comment.

`git status --porcelain` shows **no new `.png`** under any snapshot or baseline
directory.

---

## Deviations from Plan

### `[Rule 3 — blocking]` The per-property PNG gate landed in `export.spec.ts`, not `legend.spec.ts`

- **Found during:** Task 4.
- **Issue:** the plan put the gate in `tests/e2e/legend.spec.ts`. Every PNG
  decode helper it needs — `countInkAroundRegion`, `samplePngPoints`,
  `expectBlankControlReadsZeroInk`, `readPngDimensions`, `exportRealApp`,
  `hexToRgb` — is private to `export.spec.ts`, and `legend.spec.ts` drives a
  fixture with no real export path at all.
- **Fix:** the gate landed beside its counters in `export.spec.ts`.
  Duplicating a decode path is the defect `general.md` and
  `measureLegendCrops`' own comment name by name: *"two PNG decode paths in one
  spec is how a sampled-pixel assertion quietly starts measuring a differently
  decoded image."*
- **The acceptance criteria still hold:** `legend.spec.ts` exits 0 and
  `grep -c "resolveLegendRender" tests/e2e/legend.spec.ts` returns **4**.
- **Commit:** `6fa9eea`.

### `[Rule 1 — bug]` `export.spec.ts`'s "legend BEFORE text" pixel assertion could no longer fail

- **Found during:** Task 3.
- **Issue:** `04-11`'s Gate C proved paint order by counting title ink inside a
  crop that lay **inside the legend's 90 %-opaque background** — text painted
  under it would be attenuated to a tenth and read as zero. D4-11 deleted the
  background. Inside that crop the legend now paints **nothing**, so the title's
  glyphs land on water whether the legend draws before or after, and the count
  reads the same either way. It would have stayed green while proving nothing —
  the "gate whose subject the product neutralises" shape `CLAUDE.md` names.
- **Fix:** the pixel form is **retired in place**, struck through in the test's
  doc comment with the reason. Replaced by (a) a **live-DOM layer-order
  assertion** on the same composition that was just exported — `bands` before
  `legend` before `text` — and (b) the crop kept and honestly relabelled as the
  **co-occupancy** claim it now is, with its zero control intact. The structural
  form is also held at full strength by the existing `clone.layerOrder`
  assertion on the real clone.
- **RED-proved:** moving `{legendSlot}` after `g[data-layer="text"]` in
  `MapCanvas.tsx` reddens the new assertion.
- **Commit:** `cd8b0a8`.

### `[Rule 1 — bug]` Two spec helpers were reading a rect that no longer exists

- **Found during:** Task 3.
- **Issue:** `legend.spec.ts`'s `readLegendFrame` and `export.spec.ts`'s Gate C
  both read `legendLayer.locator('rect').first()` for the legend's width and
  height. That WAS the background panel; after D4-11 the first rect is a 24 × 24
  swatch. Both would have silently started asserting that the legend is 24 units
  wide, shrinking every containment check to something trivially true.
- **Fix:** both now read the editor-only hit target, which carries the layout's
  real width and height and is the one rect whose box is the legend's box.
  Gate C additionally asserts the old panel is **absent**.
- **Commit:** `cd8b0a8`.

### `[Rule 1 — bug]` The legend fixture's exported-frame readout measured a swatch

- **Found during:** Task 3.
- **Issue:** `fixtures/legend.html`'s export handler read the cloned legend's
  first `rect` for the exported frame — again the deleted panel.
- **Fix:** it now reports the **measured union of every surviving swatch box
  plus their count**, which is a measurement of the clone rather than a
  restatement of the derivation the position came from. `legend.spec.ts`
  asserts 17 swatches survive the clone and the extent stays inside the 1080
  frame — a strictly stronger claim than the string equality it replaced.
- **Commit:** `cd8b0a8`.

### `[Rule 1 — bug]` `persistence.spec.ts` asserted a saved field that is no longer written

- **Found during:** Task 3.
- **Issue:** the spec read `record.composition.legend.theme` from the saved V2
  record and asserted `'light'`. The save path no longer writes it.
- **Fix:** re-baselined **deliberately and itemised** to assert the saved
  **key set** (`entries,position,textSize`) instead of a dropped value — a
  stronger assertion that reddens if a field creeps back into the persisted
  record, and the exact shape `04-14` inherits.
- **Commit:** `cd8b0a8`.

### `[Rule 3 — blocking]` The forced-overlap scenario dissolved under D4-13

- **Found during:** Task 4.
- **Issue:** Gate C forces an overlap by dragging the top band to its cap. With
  the band-aware inset a **preset** legend resolves to `y = 186` and clears a
  154-unit band **by construction**, so its `render.position.y +
  bounds.height <= BAND_MAX_HEIGHT` premise became false.
- **Fix:** the impossibility is now **asserted** (a preset legend clears the
  band — the premise of everything that follows), and the overlap is forced the
  one way that remains and is a real creator path: a **custom** position,
  reached by five `Shift+ArrowUp` nudges from 186 to the 32 clamp. Every
  downstream measurement is unchanged because the legend ends up at the same
  coordinates it used to sit at.
- **Commit:** `6fa9eea`.

### Documentation scope

`coding-rules/frontend.md` was **not** touched. The plan's declared file set did
not include it, and the two rules this plan establishes have homes:
`general.md` carries the Invariant 8 retirement and the Invariant 3
re-confirmation, `storage.md` carries the removed-field rule, `bands.ts`'s own
doc comment carries "one reader of the band extent", and `Design.md` § 4 plus
`uiContract.test.ts` carry the colour exemption. Recorded rather than done
silently.

---

## RED Proofs

Six, each on **its own subject**, each restored by **scratchpad copy-back**
(`/private/tmp/claude-501/.../scratchpad`), never by `git checkout --`. `git
status` and a grep for the mutation confirmed each restore.

### 1. A removed V2 field reported as corruption

Mutation: `normalizeLegend`'s `isRepaired` ORs in
`'theme' in value || 'backgroundOpacity' in value || 'borderStyle' in value`.

```
FAIL  src/utils/storage.test.ts > createStorageAdapter > loads a V2 record carrying the three deleted legend fields with no warning
AssertionError: expected { ok: true, value: { …(5) }, …(2) } to deeply equal { ok: true, sourceVersion: 2, …(2) }
-   "warnings": [],
+   "warnings": [
+     {
```

### 2. Relaxing the surviving field's gate

Mutation: `const isTextSizeValid = true;`

```
FAIL  src/utils/storage.test.ts > createStorageAdapter > still reports a genuinely malformed legend value beside the deleted fields
AssertionError: expected { ok: true, value: { …(5) }, …(2) } to match object { ok: true, …(2) }
-       "textSize": "medium",
+       "textSize": "gigantic",
-   "warnings": [
-     {
-       "code": "composition-repaired",
```

### 3. Reintroducing the box chrome — unit

Mutation: a `#FFFFFF` / `fill-opacity 0.9` / `#CBD5E1` background rect back in
`LegendOverlay`.

```
FAIL  src/components/LegendEditor.test.tsx > LegendOverlay export-safe SVG > renders one group-only root with deterministic SVG primitives and editor-only movement
AssertionError: expected '<g data-layer="legend" transform="tra…' not to contain 'fill="#FFFFFF"'
```

### 4. Reintroducing the box chrome — browser

Same mutation, `legend.spec.ts` on installed Chrome:

```
Error: expect(locator).toHaveCount(expected) failed
Locator:  locator('g[data-layer="legend"]').locator('rect:not([data-editor-only])')
Expected: 3
Received: 4
```

### 5. Reverting the inset to a bare `LEGEND_SAFE_INSET`

Mutation: `const topInset = LEGEND_SAFE_INSET;`

```
FAIL  the band-aware legend inset (D4-13) > insets a top-anchored preset by the top band at its default height
AssertionError: expected 32 to be 152 // Object.is equality
FAIL  the band-aware legend inset (D4-13) > insets a top-anchored preset by the top band at its cap
AssertionError: expected 32 to be 186 // Object.is equality
FAIL  the band-aware legend inset (D4-13) > resolves the default position to {x: 32, y: 152} under Phase 4 defaults
AssertionError: expected { x: 32, y: 32, preset: 'top-left' } to deeply equal { x: 32, y: 152, preset: 'top-left' }
```

### 6. Hard-coding `y = 152` instead of deriving it

Mutation: `const topInset = 152;` — **the proof that the derived form does work
a literal would not.**

```
FAIL  the band-aware legend inset (D4-13) > insets a top-anchored preset by the top band at its cap
AssertionError: expected 152 to be 186 // Object.is equality
FAIL  the band-aware legend inset (D4-13) > leaves a top-anchored preset at the bare safe inset when the top band is off
AssertionError: expected 152 to be 32 // Object.is equality
FAIL  legend positioning > places top-right at the exact safe inset
AssertionError: expected { x: 728, y: 152, preset: 'top-right' } to deeply equal { x: 728, y: 32, preset: 'top-right' }
```

### Also RED-proved, out of band

The new live-DOM layer-order assertion, by moving `{legendSlot}` after
`g[data-layer="text"]` in `MapCanvas.tsx`:

```
Error: the composition paints surface -> paint -> camera -> bands -> text -> legend -> band-handles, which is not bands -> legend -> text (U-8).
```

### Assertions NOT RED-proved, stated plainly

- The **investigation block** in Task 2 is a *recording* of measurements, not a
  gate over a mechanism. Its subject is the geometry itself, and it went red
  exactly once — deliberately, on the Task 4 re-baseline (`expected 32 to be
  152` is what Task 4 changed it to assert). That is the only falsification
  available to it and it is on its own subject.
- The **layer-order** assertion's `bandsIndex/legendIndex/textIndex >= 0`
  guard was not separately reddened; it is a presence precondition for the
  ordering claim beside it, not a claim of its own.
- The **retired** legend-before-text pixel assertion could **not** be made to
  fail after D4-11, which is precisely why it was retired rather than kept.
  Said plainly rather than claimed as passing.

---

## Re-baselined, itemised and deliberately

Every one carries the superseded measurement beside it in the source, so the
change is visible rather than erased.

| # | assertion | from | to | reason |
|---|---|---|---|---|
| 1 | `legend.spec.ts` G-1 investigation, top edge | `y = 32`, 2.96 % | `y = 152`, 14.07 % | D4-13 — the fix Task 2 measured the need for |
| 2 | `legend.spec.ts` G-1 investigation, band overlap | 88 units inside the band | zero, asserted as `>=` | same change; the `>=` form stops "landed somewhere else" satisfying it |
| 3 | `legend.spec.ts` `readLegendFrame` | first `rect` (the panel) | the editor-only hit target | the panel no longer exists (Rule 1) |
| 4 | `legend.spec.ts` exported-frame equality | a 4-tuple string equal to the derived frame | the measured swatch-union extent + count, bounded to 1080 | the panel no longer exists; the replacement measures the clone |
| 5 | `legend.spec.ts` style controls | check Dark / range 70 / Strong, assert `dark,large,70,strong` | assert the three controls **absent**, assert `large` | the controls no longer exist |
| 6 | `export.spec.ts` Gate C legend box | first `rect` | the editor-only hit target, plus an absence assertion | as #3 |
| 7 | `export.spec.ts` Gate C overlap premise | default preset overlaps the capped band | preset **cannot** overlap (asserted), overlap forced via a custom position | D4-13 made preset overlap impossible |
| 8 | `persistence.spec.ts` saved evidence | `legendTheme: 'light'` | `legendKeys: 'entries,position,textSize'` | the field is no longer written; the key set is the stronger claim |
| 9 | `uiContract.test.ts` selector ceiling | 338 | 335 | three rules deleted with the opacity slider; measured both ways |
| 10 | `uiContract.test.ts` colour-literal exemption reason | `THEME_COLORS` and the swatch stroke | the swatch stroke alone | `THEME_COLORS` no longer exists |
| 11 | `legend.test.ts` validation-issue list | 7 issues incl. theme / opacity / border | 4 issues | the fields no longer exist |
| 12 | `legend.test.ts` opacity-scale suite | validated 0–100 with off-step cases | replaced by a chrome-free-legend + surviving-field suite | the scale no longer exists |

**Nothing was re-baselined to make an assertion pass while it was reporting a
real change.** Where a change made an assertion meaningless rather than wrong
(#4, #5, #6, #7, #12), the replacement is stated as such in the source.

---

## Verification

Full gate, run on this working tree at `6fa9eea`:

| gate | result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **832 / 832** passing, 47 files (was 823 after Task 3, 822 at plan start) |
| `tsc -b` + `npm run build` | clean |
| `npm run test:e2e -- --project=chrome` | **131 / 131** passing (was 129 at plan start) |
| `npm run data:world:check` | PASS — 248 units, 195 core, 207 colorable, 327 mesh geometries |
| selector inventory | **335**, ceiling lowered from 338 |
| new baseline images | **none** — `git status --porcelain` shows no `.png` |

**Browser: installed Chrome 151.0.7922.76 only**, verified with
`Google Chrome --version`. **Microsoft Edge is not installed on this machine**
and the `msedge` project was not run; no Edge, Firefox, or Safari result is
produced or cited. No Phase 3 UAT cell is cited as verified.

---

## Open items this plan hands forward

- **`OQ-3` is OPEN.** `G-1` is not claimed resolved. The owner-facing
  confirmation is a `checkpoint:human-verify` in **`04-13`**, after the bar
  form exists.
- **Four legend properties are still open** and belong to `04-13` or later:
  the entry gap, label typography at weight 600, swatch size and stroke, and
  how the footprint scales past one column (Task 2's table, rows 4–6 and 2).
- **`04-14` inherits a three-key legend record.** `{entries, position,
  textSize}`, and `04-05`'s hex-at-serialization note unchanged beside it.
- **`03-UI-SPEC.md`'s `.map-navigation` `inset-inline-end` formula is still
  unannotated.** Named again here; not touched by this plan.
- **No physical check was performed.** Everything above is automated. The
  legend's new placement has not been looked at by a human.

## Known Stubs

None introduced. No hardcoded empty value, placeholder string, or unwired
component was added by this plan.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or
trust-boundary schema change. The one boundary this plan touches —
`localStorage` V2 → `normalizeLegend` — is covered by T-04-12-01 and is
asserted in both directions.

## Self-Check: PASSED

- `src/utils/legend.ts` — FOUND, exports `getLegendCornerPosition` with the
  band-aware inset and `resolveLegendBounds`
- `.planning/REQUIREMENTS.md` — FOUND, F4.5 annotated with additions only
- `.planning/coding-rules/general.md` — FOUND, `grep -n "RETIRED"` hits the
  Live Invariant 8 row and the row still exists
- `.planning/coding-rules/storage.md` — FOUND, § A removed field is not a
  damaged one
- `Design.md` — FOUND, § 4 exemption amended
- `03-UI-SPEC.md` — FOUND, two dated annotations
- Commit `45f0dd9` — FOUND
- Commit `cd8b0a8` — FOUND
- Commit `6fa9eea` — FOUND
