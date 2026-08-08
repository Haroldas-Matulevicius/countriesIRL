---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: executing
stopped_at: "Phase 4 COMPLETE 2026-08-07 -- closed by the OWNER on a FREE EXPLORATION, exactly as Phase 3 was closed. The owner exercised PNG export, colours and ramp shading, the title field, and legend-entry renaming, and judged it good enough to ship. SIX of the eight acceptance cells were NEVER PERFORMED and are still NOT PERFORMED (A9 screen-reader, A10 physical 200% zoom, A11 dark-theme review, A12 latin-ext diacritic export, A13 the rail at >=1200px, cartographic resemblance). Cell 8 (PNG-vs-screen) PASSED on the owner's own comparison; cell 6 (G-3 rework) is PARTIAL ONLY -- the panel drew no complaint but the owner did not re-judge the three original complaints, so G-3 IS NOT RECORDED AS RESOLVED. SKIPPED IS NOT PASSED; the six may never be cited as verified, and A12 is specifically untouched by the F-6 fix below. The session found TWO defects. F-6: the title field refused text far too early ('28 is little'). CONFIRMED, ROOT-CAUSED, AND FIXED THIS SESSION -- the fit rule counted characters against a worst-case-uniform bound charging every character the advance of W, which roughly HALVED real capacity (a medium title got 22 characters while a 45-character title really renders at 970 of 1016 units), and it was ALSO NOT CONSERVATIVE because since 04-04's latin-ext face U+01F1 DZ is 1.3745em, 35% wider than W, so 22 of them sat ON the old bound while rendering 46% PAST the line. src/utils/interMetrics.ts now vendors REAL per-character advances plus a pair-kern table, measured by the SAME method that produced 1.0202 (installed Chrome, canvas measureText, vendored woff2; the harness reproduced W@600=1.0202 exactly). measureTextEm returns a PROVABLE UPPER BOUND. The kern table exists because the first attempt lacked one: a flat worst-pair margin (0.166em) was provably safe but too blunt and an E2E CAUGHT IT refusing 'W'.repeat(22), a title that genuinely measures 1008 of 1016 units. F-7: the legend bar is still slightly off and collides with the boxes -- OPEN, and it ANSWERS OQ-3 IN THE NEGATIVE, so G-1 is WORKED BUT NOT CLOSED. Full gate re-run after the fix: lint clean, 886/886 unit (47 files), build clean, 138/138 Playwright on Chrome 151.0.7922.76, data:world:check PASS (248 units, 195 core, 207 colourable, mesh 327/366,767 B), selector ceiling 337, ZERO new npm packages. The F-6 gates were RED-PROVED (4 red on the reverted rule, both directional ones among them) and the file restored by scratchpad copy-back with SHA-256 confirmed. Review findings F-1/F-2 (raw NUL bytes) were fixed at 9b88e67; F-3 (the void unquoted-grep proof of Live Invariant 3) and F-4 (stale config.json) were fixed this session at 6534ff0 -- the invariant itself was independently re-verified INTACT, all ten hits classified, none a render or export path. F-5 stays informational. STILL OPEN: U-6 UNREVIEWED (single composition ink #111827, the one knowing departure from the owner's Eurostat reference, an [ASSUMED] row and never an owner decision); OQ-1/OQ-2/OQ-4/OQ-5 (OQ-3 is now answered negatively by F-7); OQ-2 is the one that BLOCKS PHASE 5 PLANNING -- the rail floor is 552px, NOT the spec's 540px, and 05-05's Data HUD would add an eighth row at ~600px; F-1 (whether 14 is the right LEGEND label bound) still NOT validated, and the LEGEND still derives from the same worst-case model that F-6 replaced, so its 'a full line of the widest character cannot overflow' claim DOES NOT HOLD for latin-ext labels; storage headroom 48% -> 17%. Phase 2's two owner gates (02-25, 02-28) remain OPEN and UNTOUCHED; the Edge-record contradiction stays ANNOTATE-NEVER-REWRITE; historical snapshots stay DEFERRED for missing rights-cleared archival source material. Next action: decide OQ-2, then /gsd-plan-phase 5. SUPERSEDED PRIOR STATUS, kept for legibility: 'Phase 4 SHIPPED at code level and PHYSICALLY UNVERIFIED 2026-08-07 -- 16/16 plans, 80 commits, 141 files, +32,460/-2,327 across 0df7fff..HEAD. Gate at close, RE-RUN by an independent non-author review rather than copied: lint clean, 875/875 unit (47 files), build clean, 138/138 Playwright, data:world:check PASS (248 units, 195 core states, 207 colourable units, mesh 327 geometries / 366,767 B), selector ceiling 337. ZERO new npm packages, proven by a byte-level RANGE diff against phase-start SHA 0df7fff, RED-proved against a COMMITTED change. SIX THINGS MUST CARRY FORWARD. (1) ALL EIGHT PHYSICAL CHECKS ARE *NOT PERFORMED* -- A9 screen-reader, A10 physical 200% zoom, A11 dark-theme review, A12 latin-ext diacritic export, A13 the rail at >=1200px (D-5), the G-3 rework judgement, cartographic resemblance, PNG-vs-screen differences. Zero of eight. The phase ran under a BLANKET, IN-ADVANCE, SIGHT-UNSEEN PROCEED-AUTHORIZATION (04-AUTHORIZATION.md, written BEFORE execution): it authorizes proceeding, it is NOT a content review, and it is NOT hash-bound. It converted the two human-verify gates into PROCEEDING PAST them, never into a pass. None of the eight may cite a Phase 3 result -- every one is among Phase 3's nine never-performed cells. Writing PASS into a cell nobody executed would be fabricating evidence. (2) U-6 SHIPS UNREVIEWED -- 04-11 took ink-one (single composition ink #111827), the one place 04-UI-SPEC.md KNOWINGLY DEPARTS from the owner's Eurostat reference and the row its section 12 calls most worth the owner's eye. Forced by arithmetic: a second grey #4B5563 (L=0.0889) needs surface L>=0.575, near-white water only, retiring three of four shipped presets. An [ASSUMED] row, NEVER an owner decision. (3) FIVE REVIEW FINDINGS, NONE FIXED (a reviewer who fixes is no longer independent): F-1 medium, a raw NUL byte at compositionText.test.ts:139 makes git classify the file BINARY so all 333 lines were invisible in the aggregate diff and grep -I silently skips it; F-2 low, the same twice in storage.test.ts:1093,1136; F-3 medium, 04-13-SUMMARY.md:673-674 proves Live Invariant 3 with an UNQUOTED grep that under zsh never runs and, run correctly, returns ten hits (the invariant IS intact -- re-verified -- but the proof is void); F-4 low, CD-9 never assigned, .planning/config.json still says techStack.decided:false, phases:3, and lists html2canvas; F-5 informational, 04-15's supply-chain gate is faithful but compares four JSON objects, not bytes. (4) FIVE OPEN QUESTIONS ALL STILL OPEN. OQ-1 was PROCEEDED ON, not chosen. OQ-2/D-5: the rail floor is 552px, NOT the spec's 540px (measured by 04-01) and Phase 5's 05-05 Data HUD would add an eighth row (~600px) -- decide before planning Phase 5. OQ-3 (is G-1 resolved) and OQ-5 (mixed-map default, bar ships as the INFERRED default with an override) stay OPEN -- a shipped default is not an answered question. OQ-4 surfaces at Phase 5 planning. (5) THE DECISION-COVERAGE GATE DID NOT PASS, IT COULD NOT RUN (could-not-parse: expects D-NN, this phase uses D4-NN). Recorded INCONCLUSIVE, never as passed; coverage established independently three times, 18/18. The spec-less probe fallback was VISIBLY SKIPPED. (6) G-2 is CORRECTED, not merely closed -- 04-14 tested it for the first time by human or machine: a 15-char label refuses to export at the default MEDIUM size but the SAME label at SMALL loads and exports clean, so 03-UAT.md's '15-32 chars should refuse' is WRONG AS WRITTEN. 03-UAT.md is ANNOTATED, NEVER REWRITTEN. F-1 (whether 14 chars is the RIGHT bound) is still NOT validated. Also: storage headroom fell 48% -> 17% (4,134 nodes per worst-case V3 record, 41,331 of 50,000 for ten). Browser scope drifted mid-phase and BOTH are recorded: 04-01..04-06 on installed Chrome 151.0.7922.75, 04-07..04-15 and the review on .76. EDGE IS NOT INSTALLED and NOT certified; Firefox and Safari have never been run here. Phase 2's two owner gates (02-25, 02-28) remain OPEN and UNTOUCHED; the Edge-record contradiction stays ANNOTATE-NEVER-REWRITE; historical snapshots stay DEFERRED for missing rights-cleared archival source material -- missing MATERIAL, not missing approval, and no sign-off can unblock them. Next action: hand 04-ACCEPTANCE.md to the owner (the eight cells, and U-6 first), then /gsd-plan-phase 5.'"
last_updated: "2026-08-07T20:10:00.000Z"
last_activity: "2026-08-07 -- Phase 4 CLOSED BY THE OWNER on a free exploration, and the two defects it found were worked. The owner exercised PNG export, colours and ramp shading, the title field, and legend-entry renaming: 'everything seemed to work decently'. That closes the phase; it does NOT fill the cells -- six of eight remain NOT PERFORMED (A9, A10, A11, A12, A13, cartographic resemblance), cell 8 PASSED on the owner's own PNG-vs-screen comparison, and cell 6 was upgraded only to PARTIAL because absence of complaint is weaker than a judgement, so G-3 IS NOT RESOLVED. F-6 (title refused text far too early) was root-caused to the worst-case-uniform fit rule and FIXED: src/utils/interMetrics.ts vendors real measured advances plus a pair-kern table, a 45-character title now fits at the default size, and the same work found that the old model was ALSO NOT CONSERVATIVE for latin-ext (U+01F1 DZ is 1.3745em vs W's 1.0202, so 22 of them sat ON the old bound while rendering 46% past the line). The fix's own first attempt was caught by an E2E for the OPPOSITE error -- a blunt worst-pair kern margin falsely refused 'W'.repeat(22), which genuinely measures 1008 of 1016 units -- which is why a real pair table exists rather than a margin. Nine gates added and RED-PROVED (4 red on the reverted rule), restored by scratchpad copy-back with SHA-256 confirmed. F-7 (legend bar still off, collides with the boxes) is OPEN and answers OQ-3 in the NEGATIVE. Review findings F-3 and F-4 fixed; F-1/F-2 were already fixed at 9b88e67; F-5 stays informational. Prior activity: 2026-08-07 -- Phase 4 EXECUTED end to end and CLOSED at code level. Thirteen sequential waves on the main working tree, one executor per plan, run autonomously under a blanket sight-unseen proceed-authorization. Closed by 04-16: a supply-chain range-diff gate, an independent non-author review of the aggregate diff, the eight physical checks recorded NOT PERFORMED, and hand-edited status files. The review RE-RAN every gate rather than copying numbers and RE-PERFORMED SIX RED PROOFS across the phase (04-08 coastline, 04-10 clamp, 04-13 Gate A on real PNG pixels, 04-14 G-2, 04-15 blank-frame, 04-16 committed-change) -- ALL SIX REPRODUCED, each restored by scratchpad copy-back with SHA-256 confirmed. It hunted eleven recorded failure shapes and found ONE (F-3). It addressed Live Invariants 1-10 individually (5 AMENDED for the 195/207 split, 8 RETIRED not deleted when the legend lost its box chrome) and Immutable Safety Constraints 1-10 (all held; D4-10 is recorded as a product-policy change on already-shipped hash-verified geometry and NEVER as a bypassed approval; no geometry promoted; the approved catalog still holds exactly Modern). D4-01..D4-18 all accounted for, zero Deferred Ideas shipped. It found NO OVERCLAIM in any SUMMARY's headline result -- the two medium findings are evidence defects on claims that are independently true. Notably, EVERY plan in this phase found at least one gate in its own plan text that could not fail and said so rather than shipping it; four SUMMARYs carry an explicit 'Assertions NOT RED-proved, stated plainly' section. The sharpest catch of the phase was 04-11's: a crop derived from its subject's own layout moves with the subject, and drawImage off-bitmap returns TRANSPARENT BLACK that every ink counter reads as SOLID INK -- content floors passed on 28,050 phantom pixels while the defect they cover had happened. Prior activity: 2026-08-06 -- Phase 4 PLANNED end to end (research -> UI-SPEC -> patterns -> 16 plans -> check, 0 blockers)."
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 86
  completed_plans: 76
  percent: 88
---

# State: CountriesIRL Map Generator

> **Status (2026-08-07):** Phase 4 — **COMPLETE · 16/16 plans · closed by the owner on a free
> exploration**, exactly as Phase 3 was closed. The owner exercised PNG export, colours and ramp
> shading, the title field, and legend-entry renaming, and judged it good enough to ship.
> Gate after the post-acceptance fix: lint clean · **886/886** unit (47 files) · build clean ·
> **138/138** Playwright · `data:world:check` PASS · selector ceiling **337** · zero new packages.
> ⚠️ **SIX of the eight acceptance cells were never performed and still are not** — A9
> screen-reader · A10 physical 200% zoom · A11 dark-theme review · A12 latin-ext diacritic export ·
> A13 the rail at ≥1200px (D-5) · cartographic resemblance. **Skipped is not passed. None may be
> cited as verified, and none may cite a Phase 3 result.** Cell 8 (PNG-vs-screen) **PASSED** on the
> owner's own comparison. Cell 6 (G-3 rework) is **PARTIAL ONLY** — the panel drew no complaint,
> but the owner did not re-judge the three original complaints, so **`G-3` is NOT resolved.**
> [`04-ACCEPTANCE.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-ACCEPTANCE.md).
> **The acceptance session found two defects.** **`F-6`** — the title field refused text far too
> early (*"28 is little"*). **Confirmed, root-caused, and FIXED.** The fit rule counted characters
> against a worst-case-uniform bound charging every character the advance of `W`, which roughly
> **halved** real capacity (a `medium` title got **22** characters; a 45-character title really
> renders at **970 of 1016** units). It was **also not conservative**: since `04-04`'s latin-ext
> face, `U+01F1 DZ` is **1.3745em** — 35 % wider than `W` — so 22 of them sat *on* the old bound
> while rendering **46 % past the line**. `src/utils/interMetrics.ts` now vendors **real measured
> advances plus a pair-kern table**, by the same method that produced `1.0202`. ⚠ **`A12` is NOT
> closed by this** — it changed how text is *measured*, not whether latin-ext glyphs *render*
> correctly in a PNG, which still nobody has opened and looked at.
> **`F-7`** — the legend bar is still slightly off and **collides with the boxes**. **OPEN**, and it
> **answers `OQ-3` in the negative**: `04-13` moved the legend and it is still not right, so
> **`G-1` is worked but NOT closed.**
> **All three one-way decisions have landed.** `D4-10` — twelve neutral units colourable,
> `coreStateCount` stays **195** and factually true with `selectableCount: 207` beside it, hash
> chain **re-derived, not waived**, **no geometry promoted and no approval implicated**.
> `D4-02` — colour identity is `{rampId, t}` behind one `resolveColorValue` chokepoint
> (**Live Invariant 10**). `D4-11` — legend box chrome deleted, so **every saved map reopens
> without its box and exports differently than a PNG the creator may already have posted.**
> ⚠️ **`U-6` ships UNREVIEWED.** `04-11` took `ink-one` (single composition ink `#111827`),
> the one place the spec **knowingly departs from the owner's Eurostat reference** — and
> `04-UI-SPEC.md § 12` calls it the row most worth the owner's eye. The arithmetic forcing it:
> a second grey ink `#4B5563` (L = 0.0889) needs surface L ≥ 0.575, near-white water only, which
> would retire three of the four shipped presets. Must appear as a named item in `04-ACCEPTANCE.md`.
> ⚠️ **Browser scope drifted mid-phase, and the record states BOTH:** `04-01`…`04-06` certified on
> installed **Chrome 151.0.7922.75**, `04-07`…`04-15` and the close-out review on
> **Chrome 151.0.7922.76** (Chrome auto-updated). **Edge is NOT installed on this machine** — the
> `msedge` project cannot launch, so **no Edge result may be produced or cited.** Firefox, Safari,
> and previous-version certification have never been run here.
> **Every plan so far found at least one gate in its own plan that could not fail.** The sharpest:
> `04-11` proved a crop derived from its subject's own layout moves with the subject, and
> `drawImage` off-bitmap returns **transparent black that every ink counter reads as solid ink** —
> content floors passed on **28,050 phantom pixels** while the defect they cover had happened.
> Rule now in `coding-rules/export.md`. Others: a prescribed "inversion" that was really a removal
> (`04-10`); a gate measuring 0 either way because a second mechanism hid the subject (`04-09`);
> the vacuous `clone.ids === 0` warned about since `03-11`, which finally bit (`04-10`).
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
> **Phase 3's three follow-ups were worked, and none is CLOSED:** `G-3` colors panel → `04-07`
> rebuilt it at 360px and gated the cause, but **the rework judgement is subjective and was NOT
> performed** · `G-1` legend → `04-12` measured it at `y = 32` / 2.96 % / 88 units inside the title
> band and `04-13` moved it to `y = 152` / 14.07 %, re-baselining twelve assertions itemisedly —
> **`OQ-3` stays OPEN** · `G-2` → `04-14` tested it for the **first time by human or machine** and
> **corrected** the `03-UAT.md` characterization: a 15-char label refuses at the default `medium`
> size but **exports clean at `small`**, so "15–32 chars should refuse" is **wrong as written**.
> `03-UAT.md` is **annotated, never rewritten** — Phase 3 evidence is annotate-only.
> ⚠️ **Phase 3's UAT remains SKIPPED, not passed.** Nine of twelve cells were never performed —
> **no screen-reader pass, no touch-target check, no physical 200% zoom, no latin-ext export, and
> no dedicated dark-theme review** exists. Never report or cite them as verified.
> ▶ **Next: decide `OQ-2` (the 552px rail floor vs. `05-05`'s eighth row at ~600px), then
> `/gsd-plan-phase 5`.** **`U-6` is still unreviewed** and is the one thing most worth the owner's
> eye — it is the single place the phase knowingly departs from the owner's own reference image.
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

Phase: **04** (Visual & Cartographic System) — **COMPLETE 2026-08-07, closed by the owner on a
free exploration · 16/16 plans.** Six of eight acceptance cells never performed. 80 commits, 141 files, **+32,460 / −2,327** across
`0df7fff..HEAD`. **Zero new npm packages** — proven, not asserted, by a byte-level **range diff**
against the phase-start SHA `0df7fff9d1060e6ab3efa5aacdb8c3228a88b7cb`, itself RED-proved against a
**committed** change (the shape `git diff --quiet HEAD` was recorded as passing silently on).

**What shipped:** sequential ramps replacing the flat swatch grid · a redesigned Colors panel at
360px · a new `Map style` tool (water / uncoloured fill / borders / bands) · interior-border
rendering with quiet coastlines · gradient bands · title, subtitle, and attribution text · a
chrome-free legend in two forms below the title block · latin-ext font coverage · twelve
previously-uncolourable units now colourable · V3 persistence.

**Gate at close, re-run by an independent non-author review rather than copied**
([`04-16-REVIEW.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-16-REVIEW.md)):
lint clean · **875/875** unit (47 files) · build clean · **138/138** Playwright ·
`data:world:check` PASS (248 units, **195 core states**, **207 colourable units**, mesh re-derived
327 geometries / 366,767 B) · selector ceiling **337**. **No total below baseline.**

### ⚠️ The phase is closed, and six of eight cells are still unperformed

The owner ran a **free exploration on 2026-08-07** and closed the phase on it — a real verdict on
the phase-goal predicate, and the same kind of close Phase 3 got. **It closes the phase; it does
not fill the cells.**

| | |
|---|---|
| ✅ **Cell 8 — PASS** | The owner exported and compared against the screen. **No PNG-vs-screen discrepancy reported.** |
| 🟡 **Cell 6 — PARTIAL** | The Colors panel was exercised and **drew no complaint** (*"color shading worked nice"*), but the owner did **not** re-judge the three original `G-3` complaints — density, information architecture, nested bordered boxes. Absence of complaint is weaker evidence than a judgement, so **`G-3` is NOT recorded as resolved.** |
| ⛔ **Cells 1–5, 7 — NOT PERFORMED** | A9 screen-reader · A10 physical 200% zoom · A11 dark-theme review · A12 latin-ext diacritic export (opening the PNG and looking at the glyphs) · A13 the rail at ≥1200px (D-5) · cartographic resemblance against the Eurostat image. |

**Skipped is not passed.** None of the six may be cited as verified, and **none may cite a Phase 3
result** — every one is among Phase 3's nine never-performed cells. They are now the binding
constraint on Phase 6's `06-03` WCAG audit and the v1.1 acceptance matrix.

The *execution* ran under a **blanket, in-advance, sight-unseen proceed-authorization**
([`04-AUTHORIZATION.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-AUTHORIZATION.md),
written *before* execution). It **authorized proceeding**; it was **not a content review** and it
was **not hash-bound**. The owner's later free exploration is a separate and genuine act of
review — but it covers what the owner actually touched, which is **cells 6 and 8 only**.

### The two defects the acceptance session found

- **`F-6` — the title field refused text far too early. ✅ FIXED 2026-08-07.** Root cause: the fit
  rule counted characters against a **worst-case-uniform** bound that charged every character the
  advance of `W` (`1.0202em`), roughly **halving** real capacity — a `medium` title got **22**
  characters while `'Countries I have visited across all of Europe'` (45) really renders at
  **970 of the 1016** available units. `03-VERIFICATION.md` had predicted exactly this
  over-estimate (~1.8×) against the legend's ceiling, and its grounds were never rebutted.
  The same model was **also not conservative**: since `04-04` added the latin-ext face,
  `U+01F1 DZ` is **1.3745em** — 35 % wider than `W` — so 22 of them sat *on* the old bound while
  rendering **46 % past the line**, meaning **the old rule accepted a string that clips.**
  `src/utils/interMetrics.ts` now vendors **real per-character advances and a pair-kern table**,
  measured by the same method that produced `1.0202` (installed Chrome, canvas `measureText`,
  vendored woff2; the harness reproduced `W@600 = 1.0202` exactly). `measureTextEm` returns a
  **provable upper bound** — advances and kerns stored rounded up, untabulated pairs charged the
  measured maximum. ⚠ **The kern table exists because the first attempt did not have one:** a flat
  worst-pair margin (`0.166em`, the `ïï` outlier) was provably safe but far too blunt, and **an
  e2e caught it falsely refusing `'W'.repeat(22)`** — a title that genuinely measures 1008 of 1016
  units. ⚠ **This does NOT close `A12`.** It changed how text is *measured*, not whether latin-ext
  glyphs *render* correctly inside an exported PNG, which nobody has still ever looked at.
- **`F-7` — the legend bar is still slightly off and collides with the boxes. ⏳ OPEN.**
  *"The legend bar was off a little, some obstruction with the boxes themselves, but thats
  fixable."* This is the owner signal `OQ-3` was waiting for, and it **answers it in the
  negative**: `04-13` moved the legend from `y = 32` to `y = 152` and **it is still not right**, so
  **`G-1` is worked but NOT closed.** The *obstruction* is a **new** report, distinct from the
  position — `04-12` enumerated **eight legend properties beyond position, four still open**, and
  this likely lands among them.

### The independent review's five findings — FOUR now fixed, one informational

`04-16` Task 2's non-author review re-ran every gate, **re-performed six RED proofs across the
phase (all six reproduced)**, hunted eleven recorded failure shapes, and addressed Live Invariants
1–10 and Immutable Safety Constraints 1–10 individually. It found **no overclaim in any SUMMARY's
headline result.** None was fixed *by the reviewer* — a reviewer who fixes is no longer
independent — and **four have since been fixed by separate work**:

| | State |
|---|---|
| **F-1**, **F-2** — raw NUL bytes making files binary to `git diff` and invisible to `grep -I` | ✅ **FIXED** at `9b88e67`. All four sites (including one inside `STATE.md`'s own write-up *of* the finding) are `\u0000` escapes; behaviour-preserving, 875/875 at the time. |
| **F-3** — the void Live Invariant 3 proof | ✅ **FIXED** at `6534ff0`. The unquoted globs meant the command **never ran** under zsh and its silence was read as a pass. Run correctly it returns **ten** hits, now all classified in `04-13-SUMMARY.md`. **The invariant itself was independently re-verified INTACT** — `LegendEditor.tsx` is editor chrome whose only positional reads go *through* `resolveLegendPosition`, `LegendOverlay.tsx` takes its position from `resolveLegendRender`, and `export.ts` has zero raw reads. The struck-through claim is kept beside the correction. |
| **F-4** — stale `.planning/config.json` | ✅ **FIXED** at `6534ff0`. `techStack.decided`, `workflow.phases`, the `html2canvas` candidate, and the Europe-only scope all corrected with an annotation block. |
| **F-5** — the `04-15` supply-chain gate is narrower than it reads | ℹ️ **Informational, no action.** Faithful but compares four JSON objects; `04-16`'s byte-level range diff closes the gap. **Recorded so nobody deletes one as redundant — they are complementary.** |

### Still true, and not closed by shipping

| | |
|---|---|
| ⚠️ **`U-6` ships UNREVIEWED** | `04-11` took `ink-one` (a single composition ink `#111827`) — **the one place `04-UI-SPEC.md` knowingly departs from the owner's Eurostat reference**, and § 12 calls it the row most worth the owner's eye. Forced by arithmetic: a second grey `#4B5563` (L = 0.0889) needs surface L ≥ 0.575 — near-white water only — retiring three of four shipped presets. An `[ASSUMED]` row, **never an owner decision.** Named in `04-ACCEPTANCE.md`. |
| **3 one-way decisions landed** | **D4-10** (selectable core 195 → 207) · **D4-11** and **D4-17** (legend box chrome deleted; V2 maps adopt the new look, so **saved compositions change appearance on load** and export differently from a PNG the creator may already have posted). |
| **Coverage is tracked against decisions, not REQ-IDs** | Phase 4 has **no REQ-IDs mapped in ROADMAP.md** (`phase_req_ids` null; no `04-SPEC.md`). All **18/18** decisions D4-01…D4-18 covered, now verified independently **three** times. A **mapping gap, not dropped scope.** |
| ⚠️ **The decision-coverage gate did NOT pass — it could not run** | `check.decision-coverage-plan` returned `could-not-parse`: its extractor expects `D-NN`, this phase uses `D4-NN`. **Recorded INCONCLUSIVE, never as passed.** The spec-less probe fallback was likewise **visibly skipped** for having no requirement IDs. |
| **The two blocking technical findings were absorbed, not dodged** | `sanitizeExportClone`'s hard-set black 0.75 stroke was **replaced, never deleted** (`04-08`) — deleting it re-opens the wrapped-date-line selection-border defect, and the source says so. `--map-surface` contributing zero export pixels was fixed by the serialized `rect[data-layer=surface]` (`04-01` tracer). |
| **CD-11 and the stale debug artifact are resolved** | `ROADMAP.md 04-05`'s factually impossible mesh claim amended by `04-06`/`04-09`. `.planning/debug/kosovo-renders-white-uncolorable.md` is **tracked and annotated `SUPERSEDED`** by `04-03` — verified this session. |

▶ **Next: hand [`04-ACCEPTANCE.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-ACCEPTANCE.md)
to the owner** — the eight cells, and **`U-6` first**. Then `/gsd-plan-phase 5`.

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

- 2026-08-07 (evening) — **Phase 4 CLOSED by the owner on a free exploration.** The owner
  exercised PNG export, colours and ramp shading, the title field, and legend-entry renaming and
  judged it good enough to ship. **Six of eight cells still never performed**; cell 8 PASSED,
  cell 6 PARTIAL, so **`G-3` is not resolved**. Two defects found: **`F-6`** (title refused text
  far too early) **root-caused and FIXED** — a worst-case-uniform character bound that both
  **halved** real capacity and, since `04-04`, **was not even conservative** for latin-ext;
  replaced by **real measured advances plus a pair-kern table** in `src/utils/interMetrics.ts`.
  **`F-7`** (legend still off, collides with the boxes) is **OPEN** and **answers `OQ-3`
  negatively**. Review findings `F-3`/`F-4` fixed; `F-1`/`F-2` already fixed at `9b88e67`.
  A repo-wide **NUL-byte guard** was added after the `F-1` class **recurred while writing the
  record of fixing it**. Gate: lint · **886/886** · build · **138/138** · `data:world:check` PASS.
- 2026-08-07 — **Phase 4 SHIPPED at code level and physically unverified** — 16/16 plans;
  80 commits, 141 files, +32,460/−2,327. Sequential ramps, water presets, the `Map style` tool,
  interior-border mesh with quiet coastlines, gradient bands, composition text, a chrome-free
  legend in two forms, latin-ext font coverage, 207 colourable units, V3 persistence. **Zero new
  npm packages**, proven by a range diff RED-proved against a committed change. Closed by an
  **independent non-author review** that re-ran every gate and re-performed six RED proofs (all
  reproduced), raising **five findings, none fixed**. ⛔ **All eight physical checks `NOT
  PERFORMED`.** Carry-forwards: **`U-6` unreviewed** (the knowing departure from the owner's
  reference) · `OQ-1`–`OQ-5` all open · `F-1` still unvalidated · `G-2` **corrected** and
  `03-UAT.md` annotated · storage headroom 48 % → 17 %.
  → [`04-ACCEPTANCE.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-ACCEPTANCE.md) ·
  [`04-16-REVIEW.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-16-REVIEW.md)
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

#### Filed at Phase 4 close (2026-08-07) — every open item, with what would close it

**The eight physical checks — SIX still `NOT PERFORMED` and not inheritable; two answered by the
owner's 2026-08-07 free exploration.** The `G-3` and PNG-vs-screen rows below are superseded by
that session (see § Current Position) and are kept for the "what would close it" detail.

| Item | What would close it |
|---|---|
| **A9 screen-reader** over the ramp strip, `Map style` panel, and text tools | A human driving VoiceOver and judging whether the spoken names are usable in sequence. Names *exist* and are asserted as strings; nothing has been read aloud. |
| **A10 physical 200 % zoom** with a panel open at 360px | A human pressing ⌘+. ⚠ A halved CSS viewport is the **equivalent** and must always be labelled as such — never recorded as physical zoom. |
| **A11 dark-theme visual review** of both new panels and the ramp strip | A human looking. Automated contrast (A3) is green but is a **different claim**. |
| **A12 latin-ext diacritic export** | A human exporting `Košice / Łódź / Magyarország`, **opening the PNG, and inspecting the glyphs.** `04-04` proved two `@font-face` rules with `unicode-range` and a rasterisation difference — that proves *something changed*, not that it is correct. `04-04-SUMMARY.md` explicitly declines to claim A12. |
| **A13 the rail at ≥ 1200px (D-5)** | A human sizing a window ≥ 1200px wide. Playwright covers 1280 × 552 (the **measured** floor). Never performed in Phase 3; not inherited. |
| **G-3 rework judgement** — 🟡 **PARTIAL 2026-08-07** | The owner's own judgement — the original complaint was subjective, so the criterion is too. `04-07` gated the *cause* (no `--radius-card`, no `--hairline`, no outset `box-shadow`, deleted fragments cannot return); structure cannot judge feel. The owner exercised the panel and **raised no complaint** (*"color shading worked nice"*), but did **not re-judge the three original complaints**. **Resolution is still NOT claimed.** Closes with the owner explicitly saying whether density, information architecture, and the nested boxes are answered. |
| **Cartographic resemblance** — ⛔ still `NOT PERFORMED` | Side-by-side against the owner's Eurostat image. Every property is gated on real pixels and `04-15` proves all seven land in one 1080 frame; resemblance is aesthetic and was not assessed. |
| **PNG-vs-screen differences** — ✅ **PASS 2026-08-07** | A human comparing the download against the screen. **Done:** the owner exported and compared and reported no discrepancy. The two defects the session did find (`F-6`, `F-7`) are tracked separately. |

**The five open questions — `OQ-3` is now ANSWERED (negatively); four still open.**

| OQ | State | What would close it |
|---|---|---|
| **OQ-1** water preset list | Answered as `preset-set-a` by the orchestrator under the **blanket sight-unseen** authorization — i.e. **proceeded on, not chosen by the owner** | The owner looking at the four presets and keeping or changing them. |
| **OQ-2 / D-5** rail height | ⏳ **OPEN and worse than the spec assumed.** The floor is **552px, not the 540px `04-UI-SPEC.md § 6.1` estimated** — measured by `04-01` in installed Chrome; the pinned HUD footer hangs below the fold, not the seven rows (the last row's bottom is at 432px) | A decision among the three named refactors. ⚠ **Phase 5's `05-05` Data HUD would add an eighth row (~600px)** — decide before planning Phase 5. |
| **OQ-3** is `G-1` resolved? | ❌ **ANSWERED 2026-08-07 — NO.** The owner looked at the moved legend: *"The legend bar was off a little, some obstruction with the boxes themselves, but thats fixable."* `04-12` measured it at `y = 32` / **2.96 %** / **88 units inside the title band**; `04-13` moved it to `y = 152` / **14.07 %**, itemisedly re-baselining twelve assertions. **The move was real and it was not enough**, so **`G-1` is worked but NOT closed** and is now tracked as **`F-7`**. The *obstruction* is a **new, distinct** report — `04-12` enumerated **eight legend properties beyond position, four still open**, and it likely lands among them | A further legend-placement fix, then the owner looking again. ⚠ It **moves exported pixels** — D-25 territory, needing deliberate itemised fixture re-baselining, exactly as `04-13` did. |
| **OQ-4** proportional vs. classed | ⏳ **OPEN by design** — surfaces at Phase 5 planning, not here. | The Phase 5 discussion. |
| **OQ-5** mixed-map legend default | ⏳ **OPEN.** `bar` ships as the **inferred** default with an override, taken as the planner's *recommendation* under the blanket authorization | The owner choosing. **A shipped default is not an answered question.** |

**The five findings from `04-16-REVIEW.md` — none fixed, by design.**

- **F-1 · medium — a raw NUL byte hides a whole test file from `git diff` and from grep.**
  `src/utils/compositionText.test.ts:139` (offset 5079) carries a **literal NUL (0x00)** instead of
  a `\u0000` escape. The test's intent is good (it proves `sanitizeCompositionText` strips NUL,
  newline, and a RTL override). The encoding is the defect: git classifies the file **binary**, so
  **all 333 lines were invisible in the aggregate diff** — the exact artifact the close-out review
  is built on — and this environment's `grep` (`ugrep -I`) **silently skips it**, so any negative
  grep over `src/**` returns a tidy zero for it regardless of contents. Landed gates are unaffected
  (they read via Node `fs`, not grep). **Closes with:** one escape per site, plus a repo-wide
  `file`-over-`git ls-files` guard, which found both F-1 and F-2 in one pass.
- **F-2 · low — the same defect twice more**, `src/utils/storage.test.ts:1093,1136`. Lower impact:
  both NULs sit past git's 8000-byte sniff window, so `git diff` and `git grep` still treat it as
  text. **Closes with:** the same one-character fix.
- **F-3 · medium — a Live Invariant 3 evidence grep that could not return anything.**
  `04-13-SUMMARY.md:673-674` claims the invariant holds because a grep *"returns nothing"*. The
  globs are **unquoted**, so under zsh the command never runs (`no matches found`); run correctly
  it returns **ten** hits. **The invariant itself is intact** — re-verified independently, none of
  the ten is a render or export path — **but the recorded proof is void**, in the precise shape
  this project has been burned by. **Closes with:** replacing the claim with the quoted command and
  its real ten-hit output, each hit classified. Do not change the conclusion; it is correct.
- **F-4 · low — CD-9 was never assigned to a plan and is still live.** `.planning/config.json`
  still says `techStack.decided: false`, `workflow.phases: 3`, and lists **`html2canvas`** among
  its candidates. All three contradict the repository (stack decided, six phases, `html2canvas`
  removed by `03-11` / D-34). Nothing reads it at runtime, but an **agent** may read it and be
  misled on exactly the point `CLAUDE.md` guards hardest. It also carries `executor_model: sonnet`,
  which `CLAUDE.md` § Model Routing overrides. **Closes with:** a hand edit to that file.
- **F-5 · informational — the `04-15` supply-chain gate is narrower than it reads.** Its
  hand-transcribed phase-start literal is **faithful** (verified against `git show 0df7fff:package.json`),
  but it compares four JSON objects, so it cannot see a changed `resolved`/`integrity`, an added
  `overrides` block, or an edited `scripts` entry. `04-16`'s byte-level range diff closes that gap.
  **Recorded so nobody later deletes one as redundant — they are complementary.**

**Other Phase 4 carry-forwards.**

- **`F-1` (the 14-char default legend-label export ceiling) is NOT validated.** `04-14` proved the
  ceiling **bites**, which says nothing about whether **14 is the right number**. The
  `03-VERIFICATION.md` verifier's three grounds against the bound stand **unrebutted**
  (worst-case-uniform derivation over-estimating line count ~1.8×; the saved-composition break; and
  the repo's own fixture shortening `'Imperial lands'` → `'Empire lands'` to keep the suite green).
  **Closes with:** re-measuring the real per-line character count and re-deriving the bound.
- **`G-2` is CORRECTED, not merely closed.** `04-14` tested it for the **first time by human or
  machine**: a 15-char label refuses to export **at the default `medium` size**, but *the same
  label at `small` loads and exports clean*. The `03-UAT.md` § Gaps characterization
  ("15–32 chars should refuse") is **wrong as written** — it is a `medium`-size trap, bounded by
  `LEGEND_CHARACTERS_PER_LINE` (`legend.ts:206`), not a flat character range. **`03-UAT.md` is
  annotated, never rewritten.**
- **Storage headroom fell 48 % → 17 %.** `04-14` measured **4,134 nodes** per worst-case V3 record,
  **41,331 of `MAX_STORAGE_JSON_NODES` = 50,000** for ten saved maps. Still inside the bound, but
  the margin is now thin. **Closes with:** a decision on whether the budget should rise before
  Phase 5 adds per-country data.
- **Every `[ASSUMED]` row that shipped (U-1 … U-14, `04-UI-SPEC.md § 12`) is an assumption, not an
  owner decision, and may never be cited as one.** **U-6 is the one that most needs the owner's
  eye** (above). **Closes with:** the owner reading § 12 and converting each row to a decision or a
  change.
- ⚠️ **Browser scope drifted mid-phase and both versions are on the record.** `04-01`…`04-06` on
  installed **Chrome 151.0.7922.75**; `04-07`…`04-15` and the close-out review on **151.0.7922.76**.
  **Edge is NOT installed** and NOT certified; Firefox and Safari have never been run here.

#### Filed by the Phase 4 context session (2026-08-06)

- ~~**`ROADMAP.md` § Phase 5 `05-02` contradicts `D4-10`.**~~ **RESOLVED 2026-08-06 by `04-03`** —
  the roadmap bullet is amended and dated, the `world-manifest.json` hash **re-derived (not
  waived)**, and the selectable count moved 195 → 207 alongside an unchanged `coreStateCount: 195`.
  **No geometry was promoted and no rights/factual/topology approval was implicated** — a
  product-policy change on already-shipped, hash-verified Modern geometry, and it **must never
  later read as a bypassed approval.**
- ~~**`03-UI-SPEC.md` needs annotating for `D4-05`** (280 → 360px)~~ **RESOLVED (CD-1)** by `04-07`
  and `04-12`, landed in the same commit as the width. *(The separate wrong-placement-formula
  divergence in that doc is still unannotated — see below.)*
- **Two one-way persistence decisions landed and are creator-visible.** `D4-11` deleted `theme` /
  `backgroundOpacity` / `borderStyle` from `LegendState`; `D4-17` has V2 maps adopt the new look.
  **A saved composition changes appearance when reopened**, and its export will differ from a PNG
  the creator already posted. Accepted knowingly. **Reversing after a creator has reopened and
  re-saved does not restore the original record.**

#### Carried forward unchanged from earlier phases

- **`G-3` — the colors panel.** *"Too squished, not organized well, hate the multi boxes within."*
  **Worked by `04-07`** — rebuilt at 360px, with structural gates on the *cause* (neither Colors
  sheet declares `--radius-card`, `--hairline`, or an outset `box-shadow`; the four deleted class
  fragments cannot return by copy-paste). **Resolution is NOT claimed** — the criterion is the
  owner's subjective judgement and **cell 6 of `04-ACCEPTANCE.md` is `NOT PERFORMED`.**
- **`G-1` — the legend sat too high.** **Moved by `04-13`** from `y = 32` (2.96 %, 88 units inside
  the title band, measured by `04-12`) to `y = 152` (14.07 %). It **moved exported pixels** as
  predicted — D-25 territory — and twelve assertions were re-baselined **itemisedly**, each with
  its superseded measurement kept beside it. **`OQ-3` stays OPEN**: only the owner can say whether
  it now sits right. `04-12` also enumerated **eight legend properties beyond position, four still
  open.**
- **`G-2` — CORRECTED, not merely closed.** See the Phase 4 close-out block above: `04-14` tested
  it first-ever and found a **`medium`-size trap**, not the flat 15–32 character range `03-UAT.md`
  described. `03-UAT.md` is **annotated, never rewritten.**
- **`F-1` — the 14-char default legend-label export ceiling is still NOT validated.** `04-14`
  proved the ceiling **bites**; that says nothing about whether **14 is right**. The verifier's
  three grounds against the bound remain **unrebutted**.
- **Nine Phase 3 UAT cells were never performed** (screen reader, touch targets, physical 200% zoom,
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

- **Last session:** 2026-08-07 (evening) — **Phase 4 CLOSED BY THE OWNER on a free exploration,
  and the two defects it found were worked.** The owner exercised PNG export, colours and ramp
  shading, the title field, and legend-entry renaming: *"everything seemed to work decently."*
  **Six of eight cells remain `NOT PERFORMED`**; cell 8 PASSED, cell 6 is PARTIAL only.
  **`F-6` (title refused text far too early) was root-caused and FIXED** — `interMetrics.ts`
  vendors real measured advances plus a pair-kern table, replacing a worst-case-uniform character
  count that both **halved** real capacity and, since `04-04`'s latin-ext face, **was not even
  conservative**. **`F-7` (legend still off, collides with the boxes) is OPEN and answers `OQ-3`
  negatively.** Review findings `F-3` and `F-4` fixed (`6534ff0`); `F-1`/`F-2` were already fixed
  at `9b88e67`; `F-5` stays informational.
  ⚠ **Two process lessons from this session, both worth keeping:**
  (1) the `F-6` fix **broke nothing** in the 875-test suite, because every pre-existing refusal
  test built its subject with `'W'.repeat(...)` — the one character where the old and new rules
  agree. **Green was the warning, not the reassurance.** Nine gates were added asserting *opposite*
  directions of the defect, and RED-proved.
  (2) the **F-1 NUL-byte defect recurred while writing the record of fixing it** — a literal NUL
  went into `STATE.md`, turning the file GSD auto-loads into `data` so every grep against it
  returned nothing. `src/repoHygiene.test.ts` now gates the whole class repo-wide (RED-proved by
  planting a NUL and restoring by scratchpad copy-back, SHA-256 confirmed).
- **Previous session:** 2026-08-07 — **Phase 4 executed end to end and closed at code level.** Thirteen
  sequential waves on the main working tree (no worktrees — chosen deliberately), one executor per
  plan, run autonomously under a blanket sight-unseen proceed-authorization. Then `04-16`: a
  supply-chain **range-diff** gate RED-proved against a committed change, an **independent
  non-author review** of the aggregate diff
  ([`04-16-REVIEW.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-16-REVIEW.md)) that
  **re-ran every gate rather than copying numbers** and **re-performed six RED proofs (all six
  reproduced)**, the eight physical checks recorded **`NOT PERFORMED`**
  ([`04-ACCEPTANCE.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-ACCEPTANCE.md)), and
  this hand-edited close-out. **Five findings were raised and none was fixed** — a reviewer who
  fixes is no longer independent; all five are under Pending Todos.
- **Previous session:** 2026-08-06 — **Phase 4 context gathered and planned.**
  [`04-CONTEXT.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-CONTEXT.md) +
  [`04-DISCUSSION-LOG.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-DISCUSSION-LOG.md).
  All eight offered gray areas discussed; **18 decisions (`D4-01`–`D4-18`)**, four loose ends
  deliberately left as open questions. Then research → UI-SPEC (verified 6/6) → pattern map →
  16 plans across 13 waves, tracer-first → plan-checker (**0 blockers**, 3 warnings folded in).
- **Previous session:** 2026-08-06 — **Phase 3 executed end to end and closed at code level.** Twelve
  sequential waves, one executor per plan, run autonomously under a blanket proceed-authorization
  while the owner slept. Then independent non-author review
  ([`03-12-REVIEW.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-REVIEW.md)) and goal-backward
  verification ([`03-VERIFICATION.md`](phases/03-clean-ui-overhaul-1-1-5-weeks/03-VERIFICATION.md)),
  both of which **re-ran every gate rather than copying numbers**, then this close-out.
- **Previous session:** 2026-08-06 — Phase 3 planned end to end (research → ui-phase → plan-phase;
  planning docs only). Before that: Phase 3 context gathering (`d3d9a35`), and the 2026-07-26
  documentation reorganization pass.
- **Stopped at:** Phase 4 **COMPLETE**, 16/16 plans — **closed by the owner on a free
  exploration**, with **six of eight cells never performed**.
  ▶ **Next: decide `OQ-2`, then `/gsd-plan-phase 5`.** The rail floor is **552px** (not the spec's
  540px) and `05-05`'s Data HUD would add an eighth row (~600px) — **planning Phase 5 without
  settling this schedules a known overflow.**
  ⚠ **`U-6` is still unreviewed** and remains the single thing most worth the owner's eye: it is
  the one place the phase knowingly departs from the owner's own Eurostat reference.
  ⏳ **`F-7` is open** — the legend bar is still slightly off and collides with the boxes. Fixing
  it **moves exported pixels** (D-25 territory) and needs itemised fixture re-baselining, as
  `04-13` did.
  Phase 3 likewise remains **SHIPPED (code level), physically unverified** — its nine unperformed
  cells are still unperformed and **cannot be inherited by Phase 4 or by anything after it.**
  Phase 2 remains engineering-complete at `fe5f946` with both owner gates untouched and still OPEN.
- **Resume file:** this file, plus
  [`04-ACCEPTANCE.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-ACCEPTANCE.md) and
  [`04-16-REVIEW.md`](phases/04-visual-cartographic-system-1-5-2-weeks/04-16-REVIEW.md) for the
  Phase 4 position. `04-CONTEXT.md` holds the decisions D4-01…D4-18. `03-UAT.md` still carries the
  Phase 3 position. The Phase 2 `.continue-here.md` remains for Phase 2 resumption only.
  **The Phase 4 `.continue-here.md` is spent** — it describes the wave-2 pause and is superseded by
  this section. `HANDOFF.json` was deleted on 2026-07-26.
