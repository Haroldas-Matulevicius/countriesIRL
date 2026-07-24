# Phase 2: Region Variants & Advanced Features - Pattern Map

**Mapped:** 2026-07-24
**Target files classified:** 64 logical files/file families
**Analogs found:** 58 / 64
**Primary source scope:** `src/`, `scripts/`, `public/data/`, root tool configuration

## Scope Interpretation

Phase 2 should extend the Phase 1 ownership model rather than replace it:

- React owns application, composition, responsive, dialog, and accessibility state.
- D3 owns only the SVG country/scene/camera subtree that it creates and updates.
- The existing color reducer remains the sole owner of bounded color history.
- Camera movement is a separate high-frequency controller owned only inside the visible MapCanvas; root composition reaches it through exactly one shared `MapCanvasHandle` that rebinds across responsive remounts.
- The export utility remains the only PNG capture/download chokepoint.
- The storage adapter remains the only localStorage authority; do not create a second competing persistence store.
- Runtime assets are bundled, validated, deterministic, and browser-local.

The file names below follow `02-RESEARCH.md` and `02-UI-SPEC.md`. Where the planner chooses to merge a proposed new file into an existing file, preserve the same ownership boundary.

## File Classification

### Infrastructure and Static Data

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | build/test commands | `package.json` | exact |
| `eslint.config.js` | config | source transform/validation | `eslint.config.js` | exact |
| `playwright.config.ts` | config | browser request-response | none | new boundary |
| `.gitattributes` | config | file-I/O | `.gitattributes` | exact |
| `scripts/prepareWorldData.mjs` | utility/build script | file-I/O + transform | `scripts/prepareGeoData.mjs` | exact role/data-flow |
| `scripts/prepareHistoricalSnapshot.mjs` | utility/build script | file-I/O + transform | `scripts/prepareGeoData.mjs` | role-match; provenance is new |
| `public/data/world-modern.geojson` | model/static asset | file-I/O | `public/data/europe-modern.geojson` | exact role; new schema |
| `public/data/world-manifest.json` | model/static asset | file-I/O | output contract in `scripts/prepareGeoData.mjs` | partial |
| `public/data/snapshots/index.json` | model/static asset | file-I/O | none | new boundary |
| `public/data/snapshots/<snapshot-id>.geojson` | model/static asset | file-I/O | none | new boundary |

### Types, Constants, and State Ownership

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/types/map.ts` | model | transform | `src/types/map.ts` | exact |
| `src/types/composition.ts` | model | transform | `src/types/map.ts`, `src/types/ui.ts` | role-match; owns the sole `MapCanvasHandle` contract |
| `src/types/ui.ts` | model | request-response | `src/types/ui.ts` | exact |
| `src/constants/config.ts` | config | transform | `src/constants/config.ts` | exact |
| `src/constants/camera.ts` | config | transform | `src/constants/config.ts` | exact role |
| `src/constants/snapshots.ts` | config | file-I/O + transform | `src/constants/config.ts` | role-match |
| `src/providers/CompositionStateProvider.tsx` | provider/store | event-driven | `src/providers/MapStateProvider.tsx` | exact role; different history policy |
| `src/hooks/useCompositionState.ts` | hook | request-response | `src/hooks/useMapState.ts` | exact role |

### Hooks and Utilities

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/hooks/useCameraController.ts` | hook/controller | event-driven + streaming | `src/components/MapCanvas.tsx` | partial only; new boundary required |
| `src/hooks/useSnapshotData.ts` | hook/service | file-I/O + request-response | `src/hooks/useGeoData.ts` | exact role/data-flow |
| `src/hooks/useGeoData.ts` | hook/service | file-I/O + request-response | `src/hooks/useGeoData.ts` | exact |
| `src/hooks/useLocalStorage.ts` | hook/service | CRUD | `src/hooks/useLocalStorage.ts` | exact |
| `src/utils/mapProjection.ts` | utility | transform | `src/utils/mapProjection.ts` | exact |
| `src/utils/camera.ts` | utility | transform | none | new boundary; partial math analog in `mapProjection.ts` |
| `src/utils/geojson.ts` | utility/validator | transform | `src/utils/geojson.ts` | exact |
| `src/utils/scene.ts` | utility | transform | `src/utils/colors.ts`, `src/utils/geojson.ts` | role-match |
| `src/utils/legend.ts` | utility | transform | `src/utils/colors.ts` | role/data-flow match |
| `src/utils/storage.ts` | service/adapter | CRUD + file-I/O | `src/utils/storage.ts` | exact |
| `src/utils/historicalValidation.ts` | utility/validator | transform | `src/utils/geojson.ts`, `scripts/prepareGeoData.mjs` | role-match |
| `src/utils/export.ts` | utility/service | file-I/O | `src/utils/export.ts` | exact |

### Components

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/App.tsx` | controller/composition root | event-driven | `src/App.tsx` | exact |
| `src/components/AppHeader.tsx` | component | request-response | `src/components/AppHeader.tsx` | exact |
| `src/components/Controls.tsx` | component | event-driven | `src/components/Controls.tsx` | exact |
| `src/components/CompositionBar.tsx` | component | event-driven | `src/components/Controls.tsx` | role-match |
| `src/components/MapWorkspace.tsx` | component | request-response | `src/components/MapWorkspace.tsx` | exact; threads one handle ref and typed legend slot |
| `src/components/MapCanvas.tsx` | component/controller | event-driven + streaming | `src/components/MapCanvas.tsx` | exact integration point |
| `src/components/MapNavigation.tsx` | component | event-driven | `src/components/Controls.tsx` | role-match |
| `src/components/Tooltip.tsx` | component | event-driven | `src/components/Tooltip.tsx` | exact |
| `src/components/CountryList.tsx` | component | CRUD-style selection transform | `src/components/CountryList.tsx` | exact |
| `src/components/LocateCountry.tsx` | component | request-response | `src/components/CountryList.tsx`, `src/components/ColorPicker.tsx` | role-match |
| `src/components/LegendDisclosure.tsx` | component | event-driven | `src/components/ColorPicker.tsx` | partial |
| `src/components/LegendEditor.tsx` | component | CRUD + transform | `src/components/ColorPicker.tsx`, `src/components/CountryList.tsx` | role-match |
| `src/components/LegendOverlay.tsx` | component | transform + event-driven | `src/components/MapCanvas.tsx` | partial; group-only React payload inserted inside the canonical SVG |
| `src/components/SaveLoad.tsx` | component | CRUD | `src/components/SaveLoad.tsx` | exact |
| `src/components/OnboardingBanner.tsx` | component | request-response | `src/components/OnboardingBanner.tsx` | exact |
| `src/components/FatalErrorState.tsx` | component | request-response | `src/components/FatalErrorState.tsx` | exact |
| `src/components/ToastRegion.tsx` | component | event-driven | `src/components/ToastRegion.tsx` | exact |

### Styles

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/styles/theme.css` | config/style | transform | `src/styles/theme.css` | exact |
| `src/styles/App.css` | config/style | responsive transform | `src/styles/App.css` | exact |
| `src/styles/MapCanvas.css` | config/style | event-driven visual state | `src/styles/MapCanvas.css` | exact |
| `src/styles/Controls.css` | config/style | responsive transform | `src/styles/Controls.css` | exact |

### Tests

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/utils/camera.test.ts` | test | transform | `src/utils/mapProjection.test.ts` | exact role |
| `src/utils/worldDataAsset.test.ts` | test | file-I/O | `src/utils/geoDataAsset.test.ts` | exact role |
| `src/utils/scene.test.ts` | test | transform | `src/utils/colors.test.ts`, `src/utils/geojson.test.ts` | role-match |
| `src/utils/legend.test.ts` | test | transform | `src/utils/colors.test.ts` | role-match |
| `src/utils/storage.test.ts` | test | CRUD + file-I/O | `src/utils/storage.test.ts` | exact |
| `src/utils/historicalValidation.test.ts` | test | transform | `src/utils/geojson.test.ts` | exact role |
| `src/utils/export.test.ts` | test | file-I/O | `src/utils/export.test.ts` | exact |
| `src/components/MapWorkspace.test.tsx` | test | request-response | `src/components/MapWorkspace.test.tsx` | exact |
| `src/components/SaveLoad.test.tsx` | test | CRUD | `src/components/SaveLoad.test.tsx` | exact |
| `src/components/Controls.test.tsx` | test | event-driven | `src/components/Controls.test.tsx` | exact |
| `src/components/ToastRegion.test.tsx` | test | request-response | `src/components/ToastRegion.test.tsx` | exact |
| `src/App.test.tsx` | test | event-driven | `src/App.test.tsx` | exact |
| `tests/e2e/phase2-composition.spec.ts` | test | browser event-driven | none | new boundary |

## Pattern Assignments

The following excerpt IDs are referenced by every target-file assignment. They are intentionally concrete so plan actions can cite exact source lines without repeating the same Phase 1 code many times.

### P1 — Typed Contracts and Discriminated Results

**Source:** `src/types/map.ts` lines 20-55 and 71-95; `src/types/ui.ts` lines 23-46

```typescript
export interface MapState {
  colors: ColorMap;
  history: ColorHistory;
  historyIndex: number;
  selectedIds: SelectedCountryIds;
}

export type MapAction =
  | { type: 'RESET_ALL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'LOAD_STATE';
      payload: { colors: ColorMap };
    };

export type GeoDataState =
  | { status: 'loading' }
  | {
      status: 'ready';
      features: ReadonlyArray<GeoFeature>;
      lookup: ReadonlyMap<CountryId, GeoFeature>;
      warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      status: 'error';
      reason: 'fetch-failed' | 'invalid-data';
    };
```

```typescript
export type StorageResult<T = undefined> =
  | {
      ok: true;
      value: T;
      warnings: ReadonlyArray<StorageWarning>;
    }
  | {
      ok: false;
      reason: StorageErrorReason;
    };
```

**Copy rule:** use readonly semantic state, explicit action payloads, and discriminated results. Do not represent camera/snapshot/legend load with unrelated booleans or nullable partial objects.

### P2 — Provider Ownership with Memoized Commands

**Source:** `src/providers/MapStateProvider.tsx` lines 30-49, 136-145, 227-235, 240-360

```typescript
export interface MapStateContextValue {
  state: MapState;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  selectCountry: (countryId: CountryId | null) => void;
  loadState: (colors: ColorMap) => void;
}

export function createInitialMapState(): MapState {
  const colors = createEmptyColorMap();

  return {
    colors,
    history: [colors],
    historyIndex: 0,
    selectedIds: new Set(),
  };
}
```

```typescript
case 'LOAD_STATE': {
  const colors = canonicalizeColorMap(action.payload.colors);

  return {
    ...state,
    colors,
    history: [colors],
    historyIndex: 0,
  };
}
```

```typescript
const value = useMemo<MapStateContextValue>(
  () => ({
    state,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    canReset: Object.keys(state.colors).length > 0,
    selectCountry,
    loadState,
  }),
  [state, selectCountry, loadState],
);
```

**Copy rule:** `CompositionStateProvider` may copy the provider/reducer/command shape, but must not copy color history into camera, period, or legend edits. Complete composition load is one explicit command; ordinary camera updates remain outside the color reducer.

### P3 — Guarded Context Hook

**Source:** `src/hooks/useMapState.ts` lines 1-18

```typescript
export function useMapState(): MapStateContextValue {
  const context = useContext(MapStateContext);

  if (context === undefined) {
    throw new Error(
      'useMapState must be used within a MapStateProvider.',
    );
  }

  return context;
}
```

**Copy rule:** `useCompositionState` should be a thin context guard, not a second state owner.

### P4 — Abortable Async Loader with Typed Ready/Error State

**Source:** `src/hooks/useGeoData.ts` lines 13-49 and 51-98

```typescript
type GeoDataLoadState =
  | { status: 'loading' }
  | {
      status: 'ready';
      features: ReadonlyArray<GeoFeature>;
      warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      status: 'error';
      reason: 'fetch-failed' | 'invalid-data';
    };

async function loadGeoData(signal: AbortSignal): Promise<GeoDataLoadState> {
  const response = await globalThis.fetch(GEO_DATA_URL, { signal });
  if (!response.ok) {
    return { status: 'error', reason: 'fetch-failed' };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: 'error', reason: 'invalid-data' };
  }

  const normalizationResult = normalizeGeoJson(payload);
  if (!normalizationResult.ok) {
    return { status: 'error', reason: 'invalid-data' };
  }

  return {
    status: 'ready',
    features: normalizationResult.features,
    warnings: normalizationResult.warnings,
  };
}
```

```typescript
useEffect((): (() => void) => {
  const controller = new AbortController();

  void loadGeoData(controller.signal)
    .then((nextState): void => {
      if (!controller.signal.aborted) {
        setLoadState(nextState);
      }
    })
    .catch((): void => {
      if (!controller.signal.aborted) {
        setLoadState({ status: 'error', reason: 'fetch-failed' });
      }
    });

  return (): void => controller.abort();
}, []);
```

**Copy rule:** `useSnapshotData` should keep the previous completed scene visible while a new asset is loading, cache validated results by snapshot ID, and return typed failure without replacing the current scene.

### P5 — D3 Subtree Ownership, Stable Joins, and Split Geometry/Style Effects

**Source:** `src/components/MapCanvas.tsx` lines 172-246, 247-390, 392-454, 467-480

```typescript
export const MapCanvas = forwardRef<HTMLDivElement, MapCanvasProps>(
  function MapCanvas(props, exportSourceRef): JSX.Element {
    const svgRef = useRef<SVGSVGElement>(null);
    const colorsRef = useRef(colors);
    const callbacksRef = useRef<MapCanvasCallbacks>({
      onSelectCountry,
      onClearSelection,
      onTooltipChange,
    });

    useLayoutEffect((): (() => void) | undefined => {
      const svgElement = svgRef.current;
      if (svgElement === null || alphabeticalFeatures.length === 0) {
        return undefined;
      }

      const countriesLayer = select(svgElement).select<SVGGElement>(
        '[data-layer="countries"]',
      );
      const countries = countriesLayer
        .selectAll<SVGPathElement, GeoFeature>('path.country-path')
        .data(alphabeticalFeatures, (feature): CountryId => feature.id)
        .join(
          (enter) => enter.append('path'),
          (update) => update,
          (exit) => exit.remove(),
        )
        .attr('d', (feature): string => createSafeMapPath(pathGenerator, feature));

      return (): void => {
        countries.on('.map', null);
        countries.interrupt();
      };
    }, [alphabeticalFeatures]);
```

```typescript
useEffect((): (() => void) | undefined => {
  const countries = select(svgElement)
    .select<SVGGElement>('[data-layer="countries"]')
    .selectAll<SVGPathElement, GeoFeature>('path.country-path')
    .attr('fill', (feature): string =>
      getEffectiveCountryColor(colors, feature.id),
    )
    .classed('selected', (feature): boolean => selectedIds.has(feature.id))
    .attr('aria-selected', (feature): string =>
      String(selectedIds.has(feature.id)),
    );

  return runAfterPaint((): void => {
    INTERACTION_MEASURES.forEach(({ startMark, measureName }): void => {
      measureAndConsume(startMark, measureName);
    });
  });
}, [alphabeticalFeatures, colors, selectedIds]);
```

```tsx
<div className="map-export-source" ref={exportSourceRef}>
  <svg
    ref={svgRef}
    className="map-canvas"
    viewBox={`0 0 ${MAP_VIEWBOX_SIZE} ${MAP_VIEWBOX_SIZE}`}
    role="listbox"
    aria-multiselectable="true"
  >
    <g data-layer="countries" />
  </svg>
</div>
```

**Copy rule:** geometry/path creation remains keyed and stable; pan/zoom changes only group/path transforms. Event listeners are namespaced and removed in cleanup. Do not let React render the same country paths D3 mutates. Phase 2 should extract camera logic rather than grow this already-large component further.

### P6 — Safe Geometry and Boundary Failure Containment

**Source:** `src/utils/mapProjection.ts` lines 28-92; `src/utils/geojson.ts` lines 130-184

```typescript
export function createSafeMapPath(
  pathGenerator: ReturnType<typeof geoPath>,
  feature: GeoFeature,
): string {
  try {
    const pathData = pathGenerator(feature);

    if (pathData === null || INVALID_PATH_DATA_PATTERN.test(pathData)) {
      return '';
    }

    return pathData;
  } catch {
    return '';
  }
}
```

```typescript
export function normalizeGeoJson(input: unknown): GeoJsonNormalizationResult {
  if (
    !isRecord(input) ||
    input.type !== 'FeatureCollection' ||
    !Array.isArray(input.features)
  ) {
    return { ok: false, reason: 'invalid-collection', warnings: [] };
  }

  const features: GeoFeature[] = [];
  const warnings: GeoJsonWarning[] = [];
  const acceptedIds = new Set<string>();
  // Validate each feature, warn and skip malformed entries.

  return features.length > 0
    ? { ok: true, features, warnings }
    : { ok: false, reason: 'no-valid-features', warnings };
}
```

**Copy rule:** world, manifest, and historical validators must accept `unknown`, validate every boundary, preserve valid neighbors, and never emit non-finite path data. Correct the latitude boundary to allow exactly `-90` and `90`; Phase 1 currently rejects them in `geojson.ts` lines 34-38.

### P7 — Single Storage Adapter with Partial Recovery

**Source:** `src/utils/storage.ts` lines 84-159, 205-280, 287-366

```typescript
function normalizeColorMap(
  value: unknown,
  validCountryIds?: ReadonlySet<string>,
): { colors: ColorMap; isCorrupt: boolean } | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const colors = createEmptyColorMap();
  const entries = Object.entries(value);
  let isCorrupt = entries.length > MAX_STORED_COLOR_ENTRIES;

  for (const [countryId, rawColor] of entries.slice(0, MAX_STORED_COLOR_ENTRIES)) {
    if (!isSafeStableCountryId(countryId) || typeof rawColor !== 'string') {
      isCorrupt = true;
      continue;
    }
    // Normalize valid entries and preserve the usable subset.
  }

  return { colors, isCorrupt };
}
```

```typescript
function read(key: string): StorageReadResult {
  if (storage === null) {
    return { ok: false, reason: 'storage-unavailable' };
  }

  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}

function write(key: string, value: string): StorageWriteResult {
  if (storage === null) {
    return { ok: false, reason: 'storage-unavailable' };
  }

  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (error: unknown) {
    return isQuotaExceededError(error)
      ? { ok: false, reason: 'quota-exceeded' }
      : { ok: false, reason: 'storage-unavailable' };
  }
}
```

```typescript
const savedMaps = [
  savedMap,
  ...listResult.value.filter((map) => map.name !== nameResult.value),
].slice(0, MAX_SAVED_MAPS);
```

**Copy rule:** preserve the key, max-10, newest-first, replace-by-name, bounded parsing, reserved-key rejection, and warnings. Add V1/V2 parsing inside this adapter or make any new `compositionStorage.ts` a pure parser called by this adapter; never let two modules write `countriesirl_maps` independently. Migration is in-memory on read and written only on explicit save/replace.

### P8 — Export Clone, Sanitize, Validate, and Nested Cleanup

**Source:** `src/utils/export.ts` lines 36-95 and 115-195

```typescript
function sanitizeEditorState(svg: SVGSVGElement): void {
  const elements: Element[] = [svg, ...svg.querySelectorAll('*')];

  elements.forEach((element: Element): void => {
    element.classList.remove(...EDITOR_STATE_CLASSES);
    EDITOR_STATE_ATTRIBUTES.forEach((attribute: string): void => {
      element.removeAttribute(attribute);
    });
  });
}
```

```typescript
export async function exportMapPng(
  source: HTMLElement,
  date: Date = new Date(),
): Promise<ExportResult> {
  if (!source.isConnected) {
    return { ok: false, reason: 'source-not-found' };
  }

  try {
    exportFrame = createExportFrame(sourceSvg);
    document.body.appendChild(exportFrame);

    canvas = await html2canvas(exportFrame, {
      backgroundColor: EXPORT_BACKGROUND_COLOR,
      width: EXPORT_FRAME_SIZE,
      height: EXPORT_FRAME_SIZE,
      scale: EXPORT_SCALE,
      windowWidth: EXPORT_FRAME_SIZE,
      windowHeight: EXPORT_FRAME_SIZE,
    });

    if (canvas.width !== EXPORT_SIZE || canvas.height !== EXPORT_SIZE) {
      return { ok: false, reason: 'invalid-dimensions' };
    }
    // Encode, connect anchor, click, await bounded handoff.
  } finally {
    try {
      downloadAnchor?.remove();
    } finally {
      try {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      } finally {
        exportFrame?.remove();
      }
    }
  }
}
```

**Copy rule:** App freezes camera/snapshot transitions synchronously before awaiting this utility. The utility clones the already-correct SVG transform and legend, removes `[data-editor-only]`, decorative accessibility duplicates, outgoing scenes, and editor state, then preserves the exact existing 540-at-2x capture and cleanup contract.

### P9 — Root Orchestration Above the Responsive Branch

**Source:** `src/App.tsx` lines 51-75, 254-307, 311-337, 338-395

```typescript
export default function App(): JSX.Element {
  const {
    state: { colors, selectedIds },
    canUndo,
    canRedo,
    loadState,
  } = useMapState();
  const geoData = useGeoData();
  const layout = useResponsiveLayout();
  const exportSourceRef = useRef<HTMLDivElement>(null);
  const exportInProgressRef = useRef(false);
```

```typescript
const handleExport = useCallback(async (): Promise<void> => {
  if (exportInProgressRef.current) {
    return;
  }

  const exportSource = exportSourceRef.current;
  if (exportSource === null) {
    showExportFailure();
    return;
  }

  exportInProgressRef.current = true;
  setIsExporting(true);

  try {
    const result = await exportMapPng(exportSource);
    didExportSucceed = result.ok;
  } catch {
    didExportSucceed = false;
  } finally {
    exportInProgressRef.current = false;
    setIsExporting(false);
  }
}, [showExportFailure, showStatus]);
```

```tsx
<main className={`workspace workspace--${layout}`}>
  {layout === 'desktop' ? (
    <>
      {mapWorkspace}
      <aside className="workspace__control-column">
        {actionControls}
        {selectionAndColorControls}
        {countryList}
      </aside>
    </>
  ) : (
    <>
      {actionControls}
      {mapWorkspace}
      {selectionAndColorControls}
      {countryList}
    </>
  )}
</main>
```

**Copy rule:** camera, period, legend, persistence, export lock, toast, and modal state must exist above the desktop/compact JSX branch. App coordinates complete-composition load and export as single intents; child effects must not independently apply parts of a saved composition.

### P10 — Accessible Dialog, Focus Trap, and Responsive Opener Recovery

**Source:** `src/components/SaveLoad.tsx` lines 193-275, 328-348, 372-399

```typescript
useEffect((): (() => void) => {
  openerRef.current =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  refreshSavedMaps();
  nameInputRef.current?.focus();

  return (): void => {
    if (shouldRestoreOpenerRef.current) {
      restoreSaveLoadFocus(
        openerRef.current,
        document.querySelector<HTMLElement>(SAVE_LOAD_CONTROL_SELECTOR),
        onFocusMap,
      );
    }
  };
}, [onFocusMap, refreshSavedMaps]);
```

```typescript
if (event.key === 'Escape') {
  event.preventDefault();
  event.stopPropagation();
  requestClose();
  return;
}

if (event.key === 'Tab' && dialogRef.current !== null) {
  const focusableElements = Array.from(
    dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  // Wrap first/last focus and recover focus entering from outside.
}
```

```typescript
onLoad(result.value);
const feedback = getLoadFeedback(result.warnings);
onStatus(feedback.message, feedback.severity);
shouldRestoreOpenerRef.current = false;
onClose();
requestAnimationFrame(onFocusMap);
```

**Copy rule:** preserve the existing modal focus trap and responsive-equivalent opener restoration. Add dirty-load and delete confirmations inside this ownership boundary. Successful load is the intentional exception and returns focus to the logical map.

### P11 — Derived Lists and Validated Form Drafts

**Source:** `src/components/CountryList.tsx` lines 29-63 and 65-115; `src/components/ColorPicker.tsx` lines 44-61, 89-120, 122-205

```typescript
const sortedCountries = useMemo(
  () =>
    [...countries].sort((left, right) =>
      left.properties.name.localeCompare(right.properties.name),
    ),
  [countries],
);
const validCountryIds = useMemo(
  () => new Set<CountryId>(countryIds),
  [countryIds],
);

const handleCountryChange = useCallback(
  (event: ChangeEvent<HTMLInputElement>): void => {
    const countryId = event.currentTarget.value;
    if (validCountryIds.has(countryId)) {
      toggleSelection(countryId);
    }
  },
  [toggleSelection, validCountryIds],
);
```

```typescript
const customColorResult = useMemo(
  () => normalizeColor(customDraft),
  [customDraft],
);

const handleCustomSubmit = useCallback(
  (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (controlsDisabled || !customColorResult.ok) {
      return;
    }
    // Commit only a validated semantic value.
  },
  [controlsDisabled, customColorResult],
);
```

**Copy rule:** Country search, Locate combobox, legend label drafts, and legend controls should derive filtered/validated state with `useMemo`; commit semantic values only after validation. Draft text must not mutate selection, camera, or committed legend labels.

### P12 — Tooltip Measurement and Movement Observation

**Source:** `src/components/Tooltip.tsx` lines 105-143, 149-181, 184-254

```typescript
export function observeKeyboardTooltipAnchor({
  anchorElement,
  onPositionChange,
  eventTarget = window,
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
}: ObserveKeyboardTooltipAnchorOptions): () => void {
  let frameHandle: number | null = null;
  let isActive = true;

  const schedulePositionRefresh = (): void => {
    if (isActive && frameHandle === null) {
      frameHandle = requestFrame(refreshPosition);
    }
  };

  eventTarget.addEventListener('scroll', schedulePositionRefresh, true);
  eventTarget.addEventListener('resize', schedulePositionRefresh);

  return (): void => {
    isActive = false;
    eventTarget.removeEventListener('scroll', schedulePositionRefresh, true);
    eventTarget.removeEventListener('resize', schedulePositionRefresh);
    if (frameHandle !== null) cancelFrame(frameHandle);
  };
}
```

```typescript
const positionStyle: CSSProperties = isPositionCurrent
  ? { left: measuredPosition.left, top: measuredPosition.top }
  : { ...getTooltipMeasurementPosition(), visibility: 'hidden' };
```

**Copy rule:** update keyboard tooltip anchors during camera movement and wrapped logical-path reconciliation. Measure from the stable hidden position first, then clamp at the existing 8px viewport margin. Extend tooltip data with boundary mode and period label; do not expose raw IDs or provenance.

### P13 — Deterministic Build-Time Asset Script

**Source:** `scripts/prepareGeoData.mjs` lines 1-15, 79-124, 189-239, 242-270

```javascript
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
```

```javascript
function verifySource(sourceBytes) {
  const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
  if (sourceHash !== EXPECTED_SOURCE_SHA256) {
    throw new Error(
      `Natural Earth ${NATURAL_EARTH_VERSION} source checksum mismatch: ${sourceHash}`,
    );
  }
}
```

```javascript
function createCanonicalBytes(sourceBytes) {
  const parsedSource = JSON.parse(sourceBytes.toString('utf8'));
  const normalized = normalizeSource(parsedSource);
  return Buffer.from(`${JSON.stringify(normalized)}\n`, 'utf8');
}

async function run() {
  const { check, source } = parseArguments(process.argv.slice(2));
  const sourceBytes = await readSource(source);
  verifySource(sourceBytes);
  const canonicalBytes = createCanonicalBytes(sourceBytes);

  if (check) {
    const committedBytes = await readFile(OUTPUT_PATH);
    if (!canonicalBytes.equals(committedBytes)) {
      throw new Error('Committed asset differs from deterministic output.');
    }
    return;
  }

  await writeFile(OUTPUT_PATH, canonicalBytes);
}
```

**Copy rule:** world and historical scripts remain build-only ESM, exact-hash inputs, canonical sorted output, explicit `--check`, and fail-fast validation. Add reviewed manifests rather than inferring core/parent relationships in the browser.

### P14 — Current Test Conventions

**Sources:**

- Pure utility/table tests: `src/utils/geojson.test.ts` lines 39-197.
- Deterministic geometry/performance invariants: `src/utils/mapProjection.test.ts` lines 231-427.
- Fake localStorage boundary: `src/utils/storage.test.ts` lines 5-48 and 50-434.
- Fake DOM/export resource lifecycle: `src/utils/export.test.ts` lines 268-469.
- SSR component semantics: `src/components/Controls.test.tsx` lines 1-29 and `src/App.test.tsx` lines 59-117.
- Asset checkout invariant: `src/utils/geoDataAsset.test.ts` lines 1-11.

```typescript
describe('normalizeGeoJson', (): void => {
  it.each([
    { label: 'missing IDs', feature: createFeature(undefined, 'France'), code: 'missing-id' },
    { label: 'unsupported geometry', feature: createFeature('FRA', 'France', point), code: 'unsupported-geometry' },
  ])('omits $label with a warning', ({ feature, code }): void => {
    const result = normalizeGeoJson(createCollection([validFeature, feature]));
    expect(result).toMatchObject({
      ok: true,
      features: [{ id: 'ESP' }],
      warnings: [{ featureIndex: 1, code }],
    });
  });
});
```

```typescript
const markup = renderToStaticMarkup(<Controls {...props} />);
expect(markup).toContain('data-save-load-control="true"');
expect(markup).not.toMatch(/Ctrl|Cmd|⌘/i);
```

**Copy rule:** keep Vitest source-scoped and Node-based. Test pure math/validation directly, component semantics through server rendering, and browser-only gestures/export parity through Playwright. Do not add snapshot tests for SVG visuals.

## Per-File Pattern Assignment Matrix

### Infrastructure and Data

| Target | Copy From | Concrete Assignment |
|---|---|---|
| `package.json` | `package.json` lines 6-33 | Preserve exact-pinned dependencies and script naming. Add exact-pinned `mapshaper` and `@playwright/test`; add deterministic data-check and `test:e2e` scripts without changing React/D3/html2canvas versions. |
| `eslint.config.js` | `eslint.config.js` lines 7-29 | Keep flat config and explicit return/no-`any` rules. Extend root ignores to `.planning/**` while keeping product/script/config files linted; add Node globals for `scripts/**/*.mjs` and Playwright globals/config as needed. |
| `playwright.config.ts` | P14 | New boundary. Use installed `chrome` and `msedge` channels, deterministic local Vite web server, isolated artifacts, and no browser download assumption. |
| `.gitattributes` | `.gitattributes` line 1; `geoDataAsset.test.ts` lines 1-11 | Add LF rules for world and snapshot JSON/GeoJSON so deterministic byte checks survive Windows checkout. |
| `scripts/prepareWorldData.mjs` | P13 | Copy argument parsing, source hash verification, strict geometry validation, sorted canonical bytes, `--check`, and one top-level error boundary. Add exact 195/core and 248-unit assertions plus reviewed source/parent joins. |
| `scripts/prepareHistoricalSnapshot.mjs` | P13 | Copy deterministic file pipeline, but add provenance/license/review metadata and topology checks. Do not treat raw source IDs as logical entity IDs. |
| `public/data/world-modern.geojson` | P13, P6 | Generated output only; no hand edits. Runtime fields should be minimal and stable, with geometry identity separated from `entityId`/`colorOwnerId` through the reviewed manifest or normalized scene model. |
| `public/data/world-manifest.json` | P13 | Generated/reviewed static contract containing source hashes, exact core IDs, source joins, parent/neutral policy, and metadata. Runtime must validate it as untrusted bundled JSON. |
| `public/data/snapshots/index.json` | P1, P6 | New manifest boundary. Include ID, label, as-of date, asset path/hash, coverage, source records, review status, and fallback label. Only historian-reviewed entries become selectable. |
| `public/data/snapshots/<snapshot-id>.geojson` | P13, P6 | New curated overlay asset boundary. Store only reviewed historical overlay geometry and curated entity IDs; modern world remains the fallback base. |

### Types, State, Hooks, and Utilities

| Target | Copy From | Concrete Assignment |
|---|---|---|
| `src/types/map.ts` | P1 | Extend geometry contracts with scene/source/color-owner identity and boundary mode while keeping `CountryId` color keys stable. Keep color history types separate from composition state. |
| `src/types/composition.ts` | P1 | Define `CameraState`, `LegendState`, `SnapshotManifestEntry`, `CompositionState`, `SavedCompositionV2`, and coordinated-load result types as readonly semantic contracts. |
| `src/types/ui.ts` | P1 | Extend storage warning/error and export failure unions with explicit Phase 2 reasons. Keep creator-facing text out of low-level result types. |
| `src/constants/config.ts` | `src/constants/config.ts` lines 1-17 | Preserve central named limits. Move camera/snapshot-specific constants to focused modules rather than expanding one generic file indefinitely. |
| `src/constants/camera.ts` | `src/constants/config.ts` lines 7-17 | Define `WORLD_SIZE`, min/max zoom, Mercator latitude limit, click distance, zoom step, pan step, animation duration, safe padding, and initial semantic camera. |
| `src/constants/snapshots.ts` | `src/constants/config.ts` lines 1-17 | Define manifest URL, modern ID, cache/retry constants, and approved status enums; do not duplicate labels already supplied by the manifest unless they are invariant defaults. |
| `src/providers/CompositionStateProvider.tsx` | P2 | Copy provider/reducer/memoized command shape. Own committed semantic camera, snapshot ID, legend state, background, dirty baseline, and coordinated load. No undo/redo stack for these fields. |
| `src/hooks/useCompositionState.ts` | P3 | Thin guarded context accessor only. |
| `src/hooks/useCameraController.ts` | P5 plus `MapCanvas.tsx` refs/cleanup lines 184-199 and 373-389 | MapCanvas-internal controller only. Own live `ZoomTransform`, D3 behavior, transition/RAF handles, lock, and camera operations; MapCanvas exposes exactly one shared `MapCanvasHandle`. Root/children never construct or import a second controller. |
| `src/hooks/useSnapshotData.ts` | P4 | Abortable and cached loader. Keep prior completed snapshot active during load; on failure return typed status and leave prior scene untouched. |
| `src/hooks/useGeoData.ts` | P4 | Generalize hardcoded Europe URL to world data + manifest composition. Continue returning memoized O(1) lookup and warnings. |
| `src/hooks/useLocalStorage.ts` | `src/hooks/useLocalStorage.ts` lines 15-26 and 42-123; P7 | Preserve stable adapter instance and `recordResult` pattern. Change save/load signatures to complete composition values and expose migration warnings without owning parsing rules. |
| `src/utils/mapProjection.ts` | P6 | Replace fixed-Europe fitting with one fixed canonical Mercator projection and safe path generation. Projection is created once per data shape, not per camera frame. |
| `src/utils/camera.ts` | P1, P6 | New pure math boundary for wrapped constraints, semantic camera/transform conversion, longitude normalization, vertical clamps, nearest wrapped copy, and antimeridian-safe Locate targets. No DOM access. |
| `src/utils/geojson.ts` | P6 | Preserve unknown-input validation and partial warnings. Allow pole coordinates exactly ±90, then rely on projection clipping/path safety. |
| `src/utils/scene.ts` | `src/utils/colors.ts` lines 67-102 and 121-164; P6 | Build effective scene features and colors from modern base, historical overlays, color owners, and stable entity IDs. Return immutable derived data; never mutate the color reducer. |
| `src/utils/legend.ts` | `src/utils/colors.ts` lines 28-56 and 87-102; P1 | Reconcile active effective colors to color-keyed metadata, omit white, restore dormant labels/order, calculate deterministic columns/bounds, and validate export capacity. |
| `src/utils/storage.ts` | P7 | Upgrade the existing adapter to V1/V2 parsing, nested repair warnings, known snapshot validation, semantic camera bounds, legend limits, and explicit-save migration. Keep one storage key and one writer. |
| `src/utils/historicalValidation.ts` | P6, P13 | Validate manifest schema, hashes, source records, review status, coverage, entity-ID collisions, and asset geometry. Runtime errors are typed; build checks fail hard. |
| `src/utils/export.ts` | P8 | Preserve clone/capture/download/cleanup. Extend sanitization for `[data-editor-only]`, outgoing scenes, duplicate visual copies, selection/focus/hover, and custom filename sanitization while retaining camera transform and legend group. |

### Components

| Target | Copy From | Concrete Assignment |
|---|---|---|
| `src/App.tsx` | P9 | Remain the orchestration root. Store/rebind exactly one `MapCanvasHandle` through responsive remounts, inject narrow callbacks/handle accessors into navigation/load/save/export, pass provider legend state through the typed in-SVG slot, and keep all state above responsive branches. |
| `src/components/AppHeader.tsx` | `AppHeader.tsx` lines 1-29 | Keep a small typed presentational component. Update exact subtitle and place desktop global actions according to UI spec without moving state ownership into the header. |
| `src/components/Controls.tsx` | `Controls.tsx` lines 1-102 | Preserve native disabled/busy states and the synchronous activation lock. Keep color undo/redo/reset separate from Reset View. If renamed `GlobalActions`, retain the same event-only ownership. |
| `src/components/CompositionBar.tsx` | `Controls.tsx` lines 56-100; P11 | Native/select-only period control, persistent status line, and Reset View. Accept typed state/callbacks; do not fetch snapshots or own camera state. |
| `src/components/MapWorkspace.tsx` | `MapWorkspace.tsx` lines 14-94 | Preserve square shell and loading/error/warning rendering. Thread the sole MapCanvasHandle ref and a typed LegendOverlay slot into MapCanvas; navigation/tooltip remain editor siblings, but the legend is inside MapCanvas's canonical SVG. |
| `src/components/MapCanvas.tsx` | P5 | Keep D3 ownership of the camera/country subtree and one logical accessible path per entity. Create one internal controller, expose the sole `MapCanvasHandle`, preserve connected export-source access, and render the typed React legend slot after the camera group in the same SVG without regenerating `d`. |
| `src/components/MapNavigation.tsx` | `Controls.tsx` lines 56-100; P11 | Native 44x44 buttons, truthful min/max disabled states, controlled popover, Escape/outside dismissal, and callbacks into camera controller. Mark all navigation UI editor-only. |
| `src/components/Tooltip.tsx` | P12 | Extend data/content with period boundary context and refresh on camera movement/wrapped focus reconciliation. Keep pointer-events none and export exclusion. |
| `src/components/CountryList.tsx` | P11 | Add search and Select Visible using memoized filtered data. Preserve checkbox-only selection behavior and current-color swatches. Do not couple row activation to camera movement. |
| `src/components/LocateCountry.tsx` | P11 | Controlled combobox draft + explicitly committed country target. Editing invalidates the target; Locate remains disabled until commit. Invoke camera callback only and retain focus on action. |
| `src/components/LegendDisclosure.tsx` | `ColorPicker.tsx` lines 122-208 | Native button with `aria-expanded`/`aria-controls`, collapsed by default, exact empty/populated summaries, and no state beyond disclosure UI. |
| `src/components/LegendEditor.tsx` | P11; `CountryList.tsx` lines 65-115 | Render semantic HTML controls for labels/order/theme/size/opacity/border/position. Validate drafts before commit, keep focus after reorder, and provide button/keyboard equivalents to drag. |
| `src/components/LegendOverlay.tsx` | P5 | Group-only React-owned `<g data-layer="legend">` payload; MapCanvas places it after the D3 camera group inside the canonical SVG. Use only SVG primitives, canonical 1080-unit geometry, `data-editor-only` handles, pointer-stop for drag, and no CSS filters/foreignObject. |
| `src/components/SaveLoad.tsx` | P10, P11 | Preserve modal focus behavior while adding V2 metadata, legacy messaging, inline delete confirmation, dirty-load confirmation, and coordinated load callback. Do not parse storage records in the component. |
| `src/components/OnboardingBanner.tsx` | `OnboardingBanner.tsx` lines 1-42 | Keep non-modal conditional rendering and semantic ordered steps; update exact Phase 2 copy and focus target behavior. |
| `src/components/FatalErrorState.tsx` | `FatalErrorState.tsx` lines 1-20 | Keep small creator-safe alert component; change Europe copy to world copy only. Do not expose asset/source errors. |
| `src/components/ToastRegion.tsx` | `ToastRegion.tsx` lines 35-58 and 98-135 | Extend approved message handling for camera, period, legend, migration, and persistence outcomes. Persistent historical fallback stays near CompositionBar, not only in ToastRegion. |

### Styles

| Target | Copy From | Concrete Assignment |
|---|---|---|
| `src/styles/theme.css` | `theme.css` lines 1-65, 67-83, 118-199 | Preserve tokenized spacing/type/radius/focus and global reduced-motion fallback. Replace Phase 1 colors with the approved teal/light/dark contract and add scene/camera motion plus reduced-transparency/contrast/forced-colors tokens. |
| `src/styles/App.css` | `App.css` lines 107-213 | Preserve one active DOM and the 1200px React breakpoint. Update desktop grid to `minmax(0, 1fr) 376px`, keep 900/768 CSS sub-layouts, and avoid duplicate hidden workspaces. |
| `src/styles/MapCanvas.css` | `MapCanvas.css` lines 13-79 and 142-181 | Preserve square shell, path state classes, non-scaling strokes, tooltip containment, and editor/export state separation. Change map `touch-action` to `none` only on the square and add navigation/legend editor overlays outside export content. |
| `src/styles/Controls.css` | `Controls.css` lines 1-65, 265-354, 356-637 | Reuse native control sizing, list rows, modal/sheet breakpoints, sticky mobile header, toast layers, and reduced-motion busy state. Refactor card styling into one inspector shell with divided sections instead of nested cards. |

### Tests

| Target | Copy From | Concrete Assignment |
|---|---|---|
| `src/utils/camera.test.ts` | P14, especially `mapProjection.test.ts` lines 280-427 | Table-test wrap normalization, vertical clamp, semantic round-trip, one-world minimum, programmatic target constraint, nearest copy, antimeridian Locate, and boundary zoom values. |
| `src/utils/worldDataAsset.test.ts` | `geoDataAsset.test.ts` lines 1-11; P13 | Assert LF rules, source hashes, exact 195 core IDs, exact runtime unit count, supplement set, parent/neutral policy, no duplicate IDs, and finite path output. |
| `src/utils/scene.test.ts` | `colors.test.ts` conventions; `geojson.test.ts` lines 214-278 | Test effective parent colors, neutral units, modern fallback, stable identity preservation, and new historical entities defaulting white. |
| `src/utils/legend.test.ts` | `colors.test.ts` conventions; P14 | Test uppercase/nonwhite derivation, dormant metadata, first-use order, label limits, column thresholds, bounds/clamps, and export-blocking validation. |
| `src/utils/storage.test.ts` | `storage.test.ts` lines 5-48 and 50-434 | Extend FakeStorage tests for V1 migration, V2 round trip, unsupported versions, mixed valid/corrupt records, nested repair, max-10, quota, reserved keys, and no write during list/load. |
| `src/utils/historicalValidation.test.ts` | `geojson.test.ts` lines 39-259 | Table-test malformed manifests/assets, review status, hashes, licenses, coverage, duplicate identities, invalid geometry, and valid-neighbor preservation. |
| `src/utils/export.test.ts` | `export.test.ts` lines 268-469 | Extend fake DOM to understand `[data-editor-only]`, scene groups, legend, wrap copies, and transform attributes. Assert frozen transform/legend retained, editor/outgoing elements removed, filename sanitized, and cleanup unchanged. |
| `src/components/MapWorkspace.test.tsx` | `MapWorkspace.test.tsx` lines 1-27 | Continue SSR state assertions for world loading, warning, fatal state, composition bar/overlay presence, and no duplicate workspace. |
| `src/components/SaveLoad.test.tsx` | `SaveLoad.test.tsx` lines 37-152 | Continue testing pure feedback/focus helpers and SSR semantics. Add legacy metadata, load/delete confirmation copy, and responsive opener restoration helpers. |
| `src/components/Controls.test.tsx` | `Controls.test.tsx` lines 1-29 | Assert exact labels, native disabled/busy behavior, no false shortcut advertising, and separation of Reset View from Reset All Colors. |
| `src/components/ToastRegion.test.tsx` | existing `ToastRegion.test.tsx` | Extend exact safe-message allowlist tests and role/status behavior; do not allow arbitrary technical text through. |
| `src/App.test.tsx` | `App.test.tsx` lines 59-117 | Continue SSR orchestration assertions: stable live regions, storage failure, one responsive workspace, state above branches, and complete-load/export locks exposed through semantic UI. |
| `tests/e2e/phase2-composition.spec.ts` | none; P14 defines boundary | New browser suite for drag/wheel, keyboard controls, Locate, Reset View, responsive remount, date-line framing, export parity/download dimensions, snapshot switching, legend drag/nudge, and focus continuity in installed Chrome/Edge. |

## Shared Patterns

### State Ownership

**Apply to:** `App.tsx`, both providers, camera/snapshot hooks, MapCanvas, SaveLoad.

- Color state/history stays in `MapStateProvider`.
- Committed camera/snapshot/legend/background/dirty-baseline state stays in `CompositionStateProvider`.
- Live camera transform and transition handles stay in one `useCameraController` instance owned inside the mounted visible MapCanvas; only `MapCanvasHandle` crosses to App.
- App coordinates cross-store operations such as complete load and export freeze.
- Geometry and path strings are never persisted.

### React/D3/SVG Ownership

**Source:** `MapCanvas.tsx` lines 211-246 and 467-480.

- React renders one canonical SVG shell, the D3-owned empty scene/camera group, then the React-owned legend slot/group as its next sibling inside that same SVG.
- D3 creates/updates country paths inside its group only.
- React never maps country `<path>` elements while D3 also mutates them.
- Visual wrapped copies are rendering-only; one stable logical path owns role, name, selection, roving tabindex, and focus.
- Camera frames update transforms only, never `d` geometry.

### Validation and Security

**Sources:** `geojson.ts` lines 16-184, `storage.ts` lines 60-159, `colors.ts` lines 63-102.

- Treat bundled JSON and localStorage as `unknown` at boundaries.
- Reject reserved dictionary keys: `__proto__`, `constructor`, `prototype`.
- Canonical colors remain uppercase `#RRGGBB`; effective white is omitted from sparse color maps and legend entries.
- Persist only enums and clamped finite numbers for legend style and camera state.
- Render map names and legend labels through React text nodes or D3 `.text`, never HTML injection.

### Error and Feedback Handling

**Sources:** `App.tsx` lines 107-136, `ToastRegion.tsx` lines 65-135, `SaveLoad.tsx` lines 127-144.

- Low-level utilities return typed reasons, not creator copy.
- App/components map reasons to approved creator-safe messages.
- Recoverable partial data uses warnings while retaining valid content.
- Blocking failures use `role="alert"`; success/information uses stable polite status regions.
- Historical fallback is persistent adjacent status, not a transient toast alone.

### Export Transaction

**Sources:** `App.tsx` lines 254-290, `Controls.tsx` lines 35-53, `export.ts` lines 115-195.

1. Prevent duplicate activation synchronously.
2. Resolve the currently bound sole `MapCanvasHandle`; freeze its live camera and snapshot transition synchronously before any `await`.
3. Commit/measure legend position.
4. Clone the one canonical SVG from `MapCanvasHandle.getExportSource()`, retaining current transform, selected scene, all visual wrap paths, and the exact live legend group.
5. Sanitize editor-only state.
6. Capture at 540×540 with scale 2.
7. Require exact 1080×1080.
8. Connect/click anchor, await bounded handoff, and clean all resources in nested `finally` blocks.

### Accessibility

**Sources:** `MapCanvas.tsx` lines 228-371 and 429-445; `SaveLoad.tsx` lines 193-275; `Tooltip.tsx` lines 105-254.

- Native controls for all UI actions.
- One logical map listbox and one accessible path per entity.
- Roving alphabetical country navigation remains separate from camera pan controls.
- Drag/pinch/reorder operations have visible click/tap alternatives.
- Focus survives horizontal wrap and responsive remounts.
- Tooltips and focus indicators follow transformed logical geometry without duplicated announcements.

### Test Ownership

- Pure transform/validation logic: Vitest utility tests.
- Reducer/provider invariants: reducer tests plus guarded-hook SSR test.
- Static semantic markup: `renderToStaticMarkup`/`renderToString` in Node.
- Browser gesture, focus, download, and responsive behavior: Playwright.
- Historical accuracy/licensing and real multitouch pinch: manual acceptance gates; do not claim automation proves them.

## No Safe Analog Found

These targets have useful neighboring patterns but no existing implementation that is safe to copy as the core algorithm.

| File | Role | Data Flow | Required New Boundary |
|---|---|---|---|
| `playwright.config.ts` | config | browser request-response | First browser-runner configuration; use research-approved installed channels and keep it separate from Vitest. |
| `public/data/snapshots/index.json` | static model | file-I/O | First provenance/review-aware snapshot manifest. Do not model it as a simple list of URLs. |
| `public/data/snapshots/<snapshot-id>.geojson` | static model | file-I/O | First curated historical overlay assets with explicit logical identities and partial coverage. |
| `src/hooks/useCameraController.ts` | hook/controller | streaming/event-driven | First high-frequency D3 zoom controller with synchronous freeze and semantic React commit boundary. |
| `src/utils/camera.ts` | utility | transform | First wrapped-world camera math. It needs dedicated invariant tests before UI integration. |
| `tests/e2e/phase2-composition.spec.ts` | test | browser event-driven | First Playwright suite; do not imitate Node fake-DOM tests for real gesture/export behavior. |

## Planner Warnings

1. **Do not create separate Europe/World/North America modes.** Region framing is camera state.
2. **Do not place camera state in the color reducer.** Pan/zoom must never enter color undo/redo.
3. **Do not create a second localStorage writer.** Extend `storage.ts` or delegate to a pure parser.
4. **Do not reproject on camera frames.** Fixed path data plus transforms only.
5. **Do not render three accessible world copies.** Keep one stable logical path and two decorative repeats.
6. **Do not persist raw wrapped `x/y` translation.** Persist normalized center longitude/latitude and zoom.
7. **Do not infer core states, dependencies, or historical identity from names at runtime.** Use reviewed manifests.
8. **Do not advertise unreviewed historical snapshots.** Only historian-reviewed entries appear in production UI.
9. **Do not capture an in-progress crossfade or target camera state.** Export the selected finished scene and last painted camera frame.
10. **Do not use HTML/foreignObject/CSS filter effects for the legend.** Use export-safe SVG primitives.
11. **Do not enlarge `MapCanvas.tsx` with all camera/scene math.** Extract pure camera/scene utilities and a focused controller hook.
12. **Schedule coding-rule corrections after implementation patterns are accepted.** `frontend.md` still mentions azimuthal projection, `data.md` assumes complete per-period files, and `storage.md` mentions out-of-scope cloud sync.

## Metadata

**Analog search scope:**

- `src/components/`
- `src/hooks/`
- `src/providers/`
- `src/utils/`
- `src/types/`
- `src/constants/`
- `src/styles/`
- `scripts/`
- `public/data/`
- root package/lint/test configuration

**Strong Phase 1 analogs read:**

- `src/App.tsx`
- `src/components/MapCanvas.tsx`
- `src/components/MapWorkspace.tsx`
- `src/components/CountryList.tsx`
- `src/components/ColorPicker.tsx`
- `src/components/Controls.tsx`
- `src/components/SaveLoad.tsx`
- `src/components/Tooltip.tsx`
- `src/providers/MapStateProvider.tsx`
- `src/hooks/useGeoData.ts`
- `src/hooks/useLocalStorage.ts`
- `src/utils/geojson.ts`
- `src/utils/mapProjection.ts`
- `src/utils/storage.ts`
- `src/utils/export.ts`
- `scripts/prepareGeoData.mjs`
- related Vitest and CSS files

**Pattern extraction date:** 2026-07-24
