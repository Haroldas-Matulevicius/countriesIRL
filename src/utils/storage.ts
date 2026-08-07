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
import {
  DEFAULT_COMPOSITION_SETTINGS,
  STROKE_WEIGHTS,
} from '../constants/mapStyle';
import { CLOSED_TOOL_VALUE, isToolId } from '../constants/tools';
import { SNAPSHOT_CATALOG } from '../constants/snapshots';
import type {
  CameraState,
  CompositionLoadOutcome,
  CompositionLoadWarning,
  CompositionSnapshot,
  CompositionTextAlignment,
  CompositionTextSize,
  LegacySavedComposition,
  LegendCorner,
  LegendEntryState,
  LegendForm,
  LegendState,
  LegendTextSize,
  SavedCompositionRecord,
  SavedCompositionV2,
  SavedCompositionV3,
  SnapshotId,
  StrokeWeight,
  VisibleCompositionSettings,
} from '../types/composition';
import type { ColorMap, ColorValue } from '../types/map';
import type {
  EditorThemeMode,
  SavedMap,
  SavedMapSummary,
  StorageResult,
  StorageWarning,
  ToolId,
} from '../types/ui';
import { clampBandHeight } from './bands';
import { repairCameraState } from './camera';
import {
  createEmptyColorMap,
  customColor,
  isColorValue,
  normalizeColor,
  resolveColorMapHexes,
  resolveColorValue,
} from './colors';
import {
  COMPOSITION_TEXT_ALIGNMENTS,
  COMPOSITION_TEXT_SIZES,
  sanitizeCompositionText,
  sanitizeLegendCaption,
} from './compositionText';
import { isSafeStableCountryId } from './countryIds';
import {
  createDefaultLegendState,
  LEGEND_CORNERS,
  LEGEND_FORMS,
  LEGEND_TEXT_SIZES,
  reconcileLegend,
} from './legend';

/*
 * ------------------------------------------------------------------
 * The bounds, and the ORDER they are checked in
 * ------------------------------------------------------------------
 *
 * **The order is the mitigation, not decoration** (T-04-14-01), and `04-14`
 * extended the set without moving a single existing value or step:
 *
 *   1. `MAX_STORAGE_SERIALIZED_LENGTH` on the RAW string, before any parse;
 *   2. `hasSafeJsonBudget` (`MAX_STORAGE_JSON_DEPTH` / `MAX_STORAGE_JSON_NODES`)
 *      on the parsed value, immediately after;
 *   3. the per-field bounds below, during validation.
 *
 * A `try/catch` around `JSON.parse` cannot substitute for step 1: by the time
 * it catches, the synchronous main-thread cost is already paid.
 *
 * Steps 1 and 2 are applied at BOTH sites that touch the serialized form —
 * `parseSavedMaps` on the way in (raw-length, then parse, then budget) and
 * `writeRecords` on the way out (`MAX_STORAGE_SERIALIZED_LENGTH` on the string
 * `JSON.stringify` produced, refused as `quota-exceeded`).
 *
 * ⚠ **A per-field bound cannot rescue the node budget, and that asymmetry is
 * deliberate rather than an oversight.** Step 2 runs over the WHOLE parsed
 * array before any record is validated, so an over-budget store is rejected
 * outright; the caps in step 3 only ever trim a record that already parsed.
 * `04-05` flagged the V3 union as a real budget question because a ramp
 * assignment is an OBJECT per country rather than a string — `storage.test.ts`
 * measures a worst-case 512-entry V3 record against `MAX_STORAGE_JSON_NODES`
 * and pins the measured number, so the headroom is a checked claim.
 */
export const MAX_STORAGE_SERIALIZED_LENGTH = 1_000_000;
export const MAX_STORAGE_JSON_DEPTH = 32;
export const MAX_STORAGE_JSON_NODES = 50_000;

const MAX_STORED_COLOR_ENTRIES = 512;
const MAX_STORED_LEGEND_ENTRIES = 512;
const MAX_LEGEND_LABEL_LENGTH = 32;
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

/**
 * One stored hex -> one custom variant. Keeps V2's exact repair semantics: a
 * non-canonical spelling is a repair, and an effective white is dropped without
 * one only when it was written as the canonical `#FFFFFF`.
 */
function normalizeStoredCustomHex(rawHex: string): {
  value: ColorValue | null;
  isRepaired: boolean;
} {
  const colorResult = normalizeColor(rawHex);
  if (!colorResult.ok) {
    return { value: null, isRepaired: true };
  }

  const isSpellingRepaired = colorResult.value !== rawHex;
  if (colorResult.value === DEFAULT_COLOR) {
    return {
      value: null,
      isRepaired: isSpellingRepaired || rawHex !== DEFAULT_COLOR,
    };
  }

  return {
    value: customColor(colorResult.value),
    isRepaired: isSpellingRepaired,
  };
}

/**
 * D4-02 at the storage boundary.
 *
 * A bare hex STRING is V2's own wire shape, so it is read, not repaired away -
 * this is what `04-14` replaces with lossless V3 records. A union object is a
 * shape this version does not WRITE, and the distinction that matters is
 * exactly that: "a shape this version does not persist" is not corruption, only
 * "a value that is invalid" is. So a well-formed ramp variant is accepted
 * without raising a repair, while an unknown `rampId`, a `t` outside `[0, 1]`,
 * or a non-finite `t` is genuinely corrupt and reported (T-04-05-01).
 *
 * Bounds are untouched by D4-02: `MAX_STORED_COLOR_ENTRIES` still slices the
 * same way, and the pre-parse raw-length check plus `hasSafeJsonBudget` still
 * run in that order, ahead of everything here. `04-14` extends them for V3.
 */
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
    if (!isSafeStableCountryId(countryId)) {
      isRepaired = true;
      continue;
    }

    if (validCountryIds !== undefined && !validCountryIds.has(countryId)) {
      isRepaired = true;
      continue;
    }

    if (typeof rawColor === 'string') {
      const stored = normalizeStoredCustomHex(rawColor);
      isRepaired = isRepaired || stored.isRepaired;
      if (stored.value !== null) {
        colors[countryId] = stored.value;
      }
      continue;
    }

    if (!isColorValue(rawColor)) {
      isRepaired = true;
      continue;
    }

    if (rawColor.kind === 'ramp') {
      colors[countryId] = rawColor;
      continue;
    }

    const stored = normalizeStoredCustomHex(rawColor.hex);
    isRepaired = isRepaired || stored.isRepaired;
    if (stored.value !== null) {
      colors[countryId] = stored.value;
    }
  }

  return { colors, isRepaired };
}

/**
 * The V1/V2 WIRE shape: one canonical hex per country.
 *
 * ⚠ **This is no longer what a save writes.** `04-05` recorded it as a
 * deliberate INTERIM that was lossy in the ramp identity — a ramp-painted map
 * reopened as a custom-hex map that rendered identically but could no longer be
 * re-skinned by switching ramps — and named `04-14` as the plan that replaces
 * it. It is replaced: `save()` writes `toStoredColorMapV3` now.
 *
 * It stays because a V1 or V2 record that is merely re-written (because some
 * OTHER map was saved or deleted) must keep the shape its `schemaVersion`
 * claims. A record is never silently upgraded by reading it — the same rule
 * that has always kept a V1 record V1 until an explicit save replaces it.
 */
function toStoredHexColorMap(colors: ColorMap): Record<string, string> {
  const storedColors: Record<string, string> = Object.create(null) as Record<
    string,
    string
  >;

  for (const [countryId, value] of Object.entries(colors)) {
    if (!isSafeStableCountryId(countryId) || !isColorValue(value)) {
      continue;
    }

    const hex = resolveColorValue(value);
    if (hex !== DEFAULT_COLOR) {
      storedColors[countryId] = hex;
    }
  }

  return storedColors;
}

/**
 * The V3 WIRE shape, and the point of the whole schema bump (D4-02 + D4-17).
 *
 * A ramp assignment persists as the union variant itself, so the RAMP IDENTITY
 * survives a round trip and a reopened map can still be re-skinned. A custom
 * assignment persists as a **bare canonical hex** rather than
 * `{kind:'custom',hex}` — that is V2's own wire shape, `normalizeColorMap`
 * already reads it, and it costs ONE json node per country instead of four.
 * The node budget is why: a union object per country is the real cost `04-05`
 * flagged, and paying it only for the entries that need it is what keeps a
 * worst-case record inside `MAX_STORAGE_JSON_NODES`.
 *
 * The `DEFAULT_COLOR` sentinel is still dropped rather than written: an
 * unpainted country has no assignment, and `settings.uncoloredFill` is what
 * decides how it renders (D4-09).
 */
function toStoredColorMapV3(
  colors: ColorMap,
): Record<string, string | ColorValue> {
  const storedColors: Record<string, string | ColorValue> = Object.create(
    null,
  ) as Record<string, string | ColorValue>;

  for (const [countryId, value] of Object.entries(colors)) {
    if (!isSafeStableCountryId(countryId) || !isColorValue(value)) {
      continue;
    }

    if (value.kind === 'ramp') {
      storedColors[countryId] = value;
      continue;
    }

    const hex = resolveColorValue(value);
    if (hex !== DEFAULT_COLOR) {
      storedColors[countryId] = hex;
    }
  }

  return storedColors;
}

/**
 * V3 persists every Phase 4 field and deliberately OMITS `backgroundColor`.
 *
 * It was V2's record that the composition is opaque; nothing renders from it,
 * `surfaceColor` is the value that actually paints, and the V3 reader ignores
 * it wherever it appears. Writing a field no consumer reads would make the
 * record claim a meaning it does not have.
 */
function toStoredSettings(
  settings: VisibleCompositionSettings,
): Record<string, unknown> {
  return {
    surfaceColor: settings.surfaceColor,
    uncoloredFill: settings.uncoloredFill,
    borderColor: settings.borderColor,
    interiorWeight: settings.interiorWeight,
    coastlineWeight: settings.coastlineWeight,
    topBandVisible: settings.topBandVisible,
    topBandHeight: settings.topBandHeight,
    bottomBandVisible: settings.bottomBandVisible,
    bottomBandHeight: settings.bottomBandHeight,
    title: settings.title,
    titleSize: settings.titleSize,
    subtitle: settings.subtitle,
    subtitleSize: settings.subtitleSize,
    attribution: settings.attribution,
    textAlignment: settings.textAlignment,
  };
}

function toSerializableRecord(record: SavedCompositionRecord): unknown {
  if (isSavedCompositionV3(record)) {
    return {
      schemaVersion: 3,
      name: record.name,
      timestamp: record.timestamp,
      composition: {
        colors: toStoredColorMapV3(record.composition.colors),
        camera: record.composition.camera,
        snapshotId: record.composition.snapshotId,
        legend: record.composition.legend,
        settings: toStoredSettings(record.composition.settings),
      },
    };
  }

  if (isSavedCompositionV2(record)) {
    /*
     * A V2 record that survives a write of some OTHER map keeps the V2 wire
     * shape exactly: hex colours, and the single `backgroundColor` settings
     * field V2 has always carried. The in-memory snapshot now holds a full V3
     * settings object because the READER fills defaults, and spreading that
     * into a `schemaVersion: 2` record would make the bytes claim a version
     * whose shape they do not have — the trap `04-05` named.
     */
    return {
      schemaVersion: 2,
      name: record.name,
      timestamp: record.timestamp,
      composition: {
        colors: toStoredHexColorMap(record.composition.colors),
        camera: record.composition.camera,
        snapshotId: record.composition.snapshotId,
        legend: record.composition.legend,
        settings: { backgroundColor: DEFAULT_COMPOSITION_SETTINGS.backgroundColor },
      },
    };
  }

  return { ...record, colors: toStoredHexColorMap(record.colors) };
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
    resolveColorMapHexes(colors),
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

  /*
   * D4-11 deleted `theme`, `backgroundOpacity`, and `borderStyle` from
   * `LegendState`. A stored V2 record still CARRIES them, and reading them is
   * exactly what this normaliser must not start doing again.
   *
   * ⚠ **Their presence is NOT corruption, and `isRepaired` below deliberately
   * ignores them.** A field this version no longer models is a schema
   * difference, not a damaged value: reporting it would raise
   * `composition-repaired` — and its creator-facing corruption toast — on
   * every single reopened V2 map, for a migration that succeeded. The
   * distinction the validator draws is "field removed by this version" versus
   * "value invalid", and only the second is reported. Both directions are
   * asserted in `storage.test.ts`.
   */
  const textSize = value.textSize;
  const isTextSizeValid =
    typeof textSize === 'string' &&
    LEGEND_TEXT_SIZES.has(textSize as LegendTextSize);

  /*
   * `04-13` — T-04-13-01. Three fields ARRIVE here from untrusted stored JSON,
   * and each draws the same distinction the deleted-field rule above draws:
   *
   * **ABSENT is not corruption.** A V2 record predates all three, so
   * `form === undefined` is a schema difference and resolves to the shipped
   * default (`null` → infer from the colouring technique). Reporting it would
   * raise `composition-repaired` — a creator-facing corruption toast — on every
   * reopened map that was saved before this plan.
   *
   * **PRESENT-BUT-INVALID is corruption.** `form: 'stack'` is a value this
   * version cannot render; left unchecked it produces a legend with neither
   * form's marks, which reaches the PNG as a blank rectangle. Both directions
   * are asserted in `storage.test.ts`.
   */
  const hasForm = 'form' in value && value.form !== undefined;
  const isFormValid =
    !hasForm ||
    value.form === null ||
    (typeof value.form === 'string' &&
      LEGEND_FORMS.has(value.form as LegendForm));
  const form: LegendForm | null =
    hasForm && isFormValid ? (value.form as LegendForm | null) : fallback.form;

  const hasCaption = 'caption' in value && value.caption !== undefined;
  const isCaptionValid = !hasCaption || typeof value.caption === 'string';
  const rawCaption = hasCaption && isCaptionValid ? (value.caption as string) : '';
  const caption = sanitizeLegendCaption(rawCaption);
  // A caption that had to be sanitised WAS damaged — a control character or an
  // over-long value in a stored record is not a schema difference.
  const isCaptionRepaired = !isCaptionValid || caption !== rawCaption;

  const hasShowNoData = 'showNoData' in value && value.showNoData !== undefined;
  const isShowNoDataValid = !hasShowNoData || typeof value.showNoData === 'boolean';
  const showNoData =
    hasShowNoData && isShowNoDataValid
      ? (value.showNoData as boolean)
      : fallback.showNoData;

  return {
    legend: {
      entries: entriesResult.entries,
      position,
      textSize: isTextSizeValid
        ? (textSize as LegendTextSize)
        : fallback.textSize,
      form,
      caption,
      showNoData,
    },
    isRepaired:
      entriesResult.isRepaired ||
      isPositionRepaired ||
      !isTextSizeValid ||
      !isFormValid ||
      isCaptionRepaired ||
      !isShowNoDataValid,
  };
}

interface StoredFieldResult<T> {
  value: T;
  isRepaired: boolean;
}

/**
 * The three-way rule every V3 settings field follows, in one place so no field
 * grows its own variant of it (D4-17, and the mirror of `04-12`'s legend rule):
 *
 * | Stored | Outcome |
 * |---|---|
 * | **absent** | the default, **no repair** — a V2 record predates every one of
 *   these fields, and reporting their absence would raise
 *   `composition-repaired` and its creator-facing corruption toast on **every**
 *   reopened saved map, for a migration that SUCCEEDED |
 * | present and valid | kept |
 * | present and invalid | the default (or the clamped/sanitised value), **and
 *   reported** — a value that had to be changed WAS damaged |
 *
 * "Field removed or added by V3" versus "value invalid": only the second is
 * corruption.
 */
function readStoredHex(
  raw: unknown,
  fallback: string,
): StoredFieldResult<string> {
  if (raw === undefined) {
    return { value: fallback, isRepaired: false };
  }
  if (typeof raw !== 'string') {
    return { value: fallback, isRepaired: true };
  }

  const colorResult = normalizeColor(raw);
  return colorResult.ok
    ? { value: colorResult.value, isRepaired: colorResult.value !== raw }
    : { value: fallback, isRepaired: true };
}

function readStoredMember<T extends string>(
  raw: unknown,
  allowed: ReadonlySet<T>,
  fallback: T,
): StoredFieldResult<T> {
  if (raw === undefined) {
    return { value: fallback, isRepaired: false };
  }

  return typeof raw === 'string' && allowed.has(raw as T)
    ? { value: raw as T, isRepaired: false }
    : { value: fallback, isRepaired: true };
}

function readStoredBoolean(
  raw: unknown,
  fallback: boolean,
): StoredFieldResult<boolean> {
  if (raw === undefined) {
    return { value: fallback, isRepaired: false };
  }

  return typeof raw === 'boolean'
    ? { value: raw, isRepaired: false }
    : { value: fallback, isRepaired: true };
}

/**
 * T-04-14-03. A band height reaches `resolveBandExtents`, which decides the
 * legend's inset and therefore exported pixels, so an out-of-range stored value
 * is degenerate geometry rather than a cosmetic wrinkle. `clampBandHeight` is
 * the ONE clamp; this does not re-derive `[0, BAND_MAX_HEIGHT]`.
 */
function readStoredBandHeight(
  raw: unknown,
  fallback: number,
): StoredFieldResult<number> {
  if (raw === undefined) {
    return { value: fallback, isRepaired: false };
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return { value: fallback, isRepaired: true };
  }

  const clamped = clampBandHeight(raw);
  return { value: clamped, isRepaired: clamped !== raw };
}

/**
 * T-04-14-03, the text half.
 *
 * The bound is `MAX_COMPOSITION_TEXT_LENGTH` through `sanitizeCompositionText`
 * — the SAME bound and the same sanitiser the composition reducer applies — and
 * that is a deliberate choice over `characterBoundFor`'s per-role line bounds.
 * `compositionText.ts` records that the product **refuses rather than
 * truncates** past a role bound: a creator can hold an over-bound title in
 * state, watch the counter turn destructive, and be told to shorten it, while
 * `getCompositionTextBlockingMessage` blocks the export. Truncating here would
 * silently clip that title on the way through storage, destroy the creator's
 * words, and convert a legible refusal into invisible damage. A storage bound
 * that disagrees with the state boundary's bound also means a value no longer
 * round-trips.
 */
function readStoredText(raw: unknown): StoredFieldResult<string> {
  if (raw === undefined) {
    return { value: DEFAULT_COMPOSITION_SETTINGS.title, isRepaired: false };
  }
  if (typeof raw !== 'string') {
    return { value: DEFAULT_COMPOSITION_SETTINGS.title, isRepaired: true };
  }

  const sanitized = sanitizeCompositionText(raw);
  return { value: sanitized, isRepaired: sanitized !== raw };
}

/**
 * D4-17's migration, and the reason it is a migration rather than a rejection.
 *
 * V2's validator REQUIRED `settings.backgroundColor === '#FFFFFF'` and flagged
 * the whole record repaired otherwise. Keeping that would have fired a
 * corruption toast on reopened maps for a field V3 does not persist at all, so
 * `backgroundColor` is now read and DISCARDED — exactly as `04-12` made the
 * three deleted legend chrome fields read and discarded. Its absence, its
 * presence, and any value it holds are all silent.
 */
function normalizeSettings(
  value: unknown,
): StoredFieldResult<VisibleCompositionSettings> {
  const defaults = DEFAULT_COMPOSITION_SETTINGS;

  if (value === undefined) {
    return { value: defaults, isRepaired: false };
  }
  if (!isObjectRecord(value)) {
    return { value: defaults, isRepaired: true };
  }

  const surfaceColor = readStoredHex(value.surfaceColor, defaults.surfaceColor);
  const uncoloredFill = readStoredHex(
    value.uncoloredFill,
    defaults.uncoloredFill,
  );
  const borderColor = readStoredHex(value.borderColor, defaults.borderColor);
  const interiorWeight = readStoredMember<StrokeWeight>(
    value.interiorWeight,
    STROKE_WEIGHTS,
    defaults.interiorWeight,
  );
  const coastlineWeight = readStoredMember<StrokeWeight>(
    value.coastlineWeight,
    STROKE_WEIGHTS,
    defaults.coastlineWeight,
  );
  const topBandVisible = readStoredBoolean(
    value.topBandVisible,
    defaults.topBandVisible,
  );
  const topBandHeight = readStoredBandHeight(
    value.topBandHeight,
    defaults.topBandHeight,
  );
  const bottomBandVisible = readStoredBoolean(
    value.bottomBandVisible,
    defaults.bottomBandVisible,
  );
  const bottomBandHeight = readStoredBandHeight(
    value.bottomBandHeight,
    defaults.bottomBandHeight,
  );
  const title = readStoredText(value.title);
  const titleSize = readStoredMember<CompositionTextSize>(
    value.titleSize,
    COMPOSITION_TEXT_SIZES,
    defaults.titleSize,
  );
  const subtitle = readStoredText(value.subtitle);
  const subtitleSize = readStoredMember<CompositionTextSize>(
    value.subtitleSize,
    COMPOSITION_TEXT_SIZES,
    defaults.subtitleSize,
  );
  const attribution = readStoredText(value.attribution);
  const textAlignment = readStoredMember<CompositionTextAlignment>(
    value.textAlignment,
    COMPOSITION_TEXT_ALIGNMENTS,
    defaults.textAlignment,
  );

  const fields = [
    surfaceColor,
    uncoloredFill,
    borderColor,
    interiorWeight,
    coastlineWeight,
    topBandVisible,
    topBandHeight,
    bottomBandVisible,
    bottomBandHeight,
    title,
    titleSize,
    subtitle,
    subtitleSize,
    attribution,
    textAlignment,
  ];

  return {
    value: {
      backgroundColor: defaults.backgroundColor,
      surfaceColor: surfaceColor.value,
      uncoloredFill: uncoloredFill.value,
      borderColor: borderColor.value,
      interiorWeight: interiorWeight.value,
      coastlineWeight: coastlineWeight.value,
      topBandVisible: topBandVisible.value,
      topBandHeight: topBandHeight.value,
      bottomBandVisible: bottomBandVisible.value,
      bottomBandHeight: bottomBandHeight.value,
      title: title.value,
      titleSize: titleSize.value,
      subtitle: subtitle.value,
      subtitleSize: subtitleSize.value,
      attribution: attribution.value,
      textAlignment: textAlignment.value,
    },
    isRepaired: fields.some((field) => field.isRepaired),
  };
}

function normalizeComposition(
  value: unknown,
  sourceVersion: 2 | 3,
): CompositionNormalization {
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
  const settingsResult = normalizeSettings(value.settings);
  const isRepaired =
    colorResult.isRepaired ||
    cameraResult.isRepaired ||
    legendResult.isRepaired ||
    settingsResult.isRepaired;
  const warnings: CompositionLoadWarning[] = isRepaired
    ? [{ code: 'composition-repaired' }]
    : [];
  const snapshot: CompositionSnapshot = {
    colors: colorResult.colors,
    camera: cameraResult.camera,
    snapshotId: value.snapshotId as SnapshotId,
    legend: legendResult.legend,
    settings: settingsResult.value,
  };

  return {
    outcome: {
      ok: true,
      value: snapshot,
      sourceVersion,
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
        resolveColorMapHexes(colors),
        createDefaultLegendState(),
      ),
      settings: DEFAULT_COMPOSITION_SETTINGS,
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

  /*
   * D4-17 — a `3` branch BESIDE the `2` branch, never instead of it.
   *
   * One rendering path, no legacy mode: a V2 record is read and upgraded **in
   * memory** to the V3 snapshot shape, which is what every render path
   * consumes. The V2 branch is what makes that possible, so it is kept; a
   * creator's saved maps must still open. Only the bytes it WRITES change.
   */
  if (value.schemaVersion !== 2 && value.schemaVersion !== 3) {
    return {
      name: identity.name,
      loadOutcome: { ok: false, reason: 'unsupported-version' },
      recordIndex,
    };
  }

  const schemaVersion = value.schemaVersion;
  const compositionResult = normalizeComposition(
    value.composition,
    schemaVersion,
  );
  if (!compositionResult.outcome.ok || compositionResult.snapshot === null) {
    return {
      name: identity.name,
      loadOutcome: compositionResult.outcome,
      recordIndex,
    };
  }

  const storedRecord: SavedCompositionV2 | SavedCompositionV3 =
    schemaVersion === 3
      ? {
          schemaVersion: 3,
          name: identity.name,
          timestamp: identity.timestamp,
          composition: compositionResult.snapshot,
        }
      : {
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
    sourceVersion: loadOutcome.sourceVersion,
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

/**
 * KEPT, not replaced. A V2 record must stay readable and re-writable in its own
 * shape — that is the whole point of one-path loading (D4-17).
 */
function isSavedCompositionV2(
  record: SavedCompositionRecord,
): record is SavedCompositionV2 {
  return 'schemaVersion' in record && record.schemaVersion === 2;
}

function isSavedCompositionV3(
  record: SavedCompositionRecord,
): record is SavedCompositionV3 {
  return 'schemaVersion' in record && record.schemaVersion === 3;
}

function hasCompositionSnapshot(
  record: SavedCompositionRecord,
): record is SavedCompositionV2 | SavedCompositionV3 {
  return isSavedCompositionV2(record) || isSavedCompositionV3(record);
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
      serialized = JSON.stringify(records.map(toSerializableRecord));
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
        return hasCompositionSnapshot(record)
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

    const compositionResult = normalizeComposition(snapshot, 3);
    if (!compositionResult.outcome.ok || compositionResult.snapshot === null) {
      return { ok: false, reason: 'storage-unavailable' };
    }

    const savedRecord: SavedCompositionV3 = {
      schemaVersion: 3,
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
