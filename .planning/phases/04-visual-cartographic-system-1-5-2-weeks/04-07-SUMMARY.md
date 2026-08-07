---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 07
subsystem: frontend
tags: [g-3, colors-panel, ramp-strip, flat-elevation, panel-width, accessibility, selector-ceiling]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-02`'s `src/utils/ramps.ts` — `RAMPS`, `RAMP_IDS`, `RAMP_STEP_COUNT`, `shadeForValue`, `shadeForIndex`"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-05`'s `ColorMap` discriminated union and `resolveColorValue` chokepoint (Live Invariant 10)"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-01`'s `src/utils/contrast.ts` and the flat panel vocabulary it authored privately in `mapStyle.css`"
provides:
  - "`--panel-width-open: 360px` in `editor.css` — every flyout, uniformly, from one named token read by three consumers"
  - "The card-free Colors panel: four flat sections, zero cards, one heading, no border on top of a border"
  - "`src/components/RampStrip.tsx` — the contiguous five-segment strip, one tab stop, inset focus ring, no accent"
  - "`labelInkForShade(shade)` in `src/utils/contrast.ts` — decides the check glyph AND `ramps.test.ts`'s label-contrast gate"
  - "`rampStepPosition` / `rampStepAccessibleName` / `rampStepReadout` in `src/utils/ramps.ts`"
  - "`setColorValues(countryIds, ColorValue)` on `MapStateProvider` — the identity write seam; ramp painting is now reachable"
  - "The shared `.panel-*` vocabulary in `editor.css`, consumed by both the Colors and `Map style` panels"
  - "`tests/e2e/colorsPanel.spec.ts` — A4, A5, focus order, and a pixel-measured inset-ring backstop"
  - "`applyRampRed` / `applyRampShade` / `RAMP_FAMILY_LABELS` in `tests/e2e/support/appHarness.ts`"
  - "`03-UI-SPEC.md`'s CD-1 amendment block — thirteen rows, applied at every named line"
affects: [04-08, 04-10, 04-11, 04-12, 04-13, 04-16, phase-5-classing-engine]

actuals:
  tokens: 33457
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A shared component vocabulary homed in the container that places its consumers, not copied between two surface files"
    - "A chooser function whose ARITY is the invariant — `labelInkForShade` takes only a shade, so mode-invariance has nowhere to leak"
    - "A pixel-measured focus-ring probe with its own control colour and keyboard-arrived focus"
    - "A roving-tabindex owner SET rather than a count, so a second deliberate group is named and a third still fails"

key-files:
  created:
    - src/components/RampStrip.tsx
    - tests/e2e/colorsPanel.spec.ts
  modified:
    - src/styles/editor.css
    - src/styles/controls/colorPicker.css
    - src/styles/controls/selectionPanel.css
    - src/styles/controls/mapStyle.css
    - src/styles/uiContract.test.ts
    - src/styles/themeTokens.test.ts
    - src/components/ColorPicker.tsx
    - src/components/ColorPicker.test.tsx
    - src/components/SelectionPanel.tsx
    - src/components/ResetColorsAction.tsx
    - src/components/MapStylePanel.tsx
    - src/components/Controls.tsx
    - src/components/CountryList.test.tsx
    - src/providers/MapStateProvider.tsx
    - src/hooks/useInspectorUiState.ts
    - src/utils/contrast.ts
    - src/utils/contrast.test.ts
    - src/utils/ramps.ts
    - src/utils/ramps.test.ts
    - src/constants/colors.ts
    - src/types/ui.ts
    - src/App.tsx
    - tests/e2e/support/appHarness.ts
    - tests/e2e/final-integration.spec.ts
    - tests/e2e/rail.spec.ts
    - tests/e2e/responsive.spec.ts
    - tests/e2e/shell.spec.ts
    - tests/e2e/persistence.spec.ts
    - tests/e2e/phase2-composition.spec.ts
    - tests/e2e/transactions.spec.ts
    - tests/e2e/history.spec.ts
    - tests/e2e/navigation.spec.ts
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UI-SPEC.md
    - Design.md
    - .planning/coding-rules/frontend.md

key-decisions:
  - "Promoted `04-01`'s private pill/section/field/ghost rules out of `mapStyle.css` into a shared `.panel-*` block in `editor.css` rather than authoring a second copy for the Colors panel — `04-UI-SPEC.md § 11` rule 1 names a copied pill as a defect by name, and `03-10` already set the precedent that a rule three surfaces share belongs to the container"
  - "Homed the strip's pure vocabulary (`rampStepPosition`, `rampStepAccessibleName`, `rampStepReadout`) in `ramps.ts` rather than beside the component: Vitest runs on `node` with no DOM, so a format string in a `.tsx` cannot be gated at all"
  - "Added ONE provider method, `setColorValues(countryIds, ColorValue)`, rather than widening `setColors` to a union — the hex path still constructs the `custom` variant at one place and there is still exactly one `resolveColorValue`"
  - "Widened assertion 27 from one roving-tabindex writer to a two-name SET with the reason in the same commit; the defect it covers is an UNNAMED writer, not a second roving group"
  - "Measured the inset focus ring on rendered PIXELS rather than on a computed style, because a computed read reports the outline as present in exactly the case where the creator cannot see it"
  - "Gave `ResetColorsAction` a declared `variant` (`panel` | `strip`) following the `Controls` precedent, so the panel ghost and the compact strip's destructive treatment stay one component"
  - "Kept `.country-list`'s card: D4-06 scoped this redesign to the two colour surfaces, and flattening a panel nobody asked about is a visual change nobody will review"
  - "Replaced rather than renumbered three gates whose subjects were deleted (`themeTokens.test.ts`'s preset grid, `rail.spec.ts`'s label-clip walk, `responsive.spec.ts`'s label-clip walk) — the old bodies would have iterated an empty list and passed"

patterns-established:
  - "When a redesign deletes a gate's subject, REPLACE the gate with one whose subject the redesign created; a renumber onto a different element proves a different claim, and leaving it proves nothing"
  - "A pixel probe needs its own control sample, chosen so the thing being looked for cannot occur by accident (a near-white `Greys` shade under a search for focus blue, in a strip full of blue)"
  - "Reach a control by KEYBOARD in any `:focus-visible` probe — Chrome does not match it on programmatic focus, so `locator.focus()` reports the defect on correct code"
  - "A selector ceiling moves DOWN on a deletion, with per-file before/after measured on both sides and a MOVE reported as a move rather than as a deletion"

requirements-completed: [D4-03, D4-04, D4-05, D4-06, D4-01]

coverage:
  - id: D1
    description: "Every flyout is 360px, declared once as `--panel-width-open` in `editor.css` (not `theme.css`) and read by three consumers; no bare `360px` sizes a panel surface"
    requirement: "D4-05"
    verification:
      - kind: unit
        ref: "uiContract.test.ts#resolves the track to 0px closed and 360px open"
        status: pass
      - kind: unit
        ref: "uiContract.test.ts#reaches the open width through the token at all three consumers"
        status: pass
      - kind: integration
        ref: "colorsPanel.spec.ts#the open flyout is 360px and the strip fills its content measure (measured box: 360 / 328 / 48)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The CD-1 thirteen-row disposition lands in `03-UI-SPEC.md` and `Design.md` in the SAME commit as the width change; the two typography prohibitions keep their force with the reason restated"
    requirement: "D4-05"
    verification:
      - kind: other
        ref: "git show --stat 00a57c7 lists editor.css, uiContract.test.ts, 03-UI-SPEC.md, and Design.md together; `grep -n 280 Design.md` returns nothing"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Colors panel has ZERO cards: no `--radius-card`, no hairline, no outset box-shadow in either of its surface sheets, and the four deleted class fragments cannot return"
    requirement: "D4-04"
    verification:
      - kind: unit
        ref: "themeTokens.test.ts#keeps the Colors panel flat - no card, no border on top of a border"
        status: pass
    human_judgment: false
  - id: D4
    description: "The panel carries exactly one `<h2>` — its own title. `Choose a color` and `color-picker-heading` are gone"
    requirement: "D4-04"
    verification:
      - kind: unit
        ref: "ColorPicker.test.tsx#emits a flat fieldset with no second heading and no preset grid"
        status: pass
      - kind: other
        ref: "grep -rn 'color-picker-heading' src/ tests/ returns nothing (exit 1)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A disabled group is `<fieldset disabled>`, never `aria-disabled`; with nothing selected the panel contributes ZERO tab stops and the Ramp and Custom sections render disabled rather than hidden"
    requirement: "D4-04"
    verification:
      - kind: unit
        ref: "ColorPicker.test.tsx#natively disables the whole group when no countries are selected (both fieldsets, count asserted)"
        status: pass
      - kind: integration
        ref: "colorsPanel.spec.ts#the panel focus order matches the specified section order (four absences asserted)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The empty state renders the `No countries selected` heading and `Click a country on the map to start coloring.`, byte-exact to `04-UI-SPEC.md § 9`"
    requirement: "D4-04"
    verification:
      - kind: integration
        ref: "phase2-composition.spec.ts — getByRole('heading', { name: 'No countries selected' })"
        status: pass
    human_judgment: false
  - id: D7
    description: "An invalid custom hex shows `Enter a hex color like #2563EB` at `--text-caption` in `--destructive`, wired by BOTH `aria-describedby` and `aria-invalid`, with the input border `--destructive`"
    requirement: "D4-04"
    verification:
      - kind: unit
        ref: "ColorPicker.test.tsx#wires the invalid-hex message to the field by id and by aria-invalid"
        status: pass
      - kind: unit
        ref: "uiContract.test.ts contrast matrix row --themely-midnight-ink on --destructive-tint, both modes"
        status: pass
    human_judgment: false
  - id: D8
    description: "`labelInkForShade` returns the higher-contrast of `#FFFFFF` / `#111827` for all 25 shades, clears 4.5:1 on each, and takes ONLY a shade so the check glyph is identical in both modes"
    requirement: "D4-01"
    verification:
      - kind: unit
        ref: "contrast.test.ts#never returns the losing colour, for every shade in every ramp (25 asserted against the literal)"
        status: pass
      - kind: unit
        ref: "contrast.test.ts#is a pure function of the shade, with nowhere to put a theme (arity asserted)"
        status: pass
      - kind: unit
        ref: "ramps.test.ts Gate 3, repointed from an inlined `Math.max(...)` to `labelInkForShade`"
        status: pass
    human_judgment: false
  - id: D9
    description: "Selecting segment `i` produces a ramp value whose `t` `shadeForValue` maps back to segment `i`, for every step of every ramp"
    requirement: "D4-01"
    verification:
      - kind: unit
        ref: "ramps.test.ts#round-trips every step through shadeForValue for every ramp (25 asserted)"
        status: pass
    human_judgment: false
  - id: D10
    description: "The segment accessible name and the readout are byte-exact to `04-UI-SPEC.md § 9`, with the U+00B7 separator written as an escape"
    requirement: "D4-01"
    verification:
      - kind: unit
        ref: "ramps.test.ts#formats both strings exactly as the copy contract specifies, and #names every step of every shipped ramp"
        status: pass
      - kind: integration
        ref: "rail.spec.ts and colorsPanel.spec.ts assert the rendered readout `Step 4 of 5 · #DE2D26` / `· #2171B5`"
        status: pass
    human_judgment: false
  - id: D11
    description: "Ramp painting is reachable through `04-05`'s seam, and there is still exactly ONE `resolveColorValue`"
    requirement: "D4-01"
    verification:
      - kind: integration
        ref: "colorsPanel.spec.ts — Enter and Space on the strip change the map's `fill` to #BDD7E7 and #2171B5"
        status: pass
      - kind: other
        ref: "`resolveColorValue` is declared once in src/utils/colors.ts; RampStrip and ColorPicker write identity and never resolve"
        status: pass
    human_judgment: false
  - id: D12
    description: "The strip is ONE contiguous band with ONE border, five segments, no gaps, and no per-segment border"
    requirement: "D4-01"
    verification:
      - kind: integration
        ref: "rail.spec.ts#the ramp family pills wrap and the strip is one contiguous band (segments 5, gaps < 0.5px, borderedSegments 0, band border non-zero)"
        status: pass
    human_judgment: false
  - id: D13
    description: "A4 — every ramp segment and family pill is at least 44 x 44 at the compact breakpoint, read from bounding boxes"
    requirement: "D4-04"
    verification:
      - kind: integration
        ref: "colorsPanel.spec.ts#every ramp segment and family pill clears 44x44 at the compact breakpoint"
        status: pass
    human_judgment: false
  - id: D14
    description: "A5 — the strip is one tab stop, arrows walk it, Home/End jump, and Enter AND Space apply on different steps"
    requirement: "D4-04"
    verification:
      - kind: integration
        ref: "colorsPanel.spec.ts#the ramp strip is one tab stop, walks on arrows, and applies on Enter and Space — RED-proved (see § RED Proofs, R1)"
        status: pass
    human_judgment: false
  - id: D15
    description: "The focus order matches the specified section order, including the controls a disabled state removes"
    requirement: "D4-04"
    verification:
      - kind: integration
        ref: "colorsPanel.spec.ts#the panel focus order matches the specified section order — RED-proved (R2)"
        status: pass
    human_judgment: false
  - id: D16
    description: "The `:focus-visible` ring renders INSET at the first and last segment, so the band's `overflow: hidden` does not clip it"
    requirement: "D4-04"
    verification:
      - kind: integration
        ref: "colorsPanel.spec.ts#the focus ring is visible at the first and last segment, unclipped — pixel-measured with its own control; RED-proved (R3)"
        status: pass
    human_judgment: false
  - id: D17
    description: "A8 — no transition lands on the ramp strip or the pill background; hover paint is instant"
    requirement: "D4-04"
    verification:
      - kind: unit
        ref: "uiContract.test.ts#lets no transition touch the ramp strip or the family pills — both halves RED-proved (R4, R5)"
        status: pass
    human_judgment: false
  - id: D18
    description: "Ramp shades and the `--swatch-border` outer edge do not flip between light and dark; the strip authors zero per-component dark overrides"
    requirement: "D4-01"
    verification:
      - kind: other
        ref: "grep -vE '^\\s*(/\\*|\\*|//)' src/styles/controls/colorPicker.css | grep -c '\\.dark' => 0; shades are inline attributes and `labelInkForShade` has no theme parameter"
        status: pass
      - kind: other
        ref: "A11 — the dark-theme VISUAL review is a physical check scheduled in 04-16"
        status: human_needed
    human_judgment: true
  - id: D19
    description: "The selector inventory went DOWN — 341 to 331 — with per-file before/after measured on both sides and the reason in the same commit"
    requirement: "D4-04"
    verification:
      - kind: unit
        ref: "uiContract.test.ts assertion 21, ceiling lowered to 331; both totals measured by running the gate at ceiling 0 against the pre-plan stylesheets and against these"
        status: pass
    human_judgment: false
  - id: D20
    description: "Panel chrome moved ZERO exported pixels — the diff touches no file on the export path"
    requirement: "D4-04"
    verification:
      - kind: other
        ref: "git diff --name-only 67a586f..HEAD matched none of utils/export, MapCanvas, LegendOverlay, mapProjection, legend.ts, interFontFace, assets/"
        status: pass
      - kind: integration
        ref: "export.spec.ts and responsive.spec.ts sampled-pixel export gates green (112/112 Playwright)"
        status: pass
    human_judgment: false
  - id: D21
    description: "Whether `G-3` is actually resolved"
    requirement: "D4-04"
    verification:
      - kind: other
        ref: "Subjective owner judgement, reserved for 04-16's physical check. NOT claimed here."
        status: human_needed
    human_judgment: true

# Metrics
duration: 115min
completed: 2026-08-07
status: complete
---

# Phase 4 Plan 07: The Card-Free Colors Panel and the Ramp Strip

**`G-3` addressed structurally: the Colors panel is four flat sections with zero cards, every flyout is 360px from one named token, and a contiguous five-segment ramp strip makes ramp painting reachable — with the selector inventory DOWN 341 → 331 and all five new backstop claims RED-proved on their own subjects.**

## Performance

- **Duration:** ~115 min
- **Started:** 2026-08-07T04:33Z
- **Completed:** 2026-08-07T06:28Z
- **Tasks:** 4, four atomic commits
- **Files:** 37 (2 created, 35 modified)

| Commit | Task |
|---|---|
| `00a57c7` | 360px as a named token, with the CD-1 annotation in the same commit |
| `09fc48e` | Invert the elevation — the card-free Colors panel |
| `434dfb9` | The ramp strip, and ramp painting becomes reachable |
| `b5262d6` | The gates — A3/A4/A5, focus order, the inset ring, and a lowered ceiling |

## ⚠ What this plan does NOT claim

**Whether `G-3` is actually resolved is a subjective judgement reserved for `04-16`'s physical check, and it is not claimed here.** The owner's complaint — *"too squished, not organized well, hate the multi boxes within"* — was subjective, so its acceptance criterion is too. What this plan can honestly claim is that the three separable defects it names were each addressed against a *measurable* constraint: 360px of width from a named token, zero cards against `Design.md § 9`, and a flat four-section information architecture. **Nobody reviewed the layout.** The blanket authorization authorizes proceeding; it is not a content review.

**A9 (screen-reader pass over the ramp strip), A10 (physical 200 % zoom at 360px), and A11 (dark-theme visual review) are PHYSICAL checks scheduled in `04-16`. None is claimed here, and none is inherited** — nine of Phase 3's twelve UAT cells were never performed, including the screen-reader pass, the touch-target check, the physical zoom, and the dark-theme review. Skipped is not passed.

**Browser scope: installed Chrome 151.0.7922.76 only.** Microsoft Edge is not installed on this machine, so the `msedge` Playwright project cannot launch. No Edge, Firefox, or Safari result is produced or cited.

## What shipped

### Task 1 — 360px as a named token (`00a57c7`)

`--panel-width-open: 360px`, declared **once** in `editor.css` and read by three consumers: the `data-panel-open='true'` track, `.tool-panel__body`'s width, and `.map-workspace > .editor-help`'s `max-inline-size`. The last is documented as *"capped at the panel's own measure"* — a **derived** value that drifts the next time the panel moves if it stays a second literal.

It is a named token rather than a literal because `editor.css` already spells `360px` for the compact bottom sheet's height cap and for the narrowest contained viewport. After D4-05 the number means **three different things in one file**.

It is **not** in `theme.css`: that allowlist governs `theme.css` only, and `04-UI-SPEC.md § 11` is explicit that Phase 4 adds no theme tokens.

Assertion 10 moved the literal, not the mechanism — `CLOSED_PANEL_WIDTH`, the `@property --panel-width` `initial-value`, and the `grid-template-columns` assertion are untouched. A one-level `var()` resolver keeps the assertion rating the **resolved** width, so a `var()` that resolved to nothing fails rather than reading as a pass.

**CD-1 landed in the same commit, never after.** `03-UI-SPEC.md` is approved and outranks `Design.md`, so its thirteen-row disposition table was applied at every named line: eight renumber, `:743`'s three-column preset grid is **deleted** by this plan and now points at `04-UI-SPEC.md § 6.3.3` rather than being renumbered, and `:257` / `:271` / `:718` / `:798` / `:805` **keep their prohibition with the reason restated**. The near-size rules are about a 2px step reading as an accident rather than a hierarchy, which is just as illegible at 360px as at 280px — a careless renumber would have read them as satisfied by the widening and put 16px sub-headings back into the panel. `Design.md`'s seven references moved in the same commit; Phase 3's checker-sign-off evidence is **annotated, never rewritten**.

### Task 2 — the card-free panel (`09fc48e`)

**One card per panel became zero.** Deleted outright rather than restyled: `.color-picker`'s Porcelain card, the `repeat(auto-fit, minmax(76px, 1fr))` preset grid (3 × 76 = 232px inside 232px of content — literally zero slack), the ten tile hairlines, the active-check positioning, the bordered custom box, the custom-colour preview chip, `<h2>Choose a color</h2>`, `COLOR_PRESETS`, and the orphaned `ColorPreset` type.

Four flat sections: **Selection** (a Porcelain row with a 24px mode-invariant swatch, the name, and `Current color <HEX>` at `--text-caption` with `tabular-nums`) · **Ramp** · **Custom color** · **Reset All Colors** (ghost, full width, no accent).

`<fieldset>` survives as **semantic grouping only** — `border: 0; padding: 0; margin: 0`, its `<legend>` is the section label, and it carries `disabled` for the whole group. **A disabled group is `<fieldset disabled>`, never `aria-disabled` on a still-clickable control.** The measured consequence: with nothing selected the panel contributes **zero** tab stops, and the focus-order spec asserts those absences.

The empty state keeps a **real heading** at `<h3>` — one level below the panel title, so "one `<h2>` per panel" holds while a screen-reader user navigating by heading can still find the answer to "what do I do now".

### Task 3 — the ramp strip (`434dfb9`), TDD

RED first, and a **behaviour** red rather than the throws-at-import shape `04-02` refused: the four new functions landed as typed stubs so the assertions actually ran and failed on their subject (see § RED Proofs, R6/R7). Then GREEN.

`labelInkForShade(shade)` decides the check glyph **and** `ramps.test.ts`'s label-contrast gate. That gate used to inline `Math.max(onPaper, onInk)` — a property of the **shade**, not of the **choice**, which would stay green if the renderer picked the other colour. **Its arity is the dark-mode guarantee**: it takes only a shade, so there is nowhere for a theme to enter and light/dark are identical by construction.

The strip is one contiguous band with one border, `border: 0` per segment against the global `button` hairline, 48px tall, `grid-template-columns: repeat(var(--ramp-steps), 1fr)` fed inline from `RAMP_STEP_COUNT`. Hover and selection are the same 2px Midnight Ink **inset** ring — never Powder (it would hide the shade being selected), never Apple Blue (D-05 spends the panel's accent on `Apply Color`). Focus is inset too, so `overflow: hidden` cannot clip it at the ends. Zero transitions, zero dark overrides.

The write seam: `setColorValues(countryIds, ColorValue)` on the provider. The hex path still constructs the `custom` variant at one place; the strip hands the union straight through, so a ramp assignment is never flattened to a hex and re-parsed. **Still exactly one `resolveColorValue`.**

### Task 4 — the gates (`b5262d6`)

`tests/e2e/colorsPanel.spec.ts`, importing shared fixtures and re-declaring none. A4 from bounding boxes with counts against literals; A5 with Enter and Space on **different** steps so the second cannot pass on the state the first produced; focus order asserting absences as well as order; and the inset-ring backstop measured on pixels.

Contrast matrix +1 pair (rows 96 → 102, pairs 16 → 17). Selector ceiling **lowered** 341 → 331.

## Deviations from Plan

### Auto-fixed and structural

**1. [Rule 3 — Blocking] `mapStyle.css` and `MapStylePanel.tsx` migrated onto the shared vocabulary**
- **Found during:** Task 2, planning the pill classes for the ramp family selector.
- **Issue:** The plan says *"Reuse the pill classes, do not author a second set"* and `04-UI-SPEC.md § 11` rule 1 says *"A `Map style` pill that is a copy of a Colors pill is a defect, not a convenience."* But `04-01` had authored the vocabulary **privately** in `mapStyle.css`, and neither file is in this plan's `files_modified`. Consuming `.map-style__pill` from the Colors panel would anchor one element in two surfaces; copying it would be the named defect.
- **Fix:** Promoted the section / label / divider / pill / swatch / field / error / ghost rules into a shared `.panel-*` block in `editor.css` — the `03-10` precedent that a rule three surfaces share belongs to the container that places them. `mapStyle.css` is down to one rule.
- **Cost, measured:** `mapStyle.css` 15 → 1 selectors, `editor.css` 94 → 105. Reported as a **MOVE**, not a deletion.
- **Commit:** `09fc48e`

**2. [Rule 3 — Blocking] Assertion 27 widened from one roving-tabindex writer to a two-name set**
- **Found during:** Task 3. A5 requires the five segments to be one tab stop with arrow traversal, which makes `RampStrip.tsx` a second file computing a `tabIndex` per element — and the gate asserted the writer set was exactly `['components/MapCanvas.tsx']`.
- **Considered and rejected:** a focusable container plus `aria-activedescendant`, whose `tabIndex={-1}` literals would have satisfied the gate untouched. It puts the focus ring on the **container** rather than on the segment, which breaks the inset-ring requirement the same plan asks for.
- **Fix:** widened the set to two named files with the reason in the same commit. The defect the gate covers is an *unnamed* writer — two files disagreeing about which element holds the single tab stop — not the existence of a second roving group. It is still a SET, so a third fails and still has to say why. The rail's rows remain plain tab stops.
- **Commit:** `434dfb9`

**3. [Rule 3 — Blocking] Three gates REPLACED because the redesign deleted their subjects**
- `themeTokens.test.ts#sizes preset columns from a minimum track` — its subject was the ten-tile grid. Left alone it would have matched nothing and passed vacuously. Its slot now gates the claim `G-3` is actually about: the two Colors sheets declare no `--radius-card`, no `--hairline`, and no **outset** box-shadow, and the four deleted class fragments cannot return by copy-paste. (Inset shadows are distinguished rather than banned — banning `box-shadow` outright would have forced the strip's rings back onto borders and reintroduced a per-segment edge, which is exactly the "multi boxes" the test exists to prevent.)
- `rail.spec.ts#no preset label is clipped` → `#the ramp family pills wrap and the strip is one contiguous band`.
- `responsive.spec.ts`'s label-clip walk → pills-do-not-clip plus no-segment-escapes-its-band.
- **Commit:** `09fc48e` / `434dfb9`

**4. [Rule 3 — Blocking] e2e locator migration across nine specs**
- Deleting `COLOR_PRESETS` removed `Apply Red` and `Apply Blue`, which thirteen call sites across eight specs used to paint a country before testing something else. `applyRampRed` / `applyRampShade` joined `tests/e2e/support/` rather than being re-declared eight times. `#DC2626` → `#DE2D26` and `#2563EB` → `#2171B5` **only where the hex was downstream of a click**; fixture hexes are untouched.
- `responsive.spec.ts`'s increased-contrast probe moved from `Colors` to `Map style`: the shared `.panel-swatch` it reads is the water pill's now, and a null `querySelector` makes the whole `page.evaluate` throw — the "gate wearing an error message" that test was already rewritten once to stop being.
- `shell.spec.ts`'s `OPEN_PANEL_WIDTH` 280 → 360.
- **Commit:** `434dfb9`

**5. [Rule 2 — Missing critical functionality] `collectTabOrder` resolves form-control names**
- A radio inside a pill and a field named by its legend have no child text, so the walk reported both as `''`. An order asserted against a run of empty strings cannot catch a swap. Now resolves through `aria-labelledby` and the associated `<label>`. Strictly additive; no existing expectation read an empty string.
- **Commit:** `b5262d6`

**6. [Rule 2] `ResetColorsAction` gained a declared `variant`**
- The `strip` variant is composed inside `Controls`' action row, where the panel's ghost full-width treatment is wrong. Following the `Controls` precedent (one component, a declared variant, never two copies) rather than leaking a `className` prop upward.
- **Commit:** `09fc48e`

**7. [Rule 2] `CUSTOM_COLOR_ERROR_MESSAGE` moved to `constants/colors.ts`**
- The new copy spells `#2563EB`, and assertion 8's component-literal exemption is **closed** at `LegendOverlay.tsx`. The existing `CUSTOM_COLOR_PLACEHOLDER` comment already states this rule.
- **Commit:** `09fc48e`

**8. [Rule 2] The strip's pure vocabulary homed in `ramps.ts`, not beside the component**
- Vitest runs on `node` with no DOM, so a `Step i of n` format declared in a `.tsx` cannot be gated at all — and an ungated format string is one copy-paste from a second spelling in the legend. `ramps.ts` is declared the one home for the ramp vocabulary. It also keeps `rampStepPosition` beside `shadeForValue`, which is what its round-trip gate asserts against.
- **Commit:** `434dfb9`

### One assertion I deliberately narrowed rather than shipped as written

The plan's negative half — *"no bare `360px` sizes a panel surface"* — was first written unscoped and immediately reddened `MapCanvas.css`'s `.map-workspace__warning`, which legitimately caps a banner at 360px. Left unscoped it would have reddened on a rule that has nothing to do with the collision the token resolves — the "probe reddens a **different** gate" shape this repo has shipped before. It is scoped to `editor.css`, where the three-way collision actually lives, and the scope is documented as the point rather than as a convenience.

## RED Proofs

All restored by **scratchpad copy-back**, never `git checkout --`. `git diff --stat` confirmed clean after each.

| # | Subject | Mutation | Verbatim failure |
|---|---|---|---|
| **R1** | A5 — the strip is ONE tab stop | `tabIndex={0}` on every segment | `the strip must be ONE tab stop with a roving tabindex, not five stops a creator has to walk past to reach Custom color. Expected: 1  Received: 5` |
| **R2** | Focus order, against the arrangement it replaces | `ResetColorsAction` moved above `ColorPicker` in `App.tsx` | `expect(received).toBeLessThan(expected)  Expected: < 10  Received: 14` at `expect(applyColor).toBeLessThan(reset)` |
| **R3** | The focus ring is INSET at the first and last segment | the strip's focus rule put back on the global `outline` | `the focus ring on the FIRST segment is clipped by the band. Render it inset; an outline paints outside the border box and overflow:hidden removes it.  Expected: > 0  Received: 0` |
| **R4** | A8 — hover paint is instant (half 1: the surfaces resolve to `none`) | `.ramp-strip__step` dropped from the `transition: none` group | `".ramp-strip__step" declares no transition at all, so it inherits the global button background fade from theme.css. Hover paint on a palette is instant; declare 'transition: none'.  expected [] to include 'none'` |
| **R5** | A8 (half 2: no rule may transition a background on it) | an explicit ease added to `.ramp-strip__step:hover` | `controls/colorPicker.css: ".ramp-strip__step:hover" animates "background-color 150ms ease-out". An ease between two ramp shades is a regression, not polish.` |
| **R6** | TDD RED — `labelInkForShade` | typed stub returning `#FFFFFF` always | `ramp "blues" shade #EFF3FF: the renderer picked #FFFFFF over #111827, but #111827 measures higher: expected 1.109093540726348 to be greater than or equal to 15.99478885474014` (3 tests) |
| **R7** | TDD RED — the strip's pure vocabulary | typed stubs returning `0` / `''` | `ramp "blues" step 2 resolves to the wrong shade: expected '#EFF3FF' to be '#BDD7E7'`; `expected '' to be 'Apply Blues shade 3 of 5'` (8 tests) |
| **R8** | Assertion 10 — the resolved open width | `--panel-width-open: 280px` | `expected '280px' to be '360px'` (2 tests) |
| **R9** | Assertion 10 — the `.tool-panel__body` consumer (negative half, isolated) | `width: 360px` as a bare literal | `editor.css: ".tool-panel__body" sizes with a bare 360px…` (1 test) |
| **R10** | Assertion 10 — the derived `.editor-help` cap (isolated) | `max-inline-size: 280px` | `expected '280px' to be '360px'` (1 test) |
| **R11** | The accent budget (half 1: the ghost) | `.panel-action { background: var(--accent-fill) }` | `expected 'var(--accent-fill)' to be 'transparent'` |
| **R12** | The accent budget (half 2: the enumeration, isolated) | `.selection-panel__row { background: var(--accent-fill) }` | the enumeration grew by `controls/selectionPanel.css .selection-panel__row` |

**On independence.** R8 reddens two tests at once (both derive from the token), so it alone would not prove either claim independent. R9 and R10 each redden exactly one and isolate the two halves. R11 and R12 likewise isolate the accent budget's two halves.

**On the ring backstop — it is NOT held out.** The plan permitted recording it as a held-out visual check if it could not be measured reliably. It can be, and the measurement is the honest one: the defect is *geometric*, and a computed-style read would report the outline as present in exactly the case where the creator cannot see it. Two things make the probe real rather than decorative:

- **It carries its own control.** A near-white `Greys` shade is applied first and the unfocused strip is asserted to yield **zero** focus-blue pixels. Without that, "there is blue at the edge" would be satisfied by a `blues` shade — in a strip full of blue.
- **It reaches the segment by keyboard.** Chrome only matches `:focus-visible` on keyboard-arrived focus, so `locator.focus()` gives a focused segment with **no ring at all** — a probe that would report the defect on a perfectly correct implementation. This was discovered by the probe returning 0 on correct code before the fix.

## Selector inventory — measured on both sides

| Sheet | before | after |
|---|---|---|
| `controls/colorPicker.css` | 17 | 12 |
| `controls/mapStyle.css` | 15 | **1** |
| `controls/selectionPanel.css` | 11 | 11 |
| `editor.css` | 94 | 105 |
| **DISTINCT TOTAL** | **341** | **331** |

Both totals were produced by running assertion 21 with the ceiling set to `0`, once against the pre-plan stylesheets (`git checkout 67a586f -- src/styles/…`, all committed, nothing uncommitted at risk) and once against these. Neither is an estimate. The per-file numbers do not sum to the totals because the inventory is **distinct** selectors — a part two sheets share is counted once, and that is the metric working.

`mapStyle.css`'s fourteen are a **MOVE**, reported as one. `selectionPanel.css` landing on the same number is a coincidence of the card being replaced by one Porcelain row, not a sign it was untouched.

## Export safety

**Zero change to exported PNG bytes from panel chrome.** `git diff --name-only 67a586f..HEAD` matches none of `src/utils/export.ts`, `MapCanvas.tsx`, `LegendOverlay.tsx`, `mapProjection.ts`, `src/utils/legend.ts`, `interFontFace.ts`, or `src/assets/`. The export clone is a serialised copy of `svg.map-canvas` only, and nothing in this plan is inside that subtree. `export.spec.ts`'s sampled-pixel gates and `responsive.spec.ts`'s three-context probe are both green.

The one place exported pixels **do** change is composition, not chrome, and it is intended: a country painted from the ramp strip carries a ramp shade instead of a preset hex. The e2e migration moved those expectations deliberately, and only where the hex was downstream of a click.

## Verification

- `npm run lint` — clean
- `npm test` — **730/730 unit, 45 files** (node environment, no DOM)
- `npm run build` — clean, 0 TypeScript errors
- `npx playwright test --project=chrome` — **112/112**, installed **Chrome 151.0.7922.76**
- `npm run data:world:check` — PASS (248 units, 195 core, 207 colorable, mesh re-derived and matched)
- Zero new npm packages; `package.json` and `package-lock.json` untouched

## Known Stubs

**None introduced by this plan.** No hardcoded empty value, placeholder string, or unwired component was left behind; every control in both panels is bound to real state.

Carried forward from earlier in the phase and **not** resolved here: a saved composition still reloads with default water (`04-14`'s V3 persistence work).

## Held out / not claimed

| Item | Why |
|---|---|
| **`G-3` is resolved** | Subjective owner judgement. Reserved for `04-16`'s physical check. Not claimed. |
| **A9** — screen-reader pass over the ramp strip | Physical check, `04-16`. Never performed in Phase 3; not inherited. |
| **A10** — physical 200 % zoom at 360px | Physical check, `04-16`. A halved CSS viewport is the *equivalent*, not the claim. |
| **A11** — dark-theme visual review | Physical check, `04-16`. The automated half is A3 (contrast), which passed; that is a different claim. |
| **`OQ-2` / D-5** — the rail-height floor above 1200px | Still open. Widening the flyout does not touch rail height, and the measured 552px floor is unchanged by this plan. |

## Notes for `04-08` and later

- **The shared `.panel-*` vocabulary is the one to extend.** `04-08` adds Uncolored countries and Borders to `Map style`; they are `.panel-section` + `.panel-section__label` + `.panel-pills`, and authoring a fourth copy of a pill is the defect `§ 11` rule 1 names.
- **The strip is the idiom the exported legend bar must rhyme with** (`04-08`'s legend work). One band, one border, no gaps.
- **`labelInkForShade` is the function to call** for any label drawn on a composition colour — never a second `max(...)`.
- **`rampStepPosition` throws outside the strip where `shadeForValue` clamps.** The latter takes creator data; the former takes an index this repository produced.
- **`--panel-width-open` is the only new token, and Phase 4 adds no `theme.css` tokens.** Reaching for a fixed token for composition appearance is the signal someone is about to paint exported pixels from CSS.

## Self-Check: PASSED

- `src/components/RampStrip.tsx` — FOUND
- `tests/e2e/colorsPanel.spec.ts` — FOUND
- `00a57c7` · `09fc48e` · `434dfb9` · `b5262d6` — all four present in `git log`
- `grep -rn "color-picker-heading" src/ tests/` — returns nothing
- `grep -n "280px" src/styles/editor.css` — returns nothing
- `grep -n "panel-width-open" src/styles/theme.css` — returns nothing
- `grep -c "panel-width-open" src/styles/editor.css` — 4 (one declaration, three consumers)
- `grep -vE "^\s*(/\*|\*|//)" src/styles/editor.css | grep -c "auto-fit"` — 0
- `grep -vE "^\s*(/\*|\*|//)" src/styles/controls/colorPicker.css | grep -cE "border:\s*1px|box-shadow:\s*var\(--hairline\)"` — **0**, down from **1** pre-change
- `grep -vE "^\s*(/\*|\*|//)" src/styles/controls/colorPicker.css | grep -c "\.dark"` — 0
- `grep -c "accent-fill" src/components/RampStrip.tsx` — 0
- `grep -c "from './support/" tests/e2e/colorsPanel.spec.ts` — 1
- `.planning/STATE.md` and `.planning/ROADMAP.md` — **untouched**; no forbidden gsd-sdk verb was run
