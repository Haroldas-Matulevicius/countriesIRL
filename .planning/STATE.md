---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: executing
stopped_at: "Phase 4 PLANNED 2026-08-06 -- 16 plans across 13 waves, tracer-first, in .planning/phases/04-visual-cartographic-system-1-5-2-weeks/. NOTHING IS BUILT: planning ran research -> UI-SPEC (verified 6/6) -> pattern map -> planner -> plan-checker, which returned ZERO BLOCKERS plus 3 warnings that were folded in (c2b45c3). No code was written and no gate was executed -- the plans are a contract, not a result. FIVE THINGS MUST CARRY INTO EXECUTION. (1) SIX owner decision-gates and TWO human-verify gates are autonomous:false and WILL STOP the run -- D4-02, D4-10, D4-11, D4-17, the water-preset list + Map-style undo semantics, and the text-tool home + the one-ink deviation; plus human-verify for G-1 (04-13) and the eight physical checks (04-16). Each resume-signal must record WHICH KIND of authorization was given; a blanket sight-unseen pre-authorization authorizes proceeding and is NOT a content review and NOT hash-bound. (2) THREE one-way decisions: D4-10 moves selectable core 195 -> 207, and D4-11/D4-17 delete legend box chrome so SAVED COMPOSITIONS CHANGE APPEARANCE ON LOAD. (3) Coverage is tracked against CONTEXT decisions D4-01..D4-18 (18/18, verified independently twice) because Phase 4 has NO REQ-IDs mapped -- a mapping gap, not dropped scope. (4) The decision-coverage gate DID NOT PASS, it COULD NOT RUN: check.decision-coverage-plan returned could-not-parse because its extractor expects D-NN and this phase uses D4-NN. It is recorded as INCONCLUSIVE, never as passed. The spec-less probe fallback was likewise VISIBLY SKIPPED for having no requirement IDs. (5) Two blocking findings the ROADMAP did not contain, both measured this session and both now absorbed: sanitizeExportClone hard-sets stroke #000000/0.75 on every country path in the export clone (export.ts ~334-356), so QUIET COASTLINES ARE IMPOSSIBLE IN THE PNG until it is REPLACED (not deleted); and --map-surface contributes ZERO pixels to the export because host CSS is invisible to the clone, so water must become a serialized <rect>. Also: ROADMAP 04-05 is factually wrong (CD-11) -- a mesh segment belongs to two countries and cannot carry per-country hover/selected state; 04-09 owns the amendment. And the UNTRACKED .planning/debug/kosovo-renders-white-uncolorable.md concludes the OPPOSITE of D4-10 and is stale; 04-03 owns annotating it. Prior position unchanged: Phase 3 COMPLETE 2026-08-06, closed by the owner on a free exploration with the structured UAT SKIPPED -- nine of twelve cells were NOT PERFORMED (no screen-reader, touch-target, 200% zoom, latin-ext export, or dark-theme review exists) and none may be cited as verified. G-3/G-1/G-2 are now owned by 04-07/04-12/04-14 respectively. Phase 2's two owner gates remain UNTOUCHED and OPEN (02-25, 02-28). Historical snapshots 1492/1700/1815/1914 remain DEFERRED for missing rights-cleared archival source material; no sign-off can unblock them. Next action: /gsd-execute-phase 4 -- expect it to stop at the first owner gate."
last_updated: "2026-08-07T00:30:00.000Z"
last_activity: "2026-08-06 -- Phase 4 PLANNED end to end (research -> UI-SPEC -> patterns -> 16 plans -> check). Research measured the rasterisation envelope in installed Chrome and found the two facts that reshape the phase: sanitizeExportClone hard-sets a black 0.75 stroke on every country path in the export clone, and --map-surface contributes zero PNG pixels. It also measured mapshaper -innerlines (327 LineStrings, 366,767 B, deterministic) and found the mesh INSENSITIVE to feature properties, which breaks the naive bind-mesh-hash-to-polygon-hash plan. UI-SPEC verified 6/6 by an independent checker that re-derived the load-bearing arithmetic against the repo; three non-blocking corrections applied. It authored 14 [ASSUMED] rows because the owner was unavailable -- U-6 (one composition ink #111827) KNOWINGLY DEPARTS from the owner-supplied Eurostat reference and most deserves the owner's eye. It also found that useMapState history is COLOURS-ONLY, so Undo after a Map-style change silently undoes the last COLOUR change, and that the UI-SPEC specifies text-tool controls but assigns them no panel. The assumption-delta detector FIRED; resolved as PROMOTE -- {rampId, t} becomes the primary colour identity through one resolveColorValue chokepoint with hex demoted to a union variant, gated by an owner checkpoint that can flip it back. The planner self-caught two negative-grep gates its own text made unpassable. The plan-checker returned ZERO BLOCKERS and independently re-verified wave integrity, the 195->207 e2e ordering, lift-block fidelity (18 truths byte-compared, 5 flat-scalar backstops, 5 unresolved), and every honesty constraint; its 3 warnings -- a stale analog path, a grep -c count asserting an ordering it could not fail on, and one plan missing the REQ-ID substitution note -- were folded in rather than routed through a revision cycle. Prior activity: 2026-08-06 -- Phase 4 context gathered (04-CONTEXT.md + 04-DISCUSSION-LOG.md), 18 decisions across all eight gray areas."
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 86
  completed_plans: 70
  percent: 81
---

# State: CountriesIRL Map Generator

> **Status (2026-08-06):** Phase 4 — **EXECUTING · 3/16 plans.** Waves 1–2 done.
> `04-01` (tracer) proved water colour reaches real exported PNG pixels through a serialized
> `rect[data-layer="surface"]`. `04-02` added the ramp data model and **substituted a palette
> rather than loosening a gate** — ColorBrewer's `#3182BD` cannot carry either ink at AA.
> **`04-03` landed the first one-way decision (`D4-10`):** the twelve neutral units are colourable,
> `coreStateCount` stays **195** and factually true with `selectableCount: 207` alongside it. The
> manifest hash chain was **re-derived, not waived**. **No geometry promoted, no snapshot added, no
> rights/factual/topology approval implicated.**
> ⚠️ **Running under a blanket, in-advance, sight-unseen proceed-authorization**
> ([`04-AUTHORIZATION.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-AUTHORIZATION.md)).
> It **authorizes proceeding**; it is **not a content review** and it is **not hash-bound.**
> The orchestrator takes the **6 decision gates** and records each option id and its reasoning.
> The **2 human-verify gates are proceeded past, never passed** — `04-13` leaves `OQ-3`/`OQ-5`
> OPEN, and `04-16`'s **eight physical checks are recorded `NOT PERFORMED`** unless a human
> performs them. **Writing PASS into a cell nobody executed would be fabricating evidence.**
> **3 decisions are one-way** — D4-10 (selectable core 195 → 207) and
> D4-11/D4-17, which delete legend box chrome so **saved compositions change appearance on load**.
> **Three corrections `04-01` landed against the plans' own text:** a prescribed RED probe
> **could not go red** (replaced with one on the real subject); the spec's `0.216` luminance floor
> is **too permissive** and ships as `0.2164`; and the rail-height floor is **552px, not 540px** —
> **`OQ-2` is open and worse than the spec assumed**, and Phase 5's `05-05` Data HUD would add an
> eighth row (~600px).
> ⚠️ **The decision-coverage gate did not pass — it could not run** (`could-not-parse`: it expects
> `D-NN`, this phase uses `D4-NN`). Recorded **inconclusive**, never as passed; coverage was
> established independently instead, 18/18.
> **Phase 3's three follow-ups now have owners:** `G-3` colors panel → `04-07` · `G-1` legend
> position → `04-12` · `G-2` saved-composition export → `04-14`.
> ⚠️ **Phase 3's UAT remains SKIPPED, not passed.** Nine of twelve cells were never performed —
> **no screen-reader pass, no touch-target check, no physical 200% zoom, no latin-ext export, and
> no dedicated dark-theme review** exists. Never report or cite them as verified.
> ▶ **Next: `/gsd-execute-phase 4`** — expect it to stop at the first owner gate.
> Phase 2 remains engineering-complete at `fe5f946` with **two owner gates still OPEN**;
> Phase 3 execution left its directory byte-unchanged. Historical snapshots stay **deferred**
> because the rights-cleared archival source material does not exist — missing *material*, not
> missing approval, and no sign-off can unblock it. The historical *engine* ships and is tested.
> **Pointers:** [`ROADMAP.md`](ROADMAP.md) (**Progress table is canonical for status and
> counts**) · [`coding-rules/general.md`](coding-rules/general.md) (**live invariants +
> immutable safety constraints**) · [`../Design.md`](../Design.md) (design contract) ·
> [`MILESTONES.md`](MILESTONES.md) · [`ARCHIVES.md`](ARCHIVES.md).

## Project Reference

- **Core value:** help non-technical Instagram creators produce accurate, polished choropleth
  maps quickly.
- **PROJECT.md last touched:** 2026-07-21.
- **Stack:** React 18 + strict TypeScript + Vite; D3 v7 SVG; `motion` 12.40.0 exact-pinned;
  **no third-party export library** — `src/utils/export.ts` owns the SVG→PNG path (`html2canvas`
  removed by 03-11, D-34); localStorage behind a storage-adapter interface.
  Vitest (node environment, no DOM) + Playwright (**installed Chrome only — Edge is NOT installed
  on this machine and is NOT certified**).
  **Browser-only, localhost-only — no backend, auth, or deployment exists or is claimed.**
  The editor is **mountable** behind an explicit props boundary for a future Themely transition:
  seam only, **nothing embedded**, and embedding requires new explicit owner authorization.

## Current Position

Phase: **04** (Visual & Cartographic System) — **PLANNED 2026-08-06 · 0/16 plans · nothing built.**

Planning ran end-to-end: research → UI-SPEC (verified 6/6) → pattern map → 16 plans across
13 waves, **tracer-first** → plan-checker. **Plan-checker returned 0 BLOCKERS**, 3 warnings, all
three folded in before close (`c2b45c3`). **No code was written and no gate was executed** — the
16 plans are a contract, not a result.

**Read before executing:**

| | |
|---|---|
| **6 owner decision-gates + 2 human-verify gates** are `autonomous: false` and **will stop execution.** | D4-02 · D4-10 · D4-11 · D4-17 · water-preset list + Map-style undo semantics · text-tool home + the one-ink deviation; plus `checkpoint:human-verify` for G-1 resolution (`04-13`) and the eight physical checks (`04-16`). Each resume-signal must record **which kind** of authorization was given — a blanket sight-unseen pre-authorization authorizes *proceeding*; it is **not** a content review and **not** hash-bound. |
| **3 one-way decisions** | **D4-10** (twelve neutral units become colourable; selectable core 195 → 207) · **D4-11** and **D4-17** (legend box chrome deleted from `LegendState`; V2 maps adopt the new look, so **saved compositions change appearance on load**). |
| **Coverage is tracked against decisions, not REQ-IDs** | Phase 4 has **no REQ-IDs mapped in ROADMAP.md** (`phase_req_ids` is null; there is no `04-SPEC.md`). All **18/18** `04-CONTEXT.md` decisions D4-01…D4-18 are covered, verified independently twice (orchestrator frontmatter union + plan-checker). This is a **mapping gap, not dropped scope.** |
| ⚠️ **The decision-coverage gate did NOT pass — it could not run** | `check.decision-coverage-plan` returned `could-not-parse`: its extractor expects `D-NN` bullets and this phase uses `D4-NN`. **It is recorded as inconclusive, not as passed.** Coverage was established by the two independent means above instead. `/gsd-verify-work` may re-surface this. |
| ⚠️ **The spec-less probe fallback was visibly skipped** | No requirement IDs to derive edge predicates from. No probe-derived predicates were generated. Recorded, not silent. |

**Two blocking technical findings that the ROADMAP's plan descriptions did not contain** (both
measured this session, both now absorbed into plans): `sanitizeExportClone` hard-sets
`stroke: #000000; stroke-width: 0.75` on every country path in the export clone
(`src/utils/export.ts` ~:334-356), so **quiet coastlines are impossible in the PNG until it is
replaced — not deleted**; and **`--map-surface` contributes zero pixels to the export** (host CSS is
invisible to the clone), so water must become a serialized `<rect>`.

**`ROADMAP.md 04-05` is factually wrong and needs amendment** (CD-11): hover/selected weight cannot
be "re-expressed on the interior mesh" — a mesh segment belongs to **two** countries and cannot
carry per-country state. `04-09` owns the amendment.

**An untracked file contradicts a locked decision:**
`.planning/debug/kosovo-renders-white-uncolorable.md` concludes the opposite of D4-10 (*"which is
correct and must not be changed"*) and is itself stale. `04-03` owns annotating or resolving it.

▶ **Next: `/gsd-execute-phase 4`.** Expect it to stop at the first owner gate.

---

### Prior position (retained)

Phase: **03** (Clean UI Overhaul) — **COMPLETE 2026-08-06 · 12/12 plans.**
Gate at close: lint clean · **637/637** unit · build clean · **Chrome e2e 103/103** ·
`data:world:check` PASS. **Chrome 151.0.7922.75 only; Edge not installed, not certified.**
Automated verification closed at `human_needed`, 18/19 must-haves; the owner then closed the phase
on a free exploration rather than working the structured UAT.

**What the owner actually verified — and what nobody did:**

| | |
|---|---|
| ✅ **Verified by a human** | The running editor was opened, explored, and judged good enough to ship. Nothing appeared broken relative to the pre-restyle build. This is a real verdict on the phase-goal predicate. |
| ⛔ **Never performed** | Screen-reader pass · touch targets · physical 200% zoom · latin-ext diacritic export · dedicated dark-theme review · dedicated exported-PNG inspection · `Design.md` § 7 review · D-5 ≥1200px confirmation. **Nine cells, recorded as `skipped`. Skipped is not passed — do not cite them.** |

**Three open follow-ups, deferred by owner choice rather than resolved:**

| # | Item | Note |
|---|---|---|
| **G-3** | **The colors panel needs heavy work** — *"too squished, not organized well, hate the multi boxes within"* | **The largest open item; a design rework, not a tweak.** The `colors` flyout (second column) was migrated into the 280px panel by 03-07 without a layout redesign for the narrower column. Three separable complaints: density, information architecture, and nested bordered boxes — the last is arguably already **off-contract**, since 03-04 moved the system to flat hairline elevation. Start at `ColorPicker.tsx` + `src/styles/controls/colorPicker.css` inside `ToolPanel.tsx`; the legend and countries panels use the card-row/option-pill vocabulary the owner did **not** complain about, so they are the working reference. Panel chrome stays **out** of export membership — not D-25, must not move exported pixels. |
| **G-1** | **The legend sits too high** | Legend geometry is *inside* the exported PNG, so fixing it **moves exported pixels** — D-25 territory, needing deliberate itemised fixture re-baselining. Start at `resolveLegendPosition` / `resolveLegendRender` in `src/utils/legend.ts` (the only readers of legend position) or `LegendOverlay.tsx`'s placement math. |
| **G-2** | **Saved-composition export break, untested** | A pre-restyle saved map with a 15–32 char label should load cleanly then refuse to export. Owner had no such map; no automated test covers it either. Cheapest first move is a unit test constructing the stored record directly. |

**F-1 — the 14-char default legend-label export ceiling — ships ACCEPTED-AS-DEFERRED.** That is the
owner electing to live with it for now, **not** a finding that the bound is correct: the verifier's
three grounds against it stand unrebutted (worst-case-uniform derivation over-estimating line count
~1.8×; the saved-composition break; and the repo's own fixture shortened `'Imperial lands'` →
`'Empire lands'` to keep the suite green).

Full detail: [`03-UAT.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-UAT.md) ·
[`03-VERIFICATION.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-VERIFICATION.md) ·
[`03-12-REVIEW.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-REVIEW.md) ·
[v1.1 archive](milestones/v1.1/ROADMAP-ARCHIVE.md).

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

- 2026-08-06 — **Phase 3 COMPLETE** — 12/12 plans; 94 commits, 181 files, +39,234/−6,832.
  `html2canvas` removed and the SVG→PNG path owned outright; Themely token system with an explicit
  `.dark` toggle; editor made mountable behind a props boundary (seam only). Closed by the owner on
  a free exploration; **structured UAT skipped, 9 cells never performed.** Carry-forwards: **`G-3`
  colors panel needs heavy work (design rework)** · `G-1` legend too high · `G-2` saved-composition
  export break untested · `F-1` label ceiling accepted-as-deferred.
  → [archive](milestones/v1.1/ROADMAP-ARCHIVE.md#phase-3-clean-ui-overhaul-11-5-weeks)
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

### Decisions (Phase 3, closed)

**[Phase 3] (closed)** — per-plan decision detail (tokens, dark toggle, icon rail + flyout, motion
contract, mountable boundary, CSS split, owned SVG→PNG export, legend typography) collapsed →
[03 SUMMARYs](phases/03-clean-ui-overhaul-1-1-5-weeks/) +
[archive](milestones/v1.1/ROADMAP-ARCHIVE.md#phase-3-clean-ui-overhaul-11-5-weeks). Decisions that
became durable engineering contracts were promoted into `coding-rules/` (`export.md` rewritten for
the owned path; `frontend.md`, `storage.md`, `data.md` amended) and are not repeated here.

Kept as separate lines **only** because later phases depend on them:

- **D-34/D-34a — Phase 3 owns the SVG→PNG export path.** No third-party export library exists.
  Phase 4's gradient/text work must prove PNG bytes against *this* rasteriser, not html2canvas.
- **D-30 — dark mode is an explicit toggle.** **No `prefers-color-scheme` read anywhere**, not even
  to seed a first-run default. Enforced by a production-source gate.
- **Mountable boundary (03-05)** — `<MapEditor dataBasePath? storage? initialThemeMode? />`; storage
  is a *factory*, `MapEditor` names no host global (asserted as an empty set). All later phases must
  preserve this. **Embedding still requires new explicit owner authorization.**
- **A selector ceiling is a gate** (326 at close of 03-10); stylesheets are discovered by directory
  walk, and a new sheet must join both the directory and `main.tsx`'s asserted import order.
- **The vendored Inter subset is latin-only** — latin-ext diacritics fall back inside exported PNGs.
  Kept deliberately for Phase 3; widening is a v1.1 owner follow-up (~+113 KB base64 per export).
- **Assertion 24 can no longer fail on the single-token defect it advertises.** The export sandbox
  cuts every CSS route to exported pixels, so theme independence holds **by construction**. Documented
  in `coding-rules/export.md`; assertion 4 is the token contract's remaining guard.

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

**Filed by the Phase 4 context session (2026-08-06) — these three escape Phase 4's own boundary
and will not be fixed by executing it:**

- ⚠ **`ROADMAP.md` § Phase 5 `05-02` contradicts `D4-10`.** The roadmap says *"neutral units
  (Kosovo et al.) are reported as 'not colorable', not matched"*; the owner has decided all
  twelve `colorPolicy: "neutral"` units become colorable. **Amend the roadmap explicitly** —
  do not leave the two standing in silent disagreement. Also re-derives the
  `world-manifest.json` hash and moves the selectable-core-state count **195 → 207**.
  **No geometry is promoted and no rights/factual/topology approval is implicated** — this is a
  product-policy change on already-shipped, hash-verified Modern geometry, and must never later
  read as a bypassed approval.
- ⚠ **`03-UI-SPEC.md` needs annotating for `D4-05`.** Every flyout widens 280 → 360px. The spec
  is **approved and outranks `Design.md`**, so the amendment lands in the same commit as the
  width. This is the *second* known divergence in that doc — the wrong placement formula 03-08
  RED-proved is still unannotated (see below).
- ⚠ **Two one-way decisions land in Phase 4.** `D4-11` deletes `theme` / `backgroundOpacity` /
  `borderStyle` from `LegendState`, and `D4-17` has V2 maps adopt the new look — so **a saved
  composition changes appearance when reopened**, and its export will differ from a PNG the
  creator already posted. Accepted knowingly; recorded here because it is creator-visible.

- **`G-3` — the colors panel needs heavy work.** *"Too squished, not organized well, hate the multi
  boxes within."* **The biggest open item — a design rework, not a tweak**, and a strong candidate
  for its own plan rather than a drive-by fix. The nested-box complaint may already be off-contract
  against 03-04's flat hairline elevation.
- **`G-1` — the legend sits too high.** Deferred by choice, not resolved. Fixing it **moves exported
  pixels** (D-25 territory) and needs deliberate itemised fixture re-baselining.
- **`G-2` — the saved-composition export break is untested** by human or machine. A pre-restyle
  saved map with a 15–32 char label should load cleanly then refuse to export.
- **`F-1` — the 14-char default legend-label export ceiling ships accepted-as-deferred.** Revisit
  when convenient; the verifier's three grounds against the bound are unrebutted.
- **Nine UAT cells were never performed** (screen reader, touch targets, physical 200% zoom,
  latin-ext export, dark-theme review, exported-PNG inspection, `Design.md` § 7, D-5 ≥1200px).
  Recorded as `skipped`. **If any later phase needs one of these, it must be performed then — it
  cannot be inherited from Phase 3.**
- **Two todos filed by `03-12` that it could not write itself** (STATE.md is orchestrator-held):
  the Phase 2 Edge-record contradiction (below — **annotate, never rewrite**), and the OPEN ITEM 4
  residual (the storage validator still admits all five snapshot ids; **only presentation is
  filtered** — also below).
- **v1.1 milestone entry.** The v1.1 archive now exists
  ([`milestones/v1.1/ROADMAP-ARCHIVE.md`](milestones/v1.1/ROADMAP-ARCHIVE.md)); add the **v1.1 —
  Clean Studio & Data-Driven Maps** entry to `MILESTONES.md` with its "Phases:" line and
  "Last phase number" footer when v1.0 closes.
- **`Design.md` § 7 is `[FOR REVIEW]` and has never been reviewed** — 11 discretion items tabled in
  `03-02-SUMMARY.md`, plus 03-04's edits to §§ 2, 6, 7.5, 7.6, 7.10.
- **The approved `03-UI-SPEC.md` carries a wrong placement formula.** `inset-inline-end:
  max(--space-lg, gutter + --space-sm)` lands the floating cluster *inside* the frame corner at
  every aspect ratio — RED-proved by 03-08, which shipped a corner anchor instead and recorded the
  reason in `coding-rules/frontend.md`. **The approved spec doc itself was not edited** — decide
  whether to annotate it.
- **D-5 is not closed at ≥1200px** — the desktop rail needs ~492px of height with no scroll
  container. Closed below 1200px (`640×400` is back in `GUTTER_VIEWPORTS`, assertion 12 green).
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
  as passed.** **Edge is NOT installed on this machine**, so no Edge result can be produced. Phase 3
  acceptance is scoped to **installed Chrome 151.0.7922.75** and says so (D-33). Phase 1/2 evidence
  recording "Chrome 150 + Edge 150" is **immutable — annotate, never rewrite** — and until the
  contradiction below is explained, **no phase may cite it**.
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

- **Last session:** 2026-08-06 — **Phase 4 context gathered.**
  [`04-CONTEXT.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-CONTEXT.md) +
  [`04-DISCUSSION-LOG.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-DISCUSSION-LOG.md).
  All eight offered gray areas discussed; **18 decisions (`D4-01`–`D4-18`)**, four loose ends
  deliberately left as open questions. **Three items escape Phase 4's own boundary and are
  listed under Pending Todos: the `05-02` roadmap contradiction (D4-10), the `03-UI-SPEC.md`
  flyout-width amendment (D4-05), and the two one-way persistence decisions (D4-11, D4-17).**
- **Previous session:** 2026-08-06 — **Phase 3 executed end to end and closed at code level.** Twelve
  sequential waves, one executor per plan, run autonomously under a blanket proceed-authorization
  while the owner slept. Then independent non-author review
  ([`03-12-REVIEW.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-REVIEW.md)) and goal-backward
  verification ([`03-VERIFICATION.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-VERIFICATION.md)),
  both of which **re-ran every gate rather than copying numbers**, then this close-out.
- **Previous session:** 2026-08-06 — Phase 3 planned end to end (research → ui-phase → plan-phase;
  planning docs only). Before that: Phase 3 context gathering (`d3d9a35`), and the 2026-07-26
  documentation reorganization pass.
- **Stopped at:** Phase 4 **context gathered, not planned.** ▶ `/gsd-plan-phase 4` is the next
  step. Phase 3 remains **SHIPPED (code level), physically unverified** — `03-UAT.md`'s nine
  unperformed cells are still unperformed and cannot be inherited. Phase 2 remains
  engineering-complete at `fe5f946` with both owner gates untouched and still OPEN.
- **Resume file:**
  [`04-CONTEXT.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-CONTEXT.md) for Phase 4.
  This file plus `03-UAT.md` still carry the Phase 3 position. The Phase 2 `.continue-here.md`
  remains for Phase 2 resumption only. `HANDOFF.json` was deleted on 2026-07-26.
