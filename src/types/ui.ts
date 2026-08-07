import type { LegacySavedComposition, SnapshotId } from './composition';

/**
 * A water/background preset pill.
 *
 * It used to sit beside a structurally identical `ColorPreset`, kept separate
 * on purpose because the two sets answered to different gates. `04-07` deleted
 * `ColorPreset` with the ten-tile country-colour grid it typed (D4-01: the ramp
 * model replaces the presets), so only the gated one is left. The reason it was
 * ever separate still holds and is why it is not renamed to something generic:
 * a composition surface must clear `MIN_COMPOSITION_SURFACE_LUMINANCE`, and a
 * type that also accepted an ungated country colour would make it possible to
 * pass one where the other is gated.
 */
/**
 * A named colour choice in one of the `Map style` pill rows. `04-08` added the
 * uncoloured-fill and border-colour rows, which are the same shape as `04-01`'s
 * water row; one interface rather than three identical ones.
 */
export interface MapStyleColorPreset {
  readonly name: string;
  readonly value: string;
}

/** The water row's name for the shape above. Kept because `04-01` shipped it. */
export type WaterPreset = MapStyleColorPreset;

export type ColorNormalizationError =
  | 'empty-input'
  | 'invalid-format'
  | 'channel-out-of-range';

export type ColorNormalizationResult =
  | { ok: true; value: string }
  | { ok: false; reason: ColorNormalizationError };

export type SavedMap = LegacySavedComposition;

/**
 * The four rail tools (D-16). The rail's open state is one of these or closed,
 * and exactly one may be open at a time (D-17).
 *
 * Declared here rather than beside the rail components so `utils/storage.ts`
 * can validate a stored id without importing a component module - the adapter
 * is the boundary, and a boundary that depends on the UI it persists for is not
 * one.
 */
export type ToolId =
  | 'colors'
  | 'map-style'
  | 'countries'
  | 'legend'
  | 'saved';

/**
 * D-30. An explicit creator choice written as a class on the editor mount root,
 * persisted through `StorageAdapter`, defaulting to `light` when the key is
 * absent. It is never derived from an operating-system colour preference - not
 * even to seed a first run.
 */
export type EditorThemeMode = 'light' | 'dark';

/**
 * Row-level description of a stored record. Saved-map rows must never read the
 * stored colors, so the list surface gets this projection instead of `SavedMap`.
 */
export interface SavedMapSummary {
  readonly name: string;
  readonly timestamp: number;
  readonly sourceVersion: 1 | 2 | 3;
  readonly snapshotId: SnapshotId | null;
  readonly legendEntryCount: number;
  readonly isWholeWorldView: boolean;
}

export type StorageWarningCode = 'corrupt-data';

export interface StorageWarning {
  code: StorageWarningCode;
  recordIndex?: number;
}

export type StorageErrorReason =
  | 'invalid-name'
  | 'name-too-long'
  | 'map-not-found'
  | 'quota-exceeded'
  | 'storage-unavailable';

export type StorageResult<T = undefined> =
  | {
      ok: true;
      value: T;
      warnings: ReadonlyArray<StorageWarning>;
    }
  | {
      ok: false;
      reason: StorageErrorReason;
    };

export type ToastMessage =
  | {
      id: string;
      severity: 'success' | 'info' | 'warning';
      message: string;
    }
  | {
      id: string;
      severity: 'error';
      message: string;
      retry?: () => void;
    };

export type ExportFailureReason =
  | 'source-not-found'
  | 'invalid-composition'
  | 'capture-failed'
  | 'invalid-dimensions'
  | 'encoding-failed';

export type ExportResult =
  | { ok: true; filename: string }
  | { ok: false; reason: ExportFailureReason };
