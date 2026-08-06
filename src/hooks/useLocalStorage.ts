import { useCallback, useState } from 'react';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import type {
  CompositionLoadOutcome,
  CompositionSnapshot,
} from '../types/composition';
import type { ColorMap } from '../types/map';
import type {
  SavedMap,
  SavedMapSummary,
  StorageErrorReason,
  StorageResult,
  StorageWarning,
} from '../types/ui';
import { useEditorConfig } from '../providers/EditorConfigProvider';
import { createDefaultLegendState, reconcileLegend } from '../utils/legend';
import type { SaveMapValue, StorageAdapter } from '../utils/storage';

export interface UseLocalStorageValue {
  savedMapSummaries: ReadonlyArray<SavedMapSummary>;
  onboardingDismissed: boolean;
  warnings: ReadonlyArray<StorageWarning>;
  error: StorageErrorReason | null;
  isPersistenceAvailable: boolean;
  refreshSavedMaps: () => StorageResult<ReadonlyArray<SavedMapSummary>>;
  saveComposition: (
    name: string,
    snapshot: CompositionSnapshot,
  ) => StorageResult<SaveMapValue>;
  loadComposition: (name: string) => StorageResult<CompositionLoadOutcome>;
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
  // Transition-readiness (b): persistence arrives through `MapEditor`'s props
  // boundary as an adapter. The default factory builds the browser-backed one,
  // so the standalone app is unchanged, but nothing here knows that.
  const { createStorage } = useEditorConfig();
  const [adapter] = useState<StorageAdapter>(() => createStorage());
  const [initialOnboardingResult] = useState(() =>
    adapter.getOnboardingDismissed(),
  );
  const [savedMapSummaries, setSavedMapSummaries] = useState<
    ReadonlyArray<SavedMapSummary>
  >([]);
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
    ReadonlyArray<SavedMapSummary>
  > => {
    const result = adapter.listSummaries();
    recordResult(result);

    if (result.ok) {
      setSavedMapSummaries(result.value);
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
        // Row metadata comes from the stored record, never from the write
        // result, so the list is re-read rather than patched in memory.
        refreshSavedMaps();
      }

      return result;
    },
    [adapter, recordResult, refreshSavedMaps],
  );

  const loadComposition = useCallback(
    (name: string): StorageResult<CompositionLoadOutcome> => {
      const result = adapter.load(name);
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
        refreshSavedMaps();
      }

      return result;
    },
    [adapter, recordResult, refreshSavedMaps],
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
    savedMapSummaries,
    onboardingDismissed,
    warnings,
    error,
    isPersistenceAvailable: error !== 'storage-unavailable',
    refreshSavedMaps,
    saveComposition,
    loadComposition,
    deleteMap,
    dismissOnboarding,
  };
}
