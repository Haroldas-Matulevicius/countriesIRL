import { DEFAULT_COLOR } from '../constants/colors';
import type {
  LegendCorner,
  LegendEntryState,
  LegendPosition,
  LegendState,
  LegendTextSize,
} from '../types/composition';
import type { BandExtents } from './bands';
import { normalizeColor } from './colors';

const LEGEND_CANVAS_SIZE = 1080;
/**
 * The inset every composition edge shares.
 *
 * Exported since `04-11`: the title, the subtitle, and the attribution align on
 * the SAME left rule the legend does, and two 32s in two modules is how they
 * stop agreeing. `compositionText.ts` re-exports it as `TEXT_SAFE_INSET` rather
 * than declaring a second literal.
 */
export const LEGEND_SAFE_INSET = 32;
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

/**
 * The single legend default. `top-left` is the only preset whose coordinates
 * are bounds-independent (32,32 is valid for every legend that fits the
 * canvas), so the stored value can never contradict its own preset.
 */
export const DEFAULT_LEGEND_POSITION: LegendPosition = Object.freeze({
  x: LEGEND_SAFE_INSET,
  y: LEGEND_SAFE_INSET,
  preset: 'top-left',
});

// The one home for the legend vocabulary. Storage validation and the
// composition reducer import these; a value added in only one place is a drift
// bug, not a feature.
//
// D4-11 removed `LEGEND_THEMES` and `LEGEND_BORDER_STYLES` outright: the
// legend has no box chrome, so there is no theme and no border to name.
export const LEGEND_TEXT_SIZES: ReadonlySet<LegendTextSize> = new Set([
  'small',
  'medium',
  'large',
]);
export const LEGEND_CORNERS: ReadonlySet<LegendCorner> = new Set([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

/**
 * The ONE characters-per-line table (OQ-5) — `LegendOverlay` imports this;
 * a second copy under another name is the drift hazard that clips the PNG.
 *
 * Re-derived for Inter at weight 600 (D-25) from the WORST-CASE advance width,
 * measured in installed Chrome 151 from the vendored
 * `src/assets/inter-latin-variable.woff2` via canvas `measureText`:
 * the widest common character is `W` at 1.0202em (24.484px @ 24px,
 * 32.645px @ 32px, 40.806px @ 40px). The label column offers
 * 288 (column) − 24 (swatch) − 16 (gap) = 248px, so each value is
 * `floor(248 / advance)`: 10 / 7 / 6. A full line of the widest common
 * character therefore CANNOT overflow the legend box — overflow clipping the
 * exported PNG is a defect this project has already shipped once, and these
 * deliberately conservative values make it unrepresentable rather than
 * merely unlikely. The old table ({ 24, 18, 14 }) was derived against a
 * system fallback's average advance and let a wide line clip.
 */
export const LEGEND_CHARACTERS_PER_LINE: Readonly<
  Record<LegendTextSize, number>
> = {
  small: 10,
  medium: 7,
  large: 6,
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
  | { readonly code: 'invalid-text-size'; readonly path: 'textSize' }
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
  return Math.ceil(label.length / LEGEND_CHARACTERS_PER_LINE[textSize]);
}

function isLabelValid(label: string): boolean {
  return label.trim().length > 0 && label.length <= LEGEND_LABEL_MAX_LENGTH;
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

export function clampLegendPosition(
  position: LegendPosition,
  bounds: LegendBounds,
): LegendPosition {
  const maximumX = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.width;
  const maximumY = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.height;

  return {
    x: clamp(
      Number.isFinite(position.x) ? position.x : LEGEND_SAFE_INSET,
      LEGEND_SAFE_INSET,
      Math.max(LEGEND_SAFE_INSET, maximumX),
    ),
    y: clamp(
      Number.isFinite(position.y) ? position.y : LEGEND_SAFE_INSET,
      LEGEND_SAFE_INSET,
      Math.max(LEGEND_SAFE_INSET, maximumY),
    ),
    preset: position.preset,
  };
}

export function createDefaultLegendState(): LegendState {
  return {
    entries: [],
    position: { ...DEFAULT_LEGEND_POSITION },
    textSize: 'medium',
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

/**
 * D4-13 — where a corner preset actually sits, and the ONE place the band
 * height reaches the legend.
 *
 * A top-anchored preset is inset by `LEGEND_SAFE_INSET + bandExtents.top`, and
 * a bottom-anchored one by `LEGEND_SAFE_INSET + bandExtents.bottom`. At the
 * Phase 4 defaults that puts `top-left` at `{x: 32, y: 152}` — **14 % down the
 * square, below the title block, hugging the left edge**, which is where the
 * owner's Eurostat reference puts its legend. `04-11` measured the title
 * baseline at 76 and asked whether the legend belongs beside the title or
 * under it; under it is the answer, and 152 clears 76 comfortably.
 *
 * **Derived, never a hard-coded `y = 152`,** for three reasons that a literal
 * cannot give: it fixes BOTH top presets rather than only the default one; the
 * legend can never collide with a band a creator has grown to the 154 cap; and
 * it stays a pure function of composition state, so it is `node`-testable with
 * no DOM.
 *
 * `bandExtents` comes from `resolveBandExtents` (`utils/bands.ts`) and is a
 * REQUIRED argument on purpose. A defaulted `{top: 0, bottom: 0}` would let a
 * call site silently opt out of the inset and render a legend under the band —
 * exactly the drift `04-UI-SPEC.md` § 6.7 names — and the compiler is the only
 * thing that catches that reliably.
 *
 * **`x` is untouched.** A band spans the full width, so it constrains the
 * vertical axis only; the left rule stays the 32 the title, the subtitle, and
 * the attribution align on.
 *
 * The inset is clamped into the legal range for the current bounds, so a
 * legend tall enough that `32 + 154` would push it off the bottom is still
 * inside the square. The clamp cannot lift it above `LEGEND_SAFE_INSET`.
 */
export function getLegendCornerPosition(
  corner: LegendCorner,
  bounds: LegendBounds,
  bandExtents: BandExtents,
): LegendPosition {
  const maximumX = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.width;
  const maximumY = LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.height;
  const topInset = LEGEND_SAFE_INSET + bandExtents.top;
  const bottomInset = maximumY - bandExtents.bottom;

  return {
    x: corner.endsWith('right') ? maximumX : LEGEND_SAFE_INSET,
    y: corner.startsWith('bottom')
      ? clamp(bottomInset, LEGEND_SAFE_INSET, Math.max(LEGEND_SAFE_INSET, maximumY))
      : clamp(topInset, LEGEND_SAFE_INSET, Math.max(LEGEND_SAFE_INSET, maximumY)),
    preset: corner,
  };
}

/**
 * The single chokepoint that turns a *stored* legend position into the
 * position the product actually uses (render, export clone, editor display,
 * export gate).
 *
 * A stored position is only ever valid for the bounds it was authored against.
 * Colouring a ninth country reflows the legend from one column to two
 * (`getLegendColumnCount`), which grows `bounds.width` by 312 and drops the
 * maximum legal `x` by the same amount; the seventeenth colour does it again.
 * Nothing writes the stored position back on those transitions, so resolving it
 * against the *current* bounds on every read is what makes an out-of-frame
 * legend unrepresentable instead of merely detectable:
 *
 * - `preset !== null` is authoritative - the legend tracks its corner, so a
 *   "Bottom right" legend stays bottom-right as it grows.
 * - a custom position (`preset === null`) is re-clamped into the 32px safe
 *   inset for the current bounds. **It is deliberately NOT band-aware**: a
 *   creator who has dragged the legend somewhere specific chose that spot, and
 *   a band appearing underneath it must not shove it. The band inset is a
 *   PRESET's resting place, not a no-go zone.
 */
export function resolveLegendPosition(
  position: LegendPosition,
  bounds: LegendBounds,
  bandExtents: BandExtents,
): LegendPosition {
  return position.preset !== null && LEGEND_CORNERS.has(position.preset)
    ? getLegendCornerPosition(position.preset, bounds, bandExtents)
    : clampLegendPosition({ ...position, preset: null }, bounds);
}

export interface ResolvedLegendRender {
  readonly activeEntries: ReadonlyArray<LegendEntryState>;
  readonly layout: LegendLayout;
  readonly bounds: LegendBounds;
  readonly position: LegendPosition;
}

/**
 * Everything the overlay, the export clone, the editor, and the export gate
 * need, derived from live state in one place so they cannot drift apart - the
 * same discipline `validateActiveLegend` established for the gate.
 */
export function resolveLegendRender(
  legend: LegendState,
  effectiveColors: ReadonlyArray<string>,
  bandExtents: BandExtents,
): ResolvedLegendRender {
  const activeEntries = getActiveLegendEntries(effectiveColors, legend);
  const layout = createLegendLayout(activeEntries, legend.textSize);
  const bounds: LegendBounds = { width: layout.width, height: layout.height };

  return {
    activeEntries,
    layout,
    bounds,
    position: resolveLegendPosition(legend.position, bounds, bandExtents),
  };
}

/**
 * The legend's box, and ONLY its box.
 *
 * Split out by `04-12` because bounds are a function of the entries and the
 * text size alone — a band moves the legend, it never resizes it. Callers that
 * need the box and not the placement (`getLegendOverlayBounds`, and every
 * `bounds` prop threaded down from `App`) go through this rather than through
 * `resolveLegendRender`, so they do not have to invent a `bandExtents` they
 * have no use for. One layout implementation, two readers.
 */
export function resolveLegendBounds(
  legend: LegendState,
  effectiveColors: ReadonlyArray<string>,
): LegendBounds {
  const layout = createLegendLayout(
    getActiveLegendEntries(effectiveColors, legend),
    legend.textSize,
  );

  return { width: layout.width, height: layout.height };
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
  // Measure labels at the size the layout actually renders, not the requested
  // size. `createLegendLayout` shrinks text to 'small' at >= 17 active entries,
  // so measuring with the requested size reports `label-does-not-fit` for labels
  // that do fit — a spurious export block the creator cannot clear.
  const effectiveTextSize = isTextSizeValid
    ? getEffectiveTextSize(
        getActiveLegendEntries(effectiveColors, legend).length,
        legend.textSize,
      )
    : legend.textSize;

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
      getLabelLineCount(entry.label, effectiveTextSize) > 2
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

  if (!isTextSizeValid) {
    issues.push({ code: 'invalid-text-size', path: 'textSize' });
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
 * whose color is still active in the scene, and the position resolved against
 * the current bounds exactly as `LegendOverlay` resolves it.
 *
 * Because the renderer and this gate share `resolveLegendPosition`,
 * `invalid-position` is unreachable here for any legend whose bounds fit the
 * canvas: the exported legend is inside the safe inset by construction rather
 * than by inspection.
 *
 * Both the export gate and the Legend editor call this so a collapsed editor can
 * never leave a stale verdict behind.
 */
export function validateActiveLegend(
  legend: LegendState,
  effectiveColors: ReadonlyArray<string>,
  bounds: LegendBounds,
  bandExtents: BandExtents,
): LegendValidationResult {
  return validateLegend(
    {
      ...legend,
      entries: getActiveLegendEntries(effectiveColors, legend),
      position: resolveLegendPosition(legend.position, bounds, bandExtents),
    },
    effectiveColors,
    bounds,
  );
}

export const LEGEND_LABEL_FIT_MESSAGE =
  'Shorten this label so it fits in the exported legend.';
export const LEGEND_OVERFLOW_MESSAGE =
  'This map uses more than 30 legend colors. Reduce the number of colors so every label stays readable in the export.';

/**
 * The one classifier that decides whether a legend problem may block Export
 * PNG, and what the product tells the user about it. The export gate and the
 * Legend editor both call it, so the gate can only ever block on something the
 * user has been shown and can act on.
 *
 * Lives next to `validateActiveLegend` rather than in a component module so the
 * gate does not have to import from the editor.
 */
export function getLegendBlockingMessage(
  issues: ReadonlyArray<LegendValidationIssue>,
): string | null {
  if (issues.some((issue): boolean => issue.code === 'too-many-active-colors')) {
    return LEGEND_OVERFLOW_MESSAGE;
  }
  if (
    issues.some(
      (issue): boolean =>
        issue.code === 'label-does-not-fit' || issue.code === 'invalid-label',
    )
  ) {
    return LEGEND_LABEL_FIT_MESSAGE;
  }
  return null;
}
