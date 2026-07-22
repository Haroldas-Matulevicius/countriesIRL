import {
  createContext,
  useCallback,
  useMemo,
  useReducer,
} from 'react';
import type { PropsWithChildren } from 'react';

import type {
  ColorMap,
  CountryId,
  MapAction,
  MapState,
  SelectedCountryIds,
} from '../types/map';
import { HISTORY_LIMIT } from '../constants/config';
import {
  applyColorToCountries,
  areColorMapsEqual,
  canonicalizeColorMap,
  createEmptyColorMap,
  hasEffectiveColorChange,
  normalizeColor,
} from '../utils/colors';

const COLOR_START_MARK = 'countriesirl-color-start';
const UNDO_START_MARK = 'countriesirl-undo-start';
const REDO_START_MARK = 'countriesirl-redo-start';

export interface MapStateContextValue {
  state: MapState;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  selectCountry: (countryId: CountryId | null) => void;
  replaceSelection: (countryIds: ReadonlyArray<CountryId>) => void;
  toggleSelection: (countryId: CountryId) => void;
  clearSelection: () => void;
  setColor: (countryId: CountryId, color: string) => boolean;
  setColors: (countryIds: ReadonlyArray<CountryId>, color: string) => boolean;
  resetColors: () => void;
  undo: () => void;
  redo: () => void;
  loadState: (colors: ColorMap) => void;
}

export const MapStateContext = createContext<MapStateContextValue | undefined>(
  undefined,
);

function markInteraction(markName: string): void {
  performance.clearMarks(markName);
  performance.mark(markName);
}

export function prepareColorInteraction(
  colors: ColorMap,
  countryIds: ReadonlyArray<CountryId>,
  color: string,
): string | null {
  performance.clearMarks(COLOR_START_MARK);
  const colorResult = normalizeColor(color);

  if (
    !colorResult.ok ||
    !hasEffectiveColorChange(colors, countryIds, colorResult.value)
  ) {
    return null;
  }

  performance.mark(COLOR_START_MARK);
  return colorResult.value;
}

export function recordColorInteractionIfChanged(
  colors: ColorMap,
  countryIds: ReadonlyArray<CountryId>,
  color: string,
): boolean {
  return prepareColorInteraction(colors, countryIds, color) !== null;
}

function areSelectionsEqual(
  first: SelectedCountryIds,
  second: SelectedCountryIds,
): boolean {
  if (first.size !== second.size) {
    return false;
  }

  for (const countryId of first) {
    if (!second.has(countryId)) {
      return false;
    }
  }

  return true;
}

function commitColors(
  state: MapState,
  nextColors: Readonly<Record<string, string>>,
): MapState {
  if (areColorMapsEqual(state.colors, nextColors)) {
    return state;
  }

  const snapshot = canonicalizeColorMap(nextColors);
  const branch = state.history.slice(0, state.historyIndex + 1);
  const history = [...branch, snapshot].slice(-(HISTORY_LIMIT + 1));

  return {
    ...state,
    colors: snapshot,
    history,
    historyIndex: history.length - 1,
  };
}

function replaceSelectedIds(
  state: MapState,
  countryIds: Iterable<CountryId>,
): MapState {
  const selectedIds = new Set(countryIds);

  if (areSelectionsEqual(state.selectedIds, selectedIds)) {
    return state;
  }

  return {
    ...state,
    selectedIds,
  };
}

export function createInitialMapState(): MapState {
  const colors = createEmptyColorMap();

  return {
    colors,
    history: [colors],
    historyIndex: 0,
    selectedIds: new Set(),
  };
}

export function mapStateReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case 'SET_COLOR':
      return commitColors(
        state,
        applyColorToCountries(
          state.colors,
          [action.payload.countryId],
          action.payload.color,
        ),
      );

    case 'SET_COLORS':
      return commitColors(
        state,
        applyColorToCountries(
          state.colors,
          action.payload.countryIds,
          action.payload.color,
        ),
      );

    case 'RESET_ALL':
      return commitColors(state, {});

    case 'UNDO': {
      if (state.historyIndex === 0) {
        return state;
      }

      const historyIndex = state.historyIndex - 1;

      return {
        ...state,
        colors: state.history[historyIndex],
        historyIndex,
      };
    }

    case 'REDO': {
      if (state.historyIndex === state.history.length - 1) {
        return state;
      }

      const historyIndex = state.historyIndex + 1;

      return {
        ...state,
        colors: state.history[historyIndex],
        historyIndex,
      };
    }

    case 'SELECT_COUNTRY':
      return replaceSelectedIds(
        state,
        action.payload.countryId === null ? [] : [action.payload.countryId],
      );

    case 'SET_SELECTION':
      return replaceSelectedIds(state, action.payload.countryIds);

    case 'TOGGLE_SELECTION': {
      const selectedIds = new Set(state.selectedIds);

      if (selectedIds.has(action.payload.countryId)) {
        selectedIds.delete(action.payload.countryId);
      } else {
        selectedIds.add(action.payload.countryId);
      }

      return {
        ...state,
        selectedIds,
      };
    }

    case 'CLEAR_SELECTION':
      return replaceSelectedIds(state, []);

    case 'LOAD_STATE': {
      const colors = canonicalizeColorMap(action.payload.colors);

      return {
        ...state,
        colors,
        history: [colors],
        historyIndex: 0,
      };
    }
  }
}

export function MapStateProvider({ children }: PropsWithChildren): JSX.Element {
  const [state, dispatch] = useReducer(
    mapStateReducer,
    undefined,
    createInitialMapState,
  );

  const selectCountry = useCallback((countryId: CountryId | null): void => {
    dispatch({ type: 'SELECT_COUNTRY', payload: { countryId } });
  }, []);

  const replaceSelection = useCallback(
    (countryIds: ReadonlyArray<CountryId>): void => {
      dispatch({ type: 'SET_SELECTION', payload: { countryIds } });
    },
    [],
  );

  const toggleSelection = useCallback((countryId: CountryId): void => {
    dispatch({ type: 'TOGGLE_SELECTION', payload: { countryId } });
  }, []);

  const clearSelection = useCallback((): void => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const setColor = useCallback(
    (countryId: CountryId, color: string): boolean => {
      const canonicalColor = prepareColorInteraction(
        state.colors,
        [countryId],
        color,
      );
      if (canonicalColor === null) {
        return false;
      }

      dispatch({
        type: 'SET_COLOR',
        payload: { countryId, color: canonicalColor },
      });
      return true;
    },
    [state.colors],
  );

  const setColors = useCallback(
    (countryIds: ReadonlyArray<CountryId>, color: string): boolean => {
      const canonicalColor = prepareColorInteraction(
        state.colors,
        countryIds,
        color,
      );
      if (canonicalColor === null) {
        return false;
      }

      dispatch({
        type: 'SET_COLORS',
        payload: { countryIds, color: canonicalColor },
      });
      return true;
    },
    [state.colors],
  );

  const resetColors = useCallback((): void => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  const undo = useCallback((): void => {
    markInteraction(UNDO_START_MARK);
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback((): void => {
    markInteraction(REDO_START_MARK);
    dispatch({ type: 'REDO' });
  }, []);

  const loadState = useCallback((colors: ColorMap): void => {
    dispatch({ type: 'LOAD_STATE', payload: { colors } });
  }, []);

  const value = useMemo<MapStateContextValue>(
    () => ({
      state,
      canUndo: state.historyIndex > 0,
      canRedo: state.historyIndex < state.history.length - 1,
      canReset: Object.keys(state.colors).length > 0,
      selectCountry,
      replaceSelection,
      toggleSelection,
      clearSelection,
      setColor,
      setColors,
      resetColors,
      undo,
      redo,
      loadState,
    }),
    [
      state,
      selectCountry,
      replaceSelection,
      toggleSelection,
      clearSelection,
      setColor,
      setColors,
      resetColors,
      undo,
      redo,
      loadState,
    ],
  );

  return (
    <MapStateContext.Provider value={value}>
      {children}
    </MapStateContext.Provider>
  );
}
