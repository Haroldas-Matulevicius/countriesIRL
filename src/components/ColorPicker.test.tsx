import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CUSTOM_COLOR_ERROR_MESSAGE } from '../constants/colors';
import { customColor } from '../utils/colors';
import type { ColorMap, CountryId, MapState } from '../types/map';
import {
  MapStateContext,
  MapStateProvider,
  type MapStateContextValue,
} from '../providers/MapStateProvider';
import { ColorPicker } from './ColorPicker';

const NATIVE_DISABLED_ATTRIBUTE = /\sdisabled(?:=""|(?=[\s>]))/;
const SELECTABLE_COUNTRY_IDS: ReadonlySet<CountryId> = new Set(['FR']);

function createContextValue(state: MapState): MapStateContextValue {
  return {
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
}

function renderColorPickerWithState(
  state: MapState,
  customDraft = '',
): string {
  return renderToStaticMarkup(
    <MapStateContext.Provider value={createContextValue(state)}>
      <ColorPicker
        selectableCountryIds={SELECTABLE_COUNTRY_IDS}
        customDraft={customDraft}
        onCustomDraftChange={vi.fn()}
        onStatus={vi.fn()}
      />
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
  /**
   * The three defects `G-3` reports, gated on the markup rather than left to a
   * visual review nobody is scheduled to perform on this commit.
   *
   * The deleted heading's id is asserted absent by a repo-wide grep in the
   * plan's acceptance criteria; what is asserted here is the property that grep
   * cannot see - the panel emits no `<h2>` AT ALL, so a rename to a different
   * id would not slip a second heading back into a surface titled `Colors`.
   */
  it('emits a flat fieldset with no second heading and no preset grid', () => {
    const markup = renderColorPickerWithState(createSelectedState({}));

    expect(markup).not.toContain('<h2');
    expect(markup).not.toContain('Choose a color');
    expect(markup).not.toContain('color-picker__preset');
    expect(markup).not.toContain('color-picker__custom-preview');
    expect(markup).toContain('<fieldset class="panel-section"');
    expect(markup).toContain('class="panel-section__label"');
  });

  /**
   * A disabled GROUP is `<fieldset disabled>` and nothing else. `aria-disabled`
   * on a still-clickable control announces one thing and does another, and the
   * empty state must render the section **disabled rather than hidden** - a
   * hidden control cannot be discovered.
   */
  it('natively disables the whole group when no countries are selected', () => {
    const onStatus = vi.fn();
    const markup = renderToStaticMarkup(
      <MapStateProvider>
        <ColorPicker
          selectableCountryIds={SELECTABLE_COUNTRY_IDS}
          customDraft=""
          onCustomDraftChange={vi.fn()}
          onStatus={onStatus}
        />
      </MapStateProvider>,
    );

    const group = markup.match(/<fieldset\b[^>]*>/u)?.[0];

    expect(group).toMatch(NATIVE_DISABLED_ATTRIBUTE);
    expect(markup).not.toContain('aria-disabled');
    // Disabled, never hidden: the section is still in the tree to be found.
    expect(markup).toContain('Custom color');
    expect(markup).toContain('Apply Color');
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('ignores selected ids the active scene cannot render', () => {
    const markup = renderToStaticMarkup(
      <MapStateContext.Provider value={createContextValue(createSelectedState({}))}>
        <ColorPicker
          selectableCountryIds={new Set()}
          customDraft=""
          onCustomDraftChange={vi.fn()}
          onStatus={vi.fn()}
        />
      </MapStateContext.Provider>,
    );

    expect(markup.match(/<fieldset\b[^>]*>/u)?.[0]).toMatch(
      NATIVE_DISABLED_ATTRIBUTE,
    );
  });

  /**
   * The field's accessible name is the section label, so the panel does not
   * print `Custom color` twice at 328px of content. `getByLabel('Custom color')`
   * is an existing e2e locator and the `aria-labelledby` reference is what keeps
   * it resolving - asserted here because a broken id reference renders
   * identically and silently un-names the field.
   */
  it('names the hex field from the section label it points at', () => {
    const markup = renderColorPickerWithState(createSelectedState({}));
    const labelId = /<legend class="panel-section__label" id="([^"]+)"/u.exec(
      markup,
    )?.[1];
    const input = markup.match(/<input\b[^>]*>/u)?.[0] ?? '';

    expect(labelId).toBeDefined();
    expect(input).toContain(`aria-labelledby="${String(labelId)}"`);
    expect(markup).toContain(`>Custom color</legend>`);
  });

  /**
   * `04-UI-SPEC.md § 9`, byte-exact, wired by BOTH `aria-invalid` and
   * `aria-describedby`. A message that is rendered but not referenced is a
   * message a screen-reader user never hears.
   */
  it('wires the invalid-hex message to the field by id and by aria-invalid', () => {
    const markup = renderColorPickerWithState(
      createSelectedState({ FR: customColor('#DC2626') }),
      'not-a-color',
    );
    const input = markup.match(/<input\b[^>]*>/u)?.[0] ?? '';
    const errorId = /<p id="([^"]+)" class="panel-error">/u.exec(markup)?.[1];

    expect(CUSTOM_COLOR_ERROR_MESSAGE).toBe('Enter a hex color like #2563EB');
    expect(markup).toContain(
      `class="panel-error">${CUSTOM_COLOR_ERROR_MESSAGE}</p>`,
    );
    expect(errorId).toBeDefined();
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain(`aria-describedby="${String(errorId)}"`);
    expect(input).toContain('class="panel-field"');
  });

  it('renders no error and describes nothing while the draft is valid', () => {
    const markup = renderColorPickerWithState(
      createSelectedState({ FR: customColor('#DC2626') }),
      '#123456',
    );
    const input = markup.match(/<input\b[^>]*>/u)?.[0] ?? '';

    expect(markup).not.toContain('panel-error');
    expect(input).toContain('aria-invalid="false"');
    expect(input).not.toContain('aria-describedby');
  });
});
