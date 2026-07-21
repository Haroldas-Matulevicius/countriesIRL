# CountriesIRL Map Generator — Project State

**Last updated:** 2026-07-21  
**Status:** Initialized / Awaiting Phase 1 Planning

---

## Current Phase

**Phase 1: Foundation & Modern Map** (Not yet started)

### Phase 1 Goals

- [ ] Tech stack finalized
- [ ] Web app shell created (React or alternative)
- [ ] Modern European borders rendering
- [ ] Interactive coloring working
- [ ] Export to PNG functional
- [ ] Local storage save/load working

---

## Decisions Made

### Project Scope

- ✅ **European focus** (V1): Poland, Lithuania, Hungary, Balkans, Iberia, Scandinavia, + broader EU
- ✅ **Historical periods**: 1400s–modern (4–5 snapshots)
- ✅ **Features**: Coloring, centering, zoom levels, legend generation, export
- ❓ **Tech stack**: TBD (React + D3.js recommended, but open to Codex input)

### User Personas

- Instagram creators (non-technical to moderately technical)
- 5–10+ users across group
- Primary use: 5–10 min per map for content creation
- Secondary use: Sharing historical border data

---

## Pending Decisions

| Decision | Owned by | Target Date |
|----------|----------|-------------|
| Final tech stack (React vs. Vanilla vs. Svelte?) | Codex | Phase 1 kickoff |
| Map projection (Mercator vs. Azimuthal Equidistant?) | Codex | Phase 1 week 1 |
| Canvas vs. SVG for rendering? | Codex | Phase 1 week 1 |
| Historical border data sourcing (buy, trace, mix sources?) | Codex + Team | Phase 2 kickoff |

---

## Communication & Handoff

### Team

- **Owner/Product:** georgibg88 (georgibg88@gmail.com)
- **Lead Dev/Executor:** Codex
- **Test/Feedback:** Instagram creators group (5–10 people, TBD)

### Communication Protocol

- Decisions logged in this file (STATE.md)
- Phase status updated weekly in ROADMAP.md
- Blocker escalations: Email to owner + update STATE.md

---

## Known Constraints

1. **Historical data scarcity** — Pre-1400s borders unreliable; focus on 1400+
2. **Map projection trade-offs** — Centering on country distorts far regions; document or offer full-world option
3. **Browser storage limits** — Max ~5–10 saved maps per user (consider JSON export)
4. **Small territories** — Exclaves/small regions hard to color (acceptable limitation)

---

## Assumptions

- Users have modern browsers (Chrome, Firefox, Safari, Edge)
- Creators willing to manually map data (country → yes/no/other) before using tool
- No real-time collaboration needed (V1)
- Instagram export format: 1080×1080 PNG (standard square)

---

## Success Metrics (MVP)

**By 2026-08-25:**

- ✅ Tool deployed to public URL
- ✅ 3+ creators able to generate maps in <5 minutes
- ✅ 4+ historical periods per major region available
- ✅ Export quality meets Instagram standards
- ✅ Zero crashes in first 100 uses per creator
- ✅ 95%+ satisfaction from tester group

---

## Escalation Path

- **Blocker (critical)**: Notify georgibg88, update STATE.md immediately
- **Decision needed**: Log in "Pending Decisions" table, notify Codex
- **Feedback/iteration**: Gather during Phase 2–3, iterate in Phase 3

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-07-21 | 1.0 | Initial project initialization; European focus confirmed; 3-phase roadmap created |

---

## Next Action

👉 **Run `/gsd:plan-phase 1` to break Phase 1 into executable tasks and begin development.**
