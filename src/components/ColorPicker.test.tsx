import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { COLOR_PRESETS } from '../constants/colors';
import { MapStateProvider } from '../providers/MapStateProvider';
import { ColorPicker } from './ColorPicker';

const NATIVE_DISABLED_ATTRIBUTE = /\sdisabled(?:=""|(?=[\s>]))/;

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
});
