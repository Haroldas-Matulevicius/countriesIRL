import { useCallback, useState } from 'react';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import type {
  CompositionLoadOutcome,
  CompositionSnapshot,
} from '../types/composition';
import type { ColorMap } from '../types/map';
import type {
  SavedMap,
  StorageErrorReason,
  StorageResult,
  StorageWarning,
} from '../types/ui';
import { createDefaultLegendState, reconcileLegend } from '../utils/legend';
import {
  createStorageAdapter,
  type SaveMapValue,
  type StorageAdapter,
} from '../utils/storage';

export interface UseLocalStorageValue {
  savedMaps: ReadonlyArray<SavedMap>;
  onboardingDismissed: boolean;
  warnings: ReadonlyArray<StorageWarning>;
  error: StorageErrorReason | null;
  isPersistenceAvailable: boolean;
  refreshSavedMaps: () => StorageResult<ReadonlyArray<SavedMap>>;
  saveComposition: (
    name: string,
    snapshot: CompositionSnapshot,
  ) => StorageResult<SaveMapValue>;
  loadComposition: (name: string) => StorageResult<CompositionLoadOutcome>;
  saveMap: (name: string, colors: ColorMap) => StorageResult<SaveMapValue>;
  loadMap: (
    name: string,
    validCountryIds: ReadonlySet<string>,
  ) => StorageResult<ColorMap>;
  deleteMap: (name: string) => StorageResult<ReadonlyArray<SavedMap>>;
  dismissOnboarding: () => StorageResult<boolean>;
}

/**
 * Phase 1 -> Phase 2 migration path: a legacy colors-only save is widened into
 * a full composition. Its legend must come from the same default as a fresh
 * map, or legacy-migrated maps silently get different legend styling.
 */
export function createLegacyCompatibleSnapshot(
  colors: ColorMap,
): CompositionSnapshot {
  return {
    colors,
    camera: INITIAL_WORLD_CAMERA,
    snapshotId: 'modern',
    legend: reconcileLegend(
      Object.values(colors),
      createDefaultLegendState(),
    ),
    settings: { backgroundColor: '#FFFFFF' },
  };
}

export function useLocalStorage(): UseLocalStorageValue {
  const [adapter] = useState<StorageAdapter>(() => createStorageAdapter());
  const [initialOnboardingResult] = useState(() =>
    adapter.getOnboardingDismissed(),
  );
  const [savedMaps, setSavedMaps] = useState<ReadonlyArray<SavedMap>>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    initialOnboardingResult.ok ? initialOnboardingResult.value : false,
  );
  const [warnings, setWarnings] = useState<ReadonlyArray<StorageWarning>>(
    initialOnboardingResult.ok ? initialOnboardingResult.warnings : [],
  );
  const [error, setError] = useState<StorageErrorReason | null>(
    initialOnboardingResult.ok ? null : initialOnboardingResult.reason,
  );

  const recordResult = useCallback((result: StorageResult<unknown>): void => {
    if (result.ok) {
      setWarnings(result.warnings);
      setError(null);
      return;
    }

    setWarnings([]);
    setError(result.reason);
  }, []);

  const refreshSavedMaps = useCallback((): StorageResult<
    ReadonlyArray<SavedMap>
  > => {
    const result = adapter.list();
    recordResult(result);

    if (result.ok) {
      setSavedMaps(result.value);
    }

    return result;
  }, [adapter, recordResult]);

  const saveComposition = useCallback(
    (
      name: string,
      snapshot: CompositionSnapshot,
    ): StorageResult<SaveMapValue> => {
      const result = adapter.save(name, snapshot);
      recordResult(result);

      if (result.ok) {
        setSavedMaps(result.value.savedMaps);
      }

      return result;
    },
    [adapter, recordResult],
  );

  const loadComposition = useCallback(
    (name: string): StorageResult<CompositionLoadOutcome> => {
      const result = adapter.load(name);
      recordResult(result);
      return result;
    },
    [adapter, recordResult],
  );

  const saveMap = useCallback(
    (name: string, colors: ColorMap): StorageResult<SaveMapValue> => {
      return saveComposition(name, createLegacyCompatibleSnapshot(colors));
    },
    [saveComposition],
  );

  const loadMap = useCallback(
    (
      name: string,
      validCountryIds: ReadonlySet<string>,
    ): StorageResult<ColorMap> => {
      const result = adapter.load(name, validCountryIds);
      recordResult(result);
      return result;
    },
    [adapter, recordResult],
  );

  const deleteMap = useCallback(
    (name: string): StorageResult<ReadonlyArray<SavedMap>> => {
      const result = adapter.delete(name);
      recordResult(result);

      if (result.ok) {
        setSavedMaps(result.value);
      }

      return result;
    },
    [adapter, recordResult],
  );

  const dismissOnboarding = useCallback((): StorageResult<boolean> => {
    const result = adapter.dismissOnboarding();
    recordResult(result);

    if (result.ok) {
      setOnboardingDismissed(result.value);
    }

    return result;
  }, [adapter, recordResult]);

  return {
    savedMaps,
    onboardingDismissed,
    warnings,
    error,
    isPersistenceAvailable: error !== 'storage-unavailable',
    refreshSavedMaps,
    saveComposition,
    loadComposition,
    saveMap,
    loadMap,
    deleteMap,
    dismissOnboarding,
  };
}
