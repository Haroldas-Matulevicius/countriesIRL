# Phase 4: Visual & Cartographic System - Context

**Gathered:** 2026-08-06
**Status:** Ready for planning

> **Decision IDs are prefixed `D4-` deliberately.** The project's global decision
> register (`D-30`, `D-34`, `D-63`, …) lives in `STATE.md` / `coding-rules/`. Bare
> `D-01` numbering would collide with it. Nothing here renumbers a global decision.

<domain>
## Phase Boundary

Phase 4 gives the studio a real cartographic language: **fixed-step sequential
palette ramps** replacing the flat 10-swatch `COLOR_PRESETS`, **water/background
presets**, an **interior-borders-only stroke system**, **title/footer gradient
bands**, **export-safe text tools**, and a **legend overhaul**. Everything lands in
the SVG composition layer and must survive Phase 3's owned SVG→PNG rasterisation
path (`src/utils/export.ts`, D-34) byte-for-byte.

**In scope by amendment (decided in this discussion, not in the original roadmap
breakdown):**

- The **G-3 colors-panel rework** is absorbed into `04-02` (D4-04).
- A **new "Map style" rail tool** is created to house `04-03`'s and `04-05`'s
  controls (D4-07).
- The twelve **`colorPolicy: "neutral"` units become colorable** (D4-10) — a
  data-layer policy reversal that contradicts a line in the Phase 5 roadmap entry
  and requires an explicit `ROADMAP.md` amendment.

**Out of scope (unchanged):** value→class binding and any data import (Phase 5);
pattern fills; inset boxes; label auto-placement beyond the fixed band positions.

</domain>

<decisions>
## Implementation Decisions

### Ramp model and how a creator colors with it

- **D4-01: A ramp is a fixed set of N ordered shades, not a continuous gradient.**
  `shadeForValue(t)` snaps `t` to the nearest step; `shadeForIndex(i, n)` picks
  step `i` of `n`. Step count is fixed per ramp in Phase 4 — creator-adjustable
  class count is deferred to Phase 5, where the roadmap already places it.
  Chosen so the palette strip shows exactly the shades that can appear, the legend
  has finite rows to name, and `04-02`'s WCAG contrast gate can check a bounded set.
  — **Reversibility:** costly — the legend form, the contrast gate, and Phase 5's
  classing engine all bind to a bounded step set; moving to continuous
  interpolation would invalidate all three.

- **D4-02: A ramp-painted country stores `{rampId, t}`, not resolved hex.**
  Hex is resolved at render time. One-off custom colors continue to store raw hex
  alongside, so `ColorMap` carries two value shapes. Chosen because it is already
  the exact representation Phase 5's CSV engine will produce — the data path
  computes `t` from a value instead of from a click — and because switching ramps
  can then re-skin every painted country instantly.
  — **Reversibility:** one-way — it changes the persisted `ColorMap` value shape,
  so undoing it needs a storage migration, and Phase 5's classing engine is
  specified against it.

- **D4-03: Phase 4's interaction is pick-a-shade-then-paint.** No rank buckets, no
  class-count UI, no ordering concept surfaced to the creator in this phase. Phase 5
  replaces the manual shade pick with a computed `t`; the render, storage, legend,
  and export paths do not change when it does.

  Owner's framing, recorded verbatim because it is the constraint `04-01` must
  satisfy: *"the shades will later also be based on country statistics, like if
  Poland is 100% for something and Lithuania gets entered as 50% for something, it
  needs to understand that Lithuanias shade is half of what polands should be, so
  later it has to be connected to data."*

  Note for the planner: this describes **proportional shading against a normalized
  position**, which is what `shadeForValue(t)` provides. It is *not* the same thing
  as the quantile / equal-interval classing the Phase 5 roadmap entry names. If
  those two models conflict at Phase 5 planning time, report the conflict — do not
  silently resolve it.

### Colors panel — the G-3 rework

- **D4-04: `04-02` owns the panel redesign and the ramp build, redesign first.**
  The information architecture is fixed *before* ramp controls go in, so ramp UI is
  not built onto a layout the owner has already rejected. `04-02` becomes the
  phase's heaviest plan and likely warrants a UI-SPEC pass ahead of it.
  Owner's original complaint, unchanged: *"too squished, not organized well, hate
  the multi boxes within."* The nested bordered boxes are arguably already
  off-contract against 03-04's flat hairline elevation.

- **D4-05: Every flyout widens 280px → 360px — uniformly, not per-panel.** The
  one-at-a-time flyout contract survives; only the number changes, so the panel edge
  never jumps when switching tools. `04-08`'s legend work benefits from the same
  width. **This amends the approved `03-UI-SPEC.md`**, which outranks `Design.md`;
  the spec must be annotated in the same commit that lands the width, and the
  divergence reported rather than silently absorbed.
  — **Reversibility:** reversible — panel chrome sits outside export membership and
  cannot move exported pixels.

- **D4-06: The colors panel narrows to ramps, painting, and per-country custom hex.**
  Everything about how the *map* looks moves to the new Map style tool (D4-07). This
  is a second, independent relief on the G-3 squeeze.

### Map appearance — a new rail tool

- **D4-07: A new "Map style" rail tool holds every non-country appearance control:**
  water/background preset, uncolored-country fill, border color, interior-border
  weight, coastline weight. This is where `04-03` and `04-05` surface. Owner asked
  for these controls explicitly and asked that they live in *"a different tab."*

  **Planning constraint, not a decision:** the 56px rail is already at ~492px of
  required height with no scroll container, and **D-5 is not closed at ≥1200px**.
  Adding a tool icon makes that worse. Plan against it up front; do not discover it
  during execution.

- **D4-08: Stroke weights are named steps** — none / hairline / thin / medium / bold
  — with **interior borders and coastlines controlled independently**. Discrete
  steps keep values export-safe under `non-scaling-stroke` pinning and make each
  step individually gateable; a continuous slider can only be asserted to round-trip.
  Mirrors how `legend.textSize` already works.

- **D4-09: An uncolored country renders flat grey by default, and the fill is
  creator-changeable.** `#FFFFFF` remains the *stored* sentinel for "not colored" —
  only the render maps it to grey, exactly as `getEffectiveFeatureColor` already
  maps null-owner units to `NEUTRAL_UNIT_COLOR`. Storage, legend exclusion, and
  undo-history semantics are untouched. This is what makes near-invisible coastlines
  survivable: with white water and unstroked coasts, a white country would vanish.

### Neutral units — a data-layer policy reversal

- **D4-10: All twelve `colorPolicy: "neutral"` units become colorable.** Owner
  decision, stated directly: *"I want kosovo and the othe regions colorable, there
  should not be a region that is not colorable."*

  The twelve, from `public/data/world-modern.geojson` (`colorOwnerId: null`,
  `isSelectable: false`): `ATA` Antarctica · `COK` Cook Islands · `CYN` Northern
  Cyprus · `FLK` Falkland Islands/Malvinas · `GIB` Gibraltar · `IOT` British Indian
  Ocean Territory · `KAS` Siachen Glacier · `KOS` Kosovo · `NIU` Niue · `SAH`
  Western Sahara · `SOL` Somaliland · `TWN` Taiwan.

  The 41 `inherit-parent` units (Greenland → Denmark, etc.) are **not** affected —
  they are colored *by* a parent, not blocked.

  **What this touches — all of it real work, none of it a one-line flip:**
  1. `public/data/world-manifest.json` — `colorPolicy` on twelve entries. The
     manifest is **hash-verified**; the hash must be re-derived and
     `npm run data:world:check` updated in the same change.
  2. `public/data/world-modern.geojson` — `colorOwnerId` / `isSelectable`.
  3. The check currently reports **195 selectable core states**; it becomes **207**.
     Any assertion pinning 195 must move deliberately, with the new number stated.
  4. `getEffectiveFeatureColor` / `getSelectableEntityIds` in `src/utils/scene.ts`,
     and CountryList / Locate inclusion in `App.tsx`.
  5. **It contradicts the Phase 5 roadmap entry**, `05-02`, which reads: *"neutral
     units (Kosovo et al.) are reported as 'not colorable', not matched."*
     `ROADMAP.md` needs an explicit amendment — do not let the two stand in silent
     disagreement.
  6. `coding-rules/data.md` documents the neutral policy and must be updated in the
     same commit that lands the behavior.

  **Approval status, stated plainly so nobody later misreads it:** no geometry is
  promoted, no snapshot is added, and no historical packet is touched, so **no
  rights, factual, or topology approval is implicated**. This is the owner changing
  a product policy on already-shipped, hash-verified Modern geometry. It is not an
  approval bypass and must not be recorded as one — but it *is* a manifest change,
  so the hash chain is re-derived, not waived.

  **Bonus consequence:** with no "not colorable" bucket left, `NEUTRAL_UNIT_COLOR`
  (`#E5E7EB`) is freed to mean simply "uncolored" (D4-09). The grey-vs-grey
  ambiguity raised during discussion dissolves rather than needing a second grey.

  — **Reversibility:** costly — reverting means re-editing and re-hashing the
  manifest, moving the selectable count back, and re-amending the roadmap. No
  published contract breaks, and no creator data is lost.

### Legend

- **D4-11: Box chrome is deleted outright.** `theme`, `backgroundOpacity`, and
  `borderStyle` come out of `LegendState`. The legend is always bare marks and type
  on the map surface. Makes the restrained look structural rather than a default a
  creator can undo, and removes the "big ass box" as a reachable state.
  — **Reversibility:** one-way — it drops three fields from the persisted
  composition, so undo requires a storage migration.

- **D4-12: Two legend forms, both held to the same restraint, default inferred from
  the coloring technique in use.** A ramp-painted map defaults to the **stacked bar
  with break ticks**; a categorical map (custom hex, no ordering — alliances,
  "countries I've visited") defaults to **restyled rows**. The creator can override
  the default. Owner: *"Both should be available but the row based legend needs to
  be made just as subtle, user should be able to pick - well it should be default
  based on what color technique used tbh too."*

- **D4-13: The legend's default position is taken from the owner's reference image,
  not re-guessed.** Left edge, hugging, sitting below the title block rather than
  floating high in the map body. This is the concrete resolution of carry-forward
  **G-1** ("the legend sits too high"). Legend geometry is inside the exported PNG,
  so this moves exported pixels — see D4-14 for how that is gated.

### Export gating across a phase that repeatedly moves pixels

- **D4-14: Property assertions, not whole-image baselines — including at `04-10`.**
  Five of eleven plans move exported pixels (`04-03`, `04-05`, `04-06`, `04-07`,
  `04-08`). Each plan asserts only the property it owns: background pixel equals the
  chosen water preset; a coastline sample has no dark stroke while an inland sample
  does; band pixels are lighter at the frame edge; text lands in the PNG bytes. Each
  is independent, so a later plan cannot redden an earlier plan's gate, and each
  stays RED-provable **on its own subject** — which a re-baseline diff can never be,
  since "the baseline changed because my plan changed it" is unfalsifiable. Reuse
  `02-27`'s discrimination controls so a blank export cannot satisfy any of them.

### Text tools and the font

- **D4-15: Widen the vendored Inter subset to latin-ext.** `04-07` makes text the
  most visible element on the map; silent mid-string fallback for `č`, `ę`, `ü`,
  `å`, `ł`, `ș` inside an exported PNG is not acceptable when the product's users are
  making maps *of* those countries. Requires a re-recorded SHA-256 in
  `src/assets/README.md` and a license check on the wider subset.

  Correcting a Phase 3-era framing: the base64 font is inlined into the
  **intermediate SVG**, not the PNG raster. The `~+113 KB` cost is export time and
  memory — **exported PNG file size is unaffected.**

### Gradient bands

- **D4-16: A band fades from the current surface color to transparent — not from
  hardcoded white. Top band on by default, bottom off.** On white water it is
  invisible and harmless; on a tinted surface it still separates title from map.
  The band color is therefore derived state that must **serialize into the export
  subtree** — it cannot read a CSS token at export time, because a serialised SVG
  rasterised as an image sees no host stylesheet.

### Persistence

- **D4-17: A V2 map loads with Phase 4 defaults applied** — grey uncolored
  countries, no legend box, top band on, current border weights. One rendering path,
  no legacy mode. A saved map will genuinely look different when reopened, and its
  exported PNG will differ from one the creator already posted. Accepted knowingly:
  the alternative is keeping the legend chrome D4-11 deletes, plus a parallel legacy
  renderer with its own gates — the two-models-coexisting complexity that produced
  the G-3 complaint in the first place.
  — **Reversibility:** one-way — V3 drops fields V2 carried; there is nothing to
  restore them from.

- **D4-18: `04-09` folds in carry-forward `G-2`.** The V3 migration suite already
  constructs stored records directly, which is the cheapest possible way to cover
  it: build a V2 record with a 15–32 character legend label, prove it loads cleanly,
  prove it then refuses to export. `G-2` has never been exercised by human or
  machine.

### Claude's Discretion

- **Ramp step count and exact hex sets.** Roadmap already flags these as plan-time
  decisions. Constraint: every step must pass `04-02`'s WCAG label-contrast gate.
- **Whether the latin-ext font is always inlined or inlined only when the
  composition needs it.** Recommendation: **always inline.** `src/utils/export.ts`
  is the most safety-critical file in the repo, and a content-dependent branch there
  makes export non-deterministic for a saving that does not affect output size. Flag
  for research rather than deciding in a plan.
- **Band gradient stops, and band-vs-legend z-order on overlap.**
- **Text font stack for title/subtitle/attribution** — the roadmap already lists
  this as a plan-time decision; it now interacts with D4-15.

### Open Questions — record, do not silently resolve

1. **Which water/background presets ship.** Only the default is settled: **white**,
   taken from the owner's reference. The roadmap's straw man (paper white, cool
   tint, soft grey, light blue) was never confirmed.
2. **Rail height vs. the new Map style icon (D4-07)** against unclosed **D-5**.
3. **Whether D4-13's reference-derived default fully resolves G-1.** The owner said
   *"I dont know the entire legend is off and just not write"* — the position may
   not be the only defect. Note the approved `03-UI-SPEC.md` is **already known to
   carry a wrong placement formula** that 03-08 RED-proved and worked around with a
   corner anchor; verify against the running editor before assuming a cause.
4. **The proportional-vs-classed tension** flagged under D4-03, which surfaces at
   Phase 5 planning, not here.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Binding contracts — precedence order matters

- `.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UI-SPEC.md` — the
  **approved** UI contract. **Outranks `Design.md`.** D4-05 amends its flyout width;
  it is also already known to carry a wrong placement formula (see Open Question 3).
  Large (90–140 KB) — **grep it, never read it whole.**
- `Design.md` (repo root) — the normative design contract: token tables, the
  mode-invariant export firewall, the ten type roles, the accent budget, the
  post-D-34 export-unsafe reason. § 7 is still `[FOR REVIEW]` and has never been
  reviewed. Outranks a component file; outranked by `03-UI-SPEC.md`.
- `.planning/coding-rules/general.md` — **read first.** Owns §Live Invariants and
  §Immutable Safety Constraints. No other file restates them.

### Per-subsystem rules — update in the same commit that lands the behavior

- `.planning/coding-rules/export.md` — the owned SVG→PNG path, clone contract,
  sanitization, refusal reasons. Governs D4-14, D4-15, D4-16.
- `.planning/coding-rules/frontend.md` — React/D3/CSS, composition root, and the
  corner-anchor rationale 03-08 recorded. Governs D4-04 – D4-09.
- `.planning/coding-rules/data.md` — world asset, catalog, validation, and the
  **neutral-unit policy D4-10 reverses**. Must be updated with D4-10.
- `.planning/coding-rules/storage.md` — bounded V2 records, migration,
  confirmations. Governs D4-17, D4-18.

### Phase 3 carry-forwards this phase absorbs

- `.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UAT.md` § Gaps — the source
  of record for **G-1** (→ D4-13), **G-2** (→ D4-18), **G-3** (→ D4-04), and
  **F-1** (deferred, not folded).
- `.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-VERIFICATION.md` — the three
  unrebutted grounds against the F-1 label ceiling.

### Roadmap and state

- `.planning/ROADMAP.md` § Phase 4 — the eleven-plan breakdown, gates, and risks.
  § Phase 5 `05-02` **contradicts D4-10** and requires amendment.
- `.planning/STATE.md` — open owner gates, carry-forwards, the nine unperformed
  Phase 3 UAT cells.

### Data assets touched by D4-10

- `public/data/world-manifest.json` — provenance and integrity record; hash-verified.
- `public/data/world-modern.geojson` — `colorOwnerId` / `isSelectable` per unit.
- `scripts/prepareWorldData.mjs` — the mapshaper pipeline `04-04` extends for the
  interior-border mesh.

### Owner-supplied visual reference

- **Eurostat "Unemployment rates, June 2026" choropleth**, supplied as an image
  during this discussion. Not a file in the repo — characterized in `<specifics>`
  below so downstream agents can work from the description.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- **`NEUTRAL_UNIT_COLOR` (`#E5E7EB`, `src/constants/colors.ts:16`)** already exists
  and is already applied — `getEffectiveFeatureColor` returns it for
  `colorOwnerId === null`. D4-09 reuses this exact render-time-mapping pattern for
  uncolored countries; D4-10 frees the constant's original meaning.
- **`legend.textSize` (`small | medium | large`)** is the in-repo precedent D4-08's
  named stroke-weight steps should mirror.
- **`resolveLegendPosition` / `resolveLegendRender` (`src/utils/legend.ts`)** are the
  *only* readers of `legend.position` — nothing reads it raw. D4-13 changes the
  default here, not at call sites.
- **`02-27`'s discrimination controls** (`tests/e2e/final-integration.spec.ts`) —
  reuse for D4-14 so no property assertion can be satisfied by a blank export.
- **`mapshaper 0.7.48`** is already a dependency; `04-04`'s mesh derivation has its
  tool without adding one.
- **The card-row / option-pill vocabulary** used by the legend and countries panels
  is the working reference for D4-04 — the owner did not complain about those.

### Established patterns that constrain this phase

- **The export sandbox sees no host stylesheet.** A serialised SVG rasterised as an
  image loses anything not inlined into the export subtree. No CSS `filter`, no
  `backdrop-filter`, no external `@import`. This is why D4-16's band color must be
  serialized state and why `NEUTRAL_UNIT_COLOR` is a solid fill rather than a filter.
- **A gate must be able to fail on its own subject.** Phase 2 shipped three gates
  that could not fail; Phase 3 caught seven more. D4-14 exists because of this rule.
- **The selector ceiling is a gate** (326 at close of 03-10). New stylesheets join
  both the directory walk and `main.tsx`'s asserted import order, `editor.css` last.
- **`MapEditor`'s mountable boundary** — storage as a factory, no host global — must
  survive every Phase 4 change.
- **Export is exactly 1080×1080.** Non-negotiable.
- **Border weight, not color, carries interaction state.** `src/constants/colors.ts`
  documents that borders are black at every state, so hover and selection
  differentiate by stroke width. D4-08's coastline weights interact with this
  directly — if a coastal country's outline goes to `none`, hover and selection
  feedback for that country needs another carrier. **Unresolved; name it in `04-05`.**

### Integration points

- `src/constants/colors.ts` — `COLOR_PRESETS` is what D4-01/D4-02 replace.
- `src/types/composition.ts` — `LegendState` loses three fields (D4-11);
  `VisibleCompositionSettings` gains surface/border/band/text state; `ColorMap`
  gains a second value shape (D4-02).
- `src/utils/storage.ts` — `SavedCompositionV2` → V3 (D4-17, D4-18). Bounds are
  checked **before** `JSON.parse`; extend and re-test them.
- `src/styles/theme.css:254` — `--map-surface: #ffffff` is currently a
  **mode-invariant token**. D4-07 makes it creator-facing, which means it must
  become persisted composition state, not a token read at export time.
- `src/components/MapCanvas.tsx` — `non-scaling-stroke` is pinned at
  `:552`; stroke attrs at `:760`/`:765`. `04-05`'s mesh layer renders inside the
  camera transform, non-interactive.
- `src/utils/scene.ts` — `getEffectiveFeatureColor` and `getSelectableEntityIds`
  both change under D4-10.

</code_context>

<specifics>
## Specific Ideas

**The owner supplied one visual reference and it is the strongest signal in this
document.** It is an image, not a repo file, so it is characterized here in enough
detail to plan against.

**Eurostat, "Unemployment rates, June 2026 (seasonally adjusted data, %)".** Owner's
words: *"the legend on the left edge, it needs to be that subtle. That level of
clean. It can't be like a big ass box. Needs to be well strutured out."*

What the reference actually does:

| Element | Treatment |
|---|---|
| **Legend container** | **None.** No background panel, no border, no fill opacity — it sits directly on the map surface. This is the direct source of D4-11. |
| **Legend form** | A **stacked color bar**: contiguous swatches, no gaps between them, short tick leaders to the right. Numbers are **break boundaries** (10.5 / 9.0 / 8.0 / 6.0 / 5.0 / 4.0 / 3.0) — the range is read *between* ticks, not printed as literal "6.0–10.0" row text. Source of D4-12. |
| **Legend caption** | One bold line above the bar (`EU = 6.0%, euro area = 6.3%`). |
| **Legend position** | Left edge, hugging, below the title block. Total footprint roughly 8% of frame height. Source of D4-13. |
| **Water** | **White**, not blue. Source of the D4-09 problem and its grey answer. |
| **Out-of-scope land** | Flat mid-grey — visible against white water with no stroke needed. |
| **Borders** | Thin and dark, clearly present between countries; coastlines effectively do no work because grey land already separates from white water. |
| **Type** | Small, near-black, tight. Title top-left, parenthetical subtitle beneath it. |
| **Bands** | **None visible** — the title sits on plain white. Informs D4-16's "invisible on white, and that's fine". |
| **Footer** | Attribution bottom-left and bottom-right, small grey type. |

Two elements in the reference are **deliberately not being copied** — see
`<deferred>`: the per-country value labels and the Malta inset box.

One structural difference the planner must not gloss: in the reference the map is
**inset with white margins and the title sits above it**. CountriesIRL is
**full-bleed** since Phase 3 — the map reaches every edge, so a title must *overlay*
the map. That is precisely the job D4-16's band exists to do.

</specifics>

<deferred>
## Deferred Ideas

- **Per-country value labels** (the `10.5`, `8.7`, `3.1` printed on countries in the
  reference, with white halos). Phase 5 — the roadmap already schedules them there,
  and they depend on data that does not exist in Phase 4.
- **Malta/Liechtenstein-style inset boxes** (the Malta box in the reference).
  **An explicit owner decision in Phase 6**, and a deliberate scope reversal of
  Phase 2's exclusion. No plan may reference it until that decision exists.
- **Revisiting `F-1`, the 14-char default legend-label export ceiling.** Offered
  during discussion and **not** folded in; ships accepted-as-deferred. Worth noting
  for whoever picks it up: `04-08` rewrites the legend renderer, so the measurement
  F-1's bound was derived from is about to become obsolete anyway.
- **Creator-adjustable ramp step count.** Considered and rejected for Phase 4
  (D4-01); the Phase 5 roadmap entry already schedules "adjustable class count".

</deferred>

---

*Phase: 4-Visual & Cartographic System*
*Context gathered: 2026-08-06*
