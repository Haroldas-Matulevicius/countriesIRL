import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { MapAction, MapState } from '../types/map';
import {
  createInitialMapState,
  mapStateReducer,
  prepareColorInteraction,
  recordColorInteractionIfChanged,
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

  it('stores only canonical colors and rejects equivalent or invalid reducer inputs', (): void => {
    const initialState = createInitialMapState();
    const coloredState = mapStateReducer(initialState, {
      type: 'SET_COLOR',
      payload: { countryId: 'FR', color: '  #dc2626  ' },
    });
    const rgbState = mapStateReducer(coloredState, {
      type: 'SET_COLORS',
      payload: { countryIds: ['DE'], color: ' rgb(1, 2, 3) ' },
    });

    expect(coloredState.colors).toEqual({ FR: '#DC2626' });
    expect(rgbState.colors).toEqual({ FR: '#DC2626', DE: '#010203' });
    expect(
      mapStateReducer(coloredState, {
        type: 'SET_COLOR',
        payload: { countryId: 'FR', color: 'rgb(220, 38, 38)' },
      }),
    ).toBe(coloredState);
    expect(
      mapStateReducer(coloredState, {
        type: 'SET_COLOR',
        payload: { countryId: 'FR', color: 'not-a-color' },
      }),
    ).toBe(coloredState);
  });

  it('stores effective white by deleting entries without no-op history', (): void => {
    const initialState = createInitialMapState();
    const noOpWhiteState = mapStateReducer(initialState, {
      type: 'SET_COLOR',
      payload: { countryId: 'FR', color: ' #fff ' },
    });
    const noOpRgbWhiteState = mapStateReducer(initialState, {
      type: 'SET_COLOR',
      payload: { countryId: 'FR', color: 'rgb(255, 255, 255)' },
    });
    const coloredState = mapStateReducer(initialState, {
      type: 'SET_COLORS',
      payload: { countryIds: ['FR', 'DE'], color: '#DC2626' },
    });
    const partiallyClearedState = mapStateReducer(coloredState, {
      type: 'SET_COLORS',
      payload: { countryIds: ['FR', 'IT'], color: '#FFFFFF' },
    });

    expect(noOpWhiteState).toBe(initialState);
    expect(noOpRgbWhiteState).toBe(initialState);
    expect(partiallyClearedState.colors).toEqual({ DE: '#DC2626' });
    expect(partiallyClearedState.history).toHaveLength(3);
    expect(mapStateReducer(partiallyClearedState, { type: 'UNDO' }).colors).toEqual({
      FR: '#DC2626',
      DE: '#DC2626',
    });
    expect(
      mapStateReducer(partiallyClearedState, {
        type: 'SET_COLORS',
        payload: { countryIds: ['FR', 'IT'], color: '#FFFFFF' },
      }),
    ).toBe(partiallyClearedState);
  });

  it('canonicalizes supported colors and omits white or invalid loaded values', (): void => {
    const loadedState = mapStateReducer(createInitialMapState(), {
      type: 'LOAD_STATE',
      payload: {
        colors: {
          FR: '#fff',
          DE: 'rgb(255, 255, 255)',
          IT: ' #16a34a ',
          ES: '#abc',
          PL: 'not-a-color',
        },
      },
    });

    expect(loadedState.colors).toEqual({ IT: '#16A34A', ES: '#AABBCC' });
    expect(loadedState.history).toEqual([{ IT: '#16A34A', ES: '#AABBCC' }]);
  });

  it('normalizes before provider change detection, timing, and dispatch preparation', (): void => {
    performance.clearMarks('countriesirl-color-start');
    performance.mark('countriesirl-color-start');

    expect(prepareColorInteraction({}, ['FR'], '#fff')).toBeNull();
    expect(prepareColorInteraction({}, ['FR'], 'rgb(255, 255, 255)')).toBeNull();
    expect(
      prepareColorInteraction({ FR: '#DC2626' }, ['FR'], '  #dc2626  '),
    ).toBeNull();
    expect(prepareColorInteraction({}, ['FR'], 'not-a-color')).toBeNull();
    expect(
      performance.getEntriesByName('countriesirl-color-start', 'mark'),
    ).toHaveLength(0);

    expect(prepareColorInteraction({}, ['FR'], ' rgb(1, 2, 3) ')).toBe('#010203');
    expect(
      performance.getEntriesByName('countriesirl-color-start', 'mark'),
    ).toHaveLength(1);
    expect(recordColorInteractionIfChanged({}, ['FR'], '#010203')).toBe(true);

    performance.clearMarks('countriesirl-color-start');
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
      payload: {
        countryId: 'FR',
        color: `#${(index + 1).toString(16).padStart(6, '0').toUpperCase()}`,
      },
    }));
    const editedState = reduceActions(actions);
    const oldestRetainedState = Array.from({ length: 50 }).reduce<MapState>(
      (state) => mapStateReducer(state, { type: 'UNDO' }),
      editedState,
    );

    expect(editedState.history).toHaveLength(51);
    expect(editedState.historyIndex).toBe(50);
    expect(editedState.history[0]).toEqual({ FR: '#000001' });
    expect(editedState.colors).toEqual({ FR: '#000033' });
    expect(oldestRetainedState.colors).toEqual({ FR: '#000001' });
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
