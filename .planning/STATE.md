---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Wave 5 integration in progress; completed 01-06 and 01-07; earliest incomplete 01-08
last_updated: "2026-07-21T23:47:11.000Z"
last_activity: 2026-07-21
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 17
  completed_plans: 9
  percent: 53
---

# CountriesIRL Map Generator — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-21)

**Core value:** Help non-technical Instagram creators produce accurate, polished European choropleth maps quickly.
**Current focus:** Phase 1 — Foundation & Modern Map

## Current Position

Phase: 1 of 3 (Foundation & Modern Map)
Plan: 8 of 17 in current phase
Status: Ready to execute
Last activity: 2026-07-21

Progress: [█████░░░░░] 53%

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

## Accumulated Context

### Decisions

- [Phase 1]: React 18, strict TypeScript, Vite, D3 SVG, html2canvas, and localStorage are the locked MVP stack.
- [Phase 1]: Natural Earth 5.1.1 default POV requires presentation acceptance before deployment.
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

### Pending Todos

- Historical border data sourcing and geopolitical POV policy remain Phase 2 kickoff decisions.

### Blockers/Concerns

None.

## Known Constraints

- Browser storage must handle capacity, quota, unavailable, and corrupt-data cases.
- Small territories and exclaves remain selectable through the country list.
- Safari current/previous testing may require macOS or BrowserStack.
- Vercel production deployment requires a later human authorization checkpoint.

## Session Continuity

Last session: 2026-07-21T23:47:11.000Z
Stopped at: Wave 5 integration in progress; completed 01-06 and 01-07; earliest incomplete 01-08
Resume file: None
