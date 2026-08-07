---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 03
subsystem: data
tags: [geojson, natural-earth, manifest, sha256, scene-model, playwright, typescript-discriminated-union]

requires:
  - phase: 02-world-map-and-historical-snapshots
    provides: the 248-unit hash-verified Modern world asset, its manifest, and the derivational `prepareWorldData.mjs --check`
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    provides: the D-23 non-colourable affordance (NEUTRAL_UNIT_COLOR, the tooltip refusal reason) that D4-10 retires on the Modern scene
provides:
  - "A third `colorPolicy` value, `self-colorable`, carried by twelve units: ATA COK CYN FLK GIB IOT KAS KOS NIU SAH SOL TWN"
  - "Two manifest counts that mean different things: `coreStateCount` 195 (unchanged, still UN-member core states) and `selectableCount` 207 (colourable units)"
  - "A fourth `SceneFeature` union variant, `interactionMode: 'self-colorable'`, representable end to end"
  - "`colorableLookup` on the ready geo-data state — the 207 units Locate and CountryList browse"
  - "`LOGICAL_CORE_COUNT = 207` in the e2e harness, with the whole 105-test Chrome suite settled at the new number"
  - "An e2e gate that clicks Kosovo and asserts it takes #DC2626"
affects: [04-08, 04-14, 05-02, 05-04]

actuals:
  tokens: 21600
  tasks: 4
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A reversed data policy is carried by an explicit new branch, never by loosening an existing throw"
    - "Two counts cross-checked against each other and against the records, never against a third literal"
    - "A RED probe that reddens a different assertion than the one under test is reported as such, then re-aimed"

key-files:
  created: []
  modified:
    - public/data/world-manifest.json
    - public/data/world-modern.geojson
    - scripts/prepareWorldData.mjs
    - src/types/map.ts
    - src/utils/geojson.ts
    - src/hooks/useGeoData.ts
    - src/utils/scene.ts
    - src/constants/colors.ts
    - src/App.tsx
    - tests/e2e/support/appHarness.ts
    - tests/e2e/navigation.spec.ts
    - .planning/coding-rules/data.md
    - .planning/coding-rules/general.md
    - .planning/ROADMAP.md
    - .planning/debug/kosovo-renders-white-uncolorable.md

key-decisions:
  - "policy-b-third-value: keep the twelve non-core and add an explicit third colorPolicy value, leaving the 195-core definition byte-unchanged"
  - "Route (A) promote-to-core is measured blocked outright: GIB is a 10m supplement while createCanonicalBytes resolves core records only against the 50m baseFeatures index, and Antarctica is not a UN member state"
  - "A fourth SceneFeature variant rather than loosening the neutral variant to colorOwnerId: string | null"
  - "coreLookup stays 195 and keeps meaning core states; a new colorableLookup carries the 207 Locate needs"
  - "The D-23 e2e gate is replaced, not deleted: its null-owner fill count is pinned at ZERO rather than removed"

patterns-established:
  - "Third-branch-not-loosened-throw: both pre-existing policy throws stay in force for every unit outside the new category"
  - "Derived count assertions: selectableCount === coreStateCount + selfColorableCount, then compared against the records actually present"
  - "Catalog fixtures in component tests are derived from the manifest's colorable set, so a reclassification reaches the unit tests too"

requirements-completed: [D4-10, D4-09]

coverage:
  - id: D1
    description: "All twelve colorPolicy self-colorable units are selectable and colourable in the editor; there is no region a creator cannot colour"
    requirement: D4-10
    verification:
      - kind: unit
        ref: "src/utils/scene.test.ts#the twelve self-colorable units (D4-10) > puts all twelve in the selectable set and lands the count on 207"
        status: pass
      - kind: unit
        ref: "src/utils/scene.test.ts#the twelve self-colorable units (D4-10) > resolves an applied colour for each of the twelve instead of the neutral fill"
        status: pass
      - kind: e2e
        ref: "tests/e2e/navigation.spec.ts#every unit is colourable (D4-10) > Kosovo takes a colour where the click used to be swallowed"
        status: pass
    human_judgment: false
  - id: D2
    description: "npm run data:world:check reports 207, re-derives the GeoJSON deterministically from source, and refuses a manifest whose recorded counts disagree with the derived ones"
    requirement: D4-10
    verification:
      - kind: other
        ref: "npm run data:world:check -> 'World GeoJSON check passed: 248 units, 195 selectable core states, and 207 colorable units.'"
        status: pass
      - kind: unit
        ref: "src/utils/worldDataAsset.test.ts#canonical world assets > locks the exact core, supplement, count, and parent policy"
        status: pass
    human_judgment: false
  - id: D3
    description: "LOGICAL_CORE_COUNT is 207 and waitForApp finds 207 option paths, so every e2e spec that calls it is green at the new number"
    requirement: D4-10
    verification:
      - kind: e2e
        ref: "npx playwright test --project=chrome -> 105 passed"
        status: pass
    human_judgment: false
  - id: D4
    description: "The twelve appear in CountryList and in Locate, and getSelectableEntityIds includes them"
    requirement: D4-10
    verification:
      - kind: unit
        ref: "src/components/CountryList.test.tsx#CountryList colorable-unit catalog > renders exactly the curated 207 colorable units without historical entities"
        status: pass
      - kind: unit
        ref: "src/components/LocateCountry.test.tsx#LocateCountry > filters the fixed modern catalog and rejects historical-only IDs"
        status: pass
      - kind: e2e
        ref: "tests/e2e/locate.spec.ts (MODERN_CORE_COUNT 207 country rows and combobox options)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The 41 inherit-parent units are unaffected — they are coloured by a parent, not blocked"
    requirement: D4-10
    verification:
      - kind: unit
        ref: "src/utils/worldDataAsset.test.ts#canonical world assets > locks the exact core, supplement, count, and parent policy (asserts every non-self-colorable record is isSelectable:false, colorPolicy inherit-parent, parentCoreId in coreIds)"
        status: pass
    human_judgment: false
  - id: D6
    description: "policy.coreStateCount remains 195 and remains factually true; coreDefinition is byte-unchanged; 207 is recorded as a separate quantity"
    requirement: D4-10
    verification:
      - kind: unit
        ref: "src/utils/worldDataAsset.test.ts#canonical world assets > locks the exact core, supplement, count, and parent policy (toMatchObject on coreDefinition, coreStateCount 195, selfColorableCount 12, selectableCount 207)"
        status: pass
    human_judgment: false
  - id: D7
    description: "No geometry promoted, no snapshot added, no historical packet touched — no rights, factual, or topology approval implicated — but the manifest changed, so the hash chain is re-derived, not waived"
    verification:
      - kind: unit
        ref: "src/utils/worldDataAsset.test.ts#canonical world assets > pins exact source and committed asset hashes (re-derived manifest and asset SHA-256)"
        status: pass
      - kind: other
        ref: "git diff b40e226..HEAD -- public/data/snapshots/ src/constants/snapshots.ts -> empty"
        status: pass
    human_judgment: true
    rationale: "The claim 'no approval was implicated' is an assertion about process, not a property a test can measure. A human must confirm that the manifest diff reads as a product-policy change on already-shipped geometry and not as a bypassed approval."
  - id: D8
    description: "ROADMAP.md § Phase 5 05-02 no longer contradicts D4-10 (CD-2), and Live Invariant 5's text is amended rather than silently left false (CD-5)"
    verification:
      - kind: other
        ref: "grep -c 'not colorable' .planning/ROADMAP.md -> 0"
        status: pass
      - kind: other
        ref: "grep -n 'SUPERSEDED' .planning/debug/kosovo-renders-white-uncolorable.md -> hit; git ls-files --error-unmatch on the same file -> tracked"
        status: pass
    human_judgment: false

duration: 27min
completed: 2026-08-06
status: complete
---

# Phase 4 Plan 03: Neutral Units Become Colourable Summary

**Twelve units that swallowed a click with no feedback — Kosovo, Taiwan, Western Sahara, Antarctica and eight more — now carry an explicit `self-colorable` policy, are selectable, listed, locatable, and paintable, and the whole 105-test Chrome suite settled at 207 without the 195-core definition moving a byte.**

## Performance

- **Duration:** ~27 min
- **Tasks:** 4 of 4
- **Files modified:** 29 (3 commits)

## Task 1 — the owner gate, answered

**Answer recorded: `policy-b-third-value`.** Keep the twelve units non-core and add an explicit third `colorPolicy` value. The gate was **not stopped on**; it arrived pre-answered in the execution brief and in `.continue-here.md`.

Reasoning, as recorded:

- `policy.coreStateCount` stays **195** and stays factually true; `policy.coreDefinition` is untouched (byte-unchanged, asserted in `worldDataAsset.test.ts`).
- Route (A) `policy-a-promote-to-core` is **measured blocked outright**: `GIB` is sourced from the Natural Earth **10m** supplement file while `createCanonicalBytes` resolves core records only against the **50m** `baseFeatures` index, so `GIB` cannot become a `coreStates` record without restructuring the script's join. Antarctica is additionally not a UN member state, so promotion would falsify `policy.coreDefinition` as written.
- A second count `selectableCount: 207` now appears alongside `coreStateCount: 195`. Because a careless reader could conflate the two, the distinction is made explicit in the manifest's `neutralUnits` prose, in the `--check` success line, and in a new `coding-rules/data.md` section. **That is the known cost of this route and it is accepted, not overlooked.**
- Live Invariant 5's **intent** is preserved; only its text was amended.

**Creator-visible consequence, explicitly acknowledged and accepted:** the twelve units become clickable and paintable where they previously swallowed the click with no feedback. Every existing saved map keeps working. **No creator data is lost.**

**Authorization, recorded in the required words:** this was answered under a **blanket, in-advance, sight-unseen proceed-authorization** from the owner. It **authorizes proceeding**; it is **not a content review** and it is **not hash-bound** (Immutable Safety Constraint 8). Full terms in `.planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-AUTHORIZATION.md`.

**This is a one-way decision.** `04-CONTEXT.md` rates D4-10 costly to reverse: reverting means re-editing and re-hashing the manifest, moving the selectable count back, and re-amending the roadmap. It was executed anyway, because that is what was authorized.

## Approval framing (quoted verbatim, and also carried in the manifest commit message)

> *"No geometry is promoted, no snapshot is added, and no historical packet is touched, so **no rights, factual, or topology approval is implicated**. This is the owner changing a product policy on already-shipped, hash-verified Modern geometry. It is **not an approval bypass and must not be recorded as one** — but it *is* a manifest change, so the hash chain is **re-derived, not waived**."*

Everything in `coding-rules/general.md` § Immutable Safety Constraints stays in force unchanged. The approved snapshot catalog still holds exactly `Modern`. The 1492 / 1700 / 1815 / 1914 packets remain **DEFERRED for missing rights-cleared archival source material** — missing *material*, not missing approval. `public/data/snapshots/` and `src/constants/snapshots.ts` are untouched by this plan (verified: `git diff b40e226..HEAD` produces no hunk in either).

## Task 2 precondition — network route used

`raw.githubusercontent.com` was **re-verified reachable before starting**: both pinned v5.1.1 Natural Earth URLs returned HTTP 200 (206 on a ranged probe). **The network route was used** — no `--base-source` / `--supplement-source` local paths were needed. Both source SHA-256s matched their manifest records on every run.

## Accomplishments

- **The manifest records twelve self-colourable units.** `ATA COK CYN FLK GIB IOT KAS KOS NIU SAH SOL TWN` each carry `colorPolicy: "self-colorable"`, `parentCoreId` equal to their own id, and `isSelectable: true`. The 41 `inherit-parent` units are untouched.
- **The blanket `nonCoreSelectable: false` became an explicit split** — `selfColorableSelectable: true` / `inheritParentSelectable: false` — alongside `selfColorableCount: 12` and `selectableCount: 207`. `coreDefinition` and `coreStateCount: 195` are unchanged.
- **`createRuntimeFeature` gained a third branch, not a loosened throw.** Both pre-existing throws (*non-core units must be non-selectable*, and the `parentCoreId === null ? neutral : inherit-parent` policy check) stay in force for every unit outside the new category.
- **The count assertion is derived.** `createCanonicalBytes` checks `selectableCount === coreStateCount + selfColorableCount`, then checks that against the self-colorable records actually present, and refuses the manifest on either disagreement. No second hard-coded 207 in the assertion path.
- **`--check` states both numbers:** *"World GeoJSON check passed: 248 units, 195 selectable core states, and 207 colorable units."*
- **A fourth `SceneFeature` variant** (`interactionMode: 'self-colorable'`, `colorOwnerId: CountryId`, `isSelectable: true`), mirrored in `geojson.ts`'s normalizer. The neutral variant was **not** loosened to `colorOwnerId: string | null`.
- **`readNonCoreUnit`'s new branch goes through the existing guards, not around them** — the same `hasReservedObjectKey` check, the same `readStableId` normalizer, and its owner is always its own id, so it can never borrow a core state's colour.
- **`countryMetadata` is now the 207 colourable units**, and a new `colorableLookup` feeds Locate. `coreLookup` stays 195 and keeps meaning core states.
- **The e2e harness moved to 207** along with six specs carrying their own copy of the constant, and `navigation.spec.ts`'s D-23 gate was replaced by *"every unit is colourable (D4-10)"* — which clicks Kosovo and asserts it takes `#DC2626`.
- **Four disagreeing documents now agree**, and the one that reached the opposite conclusion is annotated `SUPERSEDED` and tracked.

## Task Commits

1. **Task 1: OWNER GATE** — no code artifact; the answer is recorded in this SUMMARY and quoted in the `f57f916` commit message. No separate commit (nothing to commit).
2. **Task 2: The data layer** — `f57f916` (feat) — manifest, world asset, and the three policy throws
3. **Task 3: The runtime** — `784fe17` (feat) — union variant, scene selection, list inclusion, and the e2e harness
4. **Task 4: The four documents** — `cb8321a` (docs)

**Task 2 and Task 3 were committed separately, and the suites were RED between them.** The plan permitted either; separate commits were chosen because the approval framing's stated purpose is that *"a future reader auditing a manifest diff reaches the diff before they reach `04-CONTEXT.md`"* — which is strongest when the manifest diff is its own commit. `f57f916`'s message records the red window explicitly.

## RED proofs (recorded verbatim)

Every new gate was broken on **its own subject** and restored by **scratchpad copy-back** to `/private/tmp/claude-501/.../scratchpad`. No `git checkout --` was used on a file with uncommitted work.

| # | Subject broken | Verbatim failure | Verdict |
|---|---|---|---|
| 1 | `world-manifest.json` `selfColorableCount` 12 → 11, twelve records intact (the probe the plan prescribes) | `World GeoJSON preparation failed: World manifest selectableCount 207 does not equal coreStateCount 195 plus selfColorableCount 11.` | RED on the arithmetic cross-check |
| 2 | `selfColorableCount` 11 **and** `selectableCount` 206 (arithmetic self-consistent, records still say 12) | `World GeoJSON preparation failed: World manifest records 12 self-colorable units but selfColorableCount is 11.` | RED on the **derivational** check — records vs recorded |
| 3 | `selfColorableCount` 0, `selectableCount` 195, twelve records intact | `World GeoJSON preparation failed: World manifest records 12 self-colorable units but selfColorableCount is 0.` | RED — the manifest gate fails at 195 |
| 4 | One record (`KOS`) reverted to `neutral`, counts left at 12/207 | `World GeoJSON preparation failed: World manifest records 11 self-colorable units but selfColorableCount is 12.` | RED on a single-unit reclassification |
| 6 | `createRuntimeFeature` emits the **pre-D4-10** shape (null owner, non-selectable for the twelve) | `World GeoJSON preparation failed: Expected 207 colorable units, received 195.` | RED — **the 207 runtime count assertion fails at 195** |
| 7b | `scene.ts` `hasSelectableIdentity` no longer admits `'self-colorable'` | `AssertionError: expected 195 to be 207` | RED — **the scene gate fails at 195** |
| 8 | `useGeoData.readNonCoreUnit` restored to the pre-D4-10 runtime | `Locator: locator('path.country-path[role="option"]') Expected: 207 Received: 195` | RED — **the e2e harness gate fails at 195** |
| 9 | Same pre-D4-10 runtime, harness also at 195 so execution reaches the Kosovo assertions | `Locator: locator('path.country-path[data-country-id="KOS"]') Expected: 1 Received: 0` | RED — **the Kosovo gate fails on its own subject** |

**Probe 5 is reported as a failure of the probe, not of the gate.** Its intent was to isolate the runtime `selectableCount` assertion by making `createRuntimeFeature` emit `isSelectable: isCore`. It went red — but on **a different assertion**: `World unit ATA has invalid color owner ATA`, the non-selectable owner check, which fires earlier. That is exactly the *"a probe that reddens a different gate than the one being proven"* shape named in `CLAUDE.md`. It was re-aimed as probe 6, which reverts the third branch's **effect** (null owner *and* non-selectable, the true pre-D4-10 shape) and reaches the count assertion.

**Probes 8 and 9 required two edits, and that is stated plainly rather than glossed.** Reverting `readNonCoreUnit`'s return shape alone makes `validateWorldManifest` reject the manifest outright, so the app enters its fatal-error state and the spec reddens on *"app failed to load"* — the wrong gate again. The `colorableUnits.length !== EXPECTED_SELECTABLE_COUNT` guard was disabled in the same probe so the app still booted. The two edits together are **one semantic change** — *the twelve are not selectable at runtime* — and reproduce the genuine pre-D4-10 runtime.

**One assertion could not be independently reddened, and is reported as such rather than claimed.** `validateRuntimeFeatures`' `selectableCount !== expectedSelectableCount` line is reachable (probe 6 proves it), but only by breaking feature generation in a way that *also* trips the earlier owner check unless the null-owner half is reverted too. It is defence-in-depth downstream of a stricter derived check, not an independently falsifiable gate. Probe 6 is the closest honest proof available.

## Files Created/Modified

**Data**
- `public/data/world-manifest.json` — twelve self-colourable records; `policy` gains `selfColorableCount`, `selectableCount`, the explicit selectability split, and rewritten `neutralUnits` prose. New SHA-256 `22af5b62c089544eef6ad107c4e3e6682b6f74b33a3be2638c6a8e1640f68d49`.
- `public/data/world-modern.geojson` — **regenerated by the script, never hand-edited.** 207 features now carry `"isSelectable":true`. New SHA-256 `d02b604a92a4a7f4481c6bf9a92490adbfe4c6bc4b7ed4fd044c36bb4e2b5645`. The check's own `canonicalBytes.equals(committedBytes)` comparison passes, which is the deterministic-regeneration proof.
- `scripts/prepareWorldData.mjs` — the third `createRuntimeFeature` branch, the derived count assertions in `createCanonicalBytes` / `validateRuntimeFeatures`, and the two-number `--check` success line.

**Runtime**
- `src/types/map.ts` — the fourth `SceneFeature` variant.
- `src/utils/geojson.ts` — matching metadata variant and normalizer branch, held to the same three conditions as `modern-core`.
- `src/hooks/useGeoData.ts` — the manifest header's explicit split and both counts; `readNonCoreUnit`'s third branch; `countryMetadata` at 207; the new `colorableLookup`.
- `src/utils/scene.ts` — `hasSelectableIdentity` admits the new mode; `getEffectiveFeatureColor`'s null-owner branch kept and its comment corrected (it no longer fires on the Modern scene).
- `src/constants/colors.ts` — the `NEUTRAL_UNIT_COLOR` comment no longer says *units nobody can color*; the solid-fill-never-a-CSS-filter reason is kept verbatim because it is load-bearing for the export path.
- `src/App.tsx` — Locate reads `colorableLookup`.
- `src/components/CountryList.tsx` — the `selectableCountryIds` JSDoc now says 207, not "the modern 195-core list".

**Tests**
- `src/utils/scene.test.ts` — three new assertions against the **committed** world asset, counted against the literal `207`.
- `src/utils/worldDataAsset.test.ts` — re-pinned hashes; the record loop now asserts three categories separately; the twelve ids are written out, not counted.
- `src/components/CountryList.test.tsx`, `src/components/LocateCountry.test.tsx` — fixtures widened from `coreStates` to the manifest's colourable set (207), with explicit Kosovo assertions.
- `src/App.test.tsx`, `src/components/MapWorkspace.test.tsx`, `src/components/MapCanvas.test.tsx` — fixture shapes updated for the new variant and `colorableLookup`.
- `tests/e2e/support/appHarness.ts` — `LOGICAL_CORE_COUNT` 195 → **207**.
- `tests/e2e/navigation.spec.ts` — the D-23 gate replaced by *"every unit is colourable (D4-10)"*.
- `tests/e2e/{phase2-composition,export,persistence,final-integration,history,locate}.spec.ts` — local count constants bumped to 207.

**Documents**
- `.planning/coding-rules/data.md` — new § *Three colour policies, two counts (D4-10, landed in 04-03)*. § *the approval chain* is **byte-unchanged** (verified: `git diff` shows no hunk between lines 193–204). "Last updated" kept at two entries by merging the two oldest in the same edit.
- `.planning/coding-rules/general.md` — Live Invariant 5 **amended, not deleted**; it now names both 195 and 207 and states what each counts. Two "Last updated" entries maintained.
- `.planning/ROADMAP.md` — **scoped `Edit` on the § Phase 5 `05-02` bullet only**, with a dated amendment note. § Progress and every plan checkbox untouched.
- `.planning/debug/kosovo-renders-white-uncolorable.md` — annotated `SUPERSEDED` and **now tracked**.

## Decisions Made

1. **`policy-b-third-value`** — see Task 1 above.
2. **`colorPolicy: "self-colorable"` / `interactionMode: 'self-colorable'`** as the value name, matching `selfColorableCount`.
3. **The manifest key `neutralUnits` was kept, its prose rewritten** — as the plan directs. Renaming the key would have been a cleaner label but a wider, less auditable diff, and the plan's instruction was explicit.
4. **`coreLookup` was not widened; `colorableLookup` was added.** 195 keeps meaning core states everywhere in the codebase; nothing that reads `coreLookup` silently changed meaning.
5. **The D-23 e2e gate was replaced rather than deleted.** Its `NON_COLORABLE_UNIT_COUNT` is now pinned at **0** with the same failure message about reclassification being a DATA decision. Deleting it would have removed the only browser-side proof that both colour resolvers agree.
6. **`TOOLTIP_NOT_COLORABLE_REASON` and the null-owner colour branch were kept in the code.** Historical scenes and malformed records still need them; `Tooltip.test.ts` still covers the string. `04-08` — not this plan — repurposes `NEUTRAL_UNIT_COLOR` as the uncoloured-country fill (D4-09).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The D-23 e2e gate asserted the exact behaviour D4-10 reverses**

- **Found during:** Task 3
- **Issue:** `tests/e2e/navigation.spec.ts` carried a whole `test.describe('non-colourable units stay honest (D-23)')` block asserting twelve null-owner units, a `default` cursor over Kosovo, and a tooltip stating *"Not colorable in this map"*. All three are now false on the Modern scene, so the suite could not go green.
- **Fix:** Replaced the block with `test.describe('every unit is colourable (D4-10)')`, keeping the fill-count probe (now pinned at zero) and adding the click-and-paint assertion the plan requires.
- **Verification:** `npx playwright test --project=chrome` — 105 passed; RED-proved by probes 8 and 9.
- **Committed in:** `784fe17`

**2. [Rule 3 — Blocking] Six e2e specs carried their own copy of the 195 constant**

- **Found during:** Task 3
- **Issue:** The plan names only `appHarness.ts`'s `LOGICAL_CORE_COUNT`. `phase2-composition`, `export`, `persistence`, `final-integration`, and `history` each declare a local `LOGICAL_CORE_COUNT = 195`, and `locate.spec.ts` a `MODERN_CORE_COUNT = 195`. All six would have failed.
- **Fix:** Bumped all six to 207.
- **Verification:** Full Chrome suite green.
- **Committed in:** `784fe17`

**3. [Rule 1 — Bug] `worldDataAsset.test.ts` pinned the pre-change asset hashes and the retired `nonCoreSelectable` field**

- **Found during:** Task 3 (the file is not in the plan's `files_modified`)
- **Issue:** The test pins the manifest and world-asset SHA-256s and `toMatchObject`s the policy block. Both moved.
- **Fix:** Re-derived both hashes; rewrote the record loop to assert the three categories separately; added an assertion that `nonCoreSelectable` is **gone**, not merely different.
- **Verification:** `npx vitest run src/utils/worldDataAsset.test.ts` — 11 passed.
- **Committed in:** `784fe17`

**4. [Rule 2 — Missing correctness] `CountryList`/`LocateCountry` fixtures and JSDoc still claimed 195**

- **Found during:** Task 3
- **Issue:** Both test files built their catalog fixture from `worldManifest.coreStates` and asserted 195, and `CountryList.tsx`'s `selectableCountryIds` JSDoc said *"the browsable catalog stays the modern 195-core list"*. The tests passed but their titles and the production comment stated something now false about the app, and nothing at unit level covered the plan's must_have *"the twelve appear in `CountryList` and in Locate"*.
- **Fix:** Fixtures derived from the manifest's colourable set (207) with explicit Kosovo assertions; the JSDoc corrected.
- **Verification:** `npx vitest run src/components/CountryList.test.tsx src/components/LocateCountry.test.tsx` — 11 passed.
- **Committed in:** `784fe17`

**5. [Rule 3 — Blocking] Type-level fixture breakage from the fourth union variant**

- **Found during:** Task 3
- **Issue:** `App.test.tsx` and `MapWorkspace.test.tsx` construct a `WorldGeoDataState` literal (now missing `colorableLookup`); `MapCanvas.test.tsx`'s `createSceneFeature` helper narrowed on the old three-variant union.
- **Fix:** Added `colorableLookup` to both fixtures and the new mode to the helper's selectable branch.
- **Verification:** `tsc -b` clean.
- **Committed in:** `784fe17`

---

**Total deviations:** 5 auto-fixed (1 × Rule 1, 1 × Rule 2, 3 × Rule 3)
**Impact on plan:** All five were required to reach a green suite or to stop a document/gate stating something now false. No scope creep — nothing outside the plan's subject was touched, and no new package was installed (**zero package-manager installs**, as the threat model requires; `package.json` and `package-lock.json` are unchanged).

## Issues Encountered

**Two probes reddened the wrong gate before being re-aimed.** Documented in full in the RED-proofs table above (probe 5, and the fatal-error-state variant of probe 8). Both are the failure shape `CLAUDE.md` names; neither was recorded as a pass.

**The plan's acceptance grep `grep -c '"colorPolicy":"neutral"'` cannot fail on this file.** The manifest is pretty-printed with a space after every colon, so the no-space pattern returns 0 whatever the file contains. The meaningful check is `grep -c '"colorPolicy": "neutral"'`, which also returns **0**. Both were run; the second is the one that carries information. The same caveat applies to `grep -c '"isSelectable":true' public/data/world-modern.geojson` — that one *does* work, because the geojson is minified, and it returns **207**.

**Two tests in `MapCanvas.test.tsx` still model 195.** `models the reviewed modern world as 195 logical options and 248 units` builds synthetic fixtures and is about the path model's arithmetic, not the shipped catalog; it still passes and its subject is unchanged. Left alone deliberately rather than renamed, to keep this plan's diff on its own subject. Flagged here so a later reader does not mistake it for a missed count site.

## Verification

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **682 / 682** passed, 45 files (baseline 679; +3 new scene assertions) |
| `npm run build` (`tsc -b` + vite) | clean, no `any` and no cast in the widened union |
| `npx playwright test --project=chrome` | **105 / 105** passed |
| `npm run data:world:check` | PASS — *"248 units, 195 selectable core states, and 207 colorable units."* |
| `grep -c '"isSelectable":true' public/data/world-modern.geojson` | **207** |
| `grep -n "nobody can color" src/constants/colors.ts` | no hit (required) |
| `grep -c "not colorable" .planning/ROADMAP.md` | **0** |
| `grep -n "SUPERSEDED" .../kosovo-renders-white-uncolorable.md` + `git ls-files --error-unmatch` | hit, and tracked |
| `.planning/coding-rules/data.md` "Last updated" entries | 2 |
| `.planning/coding-rules/data.md` § the approval chain | byte-unchanged (no diff hunk) |
| `.planning/STATE.md` | **untouched** |
| `.planning/ROADMAP.md` § Progress / plan checkboxes | **untouched** — only the scoped `05-02` amendment |
| Forbidden gsd-sdk verbs (`state.advance-plan`, `state.update-progress`, `roadmap.update-plan-progress`) | **none run** |

**Browser scope, stated exactly:** installed **Chrome 151.0.7922.75 only**. **Microsoft Edge is NOT installed on this machine**; the `msedge` Playwright project cannot launch and no Edge, Firefox, or Safari result is produced or cited. **No Phase 3 UAT cell is cited as verified** — nine of its twelve were never performed, and nothing here substitutes an automated result for a physical check.

## Known Stubs

None introduced by this plan.

Pre-existing and unchanged, carried forward from `.continue-here.md`: a saved composition still reloads with default water (owned by `04-14`'s V3 persistence work).

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or trust-boundary schema change. The two boundaries in the plan's threat model are unchanged: Natural Earth reaches the repo at **build time only** (`readSource`, never at runtime), and `public/data/*` stays same-origin, hash-verified, and validated on load. `T-04-03-01` through `T-04-03-SC` were each mitigated as planned — `--check` stayed derivational, the throws became a branch rather than a loosening, the approval paragraph is in both the commit message and this SUMMARY, the new `useGeoData` branch goes through `hasReservedObjectKey`, the fetch precondition was verified rather than mitigated in code, and zero packages were installed.

## Next Phase Readiness

- **`04-08` (D4-09) is unblocked as intended.** With no "not colorable" bucket left on the Modern scene, `NEUTRAL_UNIT_COLOR` (`#E5E7EB`) is free to mean simply *uncoloured*. `04-08` — not this plan — makes that change. The grey-vs-grey ambiguity raised during discussion dissolves rather than needing a second grey.
- **The e2e suite is settled at 207 before nine later plans build gates on top of it**, which was the reason for sequencing this in wave 2.
- **`05-02` now has a coherent contract:** the twelve are ordinary match targets for the CSV matcher, not a report category.
- **Nothing is blocked.** The working tree is clean and every gate is green.

---
*Phase: 04-visual-cartographic-system-1-5-2-weeks*
*Plan: 03*
*Completed: 2026-08-06*
