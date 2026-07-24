---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "02"
subsystem: contracts
tags: [typescript, camera, historical-snapshots, legend, persistence]
requires:
  - phase: 01-foundation-modern-map-1-1-5-weeks
    provides: Stable CountryId/ColorMap contracts, bounded color history, local persistence, and the connected HTML export source
provides:
  - Sole root-facing MapCanvasHandle and idempotent camera-freeze lease contract
  - Discriminated effective-scene interaction policy for modern, historical, inherited, disputed, and neutral geography
  - Complete camera, legend, snapshot, approval, persistence, and load-outcome contracts
  - Named wrapped-world camera limits and one canonical five-snapshot catalog
  - Exact six-region historical review vocabulary and allowed review statuses
affects: [02-03, 02-06, 02-07, 02-10, 02-12, 02-19, 02-29, 02-30]
tech-stack:
  added: []
  patterns:
    - One imperative MapCanvasHandle delegates to the visible canvas controller
    - Durable composition state stays separate from bounded color history
    - Scene interaction policy is encoded as a discriminated readonly union
key-files:
  created:
    - src/types/composition.ts
    - src/constants/camera.ts
    - src/constants/snapshots.ts
  modified:
    - src/types/map.ts
    - src/types/ui.ts
key-decisions:
  - "Use exactly one MapCanvasHandle for live camera reads, freeze leases, navigation, focus, and connected export-source access."
  - "Encode historical selectability as discriminated scene-feature modes rather than inferring behavior from names or source IDs."
  - "Keep CompositionState free of colors/history while CompositionSnapshot carries colors only for complete persistence transactions."
  - "Keep all snapshot labels in one catalog and derive cache/manifest bounds from its five entries."
patterns-established:
  - "Camera transaction pattern: non-locking read for save, CameraFreezeLease for export, and outermost-finally release by transaction owners."
  - "Historical interaction pattern: modern-core and approved historical entities are selectable; dependencies inherit; disputed and neutral units cannot be selected."
  - "Approval pattern: exact six-region source and factual decisions bind reviewer identity and exact evidence hashes."
requirements-completed: [F2.1, F2.2, F2.4, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR9, NFR11]
duration: 19 min
completed: 2026-07-24
---

# Phase 2 Plan 2: World Composition Contracts Summary

**Readonly world-camera transactions, effective-scene identity policy, complete composition persistence, and one canonical reviewed-snapshot vocabulary now anchor every downstream Phase 2 subsystem.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-07-24T16:48:58Z
- **Completed:** 2026-07-24T17:07:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Defined the only root-facing `MapCanvasHandle`, including live camera reads, freeze leases, camera actions, logical-country focus, and connected export-source access.
- Encoded modern-core, approved historical, inherited dependency, disputed, and neutral scene behavior in one discriminated readonly feature contract.
- Added complete camera, snapshot manifest, source/factual approval, legend, composition, V1/V2 persistence, and typed load-outcome contracts without adding camera state to color history.
- Locked all wrapped-world camera values, the five intended snapshot labels, same-origin manifest path, bounded cache/catalog size, allowed review statuses, and exact six historical region IDs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the single canvas handle, effective-scene, and complete-composition contracts** - `5ebc73f` (`feat`)
2. **Task 2: Lock camera and snapshot constants** - `1e51de8` (`feat`)
3. **Task 1 contract clarification: State the idempotent outermost-finally lease lifecycle** - `2c40ec2` (`docs`)

## Files Created/Modified

- `src/types/composition.ts` - Sole canvas handle plus camera, scene, legend, historical evidence, composition, persistence, and load contracts.
- `src/types/map.ts` - Readonly GeoJSON identity plus discriminated effective-scene selectability and color-owner policy.
- `src/types/ui.ts` - Preserves the Phase 1 `SavedMap` API as the legacy composition record contract.
- `src/constants/camera.ts` - Exact wrapped-world limits, interaction factors, durations, and initial camera.
- `src/constants/snapshots.ts` - Canonical snapshot catalog, manifest/cache bounds, review statuses, and region IDs.

## Verification Results

- `npm exec tsc -- -p tsconfig.app.json --noEmit` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 16 files and 145 tests
- `npm run build` - PASS
- Sole `MapCanvasHandle` search - PASS, exactly one declaration
- Region-mode/azimuthal contract search - PASS, no matches
- Camera/snapshot/legend fields in `MapState` search - PASS, no matches
- Nullable partial composition/raw persisted geometry search - PASS, no matches
- Historical interaction discriminants search - PASS for selectable modern/historical, inherited dependency, disputed, and neutral modes
- Runtime external URL search in new constants - PASS, no matches

## Decisions Made

- The canvas bridge is a single interface rather than separate camera and export refs, preventing competing controllers during responsive remounts.
- Scene selectability is structural: approved historical entities are explicitly selectable while dependencies, disputed units, and neutral units are structurally non-selectable.
- `CompositionState` contains only durable non-color composition fields and its saved baseline; complete persistence uses `CompositionSnapshot` to pair those fields with the existing sparse `ColorMap`.
- Legend metadata uses a bounded readonly ordered collection, avoiding a second mutable dictionary at the composition boundary.
- Snapshot labels live only in `SNAPSHOT_CATALOG`; manifest and cache limits derive from the catalog length to prevent drift.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The isolated worktree was initially created from an older base. After confirming there were no edits, staged files, or unique commits, it was recreated on the authorized exact base `e217d5fc043564a06692052de5c762ad6dd5ea22` and every branch/base/path guard was rerun before implementation.
- An initial extension of the existing Phase 1 storage warning union made its exhaustive UI mapping incomplete. The unneeded extension was removed before the Task 1 commit; Phase 2-specific load outcomes remain isolated in `composition.ts`.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 02-03, 02-06, 02-07, 02-10, 02-12, 02-19, 02-29, and 02-30 can import the same camera, scene, composition, approval, persistence, and snapshot contracts.
- Historical snapshots remain evidence-gated; these contracts do not claim source, license, or factual approval for candidate geometry.

## Self-Check: PASSED

- All five created/modified product files exist in the isolated worktree.
- Task commits `5ebc73f`, `1e51de8`, and `2c40ec2` exist in git history.
- No `STATE.md` or `ROADMAP.md` changes were made.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-24*
