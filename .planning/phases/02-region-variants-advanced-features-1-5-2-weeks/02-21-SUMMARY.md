---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "21"
subsystem: export
tags: [png-export, html2canvas, svg-clone, playwright, wrapped-geometry, date-line]

requires:
  - phase: 02-07
    provides: wrapped Pacific/date-line scene model and the single canonical svg.map-canvas
  - phase: 02-11
    provides: in-SVG legend group rendered after the camera group
  - phase: 02-18
    provides: crossfade outgoing-scene layer and finalizeSelectedScene
provides:
  - Export sanitization that strips duplicate accessibility/editor semantics while preserving every visible wrapped geometry path
  - Border normalization across all scene paths so wrapped repeats of a selected country no longer bake the selection treatment into the PNG
  - A runtime composition tripwire (invalid-composition) for sibling/duplicate legends and camera/legend reorder or transform loss
  - The UI-SPEC named-composition filename sanitizer
  - tests/e2e/export.spec.ts + fixtures/export.html — a no-stub Chrome export slice that downloads and inspects real PNG bytes
affects: [02-30 export transaction extraction, 02-23 App composition root, 02-27 final integration, 02-28 acceptance matrix]

tech-stack:
  added: []
  patterns:
    - "Export utility stays pure: it clones a prepared, already-frozen DOM and never touches the camera lease"
    - "Post-sanitize composition validation as a regression tripwire rather than a tautology"
    - "Browser export evidence via a MutationObserver on the body-level export frame instead of stubbing html2canvas"
    - "PNG proof by parsing IHDR bytes plus re-decoding and sampling corner pixels"

key-files:
  created:
    - tests/e2e/export.spec.ts
    - tests/e2e/fixtures/export.html
  modified:
    - src/utils/export.ts
    - src/utils/export.test.ts
    - src/types/ui.ts
    - .planning/coding-rules/export.md

key-decisions:
  - "Strip semantics, never geometry: roles, titles, ids, tab stops, and all aria-* are removed from the clone while every visible wrapped path keeps its d/fill/transform"
  - "Normalize borders across path.scene-path rather than path.country-path — the .country-path selector does not match country-path--decorative wrapped repeats"
  - "Added a fifth ExportFailureReason, invalid-composition, rather than overloading source-not-found for legend placement/order defects"
  - "The named-filename sanitizer lives in the utility now even though no call site supplies a name yet; App holds no composition-name state, and wiring it belongs to the export-transaction plan"
  - "The E2E fixture composes the real MapCanvas and LegendOverlay instead of a handcrafted SVG, so the spec fails if export selectors drift from production markup"

patterns-established:
  - "Refuse rather than export a wrong picture: a legend outside the canonical SVG is a hard failure, not a silently legend-less PNG"
  - "Every export failure branch asserts zero leaked body-level export frames and zero leaked download anchors"

requirements-completed: [F5.1, F5.2, F5.3, NFR4]  # F5.5 is PARTIAL — sanitizer landed, no call site supplies a name yet

duration: 55min
completed: 2026-07-25
---

# Phase 2 Plan 21: Wrapped-Composition PNG Export Summary

**The export clone now keeps every visible date-line repeat while dropping duplicate accessibility and editor semantics, normalizes borders so wrapped copies are seam-free, refuses a mis-placed legend outright, and is proven in Chrome by downloading and decoding the real 1080×1080 PNG.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2 of 2
- **Files created:** 2
- **Files modified:** 4
- **Commits:** 2 (`b53f822`, `5ebd462`)

## What was actually missing (verified, not assumed)

The handoff said this plan was mostly a file-shape split. That was true for Task 2 but **not**
for Task 1. Before starting, I read the shipped `src/utils/export.ts` and `MapCanvas.tsx` and
found four real gaps against UI-SPEC §14, all of which would have shipped into the PNG:

1. **Wrapped repeats kept the selection border.** `sanitizeEditorState` normalized only
   `path.country-path`. Decorative wrapped copies carry `scene-path country-path--decorative`,
   which that selector does not match, so `MapCanvas`'s `stroke=#111827 / stroke-width=2`
   selection attributes survived on every ±360° repeat of a selected country while the primary
   copy was reset to `#9CA3AF` / `1` — a visible seam in a Pacific export.
2. **`<title>` elements survived.** `MapCanvas` appends a `<title>` to every accessible path;
   §14 requires duplicate accessibility copies to be stripped.
3. **`role`, `focusable`, `id`, `aria-label`, `aria-multiselectable`, `aria-hidden` survived.**
   Only `aria-selected`, `tabindex`, and three `data-*` state attributes were being removed.
4. **The outgoing crossfade layer was never removed from the clone.** `finalizeSelectedScene()`
   clears it today, so the live app was safe, but the utility is documented as pure and
   standalone; it must not depend on a caller having done that.

Nothing in the plan's `<behavior>` was already satisfied except the Phase 1 guarantees
(540@2x capture, exact 1080 validation, connected anchor, bounded handoff, nested cleanup),
which I left untouched.

## Task 1 — `feat(2-export): preserve wrapped composition export` (`b53f822`)

- Replaced `sanitizeEditorState` with `sanitizeExportClone`, which removes
  `[data-layer="outgoing-scene(s)"]`, `[data-editor-only]`, and `title/desc/metadata`; strips
  `role`, `tabindex`, `focusable`, `id`, the three editor `data-*` state attributes, **all**
  `aria-*` attributes, and the six editor state classes; then normalizes stroke, stroke-width,
  dasharray, transition, filter, outline, and cursor across `path.scene-path, path.country-path`.
  No geometry is removed — `d`, `fill`, `transform`, and the `data-*` geometry markers survive.
- Added `isSingleCanonicalComposition` (pre-clone): refuses when a `[data-layer="legend"]` group
  exists in the export source but outside the canonical SVG (a sibling overlay is silently
  dropped by `cloneNode`, producing a legend-less PNG — the same defect class as the previously
  fixed legend-clipping regression), or when more than one legend group exists.
- Added `isPreservedComposition` (post-sanitize): refuses when the clone lost the camera or
  legend group, reordered them, or changed either group's `transform`. This is the tripwire for
  a *future* sanitize rule that deletes a required layer.
- Added `invalid-composition` to `ExportFailureReason`. `App` only reads `result.ok`, so no
  call site changed.
- Added the UI-SPEC named-composition filename: whitespace → `_`, whitelist `[A-Za-z0-9_-]`,
  collapse repeats, trim separators, cap at 60, re-trim, fall back to `CountriesIRL_` when
  nothing survives. Date and `.png` suffix are never derived from input (T-02-50).
- Extended `src/utils/export.test.ts` from 8 to 19 cases, and generalized the fake-DOM matcher
  (tag + classes + attribute clauses) and added `getAttributeNames()`.
- `.planning/coding-rules/export.md` updated in the same commit with the clone contract and the
  filename sanitizer order.

## Task 2 — `test(2-export): verify Pacific PNG export` (`5ebd462`)

`tests/e2e/fixtures/export.html` renders the **real** `MapCanvas` (real geo data → 195 logical
+ 549 decorative = 744 scene paths) with the **real** `LegendOverlay` in `legendSlot`, and calls
the **real** `exportMapPng`. No stubs. The clone is captured by a `MutationObserver` on
`document.body` watching for the body-level `div[aria-hidden="true"]` export frame.

`tests/e2e/export.spec.ts` — 9 Chrome cases:

| Case | Proves |
|---|---|
| Pacific composition download | camera restored to 179°E, real download, IHDR exactly 1080×1080, all four corners `[255,255,255,255]` after re-decoding the saved bytes, zero leaked frames/anchors |
| Named composition | `Baltic  Tour /2026!` → `Baltic_Tour_2026_2026-07-21.png`, still 1080×1080 |
| Clone content | one SVG, `['camera','legend']` order, legend transform identical to the live group, legend text preserved, 0 editor-only nodes, 744 scene paths with `{logical:195, decorative:549}`, 0 empty `d`, single stroke `#9CA3AF`, single stroke-width `1`, 0 `vector-effect`, 0 selection classes, 0 roles/tab stops/focusables/titles/aria/ids/outgoing scenes; plus a live-DOM assertion that no sibling legend overlay exists |
| Sibling legend | `invalid-composition` before any capture, no frame created |
| Blocked 2D context | `capture-failed`, frame cleaned |
| Null blob | `encoding-failed`, no download, frame cleaned |
| Blocked object URL | `encoding-failed`, nothing leaked |
| Blocked anchor click | `encoding-failed` — no false success |
| Renewed fixture | exports successfully after a prior failure |

Downloads are written under the git-ignored `.artifacts/playwright/` root.

## Verification — what I ran vs what I assumed

**Ran and observed green:**

- `npx vitest run src/utils/export.test.ts` — 19/19
- `npx vitest run` — **420/420** on a clean run
- `npm run lint` — clean
- `npx tsc -b` — clean
- `npm run build` — clean (pre-existing >500 kB chunk advisory only)
- `npx playwright test --project=chrome tests/e2e/export.spec.ts` — 9/9
- `npx playwright test --project=chrome` — **48/48**
- `npx playwright test --project=msedge` — **48/48** (Edge was not required by the plan; run for confidence)

**Assumed, not verified:**

- That the exported PNG is *visually* correct at the date line. I proved geometry retention,
  border normalization, exact dimensions, and corner opacity programmatically; I did not
  eyeball the rasterized image. Visual acceptance remains an `02-28` owner item.
- That `capture-failed` is the only way a blocked 2D context can surface. It is what Chrome
  and Edge both produced; other engines are out of Phase 2 scope.

## Deviations from Plan

### Auto-fixed / auto-added

**1. [Rule 2 — missing correctness] Border normalization extended to `path.scene-path`**
- **Found during:** Task 1
- **Issue:** Wrapped repeats of a selected country exported with the 2px `#111827` selection
  border while the primary copy exported with the 1px `#9CA3AF` default.
- **Fix:** Normalize across `path.scene-path, path.country-path`.
- **Commit:** `b53f822`

**2. [Rule 2 — missing correctness] `src/types/ui.ts` gained `invalid-composition`**
- **Found during:** Task 1. Not in the plan's `files_modified`.
- **Why:** Reusing `source-not-found` for a mis-placed legend would have been untruthful and
  unfixable to diagnose. `App` reads only `result.ok`, so no behavior changed at the call site.
- **Commit:** `b53f822`

**3. [Rule 2] Unit fixture `data-path-kind` corrected to `decorative`**
- **Found during:** Task 2, while reading `createWrappedSceneModel`. The Task 1 unit fixture
  used an invented `'wrapped'` value; production emits `'logical' | 'decorative'`.
- **Commit:** `5ebd462`

### Scope notes

- **Named-filename wiring was deliberately not done.** `App` holds no composition-name state
  (verified by grep), so there is no name to pass. The sanitizer is implemented and tested at
  the utility level because threat **T-02-50** is assigned to this plan; wiring belongs to the
  export-transaction extraction (`02-30`) or the `App` composition-root refactor (`02-23`).
  This is a live loose end, recorded here rather than silently left.
- **No camera-lease work.** Per `<execution_notes>`, `exportMapPng` neither acquires nor
  releases a lease. The E2E fixture does freeze/finalize/release around the call to mirror
  `App`, but that orchestration is Plan 30's.
- **No historical/fallback scene in the new fixture.** The catalog is Modern-only and the
  historical chain is deferred; promoting geometry would violate the phase scope guard.
  Historical + fallback export is already covered by
  `phase2-composition.spec.ts:852` using an in-memory fixture. Recorded honestly rather than
  claiming the plan's "selected historical/fallback scene" wording is fully met by this file.

## Known issues (not mine)

`src/utils/historicalPreparationCli.test.ts` failed intermittently across runs (cases in the
`identityKey` aliasing family — I saw *Review JSON aliases Candidate output*, and one run
reported four failures in that file). It is fully self-contained (`node:fs`, `node:crypto`,
temp dirs) and imports nothing this plan touched; a clean re-run passed 420/420. Tracked
separately as a known flake — not chased, and no assertion was weakened.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or schema change. The two
threats this plan owned (`T-02-49` tampering via clone/resources, `T-02-50` filename) are
mitigated in `src/utils/export.ts` and covered by unit and browser tests; `T-02-51` (bounded
handoff / nested cleanup) is unchanged from Phase 1 and re-asserted by five browser failure
cases.

## Known Stubs

None.

## Self-Check: PASSED

- `src/utils/export.ts` — FOUND
- `src/utils/export.test.ts` — FOUND
- `src/types/ui.ts` — FOUND
- `tests/e2e/export.spec.ts` — FOUND
- `tests/e2e/fixtures/export.html` — FOUND
- `.planning/coding-rules/export.md` — FOUND
- commit `b53f822` — FOUND
- commit `5ebd462` — FOUND
