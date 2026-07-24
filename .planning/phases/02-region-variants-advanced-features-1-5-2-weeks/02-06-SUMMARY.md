---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "06"
subsystem: camera
tags: [d3, mercator, camera, antimeridian, vitest]

requires:
  - phase: 02-region-variants-advanced-features-1-5-2-weeks
    provides: Phase 2 composition contracts and named camera constants from Plan 02-02
provides:
  - Fixed 1080-unit square Mercator projection for transform-only world rendering
  - Pure finite camera constraint and semantic persistence conversion helpers
  - Center zoom, step pan, Reset, and antimeridian-safe Locate targets
  - Camera and projection invariant tests covering wrapped-world behavior
affects: [02-09, 02-10, 02-12, 02-18, 02-22, export, persistence]

tech-stack:
  added: []
  patterns:
    - Fixed Mercator geometry with transform-only camera frames
    - Canonical semantic camera persistence instead of raw translations
    - Spherical D3 bounds and centroid for antimeridian-safe Locate

key-files:
  created:
    - src/utils/camera.ts
    - src/utils/camera.test.ts
  modified:
    - src/utils/mapProjection.ts
    - src/utils/mapProjection.test.ts

key-decisions:
  - "Use WORLD_SIZE / (2π) as the fixed Mercator scale so one projected world exactly fills the canonical 1080 square at zoom 1."
  - "Normalize live horizontal translations modulo transformed world width and persist only finite zoom plus canonical longitude/latitude."
  - "Use geoBounds and geoCentroid with unwrapped longitude intervals for Locate instead of planar vertex averages."
  - "Keep the existing createFixedEuropeProjection call surface as a typed alias to the world projection until MapCanvas controller integration changes its import."

patterns-established:
  - "Every user or programmatic camera target passes through constrainCameraTransform before use."
  - "Camera transforms remain DOM-free pure math and geometry is not regenerated per camera frame."

requirements-completed: [F3.1, F3.2, F3.3, F3.4, F3.5, F7.1, F7.2, F7.3, NFR11]

duration: 23 min
completed: 2026-07-24
---

# Phase 2 Plan 6: Wrapped World Camera Mathematics Summary

**Fixed square Mercator geometry with finite wrapped transforms, semantic camera persistence, and spherical antimeridian-safe Locate targets**

## Performance

- **Duration:** 23 min
- **Started:** 2026-07-24T17:28:01Z
- **Completed:** 2026-07-24T17:51:04Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Replaced Europe-specific projection fitting with one canonical 1080-unit Mercator world projection whose minimum zoom displays exactly one complete world.
- Added pure camera helpers for zoom clamping, horizontal modulo wrapping, vertical pole clamping, semantic camera repair/conversion, center-anchored zoom, 12.5% viewport pan steps, Reset, and Locate.
- Used D3 spherical bounds and centroids to frame Fiji, Russia, and date-line-spanning geometries without raw longitude arithmetic.
- Added 40 focused invariant tests and retained finite path containment for every accepted Phase 1 geometry.

## Task Commits

The TDD task was committed through its required RED and GREEN gates:

1. **RED: Add failing wrapped camera invariant tests** - `3f542f3` (test)
2. **GREEN: Implement wrapped world camera math** - `feacd8f` (feat)

## Files Created/Modified

- `src/utils/camera.ts` - Pure wrapped transform constraints, semantic conversion, pan/zoom, Reset, and Locate math.
- `src/utils/camera.test.ts` - Table/property-style invariant coverage for finite repair, modulo wrap, pole clamp, round trips, pan/zoom, and antimeridian Locate.
- `src/utils/mapProjection.ts` - Fixed canonical world Mercator projection and retained finite path containment.
- `src/utils/mapProjection.test.ts` - Fixed-world projection, date-line path, and finite geometry tests.

## Verification

- `npm test -- src/utils/camera.test.ts src/utils/mapProjection.test.ts` - PASS, 40 tests.
- `npm run lint` - PASS.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` - PASS.
- `npm test` - PASS, 174 tests across 17 files.
- `npm run build` - PASS, Vite production bundle generated.
- Acceptance scan - PASS: no Europe `fitExtent`, azimuthal projection, DOM access, localStorage access, animation-frame work, or raw translation persistence in the camera/projection utilities.
- `verify.key-links` - PASS: `src/utils/camera.ts` imports and applies named `MIN_ZOOM`, `MAX_ZOOM`, `WORLD_SIZE`, latitude, pan, and Locate bounds from `src/constants/camera.ts`.

## Decisions Made

- A scale of `WORLD_SIZE / (2 * Math.PI)` makes the Mercator projection exactly one canonical world wide and tall at the configured latitude limit.
- Horizontal transforms use a single canonical modulo interval while semantic longitude remains normalized to `[-180, 180)`.
- Vertical constraints are always calculated in transformed screen space as `[1080 - 1080k, 0]`.
- Locate preserves spherical centroid intent while sizing from an antimeridian-safe unwrapped bounds interval with 12% padding and the locked zoom range.
- The old projection export remains only as a typed compatibility alias; it performs no Europe fitting and returns the same fixed world projection.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial RED fixtures exposed GeoJSON ring-orientation sensitivity and Mercator boundary floating-point precision. The test fixtures and tolerance were corrected during GREEN without weakening the camera invariants.
- `npm ci` reported pre-existing transitive package audit findings. No dependency versions were changed because package maintenance is outside Plan 02-06.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The pure camera/projection boundary is ready for the MapCanvas camera controller and wrapped scene integration plans.
- No blockers remain for dependent camera UI, persistence, or export work.

## Self-Check: PASSED

- All four key files exist in the isolated worktree.
- RED commit `3f542f3` and GREEN commit `feacd8f` exist on the worktree branch.
- Focused tests, lint, strict TypeScript, full unit suite, production build, acceptance scan, and key-link verification passed.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-24*
