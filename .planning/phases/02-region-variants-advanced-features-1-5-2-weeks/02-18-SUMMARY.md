---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "18"
subsystem: composition-bar-and-scene-switching
tags: [react, typescript, d3, accessibility, historical-snapshots, playwright]

requires:
  - phase: 02-07
    provides: sole MapCanvasHandle with camera read, reset, restore, and focus operations
  - phase: 02-11
    provides: validated snapshot manifest and production-selectable review gating
  - phase: 02-12
    provides: effective-scene composition, modern fallback, and selection reconciliation
  - phase: 02-17
    provides: Modern-only production catalog with no unapproved historical asset
provides:
  - catalog-driven period selector and sole Reset View owner (CompositionBar)
  - exact world loading, fatal recovery, and period status copy
  - accessible 160ms scene crossfade with synchronous export finalization
  - selection reconciliation bound to every period switch
  - focused Chrome/Edge history slice with advisory NFR3 warm-switch samples
affects: [02-20, 02-21, 02-22, 02-26, App composition, export transaction]

tech-stack:
  added: []
  patterns:
    - the live catalog decides which periods exist; constants decide the words the creator reads
    - a scene commit and its selection reconciliation are one step, never two
    - the outgoing crossfade scene is stripped of role, name, focus, hit area, and country identity
    - period announcements pass through the existing fail-closed toast allowlist

key-files:
  created:
    - src/components/CompositionBar.tsx
    - src/utils/periods.ts
    - src/utils/periods.test.ts
    - src/hooks/useSnapshotCatalog.ts
    - tests/e2e/history.spec.ts
    - tests/e2e/fixtures/history.html
  modified:
    - src/App.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapCanvas.tsx
    - src/components/FatalErrorState.tsx
    - src/components/Tooltip.tsx
    - src/components/ColorPicker.tsx
    - src/components/ToastRegion.tsx
    - src/types/composition.ts
    - src/styles/MapCanvas.css

key-decisions:
  - "The selector is driven by the live manifest but labelled from SNAPSHOT_CATALOG, so an approved entry appears with no component change while manifest text can never reach the UI."
  - "commitScene() sets the scene, the snapshot id, and the reconciled selection together, closing re-review finding LO-2 before the first setSnapshot caller shipped."
  - "MapCanvas clones the outgoing countries layer into an inert host group instead of rendering a second scene component, so exactly one MapCanvasHandle, one svg.map-canvas, and one listbox survive a switch."
  - "finalizeSelectedScene() is synchronous and runs inside the export freeze, so a crossfade in flight can never be captured."

patterns-established:
  - "Period switch: catalog option -> abortable scene resolve -> commitScene (scene + snapshot + reconciled selection) -> approved announcement; failure keeps the prior scene and the prior selected option."
  - "Crossfade: clone-outgoing -> makeOutgoingSceneInert -> fade both groups for resolveCrossfadeDuration(prefersReducedMotion) -> remove outgoing."

requirements-completed: [F1.2, F1.3, F1.5, F2.1, F2.2, F2.3, F2.4, F2.5, F5.2, NFR3, NFR8, NFR9, NFR11]

duration: 39 min
completed: 2026-07-25
---

# Phase 2 Plan 18: World Period Selector and Accessible Scene Switching Summary

**A catalog-driven composition bar now owns the period selector and the only Reset View control, world loading/fatal copy is truthful for a world app, and every period switch crossfades into a single accessible scene while reconciling the selection in the same commit.**

## Outcome

Under the 2026-07-25 descope the live catalog holds exactly one entry, so the shipped
selector renders exactly `Modern — current borders` and none of the four deferred snapshots.
The selector is nonetheless catalog-driven: a unit test builds a five-entry catalog fixture and
the same component renders all five approved labels in canonical order, and the Chrome/Edge
suite drives a full 1700 switch through an in-memory `page.route` fixture. No historical
geometry, source approval, factual approval, or catalog entry was added.

## Performance

- **Duration:** 39 min
- **Tasks:** 3 completed, one commit each
- **Files:** 6 created, 9 product files modified (plus 8 test/fixture files)

## Accomplishments

- Built `CompositionBar`: the preview label, the native `Map period` select, the sole
  `Reset View` control, and a persistent status line with an inline `Try Period Again` action.
  It fetches nothing and owns no camera.
- Replaced the stale Phase 1 copy `We couldn't load the Europe map` / `Loading Europe map…`
  with the exact world copy, and gave the map its period-aware label
  `Interactive world map, {period label}`.
- Added `useSnapshotCatalog`, which reads the live manifest once and falls back to Modern-only
  when the catalog cannot be read, and `utils/periods.ts`, the single home for period copy,
  option resolution, and boundary lines.
- Wired the first `setSnapshot` caller in `src`, with reconciliation attached to it.
- Added the accessible crossfade: the incoming scene is the only scene carrying `role`,
  accessible name, focusability, pointer events, or `data-country-id`; the outgoing clone is
  `aria-hidden`, inert, and removed on completion. Reduced motion swaps immediately.
- Extended `MapCanvasHandle` with `finalizeSelectedScene()` and called it inside the export
  freeze, so an export during a crossfade captures the selected scene at full opacity.
- Added the third tooltip line: `Modern boundary`, `Historical boundary · {period}`, and
  `Modern fallback · {period} composition`.

## Task Commits

1. **Task 1 — world period and recovery states** — `14aa77c` (`feat`)
2. **Task 2 — interactive historical scenes** — `b4d7933` (`feat`)
3. **Task 3 — warm historical switching evidence** — `8b4fbcc` (`test`)

## How the blocking selection-reconciliation requirement was satisfied

Re-review finding LO-2 held that the H-2 invariant survived only because no `setSnapshot`
caller existed. This plan introduces that caller, so reconciliation ships with it:

1. **Same commit, same function.** `App.commitScene()` (`src/App.tsx`) performs three writes
   as one step: `setActiveScene(scene)`, `setSnapshot(scene.snapshotId)`, and
   `replaceSelection([...reconcileSelectionForScene(selectedIdsRef.current, scene)])`. It is
   the only path that commits a scene, used by both the Modern and the historical branch of
   `startPeriodLoad`, and it landed in the same commit as the selector (`14aa77c`).
2. **Defence in depth in `ColorPicker`.** `selectableCountryIds` is now a required prop and the
   component intersects `selectedIds` with it before any `setColors` call, so a colour can not
   be written to an out-of-scene entity even for a single render.
3. **Explicit regression tests.**
   - E2E `drops out-of-scene selections and keeps continuing ones`: selects France and Germany
     in Modern, switches to 1700 (which replaces `FRA`), then asserts the live region reports
     `1 country selected.`, `DEU` stays `aria-selected="true"`, the France row is disabled and
     unchecked, `Apply Red` colours only Germany, and returning to Modern does **not** resurrect
     France (`aria-selected="false"`, fill `#FFFFFF`).
   - Unit `ColorPicker > ignores selected ids the active scene cannot render`.
   - Existing `reconcileSelectionForScene` unit coverage in `src/utils/scene.test.ts` is unchanged.

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS — 34 files, 381 tests (baseline 33 / 364) |
| `npm run lint` | PASS — zero warnings |
| `npm exec tsc -- -b --pretty false` | PASS |
| `npm run data:world:check` | PASS — 248 units, 195 selectable |
| `npm run build` | PASS — tsc project build + Vite bundle |
| `npm run test:e2e -- --project=chrome` | PASS — 34/34 (baseline 23 + 11 new) |
| `npm run test:e2e -- --project=msedge` | PASS — 34/34 |

Hard-constraint checks against the plan base `9c90b14`:

- `git diff --name-status 9c90b14..HEAD -- public/data data` — **empty**
- `git diff --name-status 9c90b14..HEAD -- package.json package-lock.json vite.config.ts vitest.config.ts tsconfig*.json playwright.config.ts` — **empty**
- `git diff --name-status 9c90b14..HEAD -- .planning` — **empty** before this summary; no
  STATE.md, ROADMAP.md, REQUIREMENTS.md, HANDOFF.json, or `.continue-here.md` edit.
- No new dependency, no jsdom; the suite still runs `environment: 'node'`.
- CountryList and Locate still receive the unfiltered modern 195-core catalog.
- The legend chokepoint is untouched; nothing new reads `legend.position`.

## Decisions Made

- **Labels come from constants, membership comes from the catalog.** `resolvePeriodOptions`
  admits an entry only if the live manifest carries it, `isProductionSelectableSnapshot`
  accepts it, and its id exists in `SNAPSHOT_CATALOG` — then renders the constant's label.
  A manifest label of `1700 — click here now` renders as `1700 — Post-Westphalia Europe`,
  proven by both a unit test and the E2E fixture (T-02-40).
- **The toast allowlist stays fail-closed.** `Map view reset.` and the five
  `Showing {approved label}.` sentences are added as exact strings via
  `APPROVED_PERIOD_ANNOUNCEMENTS`; a catalog-derived sentence still degrades to `Map updated.`
- **The boundary line names the snapshot id, not the full label**, because the tooltip is
  capped at 360px. A Modern scene always reports `Modern boundary` regardless of what a
  feature carries over.
- **Failure restores nothing because nothing moved.** The select is controlled by the committed
  `compositionState.snapshotId`, which is only written on success, so a failed load leaves both
  the scene and the selected option in place with no rollback code.

## Deviations from Plan

**1. [Rule 2 — missing critical functionality] New files beyond the plan's `files_modified`**
- **Found during:** Task 1
- **Issue:** The plan named `CompositionBar.tsx` but no home for the live catalog or the exact
  copy. Putting a fetch inside the bar would have violated its own contract, and inlining the
  copy would have scattered hardcoded strings against `coding-rules/general.md`.
- **Fix:** Added `src/utils/periods.ts` (+ test) as the copy/option chokepoint and
  `src/hooks/useSnapshotCatalog.ts` for the one-shot manifest read.
- **Commit:** `14aa77c`

**2. [Rule 2 — security/correctness] Period announcements added to the toast allowlist**
- **Found during:** Task 3
- **Issue:** `Map view reset.` and `Showing {period}.` were silently degraded to `Map updated.`
  by `ToastRegion`'s fail-closed guard, so the E2E caught two missing announcements.
- **Fix:** Added `APPROVED_PERIOD_ANNOUNCEMENTS` (built from approved copy only) plus a
  regression test that a catalog-supplied label still degrades.
- **Commit:** `8b4fbcc`

**3. [Rule 1 — bug] `ColorPicker.selectableCountryIds` made required, not optional**
- **Found during:** Task 2
- **Issue:** An optional prop would have left the LO-2 gap open at every call site that forgot it.
- **Fix:** Required prop, `App` passes `effectiveSelectableIds`; test call sites updated.
- **Commit:** `b4d7933`

**4. [Rule 3 — blocking] Stale assertions updated for the new copy and label**
- `ErrorBoundary.test.tsx` and `phase2-composition.spec.ts` asserted the Phase 1 Europe fatal
  copy; `phase2-composition.spec.ts` asserted the old listbox name
  `Interactive map of the world`. Both were updated to the world copy and to
  `Interactive world map, Modern — current borders`.
- `MapNavigation.test.tsx:33` and `tests/e2e/navigation.spec.ts:96` keep their
  `Reset View` count-0 assertions — those fixtures render only the navigation cluster, which
  must **not** own Reset View — but now carry comments naming `CompositionBar` as the owner and
  pointing at the positive `count 1` assertions in `history.spec.ts` and `MapWorkspace.test.tsx`.
- `tests/e2e/fixtures/camera.html` and `locate.html` pass the new `periodLabel` prop.

## Issues Encountered

- `npx tsc -b` failed in the worktree with `TS5033 … EINVAL: mkdir node_modules/.tmp`. The
  worktree's `node_modules` was a **dangling** symlink (`fs.realpathSync` threw `ENOENT`);
  module resolution actually walked up to the primary checkout's `node_modules`. Replacing the
  dead link with a real empty directory let `tsc` write its build info; resolution is unchanged
  and `node_modules` is gitignored, so no committed file was affected.
- The history fixture's Germany polygon initially overlapped the Holy Roman Empire polygon, so
  the fallback-tooltip hover was intercepted. The fixture geometry was moved apart.

## Authentication Gates

None.

## Known Stubs

None. The one intentionally deferred surface is the historical *data* itself
(`02-DESCOPE-DECISION.md`): the selector, scene composition, crossfade, fallback, tooltip, and
export path all ship and are exercised against in-memory fixtures.

## Threat Model Coverage

- **T-02-40 (EoP, tooltip/status):** All period text is rendered as React text nodes from
  approved constants. Manifest-supplied labels never reach the selector, the status line, the
  map label, the tooltip, or the live region; the toast guard degrades anything else.
- **T-02-41 (DoS, switching):** Every switch is abortable and supersedes its predecessor;
  a switch landing mid-crossfade finalizes the previous one rather than stacking scenes.
  Five warm switch samples plus a prewarm/discard sample are recorded per run.
- **T-02-42 (Spoofing, outgoing scene):** `makeOutgoingSceneInert` removes `role`,
  `aria-label`, `aria-selected`, `data-country-id`, `data-scene-unit-id`, and every `<title>`,
  sets `aria-hidden`, `focusable="false"`, `tabindex="-1"`, and `pointer-events: none`. A
  `MutationObserver` in the fixture captures the group at attach time, so the E2E asserts these
  properties without racing the 160ms fade. `finalizeSelectedScene()` removes it before export.

No new network endpoint, storage sink, eval, or secret path was introduced. The only new
network read is the existing `/data/snapshots/index.json` manifest, validated by
`validateSnapshotManifest` before use.

## NFR3 (advisory, per D-63)

Warm switches are measured from the committed `change` activation to the incoming scene being
painted with the outgoing group removed. The first switch (cold fetch) is discarded, then five
warm samples are recorded per run and attached as the `nfr3-warm-switch-samples-ms` annotation.
Per D-63 no timing threshold gates the release: the gate is that every warm switch completes
and settles with the outgoing scene removed.

## Next Phase Readiness

- Dropping an approved snapshot into `public/data/snapshots/` and the manifest surfaces it in
  the selector with **no component change** — that is the property the multi-entry catalog
  fixture and the routed E2E fixture exist to protect.
- `.planning/STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `HANDOFF.json`, and
  `.continue-here.md` were intentionally left unchanged per the execution directive.

## Self-Check: PASSED

- All six created files exist in the worktree.
- Commits `14aa77c`, `b4d7933`, and `8b4fbcc` exist on `wt-plan-02-18`, in task order.
- Every gate above was executed in the worktree and passed.
- `public/data`, `data`, dependency manifests, build/test config, and `.planning` control files
  are byte-identical to `9c90b14`.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-25*
