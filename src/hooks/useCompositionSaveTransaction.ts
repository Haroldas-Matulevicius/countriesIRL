import { useCallback, useMemo, useState } from 'react';

import type {
  Composition,
  CompositionSnapshot,
  MapCanvasHandle,
} from '../types/composition';
import type { ColorMap } from '../types/map';
import type {
  StorageErrorReason,
  StorageResult,
  StorageWarning,
} from '../types/ui';
import type { SaveMapValue } from '../utils/storage';

export type CompositionSaveFailureReason =
  | StorageErrorReason
  | 'map-canvas-unavailable';

export type CompositionSaveTransactionOutcome =
  | {
      readonly ok: true;
      readonly value: SaveMapValue;
      readonly warnings: ReadonlyArray<StorageWarning>;
      readonly snapshot: CompositionSnapshot;
    }
  | {
      readonly ok: false;
      readonly reason: CompositionSaveFailureReason;
    };

export type CompositionSaveTransactionState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'complete';
      readonly outcome: CompositionSaveTransactionOutcome;
    };

export interface CompositionSaveTransactionDependencies {
  readonly getMapCanvasHandle: () => MapCanvasHandle | null;
  readonly getColors: () => ColorMap;
  readonly getComposition: () => Composition;
  readonly saveComposition: (
    name: string,
    snapshot: CompositionSnapshot,
  ) => StorageResult<SaveMapValue>;
  readonly markSaved: (snapshot: CompositionSnapshot) => void;
  readonly onOutcome?: (outcome: CompositionSaveTransactionOutcome) => void;
}

export interface CompositionSaveTransaction {
  save(name: string): CompositionSaveTransactionOutcome;
}

export interface UseCompositionSaveTransactionValue {
  readonly state: CompositionSaveTransactionState;
  readonly save: (name: string) => CompositionSaveTransactionOutcome;
}

function assembleSnapshot(
  colors: ColorMap,
  composition: Composition,
  liveCamera: CompositionSnapshot['camera'],
): CompositionSnapshot {
  return {
    colors: { ...colors },
    camera: { ...liveCamera },
    snapshotId: composition.snapshotId,
    legend: {
      entries: composition.legend.entries.map((entry) => ({ ...entry })),
      position: { ...composition.legend.position },
      textSize: composition.legend.textSize,
    },
    settings: { ...composition.settings },
  };
}

export function createCompositionSaveTransaction(
  dependencies: CompositionSaveTransactionDependencies,
): CompositionSaveTransaction {
  const finish = (
    outcome: CompositionSaveTransactionOutcome,
  ): CompositionSaveTransactionOutcome => {
    dependencies.onOutcome?.(outcome);
    return outcome;
  };

  return {
    save: (name): CompositionSaveTransactionOutcome => {
      const mapCanvasHandle = dependencies.getMapCanvasHandle();
      if (mapCanvasHandle === null) {
        return finish({
          ok: false,
          reason: 'map-canvas-unavailable',
        });
      }

      let snapshot: CompositionSnapshot;
      try {
        const liveCamera = mapCanvasHandle.readCurrentCamera();
        snapshot = assembleSnapshot(
          dependencies.getColors(),
          dependencies.getComposition(),
          liveCamera,
        );
      } catch {
        return finish({
          ok: false,
          reason: 'storage-unavailable',
        });
      }

      let saveResult: StorageResult<SaveMapValue>;
      try {
        saveResult = dependencies.saveComposition(name, snapshot);
      } catch {
        return finish({
          ok: false,
          reason: 'storage-unavailable',
        });
      }

      if (!saveResult.ok) {
        return finish(saveResult);
      }

      dependencies.markSaved(snapshot);
      return finish({
        ok: true,
        value: saveResult.value,
        warnings: saveResult.warnings,
        snapshot,
      });
    },
  };
}

export function useCompositionSaveTransaction(
  dependencies: CompositionSaveTransactionDependencies,
): UseCompositionSaveTransactionValue {
  const {
    getColors,
    getComposition,
    getMapCanvasHandle,
    markSaved,
    onOutcome,
    saveComposition,
  } = dependencies;
  const transaction = useMemo<CompositionSaveTransaction>(
    () =>
      createCompositionSaveTransaction({
        getColors,
        getComposition,
        getMapCanvasHandle,
        markSaved,
        onOutcome,
        saveComposition,
      }),
    [
      getColors,
      getComposition,
      getMapCanvasHandle,
      markSaved,
      onOutcome,
      saveComposition,
    ],
  );
  const [state, setState] = useState<CompositionSaveTransactionState>({
    status: 'idle',
  });
  const save = useCallback(
    (name: string): CompositionSaveTransactionOutcome => {
      const outcome = transaction.save(name);
      setState({ status: 'complete', outcome });
      return outcome;
    },
    [transaction],
  );

  return { state, save };
}
