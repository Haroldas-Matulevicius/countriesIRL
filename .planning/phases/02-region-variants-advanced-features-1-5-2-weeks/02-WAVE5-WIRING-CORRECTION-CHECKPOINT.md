# Phase 2 Wave 5 Wiring Correction Checkpoint

## Review identity

- **Worktree:** `C:\Users\matul\ClaudeProjects\CountriesIRL\.claude\worktrees\agent-a7d36e7ddf6a00457`
- **Branch:** `worktree-agent-a7d36e7ddf6a00457`
- **Required baseline:** `b910875e65d91cc3113137f6f57610ca1e26874a`
- **Known starting HEAD:** `51eabd4223564a573ec17059517772970b45622e`
- **Exact corrected product/test HEAD before this checkpoint-only commit:** `7ab0601e64feb415a9478bb975b212259a898982`
- **Checkpoint containing commit:** Resolve with `git log -1 --format=%H -- .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-WAVE5-WIRING-CORRECTION-CHECKPOINT.md`. A Git commit cannot embed its own hash without changing that hash.
- **Branch continuity:** Preserved; no branch change, reset, stash, clean, rewrite, merge, or cherry-pick occurred.
- **Primary checkout:** Read-only for the explicitly required current instructions and handoff artifacts; no primary-checkout file was changed.
- **State before checkpoint creation:** Clean at product/test HEAD `7ab0601e64feb415a9478bb975b212259a898982`.
- **Required post-checkpoint state:** Clean after the checkpoint commit.

## Commits made during corrective execution

| Commit | Subject | Disposition |
|---|---|---|
| `ceff26d7151961f486bcec99458f53f4d9e368af` | `fix(2-wiring): preserve one live composition owner` | Corrected modern-catalog separation, stable responsive ownership, atomic load rollback/focus, D3 camera wiring, and duplicate scene identity rejection. |
| `48f8c1643fa92b378150d0704512723f968671db` | `fix(2-feedback): surface composition load warnings` | Routed legacy migration and repaired-composition warnings through SaveLoad and the safe ToastRegion allowlist. |
| `6033d9f33dbdc025e13689331a0fa98a00a185f6` | `fix(2-export): preserve the canonical legend clone` | Required one canonical SVG, retained legend content, and removed editor-only legend controls from the PNG clone. |
| `3c2109d00c7db51a1978446361cd1dfa05cee625` | `test(2-wiring): prove corrected composition behavior` | Added real-App coverage for modern-only browser/Locate, historical map interaction, settled live-camera save, responsive owner identity/focus/order, D3 `__zoom`, legend/export, and failure recovery. |
| `1e8cda22fe6f98492e2b5300b3baf4ce7273168b` | `fix(2-feedback): preserve material creator warnings` | Preserved simultaneous composition/storage warning details and safely allowed exact bounded legend announcements. |
| `7ab0601e64feb415a9478bb975b212259a898982` | `fix(2-legend): separate editing from the map listbox` | Scoped listbox semantics to the country subtree while keeping one editable/exported in-SVG legend as a sibling. |

The inherited unintegrated stack immediately before these commits remained:

- `8465f66` — live navigation operations
- `2e08f55` — blocked-load atomicity
- `ab8cb95` — duplicate selectable rejection
- `fbd53d1` — composition transaction wiring
- `51eabd4` — live composition product-flow tests

Those inherited commits and the six corrective commits above remain unintegrated and require fresh independent review as one aggregate diff from `b910875e65d91cc3113137f6f57610ca1e26874a`.

## Ten recovered blocker dispositions

| # | Recovered blocker | Disposition | Evidence |
|---|---|---|---|
| 1 | Country browser and Locate could be rebound to active historical identities. | **Resolved.** Both consume only `geoData.countryMetadata` and `geoData.coreLookup`, the validated 195-core modern catalog. Historical-only entities remain map click/keyboard interactions. | Country/Locate focused tests and historical real-App E2E. |
| 2 | Locate during a historical scene needed modern target geometry without making historical entities searchable. | **Resolved.** `MapCanvas` receives separate modern `locateFeatures`; the active effective scene still owns visible/selectable paths. | Historical real-App E2E rejects `Holy Roman Empire` in both browser and Locate, then locates Germany. |
| 3 | A save activated after Locate could persist stale committed camera state. | **Resolved and proven.** Save still calls the current handle's non-locking `readCurrentCamera()` synchronously; E2E waits for the settled visible frame and compares all persisted semantic camera fields to that frame. | Save transaction unit ordering plus historical real-App E2E. |
| 4 | Responsive transitions could remount or replace the camera owner. | **Resolved structurally.** One keyed map workspace remains a direct child of one active React workspace while keyed siblings change DOM order at 1200px. No CSS reorder and no duplicate/hidden map are used. | E2E sentinel survives desktop→compact→desktop, camera transform and country focus survive, and exactly one SVG remains. |
| 5 | Desktop map-first DOM/focus order could be lost while preserving compact action-first order. | **Resolved.** Desktop direct-child order is map then actions/inspector; compact direct-child order is actions then map. | Real-App responsive DOM-order assertions. |
| 6 | D3's internal `__zoom` could drift from the painted camera transform. | **Resolved and covered.** Every paint, restore, freeze settlement, and input reattachment writes the constrained transform to both the camera group and SVG `__zoom`. | Real-App navigation, load, and Locate synchronization assertions. |
| 7 | A post-restore load failure could leave partial provider, scene, camera, history, selection, or baseline state. | **Resolved.** Load captures rollback state before mutation and restores camera, active scene, map state/history/selection, composition, and baseline when any commit stage fails. | Parameterized load-transaction rollback tests. |
| 8 | Loaded focus could run before the new scene rendered. | **Resolved.** Load requests focus only after commit; App applies it from a layout effect on the rendered effective scene and then the dialog's successful-load path focuses the logical map. | Load transaction tests and historical focused-path E2E. |
| 9 | Duplicate feature, source/fallback, or selectable identities could silently reach rendering. | **Resolved fail-closed.** Historical normalization rejects duplicate feature/source/selectable entries, effective-scene composition throws on duplicate feature/source/selectable identities or undeclared modern-fallback collisions, and MapCanvas rejects invalid scene arrays defensively. | Scene, historical-validation, and MapCanvas tests. |
| 10 | Legend/export wiring or export freeze cleanup could regress while fixing composition ownership. | **Resolved for the already-integrated wiring.** The live legend is inside the one canonical SVG after the camera group; export retains legend content, removes editor-only controls, requires one SVG, freezes/releases through the existing outer `finally`, and restores input on success/failure. | Export unit tests, legend Chrome tests, and real-App export success/failure/frozen-load E2E. |

## Independent-review finding dispositions

| Finding | Disposition |
|---|---|
| 1. Keep browser/Locate on modern 195-core; historical-only map interactions only. | **Resolved.** Tests that encoded historical browser/Locate membership were corrected. |
| 2. Resolve historical real-App live-camera save after Locate. | **Resolved.** The fixture's historical ring orientation was corrected, Locate uses a modern catalog target, the camera is observed until settled, and saved semantic camera equals the settled visible frame. |
| 3. Preserve one stable owner and binding 1200px React composition with desktop map-first order. | **Resolved structurally with keyed sibling movement.** One map subtree persists; no CSS order, duplicate map, hidden workspace, or second controller. |
| 4. Surface legacy migration and composition repair warnings. | **Resolved.** Exact UI-SPEC warning copy is emitted at warning severity and passes the safe-message guard. |
| 5. Preserve D3 sync, blocked-load atomicity, rollback, render-timed focus, identity rejection, legend/export, and freeze behavior. | **Resolved and separately evidenced in the ten-blocker table and final gates.** |
| 6. Reconcile downstream ownership without silently completing plans. | **Honored.** No plan summary, STATE, ROADMAP, REQUIREMENTS, handoff, source approval, factual approval, or historical promotion was created or changed. See ownership caveats below. |
| 7. Restore/extend focused tests. | **Resolved.** Coverage now includes App composition, MapCanvas/camera, load/save transactions, SaveLoad/Toast feedback, scene/historical validation, responsive owner/order/focus, legend/export, and real-App historical composition. |
| 8. Run focused, full, lint, strict TypeScript, world-data, build, Chrome composition, and touched-navigation/Locate/export gates. | **Completed.** Exact results are recorded below. |
| 9. Confirm no historical public asset/catalog/source approval/production snapshot. | **Confirmed.** Aggregate `public/data` and `data` diff from baseline is empty. |

## Verification commands and exact results

### Diagnostic and focused iterations

| Command | Result |
|---|---|
| `npm test -- src/App.test.tsx src/components/MapCanvas.test.tsx src/hooks/useCompositionLoadTransaction.test.tsx src/hooks/useCompositionSaveTransaction.test.tsx src/components/SaveLoad.test.tsx src/components/ToastRegion.test.tsx src/utils/scene.test.ts src/utils/historicalValidation.test.ts src/utils/export.test.ts` | Initial diagnostic PASS: 9 files, 75 tests. |
| `npm run test:e2e -- --project=chrome tests/e2e/phase2-composition.spec.ts` | Initial diagnostic: 6/7 passed; historical save exposed zoom `2`. Root cause included a historical-only Locate contract error and a counter-clockwise D3 spherical test ring that represented the polygon complement. |
| `npm run test:e2e -- --project=chrome tests/e2e/phase2-composition.spec.ts --grep "historical scene"` | Final focused historical rerun PASS: 1/1. |
| `npm run test:e2e -- --project=chrome tests/e2e/phase2-composition.spec.ts` | Final focused composition PASS: 7/7. |

### Initial authoritative gates at product/test HEAD `3c2109d00c7db51a1978446361cd1dfa05cee625`

| Command | Exact result |
|---|---|
| `npm test -- src/App.test.tsx src/components/MapCanvas.test.tsx src/components/CountryList.test.tsx src/components/LocateCountry.test.tsx src/hooks/useCompositionLoadTransaction.test.tsx src/hooks/useCompositionSaveTransaction.test.tsx src/components/SaveLoad.test.tsx src/components/ToastRegion.test.tsx src/utils/scene.test.ts src/utils/historicalValidation.test.ts src/utils/export.test.ts` | PASS: 11 files, 88 tests. |
| `npm test` | PASS: 31 files, 333 tests. |
| `npm run lint` | PASS: ESLint completed with no errors or warnings. |
| `npm exec tsc -- -b --pretty false` | PASS: strict project TypeScript build completed with no diagnostics. |
| `npm run data:world:check` | PASS: 248 units and 195 selectable core states. |
| `npm run build` | PASS: 627 modules transformed; production bundle generated. Vite emitted its existing non-blocking >500 kB chunk advisory. |
| `npm run test:e2e -- --project=chrome tests/e2e/phase2-composition.spec.ts` | PASS: 7/7. |
| `npm run test:e2e -- --project=chrome` | PASS: 18/18 across legend, Locate/country search, navigation, responsive composition, camera, save/load, and export. |
| `git diff --check b910875e65d91cc3113137f6f57610ca1e26874a..HEAD` | PASS: no whitespace errors. |
| `git diff --name-status b910875e65d91cc3113137f6f57610ca1e26874a..HEAD -- public/data data` | PASS: empty output; no historical/public data change. |

No dependency install, package manifest change, environment secret, authentication, deployment, backend, or network service was introduced.

## Follow-up independent-review blocker dispositions

| # | Verified blocker | Final disposition |
|---|---|---|
| 1 | A composition warning could hide a simultaneous `corrupt-data` warning about omitted colors. | **Resolved.** `getLoadFeedback` now emits every applicable approved warning sentence in deterministic legacy → repair → omitted-color order. The Toast sanitizer accepts only the finite generated combinations. Focused tests cover both legacy+corrupt and repaired+corrupt outcomes. |
| 2 | Legend move/reorder announcements were reduced to generic `Map updated.` feedback. | **Resolved.** Exact first-entry, corner move, custom position, order, and bounded dynamic reorder announcements survive the safe-message guard. Dynamic labels are limited to 32 safe text characters and positions are constrained to `1..count`, with `count <= 30`; invalid variants still fail closed. |
| 3 | The focusable `Move legend` SVG control was nested under the map `role=listbox`. | **Resolved structurally.** The canonical SVG remains singular. `role=listbox`, its label, and multiselect semantics now belong only to the D3 countries group inside the camera layer. The one live/editable/exported legend remains a sibling after the camera group, so its focusable move target is outside the listbox while keyboard movement and clone sanitization remain unchanged. |

The modern 195-core CountryList/Locate boundary, historical interaction policy, camera owner, export freeze, historical catalog, and downstream plan statuses were not changed by this follow-up.

### Authoritative follow-up gates at product/test HEAD `7ab0601e64feb415a9478bb975b212259a898982`

| Command | Exact result |
|---|---|
| `npm test -- src/components/SaveLoad.test.tsx src/components/ToastRegion.test.tsx src/components/MapCanvas.test.tsx src/components/LegendEditor.test.tsx src/utils/export.test.ts` | PASS: 5 files, 42 tests. |
| `npm test` | PASS: 31 files, 337 tests. |
| `npm run lint` | PASS: ESLint completed with no errors or warnings. |
| `npm exec tsc -- -b --pretty false` | PASS: strict project TypeScript completed with no diagnostics. |
| `npm run data:world:check` | PASS: 248 units and 195 selectable core states. |
| `npm run build` | PASS: 627 modules transformed; production bundle generated. Vite emitted the existing non-blocking >500 kB chunk advisory. |
| `npm run test:e2e -- --project=chrome tests/e2e/phase2-composition.spec.ts` | PASS: 7/7. Includes real-App proof that the one editable legend is outside the country listbox. |
| `npm run test:e2e -- --project=chrome` | PASS: 18/18 across legend, Locate/country search, navigation, camera, responsive composition, save/load, and export. |
| `git diff --name-status b910875e65d91cc3113137f6f57610ca1e26874a..HEAD -- public/data data` | PASS: empty output; no historical/public data change. |

## Downstream ownership caveats

- Plans `02-18`, `02-20`, `02-21`, `02-22`, `02-23`, and `02-30` remain incomplete and were not marked complete.
- No `02-18/20/21/22/23/30-SUMMARY.md` file was created or changed.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/HANDOFF.json`, and the canonical Phase 2 `.continue-here.md` were not edited.
- This correction necessarily touches wiring that anticipates those downstream plans because the inherited unintegrated Wave 5 stack had already composed legend, complete save/load, export, feedback, and App boundaries. These changes are correction-only for safe aggregate behavior; they are not evidence that downstream dependency gates, plan tasks, summaries, human approvals, final detached-worktree verification, or acceptance are complete.
- Historical plans remain governed by the recorded critical path. No historical geometry, source/license approval, factual approval, catalog promotion, or delivery claim is implied.

## Historical promotion safety confirmation

- No file under `public/data` or `data` differs from baseline `b910875e65d91cc3113137f6f57610ca1e26874a` in this stack.
- No historical production asset was added.
- No historical catalog entry was added or promoted.
- No source-readiness, source/license approval, factual approval, production snapshot, or delivery-counted record was added.
- The historical GeoJSON used by E2E exists only as an in-memory Playwright route fixture inside `tests/e2e/phase2-composition.spec.ts`.

## Independent integration review readiness

**Ready for another independent integration review: YES, with caveats.**

The exact corrected code/test bytes are at `7ab0601e64feb415a9478bb975b212259a898982`; this checkpoint is the only subsequent documentation artifact. The stack is not integration-approved, does not complete downstream plans, and must still be independently reviewed as an aggregate diff from `b910875e65d91cc3113137f6f57610ca1e26874a` before any merge or cherry-pick into the primary checkout.

The reviewing agent must bind its decision to the exact checkpoint-containing commit reported by Git and confirm the worktree is clean.

---

# Appendix — Integration review remediation (02-WAVE5-INTEGRATION-REVIEW.md)

Applied in the same worktree/branch as above, on top of `8f1968b`. Each finding
is one atomic commit. No `public/data` or `data` file, dependency, manifest,
lockfile, `vite.config`/`tsconfig`, planning-state file, or downstream plan
summary was touched; the only `.planning` edit is this appended appendix.

## Disposition

| Finding | Disposition | What changed |
|---|---|---|
| H-1 stale legend validation permanently disables export | FIXED | Gate derived in `App` from `compositionState.legend` + `effectiveColors` + `legendBounds` through the new shared `validateActiveLegend`; `LegendEditor.onValidationChange` removed. The gate blocks only on issues the editor reports to the user (`getLegendBlockingMessage`), because the default legend position sentinel `{x:0,y:0}` is `invalid-position` and gating on the raw `ok` flag blocked export on a fresh app (verified in Chrome). |
| H-2 browser selects entities absent from the scene | FIXED | `App` derives `effectiveSelectableIds` from `effectiveCountryLookup`; `CountryList` keeps the modern 195-core catalog visible/searchable but disables rows outside the scene, limits `Select Visible` to in-scene ids, and rejects out-of-scene toggles. |
| H-3 desktop inspector shell deleted | FIXED | `<aside class="workspace__control-column">` restored as a keyed sibling (`key="inspector"`) of the keyed map, with the `max-height`/`overflow-y`/`overscroll-behavior: contain` rule and the `complementary` landmark. |
| M-1 unguarded render-time throws, no error boundary | FIXED | New `ErrorBoundary` (renders children with no wrapper) around the workspace in `App` and around the provider tree in `main.tsx`; both fall back to `FatalErrorState`. |
| M-3 fail-open feature fallback | FIXED | `MapWorkspace.features` is required and explicitly nullable; a null scene renders `FatalErrorState` instead of the modern world. |
| M-2 stale `pendingLoadedFocusId` | FIXED | The focus request is consumed whether or not the target is in the scene. |
| M-5 dropped historical entries discarded | FIXED | `EffectiveScene.assetWarnings` carries the validator warnings; the load transaction maps them to the existing `composition-repaired` warning. |
| M-6 legend reorder allowlist | FIXED | Label bounded by length (32) and escaped by React; guard stays fail-closed for control/format characters. |
| L-1 dead `frameId`/`cancelFrame` | FIXED | Removed from the driver contract, implementation, call sites, and test harness. |
| L-3 freeze count incremented before side effects | FIXED | Lease counted only after the driver side effects succeed; a failed freeze best-effort renews input. |
| L-5 `activeController` left set on cancel/abort | FIXED | All release points go through `releaseController`, which only clears when the reference still points at that request. |
| M-4 load atomicity relies on dispatchers throwing | NOT ADDRESSED | Out of the requested scope; the review itself records the rollback machinery as correct and only the claim as overstated. |
| L-2, L-4, L-6, L-7, L-8, L-9 | NOT ADDRESSED | Explicitly out of scope for this remediation. |

## Corrected tests

Two pre-existing tests encoded behavior these fixes reverse and were corrected:

- The desktop DOM-order assertions in `real app saves and loads the complete composition after responsive rebinding` asserted the flattened `main > .workspace__actions` layout that H-3 restores. They now assert `main` children are exactly `[workspace__map, workspace__control-column]`, the inspector holds the four sections in order, its computed `overscroll-behavior-y` is `contain`, compact stays actions-first, and both layouts keep exactly one `svg.map-canvas`.
- The Playwright fixtures `tests/e2e/fixtures/locate.html` and `tests/e2e/fixtures/legend.html` constructed `CountryList` / `LegendEditor` directly and were updated to the corrected props (the legend fixture now derives its export gate with `validateActiveLegend`, exactly as `App` does).

## Gate results

| Gate | Result |
|---|---|
| `npm test` | PASS — 32 files, 349 tests |
| `npm run lint` | PASS — no findings |
| `npm exec tsc -- -b --pretty false` | PASS — no output |
| `npm run data:world:check` | PASS — 248 units, 195 selectable core states |
| `npm run build` | PASS |
| `npm run test:e2e -- --project=chrome` | PASS — 19/19 (18 baseline + 1 new H-1 regression) |
| `git diff --name-status b910875..HEAD -- public/data data` | PASS — empty |

---

# Re-review remediation (02-WAVE5-REREVIEW.md)

Applied on top of `fcd79df` after the independent re-review returned REJECT.

## Disposition

| Finding | Status | Commit | Notes |
|---|---|---|---|
| **HI-1** overflowing legend silently exportable | FIXED | `e74f11f` | Preferred fix taken: the rendered/exported/displayed/validated position is now derived from live bounds at one chokepoint (`resolveLegendPosition` / `resolveLegendRender` in `utils/legend.ts`). `preset !== null` is authoritative; custom positions are re-clamped. `invalid-position` is now **unreachable** through `validateActiveLegend` for any legend whose bounds fit the canvas, not merely non-blocking — a test pins that, and a second test pins that the raw `validateLegend` still reports it for a stale stored value. The gate was **not** re-armed, so the H-1 "always clearable" property is untouched. Regression coverage: 8→9 with a right-edge drag, 16→17, and a preset tracking its corner — as unit tests over the rendered transform, as resolver unit tests, and end to end including an assertion that the export clone carries the full legend frame. |
| **§4 / ME-4** two divergent legend defaults | FIXED | `6bb4e45` | One exported `DEFAULT_LEGEND_POSITION = {x:32, y:32, preset:'top-left'}` + `DEFAULT_LEGEND_BACKGROUND_OPACITY = 90` in `utils/legend.ts`; the provider derives `DEFAULT_LEGEND` from `createDefaultLegendState()`. `backgroundOpacity` is a single 0-100 scale end to end — `validateLegend` moved off 0-1, `validateActiveLegend` no longer divides, and `LegendOverlay.getBackgroundOpacity` was tightened to the single scale. Test: fresh map, provider initial state, and the legacy-migration snapshot all produce the same legend. |
| **ME-1** misleading export-failure toast | FIXED | `14a40cb` | A legend-blocked export now reports `getLegendBlockingMessage`'s own sentence with no `Try Export Again`; genuine failures keep the existing message and retry. Both strings added to `APPROVED_STATIC_MESSAGES` as exact literals, allowlist still fail-closed (a near-miss variant degrades to the generic error — tested). `getLegendBlockingMessage` moved to `utils/legend.ts` (also closes LO-7). |
| **ME-2** 1200px transition remounts the inspector | FIXED | `aeb9cbb` | Search query, custom colour draft, Legend disclosure expansion and Locate combobox state lifted into `useInspectorUiState`, held above the responsive branch. The four components take them as required props (a caller that forgets to lift fails to compile). Map fiber untouched — camera-owner sentinel, single `svg.map-canvas`, and desktop/compact DOM order all still asserted, plus a new E2E for the preserved state in both directions. |
| **ME-3** ErrorBoundary tests | FIXED | `4251cff` | Hand-mutation test removed. New E2E serves a duplicate-`sourceFeatureId` world asset so `composeEffectiveScene` throws in App's own `useMemo` — React's real catch path, in a real browser, for the boundary only `main.tsx` can provide. Unit tests mock the boundary module and assert both wirings (App inside the workspace landmark; `main.tsx` at the root). `react-dom/server` does not run error boundaries and this suite has no DOM, so the genuine catch is asserted at E2E level rather than by faking state. |
| **LO-1** CRLF-rewritten `LegendEditor.test.tsx` | FIXED | `2525e4f` | Renormalized to LF (`git add --renormalize`), stray lone CRs stripped; `git diff --ignore-cr-at-eol` for that commit is the 2-line real change. |
| **LO-7** classifier in a component module | FIXED | `14a40cb` | Moved to `utils/legend.ts` next to `validateActiveLegend`; behaviour unchanged. |
| LO-2, LO-3, LO-4, LO-5, LO-6 | NOT ADDRESSED | Out of scope for this pass, per instruction. LO-2 in particular remains a live prerequisite for plan 02-18: a `setSnapshotId` caller must reconcile the selection in the same commit. |

## Gate results (re-review remediation)

| Gate | Result |
|---|---|
| `npm test` | PASS — 33 files, 364 tests (was 32 / 349) |
| `npm run lint` | PASS — no findings |
| `npm exec tsc -- -b --pretty false` | PASS — no output |
| `npm run data:world:check` | PASS — 248 units, 195 selectable core states |
| `npm run build` | PASS |
| `npm run test:e2e -- --project=chrome` | PASS — 23/23 (was 19/19) |
| `npm run test:e2e -- --project=msedge` | PASS — 23/23 (was 14) |
| `git diff --name-status b910875..HEAD -- public/data data` | PASS — empty |
| `git diff --name-status b910875..HEAD -- package.json package-lock.json vite.config.ts vitest.config.ts tsconfig*.json` | PASS — empty |
