# CountriesIRL Map Generator — Roadmap

**Target:** MVP in 4–6 weeks  
**Focus:** European maps with historical borders

---

## Phase 1: Foundation & Modern Map (1–1.5 weeks)

**Goal:** A production-ready browser-only editor where non-technical creators can select and color one or many modern European countries, use 50-action undo/redo and local persistence, recover from loading/storage/export errors, work across desktop/tablet/secondary-mobile layouts, and download an exact 1080×1080 PNG from a shareable Vercel URL.

**Requirements:** [F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F5.1, F5.3, F6.1, F6.2, NFR1, NFR2, NFR4, NFR5, NFR6, NFR7, NFR10, NFR11]

**Plans:** 1/17 plans executed

Plans:

**Wave 1**
- [x] 01-01-PLAN.md — Verify Vitest and Vercel CLI package identities before execution

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 01-02-PLAN.md — Create the bounded React 18/Vite configuration/TypeScript/ESLint/Vitest toolchain

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 01-03-PLAN.md — Define shared contracts, constants, and tested color normalization

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 01-04-PLAN.md — Implement centralized reducer/context with bounded 50-action history and timing marks
- [ ] 01-05-PLAN.md — Prepare deterministic normalized Natural Earth data and abortable loading
- [ ] 01-09-PLAN.md — Implement validated max-10 map persistence plus onboarding dismissal storage
- [ ] 01-11-PLAN.md — Implement deterministic exact 1080×1080 PNG export

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 01-06-PLAN.md — Build stable accessible D3/SVG map, data states, and visible timing measures
- [ ] 01-07-PLAN.md — Build single/bulk selection and preset/custom color controls
- [ ] 01-08-PLAN.md — Build history/file controls, controlled onboarding/help, and live feedback
- [ ] 01-10-PLAN.md — Build accessible save/replace/load/delete modal

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 01-12-PLAN.md — Create root index.html and wire one matchMedia-composed responsive workspace with persisted help

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 01-13-PLAN.md — Wire styles after composition and apply responsive/theme/accessibility CSS

**Wave 8** *(blocked on Wave 7 completion)*
- [ ] 01-14-PLAN.md — Run the immutable verification-only lint/test/determinism/build gate

**Wave 9** *(blocked on Wave 8 completion)*
- [ ] 01-15-PLAN.md — Blocking measured UAT, mandatory storage failures, eight-browser matrix, offline boundary, and data POV acceptance

**Wave 10** *(blocked on Wave 9 completion)*
- [ ] 01-16-PLAN.md — Authorize, non-interactively link, deploy exactly once, and inspect Vercel read-only

**Wave 11** *(blocked on Wave 10 completion)*
- [ ] 01-17-PLAN.md — Block on production title/Vite/data/browser/network verification, then publish README

Cross-cutting constraints:
- All country state, D3 joins, persistence, and selection use normalized stable country IDs; display names are labels only.
- Every exported PNG is exactly 1080×1080, opaque white, map-only, and independent of device pixel ratio or dark theme.
- Selection, focus, errors, and operation results remain keyboard/screen-reader accessible and never rely on color alone.
- Existing coding rules remain authoritative and receive only targeted corrections when implementation proves a durable rule change.
- Production acceptance requires the verification-only full gate, measured browser thresholds, mandatory storage failures, the eight-cell compatibility matrix, Natural Earth presentation approval, and Vercel production verification.
- Offline capability means bundled same-origin assets, no runtime third-party requests, and continued operation after load; fresh disconnected reload is not required and no service worker is included.
- Responsive DOM/focus order comes from one active matchMedia-selected React workspace, never CSS reordering or duplicate hidden trees.

### Deliverables

- React 18 + strict TypeScript + Vite application shell
- Reproducible Natural Earth 1:10m Europe-focused GeoJSON asset and validation boundary
- Interactive accessible D3 SVG map with modern European borders
- Single and multi-country selection with named presets and validated custom colors
- Immutable undo/redo for the last 50 color-changing actions plus undoable reset
- Browser local save/overwrite/load/delete for up to 10 maps
- Exact white-background 1080×1080 PNG export using html2canvas
- Persisted first-use onboarding dismissal, reopenable help, and complete loading/warning/error/success states
- One-active-workspace desktop/tablet/secondary-mobile layouts including 360px support and dark UI chrome
- Unit tests for reducer/history and color, GeoJSON, storage, and export utilities
- Measured <500ms map and <100ms color/undo/redo browser checks, current/previous browser matrix, and production Vercel URL

### Key Decisions

- [x] React 18 + TypeScript + Vite
- [x] D3.js v7+ with interactive SVG and Mercator projection
- [x] React Context plus useReducer for map state
- [x] html2canvas with deterministic 540×540 scale-2 export frame
- [x] localStorage with no backend, authentication, or mandatory login
- [x] Plain component-scoped CSS plus theme custom properties
- [x] Offline boundary: bundled same-origin/no runtime third-party requests; no fresh disconnected reload or service worker
- [x] Natural Earth 5.1.1 default POV with blocking presentation acceptance
- [x] Human Vercel authorization before automated deployment

### Out of Scope (Phase 1)

- Historical borders and time-period controls
- Flexible centering/reprojection and regional zoom presets
- Legend generation or legend styling
- SVG export, batch/timelapse export, ZIP workflows
- Cloud sync, authentication, sharing URLs, analytics, or server infrastructure
- Non-European maps, native mobile app, hatching/patterns, or advanced palette hotkeys

---

## Phase 2: Advanced Features (1.5–2 weeks)

**Goal:** Historical borders, flexible map centering, legend generation, zoom levels.

### Deliverables

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

- Manual testing across browsers (Chrome, Firefox, Safari, Edge)
- Load testing (100+ map loads, rapid color changes)
- Historical border accuracy spot-check
- Export quality verification
- Offline functionality test

### Out of Scope (Phase 3)

- Non-European regions
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
|------|--------|-----------|
| Historical border data sparse/inaccurate | Medium | Start with best-documented regions (Poland, Balkans); use academic sources; label uncertain periods |
| Map rendering performance slow | High | Test with 50+ regions; use stable SVG joins and cache projection/path geometry |
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

1. **Phase 1 Execution** → Run `/gsd:execute-phase 1`
2. **Phase 1 Verification** → Run `/gsd:verify-work 1` after all summaries exist
3. **Phase 2 Discussion** → Confirm historical data and centering decisions after Phase 1 closes
