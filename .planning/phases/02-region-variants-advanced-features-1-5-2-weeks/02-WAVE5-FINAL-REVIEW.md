---
review: Wave 5 re-review remediation — independent final review
range: fcd79dffbde9f5e292ee0a318243aa1dccc920d9..9c90b14e25d6997184152968e6e24acf58cf05ce
baseline_for_safety_checks: b910875e65d91cc3113137f6f57610ca1e26874a
reviewed: 2026-07-25
reviewer: independent reviewer (did not author the code, the integration review, or the re-review)
depth: deep (read-only; all blobs read at 9c90b14 via `git show`; no unit/E2E run — suite results taken as reported)
files_reviewed: 26
findings:
  critical: 0
  high: 0
  medium: 3
  low: 6
  total: 9
status: issues_found
verdict: APPROVE
---

# Wave 5 Remediation of the Re-Review — Final Independent Review

Every claim below was checked against the bytes at `9c90b14` (`git show 9c90b14:<path>`), not the
working tree. The worktree at `.claude/worktrees/agent-a7d36e7ddf6a00457` was not used as a source of
truth for any assertion.

## 1. Hard safety checks — all PASS

| Check | Result |
|---|---|
| `git diff --name-status b910875..9c90b14 -- public/data data` | **empty**. PASS |
| `git diff --name-status b910875..9c90b14 -- package.json package-lock.json vite.config.ts vitest.config.ts tsconfig*.json` | **empty**. PASS |
| Historical geometry / source approval / factual approval / catalog entry | PASS — no `sources/`, `public/data/`, manifest or snapshot-catalog byte in the delta. `src/constants/snapshots.ts` untouched. Historical GeoJSON still exists only as an in-memory Playwright route fixture. |
| CountryList still fed the unfiltered modern 195-core catalog | PASS — `App.tsx:735` still passes `countries` (= `geoData.countryMetadata`). The only `CountryList` change in the delta is lifting the search query to a prop (`CountryList.tsx:23-29,101,136-149`); `filterCountryCatalog` still filters by the *user's query only*, and out-of-scene rows are still rendered `disabled`, not removed. |
| `.planning` edits | PASS — `git diff --numstat` reports exactly `33 0 .planning/phases/02-.../02-WAVE5-WIRING-CORRECTION-CHECKPOINT.md`. Pure append, one file. No STATE/ROADMAP/HANDOFF/`.continue-here`/SUMMARY. |
| Map fiber untouched (H-3 / blocker-4 regression) | PASS — `MapCanvas.tsx`, `MapWorkspace.tsx`, `useCameraController.ts`, `App.css` are **not in the delta at all**. `App.tsx:766-775` still renders `[mapWorkspace, inspectorShell]` on desktop and `[actions, map, selection-color, countries, legend]` compact, `map` keyed at the same level in both, one `svg.map-canvas`, one camera owner. |
| New network/eval/secret sink | PASS — the only `localStorage` reference on an added line is `page.evaluate(... localStorage.removeItem ...)` in the E2E. No `eval`, `innerHTML`, `dangerouslySetInnerHTML`, `fetch`, or credential literal added. |
| `2525e4f` is line endings only | PASS — `git diff --ignore-cr-at-eol --ignore-all-space 2525e4f^ 2525e4f` is **empty**. CR count in `LegendEditor.test.tsx` goes `203 -> 0` (201 line endings + the 2 stray lone CRs LO-1 named). Nothing hidden. |

## 2. Priority 1 — the HI-1 legend fix (`e74f11f`)

### 2.1 The original failure is genuinely unrepresentable. CONFIRMED.

`resolveLegendPosition` (`legend.ts:433-440`) is a total function of `(storedPosition, liveBounds)`:
preset non-null and in `LEGEND_CORNERS` -> `getLegendCornerPosition(preset, bounds)`; otherwise
`clampLegendPosition({...position, preset:null}, bounds)`. `resolveLegendRender`
(`legend.ts:454-468`) derives `bounds` from the *same* `getActiveLegendEntries` +
`createLegendLayout` the renderer draws, so the position can never be resolved against bounds other
than the ones being rendered.

Traced arithmetic for the reported scenario, from `legend.ts:14-28,340-399,401-413`:

| entries | columns | `bounds.width` | `maximumX` | resolved custom `x` from a stored 712 |
|---|---|---|---|---|
| 8 | 1 | `48 + 288 = 336` | `1080-32-336 = 712` | 712 (unchanged, legal) |
| 9 | 2 | `48 + 576 + 24 = 648` | `400` | **400** — right edge lands exactly on 1048 |
| 17 | 3 | `48 + 864 + 48 = 960` | `88` | **88** — right edge lands exactly on 1048 |

`x + width <= 1048` and `x >= 32` hold in every row, so the rendered legend is inside the 32px safe
inset by construction. `LegendOverlay.tsx:191-194,289` renders `translate(position.x position.y)`
from the resolved value, never from `legend.position`.

Independent bounds sanity check (the invariant the whole argument rests on): `columns` is capped at 3
(`legend.ts:142-153`), so `bounds.width <= 960 < 1016`, and with `<= 30` active entries
`rowsPerColumn <= 10` and every row is `<= 64px`, so `bounds.height <= 24 + 10*72 - 8 + 24 = 760 <
1016`. `isBoundsValid` (`legend.ts:184-193`) is therefore true for every legend that is not already
blocked by `too-many-active-colors`. I could not construct a reachable state where it is false.

### 2.2 No consumer reads the stored position on a render or export path. CONFIRMED.

`git grep -n "legend\.position" 9c90b14 -- src` returns exactly six non-test reads:

| Site | Verdict |
|---|---|
| `LegendOverlay.tsx:191` (via `resolveLegendRender`) | chokepoint — render, drag origin (`:211`), keyboard nudge (`:273`), and therefore the export clone |
| `LegendOverlay.tsx:116` `getLegendOverlayBounds` (via `resolveLegendRender`) | chokepoint — the single `legendBounds` source at `App.tsx:244-247`, fed to both the gate and the editor |
| `legend.ts:598` inside `validateActiveLegend` | chokepoint |
| `LegendEditor.tsx:322` `nudge` | chokepoint (`resolveLegendPosition` first, then `nudgeLegendPosition`) |
| `LegendEditor.tsx:516,524` preset radio `checked` / custom-controls visibility | reads `.preset` only, which `resolveLegendPosition` preserves for presets and nulls only for values `LEGEND_CORNERS` rejects. Consistent with the render. |
| `App.tsx:716` `getLegendPositionLabel` | reads `.preset` only; same argument. The disclosure summary can no longer describe a corner the render contradicts. |
| `useCompositionSaveTransaction.ts:71`, `useCompositionLoadTransaction.ts:122`, `CompositionStateProvider.tsx:248,462-466` | persistence / canonicalisation round-trip sites, where the raw value is the correct thing to carry |

No bypass found.

### 2.3 The export clone uses the resolved position. CONFIRMED.

`App.handleExport` -> `mapCanvasHandle.getExportSource()` -> `exportMapPng` ->
`createExportFrame` -> `sourceSvg.cloneNode(true)` (`export.ts:78`). The clone is a deep copy of the
live DOM, so it carries the same `<g data-layer="legend" transform="translate(...)">` the overlay
rendered; `sanitizeEditorState` only strips `[data-editor-only]` (the drag rect) and editor state
classes/attributes. Crucially the legend slot is a **sibling of the camera layer**, not a child
(`MapCanvas.tsx:651-659`), and both the live and the export `viewBox` are `0 0 1080 1080`
(`config.ts:MAP_VIEWBOX_SIZE = EXPORT_SIZE = 1080`, `export.ts:14`), so the resolved coordinates are
canvas coordinates in both. The E2E asserts the cloned frame literally
(`legend.spec.ts:296-300` reads `data-export-legend-frame` and matches `88,32,960,...`).

### 2.4 `invalid-position` unreachable, and not re-arming the gate is sound. CONFIRMED.

`validateActiveLegend` (`legend.ts:589-603`) validates the position it hands to `validateLegend` as
`resolveLegendPosition(legend.position, bounds)` with the *same* `bounds` the overlay renders.
`isPositionValid` (`legend.ts:195-217`) then checks `32 <= x <= maximumX` and `32 <= y <= maximumY`
against those same bounds. For a preset, `getLegendCornerPosition` returns exactly `32` or exactly
`maximumX`/`maximumY`, both inclusive-legal. For a custom position, `clampLegendPosition` clamps into
`[32, max(32, maximumX)]`, which equals `[32, maximumX]` whenever `maximumX >= 32`, i.e. whenever
`isBoundsValid` holds — which §2.1 shows is always, for any legend the gate does not already block.
So `invalid-position` cannot fire, and re-arming it would be dead weight rather than protection.

**I could not construct any state in which the legend renders or exports outside the 1080×1080 safe
area while `legendExportBlocker` is `null`.** The three inputs to the render (`compositionState.legend`,
`effectiveColors`, `legendBounds`) are the identical three objects fed to the gate in the same App
render (`App.tsx:244-262` vs `:674-681`), so a render/gate divergence would require them to differ,
which they cannot.

### 2.5 Bounds edge cases. Handled — with one latent duplicate (ME-3).

- `clampLegendPosition` (`legend.ts:223-243`) guards the inverted range with
  `Math.max(LEGEND_SAFE_INSET, maximumX)`, so a legend larger than `1080 - 2*32` clamps to `32/32`
  (overflowing bottom-right rather than off the top-left) and `isPositionValid` correctly reports
  `invalid-position`. No negative or NaN coordinate is producible; non-finite `x`/`y` fall back to
  `LEGEND_SAFE_INSET`.
- `> 30 colors` still blocks: `too-many-active-colors` (`legend.ts:501-503`) is the *first* branch of
  `getLegendBlockingMessage` (`:622-624`), so even when an oversized legend also trips
  `invalid-position`, the blocking message is the 30-color one. Verified against the E2E's
  `Use 31 colors` path.
- `label-does-not-fit` and `invalid-label` still block (`legend.ts:625-632`), reached from
  `App.tsx:590-597`.
- **But** `LegendOverlay.tsx:119-136` keeps a *second* clamp (`clampLegendDragPosition`) that is
  `clampLegendPosition` minus the `Math.max` guard. See ME-3.

## 3. Priority 2 — the rest of the delta

| Commit | Verdict |
|---|---|
| `6bb4e45` unified defaults | **Fixed, with one residue.** `DEFAULT_LEGEND_POSITION = {x:32,y:32,preset:'top-left'}` and `DEFAULT_LEGEND_BACKGROUND_OPACITY = 90` are exported once from `legend.ts:38-43`; the provider now derives `DEFAULT_LEGEND` from `createDefaultLegendState()` (`CompositionStateProvider.tsx:38-39`) and `createLegacyCompatibleSnapshot` is exported and covered (`legend.test.ts:80-100`). The renderer's dual branch is gone (`LegendOverlay.tsx:90-92`) and `validateActiveLegend` no longer divides by 100. The `0-1` residue is `storage.ts:291-299` — see ME-2. |
| `14a40cb` legend-blocked export toast | **Fixed.** `App.tsx:590-597` passes the classifier's own sentence to `showError` with **no retry** (retry would re-enter the same early return). `ToastRegion.tsx:55-57` allowlists the two messages by importing the exact constants from `utils/legend`, so no string can drift out of the allowlist; `getSafeMessage` (`:135-153`) is still fail-closed (unknown error -> `FALLBACK_ERROR_MESSAGE`), and `Try Export Again` is still gated on `safeMessage === EXPORT_FAILURE_MESSAGE`, so the legend toast cannot show it. |
| `aeb9cbb` `useInspectorUiState` | **Fixed, map fiber untouched.** The hook holds query / custom draft / disclosure / Locate reducer above the branch and returns a memo whose deps cover every unstable value (the four setters and `dispatchLocate` are React-stable). The Locate reducer is the same closure that lived in `LocateCountry`, moved verbatim. No change to `MapCanvas`, `MapWorkspace`, `useCameraController`, or `App.css`; the E2E re-asserts `data-camera-owner-sentinel` and one `svg.map-canvas` across both crossings (`phase2-composition.spec.ts:824-844`). |
| `4251cff` ErrorBoundary tests | **Adequate.** The E2E *does* exercise React's real catch path: it routes `world-modern.geojson` to a duplicate-`sourceFeatureId` asset so `composeEffectiveScene` throws inside App's own `useMemo` in a real browser, then asserts `role="alert"`, the Reload button, `svg.map-canvas` count 0, `.app` count 0, and the `componentDidCatch` console line (`phase2-composition.spec.ts:751-783`). The unit half honestly documents that it only proves wiring, and it does prove the thing that was missing: with `ErrorBoundary` mocked to a marker, both `App` and `main` are shown to wrap their trees, so deleting either `<ErrorBoundary>` now fails the suite. See LO-2/LO-3 for the residue. |
| `2525e4f` CRLF | **Verified clean** (see §1). |

## 4. Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM

#### ME-1 — The gate validates label fit against the *requested* text size, not the rendered one
**File:** `src/utils/legend.ts:525-530` (`getLabelLineCount(entry.label, legend.textSize)`), against
`legend.ts:346-349,370` (`createLegendLayout` uses `getEffectiveTextSize`).

`validateActiveLegend`'s doc comment now claims it "validates the legend exactly as the exporter will
render it" (`legend.ts:576-588`). That is true for entries and position after this fix, but **not for
text size**. `createLegendLayout` forces `small` at `>= 17` entries (`legend.ts:155-160`), while
`validateLegend` measures the label with `legend.textSize`.

Concrete failure: 17 active colors, text size `Large`, one 29-character label.
Render: `effectiveTextSize = 'small'` -> `ceil(29/24) = 2` lines -> fits, renders correctly.
Gate: `getLabelLineCount(29, 'large') = ceil(29/14) = 3 > 2` -> `label-does-not-fit` ->
`getLegendBlockingMessage` -> **Export PNG is blocked** with "Shorten this label so it fits in the
exported legend." on a legend that fits perfectly. `resolveLegendLabelCommit`
(`LegendEditor.tsx:104-123`) only checks length `<= 32`, so the label commits without complaint and
the user gets no warning until they press Export.

Not a security or data-loss issue and the block *is* clearable (shorten the label, or switch the text
size to Small/Medium), so this is not H-1 again. Pre-existing, but this delta is the commit that
asserts the render/gate equivalence in a doc comment, so it should either be fixed or the comment
narrowed.
**Fix:** measure with the effective size, e.g. compute
`const effectiveTextSize = createLegendLayout(activeEntries, legend.textSize).effectiveTextSize;`
once in `validateLegend` and use it at `:527`.

#### ME-2 — `storage.ts` still accepts the abandoned 0-1 opacity scale, and silently degrades it
**File:** `src/utils/storage.ts:39-42,291-299,413-437`

`6bb4e45` collapsed `backgroundOpacity` to a single 0-100 scale everywhere except here:
`isLegendOpacityValid` still returns `true` for `0.7 <= v <= 1`. The chain for a stored `0.9`:

1. `normalizeLegend` accepts it, so `isOpacityValid` is `true` and **`isRepaired` is not set** — the
   load reports success with no `composition-repaired` warning.
2. `useCompositionLoadTransaction.ts:125` carries `0.9` through unchanged.
3. `LOAD_COMPOSITION` -> `canonicalizeLegendStyle` (`CompositionStateProvider.tsx:231-238`) clamps
   into `[70, 100]` -> **`70`**.

So a `0.9` (intended 90%) and a `1.0` (intended 100%) both silently become 70% — the *most*
transparent legal value — with no repair toast and no way for the user to know their saved styling
was changed. It is not read as "0.9%" anywhere (the provider clamp and
`LegendOverlay.getBackgroundOpacity`'s `clamp(v/100, 0.7, 1)` floor both prevent that), which is why
this is MEDIUM and not HIGH, and Phase 1 saves were colours-only so the population of affected
records is probably empty. But the commit's stated invariant ("one scale, everywhere",
`legend.ts:26-31`) is not actually true, and this is exactly the "remaining 0-1 consumer" the
unification was supposed to remove.
**Fix:** delete `MIN/MAX_FRACTIONAL_LEGEND_OPACITY` and the fractional branch, so a legacy `0.9`
fails validation, falls back to `DEFAULT_LEGEND_BACKGROUND_OPACITY` (90), and sets `isRepaired` ->
the user gets the honest `composition-repaired` warning.

#### ME-3 — A second, unguarded position clamp survives next to the new chokepoint
**File:** `src/components/LegendOverlay.tsx:119-136` vs `src/utils/legend.ts:223-243`

`clampLegendDragPosition` is `clampLegendPosition` with two differences: it always forces
`preset: null` (correct and intended for a drag), and it **omits the
`Math.max(LEGEND_SAFE_INSET, maximumX)` guard**. If `bounds.width` ever exceeded `1080 - 2*32`, the
call degenerates to `Math.min(negative, Math.max(32, x))` and returns a coordinate below the safe
inset — potentially negative — which the chokepoint would then faithfully preserve on the render path
(`clampLegendPosition` would clamp it back to 32, but the drag writes it to state and the status
message claims success). Today `bounds.width <= 960` makes this unreachable, so it is a latent
defect, not a live one. It nonetheless leaves two clamp implementations that must be kept in sync,
which is precisely the failure mode the "single chokepoint" refactor was filed to end.
**Fix:** delete `clampLegendDragPosition` and call
`clampLegendPosition({...next, preset: null}, bounds)` from `handlePointerMove`; keep the export only
if a test still needs it.

### LOW

- **LO-1** `src/components/LegendOverlay.tsx:191-194`, `src/utils/legend.ts:433-440` — the stored
  position is resolved but never *repaired*, so removing colours (9 -> 8) re-widens `maximumX` and the
  legend jumps back to a stale custom `x` the user last saw two reflows ago. This is arguably the
  desirable non-destructive behaviour, but it is undocumented and it means saved files persist
  coordinates that are never rendered. Worth one sentence in the `resolveLegendPosition` doc block.
- **LO-2** `src/App.tsx:771` — App's inner `ErrorBoundary` is still not exercised by any unit test or
  E2E fixture; the only fixture (`createDuplicateIdentityWorldAsset`) deliberately targets the
  `main.tsx` boundary. Calling it "defence-in-depth" is defensible rather than dead code —
  `MapCanvas`'s `createWrappedSceneModel` / `getSelectableSceneFeatures` throws are genuinely in a
  descendant of it, so it is the only boundary that can keep the app shell alive for those — but the
  claim is currently untested. A fixture that feeds `MapCanvas` a scene it rejects (rather than one
  `composeEffectiveScene` rejects) would close it. Do **not** delete the boundary.
- **LO-3** `src/components/ErrorBoundary.test.tsx:79-97` — the first test still instantiates the class
  by hand (`new ErrorBoundary({...})`) and calls `componentDidCatch` directly. It is now only asserting
  the console reporting, which is fair, but the construction pattern is the one the re-review
  criticised and reads as if nothing changed.
- **LO-4** `src/components/LegendEditor.tsx:104-123` — `resolveLegendLabelCommit` and the export gate
  use the same message (`LEGEND_LABEL_FIT_MESSAGE`) for two different rules (length `<= 32` vs line
  count `<= 2`). A label can pass the commit check and then block Export with the identical sentence,
  which reads to the user as the editor lying. Related to ME-1.
- **LO-5** `src/components/LegendOverlay.tsx:112-117` — `getLegendOverlayBounds` (a pure derivation)
  still lives in a component module, and `App.tsx:34` imports it from there for the gate. LO-7 of the
  previous review was applied to `getLegendBlockingMessage` but not to this one; `resolveLegendRender`
  in `utils/legend.ts` is already the natural home.
- **LO-6** `tests/e2e/fixtures/locate.html:66-67` — `const countries = geoData.status === 'ready' ?
  ... : []` allocates a fresh array every render, invalidating `useInspectorUiState`'s `locateReducer`
  `useCallback` on each pass. Harmless (fixture only, and `useReducer` reads the latest reducer), but
  `App.tsx:65,204` uses a module-level `EMPTY_COUNTRIES` constant for exactly this reason and the
  fixture claims to "mirror App".

## 5. Verdict

The HI-1 remedy is the right one — the durable option the re-review recommended, not the cheap one.
`resolveLegendPosition` makes the out-of-frame legend *unrepresentable* rather than merely detectable:
the preset is authoritative and tracks its corner as the legend reflows, a custom position is
re-clamped against live bounds, and `resolveLegendRender` derives bounds from the very entries being
drawn so the render, the drag origin, the keyboard nudge, the editor, the gate and the export clone
cannot disagree. I traced all six non-test reads of `legend.position` and found no bypass; the export
path is a `cloneNode(true)` of the same DOM the overlay rendered, in a `0 0 1080 1080` viewBox, with
the legend outside the camera transform. The claim that `invalid-position` is now unreachable is
correct and I verified the supporting bounds arithmetic independently (`width <= 960`, `height <= 760`
for any legend the 30-colour gate does not already block), so declining to re-arm it is sound rather
than convenient. The E2E covers the exact 8->9 and 16->17 transitions the re-review specified,
including the exported frame.

The rest of the delta holds up: one legend default that agrees with its own preset, a blocked export
that names the actual problem instead of telling the user to refresh away their unsaved map, an
allowlist that stays fail-closed by importing the literals it approves, inspector UI state lifted
above the responsive branch without touching a single byte of the map fiber, an E2E that genuinely
drives React's catch path in a real browser, and a CRLF commit that is provably nothing but line
endings. Every hard safety constraint passes.

Three MEDIUMs remain — a gate that measures label fit against the requested rather than the rendered
text size (spurious block, clearable, pre-existing but now contradicted by a doc comment), a leftover
0-1 opacity acceptance branch in `storage.ts` that silently degrades a legacy value to 70% with no
repair warning, and a duplicate unguarded clamp sitting beside the new chokepoint. None of them can
put a legend outside the export frame, none corrupts the PNG, and none is unclearable by the user.

**Can a legend still render or export outside the 1080 canvas while the export gate stays green? No.**

**INTEGRATION VERDICT: APPROVE**

---

_Reviewed: 2026-07-25_
_Reviewer: independent final reviewer (gsd-code-reviewer)_
_Depth: deep, read-only; no unit/E2E execution performed (suite results taken as reported: 33 files / 364 tests, Chrome 23/23, Edge 23/23, lint/tsc/build clean)_
