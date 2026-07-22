---
phase: 01-foundation-modern-map-1-1-5-weeks
plan: "15"
subsystem: testing
tags: [chrome-150, edge-150, functional-uat, png-export, release-acceptance]
requires:
  - phase: 01-21
    provides: User-approved installed Chrome 150/Edge 150 browser and exact-PNG evidence
  - phase: 01-22
    provides: Exact-commit 145-test, deterministic-data, strict-TypeScript, build, traversal-safety, and 57-path gate
provides:
  - User-approved current-HEAD functional PASS in installed Chrome 150 and Edge 150
  - Confirmed zero product/test/data/package/build-config drift from implementation commit 0ea5967
  - Exact 1080x1080 opaque centered map-only current-color PNG evidence from both browsers
  - D-63 release disposition keeping timing diagnostics immutable and non-blocking
  - Explicit D-61 deferred-browser and D-62 approved-Europe dispositions
  - Deployment readiness for Plan 01-16 without deployment execution
  - Preserved immutable failed timing evidence from commit c449e6e
  - Clean console, runtime, product-network, responsive, persistence, keyboard, offline, and no-crash browser cells
affects: [01-16-vercel-deployment, 01-17-production-verification, phase-2-region-variants]
tech-stack:
  added: []
  patterns:
    - Release acceptance is tied to an unchanged exact implementation tree plus independent installed-browser functional cells
    - Performance samples remain diagnostic while functional correctness, stability, and exact export output determine release readiness
key-files:
  created:
    - .planning/phases/01-foundation-modern-map-1-1-5-weeks/01-15-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "The user explicitly approved the final Plan 01-15 functional Phase 1 UAT after clean Chrome 150 and Edge 150 current-HEAD cells."
  - "D-63 remains controlling: timing values, threshold fields, timing harness completion, and CDP timing artifacts are advisory diagnostics rather than release prerequisites."
  - "Firefox, Safari, and previous-version certification remain unverified and deferred per D-61; the Natural Earth 5.1.1 Europe presentation remains approved per D-62."
patterns-established:
  - "A current-HEAD browser cell passes only when every functional sentinel, path-integrity check, exact-PNG check, and clean console/runtime/product-network condition passes."
  - "Historical failed evidence stays immutable and truthful when a later user decision changes its release disposition."
requirements-completed: [F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F5.1, F5.3, F6.1, F6.2, NFR1, NFR2, NFR4, NFR5, NFR6, NFR7, NFR10, NFR11]
duration: 22min
completed: 2026-07-22
---

# Phase 1 Plan 15: Final Functional Release Acceptance Summary

**Unchanged implementation commit `0ea5967` passed user-approved current-HEAD functional UAT in installed Chrome 150 and Edge 150 with exact 57-path integrity, complete core workflows, clean runtime behavior, and identical exact 1080×1080 map-only PNGs.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-22T15:54:47Z
- **Completed:** 2026-07-22T16:16:55Z
- **Tasks:** 2
- **Files modified:** 0 product files; 4 closeout metadata files

Timing measurements were neither collected as acceptance evidence nor used as release gates. Existing timing observations remain diagnostic and non-blocking under D-63.

## Accomplishments

- Reconciled the accepted final code-review PASS, final UI audit 24/24, Plan 01-22 exact-commit clean gate, Plan 01-21 browser/PNG approval, and comprehensive persistence/history/storage/accessibility/responsive/offline/no-crash evidence.
- Confirmed current HEAD `eb4e914cb6f726d62409908d0c627fb980498ad1` has no product, test, data, package, or build-config drift from exact verified implementation commit `0ea596732f1072ab30c9287e6e90546f7a7810d3`.
- Passed independent installed-browser cells in Chrome `150.0.7871.125` and Edge `150.0.4078.83` for title, 57 unique non-empty paths, single/bulk coloring, undo/redo/reset, save/load/delete, responsive one-workspace behavior, keyboard selection/focus, already-loaded offline continuity, and clean console/network state.
- Produced identical browser PNGs that are exactly 1080×1080, fully opaque, centered at `(539.5, 539.5)`, map-only, current-color accurate, and free of leaked black editor-selection pixels.
- Preserved `.planning/ui-reviews/01-15-production-preview-rerun/acceptance-evidence.json` and `clean-gate.log` byte-unchanged from commit `c449e6e`, retaining their failed timing history as non-blocking diagnostic evidence.
- Recorded explicit final user approval while leaving deployment and Plan 01-16 unexecuted.

## Accepted Final Evidence Inventory

| Evidence | Result | Release use |
|---|---|---|
| Final code review | PASS | Accepted implementation review |
| Final UI audit | 24/24 | Accepted visual, responsive, accessibility, state, and export review |
| Plan 01-22 exact-commit gate | PASS | 16 source files/145 tests, deterministic GeoJSON, strict TypeScript, build, traversal safety, and exact 57 paths |
| Plan 01-21 installed browsers | PASS and user-approved | Prior Chrome 150/Edge 150 behavior and exact-PNG record |
| Comprehensive functional evidence | PASS | Persistence, bounded history/stress, storage recovery, accessibility, responsive, already-loaded offline, same-origin, and no-crash coverage |
| Immutable timing evidence | Retained FAIL; non-blocking | Diagnostic history only under D-63 |
| Current-HEAD Chrome smoke | PASS | Final current-tree functional browser cell |
| Current-HEAD Edge smoke | PASS | Final current-tree functional browser cell |

## Current Implementation Identity and Drift

- **Current HEAD:** `eb4e914cb6f726d62409908d0c627fb980498ad1`
- **Exact verified implementation commit:** `0ea596732f1072ab30c9287e6e90546f7a7810d3`
- **Product/test/data/package/build-config drift:** none
- **Current working-tree changes in those paths:** none
- **Immutable timing evidence commit:** `c449e6ee65ebfa311e574ac9d697c047f3d3daa2`
- **Immutable JSON/log drift:** none

Planning and evidence-only commits after `0ea5967` do not change the accepted implementation tree.

## Current-HEAD Browser Functional Cells

| Required behavior | Chrome 150 | Edge 150 |
|---|---:|---:|
| Exact title and 57 unique non-empty labeled paths | PASS | PASS |
| Single-country selection and coloring | PASS | PASS |
| Three-country bulk selection and coloring | PASS | PASS |
| Undo, redo, reset, and undo-reset | PASS | PASS |
| Save, load with history reset, and delete | PASS | PASS |
| Desktop and exact 360px compact one-workspace layout | PASS | PASS |
| Keyboard focus, arrow navigation, Enter/Space selection, Escape clear | PASS | PASS |
| Already-loaded offline color and local-persistence continuity | PASS | PASS |
| No console warning/error from valid product data | PASS | PASS |
| No runtime exception, crash, HTTP failure, or required product-network failure | PASS | PASS |
| No runtime third-party request | PASS | PASS |
| Final path/workspace integrity remains stable | PASS | PASS |
| **Functional cell** | **PASS** | **PASS** |

The browser routes were local-direct against one production build served from current HEAD. Chrome and Edge used separate fresh profiles and independent state, storage, interaction, and download runs.

## Exact PNG Results

Both browser downloads were byte-identical:

- **Filename:** `CountriesIRL_2026-07-22.png`
- **SHA-256:** `682b99c8c37c6189bea1d0bae09199c31da2a8fad5010e620ff12f6de3bab399`
- **Dimensions:** 1080×1080
- **Format:** 8-bit RGBA
- **Alpha:** 255–255, fully opaque
- **Map bounds:** x `63–1016`, y `253–826`
- **Map center:** `(539.5, 539.5)`
- **Current blue country pixels:** 1,261 exact preset-blue pixels
- **Leaked near-black editor-selection pixels:** 0
- **White corners:** 4/4
- **UI/editor chrome:** excluded

## Browser and Map Scope Dispositions

- Chrome `150.0.7871.125`: passed.
- Edge `150.0.4078.83`: passed.
- Firefox current: `unverified — deferred by user choice per D-61`.
- Safari current: `unverified — deferred by user choice per D-61`.
- Chrome previous: `unverified — deferred by user choice per D-61`.
- Edge previous: `unverified — deferred by user choice per D-61`.
- Firefox previous: `unverified — deferred by user choice per D-61`.
- Safari previous: `unverified — deferred by user choice per D-61`.
- The Natural Earth 5.1.1 Europe presentation and documented transcontinental inclusion remain approved per D-62.
- World and North America canvas variants remain outside Phase 1 and are the highest-priority next-phase work.

## D-63 Timing Disposition

- Map-ready, color, undo, redo, export-duration, and other performance values remain advisory diagnostics.
- Threshold booleans, timing sample counts, prior external-harness timeouts, CDP timing metadata, and timing-harness completion are not release prerequisites.
- The failed historical timing record remains failed and immutable; it was not regenerated, normalized, deleted, or represented as passing.
- Functional stability, no crashes, clean console/runtime/product-network behavior, exact path integrity, responsive correctness, persistence/history behavior, accessibility/offline continuity, and exact PNG correctness remained blocking and all passed.

## Human Approval

The user supplied the exact Plan 01-15 checkpoint signal:

> approved

This explicitly approves the final functional Phase 1 UAT after both installed-browser cells passed. Approval closes local functional acceptance only; deployment was not performed by Plan 01-15.

## Task Commits

No product task commits were created. Both tasks were verification-only, and the plan explicitly required no repository browser-evidence artifact. The closeout metadata commit records this summary and planning-state updates.

## Files Created/Modified

- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/01-15-SUMMARY.md` - Accepted evidence inventory, exact implementation identity, browser cells, PNG results, approval, and release dispositions.
- `.planning/STATE.md` - Advances the project to Plan 01-16 readiness and records final local functional acceptance.
- `.planning/ROADMAP.md` - Marks Plan 01-15 complete and leaves Plan 01-16 as the next deployment-authorization step.
- `.planning/REQUIREMENTS.md` - Marks the Plan 01-15 release-acceptance requirements complete.

No product, test, package, lockfile, build configuration, script, or GeoJSON file changed.

## External Smoke Artifacts

The concise smoke artifacts were intentionally written outside the repository:

- `C:\Users\matul\AppData\Local\Temp\CountriesIRL-01-15-functional-smoke-eb4e914\aggregate-functional-smoke.json`
- `C:\Users\matul\AppData\Local\Temp\CountriesIRL-01-15-functional-smoke-eb4e914\chrome-150\functional-smoke.json`
- `C:\Users\matul\AppData\Local\Temp\CountriesIRL-01-15-functional-smoke-eb4e914\chrome-150\download\CountriesIRL_2026-07-22.png`
- `C:\Users\matul\AppData\Local\Temp\CountriesIRL-01-15-functional-smoke-eb4e914\edge-150\functional-smoke.json`
- `C:\Users\matul\AppData\Local\Temp\CountriesIRL-01-15-functional-smoke-eb4e914\edge-150\download\CountriesIRL_2026-07-22.png`

## Decisions Made

- Final Phase 1 local functional acceptance is approved from the accepted evidence chain plus clean current-HEAD Chrome 150 and Edge 150 cells.
- D-63 remains the controlling release decision: timing evidence is diagnostic and non-blocking.
- D-61 deferred-browser labels and D-62 Europe approval remain unchanged.
- Plan 01-16 is ready for its separate human deployment-authorization checkpoint, but no deployment authorization was inferred or executed here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Verification bug] Used the authoritative clean-gate artifact for the exact GeoJSON success phrase**
- **Found during:** Task 1 evidence reconciliation.
- **Issue:** The plan's sample assertion searched `01-22-SUMMARY.md` for the literal phrase `GeoJSON check passed`, while that summary describes the successful deterministic-data result without that exact text. The exact phrase is present in the authoritative clean-gate log.
- **Fix:** Verified the summary's deterministic-data claim together with the clean-gate log's exact `GeoJSON check passed: committed asset is current.` output.
- **Files modified:** none.
- **Verification:** Plan 01-22 summary, clean-gate log, committed 57-feature GeoJSON, and exact implementation identity all passed.
- **Committed in:** closeout metadata commit.

**2. [Rule 3 - Blocking environment] Replaced a stale preview process with the current-HEAD production preview**
- **Found during:** Task 2 browser environment preparation.
- **Issue:** Port 4173 was occupied by an earlier local Node preview process, so the required current-HEAD preview could not bind with `--strictPort`.
- **Fix:** Identified and stopped only the stale preview process, then started the newly built current-HEAD production preview on the same local port.
- **Files modified:** none.
- **Verification:** The current preview returned the exact title and served the build that both browser cells exercised.
- **Committed in:** closeout metadata commit.

**3. [Rule 3 - Blocking harness] Crossed the responsive breakpoint with a real browser-window resize before exact 360px emulation**
- **Found during:** Task 2 Edge responsive smoke.
- **Issue:** One Edge CDP-only device-metric change did not emit the matchMedia transition needed by the app's one-workspace responsive hook, causing a harness-only wait without a product failure.
- **Fix:** Cleared the device override, resized the installed browser window across the 1200px breakpoint, then applied the exact 360px viewport. The same final method was used independently in both browsers.
- **Files modified:** only the temporary external smoke harness; no repository or product files.
- **Verification:** Chrome and Edge each finished with one compact workspace, one map, exact 360px width, correct compact DOM order, no horizontal overflow, preserved colors, and 57 unique non-empty paths.
- **Committed in:** closeout metadata commit.

---

**Total deviations:** 3 auto-fixed (1 verification assertion, 2 blocking environment/harness issues).
**Impact on plan:** The fixes made the planned evidence and browser environment deterministic without changing product code, acceptance scope, or timing disposition.

## Authentication Gates

None.

## Issues Encountered

- The main checkout retains pre-existing unrelated untracked Claude, planning, debug, and UI-review material. It was preserved unchanged and excluded from the atomic closeout commit.
- The temporary smoke harness and downloaded PNGs remain outside the repository and do not affect product-tree identity.

## User Setup Required

None. Plan 01-16 contains the separate deployment authorization and Vercel workflow.

## Known Stubs

None. This plan created no product surface and found no release-blocking stub in the accepted implementation.

## Threat Flags

None. No endpoint, authentication path, storage schema, dependency, file-access boundary, or other product trust surface was introduced.

## Next Phase Readiness

- Plan 01-15 local functional acceptance is complete and explicitly approved.
- Plan 01-16 is now ready for its separate Vercel deployment-authorization checkpoint.
- No deployment occurred, no production URL was created or changed, and Plan 01-16 was not executed.
- Plan 01-17 remains the post-deployment production verification step.
- Firefox, Safari, and previous-version certification remain deferred rather than passed.

## Self-Check: PASSED

- `01-15-SUMMARY.md`, STATE, ROADMAP, REQUIREMENTS, aggregate smoke evidence, both per-browser JSON records, and both PNGs exist.
- Current HEAD is `eb4e914cb6f726d62409908d0c627fb980498ad1`; exact implementation commit `0ea596732f1072ab30c9287e6e90546f7a7810d3` and immutable timing commit `c449e6ee65ebfa311e574ac9d697c047f3d3daa2` exist.
- The aggregate current-HEAD smoke and both independent browser records report PASS with no failed functional checks.
- STATE reports 20/22 plans at 91% and points to Plan 01-16 readiness; ROADMAP reports 20/22 with Plan 01-15 checked; all seven Phase 1 release-acceptance items are checked.
- Product/test/data/package/build-config paths remain unchanged from `0ea5967`, and immutable timing evidence remains unchanged from `c449e6e`.
- No deployment or Plan 01-16 execution occurred.

---
*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Completed: 2026-07-22*
