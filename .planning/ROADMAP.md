# Roadmap: CountriesIRL Map Generator

> **Status:** v1.0 — MVP — open 2026-07-21. Phase 2 executing: engineering complete, two owner
> gates open. Pipeline restructured 2026-08-06 toward the classed-choropleth product vision
> (Phases 3–6, milestone v1.1). **The [Progress](#progress) table below is canonical for status
> and counts.**
> **Pointers:** [`STATE.md`](STATE.md) (live position) · [`MILESTONES.md`](MILESTONES.md)
> (milestone outcomes + deferrals) · [`ARCHIVES.md`](ARCHIVES.md) (archive navigation) ·
> [`CODING_RULES.md`](CODING_RULES.md) → [`coding-rules/general.md`](coding-rules/general.md)
> (live invariants + immutable safety constraints) ·
> [`milestones/v1.0/`](milestones/v1.0/) (in-flight capsule).
> ────────────────────────────────────────

**Target product:** a browser-only map studio in which a creator — with zero GIS or design
skill — produces a publication-grade classed choropleth (the Eurostat house style is the
reference bar): a clean full-bleed world canvas, hue-family sequential palettes, coastline-quiet
borders, a title band and footer band with real text tools, an editable range legend with a
"no data" class, per-country value labels, and a CSV upload that auto-fills and
proportionally shades the whole map — exported as an exact 1080×1080 PNG.
**Browser-only, localhost-only — no deployment is authorized.**

## Overview

CountriesIRL is a browser-only choropleth map generator for Instagram creators. Phase 1
shipped the Europe foundation — selection, coloring, bounded undo/redo, local persistence,
and exact 1080×1080 PNG export. Phase 2 transformed that fixed-Europe editor into a single
horizontally wrapping full-world composition canvas with pan/zoom, Locate across 195 core
states, a catalog-driven period selector, an export-safe in-canvas legend, and complete
composition save/load. The remaining pipeline turns that engine into the target product in
four steps: **Phase 3** strips the editor down to a clean, minimal studio (full-bleed canvas,
one left tool HUD); **Phase 4** builds the visual and cartographic system (sequential palette
ramps, water presets, interior-only borders, title/footer gradient bands, text tools, legend
overhaul); **Phase 5** makes maps data-driven (CSV import, classed choropleth engine, value
labels, auto legend); **Phase 6** polishes and launches.

**Historical borders are deferred out of v1.0.** The engine — validation, scene
composition, modern fallback, approval-aware promotion — ships and is tested. The
rights-cleared archival geometry does not exist and is a data-acquisition problem, not an
engineering one. See
[`phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md).
No phase in this roadmap promises historical geometry.

## Milestones

- **v1.0 — MVP** — Phases 1–2 (opened 2026-07-21). Closes when the two open Phase 2 owner
  gates (`02-25`, `02-28`) are resolved. Per-phase status and counts live in the
  **Progress table below** (canonical — don't duplicate counts here).
- **v1.1 — Clean Studio & Data-Driven Maps** — Phases 3–6 (defined 2026-08-06, not yet
  started). The classed-choropleth product vision: clean UI, cartographic visual system,
  CSV-driven maps, polish/launch.

**Why v1.0 closes at Phase 2:** every piece of v1.0 evidence — requirements annotations,
acceptance records, the archive capsule — binds Phases 1–2; the old "Phase 3: Polish &
Launch" stub had zero plans and zero evidence, so moving launch into v1.1 rewrites nothing.
`MILESTONES.md` gets its v1.1 entry when v1.0 actually closes (recorded as a pending todo in
[`STATE.md`](STATE.md)).

Full milestone detail: [`MILESTONES.md`](MILESTONES.md).

## Phase Details

> **Closed phase entries are archived to** [`milestones/v1.0/ROADMAP-ARCHIVE.md`](milestones/v1.0/ROADMAP-ARCHIVE.md).
> Closed phases carry no entry here — their one-line status and archive pointer live in the
> **Detail** column of the Progress table at the bottom of this file. Only active and
> pending phases keep full detail below.

---
## Phase 2: Region Variants & Advanced Features (1.5–2 weeks engineering estimate; historical evidence may extend this)

**Goal:** Transform the fixed-Europe editor into one browser-only, horizontally wrapping full-world composition canvas where creators can pan, zoom, Locate any of 195 core states, choose four source/license/factual-evidence-approved historical snapshots with explicit modern fallback, interact with approved historical entities while active, edit and position an export-safe in-canvas legend, save/load the exact live composition, and export the exact visible 1080×1080 viewport while preserving Phase 1 color history, recovery, accessibility, responsive ownership, and local-only behavior.

**Requirements:** [F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F2.1, F2.2, F2.3, F2.4, F2.5, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F5.1, F5.2, F5.3, F5.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR1, NFR2, NFR3, NFR4, NFR5, NFR6, NFR7, NFR8, NFR9, NFR10, NFR11]

**Status:** **EXECUTING — all engineering complete, two owner gates open.** Descoped
2026-07-25 to Modern-only → [`02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md).

All four historical packets (1492, 1700, 1815, 1914) verify offline as truthfully **BLOCKED**
with `deliveryCounted=false` and zero production snapshots. The blockers name **missing archival
material** — Semkowicz-Romer scans, the CNIG 15094 product archive, manual-trace operator records
and control points, Karlowitz frontier demarcation — **not missing approval**, so no human
sign-off can unblock them. The historical *engine* ships, is tested, and needs no rework when
data arrives. Historical delivery still requires exact source/license readiness, independent
source approval, qualified factual review, durable hash binding, and atomic promotion; the
evidence bar is **not** relaxed by the descope.

**Plans:** counts live in the [Progress](#progress) ledger below — the one canonical place for
them. The list here is the **execution order**; per-plan detail lives in each plan's
`02-NN-SUMMARY.md` in the [phase directory](phases/02-region-variants-advanced-features-1-5-2-weeks/).

**Wave 1** — validation boundary + contracts
- [x] `02-01` Exact-pinned build/browser validation boundary and artifact hygiene
- [x] `02-02` Interface-first contracts: the sole `MapCanvasHandle`, live-camera transaction, historical-entity policy

**Wave 2** — pure cores
- [x] `02-03` Single React owner for durable composition state; color history untouched
- [x] `02-04` Deterministic modern-world data platform replacing the fixed Europe asset
- [x] `02-06` Pure wrapped-world camera mathematics, proven before any D3 wiring
- [x] `02-10` Pure effective-scene and legend algorithms, including the historical interaction policy

**Wave 3** — runtime boundary
- [x] `02-05` Runtime data boundary moved from fixed Europe to the validated world asset
- [x] `02-11` Editable export-safe legend with browser-proven interactions
- [x] `02-12` Historical engine and honest evidence gates, before any acquisition or promotion

**Wave 4**
- [x] `02-07` Pure camera model wired into a stable wrapped canvas; live-camera lease boundary closed
- [x] `02-19` localStorage authority upgraded with pre-parse resource bounds and full composition persistence
- [x] `02-32` 1815/1914 source readiness — complete **only** as hash-bound BLOCKED evidence; zero production snapshots
- [~] `02-31` **DEFERRED** — 1492/1700 source readiness. Infrastructure integrated; both packets verify offline as truthfully BLOCKED. Missing archival material, not missing approval.

**Wave 5**
- [x] `02-08` Accessible camera-control alternatives with proven browser behavior
- [x] `02-09` Modern country browser plus a separate accessible Locate workflow
- [x] `02-29` Load and live-camera save transactions extracted from `App` into focused hooks
- [~] `02-33` **DEFERRED** — no reviewable evidence exists, so the non-executor source/license review cannot run

**Waves 6–8** — the historical curation and approval chain
- [~] `02-13` · `02-14` · `02-15` · `02-16` **DEFERRED** — generate and preflight the 1492 / 1700 / 1815 / 1914 candidates
- [~] `02-34` **DEFERRED** — qualified factual approval for the four candidate bundles
- [~] `02-35` **DEFERRED** — seal the structured factual review into durable per-snapshot approval artifacts

**Wave 9**
- [x] `02-17` **RESCOPED + complete** — verifies the Modern-only catalog and proves non-promotion. The original promotion tasks are preserved verbatim in the plan for the follow-on data-acquisition phase.

**Wave 10**
- [x] `02-18` **RESCOPED + complete** — `CompositionBar` (sole Reset View owner), catalog-driven period select, world copy, crossfade, tooltip period context

**Wave 11**
- [x] `02-20` Complete-composition Save/Load + the Chrome/Edge persistence slice
- [x] `02-21` Export strips duplicate accessibility/editor semantics while preserving wrapped geometry; `invalid-composition` refuses a mis-placed legend; named-filename sanitizer

**Wave 12**
- [x] `02-22` App-bar copy and action order, content reset separated from camera reset, bounded creator-safe status allowlist
- [x] `02-30` Export transaction moved into `useCompositionExportTransaction`; all three locks released from one outermost `finally`; F5.5 wired end to end

**Wave 13**
- [x] `02-23` Composition root **verified rather than rewritten** — `App.tsx`/`main.tsx` unchanged; the missing guards and `tests/e2e/transactions.spec.ts` added, both proven RED

**Wave 14**
- [x] `02-24` UI-SPEC token contract, responsive corrections, `phase2CssContract.test.ts` + `responsive.spec.ts`. The two placement gaps it recorded were closed later in the phase.

**Wave 15** — owner gate
- [ ] `02-25` **OPEN** — two bounded documentation patches. Both patches were produced and their hashes recorded; **Task 2 (full patch display and explicit per-hash approval) was never executed.** The approval on file is blanket, given in advance and sight-unseen, and both hashes were computed *after* it — so it is **not hash-bound**.

**Wave 16**
- [x] `02-26` Patch A applied mechanically via `git apply`, hash-verified before and re-derived after
- [x] `02-36` Patch B applied the same way, exactly 3 files. Found but out of scope at the time: two `CLAUDE.md` rows routing to files that never existed (fixed 2026-07-26 in the documentation pass).

**Wave 17**
- [x] `02-27` `tests/e2e/final-integration.spec.ts` — the cross-domain creator journey measured on downloaded PNG bytes, with four RED probes. Exact-commit gate re-run **PASS at `fe5f946`**.

**Wave 18** — owner gate
- [ ] `02-28` **OPEN** — the human acceptance matrix. Prepared and bound to `fe5f946`; the automatable cells are pre-filled with cited evidence and **every physical cell is `PENDING`**. It cannot be delegated, automated, or blanket-approved → [`02-28-ACCEPTANCE-MATRIX.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-28-ACCEPTANCE-MATRIX.md)

Cross-cutting constraints:
- One fixed square Mercator world scene uses transform-only camera movement and continuous horizontal wrapping; no separate Europe/World/North America modes or selector.
- The modern browser/Locate catalog is exactly 195 core states. Approved historical entities with distinct stable IDs are selectable/colorable by map click and keyboard only while active; dependencies/disputed/neutral units remain non-selectable. Period changes retain selection only for incoming effective-scene identities.
- Exactly one `MapCanvasHandle` bridges root composition to the visible MapCanvas controller across responsive remounts. Save uses its non-locking `readCurrentCamera`; load/navigation/focus use its narrow operations; export acquires its idempotent `CameraFreezeLease`, reads its connected export source, synchronously settles the visible semantic camera, and releases from the outermost finally on every path.
- Historical work uses separate readiness, durable non-executor source-approval JSON, curation, qualified factual review bound to the current source-approval SHA plus five candidate/review hashes, and catalog-last promotion gates. Vector extraction may be regenerated; manual traces are verified by evidence/procedure/operator/input hashes and are never falsely represented as deterministic extraction.
- Each source approval names reviewer identity/role/date, explicitly records non-executor/non-implementer status, six regional source/license decisions, and exact manifest/canonical evidence archive/member inventory/input/mode/manual-trace hashes. Each factual approval names a qualified reviewer and binds the current source-approval SHA plus source/input/output/review JSON/review HTML hashes. Executor self-approval is forbidden; any changed bound byte invalidates approval.
- The React-owned legend is a `<g>` in the one canonical MapCanvas SVG, after the D3 camera group and outside its transform. It is the exact group cloned for export; no sibling overlay fallback exists. Every active non-white effective color, including approved historical entities, appears or export is blocked.
- Complete saves retain colors, the exact live semantic camera, period, legend metadata/style/position, and visible settings under max-10 local-only policy. Raw storage is bounded before parse and by iterative depth/node budget.
- Export preserves every visible wrapped geometry path required by Pacific/date-line framing and strips only editor and duplicate accessibility semantics. Outgoing crossfade is inaccessible/nonfocusable and never exported.
- Focused installed-Chrome Playwright slices run in owning plans. The final authoritative gate records HEAD after the final E2E commit, creates a detached clean worktree at that SHA, runs fresh `npm ci` plus the complete lint/test/type/data/history/build/Chrome/Edge gate, and records machine-readable evidence.
- Final human acceptance previews the same verified SHA and records a fixed device/OS/browser/screen-reader/viewport/preference/PNG/history-hash matrix. Every mandatory cell must PASS; unavailable physical touch is not passed.
- The approved UI-SPEC remains binding: one active responsive DOM, exact copy/tokens/breakpoints, restrained glass only on approved editor chrome, opaque export scene, preference fallbacks, and 360px/200% containment.
- Phase 2 remains browser-only and localhost-only. Deployment, auth, cloud, backend/API/server, environment secrets, animation/video/batch, geometry morphing, textures/overlays, POV switching, and artificial markers/insets remain outside scope.

### Deliverables

- Exact-pinned mapshaper and installed-browser Playwright with dedicated ignored artifact root
- Strict camera/scene/legend/persistence/export contracts including `CameraFreezeLease` and live-camera reads
- Reproducible Natural Earth 5.1.1 hybrid world asset with exact 195 core states and 248 visible units
- Transform-only wrapped camera, direct gestures, semantic alternatives, Reset View, and modern-core Locate
- One logical accessible path per selectable active-scene entity plus decorative wrapped geometry
- Deterministic effective-scene and legend models with approved historical entity interaction/history/persistence
- Export-safe editable SVG legend with labels/order/theme/size/opacity/border/corner/custom controls and overflow blocking
- Provenance-gated historical engine plus source-ready, qualified-review-approved 1492/1700/1815/1914 overlays for six separate regions
- Versioned V2 complete-composition local persistence with raw/depth/node bounds and Phase 1 migration
- Focused load/save/export transaction hooks with App retained as composition root
- Exact current-viewport PNG export including legend, history/fallback state, visible wrapped geometry, and safe filename
- Exact approved documentation corrections for subsystem rules, CLAUDE routing, general rules, and F2/F3/F7 supersession annotations
- Focused Chrome validation, full exact-commit Chrome/Edge gate, and fixed exact-SHA human acceptance matrix

### Key Decisions

- [x] One horizontally wrapping full-world canvas supersedes separate regional modes
- [x] New compositions open at centered whole-world fit
- [x] Fixed square Mercator plus transform-only D3 zoom satisfies wrapping and pole clamping
- [x] Exactly 195 modern core states are in browser/Locate; approved historical entities are active-scene map interactions
- [x] Natural Earth's default POV remains authoritative; no claim switcher
- [x] Camera remains separate from color history and persists semantically from the live frame
- [x] Historical time uses reviewed snapshots with explicit modern fallback and exact evidence gates
- [x] Legend is an SVG composition layer outside camera transform
- [x] Saved maps become bounded versioned complete local compositions
- [x] Runtime remains localhost/browser-only with no backend/deployment
- [x] Final automation proves an exact clean commit; human acceptance binds the same SHA

### Out of Scope (Phase 2)

- Separate Europe/World/North America modes or a region selector
- Animation timelines, camera keyframes, animated borders/fills/glows, geometry morphing, slideshows, frame sequences, MP4/video, batch/timelapse export, ZIP workflows
- Pattern/texture fills, advanced shadows/glows, external images/flags/logos/arrows, freeform design controls
- User-selectable political claim perspectives, artificial small-island markers, inset maps
- SVG export, cloud sync, authentication, sharing URLs, analytics, public deployment, backend/API/server infrastructure, and environment secrets

---
## Phase 3: Clean UI Overhaul (1–1.5 weeks)

**Goal:** Replace the current editor chrome — the slate/teal token system (`--accent: #0f766e`,
`--text-primary: #111827`, `--border-strong: #1f2937`, the heavy `--shadow-inspector`/
`--shadow-navigation` panels, and the retired-in-name-only `--glass-*` family) and the
app-bar + right-inspector arrangement — with a **super-clean minimal studio**: a full-bleed,
scrollable/pannable map canvas with a Google-Maps-like feel, and **one left-side tool HUD**
holding every tool (coloring, palettes, legend, text, export, saved maps, period). Neutral
near-white chrome, one restrained accent, clean typography, no visual noise, no "techy"
density. The design system is **adopted wholesale from the sibling Themely repo** (D-01…D-03).

> **Amended 2026-08-06 (Amendment 3).** This phase was originally specced as "chrome, layout,
> and tokens only," with "nothing about map *content* rendering changes." **That is no longer
> true, deliberately.** Three expansions were authorized during `/gsd:discuss-phase 3` and a
> fourth after `/gsd:plan-phase 3` research. Two runtime dependencies enter the phase (`motion`
> v12 and vendored lucide-animated icons, D-27/D-28), and the legend adopts Themely typography
> (D-25) — and because the legend renders **inside the export-bearing composition**, that
> **changes exported PNG pixels**. Export fixtures must therefore be re-baselined as a
> deliberate, recorded act, never a silently updated fixture. Full detail:
> `phases/03-clean-ui-overhaul-1-1-5-weeks/03-CONTEXT.md` § Roadmap Amendments.

**Depends on:** Phase 2 engineering (complete). Does not wait for owner gates `02-25`/`02-28`
to be *closed*, but must not disturb their evidence: the acceptance matrix binds `fe5f946`,
so if `02-28` is still pending when Phase 3 lands, the owner performs the matrix against the
preserved tag/commit, not against the restyled HEAD. **`03-01` therefore opens by creating an
annotated git tag on `fe5f946` (D-31)** so the pre-restyle build stays trivially reachable;
the matrix itself is untouched and the gate stays OPEN.

**Transition-readiness constraint (binding for every Phase 3 plan):** the restyled editor is
built **embed-ready** for the planned Themely transition (~1–2 months out) without doing any
integration now. Concretely: the canvas + HUD assemble into one mountable editor component
behind an explicit props boundary — it never assumes it owns `document`/`window` chrome beyond
its mount point; persistence is consumed through a storage-adapter interface (the localStorage
implementation stays the only one shipped); the data asset base path is a parameter, not a
hard-coded literal scattered through fetch calls; new design tokens are namespaced so they can
coexist with a host app's stylesheet. No auth/entitlement awareness is added — that belongs to
the future host. Plans `03-02`/`03-04` carry the boundary; `/gsd:plan-phase 3` turns each point
into a RED-provable gate (e.g. a grep gate on hard-coded `/data/` literals outside the config
home). Embedding itself remains outside scope and needs new explicit authorization
(§ Beyond v1.1). **Already largely discharged:** `StorageAdapter` exists (`storage.ts:71-88`)
with exactly **one** production `localStorage` site (`storage.ts:142`), and hard-coded `/data/`
literals number **three** in production fetch paths (`useGeoData.ts:11-12`, `snapshots.ts:7`).
Two further literals in `historicalValidation.ts:1098,1190` are **safety predicates and must be
exempted, not parameterised** — parameterising them would quietly widen the approval chain.

**Plans (excruciating breakdown — final wording at `/gsd:plan-phase 3`):**

1. `03-01` **Design.md + design-token specification.** Create `Design.md` (CLAUDE.md already
   anticipates it): audit and name every current token being retired, define the replacement
   neutral system (surfaces, text scale, one accent, borders, radii, shadows ≈ none/hairline),
   define the HUD anatomy and spacing grid. *Gate:* `themeTokens.test.ts` updated to the new
   set and proven RED against the old palette (re-add `--accent: #0f766e` → test fails).
2. `03-02` **Layout contract.** *(**Amendment 2** — this plan originally specified a "left HUD
   **column** (collapsible sections, one scroll container)"; the HUD is now an **icon rail +
   single flyout panel**, D-16.)* Specify the target DOM: full-bleed canvas layer + a ~56px
   always-present icon rail that opens **one 280px tool panel at a time** (the VS Code / Figma
   idiom, not an accordion) + minimal floating map controls (zoom/reset, bottom-right,
   Google-Maps idiom) + toast region. The panel **reserves layout space** — the canvas reflows;
   it does not overlay the map (D-19). Per **D-32** the map is a full-bleed *surface* carrying a
   centred **1:1 export frame** so the creator sees exactly what lands in the PNG; the SVG
   `viewBox` stays `0 0 1080 1080` and the frame is `data-editor-only`. Breakpoint behavior:
   below the existing narrow breakpoint the rail becomes a **bottom bar** and a tapped tool
   raises a **bottom sheet** (D-20). *Gate:* a rewritten `phase2CssContract.test.ts` (successor
   `uiContract.test.ts`) asserting the new selectors/tokens, each assertion broken once and
   observed RED before landing.
   - *No `ResizeObserver` is required:* `useCameraController.ts:310-313` pins d3-zoom's `extent`
     to `[[0,0],[1080,1080]]` and `MapCanvas.tsx:839-840` fixes the `viewBox`, so a panel reflow
     cannot disturb the projection, the camera lease, or the export.
3. `03-03` **Token replacement in `theme.css`.** Land the new token values; delete retired
   tokens rather than aliasing them so stale references fail loudly at the contract test.
   *Gate:* contract test green; `npm run lint && npm test` clean; zero references to retired
   token names (`grep` gate wired into the contract test so it can fail).
4. `03-04` **Workspace restructure.** `MapWorkspace` re-slotted: canvas becomes full-bleed;
   the typed `legendSlot`/`navigationSlot` contract and export-membership semantics preserved
   verbatim; the inspector column retired as a *container* (its tools move, not die).
   *Gate:* `tests/e2e/responsive.spec.ts` updated + RED-proven; export e2e still green
   (placement still decides export membership).
5. `03-05` **Left HUD shell + coloring/palette tools migration.** HUD component with
   collapsible sections; move color presets, custom hex, bulk apply, undo/redo into it.
   `Controls` keeps its single-component `variant` rule — a HUD variant is added, never a
   copy. *Gate:* color-workflow e2e slice green; keyboard/focus order proven in e2e.
6. `03-06` **Legend, saved maps, period, export migration + app-bar declutter.** Remaining
   tools move into HUD sections; the app bar reduces to identity + save state + export (or
   dissolves entirely — plan-time decision). Status allowlist (`ToastRegion`) untouched.
   *Gate:* persistence + export e2e slices green; the `02-22` action-order semantics either
   preserved or explicitly superseded in the plan (recorded, not silent).
7. `03-07` **Map chrome polish.** Floating zoom/reset controls, hover states, cursor
   discipline (colorable = pointer, neutral units = default — carries the Kosovo fix
   forward), tooltip restyle. *Gate:* camera e2e slice green; a tooltip assertion that fails
   if the neutral-unit copy regresses to a color readout.
8. `03-08` **Responsive + reduced-preference pass.** 360px/200%-equivalent containment,
   `prefers-reduced-motion`/`-transparency` behavior re-verified in the new chrome.
   *Gate:* `responsive.spec.ts` green on **Chrome** (see the Edge note under `03-11`).
9. `03-09` **CSS mass + dead-style sweep.** Delete orphaned rules (the 1128-line
   `Controls.css` is split per-surface); comment density matched to the new files.
   *Gate:* contract test's selector inventory shrinks — asserted, so growth fails.
10. `03-10` **Export pipeline: own the SVG→PNG path.** *(**Amendment 4** — a plan the original
    breakdown did not contain at all.)* Remove `html2canvas` and render the frozen clone
    directly: serialise → embed required fonts inline as base64 `@font-face` in the SVG's
    `<defs><style>` → `Image` → `drawImage` onto a 1080×1080 canvas → `toBlob` (**D-34**). The
    font-embedding step is built **generalised** ("collect the fonts this composition uses"),
    used only for Inter here, so Phase 4's text tools need not re-open the chokepoint
    (**D-34a**). *Why:* the whole composition is a single SVG, and `html2canvas` only
    `XMLSerializer`s it and rasterises it as an `<img>` — an isolated document that sees no
    host `@font-face`. That is why `LegendOverlay.tsx:167` names Inter while the repo has **zero**
    `@font-face` rules: **the legend already exports in a system fallback today.**
    - **Blocking spike first (OQ-1):** prove an inline base64 `@font-face` actually renders
      inside SVG-as-image in installed Chrome, **before** legend typography is locked.
    - *Gate:* the 1080×1080 size contract, the clone contract, every existing refusal reason
      (disconnected / multi-SVG / sibling-legend), `sanitizeExportClone`'s strip list, and
      `data-editor-only` exclusion all preserved and RED-proven against the **new** path.
      UI-SPEC assertion 25 must measure **rendered pixels** — a legend-region diff against a
      font-suppressed control run, with a blank-crop discrimination control so three empty
      regions cannot satisfy the inequality. Asserting `font-family: Inter` appears in the
      clone's markup is **green today, before any work**, and is not acceptable evidence.
    - ⚠ `src/utils/export.ts` is the most safety-critical file in the repo. This is Phase 3's
      largest single risk and earns the `03-11` review on its own.
11. `03-11` **Independent non-author review of the aggregate diff + full gate.** Reviewer is
    not the executor of `03-01`…`03-10`. *Gate:* `npm run lint && npm test && npm run build` +
    full `npm run test:e2e`.
    - **Browser scope (D-33):** the gate runs **Chrome only**, and its evidence must state
      **"Edge not certified — not installed"** rather than omit it or infer a pass. Microsoft
      Edge is not installed on this machine, so the `msedge` Playwright project cannot launch.
      ⚠ This contradicts `STATE.md`'s "Edge 150 — 71/71" record at `fe5f946`. That record is
      **immutable Phase 2 evidence — annotate, never rewrite**; resolving it is filed against
      Phase 2 and is **not** Phase 3 work. Phase 3 must not cite or repeat it.

**Plan files (written 2026-08-06; execution ledger — tick by hand, never with a gsd-sdk verb):**

The numbered breakdown above has eleven items; the plan set has **twelve files**, because item 1
was split into `03-01` (commitments, spike, supply chain) and `03-02` (the authored contract) on
plan-checker advice — 8 tasks with no shared subject was over budget. **Every roadmap item *n* ≥ 2
is plan `03-{n+1}`.** This table is the authoritative mapping.

| Wave | Plan | Roadmap item | Objective | Autonomous |
|---|---|---|---|---|
| 1 | [ ] `03-01-PLAN.md` | 1a | Tag `fe5f946` (D-31) · OQ-1 spike · D-01 one-way gate · R-V1 owner gate · `motion@12.40.0` + Inter bytes | **no** — D-01 + R-V1 |
| 2 | [ ] `03-02-PLAN.md` | 1b | Motion lockstep · vendored icons + provenance (R-V2) · `Design.md` | yes |
| 3 | [ ] `03-03-PLAN.md` | 2 | Shell: `.map-editor` grid, rail/panel tracks, D-32 export frame; `uiContract.test.ts` created | yes |
| 4 | [ ] `03-04-PLAN.md` | 3 | Token replacement: Themely cool `:root` + Lights Out `.dark`, delete-never-alias, assertions 1-9/17/19/26 | yes |
| 5 | [ ] `03-05-PLAN.md` | 4 | `MapEditor` props boundary, app-bar/inspector dissolve, `editorConfig.ts`, transition-readiness gates | yes |
| 6 | [ ] `03-06-PLAN.md` | 5 | Icon rail + flyout, HUD header/footer, theme toggle, colours panel; assertions 15 (rail) / 27 | yes |
| 7 | [ ] `03-07-PLAN.md` | 6 | Period HUD + rehomed live region, saved maps, legend/countries panels; assertions 13/14/15/23 | yes |
| 8 | [ ] `03-08-PLAN.md` | 7 | Floating cluster, tooltip ink chip, Kosovo cursor discipline; assertion 12 | yes |
| 9 | [ ] `03-09-PLAN.md` | 8 | Narrow width + preference pass; **re-arms assertion 24 (D-35)**; assertion 18 | yes |
| 10 | [ ] `03-10-PLAN.md` | 9 | `Controls.css` split + dead-style sweep; assertions 20/21 | yes |
| 11 | [ ] `03-11-PLAN.md` | 10 | Own the SVG→PNG path, remove `html2canvas`, legend typography; assertion 25 + **assertion 24 re-proven against the new path** | **no** — D-34 + D-25 one-way gates |
| 12 | [ ] `03-12-PLAN.md` | 11 | Independent non-author review of the aggregate diff + full Chrome gate | **no** — reviewer-independence gate |

Waves are strictly sequential: every plan shares `files_modified` with its predecessor, and
`src/utils/export.ts` was deliberately not parallelised with the responsive gate that tests it.

**Two notes for whoever executes this.** `03-11` deliberately was **not** split despite its size:
its two one-way checkpoints and the non-negotiable probe battery must sit in one commitment chain,
because a plan boundary between the `export.ts` rewrite and its proof would let a partially-proven
export path land at a commit boundary. And every plan carries `estimate.confidence: low` — fewer
than three completed phases carry actuals here, so **weigh the task and file counts above the
token figures.**

**Key decisions — all resolved before planning** (`03-CONTEXT.md` D-01…D-35): the app bar
**dissolves entirely** (D-11); the narrow-width treatment is a **bottom sheet** over a bottom
bar (D-20); the accent is **Apple Blue `#0071e3`**, reserved for one element per surface
(D-05). Rail/panel widths, section order, and per-surface recipes are fixed in
`03-UI-SPEC.md`.

**Out of scope (Phase 3):** any change to map fills, palettes, borders, legend *content* model,
bands/text tools (Phase 4); any data features (Phase 5).
*(**Amendment 1** — **dark mode is now IN scope**, ported class-based from Themely's "Lights
Out" palette. The flip mechanism moves from `prefers-color-scheme` to a **`.dark` class on the
editor mount root** (D-08), set by a neutral toggle pinned in the rail footer and persisted
through the storage-adapter interface (D-30). **No `prefers-color-scheme` read anywhere** — not
even to seed a first-run default — so a future host controls the class with no OS listener to
fight it.)*

**Risks:**
- The CSS contract test is load-bearing for export fidelity — rewriting it without RED-proving
  each assertion recreates the "gate that cannot fail" failure mode this repo has shipped three
  times.
- **The dark-mode switch silently disarms an existing gate (D-35).**
  `tests/e2e/responsive.spec.ts:1025,1048` proves exported PNGs are identical across themes by
  flipping `page.emulateMedia({ colorScheme })`. Once `.dark` drives the palette that emulation
  is a **no-op**, both exports are trivially identical, and **Live Invariant 9 loses its only
  browser-level guard**. The assertion must be rebound to toggling the class and RED-proven by
  making the export theme-sensitive on purpose.
- The `02-28` matrix binds `fe5f946`, so restyling before the owner runs it must not be allowed
  to confuse which build the matrix describes — mitigated by D-31's tag.
- `03-10` rewrites the export chokepoint. Highest-risk change in the phase.

---
## Phase 4: Visual & Cartographic System (1.5–2 weeks)

**Goal:** Give the studio a real cartographic language: **hue-family sequential palette
ramps** (reds, blues, purples, greens — ordered light→dark shades with a stable
value→shade-index API, replacing the flat 10-swatch `COLOR_PRESETS`), **water/ocean shading
presets**, an **interior-borders-only stroke system** so country outlines all but disappear
against water, **title/footer white gradient bands**, **export-safe text tools**, and a
**legend overhaul** with range-style entries and a "no data" row. Everything lands in the
SVG composition layer and survives the html2canvas export clone byte-for-byte.

**Depends on:** Phase 3 (tools live in the HUD; band/text editing needs its sections).
Ramp model (`04-01`) is deliberately first — Phase 5's classing engine binds to it.

**Plans:**

1. `04-01` **Ramp data model.** Pure module: a ramp = hue family + N ordered shades +
   `shadeForIndex(i, n)` / `shadeForValue(t)` accessors; serialization stable for
   persistence. *Gate:* unit tests including order monotonicity (shuffle a ramp → RED).
2. `04-02` **Ramp presets + palette UI.** Curated red/blue/purple/green/neutral ramps
   (Eurostat-grade, light→dark), WCAG-checked label contrast per shade; HUD palette section
   renders ramps as ordered strips; manual per-country coloring keeps custom hex. *Gate:*
   a contrast assertion that fails if any shade/label pairing drops below threshold.
3. `04-03` **Water & background presets.** `--map-surface` becomes a creator-facing choice
   (paper white, cool tint, soft grey, light blue); opaque, export-safe, persisted. *Gate:*
   export e2e samples PNG background pixels — preset change must change bytes (RED-provable
   by pinning the wrong preset).
4. `04-04` **Interior-border mesh (build-time).** Extend the mapshaper pipeline to derive a
   shared-interior-borders line layer from the world asset (edges present in exactly two
   polygons); hash-recorded in `world-manifest.json` beside the polygon asset;
   `npm run data:world:check` extended to verify it. *Gate:* the check fails on a mesh whose
   hash or edge count drifts from the manifest (mutate one byte → RED).
5. `04-05` **Border rendering rework.** Fills keep no/hairline stroke; the interior mesh is
   drawn as its own non-interactive layer inside the camera transform, weight states
   (hover/selected) re-expressed on it; coastlines therefore render effectively unstroked.
   `non-scaling-stroke` pinning in the export clone preserved. *Gate:* export e2e asserts a
   coastline sample point has no dark stroke while an inland border sample does — each
   direction broken once and observed RED.
6. `04-06` **Title/footer gradient bands.** Optional top band (default on) and bottom band
   (default off): white→transparent vertical gradients anchored to the square's edges,
   height creator-adjustable up to a hard cap of **1/7 of the export square** each; rendered
   as composition-layer SVG rects with gradient fills (no CSS `filter`/`backdrop-filter` —
   export-unsafe). *Gate:* unit test on the cap (request 1/5 → clamped, and a clamp-removal
   mutation goes RED); export e2e verifies band pixels in the PNG.
7. `04-07` **Text tools.** Title / subtitle / attribution text boxes: SVG `<text>` in the
   composition layer, HUD editing (content, size step, weight, alignment, position within
   band), sanitized input, sensible length bounds. *Gate:* export e2e proves text lands in
   PNG bytes; a refusal path for text overflowing the square (mirrors legend overflow
   blocking).
8. `04-08` **Legend overhaul.** Fix the editability gaps found in UAT (labels, order,
   position, style must be *reachably* editable from the HUD); add range-entry mode
   ("6.0–10.0") alongside label mode; add an optional "no data" row bound to the
   neutral-unit grey. *Gate:* e2e drives every editing affordance; the "no data" row must
   fail RED if the neutral color and the row's swatch diverge.
9. `04-09` **Persistence V3.** Compositions persist ramp/water/border choices, bands, and
   text boxes; V2 migrates in memory; the same pre-parse raw/depth/node bounds extended and
   re-tested. *Gate:* storage unit suite (bounds, migration, round-trip) + persistence e2e.
10. `04-10` **Composition export integration.** One e2e that builds the full reference-style
    frame — ramp fills, quiet coastlines, top band, title, range legend — and byte-inspects
    the downloaded 1080×1080 PNG. *Gate:* the discrimination controls from `02-27` reused so
    a blank export cannot pass.
11. `04-11` **Independent non-author aggregate review + full gate** (lint/test/tsc/build +
    Chrome e2e), same bar as `03-11`. *(Edge is not installed on this machine — see D-33; state
    the browser scope plainly rather than inferring an Edge pass.)*

**Key decisions at plan time:** exact ramp hex sets; whether hover/selected weight lives on
the mesh or a duplicate highlight path; band gradient stops; text font stack (system vs.
bundled — bundled needs license care and export embedding).

**Out of scope (Phase 4):** value→class binding and any data import (Phase 5); pattern
fills; inset boxes; label auto-placement beyond the fixed band positions.

**Risks:** the mesh layer must never drift from the polygon asset (hash-bind both, verify in
`data:world:check`); gradient/text rendering under html2canvas is the highest-fidelity risk —
prove PNG bytes early (`04-06`/`04-07`), not at the end; ramp contrast vs. white value labels
is an accessibility trap (owned by `04-02`'s gate).

---
## Phase 5: Data-Driven Maps (1–1.5 weeks)

**Goal:** A creator uploads a CSV of countries and values, and the map fills itself: a
**classed choropleth engine** (quantile / equal-interval / manual breaks, adjustable class
count) maps values onto a Phase 4 ramp with proportional shading, unmatched countries fall to
the "no data" class, optional **per-country value labels** render export-safe, and the range
**legend generates itself** from the breaks. Deterministic and fully client-side — no
network, no LLM (see the owner-gated subsection).

**Depends on:** Phase 4 (`04-01` ramp API, `04-08` range legend, neutral "no data"
treatment) and Phase 3 (HUD slot for the Data section).

**Plans:**

1. `05-01` **CSV parser.** Client-side, bounded before parse (size/row/field caps in the
   spirit of `storage.ts`), quoted-field/RFC-4180 tolerant, typed result contract
   (`parsed | refused(reason)`), zero dependencies or one vetted parser — plan-time
   decision. *Gate:* unit suite over malformed fixtures (unterminated quote, BOM, CRLF,
   10MB bomb → refused), each refusal RED-provable.
2. `05-02` **Country matcher.** Column mapping UI + matcher: exact ISO-3 first, then
   case/diacritic-insensitive name match against the 195-core catalog + alias table
   ("Czechia"/"Czech Republic", "Türkiye"/"Turkey"); ambiguous or unmatched rows go to an
   explicit report, never silently dropped; neutral units (Kosovo et al.) are reported as
   "not colorable", not matched. *Gate:* unit fixtures for alias, ambiguity, and
   neutral-unit rows; a silent-drop mutation must go RED.
3. `05-03` **Classing engine.** Pure functions: quantile, equal-interval, and manual break
   arrays; adjustable class count (3–9); stable tie/edge handling; missing → "no data".
   *Gate:* property-style unit tests (every value lands in exactly one class; class edges
   verified against hand-computed fixtures).
4. `05-04` **Ramp binding + apply transaction.** Class index → `shadeForIndex`; applying a
   dataset is **one undoable action** in colors-only history (fits the existing reducer);
   re-applying with new breaks replaces, not stacks. *Gate:* unit + e2e undo/redo across an
   apply.
5. `05-05` **Data HUD section.** Upload, column mapping, break method/count controls, live
   preview, unmatched-row report surface; refusals routed through the `ToastRegion`
   allowlist. *Gate:* e2e drives the full happy path and one refusal path.
6. `05-06` **Value labels.** Optional per-country labels (the dataset value): formatting
   (decimals, `%`, thousands), centroid-anchored with the existing label-point logic,
   automatic light/dark text per underlying shade (uses `04-02` contrast machinery), small
   countries elide below a zoom-dependent threshold; export-safe SVG text. *Gate:* export
   e2e finds label glyph pixels in the PNG; contrast assertion RED-provable.
7. `05-07` **Auto legend from breaks.** Classing output feeds `04-08` range entries +
   "no data" row automatically; regenerates on break changes; stays hand-editable after.
   *Gate:* e2e asserts legend ranges equal engine breaks (mutating the wiring → RED).
8. `05-08` **Persistence + integration + independent review.** Dataset bindings persist
   (bounded); one integration e2e reproduces the full Eurostat-style reference frame from a
   fixture CSV and byte-inspects the PNG; independent non-author aggregate review + full
   gate.

**Owner-gated (NOT scheduled — requires new explicit authorization):** LLM-assisted messy-data
import ("paste anything, the model maps it"). It requires network egress and an API key, which
violates the standing browser-only/localhost-only/no-secrets constraint — the same
authorization class as deployment. The deterministic CSV path above is the deliverable; this
item may not be started, stubbed, or implied shipped without a recorded owner decision.

**Key decisions at plan time:** vendored parser vs. hand-rolled; alias table source;
label elision threshold; whether a dataset re-apply prompts when manual colors would be
overwritten.

**Out of scope (Phase 5):** multi-dataset overlays, time series/animation, diverging ramps
(sequential only in v1.1), API/URL data sources, LLM import (owner-gated above).

**Risks:** name-matching errors silently coloring the wrong country is the credibility
killer — the unmatched/ambiguous report is a hard requirement, not polish; large-CSV
performance (bound before parse, like storage); undo semantics across bulk apply must not
flood the 50-action history.

---
## Phase 6: Polish & Launch (1–1.5 weeks)

**Goal:** Production-ready product, documentation, user testing — the v1.1 close-out.

**Depends on:** Phases 3–5 complete; the v1.0 owner gates resolved.

**Plans (sketch — final breakdown at plan time):**

1. `06-01` Onboarding flow + tooltips for the HUD tool set
2. `06-02` Keyboard shortcut system + reference sheet
3. `06-03` WCAG AA audit across the new chrome, ramps, labels, and bands; fixes
4. `06-04` Performance pass (large-CSV apply, label rendering, export latency) with
   measured before/after numbers — no self-comparing gates
5. `06-05` Error-handling and refusal-copy sweep (every path through the `ToastRegion`
   allowlist, creator-safe language)
6. `06-06` User guide / FAQ for creators (map workflow, CSV format spec, export tips)
7. `06-07` Load testing (100+ map loads, rapid color changes, repeated CSV applies) +
   export quality verification + offline functionality test
8. `06-08` Launch decision package for the owner (see below) + final exact-SHA gate +
   human acceptance matrix for v1.1, same evidence bar as `02-27`/`02-28`

**Owner-decision items (explicitly NOT scheduled until decided):**

- **Deployment to a public URL** (GitHub Pages / Vercel / Netlify) — **requires a new
  explicit owner authorization; none exists.** Localhost-only remains the standing state.
- **Malta/Liechtenstein-style inset boxes** — a deliberate **scope reversal** of Phase 2's
  "artificial small-island markers, inset maps" exclusion; needs an owner decision before
  any plan references it.
- **LLM-assisted data import** — carried from Phase 5's owner-gated subsection; same
  authorization class as deployment.

### Testing

- Deferred compatibility certification for Firefox, Safari, and previous browser versions
  when those environments become available. **No phase has claimed these passed, and none
  may.**
- Historical border accuracy spot-check — **only if the deferred snapshots have shipped by
  then; they have not.**

### Out of Scope (Phase 6)

- Historical geometry in any form (still a data-acquisition problem)
- Advanced analytics/tracking
- User authentication

---

## Beyond v1.1 (Future, unscheduled)

- Historical border data acquisition — the preserved `02-33` → `02-13`–`02-16` → `02-34` →
  `02-35` → `02-17` chain runs unchanged **when rights-cleared archival material exists**
- Non-European historical borders (Asia, Africa, Americas)
- Diverging and categorical palette ramps; pattern/hatching fills
- Real-time collaboration; community border repository
- Animated transitions between time periods; batch export
- Mobile app version; Discord/API integration
- **Themely integration** — embed the editor in the Themely web app as an entitlement-gated tool
  for post makers (alongside the planned slideshow image generator). Prerequisite shape: Phase 3
  builds the HUD as a mountable editor component behind an explicit boundary (storage adapter +
  asset base URL + entitlement props); Themely's backend would also make the owner-gated LLM
  import viable by proxying the API key server-side. New explicit authorization required before
  any embedding work starts (it ends localhost-only scope).

---

## Success Metrics (v1.0 + v1.1)

- [ ] Tool used by 3+ creators in the group
- [ ] Average map creation time: <5 minutes
- [ ] **CSV → finished shaded map in <2 minutes** with zero unreported mismatches
- [ ] **A creator reproduces the Eurostat-style reference frame** (ramp, bands, title,
      range legend, labels) without assistance
- [ ] 95%+ user satisfaction (basic survey)
- [ ] Zero crashes in first 100 uses per creator
- [ ] Export quality rated "ready for Instagram" by testers

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Historical border data sparse/inaccurate | High | Use deterministic source manifests, exact hashes/licenses, cross-checks, six-region review atlases, and blocking factual approval before production promotion |
| Map rendering performance varies by browser/machine | Medium | Generate paths once, move the camera by transform only, cache snapshots, preserve diagnostics, and block only on the explicit warm-switch NFR3 plus functional stability |
| Wrapped camera/export parity drifts | High | Use one constrained camera transform, synchronous freeze/finalize transaction, Pacific/date-line E2E, and exact downloaded PNG inspection |
| Browser storage quota/corruption | Low | Preserve max-10 typed partial recovery, bounded nested validation, V1/V2 in-memory migration, and explicit creator feedback |
| Ramp/label contrast fails accessibility | Medium | WCAG contrast assertions land with the ramps (`04-02`) and labels (`05-06`), not in a later audit |
| CSV mis-matching colors the wrong country | High | ISO-3-first matching, alias table, mandatory unmatched/ambiguous report, neutral units reported not matched — silent drops are gate-tested |
| Interior-border mesh drifts from the world asset | High | Mesh is hash-recorded in `world-manifest.json` and verified by `npm run data:world:check` in the same run as the polygon asset |
| Bands/text render differently in export clone | High | Composition-layer SVG only, no CSS filters; PNG byte inspection lands in the same plan as each feature |
| Users don't adopt tool | Medium | Gather feedback from 2–3 creators during Phases 3–5 and iterate within the locked product boundary |

---

## Dependencies

- **GeoJSON libraries:** D3 geo APIs and `@types/geojson`
- **UI framework:** React 18
- **Export library:** html2canvas
- **Build-time data:** exact-pinned mapshaper (polygon asset + interior-border mesh)
- **Browser validation:** exact-pinned Playwright Test using installed Chrome and Edge channels
- **Data sources:** Natural Earth 5.1.1 plus source/license/reviewer-approved historical evidence
- **CSV:** client-side parsing only; parser choice decided in `05-01`

---

## Timeline (Estimated)

```
Week 1–2:   Phase 1 (Foundation) — complete
Week 2–3.5: Phase 2 engineering platform and integration — complete; owner gates pending
v1.1 from Phase 2 acceptance:
  ~1–1.5 wk  Phase 3 (Clean UI Overhaul)
  ~1.5–2 wk  Phase 4 (Visual & Cartographic System)
  ~1–1.5 wk  Phase 5 (Data-Driven Maps)
  ~1–1.5 wk  Phase 6 (Polish & Launch)
Additional: Historical asset curation/review as evidence availability requires
```

The original 1.5–2 week Phase 2 estimate applies to the engineering platform only. It is not
a truthful fixed estimate for four source-complete, licensed, factually reviewed historical
snapshots across six regions. v1.1 estimates are engineering estimates and assume no scope
reversals (insets, LLM import, deployment) are added mid-phase.

---

## Next Steps

1. **Hand `02-28` to the owner.** The matrix is prepared and bound to `fe5f946`; the automatable
   cells are pre-filled with cited evidence. Every physical cell is `PENDING` and must stay that
   way until a human performs the check. **This precedes Phase 3.**
2. **Close `02-25` honestly, or leave it open.** Both patches are applied, but the approval on
   file is blanket and sight-unseen. Do not retro-describe it as hash-bound.
3. **Decide the NFR3 warm-switch timing threshold** — set one from the advisory samples already
   recorded in `tests/e2e/history.spec.ts`, or explicitly extend D-63 into Phase 2. D-63 retired
   timing gates for **Phase 1 only** and does not carry forward on its own.
4. ~~**Run `/gsd:plan-phase 3`**~~ **DONE 2026-08-06.** Phase 3 is planned: 11 plans, four
   roadmap amendments landed above, and `03-UI-SPEC.md` approved. Phase 3 does **not** wait on
   the `02-25`/`02-28` gates — it only must not disturb their evidence, which D-31's tag on
   `fe5f946` handles. ▶ Next: `/gsd:execute-phase 3`.
5. **Resolve the Edge-certification contradiction against Phase 2, not Phase 3.** `STATE.md`
   records "Edge 150 — 71/71" at `fe5f946`, but Microsoft Edge is **not installed** on this
   machine. That record is immutable Phase 2 evidence: **annotate it, never rewrite it.** Until
   it is explained, no phase may cite it. Phase 3's `03-11` gate is scoped to Chrome and says so
   (D-33).
6. **Do not dispatch any historical plan.** The material does not exist; approval cannot create it.
7. **Deployment stays closed.** If hosting is ever wanted, it needs a new explicit authorization.

## Progress

**Canonical per-phase status. Counts here are the source of truth — no other file restates them.**

| Phase | Name | Status | Plans | Detail |
|---|---|---|---|---|
| 1 | Foundation & Modern Map | ✅ **CLOSED** 2026-07-22 | 22/22 | 73/73 active must-haves verified; 7 deployment-only must-haves deferred (01-16, 01-17); 18/18 requirements satisfied. Chrome 150 + Edge 150 accepted, localhost-only. → [archive](milestones/v1.0/ROADMAP-ARCHIVE.md#phase-1-foundation--modern-map-115-weeks) · [phase dir](milestones/v1.0/phases/01-foundation-modern-map-1-1-5-weeks/) |
| 2 | Region Variants & Advanced Features | 🔄 **EXECUTING** — engineering complete, 2 owner gates open | 26/36 | World canvas, camera, Locate, legend, composition persistence, export transaction. Historical snapshots **deferred** → [`02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md) |
| 3 | Clean UI Overhaul | 📋 **PLANNED** (v1.1) — ready to execute | 0/12 | Full-bleed canvas + icon rail/flyout HUD, Themely token system, Design.md, dark mode, owned SVG→PNG export path. **4 roadmap amendments landed 2026-08-06.** Context `03-CONTEXT.md` (D-01…D-35) · research `03-RESEARCH.md` · design contract `03-UI-SPEC.md` (28 RED-provable assertions). **12 plan files** — the § Phase 3 ledger maps them to the eleven numbered items. |
| 4 | Visual & Cartographic System | ⏳ **PENDING** (v1.1) | 0/0 | Sequential ramps, water presets, interior-border mesh, gradient bands, text tools, legend overhaul. |
| 5 | Data-Driven Maps | ⏳ **PENDING** (v1.1) | 0/0 | CSV import, classed choropleth engine, value labels, auto range legend. LLM import owner-gated, not scheduled. |
| 6 | Polish & Launch | ⏳ **PENDING** (v1.1) | 0/0 | Onboarding, shortcuts, WCAG, perf, guide, v1.1 acceptance. Deployment/insets/LLM are explicit owner decisions. |

### Phase 2 plan ledger

**36 plans: 26 complete · 8 deferred · 0 engineering remaining · 2 owner gates open.**

| Group | Plans | Status |
|---|---|---|
| Foundation + contracts | `02-01`–`02-06` | ✅ complete |
| Camera, browser, Locate, persistence | `02-07` · `02-08` · `02-09` · `02-19` · `02-20` · `02-29` | ✅ complete |
| Historical engine + validation | `02-10` · `02-11` · `02-12` | ✅ complete (engine only — no geometry shipped) |
| Catalog verification | `02-17` | ✅ complete (rescoped — Modern-only, hash-verified, zero promotion) |
| Period selector + world states | `02-18` | ✅ complete (rescoped — also closed the missing Reset View and stale Europe fatal copy) |
| Wrapped-composition export + export transaction | `02-21` · `02-30` | ✅ complete (F5.5 wired end to end) |
| Global UI surfaces + safe status copy | `02-22` | ✅ complete |
| Composition root + integrated transactions | `02-23` | ✅ complete (guards + `transactions.spec.ts`; `App.tsx` unchanged) |
| Visual system + responsive slice | `02-24` | ✅ complete (CSS contract + `responsive.spec.ts`) |
| Documentation patch application | `02-26` · `02-36` | ✅ complete (both `02-25` patches applied, two-way hash proof) |
| Final exact-SHA gate | `02-27` | ✅ complete — journey spec landed; gate **PASS at `fe5f946`** |
| Historical source readiness | `02-31` · `02-32` | ⏸ **DEFERRED** — hash-bound **BLOCKED** evidence, `deliveryCounted=false`, zero production snapshots |
| Historical approval + curation chain | `02-33` · `02-13`–`02-16` · `02-34` · `02-35` | ⏸ **DEFERRED** — no rights-cleared source material exists |
| Owner gate — documentation approval | `02-25` | ⏳ **OPEN** — patches applied under a blanket, sight-unseen, **not hash-bound** approval; Task 2 never executed |
| Owner gate — human acceptance matrix | `02-28` | ⏳ **OPEN** — prepared and bound to `fe5f946`; all physical cells `PENDING`. Cannot be delegated, automated, or blanket-approved. |

### Verified gates — bound to `fe5f946060707c48c3d9591d368b5f3f8f90dd4d`

Ran 2026-07-26 from a **fresh detached clean worktree with a fresh `npm ci`**; the worktree was
removed and pruned afterwards. Machine evidence:
[`02-27-EXACT-COMMIT.json`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json).

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **516/516** across 38 files |
| `npm exec tsc -- -b` | clean |
| `npm run data:world:check` | 248 units, 195 selectable core states |
| `npm run build` | clean |
| Chrome E2E | **71/71** |
| Edge E2E | **71/71** |
| Blocked historical packets | both exit **1** — failing closed is the correct result, not a gate failure |
| Historical promotion | **zero** — catalog Modern-only, asset hash recorded == actual |

**Not covered by this gate, and never claimed:** Firefox, Safari, and previous-version
certification; browser *versions* are recorded by hand in `02-27-SUMMARY.md` rather than captured
by the script; the physical acceptance checks in `02-28`.

## Deferred out of v1.0

Milestone-level deferrals — historical snapshots, deployment, and Firefox/Safari certification —
are recorded once, in [`MILESTONES.md`](MILESTONES.md) § Deferred out of v1.0. Phase-local
deferrals live in each phase's `deferred-items.md`.
