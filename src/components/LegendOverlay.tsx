import { useRef } from 'react';
import type {
  KeyboardEvent,
  PointerEvent,
  WheelEvent,
} from 'react';

import type {
  LegendPosition,
  LegendState,
  LegendTextSize,
} from '../types/composition';
import { COMPOSITION_FONT_FAMILY } from '../styles/interFontFace';
import { COMPOSITION_INK_COLOR } from '../utils/contrast';
import type { BandExtents } from '../utils/bands';
import {
  LEGEND_CHARACTERS_PER_LINE,
  clampLegendPosition,
  nudgeLegendPosition,
  resolveLegendBounds,
  resolveLegendRender,
} from '../utils/legend';
import type { LegendBounds, LegendLayoutItem } from '../utils/legend';

const LEGEND_CANVAS_SIZE = 1080;
const LEGEND_CORNER_RADIUS = 16;
const LEGEND_SWATCH_SIZE = 24;
const LEGEND_SWATCH_LABEL_GAP = 16;
const LEGEND_TEXT_BASELINE_OFFSET: Readonly<Record<LegendTextSize, number>> = {
  small: 7,
  medium: 9,
  large: 11,
};
const LEGEND_TEXT_LINE_HEIGHT: Readonly<Record<LegendTextSize, number>> = {
  small: 28,
  medium: 36,
  large: 44,
};
const LEGEND_TEXT_SIZE: Readonly<Record<LegendTextSize, number>> = {
  small: 24,
  medium: 32,
  large: 40,
};
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
): LegendBounds {
  return resolveLegendBounds(legend, effectiveColors);
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
  const fontSize = LEGEND_TEXT_SIZE[textSize];
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

export function LegendOverlay({
  legend,
  effectiveColors,
  bandExtents,
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
            D4-11: NO background rect. The legend is bare marks and type
            directly on the map surface — the reference has no container at
            all. The only rect left in the exported clone is a swatch.
          */}
          {layout.items.map((item): JSX.Element => (
            <g key={item.entry.color} aria-hidden="true">
              <rect
                x={item.x}
                y={item.y + (item.height - LEGEND_SWATCH_SIZE) / 2}
                width={LEGEND_SWATCH_SIZE}
                height={LEGEND_SWATCH_SIZE}
                rx="4"
                fill={item.entry.color}
                stroke="#9CA3AF"
                strokeWidth="2"
              />
              {renderLegendText(item, layout.effectiveTextSize, LEGEND_INK_COLOR)}
            </g>
          ))}
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
