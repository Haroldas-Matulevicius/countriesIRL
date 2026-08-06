import { useCallback, useState } from 'react';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import type {
  CompositionLoadOutcome,
  CompositionSnapshot,
} from '../types/composition';
import type { ColorMap } from '../types/map';
import type {
  EditorThemeMode,
  SavedMap,
  SavedMapSummary,
  StorageErrorReason,
  StorageResult,
  StorageWarning,
  ToolId,
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
  /**
   * The two Phase 3 preference reads, taken ONCE at mount and returned as
   * resolved values rather than as callbacks. They are read at mount because
   * they seed state that must not flicker, and they are the only entry points
   * here that do not record their outcome (see below).
   */
  initialLastOpenTool: ToolId | null;
  initialThemeMode: EditorThemeMode;
  persistLastOpenTool: (tool: ToolId | null) => void;
  persistThemeMode: (mode: EditorThemeMode) => void;
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
  const { createStorage, initialThemeMode: fallbackThemeMode } =
    useEditorConfig();
  const [adapter] = useState<StorageAdapter>(() => createStorage());
  const [initialOnboardingResult] = useState(() =>
    adapter.getOnboardingDismissed(),
  );
  /*
   * D-18 / D-30. Read once, at mount, and DELIBERATELY not passed through
   * `recordResult`: a failed preference read must not set the storage error
   * that drives `isPersistenceAvailable` and the storage-unavailable toast.
   * The panel state and the theme are cosmetic - neither may take the editor
   * down, disable Export, or produce a creator-facing message when site data
   * is blocked. It falls back silently, which is the whole contract.
   *
   * The theme falls back to the value that crossed `MapEditor`'s props
   * boundary rather than to a literal, so a host that mounts the editor in
   * dark still opens in dark when storage is unreadable. The standalone app's
   * boundary default is `light`, so an absent key still resolves to light and
   * no operating-system preference is consulted on either path.
   */
  const [initialLastOpenTool] = useState<ToolId | null>(() => {
    const result = adapter.getLastOpenTool();
    return result.ok ? result.value : null;
  });
  const [initialThemeMode] = useState<EditorThemeMode>(() => {
    const result = adapter.getThemeMode();
    return result.ok ? (result.value ?? fallbackThemeMode) : fallbackThemeMode;
  });
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

  const persistLastOpenTool = useCallback(
    (tool: ToolId | null): void => {
      adapter.setLastOpenTool(tool);
    },
    [adapter],
  );

  const persistThemeMode = useCallback(
    (mode: EditorThemeMode): void => {
      adapter.setThemeMode(mode);
    },
    [adapter],
  );

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
    initialLastOpenTool,
    initialThemeMode,
    persistLastOpenTool,
    persistThemeMode,
  };
}
