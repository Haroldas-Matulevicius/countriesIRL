import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  CameraPanDirection,
  Composition,
  CompositionSnapshot,
  CompositionState,
  EffectiveScene,
  LegendPosition,
  MapCanvasHandle,
  SnapshotId,
} from './types/composition';
import type { CountryId, GeoFeature } from './types/map';
import type { ToastMessage } from './types/ui';
import { DEFAULT_COLOR } from './constants/colors';
import { AppHeader } from './components/AppHeader';
import { ColorPicker } from './components/ColorPicker';
import { Controls } from './components/Controls';
import { CountryList } from './components/CountryList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FatalErrorState } from './components/FatalErrorState';
import { LegendDisclosure } from './components/LegendDisclosure';
import {
  LegendEditor,
  getLegendBlockingMessage,
} from './components/LegendEditor';
import type { LegendEditorCommands } from './components/LegendEditor';
import {
  LegendOverlay,
  getLegendOverlayBounds,
} from './components/LegendOverlay';
import { LocateCountry } from './components/LocateCountry';
import { MapNavigation } from './components/MapNavigation';
import { MapWorkspace } from './components/MapWorkspace';
import { OnboardingBanner } from './components/OnboardingBanner';
import { SaveLoad } from './components/SaveLoad';
import { SelectionPanel } from './components/SelectionPanel';
import { TOAST_MESSAGES, ToastRegion } from './components/ToastRegion';
import { useCompositionLoadTransaction } from './hooks/useCompositionLoadTransaction';
import type { CompositionLoadRollbackState } from './hooks/useCompositionLoadTransaction';
import { useCompositionSaveTransaction } from './hooks/useCompositionSaveTransaction';
import { useCompositionState } from './hooks/useCompositionState';
import { useGeoData } from './hooks/useGeoData';
import type { WorldCountryMetadata } from './hooks/useGeoData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMapState } from './hooks/useMapState';
import { resolveEffectiveSnapshotScene } from './hooks/useSnapshotData';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { exportMapPng } from './utils/export';
import {
  getActiveLegendEntries,
  validateActiveLegend,
} from './utils/legend';
import {
  composeEffectiveScene,
  getEffectiveSceneColors,
} from './utils/scene';

const EMPTY_COUNTRIES: ReadonlyArray<WorldCountryMetadata> = [];
const EMPTY_COUNTRY_LOOKUP: ReadonlyMap<CountryId, GeoFeature> = new Map();

function getLegendPositionLabel(position: LegendPosition): string {
  switch (position.preset) {
    case 'top-left':
      return 'Top left';
    case 'top-right':
      return 'Top right';
    case 'bottom-left':
      return 'Bottom left';
    case 'bottom-right':
      return 'Bottom right';
    case null:
      return 'Custom position';
  }
}

function snapshotToComposition(snapshot: CompositionSnapshot): Composition {
  return {
    camera: snapshot.camera,
    snapshotId: snapshot.snapshotId,
    legend: snapshot.legend,
    settings: snapshot.settings,
  };
}

export function createSelectionAnnouncement(
  selectedIds: ReadonlySet<CountryId>,
  countryLookup: ReadonlyMap<CountryId, GeoFeature>,
): string {
  if (selectedIds.size === 0) {
    return TOAST_MESSAGES.noSelection;
  }

  if (selectedIds.size === 1) {
    const selectedId = selectedIds.values().next().value;
    const countryName =
      selectedId === undefined
        ? undefined
        : countryLookup.get(selectedId)?.properties.name;
    return countryName === undefined
      ? TOAST_MESSAGES.selectionCount(1)
      : `${countryName}. ${TOAST_MESSAGES.selectionCount(1)}`;
  }

  return TOAST_MESSAGES.selectionCount(selectedIds.size);
}

export default function App(): JSX.Element {
  const {
    state: mapState,
    canUndo,
    canRedo,
    canReset,
    selectCountry,
    replaceSelection,
    clearSelection,
    resetColors,
    undo,
    redo,
    loadState,
    restoreState: restoreMapState,
  } = useMapState();
  const { colors, selectedIds } = mapState;
  const {
    state: compositionState,
    setCamera,
    setLegendEntry,
    setLegendStyle,
    setLegendOrder,
    setLegendPosition,
    loadComposition,
    markSaved,
    restoreState: restoreCompositionState,
  } = useCompositionState();
  const geoData = useGeoData();
  const {
    onboardingDismissed,
    error: persistenceError,
    isPersistenceAvailable,
    saveComposition,
    loadComposition: loadStoredComposition,
    dismissOnboarding,
  } = useLocalStorage();
  const layout = useResponsiveLayout();
  const mapCanvasHandleRef = useRef<MapCanvasHandle | null>(null);
  const colorsRef = useRef(colors);
  const selectedIdsRef = useRef(selectedIds);
  const mapStateRef = useRef(mapState);
  const compositionRef = useRef<CompositionState>(compositionState);
  const activeSceneRef = useRef<EffectiveScene | null>(null);
  const exportHandlerRef = useRef<() => void>(() => undefined);
  const exportInProgressRef = useRef(false);
  const pendingMapFocusRef = useRef(false);
  const hasInitializedSelectionAnnouncementRef = useRef(false);
  const hasInitialStorageError = persistenceError === 'storage-unavailable';
  const toastCounterRef = useRef(hasInitialStorageError ? 1 : 0);
  const [isHelpVisible, setIsHelpVisible] = useState(
    () => !onboardingDismissed,
  );
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [isMoveMapOpen, setIsMoveMapOpen] = useState(false);
  const [activeScene, setActiveScene] = useState<EffectiveScene | null>(null);
  const [pendingLoadedFocusId, setPendingLoadedFocusId] =
    useState<CountryId | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState('');
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(() =>
    hasInitialStorageError
      ? {
          id: 'countriesirl-message-1',
          severity: 'error',
          message: TOAST_MESSAGES.storageUnavailable,
        }
      : null,
  );

  const isMapReady = geoData.status === 'ready';
  const isHelpAvailable = geoData.status !== 'error';
  const isHelpRendered = isHelpAvailable && isHelpVisible;
  const modernScene = useMemo<EffectiveScene | null>(
    () =>
      geoData.status === 'ready'
        ? composeEffectiveScene({
            snapshotId: 'modern',
            modernFeatures: geoData.features,
          })
        : null,
    [geoData],
  );
  const effectiveScene =
    activeScene?.snapshotId === compositionState.snapshotId
      ? activeScene
      : compositionState.snapshotId === 'modern'
        ? modernScene
        : null;
  const visibleFeatures = effectiveScene?.features ?? null;
  const countries =
    geoData.status === 'ready' ? geoData.countryMetadata : EMPTY_COUNTRIES;
  const modernCountryLookup =
    geoData.status === 'ready' ? geoData.coreLookup : EMPTY_COUNTRY_LOOKUP;
  const effectiveCountryLookup = useMemo<ReadonlyMap<CountryId, GeoFeature>>(
    () => {
      if (effectiveScene === null) {
        return EMPTY_COUNTRY_LOOKUP;
      }
      const lookup = new Map<CountryId, GeoFeature>();
      effectiveScene.features.forEach((feature): void => {
        if (feature.isSelectable && !lookup.has(feature.entityId)) {
          lookup.set(feature.entityId, feature);
        }
      });
      return lookup;
    },
    [effectiveScene],
  );
  // Single source of truth for "can this entity be selected right now"; the map
  // gate (handleSelectCountry) and the country browser both read it, so the
  // browser can never create a selection the scene does not contain.
  const effectiveSelectableIds = useMemo<ReadonlySet<CountryId>>(
    () => new Set(effectiveCountryLookup.keys()),
    [effectiveCountryLookup],
  );
  const effectiveColors = useMemo<ReadonlyArray<string>>(
    () =>
      effectiveScene === null
        ? []
        : getEffectiveSceneColors(effectiveScene, colors),
    [colors, effectiveScene],
  );
  const activeLegendEntries = useMemo(
    () => getActiveLegendEntries(effectiveColors, compositionState.legend),
    [compositionState.legend, effectiveColors],
  );
  const legendBounds = useMemo(
    () => getLegendOverlayBounds(compositionState.legend, effectiveColors),
    [compositionState.legend, effectiveColors],
  );
  // Derived in App, never reported up from the Legend editor: the editor only
  // exists while the disclosure is expanded, so an editor-owned verdict would
  // outlive the component that can clear it and permanently block Export PNG.
  //
  // The gate uses the same classification the editor shows the user, so it can
  // only ever block on an issue the user is told about and can fix (an
  // over-long label, or more than 30 legend colors).
  const legendExportBlocker = useMemo((): string | null => {
    const validation = validateActiveLegend(
      compositionState.legend,
      effectiveColors,
      legendBounds,
    );
    return validation.ok ? null : getLegendBlockingMessage(validation.issues);
  }, [compositionState.legend, effectiveColors, legendBounds]);
  const legendCommands = useMemo<LegendEditorCommands>(
    () => ({
      setLegendEntry,
      setLegendStyle,
      setLegendOrder,
      setLegendPosition,
    }),
    [setLegendEntry, setLegendOrder, setLegendPosition, setLegendStyle],
  );

  useLayoutEffect((): void => {
    colorsRef.current = colors;
    selectedIdsRef.current = selectedIds;
    mapStateRef.current = mapState;
    compositionRef.current = compositionState;
    activeSceneRef.current = activeScene;
  }, [activeScene, colors, compositionState, mapState, selectedIds]);

  useEffect((): void => {
    const existingColors = new Set(
      compositionState.legend.entries.map((entry): string => entry.color),
    );
    let nextOrder = compositionState.legend.entries.reduce(
      (maximum, entry): number => Math.max(maximum, entry.order),
      -1,
    );
    effectiveColors.forEach((color): void => {
      const normalizedColor = color.toUpperCase();
      if (normalizedColor !== DEFAULT_COLOR && !existingColors.has(normalizedColor)) {
        nextOrder += 1;
        existingColors.add(normalizedColor);
        setLegendEntry({
          color: normalizedColor,
          label: normalizedColor,
          order: nextOrder,
        });
      }
    });
  }, [compositionState.legend.entries, effectiveColors, setLegendEntry]);

  const bindMapCanvasHandle = useCallback(
    (handle: MapCanvasHandle | null): void => {
      mapCanvasHandleRef.current = handle;
    },
    [],
  );
  const getMapCanvasHandle = useCallback(
    (): MapCanvasHandle | null => mapCanvasHandleRef.current,
    [],
  );
  const getColors = useCallback(() => colorsRef.current, []);
  const getSelectedIds = useCallback(() => selectedIdsRef.current, []);
  const getComposition = useCallback(
    (): Composition => compositionRef.current,
    [],
  );
  const captureRollbackState = useCallback(
    (): CompositionLoadRollbackState => ({
      camera:
        mapCanvasHandleRef.current?.readCurrentCamera() ??
        compositionRef.current.camera,
      scene: activeSceneRef.current,
      mapState: mapStateRef.current,
      compositionState: compositionRef.current,
    }),
    [],
  );
  const rollbackLoad = useCallback(
    (
      rollbackState: CompositionLoadRollbackState,
      mapCanvasHandle: MapCanvasHandle,
    ): void => {
      if (!mapCanvasHandle.restore(rollbackState.camera)) {
        throw new Error('Camera rollback was blocked.');
      }
      setActiveScene(rollbackState.scene);
      restoreMapState(rollbackState.mapState);
      restoreCompositionState({
        ...rollbackState.compositionState,
        camera: rollbackState.camera,
      });
    },
    [restoreCompositionState, restoreMapState],
  );
  const requestLoadedFocus = useCallback((countryId: CountryId | null): void => {
    setPendingLoadedFocusId(countryId);
  }, []);
  const resolveScene = useCallback(
    (snapshotId: SnapshotId, signal: AbortSignal): Promise<EffectiveScene> => {
      if (geoData.status !== 'ready') {
        return Promise.reject(new Error('Map data is unavailable.'));
      }
      return resolveEffectiveSnapshotScene(snapshotId, geoData.features, signal);
    },
    [geoData],
  );
  const markSavedSnapshot = useCallback(
    (snapshot: CompositionSnapshot): void => {
      markSaved(snapshotToComposition(snapshot));
    },
    [markSaved],
  );
  const loadResolvedScene = useCallback((scene: EffectiveScene): void => {
    setActiveScene(scene);
  }, []);

  const saveTransaction = useCompositionSaveTransaction({
    getMapCanvasHandle,
    getColors,
    getComposition,
    saveComposition,
    markSaved: markSavedSnapshot,
  });
  const loadTransaction = useCompositionLoadTransaction({
    loadStoredComposition,
    resolveScene,
    getMapCanvasHandle,
    getSelectedIds,
    captureRollbackState,
    rollback: rollbackLoad,
    loadScene: loadResolvedScene,
    loadColors: loadState,
    loadComposition,
    replaceSelection,
    markBaseline: markSavedSnapshot,
    requestFocus: requestLoadedFocus,
  });

  const createToastId = useCallback((): string => {
    toastCounterRef.current += 1;
    return `countriesirl-message-${toastCounterRef.current}`;
  }, []);

  const showStatus = useCallback(
    (
      message: string,
      severity: 'success' | 'info' | 'warning' = 'success',
    ): void => {
      setToastMessage({
        id: createToastId(),
        severity,
        message,
      });
    },
    [createToastId],
  );

  const showError = useCallback(
    (message: string, retry?: () => void): void => {
      setToastMessage({
        id: createToastId(),
        severity: 'error',
        message,
        ...(retry === undefined ? {} : { retry }),
      });
    },
    [createToastId],
  );

  const handleDismissToast = useCallback((messageId: string): void => {
    setToastMessage((currentMessage) =>
      currentMessage?.id === messageId ? null : currentMessage,
    );
  }, []);

  const focusMap = useCallback((): boolean => {
    const mapSource = mapCanvasHandleRef.current?.getExportSource();
    const focusTarget =
      mapSource?.querySelector<SVGPathElement>(
        'path.country-path[tabindex="0"]',
      ) ?? mapSource?.querySelector<SVGPathElement>('path.country-path');

    if (focusTarget === null || focusTarget === undefined) {
      return false;
    }

    focusTarget.focus();
    return true;
  }, []);

  useLayoutEffect((): (() => void) | undefined => {
    if (pendingLoadedFocusId === null) {
      return undefined;
    }

    // The load commits the scene and the focus request together, so a miss
    // means the target is not in this scene. The request is consumed either
    // way: a surviving id would steal keyboard focus later, whenever some
    // unrelated scene change made that id selectable again.
    const canFocusTarget = effectiveCountryLookup.has(pendingLoadedFocusId);
    const frame = requestAnimationFrame((): void => {
      if (canFocusTarget) {
        mapCanvasHandleRef.current?.focusCountry(pendingLoadedFocusId);
      }
      setPendingLoadedFocusId(null);
    });
    return (): void => cancelAnimationFrame(frame);
  }, [effectiveCountryLookup, pendingLoadedFocusId, visibleFeatures]);

  useEffect((): (() => void) | undefined => {
    if (!isMapReady || !pendingMapFocusRef.current) {
      return undefined;
    }

    const frame = requestAnimationFrame((): void => {
      if (focusMap()) {
        pendingMapFocusRef.current = false;
      }
    });

    return (): void => cancelAnimationFrame(frame);
  }, [focusMap, isMapReady, layout]);

  useEffect((): void => {
    if (!isMapReady) {
      hasInitializedSelectionAnnouncementRef.current = false;
      return;
    }

    if (!hasInitializedSelectionAnnouncementRef.current) {
      hasInitializedSelectionAnnouncementRef.current = true;
      return;
    }

    setSelectionAnnouncement(
      createSelectionAnnouncement(selectedIds, effectiveCountryLookup),
    );
  }, [effectiveCountryLookup, isMapReady, selectedIds]);

  const persistHelpDismissal = useCallback((): void => {
    const result = dismissOnboarding();

    if (!result.ok) {
      showError(
        result.reason === 'quota-exceeded'
          ? TOAST_MESSAGES.storageFull
          : TOAST_MESSAGES.storageUnavailable,
      );
    }
  }, [dismissOnboarding, showError]);

  const dismissHelpAndFocusMap = useCallback((): void => {
    persistHelpDismissal();
    setIsHelpVisible(false);
    pendingMapFocusRef.current = true;

    requestAnimationFrame((): void => {
      if (focusMap()) {
        pendingMapFocusRef.current = false;
      }
    });
  }, [focusMap, persistHelpDismissal]);

  const handleShowHelp = useCallback((): void => {
    setIsHelpVisible(true);
  }, []);

  const handleSelectCountry = useCallback(
    (countryId: CountryId): void => {
      if (effectiveCountryLookup.has(countryId)) {
        selectCountry(countryId);
      }
    },
    [effectiveCountryLookup, selectCountry],
  );

  const handleLocateCountry = useCallback(
    (countryId: CountryId): void => {
      const country = modernCountryLookup.get(countryId);
      if (country === undefined) {
        return;
      }

      if (mapCanvasHandleRef.current?.locate(countryId) === true) {
        showStatus(`Centered on ${country.properties.name}.`, 'info');
      }
    },
    [modernCountryLookup, showStatus],
  );

  const handleZoomIn = useCallback((factor: number): void => {
    mapCanvasHandleRef.current?.zoomBy(factor);
  }, []);

  const handleZoomOut = useCallback((factor: number): void => {
    mapCanvasHandleRef.current?.zoomBy(1 / factor);
  }, []);

  const handlePan = useCallback(
    (direction: CameraPanDirection, viewportFraction: number): void => {
      mapCanvasHandleRef.current?.pan(direction, viewportFraction);
    },
    [],
  );

  const handleUndo = useCallback((): void => {
    undo();
    showStatus(TOAST_MESSAGES.undo, 'info');
  }, [showStatus, undo]);

  const handleRedo = useCallback((): void => {
    redo();
    showStatus(TOAST_MESSAGES.redo, 'info');
  }, [redo, showStatus]);

  const handleOpenSaveLoad = useCallback((): void => {
    setIsSaveLoadOpen(true);
  }, []);

  const handleCloseSaveLoad = useCallback((): void => {
    setIsSaveLoadOpen(false);
  }, []);

  const handleReload = useCallback((): void => {
    window.location.reload();
  }, []);

  const showExportFailure = useCallback((): void => {
    showError(TOAST_MESSAGES.exportFailed, (): void => {
      exportHandlerRef.current();
    });
  }, [showError]);

  const handleExport = useCallback(async (): Promise<void> => {
    if (exportInProgressRef.current) {
      return;
    }
    if (legendExportBlocker !== null) {
      showExportFailure();
      return;
    }

    const mapCanvasHandle = mapCanvasHandleRef.current;
    if (mapCanvasHandle === null) {
      showExportFailure();
      return;
    }

    exportInProgressRef.current = true;
    setIsExporting(true);
    let didExportSucceed = false;
    let lease: ReturnType<MapCanvasHandle['freezeAndSnapshot']> | null = null;

    try {
      lease = mapCanvasHandle.freezeAndSnapshot();
      setCamera(lease.camera);
      const exportSource = mapCanvasHandle.getExportSource();
      if (exportSource !== null) {
        const result = await exportMapPng(exportSource);
        didExportSucceed = result.ok;
      }
    } catch {
      didExportSucceed = false;
    } finally {
      lease?.release();
      exportInProgressRef.current = false;
      setIsExporting(false);
    }

    if (didExportSucceed) {
      showStatus(TOAST_MESSAGES.exportSucceeded);
    } else {
      showExportFailure();
    }
  }, [legendExportBlocker, setCamera, showExportFailure, showStatus]);

  useEffect((): void => {
    exportHandlerRef.current = (): void => {
      void handleExport();
    };
  }, [handleExport]);

  const actionControls = (
    <div key="actions" className="workspace__actions">
      <Controls
        canUndo={canUndo}
        canRedo={canRedo}
        canReset={canReset}
        isMapReady={isMapReady}
        isStorageAvailable={isPersistenceAvailable}
        isExporting={isExporting}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={resetColors}
        onOpenSaveLoad={handleOpenSaveLoad}
        onExport={handleExport}
        onStatusMessage={showStatus}
      />
      {isMapReady ? (
        <MapNavigation
          currentZoom={compositionState.camera.zoom}
          isMoveMapOpen={isMoveMapOpen}
          onMoveMapOpenChange={setIsMoveMapOpen}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onPan={handlePan}
        />
      ) : null}
    </div>
  );

  const legendSlot = (
    <LegendOverlay
      legend={compositionState.legend}
      effectiveColors={effectiveColors}
      onPositionChange={setLegendPosition}
      onStatusMessage={showStatus}
    />
  );

  const mapWorkspace = (
    <div key="map" className="workspace__map">
      <MapWorkspace
        geoData={geoData}
        features={visibleFeatures}
        colors={colors}
        selectedIds={selectedIds}
        exportSourceRef={bindMapCanvasHandle}
        legendSlot={legendSlot}
        onCameraCommit={setCamera}
        onSelectCountry={handleSelectCountry}
        onClearSelection={clearSelection}
        onReload={handleReload}
      />
    </div>
  );

  const selectionAndColorControls = (
    <div key="selection-color" className="workspace__selection-color">
      <SelectionPanel countryLookup={effectiveCountryLookup} />
      <ColorPicker isDisabled={!isMapReady} onStatus={showStatus} />
    </div>
  );

  const legendControls = (
    <div key="legend" className="workspace__legend">
      <LegendDisclosure
        entryCount={activeLegendEntries.length}
        positionLabel={getLegendPositionLabel(compositionState.legend.position)}
        onStatusMessage={showStatus}
      >
        <LegendEditor
          legend={compositionState.legend}
          effectiveColors={effectiveColors}
          bounds={legendBounds}
          commands={legendCommands}
          onStatusMessage={showStatus}
        />
      </LegendDisclosure>
    </div>
  );

  const countryList = (
    <div key="countries" className="workspace__country-list">
      <CountryList
        countries={countries}
        selectableCountryIds={effectiveSelectableIds}
        isDisabled={!isMapReady}
      />
      <LocateCountry
        countries={countries}
        isDisabled={!isMapReady}
        onLocate={handleLocateCountry}
      />
    </div>
  );
  // UI-SPEC 7.1: on desktop the inspector is one scrolling shell (a
  // `complementary` landmark), not a stack of cards. It is a keyed sibling of
  // the keyed map, so switching layouts moves both nodes instead of remounting
  // the map - the camera keeps exactly one owner across the 1200px transition.
  const inspectorShell = (
    <aside
      key="inspector"
      className="workspace__control-column"
      aria-label="Map inspector"
    >
      {actionControls}
      {selectionAndColorControls}
      {legendControls}
      {countryList}
    </aside>
  );
  const workspaceSections =
    layout === 'desktop'
      ? [mapWorkspace, inspectorShell]
      : [
          actionControls,
          mapWorkspace,
          selectionAndColorControls,
          countryList,
          legendControls,
        ];

  return (
    <div className="app">
      <AppHeader
        isHelpVisible={isHelpRendered}
        isHelpAvailable={isHelpAvailable}
        onShowHelp={handleShowHelp}
      />

      <OnboardingBanner
        isVisible={isHelpRendered}
        onDismiss={dismissHelpAndFocusMap}
        onStartColoring={dismissHelpAndFocusMap}
      />

      <main
        className={`workspace workspace--${layout}`}
        aria-label="Map creator workspace"
      >
        <ErrorBoundary
          fallback={<FatalErrorState onReload={handleReload} />}
        >
          {workspaceSections}
        </ErrorBoundary>
      </main>

      {isSaveLoadOpen && isMapReady ? (
        <SaveLoad
          onSave={saveTransaction.save}
          onLoad={loadTransaction.load}
          onCancelLoad={loadTransaction.cancel}
          onClose={handleCloseSaveLoad}
          onFocusMap={focusMap}
          onStatus={showStatus}
        />
      ) : null}

      <p
        className="selection-live-region"
        data-selection-live-region="true"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {selectionAnnouncement}
      </p>
      <ToastRegion message={toastMessage} onDismiss={handleDismissToast} />
    </div>
  );
}
