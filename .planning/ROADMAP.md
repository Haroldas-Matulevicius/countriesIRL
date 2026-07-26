# Roadmap: CountriesIRL Map Generator

> **Status:** v1.0 — MVP — open 2026-07-21. Phase 2 executing: engineering complete, two owner
> gates open. **The [Progress](#progress) table below is canonical for status and counts.**
> **Pointers:** [`STATE.md`](STATE.md) (live position) · [`MILESTONES.md`](MILESTONES.md)
> (milestone outcomes + deferrals) · [`ARCHIVES.md`](ARCHIVES.md) (archive navigation) ·
> [`CODING_RULES.md`](CODING_RULES.md) → [`coding-rules/general.md`](coding-rules/general.md)
> (live invariants + immutable safety constraints) ·
> [`milestones/v1.0/`](milestones/v1.0/) (in-flight capsule).
> ────────────────────────────────────────

**Target:** MVP in 4–6 weeks. **Browser-only, localhost-only — no deployment is authorized.**
**Focus:** a locally complete Europe release, then one unified world composition platform

## Overview

CountriesIRL is a browser-only choropleth map generator for Instagram creators. Phase 1
shipped the Europe foundation — selection, coloring, bounded undo/redo, local persistence,
and exact 1080×1080 PNG export. Phase 2 transforms that fixed-Europe editor into a single
horizontally wrapping full-world composition canvas with pan/zoom, Locate across 195 core
states, a catalog-driven period selector, an export-safe in-canvas legend, and complete
composition save/load. Phase 3 is polish and launch.

**Historical borders are deferred out of v1.0.** The engine — validation, scene
composition, modern fallback, approval-aware promotion — ships and is tested. The
rights-cleared archival geometry does not exist and is a data-acquisition problem, not an
engineering one. See
[`phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md).

## Milestones

- **v1.0 — MVP** — Phases 1–3 (opened 2026-07-21). Per-phase status and counts live in the
  **Progress table below** (canonical — don't duplicate counts here).

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
## Phase 3: Polish & Launch (1–1.5 weeks)

**Goal:** Production-ready MVP, documentation, user testing.

### Deliverables

- UI refinement & visual polish
- Responsive design for tablets
- Tooltips & onboarding flow
- User guide / FAQ
- Keyboard shortcuts
- Accessibility audit (WCAG AA)
- Performance optimization
- Comprehensive error handling
- Deploy to public URL (GitHub Pages, Vercel, Netlify) — **requires a new explicit owner authorization; none exists**
- Sharing link for team (write-up for creators)

### Testing

- Deferred compatibility certification for Firefox, Safari, and previous browser versions when those environments become available. **No phase has claimed these passed, and none may.**
- Load testing (100+ map loads, rapid color changes)
- Historical border accuracy spot-check — **only if the deferred snapshots have shipped by then; they have not**
- Export quality verification
- Offline functionality test

### Out of Scope (Phase 3)

- Non-European regions beyond the unified world canvas delivered in Phase 2
- Advanced analytics/tracking
- User authentication

---

## Phase 4 (Post-MVP, Future)

**Goal:** Expand tool capabilities and user base.

### Potential Features

- Non-European historical borders (Asia, Africa, Americas)
- Real-time collaboration (multiple users on same map)
- Advanced styling (patterns, hatching, labels)
- Animated transitions between time periods
- Mobile app version
- AI color palette suggestions
- Batch export (multiple maps at once)
- Community border repository (users submit custom historical borders)
- Discord/API integration for team sharing

---

## Success Metrics (MVP)

- [ ] Tool used by 3+ creators in the group
- [ ] Average map creation time: <5 minutes
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
| Browser storage quota/corruption | Low | Preserve max-10 typed partial recovery, bounded nested validation, V1 in-memory migration, and explicit creator feedback |
| Users don't adopt tool | Medium | Gather feedback from 2–3 creators during Phase 2/3 and iterate within the locked product boundary |

---

## Dependencies

- **GeoJSON libraries:** D3 geo APIs and `@types/geojson`
- **UI framework:** React 18
- **Export library:** html2canvas
- **Build-time data:** exact-pinned mapshaper
- **Browser validation:** exact-pinned Playwright Test using installed Chrome and Edge channels
- **Data sources:** Natural Earth 5.1.1 plus source/license/reviewer-approved historical evidence

---

## Timeline (Estimated)

```
Week 1–2:   Phase 1 (Foundation) — complete
Week 2–3.5: Phase 2 engineering platform and integration
Additional: Historical asset curation/review as evidence availability requires
Week 3.5–5: Phase 3 polish/launch after Phase 2 acceptance
```

The original 1.5–2 week Phase 2 estimate applies to the engineering platform only. It is not a truthful fixed estimate for four source-complete, licensed, factually reviewed historical snapshots across six regions.

---

## Next Steps

1. **Hand `02-28` to the owner.** The matrix is prepared and bound to `fe5f946`; the automatable
   cells are pre-filled with cited evidence. Every physical cell is `PENDING` and must stay that
   way until a human performs the check.
2. **Close `02-25` honestly, or leave it open.** Both patches are applied, but the approval on
   file is blanket and sight-unseen. Do not retro-describe it as hash-bound.
3. **Decide the NFR3 warm-switch timing threshold** — set one from the advisory samples already
   recorded in `tests/e2e/history.spec.ts`, or explicitly extend D-63 into Phase 2. D-63 retired
   timing gates for **Phase 1 only** and does not carry forward on its own.
4. **Do not dispatch any historical plan.** The material does not exist; approval cannot create it.
5. **Deployment stays closed.** If hosting is ever wanted, it needs a new explicit authorization.

## Progress

**Canonical per-phase status. Counts here are the source of truth — no other file restates them.**

| Phase | Name | Status | Plans | Detail |
|---|---|---|---|---|
| 1 | Foundation & Modern Map | ✅ **CLOSED** 2026-07-22 | 22/22 | 73/73 active must-haves verified; 7 deployment-only must-haves deferred (01-16, 01-17); 18/18 requirements satisfied. Chrome 150 + Edge 150 accepted, localhost-only. → [archive](milestones/v1.0/ROADMAP-ARCHIVE.md#phase-1-foundation--modern-map-115-weeks) · [phase dir](milestones/v1.0/phases/01-foundation-modern-map-1-1-5-weeks/) |
| 2 | Region Variants & Advanced Features | 🔄 **EXECUTING** — engineering complete, 2 owner gates open | 26/36 | World canvas, camera, Locate, legend, composition persistence, export transaction. Historical snapshots **deferred** → [`02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md) |
| 3 | Polish & Launch | ⏳ **PENDING** | 0/0 | Not yet planned. Deployment remains optional and requires explicit authorization. |

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
