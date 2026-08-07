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
  CompositionSnapshot,
  SnapshotId,
} from '../types/composition';
import { DEFAULT_COMPOSITION_SETTINGS } from '../constants/mapStyle';
import type { ColorMap } from '../types/map';
import { repairCameraState } from './camera';
import { customColor, rampColor } from './colors';
import { MAX_LEGEND_CAPTION_LENGTH } from './compositionText';
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
    // The V2 WIRE shape is one canonical hex per country - the union is the
    // in-memory model, not the persisted one, until `04-14` bumps to V3.
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toEqual([
      {
        schemaVersion: 2,
        name: 'Historical view',
        timestamp: 500,
        composition: {
          ...snapshot,
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
      sourceVersion: 2,
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
    // The BYTES stay a valid V2 record: one canonical hex per country, never a
    // union object. `04-14` owns the V3 bump that persists the ramp identity;
    // until then a save is lossy in that identity and never invalid.
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toEqual([
      {
        schemaVersion: 2,
        name: 'Legacy',
        timestamp: 200,
        composition: {
          ...snapshot,
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

  it('saves a ramp-painted map as V2 hex - lossy in the identity, never invalid', () => {
    // The deliberate interim. `04-14` owns the V3 records that make this
    // lossless; until then the bytes stay a valid V2 record so no file claims a
    // version whose shape it does not have. Reopening yields a custom-hex map
    // that renders identically and can no longer be re-skinned by ramp switch.
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
      { composition: { colors: { FRA: '#2171B5', DEU: '#A50F15' } } },
    ]);

    const reloaded = adapter.load('Ramp painted');
    expectSuccess(reloaded);
    expect(reloaded.value).toMatchObject({
      ok: true,
      value: { colors: { FRA: customColor('#2171B5'), DEU: customColor('#A50F15') } },
    });
    // Stated, not discovered: the ramp identity did NOT survive the disk.
    expect(reloaded.value).not.toMatchObject({
      value: { colors: { FRA: rampColor('blues', 0.75) } },
    });
  });

  it('leaves the pre-parse bounds untouched by the wider value shape', () => {
    // `04-14` extends these for V3. This plan changes none of them, and the
    // ORDER - raw-length check before `JSON.parse`, `hasSafeJsonBudget`
    // immediately after - is already gated by 'rejects oversized serialized
    // input before invoking the injected parser' above. This asserts the values
    // so a silent widening for the union would be caught here.
    expect(MAX_STORAGE_SERIALIZED_LENGTH).toBe(1_000_000);
    expect(MAX_STORAGE_JSON_DEPTH).toBe(32);
    expect(MAX_STORAGE_JSON_NODES).toBe(50_000);
  });
});
