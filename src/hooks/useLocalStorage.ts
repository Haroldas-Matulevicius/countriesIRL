import { useCallback, useState } from 'react';
import type { ColorMap } from '../types/map';
import type {
  SavedMap,
  StorageErrorReason,
  StorageResult,
  StorageWarning,
} from '../types/ui';
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
  saveMap: (name: string, colors: ColorMap) => StorageResult<SaveMapValue>;
  loadMap: (name: string, validCountryIds: ReadonlySet<string>) => StorageResult<ColorMap>;
  deleteMap: (name: string) => StorageResult<ReadonlyArray<SavedMap>>;
  dismissOnboarding: () => StorageResult<boolean>;
}

export function useLocalStorage(): UseLocalStorageValue {
  const [adapter] = useState<StorageAdapter>(() => createStorageAdapter());
  const [initialOnboardingResult] = useState(() => adapter.getOnboardingDismissed());
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

  const refreshSavedMaps = useCallback((): StorageResult<ReadonlyArray<SavedMap>> => {
    const result = adapter.list();
    recordResult(result);

    if (result.ok) {
      setSavedMaps(result.value);
    }

    return result;
  }, [adapter, recordResult]);

  const saveMap = useCallback(
    (name: string, colors: ColorMap): StorageResult<SaveMapValue> => {
      const result = adapter.save(name, colors);
      recordResult(result);

      if (result.ok) {
        setSavedMaps(result.value.savedMaps);
      }

      return result;
    },
    [adapter, recordResult],
  );

  const loadMap = useCallback(
    (name: string, validCountryIds: ReadonlySet<string>): StorageResult<ColorMap> => {
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
    saveMap,
    loadMap,
    deleteMap,
    dismissOnboarding,
  };
}
