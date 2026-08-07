---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 16
subsystem: phase-close-out
status: complete
tags: [independent-review, supply-chain-gate, acceptance-record, status-files]
requires:
  - "04-01 … 04-15 (the whole phase's aggregate diff is this plan's subject)"
  - "04-AUTHORIZATION.md (the authorization terms this plan records)"
provides:
  - "04-16-REVIEW.md — independent non-author review, 6 gates re-run, 6 RED proofs re-performed, 5 findings"
  - "04-ACCEPTANCE.md — 8 physical cells, ALL NOT PERFORMED, authorization type named"
  - "A byte-level package.json/package-lock.json RANGE-diff gate, RED-proved against a COMMITTED change"
  - "STATE.md / ROADMAP.md / CLAUDE.md close-out, hand-edited"
affects:
  - "Phase 5 planning — OQ-2's 552px rail floor must be decided before 05-05's Data HUD is planned"
tech-stack:
  added: []
  patterns:
    - "A supply-chain gate is a RANGE diff against a recorded phase-start SHA, never a working-tree diff"
    - "An anti-vacuity anchor: prove the range resolves before trusting an empty diff inside it"
key-files:
  created:
    - .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-16-REVIEW.md
    - .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-ACCEPTANCE.md
  modified:
    - src/styles/uiContract.test.ts
    - .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-VALIDATION.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UAT.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - CLAUDE.md
decisions:
  - "Both the 04-15 literal-set gate and the 04-16 byte-range gate stay — they are complementary, not duplicative"
  - "04-VALIDATION.md flags set true, but scoped in the file to automated sampling density only"
  - "All eight physical cells recorded NOT PERFORMED; none auto-approved, none inherited from Phase 3"
  - "Review findings handed forward unfixed — a reviewer who fixes is no longer independent"
metrics:
  duration: "~35 min"
  completed: 2026-08-07
actuals:
  tokens: 41000
  tasks: 4
  commits: 4
---

# Phase 4 Plan 16: Honest Phase Close-Out Summary

**The phase's zero-installs claim became a gate that has been seen to fail on a committed change,
an agent that wrote none of the code re-ran every gate and re-performed six RED proofs, all eight
physical checks were recorded `NOT PERFORMED`, and the status files were edited by hand.**

---

## What was done

| Task | Result | Commit |
|---|---|---|
| 1 — dependency gate + browser scope | Range-diff gate in `uiContract.test.ts`, RED-proved twice | `0653333` |
| 2 — independent non-author review | `04-16-REVIEW.md`; 6 gates re-run, 6 RED proofs reproduced, 5 findings | `d616463` |
| 3 — OWNER GATE, eight physical checks | **Proceeded past. All eight `NOT PERFORMED`.** No commit of its own | — |
| 4 — acceptance record + status files | `04-ACCEPTANCE.md`, `04-VALIDATION.md`, `03-UAT.md` annotation, `STATE.md`, `ROADMAP.md`, `CLAUDE.md` | `3a56c53` |

---

## Task 1 — the phase-start SHA and a gate that can actually fail

**Phase-start SHA, recorded verbatim:**

```
0df7fff9d1060e6ab3efa5aacdb8c3228a88b7cb
```

*"docs(04): phase 4 PLANNED — 16 plans/13 waves; STATE+ROADMAP reconciled by hand"* — the commit
immediately before `04-01`'s first commit `42b2f0d`.

**Route taken, stated plainly as the plan required:** a **Vitest case in
`src/styles/uiContract.test.ts`** that shells out to `git` via
`process.getBuiltinModule('node:child_process')`, matching the file's existing
`getBuiltinModule('fs')` idiom. It was **not** put in a separate script, and it is **not** an unrun
claim — it runs on every `npm test`. The `git` call sits **inside `it()`**, never at module scope,
specifically to avoid the throws-at-import shape `04-02` hit.

**Two assertions, and neither is redundant:**

1. `git diff <phase-start-sha>..HEAD -- package.json package-lock.json` is empty — everything
   committed during the phase.
2. `git status --porcelain -- package.json package-lock.json` is empty — anything sitting
   uncommitted right now, which a range diff cannot see.

**An anti-vacuity floor guards both.** A pathspec resolved from the wrong working directory matches
nothing and returns an empty diff — which is exactly what this gate reads as success. So the range
is first proved live against `src/utils/ramps.ts`, a file known to be inside it, and `cwd` is this
test file's own directory with `rev-parse --show-toplevel` re-rooting every subsequent call.

### The RED proof — verbatim, and the mutation WAS committed

`package.json` and `package-lock.json` were copied to the scratchpad. `"left-pad": "1.3.0"` was
added to `devDependencies` and **committed** as `0ad9672`. **The working tree was then clean for
`package.json` — that is the whole point.** For contrast, the shape `CLAUDE.md` records as having
passed silently on a committed change was run first:

```
$ git diff --quiet HEAD -- package.json package-lock.json
working-tree check: PASSES (blind to the committed change)
```

**Reproduced exactly.** The new gate, on the same tree:

```
FAIL src/styles/uiContract.test.ts > Phase 4 added no package (T-04-16-03)
     > has no committed manifest change across the whole phase range
AssertionError: package.json or package-lock.json was COMMITTED during Phase 4. The phase adds
zero packages; a failed or unexpected install is a human-verification checkpoint, never an
auto-substituted alternative.: expected 'diff --git a/package.json b/package.j…' to be ''
+ +    "vitest": "4.1.10",
+ +    "left-pad": "1.3.0"

Tests  1 failed | 1 passed | 67 skipped (69)
```

**The second case stayed GREEN**, proving the two halves are independent claims rather than one
mutation reddening both.

**Second RED, on the floor itself.** `PHASE_4_START_SHA` was pointed at HEAD so the range resolved
to nothing — the precise scenario in which an empty manifest diff is meaningless:

```
AssertionError: The Phase 4 range d0492808…..HEAD does not contain src/utils/ramps.ts, so the
range is not resolving to the phase and the empty manifest diff below would mean nothing.:
expected [] to include 'src/utils/ramps.ts'
```

**Restoration.** `git reset --soft HEAD~1` (which discards nothing), then both manifests restored
by **scratchpad copy-back**, then `git reset` to unstage. MD5 matched the pre-mutation copies for
both files. `git log --oneline -2` shows **no leftover mutation commit** (`d049280`, `c0ec542`);
`git status --short` showed only the intended `uiContract.test.ts` edit. **No `git checkout --` was
run on any file with uncommitted work.**

**Acceptance criterion checked:**
`grep -vE "^\s*(//|\*|/\*|#)" src/styles/uiContract.test.ts | grep -c "diff --quiet HEAD"` → **0**.
The header explaining which shape was avoided is a comment line and is filtered first, as the plan
anticipated.

### Browser scope — stated, not inferred

**Installed Google Chrome only.** Measured this session: **`Google Chrome 151.0.7922.76`**.

**The scope drifted mid-phase and the record states both:** `04-01` … `04-06` on
**151.0.7922.75**, `04-07` … `04-16` on **151.0.7922.76** (Chrome auto-updated between waves). A
single-version claim would be false.

**Microsoft Edge is NOT installed on this machine** — verified: `/Applications` holds no
`Microsoft*.app`, `~/Library/Caches/ms-playwright` holds only `ffmpeg-1011`, so the `msedge`
project cannot launch and **no Edge result may be produced or cited.** **Firefox, Safari, and
previous-version certification have never been run here.** The Phase 1/2 "Edge 150" record is
**immutable — annotate it, never rewrite it** — and no phase may cite it until explained.
**No Edge, Firefox, or Safari result is claimed anywhere in this plan.**

---

## Task 2 — the independent review

Full working in [`04-16-REVIEW.md`](04-16-REVIEW.md). Headlines:

**Every gate re-run, real output, nothing copied:** lint clean · **875/875** unit (47 files) ·
build clean · **138/138** Playwright · `data:world:check` PASS · selector ceiling **337**.
**No total below baseline**; the only delta is Task 1's own +2.

**Six RED proofs re-performed — all six reproduced.** `04-08`'s coastline, `04-10`'s clamp
(verbatim: same 4 failures, same counts, same messages), `04-14`'s G-2 (step 2 red, step 1 and both
controls green), `04-13`'s Gate A on real PNG pixels, `04-15`'s blank-frame substitution, and Task
1's committed-change proof. Each restored by scratchpad copy-back with SHA-256 confirmed.

**Eleven recorded failure shapes hunted; one found.** Live Invariants 1–10 each addressed (5
amended, 8 retired, the rest unregressed). Immutable Safety Constraints 1–10 held. D4-01 … D4-18 all
accounted for — a third independent derivation. Zero Deferred Ideas shipped.

**No overclaim was found in any SUMMARY's headline result.** The engineering in this phase is
unusually honest: every plan caught at least one gate in its own plan text that could not fail and
said so, and four SUMMARYs carry an explicit *"Assertions NOT RED-proved, stated plainly"* section.

### Five findings — none fixed, by design

A reviewer who fixes is no longer independent. All five are in `STATE.md` § Pending Todos.

| # | Sev | Finding |
|---|---|---|
| **F-1** | medium | A **raw NUL byte** at `src/utils/compositionText.test.ts:139` makes git classify the file **binary**, so **all 333 lines were invisible in `git diff 0df7fff..HEAD`** — the artifact this review is built on — and `grep -I` silently skips it. The test's *intent* is good; the *encoding* is the defect. |
| **F-2** | low | Same defect twice more, `src/utils/storage.test.ts:1093,1136`. Past git's sniff window, so lower impact. |
| **F-3** | medium | `04-13-SUMMARY.md:673-674` proves Live Invariant 3 with an **unquoted** grep that under zsh never runs, and which — run correctly — returns **ten** hits. **The invariant is intact** (re-verified independently); **the proof is void.** |
| **F-4** | low | **CD-9 was never assigned to a plan.** `.planning/config.json` still says `techStack.decided: false`, `phases: 3`, and lists **`html2canvas`** among its candidates. |
| **F-5** | info | `04-15`'s supply-chain gate is **faithful** (transcription verified against `git show 0df7fff:package.json`) but compares four JSON objects, not bytes. Task 1's gate closes the gap; **the two are complementary — do not delete either as redundant.** |

---

## Task 3 — the owner gate: eight cells, zero performed

**Proceeded past, as `04-AUTHORIZATION.md` directs. Not one cell was passed.**

The authorization on file is a **blanket, in-advance, sight-unseen proceed-authorization**, granted
2026-08-06 *before* any Phase 4 code was written. Per Immutable Safety Constraint 8, in these exact
words: it **authorizes proceeding**, it is **not a content review**, and it is **not hash-bound**.
It converts a `human-verify` gate into *proceeding past* it and **never into a pass on any cell**.

| # | Cell | Result |
|---|---|---|
| 1 | A9 screen-reader | **NOT PERFORMED** |
| 2 | A10 physical 200% zoom | **NOT PERFORMED** |
| 3 | A11 dark-theme visual review | **NOT PERFORMED** |
| 4 | A12 latin-ext diacritic export (opening the PNG and looking at the glyphs) | **NOT PERFORMED** |
| 5 | A13 the rail at ≥1200px (D-5) | **NOT PERFORMED** |
| 6 | G-3 rework judgement | **NOT PERFORMED** |
| 7 | Cartographic resemblance | **NOT PERFORMED** |
| 8 | PNG-vs-screen differences | **NOT PERFORMED** |

**Eight of eight.** `grep -c "NOT PERFORMED"` over the eight rows returns 8; no cell was silently
upgraded. **None cites a Phase 3 result, and none may** — every one of the eight is among Phase 3's
nine never-performed cells. **Writing PASS into a cell nobody executed would be fabricating
evidence.**

---

## Task 4 — the close-out

**`04-ACCEPTANCE.md`** records the eight cells, the authorization type in the words of Immutable
Safety Constraint 8, both Chrome versions, and — as named items — **`U-6` shipping unreviewed**,
the G-1 legend move, and the one-way saved-composition appearance change. It also tabulates, per
cell, *what automation actually established and what it does not*, so no reader mistakes a green
gate for a physical check.

**`04-VALIDATION.md`** — `status: validated`, `nyquist_compliant: true`, **set after and on the
independent review's evidence**, with three qualifications carried inside the file: the flags
measure automated sampling density only; the decision-coverage gate is **INCONCLUSIVE**
(`could-not-parse`, `D-NN` vs `D4-NN`), never passed; and three of its manual-only rows are
`04-ACCEPTANCE.md` cells that were not performed.

**`03-UAT.md`** — G-2 **annotated, never rewritten.** The Phase 3 text is retained verbatim above a
dated annotation recording that `04-14` tested it first-ever and that *"15–32 chars should refuse"*
is **wrong as written**: it is a **`medium`-size trap**, and the same 15-character label
**exports clean at `small`**.

**`STATE.md` and `ROADMAP.md` — hand-edited with scoped `Edit` calls: 14 and 3 targeted hunks
respectively, verified by `git diff -U0 | grep -c '^@@'`. Neither was rewritten wholesale.**
**None of `state.advance-plan`, `state.update-progress`, or `roadmap.update-plan-progress` was
invoked at any point in this session.**

`STATE.md` says, in those exact words, that the phase is **shipped at code level and physically
unverified** — the phrase appears five times, including in the frontmatter `stopped_at`.

**`CLAUDE.md`** — routing updated for the composition layer stack, the `Map style` tool, the five
new util/constant modules, the export clone honouring composition border weights, the latin-ext
second asset, V3 storage and its 48 % → 17 % headroom fall, the chrome-free two-form legend,
195-vs-207, and the ceiling at **337**. **Two "Last updated" entries kept — the two oldest were
merged in the same edit**, per Rule 3. **No physical check is described as performed anywhere.**

---

## Deviations from Plan

### `[Rule 2 — missing critical functionality]` The gate needed a second half the plan did not specify

The plan asked for a range diff. A range diff alone **passes with an unstaged install sitting in
the working tree** — it compares two commits and cannot see the tree. A `git status --porcelain`
assertion was added alongside it. The RED proof confirms they are independent claims: the committed
mutation reddened the range half and left the working-tree half green.

### `[Rule 2]` An anti-vacuity anchor the plan did not ask for

`git diff <sha>..HEAD -- package.json` returns empty output both when nothing changed **and** when
the pathspec resolves to nothing (a runner invoked from a subdirectory). The second is a vacuous
pass of exactly the shape this phase kept finding. A floor asserting the range contains
`src/utils/ramps.ts` was added and **separately RED-proved** by collapsing the range.

### `[Reported, not silently resolved]` CD-10 was owned by `04-03`, not `04-11`

`04-16-PLAN.md` Task 2 § 8 and `04-RESEARCH.md:1592` both name `04-11` as the owner of the stale
kosovo debug artifact. **`04-03` resolved it two waves earlier** (`cb8321a`) — tracked, and
annotated `SUPERSEDED` above the retained original conclusion. Verified this session. Earlier and
better than planned; recorded so the discrepancy is not read as an unmet obligation.

### `[Reported]` `04-08`'s proof C reddens 2 assertions here, not the 3 recorded

My mutation was narrower than the original (the `none` branch alone, not the whole pre-`04-08`
hard-set). A mutation-scope difference, **not** evidence of an overclaim — the claim reddens on its
own subject either way. Recorded rather than smoothed over.

---

## Known Stubs

**None introduced by this plan.** It ships no product code — one test case, two review documents,
and status-file edits.

---

## ⚠ Assertions NOT RED-proved, stated plainly

- **The browser-scope statement is prose, not a gate.** It is a *recorded fact* verified by
  inspection (`--version`, the absence of `Microsoft*.app`, the Playwright cache contents), not an
  assertion that can be made to go red. The plan asked for it to be *stated rather than inferred*,
  and it is. **It is not claimed as a proof.**
- **`04-ACCEPTANCE.md` and `04-16-REVIEW.md` carry no executable assertion.** They are records.
  Their integrity rests on the review's re-run evidence, not on a gate.
- **The five review findings were not gated.** F-1 and F-2 would be cheap to gate (a `file`-based
  check over `git ls-files`, which is how both were found), but **writing that gate would be
  fixing, and the reviewer must not fix.** It is handed forward as the suggested closure.

---

## Verification

Full gate, run on this working tree, **real output**:

| Command | Result |
|---|---|
| `npm run lint` | exit 0, clean |
| `npm test` | **875 passed (875)**, 47 files, 2.83s |
| `npm run build` | exit 0, `✓ built in 106ms` |
| `npm run test:e2e -- --project=chrome` | **138 passed (2.9m)**, exit 0 |
| `npm run data:world:check` | PASS — 248 units, 195 selectable core states, 207 colorable units, mesh 327 geometries / 366,767 B |
| Selector ceiling | **337** (unchanged — this plan added no CSS) |

**Baseline was 873/873 unit and 138/138 Playwright. Nothing is below baseline**; unit rose by
exactly this plan's two cases.

**Installed Chrome 151.0.7922.76.** Edge is **not installed** and cannot be launched; Firefox and
Safari have never been run here. **No result from any of them is claimed.**

---

## Self-Check: PASSED

**Files claimed created — verified present:**

- `FOUND: .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-16-REVIEW.md`
- `FOUND: .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-ACCEPTANCE.md`
- `FOUND: .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-16-SUMMARY.md`

**Commits claimed — verified in `git log`:**

- `FOUND: 0653333` — `test(4-16): prove zero installs with a range diff, not a working-tree one`
- `FOUND: d616463` — `docs(4-16): independent non-author review of the phase aggregate diff`
- `FOUND: 3a56c53` — `docs(4-16): close phase 4 honestly — eight cells NOT PERFORMED, status by hand`

**Claims re-checked rather than assumed:**

- `git log --oneline --all | grep 0ad9672` → **absent.** The RED-proof mutation commit is gone.
- `git diff 0df7fff..HEAD -- package.json package-lock.json | wc -l` → **0**.
- `grep -c '^| \*\*[0-9]\*\*.*NOT PERFORMED' 04-ACCEPTANCE.md` → **8**, and
  `grep -o '^| \*\*[0-9]\*\*'` returns cells **1 … 8** — so all eight *cell rows* carry it.
  **The row-scoped count is the load-bearing one.** A bare file-wide `grep -c` returns **11**,
  because the phrase also appears in the header, the frontmatter, and the close-out; quoting 11 as
  "the cells" would be the loose kind of number this project distrusts, and quoting 8 without
  saying it is row-scoped would be luck rather than measurement.
- `grep -i "shipped at code level and physically unverified" .planning/STATE.md` → **5 hits**.
- `git diff -U0 .planning/STATE.md | grep -c '^@@'` → **14**; `ROADMAP.md` → **3**. Scoped hunks.
- `grep -c "^\*Last updated:" CLAUDE.md` → **2**.
- Neither `state.advance-plan`, `state.update-progress`, nor `roadmap.update-plan-progress` appears
  anywhere in this session's commands.
