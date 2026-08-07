import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import { STORAGE_KEY } from '../constants/config';
import type { SavedMapSummary } from '../types/ui';
import { customColor } from '../utils/colors';
import { createStorageAdapter, isWholeWorldCamera } from '../utils/storage';
import type { CompositionSaveFailureReason } from '../hooks/useCompositionSaveTransaction';
import {
  getLegendEntrySummary,
  getLoadFeedback,
  getSaveFailureMessage,
  getPeriodShortLabel,
  getSavedMapMetadata,
} from './SaveLoad';
import { ToastRegion } from './ToastRegion';

/**
 * The ids the approved manifest yields today: exactly `modern`. The catalog
 * itself holds five label entries, which is the whole point of the resolver
 * filter (OPEN ITEM 4).
 */
const APPROVED_MODERN_ONLY: ReadonlySet<string> = new Set(['modern']);

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
      value: { FRA: customColor('#123456') },
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
      value: { FRA: customColor('#123456') },
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

describe('SaveLoad save failure messages', () => {
  const reasons: ReadonlyArray<CompositionSaveFailureReason> = [
    'invalid-name',
    'name-too-long',
    'quota-exceeded',
    'map-not-found',
    'map-canvas-unavailable',
    'storage-unavailable',
  ];

  it('never reports a save failure with load copy', () => {
    reasons.forEach((reason): void => {
      const message = getSaveFailureMessage(reason);
      expect(message).not.toContain('loaded');
      expect(message).not.toContain('could not be loaded');
    });

    // The two reasons the dialog previously mislabelled. The retry names the
    // control that exists: the panel's submit is `Save Map` (UI-SPEC copy).
    expect(getSaveFailureMessage('map-canvas-unavailable')).toBe(
      'This map could not be saved and nothing was written. Try Save Map again.',
    );
    expect(getSaveFailureMessage('map-not-found')).toBe(
      'This saved map is no longer available. The saved-map list has been refreshed.',
    );
  });

  it('keeps every save failure class distinguishable', () => {
    const messages = reasons.map(getSaveFailureMessage);

    expect(new Set(messages).size).toBe(reasons.length);
    messages.forEach((message): void => {
      expect(message.length).toBeGreaterThan(0);
    });
  });
});

describe('SaveLoad saved-row metadata', () => {
  it('builds the exact period, legend, and view metadata line', () => {
    expect(getSavedMapMetadata(createSummary(), APPROVED_MODERN_ONLY)).toBe(
      'Modern · 2 legend entries · Whole world view',
    );
    expect(
      getSavedMapMetadata(
        createSummary({ legendEntryCount: 1, isWholeWorldView: false }),
        APPROVED_MODERN_ONLY,
      ),
    ).toBe('Modern · 1 legend entry · Custom view');
    expect(
      getSavedMapMetadata(
        createSummary({ legendEntryCount: 0 }),
        APPROVED_MODERN_ONLY,
      ),
    ).toBe('Modern · No legend entries · Whole world view');
  });

  it('uses the legacy line for V1 records only', () => {
    const legacyCopy = 'Legacy map · Opens with modern borders and whole-world view';

    expect(
      getSavedMapMetadata(
        createSummary({ sourceVersion: 1, snapshotId: null }),
        APPROVED_MODERN_ONLY,
      ),
    ).toBe(legacyCopy);
  });

  /*
   * OPEN ITEM 4. The storage validator admits any of the five catalog ids, so
   * a hand-crafted record carrying `"snapshotId": "1914"` VALIDATES - and
   * without this filter the label registry would name a deferred period on
   * its row. A V2 record with an unapproved period is not a legacy map either
   * (it does not open with modern borders; loading it refuses), so the row
   * keeps its real metadata and simply renders no period label.
   */
  it('renders no period label for a stored id the approved manifest does not yield', () => {
    expect(
      getSavedMapMetadata(
        createSummary({ snapshotId: '1914' }),
        APPROVED_MODERN_ONLY,
      ),
    ).toBe('2 legend entries · Whole world view');
    expect(
      getSavedMapMetadata(
        createSummary({
          snapshotId: 'not-a-catalog-period' as SavedMapSummary['snapshotId'],
        }),
        APPROVED_MODERN_ONLY,
      ),
    ).toBe('2 legend entries · Whole world view');
  });

  it('shortens approved catalog labels to the period token, and only approved ones', () => {
    expect(getPeriodShortLabel('modern', APPROVED_MODERN_ONLY)).toBe('Modern');
    // The filter is the subject: the same id resolves once approved and not
    // before, so the null below is the filter working rather than a miss.
    expect(getPeriodShortLabel('1700', APPROVED_MODERN_ONLY)).toBeNull();
    expect(
      getPeriodShortLabel('1700', new Set(['modern', '1700'])),
    ).toBe('1700');
    expect(getPeriodShortLabel('1914', APPROVED_MODERN_ONLY)).toBeNull();
    // Approved but absent from the label registry still resolves to nothing:
    // the registry stays the only label source (T-02-40).
    expect(getPeriodShortLabel('9999', new Set(['9999']))).toBeNull();
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

/*
 * `restoreSaveLoadFocus` and its two tests retired WITH the modal dialog in
 * `03-07`: the opener-restore chain existed only because a modal moved focus
 * away from an opener that could disconnect across the 1200px transition. In
 * the panel, focus never leaves the document flow - confirmations restore
 * focus from effects keyed by stable row keys, and the tool panel's own close
 * handler returns focus to the rail row that opened it.
 */
