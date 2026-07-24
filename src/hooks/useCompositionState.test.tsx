import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import {
  CompositionStateProvider,
  compositionStateReducer,
  createInitialCompositionState,
  isCompositionStateDirty,
  type CompositionAction,
  type CompositionStateContextValue,
} from '../providers/CompositionStateProvider';
import type {
  Composition,
  CompositionState,
  LegendState,
} from '../types/composition';
import { useCompositionState } from './useCompositionState';

const DEFAULT_LEGEND: LegendState = {
  entries: [],
  position: { x: 0, y: 0, preset: 'top-right' },
  theme: 'light',
  textSize: 'medium',
  backgroundOpacity: 90,
  borderStyle: 'hairline',
};

function reduce(
  state: CompositionState,
  action: CompositionAction,
): CompositionState {
  return compositionStateReducer(state, action);
}

function toComposition(state: CompositionState): Composition {
  return {
    camera: state.camera,
    snapshotId: state.snapshotId,
    legend: state.legend,
    settings: state.settings,
  };
}

describe('compositionStateReducer', () => {
  it('starts with a clean whole-world Modern composition', () => {
    const state = createInitialCompositionState();

    expect(toComposition(state)).toEqual({
      camera: INITIAL_WORLD_CAMERA,
      snapshotId: 'modern',
      legend: DEFAULT_LEGEND,
      settings: { backgroundColor: '#FFFFFF' },
    });
    expect(state.savedBaseline).toEqual(toComposition(state));
  });

  it('commits camera, snapshot, and legend edits outside color history', () => {
    let state = createInitialCompositionState();

    state = reduce(state, {
      type: 'SET_CAMERA',
      payload: {
        camera: {
          zoom: 3,
          centerLongitude: 205,
          centerLatitude: 42,
        },
      },
    });
    state = reduce(state, {
      type: 'SET_SNAPSHOT',
      payload: { snapshotId: '1815' },
    });
    state = reduce(state, {
      type: 'SET_LEGEND_ENTRY',
      payload: {
        entry: { color: '#abc', label: 'Allies', order: 0 },
      },
    });
    state = reduce(state, {
      type: 'SET_LEGEND_STYLE',
      payload: {
        style: {
          theme: 'dark',
          textSize: 'large',
          backgroundOpacity: 75,
          borderStyle: 'strong',
        },
      },
    });
    state = reduce(state, {
      type: 'SET_LEGEND_POSITION',
      payload: {
        position: { x: 32, y: 64, preset: null },
      },
    });

    expect(state.camera).toEqual({
      zoom: 3,
      centerLongitude: -155,
      centerLatitude: 42,
    });
    expect(state.snapshotId).toBe('1815');
    expect(state.legend).toEqual({
      entries: [{ color: '#AABBCC', label: 'Allies', order: 0 }],
      position: { x: 32, y: 64, preset: null },
      theme: 'dark',
      textSize: 'large',
      backgroundOpacity: 75,
      borderStyle: 'strong',
    });
    expect(state.savedBaseline).toEqual(
      createInitialCompositionState().savedBaseline,
    );
    expect(isCompositionStateDirty(state)).toBe(true);
    expect('history' in state).toBe(false);
  });

  it('orders legend entries semantically and ignores unknown colors', () => {
    const withEntries = reduce(
      reduce(createInitialCompositionState(), {
        type: 'SET_LEGEND_ENTRY',
        payload: {
          entry: { color: '#FF0000', label: 'Red', order: 0 },
        },
      }),
      {
        type: 'SET_LEGEND_ENTRY',
        payload: {
          entry: { color: '#0000FF', label: 'Blue', order: 1 },
        },
      },
    );

    const reordered = reduce(withEntries, {
      type: 'SET_LEGEND_ORDER',
      payload: { colors: ['#0000ff', '#not-a-color', '#ff0000'] },
    });

    expect(reordered.legend.entries).toEqual([
      { color: '#0000FF', label: 'Blue', order: 0 },
      { color: '#FF0000', label: 'Red', order: 1 },
    ]);
  });

  it('loads every composition field atomically and establishes a clean baseline', () => {
    const loadedComposition: Composition = {
      camera: {
        zoom: 8,
        centerLongitude: -75,
        centerLatitude: 40,
      },
      snapshotId: '1914',
      legend: {
        entries: [
          { color: '#00aa00', label: 'Central Powers', order: 4 },
        ],
        position: { x: 700, y: 100, preset: 'top-right' },
        theme: 'soft',
        textSize: 'small',
        backgroundOpacity: 85,
        borderStyle: 'none',
      },
      settings: { backgroundColor: '#FFFFFF' },
    };

    const state = reduce(createInitialCompositionState(), {
      type: 'LOAD_COMPOSITION',
      payload: { composition: loadedComposition },
    });

    expect(toComposition(state)).toEqual({
      ...loadedComposition,
      legend: {
        ...loadedComposition.legend,
        entries: [
          { color: '#00AA00', label: 'Central Powers', order: 0 },
        ],
      },
    });
    expect(state.savedBaseline).toEqual(toComposition(state));
    expect(isCompositionStateDirty(state)).toBe(false);
  });

  it('marks the visible composition as saved without changing visible fields', () => {
    const edited = reduce(createInitialCompositionState(), {
      type: 'SET_CAMERA',
      payload: {
        camera: {
          zoom: 2,
          centerLongitude: 20,
          centerLatitude: 10,
        },
      },
    });
    const visibleComposition = toComposition(edited);

    const saved = reduce(edited, { type: 'MARK_SAVED' });

    expect(toComposition(saved)).toEqual(visibleComposition);
    expect(saved.camera).toBe(edited.camera);
    expect(saved.legend).toBe(edited.legend);
    expect(saved.settings).toBe(edited.settings);
    expect(saved.savedBaseline).toEqual(visibleComposition);
    expect(isCompositionStateDirty(saved)).toBe(false);
  });

  it('preserves state identity for semantic no-ops', () => {
    const state = createInitialCompositionState();

    expect(
      reduce(state, {
        type: 'SET_CAMERA',
        payload: { camera: { ...INITIAL_WORLD_CAMERA } },
      }),
    ).toBe(state);
    expect(
      reduce(state, {
        type: 'SET_SNAPSHOT',
        payload: { snapshotId: 'modern' },
      }),
    ).toBe(state);
    expect(reduce(state, { type: 'MARK_SAVED' })).toBe(state);
  });
});

describe('useCompositionState', () => {
  it('throws the exact guarded-context error outside the provider', () => {
    function MissingProviderProbe(): JSX.Element {
      useCompositionState();
      return <span />;
    }

    expect(() => renderToStaticMarkup(<MissingProviderProbe />)).toThrow(
      'useCompositionState must be used within a CompositionStateProvider.',
    );
  });

  it('exposes semantic commands without raw dispatch or color history', () => {
    let capturedContext: CompositionStateContextValue | undefined;

    function ProviderProbe(): JSX.Element {
      capturedContext = useCompositionState();
      return <span>ready</span>;
    }

    expect(
      renderToStaticMarkup(
        <CompositionStateProvider>
          <ProviderProbe />
        </CompositionStateProvider>,
      ),
    ).toContain('ready');

    expect(capturedContext).toEqual(
      expect.objectContaining({
        isDirty: false,
        setCamera: expect.any(Function),
        setSnapshot: expect.any(Function),
        setLegendEntry: expect.any(Function),
        removeLegendEntry: expect.any(Function),
        setLegendStyle: expect.any(Function),
        setLegendOrder: expect.any(Function),
        setLegendPosition: expect.any(Function),
        setBackgroundColor: expect.any(Function),
        loadComposition: expect.any(Function),
        markSaved: expect.any(Function),
      }),
    );
    expect(capturedContext).not.toHaveProperty('dispatch');
    expect(capturedContext?.state).not.toHaveProperty('history');
  });
});
