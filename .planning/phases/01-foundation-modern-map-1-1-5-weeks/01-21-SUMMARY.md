---
phase: 01-foundation-modern-map-1-1-5-weeks
plan: "21"
subsystem: testing
tags: [chrome-150, edge-150, browser-acceptance, png-export, accessibility, vitest]
requires:
  - phase: 01-19
    provides: Native disabled preset semantics when no countries are selected
  - phase: 01-20
    provides: Connected-anchor Chromium PNG download lifecycle with bounded handoff
  - phase: 01-deep-review-fixes
    provides: Effective-white active state, side-effect-free no-ops, source-scoped tests, tooltip containment, and responsive focus recovery
provides:
  - Approved local-direct Chrome 150 and Edge 150 objective browser evidence at current HEAD
  - Verified active White-to-Red native-disabled semantics with no history, feedback, click, or timing residue from active-color attempts
  - Four completed, identically hashed, exact 1080x1080 opaque centered PNG downloads with clean browser consoles
  - Approved Phase 1 browser scope of local Chrome and Edge only
  - Product sequencing decision to ship Europe first, followed by World and North America variants
  - Complete automated lint, 136-test, deterministic GeoJSON, and production-build gate
  - Plan 01-15 readiness recorded after its separate planner synchronization, without executing it
affects: [01-15-browser-uat, 01-16-vercel-deployment, 01-17-production-verification, phase-2-planning, regional-variants]
tech-stack:
  added: []
  patterns:
    - Accept browser-sensitive behavior only against an exact local browser build with recorded preflight and objective artifacts
    - Keep browser acceptance evidence tied to a full Git commit and verify exported file hashes and dimensions before closeout
key-files:
  created:
    - .planning/phases/01-foundation-modern-map-1-1-5-weeks/01-21-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "The user explicitly approved the final Chrome 150 and Edge 150 objective evidence for Plan 01-21."
  - "Phase 1 browser acceptance is limited to locally installed Chrome and Edge; remote and broader browser-matrix acceptance is not required for this phase."
  - "Europe ships first, with World and North America product variants next."
patterns-established:
  - "Exact-browser evidence records route, build, local URL preflight, active/no-op state, history effects, timings, downloads, and console cleanliness."
  - "Closeout-only execution does not rerun or modify product code when approved current-HEAD evidence remains internally consistent."
requirements-completed: [F1.3, F1.4, F5.1, F5.3, NFR4, NFR5, NFR11]
duration: 2 min
completed: 2026-07-22
---

# Phase 1 Plan 21: Focused Chrome and Edge Browser Acceptance Summary

**Current-HEAD Chrome 150 and Edge 150 evidence proves native active-preset no-ops and four completed exact 1080×1080 PNG downloads, with explicit user approval for Phase 1 closeout.**

## Performance

- **Duration:** 2 min closeout; objective evidence completed earlier on 2026-07-22
- **Started:** 2026-07-22T12:41:37Z
- **Completed:** 2026-07-22T12:43:04Z
- **Tasks:** 1 checkpoint approved
- **Files modified:** 0 product files; closeout metadata only

## Accomplishments

- Recorded explicit user approval of the final objective evidence generated from full commit `805ab14fee21d1a4395969dac8f55ed45cd931d4`.
- Confirmed the isolated current-HEAD automated gate passed lint, 16 source test files with 136 tests, deterministic GeoJSON verification, and the Vite production build.
- Confirmed exact local-direct Chrome `150.0.7871.125` and Edge `150.0.4078.83` sessions loaded `http://localhost:5173/`, rendered the 57-path map, and passed every focused active-color, history, timing, export, and console check.
- Confirmed all four PNG artifacts are 1080×1080 RGBA, fully opaque, centered, identically hashed, correctly named, and completed through the native download lifecycle.
- Preserved the later user decisions that Phase 1 browser acceptance is local Chrome/Edge only and that Europe ships before World and North America variants.
- Left Plan 01-15 untouched while another planner synchronized it separately; that synchronization is now reflected in shared planning metadata but was not executed here.

## Task Commits

No product task commit was created. Task 1 was a blocking human-verification checkpoint whose objective evidence already existed at the approved product HEAD, and this execution was explicitly closeout-only.

A separate planner committed the synchronized release-scope metadata as `1e393a8` while this closeout was in progress. That planning-only commit includes the STATE/ROADMAP/REQUIREMENTS decisions and the synchronized Plan 01-15 artifacts. This Plan 01-21 closeout commit adds only the required summary because the shared metadata was already committed and no duplicate or artificial rewrite was needed.

## Files Created/Modified

- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/01-21-SUMMARY.md` - Records objective results, exact human approval, scope decisions, and next readiness.
- `.planning/STATE.md` - Records 18/21 progress, Plan 01-21 approval, local Chrome/Edge-only acceptance, Europe-first sequencing, and Plan 01-15 readiness; committed by the separate planner in `1e393a8` after incorporating this closeout's SDK state updates.
- `.planning/ROADMAP.md` - Marks Plan 01-21 complete, scopes Plan 01-15 to installed Chrome/Edge, and queues World/North America variants; committed in `1e393a8`.
- `.planning/REQUIREMENTS.md` - Retains all seven Plan 01-21 requirement IDs as complete and adds the separately planned region-variant/release-acceptance requirements; committed in `1e393a8`.

This closeout did not modify product, test, package, configuration, data, or Plan 01-15 content. The separate planner owned and committed the Plan 01-15 synchronization.

## Verification Results

### Approved evidence identity and preflight

- Evidence root: `.planning/ui-reviews/01-21-objective-evidence-20260722`
- Evidence commit: `805ab14fee21d1a4395969dac8f55ed45cd931d4`
- Evidence/product HEAD: `805ab14fee21d1a4395969dac8f55ed45cd931d4`.
- A later planning-only synchronization commit, `1e393a857306c552347ba77cef5c2bbd183cdd66`, updated REQUIREMENTS, ROADMAP, STATE, Plan 01-15, context, and validation without changing any product, test, package, build, data, or runtime file from the evidence HEAD.
- Local URL: `http://localhost:5173`
- Server preflight: HTTP 200, exact `CountriesIRL Map Generator` title present, favicon returned HTTP 200 as `image/svg+xml`, and each browser rendered 57 map paths.
- Routes: local-direct for both browsers; no tunnel, external test dependency, or product dependency was used.

### Automated gate

The recorded isolated current-HEAD command passed:

`npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build`

Results:

- ESLint: passed.
- Vitest: 16 source test files passed, 136 tests passed.
- GeoJSON determinism: `GeoJSON check passed: committed asset is current.`
- Production build: passed with Vite 8.1.5, 610 transformed modules, and emitted HTML/CSS/JavaScript assets.

The evidence generator intentionally ran this gate from a clean temporary checkout because unrelated untracked UI-review tooling in the main checkout was discoverable by repository-wide ESLint. That contamination is not product code and did not alter the verified commit.

### Chrome 150 objective results

- Exact debugger product: `Chrome/150.0.7871.125`.
- Zero selection: 10 presets present, all 10 natively disabled, no active preset, no selected map path.
- One uncolored country: White active and natively disabled; the other 9 presets enabled; effective fill `#FFFFFF`; Undo unavailable.
- Active White attempts: no click dispatch, no toast, no timing mark, no history entry, no color change.
- Red application: Red active and disabled, White enabled, fill `#DC2626`, exactly one undoable snapshot, visible color completion in 31.1ms.
- Active Red attempts: no additional click, toast, timing mark, history entry, or color change.
- Undo/redo proof: one Undo returned to effective white with no further Undo; one Redo restored Red.
- Ten-sample maximums: color 36ms, undo 23.3ms, redo 18.3ms; all under 100ms with zero residual marks.
- Downloads: two native downloads completed in 759ms and 525ms; success followed initiation; busy state recovered after each.
- Console/network: no console messages, runtime exceptions, network failures, or HTTP failures.

### Edge 150 objective results

- Exact debugger product: `Edg/150.0.4078.83`.
- Zero selection: 10 presets present, all 10 natively disabled, no active preset, no selected map path.
- One uncolored country: White active and natively disabled; the other 9 presets enabled; effective fill `#FFFFFF`; Undo unavailable.
- Active White attempts: no click dispatch, no toast, no timing mark, no history entry, no color change.
- Red application: Red active and disabled, White enabled, fill `#DC2626`, exactly one undoable snapshot, visible color completion in 20.4ms.
- Active Red attempts: no additional click, toast, timing mark, history entry, or color change.
- Undo/redo proof: one Undo returned to effective white with no further Undo; one Redo restored Red.
- Ten-sample maximums: color 25.8ms, undo 18.8ms, redo 14ms; all under 100ms with zero residual marks.
- Downloads: two native downloads completed in 775ms and 506ms; success followed initiation; busy state recovered after each.
- Console/network: no console messages, runtime exceptions, network failures, or HTTP failures.

### PNG integrity

All four completed files were named `CountriesIRL_2026-07-22.png` and independently rechecked during closeout:

- Dimensions: 1080×1080.
- Format: 8-bit RGBA PNG.
- Alpha range: 255–255; fully opaque.
- Map bounds: x 63–1016 and y 253–826 with symmetric left/right and top/bottom margins; centered.
- SHA-256 for every file: `ec68ac69201eaf043f752145ade85f962e3d11bab15c0a9332862ebf712f3061`.

## Human Approval

The exact approval recorded from the user in this conversation is:

> The user has now explicitly approved the final Chrome 150 and Edge 150 objective evidence in this conversation.

That approval satisfies Plan 01-21's blocking `resume-signal: approved` checkpoint after both exact-browser routes and all focused objective checks passed.

## Decisions Made

- **Phase 1 browser acceptance is local Chrome/Edge only.** This later explicit user decision replaces any remaining Phase 1 expectation for remote BrowserStack, Safari, Firefox, or current/previous matrix acceptance. Plan 01-15 was synchronized separately by another planner and was not executed or edited here.
- **Europe ships first.** World and North America are the next regional product variants after the Europe release.
- **Approved evidence is sufficient for closeout.** No product rerun or product-code modification was needed because the evidence commit matched current HEAD and the aggregate evidence, per-browser records, PNG hashes, dimensions, and completion states remained internally consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking workflow] Advanced the custom gap-plan position with an atomic state patch**
- **Found during:** Plan closeout.
- **Issue:** `state.advance-plan` could not parse this project's out-of-sequence `Next plans` position field.
- **Fix:** Used the registered atomic `state.patch` handler to move the next position to Plan 01-15 and record Plan 01-21 approval without editing STATE.md directly.
- **Files modified:** `.planning/STATE.md`.
- **Verification:** STATE identifies Plan 01-15 as next and records Plan 01-21 as approved.
- **Committed in:** Plan metadata commit.

**2. [Rule 1 - State correctness] Restored machine-readable progress after later SDK mutations**
- **Found during:** Plan closeout.
- **Issue:** Decision/session mutations preserved the visible 86% progress line but temporarily resynchronized frontmatter `percent` to `0`.
- **Fix:** Ran `state.update-progress` as the final STATE mutation so frontmatter and visible progress both report 18 of 21 plans, 86%.
- **Files modified:** `.planning/STATE.md`.
- **Verification:** Final STATE progress is 18/21 and 86% in both representations.
- **Committed in:** Plan metadata commit.

---

**Total deviations:** 2 auto-fixed (1 blocking workflow compatibility issue, 1 state-correctness issue).
**Impact on plan:** Closeout metadata was corrected without rerunning or modifying product code and without executing Plan 01-15.

## Authentication Gates

None.

## Issues Encountered

- The main checkout contains pre-existing unrelated untracked Claude/planning/evidence files. They were preserved unchanged and excluded from the atomic closeout commit.
- The recorded evidence notes that repository-wide lint in the contaminated main checkout encountered an untracked UI-review script. The authoritative gate passed from an isolated checkout of the exact evidence commit, so this did not invalidate source-scoped tests or current-HEAD product verification.
- A separate planner synchronized Plan 01-15, validation, context, and requirements concurrently. Its Plan 01-15-owned files remain unstaged and uncommitted by this closeout; only the shared STATE/ROADMAP results relevant to the user's explicit decisions are included.

## User Setup Required

None. Both accepted browsers were exact local installations and required no BrowserStack account, tunnel, credential, package, or product configuration.

## Known Stubs

None. This closeout created no product surface and the approved objective evidence exercises the implemented active-color and export paths.

## Threat Flags

None. No endpoint, authentication path, file-access behavior, dependency, schema, or trust-boundary surface was introduced during closeout.

## Next Phase Readiness

- Plan 01-21 is complete and no focused Chrome 150/Edge 150 regression blocker remains.
- Plan 01-15 is now synchronized by its separate planner for the user's local Chrome/Edge-only acceptance decision and is the next Phase 1 plan. It was not executed during this closeout.
- Plan 01-15 may now proceed as a separate execution; after its acceptance closes, Plans 01-16 and 01-17 remain the deployment and production-verification sequence.
- Europe remains the first shipping variant; World and North America should be planned as the next regional variants without delaying Europe closeout.

## Self-Check: PASSED

- The required `01-21-SUMMARY.md` exists at the planned path.
- Evidence commit `805ab14fee21d1a4395969dac8f55ed45cd931d4` exists and matched current HEAD before closeout metadata.
- Aggregate and per-browser evidence passed for exact local Chrome 150 and Edge 150; all four PNGs independently rehashed to the recorded SHA-256 and report 1080×1080 dimensions.
- STATE records 18 of 21 plans at 86%, the exact Plan 01-21 approval, the local Chrome/Edge-only decision, the Europe-first regional sequence, and synchronized Plan 01-15 readiness.
- ROADMAP records 18/21 plans, marks Plan 01-21 complete, and scopes the next acceptance to installed Chrome 150 and Edge 150.
- Planning-only commit `1e393a8` contains the synchronized STATE, ROADMAP, REQUIREMENTS, Plan 01-15, context, and validation updates; the Plan 01-21 closeout commit stages only this summary.
- `git diff 805ab14..1e393a8` contains no product, test, package, build, data, or runtime file, so the approved browser evidence remains tied to an unchanged product tree.
- No tracked product file was modified or deleted by this closeout.

---
*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Completed: 2026-07-22*
