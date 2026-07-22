import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type { MapTooltipData } from './MapCanvas';

const TOOLTIP_OFFSET = 12;
const VIEWPORT_MARGIN = 8;

interface TooltipProps {
  data: MapTooltipData | null;
}

interface TooltipGeometry {
  anchorX: number;
  anchorY: number;
  tooltipWidth: number;
  tooltipHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  inputMethod: MapTooltipData['inputMethod'];
}

export interface TooltipPosition {
  left: number;
  top: number;
}

interface MeasuredTooltipPosition extends TooltipPosition {
  countryId: string;
  anchorX: number;
  anchorY: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function calculateTooltipPosition({
  anchorX,
  anchorY,
  tooltipWidth,
  tooltipHeight,
  viewportWidth,
  viewportHeight,
  inputMethod,
}: TooltipGeometry): TooltipPosition {
  const maximumLeft = viewportWidth - tooltipWidth - VIEWPORT_MARGIN;
  const maximumTop = viewportHeight - tooltipHeight - VIEWPORT_MARGIN;
  let left =
    inputMethod === 'keyboard'
      ? anchorX - tooltipWidth / 2
      : anchorX + TOOLTIP_OFFSET;
  let top = anchorY - tooltipHeight - TOOLTIP_OFFSET;

  if (inputMethod === 'pointer') {
    if (left + tooltipWidth > viewportWidth - VIEWPORT_MARGIN) {
      left = anchorX - tooltipWidth - TOOLTIP_OFFSET;
    }

    if (anchorY + TOOLTIP_OFFSET + tooltipHeight <= viewportHeight - VIEWPORT_MARGIN) {
      top = anchorY + TOOLTIP_OFFSET;
    }
  } else if (top < VIEWPORT_MARGIN) {
    top = anchorY + TOOLTIP_OFFSET;
  }

  return {
    left: clamp(left, VIEWPORT_MARGIN, maximumLeft),
    top: clamp(top, VIEWPORT_MARGIN, maximumTop),
  };
}

export function Tooltip({ data }: TooltipProps): JSX.Element | null {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [measuredPosition, setMeasuredPosition] =
    useState<MeasuredTooltipPosition | null>(null);

  useLayoutEffect((): void => {
    const tooltip = tooltipRef.current;
    if (data === null || tooltip === null) {
      return;
    }

    const bounds = tooltip.getBoundingClientRect();
    const position = calculateTooltipPosition({
      anchorX: data.position.x,
      anchorY: data.position.y,
      tooltipWidth: bounds.width,
      tooltipHeight: bounds.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      inputMethod: data.inputMethod,
    });

    setMeasuredPosition({
      ...position,
      countryId: data.countryId,
      anchorX: data.position.x,
      anchorY: data.position.y,
    });
  }, [data]);

  if (data === null) {
    return null;
  }

  const isPositionCurrent =
    measuredPosition?.countryId === data.countryId &&
    measuredPosition.anchorX === data.position.x &&
    measuredPosition.anchorY === data.position.y;
  const positionStyle: CSSProperties = isPositionCurrent
    ? { left: measuredPosition.left, top: measuredPosition.top }
    : { left: data.position.x, top: data.position.y, visibility: 'hidden' };

  return (
    <div
      ref={tooltipRef}
      className="map-tooltip"
      data-input-method={data.inputMethod}
      role="tooltip"
      style={positionStyle}
    >
      <strong className="map-tooltip__country">{data.countryName}</strong>
      <span className="map-tooltip__color">Current color: {data.color}</span>
    </div>
  );
}
