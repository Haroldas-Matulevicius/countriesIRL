---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "32"
subsystem: historical-data-provenance
tags: [histogis, geojson, provenance, sha256, canonical-zip, historical-review]

requires:
  - phase: 02-12
    provides: Offline historical preparation, source-approval, candidate, and factual-review gates
provides:
  - Exact-byte HistoGIS v9.0 reviewer packets for the locked 1815 and 1914 dates
  - Six independent coverage-cell records per snapshot with conditional/blocked dispositions
  - CLI support for validating blocked packet hashes without treating snapshots as delivered
  - Explicit source-boundary versus generated-mask-edge separation with no mask edges generated
  - Cleanly blocked candidate inputs that cannot be promoted as historical geometry

affects: [02-33, 02-34, 02-35, historical-source-review, historical-topology-review]

tech-stack:
  added: []
  patterns:
    - Canonical ZIP evidence archives with sorted path/hash inventory and reconstructable source-byte chunks
    - Blocked manifests validate all local hashes before returning a nonzero readiness result
    - Coverage containers remain distinct from curated political entityId identities

key-files:
  created:
    - sources/historical/1815.sources.json
    - sources/historical/1815.evidence.zip
    - sources/historical/1815.input.geojson
    - sources/historical/1914.sources.json
    - sources/historical/1914.evidence.zip
    - sources/historical/1914.input.geojson
  modified:
    - .gitattributes
    - scripts/prepareHistoricalSnapshot.mjs
    - src/utils/historicalPreparationCli.test.ts

key-decisions:
  - "1815 and 1914 remain blocked and deliveryCounted=false; no candidate overlay was generated."
  - "The archived CC BY 4.0 LICENSE versus Zenodo v9 Other/Open discrepancy remains unresolved for an independent rights reviewer."
  - "The exact ARCHE rights-record URL and bytes were not fabricated; their absence is an explicit blocker."
  - "Mask-only edges are absent and cannot become political, selectable, or export-visible political borders."
  - "Empty blocked FeatureCollections are intentional safety gates, not delivered geometry."

patterns-established:
  - "Blocked readiness: verify exact local evidence and input bytes, then fail closed with named blockers."
  - "Source record custody: preserve exact record bytes, chunk oversized members, and bind reconstruction hashes."
  - "Historical identity: coverageRegion and coverageContainerId never synthesize a political entityId."

requirements-completed: []
requirements-blocked: [F2.1, F2.3, F2.4, NFR8, NFR9]

duration: 1h 10m
completed: 2026-07-24
---

# Phase 2 Plan 32: 1815 and 1914 Historical Source Readiness Summary

**Exact HistoGIS v9.0 source bytes, rights evidence, six-cell review records, and topology preflight are frozen for 1815 and 1914, while both snapshots remain honestly blocked from candidate generation and delivery.**

## Performance

- **Duration:** 1h 10m
- **Started:** 2026-07-24T19:26:49Z
- **Completed:** 2026-07-24T20:36:22Z
- **Tasks:** 2/2 executed to their explicit READY-or-BLOCKED outcome
- **Snapshots ready:** 0/2
- **Coverage cells:** 12 total; 9 conditional, 3 blocked, 0 approved
- **Files created/modified:** 9 implementation and evidence files

## Outcome

Plan 02-32 is complete as a **blocked source-readiness outcome**, not as historical data delivery. Both locked dates have exact-byte reviewer packets and independently recorded coverage cells, but neither snapshot has the complete rights, geometry, topology, and factual approvals required to generate or promote a candidate overlay.

No snapshot was added to the browser catalog, no source archive entered the browser bundle, no modern fallback was relabeled as historical, and no count or synthetic record was treated as approval.

## Source and Evidence Lock

| Item | Exact value |
|---|---|
| Dataset | HistoGIS Data v9.0 |
| Git revision | `60c7453a5ebbf276fe7af3f975f6db2b519c1f08` |
| Git tag | `v9.0`, API ref resolves to the exact revision above |
| Archive URL | `https://zenodo.org/api/records/4432081/files/acdh-oeaw/histogis-data-v9.0.zip/content` |
| Archive byte length | `41,517,662` |
| Archive SHA-256 | `1e108156d8d21f5e47dc91849050f1e12e5d642f13095407f70270883004a5cd` |
| Archived LICENSE SHA-256 | `425a1a2917abd293f8a96fd02cb8fb0dafe9c01a7285012e1681ec04cc672ec8` |
| Archived LICENSE text | `cc-by-4.0` / Creative Commons Attribution 4.0 |
| Zenodo record | `https://zenodo.org/records/4432081` |
| Zenodo v9 API license | `other-open` |
| DataCite v9 rights | Open Access, with no CC license identifier |
| Research handoff SHA-256 | `b9c16025eb3722b61815d0520feae128d216a13279d1f1806123d58d3100f804` |
| Exact ARCHE record | Not frozen; explicit blocker, not inferred from other metadata |

The rights discrepancy is preserved as evidence. This execution does not choose which metadata controls and does not approve an attribution string.

## Packet Hashes

| Snapshot | Manifest SHA-256 | Evidence ZIP SHA-256 | Member inventory SHA-256 | Blocked input SHA-256 |
|---|---|---|---|---|
| 1815 | `e6acf0eac1ea2d9939e2ab2aa21f897a6768b8ff76819af30e70153657580cfd` | `8829e72be316b8c7040e91ea3a3c12d8de61a20796cacc3a8d47869a3ad2c2e9` | `1a77ddf091008cd6f9d2131484cf9bd950c7471ac62cc966da40f8b7a468ebdd` | `1eef28f3a36f5da303d08af87fef39be28f5238cbdabbf055df31b8e988d4a77` |
| 1914 | `49554aa3d893eb23ecc0409650c8e114a5d81c70e5ddeda785938fb66afa54ba` | `94f8533eba3f1cdd29287ae0a36ebf357781a80664b077a68f5a0f1c74f118aa` | `11f0a7d64660ed669f628bc70c48f63a556583c15d0a294d09a1f348407962c7` | `aea153a2d79ad36b979385ab566c769b8c5bc99612d222d441e9f85af33ed456` |

The 1815 packet contains 69 canonical members; the 1914 packet contains 75. Oversized Russia source records are split into exact ordered chunks below the validator's per-member bound. The per-record manifests reconstruct the original source bytes and verify their exact SHA-256 values.

## Per-Cell Status

### 1815 — `1815-12-31`

| Coverage cell | Status | Exact outcome |
|---|---|---|
| Poland | CONDITIONAL | Congress Poland, Russia, Prussia, Galicia-Lodomeria, and Free City Cracow are identified; sovereign Poland is not synthesized. Duplicate H#12338 is excluded. |
| Lithuania | CONDITIONAL | Russia and applicable Prussian context are identified; Lithuania remains a coverage container and no sovereign Lithuania entity is created. |
| Hungary | CONDITIONAL | Hungary, Transylvania, Croatia, Slavonia, and Military Frontier are selected; overlapping Austrian parent H#9906 is excluded. |
| Balkans | BLOCKED | No satisfactory separate Serbia transitional-autonomy geometry exists for the locked date; Military Frontier metadata also requires review. |
| Iberia | CONDITIONAL | Spain, Portugal, Gibraltar, and Andorra are exact-date-valid; Olivenza control/claim and small-territory topology remain review items. |
| Scandinavia | BLOCKED | H#10016 is named Sweden but its geometry spans Sweden and Norway; it cannot be duplicated or mislabeled. |

### 1914 — `1914-07-27`

| Coverage cell | Status | Exact outcome |
|---|---|---|
| Poland | CONDITIONAL | Russia, Germany, and Galicia-Lodomeria are identified; sovereign Poland is not synthesized and AU parent H#9950 is excluded. |
| Lithuania | CONDITIONAL | Russia and Germany are identified where applicable; Lithuania remains a coverage container with no modern back-projection. |
| Hungary | CONDITIONAL | Hungary, Croatia-Slavonia, Fiume, Bosnia-Herzegovina, and Dalmatia are selected; H#9950/H#9951/H#9952 are excluded from the constituent mosaic. |
| Balkans | CONDITIONAL | Serbia, Montenegro, Romania, Bulgaria, Ottoman Empire, Albania, Greece, and reviewed AU constituents are identified; Northern Epirus and seams remain unresolved. |
| Iberia | CONDITIONAL | Spain, Portugal, Gibraltar, and Andorra are exact-date-valid; small-territory topology remains unapproved. |
| Scandinavia | BLOCKED | Denmark, Sweden, Norway, and Russia/Finland are identified, but Svalbard lacks a reviewed terra-nullius/neutral geometry or non-political mask. |

Every region retains its own evidence path and decision record even when it references a source feature also used by another coverage cell.

## Geometry and Topology Preflight

- All inspected source coordinates are finite and remain in canonical longitude `[-180,180]`.
- Coverage containers are metadata only and never create selectable political entities.
- No coverage mask was generated.
- `generatedMaskEdgeArcSha256` is `null` throughout the packets.
- Source-boundary arc hashes are recorded separately per source feature.
- The blocked inputs contain no features, so no mask-only edge can enter a political boundary path or exported political-border layer.
- H#10016 bounds span both Norway and Sweden, confirming the source name/geometry mismatch.
- H#10109 reaches only approximately 71.19°N, so it does not solve Svalbard's 1914 neutral-status requirement.

Mapshaper 0.7.48 area-sum versus dissolved-union preflight produced:

| Mosaic | Source-area sum | Dissolved union | Delta |
|---|---:|---:|---:|
| 1815 Hungary constituents | 325,282,513,122.6779 m² | 325,282,513,122.6936 m² | -0.0157 m² numerical noise |
| 1815 Poland partition candidates | 5,904,936,310,132.954 m² | 5,904,936,264,292.171 m² | 45,840.7832 m² |
| 1914 AU constituent candidates | 389,480,033,360.04645 m² | 389,480,031,537.38477 m² | 1,822.6617 m² |
| 1914 Balkan candidates | 637,183,283,827.5171 m² | 637,183,052,295.1816 m² | 231,532.3354 m² |

These are preflight observations only. They are not topology approval and do not authorize clipping, dissolving, masking, or candidate generation.

## Task Commits

1. **Task 1: Assemble and validate the 1815 source/license bundle** — `aae548b` (`feat`)
2. **Task 2: Assemble and validate the 1914 source/license bundle** — `c5619ef` (`feat`)
3. **Overall verification correction: strict spawned-stream guard** — `60fae7e` (`fix`)

## Files Created/Modified

- `sources/historical/1815.sources.json` — Six-cell blocked readiness manifest with exact source, evidence, identity, rights, and mask-edge policy.
- `sources/historical/1815.evidence.zip` — Canonical offline reviewer packet containing exact source bytes/chunks, metadata, rights evidence, cell records, and topology preflight.
- `sources/historical/1815.input.geojson` — Intentionally empty blocked FeatureCollection preventing false candidate generation.
- `sources/historical/1914.sources.json` — Six-cell blocked readiness manifest for the locked prewar date.
- `sources/historical/1914.evidence.zip` — Canonical exact-byte 1914 reviewer packet.
- `sources/historical/1914.input.geojson` — Intentionally empty blocked FeatureCollection preventing Svalbard or AU fallback fabrication.
- `scripts/prepareHistoricalSnapshot.mjs` — Validates blocked packet archive/member/input hashes, then fails closed with named blockers.
- `src/utils/historicalPreparationCli.test.ts` — Covers blocked packet validation, drift rejection, and strict pipe-handle safety.
- `.gitattributes` — Forces LF for hash-bound historical JSON/GeoJSON and binary handling for evidence ZIPs.

## Decisions Made

- Both snapshots remain `readinessStatus: blocked` and `deliveryCounted: false`.
- No rights, factual, or topology approval was synthesized by the executor.
- No candidate geometry was generated because six-region sufficiency is absent.
- The archived LICENSE/Zenodo discrepancy is preserved for explicit independent rights review.
- The reported ARCHE license was not treated as frozen evidence without its exact URL and bytes.
- H#9906 and H#9950/H#9951/H#9952 remain excluded where constituent-level topology is intended.
- Svalbard remains unresolved neutral/terra-nullius geography and never inherits modern Norwegian identity.
- Mask-only edges remain absent; any future mask must retain separate lineage and stay non-political, non-selectable, and non-export-visible as a political border.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added an honest blocked-manifest validation path**
- **Found during:** Task 1
- **Issue:** The historical CLI could validate only approved vector/manual packets. An explicit blocked manifest failed as an invalid preparation mode before proving local evidence integrity.
- **Fix:** Added a blocked readiness schema that validates the canonical archive, sorted member inventory, six region evidence records, and input hash, then returns a named nonzero blocker result without permitting approval or candidate generation.
- **Files modified:** `scripts/prepareHistoricalSnapshot.mjs`, `src/utils/historicalPreparationCli.test.ts`
- **Verification:** Focused CLI tests pass; both real packets print `blocked source packet hashes passed offline` and then fail closed with exact blocker codes.
- **Committed in:** `aae548b`

**2. [Rule 2 - Missing Critical] Bound hash-sensitive text and binary files to stable Git attributes**
- **Found during:** Task 1 staging
- **Issue:** Windows checkout conversion could rewrite JSON/GeoJSON line endings and invalidate committed SHA-256 bindings; ZIPs also needed explicit binary treatment.
- **Fix:** Added LF rules for historical JSON/GeoJSON and binary handling for ZIP evidence archives.
- **Files modified:** `.gitattributes`
- **Verification:** Hashes of staged Git blobs matched each manifest's input and evidence hashes.
- **Committed in:** `aae548b`

**3. [Rule 3 - Blocking] Added strict null handling for spawned CLI streams**
- **Found during:** Overall production build
- **Issue:** TypeScript 6 reported that child process stdout/stderr may be null, blocking `tsc -b`.
- **Fix:** Explicitly validated both piped streams before registering listeners and rejected the test helper if either is absent.
- **Files modified:** `src/utils/historicalPreparationCli.test.ts`
- **Verification:** Focused tests, strict TypeScript, and production build pass.
- **Committed in:** `60fae7e`

**Total deviations:** 3 auto-fixed (2 missing-critical, 1 blocking)
**Impact on plan:** The fixes strengthen exact-byte integrity and fail-closed behavior without expanding historical claims or generating blocked geometry.

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS — 25 files, 275 tests |
| `npm run build` | PASS — strict TypeScript plus Vite production build |
| `npm run lint` | PASS — zero ESLint warnings/errors |
| `node_modules/.bin/tsc -b --pretty false` | PASS — zero TypeScript diagnostics |
| 1815 `--validate-sources` | EXPECTED BLOCKED — packet hashes pass offline, then named blockers return nonzero |
| 1914 `--validate-sources` | EXPECTED BLOCKED — packet hashes pass offline, then named blockers return nonzero |
| Canonical ZIP parser | PASS — archive metadata, path order, inventory, CRC, and member hashes validated |
| Source-byte reconstruction | PASS — all chunked source records reconstruct their exact archived SHA-256 |
| Regeneration check | PASS — all six committed packet files regenerated byte-identically before helper cleanup |
| Non-mutation check | PASS — source validation leaves manifests, inputs, and evidence archives byte-identical |
| Browser-bundle exclusion | PASS — built `dist/` contains no HistoGIS source/archive identifiers |
| Topology preflight | PASS as diagnostic only — area deltas recorded; no approval claimed |

## Authentication Gates

None.

## Known Stubs

- `sources/historical/1815.input.geojson:13` — `features` is intentionally empty because the snapshot is blocked. This prevents incomplete Serbia and Sweden-Norway geometry from being promoted.
- `sources/historical/1914.input.geojson:13` — `features` is intentionally empty because the snapshot is blocked. This prevents deceptive Svalbard fallback and unapproved AU/Balkan topology from being promoted.

These stubs are deliberate fail-closed records and are the reason neither snapshot is marked delivered.

## Issues Encountered

- The exact ARCHE rights record URL and bytes could not be frozen from the supplied handoff. The packet records this absence instead of substituting Zenodo or DataCite metadata.
- `npm ci` completed from the existing exact lockfile but reported two deprecated transitive packages and four audit findings (two moderate, two high). No dependency was changed because this is pre-existing supply-chain state outside Plan 02-32's file scope.
- Source records use mixed source editions, including some 1919-labeled source material that is date-valid for the locked snapshot. Exact-day and factual suitability remain reviewer decisions.

## Next Phase Readiness

The source work is resumable from exact hashes. Plan 02-33 can use these packets for independent rights review, but must not approve either snapshot until it freezes the exact ARCHE record or records an explicit qualified disposition of its absence and resolves all six region rights cells separately.

Plan 02-34 remains blocked pending qualified factual and topology review, including:

- 1815 Serbia transitional autonomy geometry.
- H#10016 Sweden-Norway split/status treatment.
- 1815 partition and crownland topology.
- 1914 Svalbard neutral/terra-nullius treatment.
- Austria-Hungary constituent topology without parent overlap.
- Northern Epirus interpretation.
- Diagnostic versus political treatment of any future coverage-mask edge at both topology and 1080×1080 presentation scale.

No candidate overlay, source approval, factual approval, catalog entry, or production historical snapshot exists yet.

## Self-Check: PASSED

- All six source/evidence/input artifacts exist at their recorded paths.
- Task commits `aae548b`, `c5619ef`, and `60fae7e` exist on the isolated worktree branch.
- Packet hashes, canonical inventories, source reconstruction, non-mutation, test, lint, type, build, and bundle-exclusion claims were re-verified before closeout.
- Both snapshots remain explicitly blocked and uncounted as delivered.

---
*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Completed: 2026-07-24*
