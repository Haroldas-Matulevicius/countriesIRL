---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 15
subsystem: test
status: complete
tags: [d4-14, integration, reference-frame, png-pixels, no-baseline, region-disjoint, discrimination-controls, shared-helpers, wave-0-complete, supply-chain-gate, resemblance-not-claimed, a12-not-claimed]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "every per-property gate from `04-01` (water), `04-02`/`04-05` (ramp shades), `04-08` (uncoloured fill, stroke weights), `04-09` (interior mesh), `04-10` (bands), `04-11` (composition text), `04-12`/`04-13` (legend inset and the two forms) — asserted TOGETHER here for the first time"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-13`'s `tests/e2e/support/pngProbe.ts`, the one PNG decode path, and its baseline-absence scan"
  - phase: 02-…
    provides: "`02-27`'s reloaded-blank discrimination control and its region-disjoint counting discipline"
provides:
  - "`final-integration.spec.ts` § `phase 4 reference frame` — the whole frame in ONE downloaded 1080 PNG, asserted as the union of the per-property claims"
  - "`final-integration.spec.ts` § `no package was installed during phase 4` — the LAST unsatisfied Wave 0 row, landed as a gate"
  - "`pngProbe.ts`: `rec709Luminance`, `compositionTitleInkRegion`, `regionAround`, `countExactColorsInRegions`, `TEXT_REGION_MARGIN`"
  - "`appHarness.ts`: `paintCountryWithRampShade`, `projectLonLat` / `toExportPixels` / `projectToExportPixel`, the named sample geography, and the five Map-style/Text panel helpers"
  - "`04-VALIDATION.md` `wave_0_complete: true`, with all seven rows named against a landed artifact"
  - "`coding-rules/export.md` § ONE home per helper, and § The composite reference frame"
  - "Evidence that the phase's per-property gates are MUTUALLY INDEPENDENT: all 138 Chrome specs green in one run"
affects: [04-16]

actuals:
  tokens: 26150
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A composite gate asserts the UNION of per-property claims, never a whole-image baseline. A re-baseline diff cannot be RED-proved on its own subject"
    - "A region that reports ZERO owes a POSITIVE control in the same run, proving the counter can see the thing there. `04-13`'s corner box reported a tidy zero in this very file while the legend was right where it looked"
    - "A blank COMPOSITION and an empty FRAME discriminate different things. The reloaded blank is still a rendered world map at the shipped defaults, so it satisfies every claim that IS a shipped default"
    - "A negative claim needs a positive companion in the SAME frame. `the uncoloured country is grey` is true of a map with nothing on it; `and it differs from every paint here` is not"
    - "One home per helper does not stop at the decode path. A copied PROJECTION is worse — it keeps working while sampling a different place"
    - "Two exports, one region, one difference: clearing the title and measuring ZERO movement inside the legend's bounds proves non-collision in the RASTER, which the DOM geometry alone cannot"

key-files:
  created: []
  modified:
    - tests/e2e/final-integration.spec.ts
    - tests/e2e/support/pngProbe.ts
    - tests/e2e/support/appHarness.ts
    - tests/e2e/export.spec.ts
    - .planning/coding-rules/export.md
    - .planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-VALIDATION.md

key-decisions:
  - "The composite frame runs on **`Warm paper`**, NOT the owner's white water, and the spec says so in its own comment. `04-10` measured a band on white fading 239.626 to 239.626; a band claim sampled there passes while measuring nothing. Both escapes the plan offered are taken: a non-white surface AND a column crossing land"
  - "The bottom band over Antarctica is the band subject, not the top band. `04-10` measured 7.481 near-to-far there against 3.490 in the top band, because the top band at the default camera is open Arctic Ocean"
  - "Six of the seven properties redden on the blank composition. The coastline/interior-border pair does NOT — it is a property of the SHIPPED DEFAULTS, which a blank map also has — and it reddens on the flood-filled empty frame instead. Stated plainly; both controls ship and neither is described as covering the other"
  - "The plan's declared file set was exceeded. Three specs' private helpers were PROMOTED rather than copied a fourth time, which meant touching `export.spec.ts` and `pngProbe.ts`. No assertion and no threshold moved, and both specs were re-run whole (30/30, 2/2) before a single new claim was added"
  - "`wave_0_complete: true` was earned rather than declared. Row 7 — the `package.json`-unchanged assertion — had NO landed artifact; it rested on a `git diff` a human had to remember to run. The gate was written instead of the box being ticked"
  - "`nyquist_compliant` and `status` left UNTOUCHED for `04-16`"

requirements-completed: [D4-14]
---

# Phase 4 Plan 15: The reference frame, built once and inspected in bytes — Summary

Fourteen plans each proved their own slice against its own subject. This one
proves they **compose**: one export, one PNG, and the union of every property
the phase promised, asserted on real downloaded bytes with a discrimination
control for each. Then the whole gate set in one pass, to test D4-14's claim
that per-property assertions keep the plans' gates mutually independent.

**There is still no image baseline anywhere in this phase.**

---

## ⛔ What is NOT claimed

- **Cartographic resemblance to the Eurostat reference is NOT claimed.**
  Building the frame and measuring its pixels is not a human comparing it side
  by side. `04-VALIDATION.md` lists resemblance as **manual-only** and schedules
  it in `04-16`. Nobody has looked at the exported PNG.
- **A12 is NOT claimed.** Whether the latin-ext diacritics are the *right
  glyphs* is a physical check, never performed in Phase 3, not inheritable, and
  owned by `04-16`. This plan sets an ASCII title and counts ink.
- **`G-1` and `G-3` are NOT claimed resolved.** Both are the owner's subjective
  judgement. `OQ-3` and `OQ-5` stay OPEN.
- **No physical check was performed.** No screen-reader pass, no touch-target
  measurement, no 200 % zoom, no dark-theme review. **No Phase 3 UAT cell is
  cited as verified.**
- **No Edge, Firefox, or Safari result is produced or cited.** Microsoft Edge is
  **not installed on this machine**; the `msedge` project cannot launch.

**Authorization in force:** a **blanket, in-advance, sight-unseen
proceed-authorization** (`04-AUTHORIZATION.md`). It **authorizes proceeding**;
it is **not a content review** and it is **not hash-bound** (Immutable Safety
Constraint 8). This plan carries no owner gate — it is `autonomous: true`.

---

## Task 1 — the reference frame

### What the frame is, and how it was built

Through the real UI, never by poking state:

| Ingredient | Value | Owner |
|---|---|---|
| paints | `BRA` = Reds **step 2**, `KAZ` = Reds **step 5**, `IND` = Blues **step 4** | `04-02` / `04-05` / `04-07` |
| water | `Warm paper` `#F5EFE6` | `04-01` |
| coastlines | `None` | `04-08` |
| interior borders | `Thin` | `04-08` / `04-09` |
| bands | top **on** at 120, bottom **on** at 120 | `04-10` |
| title | `Europe by visits`, medium, baseline 76 | `04-11` |
| legend | default top-left preset, form **inferred `bar`** | `04-12` / `04-13` |

`BRA` and `KAZ` are the **same family at different steps** on purpose: that is
what makes "different steps produce different exported fills" a claim about the
step rather than about the hue. None of the three touches the Rhine, Australia's
west coast, Libya or Antarctica — the four places the frame samples for
something else. `#DE2D26`-class shades read as dark ink at
`DARK_INK_THRESHOLD`, so a painted country inside the interior-border band would
have satisfied that band's floor with a **fill** instead of a **stroke**.

### The frame runs on Warm paper, not on white — and the reason is measured

The plan requires this choice to be stated. **It is stated in the spec's own
comment and here.** `04-10` measured that a band fades from `settings.surfaceColor`
to transparent, so on the owner's white water it fades from white *to white*:
**239.626 with the band on and 239.626 with it off.** The reference having no
visible bands is therefore correct behaviour — and exactly why the composite
frame cannot be built on white if the band property is to be asserted at all.

This gate takes **both** escapes the plan offered: a non-white surface **and** a
sample column that crosses land. The band subject is the **bottom** band over
Queen Maud Land, where `04-10` measured 7.481 near-to-far against the top band's
3.490.

### Every region, and the proof it is where it claims

`04-13` found this file's own corner box sized for a 24-unit row swatch, missing
the bar's marks entirely and reporting a tidy **zero** while the legend was
right there. So every region is derived from the same pure function the renderer
uses **and** cross-checked against the live DOM before a pixel is read.

| Region | Derived from | Measured (PNG px) | DOM cross-check |
|---|---|---|---|
| title box | `resolveCompositionTextLines` | x 24, y 32, **735 × 55** | `[data-text-role="title"]` has the text |
| legend box | `resolveLegendRender` | x 32, y 152, **297 × 96** | `transform="translate(32 152)"`; `[data-editor-only]` is 297 × 96; each of the three `rect[fill=…]` is `LEGEND_BAR_WIDTH` (48) wide |
| top-band strip | `BAND_DEFAULT_HEIGHT` | 0, 0, 1080 × **120** | `rect[data-band="top"]` height 120; `rect[data-band="bottom"]` height 120 |
| map region | legend foot | 0, **248**, 1080 × 832 | — |
| coastline band | `AUSTRALIA_WEST_COAST_LON_LAT` → projection | **875, 603**, 12 × 12 | — |
| inland band | `FRANCO_GERMAN_BORDER_LON_LAT` → projection | **557, 366**, 12 × 12 | — |
| band column | meridian 0 → projection | x **540**, rows 1070 / 1020 / 970 | — |

Sample points, all from a named lon/lat through the real projection and the live
camera: ocean **(120, 540)**, Libya **(600, 459)**, Brazil **(384, 570)**,
Kazakhstan **(741, 375)**, India **(777, 472)**.

**Every derived crop is bounded to the 1080 frame** by `expectRegionInsideFrame`
before anything is sampled — `04-11` measured 28,050 phantom pixels from an
off-bitmap `drawImage` that every ink counter read as solid ink.

### The measured numbers, and the floor each one produced

All measured in **installed Chrome 151.0.7922.76**, Playwright 1.61.1, in the
run that landed the gate.

| Claim | Measured | Floor | Floor as % of measurement |
|---|---|---|---|
| IHDR, all four exports | **1080 × 1080** | exact | — |
| ocean pixel | **(245, 239, 230)** = `#F5EFE6`, alpha **255** | exact | — |
| Libya interior | **(229, 231, 235)** = `#E5E7EB` | exact | — |
| Brazil / Kazakhstan / India | **`#FCAE91`** / **`#A50F15`** / **`#2171B5`** | exact | — |
| coastline band, dark ink | **0** | exact `0` | — |
| Rhine band, dark ink | **85** | 8 | 9 % |
| band column, bands ON | **238.485 / 235.209 / 231.004** | — | — |
| band column, bands OFF | **230.864 / 230.864 / 230.864** — disagreement **0.000** | ≤ 0.25 | — |
| band presence (Σ\|on − off\|) | **12.1072** | 2.5 | 21 % |
| band near − far | **7.4814** | 1.5 | 20 % |
| land / water luminance, derived from the hexes | **230.8636** / **239.6258** | — | — |
| title-box ink | **4,188** | 1,500 | 36 % |
| title-box ink, title cleared | **0** | exact `0` | — |
| legend-box ink | **6,981** | 1,500 | 21 % |
| legend-box ink, title cleared | **6,981** — delta **0** | exact equality | — |
| bar segments in the legend box | **1,426 / 1,472 / 1,426** | 400 | 43 % of the smallest of six |
| painted countries in the map region | **6,135 / 4,019 / 2,378** | 1,000 | 42 % |
| ramp pixels in the top-band strip | **0 / 0 / 0** | exact `0` | — |
| ramp pixels in the title box | **0 / 0 / 0** | exact `0` | — |
| **positive control** — same strip, top band OFF | **941 / 1,119 / 1,104** | 400 | 43 % |
| blank composition, every region | **0 / 0 / 0** in all four | exact `0` | — |
| blank title-box ink | **0** | exact `0` | — |
| non-white pixels: frame vs blank | **1,166,400** vs **457,513** | inequality | — |
| flood-filled instrument control | **0** ink anywhere | exact `0` | — |

`MIN_BAND_NEAR_TO_FAR_DELTA`, `MIN_BAND_PRESENCE` and `BAND_NOISE_FLOOR` are
`04-10`'s numbers **unchanged**, and the composite frame reproduces `04-10`'s
isolated bottom-band measurements to three decimals — which is itself a small
integration result. The Rhine band's **85** is likewise the exact figure `04-09`
measured in isolation. `MIN_INTERIOR_BORDER_INK_PIXELS` stays at `04-09`'s **8**;
it was not lowered and not raised.

### The legend and the title do not collide — proven in the bytes

The plan's objective calls this out specifically: `04-11` put the title baseline
at 76 and `04-12` moved the legend below the title block via a band-derived
inset, after `04-10` recorded the legend sitting **88 units inside the title
band** at Phase 4 defaults. Three claims, escalating:

1. **Geometry** — title box `y 32..87` is entirely inside the 120-unit top band;
   legend box `y 152..248` clears it; `expectRegionsDisjoint` on the pair.
   `legendRegion.y === LEGEND_SAFE_INSET + BAND_DEFAULT_HEIGHT` exactly.
2. **Colour, in the raster** — **zero** ramp pixels inside the title's glyph box
   and **zero** inside the top-band strip, with the positive control above
   proving the counter finds **941 / 1,119 / 1,104** of the very same pixels in
   that strip once the band is off.
3. **Ink, in the raster** — clearing the title changes the legend's own bounds by
   **exactly 0 pixels** (6,981 either way) while the same counter, the same two
   frames, watches the title go **4,188 → 0** in its own region. A title
   overlapping the legend cannot produce that pair.

### Controls, and what each one discriminates

Four real exports and one synthetic frame, all in one run:

| Control | What it is | What it can catch |
|---|---|---|
| **A** the reference frame | the subject | — |
| **B** title cleared | otherwise identical | the title claim, and the non-collision claim |
| **C** both bands off | otherwise identical | the band column's bands-off control **and** the positive control for the top-band strip |
| **D** reloaded blank | `02-27`'s known-different composition | every composition-level property |
| flood fill in the water colour | `makeFloodFilledPng` | the **instrument** — a counter that reads content into anything |

**Deviation from the plan's wording, stated:** the plan says *"reuse 02-27's
blank export in the same run"*. Playwright tests are isolated, so the blank
export is produced **inside** this test by the same technique — a real
`page.reload()`, because the composition lives only in memory — rather than
shared across tests. Same control, same counter, same run.

**A blank COMPOSITION is not an empty FRAME.** The reloaded blank is still a
fully rendered world map at the shipped defaults, which is why it discriminates
paint, legend, title, water and bands but cannot discriminate a shipped default.
That distinction is now recorded in `coding-rules/export.md`.

---

## Task 2 — the whole gate set, in one pass

Run on this working tree at `75ef73c`.

| Gate | Result |
|---|---|
| `npm run lint` | **clean** |
| `npm test` | **873 / 873** passing, **47** files |
| `tsc -b` + `npm run build` | **clean** |
| `npm run test:e2e -- --project=chrome` | **138 / 138** passing |
| `npm run data:world:check` | **PASS** |

`data:world:check`, verbatim:

> `World GeoJSON check passed: 248 units, 195 selectable core states, and 207 colorable units. Interior-border mesh re-derived and matched: 327 geometries, 366767 bytes.`

**Browser: installed Chrome 151.0.7922.76 only**, confirmed with
`Google Chrome --version` in this session (Playwright 1.61.1). ⚠ Chrome
auto-updated mid-phase: `04-01`…`04-06` ran on **.75**, `04-07` onward on
**.76**. **Microsoft Edge is NOT installed on this machine** — no Edge, Firefox
or Safari result is produced or cited.

### Delta against the Phase 3 close baseline

| Measure | Phase 3 close | Now | Delta |
|---|---|---|---|
| unit passed / total | 637 / 637 | **873 / 873** | **+236 / +236** |
| Chrome e2e passed / total | 103 / 103 | **138 / 138** | **+35 / +35** |
| lint | clean | clean | — |
| build | clean | clean | — |
| `data:world:check` | PASS | PASS | — |

**No total went down anywhere**, so no spec was silently skipped. Against the
immediately preceding baseline (`04-14` close: 873 / 873 unit, 136 / 136 e2e):
unit is **unchanged** — this plan adds no unit test — and e2e is **+2**, the
reference-frame gate and the supply-chain gate.

**Selector ceiling: 337, unchanged.** No CSS was touched; `uiContract.test.ts`
is green inside the 873.

### The claim this task exists to test

D4-14 chose per-property assertions so that *"a later plan cannot redden an
earlier plan's gate."* Running everything together is what turns that from a
design intention into evidence.

**Every gate from `04-01` through `04-14` is green in the same run. No earlier
plan's gate was reddened by a later plan, and nothing is handed to `04-16` as a
collision.** The strongest single piece of evidence is not the pass count: it is
that the composite frame **reproduces `04-09`'s 85 and `04-10`'s 7.4814 /
12.1072 / 230.864** while carrying six layers those plans measured in isolation.

### Explicit checks the plan required

| Check | Result |
|---|---|
| No image baseline anywhere | **None.** `find tests/e2e -type f \( -name '*.png' -o -name '*.jpg' … \)` returns nothing; `git status --porcelain` shows no new `.png`; `04-13`'s baseline-absence scan is green inside the 138 |
| `grep -rniE "toMatchSnapshot\|toHaveScreenshot" tests/` | **Two hits, and they are the SCAN'S OWN forbidden-matcher list** (`legend.spec.ts:1291-1292`). No test calls either matcher. Recorded precisely rather than as "returns nothing" |
| No watch-mode flag in any Phase 4 plan | `grep -rn -- "--watch" .planning/phases/04-…/*-PLAN.md` returns **nothing** |
| Sampling continuity | **Holds.** Across all 16 plans (54 tasks) exactly **9** tasks lack an `<automated>` verify, and **every one is an owner-gate checkpoint**. The longest run of consecutive such tasks is **2** (`04-13` Task 4 → `04-14` Task 1), across a plan boundary. Never three |
| `package.json` / lockfile unchanged for the phase | `git diff --stat 42b2f0d^..HEAD -- package.json package-lock.json` is **empty** — and it is now a gate, not a manual check (below) |

### Wave 0 — all seven rows, each against a landed artifact

| Row | Landed | Evidence |
|---|---|---|
| `contrast.ts` + test, `uiContract.test.ts` repointed | `04-01` | both files exist; `uiContract.test.ts:7` imports `'../utils/contrast'`; floor is **0.2164** |
| `ramps.ts` + test | `04-02` | `blues` step 3 is `#2171B5`, substituted on merit |
| `bands.ts` + test | `04-10` | `BAND_MAX_HEIGHT = floor(1080/7)`, default 120 |
| `export.spec.ts` describes for water / border / band / text | `04-01`, `04-08`, `04-09`, `04-10`, `04-11` | eight describes, each with its own discrimination control |
| `prepareWorldData.mjs` mesh derivation + verification | `04-06` | `--check` re-derives and matches: 327 geometries, 366767 bytes |
| `appHarness.ts` `LOGICAL_CORE_COUNT` → 207 | `04-03` | `appHarness.ts:12` |
| a `package.json`-unchanged assertion | **`04-15`** | **it had not landed.** See below |

**`wave_0_complete: true` is set. `nyquist_compliant` and `status` are
untouched** — `04-16` sets those after the independent review.

### The one Wave 0 row that had not landed

Row 7 was the only one with **no artifact**. It rested on a `git diff` a human
had to remember to run and on per-plan SUMMARY self-reports. Ticking the box
over that would have been exactly the self-report this project distrusts, so the
gate was written instead:

`final-integration.spec.ts` § *no package was installed during phase 4* asserts
`package.json` **and** `package-lock.json` against the phase-start dependency
set — **three-way**, deliberately. `package.json` alone misses a lockfile edited
on its own; a lockfile hash alone fails opaquely without naming the package.
The recorded literal is meant to be edited **by hand, in the same commit as a
deliberate dependency change**; that friction is the mitigation, and it means a
slopsquatted or hallucinated package name cannot enter this repository without
turning the gate red first.

---

## RED Proofs

**Five, each on its own subject**, each restored by **scratchpad copy-back**
(`/private/tmp/claude-501/.../scratchpad`), never by `git checkout --`. Every
restore confirmed by SHA-256 and `git status`.

### 1. The blank composition substituted for the reference frame (the plan's required proof)

Mutation: `referenceBytes = blankBytes` after all four exports, with the
assertion block temporarily softened to `expect.soft` so **all** failures
surface in one run rather than only the first.

**22 soft failures across SIX of the seven properties.** Verbatim highlights:

```
Error: the mid-Pacific pixel is rgb(255, 255, 255), not the chosen Warm paper #F5EFE6.
Error: BRA exported the UNCOLOURED fill, so nothing in this frame distinguishes painted land from unpainted.
Error: BRA exported rgb(229, 231, 235) instead of Reds step 2 (#FCAE91).
Error: the two countries painted at DIFFERENT steps of the same ramp exported the same colour.
Error: the band column moved 0.000 from its bands-off control against a floor of 2.5.
Error: the row nearest the bottom edge (230.864) is not lighter than the middle row (230.864).
Error: the title region carries 0 ink pixels against a floor of 1500.
Error: the legend's own bounds carry 16 ink pixels against a floor of 1500.
Error: the bar segment for #FCAE91 measures 0 pixels inside the legend's bounds against a floor of 400.
Error: BRA measures 0 pixels in the map region against a floor of 1000.
Error: the blank export and the reference frame carry the same amount of non-white paint.
```

| Property | Reddened on the blank composition? |
|---|---|
| 1 water | ✅ |
| 2 uncoloured fill | ✅ (via the third conjunct — see below) |
| 3 ramp fills at different steps | ✅ |
| 4 quiet coastline / present interior border | ❌ **NO** — see proof 2 |
| 5 band | ✅ |
| 6 title | ✅ |
| 7 legend | ✅ |

**The uncoloured-fill claim needed a third conjunct to be able to fail.** As the
plan wrote it — *"equals `uncoloredFill` and differs from the water"* — a blank
map satisfies it **perfectly**, because an unpainted world IS all uncoloured
fill. The claim now also asserts that **every painted country in the same frame
differs from it**, which is what makes it a claim about *distinguishability*
rather than about a constant. That is a strengthening found by the RED proof,
not a threshold moved to make one pass.

### 2. The coastline/interior-border pair — it SURVIVES the blank, and this says so plainly

**It did not redden in proof 1, and it is not presented as though it did.** The
reason is structural rather than a defect in the assertion: the reloaded blank
is a fully rendered world map at the **shipped defaults** — coastlines `none`,
interior `thin` — so it genuinely has a quiet coastline and a present mesh. A
blank *composition* cannot discriminate a shipped *default*.

Its real control is the flood-filled **empty frame**, and it was RED-proved
against that:

```
Error: the Franco-German border carries 0 dark pixels against a floor of 8.
       The interior mesh did not reach the PNG.
```

Both controls ship. **Neither is described as covering the other.**

### 3. The top-band positive control is not vacuous

Mutation: the reference frame's bytes handed to the band-free counter.

```
Error: with the top band off the legend should sit at y = 32, inside the strip — but the
       counter found 0 pixels of #FCAE91 there. The zero measured in the reference frame
       proves nothing, because this counter cannot see a legend in this region at all.
```

This is the proof that the two `toBe(0)` legend claims are not the `04-13`
corner-box defect wearing a new hat.

### 4. The non-collision claim, on its own subject

Mutation: build the reference frame with the **top band OFF**, so `04-12`'s
band-derived inset never moves the legend clear of the title. A real product
configuration, not a poke.

```
Error: expected 152, received 32                       (the arrangement)
Error: the legend reaches into the top band …          (>= 120, received 32)
Error: the title box and the legend box OVERLAP in the composition geometry.
Error: clearing the title moved 2975 pixels inside the legend's own bounds.
       The title's glyphs are overlapping the legend in the exported PNG.  (6891 vs 9866)
Error: 941 pixels of #FCAE91 are inside the title's glyph box …
Error: 705 pixels of #A50F15 are inside the title's glyph box …
Error: 941 / 1119 / 1104 pixels are inside the top band's extent …
```

> ⚠ **This probe reddened the WRONG gate twice before it was right, and both
> misfires are recorded rather than quietly fixed.**
>
> **First**, removing the top band deleted `rect[data-band="top"]`, so the DOM
> precondition `toHaveAttribute('height', '120')` threw before any pixel claim
> ran — the *"a probe reddens a DIFFERENT gate"* shape this repository has
> shipped before. **Second**, with that removed for the probe,
> `expectRegionsDisjoint`'s hard `expect` aborted the test at the geometry
> claim, so the byte-level claim still never ran. Only after softening that too
> did the raster claim redden on its own subject.

### 5. The supply-chain gate

Mutation: `"reqeusts": "1.0.0"` added to `package.json` — a slopsquat-shaped
name, chosen because that is the threat the gate exists for.

```
Error: package.json declares a runtime dependency Phase 4 did not start with.
       Phase 4 adds ZERO runtime packages; a failed install is a human-verification
       checkpoint, never an auto-substituted alternative.
+   "reqeusts": "1.0.0",
```

`package.json`'s SHA-256 is byte-identical before and after
(`cc71c603dabb50f9033b5d68e9d0397bb53e44a697befc186cb1f695c87135ae`).

### Assertions NOT RED-proved, stated plainly

- **The 1080 × 1080 IHDR read.** It is asserted here on four frames, but it is a
  **restatement** of a gate `export.spec.ts` already owns and RED-proves; making
  it fail requires changing `exportMapPng`'s size contract, which is a different
  plan's subject. It is not claimed as a new proof.
- **`expectBlankControlReadsZeroInk`** — the instrument control. Its own
  falsifiability is `pngProbe.ts`'s and `04-01`'s; it was not re-reddened here.
- **The promoted helpers carry no new claim** and were not individually
  RED-proved. Their evidence is that `export.spec.ts` (30/30) and
  `final-integration.spec.ts` (2/2) were re-run **whole** against the
  consolidation with **no assertion and no threshold changed**, before a single
  new claim was added.
- **The `expectRegionsDisjoint` geometry helper** reddens under proof 4 and is
  covered there; it was not separately mutated.

---

## Deviations from Plan

### `[Rule 3 — blocking]` The plan's file set was exceeded to promote shared helpers

- **Found during:** Task 1, immediately.
- **Issue:** the composite frame needs the decode path, the projection, the
  named sample geography, the title-crop derivation, a Rec. 709 luminance, and
  five Map-style/Text panel helpers. **Every one of them was private to
  `export.spec.ts`** — the exact wall `04-12` hit and `04-13` resolved by
  creating `support/pngProbe.ts`. Copying them into a fourth spec is the drift
  this repository names by name, and a copied **projection** is worse than a
  copied decode path because it keeps *working* while sampling a different
  place. `04-09` had to MOVE the coastline sample once the interior mesh
  contaminated Cabo da Roca; a copy would not have moved with it.
- **Fix:** promoted rather than copied. `pngProbe.ts` gained `rec709Luminance`,
  `compositionTitleInkRegion`, `regionAround`, `TEXT_REGION_MARGIN` and
  `countExactColorsInRegions`; `appHarness.ts` gained `paintCountryWithRampShade`,
  `projectLonLat` / `toExportPixels` / `projectToExportPixel`, the six named
  geography constants with their derivations, and the four panel helpers.
  `export.spec.ts` imports every one under its existing local name, so its call
  sites read exactly as they did.
- **And it closed a real hole:** `final-integration.spec.ts`'s private
  `measurePng` was the suite's **last** second `createImageBitmap`. It now
  delegates to `countExactColorsInRegions`, and the parallel `RED_RGB` /
  `BLUE_RGB` triples — commented as existing to prevent exactly the drift they
  were — are gone.
- **Evidence it is safe:** 30/30 and 2/2 re-run before any new claim; no
  assertion, no threshold, no message changed.
- **Commit:** `3f41b19`.

### `[Rule 2 — missing functionality]` The Wave 0 supply-chain assertion had never landed

- **Found during:** Task 2's Wave 0 audit.
- **Issue:** the plan instructs `wave_0_complete: true` **if and only if** every
  row is genuinely satisfied. Row 7 had no artifact.
- **Fix:** `final-integration.spec.ts` § *no package was installed during phase 4*.
  RED-proved (proof 5).
- **Commit:** `75ef73c`.

### `[Rule 1 — bug]` The uncoloured-fill claim as the plan wrote it could not fail

Recorded above under proof 1. The plan's two conjuncts are both true of a blank
map; a third — *differs from every paint in the same frame* — was added.

### The blank control is produced inside the test, not shared with 02-27's journey

Playwright tests are isolated, so `02-27`'s blank export cannot be handed to
another test. The **technique** is reused verbatim — a real `page.reload()`,
because the composition lives only in memory — and it runs through the same
counters at the same thresholds in the same run. Recorded rather than glossed.

### Documentation scope

`coding-rules/export.md` was updated **in the same commit as the behaviour**
(`3803271`), with two new § Testing sections and its "Last updated" entries
condensed to two per the rule. `coding-rules/general.md` was **not** touched:
the rules this plan establishes are all export-pixel-gate rules and `export.md`
is their home. Recorded rather than done silently.

---

## What `04-16` inherits

- **A composite frame it can point a human at.** The exported PNGs land under
  `.artifacts/playwright/downloads/reference-frame*.png` (gitignored, evidence
  rather than baseline). `04-16`'s resemblance check and A12 both need a human
  to open one; this plan produced them and did not look.
- **A phase-start dependency literal** in `final-integration.spec.ts`. `04-16`'s
  own `package.json`-unchanged assertion is now partly landed; it should verify
  the literal rather than re-implement the check.
- **`wave_0_complete: true`; `nyquist_compliant` and `status` still `false` /
  `draft`,** deliberately.
- **One honest gap, named:** the coastline/interior-border pair cannot be
  reddened by a blank composition, because it is a shipped default. Its control
  is the flood fill. If `04-16` wants a single control covering both, it needs a
  frame that is neither.

## Open items this plan hands forward

- **`OQ-3` / `G-1` OPEN. `OQ-5` OPEN. `G-3` OPEN.** Nobody has looked.
- **Cartographic resemblance and A12 remain UNPERFORMED**, and are `04-16`'s.
- **`03-UI-SPEC.md`'s `.map-navigation` `inset-inline-end` formula** is still
  unannotated. Named again; not touched.
- **`04-13`'s Gate C pixel claim is still blind to a LIGHT empty legend
  container**, by measurement. Unchanged by this plan.

## Known Stubs

**None introduced.** This plan adds no product code — it adds two Playwright
tests, moves helpers between test-support modules, and edits two planning
documents. No hardcoded empty value, placeholder string, or unwired component.

Carried forward, unchanged by this plan: nothing. `04-14` closed the
"a saved composition reloads with default water" stub with the V3 record.

## Threat Flags

**None.** No new network endpoint, auth path, file-access pattern, or schema
change at a trust boundary. The one boundary this plan touches — downloaded PNG
bytes → the test's own decoder — is `T-04-15-01` … `T-04-15-05`, all mitigated
as the register requires: content floors first, `02-27`'s control through the
same machinery, baselines forbidden and their absence asserted, totals recorded
rather than pass rates, stale downloads cleared before every measurement run,
and **zero package-manager installs** (`T-04-15-SC`) — now enforced by a gate
rather than by a promise.

## Self-Check: PASSED

- `tests/e2e/final-integration.spec.ts` — FOUND; contains
  `describe('phase 4 reference frame')` and
  `describe('no package was installed during phase 4')`
- `tests/e2e/support/pngProbe.ts` — FOUND; exports `rec709Luminance`,
  `compositionTitleInkRegion`, `regionAround`, `countExactColorsInRegions`
- `tests/e2e/support/appHarness.ts` — FOUND; exports
  `paintCountryWithRampShade`, `projectLonLat`, `toExportPixels`,
  `projectToExportPixel`, `chooseWaterPreset`, `chooseStrokeWeight`,
  `setBandVisible`, `setCompositionTitle`, and the six geography constants
- `tests/e2e/export.spec.ts` — FOUND; imports all of the above, 30/30 green
- `.planning/coding-rules/export.md` — FOUND; § ONE home per helper and
  § The composite reference frame present; exactly two "Last updated" entries
- `.planning/phases/04-…/04-VALIDATION.md` — FOUND; `wave_0_complete: true`,
  all seven rows ticked, `nyquist_compliant: false` and `status: draft`
  UNCHANGED
- `.planning/STATE.md` — **UNTOUCHED**, confirmed by `git status`
- `.planning/ROADMAP.md` — **UNTOUCHED**, confirmed by `git status`
- **No forbidden gsd-sdk verb was run** (`state.advance-plan`,
  `state.update-progress`, `roadmap.update-plan-progress`)
- Commit `3f41b19` — FOUND
- Commit `3803271` — FOUND
- Commit `75ef73c` — FOUND
