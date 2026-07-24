---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "11"
subsystem: ui
tags: [react, svg, accessibility, legend, playwright]

requires:
  - phase: 02-03
    provides: Provider-owned composition and typed legend commands
  - phase: 02-10
    provides: Deterministic legend reconciliation, layout, validation, and positioning model
provides:
  - Accessible collapsed legend disclosure and semantic editor controls
  - Group-only export-safe SVG legend overlay with clamped direct movement
  - Focused Chrome evidence for label, reorder, drag, style, placement, and export-blocking behavior
affects: [02-18, 02-21, 02-23, MapCanvas, export, composition-integration]

tech-stack:
  added: []
  patterns:
    - Typed provider-command subset passed into an independently testable editor
    - One React-owned SVG group shared by preview and export
    - Browser-only interaction claims proven through a Vite-served Playwright fixture

key-files:
  created:
    - src/components/LegendDisclosure.tsx
    - src/components/LegendEditor.tsx
    - src/components/LegendOverlay.tsx
    - src/components/LegendEditor.test.tsx
    - tests/e2e/legend.spec.ts
    - tests/e2e/fixtures/legend.html
  modified: []

key-decisions:
  - "Keep provider ownership explicit by accepting the exact typed legend-command subset rather than creating component-local composition state."
  - "Normalize the cross-plan opacity representation only at validation/render boundaries: provider controls remain 70–100 percentages while the pure model receives 0.70–1.00."
  - "Deduplicate validation notifications by semantic result so parent export state cannot trigger a render loop."

patterns-established:
  - "Legend SVG slot: LegendOverlay always returns one top-level g[data-layer=legend] and never creates an svg, HTML wrapper, portal, or sibling overlay."
  - "Editor isolation: every export-excluded legend affordance carries data-editor-only and stops camera propagation."
  - "Interaction evidence: focus, native drag, pointer movement, and export blocking are asserted in real Chrome rather than Node DOM emulation."

requirements-completed: [F4.1, F4.2, F4.3, F4.4, F4.5, F5.2, NFR11]

duration: 30 min
completed: 2026-07-24
---

# Phase 2 Plan 11: Editable Export-Safe Legend Summary

**Accessible provider-owned legend editing with a deterministic group-only SVG overlay and real Chrome evidence for focus, drag, placement, styling, and export blocking**

## Performance

- **Duration:** 30 min
- **Started:** 2026-07-24T18:17:36Z
- **Completed:** 2026-07-24T18:47:51Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added a collapsed-by-default Legend disclosure with exact empty/populated summaries, first-entry announcement, label draft commit/restore behavior, semantic ordering, exact style controls, corner presets, and custom nudges.
- Added a deterministic export-safe `LegendOverlay` whose only root is `g[data-layer="legend"]`, whose visual content uses SVG primitives, and whose editor-only move target clamps within the canonical 1080 safe inset without reaching the map camera.
- Added four no-skip Chrome cases covering label commit/Escape, Move and Alt+Arrow focus retention, pointer reorder and placement, keyboard/button nudge equivalence, exact styles, historical-derived entries, editor-only export cleanup, and export blocking for non-fitting or 31-color legends.

## Task Commits

Each TDD task was committed through its RED and GREEN gates, followed by the browser task and its inline correctness fix:

1. **Task 1 RED: Define editor semantics** - `63c4390` (test)
2. **Task 1 GREEN: Implement accessible legend editing** - `e140767` (feat)
3. **Task 2 RED: Define group-only SVG overlay contract** - `6ae139c` (test)
4. **Task 2 GREEN: Render the in-canvas SVG legend** - `0562230` (feat)
5. **Task 3 inline fix: Stabilize validation notifications** - `bd74a36` (fix)
6. **Task 3: Verify browser legend editing** - `06fd93a` (test)

## Files Created/Modified

- `src/components/LegendDisclosure.tsx` - Native collapsed disclosure, exact summaries, and first-entry announcement.
- `src/components/LegendEditor.tsx` - Validated labels, semantic reordering, exact style controls, placement controls, and export-blocking feedback.
- `src/components/LegendOverlay.tsx` - Canonical SVG legend geometry, theme rendering, editor-only move target, keyboard nudges, and clamped pointer drag.
- `src/components/LegendEditor.test.tsx` - Node/static semantics and deterministic SVG contract tests.
- `tests/e2e/fixtures/legend.html` - Vite-served real React/provider legend interaction fixture.
- `tests/e2e/legend.spec.ts` - Focused Chrome acceptance coverage.

## Decisions Made

- Kept composition state provider-owned by typing `LegendEditor` against the exact command subset from `CompositionStateContextValue`; the component receives current legend/effective-color inputs and emits semantic commands.
- Preserved the existing provider percentage contract for opacity while adapting to the pure legend model's fractional validation contract at the component boundary.
- Used a semantic validation signature before notifying export owners, preventing equivalent validation results from causing parent-state render loops.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted incompatible opacity units at the component boundary**
- **Found during:** Task 1 (Implement legend disclosure and editor semantics)
- **Issue:** The integrated composition provider stores the specified `70–100` percentage values, while the integrated pure legend validator expects `0.70–1.00`; passing provider state directly made otherwise valid legends fail export validation.
- **Fix:** Convert percentages to fractions only for pure-model validation and accept either representation when rendering SVG background alpha.
- **Files modified:** `src/components/LegendEditor.tsx`, `src/components/LegendOverlay.tsx`
- **Verification:** Legend Node tests, strict TypeScript, build, and Chrome exact-opacity assertion passed.
- **Committed in:** `e140767`, `0562230`

**2. [Rule 1 - Bug] Prevented equivalent validation results from looping browser renders**
- **Found during:** Task 3 (Prove legend focus, drag, reorder, and blocking in Chrome)
- **Issue:** A parent that stored `onValidationChange` results could rerender with a fresh bounds object, producing an equivalent result and an unbounded notification/render cycle.
- **Fix:** Notify the parent only when the serialized discriminated validation result changes.
- **Files modified:** `src/components/LegendEditor.tsx`
- **Verification:** All four Chrome legend cases passed without console render-depth warnings; Node tests, lint, TypeScript, and build remained green.
- **Committed in:** `bd74a36`

**3. [Rule 3 - Blocking] Restored the locked local dependency environment for browser execution**
- **Found during:** Task 3 (Prove legend focus, drag, reorder, and blocking in Chrome)
- **Issue:** The isolated worktree had no local `node_modules`, so the required `npm run test:e2e` command could not resolve the already-locked Playwright executable.
- **Fix:** Ran `npm ci` from the committed lockfile inside the isolated worktree; no manifest or lockfile changed.
- **Files modified:** None (ignored dependency installation only)
- **Verification:** The exact required Chrome command completed with 4/4 passing and no skipped tests.
- **Committed in:** Not applicable

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocker)
**Impact on plan:** All fixes were required for correct validation and executable browser evidence; no feature scope or architecture expanded.

## Issues Encountered

- `npm ci` reported four pre-existing audit findings in the locked dependency graph (two moderate, two high). No package versions or manifests were changed because dependency remediation is outside Plan 02-11 and unrelated to the legend implementation.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Verification

- `npm test -- src/components/LegendEditor.test.tsx src/utils/legend.test.ts` - PASS, 26 tests.
- `npm test` - PASS, 21 files / 213 tests.
- `npm run lint` - PASS.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` - PASS.
- `npm run build` - PASS, Vite production bundle generated.
- `npm run test:e2e -- --project=chrome --grep "legend"` - PASS, 4/4 tests, no skips.
- `npm test -- src/utils/export.test.ts` - PASS, 8 tests preserving the exact 1080×1080 PNG contract.
- Static key-link and security scans - PASS: typed provider commands are linked, `LegendOverlay` contains no standalone SVG/HTML/foreignObject/filter fallback, and no unsafe HTML/eval sink was introduced.

## Next Phase Readiness

- Plan 02-18 can insert `LegendOverlay` directly after the D3 camera group in the canonical `MapCanvas` SVG slot.
- Plan 02-21 can consume the validation result to focus the first legend error before export and rely on `data-editor-only` cleanup.
- Plan 02-23 can wire effective-scene color reconciliation and the typed provider command subset into application composition.
- No Plan 02-11 blocker remains.

## Self-Check: PASSED

- All six implementation/test artifacts exist in the isolated worktree.
- All six task/TDD/deviation commits are present in repository history.
- Required Node, lint, strict TypeScript, build, Chrome, and PNG-contract gates pass.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-24*
