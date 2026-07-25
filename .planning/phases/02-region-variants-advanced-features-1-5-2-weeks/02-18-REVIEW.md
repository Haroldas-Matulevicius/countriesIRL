---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "18"
type: adversarial-code-review
reviewed: 2026-07-25
base: 9c90b14
head: 6f571e2515e531e5ff423b97eb745caaaa19a35d
depth: deep
files_reviewed: 28
findings:
  critical: 0
  high: 1
  medium: 4
  low: 6
  total: 11
status: issues_found
verdict: REJECT
---

# Plan 02-18 — Independent Code Review

Scope: `git diff 9c90b14..6f571e2` (4 commits, 28 files, +2296/-39). Reviewed against
the RESCOPED 02-18-PLAN, 02-DESCOPE-DECISION, 02-WAVE5-REREVIEW finding LO-2, and
UI-SPEC §§9/10/14/17/20/22. Tests were **not** run (per instruction); every claim
below is read off the bytes at `6f571e2`.

---

## 0. Hard-safety gate — PASS

| Constraint | Result |
|---|---|
| `git diff --name-status 9c90b14..6f571e2 -- public/data data` | **empty** ✓ |
| `package.json` / `package-lock.json` / `vite.config.ts` / `vitest.config.ts` / `tsconfig*.json` / `playwright.config.ts` | **empty** ✓ |
| New dependency / jsdom | none; `react@18.3.1`, `d3@7.9.0` unchanged ✓ |
| New historical geometry / source approval / factual approval / catalog entry | none. `SNAPSHOT_CATALOG` (`src/constants/snapshots.ts:10-20`) is byte-identical to base; `public/data/snapshots/index.json` still holds exactly one entry (`modern`) ✓ |
| Deferred snapshots in the selector | impossible — `resolvePeriodOptions` (`src/utils/periods.ts:69-95`) admits an id only if it is in the **live manifest** AND passes `isProductionSelectableSnapshot` AND is in `SNAPSHOT_CATALOG`. The shipped manifest carries only `modern` ✓ |
| Only `.planning` change is the new summary | `A .planning/.../02-18-SUMMARY.md` and nothing else ✓ |

---

## 1. PRIORITY 1 — the LO-2 invariant

### 1.1 Is `commitScene` the only writer of snapshot / active-scene / selection?

**No — the author's claim is false, but the code is nonetheless sound.** Full grep of
`src` (non-test) yields three writers of `activeScene` and two of the reconciled
selection:

| Writer | File:line | Reconciles? |
|---|---|---|
| `commitScene` | `src/App.tsx:474-483` | yes — `reconcileSelectionForScene(selectedIdsRef.current, scene)` |
| `loadResolvedScene` (`loadScene` dep of the load transaction) | `src/App.tsx:407-409` | **not itself**; its caller `useCompositionLoadTransaction.ts:294-298` computes `reconcileSelectionForScene(getSelectedIds(), scene)` and commits it at `:338` in the same synchronous block as `loadScene(scene)` (`:335`) and `loadComposition(...)` (`:337`) |
| `rollbackLoad` | `src/App.tsx:372-388` | restores a previously-consistent `{scene, mapState, compositionState}` triple captured atomically at `:361-371` |

Both reconciliation implementations call the same `reconcileSelectionForScene` and
therefore agree. The invariant holds today. See **M-2** for the maintenance risk.

### 1.2 Is the reconciliation atomic with respect to render?

**Yes.** `commitScene` issues `setActiveScene` (App-local `useState`), `setSnapshot`
(`CompositionStateProvider` reducer) and `replaceSelection` (`MapStateProvider`
reducer) in one synchronous scope. `src/main.tsx:26` uses `createRoot` and
`package.json` pins `react@18.3.1`, so React 18 automatic batching applies **including
inside the `.then()`** at `App.tsx:503-511`. Three different stores, one commit, one
render. No early return sits between them.

Defence in depth is also present for the paranoid case: `effectiveScene`
(`App.tsx:220-225`) refuses to pair a scene with a mismatched snapshot id —
`activeScene?.snapshotId === compositionState.snapshotId ? activeScene : …` — so even a
hypothetical torn commit renders either the correct scene or the fail-closed
`FatalErrorState` (`MapWorkspace.tsx:100-102`), never the wrong scene.

### 1.3 Does the load path go through it, and do they agree?

Separate, and they agree (§1.1). Verified the load path cannot desynchronise scene and
snapshot id: `loadComposition` runs `canonicalizeSnapshotId` (`CompositionStateProvider.tsx:158-160`),
which maps an unknown id to `modern`, while `loadScene` uses the raw id. I traced this
for a divergence: a stored composition carrying `snapshotId: "1700"` survives
canonicalisation (all five ids are in `SNAPSHOT_IDS`), but
`resolveEffectiveSnapshotScene` (`useSnapshotData.ts:227-238`) throws
`SnapshotLoadError('not-approved')` for any id absent from the manifest or failing
`isProductionSelectableSnapshot`, so the load fails with `snapshot-resolution-failed`
before any state is written. No route produces "modern selector label over historical
geometry".

### 1.4 Can `ColorPicker` still colour an out-of-scene id?

**No.** `selectableCountryIds` is a **required** prop (`ColorPicker.tsx:29`), and the
intersection at `:54-60` produces `selectedCountryIds`, which is the *only* array
passed to `setColors` — both at `:86` (presets) and `:114` (custom). Nothing else in
the component reads raw `selectedIds` for a write. `App.tsx:861` passes
`effectiveSelectableIds`, derived from the active scene at `:253-256`. The intersection
is applied to the ids that reach `setColors`, not merely to what is displayed.

### 1.5 Colour continuity across a switch

Correct. `commitScene` never touches the colour map; `getEffectiveSceneColors`
(`App.tsx:257-263`) projects the persistent map onto the incoming scene, so continuing
ids keep their colour and genuinely-new ids fall to `DEFAULT_COLOR`. Verified by
`history.spec.ts:330-338` (round-trip leaves `FRA` at `#FFFFFF`).

### 1.6 Every remaining route to a selection/colour on an absent country

| Route | Gate |
|---|---|
| Map click / keyboard | `handleSelectCountry` → `effectiveCountryLookup.has()` (`App.tsx:635-642`) |
| Outgoing crossfade clone | `data-country-id` stripped, `pointer-events:none` (`MapCanvas.tsx` `makeOutgoingSceneInert`) |
| Country browser row toggle | `validCountryIds` intersected (`CountryList.tsx:116-124`) |
| Country browser "Select Visible" | `selectableVisibleCountryIds` (`CountryList.tsx:112-115,152`) |
| Colour presets / custom | §1.4 |
| Period switch | `commitScene` |
| Composition load | load transaction reconciliation |
| Load rollback | consistent captured triple |
| Loaded-focus request | `effectiveCountryLookup.has(pendingLoadedFocusId)` (`App.tsx:567`) |
| Undo / redo | history stores **colours only** (`MapStateProvider.tsx:172-199`); selection is never restored, so an out-of-scene id cannot be resurrected |
| Locate | camera-only; does not select (unfiltered 195-core catalog preserved, as required) |

**Answer to the standing question: NO.** I could not construct a route by which a
selection or a colour write reaches a country absent from the active scene.

Re-review **LO-4** ("checked + disabled row cannot be unchecked") also stays
unreachable, because `commitScene` unchecks it as part of the same commit;
`history.spec.ts:305-310` asserts exactly that.

---

## 2. Findings

### HIGH

#### HI-1 — The NFR3 warm-switch gate was replaced with a tautology, on a Phase-1-scoped decision
**File:** `tests/e2e/history.spec.ts:471-521`

Plan 02-18 Task 3 `<action>` is explicit: *"Define each sample boundary as committed
select `change`/activation timestamp to the first painted frame where incoming is
ready/full opacity and outgoing is inaccessible/removed … record at least five
subsequent samples … **require every measured warm sample below 500ms** … no cold fetch
or arbitrary sleep may count."* `must_haves.truths[7]` restates the boundary.

What shipped:

```ts
const start = Date.now();
await select.selectOption('1700');
await expect(historicalPath).toHaveCount(1);
await expect(page.locator('[data-layer="outgoing-scene"]')).toHaveCount(0);
samples.push(Date.now() - start);
…
samples.forEach((duration): void => {
  expect(duration).toBeGreaterThanOrEqual(0);   // can never fail
});
```

Three separate defects:

1. **The assertion is a tautology.** `Date.now() - start` is non-negative by
   construction. This test cannot fail on timing under any circumstance, yet the
   summary lists "advisory NFR3 warm-switch samples" under `provides`.
2. **The measurement boundary is not the specified one.** `Date.now()` in the *Node*
   process brackets Playwright IPC plus two `expect` auto-retry loops whose poll
   interval is ~100 ms. The recorded numbers are dominated by harness latency, not by
   "activation → first painted frame". No in-page `performance.mark`/`measure` is used,
   unlike the rest of this codebase (`MapCanvas.tsx:44-50` already defines exactly that
   machinery). The samples annotated as `nfr3-warm-switch-samples-ms` are therefore not
   the quantity NFR3 names.
3. **The justification is out of scope.** The only `D-63` in the repo is
   `.planning/milestones/v1.0/DECISIONS-ARCHIVE.md:71`, whose text is scoped to
   *"Phase 01 release completion … The user explicitly directs that **Phase 1** stop
   gating on millisecond timing."* Nothing extends it to Phase 2. The summary cites
   "per D-63" twice as the authority for dropping a Phase-2 plan gate, and the
   "Deviations from Plan" section does not list this substitution at all.

**Failure scenario:** a future change that makes a warm switch take 4 s — e.g. dropping
the `snapshotCache` hit in `useSnapshotData.ts:243-250`, or letting the crossfade
transition restart per switch — ships green. The only gate that would have caught it
was removed and replaced with an assertion that is true for every possible input.

**Fix (either, explicitly):**
```ts
// in-page boundary, not harness wall clock
const sample = await page.evaluate(async (id) => {
  const select = document.querySelector('select')!;
  performance.mark('switch-start');
  select.value = id;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise<void>((resolve) => {
    const tick = (): void => {
      const ready = document.querySelector(`[data-country-id="${'HIST-HRE'}"]`) !== null
        && document.querySelector('[data-layer="outgoing-scene"]') === null;
      ready ? requestAnimationFrame(() => resolve()) : requestAnimationFrame(tick);
    };
    tick();
  });
  return performance.now() - performance.getEntriesByName('switch-start')[0]!.startTime;
}, '1700');
expect(sample).toBeLessThan(500);
```
…**or** obtain and record an explicit Phase-2 decision that supersedes the plan's
500 ms clause, cite *that* decision (not D-63), and log it under "Deviations from Plan".

*If the project owner rules that D-63 is phase-spanning and the plan's 500 ms clause is
void, HI-1 downgrades to MEDIUM (defects 1 and 2 stand regardless — an assertion that
cannot fail is not evidence) and the verdict flips to APPROVE.*

---

### MEDIUM

#### ME-1 — A failed period load leaves an unclearable error status and a permanent retry button
**File:** `src/App.tsx:524-532` with `:808-820`

`periodLoad` is only ever moved out of `error` by `startPeriodLoad`, and
`handlePeriodChange` early-returns when the requested id already equals the committed
one:

```ts
const handlePeriodChange = useCallback((snapshotId: SnapshotId): void => {
  if (snapshotId === compositionRef.current.snapshotId) { return; }   // App.tsx:526
  startPeriodLoad(snapshotId);
}, [startPeriodLoad]);
```

After a failed switch to `1700`, the committed id never moved, so the `<select>` still
reads `modern` (`CompositionBar.tsx:57`). Re-choosing Modern in a native select fires
**no `change` event at all**, and even if it did, `:526` swallows it. Result:
`periodStatusMessage` is pinned at *"We couldn't load 1700 — Post-Westphalia Europe. The
previous map period is still shown. Try again."* and `Try Period Again`
(`App.tsx:831-833`) stays mounted for the rest of the session. The only escapes are a
successful retry or a page reload.

**Failure scenario:** user's network blips once on a historical switch; the composition
bar then permanently accuses the app of a failure that is no longer true, in a
`role="status"` live region wired as the select's `aria-describedby`, so every
subsequent focus of the period control re-announces the stale failure.

**Fix:** clear the error when the user re-selects the committed period, and give the
status a dismissal path:
```ts
const handlePeriodChange = useCallback((snapshotId: SnapshotId): void => {
  if (snapshotId === compositionRef.current.snapshotId) {
    setPeriodLoad({ status: 'idle' });   // the user has acknowledged the failure
    return;
  }
  startPeriodLoad(snapshotId);
}, [startPeriodLoad]);
```

#### ME-2 — Two independent implementations of the LO-2 invariant; no chokepoint
**Files:** `src/App.tsx:407-409,474-483`; `src/hooks/useCompositionLoadTransaction.ts:294-298,335-338`

The summary states *"`commitScene` … is the only path that commits a scene."* It is not
(§1.1). `loadScene` + `loadComposition` + `replaceSelection` in the load transaction is
a second, structurally identical commit written out longhand across four dependency
calls, and `rollbackLoad` is a third. All three are correct **today**, but the
invariant is now enforced by convention across two modules rather than by a single
function. The next author who adds a scene commit (02-20/02-21/02-26 are listed as
`affects`) has no compiler-visible chokepoint to route through and no failing test if
they forget.

**Fix:** have the load transaction call the same `commitScene` (extend it to accept the
composition/colour payload), or, minimally, make `EffectiveScene` commits go through a
single exported helper in `src/utils/scene.ts` that returns the reconciled triple, and
have both call sites destructure it. Then correct the summary's claim.

#### ME-3 — A single period switch fires three competing live regions
**Files:** `src/components/CompositionBar.tsx:82-88`; `src/App.tsx:494,602-605,971-979`

A switch produces, in the same commit: (a) `CompositionBar`'s new
`<p role="status" aria-live="polite">` status line changing to the coverage sentence,
(b) the `ToastRegion` announcing `Showing {label}.`, and (c) the selection live region
announcing `N countries selected.` when reconciliation drops ids. Three polite regions
queue serially; on NVDA/JAWS the user hears a ~3-sentence burst per switch, and the
same element (b/c) is also the select's `aria-describedby` target, so it is re-read on
focus.

**Fix:** collapse (a) and (b) — the composition-bar status is persistent visible text
and does not need `aria-live` when the toast already announces the same event. Drop
`aria-live="polite"` from `CompositionBar.tsx:86` and keep `role="status"` off it
(leave it a plain `<p>` referenced by `aria-describedby`), or suppress the toast when
the status line carries the same information.

#### ME-4 — The manifest-label trust-boundary E2E assertion is near-vacuous
**File:** `tests/e2e/history.spec.ts:257-259`

```ts
await expect(select.locator('option')).not.toContainText([
  'manifest label', 'manifest label',
]);
```
Playwright's array form of `toContainText` asserts element *i* contains string *i*;
negated, it passes as soon as **any one** element mismatches. Option 0 is
`Modern — current borders`, which never contains `manifest label`, so this assertion
passes unconditionally — including in a world where option 1 renders the hostile
manifest label verbatim.

The trust boundary itself **is** genuinely covered, by the exact
`toHaveText([MODERN_PERIOD_LABEL, HISTORICAL_PERIOD_LABEL])` two lines above
(`:253-256`) and by `src/utils/periods.test.ts:96-105`, and the mechanism is real:
`resolvePeriodOptions` reads the label from `APPROVED_PERIOD_LABELS`
(`periods.ts:76,85`) and never from `entry.label`. So this is a misleading test, not a
hole. But it advertises protection it does not provide, and a reader trimming the
"redundant" exact assertion above it would silently lose the boundary.

**Fix:** replace with a per-option negative, e.g.
`await expect(select).not.toContainText('manifest label');`

---

### LOW

#### LO-1 — An empty incoming scene leaves the previous scene live *and* clones it
**File:** `src/components/MapCanvas.tsx` (crossfade effect ~`:413-466`; join effect guard `wrappedScene.length === 0`)

The join effect returns early when the wrapped scene is empty, leaving the old paths in
`[data-layer="countries"]`. The crossfade effect has already cloned those same paths
into the inert host and animated the live layer `0 → 1`. Net result for a zero-feature
commit: the previous scene's fully interactive, `role="option"`, `data-country-id`
paths remain reachable under the new `aria-label`, alongside a ghost duplicate.
`features={[]}` is a representable state (`MapWorkspace.test.tsx:171-182` renders it),
though no production path currently produces it. Suggest clearing the layer when
`wrappedScene.length === 0` instead of returning.

#### LO-2 — Crossfade has no fallback if the d3 timer never runs
**File:** `src/components/MapCanvas.tsx` (`countriesLayer.style.opacity = '0'` before `.transition(...)`)

Opacity is set to `0` synchronously and only restored by the transition's `end` handler.
d3 transitions are rAF-driven, so in a backgrounded/throttled tab a switch leaves the
map invisible until the tab is foregrounded. `finalizeSelectedScene()` recovers it, but
nothing calls that except export. Consider `requestAnimationFrame`-guarding the fade or
restoring opacity on effect cleanup.

#### LO-3 — Stale Europe copy still ships in `src`
**File:** `src/components/SaveLoad.tsx:470` — `placeholder="Example: Europe summer map"`

The world-copy sweep covered `FatalErrorState`, `MapWorkspace` loading text and the map
label, but this user-visible placeholder still frames the product as a Europe tool.
(`src/utils/mapProjection.ts:45 createFixedEuropeProjection` and
`public/data/README.md` are code/asset identifiers, not copy — out of scope.)

#### LO-4 — Dead-ish Modern branch produces a spurious "loading" state
**File:** `src/App.tsx:491-501`

When `snapshotId === 'modern'` but `modernSceneRef.current === null`, control falls
through to the async branch, which sets `{status:'loading'}` and then calls
`resolveScene`, which rejects immediately (`App.tsx:394-396`) because `geoData` is not
ready — the only condition under which `modernScene` is null (`:210-219`). So the
branch can only ever flash "Loading Modern — current borders borders…" and then a
failure. Prefer an explicit guard that reports the world-loading state instead.

#### LO-5 — The manifest is fetched twice and the two reads are not tied together
**Files:** `src/hooks/useSnapshotCatalog.ts:34-44`; `src/hooks/useSnapshotData.ts:210-238`

`useSnapshotCatalog` reads `/data/snapshots/index.json` once at mount to decide *which
options the user sees*; `resolveEffectiveSnapshotScene` re-fetches the same manifest on
every historical switch to decide *what is loaded*. The approval decision the user acted
on is not the one that gates the load. Not exploitable — the loader independently
re-runs `validateSnapshotManifest` and `isProductionSelectableSnapshot`, so the
authoritative gate is the strict one — but the duplication is a latent
time-of-check/time-of-use seam. Passing the already-validated entries into the resolver
would remove both the seam and the extra request.

#### LO-6 — The `ColorPicker` defence-in-depth unit test does not test the defence
**File:** `src/components/ColorPicker.test.tsx:99-131`

`ignores selected ids the active scene cannot render` renders with
`selectableCountryIds={new Set()}` and asserts only that `Apply Red` carries the
`disabled` attribute. It never asserts that `setColors` is invoked with the *intersected*
array — which is the actual LO-2 mitigation. The behaviour is proven only by the
end-to-end `Apply Red` step at `history.spec.ts:313-317`. Add
`expect(setColors).toHaveBeenCalledWith(['DEU'], '#DC2626')` against a partially-in-scene
set.

---

## 3. Confirmations (no finding)

- **Catalog-driven selector, real trust boundary.** `periods.ts:41-46,69-95` — membership
  from the live manifest, label from `SNAPSHOT_CATALOG` constants. Proven against the
  **real app** (`waitForApp` → `page.goto('/')`) with a routed manifest carrying
  `"1700 — manifest label that must never be shown"` rendering as
  `1700 — Post-Westphalia Europe` (`history.spec.ts:237-259`). This is a genuine
  boundary, not a test artifact.
- **Reset View ownership.** `Reset View` appears in exactly one component
  (`CompositionBar.tsx:78`, via `PERIOD_COPY.resetView`). The split the author kept is
  sound and closes the gap the brief asked about: `MapNavigation.test.tsx:35` and
  `navigation.spec.ts:99` assert **0** in navigation-only fixtures;
  `MapWorkspace.test.tsx:186` asserts exactly **1** in the composed workspace; and
  `history.spec.ts:177-196` asserts **1** *against the real application* (not the
  fixture) and proves it drives the single camera. Zero-or-two cannot ship undetected.
- **World copy.** `Loading world map…` (`MapWorkspace.tsx:92`),
  `We couldn't load the world map` (`FatalErrorState.tsx:12`),
  `Interactive world map, {label}` (`periods.ts:108-110`, `MapCanvas.tsx` listbox
  `aria-label`). Stale assertions updated in `ErrorBoundary.test.tsx` and
  `phase2-composition.spec.ts`. Only LO-3 remains.
- **Crossfade accessibility.** `makeOutgoingSceneInert` strips `role`, `aria-label`,
  `aria-selected`, `data-country-id`, `data-scene-unit-id` and every `<title>`, sets
  `aria-hidden`, `focusable="false"`, `tabindex="-1"` and `pointer-events:none`, and
  renames `data-layer` so the clone can never be re-selected as the live countries
  layer. Applied **before** `append`, so no frame exists with a live duplicate.
  `finalizeSelectedScene()` interrupts the named transition, `replaceChildren()`s the
  host and sets opacity `1` synchronously (`MapCanvas.tsx` handle impl), and it is
  called inside the export freeze (`App.tsx:730`).
- **Toast allowlist stays fail-closed.** `APPROVED_PERIOD_ANNOUNCEMENTS`
  (`periods.ts:128-133`) is built from `PERIOD_COPY.viewReset` plus
  `getShowingPeriodMessage(entry.label)` over `SNAPSHOT_CATALOG` — **constants only**.
  Every producer (`App.tsx:494,510,540`) derives its label through `getPeriodLabel`,
  whose entire fallback chain terminates in `APPROVED_PERIOD_LABELS`. A
  manifest-supplied label cannot reach the live region; `ToastRegion.test.tsx:113-116`
  proves it degrades to `Map updated.`
- **New files beyond the plan's list.** `src/utils/periods.ts` and
  `src/hooks/useSnapshotCatalog.ts` are reasonable decomposition, not scope creep:
  putting the manifest fetch inside `CompositionBar` would have broken the bar's own
  stated "fetches nothing" contract, and inlining copy would have scattered strings
  against `coding-rules/general.md`. Both are disclosed as Deviation 1.
- **Must-not-regress.** One `<svg className="map-canvas">` and one `MapCanvasHandle`
  (`MapCanvas.tsx` render; asserted `MapCanvas.test.tsx:336-361`, `history.spec.ts:171`);
  `data-camera-owner-sentinel` assertions in `phase2-composition.spec.ts:613,708,718,796,827`
  untouched; `<aside key="inspector" className="workspace__control-column"
  aria-label="Map inspector">` and desktop map-first / compact actions-first ordering
  unchanged (`App.tsx:912-933`); `CountryList`/`LocateCountry` still receive the
  unfiltered `countries` with `selectableCountryIds` only disabling rows
  (`App.tsx:890-907`); no new raw `legend.position` read on a render/export path
  (`getLegendPositionLabel` is pre-existing and unchanged); `useInspectorUiState`
  untouched.

---

## INTEGRATION VERDICT: REJECT
