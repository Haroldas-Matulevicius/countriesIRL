# Phase 2 Descope Decision — Historical Snapshots Deferred

**Decided:** 2026-07-25
**Decided by:** User (explicit, in session)
**Status:** ACTIVE — governs the remainder of Phase 2

---

## Decision

Phase 2 ships **Modern-only**. The four historical snapshots (1492, 1700, 1815, 1914) are
**deferred to a later phase as a data-acquisition item**, not cancelled.

## Why

Every one of the 21 plans remaining at the time of this decision sat transitively behind
Plan `02-33` (human source/license approval). `02-33` could not be reached, because its
inputs do not exist:

- `02-31` (1492/1700 source readiness) ends **BLOCKED**. Verified by running
  `node scripts/prepareHistoricalSnapshot.mjs --snapshot {1492,1700} --validate-sources`
  offline on 2026-07-25.
- `02-32` (1815/1914) is complete **only as hash-bound BLOCKED readiness evidence**, with
  `deliveryCounted=false` and zero production snapshots.

The blockers name **missing archival material**, not merely unreviewed material:

| Snapshot | Missing-material blockers |
|---|---|
| 1492 | `AUTHORITATIVE_SEMKOWICZ_ROMER_SCAN_AND_CATALOG_MISSING`, `MANUAL_TRACE_OPERATOR_CONTROL_POINTS_AND_GEOMETRY_MISSING`, `CNIG_15094_PRODUCT_ARCHIVE_AND_MEMBER_HASHES_MISSING`, `1492_SIX_REGION_EXACT_GEOMETRY_INCOMPLETE` |
| 1700 | `KARLOWITZ_FRONTIER_DEMARCATION_INCOMPLETE`, `SIX_REGION_PRODUCTION_GEOMETRY_NOT_APPROVED` |

Both additionally carry `RIGHTS_REVIEW_REQUIRED` and `TOPOLOGY_AND_1080PX_REVIEW_REQUIRED`.

No human approval can unblock a missing source scan. Obtaining rights-cleared material for
six regions × four snapshots is archival research measured in weeks, and it is not
engineering work. Holding fifteen completed-but-unshippable engineering plans behind it
was the worse trade.

## What this does NOT throw away

The historical **machinery is built, tested, and retained**:

- `src/utils/historicalValidation.ts` — schema, hash, six-region, and identity validation
- `src/utils/scene.ts` — effective-scene composition with modern fallback
- `scripts/prepareHistoricalSnapshot.mjs`, `scripts/assembleHistoricalCandidatePackets.mjs`
- `sources/historical/{1492,1700,1815,1914}.*` — BLOCKED readiness packets, hash-bound
- Catalog loading, legend, and export all already handle a non-modern snapshot

The Wave 5 Chrome E2E round-trips a **complete historical scene** end to end
(`tests/e2e/phase2-composition.spec.ts` — "real app round-trips a historical scene with
live catalog and exported legend") using an in-memory fixture. The engine is proven.

When rights-cleared geometry is obtained, the snapshots drop into
`public/data/snapshots/` and the catalog via the existing approval-aware promotion path
with **no rework of shipped code**.

## Plan dispositions

### Deferred (historical chain) — 9 plans

| Plan | Was | Disposition |
|---|---|---|
| `02-31` | 1492/1700 source readiness | DEFERRED — blocked on missing archival material |
| `02-32` | 1815/1914 source readiness | RETAINED as BLOCKED evidence; `deliveryCounted=false` |
| `02-33` | Human source/license approval | DEFERRED — no reviewable evidence exists |
| `02-13` `02-14` `02-15` `02-16` | Per-snapshot geometry curation | DEFERRED — no approved sources to curate from |
| `02-34` | Human factual approval | DEFERRED — no candidates to review |
| `02-35` | Durable approval transcription | DEFERRED — nothing to transcribe |

### Rescoped — 2 plans

| Plan | Change |
|---|---|
| `02-17` | Was "promote four approved overlays, catalog last". Now: **verify the Modern-only catalog is correct and that no unapproved historical asset is present**. The approval-aware promotion path is retained and tested but promotes nothing this phase. |
| `02-18` | Period selector ships with **Modern only**. Deferred snapshots are not listed. Failure-retains-prior-scene behavior and the modern-fallback path are unchanged and still tested. |

### Unchanged — 10 plans

`02-20`, `02-21`, `02-22`, `02-23`, `02-24`, `02-25`, `02-26`, `02-27`, `02-28`, `02-30`, `02-36`
proceed as written. Their historical dependencies are satisfied by the Modern-only catalog.

## Constraints that remain in force

The immutable safety constraints from `.continue-here.md` are **not** relaxed by this
decision. Specifically, still binding:

1. Historical geometry, rights, and factual approvals are never inferred, synthesized, or fabricated.
2. No unapproved historical geometry reaches `public/data` or the production catalog.
3. A BLOCKED packet is not a delivered snapshot and is never counted as one.
4. Executor self-approval remains forbidden for source/license and factual review.
5. The six region IDs (`poland`, `lithuania`, `hungary`, `balkans`, `iberia`, `scandinavia`)
   are never silently merged.
6. Phase 2 remains browser-only and localhost-only.

## Requirements impact

`F2.1`–`F2.5` (historical borders) are **partially satisfied**: the selector, validation,
scene composition, fallback, identity handling, and export integration ship and are tested;
the historical *data* does not. These requirements carry forward with an explicit
deferral annotation rather than being marked complete.

## Follow-on work (new phase)

A data-acquisition phase should cover: rights clearance for six regions × four snapshots,
manual-trace operator records and control points, Karlowitz frontier demarcation, CNIG
15094 product archive, Semkowicz-Romer scans and catalog, then the existing
`02-33` → `02-13`–`02-16` → `02-34` → `02-35` → `02-17` chain unchanged.
