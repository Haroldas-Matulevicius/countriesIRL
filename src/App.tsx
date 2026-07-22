import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { CountryId, GeoFeature } from './types/map';
import type { ToastMessage } from './types/ui';
import { AppHeader } from './components/AppHeader';
import { ColorPicker } from './components/ColorPicker';
import { Controls } from './components/Controls';
import { CountryList } from './components/CountryList';
import { MapWorkspace } from './components/MapWorkspace';
import { OnboardingBanner } from './components/OnboardingBanner';
import { SaveLoad } from './components/SaveLoad';
import { SelectionPanel } from './components/SelectionPanel';
import { TOAST_MESSAGES, ToastRegion } from './components/ToastRegion';
import { useGeoData } from './hooks/useGeoData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMapState } from './hooks/useMapState';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { exportMapPng } from './utils/export';

const EMPTY_COUNTRIES: ReadonlyArray<GeoFeature> = [];
const EMPTY_COUNTRY_LOOKUP: ReadonlyMap<CountryId, GeoFeature> = new Map();

export default function App(): JSX.Element {
  const {
    state: { colors, selectedIds },
    canUndo,
    canRedo,
    canReset,
    selectCountry,
    clearSelection,
    resetColors,
    undo,
    redo,
    loadState,
  } = useMapState();
  const geoData = useGeoData();
  const {
    onboardingDismissed,
    isPersistenceAvailable,
    dismissOnboarding,
  } = useLocalStorage();
  const layout = useResponsiveLayout();
  const exportSourceRef = useRef<HTMLDivElement>(null);
  const exportHandlerRef = useRef<() => void>(() => undefined);
  const exportInProgressRef = useRef(false);
  const pendingMapFocusRef = useRef(false);
  const toastCounterRef = useRef(0);
  const [isHelpVisible, setIsHelpVisible] = useState(
    () => !onboardingDismissed,
  );
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const isMapReady = geoData.status === 'ready';
  const isHelpAvailable = geoData.status !== 'error';
  const isHelpRendered = isHelpAvailable && isHelpVisible;
  const countries =
    geoData.status === 'ready' ? geoData.features : EMPTY_COUNTRIES;
  const countryLookup =
    geoData.status === 'ready' ? geoData.lookup : EMPTY_COUNTRY_LOOKUP;
  const validCountryIds = useMemo<ReadonlySet<CountryId>>(
    () => new Set(countries.map((country) => country.id)),
    [countries],
  );

  const createToastId = useCallback((): string => {
    toastCounterRef.current += 1;
    return `countriesirl-message-${toastCounterRef.current}`;
  }, []);

  const showStatus = useCallback(
    (message: string, severity: 'success' | 'info' = 'success'): void => {
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
    const mapSource = exportSourceRef.current;
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
      if (countryLookup.has(countryId)) {
        selectCountry(countryId);
      }
    },
    [countryLookup, selectCountry],
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

    const exportSource = exportSourceRef.current;
    if (exportSource === null) {
      showExportFailure();
      return;
    }

    exportInProgressRef.current = true;
    setIsExporting(true);
    let didExportSucceed: boolean;

    try {
      const result = await exportMapPng(exportSource);
      didExportSucceed = result.ok;
    } catch {
      didExportSucceed = false;
    } finally {
      exportInProgressRef.current = false;
      setIsExporting(false);
    }

    if (didExportSucceed) {
      showStatus(TOAST_MESSAGES.exportSucceeded);
    } else {
      showExportFailure();
    }
  }, [showExportFailure, showStatus]);

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
    </div>
  );

  const mapWorkspace = (
    <div className="workspace__map">
      <MapWorkspace
        geoData={geoData}
        colors={colors}
        selectedIds={selectedIds}
        exportSourceRef={exportSourceRef}
        onSelectCountry={handleSelectCountry}
        onClearSelection={clearSelection}
        onReload={handleReload}
      />
    </div>
  );

  const selectionAndColorControls = (
    <div className="workspace__selection-color">
      <SelectionPanel countryLookup={countryLookup} />
      <ColorPicker isDisabled={!isMapReady} onStatus={showStatus} />
    </div>
  );

  const countryList = (
    <div className="workspace__country-list">
      <CountryList countries={countries} isDisabled={!isMapReady} />
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
          colors={colors}
          validCountryIds={validCountryIds}
          onLoad={loadState}
          onClose={handleCloseSaveLoad}
          onFocusMap={focusMap}
          onStatus={showStatus}
        />
      ) : null}

      <ToastRegion message={toastMessage} onDismiss={handleDismissToast} />
    </div>
  );
}
