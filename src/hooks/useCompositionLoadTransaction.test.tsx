import { describe, expect, it, vi } from 'vitest';

import type {
  CompositionLoadOutcome,
  CompositionSnapshot,
  EffectiveScene,
  MapCanvasHandle,
} from '../types/composition';
import type { CountryId } from '../types/map';
import type { StorageResult } from '../types/ui';
import {
  createCompositionLoadTransaction,
  type CompositionLoadRollbackState,
  type CompositionLoadTransactionDependencies,
} from './useCompositionLoadTransaction';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  let rejectPromise: ((error: Error) => void) | undefined;
  const promise = new Promise<T>((resolve, reject): void => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve(value): void {
      resolvePromise?.(value);
    },
    reject(error): void {
      rejectPromise?.(error);
    },
  };
}

function createSnapshot(
  snapshotId: CompositionSnapshot['snapshotId'] = '1700',
): CompositionSnapshot {
  return {
    colors: {
      FRA: '#2563EB',
      'hist:polish-lithuanian-commonwealth': '#DC2626',
    },
    camera: {
      zoom: 4,
      centerLongitude: 19,
      centerLatitude: 52,
    },
    snapshotId,
    legend: {
      entries: [
        { color: '#2563EB', label: 'Modern', order: 0 },
        { color: '#DC2626', label: 'Historical', order: 1 },
      ],
      position: { x: 720, y: 64, preset: 'top-right' },
      theme: 'soft',
      textSize: 'large',
      backgroundOpacity: 85,
      borderStyle: 'strong',
    },
    settings: { backgroundColor: '#FFFFFF' },
  };
}

function createStoredLoad(
  snapshot: CompositionSnapshot,
): StorageResult<CompositionLoadOutcome> {
  return {
    ok: true,
    value: {
      ok: true,
      value: snapshot,
      sourceVersion: 2,
      warnings: [],
    },
    warnings: [],
  };
}

function createScene(
  snapshotId: EffectiveScene['snapshotId'],
  selectableEntityIds: ReadonlyArray<CountryId>,
): EffectiveScene {
  return {
    snapshotId,
    features: [],
    selectableEntityIds: new Set(selectableEntityIds),
  };
}

function createHandle(label: string, calls: string[]): MapCanvasHandle {
  return {
    readCurrentCamera: vi.fn(() => ({
      zoom: 1,
      centerLongitude: 0,
      centerLatitude: 0,
    })),
    freezeAndSnapshot: vi.fn(() => ({
      camera: { zoom: 1, centerLongitude: 0, centerLatitude: 0 },
      release: vi.fn(),
    })),
    zoomBy: vi.fn(),
    pan: vi.fn(),
    resetView: vi.fn(),
    locate: vi.fn(),
    restore: vi.fn((): boolean => {
      calls.push(`${label}:restore`);
      return true;
    }),
    focusCountry: vi.fn((countryId): void => {
      calls.push(`${label}:focus:${countryId}`);
    }),
    getExportSource: vi.fn(() => null),
  };
}

function createRollbackState(): CompositionLoadRollbackState {
  const snapshot = createSnapshot('modern');
  const composition = {
    camera: snapshot.camera,
    snapshotId: snapshot.snapshotId,
    legend: snapshot.legend,
    settings: snapshot.settings,
  };
  return {
    camera: snapshot.camera,
    scene: null,
    mapState: {
      colors: {},
      history: [{}],
      historyIndex: 0,
      selectedIds: new Set(),
    },
    compositionState: {
      ...composition,
      savedBaseline: composition,
    },
  };
}

function createDependencies(
  overrides: Partial<CompositionLoadTransactionDependencies> = {},
): CompositionLoadTransactionDependencies {
  const snapshot = createSnapshot();
  return {
    loadStoredComposition: vi.fn(() => createStoredLoad(snapshot)),
    resolveScene: vi.fn(async () =>
      createScene(snapshot.snapshotId, [
        'FRA',
        'hist:polish-lithuanian-commonwealth',
      ]),
    ),
    getMapCanvasHandle: vi.fn(() => createHandle('current', [])),
    getSelectedIds: vi.fn(() =>
      new Set<CountryId>([
        'DEU',
        'hist:polish-lithuanian-commonwealth',
      ]),
    ),
    captureRollbackState: vi.fn(createRollbackState),
    rollback: vi.fn(),
    loadScene: vi.fn(),
    loadColors: vi.fn(),
    loadComposition: vi.fn(),
    replaceSelection: vi.fn(),
    markBaseline: vi.fn(),
    requestFocus: vi.fn(),
    onOutcome: vi.fn(),
    ...overrides,
  };
}

describe('createCompositionLoadTransaction', (): void => {
  it('validates and resolves before one ordered commit on the currently rebound handle', async (): Promise<void> => {
    const calls: string[] = [];
    const snapshot = createSnapshot();
    const deferredScene = createDeferred<EffectiveScene>();
    const staleHandle = createHandle('stale', calls);
    const visibleHandle = createHandle('visible', calls);
    let currentHandle: MapCanvasHandle | null = staleHandle;
    const dependencies = createDependencies({
      loadStoredComposition: vi.fn(() => {
        calls.push('storage:validated');
        return createStoredLoad(snapshot);
      }),
      resolveScene: vi.fn((_snapshotId, signal) => {
        calls.push(`snapshot:resolve:${String(signal.aborted)}`);
        return deferredScene.promise;
      }),
      getMapCanvasHandle: vi.fn(() => currentHandle),
      loadScene: vi.fn((): void => {
        calls.push('scene:load');
      }),
      loadColors: vi.fn((): void => {
        calls.push('colors:load-and-reset-history');
      }),
      loadComposition: vi.fn((): void => {
        calls.push('composition:load');
      }),
      replaceSelection: vi.fn((selection): void => {
        calls.push(`selection:${[...selection].join(',')}`);
      }),
      markBaseline: vi.fn((baseline): void => {
        calls.push(`baseline:${baseline.camera.centerLongitude}`);
      }),
      requestFocus: vi.fn((countryId): void => {
        calls.push(`focus-request:${countryId ?? 'map'}`);
      }),
      onOutcome: vi.fn((): void => {
        calls.push('status:one-outcome');
      }),
    });
    const transaction = createCompositionLoadTransaction(dependencies);

    const load = transaction.load('Historical view');
    expect(calls).toEqual([
      'storage:validated',
      'snapshot:resolve:false',
    ]);
    expect(dependencies.getMapCanvasHandle).not.toHaveBeenCalled();
    expect(dependencies.loadColors).not.toHaveBeenCalled();

    currentHandle = visibleHandle;
    deferredScene.resolve(
      createScene(snapshot.snapshotId, [
        'FRA',
        'hist:polish-lithuanian-commonwealth',
      ]),
    );

    await expect(load).resolves.toEqual({
      ok: true,
      sourceVersion: 2,
      compositionWarnings: [],
      storageWarnings: [],
    });
    expect(calls).toEqual([
      'storage:validated',
      'snapshot:resolve:false',
      'visible:restore',
      'scene:load',
      'colors:load-and-reset-history',
      'composition:load',
      'selection:hist:polish-lithuanian-commonwealth',
      'baseline:19',
      'focus-request:hist:polish-lithuanian-commonwealth',
      'status:one-outcome',
    ]);
    expect(staleHandle.restore).not.toHaveBeenCalled();
    expect(staleHandle.focusCountry).not.toHaveBeenCalled();
    expect(visibleHandle.restore).toHaveBeenCalledWith(snapshot.camera);
    expect(dependencies.loadColors).toHaveBeenCalledWith(snapshot.colors);
    expect(dependencies.loadComposition).toHaveBeenCalledWith({
      camera: snapshot.camera,
      snapshotId: snapshot.snapshotId,
      legend: snapshot.legend,
      settings: snapshot.settings,
    });
    expect(dependencies.markBaseline).toHaveBeenCalledWith(snapshot);
    expect(dependencies.onOutcome).toHaveBeenCalledTimes(1);
  });

  it('fails closed for invalid storage outcomes, snapshot failures, and a missing canvas', async (): Promise<void> => {
    const invalidStorage = createDependencies({
      loadStoredComposition: vi.fn(
        (): StorageResult<CompositionLoadOutcome> => ({
          ok: true,
          value: { ok: false, reason: 'unsupported-version' },
          warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
        }),
      ),
    });
    const invalidTransaction = createCompositionLoadTransaction(invalidStorage);

    await expect(invalidTransaction.load('Future')).resolves.toEqual({
      ok: false,
      reason: 'unsupported-version',
      storageWarnings: [{ code: 'corrupt-data', recordIndex: 0 }],
    });
    expect(invalidStorage.resolveScene).not.toHaveBeenCalled();
    expect(invalidStorage.loadColors).not.toHaveBeenCalled();

    const snapshotFailure = createDependencies({
      resolveScene: vi.fn(async () => {
        throw new Error('asset rejected');
      }),
    });
    await expect(
      createCompositionLoadTransaction(snapshotFailure).load('Historical'),
    ).resolves.toEqual({
      ok: false,
      reason: 'snapshot-resolution-failed',
      storageWarnings: [],
    });
    expect(snapshotFailure.loadColors).not.toHaveBeenCalled();

    const missingCanvas = createDependencies({
      getMapCanvasHandle: vi.fn(() => null),
    });
    await expect(
      createCompositionLoadTransaction(missingCanvas).load('Historical'),
    ).resolves.toEqual({
      ok: false,
      reason: 'map-canvas-unavailable',
      storageWarnings: [],
    });
    expect(missingCanvas.loadColors).not.toHaveBeenCalled();
    expect(missingCanvas.loadComposition).not.toHaveBeenCalled();
    expect(missingCanvas.markBaseline).not.toHaveBeenCalled();
  });

  it('fails atomically when an active export freeze blocks camera restore', async (): Promise<void> => {
    const calls: string[] = [];
    const handle = createHandle('visible', calls);
    vi.mocked(handle.restore).mockReturnValue(false);
    const dependencies = createDependencies({
      getMapCanvasHandle: vi.fn(() => handle),
    });

    await expect(
      createCompositionLoadTransaction(dependencies).load('Frozen view'),
    ).resolves.toEqual({
      ok: false,
      reason: 'camera-restore-blocked',
      storageWarnings: [],
    });

    expect(handle.restore).toHaveBeenCalledOnce();
    expect(dependencies.loadScene).not.toHaveBeenCalled();
    expect(dependencies.loadColors).not.toHaveBeenCalled();
    expect(dependencies.loadComposition).not.toHaveBeenCalled();
    expect(dependencies.replaceSelection).not.toHaveBeenCalled();
    expect(dependencies.markBaseline).not.toHaveBeenCalled();
  });

  it.each([
    'loadScene',
    'loadColors',
    'loadComposition',
    'replaceSelection',
    'markBaseline',
    'requestFocus',
  ] as const)(
    'rolls back camera and all prior commit stages when %s throws',
    async (failureStage): Promise<void> => {
      const calls: string[] = [];
      const handle = createHandle('visible', calls);
      const rollbackState = createRollbackState();
      const appliedStages: string[] = [];
      const commit = (stage: string): void => {
        appliedStages.push(stage);
        if (stage === failureStage) {
          throw new Error(`${stage} failed`);
        }
      };
      const dependencies = createDependencies({
        getMapCanvasHandle: vi.fn(() => handle),
        captureRollbackState: vi.fn(() => rollbackState),
        rollback: vi.fn((state, currentHandle): void => {
          expect(state).toBe(rollbackState);
          appliedStages.splice(0);
          expect(currentHandle.restore(state.camera)).toBe(true);
        }),
        loadScene: vi.fn((): void => commit('loadScene')),
        loadColors: vi.fn((): void => commit('loadColors')),
        loadComposition: vi.fn((): void => commit('loadComposition')),
        replaceSelection: vi.fn((): void => commit('replaceSelection')),
        markBaseline: vi.fn((): void => commit('markBaseline')),
        requestFocus: vi.fn((): void => commit('requestFocus')),
      });

      await expect(
        createCompositionLoadTransaction(dependencies).load('Rollback'),
      ).resolves.toEqual({
        ok: false,
        reason: 'commit-failed',
        storageWarnings: [],
      });

      expect(appliedStages).toEqual([]);
      expect(dependencies.rollback).toHaveBeenCalledOnce();
      expect(handle.restore).toHaveBeenCalledTimes(2);
      expect(handle.restore).toHaveBeenLastCalledWith(rollbackState.camera);
      expect(dependencies.onOutcome).toHaveBeenCalledOnce();
    },
  );

  it('cancels superseded and disposed intents without stale mutations or status', async (): Promise<void> => {
    const firstScene = createDeferred<EffectiveScene>();
    const secondScene = createDeferred<EffectiveScene>();
    const signals: AbortSignal[] = [];
    let requestCount = 0;
    const dependencies = createDependencies({
      resolveScene: vi.fn((_snapshotId, signal) => {
        signals.push(signal);
        requestCount += 1;
        return requestCount === 1 ? firstScene.promise : secondScene.promise;
      }),
    });
    const transaction = createCompositionLoadTransaction(dependencies);

    const firstLoad = transaction.load('First');
    const secondLoad = transaction.load('Second');
    expect(signals[0]?.aborted).toBe(true);

    secondScene.resolve(createScene('1700', ['FRA']));
    await expect(secondLoad).resolves.toMatchObject({ ok: true });
    firstScene.resolve(createScene('1700', ['FRA']));
    await expect(firstLoad).resolves.toEqual({
      ok: false,
      reason: 'cancelled',
      storageWarnings: [],
    });

    expect(dependencies.loadColors).toHaveBeenCalledTimes(1);
    expect(dependencies.onOutcome).toHaveBeenCalledTimes(1);

    const cancelledScene = createDeferred<EffectiveScene>();
    const cancelledDependencies = createDependencies({
      resolveScene: vi.fn(() => cancelledScene.promise),
    });
    const cancelledTransaction = createCompositionLoadTransaction(
      cancelledDependencies,
    );
    const cancelledLoad = cancelledTransaction.load('Cancelled');
    expect(cancelledTransaction.getState()).toEqual({
      status: 'loading',
      name: 'Cancelled',
    });
    cancelledTransaction.cancel();
    expect(cancelledTransaction.getState()).toEqual({ status: 'idle' });
    cancelledScene.resolve(createScene('1700', ['FRA']));
    await expect(cancelledLoad).resolves.toEqual({
      ok: false,
      reason: 'cancelled',
      storageWarnings: [],
    });
    expect(cancelledTransaction.getState()).toEqual({ status: 'idle' });

    const disposedScene = createDeferred<EffectiveScene>();
    const disposedDependencies = createDependencies({
      resolveScene: vi.fn((_snapshotId, signal) => {
        signals.push(signal);
        return disposedScene.promise;
      }),
    });
    const disposedTransaction = createCompositionLoadTransaction(
      disposedDependencies,
    );
    const disposedLoad = disposedTransaction.load('Disposed');
    disposedTransaction.dispose();
    expect(signals.at(-1)?.aborted).toBe(true);
    disposedScene.resolve(createScene('1700', ['FRA']));

    await expect(disposedLoad).resolves.toEqual({
      ok: false,
      reason: 'cancelled',
      storageWarnings: [],
    });
    expect(disposedDependencies.loadColors).not.toHaveBeenCalled();
    expect(disposedDependencies.onOutcome).not.toHaveBeenCalled();
  });

  it('focuses the first incoming map entity when prior selection has no valid identity', async (): Promise<void> => {
    const calls: string[] = [];
    const handle = createHandle('visible', calls);
    const dependencies = createDependencies({
      getMapCanvasHandle: vi.fn(() => handle),
      getSelectedIds: vi.fn(() => new Set<CountryId>(['REMOVED'])),
      resolveScene: vi.fn(async () => createScene('1700', ['FRA', 'HIST-HRE'])),
    });

    await expect(
      createCompositionLoadTransaction(dependencies).load('Historical'),
    ).resolves.toMatchObject({ ok: true });

    expect(dependencies.replaceSelection).toHaveBeenCalledWith([]);
    expect(dependencies.requestFocus).toHaveBeenCalledWith('FRA');
    expect(handle.focusCountry).not.toHaveBeenCalled();
  });
});
