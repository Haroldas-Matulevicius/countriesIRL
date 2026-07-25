import { DEFAULT_COLOR } from '../constants/colors';
import type {
  EffectiveScene,
  LegendCorner,
  LegendEntryState,
  LegendPosition,
  LegendState,
  LegendTextSize,
} from '../types/composition';
import type { ColorMap } from '../types/map';
import { normalizeColor } from './colors';
import { getEffectiveSceneColors } from './scene';

const LEGEND_CANVAS_SIZE = 1080;
const LEGEND_SAFE_INSET = 32;
const LEGEND_INTERNAL_PADDING = 24;
const LEGEND_COLUMN_GAP = 24;
const LEGEND_COLUMN_WIDTH = 288;
const LEGEND_ENTRY_GAP = 8;
const LEGEND_ENTRY_HEIGHT = 48;
const LEGEND_TWO_LINE_HEIGHT = 64;
const LEGEND_LABEL_MAX_LENGTH = 32;
const LEGEND_MAX_ACTIVE_ENTRIES = 30;
const LEGEND_SMALL_NUDGE = 8;
const LEGEND_LARGE_NUDGE = 32;
const BACKGROUND_OPACITY_MIN = 0.7;
const BACKGROUND_OPACITY_MAX = 1;
const BACKGROUND_OPACITY_STEP = 0.05;

const LEGEND_THEMES = new Set(['light', 'dark', 'soft']);
const LEGEND_TEXT_SIZES = new Set(['small', 'medium', 'large']);
const LEGEND_BORDER_STYLES = new Set(['none', 'hairline', 'strong']);
const LEGEND_CORNERS = new Set([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

const LABEL_CHARACTERS_PER_LINE: Readonly<Record<LegendTextSize, number>> = {
  small: 24,
  medium: 18,
  large: 14,
};

export interface LegendBounds {
  readonly width: number;
  readonly height: number;
}

export type LegendNudgeDirection = 'up' | 'right' | 'down' | 'left';
export type LegendNudgeSize = 'small' | 'large';

export interface LegendLayoutItem {
  readonly entry: LegendEntryState;
  readonly column: number;
  readonly row: number;
  readonly x: number;
  readonly y: number;
  readonly height: number;
}

export interface LegendLayout {
  readonly columns: number;
  readonly effectiveTextSize: LegendTextSize;
  readonly width: number;
  readonly height: number;
  readonly items: ReadonlyArray<LegendLayoutItem>;
}

export type LegendValidationIssue =
  | { readonly code: 'too-many-active-colors' }
  | { readonly code: 'invalid-entry-color'; readonly path: string }
  | { readonly code: 'duplicate-entry-color'; readonly path: string }
  | { readonly code: 'missing-active-color'; readonly color: string }
  | { readonly code: 'invalid-label'; readonly path: string }
  | { readonly code: 'label-does-not-fit'; readonly path: string }
  | { readonly code: 'invalid-order'; readonly path: string }
  | { readonly code: 'duplicate-order'; readonly path: string }
  | { readonly code: 'invalid-theme'; readonly path: 'theme' }
  | { readonly code: 'invalid-text-size'; readonly path: 'textSize' }
  | {
      readonly code: 'invalid-background-opacity';
      readonly path: 'backgroundOpacity';
    }
  | { readonly code: 'invalid-border-style'; readonly path: 'borderStyle' }
  | { readonly code: 'invalid-position'; readonly path: 'position' };

export type LegendValidationResult =
  | {
      readonly ok: true;
      readonly activeEntries: ReadonlyArray<LegendEntryState>;
    }
  | {
      readonly ok: false;
      readonly issues: ReadonlyArray<LegendValidationIssue>;
    };

function getCanonicalActiveColors(
  effectiveColors: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const activeColors: string[] = [];
  const seenColors = new Set<string>();

  for (const rawColor of effectiveColors) {
    const colorResult = normalizeColor(rawColor);
    if (
      colorResult.ok &&
      colorResult.value !== DEFAULT_COLOR &&
      !seenColors.has(colorResult.value)
    ) {
      seenColors.add(colorResult.value);
      activeColors.push(colorResult.value);
    }
  }

  return activeColors;
}

function compareLegendEntries(
  left: LegendEntryState,
  right: LegendEntryState,
): number {
  return left.order - right.order || left.color.localeCompare(right.color);
}

function getLegendColumnCount(entryCount: number): number {
  if (entryCount <= 0) {
    return 0;
  }
  if (entryCount <= 8) {
    return 1;
  }
  if (entryCount <= 16) {
    return 2;
  }
  return 3;
}

function getEffectiveTextSize(
  entryCount: number,
  requestedTextSize: LegendTextSize,
): LegendTextSize {
  return entryCount >= 17 ? 'small' : requestedTextSize;
}

function getLabelLineCount(label: string, textSize: LegendTextSize): number {
  return Math.ceil(label.length / LABEL_CHARACTERS_PER_LINE[textSize]);
}

function isLabelValid(label: string): boolean {
  return label.trim().length > 0 && label.length <= LEGEND_LABEL_MAX_LENGTH;
}

function isBackgroundOpacityValid(backgroundOpacity: number): boolean {
  if (
    !Number.isFinite(backgroundOpacity) ||
    backgroundOpacity < BACKGROUND_OPACITY_MIN ||
    backgroundOpacity > BACKGROUND_OPACITY_MAX
  ) {
    return false;
  }

  const steps =
    (backgroundOpacity - BACKGROUND_OPACITY_MIN) / BACKGROUND_OPACITY_STEP;
  return Math.abs(steps - Math.round(steps)) < Number.EPSILON * 10;
}

function isBoundsValid(bounds: LegendBounds): boolean {
  return (
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width >= 0 &&
    bounds.height >= 0 &&
    bounds.width <= LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET * 2 &&
    bounds.height <= LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET * 2
  );
}

function isPositionValid(
  position: LegendPosition,
  bounds: LegendBounds,
): boolean {
  if (
    !isBoundsValid(bounds) ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    (position.preset !== null && !LEGEND_CORNERS.has(position.preset))
  ) {
    return false;
  }

  const maximumX = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.width;
  const maximumY = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.height;

  return (
    position.x >= LEGEND_SAFE_INSET &&
    position.x <= maximumX &&
    position.y >= LEGEND_SAFE_INSET &&
    position.y <= maximumY
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampLegendPosition(
  position: LegendPosition,
  bounds: LegendBounds,
): LegendPosition {
  const maximumX = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.width;
  const maximumY = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.height;

  return {
    x: clamp(position.x, LEGEND_SAFE_INSET, maximumX),
    y: clamp(position.y, LEGEND_SAFE_INSET, maximumY),
    preset: position.preset,
  };
}

export function createDefaultLegendState(): LegendState {
  return {
    entries: [],
    position: {
      x: LEGEND_SAFE_INSET,
      y: LEGEND_SAFE_INSET,
      preset: 'top-right',
    },
    theme: 'light',
    textSize: 'medium',
    backgroundOpacity: 0.9,
    borderStyle: 'hairline',
  };
}

export function reconcileLegend(
  effectiveColors: ReadonlyArray<string>,
  previous: LegendState,
): LegendState {
  const activeColors = getCanonicalActiveColors(effectiveColors);
  const nextEntries = previous.entries.map((entry) => ({ ...entry }));
  const existingColors = new Set(nextEntries.map((entry) => entry.color));
  let nextOrder = nextEntries.reduce(
    (maximum, entry) =>
      Number.isInteger(entry.order) ? Math.max(maximum, entry.order) : maximum,
    -1,
  );

  for (const color of activeColors) {
    if (!existingColors.has(color)) {
      nextOrder += 1;
      nextEntries.push({ color, label: color, order: nextOrder });
      existingColors.add(color);
    }
  }

  return {
    ...previous,
    entries: nextEntries,
    position: { ...previous.position },
  };
}

export function reconcileLegendForScene(
  scene: EffectiveScene,
  colors: ColorMap,
  previous: LegendState,
): LegendState {
  return reconcileLegend(getEffectiveSceneColors(scene, colors), previous);
}

export function getActiveLegendEntries(
  effectiveColors: ReadonlyArray<string>,
  legend: LegendState,
): ReadonlyArray<LegendEntryState> {
  const activeColors = new Set(getCanonicalActiveColors(effectiveColors));

  return legend.entries
    .filter((entry) => activeColors.has(entry.color))
    .slice()
    .sort(compareLegendEntries);
}

export function moveLegendEntry(
  legend: LegendState,
  color: string,
  targetIndex: number,
): LegendState {
  const colorResult = normalizeColor(color);
  if (!colorResult.ok || colorResult.value === DEFAULT_COLOR) {
    return legend;
  }

  const sortedEntries = legend.entries.slice().sort(compareLegendEntries);
  const currentIndex = sortedEntries.findIndex(
    (entry) => entry.color === colorResult.value,
  );
  if (currentIndex < 0 || !Number.isFinite(targetIndex)) {
    return legend;
  }

  const [entry] = sortedEntries.splice(currentIndex, 1);
  const nextIndex = clamp(
    Math.trunc(targetIndex),
    0,
    sortedEntries.length,
  );
  sortedEntries.splice(nextIndex, 0, entry);

  return {
    ...legend,
    entries: sortedEntries.map((sortedEntry, order) => ({
      ...sortedEntry,
      order,
    })),
    position: { ...legend.position },
  };
}

export function createLegendLayout(
  entries: ReadonlyArray<LegendEntryState>,
  requestedTextSize: LegendTextSize,
): LegendLayout {
  const sortedEntries = entries.slice().sort(compareLegendEntries);
  const columns = getLegendColumnCount(sortedEntries.length);
  const effectiveTextSize = getEffectiveTextSize(
    sortedEntries.length,
    requestedTextSize,
  );

  if (columns === 0) {
    return {
      columns,
      effectiveTextSize,
      width: 0,
      height: 0,
      items: [],
    };
  }

  const rowsPerColumn = Math.ceil(sortedEntries.length / columns);
  const columnHeights = Array.from(
    { length: columns },
    () => LEGEND_INTERNAL_PADDING,
  );
  const columnRows = Array.from({ length: columns }, () => 0);
  const items = sortedEntries.map((entry, index): LegendLayoutItem => {
    const column = Math.floor(index / rowsPerColumn);
    const row = columnRows[column];
    const lineCount = getLabelLineCount(entry.label, effectiveTextSize);
    const height = lineCount > 1 ? LEGEND_TWO_LINE_HEIGHT : LEGEND_ENTRY_HEIGHT;
    const item = {
      entry,
      column,
      row,
      x:
        LEGEND_INTERNAL_PADDING +
        column * (LEGEND_COLUMN_WIDTH + LEGEND_COLUMN_GAP),
      y: columnHeights[column],
      height,
    };

    columnRows[column] += 1;
    columnHeights[column] += height + LEGEND_ENTRY_GAP;
    return item;
  });
  const contentHeight = Math.max(...columnHeights) - LEGEND_ENTRY_GAP;

  return {
    columns,
    effectiveTextSize,
    width:
      LEGEND_INTERNAL_PADDING * 2 +
      columns * LEGEND_COLUMN_WIDTH +
      (columns - 1) * LEGEND_COLUMN_GAP,
    height: contentHeight + LEGEND_INTERNAL_PADDING,
    items,
  };
}

export function getLegendCornerPosition(
  corner: LegendCorner,
  bounds: LegendBounds,
): LegendPosition {
  const maximumX = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.width;
  const maximumY = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.height;

  return {
    x: corner.endsWith('right') ? maximumX : LEGEND_SAFE_INSET,
    y: corner.startsWith('bottom') ? maximumY : LEGEND_SAFE_INSET,
    preset: corner,
  };
}

export function nudgeLegendPosition(
  position: LegendPosition,
  direction: LegendNudgeDirection,
  bounds: LegendBounds,
  size: LegendNudgeSize = 'small',
): LegendPosition {
  const distance = size === 'large' ? LEGEND_LARGE_NUDGE : LEGEND_SMALL_NUDGE;
  const deltaX = direction === 'left' ? -distance : direction === 'right' ? distance : 0;
  const deltaY = direction === 'up' ? -distance : direction === 'down' ? distance : 0;

  return clampLegendPosition(
    {
      x: position.x + deltaX,
      y: position.y + deltaY,
      preset: null,
    },
    bounds,
  );
}

export function validateLegend(
  legend: LegendState,
  effectiveColors: ReadonlyArray<string>,
  bounds: LegendBounds,
): LegendValidationResult {
  const issues: LegendValidationIssue[] = [];
  const activeColors = getCanonicalActiveColors(effectiveColors);
  const entryColors = new Set<string>();
  const entryOrders = new Set<number>();
  const isTextSizeValid = LEGEND_TEXT_SIZES.has(legend.textSize);

  if (activeColors.length > LEGEND_MAX_ACTIVE_ENTRIES) {
    issues.push({ code: 'too-many-active-colors' });
  }

  legend.entries.forEach((entry, index): void => {
    const colorPath = `entries[${index}].color`;
    const labelPath = `entries[${index}].label`;
    const orderPath = `entries[${index}].order`;
    const colorResult = normalizeColor(entry.color);
    const isCanonicalEntryColor =
      colorResult.ok &&
      colorResult.value !== DEFAULT_COLOR &&
      colorResult.value === entry.color;

    if (!isCanonicalEntryColor) {
      issues.push({ code: 'invalid-entry-color', path: colorPath });
    } else if (entryColors.has(entry.color)) {
      issues.push({ code: 'duplicate-entry-color', path: colorPath });
    } else {
      entryColors.add(entry.color);
    }

    if (!isLabelValid(entry.label)) {
      issues.push({ code: 'invalid-label', path: labelPath });
    } else if (
      isTextSizeValid &&
      getLabelLineCount(entry.label, legend.textSize) > 2
    ) {
      issues.push({ code: 'label-does-not-fit', path: labelPath });
    }

    if (!Number.isInteger(entry.order) || entry.order < 0) {
      issues.push({ code: 'invalid-order', path: orderPath });
    } else if (entryOrders.has(entry.order)) {
      issues.push({ code: 'duplicate-order', path: orderPath });
    } else {
      entryOrders.add(entry.order);
    }
  });

  for (const activeColor of activeColors) {
    if (!entryColors.has(activeColor)) {
      issues.push({ code: 'missing-active-color', color: activeColor });
    }
  }

  if (!LEGEND_THEMES.has(legend.theme)) {
    issues.push({ code: 'invalid-theme', path: 'theme' });
  }
  if (!isTextSizeValid) {
    issues.push({ code: 'invalid-text-size', path: 'textSize' });
  }
  if (!isBackgroundOpacityValid(legend.backgroundOpacity)) {
    issues.push({
      code: 'invalid-background-opacity',
      path: 'backgroundOpacity',
    });
  }
  if (!LEGEND_BORDER_STYLES.has(legend.borderStyle)) {
    issues.push({ code: 'invalid-border-style', path: 'borderStyle' });
  }
  if (!isPositionValid(legend.position, bounds)) {
    issues.push({ code: 'invalid-position', path: 'position' });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    activeEntries: getActiveLegendEntries(activeColors, legend),
  };
}

/**
 * Validates the legend exactly as the exporter will render it: only the entries
 * whose color is still active in the scene, with the stored 0-100 background
 * opacity converted to the 0-1 ratio the renderer uses.
 *
 * Both the export gate and the Legend editor call this so a collapsed editor can
 * never leave a stale verdict behind.
 */
export function validateActiveLegend(
  legend: LegendState,
  effectiveColors: ReadonlyArray<string>,
  bounds: LegendBounds,
): LegendValidationResult {
  return validateLegend(
    {
      ...legend,
      entries: getActiveLegendEntries(effectiveColors, legend),
      backgroundOpacity: legend.backgroundOpacity / 100,
    },
    effectiveColors,
    bounds,
  );
}

export function validateLegendForScene(
  legend: LegendState,
  scene: EffectiveScene,
  colors: ColorMap,
  bounds: LegendBounds,
): LegendValidationResult {
  return validateLegend(
    legend,
    getEffectiveSceneColors(scene, colors),
    bounds,
  );
}
