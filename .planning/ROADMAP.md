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

**Goal:** Transform the fixed-Europe editor into one browser-only, horizontally wrapping full-world composition canvas where creators can pan, zoom, Locate any of 195 core states, choose four evidence-approved historical snapshots with explicit modern fallback, edit and position an export-safe in-canvas legend, save/load complete compositions, and export the exact visible 1080×1080 viewport while preserving Phase 1 coloring, bounded color history, recovery, accessibility, responsive ownership, and local-only behavior.

**Requirements:** [F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F2.1, F2.2, F2.3, F2.4, F2.5, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F5.1, F5.2, F5.3, F5.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR1, NFR2, NFR3, NFR4, NFR5, NFR6, NFR7, NFR8, NFR9, NFR10, NFR11]

**Status:** Planned — execution not started. The separate Europe/World/North America selector wording is superseded by Phase 2 decision D-01: one wrapped world camera can frame every regional or global composition.

**Plans:** 28 plans across 14 waves

Plans:

**Wave 1**
- [ ] 02-01-PLAN.md — Establish exact-pinned build/browser validation and preserve the Phase 1 baseline
- [ ] 02-02-PLAN.md — Define shared camera, scene, snapshot, legend, persistence, and export contracts

**Wave 2**
- [ ] 02-03-PLAN.md — Add the separate complete-composition state provider
- [ ] 02-04-PLAN.md — Generate the reviewed deterministic 195-state/248-unit modern world asset
- [ ] 02-06-PLAN.md — Implement and test wrapped-world camera/projection mathematics
- [ ] 02-10-PLAN.md — Implement deterministic scene composition and legend algorithms

**Wave 3**
- [ ] 02-05-PLAN.md — Validate and load the bundled world manifest/asset at runtime
- [ ] 02-11-PLAN.md — Build the accessible export-safe SVG legend editor and overlay
- [ ] 02-12-PLAN.md — Build the provenance-gated historical engine, validator, and cached loader

**Wave 4**
- [ ] 02-07-PLAN.md — Wire D3 zoom, transform-only wrapped worlds, and one logical accessible country copy
- [ ] 02-13-PLAN.md — Curate and factually approve the 1492 snapshot for all six regions
- [ ] 02-14-PLAN.md — Curate and factually approve the 1700 snapshot for all six regions
- [ ] 02-15-PLAN.md — Curate and factually approve the 1815 snapshot for all six regions
- [ ] 02-16-PLAN.md — Curate and factually approve the 1914 snapshot for all six regions

**Wave 5**
- [ ] 02-08-PLAN.md — Add accessible Zoom/Pan/Reset View controls
- [ ] 02-09-PLAN.md — Add world country search, Select Visible, and separate Locate workflow
- [ ] 02-17-PLAN.md — Promote only the four approved historical assets into the production catalog

**Wave 6**
- [ ] 02-18-PLAN.md — Integrate period selection, fallback status, complete-state crossfade, and period-aware tooltips
- [ ] 02-19-PLAN.md — Upgrade localStorage to validated V2 complete compositions with V1 migration

**Wave 7**
- [ ] 02-20-PLAN.md — Upgrade Save/Load to complete compositions, migration copy, and confirmations
- [ ] 02-21-PLAN.md — Extend exact PNG export to current camera, history scene, legend, and safe filenames

**Wave 8**
- [ ] 02-22-PLAN.md — Update exact global actions, header, onboarding, and safe status copy

**Wave 9**
- [ ] 02-23-PLAN.md — Compose the complete one-DOM responsive world editor and atomic load/export flows

**Wave 10**
- [ ] 02-24-PLAN.md — Apply the binding map-first liquid-glass UI, responsive, and accessibility contract

**Wave 11**
- [ ] 02-25-PLAN.md — Obtain exact human review for durable coding-rule corrections

**Wave 12**
- [ ] 02-26-PLAN.md — Apply approved frontend/data/export/storage coding-rule updates

**Wave 13**
- [ ] 02-27-PLAN.md — Complete Chrome/Edge E2E coverage and the full source/data/build/browser gate

**Wave 14**
- [ ] 02-28-PLAN.md — Complete physical-touch, visual, screen-reader, historical, and exact-export acceptance

Cross-cutting constraints:
- One fixed square Mercator world scene uses transform-only camera movement and continuous horizontal wrapping; no separate Europe/World/North America modes or selector may be added.
- The primary interactive set is exactly 195 core states. Dependencies/territories remain visible and use reviewed parent inheritance or neutral policy; disputed/indeterminate units do not gain an unreviewed claim perspective.
- Camera movement is semantic composition state but never part of color Undo/Redo. Reset View affects only the camera; Locate never selects or colors.
- Historical selector entries are curated snapshots, not a continuous year slider. Only source/license/factual-review-approved assets are production-visible; worldwide modern fallback and boundary context are explicit.
- Historical data work is separately evidence-gated because the 1.5–2 week engineering estimate cannot truthfully guarantee four accurate six-region snapshots without source and reviewer proof.
- The legend is an export-safe SVG layer outside the camera transform. It includes every active non-white effective color or blocks export; no blur/filter/foreignObject or silent omission is allowed.
- Complete saves retain colors, semantic camera, period, legend metadata/style/position, and visible settings under the existing max-10 local-only policy. Phase 1 records migrate in memory and rewrite only on explicit save.
- Export freezes the last painted camera frame and selected scene synchronously, preserves the legend and date-line composition, strips every editor indicator, and retains exact opaque 1080×1080/DPR-independent/connected-anchor cleanup guarantees.
- The approved UI-SPEC is binding: one active responsive DOM, exact copy/tokens/breakpoints, restrained glass only on approved editor chrome, opaque export scene, reduced-motion/transparency/contrast/forced-color fallbacks, and 360px/200% containment.
- The phase remains browser-only and localhost-only. Deployment, authentication, cloud sync, sharing URLs, backend/API/server work, environment secrets, animation timelines, video/batch export, geometry morphing, textures, overlays, political POV switching, and artificial island markers remain outside scope.

### Deliverables

- Exact-pinned mapshaper and installed-browser Playwright validation boundary
- Strict shared composition contracts and separate composition provider
- Reproducible Natural Earth 5.1.1 hybrid world asset with exact 195 core states, 248 visible units, and reviewed parent/neutral policy
- Transform-only wrapped world camera with pointer/trackpad/pinch input, semantic controls, Reset View, and Locate
- One logical accessible path per entity plus decorative wrapped copies
- Deterministic effective scene and legend models
- Export-safe editable SVG legend with label/order/theme/size/opacity/border/corner/custom controls and overflow blocking
- Provenance-gated historical engine plus approved 1492, 1700, 1815, and 1914 overlays for Poland-Lithuania, Hungary, Balkans, Iberia, and Scandinavia
- Persistent historical coverage/fallback status, period-aware tooltips, and accessible complete-state crossfade
- Versioned V2 complete-composition local persistence with safe Phase 1 migration
- Exact current-viewport PNG export including legend and historical/fallback state
- Binding map-first responsive UI implementation and targeted durable coding-rule updates
- Full source/data/history/build/Chrome/Edge automation plus explicit physical-touch, visual, screen-reader, historical, and exact-export human acceptance

### Key Decisions

- [x] One horizontally wrapping full-world canvas supersedes separate regional modes
- [x] New compositions open at centered whole-world fit
- [x] Fixed square Mercator plus transform-only D3 zoom satisfies wrapping and pole clamping
- [x] Exactly 195 core states are selectable; reviewed dependencies inherit parent colors where clear
- [x] Natural Earth's default POV remains authoritative; no claim switcher
- [x] Camera state is separate from color history and persists semantically
- [x] Historical time uses reviewed snapshots with explicit modern fallback
- [x] Legend is an SVG composition layer outside the camera transform
- [x] Saved maps become versioned complete local compositions
- [x] Runtime remains localhost/browser-only with no backend or deployment
- [x] Historical release claims require deterministic provenance plus blocking factual approval

### Out of Scope (Phase 2)

- Separate Europe/World/North America modes or a region selector
- Animation timelines, camera keyframes, animated borders/fills/glows, geometry morphing, slideshows, frame sequences, MP4/video, batch/timelapse export, ZIP workflows
- Pattern/texture fills, advanced shadows/glows, external images/flags/logos/arrows, full freeform design controls
- User-selectable political claim perspectives, artificial small-island markers, inset maps
- SVG export, cloud sync, authentication, sharing URLs, analytics, public deployment, production-origin verification, backend/API/server infrastructure, and environment secrets

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
