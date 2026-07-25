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
import { nudgeLegendPosition, resolveLegendRender } from '../utils/legend';
import type { LegendBounds, LegendLayoutItem } from '../utils/legend';

const LEGEND_CANVAS_SIZE = 1080;
const LEGEND_SAFE_INSET = 32;
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
const LEGEND_CHARACTERS_PER_LINE: Readonly<Record<LegendTextSize, number>> = {
  small: 24,
  medium: 18,
  large: 14,
};

interface LegendOverlayProps {
  legend: LegendState;
  effectiveColors: ReadonlyArray<string>;
  onPositionChange: (position: LegendPosition) => void;
  onStatusMessage: (message: string) => void;
}

interface LegendThemeColors {
  background: string;
  text: string;
  border: string;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: LegendPosition;
}

const THEME_COLORS: Readonly<Record<LegendState['theme'], LegendThemeColors>> = {
  light: {
    background: '#FFFFFF',
    text: '#111827',
    border: '#CBD5E1',
  },
  dark: {
    background: '#111827',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.28)',
  },
  soft: {
    background: '#F3F4F6',
    text: '#111827',
    border: '#CBD5E1',
  },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * `backgroundOpacity` is stored, validated, clamped and displayed on a single
 * 0-100 percent scale, so there is exactly one conversion to the SVG ratio.
 * The previous dual handling silently accepted a 0-1 value, which is how a
 * legacy-migrated map could differ from a fresh one.
 */
function getBackgroundOpacity(backgroundOpacity: number): number {
  return clamp(backgroundOpacity / 100, 0.7, 1);
}

function getBorderWidth(borderStyle: LegendState['borderStyle']): number {
  if (borderStyle === 'none') {
    return 0;
  }
  return borderStyle === 'strong' ? 4 : 2;
}

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

export function getLegendOverlayBounds(
  legend: LegendState,
  effectiveColors: ReadonlyArray<string>,
): LegendBounds {
  return resolveLegendRender(legend, effectiveColors).bounds;
}

export function clampLegendDragPosition(
  position: LegendPosition,
  bounds: LegendBounds,
): LegendPosition {
  return {
    x: clamp(
      position.x,
      LEGEND_SAFE_INSET,
      LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.width,
    ),
    y: clamp(
      position.y,
      LEGEND_SAFE_INSET,
      LEGEND_CANVAS_SIZE - LEGEND_SAFE_INSET - bounds.height,
    ),
    preset: null,
  };
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
      fontFamily="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
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
  );
  const colors = THEME_COLORS[legend.theme];
  const borderWidth = getBorderWidth(legend.borderStyle);
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
          <rect
            x="0"
            y="0"
            width={layout.width}
            height={layout.height}
            rx={LEGEND_CORNER_RADIUS}
            fill={colors.background}
            fillOpacity={getBackgroundOpacity(legend.backgroundOpacity)}
            stroke={borderWidth === 0 ? 'none' : colors.border}
            strokeWidth={borderWidth}
            aria-hidden="true"
          />
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
              {renderLegendText(item, layout.effectiveTextSize, colors.text)}
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
