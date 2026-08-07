---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 05
subsystem: colour-identity-model
tags: [D4-02, D4-03, discriminated-union, chokepoint, undo-redo, storage-boundary]
status: complete
requires:
  - "04-02 — `RampId`, `RAMPS`, `RAMP_IDS`, `shadeForValue` (`src/utils/ramps.ts`)"
  - "Live Invariants 1, 2, 3 (`.planning/coding-rules/general.md`)"
provides:
  - "`ColorValue` discriminated union — the ramp variant `{rampId, t}` primary, a raw hex demoted to the custom variant"
  - "`resolveColorValue(value, ramps)` — the single resolution chokepoint (new Live Invariant 10)"
  - "`isColorValue` — one structural rule for untrusted colour values, reused by the storage boundary"
  - "`resolveColorMapHexes` / `getEffectiveSceneColors` — the two funnels that keep the legend on resolved hexes"
  - "`customColor` / `rampColor` constructors, `areColorValuesEqual` structural comparison"
  - "the generalized-identity round-trip invariant in `useMapState.test.ts`"
affects:
  - "04-06+ — the palette UI dispatches a ramp variant through the existing reducer action; no model work left"
  - "04-14 — inherits the V3 persistence work; this plan's hex-at-save is the interim it replaces"
  - "Phase 5 — the CSV classing engine produces the ramp variant with no adapter"
tech-stack:
  added: []
  patterns:
    - "Discriminated union with an explicit `kind` field so narrowing is a property read, never a `typeof` test"
    - "One resolution chokepoint with the ramp table as a PARAMETER, so resolution is late-bound"
    - "Two shapes on purpose: the V2 wire format is hex, the in-memory model is the union, and one file knows both"
key-files:
  created: []
  modified:
    - src/types/map.ts
    - src/utils/colors.ts
    - src/utils/colors.test.ts
    - src/utils/scene.ts
    - src/utils/scene.test.ts
    - src/utils/storage.ts
    - src/utils/storage.test.ts
    - src/providers/MapStateProvider.tsx
    - src/hooks/useMapState.test.ts
    - src/hooks/useLocalStorage.ts
    - src/components/ColorPicker.tsx
    - src/components/{ColorPicker,CountryList,MapCanvas,SaveLoad}.test.tsx
    - src/hooks/useComposition{Load,Save}Transaction.test.tsx
    - src/utils/legend.test.ts
    - tests/e2e/persistence.spec.ts
    - .planning/coding-rules/{general,frontend,storage}.md
decisions:
  - "Task 1 owner gate answered `identity-union` — the discriminated union with one chokepoint"
  - "`isPresetColor` DELETED — zero consumers anywhere in the repo"
  - "The provider's public `setColor`/`setColors` keep a `string` signature; `prepareColorInteraction` is the one string→union constructor"
  - "`t ∈ [0, 1]` is part of `isColorValue`'s shape, not a later clamp — one rule for memory and storage"
  - "Saving stays V2 hex until `04-14`; lossy in the ramp identity, never invalid"
metrics:
  duration: ~75 min
  completed: 2026-08-07
  tasks: 3
  commits: 2
actuals:
  tokens: 31717
  tasks: 3
  commits: 2
---

# Phase 4 Plan 05: The Colour Identity Model Summary

`ColorMap`'s value is now a discriminated union — the ramp variant `{rampId, t}` is primary, a raw
hex is one variant of it, and `resolveColorValue` is the single chokepoint that turns either into
the pixel a country paints.

---

## Task 1 — OWNER GATE: recorded as answered, not stopped on

**Decision: `identity-union`** — option (A), the discriminated union in `ColorMap` with one
`resolveColorValue` chokepoint.

Reasoning as recorded:

- It is **D4-02 as written** — the owner's decision already; this gate only settled its shape.
- `04-RESEARCH.md § D4-02's blast radius` measured both shapes against the six call sites and
  **recommends the union**.
- Option (B) creates **two sources of truth that can disagree** — the drift hazard
  `coding-rules/general.md` names by name. Rejected on that ground specifically.
- Phase 5's CSV classing engine produces exactly this shape with **no adapter**.
- Creator-visible upside: with ramp identity stored, **switching the active ramp re-skins every
  country painted with it instantly.** Resolved-hex-only cannot do that.
- Accepted cost, stated not glossed: highest migration cost — all six call sites plus every history
  snapshot; the **persisted value shape changes**, so reverting needs a storage migration.

**Authorization.** Answered under a **blanket, in-advance, sight-unseen proceed-authorization**. It
**authorizes proceeding**; it is **not a content review** and it is **not hash-bound** (Immutable
Safety Constraint 8). Terms: `04-AUTHORIZATION.md`.

**This is a one-way decision.** `04-CONTEXT.md` rates D4-02 one-way because it changes the persisted
`ColorMap` value shape. Proceeded anyway — that is what is authorized.

The plan's `<assumption_delta_decision>` block stands as written (`promote`). The `add-alongside`
rewrite applied only to `identity-parallel-map`, which was **not** chosen, so **no accepted debt is
recorded for the assumption delta**.

---

## What shipped

### The union (`src/types/map.ts`)

```
ColorValue = { kind: 'custom'; hex: string }
           | { kind: 'ramp'; rampId: RampId; t: number }
ColorMap   = Readonly<Record<CountryId, ColorValue>>
ColorHistory = ReadonlyArray<ColorMap>      // unchanged shape, new element type
```

`kind` is an explicit discriminant, so narrowing is a property read. `typeof x !== 'string'` is now
**absent from `colors.ts` and `scene.ts`** — the old shape test is gone, not bypassed.

### The one chokepoint (`src/utils/colors.ts`)

`resolveColorValue(value, ramps = RAMPS)` is the only place a stored value becomes a hex, with a doc
comment in `resolveLegendPosition`'s voice naming what breaks if a second reader appears.
`shadeForValue` has exactly one production caller outside `ramps.ts` — line 139 of `colors.ts`,
inside the chokepoint.

`ramps` is a **parameter, not a module read**. That is what makes resolution late-bound and the
ramp-switch re-skin possible, and it is gated: one stored value resolved against two ramp tables
yields two hexes.

### The six measured sites, migrated

| Site | What changed |
|---|---|
| `getEffectiveCountryColor` | reads the variant, calls the chokepoint; no type test |
| `canonicalizeColorMap` | keeps a ramp variant a ramp variant; canonicalizes a custom hex |
| `applyColorToCountries` | takes a `ColorValue`; a malformed one is a no-op write |
| `areColorMapsEqual` | structural via `areColorValuesEqual` |
| `hasEffectiveColorChange` | takes a `ColorValue`; absent key ≡ white |
| `getEffectiveSceneColors` → `reconcileLegend` | resolves to hex first; dedupe-by-hex unchanged |
| `ColorHistory` / the reducer | every snapshot carries the union losslessly |
| `isPresetColor` | **deleted** (below) |

Two funnels feed the legend hexes: `getEffectiveSceneColors` (scene path) and `resolveColorMapHexes`
(the three `Object.values(colors)` sites in `storage.ts` ×2 and `useLocalStorage.ts`). Both go
through the chokepoint.

### `isPresetColor` — deleted, and why

`grep -rn "isPresetColor" src tests` returned **exactly one hit: its own definition.** Zero
consumers. Its `COLOR_PRESETS` basis is what the ramp model replaces, so it was removed rather than
reframed. `COLOR_PRESETS` itself stays — `ColorPicker.tsx` still renders the preset buttons.

---

## The three named hazards, addressed

**1. The legend still receives resolved hexes — asserted, not assumed.**
`src/utils/scene.test.ts` § "the legend keeps receiving RESOLVED hexes (D4-02)": two countries
painted `blues@0.5` and `blues@0.51` — **different assignments that snap to the same step** — produce
`['#6BAED6', '#6BAED6']`, each matching `/^#[0-9A-F]{6}$/`, and `reconcileLegend` produces **one**
entry. Dedupe behaviour is unchanged. RED-proved (probe C).

**2. Live Invariants 1, 2, 3 intact.**
`ColorHistory` was **not widened** — it is still `ReadonlyArray<ColorMap>` and still colours only.
A new test asserts that after painting a ramp, a `SET_SELECTION` leaves `history` **referentially
identical** (`toBe`), `historyIndex` unchanged, and the snapshot's keys exactly `['FR']`. Invariant 3
gained a sibling rather than a bypass: the chokepoint is Invariant 10, added to `general.md`'s
canonical list.

**3. `Object.create(null)` discipline swept, not just type-checked.**
`createEmptyColorMap()` still returns a prototype-less map. Every truthiness/`typeof` read of a
`ColorMap` value was found by the compiler (the value type changed) **and** by a manual sweep of
`Object.values(colors)` / `Object.entries(colors)` / `colors[…]`, which found the three legend feeds
the type checker would also have caught and nothing else. The guard is **more** load-bearing now
because the union nests an object under each key — so the `__proto__` / `constructor` / `prototype`
tests were **duplicated for the ramp variant** in `colors.test.ts` (T-04-05-02).

**`areColorMapsEqual`'s subtle requirement is gated.** `areColorValuesEqual` compares `rampId` and
`t` structurally, so `blues@0.5` and `blues@0.51` are **unequal even though the same test asserts
they resolve to the identical hex**. A ramp variant and a custom hex resolving to the same colour are
likewise different assignments. RED-proved (probe B).

---

## Interim persistence — exactly what was and was not migrated

**Migrated (this plan):**
- `normalizeColorMap` **reads** the union. A bare hex string is V2's own wire shape → the custom
  variant, **no repair**. A well-formed ramp variant is accepted, **no repair** — "a shape this
  version does not persist" is not corruption.
- Validation of a malformed ramp variant as **genuine corruption**: unknown `rampId`, `t` outside
  `[0, 1]`, non-finite or non-numeric `t`, missing discriminant, a nested object as `t`. Entry
  dropped, record reported (T-04-05-01).
- `toStoredColorMap` / `toSerializableRecord`: **saves resolve to hex at serialization**, so the
  bytes stay a valid V2 record.

**NOT migrated — `04-14` inherits it:**
- The `schemaVersion` bump to **V3** and the lossless persistence of the ramp identity.
  `grep -n schemaVersion src/utils/storage.ts` still shows the gate dispatching on `2`.
- The bounds for the V3 fields. **No bound moved here** — `MAX_STORAGE_SERIALIZED_LENGTH`
  (1,000,000), `MAX_STORAGE_JSON_DEPTH` (32), `MAX_STORAGE_JSON_NODES` (50,000),
  `MAX_STORED_COLOR_ENTRIES` (512) are byte-identical, and the raw-length check still runs **before**
  `JSON.parse` with `hasSafeJsonBudget` immediately after. `git diff aa2769f -- src/utils/storage.ts`
  on those constants shows only a *comment* line mentioning `MAX_STORED_COLOR_ENTRIES`, no value
  change.

**The note handed to `04-14`, in plain words:** saving a ramp-painted map before `04-14` lands is
**lossy in the ramp identity and never invalid**. The record on disk is a valid V2 record; reopening
it yields a custom-hex map that **renders identically** but can no longer be re-skinned by switching
ramps. `04-14`'s V3 branch is what makes it lossless, and because a union object per country is more
nodes per entry, V3 genuinely does need the node/depth budget rechecked — that is a real budget
question, not a formality (T-04-05-03).

---

## RED proofs — every new assertion, on its own subject

Each probe: scratchpad copy → break the subject in place → run → record verbatim → copy back →
confirm byte-identical. **No `git checkout --` was used.** Scratchpad:
`/private/tmp/claude-501/.../scratchpad`.

| # | Subject broken | Reddened | Verbatim |
|---|---|---|---|
| A | the `ramp === undefined` guard in `resolveColorValue` | **1 test**, only the unknown-rampId one | `AssertionError: expected [Function] to not throw an error but 'TypeError: Cannot read properties of …' was thrown` / `"TypeError: Cannot read properties of undefined (reading 'shades')"` |
| B | `areColorValuesEqual`'s ramp branch → compare resolved hex | 2 tests, both about structural identity | `expected true to be false // Object.is equality` (the `t=0.51` claim) and `expected false to be true` (the repaint claim) |
| C | `getEffectiveSceneColors` passes the union through | 5, incl. the new legend claim | `expected [ { kind: 'ramp', …(2) }, …(1) ] to deeply equal [ '#6BAED6', '#6BAED6' ]` |
| D | `resolveColorMapHexes` passes the union through | **1 test** | `expected [ { kind: 'ramp', …(2) }, …(1) ] to deeply equal [ '#6BAED6', '#DC2626' ]` |
| E | `normalizeColorMap`'s ramp branch flags a repair | **1 test** | `AssertionError: expected { ok: true, value: [ { …(3) } ], …(1) } to deeply equal { … }` (warnings `[{corrupt-data}]` vs `[]`) |
| F | `isColorValue` stops range-checking `rampId` / `t` | 4 | the three range/id corruption claims plus the malformed-write refusal |
| G | `toSerializableRecord` removed — union written to disk | 4 | incl. `saves a ramp-painted map as V2 hex` |
| H | `isColorValue` accepts any object | **all 6** corruption cases | covers non-numeric `t`, missing discriminant, nested object |

**The plan's prescribed probe** (Task 3): `canonicalizeColorMap` resolving ramp variants to hex.
Reddened the invariant **with its own message**, verbatim:

```
AssertionError: THE GENERALIZED IDENTITY (D4-02): a ramp assignment must survive apply ->
canonicalize -> history snapshot -> undo -> redo STILL AS A RAMP VARIANT with the same rampId
and t. A resolved hex here means the hex-only assumption came back, and Phase 5's CSV import
binds to the ramp variant.: expected { kind: 'custom', hex: '#2171B5' } to deeply equal
{ kind: 'ramp', rampId: 'blues', …(1) }
```

Restored by copy-back; `git status --short src/utils/colors.ts` was then **empty** — byte-identical
to the committed file.

**TDD RED, honestly reported.** The first run of the new `colors.test.ts` block failed with
`TypeError: customColor is not a function` — the **import-shaped RED the phase's anti-pattern #3
warns about**, which proves no behaviour assertion runs. It was not accepted as the RED. The types
and all call sites were then landed with `resolveColorValue`'s ramp branch **deliberately stubbed to
return `DEFAULT_COLOR`**, producing a genuine behaviour-shaped RED — `expected '#FFFFFF' to be
'#EFF3FF'`, `expected '#FFFFFF' to be '#000003'`, `expected [ '#FFFFFF', '#DC2626' ] to deeply equal
[ '#6BAED6', '#DC2626' ]` — before the one-line un-stub turned it green.

**Everything claimed here was made to go red. Nothing is reported as passing that could not fail.**

---

## Deviations from Plan

### [Rule 3 – Blocking] The reducer is not in `useMapState.ts`

**Found during:** Task 3's `read_first`.
**Issue:** the plan says "src/hooks/useMapState.ts (the whole reducer)". That file is an 18-line
context hook. `mapStateReducer`, `commitColors`, and `prepareColorInteraction` live in
`src/providers/MapStateProvider.tsx`.
**Fix:** migrated the provider; `useMapState.test.ts` (which already imports the reducer from the
provider) is where the invariant landed, as planned.
**Commit:** `6393051`, `04251f0`.

### [Rule 3 – Blocking] `hasReservedObjectKey` is not on the `ColorMap` path

**Found during:** Task 2.
**Issue:** the plan asks to preserve "the `hasReservedObjectKey` guard for every path that builds a
`ColorMap` from stored data". That helper is local to `src/hooks/useGeoData.ts` and guards manifest
records. The `ColorMap` guard is `isSafeStableCountryId` + `BLOCKED_COUNTRY_IDS` + the own-property
check.
**Fix:** preserved the guard that actually exists, on one path (`readColorValue`), and extended the
reserved-id tests to the ramp variant. Intent honoured; the named symbol was wrong.

### [Rule 3 – Blocking] Task-boundary shift: `storage.ts` code landed in Task 2

**Found during:** Task 2's `npm run build` acceptance criterion.
**Issue:** changing `ColorMap`'s value type breaks `storage.ts` compilation, so Task 2 could not
build without it. Splitting it would also have left an intermediate commit that writes union objects
into a V2 record — shipped-broken persistence between two commits.
**Fix:** Task 2's commit carries the `storage.ts` **code** and the mechanical migration of existing
assertions in `useMapState.test.ts` / `storage.test.ts`; Task 3's commit carries the **new**
invariant and validation gates, the RED proofs, and `storage.md`. Every commit builds and is green.

### [Rule 3 – Blocking] `src/config/editorConfig.test.ts` caught a doc comment

**Found during:** Task 2.
**Issue:** a `resolveColorValue` doc comment used the word `localStorage`, and the
one-production-storage-site gate matches `\blocalStorage\b` across `src/`. The gate did its job.
**Fix:** reworded to "a stored record". No gate was widened.

### [Rule 2 – Missing critical] The three `Object.values(colors)` legend feeds

**Found during:** Task 2 (compiler + manual sweep).
**Issue:** `storage.ts` ×2 and `useLocalStorage.ts` fed raw map values straight into
`reconcileLegend`. With the union those are variants, and the legend dedupes by hex.
**Fix:** `resolveColorMapHexes`, which calls the chokepoint. `useLocalStorage.ts` was not in the
plan's `files_modified`. RED-proved (probe D).

### [Rule 2 – Missing critical] V2 wire-shape serialization

**Found during:** Task 2.
**Issue:** `save()` `JSON.stringify`s the in-memory record directly, so the union would have been
written into a record claiming `schemaVersion: 2`.
**Fix:** `toStoredColorMap` / `toSerializableRecord`. RED-proved (probe G).

### [Rule 3 – Blocking] `tests/e2e/persistence.spec.ts`

One Playwright assertion read the fixture's colours as `Record<string, string>`. Updated to the
union shape. Not in `files_modified`.

**No architectural change (Rule 4) was needed beyond the gated one-way decision itself. No package
was installed — `package.json` and `package-lock.json` are untouched.**

---

## Recorded, not resolved

**`04-CONTEXT.md` OPEN QUESTION 4 — proportional vs classed.** D4-03's owner framing describes
**proportional shading against a normalized position**, which is what `shadeForValue(t)` provides.
That is **not** the quantile / equal-interval **classing** the Phase 5 roadmap entry names. This plan
resolves nothing: it surfaces at Phase 5 planning, and if the two models conflict there the
instruction is to **report the conflict, not silently resolve it**.

---

## Known Stubs

**None introduced by this plan.** One thing is deliberately incomplete and is not a stub in this
plan's scope: **no UI can produce a ramp variant yet.** The seam is the reducer action
(`SET_COLOR` / `SET_COLORS` now carry a `ColorValue`), and the palette panel that dispatches one is a
later plan's. The provider's public `setColor` / `setColors` keep their `string` signature — a
creator-typed hex is constructed into the custom variant at exactly one place,
`prepareColorInteraction`. That kept `App.tsx`, `SelectionPanel`, `CountryList`, and `MapCanvas`
outside the diff, matching the plan's `files_modified`.

The pre-existing Known Stub carried from `04-01` is unchanged: **a saved composition still reloads
with default water**, owned by `04-14`.

---

## Threat Flags

None. This plan introduces no new network endpoint, auth path, file-access pattern, or trust
boundary. It **widens** the value shape at the one trust boundary the plan's `<threat_model>` already
names (`localStorage` record → `normalizeColorMap`), and every `mitigate` disposition in that
register is implemented and gated: T-04-05-01 (probes E/F/H), T-04-05-02 (the ramp-variant reserved-id
tests), T-04-05-03 (bounds asserted unmoved), T-04-05-04 (`normalizeColor` still gates the custom
variant through the chokepoint), T-04-05-SC (zero installs). T-04-05-05 is `accept` and is recorded
above in plain words.

---

## Verification

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **712 / 712** (45 files) — up from 684 |
| `npm run build` (`tsc -b` + vite) | clean, strict, **no `any`** and no cast forcing the union through |
| `npx playwright test --project=chrome` | **107 / 107** — installed Chrome 151.0.7922.75 |
| `npm run data:world:check` | PASS — 248 units, 195 core, 207 colourable |

**Browser scope is Chrome only.** Edge is **not installed on this machine**; no Edge, Firefox, or
Safari result was produced and none may be cited. No Phase 3 UAT cell is cited as verified.

**Acceptance greps:**
- `grep -rn resolveColorValue src --include='*.ts' --include='*.tsx' | grep -v 'colors\.ts|\.test\.'`
  → 4 hits (`storage.ts:47` import, `storage.ts:367` **call**, and two doc-comment references in
  `types/map.ts` / `scene.ts`). Every code hit is a call; there is no reimplementation.
- `grep -rnE "typeof [A-Za-z]+ !== 'string'" src/utils/colors.ts src/utils/scene.ts` → **nothing**.
- `grep -n schemaVersion src/utils/storage.ts` → still dispatching on `2`.

*The greps were run with quoted `--include` globs after an unquoted first attempt returned zero under
zsh — the phase's own "check your grep patterns against the real file text" anti-pattern, caught.*

---

## Self-Check: PASSED

All modified files exist on disk; both commits (`6393051`, `04251f0`) are present in
`git log`; `STATE.md` and `ROADMAP.md` are untouched and no forbidden gsd-sdk verb was run.
