---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "36"
subsystem: documentation
tags: [authority-docs, patch-application, mechanical-apply, hash-verified, supersession]
requires: ["02-25"]
provides:
  - CLAUDE.md
  - .planning/coding-rules/general.md
  - .planning/REQUIREMENTS.md
affects: []
tech-stack:
  added: []
  patterns: ["non-destructive requirement supersession annotation"]
key-files:
  created: []
  modified:
    - CLAUDE.md
    - .planning/coding-rules/general.md
    - .planning/REQUIREMENTS.md
decisions:
  - "Byte identity proven by regenerating the diff after applying and hashing it — the regenerated diff's SHA-256 equals the artifact's."
  - "Two pre-existing broken routing rows in CLAUDE.md were deliberately NOT fixed: hand-editing outside the approved bytes would destroy the very byte-comparison proof that mitigates T-02-80. Logged to deferred-items.md instead."
  - "Authorization to apply is the owner's blanket advance approval, recorded as not hash-bound and not a content review."
metrics:
  duration: ~20 min
  completed: 2026-07-26
---

# Phase 02 Plan 36: Apply Approved Authority-Docs Patch B Summary

`CLAUDE.md`, `general.md`, and `REQUIREMENTS.md` now describe the project as it actually is —
Phase 2, browser-only, no deploy target, fallible storage, automated tests — applied mechanically
from the approved artifact, with Phase 1's release evidence preserved rather than rewritten.

## Approval status — recorded precisely

**Authorization to proceed exists. Content review by the owner does not.**

- The owner's approval for this patch was **blanket, given in advance, and sight-unseen**, before
  the patch existed.
- Patch B's SHA-256 was computed **after** that approval was given. The approval is therefore
  **not hash-bound**, and must never be described as such.
- Plan `02-25`'s Task 2 — full display of both patches plus explicit per-hash approval — **was not
  executed**. No such display or per-hash confirmation took place.
- The owner has since explicitly instructed that execution proceed to completion. That is what
  authorizes applying this patch, and it is the only authorization claimed here.

This matters more for Patch B than for Patch A, because Patch B is the one that writes judgement
calls into `REQUIREMENTS.md`: which F3/F7 items count as "satisfied by a different mechanism"
versus "deliberately not built", and the NFR3 annotation that restates a still-open decision.
**Those judgements are unreviewed.** Nothing in this summary converts the pre-approval into a
content review. The phase's immutable safety constraints forbid inferring or fabricating approvals
and forbid executor self-approval; naming the limits of the authorization is how they are respected.

## Hash verification — before applying

| Value | Result |
|---|---|
| Recorded in `02-25-SUMMARY.md` | `460656f2bc3b60ca404e70ac9acffb36176d02ebcf07f50a19ca934c708439a1` |
| Computed on the artifact at HEAD `2b7058b` | `460656f2bc3b60ca404e70ac9acffb36176d02ebcf07f50a19ca934c708439a1` |
| **Match** | **Exact** |

The `.gitattributes` `*.patch text eol=lf` pin from `02-25` (`6975adf`) held — no CRLF drift.

## Application and byte proof

1. `git apply --check --whitespace=error-all` — clean.
2. `git apply --whitespace=error-all` — applied once, mechanically. **No hand edits.**
3. `git status --short` — exactly the three target files, all `M`. Nothing created, nothing deleted.
4. `git diff --no-color` regenerated and compared to the artifact: **byte-identical**.
5. The regenerated diff was itself hashed:
   `460656f2bc3b60ca404e70ac9acffb36176d02ebcf07f50a19ca934c708439a1` — **equal to the approved
   artifact hash.**

`git diff --stat`: 3 files changed, 250 insertions(+), 50 deletions(-). Combined with `02-26`,
**exactly 8 files changed across both patches**, with no file appearing in both.

## Coherence verification — not merely "it applied"

**The contradiction `02-25` identified is actually gone.** `general.md` asserted "LocalStorage is
guaranteed. Don't feature-detect" while `src/utils/storage.ts` returns typed reasons on every
entry point. The claim is now struck through (`~~…~~`) and followed by a correction naming
`storage-unavailable` and `quota-exceeded`. Both strings were checked against `storage.ts` and
match the literals the code actually returns — the rule cites the real union, not an invented one.
The stale "E2E via manual user flows … Playwright in Phase 3" guidance is likewise superseded by a
tier table that matches the real runners.

**`CLAUDE.md`'s command block is real.** All seven commands it lists (`dev`, `build`, `preview`,
`lint`, `test`, `test:e2e`, `data:world:check`) exist in `package.json`. `vercel deploy` is gone
and replaced with an explicit "There is no deploy command" note.

**Every source and data path `CLAUDE.md` routes to exists** — all 12 checked (`world-modern.geojson`,
`world-manifest.json`, `snapshots/index.json`, `europe-modern.geojson`, `snapshots.ts`,
`mapProjection.ts`, `export.ts`, `legend.ts`, `storage.ts`, `phase2CssContract.test.ts`,
`tests/e2e/support/`, `.continue-here.md`). **Two documentation rows do not** — see the finding below.

**Footer hygiene holds.** `CLAUDE.md` carries exactly 2 `Last updated:` entries (lines 199–200);
the two other matches are the Update Process rule *stating* the two-entry requirement, not footer
entries. `general.md` went from 1 to 2. All six rule files are now compliant.

**`REQUIREMENTS.md` history is preserved, not rewritten.**

- `## Phase 1 Release Acceptance` (line 214) is **untouched** — every patch hunk lands above it.
- No requirement checkbox was newly ticked. F3.1–F3.5 and F7.1–F7.3 receive prose annotations
  beneath preserved verbatim text; none gains an `[x]`.
- **F2.1–F2.5 remain explicitly not complete.** Patch B does not touch the F2 block at all, and
  the existing header there still reads "**Not** marked complete." No `requirements mark-complete`
  was run for F2.1/F2.2 despite the plan frontmatter listing them, because the historical chain is
  deferred and marking them would misstate delivery.
- NFR3 is annotated as an **open owner decision** — "neither passing nor failing, and must not be
  recorded as either" — which is honest about a decision that is genuinely still open.

**Scope guard honored.** `CLAUDE.md` now states outright that historical geometry does **not**
ship, that the packets are deferred for **missing rights-cleared archival source material — not
pending a signature**, and that the approved catalog holds exactly `Modern`. It adds the
evidence-not-inference guardrail and the ban on executor self-approval. Nothing promotes historical
geometry; the evidence bar is raised, never softened. The browser-only/localhost-only constraint is
stated in both `CLAUDE.md` and `general.md`, and `general.md`'s forbidden-patterns section now bans
any runtime third-party network request.

**No rule is stated twice in two files.** The nearest case is the no-refresh-the-page rule, in
`export.md` (export refusal table) and `general.md` (app-wide). `general.md` explicitly generalizes
it — "This applies to *every* message in the app, not just export copy" — so this is deliberate
scoping with a clear owner, not duplication.

## Finding: two `CLAUDE.md` routing rows point at files that do not exist

`.planning/codebase/STRUCTURE.md` and `.planning/PHASE2_PLANNING.md` are both routed to and
neither exists. `git log --all` on both paths returns **nothing** — neither has ever been
committed — and both rows were already present in `CLAUDE.md` at HEAD before Patch B ran. Patch B
rewords the `PHASE2_PLANNING.md` row to "Superseded … Historical interest only," which is accurate
about its status but still presents it as a readable document.

**Deliberately not fixed here.** This plan's `must_haves` require the three targets to change
**only by the exact approved Patch B bytes**, and threat `T-02-80` is mitigated specifically by
regenerated-diff byte comparison. Editing a row outside the approved bytes would have destroyed
that proof — it is precisely the drift the mitigation exists to detect. The defect is also
pre-existing and so falls outside the executor scope boundary.

Logged to [`deferred-items.md`](deferred-items.md) with two resolution options for a follow-up.

## Gates

Documentation-only changes, so the product gates should be unaffected. Confirmed, not assumed:

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | clean, exit 0 |
| TypeScript | `npx tsc -b --pretty false` | clean, exit 0 |
| Unit suite | `npm test` | **516/516 passed, 38 files** |
| Build | `npm run build` | succeeded (pre-existing >500 kB chunk warning only) |

516/516 matches the `02-25` baseline and the `02-26` run exactly.

Playwright E2E was **not** re-run. Per `CLAUDE.md`'s own gate rule it is required for changes
touching render, camera, export, persistence, or layout — this plan touches none of those, and no
file under `src/` or `tests/` changed.

## Deviations from Plan

**None affecting the applied bytes.** The patch applied cleanly on the first attempt and the
regenerated diff was byte-identical.

Two method notes:

1. The plan's `<action>` says "preserve before copies." Not needed and deliberately skipped — the
   tree was clean at HEAD `2b7058b`, so git held the pristine copies, and byte identity is what
   establishes correctness. No `git checkout --` was run against any file with uncommitted work,
   per the git-safety rule this very patch adds.
2. The plan's `<verify>` names `npm test` and `npm run build`; `npx tsc -b` was added because the
   objective required it. It passed.

## Self-Check: PASSED

- `CLAUDE.md` — FOUND, modified
- `.planning/coding-rules/general.md` — FOUND, modified
- `.planning/REQUIREMENTS.md` — FOUND, modified
- Commit `ebbb31a` (Patch B application) — FOUND
- Artifact hash matched before applying; regenerated diff hash matched after
- Exactly 3 files changed; no tracked file deleted; no untracked file left behind
- `Phase 1 Release Acceptance` present and unmodified; F2.1–F2.5 not marked complete
