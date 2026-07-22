import { useMemo } from 'react';

import type { CountryId, GeoFeature } from '../types/map';
import { DEFAULT_COLOR } from '../constants/colors';
import { useMapState } from '../hooks/useMapState';

const EMPTY_SELECTION_HEADING = 'Select countries to color';
const EMPTY_SELECTION_BODY =
  'Choose a country on the map, or use the country list to select several.';
const MAX_VISIBLE_COUNTRY_NAMES = 3;

interface SelectionPanelProps {
  countryLookup: ReadonlyMap<CountryId, GeoFeature>;
}

interface SelectedCountrySummary {
  id: CountryId;
  name: string;
}

function getSelectedCountries(
  selectedIds: ReadonlySet<CountryId>,
  countryLookup: ReadonlyMap<CountryId, GeoFeature>,
): ReadonlyArray<SelectedCountrySummary> {
  const selectedCountries: SelectedCountrySummary[] = [];

  for (const countryId of selectedIds) {
    const country = countryLookup.get(countryId);

    if (country !== undefined) {
      selectedCountries.push({
        id: countryId,
        name: country.properties.name,
      });
    }
  }

  return selectedCountries.sort((left, right) => left.name.localeCompare(right.name));
}

export function SelectionPanel({
  countryLookup,
}: SelectionPanelProps): JSX.Element {
  const {
    state: { colors, selectedIds },
    clearSelection,
  } = useMapState();

  const selectedCountries = useMemo(
    () => getSelectedCountries(selectedIds, countryLookup),
    [countryLookup, selectedIds],
  );

  const selectedColors = useMemo(
    () =>
      selectedCountries.map(
        (country) => colors[country.id] ?? DEFAULT_COLOR,
      ),
    [colors, selectedCountries],
  );

  const firstColor = selectedColors[0];
  const hasMixedColors = selectedColors.some((color) => color !== firstColor);
  const selectedCount = selectedCountries.length;

  if (selectedCount === 0) {
    return (
      <section className="selection-panel" aria-labelledby="selection-panel-heading">
        <h2 id="selection-panel-heading">{EMPTY_SELECTION_HEADING}</h2>
        <p>{EMPTY_SELECTION_BODY}</p>
      </section>
    );
  }

  const visibleCountries = selectedCountries.slice(0, MAX_VISIBLE_COUNTRY_NAMES);
  const remainingCount = selectedCount - visibleCountries.length;

  return (
    <section className="selection-panel" aria-labelledby="selection-panel-heading">
      <div className="selection-panel__summary">
        {selectedCount === 1 ? (
          <>
            <h2 id="selection-panel-heading">{visibleCountries[0]?.name}</h2>
            <p>1 country selected</p>
          </>
        ) : (
          <>
            <h2 id="selection-panel-heading">{selectedCount} countries selected</h2>
            <p>
              {visibleCountries.map((country) => country.name).join(', ')}
              {remainingCount > 0 ? ` and ${remainingCount} more` : ''}
            </p>
          </>
        )}
      </div>

      <div className="selection-panel__current-color">
        <span className="selection-panel__color-label">Current color</span>
        {hasMixedColors ? (
          <span className="selection-panel__color-value">
            <span
              className="selection-panel__color-preview selection-panel__color-preview--mixed"
              aria-hidden="true"
            >
              <span className="selection-panel__mixed-half selection-panel__mixed-half--light" />
              <span className="selection-panel__mixed-half selection-panel__mixed-half--dark" />
            </span>
            Mixed colors
          </span>
        ) : (
          <span className="selection-panel__color-value">
            <span
              className="selection-panel__color-preview"
              style={{ backgroundColor: firstColor }}
              aria-hidden="true"
            />
            {firstColor}
          </span>
        )}
      </div>

      <button type="button" onClick={clearSelection}>
        Clear Selection
      </button>
    </section>
  );
}
