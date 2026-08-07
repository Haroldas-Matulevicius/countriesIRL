---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 14
subsystem: storage
tags: [schema-migration, persistence, bounds, G-2, D4-17, D4-18, D4-02]
status: complete
requires:
  - "04-05 — the ColorValue union and resolveColorValue as its only reader (Live Invariant 10)"
  - "04-11 — composition text fields and sanitizeCompositionText"
  - "04-12 — the legend chrome fields deleted; removed-is-not-damaged"
  - "04-13 — legend form/caption/showNoData, and the resolved-form save"
provides:
  - "schemaVersion: 3 records; isSavedCompositionV3 beside the retained isSavedCompositionV2"
  - "lossless persistence of the ColorValue union — ramp identity survives a round trip"
  - "persistence of surfaceColor, uncoloredFill, borderColor, both stroke weights, four band fields, and the five text fields"
  - "one-path in-memory migration of V2 records with Phase 4 defaults and NO repair warning"
  - "the first automated coverage G-2 has ever had"
affects:
  - "src/utils/storage.ts — the version dispatch, the wire serializers, normalizeSettings"
  - "src/types/composition.ts, src/types/ui.ts, src/hooks/useCompositionLoadTransaction.ts — sourceVersion widened to 1 | 2 | 3"
  - "tests/e2e/persistence.spec.ts — re-baselined to V3; six re-declared helpers now imported"
tech-stack:
  added: []
  patterns:
    - "A three-way version dispatch where every branch produces the SAME in-memory snapshot"
    - "Defaults-not-repairs: absent is a schema difference, invalid is corruption, asserted in both directions per field"
    - "A record is upgraded only by an explicit save of its OWN — a re-written neighbour keeps its version's wire shape"
    - "Migration gates asserted against HAND-CONSTRUCTED stored records, never a self-agreeing save/load round trip"
key-files:
  created: []
  modified:
    - src/utils/storage.ts
    - src/utils/storage.test.ts
    - src/types/composition.ts
    - src/types/ui.ts
    - src/hooks/useCompositionLoadTransaction.ts
    - tests/e2e/persistence.spec.ts
    - .planning/coding-rules/storage.md
decisions:
  - "Owner gate answered `v3-one-path` — one rendering path, no legacy mode (D4-17)"
  - "V3 does NOT persist `settings.backgroundColor`; the plan named 04-14 as the decider and it decided to drop it"
  - "A custom colour persists as a bare canonical hex, not `{kind:'custom',hex}` — one json node instead of four, which is what keeps the worst case inside the node budget"
  - "Stored text is bounded at MAX_COMPOSITION_TEXT_LENGTH (100), NOT at characterBoundFor's role bounds — the product refuses rather than truncates"
  - "`legend.form` stays persisted RESOLVED; 04-13's invited revisit is now possible but deliberately not taken"
  - "MAX_STORAGE_JSON_NODES was NOT raised; the measured headroom is reported instead"
metrics:
  duration: ~85 minutes
  completed: 2026-08-07
  tasks: 3
  commits: 2
actuals:
  tokens: 61000
  tasks: 3
  commits: 2
---

# Phase 4 Plan 14: V3 Persistence, One-Path Migration, and G-2 Summary

Every Phase 4 field now persists losslessly at `schemaVersion: 3` — including the ramp identity
`04-05` was knowingly throwing away — a V2 record migrates in memory with Phase 4 defaults and **no
corruption toast**, and **`G-2` has been exercised for the first time in this project's history**.

---

## Task 1 — the owner gate, answered

**Decision: `v3-one-path`.** Every saved V2 map loads with Phase 4 defaults applied. One rendering
path, no legacy mode.

**The reasoning recorded:** this is D4-17 as the owner already decided it, and the gate re-confirms
the one-way move. The alternative requires **resurrecting the legend chrome `D4-11` just deleted**
in order to feed a second renderer with its own gates, forever — the two-models-coexisting
complexity that produced `G-3`.

**The creator-visible consequence is explicitly acknowledged and accepted.** A map saved before
Phase 4 reopens with: **no legend box**; **grey uncoloured countries** instead of white; **a top
band on** by default; **coastlines at `none`** with interior borders at `thin`; and the legend
**lower**, below the title block. **Re-exporting it produces a PNG that differs from one the creator
may already have posted to Instagram.**

**Nothing unrecoverable is lost:** colours, country selections, legend labels and ordering, legend
position, text size, camera, and composition name all survive. What is gone is the legend's box
styling, already deleted from the model by `D4-11`.

**The technical consequence is confirmed, not discovered:** once `save()` writes
`schemaVersion: 3`, an older build reading the same browser origin reports `unsupported-version`
for that record — a refusal, not a crash, and the other records in the array still load.
Browser-local, no deployment exists, so it affects only a machine running an older build against the
same profile.

**Authorization, in the required words:** answered under a **blanket, in-advance, sight-unseen
proceed-authorization**. It **authorizes proceeding**; it is **not a content review** and it is
**not hash-bound** (Immutable Safety Constraint 8).

The acknowledgement is not left in prose. `storage.test.ts` §*migrates a V2 record onto the ONE
rendering path* asserts each of the five defaults on a hand-built V2 record, and asserts what
survives beside them.

---

## Task 2 — the V3 branch beside V2

**Commit `79f96ae`.**

- **A `3` branch beside the `2` branch.** `isSavedCompositionV2` is **kept** (3 references remain in
  `storage.ts`), `isSavedCompositionV3` added. A V2 record is read and upgraded **in memory**; only
  the bytes a save WRITES changed.
- **A record is upgraded only by an explicit save of its own.** A V2 record re-written because a
  *neighbour* was saved is serialized back in the V2 wire shape — hex colours and the lone
  `backgroundColor` settings field. Spreading the reader's now-full V3 settings object into a
  `schemaVersion: 2` record would make the bytes claim a version whose shape they do not have. This
  is the same rule that has always kept a V1 record V1.
- **`04-05`'s interim resolve-to-hex is replaced.** A ramp assignment persists as
  `{kind:'ramp',rampId,t}`; a custom one persists as a **bare canonical hex** (V2's own wire shape,
  one json node instead of four). Ramp identity survives a round trip, so a reopened map can be
  re-skinned again.
- **`backgroundColor` is dropped from V3.** The plan named `04-14` as the decider. It is a V2 wire
  field, nothing renders from it, and `surfaceColor` is what paints. Its V2 `=== '#FFFFFF'`
  requirement became a **migration, not a rejection** — reading and discarding it, exactly as
  `04-12` made the three deleted legend chrome fields read and discarded.
- **`04-13`'s resolved-form fix preserved**, untouched. See §Open, below.
- **`coding-rules/storage.md` updated in the same commit**, with the two-entry rule honoured (the
  two oldest entries merged in the same edit).

### Deviation: text is bounded at 100, not at `characterBoundFor`

The plan's action said to bound text *"per `characterBoundFor`'s role bounds"*. **It is bounded at
`MAX_COMPOSITION_TEXT_LENGTH` (100) through `sanitizeCompositionText` instead** — the same bound and
the same sanitiser the composition reducer applies.

`compositionText.ts` records that the product **refuses rather than truncates** past a role bound: a
creator can hold an over-bound title in state, watch the counter turn destructive, and be told to
shorten it, while `getCompositionTextBlockingMessage` blocks the export. Truncating at the storage
boundary would silently clip those words, convert a legible refusal into invisible damage, and mean
a title no longer round-trips. **A storage bound must equal the state boundary's bound.** Asserted
both ways: a 40-character title (over the 27-char medium role bound) loads **verbatim with no
repair**; a 110-character subtitle is bounded to 100 **and reported**.

There is **no** "count of text boxes" bound: the schema has exactly three named text fields and no
collection, so a count is structurally unrepresentable. No separate ramp-assignment cap was added
either — see the budget finding below for why one would have been decorative.

### The node budget — measured, and NOT raised

`04-05` flagged this as a real question, and it was. Measured with the same walk
`hasSafeJsonBudget` performs:

| Store | V2 nodes | V3 nodes | vs `MAX_STORAGE_JSON_NODES` = 50,000 |
|---|---|---|---|
| **ONE worst-case record** (512 ramp colours + 512 legend entries) | 2,584 | **4,134** | fits |
| **TEN worst-case records** (a full `MAX_SAVED_MAPS` store) | 25,831 | **41,331** | fits |
| TEN realistic records (207 colourable units, 30 legend entries) | — | 9,851 | fits |

**It fits and the bound was not raised.** The honest half: a hostile full store went from **48%
headroom under V2 to 17% under V3** — the union spent roughly two thirds of what was spare. A real
creator cannot approach it: there are 207 colourable units, so 9,851 is the practical ceiling, and
41,331 needs hand-edited `localStorage`. Serialized length is not the binding constraint (506,601
chars against 1,000,000).

The margin is pinned **behaviourally through the real adapter** rather than by re-implementing the
walker and agreeing with it: **twelve worst-case records still parse (49,597 nodes) and thirteen do
not (53,730)**. A future field that inflates the per-record cost moves that boundary and reddens the
gate.

> ⚠ **A per-field cap could not have protected this, and none was added to pretend otherwise.**
> `hasSafeJsonBudget` runs over the **whole parsed array** before any record is validated, so the
> per-field caps only ever trim a record that has already parsed. If a future field pushes the worst
> case over 50,000 the failure mode is **the entire store rejected at once**, not a trimmed record.

---

## Task 3 — the round-trip gate, its discrimination control, and G-2

**Commit `4179079`.**

**Every migration fixture is hand-constructed.** A save/load pair through the same code path agrees
with itself: it cannot see a field written but never read, and it cannot see a V2 record at all,
because nothing in this build writes one any more. Three independent assertions:

1. the stored **bytes** compared against a hand-written wire literal — the serializer checked
   against something other than its own reader;
2. a fully-populated snapshot (every new field non-default) reloads **deep-equal**;
3. **the discrimination control**, parameterised over 20 fields: two snapshots differing in exactly
   one field must still differ *after* a round trip.

### G-2 — exercised for the first time, and what was actually FOUND

`03-UAT.md` § Gaps expected: *"a pre-restyle saved map with a 15–32 character label should load
cleanly then refuse to export."* Neither a human nor a machine had ever tested it.

**Finding: the expectation is confirmed — but it is narrower than the UAT states, and the missing
qualifier is the default text size.**

| Hand-built V2 record | Loads | Exports |
|---|---|---|
| 15-char label (`'Southern Europe'`, the UAT's own example), `textSize: medium` | **clean** — `ok`, `sourceVersion: 2`, no `corrupt-data`, no `composition-repaired`, label verbatim | **REFUSED** — `LEGEND_LABEL_FIT_MESSAGE` |
| every length 15…32, `textSize: medium` | clean, all 18 | refused, all 18 |
| 7-char label (`'Visited'`), `textSize: medium` — control | clean | **exports** |
| the SAME 15-char label at `textSize: small` | clean | **exports** |

So `G-2` is not *"15–32 characters always blocks"*. It is **"15–32 characters blocks at the DEFAULT
`medium` size"** — the trap is the pairing of the label with the size a pre-restyle map was most
likely saved at. A creator who had saved at `small` is unaffected. That qualifier is new information
and is now recorded in the test itself.

The refusal is bound to **`getLegendBlockingMessage`'s behaviour**, never to the per-line character
table, so `04-13`'s legend rewrite cannot silently defuse it. Verified:
`grep -vE "^\s*(//|\*|/\*)" src/utils/storage.test.ts | grep -c "LEGEND_CHARACTERS_PER_LINE"`
returns **0**. It is also asserted **not** to be `LEGEND_OVERFLOW_MESSAGE`, because this map has one
colour and a refusal about colour count would be the wrong refusal.

**Related and still open — `F-1` is NOT validated by this.** The 14-character default legend-label
export ceiling ships accepted-as-deferred and the verifier's three grounds against that bound are
**unrebutted**. This plan proves the ceiling *bites* an already-saved map; it says nothing about
whether 14 is the right number.

### e2e

- A new case saves a ramp-painted map with non-white water, both bands, and a title; **reloads the
  page**; loads it back; and asserts the **stored record holds `{kind:'ramp',rampId:'reds',t}`**
  (not just a matching `fill`, which `04-05`'s lossy interim also produced), the surface rect's
  `fill`, two band rects, the title's text content, and that the controls agree after the reload.
- **The recorded wart in `persistence.spec.ts` is closed.** It re-declared `LOGICAL_CORE_COUNT`,
  `LOGICAL_PATH_SELECTOR`, `CAMERA_GROUP_SELECTOR`, `waitForApp`, `readCameraTransform`, and
  `expectD3ZoomSynchronized` verbatim beside the shared fixtures it already imported. All six now
  come from `tests/e2e/support/appHarness.ts`.

---

## RED proofs — three, each on its own subject

### 1. Round trip — the discrimination control

**Mutation:** `src/utils/storage.ts`, `toStoredSettings` — dropped `coastlineWeight` from the V3
serializer.

**Verbatim, the discrimination assertion:**

```
AssertionError: settings.coastlineWeight must still differ AFTER the round trip:
expected { …(5) } to not deeply equal { …(5) }

Compared values have no visual difference.
```

`Compared values have no visual difference` is the exact signature this control exists to catch —
two round trips that collapsed onto the same object. **Stated plainly: the deep-equal assertion and
the byte-literal assertion reddened too**, because the populated snapshot holds `coastlineWeight:
'medium'` rather than the default. That is expected, and it does not weaken the control: the
discrimination assertion is the only one that names the field and the only one that would still fire
if the populated value happened to equal the default.

Restored by scratchpad copy-back (`storage.ts.GREEN-0414`); `git status` clean for that file.

### 2. G-2 — step 2 reddened while step 1 stayed GREEN

**Mutation:** `src/utils/legend.ts` — raised the per-line table to `{small: 40, medium: 40, large:
40}` so a 15–32 character label fits on one line.

```
✓ G-2 … > STEP 1: loads cleanly - ok, no corrupt-data, no composition-repaired
× G-2 … > STEP 2: then REFUSES to export, with the label-fit message
✓ G-2 … > CONTROL: the same record with a short label loads cleanly AND exports
× G-2 … > holds across the whole 15-32 band storage admits
✓ G-2 … > is a MEDIUM-size trap: the same label at small clears the gate
```

Verbatim failures:

```
AssertionError: expected null not to be null
AssertionError: 15 chars should block export: expected null to be 'Shorten this label so it fits in the …' // Object.is equality
```

**Step 2 reddened, step 1 stayed green** — the pairing that is the whole point of G-2. The short-label
control also stayed green, correctly: it was never blocked.

Restored by scratchpad copy-back (`legend.ts.GREEN-0414`); `git status` clean for that file.

### 3. Pre-parse bound ordering

**Mutation:** `src/utils/storage.ts`, `parseSavedMaps` — moved the `MAX_STORAGE_SERIALIZED_LENGTH`
check to **after** `parser(serialized)`.

```
× rejects oversized serialized input before invoking the injected parser
× refuses an oversized V3 store WITHOUT invoking the parser
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
```

**Honest attribution:** the first of those two assertions **pre-dates this plan** — `04-05` landed
it. This plan added the second, which runs the same probe against a real V3 record so the widened
record cannot route around the ordering. Both reddened.

Restored by scratchpad copy-back (`storage.ts.GREEN2`); `git status` clean for that file.

---

## Verification

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **873 / 873** across 47 files (baseline 850) |
| `npm run build` | clean |
| `npx playwright test --project=chrome` | **136 / 136** (baseline 135; +1 new case) |
| `npm run data:world:check` | **PASS** — 248 units, 195 selectable core states, 207 colorable units; interior-border mesh re-derived and matched, 327 geometries, 366,767 bytes |

**Browser, recorded exactly:** installed **Google Chrome 151.0.7922.76**, Playwright **1.61.1**,
`--project=chrome`. **Edge is NOT installed on this machine** and no Edge, Firefox, or Safari result
was produced or is cited. No Phase 3 UAT cell is cited as verified.

**Selector ceiling:** untouched (337). No CSS changed.

**New npm packages: ZERO.** `package.json` and `package-lock.json` are unmodified (T-04-14-SC).

---

## Deviations from Plan

**1. [Rule 2 — correctness] Text bounded at `MAX_COMPOSITION_TEXT_LENGTH`, not `characterBoundFor`**
- **Found during:** Task 2
- **Issue:** bounding stored text at the per-role line bound would truncate a legitimate saved state
  and convert a legible export refusal into silent data loss
- **Fix:** bound at 100 via `sanitizeCompositionText`, the same bound the reducer applies; both
  directions asserted
- **Files:** `src/utils/storage.ts`, `src/utils/storage.test.ts`
- **Commit:** `79f96ae`

**2. [Rule 1 — plan text correction] `04-05`'s interim resolve-to-hex is in `storage.ts`, not
`colors.ts`**
- **Found during:** Task 2
- **Issue:** the dispatch brief located the interim in `canonicalizeColorMap`. It is not there —
  `canonicalizeColorMap` preserves the union (`canonicalizeColorValue` returns a ramp variant
  as-is). The resolve-to-hex was `toStoredColorMap` in `src/utils/storage.ts`.
- **Fix:** replaced it where it actually lived. **`src/utils/colors.ts` required no change and was
  not modified**, despite being listed in `files_modified`.
- **Commit:** `79f96ae`

**3. [Rule 3 — blocking] Three existing unit tests and two e2e assertions re-baselined**
- **Found during:** Tasks 2 and 3
- **Issue:** they asserted the V2 wire shape and `04-05`'s lossy save — the exact behaviour this
  plan replaces. They are deliberate, itemised re-baselines, each annotated in place with what moved
  and why, not loosened assertions.
- **What moved:** `schemaVersion` 2 → 3 in two round-trip tests; the ramp-lossy test inverted to
  assert the ramp identity **survives**; `savedEvidence.schemaVersion` 2 → 3 and
  `settings.backgroundColor` → a `settingsKeys` **key-set** assertion in `persistence.spec.ts`; the
  fixture's `sourceVersion` 2 → 3 for a record this build wrote.
- **Commits:** `79f96ae`, `4179079`

**4. [scope] `persistence.spec.ts`'s duplicated helpers removed**
- The plan said not to copy the wart. Six re-declared helpers were removed and imported instead,
  which closes it rather than working around it.
- **Commit:** `4179079`

---

## Carried forward, unchanged

**T-04-14-04 — the deferred-snapshot-id validator.** `storage.ts` builds `SNAPSHOT_IDS` from the
**full five-entry catalog**, so a hand-edited record can still name a deferred snapshot and be
admitted; Phase 3 filtered only the presentation layer (`getPeriodShortLabel`). **Pre-existing Phase
2 behaviour, recorded in `STATE.md`, not introduced here, and deliberately not fixed** — changing
what stored records are admitted is a data-layer decision, not a schema bump. Restated so it stays
visible. `persistence.spec.ts` still covers the presentation-layer half.

---

## Open

**`legend.form` is still persisted RESOLVED.** `04-13` made save write the resolved form after
finding that every reopened map silently changed form, because `04-05`'s hex-at-serialization left a
reloaded composition with no ramp assignments for `inferLegendForm` to read (measured: 1,426 red
legend pixels before a reload, 484 after). **V3 removes that cause** — the ramp identity now
survives — so the revisit `04-13` invited is genuinely available. It was **deliberately not taken**:
reverting to a raw override is a creator-visible behaviour change needing its own gates, and it is
not this plan's subject. `04-13`'s fix is preserved intact.

**`F-1` remains open and unvalidated.** The 14-character default legend-label export ceiling ships
accepted-as-deferred; the verifier's three grounds are unrebutted. Nothing here bears on whether 14
is correct.

**`G-2`'s human half.** It has now been exercised **by machine, for the first time**. What remains
unverified by a human: nobody has opened a real pre-Phase-4 saved map in a browser, seen the export
button refuse, and judged whether the message is actionable at that moment. `03-UAT.md` records the
owner had no such composition; this plan built one in a test, not in a browser profile.

---

## Known Stubs

None.

## Self-Check: PASSED

Files asserted to exist:
- `FOUND: src/utils/storage.ts`
- `FOUND: src/utils/storage.test.ts`
- `FOUND: src/types/composition.ts`
- `FOUND: tests/e2e/persistence.spec.ts`
- `FOUND: .planning/coding-rules/storage.md`
- `FOUND: .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-14-SUMMARY.md`

Commits asserted to exist:
- `FOUND: 79f96ae` — feat(04-14): a V3 branch beside V2, with defaults instead of repairs
- `FOUND: 4179079` — test(04-14): the V3 round-trip gate, its discrimination control, and G-2
