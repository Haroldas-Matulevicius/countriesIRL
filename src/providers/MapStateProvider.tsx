import type { MapAction, MapState, SelectedCountryIds } from '../types/map';
import { HISTORY_LIMIT } from '../constants/config';
import { areColorMapsEqual } from '../utils/colors';

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

  const snapshot = { ...nextColors };
  const branch = state.history.slice(0, state.historyIndex + 1);
  const history = [...branch, snapshot].slice(-(HISTORY_LIMIT + 1));

  return {
    ...state,
    colors: snapshot,
    history,
    historyIndex: history.length - 1,
  };
}

function replaceSelection(
  state: MapState,
  countryIds: Iterable<string>,
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
  const colors = {};

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
      return commitColors(state, {
        ...state.colors,
        [action.payload.countryId]: action.payload.color,
      });

    case 'SET_COLORS': {
      const nextColors = { ...state.colors };

      for (const countryId of action.payload.countryIds) {
        nextColors[countryId] = action.payload.color;
      }

      return commitColors(state, nextColors);
    }

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
      return replaceSelection(
        state,
        action.payload.countryId === null ? [] : [action.payload.countryId],
      );

    case 'SET_SELECTION':
      return replaceSelection(state, action.payload.countryIds);

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
      return replaceSelection(state, []);

    case 'LOAD_STATE': {
      const colors = { ...action.payload.colors };

      return {
        ...state,
        colors,
        history: [colors],
        historyIndex: 0,
      };
    }
  }
}
