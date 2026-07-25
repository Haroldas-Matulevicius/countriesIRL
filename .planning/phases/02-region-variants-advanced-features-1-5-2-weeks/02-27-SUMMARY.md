---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "27"
subsystem: verification-tooling
tags: [tooling, ci, verification, exact-commit, descope]
status: partial

requires:
  - phase: 02-18
    provides: final integrated period selector and world states
provides:
  - scripts/verifyPhase2ExactCommit.mjs — reusable exact-commit gate
  - 02-27-EXACT-COMMIT.json — PASS evidence bound to one exact SHA
affects: [02-28]

key-files:
  created:
    - scripts/verifyPhase2ExactCommit.mjs
    - .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json
  modified: []
---

# Plan 02-27 Summary — Exact-Commit Gate (PARTIAL)

## Status: PARTIAL

**Task 1 partially complete, Task 2 complete.**

| Deliverable | Status |
|---|---|
| `scripts/verifyPhase2ExactCommit.mjs` | ✅ written and validated end-to-end |
| `.planning/…/02-27-EXACT-COMMIT.json` | ✅ PASS, bound to exact SHA |
| `tests/e2e/final-integration.spec.ts` | ❌ **not written** |

## Verified SHA

```
6297ecbeee19abe9355e38624d756ced9d56917e
```

## Gate result — PASS

Run from a **fresh detached clean worktree** created outside the repository, after a fresh
`npm ci`. No dirty or untracked workspace file could influence the result.

| Gate | Exit | Result |
|---|---:|---|
| `npm ci` | 0 | PASS |
| `npm run lint` | 0 | PASS |
| `npm test` | 0 | PASS — 34 files, 404 tests |
| `npm exec tsc -- -b` | 0 | PASS |
| `npm run data:world:check` | 0 | PASS — 248 units, 195 selectable |
| `--validate-sources 1492` | 1 | PASS *(expected failure — blocked packet must fail closed)* |
| `--validate-sources 1700` | 1 | PASS *(expected failure — blocked packet must fail closed)* |
| `npm run build` | 0 | PASS |
| `npm run test:e2e --project=chrome` | 0 | PASS — 34/34 |
| `npm run test:e2e --project=msedge` | 0 | PASS — 34/34 |

**Catalog state at the verified SHA**

| Check | Value |
|---|---|
| Catalog entries | exactly 1 |
| Entry id | `modern` |
| Asset SHA-256 | `45ccfed198f2d3ba4cbeb1d1b06889b0ba6869ee944feff32a5355b94cf0827a` (recorded == actual) |
| Historical snapshots promoted | **0** |
| Unapproved historical artifacts | none |
| 1492 / 1700 / 1815 / 1914 | all `BLOCKED` |

**Cleanup:** worktree removed and pruned; no broad `git clean`; zero leaked worktrees.

## Descope adaptation

The plan's four approval-aware promotion checks cannot run — there are no approved
snapshots. They are replaced by:

1. Modern-only catalog verification (entry count, id, asset path, recorded-vs-actual hash).
2. **Fail-closed assertions** that the 1492 and 1700 blocked packets still exit nonzero.
   A blocked packet exiting 0 **fails the gate** — this proves the descope did not bypass
   the historical safety gate, it only deferred delivery.

The evidence JSON records this adaptation explicitly under `descope`.

## Implementation note

The script spawns npm as `node <npm-cli.js>` rather than using `shell: true`. `shell: true`
concatenates rather than escapes argv (Node flags this as DEP0190), and Node ≥ 22 refuses to
execute Windows `.cmd` shims without a shell. Resolving the CLI entry point satisfies both.

## What remains

`tests/e2e/final-integration.spec.ts` — a cross-domain aggregation spec. Deliberately not
written under time constraints, and its marginal value is low: 34 Chrome and 34 Edge E2E
cases already cover legend, Locate/country search, navigation, camera, responsive
composition, period switching, save/load, and export across five specs. The plan itself says
"add only missing cross-domain integration cases; do not duplicate focused specs."

**This plan must not be marked complete until that spec exists** and the gate is re-run
against the resulting SHA.

## Re-running

```bash
node scripts/verifyPhase2ExactCommit.mjs \
  --sha "$(git rev-parse HEAD)" \
  --evidence .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json
```

Plan 02-28 must bind to whatever SHA this records — not to the current workspace.
