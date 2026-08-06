---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: executing
stopped_at: "Phase 3 is PLANNED and ready to execute: 12 plans (03-01..03-12), all gates clean -- decision coverage 36/36, all 28 UI-SPEC assertions bound, 0 unplanned source items. Four roadmap amendments landed by hand at 62b9f18. Phase 2's two owner gates are UNTOUCHED and still OPEN (02-25 documentation approval, blanket/sight-unseen/not hash-bound; 02-28 human acceptance matrix, bound to fe5f946 with every physical cell PENDING). Historical snapshots 1492/1700/1815/1914 remain DEFERRED for missing rights-cleared archival source material; no sign-off can unblock them. Next action: /gsd:execute-phase 3 -- OR hand 02-28 to the owner first if you want the matrix performed before the restyle. Phase 3 does not wait on either gate; D-31's tag on fe5f946 keeps the pre-restyle build reachable."
last_updated: "2026-08-06T12:00:00.000Z"
last_activity: "2026-08-06 -- Phase 3 PLANNED (docs only; no source, test, or script file touched). Ran research -> ui-phase -> plan-phase end to end. Artifacts: 03-RESEARCH.md (2f3f80d), 03-UI-SPEC.md approved with 28 RED-provable assertions (aeb951b, revised aa3e146), 12 PLAN.md files (5a3370b), and the four roadmap amendments landed BY HAND at 62b9f18. Six decisions were added during the run: D-30 rail-footer dark toggle with NO prefers-color-scheme read anywhere; D-31 annotated tag on fe5f946 so 02-28's build stays reachable; D-32 full-bleed surface with a centred 1:1 export frame; D-33 Chrome-only certification; D-34/D-34a html2canvas REMOVED and Phase 3 owns the SVG->PNG path with a generalised inline-font-embedding seam; D-35 re-arm the export-independence gate the dark-mode switch would otherwise silently disarm. Plan-checker found 2 blockers, both fixed: assertion 24 would have shipped RED-proven only against the retired html2canvas path, and two verify commands could never pass. Prior: 02-27 gate PASS at fe5f946; 02-28 PREPARED, not completed. Per-plan Phase 2 narrative lives in phases/02-.../02-ACTIVITY-LOG.md."
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 70
  completed_plans: 48
  percent: 83
---

# State: CountriesIRL Map Generator

> **Status (2026-07-26):** Phase 2 — **all engineering complete and gate-verified at
> `fe5f946`; two owner gates OPEN.** Historical snapshots are **deferred** because the
> rights-cleared archival source material does not exist — that is missing *material*, not
> missing approval, and no sign-off can unblock it. The historical *engine* ships and is
> tested. ▶ **Next: hand `02-28` (the physical acceptance matrix) to the owner.**
> **Pointers:** [`ROADMAP.md`](ROADMAP.md) (**Progress table is canonical for status and
> counts**) · [`coding-rules/general.md`](coding-rules/general.md) (**live invariants +
> immutable safety constraints**) · [`MILESTONES.md`](MILESTONES.md) ·
> [`ARCHIVES.md`](ARCHIVES.md) ·
> [`.continue-here.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/.continue-here.md)
> (session resumption).

## Project Reference

- **Core value:** help non-technical Instagram creators produce accurate, polished choropleth
  maps quickly.
- **PROJECT.md last touched:** 2026-07-21.
- **Stack:** React 18 + strict TypeScript + Vite; D3 v7 SVG; html2canvas; localStorage.
  Vitest (node environment, no DOM) + Playwright (installed Chrome + Edge).
  **Browser-only, localhost-only — no backend, auth, or deployment exists or is claimed.**

## Current Position

Phase: **03** (Clean UI Overhaul) — **PLANNED, ready to execute.** 12 plans (`03-01`…`03-12`),
decision coverage 36/36, all 28 UI-SPEC assertions bound, 0 unplanned source items. Four roadmap
amendments landed by hand (`62b9f18`). ▶ **Next: `/gsd:execute-phase 3`.**
Phase 3 does **not** wait on the Phase 2 owner gates — it must only avoid disturbing their
evidence, which D-31's annotated tag on `fe5f946` handles. Execute `03-01` and `03-11` in a
**fresh context** (largest plans, low estimate confidence).

Phase: **02** (Region Variants & Advanced Features) — EXECUTING; engineering done, owner-gated.
Plans: **26 of 36 complete · 8 deferred · 0 engineering remaining · 2 owner gates open.**
Verified SHA: **`fe5f946060707c48c3d9591d368b5f3f8f90dd4d`** — full gate PASS, evidence in
[`02-27-EXACT-COMMIT.json`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json).
Per-phase and per-group breakdown → [`ROADMAP.md`](ROADMAP.md) § Progress (canonical).

**Next action:** hand
[`02-28-ACCEPTANCE-MATRIX.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-28-ACCEPTANCE-MATRIX.md)
to the owner. It is bound to `fe5f946`, the automatable cells are pre-filled with cited
evidence, and **every physical cell is `PENDING`**.

### The two open owner gates

| Gate | State | Why it is still open |
|---|---|---|
| `02-25` — documentation approval | ⏳ **OPEN** | Both patches were produced and applied under a **blanket, in-advance, sight-unseen** authorization. Both patch hashes were computed *after* that authorization, so it is **not hash-bound**. Task 2 (full patch display + explicit per-hash approval) was never executed. Authorization to proceed exists; content review does not — which matters most for Patch B's unreviewed F3/F7 "satisfied differently" judgements. |
| `02-28` — human acceptance matrix | ⏳ **OPEN** | It records checks a human **physically performs** — touch, screen reader, visual. Its own resume-signal rejects a generic "approved" and forbids substituting automation for a physical claim. A blanket approval does not satisfy it. Writing PASS into a cell nobody executed would be fabricating evidence. |

## Critical Pitfalls

**The nine live invariants and the ten immutable safety constraints are canonical in
[`coding-rules/general.md`](coding-rules/general.md)** — read it before touching anything.
They are deliberately not restated here. The domain files hold the detail:

| Area | File |
|---|---|
| Types, naming, testing, git + planning-file safety | [`coding-rules/general.md`](coding-rules/general.md) |
| React / D3 / CSS / responsive / composition root | [`coding-rules/frontend.md`](coding-rules/frontend.md) |
| World asset, catalog, historical approval chain | [`coding-rules/data.md`](coding-rules/data.md) |
| PNG export, clone contract, refusal reasons | [`coding-rules/export.md`](coding-rules/export.md) |
| Bounded V2 persistence, migration, confirmations | [`coding-rules/storage.md`](coding-rules/storage.md) |

Two hazards worth naming here because they are *process*, not code:

- **Executor self-reported checkpoints are not trusted for integration.** Independent non-author
  review of the aggregate diff caught five real defects across three rounds on a single stack
  that the executor had already marked resolved. Keep the review step for every stack.
- **The gsd-sdk verbs `state.advance-plan`, `state.update-progress`, and
  `roadmap.update-plan-progress` corrupt this repo's tracking files** — they infer status from
  file presence. Edit `STATE.md` and `ROADMAP.md` by hand. Detail in
  [`coding-rules/general.md`](coding-rules/general.md) § Planning-file safety.

## Accumulated Context

### Roadmap Evolution (live window: 2026-07-25 onward)

Older entries → [`milestones/v1.0/ROADMAP-ARCHIVE.md`](milestones/v1.0/ROADMAP-ARCHIVE.md).
Per-plan chronology →
[`02-ACTIVITY-LOG.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/02-ACTIVITY-LOG.md)
and the `02-NN-SUMMARY.md` files. One line per event here.

- 2026-08-06 — **Pipeline restructured toward the classed-choropleth product vision.** The old
  Phase 3 "Polish & Launch" stub was replaced by Phases 3–6 (Clean UI Overhaul → Visual &
  Cartographic System → Data-Driven Maps → Polish & Launch), grouped as milestone **v1.1**;
  v1.0 closes at Phase 2 acceptance. Phase 1/2 records, counts, owner gates, and deferral
  language untouched. LLM data import and inset boxes recorded as explicit owner-gated
  decisions, not scheduled work.
- 2026-07-26 — **Documentation pass.** The invariants/constraints triplication across `STATE.md`,
  `HANDOFF.json`, and `.continue-here.md` was resolved: contracts moved to
  `coding-rules/general.md`, counts to the `ROADMAP.md` Progress table, resumption to
  `.continue-here.md`. `HANDOFF.json` deleted (a one-shot artifact, already consumed). Both
  `CLAUDE.md` rows pointing at files that never existed were removed.
- 2026-07-26 — **`02-28` prepared, not completed.** The acceptance matrix was rebound to
  `fe5f946` and the automatable cells pre-filled with cited evidence. It remains an OPEN gate.
- 2026-07-26 — **`02-27` complete + exact-commit gate PASS at `fe5f946`.**
  `tests/e2e/final-integration.spec.ts` measures a full creator journey on downloaded PNG bytes,
  with region-disjoint colour counting and an in-test blank-export discrimination control so
  neither claim can be satisfied tautologically. Four RED probes proven.
- 2026-07-26 — **`02-26` + `02-36` complete.** Both `02-25` patches applied mechanically via
  `git apply`, hash-verified before and re-derived after, so the tree holds exactly the approved
  bytes. Approval status recorded honestly: blanket, sight-unseen, not hash-bound.
- 2026-07-25 — **Phase 2 DESCOPED to Modern-only.** All four historical packets verified
  truthfully BLOCKED offline. `02-17` rescoped to Modern-only catalog verification; `02-18` to a
  catalog-driven selector; `F2.1`–`F2.5` annotated partially satisfied and **not** ticked.
- 2026-07-25 — **Doc architecture rebuilt** to the three-layer model (`ARCHIVES.md`,
  `MILESTONES.md`, `milestones/v1.0/` capsule). 59 Phase 1 decisions archived out of this file.
- 2026-07-25 — Wave 5 wiring stack independently reviewed **twice**; four real defects found that
  self-reported checkpoints had called resolved (stuck export gate, phantom cross-scene selection,
  deleted inspector landmark, legend overflow clipping the PNG).

### Decisions (Phase 2, recent)

Phase 1 decisions → [`milestones/v1.0/DECISIONS-ARCHIVE.md`](milestones/v1.0/DECISIONS-ARCHIVE.md)
(still binding — carried forward, not superseded). Decisions that became durable engineering
contracts have been promoted into `coding-rules/` and are not repeated here.

- **Descope:** ship Modern-only. The historical engine, validation, and approval-aware promotion
  path are retained and tested so deferred snapshots drop in with no rework. **The evidence bar is
  not relaxed — delivery is deferred, not approved.**
- **Process:** every stack gets an independent non-author review of the aggregate diff.
- Emulation a browser does not support is not evidence. `prefers-reduced-transparency` is asserted
  statically and left to `02-28`; the 200% zoom cell uses a halved CSS viewport **labelled as the
  equivalent**, never as physical zoom.
- The composition name is identity owned by the composition root, set only on a committed save or
  load; the export transaction receives it as an accessor and never holds it.
- A hook that owns a lock builds its transaction exactly once and reads options through a ref. A
  `useMemo`-rebuilt transaction carries a fresh unlocked activation flag.
- The export transaction does not re-validate source shape — `exportMapPng` already refuses
  disconnected, multi-SVG, and sibling-legend sources. A second copy of those rules is drift.
- Bound stored compositions before and after parse; migrate V1 in memory only. Saved-map rows
  consume a `SavedMapSummary` projection, and a period label resolves only through
  `SNAPSHOT_CATALOG` — so a deferred snapshot can never be named from a stored record.
- The dirty-load gate uses a separate colors baseline in `App`, set only by an explicit save or
  load; nothing new enters colors-only undo history.

### Pending Todos

- Hand `02-28` to the owner, bound to `fe5f946`.
- ~~**Land the three Phase 3 roadmap amendments**~~ **DONE 2026-08-06 (`62b9f18`), and there are
  now FOUR.** All landed by hand in `ROADMAP.md` § Phase 3: (1) dark mode in scope, `.dark`
  class-based; (2) HUD is an icon rail + flyout, not a collapsible column; (3) `motion` v12 +
  vendored lucide-animated icons enter the phase and the legend restyle **changes exported PNG
  pixels**; (4) **`html2canvas` is removed and Phase 3 owns the SVG→PNG export path** (D-34) — a
  plan the original breakdown did not contain at all. The phase is now **twelve** plans.
- ~~**Open Phase 3 sub-question** (what sets `.dark`)~~ **RESOLVED as D-30:** a neutral toggle
  pinned in the rail footer, persisted through the storage-adapter interface, with **no
  `prefers-color-scheme` read anywhere** — not even to seed a first-run default.

### Filed during Phase 3 planning — both need owner attention, neither is Phase 3 work

- ⚠ **The Edge certification record cannot be reproduced.** This file records "Chrome 71/71,
  Edge 71/71" at `fe5f946`, but **Microsoft Edge is not installed on this machine**
  (`/Applications` holds no `Microsoft*.app`; `~/Library/Caches/ms-playwright` holds only
  `ffmpeg-1011`), so the `msedge` Playwright project cannot launch. That record is **immutable
  Phase 2 evidence — annotate it, never rewrite it.** Until it is explained, **no phase may cite
  it.** Phase 3's `03-12` gate is scoped to Chrome and must state "Edge not certified — not
  installed" (D-33). Resolving this belongs to Phase 2's evidence, not to Phase 3.
- ⚠ **The storage validator still admits all five snapshot ids.** `storage.ts:61-63` builds
  `SNAPSHOT_IDS` from the full five-entry `SNAPSHOT_CATALOG` and the validator at `:483-484`
  admits any of them, so a **hand-crafted** localStorage record naming `1914` short-labels as
  `1914`. Phase 3 fixes this at the **presentation layer only** (an approved-id filter on
  `SaveLoad.tsx:132-137`, plus deleting the false comment at `:127-131`); the validator is
  deliberately untouched because changing it is a data-layer decision, not a chrome one. **This
  is pre-existing Phase 2 behavior, not a Phase 3 regression**, and reaching it requires editing
  localStorage by hand — but it sits adjacent to Immutable Safety Constraint 3, so it is recorded
  rather than absorbed.
- When v1.0 closes (both owner gates resolved), add the **v1.1 — Clean Studio & Data-Driven
  Maps** entry (Phases 3–6) to `MILESTONES.md` and update its "Phases:" line and
  "Last phase number" footer; the roadmap already carries the v1.1 structure (2026-08-06).
- ~~Diagnose the intermittent `historicalPreparationCli` failures.~~ **RESOLVED 2026-07-26**
  (commit `2f08050`). Root cause was not a flaky test: `fs.stat` was called without
  `{ bigint: true }`, truncating the NTFS 64-bit file ID to a JS double, so two distinct files
  could round to the same `dev:ino` and raise a false hard-link alias. Temp-dir churn recycles
  MFT records and drives the sequence number past 2^53, which is why it failed in bursts and
  then went quiet. Measured 191/800 false collisions as Number, 0/800 as BigInt. The fix
  strengthens the assertion — rounding could equally have masked a real alias. Rule recorded in
  [`coding-rules/data.md`](coding-rules/data.md) § Filesystem identity.
- `persistence.spec.ts` and `phase2-composition.spec.ts` still re-declare camera helpers instead of
  importing `tests/e2e/support/appHarness.ts`.
- Two stale temp worktrees predating the `02-27` gate run were left in place rather than removed.
- If hosting is ever requested, reopen deployment under new explicit authorization.

### Blockers / Concerns

- **Historical data — deferred, and not solvable by approval.** 1492 lacks Semkowicz-Romer scans,
  the CNIG 15094 product archive, and manual-trace operator records/control points/geometry. 1700
  lacks Karlowitz frontier demarcation and approved six-region geometry; 1815 and 1914 have the
  same class of gap. All four additionally need independent rights, factual, and topology review.
- **`02-28` cannot be delegated, automated, or blanket-approved.** A human must perform the touch,
  screen-reader, and visual checks.
- **Firefox, Safari, and previous-version certification are unverified and must never be reported
  as passed.** Acceptance is scoped to installed Chrome 150 + Edge 150.
- **Browser versions are not machine-recorded.** The `02-27` evidence JSON captures Node, npm,
  platform, and arch only; Chrome 150.0.7871.182 and Edge 150.0.4078.83 are recorded by hand in
  `02-27-SUMMARY.md` and must not be presented as machine evidence.
- **NFR3 timing threshold is an OPEN owner decision.** D-63 retired timing gates for **Phase 1
  only** — "the user explicitly directs that Phase 1 stop gating on millisecond timing" — and does
  **not** carry into Phase 2. Phase 2 asserts no threshold and records warm period-switch samples
  plus their median as advisory annotations in `tests/e2e/history.spec.ts`, so a threshold can be
  set from real numbers. **Do not cite D-63 to justify a Phase 2 timing decision.**
- No deployment, production URL, backend, or auth exists or is claimed.

## Session Continuity

- **Last session:** 2026-08-06 — **Phase 3 planned end to end** (research → ui-phase →
  plan-phase; planning docs only, no source/test/script file touched). See
  [`03-RESEARCH.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-RESEARCH.md),
  [`03-UI-SPEC.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-UI-SPEC.md), and
  `03-01-PLAN.md`…`03-12-PLAN.md`.
- **Previous session:** 2026-08-06 — Phase 3 context gathering. See
  [`03-CONTEXT.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-CONTEXT.md) and its
  [discussion log](phases/03-clean-ui-overhaul-1-1-5-weeks/03-DISCUSSION-LOG.md), committed at
  `d3d9a35`.
- **Previous session:** 2026-07-26 — documentation reorganization pass (planning docs only; no
  source, test, or script file touched).
- **Stopped at:** Phase 3 **planned and gate-clean**; `/gsd:execute-phase 3` is the next step.
  Phase 2 remains engineering-complete and gate-verified at `fe5f946` with `02-28` prepared and
  waiting on the owner. Both Phase 2 owner gates are untouched and still OPEN.
- **Resume file:**
  [`.continue-here.md`](phases/02-region-variants-advanced-features-1-5-2-weeks/.continue-here.md)
  — the only session-resumption artifact. `HANDOFF.json` was deleted on 2026-07-26; it was a
  one-shot handoff, already consumed, and had become a stale third copy of the contracts.
