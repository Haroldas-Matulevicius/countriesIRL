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
  CountryList,
  filterCountryCatalog,
  getCountrySearchEmptyState,
  getVisibleCountryIds,
} from './CountryList';

const COUNTRY_CATALOG: ReadonlyArray<WorldCountryMetadata> =
  worldManifest.coreStates.map(({ id, name }) => ({ id, name }));
const HISTORICAL_ENTITY_ID = 'HIST-PLC';

function renderCountryList(countries: ReadonlyArray<WorldCountryMetadata>): string {
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
      <CountryList countries={countries} />
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
