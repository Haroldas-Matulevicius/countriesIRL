# CountriesIRL Map Generator

> **Status:** v1.0 — MVP in flight. This file holds the **durable why** — vision, problem,
> users, constraints. It is not updated for progress; [`ROADMAP.md`](ROADMAP.md) § Progress is
> canonical for that, and [`STATE.md`](STATE.md) for the live position.
> **Pointers:** [`REQUIREMENTS.md`](REQUIREMENTS.md) (what) · [`ROADMAP.md`](ROADMAP.md) (when) ·
> [`MILESTONES.md`](MILESTONES.md) (what was cut and why).
> ────────────────────────────────────────

**Owner:** georgibg88
**Created:** 2026-07-21

> **Reading note.** The vision below still names historical borders and regional zoom levels. That
> remains the intent; it is **not** a description of what ships. Historical snapshots are deferred
> out of v1.0 for missing rights-cleared source material, and Phase 2 replaced regional zoom modes
> with a single wrapping world canvas and a free camera. The original text is preserved rather
> than rewritten.

## Vision

Automate the creation of viral choropleth map content for Instagram country pages. Enable creators running themed country accounts to rapidly generate color-coded world maps with historical borders, flexible centering, regional zoom levels, and automated legends—reducing production time from hours to minutes.

## Problem

Instagram creators running country-themed pages manually color maps in image editors (Photoshop, GIMP, Canva) for each video/post. This is:
- Time-consuming (hours per map)
- Repetitive and error-prone
- Hard to scale for historical periods or regional variations
- Difficult to coordinate across a group of creators

## Solution

**Map Generation Tool**: Web-based (or CLI) application that automates:
1. **Country coloring** — interactive selection + auto-fill
2. **Historical borders** — select time period per country (e.g., Lithuania 1200–2000)
3. **Flexible views** — center any country, zoom to regions (EU, World, Custom)
4. **Legend generation** — automatic legend based on colors used
5. **Instagram export** — optimized PNG/JPG output

## Target Users

- Instagram creators (5–10+) running country-themed pages
- May have limited technical skills—tool must be intuitive
- Need fast turnaround for content creation
- Willing to share/reuse historical border datasets

## Key Constraints

- **Historical data availability** — Limited for pre-1800s; best sources are European
- **Visual quality** — Output must look polished, suitable for Instagram
- **Ease of use** — Non-technical users should be able to generate maps in <5 min
- **Shareability** — Group members can reuse maps, share historical data

## Success Criteria

- [ ] Users can color countries and generate map + legend in <5 minutes
- [ ] Historical borders available for major European powers (1400–present)
- [ ] Map can be centered on any country with readable layout
- [ ] Regional zoom levels (EU, World) work smoothly
- [ ] Exported images are Instagram-ready (1080×1080, high quality)
- [ ] 3+ historical periods per country available at launch
- [ ] Extensible for other regions/periods later

## Scope (MVP) — European Focus

**In scope:**
- Interactive web UI for color selection
- Modern European country borders + historical periods (1200–2000 for major powers)
- EU-centric zoom levels (EU only, EU + Middle East/North Africa, Europe + Russia)
- Historical border data for: Poland, Lithuania, Hungary, Balkans, Iberia, Scandinavia (1400–present)
- Legend generation
- Center map on any country
- Instagram export (1080×1080)

**Out of scope (V2+):**
- Non-European regions initially (Africa, Asia, Americas)
- Mobile app
- AI-powered color suggestions
- Animated transitions
- Batch processing
- Pre-1400 historical data (complexity/accuracy concerns)

## Team & Delegation

**Phase leads:** Codex (architecture, MVP delivery)  
**Domain:** Geospatial data, cartography, UX  
**Tech stack:** TBD (recommend web-based: D3.js or Mapbox + React)

---

## Appendix: Reference Materials

- Example format: Instagram post with Europe map, colored by category, legend overlay
- Historical source: Natural Earth historical data (1800+), Wikidata borders
- Map projections: D3-geo for flexible centering

---

*Last updated: 2026-07-26 — added the breadcrumb header and a reading note distinguishing durable vision from shipped scope; the body text is unchanged.*
*Last updated: 2026-07-21 — initial project definition.*

*Full edit history: `git log -p -- .planning/PROJECT.md`.*
