---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready
stopped_at: Planned Plan 01-22 map-ready traversal fix before Plan 01-15 production-preview rerun
last_updated: "2026-07-22T09:00:19-05:00"
last_activity: 2026-07-22 -- Planned the proven map-ready traversal correction and production-preview benchmark rerun
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 22
  completed_plans: 18
  percent: 82
---

# CountriesIRL Map Generator — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-21)

**Core value:** Help non-technical Instagram creators produce accurate, polished European choropleth maps quickly.
**Current focus:** Phase 1 — Foundation & Modern Map

## Current Position

Phase: 1 of 3 (Foundation & Modern Map)
Next plans: 01-22, then 01-15, of 22 in current phase
Execution graph: 22 plans across 15 waves
Status: Map-ready gap diagnosed and planned; Plan 01-22 must complete before the production-preview Plan 01-15 rerun
Last activity: 2026-07-22 -- Planned the proven map-ready traversal correction and production-preview benchmark rerun

Progress: [████████░░] 82%

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 7 min | 1 task | 4 files |
| Phase 01 P02 | 6 min | 3 tasks | 9 files |
| Phase 01 P03 | 13 min | 2 tasks | 6 files |
| Phase 01 P04 | 8 min | 2 tasks | 3 files |
| Phase 01 P05 | 12 min | 3 tasks | 6 files |
| Phase 01 P09 | 8 min | 2 tasks | 3 files |
| Phase 01 P11 | 8 min | 1 task | 2 files |
| Phase 01 P06 | 10 min | 2 tasks | 4 files |
| Phase 01 P07 | 7 min | 3 tasks | 3 files |
| Phase 01 P08 | 7 min | 3 tasks | 5 files |
| Phase 01 P10 | 8 min | 1 task | 1 file |
| Phase 01 P12 | 9 min | 3 tasks | 4 files |
| Phase 01 P13 | 11 min | 2 tasks | 5 files |
| Phase 01 P18 | 2 min | 1 task | 1 file |
| Phase 01 P14 | 3 min | 1 task | 0 files |
| Phase 01 P19 | 2 min | 1 task | 2 files |
| Phase 01 P20 | 10 min | 1 task | 3 files |
| Phase 01 P21 | 2 min | 1 task | 3 files |

## Accumulated Context

### Decisions

- [Phase 1]: React 18, strict TypeScript, Vite, D3 SVG, html2canvas, and localStorage are the locked MVP stack.
- [Phase 1]: The user approved the current Natural Earth 5.1.1 Europe presentation and documented transcontinental inclusion for this release.
- [Phase 1]: Offline means bundled same-origin assets and continued use after load; no service worker or fresh disconnected reload requirement.
- [Phase 1]: Responsive composition uses one active matchMedia-selected React workspace with viewport-correct DOM and focus order.
- [Phase 1]: Historical borders, flexible centering, and legends remain deferred to Phase 2.
- [Phase 1]: Approved only the exact `vitest` package sourced from the `vitest-dev/vitest` repository. — Registry, official documentation, and organization-owned source metadata matched before execution.
- [Phase 1]: Approved only the exact `vercel` package sourced from the `vercel/vercel` repository package directory `packages/cli`. — Registry, official CLI documentation, and organization-owned source metadata matched before execution.
- [Phase 01]: Keep every Plan 01-02 direct dependency exactly pinned; no ranges or generator defaults. — Preserves the approved supply-chain boundary and reproducible React 18 toolchain.
- [Phase 01]: Keep default test execution non-watch for deterministic local and automated runs. — Avoids hanging test processes and gives later plans a stable verification command.
- [Phase 01]: Preserve Plan 01-12 ownership of root index.html; Plan 01-02 does not add a placeholder entry. — Maintains the planned file boundary even though the production build probe cannot resolve an entry yet.
- [Phase 01]: Represent the shared map/list selection as one ReadonlySet of normalized country IDs; display names remain labels only. — Prevents map and bulk-list selection state from diverging.
- [Phase 01]: Use discriminated result contracts for color, GeoJSON, storage, and export boundaries instead of fallback values or ambiguous nulls. — Lets downstream UI translate typed outcomes without allowing invalid state through shared boundaries.
- [Phase 01]: Store every accepted custom color as uppercase #RRGGBB while keeping the exact named UI palette in shared constants. — Gives reducer, persistence, rendering, and export one deterministic color representation.
- [Phase 01]: Expose semantic map operations through useMapState without exposing raw dispatch or creating a second selection store. — Keeps all UI plans on one provider-owned state path and enforces one action per user intent.
- [Phase 01]: Retain at most 50 color-changing actions plus the oldest reachable baseline snapshot, truncating redo history on branch edits. — Implements the approved bounded full-snapshot model while preserving exactly 50 undoable transitions.
- [Phase 01]: Clear and recreate named interaction start marks before color, undo, and redo dispatches. — Gives MapCanvas one current start point for visible-completion measures without accumulating stale same-name marks.
- [Phase 01]: Pin exact Natural Earth 5.1.1 Admin 0 source bytes by SHA-256. — Prevents a moved tag or changed upstream download from silently altering committed boundaries.
- [Phase 01]: Include all Natural Earth Europe features plus Armenia, Azerbaijan, Cyprus, Georgia, Kazakhstan, and Turkey. — Documents the Europe/transregional policy while retaining Natural Earth's default POV and complete source geometries.
- [Phase 01]: Use administrative-code precedence ADM0_A3, GU_A3, ISO_A3, then SOV_A3 for country IDs. — Keeps rendering, selection, persistence, and future data joins on stable non-sentinel identifiers.
- [Phase 01]: Serialize the normalized asset as compact ID-sorted canonical JSON. — Preserves byte determinism while reducing same-origin load and parse overhead.
- [Phase 01]: Capture PNG exports from a fixed 540x540 HTML frame at scale 2 and reject non-1080x1080 canvases. — Keeps html2canvas on its HTMLElement contract and makes output independent of device pixel ratio.
- [Phase 01]: Return expected export failures through ExportResult and release anchor, object URL, and frame resources in nested finally blocks. — Lets later controls translate technical outcomes into approved UI copy without leaking temporary browser resources.
- [Phase 01]: Keep all raw Storage and JSON access in one injected adapter. — Keeps tests and React callers independent of direct window.localStorage access while containing browser exceptions at one typed boundary.
- [Phase 01]: Preserve usable saved records when neighboring records or color entries are corrupt, and filter loaded colors to current country IDs. — Recovers valid user data without allowing stale or invalid map state into the editor.
- [Phase 01]: Initialize onboarding persistence independently and expose explicit saved-map refresh. — Keeps saved-map reads lazy until the modal opens while allowing onboarding state to load immediately.
- [Phase 01]: Expose the connected map export source as a forwarded HTMLDivElement ref containing the live SVG. — Matches exportMapPng's HTMLElement boundary and provides one active export and focus subtree.
- [Phase 01]: Fit Mercator to a fixed west/east Europe viewport object and clip to the 1080-square canvas. — Full transcontinental source geometries remain available without dynamically shrinking or reframing the intended Europe composition.
- [Phase 01]: Keep roving focus identity local to the D3-owned path layer while provider state remains the sole selection owner. — Preserves one creator selection source while keeping path focus stable across lightweight style updates.
- [Phase 01]: Keep selection and color mutations provider-owned while normalized feature data is passed to controls for display only. — Prevents duplicate selection state and keeps country names out of map keys.
- [Phase 01]: Emit color-application status text through an App-supplied callback rather than creating component-local global feedback state. — Preserves one ToastRegion owner for later application composition.
- [Phase 01]: Interpret absent color entries as DEFAULT_COLOR in summaries, preset activity, and country-list swatches. — Keeps UI previews aligned with reducer reset and map rendering semantics.
- [Phase 01]: Use parent-supplied readiness, availability, and busy state for native control disabling while retaining a local synchronous export activation lock. — Prevents duplicate export activation before parent state can rerender.
- [Phase 01]: Keep onboarding and Show Help fully controlled so App composition owns persistence and map focus. — Prevents help surfaces from creating competing storage or map-state ownership.
- [Phase 01]: Allowlist approved operation announcements and fall back to stable generic copy. — Prevents arbitrary technical error text from reaching creators.
- [Phase 01]: Require explicit saved-map load, map-focus, and status callbacks at the modal boundary. — Forces App composition to wire history reset, focus recovery, and announcements without hidden side effects.
- [Phase 01]: Treat SaveLoad component mount as the modal-open boundary and refresh saved maps lazily. — Keeps persistence reads scoped to creator intent.
- [Phase 01]: Keep storage failures and validation local to the open dialog. — Preserves the current map and entered name as recoverable state.
- [Phase 01]: Use one matchMedia-owned desktop/compact hook and conditionally mount only the viewport-correct workspace DOM order. — Preserves focus order without CSS reordering or hidden duplicate workspaces.
- [Phase 01]: Keep map, GeoJSON, persistence, toast, and export state above responsive presentation branches. — Viewport changes remount presentation only and preserve creator colors, history, selection, and feedback.
- [Phase 01]: Persist onboarding dismissal through useLocalStorage while Show Help only changes session presentation state. — Reopening guidance must not delete the durable first-use dismissal marker.
- [Phase 01]: Keep all four stylesheet imports in main.tsx in theme, App, MapCanvas, Controls order so components never create cascade-order drift.
- [Phase 01]: Keep fixed white map and neutral boundary tokens outside dark-theme overrides, while only application chrome follows prefers-color-scheme.
- [Phase 01]: Use the existing responsive React branch order directly; CSS grids size and wrap that branch without order declarations or duplicate-workspace hiding.
- [Phase 01 gap closure]: Preset buttons must expose their own native disabled state when zero countries are selected, matching the custom controls rather than relying only on the disabled fieldset.
- [Phase 01 gap closure]: Chromium export must append/connect the download anchor before click, await a bounded handoff only after successful click, then remove the anchor, revoke the object URL, and remove the frame in `finally`; click failure uses the same `finally` immediately. Plan 01-20 updates the durable export coding rule and its two-entry Last updated history.
- [Phase 01 release acceptance]: Browser certification for this release is local-only in the currently installed Chrome 150 and Edge 150. Firefox, Safari, and previous-version certification are explicitly unverified/deferred by user choice and must not be reported as passed.
- [Phase 01 deep review]: Treat absent color entries as effective white, keep the selected active preset natively disabled, and suppress active-color no-ops before dispatch so they create no history, success feedback, or `countriesirl-color-start` mark.
- [Phase 01 deep review]: Preserve valid saved-map subsets while surfacing warning-severity load feedback; an unavailable initial onboarding read creates an immediate assertive storage alert without blocking editing/export.
- [Phase 01 deep review]: Limit default Vitest discovery to `src/**/*.test.{ts,tsx}` and exclude `.claude/**` so agent-worktree copies cannot inflate or contaminate acceptance evidence.
- [Phase 01 deep review]: Measure and clamp/flip tooltips inside viewport margins; if responsive remount disconnects the Saved Maps opener, restore focus to the currently mounted `Save or Load Maps` control, then fall back to the map.
- [Next phase priority]: Ship Europe first, then immediately add World and North America canvas variants before the remaining historical/centering/legend backlog; keep all region-variant implementation out of Phase 1.
- [Phase 01]: The user explicitly approved the final Chrome 150 and Edge 150 objective evidence for Plan 01-21. — The evidence was generated from current HEAD 805ab14, both exact local browser routes passed, and all four PNGs passed integrity checks.
- [Phase 01]: Phase 1 browser acceptance is local Chrome and Edge only. — This later explicit user decision supersedes remote and broader current/previous browser-matrix acceptance for Phase 1.
- [Phase 01]: Europe ships first, with World and North America variants next. — Regional expansion follows the initial Europe release rather than delaying it.
- [Phase 01 map-ready gap closure]: Preserve D-53's strict per-sample <500ms threshold and replace e2f9190's five geometry traversals with one finite per-feature projected-bounds aggregation plus one final safe path generation. — The production counterfactual passed 14/14 Chrome/Edge samples at 257–388ms with byte-identical 57 paths and unchanged translation.
- [Phase 01 map-ready acceptance]: Plan 01-15 uses `npm run build` plus `npm run preview`, records five controlled cold and five controlled warm samples per installed browser with transfer/cache metadata, defines map-ready as map-data-start through painted interactive SVG, and reports browser launch/bootstrap separately. — Development StrictMode timing and optional GeoJSON/html2canvas optimizations do not replace the targeted fix or weaken the threshold.

### Pending Todos

- Execute Plan 01-22: add traversal/equivalence/invalid-geometry regressions and implement aggregate finite bounds plus one final safe path generation.
- Rerun Plan 01-15 from the production build/preview with every current-code UAT check, five cold and five warm map-ready samples per installed browser, and complete cache/transfer/launch metadata.
- Complete Plans 01-16 and 01-17 deployment and production verification only after Plan 01-15 approval.
- Plan F7.1–F7.3 World and North America canvas variants as the first Phase 2 work, then address historical border data, centering, and legends.

### Blockers/Concerns

- Plan 01-15 is blocked on Plan 01-22 because current production map-ready is 533–713ms from redundant geometry traversal; the threshold remains unchanged.
- The failed Vite development evidence is inflated by React StrictMode's duplicate mount layout effect and cannot serve as release-performance evidence.
- Firefox, Safari, and previous-version certification are intentionally deferred/unverified by user choice and are not Phase 1 release blockers or passed cells.

## Known Constraints

- Browser storage must handle capacity, quota, unavailable, corrupt-data, and partial-valid-load cases with distinct feedback.
- Small territories and exclaves remain selectable through the country list.
- Phase 1 release acceptance uses only the currently installed local Chrome 150 and Edge 150; no remote-browser route or tunnel is required.
- World and North America canvas variants are excluded from Phase 1 code changes and retained as the highest-priority next-phase work.
- Vercel production deployment requires a later human authorization checkpoint.
- PNG output must remain exactly 1080×1080, opaque white, map-only, and theme/device-pixel-ratio independent during Plan 01-15 full UAT.
- Default Vitest acceptance evidence must contain source tests only; `.claude/**` worktree copies are excluded.
- Effective-white and active-color no-op attempts must not create history, success announcements, or color-start timing marks.
- Map-ready acceptance must use a production build/preview, controlled cold and warm cache series, raw per-sample values and metadata, and a strict <500ms result for every sample.
- Browser process launch and pre-data bootstrap are reported separately from the `countriesirl-map-load-start` to painted `countriesirl-map-ready` product measure.
- Optional GeoJSON simplification and lazy html2canvas loading are not required for this gap and may not displace the diagnosed traversal correction.

## Session Continuity

Last session: 2026-07-22T09:00:19-05:00
Stopped at: Planned Plan 01-22 map-ready traversal fix before Plan 01-15 production-preview rerun
Resume file: None
