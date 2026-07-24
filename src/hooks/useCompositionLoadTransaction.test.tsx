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
    resetView: vi.fn(),
    locate: vi.fn(),
    restore: vi.fn((): void => {
      calls.push(`${label}:restore`);
    }),
    focusCountry: vi.fn((countryId): void => {
      calls.push(`${label}:focus:${countryId}`);
    }),
    getExportSource: vi.fn(() => null),
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
    loadColors: vi.fn(),
    loadComposition: vi.fn(),
    replaceSelection: vi.fn(),
    markBaseline: vi.fn(),
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
      'colors:load-and-reset-history',
      'composition:load',
      'selection:hist:polish-lithuanian-commonwealth',
      'visible:restore',
      'visible:focus:hist:polish-lithuanian-commonwealth',
      'baseline:19',
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
    expect(handle.focusCountry).toHaveBeenCalledWith('FRA');
  });
});
