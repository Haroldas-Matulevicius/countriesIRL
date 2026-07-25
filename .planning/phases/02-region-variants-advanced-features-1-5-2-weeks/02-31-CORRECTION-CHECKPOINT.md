# Plan 02-31 Correction Checkpoint

**Recorded:** 2026-07-25T05:33:53Z
**Worktree:** `C:\Users\matul\ClaudeProjects\CountriesIRL\.claude\worktrees\agent-a57bbba6129ef1f11`
**Branch:** `worktree-agent-a57bbba6129ef1f11`
**Baseline:** `b910875e65d91cc3113137f6f57610ca1e26874a`
**Exact implementation HEAD before this checkpoint commit:** `f7b1daca290d84c6e4fa815316e070e78555326d`
**Worktree state at checkpoint authoring:** clean
**Checkpoint commit identity:** the commit containing this file; resolve exactly with `git log -1 --format=%H -- .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-31-CORRECTION-CHECKPOINT.md` after commit. The checkpoint cannot contain its own Git object ID because that ID is derived from the bytes of this file.

## Truthful Outcome

Plan 02-31 remains **INCOMPLETE**. Both historical packets are **BLOCKED**, `deliveryCounted` is `false`, and `candidateGenerated` is exactly `false`. Packet-integrity validation succeeds offline before the CLI exits nonzero on the named readiness blockers. This is not historical delivery and does not satisfy the plan's source-ready acceptance criteria.

No source/license approval, factual approval, topology approval, reviewer signature, production-readiness approval, candidate overlay, production historical asset, catalog entry, or production snapshot was created or inferred.

| Snapshot | Packet integrity | Readiness | Exit | Delivery counted | Candidate generated |
|---|---|---|---:|---:|---:|
| 1492 | Verified offline | BLOCKED | 1 | false | false |
| 1700 | Verified offline | BLOCKED | 1 | false | false |

All six required region IDs remain separate and present in exact order for both snapshots: `poland`, `lithuania`, `hungary`, `balkans`, `iberia`, `scandinavia`.

## Commits in the Unintegrated 02-31 Stack

| Commit | Purpose |
|---|---|
| `f4d61b1` | Assemble the initial 1492 blocked source-readiness packet |
| `ea09565` | Assemble the initial 1700 blocked source-readiness packet |
| `1b15b4a` | Correct packet-builder lint |
| `0d8b82c` | Bind reviewer-packet and source-lock semantics |
| `f7b1dac` | Harden historical packet integrity, aliases, exact schemas, Harvard payload authentication, tests, and atomic output writes |

The checkpoint documentation commit is intentionally not listed by a self-referential hash; use the exact resolution command in the header.

## Independent Review Finding Dispositions

| # | Review finding | Disposition | Evidence |
|---:|---|---|---|
| 1 | 1492 Lithuania reconstruction-rule string mismatch prevented packet-integrity validation | RESOLVED | The reviewer record and manual-trace procedure now use the exact same rule: `1494 Lithuanian geometry plus only territory explicitly marked lost in 1494; exclude territories marked only as losses in 1503 or 1522.` The 1492 archive and manifest were regenerated from existing local evidence. |
| 2 | Historical preparation CLI tests were not fully restored | RESOLVED | Focused suite passes 53/53 tests. Existing tamper tests remain fail-closed; production packet fixtures now preserve all actual archive members rather than synthesizing incomplete reviewer records. |
| 3 | Generation aliases and partial writes could overwrite protected bytes | RESOLVED | Generation rejects lexical, Unicode/case-colliding, canonical/real-path, hard-link identity, junction/symlink, source-manifest, evidence-ZIP, input, source/factual-approval, packet-member, review, and output aliases. Candidate/review writes use same-directory temporary files, backup/rename commit, and rollback before commit completion. Tests verify alias rejection and unchanged outputs on failed preflight. |
| 4 | `candidateGenerated`, `reviewerPacket.hashInvalidationRule`, blocked input schema/blockers, and contradictory extras were not exact | RESOLVED | Blocked manifests require exact schema markers and fields; `candidateGenerated` must be exactly `false`; the invalidation rule must be exactly `Changing any listed byte invalidates every future approval.`; blocked input keys and blocker order must exactly match the manifest; readiness/source/factual approval validators reject contradictory extra fields. |
| 5 | Harvard validation authenticated only aggregate metadata | RESOLVED | The fixed 247-row TSV inventory is parsed with exact header, row schema, unique IDs/paths, sorted paths, byte lengths, MD5, SHA-256, count, and total bytes. Every one of the 16 selected FileGDB payload members is authenticated against its own inventory row. A hash-updated selected-member tamper test fails before packet-integrity success output. |
| 6 | Atomic-write imports were unused and lint failed | RESOLVED | The imported filesystem primitives now implement path inspection and the output transaction. ESLint passes with zero reported warnings/errors. |
| 7 | Six regions and immutable historical safety constraints had to remain distinct | RESOLVED | Both manifests retain six separate region records. No geometry, rights, license, factual, topology, reviewer, or production approval was inferred or fabricated. Both packets remain blocked and uncounted. |
| 8 | Canonical manifest/archive/member/input/mode hashes needed recomputation | RESOLVED FOR CURRENT BLOCKED BYTES | Both packets were regenerated twice from existing local evidence; pre/post SHA-256 files were byte-identical. Offline validation confirms archive metadata, member inventory, individual members, source locks, blocked inputs, and applicable procedure/specification bytes. Exact values are below. |
| 9 | Offline `--validate-sources` had to run truthfully for 1492 and 1700 | RESOLVED AS BLOCKED, NOT DELIVERED | Both commands verify packet integrity, then exit 1 with the exact blocker lists below. No READY claim was made. |
| 10 | Focused tests, full tests, lint, strict TypeScript, and build had to pass | RESOLVED | Focused 53/53, full 31 files/336 tests, ESLint pass, `tsc -b` pass, and Vite build pass. |
| 11 | No candidate, approval, public historical asset, catalog entry, or production snapshot could be created | RESOLVED | Artifact scan found no 1492/1700 candidate GeoJSON, source-approval JSON, factual approval, or historical public snapshot. `public/data/snapshots/index.json` remains Modern-only. |

## Exact Current Hashes

### 1492

| Artifact/control | Exact current value |
|---|---|
| Source manifest SHA-256 | `90ba249266e974a4edae0ce3b1095985027cfda37f59ba5fa8d9161782b75002` |
| Evidence ZIP SHA-256 | `b4bfc5d8709fde58d7635a79cb80bd42574da04707b54de1887b84aac0f15911` |
| Canonical member-inventory SHA-256 | `b63b2cef3609d3108ebefc7f0d70b41c3b79fd809cbd3f2ec5c88c239fe618b1` |
| Blocked input SHA-256 | `1eb10d280ac5fe366b4d4e1a7246bc1c1e0e4126bca543be32d15a61734ef749` |
| Source-lock member SHA-256 | `ccc29c5db2479bd18d0dfe746990d7844d305892d5ef59e3cd49cdae596dede5` |
| Lithuania reviewer member SHA-256 | `94aba40e934b332216e4e3b9c4b3122ba544ad227371112472c55e8682fa61e3` |
| Manual evidence SHA-256 | `955293f5b80ee2ca9574574fcb0d3710fc78c3d0bf4f59de5be2e21edb9bdb0b` |
| Manual procedure SHA-256 | `780634addfa79cba8f369867c0fe5d28659691372ffc390db690ab89322275fd` |
| Operator-record SHA-256 | `null` — missing; explicit blocker |
| Control-point SHA-256 | `null` — missing; explicit blocker |
| Traced GeoJSON SHA-256 | `null` — no trace/candidate generated |
| Preparation mode | `blocked`; manual-trace candidate evidence only, not an approved manual trace |
| Reviewer hash invalidation rule | `Changing any listed byte invalidates every future approval.` |

### 1700

| Artifact/control | Exact current value |
|---|---|
| Source manifest SHA-256 | `6a32a2689d50db4a629b2ac3a05c8feb3995369aff1d8d547b20f489e3de790c` |
| Evidence ZIP SHA-256 | `b7066ba911745999a1c6d4bfd95e9ac6b421cd4f2b26719a094ba612a846dc8e` |
| Canonical member-inventory SHA-256 | `9b1cabac2912d8c31f8e2bd7a948b357e834e77ebdaa2d149eeaba2b8a1af8ef` |
| Blocked input SHA-256 | `d3f7b8862cb14e1b2d351514ad57c1913c959129e2412a466c17c80df878fb37` |
| Source-lock member SHA-256 | `d9fe596e942fa1136accd15065c1b9083af0ccc1c6ef356fc1e8a307b3471f2d` |
| Lithuania reviewer member SHA-256 | `1314ddc25a5fdaad051eb1046de163836dd8d11f055208fd42dbffdc8ce226ee` |
| Vector-selection specification SHA-256 | `9c64d778e6001f741b8301432ab1960aeec74552cd5258620859a81e1fb2331a` |
| Harvard metadata SHA-256 | `4d9d545a93223b5394cfc026aac95d858701858228121d4b3bb266024e527143` |
| Harvard 247-row inventory SHA-256 | `b348fbc52a2089dfe9e5f0568754d6a2ee56899f101711cd1cf917aae550fa3a` |
| Manual evidence/procedure/operator/control-point hashes | `null` — packet does not claim a manual trace |
| Preparation mode | `blocked`; vector selection is candidate/comparison evidence only, not approved production extraction |
| Reviewer hash invalidation rule | `Changing any listed byte invalidates every future approval.` |

### Selected Harvard payload SHA-256 values

| Evidence member | SHA-256 |
|---|---|
| `comparison/harvard-data-gdb/a00000021.gdbindexes` | `760bd4864717c60d5e7c0c6461a622062680e6f79f51250f49456aa609b43774` |
| `comparison/harvard-data-gdb/a00000021.gdbtable` | `06cecb62fb2a45e32d1b62db25f64882de4e4d3b18edc07944c1e019dcfe0966` |
| `comparison/harvard-data-gdb/a00000021.gdbtablx` | `1f551337b1ac6cf0358e97fe5451d3b8b61df14f94e4023381340ba09ab500b8` |
| `comparison/harvard-data-gdb/a00000021.spx` | `6c0aa99a4f43286aa400851b92775a2b0f71fb491c2de3f4dc70b298303e2fd2` |
| `comparison/harvard-data-gdb/a00000022.gdbindexes` | `760bd4864717c60d5e7c0c6461a622062680e6f79f51250f49456aa609b43774` |
| `comparison/harvard-data-gdb/a00000022.gdbtable` | `18421c3fd42ae687198b3c46022a6ede28301e15f0a227871ba756fe6c838556` |
| `comparison/harvard-data-gdb/a00000022.gdbtablx` | `71f92859157734be42318a8bcef562d249689e5a5a5d6c46996c7f43f56eca83` |
| `comparison/harvard-data-gdb/a00000022.spx` | `705575561a339f77019f63af1a697016e3964168b42d781d6abae6088e1f544d` |
| `comparison/harvard-data-gdb/a00000023.gdbindexes` | `760bd4864717c60d5e7c0c6461a622062680e6f79f51250f49456aa609b43774` |
| `comparison/harvard-data-gdb/a00000023.gdbtable` | `cbd88a96505c94f344f68766cb27c9779ae37f9acead2a93366743ae69fbebbe` |
| `comparison/harvard-data-gdb/a00000023.gdbtablx` | `fbf933c79f445c2289ddedc5f13a3707882192ed55dc659e4e157bd99d142cd5` |
| `comparison/harvard-data-gdb/a00000023.spx` | `5a754b47acfce5ebb713a60ca15409e1fa90880005136c668f02fc714bd3b739` |
| `comparison/harvard-data-gdb/a00000024.gdbindexes` | `c12bbe6b47cd58d64a4d9b93ce7a015938308b01a7483f5b8680064ca552eeef` |
| `comparison/harvard-data-gdb/a00000024.gdbtable` | `8b2635cbe17f42c1d22a5b12c793e2fcc2b1884e9afa065c266f0e02c2b628d8` |
| `comparison/harvard-data-gdb/a00000024.gdbtablx` | `b69ccc7edd495df4be806c03e42596291aac1e3e9c616f18e839f86e1999e4f8` |
| `comparison/harvard-data-gdb/a00000024.spx` | `0ca9d0be90bc009399880faaebac10b432357f3216b7d4699277ba6d3dc77d75` |

The validator also compares each selected member's exact byte length and MD5 against its corresponding row in the fixed 247-row inventory; the SHA-256 table above is not used as a substitute for that row-level authentication.

## Commands and Results

| Command | Result |
|---|---|
| `node scripts/assembleHistoricalCandidatePackets.mjs --snapshot 1492 ...` | PASS using existing local evidence; assembled 26-member BLOCKED packet |
| `node scripts/assembleHistoricalCandidatePackets.mjs --snapshot 1700 ...` | PASS using existing local evidence; assembled 41-member BLOCKED packet |
| Repeat both assembly commands with pre/post six-file SHA-256 comparison | PASS; byte-identical deterministic regeneration |
| `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1492 --sources sources/historical/1492.sources.json --validate-sources` | EXPECTED BLOCKED; packet integrity verified offline, then exit 1 with exact blockers |
| `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1700 --sources sources/historical/1700.sources.json --validate-sources` | EXPECTED BLOCKED; packet integrity verified offline, then exit 1 with exact blockers |
| 1815 and 1914 blocked-packet compatibility probes | EXPECTED BLOCKED; both existing packets still verify integrity before their named blockers |
| `npm test -- src/utils/historicalPreparationCli.test.ts src/utils/historicalValidation.test.ts` | PASS — 2 files, 53 tests |
| `npm test` | PASS — 31 files, 336 tests |
| `npm run lint` | PASS — zero reported ESLint warnings/errors |
| `npm exec tsc -- -b --pretty false` | PASS — zero TypeScript diagnostics |
| `npm run build` | PASS — TypeScript plus Vite; 617 modules transformed |
| `git diff --check` | PASS |
| Historical promotion artifact and catalog scan | PASS — no candidate/approval/public historical asset; catalog Modern-only |

## Exact Unresolved Blockers

### 1492

- `RIGHTS_REVIEW_REQUIRED`
- `AUTHORITATIVE_SEMKOWICZ_ROMER_SCAN_AND_CATALOG_MISSING`
- `MANUAL_TRACE_OPERATOR_CONTROL_POINTS_AND_GEOMETRY_MISSING`
- `REVERSE_1494_FACTUAL_REVIEW_REQUIRED`
- `CNIG_15094_PRODUCT_ARCHIVE_AND_MEMBER_HASHES_MISSING`
- `1492_SIX_REGION_EXACT_GEOMETRY_INCOMPLETE`
- `TOPOLOGY_AND_1080PX_REVIEW_REQUIRED`

### 1700

- `RIGHTS_REVIEW_REQUIRED`
- `TEMPORAL_SEMANTICS_REVIEW_REQUIRED`
- `EXACT_DAY_FACTUAL_REVIEW_REQUIRED`
- `KARLOWITZ_FRONTIER_DEMARCATION_INCOMPLETE`
- `CONSTITUENT_AND_TRIBUTARY_POLICY_REVIEW_REQUIRED`
- `TOPOLOGY_AND_1080PX_REVIEW_REQUIRED`
- `SIX_REGION_PRODUCTION_GEOMETRY_NOT_APPROVED`

These blockers include unresolved source/right sufficiency and unresolved geometry, temporal, factual, topology, and 1080-pixel review. They require independent qualified human review and/or missing exact evidence. Automation in this correction does not satisfy or waive them.

## Safety and Promotion Audit

- `sources/historical/1492.source-approval.json`: absent.
- `sources/historical/1700.source-approval.json`: absent.
- `data/historical-reviewed/1492.geojson`: absent.
- `data/historical-reviewed/1700.geojson`: absent.
- `public/data/snapshots/1492.geojson`: absent.
- `public/data/snapshots/1700.geojson`: absent.
- Factual approval artifacts: absent.
- Production snapshot catalog: exactly `modern` only.
- Source/license approval inferred: no.
- Factual approval inferred: no.
- Geometry correctness inferred: no.
- Public historical data promoted: no.
- BLOCKED counted as delivered: no.

## Continuation Rule

Plan 02-31 remains incomplete unless its exact acceptance criteria are genuinely met without inference: every one of the six regions for each snapshot must have complete usable source rights, complete offline evidence, exact mode-specific hashes, and the required independent approvals. Do not create `02-31-SUMMARY.md`, begin Plan 02-33, generate a historical candidate, or promote any public/catalog asset from this checkpoint.
