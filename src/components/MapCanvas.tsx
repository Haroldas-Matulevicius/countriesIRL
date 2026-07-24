import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { geoPath, select } from 'd3';

import type { CameraState, MapCanvasHandle } from '../types/composition';
import type {
  ColorMap,
  CountryId,
  GeoFeature,
  SceneFeature,
  SelectedCountryIds,
} from '../types/map';
import {
  DEFAULT_BORDER_COLOR,
  DEFAULT_COLOR,
  SELECTED_BORDER_COLOR,
} from '../constants/colors';
import { MAP_VIEWBOX_SIZE } from '../constants/config';
import {
  useCameraController,
  type CameraControllerFactory,
} from '../hooks/useCameraController';
import { getEffectiveCountryColor } from '../utils/colors';
import {
  createSafeMapPath,
  createWorldProjection,
} from '../utils/mapProjection';

const MAP_LOAD_START_MARK = 'countriesirl-map-load-start';
const MAP_READY_MEASURE = 'countriesirl-map-ready';
const COLOR_START_MARK = 'countriesirl-color-start';
const COLOR_VISIBLE_MEASURE = 'countriesirl-color-visible';
const UNDO_START_MARK = 'countriesirl-undo-start';
const UNDO_VISIBLE_MEASURE = 'countriesirl-undo-visible';
const REDO_START_MARK = 'countriesirl-redo-start';
const REDO_VISIBLE_MEASURE = 'countriesirl-redo-visible';
const SCENE_PATH_SELECTOR = 'path.scene-path';
const LOGICAL_PATH_SELECTOR = 'path.country-path[data-path-kind="logical"]';
const SCENE_PATH_CLASS = 'scene-path';
const COUNTRY_PATH_CLASS = 'country-path';
const DECORATIVE_PATH_CLASS = 'country-path--decorative';
const NON_SELECTABLE_PATH_CLASS = 'map-unit-path';
const SELECTED_CLASS = 'selected';
const HOVERED_CLASS = 'hovered';
const FOCUSED_CLASS = 'focused';
const DEFAULT_STROKE_WIDTH = '1';
const SELECTED_STROKE_WIDTH = '2';
const WRAP_OFFSETS = [-MAP_VIEWBOX_SIZE, 0, MAP_VIEWBOX_SIZE] as const;

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

export interface MapCanvasProps {
  features: ReadonlyArray<SceneFeature>;
  colors: ColorMap;
  selectedIds: SelectedCountryIds;
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onTooltipChange: (data: MapTooltipData | null) => void;
  onCameraCommit?: (camera: CameraState) => void;
  controllerFactory?: CameraControllerFactory;
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

export interface WrappedScenePath {
  readonly key: string;
  readonly sceneUnitId: string;
  readonly entityId: CountryId;
  readonly feature: SceneFeature;
  readonly offsetX: number;
  readonly kind: 'logical' | 'decorative';
  readonly isAccessible: boolean;
  readonly isFocusable: boolean;
  readonly isPrimaryVisual: boolean;
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

function getInteractionId(feature: SceneFeature): CountryId {
  return feature.entityId;
}

export function createWrappedSceneModel(
  features: ReadonlyArray<SceneFeature>,
): ReadonlyArray<WrappedScenePath> {
  return features.flatMap((feature): ReadonlyArray<WrappedScenePath> =>
    WRAP_OFFSETS.map((offsetX): WrappedScenePath => {
      const isPrimaryVisual = offsetX === 0;
      const isLogical = feature.isSelectable && isPrimaryVisual;
      return {
        key: `${feature.id}:${offsetX}`,
        sceneUnitId: feature.id,
        entityId: feature.entityId,
        feature,
        offsetX,
        kind: isLogical ? 'logical' : 'decorative',
        isAccessible: isLogical,
        isFocusable: isLogical,
        isPrimaryVisual,
      };
    }),
  );
}

export function getSceneFeatureColor(
  feature: SceneFeature,
  colors: ColorMap,
): string {
  return feature.colorOwnerId === null
    ? DEFAULT_COLOR
    : getEffectiveCountryColor(colors, feature.colorOwnerId);
}

export function pointerTooltipData(
  event: PointerEvent,
  feature: GeoFeature,
  color: string,
  countryId: CountryId = feature.id,
): MapTooltipData {
  return {
    countryId,
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
  countryId: CountryId = feature.id,
): MapTooltipData {
  const bounds = pathElement.getBoundingClientRect();

  return {
    countryId,
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
  countryId: CountryId = feature.id,
): MapTooltipData | null {
  return activeElement === pathElement
    ? keyboardTooltipData(pathElement, feature, color, countryId)
    : null;
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      features,
      colors,
      selectedIds,
      onSelectCountry,
      onClearSelection,
      onTooltipChange,
      onCameraCommit,
      controllerFactory,
    }: MapCanvasProps,
    mapCanvasRef,
  ): JSX.Element {
    const exportSourceRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const cameraLayerRef = useRef<SVGGElement>(null);
    const activeCountryIdRef = useRef<CountryId | null>(null);
    const mapReadyMeasuredRef = useRef(false);
    const colorsRef = useRef(colors);
    const callbacksRef = useRef<MapCanvasCallbacks>({
      onSelectCountry,
      onClearSelection,
      onTooltipChange,
    });
    const cameraController = useCameraController({
      svgRef,
      cameraLayerRef,
      features,
      onCameraCommit,
      controllerFactory,
    });
    const focusCountry = useCallback((countryId: CountryId): void => {
      const source = exportSourceRef.current;
      const escapedCountryId = CSS.escape(countryId);
      const path = source?.querySelector<SVGPathElement>(
        `${LOGICAL_PATH_SELECTOR}[data-country-id="${escapedCountryId}"]`,
      );
      path?.focus({ preventScroll: true });
    }, []);

    useImperativeHandle(
      mapCanvasRef,
      (): MapCanvasHandle => ({
        readCurrentCamera: cameraController.readCurrentCamera,
        freezeAndSnapshot: cameraController.freezeAndSnapshot,
        zoomBy: cameraController.zoomBy,
        pan: cameraController.pan,
        resetView: cameraController.resetView,
        locate: cameraController.locate,
        restore: cameraController.restore,
        focusCountry,
        getExportSource: (): HTMLDivElement | null => exportSourceRef.current,
      }),
      [cameraController, focusCountry],
    );

    useLayoutEffect((): void => {
      colorsRef.current = colors;
      callbacksRef.current = {
        onSelectCountry,
        onClearSelection,
        onTooltipChange,
      };
    }, [colors, onClearSelection, onSelectCountry, onTooltipChange]);

    const selectableFeatures = useMemo<ReadonlyArray<SceneFeature>>(
      () =>
        features
          .filter((feature): boolean => feature.isSelectable)
          .sort(
            (first, second): number =>
              first.properties.name.localeCompare(second.properties.name) ||
              first.entityId.localeCompare(second.entityId),
          ),
      [features],
    );
    const wrappedScene = useMemo(
      () => createWrappedSceneModel(features),
      [features],
    );

    useLayoutEffect((): (() => void) | undefined => {
      const svgElement = svgRef.current;
      if (svgElement === null || wrappedScene.length === 0) {
        return undefined;
      }

      const countriesLayer = select(svgElement).select<SVGGElement>(
        '[data-layer="countries"]',
      );
      const projection = createWorldProjection();
      const pathGenerator = geoPath(projection);
      const countryIndexById = new Map<CountryId, number>(
        selectableFeatures.map(
          (feature, index): [CountryId, number] => [feature.entityId, index],
        ),
      );

      const paths = countriesLayer
        .selectAll<SVGPathElement, WrappedScenePath>(SCENE_PATH_SELECTOR)
        .data(wrappedScene, (path): string => path.key)
        .join(
          (enter) => enter.append('path').attr('vector-effect', 'non-scaling-stroke'),
          (update) => update,
          (exit) => exit.remove(),
        )
        .attr('class', (path): string => {
          const interactionClass = path.feature.isSelectable
            ? path.kind === 'logical'
              ? COUNTRY_PATH_CLASS
              : DECORATIVE_PATH_CLASS
            : NON_SELECTABLE_PATH_CLASS;
          return `${SCENE_PATH_CLASS} ${interactionClass}`;
        })
        .attr('data-path-kind', (path): string => path.kind)
        .attr('data-primary-unit', (path): string => String(path.isPrimaryVisual))
        .attr('data-scene-unit-id', (path): string | null =>
          path.isPrimaryVisual ? path.sceneUnitId : null,
        )
        .attr('data-country-id', (path): CountryId | null =>
          path.kind === 'logical' ? path.entityId : null,
        )
        .attr('transform', (path): string => `translate(${path.offsetX} 0)`)
        .attr('d', (path): string =>
          createSafeMapPath(pathGenerator, path.feature),
        )
        .attr('role', (path): string | null =>
          path.isAccessible ? 'option' : null,
        )
        .attr('aria-hidden', (path): string | null =>
          path.isAccessible ? null : 'true',
        )
        .attr('focusable', (path): string =>
          path.isFocusable ? 'true' : 'false',
        )
        .attr('tabindex', -1)
        .on('click.map', (event: MouseEvent, path): void => {
          if (!path.feature.isSelectable) {
            return;
          }
          event.stopPropagation();
          activeCountryIdRef.current = path.entityId;
          paths.attr('tabindex', (candidate): number =>
            candidate.kind === 'logical' && candidate.entityId === path.entityId
              ? 0
              : -1,
          );
          callbacksRef.current.onSelectCountry(path.entityId);
          if (path.kind === 'decorative') {
            focusCountry(path.entityId);
          }
        })
        .on('pointerenter.map', (event: PointerEvent, path): void => {
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.add(HOVERED_CLASS);
          }
          callbacksRef.current.onTooltipChange(
            pointerTooltipData(
              event,
              path.feature,
              getSceneFeatureColor(path.feature, colorsRef.current),
              getInteractionId(path.feature),
            ),
          );
        })
        .on('pointermove.map', (event: PointerEvent, path): void => {
          callbacksRef.current.onTooltipChange(
            pointerTooltipData(
              event,
              path.feature,
              getSceneFeatureColor(path.feature, colorsRef.current),
              getInteractionId(path.feature),
            ),
          );
        })
        .on('pointerleave.map', (event: PointerEvent, path): void => {
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.remove(HOVERED_CLASS);
            callbacksRef.current.onTooltipChange(
              pointerLeaveTooltipData(
                event.currentTarget,
                document.activeElement,
                path.feature,
                getSceneFeatureColor(path.feature, colorsRef.current),
                getInteractionId(path.feature),
              ),
            );
            return;
          }
          callbacksRef.current.onTooltipChange(null);
        })
        .on('focus.map', (event: FocusEvent, path): void => {
          if (!path.isFocusable || !isSvgPathElement(event.currentTarget)) {
            return;
          }
          activeCountryIdRef.current = path.entityId;
          paths.attr('tabindex', (candidate): number =>
            candidate.kind === 'logical' && candidate.entityId === path.entityId
              ? 0
              : -1,
          );
          event.currentTarget.classList.add(FOCUSED_CLASS);
          callbacksRef.current.onTooltipChange(
            keyboardTooltipData(
              event.currentTarget,
              path.feature,
              getSceneFeatureColor(path.feature, colorsRef.current),
              path.entityId,
            ),
          );
        })
        .on('blur.map', (event: FocusEvent): void => {
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.remove(FOCUSED_CLASS);
          }
          callbacksRef.current.onTooltipChange(null);
        })
        .on('keydown.map', (event: KeyboardEvent, path): void => {
          if (!path.isFocusable) {
            return;
          }
          const currentIndex = countryIndexById.get(path.entityId);
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
              nextIndex = Math.min(selectableFeatures.length - 1, currentIndex + 1);
              break;
            case 'Home':
              nextIndex = 0;
              break;
            case 'End':
              nextIndex = selectableFeatures.length - 1;
              break;
            case 'Enter':
            case ' ':
              event.preventDefault();
              callbacksRef.current.onSelectCountry(path.entityId);
              return;
            case 'Escape':
              event.preventDefault();
              callbacksRef.current.onClearSelection();
              return;
            default:
              return;
          }

          event.preventDefault();
          const nextFeature = selectableFeatures[nextIndex];
          if (nextFeature === undefined) {
            return;
          }
          activeCountryIdRef.current = nextFeature.entityId;
          paths.attr('tabindex', (candidate): number =>
            candidate.kind === 'logical' &&
            candidate.entityId === nextFeature.entityId
              ? 0
              : -1,
          );
          focusCountry(nextFeature.entityId);
        });

      if (!mapReadyMeasuredRef.current) {
        const cancelPaintMeasurement = runAfterPaint((): void => {
          measureAndConsume(MAP_LOAD_START_MARK, MAP_READY_MEASURE);
          mapReadyMeasuredRef.current = true;
        });
        return (): void => {
          cancelPaintMeasurement();
          paths.on('.map', null);
          paths.interrupt();
        };
      }

      return (): void => {
        paths.on('.map', null);
        paths.interrupt();
      };
    }, [focusCountry, selectableFeatures, wrappedScene]);

    useEffect((): (() => void) | undefined => {
      const svgElement = svgRef.current;
      if (svgElement === null || wrappedScene.length === 0) {
        return undefined;
      }

      const validIds = new Set(
        selectableFeatures.map((feature): CountryId => feature.entityId),
      );
      if (
        activeCountryIdRef.current === null ||
        !validIds.has(activeCountryIdRef.current)
      ) {
        activeCountryIdRef.current = selectableFeatures[0]?.entityId ?? null;
      }
      const activeCountryId = activeCountryIdRef.current;
      const paths = select(svgElement)
        .select<SVGGElement>('[data-layer="countries"]')
        .selectAll<SVGPathElement, WrappedScenePath>(SCENE_PATH_SELECTOR)
        .attr('fill', (path): string =>
          getSceneFeatureColor(path.feature, colors),
        )
        .attr('stroke', (path): string =>
          path.feature.isSelectable && selectedIds.has(path.entityId)
            ? SELECTED_BORDER_COLOR
            : DEFAULT_BORDER_COLOR,
        )
        .attr('stroke-width', (path): string =>
          path.feature.isSelectable && selectedIds.has(path.entityId)
            ? SELECTED_STROKE_WIDTH
            : DEFAULT_STROKE_WIDTH,
        )
        .classed(
          SELECTED_CLASS,
          (path): boolean =>
            path.feature.isSelectable && selectedIds.has(path.entityId),
        )
        .attr('aria-selected', (path): string | null =>
          path.isAccessible ? String(selectedIds.has(path.entityId)) : null,
        )
        .attr('aria-label', (path): string | null => {
          if (!path.isAccessible) {
            return null;
          }
          const color = getSceneFeatureColor(path.feature, colors);
          return `${path.feature.properties.name}, current color ${color}`;
        })
        .attr('tabindex', (path): number =>
          path.kind === 'logical' && path.entityId === activeCountryId ? 0 : -1,
        );

      paths.selectAll('title').remove();
      paths
        .filter((path): boolean => path.isAccessible)
        .append('title')
        .text((path): string => {
          const color = getSceneFeatureColor(path.feature, colors);
          return `${path.feature.properties.name}, ${color}`;
        });

      return runAfterPaint((): void => {
        INTERACTION_MEASURES.forEach(
          ({ startMark, measureName }): void => {
            measureAndConsume(startMark, measureName);
          },
        );
      });
    }, [colors, selectableFeatures, selectedIds, wrappedScene]);

    const handleBackgroundClick = useCallback(
      (event: ReactMouseEvent<SVGSVGElement>): void => {
        const target = event.target;
        if (target instanceof Element && target.closest(SCENE_PATH_SELECTOR)) {
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
          aria-label="Interactive map of the world"
          aria-multiselectable="true"
          onClick={handleBackgroundClick}
        >
          <g ref={cameraLayerRef} data-layer="camera">
            <g data-layer="countries" />
          </g>
        </svg>
      </div>
    );
  },
);
