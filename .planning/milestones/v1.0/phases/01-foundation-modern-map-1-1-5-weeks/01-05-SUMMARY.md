---
phase: 01-foundation-modern-map-1-1-5-weeks
plan: "05"
subsystem: data
tags: [geojson, natural-earth, react, validation, deterministic-build]

requires:
  - phase: 01-03
    provides: Shared GeoFeature, warning, normalization-result, and GeoDataState contracts
provides:
  - Strict unknown-input Polygon and MultiPolygon normalization with typed warnings
  - Checksum-pinned Natural Earth 5.1.1 Europe asset and deterministic --check pipeline
  - Abortable same-origin React data loading with memoized stable-ID lookup
affects: [01-06-map-rendering, 01-07-selection-coloring, 01-09-persistence, 01-15-uat]

tech-stack:
  added: []
  patterns:
    - Unknown JSON is rebuilt into a narrow trusted runtime contract
    - Versioned upstream bytes are SHA-256 verified before deterministic transformation
    - React effects abort fetches on cleanup and expose discriminated load states

key-files:
  created:
    - scripts/prepareGeoData.mjs
    - public/data/europe-modern.geojson
    - public/data/README.md
    - src/utils/geojson.ts
    - src/utils/geojson.test.ts
    - src/hooks/useGeoData.ts
  modified: []

key-decisions:
  - "Pin the exact Natural Earth 5.1.1 Admin 0 GeoJSON bytes by SHA-256, not only by a mutable network location."
  - "Include all Natural Earth CONTINENT=Europe features plus Armenia, Azerbaijan, Cyprus, Georgia, Kazakhstan, and Turkey; retain complete source geometries."
  - "Use ADM0_A3, GU_A3, ISO_A3, then SOV_A3 for stable IDs and NAME_LONG, ADMIN, then NAME for display labels."
  - "Write compact canonical JSON to reduce the committed runtime payload while preserving byte-for-byte determinism."

patterns-established:
  - "Data boundary: validate unknown input, skip invalid records with typed warnings, and fail only when the collection is unusable."
  - "Data preparation: source checksum verification, stable sorting, canonical serialization, and non-mutating --check mode."
  - "Data loading: same-origin fetch, pre-fetch performance mark, AbortController cleanup, and memoized ID lookup."

requirements-completed: [F1.1, NFR1]

duration: 12min
completed: 2026-07-21
---

# Phase 1 Plan 05: Deterministic Natural Earth Data Summary

**Checksum-pinned Natural Earth 5.1.1 Europe boundaries with strict runtime normalization, deterministic `--check`, and abortable same-origin React loading**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-21T22:55:12Z
- **Completed:** 2026-07-21T23:07:18Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added a strict `unknown`-input GeoJSON normalizer that accepts only stable unique string IDs, trimmed names, and valid Polygon/MultiPolygon geometry while preserving usable records and reporting typed warnings.
- Acquired and committed 57 Europe-focused Natural Earth 5.1.1 features through a deterministic, SHA-256-pinned preparation script whose `--check` mode compares canonical bytes without rewriting the asset.
- Added a one-effect `useGeoData` boundary with a pre-fetch performance mark, response and payload handling, abort cleanup, warning propagation, and memoized O(1) country lookup.

## Source, Version, and POV Record

- **Dataset:** Natural Earth 1:10m Admin 0 Countries
- **Version:** 5.1.1
- **Repository:** `https://github.com/nvkelso/natural-earth-vector`
- **Versioned source:** `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson`
- **Approved source SHA-256:** `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`
- **Terms:** Natural Earth public domain
- **POV:** Standard/default `ne_10m_admin_0_countries` geopolitical point of view; no alternate POV dataset substituted
- **Inclusion:** Every `CONTINENT=Europe` Admin 0 feature plus Armenia, Azerbaijan, Cyprus, Georgia, Kazakhstan, and Turkey; Russia is included through Natural Earth's Europe classification
- **Runtime boundary:** The browser requests only `/data/europe-modern.geojson` from the application origin

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement the unknown-input GeoJSON normalizer**
   - `1d37a94` — failing table-driven normalization tests (RED)
   - `b45e30c` — strict normalization implementation (GREEN)
2. **Task 2: Generate and document the committed Natural Earth Europe asset** — `5c4310f`
3. **Task 3: Load normalized map data once with abort and lookup semantics** — `fdb4582`

_Note: Task 1 followed the required TDD test-then-feature sequence._

## Files Created/Modified

- `scripts/prepareGeoData.mjs` — Fetches or reads the exact approved source, verifies its checksum, filters and normalizes features, writes canonical output, and supports non-mutating `--check`.
- `public/data/europe-modern.geojson` — Committed compact FeatureCollection containing 57 normalized map features.
- `public/data/README.md` — Records source, version, checksum, public-domain terms, default POV, inclusion policy, ID/name precedence, and generation commands.
- `src/utils/geojson.ts` — Unknown-input runtime validator and normalizer with typed warning/fatal results.
- `src/utils/geojson.test.ts` — Fourteen tests covering collection, ID, name, duplicate, sentinel, geometry, partial-success, and unusable-data behavior.
- `src/hooks/useGeoData.ts` — Abortable mount-time same-origin fetch and memoized stable-ID lookup.

## Decisions Made

- Verified the exact upstream 5.1.1 raw file by SHA-256 before parsing so moved tags or changed bytes fail closed.
- Preserved all upstream geometry for included transcontinental countries; the downstream renderer remains responsible for the fixed Europe viewport.
- Sorted normalized features by ID and serialized compact JSON with a trailing LF, making output deterministic while reducing the asset from an initial 11,091,341-byte pretty form to 2,850,798 bytes.
- Kept technical failures behind stable hook reasons (`fetch-failed` and `invalid-data`) so later UI plans can map them to approved copy without exposing raw errors.

## Verification

- `npm run test:run -- src/utils/geojson.test.ts` — 14 tests passed.
- `npm run test:run` — full suite passed: 47 tests across 2 files.
- `node scripts/prepareGeoData.mjs` — generated 57 features.
- `node scripts/prepareGeoData.mjs --check` — canonical committed bytes matched.
- Deliberately changed the asset and reran `--check` — exited 1 as required; normal generation restored canonical bytes.
- Asset contract probe — validated 57 features, 57 unique non-sentinel IDs, trimmed names, and only Polygon/MultiPolygon geometry.
- `npm run lint` — passed.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` — passed.
- Runtime-source scan — no third-party URL or Natural Earth request appears in `src`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the generated feature-count record**
- **Found during:** Task 2 (dataset generation)
- **Issue:** The initial provenance text estimated 55 features, while the documented policy deterministically produced 57.
- **Fix:** Updated the record to the generated and validated count of 57.
- **Files modified:** `public/data/README.md`
- **Verification:** Generation output and asset contract probe both report 57 features.
- **Committed in:** `5c4310f`

**2. [Rule 2 - Missing Critical] Compacted canonical output for the load/DoS boundary**
- **Found during:** Task 2 (dataset size review)
- **Issue:** Two-space serialization produced an 11,091,341-byte runtime asset despite Europe filtering, creating avoidable load and parsing overhead at the untrusted static-data boundary.
- **Fix:** Kept deterministic ordering but switched canonical serialization to compact JSON, reducing the asset to 2,850,798 bytes without changing geometry or runtime data.
- **Files modified:** `scripts/prepareGeoData.mjs`, `public/data/europe-modern.geojson`, `public/data/README.md`
- **Verification:** Generation and `--check` pass; the asset contract probe validates all 57 features.
- **Committed in:** `5c4310f`

**3. [Rule 1 - Bug] Removed unused catch bindings rejected by project lint**
- **Found during:** Task 3 (hook verification)
- **Issue:** Explicit `_error` bindings violated `@typescript-eslint/no-unused-vars` even though failures were intentionally translated to stable state codes.
- **Fix:** Used an optional catch binding and a parameterless promise rejection handler while preserving error-state behavior.
- **Files modified:** `src/hooks/useGeoData.ts`
- **Verification:** Lint, strict TypeScript, and GeoJSON tests all pass.
- **Committed in:** `fdb4582`

**4. [Rule 3 - Blocking] Normalized the F1.1 requirement checkbox for SDK recognition**
- **Found during:** GSD closeout
- **Issue:** `requirements.mark-complete` could not recognize F1.1 because the pre-existing requirement used a plain bullet rather than checkbox syntax.
- **Fix:** Converted F1.1 to the existing `[x]` requirement format and reran the SDK handler, which confirmed F1.1 and NFR1 as complete.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** The handler reports both requirement IDs in `already_complete` with no `not_found` entries.
- **Committed in:** Final metadata commit

**5. [Rule 1 - Bug] Corrected stale progress percentage in STATE frontmatter**
- **Found during:** GSD closeout self-check
- **Issue:** `state.update-progress` updated the body to 24% and completed-plan count to 4 but wrote `percent: 0` in frontmatter.
- **Fix:** Aligned frontmatter to `percent: 24`, matching the SDK result and visible progress line.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE now records 4 of 17 plans and 24% in both machine-readable and human-readable fields.
- **Committed in:** Final metadata commit

---

**Total deviations:** 5 auto-fixed (3 Rule 1 bugs, 1 Rule 2 missing critical performance safeguard, 1 Rule 3 blocker)
**Impact on plan:** All fixes preserved product file scope and closeout consistency; no dependent plan work was executed.

## Issues Encountered

- The tracked isolated worktree did not contain `CLAUDE.md` or `.planning/coding-rules/*.md`; they were loaded read-only from the primary checkout and applied as project authority.
- Context7 MCP and CLI were unavailable. The implementation followed the plan's already-cited official React `useEffect` guidance and locked research authority without adding or changing packages.
- The installed GSD SDK requires named arguments for metric, decision, and session mutations even though the executor reference showed positional examples; current handler signatures were inspected and used to complete closeout.

## Known Stubs

None.

## User Setup Required

None - the committed same-origin data asset needs no environment variables or external runtime service.

## Next Phase Readiness

- Plan 01-06 can consume stable normalized features and O(1) lookup for D3/SVG rendering.
- Plans 01-07 and 01-09 can safely use normalized country IDs for selection, colors, and persistence.
- Natural Earth default-POV presentation acceptance remains intentionally assigned to Plan 01-15.
- No dependent plans were executed.

## Self-Check: PASSED

- All six implementation files and the summary exist.
- Task commits `1d37a94`, `b45e30c`, `5c4310f`, and `fdb4582` exist.
- The verification gate and full unit suite pass.

---
*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Completed: 2026-07-21*
