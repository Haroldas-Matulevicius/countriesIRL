---
phase: 01-foundation-modern-map-1-1-5-weeks
plan: "20"
subsystem: export
tags: [html2canvas, chromium, png, object-url, vitest, fake-timers]
requires:
  - phase: 01-11
    provides: Deterministic 540x540 scale-2 PNG export with typed results and finally cleanup
  - phase: 01-14
    provides: Browser UAT baseline that exposed Chromium native-download cancellation
provides:
  - Connected-anchor native PNG click initiation with a bounded 100ms browser handoff
  - Truthful export success resolution only after click and asynchronous browser handoff
  - Immediate shared-finally cleanup when anchor click fails
  - Durable export coding rule synchronized with the tested browser lifecycle
  - Fake-timer regression coverage for pre-handoff liveness and exact-once cleanup
affects: [01-21-gap-verification, 01-15-browser-uat, chromium-export]
tech-stack:
  added: []
  patterns:
    - Keep a connected download anchor and object URL alive through one bounded macrotask after successful click
    - Schedule no handoff delay when click throws; use the same nested finally cleanup immediately
    - Use fake timers to prove promise settlement and resource cleanup timing
key-files:
  created:
    - .planning/coding-rules/export.md
  modified:
    - src/utils/export.ts
    - src/utils/export.test.ts
key-decisions: []
patterns-established:
  - "Truthful native download success: resolve ExportResult.ok only after a connected click succeeds and a named 100ms browser handoff completes."
  - "Unified cleanup: anchor removal, object-URL revocation, and export-frame removal remain nested in finally for both delayed success and immediate click failure."
requirements-completed: [F5.1, F5.3, NFR4, NFR5]
duration: 10 min
completed: 2026-07-22
---

# Phase 1 Plan 20: Chromium Native PNG Download Lifecycle Summary

**Connected-anchor PNG downloads now remain live through a bounded Chromium handoff before exact-once cleanup and truthful success resolution.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-22T02:06:28Z
- **Completed:** 2026-07-22T02:15:36Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added a named `DOWNLOAD_HANDOFF_DELAY_MS = 100` wait that runs only after the connected download anchor's `click()` returns successfully.
- Preserved the anchor, object URL, and export frame until the bounded handoff finishes, so callers cannot announce success while Chromium still needs those resources.
- Kept click failures typed as `encoding-failed` with no timer scheduled and immediate cleanup through the existing nested `finally` lifecycle.
- Added fake-DOM and fake-timer regression coverage proving connected click initiation, pending success before 100ms, live resources before handoff, and exact-once cleanup afterward.
- Preserved the exact 540×540 scale-2 capture, 1080×1080 dimension assertion, opaque white map-only clone, filename, blob, capture, and failure behavior.
- Corrected the durable export coding rule and retained its two-entry Last updated history while leaving all unrelated untracked authority files untouched.

## Task Commits

The TDD task was committed atomically by gate:

1. **RED: Add failing Chromium download lifecycle regression** - `1676586` (test)
2. **GREEN: Defer Chromium download cleanup through handoff and record the rule** - `dca75d0` (fix)

## Files Created/Modified

- `src/utils/export.ts` - Waits one bounded macrotask after a successful connected-anchor click before returning success and entering cleanup.
- `src/utils/export.test.ts` - Proves handoff timing, connected click state, exact-once delayed cleanup, and immediate click-failure cleanup with fake timers.
- `.planning/coding-rules/export.md` - Records the connected-anchor, bounded-handoff, and nested-finally lifecycle with updated two-entry history.

## Decisions Made

None - followed Plan 01-20 exactly, including its prescribed 100ms handoff, click-success-only wait, typed click failure, nested `finally` cleanup, exact output preservation, and three-file scope.

## Verification Results

- RED gate: `npm run test:run -- src/utils/export.test.ts` failed because the anchor and object URL were cleaned before the required browser handoff.
- GREEN and final focused gate: 6 test files passed with 43 tests, including the new fake-timer lifecycle regressions.
- `npm run lint` - passed with no ESLint errors.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` - passed with no TypeScript errors.
- `npm run build` - passed; Vite transformed 608 modules and emitted the production bundle.
- TDD commit order - passed: `1676586` precedes `dca75d0`.
- Scope check - passed: task commits contain only `src/utils/export.ts`, `src/utils/export.test.ts`, and `.planning/coding-rules/export.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking workflow] Advanced the custom gap-plan position after the generic handler could not parse it**
- **Found during:** Plan closeout
- **Issue:** `state.advance-plan` requires a `Current Plan`/`Total Plans in Phase` or `Plan: X of Y` field, while this project intentionally tracks out-of-sequence gap closures with `Next plans`.
- **Fix:** Used the supported atomic `state.patch` handler to set Plan 01-21 as the sole next plan, then removed the completed Plan 01-20 todo.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE now identifies Plan 01-21 as next and no longer lists Plan 01-20 as pending.
- **Committed in:** Plan metadata commit.

**2. [Rule 3 - Blocking workflow] Retried metric and session mutations with the installed SDK's named arguments**
- **Found during:** Plan closeout
- **Issue:** The installed `state.record-metric` and `state.record-session` handlers require named flags even though the executor workflow showed positional arguments, so the initial metric call was rejected and the first session call omitted `Stopped At`.
- **Fix:** Reissued both handlers with their installed `--phase`, `--plan`, `--duration`, `--tasks`, `--files`, `--stopped-at`, and `--resume-file` contracts.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE records Phase 01 P20 metrics and `Stopped at: Completed 01-20-PLAN.md`.
- **Committed in:** Plan metadata commit.

**3. [Rule 1 - State correctness] Restored machine-readable status and progress after SDK frontmatter drift**
- **Found during:** Plan closeout
- **Issue:** SDK resynchronization persisted frontmatter `status: verifying` and `percent: 0` while Plan 01-21 is still pending and the visible progress line correctly reported 81%.
- **Fix:** Aligned frontmatter to `status: executing`, 17 of 21 completed plans, and 81%, while retaining the body position for Plan 01-21.
- **Files modified:** `.planning/STATE.md`
- **Verification:** Frontmatter and visible state now agree that Phase 1 remains executing at 81% with Plan 01-21 next.
- **Committed in:** Plan metadata commit.

---

**Total deviations:** 3 auto-fixed (2 blocking workflow incompatibilities, 1 state-correctness bug).
**Impact on plan:** Product, test, and coding-rule scope remained exact; only required GSD closeout metadata needed correction.

## Authentication Gates

None.

## Issues Encountered

- The main checkout contains unrelated untracked Claude and planning authority files. They were preserved unchanged and never staged; this plan intentionally added only `.planning/coding-rules/export.md` from that untracked authority set.

## User Setup Required

None - no external services, credentials, environment variables, packages, or product dependencies were added.

## Known Stubs

None. The nullable cleanup handles in `src/utils/export.ts` are operational lifecycle state, not UI or data stubs.

## Next Phase Readiness

- Plan 01-21 is ready to run the complete quality gate and preflighted Chrome 150/Edge 150 native-download regression verification for the Plan 01-19 and Plan 01-20 fixes.
- The unit-level Chromium cancellation correction is complete; real browser acceptance remains intentionally owned by Plan 01-21.
- After Plan 01-21 approval, the existing Plan 01-15 browser matrix can resume, followed by Plans 01-16 and 01-17 deployment verification.

## Self-Check: PASSED

- `src/utils/export.ts`, `src/utils/export.test.ts`, `.planning/coding-rules/export.md`, and this summary exist at their required paths.
- TDD commits `1676586` and `dca75d0` are present in repository history in RED-then-GREEN order.
- The task commits contain only the planned three-file scope, with no tracked deletions.
- Unrelated untracked authority files remain preserved and unstaged.

---
*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Completed: 2026-07-22*
