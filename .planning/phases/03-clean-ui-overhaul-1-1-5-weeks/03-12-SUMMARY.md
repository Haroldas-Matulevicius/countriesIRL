---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 12
subsystem: review
tags: [review, independent-review, gate-evidence, browser-scope, honesty-audit]
status: complete

dependency-graph:
  requires:
    - plan: 03-01..03-11
      provides: "the aggregate Phase 3 diff under review, eleven summaries with 60+ captured RED probes, and the acceptance-02-28 tag that makes the range meaningful"
  provides: "03-12-REVIEW.md — the independent findings ledger, the 28-row assertion ledger, the 36-row decision coverage table, the measured Chrome gate numbers, and the honest browser-scope statement"
  affects:
    - "the Phase 3 close-out decision: the phase is engineering-complete but PHYSICALLY UNVERIFIED, and four findings remain open"
    - ".planning/coding-rules/general.md and frontend.md — three retired html2canvas rationales corrected (F-3)"

tech-stack:
  added: []
  patterns:
    - "A review verify command is itself a gate, and can itself be a gate that cannot fail — two of this plan's four were"
    - "The review range acceptance-02-28..HEAD is WIDER than Phase 3: 91 commits, of which only 56 are Phase 3 execution"

key-files:
  created:
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-REVIEW.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-SUMMARY.md
  modified:
    - .planning/coding-rules/general.md
    - .planning/coding-rules/frontend.md

decisions:
  - "Reviewer configuration is `independent`: a fresh agent session that authored none of the 91 commits under review. Confirmed structurally AND evidenced with git authorship, not asserted."
  - "The owner authorization held is a BLANKET, IN-ADVANCE, SIGHT-UNSEEN PROCEED-AUTHORIZATION — not a content review, not hash-bound (Immutable Safety Constraint 8)."
  - "STATE.md and ROADMAP.md were deliberately NOT touched, on orchestrator direction, despite being in the plan's files_modified."
  - "F-3 was FIXED in this plan rather than only reported, because a coding-rules file that names a removed rasteriser as the live reason will mislead Phase 4. The fix is attributed in the review and re-verified."
  - "F-2, F-4, F-5, F-6, F-7 and F-8 were reported and NOT fixed — each needs a decision or a change outside a review plan's authority."

metrics:
  duration: "~1 session"
  completed: 2026-08-06

actuals:
  tokens: 39000
  tasks: 4
  commits: 3
---

# Phase 3 Plan 12: Independent Review Summary

Independent non-author review of the aggregate `acceptance-02-28..HEAD` diff at `6b1032c`: the
full gate re-run and measured on Chrome, all 28 UI-SPEC assertions traced to a captured RED proof,
all 36 decisions traced to evidence, eleven findings recorded — including **two gates that cannot
fail, both inside this plan's own verify block** — and the phase's total absence of physical
verification stated plainly rather than papered over with green numbers.

## What was produced

`.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-REVIEW.md` (616 lines), carrying every
section the plan's `<output>` requires: `Reviewer independence`, `Findings ledger`,
`Live Invariants (9)`, `Immutable Safety Constraints (10)`, `Scope-reduction audit`,
`Cross-plan interaction hazards`, `Assertion ledger (28)`,
`Decision coverage (D-01…D-35, D-34a)`, `Vendoring requirements (R-V1, R-V2)`,
`Gate evidence (numbers)`, and `Browser scope — Chrome only; Edge not certified — not installed`.

## Checkpoint: Task 1 — reviewer independence (`checkpoint:decision`, gate `blocking`)

**Selected: `independent`.** Verified rather than asserted, on three legs:

1. **Structural.** Each of `03-01`…`03-11` executed in a separate subagent with its own fresh
   context. This review ran in a twelfth, newly spawned agent whose entire knowledge of Phase 3
   came from reading the repository.
2. **Evidenced.** `git log --format='%an %ae' acceptance-02-28..HEAD` → 91 commits across two
   author identities, all pre-existing. Enumerated in the review.
3. **Explicit.** The reviewer authored none of the commits under review, and said so in the record.

### Owner authorization — recorded for what it is

The owner was asleep and had given, verbatim, *"I am going to sleep, so if something comes up, find
best solution."* and *"I want you to complete this fully."*

This is a **BLANKET, IN-ADVANCE, SIGHT-UNSEEN PROCEED-AUTHORIZATION**, dated 2026-08-06. It
authorizes proceeding. It is **not** a content review and it is **not** hash-bound (Immutable
Safety Constraint 8). **The owner reviewed no content, inspected no diff, and performed no
physical check of any kind.** The review says this in its own header, and this summary repeats it
so neither document can be read alone and misunderstood.

## Gate evidence — measured, not quoted

Every number below was produced by re-running the command in this session against `6b1032c`.
None was copied from a plan summary.

| Gate | Result |
|---|---|
| `npm run lint` | **PASS** — exit 0, no diagnostics |
| `npm test` | **PASS** — **42 test files, 637 tests, 637 passed, 0 failed** |
| `npm run build` | **PASS** — 1068 modules; Inter woff2 emitted at 48.43 kB |
| `npx playwright test --project=chrome` | **PASS** — **103 tests, 103 passed, 0 failed**, 13 spec files, 2.1m |
| `npm run data:world:check` | **PASS** — 248 units, 195 selectable core states |

**Browser scope: Chrome only — Chrome 151.0.7922.75, recorded by hand and not machine evidence.
Edge not certified — not installed.** `/Applications` holds no `Microsoft*.app` and
`~/Library/Caches/ms-playwright` holds only `ffmpeg-1011`, so the `msedge` project
(`channel: 'msedge'`) cannot launch. Firefox, Safari, and previous-version certification have
never been run in this repository and are not claimed. No Phase 2 Edge record was cited (D-33).

## Findings — eleven, by severity

| # | Sev | One line |
|---|---|---|
| F-1 | HIGH (by design; needs UAT) | Legend labels over **20/14/12** chars are now export-blocked; at the default size the effective ceiling went from unreachable to **14**. Verified in `src/utils/legend.ts:86-92,560-565`. |
| F-2 | MEDIUM | Assertion 24 **cannot** fail on the token defect the UI-SPEC advertises for it — the export frame lives outside `.dark`'s scope. Assertion 4 is the only token guard. `03-UI-SPEC.md:1091` still reads otherwise. |
| F-3 | MEDIUM | Three coding-rules sentences named `html2canvas` as live shipped behaviour. **Fixed in this plan.** |
| F-4 | MEDIUM | `CLAUDE.md:21` and `.planning/STATE.md:36` still list `html2canvas` in the stack. **Not fixed** — outside this plan's edit authority. |
| F-5 | LOW (gate that cannot fail) | `03-12-PLAN.md:208`'s scope-reduction command exits 1 on two false positives, unconditionally. |
| F-6 | LOW (gate that cannot fail) | `03-12-PLAN.md:432`'s Phase 2 evidence guard compares the working tree to HEAD, so a *committed* change to Phase 2 evidence passes silently. |
| F-7 | LOW | `persistence.spec.ts` and `phase2-composition.spec.ts` import the harness **and still** shadow five of its exports. |
| F-8 | LOW | `MapEditorProps.dataBasePath` is unvalidated — a host could point it cross-origin, which the Forbidden Patterns ban. |
| F-9 | INFO | "Shorten this label" is the wrong advice for an empty label; unreachable through the UI. |
| F-10 | INFO | Production `export.ts` reads a test-only `globalThis` seam — accepted, because assertion 25's pixel half cannot go RED without it. |
| F-11 | INFO | The review range is wider than Phase 3: 35 of 91 commits predate execution, six of them touching Phase 2's evidence directory. |

**The two gates that cannot fail are both in this plan's own verification, not in shipped code.**
F-6 is the more serious: it purports to guard T-03-61 (Phase 2 evidence altered) and cannot. The
correct check was run instead — `git diff --stat 2b15bc7..HEAD -- .planning/phases/02-…/` is
**empty**, so Phase 3's planning *and* execution changed nothing in Phase 2's evidence.

## What the review verified, and what it disconfirmed

**All 28 assertions exist, are bound to an owning plan, and carry at least one captured RED
proof.** Assertion 24 carries the **two** proofs the plan required — `03-09`'s and `03-11` Task 7
probe 9B's re-proof against the replaced rasterisation path — so no row cites only `03-09`.
Assertion 25 was verified property by property in the tree: rasterised pixels, crop bounds derived
from `resolveLegendRender`, a content floor asserted *before* the inequality, and a blank-crop
discrimination control.

**All 36 decisions (D-01…D-35 plus D-34a) are IMPLEMENTED. No MISSING rows.** The single deviation
is a *widening* — `Move Map` retained as a fourth floating control against D-21's three, on NFR11
keyboard-access grounds, with its condition recorded.

**The honesty audit found zero overclaims** across eleven summaries, `Design.md`, and the
coding-rules files. No physical, visual, or screen-reader check is claimed anywhere; every Edge /
Firefox / Safari mention is a negative statement; no historical snapshot is described as shipped;
no blanket approval is dressed up as a content review. `03-02-SUMMARY.md:97` states the
authorization's true nature outright.

**Three executors reported that a *prescribed* RED probe failed to redden its subject** rather than
repeating the plan's premise (`03-03` on assertion 11; `03-09` and `03-11` on assertion 24), and
`03-08` proved the **approved UI-SPEC's own placement formula** wrong at every gate viewport. That
is the "a gate must be able to fail" constraint working as designed.

## Deviations from Plan

### 1. [Orchestrator-directed] `STATE.md` and `ROADMAP.md` were NOT touched

The plan's `files_modified` lists `.planning/STATE.md` and `.planning/ROADMAP.md`, and Task 4
step E directs hand-editing both. **The orchestrator explicitly directed that neither be touched**,
because it hand-writes them at close-out — this repository's `CLAUDE.md` records that the gsd-sdk
tracking verbs have already zeroed its progress counters and deleted its activity log.

This was honoured exactly: neither file was read for modification, neither was staged, neither was
committed, and **none of `state.advance-plan`, `state.update-progress`, or
`roadmap.update-plan-progress` was run.** `git status` confirms both files unmodified.

**Consequence the orchestrator must absorb.** Two items the plan directed into `STATE.md`
§ Pending Todos are therefore **not filed**, and are carried here instead:

1. **The Phase 2 Edge-record contradiction** — filed **against Phase 2**, as an *annotation* task
   and never a rewrite. Until it is explained, no phase may cite it. Phase 3 did not.
2. **The OPEN ITEM 4 residual** — `storage.ts:61-63` still builds `SNAPSHOT_IDS` from all five
   catalog entries, and the record validator at `:483-484` still admits any of them. **Only the
   presentation layer is filtered**, by the approved-id filter `03-07` added to
   `getPeriodShortLabel`. **A presentation filter is not a validator fix.** Reaching the behaviour
   requires hand-editing browser storage, so it is a weak, local exposure and **not** a path by
   which a deferred snapshot becomes reachable. It is pre-existing Phase 2 behaviour, not a Phase 3
   regression.

Both are written out in full in `03-12-REVIEW.md` (§ Immutable Safety Constraints constraint 3, and
§ OPEN ITEM 4) so the wording is available to copy verbatim.

### 2. [Rule 2 — missing critical correctness] F-3 was fixed, not only reported

Task 2 step G says "do not fix code in this task; a fix is a separate, attributed change." No code
was fixed. But three `coding-rules/*.md` sentences presented `html2canvas` as live shipped
behaviour, and those files are read before every change in this repository — leaving them would
have handed Phase 4 a retired rasteriser as the stated reason for two live bans.

The fix is surgical (three sentences; the rules themselves unchanged), attributed to this reviewer
in the review's own § Changes made by this review, committed separately (`f16f8f5`), and
re-verified afterwards: `eslint` clean, **637/637** unit green. `CLAUDE.md` and `STATE.md` carry
the same error and were **left alone** (F-4) because they are outside this plan's edit authority.

### 3. [Recorded, not fixed] Two of this plan's four verify commands cannot pass or cannot fail

F-5 and F-6. Both were worked around by running a corrected equivalent, and both results are
recorded with their evidence. The plan file itself was not edited.

## Phase 3 has ZERO physical verification

Stated plainly here as well as in the review, because it is the single most important fact about
this phase and a green gate is very good at hiding it.

**Nobody has looked at any of it.** Not the restyled editor, not the light theme, not the dark
theme, not the tool rail, not the flyout panel, not the bottom bar or bottom sheet, not the map
tooltip, not the floating camera cluster, and **not one exported PNG**. No touch-target check, no
screen-reader pass, no visual judgement, by anyone, at any point in Phase 3.

Every result in this plan is automated. Immutable Safety Constraint 8 forbids substituting an
automated result for a physically performed check, and nothing here does. `Design.md` § 7 is still
marked `[FOR REVIEW]` at `Design.md:396` and has never been reviewed (deferred item D-3).

## Verdict

**Phase 3 achieved its goal.** The clean UI overhaul is implemented end to end — token system,
shell grid, mountable editor boundary, tool rail and single flyout, panel migration, map chrome,
narrow-width arrangement, stylesheet split, and full ownership of the SVG→PNG export path with
`html2canvas` removed. 36/36 decisions implemented, 28/28 assertions RED-proven, full gate green
on Chrome.

**It is not finished, and must not be recorded as if it were.** The phase is **engineering
complete, physically unverified**, with F-1, F-2, F-4, F-5, F-6, F-7 and F-8 open. The
recommendation in the review is to open a Phase 3 acceptance gate for the owner in the same shape
as `02-28`, covering both themes, the rail and flyout, the bottom bar and sheet, the map tooltip,
the floating cluster, a real legend label at each of the three sizes, and a downloaded PNG opened
and looked at.

`02-25` and `02-28` remain OPEN and untouched. `acceptance-02-28` still points at
`fe5f946060707c48c3d9591d368b5f3f8f90dd4d`. `public/data/` is byte-unchanged. No deployment exists
or is claimed. No historical snapshot shipped.

## Commits

| Task | Commit | Message |
|---|---|---|
| 1–3 | `8d14c9c` | `docs(3-12): independent review of the aggregate Phase 3 diff` |
| 2 (F-3 fix) | `f16f8f5` | `docs(rules): correct three retired html2canvas rationales (03-12 F-3)` |
| 4 | *(this file)* | `docs(3-12): complete the independent review plan` |

## Known Stubs

None. This plan produced evidence documents and three prose corrections; it added no code, no
test, no placeholder, and no unwired surface.
