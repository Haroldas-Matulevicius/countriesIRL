# Milestones

> **Status:** v1.0 — MVP — open 2026-07-21 (executing).
> **Archives:** [`ARCHIVES.md`](ARCHIVES.md) — index of per-milestone archives + naming conventions.
> **v1.0 in-flight capsule:** [`milestones/v1.0/`](milestones/v1.0/) — `ROADMAP-ARCHIVE.md`, `phases/`.
> **Engine docs (version-agnostic):** [`CODING_RULES.md`](CODING_RULES.md), [`coding-rules/`](coding-rules/).
> ────────────────────────────────────────

## v1.0 — MVP (open 2026-07-21)

**Goal:** A browser-only choropleth map generator that lets non-technical Instagram
creators color countries, compose a view, and export an exact 1080×1080 PNG — starting
with modern Europe, expanding to a world composition platform.

**Phases:** 1 (Foundation & Modern Map), 2 (Region Variants & Advanced Features),
3 (Polish & Launch).

Per-phase status, plan counts, and completion dates live in the **Progress table** in
[`ROADMAP.md`](ROADMAP.md) — canonical, don't duplicate counts here.

### Shipped

| Phase | Name | Date | Outcome |
|---|---|---|---|
| 1 | Foundation & Modern Map | 2026-07-22 | 22/22 plans. Europe map, 50-action undo/redo, presets + custom color, localStorage persistence, exact 1080×1080 PNG export, responsive workspace, Chrome 150 + Edge 150 accepted. Localhost-only by choice. |

### In progress

| Phase | Name | Status |
|---|---|---|
| 2 | Region Variants & Advanced Features | Executing — world/region variants, camera, legend, composition persistence. Historical snapshots **deferred** (see below). |

### Deferred out of v1.0

| Item | Reason | Where it went |
|---|---|---|
| Historical border snapshots (1492, 1700, 1815, 1914) | Rights-cleared archival source material does not exist; obtaining it is weeks of non-engineering research. The engine, validation, and promotion path ship and are tested. | Follow-on data-acquisition phase. See [`phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md) |
| Vercel deployment + production verification | Localhost-only release accepted by owner; no authorization to deploy. | Optional future work, requires new explicit authorization |
| Firefox / Safari / previous-version browser certification | Owner scoped acceptance to installed Chrome 150 + Edge 150. | Explicitly unverified — must never be reported as passed |

### Key architectural decisions carried forward

- React 18 + strict TypeScript + Vite; D3 v7 SVG rendering; html2canvas; localStorage
- One reducer-owned selection/color state with bounded 50-action history
- Discriminated result contracts at every boundary (color, GeoJSON, storage, export)
- One `MapCanvasHandle` owns the camera; save reads it live and non-locking, export takes
  an idempotent freeze lease released in the outermost `finally`
- Exports capture from a fixed 540×540 frame at scale 2 and reject any non-1080×1080 canvas
- Administrative-code ID precedence: `ADM0_A3` → `GU_A3` → `ISO_A3` → `SOV_A3`
- Country browser and Locate stay on the modern 195-core catalog; historical-only entities
  are map-interactive but never searchable
- Historical geometry, rights, and factual approvals are never inferred or fabricated;
  executor self-approval is forbidden

*Capsule:* [`milestones/v1.0/`](milestones/v1.0/)

---
*Last phase number: 3*
