# CountriesIRL Map Generator — Requirements

**Scope:** MVP (European focus)  
**Last updated:** 2026-07-21

---

## Functional Requirements

### F1: Interactive Map Interface

- [x] **F1.1** Display interactive map of Europe with individual country/region boundaries
- [x] **F1.2** Click/tap any country to select it for coloring
- [x] **F1.3** Color picker (palette or custom hex) to assign color to selected country
- [x] **F1.4** Bulk color assignment: apply same color to multiple countries at once
- [x] **F1.5** Undo/redo for color changes
- [x] **F1.6** Reset all colors to default (white/uncolored)

### F2: Historical Borders

- **F2.1** Dropdown/selector to choose time period (1200s, 1400s, 1500s, 1700s, 1800s, 1900s, modern)
- **F2.2** Map redraw when period changes to show historical boundaries
- **F2.3** Support historical periods for: Poland, Lithuania, Hungary, Balkans (Serbia/Croatia/Bosnia/etc), Iberia (Spain/Portugal), Scandinavia
- **F2.4** Gracefully handle regions without data for selected period (show as "no data" or hide)
- **F2.5** Tooltip/label showing country name and period context

### F3: Map Centering & Regional Views

- **F3.1** Dropdown to select center country (any European country in dataset)
- **F3.2** Map reorients/re-projects to put center country in middle
- **F3.3** Three predefined regional zoom levels:
  - **EU-only**: France to Poland, Mediterranean to North Sea
  - **EU + Middle East**: Extends east to Caucasus, south to Egypt
  - **Europe + Russia**: Full view including European Russia to Urals
- **F3.4** Smooth transition between zoom levels
- **F3.5** Centered country remains readable at all zoom levels

### F4: Legend Generation

- **F4.1** Auto-detect all unique colors used on map
- **F4.2** Generate legend box with color swatches + labels
- **F4.3** User can edit legend labels (e.g., "Red = Hell Yeah", "Green = Hell Nah")
- **F4.4** Legend positions: top-left, top-right, bottom-left, bottom-right, custom
- **F4.5** Legend styling: background opacity, text size, border

### F5: Export & Output

- [x] **F5.1** Export map as PNG image (1080×1080 Instagram square format)
- **F5.2** PNG includes map + legend in single image
- [x] **F5.3** High quality output (300+ DPI or screen-optimized)
- **F5.4** Export also available as SVG (for further editing)
- **F5.5** Filename includes map name + date (e.g., "EU_HumanZoo_2026-07-21.png")

### F6: Project Management

- [x] **F6.1** Save map configuration locally (browser storage or file download)
- [x] **F6.2** Load previously saved map
- **F6.3** Share map URL (optional for V1, nice-to-have)

---

## Non-Functional Requirements

### Performance

- [x] **NFR1** Map renders in <1 second
- [x] **NFR2** Color changes apply instantly (no lag)
- **NFR3** Historical period switch completes in <500ms
- [x] **NFR4** Export to PNG completes in <5 seconds

### Usability

- [x] **NFR5** Tool usable by non-technical creators (intuitive UI, clear affordances)
- [x] **NFR6** On-screen tooltips/help for first-time users
- [x] **NFR7** Mobile-friendly or tablet-responsive (nice-to-have for V1)

### Data Quality

- **NFR8** Historical borders accurate to within ~5% (visual accuracy, not surveyed precision)
- **NFR9** All country names localized or clearly identified
- [x] **NFR10** Consistent color space (RGB, no palette limitations)

### Accessibility

- [x] **NFR11** WCAG AA compliant (alt text for map regions, keyboard navigation)
- **NFR12** Color-blind friendly: support patterns or labels as alternative to color alone (optional V1)

---

## Data Requirements

### Geospatial Data

- **Modern borders**: GeoJSON/TopoJSON for all European countries (Natural Earth, OSM)
- **Historical borders** (1200–1900): Focus on major territorial changes
  - **1400s**: Early modern kingdoms (Poland-Lithuania, Ottomans, Iberia)
  - **1700s**: Post-Westphalia Europe
  - **1800s**: Napoleonic era + aftermath
  - **1900s**: Post-WWI, Pre-WWII, Post-WWII
  - **Modern**: Current EU + non-EU countries

### Data Sources (TBD during research)

- Natural Earth historical data (1800–present available)
- Wikidata historical borders (incomplete but free)
- Academic historical atlases (may need manual tracing)
- Community-contributed GeoJSON (for niche periods/regions)

---

## Constraints & Dependencies

### Technical Constraints

- **Browser-based** preferred (no server infra initially)
- **No mandatory login** (use browser storage for saves)
- **Offline capability** (load map data locally once downloaded)

### Data Constraints

- Historical accuracy decreases before ~1400 (scope to 1400+)
- Some border changes happened mid-year (use representative annual snapshot)
- Exclaves/small territories may be too small to color easily (acceptable limitation)

### Timeline Constraints

- MVP target: 4–6 weeks
- Phase 1: Core coloring + modern borders
- Phase 2: Historical periods + centering
- Phase 3: Polish + deploy

---

## Acceptance Criteria (MVP)

- [ ] User can open tool, color 5+ countries in <2 minutes
- [ ] Legend auto-generates and looks polished
- [ ] Export PNG is Instagram-ready (correct size, quality, includes legend)
- [ ] 4+ time periods available for at least 5 major European regions
- [ ] Map can be centered on any European country
- [ ] Tool works offline after initial load
- [ ] User guide/tooltips help first-time users
- [ ] Zero crashes or broken color assignments after 1000+ interactions (test)

---

## Out of Scope (V2)

- Non-European regions (Asia, Africa, Americas)
- Real-time collaboration/sharing
- Advanced styling (hatching patterns, labels inside countries)
- Animated map transitions
- Mobile app (web responsive only)
- AI color palette suggestions
- Batch processing of multiple maps
