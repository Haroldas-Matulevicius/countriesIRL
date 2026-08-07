import {
  createContext,
  useCallback,
  useMemo,
  useReducer,
} from 'react';
import type { PropsWithChildren } from 'react';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import type {
  CameraState,
  Composition,
  CompositionState,
  CompositionTextAlignment,
  CompositionTextSize,
  LegendEntryState,
  LegendPosition,
  LegendState,
  SnapshotId,
  StrokeWeight,
  VisibleCompositionSettings,
} from '../types/composition';
import { DEFAULT_BORDER_COLOR, DEFAULT_COLOR } from '../constants/colors';
import {
  DEFAULT_COASTLINE_WEIGHT,
  DEFAULT_COMPOSITION_SETTINGS,
  DEFAULT_INTERIOR_WEIGHT,
  DEFAULT_SUBTITLE_SIZE,
  DEFAULT_SURFACE_COLOR,
  DEFAULT_TEXT_ALIGNMENT,
  DEFAULT_TITLE_SIZE,
  DEFAULT_UNCOLORED_FILL,
  DEFAULT_BOTTOM_BAND_VISIBLE,
  DEFAULT_TOP_BAND_VISIBLE,
  STROKE_WEIGHTS,
} from '../constants/mapStyle';
import { clampBandHeight } from '../utils/bands';
import {
  COMPOSITION_TEXT_ALIGNMENTS,
  COMPOSITION_TEXT_SIZES,
  sanitizeCompositionText,
} from '../utils/compositionText';
import { repairCameraState } from '../utils/camera';
import { normalizeColor } from '../utils/colors';
import {
  createDefaultLegendState,
  LEGEND_CORNERS,
  LEGEND_TEXT_SIZES,
  reconcileLegend,
} from '../utils/legend';

const DEFAULT_SNAPSHOT_ID: SnapshotId = 'modern';
const DEFAULT_BACKGROUND_COLOR: VisibleCompositionSettings['backgroundColor'] =
  DEFAULT_COLOR;
// One default, shared with the legacy save-migration path
// (`createLegacyCompatibleSnapshot`). A provider-local copy previously stored
// `{x:0, y:0, preset:'top-right'}`, which both failed `isPositionValid` and
// contradicted the "Top right" label the disclosure summary showed.
const DEFAULT_LEGEND: LegendState = Object.freeze(createDefaultLegendState());
const DEFAULT_LEGEND_POSITION: LegendPosition = DEFAULT_LEGEND.position;
const DEFAULT_SETTINGS: VisibleCompositionSettings =
  DEFAULT_COMPOSITION_SETTINGS;
const MIN_LEGEND_ORDER = 0;

const SNAPSHOT_IDS = new Set<SnapshotId>([
  'modern',
  '1492',
  '1700',
  '1815',
  '1914',
]);

/**
 * D4-11 reduced the legend's style surface to ONE field. `theme`,
 * `backgroundOpacity`, and `borderStyle` were deleted with the box chrome they
 * described; the action stays a style PATCH rather than collapsing into
 * `setLegendTextSize`, because `04-13`'s bar form adds fields back here.
 */
export type LegendStyleState = Pick<LegendState, 'textSize'>;

/**
 * Every creator-editable `Map style` field, as a partial. ONE action for the
 * whole surface rather than one per field: `Reset Map Style` has to put all
 * five back in a single dispatch, and five sibling actions is five places for
 * the canonicaliser to be forgotten.
 */
export type MapStylePatch = Partial<
  Pick<
    VisibleCompositionSettings,
    | 'surfaceColor'
    | 'uncoloredFill'
    | 'borderColor'
    | 'interiorWeight'
    | 'coastlineWeight'
    | 'topBandVisible'
    | 'topBandHeight'
    | 'bottomBandVisible'
    | 'bottomBandHeight'
    | 'title'
    | 'titleSize'
    | 'subtitle'
    | 'subtitleSize'
    | 'attribution'
    | 'textAlignment'
  >
>;

export type CompositionAction =
  | { type: 'SET_CAMERA'; payload: { camera: CameraState } }
  | { type: 'SET_SNAPSHOT'; payload: { snapshotId: SnapshotId } }
  | { type: 'SET_LEGEND_ENTRY'; payload: { entry: LegendEntryState } }
  | {
      type: 'RECONCILE_LEGEND';
      payload: { effectiveColors: ReadonlyArray<string> };
    }
  | { type: 'SET_LEGEND_STYLE'; payload: { style: LegendStyleState } }
  | { type: 'SET_LEGEND_ORDER'; payload: { colors: ReadonlyArray<string> } }
  | { type: 'SET_LEGEND_POSITION'; payload: { position: LegendPosition } }
  | {
      type: 'SET_BACKGROUND_COLOR';
      payload: { backgroundColor: VisibleCompositionSettings['backgroundColor'] };
    }
  | { type: 'SET_MAP_STYLE'; payload: { patch: MapStylePatch } }
  | { type: 'LOAD_COMPOSITION'; payload: { composition: Composition } }
  | { type: 'MARK_SAVED'; payload?: { composition: Composition } }
  | { type: 'RESTORE_STATE'; payload: { state: CompositionState } };

export interface CompositionStateContextValue {
  state: CompositionState;
  isDirty: boolean;
  setCamera: (camera: CameraState) => void;
  setSnapshot: (snapshotId: SnapshotId) => void;
  setLegendEntry: (entry: LegendEntryState) => void;
  reconcileLegendEntries: (effectiveColors: ReadonlyArray<string>) => void;
  setLegendStyle: (style: LegendStyleState) => void;
  setLegendOrder: (colors: ReadonlyArray<string>) => void;
  setLegendPosition: (position: LegendPosition) => void;
  setBackgroundColor: (
    backgroundColor: VisibleCompositionSettings['backgroundColor'],
  ) => void;
  setSurfaceColor: (surfaceColor: string) => void;
  setMapStyle: (patch: MapStylePatch) => void;
  loadComposition: (composition: Composition) => void;
  markSaved: (composition?: Composition) => void;
  restoreState: (state: CompositionState) => void;
}

export const CompositionStateContext = createContext<
  CompositionStateContextValue | undefined
>(undefined);

function canonicalizeFiniteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

// Camera repair has one home: `repairCameraState` in `utils/camera` applies
// the same zoom/latitude clamps and longitude wrap the camera controller uses.
const canonicalizeCamera = repairCameraState;

function canonicalizeSnapshotId(snapshotId: SnapshotId): SnapshotId {
  return SNAPSHOT_IDS.has(snapshotId) ? snapshotId : DEFAULT_SNAPSHOT_ID;
}

function canonicalizeLegendEntry(
  entry: LegendEntryState,
): LegendEntryState | null {
  const colorResult = normalizeColor(entry.color);
  if (!colorResult.ok) {
    return null;
  }

  return {
    color: colorResult.value,
    label: entry.label,
    order: Math.max(
      MIN_LEGEND_ORDER,
      Math.trunc(canonicalizeFiniteNumber(entry.order, MIN_LEGEND_ORDER)),
    ),
  };
}

function canonicalizeLegendEntries(
  entries: ReadonlyArray<LegendEntryState>,
): ReadonlyArray<LegendEntryState> {
  const entriesByColor = new Map<
    string,
    { entry: LegendEntryState; sourceIndex: number }
  >();

  entries.forEach((entry, sourceIndex): void => {
    const canonicalEntry = canonicalizeLegendEntry(entry);
    if (canonicalEntry !== null) {
      entriesByColor.set(canonicalEntry.color, {
        entry: canonicalEntry,
        sourceIndex,
      });
    }
  });

  return [...entriesByColor.values()]
    .sort((left, right): number => {
      const orderDifference = left.entry.order - right.entry.order;
      return orderDifference === 0
        ? left.sourceIndex - right.sourceIndex
        : orderDifference;
    })
    .map(({ entry }, order): LegendEntryState => ({
      ...entry,
      order,
    }));
}

function canonicalizeLegendPosition(
  position: LegendPosition,
  fallback: LegendPosition = DEFAULT_LEGEND_POSITION,
): LegendPosition {
  return {
    x: canonicalizeFiniteNumber(position.x, fallback.x),
    y: canonicalizeFiniteNumber(position.y, fallback.y),
    preset:
      position.preset !== null && LEGEND_CORNERS.has(position.preset)
        ? position.preset
        : null,
  };
}

function canonicalizeLegendStyle(style: LegendStyleState): LegendStyleState {
  return {
    textSize: LEGEND_TEXT_SIZES.has(style.textSize)
      ? style.textSize
      : DEFAULT_LEGEND.textSize,
  };
}

function canonicalizeLegend(legend: LegendState): LegendState {
  return {
    entries: canonicalizeLegendEntries(legend.entries),
    position: canonicalizeLegendPosition(legend.position),
    ...canonicalizeLegendStyle(legend),
  };
}

/**
 * T-04-01-01. The custom `#RRGGBB` entry is untrusted creator text on its way to
 * an SVG `fill`, so it is validated here, at the state boundary, rather than at
 * the render site. `normalizeColor` is the repo's one home for that check and
 * returns the canonical uppercase form; anything it rejects falls back to the
 * default instead of being written to the attribute.
 */
function canonicalizeSurfaceColor(value: string): string {
  const result = normalizeColor(value);
  return result.ok ? result.value : DEFAULT_SURFACE_COLOR;
}

/**
 * T-04-08-03, the same boundary as `canonicalizeSurfaceColor` and for the same
 * reason: `uncoloredFill` and `borderColor` are untrusted creator text on their
 * way to an SVG `fill` / `stroke`. Validated here, once, rather than at each
 * render site; the attribute is then set through the DOM property and never by
 * string concatenation.
 */
function canonicalizeColorSetting(value: string, fallback: string): string {
  const result = normalizeColor(value);
  return result.ok ? result.value : fallback;
}

function canonicalizeStrokeWeight(
  value: StrokeWeight,
  fallback: StrokeWeight,
): StrokeWeight {
  return STROKE_WEIGHTS.has(value) ? value : fallback;
}

/**
 * The field is typed `boolean`, so this is a boundary check rather than a type
 * narrowing: `04-14`'s V3 record will hand this reducer values parsed out of
 * stored bytes, where the declared type is a promise and not a guarantee.
 */
function canonicalizeBandVisible(value: boolean, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * T-04-11-01 / T-04-11-02. Creator text is untrusted input on its way to a
 * `<text>` node in markup that gets serialised into a data URL, so it is
 * sanitised HERE, at the ONE boundary every write crosses, rather than at the
 * render site — the same reasoning `canonicalizeSurfaceColor` records for a hex.
 *
 * It deliberately does not escape. The value is set as SVG text content and
 * `XMLSerializer` escapes `<`, `>`, and `&` in a text node itself; pre-escaping
 * would double-escape and put a literal entity in the exported PNG.
 */
function canonicalizeCompositionText(value: string): string {
  return sanitizeCompositionText(typeof value === 'string' ? value : '');
}

function canonicalizeTextSize(
  value: CompositionTextSize,
  fallback: CompositionTextSize,
): CompositionTextSize {
  return COMPOSITION_TEXT_SIZES.has(value) ? value : fallback;
}

function canonicalizeTextAlignment(
  value: CompositionTextAlignment,
): CompositionTextAlignment {
  return COMPOSITION_TEXT_ALIGNMENTS.has(value)
    ? value
    : DEFAULT_TEXT_ALIGNMENT;
}

function canonicalizeSettings(
  settings: VisibleCompositionSettings,
): VisibleCompositionSettings {
  return {
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    surfaceColor: canonicalizeSurfaceColor(settings.surfaceColor),
    uncoloredFill: canonicalizeColorSetting(
      settings.uncoloredFill,
      DEFAULT_UNCOLORED_FILL,
    ),
    borderColor: canonicalizeColorSetting(
      settings.borderColor,
      DEFAULT_BORDER_COLOR,
    ),
    interiorWeight: canonicalizeStrokeWeight(
      settings.interiorWeight,
      DEFAULT_INTERIOR_WEIGHT,
    ),
    coastlineWeight: canonicalizeStrokeWeight(
      settings.coastlineWeight,
      DEFAULT_COASTLINE_WEIGHT,
    ),
    /*
     * T-04-10-01. Every route to a band height goes through `clampBandHeight`
     * here, at the ONE boundary, rather than at each render site: the drag
     * handle, the keyboard step, `Reset Map Style`, and `04-14`'s V3 record all
     * dispatch `SET_MAP_STYLE`, so bounding it at the reducer is what makes an
     * unbounded height unrepresentable rather than merely unlikely.
     */
    topBandVisible: canonicalizeBandVisible(
      settings.topBandVisible,
      DEFAULT_TOP_BAND_VISIBLE,
    ),
    topBandHeight: clampBandHeight(settings.topBandHeight),
    bottomBandVisible: canonicalizeBandVisible(
      settings.bottomBandVisible,
      DEFAULT_BOTTOM_BAND_VISIBLE,
    ),
    bottomBandHeight: clampBandHeight(settings.bottomBandHeight),
    title: canonicalizeCompositionText(settings.title),
    titleSize: canonicalizeTextSize(settings.titleSize, DEFAULT_TITLE_SIZE),
    subtitle: canonicalizeCompositionText(settings.subtitle),
    subtitleSize: canonicalizeTextSize(
      settings.subtitleSize,
      DEFAULT_SUBTITLE_SIZE,
    ),
    attribution: canonicalizeCompositionText(settings.attribution),
    textAlignment: canonicalizeTextAlignment(settings.textAlignment),
  };
}

function areSettingsEqual(
  left: VisibleCompositionSettings,
  right: VisibleCompositionSettings,
): boolean {
  return (
    left.backgroundColor === right.backgroundColor &&
    left.surfaceColor === right.surfaceColor &&
    left.uncoloredFill === right.uncoloredFill &&
    left.borderColor === right.borderColor &&
    left.interiorWeight === right.interiorWeight &&
    left.coastlineWeight === right.coastlineWeight &&
    left.topBandVisible === right.topBandVisible &&
    left.topBandHeight === right.topBandHeight &&
    left.bottomBandVisible === right.bottomBandVisible &&
    left.bottomBandHeight === right.bottomBandHeight &&
    left.title === right.title &&
    left.titleSize === right.titleSize &&
    left.subtitle === right.subtitle &&
    left.subtitleSize === right.subtitleSize &&
    left.attribution === right.attribution &&
    left.textAlignment === right.textAlignment
  );
}

function canonicalizeComposition(composition: Composition): Composition {
  return {
    camera: canonicalizeCamera(composition.camera),
    snapshotId: canonicalizeSnapshotId(composition.snapshotId),
    legend: canonicalizeLegend(composition.legend),
    settings: canonicalizeSettings(composition.settings),
  };
}

function getVisibleComposition(state: CompositionState): Composition {
  return {
    camera: state.camera,
    snapshotId: state.snapshotId,
    legend: state.legend,
    settings: state.settings,
  };
}

function areCamerasEqual(left: CameraState, right: CameraState): boolean {
  return (
    left.zoom === right.zoom &&
    left.centerLongitude === right.centerLongitude &&
    left.centerLatitude === right.centerLatitude
  );
}

function areLegendEntriesEqual(
  left: ReadonlyArray<LegendEntryState>,
  right: ReadonlyArray<LegendEntryState>,
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (entry, index): boolean =>
        entry.color === right[index]?.color &&
        entry.label === right[index]?.label &&
        entry.order === right[index]?.order,
    )
  );
}

function areLegendPositionsEqual(
  left: LegendPosition,
  right: LegendPosition,
): boolean {
  return left.x === right.x && left.y === right.y && left.preset === right.preset;
}

function areLegendsEqual(left: LegendState, right: LegendState): boolean {
  return (
    areLegendEntriesEqual(left.entries, right.entries) &&
    areLegendPositionsEqual(left.position, right.position) &&
    left.textSize === right.textSize
  );
}

function areCompositionsEqual(left: Composition, right: Composition): boolean {
  return (
    areCamerasEqual(left.camera, right.camera) &&
    left.snapshotId === right.snapshotId &&
    areLegendsEqual(left.legend, right.legend) &&
    areSettingsEqual(left.settings, right.settings)
  );
}

export function isCompositionStateDirty(state: CompositionState): boolean {
  return !areCompositionsEqual(
    getVisibleComposition(state),
    state.savedBaseline,
  );
}

function replaceLegend(
  state: CompositionState,
  legend: LegendState,
): CompositionState {
  return areLegendsEqual(state.legend, legend)
    ? state
    : {
        ...state,
        legend,
      };
}

export function createInitialCompositionState(): CompositionState {
  const composition = canonicalizeComposition({
    camera: INITIAL_WORLD_CAMERA,
    snapshotId: DEFAULT_SNAPSHOT_ID,
    legend: DEFAULT_LEGEND,
    settings: DEFAULT_SETTINGS,
  });

  return {
    ...composition,
    savedBaseline: composition,
  };
}

export function compositionStateReducer(
  state: CompositionState,
  action: CompositionAction,
): CompositionState {
  switch (action.type) {
    case 'SET_CAMERA': {
      const camera = canonicalizeCamera(action.payload.camera);
      return areCamerasEqual(state.camera, camera)
        ? state
        : { ...state, camera };
    }

    case 'SET_SNAPSHOT': {
      const snapshotId = canonicalizeSnapshotId(action.payload.snapshotId);
      return state.snapshotId === snapshotId
        ? state
        : { ...state, snapshotId };
    }

    case 'SET_LEGEND_ENTRY': {
      const entry = canonicalizeLegendEntry(action.payload.entry);
      if (entry === null) {
        return state;
      }

      const existingEntry = state.legend.entries.find(
        (candidate): boolean => candidate.color === entry.color,
      );
      if (
        existingEntry?.label === entry.label &&
        existingEntry.order === entry.order
      ) {
        return state;
      }

      const entries = canonicalizeLegendEntries([
        ...state.legend.entries.filter(
          (candidate): boolean => candidate.color !== entry.color,
        ),
        entry,
      ]);

      return replaceLegend(state, { ...state.legend, entries });
    }

    // Auto-entry lives here, not in an App effect: `reconcileLegend` is the one
    // home for "every active non-white color has an entry", shared with the
    // storage repair path, so the two cannot disagree on canonicalization.
    case 'RECONCILE_LEGEND': {
      return replaceLegend(
        state,
        reconcileLegend(action.payload.effectiveColors, state.legend),
      );
    }

    case 'SET_LEGEND_STYLE': {
      const style = canonicalizeLegendStyle(action.payload.style);
      return replaceLegend(state, { ...state.legend, ...style });
    }

    case 'SET_LEGEND_ORDER': {
      const entriesByColor = new Map(
        state.legend.entries.map((entry): [string, LegendEntryState] => [
          entry.color,
          entry,
        ]),
      );
      const orderedColors: string[] = [];

      action.payload.colors.forEach((color): void => {
        const colorResult = normalizeColor(color);
        if (
          colorResult.ok &&
          entriesByColor.has(colorResult.value) &&
          !orderedColors.includes(colorResult.value)
        ) {
          orderedColors.push(colorResult.value);
        }
      });

      state.legend.entries.forEach((entry): void => {
        if (!orderedColors.includes(entry.color)) {
          orderedColors.push(entry.color);
        }
      });

      const entries = orderedColors.map((color, order): LegendEntryState => ({
        ...(entriesByColor.get(color) as LegendEntryState),
        order,
      }));

      return replaceLegend(state, { ...state.legend, entries });
    }

    case 'SET_LEGEND_POSITION': {
      const position = canonicalizeLegendPosition(
        action.payload.position,
        state.legend.position,
      );
      return replaceLegend(state, { ...state.legend, position });
    }

    case 'SET_BACKGROUND_COLOR': {
      const settings = canonicalizeSettings(state.settings);
      return state.settings.backgroundColor === settings.backgroundColor
        ? state
        : { ...state, settings };
    }

    /*
     * D4-03. Deliberately NOT part of the colours-only undo history: Live
     * Invariant 2 says the history stores colours and nothing else, and
     * Invariant 1 holds because of that. The owner chose `undo-b-reset-action`
     * at `04-01`'s Task 2 gate, so the escape hatch is the Map style panel's
     * `Reset Map Style` action, not a history entry - which is also what keeps
     * the `Undo Color Change` / `Redo Color Change` rail labels truthful.
     */
    case 'SET_MAP_STYLE': {
      const settings = canonicalizeSettings({
        ...state.settings,
        ...action.payload.patch,
      });
      return areSettingsEqual(state.settings, settings)
        ? state
        : { ...state, settings };
    }

    case 'LOAD_COMPOSITION': {
      const composition = canonicalizeComposition(action.payload.composition);
      if (
        areCompositionsEqual(getVisibleComposition(state), composition) &&
        areCompositionsEqual(state.savedBaseline, composition)
      ) {
        return state;
      }

      return {
        ...composition,
        savedBaseline: composition,
      };
    }

    case 'MARK_SAVED': {
      const composition =
        action.payload === undefined
          ? getVisibleComposition(state)
          : canonicalizeComposition(action.payload.composition);
      return areCompositionsEqual(state.savedBaseline, composition) &&
        areCompositionsEqual(getVisibleComposition(state), composition)
        ? state
        : {
            ...state,
            ...composition,
            savedBaseline: composition,
          };
    }

    case 'RESTORE_STATE':
      return action.payload.state;
  }
}

export function CompositionStateProvider({
  children,
}: PropsWithChildren): JSX.Element {
  const [state, dispatch] = useReducer(
    compositionStateReducer,
    undefined,
    createInitialCompositionState,
  );

  const setCamera = useCallback((camera: CameraState): void => {
    dispatch({ type: 'SET_CAMERA', payload: { camera } });
  }, []);

  const setSnapshot = useCallback((snapshotId: SnapshotId): void => {
    dispatch({ type: 'SET_SNAPSHOT', payload: { snapshotId } });
  }, []);

  const setLegendEntry = useCallback((entry: LegendEntryState): void => {
    dispatch({ type: 'SET_LEGEND_ENTRY', payload: { entry } });
  }, []);

  const reconcileLegendEntries = useCallback(
    (effectiveColors: ReadonlyArray<string>): void => {
      dispatch({ type: 'RECONCILE_LEGEND', payload: { effectiveColors } });
    },
    [],
  );

  const setLegendStyle = useCallback((style: LegendStyleState): void => {
    dispatch({ type: 'SET_LEGEND_STYLE', payload: { style } });
  }, []);

  const setLegendOrder = useCallback((colors: ReadonlyArray<string>): void => {
    dispatch({ type: 'SET_LEGEND_ORDER', payload: { colors } });
  }, []);

  const setLegendPosition = useCallback((position: LegendPosition): void => {
    dispatch({ type: 'SET_LEGEND_POSITION', payload: { position } });
  }, []);

  const setBackgroundColor = useCallback(
    (
      backgroundColor: VisibleCompositionSettings['backgroundColor'],
    ): void => {
      dispatch({
        type: 'SET_BACKGROUND_COLOR',
        payload: { backgroundColor },
      });
    },
    [],
  );

  const setMapStyle = useCallback((patch: MapStylePatch): void => {
    dispatch({ type: 'SET_MAP_STYLE', payload: { patch } });
  }, []);

  const setSurfaceColor = useCallback((surfaceColor: string): void => {
    dispatch({ type: 'SET_MAP_STYLE', payload: { patch: { surfaceColor } } });
  }, []);

  const loadComposition = useCallback((composition: Composition): void => {
    dispatch({ type: 'LOAD_COMPOSITION', payload: { composition } });
  }, []);

  const markSaved = useCallback((composition?: Composition): void => {
    dispatch(
      composition === undefined
        ? { type: 'MARK_SAVED' }
        : { type: 'MARK_SAVED', payload: { composition } },
    );
  }, []);

  const restoreState = useCallback((state: CompositionState): void => {
    dispatch({ type: 'RESTORE_STATE', payload: { state } });
  }, []);

  const isDirty = isCompositionStateDirty(state);

  const value = useMemo<CompositionStateContextValue>(
    () => ({
      state,
      isDirty,
      setCamera,
      setSnapshot,
      setLegendEntry,
      reconcileLegendEntries,
      setLegendStyle,
      setLegendOrder,
      setLegendPosition,
      setBackgroundColor,
      setSurfaceColor,
      setMapStyle,
      loadComposition,
      markSaved,
      restoreState,
    }),
    [
      state,
      isDirty,
      setCamera,
      setSnapshot,
      setLegendEntry,
      reconcileLegendEntries,
      setLegendStyle,
      setLegendOrder,
      setLegendPosition,
      setBackgroundColor,
      setSurfaceColor,
      setMapStyle,
      loadComposition,
      markSaved,
      restoreState,
    ],
  );

  return (
    <CompositionStateContext.Provider value={value}>
      {children}
    </CompositionStateContext.Provider>
  );
}
