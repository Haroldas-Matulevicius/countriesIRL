# CountriesIRL Map Generator — Roadmap

**Target:** MVP in 4–6 weeks  
**Focus:** European maps with historical borders

---

## Phase 1: Foundation & Modern Map (1–1.5 weeks)

**Goal:** Working interactive map UI with modern European borders, basic coloring, export.

### Deliverables

- Web app skeleton (React or vanilla HTML/JS)
- GeoJSON loader for European country boundaries (Modern Earth)
- Interactive SVG/Canvas map of Europe
- Country selection & color picker UI
- Color state management (in-memory)
- Export to PNG (1080×1080)
- Browser local storage save/load
- Basic error handling

### Key Decisions

- [ ] Tech stack: React + D3.js vs. Mapbox + React vs. Vanilla JS + SVG
- [ ] Map projection: Mercator vs. Azimuthal Equidistant (for centering)
- [ ] Canvas vs. SVG for rendering

### Out of Scope (Phase 1)

- Historical borders
- Flexible centering
- Legend generation
- Mobile responsiveness

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
| Map rendering performance slow | High | Test with 50+ regions; use Canvas if SVG too slow; lazy-load GeoJSON |
| Centering projection distorts far regions | Medium | Use Azimuthal Equidistant; document limitations; offer "full world view" option |
| Browser storage quota exceeded | Low | Limit saved maps to 5–10; offer JSON export as fallback |
| Users don't adopt tool | Medium | Gather feedback from 2–3 creators during Phase 2; iterate UI based on feedback |

---

## Dependencies

- **GeoJSON libraries:** topojson-client, d3-geo
- **UI framework:** React (recommended) or vanilla JS
- **Export library:** html2canvas, canvas2image (for PNG export)
- **Data sources:** Natural Earth (free), Wikidata (free), potential paid sources for accuracy

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

1. **Phase 1 Planning** → Run `/gsd:plan-phase 1` to break Phase 1 into executable tasks
2. **Tech Stack Decision** → Finalize React vs. alternatives
3. **Data Sourcing** → Begin gathering historical borders
4. **Prototype UI** → Build interactive wireframe for team feedback
