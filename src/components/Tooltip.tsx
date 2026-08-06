import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { TOOLTIP_SPACING } from '../constants/config';
import type { MapTooltipData } from './MapCanvas';

const TOOLTIP_OFFSET = TOOLTIP_SPACING;
const VIEWPORT_MARGIN = TOOLTIP_SPACING;

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

export function getTooltipMeasurementPosition(): TooltipPosition {
  return {
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
  };
}

interface MeasuredTooltipPosition extends TooltipPosition {
  countryId: string;
  inputMethod: MapTooltipData['inputMethod'];
  anchorX: number;
  anchorY: number;
}

export interface TooltipAnchorElement {
  getBoundingClientRect: () => Pick<
    DOMRect,
    'left' | 'top' | 'width' | 'height'
  >;
}

interface TooltipMovementEventTarget {
  addEventListener: (
    type: 'scroll' | 'resize',
    listener: EventListener,
    options?: boolean,
  ) => void;
  removeEventListener: (
    type: 'scroll' | 'resize',
    listener: EventListener,
    options?: boolean,
  ) => void;
}

interface TooltipResizeObserver {
  observe: (anchorElement: TooltipAnchorElement) => void;
  disconnect: () => void;
}

interface ObserveKeyboardTooltipAnchorOptions {
  anchorElement: TooltipAnchorElement;
  onPositionChange: (position: MapTooltipData['position']) => void;
  eventTarget?: TooltipMovementEventTarget;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
  createResizeObserver?: (
    callback: () => void,
  ) => TooltipResizeObserver | null;
}

function getAnchorPosition(
  anchorElement: TooltipAnchorElement,
): MapTooltipData['position'] {
  const bounds = anchorElement.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

function createDefaultResizeObserver(
  callback: () => void,
): TooltipResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') {
    return null;
  }

  const observer = new ResizeObserver(callback);
  return {
    observe: (anchorElement): void => {
      observer.observe(anchorElement as Element);
    },
    disconnect: (): void => observer.disconnect(),
  };
}

export function observeKeyboardTooltipAnchor({
  anchorElement,
  onPositionChange,
  eventTarget = window,
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
  createResizeObserver = createDefaultResizeObserver,
}: ObserveKeyboardTooltipAnchorOptions): () => void {
  let frameHandle: number | null = null;
  let isActive = true;

  const refreshPosition = (): void => {
    frameHandle = null;
    if (isActive) {
      onPositionChange(getAnchorPosition(anchorElement));
    }
  };
  const schedulePositionRefresh = (): void => {
    if (isActive && frameHandle === null) {
      frameHandle = requestFrame(refreshPosition);
    }
  };
  const resizeObserver = createResizeObserver(schedulePositionRefresh);

  eventTarget.addEventListener('scroll', schedulePositionRefresh, true);
  eventTarget.addEventListener('resize', schedulePositionRefresh);
  resizeObserver?.observe(anchorElement);

  return (): void => {
    isActive = false;
    eventTarget.removeEventListener('scroll', schedulePositionRefresh, true);
    eventTarget.removeEventListener('resize', schedulePositionRefresh);
    resizeObserver?.disconnect();

    if (frameHandle !== null) {
      cancelFrame(frameHandle);
    }
  };
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

  useLayoutEffect((): (() => void) | undefined => {
    const tooltip = tooltipRef.current;
    if (data === null || tooltip === null) {
      return undefined;
    }

    const refreshPosition = (anchorPosition: MapTooltipData['position']): void => {
      const bounds = tooltip.getBoundingClientRect();
      const position = calculateTooltipPosition({
        anchorX: anchorPosition.x,
        anchorY: anchorPosition.y,
        tooltipWidth: bounds.width,
        tooltipHeight: bounds.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        inputMethod: data.inputMethod,
      });

      setMeasuredPosition({
        ...position,
        countryId: data.countryId,
        inputMethod: data.inputMethod,
        anchorX: anchorPosition.x,
        anchorY: anchorPosition.y,
      });
    };

    if (data.inputMethod === 'keyboard') {
      refreshPosition(getAnchorPosition(data.anchorElement));
      return observeKeyboardTooltipAnchor({
        anchorElement: data.anchorElement,
        onPositionChange: refreshPosition,
      });
    }

    refreshPosition(data.position);
    return undefined;
  }, [data]);

  if (data === null) {
    return null;
  }

  const isPositionCurrent =
    measuredPosition?.countryId === data.countryId &&
    measuredPosition.inputMethod === data.inputMethod &&
    (data.inputMethod === 'keyboard' ||
      (measuredPosition.anchorX === data.position.x &&
        measuredPosition.anchorY === data.position.y));
  const positionStyle: CSSProperties = isPositionCurrent
    ? { left: measuredPosition.left, top: measuredPosition.top }
    : { ...getTooltipMeasurementPosition(), visibility: 'hidden' };

  return (
    <div
      ref={tooltipRef}
      className="map-tooltip"
      data-input-method={data.inputMethod}
      role="tooltip"
      style={positionStyle}
    >
      <strong className="map-tooltip__country">{data.countryName}</strong>
      {data.isColorable ? (
        <span className="map-tooltip__color">
          Current color: {data.color.toUpperCase()}
        </span>
      ) : (
        <span className="map-tooltip__color">
          Not colorable in this map
        </span>
      )}
      <span className="map-tooltip__boundary">{data.boundaryLine}</span>
    </div>
  );
}
