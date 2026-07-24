---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "05"
subsystem: data
tags: [geojson, world-data, react-hook, validation, sha256, d3]

requires:
  - phase: 02-02
    provides: SceneFeature identity, interaction, boundary, and provenance contracts
  - phase: 02-04
    provides: Reviewed 195-state manifest and deterministic 248-unit world asset
provides:
  - Unknown-input scene GeoJSON validation with exact-pole support and partial recovery
  - Abortable same-origin manifest and world-asset loader with typed fatal states
  - O(1) lookups for 248 visible entities and the 195 selectable core states
  - Exact source/hash/count/parent-policy and finite-path asset gates
affects: [02-world-runtime, camera, scene, country-search, locate, persistence]

tech-stack:
  added: []
  patterns:
    - Rebuild trusted scene features from validated manifest joins and unknown GeoJSON
    - Fetch manifest and world asset concurrently with one abort controller
    - Keep core and visible-entity lookups distinct at the runtime data boundary

key-files:
  created:
    - src/utils/worldDataAsset.test.ts
  modified:
    - src/utils/geojson.ts
    - src/utils/geojson.test.ts
    - src/hooks/useGeoData.ts

key-decisions:
  - "Treat the reviewed manifest as the runtime authority for entity identity, color ownership, selectability, interaction mode, and provenance; asset properties must match before geometry is accepted."
  - "Expose all 248 visible scene units while keeping a separate 195-entry core lookup for selectable country operations."
  - "Use one concurrent same-origin request transaction and one abort signal for both bundled payloads, with source-specific typed fatal states."

patterns-established:
  - "Scene normalization: rebuild only whitelisted geometry and discriminated metadata, warn-and-skip malformed records, and retain valid neighbors."
  - "World asset gate: exact committed hashes, source definitions, core/supplement counts, parent policy, LF attributes, and finite D3 paths are tested together."

requirements-completed: [F7.1, F7.2, F7.3, NFR1, NFR9]

duration: 37 min
completed: 2026-07-24
---

# Phase 02 Plan 05: Unified World Runtime Data Summary

**Validated 248-unit world scene loading with a distinct 195-state selectable core, exact asset policy gates, and abortable same-origin recovery**

## Performance

- **Duration:** 37 min
- **Started:** 2026-07-24T18:18:57Z
- **Completed:** 2026-07-24T18:56:06Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended GeoJSON boundary validation to accept latitude exactly `-90` and `90`, reject out-of-range/non-finite geometry, and rebuild trusted scene metadata from unknown input.
- Added strict discriminated validation for modern core, historical entity, inherited dependency, disputed, and neutral scene policies without display-name ID fallbacks or whole-collection failure when valid neighbors remain.
- Replaced the fixed-Europe runtime loader with concurrent same-origin manifest and world-asset requests sharing one abort controller and source-specific typed fatal states.
- Exposed 248 visible scene features, 195 selectable core features, reviewed country metadata, a 248-entry entity lookup, and a 195-entry core lookup.
- Added deterministic tests for exact committed/source hashes, exact canonical core IDs, six supplements, parent/neutral policy, LF checkout rules, bounded feature counts, abort cleanup, partial malformed-unit recovery, and finite D3 paths.

## Task Commits

Each TDD task was committed with preserved RED and GREEN evidence:

1. **Task 1 RED: Add failing scene validation coverage** - `8871834` (`test`)
2. **Task 1 GREEN: Validate world scene features** - `e461276` (`feat`)
3. **Task 2 RED: Add failing unified world data gates** - `5274391` (`test`)
4. **Task 2 GREEN: Load the unified world dataset** - `f0834c5` (`feat`)

## Files Created/Modified

- `src/utils/geojson.ts` - Inclusive pole validation plus trusted discriminated `SceneFeature` normalization and warning recovery.
- `src/utils/geojson.test.ts` - Boundary, malicious-ID, metadata-policy, duplicate-ID, geometry, and valid-neighbor tests.
- `src/hooks/useGeoData.ts` - Same-origin manifest/asset validation, reviewed joins, abortable request transaction, typed states, metadata, and O(1) lookups.
- `src/utils/worldDataAsset.test.ts` - Exact hash/source/count/policy/path gates and loader failure, abort, and recovery coverage.

## Verification

- `npm test -- src/utils/geojson.test.ts src/utils/worldDataAsset.test.ts` - PASS, 2 files and 45 tests.
- `node scripts/prepareWorldData.mjs --check` - PASS, 248 units and 195 selectable core states.
- `npm run lint` - PASS.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` - PASS.
- `npm test` - PASS, 21 files and 228 tests.
- `npm run build` - PASS, TypeScript build and Vite production bundle.
- Key-link checks - PASS: runtime URLs are `/data/world-manifest.json` and `/data/world-modern.geojson`; no Europe fallback or runtime third-party fetch exists.

## Decisions Made

- The reviewed manifest, not display names or Natural Earth classifications, supplies the trusted scene identity and interaction policy used to rebuild runtime features.
- The public `features` collection represents all visible world units, while `coreFeatures`, `lookup`, and `coreLookup` preserve the exact 195-state selectable country boundary.
- Both bundled payloads start together and share one abort signal so unmount cleanup cancels the entire runtime data transaction.
- Runtime validation allows partial malformed-unit recovery but rejects over-bounded collections before untrusted geometry traversal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed an internal result discriminator from public fatal states**
- **Found during:** Task 2 GREEN focused tests
- **Issue:** Spreading an internal failed payload result leaked `ok: false` into the public `WorldGeoDataState` error object.
- **Fix:** Rebuilt the typed fatal state explicitly from `reason` and `source`.
- **Files modified:** `src/hooks/useGeoData.ts`
- **Verification:** Typed fatal-state tests pass for both manifest and world-asset failures.
- **Committed in:** `f0834c5`

**2. [Rule 3 - Blocking] Kept asset tests compatible with the browser TypeScript project**
- **Found during:** Task 2 strict TypeScript verification
- **Issue:** Initial test-only Node `crypto`, `fs`, and `Buffer` imports required Node type declarations that are intentionally absent from the browser-focused `tsconfig.app.json`.
- **Fix:** Used Vite `?raw` asset imports and standards-based Web Crypto SHA-256 instead, without adding a dependency or changing TypeScript configuration.
- **Files modified:** `src/utils/worldDataAsset.test.ts`
- **Verification:** Strict TypeScript, focused tests, lint, full tests, and production build all pass.
- **Committed in:** `f0834c5`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking issue)
**Impact on plan:** Both fixes preserved the declared browser-only architecture and typed public contract with no scope expansion.

## Issues Encountered

- A scene-test helper initially retained France as the default color owner when a different entity ID was supplied, making the intended valid neighbor invalid. The fixture default was corrected to follow the supplied entity ID before the GREEN commit.
- TypeScript did not retain narrowing through repeated `manifest.naturalEarth` property access inside a callback. A local narrowed `sources` binding resolved the strict-mode error without assertions.

## User Setup Required

None - all runtime data remains bundled and same-origin.

## Known Stubs

None. No placeholder, TODO, FIXME, empty UI data source, or deferred runtime fallback was introduced.

## Next Phase Readiness

- Camera, scene composition, country search, Locate, persistence, and map rendering plans can consume one validated world state with explicit core and visible-unit boundaries.
- The canonical world asset and reviewed manifest remain byte-gated by the existing deterministic preparation script and the new runtime asset tests.
- No blocker remains for downstream Wave 3 integration.

## Self-Check: PASSED

- Confirmed all four implementation files and this summary exist in the isolated worktree.
- Confirmed RED/GREEN commits `8871834`, `e461276`, `5274391`, and `f0834c5` exist in git history.
- Confirmed focused tests, deterministic data check, lint, strict TypeScript, full unit suite, and production build all pass.
- Confirmed no STATE.md, ROADMAP.md, REQUIREMENTS.md, CLAUDE.md, or coding-rule input was modified.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-24*
