---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 11
subsystem: export
tags: [d-34, d-34a, d-25, oq-1, oq-5, a-25, svg-as-image, inter, font-embedding, red-probe, assertion-24, assertion-25, cf-2]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 01
    provides: "the POSITIVE OQ-1 verdict, the vendored Inter latin woff2 (48,432 B, SHA-256 recorded), and the three-assertion spike this plan re-ran as its gate"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 09
    provides: "the assertion-24 re-arm and the finding that its RED proof was captured against the html2canvas path this plan replaced"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 10
    provides: "the 326 selector ceiling, assertion 20's import-set gate, and the 630-test / 100-e2e green baseline"
provides:
  - "D-34: html2canvas removed; src/utils/export.ts owns serialise → SVG-as-image → drawImage → toBlob"
  - "D-34a: collectCompositionFonts + injectExportFontFace — a generalised registry seam, Inter-only in Phase 3"
  - "src/styles/interFontFace.ts — the vendored woff2 as a build-time ?inline data URL"
  - "D-25: the legend renders and EXPORTS in Inter w600; assertion 25 proves it on rasterised pixels"
  - "OQ-5: one LEGEND_CHARACTERS_PER_LINE constant, re-derived {10, 7, 6} from measured worst-case advance"
  - "coding-rules/export.md rewritten for the owned path; the expired html2canvas analysis deleted"
  - "the probe-9 finding: under the new path NO host CSS can reach exported pixels — theme independence by construction"
affects: [03-12]

actuals:
  tokens: 33546
  tasks: 7
  commits: 6

tech-stack:
  added: []
  patterns:
    - "fonts ride INSIDE the serialised export subtree as base64 @font-face — the sandbox boundary is the mechanism, not an obstacle"
    - "a test-only suppression seam named in a dependency-free constants module so Playwright specs can import the name without the payload"
    - "a wrap heuristic derived from measured worst-case advance width, so a full line of the widest common character cannot overflow by construction"
    - "expect.soft on a structural half-gate so one RED probe reports both halves in a single run"

key-files:
  created:
    - src/styles/interFontFace.ts
    - src/types/assets.d.ts
  modified:
    - src/utils/export.ts
    - src/utils/export.test.ts
    - src/components/LegendOverlay.tsx
    - src/utils/legend.ts
    - src/utils/legend.test.ts
    - src/components/LegendEditor.test.tsx
    - src/constants/config.ts
    - package.json
    - package-lock.json
    - tests/e2e/export.spec.ts
    - tests/e2e/final-integration.spec.ts
    - tests/e2e/legend.spec.ts
    - tests/e2e/fixtures/export.html
    - tests/e2e/support/historicalFixture.ts
    - tests/e2e/transactions.spec.ts
    - tests/e2e/phase2-composition.spec.ts
    - tests/e2e/spike-export-font.spec.ts
    - .planning/coding-rules/export.md

key-decisions:
  - "D-34 gate answered `proceed` and D-25 gate answered `proceed` on the recorded blanket in-advance authorization — both directions were already in approved artifacts, and OQ-1 re-confirmed POSITIVE first"
  - "The rasterisation keeps the 540-intrinsic / scale-2 geometry so non-scaling-stroke borders resolve at the identical 1.5px contract weight the retired pipeline produced"
  - "The characters-per-line table was re-derived from TRUE worst-case advance ('W' = 1.0202em at w600), accepting that labels beyond 2×N characters are export-blocked at that size — the strictness is the anti-clipping guarantee"
  - "CF-2 implemented as decided: latin-only kept; the fallback is pinned by an observed-behaviour test; widening flagged as a one-line v1.1 owner follow-up"
  - "Probe 9's prescribed CSS breaks do NOT redden assertion 24 under the new path — reported as a finding (03-09 precedent) and a third probe that CAN redden it (the exporter reading live computed styles) was run and captured"

patterns-established:
  - "When a plan's prescribed RED probe cannot redden its gate, report the finding and construct the probe that can — never substitute silently and never claim the probe passed"
  - "Every export fixture re-baseline names the old value, the new value, and the decision that caused it, in the test file itself"

requirements-completed: [D-34, D-34a, D-25, A-25, OQ-1, OQ-5]

duration: 50min
completed: 2026-08-06
---

# Phase 3 Plan 11: Own the SVG→PNG Export Path — Summary

**html2canvas is gone; `export.ts` serialises the frozen clone and rasterises it itself, the
vendored Inter rides into every exported PNG as inline base64 bytes through a generalised
font-embedding seam, the legend finally exports in the typeface it has named since Phase 2, and
every non-negotiable was individually RED-proven against the new path — 11 captured RED outputs,
one honest "stays green" finding, and a full Chrome suite at 103/103.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 7 of 7 (Tasks 2 and 4 were the D-34 / D-25 one-way gates)
- **Files changed:** 25 (2 created) across 6 commits
- **Unit tests:** 630 → **637 passed / 0 failed**
- **Chrome e2e:** 100 → **103 passed / 0 failed** (2.1m; three new gates: assertion 25, the CF-2
  fallback documentation, the max-length-label raster backstop)
- **Full gate:** `npm run lint` clean · `npm test` 637/637 · `npm run build` clean
- **Bundle:** `dist/assets/index-*.js` 689,445 B → **555,717 B (−133,728 B)** — html2canvas
  (~198 KB) out, the base64-inflated Inter (64,576 B) in

## Browser scope

**Chrome only — Chrome 151.0.7922.75. Edge is NOT installed on this machine and no Edge result
is claimed (D-33).** `grep -c msedge tests/e2e/export.spec.ts` → 0. WebKit/Safari is the
documented exception for the data-URI-font-in-SVG-as-image technique and is outside
certification scope — recorded, not solved, and **this technique is never described as
cross-browser**. Firefox, Safari, and previous-version certification have never been run in
this repository and are not claimed here.

---

## OQ-1 re-confirmation (Task 1 — the plan's first act)

**Re-run, not the original.** 03-01's recorded verdict was checked mechanically first
(`OQ1_POSITIVE_ON_RECORD` — the first non-blank line under its `OQ-1 verdict` heading reads
`POSITIVE`), then the spike was re-run against the Chrome installed today:

- **Date:** 2026-08-06 (same day as 03-01's original, but a separate run in this session).
- **Browser:** Google Chrome **151.0.7922.75** (`channel: 'chrome'`, reporting
  `HeadlessChrome/151.0.0.0`).
- **Command:** `npx playwright test tests/e2e/spike-export-font.spec.ts --project=chrome` →
  **3 passed (2.2s)**.

Measured numbers, Inter Variable latin subset (the production bytes):

| Measurement | Value |
|---|---|
| woff2 bytes / base64 chars / data-URL chars | 48,432 / 64,576 / 69,249 |
| **diff: font-present vs font-absent** | **6,696 px** |
| ink present / ink absent | 4,891 / 3,876 px |
| ink, blank control | **0** px |
| diff: blank vs present / blank vs absent | 5,326 / 4,230 px |

All three assertions held: the rasters DIFFER, both text rasters are NON-BLANK, and the blank
control is blank and differs from both. Identical numbers to 03-01's originals — Chrome did not
move under us. **What this proves:** the technique works in installed Chrome 151. **What it does
not prove:** anything about Safari (the documented exception) or any other browser. Legend
typography was locked only after this passed.

---

## Checkpoint: Task 2 — D-34

**Gate:** `checkpoint:decision`, `gate="blocking"` — remove html2canvas and own the SVG→PNG
path, before any byte of `src/utils/export.ts` changed.

**Selection: `proceed`** (the named option, not a generic "approved").

**Authorization held, verbatim:**

> "I am going to sleep, so if something comes up, find best solution."

and

> "I want you to complete this fully."

**Date of authorization: 2026-08-06.** What is held is a **BLANKET, IN-ADVANCE, SIGHT-UNSEEN
PROCEED-AUTHORIZATION.** Per `coding-rules/general.md` § Immutable Safety Constraints,
constraint 8, it authorizes **proceeding**; it is **NOT a content review** and it is **NOT
hash-bound**. The owner did not review this diff, this plan, or these numbers. Both directions
of D-34 were already recorded in approved artifacts (D-34/D-34a in 03-CONTEXT.md, the ROADMAP
amendments, the approved 03-UI-SPEC.md), and the stated precondition — OQ-1 POSITIVE — was
re-confirmed as the plan's first act (evidence above, with real output).

**Mechanically-checkable evidence run at the gate:** `src/utils/export.ts` was byte-unchanged
through Tasks 1–2 (`git status` clean before commit `752ac8b`; the ten preceding plans each
recorded `git diff … -- src/utils/export.ts` empty).

## Checkpoint: Task 4 — D-25

**Gate:** `checkpoint:decision`, `gate="blocking"` — legend typography changes exported PNG
pixels; export fixtures will be deliberately re-baselined.

**Selection: `proceed`** — the legend adopts Inter at the existing sizes (24/32/40) at
weight 600, and every re-baseline is recorded (itemised table below).

**Authorization held:** the same verbatim blanket in-advance sight-unseen proceed-authorization
quoted above, dated **2026-08-06** — NOT a content review, NOT hash-bound (Immutable Safety
Constraint 8). The gate's stated preconditions were met and checkable: Task 3 had landed the
font-embedding seam (commit `752ac8b`) and Task 1 had re-confirmed OQ-1 (3 passed, numbers
above).

**`02-28` remains OPEN, binds `fe5f946`, and was not modified.**
`git diff --quiet HEAD -- …/02-28-ACCEPTANCE-MATRIX.md` → `MATRIX_UNTOUCHED`, and
`git diff --stat HEAD -- .planning/phases/02-…/` is empty. No cell was filled, annotated, or
pre-approved; the matrix is performed against the `acceptance-02-28` tag, never this HEAD.

---

## What shipped (D-34 / D-34a)

`src/utils/export.ts` now owns the whole path: refuse → clone → **inject fonts** → sanitize →
verify → serialise (`"data:image/svg+xml," + encodeURIComponent(XMLSerializer)`, the exact
spike-proven shape) → `Image` → 1080×1080 canvas, white `fillRect`, `scale(2)`,
`drawImage(image, 0, 0, 540, 540)` → `toBlob` → anchor → bounded handoff → nested-`finally`
cleanup.

- **The 540-intrinsic / scale-2 geometry is deliberate:** `vector-effect: non-scaling-stroke`
  resolves `EXPORT_BORDER_WIDTH` (0.75) in 540-unit viewport space, so borders rasterise at the
  identical 1.5px weight the retired pipeline produced. Serialising at 1080 intrinsic would have
  silently halved every border.
- **The seam is generalised (D-34a):** `collectCompositionFonts` walks the clone for the
  families it actually names; `injectExportFontFace` embeds one `@font-face` per family the
  `EXPORT_FONT_FACE_BUILDERS` registry has bytes for, as the clone's **first child**. Only Inter
  is registered. Phase 4 adds registry entries, not export rewrites.
- **The `<style>`-first-child shape:** shifts camera and legend indices equally, so
  `isPreservedComposition`'s order check holds; `coding-rules/export.md`'s canonical clone shape
  was updated **in the same commit** (`752ac8b`), keeping two `Last updated` entries.
- **Test-only suppression seam:** `EXPORT_FONT_FACE_SUPPRESSION_FLAG`, a `globalThis` sentinel
  named in `constants/config.ts` (dependency-free, so Playwright specs import the name without
  the font bytes). Nothing in the product writes it; no creator input reaches it.
- **Failure mapping preserved:** image-load failure and a blocked 2D context → `capture-failed`
  (retry offered); dimensions read back ≠1080 → `invalid-dimensions`; `toBlob` null / object-URL
  / click failures → `encoding-failed`. Synchronous refusals (`source-not-found`,
  `invalid-composition`) unchanged, no retry, same copy — **every refusal reason still flows
  through `ToastRegion`'s allowlist; no message changed.**
- `exportMapPng` stays **pure** (clones an already-frozen composition); `colorScheme = 'light'`
  survives on both the frame and the clone; the filename sanitiser's six ordered steps are
  untouched; the sanitize strip list is verbatim.
- `.artifacts/playwright/downloads/` was **cleared before the first post-change run** and again
  before each verification run — no pre-change PNG can be cited as post-change output.
- `html2canvas` is gone from `package.json`, `package-lock.json`, and every file under `src/`
  and `tests/` (`grep -rn html2canvas src/ tests/ package.json` → no output; the comments that
  referenced it now describe the owned path).

## Characters-per-line derivation (OQ-5)

Measured in installed Chrome 151 from the vendored woff2 via `FontFace` + canvas `measureText`
at weight 600 (derivation script run this session; numbers recorded in the constant's JSDoc):

| Size | px | Widest common char | Advance | em | `floor(248 / advance)` | Old value |
|---|---|---|---|---|---|---|
| small | 24 | `W` | 24.484px | 1.0202 | **10** | 24 |
| medium | 32 | `W` | 32.645px | 1.0202 | **7** | 18 |
| large | 40 | `W` | 40.806px | 1.0202 | **6** | 14 |

Available label width = 288 (column) − 24 (swatch) − 16 (gap) = **248px**. (`@` measures
slightly narrower than `W` at every size: 23.981 / 31.975 / 39.969px.) The old table was derived
against a system fallback's *average* advance; the new one uses the **worst case**, so a full
line of the widest common character cannot overflow the legend box — by construction, not by
luck. `LEGEND_CHARACTERS_PER_LINE` and `LABEL_CHARACTERS_PER_LINE` collapsed to **one** exported
constant in `src/utils/legend.ts` (verify gate `ONE_PER_LINE_TABLE` green); `LegendOverlay`
imports it and names Inter via `EXPORT_FONT_FAMILY`, so the editor and the export resolve the
same embedded family.

**The deliberate consequence:** labels beyond 2×N characters at a size are export-blocked by the
*existing* `label-does-not-fit` validation (e.g. 'Visited Germany', 15 chars, at medium). That
strictness is the anti-clipping guarantee — legend overflow clipping the PNG is a defect this
project has already shipped once. The legend's export-fixed colour literals (`THEME_COLORS`, the
`#9CA3AF` swatch stroke) are untouched and no `--themely-*` token reaches `LegendOverlay.tsx`
(verify gate `LEGEND_EXPORT_FIXED_OK`).

## Assertion 25 — form chosen and proof

**Form: the pixel-diff form** (not the advance-width alternative), with the control run present:

- **Part 1 (structural, `expect.soft`):** the fixture's `MutationObserver` observes the REAL
  clone as it lands on `document.body` — `svg.map-canvas > style` as **first child**, matching
  `/@font-face/` and `/src:\s*url\(data:font\/woff2;base64,/`.
- **Part 2 (load-bearing):** the same composition (label `Wig 111 fjord`) exported twice in one
  browser context — normal, then with the suppression flag set. Both PNGs cropped to the legend
  region **derived from `resolveLegendRender` applied to the live legend state** (fetched from
  the fixture; no hard-coded rectangle — verify gate `ASSERTION_25_SHAPE_OK`). Content floors
  first (both crops >500 ink px), then the inequality (diff >200 px), then the blank-crop
  discrimination control: an all-white crop of the same size run through the SAME counting
  machinery must read 0 ink and differ from both real crops (>500 px each). Three empty regions
  cannot satisfy this set.

## Assertion 24 re-validation — both probes re-run, outcome stated explicitly

This is the required 03-09 carry-forward. Both probes were re-run against the new path
(Task 7 probe 9, full outputs below):

1. **The single-token probe (`.dark { --map-surface: #101010 }`) does NOT redden assertion 24
   under the new path** — it stayed green, as it did under html2canvas, and for a stronger
   reason: the rasterised image is an isolated `data:image/svg+xml` document that sees **no**
   host CSS at all.
2. **The composite probe (theme class above the mount root + `.dark .scene-path { fill }`) —
   which DID redden assertion 24 under html2canvas — NO LONGER does.** The `.dark .scene-path`
   fill never serialises into the clone (scene paths paint from `fill` attributes), so the
   defect class that could occur under html2canvas is now **structurally unrepresentable**.
   The single-token probe therefore does NOT "become valid"; the opposite happened — the
   sandbox boundary cut off every CSS route to exported pixels.
3. **Assertion 24 CAN still fail on its subject**, and was RED-proven with the regression class
   that remains possible: the exporter itself reading live theme state (probe 9C — computed
   `--map-surface` for the canvas fill with the clone's hard-set background removed). Sampled
   pixels moved `255,255,255 → 16,16,16`. Assertion 24 is armed against a future rasterisation
   change that reads live computed styles — exactly the kind of rewrite this plan itself
   performed.

`coding-rules/export.md`'s expired "theme independence by placement and hard-setting" analysis
was **replaced, not left stale** (§ The Sandbox Boundary), in the same commit as the behaviour.
Live Invariant 9's token contract remains enforced at the CSS level by assertion 4 (which DID
redden, below); the browser-level export gate holds the structural claim.

---

## RED probes — 11 captured outputs (Task 5 ×1, Task 6 ×1, Task 7 ×9)

Every probe used the scratchpad copy-and-restore protocol — the file copied out before the
break, restored by copying back, `git status` / hash verified clean after each. **`git checkout
--` was never used.** `src/utils/export.ts`'s SHA-256 (`bb49398b…`) was verified identical
before and after every probe that touched it.

### Task 5 ×1 — the stale wrap constant vs the raster backstop

Break: `LEGEND_CHARACTERS_PER_LINE` reverted to the pre-Inter `{24, 18, 14}`; the backstop
drives `'W'.repeat(2 × large)` at `large` over an ocean-only camera and asserts zero legend ink
outside the `resolveLegendRender`-derived region.

```
########## TASK 5 RED PROBE — pre-Inter constant {24,18,14} vs the raster backstop ##########
Error: legend ink rendered OUTSIDE the resolved legend region — the characters-per-line
constant lets a line overflow the box.
Expected: 0
Received: 10016
  1 failed
```

Restored from scratchpad (SHA-256 match `cfbb37d4…`); re-run green.

### Task 6 ×1 — the injection deleted; BOTH parts of assertion 25 red in ONE run

Break: the `injectExportFontFace(…)` call removed from `createExportFrame`.

```
########## TASK 6 RED PROBE — @font-face injection deleted from the real path ##########
Error: expect(received).toEqual(expected)            // Part 1 (structural)
Expected: {"hasFontFace": true, "hasWoff2DataUrl": true, "isFirstChild": true}
Received: null
Error: the embedded @font-face did not change the rasterised legend — Inter never resolved
in the exported PNG                                   // Part 2 (pixels)
Expected: > 200
Received:   0
  1 failed
```

One change, both halves red — the two crops became identical (diff exactly 0). Restored from
scratchpad; re-run green.

### Task 7 ×9 — the nine non-negotiables against the NEW path

| # | Non-negotiable | Break (file) | Result |
|---|---|---|---|
| 1 | Exactly 1080×1080 | canvas height 1079 (`export.ts`) | **RED** — `{ok:false, reason:"invalid-dimensions"}` where `{ok:true}` expected; no wrong-size PNG can ship |
| 2 | Refusal: disconnected source | `isConnected` guard removed (`export.ts`) | **RED** — `{ok:true}` where `source-not-found` expected |
| 3 | Refusal: multi-SVG | `length !== 1` guard removed (`export.ts`) | **RED** — `{ok:true}` where `source-not-found` expected |
| 4 | Refusal: sibling legend | `isSingleCanonicalComposition` call removed (`export.ts`) | **RED** — `{ok:true}` where `invalid-composition` expected: the exact silently-legend-less-PNG defect, caught |
| 5 | Strip list (`aria-*`) | aria removal deleted from sanitize (`export.ts`) | **RED** — `expected 'true' to be null` on `aria-selected` in the clone |
| 6 | `data-editor-only` exclusion | its removal deleted from sanitize (`export.ts`) | **RED** — the legend hit-area `RECT` with `data-editor-only="true"` leaked into the clone |
| 7 | Placement decides membership | `navigationSlot` moved inside `svg.map-canvas` (`MapWorkspace.tsx`) | **RED** — `.map-workspace__canvas > .map-navigation` resolved to 0 (the cluster left the chrome layer) |
| 8 | Strips semantics, never geometry | decorative wrapped paths removed in sanitize (`export.ts`) | **RED** — `expected … length of 3 but got 2` |
| 9 | Assertion 24 vs the new path | three sub-probes, below | **9A/9B stayed GREEN — the finding; 9C RED** |

Verbatim probe-9 record:

```
########## TASK 7 PROBE 9A — .dark { --map-surface: #101010 } vs assertion 24 ##########
[7/7] responsive.spec.ts:1459 › the PNG is identical across theme, forced colors, and DPR
  1 failed   ← the FAILURE is a DIFFERENT gate (below); assertion 24 itself PASSED
    responsive.spec.ts:1031 › the dark theme class restyles chrome and leaves the
    composition surface fixed
      Expected: "rgb(255, 255, 255)"   Received: "rgb(16, 16, 16)"   ← the LIVE editor
      surface followed the token; the exported PNG did not
```

```
########## PROBE 9A2 — assertion 4 (CSS export firewall), same break — EXPECTED, by design ####
 FAIL  uiContract.test.ts > export firewall > declares no export token outside the
       unconditioned root
AssertionError: theme.css: "--map-surface" is mode-invariant and must stay fixed; found
under [] .dark. Redefining it makes the exported PNG follow the viewer theme.
 (6 uiContract gates failed on the one deliberate defect)
```

The simultaneous assertion-4 failure is **correct and by design** — the probe deliberately
commits the exact defect the CSS firewall exists to catch. It is not a broken probe.

```
########## TASK 7 PROBE 9B — composite: theme class above mount root + .dark .scene-path
           fill (the probe that reddened assertion 24 under html2canvas) ##########
[1/1] responsive.spec.ts:1459 › the PNG is identical across theme, forced colors, and DPR
  1 passed   ← GREEN. The CSS fill never serialises into the isolated SVG image.
```

```
########## TASK 7 PROBE 9C — the exporter derives its surface from live computed
           --map-surface (the regression class that remains possible) ##########
Error: expect(received).toStrictEqual(expected)
-     255,          +     16,
-     255,          +     16,
-     255,          +     16,
  1 failed   ← assertion 24 RED on a genuinely theme-following export
```

Probe 9 was run against the post-Task-3 rasterisation path (commit `752ac8b` et seq.), not
against 03-09's captured output. `theme.css`, `App.tsx`, `MapCanvas.css`, `MapWorkspace.tsx`,
and `export.ts` were each restored by scratchpad copy-back; the tree was verified clean
(`TREE_CLEAN_AFTER_PROBES`) and no `emulateMedia({colorScheme})` reappeared
(`ASSERTION_24_STILL_REARMED`).

---

## Re-baselined fixtures — deliberate and itemised (P-8)

Every change below is D-25/OQ-5's expected consequence, named in the test file at the site:

| Fixture / value | Old | New | Why |
|---|---|---|---|
| `export.spec.ts` clone `layerOrder` | `['camera','legend']` | `[null,'camera','legend']` | the injected export `<style>` is the clone's first child (D-34); the null is its absent `data-layer` |
| `LegendEditor.test.tsx` overlay bounds | `{336, 152}` | `{336, 184}` | 14-char labels wrap to two medium lines (7/line); both rows grow 48→64px (pixel delta: +32px box height) |
| `final-integration.spec.ts` second label | `'Visited Germany'` (15) | `'Visited Berlin'` (14) | 15 chars exceeds two medium lines and is export-blocked by design |
| `legend.spec.ts` clearing label at `large` | `'Readable label'` (14) | `'Neat label'` (10) | 14 chars exceeds two large lines (6/line) |
| `historicalFixture.ts` stored label (`large`) | `'Imperial lands'` (14) | `'Empire lands'` (12) | 12 = the maximum two full large lines; 14 renders truncated and blocks export |
| `legend.test.ts` effective-size discriminator | literal 30-char label | derived `2×large+1` with self-asserted preconditions | survives future re-derivations instead of encoding today's values |
| `LEGEND_CHARACTERS_PER_LINE` itself | `{24, 18, 14}` | `{10, 7, 6}` | the OQ-5 re-derivation (table above) |

`final-integration.spec.ts` **keeps** its region-disjoint colour counting
(`CORNER_FRACTION`/`MAP_REGION_START_FRACTION`), its content floors (`MIN_*` thresholds,
unchanged — all passed with margin), and its in-test blank-export discrimination control. No
pixel-count threshold needed re-cutting: swatch geometry is unchanged, exactly as P-8 predicted.

## CF-2 — the latin-only subset, handled as decided

Kept for Phase 3 (orchestrator decision, implemented, not re-litigated). Recorded honestly in
`coding-rules/export.md` § Coverage and in `interFontFace.ts`'s header; **no claim of full
Unicode coverage exists anywhere**. The fallback is now an *observed, pinned* behaviour:
`export.spec.ts` › "CF-2: a latin-ext glyph falls back mid-string" proves embedding the font
changes `'sss'` (latin, diff > 200 px) and does **not** change `'ššš'` (latin-ext falls back to
the same generic face either way, diff < 50 px), while the fallback genuinely renders glyphs
(ink > 200 px). Rationale for keeping latin-only: these bytes ship inside **every** export
bundle; latin-ext adds +85,272 B raw / +113,696 B base64; 03-01 measured and priced the current
payload, and widening mid-plan would invalidate that measurement on the repo's most
safety-critical file.

**Owner follow-up (one line, v1.1):** decide whether to add the latin-ext subset
(+~113 KB base64 per bundle) so creator-typed native-orthography labels (Košice, Łódź, Česko)
export in Inter instead of falling back mid-string.

---

## Task Commits

| Task | Commit | Message |
|---|---|---|
| 1 (OQ-1 gate) | — | re-run only; no file changed |
| 2 (D-34 gate) | — | decision recorded above; no file changed |
| 3 | `752ac8b` | `feat(3-11): own the SVG->PNG export path with a generalised inline font seam (D-34, D-34a)` |
| 4 (D-25 gate) | — | decision recorded above; no file changed |
| 5 | `4df10dc` | `feat(3-11): legend adopts Inter and the wrap tables collapse to one derived constant (D-25, OQ-5)` |
| 5 (follow-up) | `a340146` | `test(3-11): re-baseline LegendEditor overlay bounds 152->184 for the Inter wrap (D-25)` |
| 6 | `d4adda0` | `test(3-11): assertion 25 measures the exported legend on rasterised pixels (A-25)` |
| 7 | `fdd1714` | `test(3-11): re-baseline the historical fixture label for the large-size wrap (D-25)` |

## Deviations from Plan

### 1. [Rule 3 — Blocking] The suppression flag NAME moved to `constants/config.ts`

Playwright's spec transpiler (esbuild) cannot resolve the `?inline` woff2 import, so a spec
importing `export.ts` for the flag would fail at transform. The flag name lives in the
dependency-free constants module; `export.ts` re-exports it. Committed in `d4adda0`.

### 2. [Rule 3] `src/types/assets.d.ts` created (not in `files_modified`)

`vite/client`'s wildcard declarations do not match query-suffixed specifiers, so
`*.woff2?inline` needed its own module declaration to typecheck under `tsc -b`. Committed in
`752ac8b`.

### 3. [Rule 3] Files beyond the per-task lists were edited to keep gates truthful

`legend.spec.ts`, `LegendEditor.test.tsx`, `historicalFixture.ts`, `transactions.spec.ts`, and
`phase2-composition.spec.ts` carried labels or measured values that the D-25 wrap deliberately
changed; each is itemised in the re-baseline table with old/new/reason. `spike-export-font.
spec.ts`, `colors.ts`, `uiContract.test.ts`, `ErrorBoundary.test.tsx`, and
`useCompositionExportTransaction.test.tsx` carried html2canvas references in comments/strings
that the Task 3 verify gate (`grep -rn html2canvas src/ tests/` must be empty) required
rewording to describe the owned path.

### 4. [Reported finding, 03-09 precedent] Probe 9's prescribed break does not redden assertion 24

The plan directed "observe the export diverge" under the `.dark { --map-surface }` break, and
the acceptance criteria expected both assertion 24 and assertion 4 to fail. **Assertion 4
failed; assertion 24 did not** — and the 03-09 composite probe no longer reddens it either,
because the sandbox boundary cuts every CSS route to exported pixels. Rather than substitute
silently or claim a pass, the finding is recorded (above and in `export.md`), and a third probe
modelling the remaining real regression class (the exporter reading live computed styles) was
constructed, run, and captured RED. This mirrors exactly how 03-09 handled its own
probe-does-not-work finding.

**Total:** 3 auto-fixed (Rule 3), 1 reported finding. No Rule 4 architectural decision arose —
both one-way gates were the plan's own checkpoints, answered under the recorded authorization.

## Known Stubs

None. No placeholder value, empty-array default, or "coming soon" copy was introduced.

## Threat register (from the plan's `<threat_model>`)

T-03-48 (markup-level gate) → assertion 25 is pixel-measured, RED-proven; T-03-49/50/51/52
(dropped refusal / size / chrome leak / theme-following) → probes 1–8 + 9C; T-03-53 (overflow)
→ the derived constant + raster backstop + Task 5 probe; T-03-54 (seam reachable from creator
input) → the flag is a `globalThis` sentinel written only by tests, documented in code and
`export.md`; T-03-55 (silent re-baseline) → the itemised table; T-03-56 (02-28) →
`MATRIX_UNTOUCHED`. No new threat surface beyond the plan's model was introduced.

## Verification (final gate)

```
$ npm run lint                                   -> clean
$ npm test                                       -> 42 files, 637 passed / 0 failed
$ npm run build                                  -> tsc -b clean; built in ~96ms
$ npx playwright test --project=chrome           -> 103 passed / 0 failed (2.1m)
$ grep -rn html2canvas src/ tests/ package.json  -> no output
$ git diff --stat HEAD -- .planning/phases/02-…/ -> no output (Phase 2 evidence intact)
$ node -e "…dependencies.html2canvas…"           -> HTML2CANVAS_REMOVED
$ …CHARACTERS_PER_LINE declarations…             -> ONE_PER_LINE_TABLE
$ …LegendOverlay var(--themely-…)…               -> LEGEND_EXPORT_FIXED_OK
$ …assertion 25 shape…                           -> ASSERTION_25_SHAPE_OK
$ …colorScheme emulation…                        -> ASSERTION_24_STILL_REARMED
$ grep -c msedge tests/e2e/export.spec.ts        -> 0
```

`.planning/STATE.md` and `.planning/ROADMAP.md` are untouched (`git status --porcelain` on both
is empty); the orchestrator owns those writes by hand. None of `state.advance-plan`,
`state.update-progress`, or `roadmap.update-plan-progress` was run. The selector ceiling (326)
is untouched — no stylesheet rule was added or removed, and `main.tsx`'s import list is
unchanged (`interFontFace.ts` is a TS module, not a stylesheet; assertion 20 discovers `.css`
only).

## Owner gates still PENDING

- **The plan's by-hand step** — `npm run dev`, export a PNG, open it, and visually confirm the
  legend renders in Inter and the image is 1080×1080 — **was not performed by a human.**
  Automated evidence covers the dimension (IHDR parse) and the typeface (assertion 25 on
  pixels), but a visual judgement is a physical claim and is **PENDING** the owner. An automated
  result is never substituted for a physical claim.
- **`02-28` acceptance matrix — still OPEN**, binds `fe5f946`, performed against
  `acceptance-02-28` only.
- The authorization on file for both one-way gates is a **blanket, in-advance, sight-unseen
  proceed-authorization** (Immutable Safety Constraint 8) — it authorized proceeding and is not
  a content review of anything in this plan.

## Next Phase Readiness (for 03-12)

1. **Full gate is honest at:** lint clean, **637** unit, build clean, **103/103** Chrome e2e.
2. **Creator-visible behaviour change to carry into UAT:** labels longer than 20/14/12
   characters (small/medium/large) are export-blocked with the existing "Shorten this label"
   message — stricter than Phase 2, deliberate (anti-clipping), and the owner should see it.
3. **The CF-2 owner follow-up** (latin-ext widening, one line, v1.1) is flagged above.
4. **`export.md` is current** for the owned path; 03-09's expired analysis is deleted, not
   annotated.
5. The D-5 desktop residue in `deferred-items.md` is untouched, as scoped.
6. **Not done, and not claimed:** Edge, Firefox, Safari, previous-version certification, every
   physical acceptance cell, and the by-hand visual export check above.

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `src/styles/interFontFace.ts`, `src/types/assets.d.ts` | FOUND |
| `src/utils/export.ts` carries `colorScheme = 'light'`, `sanitizeExportClone`, `isPreservedComposition` | FOUND (`CARRIED_FORWARD_OK`) |
| commits `752ac8b`, `4df10dc`, `a340146`, `d4adda0`, `fdd1714` | FOUND in `git log` |
| `html2canvas` in `package.json` / `src/` / `tests/` | ABSENT |
| `02-28-ACCEPTANCE-MATRIX.md` and all Phase 2 evidence | byte-unchanged |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched |
| working tree after all probes | clean (scratchpad copy-back, hashes verified) |

---
*Phase: 03-clean-ui-overhaul-1-1-5-weeks*
*Plan: 11*
*Completed: 2026-08-06*
