import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  Composition,
  CompositionLoadOutcome,
  CompositionLoadWarning,
  CompositionSnapshot,
  EffectiveScene,
  MapCanvasHandle,
  SnapshotId,
} from '../types/composition';
import type { ColorMap, CountryId, SelectedCountryIds } from '../types/map';
import type {
  StorageErrorReason,
  StorageResult,
  StorageWarning,
} from '../types/ui';
import { reconcileSelectionForScene } from '../utils/scene';

export type CompositionLoadFailureReason =
  | StorageErrorReason
  | Extract<CompositionLoadOutcome, { readonly ok: false }>['reason']
  | 'snapshot-resolution-failed'
  | 'map-canvas-unavailable'
  | 'cancelled';

export type CompositionLoadTransactionOutcome =
  | {
      readonly ok: true;
      readonly sourceVersion: 1 | 2;
      readonly compositionWarnings: ReadonlyArray<CompositionLoadWarning>;
      readonly storageWarnings: ReadonlyArray<StorageWarning>;
    }
  | {
      readonly ok: false;
      readonly reason: CompositionLoadFailureReason;
      readonly storageWarnings: ReadonlyArray<StorageWarning>;
    };

export type CompositionLoadTransactionState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly name: string }
  | {
      readonly status: 'complete';
      readonly outcome: CompositionLoadTransactionOutcome;
    };

export interface CompositionLoadTransactionDependencies {
  readonly loadStoredComposition: (
    name: string,
  ) => StorageResult<CompositionLoadOutcome>;
  readonly resolveScene: (
    snapshotId: SnapshotId,
    signal: AbortSignal,
  ) => Promise<EffectiveScene>;
  readonly getMapCanvasHandle: () => MapCanvasHandle | null;
  readonly getSelectedIds: () => SelectedCountryIds;
  readonly loadColors: (colors: ColorMap) => void;
  readonly loadComposition: (composition: Composition) => void;
  readonly replaceSelection: (selectedIds: ReadonlyArray<CountryId>) => void;
  readonly markBaseline: (snapshot: CompositionSnapshot) => void;
  readonly onOutcome?: (outcome: CompositionLoadTransactionOutcome) => void;
}

export interface CompositionLoadTransaction {
  load(name: string): Promise<CompositionLoadTransactionOutcome>;
  cancel(): void;
  dispose(): void;
  getState(): CompositionLoadTransactionState;
  subscribe(
    listener: (state: CompositionLoadTransactionState) => void,
  ): () => void;
}

export interface UseCompositionLoadTransactionValue {
  readonly state: CompositionLoadTransactionState;
  readonly load: (
    name: string,
  ) => Promise<CompositionLoadTransactionOutcome>;
  readonly cancel: () => void;
}

function toComposition(snapshot: CompositionSnapshot): Composition {
  return {
    camera: snapshot.camera,
    snapshotId: snapshot.snapshotId,
    legend: snapshot.legend,
    settings: snapshot.settings,
  };
}

function cloneSnapshot(snapshot: CompositionSnapshot): CompositionSnapshot {
  return {
    colors: { ...snapshot.colors },
    camera: { ...snapshot.camera },
    snapshotId: snapshot.snapshotId,
    legend: {
      entries: snapshot.legend.entries.map((entry) => ({ ...entry })),
      position: { ...snapshot.legend.position },
      theme: snapshot.legend.theme,
      textSize: snapshot.legend.textSize,
      backgroundOpacity: snapshot.legend.backgroundOpacity,
      borderStyle: snapshot.legend.borderStyle,
    },
    settings: { ...snapshot.settings },
  };
}

function cancelledOutcome(
  storageWarnings: ReadonlyArray<StorageWarning> = [],
): CompositionLoadTransactionOutcome {
  return {
    ok: false,
    reason: 'cancelled',
    storageWarnings,
  };
}

export function createCompositionLoadTransaction(
  dependencies: CompositionLoadTransactionDependencies,
): CompositionLoadTransaction {
  let state: CompositionLoadTransactionState = { status: 'idle' };
  let activeController: AbortController | null = null;
  let requestVersion = 0;
  let isDisposed = false;
  const listeners = new Set<
    (state: CompositionLoadTransactionState) => void
  >();

  const updateState = (nextState: CompositionLoadTransactionState): void => {
    state = nextState;
    listeners.forEach((listener): void => listener(nextState));
  };

  const finish = (
    outcome: CompositionLoadTransactionOutcome,
  ): CompositionLoadTransactionOutcome => {
    updateState({ status: 'complete', outcome });
    dependencies.onOutcome?.(outcome);
    return outcome;
  };

  const cancel = (): void => {
    requestVersion += 1;
    activeController?.abort();
    activeController = null;
  };

  return {
    load: async (name): Promise<CompositionLoadTransactionOutcome> => {
      if (isDisposed) {
        return cancelledOutcome();
      }

      cancel();
      const version = requestVersion;
      const controller = new AbortController();
      activeController = controller;
      updateState({ status: 'loading', name });

      let storedResult: StorageResult<CompositionLoadOutcome>;
      try {
        storedResult = dependencies.loadStoredComposition(name);
      } catch {
        if (version !== requestVersion || controller.signal.aborted) {
          return cancelledOutcome();
        }
        activeController = null;
        return finish({
          ok: false,
          reason: 'storage-unavailable',
          storageWarnings: [],
        });
      }

      if (version !== requestVersion || controller.signal.aborted) {
        return cancelledOutcome(storedResult.ok ? storedResult.warnings : []);
      }
      if (!storedResult.ok) {
        activeController = null;
        return finish({
          ok: false,
          reason: storedResult.reason,
          storageWarnings: [],
        });
      }
      if (!storedResult.value.ok) {
        activeController = null;
        return finish({
          ok: false,
          reason: storedResult.value.reason,
          storageWarnings: storedResult.warnings,
        });
      }

      const snapshot = cloneSnapshot(storedResult.value.value);
      let scene: EffectiveScene;
      try {
        scene = await dependencies.resolveScene(
          snapshot.snapshotId,
          controller.signal,
        );
      } catch {
        if (version !== requestVersion || controller.signal.aborted) {
          return cancelledOutcome(storedResult.warnings);
        }
        activeController = null;
        return finish({
          ok: false,
          reason: 'snapshot-resolution-failed',
          storageWarnings: storedResult.warnings,
        });
      }

      if (
        version !== requestVersion ||
        controller.signal.aborted ||
        isDisposed
      ) {
        return cancelledOutcome(storedResult.warnings);
      }
      if (scene.snapshotId !== snapshot.snapshotId) {
        activeController = null;
        return finish({
          ok: false,
          reason: 'snapshot-resolution-failed',
          storageWarnings: storedResult.warnings,
        });
      }

      const mapCanvasHandle = dependencies.getMapCanvasHandle();
      if (mapCanvasHandle === null) {
        activeController = null;
        return finish({
          ok: false,
          reason: 'map-canvas-unavailable',
          storageWarnings: storedResult.warnings,
        });
      }

      const reconciledSelection = reconcileSelectionForScene(
        dependencies.getSelectedIds(),
        scene,
      );
      const selectedIds = [...reconciledSelection];
      const focusCountryId =
        selectedIds[0] ?? scene.selectableEntityIds.values().next().value;

      dependencies.loadColors(snapshot.colors);
      dependencies.loadComposition(toComposition(snapshot));
      dependencies.replaceSelection(selectedIds);
      mapCanvasHandle.restore(snapshot.camera);
      if (focusCountryId !== undefined) {
        mapCanvasHandle.focusCountry(focusCountryId);
      }
      dependencies.markBaseline(snapshot);

      activeController = null;
      return finish({
        ok: true,
        sourceVersion: storedResult.value.sourceVersion,
        compositionWarnings: storedResult.value.warnings,
        storageWarnings: storedResult.warnings,
      });
    },
    cancel,
    dispose: (): void => {
      if (isDisposed) {
        return;
      }
      isDisposed = true;
      cancel();
      listeners.clear();
    },
    getState: (): CompositionLoadTransactionState => state,
    subscribe: (listener): (() => void) => {
      if (isDisposed) {
        return (): void => undefined;
      }
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
  };
}

export function useCompositionLoadTransaction(
  dependencies: CompositionLoadTransactionDependencies,
): UseCompositionLoadTransactionValue {
  const {
    getMapCanvasHandle,
    getSelectedIds,
    loadColors,
    loadComposition,
    loadStoredComposition,
    markBaseline,
    onOutcome,
    replaceSelection,
    resolveScene,
  } = dependencies;
  const transaction = useMemo<CompositionLoadTransaction>(
    () =>
      createCompositionLoadTransaction({
        getMapCanvasHandle,
        getSelectedIds,
        loadColors,
        loadComposition,
        loadStoredComposition,
        markBaseline,
        onOutcome,
        replaceSelection,
        resolveScene,
      }),
    [
      getMapCanvasHandle,
      getSelectedIds,
      loadColors,
      loadComposition,
      loadStoredComposition,
      markBaseline,
      onOutcome,
      replaceSelection,
      resolveScene,
    ],
  );
  const [state, setState] = useState<CompositionLoadTransactionState>(
    transaction.getState,
  );

  useEffect((): (() => void) => {
    const unsubscribe = transaction.subscribe(setState);
    return (): void => {
      unsubscribe();
      transaction.cancel();
    };
  }, [transaction]);

  const load = useCallback(
    (name: string): Promise<CompositionLoadTransactionOutcome> =>
      transaction.load(name),
    [transaction],
  );
  const cancel = useCallback((): void => transaction.cancel(), [transaction]);

  return { state, load, cancel };
}
