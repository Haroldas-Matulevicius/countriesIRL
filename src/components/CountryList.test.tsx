import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import worldManifest from '../../public/data/world-manifest.json';
import type { MapState } from '../types/map';
import {
  MapStateContext,
  type MapStateContextValue,
} from '../providers/MapStateProvider';
import type { WorldCountryMetadata } from '../hooks/useGeoData';
import {
  COUNTRY_NOT_IN_SCENE_HINT,
  CountryList,
  filterCountryCatalog,
  getCountrySearchEmptyState,
  getSelectableVisibleCountryIds,
  getVisibleCountryIds,
} from './CountryList';

const COUNTRY_CATALOG: ReadonlyArray<WorldCountryMetadata> =
  worldManifest.coreStates.map(({ id, name }) => ({ id, name }));
const HISTORICAL_ENTITY_ID = 'HIST-PLC';

function renderCountryList(
  countries: ReadonlyArray<WorldCountryMetadata>,
  selectableCountryIds: ReadonlySet<string> = new Set(
    countries.map((country) => country.id),
  ),
): string {
  const state: MapState = {
    colors: { FRA: '#DC2626' },
    history: [{}],
    historyIndex: 0,
    selectedIds: new Set(['FRA']),
  };
  const value: MapStateContextValue = {
    state,
    canUndo: false,
    canRedo: false,
    canReset: true,
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
      <CountryList
        countries={countries}
        selectableCountryIds={selectableCountryIds}
      />
    </MapStateContext.Provider>,
  );
}

describe('CountryList modern-core catalog', () => {
  it('renders exactly the curated 195 logical countries without historical entities', () => {
    const markup = renderCountryList(COUNTRY_CATALOG);

    expect(COUNTRY_CATALOG).toHaveLength(195);
    expect(markup.match(/class="country-list__item"/g)).toHaveLength(195);
    expect(markup).toContain('>France<');
    expect(markup).toContain('aria-label="Current color #DC2626"');
    expect(markup).not.toContain(HISTORICAL_ENTITY_ID);
  });

  it('filters case-insensitively and returns only unique visible logical IDs', () => {
    const catalogWithVisualDuplicate = [
      ...COUNTRY_CATALOG,
      { id: 'FJI', name: 'Fiji' },
      { id: HISTORICAL_ENTITY_ID, name: 'Polish–Lithuanian Commonwealth' },
    ];
    const filtered = filterCountryCatalog(catalogWithVisualDuplicate, ' FIJi ');

    expect(filtered).toEqual([{ id: 'FJI', name: 'Fiji' }]);
    expect(getVisibleCountryIds(filtered)).toEqual(['FJI']);
    expect(getVisibleCountryIds(COUNTRY_CATALOG)).toHaveLength(195);
    expect(getVisibleCountryIds(COUNTRY_CATALOG)).not.toContain(
      HISTORICAL_ENTITY_ID,
    );
  });

  it('keeps the modern catalog visible but rejects rows outside the active scene', () => {
    const markup = renderCountryList(
      [
        { id: 'DEU', name: 'Germany' },
        { id: 'FRA', name: 'France' },
      ],
      new Set(['DEU', 'HIST-HRE']),
    );

    // The browsable catalog is unchanged: France is still listed and searchable.
    expect(markup).toContain('>France<');
    expect(markup).toContain('>Germany<');
    expect(markup).not.toContain(HISTORICAL_ENTITY_ID);
    // ...but the row the active scene does not contain cannot be selected.
    expect(markup.match(/type="checkbox"/g)).toHaveLength(2);
    expect(markup.match(/disabled=""/g)).toHaveLength(1);
    expect(markup).toContain(`France — ${COUNTRY_NOT_IN_SCENE_HINT}`);
  });

  it('limits Select Visible to entities the active scene contains', () => {
    const filtered = filterCountryCatalog(
      [
        { id: 'DEU', name: 'Germany' },
        { id: 'FRA', name: 'France' },
      ],
      '',
    );

    expect(getVisibleCountryIds(filtered)).toEqual(['FRA', 'DEU']);
    expect(
      getSelectableVisibleCountryIds(filtered, new Set(['DEU', 'HIST-HRE'])),
    ).toEqual(['DEU']);
    expect(getSelectableVisibleCountryIds(filtered, new Set())).toEqual([]);
  });

  it('provides the exact no-results and clear-search copy', () => {
    expect(getCountrySearchEmptyState('Atlantis')).toEqual({
      heading: 'No countries match “Atlantis”.',
      body: 'Try a different country name.',
      clearLabel: 'Clear Country Search',
    });
  });

  it('keeps rows as checkboxes and labels the filtered bulk action', () => {
    const markup = renderCountryList(COUNTRY_CATALOG.slice(0, 2));

    expect(markup).toContain('aria-label="Search countries"');
    expect(markup).toContain('placeholder="Type a country name"');
    expect(markup).toContain('>Select Visible<');
    expect(markup.match(/type="checkbox"/g)).toHaveLength(2);
    expect(markup).not.toContain('Locate Country');
  });
});
