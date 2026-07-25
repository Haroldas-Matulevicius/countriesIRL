import { describe, expect, it, vi } from 'vitest';

import type {
  CameraState,
  Composition,
  CompositionSnapshot,
  MapCanvasHandle,
} from '../types/composition';
import type { ColorMap } from '../types/map';
import type { StorageResult } from '../types/ui';
import type { SaveMapValue } from '../utils/storage';
import {
  createCompositionSaveTransaction,
  type CompositionSaveTransactionDependencies,
} from './useCompositionSaveTransaction';

function createComposition(camera: CameraState): Composition {
  return {
    camera,
    snapshotId: '1815',
    legend: {
      entries: [
        { color: '#2563EB', label: 'Visited', order: 0 },
        { color: '#DC2626', label: 'Dormant historical label', order: 1 },
      ],
      position: { x: 120, y: 860, preset: null },
      theme: 'soft',
      textSize: 'large',
      backgroundOpacity: 85,
      borderStyle: 'strong',
    },
    settings: { backgroundColor: '#FFFFFF' },
  };
}

function createHandle(
  label: string,
  camera: CameraState,
  calls: string[],
): MapCanvasHandle {
  return {
    readCurrentCamera: vi.fn((): CameraState => {
      calls.push(`${label}:read-live-camera`);
      return camera;
    }),
    freezeAndSnapshot: vi.fn(() => {
      calls.push(`${label}:freeze`);
      return { camera, release: vi.fn() };
    }),
    zoomBy: vi.fn(),
    pan: vi.fn(),
    resetView: vi.fn(),
    locate: vi.fn(),
    restore: vi.fn(() => true),
    focusCountry: vi.fn(),
  finalizeSelectedScene: vi.fn(),
    getExportSource: vi.fn(() => null),
  };
}

function successfulSave(
  snapshot: CompositionSnapshot,
): StorageResult<SaveMapValue> {
  return {
    ok: true,
    value: {
      savedMap: { name: 'Live view', colors: snapshot.colors, timestamp: 500 },
      savedMaps: [
        { name: 'Live view', colors: snapshot.colors, timestamp: 500 },
      ],
      replaced: false,
    },
    warnings: [],
  };
}

function createDependencies(
  overrides: Partial<CompositionSaveTransactionDependencies> = {},
): CompositionSaveTransactionDependencies {
  const calls: string[] = [];
  const liveCamera = {
    zoom: 6,
    centerLongitude: 170,
    centerLatitude: -12,
  };
  const handle = createHandle('visible', liveCamera, calls);
  return {
    getMapCanvasHandle: vi.fn(() => handle),
    getColors: vi.fn((): ColorMap => ({
      FRA: '#2563EB',
      'hist:napoleonic-entity': '#DC2626',
    })),
    getComposition: vi.fn(() =>
      createComposition({
        zoom: 2,
        centerLongitude: 10,
        centerLatitude: 48,
      }),
    ),
    saveComposition: vi.fn((_name, snapshot) => successfulSave(snapshot)),
    markSaved: vi.fn(),
    onOutcome: vi.fn(),
    ...overrides,
  };
}

describe('createCompositionSaveTransaction', (): void => {
  it('reads the live visible camera synchronously and saves the exact complete snapshot', (): void => {
    const calls: string[] = [];
    const staleCamera = {
      zoom: 2,
      centerLongitude: 10,
      centerLatitude: 48,
    };
    const liveCamera = {
      zoom: 7,
      centerLongitude: -179,
      centerLatitude: 8,
    };
    const colors: ColorMap = {
      FRA: '#2563EB',
      'hist:napoleonic-entity': '#DC2626',
    };
    const composition = createComposition(staleCamera);
    const handle = createHandle('visible', liveCamera, calls);
    let persistedSnapshot: CompositionSnapshot | undefined;
    const dependencies = createDependencies({
      getMapCanvasHandle: vi.fn(() => handle),
      getColors: vi.fn(() => colors),
      getComposition: vi.fn(() => composition),
      saveComposition: vi.fn((_name, snapshot) => {
        calls.push(`storage:${snapshot.camera.centerLongitude}`);
        persistedSnapshot = snapshot;
        return successfulSave(snapshot);
      }),
      markSaved: vi.fn((snapshot): void => {
        calls.push(`baseline:${snapshot.camera.centerLongitude}`);
      }),
      onOutcome: vi.fn((): void => {
        calls.push('status:one-outcome');
      }),
    });

    const result = createCompositionSaveTransaction(dependencies).save(
      'Live view',
    );

    expect(result).toMatchObject({
      ok: true,
      value: { replaced: false },
      warnings: [],
      snapshot: { camera: liveCamera },
    });
    expect(calls).toEqual([
      'visible:read-live-camera',
      'storage:-179',
      'baseline:-179',
      'status:one-outcome',
    ]);
    expect(persistedSnapshot).toEqual({
      colors,
      camera: liveCamera,
      snapshotId: '1815',
      legend: composition.legend,
      settings: composition.settings,
    });
    expect(persistedSnapshot).not.toBe(composition);
    expect(persistedSnapshot?.colors).not.toBe(colors);
    expect(persistedSnapshot?.legend).not.toBe(composition.legend);
    expect(dependencies.markSaved).toHaveBeenCalledWith(persistedSnapshot);
    expect(handle.readCurrentCamera).toHaveBeenCalledOnce();
    expect(handle.freezeAndSnapshot).not.toHaveBeenCalled();
    expect(handle.resetView).not.toHaveBeenCalled();
    expect(handle.restore).not.toHaveBeenCalled();
  });

  it('resolves the currently rebound handle on every activation', (): void => {
    const calls: string[] = [];
    const firstHandle = createHandle(
      'first',
      { zoom: 3, centerLongitude: 30, centerLatitude: 10 },
      calls,
    );
    const reboundHandle = createHandle(
      'rebound',
      { zoom: 5, centerLongitude: 150, centerLatitude: -20 },
      calls,
    );
    let currentHandle: MapCanvasHandle | null = firstHandle;
    const dependencies = createDependencies({
      getMapCanvasHandle: vi.fn(() => currentHandle),
    });
    const transaction = createCompositionSaveTransaction(dependencies);

    expect(transaction.save('First')).toMatchObject({
      ok: true,
      snapshot: { camera: { centerLongitude: 30 } },
    });
    currentHandle = reboundHandle;
    expect(transaction.save('Second')).toMatchObject({
      ok: true,
      snapshot: { camera: { centerLongitude: 150 } },
    });

    expect(firstHandle.readCurrentCamera).toHaveBeenCalledOnce();
    expect(reboundHandle.readCurrentCamera).toHaveBeenCalledOnce();
  });

  it('does not persist or mark a baseline without a visible handle', (): void => {
    const dependencies = createDependencies({
      getMapCanvasHandle: vi.fn(() => null),
    });

    expect(createCompositionSaveTransaction(dependencies).save('Missing')).toEqual({
      ok: false,
      reason: 'map-canvas-unavailable',
    });
    expect(dependencies.getColors).not.toHaveBeenCalled();
    expect(dependencies.getComposition).not.toHaveBeenCalled();
    expect(dependencies.saveComposition).not.toHaveBeenCalled();
    expect(dependencies.markSaved).not.toHaveBeenCalled();
    expect(dependencies.onOutcome).toHaveBeenCalledOnce();
  });

  it('marks the exact assembled baseline only after storage success', (): void => {
    const quotaFailure = createDependencies({
      saveComposition: vi.fn(
        (): StorageResult<SaveMapValue> => ({
          ok: false,
          reason: 'quota-exceeded',
        }),
      ),
    });

    expect(
      createCompositionSaveTransaction(quotaFailure).save('Full'),
    ).toEqual({
      ok: false,
      reason: 'quota-exceeded',
    });
    expect(quotaFailure.markSaved).not.toHaveBeenCalled();

    const throwingStorage = createDependencies({
      saveComposition: vi.fn(() => {
        throw new Error('blocked');
      }),
    });
    expect(
      createCompositionSaveTransaction(throwingStorage).save('Blocked'),
    ).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
    expect(throwingStorage.markSaved).not.toHaveBeenCalled();
  });
});
