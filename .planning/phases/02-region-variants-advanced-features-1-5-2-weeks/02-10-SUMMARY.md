---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "10"
subsystem: composition
tags: [typescript, vitest, historical-scenes, legend, validation]

requires:
  - phase: 02-region-variants-advanced-features-1-5-2-weeks
    provides: Composition, EffectiveScene, SceneFeature, and legend contracts from Plan 02-02
provides:
  - Immutable modern/historical effective-scene assembly with explicit fallback replacement
  - Effective color ownership and active-scene selection reconciliation
  - Dormant-aware deterministic legend reconciliation, ordering, layout, positioning, and validation
affects: [02-18, 02-19, 02-21, 02-23, historical-snapshots, persistence, export]

tech-stack:
  added: []
  patterns:
    - Explicit source-feature coverage replacement without heuristic identity projection
    - Effective-scene colors as the sole legend derivation boundary
    - Dormant legend metadata retained by canonical color while active entries are derived

key-files:
  created:
    - src/utils/scene.ts
    - src/utils/scene.test.ts
    - src/utils/legend.ts
    - src/utils/legend.test.ts
  modified: []

key-decisions:
  - "Historical overlays replace an explicit set of modern source-feature IDs; source IDs never become color or selection keys."
  - "Only curator-declared selectable modern-core and historical-entity features enter active scene selection; dependencies, disputed units, neutral units, and unsafe IDs fail closed."
  - "Legend metadata remains dormant by canonical uppercase color so undo, redo, and period changes restore labels and order without silent loss."
  - "Legend layout uses the locked 1/2/3-column thresholds, forces Small text for 17-30 entries, and blocks validation above 30 active colors."

patterns-established:
  - "Scene policy: modern fallback geography is retained unless its exact source feature is explicitly covered by a historical overlay."
  - "Legend policy: reconcile and validate directly from getEffectiveSceneColors rather than raw color-map entries."

requirements-completed: [F1.2, F1.3, F1.5, F2.2, F2.4, F4.1, F4.2, F4.3, F4.4, F4.5, NFR9]

duration: 27 min
completed: 2026-07-24
---

# Phase 2 Plan 10: Effective Scene and Legend Algorithms Summary

**Explicit historical fallback composition and stable interaction identities now feed dormant-aware, export-safe legend algorithms through one effective-color boundary.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-07-24T17:26:37Z
- **Completed:** 2026-07-24T17:53:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Composed modern and historical scenes without mutating source features or color maps, using explicit source-feature coverage replacement and modern fallback elsewhere.
- Kept continuing identities colored, distinct historical identities white until explicitly colored, inherited dependencies parent-colored, and neutral/disputed geography non-selectable.
- Reconciled selection against only identities selectable in the incoming scene, including active historical entities while keeping the modern browser/Locate set separate.
- Reconciled unique non-white legend colors directly from effective scene fills, preserving dormant labels and order across undo, redo, and period switches.
- Added deterministic legend reordering, 1/2/3-column layout, 1080-viewBox corner/nudge clamping, exact style/label bounds, and fail-closed validation.

## Task Commits

TDD behavior was committed before implementation for each task:

1. **Task 1 RED: Effective-scene behavior tests** - `2b79bd2` (test)
2. **Task 1 GREEN: Compose interactive effective scenes** - `7c9836c` (feat)
3. **Task 2 RED: Effective legend behavior tests** - `be887a9` (test)
4. **Task 2 GREEN: Implement effective-scene legends** - `666cac7` (feat)

## Files Created/Modified

- `src/utils/scene.ts` - Effective scene assembly, color ownership, selectable identity derivation, and selection reconciliation.
- `src/utils/scene.test.ts` - Historical continuity, fallback, dependency, neutral, unsafe-ID, and outgoing-selection coverage.
- `src/utils/legend.ts` - Effective-scene reconciliation, dormant metadata, ordering, layout, positioning, and validation.
- `src/utils/legend.test.ts` - Historical legend lifecycle, capacity thresholds, style/label bounds, safe positioning, and fail-closed validation.

## Decisions Made

- Historical coverage is represented by explicit modern source-feature replacement IDs because geometry coverage and logical color identity are different concerns.
- Curator-owned `isSelectable` plus consistent safe identity/color-owner fields determine interaction eligibility; names and source IDs are never inferred as logical keys.
- Effective scene colors include inherited dependency fills but exclude neutral/disputed units from legend derivation.
- Dormant legend entries stay in metadata and are filtered only at the active-entry boundary, preserving creator labels and first-use order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added the missing explicit test-helper return type required by project lint**
- **Found during:** Task 2 final lint verification
- **Issue:** `composeHistoricalScene` in `scene.test.ts` omitted an explicit return type, violating the repository TypeScript lint contract.
- **Fix:** Imported `EffectiveScene` and declared the helper return type without changing behavior.
- **Files modified:** `src/utils/scene.test.ts`
- **Verification:** `npm run lint` and strict TypeScript both pass.
- **Committed in:** `666cac7`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The fix was limited to required type discipline; no scope or architecture changed.

## Issues Encountered

- The first Task 2 verification exposed the missing explicit return type noted above; it was fixed before the task commit was finalized.
- `npm ci` completed from the existing lockfile and reported four pre-existing dependency audit findings (two moderate, two high). Dependency changes and audit remediation were outside this plan and no package files were modified.

## Authentication Gates

None.

## Known Stubs

None. Empty arrays and nullable preset values in the new utilities are active accumulators/default state, not placeholder UI data.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test -- src/utils/scene.test.ts src/utils/colors.test.ts` - PASS, 43 tests.
- `npm test -- src/utils/legend.test.ts` - PASS, 19 tests.
- `npm test -- src/utils/legend.test.ts src/utils/scene.test.ts src/utils/colors.test.ts` - PASS, 62 tests.
- `npm run lint` - PASS.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` - PASS.
- `npm test` - PASS, 169 tests across 18 files.
- Key link - PASS: `src/utils/legend.ts` imports and invokes `getEffectiveSceneColors` from `src/utils/scene.ts` for scene reconciliation and validation.

## Next Phase Readiness

- Scene rendering, active historical interaction, complete-composition persistence, and export plans can consume one shared effective-scene identity/color policy.
- Legend UI and SVG overlay plans can consume deterministic active entries, layout, movement, and validation without re-deriving map colors.
- No blockers remain for downstream Phase 2 composition integration.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-24*

## Self-Check: PASSED

All four created files exist, all four TDD task commits resolve, plan verification is green, and the required scene-to-legend key link is present.
