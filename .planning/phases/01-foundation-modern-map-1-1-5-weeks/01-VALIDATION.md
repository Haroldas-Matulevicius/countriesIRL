---
phase: 1
slug: foundation-modern-map-1-1-5-weeks
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-21
updated: 2026-07-22
---

# Phase 1 — Validation Strategy

> Final Phase 1 validation contract: accepted final review/test/build/browser evidence plus a concise current-HEAD Chrome 150 and Edge 150 functional smoke. Timing remains diagnostic and non-blocking per D-63.

---

## Release Validation Boundary

Phase 1 release acceptance is functional, not threshold-timing based.

- **Blocking:** final code review PASS; final UI audit 24/24; clean lint/test/data/type/build evidence; exactly 57 unique non-empty map paths; stable no-crash selection/color/history behavior; persistence and storage recovery; responsive/accessibility/offline correctness; exact 1080×1080 opaque centered map-only PNG output; and clean Chrome 150/Edge 150 functional cells with no console, runtime, or required-product-network errors.
- **Advisory only:** map-ready, color, undo, redo, export-duration, launch/bootstrap, ResourceTiming, and other performance samples; threshold booleans; aggregate timing fields; and earlier external-harness timeouts.
- **Not required:** a passing CDP timing artifact, a fixed count of timing samples, completion of the earlier timing harness, or `overallPass: true` from the immutable failed timing record.
- **Immutable history:** `.planning/ui-reviews/01-15-production-preview-rerun/acceptance-evidence.json` and `clean-gate.log`, committed at `c449e6e`, remain read-only failed timing evidence. They must not be edited, replaced, deleted, normalized, or described as passing.

This boundary implements locked decision D-63 while retaining D-55 functional stability, D-58 quality gates, D-61 browser scope, D-62 Europe approval, exact export correctness, and all accepted safety/recovery evidence.

---

## Test Infrastructure and Accepted Final Evidence

| Evidence | Accepted result | Plan 01-15 use |
|----------|-----------------|----------------|
| Final code review | PASS | Retain as accepted final implementation review; no threshold rerun required. |
| Final UI rerun | 24/24 | Use `.planning/ui-reviews/01-rerun-20260722-011622/` as accepted responsive/visual/accessibility/export evidence. |
| Plan 01-22 exact-commit gate | PASS | Detached commit `0ea596732f1072ab30c9287e6e90546f7a7810d3`: npm ci, lint, 16 source files/145 tests, deterministic GeoJSON, strict TypeScript, one production build, clean status. |
| Plan 01-22 geometry | PASS | One finite projected-bounds pass, one final safe path pass, exact translation/path equivalence, 57 non-empty paths, malformed-geometry containment. |
| Plan 01-21 browser/PNG | PASS and user-approved | Installed Chrome 150 and Edge 150; exact title/57 paths; active no-op/history behavior; four exact 1080×1080 opaque centered PNGs; clean consoles. |
| Current-code comprehensive evidence | PASS except timing gate | Five-country flow, history/stress, persistence success/failures, responsive/theme/zoom/motion, tooltip/focus, accessibility/live regions, already-loaded offline, same-origin network, and exact export correctness. Timing fields are advisory per D-63. |
| Failed production timing evidence | FAIL, immutable, non-blocking | Preserve commit `c449e6e`; cite failed samples and Edge harness incompletion as observations only. |

### Current-HEAD drift check

Before browser smoke, Plan 01-15 verifies that the product/test/data/package/build-config tree has not changed from Plan 01-22's exact verified implementation commit. Planning and immutable evidence commits may differ.

```bash
git diff --quiet 0ea596732f1072ab30c9287e6e90546f7a7810d3 HEAD -- \
  index.html package.json package-lock.json vite.config.ts vitest.config.ts \
  eslint.config.js tsconfig.json tsconfig.app.json tsconfig.node.json \
  src scripts public
```

A product-tree difference is blocking and must be explained and revalidated. A timing miss is not.

---

## Plan 01-15 Validation Flow

### Task 1 — Accepted evidence reconciliation

1. Confirm final code review PASS and final UI audit 24/24.
2. Confirm Plan 01-22 records 16 source test files / 145 tests, deterministic GeoJSON, strict TypeScript, production build, exact 57-path equivalence, and clean exact-commit status.
3. Confirm Plan 01-21 records approved Chrome 150/Edge 150 behavior and exact PNG integrity.
4. Confirm accepted persistence/history/storage/accessibility/responsive/offline/no-crash evidence remains present.
5. Run the current-HEAD product-tree drift check.
6. Verify the immutable timing JSON/log remain byte-unchanged from commit `c449e6e`.
7. Label all timing failures and harness timeouts as non-blocking observations per D-63.

### Task 2 — Concise current-HEAD functional smoke

Build current HEAD once, serve it with `npm run preview`, and run the following independently in installed Chrome 150 and Edge 150:

1. Exact title and exactly 57 unique non-empty paths.
2. Single select/color, bulk color, undo, redo, and reset with stable path count and correct history state.
3. Save, load, and delete one local map.
4. One desktop-to-compact/360px responsive check with exactly one active workspace.
5. One keyboard selection/focus path.
6. One PNG export that is 1080×1080, opaque, centered, map-only, and color-correct.
7. Already-loaded offline color/persistence continuity without disconnected reload.
8. No crash, console error/warning from valid product data, runtime exception, failed required same-origin product request, duplicate path, or missing path.

The smoke records one functional PASS/FAIL cell per browser in `01-15-SUMMARY.md`. No timing threshold is captured or enforced. Incidental timing values may be mentioned only as advisory observations.

---

## Functional Coverage Retained from Final Evidence

| Capability | Required evidence | Blocking failure |
|------------|-------------------|------------------|
| Map/data integrity | 57 unique non-empty paths, normalized Natural Earth asset, deterministic build check | Missing/duplicate/empty paths, changed unapproved dataset, crash |
| Color/history | Single/bulk color, active no-op semantics, undo/redo/reset, 50-action bound, branch truncation | Wrong visible state/history, duplicate snapshot, crash |
| Persistence/storage | Save/replace/list/load/delete, history reset, corrupt/partial/quota/unavailable recovery | Lost valid data, crash, silent unsafe recovery |
| Responsive/UI | One active workspace, desktop/compact order, tooltip/focus containment, dark map correctness | Duplicate workspaces, broken focus/order, overflow blocking use |
| Accessibility | Semantic controls, map keyboard operation, visible focus, live regions | Core flow not keyboard-operable or product errors |
| Offline/network | Bundled same-origin assets and continued use after load | Required runtime third-party request or already-loaded core flow failure |
| Export | Exact 1080×1080, opaque white, centered, map-only, current colors, clean lifecycle | Wrong dimensions/content/colors, transparent output, crash |
| Browser scope | Current installed Chrome 150 and Edge 150 | Either functional cell fails |
| Deferred scope | Firefox/Safari/previous versions unverified; Europe POV approved | False certification or reopened approved scope |

---

## Performance Observation Register

The following remain documented but do not gate Plan 01-15 or Phase 1 release:

- Earlier development/StrictMode map-ready measurements.
- Production-preview map-ready samples, including the recorded 523.9 ms Chrome outlier.
- Recorded color/redo samples over prior thresholds.
- Incomplete Edge timing record after external-harness attempts.
- Browser launch/bootstrap/resource/cache/service-worker fields.
- Any export-duration value, provided exact export correctness and no-crash behavior pass.

No observation may be deleted or rewritten as passing. D-63 changes disposition, not history.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Automated evidence | Human evidence | Status |
|---------|------|------|-------------|--------------------|----------------|--------|
| 01-01 through 01-14 | 01-14 | 1-9 | Phase implementation requirements | Existing plan commands and summaries | Existing review/UAT | complete |
| 01-19-01 | 19 | 10 | F1.3/F1.4/NFR5/NFR11 | Focused component/type/build | Accepted behavior | complete |
| 01-20-01 | 20 | 10 | F5.1/F5.3/NFR4/NFR5 | Focused export/type/build | Accepted download behavior | complete |
| 01-21-01 | 21 | 11 | F1.3/F1.4/F5.1/F5.3/NFR4/NFR5/NFR11 | Objective exact-browser/PNG evidence | Explicit user approval | complete |
| 01-22-01 | 22 | 12 | F1.1/F5.1/NFR1/NFR5 | Focused traversal tests plus clean npm ci/lint/145 tests/data/type/build | None required | complete |
| 01-15-01 | 15 | 13 | all Phase 1 requirements | Product-tree/evidence/immutable-record integrity checks | None | pending |
| 01-15-02 | 15 | 13 | all Phase 1 requirements | Current build and immutable-record checks | Clean Chrome 150 and Edge 150 functional cells | pending |
| 01-16-01 | 16 | 14 | NFR5 | Vercel identity/link/deploy inspection | Authorization | pending |
| 01-17-01 | 17 | 15 | F5.1/NFR5 | Production root/data assertions | Production browser/network verification | pending |

---

## Validation Sign-Off

- [x] Final code review PASS and final UI audit 24/24 remain accepted evidence.
- [x] Plan 01-22 records 16 source files/145 tests, deterministic GeoJSON, strict TypeScript, build, exact 57 paths, and traversal safety.
- [x] Plan 01-21 records approved Chrome 150/Edge 150 functional and exact-PNG evidence.
- [x] Persistence/history/storage/accessibility/responsive/offline/no-crash evidence remains part of the release contract.
- [x] D-63 makes timing values and harness timeouts advisory rather than release-blocking.
- [x] Immutable failed timing evidence remains truthful, read-only, and non-blocking.
- [x] Plan 01-15 requires a concise current-HEAD functional smoke in both installed browsers with clean console/product state.
- [x] No CDP timing artifact, timing threshold, sample count, or `overallPass` timing field is required.
- [x] Deferred browsers remain unverified and the Natural Earth Europe presentation remains approved.
- [x] `nyquist_compliant: true` and `wave_0_complete: true` remain set.

**Approval:** planning revised by explicit user decision D-63 on 2026-07-22. Execute Plan 01-15 functional acceptance next; do not mark it complete or deploy during planning.
