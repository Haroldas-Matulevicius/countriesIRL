---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: executing
stopped_at: "02-23 complete (composition-root guards + integrated transaction E2E); next 02-24"
last_updated: "2026-07-25T23:10:00.000Z"
last_activity: "2026-07-25 -- 02-23 executed: the composition root was verified, not rewritten. src/App.tsx and src/main.tsx are byte-identical to their pre-plan state, because every behavioral clause the plan names (provider bootstrap, delegated save/load/export, one callback-ref-bound MapCanvasHandle with no camera controller in App, legend through MapWorkspace's typed legendSlot, one keyed responsive workspace, one Reset View, three navigation actions) was already delivered by 02-29/02-30/02-22. What was missing were the guards. src/App.test.tsx went 3 -> 9 cases: save, load, and export must receive the SAME getMapCanvasHandle function object (identity, not shape -- three accessors would mean three private handles); the legend must sit between the camera layer and the canonical SVG's closing tag; one map-canvas, one workspace, and the exact landmark counts at both layouts; and a source-level guard that App never imports a camera controller. tests/e2e/transactions.spec.ts adds three real-app Chrome tests: one bound handle with the sentinel and an exactly-preserved camera at BOTH sides of 1200px with Reset View/Locate/Pan each moving the visible transform after a crossing; all three export refusal classes (legend-blocked, invalid-composition, export-failed) followed by success in ONE session with camera input renewed between every step; and a historical entity through color/undo/redo/save/remount/load where undo reverts colors and legend but never the selection. The historical browser fixture was extracted to tests/e2e/support/ and phase2-composition.spec.ts now imports it -- a pure move, no assertion touched. Both new guards were proven RED (a sibling-legend patch and a dropped-handle patch), then reverted. Gates: lint clean, tsc -b clean, build clean, 469/469 unit (36 files), Chrome 53/53. Prior -- 02-22 executed: the global UI surfaces now match the Phase 2 copy contract exactly. Controls carries the approved action order with Export as the only filled action, native disabled/aria-busy state, and Reset All Colors held out as its own destructive action; Controls.css was rekeyed from :nth-child/:last-child onto role classes, which the reorder would otherwise have silently mis-painted. Onboarding renders the Create your map heading, body, three Phase 2 steps, and the Start Creating CTA. The export failure copy no longer tells a creator to refresh away an in-memory composition, and Centered on {country}. now bounds the country name (initial uppercase, <=60 chars) instead of allowlisting a prefix -- which had accepted a raw 64-character hash and, separately, rejected the real name Falkland Islands / Malvinas. Period load-failure copy joined the catalog-derived approved announcements. Tests cover every approved status category positively and reject hashes, projection terms, schema text, source paths, stack frames, storage exception names, deferred-feature copy, and arbitrary strings across all four severities. No landmark, role, or aria-* attribute was moved or removed. Gates: lint clean, tsc -b clean, build clean, 463/463 unit (36 files), Chrome 50/50. Prior -- 02-30 executed: the export transaction moved out of App into useCompositionExportTransaction, which owns the activation lock, the CameraFreezeLease, the frozen-camera commit, selected-scene finalization, the legend gate, and the creator-safe outcome, and releases all three locks from one outermost finally on every path -- refusal, thrown preparation, thrown capture, and a thrown status callback (which is now logged rather than propagated). The transaction is built once per owner and reads its options through a ref, so a dependency change can never hand out a fresh unlocked activation flag mid-export. F5.5 is now genuinely end to end: App holds the composition name, set only on a committed save or load, and passes it to the exporter as an accessor -- a real Chrome download proves CountriesIRL_<date>.png unnamed and Baltic_Tour_2026_<date>.png after saving 'Baltic  Tour /2026!'. Gates: lint clean, tsc -b clean, build clean, 442/442 unit, Chrome 49/49. Prior -- 02-21 executed: the export clone now strips duplicate accessibility/editor semantics (roles, titles, ids, tab stops, all aria-*) and the outgoing crossfade layer while preserving every visible wrapped date-line path; borders are normalized across path.scene-path so wrapped repeats of a selected country no longer bake the selection treatment into the PNG; a new invalid-composition reason refuses a sibling/duplicate legend or a camera/legend reorder; the UI-SPEC named-filename sanitizer landed. tests/e2e/export.spec.ts + fixtures/export.html drive the real MapCanvas/LegendOverlay/exportMapPng with no stubs, download the PNG, and verify IHDR 1080x1080 plus opaque corner pixels. Gates: lint clean, tsc -b clean, build clean, 420/420 unit, Chrome 48/48, Edge 48/48. Prior -- 02-20 executed: Save/Load now renders the exact UI-SPEC 15 composition states (row metadata over a SavedMapSummary projection, legacy copy, two-step delete, dirty-load confirmation dialog) and a focused Chrome/Edge persistence slice proves mid-Locate and mid-wheel saves store the painted frame, not the stale committed camera. Gates: lint clean, tsc -b clean, 410/410 unit, Chrome 39/39, Edge 39/39."
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 58
  completed_plans: 43
  percent: 74
---

# State: CountriesIRL Map Generator

> **Status (2026-07-25):** Phase 2 **descoped to Modern-only** — historical snapshots
> deferred because the rights-cleared archival source material does not exist (blockers name
> missing scans and geometry, not missing approval). The historical *engine* ships and is
> tested. **22/36 plans complete, 8 deferred, 4 engineering + 2 owner gates remain.**
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
Next step: Execute `02-24`, then `02-26`/`02-36`, and finally `02-27`.
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

- 2026-07-25 — **`02-30` complete.** The export transaction is out of `App` and into
  `useCompositionExportTransaction`: one outermost `finally` releases the activation lock, the
  camera lease, and the busy lock on every path, including the three strands the old inline
  handler still had (a throwing `setIsExporting(true)` outside the `try`, a throwing legend/
  handle read producing an unhandled rejection, and a throwing status callback escaping the
  handler). The transaction is created once per owner and reads options through a ref — a
  `useMemo`-rebuilt one would carry a fresh unlocked activation flag. F5.5 wired end to end:
  the composition name is owned by `App` (identity shared with save and load, never by the
  exporter) and proven through a real Chrome download. 442 unit tests, Chrome 49/49.
- 2026-07-25 — **`02-21` complete.** The export utility stays pure (no camera lease) but now
  strips semantics rather than geometry: every visible wrapped date-line path survives while
  roles, titles, ids, tab stops, all `aria-*`, editor state, and the outgoing crossfade layer
  are removed. Borders are normalized across `path.scene-path` — the previous
  `path.country-path`-only rule left the 2px selection border on decorative wrapped repeats.
  A new `invalid-composition` reason refuses a legend rendered beside the canonical SVG.
  `tests/e2e/export.spec.ts` downloads the real PNG and checks IHDR 1080×1080 plus opaque
  corners. 420 unit tests, Chrome 48/48, Edge 48/48.
- 2026-07-25 — **`02-20` complete.** Save/Load renders the exact UI-SPEC 15 composition
  states over a `SavedMapSummary` projection that never hands stored colors to the list
  surface. Delete is a two-step inline confirmation; loading over unsaved work is confirmed.
  `tests/e2e/persistence.spec.ts` proves mid-motion saves store the painted frame rather than
  the stale committed camera. 410 unit tests, Chrome 39/39, Edge 39/39.
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

- [Phase 02]: The composition name is identity owned by the composition root, set only on a
  committed save or load. The export transaction receives it as an accessor and never holds
  it — save, load, and export read one source of truth.
- [Phase 02]: A hook that owns a lock builds its transaction exactly once and reads its
  options through a ref. A `useMemo`-rebuilt transaction carries a fresh unlocked activation
  flag and lets a second export start while the first still holds the camera lease.
- [Phase 02]: The export transaction does not re-validate the source shape. `exportMapPng`
  already refuses disconnected, multi-SVG, and sibling-legend sources before capture; a second
  copy of those rules is drift, not safety. The transaction refuses only a `null` source.
- [Phase 02]: Export strips duplicate accessibility/editor semantics but never wrapped
  geometry; border normalization targets `path.scene-path`, not `path.country-path`.
- [Phase 02]: A legend outside the canonical SVG is a hard `invalid-composition` failure
  rather than a silently legend-less PNG.
- [Phase 02]: Non-locking live camera read for save; idempotent `CameraFreezeLease` for
  export, released from the outermost `finally` on every path.
- [Phase 02]: Country browser/Locate stay at the modern 195 core. Out-of-scene rows are
  disabled, not filtered out — the catalog stays the full 195.
- [Phase 02]: Bound stored compositions before and after parse; migrate V1 in memory only.
- [Phase 02]: Saved-map rows consume a `SavedMapSummary` projection; a period label is only
  ever resolved through `SNAPSHOT_CATALOG`, so a deferred snapshot cannot be named from a
  stored record.
- [Phase 02]: The dirty-load gate uses a separate colors baseline in `App`, set only by an
  explicit save or load — nothing new enters colors-only undo history.
- [Phase 02 descope]: Ship Modern-only. The historical engine, validation, and
  approval-aware promotion path are retained and tested so deferred snapshots drop in with
  no rework. The evidence bar is **not** relaxed — delivery is deferred, not approved.
- [Phase 02 process]: Executor self-reported checkpoints are not trusted for integration.
  Every stack gets an independent non-author review of the aggregate diff. This has caught
  four real defects across two rounds.

### Pending Todos

- Execute `02-24`, then `02-26`/`02-36`, `02-27`.
- Diagnose the intermittent `historicalPreparationCli` failures before treating `npm test`
  as a reliable `02-27` gate (see phase `deferred-items.md`). Reproduced again at `02-30`:
  three isolated runs gave 1 failure, 2 failures, then 28/28.
- `02-24`/`02-27` should adopt `tests/e2e/support/appHarness.ts` instead of re-declaring the
  camera helpers; `persistence.spec.ts` and `phase2-composition.spec.ts` still hold local copies.
- Re-run the Edge project before `02-27` — it was last run at `02-21` (48/48) and has not
  seen the extracted export transaction.
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

Last session: 2026-07-25T23:10:00.000Z
Stopped at: `02-23` complete (composition-root guards + integrated transaction E2E)
Resume file: [`.continue-here.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/.continue-here.md)
