---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 09
subsystem: render
tags: [d4-08, d4-14, cd-11, interior-mesh, highlight-layer, date-line-wrap, export-firewall, png-pixels]

# Dependency graph
requires:
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-06`'s derived `public/data/world-borders-modern.geojson` (327 geometries), its manifest record, and the two rendering questions it handed forward"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-08`'s `STROKE_WEIGHT_UNITS` / `hasStroke` / `strokeWidthFor`, `readStrokeContract`, the `interiorWeight` prop stub, and the `Map style` Borders section"
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "`04-01`'s `rect[data-layer=\"surface\"]` — the inline-attribute technique for getting composition appearance into the PNG"
provides:
  - "`g[data-layer=\"borders\"]` — the interior mesh, inside the camera, after the countries, date-line wrapped on the SAME `WRAP_OFFSETS`, non-interactive by attribute, zoom-pinned"
  - "`g[data-layer=\"highlight\"]` — `data-editor-only=\"true\"`, hover 1.5 / selected 2.5 user units, `pointer-events: none`, provably absent from the PNG"
  - "`normalizeBorderMesh` in `utils/geojson.ts` — root-type, member-type and manifest-count validation; malformed members skipped with warnings, never a crash"
  - "`useGeoData`'s `borderMesh` / `borderMeshWarnings`, and `EditorAssetUrls.worldBordersUrl` — the mesh from the same `dataBasePath` prop"
  - "`HOVERED_BORDER_COLOR`, and a `uiContract` gate asserting each `*_BORDER_COLOR` constant equals its `--map-border-*` token in both directions"
  - "`export.spec.ts` gates: `interior borders` x2, `highlight layer` x2, `border weight`'s new Gate A and Gate B"
  - "The measured answer to `04-06`'s precision question, and the CD-11 `ROADMAP.md` amendment"
affects: [04-10, 04-11, 04-12, 04-13, 04-14, 04-16]

actuals:
  tokens: 41557
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A layer that reaches the export clone carries EVERY property it needs as an inline attribute — including `pointer-events` and `fill` on the group — because a stylesheet rule reaches the editor and not the clone"
    - "A wrap-count gate compares the new layer's transform set against the EXISTING layer's, plus a literal, so the two cannot desynchronise and the comparison is not satisfiable at zero"
    - "A validator for a hash-recorded asset checks its count against the MANIFEST's declared number, not against a constant the validator declares — two files that have to agree"
    - "An editor-only layer still needs one inline paint attribute, or the sandbox neutralises the very gate that proves it is editor-only"
    - "When a new layer contaminates an existing gate's sample, MOVE THE SAMPLE to a place where the exclusion is structural — not re-baseline the number"

key-files:
  created: []
  modified:
    - src/utils/geojson.ts
    - src/utils/geojson.test.ts
    - src/utils/mapProjection.ts
    - src/utils/worldDataAsset.test.ts
    - src/utils/export.test.ts
    - src/hooks/useGeoData.ts
    - src/config/editorConfig.ts
    - src/config/editorConfig.test.ts
    - src/components/MapCanvas.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapWorkspace.test.tsx
    - src/constants/colors.ts
    - src/styles/MapCanvas.css
    - src/styles/uiContract.test.ts
    - src/App.test.tsx
    - tests/e2e/export.spec.ts
    - tests/e2e/fixtures/history.html
    - .planning/ROADMAP.md
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/data.md

key-decisions:
  - "The mesh's class is `border-mesh-path`, NEITHER `scene-path` NOR `country-path`. `sanitizeExportClone` normalises those two against the COASTLINE contract, so a mesh it matched would be re-stroked to the coastline weight in the download and deleted outright at `coastlineWeight: none` — and the exporter is deliberately given nothing to do for the mesh at all"
  - "The mesh ARTIFACT is non-fatal and the manifest RECORD is required. A bad mesh costs the lines between countries, not the map; a manifest with no `interiorBorderMesh` record is a provenance pair this build does not recognise, and accepting it would quietly turn the count gate off rather than fail it"
  - "The mesh renders as ONE `d` per wrapped copy — three paths for 327 geometries — because `geoPath` accepts a `GeometryCollection` directly"
  - "The highlight's geometry is READ from the DOM after the countries join rather than re-projected: a second `geoPath` pass over 744 paths would double the cost of every scene change AND be a second answer to the same question"
  - "Hover is held in a ref and the highlight drawn imperatively; a state write on `pointerenter` would re-render the whole canvas on mouse move"
  - "Selected outranks hovered, so feedback cannot get LIGHTER when a creator selects what they were hovering"
  - "The highlight stroke has TWO routes — token in CSS for the editor, inline attribute for the clone — and that duplication is the fix for a gate that could not fail, not an oversight. `uiContract.test.ts` asserts the two equal"
  - "`04-08`'s coastline sample MOVED off Cabo da Roca to Australia's west coast: Australia has no land neighbours, so the exclusion of interior ink is structural rather than a distance that has to be re-checked whenever a line layer is added"

requirements-completed: [D4-08, D4-14]

coverage:
  - id: D1
    description: "The interior mesh renders as `g[data-layer=\"borders\"]` inside the camera and after the countries, non-interactive, zoom-pinned, and date-line wrapped on the same offsets as the polygons"
    requirement: "D4-08"
    verification:
      - kind: e2e
        ref: "export.spec.ts#draw over the fills, inside the camera, wrapped at the date line (installed Chrome 151.0.7922.76)"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#follow the creator choice of interior weight and border colour"
        status: pass
    human_judgment: false
  - id: D2
    description: "The mesh is loaded from the same `dataBasePath` prop and validated before use: `GeometryCollection` root, `LineString` OR `MultiLineString` members, GEOMETRY count matched against the manifest's declared 327; malformed members are skipped with a warning and a failed mesh leaves the map usable"
    requirement: "D4-08"
    verification:
      - kind: unit
        ref: "geojson.test.ts#admits both LineString and MultiLineString members"
        status: pass
      - kind: unit
        ref: "geojson.test.ts#refuses a FeatureCollection root rather than crashing on it"
        status: pass
      - kind: unit
        ref: "geojson.test.ts#skips a malformed geometry with a warning and keeps its neighbours"
        status: pass
      - kind: unit
        ref: "geojson.test.ts#holds the mesh to the geometry count the manifest declares"
        status: pass
      - kind: unit
        ref: "worldDataAsset.test.ts#normalizes all visible units into finite world paths (the SHIPPED mesh: 327 = 301 + 26, and it projects)"
        status: pass
      - kind: unit
        ref: "worldDataAsset.test.ts#keeps the map usable, without interior borders, when {fetch fails | wrong root type | a geometry is lost} (x3)"
        status: pass
      - kind: unit
        ref: "worldDataAsset.test.ts#refuses a manifest with no interior-border-mesh record (04-09)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The mesh carries neither `scene-path` nor `country-path`, is not matched by the exporter's stroke normaliser, and survives the clone with its own inline stroke while the scene paths take the `none` branch in the same run"
    requirement: "D4-08"
    verification:
      - kind: unit
        ref: "uiContract.test.ts#keeps the interior mesh out of the exporter stroke normaliser (04-09)"
        status: pass
      - kind: unit
        ref: "export.test.ts#keeps the interior mesh, unnormalised, with its inline stroke"
        status: pass
      - kind: unit
        ref: "uiContract.test.ts#covers every path class MapCanvas can render"
        status: pass
    human_judgment: false
  - id: D4
    description: "Hover and selection render on `g[data-layer=\"highlight\"]` with `data-editor-only`, `pointer-events: none`, one path per highlighted country per wrap offset, selection outranking hover; and the country path's stroke is decided by `coastlineWeight` alone"
    requirement: "D4-14"
    verification:
      - kind: e2e
        ref: "export.spec.ts#carries selection at the shipped default, where the coastline cannot"
        status: pass
      - kind: e2e
        ref: "export.spec.ts#draws hover feedback, and selection outranks it"
        status: pass
      - kind: unit
        ref: "uiContract.test.ts#holds the highlight layer to the editor-only rule, not to the export one (04-09)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The highlight layer is removed wholesale by `sanitizeExportClone`, and `isPreservedComposition` still returns true with the surface, borders and highlight layers all present"
    requirement: "D4-14"
    verification:
      - kind: unit
        ref: "export.test.ts#removes the highlight layer, so interaction state cannot reach the PNG"
        status: pass
      - kind: unit
        ref: "export.test.ts#keeps the composition preserved with surface, borders and highlight present"
        status: pass
    human_judgment: false
  - id: D6
    description: "In ONE downloaded 1080x1080 PNG at the shipped defaults, an inland border sample carries dark ink (85) while a coastline sample carries none (0)"
    requirement: "D4-08"
    verification:
      - kind: e2e
        ref: "export.spec.ts#an inland border inks while the coastline stays quiet, in one export (installed Chrome 151.0.7922.76)"
        status: pass
    human_judgment: false
  - id: D7
    description: "A selected country's exported PNG carries no selection stroke: its coastline band matches an unselected control of the same region within a tolerance derived from a measurement in this change"
    requirement: "D4-14"
    verification:
      - kind: e2e
        ref: "export.spec.ts#a selected country ships no selection stroke into the PNG (installed Chrome 151.0.7922.76)"
        status: pass
    human_judgment: false
  - id: D8
    description: "`ROADMAP.md § Phase 4 04-05`'s mesh-carries-hover-state claim is amended (CD-11) with a dated note, and `coding-rules/frontend.md` carries the completed composition layer stack"
    requirement: "D4-08"
    verification:
      - kind: other
        ref: "grep -c 're-expressed on it' .planning/ROADMAP.md — 0; the 04-05 bullet names the editor-only highlight layer and carries a dated amendment"
        status: pass
      - kind: other
        ref: "frontend.md § The Composition Layer Stack completed; exactly two 'Last updated' entries"
        status: pass
    human_judgment: false

status: complete
---

# Phase 4 Plan 09: The Interior Mesh and the Highlight Layer Summary

**The map has borders again, and they are the right ones.** `04-08` left the product with no
borders at all — coastlines defaulted to `none` and nothing drew the lines *between* countries.
`g[data-layer="borders"]` now draws `04-06`'s derived mesh inside the camera, date-line wrapped;
`g[data-layer="highlight"]` gives hover and selection a carrier that does not depend on a
coastline stroke that no longer exists, and that the export sanitizer removes wholesale.

## Performance

| Gate | Before | After |
|---|---|---|
| Unit (Vitest, `node`) | 753 / 753, 45 files | **770 / 770**, 45 files |
| Playwright (installed Chrome **151.0.7922.76**) | 118 / 118 | **124 / 124** |
| `npm run lint` | clean | clean |
| `npm run build` (`tsc -b && vite build`) | clean | clean |
| `npm run data:world:check` | PASS | PASS (327 geometries, 366,767 bytes, re-derived) |
| Selector inventory | 332 | **332** (unmoved; two rules out, two in — see below) |
| Bundle `index.js` | — | 686.09 kB (297.14 kB gzipped) |

## ⚠ What this plan does NOT claim

- **Nobody opened the exported PNG and looked at it.** Every gate here proves that *specific
  sampled pixels carry specific values* and that *ink counts in named 12×12 bands* compare
  correctly. That is a narrower claim than "the map looks like the reference", and the
  cartographic-resemblance review is owned by **`04-16`**.
- **No Phase 3 UAT cell is cited.** Nine of its twelve were never performed; skipped is not passed.
- **Installed Chrome 151.0.7922.76 only.** Edge is **not installed on this machine**, so the
  `msedge` project cannot launch; no Edge, Firefox, or Safari result exists or may be cited.
- **The date-line wrap is asserted STRUCTURALLY**, by comparing the mesh's transform set against
  the polygons'. A Pacific-framed *visual* confirmation belongs to `04-16` and is not claimed.
- **No dark-theme review, no screen-reader pass, no touch-target measurement, no physical 200 %
  zoom** was performed on either new layer.
- **The two new layers are not persisted**, because they are not settings. `interiorWeight` and
  `borderColor` remain unpersisted — the same Known Stub `04-08` recorded; `04-14` owns the V3
  record.

## What shipped

### Task 1 — the mesh, loaded, validated, and rendered (`caa6a3f`)

`normalizeBorderMesh` in `src/utils/geojson.ts` follows the existing GeoJSON contract exactly:
malformed members are **skipped with a warning, never a crash**. Three things it does that the
plan's own text got wrong or left open, each recorded below under Deviations: it admits
`MultiLineString` as well as `LineString`, it counts **geometries**, and it takes the expected
count from the **manifest** rather than from a constant it declares.

`useGeoData` fetches the mesh as a third same-origin payload from the same `dataBasePath` prop
(`EditorAssetUrls.worldBordersUrl`). **No new fetch surface and no absolute URL.** The artifact is
**non-fatal** — a missing or invalid mesh leaves a fully usable map without interior lines,
because refusing the whole load would turn a decorative degradation into a blank editor. The
manifest **record** is required.

`MapCanvas` renders `g[data-layer="borders"]` inside `[data-layer="camera"]` and after
`[data-layer="countries"]`, from the **same** `createWorldProjection()` the polygons use, bound to
the **same** `WRAP_OFFSETS` array. `geoPath` accepts a `GeometryCollection` directly, so all 327
geometries are one `d` per wrapped copy: **three paths, not 981**.

### Task 2 — the highlight layer (`618868f`)

`g[data-layer="highlight"][data-editor-only="true"]`, inside the camera and above the borders. One
`<path>` per hovered or selected country per wrap offset — never all 207 — cloned from the geometry
the countries join **actually rendered**, read back from the DOM rather than re-projected.

The country path's stroke is now decided by the creator's `coastlineWeight` and by nothing else:
`SELECTED_STROKE_WIDTH = '2'` and the two `.country-path.hovered/.selected` CSS rules are gone.

### Task 3 — the two PNG gates and the roadmap amendment (`baf8cd4`)

Gate A and Gate B on real downloaded bytes, the CD-11 amendment, and `coding-rules/frontend.md`'s
completed composition layer stack.

### Extra — the precision question, answered (`bf6721b`)

See **Measured numbers**.

## Deviations from Plan

### 1. [Rule 1 — bug in the plan's own text] The mesh's members are NOT all `LineString`s

**Found during:** Task 1. **Issue:** the plan's action says to validate that "its `geometries` are
`LineString`s". `04-06` measured **301 `LineString` + 26 `MultiLineString`**, and
`coding-rules/data.md` records the corollary in bold: *anything that counts only `LineString`s will
agree happily with a mesh that has lost all 26 `MultiLineString`s.* **Fix:** both member types are
admitted, and every count in this plan counts **geometries**. The real-asset gate asserts
`301` and `26` against separate literals as well as the total, so the sum cannot be satisfied by a
redistribution. **Commit:** `caa6a3f`.

### 2. [Rule 2 — missing critical functionality] The expected count comes from the manifest

**Found during:** Task 1. **Issue:** the plan says "the count matches what the manifest records",
but nothing in `useGeoData` read that record. Declaring `327` as a constant in the validator would
have been the `04-01` trap — a gate asserting a number it also owns. **Fix:**
`readBorderMeshGeometryCount` reads `interiorBorderMesh.geometryCount` (and asserts `rootType`) off
the manifest, and `validateWorldManifest` **refuses a manifest without it**: the artifact and its
provenance record are checked against each other, so editing one to agree with the other is not
enough. **Commit:** `caa6a3f`.

### 3. [Rule 3 — blocking] Six files the plan did not list

| File | Why it had to change |
|---|---|
| `src/config/editorConfig.ts` + `.test.ts` | The mesh URL must come from the one base-path home, or a host that mounts `MapEditor` elsewhere gets three assets from its path and one from ours. `DEFAULT_EDITOR_ASSET_URLS` is asserted with `toStrictEqual`, so the fourth key is a required test edit |
| `src/components/MapWorkspace.tsx` | The only place that holds both `geoData` and `MapCanvas`. One prop line, plus folding `borderMeshWarnings` into the existing warning banner so the new field has a real consumer and no new creator-facing string is introduced |
| `src/utils/mapProjection.ts` | `createSafeMapPath` widened from `GeoFeature` to `GeoFeature \| GeometryCollection`. A second helper beside it would be a second copy of the NaN/Infinity screen, and two copies is how one of them stops screening |
| `src/App.test.tsx`, `src/components/MapWorkspace.test.tsx` | Their `READY_GEO_DATA` fixtures are typed, so the two new fields are compile errors |
| `src/utils/worldDataAsset.test.ts` | Three fetches, not two — see Deviation 5 |
| `src/constants/colors.ts` | `HOVERED_BORDER_COLOR` — see Deviation 7 |

### 4. [CD divergence, reported] The highlight stroke is a CSS token AND an inline attribute

`04-UI-SPEC.md § 6.9` says the highlight's stroke is `--map-border-hover` / `--map-border-selected`
**written inline**. Taken literally, those two tokens lose their only `var()` consumer and
`uiContract.test.ts`'s export-token consumer assertion goes RED — proved as RED proof 10. Taken as
CSS only, **Gate B could not fail** — proved below. So it is both: a class rule reading the tokens
(what the editor draws, and what keeps a selection stroke on map geometry on a mode-invariant
token per `coding-rules/frontend.md`), plus an inline attribute from the matching TS constant (what
the clone draws). A new `uiContract` gate asserts each constant equals its token **in both
directions**, which turns the "keep these in sync" comment `constants/colors.ts` has carried since
Phase 2 into a checked claim. Reported here rather than silently resolved.

### 5. [Rule 1] Six existing assertions collided — repaired, not re-baselined

| Subject | What broke | Repair |
|---|---|---|
| `worldDataAsset.test.ts` fetch count | `toHaveBeenCalledTimes(2)` and a two-signal list | Three, with the **URL list** asserted including `WORLD_BORDERS_URL` — the new fetch is *named*, not absorbed into a bigger number. All five mocks now route by URL and answer with the REAL committed bytes, so the shipped mesh is exercised through the real loader |
| `export.test.ts` `clonedPaths` = 3 | The clone carries a fourth path (the mesh) | `clonedScenePaths()` narrowed to the exporter's OWN selector, with `querySelectorAll('path')` still asserted at **4** in the same test so the narrowing is visibly a narrowing |
| `export.spec.ts` camera children | Gained `highlight` | Named explicitly; the ORDER is the contract |
| `tests/e2e/fixtures/history.html` | Hand-builds `geoData` in plain JS where TypeScript cannot require the new fields — crashed `MapWorkspace` at runtime, caught by three history specs | The two fields supplied explicitly |
| **`export.spec.ts` Gate A's coastline sample** | Measured **23** interior-mesh pixels at `coastlineWeight: none` | See below — the most important of the six |
| `MIN_COASTLINE_BAND_INK_PIXELS`'s table | 42 / 68 / 185 described the moved sample | Re-measured at the new point: **27 / 37 / 113**. The floor stayed at **8**; it was not lowered to fit the smaller counts |

**The coastline sample moved, and that is a repair.** `04-08` sampled Cabo da Roca on the stated
ground that a 6px radius *"excludes the neighbouring Spanish border"*. That was true only while
nothing drew interior borders: Portugal/Spain is 1.5° of longitude away, which at 1080px for 360°
is **4.5 PNG pixels** — inside the band. The new point is **Australia's west coast**, and the
reason it is the right answer rather than another guess is that **Australia has no land neighbours
at all**, so the exclusion is structural rather than a distance to re-check whenever a line layer is
added. Re-baselining the assertion from 0 to 23 would have kept it green and killed it.

### 6. [Rule 3] `MapCanvas.css` authored no rule for the mesh, and that is deliberate

Everything the mesh needs — `fill`, `pointer-events`, `stroke-linejoin`, `stroke-linecap`, the
stroke, the width, the zoom pin — is an **inline or inherited presentation attribute**. The layer
is in the export clone, and the clone rasterises with no stylesheet, so a rule would reach the
editor and not the download. This is `04-01`'s water-rect lesson applied to a line layer.

### 7. [Rule 2] `HOVERED_BORDER_COLOR` added to `constants/colors.ts`

The highlight needs a hover colour inline, and a hex literal in a `.tsx` is forbidden by the
contract test (the exemption list is closed at `LegendOverlay.tsx`). It joins its two siblings with
the same "three names so a future re-tint has a seam" reasoning, and all three are now gated
against their tokens.

### 8. Task 1 was not TDD, and is not claimed as such

The plan marks no task `tdd="true"`, and none was run test-first. Every new assertion was instead
RED-proved by mutating **its own subject** afterwards.

## RED Proofs

Every mutation was made in place after copying the file to
`/private/tmp/claude-501/.../scratchpad`, and restored by **copying back** — never
`git checkout --`. `git status` was clean of source modifications after each.

### Unit-level

| # | Subject mutated | Gate that reddened | Verbatim failure |
|---|---|---|---|
| **1** | `utils/geojson.ts` — the `MultiLineString` branch deleted | `geojson.test.ts` ×3, `worldDataAsset.test.ts` ×1 | `AssertionError: expected [ { type: 'LineString', …(1) } ] to have a length of 2 but got 1` |
| **2** | `utils/geojson.ts` — the declared-count check deleted | `geojson.test.ts` ×2, `worldDataAsset.test.ts` ×1 | `AssertionError: expected { ok: true, mesh: { …(2) }, …(1) } to strictly equal { ok: false, …(2) }` |
| **3** | `MapCanvas.tsx` — mesh rendered at ONE offset | e2e wrap gate | `Error: expect(received).toBe(expected) … Expected: 3  Received: 1` |
| **4** | `MapCanvas.tsx` — `vector-effect` dropped from the mesh | e2e zoom-pin gate | `Expected: 3  Received: 0` |
| **5** | `MapCanvas.tsx` — `BORDER_MESH_PATH_CLASS` given `scene-path` | `uiContract.test.ts` ×2 | `AssertionError: expected 'scene-path border-mesh-path' to be 'border-mesh-path'` |
| **6** | `useGeoData.ts` — a mesh fetch failure made FATAL | `worldDataAsset.test.ts` non-fatality gate | `AssertionError: expected 'error' to be 'ready'` |
| **7** | `MapCanvas.tsx` — `data-editor-only` deleted | `uiContract.test.ts` highlight gate | `AssertionError: the highlight group lost 'data-editor-only', so a selected country now ships its 2.5-unit outline into the creator's published PNG.` |
| **8** | `export.ts` — the editor-only removal deleted from the sanitizer | `export.test.ts` ×4 | `AssertionError: an editor-only element survived the sanitizer, so every affordance carrying that attribute is now a published pixel.: expected [ …(2) ] to have a length of +0 but got 2` |
| **9** | `export.ts` — normaliser widened to claim `.border-mesh-path` | `uiContract.test.ts` + `export.test.ts` mesh survival | `AssertionError: expected null to be '#7C3AED'` |
| **10** | `MapCanvas.css` — the two highlight colour rules deleted | `uiContract.test.ts` export-token consumer | `AssertionError: "--map-border-hover" is declared and gated as a fixed export token but nothing reads it, so the guard describes a treatment the map does not have.` |

**Independence, checked rather than assumed.** Proof 5 reddened the two class gates and left the
mesh-survival and highlight gates green. Proof 9 reddened the mesh gates and left the highlight
gates green. Proof 8 reddened the highlight gates and left the mesh-survival gate green — so
"the mesh survives" and "the highlight does not" are demonstrably two claims and not one.

**Proof 10 is the measured reason for the CD divergence in Deviation 4.** Deleting the two CSS
rules leaves the highlight perfectly functional in the PNG (the inline attribute carries it) and
turns two mode-invariant export tokens into declared-but-unread. That is why the CSS route stays.

### PNG-pixel gates — the three the plan required

| # | Subject mutated | Gate | Verbatim failure |
|---|---|---|---|
| **A-1** | `MapCanvas.tsx` — the mesh layer deleted | **Gate A** | `Error: the exported frame measured 0 ink pixels against a floor of 4000 (derived from 8400 measured when this gate landed). At the shipped defaults that ink IS the interior mesh, so the frame is carrying no borders at all and both samples below would be about a blank square.` |
| **A-2** | `constants/mapStyle.ts` — `DEFAULT_COASTLINE_WEIGHT` `none` → `bold` | **Gate A** | `Error: the Australian coastline band at (881, 609) measured 113 dark pixels at 'coastlineWeight: none'. Either the mesh is drawing coastlines - it is derived from edges present in exactly TWO polygons, so it cannot - or a country outline came back.` |
| **B** | `MapCanvas.tsx` — `data-editor-only` deleted from the highlight group | **Gate B** | `Error: the selected export measured 132 ink pixels around Australia's coast against the unselected control's 0. The editor's selection ring reached the creator's published image - which means 'sanitizeExportClone' stopped removing 'data-editor-only' elements wholesale.` |

**Stated plainly: A-1 reddens Gate A's CONTENT FLOOR, not its inland assertion.** At the shipped
defaults the interior mesh is the frame's *only* ink, so deleting it takes the whole-frame count to
zero and the floor — which runs first, as it must — speaks before the inland sample is read. A
scaffolded probe in the same mutated run recorded the inland band at **0**, so the inland sample
did go light; it is recorded as a measurement rather than claimed as an assertion failure. The two
share a subject here and the floor's own message names it.

**Gate B's first form could not fail, and that is the most important finding in this plan.** With
the highlight's stroke coming only from `MapCanvas.css`, deleting `data-editor-only` left the ring
in the clone — where it rendered **nothing**, because the isolated export document sees no
stylesheet. The gate measured **0 either way**: a second, accidental mechanism was hiding the one
under test. This is the *"a gate the browser neutralises"* shape from `CLAUDE.md`'s list, arriving
from inside the fix. Writing the colour inline as well makes the sanitizer the only thing standing
between a selection ring and a published image, and the same mutation then measures **132**.

## Measured numbers

| Measurement | Value | How |
|---|---|---|
| Mesh geometries loaded and validated | **327** = 301 `LineString` + 26 `MultiLineString` | the shipped asset through the real loader |
| Mesh paths rendered | **3** — one `d` per wrap offset for all 327 geometries | `geoPath` on the `GeometryCollection` |
| Mesh transforms | `translate(-1080 0)`, `translate(0 0)`, `translate(1080 0)` — **equal to the polygons'** | e2e set comparison |
| Whole-frame ink at the shipped defaults | **8,400** (`DARK_INK_THRESHOLD` 100) | vs 45,190 with coastlines at `thin`; floor set at 4,000 |
| Franco-German band ink, defaults | **85** | 12×12 band at (7.8 E, 48.7 N), projected |
| Australian coastline band ink, defaults | **0** | 12×12 band at (113.7 E, 22.3 S), projected |
| Coastline band, `hairline` / `thin` / `bold` | **27 / 37 / 113** | re-measured at the moved sample point |
| Cabo da Roca band at `none`, after the mesh | **23** | why the sample moved |
| Selected vs unselected coastline band | **0 vs 0**; tolerance **2** | Gate B |
| Same, with `data-editor-only` deleted | **132** | Gate B's RED proof, 66× the tolerance |
| Selector inventory | **332 → 332** | measured twice with the ceiling set to 0 |
| Unit tests | **753 → 770** | 45 files, unchanged |
| Playwright | **118 → 124** | installed Chrome 151.0.7922.76 |

### The `0.0001°` precision question, answered

`04-06` recorded dropping the precision flag as *"the escape hatch if a renderer ever finds it
visibly lossy"*. This plan is that renderer, so it **measured** rather than inheriting the
assumption. Both meshes were re-derived from the same canonical polygon bytes, every coordinate
pair compared, then projected through the app's own `createWorldProjection()`:

| Measurement | Value |
|---|---|
| Geometries / line parts / points | **327 / 361 / 19,624 — identical either way** |
| Bytes | 366,767 with the flag, 444,795 without (**+78,028**, +21.3 %) |
| Max coordinate delta | **5.0e-5°** per axis — exactly half the quantum (round-to-nearest) |
| Mean displacement at the world camera | **1.30e-4 viewBox px** |
| **Max** displacement at the world camera | **4.33e-4 viewBox px** — ~1/2,300 of a pixel |
| **Max** displacement at `MAX_ZOOM` (24) | **1.04e-2 viewBox px** — ~1/96 of a pixel |

A viewBox unit **is** a PNG pixel. **Verdict: KEEP THE FLAG.** The flag *rounds*; it drops no
geometry and simplifies no line, which is why all three counts are unchanged. Taking the escape
hatch would spend +21 % on the asset to move the deepest-zoom worst case by a hundredth of a pixel.
Recorded in `coding-rules/data.md` with the instruction to re-run the comparison before taking it.

## Export safety

- **PNG is exactly 1080×1080** — asserted from the `IHDR` in both new gates.
- **No network entered the export path.** No `@import`, no URL, no fetch added. The mesh is a
  **same-origin bundled asset** fetched by the app at load time, never by the exporter; the
  exporter's signature did not widen and it still knows nothing about composition state.
- **Clone contract intact**: `layerOrder` is still `[null, 'surface', 'camera', 'legend']`, the
  camera's surviving children are `['countries', 'borders']`, `isPreservedComposition` returns true
  with all layers present (asserted), the three white opacity layers are untouched, and the refusal
  reasons are unchanged.
- **Zero package-manager installs.** `package.json` and `package-lock.json` untouched.

## Verification

```
npm run lint                                    clean
npm test                                        770/770, 45 files
npm run build                                   clean (tsc -b && vite build)
npm run test:e2e -- --project=chrome            124/124, installed Chrome 151.0.7922.76
npm run data:world:check                        PASS (248 / 195 / 207; mesh 327 geometries, 366,767 B)
```

## Known Stubs

| Stub | File | Why |
|---|---|---|
| `tests/e2e/fixtures/export.html` passes no `borderMesh` | `tests/e2e/fixtures/export.html` | The fixture's clone gates are about the SANITIZER, and `export.test.ts` already covers the mesh crossing that boundary with a sentinel stroke chosen so a normaliser change is caught on the number. Adding the real 327-geometry mesh there would inflate every clone snapshot for no new signal. The real-app gates in `export.spec.ts` are what prove the mesh reaches a downloaded PNG |
| `interiorWeight` / `borderColor` / `uncoloredFill` / `coastlineWeight` are not persisted | `src/utils/storage.ts` | Unchanged from `04-08`. A saved composition reloads with the defaults; `04-14` owns the V3 record |

**The `04-08` Known Stub "the map ships with NO borders at all" is CLOSED by this plan**, not
carried forward.

## Held out / not claimed

- **`04-08`'s note asked for a decision on whether the borders layer *should* be normalised by the
  export clone's stroke loop.** The decision is **no**, and it is recorded in
  `coding-rules/frontend.md`: the mesh carries no interaction state, so there is nothing to
  neutralise, and normalising it would overwrite the interior weight with the coastline's — the
  exact editor-versus-download disagreement `04-08` closed for country paths. The pin the loop
  would have set is set by `MapCanvas` as an attribute instead, and asserted.
- **The mesh's contribution to bundle and DOM size was not measured.** The asset is 366,767 B on
  disk and three projected `d` strings in the DOM; no budget in this project bounds either, and
  inventing one here would be a number nobody chose.
- **No claim that the map "reads like the reference".** That is `04-16`'s physical check.
- **`aria-hidden` on the mesh was not screen-reader verified.** It is asserted as an attribute; a
  screen-reader pass is a physical check nobody performed in this phase.

## Notes for `04-10` and later

- **`defs[data-layer="paint"]` and `g[data-layer="bands"]` join a stack that now has two live
  camera children.** `isPreservedComposition` still only compares the SVG's own camera and legend
  indices, so a sibling before the camera is still safe — but the camera's child order is now
  asserted in three places (`export.test.ts`, `export.spec.ts` ×2). Add a camera child in all
  three or one of them fails.
- **A new exported layer owes an inline attribute for every property it needs**, including
  `pointer-events` and `fill` on its group. `MapCanvas.css` reaches the editor and not the clone.
- **`04-09`'s coastline sample is `AUSTRALIA_WEST_COAST_LON_LAT`, and the reason is structural.**
  If a later plan draws another line layer, check whether it can reach that band before assuming
  the gate still measures coastline ink — that is exactly how Cabo da Roca failed.
- **A gate on an editor-only layer needs the layer to be VISIBLE in the clone when the guarantee is
  removed.** If a future affordance's paint comes only from CSS, its export gate cannot fail. Write
  one inline attribute.
- **`MIN_MESH_INK_PIXELS` (4,000, from a measured 8,400) is the floor for a frame with coastlines at
  `none`.** `MIN_BOUNDARY_INK_PIXELS` (20,000) is for a frame at `thin`. They are not
  interchangeable, and reusing the wrong one produces a gate that is red on arrival.

## Self-Check: PASSED

- `src/utils/geojson.ts`, `src/components/MapCanvas.tsx`, `src/styles/MapCanvas.css`,
  `tests/e2e/export.spec.ts`, `.planning/ROADMAP.md`, `.planning/coding-rules/frontend.md`,
  `.planning/coding-rules/data.md` — all FOUND
- `caa6a3f` · `618868f` · `baf8cd4` · `bf6721b` — all four present in `git log`
- `grep -c "re-expressed on it" .planning/ROADMAP.md` — **0**
- `grep -c 'data-layer="borders"' src/components/MapCanvas.tsx` — **2** (the layer and its comment)
- `grep -c "data-editor-only" src/components/MapCanvas.tsx` — **4**
- `grep -c "^\*Last updated:" .planning/coding-rules/frontend.md` — **2**
- `git diff` over the four commits touches **no** `package.json` / `package-lock.json`
- `.planning/STATE.md` — **untouched**; `.planning/ROADMAP.md` changed by **one scoped bullet**
  (9 insertions, 2 deletions), § Progress and every checkbox untouched
- No forbidden gsd-sdk verb was run
- `git status --short` — clean of source modifications after every RED proof
