# Phase 1: Foundation & Modern Map - Context

**Gathered:** 2026-07-21
**Revised:** 2026-07-22
**Status:** Local Phase 1 closeout complete; ready for final goal verification
**Source:** PRD Express Path (`.planning/CODEX_PROMPT.md`) with locked supplemental authority from `.planning/PHASE1_CODEX_BRIEF.md` and explicit user release instruction D-63

<domain>
## Phase Boundary

Deliver a production-ready, browser-only CountriesIRL Phase 1 MVP: a modern European SVG map that non-technical Instagram creators can interactively select and color, including single and bulk color assignment, bounded undo/redo, reset, local save/load/delete, first-use help, responsive tablet support, exact 1080×1080 PNG export, basic accessibility and dark-theme behavior, and deployment to Vercel.

This phase also establishes the React/TypeScript/Vite application shell, the normalized Natural Earth GeoJSON asset and validation boundary, the project component/hook/utility structure, automated utility/state tests, and production build/lint verification. It does not add historical borders, flexible centering, regional zoom presets, legends, World or North America canvas variants, batch export, or other Phase 2+ capabilities.

The checked-in repository currently contains the completed Phase 1 product plus planning/evidence history. Existing `CLAUDE.md` and `.planning/coding-rules/*.md` files are current authority and must not be regenerated or overwritten wholesale. Update a rule file only if implementation introduces or corrects a lasting project convention.

</domain>

<decisions>
## Implementation Decisions

### Locked Stack and Runtime
- D-01: Use React 18 with TypeScript in strict mode; do not upgrade the phase to React 19.
- D-02: Use Vite as the build/dev tool and `@vitejs/plugin-react` as the React integration.
- D-03: Use D3.js v7+ for geographic projection, GeoJSON-to-SVG path generation, data joins, and map interaction support.
- D-04: Render the map as interactive SVG, not Canvas, Mapbox, or a custom raster renderer.
- D-05: Use React Context plus `useReducer` as the centralized map-state mechanism exposed through `useMapState`.
- D-06: Use html2canvas for PNG generation.
- D-07: Use browser `localStorage` for map save/load/delete; no backend, authentication, mandatory login, or server infrastructure.
- D-08: Deploy the static Vite app to Vercel and make a shareable production URL part of Phase 1 completion.
- D-09: Use plain component-scoped CSS plus CSS custom properties in `theme.css`; do not add Tailwind or CSS-in-JS.
- D-10: The long-term compatibility target remains current Chrome, Firefox, Safari, and Edge plus their previous versions; no IE11 support. Phase 1 release certification is explicitly narrowed by D-61 and must not imply that deferred browsers were tested.

### Application and File Architecture
- D-11: Preserve the PRD subsystem layout: `src/types`, `src/components`, `src/hooks`, `src/utils`, `src/styles`, `src/constants`, and `public/data/europe-modern.geojson`.
- D-12: Core modules are `useMapState`, `useGeoData`, `useLocalStorage`, `MapCanvas`, `ColorPicker`, `CountryList`, `Controls`, `SaveLoad`, `Tooltip`, `exportMapPng`, GeoJSON/color/storage utilities, and shared constants/types.
- D-13: Components are functional, one primary component per file, with explicitly typed props and stable handlers/keys.
- D-14: D3 owns only the SVG subtree it creates or updates; React and D3 must not independently mutate the same SVG nodes.
- D-15: Illustrative PRD snippets do not override executable constraints. Implementation must correct sample defects that would break Vite, strict TypeScript, React ref wiring, history bounds, or exact export dimensions while preserving every locked user-visible outcome.
- D-16: Vite's application `index.html` belongs at the repository root. `public/` is reserved for static assets, including the bundled GeoJSON.

### Modern Europe Data and Map Rendering
- D-17: Source modern country boundaries from Natural Earth's 1:10m Admin 0 Countries data and commit a Europe-focused GeoJSON asset at `public/data/europe-modern.geojson` so the map works without runtime calls to third-party APIs.
- D-18: Normalize every accepted feature to a stable unique string `id`, a non-empty `properties.name`, and Polygon or MultiPolygon geometry before rendering.
- D-19: On load, validate the payload and each feature. Skip malformed entries with a warning and continue rendering valid countries; show a user-facing load error if the file cannot be fetched or the collection is unusable.
- D-20: Load the GeoJSON once on mount, abort fetch work on unmount, cache normalized features, and build an O(1) country lookup keyed by feature ID.
- D-21: Use `d3.geoMercator()`, `projection.fitExtent(...)`, and `d3.geoPath()` for the Phase 1 Europe view. Centering/reprojection controls remain deferred.
- D-22: Each country is a stable SVG path with hover feedback, country-name/current-color tooltip content, click/tap selection, accessible labeling, and a clearly differentiated selected border.
- D-23: Default country fill and reset state are white (`#FFFFFF`). Default borders are light gray; selected borders are black and visibly thicker.
- D-24: Keep projection/path geometry stable across color edits. Color or selection updates must update attributes/classes rather than clear and rebuild the whole SVG.

### Selection, Coloring, and History
- D-25: A user can click/tap any rendered country to select it and can also select multiple countries through the country-list/bulk workflow.
- D-26: Provide 8–10 palette presets plus custom color input. Accept valid `#RGB`, `#RRGGBB`, and `rgb(r,g,b)` forms; reject invalid or out-of-range input with visible feedback.
- D-27: Support applying one color to one country and applying the same color to multiple selected countries as a single reducer action.
- D-28: Keep color assignments as `Record<string, string>` keyed only by normalized country ID.
- D-29: Support reducer actions equivalent to `SET_COLOR`, `SET_COLORS`, `RESET_ALL`, `UNDO`, `REDO`, `SELECT_COUNTRY`, and `LOAD_STATE`.
- D-30: Undo/redo uses immutable full color snapshots, discards the redo branch after a new edit, and retains at most the last 50 color-changing actions. Selection-only actions do not create history entries.
- D-31: Undo, redo, and reset controls reflect availability; no-op actions must not create duplicate history snapshots.
- D-32: Loading a saved map replaces current colors and resets undo/redo history to that loaded state.
- D-33: Color assignment should feel immediate, but custom-input editing must not create a history entry for every invalid or partial keystroke; commit one validated user intent per action.

### Persistence
- D-34: Store saved maps under the exact key `countriesirl_maps` as JSON records containing `name`, `colors`, and `timestamp`.
- D-35: Support listing, saving, overwriting by matching name, loading, and deleting saved maps.
- D-36: Keep at most 10 saved maps. A newly saved/updated map is most recent; if capacity is exceeded, discard the oldest record.
- D-37: Trim and validate non-empty map names. Treat parsed localStorage content as untrusted: catch parse errors, validate record shape/colors, and recover without crashing.
- D-38: Handle unavailable/restricted storage and quota failures with explicit success/error results and user-facing feedback.
- D-39: Saved maps remain local to the current browser/origin and contain no credentials or sensitive data.

### PNG Export
- D-40: Export a white-background PNG that is exactly 1080×1080 pixels and visually matches the current map colors.
- D-41: Use html2canvas against an HTML export container that contains the SVG; do not pass an `SVGSVGElement` directly to an API typed for `HTMLElement`.
- D-42: Use deterministic export sizing independent of device pixel ratio. The required 2× quality path must either capture a 540×540 CSS export frame at scale 2 or explicitly downsample a higher-resolution intermediate canvas to an exact 1080×1080 output canvas.
- D-43: Use `canvas.toBlob()` and an object URL for download, revoke the URL after use, and clean temporary DOM in `finally`.
- D-44: Filename format is `CountriesIRL_<YYYY-MM-DD>.png`; no spaces or special characters.
- D-45: Export control has a disabled/loading state while work is active and reports failures without crashing the app. Its duration target remains an advisory diagnostic under D-63; exact dimensions, opacity, map-only content, current colors, cleanup, and no-crash behavior remain release requirements.
- D-46: Avoid cross-origin images/fonts/resources in the export subtree so canvas output is not tainted.

### UX, Responsive Behavior, Accessibility, and Theme
- D-47: Optimize for non-technical creators: a user must be able to color at least five countries in under two minutes without documentation.
- D-48: Provide clear hover/selection feedback, current-color preview, concise control labels, first-use help such as “Click a country to start,” and visible success/error feedback.
- D-49: Desktop is primary; the layout must also work smoothly on tablets, with mobile support secondary rather than a native/mobile-app scope.
- D-50: Provide basic system-preference dark-theme behavior through CSS variables without inverting or corrupting exported map colors.
- D-51: Use semantic buttons, visible focus states, labels or `aria-label`s, SVG country labels/titles, and keyboard-operable controls. Do not rely on color alone for selection state.
- D-52: Keep color transitions around 150 ms and other UI transitions short enough to feel responsive without blocking state updates.

### Quality, Testing, and Delivery
- D-53: Map load/projection/render and color/undo/redo timing targets remain instrumented advisory diagnostics under D-63. They may guide later optimization but do not determine Phase 1 release PASS/FAIL.
- D-54: PNG export duration is advisory under D-63; exact 1080×1080 correctness remains mandatory.
- D-55: The app must survive 100+ rapid interactions without crashes, broken history, duplicate SVG nodes, stale selections, or console errors/warnings from valid data.
- D-56: Strict TypeScript is mandatory: no `any`, no implicit function return types, no unsafe assertions used to hide incompatible DOM/API contracts, and no magic numbers where named constants apply.
- D-57: Provide unit tests for reducer/history behavior and utilities, covering happy paths, edge cases, malformed data/storage, action limits, and error conditions. Visual SVG/component flows and final browser export may use the documented Phase 1 manual checklist.
- D-58: Production acceptance requires `npm run lint`, the automated test suite, and `npm run build` to pass.
- D-59: Existing coding-rule documents are authoritative. Do not replace them from templates; make only targeted, reviewed updates when implementation establishes a durable new rule or corrects a demonstrated technical error.
- D-60: Completion includes a production Vercel deployment, a working shareable URL, no required `.env.local`, and no product-code dependency on Vercel environment variables.

### Release Acceptance and Next Priority
- D-61: For this Phase 1 release, browser acceptance is local-browser-only and requires the currently installed Chrome 150 and Edge 150. Firefox, Safari, Chrome previous, Edge previous, Firefox previous, and Safari previous remain explicitly unverified/deferred by user choice; they must not be recorded as passed or certified and do not block this release.
- D-62: The user approves shipping Europe first and accepts the current Natural Earth 5.1.1 Europe presentation and documented transcontinental inclusion for this release. World and North America canvas variants are the highest-priority next-phase/backlog work immediately after Phase 1, but no region-variant implementation belongs in Phase 1.
- D-63: Phase 1 completion is not gated by millisecond timing. Map-ready, color, undo, redo, and other recorded performance samples are advisory diagnostics, not release blockers. Earlier threshold failures and external-harness timeouts remain immutable documented observations and must not be rewritten as passing evidence. Plan 01-15 closes from the accepted final code review, final 24/24 UI audit, 145-source-test/deterministic-data/build evidence, exact 57-path integrity, Plan 01-21 browser/PNG evidence, accepted persistence/history/storage/accessibility/offline coverage, and a concise current-HEAD functional smoke in installed Chrome 150 and Edge 150. Functional stability, no crashes, clean console/product behavior, 57-path integrity, responsive correctness, and exact PNG correctness remain blocking. No CDP timing artifact or timing threshold is a prerequisite.
- D-64: The user directly approved Plan 01-15 and selected localhost-only Phase 1 completion. This later instruction supersedes D-08 and D-60 only for the Phase 1 completion boundary: Plans 01-16 and 01-17 are closed as explicitly deferred, no Vercel authentication/deployment/production verification occurs, and no production URL is claimed. Vercel remains optional future work requiring new explicit authorization. F7.1–F7.3 remain preserved for Phase 2 and no region-variant implementation begins during closeout.

### Claude's Discretion
- Choose the exact current package patch versions compatible with React 18, Vite, the installed Node runtime, and the locked stack.
- Choose the deterministic Natural Earth preprocessing procedure, exact Europe/transcontinental inclusion policy, and stable ID fallback order while preserving the fixed data source and normalized runtime contract.
- Choose the exact internal representation of transient bulk-selection UI state while reducer color/history semantics remain fixed.
- Choose the precise component visual design, CSS token values, responsive breakpoints, tooltip/toast implementation, and modal details while satisfying the locked UX, accessibility, responsive, and theme outcomes.
- Choose the test file layout and test framework configuration, subject to the project's unit-test requirements and `.planning/config.json` Nyquist validation setting.
- Choose whether the export implementation uses a 540×540 scale-2 capture or a larger intermediate canvas followed by explicit downsampling, provided the downloaded file is deterministically 1080×1080.
- Choose whether data preparation is a retained script or a documented one-time transformation, provided provenance and reproducibility are recorded and product runtime stays browser-only.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked Phase 1 Product and Implementation Authority
- `.planning/CODEX_PROMPT.md` — Primary Phase 1 PRD, locked stack, scope, file layout, component responsibilities, concrete behavior, and acceptance checklist, as superseded for release timing by D-63.
- `.planning/PHASE1_CODEX_BRIEF.md` — Supplemental locked Phase 1 architecture, state/data/export contracts, performance/UX targets, deployment requirement, and stricter quality checklist, as superseded for release timing by D-63.

### Project-Level Instructions and Existing Rules
- `CLAUDE.md` — Repository routing table, locked Phase 1 stack/wiring, guardrails, commands, documentation policy, and delegation expectations.
- `.planning/CODING_RULES.md` — Required coding-rules index; always routes implementation to `general.md` first and then domain-specific rules.
- `.planning/coding-rules/general.md` — Strict TypeScript, naming/imports, reducer/error-handling, tests, performance, accessibility, browser, and commit rules.
- `.planning/coding-rules/frontend.md` — React/D3/SVG ownership, hooks, CSS, performance, accessibility, and frontend manual-test patterns.
- `.planning/coding-rules/data.md` — GeoJSON validation, normalization, feature-ID/name contract, lookup, loading, and data-test requirements.
- `.planning/coding-rules/export.md` — Exact 1080×1080 PNG contract, html2canvas flow, filename, cleanup, errors, and export tests. Research must resolve any sample arithmetic/API typing errors without weakening the outcome.
- `.planning/coding-rules/storage.md` — `countriesirl_maps` schema, max-10 policy, save/load/delete behavior, recovery, quota handling, and persistence tests.
- `.planning/config.json` — Delegated workflow settings and browser-only/offline project constraints.

### Broader Project Context
- `.planning/REQUIREMENTS.md` — Full multi-phase requirement catalog and D-63-aligned Phase 1 release acceptance.
- `.planning/PROJECT.md` — Product vision, users, European focus, and non-technical creator goals.
- `.planning/ROADMAP.md` — Phase numbering, goal, dependencies, and D-63-aligned release path.
- `.planning/STATE.md` — Current position and accumulated decisions, including the non-blocking timing disposition.

</canonical_refs>

<specifics>
## Specific Ideas

- App header copy: “CountriesIRL Map Generator” with a short creator-oriented subtitle such as “Color countries, generate Instagram-ready maps.”
- Suggested palette includes red, green, blue, yellow, magenta, cyan, white, and gray, with custom validated input and a live preview.
- Map paths use white fill by default, light-gray borders, black selected borders, and short fill/stroke transitions.
- First-use guidance should be visible on initial load and dismiss automatically or manually without obstructing normal work.
- Save/load UI may be a modal with “Save Current Map” and “Load Saved Maps” sections, including load and delete actions and timestamps.
- The control surface includes undo, redo, reset, save/load, and export. Disabled states must be truthful.
- The export is always a white-background Instagram square; dark UI theming must not affect it.
- Use Natural Earth public-domain data with optional visible/documented attribution “Made with Natural Earth.”
- Build in vertical capability order: app/test shell → state and validation → GeoJSON/map → coloring/bulk controls → persistence → export → responsive/accessibility/theme polish → production verification/deploy.
- Preserve performance marks and failed timing evidence for diagnosis, but apply D-63 when deciding Phase 1 release readiness.

</specifics>

<deferred>
## Deferred Ideas

- Historical border datasets and time-period selector/redraw.
- Flexible centering or reprojection around a selected country.
- EU-only, EU + Middle East, Europe + Russia, and other regional zoom presets.
- Auto-generated legend, editable legend labels, legend positioning, and legend styling.
- Batch/timelapse export, ZIP generation, or multiple-image workflows.
- SVG export and other editable/export formats beyond the locked PNG deliverable.
- Palette-color hotkeys and advanced keyboard shortcuts beyond basic accessibility.
- Advanced styling such as hatching, patterns, in-country labels, or animated transitions.
- World and North America canvas variants are explicitly deferred from Phase 1 and promoted to the highest-priority next-phase/backlog work per D-62; all other non-European regions, a native mobile app, real-time collaboration, cloud sync, authentication, share URLs, analytics, and AI palette suggestions remain deferred.
- Server functions, databases, and secret/environment-variable-driven product behavior.

</deferred>

---

*Phase: 01-foundation-modern-map-1-1-5-weeks*
*Context gathered: 2026-07-21 via PRD Express Path; release acceptance revised 2026-07-22 by explicit user decision D-63*
