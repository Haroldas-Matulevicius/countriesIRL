---
review: Wave 5 production wiring — independent integration review
range: b910875e65d91cc3113137f6f57610ca1e26874a..7ab0601e64feb415a9478bb975b212259a898982
checkpoint_commit: 8f1968b (documentation only, not reviewed as product)
reviewed: 2026-07-25
reviewer: independent integration reviewer (did not author this code)
depth: deep (read-only; no test/E2E execution)
files_reviewed: 31
findings:
  critical: 0
  high: 3
  medium: 6
  low: 9
  total: 18
status: issues_found
verdict: REJECT
---

# Wave 5 Production Wiring — Independent Integration Review

Scope: aggregate diff `b910875..7ab0601` (11 product/test commits). All conclusions below were
taken from the actual bytes at `7ab0601`, not from commit messages or the author checkpoint.

## 1. Hard safety checks (all PASS)

| Check | Result |
|---|---|
| `git diff --name-status b910875..7ab0601 -- public/data data` | **empty** — no historical geometry, catalog entry, source approval, or factual approval added. PASS |
| Historical GeoJSON confined to an in-memory Playwright route fixture | PASS — only `tests/e2e/phase2-composition.spec.ts:148-251` (`createHistoricalBrowserFixture`, `createHistoricalSavedRecord`), served via `page.route`. No asset on disk. |
| New dependency / manifest / lockfile change | PASS — `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*` untouched. |
| Env secret / auth / deployment / backend / network service | PASS — no new fetch targets beyond the pre-existing `/data/...` static paths. |
| `.planning/` STATE / ROADMAP / REQUIREMENTS / HANDOFF / `.continue-here` edits | PASS — the only `.planning` file in the range is the new `02-WAVE5-WIRING-CORRECTION-CHECKPOINT.md`. |
| Downstream plan SUMMARY files (02-18/20/21/22/23/30) | PASS — none created or changed. |

No security defect was found: no `eval`, `innerHTML`, `dangerouslySetInnerHTML`, hardcoded
credential, unsafe deserialization, or injection sink was introduced. `focusCountry` correctly uses
`CSS.escape` (`src/components/MapCanvas.tsx:308`).

## 2. Ten claimed blockers — independent disposition

| # | Claim | My finding |
|---|---|---|
| 1 | Browser + Locate consume only the modern 195-core catalog | **Partly true, and the untested half is broken.** `App.tsx:201-204,684-693` feeds `geoData.countryMetadata` to both `CountryList` and `LocateCountry`, so historical entities are never searchable — correct. But the reverse leak is unguarded: see **H-2**. |
| 2 | Locate uses separate modern `locateFeatures` | **True.** `MapWorkspace.tsx:90-91` passes `features={visibleFeatures}` and `locateFeatures={geoData.features}`; `useCameraController.ts:367-372` resolves Locate targets only from `locateFeaturesRef`. |
| 3 | Save reads the live camera synchronously, no freeze lease | **True.** `useCompositionSaveTransaction.ts:100-106` calls `readCurrentCamera()` only; `useCameraController.ts:115-118` is non-locking and reads the painted transform. No `freezeAndSnapshot` on the save path. (Caveat L-8.) |
| 4 | One camera owner across the 1200px transition | **True structurally.** `App.tsx:694-709,729` renders one keyed array; the previous `<aside>`-vs-fragment branch (baseline `App.tsx`) genuinely remounted the map at index 0. No duplicate/hidden workspace, no CSS `order`. **But the fix silently deleted the desktop inspector shell — see H-3.** |
| 5 | Desktop DOM order map-first, compact actions-first | **True in DOM order** (`App.tsx:694-709`). Desktop grid placement (`App.css:131-158`) agrees with DOM order rather than faking it. |
| 6 | Every paint/restore/settle/reattach writes `__zoom` | **True.** `useCameraController.ts:336-340` (paint), `:341-349` (reattach), `:385-386` (init). All controller mutations funnel through `paint()` (`:98-103`). |
| 7 | Load captures rollback before mutation and restores atomically | **Structurally true, practically weaker than claimed** — see M-4. Capture at `useCompositionLoadTransaction.ts:280-290` precedes `restore()` at `:294` and the commit block at `:307-313`. |
| 8 | Load focus applied only after the new scene rendered | **True but leaks state** — `App.tsx:415-428` defers to a layout effect + rAF gated on `effectiveCountryLookup`. See M-2. |
| 9 | Duplicate identities rejected fail-closed | **Mixed.** `scene.ts:39-66` and `MapCanvas.tsx:154-178` throw; `historicalValidation.ts:889-910` does **not** fail closed — it skips the duplicate and continues (M-5). The throws themselves are unguarded render-time throws (M-1). |
| 10 | Export retains legend, strips editor controls, one SVG, lease released in outermost finally | **True.** `export.ts:36-38` removes `[data-editor-only]` (the `Move legend` rect, `LegendOverlay.tsx:311-315`); `export.ts:126-133` requires exactly one SVG; `App.tsx:584-588` releases the lease in the `finally` before any status/focus code runs. |

Follow-ups: (a) **resolved** — `SaveLoad.tsx:129-149` emits all applicable sentences and
`ToastRegion.tsx:15-23` allowlists all seven combinations. (b) **partly resolved** — see M-6.
(c) **resolved** — `role="listbox"` is on the countries group (`MapCanvas.tsx:652-657`) and the legend
is a sibling after the camera layer (`MapCanvas.tsx:659`).

## 3. Findings

### HIGH

#### H-1 — A stale legend-validation result permanently disables PNG export
**Files:** `src/App.tsx:167-168,554-561`; `src/components/LegendDisclosure.tsx:51`;
`src/components/LegendEditor.tsx:221-226`

`handleExport` hard-fails when `legendValidation?.ok === false`. `legendValidation` is only ever
written by `LegendEditor`'s effect, and `LegendDisclosure` mounts `LegendEditor` **only while the
disclosure is expanded** (`{isExpanded ? <div…>{children}</div> : null}`). `LegendEditor` performs no
cleanup on unmount, so the last reported result survives the editor's disappearance and is never
re-evaluated.

Failure scenario: open **Legend**, give an entry a 32-character label that overflows two lines
(`utils/legend.ts:449-455` → `label-does-not-fit`, `ok:false`); collapse the Legend panel; click
**Reset All Colors** (the legend now has zero active entries and is trivially valid). Every
subsequent **Export PNG** returns immediately with `The PNG could not be created. Refresh the page
and try Export PNG again.`, and the toast's `Try Export Again` button re-enters the same early
return forever. The only recovery is re-expanding the Legend panel or reloading the page. This is
permanent loss of the product's primary output, with a misleading error message, and it was
introduced by this diff (the gate at `App.tsx:558-561` is new).

**Fix:** report validation from a source that outlives the disclosure (validate in `App` from
`compositionState.legend` + `effectiveColors` + `legendBounds`, or have `LegendEditor` reset the
result on unmount), and never leave the export gate in a state that no mounted component can clear.

#### H-2 — The country browser can select and color entities absent from the active scene
**Files:** `src/App.tsx:488-495,684-693`; `src/components/CountryList.tsx:113-126`;
`src/components/SelectionPanel.tsx:27-36`; `src/components/ColorPicker.tsx:64-79`

Map interaction is gated on the effective scene (`handleSelectCountry` checks
`effectiveCountryLookup`), but `CountryList` bypasses `App` entirely: `handleCountryChange` and
`handleSelectVisible` dispatch `toggleSelection` / `replaceSelection` directly from `useMapState`,
validated only against the modern 195-core catalog. `ColorPicker` then applies colors to every
`selectedIds` member with no scene check.

The author's own E2E proves reachability: in the 1700 scene the test asserts
`path.country-path[data-country-id="FRA"]` has count **0** while the browser search for `France`
still shows a checkbox (`tests/e2e/phase2-composition.spec.ts:812-819`).

Failure scenario (historical scene, exactly the flow blocker #1/#2 governs): check **France** in the
browser → the checkbox goes checked, but `SelectionPanel` renders the *empty* state
(`Select countries to color`) because `effectiveCountryLookup` has no `FRA`; the live region
announces `1 country selected.` with no name; `ColorPicker` is enabled and announces
`Applied Red to 1 country.` while nothing on the map changes; `effectiveColors` never contains the
color so no legend entry appears; the color is written to `colors.FRA`, persisted by Save, and then
silently discarded by `reconcileSelectionForScene` on the next Load. Three UI surfaces disagree about
the same selection, and user work is silently lost.

**Fix:** derive the browser catalog (or at least its enabled rows and `Select Visible` set) from the
effective scene, or route `CountryList`/`ColorPicker` mutations through the same
`effectiveCountryLookup` gate `handleSelectCountry` already uses.

#### H-3 — The desktop inspector shell (scroll container + `aside` landmark) was deleted
**Files:** `src/styles/App.css:122-158` (removal of `.workspace__control-column`);
`src/App.tsx:711-730` (removal of `<aside className="workspace__control-column">`);
contract: `02-UI-SPEC.md` §7.1

The baseline desktop layout wrapped the four inspector sections in an
`<aside className="workspace__control-column">` styled with
`max-height: calc(100dvh - var(--space-3xl)); overflow-y: auto; overscroll-behavior: contain`
(baseline `App.css:131-141`). To make the responsive reorder keyed, this diff removed both the
element and the rule, replacing them with four independent grid rows in column 2. UI-SPEC §7.1 is
explicit: *"Inspector is one shell, not a stack of cards"* and *"Inspector maximum height: viewport
minus app bar and 32px bottom breathing room; its content may scroll independently with
`overscroll-behavior: contain`."*

Failure scenario: at 1300×900 the inspector column is now actions + selection/color + legend +
country list (whose own list is capped at 48vh but whose header/bulk actions and the Locate combobox
are not). The column exceeds the viewport, so the **whole page** scrolls instead of the inspector;
the map — the largest visual element and the thing the user is coloring — scrolls out of view while
they work in the country list, and `overscroll-behavior: contain` no longer applies. The
`complementary` landmark that screen-reader users used to jump to the inspector is also gone.

The checkpoint describes this change as "keyed sibling movement… No CSS order, duplicate map, hidden
workspace, or second controller" and does not disclose the removal.

**Fix:** keep the single scrolling `<aside>` shell as a keyed sibling of the keyed map div (the
`<aside>` itself can carry `key="inspector"` and hold the four sections), preserving one map owner
*and* the spec-mandated inspector.

### MEDIUM

#### M-1 — Duplicate-identity "fail-closed" is an unguarded render-time throw with no error boundary
**Files:** `src/utils/scene.ts:39-66,115`; `src/App.tsx:184-193`; `src/components/MapCanvas.tsx:154-178,340-353`; `src/main.tsx:22-29`

`composeEffectiveScene` (called inside `App`'s `useMemo`) and `createWrappedSceneModel` /
`getSelectableSceneFeatures` (called inside `MapCanvas`'s `useMemo`s) throw on duplicate identities.
There is no `ErrorBoundary` anywhere in `src` (verified by grep for `componentDidCatch` /
`getDerivedStateFromError`). A throw during render therefore unmounts the entire React tree — a blank
white page — instead of the designed `FatalErrorState`, and directly contradicts the CLAUDE.md
guardrail *"Validate on load; skip malformed entries with a warning (don't crash)."*
`normalizeSceneGeoJson` (`utils/geojson.ts:345,358-361`) dedupes only on feature `id`, so a world
asset with two features sharing a `sourceFeatureId` passes normalization and then white-screens the app.

**Fix:** add an error boundary around the workspace, or convert these asserts into a validated result
that degrades to `FatalErrorState`.

#### M-2 — `pendingLoadedFocusId` is never cleared when the target is not in the scene
**File:** `src/App.tsx:415-428`

The layout effect returns early (without clearing state) when the requested id is absent from
`effectiveCountryLookup`. The pending id then survives indefinitely. If a later scene change makes
that id selectable, the effect fires and steals keyboard focus to an unrelated country in the middle
of an unrelated interaction. Set `setPendingLoadedFocusId(null)` in the miss branch.

#### M-3 — `features ?? geoData.features` silently renders the modern world for a non-modern snapshot
**File:** `src/components/MapWorkspace.tsx:90`

When `effectiveScene` is `null` while `compositionState.snapshotId !== 'modern'` (`App.tsx:194-200`),
`visibleFeatures` is `undefined` and `MapWorkspace` falls back to the full modern feature set. The map
then shows modern borders while the composition state — and any subsequent Save — claims a historical
snapshot id. This is a fail-open default in a diff whose stated posture is fail-closed. Make the prop
required and render nothing (or an error state) when the scene is unavailable.

#### M-4 — Load "atomicity" depends on React dispatchers throwing synchronously
**File:** `src/hooks/useCompositionLoadTransaction.ts:307-331`; tests
`useCompositionLoadTransaction.test.tsx` (injected throwing deps)

The commit block wraps five `useReducer` dispatches in `try/catch`. React dispatchers generally do
not throw synchronously for reducer failures (errors surface during the subsequent render), so this
`catch` — and therefore the rollback — is only exercised by the tests' injected throwing doubles, not
by any realistic production failure. The rollback machinery is correct; the claim that blocked loads
"fail atomically" for real failures is not established by this code or these tests.

#### M-5 — Historical duplicate handling is skip-and-warn, and the warnings are then discarded
**Files:** `src/utils/historicalValidation.ts:889-910`; `src/hooks/useSnapshotData.ts:253-259`

`validateHistoricalAsset` drops duplicate feature/source/selectable entries with a
`console.warn` and continues, contradicting the checkpoint's "rejects … fail-closed".
`resolveEffectiveSnapshotScene` then composes the scene and throws `validation.value.warnings` away
entirely, so a partially-dropped historical map reaches the user with no UI signal at all. Either fail
the asset, or propagate the warnings into the load outcome so the existing
`REPAIRED_COMPOSITION_WARNING` path can surface them.

#### M-6 — The legend-reorder allowlist rejects many legal 32-character labels
**File:** `src/components/ToastRegion.tsx:54-65`

`LEGEND_REORDER_MESSAGE_PATTERN` permits only `[\p{L}\p{N} #.,'’()&:_/!?-]`. `LegendEditor`'s label
input accepts any characters up to 32 (`LegendEditor.tsx:396`, `legend.ts:151-153`). Labels such as
`Allies & "Central Powers"`, `Trip 2024 → 2025`, `50% visited`, `A–B route`, or any emoji fall back to
the generic `Map updated.`, which is the exact degradation follow-up (b) claims to have fixed. Bound
the label by length only (it is already capped at 32) and escape it, rather than allowlisting a
partial charset.

### LOW

- **L-1** `src/hooks/useCameraController.ts:288,354-359` — `frameId` is declared and never assigned;
  `driver.cancelFrame()` is dead code called from `freezeAndSnapshot` and `destroy`.
- **L-2** `src/hooks/useCameraController.ts:225-235` — `destroy()` calls `setInputEnabled(true)`,
  which re-attaches the zoom behaviour to the SVG, immediately before `cleanup()` tears it down.
  Harmless today, but it re-installs listeners during teardown.
- **L-3** `src/hooks/useCameraController.ts:125-135` — `activeFreezeCount` is incremented before the
  driver side effects run; if `setInputEnabled`/`interrupt` throws, the camera stays locked forever
  because no lease was returned to release.
- **L-4** `src/components/SaveLoad.tsx:386` vs `src/App.tsx:423` — a successful load schedules two
  competing focus calls in the same frame (`requestAnimationFrame(onFocusMap)` and the App's
  `focusCountry` rAF). They converge today only because both resolve to the same `tabindex="0"` path;
  order is not guaranteed and produces a double `focus.map` event / tooltip flicker.
- **L-5** `src/hooks/useCompositionLoadTransaction.ts:202-204,230-232,246` — the cancelled/aborted
  early returns do not clear `activeController`, leaving an aborted controller referenced until the
  next `load()`.
- **L-6** `src/hooks/useCompositionLoadTransaction.ts:272-278` — with no reconciled selection the load
  focuses `scene.selectableEntityIds.values().next().value`, i.e. an arbitrary first country. Loading
  a composition with nothing selected therefore parks keyboard focus on a country the user never
  chose.
- **L-7** Divergent "selectable" predicates: `scene.ts:19-27` (`hasSelectableIdentity`, includes
  `isSafeStableCountryId`), `MapCanvas.tsx:168-176` (`feature.isSelectable`), `App.tsx:211-215`
  (`feature.isSelectable`). They agree only because `geojson.ts:206-221` currently couples the flags;
  any relaxation makes the duplicate guards and `reconcileSelectionForScene` disagree silently.
- **L-8** `src/hooks/useCompositionSaveTransaction.ts:100-106` — "live camera" during an in-flight
  Locate/reset transition is a mid-animation frame. Saving mid-transition persists an intermediate
  camera. Defensible by definition, but undocumented and only avoided in E2E by an explicit
  settle-wait helper.
- **L-9** `src/hooks/useCompositionSaveTransaction.ts:166-178` — `state` is computed and stored but no
  consumer reads `saveTransaction.state`; every save triggers a dead re-render of `App`. Similarly
  `CompositionLoadTransaction.dispose()` is never called (the hook cleanup only unsubscribes and
  cancels).

## 4. Verdict

**INTEGRATION VERDICT: REJECT**

The stack's headline structural claims hold up under byte-level scrutiny: the modern-catalog boundary
for search/Locate, the separate `locateFeatures` channel, the non-locking live-camera save, the single
keyed map owner across 1200px, the `__zoom` synchronisation on every paint/restore/settle/reattach,
the pre-mutation rollback capture, render-timed load focus, the one-canonical-SVG export with
`[data-editor-only]` stripping and outermost-`finally` lease release, and the listbox/legend
separation are all genuinely implemented, and every hard safety constraint (no `public/data`/`data`
change, no dependency/manifest/env/backend change, no planning-state or downstream-summary edits,
historical GeoJSON only as an in-memory Playwright fixture) is satisfied. It is nonetheless not
integrable: three defects survive that the passing suites do not cover. A collapsed Legend panel
leaves a stale validation result that permanently and misleadingly disables PNG export (H-1); the
country browser still selects and colors entities that the active scene does not contain, producing
three mutually contradictory UI surfaces and silently discarded work in exactly the historical flow
blocker #1 governs (H-2); and the responsive fix quietly deleted the spec-mandated desktop inspector
shell and its `complementary` landmark (H-3) without disclosure. Fix H-1 through H-3, address M-1
(unguarded render-time throws with no error boundary) and M-3 (fail-open feature fallback), then
resubmit for re-review of the same aggregate range.

---

_Reviewed: 2026-07-25_
_Reviewer: independent integration reviewer (gsd-code-reviewer)_
_Depth: deep, read-only; no unit/E2E execution performed_
