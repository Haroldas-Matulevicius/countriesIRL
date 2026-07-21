---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-07-21T21:51:49.806Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 17
  completed_plans: 0
  percent: 0
---

# CountriesIRL Map Generator — Project State

**Last updated:** 2026-07-21  
**Status:** Ready to execute

---

## Current Phase

**Phase 1: Foundation & Modern Map** (Not yet started)

### Phase 1 Goals

- [x] Planning finalized across 17 executable plans and 11 waves
- [ ] React 18 + strict TypeScript + Vite shell
- [ ] Modern European D3/SVG map with stable normalized country IDs
- [ ] Single/multi-country coloring with 50-action undo/redo and reset
- [ ] Exact 1080×1080 PNG export
- [ ] Local save/replace/load/delete plus persisted onboarding dismissal
- [ ] Responsive/accessibility/browser matrix and measured performance acceptance
- [ ] Human-authorized Vercel deployment and verified production URL

---

## Decisions Made

### Project Scope

- ✅ **European focus** (V1): Poland, Lithuania, Hungary, Balkans, Iberia, Scandinavia, + broader EU
- ✅ **Phase 1 stack**: React 18 + strict TypeScript + Vite + D3 SVG + html2canvas + localStorage
- ✅ **Phase 1 scope**: Modern borders, single/multi-coloring, 50-action history, persistence, exact PNG, onboarding, responsive/accessibility, deployment
- ✅ **Natural Earth**: Version 5.1.1 default POV, with blocking presentation acceptance before deployment
- ✅ **Offline boundary**: Bundled same-origin assets and no runtime third-party requests; already-loaded use works offline; fresh disconnected reload is not required; no service worker
- ✅ **Responsive composition**: One active matchMedia-selected React workspace with viewport-correct DOM/focus order
- ✅ **Historical/centering/legend scope**: Deferred to Phase 2

### User Personas

- Instagram creators (non-technical to moderately technical)
- 5–10+ users across group
- Primary use: 5–10 min per map for content creation
- Secondary use: Sharing historical border data

---

## Pending Decisions

| Decision | Owned by | Target Date |
|----------|----------|-------------|
| Historical border data sourcing (buy, trace, mix sources?) | Codex + Team | Phase 2 kickoff |
| Historical-period geopolitical POV/accuracy policy | Owner + Codex | Phase 2 kickoff |

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
2. **Phase 1 projection** — Fixed Mercator Europe view; centering/reprojection remains Phase 2
3. **Browser storage limits** — Maximum 10 saved maps; quota/unavailable/corrupt cases are mandatory tests
4. **Small territories** — Exclaves/small regions remain selectable through the country list
5. **Browser availability** — Safari current/previous requires macOS or BrowserStack if unavailable locally
6. **Vercel authorization** — Human login checkpoint is required before production deployment

---

## Assumptions

- Users have Chrome, Firefox, Safari, or Edge from the current or previous release; all eight matrix cells must pass
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

**Run `/gsd:execute-phase 1` to execute the 17 approved plans across 11 waves.**
