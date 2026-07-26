---
phase: 02-region-variants-advanced-features-1-5-2-weeks
wave: 6
plans: ["02-20", "02-21"]
reviewed: 2026-07-25
reviewer: independent non-author (gsd-code-reviewer)
range: e188827..d31d3ee -- . ':(exclude).planning'
depth: deep
files_reviewed: 14
files_reviewed_list:
  - src/App.tsx
  - src/components/SaveLoad.tsx
  - src/components/SaveLoad.test.tsx
  - src/hooks/useLocalStorage.ts
  - src/styles/Controls.css
  - src/types/ui.ts
  - src/utils/export.ts
  - src/utils/export.test.ts
  - src/utils/storage.ts
  - tests/e2e/export.spec.ts
  - tests/e2e/fixtures/export.html
  - tests/e2e/fixtures/persistence.html
  - tests/e2e/persistence.spec.ts
  - tests/e2e/phase2-composition.spec.ts
findings:
  critical: 0
  high: 1
  medium: 4
  low: 3
  total: 8
status: issues_found
verdict: APPROVE-WITH-FIXES
---

# Wave 6 (02-20 / 02-21) — Independent Non-Author Review

Reviewed the pinned aggregate diff only. Working tree not touched.

---

## Findings

### HIGH-1 — `invalid-composition` ships with no message of its own; the user is told to refresh, which destroys their map

**Files:** `src/utils/export.ts:250-252`, `src/utils/export.ts:263-266`, `src/types/ui.ts:70-76`, `src/App.tsx:745-760`, `src/components/ToastRegion.tsx:8-9,117`

`02-21` added a new terminal failure reason and wired nothing to it. `App.tsx:747` discards the reason entirely:

```ts
const result = await exportMapPng(exportSource);
didExportSucceed = result.ok;
```

Every non-`ok` result funnels into `showExportFailure()` (`App.tsx:711-713`), which renders
`TOAST_MESSAGES.exportFailed` — *"The PNG could not be created. Refresh the page and try Export PNG
again."* — plus a retry action.

**Failure scenario.** The legend layer ends up outside the canonical `svg.map-canvas` (exactly the
condition the new gate was built to detect). User clicks **Export PNG**.
1. `isSingleCanonicalComposition` refuses at `export.ts:250` before any capture.
2. Toast: "Refresh the page and try Export PNG again."
3. The composition is browser-memory-only. Refreshing destroys every unsaved color, the camera, the
   period, and the legend. The advice is actively destructive.
4. The retry action re-enters `handleExport`, hits the same synchronous refusal, and shows the same
   toast. It can never succeed. This is the *"permanently stuck export gate"* failure mode from the
   phase's own process lesson, reproduced at the messaging layer.

The authors already reasoned this through for the sibling case and wrote it down at `App.tsx:719-723`
("refreshing cannot shorten a label, and the composition is in-memory only, so 'Refresh the page'
would destroy the user's unsaved map"). They then added a second, structurally identical
never-recoverable reason and did not apply the same treatment.

**Fix.** Branch on `result.reason` in `handleExport`, and give `invalid-composition` a
non-retryable, non-refresh message on the `ToastRegion` allowlist, e.g. *"The map layout could not be
captured. Move the legend back onto the map, then try Export PNG again."* Keep
`didExportSucceed`/`showExportFailure` for the genuinely transient reasons (`capture-failed`,
`encoding-failed`, `invalid-dimensions`).

---

### MEDIUM-2 — The deleted composition test's legend-containment assertions have no real-app counterpart

**Files:** `tests/e2e/phase2-composition.spec.ts` (−152, block formerly at 606-756),
`tests/e2e/persistence.spec.ts:331-476`, `tests/e2e/export.spec.ts:224-229`,
`tests/e2e/fixtures/export.html:239`

Coverage audit of the 152 deleted lines, case by case:

| Deleted assertion | Counterpart |
|---|---|
| Full save→reset→resize→load composition round-trip | ✅ `persistence.spec.ts:331` (migrated, plus a new saved-row metadata assertion) |
| Stored record shape (schemaVersion/zoom/snapshotId/legendLabel/theme/background) | ✅ migrated verbatim |
| Camera `k/x/y` restored `toBeCloseTo(…, 5)`, `expectD3ZoomSynchronized`, post-load wheel rebinding | ✅ migrated verbatim |
| `data-camera-owner-sentinel` stable across 1300→900→1300, FRA focus retained | ✅ migrated (and strengthened with `svg.map-canvas` count 1) |
| `expectDesktopWorkspaceShell` / `expectCompactWorkspaceOrder` | ✅ still exercised at `phase2-composition.spec.ts:650, 688, 695` |
| `expect(mapListbox).toHaveCount(1)` (`MODERN_MAP_LISTBOX_NAME`) | ✅ `phase2-composition.spec.ts:364-371` |
| **`expect(mapListbox.locator('[data-layer="legend"]')).toHaveCount(0)`** | ❌ **no counterpart anywhere** |
| **`expect(moveLegend.closest('[role="listbox"]')).toBe(null)`** | ❌ **no counterpart anywhere** |
| **`expect(page.locator('svg.map-canvas > [data-layer="legend"]')).toHaveCount(1)` against the real app** | ⚠️ only against `fixtures/export.html` |
| `await expect(moveLegend).toBeFocused()` before `ArrowRight` | ⚠️ partially, `legend.spec.ts:48,129` |

The third row is the load-bearing one. `export.spec.ts:224-229` does assert
`svg.map-canvas > [data-layer="legend"]` — but against `fixtures/export.html`, which **re-implements**
App's wiring (`export.html:239` passes its own `legendSlot: h(LegendOverlay, …)` into `MapCanvas`).
It proves `MapCanvas` puts whatever it is handed in the right slot; it proves nothing about `App`.

**Failure scenario.** A future refactor (02-22/02-23 explicitly plan to move Controls/header and
refactor the `App` composition root) renders `<LegendOverlay/>` as a sibling of `<MapWorkspace/>`
instead of via `legendSlot` (`App.tsx:806-812, 862`). Then in the real app:
- `source.querySelectorAll('[data-layer="legend"]').length === 1`, `svg.querySelectorAll(...).length === 0`
- `isSingleCanonicalComposition` returns false → **every export returns `invalid-composition`**
- combined with HIGH-1, the user is told to refresh and loses their map
- **the entire suite still passes**: `export.spec.ts` uses the fixture's own wiring, and the one
  real-app assertion that would have caught it was deleted in this diff.

The second row has the same shape for accessibility: if the legend ends up inside
`[data-layer="camera"]`/`[data-layer="countries"]`, it is announced as a listbox option *and*
`isPreservedComposition` (`export.ts:136-152`, direct-children `findIndex`) refuses the export —
again with no test guarding it.

**Fix.** Add to `persistence.spec.ts:331` (or `legend.spec.ts`), against `page.goto('/')`:
```ts
const mapListbox = page.getByRole('listbox', { name: MODERN_MAP_LISTBOX_NAME });
await expect(mapListbox.locator('[data-layer="legend"]')).toHaveCount(0);
await expect(page.locator('svg.map-canvas > [data-layer="legend"]')).toHaveCount(1);
```
plus a real-app export smoke assertion that `Export PNG` does not produce the failure toast.

---

### MEDIUM-3 — The named-export feature is unreachable from the application

**Files:** `src/utils/export.ts:211-231, 233-237, 299`, `src/App.tsx:747`

`createExportFilename(date, mapName)` and the `mapName` parameter of `exportMapPng` are new public
API in this diff, covered by `export.test.ts:575-586` and `export.spec.ts:194-218`. The only
production call site passes no name:

```ts
const result = await exportMapPng(exportSource);   // App.tsx:747
```

`App` holds no map-name state, so nothing can supply one. Every user-facing export is
`CountriesIRL_YYYY-MM-DD.png`. `.continue-here.md:78` acknowledges 02-30 owns the wiring, so this is
planned-incomplete rather than broken — but the unit and E2E coverage reads as a delivered feature
and will read that way to the 02-28 acceptance matrix. Flagging so it is not counted as shipped.

**Fix.** Either land the `App` name state with 02-30 in the same wave, or annotate
`createExportFilename`'s `mapName` as not-yet-wired and mark the corresponding acceptance cell as
deferred.

---

### MEDIUM-4 — The nested load confirmation does not hide the dialog behind it from assistive technology

**Files:** `src/components/SaveLoad.tsx:727-757`, `src/styles/Controls.css:538-547`

The dirty-load confirmation renders `role="dialog" aria-modal="true"` **inside** the outer
`role="dialog" aria-modal="true"` (`SaveLoad.tsx:409-419`). Nothing sets `inert` or `aria-hidden` on
the outer dialog's content while the confirmation is open. Mouse is blocked only by the CSS
(`.save-load-confirm-overlay { position: fixed; inset: 0; background: var(--overlay) }`), and the
keyboard trap only intercepts `Tab`/`Escape` on the outer div's `onKeyDown` (`SaveLoad.tsx:349-393`).

**Failure scenario.** A screen-reader user with unsaved work triggers the confirmation. `aria-modal`
on the *parent* restricts AT to the parent subtree — which still contains "Save Current Map",
"Delete Saved Map: X", "Close Saved Maps", and the map-name input. In browse/virtual-cursor mode the
user can read past the confirmation and activate "Delete Saved Map: X" or close the dialog outright,
bypassing the confirmation the sighted user cannot bypass. Nothing in the diff prevents it and no
test covers it.

**Fix.** Set `inert` (or `aria-hidden="true"` + `tabIndex={-1}` sweep) on the outer dialog's content
while `pendingLoad !== null`, or render the confirmation as a sibling of `.save-load-dialog` under
the overlay. This belongs on the `02-28` matrix either way.

---

### MEDIUM-5 — Escape during a per-row delete confirmation closes the whole Save/Load dialog

**File:** `src/components/SaveLoad.tsx:352-366`

`handleDialogKeyDown` branches on `pendingLoad` only:

```ts
if (event.key === 'Escape') {
  ...
  if (pendingLoad === null) { requestClose(); } else { cancelPendingLoad(); }
```

`pendingDeleteKey` is not considered.

**Failure scenario.** Keyboard user clicks **Delete Saved Map: X**; focus moves to **Delete Map: X**
(`SaveLoad.tsx:298-302`). Pressing Escape — the universally expected "cancel this confirmation"
gesture, and the exact gesture the same handler honours for the load confirmation — dismisses the
entire modal and returns focus to the opener. The delete prompt is silently discarded and the user
must reopen and re-navigate. No data loss, but it is a direct inconsistency introduced by this diff,
which added both confirmations in the same commit and handled only one.

**Fix.**
```ts
if (pendingLoad !== null) { cancelPendingLoad(); }
else if (pendingDeleteKey !== null) {
  restoreDeleteFocusRef.current = pendingDeleteKey;
  setPendingDeleteKey(null);
}
else { requestClose(); }
```

---

### LOW-6 — The sanitizer strips `id` from every cloned element, which will silently break any future `url(#…)` reference

**Files:** `src/utils/export.ts:42-50, 101-114`; asserted by `export.spec.ts:269` (`clone.ids === 0`)
and `export.test.ts` (`ids` summary)

`id` is added to `SEMANTIC_ONLY_ATTRIBUTES` and removed from `svg` plus every descendant. Verified
this is safe **today**: `src/` contains zero matches for `url(#`, `clipPath`, `clip-path` on SVG
content, `<defs>`, `linearGradient`, `pattern`, `mask=`, or `marker`. So no geometry or paint is
currently reachable by reference.

**Latent failure.** The first gradient legend swatch, clipped map viewport, or arrow marker added to
`LegendOverlay`/`MapCanvas` will render correctly on screen and render unstyled or unclipped in the
PNG, because the clone's `<defs>` children lose their `id` before `html2canvas` resolves the
reference. Both new test suites *assert* the stripping (`clone.ids === 0`), so they would confirm the
break rather than catch it.

**Fix.** Scope the `id` removal to elements outside `<defs>`, or add a clone assertion that no
surviving attribute value matches `/url\(#/`.

---

### LOW-7 — `isSingleCanonicalComposition` passes a composition with zero legend layers

**File:** `src/utils/export.ts:73-84`

```ts
return sourceLegends === svgLegends && svgLegends <= 1;
```

`0 === 0 && 0 <= 1` → `true`. The guard's own comment says it exists so the export refuses "rather
than export a map with a missing legend", and live invariant #6 says a legend problem is "never a
silently legend-less PNG" — but the total-absence case passes straight through to capture.

Not reachable today: `LegendOverlay` always emits `<g data-layer="legend">` unconditionally
(`LegendOverlay.tsx:285-289`); only its *contents* are conditional on `activeEntries.length`. So this
is a guard that does not enforce what it claims, not a live bug.

**Fix.** `return sourceLegends === svgLegends && svgLegends === 1;` — or drop the comment's stronger
claim.

---

### LOW-8 — Save failures are reported with a load-failure message

**File:** `src/components/SaveLoad.tsx:437-444` (pre-existing; not introduced by this diff)

```ts
setOperationError(
  result.reason === 'map-canvas-unavailable' ? LOAD_FAILED_ERROR : STORAGE_UNAVAILABLE_ERROR,
);
```

`LOAD_FAILED_ERROR` reads *"This saved composition could not be **loaded**."* A user who pressed
**Save Current Map** while the map canvas handle is null (fatal scene state, mid responsive remount)
gets a load error. `map-not-found` — also in `CompositionSaveFailureReason` via `StorageErrorReason`
— falls through to *"This browser blocked local saves"*, which is likewise wrong. Noted because
02-21 explicitly claims distinct feedback per failure class.

---

## Checks that came back clean

Stated explicitly so the negatives are on record.

- **CameraFreezeLease (brief item 4).** Traced every early return. `handleExport`
  (`App.tsx:715-766`) takes the lease as the first statement inside `try` and releases it in the
  single outer `finally` alongside `exportInProgressRef.current = false` and `setIsExporting(false)`.
  Both `invalid-composition` returns (`export.ts:251`, `export.ts:265`) resolve normally and land in
  that `finally`. The two returns *before* the lease is taken (`legendExportBlocker`,
  `mapCanvasHandle === null`) never set `exportInProgressRef`. Inside `exportMapPng`, the second
  refusal happens after `createExportFrame` but before `appendChild`, and the outer `finally`'s
  `exportFrame?.remove()` is a no-op on an unattached node. `export.spec.ts:284-290` confirms
  `bodyFrameCount === 0` and `lastClone === null`. **No stuck gate.**

- **Sanitizer strips semantics only (brief item 2).** `SCENE_PATH_SELECTOR` widening is correct and
  complete: `MapCanvas.tsx:518-524` assigns `scene-path` to every path (logical
  `country-path`, decorative `country-path--decorative`, and non-selectable), so the old
  `path.country-path` rule genuinely missed the ±360° repeats and the new one does not. Nothing in
  `sanitizeExportClone` touches `d`, `transform`, `fill`, `viewBox`, or `preserveAspectRatio`.
  `path.style.strokeDasharray = 'none'` is safe — the only `stroke-dasharray` on scene paths is the
  `.focused` / `:focus-visible` focus ring (`MapCanvas.css:141-147`), an editor state. Element
  removal is limited to `[data-layer="outgoing-scene(s)"]`, `[data-editor-only]`, and
  `title,desc,metadata`; no geometry-bearing selector. `export.spec.ts:250-259` proves
  `scenePathCount === WRAPPED_PATH_COUNT`, `emptyGeometryCount === 0`, and the wrap offsets survive
  (`export.test.ts:568` asserts the exact `WRAPPED_OFFSET_TRANSFORM`). Mutation is confined to the
  clone — `export.test.ts:588-604` verifies the live DOM keeps its roles, tabindex, titles, camera
  transform, and outgoing layer.

- **Legend invariant (brief item 3).** No new raw `legend.position` read on a render or export path.
  The only consumers remain `LegendEditor.tsx:322` (via `resolveLegendPosition`),
  `LegendOverlay.tsx:134` (via `clampLegendPosition`), and `CompositionStateProvider.tsx:248,463`
  (canonicalization). `App.tsx:888` reads it for a text label only. The new
  `invalid-composition` path reads the rendered `transform` attribute off the DOM
  (`export.ts:61-71`), never the state object, and therefore cannot bypass the resolver.

- **History invariant (brief item 5).** `savedColorsBaseline` is a plain `useState` in `App`
  (`App.tsx:190-192`), never dispatched into `useMapState`. `LOAD_STATE`
  (`MapStateProvider.tsx:228-237`) still writes `history: [colors]` — colors only, no selection, no
  baseline. `isDirty` (`App.tsx:694-695`) is derived at render, not stored. `markSavedSnapshot`
  (`App.tsx:411-417`) is reached only from `useCompositionSaveTransaction.markSaved` and
  `useCompositionLoadTransaction.markBaseline` (`App.tsx:427, 440`), never from undo/redo/reset.
  Reviewed the load-rollback interaction (`useCompositionLoadTransaction.ts:333-357`): if a step
  after `markBaseline` throws, the baseline holds the failed load's colors while state rolls back —
  this errs toward *over*-dirty, i.e. an extra confirmation, never a skipped one. **Invariant holds.**

- **Baseline correctness across canonicalization.** `LOAD_STATE` canonicalizes
  (`MapStateProvider.tsx:229`) while `markBaseline` stores the raw snapshot colors, but
  `areColorMapsEqual` canonicalizes both sides (`colors.ts:149-163`), so a freshly loaded map is
  correctly clean. `persistence.spec.ts:515` and `:636` both load with no prior edits and assert the
  confirmation does **not** appear, so the clean path is genuinely covered, not just the dirty one.

- **`SavedMapSummary` projection cannot throw (brief item 6).** `readParsedMaps` returns
  `records: ReadonlyArray<ParsedStoredRecord>` with rejected rows routed to `rejectedRecords`
  (`storage.ts:139-141, 831-847`), so `record.storedRecord` is always present. Legacy rows short-
  circuit at `storage.ts:695-704` before any `snapshot.*` dereference; corrupt rows never arrive.
  `listSummaries` is read-only — no `writeRecords` call — and `persistence.spec.ts:515-522` proves
  byte-identical storage after listing and loading a V1 record.

- **Distinct storage feedback.** `storage-unavailable` → `STORAGE_UNAVAILABLE_ERROR`,
  `quota-exceeded` → `STORAGE_QUOTA_ERROR`, corrupt rows → `CORRUPT_STORAGE_WARNING` (`role="status"`),
  partial-valid colors → `PARTIAL_LOAD_WARNING`, legacy → `LEGACY_LOAD_WARNING`, repaired →
  `REPAIRED_COMPOSITION_WARNING`, plus the new `SNAPSHOT_UNAVAILABLE_ERROR`. All four brief-named
  classes stay distinguishable. A `deleteMap` failure that is not `map-not-found` sets no
  `operationError`, but `useLocalStorage.deleteMap` still calls `recordResult`, so the
  `storageError` alert (`SaveLoad.tsx:441-445`) surfaces it — not silent.

- **PNG contract (brief item 7).** `EXPORT_SIZE` square enforced twice (`html2canvas` `width`/`height`
  ×`EXPORT_SCALE`, then the hard `canvas.width !== EXPORT_SIZE` check at `export.ts:284-286`).
  Opaque white comes from three independent sources — the frame `background`/`backgroundColor`, the
  clone's own, and `html2canvas({ backgroundColor })` — and `export.spec.ts:183-188` samples all four
  PNG corners as `[255,255,255,255]` on real decoded bytes. DPR independence is structural:
  `scale: EXPORT_SCALE` is a fixed constant, never `window.devicePixelRatio`. Theme independence
  comes from `colorScheme = 'light'` on both the frame and the clone plus the explicit background.
  Neither DPR nor dark-theme has a *direct* assertion, but both are closed by construction; not
  raising a finding.

- **`createFilenameNameToken` (`export.ts:211-219`).** Whitelist is `[A-Za-z0-9_-]`, so path
  traversal, separators, and NUL are structurally impossible; a fully non-ASCII name collapses to
  `''` and falls back to `EXPORT_FILENAME_PREFIX` (`export.ts:226-228`), so no empty or
  extension-only filename. Leading/trailing separators are trimmed both before and after the
  60-char slice. Clean.

- **`Controls.css`.** Additions are layout only. `.save-load-confirm-overlay` is `position: fixed`
  under a `.save-load-dialog` that has `overflow-y: auto` but no `transform`/`filter`/`contain`, so
  it is neither reparented nor clipped, and `z-index: 101` sits above the overlay's `100`. No
  regression.

- **`isPreservedComposition` operator precedence** (`export.ts:144-149`): `expected.hasCameraLayer
  !== cameraIndex >= 0` parses as `!== (cameraIndex >= 0)`. Correct as written.

---

## Verdict

**APPROVE-WITH-FIXES** — critical: 0, high: 1

HIGH-1 must be fixed before this wave is counted as shipped: it converts the new export gate into
advice that destroys the user's unsaved map. MEDIUM-2 should be fixed in the same change, because it
is what makes HIGH-1 reachable without any test noticing. MEDIUM-3 needs a ledger correction rather
than code. MEDIUM-4 and MEDIUM-5 should be routed to `02-28` and `02-22` respectively.

The five prior-defect classes named in the phase's process lesson were each traced explicitly and
none recurred: the freeze lease releases on every path, selection stays out of history, no
accessibility landmark was removed from the live DOM, the legend resolver is not bypassed, and the
new assertions are behavioural rather than tautological. The export sanitizer widening is correct.
The failure mode this wave introduced is not in the mechanism — it is in what the user is told when
the mechanism fires.

---

_Reviewed: 2026-07-25 · Range `e188827..d31d3ee` · Depth: deep · Reviewer: independent non-author_
