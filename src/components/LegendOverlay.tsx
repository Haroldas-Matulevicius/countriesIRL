import { useRef } from 'react';
import type {
  KeyboardEvent,
  PointerEvent,
  WheelEvent,
} from 'react';

import type {
  LegendForm,
  LegendPosition,
  LegendState,
  LegendTextSize,
} from '../types/composition';
import { COMPOSITION_FONT_FAMILY } from '../styles/interFontFace';
import { COMPOSITION_INK_COLOR } from '../utils/contrast';
import type { BandExtents } from '../utils/bands';
import {
  LEGEND_CAPTION_FONT_WEIGHT,
  LEGEND_CHARACTERS_PER_LINE,
  LEGEND_SWATCH_LABEL_GAP,
  LEGEND_SWATCH_SIZE,
  LEGEND_TEXT_BASELINE_OFFSET,
  LEGEND_TEXT_FONT_SIZE,
  LEGEND_TEXT_LINE_HEIGHT,
  clampLegendPosition,
  nudgeLegendPosition,
  resolveLegendBounds,
  resolveLegendRender,
} from '../utils/legend';
import type {
  LegendBounds,
  LegendCaptionLayout,
  LegendLayout,
  LegendLayoutItem,
  LegendNoDataLayout,
} from '../utils/legend';

const LEGEND_CANVAS_SIZE = 1080;
const LEGEND_CORNER_RADIUS = 16;
/**
 * The swatch and bar hairline. `--swatch-border` mirrors it in the chrome; the
 * literal is here because the export clone is rasterised as an isolated
 * document, so a CSS variable never reaches the PNG. It is the one colour
 * literal `uiContract.test.ts`'s closed exemption list allows in this file.
 */
const LEGEND_HAIRLINE_COLOR = '#9CA3AF';
const LEGEND_HAIRLINE_WIDTH = '2';
/**
 * The legend names the SAME family the export path embeds, so the editor and
 * the exported PNG resolve the same typeface — the chrome via `theme.css`'s
 * `@font-face`, the export via the `@font-face` `injectExportFontFace` rides
 * into the serialised clone (D-25).
 *
 * `04-11` MOVED the stack into `interFontFace.ts` as `COMPOSITION_FONT_FAMILY`
 * rather than letting the new text layer author a second copy of it. This alias
 * is kept so the reader of a legend `<text>` still sees a legend-named constant.
 */
const LEGEND_FONT_FAMILY = COMPOSITION_FONT_FAMILY;

interface LegendOverlayProps {
  legend: LegendState;
  effectiveColors: ReadonlyArray<string>;
  /**
   * D4-12 — the form the COLOURS imply, from `inferLegendForm`. The creator's
   * explicit `legend.form` override wins over it inside
   * `resolveLegendRender`; this is only the default.
   *
   * REQUIRED, never defaulted, for the same reason `bandExtents` is: a silent
   * `'rows'` is indistinguishable from a call site that forgot, and it would
   * render a ramp-painted map with the wrong legend and the wrong bounds.
   */
  inferredForm: LegendForm;
  /**
   * D4-08's uncoloured fill, bound to the "no data" swatch. **ONE value, two
   * consumers** — the map's uncoloured countries and this swatch — and
   * `legend.spec.ts`'s Gate A asserts on real PNG pixels that they are equal.
   * It arrives as a prop rather than being read here, so there is exactly one
   * place the two could ever diverge.
   */
  uncoloredFill: string;
  /**
   * D4-13 — how far each band reaches into the square, from
   * `resolveBandExtents`. REQUIRED, never defaulted: a silent
   * `{top: 0, bottom: 0}` would render the legend under the title band and
   * nothing would catch it.
   */
  bandExtents: BandExtents;
  onPositionChange: (position: LegendPosition) => void;
  onStatusMessage: (message: string) => void;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: LegendPosition;
}

/**
 * The legend's ONE ink, and the only colour value this component now names.
 *
 * D4-11 deleted `THEME_COLORS` with the box chrome it painted: with no
 * background panel, no border, and no fill opacity there is no legend theme to
 * pick a background, a border, and a matching text colour from. What remains
 * is a label ink and a swatch stroke.
 *
 * It is `COMPOSITION_INK_COLOR` — the SAME `#111827` the title, the subtitle,
 * and the attribution are painted in (`utils/contrast.ts`, 04-11) — imported
 * rather than retyped, because the legend and the composition text now sit on
 * the same surface and a second literal is how they stop agreeing. It is
 * export-fixed by construction: the clone is rasterised as an isolated
 * document, so an attribute is the only route to the PNG.
 */
const LEGEND_INK_COLOR = COMPOSITION_INK_COLOR;

function splitLabel(label: string, textSize: LegendTextSize): ReadonlyArray<string> {
  const charactersPerLine = LEGEND_CHARACTERS_PER_LINE[textSize];
  if (label.length <= charactersPerLine) {
    return [label];
  }
  return [
    label.slice(0, charactersPerLine),
    label.slice(charactersPerLine, charactersPerLine * 2),
  ];
}

/**
 * The legend's box. Band-independent by construction — a band MOVES the legend,
 * it never resizes it — so this goes through `resolveLegendBounds` rather than
 * inventing a `bandExtents` it would then throw away.
 */
export function getLegendOverlayBounds(
  legend: LegendState,
  effectiveColors: ReadonlyArray<string>,
  inferredForm: LegendForm,
): LegendBounds {
  return resolveLegendBounds(legend, effectiveColors, inferredForm);
}

/**
 * Drag positions are clamped by the same implementation every other path uses.
 *
 * This was previously a second clamp that omitted `clampLegendPosition`'s
 * inverted-range guard (`Math.max(LEGEND_SAFE_INSET, maximum)`), so a legend
 * wider than the safe area produced a range whose maximum fell below its
 * minimum. Delegating keeps the guard in exactly one place.
 */
export function clampLegendDragPosition(
  position: LegendPosition,
  bounds: LegendBounds,
): LegendPosition {
  return clampLegendPosition({ ...position, preset: null }, bounds);
}

function getCanonicalPointerScale(target: SVGRectElement): number {
  const svg = target.ownerSVGElement;
  if (svg === null) {
    return 1;
  }
  const width = svg.getBoundingClientRect().width;
  return width > 0 ? LEGEND_CANVAS_SIZE / width : 1;
}

function renderLegendText(
  item: LegendLayoutItem,
  textSize: LegendTextSize,
  textColor: string,
): JSX.Element {
  const lines = splitLabel(item.entry.label, textSize);
  const lineHeight = LEGEND_TEXT_LINE_HEIGHT[textSize];
  const fontSize = LEGEND_TEXT_FONT_SIZE[textSize];
  const textX = item.x + LEGEND_SWATCH_SIZE + LEGEND_SWATCH_LABEL_GAP;
  const textCenterY = item.y + item.height / 2;
  const firstBaseline =
    textCenterY +
    LEGEND_TEXT_BASELINE_OFFSET[textSize] -
    ((lines.length - 1) * lineHeight) / 2;

  return (
    <text
      x={textX}
      y={firstBaseline}
      fill={textColor}
      fontSize={fontSize}
      fontFamily={LEGEND_FONT_FAMILY}
      fontWeight="600"
      aria-hidden="true"
    >
      {lines.map((line, index): JSX.Element => (
        <tspan key={`${item.entry.color}-${index}`} x={textX} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * The caption line — one bold line above the marks, in BOTH forms.
 *
 * `04-UI-SPEC.md § 6.7`: 24 user units, weight 600, the single composition ink
 * as an inline `fill` attribute. An empty caption produces no element at all,
 * not an empty one (the `04-11` discipline).
 */
function renderLegendCaption(
  caption: LegendCaptionLayout | null,
): JSX.Element | null {
  return caption === null ? null : (
    <text
      x={caption.x}
      y={caption.baseline}
      fill={LEGEND_INK_COLOR}
      fontSize={caption.fontSize}
      fontFamily={LEGEND_FONT_FAMILY}
      fontWeight={LEGEND_CAPTION_FONT_WEIGHT}
      data-legend-caption="true"
      aria-hidden="true"
    >
      {caption.text}
    </text>
  );
}

/**
 * The "no data" row, in BOTH forms.
 *
 * ⚠ **The swatch's `fill` is `settings.uncoloredFill` and nothing else.** There
 * is deliberately no fallback literal here: a `?? '#E5E7EB'` would let the two
 * values diverge while the gate that exists to catch the divergence stayed
 * green, which is precisely the shape `04-UI-SPEC.md § 6.7` names.
 */
function renderLegendNoData(
  noData: LegendNoDataLayout | null,
  textSize: LegendTextSize,
  uncoloredFill: string,
): JSX.Element | null {
  return noData === null ? null : (
    <g data-legend-no-data="true" aria-hidden="true">
      <rect
        x={noData.swatchX}
        y={noData.swatchY}
        width={noData.swatchSize}
        height={noData.swatchSize}
        fill={uncoloredFill}
        stroke={LEGEND_HAIRLINE_COLOR}
        strokeWidth={LEGEND_HAIRLINE_WIDTH}
      />
      <text
        x={noData.labelX}
        y={noData.labelBaseline}
        fill={LEGEND_INK_COLOR}
        fontSize={LEGEND_TEXT_FONT_SIZE[textSize]}
        fontFamily={LEGEND_FONT_FAMILY}
        fontWeight="600"
      >
        {noData.label}
      </text>
    </g>
  );
}

/**
 * The BAR form's marks.
 *
 * Contiguous segments with **no gap**, ONE hairline around the whole bar (never
 * one per segment), a tick leader at every boundary, and the entry labels
 * printed as **break boundaries** beside those ticks. No literal range text
 * (`6.0–10.0`) is ever produced — the range is read BETWEEN two boundaries
 * (CD-8).
 *
 * The segments carry **no stroke**: a per-segment hairline would draw a line
 * between adjacent swatches and destroy the contiguity that defines the form.
 */
function renderBarMarks(
  layout: Extract<LegendLayout, { form: 'bar' }>,
): JSX.Element {
  const fontSize = LEGEND_TEXT_FONT_SIZE[layout.effectiveTextSize];

  return (
    <g data-legend-bar="true" aria-hidden="true">
      {layout.segments.map((segment): JSX.Element => (
        <rect
          key={segment.entry.color}
          x={segment.x}
          y={segment.y}
          width={segment.width}
          height={segment.height}
          fill={segment.entry.color}
          data-legend-bar-segment="true"
        />
      ))}
      {layout.outline === null ? null : (
        <rect
          x={layout.outline.x}
          y={layout.outline.y}
          width={layout.outline.width}
          height={layout.outline.height}
          fill="none"
          stroke={LEGEND_HAIRLINE_COLOR}
          strokeWidth={LEGEND_HAIRLINE_WIDTH}
          data-legend-bar-outline="true"
        />
      )}
      {layout.ticks.map((tick): JSX.Element => (
        <line
          key={`tick-${String(tick.y)}`}
          x1={tick.x1}
          y1={tick.y}
          x2={tick.x2}
          y2={tick.y}
          stroke={LEGEND_HAIRLINE_COLOR}
          strokeWidth={LEGEND_HAIRLINE_WIDTH}
          data-legend-bar-tick="true"
        />
      ))}
      {layout.boundaries.map((boundary): JSX.Element => (
        <text
          key={boundary.entry.color}
          x={boundary.x}
          y={boundary.baseline}
          fill={LEGEND_INK_COLOR}
          fontSize={fontSize}
          fontFamily={LEGEND_FONT_FAMILY}
          fontWeight="600"
          data-legend-boundary="true"
        >
          {boundary.entry.label}
        </text>
      ))}
    </g>
  );
}

/**
 * The ROWS form's marks, restyled by `04-13` to the bar's restraint: the swatch
 * is FLAT (no `rx`), matching a bar segment, and the vestigial container
 * padding is gone from the layout. Still one hairline per swatch — that is what
 * distinguishes the form from the bar, and `legend.spec.ts`'s Gate B asserts
 * the opposite gap behaviour of the two in the same run.
 */
function renderRowMarks(
  layout: Extract<LegendLayout, { form: 'rows' }>,
): JSX.Element {
  return (
    <>
      {layout.items.map((item): JSX.Element => (
        <g key={item.entry.color} aria-hidden="true">
          <rect
            x={item.x}
            y={item.y + (item.height - LEGEND_SWATCH_SIZE) / 2}
            width={LEGEND_SWATCH_SIZE}
            height={LEGEND_SWATCH_SIZE}
            fill={item.entry.color}
            stroke={LEGEND_HAIRLINE_COLOR}
            strokeWidth={LEGEND_HAIRLINE_WIDTH}
          />
          {renderLegendText(item, layout.effectiveTextSize, LEGEND_INK_COLOR)}
        </g>
      ))}
    </>
  );
}

export function LegendOverlay({
  legend,
  effectiveColors,
  bandExtents,
  inferredForm,
  uncoloredFill,
  onPositionChange,
  onStatusMessage,
}: LegendOverlayProps): JSX.Element {
  // Resolved, never stored: a stored position is only valid for the bounds it
  // was authored against, and adding a 9th (or 17th) color reflows the legend
  // into another column. Rendering the resolved position is what keeps the
  // exported PNG - which is a clone of exactly this SVG - inside the frame.
  const { activeEntries, layout, bounds, position } = resolveLegendRender(
    legend,
    effectiveColors,
    bandExtents,
    inferredForm,
  );
  const dragStateRef = useRef<DragState | null>(null);

  const stopPointerPropagation = (event: PointerEvent<SVGRectElement>): void => {
    event.stopPropagation();
  };

  const handlePointerDown = (event: PointerEvent<SVGRectElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: position,
    };
  };

  const handlePointerMove = (event: PointerEvent<SVGRectElement>): void => {
    event.stopPropagation();
    const dragState = dragStateRef.current;
    if (dragState === null || dragState.pointerId !== event.pointerId) {
      return;
    }

    const scale = getCanonicalPointerScale(event.currentTarget);
    onPositionChange(
      clampLegendDragPosition(
        {
          x:
            dragState.startPosition.x +
            (event.clientX - dragState.startClientX) * scale,
          y:
            dragState.startPosition.y +
            (event.clientY - dragState.startClientY) * scale,
          preset: null,
        },
        bounds,
      ),
    );
  };

  const finishPointerDrag = (event: PointerEvent<SVGRectElement>): void => {
    event.stopPropagation();
    const dragState = dragStateRef.current;
    if (dragState === null || dragState.pointerId !== event.pointerId) {
      return;
    }
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onStatusMessage('Legend position updated.');
  };

  const handleKeyboardNudge = (
    event: KeyboardEvent<SVGRectElement>,
  ): void => {
    const direction =
      event.key === 'ArrowUp'
        ? 'up'
        : event.key === 'ArrowRight'
          ? 'right'
          : event.key === 'ArrowDown'
            ? 'down'
            : event.key === 'ArrowLeft'
              ? 'left'
              : null;
    if (direction === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onPositionChange(
      nudgeLegendPosition(
        position,
        direction,
        bounds,
        event.shiftKey ? 'large' : 'small',
      ),
    );
    onStatusMessage('Legend position updated.');
  };

  const handleWheel = (event: WheelEvent<SVGRectElement>): void => {
    event.stopPropagation();
  };

  return (
    <g
      data-layer="legend"
      transform={`translate(${position.x} ${position.y})`}
    >
      {activeEntries.length === 0 ? null : (
        <>
          {/*
            D4-11: NO background rect, in EITHER form. The legend is bare marks
            and type directly on the map surface — the reference has no
            container at all.

            The empty case above is the lift-block truth "the legend layer
            renders nothing into the exported PNG when there are no active
            colours": with no entries there is no caption and no "no data" row
            either, because a caption floating over an empty map is a label for
            nothing.
          */}
          {renderLegendCaption(layout.caption)}
          {layout.form === 'bar'
            ? renderBarMarks(layout)
            : renderRowMarks(layout)}
          {renderLegendNoData(
            layout.noData,
            layout.effectiveTextSize,
            uncoloredFill,
          )}
          <rect
            x="0"
            y="0"
            width={layout.width}
            height={layout.height}
            rx={LEGEND_CORNER_RADIUS}
            fill="transparent"
            data-editor-only="true"
            role="button"
            aria-label="Move legend"
            aria-keyshortcuts="ArrowUp ArrowRight ArrowDown ArrowLeft Shift+ArrowUp Shift+ArrowRight Shift+ArrowDown Shift+ArrowLeft"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerDrag}
            onPointerCancel={finishPointerDrag}
            onPointerOver={stopPointerPropagation}
            onPointerOut={stopPointerPropagation}
            onClick={stopPointerPropagation}
            onDoubleClick={stopPointerPropagation}
            onWheel={handleWheel}
            onKeyDown={handleKeyboardNudge}
          />
        </>
      )}
    </g>
  );
}
