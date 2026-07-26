# Deferred Items — Phase 2

Phase-local deferrals only. Milestone-level deferrals (historical snapshots, deployment,
Firefox/Safari certification) live in [`MILESTONES.md`](../../MILESTONES.md) § Deferred out of
v1.0. Status and counts live in [`ROADMAP.md`](../../ROADMAP.md) § Progress.

## Open

- **Intermittent failures in `src/utils/historicalPreparationCli.test.ts`** (observed 2026-07-25,
  plan 02-20): up to four cases fail with `Historical snapshot preparation failed: Review HTML
  aliases Factual approval by identityKey`. Reproduced on a clean tree with the 02-20 changes
  stashed (6/6 full-suite runs failed), then passed on 3 of 4 runs minutes later with the changes
  restored; the file passes in isolation every time. The behaviour is time/environment dependent
  and unrelated to Save/Load. **This suite cannot be treated as a reliable gate until it is
  diagnosed.** Not observed during the `fe5f946` gate run (516/516 twice), which does not make it
  fixed.

## Resolved

- ~~**Pre-existing strict TypeScript/build failure at base `54846a57b460ee71d2126412a75d3c070cc16a82`**~~
  — `historicalPreparationCli.test.ts` accessed nullable `child.stdout`/`child.stderr`, producing
  four TS18047 diagnostics under `npm run build`. Left untouched by plan 02-07 under the
  parallel-worktree scope boundary. **Resolved:** `tsc -b` is clean at `fe5f946`.

- ~~**`CLAUDE.md` routes to two files that do not exist** (found 2026-07-26, plan 02-36)~~ — the
  codebase-map row pointed at `.planning/codebase/STRUCTURE.md` and the load-gated row at
  `.planning/PHASE2_PLANNING.md`. `git log --all` on both paths returned nothing: neither file has
  ever been committed. 02-36 correctly declined to fix them, because its `must_haves` required the
  three targets to change **only** by the exact approved Patch B bytes, and threat `T-02-80` is
  mitigated precisely by regenerated-diff byte comparison — a hand edit outside the approved bytes
  would have destroyed that proof. **Resolved 2026-07-26** in the documentation reorganization
  pass, once the byte-identity constraint was discharged: both rows were removed rather than
  backfilled, with an explicit note in `CLAUDE.md` recording that neither file exists. Phase 2
  orientation is covered by the `.continue-here.md` row that Patch B added.
