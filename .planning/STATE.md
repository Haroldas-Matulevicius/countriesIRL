---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: executing
stopped_at: "Phase 02 descoped to Modern-only; Wave 5 wiring under second fix round before integration"
last_updated: "2026-07-25T04:40:00.000Z"
last_activity: "2026-07-25 -- Historical infrastructure merged (packets truthfully BLOCKED, zero promotion). Phase 2 descoped: historical snapshots deferred to a data-acquisition phase. 02-17 rescoped and complete (Modern-only catalog hash-verified). Doc architecture rebuilt three-layer. 02-27 gate script written and validated end-to-end (10/10 gates, clean worktree teardown). Wave 5 wiring stack twice independently reviewed; four real defects found and being fixed."
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 58
  completed_plans: 38
  percent: 66
---

# State: CountriesIRL Map Generator

> **Status (2026-07-25):** Phase 2 **descoped to Modern-only** — historical snapshots
> deferred because the rights-cleared archival source material does not exist (blockers name
> missing scans and geometry, not missing approval). The historical *engine* ships and is
> tested. **16/36 plans complete, 8 deferred, 10 engineering + 2 owner gates remain.**
> The Wave 5 production-wiring stack is in its second independent fix round and is **not yet
> integrated**.
> **Pointers:** [`ROADMAP.md`](ROADMAP.md) (Progress table is canonical) ·
> [`MILESTONES.md`](MILESTONES.md) · [`ARCHIVES.md`](ARCHIVES.md) ·
> [`02-DESCOPE-DECISION.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-DESCOPE-DECISION.md)

## Project Reference

- **Core value:** Help non-technical Instagram creators produce accurate, polished
  choropleth maps quickly.
- **PROJECT.md last touched:** 2026-07-21.
- **Stack:** React 18 + strict TypeScript + Vite; D3 v7 SVG; html2canvas; localStorage.
  Browser-only, localhost-only. No backend, auth, or deployment.

## Current Position

Phase: 02 (region-variants-advanced-features) — EXECUTING
Next step: Land the Wave 5 HI-1 fix round, re-review, integrate, then execute `02-18`
(CompositionBar / Reset View / world fatal copy) and the remaining engineering waves.
Blocked on owner: `02-25` (doc patches — blanket pre-approval given, sight-unseen) and
`02-28` (acceptance matrix — requires physically performed tests, cannot be delegated).

## Critical Pitfalls

Rules live in [`coding-rules/`](coding-rules/) — load the relevant file before touching an area.
Always read [`coding-rules/general.md`](coding-rules/general.md) first.

- Historical geometry, rights, and factual approvals are **never** inferred or fabricated;
  executor self-approval is forbidden → [`coding-rules/data.md`](coding-rules/data.md)
- A BLOCKED packet is not a delivered snapshot and is never counted as one
- PNG output must be exactly 1080×1080, opaque, DPR-independent → `coding-rules/export.md`
- One `MapCanvasHandle` owns the camera; save reads it live and non-locking, export takes an
  idempotent freeze lease released in the outermost `finally`
- Country browser and Locate stay on the modern 195-core catalog; historical-only entities
  are map-interactive but never searchable

## Accumulated Context

### Roadmap Evolution (live window: 2026-07-24 onward)

Older entries → [`milestones/v1.0/ROADMAP-ARCHIVE.md`](milestones/v1.0/ROADMAP-ARCHIVE.md).
Per-plan chronology → `phases/*/*-SUMMARY.md`.

- 2026-07-25 — **Phase 2 DESCOPED.** Historical snapshots 1492/1700/1815/1914 deferred to a
  data-acquisition phase. All four packets verified truthfully BLOCKED offline. `02-17`
  rescoped to Modern-only catalog verification and completed. `02-18` rescoped to a
  catalog-driven selector. `F2.1`–`F2.5` annotated partially-satisfied.
- 2026-07-25 — **Doc architecture rebuilt** to the three-layer model: `ARCHIVES.md`,
  `MILESTONES.md`, `milestones/v1.0/` capsule (roadmap + decisions archives, archived Phase 1
  phase dir). `ROADMAP.md` restructured with a canonical Progress table. 59 Phase 1 decisions
  archived out of this file.
- 2026-07-25 — **Historical source-readiness infrastructure integrated** (packet assembly,
  hardened validation, 336→349 tests). Zero promotion; catalog remains Modern-only.
- 2026-07-25 — **`02-27` exact-commit gate script written and validated end-to-end** against
  `e41a3cf`: 10/10 gates in a detached clean worktree, blocked packets correctly failing
  closed, worktree removed and pruned with no leak.
- 2026-07-25 — Wave 5 wiring stack independently reviewed **twice**; four real defects found
  that self-reported checkpoints had called resolved (stuck export gate, phantom cross-scene
  selection, deleted inspector landmark, legend overflow clipping the PNG).

### Decisions (recent)

Phase 1 decisions → [`milestones/v1.0/DECISIONS-ARCHIVE.md`](milestones/v1.0/DECISIONS-ARCHIVE.md)
(still binding — carried forward, not superseded).

- [Phase 02]: Non-locking live camera read for save; idempotent `CameraFreezeLease` for
  export, released from the outermost `finally` on every path.
- [Phase 02]: Country browser/Locate stay at the modern 195 core. Out-of-scene rows are
  disabled, not filtered out — the catalog stays the full 195.
- [Phase 02]: Bound stored compositions before and after parse; migrate V1 in memory only.
- [Phase 02 descope]: Ship Modern-only. The historical engine, validation, and
  approval-aware promotion path are retained and tested so deferred snapshots drop in with
  no rework. The evidence bar is **not** relaxed — delivery is deferred, not approved.
- [Phase 02 process]: Executor self-reported checkpoints are not trusted for integration.
  Every stack gets an independent non-author review of the aggregate diff. This has caught
  four real defects across two rounds.

### Pending Todos

- Land Wave 5 HI-1 fix round → independent re-review → integrate → rerun combined gate.
- Execute `02-18` (CompositionBar, Reset View, world fatal/loading copy) — currently **no
  Reset View control exists at all** and `FatalErrorState` still says "Europe map".
- Then `02-30`/`02-21`, `02-20`/`02-22`, `02-23`, `02-24`, `02-26`/`02-36`, `02-27`.
- Leave `02-28` signature-ready with automated cells pre-filled.
- If hosting is ever requested, reopen the Vercel runbooks under new explicit authorization.

### Blockers/Concerns

- **Historical data (deferred, not solvable by approval):** 1492 lacks Semkowicz-Romer scans,
  the CNIG 15094 product archive, and manual-trace operator records/control points/geometry.
  1700 lacks Karlowitz frontier demarcation and approved six-region geometry. Both also need
  independent rights, factual, and topology review.
- **`02-28` cannot be delegated.** Its resume-signal explicitly rejects generic approval and
  forbids automation substitution for physical claims. Blanket owner approval does not
  satisfy it; a human must perform the touch, screen-reader, and visual checks.
- Firefox, Safari, and previous-version certification remain unverified and must never be
  reported as passed.
- No deployment, production URL, or backend exists or is claimed.

## Known Constraints

- Browser storage must handle capacity, quota, unavailable, corrupt-data, and partial-valid
  load cases with distinct feedback.
- Small territories and exclaves remain selectable through the country list.
- PNG output must remain exactly 1080×1080, opaque white, centered, map-only, and
  theme/device-pixel-ratio independent.
- Acceptance evidence contains source tests only; `.claude/**` is gitignored and excluded.
- Executable evidence harnesses, profiles, cache files, and nested checkouts stay outside
  authoritative product evidence; immutable JSON/log history is retained unchanged.
- **NFR3 timing threshold is an OPEN owner decision, not a settled one.** D-63 retired
  timing gates for **Phase 1 only** ("the user explicitly directs that Phase 1 stop gating
  on millisecond timing") and does not carry into Phase 2 on its own. Phase 2 currently
  asserts no timing threshold and records warm period-switch samples plus their median as
  advisory annotations in `tests/e2e/history.spec.ts`, so a threshold can be set from real
  numbers. Do not cite D-63 to justify a Phase 2 timing decision.

## Session Continuity

Last session: 2026-07-25T04:40:00.000Z
Stopped at: Phase 02 descoped; Wave 5 wiring in second fix round, not yet integrated
Resume file: [`.continue-here.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/.continue-here.md)
