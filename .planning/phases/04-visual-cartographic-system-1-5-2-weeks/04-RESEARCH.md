# Phase 4: Visual & Cartographic System — Research

**Researched:** 2026-08-06
**Domain:** SVG composition-layer cartography (sequential ramps, interior-border mesh, gradient
bands, export-safe text, legend restyle) rasterised through this repo's own SVG→PNG path
**Confidence:** HIGH for the export-fidelity envelope, the mesh derivation, and the D4-10 blast
radius (all measured in this session). MEDIUM for ramp palette choice. LOW for the rail-height
answer and the water-preset set (both are open owner questions).

> **Every claim below carries a provenance tag.** `[VERIFIED: path:lines]` means I opened that file
> this session and the quoted values are verbatim. `[MEASURED]` means I ran the command/probe in
> this session and the number is the observed output. `[CITED: doc]` means it is written in a
> planning doc I read. `[ASSUMED]` means training knowledge, not verified here — treat as needing
> confirmation.

---

<user_constraints>
## User Constraints (from `04-CONTEXT.md`)

### Locked Decisions

*Copied verbatim from `.planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-CONTEXT.md`
§ Implementation Decisions. Research these, not alternatives.*

- **D4-01: A ramp is a fixed set of N ordered shades, not a continuous gradient.**
  `shadeForValue(t)` snaps `t` to the nearest step; `shadeForIndex(i, n)` picks step `i` of `n`.
  Step count is fixed per ramp in Phase 4 — creator-adjustable class count is deferred to Phase 5,
  where the roadmap already places it. Chosen so the palette strip shows exactly the shades that
  can appear, the legend has finite rows to name, and `04-02`'s WCAG contrast gate can check a
  bounded set. — **Reversibility:** costly.

- **D4-02: A ramp-painted country stores `{rampId, t}`, not resolved hex.** Hex is resolved at
  render time. One-off custom colors continue to store raw hex alongside, so `ColorMap` carries two
  value shapes. Chosen because it is already the exact representation Phase 5's CSV engine will
  produce, and because switching ramps can then re-skin every painted country instantly.
  — **Reversibility:** one-way.

- **D4-03: Phase 4's interaction is pick-a-shade-then-paint.** No rank buckets, no class-count UI,
  no ordering concept surfaced to the creator in this phase. Owner verbatim: *"the shades will
  later also be based on country statistics, like if Poland is 100% for something and Lithuania
  gets entered as 50% for something, it needs to understand that Lithuanias shade is half of what
  polands should be, so later it has to be connected to data."* This describes **proportional
  shading against a normalized position**, which is not the same thing as the quantile /
  equal-interval classing the Phase 5 roadmap names. Report the conflict at Phase 5, do not resolve
  it here.

- **D4-04: `04-02` owns the panel redesign and the ramp build, redesign first.** Owner's complaint:
  *"too squished, not organized well, hate the multi boxes within."* `04-02` becomes the phase's
  heaviest plan and likely warrants a UI-SPEC pass ahead of it.

- **D4-05: Every flyout widens 280px → 360px — uniformly, not per-panel.** **This amends the
  approved `03-UI-SPEC.md`**; the spec must be annotated in the same commit that lands the width,
  and the divergence reported rather than silently absorbed. — **Reversibility:** reversible.

- **D4-06: The colors panel narrows to ramps, painting, and per-country custom hex.**

- **D4-07: A new "Map style" rail tool holds every non-country appearance control:** water/
  background preset, uncolored-country fill, border color, interior-border weight, coastline
  weight. **Planning constraint:** the 56px rail is already at ~492px of required height with no
  scroll container, and **D-5 is not closed at ≥1200px**.

- **D4-08: Stroke weights are named steps** — none / hairline / thin / medium / bold — with
  **interior borders and coastlines controlled independently.** Mirrors how `legend.textSize`
  already works.

- **D4-09: An uncolored country renders flat grey by default, and the fill is creator-changeable.**
  `#FFFFFF` remains the *stored* sentinel for "not colored"; only the render maps it to grey.

- **D4-10: All twelve `colorPolicy: "neutral"` units become colorable.** Owner: *"I want kosovo and
  the othe regions colorable, there should not be a region that is not colorable."* The twelve:
  `ATA COK CYN FLK GIB IOT KAS KOS NIU SAH SOL TWN`. The 41 `inherit-parent` units are **not**
  affected. Selectable count moves **195 → 207**. **No geometry is promoted, no snapshot is added,
  no rights/factual/topology approval is implicated** — but the manifest hash chain is re-derived,
  not waived. It **contradicts the Phase 5 roadmap entry `05-02`** and needs an explicit
  `ROADMAP.md` amendment. — **Reversibility:** costly.

- **D4-11: Legend box chrome is deleted outright.** `theme`, `backgroundOpacity`, and `borderStyle`
  come out of `LegendState`. — **Reversibility:** one-way.

- **D4-12: Two legend forms, both held to the same restraint, default inferred from the coloring
  technique in use.** Ramp-painted → **stacked bar with break ticks**; categorical (custom hex) →
  **restyled rows**. Creator can override.

- **D4-13: The legend's default position is taken from the owner's reference image, not re-guessed.**
  Left edge, hugging, below the title block. This is the concrete resolution of carry-forward
  **G-1**. Moves exported pixels — gated per D4-14.

- **D4-14: Property assertions, not whole-image baselines — including at `04-10`.** Five of eleven
  plans move exported pixels (`04-03`, `04-05`, `04-06`, `04-07`, `04-08`). Each plan asserts only
  the property it owns. Reuse `02-27`'s discrimination controls so a blank export cannot satisfy
  any of them.

- **D4-15: Widen the vendored Inter subset to latin-ext.** Requires a re-recorded SHA-256 in
  `src/assets/README.md` and a license check. Correcting a Phase 3-era framing: the base64 font is
  inlined into the **intermediate SVG**, not the PNG raster — **exported PNG file size is
  unaffected.**

- **D4-16: A band fades from the current surface color to transparent — not from hardcoded white.
  Top band on by default, bottom off.** The band color is derived state that must **serialize into
  the export subtree.**

- **D4-17: A V2 map loads with Phase 4 defaults applied** — grey uncolored countries, no legend box,
  top band on, current border weights. One rendering path, no legacy mode. A saved map will
  genuinely look different when reopened. — **Reversibility:** one-way.

- **D4-18: `04-09` folds in carry-forward `G-2`.** Build a V2 record with a 15–32 character legend
  label, prove it loads cleanly, prove it then refuses to export.

### Claude's Discretion

- **Ramp step count and exact hex sets.** Constraint: every step must pass `04-02`'s WCAG
  label-contrast gate.
- **Whether the latin-ext font is always inlined or inlined only when the composition needs it.**
  CONTEXT recommendation: **always inline**; flagged for research rather than decided in a plan.
- **Band gradient stops, and band-vs-legend z-order on overlap.**
- **Text font stack for title/subtitle/attribution** — interacts with D4-15.

### Deferred Ideas (OUT OF SCOPE)

- **Per-country value labels** (the `10.5`, `8.7` printed on countries in the reference, with white
  halos). Phase 5.
- **Malta/Liechtenstein-style inset boxes.** An explicit owner decision in **Phase 6**. No plan may
  reference it until that decision exists.
- **Revisiting `F-1`, the 14-char default legend-label export ceiling.** Ships accepted-as-deferred.
- **Creator-adjustable ramp step count.** Rejected for Phase 4; Phase 5 schedules it.
- Also out of scope, unchanged from the roadmap: value→class binding and any data import (Phase 5);
  pattern fills; label auto-placement beyond the fixed band positions.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

**`ROADMAP.md` maps no `phase_req_ids` to Phase 4 (`0/0` plans, status `⏳ PENDING (v1.1)`)
[VERIFIED: .planning/ROADMAP.md:526 — `| 4 | Visual & Cartographic System | ⏳ **PENDING** (v1.1) | 0/0 |`].
No REQ-IDs have been invented here.** Coverage is derived from the D4-* decision register plus the
`REQUIREMENTS.md` items Phase 4 actually touches.

| Source ID | Description | Research support |
|---|---|---|
| D4-01 / D4-02 / D4-03 | Fixed-step ramp model; `{rampId, t}` storage | § Ramp Model — the pure module and its blast radius |
| D4-04 / D4-05 / D4-06 | Colors-panel redesign, 360px flyout | § The 280 → 360 Widening Has Three Gates |
| D4-07 / D4-08 / D4-09 | Map style tool, named stroke steps, grey uncolored fill | § The Rail-Height Problem · § Border Rendering |
| D4-10 | Twelve neutral units become colorable | § D4-10: Measured Blast Radius (12 touch points) |
| D4-11 / D4-12 / D4-13 | Legend chrome deleted, two forms, new default position | § Legend Overhaul |
| D4-14 | Per-property export gating | § Validation Architecture · § Per-Property Export Gating |
| D4-15 | latin-ext font | § latin-ext: The Two-Face Answer |
| D4-16 | Gradient bands | § Gradient Bands Through the Export Path |
| D4-17 / D4-18 | Persistence V3, G-2 | § Storage V3 Migration |
| **F4.5** (`REQUIREMENTS.md:104`) | *"Legend styling: background opacity, text size, border"* | ⚠ **D4-11 deletes two of these three.** See § Contract Disagreements. |
| **F5.1 / F5.2** | 1080×1080 PNG containing map + legend | Preserved by every recommendation here; the size contract is enforced three times [VERIFIED: coding-rules/export.md:19-27] |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md and `coding-rules/general.md`)

Binding on every Phase 4 plan. A recommendation contradicting one of these is a defect.

| # | Constraint | Source |
|---|---|---|
| 1 | **Browser-only, localhost-only.** No deployment, backend, auth, cloud, or secrets. No deploy command may be proposed. | `general.md:50-51` (Immutable Safety Constraint 7) [VERIFIED] |
| 2 | **No runtime third-party network request.** No Google Fonts `@import`, no CDN `<link>`, no `@import url(http…)`. Vendor the bytes. | `general.md:245-247`, `data.md:363-366` [VERIFIED] |
| 3 | **PNG export is exactly 1080×1080, always**, enforced three times (canvas sizing, dimension read-back, `IHDR` parse in e2e). | `coding-rules/export.md:13-27` [VERIFIED] |
| 4 | **Selector ceiling is a gate.** `const SELECTOR_INVENTORY_CEILING = 326;` [VERIFIED: src/styles/uiContract.test.ts:488]. Stylesheets are discovered by directory walk; a new sheet must join both `src/styles/controls/` and `main.tsx`'s asserted import order, `editor.css` last [VERIFIED: uiContract.test.ts:361-366, 462-465]. |
| 5 | **A gate must be able to fail on the bug it covers — on its own subject.** RED-prove by scratchpad copy-back; **never** `git checkout --` a file with uncommitted work. | `general.md:59-60, 386-400` [VERIFIED] |
| 6 | **Approval is evidence, never inference.** Historical geometry is DEFERRED for missing rights-cleared source material. Approved catalog holds exactly `Modern`. | `general.md:41-49`, `data.md:186-190` [VERIFIED] |
| 7 | **Playwright is installed Chrome only.** `playwright.config.ts` declares both `chrome` and `msedge` projects, but **Edge is not installed on this machine** and cannot launch. Firefox/Safari never run. | [VERIFIED: playwright.config.ts:36-45] + `general.md:56-58`, `STATE.md` § Filed for owner attention |
| 8 | **Phase 3's UAT was SKIPPED, not passed.** No screen-reader pass, no touch-target check, no physical 200% zoom, **no latin-ext diacritic export**, no dedicated dark-theme review exists anywhere. Never cite one; never substitute an automated result for a physical claim. | [VERIFIED: STATE.md:66; 03-UAT.md:29-34] |
| 9 | **Vitest runs on the `node` environment — there is NO DOM in unit tests.** Anything needing a DOM, layout, or real rendering is a Playwright e2e, not a unit test. | `general.md:189-197` [VERIFIED] |
| 10 | **`03-UI-SPEC.md` outranks `Design.md`, which outranks a component file.** A disagreement is REPORTED, never silently resolved. | `CLAUDE.md` § Documentation Routing, `04-CONTEXT.md` § Canonical References [VERIFIED] |
| 11 | **Never run gsd-sdk `state.advance-plan`, `state.update-progress`, `roadmap.update-plan-progress`.** Edit `STATE.md`/`ROADMAP.md` by hand. | `general.md:407-417` [VERIFIED] |
| 12 | **Update the matching `coding-rules/*.md` in the same commit that lands the behavior**, and keep only the two most recent "Last updated" entries. | `CLAUDE.md` § Update Process [VERIFIED] |

---

## Summary

Phase 4 is **not a dependency problem — it is a fidelity problem.** Every capability the phase
needs (sequential ramps, interior-border mesh, gradient bands, SVG text, WCAG contrast math) is
buildable from what is already installed. `mapshaper 0.7.48` is already a devDependency and
`-innerlines` produces exactly the mesh `04-04` needs [MEASURED]. D3 v7, already a dependency,
renders a `GeometryCollection` of `LineString`s through the same `geoPath` the polygons use. The
WCAG relative-luminance and contrast functions already exist in this repo — they are just in the
wrong file (a test). **No new package should be installed for this phase.**

The real work is that **five of eleven plans write into the exported PNG through a rasterisation
path that sees no host stylesheet.** I probed that path in installed Chrome this session using the
repo's exact serialisation shape (`"data:image/svg+xml," + encodeURIComponent(XMLSerializer…)` →
`Image` → `drawImage`), and the results are unambiguous: `<linearGradient>` with `stop-opacity`,
`<radialGradient>`, gradients defined *inside* a transformed group, `<clipPath>`, `<mask>`,
`<use href="#…">`, `fill-opacity`, `vector-effect="non-scaling-stroke"` as an attribute, and
`<text>` with `text-anchor`/`dominant-baseline`/`<tspan>`/`paint-order` **all survive**. A `var()`
reading a **host** custom property and a class styled by a **host** stylesheet **both silently
render as nothing** — but a custom property declared in a `<style>` **inside the serialised subtree
does resolve**. That last finding is the cleanest available answer to D4-16's "band colour must be
serialized state".

There are three things in the current code that will actively fight this phase and must be
addressed by name in the plans: (1) `sanitizeExportClone` **hard-sets a black 0.75 stroke on every
scene path in the clone**, which defeats 04-05's whole border rework unless it changes; (2) the
export background is a hardcoded `'#FFFFFF'` in three deliberate places plus a literal-typed
`VisibleCompositionSettings.backgroundColor: '#FFFFFF'`, which 04-03 must widen; (3) D4-10 is not a
data edit — it is a **twelve-touch-point change** spanning the manifest, the geojson, the
build-time script's own invariants, the runtime type union, and `LOGICAL_CORE_COUNT = 195` in the
shared e2e harness, which every single e2e spec depends on.

**Primary recommendation:** front-load the two riskiest proofs. Before writing any UI, land a
throw-away-able Playwright probe that (a) renders a `<linearGradient>` band and a `<text>` element
through the **real** `exportMapPng` and byte-samples the PNG, and (b) exports with
`sanitizeExportClone`'s stroke normalisation removed. Both are cheap and both would otherwise be
discovered at 04-06/04-05 after the architecture is committed.

---

## Architectural Responsibility Map

There is no server tier in this project [VERIFIED: `general.md:238-242` — "No backend, and therefore
no external-service SDK"]. The tiers that exist are: **build-time script**, **bundled asset**,
**pure module (node-testable)**, **React/D3 render**, **export clone (isolated SVG document)**, and
**localStorage**.

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Ramp definition + `shadeForIndex`/`shadeForValue` | Pure module (`src/utils/` or `src/constants/`) | — | Must be unit-testable with no DOM (constraint 9), and Phase 5's classing engine imports it |
| WCAG shade/label contrast gate | Pure module + unit test | — | `relativeLuminance`/`contrastRatio` already exist but only inside a test file |
| Interior-border mesh derivation | **Build-time script** (`scripts/prepareWorldData.mjs`) | Bundled asset (`public/data/`) | Mesh must be hash-bound and never derived at runtime; `mapshaper` is a devDependency, not a runtime one |
| Mesh rendering | React/D3 render (`MapCanvas`) | Export clone | Inside the camera transform, non-interactive |
| Water / background surface | **Export clone** (serialized `<rect>`) | React/D3 render + localStorage | `--map-surface` is a CSS background today and **cannot** reach the export (measured: host CSS is invisible to the clone) |
| Gradient bands | **Export clone** (`<defs><linearGradient>` + `<rect>`) | React/D3 render | Must be inline SVG, never CSS `filter` |
| Title/subtitle/attribution text | Export clone (`<text>`) | React/D3 render + localStorage | Same reason; plus the font must ride inside the subtree |
| Font bytes | Bundled asset (`src/assets/`) → build-time base64 → export clone | — | `src/assets/` is for bytes the **bundler** reads; `public/data/` is for bytes the **app fetches** [VERIFIED: data.md:346-352] |
| Legend geometry + form | Pure module (`src/utils/legend.ts`) | Export clone | Nothing reads `legend.position` raw (Live Invariant 3) |
| Composition persistence V3 | localStorage via `StorageAdapter` | Pure module (normalizers) | Bounds are checked **before** `JSON.parse` |
| Selectable-unit policy (D4-10) | **Build-time script + manifest** | Runtime normalizer (`useGeoData`) + type union | The script *derives* the geojson; editing the geojson alone would fail `data:world:check` |

---

## Standard Stack

### Core — everything Phase 4 needs is already installed

| Library | Version | Purpose in Phase 4 | Why standard here |
|---|---|---|---|
| `mapshaper` | **0.7.48** (devDependency) | `-innerlines` derives the shared-interior-borders layer for `04-04` | Already in `package.json`; already the tool this repo's data pipeline is built around [VERIFIED: package.json devDependencies] |
| `d3` | **7.9.0** (dependency) | `geoPath` renders the mesh `GeometryCollection` with the same projection as the polygons | Already the render engine; a second path generator would be a drift hazard [VERIFIED: package.json] |
| `react` / `react-dom` | 18.3.1 | Panel/HUD surfaces | Existing [VERIFIED] |
| `motion` | 12.40.0 (exact-pinned) | Any panel-width transition work under D4-05 | Existing; do not change the pin [VERIFIED] |
| `vitest` | 4.1.10 | Ramp, contrast, band-cap, storage-V3 unit gates — **`node` environment, no DOM** | Existing [VERIFIED] |
| `@playwright/test` | 1.61.1 | Every pixel/PNG assertion | Existing [VERIFIED] |

### Supporting — already-vendored bytes

| Asset | Current state | Phase 4 change |
|---|---|---|
| `src/assets/inter-latin-variable.woff2` | 48,432 B raw / 64,576 B base64, SHA-256 `c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4`, latin only (`U+0000-00FF, …`), OFL-1.1 [VERIFIED: src/assets/README.md] | **Keep unchanged.** Add a *second* file — see § latin-ext |
| `public/data/world-modern.geojson` | 2,295,448 B, 248 units, 195 selectable [MEASURED: `ls -la`, `npm run data:world:check`] | Property edits only under D4-10; geometry untouched |
| `public/data/world-manifest.json` | 44,054 B; `coreStates` 195 · `nonCoreUnits` 47 · `supplements` 6 [MEASURED] | 12 records change under D4-10 |

### Alternatives Considered

| Instead of | Could use | Tradeoff — and the verdict |
|---|---|---|
| `mapshaper -innerlines` | `topojson-client`'s `topojson.mesh(topo, obj, (a,b) => a !== b)` | Equivalent output, but adds a **runtime-capable** dependency for a build-time job. `mapshaper` is already here. **Reject.** |
| Hand-tuned ramp hexes | ColorBrewer / CARTO sequential schemes | ColorBrewer's 5-class sequential schemes are the cartographic default and are perceptually vetted [ASSUMED — from training, not verified against a live source this session]. But **every step must pass 04-02's own contrast gate**, and ColorBrewer was designed for map fills, not for label-on-fill contrast. **Recommendation: start from a published sequential scheme, then adjust the lightest and darkest steps until the gate passes, and record which steps were moved and why.** |
| `pyftsubset`/fontTools to build one latin+latin-ext woff2 | Two `@font-face` rules with `unicode-range` | **fontTools is not installed** (`python3 -c "import fontTools"` → `ModuleNotFoundError`) and neither is `pyftsubset`/`woff2_compress` [MEASURED]. The two-face approach needs no toolchain and **is proven to work through the export path** [MEASURED — see § latin-ext]. **Take the two-face approach.** |
| A parallel `RampAssignmentMap` beside `ColorMap` | A discriminated union inside `ColorMap` | D4-02 is locked ("stores `{rampId, t}`, not resolved hex"). The union is the faithful reading; see § Ramp Model for the measured blast radius of each. |

**Installation:** *(none)*

```bash
# Phase 4 requires NO new packages. Confirm nothing was added:
git diff --stat package.json package-lock.json   # must be empty at 04-11
```

---

## Package Legitimacy Audit

**Phase 4 installs no external packages.** The legitimacy gate is therefore satisfied by
*absence*, and that absence should be asserted rather than assumed.

| Package | Registry | Age | Downloads | Source repo | Verdict | Disposition |
|---|---|---|---|---|---|---|
| *(none proposed)* | — | — | — | — | — | — |

**Packages removed due to `[SLOP]` verdict:** none — none were proposed.
**Packages flagged as suspicious `[SUS]`:** none.

**Recommended gate for `04-11`:** assert `package.json` dependencies and devDependencies are
byte-identical to the phase-start commit. This is RED-provable by adding a dummy dependency and
watching it fail — a genuine subject, unlike a "we didn't install anything" prose claim.

⚠ If a plan later proposes any package (a colour library, a font subsetter, a PNG decoder), the
Package Legitimacy Gate must be run *then*, and the package must be tagged `[ASSUMED]` unless it is
confirmed via official documentation or Context7 **and** returns `OK` from
`gsd-tools query package-legitimacy check`.

---

## The Export Fidelity Envelope — measured, not assumed

This is the single most important section for the planner. The rasterisation path is:

```
sourceSvg.cloneNode(true)
  → re-assert viewBox "0 0 1080 1080", width/height 540, inline background/colorScheme
  → injectExportFontFace(clone, collectCompositionFonts(clone))   // <style> as FIRST child
  → sanitizeExportClone(clone)                                    // strips semantics, sets strokes
  → isPreservedComposition(clone, expectedShape)                  // camera before legend, transforms intact
  → document.body.appendChild(frame)
  → "data:image/svg+xml," + encodeURIComponent(new XMLSerializer().serializeToString(clone))
  → new Image(); img.src = url                                    // ISOLATED DOCUMENT
  → canvas 1080×1080; fillRect('#FFFFFF'); scale(2); drawImage(img, 0, 0, 540, 540)
  → canvas.toBlob('image/png') → objectURL → <a download>.click() → 100ms handoff
```
[VERIFIED: src/utils/export.ts:388-609]

### What survives — probed in installed Chrome this session

I built each case as a standalone SVG, serialised it with the **exact** shape `export.ts` uses,
loaded it into an `Image`, drew it onto a canvas, and counted ink pixels + sampled specific points.

| Feature | Result | Evidence [MEASURED] |
|---|---|---|
| `<linearGradient>` with `stop-opacity` 1→0, referenced by `fill="url(#band)"` over black | ✅ **survives, direction preserved** | y=20 → `[228,228,228]`, y=100 → `[126,126,126]`, y=180 → `[24,24,24]`, y=190 → `[12,12,12]`. A monotone vertical fade. |
| `<radialGradient>` | ✅ survives | centre `[253,253,253]`, corners `[0,0,0]` |
| Gradient `<defs>` **inside** a `transform="translate(20,20) scale(0.5)"` group, referenced from within | ✅ survives, `url(#…)` resolves | mid `[118,0,136]` (red→blue mix), ink 22,500 = the scaled rect's exact area |
| `<clipPath>` via `clip-path="url(#cp)"` | ✅ survives | ink 8,000 ≈ π·50² = 7,854 |
| `<mask>` via `mask="url(#mk)"` | ✅ survives | ink 20,000 = 200×100 exactly |
| `<use href="#r1">` | ✅ survives | ink 6,400 = 80×80 exactly |
| `fill-opacity="0.5"` on black over white | ✅ survives | every sample `[128,128,128]` |
| `vector-effect="non-scaling-stroke"` **attribute** inside `scale(8)` | ✅ survives | ink 368 vs unpinned control 1,472 — exactly the 8× the pin removes |
| `<text>` with `text-anchor`, `dominant-baseline`, `<tspan dy>` | ✅ survives | ink 1,479 |
| `<text>` with `paint-order="stroke fill"` white halo | ✅ survives | ink 1,481 |
| Inline `<style>` inside the SVG declaring `--local-fill`, consumed by `fill="var(--local-fill)"` | ✅ **resolves** | ink 40,000 (full 200×200 black) |
| `fill="var(--probe-fill)"` reading a **host document** `:root` custom property | ❌ **DROPPED — renders the fallback** | ink 0 |
| `class="hostfill"` styled `fill:#ff00ff` by a **host** stylesheet | ❌ **DROPPED — renders SVG's default black, not magenta** | every sample `[0,0,0]` |
| Inline `style="filter: blur(8px)"` (not external CSS) | ⚠ **does render** | corners `[46,46,46]`/`[57,57,57]` — visibly blurred |
| Data URL of **3,000,269 characters** | ✅ loads | no practical length limit at 3 MB |

**Two conclusions the planner must carry:**

1. **Everything Phase 4 needs is inline-representable and survives.** There is no capability in
   D4-06, D4-07, D4-08, D4-12, or D4-16 that requires a technique the raster path drops.
2. **The only things that vanish are the things that come from the host document** — a class rule,
   a `var()` pointing at a host token. This confirms pitfall P-3 in `coding-rules/export.md:344-347`
   *("inside the isolated export document the `var()` would resolve to nothing at all")* and is
   exactly why D4-16 says the band colour must be serialized state.

**On the inline `filter` result — report, do not act on.** `Design.md § 8` bans `filter`/
`box-shadow`/`mask`/`clip-path` on exported content, and `uiContract.test.ts`'s
`EXPORT_UNSAFE_PROPERTIES` gate enforces it **for stylesheet-authored rules**
[VERIFIED: uiContract.test.ts:1224-1233]. My measurement shows an *inline* filter does rasterise in
Chrome 151, so the ban's stated reason ("renders not at all") is precise about *external* CSS but
would be an over-claim about inline styles. **The contract still governs — do not use a filter for
bands.** SVG gradients are both compliant and measured-safe. Flagged here so nobody "discovers" the
inline case later and treats the whole rule as unsound.

### What `sanitizeExportClone` does to strokes — the 04-05 blocker

```ts
const SCENE_PATH_SELECTOR = 'path.scene-path,path.country-path';
const EXPORT_BORDER_WIDTH = '0.75';
// …
svg.querySelectorAll<SVGPathElement>(SCENE_PATH_SELECTOR).forEach((path) => {
  path.setAttribute('stroke', DEFAULT_BORDER_COLOR);
  path.setAttribute('stroke-width', EXPORT_BORDER_WIDTH);
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  path.style.stroke = DEFAULT_BORDER_COLOR;
  path.style.strokeWidth = EXPORT_BORDER_WIDTH;
  …
});
```
[VERIFIED: src/utils/export.ts:21, 34, 334-356] with `DEFAULT_BORDER_COLOR = '#000000'`
[VERIFIED: src/constants/colors.ts:8].

**Read this literally: the exporter re-paints a black 0.75 stroke onto every country path,
regardless of what the editor rendered.** D4-08's "coastlines at `none`" and D4-05's
"coastlines render effectively unstroked" are therefore **impossible in the PNG** until this
function changes. The editor would show unstroked coasts and the download would ship black ones —
the exact "quieter failure" class `coding-rules/export.md` warns about.

This is not a bug in the current code: the normalization exists because wrapped date-line repeats
must not ship a 2px selection border [VERIFIED: coding-rules/export.md:228-233]. **04-05 must
replace, not delete, it** — the new rule has to still neutralise interaction state on every
`path.scene-path` while letting the composition's chosen coastline weight through. The RED probe is
obvious and cheap: set coastline weight to `none`, export, and assert the coastline sample has no
dark pixel; today that assertion fails, which is exactly what makes it a valid gate.

### Structural room for new layers

The canonical source shape is:

```
div.map-export-source
└── svg.map-canvas
    ├── g[data-layer="camera"]      ← must come BEFORE the legend
    │   ├── g[data-layer="outgoing-scenes"]
    │   └── g[data-layer="countries"]
    └── g[data-layer="legend"]
```
[VERIFIED: coding-rules/export.md:153-160; matches src/components/MapCanvas.tsx:835-853 verbatim —
`<div className="map-export-source">`, `<svg className="map-canvas" viewBox={…1080…}>`,
`<g ref={cameraLayerRef} data-layer="camera">`, `<g data-layer="outgoing-scenes">`,
`<g data-layer="countries">`, `{legendSlot}`].

`isPreservedComposition` only compares the *indices* of the camera and legend children and their
`transform` attributes [VERIFIED: src/utils/export.ts:359-386]. **Adding new sibling layers is
structurally permitted** as long as camera still precedes legend. So the Phase 4 layer stack can be:

```
svg.map-canvas
├── style                          ← injected @font-face(s), first child (existing)
├── rect[data-layer="surface"]     ← NEW: water/background, full 1080 viewBox, outside the camera
├── defs[data-layer="paint"]       ← NEW: band gradients (ids must be referenced to survive id-strip)
├── g[data-layer="camera"]
│   ├── g[data-layer="outgoing-scenes"]
│   ├── g[data-layer="countries"]
│   └── g[data-layer="borders"]    ← NEW: interior mesh, non-interactive, inside the camera
├── g[data-layer="bands"]          ← NEW: top/bottom gradient rects, outside the camera
├── g[data-layer="legend"]
└── g[data-layer="text"]           ← NEW: title/subtitle/attribution, outside the camera
```

Three constraints on that stack, each verified:

- **Ids on the gradients must be *referenced*** — `sanitizeExportClone` strips `id` unless
  `collectReferencedIds` found a `url(#…)` or `href="#…"` pointing at it, and it scans `<style>`
  text too [VERIFIED: src/utils/export.ts:185-236, 311-323]. A gradient referenced by
  `fill="url(#band-top)"` is safe. A gradient referenced only from an *external* stylesheet is not.
- **Editor-only affordances (band drag handles, text bounding boxes) must carry
  `data-editor-only`**, which the sanitizer removes wholesale
  [VERIFIED: src/utils/export.ts:28, 299-301].
- **The band/text layers must sit outside `[data-layer="camera"]`** or they will pan and zoom with
  the map. The legend already sits outside it, which is the working precedent.

---

## Ramp Model (`04-01` / `04-02`)

### The pure-module shape

D4-01 is a bounded, ordered set. The node-testable shape:

```ts
export interface Ramp {
  readonly id: RampId;              // stable, persisted
  readonly name: string;            // creator-facing
  readonly shades: readonly string[]; // light → dark, canonical uppercase #RRGGBB
}

export function shadeForIndex(ramp: Ramp, index: number, count: number): string;
export function shadeForValue(ramp: Ramp, t: number): string;  // t in [0,1], snapped to nearest step
```

**Canonical hex form matters.** `normalizeColor` already returns `#RRGGBB` uppercase, and
`getCanonicalActiveColors` / `normalizeLegendEntries` compare on that canonical value
[VERIFIED: src/utils/colors.ts:28-55; src/utils/legend.ts:147-166]. Every ramp shade must already be
in that form, or the legend will dedupe two spellings of the same colour as two entries.

### Order monotonicity — how to make the gate RED-provable

The roadmap asks for "shuffle a ramp → RED". A shuffle test can be green by accident (a 2-element
shuffle has a 50% chance of being the identity). Two better subjects, both `node`-testable:

```ts
// Subject 1: lightness is strictly monotone across the declared order.
// Derive from the SAME relativeLuminance used by the contrast gate — one implementation, not two.
for (const ramp of RAMPS) {
  const lums = ramp.shades.map((hex) => relativeLuminance(parseHexColor(hex)));
  for (let i = 1; i < lums.length; i += 1) {
    expect(lums[i], `${ramp.id} step ${i} is not darker than step ${i - 1}`).toBeLessThan(lums[i - 1]);
  }
  expect(lums.length).toBe(ramp.shades.length);   // literal-derived, never a.length * b.length
}

// Subject 2: shadeForValue is order-preserving over its own domain.
const probes = [0, 0.25, 0.5, 0.75, 1];
const resolved = probes.map((t) => shadeForValue(ramp, t));
expect(new Set(resolved).size).toBeGreaterThan(1);  // content floor: not all one shade
expect(resolved).toStrictEqual([...resolved].sort(byDescendingLuminance));
```

**RED procedure (scratchpad copy-back, never `git checkout --`):** copy the ramp constants file to
the scratchpad, swap steps 1 and 3 of one ramp in place, run `npm test`, record the failure
message, restore by `cp` back, confirm with `git status`.

Note the two anti-patterns this deliberately avoids, both of which this repo has shipped before: a
row count written as `a.length * b.length` (green at zero rows) and a probe that only asserts
equality [VERIFIED: general.md:199-210, CLAUDE.md § Guardrails].

### The contrast gate — reuse, don't re-derive

`relativeLuminance` and `contrastRatio` **already exist in this repository**, verbatim:

```ts
/** WCAG 2.2 relative luminance. */
function relativeLuminance([red, green, blue]: readonly [number, number, number]): number {
  const channel = (raw: number): number => {
    const srgb = raw / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground: string, background: string): number {
  // …
  return (lighter + 0.05) / (darker + 0.05);
}
```
[VERIFIED: src/styles/uiContract.test.ts:266-296 — quoted verbatim]

They are **private to a test file** and the only consumers are `uiContract.test.ts:1385` and
`:2045`. `WCAG_AA_BODY_RATIO = 4.5` is declared at `uiContract.test.ts:1920` [VERIFIED].

**Recommendation:** extract `parseHexColor` / `relativeLuminance` / `contrastRatio` into a new pure
module (`src/utils/contrast.ts`) with its own unit test, and have **both** `uiContract.test.ts` and
`04-02`'s ramp gate import it. Two independent copies of luminance math is precisely the drift the
`LEGEND_CHARACTERS_PER_LINE` / `LABEL_CHARACTERS_PER_LINE` duplication already cost this project
[CITED: Design.md § 4, "hold the same table under two names and must collapse to one exported
constant"].

**Which threshold applies to what — state it explicitly in the plan:**

| Pairing | WCAG SC | Threshold | Note |
|---|---|---|---|
| Legend label text on the map surface | 1.4.3 Contrast (Minimum), normal text | **4.5:1** | `uiContract.test.ts` already uses 4.5 for body text [VERIFIED: :1920] |
| Legend label text ≥ 18.66px bold / ≥ 24px | 1.4.3, large text | 3:1 | Legend text renders at 24/32/40 **user units** in a 1080 viewBox [VERIFIED: LegendOverlay.tsx:35-39] — at the PNG's 1:1 scale these *are* large text, but that reasoning is fragile at other display sizes |
| A value label sitting **on** a ramp shade | 1.4.3 | 4.5:1 (normal) | This is Phase 5's `05-06`, not Phase 4 — but 04-02's gate is what it will import |
| Adjacent ramp steps distinguishable from each other | 1.4.11 Non-text Contrast | 3:1 | ⚠ **Do not apply this naively.** A 5-step sequential ramp with 3:1 between *every* adjacent pair cannot fit inside the sRGB gamut for most hues [ASSUMED]. Sequential ramps are legitimately low-contrast between neighbours; the mitigation is the legend, not the ramp. |

**The honest recommendation:** gate **label-on-shade at 4.5:1** for whichever label colour the
renderer will actually pick, and record adjacent-step separation as a *measurement* in the plan
rather than as a threshold. A gate that forces 3:1 between neighbours will either fail on arrival
or force ramps that are no longer sequential — and a gate that is red on arrival gets loosened
rather than obeyed [CITED: uiContract.test.ts:1346-1350, the same reasoning applied to the resize-
observer owner set].

**Automatic light/dark label selection.** The standard technique is: pick white or near-black,
whichever yields the higher `contrastRatio` against the shade. That makes the gate assert
`max(contrastRatio(shade,'#FFFFFF'), contrastRatio(shade, DARK_INK)) >= 4.5` per shade — a bounded
set of exactly `Σ ramp.shades.length` assertions, which D4-01's fixed step count is what makes
possible.

### D4-02's blast radius — measured, so the planner sizes `04-02` correctly

`ColorMap` is a flat string map today:

```ts
export type CountryId = string;
export type ColorMap = Readonly<Record<CountryId, string>>;
export type ColorHistory = ReadonlyArray<ColorMap>;
```
[VERIFIED: src/types/map.ts:3-5 — quoted verbatim]

Introducing a second value shape touches, at minimum:

| Site | What breaks | Path |
|---|---|---|
| `normalizeColorMap` | `typeof rawColor !== 'string'` → repairs away every ramp assignment | src/utils/storage.ts:255 [VERIFIED] |
| `getEffectiveCountryColor` | `typeof rawColor !== 'string'` → returns `DEFAULT_COLOR` | src/utils/colors.ts:76-78 [VERIFIED] |
| `canonicalizeColorMap`, `applyColorToCountries`, `areColorMapsEqual`, `hasEffectiveColorChange` | all assume `string` | src/utils/colors.ts:84-160 [VERIFIED] |
| `getEffectiveSceneColors` → `reconcileLegend` | legend entries are keyed and deduped **by hex**; `LegendEntryState.color: string` | src/utils/scene.ts:147-153; src/utils/legend.ts:150-154, 289-315 [VERIFIED] |
| Undo/redo history | `ColorHistory = ReadonlyArray<ColorMap>` — every snapshot carries the new shape | src/types/map.ts:5 [VERIFIED] |
| `isPresetColor` | compares against `COLOR_PRESETS` values, which D4-01 replaces | src/utils/colors.ts:58-61 [VERIFIED] |

**Two implementation shapes, both satisfying D4-02:**

- **(A) Discriminated union in `ColorMap`** — `Record<CountryId, string | { rampId: RampId; t: number }>`.
  Faithful to "not resolved hex". Requires a `resolveColorValue(value, ramps): string` chokepoint
  and touches all six sites above. Highest fidelity, highest cost.
- **(B) A separate `rampAssignments` map in the composition**, with `ColorMap` continuing to hold
  the resolved hex. Legend, history, storage bounds, and export are untouched. But this creates two
  sources of truth that can disagree — the exact drift hazard `general.md` names — and it
  contradicts the letter of D4-02 ("hex is resolved at render time").

**Recommendation: (A), with a single `resolveColorValue` chokepoint**, mirroring how
`resolveLegendPosition` is "the only reader" of `legend.position` (Live Invariant 3). The
chokepoint is what makes shape (A) safe; without it, six call sites each grow their own branch.
Say so in `04-01` so `04-09`'s V3 migration is designed against the union from the start rather
than retrofitted.

⚠ **A collision the planner should decide up front:** two different ramps can contain the same hex.
`reconcileLegend` dedupes entries by hex and `normalizeLegendEntries` rejects a duplicate colour
outright (`colors.has(colorResult.value)` → `isRepaired = true`)
[VERIFIED: src/utils/storage.ts:384-388]. If two ramps share a shade, the legend collapses them.
Either guarantee ramp shade-sets are globally disjoint (checkable in the same `04-01` unit gate) or
re-key legend entries off `{rampId, index}`. **Not resolved here — flag it in `04-01`/`04-08`.**

---

## Interior-Border Mesh (`04-04`) — derivation measured

### `mapshaper` is present and `-innerlines` does exactly the job

```bash
npx mapshaper --version                     # → 0.7.48   [MEASURED]
npx mapshaper public/data/world-modern.geojson -innerlines \
  -o format=geojson precision=0.0001 world-innerlines.geojson
```

| Property | Value | Source |
|---|---|---|
| Runtime | **0.22 s** | [MEASURED] |
| Output root type | `GeometryCollection` (not `FeatureCollection`) | [MEASURED] |
| Geometries | **327 `LineString`s** | [MEASURED] |
| Coordinate points | **19,624** | [MEASURED] |
| Bytes, `precision=0.0001` | **366,767** | [MEASURED] |
| Bytes, no precision flag | **444,795** | [MEASURED] |
| Bytes, as a `FeatureCollection` (via `-each "kind='interior'"`) | **387,365** | [MEASURED] |
| Determinism across two runs | **identical SHA-256** `72939b8f1bb20bae624a429c4c76119cb0687a05712271f695804d4d8f093e41` | [MEASURED] |
| Sensitivity to feature **properties** | **none** — flipping `KOS.isSelectable`/`colorOwnerId` and re-deriving yields the **same** SHA-256 | [MEASURED] |
| Includes the Kosovo boundary | yes — 71 mesh points inside the `20–21.5°E, 41.8–43.3°N` box | [MEASURED] |

**Recommendation:** emit with `precision=0.0001` (≈11 m at the equator, far finer than a 1080px
world render can express) for 366,767 B, and store as `public/data/world-borders-modern.geojson`.
That is ~16 % of the polygon asset's 2,295,448 B and needs no simplification.

### The hash-binding decision the roadmap did not settle

The roadmap says *"hash-recorded in `world-manifest.json` beside the polygon asset"*. There is a
trap: **D4-10 changes `world-modern.geojson`'s bytes but not the mesh's.** [MEASURED — proven
above.] So binding the mesh to the polygon file's hash means D4-10 invalidates a binding that has
not actually drifted.

Three options, ranked:

1. **Bind the mesh to its own SHA-256 and re-derive it in `--check`.** `prepareWorldData.mjs`
   already re-derives the polygon asset from source and compares byte-for-byte
   (`canonicalBytes.equals(committedBytes)`) [VERIFIED: scripts/prepareWorldData.mjs:413-419]. Do
   the same for the mesh: run mapshaper, compare bytes, fail on any difference. This makes the
   check *derivational*, not merely a hash lookup — it fails on a drifted polygon asset **and** a
   tampered mesh. **Recommended.**
2. Record a mesh `sha256` in the manifest and compare only the committed file's digest. Cheaper,
   but cannot detect "the mesh no longer matches the geometry".
3. Bind mesh ↔ polygon by a *geometry-only* digest. Correct but adds a bespoke canonicalisation
   nobody else in the repo maintains. **Reject.**

**The `--check` step must shell out to mapshaper.** `prepareWorldData.mjs` is plain Node ESM with
no mapshaper import today [VERIFIED: scripts/prepareWorldData.mjs:1-6 — imports only
`node:buffer/crypto/fs/process/path/url`]. mapshaper exposes a Node API (`mapshaper.applyCommands`)
[ASSUMED — not verified in this session]; if that proves awkward, `child_process` invoking the
local `node_modules/.bin/mapshaper` is deterministic and adequate. **The plan should verify the
Node-API shape before committing to it.**

### RED-proving the mesh gate on its own subject

`npm run data:world:check` currently **passes in 20.45 s** and prints
`World GeoJSON check passed: 248 units and 195 selectable core states.` [MEASURED].

The gate mutation that makes it a real gate: copy `world-borders-modern.geojson` to the scratchpad,
change **one coordinate digit** in place, run the check, record the failure, `cp` back, confirm with
`git status`. A second mutation worth running: delete one `LineString` and confirm the check reports
the count change rather than passing on 326.

⚠ **`npm run data:world:check` requires network access.** `readSource` fetches the two Natural Earth
GeoJSONs from `raw.githubusercontent.com` unless `--base-source`/`--supplement-source` name local
paths [VERIFIED: scripts/prepareWorldData.mjs:69-79, 377-398]. This is *build-time*, so it does not
violate the no-runtime-third-party-request rule — but it means the gate cannot run offline, and the
20 s is dominated by that download. If `04-04` makes the check longer, note the cost.

### Rendering the mesh

D3's `geoPath` accepts a `GeometryCollection` directly, so `MapCanvas` can render the mesh with the
same `createWorldProjection()` the polygons use [VERIFIED: src/components/MapCanvas.tsx:541-542 uses
`createWorldProjection()` + `geoPath(projection)`]. Three requirements:

- The mesh layer goes **inside** `[data-layer="camera"]` and **after** `[data-layer="countries"]`
  so it draws over the fills.
- It must be **non-interactive**: `pointer-events: none` plus `aria-hidden="true"`, and it must not
  carry `scene-path` or `country-path` classes — otherwise `sanitizeExportClone`'s stroke
  normaliser will overwrite its weight, and `EXPORTED_PATH_CLASSES` will demand it be listed
  [VERIFIED: src/styles/uiContract.test.ts:1217-1222].
- It **must** carry `vector-effect="non-scaling-stroke"` as an attribute (measured to survive), or a
  creator framed at zoom 8 downloads 8×-thick borders — the exact defect
  `coding-rules/export.md:235-243` records.

⚠ **The date-line problem.** `MapCanvas` renders `±360°`-offset wrapped repeats of every polygon
(`WrappedScenePath` with `transform="translate(${path.offsetX} 0)"`)
[VERIFIED: src/components/MapCanvas.tsx:526-527, 566]. **The mesh needs the same wrapping**, or a
Pacific-framed composition will show fills with no interior borders on the wrapped copies. This is
not in the roadmap's `04-05` description. **Name it in the plan.**

⚠ **The hover/selection carrier is unresolved and CONTEXT says so.** `src/constants/colors.ts:3-7`
records verbatim: *"Country boundaries are black at every state. Once the resting border is black,
hover and selection cannot differentiate by going darker - they differentiate by weight, and the CSS
stroke-widths carry that hierarchy."* [VERIFIED] If coastline weight goes to `none`, a coastal
country loses its only feedback carrier. The mesh cannot supply it either — the mesh is shared
between two countries, so weighting a mesh segment highlights *both*. The realistic options are a
duplicate per-country highlight path (the roadmap's own alternative) or a fill-tint on hover.
**Unresolved. `04-05` must name and decide it.**

---

## Water / Background Surface (`04-03`)

### Why `--map-surface` cannot do this job

```css
--map-surface: #ffffff;
```
[VERIFIED: src/styles/theme.css:254 — quoted verbatim]

Its only consumers are CSS `background` declarations on the canvas element
[VERIFIED: src/styles/MapCanvas.css:132, 168, 394 — `background: var(--map-surface);`]. It is a
**mode-invariant token in the unconditioned `:root`**, guarded by Live Invariant 9 and by
`uiContract.test.ts` assertions 4/5, and pinned to `'#ffffff'` in `themeTokens.test.ts:207`
[VERIFIED].

**Measured fact:** a host stylesheet's declaration reaches nothing inside the export clone. So
`--map-surface` paints the *editor's* canvas background and contributes **zero** pixels to the PNG.
Today the PNG's white comes from three other places entirely.

### The three-layer white contract that 04-03 must widen

```ts
const EXPORT_BACKGROUND_COLOR = '#FFFFFF';
// … in createExportFrame:
exportFrame.style.background = EXPORT_BACKGROUND_COLOR;
clonedNode.style.background = EXPORT_BACKGROUND_COLOR;
// … in exportMapPng:
renderingContext.fillStyle = EXPORT_BACKGROUND_COLOR;
renderingContext.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
```
[VERIFIED: src/utils/export.ts:14, 398-399, 414-415, 557-558]

And `coding-rules/export.md:330-334` states: *"Always export with an opaque white background
(`#FFFFFF`). Three layers, each deliberate… Do not 'simplify' one away because the others cover it."*
[VERIFIED]

**Recommended shape, which keeps all three layers intact:**

- Keep the canvas `fillRect('#FFFFFF')`, the frame's inline white, and the clone's inline white
  **exactly as they are.** They are the opacity floor — the guarantee that the PNG is never
  transparent.
- Paint the creator's water as a **new `<rect data-layer="surface" x=0 y=0 width=1080 height=1080>`
  with an inline `fill`**, as a direct child of `svg.map-canvas`, *before* `[data-layer="camera"]`.
  Because it is inline and inside the serialised subtree, it survives. Because it is outside the
  camera, it does not pan or zoom.
- Amend `coding-rules/export.md` § Background Color Contract in the same commit: the three layers
  now guarantee **opacity**, and the surface rect carries **colour**.

**Storage seam.** `VisibleCompositionSettings` is a literal-typed single field:

```ts
export interface VisibleCompositionSettings {
  readonly backgroundColor: '#FFFFFF';
}
```
[VERIFIED: src/types/composition.ts:180-182 — quoted verbatim]

and `normalizeComposition` requires `value.settings.backgroundColor === '#FFFFFF'` or it flags the
whole record repaired [VERIFIED: src/utils/storage.ts:532-534]. `04-03`/`04-09` must widen both the
type and the validator, and a V2 record's `'#FFFFFF'` must migrate to the new default without
producing a spurious `composition-repaired` warning — otherwise every reopened V2 map raises a
corruption toast.

**Which presets ship is OPEN QUESTION 1.** Only the default is settled: **white**, from the owner's
reference. The roadmap straw man (paper white / cool tint / soft grey / light blue) *"was never
confirmed"* [CITED: 04-CONTEXT.md § Open Questions]. Do not let a plan silently adopt the straw man.

**Gate.** Export, decode the PNG, and sample a pixel that is *certainly ocean* at the default world
camera (e.g. mid-Pacific). Assert it equals the chosen preset. RED-prove by pinning the wrong
preset. Add a discrimination control in the same test: the same sample against a *different* preset
must differ, or the assertion is satisfiable by any two identical whites.

---

## Gradient Bands (`04-06`) — measured survival + a gate that fails both ways

**The technique is proven.** A `<linearGradient>` with `stop-opacity: 1 → 0` referenced by
`fill="url(#band-top)"` rasterises with its direction intact [MEASURED — samples at y=20/100/180/190
gave 228 / 126 / 24 / 12 over black].

### The band colour must be serialized (D4-16)

Since a host `var()` renders as nothing [MEASURED], the band's `stop-color` must be an **inline
attribute value computed from the current surface colour** at render time. Two working shapes:

- **Inline literal** — `<stop stop-color="#F4F1EA" stop-opacity="1"/>`. Simplest; the value is
  derived state written directly into the attribute. **Recommended.**
- **Subtree-declared custom property** — a `<style>` inside the SVG declaring `--surface` and
  `stop-color="var(--surface)"`. **This does work** [MEASURED: ink 40,000] but adds a second
  `<style>` beside the injected font `<style>`, which the clone contract discusses by name. The
  literal is less clever and less fragile.

### The 1/7 cap

`EXPORT_SIZE = 1080` and `MAP_VIEWBOX_SIZE = 1080` [VERIFIED: src/constants/config.ts]. 1080/7 =
**154.28…** — not an integer. Decide and write down whether the cap is `Math.floor(1080/7) = 154`
or the exact fraction; a plan that says "1/7" and a test that says "154" will disagree the first
time someone changes the viewBox. Prefer a named constant derived from `MAP_VIEWBOX_SIZE`.

Cap gate (pure unit, `node`): request 1/5 of the square → expect the clamped value; RED-prove by
deleting the clamp. Do **not** write the expected value as an expression that recomputes the clamp —
that is the self-comparing gate this repo already shipped once [CITED: general.md:203-205].

### The PNG gate that fails on removal AND on inversion

D4-14 asks for a property assertion. A single "band pixels are lighter" check passes if the gradient
is inverted (bottom-anchored), because *some* band pixels are still lighter. Assert the **ordering
of three samples along the band axis**, plus a control:

```ts
// All three x-coordinates identical; only y varies. Sample inside the top band's extent.
const [near, mid, far] = await samplePngColumn(page, bytes, X, [8, 60, 140]);
expect(luminance(near)).toBeGreaterThan(luminance(mid));   // fails if the gradient is inverted
expect(luminance(mid)).toBeGreaterThan(luminance(far));    // fails if the band is a flat rect
expect(luminance(far)).toBeLessThan(luminance(near) - MIN_BAND_DELTA);  // fails if the band is absent
// Discrimination control: the same column with bands off must be flat.
expect(Math.abs(luminance(offNear) - luminance(offFar))).toBeLessThan(NOISE_FLOOR);
```

`MIN_BAND_DELTA` and `NOISE_FLOOR` must be **derived from a measurement recorded in the same
change**, not guessed — the repo's own rule after a `<= 1px` tolerance passed against its own 1px
probe [CITED: CLAUDE.md § Guardrails].

⚠ **The band is invisible on white water, by design** (D4-16, and the reference has no visible
bands). A gate that samples over white water will measure nothing. **The gate composition must use
a non-white surface**, or use a sample column that crosses dark land. State which, in the plan.

**Z-order vs. the legend is Claude's discretion and unresolved.** D4-13 puts the legend below the
title block on the left edge — i.e. potentially inside the top band's extent. Decide band-under-
legend (recommended: bands paint first, legend over) and gate it with a pixel sample where they
overlap.

---

## Text Tools (`04-07`)

### What is measured to work

`<text>` with `text-anchor`, `dominant-baseline`, `<tspan dy>`, and `paint-order="stroke fill"` all
rasterise [MEASURED]. An inline base64 `@font-face` resolves inside SVG-as-image — proven in
Phase 3 by `tests/e2e/spike-export-font.spec.ts` and re-observed here [MEASURED: `embeddedAscii`
ink 2,167 with the real vendored Inter bytes].

### The font registry needs one entry per family, not a new mechanism

```ts
const EXPORT_FONT_FACE_BUILDERS: ReadonlyMap<string, () => string> = new Map([
  [EXPORT_FONT_FAMILY, buildExportFontFaceCss],
]);
```
[VERIFIED: src/utils/export.ts:82-84 — quoted verbatim]

`collectCompositionFonts` walks the clone for `font-family` **attributes and inline styles**,
excludes generic keywords, and returns distinct named families
[VERIFIED: src/utils/export.ts:105-146]. `coding-rules/export.md:118-124` states the design intent
explicitly: *"Phase 4's text tools add registry entries; they do not re-open the rasterisation
path."* [VERIFIED]

**Recommendation for the text font stack (Claude's discretion in CONTEXT):** use **Inter only**.
Rationale, all verified: it is already vendored, already registered, already what the legend names,
and its bytes are already SHA-256-recorded. A second family means a second vendored woff2, a second
licence record, a second README row, and roughly a second +65 KB in the serialised SVG. The type
roles in `Design.md § 4` are all Inter. **Adding a display face is a real design decision the owner
has not made — do not make it inside a plan.**

⚠ **A named family the registry does not know renders as fallback, silently.** If a creator-facing
control ever offers a font, `collectCompositionFonts` will report the family, `injectExportFontFace`
will find no builder, and the export will fall back with no error. If a font picker ever ships, the
control's option list must be derived from `EXPORT_FONT_FACE_BUILDERS.keys()`, not from a separate
list.

### The overflow refusal path

The roadmap asks for "a refusal path for text overflowing the square (mirrors legend overflow
blocking)". The existing machinery to mirror:

- `LEGEND_LABEL_FIT_MESSAGE` / `LEGEND_OVERFLOW_MESSAGE` and `getLegendBlockingMessage`
  [VERIFIED: src/utils/legend.ts:640-669]
- `ExportFailureReason = 'source-not-found' | 'invalid-composition' | 'capture-failed' |
  'invalid-dimensions' | 'encoding-failed'` [VERIFIED: src/types/ui.ts:89-94 — quoted verbatim]
- The transaction reads the legend blocker **before** taking a camera lease, and a synchronous
  refusal is never offered a retry [VERIFIED: coding-rules/export.md:203-210, 276-282]

A text-overflow refusal is the **same class**: decided synchronously, unfixable by retry, needs its
own creator-facing message on the `ToastRegion` allowlist, and must never say "Refresh the page"
[VERIFIED: coding-rules/export.md:199-201]. Note the allowlist is **pinned by hard counts** in
`uiContract.test.ts` assertion 23 (`it('pins the allowlist entry counts as hard numbers')`)
[VERIFIED: :1109-1128] — adding a message moves those numbers and must be done deliberately.

⚠ **Text measurement without a DOM.** Vitest is `node`-only, so the overflow bound must be a
*character-count* rule derived from a worst-case advance width — exactly the discipline
`LEGEND_CHARACTERS_PER_LINE` already uses, with its derivation recorded in a comment
[VERIFIED: src/utils/legend.ts:69-92: *"the widest common character is `W` at 1.0202em (24.484px @
24px…)"*]. **Reuse that derivation method and cite the same measurement**, or re-measure in Chrome
and record the new number. Do not invent a bound.

⚠ **F-1 interaction, recorded not folded.** `04-08` rewrites the legend renderer, which makes the
measurement F-1's 14-char bound came from obsolete [CITED: 04-CONTEXT.md § Deferred]. If `04-07`
and `04-08` both derive from `LEGEND_CHARACTERS_PER_LINE`, whoever moves it must move both.

---

## latin-ext (D4-15) — the two-face answer

### Current state, verbatim

| Field | Value |
|---|---|
| Subset | **latin only** — `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD` |
| Byte size | **48,432** |
| SHA-256 | `c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4` |
| Base64-inflated | **64,576** |
| Licence | SIL Open Font License 1.1 |
[VERIFIED: src/assets/README.md — quoted verbatim from the asset table]

Measured cost of closing the gap, from the same file [VERIFIED: src/assets/README.md § Measured cost]:

| Option | Raw | Base64 | Coverage |
|---|---|---|---|
| Vendored today — Google `latin` | 48,432 | 64,576 | latin-1 + common punctuation |
| Add Google `latin-ext` as a **second** file | +85,272 | +113,696 | adds `U+0100-02BA`, `U+1E00-1E9F`, `U+2C60-2C7F`, … |
| Replace with upstream `InterVariable.woff2` | 352,240 | 469,654 | full — also Greek, Cyrillic, Vietnamese (unwanted) |

The README also records: *"Google Fonts always splits by unicode-range, so a single file covering
latin **and** latin-ext is not obtainable from it; producing one needs a subsetting toolchain
(`fonttools`/`pyftsubset`), which is not installed and was not added."* [VERIFIED]

### That toolchain is still absent — and is not needed

```
which pyftsubset  → not found
which fonttools   → not found
which woff2_compress → not found
python3 -c "import fontTools" → ModuleNotFoundError: No module named 'fontTools'
```
[MEASURED]

**Two `@font-face` rules for the same family, each with its own `unicode-range`, parse and render
correctly through the export path.** [MEASURED: a two-face inline `<style>` produced ink 2,167 —
byte-identical ink to the single-face control — at a serialised URL length of 137,987 chars.]

**Recommendation:** vendor Google's `latin-ext` block as a **second** file
(`src/assets/inter-latin-ext-variable.woff2`) and make `buildExportFontFaceCss()` return **both**
`@font-face` rules concatenated. This means:

- **No change to `EXPORT_FONT_FACE_BUILDERS`** — the registry is family→builder, and one family can
  legitimately emit two faces [VERIFIED: src/utils/export.ts:82-84].
- **No change to the rasterisation path.**
- `theme.css`'s `@font-face` gains a matching second block, or the *editor* still falls back
  mid-string while the export does not — a new and confusing asymmetry
  [VERIFIED: src/styles/theme.css:41-50 shows the single latin face with its `unicode-range`].
- `src/assets/README.md` gains a **second asset row** with its own byte size, SHA-256, provenance
  URLs, and licence. The existing row's SHA-256 is unchanged and must not be rewritten.

### Always inline, or conditionally? — answering the CONTEXT discretion item

**Always inline.** Reasons, in order of weight:

1. `src/utils/export.ts` is described in `CLAUDE.md` as *"the most safety-critical file in the
   repo"*, and a content-dependent branch there makes export non-deterministic.
2. **The saving is zero where it matters.** The base64 rides in the intermediate SVG, not the PNG —
   D4-15 corrects the Phase 3 framing on this point, and the correction is right: `drawImage`
   rasterises; the PNG encoder never sees the font bytes.
3. **Size is not a constraint.** A 3,000,269-character data URL loaded fine in installed Chrome
   [MEASURED]. Latin + latin-ext base64 is ~178 KB; after `encodeURIComponent` roughly 190 KB. Two
   orders of magnitude of headroom.

⚠ **The one honest caveat:** `collectCompositionFonts` is *already* conditional at the family level
— it only embeds families the composition references. That is a different, safe conditionality
(structural, not content-sniffing) and should stay.

⚠ **Nobody has ever verified a latin-ext diacritic export on this machine.** It is one of the nine
never-performed Phase 3 UAT cells [VERIFIED: STATE.md:66]. `04-07` or `04-11` should perform it,
and it must be recorded as performed *in Phase 4* — it cannot be inherited.

---

## D4-10: Measured Blast Radius

**This is the largest hidden cost in the phase, and it is not a data edit.**

### What the manifest actually holds, verbatim

```json
{"id":"KOS","name":"Kosovo","sourceId":"KOS","sourceType":"Disputed","parentCoreId":null,"isSelectable":false,"colorPolicy":"neutral"}
{"id":"GIB","name":"Gibraltar","sourceId":"GIB","sourceType":"Disputed","parentCoreId":null,"isSelectable":false,"colorPolicy":"neutral"}
```
[VERIFIED: public/data/world-manifest.json, read this session]

**Eleven of the twelve are in `nonCoreUnits`; `GIB` alone is in `supplements`** [MEASURED: 11 + 1].
`policy` reads verbatim:

```json
"coreDefinition":"193 UN member states plus the Holy See and State of Palestine",
"coreStateCount":195,"runtimeUnitCount":248,"coreSelectable":true,"nonCoreSelectable":false,
"neutralUnits":"Disputed, indeterminate, and ambiguous associated units remain visible, neutral, and non-selectable."
```
[VERIFIED: public/data/world-manifest.json]

### The twelve touch points

| # | File | What blocks / changes | Evidence |
|---|---|---|---|
| 1 | `public/data/world-manifest.json` | 12 records: `isSelectable`, `colorPolicy`; plus `policy.nonCoreSelectable` and `policy.neutralUnits` prose | [VERIFIED — read] |
| 2 | `public/data/world-modern.geojson` | 12 features: `colorOwnerId`, `isSelectable` | [VERIFIED: prepareWorldData.mjs:252-262 writes exactly these] |
| 3 | `scripts/prepareWorldData.mjs` `createRuntimeFeature` | **throws** on a non-core record with `isSelectable !== false`: `if (record.isSelectable !== false) throw new Error(\`Non-core world unit ${record.id} must be non-selectable.\`)` | [VERIFIED: :243-245] |
| 4 | same, `createRuntimeFeature` | **throws** on policy mismatch: `const expectedPolicy = parentCoreId === null ? 'neutral' : 'inherit-parent'` | [VERIFIED: :246-249] |
| 5 | same, `validateRuntimeFeatures` | selectable requires `coreIds.has(feature.id) && colorOwnerId === feature.id`, else throws `Selectable world unit … does not match core policy` | [VERIFIED: :295-299] |
| 6 | same, `validateRuntimeFeatures` | `if (selectableCount !== EXPECTED_CORE_COUNT) throw` with `const EXPECTED_CORE_COUNT = 195;` | [VERIFIED: :23, :308-310] |
| 7 | same, `createCanonicalBytes` | rejects a manifest whose `policy.coreStateCount !== 195` or `policy.nonCoreSelectable !== false` | [VERIFIED: :313-322] |
| 8 | same, `run()` | success string `'World GeoJSON check passed: 248 units and 195 selectable core states.'` | [VERIFIED: :420-422; MEASURED as the actual output] |
| 9 | `src/hooks/useGeoData.ts` `readNonCoreUnit` | **rejects** the record: `candidate.isSelectable !== false` → `return null`; and derives `interactionMode` as `'disputed'` or `'neutral'` when `colorOwnerId === null` | [VERIFIED: :232, :245-250] |
| 10 | `src/types/map.ts` `SceneFeature` union | the `'disputed' \| 'neutral'` variant is typed `colorOwnerId: null; isSelectable: false` — a colorable neutral unit **does not typecheck** | [VERIFIED: :40-44 — quoted verbatim] |
| 11 | `src/utils/scene.ts` `hasSelectableIdentity` | requires `interactionMode === 'modern-core' \|\| 'historical-entity'` **and** `colorOwnerId === entityId` | [VERIFIED: :19-27] |
| 12 | `tests/e2e/support/appHarness.ts` | `export const LOGICAL_CORE_COUNT = 195;` and `waitForApp` asserts `toHaveCount(LOGICAL_CORE_COUNT)` on `'path.country-path[role="option"]'` — **every e2e spec that calls `waitForApp` inherits this** | [VERIFIED: :5, :16-21 — quoted verbatim] |

Plus the documentation obligations: `coding-rules/data.md` § neutral policy, `coding-rules/general.md`
**Live Invariant 5** (*"`CountryList` and Locate keep the unfiltered modern 195-core catalog"*
[VERIFIED: general.md:27]), `ROADMAP.md` § Phase 5 `05-02`, and `src/constants/colors.ts:11-16`'s
comment describing `NEUTRAL_UNIT_COLOR` as the fill *"for units nobody can color"* [VERIFIED].

### The design decision the planner must make: core vs. a third category

`GIB` is a **supplement**, sourced from the Natural Earth **10m** file, and `createCanonicalBytes`
resolves core records only against `baseFeatures` (the 50m index)
[VERIFIED: scripts/prepareWorldData.mjs:346-351 vs :360-366]. **So `GIB` cannot become a
`coreStates` record without restructuring the script's join.** That alone rules out the naive
"promote all twelve to core" route.

| Option | Consequence |
|---|---|
| **(A) Promote the twelve to `coreStates`** | Falsifies `policy.coreDefinition` ("193 UN member states plus the Holy See and State of Palestine") — Antarctica is not a UN member state. Requires `sourceMatchField`/`sourceMatchValue` reviewed joins for each. **Blocked outright for `GIB`.** |
| **(B) Keep them non-core; add an explicit third policy value** — e.g. `colorPolicy: "self"` with `isSelectable: true, parentCoreId: <own id>` | `coreStateCount` stays **195** and stays factually true; a new `policy.selfColorableCount: 12` and a derived `selectableCount: 207` are added. `createRuntimeFeature` gains an explicit third branch; `validateRuntimeFeatures` asserts `selectableCount === coreStateCount + selfColorableCount`. `SceneFeature` gains a fourth union variant (or the `'neutral'` variant is split). **Recommended.** |

Option (B) also preserves the *meaning* of Live Invariant 5 — the 195-core catalog is still whole —
while the invariant's **text** must still be amended, because "195" no longer equals "everything a
creator can colour".

### The approval framing — write it once, precisely

CONTEXT already states it correctly and the plan should copy that language rather than paraphrase:
*"no geometry is promoted, no snapshot is added, and no historical packet is touched, so no rights,
factual, or topology approval is implicated. This is the owner changing a product policy on
already-shipped, hash-verified Modern geometry. It is not an approval bypass and must not be
recorded as one — but it is a manifest change, so the hash chain is re-derived, not waived."*
[VERIFIED: 04-CONTEXT.md D4-10]

**Recommendation:** the plan that lands D4-10 should include a one-paragraph note *in the commit
message* saying the same thing, because a future reader auditing a manifest diff will reach the diff
before they reach `04-CONTEXT.md`.

---

## Legend Overhaul (`04-08`, `04-11`, `04-12`, `04-13`)

### What comes out

```ts
export type LegendTheme = 'light' | 'dark' | 'soft';
export type LegendTextSize = 'small' | 'medium' | 'large';
export type LegendBorderStyle = 'none' | 'hairline' | 'strong';
export interface LegendState {
  readonly entries: ReadonlyArray<LegendEntryState>;
  readonly position: LegendPosition;
  readonly theme: LegendTheme;
  readonly textSize: LegendTextSize;
  readonly backgroundOpacity: number;
  readonly borderStyle: LegendBorderStyle;
}
```
[VERIFIED: src/types/composition.ts:156-178 — quoted verbatim]

D4-11 deletes `theme`, `backgroundOpacity`, `borderStyle`. That cascades to, at minimum:

- `LEGEND_THEMES`, `LEGEND_BORDER_STYLES`, `DEFAULT_LEGEND_BACKGROUND_OPACITY = 90`,
  `BACKGROUND_OPACITY_MIN = 70` / `MAX = 100` / `STEP = 5`, `isBackgroundOpacityValid`,
  `createDefaultLegendState` [VERIFIED: src/utils/legend.ts:28-30, 42, 47-61, 203-215, 278-287]
- `LegendValidationIssue`'s `'invalid-theme' | 'invalid-background-opacity' | 'invalid-border-style'`
  members and the three `validateLegend` branches that push them
  [VERIFIED: src/utils/legend.ts:128-134, 582-596]
- `normalizeLegend`'s theme/opacity/borderStyle normalisation, and
  `normalizeLegendOpacity`'s **0–1 → percent repair** [VERIFIED: src/utils/storage.ts:318-345,
  457-498]
- **Live Invariant 8**: *"Legend opacity is a single 0–100 scale. A stored 0–1 fraction is repaired
  to percent and reported, not silently clamped."* [VERIFIED: general.md:30] — deleting
  `backgroundOpacity` **retires this invariant**. `coding-rules/general.md` must record that it is
  retired, not silently drop it.
- `THEME_COLORS` in `LegendOverlay.tsx:69` and the `Design.md § 4` "Legend colour exemption" that
  names it by line number [VERIFIED]

### Legend geometry constants that D4-12/D4-13 will move

```
LEGEND_CANVAS_SIZE 1080 · LEGEND_SAFE_INSET 32 · LEGEND_INTERNAL_PADDING 24
LEGEND_COLUMN_GAP 24 · LEGEND_COLUMN_WIDTH 288 · LEGEND_ENTRY_GAP 8
LEGEND_ENTRY_HEIGHT 48 · LEGEND_TWO_LINE_HEIGHT 64 · LEGEND_LABEL_MAX_LENGTH 32
LEGEND_MAX_ACTIVE_ENTRIES 30 · LEGEND_SMALL_NUDGE 8 · LEGEND_LARGE_NUDGE 32
```
[VERIFIED: src/utils/legend.ts:13-24 — quoted verbatim]

and the default position:

```ts
export const DEFAULT_LEGEND_POSITION: LegendPosition = Object.freeze({
  x: LEGEND_SAFE_INSET, y: LEGEND_SAFE_INSET, preset: 'top-left',
});
```
[VERIFIED: src/utils/legend.ts:37-41 — quoted verbatim]

**D4-13 changes this default and nothing else structural.** Live Invariant 3 guarantees
`resolveLegendPosition`/`resolveLegendRender` are the only readers, so call sites do not change
[VERIFIED: general.md:25; src/utils/legend.ts:458-493].

⚠ **The reference's legend is NOT a `LEGEND_COLUMN_WIDTH: 288` row list.** D4-12's stacked bar with
break ticks is a different layout function entirely — contiguous swatches with no gaps, tick leaders,
numbers read *between* ticks. `createLegendLayout` computes width as
`LEGEND_INTERNAL_PADDING * 2 + columns * LEGEND_COLUMN_WIDTH + (columns - 1) * LEGEND_COLUMN_GAP`
[VERIFIED: src/utils/legend.ts:414-423] — that formula does not describe a bar. Expect `04-08` to
add a **second** layout function with its own bounds, and expect `resolveLegendRender` to dispatch
on the legend form. Keep both bounds flowing through `resolveLegendPosition`, or an out-of-frame
legend becomes representable again.

### Open Question 3 — a correction the planner needs

`04-CONTEXT.md` Open Question 3 says *"the approved `03-UI-SPEC.md` is already known to carry a
wrong placement formula that 03-08 RED-proved and worked around with a corner anchor; verify against
the running editor before assuming a cause."*

**That known-wrong formula is about the floating camera cluster (`.map-navigation`), not the
legend.** The recorded defect is `inset-inline-end: max(--space-lg, gutter + --space-sm)`, which
*"lands the floating cluster inside the frame corner at every aspect ratio"*
[VERIFIED: STATE.md:272-276; 03-08-SUMMARY.md:66, 133, 289]. So it is **not** a candidate cause of
G-1. G-1's verbatim owner report is *"the legend is a bit too high"* [VERIFIED: 03-UAT.md:188].

The advice in Open Question 3 still stands and is worth restating precisely: **verify G-1 against the
running editor before assuming the default position is the whole cause.** The one structural cause I
can name from the code is that the default preset is `'top-left'` with `x = y = 32`, and
`getLegendCornerPosition` anchors a top preset at exactly `LEGEND_SAFE_INSET` — 32 of 1080, i.e.
~3 % from the top edge, above where the reference puts it [VERIFIED: src/utils/legend.ts:426-438].

---

## Storage V3 Migration (`04-09`)

### The bounds, verbatim

```ts
export const MAX_STORAGE_SERIALIZED_LENGTH = 1_000_000;
export const MAX_STORAGE_JSON_DEPTH = 32;
export const MAX_STORAGE_JSON_NODES = 50_000;
const MAX_STORED_COLOR_ENTRIES = 512;
const MAX_STORED_LEGEND_ENTRIES = 512;
const MAX_LEGEND_LABEL_LENGTH = 32;
```
[VERIFIED: src/utils/storage.ts:51-57 — quoted verbatim]

**The raw-length bound is applied before `JSON.parse`, and the node/depth budget immediately after**
[VERIFIED: src/utils/storage.ts:736-761 — `if (serialized.length > MAX_STORAGE_SERIALIZED_LENGTH)`
precedes `parser(serialized)`, and `hasSafeJsonBudget(parsed)` follows it].

### Version dispatch as it stands

```
value.schemaVersion === undefined  → V1 legacy (colors only) → createLegacyOutcome
value.schemaVersion !== 2          → { ok:false, reason:'unsupported-version' }
value.schemaVersion === 2          → normalizeComposition
```
[VERIFIED: src/utils/storage.ts:623-682]

⚠ **A V3 writer breaks V2 readers by design.** The moment `save()` writes `schemaVersion: 3`, an
older build reading the same origin reports `unsupported-version`. That is browser-local and
acceptable here, but say so in the plan rather than discovering it.

### Recommended V3 migration shape

- Add a `3` branch **beside** the `2` branch, not instead of it. `inspectStoredRecord` keeps
  reading V2 and **upgrades in memory** to the V3 snapshot shape (D4-17: one rendering path).
- **`legend.theme` / `backgroundOpacity` / `borderStyle` are read and discarded.** Do not treat
  their presence as corruption — a V2 record legitimately carries them, and emitting
  `composition-repaired` for every reopened V2 map would fire a toast on every load. Conversely, do
  **not** ignore genuinely malformed values; the distinction is "field removed by V3" vs "field
  invalid".
- **New V3 fields get defaults, not repairs.** An absent `surface`/`bands`/`text`/`rampAssignments`
  in a V2 record is expected, so the migration must not set `isRepaired`.
- Extend the bounds: text content length, band count/height, text-box count, ramp-assignment count.
  Each new bound must be checked in the same pre-parse-then-budget order.

### The round-trip test that catches a lossy migration

The failure mode a naive round-trip test misses: a field that is **written** but not **read back**,
which round-trips as `undefined === undefined`. Assert on a fully-populated record instead:

```ts
// Build a V3 snapshot where EVERY new field holds a non-default value.
const populated = makeFullyPopulatedV3Snapshot();
adapter.save('rt', populated);
const loaded = adapter.load('rt');
expect(loaded.value.ok && loaded.value.value).toStrictEqual(populated);   // deep, not field-by-field
// Discrimination: a snapshot differing in exactly ONE new field must NOT compare equal.
expect(makeFullyPopulatedV3Snapshot({ bandTopHeight: 40 })).not.toStrictEqual(populated);
```

The second assertion is the one that makes the first a gate: without it, a `toStrictEqual` between
two objects that both dropped the same field passes perfectly.

### D4-18 / G-2 — the cheapest possible coverage

`G-2` has *"never been exercised by human or machine"* [CITED: 04-CONTEXT.md D4-18]. The V3 suite
already constructs stored records directly, so:

1. Build a V2 record whose legend has a label of length 15–32 (`MAX_LEGEND_LABEL_LENGTH = 32`
   admits it; `LEGEND_CHARACTERS_PER_LINE.medium = 7` means 15 chars is 3 lines, and
   `getLabelLineCount(...) > 2` pushes `'label-does-not-fit'`)
   [VERIFIED: src/utils/legend.ts:86-92, 558-565].
2. Assert it **loads cleanly** — `loadOutcome.ok === true`, no `corrupt-data` warning.
3. Assert `getLegendBlockingMessage(validateActiveLegend(...).issues) === LEGEND_LABEL_FIT_MESSAGE`
   — i.e. it then **refuses to export**.

This is a pure unit test in the `node` environment. **RED-prove it** by raising
`LEGEND_CHARACTERS_PER_LINE.medium` in a scratchpad copy so the label fits, and watch step 3 fail.

⚠ **After `04-08` rewrites the legend renderer, `LEGEND_CHARACTERS_PER_LINE` may no longer be the
bound.** Write the G-2 test against `getLegendBlockingMessage`'s *behaviour*, not against the
constant, so `04-08` does not silently defuse it.

---

## The 280 → 360 Widening (D4-05) Has Three Gates

| Gate | Where | What must change |
|---|---|---|
| CSS contract, assertion 10 | `uiContract.test.ts` `it('resolves the track to 0px closed and 280px open')` — asserts `openTokens.get('--panel-width')` equals `OPEN_PANEL_WIDTH` and that `grid-template-columns` is `var(--rail-width) var(--panel-width) 1fr` | Update `OPEN_PANEL_WIDTH` to `360px`; `@property --panel-width` `initial-value` stays `CLOSED_PANEL_WIDTH` [VERIFIED: uiContract.test.ts:604-672] |
| Selector ceiling | `SELECTOR_INVENTORY_CEILING = 326` | A colours-panel redesign will add rules. **Raise the ceiling with a stated reason in the same commit**; lower it on deletion [VERIFIED: uiContract.test.ts:488] |
| The approved spec | `03-UI-SPEC.md` mentions `280` at **eleven** places, including assertion 10's own row (`:1077`) and typography rules keyed to the 280px column (`:257`, `:271`, `:718`, `:743`, `:798`, `:805`) [MEASURED: grep] | **Annotate, in the same commit that lands the width.** Several of those rules exist *because* the column is 280 — the near-size adjacency rule and the "no full-phrase control row fits" rule may relax at 360. Do not silently keep or silently drop them. |

**The type-role interaction is real, not pedantic.** `Design.md § 4` says `--text-subheading` is
*"Never inside the 280px tool panel"* and that *"Inside the 280px tool panel at most two of the
three may appear"* [VERIFIED: Design.md:257, 271]. `03-UI-SPEC.md` outranks `Design.md`; both are
keyed to a number D4-05 changes. **Report this as a contract disagreement rather than resolving it
in a plan.**

---

## The Rail-Height Problem (D4-07, Open Question 2)

### The measured arithmetic

The rail renders `TOOL_DEFINITIONS` (4 rows) plus two pinned non-tool rows (`Undo Color Change`,
`Redo Color Change`) = **6 rows** [VERIFIED: src/constants/tools.ts:20-25 — `colors`, `countries`,
`legend`, `saved`; src/components/editor/ToolRail.tsx:84-121].

`coding-rules/frontend.md:1341-1344` states verbatim: *"At 1200px or wider the desktop rail still
has no scroll container, and it needs ~492px of height (64 + 6×48 + gaps + 112 + padding); below
that the rows still overflow. No gate viewport is that shape, and no fix was shipped for it."*
[VERIFIED]

**Adding the Map style tool makes it 7 rows: 492 + 48 = ~540px minimum viewport height at
≥1200px width.** A 1280×720 laptop is fine; a 1440×550 half-height window is not.

**The reason the rail is not a scroll container is recorded and is not a preference:** *"a tooltip
has to escape the 48px column and `overflow-y: auto` computes `overflow-x: auto`"*
[VERIFIED: coding-rules/frontend.md:1338-1339]. So "just add `overflow-y: auto`" would clip every
rail tooltip. That is the constraint any option has to beat.

### The real options

| Option | Cost | Note |
|---|---|---|
| **(1) Accept it and gate it.** Add a viewport to the responsive gate at the new minimum and assert no overflow *above* it; document the floor. | Lowest. Honest. | D-5 remains open, but with a **stated number** instead of a vague one. This is what Phase 3 effectively did. |
| **(2) Move Undo/Redo out of the rail** into the HUD header/footer. | Medium — touches e2e locators (`'Undo Color Change'`) and the toast allowlist, which `frontend.md` warns are keyed to those labels [VERIFIED: ToolRail.tsx:99-101 comment] | Returns the rail to 6 rows, net zero. |
| **(3) Merge `saved` into the HUD footer** (Save/Load is a transaction, not a tool). | Medium; same locator cost | Same net effect as (2). |
| **(4) Fold water/border controls into the existing `colors` tool** instead of a new tool. | Zero rail cost | ⚠ **Contradicts D4-06 and the owner's explicit "a different tab."** Not available. |
| **(5) A scroll container with the tooltip re-homed to a portal.** | High — reopens the tooltip placement work `03-08` closed | Only worth it if the rail is expected to keep growing (Phase 5 adds a Data tool, Phase 6 more). |

**Recommendation: (1) for Phase 4, with the number stated, and flag (5) as the structural answer if
Phase 5's Data tool is confirmed.** Rail growth is a trend, not a one-off — Phase 5's roadmap entry
`05-05` names a "Data HUD section" [VERIFIED: ROADMAP.md § Phase 5], which is an eighth row.
**Say that out loud in the plan** so Phase 5 does not rediscover it.

This is **OPEN QUESTION 2** in CONTEXT and remains open — the recommendation above is research
input, not a decision.

---

## Per-Property Export Gating (D4-14)

### The decoding technique already exists — reuse it

`tests/e2e/export.spec.ts` holds three reusable helpers, read this session:

- `readPngDimensions(bytes)` — asserts the PNG signature `89504e470d0a1a0a`, asserts `IHDR` at
  bytes 12–16, reads `width` at `readUInt32BE(16)` and `height` at `readUInt32BE(20)`
  [VERIFIED: tests/e2e/export.spec.ts:115-123]
- `samplePngCorners(page, bytes)` — base64s the buffer into `page.evaluate`, `atob`s it,
  `createImageBitmap(new Blob([...], {type:'image/png'}))`, draws to a canvas, and reads
  `context.getImageData(x, y, 1, 1).data` [VERIFIED: :131-165]
- `countInkAroundRegion(page, bytes, region)` — full-frame `getImageData`, an
  `INK_CHANNEL_THRESHOLD = 240` ink test, and inside/outside counts with a 4px margin
  [VERIFIED: :173-235, :171-172]
- `saveDownload(download, name)` — `download.saveAs()` under `.artifacts/playwright/`
  [VERIFIED: :167-171; playwright.config.ts:32 sets `downloadsPath`]

**Every Phase 4 pixel gate should be built from these, not from a new decoder.** A second decode
path is the drift hazard `coding-rules/export.md` names for fixtures.

### The discrimination controls to reuse (02-27)

`tests/e2e/final-integration.spec.ts` exports the **known-different** blank state in the same run
and asserts it differs, with an explicit comment recording why:
*"the composition lives only in memory, so a reload really is a blank page… and equality between two
blank squares is perfect"* [VERIFIED: :382-399, including
`expect(blank.regions.map.red).toBe(0)` and
`expect(blank.regions.totalNonWhitePixels).not.toBe(...)`].

`coding-rules/export.md:396-411` states the rule the planner should hold every 04 gate to:
*"A pixel probe that only asserts equality passes on a blank canvas… Pick thresholds with a real
margin over the measured value, and record the measured value in the same change."* And:
*"Count colors in disjoint regions, never in the whole frame."* [VERIFIED]

### Per-plan gate design

| Plan | Property asserted | Sample | RED procedure on its own subject |
|---|---|---|---|
| `04-03` | Ocean pixel equals the chosen water preset | one point known to be ocean at the default camera + one land point as a control | pin the wrong preset; also export with a **second** preset and assert the two differ |
| `04-05` | A coastline sample has **no** dark pixel while an inland border sample **does** | two named lon/lat points projected through `createWorldProjection()` | remove the coastline weight from the sanitizer's exemption → coastline sample goes dark → RED. Then invert: delete the mesh layer → inland sample goes light → RED |
| `04-06` | Three-sample luminance ordering along the band axis + a bands-off flat control | one column, three y values inside the band extent | remove the band; then invert the gradient; both must go RED |
| `04-07` | Ink appears in the title region and **not** in the same region with the text cleared | disjoint title region box | clear the text; suppress the font (`EXPORT_FONT_FACE_SUPPRESSION_FLAG`) to prove the *font* half separately |
| `04-08` | Legend swatch pixels in a legend region derived from `resolveLegendRender`, never hard-coded | region from `resolveLegendRender` [the existing assertion-25 practice, VERIFIED: coding-rules/export.md:361-366] | move one entry's colour; the region must change |
| `04-10` | The composite frame, asserted only via the **union of the above properties** — no whole-image baseline | — | reuse `02-27`'s blank control |

**Why no baselines, restated so it survives into the plans:** *"a re-baseline diff can never be
[RED-provable on its own subject], since 'the baseline changed because my plan changed it' is
unfalsifiable"* [VERIFIED: 04-CONTEXT.md D4-14].

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Deriving shared interior boundaries | A polygon-edge adjacency algorithm | `mapshaper -innerlines`, at build time | Already a devDependency; measured deterministic; topology-aware. Hand-rolled edge matching gets the antimeridian and coincident-ring cases wrong. |
| WCAG contrast math | A new luminance function | Extract the existing `relativeLuminance`/`contrastRatio` from `uiContract.test.ts:266-296` into a shared module | Two copies drift; this repo has already paid for a duplicated constants table |
| PNG decoding in tests | A PNG parser, or a screenshot-diff library | `createImageBitmap` + `getImageData` in `page.evaluate`, as `export.spec.ts` already does | Zero dependencies; already the house pattern |
| Legend position resolution | Reading `legend.position` at a new call site | `resolveLegendPosition` / `resolveLegendRender` | **Live Invariant 3.** One bypass clips legend content out of the PNG |
| Font subsetting | Installing fontTools to merge latin + latin-ext | Two `@font-face` rules with `unicode-range` | Measured to work through the export path; needs no toolchain |
| Text measurement | A canvas `measureText` call at runtime | A characters-per-line table derived from a worst-case advance, as `LEGEND_CHARACTERS_PER_LINE` does | Vitest has no DOM; the runtime path must not depend on a measurement the gate cannot make |
| Export background colour | A fourth white-setting layer, or removing one | Keep the three opacity layers; add a `<rect>` for colour | Removing one is invisible until the last one goes [VERIFIED: coding-rules/export.md:330-334] |
| A CSS `filter`/`backdrop-filter` band | Any CSS effect on exported content | An SVG `<linearGradient>` | `Design.md § 8`, enforced by `uiContract.test.ts` |

**Key insight:** in this repo the expensive mistakes are never "we used the wrong library" — there
are almost no libraries. They are "we wrote a second copy of a rule that already had one home".
Every § above names the existing home.

---

## Runtime State Inventory

Phase 4 is partly a migration (D4-10 data policy, V2→V3 storage, D4-17 appearance change). A grep
audit finds files; it does not find runtime state.

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | `localStorage['countriesirl_maps']` — up to `MAX_SAVED_MAPS = 10` V1/V2 records per origin, on **every developer's and the owner's browser** [VERIFIED: src/constants/config.ts:2-4]. Under D4-17 these render differently after the change, and their exported PNGs differ from ones already posted. | **Code edit + in-memory migration.** No data migration is possible or wanted — the records stay V2 on disk until re-saved. |
| | `localStorage['countriesirl_last_open_tool']` — holds a `ToolId` (`'colors' \| 'countries' \| 'legend' \| 'saved'`) or `'closed'` [VERIFIED: src/types/ui.ts:28; src/constants/tools.ts:36]. Adding the Map style tool **widens** the union; existing stored values stay valid. | **Code edit only.** `getLastOpenTool` already resolves an unknown id to closed with a corrupt warning [VERIFIED: storage.ts:1138-1143]. |
| | `localStorage['countriesirl_theme_mode']`, `countriesirl_onboarding_dismissed` | **None** — untouched by Phase 4. |
| **Live service config** | **None.** No backend, no external service, no dashboard, no workflow engine. Verified by the absence of any service SDK in `package.json` [VERIFIED] and by `general.md:238-242`. | none |
| **OS-registered state** | **None.** No scheduled task, daemon, or process manager. The only long-lived process is `npm run dev` / Playwright's `webServer` on port 4174, started and stopped per run [VERIFIED: playwright.config.ts:47-52]. | none |
| **Secrets / env vars** | **None.** `CLAUDE.md` states: *"no `.env.local`, no secrets, no `VERCEL_URL`"*. No `.env*` file is referenced anywhere in `src/` or the scripts. | none |
| **Build artifacts / caches** | `.artifacts/playwright/downloads/` holds PNGs from previous runs. `coding-rules/export.md:444-446` states: *"Downloaded PNGs from before a pipeline change are stale evidence: clear `.artifacts/playwright/downloads/` before the first post-change run."* [VERIFIED] Phase 4 changes exported pixels in five plans. | **Clear the downloads directory before each of `04-03`, `04-05`, `04-06`, `04-07`, `04-08`, `04-10`.** Name it in each plan's verify block. |
| | `public/data/world-modern.geojson` is a **committed derived artifact** — `data:world:check` re-derives and byte-compares it. After D4-10 the committed file must be regenerated by running the script, not hand-edited [VERIFIED: prepareWorldData.mjs:407-426]. | **Regenerate, then commit.** A hand-edit that happens to match is indistinguishable from one that does not until the check runs. |
| | `node_modules` — no new packages, so no reinstall. Note `general.md:402-404`: do **not** junction/symlink `node_modules` between worktrees. | none |

---

## Common Pitfalls

### Pitfall 1: Building a border system the exporter then overwrites
**What goes wrong:** 04-05 lands beautiful hairline coastlines in the editor; the downloaded PNG has
black 0.75 borders on everything.
**Why it happens:** `sanitizeExportClone` sets `stroke`, `stroke-width`, and the inline
`style.stroke`/`style.strokeWidth` on every `path.scene-path,path.country-path`
[VERIFIED: src/utils/export.ts:334-356].
**How to avoid:** treat the sanitizer's stroke block as **part of 04-05's deliverable**, not as
untouched infrastructure. Change it before building the UI.
**Warning sign:** the editor and the download disagree — which nobody notices, because the export
gate for borders does not exist yet.

### Pitfall 2: Styling exported content from a stylesheet
**What goes wrong:** the band, the water, or the text looks right on screen and is absent from the
PNG.
**Why it happens:** measured this session — a host stylesheet rule and a host `var()` both render as
**nothing** inside the isolated SVG document.
**How to avoid:** every exported element gets inline attributes or an inline style. The
`uiContract.test.ts` export-isolation assertion catches the *unsafe-property* half; it does **not**
catch "a colour that only exists in CSS".
**Warning sign:** you typed `var(--` inside anything under `[data-layer=]`.

### Pitfall 3: An `id` that gets stripped, taking a gradient with it
**What goes wrong:** the band gradient silently disappears from the PNG.
**Why it happens:** `sanitizeExportClone` strips `id` unless `collectReferencedIds` found a
reference [VERIFIED: src/utils/export.ts:311-323]. A gradient referenced only from an external
stylesheet has no reference *inside the clone*.
**How to avoid:** reference gradients with `fill="url(#…)"` attributes. `coding-rules/export.md`
already names the correct assertion: *"Assert instead that no surviving `url(#…)` or `href='#…'`
reference dangles"* — and warns that *"A test that asserts `clone.ids === 0` confirms that break
instead of catching it."* [VERIFIED: :258-260]

### Pitfall 4: The mesh not wrapping at the date line
**What goes wrong:** a Pacific-framed composition shows interior borders on the primary copy and
none on the ±360° repeats.
**Why it happens:** `MapCanvas` builds `createWrappedSceneModel(features)` and translates each
repeat; a mesh layer added naively renders once [VERIFIED: MapCanvas.tsx:526-527, 566].
**How to avoid:** wrap the mesh with the same offsets. Gate it by framing the export at the date
line and sampling an inland border on a wrapped copy.
**Warning sign:** the gate composition never leaves the default world camera.

### Pitfall 5: A gate that goes green because the subject never rendered
**What goes wrong:** "text appears in the PNG" passes because the *region* it samples is empty in
both runs.
**Why it happens:** the exact defect `coding-rules/export.md:396-405` records —
*"A pixel probe that only asserts equality passes on a blank canvas."*
**How to avoid:** every comparison gate owes a **content floor first** (`nonWhitePixels >
MIN_NON_WHITE_PIXELS`, with the measured value recorded in the same change) and a **blank
discrimination control**.

### Pitfall 6: Treating D4-10 as a data edit
**What goes wrong:** a plan budgets an hour for "flip twelve booleans" and hits twelve blocking
touch points, including a type union that will not compile and an e2e harness constant every spec
depends on.
**How to avoid:** the § D4-10 table above. Give it its own plan slot; do not bolt it onto `04-03`.
**Warning sign:** `LOGICAL_CORE_COUNT` is not mentioned anywhere in the plan.

### Pitfall 7: Re-baselining an export fixture instead of asserting a property
**What goes wrong:** a plan changes exported pixels, updates the baseline, and the gate passes — and
would have passed if the change were wrong.
**Why it happens:** the baseline's subject is the baseline.
**How to avoid:** D4-14 forbids it. If a plan proposes a baseline, that is the signal to redesign
the gate.

### Pitfall 8: A V2 record loading with a spurious corruption toast
**What goes wrong:** every reopened saved map raises "corrupt data" because its `legend.theme` is no
longer a recognised field.
**Why it happens:** `normalizeLegend` sets `isRepaired` when a field fails validation, and
`normalizeComposition` propagates it into a `composition-repaired` warning
[VERIFIED: src/utils/storage.ts:490-498, 536-542].
**How to avoid:** V3 must treat V2's three deleted legend fields as *expected and ignorable*, not
as invalid.

---

## Code Examples

### Interior-border mesh derivation (build-time)

```bash
# Verified working in this session against the committed world asset.
npx mapshaper public/data/world-modern.geojson \
  -innerlines \
  -o format=geojson precision=0.0001 public/data/world-borders-modern.geojson
# → GeometryCollection, 327 LineStrings, 19,624 points, 366,767 bytes
# → deterministic: identical SHA-256 across runs
# → insensitive to feature properties (D4-10's flips do not move it)
```

### Rendering the mesh with the existing projection

```ts
// MapCanvas, inside [data-layer="camera"], AFTER [data-layer="countries"].
// Source pattern: MapCanvas.tsx:541-542 already builds these two.
const projection = createWorldProjection();
const pathGenerator = geoPath(projection);

bordersLayer
  .selectAll<SVGPathElement, WrappedMeshPath>('path.border-mesh-path')
  .data(wrappedMesh, (mesh) => mesh.key)
  .join((enter) =>
    enter
      .append('path')
      .attr('fill', 'none')
      // MEASURED to survive the raster path; without it a zoom-8 frame
      // downloads 8x-thick borders.
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('aria-hidden', 'true')
      .attr('pointer-events', 'none'),
  )
  .attr('transform', (mesh) => `translate(${mesh.offsetX} 0)`)
  .attr('d', (mesh) => pathGenerator(mesh.geometry) ?? '')
  .attr('stroke', borderColor)
  .attr('stroke-width', BORDER_WEIGHT_STEPS[interiorWeight]);
```

### Gradient band — the shape measured to survive

```tsx
{/* Direct child of svg.map-canvas, OUTSIDE [data-layer="camera"],
    BEFORE [data-layer="legend"] so the legend paints over it. */}
<defs data-layer="paint">
  <linearGradient id="band-top" x1="0" y1="0" x2="0" y2="1">
    {/* stop-color is a SERIALIZED literal derived from the surface colour (D4-16).
        A var() pointing at a host token renders as NOTHING — measured. */}
    <stop offset="0" stopColor={surfaceColor} stopOpacity={1} />
    <stop offset="1" stopColor={surfaceColor} stopOpacity={0} />
  </linearGradient>
</defs>
<g data-layer="bands">
  <rect x={0} y={0} width={1080} height={topBandHeight} fill="url(#band-top)" />
</g>
```

### Export font face — two faces, one family, one registry entry

```ts
// src/styles/interFontFace.ts — the registry in export.ts:82-84 is UNCHANGED.
import interLatin from '../assets/inter-latin-variable.woff2?inline';
import interLatinExt from '../assets/inter-latin-ext-variable.woff2?inline';

export const EXPORT_FONT_FAMILY = 'Inter';

const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,/* … as recorded in README */';
const LATIN_EXT_RANGE = 'U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F,/* … */';

function face(src: string, range: string): string {
  return (
    `@font-face{font-family:'${EXPORT_FONT_FAMILY}';` +
    `src:url(${src}) format('woff2');` +
    `font-weight:100 900;font-style:normal;font-display:block;` +
    `unicode-range:${range};}`
  );
}

// MEASURED: two faces for one family parse and render correctly inside SVG-as-image.
export function buildExportFontFaceCss(): string {
  return face(interLatin, LATIN_RANGE) + face(interLatinExt, LATIN_EXT_RANGE);
}
```

### Contrast gate for a ramp (pure, `node` environment)

```ts
import { contrastRatio } from '../utils/contrast';   // extracted from uiContract.test.ts:266-296

const WCAG_AA_BODY_RATIO = 4.5;   // same constant uiContract.test.ts:1920 uses
const LABEL_CANDIDATES = ['#FFFFFF', MAP_FIXED_TEXT] as const;   // '#111827' — theme.css:260

it('gives every ramp shade a readable label colour', () => {
  const rows = RAMPS.flatMap((ramp) => ramp.shades.map((shade) => ({ ramp: ramp.id, shade })));
  expect(rows).toHaveLength(EXPECTED_RAMP_SHADE_COUNT);   // a LITERAL, never a.length * b.length

  rows.forEach(({ ramp, shade }) => {
    const best = Math.max(...LABEL_CANDIDATES.map((ink) => contrastRatio(ink, shade)));
    expect(best, `${ramp} shade ${shade} has no label colour reaching AA`)
      .toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);
  });
});
```

---

## State of the Art

| Old approach (in this repo) | Current approach | When it changed | What it means for Phase 4 |
|---|---|---|---|
| `html2canvas` rasterises the DOM | `src/utils/export.ts` owns serialise → SVG-as-image → `drawImage` → `toBlob` | plan `03-11`, D-34, 2026-08-06 | **Never research or propose a third-party rasteriser.** The path's fidelity envelope is the one measured above. |
| Font resolved from `theme.css`'s `@font-face` | Font bytes base64-inlined into the clone by `injectExportFontFace`, per referenced family (D-34a) | `03-11` | Phase 4's text tools add **registry entries**, not a new mechanism |
| `phase2CssContract.test.ts` | `src/styles/uiContract.test.ts` + `src/styles/themeTokens.test.ts` | plan `03-04` | The CSS contract gates D4-05 must update live here |
| One 1438-line `Controls.css` | Eight per-surface sheets under `src/styles/controls/`, discovered by directory walk, `editor.css` imported last | plan `03-10` | A new Map-style sheet must join **both** the directory and `main.tsx`'s asserted order |
| `prefers-color-scheme` | An explicit `.dark` class written by `App` only (D-30) | Phase 3 | Nothing in Phase 4 may read an OS colour preference — `uiContract.test.ts` scans for it |
| Legend chrome (`theme`/opacity/border) is creator-controlled | **D4-11 deletes it** | Phase 4 | Retires **Live Invariant 8**; record the retirement rather than dropping it |

**Deprecated / outdated in this repo — do not build against:**
- `COLOR_PRESETS` (the flat 10 swatches) — D4-01/D4-02 replace it [VERIFIED: src/constants/colors.ts]
- Any doc text implying `html2canvas` is in the path
- `.planning/config.json` — still lists `"React + D3.js + html2canvas"` under `techStack.candidates`
  and `"decided": false` [VERIFIED]. It is **stale**; `CLAUDE.md` and `STATE.md` are authoritative.

---

## Contract Disagreements — reported, not resolved

Per constraint 10, these are surfaced for the owner/planner, not settled here.

| # | Disagreement | Documents |
|---|---|---|
| **CD-1** | **D4-05 (360px flyout) vs. the approved `03-UI-SPEC.md`**, which specifies 280px in eleven places including assertion 10's own row and several typography rules that exist *because* the column is 280 wide. | `04-CONTEXT.md` D4-05 · `03-UI-SPEC.md:198, 257, 271, 321, 434, 455, 710, 718, 743, 798, 805, 1077` · `Design.md:257, 271` |
| **CD-2** | **D4-10 vs. `ROADMAP.md` § Phase 5 `05-02`**, which reads *"neutral units (Kosovo et al.) are reported as 'not colorable', not matched."* | `04-CONTEXT.md` D4-10 · `ROADMAP.md` § Phase 5 |
| **CD-3** | **D4-11 vs. `REQUIREMENTS.md` F4.5** — *"Legend styling: background opacity, text size, border"*. Two of the three named capabilities are deleted. Original requirement text is never rewritten in this project; F2/F3/F7 carry supersession annotations, and F4.5 needs one. | `04-CONTEXT.md` D4-11 · `REQUIREMENTS.md:104` |
| **CD-4** | **D4-11 vs. `general.md` Live Invariant 8** — *"Legend opacity is a single 0–100 scale…"* becomes vacuous when the field is gone. An invariant that can no longer be violated should be recorded as retired, not silently deleted. | `general.md:30` |
| **CD-5** | **D4-10 vs. `general.md` Live Invariant 5** — *"`CountryList` and Locate keep the unfiltered modern 195-core catalog."* The 195-core catalog remains 195, but it is no longer the set of colourable units. The invariant's text needs amending even though its intent survives. | `general.md:27` |
| **CD-6** | **D4-08/D4-09 vs. `coding-rules/export.md` § Background Color Contract** — *"Always export with an opaque white background (`#FFFFFF`)"*. A creator-chosen water colour is compatible with the *opacity* intent but not with the literal text. | `coding-rules/export.md:330-334` |
| **CD-7** | **`04-CONTEXT.md` Open Question 3 mis-attributes the known-wrong placement formula.** The RED-proved defect is `.map-navigation`'s `inset-inline-end`, not the legend's placement. The advice ("verify against the running editor") stands; the stated cause does not apply to G-1. | `04-CONTEXT.md` OQ-3 · `STATE.md:272-276` · `03-08-SUMMARY.md:66, 133, 289` |
| **CD-8** | **`ROADMAP.md` § Phase 4 `04-08` says "range-entry mode ('6.0–10.0')"; `04-CONTEXT.md` § specifics says the reference prints *break boundaries between ticks*, not literal range text.** These are different legend forms. | `ROADMAP.md` § Phase 4 · `04-CONTEXT.md` § specifics table |
| **CD-9** | **`.planning/config.json` is stale** — `techStack.decided: false`, candidates include `html2canvas`, `workflow.phases: 3`. Contradicts `CLAUDE.md`/`STATE.md`/`ROADMAP.md` (6 phases, stack decided, html2canvas removed). Low risk but it is a file an agent may read. | `.planning/config.json` |
| **CD-10** | **An untracked debug artifact reaches the opposite conclusion to D4-10, and is also stale.** `.planning/debug/kosovo-renders-white-uncolorable.md` (untracked in the working tree, `status: diagnosed`) states verbatim that Kosovo *"cannot be colored by deliberate, manifest-recorded policy … which is correct and must not be changed"* and that *"Fixing the data (making Kosovo a core state) would violate the reviewed 195-core invariant and the approval chain in coding-rules/data.md."* **D4-10 supersedes that recommendation** — and the note is independently stale: it cites `src/styles/phase2CssContract.test.ts` (retired by plan `03-04`) and claims `scene.ts` *"returns DEFAULT_COLOR when colorOwnerId === null"*, whereas the current code returns `NEUTRAL_UNIT_COLOR` [VERIFIED: src/utils/scene.ts:137-139]. Its *symptom* description is still useful — the click is swallowed with no feedback because `MapCanvas` early-returns without `stopPropagation` and `handleBackgroundClick` early-returns because the target IS a `.scene-path` — which is exactly the interaction D4-10 makes moot. **Recommendation: resolve or annotate this file during `04-11`; do not let a future reader treat it as current guidance.** | `.planning/debug/kosovo-renders-white-uncolorable.md` |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | ColorBrewer/CARTO sequential schemes are the cartographic default for choropleth ramps and are perceptually vetted | Alternatives Considered | Ramp choice starts from a weaker base; mitigated because 04-02's own contrast gate is the binding constraint |
| A2 | A 5-step sequential ramp cannot hold 3:1 between every adjacent step across most hues within sRGB | Contrast thresholds | If wrong, a stricter adjacent-step gate is achievable and should be used |
| A3 | mapshaper exposes a usable Node API (`mapshaper.applyCommands`) for in-script invocation | Mesh derivation | Falls back to `child_process` on the local binary — verify before writing the plan |
| A4 | WCAG large-text (3:1) would apply to legend labels at 24–40 user units when the PNG is viewed at 1:1 | Contrast thresholds | Using 4.5:1 uniformly is the safe choice and is what I recommend |
| A5 | `precision=0.0001` (~11 m) is below the resolution a 1080px world render can express | Mesh derivation | If visibly lossy, drop the precision flag: costs +78,028 B [MEASURED] |
| A6 | Google Fonts' Inter `latin-ext` block is still served under OFL-1.1 at the byte sizes recorded in `src/assets/README.md` | latin-ext | **Must be re-fetched and re-verified when 04-07 lands** — the README's numbers are a Phase 3 measurement, not a live fetch |
| A7 | An older build reading a V3 record reports `unsupported-version` rather than crashing | Storage V3 | Verified by reading the dispatch [storage.ts:648-654]; the *user-facing* consequence is the assumption |

---

## Open Questions

1. **Which water/background presets ship.**
   - Known: the default is **white**, from the owner's reference.
   - Unclear: the roadmap's straw man (paper white / cool tint / soft grey / light blue) *"was never
     confirmed"* [CITED: 04-CONTEXT.md OQ-1].
   - Recommendation: `04-03` presents a named set to the owner as a `checkpoint:decision` before
     building the picker. Do not let a plan adopt the straw man by default.

2. **Rail height vs. the new Map style icon, against unclosed D-5.**
   - Known: 6 rows ≈ 492px today; 7 rows ≈ 540px [VERIFIED + arithmetic]. The rail cannot be a
     scroll container without breaking tooltip escape [VERIFIED: frontend.md:1338-1339].
   - Unclear: whether the owner accepts a stated minimum viewport height.
   - Recommendation: § The Rail-Height Problem, option (1), with the number stated — and flag that
     Phase 5's Data tool makes it an eighth row.

3. **Whether D4-13's reference-derived default fully resolves G-1.**
   - Known: G-1 verbatim is *"the legend is a bit too high"* [VERIFIED: 03-UAT.md:188]; the default
     preset is `top-left` at `x = y = 32` of 1080 [VERIFIED: legend.ts:37-41].
   - Unclear: the owner also said *"I dont know the entire legend is off and just not write"*
     [CITED: 04-CONTEXT.md OQ-3] — position may not be the only defect, and D4-12's new bar form may
     dissolve the complaint entirely.
   - Recommendation: verify against the running editor before `04-08` commits to a cause. **CD-7:
     the known-wrong UI-SPEC formula is not the cause.**

4. **The proportional-vs-classed tension (D4-03).** Surfaces at Phase 5 planning, not here. Record
   it; do not resolve it.

5. **Ramp shade-set disjointness.** If two ramps share a hex, the legend collapses the two entries
   [VERIFIED: storage.ts:384-388, legend.ts:294-308]. Either guarantee disjointness in `04-01` or
   re-key legend entries. **Not decided in CONTEXT.**

6. **Whether the mesh must wrap at the date line.** Not named in the roadmap or CONTEXT; the code
   says the polygons do [VERIFIED: MapCanvas.tsx:526-527, 566]. `04-05` must decide.

7. **The hover/selection carrier when coastline weight is `none`.** CONTEXT flags it as
   *"Unresolved; name it in `04-05`."* [VERIFIED: 04-CONTEXT.md § code_context]

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | everything | ✓ | v26.5.0 [MEASURED] | — |
| `mapshaper` | `04-04` mesh derivation | ✓ | 0.7.48 [MEASURED: `npx mapshaper --version`] | — |
| Installed Google Chrome | every e2e gate | ✓ | Playwright `channel: 'chrome'` launches successfully [MEASURED — I launched it twice this session] | — |
| Microsoft Edge | the `msedge` Playwright project | ✗ | **not installed** | **None. No Edge result may be produced or cited.** |
| Firefox / Safari | — | ✗ | never run here | **None. Never report as passed.** |
| Network access to `raw.githubusercontent.com` | `npm run data:world:check` (build-time only) | ✓ | check passed in 20.45 s [MEASURED] | `--base-source` / `--supplement-source` local paths [VERIFIED: prepareWorldData.mjs:49-61] |
| `fontTools` / `pyftsubset` / `woff2_compress` | merging latin + latin-ext into one file | ✗ | not installed [MEASURED] | **Two `@font-face` rules with `unicode-range`** — measured to work, no toolchain needed |
| `shasum` | recording the new font asset's SHA-256 | ✓ | used successfully this session [MEASURED] | — |

**Missing dependencies with no fallback:** Microsoft Edge, Firefox, Safari — all three are outside
certification scope by project constraint, not by accident. **Phase 4 acceptance must state
"installed Chrome only" plainly.**

**Missing dependencies with fallback:** the font subsetting toolchain — fully covered by the
two-face approach.

---

## Validation Architecture

`workflow.nyquist_validation` is not set to `false` in `.planning/config.json` [VERIFIED — the key
is absent], so it is treated as enabled.

### Test Framework

| Property | Value |
|---|---|
| Unit framework | **Vitest 4.1.10**, `node` environment — **no DOM** [VERIFIED: package.json; general.md:189-197] |
| Unit config | `vite.config.ts` / `vitest` defaults; `src/vitestScope.test.ts` guards scope |
| Browser framework | **Playwright 1.61.1**, `testDir: './tests/e2e'`, `fullyParallel: false`, `workers: 1`, `retries: 0` [VERIFIED: playwright.config.ts:10-13] |
| Browser projects | `chrome` (usable) and `msedge` (**cannot launch — Edge not installed**) [VERIFIED: playwright.config.ts:36-45] |
| Data check | `npm run data:world:check` → `node scripts/prepareWorldData.mjs --check` [VERIFIED: package.json] |
| CSS contract | `src/styles/uiContract.test.ts` (runs under Vitest) + `src/styles/themeTokens.test.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm run lint && npm test && npm run build && npm run test:e2e -- --project=chrome` |

**Baseline at Phase 3 close, for regression comparison:** 637/637 unit · Chrome e2e 103/103 · lint
and build clean · `data:world:check` PASS [CITED: STATE.md § Current Position].

### Phase Requirements → Test Map

**Layer legend:** `unit` = Vitest node (no DOM) · `e2e` = Playwright `--project=chrome` ·
`data` = `npm run data:world:check` · `css` = `uiContract.test.ts` / `themeTokens.test.ts`

| Decision | Behavior | Layer | Automated command | File exists? |
|---|---|---|---|---|
| D4-01 | Ramp shades are strictly monotone in luminance; `shadeForValue`/`shadeForIndex` are order-preserving | **unit** | `npx vitest run src/utils/ramps.test.ts` | ❌ Wave 0 |
| D4-01 | Ramp shade-sets are pairwise disjoint (Open Question 5) | **unit** | same file | ❌ Wave 0 |
| D4-02 | Every ramp shade has a label colour reaching 4.5:1 | **unit** | `npx vitest run src/utils/contrast.test.ts src/utils/ramps.test.ts` | ❌ Wave 0 |
| D4-02 | `contrast.ts` matches the values `uiContract.test.ts` already asserts (`#000` on `#fff` ≈ 21) | **unit** | `npx vitest run src/utils/contrast.test.ts` | ❌ Wave 0 (extract from uiContract.test.ts:266-296) |
| D4-02 | `ColorMap` union round-trips through `resolveColorValue`, history, and canonicalisation | **unit** | `npx vitest run src/utils/colors.test.ts src/hooks/useMapState.test.ts` | ✅ extend |
| D4-03 | The ocean pixel in the exported PNG equals the chosen water preset; two presets differ | **e2e** | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "water preset"` | ✅ extend `export.spec.ts` |
| D4-03 | `--map-surface` remains a mode-invariant token in the unconditioned `:root` | **css** | `npx vitest run src/styles/uiContract.test.ts` | ✅ exists (assertions 4/5) |
| D4-04 | The mesh re-derives byte-identically and the check fails on a one-digit mutation | **data** | `npm run data:world:check` | ✅ extend `prepareWorldData.mjs` |
| D4-05 | Panel track resolves to `0px` closed and **`360px`** open; `grid-template-columns` unchanged | **css** | `npx vitest run src/styles/uiContract.test.ts -t "panel track"` | ✅ update assertion 10 |
| D4-05 | Selector inventory stays at or below the (raised, justified) ceiling | **css** | `npx vitest run src/styles/uiContract.test.ts -t "selector inventory"` | ✅ update ceiling |
| D4-05 | Every discovered stylesheet is imported and `editor.css` is last | **css** | same file, assertion 20 | ✅ exists |
| D4-07 | A coastline sample has no dark pixel while an inland border sample does | **e2e** | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "border"` | ❌ Wave 0 |
| D4-08 | Each named stroke step produces a distinct measured stroke width in the PNG | **e2e** | same | ❌ Wave 0 |
| D4-09 | An uncolored country renders the grey fill while its **stored** value stays `#FFFFFF` | **unit** + **e2e** | `npx vitest run src/utils/scene.test.ts` + export sample | ✅ extend `scene.test.ts` |
| D4-10 | `data:world:check` reports **207** selectable units and refuses a manifest that disagrees | **data** | `npm run data:world:check` | ✅ extend |
| D4-10 | `LOGICAL_CORE_COUNT` = 207 and `waitForApp` finds 207 option paths | **e2e** | `npx playwright test --project=chrome` (all specs) | ✅ update `tests/e2e/support/appHarness.ts` |
| D4-10 | The twelve units are selectable, colourable, and appear in `CountryList`/Locate | **unit** + **e2e** | `npx vitest run src/utils/scene.test.ts` + `locate.spec.ts` | ✅ extend |
| D4-11 | `LegendState` no longer carries the three fields; a V2 record with them loads **without** a repair warning | **unit** | `npx vitest run src/utils/storage.test.ts src/utils/legend.test.ts` | ✅ extend |
| D4-12 | Both legend forms lay out within bounds and resolve through `resolveLegendPosition` | **unit** | `npx vitest run src/utils/legend.test.ts` | ✅ extend |
| D4-13 | The legend's default position matches the specified anchor; PNG legend region derived from `resolveLegendRender` carries ink | **unit** + **e2e** | `npx vitest run src/utils/legend.test.ts` + `legend.spec.ts` | ✅ extend |
| D4-14 | Every export gate has a blank/known-different discrimination control in the same run | **e2e** | `npx playwright test tests/e2e/final-integration.spec.ts --project=chrome` | ✅ pattern exists (02-27) |
| D4-15 | The clone's `<style>` carries **two** `@font-face` rules with `unicode-range`; a latin-ext string rasterises differently from the font-suppressed control | **e2e** | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "font"` | ✅ extend assertion 25 |
| D4-16 | Band luminance is monotone along the band axis; flat with bands off | **e2e** | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "band"` | ❌ Wave 0 |
| D4-16 | Band height clamps to the 1/7 cap | **unit** | `npx vitest run src/utils/bands.test.ts` | ❌ Wave 0 |
| D4-17 | A V2 record migrates in memory to V3 defaults with no data loss and no spurious repair | **unit** | `npx vitest run src/utils/storage.test.ts` | ✅ extend |
| D4-18 (G-2) | A V2 record with a 15–32 char legend label loads cleanly, then blocks export | **unit** | `npx vitest run src/utils/storage.test.ts src/utils/legend.test.ts` | ✅ extend |
| all | PNG is exactly 1080×1080 (`IHDR` parse) | **e2e** | `npx playwright test tests/e2e/export.spec.ts --project=chrome` | ✅ exists |
| `04-11` | `package.json` / lockfile unchanged for the whole phase | **unit** or CI step | `git diff --stat <phase-start>..HEAD -- package.json package-lock.json` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (Vitest, seconds) — catches ramp, contrast, legend, storage, and
  every CSS-contract regression.
- **Per wave merge:** `npm run lint && npm test && npm run build`, plus
  `npm run test:e2e -- --project=chrome` for any wave touching render, camera, export, persistence,
  or layout — which in Phase 4 is **most of them**.
- **Before any export-pixel wave:** `rm -rf .artifacts/playwright/downloads/` — stale PNGs are stale
  evidence [VERIFIED: coding-rules/export.md:444-446].
- **Phase gate (`04-11`):** full suite green, `npm run data:world:check` PASS, plus the physical
  checks Phase 3 never performed that Phase 4 now needs (latin-ext export inspection at minimum).

### Wave 0 Gaps

- [ ] `src/utils/contrast.ts` + `src/utils/contrast.test.ts` — extract `parseHexColor`,
      `relativeLuminance`, `contrastRatio` from `uiContract.test.ts:255-296`; repoint
      `uiContract.test.ts` at the new module in the same change (covers D4-02)
- [ ] `src/utils/ramps.ts` + `src/utils/ramps.test.ts` — monotonicity, disjointness, contrast
      (covers D4-01, D4-02)
- [ ] `src/utils/bands.ts` + `src/utils/bands.test.ts` — the 1/7 cap (covers D4-16)
- [ ] `tests/e2e/export.spec.ts` — new describes for water, border, band, and text properties, each
      with a discrimination control (covers D4-03, D4-05/D4-08, D4-16, D4-07)
- [ ] `scripts/prepareWorldData.mjs` — mesh derivation + verification branch (covers D4-04)
- [ ] `tests/e2e/support/appHarness.ts` — `LOGICAL_CORE_COUNT` 195 → 207 (covers D4-10; **blocks
      every e2e spec until updated**)
- [ ] A `package.json`-unchanged assertion for `04-11`
- [ ] **No new framework install is needed** — Vitest and Playwright are both present and
      configured.

**A note the plans should carry:** every one of these gates must be RED-proved on its own subject
before landing, by scratchpad copy-back. Phase 2 shipped three gates that could not fail; Phase 3
caught seven more plus two in a plan's own verify block [VERIFIED: CLAUDE.md § Guardrails;
general.md:199-210]. If a gate cannot be made to go red, **say so plainly instead of claiming it
passes.**

---

## Security Domain

`security_enforcement` is not disabled in `.planning/config.json` [VERIFIED — the key is absent], so
this section is included. The threat surface is narrow by construction: **browser-only,
localhost-only, no backend, no auth, no secrets, no runtime third-party request.**

### Applicable ASVS Categories

| ASVS category | Applies | Standard control in this repo |
|---|---|---|
| V2 Authentication | **no** | No accounts, no auth surface exists |
| V3 Session Management | **no** | No sessions |
| V4 Access Control | **no** | No server, no multi-tenancy |
| V5 Input Validation | **yes** | `normalizeColor` (hex/rgb regex), `isSafeStableCountryId`, `validateMapName`, `normalizeLegendEntries` label bounds, and the pre-parse storage budget (`MAX_STORAGE_SERIALIZED_LENGTH` **before** `JSON.parse`, then `hasSafeJsonBudget`) [VERIFIED: storage.ts:736-761]. **Phase 4 adds creator-typed title/subtitle/attribution text — the largest new untrusted-input surface in the phase.** |
| V6 Cryptography | **yes (integrity only)** | SHA-256 over the world asset and the vendored font. Never hand-roll; `node:crypto` `createHash('sha256')` [VERIFIED: prepareWorldData.mjs:81-83] |
| V12 Files & Resources | **yes** | Filename sanitisation in `createExportFilename` — six ordered steps, *"the order is the mitigation, not decoration"* [VERIFIED: coding-rules/export.md:310-319] |
| V14 Configuration | **yes** | No runtime third-party request; same-origin bundled assets only |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation — and where Phase 4 touches it |
|---|---|---|
| **Creator text injected into serialised SVG** — the highest-value new risk in this phase | Tampering | `XMLSerializer` escapes `<`, `>`, `&` in text nodes when the text is set via `textContent`/React children. **Never build the `<text>` element by string concatenation or `innerHTML`.** Bound the length, and reject control characters. A `<text>` built from a template string is how an SVG injection reaches the export clone. |
| Prototype pollution via a stored record | Tampering | `hasReservedObjectKey` and `createEmptyColorMap()` (`Object.create(null)`) [VERIFIED: colors.ts:63-65; useGeoData.ts:176]. V3's new fields must go through the same discipline. |
| JSON bomb / deep nesting in `localStorage` | DoS | Raw-length bound **before** parse, then node/depth budget [VERIFIED: storage.ts:736-761]. **Extend for every new V3 field.** |
| Path traversal via composition name into the download filename | Tampering | The six-step sanitiser, in order, capped at 60 chars, with a fallback [VERIFIED: coding-rules/export.md:310-319]. Unchanged by Phase 4 — do not touch it. |
| Supply-chain: a font or colour package pulled from a registry | Tampering | **No new packages.** Vendored bytes with a recorded SHA-256 and licence [VERIFIED: data.md:342-372]. The latin-ext file must get the same treatment. |
| Exfiltration through the export path | Information disclosure | Structurally impossible: the isolated SVG document *"can issue no request, including a same-origin one"* [VERIFIED: coding-rules/export.md:93-97] — and I measured that it cannot even see host CSS. |
| A creator-facing message leaking internals | Information disclosure | `ToastRegion` is an allowlist boundary with counts pinned by assertion 23 [VERIFIED: uiContract.test.ts:1109-1128]. Every new Phase 4 message must be added deliberately. |

**One security-adjacent honesty note:** the vendored font bytes *"end up inside every PNG a creator
publishes"* [VERIFIED: src/assets/README.md]. Adding the latin-ext file therefore needs the same
licence and provenance record as the existing one, including the exact fetch URLs and the user agent
used — the current README records both because *"the returned URLs differ by user agent, so the UA
is part of the provenance."*

---

## Sources

### Primary (HIGH confidence — read or executed this session)

**Repository code, read in full or in the cited ranges:**
- `src/utils/export.ts` (609 lines, whole) · `src/utils/storage.ts` (1197 lines, whole) ·
  `src/utils/legend.ts` (670 lines, whole) · `src/types/composition.ts` (239 lines, whole) ·
  `src/constants/colors.ts`, `config.ts`, `tools.ts` (whole) · `src/utils/colors.ts` (whole) ·
  `src/styles/interFontFace.ts` (whole) · `scripts/prepareWorldData.mjs` (437 lines, whole) ·
  `playwright.config.ts` (whole) · `package.json` (whole)
- `src/utils/scene.ts:1-153` · `src/utils/geojson.ts:160-215` · `src/hooks/useGeoData.ts:170-255` ·
  `src/types/map.ts:1-51` · `src/types/ui.ts:28, 89-98` · `src/components/MapCanvas.tsx:520-600,
  730-800, 825-855` · `src/components/LegendOverlay.tsx:1-70` ·
  `src/components/editor/ToolRail.tsx:75-125` · `src/styles/theme.css:41-50, 244-264` ·
  `src/styles/uiContract.test.ts:255-300, 360-470, 488, 604-700, 1208-1280, 1377-1390, 1920` ·
  `tests/e2e/export.spec.ts:100-235` · `tests/e2e/support/appHarness.ts:1-120` ·
  `tests/e2e/final-integration.spec.ts:327-435`
- `public/data/world-manifest.json` (structure + all 12 neutral records, via Node)
- `src/assets/README.md` (whole)

**Commands executed:**
- `npx mapshaper --version` → `0.7.48`
- `npx mapshaper … -innerlines …` (5 variants) → geometry counts, byte sizes, SHA-256 determinism,
  property-insensitivity
- `npm run data:world:check` → PASS in 20.45 s, `248 units and 195 selectable core states`
- Two Playwright probes in installed Chrome replicating `export.ts`'s exact serialisation shape
  (18 feature cases + 6 font/text cases)
- `which pyftsubset fonttools woff2_compress`, `python3 -c "import fontTools"` → all absent

**Planning documents:**
- `.planning/phases/04-visual-cartographic-system-1-5-2-weeks/04-CONTEXT.md` (whole)
- `.planning/coding-rules/general.md` (whole) · `export.md` (whole) · `data.md` (whole)
- `CLAUDE.md` (whole) · `Design.md` §§ 4, 8, 9 · `.planning/STATE.md` §§ 1-90, 250-300 ·
  `.planning/ROADMAP.md` § Phase 4, § Phase 5, § Progress · `.planning/REQUIREMENTS.md` §§ F4-F7 ·
  `.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-UAT.md` § Gaps ·
  `.planning/coding-rules/frontend.md` (section index + :1335-1360)

### Secondary (MEDIUM confidence)

- `03-UI-SPEC.md` — **grepped, not read** (90–140 KB; CLAUDE.md forbids reading it whole). The
  eleven `280` occurrences and their line numbers are a grep result, not a read of their context.
- `03-08-SUMMARY.md` — grepped for the placement-formula record.

### Tertiary (LOW confidence — training knowledge, flagged in the Assumptions Log)

- ColorBrewer/CARTO as the sequential-palette standard (A1)
- sRGB gamut limits on adjacent-step contrast (A2)
- mapshaper's Node API surface (A3)
- WCAG large-text applicability at 1:1 PNG scale (A4)

**No web search was performed.** Every question this phase raises was answerable from the repository
or from a probe against it, and a search result would have been weaker evidence than a measurement.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Export fidelity envelope | **HIGH** | Probed in installed Chrome using `export.ts`'s exact serialisation shape; 18 cases with pixel evidence |
| Mesh derivation (`04-04`) | **HIGH** | Command run; output counted, sized, hashed twice, and tested for property-insensitivity |
| D4-10 blast radius | **HIGH** | Every one of the twelve touch points cited to a file and line read this session |
| Storage V3 / G-2 | **HIGH** | `storage.ts` and `legend.ts` read in full |
| Standard stack (no new packages) | **HIGH** | `package.json` read; every capability traced to an installed tool |
| latin-ext approach | **HIGH** | Two-face `unicode-range` rendering measured; toolchain absence measured |
| Contrast gate design | **MEDIUM** | Implementation verified in-repo; the *thresholds* rest partly on general WCAG knowledge (A2, A4) |
| Ramp palette selection | **MEDIUM** | The mechanism is certain; the hexes are Claude's discretion and unbuilt |
| Rail-height answer | **LOW** | Open Question 2 — the arithmetic is verified, the acceptable answer is the owner's |
| Water preset set | **LOW** | Open Question 1 — explicitly unconfirmed by the owner |
| `03-UI-SPEC.md` implications of D4-05 | **MEDIUM** | Grepped only, per the read-narrowly rule |

**Research date:** 2026-08-06
**Valid until:** ~2026-09-05 for the in-repo findings (they change only when the code does). The
Google Fonts latin-ext fetch (A6) should be **re-verified at the moment `04-07` runs**, not trusted
from the Phase 3 measurement.
