import { useEffect, useId, useRef, type CSSProperties } from 'react';

import { MAX_ZOOM, MIN_ZOOM } from '../constants/camera';
import { PERIOD_COPY } from '../utils/periods';

export const MAP_NAVIGATION_ZOOM_FACTOR = 1.5;
export const MAP_NAVIGATION_PAN_FRACTION = 0.125;

const MAP_NAVIGATION_CONTROL_SIZE = 44;
const MAP_NAVIGATION_ICON_SIZE = 20;

const CONTROL_STYLE: CSSProperties = {
  inlineSize: MAP_NAVIGATION_CONTROL_SIZE,
  blockSize: MAP_NAVIGATION_CONTROL_SIZE,
};

export type MapPanDirection = 'up' | 'right' | 'down' | 'left';

interface MapNavigationProps {
  readonly currentZoom: number;
  readonly isMoveMapOpen: boolean;
  readonly onMoveMapOpenChange: (isOpen: boolean) => void;
  readonly onZoomIn: (factor: number) => void;
  readonly onZoomOut: (factor: number) => void;
  readonly onPan: (
    direction: MapPanDirection,
    viewportFraction: number,
  ) => void;
  /**
   * CAMERA reset, and the cluster is its only home (D-21). `Reset All Colors`
   * is CONTENT reset and lives in the Colors panel; the two never sit together,
   * and exactly one `Reset View` may exist in the composed DOM.
   */
  readonly onResetView: () => void;
}

export interface MapNavigationDisabledState {
  readonly isZoomInDisabled: boolean;
  readonly isZoomOutDisabled: boolean;
}

export function getMapNavigationDisabledState(
  currentZoom: number,
): MapNavigationDisabledState {
  return {
    isZoomInDisabled: currentZoom >= MAX_ZOOM,
    isZoomOutDisabled: currentZoom <= MIN_ZOOM,
  };
}

/**
 * The floating camera cluster (D-21, D-05): ONE bordered neutral surface in the
 * letterbox gutter holding four 44x44 icon buttons, in the Google-Maps idiom.
 * No accent anywhere - D-05 spends the accent on `Export PNG` in the rail, and
 * the canvas region's entry in the accent budget is literally `none`. No scale
 * bar: it is misleading on a Mercator world map, and cartography is Phase 4.
 *
 * `Move Map` and its pan popover are a DELIBERATE fourth control against
 * D-21's three. They are the only keyboard pan affordance in the app, so
 * dropping them would regress NFR11 and the keyboard-navigation acceptance
 * cells. `03-UI-SPEC.md` Open Items item 2 flagged the retention for owner
 * awareness rather than deciding it silently; a three-control cluster needs a
 * keyboard pan replacement FIRST.
 */
export function MapNavigation({
  currentZoom,
  isMoveMapOpen,
  onMoveMapOpenChange,
  onZoomIn,
  onZoomOut,
  onPan,
  onResetView,
}: MapNavigationProps): JSX.Element {
  const navigationRef = useRef<HTMLDivElement>(null);
  const moveMapButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreMoveMapFocusRef = useRef(false);
  const popoverId = useId();
  const { isZoomInDisabled, isZoomOutDisabled } =
    getMapNavigationDisabledState(currentZoom);

  useEffect((): (() => void) | undefined => {
    if (!isMoveMapOpen) {
      return undefined;
    }

    const handleOutsidePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (
        target instanceof Node &&
        navigationRef.current !== null &&
        !navigationRef.current.contains(target)
      ) {
        onMoveMapOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      shouldRestoreMoveMapFocusRef.current = true;
      onMoveMapOpenChange(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);

    return (): void => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMoveMapOpen, onMoveMapOpenChange]);

  useEffect((): void => {
    if (!isMoveMapOpen && shouldRestoreMoveMapFocusRef.current) {
      shouldRestoreMoveMapFocusRef.current = false;
      moveMapButtonRef.current?.focus();
    }
  }, [isMoveMapOpen]);

  const handlePan = (direction: MapPanDirection): void => {
    onPan(direction, MAP_NAVIGATION_PAN_FRACTION);
  };

  return (
    <div ref={navigationRef} className="map-navigation" data-editor-only="true">
      <div className="map-navigation__cluster" aria-label="Map navigation">
        <button
          type="button"
          className="map-navigation__control"
          aria-label="Zoom In"
          title="Zoom In"
          data-editor-only="true"
          style={CONTROL_STYLE}
          disabled={isZoomInDisabled}
          onClick={(): void => onZoomIn(MAP_NAVIGATION_ZOOM_FACTOR)}
        >
          <svg
            width={MAP_NAVIGATION_ICON_SIZE}
            height={MAP_NAVIGATION_ICON_SIZE}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 4v12M4 10h12" />
          </svg>
        </button>
        <button
          type="button"
          className="map-navigation__control"
          aria-label="Zoom Out"
          title="Zoom Out"
          data-editor-only="true"
          style={CONTROL_STYLE}
          disabled={isZoomOutDisabled}
          onClick={(): void => onZoomOut(MAP_NAVIGATION_ZOOM_FACTOR)}
        >
          <svg
            width={MAP_NAVIGATION_ICON_SIZE}
            height={MAP_NAVIGATION_ICON_SIZE}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M4 10h12" />
          </svg>
        </button>
        <button
          ref={moveMapButtonRef}
          type="button"
          className="map-navigation__control"
          aria-label="Move Map"
          title="Move Map"
          aria-expanded={isMoveMapOpen}
          aria-controls={popoverId}
          aria-haspopup="true"
          data-editor-only="true"
          style={CONTROL_STYLE}
          onClick={(): void => onMoveMapOpenChange(!isMoveMapOpen)}
        >
          <svg
            width={MAP_NAVIGATION_ICON_SIZE}
            height={MAP_NAVIGATION_ICON_SIZE}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 2v16M2 10h16M10 2 7 5M10 2l3 3M18 10l-3-3M18 10l-3 3M10 18l-3-3M10 18l3-3M2 10l3-3M2 10l3 3" />
          </svg>
        </button>
        <button
          type="button"
          className="map-navigation__control"
          aria-label={PERIOD_COPY.resetView}
          title={PERIOD_COPY.resetView}
          data-editor-only="true"
          style={CONTROL_STYLE}
          onClick={onResetView}
        >
          <svg
            width={MAP_NAVIGATION_ICON_SIZE}
            height={MAP_NAVIGATION_ICON_SIZE}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="10" cy="10" r="5" />
            <path d="M10 1v3M10 16v3M1 10h3M16 10h3" />
          </svg>
        </button>
      </div>
      {isMoveMapOpen ? (
        <div
          id={popoverId}
          className="map-navigation__popover"
          role="group"
          aria-label="Move map"
          data-editor-only="true"
        >
          <button
            type="button"
            className="map-navigation__control map-navigation__pan--up"
            aria-label="Pan Up"
            title="Pan Up"
            data-editor-only="true"
            style={CONTROL_STYLE}
            onClick={(): void => handlePan('up')}
          >
            <svg
              width={MAP_NAVIGATION_ICON_SIZE}
              height={MAP_NAVIGATION_ICON_SIZE}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M10 16V4M5 9l5-5 5 5" />
            </svg>
          </button>
          <button
            type="button"
            className="map-navigation__control map-navigation__pan--right"
            aria-label="Pan Right"
            title="Pan Right"
            data-editor-only="true"
            style={CONTROL_STYLE}
            onClick={(): void => handlePan('right')}
          >
            <svg
              width={MAP_NAVIGATION_ICON_SIZE}
              height={MAP_NAVIGATION_ICON_SIZE}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </button>
          <button
            type="button"
            className="map-navigation__control map-navigation__pan--down"
            aria-label="Pan Down"
            title="Pan Down"
            data-editor-only="true"
            style={CONTROL_STYLE}
            onClick={(): void => handlePan('down')}
          >
            <svg
              width={MAP_NAVIGATION_ICON_SIZE}
              height={MAP_NAVIGATION_ICON_SIZE}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M10 4v12M5 11l5 5 5-5" />
            </svg>
          </button>
          <button
            type="button"
            className="map-navigation__control map-navigation__pan--left"
            aria-label="Pan Left"
            title="Pan Left"
            data-editor-only="true"
            style={CONTROL_STYLE}
            onClick={(): void => handlePan('left')}
          >
            <svg
              width={MAP_NAVIGATION_ICON_SIZE}
              height={MAP_NAVIGATION_ICON_SIZE}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M16 10H4M9 5l-5 5 5 5" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
