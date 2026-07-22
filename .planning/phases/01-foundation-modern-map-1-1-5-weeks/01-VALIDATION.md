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

> Per-phase validation contract including the Plan 01-22 traversal correction, exact-commit clean-worktree gates, automatic immutable production evidence, and blocking human review before deployment.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10; exact package identity approved in Plan 01-01 and installed by Plan 01-02 |
| **Config file** | `vitest.config.ts` — source-scoped to `src/**/*.test.{ts,tsx}`, explicitly excludes `.claude/**`, and is guarded by `src/vitestScope.test.ts` |
| **Focused command** | `npm run test:run -- src/utils/mapProjection.test.ts` for Plan 01-22 RED/GREEN feedback |
| **Authoritative full gate** | In a detached clean worktree of the exact commit: `npm ci && npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm exec tsc -- -p tsconfig.app.json --noEmit && npm run build` |
| **Why isolated** | Existing nested executable evidence tooling under the main checkout is discovered by repository-wide `eslint .`; the contaminated checkout is not authoritative. |
| **Verified pre-gap baseline** | The failed Plan 01-15 evidence passed 16 source test files / 136 tests plus deterministic data and production build; only map-ready failed, while the main-checkout lint result was environment-contaminated. |

---

## Sampling Rate

- **During Plan 01-22 TDD:** Run the focused projection test for RED/GREEN; after the final implementation commit, run the full unfiltered tests and all other gates in a clean detached worktree of that exact commit.
- **After implementation waves:** Authoritative acceptance comes from exact-commit clean worktrees, not the main checkout containing nested UI-review executables.
- **Plan 01-18 through Plan 01-21:** Completed documentation, quality, preset, export, and focused exact-browser closure work remains accepted.
- **Plan 01-22 map-ready gap fix (Wave 12):** Add traversal-count, exact equivalence, 57-path, and malformed-geometry regressions; implement aggregate finite bounds plus one final safe path; commit; then run npm ci, lint, full unfiltered `npm run test:run`, data, type, and build in the clean worktree. Record the exact commit in `01-22-SUMMARY.md`.
- **Plan 01-15 Task 1 (Wave 13, automatic):** Create a second clean detached worktree at the exact Plan 01-22 verified commit. Run the authoritative gate first and build exactly once. Serve that `dist` at `127.0.0.1:4173`. Create the CDP harness only in an OS temporary directory outside Git. Generate immutable JSON evidence containing 20 map-ready samples, 60 interaction samples, commit/browser/cache/transfer/service-worker/launch/bootstrap/path/pass-fail fields, plus a non-executable clean-gate log.
- **Plan 01-15 Task 2 (Wave 13, blocking human):** Review the immutable artifact and its SHA-256, require both raw browser cells and `overallPass` to be true, then complete only the remaining visual/usability/accessibility UAT without rebuilding or editing the evidence.
- **Before `/gsd:verify-work`:** Plan 01-22, both Plan 01-15 tasks, and Plans 01-16/01-17 must be complete.

---

## Deep-Review Fix Coverage

| Review fix | Completed behavior | Automated evidence | Plan 01-15 acceptance |
|------------|--------------------|--------------------|------------------------|
| BL-01 | Exact/trim-equivalent saved-map names deduplicate newest-valid | `src/utils/storage.test.ts` | Task 1 automation plus Task 2 review |
| BL-02 | Valid-subset load emits warning feedback | `src/components/SaveLoad.test.tsx` | Automated storage simulation plus manual feedback review |
| BL-03 | Effective white and active presets are disabled/no-op | Color/reducer/component tests | Automated White→Red raw evidence plus review |
| BL-04 | Unavailable onboarding storage read creates assertive alert | `src/App.test.tsx` | Automated failure simulation plus manual accessibility review |
| WR-01 | Test discovery is source-only and excludes `.claude/**` | `src/vitestScope.test.ts`, `vitest.config.ts` | Clean-worktree full unfiltered test record |
| WR-02 | Controls do not advertise unimplemented shortcuts | `src/components/Controls.test.tsx` | Clean-worktree gate |
| WR-03 | Tooltips flip/clamp in viewport | `src/components/Tooltip.test.ts` | Automated geometry evidence plus 360px human observation |
| WR-04 | Modal restores focus after responsive remount | SaveLoad/Controls tests | Automated focus state plus both-direction human observation |

---

## Plan 01-15 UAT Gap Closure

| Gap | Confirmed defect | Closure plans | Acceptance boundary |
|-----|------------------|---------------|---------------------|
| Map-ready traversal | e2f9190 introduced approximately five full traversals of 129,974 coordinate positions. | 01-22 → 01-15 | Tests prove one finite bounds pass plus one final path pass with exact output; all 20 production samples remain <500ms. |
| Development benchmark | Vite dev/StrictMode doubles expensive mount geometry and is not release evidence. | 01-15 Task 1 | Gate/build once in clean checkout, then serve production preview only. |
| Main-checkout lint contamination | Nested executable evidence checkout/harness files are discovered by `eslint .`. | 01-22 and 01-15 Task 1 | All authoritative lint/test/data/type/build gates run in detached clean worktrees of exact recorded commits. |
| Evidence provenance | Previous executable harness/profile/cache artifacts lived inside repository evidence trees. | 01-15 Task 1 | Harness, profiles, and caches stay in OS temp; repository retains only final non-executable JSON/log files. |
| Benchmark semantics | Prior evidence lacked full cache/transfer/service-worker and separate launch/bootstrap metadata. | 01-15 Task 1 | Immutable JSON contains all required fields for every sample and derives browser/overall pass-fail from raw data. |
| Human approval ordering | One checkpoint previously mixed evidence generation and review. | 01-15 Tasks 1→2 | Automation completes and freezes evidence first; human reviews it and remaining UAT second. Approval cannot override a failed raw cell. |
| Release browser/data scope | Phase 1 is installed Chrome 150 and Edge 150 only; Natural Earth presentation is already approved. | 01-15 Task 2 | Both raw browser cells and manual checks pass; deferred browsers remain explicitly unverified. |

Optional GeoJSON simplification and lazy html2canvas loading are not part of this closure and may not replace the targeted traversal correction or unchanged threshold.

---

## Planned Evidence Ownership

| Artifact | Owner | Mutability | Contents |
|----------|-------|------------|----------|
| `.planning/ui-reviews/01-15-production-preview-rerun/clean-gate.log` | Plan 01-15 Task 1 | Created once; read-only during Task 2 | Exact-commit npm ci/lint/full-test/data/type/single-build transcript |
| `.planning/ui-reviews/01-15-production-preview-rerun/acceptance-evidence.json` | Plan 01-15 Task 1 | Created atomically once; hashed and never edited during Task 2 | Raw 20 map-ready, 60 interaction, browser/cache/transfer/service-worker/launch/bootstrap/path/check/pass-fail evidence |
| Temporary CDP harness, browser profiles, caches | Plan 01-15 Task 1 | Ephemeral, outside repository | Harness/profiles deleted after JSON; never copied into Git |
| Clean worktree and preview process | Task 1 creates; Task 2 cleans | Outside repository; retained only through checkpoint | Same exact commit/build for human observation without rebuilding; removed after approval or rejection |
| `01-15-SUMMARY.md` | Plan 01-15 Task 2 closeout | Created after approval | Evidence paths/hash, exact commit, raw ranges, browser cells, manual result, deferred labels |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Artifact | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|----------|--------|
| 01-01-01 | 01 | 1 | NFR4/NFR5 | T-01-SC | Exact package identities approved | human/package | Registry/source verification | external | complete |
| 01-02-01 | 02 | 2 | NFR1/NFR2/NFR4 | T-01-SC | Exact audited packages/lockfile | CLI | `npm ls --depth=0` | yes | complete |
| 01-03 through 01-14 | 03-14 | 3-9 | Phase implementation requirements | Existing registers | State/data/map/export/UI implementation and historical gate | unit/integration/build | Existing plan commands | yes | complete |
| 01-19-01 | 19 | 10 | F1.3/F1.4/NFR5/NFR11 | T-01-54/T-01-55 | Native preset disabled state | component/static | Focused component/type/build | yes | complete |
| 01-20-01 | 20 | 10 | F5.1/F5.3/NFR4/NFR5 | T-01-56/T-01-57/T-01-58 | Connected download lifecycle | unit/build | Focused export/type/build | yes | complete |
| 01-21-01 | 21 | 11 | F1.3/F1.4/F5.1/F5.3/NFR4/NFR5/NFR11 | T-01-59/T-01-60/T-01-61 | Exact-browser no-op/download evidence | full/browser | Recorded objective evidence | external | complete |
| 01-22-01 | 22 | 12 | F1.1/F5.1/NFR1/NFR5 | T-01-63/T-01-64/T-01-65 | Traversal/equivalence/safety plus exact-commit clean gate | tdd/unit/build | Focused test, then clean `npm ci`, lint, full unfiltered tests, data, type, build | `01-22-SUMMARY.md` | pending |
| 01-15-01 | 15 | 13 | all phase requirements | T-01-38/T-01-39/T-01-40/T-01-42 | Clean exact-commit gate, one build, out-of-repo harness, immutable machine evidence | full/browser/automatic | Schema/count verification of generated evidence | JSON/log | pending |
| 01-15-02 | 15 | 13 | all phase requirements | T-01-38/T-01-40 | Human review cannot override failed raw cells | browser/human | Assert `overallPass` and both browser cells before review | external | pending |
| 01-16-01 | 16 | 14 | NFR5 | T-01-41 | Human-authorized Vercel identity | CLI/human | `npx --yes vercel@56.4.1 whoami` | external | pending |
| 01-17-01 | 17 | 15 | F5.1/NFR5 | T-01-47/T-01-48 | Production root/data/browser verification | network/human | Production assertions plus checkpoint | external | pending |

---

## Manual-Only Verifications

Machine-verifiable gate, timing, cache, sample-count, path-count, interaction, stress, storage, export-file, responsive-state, console/network, and browser-cell evidence belongs to Plan 01-15 Task 1. The human does not recreate it.

| Remaining human observation | Requirement | Task 2 check |
|-----------------------------|-------------|--------------|
| Evidence provenance and raw-cell review | NFR1/NFR2/NFR5 | Verify SHA-256, exact commit, clean gate, all raw samples/metadata, and both pass cells |
| Five-country flow/onboarding clarity | NFR5/NFR6 | Complete under two minutes; dismissal persists; Show Help reopens |
| Visual hover/selection/focus/custom-error clarity | F1.2/F1.3/NFR11 | Confirm non-color cues and understandable feedback |
| 360px tooltips and 1200px modal focus | NFR7/NFR11 | Observe containment and both remount directions |
| Theme, 200% zoom, reduced motion, keyboard/live regions | NFR7/NFR11 | Observe final interactive behavior |
| Visual PNG quality | F5.1/F5.3/NFR4 | Inspect opaque map-only output after machine dimensions/pixels/download pass |
| Deferred-browser and Natural Earth record | F1.1/NFR5 | Preserve explicit unverified labels and existing approval |

---

## Validation Sign-Off

- [x] Plan 01-22 runs focused TDD feedback and then a full unfiltered authoritative gate in a clean worktree of the exact commit.
- [x] Plan 01-15 runs the same authoritative clean gate before evidence generation and builds exactly once for preview.
- [x] No executable evidence harness, browser profile, or cache artifact is retained under the repository.
- [x] The exact clean worktree/preview remains outside Git through Task 2 for same-build manual checks, then Task 2 removes it after approval or rejection.
- [x] Task 1 automatically generates immutable JSON/log evidence before Task 2 requests human approval.
- [x] Evidence includes exactly 20 map-ready and 60 interaction samples, exact versions/build/commit, cache/transfer/service-worker fields, launch/bootstrap fields, path counts, failed checks, browser cells, and overall pass.
- [x] Every map-ready sample remains <500ms and every effective interaction sample remains <100ms; no aggregation or sample replacement is allowed.
- [x] Task 2 can approve only when the immutable raw record, both browser cells, and all remaining manual UAT pass.
- [x] All prior persistence, export, accessibility, responsive, stress, offline, browser-scope, and data-approval checks remain covered.
- [x] Deferred browsers remain unverified and optional GeoJSON/html2canvas optimizations remain outside this gap.
- [x] `nyquist_compliant: true` and `wave_0_complete: true` remain set.

**Approval:** checker-blocker revision approved for planning 2026-07-22; execute Plan 01-22, then Plan 01-15 automatic evidence generation and blocking review, then deployment.
