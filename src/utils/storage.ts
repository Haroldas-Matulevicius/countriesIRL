import { INITIAL_WORLD_CAMERA, WORLD_SIZE } from '../constants/camera';
import { DEFAULT_COLOR } from '../constants/colors';
import {
  LAST_OPEN_TOOL_KEY,
  MAX_MAP_NAME_LENGTH,
  MAX_PREFERENCE_VALUE_LENGTH,
  MAX_SAVED_MAPS,
  ONBOARDING_DISMISSED_KEY,
  STORAGE_KEY,
  THEME_MODE_KEY,
} from '../constants/config';
import { CLOSED_TOOL_VALUE, isToolId } from '../constants/tools';
import { SNAPSHOT_CATALOG } from '../constants/snapshots';
import type {
  CameraState,
  CompositionLoadOutcome,
  CompositionLoadWarning,
  CompositionSnapshot,
  LegacySavedComposition,
  LegendBorderStyle,
  LegendCorner,
  LegendEntryState,
  LegendState,
  LegendTextSize,
  LegendTheme,
  SavedCompositionRecord,
  SavedCompositionV2,
  SnapshotId,
} from '../types/composition';
import type { ColorMap } from '../types/map';
import type {
  EditorThemeMode,
  SavedMap,
  SavedMapSummary,
  StorageResult,
  StorageWarning,
  ToolId,
} from '../types/ui';
import { repairCameraState } from './camera';
import { createEmptyColorMap, normalizeColor } from './colors';
import { isSafeStableCountryId } from './countryIds';
import {
  createDefaultLegendState,
  LEGEND_BORDER_STYLES,
  LEGEND_CORNERS,
  LEGEND_TEXT_SIZES,
  LEGEND_THEMES,
  reconcileLegend,
} from './legend';

export const MAX_STORAGE_SERIALIZED_LENGTH = 1_000_000;
export const MAX_STORAGE_JSON_DEPTH = 32;
export const MAX_STORAGE_JSON_NODES = 50_000;

const MAX_STORED_COLOR_ENTRIES = 512;
const MAX_STORED_LEGEND_ENTRIES = 512;
const MAX_LEGEND_LABEL_LENGTH = 32;
const MIN_FRACTIONAL_LEGEND_OPACITY = 0.7;
const MAX_FRACTIONAL_LEGEND_OPACITY = 1;
const MIN_PERCENT_LEGEND_OPACITY = 70;
const MAX_PERCENT_LEGEND_OPACITY = 100;
const WHOLE_WORLD_ZOOM_EPSILON = 0.001;
const WHOLE_WORLD_DEGREE_EPSILON = 0.01;
const MIN_LEGEND_COORDINATE = 0;
const MAX_LEGEND_COORDINATE = WORLD_SIZE;

const SNAPSHOT_IDS = new Set<string>(
  SNAPSHOT_CATALOG.map(({ id }) => id),
);

export interface SaveMapValue {
  savedMap: SavedMap;
  savedMaps: ReadonlyArray<SavedMap>;
  replaced: boolean;
}

export interface StorageAdapter {
  list: () => StorageResult<ReadonlyArray<SavedMap>>;
  listSummaries: () => StorageResult<ReadonlyArray<SavedMapSummary>>;
  save: (
    name: string,
    snapshot: CompositionSnapshot,
  ) => StorageResult<SaveMapValue>;
  load: {
    (name: string): StorageResult<CompositionLoadOutcome>;
    (
      name: string,
      validCountryIds: ReadonlySet<string>,
    ): StorageResult<ColorMap>;
  };
  delete: (name: string) => StorageResult<ReadonlyArray<SavedMap>>;
  getOnboardingDismissed: () => StorageResult<boolean>;
  dismissOnboarding: () => StorageResult<boolean>;
  /**
   * D-18. `null` is the CLOSED panel and it is a real stored value, not an
   * absent key: a creator who closes the panel and reloads must get it back
   * closed, while an absent key means "never chose" and also resolves to
   * closed (a first run is a full-bleed map plus a quiet icon strip).
   *
   * An unrecognised stored id resolves to closed. Stored strings are untrusted
   * whatever wrote them.
   */
  getLastOpenTool: () => StorageResult<ToolId | null>;
  setLastOpenTool: (tool: ToolId | null) => StorageResult<ToolId | null>;
  /**
   * D-30. `null` means the creator has made no stored choice - absent key or a
   * value this build does not recognise. The DEFAULT is deliberately not
   * applied here: the adapter is a storage boundary, not a policy engine, and
   * baking `light` in would make `MapEditor`'s `initialThemeMode` prop dead
   * code for every host that ever mounts the editor with storage available.
   * The standalone app's boundary default is `light`, so an absent key still
   * resolves to light, and no operating-system preference is read on any path.
   */
  getThemeMode: () => StorageResult<EditorThemeMode | null>;
  setThemeMode: (mode: EditorThemeMode) => StorageResult<EditorThemeMode>;
}

type JsonParser = (serialized: string) => unknown;

type StorageReadResult =
  | { ok: true; value: string | null }
  | { ok: false; reason: 'storage-unavailable' };

type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: 'quota-exceeded' | 'storage-unavailable' };

type MapNameResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'invalid-name' | 'name-too-long' };

interface ColorMapNormalization {
  colors: ColorMap;
  isRepaired: boolean;
}

interface CompositionNormalization {
  outcome: CompositionLoadOutcome;
  snapshot: CompositionSnapshot | null;
  isRepaired: boolean;
}

interface ParsedStoredRecord {
  storedRecord: SavedCompositionRecord;
  map: SavedMap;
  loadOutcome: CompositionLoadOutcome;
  recordIndex: number;
  hasCorruptWarning: boolean;
}

interface RejectedStoredRecord {
  name: string | null;
  loadOutcome: CompositionLoadOutcome;
  recordIndex: number;
}

interface ParsedSavedMaps {
  records: ReadonlyArray<ParsedStoredRecord>;
  rejectedRecords: ReadonlyArray<RejectedStoredRecord>;
  warnings: ReadonlyArray<StorageWarning>;
}

interface JsonBudgetItem {
  value: unknown;
  depth: number;
}

function getDefaultStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parseJson(serialized: string): unknown {
  return JSON.parse(serialized) as unknown;
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

function hasSafeJsonBudget(value: unknown): boolean {
  const stack: JsonBudgetItem[] = [{ value, depth: 0 }];
  let nodeCount = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }

    nodeCount += 1;
    if (
      nodeCount > MAX_STORAGE_JSON_NODES ||
      current.depth > MAX_STORAGE_JSON_DEPTH
    ) {
      return false;
    }

    if (Array.isArray(current.value)) {
      for (const child of current.value) {
        stack.push({ value: child, depth: current.depth + 1 });
      }
      continue;
    }

    if (isObjectRecord(current.value)) {
      for (const child of Object.values(current.value)) {
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }

  return true;
}

function normalizeColorMap(
  value: unknown,
  validCountryIds?: ReadonlySet<string>,
): ColorMapNormalization | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const colors = createEmptyColorMap();
  const entries = Object.entries(value);
  let isRepaired = entries.length > MAX_STORED_COLOR_ENTRIES;

  for (const [countryId, rawColor] of entries.slice(
    0,
    MAX_STORED_COLOR_ENTRIES,
  )) {
    if (!isSafeStableCountryId(countryId) || typeof rawColor !== 'string') {
      isRepaired = true;
      continue;
    }

    if (validCountryIds !== undefined && !validCountryIds.has(countryId)) {
      isRepaired = true;
      continue;
    }

    const colorResult = normalizeColor(rawColor);
    if (!colorResult.ok) {
      isRepaired = true;
      continue;
    }

    if (colorResult.value !== rawColor) {
      isRepaired = true;
    }

    if (colorResult.value !== DEFAULT_COLOR) {
      colors[countryId] = colorResult.value;
    } else if (rawColor !== DEFAULT_COLOR) {
      isRepaired = true;
    }
  }

  return { colors, isRepaired };
}

function areCamerasEqual(
  left: CompositionSnapshot['camera'],
  right: CompositionSnapshot['camera'],
): boolean {
  return (
    left.zoom === right.zoom &&
    left.centerLongitude === right.centerLongitude &&
    left.centerLatitude === right.centerLatitude
  );
}

function normalizeCamera(
  value: unknown,
): { camera: CompositionSnapshot['camera']; isRepaired: boolean } | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { zoom, centerLongitude, centerLatitude } = value;
  if (
    typeof zoom !== 'number' ||
    typeof centerLongitude !== 'number' ||
    typeof centerLatitude !== 'number'
  ) {
    return null;
  }

  const source = { zoom, centerLongitude, centerLatitude };
  const camera = repairCameraState(source);

  return { camera, isRepaired: !areCamerasEqual(source, camera) };
}

/**
 * Legend background opacity is canonically a 0-100 percentage.
 *
 * Builds before the scale was unified wrote a 0-1 fraction. Accepting that
 * fraction as-is let a stored `0.9` load unrepaired and then be silently
 * clamped up to the 70 floor, so a legacy map quietly rendered at 70% where the
 * creator had chosen 90%. Convert the fraction and report it as a repair.
 */
function normalizeLegendOpacity(
  value: number,
): { opacity: number; isRepaired: boolean } | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (
    value >= MIN_PERCENT_LEGEND_OPACITY &&
    value <= MAX_PERCENT_LEGEND_OPACITY
  ) {
    return { opacity: value, isRepaired: false };
  }
  if (
    value >= MIN_FRACTIONAL_LEGEND_OPACITY &&
    value <= MAX_FRACTIONAL_LEGEND_OPACITY
  ) {
    return { opacity: value * 100, isRepaired: true };
  }
  return null;
}

function normalizeLegendEntries(
  value: unknown,
): { entries: ReadonlyArray<LegendEntryState>; isRepaired: boolean } {
  if (!Array.isArray(value)) {
    return { entries: [], isRepaired: true };
  }

  const entries: LegendEntryState[] = [];
  const colors = new Set<string>();
  const orders = new Set<number>();
  let isRepaired = value.length > MAX_STORED_LEGEND_ENTRIES;

  for (const rawEntry of value.slice(0, MAX_STORED_LEGEND_ENTRIES)) {
    if (!isObjectRecord(rawEntry)) {
      isRepaired = true;
      continue;
    }

    const { color, label, order } = rawEntry;
    if (
      typeof color !== 'string' ||
      typeof label !== 'string' ||
      typeof order !== 'number'
    ) {
      isRepaired = true;
      continue;
    }

    const colorResult = normalizeColor(color);
    const trimmedLabel = label.trim();
    if (
      !colorResult.ok ||
      colorResult.value === DEFAULT_COLOR ||
      trimmedLabel.length === 0 ||
      trimmedLabel.length > MAX_LEGEND_LABEL_LENGTH ||
      !Number.isInteger(order) ||
      order < 0 ||
      colors.has(colorResult.value) ||
      orders.has(order)
    ) {
      isRepaired = true;
      continue;
    }

    if (colorResult.value !== color || trimmedLabel !== label) {
      isRepaired = true;
    }

    colors.add(colorResult.value);
    orders.add(order);
    entries.push({ color: colorResult.value, label: trimmedLabel, order });
  }

  const sortedEntries = entries.slice().sort((left, right) => {
    return left.order - right.order || left.color.localeCompare(right.color);
  });
  const normalizedEntries = sortedEntries.map((entry, order) => {
    if (entry.order !== order) {
      isRepaired = true;
    }

    return { ...entry, order };
  });

  return { entries: normalizedEntries, isRepaired };
}

function normalizeLegend(
  value: unknown,
  colors: ColorMap,
): { legend: LegendState; isRepaired: boolean } {
  const fallback = reconcileLegend(
    Object.values(colors),
    createDefaultLegendState(),
  );
  if (!isObjectRecord(value)) {
    return { legend: fallback, isRepaired: true };
  }

  const entriesResult = normalizeLegendEntries(value.entries);
  const positionValue = value.position;
  let position = fallback.position;
  let isPositionRepaired = true;

  if (isObjectRecord(positionValue)) {
    const { x, y, preset } = positionValue;
    const isPresetValid =
      preset === null ||
      (typeof preset === 'string' && LEGEND_CORNERS.has(preset as LegendCorner));

    if (
      typeof x === 'number' &&
      Number.isFinite(x) &&
      x >= MIN_LEGEND_COORDINATE &&
      x <= MAX_LEGEND_COORDINATE &&
      typeof y === 'number' &&
      Number.isFinite(y) &&
      y >= MIN_LEGEND_COORDINATE &&
      y <= MAX_LEGEND_COORDINATE &&
      isPresetValid
    ) {
      position = {
        x,
        y,
        preset: preset as LegendCorner | null,
      };
      isPositionRepaired = false;
    }
  }

  const theme = value.theme;
  const textSize = value.textSize;
  const backgroundOpacity = value.backgroundOpacity;
  const borderStyle = value.borderStyle;
  const isThemeValid =
    typeof theme === 'string' && LEGEND_THEMES.has(theme as LegendTheme);
  const isTextSizeValid =
    typeof textSize === 'string' &&
    LEGEND_TEXT_SIZES.has(textSize as LegendTextSize);
  const opacityResult =
    typeof backgroundOpacity === 'number'
      ? normalizeLegendOpacity(backgroundOpacity)
      : null;
  const isBorderStyleValid =
    typeof borderStyle === 'string' &&
    LEGEND_BORDER_STYLES.has(borderStyle as LegendBorderStyle);

  return {
    legend: {
      entries: entriesResult.entries,
      position,
      theme: isThemeValid ? (theme as LegendTheme) : fallback.theme,
      textSize: isTextSizeValid
        ? (textSize as LegendTextSize)
        : fallback.textSize,
      backgroundOpacity:
        opacityResult !== null
          ? opacityResult.opacity
          : fallback.backgroundOpacity,
      borderStyle: isBorderStyleValid
        ? (borderStyle as LegendBorderStyle)
        : fallback.borderStyle,
    },
    isRepaired:
      entriesResult.isRepaired ||
      isPositionRepaired ||
      !isThemeValid ||
      !isTextSizeValid ||
      opacityResult === null ||
      opacityResult.isRepaired ||
      !isBorderStyleValid,
  };
}

function normalizeComposition(value: unknown): CompositionNormalization {
  if (!isObjectRecord(value)) {
    return {
      outcome: { ok: false, reason: 'invalid-record' },
      snapshot: null,
      isRepaired: false,
    };
  }

  if (
    typeof value.snapshotId !== 'string' ||
    !SNAPSHOT_IDS.has(value.snapshotId)
  ) {
    return {
      outcome: { ok: false, reason: 'snapshot-unavailable' },
      snapshot: null,
      isRepaired: false,
    };
  }

  const colorResult = normalizeColorMap(value.colors);
  const cameraResult = normalizeCamera(value.camera);
  if (colorResult === null || cameraResult === null) {
    return {
      outcome: { ok: false, reason: 'invalid-record' },
      snapshot: null,
      isRepaired: false,
    };
  }

  const legendResult = normalizeLegend(value.legend, colorResult.colors);
  const isSettingsValid =
    isObjectRecord(value.settings) &&
    value.settings.backgroundColor === '#FFFFFF';
  const isRepaired =
    colorResult.isRepaired ||
    cameraResult.isRepaired ||
    legendResult.isRepaired ||
    !isSettingsValid;
  const warnings: CompositionLoadWarning[] = isRepaired
    ? [{ code: 'composition-repaired' }]
    : [];
  const snapshot: CompositionSnapshot = {
    colors: colorResult.colors,
    camera: cameraResult.camera,
    snapshotId: value.snapshotId as SnapshotId,
    legend: legendResult.legend,
    settings: { backgroundColor: '#FFFFFF' },
  };

  return {
    outcome: {
      ok: true,
      value: snapshot,
      sourceVersion: 2,
      warnings,
    },
    snapshot,
    isRepaired,
  };
}

function createLegacyOutcome(
  colors: ColorMap,
): CompositionLoadOutcome & { ok: true } {
  return {
    ok: true,
    value: {
      colors,
      camera: INITIAL_WORLD_CAMERA,
      snapshotId: 'modern',
      legend: reconcileLegend(
        Object.values(colors),
        createDefaultLegendState(),
      ),
      settings: { backgroundColor: '#FFFFFF' },
    },
    sourceVersion: 1,
    warnings: [{ code: 'legacy-migrated' }],
  };
}

function readRecordIdentity(
  value: Record<string, unknown>,
): { name: string; timestamp: number } | null {
  if (typeof value.name !== 'string' || typeof value.timestamp !== 'number') {
    return null;
  }

  const nameResult = validateMapName(value.name);
  if (
    !nameResult.ok ||
    !Number.isFinite(value.timestamp) ||
    value.timestamp < 0
  ) {
    return null;
  }

  return { name: nameResult.value, timestamp: value.timestamp };
}

function inspectStoredRecord(
  value: unknown,
  recordIndex: number,
): ParsedStoredRecord | RejectedStoredRecord {
  if (!isObjectRecord(value)) {
    return {
      name: null,
      loadOutcome: { ok: false, reason: 'invalid-record' },
      recordIndex,
    };
  }

  const identity = readRecordIdentity(value);
  if (identity === null) {
    return {
      name: null,
      loadOutcome: { ok: false, reason: 'invalid-record' },
      recordIndex,
    };
  }

  if (value.schemaVersion === undefined) {
    const colorResult = normalizeColorMap(value.colors);
    if (colorResult === null) {
      return {
        name: identity.name,
        loadOutcome: { ok: false, reason: 'invalid-record' },
        recordIndex,
      };
    }

    const storedRecord: LegacySavedComposition = {
      name: identity.name,
      colors: colorResult.colors,
      timestamp: identity.timestamp,
    };

    return {
      storedRecord,
      map: storedRecord,
      loadOutcome: createLegacyOutcome(colorResult.colors),
      recordIndex,
      hasCorruptWarning: colorResult.isRepaired,
    };
  }

  if (value.schemaVersion !== 2) {
    return {
      name: identity.name,
      loadOutcome: { ok: false, reason: 'unsupported-version' },
      recordIndex,
    };
  }

  const compositionResult = normalizeComposition(value.composition);
  if (!compositionResult.outcome.ok || compositionResult.snapshot === null) {
    return {
      name: identity.name,
      loadOutcome: compositionResult.outcome,
      recordIndex,
    };
  }

  const storedRecord: SavedCompositionV2 = {
    schemaVersion: 2,
    name: identity.name,
    timestamp: identity.timestamp,
    composition: compositionResult.snapshot,
  };

  return {
    storedRecord,
    map: {
      name: identity.name,
      colors: compositionResult.snapshot.colors,
      timestamp: identity.timestamp,
    },
    loadOutcome: compositionResult.outcome,
    recordIndex,
    hasCorruptWarning: compositionResult.isRepaired,
  };
}

function isParsedStoredRecord(
  record: ParsedStoredRecord | RejectedStoredRecord,
): record is ParsedStoredRecord {
  return 'storedRecord' in record;
}

/**
 * A saved camera is written from the live D3 transform, so a view the user
 * reset can differ from `INITIAL_WORLD_CAMERA` in the last float digits. The
 * row label is a human claim, not an identity check, so it tolerates that.
 */
export function isWholeWorldCamera(camera: CameraState): boolean {
  return (
    Math.abs(camera.zoom - INITIAL_WORLD_CAMERA.zoom) <=
      WHOLE_WORLD_ZOOM_EPSILON &&
    Math.abs(camera.centerLongitude - INITIAL_WORLD_CAMERA.centerLongitude) <=
      WHOLE_WORLD_DEGREE_EPSILON &&
    Math.abs(camera.centerLatitude - INITIAL_WORLD_CAMERA.centerLatitude) <=
      WHOLE_WORLD_DEGREE_EPSILON
  );
}

function summarizeStoredRecord(record: ParsedStoredRecord): SavedMapSummary {
  const { storedRecord, loadOutcome } = record;

  if (!loadOutcome.ok || loadOutcome.sourceVersion === 1) {
    return {
      name: storedRecord.name,
      timestamp: storedRecord.timestamp,
      sourceVersion: 1,
      snapshotId: null,
      legendEntryCount: 0,
      isWholeWorldView: true,
    };
  }

  const snapshot = loadOutcome.value;
  return {
    name: storedRecord.name,
    timestamp: storedRecord.timestamp,
    sourceVersion: 2,
    snapshotId: snapshot.snapshotId,
    legendEntryCount: snapshot.legend.entries.length,
    isWholeWorldView: isWholeWorldCamera(snapshot.camera),
  };
}

function parseSavedMaps(
  serialized: string,
  parser: JsonParser,
): ParsedSavedMaps {
  if (serialized.length > MAX_STORAGE_SERIALIZED_LENGTH) {
    return {
      records: [],
      rejectedRecords: [],
      warnings: [createCorruptWarning()],
    };
  }

  let parsed: unknown;
  try {
    parsed = parser(serialized);
  } catch {
    return {
      records: [],
      rejectedRecords: [],
      warnings: [createCorruptWarning()],
    };
  }

  if (!hasSafeJsonBudget(parsed) || !Array.isArray(parsed)) {
    return {
      records: [],
      rejectedRecords: [],
      warnings: [createCorruptWarning()],
    };
  }

  const warnings: StorageWarning[] = [];
  const records: ParsedStoredRecord[] = [];
  const rejectedRecords: RejectedStoredRecord[] = [];
  const normalizedNames = new Set<string>();
  const storedValues = parsed.slice(0, MAX_SAVED_MAPS);

  if (parsed.length > MAX_SAVED_MAPS) {
    warnings.push(createCorruptWarning(MAX_SAVED_MAPS));
  }

  storedValues.forEach((storedValue, recordIndex): void => {
    const inspected = inspectStoredRecord(storedValue, recordIndex);
    const name = isParsedStoredRecord(inspected) ? inspected.map.name : inspected.name;

    if (name !== null && normalizedNames.has(name)) {
      warnings.push(createCorruptWarning(recordIndex));
      return;
    }
    if (name !== null) {
      normalizedNames.add(name);
    }

    if (!isParsedStoredRecord(inspected)) {
      warnings.push(createCorruptWarning(recordIndex));
      rejectedRecords.push(inspected);
      return;
    }

    if (inspected.hasCorruptWarning) {
      warnings.push(createCorruptWarning(recordIndex));
    }
    records.push(inspected);
  });

  return { records, rejectedRecords, warnings };
}

function isQuotaExceededError(error: unknown): boolean {
  return isObjectRecord(error) && error.name === 'QuotaExceededError';
}

function isSavedCompositionV2(
  record: SavedCompositionRecord,
): record is SavedCompositionV2 {
  return 'schemaVersion' in record && record.schemaVersion === 2;
}

function getSelectedWarnings(
  warnings: ReadonlyArray<StorageWarning>,
  recordIndex: number,
): StorageWarning[] {
  return warnings.filter((warning) => warning.recordIndex === recordIndex);
}

export function createStorageAdapter(
  storage: Storage | null = getDefaultStorage(),
  now: () => number = Date.now,
  parser: JsonParser = parseJson,
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

  function readParsedMaps(): StorageResult<ParsedSavedMaps> {
    const readResult = read(STORAGE_KEY);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null) {
      return {
        ok: true,
        value: { records: [], rejectedRecords: [], warnings: [] },
        warnings: [],
      };
    }

    const parsed = parseSavedMaps(readResult.value, parser);
    return { ok: true, value: parsed, warnings: parsed.warnings };
  }

  function list(): StorageResult<ReadonlyArray<SavedMap>> {
    const parsedResult = readParsedMaps();
    if (!parsedResult.ok) {
      return parsedResult;
    }

    return {
      ok: true,
      value: parsedResult.value.records.map(({ map }) => map),
      warnings: parsedResult.warnings,
    };
  }

  function listSummaries(): StorageResult<ReadonlyArray<SavedMapSummary>> {
    const parsedResult = readParsedMaps();
    if (!parsedResult.ok) {
      return parsedResult;
    }

    return {
      ok: true,
      value: parsedResult.value.records.map(summarizeStoredRecord),
      warnings: parsedResult.warnings,
    };
  }

  function writeRecords(
    records: ReadonlyArray<SavedCompositionRecord>,
    warnings: ReadonlyArray<StorageWarning>,
  ): StorageResult<ReadonlyArray<SavedMap>> {
    let serialized: string;

    try {
      serialized = JSON.stringify(records);
    } catch {
      return { ok: false, reason: 'storage-unavailable' };
    }

    if (serialized.length > MAX_STORAGE_SERIALIZED_LENGTH) {
      return { ok: false, reason: 'quota-exceeded' };
    }

    const writeResult = write(STORAGE_KEY, serialized);
    if (!writeResult.ok) {
      return writeResult;
    }

    return {
      ok: true,
      value: records.map((record): SavedMap => {
        return isSavedCompositionV2(record)
          ? {
              name: record.name,
              colors: record.composition.colors,
              timestamp: record.timestamp,
            }
          : record;
      }),
      warnings,
    };
  }

  function save(
    name: string,
    snapshot: CompositionSnapshot,
  ): StorageResult<SaveMapValue> {
    const nameResult = validateMapName(name);
    if (!nameResult.ok) {
      return nameResult;
    }

    const parsedResult = readParsedMaps();
    if (!parsedResult.ok) {
      return parsedResult;
    }

    const compositionResult = normalizeComposition(snapshot);
    if (!compositionResult.outcome.ok || compositionResult.snapshot === null) {
      return { ok: false, reason: 'storage-unavailable' };
    }

    const savedRecord: SavedCompositionV2 = {
      schemaVersion: 2,
      name: nameResult.value,
      timestamp: now(),
      composition: compositionResult.snapshot,
    };
    const replaced = parsedResult.value.records.some(
      ({ map }) => map.name === nameResult.value,
    );
    const storedRecords = [
      savedRecord,
      ...parsedResult.value.records
        .filter(({ map }) => map.name !== nameResult.value)
        .map(({ storedRecord }) => storedRecord),
    ].slice(0, MAX_SAVED_MAPS);
    const warnings = compositionResult.isRepaired
      ? [...parsedResult.warnings, createCorruptWarning()]
      : parsedResult.warnings;
    const writeResult = writeRecords(storedRecords, warnings);

    if (!writeResult.ok) {
      return writeResult;
    }

    const savedMap: SavedMap = {
      name: savedRecord.name,
      colors: savedRecord.composition.colors,
      timestamp: savedRecord.timestamp,
    };

    return {
      ok: true,
      value: { savedMap, savedMaps: writeResult.value, replaced },
      warnings: writeResult.warnings,
    };
  }

  function load(name: string): StorageResult<CompositionLoadOutcome>;
  function load(
    name: string,
    validCountryIds: ReadonlySet<string>,
  ): StorageResult<ColorMap>;
  function load(
    name: string,
    validCountryIds?: ReadonlySet<string>,
  ): StorageResult<CompositionLoadOutcome | ColorMap> {
    const nameResult = validateMapName(name);
    if (!nameResult.ok) {
      return nameResult;
    }

    const parsedResult = readParsedMaps();
    if (!parsedResult.ok) {
      return parsedResult;
    }

    const record = parsedResult.value.records.find(
      ({ map }) => map.name === nameResult.value,
    );
    if (record === undefined) {
      const rejectedRecord = parsedResult.value.rejectedRecords.find(
        ({ name: rejectedName }) => rejectedName === nameResult.value,
      );
      if (rejectedRecord !== undefined && validCountryIds === undefined) {
        return {
          ok: true,
          value: rejectedRecord.loadOutcome,
          warnings: getSelectedWarnings(
            parsedResult.warnings,
            rejectedRecord.recordIndex,
          ),
        };
      }

      return { ok: false, reason: 'map-not-found' };
    }

    const warnings = getSelectedWarnings(
      parsedResult.warnings,
      record.recordIndex,
    );
    if (validCountryIds === undefined) {
      return { ok: true, value: record.loadOutcome, warnings };
    }

    if (!record.loadOutcome.ok) {
      return { ok: false, reason: 'map-not-found' };
    }

    const colorResult = normalizeColorMap(
      record.loadOutcome.value.colors,
      validCountryIds,
    );
    if (colorResult === null) {
      return { ok: false, reason: 'storage-unavailable' };
    }

    if (colorResult.isRepaired && warnings.length === 0) {
      warnings.push(createCorruptWarning(record.recordIndex));
    }

    return { ok: true, value: colorResult.colors, warnings };
  }

  function deleteMap(name: string): StorageResult<ReadonlyArray<SavedMap>> {
    const nameResult = validateMapName(name);
    if (!nameResult.ok) {
      return nameResult;
    }

    const parsedResult = readParsedMaps();
    if (!parsedResult.ok) {
      return parsedResult;
    }

    if (
      !parsedResult.value.records.some(
        ({ map }) => map.name === nameResult.value,
      )
    ) {
      return { ok: false, reason: 'map-not-found' };
    }

    const records = parsedResult.value.records
      .filter(({ map }) => map.name !== nameResult.value)
      .map(({ storedRecord }) => storedRecord);

    return writeRecords(records, parsedResult.warnings);
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

  /**
   * The bound is applied to the RAW string, before the value is interpreted at
   * all. These two keys hold short enum words and are never `JSON.parse`d, so
   * there is no parse to guard - but the rule that stored bytes are untrusted
   * and bounded *first* is the same one, and a preference key is exactly where
   * it would quietly stop being applied.
   */
  function readPreference(key: string): StorageResult<string | null> {
    const readResult = read(key);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null) {
      return { ok: true, value: null, warnings: [] };
    }

    if (readResult.value.length > MAX_PREFERENCE_VALUE_LENGTH) {
      return { ok: true, value: null, warnings: [createCorruptWarning()] };
    }

    return { ok: true, value: readResult.value, warnings: [] };
  }

  function getLastOpenTool(): StorageResult<ToolId | null> {
    const readResult = readPreference(LAST_OPEN_TOOL_KEY);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null || readResult.value === CLOSED_TOOL_VALUE) {
      return { ok: true, value: null, warnings: readResult.warnings };
    }

    if (isToolId(readResult.value)) {
      return { ok: true, value: readResult.value, warnings: [] };
    }

    // An id the rail no longer renders would open a panel with nothing in it.
    return { ok: true, value: null, warnings: [createCorruptWarning()] };
  }

  function setLastOpenTool(tool: ToolId | null): StorageResult<ToolId | null> {
    const writeResult = write(
      LAST_OPEN_TOOL_KEY,
      tool === null ? CLOSED_TOOL_VALUE : tool,
    );
    if (!writeResult.ok) {
      return writeResult;
    }

    return { ok: true, value: tool, warnings: [] };
  }

  function getThemeMode(): StorageResult<EditorThemeMode | null> {
    const readResult = readPreference(THEME_MODE_KEY);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === 'dark' || readResult.value === 'light') {
      return { ok: true, value: readResult.value, warnings: [] };
    }

    // Absent is not corrupt: a returning creator may simply never have chosen.
    return readResult.value === null
      ? { ok: true, value: null, warnings: readResult.warnings }
      : { ok: true, value: null, warnings: [createCorruptWarning()] };
  }

  function setThemeMode(mode: EditorThemeMode): StorageResult<EditorThemeMode> {
    const writeResult = write(THEME_MODE_KEY, mode);
    if (!writeResult.ok) {
      return writeResult;
    }

    return { ok: true, value: mode, warnings: [] };
  }

  return {
    list,
    listSummaries,
    save,
    load,
    delete: deleteMap,
    getOnboardingDismissed,
    dismissOnboarding,
    getLastOpenTool,
    setLastOpenTool,
    getThemeMode,
    setThemeMode,
  };
}
