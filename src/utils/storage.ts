import { DEFAULT_COLOR } from '../constants/colors';
import {
  MAX_MAP_NAME_LENGTH,
  MAX_SAVED_MAPS,
  ONBOARDING_DISMISSED_KEY,
  STORAGE_KEY,
} from '../constants/config';
import type { ColorMap } from '../types/map';
import type { SavedMap, StorageResult, StorageWarning } from '../types/ui';
import { normalizeColor } from './colors';

const MAX_STORED_COLOR_ENTRIES = 512;
const UNSAFE_RECORD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface SaveMapValue {
  savedMap: SavedMap;
  savedMaps: ReadonlyArray<SavedMap>;
  replaced: boolean;
}

export interface StorageAdapter {
  list: () => StorageResult<ReadonlyArray<SavedMap>>;
  save: (name: string, colors: ColorMap) => StorageResult<SaveMapValue>;
  load: (name: string, validCountryIds: ReadonlySet<string>) => StorageResult<ColorMap>;
  delete: (name: string) => StorageResult<ReadonlyArray<SavedMap>>;
  getOnboardingDismissed: () => StorageResult<boolean>;
  dismissOnboarding: () => StorageResult<boolean>;
}

type StorageReadResult =
  | { ok: true; value: string | null }
  | { ok: false; reason: 'storage-unavailable' };

type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: 'quota-exceeded' | 'storage-unavailable' };

type MapNameResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'invalid-name' | 'name-too-long' };

function getDefaultStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMapName(name: string): MapNameResult {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { ok: false, reason: 'invalid-name' };
  }

  if (trimmedName.length > MAX_MAP_NAME_LENGTH) {
    return { ok: false, reason: 'name-too-long' };
  }

  return { ok: true, value: trimmedName };
}

function createCorruptWarning(recordIndex?: number): StorageWarning {
  return recordIndex === undefined
    ? { code: 'corrupt-data' }
    : { code: 'corrupt-data', recordIndex };
}

function normalizeColorMap(
  value: unknown,
  validCountryIds?: ReadonlySet<string>,
): { colors: ColorMap; isCorrupt: boolean } | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const colors: Record<string, string> = {};
  const entries = Object.entries(value);
  let isCorrupt = entries.length > MAX_STORED_COLOR_ENTRIES;

  for (const [countryId, rawColor] of entries.slice(0, MAX_STORED_COLOR_ENTRIES)) {
    if (
      countryId.trim().length === 0 ||
      UNSAFE_RECORD_KEYS.has(countryId) ||
      typeof rawColor !== 'string'
    ) {
      isCorrupt = true;
      continue;
    }

    if (validCountryIds !== undefined && !validCountryIds.has(countryId)) {
      continue;
    }

    const colorResult = normalizeColor(rawColor);
    if (!colorResult.ok) {
      isCorrupt = true;
      continue;
    }

    if (colorResult.value !== DEFAULT_COLOR) {
      colors[countryId] = colorResult.value;
    }
  }

  return { colors, isCorrupt };
}

function normalizeSavedMap(
  value: unknown,
  recordIndex: number,
  warnings: StorageWarning[],
  validCountryIds?: ReadonlySet<string>,
): SavedMap | null {
  if (!isObjectRecord(value)) {
    warnings.push(createCorruptWarning(recordIndex));
    return null;
  }

  const { name, colors, timestamp } = value;
  if (typeof name !== 'string' || typeof timestamp !== 'number') {
    warnings.push(createCorruptWarning(recordIndex));
    return null;
  }

  const nameResult = validateMapName(name);
  if (!nameResult.ok || !Number.isFinite(timestamp) || timestamp < 0) {
    warnings.push(createCorruptWarning(recordIndex));
    return null;
  }

  const colorResult = normalizeColorMap(colors, validCountryIds);
  if (colorResult === null) {
    warnings.push(createCorruptWarning(recordIndex));
    return null;
  }

  if (colorResult.isCorrupt) {
    warnings.push(createCorruptWarning(recordIndex));
  }

  return {
    name: nameResult.value,
    colors: colorResult.colors,
    timestamp,
  };
}

function parseSavedMaps(
  serialized: string,
  validCountryIds?: ReadonlySet<string>,
): { maps: ReadonlyArray<SavedMap>; warnings: ReadonlyArray<StorageWarning> } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return { maps: [], warnings: [createCorruptWarning()] };
  }

  if (!Array.isArray(parsed)) {
    return { maps: [], warnings: [createCorruptWarning()] };
  }

  const warnings: StorageWarning[] = [];
  const maps: SavedMap[] = [];
  const normalizedNames = new Set<string>();
  const records = parsed.slice(0, MAX_SAVED_MAPS);

  if (parsed.length > MAX_SAVED_MAPS) {
    warnings.push(createCorruptWarning(MAX_SAVED_MAPS));
  }

  records.forEach((record, recordIndex) => {
    const map = normalizeSavedMap(record, recordIndex, warnings, validCountryIds);
    if (map === null) {
      return;
    }

    if (normalizedNames.has(map.name)) {
      warnings.push(createCorruptWarning(recordIndex));
      return;
    }

    normalizedNames.add(map.name);
    maps.push(map);
  });

  return { maps, warnings };
}

function isQuotaExceededError(error: unknown): boolean {
  return isObjectRecord(error) && error.name === 'QuotaExceededError';
}

export function createStorageAdapter(
  storage: Storage | null = getDefaultStorage(),
  now: () => number = Date.now,
): StorageAdapter {
  function read(key: string): StorageReadResult {
    if (storage === null) {
      return { ok: false, reason: 'storage-unavailable' };
    }

    try {
      return { ok: true, value: storage.getItem(key) };
    } catch {
      return { ok: false, reason: 'storage-unavailable' };
    }
  }

  function write(key: string, value: string): StorageWriteResult {
    if (storage === null) {
      return { ok: false, reason: 'storage-unavailable' };
    }

    try {
      storage.setItem(key, value);
      return { ok: true };
    } catch (error: unknown) {
      return isQuotaExceededError(error)
        ? { ok: false, reason: 'quota-exceeded' }
        : { ok: false, reason: 'storage-unavailable' };
    }
  }

  function readMaps(
    validCountryIds?: ReadonlySet<string>,
  ): StorageResult<ReadonlyArray<SavedMap>> {
    const readResult = read(STORAGE_KEY);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null) {
      return { ok: true, value: [], warnings: [] };
    }

    const parsed = parseSavedMaps(readResult.value, validCountryIds);
    return { ok: true, value: parsed.maps, warnings: parsed.warnings };
  }

  function writeMaps(
    maps: ReadonlyArray<SavedMap>,
    warnings: ReadonlyArray<StorageWarning>,
  ): StorageResult<ReadonlyArray<SavedMap>> {
    let serialized: string;

    try {
      serialized = JSON.stringify(maps);
    } catch {
      return { ok: false, reason: 'storage-unavailable' };
    }

    const writeResult = write(STORAGE_KEY, serialized);
    if (!writeResult.ok) {
      return writeResult;
    }

    return { ok: true, value: maps, warnings };
  }

  function list(): StorageResult<ReadonlyArray<SavedMap>> {
    return readMaps();
  }

  function save(name: string, colors: ColorMap): StorageResult<SaveMapValue> {
    const nameResult = validateMapName(name);
    if (!nameResult.ok) {
      return nameResult;
    }

    const listResult = readMaps();
    if (!listResult.ok) {
      return listResult;
    }

    const colorResult = normalizeColorMap(colors);
    if (colorResult === null) {
      return { ok: false, reason: 'storage-unavailable' };
    }

    const savedMap: SavedMap = {
      name: nameResult.value,
      colors: colorResult.colors,
      timestamp: now(),
    };
    const replaced = listResult.value.some((map) => map.name === nameResult.value);
    const savedMaps = [
      savedMap,
      ...listResult.value.filter((map) => map.name !== nameResult.value),
    ].slice(0, MAX_SAVED_MAPS);
    const warnings = colorResult.isCorrupt
      ? [...listResult.warnings, createCorruptWarning()]
      : listResult.warnings;
    const writeResult = writeMaps(savedMaps, warnings);

    if (!writeResult.ok) {
      return writeResult;
    }

    return {
      ok: true,
      value: { savedMap, savedMaps: writeResult.value, replaced },
      warnings: writeResult.warnings,
    };
  }

  function load(
    name: string,
    validCountryIds: ReadonlySet<string>,
  ): StorageResult<ColorMap> {
    const nameResult = validateMapName(name);
    if (!nameResult.ok) {
      return nameResult;
    }

    const listResult = readMaps(validCountryIds);
    if (!listResult.ok) {
      return listResult;
    }

    const savedMap = listResult.value.find((map) => map.name === nameResult.value);
    if (savedMap === undefined) {
      return { ok: false, reason: 'map-not-found' };
    }

    return { ok: true, value: savedMap.colors, warnings: listResult.warnings };
  }

  function deleteMap(name: string): StorageResult<ReadonlyArray<SavedMap>> {
    const nameResult = validateMapName(name);
    if (!nameResult.ok) {
      return nameResult;
    }

    const listResult = readMaps();
    if (!listResult.ok) {
      return listResult;
    }

    if (!listResult.value.some((map) => map.name === nameResult.value)) {
      return { ok: false, reason: 'map-not-found' };
    }

    const savedMaps = listResult.value.filter((map) => map.name !== nameResult.value);
    return writeMaps(savedMaps, listResult.warnings);
  }

  function getOnboardingDismissed(): StorageResult<boolean> {
    const readResult = read(ONBOARDING_DISMISSED_KEY);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null || readResult.value === 'false') {
      return { ok: true, value: false, warnings: [] };
    }

    if (readResult.value === 'true') {
      return { ok: true, value: true, warnings: [] };
    }

    return { ok: true, value: false, warnings: [createCorruptWarning()] };
  }

  function dismissOnboarding(): StorageResult<boolean> {
    const writeResult = write(ONBOARDING_DISMISSED_KEY, 'true');
    if (!writeResult.ok) {
      return writeResult;
    }

    return { ok: true, value: true, warnings: [] };
  }

  return {
    list,
    save,
    load,
    delete: deleteMap,
    getOnboardingDismissed,
    dismissOnboarding,
  };
}
