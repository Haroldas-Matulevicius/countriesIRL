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
  LegendEntryState,
  LegendPosition,
  LegendState,
  SnapshotId,
  VisibleCompositionSettings,
} from '../types/composition';
import { repairCameraState } from '../utils/camera';
import { normalizeColor } from '../utils/colors';
import {
  createDefaultLegendState,
  LEGEND_BORDER_STYLES,
  LEGEND_CORNERS,
  LEGEND_TEXT_SIZES,
  LEGEND_THEMES,
  reconcileLegend,
} from '../utils/legend';

const DEFAULT_SNAPSHOT_ID: SnapshotId = 'modern';
const DEFAULT_BACKGROUND_COLOR: VisibleCompositionSettings['backgroundColor'] =
  '#FFFFFF';
// One default, shared with the legacy save-migration path
// (`createLegacyCompatibleSnapshot`). A provider-local copy previously stored
// `{x:0, y:0, preset:'top-right'}`, which both failed `isPositionValid` and
// contradicted the "Top right" label the disclosure summary showed.
const DEFAULT_LEGEND: LegendState = Object.freeze(createDefaultLegendState());
const DEFAULT_LEGEND_POSITION: LegendPosition = DEFAULT_LEGEND.position;
const DEFAULT_SETTINGS: VisibleCompositionSettings = Object.freeze({
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
});
const MIN_LEGEND_BACKGROUND_OPACITY = 70;
const MAX_LEGEND_BACKGROUND_OPACITY = 100;
const MIN_LEGEND_ORDER = 0;

const SNAPSHOT_IDS = new Set<SnapshotId>([
  'modern',
  '1492',
  '1700',
  '1815',
  '1914',
]);

export type LegendStyleState = Pick<
  LegendState,
  'theme' | 'textSize' | 'backgroundOpacity' | 'borderStyle'
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
  loadComposition: (composition: Composition) => void;
  markSaved: (composition?: Composition) => void;
  restoreState: (state: CompositionState) => void;
}

export const CompositionStateContext = createContext<
  CompositionStateContextValue | undefined
>(undefined);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

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
    theme: LEGEND_THEMES.has(style.theme) ? style.theme : DEFAULT_LEGEND.theme,
    textSize: LEGEND_TEXT_SIZES.has(style.textSize)
      ? style.textSize
      : DEFAULT_LEGEND.textSize,
    backgroundOpacity: clamp(
      canonicalizeFiniteNumber(
        style.backgroundOpacity,
        DEFAULT_LEGEND.backgroundOpacity,
      ),
      MIN_LEGEND_BACKGROUND_OPACITY,
      MAX_LEGEND_BACKGROUND_OPACITY,
    ),
    borderStyle: LEGEND_BORDER_STYLES.has(style.borderStyle)
      ? style.borderStyle
      : DEFAULT_LEGEND.borderStyle,
  };
}

function canonicalizeLegend(legend: LegendState): LegendState {
  return {
    entries: canonicalizeLegendEntries(legend.entries),
    position: canonicalizeLegendPosition(legend.position),
    ...canonicalizeLegendStyle(legend),
  };
}

function canonicalizeSettings(): VisibleCompositionSettings {
  return { backgroundColor: DEFAULT_BACKGROUND_COLOR };
}

function canonicalizeComposition(composition: Composition): Composition {
  return {
    camera: canonicalizeCamera(composition.camera),
    snapshotId: canonicalizeSnapshotId(composition.snapshotId),
    legend: canonicalizeLegend(composition.legend),
    settings: canonicalizeSettings(),
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
    left.theme === right.theme &&
    left.textSize === right.textSize &&
    left.backgroundOpacity === right.backgroundOpacity &&
    left.borderStyle === right.borderStyle
  );
}

function areCompositionsEqual(left: Composition, right: Composition): boolean {
  return (
    areCamerasEqual(left.camera, right.camera) &&
    left.snapshotId === right.snapshotId &&
    areLegendsEqual(left.legend, right.legend) &&
    left.settings.backgroundColor === right.settings.backgroundColor
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
      const settings = canonicalizeSettings();
      return state.settings.backgroundColor === settings.backgroundColor
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
