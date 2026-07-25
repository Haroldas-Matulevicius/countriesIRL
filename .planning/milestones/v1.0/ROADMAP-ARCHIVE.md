# v1.0 ROADMAP Archive — In-Flight

> **In-flight archive.** Verbatim closed-phase blocks moved out of the active
> [`ROADMAP.md`](../../ROADMAP.md) during the milestone, not at close. The active roadmap
> keeps only pending and in-progress phases in full detail; each closed phase keeps a
> one-line row in the Progress table pointing here.
>
> At v1.0 close this file becomes the natural `ROADMAP-AT-CLOSE.md` snapshot.
>
> Archive index: [`../../ARCHIVES.md`](../../ARCHIVES.md)

---

## Phase 1: Foundation & Modern Map (1–1.5 weeks)

**Goal:** A locally release-ready browser-only editor where non-technical creators can select and color one or many modern European countries, use 50-action undo/redo and local persistence, recover from loading/storage/export errors, work across desktop/tablet/secondary-mobile layouts, and download an exact 1080×1080 PNG. Public deployment remains optional future work.

**Requirements:** [F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F5.1, F5.3, F6.1, F6.2, NFR1, NFR2, NFR4, NFR5, NFR6, NFR7, NFR10, NFR11]

**Status:** Verified and locally complete on 2026-07-22 — 73/73 active must-haves verified, 7/7 deployment-only must-haves explicitly deferred under Plans 01-16 and 01-17, and 18/18 Phase 1 requirements satisfied. No deployment occurred.

**Plans:** 22/22 plans complete

Plans:

**Wave 1**
- [x] 01-01-PLAN.md — Verify Vitest and Vercel CLI package identities before execution

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Create the bounded React 18/Vite configuration/TypeScript/ESLint/Vitest toolchain

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-03-PLAN.md — Define shared contracts, constants, and tested color normalization

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-04-PLAN.md — Implement centralized reducer/context with bounded 50-action history and timing marks
- [x] 01-05-PLAN.md — Prepare deterministic normalized Natural Earth data and abortable loading
- [x] 01-09-PLAN.md — Implement validated max-10 map persistence plus onboarding dismissal storage
- [x] 01-11-PLAN.md — Implement deterministic exact 1080×1080 PNG export

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-06-PLAN.md — Build stable accessible D3/SVG map, data states, and visible timing measures
- [x] 01-07-PLAN.md — Build single/bulk selection and preset/custom color controls
- [x] 01-08-PLAN.md — Build history/file controls, controlled onboarding/help, and live feedback
- [x] 01-10-PLAN.md — Build accessible save/replace/load/delete modal

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 01-12-PLAN.md — Create root index.html and wire one matchMedia-composed responsive workspace with persisted help

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 01-13-PLAN.md — Wire styles after composition and apply responsive/theme/accessibility CSS

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 01-18-PLAN.md — Gap closure: correct README scope/stack claims before rerunning Plan 01-14

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 01-14-PLAN.md — Rerun the immutable verification-only lint/test/determinism/build gate after 01-18

**Wave 10** *(independent product fixes, both blocked on Wave 9 completion)*
- [x] 01-19-PLAN.md — Gap closure: make every preset swatch natively disabled when no countries are selected
- [x] 01-20-PLAN.md — Gap closure: preserve Chromium PNG download lifecycle and correct the durable export rule

**Wave 11** *(blocked on both Wave 10 fixes)*
- [x] 01-21-PLAN.md — Preflight exact Chrome 150/Edge 150, prove White→Red active-disabled no-op semantics, and complete two native downloads per browser

**Wave 12** *(blocked on Wave 11 completion)*
- [x] 01-22-PLAN.md — Gap closure: replace the five-traversal regression, prove exact 57-path/safety equivalence, and pass focused plus full unfiltered gates in a clean worktree of the exact commit

**Wave 13** *(blocked on the completed Wave 12 product/gate evidence)*
- [x] 01-15-PLAN.md — Closed by direct user approval: Chrome 150 and Edge 150 functional PASS, exact 57-path integrity, accepted local workflows, and identical exact PNG output; timing remains advisory per D-63

**Wave 14** *(optional deployment runbook)*
- [x] 01-16-PLAN.md — Closed as deferred by user choice; no Vercel authentication, linking, deployment, or production URL; optional future work only

**Wave 15** *(optional post-deployment runbook)*
- [x] 01-17-PLAN.md — Closed as deferred by user choice; no production-origin verification or URL publication; optional future work only

Cross-cutting constraints:
- All country state, D3 joins, persistence, and selection use normalized stable country IDs; display names are labels only.
- Every exported PNG is exactly 1080×1080, opaque white, map-only, centered, and independent of device pixel ratio or dark theme.
- Selection, focus, errors, and operation results remain keyboard/screen-reader accessible and never rely on color alone.
- Effective white is canonical: selecting an uncolored country leaves White active and natively disabled; applying another preset transfers that active disabled state, and active-color attempts create no history, status, or color timing mark.
- Existing coding rules remain authoritative and receive targeted corrections when implementation proves a durable rule change, including the connected-anchor/bounded-handoff/finally-cleanup export lifecycle.
- Default automated test discovery is source-scoped to `src/**/*.test.{ts,tsx}` and excludes `.claude/**` agent worktrees.
- Plan 01-22's exact-commit clean gate, 145 source tests, deterministic GeoJSON/build, strict TypeScript, traversal safety, and 57-path equivalence remain accepted final evidence.
- Plan 01-21's approved installed Chrome 150/Edge 150 browser and exact-PNG evidence remains accepted, supplemented by one concise current-HEAD functional smoke per browser in Plan 01-15.
- Per D-63, map-ready/color/undo/redo/export-duration samples, threshold fields, and earlier harness timeouts are advisory diagnostics only. They remain documented truthfully but do not block Phase 1 and no CDP timing artifact is required.
- Authoritative functional acceptance still requires stable/no-crash behavior, exactly 57 unique non-empty paths, clean console/runtime/product-network state, correct history/persistence/storage recovery, responsive/accessibility/offline behavior, and exact PNG correctness.
- The immutable failed timing evidence committed at `c449e6e` must not be rewritten, overwritten, deleted, or represented as passing.
- Phase 1 release browser acceptance is local-browser-only in the currently installed Chrome 150 and Edge 150. Firefox, Safari, and all previous-version certification remain explicitly unverified/deferred by user choice and must never be reported as passed.
- Plans 01-16 and 01-17 are closed as deferred for localhost-only Phase 1 completion. Final local goal verification passed; Vercel deployment remains optional future work requiring a new explicit authorization.
- Offline capability means bundled same-origin assets, no runtime third-party requests, and continued operation after load; fresh disconnected reload is not required and no service worker is included.
- Responsive DOM/focus order comes from one active matchMedia-selected React workspace, never CSS reordering or duplicate hidden trees; modal focus restoration follows the currently mounted responsive control after a 1200px remount.

### Deliverables

- React 18 + strict TypeScript + Vite application shell
- Reproducible Natural Earth 1:10m Europe-focused GeoJSON asset and validation boundary
- Interactive accessible D3 SVG map with modern European borders
- Single and multi-country selection with named presets, effective-white active/no-op semantics, and validated custom colors
- Immutable undo/redo for the last 50 color-changing actions plus undoable reset
- Browser local save/overwrite/load/delete for up to 10 maps with partial-corrupt recovery and startup/storage feedback
- Exact white-background 1080×1080 PNG export using html2canvas
- Persisted first-use onboarding dismissal, reopenable help, and complete loading/warning/error/success states
- One-active-workspace desktop/tablet/secondary-mobile layouts including 360px tooltip containment, responsive modal focus restoration, and dark UI chrome
- Source-scoped unit tests for reducer/history, color, GeoJSON, storage, export, startup feedback, tooltips, focus helpers, and projection traversal/equivalence safety
- Final accepted evidence inventory: code review PASS, UI audit 24/24, 145 source tests, deterministic GeoJSON/build, exact 57-path integrity, Plan 01-21 browser/PNG evidence, functional persistence/history/storage/accessibility/offline coverage, and approved Chrome 150/Edge 150 smoke
- Immutable failed timing evidence retained as a non-blocking diagnostic record; Vercel deployment and production verification are explicitly deferred optional future work

### Key Decisions

- [x] React 18 + TypeScript + Vite
- [x] D3.js v7+ with interactive SVG and Mercator projection
- [x] React Context plus useReducer for map state
- [x] html2canvas with deterministic 540×540 scale-2 export frame
- [x] localStorage with no backend, authentication, or mandatory login
- [x] Plain component-scoped CSS plus theme custom properties
- [x] Offline boundary: bundled same-origin/no runtime third-party requests; no fresh disconnected reload or service worker
- [x] Natural Earth 5.1.1 Europe presentation and documented transcontinental inclusion approved by the user for this release
- [x] Phase 1 browser certification limited by user choice to installed Chrome 150 and Edge 150; Firefox/Safari/previous versions remain unverified/deferred
- [x] Ship Europe first, then prioritize World and North America canvas variants immediately after Phase 1
- [x] Require new explicit human authorization before any optional future Vercel deployment
- [x] Close Phase 1 for localhost use; Plans 01-16 and 01-17 are deferred and do not block local completion
- [x] Correct the redundant geometry traversal while preserving exact 57-path output and final functional behavior
- [x] Use isolated exact-commit clean gates and retain immutable non-executable evidence without rewriting failed historical records
- [x] D-63 supersedes threshold-based release gating: timing data remains advisory; functional stability, no-crash/error behavior, path integrity, responsive/accessibility/offline correctness, and exact export correctness determine local acceptance

### Out of Scope (Phase 1)

- Historical borders and time-period controls
- Flexible centering/reprojection and regional zoom presets
- Legend generation or legend styling UI
- SVG export, batch/timelapse export, ZIP workflows
- Cloud sync, authentication, sharing URLs, analytics, or server infrastructure
- World and North America canvas variants are out of Phase 1 implementation but are the highest-priority next-phase work; other non-European maps, native mobile app, hatching/patterns, and advanced palette hotkeys remain later scope
- GeoJSON simplification and lazy html2canvas loading are not required for Phase 1 closeout; any later optimization may use the preserved diagnostic evidence without reopening release acceptance

---

