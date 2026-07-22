import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  geoPath,
  select,
} from 'd3';

import type {
  ColorMap,
  CountryId,
  GeoFeature,
  SelectedCountryIds,
} from '../types/map';
import {
  DEFAULT_BORDER_COLOR,
  SELECTED_BORDER_COLOR,
} from '../constants/colors';
import { MAP_VIEWBOX_SIZE } from '../constants/config';
import { getEffectiveCountryColor } from '../utils/colors';
import { createFixedEuropeProjection } from '../utils/mapProjection';

const MAP_LOAD_START_MARK = 'countriesirl-map-load-start';
const MAP_READY_MEASURE = 'countriesirl-map-ready';
const COLOR_START_MARK = 'countriesirl-color-start';
const COLOR_VISIBLE_MEASURE = 'countriesirl-color-visible';
const UNDO_START_MARK = 'countriesirl-undo-start';
const UNDO_VISIBLE_MEASURE = 'countriesirl-undo-visible';
const REDO_START_MARK = 'countriesirl-redo-start';
const REDO_VISIBLE_MEASURE = 'countriesirl-redo-visible';
const COUNTRY_PATH_SELECTOR = 'path.country-path';
const COUNTRY_PATH_CLASS = 'country-path';
const SELECTED_CLASS = 'selected';
const HOVERED_CLASS = 'hovered';
const FOCUSED_CLASS = 'focused';
const DEFAULT_STROKE_WIDTH = '1';
const SELECTED_STROKE_WIDTH = '2';

interface MapTooltipContent {
  countryId: CountryId;
  countryName: string;
  color: string;
  position: {
    x: number;
    y: number;
  };
}

export type MapTooltipData =
  | (MapTooltipContent & { inputMethod: 'pointer' })
  | (MapTooltipContent & {
      inputMethod: 'keyboard';
      anchorElement: SVGPathElement;
    });

interface MapCanvasProps {
  features: ReadonlyArray<GeoFeature>;
  colors: ColorMap;
  selectedIds: SelectedCountryIds;
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onTooltipChange: (data: MapTooltipData | null) => void;
}

interface MapCanvasCallbacks {
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onTooltipChange: (data: MapTooltipData | null) => void;
}

interface PerformanceMeasurePair {
  startMark: string;
  measureName: string;
}

const INTERACTION_MEASURES: ReadonlyArray<PerformanceMeasurePair> = [
  { startMark: COLOR_START_MARK, measureName: COLOR_VISIBLE_MEASURE },
  { startMark: UNDO_START_MARK, measureName: UNDO_VISIBLE_MEASURE },
  { startMark: REDO_START_MARK, measureName: REDO_VISIBLE_MEASURE },
];

function hasPerformanceMark(markName: string): boolean {
  return performance.getEntriesByName(markName, 'mark').length > 0;
}

function measureAndConsume(startMark: string, measureName: string): void {
  if (!hasPerformanceMark(startMark)) {
    return;
  }

  performance.measure(measureName, startMark);
  performance.clearMarks(startMark);
}

function runAfterPaint(callback: () => void): () => void {
  let paintFrame: number | null = null;
  const updateFrame = requestAnimationFrame((): void => {
    paintFrame = requestAnimationFrame(callback);
  });

  return (): void => {
    cancelAnimationFrame(updateFrame);
    if (paintFrame !== null) {
      cancelAnimationFrame(paintFrame);
    }
  };
}

function isSvgPathElement(
  target: EventTarget | null,
): target is SVGPathElement {
  return target instanceof SVGPathElement;
}

export function pointerTooltipData(
  event: PointerEvent,
  feature: GeoFeature,
  color: string,
): MapTooltipData {
  return {
    countryId: feature.id,
    countryName: feature.properties.name,
    color,
    inputMethod: 'pointer',
    position: {
      x: event.clientX,
      y: event.clientY,
    },
  };
}

export function keyboardTooltipData(
  pathElement: SVGPathElement,
  feature: GeoFeature,
  color: string,
): MapTooltipData {
  const bounds = pathElement.getBoundingClientRect();

  return {
    countryId: feature.id,
    countryName: feature.properties.name,
    color,
    inputMethod: 'keyboard',
    anchorElement: pathElement,
    position: {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    },
  };
}

export function pointerLeaveTooltipData(
  pathElement: SVGPathElement,
  activeElement: Element | null,
  feature: GeoFeature,
  color: string,
): MapTooltipData | null {
  return activeElement === pathElement
    ? keyboardTooltipData(pathElement, feature, color)
    : null;
}

export const MapCanvas = forwardRef<HTMLDivElement, MapCanvasProps>(
  function MapCanvas(
    {
      features,
      colors,
      selectedIds,
      onSelectCountry,
      onClearSelection,
      onTooltipChange,
    }: MapCanvasProps,
    exportSourceRef,
  ): JSX.Element {
    const svgRef = useRef<SVGSVGElement>(null);
    const activeCountryIdRef = useRef<CountryId | null>(null);
    const mapReadyMeasuredRef = useRef(false);
    const colorsRef = useRef(colors);
    const callbacksRef = useRef<MapCanvasCallbacks>({
      onSelectCountry,
      onClearSelection,
      onTooltipChange,
    });

    colorsRef.current = colors;
    callbacksRef.current = {
      onSelectCountry,
      onClearSelection,
      onTooltipChange,
    };

    const alphabeticalFeatures = useMemo<ReadonlyArray<GeoFeature>>(
      () =>
        [...features].sort(
          (first, second): number =>
            first.properties.name.localeCompare(second.properties.name) ||
            first.id.localeCompare(second.id),
        ),
      [features],
    );

    useLayoutEffect((): (() => void) | undefined => {
      const svgElement = svgRef.current;
      if (svgElement === null || alphabeticalFeatures.length === 0) {
        return undefined;
      }

      const countriesLayer = select(svgElement).select<SVGGElement>(
        '[data-layer="countries"]',
      );
      const projection = createFixedEuropeProjection(alphabeticalFeatures);
      const pathGenerator = geoPath(projection);
      const countryIndexById = new Map<CountryId, number>(
        alphabeticalFeatures.map(
          (feature, index): [CountryId, number] => [feature.id, index],
        ),
      );

      const countries = countriesLayer
        .selectAll<SVGPathElement, GeoFeature>(COUNTRY_PATH_SELECTOR)
        .data(alphabeticalFeatures, (feature): CountryId => feature.id)
        .join(
          (enter) => {
            const paths = enter
              .append('path')
              .attr('class', COUNTRY_PATH_CLASS)
              .attr('role', 'option')
              .attr('data-country-id', (feature): CountryId => feature.id)
              .attr('vector-effect', 'non-scaling-stroke');

            paths.append('title');
            return paths;
          },
          (update) => update,
          (exit) => exit.remove(),
        )
        .attr('d', (feature): string => pathGenerator(feature) ?? '')
        .on('click.map', (event: MouseEvent, feature): void => {
          event.stopPropagation();
          activeCountryIdRef.current = feature.id;
          countries.attr(
            'tabindex',
            (candidate): number => (candidate.id === feature.id ? 0 : -1),
          );
          callbacksRef.current.onSelectCountry(feature.id);
        })
        .on('pointerenter.map', (event: PointerEvent, feature): void => {
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.add(HOVERED_CLASS);
          }
          callbacksRef.current.onTooltipChange(
            pointerTooltipData(
              event,
              feature,
              getEffectiveCountryColor(colorsRef.current, feature.id),
            ),
          );
        })
        .on('pointermove.map', (event: PointerEvent, feature): void => {
          callbacksRef.current.onTooltipChange(
            pointerTooltipData(
              event,
              feature,
              getEffectiveCountryColor(colorsRef.current, feature.id),
            ),
          );
        })
        .on('pointerleave.map', (event: PointerEvent, feature): void => {
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.remove(HOVERED_CLASS);
            callbacksRef.current.onTooltipChange(
              pointerLeaveTooltipData(
                event.currentTarget,
                document.activeElement,
                feature,
                getEffectiveCountryColor(colorsRef.current, feature.id),
              ),
            );
            return;
          }
          callbacksRef.current.onTooltipChange(null);
        })
        .on('focus.map', (event: FocusEvent, feature): void => {
          if (!isSvgPathElement(event.currentTarget)) {
            return;
          }

          activeCountryIdRef.current = feature.id;
          countries.attr(
            'tabindex',
            (candidate): number => (candidate.id === feature.id ? 0 : -1),
          );
          event.currentTarget.classList.add(FOCUSED_CLASS);
          callbacksRef.current.onTooltipChange(
            keyboardTooltipData(
              event.currentTarget,
              feature,
              getEffectiveCountryColor(colorsRef.current, feature.id),
            ),
          );
        })
        .on('blur.map', (event: FocusEvent): void => {
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.remove(FOCUSED_CLASS);
          }
          callbacksRef.current.onTooltipChange(null);
        })
        .on('keydown.map', (event: KeyboardEvent, feature): void => {
          const currentIndex = countryIndexById.get(feature.id);
          if (currentIndex === undefined) {
            return;
          }

          let nextIndex: number;
          switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
              nextIndex = Math.max(0, currentIndex - 1);
              break;
            case 'ArrowRight':
            case 'ArrowDown':
              nextIndex = Math.min(
                alphabeticalFeatures.length - 1,
                currentIndex + 1,
              );
              break;
            case 'Home':
              nextIndex = 0;
              break;
            case 'End':
              nextIndex = alphabeticalFeatures.length - 1;
              break;
            case 'Enter':
            case ' ':
              event.preventDefault();
              callbacksRef.current.onSelectCountry(feature.id);
              return;
            case 'Escape':
              event.preventDefault();
              callbacksRef.current.onClearSelection();
              return;
            default:
              return;
          }

          event.preventDefault();
          const nextFeature = alphabeticalFeatures[nextIndex];
          if (nextFeature === undefined) {
            return;
          }

          activeCountryIdRef.current = nextFeature.id;
          countries.attr(
            'tabindex',
            (candidate): number =>
              candidate.id === nextFeature.id ? 0 : -1,
          );
          countries
            .filter((candidate): boolean => candidate.id === nextFeature.id)
            .node()
            ?.focus();
        });

      if (!mapReadyMeasuredRef.current) {
        const cancelPaintMeasurement = runAfterPaint((): void => {
          measureAndConsume(MAP_LOAD_START_MARK, MAP_READY_MEASURE);
          mapReadyMeasuredRef.current = true;
        });

        return (): void => {
          cancelPaintMeasurement();
          countries.on('.map', null);
          countries.interrupt();
        };
      }

      return (): void => {
        countries.on('.map', null);
        countries.interrupt();
      };
    }, [alphabeticalFeatures]);

    useEffect((): (() => void) | undefined => {
      const svgElement = svgRef.current;
      if (svgElement === null || alphabeticalFeatures.length === 0) {
        return undefined;
      }

      const validIds = new Set(
        alphabeticalFeatures.map((feature): CountryId => feature.id),
      );
      if (
        activeCountryIdRef.current === null ||
        !validIds.has(activeCountryIdRef.current)
      ) {
        activeCountryIdRef.current = alphabeticalFeatures[0]?.id ?? null;
      }

      const activeCountryId = activeCountryIdRef.current;
      const countries = select(svgElement)
        .select<SVGGElement>('[data-layer="countries"]')
        .selectAll<SVGPathElement, GeoFeature>(COUNTRY_PATH_SELECTOR)
        .attr(
          'fill',
          (feature): string => getEffectiveCountryColor(colors, feature.id),
        )
        .attr('stroke', (feature): string =>
          selectedIds.has(feature.id)
            ? SELECTED_BORDER_COLOR
            : DEFAULT_BORDER_COLOR,
        )
        .attr('stroke-width', (feature): string =>
          selectedIds.has(feature.id)
            ? SELECTED_STROKE_WIDTH
            : DEFAULT_STROKE_WIDTH,
        )
        .classed(SELECTED_CLASS, (feature): boolean =>
          selectedIds.has(feature.id),
        )
        .attr('aria-selected', (feature): string =>
          String(selectedIds.has(feature.id)),
        )
        .attr('aria-label', (feature): string => {
          const color = getEffectiveCountryColor(colors, feature.id);
          return `${feature.properties.name}, current color ${color}`;
        })
        .attr('tabindex', (feature): number =>
          feature.id === activeCountryId ? 0 : -1,
        );

      countries
        .select<SVGTitleElement>('title')
        .text((feature): string => {
          const color = getEffectiveCountryColor(colors, feature.id);
          return `${feature.properties.name}, ${color}`;
        });

      return runAfterPaint((): void => {
        INTERACTION_MEASURES.forEach(
          ({ startMark, measureName }): void => {
            measureAndConsume(startMark, measureName);
          },
        );
      });
    }, [alphabeticalFeatures, colors, selectedIds]);

    const handleBackgroundClick = useCallback(
      (event: ReactMouseEvent<SVGSVGElement>): void => {
        const target = event.target;
        if (target instanceof Element && target.closest(COUNTRY_PATH_SELECTOR)) {
          return;
        }
        onClearSelection();
      },
      [onClearSelection],
    );

    return (
      <div className="map-export-source" ref={exportSourceRef}>
        <svg
          ref={svgRef}
          className="map-canvas"
          viewBox={`0 0 ${MAP_VIEWBOX_SIZE} ${MAP_VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          role="listbox"
          aria-label="Interactive map of modern Europe"
          aria-multiselectable="true"
          onClick={handleBackgroundClick}
        >
          <g data-layer="countries" />
        </svg>
      </div>
    );
  },
);
