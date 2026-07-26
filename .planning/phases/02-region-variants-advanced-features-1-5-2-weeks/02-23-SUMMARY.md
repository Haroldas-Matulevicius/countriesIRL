---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "23"
subsystem: composition-root
tags: [app, composition-root, camera-handle, legend-containment, transactions, e2e]
status: complete
completed: 2026-07-25
requires: ["02-22", "02-29", "02-30"]
provides:
  - "Executable guards for the composition root's wiring: one shared handle accessor, no camera controller in App, legend inside the canonical SVG, one responsive DOM"
  - "Integrated Chrome transaction evidence (tests/e2e/transactions.spec.ts)"
  - "Shared E2E support modules for the historical browser fixture and the app/camera harness"
affects: [src/App.test.tsx, tests/e2e]
tech_stack:
  added: []
  patterns:
    - "Composition-root unit tests render static markup with mocked hooks and assert what App hands down plus what the composed DOM contains"
    - "Shared browser fixtures live in tests/e2e/support/, which Playwright's testMatch does not pick up"
key_files:
  created:
    - tests/e2e/transactions.spec.ts
    - tests/e2e/support/appHarness.ts
    - tests/e2e/support/historicalFixture.ts
  modified:
    - src/App.test.tsx
    - tests/e2e/phase2-composition.spec.ts
    - .planning/coding-rules/frontend.md
decisions:
  - "src/App.tsx and src/main.tsx were NOT changed: the composition-root refactor the plan describes was already delivered by 02-29/02-30/02-22, so the plan's behavior was verified rather than re-implemented."
  - "The historical browser fixture was extracted to tests/e2e/support/ and phase2-composition.spec.ts now imports it, instead of a second copy being written into transactions.spec.ts."
  - "The shared camera/app harness is used by transactions.spec.ts only; persistence.spec.ts and phase2-composition.spec.ts keep their own local copies to avoid churning two high-value specs in this plan."
metrics:
  tasks: 2
  commits: 2
  unit_tests: "469/469 (36 files)"
  e2e: "Chrome 53/53"
---

# Phase 2 Plan 23: Composition Root Summary

The composition root was already in the shape this plan specifies; what was missing were the
guards. This plan pins App's wiring with executable assertions — one shared `MapCanvasHandle`
accessor, no camera controller in App, the legend inside the canonical SVG, one responsive DOM
— and adds the integrated Chrome transaction spec the plan names.

## What was verified vs. what was built

**Verified (already implemented, no code change):**

| Plan claim | Evidence at `HEAD` before this plan |
|---|---|
| Provider bootstrap in `main.tsx` | `MapStateProvider` → `CompositionStateProvider` → `App`, inside the `main.tsx` `ErrorBoundary` (`src/main.tsx:26-36`) |
| App delegates the three transactions | `useCompositionSaveTransaction` / `useCompositionLoadTransaction` / `useCompositionExportTransaction` called with accessors only (`src/App.tsx:432-452`, `759-765`) |
| One callback-ref-bound handle, no `useCameraController` in App | `bindMapCanvasHandle` / `getMapCanvasHandle` (`src/App.tsx:360-369`); no controller import anywhere in `App.tsx` |
| Legend through `MapWorkspace`'s typed `legendSlot` | `legendSlot` built from provider legend + effective-scene colors and passed to `MapWorkspace` (`src/App.tsx:829-836`, `884-885`) |
| One responsive workspace, state above the branch | keyed `mapWorkspace` / `inspectorShell` siblings (`src/App.tsx:961-970`); `useInspectorUiState`, `compositionName`, `savedColorsBaseline` held in App |
| One Reset View, three navigation actions | `CompositionBar` owns Reset View; `MapNavigation` exposes Zoom In / Zoom Out / Move Map |

`src/App.tsx` and `src/main.tsx` are **byte-identical** to their pre-plan state. Inventing a
refactor here would have been churn on the highest-risk file in the phase.

**Built:**

### Task 1 — composition-root guards (`e33ce55`)

`src/App.test.tsx` grew from 3 to 9 cases. Rendering is `renderToStaticMarkup` (Vitest runs on
the `node` environment); `useGeoData` and the three transaction hooks are mocked so the
assertions are about App's wiring only.

- **One handle accessor, asserted by identity.** `loadDeps.getMapCanvasHandle` and
  `exportOptions.getMapCanvasHandle` must be the *same function object* as
  `saveDeps.getMapCanvasHandle`. Three separate accessors would mean three private handles.
  The accessor returns `null` before any canvas binds, rather than inventing a controller.
- **Delegation shape.** Each hook receives accessors and commit callbacks
  (`getColors`, `getComposition`, `captureRollbackState`, `rollback`, `resolveScene`,
  `getLegendBlocker`, `getCompositionName`, `commitCamera`) — App hands down, it does not
  re-implement. `getCompositionName()` is `undefined` until a save or load commits identity.
- **Legend containment.** Exactly one `class="map-canvas"`, exactly one `data-layer="legend"`,
  and the legend index falls between `data-layer="camera"` and that SVG's `</svg>`.
- **One responsive DOM** at both layouts, plus the landmark count
  (`Map creator workspace` ×1; `Map inspector` ×1 desktop / ×0 compact) and the compact
  section order.
- **No camera controller in App** — a source-level guard, because the defect is an import.

### Task 2 — integrated Chrome transactions (`7603c33`)

`tests/e2e/transactions.spec.ts`, three tests against the real app at `/`:

1. **`every camera callback reaches the one bound handle across the 1200px remount`** —
   sentinel stamped once, then: one SVG / one camera group / sentinel intact at **both** sides
   of 1200px; the camera survives each crossing *exactly* (`toEqual`); Reset View, Locate, and
   Pan each move the visible transform **after** a crossing; `svg.__zoom` stays synchronized
   with the painted matrix throughout. Also pins one Reset View and exactly three navigation
   buttons.
2. **`every export refusal class releases the camera lease in one session`** — `legend-blocked`
   → `invalid-composition` → `export-failed` → success, in one continuous session, with a
   camera-input check between every step. The three refusal classes were each proven
   individually by `02-30`/Wave-6; this is the first test that proves the lease is not stuck
   *after a sequence* of them. Asserts no download on any refusal, the layout refusal never
   says "Refresh the page" and offers no retry, and the successful export still downloads.
3. **`a historical entity keeps its color through undo, redo, a remount, and a reload`** —
   approved-fixture historical scene: color → undo (color and legend label revert; **the
   selection is untouched**, which is only true because history stores colors and never
   selection) → redo → save → 1200px round trip → reset → load. Ends by confirming France is
   still in the 195-core browser and **disabled**, not filtered out.

Supporting extraction: `tests/e2e/support/historicalFixture.ts` (the 1700 asset, manifest, and
saved record) and `tests/e2e/support/appHarness.ts` (`waitForApp`, camera transform readers,
`waitForSettledCamera`, sentinel helpers). `phase2-composition.spec.ts` now imports the fixture
instead of declaring it — a pure move, **no assertion in that file was touched**.

## Proven RED

Passing-on-first-write assertions are worth nothing, so two were forced to fail:

1. **Legend containment (unit).** `App.tsx` was temporarily patched to drop `legendSlot` and
   render `<LegendOverlay/>` inside a sibling `<svg>` — the exact regression the review warned
   this plan could introduce. `expect(legendIndex).toBeLessThan(svgEnd)` failed
   (`expected 2058 to be less than 1993`). Reverted; green.
2. **Handle binding (Chrome).** `bindMapCanvasHandle` was temporarily patched to drop the
   handle after binding. Test 1 failed at the post-Zoom-In transform assertion. Reverted;
   green. `git status` confirmed `src/App.tsx` clean after each probe.

## Live invariants — re-checked

1. **Selection never reaches a country outside the active scene.** No state was relocated, so
   nothing moved into or out of the history snapshot. Re-verified positively: the new
   historical test asserts the selection announcement is unchanged across undo, and that a
   France row in a France-less scene is disabled and unusable.
2. **No raw `legend.position` read.** No render or export path was touched.
3. **One `MapCanvasHandle` / one `svg.map-canvas` across 1200px.** Now asserted at **both**
   sides of the transition in the new spec (`expectOneCameraOwner` = one SVG + one camera group
   + sentinel intact), in addition to the existing coverage.
4. **CountryList/Locate keep the modern 195-core catalog**, disabled not removed — asserted in
   test 3.
5. **Period selector unchanged**; the historical scene is reached only through a Playwright
   route, never from `public/data`. No promotion.
6. **Legend opacity unchanged.**
7. **PNG contract unchanged** — the successful export in test 2 still asserts
   `PNG downloaded at 1080 × 1080.`
8. **`CameraFreezeLease`** — strengthened, not weakened: test 2 renews camera input after every
   refusal class in one session.
9. **Accessibility landmarks — nothing was moved or removed.** No `role` or `aria-*` changed
   anywhere. The new unit tests *add* landmark-count assertions
   (`Map creator workspace`, `Map inspector`).
10. **Nested confirmations** untouched.
11. **No export message says "Refresh the page"** — re-asserted in test 2.

## Deviations from Plan

**1. [Rule 3 - Blocking] `src/App.tsx` / `src/main.tsx` were not modified.**
- **Found during:** Task 1, before writing any code.
- **Issue:** every behavioral clause in Task 1 was already implemented by `02-29`, `02-30`, and
  `02-22`. The plan's `files_modified` lists both files.
- **Resolution:** verified each clause against `HEAD` (table above) and built the missing
  *guards* instead of manufacturing a refactor. Rewriting a working composition root to match a
  plan's file list is exactly the churn the phase's review process exists to prevent.

**2. [Rule 3 - Blocking] `tests/e2e/phase2-composition.spec.ts` was modified although the plan
does not list it.**
- **Found during:** Task 2.
- **Issue:** test 3 needs the same historical fixture that spec declares privately (~110 lines).
  Copying it would create two hand-maintained copies of one snapshot asset that can drift apart
  while both specs stay green.
- **Resolution:** extracted to `tests/e2e/support/historicalFixture.ts`; the spec now imports
  it. Mechanical move only — no assertion, selector, or expectation in that file was altered.
  Full Chrome suite re-run green afterwards, including all four tests that use the fixture.

## Known flake (not chased, not weakened)

`src/utils/historicalPreparationCli.test.ts` failed 4 cases on one run and passed on the
immediate re-run (36/36 files, 469/469). This is the tracked flake, and a read-only investigator
was running the suite concurrently. No assertion was touched.

## Deferred / not covered

- **Save during an active wheel gesture in the real app** is still fixture-only
  (`persistence.spec.ts`). d3's gesture-idle delay is shorter than the time a real dialog
  interaction takes, so a real-app version could not be made deterministic without a sleep. The
  fixture proves the live-camera read; the real app proves the ordering.
- The shared harness in `tests/e2e/support/appHarness.ts` is used by `transactions.spec.ts`
  only. `persistence.spec.ts` and `phase2-composition.spec.ts` keep their local copies —
  deliberate, to keep this plan's diff off two high-value specs. `02-24`/`02-27` should adopt
  the harness.

## Verification

- `npx tsc -b` — clean
- `npm run lint` — clean, zero warnings
- `npx vitest run` — **469/469** (36 files)
- `npx playwright test --project=chrome` — **53/53**
- `npm run build` — clean (pre-existing >500 kB chunk advisory only)

Edge was not re-run; nothing browser-specific changed and the last Edge run was at `02-21`.

## Self-Check: PASSED

- `src/App.test.tsx` — FOUND
- `tests/e2e/transactions.spec.ts` — FOUND
- `tests/e2e/support/appHarness.ts` — FOUND
- `tests/e2e/support/historicalFixture.ts` — FOUND
- commit `e33ce55` — FOUND
- commit `7603c33` — FOUND
- `src/App.tsx` unmodified vs. pre-plan `HEAD` — CONFIRMED (`git diff` empty)
