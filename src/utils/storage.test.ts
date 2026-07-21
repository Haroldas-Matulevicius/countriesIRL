import { describe, expect, it } from 'vitest';
import { MAX_MAP_NAME_LENGTH, ONBOARDING_DISMISSED_KEY, STORAGE_KEY } from '../constants/config';
import { createStorageAdapter } from './storage';

class FakeStorage implements Storage {
  readonly values = new Map<string, string>();
  getError: unknown;
  setError: unknown;

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
    if (this.setError !== undefined) {
      throw this.setError;
    }

    this.values.set(key, value);
  }
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

    const first = adapter.save('  First map  ', { FRA: '#abc' });
    const second = adapter.save('Second map', { DEU: 'rgb(1, 2, 3)' });

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

  it('replaces an exact trimmed-name match and moves it to newest', () => {
    const storage = new FakeStorage();
    const timestamps = [100, 200, 300];
    const adapter = createStorageAdapter(storage, () => timestamps.shift() ?? 400);

    adapter.save('Alpha', { FRA: '#111111' });
    adapter.save('Beta', { DEU: '#222222' });
    const result = adapter.save('  Alpha ', { ITA: '#333333' });

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
    const result = createStorageAdapter(storage).save(name, { FRA: '#123456' });

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
      adapter.save(`Map ${index}`, { FRA: '#123456' });
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

  it('deletes only the exact trimmed-name record', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { name: 'Alpha', colors: { FRA: '#111111' }, timestamp: 200 },
        { name: 'Beta', colors: { DEU: '#222222' }, timestamp: 100 },
      ]),
    );

    const adapter = createStorageAdapter(storage);
    const result = adapter.delete('  Alpha ');

    expect(result).toEqual({
      ok: true,
      value: [{ name: 'Beta', colors: { DEU: '#222222' }, timestamp: 100 }],
      warnings: [],
    });
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

    expect(createStorageAdapter(quotaStorage).save('Map', { FRA: '#123456' })).toEqual({
      ok: false,
      reason: 'quota-exceeded',
    });
    expect(createStorageAdapter(blockedStorage).save('Map', { FRA: '#123456' })).toEqual({
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
});
