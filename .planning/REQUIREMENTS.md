# CountriesIRL Map Generator — Requirements

> **Status:** v1.0 — MVP. Requirement *scope* lives here; requirement *progress* does not —
> [`ROADMAP.md`](ROADMAP.md) § Progress is canonical for what is done.
> **Pointers:** [`PROJECT.md`](PROJECT.md) (why) · [`ROADMAP.md`](ROADMAP.md) (when) ·
> [`STATE.md`](STATE.md) (now) · [`coding-rules/general.md`](coding-rules/general.md)
> (the invariants and safety constraints that bind how any of this may be satisfied).
> ────────────────────────────────────────

**Scope:** MVP (European focus — see the correction below)

Last updated: 2026-07-26 — non-destructive supersession annotations for F3 and F7 (D-01) and an open-decision note on NFR3. Prior: 2026-07-22. Full edit history: `git log -p -- .planning/REQUIREMENTS.md`.

> **F2.1–F2.5 (historical snapshots) are NOT complete and are not ticked.** They are deferred
> because the rights-cleared archival source material does not exist. The engine that would
> consume that material ships and is tested; the snapshots do not. See
> [`MILESTONES.md`](MILESTONES.md) § Deferred out of v1.0.

> **Scope correction (D-01, 2026-07-24).** "European focus" describes Phase 1. From Phase 2 the
> app is **one full-world canvas** with a free camera and no region modes; Europe is a framing,
> not a build target.
>
> **How to read this file.** Original requirement text is never rewritten or deleted. Where a
> decision changed the mechanism, an annotation is added beneath the preserved text naming the
> decision. Phase 1 Release Acceptance is immutable evidence and is not edited.

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

> **Partially satisfied — data deferred (2026-07-25).** The engine ships and is tested;
> the historical *geometry* does not. Rights-cleared archival source material for
> 1492/1700/1815/1914 does not exist, and obtaining it is archival research rather than
> engineering. Original requirement text is preserved verbatim below with per-item
> annotations. See
> [`phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md).
>
> **Not** marked complete. These carry forward to a data-acquisition phase, where the
> existing `02-33` → `02-13`–`02-16` → `02-34` → `02-35` → `02-17` chain runs unchanged.

- **F2.1** Dropdown/selector to choose time period (1200s, 1400s, 1500s, 1700s, 1800s, 1900s, modern)
  — *Mechanism complete:* the selector is catalog-driven and renders every approved entry.
  *Data deferred:* the catalog currently holds exactly `Modern`.
- **F2.2** Map redraw when period changes to show historical boundaries
  — *Complete.* Scene composition, accessible crossfade, selection reconciliation, and
  history continuity ship and are proven end-to-end by the historical Playwright fixture.
- **F2.3** Support historical periods for: Poland, Lithuania, Hungary, Balkans (Serbia/Croatia/Bosnia/etc), Iberia (Spain/Portugal), Scandinavia
  — *Deferred.* All six region IDs are modeled, validated, and kept distinct throughout
  the packet and approval chain, but no region has rights-approved geometry.
- **F2.4** Gracefully handle regions without data for selected period (show as "no data" or hide)
  — *Complete.* Modern-fallback and declared-fallback handling ship and are tested.
- **F2.5** Tooltip/label showing country name and period context
  — *Complete.* Tooltip renders period context from the active catalog entry.

### F3: Map Centering & Regional Views

> **Mechanism superseded by D-01 (2026-07-24), intent satisfied.** F3 was written assuming a
> re-projecting map with three fixed regional presets. D-01 chose **one full-world interactive
> canvas** with a free camera instead: the Mercator projection is built once and never rebuilt,
> and centering/framing/zoom are a transform on the camera layer. Original requirement text is
> preserved verbatim below with per-item annotations.
>
> Why the mechanism changed rather than the goal: re-projecting per centre country would change
> every path's `d` on each pan (breaking the id-keyed D3 join), make the exported geometry depend
> on camera state, and leave `isWholeWorldCamera` with no stable reference to compare against.
> Fixed presets would additionally have re-introduced the region modes D-01 removed.

- **F3.1** Dropdown to select center country (any European country in dataset)
  — *Satisfied by a different control.* Locate is a searchable country picker over the modern
  195-core catalog, not a dropdown, and it is not limited to Europe.
- **F3.2** Map reorients/re-projects to put center country in middle
  — *Satisfied without re-projection.* The camera pans/zooms to frame the country; the projection
  is fixed. "Re-projects" is superseded wording, not an unmet requirement.
- **F3.3** Three predefined regional zoom levels:
  - **EU-only**: France to Poland, Mediterranean to North Sea
  - **EU + Middle East**: Extends east to Caucasus, south to Egypt
  - **Europe + Russia**: Full view including European Russia to Urals
  — *Superseded by D-01 and deliberately not built.* A free camera reaches all three framings and
  every framing between them; three named presets would be a region-mode selector under another
  name. `Reset View` returns to the whole-world fit.
- **F3.4** Smooth transition between zoom levels
  — *Complete.* Camera motion is animated and honours `prefers-reduced-motion`.
- **F3.5** Centered country remains readable at all zoom levels
  — *Physical claim; owner-verified only.* This is a visual judgement, so it belongs to the
  acceptance matrix (`02-28`) and no automated result may be substituted for it.

### F4: Legend Generation

- **F4.1** Auto-detect all unique colors used on map
- **F4.2** Generate legend box with color swatches + labels
- **F4.3** User can edit legend labels (e.g., "Red = Hell Yeah", "Green = Hell Nah")
- **F4.4** Legend positions: top-left, top-right, bottom-left, bottom-right, custom
- **F4.5** Legend styling: background opacity, text size, border

### F5: Export & Output

- [x] **F5.1** Export map as PNG image (1080×1080 Instagram square format)
- [x] **F5.2** PNG includes map + legend in single image
- [x] **F5.3** High quality output (300+ DPI or screen-optimized)
- **F5.4** Export also available as SVG (for further editing)
- [x] **F5.5** Filename includes map name + date (e.g., "EU_HumanZoo_2026-07-21.png") — *complete (02-30): `App` holds the composition name, set only on a committed save or load, and passes it to the export transaction as an accessor. Proven by a real Chrome download: `CountriesIRL_<date>.png` unnamed, `Baltic_Tour_2026_<date>.png` after saving "Baltic  Tour /2026!".*

### F6: Project Management

- [x] **F6.1** Save map configuration locally (browser storage or file download)
- [x] **F6.2** Load previously saved map
- **F6.3** Share map URL (optional for V1, nice-to-have)

### F7: Region Canvas Variants (Highest Priority After Phase 1)

> **Mechanism superseded by D-01 (2026-07-24); the creator-facing outcome is delivered.** F7 asked
> for three *canvas variants* and a way to choose between them. D-01 replaced variants with **one
> full-world canvas** carrying the complete supported dataset, framed by a free camera. There is
> deliberately **no region selector and no Europe/World/North America mode**. Original requirement
> text is preserved verbatim below with per-item annotations.
>
> Read the intent as satisfied and the implementation as superseded: a creator can make a World
> map and a North America map, and every workflow F7 enumerates — select, colour, history,
> persistence, accessibility, exact 1080×1080 PNG — operates on that one canvas. Three variants
> would have meant three datasets, three camera baselines, and three export paths to keep in
> agreement, which is the drift hazard D-01 exists to avoid.

- **F7.1** Provide a World canvas variant that preserves the existing select, color, history, persistence, accessibility, and exact-PNG workflows for a world dataset/view.
  — *Delivered as the single canvas.* One bundled, hash-verified world asset with 195 selectable
  core states; all named workflows operate on it.
- **F7.2** Provide a North America canvas variant that preserves the existing select, color, history, persistence, accessibility, and exact-PNG workflows for a North America dataset/view.
  — *Delivered by framing, not by a variant.* North America is reached with the camera; there is
  no separate North America dataset or view.
- **F7.3** Let the creator choose Europe, World, or North America without changing the approved Europe-first Phase 1 release behavior.
  — *Superseded and deliberately not built.* No mode selector exists. Phase 1's approved
  Europe-first release behavior is untouched: `public/data/europe-modern.geojson` and the Phase 1
  acceptance evidence below remain exactly as certified.

---

## Non-Functional Requirements

### Performance

The following performance values remain useful diagnostic targets, but Phase 1 release PASS/FAIL is governed by functional correctness under locked decision D-63. Timing samples and harness timeouts do not block release and must not be rewritten as passing evidence.

- [x] **NFR1** Map render timing is instrumented against the original <1 second target; release acceptance requires functional readiness, stable 57-path integrity, no crash, and clean product behavior rather than a timing threshold.
- [x] **NFR2** Color changes are instrumented for perceived responsiveness; color/undo/redo timing values are advisory diagnostics and functional state/history correctness is blocking.
- **NFR3** Historical period switch completes in <500ms
  — *Open owner decision; no threshold is asserted today.* D-63 retired timing gates for **Phase 1
  only** and does not carry into Phase 2. `tests/e2e/history.spec.ts` records real warm
  period-switch samples and their median as advisory annotations. The owner must either set a
  threshold from those measured numbers or explicitly extend D-63 to Phase 2. Until then this is
  neither passing nor failing, and must not be recorded as either.
- [x] **NFR4** Export timing is recorded diagnostically; release acceptance requires successful exact 1080×1080 opaque centered map-only output, correct colors, and no crash rather than a duration threshold.

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

> **Superseded 2026-08-06 — original text above retained, not rewritten.** The three-phase timeline
> no longer describes the project. **Phase 2** shipped the world canvas and camera but its
> *historical periods* are **DEFERRED** for missing rights-cleared archival source material — the
> engine ships, the geometry does not, and no sign-off can unblock it (the approved catalog holds
> exactly `Modern`). **Phase 3** is **not** "Polish + deploy": it was replaced on 2026-08-06 by
> Phases 3–6 under milestone **v1.1** (Clean UI Overhaul → Visual & Cartographic System →
> Data-Driven Maps → Polish & Launch), and Phase 3 shipped at code level on 2026-08-06 as the Clean
> UI Overhaul. **`deploy` was never in scope and still is not** — there is no deployment target,
> backend, auth, or production URL, and hosting would require new explicit owner authorization.
> Canonical status and counts: [`ROADMAP.md`](ROADMAP.md) § Progress.

---

## Phase 1 Release Acceptance

- [x] Existing final evidence remains accepted: final code review PASS; final UI audit 24/24; Plan 01-22's clean exact-commit lint, 16 source files/145 tests, deterministic GeoJSON, strict TypeScript, build, and exact 57-path/safety result; Plan 01-21's approved Chrome 150/Edge 150 browser and exact-PNG evidence; and persistence/history/storage/accessibility/offline/no-crash coverage.
- [x] The user directly approved the final Chrome 150 and Edge 150 functional cells with exactly 57 unique non-empty labeled paths, working coloring/history/storage/accessibility/already-loaded-offline/export behavior, and no console, runtime, crash, or required-product-network errors.
- [x] Exact PNG acceptance is 1080×1080, opaque, centered, map-only, and byte-identical across Chrome and Edge with SHA-256 `682b99c8c37c6189bea1d0bae09199c31da2a8fad5010e620ff12f6de3bab399`.
- [x] No map-ready, color, undo, redo, export-duration, or other performance threshold is a Phase 1 release blocker per D-63; no CDP timing artifact is required. Existing performance samples and prior harness timeouts remain truthful non-blocking observations.
- [x] The immutable failed timing evidence committed at `c449e6e` remains unchanged; it is neither overwritten nor represented as passing.
- [x] Firefox, Safari, and previous-version certification is explicitly recorded as unverified/deferred by user choice, never as passed or implicitly certified.
- [x] The user approved the current Natural Earth 5.1.1 Europe presentation and documented transcontinental inclusion for this release.
- [x] Plans 01-16 and 01-17 are closed as deferred for localhost-only Phase 1 completion; optional future deployment does not block local release verification and no production URL is claimed.
- [x] World and North America canvas variants remain outside Phase 1 implementation and are preserved as the highest-priority next-phase requirements F7.1–F7.3.

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

- Non-European regions other than the approved next-priority World and North America canvas variants
- Real-time collaboration/sharing
- Advanced styling (hatching patterns, labels inside countries)
- Animated map transitions
- Mobile app (web responsive only)
- AI color palette suggestions
- Batch processing of multiple maps
