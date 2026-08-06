---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 10
subsystem: stylesheets
tags: [d-06, a-20, a-21, cf-7, d-05, controls-css-split, selector-ceiling, red-probe, icon-provenance]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 03
    provides: "the directory-walk discovery seam in `uiContract.test.ts` that this plan's assertion 20 lands on top of, and the `.tool-panel__content` the section cards dissolve beside"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 04
    provides: "assertion 2's retired-token list, the contrast matrix and its row literal, and the `--success`/`--warning` families it deliberately let survive one more plan"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 07
    provides: "the retired save/load dialog whose overlay, frame, header, and footer rules this plan found unreachable"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 09
    provides: "the toast's layout-scoped rule authored beside its base rule, and the request that the two stay together through the split"
provides:
  - "`Controls.css` retired into eight per-surface sheets under `src/styles/controls/`"
  - "assertion 20: the globbed stylesheet set equals `main.tsx`'s parsed import set, compared AS SETS, RED-proven three ways"
  - "assertion 21: a distinct-selector ceiling of 326 (down from 339), counted from the tokenising parser in comma-separated parts, with a structural floor"
  - "a pinned import order in `main.tsx` with `editor.css` last, asserted"
  - "CF-7 / D-05: `--success`, `--success-tint`, `--warning`, `--warning-tint` DELETED and added to assertion 2's retired list"
  - "two further hard-coded stylesheet lists (`themeTokens.test.ts`, `lib/motion/tokens.test.ts`) converted to directory walks"
  - "the three unconsumed glyphs' `Consumer:` provenance lines corrected"
  - "`coding-rules/frontend.md` §The Stylesheet Split and the Selector Ceiling"
affects: [03-11, 03-12]

actuals:
  tokens: 96000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a set-equality gate between what a walk discovers and what the entry module imports — not a count, because a count is satisfied by any rename that swaps one file for another"
    - "a mass metric expressed as a CEILING with a structural floor, so it fails on growth and cannot pass vacuously at zero"
    - "counting comma-separated selector parts rather than rules, so the metric is independent of a refactor that regroups selectors"
    - "one home per cross-cutting rule EXCEPT where a selector also carries a second rule elsewhere, which is split so no element is anchored in two files"

key-files:
  created:
    - "src/styles/controls/controls.css"
    - "src/styles/controls/selectionPanel.css"
    - "src/styles/controls/colorPicker.css"
    - "src/styles/controls/countryList.css"
    - "src/styles/controls/saveLoad.css"
    - "src/styles/controls/toast.css"
    - "src/styles/controls/legendEditor.css"
    - "src/styles/controls/locateCountry.css"
  modified:
    - "src/styles/Controls.css — DELETED (1438 lines)"
    - "src/styles/App.css — reduced to `#root` and `.selection-live-region`"
    - "src/styles/editor.css — absorbed the panel section cards, the four `.workspace__*` wrappers, and `.onboarding`"
    - "src/styles/theme.css — the four status-hue tokens deleted from both modes"
    - "src/styles/MapCanvas.css — the partial-data banner de-hued"
    - "src/main.tsx — the pinned import list"
    - "src/styles/uiContract.test.ts — assertions 20 and 21; contrast matrix 18→16 pairs, 108→96 rows"
    - "src/styles/themeTokens.test.ts — walk-based colour-literal sweep; token allowlist"
    - "src/lib/motion/tokens.test.ts — walk-based consumer scan"
    - "src/components/Controls.test.tsx — re-pointed at `controls/controls.css`"
    - "src/components/icons/{Crosshair,Plus,Minus}Icon.tsx, PROVENANCE.md"
    - ".planning/coding-rules/frontend.md"

key-decisions:
  - "An EIGHTH file, `controls/toast.css`, rather than folding the toast into `editor.css`. 03-09 required its base rule and its layout-scoped rule to stay together; a dedicated surface file keeps them adjacent without putting toast paint in the shell grid sheet."
  - "The panel section card, the four `.workspace__*` wrappers, and `.onboarding` dissolved into `editor.css` rather than being duplicated across three surface files or parked in a 'shared' one — their subject is the container that places them."
  - "Cross-surface grouped rules kept ONE home, except three where the second surface also had its own rule elsewhere; those were split so no element is anchored in two files. The distinct-selector count is identical either way."
  - "Two further hard-coded stylesheet lists were converted to directory walks rather than re-pointed at eight filenames — they would have gone stale in this same commit."
  - "CF-7 resolved by DELETING all four token names and adding them to assertion 2's retired list, not by aliasing them onto a neutral."
  - "The three unconsumed glyphs' provenance was CORRECTED rather than the glyphs wired: D-21 does not describe animated camera chrome, and 03-08 already recorded the wiring as churn."

patterns-established:
  - "A ceiling gate needs a floor, and the floor should be structural (every discovered file contributes) rather than a second magic number"
  - "A count taken over a stylesheet is taken from the parser, so a comment can neither inflate it nor poison a neighbouring negative gate — proven by putting a banned property inside a comment and watching the ban stay green"
  - "Before deleting a CSS rule, grep `src/` and `tests/`, and check for classes built by template literal — five live modifiers report as missing to a plain source search"

requirements-completed: [D-06, A-20, A-21]

coverage:
  - id: D1
    description: "`Controls.css` is retired into eight per-surface sheets; the rules the restyle orphaned are deleted, and moved and deleted counts are reported separately"
    requirement: "D-06"
    verification:
      - kind: manual
        ref: "`test ! -f src/styles/Controls.css` → CONTROLS_CSS_RETIRED"
        status: pass
      - kind: e2e
        ref: "full Chrome suite, 100 of 100, run after the split with no rule edited"
        status: pass
    human_judgment: false
  - id: D2
    description: "Assertion 20: the globbed stylesheet set equals the set `main.tsx` imports, compared as sets, with the shell sheet pinned last"
    requirement: "A-20"
    verification:
      - kind: unit
        ref: "src/styles/uiContract.test.ts#imports every discovered stylesheet, and discovers every imported one"
        status: pass
      - kind: unit
        ref: "src/styles/uiContract.test.ts#imports the shell sheet last"
        status: pass
    human_judgment: false
  - id: D3
    description: "Assertion 21: the distinct-selector inventory is a ceiling of 326, counted from the tokenising parser and blind to comments, with a structural floor"
    requirement: "A-21"
    verification:
      - kind: unit
        ref: "src/styles/uiContract.test.ts#keeps the distinct-selector inventory at or below the recorded ceiling"
        status: pass
      - kind: unit
        ref: "src/styles/uiContract.test.ts#counts parsed selectors and never comment text"
        status: pass
    human_judgment: false
  - id: D4
    description: "CF-7 / D-05: the success and warning hues are gone from the product and a stale reference fails"
    verification:
      - kind: unit
        ref: "src/styles/uiContract.test.ts#references no retired token name in any stylesheet"
        status: pass
      - kind: unit
        ref: "src/styles/themeTokens.test.ts#declares only the allowlisted token namespaces"
        status: pass
    human_judgment: false
  - id: D5
    description: "The visual result of the split and of the de-hued status surfaces: that no panel lost its styling in the move, and that a neutral warning still reads as a warning"
    verification: []
    human_judgment: true
    rationale: "The Chrome e2e suite proves the DOM, geometry, and computed-style claims it already made still hold. It does not look at the page. Whether the neutral save-load note and the neutral partial-data banner still read with the urgency their copy claims is a visual judgement, and the plan's by-hand step (npm run dev, click through each panel) was not performed. PENDING the owner acceptance matrix."

duration: 41min
completed: 2026-08-06
---

# Phase 3 Plan 10: The Stylesheet Split and the Selector Ceiling — Summary

**`Controls.css` is retired into eight per-surface sheets, thirteen distinct selectors are gone
with nothing added, and the sweep is now a measured ceiling rather than a claim — with the two
directions of stylesheet coverage each RED-proven and two further hard-coded file lists caught and
converted on the way.**

## Performance

- **Duration:** 41 min
- **Tasks:** 3 of 3, plus the CF-7 and icon-provenance carry-forwards
- **Files changed:** 23 (8 created, 1 deleted, 14 modified)
- **Unit tests:** 626 → **630 passed**, 0 failed
- **Chrome e2e:** **100 passed / 0 failed** (100 total), run three times across the plan

## Browser scope

**Chrome only — Chrome 151.0.7922.75. Edge is NOT installed on this machine and no Edge result is
claimed** (D-33). Firefox, Safari, and previous-version certification have never been run in this
repository and are not claimed here.

---

## Task Commits

1. **Task 1 (tracer): split `Controls.css` per surface** — `a1bf990` (refactor)
2. **CF-7 / D-05 + icon provenance** — `797e9b6` (refactor)
3. **Task 2: assertion 20** — `9b96ba7` (test)
4. **Task 3: assertion 21 + `frontend.md`** — `a24fa8a` (test)

CF-7 was landed **before** Task 3 deliberately, so the ceiling assertion 21 records is the final
number rather than one that a later commit in the same plan immediately undercuts.

---

## Rules moved / rules deleted — separate numbers

`Controls.css` and `App.css` held **176 rule blocks** between them before this plan.

| Disposition | Count |
|---|---|
| **Moved** (relocated, or regrouped and relocated) | **167** |
| **Deleted as unreachable** | **7** |
| **Deleted by CF-7 / D-05** (a design change, not an orphan) | **2** |

Of the 167 moved, **8 were regrouped** rather than moved verbatim: two lost a dead selector part
and survived, three cross-surface grouped rules were split into six, one pair was merged into the
two rules it duplicated, and one narrow-width grouped rule was split in two.

**Every deletion was grep-verified across `src/` and `tests/` first.** The seven unreachable rules:

| Rule | Why unreachable |
|---|---|
| `.save-load-overlay` · `.save-load-dialog` · `.save-load-header` (×2 rules) · `.save-load-footer` | the modal dialog retired in `03-07`; nothing renders any of these classes |
| `.workspace__actions > section > div` · `.workspace__actions button` | `03-05` retired the actions container |
| `.workspace` | `03-06` moved the layout modifiers onto the panel track, so `class="tool-panel workspace--desktop"` carries the modifier token and **not** the bare `workspace` token. The rule matched no element |

Three further **dead selector parts** were dropped from rules that survive:
`.workspace__actions > section`, `.workspace__actions h2`, `.save-load-footer button`.

### The grep that mattered

A plain source search reported five classes as unreferenced:
`.legend-editor__position-cell--{top-left,top-right,bottom-left,bottom-right,custom}`. All five are
live — `LegendEditor.tsx` builds them with a template literal
(`legend-editor__position-cell--${option.value}`). They were checked individually rather than
deleted, and that check is now a rule in `coding-rules/frontend.md`.

---

## Selector inventory: pre / post / delta

| | Files | Distinct selectors |
|---|---|---|
| **Pre-sweep** (`8da72e8`) | 5 | **339** |
| **Post-sweep** (`a24fa8a`) | 12 | **326** |
| **Delta** | +7 | **−13** |

**Thirteen selectors removed, zero added.** The removed set, in full:

```
.workspace | .workspace__actions > section | .workspace__actions h2
.workspace__actions > section > div | .workspace__actions button
.save-load-overlay | .save-load-dialog | .save-load-header
.save-load-dialog > section | .save-load-footer | .save-load-footer button
.map-editor > section[data-severity="success"]
.map-editor > section[data-severity="warning"]
```

`SELECTOR_INVENTORY_CEILING = 326` is the recorded ceiling. It is **`at most`**, not an equality:
an exact match forces a test edit on every legitimate deletion and trains people to bump the number
reflexively, and a number that gets bumped reflexively is not a gate.

**Counted in comma-separated selector parts, not rules.** This plan both split grouped selectors
apart and folded others together; a rule count would have moved on the refactor alone and measured
the reorganisation instead of the mass. **`@keyframes` steps are excluded** — `to` parses as a rule
selector here and is not something the stylesheet styles.

**A ceiling is satisfied by zero,** so the floor is asserted structurally rather than as a second
magic number: every discovered stylesheet must contribute at least one selector. A walk that
resolved to nothing, or a parser that swallowed a file, fails there instead of reporting a very
tidy inventory.

---

## RED probes (6, with output)

| # | Subject | Break applied | Result |
|---|---|---|---|
| 1 | assertion 2 vs the CF-7 collapse | a `var(--warning)` reference re-added to `controls/toast.css` | **RED** |
| 2 | assertion 20, discovery→import | a stray `src/styles/strayProbe.css` that nothing imports | **RED** |
| 3 | assertion 20, import→discovery | one import removed from `main.tsx` | **RED** |
| 4 | assertion 20, **sets not counts** | `controls/toast.css` renamed on disk; count unchanged at 12 | **RED** |
| 5 | assertion 21, the ceiling | one dead rule appended to `controls/selectionPanel.css` | **RED** |
| 6 | *discrimination control* — comment-blindness | a selector **and** a banned property written inside a stylesheet comment | **stayed GREEN**, correctly |

### Probe 1 — assertion 2 vs a resurrected `--warning`

```
 FAIL  src/styles/uiContract.test.ts > Phase 3 retired tokens are deleted, not aliased
       (assertion 2) > references no retired token name in any stylesheet
AssertionError: controls/toast.css: "--warning" was retired by the Phase 3 token system and
deleted rather than aliased, so this reference resolves to nothing. Migrate it to its
replacement.: expected true to be false
      Tests  1 failed | 56 passed (57)
```

### Probe 2 — a globbed stylesheet nothing imports

```
 FAIL  ... (assertion 20) > imports every discovered stylesheet, and discovers every imported one
AssertionError: The stylesheets under src/styles and the stylesheets main.tsx imports must be the
same set. ...: expected [ 'App.css', 'MapCanvas.css', …(10) ] to strictly equal
                        [ 'App.css', 'MapCanvas.css', …(11) ]
@@ -8,8 +8,7 @@
    "controls/toast.css",
    "editor.css",
-   "strayProbe.css",
    "theme.css",
```

### Probe 3 — an import removed from `main.tsx`

```
 FAIL  ... (assertion 20) > imports every discovered stylesheet, and discovers every imported one
@@ -4,11 +4,10 @@
    "controls/locateCountry.css",
-   "controls/saveLoad.css",
    "controls/selectionPanel.css",
```

### Probe 4 — the one that discriminates a SET from a COUNT

`controls/toast.css` renamed to `controls/toasts.css` on disk. Twelve files before, twelve after —
a count assertion would have stayed green.

```
 FAIL  ... (assertion 20) > imports every discovered stylesheet, and discovers every imported one
AssertionError: ...: expected [ 'App.css', 'MapCanvas.css', …(10) ]
                  to strictly equal [ 'App.css', 'MapCanvas.css', …(10) ]
@@ -6,9 +6,9 @@
    "controls/selectionPanel.css",
-   "controls/toasts.css",
+   "controls/toast.css",
```

### Probe 5 — one dead rule against the ceiling

```
 FAIL  ... (assertion 21) > keeps the distinct-selector inventory at or below the recorded ceiling
AssertionError: The distinct-selector inventory is 327, above the recorded ceiling of 326. CSS
mass re-accumulates one reasonable rule at a time. Delete something, or raise the ceiling in the
same commit and say why.: expected 327 to be less than or equal to 326
```

### Probe 6 — the discrimination control, and what it settled

The plan made it a hard rule that **no new stylesheet comment may contain a literal a contract
assertion negative-greps for**, because a self-invalidating header comment is how a gate stops
being able to fail. That rule was followed — but it was also *checked* rather than assumed. A
comment carrying both a selector and `backdrop-filter` (banned outright by assertion 17) was
appended to a stylesheet:

```
########## PROBE 6 (discrimination control) - a selector inside a comment ##########
 Test Files  1 passed (1)
      Tests  61 passed (61)
```

Green on both counts: the selector did not enter the inventory, and the banned property inside a
comment did not trip its own ban. **Every count and scan in `uiContract.test.ts` strips comments
first.** This is a "stayed green" result and is only evidence because probe 5 had already shown the
same assertion goes red on a real added rule.

**Restoration was by copying the scratchpad file back for every probe, never with
`git checkout --`.** `src/styles/controls/toast.css`, `src/styles/controls/selectionPanel.css`, and
`src/main.tsx` were each copied out before being broken and copied back after; `git status` and
`git diff --stat` were checked clean after each one.

---

## The split

| File | Owns | Notes |
|---|---|---|
| `controls/controls.css` | `Controls` in every declared variant | the rail variant's rules stay in `editor.css` — their subject is the rail's geometry |
| `controls/selectionPanel.css` | `SelectionPanel` | also homes the chip rule it shares with the colour picker's custom preview |
| `controls/colorPicker.css` | `ColorPicker` | |
| `controls/countryList.css` | `CountryList` | also homes the hint and label rules it shares with Locate |
| `controls/saveLoad.css` | `SaveLoad` | keeps its own field and error rules — see below |
| `controls/toast.css` | `ToastRegion` | **the eighth file**, base rule and layout-scoped rule adjacent |
| `controls/legendEditor.css` | `LegendDisclosure` + `LegendEditor` | one surface, one file: the disclosure exists only to open the editor |
| `controls/locateCountry.css` | `LocateCountry` | |
| `editor.css` (absorbed) | the panel section card, the four `.workspace__*` wrappers, `.onboarding` | placed by the container, so owned by the container |
| `App.css` (what remains) | `#root`, `.selection-live-region` | |

### Three judgements worth recording

**An eighth file for the toast.** The plan's table named seven, derived in `03-RESEARCH.md` from a
1128-line `Controls.css` that no longer exists — `03-09` grew it to 1438 and added the toast's
layout-scoped rule beside its base rule, with an explicit request that the two stay together. Both
alternatives were worse: `editor.css` would put toast paint in the shell grid sheet, and leaving
the pair in a surface file that is not the toast's would anchor one element in two files. The seven
artifacts the plan names all exist; `controls/toast.css` is additive.

**One home per cross-cutting rule — except where the other surface already had a second rule.**
Three grouped rules (`.color-picker__custom input` / `.save-load input`, the `aria-invalid` pair,
and `.color-picker__error` / `.save-load-error`) were **split**, because `.save-load-error` also
carries a narrow-width rule; a base rule in `colorPicker.css` and an override in `saveLoad.css` is
exactly the half-overridden placement `03-09` recorded. `.country-list__items, .saved-maps-list`
was **merged** into the two rules that already existed for each, for the same reason. The
distinct-selector count is identical under either choice, so the ceiling does not reward one.

**`.selection-live-region` survives, and `.app-bar` never existed to delete.** The plan expected two
`.app-bar` rules in `App.css`; earlier plans had already removed them. The only `app-bar` string
left in the stylesheets is `.controls--app-bar`, a live rendering path — the variant is unmounted
but declared and exercised by `Controls.test.tsx`, which makes it not dead by the plan's own rule.

---

## Two more hard-coded stylesheet lists, found and converted

This is the finding of the plan, and it was not anticipated.

`uiContract.test.ts` had a directory walk (`03-03` built it for exactly this moment). **Two other
test files did not:**

| File | What it listed | What would have happened |
|---|---|---|
| `src/lib/motion/tokens.test.ts` | four filenames joined into one blob for the `--motion-*` consumer scan | `readFileSync` on `Controls.css` throws → the file fails at import. Loud. |
| `src/styles/themeTokens.test.ts` | `MapCanvas.css` and `Controls.css` for the colour-literal sweep | same throw for the sweep — but had the split been done a file at a time it could have been re-pointed at one name and gone on scanning **two of eleven** sheets while reading as a pass |

Both were converted to recursive walks rather than re-pointed at eight filenames. The colour-literal
sweep is now **strictly stronger**: it scans every stylesheet except `theme.css` (eleven files, up
from two) and passed unchanged, so `editor.css` and the eight new sheets were already clean. Each
walk asserts its own discovered length, because a walk that resolves to nothing satisfies every
`not.toMatch` beneath it without reading a byte.

---

## CF-7 / D-05: the status hues are gone

`Design.md` § 6 gives the toast region an accent budget of `none` and *"error = Themely Red;
status/warning = neutral ink on Porcelain"*, and names `--themely-red` as the **only** second
semantic colour. `03-04` let `--success` and `--warning` survive one more plan because the surfaces
consuming them had not been restyled; this plan restyled them.

**Deleted, never aliased** — all four names (`--success`, `--success-tint`, `--warning`,
`--warning-tint`) are gone from `:root` and from `.dark`, and all four were added to assertion 2's
`RETIRED_TOKENS`, so a stale `var()` fails at the gate instead of resolving to nothing at run time.

| Surface | Was | Is |
|---|---|---|
| Toast `data-severity="success"` | green border, tint, and text | **no rule at all** — falls through to the neutral base |
| Toast `data-severity="warning"` | amber border, tint, and text | **no rule at all** |
| Toast `data-severity="error"` | destructive family | unchanged |
| `.save-load-warning` | amber tint and text | Powder step with the hairline, Midnight Ink |
| `.map-workspace__warning` (partial data) | amber border, tint, text | Porcelain with the hairline, Midnight Ink |

**No neutral rule was written for the two toast severities.** A rule restating the base rule's own
values would look like a treatment and change nothing, and the next reader could not tell a
deliberate neutral from a copy-paste. The attribute is still written by `ToastRegion` and still read
by the allowlist; only the paint is gone. Severity was never carried by colour alone — the copy says
what happened, and `role="alert"` versus `role="status"` is what a screen reader acts on.

The contrast matrix dropped the two pairs those tokens were rated in: **18 → 16 pairs, 108 → 96
rows**, both written as independent literals and both updated deliberately.

---

## The icon provenance made a false claim; it was corrected

`CrosshairIcon`, `PlusIcon`, and `MinusIcon` each carried a header line reading
*"Consumer: the floating map controls, …"*. **None of the three is imported by anything.** The
floating camera cluster draws its own inline glyphs.

`03-08` found this and deferred it here with the choice: wire them, or correct the claim. **The
claim was corrected**, on the reason `03-08` already recorded — wiring `motion/react` components
into the cluster would put entrance and hover animation on camera chrome **D-21 does not describe**,
which is a design change no artifact authorises. The three lines now read `Consumer: NONE`, name the
reason, and `PROVENANCE.md` carries a section saying the same so a later reader can tell an
unconsumed glyph from a forgotten one.

**No consumer gate was added.** `iconContract.test.ts` asserts inventory, sizing, provenance, and
forbidden constructs; a consumer assertion would have had to be waived for exactly these three on
its first run, which is an exception wearing a different hat.

---

## Deviations from Plan

### 1. [Rule 3 — Blocking] Four test files read `src/styles/Controls.css` by name

- **Found during:** Task 1, immediately — two of them by a failing test on the first run, which is
  itself evidence those assertions were binding.
- **Issue:** `uiContract.test.ts` (`rulesOf('Controls.css')`), `Controls.test.tsx`,
  `themeTokens.test.ts` (two reads), and `lib/motion/tokens.test.ts` all named the file.
- **Fix:** the two single-rule lookups re-pointed at `controls/controls.css` and
  `controls/colorPicker.css`; the two **lists** converted to directory walks, each asserting its own
  discovered length. Recorded above as the plan's main finding.
- **Committed in:** `a1bf990`.

### 2. [Rule 2 — Missing critical functionality] The plan's file list did not include the files CF-7 needed

- **Found during:** the CF-7 carry-forward. `files_modified` names `Controls.css`, the seven new
  sheets, `App.css`, `main.tsx`, `uiContract.test.ts`, and `frontend.md` — but the success and
  warning tokens live in `theme.css`, one consumer is in `MapCanvas.css`, and the allowlist is in
  `themeTokens.test.ts`.
- **Fix:** all three edited. Collapsing the hues while leaving the tokens declared would have left
  four unconsumed tokens behind, which the token system's own rules forbid.
- **Committed in:** `797e9b6`.

### 3. [Recorded, not a defect] The plan's counts were derived from a file that no longer existed

The split table cites 1128 lines and per-prefix counts from `03-RESEARCH.md`. `Controls.css` was
**1438** lines at `8da72e8` and `App.css` was **112**, not 336 — `03-05` through `03-09` had already
removed the app bar, the inspector column, and the dialog, and `03-09` had added the toast's
layout-scoped rule. Research assumption A7 says the table is a starting point, not a specification;
it was used that way and the actual dispositions are the tables above.

**Total deviations:** 2 auto-fixed (1 × Rule 3, 1 × Rule 2), 1 recorded. No architectural change; no
Rule 4 decision arose.

---

## Verification

```
$ npm run lint                                   -> clean
$ npm test                                       -> 42 files, 630 passed (was 626)
$ npm run build                                  -> tsc -b clean; built in ~93ms
$ npx playwright test --project=chrome           -> 100 passed (2.5m), 0 failed
$ test ! -f src/styles/Controls.css              -> CONTROLS_CSS_RETIRED
$ node -e '<imported vs globbed>'                -> IMPORT_GLOB_EQUAL 12
$ node -e '<Last updated entry count>'           -> LAST_UPDATED_OK 2
$ git diff 8da72e8..HEAD -- src/utils/export.ts  -> empty (byte-unchanged; owned by 03-11)
$ git diff 8da72e8..HEAD -- .planning/STATE.md .planning/ROADMAP.md
                                                 -> empty (untouched, by instruction)
```

The full Chrome suite was run **three times**: after the split, after CF-7, and after assertion 21.
100 of 100 every time, with no test edited to accommodate a move.

---

## Known Stubs

None. No placeholder value, empty-array default, or "coming soon" copy was introduced.

---

## Owner gates still PENDING

Nothing in this plan is a physical claim, and nothing here may be read as one:

- **The by-hand pass the plan asks for** — `npm run dev`, hard reload, click through each panel
  confirming nothing lost its styling in the move — **was not performed**. The e2e suite proves the
  DOM, geometry, and computed-style claims it already made still hold; it does not look at the page.
- **Whether the de-hued warning surfaces still read as warnings** is a visual judgement and is
  **PENDING**. The neutral treatment is what `Design.md` § 6 records; that the record is right is
  not something an automated result can establish.
- The owner's session authorisation was a **blanket, in-advance, sight-unseen proceed-authorisation**
  (Immutable Safety Constraint 8). It authorised proceeding. It is **not** a content review of
  anything in this plan and it is not hash-bound.

---

## Next Phase Readiness

**For `03-11`:**

1. `src/utils/export.ts` is **byte-unchanged** and untouched here.
2. **The selector ceiling is 326 and it is a gate.** Adding a rule fails it. Lower it when deleting;
   raise it only with a stated reason in the commit that raises it.
3. **`main.tsx`'s import order is asserted** — `editor.css` must stay last, and a new stylesheet must
   be added to both the directory and the import list or assertion 20 fails in whichever direction
   was missed.
4. CF-2 (the latin-only Inter subset) is untouched.
5. The icon-provenance carry-forward `03-08` filed against `03-10`/`03-11` is **closed** — nothing
   left for `03-11` there.
6. `03-09`'s two assertion-24 probes still need re-running against the replaced rasterisation path;
   nothing in this plan changed that.

**For `03-12`:** the full gate is honest — `npm run lint`, `npm test` (630 unit tests),
`npm run build`, and **100 of 100 Chrome e2e**. The open engineering item carried in is still the
D-5 desktop residue in `deferred-items.md`. The one item this plan adds is the by-hand visual pass,
above.

**Not done, and not claimed:** Edge, Firefox, Safari, previous-version certification, and every
physical acceptance cell.

---
*Phase: 03-clean-ui-overhaul-1-1-5-weeks*
*Plan: 10*
*Completed: 2026-08-06*
