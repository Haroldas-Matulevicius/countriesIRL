import { describe, expect, it, vi } from 'vitest';

import type {
  CameraFreezeLease,
  CameraState,
  MapCanvasHandle,
} from '../types/composition';
import type { ExportResult } from '../types/ui';
import {
  createCompositionExportTransaction,
  type CompositionExportTransactionDependencies,
  type CompositionExportTransactionOutcome,
} from './useCompositionExportTransaction';

const FROZEN_CAMERA: CameraState = {
  zoom: 6,
  centerLongitude: 179,
  centerLatitude: -12,
};
const LIVE_CAMERA: CameraState = {
  zoom: 2,
  centerLongitude: 10,
  centerLatitude: 48,
};

interface LeaseProbe {
  readonly lease: CameraFreezeLease;
  effectiveReleaseCount: number;
  releaseCallCount: number;
}

/**
 * Mirrors the real lease: release is idempotent, so a second call from any
 * owner must not unlock the camera twice.
 */
function createLeaseProbe(
  camera: CameraState,
  calls: string[],
  label: string,
): LeaseProbe {
  let isReleased = false;
  const probe: LeaseProbe = {
    effectiveReleaseCount: 0,
    releaseCallCount: 0,
    lease: {
      camera,
      release: (): void => {
        probe.releaseCallCount += 1;
        if (isReleased) {
          return;
        }
        isReleased = true;
        probe.effectiveReleaseCount += 1;
        calls.push(`${label}:release`);
      },
    },
  };
  return probe;
}

interface HandleProbe {
  readonly handle: MapCanvasHandle;
  readonly leases: LeaseProbe[];
  readonly source: HTMLDivElement;
}

interface HandleOptions {
  readonly frozenCamera?: CameraState;
  readonly onFreeze?: () => void;
  readonly onFinalize?: () => void;
  readonly onGetExportSource?: () => HTMLDivElement | null;
}

function createHandleProbe(
  label: string,
  calls: string[],
  options: HandleOptions = {},
): HandleProbe {
  const leases: LeaseProbe[] = [];
  const source = { tagName: 'DIV' } as unknown as HTMLDivElement;
  const handle: MapCanvasHandle = {
    readCurrentCamera: vi.fn((): CameraState => {
      calls.push(`${label}:read-live-camera`);
      return LIVE_CAMERA;
    }),
    freezeAndSnapshot: vi.fn((): CameraFreezeLease => {
      calls.push(`${label}:freeze`);
      options.onFreeze?.();
      const probe = createLeaseProbe(
        options.frozenCamera ?? FROZEN_CAMERA,
        calls,
        label,
      );
      leases.push(probe);
      return probe.lease;
    }),
    zoomBy: vi.fn(),
    pan: vi.fn(),
    resetView: vi.fn(),
    locate: vi.fn(() => true),
    restore: vi.fn(() => true),
    focusCountry: vi.fn(),
    finalizeSelectedScene: vi.fn((): void => {
      calls.push(`${label}:finalize`);
      options.onFinalize?.();
    }),
    getExportSource: vi.fn((): HTMLDivElement | null => {
      calls.push(`${label}:get-export-source`);
      return options.onGetExportSource === undefined
        ? source
        : options.onGetExportSource();
    }),
  };
  return { handle, leases, source };
}

interface Harness {
  readonly calls: string[];
  readonly dependencies: CompositionExportTransactionDependencies;
  readonly outcomes: CompositionExportTransactionOutcome[];
  readonly committedCameras: CameraState[];
  readonly busyStates: boolean[];
  readonly exportedSources: HTMLElement[];
  readonly exportedNames: Array<string | undefined>;
}

function createHarness(
  overrides: Partial<CompositionExportTransactionDependencies> = {},
  calls: string[] = [],
): Harness {
  const outcomes: CompositionExportTransactionOutcome[] = [];
  const committedCameras: CameraState[] = [];
  const busyStates: boolean[] = [];
  const exportedSources: HTMLElement[] = [];
  const exportedNames: Array<string | undefined> = [];
  const { handle } = createHandleProbe('visible', calls);

  const dependencies: CompositionExportTransactionDependencies = {
    getMapCanvasHandle: vi.fn(() => handle),
    getLegendBlocker: vi.fn(() => null),
    getCompositionName: vi.fn(() => undefined),
    commitCamera: vi.fn((camera: CameraState): void => {
      calls.push(`commit-camera:${camera.centerLongitude}`);
      committedCameras.push(camera);
    }),
    setBusy: vi.fn((isBusy: boolean): void => {
      calls.push(`busy:${String(isBusy)}`);
      busyStates.push(isBusy);
    }),
    exportMap: vi.fn(
      async (
        source: HTMLElement,
        mapName?: string,
      ): Promise<ExportResult> => {
        calls.push('export');
        exportedSources.push(source);
        exportedNames.push(mapName);
        return { ok: true, filename: 'CountriesIRL_2026-07-25.png' };
      },
    ),
    onOutcome: vi.fn((outcome): void => {
      calls.push(`outcome:${outcome.ok ? 'ok' : outcome.reason}`);
      outcomes.push(outcome);
    }),
    ...overrides,
  };

  return {
    calls,
    dependencies,
    outcomes,
    committedCameras,
    busyStates,
    exportedSources,
    exportedNames,
  };
}

describe('createCompositionExportTransaction', (): void => {
  it('freezes, commits the frozen camera, captures, and releases once in order', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => probe.handle),
        getCompositionName: vi.fn(() => 'Baltic  Tour /2026!'),
      },
      calls,
    );

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({
      ok: true,
      filename: 'CountriesIRL_2026-07-25.png',
    });
    expect(calls).toEqual([
      'busy:true',
      'visible:freeze',
      'commit-camera:179',
      'visible:finalize',
      'visible:get-export-source',
      'export',
      'visible:release',
      'busy:false',
      'outcome:ok',
    ]);
    expect(harness.exportedSources).toEqual([probe.source]);
    expect(harness.exportedNames).toEqual(['Baltic  Tour /2026!']);
    expect(harness.committedCameras).toEqual([FROZEN_CAMERA]);
    expect(probe.leases).toHaveLength(1);
    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
    expect(probe.handle.readCurrentCamera).not.toHaveBeenCalled();
  });

  it('refuses a concurrent activation without touching the camera or reporting twice', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    let releaseCapture: (() => void) | null = null;
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => probe.handle),
        exportMap: vi.fn(
          (): Promise<ExportResult> =>
            new Promise<ExportResult>((resolve): void => {
              releaseCapture = (): void =>
                resolve({ ok: true, filename: 'first.png' });
            }),
        ),
      },
      calls,
    );
    const transaction = createCompositionExportTransaction(
      harness.dependencies,
    );

    const first = transaction.run();
    const second = await transaction.run();

    expect(second).toEqual({ ok: false, reason: 'already-active' });
    expect(probe.handle.freezeAndSnapshot).toHaveBeenCalledOnce();
    expect(harness.dependencies.onOutcome).not.toHaveBeenCalled();

    releaseCapture?.();
    await expect(first).resolves.toEqual({ ok: true, filename: 'first.png' });
    expect(harness.outcomes).toEqual([{ ok: true, filename: 'first.png' }]);
    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);

    // The activation lock is clear again, so a later export still runs.
    releaseCapture = null;
    const third = transaction.run();
    expect(probe.handle.freezeAndSnapshot).toHaveBeenCalledTimes(2);
    releaseCapture?.();
    await third;
  });

  it('reports the legend blocker before acquiring a lease or a busy lock', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => probe.handle),
        getLegendBlocker: vi.fn(() => 'Shorten the legend label.'),
      },
      calls,
    );

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({
      ok: false,
      reason: 'legend-blocked',
      message: 'Shorten the legend label.',
    });
    expect(calls).toEqual(['outcome:legend-blocked']);
    expect(probe.handle.freezeAndSnapshot).not.toHaveBeenCalled();
    expect(harness.dependencies.setBusy).not.toHaveBeenCalled();
    expect(harness.dependencies.exportMap).not.toHaveBeenCalled();
  });

  it('fails without a bound map canvas handle', async (): Promise<void> => {
    const harness = createHarness({
      getMapCanvasHandle: vi.fn(() => null),
    });

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({ ok: false, reason: 'map-canvas-unavailable' });
    expect(harness.dependencies.setBusy).not.toHaveBeenCalled();
    expect(harness.dependencies.exportMap).not.toHaveBeenCalled();
    expect(harness.outcomes).toEqual([
      { ok: false, reason: 'map-canvas-unavailable' },
    ]);
  });

  it('resolves the currently rebound handle at each activation', async (): Promise<void> => {
    const calls: string[] = [];
    const first = createHandleProbe('first', calls, {
      frozenCamera: { zoom: 3, centerLongitude: 30, centerLatitude: 10 },
    });
    const rebound = createHandleProbe('rebound', calls, {
      frozenCamera: { zoom: 5, centerLongitude: 150, centerLatitude: -20 },
    });
    let currentHandle: MapCanvasHandle = first.handle;
    const harness = createHarness(
      { getMapCanvasHandle: vi.fn(() => currentHandle) },
      calls,
    );
    const transaction = createCompositionExportTransaction(
      harness.dependencies,
    );

    await transaction.run();
    currentHandle = rebound.handle;
    await transaction.run();

    expect(first.handle.freezeAndSnapshot).toHaveBeenCalledOnce();
    expect(rebound.handle.freezeAndSnapshot).toHaveBeenCalledOnce();
    expect(harness.committedCameras.map((camera) => camera.centerLongitude)).toEqual([
      30, 150,
    ]);
    expect(harness.exportedSources).toEqual([first.source, rebound.source]);
    expect(first.leases[0]?.effectiveReleaseCount).toBe(1);
    expect(rebound.leases[0]?.effectiveReleaseCount).toBe(1);
  });

  it('keeps using the activation handle when the canvas is rebound mid-export', async (): Promise<void> => {
    const calls: string[] = [];
    const staleHandle = createHandleProbe('stale', calls);
    const remountedHandle = createHandleProbe('remounted', calls);
    let currentHandle: MapCanvasHandle = staleHandle.handle;
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => currentHandle),
        exportMap: vi.fn(async (source: HTMLElement): Promise<ExportResult> => {
          calls.push('export');
          currentHandle = remountedHandle.handle;
          expect(source).toBe(staleHandle.source);
          return { ok: true, filename: 'remount.png' };
        }),
      },
      calls,
    );

    await createCompositionExportTransaction(harness.dependencies).run();

    expect(staleHandle.leases[0]?.effectiveReleaseCount).toBe(1);
    expect(remountedHandle.handle.freezeAndSnapshot).not.toHaveBeenCalled();
    expect(remountedHandle.leases).toHaveLength(0);
  });

  it('releases the lease when the export source is missing', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls, {
      onGetExportSource: (): HTMLDivElement | null => null,
    });
    const harness = createHarness(
      { getMapCanvasHandle: vi.fn(() => probe.handle) },
      calls,
    );

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({
      ok: false,
      reason: 'export-source-unavailable',
    });
    expect(harness.dependencies.exportMap).not.toHaveBeenCalled();
    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
    expect(harness.busyStates).toEqual([true, false]);
  });

  it.each([
    'source-not-found',
    'invalid-composition',
    'capture-failed',
    'invalid-dimensions',
    'encoding-failed',
  ] as const)(
    'surfaces the %s capture reason and still releases the lease',
    async (reason): Promise<void> => {
      const calls: string[] = [];
      const probe = createHandleProbe('visible', calls);
      const harness = createHarness(
        {
          getMapCanvasHandle: vi.fn(() => probe.handle),
          exportMap: vi.fn(
            async (): Promise<ExportResult> => ({ ok: false, reason }),
          ),
        },
        calls,
      );

      const outcome = await createCompositionExportTransaction(
        harness.dependencies,
      ).run();

      expect(outcome).toEqual({ ok: false, reason });
      expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
      expect(calls.at(-3)).toBe('visible:release');
      expect(harness.busyStates).toEqual([true, false]);
    },
  );

  it('releases the lease when the capture throws', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => probe.handle),
        exportMap: vi.fn(async (): Promise<ExportResult> => {
          throw new Error('html2canvas exploded');
        }),
      },
      calls,
    );

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({ ok: false, reason: 'export-failed' });
    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
    expect(harness.busyStates).toEqual([true, false]);
  });

  it('clears the busy lock when the freeze itself throws', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls, {
      onFreeze: (): void => {
        throw new Error('camera input could not be detached');
      },
    });
    const harness = createHarness(
      { getMapCanvasHandle: vi.fn(() => probe.handle) },
      calls,
    );
    const transaction = createCompositionExportTransaction(
      harness.dependencies,
    );

    const outcome = await transaction.run();

    expect(outcome).toEqual({ ok: false, reason: 'preparation-failed' });
    expect(probe.leases).toHaveLength(0);
    expect(harness.busyStates).toEqual([true, false]);
    expect(harness.dependencies.exportMap).not.toHaveBeenCalled();

    // The activation lock must not survive a thrown freeze.
    await transaction.run();
    expect(probe.handle.freezeAndSnapshot).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      'commitCamera',
      (): Partial<CompositionExportTransactionDependencies> => ({
        commitCamera: vi.fn((): void => {
          throw new Error('composition write blocked');
        }),
      }),
    ],
  ])(
    'releases the lease when %s throws before capture',
    async (_label, buildOverride): Promise<void> => {
      const calls: string[] = [];
      const probe = createHandleProbe('visible', calls);
      const harness = createHarness(
        {
          getMapCanvasHandle: vi.fn(() => probe.handle),
          ...buildOverride(),
        },
        calls,
      );

      const outcome = await createCompositionExportTransaction(
        harness.dependencies,
      ).run();

      expect(outcome).toEqual({ ok: false, reason: 'preparation-failed' });
      expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
      expect(harness.dependencies.exportMap).not.toHaveBeenCalled();
      expect(harness.busyStates).toEqual([true, false]);
    },
  );

  it('releases the lease when scene finalization throws', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls, {
      onFinalize: (): void => {
        throw new Error('crossfade could not be finalized');
      },
    });
    const harness = createHarness(
      { getMapCanvasHandle: vi.fn(() => probe.handle) },
      calls,
    );

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({ ok: false, reason: 'preparation-failed' });
    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
    expect(harness.dependencies.exportMap).not.toHaveBeenCalled();
  });

  it('releases the lease when reading the export source throws', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls, {
      onGetExportSource: (): HTMLDivElement | null => {
        throw new Error('detached canvas');
      },
    });
    const harness = createHarness(
      { getMapCanvasHandle: vi.fn(() => probe.handle) },
      calls,
    );

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({ ok: false, reason: 'preparation-failed' });
    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
  });

  it('reports the legend blocker read failure without freezing', async (): Promise<void> => {
    const harness = createHarness({
      getLegendBlocker: vi.fn((): string | null => {
        throw new Error('legend validation exploded');
      }),
    });

    const outcome = await createCompositionExportTransaction(
      harness.dependencies,
    ).run();

    expect(outcome).toEqual({ ok: false, reason: 'preparation-failed' });
    expect(harness.dependencies.setBusy).not.toHaveBeenCalled();
  });

  it('survives a throwing status callback with the lease already released', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    const consoleError = vi
      .spyOn(globalThis.console, 'error')
      .mockImplementation((): void => undefined);
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => probe.handle),
        onOutcome: vi.fn((): void => {
          calls.push('outcome:throws');
          throw new Error('toast region unmounted');
        }),
      },
      calls,
    );
    const transaction = createCompositionExportTransaction(
      harness.dependencies,
    );

    const outcome = await transaction.run();

    expect(outcome).toMatchObject({ ok: true });
    expect(calls.indexOf('visible:release')).toBeLessThan(
      calls.indexOf('outcome:throws'),
    );
    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
    expect(harness.busyStates).toEqual([true, false]);
    expect(consoleError).toHaveBeenCalledOnce();

    await transaction.run();
    expect(probe.handle.freezeAndSnapshot).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it('survives a throwing busy-lock callback without stranding the activation lock', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    const consoleError = vi
      .spyOn(globalThis.console, 'error')
      .mockImplementation((): void => undefined);
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => probe.handle),
        setBusy: vi.fn((isBusy: boolean): void => {
          calls.push(`busy:${String(isBusy)}`);
          if (!isBusy) {
            throw new Error('unmounted before the busy flag cleared');
          }
        }),
      },
      calls,
    );
    const transaction = createCompositionExportTransaction(
      harness.dependencies,
    );

    await transaction.run();

    expect(probe.leases[0]?.effectiveReleaseCount).toBe(1);
    await transaction.run();
    expect(probe.handle.freezeAndSnapshot).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('tolerates a second release of the same lease', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    const harness = createHarness(
      { getMapCanvasHandle: vi.fn(() => probe.handle) },
      calls,
    );

    await createCompositionExportTransaction(harness.dependencies).run();

    const lease = probe.leases[0];
    expect(lease?.effectiveReleaseCount).toBe(1);
    expect((): void => lease?.lease.release()).not.toThrow();
    expect(lease?.releaseCallCount).toBe(2);
    expect(lease?.effectiveReleaseCount).toBe(1);
  });

  it('leaves the frozen camera as the state an immediate save reads', async (): Promise<void> => {
    const calls: string[] = [];
    const probe = createHandleProbe('visible', calls);
    let compositionCamera: CameraState = LIVE_CAMERA;
    const camerasSeenDuringCapture: CameraState[] = [];
    const harness = createHarness(
      {
        getMapCanvasHandle: vi.fn(() => probe.handle),
        commitCamera: vi.fn((camera: CameraState): void => {
          compositionCamera = camera;
        }),
        exportMap: vi.fn(async (): Promise<ExportResult> => {
          camerasSeenDuringCapture.push(compositionCamera);
          return { ok: true, filename: 'frozen.png' };
        }),
      },
      calls,
    );

    await createCompositionExportTransaction(harness.dependencies).run();

    expect(camerasSeenDuringCapture).toEqual([FROZEN_CAMERA]);
    expect(compositionCamera).toEqual(FROZEN_CAMERA);
  });
});
