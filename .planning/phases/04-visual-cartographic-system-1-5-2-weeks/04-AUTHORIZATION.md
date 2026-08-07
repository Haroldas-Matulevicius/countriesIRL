---
phase: 04-visual-cartographic-system-1-5-2-weeks
type: authorization-record
granted: 2026-08-06
granted_by: owner (matulevicius777@gmail.com)
authorization_kind: blanket-in-advance-sight-unseen-proceed
is_content_review: false
is_hash_bound: false
covers_physical_verification: false
---

# Phase 4 — Authorization Record

> **Why this file exists.** Phase 2's gate `02-25` is still open largely because nobody wrote down
> *which kind* of authorization had been given, and the patch hashes were computed after the fact.
> This file is written **before** execution so that no later reader — including `04-16`'s
> independent review — has to infer it.

## What was granted

On **2026-08-06**, before any Phase 4 code was written, the owner instructed:

> *"I do not want any checkpoints that interfere with my work right now … don't ask me questions,
> just continue doing this as if I am not here, find best solution to stuff."*

This is a **blanket, in-advance, sight-unseen proceed-authorization**.

Per CLAUDE.md § Guardrails and Immutable Safety Constraint 8, that means, in these exact words:

- It **authorizes proceeding**.
- It is **not a content review**.
- It is **not hash-bound**.

The owner did not see, and has not reviewed, any of the artifacts this phase produces.

## What it does cover

The **six `checkpoint:decision` gates**. The orchestrator selects an option at each, records the
option id and the reasoning in the plan's SUMMARY.md, and continues without stopping.

| Gate | Plan | Subject | Resolution |
|---|---|---|---|
| 1 | `04-01` T2 | Water preset list · Map-style undo | `preset-set-a` + `undo-b-reset-action` — decided 2026-08-06, see `04-01-SUMMARY.md` |
| 2 | `04-03` T?  | D4-10 — twelve neutral units become colourable (**one-way**) | decided at wave 2 |
| 3 | `04-05` T?  | D4-02 — `{rampId, t}` as primary colour identity | decided at wave 3 |
| 4 | `04-11` T?  | Text-tool home · the one-ink deviation (U-6) | decided at wave 8 |
| 5 | `04-12` T?  | D4-11 — delete legend box chrome (**one-way**) | decided at wave 9 |
| 6 | `04-14` T?  | D4-17 — V2 records adopt the new look (**one-way**) | decided at wave 11 |

Most of these re-confirm decisions the owner **already made** in `04-CONTEXT.md`
(`D4-01`…`D4-18`, 18/18). Where a gate merely re-confirms a recorded decision, proceeding on that
recorded decision is the grounded answer, not an invention. Where a gate carries a genuinely open
sub-question, the orchestrator takes **the spec's own recommendation** unless it measurably
conflicts with a Live Invariant, and says which it did.

### Three one-way consequences, accepted under this authorization

1. **`D4-10`** — selectable core state count moves **195 → 207**.
2. **`D4-11` / `D4-17`** — legend box chrome is deleted from `LegendState`, and V2 records adopt the
   new look. **A saved composition changes appearance when reopened**, and its export will differ
   from a PNG the creator already posted.
3. `ROADMAP.md § Phase 5 05-02` contradicts `D4-10` and must be amended, not left in silent
   disagreement.

## What it does NOT cover — and cannot

**The two `checkpoint:human-verify` gates.** A blanket authorization converts to *proceeding past*
these gates. It does **not** convert to a pass on any cell.

| Gate | Plan | Handling |
|---|---|---|
| `04-13` T4 | G-1 resolution · mixed-map default | Proceed. Mixed-map defaults to **Bar** (the planner's recommendation, and `04-UI-SPEC.md` is explicit that it is a recommendation, not a decision). **`OQ-3` and `OQ-5` stay OPEN.** No claim is made that G-1 is resolved. |
| `04-16` T3 | The eight physical checks | Proceed. **All eight cells are recorded `NOT PERFORMED`** in `04-ACCEPTANCE.md` unless a human actually performs one. The phase closes as **shipped at code level and physically unverified**, and `STATE.md` says so in those words. |

The eight cells are: A9 screen-reader · A10 physical 200% zoom · A11 dark-theme visual review ·
A12 latin-ext diacritic export (opening the PNG and looking at the glyphs) · A13 the rail at
≥1200px (D-5) · G-3 rework judgement · cartographic resemblance · PNG-vs-screen differences.

**Writing PASS into a cell nobody executed would be fabricating evidence.** None of these may cite
a Phase 3 result — nine of Phase 3's twelve UAT cells, including every one of these, were never
performed and cannot be inherited.

## Standing rules that this authorization does not relax

The owner authorized *not being asked*. They did not authorize lowering any evidence bar. All of
the following remain in force and are unaffected:

- **A gate must be able to fail on its own subject.** Every new assertion is RED-proved by breaking
  its subject and restored by scratchpad copy-back. If an assertion cannot be made to go red, the
  SUMMARY says so plainly instead of claiming it passes.
- **No historical geometry is promoted.** No rights, factual, or topology approval is implicated by
  anything in this phase. `D4-10` is a product-policy change on already-shipped, hash-verified
  Modern geometry and **must never later read as a bypassed approval**.
- **Browser scope is installed Chrome only.** Edge is not installed on this machine; Firefox and
  Safari have never been run. No result from any of them may be produced or cited.
- **`state.advance-plan`, `state.update-progress`, and `roadmap.update-plan-progress` are never
  run.** `STATE.md` and `ROADMAP.md` are edited by hand with scoped edits.
- **Independent non-author review of the aggregate diff still happens** (`04-16` Task 2). Executor
  self-reports are not trusted for integration; that rule was earned by five real defects.

## How to revoke or revisit

The owner can reverse any decision recorded here. Each gate's chosen option id and reasoning is in
the corresponding `04-NN-SUMMARY.md`, so a single decision can be revisited without unpicking the
phase. The two one-way persistence decisions (`D4-11`, `D4-17`) are the exceptions worth knowing
about: reversing them after a creator has reopened and re-saved a composition does not restore the
original record.
