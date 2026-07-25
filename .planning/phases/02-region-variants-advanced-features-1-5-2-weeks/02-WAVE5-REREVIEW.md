---
review: Wave 5 integration-review remediation — independent re-review
range: 8f1968bd0b7bf62c1e0b2eefdf1e0f8fe9ca3d6e..fcd79dffbde9f5e292ee0a318243aa1dccc920d9
baseline_for_safety_checks: b910875e65d91cc3113137f6f57610ca1e26874a
reviewed: 2026-07-25
reviewer: independent re-reviewer (did not author the code or the original review)
depth: deep (read-only; blobs read at fcd79df via `git show`, no tests executed)
files_reviewed: 27
findings:
  critical: 0
  high: 1
  medium: 4
  low: 7
  total: 12
status: issues_found
verdict: REJECT
---

# Wave 5 Remediation — Independent Re-Review

Every statement below was taken from the bytes at `fcd79df` (`git show fcd79df:<path>`), not from
the working tree — the primary checkout `HEAD` (`0f473fa`) is a **divergent lineage** that does not
contain this stack, so reading files in place would have reviewed the wrong code.

## 1. Hard safety checks — all PASS

| Check | Result |
|---|---|
| `git diff --name-status b910875..fcd79df -- public/data data` | **empty**. PASS |
| `git diff --name-status 8f1968b..fcd79df -- package.json package-lock.json vite.config.ts tsconfig*.json` | **empty**. PASS |
| Historical geometry / source approval / factual approval / catalog entry | PASS — no `sources/`, `public/data/snapshots/`, or manifest byte touched. Historical GeoJSON still exists only as an in-memory Playwright route fixture. |
| Modern 195-core boundary for CountryList and Locate | PASS — `App.tsx:715,720` still feed `geoData.countryMetadata` to both; `CountryList` **does not filter** the catalog (`CountryList.tsx:102-105`, `211`), it only disables out-of-scene rows. Plan 02-09 satisfied. |
| `.planning` edits | PASS — one file, `02-WAVE5-WIRING-CORRECTION-CHECKPOINT.md`, `46 insertions(+), 0 deletions(-)` (pure append). No STATE/ROADMAP/HANDOFF/`.continue-here`/downstream SUMMARY. |
| New network/eval/secret/storage sink in the delta | PASS — the only match for `eval(|innerHTML|fetch(|localStorage|process.env` on added lines is `page.evaluate(... localStorage.removeItem ...)` in the E2E spec. |

## 2. Per-finding disposition

| Finding | Verdict | Evidence |
|---|---|---|
| **H-1** gate always clearable | **Partly fixed** — (a) yes, (c) yes, **(b) no**. See HI-1. | `App.tsx:245-259,587-590`; `legend.ts:502-525`; `LegendEditor.tsx:127-142,207-212` |
| **H-2** browser/scene coherence | **Fixed.** Catalog unfiltered (all 195 rows still rendered and searchable); `validCountryIds` now intersected with the scene so direct toggles are rejected (`CountryList.tsx:115-123,151-160`); `Select Visible` uses `selectableVisibleCountryIds` (`:147-149`); rows outside the scene are `disabled` with a visible + `title` hint (`:219-243`). ColorPicker is unchanged but is no longer reachable with a stale id — see LO-2. | |
| **H-3** inspector shell restored, no remount | **Fixed.** `App.tsx:730-744` renders `<aside key="inspector" className="workspace__control-column" aria-label="Map inspector">` as a **keyed sibling** of `<div key="map">`; `App.css:130-145` is a byte-faithful restoration of the baseline rule at `b910875:src/styles/App.css:130-140` (`max-height: calc(100dvh - var(--space-3xl)); overflow-y:auto; overscroll-behavior:contain`), plus `.workspace__legend` added to the `min-width:0` group. `map` keeps its key across the 1200px switch, so the SVG fiber is reused (the pre-existing `data-camera-owner-sentinel` assertion proves it). Desktop DOM order is map-first, compact is actions-first and matches UI-SPEC §7.2 exactly. `complementary` landmark now **named** (baseline had no `aria-label`). | |
| **M-1** ErrorBoundary | **Fixed, and the two-boundary reasoning is correct.** `composeEffectiveScene` throws inside *App's own* `useMemo` (`App.tsx:187-196`); a boundary rendered *by* App cannot catch its own render throw, so the `main.tsx:28` boundary is genuinely required. The `App.tsx:771` boundary is not redundant: `MapCanvas`'s `createWrappedSceneModel`/`getSelectableSceneFeatures` throws are in a descendant and are caught there. Both render `FatalErrorState` (`role="alert"` + Reload), not a blank page. `ErrorBoundary.render()` returns `this.props.children` with **no wrapper element** (`ErrorBoundary.tsx:44`), so the `<main>` grid is unaffected and the keyed array still reconciles by key. | |
| **M-3** `features` required + null → fatal | **Fixed.** `MapWorkspace.tsx:18` prop is required and explicitly nullable; `:85-87` renders `FatalErrorState` when `geoData.status==='ready' && features===null`; the `?? geoData.features` fallback is gone; `App.tsx:203` passes `effectiveScene?.features ?? null`. | |
| **M-2** pending focus consumed on miss | **Fixed.** `App.tsx:440-457` — the early return is now only for `null`, and `setPendingLoadedFocusId(null)` runs inside the existing rAF on both paths; the rAF is cancelled on cleanup so no stray write after unmount. | |
| **M-5** duplicate warnings propagate | **Fixed.** `useSnapshotData.ts:253-266` attaches `assetWarnings`; `composition.ts:47-53` carries them; `useCompositionLoadTransaction.ts:132-140,360-366` maps a non-empty list to `{code:'composition-repaired'}`, which `SaveLoad.tsx:138-140` turns into `REPAIRED_COMPOSITION_WARNING` (code-based, deduped by `.some`, so no new sentence combination escapes the ToastRegion allowlist). | |
| **M-6** reorder allowlist | **Fixed.** `ToastRegion.tsx:64-65` — `[^\p{Cc}\p{Cf}\p{Cn}\p{Co}\p{Cs}\p{Zl}\p{Zp}]{1,32}`: bounded by length, fail-closed on control/format/separator categories. `\n` and `U+202E` spoof attempts are covered by the negative tests. No catastrophic backtracking (single bounded class, no nesting). | |
| **L-1** dead `frameId` | **Fixed.** `cancelFrame` removed from the driver interface, both call sites, and the test harness (`useCameraController.ts:35-38,121-135,242-246,297`). | |
| **L-3** lease counted before side effects | **Fixed.** `useCameraController.ts:124-148` — side effects run first inside `try`, `activeFreezeCount += 1` only after; on throw `setInputEnabled(true)` is renewed (its own failure is logged, not swallowed silently) and the error rethrown, so the camera cannot be locked with no lease holder. | |
| **L-5** `activeController` on cancel/abort | **Fixed, and better than asked.** `useCompositionLoadTransaction.ts:178-186` `releaseController(controller)` only nulls the field when it still points at *this* request, so a superseded load cannot clobber the winner's controller. Applied to all 12 exit paths. | |
| Corrected tests | **Corrected for the right reason, and strengthened.** The old assertions (`phase2-composition.spec.ts:519-530` at `8f1968b`) literally asserted `main > .workspace__map, main > .workspace__actions` → `['map','actions']`, i.e. they *encoded the flattened layout that H-3 flagged*. The replacements (`:148-198`) assert the full `main.workspace > *` class list, exactly one named `complementary`, the inspector's four children in order, computed `overscroll-behavior-y: contain`, and `svg.map-canvas` count 1 — strictly more than before. The fixtures were updated only for the changed component contracts (`locate.html` passes the new required `selectableCountryIds`; `legend.html` derives validation locally instead of via the removed `onValidationChange`) — the `legend.html` change mirrors the production wiring rather than papering over it. Not weakened. | |

## 3. Findings

### HIGH

#### HI-1 — Narrowing the export gate made an overflowing legend silently exportable
**Files:** `src/App.tsx:245-259,587-590`; `src/components/LegendEditor.tsx:127-142`;
`src/utils/legend.ts:485-490`; `src/components/LegendOverlay.tsx:121-137,286`

`legendExportBlocker` is `getLegendBlockingMessage(validation.issues)`, which returns non-null for
**only** `too-many-active-colors`, `label-does-not-fit`, and `invalid-label`. `validateLegend` also
emits `invalid-position` (`legend.ts:488`) when the legend does not fit inside the 32px safe inset of
the 1080×1080 canvas — that code is now non-blocking, and **nothing else re-clamps the position when
the legend's bounds change.** `clampLegendDragPosition` runs only during a drag
(`LegendOverlay.tsx:221`), `nudgeLegendPosition` only on a nudge, `getLegendCornerPosition` only on a
preset click; the provider's `canonicalizeLegendPosition`
(`CompositionStateProvider.tsx:215-227`) checks finiteness only. `LegendOverlay` renders the stored
coordinates literally: `transform={translate(${legend.position.x} ${legend.position.y})}`
(`LegendOverlay.tsx:286`).

Concrete, pure-UI failure scenario (all numbers from `legend.ts:14-28,318-378`):
1. Color 8 countries with 8 distinct colors → 1 legend column, `bounds.width = 24*2 + 288 = 336`,
   so `maximumX = 1080 - 32 - 336 = 712`.
2. Drag the legend to the right edge. `clampLegendDragPosition` accepts `x = 712` — valid *now*.
3. Color a 9th country a 9th color. `getLegendColumnCount(9) = 2` → `bounds.width = 24*2 + 2*288 +
   24 = 648`, so `maximumX` drops to `400`. The stored `x` stays `712`.
4. The legend now spans `712 → 1360` inside a 1080-wide viewBox: **280px of it is clipped off the
   right edge.** `isPositionValid` returns `false`, `validateActiveLegend` returns
   `ok:false, issues:[{code:'invalid-position'}]`, `getLegendBlockingMessage` returns `null`,
   `legendExportBlocker` is `null` → **Export PNG succeeds** and hands the user a 1080×1080 PNG with
   a truncated legend. The Legend editor shows nothing either (`LegendEditor.tsx:229-230` uses the
   same classifier), so no surface in the product mentions it.

The 16→17 entry step is worse: 3 columns → `width = 960` → `maximumX = 88`, so *any* legend not
parked at the far left overflows on the next color.

Before this diff the same state was blocked (whenever the Legend panel had been opened at least
once) — this is exactly the "legitimately-blocking condition became silently non-blocking" that the
narrowing had to avoid. The product's primary output is silently corrupted, with no toast, no editor
warning, and no gate.

**Fix (either, not both):**
- Re-clamp on bounds change instead of gating — e.g. in `App`, when `legendBounds` changes, dispatch
  `setLegendPosition(clampLegendPosition(compositionState.legend.position, legendBounds))` (export
  `clampLegendPosition` from `legend.ts`; for `preset !== null` recompute via
  `getLegendCornerPosition(preset, bounds)`). This keeps the gate narrow *and* makes the overflow
  unrepresentable, and needs no new user-facing message.
- Or re-add `invalid-position` to the gate **and** give it a blocking message
  (`'Move the legend back inside the export frame.'`) in `getLegendBlockingMessage` so the editor
  tells the user how to clear it. This variant is only safe after `DEFAULT_LEGEND_POSITION` is fixed
  (see §4) — otherwise every fresh session is export-blocked from boot, i.e. H-1 again.

### MEDIUM

#### ME-1 — A legend-blocked export still tells the user to refresh the page
**Files:** `src/App.tsx:252-259,577-590`

`legendExportBlocker` computes the *exact* actionable sentence (`Shorten this label so it fits in
the exported legend.` / the 30-color overflow message) and then throws it away, using it only as a
boolean; the toast is the generic `The PNG could not be created. Refresh the page and try Export
PNG again.` with a `Try Export Again` retry that re-enters the same early return. The gate is now
clearable (H-1(a) satisfied), but the instruction the product gives is wrong: refreshing does not
fix a too-long label, and because `compositionState` is in-memory only, **refreshing destroys the
user's unsaved map**. The E2E at `phase2-composition.spec.ts:823-829` asserts this misleading string
as expected behavior. Pass `legendExportBlocker` into `showError` and only offer `Try Export Again`
for non-legend failures.

#### ME-2 — Crossing 1200px now remounts the entire inspector and drops its local state
**File:** `src/App.tsx:730-751`

Desktop children are `[map, inspector]`; compact children are `[actions, map, selection-color,
countries, legend]`. `map` keeps its key at the same level so the camera owner survives (the point of
the fix), but `actions` / `selection-color` / `legend` / `countries` change **parent** (into and out
of the `<aside>`), so React unmounts and remounts those subtrees. Everything they hold locally is
lost on every resize across 1200px: the country search query (`CountryList.tsx:101`), the custom
color draft (`ColorPicker.tsx:42`), the Legend disclosure expansion, and the Locate combobox text.
Before this diff both branches were flat arrays with the same keys, so none of that was lost. A user
who searches "Ger", drags the window wider, and finds the list reset will read it as a bug. Lift the
search query / draft / expansion state into `App` (or a small context) so the shell can wrap without
owning it.

#### ME-3 — The ErrorBoundary tests never exercise React's catch path or the wiring
**File:** `src/components/ErrorBoundary.test.tsx:9-27`

The test constructs the class directly (`new ErrorBoundary({...})`), calls
`getDerivedStateFromError()` by hand, **assigns `boundary.state` manually**, and calls `render()`.
It therefore proves nothing about React actually catching a descendant throw, and no test renders a
throwing child through `react-dom`. Nothing anywhere asserts that `main.tsx` or `App.tsx` still wrap
their trees — deleting either `<ErrorBoundary>` would leave the whole suite green while restoring the
blank-page failure M-1 was filed for. Add one test that renders `<ErrorBoundary><Throws/></ErrorBoundary>`
via `@testing-library/react` and one that asserts the boundary is present in the App tree
(e.g. a duplicate-identity scene fixture reaching `role="alert"`).

#### ME-4 — Two divergent legend defaults, one of which is invalid (pre-existing, see §4)
**Files:** `src/providers/CompositionStateProvider.tsx:33-37` vs `src/utils/legend.ts:222-235`

`DEFAULT_LEGEND_POSITION = {x:0, y:0, preset:'top-right'}` and
`createDefaultLegendState().position = {x:32, y:32, preset:'top-right'}` are both live (the latter
via `useLocalStorage.ts:50` / `storage.ts`), they disagree, and both disagree with their own
`preset`. Not introduced by this delta, but this delta is what removes the only thing that used to
notice (see §4 and HI-1). Collapse to one exported constant.

### LOW

- **LO-1** `src/components/LegendEditor.test.tsx` — the file was rewritten with **CRLF** endings
  (previously LF), producing a 404-line diff for a 2-line change, and left **two stray lone `CR`
  characters** after `onStatusMessage={vi.fn()}` where the deleted `onValidationChange` line used to
  be. Harmless to `tsc`/vitest, but it hides real changes from review. I verified with
  `git diff --ignore-all-space` that the file's only substantive change is the two deletions.
  Restore LF and strip the stray CRs (or add `* text=auto eol=lf` to `.gitattributes`).
- **LO-2** `src/components/ColorPicker.tsx:64-80,89-112` — still applies colors to every `selectedIds`
  member with no scene check. The H-2 invariant now rests entirely on the two upstream gates
  (`App.tsx:517-524` and `CountryList.tsx:151-160`) plus `reconcileSelectionForScene` on load. It
  holds today only because no `setSnapshotId` caller exists in `src` — the moment the period selector
  lands (plan 02-18), a scene change without selection reconciliation reopens H-2 in full. Either
  intersect `selectedCountryIds` with the scene in `ColorPicker`, or reconcile the selection in the
  same commit as any future snapshot switch.
- **LO-3** `src/hooks/useCompositionLoadTransaction.ts:132-140` — every asset warning, of any kind or
  count, collapses into one `composition-repaired` sentence with no detail; and `assetWarnings` is
  only read on the load path, so a scene resolved outside a load would drop them again.
- **LO-4** `src/components/CountryList.tsx:225-231` — a row that is `checked` *and* becomes
  out-of-scene renders `checked + disabled`, i.e. it cannot be unchecked from the browser (only via
  `Clear Selection`). Unreachable today because selection is reconciled on load; it becomes reachable
  with LO-2.
- **LO-5** `src/main.tsx:28-34` — the outer fallback replaces the entire `.app` element, so
  `FatalErrorState` renders unstyled (none of `App.css`'s container rules apply) on the worst-case
  path.
- **LO-6** `src/types/composition.ts:47-53` — `assetWarnings?: ReadonlyArray<string>` is optional
  while every other scene field is required, forcing the `undefined || length===0` double check at
  `useCompositionLoadTransaction.ts:137`. Prefer an always-present (possibly empty) readonly array.
- **LO-7** `src/App.tsx:28-33` — `App` now imports the pure classifier `getLegendBlockingMessage`
  from a *component* module (`LegendEditor.tsx`) purely to keep the gate and the editor in sync. The
  synchronization is real and correct, but the natural home for a shared classifier is
  `utils/legend.ts` next to `validateActiveLegend`.

## 4. `DEFAULT_LEGEND_POSITION` — confirmation and correct value

**The reported bug is real, on all three claims.**

1. `src/providers/CompositionStateProvider.tsx:33-37` — `DEFAULT_LEGEND_POSITION = {x:0, y:0,
   preset:'top-right'}`, used as the initial `DEFAULT_LEGEND.position` (`:40`) and as the
   canonicalization fallback (`:217`).
2. `isPositionValid` (`src/utils/legend.ts:180-201`) requires `position.x >= LEGEND_SAFE_INSET (32)`
   and `position.y >= 32`. `0 >= 32` is false → every fresh session's legend is
   `{ok:false, issues:[{code:'invalid-position', path:'position'}]}`.
3. `LegendOverlay` (`src/components/LegendOverlay.tsx:286`) renders
   `translate(${legend.position.x} ${legend.position.y})` literally, so the legend box's top-left
   sits on the canvas origin — inside the 1080×1080 frame but **violating the documented 32px safe
   inset** on both axes, i.e. jammed into the corner and at risk in an Instagram crop. The
   disclosure summary simultaneously reads **"Top right"** (`getLegendPositionLabel(preset)`), so the
   UI describes a position the render contradicts.

It is also, historically, the most common trigger of the original H-1: pre-fix, simply *opening* the
Legend panel on a fresh map published `ok:false` (from `invalid-position` alone) to `App`, and the
export gate then stayed stuck forever. The remediation treated that symptom by narrowing the gate
rather than fixing this root cause.

**Correct default, derived from the code's own preset logic.** `getLegendCornerPosition(corner,
bounds)` (`legend.ts:382-395`) is the canonical resolver:
`x = corner.endsWith('right') ? 1080 - 32 - bounds.width : 32`,
`y = corner.startsWith('bottom') ? 1080 - 32 - bounds.height : 32`.
At boot the legend is empty, so `createLegendLayout([])` returns `{width:0, height:0}`
(`legend.ts:332-340`) and a literal `'top-right'` default would be `{x:1048, y:32}` — valid at boot
but invalid the instant the first entry appears (one column → `width 336` → `maximumX 712`). A stored
literal cannot be stable for a right/bottom preset. So:

- **Minimal, always-valid fix:** `DEFAULT_LEGEND_POSITION = {x: 32, y: 32, preset: 'top-left'}`.
  This is the only preset whose coordinates are bounds-independent (`32,32` is valid for every
  `bounds` that passes `isBoundsValid`), it matches the coordinates `createDefaultLegendState()`
  already uses, and it fixes that function's own preset/coordinate mismatch at the same time. Export
  both from one place and delete the duplicate.
- **Durable fix (recommended, and it also closes HI-1):** treat `preset !== null` as authoritative —
  resolve the render/validate position through `getLegendCornerPosition(preset, bounds)` and re-clamp
  custom (`preset === null`) positions with `clampLegendPosition` whenever `legendBounds` changes.
  Then the stored `x/y` can never drift out of the frame, whatever the default is.

**Could fixing it re-break H-1? No — it is a prerequisite, not a risk.** The export gate at
`App.tsx:587` no longer consults `invalid-position` at all, so changing the default cannot make the
gate reachable or unclearable; the change is inert with respect to H-1 as shipped. The dependency
runs the other way: if you take the second remediation option for HI-1 (re-adding `invalid-position`
to the gate), you **must** land the default fix first, or every fresh session would be export-blocked
from boot with no user action able to clear it — a strictly worse H-1 than the original. Fixing the
default alone does **not** fix HI-1 (the drag-then-add-a-color overflow is independent of the
default).

## 5. Verdict

The remediation is competent and, on eight of the eleven findings, complete and correctly reasoned:
H-2 and H-3 are properly fixed (the catalog stays the modern 195-core list while out-of-scene rows
are disabled and bulk selection is intersected; the `complementary` inspector shell is restored as a
keyed sibling with the baseline scroll rule byte-for-byte and without reintroducing the map remount),
the two-boundary ErrorBoundary argument is technically correct and both boundaries render
`FatalErrorState` with no wrapper element, `features` is required and fails closed, the pending focus
id is consumed on the miss path, asset warnings reach `REPAIRED_COMPOSITION_WARNING`, the reorder
allowlist is now length-bounded and fail-closed on control/format categories, and the camera lease,
dead `frameId`, and controller-release fixes are all real — the `releaseController` identity check is
better than the finding asked for. Every hard safety constraint holds, and the two "corrected" tests
were corrected for the right reason: they had encoded the flattened layout H-3 flagged, and their
replacements assert strictly more than the originals.

It is nonetheless not integrable as-is. The H-1 remedy narrowed the export gate to the two issue
codes `getLegendBlockingMessage` surfaces, and nothing in the codebase re-clamps the legend position
when the legend's bounds grow. Adding a ninth (or seventeenth) color to a legend the user has dragged
right therefore pushes it outside the 1080×1080 frame, and Export PNG now succeeds silently on a
clipped legend where it previously blocked — a legitimately-blocking condition that became silently
non-blocking, corrupting the product's primary output with no signal on any surface (HI-1). Land the
bounds re-clamp (which also subsumes the `DEFAULT_LEGEND_POSITION` defect confirmed in §4), then this
stack is approvable; ME-1 through ME-4 should ride along.

**INTEGRATION VERDICT: REJECT**

---

_Reviewed: 2026-07-25_
_Reviewer: independent re-reviewer (gsd-code-reviewer)_
_Depth: deep, read-only; no unit/E2E execution performed (suite results taken as reported: 32 files / 349 tests, lint/tsc/build clean, Chrome E2E 19/19)_
