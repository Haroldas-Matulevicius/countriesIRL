---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 13
subsystem: render
status: complete
tags: [d4-12, d4-09, legend, two-forms, bar, rows, no-data-binding, cd-8, oq-3-open, oq-5-open, g-1-not-claimed, png-pixels, selector-ceiling-up, shared-png-probe]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-12`'s chrome-free legend, its band-aware inset, and its enumeration of the eight legend properties — four of which this plan addresses and two of which it leaves open"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-05`'s `ColorMap` discriminated union — `inferLegendForm` reads `value.kind`, never a `typeof` test (Live Invariant 10)"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-08`'s `DEFAULT_UNCOLORED_FILL` (`#E5E7EB`) — the ONE value the 'no data' swatch binds to"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-11`'s `expectRegionInsideFrame` phantom-pixel rule and `COMPOSITION_INK_COLOR`"
provides:
  - "`LegendForm` (`'bar' | 'rows'`) + `LEGEND_FORMS`, the one vocabulary home"
  - "`inferLegendForm(colors)` — bar when ANY assignment is a ramp; `resolveLegendForm(legend, inferredForm)` — the one place an override and an inference are reconciled"
  - "`createBarLegendLayout` — a SECOND layout function with its own bounds, and `createLegendLayoutForForm` as the one dispatch"
  - "`LegendLayout` as a discriminated union on `form`"
  - "`LegendState.form | caption | showNoData`; `LegendStyleState` is now a genuine `Partial` patch"
  - "A caption line (24 units, weight 600, composition ink) and a 'no data' row bound to `settings.uncoloredFill` with NO fallback literal"
  - "Rows RESTYLED: flat swatches, and `LEGEND_INTERNAL_PADDING` deleted. 336x96 -> 288x48 at one entry"
  - "`getRowHeight` — a rows entry's height derived from the line height, so the row contains its own text"
  - "`LegendEditor` `Legend form` (Bar/Rows) and `Legend content` (caption + no-data) groups"
  - "`tests/e2e/support/pngProbe.ts` — the ONE PNG decode path for the whole suite, shared with `export.spec.ts`"
  - "`legend.spec.ts` Gates A/B/C on real downloaded bytes, plus a baseline-absence scan"
  - "`ROADMAP.md § Phase 4 04-08` amended (CD-8); `coding-rules/storage.md` § the three fields `04-13` added back"
affects: [04-14, 04-15, 04-16]

actuals:
  tokens: 52726
  tasks: 4
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A second FORM needs a second LAYOUT FUNCTION, not a widened one. `createLegendLayout`'s width is a column formula; reusing it for a 48-unit strip over-reports by 240 and clamps the legend to the wrong place"
    - "A discriminated union on the form, never one interface with two half-empty arrays — a renderer reading `layout.items` on a bar would paint nothing, silently"
    - "Inner padding is a CONTAINER's property. When the container is deleted the padding has to go too, and whatever the padding was silently containing has to be contained deliberately (`getRowHeight`)"
    - "An assertion whose premise a restyle destroys is RE-DERIVED against something the layout provably does not paint, or retired in place — never quietly shrunk. A crop that evaluated to a height of -14.4 is caught by the frame bound, not by the eye"
    - "When a mutation reddens a DIFFERENT gate than the one under test, the fix is to reorder so the gate under test fails FIRST — not to accept the wrong red"
    - "A pixel gate's threshold decides what it can see. `DARK_INK_THRESHOLD` is blind to a light container; say so beside the gate instead of letting the reader assume coverage"
    - "One decode path per SUITE, not per spec. Two `createImageBitmap` implementations in two files drift exactly as silently as two in one"

key-files:
  created:
    - tests/e2e/support/pngProbe.ts
  modified:
    - src/types/composition.ts
    - src/utils/legend.ts
    - src/utils/legend.test.ts
    - src/utils/compositionText.ts
    - src/utils/storage.ts
    - src/utils/storage.test.ts
    - src/components/LegendOverlay.tsx
    - src/components/LegendOverlay.test.tsx
    - src/components/LegendEditor.tsx
    - src/components/LegendEditor.test.tsx
    - src/providers/CompositionStateProvider.tsx
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
    - tests/e2e/final-integration.spec.ts
    - tests/e2e/persistence.spec.ts
    - tests/e2e/fixtures/legend.html
    - tests/e2e/fixtures/export.html
    - .planning/ROADMAP.md
    - .planning/coding-rules/storage.md

key-decisions:
  - "OWNER GATE Task 4 = **PROCEEDED PAST, NOT PASSED.** Answered under a **blanket, in-advance, sight-unseen proceed-authorization**. It **authorizes proceeding**; it is **not a content review** and it is **not hash-bound** (Immutable Safety Constraint 8). **`G-1` is NOT claimed resolved. `OQ-3` and `OQ-5` both stay OPEN.**"
  - "The mixed-map default ships as **`bar`**, per the planner's recommendation: a bar degrades to a legible ordered stack while rows lose the ordering entirely. `04-UI-SPEC.md` is explicit this is a recommendation and not a decision, so it ships as the INFERRED default with the explicit override present in the Legend panel. A shipped default is not an answered question — **OQ-5 remains OPEN.**"
  - "Rows lost `LEGEND_INTERNAL_PADDING` — the inner padding of a container D4-11 deleted. That is the restyle the owner asked for, and it moves twelve numbers, every one re-baselined with its reason in the source"
  - "The bar's segment height is bounded BOTH ways: a floor so it clears its own boundary label, and a ceiling so 30 entries plus a caption plus a no-data row cannot exceed the safe area"
  - "`form` is persisted RESOLVED, not as the raw override. `04-05`'s hex-at-serialization leaves a reloaded composition with no ramp assignments, so persisting `null` reopened every saved bar legend as rows — measured at 1426 red legend pixels before a reload and 484 after"
  - "The PNG decode helpers moved OUT of `export.spec.ts` into `support/pngProbe.ts`. `04-12`'s rule (two decode paths is how two sampled-pixel assertions start measuring differently) does not stop at the file boundary"
  - "A caption input and a 'no data' toggle were ADDED to the editor beyond the plan's one new group, because a legend element that reaches the exported PNG and cannot be authored is a stub"
  - "Selector ceiling RAISED 335 -> 337, measured both ways. Both new fieldsets cost ZERO — only the caption label and the checkbox variant of the pill input are new"

requirements-completed: [D4-12, D4-09]
---

# Phase 4 Plan 13: Two legend forms, and the "no data" binding — Summary

The legend has two forms now. A ramp-painted map gets a **contiguous stacked
bar** with tick leaders and break boundaries; a categorical one gets **rows**,
restyled to the same restraint rather than left as they were; and the creator
can override either. A "no data" row binds its swatch to
`settings.uncoloredFill`, and real PNG pixels prove they are the same value.

---

## Task 4 — THE OWNER GATE, and what it does NOT say

**Proceeded past, not passed.**

**Authorization, in the required words:** answered under a **blanket,
in-advance, sight-unseen proceed-authorization**
(`04-AUTHORIZATION.md`). It **authorizes proceeding**; it is **not a content
review**, and it is **not hash-bound** (Immutable Safety Constraint 8).

### ⛔ What is NOT claimed

- **`G-1` is NOT resolved, and this plan does not claim it is.** Nobody has
  looked. The complaint was subjective — *"the legend is a bit too high"*, then
  *"I dont know the entire legend is off and just not write"* — and
  `04-VALIDATION.md` lists cartographic resemblance as **manual-only**. Whether
  the owner considers it answered is the owner's judgement and cannot be
  substituted by an automated result. **`OQ-3` stays OPEN.**
- **`OQ-5` stays OPEN.** The mixed-map default ships as `bar`, which is the
  planner's recommendation and `04-UI-SPEC.md` says plainly that it is a
  recommendation and not a decision. **A shipped default is not an answered
  question.** The explicit override is present in the Legend panel, so the
  owner's eventual answer costs a one-line change either way.
- **Nothing is claimed about the exported PNG that requires a human eye.**
  Nobody opened one. Every claim below is a measurement.
- **No physical check was performed.** No screen-reader pass, no touch-target
  check, no 200 % zoom, no dark-theme review. No Phase 3 UAT cell is cited.

### What the owner was going to be asked, still unanswered

1. Is `G-1` fixed, or is the legend still "off"? `04-12` listed the candidates
   beyond position; **two of its four open properties are now addressed** (the
   contiguous bar replaces the 288-unit column list, and the swatch is flat with
   no stroke), and **two remain open** (the entry gap and the label typography
   at weight 600).
2. Bar, rows, or something else for a mixed map?
3. Anything in the exported PNG that differs from the editor?

---

## Task 1 — a second layout function, and the form dispatch

### The vocabulary and the inference

`LegendForm` is `'bar' | 'rows'`, with `LEGEND_FORMS` as its one home in the
style `LEGEND_TEXT_SIZES` and `RAMP_IDS` already use.
`inferLegendForm(colors)` reads `04-05`'s **discriminant** (`value.kind`), never
a `typeof` test — Live Invariant 10 exists because six call sites each grew
their own branch. Empty colour map → `rows`, and no marks.

`LegendState.form` is `LegendForm | null`, and `null` is the shipped default
rather than a missing value: writing a concrete form would freeze it at first
save, so a creator who later repainted a categorical map with a ramp would keep
a rows legend with no way to know why.

`inferredLegendForm` is derived **once** in `App` and handed to the overlay, the
editor, the bounds, and the export gate — the same discipline `04-12`
established for `legendBandExtents`. There is no second
`values.some(v => v.kind === 'ramp')` anywhere.

### The bar's own bounds, and why they had to be separate

`createLegendLayout`'s width is
`columns * LEGEND_COLUMN_WIDTH + (columns - 1) * LEGEND_COLUMN_GAP`. That
describes a column list. Reusing it for a 48-unit strip reports **288** where
the bar is **297** at three entries — and at a right-anchored preset the two
differ by enough to put the legend visibly inside the frame edge. The assertion
that carries this is `bar.position.x` (751) vs `rows.position.x` (760): each
form's right edge lands exactly on the safe inset, which is only true if each
form's own width reached the resolver.

**Both forms' bounds flow through `resolveLegendPosition`** (T-04-13-02, Live
Invariant 3), and the clamp is asserted for both — out of frame on both axes at
a custom position, and at a right-anchored preset where the two widths differ
most.

`LegendLayout` became a **discriminated union on `form`**, not one interface
with two half-empty arrays: a renderer reading `layout.items` on a bar would get
`[]` and paint nothing, silently. With the union it is a compile error.

### Bar geometry

| property | value | derivation |
|---|---|---|
| segment gap | **0**, as `LEGEND_BAR_SEGMENT_GAP` | named so the contract is greppable and assertable against `LEGEND_ENTRY_GAP` (8) |
| segment height | 32 at `medium` | `max(32, fontSize)` floored **and** `floor(available / N)` ceilinged |
| hairline | ONE, around the whole bar | segments carry **no stroke** — a per-segment hairline would draw a line between adjacent swatches and destroy the contiguity |
| ticks | **N + 1** | one at every boundary, including the bar's foot |
| boundary labels | **N** | at the tick that begins each segment, hanging BELOW it so the first cannot poke above the bounds |
| height | `captionBlock + N x segmentHeight + noDataBlock` | the plan's stated formula, asserted with and without a caption |

**`N + 1` ticks and `N` labels, and the gap is deliberate.** A boundary reading
of `N` classes needs `N + 1` values; the legend model holds `N` labels. The
closing tick is drawn unlabelled rather than faked, and Phase 5's classing
engine (`05-07`) is what supplies the missing one. Recorded in the function's
own doc comment.

**CD-8 holds in the code, not just the roadmap.** No literal range text is
rendered:
`grep -rnE "[0-9]+\.[0-9]\s*[-–]\s*[0-9]+\.[0-9]" src/utils/legend.ts src/components/LegendOverlay.tsx`
returns nothing, and a `rangePattern` assertion walks every rendered boundary
label.

### Rows, restyled — not left as it was

The owner: *"the row based legend needs to be made just as subtle."* Two changes
carry that:

1. **Flat swatches.** `rx="4"` is gone, matching a bar segment. Row 6 of
   `04-12`'s open-property table (*"the reference uses flat bar segments with no
   stroke"*) is addressed for shape; the per-swatch hairline stays, because it is
   what distinguishes the form from the bar.
2. **`LEGEND_INTERNAL_PADDING` deleted.** 24 units a side of inner padding
   belonging to a container D4-11 removed. Rows now start at `(0, 0)` like the
   bar. **One entry: 336 x 96 -> 288 x 48.**

### `LEGEND_MAX_ACTIVE_ENTRIES` is unchanged and gates BOTH forms

31 colours produce `too-many-active-colors` and `LEGEND_OVERFLOW_MESSAGE` in
`bar` and in `rows`, asserted in the same case. No bound moved.

---

## Task 2 — render, storage, the editor, and the roadmap

### The "no data" row, and the one thing it must not have

The swatch's fill is `settings.uncoloredFill` and nothing else. There is
**deliberately no `?? '#E5E7EB'` fallback**: a fallback would let the two values
diverge while the gate that exists to catch the divergence stayed green, which
is exactly the shape `04-UI-SPEC.md § 6.7` names. It arrives as a prop, so there
is one place the two could ever disagree.

The row is **detached** from the marks by `LEGEND_NO_DATA_GAP`, in both forms.
"No data" is not a step of the ramp, and welding it onto the bar's foot would
both misread the data and break the bar's defining property.

### The storage boundary (T-04-13-01)

| Stored field | Absent | Valid | Invalid |
|---|---|---|---|
| `form` | `null`, **no warning** | verbatim | repaired to `null`, **reported** |
| `caption` | `''`, **no warning** | verbatim | sanitised **and reported** |
| `showNoData` | `false`, **no warning** | verbatim | repaired to `false`, **reported** |

Absent is a schema difference — every record written before this plan lacks all
three, and reporting them would raise `composition-repaired` and its
creator-facing corruption toast on every one of them, forever. Both directions
are asserted and both were RED-proved.

### Selector inventory: 335 -> 337, RAISED with the reason

**Measured both ways** by running the assertion with the ceiling at 0: **335
before, 337 after.**

| rule | what it styles |
|---|---|
| `.legend-editor__caption` | the caption field's stacked label-over-input |
| `.legend-editor__pill input[type="checkbox"]` | the "no data" toggle, joining the existing grouped click-bearing-input rule |

**Both new fieldsets cost ZERO.** `Legend form` and `Legend content` reuse
`.legend-editor fieldset fieldset`, `.legend-editor fieldset legend`, and
`.legend-editor__pill`; the caption's `<input>` takes `theme.css`'s global
`input` recipe. Two groups and three controls for two selectors.

**Assertion 23's counts did not move.** No creator-facing message was added: the
caption **truncates rather than refuses**, precisely so no new string enters
`ToastRegion`'s allowlist. The Position picker and its announcements are
byte-identical.

### CD-8, landed

`ROADMAP.md § Phase 4`'s `04-08` bullet no longer asks for a form that is not
shipping. `grep -c "range-entry mode" .planning/ROADMAP.md` returns **0**. The
bullet describes the two forms that shipped and carries a dated amendment note
citing `04-CONTEXT.md § specifics` and `04-UI-SPEC.md § 6.7`.

**Scoped `Edit` on that bullet only.** `git diff` on `.planning/` shows exactly
two files, `ROADMAP.md` (+16/-4) and `coding-rules/storage.md`. **The § Progress
table, every checkbox, every other phase, and `STATE.md` are untouched, and no
gsd-sdk verb was run.**

---

## Task 3 — the legend on real PNG pixels

**No image baseline anywhere**, and the absence is **asserted** rather than
observed (T-04-13-04): a scan of `tests/e2e` fails on any image file or any
Playwright snapshot matcher, with a guard that the walk found files at all.
`git status --porcelain` shows no new `.png`.

### The extraction that had to come first

`04-12` put its PNG gate in `export.spec.ts` because every decode helper was
private there. `04-13` needed the same counters in `legend.spec.ts`, so the
helpers moved into **`tests/e2e/support/pngProbe.ts`** and `export.spec.ts`
imports them. `04-12`'s reasoning — *"two PNG decode paths in one spec is how a
sampled-pixel assertion quietly starts measuring a differently decoded image"* —
does not stop at the file boundary. There is now exactly one
`createImageBitmap`, one canvas, one `getImageData`, and one ink predicate
behind every pixel claim the repository makes.

### The three gates

**Gate A — the "no data" swatch equals the uncoloured fill.** Three claims on
one downloaded frame: the swatch pixel equals
`DEFAULT_COMPOSITION_SETTINGS.uncoloredFill`; an interior pixel of an uncoloured
Brazil equals the same value; therefore the two equal each other. **The equality
alone would be satisfied by two identical wrong colours** — the "cross-context
equality three blank canvases satisfy" shape — so the first two are named
separately against the imported constant. The country point is located by
`isPointInFill` over a grid inside the bounding box, never a guessed latitude.

**Gate B — the bar has no gaps and the rows do.** A column sampled down the
swatch stack, **derived per form** (the bar's marks are a 48-unit strip, the
rows' are 24-unit swatches; one shared literal `x` would sample the label column
in one of the two). Bar: **zero** runs of paper between swatches. Rows: at least
one. Two forms, one property, opposite expectations, same run.

**Gate C — an empty legend renders nothing.** Zero ink in the region a one-entry
legend *would* occupy, with the painted frame as the content floor.

All three carry: IHDR read at exactly **1080 x 1080**; `expectRegionInsideFrame`
on every derived crop before anything is sampled; `02-27`'s blank control
through the same counter at the same threshold; and a content floor **first**.

---

## RED Proofs

**Ten, each on its own subject**, each restored by **scratchpad copy-back**
(`/private/tmp/claude-501/.../scratchpad`), never by `git checkout --`. Each
restore confirmed by SHA-256 and `git status`.

### 1. The bar bypassing `resolveLegendPosition` (T-04-13-02 — the plan's required proof)

Mutation: `position: form === 'bar' ? legend.position : resolveLegendPosition(...)`.

```
FAIL  legend forms (D4-12) > clamps BOTH forms inside the 1080 square through resolveLegendPosition
AssertionError: the bar legend runs off the right of the exported square: expected 4297 to be less than or equal to 1048
FAIL  legend forms (D4-12) > clamps BOTH forms at a right-anchored preset, where the two widths differ most
AssertionError: expected 297 to be 1048 // Object.is equality
```

Two failures, both the clamp claim, and **only** those two: the rows form stayed
green, which is what proves the mutation is bar-specific.

### 2. The bar reusing `createLegendLayout`'s column width formula

```
FAIL  legend forms (D4-12) > widths the bar from the strip, the ticks, and the widest boundary label — NOT the column formula
AssertionError: expected 288 to be 297 // Object.is equality
FAIL  legend forms (D4-12) > clamps BOTH forms at a right-anchored preset, where the two widths differ most
AssertionError: expected 760 not to be 760 // Object.is equality
```

### 3. `inferLegendForm` never returning `bar`

```
FAIL  legend forms (D4-12) > infers Bar when ANY assignment is a ramp, Rows when all are custom hex
AssertionError: expected 'rows' to be 'bar' // Object.is equality
```

### 4. The bar's segment height unbounded by the safe area

```
FAIL  legend forms (D4-12) > keeps every form/text-size combination inside the exported square
AssertionError: bar/30/small is taller than the safe area: expected 1040 to be less than or equal to 1016
```

### 5. An ABSENT stored `form` treated as present-and-invalid

Mutation: `const hasForm = true;`

```
FAIL  createStorageAdapter > loads a V2 record with NO form, caption, or showNoData as clean, resolving to the defaults
AssertionError: expected { ok: true, value: { …(5) }, …(2) } to match object { ok: true, warnings: [], …(1) }
```

### 6. An INVALID stored `form` / `caption` / `showNoData` reported as clean

Mutation: the three terms dropped from `isRepaired`.

```
FAIL  createStorageAdapter > reports an INVALID form, an invalid showNoData, and a damaged caption as repairs
AssertionError: expected { ok: true, value: { …(5) }, …(2) } to match object { ok: true, …(2) }
```

### 7. Gate A — **by DIVERGING the two values**, which is the gate's stated subject

Mutation: the "no data" swatch hard-codes `#D1D5DB` instead of reading
`uncoloredFill`.

```
Error: the "no data" swatch at (44, 216) does not read #E5E7EB.
- Expected  - 3
+ Received  + 3
```

### 8. Gate B — the bar given the rows form's `LEGEND_ENTRY_GAP`

```
Error: the bar column shows 1 run(s) of paper between its swatches. A contiguous stack has none — that is the form.
Expected: 0
Received: 1
```

### 9. Gate C — an empty legend rendering its container anyway

```
Error: the empty legend inked 1316 pixels into its own region. With no active colours the layer must render nothing at all.
Expected: 0
Received: 1316
```

> ⚠ **This probe was WRONG TWICE before it was right, and both failures are
> recorded in the test's own source rather than only here.**
>
> **First**, the mutation reddened the **structural** DOM check
> (`toHaveCount(0)` on the layer's children) instead of the pixel claim — the
> *"a probe reddens a DIFFERENT gate"* shape this repository has already
> shipped. With the DOM check first, the pixel gate never ran, so nothing proved
> it could fail. Fixed by moving the structural half **last**.
>
> **Second**, with the ordering fixed, a light `#9CA3AF` container measured
> **zero** at `DARK_INK_THRESHOLD` — (156, 163, 175) is not dark ink — so the
> pixel claim stayed green. Raising the threshold to 240 is not available: the
> uncoloured land under this crop is `#E5E7EB` and would then count as thousands
> of ink pixels in every frame. **So the pixel claim covers DARK legend ink
> only, and the structural check is what covers a light container.** Both ship;
> neither is presented as covering the other, and the limitation is written
> beside the gate.
>
> **Third**, moving the structural check last made it read the wrong state — by
> then the content floor had painted a country. The full suite caught it. The
> child count is now MEASURED while the legend is empty and ASSERTED at the end.

### 10. The baseline-absence scan

Mutation: a `.png` dropped under `tests/e2e/fixtures/`.

```
Error: an image file appeared under tests/e2e. A baseline cannot be RED-proved on its own subject — assert a property instead.
+   "tests/e2e/fixtures/red-probe-baseline.png",
```

### Assertions NOT RED-proved, stated plainly

- **The re-derived co-occupancy crop in `export.spec.ts`** (see Deviations) was
  not separately reddened. It is a re-derivation of an existing assertion whose
  premise this plan destroyed, and its own falsification is the one it already
  performed: the old expression evaluated to a height of **-14.4** and
  `expectRegionInsideFrame` caught it. Its control is a measured upper bound,
  not a zero, for the reason recorded in the source.
- **Task 1 was NOT written tests-first**, despite `tdd="true"`. The type change
  had to compile before any test could reference it, so the implementation and
  the tests landed together and every behaviour was then proved falsifiable by
  mutation (proofs 1–4 above). The RED evidence is the same evidence; the
  ORDERING is not what the plan asked for, and this says so rather than
  implying a cycle that did not happen.
- The `ticks[0].y === outline.y` / `ticks[N].y === outline.y + height`
  assertions are structural preconditions for the boundary claims beside them,
  not claims of their own, and were not separately reddened.

---

## Deviations from Plan

### `[Rule 2 — missing functionality]` A caption field and a "no data" toggle, and two editor groups instead of one

- **Found during:** Task 2.
- **Issue:** the plan requires *"a caption line ... at 24 user units, weight
  600"* and an *"optional 'no data' row"*, and specifies exactly ONE new editor
  group (`Form`). It does not say where the caption's TEXT comes from, and
  nothing in the composition supplies one. A caption that can never be non-empty
  satisfies the truth vacuously; a "no data" row with no toggle is not optional.
- **Fix:** `LegendState` gained `caption` and `showNoData` alongside `form`, and
  the editor gained a second group, `Legend content`, holding a caption input
  and the toggle. **A rendered element a creator cannot author is a stub**, and
  this plan is required not to ship undocumented ones.
- **Cost:** one selector (`.legend-editor__caption`) plus the checkbox variant
  of the existing pill input. The group itself is free.
- **Copy:** `Legend content`, `Legend form`, `Legend caption`, and
  `Show no data row` are **authored here, not lifted from `04-UI-SPEC.md § 9`** —
  § 9 has a row for the two form OPTION labels (`Bar` · `Rows`, shipped
  byte-exact) and none for the group headings or the two new controls. Recorded
  as unspecified strings. None is a creator-facing MESSAGE, so assertion 23's
  allowlist counts do not move.
- **Commit:** `ffbaa25`.

### `[Rule 3 — blocking]` Tasks 1 and 2 landed in ONE commit

- **Issue:** widening `LegendState` with three fields breaks every consumer at
  once — the overlay, the editor, the provider, both transactions, the storage
  normaliser, `App`, and eight test files. Any split leaves a red intermediate
  build, which is worse than a merged commit.
- **Fix:** one `feat` commit carrying both tasks' code, saying so in its first
  paragraph. Task 3 and the documentation are separate commits.
- **Commits:** `ffbaa25`, `0fc831d`, `005d051`.

### `[Rule 1 — bug]` The bar overflowed the safe area at 30 entries

- **Found during:** Task 1, by this plan's own fit gate.
- **Issue:** `30 x 32 + 40 (caption) + 40 (no data)` is **1040** against a safe
  area of **1016**. Unlike rows, the bar has no second column to reflow into, so
  the bounds exceeded what `isBoundsValid` accepts and the clamp had nowhere
  legal to put the legend.
- **Fix:** the segment height is bounded BOTH ways — a floor so it clears its
  own boundary label, and `floor(available / N)` as a ceiling.
- **RED-proved:** proof 4.

### `[Rule 1 — bug]` The rows restyle put a two-line `large` label OUTSIDE the legend bounds

- **Found during:** Task 3, by `export.spec.ts`'s existing max-length-label gate.
- **Issue:** **656 ink pixels outside the resolved legend region.**
  `LEGEND_TWO_LINE_HEIGHT` is a flat 64, but two `large` lines need
  `2 x 44 = 88`. The row never contained its own text — the 24-unit container
  padding absorbed the difference, so the ascender stayed inside the BOX while
  being outside the ROW. Deleting the padding exposed it. This is the
  clipped-PNG defect this project has already shipped once.
- **Fix:** `getRowHeight` derives the height from the line height, with the old
  constants kept as floors so nothing shrinks.
- **Consequence, re-baselined:** two medium two-line rows measure `288 x 152`,
  not `288 x 136`.

### `[Rule 1 — bug]` Every reopened saved map silently changed its legend form

- **Found during:** Task 3, by `final-integration.spec.ts`.
- **Issue:** `04-05`'s save path resolves every `ColorValue` to a hex, so a
  reloaded composition has **no ramp assignments left at all** and
  `inferLegendForm` returns `rows` for every one of them. A creator who saved a
  ramp-painted map with a bar legend would reopen it as rows, and its exported
  PNG would differ from one they may already have posted. **Measured: 1426 red
  legend pixels before the reload, 484 after.**
- **Fix:** the save path writes the **RESOLVED** form. A save is a snapshot, so
  it records the form the legend actually had. Recorded in
  `coding-rules/storage.md` with `04-14` named as the plan that can revert it
  once V3 persists the colour union.
- **Commit:** `ffbaa25`.

### `[Rule 1 — bug]` `final-integration.spec.ts`'s corner box missed the bar entirely

- **Found during:** Task 3.
- **Issue:** the 0.32 corner box was sized for a 24-unit row swatch. The bar's
  coloured pixels sit at its LEFT edge with the labels running right, so a
  bottom-right-anchored bar puts them `legendWidth` units in from the frame edge
  — outside the box, reporting a tidy **zero**. The test read *"the legend did
  not arrive in the bottom-right corner"* while it had.
- **Fix:** a separate bottom-right box, both fractions DERIVED. `0.52` on x,
  because the widest legend this test can produce is 526 units. `0.25` on y from
  the bottom, because at 0.52 on both axes the box swallowed **8 pixels of
  France** and a `toBe(0)` would have been reporting a country rather than a
  legend.
- Also: exact pixel equality between the authored and undone frames became a
  tolerance of `LEGEND_BAR_WIDTH`, because contiguous segments antialias against
  each other while a lone one antialiases against paper. **Measured
  disagreement: 46 pixels** — one antialiased row across a 48-unit bar. The
  claim is unchanged.

### `[Rule 3 — blocking]` `export.spec.ts`'s co-occupancy crop had no space left to sample

- **Found during:** Task 3.
- **Issue:** the crop was *"inside the legend's bounds, above its own label"*,
  and that space existed only because of `LEGEND_INTERNAL_PADDING`. In BOTH
  restyled forms the marks now start at `y = 0` and fill their own bounds. The
  old expression evaluated to a height of **-14.4**, caught by
  `expectRegionInsideFrame` rather than silently sampling nothing.
- **Fix:** re-derived onto the ONE rectangle inside the legend's bounds that the
  legend provably does not paint — `LEGEND_NO_DATA_GAP`, the 16-unit detachment
  between the bar's foot and the "no data" row. The test now switches the row on
  through the real UI, which also exercises the new feature in the export path.
- **And its control had to change too, honestly.** The new crop sits lower in
  the frame, where the capped band no longer washes out the map's border
  strokes: the title-free frame measures **348** dark pixels there, none of them
  the legend. `toBe(0)` would be a gate that cannot pass. The claim is now a
  DELTA — the title adds at least 800 ink to a crop that already carries some
  map — plus an upper bound of 700 on the control that replaces the drift check
  the zero used to do. `expectBlankControlReadsZeroInk` still runs the exact
  region through the exact counter at zero.

### `[Rule 3 — blocking]` The PNG decode helpers moved to a shared module

- **Issue:** the plan puts Task 3's gates in `legend.spec.ts`. Every counter
  they need was private to `export.spec.ts` — the wall `04-12` hit and resolved
  by moving its gate the other way.
- **Fix:** `tests/e2e/support/pngProbe.ts`, imported by both. `04-12`'s rule
  does not stop at the file boundary; two decode paths in two specs is the same
  defect with a longer fuse. `export.spec.ts` lost eight local definitions and
  gained one import block; all 30 of its tests still pass.

### `[Rule 1 — bug]` One `.first()` on a legend `<text>` would have retargeted

- **Found during:** the selector re-check the prompt required.
- **Issue:** `measureRunningLegend`'s `layer.locator('text').first()` was
  unambiguous while a legend text could only be an entry label. **The bar adds a
  CAPTION as the first text in the layer** — 24 units, not the 32 the assertion
  is about. This is `04-12`'s retargeting defect class exactly.
- **Fix:** it now names `[data-legend-boundary="true"]`. A second ordinal, in
  `legend.spec.ts`'s chrome test, was replaced with an assertion that **every**
  legend text carries the one composition ink — stronger and ordinal-free.
- **Audited and confirmed safe:** every other legend selector in the suite is a
  `toHaveCount` or `toHaveText` on `[data-layer="legend"] text`. The bar renders
  one `<text>` per entry exactly as rows does, so both keep their meaning.

### Documentation scope

`coding-rules/frontend.md` was **not** touched. The plan's declared file set did
not include it and the rules this plan establishes have homes: `storage.md`
carries the three-fields rule and the resolved-form decision, `legend.ts`'s own
doc comments carry the two-layout-functions rule and the `getRowHeight`
derivation, `uiContract.test.ts` carries the ceiling, and `ROADMAP.md` carries
CD-8. Recorded rather than done silently.

---

## Re-baselined, itemised and deliberately

Every one carries the superseded measurement beside it in the source.

| # | assertion | from | to | reason |
|---|---|---|---|---|
| 1 | `legend.test.ts` three-column clamp width | 960 | 912 | rows lost 24 a side |
| 2 | `legend.test.ts` two-column bounds | 648 | 600 | same |
| 3 | `legend.test.ts` two-column resolved x | 400 | 448 | a narrower legend has more legal x |
| 4 | `legend.test.ts` `validateActiveLegend` bounds | 648 | 600 | same |
| 5 | `legend.test.ts` default legend key set | 3 keys | 6 keys | D4-12's three additions |
| 6 | `LegendEditor.test.tsx` overlay bounds | 336 x 184 | 288 x 152 | padding removed (-48/-48), then `getRowHeight` added +16 |
| 7 | `LegendEditor.test.tsx` preset transform | `translate(712 32)` | `translate(760 32)` | narrower legend at a right preset |
| 8 | `LegendOverlay.test.tsx` one/two/three-column widths and x | 336/648/960, 712/400/88 | 288/600/912, 760/448/136 | padding removed |
| 9 | `legend.spec.ts` browser column widths and x | same | same | same |
| 10 | `legend.spec.ts` G-1 investigation footprint | 336 x 96, 8.89 % | **297 x 32, 2.96 %** | **a FORM change, not a number change** — a ramp-painted map now resolves to the bar. Row 2 of `04-12`'s table |
| 11 | `legend.spec.ts` G-1 investigation swatch | 24 x 24, stroked | 48 x 32, **unstroked** | the mark is a bar segment; rows 3 and 6 of that table |
| 12 | `persistence.spec.ts` saved key set | `entries,position,textSize` | `caption,entries,form,position,showNoData,textSize` | the same key-SET assertion, three keys wider |
| 13 | `useCompositionSaveTransaction.test.tsx` snapshot legend | `composition.legend` | `{...composition.legend, form: 'rows'}` | the resolved-form write, asserted explicitly so it cannot widen silently |
| 14 | `final-integration.spec.ts` undo/authored red equality | exact | tolerance `LEGEND_BAR_WIDTH` | contiguous segments antialias against each other; **measured 46** |
| 15 | `uiContract.test.ts` selector ceiling | 335 | 337 | measured both ways |

**Nothing was re-baselined to make an assertion pass while it was reporting a
real change.** Rows 10 and 11 are the closest call, and they are labelled as a
form change rather than a number change for exactly that reason.

---

## Verification

Full gate, run on this working tree at `005d051`:

| gate | result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **850 / 850** passing, 47 files (was 832 at plan start) |
| `tsc -b` + `npm run build` | clean |
| `npm run test:e2e -- --project=chrome` | **135 / 135** passing (was 131 at plan start) |
| selector inventory | **337**, ceiling raised from 335 with the reason |
| new baseline images | **none**, and the absence is asserted |
| `npm run data:world:check` | ⚠ **NOT RUN — network unreachable** (see below) |

**Browser: installed Chrome 151.0.7922.76 only**, verified with
`Google Chrome --version` in this session. **Microsoft Edge is not installed on
this machine** and the `msedge` project was not run; no Edge, Firefox, or Safari
result is produced or cited. **No Phase 3 UAT cell is cited as verified.**

> ⚠ **`npm run data:world:check` failed with `fetch failed`** — it is a
> live-network dependency on `raw.githubusercontent.com` and the host was
> unreachable during this session. It is recorded as **NOT RUN**, not as passed.
> This plan modified **no file under `public/data/`**, so no data asset,
> manifest, or approval is implicated; the check should be re-run when the
> network is reachable.

**Live Invariant 3 holds.** ~~`grep -rn "legend\.position" src/ --include=*.ts
--include=*.tsx | grep -v "legend.ts\|\.test\."` returns nothing~~ — and the
per-file raw-occurrence counts are byte-identical to pre-plan `63fc17a`:
`CompositionStateProvider.tsx` 2 → 2, `LegendEditor.tsx` 5 → 5,
`useCompositionLoadTransaction.ts` 1 → 1, `useCompositionSaveTransaction.ts`
1 → 1, `App.tsx` 1 → 1, `LegendOverlay.tsx` 0 → 0. **No new reader.**

> ⚠ **CORRECTED 2026-08-07 — finding `F-3` of
> [`04-16-REVIEW.md`](04-16-REVIEW.md) § 9. The conclusion above is correct and
> was independently re-verified; the struck-through *proof* was void.**
>
> **What was wrong.** The `--include` globs were **unquoted**. Under this repo's
> shell (zsh) the command never ran at all — it aborts during word expansion with
> `no matches found: --include=*.ts`, and a command that does not run produces no
> output, which was then read as *"returns nothing"*. This is the exact failure
> shape the project has been burned by before: **a gate that cannot fail, whose
> silence is mistaken for a pass.**
>
> **The command, quoted, as it should have been run:**
>
> ```
> grep -rn "legend\.position" src/ --include="*.ts" --include="*.tsx" \
>   | grep -v "legend\.ts\|\.test\."
> ```
>
> It returns **ten hits, not nothing.** The per-file counts above were always
> right — those ten *are* the 2 + 5 + 1 + 1 + 1 the table already lists. Only the
> "returns nothing" sentence was false. Every hit classified:
>
> | # | Site | Class | Render or export path? |
> |---|---|---|---|
> | 1 | `LegendEditor.tsx:338` — `resolveLegendPosition(legend.position, bounds, bandExtents)` | **Goes through the sanctioned chokepoint** — this is what the invariant *mandates*, not a bypass | no |
> | 2 | `LegendEditor.tsx:352` — same call inside `nudge()` | Same | no |
> | 3 | `LegendEditor.tsx:647` — `checked={legend.position.preset === option.value}` | Editor chrome: the corner radio's `checked` state | no |
> | 4 | `LegendEditor.tsx:664` — `checked={legend.position.preset === null}` | Editor chrome: the Custom radio | no |
> | 5 | `LegendEditor.tsx:678` — `legend.position.preset === null ? …` | Editor chrome: reveals the nudge controls | no |
> | 6 | `App.tsx:1253` — `getLegendPositionLabel(compositionState.legend.position)` | Editor chrome: the disclosure's summary label | no |
> | 7 | `CompositionStateProvider.tsx:283` — inside `canonicalizeLegend` | State normalisation on write | no |
> | 8 | `CompositionStateProvider.tsx:634` — the `SET_LEGEND_POSITION` reducer case | Reducer | no |
> | 9 | `useCompositionSaveTransaction.ts:72` — `position: { ...composition.legend.position }` | Persistence write | no |
> | 10 | `useCompositionLoadTransaction.ts:122` — `position: { ...snapshot.legend.position }` | Persistence read | no |
>
> **None of the ten is a render or export path.** `LegendEditor.tsx` is the
> editor panel — radio inputs, nudge buttons, fieldsets — and panel chrome is
> outside export membership; its only two *positional* reads go **through**
> `resolveLegendPosition`. The two components that actually put legend pixels on
> screen and into the PNG are clean by direct inspection:
> `LegendOverlay.tsx:378` takes `{ activeEntries, layout, bounds, position }`
> from **`resolveLegendRender`** and holds no raw read (0 → 0, as the table
> says), and `grep -n "legend\.position" src/utils/export.ts` returns **zero**.
>
> **The invariant is intact. The recorded proof of it was not.** Corrected here
> rather than deleted, so the failure shape stays visible: an unquoted glob is
> indistinguishable from a clean result unless you check the exit path.

---

## What `04-14` inherits

- **A six-key legend record**: `{entries, position, textSize, form, caption,
  showNoData}`. `persistence.spec.ts` asserts that exact set.
- **`form` is written RESOLVED**, and `04-14` is named as the plan that can
  revert it to a raw override once V3 persists the `ColorValue` union — at which
  point the ramp identity survives a round trip and the inference does too.
- **A new bound**: `MAX_LEGEND_CAPTION_LENGTH` (32), which truncates rather than
  refuses. No existing bound moved.
- **The V3 node budget genuinely needs rechecking**: three more keys per legend
  record, on top of `04-05`'s note that a union object per country is more nodes
  per entry.

## Open items this plan hands forward

- **`OQ-3` is OPEN. `G-1` is NOT claimed resolved.** Nobody has looked at the
  legend. The owner-facing confirmation is `04-16`'s UAT.
- **`OQ-5` is OPEN.** `bar` ships as the inferred default for a mixed map, with
  the override present. A shipped default is not an answered question.
- **Two of `04-12`'s four open legend properties remain open**: the entry gap
  (`LEGEND_ENTRY_GAP` 8) and the label typography (weight 600 on meta text, a
  Phase 3 D-25 choice nobody has re-examined against the reference). The other
  two — the column-list layout and the stroked rounded swatch — are addressed.
- **`03-UI-SPEC.md`'s `.map-navigation` `inset-inline-end` formula is still
  unannotated.** Named again; not touched.
- **`npm run data:world:check` needs re-running** when the network is reachable.
- **Gate C's pixel claim is blind to a LIGHT empty legend container**, by
  measurement. The structural check covers that case; a future plan wanting a
  single gate would need a threshold the uncoloured fill does not trip.

## Known Stubs

**None introduced.** The caption and the "no data" row are both authorable from
the Legend panel — that is why the editor grew two groups instead of one. No
hardcoded empty value, placeholder string, or unwired component was added.

Carried forward from earlier plans, unchanged by this one: a saved composition
still reloads with default water (`04-14` owns it).

## Threat Flags

None. No new network endpoint, auth path, or file-access pattern. The one
trust boundary this plan touches — `localStorage` V2 → `normalizeLegend` — is
covered by T-04-13-01 and is asserted in both directions and RED-proved in both
directions. **Zero package-manager installs** (T-04-13-SC): `package.json` and
`package-lock.json` are unchanged.

## Self-Check: PASSED

- `src/utils/legend.ts` — FOUND, exports `LEGEND_FORMS`, `inferLegendForm`,
  `resolveLegendForm`, `createBarLegendLayout`, `createLegendLayoutForForm`,
  `getRowHeight`'s callers
- `src/components/LegendOverlay.tsx` — FOUND, renders both forms, the caption,
  and the `uncoloredFill`-bound "no data" row
- `tests/e2e/support/pngProbe.ts` — FOUND, the shared decode path
- `.planning/ROADMAP.md` — FOUND, `grep -c "range-entry mode"` returns 0 and the
  `04-08` bullet carries the dated CD-8 amendment
- `.planning/coding-rules/storage.md` — FOUND, § the three fields `04-13` added
  back
- `.planning/STATE.md` — UNTOUCHED, confirmed by `git status`
- Commit `ffbaa25` — FOUND
- Commit `0fc831d` — FOUND
- Commit `005d051` — FOUND
