import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import { STORAGE_KEY } from '../constants/config';
import type { SavedMapSummary } from '../types/ui';
import { createStorageAdapter, isWholeWorldCamera } from '../utils/storage';
import {
  getLegendEntrySummary,
  getLoadFeedback,
  getPeriodShortLabel,
  getSavedMapMetadata,
  restoreSaveLoadFocus,
} from './SaveLoad';
import { ToastRegion } from './ToastRegion';

function createSummary(
  overrides: Partial<SavedMapSummary> = {},
): SavedMapSummary {
  return {
    name: 'Saved map',
    timestamp: 1_700_000_000_000,
    sourceVersion: 2,
    snapshotId: 'modern',
    legendEntryCount: 2,
    isWholeWorldView: true,
    ...overrides,
  };
}

class LoadFeedbackStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('SaveLoad load feedback', () => {
  it('reports a warning instead of success-only feedback for a valid subset load', () => {
    const storage = new LoadFeedbackStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Partially corrupt map',
          colors: { FRA: '#123456', DEU: 'not-a-color' },
          timestamp: 100,
        },
      ]),
    );

    const result = createStorageAdapter(storage).load(
      'Partially corrupt map',
      new Set(['FRA', 'DEU']),
    );

    expect(result).toEqual({
      ok: true,
      value: { FRA: '#123456' },
      warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
    });
    if (!result.ok) {
      throw new Error('Expected the valid subset to load.');
    }

    const feedback = getLoadFeedback([], result.warnings);
    expect(feedback).toEqual({
      message: 'Saved map loaded, but some invalid saved colors were omitted.',
      severity: 'warning',
    });

    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{ id: 'partial-load', ...feedback }}
        onDismiss={vi.fn()}
      />,
    );
    expect(markup).toContain('role="status"');
    expect(markup).toContain('data-severity="warning"');
    expect(markup).toContain(feedback.message);
  });

  it('uses success feedback when another saved record is corrupt', () => {
    const storage = new LoadFeedbackStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Clean map',
          colors: { FRA: '#123456' },
          timestamp: 200,
        },
        {
          name: 'Corrupt map',
          colors: { DEU: 'not-a-color' },
          timestamp: 100,
        },
      ]),
    );

    const result = createStorageAdapter(storage).load(
      'Clean map',
      new Set(['FRA', 'DEU']),
    );

    expect(result).toEqual({
      ok: true,
      value: { FRA: '#123456' },
      warnings: [],
    });
    if (!result.ok) {
      throw new Error('Expected the clean map to load.');
    }

    expect(getLoadFeedback([], result.warnings)).toEqual({
      message: 'Saved map loaded.',
      severity: 'success',
    });
  });

  it('surfaces legacy migration and repaired composition warnings', () => {
    expect(getLoadFeedback([{ code: 'legacy-migrated' }], [])).toEqual({
      message:
        'Older saved map loaded with a modern world view. Save it again to keep the full composition.',
      severity: 'warning',
    });
    expect(getLoadFeedback([{ code: 'composition-repaired' }], [])).toEqual({
      message:
        'Saved map loaded, but some unavailable settings were restored to safe defaults.',
      severity: 'warning',
    });
  });

  it('preserves composition and omitted-color warnings together', () => {
    const corruptWarnings = [{ code: 'corrupt-data', recordIndex: 0 }] as const;

    expect(
      getLoadFeedback([{ code: 'legacy-migrated' }], corruptWarnings),
    ).toEqual({
      message:
        'Older saved map loaded with a modern world view. Save it again to keep the full composition. Saved map loaded, but some invalid saved colors were omitted.',
      severity: 'warning',
    });
    expect(
      getLoadFeedback([{ code: 'composition-repaired' }], corruptWarnings),
    ).toEqual({
      message:
        'Saved map loaded, but some unavailable settings were restored to safe defaults. Saved map loaded, but some invalid saved colors were omitted.',
      severity: 'warning',
    });
  });

  it('uses success feedback only when the load has no warnings', () => {
    expect(getLoadFeedback([], [])).toEqual({
      message: 'Saved map loaded.',
      severity: 'success',
    });
  });
});

describe('SaveLoad saved-row metadata', () => {
  it('builds the exact period, legend, and view metadata line', () => {
    expect(getSavedMapMetadata(createSummary())).toBe(
      'Modern · 2 legend entries · Whole world view',
    );
    expect(
      getSavedMapMetadata(
        createSummary({ legendEntryCount: 1, isWholeWorldView: false }),
      ),
    ).toBe('Modern · 1 legend entry · Custom view');
    expect(
      getSavedMapMetadata(createSummary({ legendEntryCount: 0 })),
    ).toBe('Modern · No legend entries · Whole world view');
  });

  it('uses the legacy line for V1 records and for unknown periods', () => {
    const legacyCopy = 'Legacy map · Opens with modern borders and whole-world view';

    expect(
      getSavedMapMetadata(
        createSummary({ sourceVersion: 1, snapshotId: null }),
      ),
    ).toBe(legacyCopy);
    // A stored id outside the approved catalog can never be named as a period.
    expect(
      getSavedMapMetadata(
        createSummary({
          snapshotId: 'not-a-catalog-period' as SavedMapSummary['snapshotId'],
        }),
      ),
    ).toBe(legacyCopy);
  });

  it('shortens catalog labels to the period token only', () => {
    expect(getPeriodShortLabel('modern')).toBe('Modern');
    expect(getPeriodShortLabel('1700')).toBe('1700');
    expect(getPeriodShortLabel('9999')).toBeNull();
  });

  it('pluralizes the legend entry count', () => {
    expect(getLegendEntrySummary(0)).toBe('No legend entries');
    expect(getLegendEntrySummary(1)).toBe('1 legend entry');
    expect(getLegendEntrySummary(7)).toBe('7 legend entries');
  });

  it('treats a float-drifted reset camera as the whole world view', () => {
    expect(isWholeWorldCamera(INITIAL_WORLD_CAMERA)).toBe(true);
    expect(
      isWholeWorldCamera({
        zoom: 1.0000001,
        centerLongitude: 0.0000002,
        centerLatitude: -0.0000003,
      }),
    ).toBe(true);
    expect(
      isWholeWorldCamera({ zoom: 2, centerLongitude: 0, centerLatitude: 0 }),
    ).toBe(false);
    expect(
      isWholeWorldCamera({ zoom: 1, centerLongitude: 11, centerLatitude: 50 }),
    ).toBe(false);
  });
});

describe('SaveLoad summary projection', () => {
  it('describes stored records without exposing their colors', () => {
    const storage = new LoadFeedbackStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Custom view map',
          timestamp: 300,
          composition: {
            colors: { FRA: '#DC2626' },
            camera: { zoom: 2, centerLongitude: 11, centerLatitude: 50 },
            snapshotId: 'modern',
            legend: {
              entries: [{ color: '#DC2626', label: 'Visited', order: 0 }],
              position: { x: 64, y: 720, preset: null },
              theme: 'light',
              textSize: 'medium',
              backgroundOpacity: 85,
              borderStyle: 'hairline',
            },
            settings: { backgroundColor: '#FFFFFF' },
          },
        },
        {
          name: 'Legacy map',
          colors: { DEU: '#2563EB' },
          timestamp: 200,
        },
      ]),
    );

    const result = createStorageAdapter(storage).listSummaries();
    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: 'Custom view map',
          timestamp: 300,
          sourceVersion: 2,
          snapshotId: 'modern',
          legendEntryCount: 1,
          isWholeWorldView: false,
        },
        {
          name: 'Legacy map',
          timestamp: 200,
          sourceVersion: 1,
          snapshotId: null,
          legendEntryCount: 0,
          isWholeWorldView: true,
        },
      ],
      warnings: [],
    });
    if (!result.ok) {
      throw new Error('Expected both records to be summarized.');
    }
    expect(
      result.value.some((summary): boolean => 'colors' in summary),
    ).toBe(false);
    // Reading the list must never rewrite the stored V1 record.
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toHaveLength(2);
    expect(
      (JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as Array<
        Record<string, unknown>
      >)[1],
    ).toEqual({ name: 'Legacy map', colors: { DEU: '#2563EB' }, timestamp: 200 });
  });
});

describe('SaveLoad focus restoration', () => {
  it('focuses the current responsive control when the original opener disconnected', () => {
    const originalOpener = { isConnected: false, focus: vi.fn() };
    const currentControl = { isConnected: true, focus: vi.fn() };
    const focusMap = vi.fn();

    restoreSaveLoadFocus(originalOpener, currentControl, focusMap);

    expect(originalOpener.focus).not.toHaveBeenCalled();
    expect(currentControl.focus).toHaveBeenCalledOnce();
    expect(focusMap).not.toHaveBeenCalled();
  });

  it('falls back to the map when neither control is connected', () => {
    const originalOpener = { isConnected: false, focus: vi.fn() };
    const currentControl = { isConnected: false, focus: vi.fn() };
    const focusMap = vi.fn();

    restoreSaveLoadFocus(originalOpener, currentControl, focusMap);

    expect(originalOpener.focus).not.toHaveBeenCalled();
    expect(currentControl.focus).not.toHaveBeenCalled();
    expect(focusMap).toHaveBeenCalledOnce();
  });
});
