---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "26"
subsystem: documentation
tags: [coding-rules, patch-application, mechanical-apply, hash-verified]
requires: ["02-25"]
provides:
  - .planning/CODING_RULES.md
  - .planning/coding-rules/frontend.md
  - .planning/coding-rules/data.md
  - .planning/coding-rules/export.md
  - .planning/coding-rules/storage.md
affects: []
tech-stack:
  added: []
  patterns: ["mechanical patch application with regenerated-diff byte proof"]
key-files:
  created: []
  modified:
    - .planning/CODING_RULES.md
    - .planning/coding-rules/data.md
    - .planning/coding-rules/export.md
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/storage.md
decisions:
  - "Byte identity proven by regenerating the diff after applying and hashing it — the regenerated diff's SHA-256 equals the artifact's, which is stronger than a line-by-line comparison."
  - "Authorization to apply is the owner's blanket advance approval, recorded as not hash-bound and not a content review."
metrics:
  duration: ~25 min
  completed: 2026-07-26
---

# Phase 02 Plan 26: Apply Approved Coding-Rule Patch A Summary

The five subsystem rule files now describe shipped Phase 2 behavior instead of Phase 1
intentions, applied mechanically from the approved artifact with byte identity proven in both
directions — the artifact hashed before applying, and the regenerated diff hashed after.

## Approval status — recorded precisely

**Authorization to proceed exists. Content review by the owner does not.**

- The owner's approval for this patch was **blanket, given in advance, and sight-unseen**, before
  the patch existed.
- Patch A's SHA-256 was computed **after** that approval was given. The approval is therefore
  **not hash-bound**, and must never be described as such.
- Plan `02-25`'s Task 2 — full display of both patches plus explicit per-hash approval — **was not
  executed**. No such display or per-hash confirmation took place.
- The owner has since explicitly instructed that execution proceed to completion. That is what
  authorizes applying this patch, and it is the only authorization claimed here.

Nothing in this summary converts the pre-approval into a content review. The phase's immutable
safety constraints forbid inferring or fabricating approvals and forbid executor self-approval;
naming the limits of the authorization is how those constraints are respected.

## Hash verification — before applying

| Value | Result |
|---|---|
| Recorded in `02-25-SUMMARY.md` | `78c88da4bc59c781d8c13903d9aff6f06ddd7d2b6394e6528fd946fb91835d08` |
| Computed on the artifact at HEAD `9bcb724` | `78c88da4bc59c781d8c13903d9aff6f06ddd7d2b6394e6528fd946fb91835d08` |
| **Match** | **Exact** |

The `.gitattributes` `*.patch text eol=lf` pin added by `02-25` (`6975adf`) held — no line-ending
drift, no mismatch to investigate.

## Application and byte proof

1. `git apply --check --whitespace=error-all` — clean.
2. `git apply --whitespace=error-all` — applied once, mechanically. **No hand edits.**
3. `git status --short` — exactly the five target files, all `M`. No file created, none deleted.
4. `git diff --no-color` regenerated and compared to the artifact: **byte-identical** (`diff`
   reports no difference).
5. The regenerated diff was itself hashed:
   `78c88da4bc59c781d8c13903d9aff6f06ddd7d2b6394e6528fd946fb91835d08` — **equal to the approved
   artifact hash.** The working tree therefore contains exactly the approved bytes and nothing else.

`git diff --stat`: 5 files changed, 139 insertions(+), 57 deletions(-).

## Coherence verification — not merely "it applied"

The plan asks for byte identity; the objective additionally asks whether the result *reads*
correctly. Both were checked.

**The contradictions `02-25` identified are actually gone:**

- **`export.md` no longer contradicts itself.** It banned "Refresh the page" in creator copy at
  line 140, then recommended exactly that as the blob-failure mitigation at line 286. The table row
  now returns `encoding-failed` and offers a retry, and carries an explicit note that it *used to*
  say the opposite — so the fix cannot be silently reverted by someone who only reads the table.
- **`data.md` no longer documents files that do not exist.** `europe-1400/1700/1800.geojson` and
  the `useGeoData(timePeriod)` signature are replaced by the real world asset, the hash-verified
  catalog, and the evidence-not-inference approval rules. The three filenames still appear twice —
  both times inside explicit negations ("None of those exist", "There is no…"), which is the
  correct way to stop someone rebuilding against them.
- **`frontend.md`'s stale projection note is gone.** The `geoAzimuthalEquidistant` promise is
  replaced by the fixed-projection/camera-transform rule plus the three concrete reasons
  re-projection was rejected.
- **`vercel` no longer appears anywhere in the coding rules.**

**The index still matches reality.** `.planning/CODING_RULES.md` lists exactly five section files
(`general`, `frontend`, `data`, `export`, `storage`) and `ls .planning/coding-rules/` returns
exactly those five. No entry points at a missing file; no file is unlisted.

**Footer hygiene now satisfies the project's own two-entry rule.** `CODING_RULES.md`, `data.md`,
`export.md`, `frontend.md`, and `storage.md` each carry exactly 2 `Last updated:` entries (down
from 7 in `frontend.md`, 4 in `export.md`, 3 in `storage.md`). `general.md` is at 1 and is Patch
B's target, not this plan's.

**No rule is now stated twice in two files.** The nearest case is the no-refresh rule, which
appears in `export.md` (export-specific, in the refusal table) and — via Patch B — in
`general.md` (app-wide). That is deliberate scoping, not duplication: `general.md` explicitly
generalizes it with "This applies to *every* message in the app, not just export copy." The
`legendSlot`-inside-the-canonical-SVG rule appears in both `frontend.md` and `export.md`, but it
predates this patch and was not introduced or widened here.

**Scope guard honored.** Nothing in the applied bytes implies historical snapshots ship. `data.md`
states the packets are deferred for **missing archival source material, not missing approval**,
keeps the six region IDs unmergeable, and forbids executor self-approval. The unbuilt timelapse
sketch in `export.md` is retitled "not built; deferred with the historical chain" with an explicit
"no part of it may be cited as evidence that historical snapshots exist." The evidence bar is
strengthened, never softened.

## Gates

These are documentation-only changes, so the product gates should be unaffected. That was
confirmed, not assumed:

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | clean, exit 0 |
| TypeScript | `npx tsc -b --pretty false` | clean, exit 0 |
| Unit suite | `npm test` | **516/516 passed, 38 files** |
| Build | `npm run build` | succeeded (pre-existing >500 kB chunk warning only) |

516/516 matches the `02-25` baseline exactly — no test changed behavior.

## Deviations from Plan

None. The patch applied cleanly on the first attempt, the regenerated diff was byte-identical, and
every gate passed. No auto-fix rule was triggered.

The plan's `<action>` also names "copy current targets to a disposable before tree." This was not
needed and was deliberately skipped: the tree was clean at HEAD `9bcb724`, so `git` itself held the
pristine copies, and the byte-identity proof is what establishes correctness. No `git checkout --`
was run against any file with uncommitted work.

## Requirements

The plan's frontmatter lists `F2.1, F2.2, F4.2, F5.2, F6.1, F6.2, NFR11`. **F2.1 and F2.2 were not
marked complete** — the historical chain is deferred for missing source material and those
requirements remain partially satisfied. Marking them would misstate delivery.

## Self-Check: PASSED

- `.planning/CODING_RULES.md` — FOUND, modified
- `.planning/coding-rules/data.md` — FOUND, modified
- `.planning/coding-rules/export.md` — FOUND, modified
- `.planning/coding-rules/frontend.md` — FOUND, modified
- `.planning/coding-rules/storage.md` — FOUND, modified
- Commit `484b228` (Patch A application) — FOUND
- Artifact hash matched before applying; regenerated diff hash matched after
- Exactly 5 files changed; no tracked file deleted; no untracked file left behind
