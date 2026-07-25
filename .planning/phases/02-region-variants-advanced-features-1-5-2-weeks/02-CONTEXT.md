# Phase 2: Region Variants & Advanced Features - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the fixed-Europe Phase 1 editor into a unified, full-world map composer. There is one interactive square world canvas rather than separate Europe, World, and North America map modes. Creators directly pan and zoom this canvas to frame any regional or global composition, and exact PNG export captures that current viewport.

The phase also delivers the roadmap's curated historical-border snapshots and editable in-canvas legend while preserving Phase 1 coloring, selection, bounded color history, local persistence, accessibility, responsive behavior, error recovery, and exact 1080×1080 PNG guarantees. The separate F7.1–F7.3 canvas-selector concept is superseded by this more versatile unified camera model.

The application remains localhost-only for the foreseeable future. Vercel authentication, deployment, production-origin verification, public URLs, cloud services, login, and backend infrastructure are outside this phase.

Advanced visual animation, timeline/video production, animated border/fill effects, textures, and slideshow transitions are future capabilities. Phase 2 should establish a composition model that can support those layers later without implementing them now.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope and Phase Authority
- `.planning/ROADMAP.md` — Phase 2 goal and original region, historical, centering, zoom, and legend deliverables; this context supersedes separate region variants with one world camera.
- `.planning/REQUIREMENTS.md` — F2 historical borders, F3 view controls, F4 legend, F5 export, F7 region-expansion intent, and browser-only/offline constraints.
- `.planning/PROJECT.md` — Product vision, non-technical creator audience, speed, historical-map, flexible-view, legend, and Instagram-output goals.
- `.planning/STATE.md` — Accumulated Phase 1 decisions, local-only release boundary, and Phase 2 starting position.
- `.planning/milestones/v1.0/phases/01-foundation-modern-map-1-1-5-weeks/01-CONTEXT.md` — Locked Phase 1 stack, state, SVG/D3 ownership, data, accessibility, persistence, export, and release decisions that Phase 2 must preserve. *(Archived 2026-07-25 — see [`ARCHIVES.md`](../../ARCHIVES.md).)*

### Repository Instructions and Durable Rules
- `CLAUDE.md` — Repository routing, architecture, workflow, data validation, export contract, delegation, and documentation-update requirements.
- `.planning/CODING_RULES.md` — Required coding-rules index and update process.
- `.planning/coding-rules/general.md` — Strict TypeScript, typed results, testing, performance, accessibility, and forbidden patterns.
- `.planning/coding-rules/frontend.md` — React/D3/SVG ownership, stable joins, projection memoization, responsive interaction, and accessibility patterns.
- `.planning/coding-rules/data.md` — GeoJSON validation, stable ID/name contracts, lookup construction, historical-data expectations, and error handling.
- `.planning/coding-rules/export.md` — Exact PNG sizing, clean export clone, connected-anchor handoff, cleanup, background, and legend-in-export requirements.
- `.planning/coding-rules/storage.md` — Local-only max-10 saved-map contract, corruption/quota recovery, lazy loading, and current color-only schema to migrate.

### User-Referenced Visual Direction
- `https://animatemymap.com/` — Inspiration for a later animation/beautification phase: timeline camera clips, animated borders/fill reveals, overlays, and video output. It is reference material, not Phase 2 implementation scope.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/MapCanvas.tsx` — Existing accessible D3-owned SVG path layer, stable country joins, selection/tooltip/keyboard behavior, forwarded export source, and clean style-only updates. It is the primary integration point for camera transforms and world rendering.
- `src/utils/mapProjection.ts` — Existing safe path generation and finite projected-bounds protection are reusable; the fixed-Europe projection must be generalized or replaced by a world camera/projection boundary.
- `src/hooks/useGeoData.ts` and `src/utils/geojson.ts` — Existing abortable loading, typed load states, feature normalization, warnings, and O(1) lookup should be generalized from one hardcoded Europe asset to world and snapshot composition data.
- `src/hooks/useMapState.ts` — Existing provider-owned color selection and bounded history remain authoritative. Camera state must stay outside ordinary color history while complete composition loading coordinates with it.
- `src/utils/export.ts` — Existing clone/sanitize/capture/download pipeline preserves the exact PNG contract. Phase 2 must ensure the SVG scene transform and legend are preserved while temporary editor indicators remain sanitized.
- `src/components/MapWorkspace.tsx` — Existing square preview, loading/error/warning states, and tooltip composition provide the container for world navigation and legend overlay.
- `src/components/CountryList.tsx` — Existing list selection can be extended with search and a distinct Locate action without coupling bulk color selection to camera movement.
- `src/hooks/useLocalStorage.ts`, `src/utils/storage.ts`, and `src/components/SaveLoad.tsx` — Existing typed local persistence and recovery flow provide the migration point from color-only records to versioned complete compositions.

### Established Patterns
- React owns application state and composition; D3 owns only the SVG subtree it creates or updates.
- Country colors and selection use stable normalized IDs, never display names, as shared keys.
- Geometry is generated once per data/projection shape and style/selection updates avoid rebuilding paths.
- Boundary failures use discriminated results or load states and creator-safe feedback rather than crashes or ambiguous fallback values.
- Responsive layout mounts one viewport-correct workspace while keeping map, persistence, export, and creator state above presentation branches.
- Export clones the live SVG source, strips editor-only state, and validates exact output dimensions before download.

### Integration Points
- `src/App.tsx` currently composes map state, data, responsive layout, storage, controls, map workspace, save/load, and export. Phase 2 composition state and new controls should remain coordinated here or behind focused hooks rather than creating competing stores.
- `src/types/map.ts` currently models color/history/selection only and will need typed camera, snapshot, legend, and saved-composition contracts.
- `src/components/Controls.tsx` is the natural home for Reset View and top-level period/legend access, subject to responsive layout research.
- The current export utility resets the cloned SVG to the canonical square viewBox. Exact viewport parity therefore requires camera framing to be represented in the exported SVG scene or an equivalent deterministic export-state application.

</code_context>

<specifics>
## Specific Ideas

- The canvas should feel like a movable camera over one globe: frame Europe, North America, a date-line-spanning Pacific view, or any custom region without switching map modes.
- “Whatever position the canvas is in” when Export is activated is the composition that should download.
- The user wants all supported countries to match the interaction quality of the existing Europe implementation rather than creating a visually complete but less interactive world view.
- AnimateMyMap is the reference for eventual beautification: camera motion, animated outlines and fills, visual emphasis, overlays, and multi-scene output. Phase 2 should remain a stable still-map foundation for that later direction.

</specifics>

<deferred>
## Deferred Ideas

- Timeline-based animation clips with camera moves such as fly-to, sweep, orbit, bounce, or top-down sequences.
- Animated country borders, glow, fill reveals, dimmed-background emphasis, and other motion effects.
- Pattern/texture fills, richer base-map styles, advanced outlines, shadows, and full freeform visual design controls.
- Timed text, flags, images, GIFs, logos, arrows, and location-anchored overlays.
- Multi-scene slideshow transitions, frame-sequence generation, MP4/video rendering, and batch/timelapse export.
- Geometry morphing between historical snapshots.
- User-selectable political points of view, claim layers, or disputed-border perspectives.
- Artificial small-island markers and atlas-style inset maps.
- Vercel/public deployment, production-origin verification, cloud sync, authentication, sharing URLs, and backend services.

</deferred>

---

*Phase: 02-region-variants-advanced-features-1-5-2-weeks*
*Context gathered: 2026-07-24*
