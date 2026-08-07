---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 06
subsystem: database
tags: [geojson, mapshaper, build-time-derivation, integrity, sha256, natural-earth]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "04-03's rewritten `public/data/world-modern.geojson` (asset `d02b604a…`, manifest `22af5b62…`) and the three `colorPolicy` branches in `scripts/prepareWorldData.mjs`"
  - phase: 02-world-map-and-historical-borders
    provides: "`prepareWorldData.mjs`'s derivational `--check` discipline (`canonicalBytes.equals(committedBytes)`) and `world-manifest.json`'s provenance shape"
provides:
  - "`public/data/world-borders-modern.geojson` — the interior-border mesh: 327 geometries (301 `LineString` + 26 `MultiLineString`), 19,624 coordinate points, 366,767 B, sha256 `72939b8f…f093e41`"
  - "`createMeshBytes` in `scripts/prepareWorldData.mjs` — one derivation function serving both the write path and `--check`"
  - "A four-assertion derivational mesh gate in `npm run data:world:check`, each assertion RED-proved on its own subject"
  - "An offline mesh digest pin and manifest cross-check in `src/utils/worldDataAsset.test.ts` (`npm test`, no network)"
  - "`world-manifest.json`'s `interiorBorderMesh` record, including the written-down reason the mesh is NOT bound to the polygon asset's hash"
  - "`coding-rules/data.md` § The interior-border mesh, with the date-line-wrapping and CD-11 handoffs to `04-09`"
affects: [04-09, 04-16, phase-5-classing-engine]

actuals:
  tokens: 6577
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Build-time geometry derivation through `mapshaper.applyCommands` (Node API, in-memory Buffers, no child process, no temp file)"
    - "Ordered integrity assertions — cheapest and most specific first — so a mutation that moves several facts at once still reports the most informative one"
    - "A derived artifact bound to its own digest, with the insensitivity that forbids cross-binding written into the manifest record itself"

key-files:
  created:
    - public/data/world-borders-modern.geojson
  modified:
    - scripts/prepareWorldData.mjs
    - public/data/world-manifest.json
    - src/utils/worldDataAsset.test.ts
    - .planning/coding-rules/data.md
    - .gitattributes

key-decisions:
  - "Used the mapshaper **Node API** (`mapshaper.applyCommands`), not `child_process` on `node_modules/.bin/mapshaper` — it returns a `Buffer` per output key with no temp file and no process spawn, and it costs ~30 ms against the CLI's measured 0.22 s"
  - "Bound the mesh to its own SHA-256 and re-derive it in `--check`; deliberately NOT bound to `world-modern.geojson`'s hash, because `-innerlines` is measured insensitive to feature properties"
  - "Ordered the four check assertions count → byte length → re-derived byte equality → manifest digest, so a deleted geometry reports the count it lost instead of a generic byte mismatch"
  - "Counted **geometries**, not `LineString`s: the output is 301 `LineString` + 26 `MultiLineString`, and a `LineString`-only count would agree with a mesh that had lost all 26"
  - "Added an offline digest pin in `worldDataAsset.test.ts` because `data:world:check` needs the network and `npm test` does not (Rule 2)"
  - "Pinned the mesh to LF in `.gitattributes` so a CRLF checkout cannot spuriously redden a byte-exact gate (Rule 2)"

patterns-established:
  - "One derivation function, two callers: the write path and the check path must never be able to disagree about how an artifact is produced"
  - "A manifest record for a derived artifact carries the exact command that produced it, and the check compares that string against the code's own constant"
  - "When a gate cannot cover something its name implies, the limitation is written into the manifest record and the rules file, not left to inference"

requirements-completed: [D4-08]

coverage:
  - id: D1
    description: "`public/data/world-borders-modern.geojson` holds the shared interior boundaries of the world asset, derived deterministically at build time by `mapshaper -innerlines`"
    requirement: "D4-08"
    verification:
      - kind: integration
        ref: "npm run data:world:check (re-derives and byte-compares the mesh)"
        status: pass
      - kind: unit
        ref: "src/utils/worldDataAsset.test.ts#pins the interior-border mesh to the digest the manifest records"
        status: pass
    human_judgment: false
  - id: D2
    description: "`npm run data:world:check` re-derives the mesh from the committed polygon asset and compares byte-for-byte — derivational, not a hash lookup — failing on a tampered mesh and on a mesh that no longer matches the geometry"
    requirement: "D4-08"
    verification:
      - kind: integration
        ref: "RED proof R3 — one coordinate digit, same byte length: 'differs from the mesh re-derived from the canonical world geometry'"
        status: pass
      - kind: integration
        ref: "npm run data:world:check"
        status: pass
    human_judgment: false
  - id: D3
    description: "The check fails on a one-digit coordinate mutation and on a deleted `LineString`, both observed RED on the mesh's own subject"
    requirement: "D4-08"
    verification:
      - kind: integration
        ref: "RED proofs R1 (326 vs 327 geometries) and R3 (byte equality) — verbatim messages in this SUMMARY § RED Proofs"
        status: pass
    human_judgment: false
  - id: D4
    description: "The mesh's SHA-256 is recorded in `world-manifest.json` beside the polygon records, computed by the script rather than hand-typed"
    requirement: "D4-08"
    verification:
      - kind: integration
        ref: "RED proof R4 — one hex char flipped in the manifest record reddens the digest assertion"
        status: pass
      - kind: unit
        ref: "src/utils/worldDataAsset.test.ts#pins the interior-border mesh to the digest the manifest records"
        status: pass
    human_judgment: false
  - id: D5
    description: "The mesh is insensitive to feature properties, so 04-03's policy reversal does not invalidate it and the mesh is deliberately not bound to the polygon file's hash"
    verification:
      - kind: other
        ref: "In-memory re-derivation after flipping isSelectable/colorOwnerId on the twelve D4-10 units plus renaming FRA: polygon sha d02b604a… -> c5a731e2…, mesh sha 72939b8f… unchanged"
        status: pass
    human_judgment: false
  - id: D6
    description: "Zero new packages and no npm script added; `package.json` and the lockfile are byte-unchanged"
    verification:
      - kind: other
        ref: "git diff --stat b010f25..HEAD -- package.json package-lock.json (empty)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The two rendering questions this plan does not answer — date-line wrapping of the mesh, and CD-11 (a shared segment cannot carry per-country interaction state) — are handed to `04-09` in `coding-rules/data.md`"
    verification:
      - kind: other
        ref: "grep -c 'innerlines' .planning/coding-rules/data.md => 3; CD-11 and 'Date-line wrapping' both present, 04-09 named"
        status: pass
    human_judgment: false

# Metrics
duration: 41min
completed: 2026-08-07
status: complete
---

# Phase 4 Plan 06: Interior-Border Mesh Summary

**A build-time `mapshaper -innerlines` mesh (327 geometries, 366,767 B, `72939b8f…`) bound to its own SHA-256 and re-derived on every `data:world:check`, with all seven of its assertions RED-proved on their own subjects.**

## Performance

- **Duration:** ~41 min
- **Started:** 2026-08-07T00:04Z
- **Completed:** 2026-08-07T00:45Z
- **Tasks:** 3
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- `public/data/world-borders-modern.geojson` exists as a committed, byte-reproducible artifact derived from the **current post-`04-03`** asset (`d02b604a…`), not a stale copy.
- `npm run data:world:check` is now **derivational for the mesh too**: it re-derives from the canonical polygon bytes and byte-compares, so the mesh cannot silently diverge from the geometry.
- **Seven RED proofs**, each reddening exactly one assertion, each restored by scratchpad copy-back with a clean tree afterwards.
- The measured property-insensitivity was **re-confirmed directly**, not taken on trust, and the reason it forbids a mesh↔polygon hash binding is written into the manifest record itself.
- `04-RESEARCH.md`'s "327 `LineString`s" was **corrected by measurement** to 301 `LineString` + 26 `MultiLineString`.

## Task Commits

1. **Task 1: Verify the invocation shape, then derive the mesh** — `380102b` (feat)
2. **Task 2: Bind it — manifest record, derivational check, and RED proofs** — `c79bbf9` (feat)
3. **Task 3: Document the derivation and hand two questions to 04-09** — `8472526` (docs)

## The invocation route, and why

**The Node API won.** `04-RESEARCH.md` recorded `mapshaper.applyCommands` as `[ASSUMED, A3]`; it is now verified. `import mapshaper from 'mapshaper'` yields a CJS-interop default export exposing `applyCommands`, which takes a command string plus an in-memory input map and returns a **`Buffer` per output key** — no temp file, no `child_process`, no working-directory dependence:

```js
const output = await mapshaper.applyCommands(
  '-i input.geojson -innerlines -o format=geojson precision=0.0001 output.geojson',
  { 'input.geojson': polygonBytes },
);
```

It costs **~30 ms** against the CLI route's measured 0.22 s, and because it takes bytes rather than a path it can be handed the *canonical* polygon buffer the script just regenerated — which is exactly what makes the check derivational. The `child_process` fallback was never needed. **Do not re-run this evaluation.**

## Measurements (on the committed artifact)

| Property | Value |
|---|---|
| Root type | **`GeometryCollection`** (not a `FeatureCollection`) |
| Geometries | **327** — **301 `LineString` + 26 `MultiLineString`** |
| Line parts | 361 |
| Coordinate points | **19,624** |
| Bytes | **366,767** (~16 % of the polygon asset's 2,295,448) |
| SHA-256 | `72939b8f1bb20bae624a429c4c76119cb0687a05712271f695804d4d8f093e41` |
| Derivation runtime | **~30 ms** (Node API), three consecutive runs byte-identical |
| Kosovo box (20–21.5 °E, 41.8–43.3 °N) | **71** mesh points — matches research |
| `data:world:check` runtime | 1.5 s this session (network cached); research measured 20.45 s dominated by the Natural Earth download. The mesh adds ~30 ms — negligible against either. |

**Escape hatch, recorded as the plan asked:** dropping `precision=0.0001` costs **+78,028 bytes** (444,795 total). If `04-09` finds the mesh visibly lossy, removing the flag and re-deriving is the whole change.

**One measured correction to `04-RESEARCH.md`.** It calls the output "327 `LineString`s". The count 327 is right; the type is not. Anything counting only `LineString`s would agree happily with a mesh that had lost all 26 `MultiLineString`s — so both the script and the unit test count **geometries** and separately assert that every member is one of the two line types.

## What the check covers — and what it does NOT

This is the point the plan turned on, so it is stated plainly rather than left to inference.

**Covers:**
- A **tampered committed mesh** — any edit to the file reddens at least one of count, byte length, byte equality, or digest.
- A mesh that **no longer matches the geometry** — the re-derivation runs against the canonical polygon bytes on every check, so a future geometry change that is not accompanied by a re-derived mesh fails.
- A **manifest record out of step** with the artifact, in either direction.

**Does NOT cover:**
- A **properties-only change to `world-modern.geojson`.** `-innerlines` reads geometry only. Flipping `isSelectable` / `colorOwnerId`, renaming a unit, or reordering properties moves the polygon digest and leaves every mesh number identical. **No mesh-side check can detect it, and none here claims to.** The polygon asset's own `canonicalBytes.equals(committedBytes)` comparison is what covers that, and it is untouched.

This is the same measured fact from both sides: it is why the mesh is bound to its own digest, and it is why that binding has a hole. The hole is documented in `world-manifest.json`'s `interiorBorderMesh.binding` field, in `coding-rules/data.md`, and in a comment above `verifyMesh`.

**Re-confirmed this session, not taken on trust.** An in-memory probe reversed D4-10 (twelve units back to `isSelectable: false`, `colorOwnerId: null`) *and* renamed France:

```
committed polygon sha    d02b604a92a4a7f4481c6bf9a92490adbfe4c6bc4b7ed4fd044c36bb4e2b5645
mutated  polygon sha     c5a731e20134d950f52f53544fbd3ab42d8959c86dc60184efdae2638a68f788   (2,295,459 B vs 2,295,448 B)
mesh from committed      72939b8f1bb20bae624a429c4c76119cb0687a05712271f695804d4d8f093e41
mesh from mutated        72939b8f1bb20bae624a429c4c76119cb0687a05712271f695804d4d8f093e41
MESH IDENTICAL           true
```

A second, stronger piece of evidence arrived for free: `04-RESEARCH.md` measured `72939b8f…` **before** `04-03` rewrote the asset, and the mesh derived from the post-`04-03` asset is the **same digest**. The insensitivity has been observed across a real, landed property change, not only a synthetic one.

## RED Proofs

Seven proofs. **Each mutation reddens exactly one assertion** — deliberately, because a mutation that reddens two claims at once proves neither independent. Every one was restored by **scratchpad copy-back** (`/private/tmp/.../scratchpad/RED-mesh.pristine`, `RED-manifest.pristine`); `git checkout --` was never used. Ordering matters: a deleted geometry moves count, length, bytes and digest simultaneously, so the assertions run cheapest-and-most-specific first.

**Script gate — `node scripts/prepareWorldData.mjs --check`** (run with `--base-source` / `--supplement-source` pointed at locally cached, hash-verified Natural Earth files during iteration; the final PASS is the real networked `npm run data:world:check`).

| # | Mutation | Subject | Verbatim failure |
|---|---|---|---|
| **R1** | Delete one geometry (327 → 326) | the **count** assertion | `World GeoJSON preparation failed: public/data/world-borders-modern.geojson holds 326 geometries but the manifest records 327.` |
| **R2** | Lengthen one coordinate `66.5223` → `66.52231` (count unchanged at 327) | the **byte-length** assertion | `World GeoJSON preparation failed: public/data/world-borders-modern.geojson is 366768 bytes but the manifest records 366767.` |
| **R3** | One coordinate digit `66.5223` → `66.5224` (count *and* byte length unchanged) | the **derivational byte-equality** assertion | `World GeoJSON preparation failed: public/data/world-borders-modern.geojson differs from the mesh re-derived from the canonical world geometry.` |
| **R4** | Flip the last hex char of the manifest's recorded mesh digest | the **manifest-digest** assertion | `World GeoJSON preparation failed: public/data/world-borders-modern.geojson digest 72939b8f…f093e41 does not match the manifest record 72939b8f…f093e42.` |
| **R5** | Manifest `geometryCount` 327 → 326 | the **literal 327 guard** in `readMeshRecord` | `World GeoJSON preparation failed: World manifest records 326 interior-border geometries, expected 327.` |

**R1 is the anti-vacuity proof the plan required:** it reports a **count** discrepancy naming both numbers, not a generic byte mismatch. Had byte equality run first, the count assertion would have been unfalsifiable — a gate that cannot fail on its advertised subject.

**R3 is the anti-vacuity proof for byte equality:** because the mutation preserves both count and byte length, the first two assertions pass and the third is the only thing standing between a tampered mesh and a green check.

**Offline gate — `npx vitest run src/utils/worldDataAsset.test.ts`.**

| # | Mutation | Subject | Result |
|---|---|---|---|
| **R6** | One coordinate digit in the mesh | the **offline digest pin** | `× pins the interior-border mesh to the digest the manifest records` — `AssertionError: expected '7c931c6e24381e1d977936c71e3eb5c1b4c3d…' to be '72939b8f1bb20bae624a429c4c76119cb0687…'`. Isolated: **1 failed, 11 passed.** |
| **R7** | Manifest `command` precision `0.0001` → `0.001` | the **manifest-record cross-check** | `- "command": "…precision=0.0001 output.geojson"` / `+ "command": "…precision=0.001 output.geojson"` — the assertion evaluated the field and reported the exact diff. |

**R7's limitation, stated rather than glossed:** it reddened **two** tests, not one — the record cross-check *and* the pre-existing `EXPECTED_MANIFEST_SHA256` pin. That is unavoidable by construction: **any** edit to `world-manifest.json` moves the manifest digest, so the record cross-check cannot be reddened in isolation from the digest pin. What R7 does prove is that the `toMatchObject` assertion runs and evaluates the `command` field specifically — the failure output names the field and shows both values. It is not an import-shaped or count-shaped false RED.

After every proof the file was restored by copy-back and confirmed byte-identical (`git status --short` empty for the mesh; digest re-checked as `dcc2e78a…` for the manifest), then the gate was re-run **GREEN** before proceeding.

## Files Created/Modified

- `public/data/world-borders-modern.geojson` **(created)** — the interior-border mesh artifact.
- `scripts/prepareWorldData.mjs` — `mapshaper` import, mesh constants, `createMeshBytes`, `countMeshGeometries`, `readMeshRecord`, `verifyMesh`; the write path now emits the mesh; the `--check` success line states the mesh numbers.
- `public/data/world-manifest.json` — the `interiorBorderMesh` record (file, `derivedFrom`, tool, exact command, root type, geometry count, byte length, SHA-256, precision trade-off, and the binding rationale). Inserted **programmatically** — the digest was computed from the artifact and spliced in by a script, never hand-typed. Only 12 lines added; the rest of the file is byte-unchanged (it round-trips exactly through `JSON.stringify(x, null, 2) + '\n'`).
- `src/utils/worldDataAsset.test.ts` — refreshed `EXPECTED_MANIFEST_SHA256`, added the mesh digest pin and manifest cross-check, added the mesh's `.gitattributes` row to the existing assertion.
- `.gitattributes` — `public/data/world-borders-modern.geojson text eol=lf`.
- `.planning/coding-rules/data.md` — new § The interior-border mesh; "Last updated" entries merged back to two.

## Decisions Made

1. **Node API over `child_process`** — verified, measured, and recorded above so it is not re-evaluated.
2. **Mesh bound to its own digest, re-derived in `--check`** — research's ranked recommendation (option 1). Option 3, a geometry-only cross-digest, stays rejected: it adds a bespoke canonicalisation nobody else in the repo maintains.
3. **Assertion ordering is load-bearing**, not stylistic. Documented in a comment above `verifyMesh` so a later refactor that "tidies" the order knows what it would break.
4. **Count geometries, not `LineString`s.** Driven by measurement against the plan's own wording.
5. **The manifest record carries the exact command string**, and `readMeshRecord` compares it against the code's constant — a provenance record that can drift from the code that ran is a provenance record for something else.
6. **The manifest stays a hand-curated *input*.** The write path does **not** rewrite `world-manifest.json`; re-serialising 248 records to update one derived field is a large blast radius for a small gain, and the digest assertion catches a stale record anyway.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `src/utils/worldDataAsset.test.ts` pins the manifest's SHA-256**

- **Found during:** Task 2 (adding the manifest record)
- **Issue:** `EXPECTED_MANIFEST_SHA256 = '22af5b62…'` is asserted in the unit suite. Adding the `interiorBorderMesh` record moves the manifest digest, so `npm test` would have gone red on a file the plan's `files_modified` did not list.
- **Fix:** Refreshed the constant to the **computed** new digest `dcc2e78ad934d777b331897b81e4f8826df81a74348fe11c22707b42b53ba3bd`.
- **Verification:** `npm test` — 713/713 across 45 files.
- **Committed in:** `c79bbf9`

**2. [Rule 2 — Missing Critical] An offline gate for the mesh**

- **Found during:** Task 2
- **Issue:** The only mesh gate was `data:world:check`, which **requires network access** to fetch Natural Earth. Offline, in CI without egress, or with GitHub down, a tampered mesh would ship entirely ungated.
- **Fix:** Added `pins the interior-border mesh to the digest the manifest records` to `worldDataAsset.test.ts`: digest pin, `GeometryCollection` root, literal geometry count `327`, every member a line type, and a `toMatchObject` cross-check of the manifest record against the artifact. Explicitly documented in-file as a **digest pin, not a re-derivation** — the derivational check remains the script's.
- **Verification:** RED-proved as **R6** (isolated: 1 failed, 11 passed) and **R7**.
- **Committed in:** `c79bbf9`

**3. [Rule 2 — Missing Critical] LF pinning for a byte-exact artifact**

- **Found during:** Task 1
- **Issue:** The mesh is gated by byte equality and by SHA-256, but had no `.gitattributes` entry. A checkout with `core.autocrlf=true` would rewrite it to CRLF and redden every mesh assertion for a reason that has nothing to do with the mesh — the exact failure mode the repo's own `*.patch` comment already documents.
- **Fix:** Added `public/data/world-borders-modern.geojson text eol=lf`, matching the two sibling data files, and extended the existing `.gitattributes` assertion in `worldDataAsset.test.ts` to require the row.
- **Verification:** File confirmed CR-free (0 CR bytes, 328 LF, no trailing newline — mapshaper's own output shape, left as-is because it is what the derivation produces).
- **Committed in:** `380102b` (attribute) and `c79bbf9` (assertion)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing-critical). No Rule 4 architectural decisions arose; the standing authorization was not needed at any fork.

**Impact on plan:** All three were required for the plan's own gates to be trustworthy — one to keep the suite green after a mandated manifest change, two to close holes in the integrity story the plan created. `files_modified` grew by `src/utils/worldDataAsset.test.ts` and `.gitattributes`. No scope creep: nothing renders, nothing runtime-facing changed.

## Approval chain — nothing implicated

**No geometry was promoted and no rights, factual, or topology approval was implicated.** The mesh is *computed* from already-shipped, hash-verified Modern geometry that passed its approval chain in Phase 2 and was re-derived, not waived, by `04-03`. Specifically:

- No new geometry entered `public/data/` from any source — the only input is the committed `world-modern.geojson`.
- No snapshot was added; `SNAPSHOT_CATALOG` still holds exactly `Modern`.
- No historical packet was touched. The **1492/1700/1815/1914 packets remain deferred for missing rights-cleared archival source material** — this plan changes nothing about that, and nothing here may ever be read as a delivered historical snapshot.
- The six historical region IDs were not merged, renamed, or referenced.
- No approval was inferred, fabricated, or self-approved. The manifest's hash chain was **re-derived by the script**, not hand-written.

This can never later read as a bypassed approval: the derivation is one command over one already-approved input, and the command is recorded in the manifest.

## Issues Encountered

- **`04-RESEARCH.md`'s geometry-type label was wrong** (301 `LineString` + 26 `MultiLineString`, not 327 `LineString`s). Caught by measuring rather than transcribing; corrected in `coding-rules/data.md` and reflected in both gates.
- **Two backticks leaked into the manifest's prose field** from shell quoting during the programmatic splice, then a curly apostrophe from the first fix. Both normalised to ASCII; the file's 6 remaining non-ASCII characters are pre-existing (country names).
- **A zsh word-splitting slip** made the first RED attempt exit 127 without running the check (`no such file or directory`) — an unrun command, not a RED. Caught immediately because the message was a shell error rather than the script's, redone with a shell function. Worth naming: it is the same family as the unquoted-`--include`-glob trap this phase already recorded.

## Handoffs to `04-09`

Both are written into `coding-rules/data.md` § The interior-border mesh so they survive `04-09` being re-scoped. Neither is answered here — **this plan makes no claim about how the mesh renders.**

1. **Date-line wrapping.** `MapCanvas` renders ±360° offset repeats of every polygon (`WRAP_OFFSETS`, `createWrappedSceneModel`). The mesh layer needs the same wrapping or a Pacific-framed composition shows filled countries with no interior borders on the wrapped copies. This is **not** in `ROADMAP.md`'s `04-05` description.
2. **CD-11 — the mesh cannot carry hover or selection state.** `src/constants/colors.ts` records that border **weight**, not colour, carries interaction state. A mesh segment belongs to **two** countries, so weighting one highlights both. `ROADMAP.md § Phase 4 04-05`'s claim that weight states are *"re-expressed on [the interior mesh]"* is **not achievable**; `04-UI-SPEC.md § 6.9` specifies a dedicated editor-only highlight layer instead. **`04-09` owns the ROADMAP amendment** — this plan did not touch `ROADMAP.md`.

## Verification

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **713/713** across 45 files (baseline 712 + 1 new) |
| `npm run build` | clean (`tsc -b && vite build`, 86 ms) |
| `npm run data:world:check` | **PASS** — `World GeoJSON check passed: 248 units, 195 selectable core states, and 207 colorable units. Interior-border mesh re-derived and matched: 327 geometries, 366767 bytes.` |
| `git diff --stat package.json package-lock.json` | **empty** across all three commits |
| `grep -c "mapshaper" package.json` | 1 — unchanged devDependency `0.7.48` |
| Playwright | **not run — not required.** This plan is build-time and data-only; it touches no render, camera, export, persistence, or layout surface. No browser claim is made. |

`STATE.md` and `ROADMAP.md` were **not touched**, and none of the three forbidden gsd-sdk verbs was run.

## Known Stubs

None. The artifact is complete and gated; the two open items are `04-09`'s rendering questions, documented above rather than stubbed in code.

## User Setup Required

None — no external service configuration required. `npm run data:world:check` needs outbound access to `raw.githubusercontent.com` for its Natural Earth fetch (verified HTTP 206 at plan start), which is a pre-existing build-time dependency this plan did not add. `--base-source` / `--supplement-source` accept local paths for offline runs, and the new `npm test` pin gates the mesh with no network at all.

## Next Phase Readiness

- **`04-09` has its geometry.** `public/data/world-borders-modern.geojson` loads as a `GeometryCollection` and renders through the same `createWorldProjection()` / `geoPath` the polygons use.
- **`04-09` has its two open questions in writing**, with the CD-11 ROADMAP amendment explicitly left to it.
- **`04-16` is unaffected:** `package.json` and the lockfile are byte-unchanged and no npm script was added.
- **One thing a later reader must not misread:** the mesh gate does not, and cannot, detect a properties-only change to `world-modern.geojson`. If a future plan needs that, the polygon asset's own byte-equality check already provides it — do not "strengthen" the mesh gate by binding it to the polygon hash, which is the precise mistake `04-RESEARCH.md` measured and this plan avoided.

## Self-Check: PASSED

All claimed artifacts verified present on disk (`world-borders-modern.geojson`, `prepareWorldData.mjs`, `world-manifest.json`, `worldDataAsset.test.ts`, `coding-rules/data.md`, `.gitattributes`, this SUMMARY) and all four commit hashes verified in `git log` (`380102b`, `c79bbf9`, `8472526`, `ec07a60`). `.planning/STATE.md` and `.planning/ROADMAP.md` have no commits in `b010f25..HEAD`. The pre-existing `.planning/debug/kosovo-renders-white-uncolorable.md` is intact (committed by `04-03` as `cb8321a`, not disturbed here). Working tree clean.

---
*Phase: 04-visual-cartographic-system-1-5-2-weeks*
*Completed: 2026-08-07*
