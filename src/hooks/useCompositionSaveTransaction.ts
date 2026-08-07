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
import { inferLegendForm, resolveLegendForm } from '../utils/legend';
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
      /*
       * `04-13`: the saved legend record grows from three keys to SIX.
       * `04-14` owns the V3 bump; `persistence.spec.ts` asserts this key set.
       *
       * ⚠ **The RESOLVED form is written, not the raw override, and that is a
       * deliberate correction to this plan's first shape.**
       *
       * The obvious thing is to persist `composition.legend.form` verbatim so
       * a reopened map keeps following its colours. It does not work, because
       * of a limitation this plan inherits: `04-05`'s save path resolves every
       * `ColorValue` to a **hex** at serialization, so a reloaded composition
       * has no ramp assignments left at all. `inferLegendForm` would therefore
       * return `rows` for **every** reopened map, and a creator who saved a
       * ramp-painted map with a bar legend would reopen it as rows — a silent,
       * creator-visible change to a map they may already have posted.
       * `final-integration.spec.ts` caught exactly that: 1426 red legend
       * pixels before the reload, 484 after.
       *
       * A save is a SNAPSHOT, so it records the form the legend actually had.
       * `04-14`, which persists the colour union in V3, can revisit this: once
       * the ramp identity survives a round trip, the inference does too.
       */
      form: resolveLegendForm(composition.legend, inferLegendForm(colors)),
      caption: composition.legend.caption,
      showNoData: composition.legend.showNoData,
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
