# Roadmap: CountriesIRL Map Generator

> **Status:** v1.0 — MVP — open 2026-07-21. Phase 2 executing.
> **Archives:** [`ARCHIVES.md`](ARCHIVES.md) — index of per-milestone archives + naming conventions.
> **v1.0 in-flight capsule:** [`milestones/v1.0/`](milestones/v1.0/) — `ROADMAP-ARCHIVE.md`, `phases/`.
> **Engine docs (version-agnostic):** [`CODING_RULES.md`](CODING_RULES.md), [`coding-rules/`](coding-rules/).
> ────────────────────────────────────────

**Target:** MVP in 4–6 weeks
**Focus:** Locally completed Europe-first release, then a unified world composition platform

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

**Status:** In progress. **Descoped 2026-07-25** — historical snapshots deferred; see
[`02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md).

The historical source-readiness infrastructure is integrated and both 1492/1700 packets
verify offline as truthfully **BLOCKED** (`deliveryCounted=false`, zero production
snapshots), joining the already-BLOCKED 1815/1914 packets from `02-32`. The blockers name
**missing archival material** — Semkowicz-Romer scans, the CNIG 15094 product archive,
manual-trace operator records and control points, Karlowitz frontier demarcation — not
missing approval, so no human sign-off can unblock them. `02-17` was rescoped to verify a
Modern-only catalog and passed: exactly one entry, recorded hash equals actual asset
SHA-256, zero historical assets or approvals present, both blocked packets still exit
nonzero.

Historical delivery still requires exact source/license readiness, independent source
approval, qualified factual review, durable hash binding, and atomic promotion. Blocked
snapshots are never counted delivered, and no historical readiness or human approval is
claimed.

**Plans:** 20/36 complete. 8 deferred with the historical chain, 6 engineering remaining, 2 owner gates. See the [Progress](#progress) ledger.

Plans:

**Wave 1**
- [x] 02-01-PLAN.md — Establish the exact-pinned Phase 2 build/browser validation boundary and artifact hygiene before feature work
- [x] 02-02-PLAN.md — Define the interface-first contracts, including the sole MapCanvasHandle, complete live-camera transaction, and historical-entity policy

**Wave 2**
- [x] 02-03-PLAN.md — Create the single React owner for durable Phase 2 composition state while leaving color history untouched
- [x] 02-04-PLAN.md — Generate the deterministic modern-world data platform that replaces the fixed Europe asset at runtime
- [x] 02-06-PLAN.md — Implement and prove the pure wrapped-world camera mathematics before any D3 gesture wiring
- [x] 02-10-PLAN.md — Implement the pure effective-scene and legend algorithms, including the locked historical interaction policy

**Wave 3**
- [x] 02-05-PLAN.md — Move the runtime data boundary from fixed Europe to the validated world asset and reviewed manifest
- [x] 02-11-PLAN.md — Build the editable export-safe legend and prove browser-only interactions in the owning plan
- [x] 02-12-PLAN.md — Build the historical engine and honest evidence gates before any source acquisition or promotion

**Wave 4** — `02-31` deferred
- [x] 02-07-PLAN.md — Wire the pure camera model into a stable wrapped world canvas and complete the live-camera lease boundary
- [x] 02-19-PLAN.md — Upgrade the sole localStorage authority with pre-parse resource bounds and full modern/historical composition persistence
- [~] 02-31-PLAN.md — **DEFERRED** (was BLOCKED): 1492/1700 source readiness. Infrastructure is integrated and both packets verify offline as truthfully BLOCKED. Missing archival material, not missing approval.
- [x] 02-32-PLAN.md — Complete as hash-bound BLOCKED source readiness for 1815 and 1914; no production snapshots delivered

**Wave 5** — `02-33` deferred
- [x] 02-08-PLAN.md — Provide the exact accessible camera-control alternatives and prove their browser behavior
- [x] 02-09-PLAN.md — Upgrade the modern country browser and add a separate accessible Locate workflow without conflating the historical effective scene
- [x] 02-29-PLAN.md — Extract complete load and live-camera save transactions from App into focused tested hooks
- [~] 02-33-PLAN.md — **DEFERRED**: no reviewable evidence exists, so the non-executor source/license review cannot run.

**Wave 6**
- [~] 02-13-PLAN.md — **DEFERRED** — Generate and preflight the exact 1492 candidate from the approved source bundle
- [~] 02-14-PLAN.md — **DEFERRED** — Generate and preflight the exact 1700 candidate from approved evidence
- [~] 02-15-PLAN.md — **DEFERRED** — Generate and preflight the exact 1815 candidate from approved evidence
- [~] 02-16-PLAN.md — **DEFERRED** — Generate and preflight the exact 1914 candidate from approved evidence

**Wave 7**
- [~] 02-34-PLAN.md — **DEFERRED** — Obtain qualified factual approval for the exact four candidate bundles after curation

**Wave 8**
- [~] 02-35-PLAN.md — **DEFERRED** — Seal the qualified structured factual review into durable per-snapshot approval artifacts

**Wave 9**
- [x] 02-17-PLAN.md — **RESCOPED + complete**: verifies the Modern-only catalog and proves non-promotion. Original promotion tasks preserved in the plan for the follow-on phase.

**Wave 10**
- [x] 02-18-PLAN.md — **RESCOPED + complete**: CompositionBar (sole Reset View owner), catalog-driven period select, exact world copy, crossfade, tooltip period context.

**Wave 11**
- [x] 02-20-PLAN.md — **complete**: complete-composition Save/Load (row metadata, legacy copy, two-step delete, dirty-load confirmation) plus the focused Chrome/Edge persistence slice `tests/e2e/persistence.spec.ts`
- [x] 02-21-PLAN.md — **complete**: export strips duplicate accessibility/editor semantics and the outgoing crossfade layer while preserving every visible wrapped date-line path; borders normalized across `path.scene-path`; `invalid-composition` refuses a mis-placed legend; named-filename sanitizer; Chrome/Edge slice `tests/e2e/export.spec.ts` downloads and decodes the real 1080×1080 PNG

**Wave 12**
- [ ] 02-22-PLAN.md — Update the small global UI surfaces to the exact Phase 2 workflow, copy, disabled/busy states, and safe status messages
- [x] 02-30-PLAN.md — **complete**: the export transaction lives in `useCompositionExportTransaction`, releasing the camera lease, activation lock, and busy lock from one outermost `finally` on every path (refusal, thrown preparation, thrown capture, thrown status callback); F5.5 wired end to end — the last committed save/load name reaches the PNG filename, proven by a real Chrome download

**Wave 13**
- [ ] 02-23-PLAN.md — Compose all Phase 2 subsystems while keeping App small and transaction ordering delegated

**Wave 14**
- [ ] 02-24-PLAN.md — Apply the binding UI-SPEC and prove both static CSS constraints and real responsive browser behavior

**Wave 15**
- [ ] 02-25-PLAN.md — Create and obtain exact human approval for two bounded documentation patches: subsystem rules and authoritative routing/requirements corrections

**Wave 16**
- [ ] 02-26-PLAN.md — Apply the exact approved five-file coding-rule patch and prove byte identity
- [ ] 02-36-PLAN.md — Apply the exact approved authoritative-document Patch B and prove byte identity

**Wave 17**
- [ ] 02-27-PLAN.md — Complete cross-domain E2E coverage, then prove the exact final implementation commit from a fresh detached clean worktree

**Wave 18**
- [ ] 02-28-PLAN.md — Complete human-only physical, visual, accessibility, historical, and exact-export acceptance against the exact verified SHA

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
- Deploy to public URL (GitHub Pages, Vercel, Netlify)
- Sharing link for team (write-up for creators)

### Testing

- Deferred compatibility certification for Firefox, Safari, and previous browser versions when those environments become available; Phase 1 does not claim these passed
- Load testing (100+ map loads, rapid color changes)
- Historical border accuracy spot-check
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

1. **Continue Plan 02-31 research** → Keep 1492/1700 source readiness isolated and blocked until exact rights-approved six-region packets exist; do not treat partial research as completion.
2. **Hold Plan 02-33** → Independent non-executor source/license approval cannot start until both 02-31 and 02-32 prerequisites are complete; 02-32 remains BLOCKED evidence rather than production readiness.
3. **Hold downstream execution** → No non-historical plan is dependency-ready because 02-18 requires the full historical promotion chain; resume engineering only when declared dependencies are satisfied.
4. **Honor Evidence Gates** → Historical promotion and final acceptance remain blocked until exact source/factual/physical-touch/browser evidence is available and approved.
5. **Optional Future Deployment** → Only if explicitly requested later, reopen deployment under new explicit authorization; Phase 2 performs no Vercel/public URL work.

## Progress

**Canonical per-phase status.** Counts here are the source of truth — don't duplicate them
elsewhere.

| Phase | Name | Status | Plans | Detail |
|---|---|---|---|---|
| 1 | Foundation & Modern Map | ✅ **CLOSED** 2026-07-22 | 22/22 | 73/73 active must-haves verified; 7 deployment-only must-haves deferred (01-16, 01-17); 18/18 requirements satisfied. Chrome 150 + Edge 150 accepted, localhost-only. → [archive](milestones/v1.0/ROADMAP-ARCHIVE.md#phase-1-foundation--modern-map-115-weeks) · [phase dir](milestones/v1.0/phases/01-foundation-modern-map-1-1-5-weeks/) |
| 2 | Region Variants & Advanced Features | 🔄 **EXECUTING** | see below | World canvas, camera, Locate, legend, composition persistence. Historical snapshots **deferred** → [`02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md) |
| 3 | Polish & Launch | ⏳ **PENDING** | 0/0 | Not yet planned. Deployment remains optional and requires explicit authorization. |

### Phase 2 plan ledger

**20 complete · 8 deferred · 6 engineering remaining · 2 owner gates.**

| Group | Plans | Status |
|---|---|---|
| Foundation + contracts | `02-01`–`02-06` | ✅ complete |
| Camera, browser, Locate, persistence | `02-07`, `02-08`, `02-09`, `02-19`, `02-29`, `02-20` | ✅ complete |
| Historical validation + snapshot loading | `02-10`, `02-11`, `02-12` | ✅ complete |
| Catalog verification | `02-17` | ✅ complete (rescoped — Modern-only hash-verified, zero promotion) |
| Period selector + world states | `02-18` | ✅ complete (rescoped — closed the missing Reset View and the stale Europe fatal copy) |
| Historical source readiness | `02-31`, `02-32` | ⏸ **DEFERRED** — hash-bound BLOCKED evidence, `deliveryCounted=false`, zero production snapshots |
| Historical approval + curation chain | `02-33`, `02-13`–`02-16`, `02-34`, `02-35` | ⏸ **DEFERRED** — no rights-cleared source material exists |
| Wrapped-composition export + export transaction | `02-21`, `02-30` | ✅ complete (F5.5 wired end to end) |
| Remaining engineering | `02-22`, `02-23`, `02-24`, `02-26`, `02-36` | ⬜ not started |
| Final exact-SHA gate | `02-27` | 🔶 partial — gate script written and validated; `final-integration.spec.ts` outstanding |
| Owner gates | `02-25` (docs), `02-28` (acceptance) | ⏳ pending owner |

> The six remaining engineering plans are smaller than they look. Their *behavior* already
> ships and is covered by 442 unit tests and 49 Chrome E2E cases; what remains is mostly
> refactoring into the plans' named file shapes (the `App` composition root, split
> per-domain E2E specs, a CSS contract test). See
> [`.continue-here.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/.continue-here.md)
> for the per-plan breakdown.

### Verified gates (current HEAD)

| Gate | Result |
|---|---|
| `npm test` | 35 files, **442 tests** (see the tracked `historicalPreparationCli` flake) |
| `npm run lint` | clean |
| `tsc -b` | clean |
| `npm run data:world:check` | 248 units, 195 selectable core states |
| `npm run build` | clean |
| Chrome E2E | **49/49** |
| Edge E2E | **48/48** (last run at `02-21`) |
| Historical promotion | **zero** — catalog Modern-only, hash-verified |

## Deferred out of v1.0

| Item | Reason | Disposition |
|---|---|---|
| Historical snapshots 1492/1700/1815/1914 | Rights-cleared archival source material does not exist. Blockers name missing scans, product archives, operator records, control points, and frontier demarcation — not missing approval. | Follow-on data-acquisition phase; existing approval chain runs unchanged against it |
| Vercel deployment + production verification | Owner accepted a localhost-only release; no deployment authorization exists | Optional future work, requires new explicit authorization |
| Firefox / Safari / previous-version certification | Owner scoped acceptance to installed Chrome 150 + Edge 150 | Explicitly unverified — must never be reported as passed |
