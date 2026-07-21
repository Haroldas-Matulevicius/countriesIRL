---
phase: 01-foundation-modern-map-1-1-5-weeks
plan: "03"
subsystem: domain-contracts
tags: [typescript, geojson, color-validation, vitest, shared-contracts]
requires:
  - phase: 01-02
    provides: Exact React 18/Vite TypeScript, ESLint, Vitest, and @types/geojson toolchain
provides:
  - Strict stable-ID map, selection, history, GeoJSON, storage, toast, and export contracts
  - Locked palette, map extent, history, storage, onboarding, and export constants
  - Tested color parser normalizing approved hex and rgb input to uppercase six-digit hex
  - Immutable equality helper for normalized country-ID color records
affects: [01-04-state-engine, 01-05-geojson-data, 01-06-map-rendering, 01-07-color-controls, 01-09-storage, 01-11-export]
tech-stack:
  added: []
  patterns:
    - Discriminated result unions at user-input and browser-operation boundaries
    - Stable country IDs as the only map color and selection keys
    - TDD red/green commits for pure validation utilities
key-files:
  created:
    - src/types/map.ts
    - src/types/ui.ts
    - src/constants/colors.ts
    - src/constants/config.ts
    - src/utils/colors.ts
    - src/utils/colors.test.ts
  modified: []
key-decisions:
  - "Represent the one shared map/list selection as a ReadonlySet of normalized country IDs; display names remain labels only."
  - "Represent all expected color, storage, GeoJSON, and export failures with discriminated result contracts rather than fallback values or ambiguous nulls."
  - "Keep palette definitions named and exact while storing every accepted custom color as uppercase #RRGGBB."
patterns-established:
  - "Color boundary: trim input, accept only #RGB, #RRGGBB, or bounded decimal rgb(r,g,b), then return uppercase #RRGGBB."
  - "State boundary: colors and immutable history snapshots use Readonly<Record<CountryId, string>> and selection uses one ID set."
requirements-completed: [F1.3, NFR10, NFR11]
duration: 13 min
completed: 2026-07-21
---

# Phase 1 Plan 03: Shared Domain Contracts and Color Validation Summary

**Strict stable-ID TypeScript contracts, exact map/export constants, and a 33-case color boundary that canonicalizes approved hex/RGB input without fallback mutation.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-21T22:40:06Z
- **Completed:** 2026-07-21T22:52:22Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Defined one strict contract surface for normalized GeoJSON, ID-keyed colors, immutable history, shared selection, saved maps, storage outcomes, toast messages, and export outcomes.
- Locked the exact ten-name UI palette, white/default and neutral-border colors, 50-action history, max-10 saves, storage keys, 1080 viewBox, fixed map extent, and 540-at-scale-2 export arithmetic.
- Added pure color normalization for `#RGB`, `#RRGGBB`, and decimal `rgb(r,g,b)` with explicit failures for empty, malformed, alpha, partial, and out-of-range input.
- Added 33 passing Vitest cases for case/whitespace normalization, RGB boundaries, malformed input, injection-like suffixes, and order-independent color-map equality.

## Verification Results

- `npm run test:run` — passed; 1 file and 33 tests.
- `npm run lint` — passed with ESLint 10.7.0.
- `npm exec tsc -- -p tsconfig.app.json --noEmit` — passed under strict application settings.
- `npm exec tsc -- -p tsconfig.node.json --noEmit` — passed for tooling configuration.
- `npm exec tsc -- -b --pretty false` — passed for all project references.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define domain contracts and named constants** - `954c5a7` (feat)
2. **Task 2 RED: Specify color parsing, rejection, and equality behavior** - `4f6caaa` (test)
3. **Task 2 GREEN: Implement strict color parsing and normalization** - `b515728` (feat)
4. **Task 2 verification fix: Widen preset membership set input type** - `3893bfb` (fix)

## Files Created/Modified

- `src/types/map.ts` - Stable-ID GeoFeature, color/history/selection, reducer action, GeoJSON result, and load-state contracts.
- `src/types/ui.ts` - Color result, saved-map, storage, toast/status, and export outcome contracts.
- `src/constants/colors.ts` - Exact named ten-color palette and fixed map fill/border colors.
- `src/constants/config.ts` - History, persistence, onboarding, map extent/viewBox, and export dimension constants.
- `src/utils/colors.ts` - Pure strict parser, preset detection, normalization, and immutable color-map equality.
- `src/utils/colors.test.ts` - Boundary and malformed-input coverage for the color contract.

## Decisions Made

- Used one `ReadonlySet<CountryId>` selection collection so map click and country-list bulk workflows cannot diverge.
- Used `Readonly<Record<CountryId, string>>` for colors and snapshots to make the shared immutable intent explicit while retaining simple JSON-compatible records.
- Kept parser error reasons technical and typed (`empty-input`, `invalid-format`, `channel-out-of-range`) so UI components can map all failures to the one approved accessible message without embedding UI copy in the utility.
- Defined `SET_COLORS` as one color plus a list of stable IDs, matching the locked one-intent bulk-color workflow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected literal-union inference in preset membership checking**
- **Found during:** Overall strict TypeScript verification after Task 2
- **Issue:** TypeScript inferred the preset `Set` as the exact palette literal union, while `normalizeColor` correctly returns a general string contract; `Set.has(result.value)` therefore failed strict compilation.
- **Fix:** Declared the internal membership set as `Set<string>` while preserving the exact literal-checked `COLOR_PRESETS` source.
- **Files modified:** `src/utils/colors.ts`
- **Verification:** Full tests, lint, application/tooling TypeScript checks, and project-reference build all exit 0.
- **Committed in:** `3893bfb`

**2. [Rule 3 - Blocking] Adapted closeout mutations to the installed SDK's named arguments**
- **Found during:** Plan closeout
- **Issue:** The installed SDK rejected the workflow's documented positional metric and decision arguments, reporting missing required fields even though the values were supplied.
- **Fix:** Inspected the installed handler signatures and reran metric, decision, and session mutations with their required named flags.
- **Files modified:** `.planning/STATE.md`
- **Verification:** Phase 01 Plan 03 metrics, all three decisions, and the completed-session marker are present in state.
- **Committed in:** Plan metadata commit

**3. [Rule 3 - Blocking] Normalized requirement markers and corrected progress frontmatter drift**
- **Found during:** Requirements and progress closeout
- **Issue:** The requirements handler recognizes checkbox-form entries only, and later state mutations reset frontmatter progress to zero while the rendered progress line remained 18%.
- **Fix:** Converted only F1.3, NFR10, and NFR11 to checkbox form before marking them complete, then restored frontmatter progress to 18 after all SDK mutations.
- **Files modified:** `.planning/REQUIREMENTS.md`, `.planning/STATE.md`
- **Verification:** The handler reports all three requirements marked complete; state and roadmap both report 3 of 17 plans and 18% progress.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking closeout issues).
**Impact on plan:** Runtime behavior and the six-file product scope were unchanged; the closeout fixes make planning metadata accurate and compatible with the installed SDK.

## Authentication Gates

None.

## Issues Encountered

The initial TDD RED run failed as required because `src/utils/colors.ts` did not yet exist. The GREEN implementation then passed all 33 behavior tests. The later strict project check exposed and resolved the preset-set inference issue documented above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- Wave 4 plans `01-04`, `01-05`, `01-09`, and `01-11` can now import the shared state, GeoJSON, persistence, export, and exact-constant contracts without redefining keys or dimensions.
- Color controls can safely keep invalid drafts local and dispatch only uppercase `#RRGGBB` values after `normalizeColor` succeeds.
- No package, build configuration, network endpoint, storage access, or application bootstrap was added; the plan remained within its six-file product scope.
- Unrelated untracked authority files remain preserved and unstaged.

## Self-Check: PASSED

- All six scoped implementation/test files and this summary exist at the required paths.
- Task commits `954c5a7`, `4f6caaa`, `b515728`, and `3893bfb` are present in repository history.
- Full tests, lint, strict application/tooling TypeScript checks, and project references pass.
- No generated or unrelated untracked files were staged or removed.

---
*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Completed: 2026-07-21*
