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
- **v1.1 — Clean Studio & Data-Driven Maps** — Phases 3–6 (defined 2026-08-06). The
  classed-choropleth product vision: clean UI, cartographic visual system, CSV-driven maps,
  polish/launch. Phase 3 shipped at the code level 2026-08-06 and is **physically unverified**;
  Phases 4–6 are pending. Per-phase status lives in the **Progress table below**.

**Why v1.0 closes at Phase 2:** every piece of v1.0 evidence — requirements annotations,
acceptance records, the archive capsule — binds Phases 1–2; the old "Phase 3: Polish &
Launch" stub had zero plans and zero evidence, so moving launch into v1.1 rewrites nothing.
`MILESTONES.md` gets its v1.1 entry when v1.0 actually closes (recorded as a pending todo in
[`STATE.md`](STATE.md)).

Full milestone detail: [`MILESTONES.md`](MILESTONES.md).

## Phase Details

> **Closed phase entries are archived to the owning milestone's in-flight archive** —
> [`milestones/v1.0/ROADMAP-ARCHIVE.md`](milestones/v1.0/ROADMAP-ARCHIVE.md) (Phases 1–2) and
> [`milestones/v1.1/ROADMAP-ARCHIVE.md`](milestones/v1.1/ROADMAP-ARCHIVE.md) (Phases 3–6).
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
## Phase 4: Visual & Cartographic System (1.5–2 weeks)

**Goal:** Give the studio a real cartographic language: **hue-family sequential palette
ramps** (reds, blues, purples, greens — ordered light→dark shades with a stable
value→shade-index API, replacing the flat 10-swatch `COLOR_PRESETS`), **water/ocean shading
presets**, an **interior-borders-only stroke system** so country outlines all but disappear
against water, **title/footer white gradient bands**, **export-safe text tools**, and a
**legend overhaul** with range-style entries and a "no data" row. Everything lands in the
SVG composition layer and survives Phase 3's owned SVG→PNG rasterisation path
(`src/utils/export.ts`, D-34) byte-for-byte.

**Depends on:** Phase 3 (tools live in the HUD; band/text editing needs its sections).
Ramp model (`04-01`) is deliberately first — Phase 5's classing engine binds to it.

**Plans:** 16 plans across 13 waves (planned 2026-08-06). The **executable** plan list is the
checklist immediately after the design breakdown below.

**Design breakdown (11 items, authored at roadmap time).** Retained verbatim: it is the phase's
design narrative, and it is the amendment target for **CD-11** (in item 5, the claim about where
hover and selected weight states are re-expressed) and **CD-8** (in item 8, the legend-entry mode).
Both are amended **during execution** by `04-09` and `04-13` respectively, which negative-grep for
the exact phrases — so **do not quote those phrases anywhere else in this file**, and do not rewrite
the breakdown here.

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
   drawn as its own non-interactive layer inside the camera transform, date-line wrapped on the
   same offsets as the polygons; hover and selected weight states are carried by a **dedicated
   `data-editor-only` highlight layer**, which the export clone removes wholesale, so they
   provably cannot move an exported pixel; coastlines therefore render effectively unstroked.
   `non-scaling-stroke` pinning in the export clone preserved. *Gate:* export e2e asserts a
   coastline sample point has no dark stroke while an inland border sample does — each
   direction broken once and observed RED.
   > **Amended 2026-08-07 (CD-11, plan `04-09`).** This line originally said the weight states
   > were carried on the interior mesh. They cannot be: a mesh segment is the boundary **between
   > two countries**, so weighting one segment would highlight both. The correction came from
   > `04-UI-SPEC.md § 6.9` during Phase 4 planning and was reported rather than silently
   > diverged from; `04-09` implemented the highlight layer and landed this amendment.
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
   position, style must be *reachably* editable from the HUD); ship **two legend forms** —
   a **stacked bar** whose contiguous swatches carry short tick leaders and print **break
   boundaries between ticks**, and a restyled **rows** form — with the form defaulting from
   the colouring technique and an explicit creator override; add an optional "no data" row
   bound to the neutral-unit grey. *Gate:* e2e drives every editing affordance; the "no
   data" row must fail RED if the neutral color and the row's swatch diverge.

   > **Amended 2026-08-07 (CD-8, plan `04-13`).** This bullet asked for a mode that prints
   > a literal range per row alongside label mode. That is **not what the owner's own
   > reference does**: `04-CONTEXT.md § specifics` characterises the Eurostat image as a
   > stacked colour bar whose numbers are **break boundaries read *between* ticks**, never
   > printed as row text — a *different legend form*, not a variant of this one.
   > `04-UI-SPEC.md § 6.7` follows CONTEXT on the stated ground that the owner's reference
   > outranks an earlier straw man, and flagged that this line needed correcting. The
   > sentence above now describes what shipped. **Reported and corrected, never silently
   > diverged from.**
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

**Executable plans (16, wave-ordered).** Phase 4 carries **no REQ-IDs** — coverage is tracked
against `04-CONTEXT.md` decisions **D4-01 … D4-18**, which is what each plan's `requirements` field
holds. Deliberate substitution, not dropped requirements.

Plans:
- [x] `04-01-PLAN.md` — **TRACER.** Contrast module, water presets, the new `Map style` rail tool, and one path end-to-end: composition state → serialized `rect[data-layer=surface]` → export clone → sampled PNG pixels *(wave 1, owner gate: preset list + Map-style undo semantics)* — **DONE 2026-08-06** (`42b2f0d`, `fdda760`, `873474f`). Gate answered under a **blanket sight-unseen proceed-authorization — not a content review, not hash-bound** ([`04-AUTHORIZATION.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-AUTHORIZATION.md)): `preset-set-a` (white `#FFFFFF` default + warm paper / cool tint / soft grey + custom hex) and `undo-b-reset-action` (history stays colours-only; `Reset Map Style` ghost action). Three corrections landed against the plan's own text: the prescribed RED probe #1 **could not go red** and was replaced with one on the real subject (`fill="var(--map-surface)"` exports `rgb(0,0,0)`); the spec's `0.216` luminance floor is **too permissive** and ships as `0.2164`; the rail-height floor is **552px, not 540px** — **OQ-2 is open and worse than assumed.**
- [x] `04-02-PLAN.md` — Ramp data model: 5 families x 5 shades, `shadeForIndex` / `shadeForValue`, monotonicity + disjointness + label-contrast gates *(wave 2)* — **DONE 2026-08-06** (`8452425`, `e0053fd`, `a58b978`). A **palette was substituted rather than a gate loosened**: ColorBrewer 5-class Blues' `#3182BD` (L = 0.202924) sits inside the dead band where *neither* `#FFFFFF` nor `#111827` clears 4.5:1, so `blues` step 3 ships `#2171B5`. The band's upper edge equals `04-01`'s `MIN_COMPOSITION_SURFACE_LUMINANCE`; recorded in `coding-rules/frontend.md` because `04-08`/`04-10`/`04-11` all pick composition colours that carry ink. **The stricter 3:1 adjacent-step gate was NOT proposed** — the measurement does not support it (min 1.2944:1, max 2.5514:1; every ramp has a neighbour pair below 2:1).
- [x] `04-03-PLAN.md` — D4-10: all twelve neutral units become colourable; manifest + asset + script + runtime + harness at 207; four documents amended *(wave 2, owner gate: data-model route)* — **DONE 2026-08-06** (`f57f916`, `784fe17`, `cb8321a`). Gate answered **`policy-b-third-value`** under the blanket sight-unseen proceed-authorization: `coreStateCount` stays **195** and stays factually true, `selectableCount: 207` is added alongside it. Route (A) was **measured blocked** — `GIB` is a 10m supplement and `createCanonicalBytes` resolves core records only against the 50m index; Antarctica is not a UN member state. **No geometry promoted, no snapshot added, no rights/factual/topology approval implicated** — the hash chain was **re-derived, not waived** (manifest `22af5b62…`, asset `d02b604a…`). The stale `kosovo-renders-white-uncolorable.md` is annotated **SUPERSEDED** and now tracked.
- [x] `04-04-PLAN.md` — latin-ext font widening: two `@font-face` rules for one family with `unicode-range` *(wave 3)* — **DONE 2026-08-06** (`8546156`, `f1bec75`, `e4ad883`). Asset measured, not copied: **85,272 B**, SHA-256 `a28eb6d3…`, licence re-verified by live fetch (`"license": "ofl"`), retiring assumption A6. **Found a latent defect:** the *export* path's latin face carried **no `unicode-range` at all** — two unranged faces at the same family/weight don't divide the character space, so the latin-ext file would have taken the whole string. `buildFontFace` now always emits a range, making an unranged face structurally unemittable. Size delta `+113,696 B` base64 — the `03-01` estimate to the byte — but **built `index.js` gzip +86.01 kB, which no planning doc had projected.** A12 (opening the PNG and inspecting glyphs) explicitly **NOT** claimed; it belongs to `04-16`.
- [x] `04-05-PLAN.md` — `{rampId, t}` colour identity with one `resolveColorValue` chokepoint *(wave 3, owner gate: one-way identity model)* — **DONE 2026-08-07** (`6393051`, `04251f0`). Gate answered **`identity-union`** under the blanket sight-unseen proceed-authorization; option (B) rejected specifically for creating **two sources of truth that can disagree**. **Live Invariant 10 added.** Invariant 2 untouched — a selection action leaves `history` referentially identical (`toBe`), asserted. Legend still receives resolved hexes: `blues@0.5` and `blues@0.51` yield one entry. `isPresetColor` deleted (zero consumers). **`04-14` inherits V3:** saves resolve to hex at serialization, so bytes stay a valid V2 record — **lossy in ramp identity, never invalid** — and a union object per country raises a real node/depth budget question. Plan text was wrong twice: the reducer lives in `MapStateProvider.tsx`, not `useMapState.ts`, and `hasReservedObjectKey` never guarded `ColorMap` (the real guard is `isSafeStableCountryId`).
- [x] `04-06-PLAN.md` — Interior-border mesh derivation, bound to its own hash and re-derived in `--check` *(wave 3)* — **DONE 2026-08-07** (`380102b`, `c79bbf9`, `8472526`). 327 geometries, 366,767 B, `72939b8f…`, byte-reproducible, derived from the current post-`04-03` asset. Invocation settled as the mapshaper **Node API** (was `[ASSUMED, A3]`) — it takes bytes, so `--check` hands it the canonical buffer it just regenerated. **Research corrected:** the output is **301 `LineString` + 26 `MultiLineString`**, not 327 `LineString`s — a LineString-only count would agree happily with a mesh that lost all 26. **The hash-binding hole is measured and recorded, not assumed:** reversing D4-10 in memory plus renaming France moves the polygon digest and leaves the mesh digest **identical**, so a properties-only change is undetectable mesh-side. Written into the manifest's `interiorBorderMesh.binding`, `coding-rules/data.md`, and a comment above `verifyMesh`. **No geometry promoted, no approval implicated.**
- [x] `04-07-PLAN.md` — Colors panel redesign (`G-3`) + the 280 → 360px widening and its CD-1 annotation *(wave 4)* — **DONE 2026-08-07** (`00a57c7`, `09fc48e`, `434dfb9`, `b5262d6`). **Selector ceiling went DOWN, 341 → 331** — both totals measured by running the gate at ceiling 0. `--panel-width-open: 360px` is one declaration with three consumers; CD-1's thirteen rows landed in `03-UI-SPEC.md` **and** `Design.md` in the *same commit* as the width. **Zero exported-PNG change** — no export-path file in the diff. Ramp painting is now reachable through `04-05`'s seam. `mapStyle.css`'s privately-authored flat vocabulary was **promoted to a shared `.panel-*` block** rather than copied (the defect `04-UI-SPEC.md § 11` rule 1 names) — reported as a move, 15 → 1 selectors there. Three gates **replaced, not renumbered**, because the redesign deleted their subjects and they would otherwise have iterated empty lists and passed. **`G-3` resolution is NOT claimed** — subjective, reserved for `04-16`'s physical check.
- [x] `04-08-PLAN.md` — Export stroke contract replaced, named weights, uncoloured fill *(wave 5)* — **DONE 2026-08-07** (`a06027e`, `3f686ca`, `a8fee9e`, `0c1fccf`). **`sanitizeExportClone`'s hard-set `#000000`/`0.75` was REPLACED, not deleted** — `readStrokeContract(clone)` resolves the contract *off the clone*, so `exportMapPng`'s signature never widened. Deleting the loop would have shipped the 2px selection border on wrapped date-line repeats. **The plan omitted `MapCanvas.css`, and without it the editor and the download would have disagreed** — a presentation attribute loses to `.country-path { stroke-width: 0.75px }`; fixed with vars on `svg.map-canvas`, not per-path inline styles, which would have out-specified `.hovered`/`.selected`/`.focused` and silently deleted every interaction affordance. **Four existing assertions were repaired, not re-baselined** — `navigation.spec.ts`'s D4-10 probe read 248 once `#E5E7EB` became the default fill; re-baselining would have kept it green and killed it. Gates assert sampled PNG pixels and ink counts (hairline 42 < thin 68 < bold 185), never an imported constant. ⚠ **Known Stub:** with coastlines defaulting to `none` and `04-09` not yet landed, **the map temporarily ships with no borders at all**.
- [x] `04-09-PLAN.md` — Mesh + editor-only highlight layers; the CD-11 amendment *(wave 6)* — **DONE 2026-08-07** (`caa6a3f`, `618868f`, `baf8cd4`, `bf6721b`). **`04-08`'s border regression is closed.** All 327 geometries draw as `g[data-layer="borders"]`, class `border-mesh-path` — deliberately neither `scene-path` nor `country-path`, because the exporter's normaliser resolves the *coastline* contract and would have deleted the interior borders outright at `coastlineWeight: none`. **Gate B could not fail on its first form and was caught:** with the highlight's stroke coming only from `MapCanvas.css`, deleting `data-editor-only` left the ring in a clone that renders nothing — a second accidental mechanism hiding the one under test, measuring 0 either way. Now inline *and* CSS, mutation measures 132 against tolerance 2; recorded as a deliberate divergence from `04-UI-SPEC.md § 6.9`, whose literal reading left two tokens unconsumed (RED-proved). **`04-08`'s coastline sample was contaminated** — Cabo da Roca sat 4.5 px from the Portugal/Spain line; moved to Australia's west coast, which has *no land neighbours*, so the exclusion is structural. Counts restated 42/68/185 → 27/37/113 **without lowering the floor of 8 to fit them**. **Precision answered with numbers:** the flag rounds rather than simplifies; max rendered displacement 4.33e-4 px at world camera, 1.04e-2 px at `MAX_ZOOM` — **keep it**, the escape hatch costs +21 % of the asset to move the worst case by a hundredth of a pixel.
- [x] `04-10-PLAN.md` — Gradient bands, with a gate that fails on removal **and** inversion *(wave 7)* — **DONE 2026-08-07** (`cfe80b6`, `fac55cd`, `ac64c87`). **The plan's prescribed inversion mutation is actually a removal** — swapping the two `<stop>` elements emits descending offsets, which SVG clamps to opacity 0; anyone following the plan literally would record a removal and believe inversion was covered. Real inversion swaps *opacities* with offsets ascending. **Probe order was load-bearing:** with presence last, a missing band reported "upside down"; presence now runs first, and independence is measured (inversion leaves presence green at 18.946 vs 5.626). **The top band is over open ocean** at the default camera (80–85 °N) and is invisible over water by design — measured 239.626 either way — so a bottom-band gate over Antarctica was **added** where signal is 2.1× larger. **The vacuous `clone.ids === 0` assertion finally bit** — warned about in `coding-rules/export.md` since `03-11` as "confirms the break instead of catching it"; replaced with unreferenced-ids / dangling-references / non-vacuity. **A `ResizeObserver` fix was reverted on principle** — it worked, but required adding `MapCanvas.tsx` to the resize-observer ownership gate's owner list, gutting the invariant on its own subject. ⚠ **Known Stub:** the legend currently sits *inside* the top band; `resolveBandExtents` is exported and unread until `04-12` wires the inset.
- [x] `04-11-PLAN.md` — Text tools: title / subtitle / attribution, bounds, sanitisation, refusal *(wave 8, owner gate: text-tool home + one-ink deviation)* — **DONE 2026-08-07** (`21d4dc0`, `5c13750`, `2abf60c`, `7340618`). Gate answered **`text-in-map-style, ink-one`**; ⚠ **`ink-one`/U-6 SHIPS UNREVIEWED** — flagged in the SUMMARY and bound for `04-ACCEPTANCE.md`. **The most valuable find of the phase:** a RED proof *defeated the gates*. Moving `<text>` outside the viewBox also moved a crop **derived from the text's own layout**, and `drawImage` from an off-bitmap source rect yields **transparent black**, which every ink counter reads as **solid ink** — the content floors passed on **28,050 phantom pixels** while the exact defect they exist to catch had happened, surfacing on the wrong assertion with a misleading message. `titleInkRegion` now bounds its crop to the 1080 frame; recorded as a rule in `export.md`. **One assertion could not fail and was replaced, not kept** — recovering the 1.0202em advance from `LEGEND_CHARACTERS_PER_LINE` goes green against an advance of `1`, because `floor()` eats the difference at all three legend sizes. **One claim held out with the measurement justifying it:** the legend background is 90 % opaque, so `04-10`'s largest band signal (3.490 luminance) arrives underneath as 0.35 — measured 3 of 765 — replaced by a stronger opaque-swatch claim. ⚠ **Handed to `04-12`:** the title baseline is 76 and the legend default inset is 32.
- [x] `04-12-PLAN.md` — Legend chrome deleted; band-aware default position (`G-1`) *(wave 9, owner gate: one-way field deletion)* — **DONE 2026-08-07** (`45f0dd9`, `cd8b0a8`, `6fa9eea`). Gate answered **`legend-delete-chrome`** under the blanket sight-unseen proceed-authorization, with the creator-visible consequence accepted: **every saved map reopens with no legend box and exports differently than a PNG the creator may already have posted.** Selector inventory **338 → 335**. Inset derived from `resolveBandExtents` and **required, never defaulted** — a hard-coded `y = 152` reddens the band-at-cap case at `expected 152 to be 186`, which is the proof the derived form does work a literal would not. **Four defects found while executing:** `export.spec.ts`'s legend-before-text pixel assertion **could no longer fail** once the panel was deleted — retired in place with its reason and replaced by a live-DOM layer-order gate, rather than left green with a neutralised subject; and three spec helpers were reading `rect').first()` (the deleted background panel) and would have silently started asserting the legend is 24 units wide. **Twelve itemised re-baselines**, each carrying its superseded measurement in source; none made to hide a real change. ⚠ **`G-1` NOT claimed resolved; `OQ-3` stays OPEN** — the legend measured `y = 32`, 2.96 %, **88 units inside the title band**, and eight properties beyond position were enumerated and classified, four still open.
- [x] **DONE 2026-08-07** (`ffbaa25`, `0fc831d`, `005d051`, `173b23a`) — human-verify gate **proceeded past, NOT passed**; **`G-1` not claimed resolved, `OQ-3` and `OQ-5` both OPEN**; `bar` ships as the inferred mixed-map default with the override present (a shipped default is not an answered question). **Five defects the new gates caught:** the bar overflowed the safe area at 30 entries (1040 > 1016); a two-line `large` label's ascender fell **outside** the legend bounds (656 ink px); **every reopened saved map silently changed its legend form** — `04-05` resolves colours to hex, so `inferLegendForm` returned `rows` for every reloaded map (1426 red legend px before reload, 484 after), now fixed by writing the resolved form; `final-integration.spec.ts`'s corner box missed the bar's marks and **reported a tidy zero**; and `export.spec.ts`'s co-occupancy crop evaluated to a **height of −14.4**. **Gate C's probe was wrong twice before it was right** — both recorded in the test source, and the pixel gate is **blind to a light empty container** and says so beside itself. **Task 1 was not written tests-first despite `tdd="true"`** — the type change had to compile; falsifiability is by mutation, not ordering. `data:world:check` was recorded **NOT RUN** (network unreachable); **the orchestrator re-ran it after the fact and it PASSES**, and no `public/data/` file was touched. ~~`04-13-PLAN.md`~~ — Two legend forms + the "no data" row; the CD-8 amendment *(wave 10, owner gate: `G-1` resolution + mixed-map default)*
- [x] **DONE 2026-08-07** (`79f96ae`, `4179079`) — gate answered **`v3-one-path`**; the five creator-visible defaults are asserted on a **hand-built V2 record**, so the acknowledgement is machine-checkable rather than prose. **`G-2` TESTED for the first time by human or machine — and the UAT's characterization is WRONG.** A 15-char label loads clean and refuses to export **at the default `medium` size**, but *the same label saved at `small` loads clean and exports clean*. So G-2 is "15–32 chars blocks **at the default size**", not "always blocks" — the trap is the pairing with the size a pre-restyle map was most likely saved at. All 18 lengths 15…32 checked at medium; 7-char control exports. **`F-1` is NOT validated by this** — proving the ceiling bites says nothing about whether 14 is the right number. **Node budget measured, not raised:** one worst-case 512-entry V3 record is **4,134 nodes** (V2: 2,584); a ten-record store **41,331 against 50,000**. It fits, and the honest half is that hostile-input headroom fell **48% → 17%**. Pinned behaviourally: twelve records parse, thirteen do not. **Three deviations:** text bounded at 100 rather than `characterBoundFor` (role bounds would truncate a legitimate saved title, turning a legible export refusal into silent data loss); `04-05`'s interim resolve-to-hex was in `storage.ts`, not `colors.ts`, so **`colors.ts` needed no change and was not modified** despite being in `files_modified`; and V3 drops `settings.backgroundColor`. ~~`04-14-PLAN.md`~~ — Persistence V3, and `G-2` exercised for the first time *(wave 11, owner gate: one-way migration)*
- [ ] `04-15-PLAN.md` — Composition export integration: the reference frame in real PNG bytes, no baseline image *(wave 12)*
- [ ] `04-16-PLAN.md` — Independent non-author review, the dependency gate, and the eight physical checks *(wave 13, owner gate)*

**Key decisions at plan time:** exact ramp hex sets; whether hover/selected weight lives on
the mesh or a duplicate highlight path; band gradient stops; text font stack (system vs.
bundled — bundled needs license care and export embedding).

**Out of scope (Phase 4):** value→class binding and any data import (Phase 5); pattern
fills; inset boxes; label auto-placement beyond the fixed band positions.

**Risks:** the mesh layer must never drift from the polygon asset (hash-bind both, verify in
`data:world:check`); gradient/text rendering through the owned SVG→PNG rasterisation path
(`src/utils/export.ts`) is the highest-fidelity risk — a serialised SVG rasterised as an image
sees no host stylesheet, so anything not inlined into the export subtree is silently lost —
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
   case/diacritic-insensitive name match against the 207-unit colourable catalog + alias
   table ("Czechia"/"Czech Republic", "Türkiye"/"Turkey"); ambiguous or unmatched rows go to
   an explicit report, never silently dropped; the twelve `self-colorable` units (Kosovo et
   al.) are **ordinary match targets** like any core state — a CSV row naming Kosovo matches
   it and paints it. *Gate:* unit fixtures for alias, ambiguity, and self-colorable rows; a
   silent-drop mutation must go RED.
   *Amended 2026-08-06 by D4-10 (Phase 4, plan `04-03`): this bullet previously said the
   neutral units were reported as uncolourable rather than matched. That is no longer true —
   every unit in the Modern scene is colourable, so there is no such bucket to report.*
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
- **Export library:** none — Phase 3 removed `html2canvas` (D-34). The SVG→PNG path is owned
  in-repo at `src/utils/export.ts`: serialise → inline base64 `@font-face` → `Image` →
  `drawImage` → `toBlob`, behind a generalised font-collection seam (D-34a)
- **Build-time data:** exact-pinned mapshaper (polygon asset + interior-border mesh)
- **Browser validation:** exact-pinned Playwright Test using the **installed Chrome channel
  only** (151.0.7922.75). **Microsoft Edge is not installed on this machine and is not
  certified** (D-33); Firefox, Safari, and previous-version certification have never been run
  in this repository and are never reported as passed
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
4. ~~**Run `/gsd:plan-phase 3`**~~ ~~**Run `/gsd:execute-phase 3`**~~ **BOTH DONE 2026-08-06.**
   Phase 3 shipped at the code level — 12/12 plans; its full entry and its four roadmap
   amendments moved verbatim to the
   [v1.1 archive](milestones/v1.1/ROADMAP-ARCHIVE.md#phase-3-clean-ui-overhaul-115-weeks).
   It did not disturb the `02-25`/`02-28` evidence: D-31's `acceptance-02-28` tag on `fe5f946`
   was created and verified, and the Phase 2 evidence directory is unchanged by Phase 3
   execution. **Nobody has looked at the result.** ▶ Next: work the 11 items in
   [`03-UAT.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-UAT.md) and decide **F-1** (the
   legend label export ceiling).
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
| 3 | Clean UI Overhaul | ✅ **COMPLETE** 2026-08-06 — owner-accepted on free exploration; structured UAT **skipped**, not passed | 12/12 | 637/637 unit · Chrome 103/103 · lint+build clean (Chrome 151 only; Edge not installed). Owner looked, exercised it, judged it good enough. **3 open follow-ups:** **colors panel needs heavy work (G-3 — design rework)** · legend sits too high (G-1) · saved-composition export break untested (G-2). **9 UAT cells unperformed — no screen-reader, touch, 200% zoom, latin-ext, or dark-theme check exists.** → [`03-UAT.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-UAT.md) · [`03-VERIFICATION.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-VERIFICATION.md) · [`03-12-REVIEW.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-REVIEW.md) · [archive](milestones/v1.1/ROADMAP-ARCHIVE.md#phase-3-clean-ui-overhaul-115-weeks) |
| 4 | Visual & Cartographic System | 🔄 **EXECUTING** 2026-08-06 — running under a **blanket sight-unseen proceed-authorization** ([`04-AUTHORIZATION.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-AUTHORIZATION.md)): decision gates are taken by the orchestrator and recorded; **the 2 human-verify gates are proceeded past, never passed** — the 8 physical checks in `04-16` will be recorded `NOT PERFORMED` unless a human performs them | 14/16 | ⚠ **`U-6` ships unreviewed and knowingly departs from the owner's Eurostat reference** — `04-11` took `ink-one` (a single composition ink `#111827`) under the blanket authorization. `04-UI-SPEC.md § 12` names U-6 **the row most worth the owner's eye**, and the owner has not seen it. The arithmetic forcing it: a second grey ink `#4B5563` (L = 0.0889) needs surface L ≥ 0.575 — near-white water only — which would retire most of the water-preset feature. Must surface as a named item in `04-ACCEPTANCE.md`. ⚠ **Browser scope drifted mid-phase:** plans `04-01`…`04-06` were certified on installed **Chrome 151.0.7922.75**, `04-07` onward on **151.0.7922.76** (Chrome auto-updated). `04-ACCEPTANCE.md` must state both, not one. Edge remains NOT installed and NOT certified. Sequential ramps, water presets, interior-border mesh, gradient bands, text tools, legend overhaul. **16 plans across 13 waves, tracer-first.** Coverage tracked against `04-CONTEXT.md` decisions **D4-01…D4-18** (18/18) — Phase 4 has **no REQ-IDs**, which is a mapping gap, not dropped scope. Plan-checker: **0 blockers**, 3 warnings folded in. **6 owner decision-gates + 2 human-verify gates are `autonomous: false`** and will stop execution. **3 one-way decisions** (D4-10, D4-11, D4-17) — saved compositions change appearance on load. → [`04-RESEARCH.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-RESEARCH.md) · [`04-UI-SPEC.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-UI-SPEC.md) · [`04-VALIDATION.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-VALIDATION.md) |
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
