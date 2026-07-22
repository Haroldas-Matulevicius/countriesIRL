# CountriesIRL Map Generator — Roadmap

**Target:** MVP in 4–6 weeks  
**Focus:** Europe-first release, then World and North America canvas variants, followed by historical borders

---

## Phase 1: Foundation & Modern Map (1–1.5 weeks)

**Goal:** A production-ready browser-only editor where non-technical creators can select and color one or many modern European countries, use 50-action undo/redo and local persistence, recover from loading/storage/export errors, work across desktop/tablet/secondary-mobile layouts, and download an exact 1080×1080 PNG from a shareable Vercel URL.

**Requirements:** [F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F5.1, F5.3, F6.1, F6.2, NFR1, NFR2, NFR4, NFR5, NFR6, NFR7, NFR10, NFR11]

**Plans:** 20/22 plans executed

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
- [x] 01-15-PLAN.md — Reconcile accepted final code/UI/test/build/browser evidence and close local release acceptance with concise current-HEAD functional smoke in Chrome 150 and Edge 150; timing observations are non-blocking per D-63

**Wave 14** *(blocked on Plan 01-15 functional approval)*
- [ ] 01-16-PLAN.md — Authorize, non-interactively link, deploy exactly once, and inspect Vercel read-only

**Wave 15** *(blocked on Wave 14 completion)*
- [ ] 01-17-PLAN.md — Block on production title/Vite/data/browser/network verification, then publish README

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
- Final accepted evidence inventory: code review PASS, UI audit 24/24, 145 source tests, deterministic GeoJSON/build, exact 57-path integrity, Plan 01-21 browser/PNG evidence, functional persistence/history/storage/accessibility/offline coverage, and current-HEAD Chrome 150/Edge 150 smoke
- Immutable failed timing evidence retained as a non-blocking diagnostic record, followed by a production Vercel URL after Plans 01-16 and 01-17

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
- [x] Human Vercel authorization before automated deployment
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

## Phase 2: Region Variants & Advanced Features (1.5–2 weeks)

**Goal:** Immediately add World and North America canvas variants after the Europe-first release, then continue with historical borders, flexible map centering, legend generation, and zoom levels.

**Highest-priority requirements:** F7.1, F7.2, F7.3

### Deliverables

- World canvas variant using the established coloring, history, persistence, accessibility, and exact-PNG workflows
- North America canvas variant using the established coloring, history, persistence, accessibility, and exact-PNG workflows
- Europe/World/North America canvas selection without changing the approved Phase 1 Europe presentation
- Historical border datasets (GeoJSON for 1400s, 1700s, 1800s, 1900s, modern)
- Time period selector UI
- Map re-render on period change
- Flexible map centering (select any country → re-project map)
- Regional zoom levels (EU, EU+Middle East, Europe+Russia)
- Auto-legend generation
- Legend position & styling UI
- Undo/redo for color changes

### Key Decisions

- [ ] Historical data sources (Natural Earth, Wikidata, custom tracing?)
- [ ] Projection for centering (Azimuthal Equidistant recommended)
- [ ] Legend positioning algorithm (avoid overlap with country data)

### Data Collection

- Curate/create historical borders for:
  - Poland (1400–present)
  - Lithuania (1200–present, if available)
  - Hungary (1300–present)
  - Balkans: Serbia, Croatia, Bosnia (1400–present)
  - Iberia: Spain, Portugal (1400–present)
  - Scandinavia: Sweden, Norway, Denmark (1400–present)
- Validate against historical atlases

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

- Non-European regions beyond the approved World and North America canvas variants
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
| Historical border data sparse/inaccurate | Medium | Start with best-documented regions (Poland, Balkans); use academic sources; label uncertain periods |
| Map rendering performance varies by browser/machine | Medium | Preserve immutable diagnostic samples and performance marks for later optimization; do not block Phase 1 when functional Chrome/Edge cells, 57-path integrity, no-crash/error behavior, and exact export correctness pass per D-63 |
| Centering projection distorts far regions | Medium | Use Azimuthal Equidistant; document limitations; offer "full world view" option |
| Browser storage quota exceeded | Low | Limit saved maps to 10 and surface typed quota/unavailable errors |
| Users don't adopt tool | Medium | Gather feedback from 2–3 creators during Phase 2; iterate UI based on feedback |

---

## Dependencies

- **GeoJSON libraries:** D3 geo APIs and `@types/geojson`
- **UI framework:** React 18
- **Export library:** html2canvas
- **Data sources:** Natural Earth (free/public domain), Wikidata and historical sources in later phases

---

## Timeline (Estimated)

```
Week 1–2:   Phase 1 (Foundation)
Week 2–3.5: Phase 2 (Advanced Features)
Week 3.5–5: Phase 3 (Polish & Launch)
Week 5+:    Phase 4 (Iterations & Feedback)
```

**Target launch:** End of week 5 (2026-08-25)

---

## Next Steps

1. **Phase 1 Deployment Authorization** → Execute Plan 01-16 only after its separate explicit human authorization; link and deploy exactly once without reopening the approved functional UAT
2. **Phase 1 Production Verification** → Execute Plan 01-17 after deployment to verify production title, Vite assets, GeoJSON, browser behavior, network state, and README publication
3. **Phase 1 Verification** → Run `/gsd:verify-work 1` after all Phase 1 summaries exist
4. **Phase 2 Region Variants** → Plan F7.1–F7.3 first, then historical data, centering, and legends
