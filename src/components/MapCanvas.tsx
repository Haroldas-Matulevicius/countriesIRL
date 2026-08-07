import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from 'react';
import { geoPath, select, type Selection } from 'd3';

import type {
  CameraState,
  MapCanvasHandle,
  SnapshotId,
  StrokeWeight,
} from '../types/composition';
import type {
  ColorMap,
  CountryId,
  GeoFeature,
  SceneFeature,
  SelectedCountryIds,
} from '../types/map';
import {
  BAND_HANDLE_COLOR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_COLOR,
  HOVERED_BORDER_COLOR,
  NEUTRAL_UNIT_COLOR,
  SELECTED_BORDER_COLOR,
} from '../constants/colors';
import { SCENE_CROSSFADE_DURATION_MS } from '../constants/camera';
import {
  EXPORT_BORDER_COLOR_ATTRIBUTE,
  EXPORT_STROKE_WEIGHT_ATTRIBUTE,
  MAP_VIEWBOX_SIZE,
} from '../constants/config';
import {
  BAND_LABELS,
  DEFAULT_BOTTOM_BAND_VISIBLE,
  DEFAULT_COASTLINE_WEIGHT,
  DEFAULT_INTERIOR_WEIGHT,
  DEFAULT_SURFACE_COLOR,
  DEFAULT_TOP_BAND_VISIBLE,
  DEFAULT_UNCOLORED_FILL,
  hasStroke,
  strokeWidthFor,
} from '../constants/mapStyle';
import {
  BAND_DEFAULT_HEIGHT,
  BAND_KEYBOARD_STEP,
  BAND_MAX_HEIGHT,
  bandGradientStops,
  clampBandHeight,
  resolveBandExtents,
} from '../utils/bands';
import {
  useCameraController,
  type CameraControllerFactory,
} from '../hooks/useCameraController';
import { getEffectiveCountryColor } from '../utils/colors';
import type { BorderMesh } from '../utils/geojson';
import { assertUniqueSceneIdentities } from '../utils/scene';
import { getBoundaryLine, getMapAccessibleLabel } from '../utils/periods';
import {
  createSafeMapPath,
  createWorldProjection,
} from '../utils/mapProjection';
import {
  MOTION_SCENE_TOKEN,
  resolveCameraEasing,
  resolveMotionDuration,
} from '../utils/motion';

const MAP_LOAD_START_MARK = 'countriesirl-map-load-start';
const MAP_READY_MEASURE = 'countriesirl-map-ready';
const COLOR_START_MARK = 'countriesirl-color-start';
const COLOR_VISIBLE_MEASURE = 'countriesirl-color-visible';
const UNDO_START_MARK = 'countriesirl-undo-start';
const UNDO_VISIBLE_MEASURE = 'countriesirl-undo-visible';
const REDO_START_MARK = 'countriesirl-redo-start';
const REDO_VISIBLE_MEASURE = 'countriesirl-redo-visible';
/*
 * 04-10 / D4-16. The two gradient ids, and the ONE reason they are constants.
 *
 * `sanitizeExportClone` strips every `id` UNLESS `collectReferencedIds` found a
 * `url(#...)` or `href="#..."` pointing at it. The band rect's
 * `fill="url(#...)"` is exactly what that scan looks for, so the id survives and
 * the gradient comes with it. A gradient referenced only from a stylesheet
 * loses its id and disappears from the PNG SILENTLY - the editor still looks
 * perfect. Spelling the id in one place is what keeps the rect and the
 * `<linearGradient>` from drifting into that state.
 */
const BAND_TOP_GRADIENT_ID = 'countriesirl-band-top';
const BAND_BOTTOM_GRADIENT_ID = 'countriesirl-band-bottom';

/*
 * The drag handle's geometry, in user units of the 1080 viewBox.
 *
 * `BAND_HANDLE_HIT_HEIGHT` is A7's 44 target. It is a CENTERED pill rather than
 * a full-width strip on purpose: a 1080-wide hit area at the band edge would
 * swallow every country click in that band of the map, which is the same
 * pointer-stealing defect `pointer-events: none` on the mesh and the highlight
 * layers exists to prevent.
 *
 * The unit-to-CSS-pixel mapping depends on the rendered canvas size, so the
 * rendered box is MEASURED in `export.spec.ts` rather than assumed to be 1:1.
 */
const BAND_HANDLE_HIT_HEIGHT = 44;
const BAND_HANDLE_HIT_WIDTH = 88;
const BAND_HANDLE_LINE_WIDTH = 64;
const BAND_HANDLE_STROKE_WIDTH = 3;

type BandEdge = 'top' | 'bottom';

const COUNTRIES_LAYER_SELECTOR = '[data-layer="countries"]';
const OUTGOING_LAYER_SELECTOR = '[data-layer="outgoing-scenes"]';
/*
 * 04-09. The interior-border mesh's own class, and it is deliberately NEITHER
 * `scene-path` NOR `country-path`.
 *
 * `sanitizeExportClone` normalises `path.scene-path,path.country-path` against
 * the COASTLINE contract (`data-coastline-weight`). A mesh carrying either class
 * would have its interior weight overwritten by the coastline weight in the
 * download while the editor kept showing the creator's choice - which is the
 * editor-versus-PNG disagreement this whole phase exists to close. The mesh
 * carries its stroke as inline attributes instead, so the exporter has nothing
 * to do for it and cannot do the wrong thing.
 */
const BORDER_MESH_PATH_CLASS = 'border-mesh-path';
/*
 * 04-09 / `04-UI-SPEC.md` section 6.9. Hover and selection render on their OWN
 * layer, and the layer is `data-editor-only` so `sanitizeExportClone` removes
 * it wholesale.
 *
 * The problem it solves is measured, not stylistic: `src/constants/colors.ts`
 * records that border WEIGHT, not colour, carries interaction state - every
 * border is black at every state - and `04-08` made `coastlineWeight: none` the
 * default. There is then no coastline stroke left to thicken, so at the shipped
 * default a creator got no hover or selection feedback at all on a coastal
 * country. Moving the feedback onto its own layer DECOUPLES it from the
 * composition choice: picking `none` no longer costs the affordance.
 *
 * It is NOT expressed on the interior mesh, and that is CD-11: a mesh segment
 * belongs to TWO countries, so weighting one segment would highlight both.
 */
const HIGHLIGHT_PATH_CLASS = 'map-highlight-path';
const HIGHLIGHT_HOVERED_CLASS = 'map-highlight-path--hovered';
const HIGHLIGHT_SELECTED_CLASS = 'map-highlight-path--selected';
/**
 * User units of the 1080 viewBox, per `04-UI-SPEC.md § 6.9`. They are NOT in
 * `STROKE_WEIGHT_UNITS`: that table is the creator's composition vocabulary and
 * these are editor chrome, so putting them there would make a hover affordance
 * a pickable border weight.
 */
const HIGHLIGHT_STROKE_WIDTHS = {
  hovered: '1.5',
  selected: '2.5',
} as const;

/**
 * The stroke is written INLINE as well, and the reason is a measured gate
 * failure rather than a preference.
 *
 * `MapCanvas.css` styles these paths from `var(--map-border-hover)` /
 * `var(--map-border-selected)`, which is what the editor sees and what keeps
 * those two mode-invariant tokens consumed. But the export clone rasterises as
 * an isolated document with NO host stylesheet, so a highlight path whose only
 * stroke came from CSS renders nothing there - which meant the PNG gate for
 * "interaction state never reaches the download" **could not go red** when the
 * `data-editor-only` attribute was deleted. A second, accidental mechanism was
 * hiding the one under test: exactly the shape this repository keeps shipping.
 *
 * Writing the colour inline as well makes the sanitizer the ONLY thing standing
 * between a selection ring and a creator's published image, so the gate can
 * fail on its own subject. On screen the class rule out-specifies the
 * presentation attribute, so the tokens still decide what the editor draws;
 * `uiContract.test.ts` asserts the constant and the token are equal in both
 * directions, so the two routes cannot drift apart.
 */
const HIGHLIGHT_STROKE_COLORS = {
  hovered: HOVERED_BORDER_COLOR,
  selected: SELECTED_BORDER_COLOR,
} as const;

type HighlightState = keyof typeof HIGHLIGHT_STROKE_WIDTHS;

interface HighlightGeometry {
  readonly offsetX: number;
  readonly pathData: string;
}

interface HighlightPathModel {
  readonly key: string;
  readonly offsetX: number;
  readonly pathData: string;
  readonly state: HighlightState;
}

const CROSSFADE_TRANSITION_NAME = 'scene-crossfade';
/**
 * The SPEC default, and the value `--motion-scene` declares. It is a fallback
 * for an unstyled environment only - `resolveMotionDuration` reads the token, so
 * `theme.css` is the source of truth and its reduced-motion `0ms` reaches here.
 */
export const CROSSFADE_DURATION_MS = SCENE_CROSSFADE_DURATION_MS;
const SCENE_PATH_SELECTOR = 'path.scene-path';
const LOGICAL_PATH_SELECTOR = 'path.country-path[data-path-kind="logical"]';
const SCENE_PATH_CLASS = 'scene-path';
const COUNTRY_PATH_CLASS = 'country-path';
const DECORATIVE_PATH_CLASS = 'country-path--decorative';
const NON_SELECTABLE_PATH_CLASS = 'map-unit-path';
/*
 * State MARKERS, not paint. `04-09` moved the hover and selection weights onto
 * `[data-layer="highlight"]`, so these three classes no longer carry a stroke
 * of their own - `.selected` and `.hovered` have no rule in `MapCanvas.css` at
 * all now, and `.focused` keeps its own (a focus ring is neither hover nor
 * selection). They stay because they are the DOM markers the specs and
 * `sanitizeExportClone`'s class strip are keyed on.
 *
 * The old `SELECTED_STROKE_WIDTH = '2'` presentation attribute is GONE with
 * them: a country path's stroke is now decided by the creator's
 * `coastlineWeight` and by nothing else, which is the whole point of the split.
 */
const SELECTED_CLASS = 'selected';
const HOVERED_CLASS = 'hovered';
const FOCUSED_CLASS = 'focused';
const WRAP_OFFSETS = [-MAP_VIEWBOX_SIZE, 0, MAP_VIEWBOX_SIZE] as const;

interface MapTooltipContent {
  countryId: CountryId;
  countryName: string;
  color: string;
  /**
   * False for null-owner units (disputed/neutral territories). The tooltip
   * then says so instead of announcing a "current color" nobody can change.
   */
  isColorable: boolean;
  /** Exact boundary provenance line (UI-SPEC section 19). */
  boundaryLine: string;
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
  /** Identity of the active scene; a change starts the crossfade. */
  snapshotId: SnapshotId;
  periodLabel: string;
  features: ReadonlyArray<SceneFeature>;
  locateFeatures?: ReadonlyArray<GeoFeature>;
  colors: ColorMap;
  /**
   * D4-03 - the composition's water/background colour, canonical `#RRGGBB`,
   * already validated by the composition reducer. Written as an INLINE `fill`
   * attribute on `rect[data-layer="surface"]`, never as a CSS token: a
   * serialised SVG rasterised as an image sees no host stylesheet, so a `var()`
   * here would render as nothing and a class rule as SVG default black
   * (`04-RESEARCH.md` Export Fidelity Envelope). Defaulted so a caller that has
   * not migrated still paints an opaque square rather than a transparent one.
   */
  surfaceColor?: string;
  /**
   * D4-09 - what a country with no creator colour paints. Reaches the PNG as
   * the path's inline `fill`, exactly like `surfaceColor` reaches the water.
   */
  uncoloredFill?: string;
  /** D4-08 - the resting stroke colour of every country boundary. */
  borderColor?: string;
  /**
   * D4-08 - the resting weight of the country OUTLINE. `none` (the default)
   * omits the stroke entirely rather than drawing a zero-width one.
   */
  coastlineWeight?: StrokeWeight;
  /**
   * D4-08 - the weight of the shared INTERIOR boundaries, resolved through the
   * same `STROKE_WEIGHT_UNITS` table the coastlines and the export clone use.
   * `04-09` closed the stub `04-08` opened here: it is read by the
   * `[data-layer="borders"]` render below.
   */
  interiorWeight?: StrokeWeight;
  /**
   * `04-06`'s derived interior-border mesh - the edges present in exactly two
   * polygons, so a coastline is absent from it by construction. Optional: a
   * caller that does not supply one (the export fixture) renders no interior
   * lines rather than failing, exactly as a load that could not validate the
   * asset does.
   */
  borderMesh?: BorderMesh | null;
  /**
   * D4-16 - the two gradient bands. Both heights are clamped again by
   * `resolveBandExtents` at the render, so a caller that skipped the reducer
   * still cannot draw a map-covering band.
   */
  topBandVisible?: boolean;
  topBandHeight?: number;
  bottomBandVisible?: boolean;
  bottomBandHeight?: number;
  /**
   * The on-canvas drag handle's only writer. Absent for a caller that renders
   * a read-only composition (the export fixture), in which case the handles
   * are not rendered at all - there is nothing for them to write to.
   */
  onBandHeightChange?: (edge: BandEdge, height: number) => void;
  selectedIds: SelectedCountryIds;
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onTooltipChange: (data: MapTooltipData | null) => void;
  legendSlot?: ReactNode;
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

export function resolveCrossfadeDuration(
  prefersReducedMotion: boolean,
): number {
  return prefersReducedMotion ? 0 : CROSSFADE_DURATION_MS;
}

/**
 * The outgoing scene is decoration for the length of the crossfade: it keeps no
 * role, no name, no focus, no hit area, and no country identity, so the incoming
 * scene is the only scene a pointer, a screen reader, or a selector can reach.
 */
function makeOutgoingSceneInert(group: SVGGElement): void {
  group.setAttribute('data-layer', 'outgoing-scene');
  group.setAttribute('aria-hidden', 'true');
  group.removeAttribute('role');
  group.removeAttribute('aria-label');
  group.removeAttribute('aria-multiselectable');
  group.style.pointerEvents = 'none';

  group.querySelectorAll('title').forEach((title): void => {
    title.remove();
  });
  group.querySelectorAll('*').forEach((element): void => {
    element.removeAttribute('role');
    element.removeAttribute('aria-label');
    element.removeAttribute('aria-selected');
    element.removeAttribute('data-country-id');
    element.removeAttribute('data-scene-unit-id');
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('focusable', 'false');
    element.setAttribute('tabindex', '-1');
    element.setAttribute('class', 'outgoing-scene-path');
  });
}

// The one writer of the roving tab stop: exactly one logical path (the active
// country's) carries tabindex 0, every other path -1.
function applyRovingTabStop(
  paths: Selection<SVGPathElement, WrappedScenePath, SVGGElement, unknown>,
  activeEntityId: CountryId | null,
): void {
  paths.attr('tabindex', (candidate): number =>
    candidate.kind === 'logical' && candidate.entityId === activeEntityId
      ? 0
      : -1,
  );
}

function isSvgPathElement(
  target: EventTarget | null,
): target is SVGPathElement {
  return target instanceof SVGPathElement;
}

function getInteractionId(feature: SceneFeature): CountryId {
  return feature.entityId;
}

// Keyed on `isSelectable` deliberately: that is the key logical interactive
// paths are built from below, so it is the key a duplicate `data-country-id`
// would come in through. See `assertUniqueSceneIdentities` in `utils/scene`.
function assertUniqueMapSceneIdentities(
  features: ReadonlyArray<SceneFeature>,
): void {
  assertUniqueSceneIdentities(
    features,
    (feature): boolean => feature.isSelectable,
  );
}

export function getSelectableSceneFeatures(
  features: ReadonlyArray<SceneFeature>,
): SceneFeature[] {
  assertUniqueMapSceneIdentities(features);
  return features.filter((feature): boolean => feature.isSelectable);
}

export function createWrappedSceneModel(
  features: ReadonlyArray<SceneFeature>,
): ReadonlyArray<WrappedScenePath> {
  assertUniqueMapSceneIdentities(features);
  return features.flatMap((feature): ReadonlyArray<WrappedScenePath> => {
    const hasLogicalPath = feature.isSelectable;

    return WRAP_OFFSETS.map((offsetX): WrappedScenePath => {
      const isPrimaryVisual = offsetX === 0;
      const isLogical = hasLogicalPath && isPrimaryVisual;
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
    });
  });
}

/**
 * `uncoloredFill` is D4-09's render-time mapping of the `#FFFFFF` sentinel, and
 * it is applied HERE - to the paint - and nowhere else. The tooltip and the
 * `aria-label` keep announcing the STORED value, because that is the colour a
 * creator's save holds and the one `reconcileLegend` reasons about; announcing
 * the grey would say "coloured" about a country that is not.
 */
export function getSceneFeatureColor(
  feature: SceneFeature,
  colors: ColorMap,
): string {
  // Mirrors `getEffectiveFeatureColor` in `utils/scene`: a null owner renders
  // the neutral fill. If the two disagree, this render-side copy silently wins.
  return feature.colorOwnerId === null
    ? NEUTRAL_UNIT_COLOR
    : getEffectiveCountryColor(colors, feature.colorOwnerId);
}

export function getSceneFeatureFill(
  feature: SceneFeature,
  colors: ColorMap,
  uncoloredFill: string,
): string {
  const stored = getSceneFeatureColor(feature, colors);
  return feature.colorOwnerId !== null && stored === DEFAULT_COLOR
    ? uncoloredFill
    : stored;
}

export function pointerTooltipData(
  event: PointerEvent,
  feature: GeoFeature,
  color: string,
  boundaryLine: string,
  countryId: CountryId = feature.id,
  isColorable = true,
): MapTooltipData {
  return {
    countryId,
    countryName: feature.properties.name,
    color,
    isColorable,
    boundaryLine,
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
  boundaryLine: string,
  countryId: CountryId = feature.id,
  isColorable = true,
): MapTooltipData {
  const bounds = pathElement.getBoundingClientRect();

  return {
    countryId,
    countryName: feature.properties.name,
    color,
    isColorable,
    boundaryLine,
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
  boundaryLine: string,
  countryId: CountryId = feature.id,
  isColorable = true,
): MapTooltipData | null {
  return activeElement === pathElement
    ? keyboardTooltipData(
        pathElement,
        feature,
        color,
        boundaryLine,
        countryId,
        isColorable,
      )
    : null;
}

interface BandHandleProps {
  readonly edge: BandEdge;
  readonly height: number;
  readonly svgRef: RefObject<SVGSVGElement>;
  readonly onHeightChange: (edge: BandEdge, height: number) => void;
}

/**
 * The on-canvas band resize affordance (A7, `04-UI-SPEC.md` § 6.6).
 *
 * `role="slider"` over `aria-valuenow`/`min`/`max`, so the ARROW KEYS MOVE THE
 * VALUE rather than the handle: up and right grow the band, down and left
 * shrink it, and both edges behave identically. Aiming the arrows at the
 * handle's *position* instead would make the two handles disagree about which
 * way is bigger, and would contradict what a screen reader announces.
 *
 * **`data-editor-only` is the whole export guarantee** - the sanitizer removes
 * every element carrying it wholesale. The visible line is painted from an
 * INLINE `stroke` attribute rather than only from `MapCanvas.css`, and that is
 * the fix for `04-09`'s measured trap: an editor-only element painted only by a
 * stylesheet survives into the clone and renders nothing there, so the gate
 * that proves it is removed would measure zero either way.
 */
function BandHandle({
  edge,
  height,
  svgRef,
  onHeightChange,
}: BandHandleProps): JSX.Element {
  const edgeY = edge === 'top' ? height : MAP_VIEWBOX_SIZE - height;
  const centreX = MAP_VIEWBOX_SIZE / 2;

  const heightFromClientY = useCallback(
    (clientY: number): number | null => {
      const svgElement = svgRef.current;
      if (svgElement === null) {
        return null;
      }
      const screenToSvg = svgElement.getScreenCTM()?.inverse();
      if (screenToSvg === undefined) {
        return null;
      }
      const point = svgElement.createSVGPoint();
      point.x = 0;
      point.y = clientY;
      const viewBoxY = point.matrixTransform(screenToSvg).y;

      return clampBandHeight(
        Math.round(edge === 'top' ? viewBoxY : MAP_VIEWBOX_SIZE - viewBoxY),
      );
    },
    [edge, svgRef],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>): void => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGRectElement>): void => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }
      const next = heightFromClientY(event.clientY);
      if (next !== null) {
        onHeightChange(edge, next);
      }
    },
    [edge, heightFromClientY, onHeightChange],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<SVGRectElement>): void => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGRectElement>): void => {
      const next = ((): number | null => {
        switch (event.key) {
          case 'ArrowUp':
          case 'ArrowRight':
            return height + BAND_KEYBOARD_STEP;
          case 'ArrowDown':
          case 'ArrowLeft':
            return height - BAND_KEYBOARD_STEP;
          case 'Home':
            return 0;
          case 'End':
            return BAND_MAX_HEIGHT;
          default:
            return null;
        }
      })();

      if (next === null) {
        return;
      }
      // The arrow keys pan the camera and Home/End are browser scroll keys;
      // a band handle that let either through would move the map as well.
      event.preventDefault();
      event.stopPropagation();
      onHeightChange(edge, clampBandHeight(next));
    },
    [edge, height, onHeightChange],
  );

  return (
    <g data-band-handle={edge}>
      <line
        x1={centreX - BAND_HANDLE_LINE_WIDTH / 2}
        y1={edgeY}
        x2={centreX + BAND_HANDLE_LINE_WIDTH / 2}
        y2={edgeY}
        stroke={BAND_HANDLE_COLOR}
        strokeWidth={BAND_HANDLE_STROKE_WIDTH}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <rect
        className="map-band-handle"
        role="slider"
        tabIndex={0}
        aria-label={BAND_LABELS[edge]}
        aria-valuemin={0}
        aria-valuemax={BAND_MAX_HEIGHT}
        aria-valuenow={height}
        aria-orientation="vertical"
        x={centreX - BAND_HANDLE_HIT_WIDTH / 2}
        y={edgeY - BAND_HANDLE_HIT_HEIGHT / 2}
        width={BAND_HANDLE_HIT_WIDTH}
        height={BAND_HANDLE_HIT_HEIGHT}
        fill="transparent"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      />
    </g>
  );
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      snapshotId,
      periodLabel,
      features,
      locateFeatures = features,
      colors,
      surfaceColor = DEFAULT_SURFACE_COLOR,
      uncoloredFill = DEFAULT_UNCOLORED_FILL,
      borderColor = DEFAULT_BORDER_COLOR,
      coastlineWeight = DEFAULT_COASTLINE_WEIGHT,
      interiorWeight = DEFAULT_INTERIOR_WEIGHT,
      borderMesh = null,
      topBandVisible = DEFAULT_TOP_BAND_VISIBLE,
      topBandHeight = BAND_DEFAULT_HEIGHT,
      bottomBandVisible = DEFAULT_BOTTOM_BAND_VISIBLE,
      bottomBandHeight = BAND_DEFAULT_HEIGHT,
      onBandHeightChange,
      selectedIds,
      onSelectCountry,
      onClearSelection,
      onTooltipChange,
      legendSlot,
      onCameraCommit,
      controllerFactory,
    }: MapCanvasProps,
    mapCanvasRef,
  ): JSX.Element {
    const exportSourceRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const cameraLayerRef = useRef<SVGGElement>(null);
    const bordersLayerRef = useRef<SVGGElement>(null);
    const highlightLayerRef = useRef<SVGGElement>(null);
    /*
     * Hover is held in a REF, not in React state. It changes on every
     * `pointerenter` across ~750 wrapped paths, and a state write there would
     * re-render the whole canvas on mouse move; the highlight layer is redrawn
     * imperatively instead, which is the same reason the colour effect updates
     * paths in place rather than rebuilding them.
     */
    const hoveredEntityIdRef = useRef<CountryId | null>(null);
    const selectedIdsRef = useRef<SelectedCountryIds>(selectedIds);
    /**
     * Entity id -> the `d` its wrapped copies actually rendered, captured from
     * the DOM after the countries join. Read rather than re-projected: a second
     * `geoPath` pass over 744 paths would double the cost of every scene change
     * for geometry that is already on screen, and a re-projection is also a
     * second chance to disagree with it.
     */
    const highlightGeometryRef = useRef<
      ReadonlyMap<CountryId, ReadonlyArray<HighlightGeometry>>
    >(new Map());
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
      locateFeatures,
      onCameraCommit,
      controllerFactory,
    });
    const previousSnapshotIdRef = useRef(snapshotId);
    const finalizeSelectedScene = useCallback((): void => {
      const svgElement = svgRef.current;
      if (svgElement === null) {
        return;
      }

      const outgoingHost = svgElement.querySelector<SVGGElement>(
        OUTGOING_LAYER_SELECTOR,
      );
      if (outgoingHost !== null) {
        select(outgoingHost).selectAll('*').interrupt(CROSSFADE_TRANSITION_NAME);
        outgoingHost.replaceChildren();
      }

      const countriesLayer = svgElement.querySelector<SVGGElement>(
        COUNTRIES_LAYER_SELECTOR,
      );
      if (countriesLayer !== null) {
        select(countriesLayer).interrupt(CROSSFADE_TRANSITION_NAME);
        countriesLayer.style.opacity = '1';
      }
    }, []);
    /*
     * The one writer of `[data-layer="highlight"]`.
     *
     * Reads only refs, so it is referentially stable and the d3 event handlers
     * registered in the join effect can call it without being re-registered.
     *
     * SELECTED WINS over hovered: a creator hovering the country they already
     * selected must not see the feedback get lighter. One `<path>` per
     * highlighted country per wrap offset - never all 207 - so a composition
     * with nothing selected renders an empty group.
     */
    const renderHighlight = useCallback((): void => {
      const highlightLayer = highlightLayerRef.current;
      if (highlightLayer === null) {
        return;
      }

      const geometry = highlightGeometryRef.current;
      const selected = selectedIdsRef.current;
      const hovered = hoveredEntityIdRef.current;
      const models: HighlightPathModel[] = [];

      const collect = (entityId: CountryId, state: HighlightState): void => {
        (geometry.get(entityId) ?? []).forEach((copy): void => {
          models.push({
            key: `${entityId}:${copy.offsetX}`,
            offsetX: copy.offsetX,
            pathData: copy.pathData,
            state,
          });
        });
      };

      selected.forEach((entityId): void => {
        collect(entityId, 'selected');
      });
      if (hovered !== null && !selected.has(hovered)) {
        collect(hovered, 'hovered');
      }

      select(highlightLayer)
        .selectAll<SVGPathElement, HighlightPathModel>('path')
        .data(models, (model): string => model.key)
        .join(
          (enter) =>
            enter
              .append('path')
              // As an attribute, for the same zoom reason every other map path
              // carries it: the camera wraps this layer in `scale(zoom)`, and a
              // 2.5-unit selection ring at 8x would be a 20px band.
              .attr('vector-effect', 'non-scaling-stroke'),
          (update) => update,
          (exit) => exit.remove(),
        )
        .attr('class', (model): string =>
          `${HIGHLIGHT_PATH_CLASS} ${
            model.state === 'selected'
              ? HIGHLIGHT_SELECTED_CLASS
              : HIGHLIGHT_HOVERED_CLASS
          }`,
        )
        .attr('d', (model): string => model.pathData)
        .attr('transform', (model): string => `translate(${model.offsetX} 0)`)
        .attr('stroke', (model): string => HIGHLIGHT_STROKE_COLORS[model.state])
        .attr(
          'stroke-width',
          (model): string => HIGHLIGHT_STROKE_WIDTHS[model.state],
        );
    }, []);

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
        finalizeSelectedScene,
        getExportSource: (): HTMLDivElement | null => exportSourceRef.current,
      }),
      [cameraController, finalizeSelectedScene, focusCountry],
    );

    // Runs before the data join below, so the countries layer still holds the
    // outgoing scene when it is cloned.
    useLayoutEffect((): void => {
      if (previousSnapshotIdRef.current === snapshotId) {
        return;
      }
      previousSnapshotIdRef.current = snapshotId;

      const svgElement = svgRef.current;
      const countriesLayer =
        svgElement?.querySelector<SVGGElement>(COUNTRIES_LAYER_SELECTOR) ?? null;
      const outgoingHost =
        svgElement?.querySelector<SVGGElement>(OUTGOING_LAYER_SELECTOR) ?? null;
      if (
        countriesLayer === null ||
        outgoingHost === null ||
        countriesLayer.childElementCount === 0
      ) {
        return;
      }

      // A switch that lands mid-crossfade drops the older outgoing scene rather
      // than stacking scenes nobody can see.
      finalizeSelectedScene();

      const outgoingScene = countriesLayer.cloneNode(true) as SVGGElement;
      makeOutgoingSceneInert(outgoingScene);
      outgoingHost.append(outgoingScene);

      // The token, not a literal: `theme.css` drops `--motion-scene` to 0ms
      // under `prefers-reduced-motion`, and that is what suppresses the
      // crossfade. `CROSSFADE_DURATION_MS` survives only as the unstyled
      // fallback inside `resolveMotionDuration`.
      const duration = resolveMotionDuration(MOTION_SCENE_TOKEN, svgElement);
      if (duration === 0) {
        finalizeSelectedScene();
        return;
      }

      // UI-SPEC 4.4 names one curve for camera and scene completion. It lived in
      // `--easing-camera` and was read by nothing, so both transitions actually
      // ran on d3's default `easeCubic`.
      const easing = resolveCameraEasing(svgElement);

      countriesLayer.style.opacity = '0';
      select(countriesLayer)
        .transition(CROSSFADE_TRANSITION_NAME)
        .duration(duration)
        .ease(easing)
        .style('opacity', 1)
        .on('end', (): void => {
          countriesLayer.style.opacity = '1';
        });
      select(outgoingScene)
        .style('opacity', 1)
        .transition(CROSSFADE_TRANSITION_NAME)
        .duration(duration)
        .ease(easing)
        .style('opacity', 0)
        .on('end interrupt', (): void => {
          outgoingScene.remove();
        });
    }, [finalizeSelectedScene, snapshotId]);

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
        getSelectableSceneFeatures(features)
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
        .on('click.map', (event: MouseEvent, path): void => {
          if (!path.feature.isSelectable) {
            return;
          }
          event.stopPropagation();
          activeCountryIdRef.current = path.entityId;
          applyRovingTabStop(paths, path.entityId);
          callbacksRef.current.onSelectCountry(path.entityId);
          if (path.kind === 'decorative') {
            focusCountry(path.entityId);
          }
        })
        .on('pointerenter.map', (event: PointerEvent, path): void => {
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.add(HOVERED_CLASS);
          }
          // The HOVER half of `[data-layer="highlight"]`. Keyed on the entity,
          // so hovering a wrapped Pacific copy lights every copy of that
          // country rather than only the one under the pointer.
          if (path.feature.isSelectable) {
            hoveredEntityIdRef.current = path.entityId;
            renderHighlight();
          }
          callbacksRef.current.onTooltipChange(
            pointerTooltipData(
              event,
              path.feature,
              getSceneFeatureColor(path.feature, colorsRef.current),
              getBoundaryLine(path.feature.boundaryMode, snapshotId),
              getInteractionId(path.feature),
              path.feature.colorOwnerId !== null,
            ),
          );
        })
        .on('pointermove.map', (event: PointerEvent, path): void => {
          callbacksRef.current.onTooltipChange(
            pointerTooltipData(
              event,
              path.feature,
              getSceneFeatureColor(path.feature, colorsRef.current),
              getBoundaryLine(path.feature.boundaryMode, snapshotId),
              getInteractionId(path.feature),
              path.feature.colorOwnerId !== null,
            ),
          );
        })
        .on('pointerleave.map', (event: PointerEvent, path): void => {
          if (hoveredEntityIdRef.current === path.entityId) {
            hoveredEntityIdRef.current = null;
            renderHighlight();
          }
          if (isSvgPathElement(event.currentTarget)) {
            event.currentTarget.classList.remove(HOVERED_CLASS);
            callbacksRef.current.onTooltipChange(
              pointerLeaveTooltipData(
                event.currentTarget,
                document.activeElement,
                path.feature,
                getSceneFeatureColor(path.feature, colorsRef.current),
                getBoundaryLine(path.feature.boundaryMode, snapshotId),
                getInteractionId(path.feature),
                path.feature.colorOwnerId !== null,
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
          applyRovingTabStop(paths, path.entityId);
          event.currentTarget.classList.add(FOCUSED_CLASS);
          callbacksRef.current.onTooltipChange(
            keyboardTooltipData(
              event.currentTarget,
              path.feature,
              getSceneFeatureColor(path.feature, colorsRef.current),
              getBoundaryLine(path.feature.boundaryMode, snapshotId),
              path.entityId,
              path.feature.colorOwnerId !== null,
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
          applyRovingTabStop(paths, nextFeature.entityId);
          focusCountry(nextFeature.entityId);
        });

      // Applied in the same layout effect as the join: leaving every rebuilt
      // path at -1 until the later color effect ran opened a one-frame window
      // with no tabbable country. A stale active id (not in this scene) keeps
      // every path at -1 exactly as before; the color effect repairs it.
      applyRovingTabStop(paths, activeCountryIdRef.current);

      /*
       * Capture what the join actually rendered, so the highlight layer clones
       * geometry rather than re-projecting it. Read from the DOM on purpose: a
       * second `geoPath` pass would be a second answer to the same question,
       * and the two would eventually differ.
       */
      const highlightGeometry = new Map<CountryId, HighlightGeometry[]>();
      paths.each(function (this: SVGPathElement, path): void {
        if (!path.feature.isSelectable) {
          return;
        }
        const pathData = this.getAttribute('d') ?? '';
        if (pathData === '') {
          return;
        }
        const copies = highlightGeometry.get(path.entityId) ?? [];
        copies.push({ offsetX: path.offsetX, pathData });
        highlightGeometry.set(path.entityId, copies);
      });
      highlightGeometryRef.current = highlightGeometry;
      renderHighlight();

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
    }, [
      focusCountry,
      renderHighlight,
      selectableFeatures,
      snapshotId,
      wrappedScene,
    ]);

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
      // The SELECTION half of `[data-layer="highlight"]`, published to the ref
      // the imperative renderer reads before it is asked to draw.
      selectedIdsRef.current = selectedIds;
      renderHighlight();
      const paths = select(svgElement)
        .select<SVGGElement>('[data-layer="countries"]')
        .selectAll<SVGPathElement, WrappedScenePath>(SCENE_PATH_SELECTOR)
        .attr('fill', (path): string =>
          getSceneFeatureFill(path.feature, colors, uncoloredFill),
        )
        /*
         * D4-08, and since `04-09` this is the WHOLE story for a country path's
         * stroke. It comes from `STROKE_WEIGHT_UNITS` - the same table
         * `sanitizeExportClone` resolves through - so the editor and the
         * download cannot disagree about what `medium` means, and there is no
         * longer a selection branch competing with it: hover and selection moved
         * to `[data-layer="highlight"]`. The creator's `coastlineWeight` is the
         * only input.
         *
         * `null` REMOVES the attribute at `none`, rather than writing a zero:
         * SVG's initial `stroke` is `none`, so absence is what actually draws
         * nothing, and it is what the export gate asserts.
         */
        .attr('stroke', (): string | null =>
          hasStroke(coastlineWeight) ? borderColor : null,
        )
        .attr('stroke-width', (): string | null =>
          hasStroke(coastlineWeight)
            ? String(strokeWidthFor(coastlineWeight))
            : null,
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
        });

      applyRovingTabStop(paths, activeCountryId);

      // Updated in place rather than removed and re-appended: this runs on
      // every color, selection, and history change across ~750 wrapped paths,
      // and rebuilding the nodes made it the hottest effect in the app.
      paths.each(function (this: SVGPathElement, path): void {
        const existingTitle = this.querySelector('title');
        if (!path.isAccessible) {
          existingTitle?.remove();
          return;
        }

        const label = `${path.feature.properties.name}, ${getSceneFeatureColor(
          path.feature,
          colors,
        )}`;
        if (existingTitle === null) {
          const title = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'title',
          );
          title.textContent = label;
          this.append(title);
        } else if (existingTitle.textContent !== label) {
          existingTitle.textContent = label;
        }
      });

      return runAfterPaint((): void => {
        INTERACTION_MEASURES.forEach(
          ({ startMark, measureName }): void => {
            measureAndConsume(startMark, measureName);
          },
        );
      });
    }, [
      borderColor,
      coastlineWeight,
      colors,
      renderHighlight,
      selectableFeatures,
      selectedIds,
      uncoloredFill,
      wrappedScene,
    ]);

    /*
     * 04-09 - the interior-border mesh, projected ONCE.
     *
     * `geoPath` accepts a `GeometryCollection` directly, so all 327 geometries
     * become one `d` string per wrapped copy. The projection is
     * `createWorldProjection()` - the SAME one the polygons use, never a second
     * one: a second projection is a mesh that drifts off the fills the moment
     * either is touched (T-04-09-05).
     */
    const meshPathData = useMemo((): string | null => {
      if (borderMesh === null) {
        return null;
      }
      const pathData = createSafeMapPath(
        geoPath(createWorldProjection()),
        borderMesh,
      );
      return pathData === '' ? null : pathData;
    }, [borderMesh]);

    /*
     * The mesh is WRAPPED at the date line on the same `WRAP_OFFSETS` the
     * polygons use, and reusing the array is the point: a Pacific-framed
     * composition otherwise shows filled countries with no interior borders on
     * the wrapped copies. `coding-rules/data.md` records this as one of the two
     * rendering questions `04-06` deliberately left to this plan.
     */
    useLayoutEffect((): void => {
      const bordersLayer = bordersLayerRef.current;
      if (bordersLayer === null) {
        return;
      }

      const wrappedMesh =
        meshPathData === null ? [] : WRAP_OFFSETS.map((offsetX) => offsetX);

      select(bordersLayer)
        .selectAll<SVGPathElement, number>('path')
        .data(wrappedMesh, (offsetX): string => String(offsetX))
        .join(
          (enter) =>
            enter
              .append('path')
              .attr('class', BORDER_MESH_PATH_CLASS)
              // As an ATTRIBUTE, measured to survive rasterisation. The camera
              // wraps this layer in `scale(zoom)`, so without the pin a creator
              // framed at zoom 8 downloads 8x-thick borders - the defect
              // `coding-rules/export.md` records by name.
              .attr('vector-effect', 'non-scaling-stroke'),
          (update) => update,
          (exit) => exit.remove(),
        )
        .attr('d', meshPathData ?? '')
        .attr('transform', (offsetX): string => `translate(${offsetX} 0)`)
        // Inline attributes, never a `var()` or a class rule: the export clone
        // rasterises as an isolated document with no host stylesheet, so this
        // is the only route these two values have into the PNG.
        .attr('stroke', hasStroke(interiorWeight) ? borderColor : null)
        .attr(
          'stroke-width',
          hasStroke(interiorWeight)
            ? String(strokeWidthFor(interiorWeight))
            : null,
        );
    }, [borderColor, interiorWeight, meshPathData]);

    /*
     * D4-16. ONE reader of "how far does each band actually reach", shared with
     * `04-12`'s band-aware legend inset. The rects, the handles, and the legend
     * therefore cannot disagree about where a band ends.
     */
    const bandExtents = useMemo(
      () =>
        resolveBandExtents({
          topBandVisible,
          topBandHeight,
          bottomBandVisible,
          bottomBandHeight,
        }),
      [bottomBandHeight, bottomBandVisible, topBandHeight, topBandVisible],
    );
    /*
     * The stops are DERIVED from the composition's water colour and written as
     * inline literal attributes below. Not a `var()`: a host custom property
     * measured as rendering NOTHING AT ALL inside the isolated export document.
     * Not a subtree `<style>` either: that route works, but it puts a second
     * `<style>` beside the injected font one, which the clone contract
     * discusses by name. The literal is less clever and less fragile.
     */
    const [bandOpaqueStop, bandClearStop] = useMemo(
      () => bandGradientStops(surfaceColor),
      [surfaceColor],
    );

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
        {/*
          D4-08 - the composition's border contract, declared once on the
          canonical SVG.

          The two `data-*` attributes are what `sanitizeExportClone` reads off
          the CLONE, which is how `exportMapPng` honours a creator's choice
          while staying pure: it never needs to know composition state exists.

          The two custom properties are the SCREEN half, and they are inline for
          a different reason. `MapCanvas.css` still owns the interaction
          hierarchy (`.hovered` 1.5px, `.selected` 2px, `.focused` 3px), and a
          per-path inline `style` would out-specify all three and silently
          delete hover feedback. Feeding the RESTING values in through custom
          properties leaves the state rules exactly where they were.

          Neither property is a palette token: nothing in `src/styles/` declares
          them, they are declared here per composition, and they are mode-blind
          by construction. Live Invariant 9's mode-invariant set is unchanged.
        */}
        <svg
          ref={svgRef}
          className="map-canvas"
          viewBox={`0 0 ${MAP_VIEWBOX_SIZE} ${MAP_VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={handleBackgroundClick}
          {...{
            [EXPORT_STROKE_WEIGHT_ATTRIBUTE]: coastlineWeight,
            [EXPORT_BORDER_COLOR_ATTRIBUTE]: borderColor,
          }}
          style={
            {
              '--map-border-weight': `${strokeWidthFor(coastlineWeight)}px`,
              '--map-border-resting': borderColor,
            } as CSSProperties
          }
        >
          {/*
            D4-03 / `04-UI-SPEC.md` section 6.5. The composition's water, and
            the FIRST painted layer inside the canonical SVG.

            Three placement facts, none of them cosmetic:
            1. **Outside `[data-layer="camera"]`.** Inside it, the water would
               pan and zoom with the map and the square would show through at
               the edges. The legend is the working precedent for a layer that
               sits outside the camera.
            2. **Before the camera group**, so it paints beneath everything.
               `injectExportFontFace` inserts its `<style>` as the SVG's first
               child in the CLONE only, giving the exported order
               `style -> surface -> camera -> legend`.
            3. **An inline `fill` attribute holding a resolved `#RRGGBB`.** Not
               `var(--map-surface)`, not a class. The export rasterises this
               subtree as an isolated document with no host stylesheet, so only
               serialised inline state reaches the PNG. `--map-surface` keeps
               its own job - the editor gutter and the loading skeleton - and
               contributes zero pixels to the download.

            `isPreservedComposition` compares only the INDICES of the camera and
            legend children and their transforms, so this sibling is
            structurally permitted as long as camera still precedes legend.
          */}
          <rect
            data-layer="surface"
            x={0}
            y={0}
            width={MAP_VIEWBOX_SIZE}
            height={MAP_VIEWBOX_SIZE}
            fill={surfaceColor}
          />
          {/*
            04-10 / D4-16 / `04-UI-SPEC.md` section 6.6 - the band gradients.

            Two facts hold this layer together:

            1. **The stops are inline LITERALS.** `stop-color` and
               `stop-opacity` carry resolved values, never a `var()`. The clone
               is rasterised as an isolated document with no host stylesheet, so
               a token here renders as nothing while the editor looks correct -
               `04-01` measured exactly that for the water rect.
            2. **The ids stay alive because the rects REFERENCE them.**
               `sanitizeExportClone` strips an `id` unless `collectReferencedIds`
               found a `url(#...)` pointing at it, and `fill="url(#...)"` below
               is that reference. Without it the id goes, the `<defs>` subtree
               goes with it, and the PNG silently loses the band.

            The gradient runs along `y1`->`y2`, which is what aims each band at
            its own edge: the top band is opaque at `y=0` and clear at its inner
            edge, the bottom band the other way round. The two share ONE stop
            pair, so an inversion is a change to this vector rather than a
            second set of stops that can drift.
          */}
          <defs data-layer="paint">
            <linearGradient
              id={BAND_TOP_GRADIENT_ID}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset={bandOpaqueStop.offset}
                stopColor={bandOpaqueStop.stopColor}
                stopOpacity={bandOpaqueStop.stopOpacity}
              />
              <stop
                offset={bandClearStop.offset}
                stopColor={bandClearStop.stopColor}
                stopOpacity={bandClearStop.stopOpacity}
              />
            </linearGradient>
            <linearGradient
              id={BAND_BOTTOM_GRADIENT_ID}
              x1="0"
              y1="1"
              x2="0"
              y2="0"
            >
              <stop
                offset={bandOpaqueStop.offset}
                stopColor={bandOpaqueStop.stopColor}
                stopOpacity={bandOpaqueStop.stopOpacity}
              />
              <stop
                offset={bandClearStop.offset}
                stopColor={bandClearStop.stopColor}
                stopOpacity={bandClearStop.stopOpacity}
              />
            </linearGradient>
          </defs>
          <g ref={cameraLayerRef} data-layer="camera">
            <g data-layer="outgoing-scenes" aria-hidden="true" />
            <g
              data-layer="countries"
              role="listbox"
              aria-label={getMapAccessibleLabel(periodLabel)}
              aria-multiselectable="true"
            />
            {/*
              04-09 / `04-UI-SPEC.md` section 6.5 - the interior-border mesh.

              INSIDE the camera and AFTER the countries: inside, or the lines
              detach from the geometry they describe the moment a creator pans;
              after, or the fills paint over them.

              NON-INTERACTIVE, as an attribute pair rather than a stylesheet
              rule. `pointer-events` keeps the mesh from stealing the click that
              belongs to the country underneath it, and `aria-hidden` keeps 327
              nameless line segments out of the listbox a screen-reader user
              walks. Both as attributes because a rule in `MapCanvas.css` would
              reach the editor and NOT the export clone, and this layer is in
              the clone.

              `fill="none"` and the round joins are INHERITED presentation
              attributes: set once on the group, carried by `cloneNode`, and
              they never need a per-path repeat.
            */}
            <g
              ref={bordersLayerRef}
              data-layer="borders"
              aria-hidden="true"
              pointerEvents="none"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/*
              04-09 / `04-UI-SPEC.md` section 6.9 - hover and selection.

              `data-editor-only="true"` is the whole guarantee: the sanitizer
              removes every element carrying it WHOLESALE, before it touches
              anything else, so this layer provably cannot move a single
              exported pixel. That is structural rather than incidental, which
              is the improvement over neutralising a selection stroke that had
              already been painted onto the geometry.

              INSIDE the camera and ABOVE the borders, so the feedback tracks
              the geometry it describes and draws over the interior lines
              rather than under them.

              `pointer-events: none` is load-bearing rather than tidy: this
              layer sits directly over the country the creator is about to
              click, so without it the highlight would intercept the click it
              exists to acknowledge.
            */}
            <g
              ref={highlightLayerRef}
              data-layer="highlight"
              data-editor-only="true"
              aria-hidden="true"
              pointerEvents="none"
              fill="none"
              strokeLinejoin="round"
            />
          </g>
          {/*
            04-10 / D4-16 - the bands themselves.

            OUTSIDE `[data-layer="camera"]`, like the water and the legend: a
            title band that panned and zoomed with the map would slide off the
            top of the square the moment a creator framed the Pacific.

            Paint order is BANDS, then legend, then text (U-8) - which is DOM
            order. The band is a backdrop for type, not a veil over it.

            `pointer-events: none` as an attribute rather than a rule: this
            layer covers the top eighth of the map, and without it the band
            would swallow every click on the countries underneath.
          */}
          <g data-layer="bands" aria-hidden="true" pointerEvents="none">
            {bandExtents.top > 0 ? (
              <rect
                data-band="top"
                x={0}
                y={0}
                width={MAP_VIEWBOX_SIZE}
                height={bandExtents.top}
                fill={`url(#${BAND_TOP_GRADIENT_ID})`}
              />
            ) : null}
            {bandExtents.bottom > 0 ? (
              <rect
                data-band="bottom"
                x={0}
                y={MAP_VIEWBOX_SIZE - bandExtents.bottom}
                width={MAP_VIEWBOX_SIZE}
                height={bandExtents.bottom}
                fill={`url(#${BAND_BOTTOM_GRADIENT_ID})`}
              />
            ) : null}
          </g>
          {legendSlot}
          {/*
            A7. The resize affordances, ABOVE the legend so a creator can still
            grab a handle the legend overlaps, and `data-editor-only` so the
            sanitizer removes them wholesale - which is what makes it structural
            rather than incidental that they cannot move an exported pixel.

            Rendered only for a VISIBLE band and only when there is a writer to
            call: a read-only composition has nothing to drag.
          */}
          {onBandHeightChange === undefined ? null : (
            <g data-layer="band-handles" data-editor-only="true">
              {topBandVisible ? (
                <BandHandle
                  edge="top"
                  height={bandExtents.top}
                  svgRef={svgRef}
                  onHeightChange={onBandHeightChange}
                />
              ) : null}
              {bottomBandVisible ? (
                <BandHandle
                  edge="bottom"
                  height={bandExtents.bottom}
                  svgRef={svgRef}
                  onHeightChange={onBandHeightChange}
                />
              ) : null}
            </g>
          )}
        </svg>
      </div>
    );
  },
);
