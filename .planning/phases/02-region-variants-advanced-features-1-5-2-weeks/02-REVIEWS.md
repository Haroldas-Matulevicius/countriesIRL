---
phase: 2
reviewers: [codex-sol-5.6, fable]
reviewed_at: 2026-07-24T07:40:13-05:00
plans_reviewed: [02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md, 02-04-PLAN.md, 02-05-PLAN.md, 02-06-PLAN.md, 02-07-PLAN.md, 02-08-PLAN.md, 02-09-PLAN.md, 02-10-PLAN.md, 02-11-PLAN.md, 02-12-PLAN.md, 02-13-PLAN.md, 02-14-PLAN.md, 02-15-PLAN.md, 02-16-PLAN.md, 02-17-PLAN.md, 02-18-PLAN.md, 02-19-PLAN.md, 02-20-PLAN.md, 02-21-PLAN.md, 02-22-PLAN.md, 02-23-PLAN.md, 02-24-PLAN.md, 02-25-PLAN.md, 02-26-PLAN.md, 02-27-PLAN.md, 02-28-PLAN.md]
---

# Cross-AI Plan Review — Phase 2

## Codex Sol 5.6 Review

## Summary

The Phase 2 architecture is strong and the 14-wave dependency graph has no obvious backward dependency or same-wave file-ownership collision. However, the plans are not currently executable end-to-end: the browser suite retains an obsolete 57-path assertion, the immutable gate does not verify a clean exact commit, and the export-freeze lifecycle neither settles nor releases camera state. The two prior warnings are also valid. Several historical-review and validation claims need tightening before execution.

## Strengths

- D-01–D-29 are substantially represented across the plans; no separate region-mode implementation has leaked back into scope.
- The fixed Mercator, semantic camera, transform-only wrapping, nearest-copy Locate, and one-logical-country model form a coherent geometry architecture.
- The 195-core/248-unit manifest, explicit parent/neutral policy, source hashes, and runtime validation avoid name-based political inference.
- Historical assets are kept out of the production catalog until separate promotion, with six-region coverage and modern fallback explicitly modeled.
- V2 persistence preserves the existing single-writer, max-10, partial-recovery, explicit-save migration model.
- The UI contract is unusually precise about copy, responsive ownership, accessibility preferences, restrained glass, and export-safe SVG styling.
- The coding-rule proposal/approval mechanism is appropriately hash-bound, and proposed commits use allowed Conventional Commit types.
- Historical accuracy, physical pinch, screen-reader quality, and visual export parity are correctly recognized as genuinely human-only checks.

## Concerns

- **HIGH — Obsolete Phase 1 E2E test cannot survive the world cutover.** Affected: [02-01-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-01-PLAN.md), [02-07-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-07-PLAN.md), [02-27-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-PLAN.md). Plan 02-01 permanently asserts 57 paths, while Phase 2 must render 195 logical states and 248 units. Plan 02-27 says to add tests, not retire or replace that assertion, so `npm run test:e2e` cannot finish green. **Fix:** give Plan 02-07 ownership of the E2E file and explicitly replace the runtime 57-path smoke after the world cutover with a 195-logical-state/248-unit world baseline. Preserve the original Phase 1 result in Plan 02-01’s commit and summary.

- **HIGH — Browser validation contradicts the declared Node-only Vitest architecture and Nyquist sampling contract.** Affected: [02-PATTERNS.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-PATTERNS.md), [02-VALIDATION.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-VALIDATION.md), Plans 02-07–02-11, 02-18, 02-20–02-24, and 02-27. P14 correctly says Node Vitest proves pure logic/SSR while Playwright owns focus, gestures, drag, downloads, and responsive behavior. Nevertheless, component tasks claim DOM focus, outside-click, pointer propagation, drag, and focus-trap acceptance from Node tests, and no feature Playwright tests run until Plan 02-27. **Fix:** add focused Chrome Playwright slices to the owning camera/navigation, Locate, legend, history, persistence, export, and responsive plans; keep Vitest acceptance limited to pure helpers and static semantics. Plan 02-27 should aggregate both browsers. Define NFR3’s measurement boundaries and require multiple warm samples rather than one unspecified timing observation.

- **HIGH — The “immutable” final gate does not prove an exact clean commit.** Affected: [02-27-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-PLAN.md). It runs in the current worktree with existing `node_modules` and deliberately ignores all untracked files. An untracked imported fixture, source file, or configuration can influence tests while being absent from the recorded commit and a clean checkout. **Fix:** after Task 1’s E2E commit, record `HEAD`, create a detached temporary worktree for that SHA, run `npm ci` and the entire gate there, record the verified SHA, and safely remove the worktree. This should follow the accepted Phase 1 exact-commit pattern.

- **HIGH — Export freeze lacks both semantic settlement and release.** Affected: [02-02-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-02-PLAN.md), [02-07-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-07-PLAN.md), [02-21-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-21-PLAN.md), [02-23-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-23-PLAN.md). `freezeAndSnapshot` locks input and interrupts D3 transitions, but no plan explicitly commits the frozen mid-gesture camera to `CompositionState` or unlocks input afterward. Export during Locate/drag can therefore leave saves/remounts with stale camera state and the canvas permanently locked. **Fix:** define an idempotent export-freeze lease such as `{ camera, release() }`; settle the returned camera into the semantic owner synchronously before cloning; call `release()` from the outermost `finally` on every success/failure path. Test capture, blob, anchor-click, legend-block, and thrown-callback failures, followed by camera input, save, and responsive remount.

- **HIGH — “Historian-reviewed” promotion is not bound to durable reviewer evidence.** Affected: Plans [02-13 through 02-17](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-13-PLAN.md). A plain `approved 1492` resume signal recorded in a summary can promote an asset to `historian-reviewed` without a named qualified reviewer, per-region disposition, or hash-bound approval record. **Fix:** require a durable approval artifact per snapshot containing reviewer identity/role, review date, six independent region decisions, uncertainties, and the exact source/input/output/review hashes. Plan 02-17 must verify those artifacts and reject executor self-approval before changing catalog status.

- **MEDIUM — Manual tracing is incorrectly modeled as a deterministic extraction command.** Affected: Plans 02-12–02-17 and 02-27. A human trace from an atlas image cannot be recreated by an exact shell extraction command, and the plans do not list all local reference artifacts that `--check` may need. This can make curation or the final gate depend on missing files or live network access. **Fix:** distinguish deterministic vector extraction from manual tracing. For manual traces, hash the traced GeoJSON and its licensed evidence bundle, record the human procedure and approval, and make `--check` offline/non-mutating without pretending to regenerate the trace. List every required evidence artifact in plan ownership.

- **MEDIUM — The prior fatal-copy warning is confirmed.** Affected: [02-18-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-18-PLAN.md) and `src/components/FatalErrorState.tsx`. The current component says “Europe map,” but no plan owns that file. **Fix:** add it to Plan 02-18 Task 1 and assert the exact world heading/body/action in `MapWorkspace.test.tsx`.

- **MEDIUM — The prior Playwright-ignore warning is confirmed.** Affected: [02-01-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-01-PLAN.md), root `.gitignore`, and Plan 02-27. The root ignore file currently covers `dist` but not `test-results`, `playwright-report`, or another configured Playwright `outputDir`. **Fix:** add `.gitignore` to Plan 02-01 ownership, ignore every configured browser artifact directory, and verify each with `git check-ignore` before browser tests or the immutable gate.

- **MEDIUM — Historical-entity selectability is undefined at the critical integration boundary.** Affected: Plans 02-02, 02-10, 02-18, 02-23, and 02-27. D-22 says new historical entities start white, implying they may be colored, but the country browser/Locate set is exactly 195 modern states and the existing App validates map clicks through the modern lookup. An implementation can silently render historical polities that cannot be selected or colored. **Fix:** explicitly decide that curated historical entities are either selectable or neutral. If selectable, derive map-click validity from the effective scene while keeping search/Locate limited to the 195 core, bound persisted historical IDs, and add an E2E case that colors a newly introduced historical entity.

- **MEDIUM — Durable documentation updates omit authoritative stale files.** Affected: [CLAUDE.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/CLAUDE.md), `coding-rules/general.md`, Plans [02-25](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-25-PLAN.md) and [02-26](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-26-PLAN.md). CLAUDE.md still calls Phase 1 current and routes to the Europe asset; `general.md` still describes manual-only E2E, broader browser certification, and guaranteed localStorage. REQUIREMENTS still presents superseded period/region selectors without decision annotations. **Fix:** include CLAUDE.md and `general.md` in the exact proposal/approval patch and add reviewed supersession annotations to REQUIREMENTS for F2/F3/F7. Preserve historical text where appropriate rather than rewriting Phase 1 evidence.

- **MEDIUM — Storage limits are mostly post-parse.** Affected: [02-19-PLAN.md](/C:/Users/matul/ClaudeProjects/CountriesIRL/.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-19-PLAN.md). The plan bounds parsed records but does not require a raw serialized-length check or explicit object-depth/node budget before nested validation. A large or deeply nested attacker-edited value can consume substantial work before rejection. **Fix:** add a named raw-string limit before `JSON.parse`, then an iterative depth/node budget before detailed validation, with oversized and deeply nested FakeStorage tests.

- **LOW — Crossfade accessibility and wrapped-copy export wording remains ambiguous.** Affected: Plans 02-18 and 02-21 plus UI-SPEC §14. During a crossfade, both complete scene groups could expose options; during export, “remove duplicate accessibility copies” could be interpreted as deleting the visual repeat paths required for a Pacific view. **Fix:** explicitly make the outgoing group inaccessible/nonfocusable, and state that export retains every visible wrapped geometry path while stripping only roles, titles, tab stops, IDs, and nonvisual accessibility helpers.

## Suggestions

- Decouple Modern/fixture-based UI integration from factual asset completion so the world camera, legend, persistence, and export foundation can progress while historical review remains blocking for final promotion.
- Conduct the four historical approvals in one scheduled review session while retaining separate hash-bound decisions per snapshot and region.
- Give Plan 02-28 an exact preview command, fixed local port, process identifier, and cleanup instruction so its necessary human checkpoint is reproducible.

## Risk Assessment

**HIGH.** The core design is credible, but the current plan set contains multiple end-green and evidence-integrity blockers: an inevitably stale E2E assertion, a non-exact final gate, and an incomplete export-freeze lifecycle. Historical promotion also overstates the durability of its factual approval evidence.

## Review Verdict

**REPLAN** — retain the architecture and wave structure, but revise the affected tasks and validation map before Phase 2 execution.

---

## Fable Review

## Summary

The 28 plans have strong traceability and a mostly coherent 14-wave graph, but execution should not begin until several core transaction, historical-evidence, and exact-verification gaps are corrected. All 41 requirement IDs and D-01 through D-29 are represented, dependencies are acyclic, tasks are green-oriented, and there are no same-wave ownership collisions. The architecture should be retained and targeted plans revised.

## Strengths

- Complete formal coverage without reviving separate regional modes.
- Sound separation of color history, committed composition state, and high-frequency camera state.
- Coherent fixed-Mercator, semantic-camera, antimeridian-safe Locate, and one-logical-country architecture.
- Exact 195-state core / 248-unit world-data policy with explicit parent/neutral mappings and deterministic source validation.
- SVG-only legend with accessible placement alternatives and export-safe rendering.
- V1→V2 persistence migration preserves one storage writer, max-10 behavior, partial recovery, and explicit-save rewrite.
- Appropriate Vitest/Playwright/manual evidence tiers in principle.
- Exact patch/hash approval mechanism for coding-rule edits is strong.
- Deferred animation, video, cloud, deployment, claim-switching, markers, and insets remain out of scope.

## Concerns

### HIGH — Live-camera save/export transaction has no complete lifecycle

Affected: Plans 02-02, 02-07, 02-19, 02-21, 02-23.

`freezeAndSnapshot` locks input and interrupts transitions, but no release/resume operation is specified. Export can permanently disable drag/wheel/pinch/Locate/Reset. Saving during an active Locate or wheel sequence can serialize stale committed state rather than the visible camera.

**Fix:** Define a `CameraFreezeLease { camera, release(): void }` and a non-locking `readCurrentCamera()`. Settle the frozen camera into semantic ownership before clone/capture, release idempotently in the outermost `finally` on every path, and assemble saved compositions from the live snapshot. Test export success/failure followed by input, and save during animated Locate followed by load.

### HIGH — Historical entities have no selection/coloring contract

Affected: Plans 02-02, 02-07, 02-09, 02-10, 02-18, 02-27.

Plans assert exactly 195 accessible modern options while introducing historical entities with new IDs that start white. The plans never state whether these visible entities can be clicked, keyboard-selected, colored, persisted, or reconciled across period changes.

**Fix:** Lock an effective-scene selection policy. Keep country browser/Locate at the 195 core; allow approved historical entities with distinct IDs to participate in map click/keyboard selection and color history while active; keep dependency/disputed/neutral units non-selectable; reconcile selection on period change only for identities present in the new scene. Add tests for new/continuing entities, undo/redo, persistence, and legend derivation. If historical entities should be non-colorable, obtain an explicit user decision.

### HIGH — Historical approval is not bound to exact reviewed bytes

Affected: Plans 02-13 through 02-17.

A generic resume signal can promote assets without binding reviewer identity, date, six regional decisions, uncertainties, or source/input/output/review hashes.

**Fix:** Create a durable approval artifact per snapshot containing reviewer identity/role, date, six separate regional decisions (`poland`, `lithuania`, `hungary`, `balkans`, `iberia`, `scandinavia`), uncertainties, and exact hashes for source manifest, input, overlay, review JSON, and review HTML. Plan 02-17 must validate it against current bytes and reject executor self-approval; any changed byte invalidates approval.

### HIGH — Historical curation tasks are not verifiably executable within scope

Affected: Plans 02-13 through 02-16 and 02-RESEARCH.md.

Each plan combines source discovery, rights analysis, retrieval design, six-region cross-checking, possible tracing, normalization, and review despite research stating that no single unrestricted authoritative source is available. Wave 4 can block indefinitely.

**Fix:** Either pre-supply source-complete rights-approved inputs; split historical acquisition/promotion into a separately estimated phase; or add source/license gates per snapshot/region before geometry-generation plans. A stop-if-unavailable checkpoint is not delivery of F2/NFR8.

### HIGH — Final gate does not prove an exact committed revision

Affected: Plan 02-27.

Tracked diff checks with `--untracked-files=no` allow untracked product/test/data/config files to influence validation while being absent from the recorded commit.

**Fix:** After the E2E commit, create a detached clean worktree at exact HEAD, run `npm ci` and the full source/data/build/browser gate there, record the SHA, and bind Plan 02-28 to that same SHA. Do not copy dirty-workspace files into it.

### MEDIUM — World loading and fatal-error copy have no owner

Affected: Plan 02-18, `src/components/FatalErrorState.tsx`, `src/components/MapWorkspace.tsx`.

Current copy still says Europe. No plan owns `FatalErrorState.tsx` or explicitly tests loading/fatal world copy.

**Fix:** Add `FatalErrorState.tsx` to Plan 02-18 and assert exact `Loading world map…`, world fatal heading/body, `Reload Map`, and period-aware map label.

### MEDIUM — Final human approval is weakly recorded

Affected: Plan 02-28.

A generic `approved Phase 2` signal does not prove which hardware, browsers, assistive technology, viewport/preference routes, historical checks, and PNG inspections actually ran.

**Fix:** Require a fixed acceptance matrix in the summary with exact SHA, device/OS, browser versions, screen reader, viewport/preferences, PASS/FAIL/UNAVAILABLE per cell, PNG filenames/dimensions/hashes, atlas hashes, and observations. Mandatory cells must be PASS.

### MEDIUM — Root integration is too large for one task

Affected: Plan 02-23.

One task adds world loading, snapshot coordination, camera control, legend reconciliation, complete saves, dirty baselines, responsive remounts, export transactions, focus, and feedback to an already large `App.tsx`.

**Fix:** Add focused transaction hooks/utilities such as `useCompositionLoadTransaction`, `useCompositionSaveTransaction`, and `useCompositionExportTransaction`; keep App as composition root while testing ordering/cancellation/cleanup independently.

### LOW — Playwright artifact ignore behavior is not established

Affected: Plan 02-01, Plan 02-27, root `.gitignore`.

`test-results/` and `playwright-report/` are not ignored. Failed/interrupted runs can leave untracked browser artifacts.

**Fix:** Add exact ignore rules and `git check-ignore` tests, or configure output beneath an existing dedicated ignored root. Keep cleanup traps as a second layer.

## Suggestions

- Split E2E tests by domain while retaining one aggregate command.
- Clarify that export keeps visual wrapped geometry for Pacific views and strips only duplicate accessibility semantics.
- Add a pre-parse serialized-length limit to V2 localStorage validation.
- Use the exact patch/hash approval pattern for historical and final human evidence.

## Risk Assessment

**HIGH.** The architecture is sound, but camera lifecycle, historical-entity interaction, historical approval binding/source feasibility, and exact-commit verification can each invalidate a core outcome.

## Review Verdict

**REPLAN.** Retain the architecture and most decomposition, but revise Plans 02-02, 02-07, 02-13–02-19, 02-21, 02-23, 02-27, and 02-28 before execution.

---

## Consensus Summary

### Agreed Strengths

- **Coverage and scope discipline:** Both reviewers found complete or substantial coverage of the Phase 2 requirements and D-01–D-29 without reviving the superseded separate-region-mode design.
- **Architecture and dependency structure:** Both found the 14-wave graph coherent, acyclic, and free of obvious same-wave ownership collisions, and both recommended preserving the architecture rather than replacing it.
- **World-camera model:** Both supported the fixed-Mercator, semantic-camera, transform-only wrapping, nearest/antimeridian-safe Locate, and one-logical-country approach.
- **World-data policy:** Both supported the 195-state core / 248-unit manifest, explicit parent-or-neutral mappings, stable identity policy, and deterministic source validation.
- **State separation and persistence:** Both supported keeping color history distinct from camera/composition state and preserving the V1→V2 single-writer, max-10, partial-recovery, explicit-save migration model.
- **Evidence tiers:** Both supported the intended separation between automated logic/browser checks and genuinely human historical, physical-device, screen-reader, and visual-export checks, while finding execution gaps in the current allocation and recording.
- **Hash-bound approval pattern:** Both identified the exact patch/hash mechanism for coding-rule changes as a strength and treated that pattern as the appropriate evidence model for other approvals.

### Agreed Concerns

1. **HIGH — Camera freeze, save, and export lifecycle is incomplete.** Affected plans: 02-02, 02-07, 02-19, 02-21, 02-23. Both reviewers found that `freezeAndSnapshot` can lock camera input without a specified release and can leave the committed camera stale relative to the visible frame. Both require a lease/release lifecycle, semantic settlement before capture, live-camera save behavior, outermost-`finally` cleanup, and post-success/failure interaction tests.
2. **HIGH — The final gate does not prove an exact clean commit.** Affected plans: 02-27 and, for Fable’s acceptance binding, 02-28. Both reviewers found that ignoring untracked files while validating the current worktree allows files absent from the recorded commit to affect results. Both require validation from a detached clean worktree at exact `HEAD`, with `npm ci`, the complete gate, and the verified SHA recorded.
3. **HIGH — Historical approval/provenance is not bound to durable reviewed bytes.** Affected plans: 02-13 through 02-17. Both reviewers found that a generic approval signal is insufficient. Both require per-snapshot durable evidence containing qualified reviewer identity/role, date, six regional decisions, uncertainties, and exact hashes, with Plan 02-17 rejecting self-approval and stale bytes.
4. **HIGH/MEDIUM — Historical scope and source feasibility need stronger gates.** Affected plans: 02-12 through 02-17 and 02-27; Fable also cites 02-RESEARCH.md. Fable rates the combined acquisition, rights, tracing, normalization, and review workload HIGH and proposes pre-supplied inputs, a separately estimated phase, or source/license gates. Codex rates the manual-tracing/evidence problem MEDIUM and recommends decoupling fixture-based product integration from factual asset promotion while making checks offline and evidence-complete.
5. **HIGH/MEDIUM — Historical-entity selectability and coloring are undefined.** Affected plans across both reviews: 02-02, 02-07, 02-09, 02-10, 02-18, 02-23, 02-27. Fable rates this HIGH and Codex MEDIUM. Both found a contradiction between a 195-modern-state accessible/search set and newly introduced historical IDs that begin white, with no complete click, keyboard, color, history, persistence, or period-reconciliation contract.
6. **MEDIUM — FatalErrorState and world loading copy lack explicit ownership and tests.** Affected plan: 02-18. Both reviewers confirmed that the existing component still says “Europe” and that no task owns and verifies the exact world loading/fatal copy and recovery action.
7. **MEDIUM/LOW — Playwright artifact ignore behavior is missing.** Affected plans: 02-01, 02-27, and root `.gitignore`. Codex rates this MEDIUM and Fable LOW. Both require exact ignore rules for configured browser artifact directories and `git check-ignore` verification, with cleanup traps retained as a secondary measure.
8. **LOW — Wrapped-copy export and crossfade accessibility wording is ambiguous.** Affected plans: 02-18 and 02-21, plus UI-SPEC §14. Codex raises this as a LOW concern and Fable raises the wrapped-geometry portion as a suggestion. Both support retaining visible wrapped geometry needed for Pacific views while stripping duplicate accessibility semantics; Codex additionally requires the outgoing crossfade group to be inaccessible and nonfocusable.

### Reviewer-Specific Concerns

#### Codex Sol 5.6 only

- **HIGH — Obsolete 57-path E2E assertion:** Plans 02-01, 02-07, and 02-27 do not explicitly replace the Phase 1 runtime assertion with the 195-logical-state / 248-unit world baseline, so the aggregate browser suite cannot finish green after cutover.
- **HIGH — Playwright allocation and NFR3 measurement:** Plans 02-07–02-11, 02-18, 02-20–02-24, and 02-27 claim browser-only interaction acceptance from Node Vitest and postpone feature Playwright coverage until the end. Codex also requires explicit NFR3 measurement boundaries and multiple warm samples.
- **MEDIUM — Manual tracing model:** Plans 02-12–02-17 and 02-27 model human atlas tracing as if an exact extraction command could regenerate it, omit required local evidence ownership, and risk live-network or missing-file dependencies in `--check`.
- **MEDIUM — Stale authoritative documentation:** Plans 02-25 and 02-26 omit `CLAUDE.md`, `coding-rules/general.md`, and reviewed supersession annotations in REQUIREMENTS despite stale Phase 1/Europe and testing/storage claims.
- **MEDIUM — Storage pre-parse bounds:** Plan 02-19 lacks a raw serialized-length check and iterative object depth/node budget before detailed V2 validation.

#### Fable only

- **MEDIUM — Final acceptance matrix:** Plan 02-28 records a generic approval rather than a fixed matrix tied to the exact SHA, hardware, OS, browser versions, screen reader, viewport/preferences, PNG files/dimensions/hashes, atlas hashes, and PASS/FAIL/UNAVAILABLE results.
- **MEDIUM — Root orchestration size:** Plan 02-23 places world loading, snapshots, camera, legend, saves, dirty state, responsive remounts, export, focus, and feedback into one large `App.tsx` task rather than focused, independently testable transaction hooks/utilities.

### Divergent Views

- **Historical delivery strategy:** Fable treats historical curation feasibility as a HIGH scope blocker and explicitly allows splitting acquisition/promotion into a separately estimated phase. Codex recommends retaining progress on the Modern and fixture-based foundation while historical review remains a final-promotion blocker, and separately tightens manual-trace evidence. Both agree stronger source, license, review, and hash gates are required; they differ on whether historical work should be split or retained behind those gates.
- **Historical-entity severity:** Fable rates the missing selection/coloring contract HIGH; Codex rates it MEDIUM. Both require an explicit effective-scene policy and tests.
- **Playwright artifact severity:** Codex rates missing ignore rules MEDIUM; Fable rates them LOW. Both recommend exact ignore configuration and verification.
- **Browser-test decomposition:** Codex requires feature-level Playwright slices in the owning plans and treats the current allocation as HIGH. Fable states that the evidence tiers are appropriate in principle and suggests domain-split E2E while retaining one aggregate command, but does not raise the allocation as a separate concern.
- **Final human evidence detail:** Fable requires a fixed acceptance matrix as a MEDIUM correction. Codex asks for a reproducible preview command, port, process identifier, and cleanup instruction, but does not raise the matrix as a separate concern.

### Replanning Priority

1. **Repair the live-camera transaction contract across Plans 02-02, 02-07, 02-19, 02-21, and 02-23:** specify freeze/read/settle/release behavior, save from the live camera, idempotent outermost cleanup, and post-transaction interaction tests.
2. **Make browser validation executable throughout the plan set:** replace the obsolete 57-path assertion at world cutover, assign focused Playwright slices to their owning plans, keep Node Vitest claims within its stated limits, and define NFR3 sampling boundaries.
3. **Replace the final worktree check with exact-commit verification in Plan 02-27:** validate a detached clean worktree after `npm ci`, record the SHA, and bind subsequent human acceptance to that revision.
4. **Add historical source, license, tracing, and review gates before promotion in Plans 02-12–02-17:** require complete offline evidence ownership and hash-bound qualified approval; decide during replanning whether to split historical acquisition/promotion or retain it behind stronger source gates.
5. **Lock the historical-entity interaction contract across Plans 02-02, 02-07, 02-09, 02-10, 02-18, 02-23, and 02-27:** state whether new historical entities are selectable/colorable and cover keyboard, history, persistence, legend, and period reconciliation accordingly.
6. **Assign and verify world loading/fatal copy in Plan 02-18:** include `FatalErrorState.tsx` and exact loading, heading, body, action, and map-label assertions.
7. **Establish Playwright artifact hygiene in Plan 02-01 and the final gate:** ignore every configured output directory and prove the rules with `git check-ignore`.
8. **Strengthen persistence and root transaction boundaries:** add Plan 02-19 pre-parse size/depth/node limits and revise Plan 02-23 orchestration into focused, independently testable transactions as requested by the respective reviewers.
9. **Tighten final human evidence and reproducibility in Plan 02-28:** add Fable’s acceptance matrix and Codex’s exact preview command, port, process ownership, and cleanup details, all tied to the verified SHA.
10. **Complete remaining durable-documentation and accessibility wording corrections:** include the stale authoritative files identified by Codex and clarify that crossfade semantics are singular while all visually required wrapped geometry remains in export.

Both reviewers’ verdict is **REPLAN**. Preserve the accepted architecture and wave structure where possible, but treat every HIGH finding above, including reviewer-specific HIGH findings, as mandatory input to `--reviews` replanning.
