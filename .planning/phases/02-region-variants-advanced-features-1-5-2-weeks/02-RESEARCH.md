# Phase 02: Region Variants & Advanced Features - Research

**Researched:** 2026-07-24
**Domain:** Wrapped world cartography, deterministic SVG export, geospatial data curation, versioned browser persistence, and editable legend composition
**Confidence:** HIGH for modern-world/camera/export/state architecture; MEDIUM for historical-data delivery because no single unrestricted authoritative pre-1886 boundary source was found

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Unified World Canvas and Navigation
- **D-01:** Use one full-world interactive canvas containing the complete supported country dataset. Do not build separate Europe, World, or North America canvas modes or a region selector.
- **D-02:** A brand-new map opens at a centered whole-world fit.
- **D-03:** Creators pan directly by dragging and zoom through mouse wheel, trackpad, or pinch gestures. Zoom remains anchored under the pointer or at the pinch midpoint.
- **D-04:** Horizontal navigation loops continuously across the international date line, but minimum zoom is limited so more than one complete copy of the world cannot appear at once.
- **D-05:** Vertical movement is clamped at the projected north and south limits; the camera cannot pan into empty space beyond the poles.
- **D-06:** Preserve familiar direct-manipulation behavior and responsive touch support while retaining keyboard-accessible alternatives for every essential view action.

### Exact Viewport PNG Export
- **D-07:** PNG export captures the exact current camera framing and zoom at 1080×1080, including date-line-spanning compositions.
- **D-08:** Export produces a clean finished composition: keep geography, country colors, camera framing, historical state, legend, and visible composition styling, but remove hover, focus, selection, tooltip, and navigation/editor indicators.
- **D-09:** If the camera is still moving when Export is activated, freeze movement immediately and capture the frame visible at activation time.
- **D-10:** The legend is overlaid inside the square canvas and exported exactly where it appears; it does not reserve or shrink map viewport space.
- **D-11:** Preserve the Phase 1 export contract: exact 1080×1080 dimensions, opaque output, deterministic device-pixel-ratio-independent sizing, current colors, safe download handoff, and full temporary-resource cleanup.

### Country and Territory Coverage
- **D-12:** The primary selectable/colorable country set is the 195-state core rather than every dependency or disputed unit exposed by the source dataset.
- **D-13:** Non-core dependencies and overseas territories remain geographically visible and inherit the color of their responsible parent state where a clear parent relationship exists.
- **D-14:** Use Natural Earth's default point of view consistently for disputed geography, carrying forward Phase 1's source-policy approach. Do not add claim-perspective switching in this phase.
- **D-15:** Keep small island states at their true geographic size. They remain usable through country search/list selection and a separate Locate action rather than artificial markers or inset maps.

### View Actions, History, and Persistence
- **D-16:** Country selection remains a coloring/bulk-selection operation. Provide a separate Locate/Center action that moves and zooms the camera to a country without coupling every selection to camera movement.
- **D-17:** Provide a separate Reset View action that returns the camera to the initial whole-world fit without changing colors, selection, historical snapshot, legend, or other composition settings.
- **D-18:** Ordinary pan and zoom movements do not participate in the existing color Undo/Redo history. Undo/Redo remains predictable for intentional map edits rather than transient camera movement.
- **D-19:** Saved maps become complete composition snapshots. Save and restore colors, camera position and zoom, selected historical snapshot, legend entries/labels/order/style/position, and other visible Phase 2 composition settings. Preserve the existing max-10, newest-first, replace-by-name, typed recovery, and local-only storage behavior with a migration path for Phase 1 color-only records.

### Historical World States
- **D-20:** Historical time is offered as a curated set of verified snapshots or clearly named eras, not a continuous year slider that implies unavailable precision.
- **D-21:** When a historical snapshot has curated boundaries for only part of the world, render those historical boundaries in covered regions and retain modern boundaries everywhere else. The UI must clearly communicate which geography is historical versus modern fallback.
- **D-22:** On snapshot changes, entities with matching stable identities preserve their colors. Newly appearing or differently identified historical entities begin with the default white color; do not heuristically project modern colors backward onto predecessor territories.
- **D-23:** Switch snapshots with a brief accessible crossfade between complete states. Complex geometry morphing is deferred.

### Legend Composition
- **D-24:** Auto-generate one legend entry for each unique non-white color currently used by at least one map entity. Default uncolored white does not create an entry.
- **D-25:** A new entry starts with its uppercase hex color value as an editable placeholder label. Creators can replace it with their own category text.
- **D-26:** Offer four quick corner positions plus direct dragging for custom legend placement within the square canvas.
- **D-27:** Provide a small set of polished legend themes plus basic controls for text size, background opacity, and border styling. Do not turn Phase 2 into a full freeform design editor.

### Local Runtime and Future Compatibility
- **D-28:** Keep the product browser-only and localhost-only. No deployment, authentication, cloud sync, server, API, or environment-secret work belongs in this phase.
- **D-29:** Structure camera, scene, legend, and historical composition state so later timeline animation, overlays, textures, border/fill effects, and video export can consume it without forcing those future capabilities into Phase 2.

### Claude's Discretion
- Choose the exact world-capable cylindrical projection and camera-transform implementation that satisfies horizontal wrap, date-line continuity, pole clamping, exact export parity, and the established D3/SVG ownership rules.
- Choose tested minimum/maximum zoom values, drag thresholds, wheel sensitivity, touch behavior, and reduced-motion treatment while preserving the locked navigation feel.
- Research and recommend the exact 195-state canonical list, stable IDs, dependency-to-parent mappings, world dataset resolution, preprocessing pipeline, and historical snapshot years/sources.
- Choose the precise UI layout for Locate, Reset View, period selection, legend editing, and mobile controls while preserving Phase 1's one-active-workspace and accessibility patterns.
- Choose legend entry ordering, unused-entry lifecycle, overflow handling, theme details, and safe persistence schema versioning consistent with the locked outcomes.

### Deferred Ideas (OUT OF SCOPE)
- Timeline-based animation clips with camera moves such as fly-to, sweep, orbit, bounce, or top-down sequences.
- Animated country borders, glow, fill reveals, dimmed-background emphasis, and other motion effects.
- Pattern/texture fills, richer base-map styles, advanced outlines, shadows, and full freeform visual design controls.
- Timed text, flags, images, GIFs, logos, arrows, and location-anchored overlays.
- Multi-scene slideshow transitions, frame-sequence generation, MP4/video rendering, and batch/timelapse export.
- Geometry morphing between historical snapshots.
- User-selectable political points of view, claim layers, or disputed-border perspectives.
- Artificial small-island markers and atlas-style inset maps.
- Vercel/public deployment, production-origin verification, cloud sync, authentication, sharing URLs, and backend services.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F2.1–F2.5 | Curated historical periods, redraw, regional coverage, fallback handling, and period-aware labels | Use a manifest-driven snapshot catalog, explicit historical entity identities, modern fallback layers, provenance metadata, and period/fallback tooltip text. [VERIFIED: `.planning/REQUIREMENTS.md` + `02-CONTEXT.md`] |
| F3.1–F3.5 | Centering and regional framing intent | The separate selector/preset model is superseded by one wrapped camera, separate Locate, direct pan/zoom, Reset View, and accessible pan/zoom controls. [VERIFIED: `02-CONTEXT.md` D-01–D-06 and D-16–D-17] |
| F4.1–F4.5 | Auto-generated editable positioned styled legend | Derive active colors, retain color-keyed metadata, render an SVG overlay outside the camera transform, and persist style/position. [VERIFIED: `02-CONTEXT.md` D-24–D-27] |
| F5.2 | PNG includes the legend | Keep the legend in the same SVG export source while sanitizing editor-only state. [VERIFIED: `02-CONTEXT.md` D-08–D-11] |
| F5.5 | Filename includes a map name and date | Extend the filename helper only if a current composition name exists; sanitize to a conservative filesystem-safe token and preserve the date. [CITED: `.planning/REQUIREMENTS.md`] |
| F6.1–F6.2 | Save and load map configurations | Migrate legacy color-only records to validated version-2 complete composition records without changing the existing storage key or max-10 behavior. [VERIFIED: codebase read + `02-CONTEXT.md` D-19] |
| F7.1–F7.3 | World/North America/Europe expansion intent | Satisfied by the authoritative superseding decision to use one full-world camera that can frame any region; no mode selector is planned. [VERIFIED: `02-CONTEXT.md` D-01] |
| NFR3 | Historical period switch target below 500 ms | Cache normalized snapshot assets and projected path strings; camera movement changes only one SVG transform and does not regenerate geometry. [CITED: `.planning/REQUIREMENTS.md`] |
| NFR8 | Historical borders visually accurate to the stated tolerance | Require per-snapshot provenance, licensing, source cross-checks, and human historical review; do not claim this requirement from an unreviewed community dataset. [CITED: `.planning/REQUIREMENTS.md`] |
| NFR9 | Countries clearly identified | Store canonical IDs separately from display labels and period-aware names. [CITED: `.planning/REQUIREMENTS.md`] |
| NFR11 | WCAG AA keyboard access | Supply single-pointer and keyboard alternatives for drag/pinch actions, preserve semantic controls, and avoid duplicate accessible wrapped copies. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html] |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Preserve React 18, strict TypeScript, Vite, D3 v7+, SVG rendering, html2canvas, localStorage, and browser-only execution; do not introduce a backend or deployment work. [VERIFIED: `CLAUDE.md` read]
- Read and follow `general.md` first, then frontend/data/export/storage rules; make only targeted rule updates after a durable Phase 2 pattern is approved. [VERIFIED: `CLAUDE.md` + `.planning/CODING_RULES.md` read]
- React owns application/composition state; D3 owns only the SVG subtree it creates or updates, with stable data joins and no competing DOM ownership. [VERIFIED: codebase and frontend rule read]
- Every accepted GeoJSON feature needs a stable ID, non-empty name, and valid Polygon/MultiPolygon geometry; malformed features are skipped with warnings rather than crashing the editor. [VERIFIED: `CLAUDE.md` + data rule read]
- Every PNG remains exactly 1080×1080 and opaque, with deterministic scale, connected-anchor download handoff, and cleanup in `finally`. [VERIFIED: `CLAUDE.md` + export rule + code read]
- Keep one active responsive workspace DOM; camera/composition state must live above responsive presentation branches so a layout remount restores the same composition. [VERIFIED: `.planning/STATE.md` + `src/App.tsx` read]
- Use plain component-scoped CSS and CSS custom properties; do not add Tailwind or CSS-in-JS. [VERIFIED: Phase 1 context + frontend rule read]
- Strict TypeScript forbids `any`, unsafe assertions used to hide contract errors, magic numbers, empty catches, and implicit failure values. [VERIFIED: general rule read]
- The current frontend rule's future statement that Phase 2 “will add geoAzimuthalEquidistant” is stale relative to the locked unified horizontally wrapped canvas; the planner should schedule a targeted documentation correction after adopting the cylindrical camera design. [VERIFIED: frontend rule + `02-CONTEXT.md`]

## Summary

Use a fixed **D3 Mercator base projection** in a canonical 1080-unit square, generate country path geometry once, render three horizontally translated world copies, and apply one D3 zoom transform to their shared camera group. Mercator gives a square projected world bounded at approximately ±85.051° latitude; with minimum scale `k = 1`, exactly one world-width fits the square. A custom D3 constraint should normalize horizontal translation modulo one transformed world width and clamp vertical translation to `[1080 - 1080k, 0]`. D3 zoom already provides mouse drag, wheel, touch pan, pinch scaling, pointer/midpoint anchoring, gesture lifecycle events, scale limits, click suppression, and custom constraints. [CITED: https://d3js.org/d3-zoom] [CITED: https://d3js.org/d3-geo/projection]

Represent the saved camera semantically as normalized center longitude, clamped center latitude, and zoom—not an ever-growing raw wrap offset. Keep live camera movement in a focused camera controller outside the color reducer, but expose synchronous `freezeAndSnapshot`, `resetView`, and `locate` operations to App. The controller must update the SVG transform attribute during the gesture and commit the semantic camera state at gesture end; export freezes transitions/RAF work, reads the last painted transform, locks further input, then clones the SVG. This preserves exact date-line framing without adding camera steps to color Undo/Redo. [VERIFIED: codebase read] [CITED: https://d3js.org/d3-zoom]

Use a deterministic **hybrid Natural Earth 5.1.1 asset**: the 1:50m Admin-0 Countries layer supplies all 195 core states with about one-fifth the coordinate count of 1:10m, while six 1:10m supplemental units preserve dependencies/territories absent at 50m (`ESB`, `WSB`, `UMI`, `CSI`, `CLP`, `GIB`). Keep an explicit 195-state manifest, explicit source-feature joins, and explicit parent-color mappings; never derive core membership or political parentage from display names. [VERIFIED: official Natural Earth v5.1.1 source + local analysis] [CITED: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/]

Historical data is the schedule-critical risk. Natural Earth is current, CShapes starts in 1886 and is noncommercial/share-alike, Euratlas restricts vector redistribution, and the convenient Historical Basemaps repository is GPL-3.0 and explicitly work-in-progress. OpenHistoricalMap is generally CC0 and date-aware but incomplete by location/date. Therefore the engine can be planned confidently, but a claim of four verified premodern/modern snapshots across all requested European regions cannot honestly be guaranteed in 1.5–2 weeks unless curated, licensed assets are already approved. [CITED: https://beta.icr.ethz.ch/data/cshapes/] [CITED: https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass] [CITED: https://github.com/aourednik/historical-basemaps] [CITED: https://www.euratlas.net/shop/licences/licence_gis_gb.pdf]

**Primary recommendation:** Plan Phase 2 as a modern-world composition platform first, then a manifest-driven historical layer whose release gate includes source/license/historical review; do not let unverified historical geometry block or contaminate the camera/export/persistence foundation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pan, wheel, trackpad, pinch, keyboard camera controls | Browser / Client | — | Input events, SVG transforms, focus, and pointer capture are browser responsibilities. [CITED: https://d3js.org/d3-zoom] |
| Wrapped world rendering | Browser / Client | CDN / Static | Runtime applies transforms to bundled geometry; static assets supply deterministic paths. [VERIFIED: project architecture read] |
| Country/core/parent manifests | CDN / Static | Browser / Client | Curated JSON is built and committed; the client validates and indexes it. [VERIFIED: existing data pipeline pattern] |
| Historical snapshot composition | Browser / Client | CDN / Static | Client layers selected historical geometry over bundled modern fallback. [VERIFIED: `02-CONTEXT.md` D-21] |
| Color history | Browser / Client | — | Existing reducer remains the sole owner of color snapshots and selection. [VERIFIED: `src/providers/MapStateProvider.tsx` read] |
| Camera/snapshot/legend composition state | Browser / Client | — | Separate composition state avoids contaminating color Undo/Redo and supports future scene layers. [VERIFIED: `02-CONTEXT.md` D-18–D-19 and D-29] |
| Complete saved compositions | Browser / Client | Browser localStorage | Validation/migration occurs in client utilities; persistence remains origin-local. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage] |
| PNG capture/download | Browser / Client | — | html2canvas, canvas encoding, Blob URLs, and download handoff are browser-local. [CITED: https://html2canvas.hertzen.com/configuration] |
| Historical preprocessing | Build-time tooling | CDN / Static | Geometry cleanup, IDs, hashes, and manifests must happen before assets reach runtime. [CITED: https://mapshaper.org/docs/reference.html] |

## Standard Stack

### Core

| Library | Version / Publish Date | Purpose | Why Standard |
|---------|------------------------|---------|--------------|
| React | 18.3.1 / 2024-04-26 | Application, composition, accessibility, and responsive state | Locked Phase 1 version; do not upgrade to React 19 in this phase. [VERIFIED: codebase + npm registry] |
| D3 | 7.9.0 / 2024-03-12 | Projection, path generation, spherical bounds, zoom gestures, SVG joins | Existing dependency; official APIs directly cover zoom transforms, constraints, pointer anchoring, path generation, and spherical bounds. [VERIFIED: npm registry + official D3 docs] |
| html2canvas | 1.4.1 / 2022-01-22 | Deterministic PNG capture of the export frame | Locked Phase 1 export path with tested download/cleanup behavior. [VERIFIED: codebase + npm registry] |
| localStorage | Browser API | Max-10 versioned composition persistence | Locked local-only storage boundary; origin scoped and persistent across sessions when browser policy permits. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage] |
| Natural Earth | 5.1.1 | Modern world geometry and source policy | Public-domain current Admin-0 data with 10m/50m resolution and default de-facto POV. [CITED: https://www.naturalearthdata.com/about/terms-of-use/] |

### Supporting

| Library | Version / Publish Date | Purpose | When to Use |
|---------|------------------------|---------|-------------|
| `mapshaper` | 0.7.48 / 2026-07-24 | Build-only geometry clean/dissolve/clip/erase/simplify and deterministic conversion | Use in preprocessing scripts, never in the browser bundle. Pin every tolerance and command order. [VERIFIED: npm registry + official docs + slopcheck OK] |
| Vitest | 4.1.10 / 2026-07-06 | Pure camera/data/legend/storage/export unit tests | Keep the existing source-scoped, non-watch unit suite. [VERIFIED: codebase + npm registry] |
| `@playwright/test` | 1.61.1 / 2026-06-23 | Browser regression tests for drag/wheel/keyboard/export parity in installed Chrome and Edge | Add as a dev dependency and use `channel: 'chrome'` and `channel: 'msedge'`; do not download replacement branded browsers. [VERIFIED: npm registry + official Playwright docs + slopcheck OK] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fixed Mercator + repeated worlds | Equirectangular | Equirectangular has finite true poles but a 2:1 world leaves unavoidable vertical space in a square at whole-world fit; Mercator produces a square world and simpler vertical clamps, at the cost of clipping beyond about ±85.051°. [CITED: https://d3js.org/d3-geo/projection] |
| Fixed Mercator + repeated worlds | Natural Earth / azimuthal projection | These are attractive static projections but do not repeat by a simple constant horizontal translation, so continuous date-line wrapping would require per-frame reprojection/rotation. [CITED: https://d3js.org/d3-geo/projection] |
| Hybrid 50m base + selected 10m supplements | Full 10m world | The official 10m file is 13,287,234 bytes and 548,471 coordinate positions versus 3,083,490 bytes and 99,613 positions at 50m; three wrapped 10m copies create unnecessary path/memory cost for 1080px output. [VERIFIED: official Natural Earth v5.1.1 source + local analysis] |
| SVG legend overlay | Absolutely positioned HTML legend | HTML is easier to edit, but responsive CSS pixels can diverge from the canonical 1080 viewBox during 540px scale-2 export; SVG keeps camera-independent placement and export scaling deterministic. [VERIFIED: current export architecture + code analysis] |
| Playwright | Hand-written CDP/WebSocket harness | Raw CDP would duplicate browser automation, waiting, cleanup, and assertions; Playwright already supports Chrome/Edge channels and wheel/keyboard automation. [CITED: https://playwright.dev/docs/browsers] |

**Installation:**
```bash
npm install --save-dev --save-exact mapshaper@0.7.48 @playwright/test@1.61.1
```

Do not run `npx --yes`; after installation use the local `playwright` binary through an npm script. No Playwright browser download is required when testing the already installed Chrome and Edge channels. [CITED: https://playwright.dev/docs/browsers]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `mapshaper` | npm | Created 2013-07-12 | 91,028/week (2026-07-16–22) | https://github.com/mbloch/mapshaper | OK; Windows wrapper failed only after the verdict while trying to invoke npm | Approved, exact-pin 0.7.48. [VERIFIED: npm registry + official docs + slopcheck] |
| `@playwright/test` | npm | Created 2020-09-24 | 47,648,368/week (2026-07-16–22) | https://github.com/microsoft/playwright | OK; Windows wrapper failed only after the verdict while trying to invoke npm | Approved, exact-pin 1.61.1. [VERIFIED: npm registry + official docs + slopcheck] |

**Packages removed due to slopcheck [SLOP] verdict:** none.

**Packages flagged as suspicious [SUS]:** none.

Neither package publishes a registry `postinstall` script in the checked metadata. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Bundled modern data + core/parent manifest + snapshot manifest
                           |
                           v
                 Validation / normalization
                           |
              +------------+-------------+
              |                          |
              v                          v
      Modern fallback scene      Historical overlay scene
              |                          |
              +------------+-------------+
                           v
                  Stable entity/color model
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
  Color reducer      Camera controller   Legend composition
 (50-action undo)   (live transform ref)  (derived + edits)
        |                  |                  |
        +------------------+------------------+
                           v
                Canonical SVG composition
        [camera group: repeated worlds] + [legend overlay]
                           |
             +-------------+-------------+
             |                           |
             v                           v
      Responsive live editor      Freeze + sanitize clone
                                             |
                                             v
                               html2canvas 540 × 540 @ 2x
                                             |
                                             v
                                  exact opaque 1080 PNG

Complete composition assembler
(colors + semantic camera + snapshotId + legend + visible settings)
                           |
                           v
           versioned localStorage adapter and V1 migration
```

The architecture keeps path generation out of camera frames, camera movement out of color history, and persisted geometry out of localStorage. [VERIFIED: codebase constraints + D3 transform model]

### Recommended Project Structure

```text
public/data/
├── world-modern.geojson              # normalized hybrid 50m + 10m supplements
├── world-manifest.json               # source hashes, 195 core, parent/neutral policy
└── snapshots/
    ├── index.json                    # labels, dates/eras, coverage, hashes, licenses
    └── <snapshot-id>.geojson         # curated overlay only; modern remains base
scripts/
├── prepareWorldData.mjs
└── prepareHistoricalSnapshot.mjs
src/
├── types/
│   ├── map.ts
│   └── composition.ts
├── constants/
│   ├── camera.ts
│   └── snapshots.ts
├── providers/
│   └── CompositionStateProvider.tsx
├── hooks/
│   ├── useCameraController.ts
│   ├── useCompositionState.ts
│   └── useSnapshotData.ts
├── components/
│   ├── MapNavigation.tsx
│   ├── PeriodSelector.tsx
│   ├── LegendOverlay.tsx
│   └── LegendEditor.tsx
└── utils/
    ├── camera.ts
    ├── legend.ts
    ├── scene.ts
    ├── compositionStorage.ts
    └── historicalValidation.ts
tests/e2e/
└── phase2-composition.spec.ts
```

This extends rather than replaces `MapCanvas`, `MapWorkspace`, `useMapState`, `useGeoData`, `storage.ts`, and `export.ts`. [VERIFIED: codebase read]

### Pattern 1: Fixed Projection, Transform-Only Camera, Three Wrapped Copies

**What:** Generate each feature's SVG `d` once with a canonical Mercator projection. Put three copies at base offsets `-1080`, `0`, and `+1080` inside one camera group. Apply `translate(x y) scale(k)` to the camera group; normalize `x` modulo `1080k` and clamp `y`. [CITED: https://d3js.org/d3-zoom] [CITED: https://d3js.org/d3-geo/projection]

**When to use:** Every pan, wheel, pinch, Locate, Reset View, load, and export operation.

**Recommended constants:**
```typescript
const WORLD_SIZE = 1080;
const MIN_ZOOM = 1;
const MAX_ZOOM = 24; // Validate on real mouse, trackpad, touch, and small-state Locate flows.
const DRAG_CLICK_DISTANCE = 4;
const MERCATOR_MAX_LATITUDE = 85.05112878;
```

`MIN_ZOOM = 1` is mathematically required to prevent more than one complete world copy from fitting horizontally. `MAX_ZOOM = 24` is the resolved implementation value; Chrome/Edge/smallest-state acceptance may reject it only through an explicit corrective gap-closure plan. [CITED: https://d3js.org/d3-zoom] [RESOLVED]

```typescript
// Derived from D3's documented transform matrix and custom constrain API.
function constrainWrappedCamera(transform: ZoomTransform): ZoomTransform {
  const worldSpan = WORLD_SIZE * transform.k;
  const normalizedX = -((((-transform.x) % worldSpan) + worldSpan) % worldSpan);
  const minimumY = WORLD_SIZE - worldSpan;
  const clampedY = Math.min(0, Math.max(minimumY, transform.y));
  return zoomIdentity.translate(normalizedX, clampedY).scale(transform.k);
}
```

D3 `zoom.transform` does not enforce configured scale/translate extents, so Reset View, Locate, and load must pass their target through the same canonical constraint before applying it. [CITED: https://d3js.org/d3-zoom]

### Pattern 2: Semantic Camera Persistence

**What:** Persist `{ zoom, centerLongitude, centerLatitude }`, not raw repeated-world translation. Canonicalize longitude to `[-180, 180)`, clamp latitude to Mercator limits, and derive the exact transform from the fixed projection and viewport center. [CITED: https://d3js.org/d3-geo/projection]

**When to use:** Save/load, responsive remount, Reset View, Locate, future timeline keyframes, and deterministic tests.

```typescript
interface CameraState {
  zoom: number;
  centerLongitude: number;
  centerLatitude: number;
}

function cameraToTransform(camera: CameraState, projection: GeoProjection): ZoomTransform {
  const projected = projection([
    camera.centerLongitude,
    camera.centerLatitude,
  ]);
  if (projected === null) {
    return zoomIdentity;
  }

  return constrainWrappedCamera(
    zoomIdentity
      .translate(WORLD_SIZE / 2, WORLD_SIZE / 2)
      .scale(camera.zoom)
      .translate(-projected[0], -projected[1]),
  );
}
```

### Pattern 3: Live Camera Ref with React Commit Boundary

**What:** A focused React hook owns the live transform ref, current semantic camera state, D3 behavior, RAF/transition handles, and imperative controller. D3 gesture listeners update only the camera group's transform and the hook's ref; `end` commits semantic camera state to React. [CITED: https://d3js.org/d3-zoom]

**When to use:** High-frequency camera input where parent React rerenders would be wasteful.

The controller surface should be narrow:
```typescript
interface CameraController {
  resetView: (animate: boolean) => void;
  locate: (feature: GeoFeature, animate: boolean) => void;
  freezeAndSnapshot: () => CameraState;
  restore: (camera: CameraState) => void;
}
```

`freezeAndSnapshot` must cancel D3 transitions, cancel queued RAF work, set an interaction lock, read the current SVG transform, convert it to semantic state, and return it synchronously before export cloning begins. [VERIFIED: current export activation flow + D3 transition lifecycle]

### Pattern 4: Antimeridian-Safe Locate

**What:** Use `geoBounds` and `geoCentroid`; treat `west > east` as a wrapped longitude interval. Choose the wrapped copy nearest the current camera center, fit with padding, and clamp the resulting zoom. [CITED: https://d3js.org/d3-geo/math]

**When to use:** Separate Locate buttons and future programmatic camera moves.

Do not compute longitude width with `east - west` alone and do not use the planar arithmetic mean of vertices. [CITED: https://d3js.org/d3-geo/math]

### Pattern 5: Layered Scene with Logical IDs and Color Owners

**What:** Separate source geometry identity from logical color identity.

```typescript
interface SceneFeature extends GeoFeature {
  sourceFeatureId: string;
  entityId: string;
  colorOwnerId: string | null;
  isSelectable: boolean;
  boundaryMode: 'modern' | 'historical' | 'modern-fallback';
  provenanceId: string;
}
```

Core states use the canonical 195-state ID. Clear dependencies set `colorOwnerId` to the parent core ID. Disputed/indeterminate units remain visible but use `null`, remain white, and are not selectable. Historical entities reuse a stable ID only when the curator explicitly establishes identity continuity; otherwise they receive a snapshot-independent historical ID and start white. [VERIFIED: `02-CONTEXT.md` D-12–D-14 and D-22]

### Pattern 6: SVG Legend Outside the Camera Group

**What:** Render the visible legend as a React-owned SVG `<g data-layer="legend">` after the D3-owned camera group. Store its top-left position in canonical 1080 viewBox units. Edit labels/styles in a semantic HTML panel outside the canvas; drag the SVG legend directly for positioning. [VERIFIED: React/D3 ownership rule + export architecture]

**When to use:** Live display and export.

The legend should use deterministic SVG primitives (`rect`, `circle`/`rect` swatches, `text`) and solid or RGBA fills/borders. Do not use `filter`, `box-shadow`, or `backdrop-filter` in the exported legend because html2canvas explicitly does not support `filter`/`box-shadow` and does not list `backdrop-filter`. [CITED: https://html2canvas.hertzen.com/features]

### Pattern 7: Complete Composition Loading as One Coordinated Intent

**What:** Validate the entire V2 record first, load/resolve the snapshot asset, then synchronously batch color load, composition load, camera restore, and feedback. Loading resets color history but does not add camera steps to it. [VERIFIED: React 18 batching + existing `LOAD_STATE` behavior]

**When to use:** Saved composition load and legacy migration load.

Avoid updating colors, camera, snapshot, and legend from independent component effects; partial load states can produce a wrong export if the user activates Export between effects. [VERIFIED: codebase flow analysis]

### Anti-Patterns to Avoid

- **Reprojecting every path on every pan/zoom frame:** it turns camera movement into hundreds of geometry traversals; transform the camera group instead. [CITED: https://d3js.org/d3-zoom]
- **Using `translateExtent` alone for wrapping:** its default purpose is finite clamping, not modulo wrap; use `zoom.constrain`. [CITED: https://d3js.org/d3-zoom]
- **Persisting raw unbounded `x` wrap offsets:** equivalent views can serialize differently and accumulate precision loss; persist semantic center/zoom. [VERIFIED: camera math analysis]
- **Giving all three world copies ARIA roles/tab stops:** that creates duplicate countries for assistive technology; only one logical copy is accessible, while visual copies are `aria-hidden` and pointer-capable. [VERIFIED: accessibility architecture analysis]
- **Inferring core membership or parentage from `ADMIN`, `SOVEREIGNT`, or display names at runtime:** Natural Earth uses custom A3 values and includes disputed/indeterminate units; use reviewed manifests. [CITED: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-details/]
- **Using raw historical source IDs as color keys:** source IDs change across datasets; curate stable logical entity IDs. [VERIFIED: historical source comparison]
- **Rendering stored labels with `innerHTML` or D3 `.html`:** stored legend labels/map names are untrusted; React text nodes or D3 `.text` prevent stored XSS. [CITED: https://owasp.org/www-community/attacks/xss/]

## Modern World Data Recommendation

### Resolution and Source Composition

Use Natural Earth 5.1.1 `ne_50m_admin_0_countries.geojson` as the base. The official source has 242 features, 3,083,490 bytes, and 99,613 coordinate positions; it contains all 195 recommended core IDs. [VERIFIED: official Natural Earth v5.1.1 source + local analysis]

Pin the exact 50m source SHA-256:

```text
3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb
```

Add these 1:10m source features because they are dependencies/overseas territories absent at 50m: `ESB` (Dhekelia), `WSB` (Akrotiri), `UMI`, `CSI`, `CLP`, and `GIB`. The first five inherit reviewed parent colors; `GIB` remains non-selectable and neutral because Natural Earth classifies it as disputed. [VERIFIED: official Natural Earth v5.1.1 source + local analysis]

The normalized runtime asset therefore targets 248 geographic units: 195 selectable core states, 47 non-core 50m units, and six 10m supplements. [VERIFIED: official source + local analysis]

### Canonical 195-State IDs

The core is the 193 UN member states plus the Holy See and State of Palestine, using ISO alpha-3-style IDs as the application's stable logical keys. The list below contains exactly 195 unique codes and was cross-checked against the UN membership/observer pages and Natural Earth 5.1.1. [CITED: https://www.un.org/en/about-us/member-states] [CITED: https://www.un.org/en/about-us/non-member-states] [VERIFIED: official Natural Earth source + local analysis]

```text
AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN
BOL BIH BWA BRA BRN BGR BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG COD
CRI CIV HRV CUB CYP CZE PRK DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST SWZ ETH FJI
FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN
IRQ IRL ISR ITA JAM JPN JOR KAZ KEN KIR KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU
LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM MCO MNG MNE MAR MOZ MMR NAM NRU
NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT QAT KOR
MDA ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM
ZAF SSD ESP LKA SDN SUR SWE CHE SYR TJK THA TLS TGO TON TTO TUN TUR TKM TUV UGA
UKR ARE GBR TZA USA URY UZB VUT VEN VNM YEM ZMB ZWE PSE VAT
```

Use an explicit join table for Natural Earth exceptions. At minimum, `SSD` joins source `ADM0_A3='SDS'` through `ISO_A3='SSD'`, and `PSE` joins `ADM0_A3='PSX'` through `ISO_A3='PSE'`; France and Norway use `ADM0_A3` because their source `ISO_A3` is a sentinel. Cyprus must join its actual country feature by `ADM0_A3='CYP'`, not the separate Cyprus no-man's-area unit. [VERIFIED: official Natural Earth v5.1.1 source + local analysis]

Keep M49 as metadata, not the existing color key, to avoid a destructive Phase 1 ID migration. M49 codes are fixed-width three-digit strings and the UN table also supplies ISO alpha-3 metadata. [CITED: https://unstats.un.org/unsd/methodology/m49/]

### Parent/Neutral Policy

Generate parent candidates from Natural Earth at build time, then compare exact output with a checked-in reviewed manifest. Clear inherited groups are Australia, China, Denmark, Finland, France, United Kingdom, Netherlands, United States, and selected New Zealand units. [VERIFIED: official Natural Earth source + local analysis]

Do not automatically inherit colors for Natural Earth `TYPE='Disputed'` or `TYPE='Indeterminate'`. Keep Antarctica, Kosovo, Northern Cyprus, Siachen Glacier, Somaliland, Taiwan, Western Sahara, Falkland Islands, British Indian Ocean Territory, and Gibraltar non-selectable and neutral unless a later explicit political-policy decision says otherwise. [VERIFIED: official Natural Earth source + D-14]

Cook Islands and Niue follow the resolved ambiguous-association policy: visible, non-selectable, and no inherited color unless a reviewed manifest mapping is explicitly approved. [RESOLVED]

### Deterministic Validation

The world preparation check must fail on any of the following: source hash mismatch; core count not exactly 195; duplicate logical/source IDs; missing core join; parent ID outside the core; selectable non-core unit; historical/modern ID collision; invalid geometry; non-finite path; unsupported geometry; source supplement count drift; output-byte drift; or runtime asset containing unused source properties. [VERIFIED: existing deterministic pipeline pattern]

The runtime validator must allow latitude exactly ±90 because valid world/Antarctic geometry may touch a pole; projection/path safety, not input rejection, should handle Mercator clipping. The current Phase 1 validator uses strict `>`/`<` and must be targeted for correction. [VERIFIED: `src/utils/geojson.ts` + D3 Mercator local probe]

## Historical Snapshot Strategy

### Source Assessment

| Source | What It Can Supply | License / Reliability | Recommendation |
|--------|---------------------|-----------------------|----------------|
| Natural Earth 5.1.1 | Current political geography | Public domain; default de-facto POV; not a time-indexed historical atlas. [CITED: https://www.naturalearthdata.com/about/terms-of-use/] | Modern fallback only. |
| OpenHistoricalMap | Date-tagged boundaries queryable by day/year; GeoJSON export through OHM Overpass | Generally CC0, with feature-level `license`, `source`, and `attribution` exceptions; completeness depends on what contributors mapped. [CITED: https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass] | Primary open extraction candidate, but validate every feature and license tag. |
| CShapes 2.0 | Worldwide states/dependencies, 1886–2019 | CC BY-NC-SA 4.0; commercial use is not permitted. [CITED: https://beta.icr.ethz.ch/data/cshapes/] | Reference/validation only unless the project's use is confirmed noncommercial or permission is obtained. |
| Historical Basemaps | Convenient exact-year GeoJSON including 1492, 1700, 1815, and 1914 | GPL-3.0 repository; explicitly work in progress and asks users to cross-check. [CITED: https://github.com/aourednik/historical-basemaps] | Geometry research seed only after license review; never call it authoritative. |
| Euratlas | Detailed historical European vector atlas | Standard licenses restrict vector redistribution and commercial/site use. [CITED: https://www.euratlas.net/shop/licences/licence_gis_gb.pdf] | Do not bundle without a negotiated license. |
| Library of Congress / Wikimedia Commons item pages | Public-domain/CC0/CC BY historical map images suitable for manual tracing and cross-checking | Rights are item-specific; check each Rights Advisory or file license. [CITED: https://www.loc.gov/collections/general-maps/about-this-collection/rights-and-access/] | Use a whitelist of reviewed items with recorded rights and attribution. |

### Recommended Snapshot Catalog

Target exact snapshots `1492`, `1700`, `1815`, and `1914`, plus `modern`. The years are the resolved implementation catalog, while every historical entry remains excluded from production until its source/license/historical review and atomic promotion pass. [RESOLVED]

Each snapshot manifest entry must include:

```typescript
interface SnapshotManifestEntry {
  id: string;
  label: string;
  asOf: string;
  assetPath: string;
  sha256: string;
  coverageRegions: ReadonlyArray<string>;
  sourceRecords: ReadonlyArray<{
    url: string;
    license: string;
    accessedOn: string;
    attribution: string | null;
  }>;
  reviewStatus: 'draft' | 'source-reviewed' | 'historian-reviewed';
  fallbackLabel: string;
}
```

Only `historian-reviewed` entries appear in the normal selector; draft/source-reviewed assets remain development evidence and cannot be promoted. [VERIFIED: UI-SPEC and approval-gated plans]

### Composition Model

Keep the modern world layer mounted as fallback. For the selected snapshot, render opaque historical polygons above it only in curated coverage areas. Opaque historical fills naturally cover modern internal strokes beneath; a preprocessing review must detect coast mismatches, slivers, gaps, and overlap artifacts. [VERIFIED: SVG paint order + scene analysis]

Every historical feature carries a curated `entityId`. Reuse a core ID only when the feature represents the same continuing entity. Reuse one historical ID across snapshots when the same historical polity continues. Do not store predecessor/successor guesses. [VERIFIED: `02-CONTEXT.md` D-22]

The UI should show the selector label and a persistent status such as “Historical coverage: Iberia, Poland-Lithuania; all other geography uses modern borders,” and tooltips should identify `Historical boundary` versus `Modern fallback`. [VERIFIED: `02-CONTEXT.md` D-21]

### Crossfade

Keep outgoing and incoming complete scene groups for a short opacity crossfade; do not interpolate path geometry. Set duration to 0 under `prefers-reduced-motion`. Before export, remove the outgoing scene and force the selected scene to opacity 1 so the PNG is a finished logical snapshot, not an incidental half-blend. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html] [VERIFIED: `02-CONTEXT.md` D-23 and D-08]

### Timeline Reality

The historical engine, manifest, source pipeline, and one source-complete snapshot are technically feasible within the phase. Four verified snapshots across Poland/Lithuania/Hungary/Balkans/Iberia/Scandinavia require licensing review, geometry curation, edge repair, identity decisions, and human historical validation; no source found removes that work. The planner should split this into Phase 2A platform and Phase 2B data curation, or explicitly reduce historical acceptance rather than claiming unsupported completion. [VERIFIED: source assessment above]

## Legend Model

Derive active legend colors from the effective current scene fills, not merely `state.colors`, so inherited dependencies and current historical entities agree with the visible map. White is omitted. Canonical colors are uppercase `#RRGGBB`. [VERIFIED: D-24–D-25 + existing color normalization]

Use color as the legend metadata key:

```typescript
interface LegendEntryState {
  color: string;
  label: string;
  order: number;
}

interface LegendState {
  entries: Readonly<Record<string, LegendEntryState>>;
  position: { x: number; y: number; preset: 'tl' | 'tr' | 'bl' | 'br' | null };
  theme: 'light' | 'dark' | 'minimal';
  textSize: number;
  backgroundOpacity: number;
  borderStyle: 'none' | 'solid';
}
```

When a color first becomes active, append it and use its uppercase hex value as the label. When it becomes unused, hide it but retain metadata in a dormant cache; if it returns, restore its label/order. Persist the dormant metadata so temporary recoloring does not destroy creator labels. [VERIFIED: UI-SPEC]

Store position in 1080 viewBox units and clamp against the measured SVG legend bounds. Corner presets compute from named insets; direct drag clears `preset`. Provide corner buttons and directional nudge buttons so all drag functions also work by click/tap and keyboard. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html]

Cap label length and entry count at validation boundaries. The binding UI contract uses one column for 1–8 entries, two for 9–16, and three for 17–30, with deterministic wrapping and export blocking when content cannot fit. [VERIFIED: UI-SPEC]

## Exact Export Architecture

1. Acquire an export activation lock before any asynchronous work. [VERIFIED: existing `src/App.tsx` pattern]
2. Call `cameraController.freezeAndSnapshot()` synchronously; interrupt D3 transitions and cancel camera RAF work. [CITED: https://d3js.org/d3-zoom]
3. Finalize the selected historical scene, disable crossfade transitions, and ensure legend measurement/layout is committed. [VERIFIED: scene architecture]
4. Clone the SVG with its current camera `transform` attribute and legend group. Keep the canonical `viewBox="0 0 1080 1080"`. [VERIFIED: existing export code]
5. In the clone, remove `[data-editor-only]`, outgoing scenes, hover/focus/selection classes, tooltips, navigation indicators, drag handles, and accessibility-only duplicate artifacts. [VERIFIED: D-08]
6. Preserve geography fills, borders, historical/fallback geometry, current camera transform, composition background, and legend. [VERIFIED: D-07–D-11]
7. Capture the 540×540 frame at scale 2, reject any canvas not exactly 1080×1080, encode with `toBlob`, connect/click the anchor, wait the existing bounded handoff, and clean every resource in `finally`. [VERIFIED: current export code and rule]

Use SVG transform attributes, not CSS transforms, for the camera and legend. html2canvas documents only limited CSS transform support. [CITED: https://html2canvas.hertzen.com/features]

### Export Parity Tests

- A normal centered whole-world view exports the exact current transform and legend position. [VERIFIED: D-07 and D-10]
- A Pacific-centered view containing geometry from adjacent wrap copies exports without a seam/gap. [VERIFIED: D-07]
- Export during animated Locate freezes the last painted camera frame, not the animation target. [VERIFIED: D-09]
- Export during snapshot crossfade produces the selected finished snapshot only. [VERIFIED: D-08 and D-23]
- Selection/focus/hover/tooltip/navigation controls are absent while inherited territory colors remain. [VERIFIED: D-08 and D-13]
- Output is 1080×1080, opaque, and equal across device-pixel ratios. [VERIFIED: D-11]

## Persistence and Migration

### V2 Schema

Keep `countriesirl_maps` and the max-10 newest-first replace-by-name policy. Add an explicit record version and composition payload; never persist geometry or path strings. [VERIFIED: existing storage code + D-19]

```typescript
interface SavedCompositionV2 {
  schemaVersion: 2;
  name: string;
  timestamp: number;
  composition: {
    colors: ColorMap;
    camera: CameraState;
    snapshotId: string;
    legend: LegendState;
    background: '#FFFFFF';
  };
}
```

Selection, hover, focus, tooltips, open dialogs, and transient outgoing crossfade state are editor state and must not be persisted. [VERIFIED: D-08 + composition analysis]

### Legacy V1 Migration

Recognize a record with `{name, colors, timestamp}` and no `schemaVersion` as V1. Validate it with the existing partial-recovery behavior, then create an in-memory V2 record with whole-world camera, `modern` snapshot, auto-generated legend metadata, default legend theme/position, and white background. [VERIFIED: existing schema + D-19]

Do not rewrite localStorage merely because the Save/Load dialog listed or loaded a legacy record. Rewrite it as V2 on the creator's next explicit save/replace action; this avoids a silent destructive write and preserves recovery if the new serializer fails. [VERIFIED: UI-SPEC]

Add typed warnings for `legacy-migrated`, `unsupported-version`, `snapshot-unavailable`, and nested composition repair. Preserve valid neighboring records and valid nested subsets where safe. [VERIFIED: existing partial-recovery contract]

Validation limits should cover finite/clamped camera numbers, known snapshot IDs, canonical colors, reserved object keys, label length, entry count, order uniqueness, theme/style enums, position bounds, and finite opacity/text size. [VERIFIED: existing security/validation pattern]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Browser-origin `countriesirl_maps` may contain Phase 1 V1 records with only name/colors/timestamp. [VERIFIED: `src/utils/storage.ts`] | Code migration on read plus V2 rewrite on explicit save; no bulk external data migration. |
| Live service config | None—no backend, cloud service, deployment, analytics, or server-side configuration belongs to this localhost phase. [VERIFIED: `02-CONTEXT.md` D-28] | None. |
| OS-registered state | None identified; the app has no service, scheduled task, global package, or registered protocol handler. [VERIFIED: project files and instructions] | None. |
| Secrets/env vars | None required; `.env.local` is not needed and Phase 2 forbids secret-driven product behavior. [VERIFIED: `CLAUDE.md` + D-28] | None. |
| Build artifacts | Existing `dist/` represents Phase 1 and must be rebuilt after Phase 2; no service worker cache exists. [VERIFIED: build output + project decisions] | Run production build and browser tests against the Phase 2 build. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mouse/wheel/touch/pinch gesture recognizer | Custom pointer cache and wheel scaling | D3 zoom | It already handles drag, wheel, touch, pinch midpoint, event lifecycle, click suppression, and constraints. [CITED: https://d3js.org/d3-zoom] |
| Spherical antimeridian bounds | Raw min/max longitude loops | `geoBounds`/`geoCentroid` | Longitude is circular and wrapped bounds can have west > east. [CITED: https://d3js.org/d3-geo/math] |
| Polygon repair/clip/dissolve/simplification | Ad-hoc coordinate surgery | Build-only `mapshaper` | Topology repair and sliver/intersection handling are specialized and order-sensitive. [CITED: https://mapshaper.org/docs/reference.html] |
| Canonical 195 detection | Name matching or `TYPE` filtering at runtime | Checked-in core manifest | UN membership and Natural Earth feature classification are different concepts. [CITED: https://www.un.org/en/about-us/member-states] |
| Dependency parent inference | Blind `SOV_A3` mapping | Reviewed parent manifest | Disputed, associated, lease, and custom-code cases need policy review. [VERIFIED: official Natural Earth source analysis] |
| Historical predecessor color transfer | Fuzzy name matching | Explicit stable historical IDs | D-22 forbids heuristic backward projection. [VERIFIED: `02-CONTEXT.md`] |
| HTML sanitization for legend labels | Regex sanitizer or `innerHTML` | React text nodes / D3 `.text` | Context-appropriate escaping prevents stored XSS. [CITED: https://owasp.org/www-community/attacks/xss/] |
| Browser automation | Raw CDP socket lifecycle | Playwright Test | It supplies isolation, assertions, retries/traces, browser channels, and input APIs. [CITED: https://playwright.dev/docs/intro] |

**Key insight:** The difficult parts are not drawing paths; they are canonical identity, wrap-equivalent camera math, topology/provenance, export transaction boundaries, and recovery from untrusted persisted state.

## Common Pitfalls

### Pitfall 1: Date-Line Wrap Looks Correct but Click/Locate Uses the Wrong Copy
**What goes wrong:** A country rendered from the adjacent copy is clicked, then Locate jumps one world away or export serializes an unnormalized offset. [VERIFIED: wrapped-scene analysis]

**Why it happens:** Visual copy offsets leak into logical identity/camera state.

**How to avoid:** Keep copy index separate from `entityId`, normalize camera longitude/translation, and choose the target copy nearest the current center.

**Warning signs:** Raw `x` grows without bound; clicking Fiji near the right edge recenters to the left edge.

### Pitfall 2: Vertical Clamp Uses the Wrong Coordinate Space
**What goes wrong:** Empty space appears above/below the Mercator world at higher zoom. [VERIFIED: D3 transform math]

**Why it happens:** Clamp calculations mix unscaled base units and screen-space transformed units.

**How to avoid:** For a 1080-square base, clamp transformed `y` to `[1080 - 1080k, 0]` after every user/programmatic transform.

**Warning signs:** Reset works but Locate can pan beyond a pole.

### Pitfall 3: Drag Selects a Country
**What goes wrong:** Releasing after a pan also triggers the country click handler.

**Why it happens:** Country click and zoom gesture share the SVG surface.

**How to avoid:** Configure `zoom.clickDistance(4)` and test mouse, pen, and touch; stop legend pointer events before they reach zoom. [CITED: https://d3js.org/d3-zoom]

**Warning signs:** Accidental selection after short pans.

### Pitfall 4: Export Captures the Target Instead of the Visible Frame
**What goes wrong:** Export during Locate captures the final destination or a stale React state instead of the last painted frame.

**Why it happens:** React state and D3 transition DOM are at different points in time.

**How to avoid:** Freeze synchronously from the live SVG transform/ref before awaiting anything; lock input first.

**Warning signs:** Repeated exports during a transition differ unpredictably.

### Pitfall 5: Wrapped Visual Copies Become Duplicate Accessible Countries
**What goes wrong:** Screen readers encounter 585 country options and duplicate IDs/titles.

**Why it happens:** All three visual copies inherit roles/tabindex/labels.

**How to avoid:** One logical accessible copy; clones are `aria-hidden`, non-focusable, uniquely keyed, and pointer handlers map back to one logical ID.

**Warning signs:** Repeated country announcements or duplicate DOM IDs.

### Pitfall 6: 50m Omits Territory Units
**What goes wrong:** The core count passes but Akrotiri/Dhekelia, UMI, Coral Sea Islands, Clipperton, or Gibraltar vanish.

**Why it happens:** 50m generalizes away units present at 10m.

**How to avoid:** Verify cross-resolution IDs and include the six reviewed 10m supplements. [VERIFIED: official Natural Earth source analysis]

**Warning signs:** Source unit count changes from the expected 248 runtime units.

### Pitfall 7: Historical Overlay Leaves Ghost Modern Borders
**What goes wrong:** Modern country strokes show through gaps or slivers beneath historical polygons.

**Why it happens:** Historical coastlines do not fully cover modern polygons or geometry is invalid.

**How to avoid:** Opaque fills, topology cleaning, overlap/sliver checks, and visual edge review at each coverage boundary.

**Warning signs:** Thin modern lines inside a white historical entity.

### Pitfall 8: Legacy Saves Are Rewritten Too Early
**What goes wrong:** Opening the dialog rewrites recoverable V1 data and a V2 serialization failure loses it.

**Why it happens:** Migration and persistence are conflated.

**How to avoid:** Migrate in memory; write only on explicit save/replace. [VERIFIED: UI-SPEC]

**Warning signs:** Storage writes occur during list/load.

### Pitfall 9: Legend Uses CSS Effects html2canvas Cannot Reproduce
**What goes wrong:** Live blur/shadow disappears or differs in PNG.

**Why it happens:** html2canvas does not support `filter` or `box-shadow` and has limited transform support. [CITED: https://html2canvas.hertzen.com/features]

**How to avoid:** SVG primitives and export-safe solid/RGBA styling in the composition; reserve glass blur for editor chrome outside export.

**Warning signs:** Screenshot comparison shows missing blur or shadow.

### Pitfall 10: Touch Surface Prevents Page Access
**What goes wrong:** `touch-action: none` on a large ancestor blocks page scrolling or browser zoom beyond the map.

**Why it happens:** The declaration is scoped too broadly.

**How to avoid:** Apply it only to the interactive square, provide all controls outside it, handle cancellation, and test 360px layouts. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action]

**Warning signs:** Mobile users cannot scroll past the canvas.

### Pitfall 11: Current Dirty Workspace Lint Is Misread as a Product Regression
**What goes wrong:** `npm run lint` scans untracked nested verification roots under `.planning/ui-reviews` and fails with multiple `tsconfigRootDir` candidates. [VERIFIED: local lint run 2026-07-24]

**Why it happens:** ESLint currently scans the whole repository while planning evidence contains nested project configs.

**How to avoid:** Wave 0 should source-scope lint to product/config/script paths or explicitly ignore `.planning/**` and `.claude/**`; do not delete user evidence. Validate product code in a clean exact-commit worktree for final evidence.

**Warning signs:** Hundreds of parser errors include planning verification copies rather than changed source files.

## Code Examples

### D3 Zoom Setup

```typescript
// Source APIs: https://d3js.org/d3-zoom
const zoomBehavior = zoom<SVGSVGElement, unknown>()
  .scaleExtent([MIN_ZOOM, MAX_ZOOM])
  .clickDistance(DRAG_CLICK_DISTANCE)
  .constrain((transform) => constrainWrappedCamera(transform))
  .filter((event: Event): boolean => {
    const target = event.target;
    return (
      target instanceof Element &&
      target.closest('[data-legend]') === null &&
      !('button' in event && event.button !== 0)
    );
  })
  .on('zoom.camera', (event): void => {
    cameraTransformRef.current = event.transform;
    cameraLayer.attr('transform', event.transform.toString());
  })
  .on('end.camera', (event): void => {
    commitCamera(transformToCamera(event.transform));
  });
```

### Active Legend Reconciliation

```typescript
function reconcileLegend(
  effectiveColors: ReadonlyArray<string>,
  previous: LegendState,
): LegendState {
  const activeColors = [...new Set(effectiveColors)]
    .filter((color): boolean => color !== '#FFFFFF');

  let nextOrder = Object.keys(previous.entries).length;
  const entries = { ...previous.entries };

  activeColors.forEach((color): void => {
    if (entries[color] === undefined) {
      entries[color] = { color, label: color, order: nextOrder };
      nextOrder += 1;
    }
  });

  return { ...previous, entries };
}
```

This retains dormant entry metadata while the renderer filters to active colors. [VERIFIED: D-24–D-25; lifecycle choice is ASSUMED]

### Legacy Migration

```typescript
function migrateSavedRecord(value: unknown): StorageResult<SavedCompositionV2> {
  const v2 = parseSavedCompositionV2(value);
  if (v2.ok) {
    return v2;
  }

  const legacy = parseSavedMapV1(value);
  if (!legacy.ok) {
    return legacy;
  }

  return {
    ok: true,
    value: {
      schemaVersion: 2,
      name: legacy.value.name,
      timestamp: legacy.value.timestamp,
      composition: {
        colors: legacy.value.colors,
        camera: INITIAL_WORLD_CAMERA,
        snapshotId: 'modern',
        legend: createDefaultLegend(legacy.value.colors),
        background: '#FFFFFF',
      },
    },
    warnings: [{ code: 'legacy-migrated' }],
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate Europe/World/North America modes | One full-world wrapped camera | User decision 2026-07-24 | Region framing becomes camera state, not dataset/mode state. [VERIFIED: `02-CONTEXT.md`] |
| Re-fit Europe projection from geometry | Fixed world projection plus camera transform | Phase 2 recommendation | Pan/zoom no longer traverses geometry. [CITED: https://d3js.org/d3-zoom] |
| Color-only saved maps | Versioned complete compositions | User decision 2026-07-24 | Camera, snapshot, and legend become durable. [VERIFIED: D-19] |
| Continuous historical slider | Curated verified snapshots | User decision 2026-07-24 | UI no longer implies unsupported temporal precision. [VERIFIED: D-20] |
| Full 10m geometry assumption | 50m core plus selected 10m supplements | Research 2026-07-24 | Preserves all 195 core states and required small territories with much lower geometry cost. [VERIFIED: official source analysis] |
| CSS-heavy glass in exportable composition | Export-safe SVG primitives; glass only in editor chrome | Research 2026-07-24 | Live/export parity remains deterministic. [CITED: https://html2canvas.hertzen.com/features] |

**Deprecated/outdated:**
- Separate F7 region selectors are superseded by D-01. [VERIFIED: `02-CONTEXT.md`]
- The roadmap's azimuthal-equidistant suggestion is incompatible with simple horizontal wrapping and is superseded by the context's cylindrical camera discretion. [VERIFIED: roadmap + context]
- The current storage rule's cloud-sync/encryption Phase 2 note is out of scope; D-28 keeps this phase local-only. [VERIFIED: storage rule + D-28]
- The current data rule's separate complete GeoJSON per period is too coarse for partial historical coverage; use modern fallback plus curated overlays and manifests. [VERIFIED: data rule + D-21]

## Scope Fit and Recommended Plan Sequence

1. **Wave 0 — Baseline and supply chain:** source-scope lint, install exact approved dev dependencies, add Playwright config/scripts, and retain the 145-test baseline. [VERIFIED: local baseline run]
2. **Wave 1 — Contracts and deterministic world data:** composition types, 195 manifest, parent/neutral policy, hybrid asset pipeline, source hashes, and asset tests.
3. **Wave 2 — Wrapped camera:** fixed projection, repeated copies, constraints, direct gestures, accessible toolbar, Reset View, Locate, and camera math tests.
4. **Wave 3 — Exact export parity:** freeze transaction, clone sanitization, date-line cases, legend-preserving export, and cleanup tests.
5. **Wave 4 — Composition persistence:** V2 validation, V1 in-memory migration, coordinated load, responsive remount restoration, and corruption/quota tests.
6. **Wave 5 — Legend:** derivation, dormant metadata, editor, SVG overlay, drag/corner/nudge controls, persistence, and export tests.
7. **Wave 6 — Historical engine:** manifest loader, stable historical IDs, modern fallback, period/fallback messaging, crossfade, and cache tests.
8. **Wave 7 — Curated assets and acceptance:** add only source/license/review-complete snapshots, then run historical accuracy and browser/touch review.

Waves 1–6 are a coherent 1.5–2 week engineering phase for one experienced implementer only if historical geometry is limited. Wave 7's full four-era/six-region data curation should be separately estimated or supplied up front; otherwise the planner must record it as incomplete rather than compressing it into implementation tasks. [VERIFIED: historical source assessment]

## Resolved Assumptions and Residual Constraint

| Item | Resolution | Enforcement |
|------|------------|-------------|
| Maximum camera zoom | Implement 24; any correction requires a named post-acceptance gap plan | Constants, persistence, camera tests, browser/small-state acceptance |
| Snapshot catalog | Implement 1492, 1700, 1815, and 1914, but keep every entry unlisted until approved | Plans 02-13 through 02-17 |
| Ambiguous associated units | Neutral/non-selectable unless an approved parent mapping exists | World manifest and asset tests |
| Dormant legend metadata, explicit-save migration, and column thresholds | Binding UI-SPEC choices | Legend/storage/UI contract tests |
| Historical schedule | Full F2/NFR8 completion is blocked until all source/license/factual checkpoints pass; schedule pressure cannot reduce acceptance | Blocking checkpoints and immutable final gate |

## Open Questions (RESOLVED)

1. **Historical assets and exact dates:** The implementation targets `1492`, `1700`, `1815`, and `1914`, but every historical asset remains blocked behind the source/license/factual approvals in Plans 02-13 through 02-16 and the atomic production promotion in Plan 02-17. No candidate appears in production and no F2/NFR8 completion claim is permitted until those approvals and byte checks pass. [RESOLVED: evidence-gated]

2. **Associated/disputed non-core color ownership:** Clear reviewed parent relationships may inherit a core-state color. Cook Islands, Niue, disputed units, indeterminate units, and every other ambiguous association use the reviewed neutral policy—visible, non-selectable, and `parentCoreId: null`—unless a later approved manifest mapping explicitly establishes a parent. No runtime political toggle is added. [RESOLVED: neutral unless approved mapping]

3. **Maximum zoom and Locate framing:** `MAX_ZOOM = 24` is the implementation value across constants, UI controls, persistence validation, and camera constraints. Chrome/Edge and smallest-state acceptance remains a corrective gate: if 24 fails the locked usability contract, execution stops for an explicit gap-closure plan rather than silently tuning the immutable final gate. [RESOLVED: implement 24, correct only through a named gap]

4. **Physical pinch certification:** Real multitouch hardware is required for final pinch acceptance. Playwright and camera-math tests prove alternatives and invariants but are not substitutes. If physical hardware is unavailable, the physical-touch cell remains blocked/unverified and Phase 2 is never reported passed. [RESOLVED: unavailable hardware blocks final acceptance]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build, tests, preprocessing | ✓ | 24.14.0 | — [VERIFIED: local probe] |
| npm | Exact package installs/scripts | ✓ | 11.9.0 | — [VERIFIED: local probe] |
| D3/html2canvas/React/Vitest | Existing runtime/test stack | ✓ | package.json exact pins | — [VERIFIED: codebase] |
| `mapshaper` CLI | Historical/world preprocessing | ✗ | — | Install exact dev dependency 0.7.48. [VERIFIED: local probe] |
| Playwright Test | Browser regression suite | ✗ | — | Install exact dev dependency 1.61.1. [VERIFIED: local probe] |
| Chrome | Phase browser tests | ✓ | 150 per accepted Phase 1 evidence | Use configured installed channel. [VERIFIED: `.planning/STATE.md`] |
| Edge | Phase browser tests | ✓ | 150 per accepted Phase 1 evidence | Use configured installed channel. [VERIFIED: `.planning/STATE.md`] |
| Physical multitouch device | Pinch acceptance | Unknown | — | Manual checkpoint; Playwright lacks built-in pinch. [CITED: https://playwright.dev/docs/api/class-touchscreen] |
| Historical source access | Asset curation only | Network available during research | — | Commit reviewed assets; runtime makes no third-party request. [VERIFIED: project offline boundary] |

**Missing dependencies with no fallback:** approved historical source assets and historical review capacity block a truthful full F2/NFR8 completion claim.

**Missing dependencies with fallback:** `mapshaper` and Playwright are installable exact-pinned dev dependencies; no browser downloads are required.

The current unit suite passes 145/145 tests in 4.51 seconds and production build passes. The dirty-workspace `npm run lint` currently fails because untracked nested planning verification roots create multiple TypeScript config candidates, not because of a product-source lint finding. [VERIFIED: local commands 2026-07-24]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 4.1.10, Node environment, source-scoped `src/**/*.test.{ts,tsx}`. [VERIFIED: `vitest.config.ts`] |
| Browser framework | Playwright Test 1.61.1 using installed `chrome` and `msedge` channels. [CITED: https://playwright.dev/docs/browsers] |
| Unit config | `vitest.config.ts` |
| Browser config | `playwright.config.ts` — Wave 0 gap |
| Quick run command | `npm test -- src/utils/camera.test.ts src/utils/legend.test.ts src/utils/compositionStorage.test.ts` |
| Full unit command | `npm test` |
| Browser command | `npm run test:e2e` — Wave 0 script |
| Production gate | source-scoped lint + `npm test` + `npm run build` + Chrome/Edge Playwright suite + manual real-touch pinch |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F7/D-01–D-05 | One world, horizontal wrap, one-world min, vertical clamp | unit + browser | `npm test -- src/utils/camera.test.ts` | ❌ Wave 0 |
| D-03 | Pointer-anchored wheel/trackpad and drag | browser | `npm run test:e2e -- --grep "camera input"` | ❌ Wave 0 |
| D-06 | Keyboard and single-pointer alternatives | SSR/unit + browser | `npm run test:e2e -- --grep "camera controls"` | ❌ Wave 0 |
| D-07–D-11/F5.2 | Exact viewport/legend 1080 PNG and cleanup | unit + browser/image inspection | `npm test -- src/utils/export.test.ts` | ✅ extend existing |
| D-12–D-15 | Exact 195 core, supplements, inheritance/neutral policy | asset/unit | `npm test -- src/utils/worldDataAsset.test.ts` | ❌ Wave 0 |
| D-16–D-18 | Locate/Reset separate; camera absent from color history | unit + browser | `npm test -- src/utils/camera.test.ts src/hooks/useMapState.test.ts` | ❌ camera file; ✅ history file |
| D-19/F6 | V1 migration and V2 full composition round trip | unit | `npm test -- src/utils/compositionStorage.test.ts` | ❌ Wave 0 |
| F2/D-20–D-23 | Snapshot manifest, identity preservation, fallback, crossfade | asset/unit + browser | `npm test -- src/utils/historicalValidation.test.ts src/utils/scene.test.ts` | ❌ Wave 0 |
| F4/D-24–D-27 | Unique nonwhite entries, editing, order, drag/corners/style | unit + SSR + browser | `npm test -- src/utils/legend.test.ts` | ❌ Wave 0 |
| NFR3 | Warm snapshot switch completes below 500 ms | browser diagnostic + blocking requirement | `npm run test:e2e -- --grep "snapshot switch"` | ❌ Wave 0 |
| NFR8 | Historical visual accuracy | manual source/historian review | manual-only, with signed provenance checklist | ❌ Wave 0 |
| NFR11 | WCAG AA interaction alternatives | browser + manual screen-reader/focus review | `npm run test:e2e -- --grep "accessibility"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** focused Vitest files for the changed subsystem, completing in under 30 seconds. [VERIFIED: current suite duration]
- **Per wave merge:** full `npm test`, source-scoped lint, and `npm run build`.
- **Camera/export/legend waves:** add focused Chrome Playwright smoke.
- **Phase gate:** full unit/build/lint, full Chrome and Edge E2E, exact downloaded PNG inspection, and manual physical-touch pinch/drag verification.

### Wave 0 Gaps

- [ ] `src/utils/camera.test.ts` — wrap normalization, vertical clamp, semantic round trip, pointer-anchor invariants, Locate antimeridian bounds.
- [ ] `src/utils/worldDataAsset.test.ts` — source hashes, exact 195, 248 geographic units, supplements, parent/neutral policy, path finiteness.
- [ ] `src/utils/scene.test.ts` — effective color ownership, identity preservation, historical default white, fallback layering.
- [ ] `src/utils/legend.test.ts` — derivation, dormant lifecycle, ordering, bounds, validation.
- [ ] `src/utils/compositionStorage.test.ts` — V1 migration, V2 round trip, mixed/corrupt records, unknown versions.
- [ ] `src/utils/historicalValidation.test.ts` — manifest/hash/license/provenance/coverage checks.
- [ ] Extend `src/utils/export.test.ts` for camera transform, wrapped copies, legend retention, outgoing-scene removal, and freeze ordering.
- [ ] `playwright.config.ts` and `tests/e2e/phase2-composition.spec.ts`.
- [ ] Package install: `npm install --save-dev --save-exact mapshaper@0.7.48 @playwright/test@1.61.1`.
- [ ] Source-scope ESLint so `.planning/**` and `.claude/**` evidence/worktrees do not contaminate product lint.
- [ ] Manual historical provenance/review template and real-touch acceptance checklist.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts, login, or remote identity in this phase. [VERIFIED: D-28] |
| V3 Session Management | no | No server session or auth token exists. [VERIFIED: D-28] |
| V4 Access Control | no | No protected remote resource or user role exists; local saves are intentionally available to the browser profile. [VERIFIED: storage rules] |
| V5 Input Validation | yes | Strict type guards and bounds for GeoJSON, localStorage, labels, map names, camera numbers, manifests, style enums, and filenames. [CITED: https://owasp.org/www-project-application-security-verification-standard/] |
| V6 Cryptography | no | No secrets, encryption, signing, or network trust boundary is required; do not add client-side cryptography. [VERIFIED: D-28] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS through legend labels/map names | Tampering / Elevation | Treat localStorage as untrusted, validate lengths/types, and render only as text nodes; never `innerHTML`/`.html`. [CITED: https://owasp.org/www-community/attacks/xss/] |
| Prototype pollution through IDs or color maps | Tampering | Continue rejecting `__proto__`, `constructor`, and `prototype`; validate all nested dictionary keys. [VERIFIED: existing storage tests] |
| Main-thread/resource exhaustion from huge storage JSON | Denial of Service | Keep max-10 records, per-map color/legend limits, string-length limits, and reject oversized/deep structures before expensive processing where practical. [VERIFIED: current bounded storage design] |
| Malformed geometry causing extreme path work or non-finite output | Denial of Service | Build-time hashes/counts/topology checks plus runtime geometry validation and safe path generation. [VERIFIED: existing data/path pattern] |
| Canvas taint or hidden network fetch during export | Tampering / Denial of Service | Bundle same-origin assets/fonts, avoid external images, keep `allowTaint` false, and test offline after load. [CITED: https://html2canvas.hertzen.com/configuration] |
| CSS injection through persisted style values | Tampering | Persist enums and clamped numbers only, never raw CSS strings. [VERIFIED: recommended schema]
| Unsafe filename content | Tampering | Replace unsupported characters, cap length, and keep a fixed `.png` suffix. [VERIFIED: existing filename helper pattern] |
| Supply-chain substitution | Tampering | Exact-pin package versions; require official-doc/repository match, registry metadata, slopcheck verdict, and no suspicious postinstall. [VERIFIED: package audit] |

The application remains local-only, but localStorage is still attacker/user-modifiable and must remain an untrusted input boundary. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage]

## Accessible and Performant Visual Direction

Use liquid-glass effects only as progressive enhancement in editor chrome outside the exportable SVG. Provide an opaque high-contrast default, then add `backdrop-filter` only under `@supports` and when reduced transparency is not requested. `prefers-reduced-transparency` is experimental/limited, so it cannot be the only readability fallback. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter] [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency]

Keep composition/export styling simple: white opaque background, solid borders, RGBA legend background, no blur/filter/box-shadow. Use short opacity crossfades and zero duration under reduced motion. Avoid persistent `will-change`, large blurred surfaces, and effects on the map square that increase repaint cost during transforms. [CITED: https://html2canvas.hertzen.com/features] [CITED: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html]

## Sources

### Primary (HIGH confidence)
- https://d3js.org/d3-zoom — transform model, constraints, pointer anchoring, wheel/touch/pinch, lifecycle, click distance.
- https://d3js.org/d3-geo/projection — cylindrical projections, antimeridian clipping, clip extents, fitting, scale/translate/rotate.
- https://d3js.org/d3-geo/path — SVG path generation, bounds, centroids.
- https://d3js.org/d3-geo/math — spherical bounds/centroids and antimeridian behavior.
- https://html2canvas.hertzen.com/configuration — deterministic capture configuration and clone/CORS behavior.
- https://html2canvas.hertzen.com/features — supported and unsupported CSS.
- https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/ — Admin-0 scope/resolution/current POV.
- https://www.naturalearthdata.com/about/terms-of-use/ — public-domain terms.
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_50m_admin_0_countries.geojson — exact official 50m source analyzed.
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson — exact official 10m source analyzed.
- https://www.un.org/en/about-us/member-states — 193 member states.
- https://www.un.org/en/about-us/non-member-states — Holy See and State of Palestine.
- https://unstats.un.org/unsd/methodology/m49/ — fixed-width M49 and ISO metadata.
- https://mapshaper.org/docs/reference.html — build-time topology operations.
- https://playwright.dev/docs/browsers — installed Chrome/Edge channels.
- https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html — single-pointer dragging alternatives.
- https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html — pinch/multipoint alternatives.

### Secondary (MEDIUM confidence)
- https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass — date-filtered OHM boundary querying and completeness caveats.
- https://wiki.openstreetmap.org/wiki/OHM/Tags — temporal/source/license tagging conventions.
- https://beta.icr.ethz.ch/data/cshapes/ — CShapes coverage/formats/license.
- https://github.com/aourednik/historical-basemaps — candidate exact-year data and explicit accuracy warning.
- https://www.euratlas.net/shop/licences/licence_gis_gb.pdf — vector redistribution restrictions.
- https://www.loc.gov/collections/general-maps/about-this-collection/rights-and-access/ — item-level historical map rights guidance.
- https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action — touch gesture ownership/cancellation.
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency — limited support and fallback.

### Tertiary (LOW confidence)
- Historical source completeness and factual accuracy remain evidence-gated rather than assumed: Plans 02-13 through 02-17 must approve sources, six-region records, and final bytes before production. The exact years and ambiguous-parent neutral policy are resolved implementation decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — locked existing stack plus two official, registry-verified, slopcheck-clean build/test packages.
- Camera architecture: HIGH — derived directly from D3's documented transform/constraint model and fixed 1080 geometry.
- Modern data model: HIGH — exact Natural Earth sources were programmatically compared across 10m/50m/110m.
- Export architecture: HIGH — extends a verified Phase 1 pipeline and keeps the transform/legend inside the cloned SVG.
- Persistence: HIGH — existing adapter and V1 schema are fully visible; V2 is a bounded extension.
- Legend: MEDIUM-HIGH — SVG approach is technically deterministic; overflow/lifecycle details need UI review.
- Historical snapshots: MEDIUM for engine, LOW-MEDIUM for full asset schedule — source licensing/completeness and human validation remain unresolved.
- Pitfalls: HIGH — based on official API behavior, codebase constraints, and direct source analysis.

**Research date:** 2026-07-24
**Valid until:** 2026-07-31 for package versions and historical-source status; 2026-08-23 for stable D3/camera/architecture findings.
