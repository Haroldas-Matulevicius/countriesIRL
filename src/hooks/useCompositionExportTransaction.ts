import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type {
  CameraFreezeLease,
  CameraState,
  MapCanvasHandle,
} from '../types/composition';
import type { ExportFailureReason, ExportResult } from '../types/ui';
import { exportMapPng } from '../utils/export';

export type CompositionExportFailureReason =
  | ExportFailureReason
  | 'already-active'
  | 'map-canvas-unavailable'
  | 'export-source-unavailable'
  | 'preparation-failed'
  | 'export-failed';

export type CompositionExportTransactionOutcome =
  | { readonly ok: true; readonly filename: string }
  | {
      readonly ok: false;
      readonly reason: 'legend-blocked';
      /** The blocking condition itself, already phrased for the creator. */
      readonly message: string;
    }
  /**
   * D4-15. The same shape as `legend-blocked` and for the same reason: a
   * synchronous refusal decided BEFORE any work begins, carrying the sentence
   * the creator can act on. It is deliberately NOT an `ExportFailureReason` -
   * Phase 4 adds no variant to that union, because a refusal is a different
   * thing from a failure.
   */
  | {
      readonly ok: false;
      readonly reason: 'text-blocked';
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly reason: CompositionExportFailureReason;
    };

export interface CompositionExportTransactionDependencies {
  readonly getMapCanvasHandle: () => MapCanvasHandle | null;
  readonly getLegendBlocker: () => string | null;
  /**
   * D4-15. Read in the SAME place as the legend blocker - before a lease, a
   * busy lock, or a clone - so an over-long title costs the creator nothing but
   * a message. Required rather than optional: a caller that forgot to pass it
   * would export a PNG with clipped type and no error anywhere.
   */
  readonly getCompositionTextBlocker: () => string | null;
  readonly getCompositionName?: () => string | undefined;
  readonly commitCamera: (camera: CameraState) => void;
  readonly setBusy: (isBusy: boolean) => void;
  readonly exportMap?: (
    source: HTMLElement,
    mapName?: string,
  ) => Promise<ExportResult>;
  readonly onOutcome?: (outcome: CompositionExportTransactionOutcome) => void;
}

/** The hook owns the busy lock, so its callers never supply `setBusy`. */
export type UseCompositionExportTransactionOptions = Omit<
  CompositionExportTransactionDependencies,
  'setBusy'
>;

export interface CompositionExportTransaction {
  run(): Promise<CompositionExportTransactionOutcome>;
  isActive(): boolean;
}

export interface UseCompositionExportTransactionValue {
  readonly isExporting: boolean;
  readonly exportPng: () => Promise<CompositionExportTransactionOutcome>;
}

function captureWithDefaultExporter(
  source: HTMLElement,
  mapName?: string,
): Promise<ExportResult> {
  return exportMapPng(source, new Date(), mapName);
}

/**
 * The camera lease and the busy lock are owned here, never by the caller. Every
 * exit - refusal, throw, capture failure, success - passes through one outermost
 * `finally`, because a single escaping path leaves the camera frozen and the
 * Export button disabled for the rest of the session.
 */
export function createCompositionExportTransaction(
  dependencies: CompositionExportTransactionDependencies,
): CompositionExportTransaction {
  let isActive = false;

  const report = (
    outcome: CompositionExportTransactionOutcome,
  ): CompositionExportTransactionOutcome => {
    try {
      dependencies.onOutcome?.(outcome);
    } catch (error) {
      globalThis.console.error(
        'CountriesIRL could not report the export outcome.',
        error,
      );
    }
    return outcome;
  };

  return {
    isActive: (): boolean => isActive,
    run: async (): Promise<CompositionExportTransactionOutcome> => {
      // Synchronous, before any await: two clicks in the same task must not
      // both reach freezeAndSnapshot.
      if (isActive) {
        return { ok: false, reason: 'already-active' };
      }

      let mapCanvasHandle: MapCanvasHandle | null;
      try {
        const legendBlocker = dependencies.getLegendBlocker();
        if (legendBlocker !== null) {
          // Not the generic export failure: no lease was taken, and retrying
          // re-enters this same refusal until the creator edits the legend.
          return report({
            ok: false,
            reason: 'legend-blocked',
            message: legendBlocker,
          });
        }
        /*
         * D4-15, immediately after the legend and for identical reasons. The
         * legend is checked first so that a composition failing both reports
         * one message deterministically rather than whichever the reader
         * happened to run.
         */
        const textBlocker = dependencies.getCompositionTextBlocker();
        if (textBlocker !== null) {
          return report({
            ok: false,
            reason: 'text-blocked',
            message: textBlocker,
          });
        }
        mapCanvasHandle = dependencies.getMapCanvasHandle();
      } catch {
        return report({ ok: false, reason: 'preparation-failed' });
      }

      if (mapCanvasHandle === null) {
        return report({ ok: false, reason: 'map-canvas-unavailable' });
      }

      // The handle is resolved once per activation and never re-read: a canvas
      // rebound mid-export must not receive the release for a lease it never
      // issued.
      const handle = mapCanvasHandle;
      isActive = true;
      let lease: CameraFreezeLease | null = null;
      let hasCaptureStarted = false;
      let outcome: CompositionExportTransactionOutcome;

      try {
        dependencies.setBusy(true);
        lease = handle.freezeAndSnapshot();
        // Committed before the clone so the capture, an immediate save, and a
        // responsive remount all read the same frozen semantic camera.
        dependencies.commitCamera(lease.camera);
        // Export captures the selected scene only: a crossfade still in flight
        // would otherwise bake a half-faded predecessor into the PNG.
        handle.finalizeSelectedScene();
        const exportSource = handle.getExportSource();
        if (exportSource === null) {
          outcome = { ok: false, reason: 'export-source-unavailable' };
        } else {
          hasCaptureStarted = true;
          const capture = await (dependencies.exportMap ??
            captureWithDefaultExporter)(
            exportSource,
            dependencies.getCompositionName?.(),
          );
          outcome = capture.ok
            ? { ok: true, filename: capture.filename }
            : { ok: false, reason: capture.reason };
        }
      } catch {
        outcome = {
          ok: false,
          reason: hasCaptureStarted ? 'export-failed' : 'preparation-failed',
        };
      } finally {
        isActive = false;
        try {
          lease?.release();
        } catch (error) {
          globalThis.console.error(
            'CountriesIRL could not release the camera freeze lease.',
            error,
          );
        }
        try {
          dependencies.setBusy(false);
        } catch (error) {
          globalThis.console.error(
            'CountriesIRL could not clear the export busy lock.',
            error,
          );
        }
      }

      return report(outcome);
    },
  };
}

export function useCompositionExportTransaction(
  options: UseCompositionExportTransactionOptions,
): UseCompositionExportTransactionValue {
  const [isExporting, setIsExporting] = useState(false);
  const optionsRef = useRef(options);
  const transactionRef = useRef<CompositionExportTransaction | null>(null);

  useLayoutEffect((): void => {
    optionsRef.current = options;
  });

  // Created on first activation and kept for the lifetime of the owner. A
  // transaction rebuilt on a dependency change would carry a fresh activation
  // lock and let a second export start while the first still holds the camera
  // lease, so every dependency is read through the ref instead.
  const exportPng = useCallback(
    (): Promise<CompositionExportTransactionOutcome> => {
      transactionRef.current ??= createCompositionExportTransaction({
        getMapCanvasHandle: (): MapCanvasHandle | null =>
          optionsRef.current.getMapCanvasHandle(),
        getLegendBlocker: (): string | null =>
          optionsRef.current.getLegendBlocker(),
        getCompositionTextBlocker: (): string | null =>
          optionsRef.current.getCompositionTextBlocker(),
        getCompositionName: (): string | undefined =>
          optionsRef.current.getCompositionName?.(),
        commitCamera: (camera): void => {
          optionsRef.current.commitCamera(camera);
        },
        setBusy: setIsExporting,
        exportMap: (source, mapName): Promise<ExportResult> =>
          (optionsRef.current.exportMap ?? captureWithDefaultExporter)(
            source,
            mapName,
          ),
        onOutcome: (outcome): void => {
          optionsRef.current.onOutcome?.(outcome);
        },
      });
      return transactionRef.current.run();
    },
    [],
  );

  return { isExporting, exportPng };
}
