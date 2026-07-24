---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "12"
subsystem: historical-data

tags: [geojson, provenance, sha256, zip, react, caching, offline-validation]

requires:
  - phase: 02-01
    provides: Exact Phase 2 tooling and source-scoped verification
  - phase: 02-02
    provides: Snapshot, approval, region, and effective-scene contracts
  - phase: 02-10
    provides: Effective historical/modern-fallback scene composition
provides:
  - Bounded source-readiness, source-approval, asset, and factual-approval validators
  - Offline canonical-ZIP historical preparation CLI with distinct vector and manual-trace modes
  - Modern-only production snapshot catalog with exact asset hash
  - Abortable reviewed-snapshot cache retaining the prior completed scene on failure
  - Exact adjudicated dates for 1492, 1700, 1815, and 1914

affects: [02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-31, 02-32, 02-33, 02-34, 02-35]

tech-stack:
  added: []
  patterns:
    - Hash-chained source and factual approval artifacts
    - Canonical bounded ZIP central-directory and member validation
    - Exact-byte offline generation and non-mutating check modes
    - Controller-backed abortable React data loading with prior-scene retention

key-files:
  created:
    - scripts/prepareHistoricalSnapshot.mjs
    - src/utils/historicalValidation.ts
    - src/utils/historicalValidation.test.ts
    - src/utils/historicalPreparationCli.test.ts
    - src/utils/fixtures/historicalSnapshot.ts
    - src/hooks/useSnapshotData.ts
    - src/hooks/useSnapshotData.test.tsx
    - public/data/snapshots/index.json
    - src/types/nodeTestRuntime.d.ts
  modified: []

key-decisions:
  - "Require exact snapshot dates: 1492-01-03, 1700-01-01, 1815-12-31, and 1914-07-27."
  - "Keep vector extraction reproducible from a canonical archive member while manual traces prove evidence, procedure, operator, control-point, and input hashes without claiming regeneration."
  - "Validate the source-approval SHA before the five factual candidate/review hashes."
  - "Cache reviewed snapshots by ID plus exact SHA-256 and retain the last completed scene during replacement loads and failures."
  - "Keep production Modern-only until separate source/license and factual approval plans promote exact historical bytes."

patterns-established:
  - "Historical evidence chain: source manifest -> canonical archive/member inventory/input/mode -> independent source approval -> candidate/review bytes -> independent factual approval."
  - "Historical load transaction: approval gate before fetch, exact-byte hash validation, malformed-feature warning/skip, stale suppression, then atomic cache commit."

requirements-completed: [F2.1, F2.2, F2.4, F2.5, NFR3, NFR8, NFR9]

duration: 48 min
completed: 2026-07-24
---

# Phase 2 Plan 12: Historical Engine and Evidence Gates Summary

**Offline historical preparation now enforces canonical evidence archives, independent hash-bound approvals, exact snapshot dates, and abortable reviewed-asset caching while production remains Modern-only.**

## Performance

- **Duration:** 48 min
- **Started:** 2026-07-24T18:17:28Z
- **Completed:** 2026-07-24T19:05:09Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Added bounded unknown-input validation for six separate regional source records, independent reviewers, canonical member inventories, vector/manual evidence, historical assets, and factual approval chains.
- Added an offline/non-mutating CLI that rejects stale or self-approved evidence before output work, deterministically regenerates vector fixtures, honestly verifies manual traces, and detects source/input/output/review drift.
- Added an abortable snapshot loader and cache that gates non-approved IDs before fetch, validates exact bytes, suppresses stale commits, retains the previous completed scene on failure, and records warm readiness measurements.
- Seeded `public/data/snapshots/index.json` with only the exact current Modern asset; no source/evidence dataset enters the browser bundle.

## Task Commits

Each TDD task was committed with a failing-test gate followed by its implementation:

1. **Task 1: Validate readiness, durable source approvals, assets, and factual approvals**
   - `f93533b` — failing evidence-validation tests
   - `01e58fe` — historical readiness and approval validators
2. **Task 2: Implement the offline historical CLI for vector and manual-trace modes**
   - `e77e347` — failing CLI and deterministic fixture tests
   - `694469c` — offline preparation/check modes and Modern catalog
3. **Task 3: Implement reviewed snapshot caching and failure retention**
   - `4f107a2` — failing snapshot-loader tests
   - `296ebca` — approved snapshot cache and loader

## Files Created/Modified

- `scripts/prepareHistoricalSnapshot.mjs` — Offline source validation, source-approval validation, generation, exact checking, and factual approval verification.
- `src/utils/historicalValidation.ts` — Runtime/build validators for evidence, approvals, assets, catalog entries, and exact historical dates.
- `src/utils/historicalValidation.test.ts` — Source/factual approval, self-approval, stale-byte, six-region, malformed-feature, and selection-gate coverage.
- `src/utils/historicalPreparationCli.test.ts` — Vector/manual fixture generation, tamper, drift, no-network, non-mutation, and catalog tests.
- `src/utils/fixtures/historicalSnapshot.ts` — Deterministic canonical ZIP and historical approval fixture builder.
- `src/hooks/useSnapshotData.ts` — Abortable exact-byte reviewed snapshot cache and React hook.
- `src/hooks/useSnapshotData.test.tsx` — Cache, abort, stale suppression, retention, retry, gating, and metadata tests.
- `public/data/snapshots/index.json` — Modern-only production snapshot catalog bound to the current world asset SHA-256.
- `src/types/nodeTestRuntime.d.ts` — Minimal strict declarations for Node-only fixture/test APIs without adding a runtime dependency.

## Decisions Made

- Applied the adjudicated dates exactly: `1492-01-03`, `1700-01-01`, `1815-12-31`, and `1914-07-27`.
- Kept the engine source-neutral. Later acquisition plans can bind the directed Cliopatria v0.2.0 and HistoGIS v9.0 inputs through the same source manifest without weakening separate rights and factual approval.
- Required canonical normalized sorted ZIP paths, fixed metadata, no encryption, supported compression only, bounded sizes, exact CRC/uncompressed hashes, and no traversal or duplicate members.
- Treated source approval and factual approval as separate independent artifacts; factual validation checks the current source-approval JSON hash first.
- Used cache identity `{snapshotId, sha256}` so a promoted asset with changed bytes cannot reuse stale normalized data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added strict Node-only test runtime declarations**
- **Found during:** Task 2 (offline historical CLI)
- **Issue:** The project intentionally has no `@types/node` dependency, while the plan places deterministic ZIP/CLI fixtures under `src/`, which is included by strict `tsconfig.app.json`; Node imports and `Buffer` therefore failed the required TypeScript gate.
- **Fix:** Added a minimal declaration-only shim for exactly the Node APIs used by the fixture and CLI test. No package was installed and no runtime/browser code was added.
- **Files modified:** `src/types/nodeTestRuntime.d.ts`
- **Verification:** `npm exec tsc -- -p tsconfig.app.json --noEmit`, `npm run build`
- **Committed in:** `694469c`

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** The declaration-only fix preserves strict checking and exact scope behavior without changing runtime dependencies or browser output.

## Issues Encountered

- Factual check ordering initially compared deterministic review bytes before reporting a changed source-approval SHA. Reordered the check so source approval is verified first, matching the approval-chain contract.
- React hook lint forbids reading a ref-owned controller during render. The hook now creates its controller through lazy `useState`, preserving one stable instance without violating hook rules.

## Verification

- `npm test -- src/utils/historicalValidation.test.ts src/utils/scene.test.ts` — PASS
- `npm test -- src/utils/historicalPreparationCli.test.ts` — PASS
- `node scripts/prepareHistoricalSnapshot.mjs --help` — PASS
- `npm test -- src/hooks/useSnapshotData.test.tsx src/utils/historicalValidation.test.ts src/utils/scene.test.ts` — PASS
- `npm test` — PASS, 23 files / 245 tests
- `npm run lint -- --max-warnings=0` — PASS
- `npm exec tsc -- -p tsconfig.app.json --noEmit` — PASS
- `npm run build` — PASS
- Modern-only catalog and exact `world-modern.geojson` SHA-256 check — PASS
- CLI vector/manual generation, archive tamper, source-approval drift, input/output/review drift, factual-approval chaining, and non-mutation checks — PASS through focused tests

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 02-31/02-32 can assemble local source/license bundles against the executable canonical evidence contract.
- Plan 02-33 can validate independent durable source approvals.
- Plans 02-13 through 02-17 remain correctly blocked from production promotion until source/license and factual approvals bind exact current bytes.
- F2/NFR8 must not be claimed from this automation alone; historical source and factual review remain pending.

## Self-Check: PASSED

- All nine created/modified plan files exist.
- All six TDD task commits exist in repository history.
- Required focused tests, full tests, lint, strict TypeScript, production build, CLI help, Modern catalog hash, deterministic generation, tamper, drift, and non-mutation checks pass.
- `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `CLAUDE.md`, and external coding-rule inputs were not modified.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-24*
