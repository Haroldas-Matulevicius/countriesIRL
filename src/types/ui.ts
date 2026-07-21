import type { ColorMap } from './map';

export interface ColorPreset {
  name: string;
  value: string;
}

export type ColorNormalizationError =
  | 'empty-input'
  | 'invalid-format'
  | 'channel-out-of-range';

export type ColorNormalizationResult =
  | { ok: true; value: string }
  | { ok: false; reason: ColorNormalizationError };

export interface SavedMap {
  name: string;
  colors: ColorMap;
  timestamp: number;
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
  | 'capture-failed'
  | 'invalid-dimensions'
  | 'encoding-failed';

export type ExportResult =
  | { ok: true; filename: string }
  | { ok: false; reason: ExportFailureReason };
