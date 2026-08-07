import { DEFAULT_COLOR } from '../constants/colors';
import type {
  LegendCorner,
  LegendEntryState,
  LegendForm,
  LegendPosition,
  LegendState,
  LegendTextSize,
} from '../types/composition';
import type { ColorMap } from '../types/map';
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
const LEGEND_COLUMN_GAP = 24;
const LEGEND_COLUMN_WIDTH = 288;
export const LEGEND_ENTRY_GAP = 8;
const LEGEND_ENTRY_HEIGHT = 48;
const LEGEND_TWO_LINE_HEIGHT = 64;
const LEGEND_LABEL_MAX_LENGTH = 32;
const LEGEND_MAX_ACTIVE_ENTRIES = 30;
const LEGEND_SMALL_NUDGE = 8;
const LEGEND_LARGE_NUDGE = 32;

/*
 * ------------------------------------------------------------------
 * Shared mark geometry (04-13)
 * ------------------------------------------------------------------
 *
 * These moved OUT of `LegendOverlay.tsx` and into the layout module, because
 * `04-13` gave the legend a second form whose BOUNDS depend on them. A swatch
 * size that lives in the renderer and a width formula that lives here is how
 * the two stop agreeing, and a legend whose bounds under-report its ink is a
 * legend that leaves the exported square (Live Invariant 3).
 */

/** Both forms' non-bar swatch: the rows entry mark and the "no data" mark. */
export const LEGEND_SWATCH_SIZE = 24;
export const LEGEND_SWATCH_LABEL_GAP = 16;

export const LEGEND_TEXT_FONT_SIZE: Readonly<Record<LegendTextSize, number>> = {
  small: 24,
  medium: 32,
  large: 40,
};
export const LEGEND_TEXT_LINE_HEIGHT: Readonly<
  Record<LegendTextSize, number>
> = {
  small: 28,
  medium: 36,
  large: 44,
};
export const LEGEND_TEXT_BASELINE_OFFSET: Readonly<
  Record<LegendTextSize, number>
> = {
  small: 7,
  medium: 9,
  large: 11,
};

/**
 * The SAME worst-case advance `compositionText.ts` derives its character bounds
 * from — Inter's widest common glyph (`W`) at weight 600, measured in installed
 * Chrome 151 from the vendored `inter-latin-variable.woff2`.
 *
 * It is DECLARED here rather than imported, because `compositionText.ts`
 * imports `LEGEND_SAFE_INSET` from this module and the reverse edge would be a
 * circular dependency — the same trade `bands.ts` makes for
 * `BAND_FALLBACK_STOP_COLOR`. `legend.test.ts` imports both and asserts they
 * are equal, so the duplication is a CHECKED claim rather than a comment that
 * goes stale.
 */
export const LEGEND_WIDEST_CHARACTER_ADVANCE_EM = 1.0202;

/**
 * A worst-case rendered width, in user units, for a single line of text.
 *
 * ⚠ Vitest runs on `node`: there is no DOM and no `measureText`, so a width is
 * a CHARACTER COUNT times a recorded advance rather than a measurement. It
 * over-estimates on purpose — a legend whose bounds under-report its ink is one
 * that clips out of the exported PNG, which this project has shipped once.
 */
export function legendTextWidth(text: string, fontSize: number): number {
  return Math.ceil(
    [...text].length * fontSize * LEGEND_WIDEST_CHARACTER_ADVANCE_EM,
  );
}

/*
 * ------------------------------------------------------------------
 * Bar-form geometry (D4-12)
 * ------------------------------------------------------------------
 */

/** The stacked bar's width. Narrow on purpose: the reference's is a strip. */
export const LEGEND_BAR_WIDTH = 48;
/** The FLOOR on a segment's height; the real height also clears the label. */
export const LEGEND_BAR_SEGMENT_MIN_HEIGHT = 32;
/**
 * **Zero, and it is the bar's defining property** — the swatches are
 * contiguous. It is a NAMED constant rather than an omitted term so that the
 * contract is greppable and `legend.test.ts` can assert it against
 * `LEGEND_ENTRY_GAP` (8), which is what the rows form uses. Two forms, one
 * property, opposite values.
 */
export const LEGEND_BAR_SEGMENT_GAP = 0;
/** The short tick leader that runs right from each segment boundary. */
export const LEGEND_BAR_TICK_LENGTH = 12;
export const LEGEND_BAR_TICK_LABEL_GAP = 8;
/**
 * Where a boundary label's baseline sits below its tick, as a fraction of the
 * font size. The label hangs BELOW its tick rather than straddling it, so the
 * first boundary's type cannot poke above the legend's own bounds — a bound
 * that does not contain its ink is the failure Live Invariant 3 exists for.
 */
const LEGEND_BAR_LABEL_BASELINE_RATIO = 0.8;

/*
 * ------------------------------------------------------------------
 * Caption and "no data" — shared by BOTH forms (D4-12, roadmap 04-08)
 * ------------------------------------------------------------------
 */

/** `04-UI-SPEC.md § 6.7`: 24 user units, weight 600, the one composition ink. */
export const LEGEND_CAPTION_FONT_SIZE = 24;
const LEGEND_CAPTION_GAP = 16;
/**
 * Reserved ONLY when there is a caption. An empty caption reserves nothing and
 * renders no element — the `04-11` discipline, and here it also matters for
 * `G-1`: 40 units of dead space above the marks would push the whole legend
 * down again, which is the complaint this phase is trying to answer.
 */
export const LEGEND_CAPTION_BLOCK_HEIGHT =
  LEGEND_CAPTION_FONT_SIZE + LEGEND_CAPTION_GAP;
export const LEGEND_CAPTION_FONT_WEIGHT = '600';

/** Detached from the marks by design: the bar itself must stay contiguous. */
const LEGEND_NO_DATA_GAP = 16;
export const LEGEND_NO_DATA_LABEL = 'No data';

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
 * D4-12 — the ONE home for the legend-form vocabulary, in the style
 * `LEGEND_TEXT_SIZES` and `RAMP_IDS` use. Storage validation, the reducer, and
 * the editor all import this set; the stored `form` is untrusted input and is
 * checked against it rather than against a retyped string union.
 */
export const LEGEND_FORMS: ReadonlySet<LegendForm> = new Set<LegendForm>([
  'bar',
  'rows',
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

/** The caption's anchor, or `null` when there is no caption to draw. */
export interface LegendCaptionLayout {
  readonly x: number;
  readonly baseline: number;
  readonly text: string;
  readonly fontSize: number;
}

/**
 * The optional "no data" row. Its `fill` is deliberately NOT here: the layout
 * knows the row's geometry, and `settings.uncoloredFill` reaches the swatch as
 * a render-time prop. One value, two consumers — putting a copy in the layout
 * would make three.
 */
export interface LegendNoDataLayout {
  readonly swatchX: number;
  readonly swatchY: number;
  readonly swatchSize: number;
  readonly labelX: number;
  readonly labelBaseline: number;
  readonly label: string;
}

export interface LegendBarSegment {
  readonly entry: LegendEntryState;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LegendBarTick {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
}

export interface LegendBarBoundary {
  readonly entry: LegendEntryState;
  readonly x: number;
  readonly baseline: number;
}

export interface LegendBarOutline {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface LegendLayoutBase {
  readonly effectiveTextSize: LegendTextSize;
  readonly width: number;
  readonly height: number;
  readonly caption: LegendCaptionLayout | null;
  readonly noData: LegendNoDataLayout | null;
}

/**
 * A DISCRIMINATED UNION on `form`, not one interface with two half-empty
 * arrays (`general.md` § TypeScript Discipline). A renderer that reads
 * `layout.items` on a bar would get `[]` and paint nothing, silently; with the
 * union it is a compile error.
 */
export type LegendLayout =
  | (LegendLayoutBase & {
      readonly form: 'rows';
      readonly columns: number;
      readonly items: ReadonlyArray<LegendLayoutItem>;
    })
  | (LegendLayoutBase & {
      readonly form: 'bar';
      readonly outline: LegendBarOutline | null;
      readonly segmentHeight: number;
      readonly segments: ReadonlyArray<LegendBarSegment>;
      readonly ticks: ReadonlyArray<LegendBarTick>;
      readonly boundaries: ReadonlyArray<LegendBarBoundary>;
    });

/**
 * What the legend SAYS, as distinct from what it lists. Both forms consume it,
 * and both layout functions take it as a REQUIRED argument — a defaulted
 * `{caption: '', showNoData: false}` is indistinguishable from a call site that
 * forgot, and the bounds would then under-report the ink (the same reasoning
 * `04-12` applied to `bandExtents`).
 */
export interface LegendContent {
  readonly caption: string;
  readonly showNoData: boolean;
}

export function getLegendContent(legend: LegendState): LegendContent {
  return { caption: legend.caption, showNoData: legend.showNoData };
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
    // `null`, never a concrete form: the shipped default FOLLOWS the colouring
    // technique, and writing 'rows' here would freeze it at first save.
    form: null,
    caption: '',
    showNoData: false,
  };
}

/**
 * D4-12 — the form the COLOURS imply, before any creator override.
 *
 * **Bar when any ramp assignment exists** — that is OPEN QUESTION 5's answer as
 * a shipped default, and `04-UI-SPEC.md § UI Considerations` is explicit that
 * it is a **recommendation, not a decision**: a mixed map (some ramp, some
 * custom hex) is undefined by D4-12. Bar wins because a bar degrades to a
 * legible ordered stack while rows lose the ordering entirely. **OQ-5 is still
 * OPEN** — a shipped default is not an answered question, and the creator can
 * always override it in the Legend panel.
 *
 * Read through `04-05`'s DISCRIMINANT (`value.kind`), never a `typeof` test:
 * Live Invariant 10 exists because six call sites each grew their own branch.
 */
export function inferLegendForm(colors: ColorMap): LegendForm {
  return Object.values(colors).some((value): boolean => value.kind === 'ramp')
    ? 'bar'
    : 'rows';
}

/**
 * The ONE place a stored override and an inferred default are reconciled.
 *
 * An explicit creator override wins. An unrecognised stored value does NOT —
 * `form` arrives from untrusted JSON, and a legend that renders neither form
 * because the string was `'stack'` is a blank legend in the exported PNG
 * (T-04-13-01).
 */
export function resolveLegendForm(
  legend: LegendState,
  inferredForm: LegendForm,
): LegendForm {
  return legend.form !== null && LEGEND_FORMS.has(legend.form)
    ? legend.form
    : inferredForm;
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

/**
 * The caption block that sits above the marks in BOTH forms.
 *
 * Returns `null` — and reserves ZERO height — for an empty caption.
 */
function createCaptionLayout(caption: string): LegendCaptionLayout | null {
  return caption.trim().length === 0
    ? null
    : {
        x: 0,
        baseline: LEGEND_CAPTION_FONT_SIZE * LEGEND_BAR_LABEL_BASELINE_RATIO,
        text: caption,
        fontSize: LEGEND_CAPTION_FONT_SIZE,
      };
}

function getCaptionBlockHeight(caption: LegendCaptionLayout | null): number {
  return caption === null ? 0 : LEGEND_CAPTION_BLOCK_HEIGHT;
}

/**
 * The optional "no data" row, laid out below the marks in BOTH forms.
 *
 * It is DETACHED by `LEGEND_NO_DATA_GAP` rather than contiguous, and that is
 * load-bearing for the bar: "no data" is not a step of the ramp, and welding it
 * onto the bottom of the bar would both misread the data and break the bar's
 * defining zero-gap property.
 */
function createNoDataLayout(
  show: boolean,
  top: number,
  textSize: LegendTextSize,
): LegendNoDataLayout | null {
  if (!show) {
    return null;
  }

  const fontSize = LEGEND_TEXT_FONT_SIZE[textSize];
  const rowHeight = Math.max(LEGEND_SWATCH_SIZE, fontSize);
  const rowTop = top + LEGEND_NO_DATA_GAP;

  return {
    swatchX: 0,
    swatchY: rowTop + (rowHeight - LEGEND_SWATCH_SIZE) / 2,
    swatchSize: LEGEND_SWATCH_SIZE,
    labelX: LEGEND_SWATCH_SIZE + LEGEND_SWATCH_LABEL_GAP,
    labelBaseline:
      rowTop + rowHeight / 2 + LEGEND_TEXT_BASELINE_OFFSET[textSize],
    label: LEGEND_NO_DATA_LABEL,
  };
}

function getNoDataBlockHeight(
  show: boolean,
  textSize: LegendTextSize,
): number {
  return show
    ? LEGEND_NO_DATA_GAP +
        Math.max(LEGEND_SWATCH_SIZE, LEGEND_TEXT_FONT_SIZE[textSize])
    : 0;
}

function getNoDataBlockWidth(
  show: boolean,
  textSize: LegendTextSize,
): number {
  return show
    ? LEGEND_SWATCH_SIZE +
        LEGEND_SWATCH_LABEL_GAP +
        legendTextWidth(LEGEND_NO_DATA_LABEL, LEGEND_TEXT_FONT_SIZE[textSize])
    : 0;
}

function getCaptionWidth(caption: LegendCaptionLayout | null): number {
  return caption === null ? 0 : legendTextWidth(caption.text, caption.fontSize);
}

/**
 * A rows entry's height — and it is DERIVED from the text size since `04-13`,
 * where it used to be the flat `LEGEND_ENTRY_HEIGHT` / `LEGEND_TWO_LINE_HEIGHT`
 * pair.
 *
 * ⚠ **The flat pair only contained its text because of the container padding
 * this plan deleted.** At `large`, two lines need `2 x 44 = 88` units and the
 * constant offered 64; the 24-unit inner padding absorbed the difference, so
 * the first line's ascender stayed inside the legend's BOX even though it was
 * outside its own ROW. Remove the padding and the ascender leaves the bounds —
 * `export.spec.ts`'s max-length-label gate measured **656 ink pixels outside
 * the resolved legend region**, which is the clipped-PNG defect this project
 * has already shipped once.
 *
 * The constants stay as FLOORS, so nothing shrinks; the line-height term is
 * what makes the row contain its own text at every size.
 */
function getRowHeight(lineCount: number, textSize: LegendTextSize): number {
  const lineHeight = LEGEND_TEXT_LINE_HEIGHT[textSize];
  return lineCount > 1
    ? Math.max(LEGEND_TWO_LINE_HEIGHT, 2 * lineHeight)
    : Math.max(LEGEND_ENTRY_HEIGHT, lineHeight);
}

/**
 * The ROWS form.
 *
 * **Restyled by `04-13`, not left as it was** (the owner: *"the row based legend
 * needs to be made just as subtle"*). The 24-unit `LEGEND_INTERNAL_PADDING` is
 * GONE from both the width formula and the top/bottom edges: it was the inner
 * padding of a container that D4-11 deleted, and padding with nothing to pad is
 * exactly the "big ass box" footprint the reference does not have. Rows now
 * start at `(0, 0)` like the bar, so a one-column legend measures **288 × 48**
 * where it used to measure 336 × 96.
 */
export function createLegendLayout(
  entries: ReadonlyArray<LegendEntryState>,
  requestedTextSize: LegendTextSize,
  content: LegendContent,
): LegendLayout {
  const sortedEntries = entries.slice().sort(compareLegendEntries);
  const columns = getLegendColumnCount(sortedEntries.length);
  const effectiveTextSize = getEffectiveTextSize(
    sortedEntries.length,
    requestedTextSize,
  );

  if (columns === 0) {
    return {
      form: 'rows',
      columns,
      effectiveTextSize,
      width: 0,
      height: 0,
      items: [],
      caption: null,
      noData: null,
    };
  }

  const caption = createCaptionLayout(content.caption);
  const captionBlock = getCaptionBlockHeight(caption);
  const rowsPerColumn = Math.ceil(sortedEntries.length / columns);
  const columnHeights = Array.from({ length: columns }, () => captionBlock);
  const columnRows = Array.from({ length: columns }, () => 0);
  const items = sortedEntries.map((entry, index): LegendLayoutItem => {
    const column = Math.floor(index / rowsPerColumn);
    const row = columnRows[column];
    const lineCount = getLabelLineCount(entry.label, effectiveTextSize);
    const height = getRowHeight(lineCount, effectiveTextSize);
    const item = {
      entry,
      column,
      row,
      x: column * (LEGEND_COLUMN_WIDTH + LEGEND_COLUMN_GAP),
      y: columnHeights[column],
      height,
    };

    columnRows[column] += 1;
    columnHeights[column] += height + LEGEND_ENTRY_GAP;
    return item;
  });
  const contentBottom = Math.max(...columnHeights) - LEGEND_ENTRY_GAP;

  return {
    form: 'rows',
    columns,
    effectiveTextSize,
    width: Math.max(
      columns * LEGEND_COLUMN_WIDTH + (columns - 1) * LEGEND_COLUMN_GAP,
      getCaptionWidth(caption),
      getNoDataBlockWidth(content.showNoData, effectiveTextSize),
    ),
    height:
      contentBottom + getNoDataBlockHeight(content.showNoData, effectiveTextSize),
    items,
    caption,
    noData: createNoDataLayout(
      content.showNoData,
      contentBottom,
      effectiveTextSize,
    ),
  };
}

/**
 * The BAR form — a SECOND layout function with its own bounds (D4-12).
 *
 * ⚠ **`createLegendLayout`'s width is
 * `columns * LEGEND_COLUMN_WIDTH + (columns - 1) * LEGEND_COLUMN_GAP`. That
 * formula describes a COLUMN LIST, not a bar.** Reusing it would report a
 * 288-unit-wide legend for a 48-unit strip and mis-bound the new form —
 * `resolveLegendPosition` clamps against these bounds, so a wrong width is a
 * legend clamped to the wrong place, and at a right-anchored preset it lands
 * 240 units inside the frame edge (`04-UI-SPEC.md § 6.7`).
 *
 * Geometry, per the owner's reference:
 * - contiguous segments, `LEGEND_BAR_SEGMENT_GAP` = **0** between them;
 * - ONE hairline around the WHOLE bar, never one per segment;
 * - a short tick leader at every segment boundary — `N + 1` of them;
 * - the entry labels are **break BOUNDARIES** at those ticks, so the range for
 *   a segment is read BETWEEN two of them. No literal range text is ever
 *   rendered (CD-8).
 *
 * **`N + 1` ticks, `N` labels.** The closing tick at the bar's foot is drawn
 * unlabelled, because a boundary reading of `N` classes needs `N + 1` values
 * and the legend model holds `N` labels. Phase 5's classing engine (`05-07`) is
 * what supplies the missing one; until then the gap is visible rather than
 * faked.
 */
export function createBarLegendLayout(
  entries: ReadonlyArray<LegendEntryState>,
  requestedTextSize: LegendTextSize,
  content: LegendContent,
): LegendLayout {
  const sortedEntries = entries.slice().sort(compareLegendEntries);
  const effectiveTextSize = getEffectiveTextSize(
    sortedEntries.length,
    requestedTextSize,
  );

  if (sortedEntries.length === 0) {
    return {
      form: 'bar',
      effectiveTextSize,
      width: 0,
      height: 0,
      outline: null,
      segmentHeight: 0,
      segments: [],
      ticks: [],
      boundaries: [],
      caption: null,
      noData: null,
    };
  }

  const fontSize = LEGEND_TEXT_FONT_SIZE[effectiveTextSize];
  const caption = createCaptionLayout(content.caption);
  const marksTop = getCaptionBlockHeight(caption);
  /*
   * DERIVED twice over, never a literal 32.
   *
   * The FLOOR: a segment must clear the boundary label that hangs off its own
   * tick, or `Large` type overlaps the next boundary.
   *
   * The CEILING, and this one is a defect the plan's own fit gate caught: at
   * the 30-entry cap with a caption and a "no data" row, `30 x 32 + 40 + 40` is
   * **1040** against a safe area of 1016. Unlike the rows form, the bar has no
   * second column to reflow into, so the only bounded answer is a shorter
   * segment. Without this the legend reports bounds larger than the safe area,
   * `isBoundsValid` starts rejecting them, and the clamp has nowhere legal to
   * put the legend.
   */
  const availableMarksHeight =
    LEGEND_CANVAS_SIZE -
    LEGEND_SAFE_INSET * 2 -
    marksTop -
    getNoDataBlockHeight(content.showNoData, effectiveTextSize);
  const segmentHeight = Math.min(
    Math.max(LEGEND_BAR_SEGMENT_MIN_HEIGHT, fontSize),
    Math.floor(availableMarksHeight / sortedEntries.length),
  );
  const labelX =
    LEGEND_BAR_WIDTH + LEGEND_BAR_TICK_LENGTH + LEGEND_BAR_TICK_LABEL_GAP;

  const segments = sortedEntries.map((entry, index): LegendBarSegment => ({
    entry,
    x: 0,
    y: marksTop + index * (segmentHeight + LEGEND_BAR_SEGMENT_GAP),
    width: LEGEND_BAR_WIDTH,
    height: segmentHeight,
  }));
  const ticks = Array.from(
    { length: sortedEntries.length + 1 },
    (_, index): LegendBarTick => ({
      x1: LEGEND_BAR_WIDTH,
      x2: LEGEND_BAR_WIDTH + LEGEND_BAR_TICK_LENGTH,
      y: marksTop + index * segmentHeight,
    }),
  );
  const boundaries = sortedEntries.map((entry, index): LegendBarBoundary => ({
    entry,
    x: labelX,
    baseline:
      marksTop +
      index * segmentHeight +
      fontSize * LEGEND_BAR_LABEL_BASELINE_RATIO,
  }));
  const marksHeight = sortedEntries.length * segmentHeight;
  const marksBottom = marksTop + marksHeight;
  const widestBoundaryLabel = sortedEntries.reduce(
    (widest, entry): number =>
      Math.max(widest, legendTextWidth(entry.label, fontSize)),
    0,
  );

  return {
    form: 'bar',
    effectiveTextSize,
    width: Math.max(
      labelX + widestBoundaryLabel,
      getCaptionWidth(caption),
      getNoDataBlockWidth(content.showNoData, effectiveTextSize),
    ),
    height:
      marksBottom + getNoDataBlockHeight(content.showNoData, effectiveTextSize),
    outline: {
      x: 0,
      y: marksTop,
      width: LEGEND_BAR_WIDTH,
      height: marksHeight,
    },
    segmentHeight,
    segments,
    ticks,
    boundaries,
    caption,
    noData: createNoDataLayout(
      content.showNoData,
      marksBottom,
      effectiveTextSize,
    ),
  };
}

/**
 * The ONE dispatch from a form to its layout function. Both branches return a
 * `LegendLayout`, and both sets of bounds therefore reach
 * `resolveLegendPosition` through exactly the same path (T-04-13-02).
 */
export function createLegendLayoutForForm(
  form: LegendForm,
  entries: ReadonlyArray<LegendEntryState>,
  requestedTextSize: LegendTextSize,
  content: LegendContent,
): LegendLayout {
  return form === 'bar'
    ? createBarLegendLayout(entries, requestedTextSize, content)
    : createLegendLayout(entries, requestedTextSize, content);
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
  readonly form: LegendForm;
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
  inferredForm: LegendForm,
): ResolvedLegendRender {
  const activeEntries = getActiveLegendEntries(effectiveColors, legend);
  const form = resolveLegendForm(legend, inferredForm);
  const layout = createLegendLayoutForForm(
    form,
    activeEntries,
    legend.textSize,
    getLegendContent(legend),
  );
  const bounds: LegendBounds = { width: layout.width, height: layout.height };

  return {
    activeEntries,
    form,
    layout,
    bounds,
    /*
     * ⚠ BOTH forms' bounds come through here (T-04-13-02, Live Invariant 3).
     * Returning the bar's geometry without this call is the exact bypass
     * `04-UI-SPEC.md § 6.7` warns about: an out-of-frame legend becomes
     * representable again, and the exporter clips it out of the PNG.
     */
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
  inferredForm: LegendForm,
): LegendBounds {
  const layout = createLegendLayoutForForm(
    resolveLegendForm(legend, inferredForm),
    getActiveLegendEntries(effectiveColors, legend),
    legend.textSize,
    getLegendContent(legend),
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
