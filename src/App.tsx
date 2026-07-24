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
  EffectiveScene,
  MapCanvasHandle,
  SnapshotId,
} from './types/composition';
import type { CountryId, GeoFeature } from './types/map';
import type { ToastMessage } from './types/ui';
import { AppHeader } from './components/AppHeader';
import { ColorPicker } from './components/ColorPicker';
import { Controls } from './components/Controls';
import { CountryList } from './components/CountryList';
import { LocateCountry } from './components/LocateCountry';
import { MapNavigation } from './components/MapNavigation';
import { MapWorkspace } from './components/MapWorkspace';
import { OnboardingBanner } from './components/OnboardingBanner';
import { SaveLoad } from './components/SaveLoad';
import { SelectionPanel } from './components/SelectionPanel';
import { TOAST_MESSAGES, ToastRegion } from './components/ToastRegion';
import { useCompositionLoadTransaction } from './hooks/useCompositionLoadTransaction';
import { useCompositionSaveTransaction } from './hooks/useCompositionSaveTransaction';
import { useCompositionState } from './hooks/useCompositionState';
import { useGeoData } from './hooks/useGeoData';
import type { WorldCountryMetadata } from './hooks/useGeoData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMapState } from './hooks/useMapState';
import { resolveEffectiveSnapshotScene } from './hooks/useSnapshotData';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { exportMapPng } from './utils/export';

const EMPTY_COUNTRIES: ReadonlyArray<WorldCountryMetadata> = [];
const EMPTY_COUNTRY_LOOKUP: ReadonlyMap<CountryId, GeoFeature> = new Map();

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
    state: { colors, selectedIds },
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
  } = useMapState();
  const {
    state: compositionState,
    setCamera,
    loadComposition,
    markSaved,
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
  const compositionRef = useRef<Composition>(compositionState);
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
  const countries =
    geoData.status === 'ready' ? geoData.countryMetadata : EMPTY_COUNTRIES;
  const countryLookup =
    geoData.status === 'ready' ? geoData.coreLookup : EMPTY_COUNTRY_LOOKUP;
  const visibleFeatures =
    activeScene?.snapshotId === compositionState.snapshotId
      ? activeScene.features
      : undefined;
  const effectiveCountryLookup = useMemo<ReadonlyMap<CountryId, GeoFeature>>(
    () => {
      if (visibleFeatures === undefined) {
        return countryLookup;
      }
      const lookup = new Map<CountryId, GeoFeature>();
      visibleFeatures.forEach((feature): void => {
        if (feature.isSelectable && !lookup.has(feature.entityId)) {
          lookup.set(feature.entityId, feature);
        }
      });
      return lookup;
    },
    [countryLookup, visibleFeatures],
  );

  useLayoutEffect((): void => {
    colorsRef.current = colors;
    selectedIdsRef.current = selectedIds;
    compositionRef.current = compositionState;
  }, [colors, compositionState, selectedIds]);

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
    loadScene: loadResolvedScene,
    loadColors: loadState,
    loadComposition,
    replaceSelection,
    markBaseline: markSavedSnapshot,
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
      const country = countryLookup.get(countryId);
      if (country === undefined) {
        return;
      }

      mapCanvasHandleRef.current?.locate(countryId);
      showStatus(`Centered on ${country.properties.name}.`, 'info');
    },
    [countryLookup, showStatus],
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
  }, [setCamera, showExportFailure, showStatus]);

  useEffect((): void => {
    exportHandlerRef.current = (): void => {
      void handleExport();
    };
  }, [handleExport]);

  const actionControls = (
    <div className="workspace__actions">
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

  const mapWorkspace = (
    <div className="workspace__map">
      <MapWorkspace
        geoData={geoData}
        features={visibleFeatures}
        colors={colors}
        selectedIds={selectedIds}
        exportSourceRef={bindMapCanvasHandle}
        onCameraCommit={setCamera}
        onSelectCountry={handleSelectCountry}
        onClearSelection={clearSelection}
        onReload={handleReload}
      />
    </div>
  );

  const selectionAndColorControls = (
    <div className="workspace__selection-color">
      <SelectionPanel countryLookup={effectiveCountryLookup} />
      <ColorPicker isDisabled={!isMapReady} onStatus={showStatus} />
    </div>
  );

  const countryList = (
    <div className="workspace__country-list">
      <CountryList countries={countries} isDisabled={!isMapReady} />
      <LocateCountry
        countries={countries}
        isDisabled={!isMapReady}
        onLocate={handleLocateCountry}
      />
    </div>
  );

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
