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
import type { ColorMap } from '../types/map';
import { repairCameraState } from './camera';
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
  colors: ColorMap = { FRA: '#2563EB' },
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
      theme: 'soft',
      textSize: 'large',
      backgroundOpacity: 85,
      borderStyle: 'strong',
    },
    settings: { backgroundColor: '#FFFFFF' },
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
      createCompositionSnapshot({ FRA: '#abc' }),
    );
    const second = adapter.save(
      'Second map',
      createCompositionSnapshot({ DEU: 'rgb(1, 2, 3)' }),
    );

    expect(first).toMatchObject({
      ok: true,
      value: {
        replaced: false,
        savedMap: { name: 'First map', colors: { FRA: '#AABBCC' }, timestamp: 100 },
      },
    });
    expect(second).toMatchObject({
      ok: true,
      value: {
        replaced: false,
        savedMaps: [
          { name: 'Second map', colors: { DEU: '#010203' }, timestamp: 200 },
          { name: 'First map', colors: { FRA: '#AABBCC' }, timestamp: 100 },
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
          FRA: '#FFFFFF',
          DEU: '#ffffff',
          ITA: '#16A34A',
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {
        savedMap: { colors: { ITA: '#16A34A' } },
      },
    });
    expect(
      adapter.load('White is default', new Set(['FRA', 'DEU', 'ITA'])),
    ).toEqual({
      ok: true,
      value: { ITA: '#16A34A' },
      warnings: [],
    });
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects reserved color-map ID %s at save and load boundaries',
    (reservedId) => {
      const saveStorage = new FakeStorage();
      const ownReservedColors = JSON.parse(
        `{"${reservedId}":"#2563EB"}`,
      ) as Record<string, string>;

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
        value: { FRA: '#DC2626' },
        warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
      });
    },
  );

  it('replaces an exact trimmed-name match and moves it to newest', () => {
    const storage = new FakeStorage();
    const timestamps = [100, 200, 300];
    const adapter = createStorageAdapter(storage, () => timestamps.shift() ?? 400);

    adapter.save('Alpha', createCompositionSnapshot({ FRA: '#111111' }));
    adapter.save('Beta', createCompositionSnapshot({ DEU: '#222222' }));
    const result = adapter.save(
      '  Alpha ',
      createCompositionSnapshot({ ITA: '#333333' }),
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        replaced: true,
        savedMaps: [
          { name: 'Alpha', colors: { ITA: '#333333' }, timestamp: 300 },
          { name: 'Beta', colors: { DEU: '#222222' }, timestamp: 200 },
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
      createCompositionSnapshot({ FRA: '#123456' }),
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
        createCompositionSnapshot({ FRA: '#123456' }),
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
      value: { FRA: '#AABBCC', DEU: '#0A141E' },
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
        { name: 'Clean map', colors: { FRA: '#123456' }, timestamp: 200 },
        { name: 'Corrupt map', colors: {}, timestamp: 100 },
      ],
      warnings: [{ code: 'corrupt-data', recordIndex: 1 }],
    });
    expect(adapter.load('Clean map', new Set(['FRA', 'DEU']))).toEqual({
      ok: true,
      value: { FRA: '#123456' },
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
      value: { FRA: '#123456' },
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
        { name: 'Alpha', colors: { FRA: '#111111' }, timestamp: 300 },
        { name: 'Beta', colors: { ESP: '#444444' }, timestamp: 50 },
      ],
      warnings: [
        { code: 'corrupt-data', recordIndex: 1 },
        { code: 'corrupt-data', recordIndex: 2 },
      ],
    });
    expect(adapter.load(' Alpha ', new Set(['FRA', 'DEU', 'ITA']))).toEqual({
      ok: true,
      value: { FRA: '#111111' },
      warnings: [],
    });
    expect(adapter.delete('  Alpha ')).toEqual({
      ok: true,
      value: [{ name: 'Beta', colors: { ESP: '#444444' }, timestamp: 50 }],
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
        { name: 'Valid', colors: { FRA: '#123456' }, timestamp: 300 },
        { name: 'Partial', colors: { ITA: '#AABBCC' }, timestamp: 100 },
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
        createCompositionSnapshot({ FRA: '#123456' }),
      ),
    ).toEqual({
      ok: false,
      reason: 'quota-exceeded',
    });
    expect(
      createStorageAdapter(blockedStorage).save(
        'Map',
        createCompositionSnapshot({ FRA: '#123456' }),
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
        FRA: '#2563EB',
        'hist:polish-lithuanian-commonwealth': '#DC2626',
      },
      '1700',
    );
    const adapter = createStorageAdapter(storage, () => 500);

    const saveResult = adapter.save('Historical view', snapshot);
    expectSuccess(saveResult);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toEqual([
      {
        schemaVersion: 2,
        name: 'Historical view',
        timestamp: 500,
        composition: snapshot,
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
    const colors = { FRA: '#DC2626' };
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([{ name: 'Legacy', colors, timestamp: 100 }]),
    );
    const adapter = createStorageAdapter(storage);
    const expectedLegend = reconcileLegend(
      Object.values(colors),
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
        settings: { backgroundColor: '#FFFFFF' },
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
      'hist:napoleonic-entity': '#16A34A',
    }, '1815');

    const result = createStorageAdapter(storage, () => 200).save(
      'Legacy',
      snapshot,
    );
    expectSuccess(result);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')).toEqual([
      {
        schemaVersion: 2,
        name: 'Legacy',
        timestamp: 200,
        composition: snapshot,
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
        { name: 'Legacy', colors: { FRA: '#2563EB' }, timestamp: 300 },
        { name: 'Recovered', colors: { 'hist:safe': '#DC2626' }, timestamp: 200 },
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
        colors: { 'hist:safe': '#DC2626' },
        snapshotId: '1700',
        legend: {
          entries: [{ color: '#DC2626', label: 'Safe', order: 0 }],
        },
      },
      warnings: [{ code: 'composition-repaired' }],
    });
    expect(storage.setCalls).toBe(0);
  });

  it('repairs a legacy fractional legend opacity to the canonical percent scale', () => {
    // Builds before the scale was unified stored backgroundOpacity as a 0-1
    // fraction. Accepting it as-is let a stored 0.9 load unrepaired and then be
    // clamped up to the 70 floor, so a legacy map silently rendered at 70%
    // where the creator had chosen 90%.
    const storage = new FakeStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify([
        {
          schemaVersion: 2,
          name: 'Legacy opacity',
          timestamp: 100,
          composition: {
            ...createCompositionSnapshot(),
            legend: {
              ...createCompositionSnapshot().legend,
              backgroundOpacity: 0.9,
            },
          },
        },
      ]),
    );

    const result = createStorageAdapter(storage).load('Legacy opacity');
    expectSuccess(result);
    expect(result.value).toMatchObject({
      ok: true,
      value: { legend: { backgroundOpacity: 90 } },
      warnings: [{ code: 'composition-repaired' }],
    });
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
