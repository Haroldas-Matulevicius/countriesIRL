# CLAUDE.md

Guidance for Claude Code when working in this repository.

---

## Orientation

- **CountriesIRL** = Web-based choropleth map generator for Instagram creators. Auto-colors maps with historical borders, flexible centering, legend generation, instant exports. **Current phase:** Phase 1 MVP (modern European borders, interactive coloring, PNG export, save/load).
- **Workflow engine:** GSD (`/gsd-*` commands) — see §GSD Integration. Live status: `.planning/STATE.md`.
- **Before touching code**, load the matching `.planning/coding-rules/*.md` (via **`themely-coding-rules` skill adapted for CountriesIRL** or the index at `.planning/CODING_RULES.md`).
- This file is a **routing table** — find the right doc below instead of expecting answers inline.

---

## Stack & Architecture (one screen)

**Stack** — React 18 + TypeScript + Vite; D3.js v7+ (projections + SVG rendering); html2canvas (PNG export); localStorage (save/load); Vercel deployment.

**Core wiring:**
- `useMapState` hook: reducer-based color history (undo/redo, up to 50 snapshots)
- `useGeoData` hook: load & process GeoJSON, build country lookup
- `MapCanvas` component: D3 SVG map render, interactive country selection
- `ColorPicker`: palette presets + custom hex validation
- `Controls`: undo/redo/reset/export/save buttons
- `SaveLoad`: localStorage persistence of map configurations
- `exportMapPng`: html2canvas → 1080×1080 PNG

**Non-obvious paths:**
- `public/data/europe-modern.geojson` — Modern European country boundaries (Natural Earth 10m)
- `src/types/map.ts` — GeoFeature, MapState, MapAction types
- `src/utils/export.ts` — PNG export chokepoint (html2canvas + 2x DPI scaling)
- `src/utils/storage.ts` — localStorage wrapper (max 10 saved maps, 5MB quota)
- `.planning/coding-rules/` — Domain-specific rules indexed below

**Environment** — `.env.local` not required for Phase 1 (browser-only, no backend). Vercel deploy adds `VERCEL_URL` automatically.

---

## Model Routing

Claude models only. Single role per session:

- **Smart tier — orchestrator/planner** (Opus or Fable): architecture decisions, feature planning, code review, debugging complex issues. Token-efficient, high leverage.
- **Workhorse — Opus** (if not smart tier): writes/edits/tests product code off smart-tier plan, bulk reads, verification, doc writing.

**Delegation rule:** For Phase 1 implementation, push code writing/editing/debugging and read-heavy sweeps down to a workhorse subagent (executor, code-fixer, verifier) instead of doing them inline.

---

## Commands

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Build for production
npm run preview          # Preview built bundle locally
vercel deploy            # Deploy to Vercel (manual)
npm run lint             # Lint (ESLint via Vite)
```

---

## Guardrails

**Always read `.planning/coding-rules/general.md` first** — it covers naming, TypeScript discipline, and forbidden patterns that apply everywhere.

**No auto-load docs.** `CLAUDE.md` tags which docs to load — respect the guards to keep context lean.

**GeoJSON validation** — all features must have an `id` and `properties.name`. Validate on load; skip malformed entries with a warning (don't crash).

**PNG export size contract** — always export exactly 1080×1080. Test before shipping.

---

## Documentation Routing

### Always-relevant engine docs (updated in place, never archived)

| Doc | Holds | Load when |
|---|---|---|
| `.planning/CODING_RULES.md` | Index → `coding-rules/*.md` (general, frontend, data, export, storage) | Before writing/reviewing any code. **Always read `coding-rules/general.md` first**, then the section matching the code you're touching. |
| `.planning/STATE.md` | Live phase status, progress, last activity | Before starting a session; auto-loaded by GSD. |
| `.planning/ROADMAP.md` | Phase timeline, success criteria, risk mitigations | Context for Phase 2+ planning. |
| `.planning/REQUIREMENTS.md` | Functional / non-functional / data / acceptance criteria | Shipped with Phase 1 code. Reference for feature scope. |
| `.planning/PROJECT.md` | Vision, problem, solution, target users, constraints | Shipped; reference only. |

### Codebase map (optional, read selectively)

`.planning/codebase/STRUCTURE.md` (file-by-file layout) — load only if disoriented on where a feature lives.

### GSD files (auto-loaded by GSD commands — don't hand-load)

`.planning/{STATE,ROADMAP,REQUIREMENTS,PROJECT}.md`

### Load-gated docs — NEVER auto-load

| Doc | Load ONLY when |
|---|---|
| `.planning/PHASE2_PLANNING.md` | Starting Phase 2 (historical borders + batch export). Not relevant to Phase 1. |
| `Design.md` (future) | Actively building Phase 3+ visual polish. Skipped for Phase 1 MVP. |

---

## GSD Integration

All workflow orchestration, planning, execution, and verification uses GSD `/gsd-*` commands. For Phase 1, key commands:

- `/gsd-execute-phase 1` — Runs the Codex implementation (from CODEX_PROMPT.md)
- `/gsd-verify-work 1` — Post-execution verification (goal-backward check)
- `/gsd-debug` — If a bug surfaces during UAT

---

## Project Skills (`.claude/skills/`) — Future

None yet. Phase 1 is direct CLI work.

---

## Update Process

`CLAUDE.md`, `.planning/CODING_RULES.md`, and `.planning/coding-rules/*.md` are manually maintained sources of truth.

After a session that changes rules, patterns, or architecture:
1. Propose the exact edit — never auto-save without review
2. Bump the "Last updated" date in the changed file
3. Keep only the **two most recent** "Last updated" entries in each file (git holds the rest)

---

## Codex: Phase 1 Execution

When building Phase 1:

1. **Generate this doc** — Use `.planning/CODEX_PROMPT.md` as the implementation spec
2. **Auto-generate coding rules** — As you build each subsystem (state, map, export, storage), Codex should generate the corresponding `coding-rules/*.md` file **in the same commit** that lands the feature
   - After `useMapState` lands: commit `coding-rules/general.md` + state patterns
   - After `MapCanvas` lands: commit `coding-rules/frontend.md` + React/D3 patterns
   - After `exportMapPng` lands: commit `coding-rules/export.md` + PNG export contract
   - After `useLocalStorage` lands: commit `coding-rules/storage.md` + persistence contract
3. **Index as you go** — After all coding-rules files exist, commit `.planning/CODING_RULES.md` as the final cleanup commit of Phase 1

This means Phase 1 ships with complete documentation baked in, preventing future regressions.

---

*Last updated: 2026-07-21 — initial CLAUDE.md for Phase 1 MVP. Routing table format adapted from Themely structure. Prior: none (new project).*

*Full edit history: `git log -p -- CLAUDE.md`.*
