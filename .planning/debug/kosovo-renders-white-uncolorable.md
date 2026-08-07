---
status: superseded
superseded_by: "D4-10 (Phase 4), landed by plan 04-03"
trigger: "Kosovo (or one of the Balkan countries) renders permanently white on the map and apparently cannot be colored."
created: 2026-08-06T00:00:00Z
updated: 2026-08-06T00:00:00Z
---

> # ⚠ SUPERSEDED by D4-10 (Phase 4) — do not follow the recommendation below
>
> **This note's central conclusion is no longer owner policy.** It states that Kosovo
> *"cannot be colored **by deliberate, manifest-recorded policy** … which is correct and must
> not be changed"*, and that *"fixing the data (making Kosovo a core state) would violate the
> reviewed 195-core invariant and the approval chain"*. The owner reversed that policy in
> `04-CONTEXT.md` D4-10 — *"I want kosovo and the othe regions colorable, there should not be a
> region that is not colorable"* — and plan `04-03` landed it. **All twelve former neutral
> units (`ATA COK CYN FLK GIB IOT KAS KOS NIU SAH SOL TWN`) are now selectable, listed,
> locatable, and paintable.**
>
> **How it was done matters, and this note guessed wrong about that too.** Kosovo was **not**
> promoted into `coreStates`. It carries an explicit third `colorPolicy` value,
> `self-colorable`, so `policy.coreStateCount` stays **195** and `policy.coreDefinition` is
> byte-unchanged; the new `policy.selectableCount` of **207** is a separate quantity. **No
> geometry was promoted, no snapshot was added, and no historical packet was touched, so no
> rights, factual, or topology approval was implicated** — the approval chain in
> `coding-rules/data.md` is intact and unchanged. See `coding-rules/data.md` § Three colour
> policies, two counts.
>
> **Two independent staleness defects in the body below, recorded so nobody re-derives from
> them:**
>
> 1. It cites `src/styles/phase2CssContract.test.ts:920-934` as in-repo evidence. **That file
>    was retired by plan `03-04`.** The surviving CSS contract test is
>    `src/styles/uiContract.test.ts`.
> 2. It states that `src/utils/scene.ts` returns `DEFAULT_COLOR` (`#FFFFFF`) for a null
>    `colorOwnerId`. **The current code returns `NEUTRAL_UNIT_COLOR` (`#E5E7EB`)** — Phase 3
>    (D-23) added that distinction after this note was written. As of D4-10 no Modern unit has
>    a null owner at all, so the branch no longer fires on the Modern scene; it is kept for
>    historical scenes and malformed records.
>
> **What is still accurate and worth keeping: the symptom description.** The compound failure
> it traced — a unit that looked colourable, offered a hover tooltip advertising a current
> colour, and then swallowed the click with *"literally nothing, not even a selection clear"*
> (`MapCanvas.tsx` early-returns without `stopPropagation`, then `handleBackgroundClick`
> early-returns because the target **is** a `.scene-path`) — is a correct account of the
> interaction D4-10 makes moot. It is now covered by the e2e gate
> *"every unit is colourable (D4-10)"* in `tests/e2e/navigation.spec.ts`, which clicks Kosovo
> and asserts it takes `#DC2626`.
>
> Everything below this line is the original 2026-08-06 diagnosis, preserved unedited.

---

## Current Focus

hypothesis: CONFIRMED (compound). Kosovo cannot be colored **by deliberate, manifest-recorded
  policy** (`sourceType: "Disputed"`, `parentCoreId: null`, `colorPolicy: "neutral"`), which is
  correct and must not be changed. The **defect** is that this intended-neutral state is rendered
  and behaves identically to an ordinary uncolored-but-colorable country: same `#FFFFFF` fill, no
  distinguishing CSS class rules, a hover tooltip that still fires, and a click that is silently
  swallowed with zero feedback.
test: traced asset -> manifest -> useGeoData classification -> scene fill resolution -> MapCanvas
  class/fill/pointer wiring -> CSS
expecting: neutral units resolve to DEFAULT_COLOR and are excluded from every selectable set
next_action: report diagnosis (goal=find_root_cause_only; no source edits)
bug_class: Bohrbug (fully deterministic, reproduces on every load)
mode: goal=find_root_cause_only (INVESTIGATION ONLY, no source edits)

reasoning_checkpoint:
  hypothesis: "Kosovo renders permanently white and is inert because its scene feature carries
    colorOwnerId: null / isSelectable: false, which routes it to DEFAULT_COLOR (#FFFFFF) and
    excludes it from every selectable set, while nothing visually or interactively marks it as
    intentionally non-colorable."
  confirming_evidence:
    - "public/data/world-modern.geojson KOS: {colorOwnerId: null, isSelectable: false}"
    - "public/data/world-manifest.json KOS: sourceType Disputed, parentCoreId null, colorPolicy neutral"
    - "src/utils/scene.ts:128-133 returns DEFAULT_COLOR when colorOwnerId === null"
    - "src/constants/colors.ts:3 DEFAULT_COLOR = '#FFFFFF' - identical to an uncolored core state"
    - "src/components/MapCanvas.tsx:542 assigns class 'map-unit-path', which has ZERO CSS rules"
    - "src/styles/phase2CssContract.test.ts:923-926 states in-repo that .map-unit-path has no rules"
  falsification_test: "If Kosovo's fill differed from an uncolored core state, or if a click on it
    produced any state change/toast, the hypothesis would be wrong. Neither holds: both resolve
    through the same DEFAULT_COLOR constant, and MapCanvas.tsx:567-570 early-returns without
    stopPropagation while handleBackgroundClick (792-801) early-returns because the target IS a
    .scene-path - so the click reaches no handler at all."
  fix_rationale: "The root cause is a missing affordance for an intentional state, not a data
    error. Fixing the data (making Kosovo a core state) would violate the reviewed 195-core
    invariant and the approval chain in coding-rules/data.md. The minimal correct fix adds a
    visual + interaction distinction for the null-owner bucket."
  blind_spots: "Have not run the app or E2E to observe the rendered pixels; conclusion rests on
    static trace of a fully deterministic path. Have not confirmed which of the 12 affected units
    the user actually clicked (Kosovo is the reported one)."
  candidate_causes:
    - "data: manifest classifies KOS as Disputed/neutral with parentCoreId null (INTENDED, reviewed)"
    - "code: scene.ts/MapCanvas.tsx collapse 'neutral' and 'uncolored' onto the same DEFAULT_COLOR"
    - "code/config (CSS): .map-unit-path class exists but carries no rules in any stylesheet"
  and_gate: "YES - both conditions are required. The data policy alone is legitimate; the styling
    gap alone is harmless. Only together do they produce a country that looks colorable, offers a
    tooltip, and then silently refuses - which is what the user reported as a bug."

## Symptoms

expected: Every country on the world map can be clicked/selected and assigned a fill color.
actual: Kosovo renders permanently white and cannot be colored; clicking it does nothing at all.
errors: [none - no console errors, no toast, no thrown exception]
reproduction: Load app, hover Kosovo (tooltip appears), click Kosovo (no-op).
started: [by construction - present since the Phase 2 world asset was generated]

## Eliminated

- hypothesis: Kosovo is missing from the world asset, or lacks an `id` / `properties.name`, and is
    dropped by loader validation.
  evidence: Feature exists with id "KOS", properties.name "Kosovo", valid Polygon geometry.
    248/248 features have both a non-empty id and a name; missingId=0, missingName=0.
  timestamp: 2026-08-06

- hypothesis: Kosovo shares a sentinel id ("-99" / "XK" / "") with another feature, causing a
    color-map key collision with a Balkan neighbour.
  evidence: Zero duplicate ids across all 248 features; zero features with id "-99", "XK", "",
    or any negative/sentinel id. All eight Balkan states carry distinct valid ISO-3 ids
    (ALB, BIH, HRV, KOS, MKD, MNE, SRB, SVN).
  timestamp: 2026-08-06

- hypothesis: A loader validation path filters Kosovo out of the feature list entirely.
  evidence: KOS passes normalization and IS rendered - it reaches the DOM as a `scene-path
    map-unit-path` element (MapCanvas.tsx:537-543). It is excluded only from the *selectable*
    set, not from the *rendered* set.
  timestamp: 2026-08-06

## Evidence

- timestamp: 2026-08-06
  checked: public/data/world-modern.geojson - all 248 features, ids/names/duplicates
  found: 248 features, 0 missing ids, 0 missing names, 0 duplicate ids, 0 sentinel ids.
    Kosovo present as id "KOS". Balkans all clean and distinct.
  implication: Not a data-integrity bug. The "-99" Natural Earth failure mode does not apply here;
    the generator resolved it via the manifest's sourceIdExceptions.

- timestamp: 2026-08-06
  checked: Kosovo's raw feature properties vs Serbia's
  found: KOS -> {name: "Kosovo", sourceFeatureId: "KOS", colorOwnerId: null, isSelectable: false}
    SRB -> {name: "Serbia", sourceFeatureId: "SRB", colorOwnerId: "SRB", isSelectable: true}
  implication: Kosovo is in the third SceneFeature variant (null color owner), not the core variant.

- timestamp: 2026-08-06
  checked: public/data/world-manifest.json nonCoreUnits + supplements
  found: KOS recorded as {sourceType: "Disputed", parentCoreId: null, isSelectable: false,
    colorPolicy: "neutral"}. 12 units total resolve to a null color owner: ATA, COK, CYN, FLK,
    GIB (in supplements), IOT, KAS, KOS, NIU, SAH, SOL, TWN.
  implication: The classification is a deliberate, reviewed, recorded policy decision - not an
    accident. Kosovo is not a UN member state, and public/data/README.md:79 defines the core as
    exactly 195 = 193 UN members + Holy See + Palestine.

- timestamp: 2026-08-06
  checked: src/hooks/useGeoData.ts:197-244 (readNonCoreUnit)
  found: interactionMode is DERIVED from the manifest, not stored in the geojson:
    colorOwnerId !== null ? 'inherited-dependency' : sourceType === 'Disputed' ? 'disputed' : 'neutral'.
    Kosovo -> 'disputed'. EXPECTED_CORE_COUNT = 195 is a hard-validated invariant (line 17).
  implication: Reclassifying Kosovo as colorable would break the 195-core count assertion and
    require the full data approval chain. Out of scope for a rendering fix.

- timestamp: 2026-08-06
  checked: src/utils/scene.ts:124-136 and src/components/MapCanvas.tsx:274-281
  found: BOTH fill resolvers return DEFAULT_COLOR unconditionally when colorOwnerId === null.
    src/constants/colors.ts:3 -> DEFAULT_COLOR = '#FFFFFF'. src/utils/colors.ts:67-75 returns the
    SAME '#FFFFFF' for a core state that simply has no color assigned yet.
  implication: ROOT CAUSE (rendering half). "Intentionally neutral" and "colorable but not yet
    colored" are collapsed onto one indistinguishable pixel value.

- timestamp: 2026-08-06
  checked: src/utils/scene.ts:19-27, 68-80 (hasSelectableIdentity / getSelectableEntityIds)
  found: Selectability requires isSelectable && colorOwnerId === entityId. Kosovo fails both
    clauses, so it never enters selectableEntityIds.
  implication: Kosovo can never be selected, therefore never colored, by any code path.

- timestamp: 2026-08-06
  checked: src/App.tsx:255-268 (effectiveCountryLookup)
  found: The lookup is gated on `feature.isSelectable`, so Kosovo is absent from
    effectiveCountryLookup and effectiveSelectableIds.
  implication: Kosovo is also invisible to CountryList and Locate - the user cannot even find it
    by search to discover why it is unavailable. Note this CONTRADICTS the established precedent
    in coding-rules/data.md:208-209 ("Out-of-scene rows are disabled, never removed").

- timestamp: 2026-08-06
  checked: src/components/MapCanvas.tsx:537-543, 567-582, 792-801
  found: Kosovo is rendered with class `scene-path map-unit-path`. The click handler
    (line 567-570) early-returns for !isSelectable WITHOUT stopPropagation; the event then bubbles
    to handleBackgroundClick (792-801), which early-returns because target.closest('path.scene-path')
    MATCHES. Net: the click is absorbed and produces literally nothing - not even a selection clear.
  implication: ROOT CAUSE (interaction half). A dead click zone with zero feedback.

- timestamp: 2026-08-06
  checked: src/components/MapCanvas.tsx:583-596 (pointerenter.map)
  found: The hover handler is attached to ALL scene paths and is NOT gated on isSelectable. It
    fires onTooltipChange for Kosovo, showing "Kosovo, #FFFFFF".
  implication: A false affordance - the app actively advertises Kosovo as a named country with a
    current color, then refuses the click. This is what makes it read as a bug rather than policy.

- timestamp: 2026-08-06
  checked: src/styles/MapCanvas.css and every stylesheet, for `.map-unit-path`
  found: ZERO rules anywhere. `.country-path` carries cursor:pointer, hover and selected stroke
    weights; `.map-unit-path` (Kosovo) matches none of them - CSS class tokens are exact-match, so
    `.country-path` does not select `class="scene-path map-unit-path"`.
  implication: No visual differentiation exists for the neutral bucket.

- timestamp: 2026-08-06
  checked: src/styles/phase2CssContract.test.ts:920-934
  found: In-repo comment states verbatim: "Today only `.country-path` carries any rules at all -
    `.scene-path` and `.map-unit-path` have none ... a future `.map-unit-path { filter:
    brightness(0.98) }` to dim non-selectable units would rasterize differently under html2canvas".
  implication: The project already ANTICIPATED dimming non-selectable units and never implemented
    it. Confirms the gap is a known, unshipped affordance - and warns that `filter` is the wrong
    mechanism because it breaks the PNG export clone.

## Resolution

root_cause: >
  Compound (AND-gate confirmed).
  (1) DATA/POLICY - intended, must not change: Kosovo is classified in world-manifest.json as
  sourceType "Disputed" with parentCoreId null and colorPolicy "neutral", producing a SceneFeature
  with colorOwnerId: null and isSelectable: false. This is correct per the reviewed 195-core-state
  policy (193 UN members + Holy See + Palestine); Kosovo is not a UN member.
  (2) PRESENTATION - the actual defect: the null-color-owner bucket has no distinguishing
  treatment. src/utils/scene.ts:128-133 and src/components/MapCanvas.tsx:274-281 both return
  DEFAULT_COLOR ('#FFFFFF', src/constants/colors.ts:3) - the exact value an uncolored *colorable*
  country renders - and the CSS class assigned to these paths ('map-unit-path',
  MapCanvas.tsx:542) has zero rules in any stylesheet.
  (3) INTERACTION - compounding: hover still fires a tooltip (MapCanvas.tsx:583) advertising the
  unit as colorable, while the click is silently swallowed (567-570 early-returns without
  stopPropagation; 792-801 then early-returns because the target IS a .scene-path), and the unit
  is omitted entirely from CountryList/Locate (App.tsx:260) - contradicting the
  "disabled, never removed" precedent in coding-rules/data.md:208-209.
fix: [not applied - investigation only]
verification: [n/a - diagnose-only mode]
files_changed: []
