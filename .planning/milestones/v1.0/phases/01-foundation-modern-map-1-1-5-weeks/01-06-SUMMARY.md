---
phase: 01-foundation-modern-map-1-1-5-weeks
plan: "06"
subsystem: ui
tags: [react, d3, svg, accessibility, keyboard-navigation, performance-api]
requires:
  - phase: 01-04
    provides: Provider-owned colors, selected-ID set, semantic selection callbacks, and interaction start marks
  - phase: 01-05
    provides: Validated stable-ID GeoJSON features and map-load start instrumentation
provides:
  - Stable keyed D3/SVG country paths with geometry isolated from color and selection updates
  - Pointer, tap, and roving-keyboard single-selection behavior with non-color selection cues
  - Country name/current-color tooltip feedback for pointer hover and keyboard focus
  - Persistent map shell covering loading, partial-warning, ready, and fatal recovery states
  - Post-paint map-ready, color-visible, undo-visible, and redo-visible performance measures
affects: [01-12-app-composition, 01-13-styling, 01-15-uat]
tech-stack:
  added: []
  patterns:
    - React-owned SVG shell with a D3-owned countries-layer subtree
    - Stable ID-keyed join separated from fill, selection, ARIA, and tabindex updates
    - Double-requestAnimationFrame visible-completion instrumentation with consumed start marks
key-files:
  created:
    - src/components/MapCanvas.tsx
    - src/components/Tooltip.tsx
    - src/components/MapWorkspace.tsx
    - src/components/FatalErrorState.tsx
  modified: []
key-decisions:
  - "Expose the connected map export source as a forwarded HTMLDivElement ref containing the live SVG, matching exportMapPng's HTMLElement boundary."
  - "Fit Mercator to a fixed west/east Europe viewport object and clip to the 1080-square canvas so full transcontinental geometries cannot reframe the preview."
  - "Keep roving focus state in the D3-owned path layer while all selection state remains provider-owned."
patterns-established:
  - "Map geometry: one stable alphabetical ID-keyed join owns path creation and namespaced events; a separate effect owns fill, stroke, selected class, ARIA, title, and tabindex."
  - "Visible timing: consume provider/load start marks only after a paint boundary and retain independent named measure entries for later UAT sampling."
requirements-completed: [F1.1, F1.2, NFR1, NFR2, NFR11]
duration: 10 min
completed: 2026-07-21
---

# Phase 1 Plan 06: Stable Accessible D3 Map Surface Summary

**Fixed-view Mercator rendering with stable keyed SVG paths, pointer and roving-keyboard selection, complete map-load states, and post-paint interaction timing.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-21T23:31:23Z
- **Completed:** 2026-07-21T23:41:00Z
- **Tasks:** 2
- **Files modified:** 4 product files plus 2 closeout files

## Accomplishments

- Rendered all 57 normalized countries as one path each through a single stable ID-keyed D3 join using a fixed Mercator viewport and 1080-square SVG contract.
- Separated geometry and event setup from color, selected-border, title, ARIA, and roving-tabindex updates so edits preserve path identity and focus.
- Added click/tap selection, explicit empty-background clearing, Arrow/Home/End navigation, Enter/Space selection, Escape clearing, and hover/focus tooltip reporting.
- Added safe loading, partial-warning, ready, and fatal recovery states while preserving the map square and `1080 × 1080 PNG preview` label.
- Completed named Performance API measures for initial readiness and color/undo/redo visible completion, consuming each start mark after use.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement stable D3 geometry, styling updates, and map keyboard navigation** - `d52f982` (feat)
2. **Task 2: Implement tooltip and complete map workspace states** - `3b4c7ad` (feat)
3. **Task 1 verification correction: Measure visible completion after paint** - `acf6b4b` (fix)

## Files Created/Modified

- `src/components/MapCanvas.tsx` - Fixed-view D3 path join, split style updates, accessible listbox/options, pointer and keyboard interactions, export-source ref, and performance measures.
- `src/components/Tooltip.tsx` - Pointer/focus tooltip with country name and normalized current color.
- `src/components/MapWorkspace.tsx` - Persistent square preview shell for loading, warning, ready, tooltip, and fatal states.
- `src/components/FatalErrorState.tsx` - Exact safe recovery heading, body, and semantic `Reload Map` action.
- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/deferred-items.md` - Records the pre-existing deterministic GeoJSON check mismatch for its owning data scope.

## Decisions Made

- Forwarded the map's containing `HTMLDivElement` rather than the raw SVG so Plan 01-12 can pass one connected source directly to the existing `exportMapPng(HTMLElement)` contract and can focus the active country through the same subtree.
- Used a fixed `[-25, 34]` through `[45, 72]` Europe view object for `geoMercator().fitExtent(...)`, then clipped output to the 1080-square viewport. This preserves full source geometries while preventing Russia or other transcontinental extents from shrinking the intended Europe composition.
- Kept transient roving-focus identity in a ref local to the D3-owned layer; provider selection remains the only creator selection state.
- Used D3 `.text()` for titles and attribute setters for labels, never HTML sinks, at the normalized-data-to-DOM trust boundary.

## Verification Results

- `npm run lint` - passed.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` - passed under strict TypeScript.
- `npm run test:run` - passed: 5 files, 79 tests.
- Projection probe - 57 features, 57 unique IDs, 57 non-empty paths; geometry generated in 104.08 ms, below the 500 ms target.
- Static acceptance scan - exactly one `.data(...).join(...)`, no `selectAll('*').remove()`, geometry dependencies exclude colors/selection, style dependencies include both, namespaced handlers have symmetric cleanup, and all four named completion measures are present.
- Exact Plan 01-06 verification commands passed after both tasks and after the post-paint timing correction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Deferred performance measures through an actual paint boundary**
- **Found during:** Overall verification after Task 2
- **Issue:** A single `requestAnimationFrame` scheduled from an effect can run before the next browser paint, so the initial implementation did not strictly guarantee that `map-ready` and interaction-visible measures represented painted output.
- **Fix:** Added a cancellable double-animation-frame helper and used it for map-ready, color-visible, undo-visible, and redo-visible completion.
- **Files modified:** `src/components/MapCanvas.tsx`
- **Verification:** Lint, strict TypeScript, and all 79 tests pass; both frames are canceled during Strict Mode cleanup.
- **Committed in:** `acf6b4b`

**2. [Rule 3 - Blocking] Corrected SDK progress frontmatter drift during closeout**
- **Found during:** Plan metadata verification
- **Issue:** `state.update-progress` correctly calculated 8 of 17 plans and rendered 47% in the STATE body, but persisted `percent: 0` in YAML frontmatter.
- **Fix:** Aligned the machine-readable frontmatter percentage to 47 after all SDK state mutations completed.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE frontmatter and rendered progress now both report 8 of 17 plans and 47%.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking closeout issue).
**Impact on plan:** The fixes strengthen the visible-performance contract and keep GSD metadata internally consistent without expanding product scope.

## Authentication Gates

None.

## Issues Encountered

- The authoritative `CLAUDE.md` and `.planning/coding-rules/*.md` files are intentionally absent from the isolated worktree, so they were loaded read-only from the canonical main checkout and applied without modifying out-of-worktree files.
- Context7 MCP and CLI were unavailable. The locked research file already contained official D3 v7 projection, path, join, and event references, so no package or API assumption was introduced from training knowledge alone.
- An extra `node scripts/prepareGeoData.mjs --check` probe found a pre-existing data-asset mismatch. Plan 01-06 did not change the asset or script; the issue is recorded in `deferred-items.md` and does not affect the required lint, type, test, or 57-path projection checks.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. The plan adds only the documented normalized-feature-to-SVG and pointer/keyboard-to-selection boundaries. Labels use text/attribute setters, events are namespaced and cleaned up, and selection has border, focus, title, and ARIA cues.

## Next Phase Readiness

- Plan 01-12 can compose `MapWorkspace`, pass provider state/actions, attach one HTML export-source ref, and provide reload behavior.
- Plan 01-13 can style the established map, tooltip, skeleton, warning, focus, hover, selected, and fatal-state class contracts without changing D3 ownership.
- Plan 01-15 retains browser UAT for path count stability, keyboard flow, tooltip placement, visual viewport acceptance, rapid interactions, and multi-sample timing collection.
- No dependent plans were executed.

## Self-Check: PASSED

- All four scoped product files, the plan summary, and the deferred-item record exist in the isolated worktree.
- Task commits `d52f982`, `3b4c7ad`, and `acf6b4b` are present in repository history.
- Lint, strict TypeScript, all 79 tests, static acceptance checks, and the 57-path projection probe pass.
- No tracked files were deleted and no generated or unrelated product files remain untracked.

---
*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Completed: 2026-07-21*
