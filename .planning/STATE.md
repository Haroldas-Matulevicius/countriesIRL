---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planned
stopped_at: Phase 2 review-replanned — 36 plans across 18 waves
last_updated: "2026-07-24T23:59:00.000Z"
last_activity: 2026-07-24 -- Phase 2 cross-AI review concerns resolved into 36 executable plans; implementation remains unstarted
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 58
  completed_plans: 22
  percent: 33
---

# CountriesIRL Map Generator — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-21)

**Core value:** Help non-technical Instagram creators produce accurate, polished European choropleth maps quickly.
**Current focus:** Phase 2 review-replanned and ready for execution; no Phase 2 implementation has started

## Current Position

Phase: 1 of 3 complete; Phase 2 planned in full and unstarted
Next step: Execute Phase 2 with `/gsd:execute-phase 2`, beginning with Wave 1 tooling/contracts
Execution graph: Phase 2 has 36 plans, 71 tasks, and 18 validated waves; zero Phase 2 tasks executed
Status: Phase 2 plan frontmatter/structure, requirement/D-ID coverage, acyclic dependencies, and same-wave file ownership validated; execution pending
Last activity: 2026-07-24 -- Phase 2 review replanning completed; 14 mandatory concerns mapped to executable tasks

Progress: Phase 1 [██████████] 100%; Phase 2 [----------] 0%

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
| Phase 01 P22 | 12 min | 1 task | 2 files |
| Phase 01 P15 | closeout-only | 2 tasks | 4 metadata files |
| Phase 01 P16 | deferred | 0 executed tasks | 2 metadata files |
| Phase 01 P17 | deferred | 0 executed tasks | 3 metadata files |

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
- [Phase 01 map-ready gap closure]: Replace e2f9190's five geometry traversals with one finite per-feature projected-bounds aggregation plus one final safe path generation while preserving exact 57-path output. — Plan 01-22 completed and clean-gated this functional correction.
- [Phase 01 evidence integrity]: Authoritative lint/full-test/data/type/build gates run in detached clean worktrees of the exact recorded commit; immutable historical evidence remains unchanged.
- [Phase 01 release completion, D-63]: The user explicitly directs that Phase 1 stop gating on millisecond timing and finish on functional correctness. Map-ready, color, undo, redo, export-duration, and other performance samples plus earlier harness timeouts are advisory diagnostics only. Final code review PASS, UI audit 24/24, 145 source tests, deterministic GeoJSON/build, 57-path integrity, Plan 01-21 browser/PNG evidence, accepted persistence/history/storage/accessibility/offline behavior, and concise current-HEAD Chrome 150/Edge 150 functional smoke determine Plan 01-15. Functional stability, no crashes, clean console/product behavior, responsive correctness, and exact export correctness remain blocking. The immutable failed timing evidence at commit c449e6e must not be rewritten and no CDP timing artifact is required.
- [Phase 01 final functional approval]: The user directly supplied `approved` for Plan 01-15. — Chrome 150 and Edge 150 are accepted as PASS with 57 unique non-empty labeled paths, complete local workflows, clean runtime behavior, and identical exact PNG hash `682b99c8c37c6189bea1d0bae09199c31da2a8fad5010e620ff12f6de3bab399`.
- [Phase 01 local-only closeout]: Plans 01-16 and 01-17 are closed as deferred by user choice. — No Vercel authentication, linking, deployment, production verification, or production URL occurred; optional future deployment does not block local Phase 1 completion.
- [Phase 01 final goal verification]: Independent goal-backward verification passed for the approved localhost-only scope. — All 73 active must-haves and all 18 Phase 1 requirements are satisfied; the seven deployment-only must-haves are explicitly deferred under Plans 01-16 and 01-17, with no product-tree drift, deployment, or Phase 2 work.

- [Phase 02 planning]: Use a non-locking live camera read for save and an idempotent CameraFreezeLease for export; settle the visible camera synchronously and release from the outermost finally on every path.
- [Phase 02 planning]: Keep Country browser/Locate at the modern 195 core; approved distinct historical entities are selectable/colorable by map click and keyboard while active, with selection reconciled to incoming scene identities.
- [Phase 02 planning]: Historical delivery requires source/license readiness, honest vector-versus-manual-trace evidence, named qualified six-region factual approval, five exact hashes, and catalog-last promotion; blocked snapshots are never counted delivered.
- [Phase 02 planning]: Final automation runs from a detached clean worktree at the exact final E2E commit after fresh npm ci; human acceptance binds the same SHA with a fixed evidence matrix.

### Pending Todos

- Execute Phase 2 in wave order; historical snapshots remain blocked until source/license/factual approval and exact-byte promotion pass.
- If the user later requests hosting, reopen the optional Vercel deployment and production-verification runbooks under new explicit authorization.

### Blockers/Concerns

- No local Phase 1 blocker remains. Phase 2 implementation is unstarted.
- Timing misses, incomplete timing harness work, and earlier harness timeouts remain immutable non-blocking diagnostic observations under D-63.
- Firefox, Safari, and previous-version certification remain intentionally deferred/unverified and must not be reported as passed.
- Vercel deployment and production verification are deferred optional future work; no production URL exists or is claimed.

## Known Constraints

- Browser storage must handle capacity, quota, unavailable, corrupt-data, and partial-valid-load cases with distinct feedback.
- Small territories and exclaves remain selectable through the country list.
- Phase 1 release acceptance uses only the currently installed local Chrome 150 and Edge 150; no remote-browser route or tunnel is required.
- World and North America canvas variants are excluded from Phase 1 code changes and retained as the highest-priority next-phase work.
- Vercel production deployment is optional future work and requires new explicit human authorization before any authentication, linking, or deploy command.
- PNG output must remain exactly 1080×1080, opaque white, centered, map-only, and theme/device-pixel-ratio independent.
- Default Vitest acceptance evidence contains source tests only; `.claude/**` worktree copies are excluded.
- Effective-white and active-color no-op attempts must not create history, success announcements, or color-start timing marks.
- Performance marks and immutable timing records remain available for diagnosis, but no threshold or CDP timing artifact determines Phase 1 release readiness.
- Executable evidence harnesses, profiles, cache files, and nested checkouts remain outside authoritative product evidence; existing immutable JSON/log history is retained unchanged.

## Session Continuity

Last session: 2026-07-24T23:59:00.000Z
Stopped at: Phase 2 review-replanned — 36 plans / 18 waves / 71 tasks
Resume file: .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-01-PLAN.md
