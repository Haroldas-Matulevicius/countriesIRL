# CountriesIRL Map Generator

Automate the creation of viral choropleth map content for Instagram country-themed pages.

## Overview

This tool enables Instagram creators to rapidly generate color-coded world maps with:

- 🎨 **Interactive coloring** — Select countries and apply colors
- 🗺️ **Historical borders** — Choose different time periods (1400s–2000s) for any country
- 🧭 **Flexible centering** — Center the map on any country with multiple zoom levels
- 📋 **Auto-legends** — Legends generate automatically based on colors used
- 📱 **Instagram export** — 1080×1080 PNG ready to post

## Quick Start

**Status:** Currently in Phase 1 development  
**Target Launch:** Late August 2026

### Project Documentation

- **[PROJECT.md](.planning/PROJECT.md)** — Vision, goals, constraints
- **[REQUIREMENTS.md](.planning/REQUIREMENTS.md)** — Full feature specifications
- **[ROADMAP.md](.planning/ROADMAP.md)** — 3-phase development timeline
- **[STATE.md](.planning/STATE.md)** — Current project status & decisions

### For Developers

Phase 1 focuses on:
- Modern European country borders
- Interactive coloring UI
- PNG export functionality
- Local browser storage

[See ROADMAP for full phase breakdown](.planning/ROADMAP.md)

### For Content Creators

Once launched, creators can:
1. Open the web app
2. Select a country to center on
3. Pick a historical period (or use modern)
4. Color countries interactively
5. Export as PNG (with auto-generated legend)
6. Post to Instagram 🎉

## Tech Stack (WIP)

- **Frontend:** React + D3.js (recommended)
- **Map Data:** GeoJSON (Natural Earth, Wikidata)
- **Export:** html2canvas + canvas2image
- **Deployment:** Vercel or GitHub Pages (TBD)

## Scope (MVP — European Focus)

**In:** Poland, Lithuania, Hungary, Balkans, Iberia, Scandinavia + broader EU  
**Periods:** 1400s, 1700s, 1800s, 1900s, modern  
**Zoom levels:** EU-only, EU+Middle East, Europe+Russia  

**Out of scope for V1:** Non-European regions, mobile app, real-time collaboration

## Contributing

This project is currently in early development. Contributions welcome during Phase 2–3!

---

**Contact:** georgibg88@gmail.com

**Repository:** https://github.com/Haroldas-Matulevicius/countriesIRL
