import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { MapAction, MapState } from '../types/map';
import {
  createInitialMapState,
  mapStateReducer,
} from '../providers/MapStateProvider';
import { useMapState } from './useMapState';

function reduceActions(
  actions: ReadonlyArray<MapAction>,
  initialState: MapState = createInitialMapState(),
): MapState {
  return actions.reduce(mapStateReducer, initialState);
}

describe('mapStateReducer color history', (): void => {
  it('commits single and bulk color changes as one immutable snapshot per action', (): void => {
    const initialState = createInitialMapState();
    const singleState = mapStateReducer(initialState, {
      type: 'SET_COLOR',
      payload: { countryId: 'FR', color: '#DC2626' },
    });
    const countryIds = ['DE', 'PL'];
    const bulkAction: MapAction = {
      type: 'SET_COLORS',
      payload: { countryIds, color: '#2563EB' },
    };
    const bulkState = mapStateReducer(singleState, bulkAction);

    countryIds[0] = 'IT';

    expect(initialState.colors).toEqual({});
    expect(singleState.colors).toEqual({ FR: '#DC2626' });
    expect(singleState.history).toHaveLength(2);
    expect(bulkState.colors).toEqual({
      FR: '#DC2626',
      DE: '#2563EB',
      PL: '#2563EB',
    });
    expect(bulkState.history).toHaveLength(3);
    expect(bulkState.historyIndex).toBe(2);
    expect(bulkState.history[1]).not.toBe(bulkState.history[2]);
  });

  it('returns the same state for duplicate color commits and history bounds', (): void => {
    const initialState = createInitialMapState();
    const coloredState = mapStateReducer(initialState, {
      type: 'SET_COLOR',
      payload: { countryId: 'FR', color: '#DC2626' },
    });

    expect(
      mapStateReducer(coloredState, {
        type: 'SET_COLOR',
        payload: { countryId: 'FR', color: '#DC2626' },
      }),
    ).toBe(coloredState);
    expect(mapStateReducer(initialState, { type: 'UNDO' })).toBe(initialState);
    expect(mapStateReducer(coloredState, { type: 'REDO' })).toBe(coloredState);
  });

  it('traverses snapshots with undo and redo', (): void => {
    const editedState = reduceActions([
      {
        type: 'SET_COLOR',
        payload: { countryId: 'FR', color: '#DC2626' },
      },
      {
        type: 'SET_COLOR',
        payload: { countryId: 'DE', color: '#16A34A' },
      },
    ]);

    const undoneState = mapStateReducer(editedState, { type: 'UNDO' });
    const redoneState = mapStateReducer(undoneState, { type: 'REDO' });

    expect(undoneState.colors).toEqual({ FR: '#DC2626' });
    expect(undoneState.historyIndex).toBe(1);
    expect(redoneState.colors).toEqual({ FR: '#DC2626', DE: '#16A34A' });
    expect(redoneState.historyIndex).toBe(2);
  });

  it('discards the redo branch after a new edit from an undone state', (): void => {
    const editedState = reduceActions([
      {
        type: 'SET_COLOR',
        payload: { countryId: 'FR', color: '#DC2626' },
      },
      {
        type: 'SET_COLOR',
        payload: { countryId: 'DE', color: '#16A34A' },
      },
    ]);
    const undoneState = mapStateReducer(editedState, { type: 'UNDO' });
    const branchedState = mapStateReducer(undoneState, {
      type: 'SET_COLOR',
      payload: { countryId: 'IT', color: '#FACC15' },
    });

    expect(branchedState.colors).toEqual({ FR: '#DC2626', IT: '#FACC15' });
    expect(branchedState.history).toHaveLength(3);
    expect(branchedState.historyIndex).toBe(2);
    expect(mapStateReducer(branchedState, { type: 'REDO' })).toBe(
      branchedState,
    );
  });

  it('retains only the latest 50 actions plus their current baseline', (): void => {
    const actions: MapAction[] = Array.from({ length: 51 }, (_, index) => ({
      type: 'SET_COLOR',
      payload: { countryId: 'FR', color: `color-${String(index + 1)}` },
    }));
    const editedState = reduceActions(actions);
    const oldestRetainedState = Array.from({ length: 50 }).reduce<MapState>(
      (state) => mapStateReducer(state, { type: 'UNDO' }),
      editedState,
    );

    expect(editedState.history).toHaveLength(51);
    expect(editedState.historyIndex).toBe(50);
    expect(editedState.history[0]).toEqual({ FR: 'color-1' });
    expect(editedState.colors).toEqual({ FR: 'color-51' });
    expect(oldestRetainedState.colors).toEqual({ FR: 'color-1' });
    expect(oldestRetainedState.historyIndex).toBe(0);
    expect(mapStateReducer(oldestRetainedState, { type: 'UNDO' })).toBe(
      oldestRetainedState,
    );
  });

  it('makes reset one undoable action and suppresses reset on white state', (): void => {
    const initialState = createInitialMapState();
    const coloredState = mapStateReducer(initialState, {
      type: 'SET_COLOR',
      payload: { countryId: 'FR', color: '#DC2626' },
    });
    const resetState = mapStateReducer(coloredState, { type: 'RESET_ALL' });
    const restoredState = mapStateReducer(resetState, { type: 'UNDO' });

    expect(mapStateReducer(initialState, { type: 'RESET_ALL' })).toBe(
      initialState,
    );
    expect(resetState.colors).toEqual({});
    expect(resetState.history).toHaveLength(3);
    expect(restoredState.colors).toEqual({ FR: '#DC2626' });
  });

  it('replaces colors with a cloned load baseline and clears undo and redo', (): void => {
    const loadedColors: Record<string, string> = { FR: '#DC2626' };
    const editedState = reduceActions([
      {
        type: 'SET_COLOR',
        payload: { countryId: 'DE', color: '#16A34A' },
      },
      {
        type: 'SET_COLOR',
        payload: { countryId: 'PL', color: '#2563EB' },
      },
      { type: 'UNDO' },
    ]);
    const loadedState = mapStateReducer(editedState, {
      type: 'LOAD_STATE',
      payload: { colors: loadedColors },
    });

    loadedColors.FR = '#000000';

    expect(loadedState.colors).toEqual({ FR: '#DC2626' });
    expect(loadedState.history).toEqual([{ FR: '#DC2626' }]);
    expect(loadedState.history[0]).toBe(loadedState.colors);
    expect(loadedState.historyIndex).toBe(0);
    expect(mapStateReducer(loadedState, { type: 'UNDO' })).toBe(loadedState);
    expect(mapStateReducer(loadedState, { type: 'REDO' })).toBe(loadedState);
  });
});

describe('useMapState', (): void => {
  it('throws a clear developer error outside MapStateProvider', (): void => {
    function HookProbe(): null {
      useMapState();
      return null;
    }

    expect(() => renderToString(createElement(HookProbe))).toThrowError(
      'useMapState must be used within a MapStateProvider.',
    );
  });
});

describe('mapStateReducer shared selection', (): void => {
  it('replaces single selection without creating color history', (): void => {
    const initialState = createInitialMapState();
    const selectedState = mapStateReducer(initialState, {
      type: 'SELECT_COUNTRY',
      payload: { countryId: 'FR' },
    });
    const clearedState = mapStateReducer(selectedState, {
      type: 'SELECT_COUNTRY',
      payload: { countryId: null },
    });

    expect(selectedState.selectedIds).toEqual(new Set(['FR']));
    expect(selectedState.history).toBe(initialState.history);
    expect(clearedState.selectedIds).toEqual(new Set());
    expect(clearedState.history).toBe(initialState.history);
  });

  it('replaces, toggles, and clears the one shared selection set', (): void => {
    const initialState = createInitialMapState();
    const selectedState = reduceActions(
      [
        {
          type: 'SET_SELECTION',
          payload: { countryIds: ['FR', 'DE', 'FR'] },
        },
        { type: 'TOGGLE_SELECTION', payload: { countryId: 'DE' } },
        { type: 'TOGGLE_SELECTION', payload: { countryId: 'IT' } },
      ],
      initialState,
    );
    const clearedState = mapStateReducer(selectedState, {
      type: 'CLEAR_SELECTION',
    });

    expect(selectedState.selectedIds).toEqual(new Set(['FR', 'IT']));
    expect(selectedState.history).toBe(initialState.history);
    expect(selectedState.historyIndex).toBe(0);
    expect(clearedState.selectedIds).toEqual(new Set());
    expect(clearedState.history).toBe(initialState.history);
    expect(mapStateReducer(clearedState, { type: 'CLEAR_SELECTION' })).toBe(
      clearedState,
    );
  });
});
