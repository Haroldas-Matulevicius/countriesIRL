import { describe, expect, it, vi } from 'vitest';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import {
  LAST_OPEN_TOOL_KEY,
  MAX_MAP_NAME_LENGTH,
  MAX_PREFERENCE_VALUE_LENGTH,
  ONBOARDING_DISMISSED_KEY,
  STORAGE_KEY,
  THEME_MODE_KEY,
} from '../constants/config';
import type {
  CompositionLoadOutcome,
  CompositionSnapshot,
  SnapshotId,
  VisibleCompositionSettings,
} from '../types/composition';
import { DEFAULT_COMPOSITION_SETTINGS } from '../constants/mapStyle';
import type { ColorMap } from '../types/map';
import type { SavedMap, StorageResult } from '../types/ui';
import { BAND_MAX_HEIGHT } from './bands';
import { repairCameraState } from './camera';
import { customColor, rampColor } from './colors';
import {
  MAX_COMPOSITION_TEXT_LENGTH,
  MAX_LEGEND_CAPTION_LENGTH,
  characterBoundFor,
} from './compositionText';
import { createDefaultLegendState, reconcileLegend } from './legend';
import {
  MAX_STORAGE_JSON_DEPTH,
  MAX_STORAGE_JSON_NODES,
  MAX_STORAGE_SERIALIZED_LENGTH,
  createStorageAdapter,
} from './storage';

class FakeStorage implements Storage {
  readonly values = new Map<string, string>();
  getError: unknown;
  setError: unknown;
  setCalls = 0;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    if (this.getError !== undefined) {
      throw this.getError;
    }

    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;

    if (this.setError !== undefined) {
      throw this.setError;
    }

    this.values.set(key, value);
  }
}

function createCompositionSnapshot(
  colors: ColorMap = { FRA: customColor('#2563EB') },
  snapshotId: SnapshotId = 'modern',
): CompositionSnapshot {
  return {
    colors,
    camera: {
      zoom: 3,
      centerLongitude: 12.5,
      centerLatitude: 48.25,
    },
    snapshotId,
    legend: {
      entries: [
        { color: '#2563EB', label: 'Visited', order: 0 },
        { color: '#DC2626', label: 'Planned', order: 1 },
      ],
      position: { x: 720, y: 64, preset: 'top-right' },
      textSize: 'large',
      form: null,
      caption: '',
      showNoData: false,
    },
    settings: DEFAULT_COMPOSITION_SETTINGS,
  };
}

/**
 * The V3 `settings` WIRE shape — every Phase 4 field, and deliberately NOT
 * `backgroundColor`, which V3 does not persist. Spelled out here rather than
 * derived from `DEFAULT_COMPOSITION_SETTINGS` minus a key: a derivation would
 * follow the serializer if the serializer started dropping a field, and then
 * the assertion would agree with the bug.
 */
function expectedStoredSettings(): Record<string, unknown> {
  return {
    surfaceColor: '#FFFFFF',
    uncoloredFill: '#E5E7EB',
    borderColor: '#000000',
    interiorWeight: 'thin',
    coastlineWeight: 'none',
    topBandVisible: true,
    topBandHeight: 120,
    bottomBandVisible: false,
    bottomBandHeight: 120,
    title: '',
    titleSize: 'medium',
    subtitle: '',
    subtitleSize: 'medium',
    attribution: '',
    textAlignment: 'left',
  };
}

function expectSuccess<T>(result: { ok: true; value: T } | { ok: false }): asserts result is {
  ok: true;
  value: T;
} {
  expect(result.ok).toBe(true);
}

describe('createStorageAdapter', () => {
  it('lists an empty store successfully', () => {
    const storage = new FakeStorage();
    const result = createStorageAdapter(storage).list();

    expect(result).toEqual({ ok: true, value: [], warnings: [] });
  });

  it('trims names, prepends saves, and normalizes persisted colors', () => {
    const storage = new FakeStorage();
    const timestamps = [100, 200];
    const adapter = createStorageAdapter(storage, () => timestamps.shift() ?? 300);

    const first = adapter.save(
      '  First map  ',
      createCompositionSnapshot({ FRA: customColor('#abc') }),
    );
    const second = adapter.save(
      'Second map',
      createCompositionSnapshot({ DEU: customColor('rgb(1, 2, 3)') }),
    );

    expect(first).toMatchObject({
      ok: true,
      value: {
        replaced: false,
        savedMap: {
          name: 'First map',
          colors: { FRA: customColor('#AABBCC') },
          timestamp: 100,
        },
      },
    });
    expect(second).toMatchObject({
      ok: true,
      value: {
        replaced: false,
        savedMaps: [
          {
            name: 'Second map',
            colors: { DEU: customColor('#010203') },
            timestamp: 200,
          },
          {
            name: 'First map',
            colors: { FRA: customColor('#AABBCC') },
            timestamp: 100,
          },
        ],
      },
    });
  });

  it('omits effective-white entries when saving and loading maps', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage, () => 100);

    expect(
      adapter.save(
        'White is default',
        createCompositionSnapshot({
          FRA: customColor('#FFFFFF'),
          DEU: customColor('#ffffff'),
          ITA: customColor('#16A34A'),
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {
        savedMap: { colors: { ITA: customColor('#16A34A') } },
      },
    });
    expect(
      adapter.load('White is default', new Set(['FRA', 'DEU', 'ITA'])),
    ).toEqual({
      ok: true,
      value: { ITA: customColor('#16A34A') },
      warnings: [],
    });
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects reserved color-map ID %s at save and load boundaries',
    (reservedId) => {
      const saveStorage = new FakeStorage();
      const ownReservedColors = JSON.parse(
        `{"${reservedId}":{"kind":"custom","hex":"#2563EB"}}`,
      ) as ColorMap;

      expect(
        createStorageAdapter(saveStorage, () => 100).save(
          'Reserved save',
          createCompositionSnapshot(ownReservedColors),
        ),
      ).toMatchObject({
        ok: true,
        value: { savedMap: { colors: {} } },
        warnings: [{ code: 'corrupt-data' }],
      });

      const loadStorage = new FakeStorage();
      loadStorage.setItem(
        STORAGE_KEY,
        `[{"name":"Reserved load","colors":{"${reservedId}":"#2563EB","FRA":"#DC2626"},"timestamp":100}]`,
      );

      expect(
        createStorageAdapter(loadStorage).load(
          'Reserved load',
          new Set([reservedId, 'FRA']),
        ),
      ).toEqual({
        ok: true,
        value: { FRA: customColor('#DC2626') },
        warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
      });
    },
  );

  it('replaces an exact trimmed-name match and moves it to newest', () => {
    const storage = new FakeStorage();
    const timestamps = [100, 200, 300];
    const adapter = createStorageAdapter(storage, () => timestamps.shift() ?? 400);

    adapter.save('Alpha', createCompositionSnapshot({ FRA: customColor('#111111') }));
    adapter.save('Beta', createCompositionSnapshot({ DEU: customColor('#222222') }));
    const result = adapter.save(
      '  Alpha ',
      createCompositionSnapshot({ ITA: customColor('#333333') }),
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        replaced: true,
        savedMaps: [
          { name: 'Alpha', colors: { ITA: customColor('#333333') }, timestamp: 300 },
          { name: 'Beta', colors: { DEU: customColor('#222222') }, timestamp: 200 },
        ],
      },
    });
  });

  it.each([
    ['', 'invalid-name'],
    ['   ', 'invalid-name'],
    ['x'.repeat(MAX_MAP_NAME_LENGTH + 1), 'name-too-long'],
  ] as const)('rejects invalid map name %j', (name, reason) => {
    const storage = new FakeStorage();
    const result = createStorageAdapter(storage).save(
      name,
      createCompositionSnapshot({ FRA: customColor('#123456') }),
    );

    expect(result).toEqual({ ok: false, reason });
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('caps saved maps at ten by dropping the oldest', () => {
    const storage = new FakeStorage();
    let timestamp = 0;
    const adapter = createStorageAdapter(storage, () => {
      timestamp += 1;
      return timestamp;
    });

    for (let index = 1; index <= 11; index += 1) {
      adapter.save(
        `Map ${index}`,
        createCompositionSnapshot({ FRA: customColor('#123456') }),
      );
    }

    const result = adapter.list();
    expectSuccess(result);
    expect(result.value).toHaveLength(10);
    expect(result.value.map((map) => map.name)).toEqual([
      'Map 11',
      'Map 10',
      'Map 9',
      'Map 8',
      'Map 7',
      'Map 6',
      'Map 5',
      'Map 4',
      'Map 3',
      'Map 2',
    ]);
  });

  it('loads only normalized colors for current valid country IDs', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Imported map',
          colors: {
            FRA: '#abc',
            DEU: 'rgb(10, 20, 30)',
            ESP: 'not-a-color',
            STALE: '#123456',
          },
          timestamp: 100,
        },
      ]),
    );

    const result = createStorageAdapter(storage).load(
      'Imported map',
      new Set(['FRA', 'DEU', 'ESP']),
    );

    expect(result).toEqual({
      ok: true,
      value: { FRA: customColor('#AABBCC'), DEU: customColor('#0A141E') },
      warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
    });
  });

  it('returns load warnings only for the selected record', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { name: 'Clean map', colors: { FRA: '#123456' }, timestamp: 200 },
        { name: 'Corrupt map', colors: { DEU: 'not-a-color' }, timestamp: 100 },
      ]),
    );

    const adapter = createStorageAdapter(storage);

    expect(adapter.list()).toEqual({
      ok: true,
      value: [
        { name: 'Clean map', colors: { FRA: customColor('#123456') }, timestamp: 200 },
        { name: 'Corrupt map', colors: {}, timestamp: 100 },
      ],
      warnings: [{ code: 'corrupt-data', recordIndex: 1 }],
    });
    expect(adapter.load('Clean map', new Set(['FRA', 'DEU']))).toEqual({
      ok: true,
      value: { FRA: customColor('#123456') },
      warnings: [],
    });
    expect(adapter.load('Corrupt map', new Set(['FRA', 'DEU']))).toEqual({
      ok: true,
      value: {},
      warnings: [{ code: 'corrupt-data', recordIndex: 1 }],
    });
  });

  it('warns when stale country IDs are removed from the selected map', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Stale map',
          colors: { FRA: '#123456', RETIRED: '#654321' },
          timestamp: 100,
        },
      ]),
    );

    expect(createStorageAdapter(storage).load('Stale map', new Set(['FRA']))).toEqual({
      ok: true,
      value: { FRA: customColor('#123456') },
      warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
    });
  });

  it('deduplicates exact and trim-equivalent names before load or delete', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { name: 'Alpha', colors: { FRA: '#111111' }, timestamp: 300 },
        { name: ' Alpha ', colors: { DEU: '#222222' }, timestamp: 200 },
        { name: 'Alpha', colors: { ITA: '#333333' }, timestamp: 100 },
        { name: 'Beta', colors: { ESP: '#444444' }, timestamp: 50 },
      ]),
    );

    const adapter = createStorageAdapter(storage);

    expect(adapter.list()).toEqual({
      ok: true,
      value: [
        { name: 'Alpha', colors: { FRA: customColor('#111111') }, timestamp: 300 },
        { name: 'Beta', colors: { ESP: customColor('#444444') }, timestamp: 50 },
      ],
      warnings: [
        { code: 'corrupt-data', recordIndex: 1 },
        { code: 'corrupt-data', recordIndex: 2 },
      ],
    });
    expect(adapter.load(' Alpha ', new Set(['FRA', 'DEU', 'ITA']))).toEqual({
      ok: true,
      value: { FRA: customColor('#111111') },
      warnings: [],
    });
    expect(adapter.delete('  Alpha ')).toEqual({
      ok: true,
      value: [
        { name: 'Beta', colors: { ESP: customColor('#444444') }, timestamp: 50 },
      ],
      warnings: [
        { code: 'corrupt-data', recordIndex: 1 },
        { code: 'corrupt-data', recordIndex: 2 },
      ],
    });
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toEqual([
      { name: 'Beta', colors: { ESP: '#444444' }, timestamp: 50 },
    ]);
    expect(adapter.delete('Missing')).toEqual({ ok: false, reason: 'map-not-found' });
  });

  it('omits malformed JSON with a warning instead of throwing', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{not valid json');

    expect(createStorageAdapter(storage).list()).toEqual({
      ok: true,
      value: [],
      warnings: [{ code: 'corrupt-data' }],
    });
  });

  it('omits malformed records and color entries while preserving valid records', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { name: 'Valid', colors: { FRA: '#123456' }, timestamp: 300 },
        { name: '', colors: { DEU: '#222222' }, timestamp: 200 },
        { name: 'Partial', colors: { ITA: '#abc', ESP: 'bad' }, timestamp: 100 },
        { name: 'Bad colors', colors: null, timestamp: 50 },
      ]),
    );

    const result = createStorageAdapter(storage).list();

    expect(result).toEqual({
      ok: true,
      value: [
        { name: 'Valid', colors: { FRA: customColor('#123456') }, timestamp: 300 },
        { name: 'Partial', colors: { ITA: customColor('#AABBCC') }, timestamp: 100 },
      ],
      warnings: [
        { code: 'corrupt-data', recordIndex: 1 },
        { code: 'corrupt-data', recordIndex: 2 },
        { code: 'corrupt-data', recordIndex: 3 },
      ],
    });
  });

  it('distinguishes quota failures from other unavailable writes', () => {
    const quotaStorage = new FakeStorage();
    const quotaError = new Error('full');
    quotaError.name = 'QuotaExceededError';
    quotaStorage.setError = quotaError;

    const blockedStorage = new FakeStorage();
    blockedStorage.setError = new DOMException('blocked', 'SecurityError');

    expect(
      createStorageAdapter(quotaStorage).save(
        'Map',
        createCompositionSnapshot({ FRA: customColor('#123456') }),
      ),
    ).toEqual({
      ok: false,
      reason: 'quota-exceeded',
    });
    expect(
      createStorageAdapter(blockedStorage).save(
        'Map',
        createCompositionSnapshot({ FRA: customColor('#123456') }),
      ),
    ).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
  });

  it('reports unavailable reads and a missing storage implementation explicitly', () => {
    const blockedStorage = new FakeStorage();
    blockedStorage.getError = new DOMException('blocked', 'SecurityError');

    expect(createStorageAdapter(blockedStorage).list()).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
    expect(createStorageAdapter(null).list()).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
  });

  it('stores onboarding dismissal independently and reads false when absent', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    expect(adapter.getOnboardingDismissed()).toEqual({ ok: true, value: false, warnings: [] });
    expect(adapter.dismissOnboarding()).toEqual({ ok: true, value: true, warnings: [] });
    expect(storage.getItem(ONBOARDING_DISMISSED_KEY)).toBe('true');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(adapter.getOnboardingDismissed()).toEqual({ ok: true, value: true, warnings: [] });
  });

  it('reports unavailable onboarding reads and writes', () => {
    const readBlocked = new FakeStorage();
    readBlocked.getError = new DOMException('blocked', 'SecurityError');
    const writeBlocked = new FakeStorage();
    writeBlocked.setError = new DOMException('blocked', 'SecurityError');

    expect(createStorageAdapter(readBlocked).getOnboardingDismissed()).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
    expect(createStorageAdapter(writeBlocked).dismissOnboarding()).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
  });

  it('rejects oversized serialized input before invoking the injected parser', () => {
    const storage = new FakeStorage();
    const parser = vi.fn((serialized: string): unknown => JSON.parse(serialized));
    storage.values.set(
      STORAGE_KEY,
      `[]${' '.repeat(MAX_STORAGE_SERIALIZED_LENGTH - 1)}`,
    );

    expect(createStorageAdapter(storage, Date.now, parser).list()).toEqual({
      ok: true,
      value: [],
      warnings: [{ code: 'corrupt-data' }],
    });
    expect(parser).not.toHaveBeenCalled();
  });

  it('accepts boundary-valid serialized input and invokes the parser once', () => {
    const storage = new FakeStorage();
    const parser = vi.fn((serialized: string): unknown => JSON.parse(serialized));
    storage.values.set(
      STORAGE_KEY,
      `[]${' '.repeat(MAX_STORAGE_SERIALIZED_LENGTH - 2)}`,
    );

    expect(createStorageAdapter(storage, Date.now, parser).list()).toEqual({
      ok: true,
      value: [],
      warnings: [],
    });
    expect(parser).toHaveBeenCalledTimes(1);
  });

  it('rejects excessive JSON depth with an iterative budget', () => {
    const storage = new FakeStorage();
    let nested: unknown = null;

    for (let depth = 0; depth <= MAX_STORAGE_JSON_DEPTH; depth += 1) {
      nested = { nested };
    }

    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Deep',
          colors: { FRA: '#2563EB' },
          timestamp: 100,
          nested,
        },
      ]),
    );

    expect(createStorageAdapter(storage).list()).toEqual({
      ok: true,
      value: [],
      warnings: [{ code: 'corrupt-data' }],
    });
  });

  it('rejects excessively wide JSON before detailed record validation', () => {
    const storage = new FakeStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Wide',
          colors: { FRA: '#2563EB' },
          timestamp: 100,
          wide: Array.from({ length: MAX_STORAGE_JSON_NODES }, () => null),
        },
      ]),
    );

    expect(createStorageAdapter(storage).list()).toEqual({
      ok: true,
      value: [],
      warnings: [{ code: 'corrupt-data' }],
    });
  });

  it('round-trips a complete V2 historical composition without filtering stable IDs', () => {
    const storage = new FakeStorage();
    const snapshot = createCompositionSnapshot(
      {
        FRA: customColor('#2563EB'),
        'hist:polish-lithuanian-commonwealth': customColor('#DC2626'),
      },
      '1700',
    );
    const adapter = createStorageAdapter(storage, () => 500);

    const saveResult = adapter.save('Historical view', snapshot);
    expectSuccess(saveResult);
    /*
     * RE-BASELINED by `04-14`, deliberately and itemised: `schemaVersion` 2 -> 3
     * and `settings` grows from V2's lone `backgroundColor` to the full Phase 4
     * field set MINUS `backgroundColor`, which V3 does not persist. A CUSTOM
     * assignment still writes a bare canonical hex — that is V2's own wire
     * shape, and paying four json nodes for `{kind:'custom',hex}` would spend
     * the node budget the ramp variant actually needs.
     */
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toEqual([
      {
        schemaVersion: 3,
        name: 'Historical view',
        timestamp: 500,
        composition: {
          camera: snapshot.camera,
          snapshotId: snapshot.snapshotId,
          legend: snapshot.legend,
          settings: expectedStoredSettings(),
          colors: {
            FRA: '#2563EB',
            'hist:polish-lithuanian-commonwealth': '#DC2626',
          },
        },
      },
    ]);

    const loadResult = adapter.load('Historical view');
    expectSuccess(loadResult);
    expect(loadResult.value).toEqual({
      ok: true,
      value: snapshot,
      sourceVersion: 3,
      warnings: [],
    });
  });

  it('canonicalizes camera values through shared camera math before writing V2', () => {
    const storage = new FakeStorage();
    const snapshot = {
      ...createCompositionSnapshot(),
      camera: {
        zoom: 100,
        centerLongitude: 725,
        centerLatitude: 100,
      },
    } satisfies CompositionSnapshot;

    const result = createStorageAdapter(storage, () => 100).save(
      'Repaired camera',
      snapshot,
    );
    expectSuccess(result);

    const stored = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as Array<{
      composition: CompositionSnapshot;
    }>;
    expect(stored[0]?.composition.camera).toEqual(
      repairCameraState(snapshot.camera),
    );
    expect(result.warnings).toEqual([{ code: 'corrupt-data' }]);
  });

  it('migrates V1 in memory with defaults and never writes during list or load', () => {
    const storage = new FakeStorage();
    // V1 persists a bare hex per country. The record on disk keeps that shape;
    // what comes back in memory is the D4-02 union, with the hex demoted to the
    // custom variant.
    const storedColors = { FRA: '#DC2626' };
    const colors: ColorMap = { FRA: customColor('#DC2626') };
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([{ name: 'Legacy', colors: storedColors, timestamp: 100 }]),
    );
    const adapter = createStorageAdapter(storage);
    const expectedLegend = reconcileLegend(
      Object.values(storedColors),
      createDefaultLegendState(),
    );

    expect(adapter.list()).toEqual({
      ok: true,
      value: [{ name: 'Legacy', colors, timestamp: 100 }],
      warnings: [],
    });
    const loadResult = adapter.load('Legacy');
    expectSuccess(loadResult);
    expect(loadResult.value).toEqual({
      ok: true,
      value: {
        colors,
        camera: INITIAL_WORLD_CAMERA,
        snapshotId: 'modern',
        legend: expectedLegend,
        settings: DEFAULT_COMPOSITION_SETTINGS,
      },
      sourceVersion: 1,
      warnings: [{ code: 'legacy-migrated' }],
    });
    expect(storage.setCalls).toBe(0);
  });

  it('rewrites a matching V1 record as V2 only on explicit save', () => {
    const storage = new FakeStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        { name: 'Legacy', colors: { FRA: '#111111' }, timestamp: 100 },
        { name: 'Neighbor', colors: { DEU: '#222222' }, timestamp: 50 },
      ]),
    );
    const snapshot = createCompositionSnapshot({
      'hist:napoleonic-entity': customColor('#16A34A'),
    }, '1815');

    const result = createStorageAdapter(storage, () => 200).save(
      'Legacy',
      snapshot,
    );
    expectSuccess(result);
    /*
     * RE-BASELINED by `04-14`: an explicit save now writes a V3 record. The
     * untouched V1 NEIGHBOUR is the half that has not moved and must not — a
     * record is never upgraded by being re-written alongside another map's
     * save, only by an explicit save of its own.
     */
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toEqual([
      {
        schemaVersion: 3,
        name: 'Legacy',
        timestamp: 200,
        composition: {
          camera: snapshot.camera,
          snapshotId: snapshot.snapshotId,
          legend: snapshot.legend,
          settings: expectedStoredSettings(),
          colors: { 'hist:napoleonic-entity': '#16A34A' },
        },
      },
      { name: 'Neighbor', colors: { DEU: '#222222' }, timestamp: 50 },
    ]);
  });

  it('recovers valid neighbors while reporting unknown versions and unsafe nested keys', () => {
    const storage = new FakeStorage();
    storage.values.set(
      STORAGE_KEY,
      `[
        {"name":"Legacy","colors":{"FRA":"#2563EB"},"timestamp":300},
        {"schemaVersion":99,"name":"Future","timestamp":250,"composition":{}},
        {"schemaVersion":2,"name":"Recovered","timestamp":200,"composition":{
          "colors":{"__proto__":"#111111","hist:safe":"#DC2626"},
          "camera":{"zoom":3,"centerLongitude":10,"centerLatitude":20},
          "snapshotId":"1700",
          "legend":{
            "entries":[
              {"color":"#DC2626","label":"Safe","order":0},
              {"color":"bad","label":"Dropped","order":1}
            ],
            "position":{"x":100,"y":100,"preset":"top-left"},
            "theme":"light","textSize":"medium","backgroundOpacity":0.9,
            "borderStyle":"hairline"
          },
          "settings":{"backgroundColor":"#FFFFFF"}
        }}
      ]`,
    );
    const adapter = createStorageAdapter(storage);

    expect(adapter.list()).toEqual({
      ok: true,
      value: [
        { name: 'Legacy', colors: { FRA: customColor('#2563EB') }, timestamp: 300 },
        {
          name: 'Recovered',
          colors: { 'hist:safe': customColor('#DC2626') },
          timestamp: 200,
        },
      ],
      warnings: [
        { code: 'corrupt-data', recordIndex: 1 },
        { code: 'corrupt-data', recordIndex: 2 },
      ],
    });

    const futureResult = adapter.load('Future');
    expectSuccess(futureResult);
    expect(futureResult.value).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });

    const recoveredResult = adapter.load('Recovered');
    expectSuccess(recoveredResult);
    expect(recoveredResult.value).toMatchObject({
      ok: true,
      sourceVersion: 2,
      value: {
        colors: { 'hist:safe': customColor('#DC2626') },
        snapshotId: '1700',
        legend: {
          entries: [{ color: '#DC2626', label: 'Safe', order: 0 }],
        },
      },
      warnings: [{ code: 'composition-repaired' }],
    });
    expect(storage.setCalls).toBe(0);
  });

  /*
   * D4-11, and the one behaviour in this plan that had to be deliberate rather
   * than incidental.
   *
   * A V2 record still carries `theme`, `backgroundOpacity`, and `borderStyle`.
   * This version no longer models them. **That is a schema difference, not
   * corruption** — reporting it would fire `composition-repaired`, and with it
   * a creator-facing corruption toast, on EVERY reopened saved map, for a
   * migration that succeeded.
   *
   * Both directions are asserted, because relaxing one must not relax the
   * other. The removed fields are silent; a genuinely malformed legend value
   * beside them is still reported.
   */
  it('loads a V2 record carrying the three deleted legend fields with no warning', () => {
    const storage = new FakeStorage();
    const snapshot = createCompositionSnapshot();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Chrome era',
          timestamp: 100,
          composition: {
            ...snapshot,
            legend: {
              ...snapshot.legend,
              // Every deleted field, including the retired 0-1 opacity scale
              // that USED to be reported as a repair.
              theme: 'dark',
              backgroundOpacity: 0.9,
              borderStyle: 'strong',
            },
          },
        },
      ]),
    );

    const result = createStorageAdapter(storage).load('Chrome era');
    expectSuccess(result);
    expect(result.value).toEqual({
      ok: true,
      sourceVersion: 2,
      value: {
        colors: snapshot.colors,
        camera: snapshot.camera,
        snapshotId: snapshot.snapshotId,
        legend: snapshot.legend,
        settings: DEFAULT_COMPOSITION_SETTINGS,
      },
      warnings: [],
    });
    // The surviving fields are unharmed by the drop.
    expect(result.value).toMatchObject({
      ok: true,
      value: { legend: { textSize: 'large' } },
    });
    /*
     * Nothing about the loaded legend carries the DELETED fields forward, and
     * `04-13`'s three ADDED ones are present at their defaults. Both halves
     * matter: the first is D4-11's one-way removal, the second is that an
     * absent `form` resolves rather than being dropped.
     */
    expect(
      Object.keys((result.value as { value: { legend: object } }).value.legend).sort(),
    ).toEqual([
      'caption',
      'entries',
      'form',
      'position',
      'showNoData',
      'textSize',
    ]);
    expect(storage.setCalls).toBe(0);
  });

  it('still reports a genuinely malformed legend value beside the deleted fields', () => {
    const storage = new FakeStorage();
    const snapshot = createCompositionSnapshot();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Chrome era, damaged',
          timestamp: 100,
          composition: {
            ...snapshot,
            legend: {
              ...snapshot.legend,
              theme: 'dark',
              backgroundOpacity: 0.9,
              borderStyle: 'strong',
              // The invalid value: `textSize` survives D4-11 and is still
              // gated. Dropping the chrome fields must not relax this.
              textSize: 'gigantic',
            },
          },
        },
      ]),
    );

    const result = createStorageAdapter(storage).load('Chrome era, damaged');
    expectSuccess(result);
    expect(result.value).toMatchObject({
      ok: true,
      value: { legend: { textSize: 'medium' } },
      warnings: [{ code: 'composition-repaired' }],
    });
    expect(storage.setCalls).toBe(0);
  });

  /* ---------------------------------------------------------------- *
   * T-04-13-01 — the new legend fields at the untrusted-record boundary
   * ---------------------------------------------------------------- */

  /**
   * `04-13` added `form`, `caption`, and `showNoData` to `LegendState`, and
   * they arrive here from stored JSON. The SAME distinction the deleted-field
   * cases above draw applies, in the opposite direction:
   *
   * - **ABSENT is not corruption.** Every record written before this plan
   *   lacks all three. Reporting that would fire `composition-repaired` on
   *   every one of them forever.
   * - **PRESENT-BUT-INVALID is corruption.** `form: 'stack'` is a value no
   *   branch renders; unchecked it reaches the exported PNG as a blank
   *   rectangle where the legend should be.
   *
   * Both directions are asserted, because relaxing one must not relax the
   * other, and both were RED-proved.
   */
  it('loads a V2 record with NO form, caption, or showNoData as clean, resolving to the defaults', () => {
    const storage = new FakeStorage();
    const snapshot = createCompositionSnapshot();
    const legendWithoutNewFields: Record<string, unknown> = {
      ...snapshot.legend,
    };
    // Deleted rather than destructured-and-ignored: the point is a record that
    // does not CARRY the keys, and three unused bindings say that less clearly.
    delete legendWithoutNewFields.form;
    delete legendWithoutNewFields.caption;
    delete legendWithoutNewFields.showNoData;
    expect(Object.keys(legendWithoutNewFields).sort()).toEqual([
      'entries',
      'position',
      'textSize',
    ]);
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Pre-04-13',
          timestamp: 100,
          composition: { ...snapshot, legend: legendWithoutNewFields },
        },
      ]),
    );

    const result = createStorageAdapter(storage).load('Pre-04-13');
    expectSuccess(result);
    expect(result.value).toMatchObject({
      ok: true,
      // ⚠ EMPTY. A single `composition-repaired` here is the creator-facing
      // corruption toast on every map saved before this plan.
      warnings: [],
      value: {
        legend: {
          // `null` = follow the colouring technique, which is exactly what an
          // absent override should mean.
          form: null,
          caption: '',
          showNoData: false,
        },
      },
    });
    expect(storage.setCalls).toBe(0);
  });

  it('keeps a VALID stored form, caption, and showNoData verbatim and reports nothing', () => {
    const storage = new FakeStorage();
    const snapshot = createCompositionSnapshot();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Overridden',
          timestamp: 100,
          composition: {
            ...snapshot,
            legend: {
              ...snapshot.legend,
              form: 'bar',
              caption: 'EU = 6.0%',
              showNoData: true,
            },
          },
        },
      ]),
    );

    const result = createStorageAdapter(storage).load('Overridden');
    expectSuccess(result);
    expect(result.value).toMatchObject({
      ok: true,
      warnings: [],
      value: {
        legend: { form: 'bar', caption: 'EU = 6.0%', showNoData: true },
      },
    });
  });

  it('reports an INVALID form, an invalid showNoData, and a damaged caption as repairs', () => {
    const storage = new FakeStorage();
    const snapshot = createCompositionSnapshot();
    const damagedCaption = `Ledger ${'x'.repeat(60)}`;
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Damaged forms',
          timestamp: 100,
          composition: {
            ...snapshot,
            legend: {
              ...snapshot.legend,
              form: 'stack',
              caption: damagedCaption,
              showNoData: 'yes',
            },
          },
        },
      ]),
    );

    const result = createStorageAdapter(storage).load('Damaged forms');
    expectSuccess(result);
    expect(result.value).toMatchObject({
      ok: true,
      warnings: [{ code: 'composition-repaired' }],
      value: {
        legend: {
          // Falls back to the INFERRED default, never to a rendered string
          // nobody has a branch for.
          form: null,
          showNoData: false,
        },
      },
    });

    const loadedCaption = (
      result.value as { value: { legend: { caption: string } } }
    ).value.legend.caption;
    // Control character stripped, length bounded — and it is NOT the raw
    // stored value, which is the half a `toMatchObject` on the code alone
    // would not catch.
    expect(loadedCaption).not.toBe(damagedCaption);
    expect(loadedCaption).not.toContain(' ');
    expect([...loadedCaption]).toHaveLength(MAX_LEGEND_CAPTION_LENGTH);
    expect(storage.setCalls).toBe(0);
  });

  it('rejects unknown snapshot IDs without writing or falling back silently', () => {
    const storage = new FakeStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Unavailable snapshot',
          timestamp: 100,
          composition: {
            ...createCompositionSnapshot(),
            snapshotId: 'year-unknown',
          },
        },
      ]),
    );

    const result = createStorageAdapter(storage).load('Unavailable snapshot');
    expectSuccess(result);
    expect(result.value).toEqual({
      ok: false,
      reason: 'snapshot-unavailable',
    });
    expect(storage.setCalls).toBe(0);
  });
});

/*
 * D-18 / D-30: the two Phase 3 preference keys.
 *
 * They follow the ONBOARDING_DISMISSED_KEY precedent - a small SEPARATE key,
 * never a new field on the composition record. The composition record is the
 * creator's map: it is saved, loaded, and exported under a name, and widening
 * it would make every saved map carry the panel state that happened to be open
 * when it was written.
 */
describe('the last-open-tool preference (D-18)', () => {
  it('round-trips every tool in the rail inventory', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    (['colors', 'countries', 'legend', 'saved'] as const).forEach((tool) => {
      expect(adapter.setLastOpenTool(tool)).toEqual({
        ok: true,
        value: tool,
        warnings: [],
      });
      expect(storage.values.get(LAST_OPEN_TOOL_KEY)).toBe(tool);
      expect(adapter.getLastOpenTool()).toEqual({
        ok: true,
        value: tool,
        warnings: [],
      });
    });
  });

  it('resolves an ABSENT key to closed', () => {
    const adapter = createStorageAdapter(new FakeStorage());

    /*
     * The load-bearing half of D-18: a first run is a full-bleed world map
     * plus a quiet icon strip, not a panel the creator never opened. Absent is
     * not corrupt, so it carries no warning either.
     */
    expect(adapter.getLastOpenTool()).toEqual({
      ok: true,
      value: null,
      warnings: [],
    });
  });

  it('stores a closed panel explicitly and reads it back as closed', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    // Distinct from absent on purpose: a creator who CLOSED the panel and
    // reloaded must get it back closed, and "absent" already means "never
    // chose". Both resolve to closed; only one of them is a decision.
    expect(adapter.setLastOpenTool(null)).toEqual({
      ok: true,
      value: null,
      warnings: [],
    });
    expect(storage.values.get(LAST_OPEN_TOOL_KEY)).toBe('closed');
    expect(adapter.getLastOpenTool()).toEqual({
      ok: true,
      value: null,
      warnings: [],
    });
  });

  it('resolves an unrecognised or over-bound stored id to closed, with a warning', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    // A tool id this build does not render would open a panel with nothing in
    // it, which is worse than a closed one.
    storage.values.set(LAST_OPEN_TOOL_KEY, 'periods');
    expect(adapter.getLastOpenTool()).toEqual({
      ok: true,
      value: null,
      warnings: [{ code: 'corrupt-data' }],
    });

    storage.values.set(LAST_OPEN_TOOL_KEY, JSON.stringify({ tool: 'colors' }));
    expect(adapter.getLastOpenTool()).toEqual({
      ok: true,
      value: null,
      warnings: [{ code: 'corrupt-data' }],
    });

    // Bounded BEFORE the value is interpreted, on the raw string. Measured
    // against the declared bound rather than a literal, and the length is one
    // past it so the assertion moves with the constant instead of pinning a
    // number that used to be right.
    storage.values.set(
      LAST_OPEN_TOOL_KEY,
      'colors'.padEnd(MAX_PREFERENCE_VALUE_LENGTH + 1, 'x'),
    );
    expect(adapter.getLastOpenTool()).toEqual({
      ok: true,
      value: null,
      warnings: [{ code: 'corrupt-data' }],
    });
  });

  it('returns a typed reason instead of throwing when storage is blocked', () => {
    const blockedStorage = new FakeStorage();
    blockedStorage.getError = new DOMException('blocked', 'SecurityError');
    blockedStorage.setError = new DOMException('blocked', 'SecurityError');

    // A blocked preference is a typed outcome, never an exception: the panel
    // and the theme are cosmetic and neither may take the editor down.
    expect(createStorageAdapter(blockedStorage).getLastOpenTool()).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
    expect(createStorageAdapter(blockedStorage).setLastOpenTool('colors')).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
    expect(createStorageAdapter(null).getLastOpenTool()).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
  });
});

describe('the theme preference (D-30)', () => {
  it('round-trips both modes', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    (['dark', 'light'] as const).forEach((mode) => {
      expect(adapter.setThemeMode(mode)).toEqual({
        ok: true,
        value: mode,
        warnings: [],
      });
      expect(storage.values.get(THEME_MODE_KEY)).toBe(mode);
      expect(adapter.getThemeMode()).toEqual({
        ok: true,
        value: mode,
        warnings: [],
      });
    });
  });

  it('reports "no stored choice" for an absent key rather than a default', () => {
    /*
     * The adapter is a storage boundary, not a policy engine. Baking `light`
     * in here would make `MapEditor`'s `initialThemeMode` prop dead code for
     * every host that mounts the editor with storage available. The standalone
     * app's boundary default IS `light`, so an absent key still resolves to
     * light one layer up - and no operating-system preference is read on
     * either path.
     */
    expect(createStorageAdapter(new FakeStorage()).getThemeMode()).toEqual({
      ok: true,
      value: null,
      warnings: [],
    });
  });

  it('resolves an unrecognised or over-bound stored mode to no choice, with a warning', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    // `auto` is the specific value worth naming: it is what a build that DID
    // read the operating-system preference would have written, and D-30
    // forbids that mode existing at all.
    storage.values.set(THEME_MODE_KEY, 'auto');
    expect(adapter.getThemeMode()).toEqual({
      ok: true,
      value: null,
      warnings: [{ code: 'corrupt-data' }],
    });

    storage.values.set(
      THEME_MODE_KEY,
      'dark'.padEnd(MAX_PREFERENCE_VALUE_LENGTH + 1, 'x'),
    );
    expect(adapter.getThemeMode()).toEqual({
      ok: true,
      value: null,
      warnings: [{ code: 'corrupt-data' }],
    });
  });

  it('returns a typed reason instead of throwing when storage is blocked', () => {
    const blockedStorage = new FakeStorage();
    blockedStorage.getError = new DOMException('blocked', 'SecurityError');
    blockedStorage.setError = new DOMException('blocked', 'SecurityError');

    expect(createStorageAdapter(blockedStorage).getThemeMode()).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
    expect(createStorageAdapter(blockedStorage).setThemeMode('dark')).toEqual({
      ok: false,
      reason: 'storage-unavailable',
    });
  });

  it('never widens the composition record', () => {
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage);

    adapter.setThemeMode('dark');
    adapter.setLastOpenTool('legend');

    // Three separate keys, and the composition record is untouched by both.
    expect([...storage.values.keys()].sort()).toEqual([
      LAST_OPEN_TOOL_KEY,
      THEME_MODE_KEY,
    ]);
    expect(storage.values.has(STORAGE_KEY)).toBe(false);
  });
});

describe('the colour value at the storage boundary (D4-02)', () => {
  function storeV2Record(storage: FakeStorage, colors: unknown): void {
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Ramp painted',
          timestamp: 100,
          composition: { ...createCompositionSnapshot(), colors },
        },
      ]),
    );
  }

  it('accepts a well-formed ramp variant WITHOUT reporting a repair', () => {
    // "A shape this version does not persist" is NOT corruption. Only "a value
    // that is invalid" is. `04-14` bumps to V3 and starts writing this shape;
    // reading it now must not flag the record.
    const storage = new FakeStorage();
    storeV2Record(storage, { FRA: { kind: 'ramp', rampId: 'blues', t: 0.5 } });

    const result = createStorageAdapter(storage).list();

    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: 'Ramp painted',
          colors: { FRA: rampColor('blues', 0.5) },
          timestamp: 100,
        },
      ],
      warnings: [],
    });
  });

  it.each([
    ['an unknown rampId', { kind: 'ramp', rampId: 'sunsets', t: 0.5 }],
    ['a t above the range', { kind: 'ramp', rampId: 'blues', t: 1.5 }],
    ['a t below the range', { kind: 'ramp', rampId: 'blues', t: -0.001 }],
    ['a non-numeric t', { kind: 'ramp', rampId: 'blues', t: '0.5' }],
    ['a missing discriminant', { rampId: 'blues', t: 0.5 }],
    ['a nested object smuggled in as a value', { kind: 'ramp', rampId: 'blues', t: { t: 0.5 } }],
  ])('reports %s as corrupt and drops the entry', (_label, malformedValue) => {
    const storage = new FakeStorage();
    storeV2Record(storage, { FRA: malformedValue });

    expect(createStorageAdapter(storage).list()).toEqual({
      ok: true,
      value: [{ name: 'Ramp painted', colors: {}, timestamp: 100 }],
      warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
    });
  });

  it('keeps a V2 hex string readable as the custom variant, unrepaired', () => {
    const storage = new FakeStorage();
    storeV2Record(storage, { FRA: '#2563EB' });

    expect(createStorageAdapter(storage).list()).toEqual({
      ok: true,
      value: [
        {
          name: 'Ramp painted',
          colors: { FRA: customColor('#2563EB') },
          timestamp: 100,
        },
      ],
      warnings: [],
    });
  });

  it('saves a ramp-painted map as the V3 union - the ramp identity now SURVIVES the disk', () => {
    /*
     * `04-05`'s interim, replaced. It recorded the loss as deliberate and named
     * this plan as the one that ends it, so this test is its inverse and keeps
     * the same subject: the SAME two ramp assignments, asserted to come back as
     * ramp assignments rather than as the hexes they resolve to.
     */
    const storage = new FakeStorage();
    const adapter = createStorageAdapter(storage, () => 100);
    const saveResult = adapter.save(
      'Ramp painted',
      createCompositionSnapshot({
        FRA: rampColor('blues', 0.75),
        DEU: rampColor('reds', 1),
      }),
    );
    expectSuccess(saveResult);

    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toMatchObject([
      {
        schemaVersion: 3,
        composition: {
          colors: {
            FRA: { kind: 'ramp', rampId: 'blues', t: 0.75 },
            DEU: { kind: 'ramp', rampId: 'reds', t: 1 },
          },
        },
      },
    ]);

    const reloaded = adapter.load('Ramp painted');
    expectSuccess(reloaded);
    expect(reloaded.value).toMatchObject({
      ok: true,
      sourceVersion: 3,
      value: { colors: { FRA: rampColor('blues', 0.75), DEU: rampColor('reds', 1) } },
    });
    // The direction that makes the line above a claim rather than a shape
    // check: the resolved hexes are what the OLD interim produced.
    expect(reloaded.value).not.toMatchObject({
      value: { colors: { FRA: customColor('#2171B5') } },
    });
  });

  it('leaves the pre-parse bounds untouched by the V3 record', () => {
    /*
     * `04-05` said `04-14` would extend these. It extended the SET with
     * per-field bounds and did not move one of these three values or their
     * order — the raw-length check before `JSON.parse`, `hasSafeJsonBudget`
     * immediately after, gated by 'rejects oversized serialized input before
     * invoking the injected parser' above.
     */
    expect(MAX_STORAGE_SERIALIZED_LENGTH).toBe(1_000_000);
    expect(MAX_STORAGE_JSON_DEPTH).toBe(32);
    expect(MAX_STORAGE_JSON_NODES).toBe(50_000);
  });
});

/*
 * ------------------------------------------------------------------
 * D4-17 / D4-18 - the V3 record and the one-path V2 migration (plan `04-14`)
 * ------------------------------------------------------------------
 *
 * WARNING: **Every record below is HAND-CONSTRUCTED**, never one this module's
 * own `save()` produced. A migration suite that saves and then loads through
 * the same code path agrees with itself: it cannot see a field that is written
 * but never read, and it cannot see a V2 record at all, because nothing in this
 * build writes one any more. The stored bytes are the subject, so the stored
 * bytes are the fixture.
 */

/** A V2 record exactly as a creator's browser holds it TODAY, pre-Phase-4. */
function createPreP4V2Record(
  legendOverrides: Record<string, unknown> = {},
  settingsOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'Pre-Phase-4 map',
    timestamp: 1_700_000_000_000,
    composition: {
      colors: { FRA: '#2563EB' },
      camera: { zoom: 3, centerLongitude: 12.5, centerLatitude: 48.25 },
      snapshotId: 'modern',
      legend: {
        entries: [{ color: '#2563EB', label: 'Visited', order: 0 }],
        position: { x: 720, y: 64, preset: 'top-right' },
        textSize: 'medium',
        // The three fields D4-11 deleted. A real saved map still carries them.
        theme: 'light',
        backgroundOpacity: 85,
        borderStyle: 'hairline',
        ...legendOverrides,
      },
      settings: { backgroundColor: '#FFFFFF', ...settingsOverrides },
    },
  };
}

function loadStoredRecords(
  records: ReadonlyArray<Record<string, unknown>>,
  name: string,
): StorageResult<CompositionLoadOutcome> {
  const storage = new FakeStorage();
  storage.values.set(STORAGE_KEY, JSON.stringify(records));
  return createStorageAdapter(storage).load(name);
}

function expectLoaded(
  records: ReadonlyArray<Record<string, unknown>>,
  name: string,
): CompositionLoadOutcome & { ok: true } {
  const result = loadStoredRecords(records, name);
  expectSuccess(result);
  if (!result.value.ok) {
    throw new Error(`The stored record failed to load: ${result.value.reason}`);
  }

  return result.value;
}

describe('the V3 record and the one-path V2 migration (D4-17, plan 04-14)', () => {
  it('loads a pre-Phase-4 V2 record cleanly, at sourceVersion 2, with NO repair', () => {
    const result = loadStoredRecords([createPreP4V2Record()], 'Pre-Phase-4 map');
    expectSuccess(result);

    expect(result.value).toMatchObject({
      ok: true,
      sourceVersion: 2,
      warnings: [],
    });
  });

  it('migrates a V2 record onto the ONE rendering path - Phase 4 defaults, not repairs', () => {
    /*
     * The creator-visible consequence of D4-17, made machine-checkable rather
     * than left in prose. This is what the owner accepted: a map saved before
     * Phase 4 reopens with grey uncoloured countries instead of white, a top
     * band on, coastlines at `none` with interior borders at `thin`, and no
     * legend box. Re-exporting it therefore differs from a PNG already posted.
     */
    const outcome = expectLoaded([createPreP4V2Record()], 'Pre-Phase-4 map');

    expect(outcome.value.settings).toEqual(DEFAULT_COMPOSITION_SETTINGS);
    expect(outcome.value.settings.uncoloredFill).toBe('#E5E7EB');
    expect(outcome.value.settings.topBandVisible).toBe(true);
    expect(outcome.value.settings.coastlineWeight).toBe('none');
    expect(outcome.value.settings.interiorWeight).toBe('thin');
    // What SURVIVES, which is the other half of the acknowledgement.
    expect(outcome.value.colors).toEqual({ FRA: customColor('#2563EB') });
    expect(outcome.value.legend.entries).toEqual([
      { color: '#2563EB', label: 'Visited', order: 0 },
    ]);
    expect(outcome.value.legend.position).toEqual({
      x: 720,
      y: 64,
      preset: 'top-right',
    });
    expect(outcome.value.legend.textSize).toBe('medium');
    expect(outcome.value.camera).toEqual({
      zoom: 3,
      centerLongitude: 12.5,
      centerLatitude: 48.25,
    });
    // Defaults, not repairs: `isRepaired` stays false, so no corruption toast.
    expect(outcome.warnings).toEqual([]);
  });

  it("does not repair a V2 record's settings.backgroundColor, whatever it holds", () => {
    /*
     * V2's validator REQUIRED the literal `'#FFFFFF'` and flagged the whole
     * record repaired otherwise. V3 does not persist the field at all, so it is
     * read and DISCARDED - four inputs, one silent outcome. If this ever
     * reported again, every reopened V2 map would raise a corruption toast.
     */
    for (const settingsOverrides of [
      {},
      { backgroundColor: '#123456' },
      { backgroundColor: 42 },
    ]) {
      const result = loadStoredRecords(
        [createPreP4V2Record({}, settingsOverrides)],
        'Pre-Phase-4 map',
      );
      expectSuccess(result);
      expect(result.value).toMatchObject({ ok: true, warnings: [] });
    }

    // And the same for a record whose `settings` key is missing outright.
    const withoutSettings = createPreP4V2Record();
    delete (withoutSettings.composition as Record<string, unknown>).settings;
    const bare = loadStoredRecords([withoutSettings], 'Pre-Phase-4 map');
    expectSuccess(bare);
    expect(bare.value).toMatchObject({ ok: true, warnings: [] });
  });

  it('reads and discards the deleted legend chrome fields without a warning', () => {
    // `04-12`'s rule, re-asserted through the widened reader so extending the
    // validator did not quietly re-admit them as corruption.
    const outcome = expectLoaded(
      [
        createPreP4V2Record({
          theme: 'dark',
          backgroundOpacity: 0.9,
          borderStyle: 'strong',
        }),
      ],
      'Pre-Phase-4 map',
    );

    expect(outcome.warnings).toEqual([]);
    expect(Object.keys(outcome.value.legend).sort()).toEqual([
      'caption',
      'entries',
      'form',
      'position',
      'showNoData',
      'textSize',
    ]);
  });

  it('reports a MALFORMED value in a new V3 field as corrupt - the opposite direction', () => {
    /*
     * Relaxing "absent is not corruption" must not relax "invalid is". One case
     * per new settings field, each asserted to raise `composition-repaired` AND
     * to fall back to its default, so a field that merely stopped being read
     * would still redden this.
     */
    const damagedFields: ReadonlyArray<
      readonly [keyof VisibleCompositionSettings, unknown]
    > = [
      ['surfaceColor', 'not-a-color'],
      ['uncoloredFill', 42],
      ['borderColor', null],
      ['interiorWeight', 'gossamer'],
      ['coastlineWeight', 3],
      ['topBandVisible', 'yes'],
      ['topBandHeight', 5_000],
      ['bottomBandVisible', 0],
      ['bottomBandHeight', Number.NaN],
      ['title', 17],
      ['titleSize', 'gigantic'],
      ['subtitle', []],
      ['subtitleSize', ''],
      ['attribution', {}],
      ['textAlignment', 'justify'],
    ];

    for (const [field, damagedValue] of damagedFields) {
      const outcome = expectLoaded(
        [createPreP4V2Record({}, { [field]: damagedValue })],
        'Pre-Phase-4 map',
      );

      expect(
        outcome.warnings,
        `${field} should be reported as repaired`,
      ).toEqual([{ code: 'composition-repaired' }]);
      // `topBandHeight: 5000` clamps rather than defaulting, so the assertion
      // is "not the damaged value", which holds for every row.
      expect(outcome.value.settings[field]).not.toBe(damagedValue);
    }
  });

  it('clamps an out-of-range band height through clampBandHeight and reports it', () => {
    // T-04-14-03: a band height drives `resolveBandExtents` and therefore the
    // legend inset, so a degenerate stored value moves exported pixels.
    const outcome = expectLoaded(
      [createPreP4V2Record({}, { topBandHeight: 900, bottomBandHeight: -20 })],
      'Pre-Phase-4 map',
    );

    expect(outcome.value.settings.topBandHeight).toBe(BAND_MAX_HEIGHT);
    expect(outcome.value.settings.bottomBandHeight).toBe(0);
    expect(outcome.warnings).toEqual([{ code: 'composition-repaired' }]);
  });

  it('bounds stored text at the SAME length the composition reducer bounds it at', () => {
    /*
     * `MAX_COMPOSITION_TEXT_LENGTH`, not `characterBoundFor`. The product
     * REFUSES rather than truncates past a role bound, so an over-role-bound
     * title is a legitimate saved state that blocks export - truncating it here
     * would silently destroy the creator's words and turn a legible refusal
     * into invisible damage. It would also mean a title no longer round-trips.
     */
    const overRoleBound = 'A'.repeat(40);
    expect(overRoleBound.length).toBeGreaterThan(characterBoundFor('title'));

    const clean = expectLoaded(
      [createPreP4V2Record({}, { title: overRoleBound })],
      'Pre-Phase-4 map',
    );
    expect(clean.value.settings.title).toBe(overRoleBound);
    expect(clean.warnings).toEqual([]);

    // Past the STORAGE bound it is damaged, and it is bounded rather than
    // dropped: the creator keeps the first 100 characters they typed.
    const damaged = expectLoaded(
      [
        createPreP4V2Record(
          {},
          { subtitle: 'B'.repeat(MAX_COMPOSITION_TEXT_LENGTH + 10) },
        ),
      ],
      'Pre-Phase-4 map',
    );
    expect(damaged.value.settings.subtitle).toHaveLength(
      MAX_COMPOSITION_TEXT_LENGTH,
    );
    expect(damaged.warnings).toEqual([{ code: 'composition-repaired' }]);
  });

  it('keeps the V2 guard: a re-written V2 record stays V2 in its own wire shape', () => {
    /*
     * `isSavedCompositionV2` is KEPT rather than replaced. A record is upgraded
     * only by an explicit save of its OWN - being re-written because a
     * neighbour was saved must not make the bytes claim a version whose shape
     * they do not have.
     */
    const storage = new FakeStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify([createPreP4V2Record()]));
    const adapter = createStorageAdapter(storage, () => 999);
    expectSuccess(adapter.save('Brand new', createCompositionSnapshot()));

    const written = JSON.parse(
      storage.getItem(STORAGE_KEY) ?? 'null',
    ) as ReadonlyArray<Record<string, unknown>>;
    expect(written[0]).toMatchObject({ schemaVersion: 3, name: 'Brand new' });
    expect(written[1]).toMatchObject({
      schemaVersion: 2,
      name: 'Pre-Phase-4 map',
    });
    const neighbour = written[1].composition as Record<string, unknown>;
    expect(neighbour.settings).toEqual({ backgroundColor: '#FFFFFF' });
    expect(neighbour.colors).toEqual({ FRA: '#2563EB' });
  });

  it('reports unsupported-version for a version neither branch knows', () => {
    // The V3 writer breaks V2 readers by design; the mirror is that a V4 record
    // is REFUSED here rather than guessed at. A refusal, never a crash.
    const record = {
      ...createPreP4V2Record(),
      schemaVersion: 4,
      name: 'Future',
    };
    const result = loadStoredRecords([record], 'Future');
    expectSuccess(result);
    expect(result.value).toEqual({ ok: false, reason: 'unsupported-version' });
  });

  it('keeps the reserved-key guard on the V3 nested union values', () => {
    /*
     * T-04-14-02. The union nests an OBJECT under each country key, so a
     * reserved key smuggles in a structure rather than a string. `__proto__`
     * carrying a ramp payload is the shape that did not exist before D4-02, and
     * it is written through `JSON.parse` because an object literal cannot hold
     * an own `__proto__` key.
     */
    const record = createPreP4V2Record();
    (record.composition as Record<string, unknown>).colors = JSON.parse(
      '{"__proto__":{"kind":"ramp","rampId":"blues","t":1},' +
        '"constructor":{"kind":"ramp","rampId":"reds","t":1},' +
        '"FRA":{"kind":"ramp","rampId":"greens","t":0.5}}',
    ) as unknown;

    const outcome = expectLoaded([record], 'Pre-Phase-4 map');

    expect(Object.keys(outcome.value.colors)).toEqual(['FRA']);
    expect(Object.getPrototypeOf(outcome.value.colors)).toBeNull();
    expect(({} as Record<string, unknown>).kind).toBeUndefined();
    expect(outcome.warnings).toEqual([{ code: 'composition-repaired' }]);
  });
});

/*
 * ------------------------------------------------------------------
 * The node budget the V3 union actually costs (T-04-05-03, T-04-14-01)
 * ------------------------------------------------------------------
 *
 * `04-05` flagged this as "a real budget question, not a formality", because a
 * ramp assignment is an OBJECT per country instead of a string. Measured with
 * the same walk `hasSafeJsonBudget` performs (every popped value is one node):
 *
 * | Store | V2 nodes | V3 nodes |
 * |---|---|---|
 * | ONE worst-case record (512 colours + 512 legend entries) | 2,584 | **4,134** |
 * | TEN worst-case records (a full `MAX_SAVED_MAPS` store)   | 25,831 | **41,331** |
 * | TEN realistic records (207 colourable units, 30 entries) | - | 9,851 |
 *
 * **It fits. `MAX_STORAGE_JSON_NODES` was NOT raised.** But the honest half is
 * the margin: a hostile full store went from 48% headroom under V2 to **17%**
 * under V3, so the union spent roughly two thirds of what was spare. A real
 * creator cannot approach it - there are 207 colourable units, so 9,851 nodes
 * is the practical ceiling - and reaching 41,331 requires hand-edited
 * `localStorage`.
 *
 * The assertions below pin that margin BEHAVIOURALLY, through the real
 * adapter, rather than re-implementing the walker and agreeing with it: twelve
 * worst-case records still parse and thirteen do not. A future field that
 * inflates the per-record cost moves that boundary and reddens this.
 *
 * A per-field cap could not have protected this and none was added to pretend
 * otherwise: `hasSafeJsonBudget` runs over the WHOLE parsed array before any
 * record is validated, so the caps in step 3 only ever trim a record that has
 * already parsed.
 */
function createWorstCaseV3Record(index: number): Record<string, unknown> {
  const colors: Record<string, unknown> = {};
  for (let entry = 0; entry < 512; entry += 1) {
    colors[`C${String(entry).padStart(4, '0')}`] = {
      kind: 'ramp',
      rampId: 'blues',
      t: (entry % 100) / 100,
    };
  }

  const entries = [];
  for (let entry = 0; entry < 512; entry += 1) {
    entries.push({
      color: `#${(0x200000 + entry).toString(16).slice(-6).toUpperCase()}`,
      label: 'Label',
      order: entry,
    });
  }

  return {
    schemaVersion: 3,
    name: `Worst case ${index}`,
    timestamp: 1_700_000_000_000 + index,
    composition: {
      colors,
      camera: { zoom: 3, centerLongitude: 12.5, centerLatitude: 48.25 },
      snapshotId: 'modern',
      legend: {
        entries,
        position: { x: 720, y: 64, preset: 'top-right' },
        textSize: 'medium',
        form: 'bar',
        caption: 'EU = 6.0%',
        showNoData: true,
      },
      settings: expectedStoredSettings(),
    },
  };
}

function listWorstCaseStore(
  recordCount: number,
): StorageResult<ReadonlyArray<SavedMap>> {
  const storage = new FakeStorage();
  storage.values.set(
    STORAGE_KEY,
    JSON.stringify(
      Array.from({ length: recordCount }, (_, index) =>
        createWorstCaseV3Record(index),
      ),
    ),
  );

  return createStorageAdapter(storage).list();
}

describe('the node budget the V3 union costs (T-04-05-03)', () => {
  it('admits a FULL ten-record store of worst-case V3 records', () => {
    const result = listWorstCaseStore(10);
    expectSuccess(result);

    expect(result.value).toHaveLength(10);
    expect(result.warnings).toEqual([]);
  });

  it('still admits twelve, and REFUSES thirteen - the measured 17% headroom', () => {
    /*
     * The discrimination control. Without the second half, the first assertion
     * only says "10 records parse", which a budget with any headroom at all
     * satisfies; together they locate the boundary, which is what "measured"
     * means. 12 records is 49,597 nodes and 13 is 53,730.
     */
    const twelve = listWorstCaseStore(12);
    expectSuccess(twelve);
    // Over `MAX_SAVED_MAPS`, so trimmed to ten and reported - but PARSED.
    expect(twelve.value).toHaveLength(10);

    const thirteen = listWorstCaseStore(13);
    expectSuccess(thirteen);
    // Over the node budget, so the whole store is refused before any record is
    // validated. Nothing a per-field cap could have rescued.
    expect(thirteen.value).toEqual([]);
    expect(thirteen.warnings).toEqual([{ code: 'corrupt-data' }]);
  });

  it('leaves a REALISTIC store far inside the budget', () => {
    // 207 colourable units is the whole catalog (Live Invariant 5), and export
    // blocks past 30 legend colours, so this is the real ceiling: 9,851 nodes.
    const storage = new FakeStorage();
    const colors: Record<string, unknown> = {};
    for (let entry = 0; entry < 207; entry += 1) {
      colors[`C${String(entry).padStart(4, '0')}`] = {
        kind: 'ramp',
        rampId: 'blues',
        t: (entry % 100) / 100,
      };
    }
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify(
        Array.from({ length: 10 }, (_, index) => ({
          ...createWorstCaseV3Record(index),
          composition: {
            ...(createWorstCaseV3Record(index).composition as Record<
              string,
              unknown
            >),
            colors,
            legend: {
              entries: [],
              position: { x: 720, y: 64, preset: 'top-right' },
              textSize: 'medium',
              form: 'bar',
              caption: '',
              showNoData: false,
            },
          },
        })),
      ),
    );

    const result = createStorageAdapter(storage).list();
    expectSuccess(result);
    expect(result.value).toHaveLength(10);
    expect(Object.keys(result.value[0].colors)).toHaveLength(207);
  });
});
