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
import type { ColorMap, CountryId, GeoFeature } from './types/map';
import type { ToastMessage, ToolId } from './types/ui';
import { ColorPicker } from './components/ColorPicker';
import { CompositionBar } from './components/CompositionBar';
import { Controls } from './components/Controls';
import { CountryList } from './components/CountryList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FatalErrorState } from './components/FatalErrorState';
import { LegendDisclosure } from './components/LegendDisclosure';
import { LegendEditor } from './components/LegendEditor';
import type { LegendEditorCommands } from './components/LegendEditor';
import {
  LegendOverlay,
  getLegendOverlayBounds,
} from './components/LegendOverlay';
import { LocateCountry } from './components/LocateCountry';
import { MapNavigation } from './components/MapNavigation';
import { MapWorkspace } from './components/MapWorkspace';
import { OnboardingBanner } from './components/OnboardingBanner';
import { ResetColorsAction } from './components/ResetColorsAction';
import { SaveLoad } from './components/SaveLoad';
import { SelectionPanel } from './components/SelectionPanel';
import { TOAST_MESSAGES, ToastRegion } from './components/ToastRegion';
import { HudFooter } from './components/editor/HudFooter';
import { HudHeader } from './components/editor/HudHeader';
import { ToolPanel } from './components/editor/ToolPanel';
import { ToolRail } from './components/editor/ToolRail';
import { useCompositionExportTransaction } from './hooks/useCompositionExportTransaction';
import type { CompositionExportTransactionOutcome } from './hooks/useCompositionExportTransaction';
import { useCompositionLoadTransaction } from './hooks/useCompositionLoadTransaction';
import type {
  CompositionLoadRollbackState,
  CompositionLoadTransactionOutcome,
} from './hooks/useCompositionLoadTransaction';
import { useCompositionSaveTransaction } from './hooks/useCompositionSaveTransaction';
import type { CompositionSaveTransactionOutcome } from './hooks/useCompositionSaveTransaction';
import { useEditorConfig } from './providers/EditorConfigProvider';
import { useCompositionState } from './hooks/useCompositionState';
import { useGeoData } from './hooks/useGeoData';
import { useInspectorUiState } from './hooks/useInspectorUiState';
import type { WorldCountryMetadata } from './hooks/useGeoData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMapState } from './hooks/useMapState';
import { resolveEffectiveSnapshotScene } from './utils/snapshotScene';
import { useSnapshotCatalog } from './hooks/useSnapshotCatalog';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { areColorMapsEqual } from './utils/colors';
import {
  getActiveLegendEntries,
  getLegendBlockingMessage,
  validateActiveLegend,
} from './utils/legend';
import {
  PERIOD_COPY,
  getHistoricalCoverageStatus,
  getPeriodFailureMessage,
  getPeriodLabel,
  getPeriodLoadingMessage,
  getShowingPeriodMessage,
} from './utils/periods';
import {
  composeEffectiveScene,
  getEffectiveSceneColors,
  reconcileSelectionForScene,
} from './utils/scene';

type PeriodLoadState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly snapshotId: SnapshotId }
  | { readonly status: 'error'; readonly snapshotId: SnapshotId };

const EMPTY_COUNTRIES: ReadonlyArray<WorldCountryMetadata> = [];
const EMPTY_COUNTRY_LOOKUP: ReadonlyMap<CountryId, GeoFeature> = new Map();

/** `aria-controls` target every rail tool row points at (D-16). */
const TOOL_PANEL_ID = 'map-editor-tool-panel';

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
    isDirty: isCompositionDirty,
    setCamera,
    setSnapshot,
    setLegendEntry,
    reconcileLegendEntries,
    setLegendStyle,
    setLegendOrder,
    setLegendPosition,
    loadComposition,
    markSaved,
    restoreState: restoreCompositionState,
  } = useCompositionState();
  const { initialThemeMode } = useEditorConfig();
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
  const snapshotCatalog = useSnapshotCatalog();
  const mapCanvasHandleRef = useRef<MapCanvasHandle | null>(null);
  const periodRequestRef = useRef<AbortController | null>(null);
  const modernSceneRef = useRef<EffectiveScene | null>(null);
  const periodOptionsRef = useRef(snapshotCatalog.options);
  const colorsRef = useRef(colors);
  const selectedIdsRef = useRef(selectedIds);
  const mapStateRef = useRef(mapState);
  const compositionRef = useRef<CompositionState>(compositionState);
  const activeSceneRef = useRef<EffectiveScene | null>(null);
  const exportHandlerRef = useRef<() => void | Promise<void>>(
    (): void => undefined,
  );
  const pendingMapFocusRef = useRef(false);
  const hasInitializedSelectionAnnouncementRef = useRef(false);
  const hasInitialStorageError = persistenceError === 'storage-unavailable';
  const toastCounterRef = useRef(hasInitialStorageError ? 1 : 0);
  const [isHelpVisible, setIsHelpVisible] = useState(
    () => !onboardingDismissed,
  );
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  /**
   * D-17/D-19: at most ONE tool is open, and the panel RESERVES a layout track
   * rather than overlaying the map. This is the single source of the track's
   * width. `[data-panel-open]` is written from it as exactly `'true' | 'false'`
   * - never absent, never a third value - and nothing else may write that
   * attribute (assertion 10).
   *
   * D-18: first run opens CLOSED. `03-06` reads the stored last-open tool here
   * once storage lands in its own task; an absent key resolves to closed.
   */
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  const toolRowsRef = useRef(new Map<ToolId, HTMLButtonElement | null>());
  const openedByToolRef = useRef<ToolId | null>(null);
  const [savedColorsBaseline, setSavedColorsBaseline] = useState<ColorMap>(
    () => colors,
  );
  /**
   * Composition identity, not export state: it is set by an explicit save or
   * load and read by the export filename. It deliberately does not live in the
   * export transaction, which would make the exporter the source of truth for a
   * value save and load also own, and it is never written by undo/redo.
   */
  const [compositionName, setCompositionName] = useState<string | null>(null);
  const [isMoveMapOpen, setIsMoveMapOpen] = useState(false);
  const [activeScene, setActiveScene] = useState<EffectiveScene | null>(null);
  const [pendingLoadedFocusId, setPendingLoadedFocusId] =
    useState<CountryId | null>(null);
  const [periodLoad, setPeriodLoad] = useState<PeriodLoadState>({
    status: 'idle',
  });
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
  // Held above the responsive branch: the inspector sections change parent
  // across the 1200px transition and are therefore remounted, so their
  // transient UI state cannot live inside them.
  const inspectorUi = useInspectorUiState(countries);
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
    modernSceneRef.current = modernScene;
    periodOptionsRef.current = snapshotCatalog.options;
  }, [
    activeScene,
    colors,
    compositionState,
    mapState,
    modernScene,
    selectedIds,
    snapshotCatalog.options,
  ]);

  useEffect(
    () => (): void => {
      periodRequestRef.current?.abort();
      periodRequestRef.current = null;
    },
    [],
  );

  // Legend auto-entry is one reducer write, so this effect depends only on the
  // active colors - it cannot retrigger itself through the entries it creates.
  useEffect((): void => {
    reconcileLegendEntries(effectiveColors);
  }, [effectiveColors, reconcileLegendEntries]);

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
  /**
   * Colors live in map state and the composition baseline does not cover them,
   * so the dirty-load gate needs its own color baseline. It is set only by an
   * explicit save or load, never by undo/redo, so history stays colors-only.
   */
  const markSavedSnapshot = useCallback(
    (snapshot: CompositionSnapshot): void => {
      setSavedColorsBaseline(snapshot.colors);
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

  // Committing a scene and reconciling the selection are one step. A switch that
  // left stale ids selected would let the color controls write colors for
  // entities the incoming scene does not contain: silently discarded work, and
  // selection counts announcing countries that are not on the map.
  const commitScene = useCallback(
    (scene: EffectiveScene): void => {
      setActiveScene(scene);
      setSnapshot(scene.snapshotId);
      replaceSelection([
        ...reconcileSelectionForScene(selectedIdsRef.current, scene),
      ]);
    },
    [replaceSelection, setSnapshot],
  );
  const startPeriodLoad = useCallback(
    (snapshotId: SnapshotId): void => {
      periodRequestRef.current?.abort();
      periodRequestRef.current = null;

      const periodLabel = getPeriodLabel(periodOptionsRef.current, snapshotId);
      const modernSceneValue = modernSceneRef.current;
      if (snapshotId === 'modern' && modernSceneValue !== null) {
        setPeriodLoad({ status: 'idle' });
        commitScene(modernSceneValue);
        showStatus(getShowingPeriodMessage(periodLabel), 'info');
        return;
      }

      const controller = new AbortController();
      periodRequestRef.current = controller;
      setPeriodLoad({ status: 'loading', snapshotId });

      resolveScene(snapshotId, controller.signal)
        .then((scene): void => {
          if (controller.signal.aborted) {
            return;
          }
          periodRequestRef.current = null;
          setPeriodLoad({ status: 'idle' });
          commitScene(scene);
          showStatus(getShowingPeriodMessage(periodLabel), 'info');
        })
        .catch((): void => {
          if (controller.signal.aborted) {
            return;
          }
          // The prior scene and the prior selected option both stay: the
          // selector is driven by the committed snapshot id, which never moved.
          periodRequestRef.current = null;
          setPeriodLoad({ status: 'error', snapshotId });
        });
    },
    [commitScene, resolveScene, showStatus],
  );
  const handlePeriodChange = useCallback(
    (snapshotId: SnapshotId): void => {
      if (snapshotId === compositionRef.current.snapshotId) {
        return;
      }
      startPeriodLoad(snapshotId);
    },
    [startPeriodLoad],
  );
  const handleRetryPeriod = useCallback((): void => {
    if (periodLoad.status === 'error') {
      startPeriodLoad(periodLoad.snapshotId);
    }
  }, [periodLoad, startPeriodLoad]);
  const handleResetView = useCallback((): void => {
    mapCanvasHandleRef.current?.resetView();
    showStatus(PERIOD_COPY.viewReset, 'info');
  }, [showStatus]);

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

  const registerToolRow = useCallback(
    (tool: ToolId, element: HTMLButtonElement | null): void => {
      toolRowsRef.current.set(tool, element);
    },
    [],
  );

  /**
   * One at a time (D-17): opening a tool closes the previous one, and
   * activating the open tool's own row closes it. The row that opened the panel
   * is remembered so `Escape` can return focus to it - focus restoration to
   * "wherever focus happened to be" is how a keyboard user ends up back at the
   * top of the document.
   */
  const handleSelectTool = useCallback((tool: ToolId): void => {
    setOpenTool((current): ToolId | null => {
      if (current === tool) {
        openedByToolRef.current = null;
        return null;
      }
      openedByToolRef.current = tool;
      return tool;
    });
  }, []);

  const handleCloseToolPanel = useCallback((): void => {
    const openedBy = openedByToolRef.current;
    openedByToolRef.current = null;
    setOpenTool(null);
    if (openedBy !== null) {
      toolRowsRef.current.get(openedBy)?.focus();
    }
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

  const isDirty =
    isCompositionDirty || !areColorMapsEqual(colors, savedColorsBaseline);

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
      void exportHandlerRef.current();
    });
  }, [showError]);

  const getLegendBlocker = useCallback(
    (): string | null => legendExportBlocker,
    [legendExportBlocker],
  );
  const getCompositionName = useCallback(
    (): string | undefined => compositionName ?? undefined,
    [compositionName],
  );
  const handleExportOutcome = useCallback(
    (outcome: CompositionExportTransactionOutcome): void => {
      if (outcome.ok) {
        showStatus(TOAST_MESSAGES.exportSucceeded);
        return;
      }
      if (outcome.reason === 'legend-blocked') {
        // Not the generic export failure: refreshing cannot shorten a label,
        // and the composition is in-memory only, so "Refresh the page" would
        // destroy the user's unsaved map. Report the blocking condition itself,
        // and offer no retry - retrying re-enters this same refusal.
        showError(outcome.message);
        return;
      }
      if (outcome.reason === 'invalid-composition') {
        // Same reasoning as the legend blocker: this refusal is synchronous and
        // structural, so the retry can never succeed, and the composition is
        // in-memory only, so "Refresh the page" would destroy the user's
        // unsaved map instead of repairing the layout.
        showError(TOAST_MESSAGES.exportLayoutInvalid);
        return;
      }
      showExportFailure();
    },
    [showError, showExportFailure, showStatus],
  );
  const { isExporting, exportPng } = useCompositionExportTransaction({
    getMapCanvasHandle,
    getLegendBlocker,
    getCompositionName,
    commitCamera: setCamera,
    onOutcome: handleExportOutcome,
  });
  // Returns the promise rather than discarding it. `Controls` holds a
  // synchronous activation lock released in a `finally` after `await
  // onExport()`; with the promise dropped, that await resolved on the next
  // microtask and the lock's own comment described a guarantee it no longer
  // provided. The export was still protected in practice - React flushes the
  // discrete click synchronously, so the button is disabled, and the
  // transaction refuses re-entry with `already-active` - but a lock whose
  // comment is false is a trap for the next author.
  const handleExport = useCallback(async (): Promise<void> => {
    await exportPng();
  }, [exportPng]);

  useEffect((): void => {
    exportHandlerRef.current = handleExport;
  }, [handleExport]);

  const { save: runSaveTransaction } = saveTransaction;
  const { load: runLoadTransaction } = loadTransaction;
  // The saved/loaded name is the composition's identity, so it is recorded only
  // on a committed save or load - never on a refused one, which would name the
  // export after a map that was never written.
  /**
   * Identity survives edits, but not the disappearance of what it names.
   * `Reset All Colors` empties the composition, and deleting the saved map
   * removes its stored counterpart; leaving the name set after either meant
   * exporting `Baltic_Tour_2026-07-25.png` for a blank map that no saved record
   * corresponds to.
   */
  const handleResetColors = useCallback((): void => {
    resetColors();
    setCompositionName(null);
  }, [resetColors]);

  const handleCompositionDeleted = useCallback((deletedName: string): void => {
    setCompositionName((current): string | null =>
      current === deletedName ? null : current,
    );
  }, []);

  const handleSaveComposition = useCallback(
    (name: string): CompositionSaveTransactionOutcome => {
      const outcome = runSaveTransaction(name);
      if (outcome.ok) {
        setCompositionName(name);
      }
      return outcome;
    },
    [runSaveTransaction],
  );
  const handleLoadComposition = useCallback(
    async (name: string): Promise<CompositionLoadTransactionOutcome> => {
      const outcome = await runLoadTransaction(name);
      if (outcome.ok) {
        setCompositionName(name);
      }
      return outcome;
    },
    [runLoadTransaction],
  );

  /*
   * UI-SPEC 3: exactly ONE `Controls` instance is mounted, and it is the rail
   * footer's. That is what keeps `Export PNG` the only filled action in the
   * composed DOM by construction: `controls__action--primary` exists in one
   * component, and one instance of it is on screen. Undo and Redo are rail
   * rows, `Save or Load Maps` is the `saved` tool, and `Reset All Colors` lives
   * in the Colors panel - so the rail variant carries the primary action alone.
   */
  const globalActions = (
    <Controls
      variant="rail"
      canUndo={canUndo}
      canRedo={canRedo}
      canReset={canReset}
      isMapReady={isMapReady}
      isStorageAvailable={isPersistenceAvailable}
      isExporting={isExporting}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onReset={handleResetColors}
      onOpenSaveLoad={handleOpenSaveLoad}
      onExport={handleExport}
      onStatusMessage={showStatus}
    />
  );

  // UI-SPEC 10: the cluster is editor-only camera chrome handed to
  // MapWorkspace's navigation slot rather than rendered in the inspector. It
  // stays a sibling of the export source - the export clones `svg.map-canvas`,
  // so it cannot reach the PNG - and it renders below the square rather than
  // over it, because chrome on the square collides with the legend and the
  // legend's coordinate system cannot reserve space for screen-sized chrome.
  const mapNavigation = (
    <MapNavigation
      currentZoom={compositionState.camera.zoom}
      isMoveMapOpen={isMoveMapOpen}
      onMoveMapOpenChange={setIsMoveMapOpen}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onPan={handlePan}
    />
  );

  const legendSlot = (
    <LegendOverlay
      legend={compositionState.legend}
      effectiveColors={effectiveColors}
      onPositionChange={setLegendPosition}
      onStatusMessage={showStatus}
    />
  );

  const activePeriodLabel = getPeriodLabel(
    snapshotCatalog.options,
    compositionState.snapshotId,
  );
  const activeCatalogEntry = snapshotCatalog.entries.find(
    (entry): boolean => entry.id === compositionState.snapshotId,
  );
  const periodStatusMessage =
    periodLoad.status === 'loading'
      ? getPeriodLoadingMessage(
          getPeriodLabel(snapshotCatalog.options, periodLoad.snapshotId),
        )
      : periodLoad.status === 'error'
        ? getPeriodFailureMessage(
            getPeriodLabel(snapshotCatalog.options, periodLoad.snapshotId),
          )
        : compositionState.snapshotId === 'modern' ||
            activeCatalogEntry === undefined
          ? PERIOD_COPY.modernStatus
          : getHistoricalCoverageStatus(activeCatalogEntry.coverageRegions);

  const compositionBar = (
    <CompositionBar
      periods={snapshotCatalog.options}
      selectedPeriodId={compositionState.snapshotId}
      statusMessage={periodStatusMessage}
      isPeriodDisabled={!isMapReady || periodLoad.status === 'loading'}
      isResetViewDisabled={!isMapReady}
      onPeriodChange={handlePeriodChange}
      onResetView={handleResetView}
      onRetryPeriod={
        periodLoad.status === 'error' ? handleRetryPeriod : undefined
      }
    />
  );

  /*
   * D-11/D-32: the canvas region is the grid's third track, not a section
   * inside a measured page column. It is rendered outside `workspaceSections`
   * on purpose - the 1200px layout switch reorders that list, and the map is
   * now structurally incapable of being remounted by it, which is a stronger
   * guarantee for the single-camera-owner invariant than the keyed sibling it
   * replaces.
   */
  /*
   * UI-SPEC 10: the onboarding banner becomes an inline info card on the CANVAS
   * region. It cannot stay in the panel track, because D-18 opens the first run
   * with the panel closed - a first-run creator would meet the editor with the
   * onboarding they have not dismissed hidden inside a panel they have not
   * opened. `Show Help` travels with it: it is the control that brings the card
   * back, so putting the two in different places is how one of them becomes
   * unreachable. Both are chrome and never reach the export clone.
   */
  const helpSlot = (
    <div className="editor-help" data-editor-only="true">
      <OnboardingBanner
        isVisible={isHelpRendered}
        onDismiss={dismissHelpAndFocusMap}
        onStartCreating={dismissHelpAndFocusMap}
      />
      {isHelpAvailable && !isHelpRendered ? (
        <button
          type="button"
          className="editor-help__toggle"
          onClick={handleShowHelp}
          aria-controls="onboarding-help"
          aria-expanded={false}
        >
          Show Help
        </button>
      ) : null}
    </div>
  );

  const mapWorkspace = (
      <MapWorkspace
        geoData={geoData}
        compositionBar={compositionBar}
        helpSlot={helpSlot}
        snapshotId={compositionState.snapshotId}
        periodLabel={activePeriodLabel}
        features={visibleFeatures}
        colors={colors}
        selectedIds={selectedIds}
        exportSourceRef={bindMapCanvasHandle}
        legendSlot={legendSlot}
        navigationSlot={mapNavigation}
        onCameraCommit={setCamera}
        onSelectCountry={handleSelectCountry}
        onClearSelection={clearSelection}
        onReload={handleReload}
    />
  );

  const selectionAndColorControls = (
    <div key="selection-color" className="workspace__selection-color">
      <SelectionPanel countryLookup={effectiveCountryLookup} />
      <ColorPicker
        selectableCountryIds={effectiveSelectableIds}
        customDraft={inspectorUi.customColorDraft}
        onCustomDraftChange={inspectorUi.setCustomColorDraft}
        isDisabled={!isMapReady}
        onStatus={showStatus}
      />
      {/*
        UI-SPEC 6/11: `Reset All Colors` is CONTENT reset and lives in the
        Colors panel, at every width. `Reset View` is CAMERA reset and lives in
        the canvas region. The two never sit together, and each exists exactly
        once in the composed DOM (assertion 15).
      */}
      <ResetColorsAction
        isDisabled={!isMapReady || !canReset}
        onReset={handleResetColors}
        onStatusMessage={showStatus}
      />
    </div>
  );

  const legendControls = (
    <div key="legend" className="workspace__legend">
      <LegendDisclosure
        entryCount={activeLegendEntries.length}
        positionLabel={getLegendPositionLabel(compositionState.legend.position)}
        isExpanded={inspectorUi.isLegendExpanded}
        onExpandedChange={inspectorUi.setLegendExpanded}
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
        query={inspectorUi.countryQuery}
        onQueryChange={inspectorUi.setCountryQuery}
        isDisabled={!isMapReady}
      />
      <LocateCountry
        countries={countries}
        state={inspectorUi.locateState}
        dispatch={inspectorUi.dispatchLocate}
        isDisabled={!isMapReady}
        onLocate={handleLocateCountry}
      />
    </div>
  );
  /*
   * The `saved` tool's panel. `03-07` migrates the save form and the saved-map
   * list into it; until then it holds the control that opens them, because a
   * control whose new home is not built stays rendered rather than being
   * deleted (T-03-20).
   */
  const savedMapsControls = (
    <div key="saved" className="workspace__saved-maps">
      <button
        type="button"
        data-action="save-load"
        data-save-load-control="true"
        className="controls__action"
        onClick={handleOpenSaveLoad}
        disabled={!isMapReady || !isPersistenceAvailable}
      >
        Save or Load Maps
      </button>
    </div>
  );

  /*
   * D-17: one tool's content at a time. The inspector's flat stack is gone -
   * `03-05` retired it as a container and this plan gives each of its sections
   * a rail row. Every transient draft these sections hold (the custom colour,
   * the country query, the locate combobox, the legend disclosure) lives in
   * `useInspectorUiState` ABOVE this switch, so switching tools unmounts the
   * markup without losing the creator's in-progress work.
   */
  const toolPanelContent =
    openTool === null
      ? null
      : openTool === 'colors'
        ? selectionAndColorControls
        : openTool === 'countries'
          ? countryList
          : openTool === 'legend'
            ? legendControls
            : savedMapsControls;

  /*
   * Transition-readiness (e): the theme class lands on the editor mount root
   * and nowhere above it. Written to the host page's root element instead, a
   * host could not override it and would have two writers of one theme. The
   * value arrives through `MapEditor`'s props boundary; `03-06` adds the
   * control that changes it and the storage-adapter persistence that remembers
   * it, with light as the absent-key default.
   */
  return (
    <div
      className={
        initialThemeMode === 'dark' ? 'map-editor dark' : 'map-editor'
      }
      data-panel-open={openTool !== null ? 'true' : 'false'}
    >
      {/*
        D-16: the rail is always present, at every width. The HUD header and
        footer are pinned siblings of the one scrolling element in it, so
        identity and Export never scroll away.
      */}
      <ToolRail
        panelId={TOOL_PANEL_ID}
        openTool={openTool}
        onSelectTool={handleSelectTool}
        registerToolRow={registerToolRow}
        canUndo={canUndo}
        canRedo={canRedo}
        isMapReady={isMapReady}
        onUndo={handleUndo}
        onRedo={handleRedo}
        header={
          <HudHeader compositionName={compositionName} isDirty={isDirty} />
        }
        footer={<HudFooter exportAction={globalActions} />}
      />

      {/*
        D-19: the panel reserves its track, so the canvas reflows instead of
        being covered. The body is unmounted while the track is 0px - a clipped
        0px column still holds live tab stops otherwise, which is a keyboard
        trap with nothing visible in it.
      */}
      <ErrorBoundary fallback={<FatalErrorState onReload={handleReload} />}>
        <ToolPanel
          panelId={TOOL_PANEL_ID}
          openTool={openTool}
          layoutModifier={`workspace--${layout}`}
          onClose={handleCloseToolPanel}
        >
          {toolPanelContent}
        </ToolPanel>
      </ErrorBoundary>

      <ErrorBoundary fallback={<FatalErrorState onReload={handleReload} />}>
        {mapWorkspace}
      </ErrorBoundary>

      {isSaveLoadOpen && isMapReady ? (
        <SaveLoad
          isDirty={isDirty}
          onSave={handleSaveComposition}
          onLoad={handleLoadComposition}
          onCancelLoad={loadTransaction.cancel}
          onDeleted={handleCompositionDeleted}
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
