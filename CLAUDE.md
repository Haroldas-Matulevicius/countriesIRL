# CLAUDE.md

Guidance for Claude Code when working in this repository.

---

## Orientation

- **CountriesIRL** = Web-based choropleth map generator for Instagram creators. Auto-colors maps with flexible framing, legend generation, and instant exports. **Current phase:** Phase 2 — one full-world canvas, free camera, legend, bounded persistence, and the historical *engine*.
- **Phase 2 is browser-only and localhost-only.** No deployment, backend, auth, cloud, or environment secrets.
- **Historical geometry does not ship.** The snapshot engine is built and tested, but the 1492/1700/1815/1914 packets are **deferred for missing rights-cleared archival source material** — not pending a signature. The approved catalog holds exactly `Modern`. Never describe a historical snapshot as available, and never promote geometry into `public/data/` without the full approval chain (see `.planning/coding-rules/data.md`).
- **Phase 1 is complete and its release evidence is immutable.** Do not rewrite it; annotate instead.
- **Workflow engine:** GSD (`/gsd:*` commands) — see §GSD Integration. Live status: `.planning/STATE.md`; current phase handoff: `.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/.continue-here.md`.
- **Before touching code**, load the matching `.planning/coding-rules/*.md` (via **`themely-coding-rules` skill adapted for CountriesIRL** or the index at `.planning/CODING_RULES.md`).
- This file is a **routing table** — find the right doc below instead of expecting answers inline.

---

## Stack & Architecture (one screen)

**Stack** — React 18 + TypeScript (strict) + Vite; D3 v7 (one fixed Mercator projection + SVG rendering); html2canvas (PNG export); localStorage (save/load); Vitest (unit, **`node` environment — no DOM**) + Playwright (Chrome/Edge E2E). **No deployment target.**

**Core wiring:**
- `App` — composition root: owns durable state, hands accessors down, re-implements nothing
- `useMapState` — reducer-based **colors-only** history (undo/redo); selection is never in a snapshot
- `useGeoData` — loads and validates the same-origin world asset, builds O(1) entity/core lookups
- `MapCanvas` — D3 SVG render + the camera controller; owns the one `MapCanvasHandle`
- `MapWorkspace` — typed `legendSlot` / `navigationSlot`; placement decides export membership
- `useComposition{Save,Load,Export}Transaction` — locks, camera lease, outcomes
- `Controls` — one component with a declared `variant` (`app-bar` | `strip`), never two copies
- `ToastRegion` — allowlist boundary for every creator-facing message
- `exportMapPng` — pure: clones an already-frozen composition → exactly 1080×1080 PNG

**Non-obvious paths:**
- `public/data/world-modern.geojson` — the Phase 2 world geometry (same-origin, hash-verified)
- `public/data/world-manifest.json` — provenance and integrity record
- `public/data/snapshots/index.json` — the **approved** snapshot catalog (currently `Modern` only)
- `public/data/europe-modern.geojson` — Phase 1 European boundaries, retained
- `src/constants/snapshots.ts` — `SNAPSHOT_CATALOG`; reachability is decided here, not by a manifest
- `src/utils/mapProjection.ts` — the single world projection; centering is a camera transform
- `src/utils/export.ts` — PNG export chokepoint (clone contract, sanitization, refusal reasons)
- `src/utils/legend.ts` — `resolveLegendPosition` / `resolveLegendRender`; nothing reads `legend.position` raw
- `src/utils/storage.ts` — bounded V2 records; limits checked **before** `JSON.parse`
- `src/styles/phase2CssContract.test.ts` — machine-enforced CSS token and selector rules
- `tests/e2e/support/` — shared browser fixtures; import these, never re-declare helpers
- `.planning/coding-rules/` — Domain-specific rules indexed below

**Environment** — no `.env.local`, no secrets, no `VERCEL_URL`. The app runs from `npm run dev` against bundled data.

---

## Model Routing

Claude models only. Single role per session:

- **Smart tier — orchestrator/planner** (Opus or Fable): architecture decisions, feature planning, code review, debugging complex issues. Token-efficient, high leverage.
- **Workhorse — Opus** (if not smart tier): writes/edits/tests product code off smart-tier plan, bulk reads, verification, doc writing.

**Delegation rule:** Push code writing/editing/debugging and read-heavy sweeps down to a workhorse subagent (executor, code-fixer, verifier) instead of doing them inline. Independent non-author review of the aggregate diff is not optional — see Guardrails.

---

## Commands

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # tsc -b && vite build
npm run preview          # Preview built bundle locally
npm run lint             # eslint .
npm test                 # vitest run (unit; node environment, no DOM)
npm run test:e2e         # playwright test (Chrome + Edge)
npm run data:world:check # Verify the bundled world asset against its manifest hash
```

**There is no deploy command.** `vercel deploy` was listed here through Phase 1 and never used —
plans 01-16/01-17 were closed as deferred and no production URL is claimed. Do not add one back
without an explicit owner decision.

**Full gate before claiming a phase-level result:** `npm run lint && npm test && npm run build`,
plus `npm run test:e2e` for anything touching render, camera, export, persistence, or layout.

---

## Guardrails

**Always read `.planning/coding-rules/general.md` first.** Besides naming, TypeScript discipline,
and forbidden patterns, it is the **canonical home** for two lists that bind every change:
**§Live Invariants** (the nine contracts a change can silently regress) and **§Immutable Safety
Constraints** (historical evidence, approval semantics, browser certification, localhost-only
scope). No other planning file restates them — they all link there. The excerpts below are
reminders, not the source of truth.

**No auto-load docs.** `CLAUDE.md` tags which docs to load — respect the guards to keep context lean.

**GeoJSON validation** — all features must have an `id` and `properties.name`. Validate on load; skip malformed entries with a warning (don't crash).

**PNG export size contract** — always export exactly 1080×1080. Test before shipping.

**Approval is evidence, never inference.** Never infer, fabricate, or self-approve a rights,
factual, or topology approval. A BLOCKED packet is not a delivered snapshot and is never counted
as one. **Deferred is not done** — nothing may read as though a historical snapshot shipped. The
six historical region IDs are never silently merged. A blanket, in-advance, sight-unseen approval
authorizes proceeding; it is **not** a content review and it is **not** hash-bound. Record which
one you have.

**Firefox, Safari, and previous-version certification have never been run here** and must never be
reported as passed. Acceptance is scoped to installed Chrome 150 + Edge 150.

**A gate must be able to fail on the bug it covers.** Before landing an assertion, break its
subject and watch it go red. This phase shipped three tests that could not fail — a self-comparing
performance gate, a fixture asserting wiring it re-implemented, and a pixel probe that only checked
cross-context equality (which three blank canvases satisfy). Each read as proof.

**Never `git checkout --` a file with uncommitted work.** Copy it to a scratchpad first and restore
by copying back. Two agents lost edits this way in one session. See `coding-rules/general.md`.

**Never run the gsd-sdk verbs `state.advance-plan`, `state.update-progress`, or
`roadmap.update-plan-progress`.** They infer status from file presence and have already zeroed
this repo's progress counters, deleted its activity log, and marked an incomplete plan complete.
**Edit `.planning/STATE.md` and `.planning/ROADMAP.md` by hand.**

**Independent review is not optional.** Executor self-reported checkpoints proved unreliable:
non-author review of an aggregate diff caught five real defects that the executor had already
marked resolved.

---

## Documentation Routing

### Always-relevant engine docs (updated in place, never archived)

| Doc | Holds | Load when |
|---|---|---|
| `.planning/CODING_RULES.md` | Index → `coding-rules/*.md` (general, frontend, data, export, storage) | Before writing/reviewing any code. **Always read `coding-rules/general.md` first** — it also owns §Live Invariants and §Immutable Safety Constraints — then the section matching the code you're touching. |
| `.planning/STATE.md` | Live position, open owner gates, decisions, blockers, pending todos | Before starting a session; auto-loaded by GSD. |
| `.planning/ROADMAP.md` | **Canonical** phase/plan status and counts (§Progress), verified gates, timeline, risks | Whenever you need to know what is done. No other file restates these counts. |
| `.planning/MILESTONES.md` | Milestone outcomes and the milestone-level deferral table | Milestone framing; what was cut from v1.0 and why. |
| `.planning/ARCHIVES.md` | Archive navigation index + `.planning/` file-hygiene conventions | Before looking for anything historical. **Grep the archives first, read narrowly.** |
| `.planning/REQUIREMENTS.md` | Functional / non-functional / data / acceptance criteria | Reference for feature scope. **Original requirement text is never rewritten** — F2/F3/F7 carry supersession annotations, and Phase 1 Release Acceptance is immutable evidence. |
| `.planning/phases/02-.../.continue-here.md` | Session resumption only: current position, next action, working-tree hazards | Start of any Phase 2 session. It points at the canonical homes rather than copying them. |
| `.planning/PROJECT.md` | Vision, problem, solution, target users, constraints | Shipped; reference only. |

### GSD files (auto-loaded by GSD commands — don't hand-load)

`.planning/{STATE,ROADMAP,REQUIREMENTS,PROJECT}.md`

### Load-gated docs — NEVER auto-load

| Doc | Load ONLY when |
|---|---|
| `.planning/CODEX_PROMPT.md` · `.planning/PHASE1_CODEX_BRIEF.md` | **Spent Phase 1 inputs, kept for provenance only.** Frozen Phase 1 artifacts cite them by path, so they stay put. They describe a Europe-only app with a Vercel deployment target — neither is true now. Load only when auditing Phase 1 evidence. |
| `.planning/phases/02-…/02-RESEARCH.md` · `02-PATTERNS.md` · `02-UI-SPEC.md` · `02-VALIDATION.md` | Planning a change inside the surface they cover. These are large (50–80KB each) — grep them, never read one whole. |
| `Design.md` | **Does not exist yet.** Create it when Phase 3 visual polish starts. |

There is **no** `.planning/codebase/` directory and no `.planning/PHASE2_PLANNING.md`. Rows for
both were carried in this table for months; neither file has ever been committed. Removed
2026-07-26.

---

## GSD Integration

All workflow orchestration, planning, execution, and verification uses GSD `/gsd:*` commands:

- `/gsd:execute-phase <N>` — Execute the phase's plans
- `/gsd:verify-work <N>` — Post-execution verification (goal-backward check)
- `/gsd:debug` — If a bug surfaces during UAT

**Owner gates cannot be delegated or auto-approved.** A `checkpoint:decision` or
`checkpoint:human-verify` marked `autonomous: false` needs the owner. In particular the phase
acceptance matrix requires a human to perform the touch, screen-reader, and visual checks — an
automated result may never be substituted for a physical claim, and a blanket pre-approval
authorizes proceeding without evidencing that anything was reviewed. Record which one you have.

---

## Project Skills (`.claude/skills/`) — Future

None yet. Direct CLI work.

---

## Update Process

`CLAUDE.md`, `.planning/CODING_RULES.md`, and `.planning/coding-rules/*.md` are manually maintained sources of truth.

After a session that changes rules, patterns, or architecture:
1. Propose the exact edit — never auto-save without review
2. Bump the "Last updated" date in the changed file
3. Keep only the **two most recent** "Last updated" entries in each file (git holds the rest)

**Rule 3 is real and was being violated.** `frontend.md` had accumulated seven entries and
`export.md` four before plan 02-25 consolidated them. When you would add a third, merge the two
oldest into one line in the same edit.

**Update the matching `coding-rules/*.md` in the same commit that lands the behavior.** Batching
rule updates to the end of a phase means the rules describe what was planned rather than what
shipped, and a later "documentation catch-up" plan then has to reverse-engineer the delta.

---

## Documentation-as-you-build

Every subsystem owns a rules file, and the rule lands with the code:

| Subsystem | File |
|---|---|
| Cross-cutting (types, naming, testing, git) | `coding-rules/general.md` |
| React / D3 / CSS / composition root | `coding-rules/frontend.md` |
| World asset, catalog, validation | `coding-rules/data.md` |
| PNG export and its clone contract | `coding-rules/export.md` |
| Persistence | `coding-rules/storage.md` |

*(Phase 1 ran this through `.planning/CODEX_PROMPT.md`; the prompt is spent, the practice stands.)*

---

*Last updated: 2026-07-26 — documentation pass: removed the two routing rows pointing at files that have never existed (`.planning/codebase/STRUCTURE.md`, `.planning/PHASE2_PLANNING.md`), pointed the guardrails at `coding-rules/general.md` as the canonical home for the live invariants and immutable safety constraints, added the destructive gsd-sdk verbs and the unverified-browser rule, and load-gated the spent Phase 1 inputs.*
*Last updated: 2026-07-26 — Phase 2 routing: current phase and scope, world/catalog paths, real command set with no deploy target, evidence-not-inference and gate-must-be-able-to-fail guardrails, `/gsd:*` command form, owner gates, and documentation-as-you-build (plan 02-25).*

*Full edit history: `git log -p -- CLAUDE.md`.*
