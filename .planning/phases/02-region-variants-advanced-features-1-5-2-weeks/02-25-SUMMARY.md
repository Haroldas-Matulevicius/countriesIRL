---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "25"
subsystem: documentation
tags: [coding-rules, authority-docs, patch-proposal, owner-gate]
requires: ["02-24"]
provides:
  - .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-CODING-RULES-PROPOSAL.patch
  - .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-AUTHORITY-DOCS-PROPOSAL.patch
affects: ["02-26", "02-36"]
tech-stack:
  added: []
  patterns: ["hash-bound mechanical patch application"]
key-files:
  created:
    - .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-CODING-RULES-PROPOSAL.patch
    - .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-AUTHORITY-DOCS-PROPOSAL.patch
  modified:
    - .gitattributes
decisions:
  - "Patches computed against current file contents, not the plan's assumptions — rules landed with their behavior all session, so most of what 02-25 was written to propose already exists."
  - "Approval recorded as blanket, advance, and sight-unseen; not hash-bound."
metrics:
  duration: ~50 min
  completed: 2026-07-26
---

# Phase 02 Plan 25: Exact Documentation Correction Proposals Summary

Two verified-applying patch artifacts (337 + 477 lines across 8 files) that correct stale and
self-contradictory guidance in the coding rules and authority documents — deliberately much
smaller than the plan anticipated, because the rules were updated alongside their behavior all
session rather than batched to the end.

## Approval status — read this before applying anything

**The owner gave blanket pre-approval, in advance and sight-unseen, before these patches
existed.** That is a real authorization to proceed to plans 02-26 and 02-36. It is **not**
evidence that anyone reviewed the content.

Stated plainly, the owner has **not** seen:

- either patch file, in whole or in part;
- the SHA-256 of either patch (both are recorded below, but they were computed *after* approval
  was given, so the approval cannot be bound to them);
- the specific wording added to `CLAUDE.md`, `general.md`, or `REQUIREMENTS.md`;
- the F3 and F7 supersession annotations, or the judgement calls inside them about which
  requirements count as "satisfied by a different mechanism" versus "deliberately not built";
- the NFR3 open-decision annotation, which restates a decision that is still genuinely open;
- the decision to treat several Phase 1 statements as *false* rather than merely outdated.

Task 2 of the plan asked for both complete patches to be displayed and both hashes explicitly
approved. **That did not happen.** No such display or per-hash confirmation took place, and this
summary must not be read as a substitute for one. The phase's immutable safety constraints forbid
inferring or fabricating approvals and forbid executor self-approval; recording the pre-approval
honestly, with its limits named, is how those constraints are respected here rather than
circumvented.

If the owner wants the review the plan originally specified, plans 02-26/02-36 should be held
until both files have actually been read.

## Artifacts

| Patch | Path | Targets | Lines | SHA-256 |
|---|---|---|---|---|
| A | `02-CODING-RULES-PROPOSAL.patch` | 5 | 337 | `78c88da4bc59c781d8c13903d9aff6f06ddd7d2b6394e6528fd946fb91835d08` |
| B | `02-AUTHORITY-DOCS-PROPOSAL.patch` | 3 | 477 | `460656f2bc3b60ca404e70ac9acffb36176d02ebcf07f50a19ca934c708439a1` |

Patch A targets `.planning/CODING_RULES.md`, `coding-rules/frontend.md`, `coding-rules/data.md`,
`coding-rules/export.md`, `coding-rules/storage.md`. Patch B targets `CLAUDE.md`,
`.planning/coding-rules/general.md`, `.planning/REQUIREMENTS.md`. No file appears in both.

## Verification performed

- Both patches pass `git apply --check --whitespace=error-all`.
- Both were **actually applied together** to a clean tree — not merely checked — producing
  exactly 8 changed files, 389 insertions, 107 deletions, then reverted.
- With both applied: `npm run lint` clean, `npm test` **516/516 passed** across 38 files,
  `npm run build` succeeded.
- All 8 source files confirmed byte-identical to HEAD after generation (`git status` shows no
  modification to any target).
- Patch hashes confirmed stable across a real delete-and-`git checkout` round-trip.

## The patches are smaller than the plan anticipated — honestly

The plan was written expecting coding rules to be updated in one batch at the end of the phase.
That is not what happened: per an explicit owner instruction, every executor updated the matching
`coding-rules/*.md` in the same commit that landed its behavior. So most of what 02-25 was
written to propose was already in the files before this plan ran.

Concretely, the following were **verified already present and deliberately not re-proposed**:
the `fs.stat({ bigint: true })` filesystem-identity rule (data.md); the both-schemes preference
media query rule and the resolved-relationship token contract (frontend.md); the positional
selector ban (frontend.md, machine-enforced); the `legendSlot`-inside-the-canonical-SVG rule
(frontend.md and export.md); the "a fixture that re-implements the wiring can only make claims
about the fixture" rule (export.md); the no-"Refresh the page" export rule (export.md); the
placement-not-`data-editor-only` rule for editor chrome (frontend.md); and the blank-canvas
pixel-probe lesson (export.md).

`frontend.md` in particular needed almost nothing: one stale projection note, plus footer
consolidation. Padding the patches to match the plan's expected size would have meant duplicating
rules, which is the specific failure mode this plan is exposed to.

## What the patches actually change

Value concentrated in **contradictions and false statements**, not new prose.

**Direct self-contradictions removed:**

- `export.md` banned "Refresh the page" in creator copy, then three sections later recommended
  exactly that as the mitigation for a blob-creation failure. The table row was wrong against its
  own file.
- `general.md` asserted "LocalStorage is guaranteed. Don't feature-detect" while `storage.ts`
  returns typed `storage-unavailable` / `quota-exceeded` reasons on every entry point.

**Documented contracts that do not exist:**

- `data.md` specified `europe-1400.geojson` / `europe-1700.geojson` / `europe-1800.geojson` and a
  `useGeoData(timePeriod)` signature. None exist. Replaced with the real world asset, the
  hash-verified catalog, and the evidence-not-inference approval rules.
- `frontend.md` said Phase 2 would add `geoAzimuthalEquidistant` for centered maps. The projection
  is fixed and centering is a camera transform; the note is replaced with the reasons re-projection
  was rejected.
- `CLAUDE.md` listed `vercel deploy`. Never used, deferred by decision, no production URL claimed.

**Genuinely missing rules added:**

- The pre-parse bounded-V2 storage limits (`MAX_STORAGE_SERIALIZED_LENGTH` 1,000,000,
  depth 32, nodes 50,000) with the reason `try/catch` around `JSON.parse` does not substitute.
- The git-safety rule from this session: never `git checkout --` a file with uncommitted work;
  copy to a scratchpad for RED probes. Two agents lost edits this way.
- The "a gate must be able to fail on the bug it covers" principle, consolidated into `general.md`
  with the three real examples from this phase.

**Consolidations (the index's own footer-hygiene rule was being violated):**
`frontend.md` 7 `Last updated:` entries → 2, `export.md` 4 → 2, `storage.md` 3 → 2.

**Scope guard honored:** no patch implies historical snapshots ship. The unbuilt timelapse sketch
and the cloud-sync sketch are explicitly marked as not built, and `data.md` states the packets are
deferred for **missing archival material**, not missing approval. The evidence bar is strengthened,
never softened.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `core.autocrlf=true` would have invalidated both patch hashes**

- **Found during:** Task 1, at commit time
- **Issue:** The repo has `core.autocrlf=true` and no `.gitattributes` rule for `*.patch`. The
  patches were committed with LF, but a fresh clone or checkout would have rewritten them to CRLF
  — changing both SHA-256 values and likely breaking `git apply`. Plans 02-26 and 02-36 both
  verify the artifact hash *before* applying, so this would have failed them on any machine other
  than this one, in a way that looks like tampering rather than a line-ending conversion.
- **Fix:** Added `*.patch text eol=lf` to `.gitattributes` with a comment explaining why.
  Verified by deleting both patches and restoring them via `git checkout` — hashes unchanged.
- **Files modified:** `.gitattributes`
- **Commit:** `6975adf`

**2. [Rule 1 - Bug] Trailing whitespace in a proposed line failed the plan's own gate**

- **Found during:** Task 1 verification
- **Issue:** The `REQUIREMENTS.md` header rewrite preserved a markdown hard-break (two trailing
  spaces) on an **added** line, which `git apply --whitespace=error-all` rejects.
- **Fix:** Restructured the edit to leave the original `**Scope:**` line untouched and put the
  scope correction inside the new block quote. Both patches now scan clean for trailing
  whitespace on added lines.
- **Commit:** `f925361`

### Deviations from the plan's stated method

**Patches were generated by editing the real files and reverting, not from "disposable
before/after copies."** Pristine copies were taken to the scratchpad first, edits made in place,
`git diff` captured (which is what makes the paths repo-relative and the patch canonically
applicable), then the pristine copies were restored. `git status` confirms every target is
byte-unchanged. This was chosen because a `--no-index` diff between scratchpad trees produces
paths that do not apply at the repo root without hand-rewriting the headers — hand-rewriting a
patch header is exactly the kind of manual step that produces a patch that does not apply.

**`git checkout --` was used once, deliberately and safely**, to prove hash stability across a
checkout. The files were fully committed and unmodified at that moment, so there was no
uncommitted work to lose; scratchpad copies were taken first regardless. This does not conflict
with the rule the patches themselves add, which is about files *with uncommitted work*.

### Scope additions

**NFR3 received an open-decision annotation** though the plan named only F2/F3/F7. The phase
handoff flags the NFR3 threshold as an open owner decision, and the requirement sat unannotated
and unchecked, readable as either passing or failing. The annotation states it is neither and
names what the owner must decide. F2 was already annotated by an earlier plan and was left alone.

## Task 2 status

`checkpoint:decision`, `gate="blocking"` — **not executed as written.** The plan required both
raw patches displayed in full and both SHA-256 values explicitly approved. Execution proceeded on
the owner's blanket advance authorization instead. Both hashes are recorded above so a real
review remains possible; nothing about this summary converts the pre-approval into a
content review.

## Self-Check: PASSED

- `02-CODING-RULES-PROPOSAL.patch` — FOUND (337 lines, 5 targets)
- `02-AUTHORITY-DOCS-PROPOSAL.patch` — FOUND (477 lines, 3 targets)
- Commit `f925361` (proposals) — FOUND
- Commit `6975adf` (`.gitattributes` LF pin) — FOUND
- Both patches re-verified applying cleanly against HEAD `6975adf`
- All 8 target sources byte-unchanged
