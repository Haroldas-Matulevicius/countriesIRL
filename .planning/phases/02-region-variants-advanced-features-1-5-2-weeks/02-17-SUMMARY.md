---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "17"
subsystem: historical-catalog
tags: [data, catalog, historical-snapshots, descope, verification]
rescoped: true

requires:
  - phase: 02-12
    provides: validated historical snapshot loading and catalog contract
  - phase: 02-31
    provides: hash-bound BLOCKED 1492/1700 source-readiness packets
  - phase: 02-32
    provides: hash-bound BLOCKED 1815/1914 source-readiness packets
provides:
  - verified Modern-only production catalog
  - explicit zero-promotion record for the four deferred snapshots
  - proof the approval-aware promotion path remains fail-closed
affects: [02-18, 02-27, 02-28]

tech-stack:
  added: []
  patterns:
    - blocked packets stay unlisted and are never counted delivered
    - catalog hash is verified against actual asset bytes, not asserted

key-files:
  created: []
  modified: []
---

# Plan 02-17 Summary — Modern-Only Catalog Verified (Rescoped)

## Outcome

**Complete as rescoped.** Production exposes exactly one catalog entry, `modern`.
**Zero historical snapshots were promoted**, because zero hold a complete durable
approval chain.

This plan originally promoted four approved historical overlays. It was rescoped on
2026-07-25 under [`02-DESCOPE-DECISION.md`](02-DESCOPE-DECISION.md): the rights-cleared
source material for 1492/1700/1815/1914 does not exist, so no approval chain can be
completed and no geometry can be promoted. The original promotion tasks are preserved
verbatim in the plan for the follow-on data-acquisition phase.

## Verified evidence

| Check | Result |
|---|---|
| Catalog entry count | exactly 1 |
| Catalog entry id | `modern` |
| Asset path resolves | `/data/world-modern.geojson` — yes |
| Recorded hash equals actual asset SHA-256 | **PASS** — `45ccfed198f2d3ba4cbeb1d1b06889b0ba6869ee944feff32a5355b94cf0827a` |
| `public/data/snapshots/{1492,1700,1815,1914}.geojson` | all absent |
| `sources/historical/*.source-approval.json` | all absent |
| `data/historical-reviewed/` | absent |
| `--validate-sources` 1492 | exits BLOCKED (7 blockers) |
| `--validate-sources` 1700 | exits BLOCKED (7 blockers) |
| `npm test -- historicalValidation scene` | PASS |

The blocked packets still fail closed, proving the gate is live rather than bypassed
by the descope.

## What was NOT done, and why

No historical asset, source approval, factual approval, candidate geometry, or catalog
entry was created. The immutable safety constraints remain in force — the descope
defers delivery, it does not relax the evidence bar.

## Deviations

Plan dependency changed from `["02-35"]` to `[]`. `02-35` (durable approval
transcription) is deferred with the rest of the historical chain; the rescoped
verification has no upstream dependency.

## Follow-on

The promotion machinery in `scripts/prepareHistoricalSnapshot.mjs` and
`src/utils/historicalValidation.ts` is retained, tested, and unchanged. When
rights-cleared geometry is obtained, the deferred tasks execute against it with no
rework of shipped code.
