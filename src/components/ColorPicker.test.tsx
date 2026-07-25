import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { COLOR_PRESETS } from '../constants/colors';
import type { ColorMap, MapState } from '../types/map';
import {
  MapStateContext,
  MapStateProvider,
  type MapStateContextValue,
} from '../providers/MapStateProvider';
import { ColorPicker } from './ColorPicker';

const NATIVE_DISABLED_ATTRIBUTE = /\sdisabled(?:=""|(?=[\s>]))/;

function renderColorPickerWithState(state: MapState): string {
  const value: MapStateContextValue = {
    state,
    canUndo: false,
    canRedo: false,
    canReset: Object.keys(state.colors).length > 0,
    selectCountry: vi.fn(),
    replaceSelection: vi.fn(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    setColor: vi.fn(() => false),
    setColors: vi.fn(() => false),
    resetColors: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    loadState: vi.fn(),
    restoreState: vi.fn(),
  };

  return renderToStaticMarkup(
    <MapStateContext.Provider value={value}>
      <ColorPicker onStatus={vi.fn()} />
    </MapStateContext.Provider>,
  );
}

function createSelectedState(colors: ColorMap): MapState {
  return {
    colors,
    history: [colors],
    historyIndex: 0,
    selectedIds: new Set(['FR']),
  };
}

describe('ColorPicker', () => {
  it('natively disables every color control when no countries are selected', () => {
    const onStatus = vi.fn();
    const markup = renderToStaticMarkup(
      <MapStateProvider>
        <ColorPicker onStatus={onStatus} />
      </MapStateProvider>,
    );

    const presetButtons = markup.match(
      /<button\b[^>]*class="color-picker__preset"[^>]*>/g,
    ) ?? [];

    expect(COLOR_PRESETS).toHaveLength(10);
    expect(presetButtons).toHaveLength(10);

    COLOR_PRESETS.forEach((preset, index) => {
      expect(presetButtons[index]).toContain(
        `aria-label="Apply ${preset.name}"`,
      );
      expect(markup).toContain(
        `<span class="color-picker__preset-name">${preset.name}</span>`,
      );
      expect(presetButtons[index]).toMatch(NATIVE_DISABLED_ATTRIBUTE);
    });

    const customInput = markup.match(
      /<input\b[^>]*placeholder="#RRGGBB or rgb\(0, 0, 0\)"[^>]*>/,
    )?.[0];
    const customApplyButton = markup.match(
      /<button\b[^>]*type="submit"[^>]*>Apply Custom Color<\/button>/,
    )?.[0];

    expect(customInput).toMatch(NATIVE_DISABLED_ATTRIBUTE);
    expect(customApplyButton).toMatch(NATIVE_DISABLED_ATTRIBUTE);
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('natively disables the active preset for colored and effective-white selections', () => {
    const redMarkup = renderColorPickerWithState(
      createSelectedState({ FR: '#DC2626' }),
    );
    const whiteMarkup = renderColorPickerWithState(createSelectedState({}));
    const redButton = redMarkup.match(
      /<button\b[^>]*aria-label="Apply Red"[^>]*>/,
    )?.[0];
    const whiteButton = whiteMarkup.match(
      /<button\b[^>]*aria-label="Apply White"[^>]*>/,
    )?.[0];

    expect(redButton).toContain('aria-pressed="true"');
    expect(redButton).toMatch(NATIVE_DISABLED_ATTRIBUTE);
    expect(whiteButton).toContain('aria-pressed="true"');
    expect(whiteButton).toMatch(NATIVE_DISABLED_ATTRIBUTE);
  });
});
