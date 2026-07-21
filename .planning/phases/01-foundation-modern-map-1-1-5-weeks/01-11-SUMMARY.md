---
phase: 01-foundation-modern-map-1-1-5-weeks
plan: "11"
subsystem: export
tags: [html2canvas, png, canvas, blob, vitest]
requires:
  - phase: 01-02
    provides: Exact pinned html2canvas, TypeScript, ESLint, and Vitest toolchain
  - phase: 01-03
    provides: Export result contract plus fixed 540, scale-2, and 1080 dimension constants
provides:
  - Deterministic map-only HTML export frame captured at 540×540 CSS pixels and scale 2
  - Exact 1080×1080 canvas assertion before PNG encoding and download
  - Typed failure results with complete frame, anchor, Blob URL, and object URL cleanup
  - Focused tests for filename, styling, dimensions, capture, encoding, download, and cleanup paths
affects: [01-12-app-integration, 01-14-export-controls, 01-15-uat]
tech-stack:
  added: []
  patterns:
    - Clone only the live map SVG into a fixed-light offscreen HTMLElement before html2canvas capture
    - Return typed export failures while releasing every temporary browser resource in finally
    - Mock browser DOM, canvas, Blob URL, and download boundaries without adding a DOM test package
key-files:
  created:
    - src/utils/export.ts
    - src/utils/export.test.ts
  modified: []
key-decisions:
  - "Capture a 540×540 HTML frame at scale 2 and reject any canvas that is not exactly 1080×1080 before encoding."
  - "Preserve user fill attributes while stripping editor state and forcing the fixed #9CA3AF one-pixel final-output border contract."
  - "Represent expected capture and encoding failures through ExportResult so application controls can translate them to approved toast copy."
patterns-established:
  - "Export boundary: HTMLElement source → SVG-only fixed-light clone → html2canvas → dimension gate → PNG Blob → temporary object URL download."
  - "Cleanup boundary: anchor removal, object URL revocation, and export-frame removal run in nested finally blocks on success and every failure path."
requirements-completed: [F5.1, F5.3, NFR4]
duration: 8 min
completed: 2026-07-21
---

# Phase 1 Plan 11: Deterministic PNG Export Summary

**Exact opaque 1080×1080 map-only PNG export through a fixed 540px HTML frame, scale-2 html2canvas capture, typed failures, and leak-free Blob download cleanup.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-21T22:55:40Z
- **Completed:** 2026-07-21T23:04:01Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `exportMapPng(source, date)` with an offscreen fixed-light HTML frame that clones only the source SVG map and never passes an SVG directly to html2canvas.
- Captures exactly 540×540 CSS pixels at scale 2 with deterministic window dimensions and rejects any canvas other than exactly 1080×1080 before Blob encoding.
- Preserves country fills while removing editor selection, hover, and focus state and forcing the approved neutral border and white export presentation.
- Downloads through `canvas.toBlob('image/png')`, a temporary object URL, and a temporary anchor, with all temporary resources cleaned on success, capture rejection, dimension mismatch, null Blob, and download failure.
- Added seven focused tests using mocked DOM/canvas/URL boundaries without adding packages or changing test configuration.

## Verification Results

- TDD RED: `npm run test:run -- src/utils/export.test.ts` failed as required because `src/utils/export.ts` did not yet exist.
- Focused export suite: `npm run test:run -- src/utils/export.test.ts` passed; 1 file and 7 tests.
- Full unit suite: `npm run test:run` passed; 2 files and 40 tests.
- Lint: `npm run lint` passed with no errors.
- Strict application TypeScript: `npm exec tsc -- -p tsconfig.app.json --noEmit` passed.
- Exact plan verification chain passed: focused tests, lint, then strict TypeScript.

## Task Commits

TDD gates were committed atomically and in order:

1. **Task 1 RED: Specify deterministic frame, PNG, and cleanup behavior** - `3b46ce0` (test)
2. **Task 1 GREEN: Implement deterministic HTML-to-PNG export pipeline** - `8aafb4f` (feat)

No refactor commit was needed after GREEN verification.

## Files Created/Modified

- `src/utils/export.ts` - Fixed-light SVG clone, deterministic html2canvas capture, exact dimension gate, PNG Blob download, typed failures, and nested cleanup.
- `src/utils/export.test.ts` - Browser-boundary fakes and tests for filename, capture options, clone sanitization, dimensions, capture rejection, null Blob, download failure, and cleanup.

## Decisions Made

- Used the planner-selected 540×540 frame at scale 2 rather than a larger intermediate canvas and downsampling path, keeping output arithmetic explicit and deterministic.
- Kept the utility boundary as `HTMLElement` and queried/cloned its SVG map so html2canvas always receives an HTML frame and future application integration can pass the connected map wrapper ref.
- Returned discriminated `ExportResult` failures rather than throwing expected browser-operation failures, allowing later controls to map reasons to the one approved user-facing export error.
- Used lightweight fake DOM/canvas boundaries under the existing Node Vitest environment instead of adding jsdom or another dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Normalized requirement markers for SDK completion tracking**
- **Found during:** Plan closeout
- **Issue:** `F5.1` and `F5.3` used plain requirement bullets, while the installed requirements handler only marks checkbox-form entries complete.
- **Fix:** Converted only the two Plan 01-11 requirement markers to unchecked checkbox form, then used `requirements.mark-complete` to mark them complete; already-complete `NFR4` was preserved.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** The SDK reported `F5.1` and `F5.3` newly complete, `NFR4` already complete, and no missing IDs.
- **Committed in:** Plan metadata commit

**2. [Rule 3 - Blocking] Restored state frontmatter progress after closeout mutations**
- **Found during:** Plan closeout
- **Issue:** Later metric, session, and decision mutations reset the frontmatter percentage after the initial progress calculation while the rendered progress line remained 24%.
- **Fix:** Reran `state.update-progress`, corrected the persisted frontmatter percentage to match the handler's calculated 4 of 17 plans and rendered 24% progress, and normalized the singular metric label to `1 task`.
- **Files modified:** `.planning/STATE.md`
- **Verification:** Final state and roadmap both report 4 of 17 plans completed and 24% progress.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 2 auto-fixed (2 blocking closeout issues).
**Impact on plan:** Product behavior and the two-file implementation scope were unchanged; both fixes keep GSD metadata accurate and machine-readable.

## Authentication Gates

None.

## Issues Encountered

- The isolated worktree does not contain the gitignored `.planning/coding-rules/` files. The authoritative `general.md`, `export.md`, coding-rules index, and `CLAUDE.md` were read from the canonical project checkout before implementation; no authority file was changed.
- The first GREEN test run exposed that a runtime `instanceof SVGSVGElement` guard unnecessarily depended on a browser constructor in the Node test environment. The implementation retained the DOM clone type invariant without that environment-specific runtime dependency, after which all behavior tests passed.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- The later controls/application integration plan can call `exportMapPng` with the connected map wrapper and translate its typed result into the approved success or failure toast.
- Browser UAT still owns visual pixel inspection, opacity, current-fill fidelity, border appearance, and the under-three-second target on the completed map.
- No dependent plan was executed, no package or configuration changed, and no work outside the two planned product files was introduced.
- GSD current position intentionally remains Plan 01-04, the earliest incomplete plan; executing 01-11 out of sequence did not falsely advance over Plans 01-04 through 01-10.

## Self-Check: PASSED

- `src/utils/export.ts`, `src/utils/export.test.ts`, and this summary exist at their required paths.
- RED commit `3b46ce0` and GREEN commit `8aafb4f` are present in repository history in the required order.
- Focused tests, all tests, lint, strict TypeScript, and the exact plan verification chain pass.
- Stub and threat-surface scans found no blocking stubs or unplanned network, storage, authentication, file-access, or schema boundary.
- The worktree is clean after the scoped task commits; only GSD closeout metadata remains for the final commit.

---
*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Completed: 2026-07-21*
