# CountriesIRL Map Generator — Roadmap

**Target:** MVP in 4–6 weeks  
**Focus:** Locally completed Europe-first release, then a unified world composition platform with reviewed historical borders

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

## Phase 2: Region Variants & Advanced Features (1.5–2 weeks engineering estimate; historical evidence may extend this)

**Goal:** Transform the fixed-Europe editor into one browser-only, horizontally wrapping full-world composition canvas where creators can pan, zoom, Locate any of 195 core states, choose four source/license/factual-evidence-approved historical snapshots with explicit modern fallback, interact with approved historical entities while active, edit and position an export-safe in-canvas legend, save/load the exact live composition, and export the exact visible 1080×1080 viewport while preserving Phase 1 color history, recovery, accessibility, responsive ownership, and local-only behavior.

**Requirements:** [F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F2.1, F2.2, F2.3, F2.4, F2.5, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F5.1, F5.2, F5.3, F5.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR1, NFR2, NFR3, NFR4, NFR5, NFR6, NFR7, NFR8, NFR9, NFR10, NFR11]

**Status:** In progress — Waves 1-2 complete and Wave 3 ready to dispatch. Full Phase 2 scope remains retained. Historical snapshots are delivery-blocked until exact source/license readiness, qualified factual review, durable hash-bound approval, and atomic promotion all pass; blocked snapshots are never counted delivered.

**Plans:** 6/36 plans executed

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
- [ ] 02-05-PLAN.md — Move the runtime data boundary from fixed Europe to the validated world asset and reviewed manifest
- [ ] 02-11-PLAN.md — Build the editable export-safe legend and prove browser-only interactions in the owning plan
- [ ] 02-12-PLAN.md — Build the historical engine and honest evidence gates before any source acquisition or promotion

**Wave 4**
- [ ] 02-07-PLAN.md — Wire the pure camera model into a stable wrapped world canvas and complete the live-camera lease boundary
- [ ] 02-19-PLAN.md — Upgrade the sole localStorage authority with pre-parse resource bounds and full modern/historical composition persistence
- [ ] 02-31-PLAN.md — Assemble complete offline source/license/tracing readiness bundles for 1492 and 1700 before geometry curation
- [ ] 02-32-PLAN.md — Assemble complete offline source/license/tracing readiness bundles for 1815 and 1914

**Wave 5**
- [ ] 02-08-PLAN.md — Provide the exact accessible camera-control alternatives and prove their browser behavior
- [ ] 02-09-PLAN.md — Upgrade the modern country browser and add a separate accessible Locate workflow without conflating the historical effective scene
- [ ] 02-29-PLAN.md — Extract complete load and live-camera save transactions from App into focused tested hooks
- [ ] 02-33-PLAN.md — Obtain non-executor source/license review and seal one durable machine-validated source-approval JSON per snapshot

**Wave 6**
- [ ] 02-13-PLAN.md — Generate and preflight the exact 1492 candidate from the approved source bundle
- [ ] 02-14-PLAN.md — Generate and preflight the exact 1700 candidate from approved evidence
- [ ] 02-15-PLAN.md — Generate and preflight the exact 1815 candidate from approved evidence
- [ ] 02-16-PLAN.md — Generate and preflight the exact 1914 candidate from approved evidence

**Wave 7**
- [ ] 02-34-PLAN.md — Obtain qualified factual approval for the exact four candidate bundles after curation

**Wave 8**
- [ ] 02-35-PLAN.md — Seal the qualified structured factual review into durable per-snapshot approval artifacts

**Wave 9**
- [ ] 02-17-PLAN.md — Promote only exact source-approved, factually approved, unchanged historical bytes into production

**Wave 10**
- [ ] 02-18-PLAN.md — Integrate world/history states plus the sole handle and React legend slot inside the one canonical SVG

**Wave 11**
- [ ] 02-20-PLAN.md — Upgrade Save/Load to complete compositions using focused live-camera save and atomic load transactions
- [ ] 02-21-PLAN.md — Extend the export chokepoint for exact wrapped-world/legend content without embedding camera orchestration in the utility

**Wave 12**
- [ ] 02-22-PLAN.md — Update the small global UI surfaces to the exact Phase 2 workflow, copy, disabled/busy states, and safe status messages
- [ ] 02-30-PLAN.md — Extract the exact live-camera export transaction into a focused tested hook

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

1. **Execute Phase 2** → Run `/gsd:execute-phase 2`; Waves 1–4 establish validation, contracts, world/camera/legend/history foundations and parallel historical curation.
2. **Honor Evidence Gates** → Historical promotion and final acceptance remain blocked until exact source/factual/physical-touch/browser evidence is available and approved.
3. **Optional Future Deployment** → Only if explicitly requested later, reopen deployment under new explicit authorization; Phase 2 performs no Vercel/public URL work.
