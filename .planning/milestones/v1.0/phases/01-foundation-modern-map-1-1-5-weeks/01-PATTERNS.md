# Phase 1: Foundation & Modern Map - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 51 anticipated new/modified files
**Repository analogs found:** 0 / 51
**Greenfield authority assignments:** 51 / 51

## Repository Pattern Baseline

The repository contains planning and guidance documents only. There is no `package.json`,
`src/`, test configuration, product component, utility, stylesheet, or map asset to copy.
Accordingly, every implementation assignment below is a greenfield convention anchored to
approved Phase 1 authority rather than an existing product-code analog.

The pattern precedence is:

1. `01-CONTEXT.md` locked decisions.
2. `01-RESEARCH.md` corrected executable patterns.
3. `01-UI-SPEC.md` approved visual, interaction, accessibility, and copy contract.
4. `CLAUDE.md` and `.planning/coding-rules/*.md` project conventions.
5. `.planning/CODEX_PROMPT.md` and `.planning/PHASE1_CODEX_BRIEF.md` only where their
   illustrative snippets do not conflict with the sources above.

## File Classification

Pattern IDs refer to the concrete assignments in the next section.

| New/Modified File | Role | Data Flow | Closest Analog / Convention | Match Quality |
|---|---|---|---|---|
| `package.json` | config | batch | G-01 toolchain shell | exact greenfield |
| `package-lock.json` | config | batch | G-01 exact-version lock | exact greenfield |
| `index.html` | config | request-response | G-03 root Vite entry and React bootstrap | exact greenfield |
| `vite.config.ts` | config | transform | G-01 Vite React config | exact greenfield |
| `vitest.config.ts` | config | batch | G-02 pure-unit test config | exact greenfield |
| `eslint.config.js` | config | batch | G-02 ESLint flat config | exact greenfield |
| `tsconfig.json` | config | transform | G-01 strict TS project references | exact greenfield |
| `tsconfig.app.json` | config | transform | G-01 strict browser TS config | exact greenfield |
| `tsconfig.node.json` | config | transform | G-01 strict tooling TS config | exact greenfield |
| `.gitignore` | config | file-I/O | G-01 Vite/Node ignores | role match |
| `scripts/prepareGeoData.mjs` | utility | batch + file-I/O + transform | G-04 boundary normalization | exact greenfield |
| `public/data/europe-modern.geojson` | model | file-I/O | G-04 normalized runtime asset | exact greenfield |
| `public/data/README.md` | config | file-I/O | G-04 provenance record | exact greenfield |
| `src/main.tsx` | provider | request-response | G-03 React bootstrap/provider composition | exact greenfield |
| `src/App.tsx` | component | event-driven | G-03 one-way app composition | exact greenfield |
| `src/providers/MapStateProvider.tsx` | provider | event-driven | G-05 Context + reducer ownership | implied exact |
| `src/types/map.ts` | model | transform | G-04/G-05 narrow domain contracts | exact greenfield |
| `src/types/ui.ts` | model | event-driven | G-07/G-08 UI and persistence contracts | exact greenfield |
| `src/constants/colors.ts` | config | transform | G-06/G-10 shared color constants | exact greenfield |
| `src/constants/config.ts` | config | transform | G-06/G-09 map, history, export, storage constants | exact greenfield |
| `src/hooks/useMapState.ts` | hook/store | event-driven | G-05 Context consumer + bounded reducer API | exact greenfield |
| `src/hooks/useMapState.test.ts` | test | event-driven | G-05/G-11 reducer contract tests | exact greenfield |
| `src/hooks/useGeoData.ts` | hook | request-response + file-I/O | G-04 abortable load state | exact greenfield |
| `src/hooks/useLocalStorage.ts` | hook | file-I/O + event-driven | G-08 reactive persistence facade | exact greenfield |
| `src/hooks/useResponsiveLayout.ts` | hook | event-driven | G-03/G-10 matchMedia composition and DOM-order contract | exact greenfield |
| `src/components/AppHeader.tsx` | component | event-driven | G-07 approved header/help pattern | exact greenfield |
| `src/components/OnboardingBanner.tsx` | component | event-driven | G-07 first-use help pattern | exact greenfield |
| `src/components/MapWorkspace.tsx` | component | request-response | G-07 loading/warning/fatal-state shell | exact greenfield |
| `src/components/MapCanvas.tsx` | component | transform + event-driven | G-06 split D3 effects and stable joins | exact greenfield |
| `src/components/Tooltip.tsx` | component | event-driven | G-06/G-07 map hover/focus tooltip | exact greenfield |
| `src/components/SelectionPanel.tsx` | component | event-driven | G-07 shared single/bulk selection view | exact greenfield |
| `src/components/ColorPicker.tsx` | component | event-driven + transform | G-07 validated draft/explicit commit | exact greenfield |
| `src/components/CountryList.tsx` | component | event-driven | G-07 ID-keyed bulk selection list | exact greenfield |
| `src/components/Controls.tsx` | component | event-driven | G-07/G-09 truthful actions and export state | exact greenfield |
| `src/components/SaveLoad.tsx` | component | file-I/O + event-driven | G-08 accessible reactive modal | exact greenfield |
| `src/components/ToastRegion.tsx` | component | event-driven | G-07 status/alert live-region pattern | exact greenfield |
| `src/components/FatalErrorState.tsx` | component | request-response | G-07 recoverable map-load failure | exact greenfield |
| `src/utils/colors.ts` | utility | transform | G-07 color parser/normalizer | exact greenfield |
| `src/utils/colors.test.ts` | test | transform | G-11 table-driven validation tests | exact greenfield |
| `src/utils/geojson.ts` | utility | transform | G-04 unknown-input normalizer | exact greenfield |
| `src/utils/geojson.test.ts` | test | transform | G-11 malformed/duplicate geometry tests | exact greenfield |
| `src/utils/storage.ts` | utility | file-I/O | G-08 typed localStorage adapter | exact greenfield |
| `src/utils/storage.test.ts` | test | file-I/O | G-11 injected Storage tests | exact greenfield |
| `src/utils/export.ts` | utility | file-I/O + transform | G-09 deterministic PNG pipeline | exact greenfield |
| `src/utils/export.test.ts` | test | transform | G-11 filename/options/dimension tests | exact greenfield |
| `src/styles/theme.css` | config | transform | G-10 approved design tokens | exact greenfield |
| `src/styles/App.css` | config | transform | G-10 responsive workspace layout | exact greenfield |
| `src/styles/MapCanvas.css` | config | transform | G-06/G-10 editor-only map states | exact greenfield |
| `src/styles/Controls.css` | config | transform | G-10 controls/modal/toast styles | exact greenfield |
| `README.md` | config | request-response | G-12 deployment/use documentation update | role match |
| `.planning/coding-rules/*.md` | config | transform | G-12 targeted updates only if a durable convention changes | conditional only |

### Deliberate Non-Files

- Do not create `public/index.html`; Vite's entry is root `index.html`.
- Do not create `vercel.json` unless client-side routes are actually introduced.
- Do not create a `ConfirmationDialog` for reset or saved-map deletion. Reset is undoable and
  saved-map deletion explicitly has no confirmation in Phase 1.
- Do not create backend, auth, API, database, environment-secret, legend, historical-border,
  centering, zoom-preset, SVG-export, or batch-export files.
- `src/providers/MapStateProvider.tsx` is the one implied addition to the research tree. React
  Context plus `useReducer` is locked, and keeping provider JSX separate allows the required
  `src/hooks/useMapState.ts` hook to remain a `.ts` consumer without circular ownership.

## Pattern Assignments

### G-01 — Application and Toolchain Shell

**Apply to:** `package.json`, `package-lock.json`, Vite/TypeScript configs,
`.gitignore`.

**Authority:** `01-RESEARCH.md` lines 146-192 and 260-315; `01-CONTEXT.md` lines 21-40.

**Project-structure pattern** (`01-RESEARCH.md` lines 262-313):

```text
index.html                         # Vite source entry; project root
package.json
package-lock.json
vite.config.ts
vitest.config.ts
eslint.config.js
tsconfig.json
tsconfig.app.json
tsconfig.node.json
scripts/
└── prepareGeoData.mjs
public/
└── data/
    ├── europe-modern.geojson
    └── README.md
src/
├── main.tsx
├── App.tsx
├── types/
├── constants/
├── hooks/
├── components/
├── utils/
└── styles/
```

**Dependency convention** (`01-RESEARCH.md` lines 181-192):

```bash
npm install --save-exact react@18.3.1 react-dom@18.3.1 d3@7.9.0 html2canvas@1.4.1
npm install --save-dev --save-exact \
  vite@8.1.5 @vitejs/plugin-react@6.0.3 typescript@6.0.2 \
  @types/react@18.3.31 @types/react-dom@18.3.7 \
  @types/d3@7.4.3 @types/geojson@7946.0.16 \
  eslint@10.7.0 @eslint/js@10.0.1 typescript-eslint@8.65.0 \
  eslint-plugin-react-hooks@7.1.1 globals@17.7.0 \
  vitest@4.1.10
```

**Implementation notes:**

- Re-check fast-moving tool versions immediately before install, as required by research.
- Keep React and React DOM on 18.3.1; do not accept a current scaffold's React 19 defaults.
- Use exact versions and commit `package-lock.json`.
- Create shell files manually or scaffold in a temporary directory; never run a generator that
  can overwrite the existing planning repository.
- Required scripts: `dev`, `build`, `preview`, `lint`, `test`, and `test:run`.
- `tsconfig` must use strict mode, no emit for app code, and browser/tooling project references.
- No `.env.local` is required.

### G-02 — Lint and Unit-Test Harness

**Apply to:** `vitest.config.ts`, `eslint.config.js`, all `*.test.ts` files.

**Authority:** `01-RESEARCH.md` lines 687-731; `.planning/coding-rules/general.md` lines 119-134.

**Validation commands** (`01-RESEARCH.md` lines 691-719):

```text
Quick: npm run test:run -- src/hooks/useMapState.test.ts \
  src/utils/colors.test.ts src/utils/geojson.test.ts src/utils/storage.test.ts

Full: npm run lint && npm run test:run && npm run build
```

**Convention:**

- Use Vitest's Node environment for pure reducer and utility tests; do not add jsdom without a
  test that genuinely requires DOM APIs.
- Use ESLint 10 flat config with browser globals, TypeScript rules, and React Hooks rules.
- Human-verify the official `vitest` package before installation because research recorded the
  package-audit checkpoint.
- Tests cover happy paths, invalid input, boundary values, and explicit error results. No visual
  snapshot tests.

### G-03 — React Bootstrap and One-Way Composition

**Apply to:** `index.html`, `src/main.tsx`, `src/App.tsx`, `src/hooks/useResponsiveLayout.ts`.

**Authority:** `01-RESEARCH.md` lines 123-143 and 224-258; `01-UI-SPEC.md` lines 253-271.

**Data-flow pattern:**

```text
static GeoJSON -> useGeoData -> normalized features/lookup -> MapCanvas
creator actions -> components -> MapStateProvider reducer -> colors/selection/history
saved maps <-> useLocalStorage -> storage utility -> localStorage
MapCanvas SVG -> export HTML frame -> html2canvas -> Blob download
```

**Composition convention:**

- Plan 01-12 creates root `index.html` with the approved title, viewport, `#root`, and `/src/main.tsx` module entry; Plan 01-02 does not own this file.
- `main.tsx` creates the React 18 root, wraps `App` in `React.StrictMode`, and mounts the map-state
  provider.
- `App.tsx` composes hooks and components; it does not parse GeoJSON, call raw localStorage, or
  run D3 selections.
- Keep a single selected-country set. Do not duplicate selection in `App` and reducer/provider
  state.
- Use stable `useCallback` handlers when passing callbacks into map/list/control children.
- Components render the full application shell during loading and fatal states rather than
  replacing the whole app with a bare message.
- `useResponsiveLayout` uses `window.matchMedia('(min-width: 1200px)')`, symmetric change-listener cleanup, and a strict desktop/compact result. `App` mounts exactly one branch: desktop map-first, compact actions-first. Shared state remains above the branch; CSS never reorders or hides a duplicate workspace.

**Import order** (`.planning/coding-rules/general.md` lines 65-88):

```typescript
// React/libraries -> internal types -> components/hooks -> utilities -> styles
import { useCallback } from 'react';
import type { GeoFeature } from './types/map';
import { MapCanvas } from './components/MapCanvas';
import { useGeoData } from './hooks/useGeoData';
import { exportMapPng } from './utils/export';
import './styles/App.css';
```

Use `import type` for type-only imports. Do not import the React default solely for JSX under the
Vite automatic JSX runtime.

### G-04 — GeoJSON Preparation, Validation, and Loading

**Apply to:** `scripts/prepareGeoData.mjs`, `public/data/europe-modern.geojson`,
`public/data/README.md`, `src/types/map.ts`, `src/utils/geojson.ts`, `src/hooks/useGeoData.ts`.

**Authority:** `01-RESEARCH.md` lines 389-395, 474-490, and 548-565;
`01-CONTEXT.md` lines 41-50; `.planning/coding-rules/data.md` lines 7-161.

**Boundary convention:**

- Treat fetched and stored JSON as `unknown`.
- Accept only a GeoJSON FeatureCollection whose usable features normalize to:

```typescript
interface GeoFeature {
  type: 'Feature';
  id: string;
  properties: { name: string };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}
```

- Require stable, unique, non-placeholder IDs and non-empty trimmed names.
- Skip malformed, duplicate-ID, or unsupported-geometry features with a warning result.
- Do not invent index-based IDs. An unresolved feature is rejected because changing order would
  break saved-map keys.
- Return a discriminated result that distinguishes usable data with skipped-feature warnings
  from an unusable collection.
- Build `Map<string, GeoFeature>` once for O(1) ID lookup.

**Abortable load pattern** (`01-RESEARCH.md` lines 550-565):

```typescript
useEffect((): (() => void) => {
  const controller = new AbortController();

  void loadGeoData('/data/europe-modern.geojson', controller.signal)
    .then(setGeoDataState)
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setGeoDataState({ status: 'error', message: toErrorMessage(error) });
      }
    });

  return (): void => controller.abort();
}, []);
```

**Preparation-script convention:**

- Read or fetch the official Natural Earth 1:10m Admin 0 source at build/preparation time only.
- Filter the approved Europe/transcontinental set deterministically.
- Normalize source fields such as `ADMIN`, `NAME`, `ADM0_A3`, and `ISO_A3` into the runtime
  contract and verify ID uniqueness.
- Write the committed runtime GeoJSON and a `public/data/README.md` containing source version,
  URL/repository, public-domain terms, geopolitical POV, inclusion policy, and transformation
  command.
- Runtime must never call a third-party map-data API.

### G-05 — Context, Pure Reducer, and Bounded History

**Apply to:** `src/providers/MapStateProvider.tsx`, `src/hooks/useMapState.ts`,
`src/hooks/useMapState.test.ts`, map-state types/constants.

**Authority:** `01-RESEARCH.md` lines 317-342; `01-CONTEXT.md` lines 51-60.

**Core commit pattern** (`01-RESEARCH.md` lines 323-340):

```typescript
const HISTORY_LIMIT = 50;

function commitColors(state: MapState, nextColors: Record<string, string>): MapState {
  if (areColorMapsEqual(state.colors, nextColors)) return state;

  const branch = state.history.slice(0, state.historyIndex + 1);
  const history = [...branch, nextColors].slice(-(HISTORY_LIMIT + 1));

  return {
    ...state,
    colors: nextColors,
    history,
    historyIndex: history.length - 1,
  };
}
```

**Reducer convention:**

- Actions cover single color, bulk colors, reset, undo, redo, selection, and load-state intent.
- Every color-changing action uses one immutable `commitColors` path.
- Selection-only changes never create history snapshots.
- No-op color/reset actions return the same state and do not add snapshots.
- Editing after undo truncates redo history.
- Retain at most 50 color-changing actions plus the baseline snapshot.
- `LOAD_STATE` replaces colors and resets history to one loaded baseline.
- Represent the shared visible selection as one normalized ID set/list capable of single and bulk
  selection; never key it by display name.
- Provider exports state, semantic actions/dispatch, and derived `canUndo`, `canRedo`, and
  `canReset`. The hook throws a clear developer error if used outside the provider.

**Test pattern:** pure tests dispatch action sequences and assert state, identity on no-op,
branch truncation, baseline retention, limit behavior after 50+ edits, and load reset.

### G-06 — D3-Owned SVG with Stable Geometry

**Apply to:** `src/components/MapCanvas.tsx`, `src/components/Tooltip.tsx`,
`src/styles/MapCanvas.css`, projection constants.

**Authority:** `01-RESEARCH.md` lines 344-387; `01-UI-SPEC.md` lines 450-479 and 633-680;
`.planning/coding-rules/frontend.md` lines 98-191.

**Split-effect pattern** (`01-RESEARCH.md` lines 350-385):

```typescript
useLayoutEffect((): (() => void) | undefined => {
  if (!svgRef.current || features.length === 0) return undefined;

  const svg = d3.select(svgRef.current);
  const projection = d3.geoMercator().fitExtent(MAP_EXTENT, EUROPE_VIEW_OBJECT);
  const path = d3.geoPath(projection);

  const countries = svg
    .select<SVGGElement>('[data-layer="countries"]')
    .selectAll<SVGPathElement, GeoFeature>('path.country-path')
    .data(features, (feature) => feature.id)
    .join('path')
    .attr('class', 'country-path')
    .attr('d', (feature) => path(feature) ?? '')
    .on('click.map', (_event, feature) => onCountryClick(feature.id));

  return (): void => {
    countries.on('.map', null);
    countries.interrupt();
  };
}, [features, onCountryClick]);

useEffect((): void => {
  d3.select(svgRef.current)
    .selectAll<SVGPathElement, GeoFeature>('path.country-path')
    .attr('fill', (feature) => colors[feature.id] ?? DEFAULT_COLOR)
    .classed('selected', (feature) => selectedIds.has(feature.id));
}, [colors, selectedIds]);
```

**Rendering convention:**

- D3 owns only the SVG countries layer selected through the ref. React owns the outer SVG and
  surrounding HTML.
- Geometry/data join effect depends on feature shape and stable handlers. Lightweight style/ARIA
  updates depend on colors, selected IDs, and focus state.
- Never run `svg.selectAll('*').remove()` on color changes.
- Use namespaced D3 events and symmetric cleanup for React Strict Mode.
- Use one logical `viewBox="0 0 1080 1080"`, `preserveAspectRatio="xMidYMid meet"`, Mercator,
  and fixed fit extent `[[64, 64], [1016, 1016]]` for both preview and export.
- SVG is `role="listbox"`, `aria-multiselectable="true"`; country paths are roving-tabindex
  `role="option"` nodes with accessible name, current color, `aria-selected`, and `<title>`.
- Arrow/Home/End move focus in stable alphabetical order; Enter/Space selects; Escape clears.
- Editor hover/focus/selection classes are removed or normalized in the export clone.

### G-07 — Components, Selection, Color Commit, Feedback, and Copy

**Apply to:** all UI components other than the D3 internals and storage adapter.

**Authority:** `01-UI-SPEC.md` lines 253-270, 351-447, 483-603, and 633-680.

**Component convention:**

- Functional component, one primary component per file, typed props at the top, explicit return
  types, stable keys/handlers, semantic elements, no `div` click targets.
- `AppHeader`: exact title/subtitle and `Show Help` action.
- `OnboardingBanner`: persistent until explicit dismissal; `Start Coloring` moves focus to map.
- `MapWorkspace`: preserves shell and map square through loading, warning, and fatal states.
- `SelectionPanel`: one shared selected set, selected count/names, mixed-color state, clear action.
- `CountryList`: alphabetical IDs/names with checkboxes, visible color swatches, Select All and
  Clear Selection. Emit IDs, never names.
- `Tooltip`: country name and current color on pointer hover and keyboard focus.
- `ToastRegion`: one visible message; polite `role="status"` for success/info and `role="alert"`
  for operation errors.
- `FatalErrorState`: approved user copy plus `Reload Map`; never expose raw exception text.

**Color-input transaction:**

```text
input change -> local draft -> validate/normalize -> preview only
Apply Custom Color -> one SET_COLORS action for every selected ID
```

Accepted forms are `#RGB`, `#RRGGBB`, and `rgb(r,g,b)` with channels 0-255. Normalize all valid
forms to uppercase `#RRGGBB`. Invalid/partial keystrokes set inline `aria-invalid` feedback and
never dispatch. Preset clicks commit immediately as one action.

**Exact high-value copy:**

- `Export PNG` / `Exporting PNG…`
- `Undo Color Change` / `Redo Color Change` / `Reset All Colors`
- `Save or Load Maps`
- `Select countries to color`
- `Enter #RGB, #RRGGBB, or rgb values from 0 to 255.`
- `PNG downloaded at 1080 × 1080.`

Normal feedback must not use `alert()`.

### G-08 — Typed Storage Adapter and Reactive Hook

**Apply to:** `src/utils/storage.ts`, `src/hooks/useLocalStorage.ts`,
`src/components/SaveLoad.tsx`, persistence types/constants/tests.

**Authority:** `01-RESEARCH.md` lines 397-403 and 567-586; `01-CONTEXT.md` lines 62-68;
`01-UI-SPEC.md` lines 417-437 and 607-629.

**Safe write pattern** (`01-RESEARCH.md` lines 569-586):

```typescript
type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: 'quota-exceeded' | 'storage-unavailable' };

function writeSavedMaps(serialized: string): StorageWriteResult {
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return { ok: true };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return { ok: false, reason: 'quota-exceeded' };
    }
    return { ok: false, reason: 'storage-unavailable' };
  }
}
```

**Adapter convention:**

- All raw `localStorage`, `JSON.parse`, and `JSON.stringify` calls live in `src/utils/storage.ts`.
- Exact key: `countriesirl_maps`.
- Record shape: `{ name, colors, timestamp }`; maximum 10 records, newest first.
- Trim names, reject empty names and names over 100 characters, overwrite exact trimmed-name
  matches, and drop the oldest record over capacity.
- Parse to `unknown`, validate every record and color entry, omit corrupt records, and return a
  warning alongside valid records.
- Restrict loaded color keys to IDs present in the current country lookup.
- Return explicit success/error results for list/save/load/delete; never `null` as an ambiguous
  failure and never throw storage errors through render.

**Hook convention:**

- `useLocalStorage` owns reactive `savedMaps`, warning/error state, and mutation methods.
- Read lazily when the modal opens; refresh hook state immediately after save/delete.
- `SaveLoad` does not call localStorage directly.
- Modal uses `role="dialog"`, `aria-modal`, focus trap, Escape close, focus restoration, and the
  exact save/replace/load/delete/close labels from UI-SPEC.

### G-09 — Deterministic 1080×1080 PNG Export

**Apply to:** `src/utils/export.ts`, `src/utils/export.test.ts`, `Controls` export orchestration,
export constants.

**Authority:** `01-RESEARCH.md` lines 405-432 and 588-600; `01-UI-SPEC.md` lines 438-479;
`01-CONTEXT.md` lines 70-77.

**Capture pattern** (`01-RESEARCH.md` lines 411-430):

```typescript
const EXPORT_FRAME_SIZE = 540;
const EXPORT_SCALE = 2;
const EXPORT_SIZE = 1080;

const canvas = await html2canvas(exportFrame, {
  backgroundColor: '#ffffff',
  width: EXPORT_FRAME_SIZE,
  height: EXPORT_FRAME_SIZE,
  scale: EXPORT_SCALE,
  windowWidth: EXPORT_FRAME_SIZE,
  windowHeight: EXPORT_FRAME_SIZE,
});

if (canvas.width !== EXPORT_SIZE || canvas.height !== EXPORT_SIZE) {
  throw new Error(`Unexpected export size: ${canvas.width}x${canvas.height}`);
}
```

**Blob pattern** (`01-RESEARCH.md` lines 590-600):

```typescript
async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas blob creation failed'));
    }, 'image/png');
  });
}
```

**Export convention:**

- Utility accepts an `HTMLElement` export source or enough SVG/state input to create one; never
  pass `SVGSVGElement` directly to html2canvas.
- Build an offscreen 540×540 HTML frame, clone the SVG into it, force fixed white/light export
  styles, and capture at scale 2.
- Export map only: no header, labels, tooltip, toast, selection/focus/hover state, legend,
  attribution, or dark-theme values.
- Assert exact canvas dimensions before encoding.
- Use `toBlob`, object URL, temporary anchor, and `URL.revokeObjectURL`.
- Remove temporary DOM and revoke any created URL in `finally`, including error paths.
- Filename helper returns `CountriesIRL_<YYYY-MM-DD>.png`.
- `Controls` owns `isExporting`; it disables repeated activation and reports approved success or
  failure copy after the promise settles.

### G-10 — Plain CSS Design System and Responsive Layout

**Apply to:** `src/hooks/useResponsiveLayout.ts`, `src/App.tsx`, `src/main.tsx`, `theme.css`, `App.css`, `MapCanvas.css`, `Controls.css`.

**Authority:** `01-UI-SPEC.md` lines 49-65, 102-249, and 275-347;
`01-CONTEXT.md` lines 79-85.

**Token pattern:**

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  --surface-page: #f3f4f6;
  --surface-card: #ffffff;
  --accent: #4338ca;
  --text-primary: #111827;
  --border: #d1d5db;
  --map-fill-default: #ffffff;
  --map-border-default: #9ca3af;
  --map-border-selected: #111827;
}
```

Use the exact UI-SPEC token values, names chosen consistently by implementation. The excerpt
shows the required tokenization shape, not permission to alter approved values.

**CSS convention:**

- Plain CSS only; no Tailwind, CSS-in-JS, gradients, emoji icons, or component library.
- Exactly four type sizes (14, 16, 20, 28px) and two weights (400, 600).
- All authored margin/padding/gap values use the approved spacing scale.
- Plan 01-12 owns `useResponsiveLayout` and one-active-branch DOM composition; Plan 01-13 owns all stylesheet imports and CSS.
- Desktop: map-first two-column grid with a 360px control column.
- Tablet/mobile: the compact React branch DOM and visual order are actions, map, selection/color, country list. Do not render both branches, hide one, or use CSS reordering that disagrees with focus order.
- Map remains a responsive square with fixed white surface in light and dark UI themes.
- Controls have at least 48×48px targets; app works at 360px without horizontal page scroll.
- Country fill/border transitions are 150ms; reduced-motion removes nonessential transitions.
- Accent is reserved for export, onboarding CTA/accent bar, and focus rings.

### G-11 — Test File Pattern

**Apply to:** all reducer and utility tests.

**Authority:** `01-RESEARCH.md` lines 700-731; `.planning/coding-rules/general.md` lines 119-134.

| Test File | Required Cases |
|---|---|
| `useMapState.test.ts` | single/bulk commit, no-op identity, undo/redo, branch truncation, reset, load reset, selection excluded from history, 50-action limit |
| `colors.test.ts` | valid 3/6-digit hex, case/whitespace normalization, RGB boundaries 0/255, malformed syntax, out-of-range channels |
| `geojson.test.ts` | unknown collection, valid Polygon/MultiPolygon, missing name/ID, placeholder/duplicate ID, unsupported geometry, partial warning, unusable collection |
| `storage.test.ts` | empty store, list/save/replace/load/delete, max 10, trim/length, malformed JSON, malformed records, invalid colors, quota, unavailable storage |
| `export.test.ts` | exact options arithmetic, filename date, dimension mismatch, null blob, html2canvas rejection, cleanup helpers |

Prefer table-driven `describe`/`it.each` cases for validators and explicit action sequences for the
reducer. Use injected fake `Storage` and mocked html2canvas/browser helpers rather than touching a
real browser store or triggering downloads.

### G-12 — Documentation, Deployment, and Rule-File Hygiene

**Apply to:** `README.md` and conditional `.planning/coding-rules/*.md` modifications.

**Authority:** `CLAUDE.md` lines 120-143; `01-CONTEXT.md` lines 87-95;
`01-RESEARCH.md` lines 603-617 and 645-660.

- Update README only with implemented commands, creator workflow, Natural Earth provenance link,
  and verified production URL. Do not advertise deferred Phase 2 controls as available.
- Vercel should serve the static Vite build. Omit `vercel.json` because Phase 1 has no router;
  add the documented SPA rewrite only if routing is actually introduced.
- Deployment requires a human authorization/production-URL checkpoint if credentials are not
  available to the executor.
- Existing coding rules are authoritative and currently untracked in the working tree. Do not
  regenerate or overwrite them. Modify one only when implementation proves a lasting convention
  needs a targeted correction; preserve footer-history rules.

## Shared Patterns

### Explicit Result Types at Boundaries

**Source:** `.planning/coding-rules/general.md` lines 185-205.
**Apply to:** GeoJSON normalization, storage, export helpers where failure is expected.

```typescript
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
```

Use more specific discriminants where UI behavior differs, such as storage quota versus storage
unavailable, or usable GeoJSON with warnings versus fatal data failure.

### Stable IDs Everywhere

**Source:** `01-CONTEXT.md` lines 41-60; `01-RESEARCH.md` lines 434-446.
**Apply to:** D3 joins, color records, selected sets, country lists, storage validation, tests.

One normalized country ID is the only cross-module key. Display names are labels, never state
keys. Index-generated IDs and name-keyed colors are forbidden.

### Error Translation

**Source:** `01-UI-SPEC.md` lines 509-603.
**Apply to:** hooks, `App`, `MapWorkspace`, `SaveLoad`, `Controls`, `ToastRegion`.

Utilities return typed technical reasons. Hooks/components translate them into approved user copy.
Do not render raw URLs, stack traces, exception messages, parse details, or stored HTML. Logging is
limited to warnings/errors that provide developer context; production `console.log` is forbidden.

### Accessibility

**Source:** `01-UI-SPEC.md` lines 623-680.
**Apply to:** every component.

Use native controls, visible labels, `:focus-visible`, live announcements, focus restoration,
roving map tabindex, and non-color selection indicators. Every pointer-only map interaction has a
keyboard or country-list equivalent.

### Performance and Ownership

**Source:** `01-CONTEXT.md` lines 87-93; `01-RESEARCH.md` lines 344-387.
**Apply to:** provider, hooks, `MapCanvas`, controls.

- Fetch and normalize once.
- Compute projection/path geometry only when geographic data changes.
- Change fills/classes/ARIA for color and selection updates.
- Keep reducer transitions pure and O(number of color keys), bounded by small Phase 1 data.
- Use stable handlers/keys and symmetric effect cleanup.
- Verify map load/render under 500ms, interaction updates under 100ms, and export under 3 seconds.

## Authority Conflicts and Patterns Not to Copy

The repository's PRD and some coding-rule snippets are illustrative and contain stale or unsafe
examples. Planner actions must explicitly avoid copying these:

| Stale Pattern | Correct Pattern |
|---|---|
| `public/index.html` | Root `index.html` for Vite |
| Current `create-vite` manifest | Manually pin React 18 and approved ESLint/Vitest stack |
| `any` in GeoJSON/D3 callbacks | `@types/geojson`, typed D3 generics, `unknown` boundary narrowing |
| Index/name fallback feature IDs | Reject unresolved IDs; preserve stable normalized IDs |
| `svg.selectAll('*').remove()` on updates | Stable keyed join plus separate geometry/style effects |
| Duplicate `selectedCountry` in `App` and reducer | One provider-owned selected set |
| Custom color dispatch on every keystroke | Local draft, validate, explicit one-action commit |
| Raw `JSON.parse` result or nullable storage failure | Validate `unknown`; explicit result variants |
| Assume localStorage always writable | Probe/catch unavailable, security, and quota failures |
| `html2canvas(svg)` | Capture an HTML frame containing the SVG |
| 1080×1080 options with scale 2 | 540×540 CSS frame at scale 2 and assert 1080×1080 |
| `toDataURL` download | `toBlob` + object URL + cleanup |
| Native `alert()` feedback | Toast/live-region status and alert messages |
| Dark-mode inversion of map/export | Dark application chrome; fixed white map/export frame |
| Confirmation for reset/delete | No confirmation; reset undoable, saved-map delete immediate |

## No Repository Analog Found

Every anticipated Phase 1 implementation file is greenfield. The planner should cite the Pattern
ID and authority excerpts above rather than claim a source-code analog exists.

## Metadata

**Analog search scope:** repository root, tracked files, `src/**`, `public/**`, planning authority,
coding-rule documents, and recent git history.

**Repository state at mapping:** no package manifest, source tree, tests, styles, or map assets;
only planning/guidance documents and README exist.

**Pattern extraction date:** 2026-07-21

**Primary authorities:**

- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/01-CONTEXT.md`
- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/01-RESEARCH.md`
- `.planning/phases/01-foundation-modern-map-1-1-5-weeks/01-UI-SPEC.md`
- `CLAUDE.md`
- `.planning/CODING_RULES.md`
- `.planning/coding-rules/general.md`
- `.planning/coding-rules/frontend.md`
- `.planning/coding-rules/data.md`
- `.planning/coding-rules/export.md`
- `.planning/coding-rules/storage.md`
