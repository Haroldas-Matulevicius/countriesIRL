import {
  useCallback,
  useId,
  useMemo,
} from 'react';
import type { ChangeEvent } from 'react';

import type { CountryId, GeoFeature } from '../types/map';
import { DEFAULT_COLOR } from '../constants/colors';
import { useMapState } from '../hooks/useMapState';

interface CountryListProps {
  countries: ReadonlyArray<GeoFeature>;
  isDisabled?: boolean;
}

export function CountryList({
  countries,
  isDisabled = false,
}: CountryListProps): JSX.Element {
  const {
    state: { colors, selectedIds },
    replaceSelection,
    toggleSelection,
    clearSelection,
  } = useMapState();
  const listId = useId();

  const sortedCountries = useMemo(
    () =>
      [...countries].sort((left, right) =>
        left.properties.name.localeCompare(right.properties.name),
      ),
    [countries],
  );
  const countryIds = useMemo(
    () => sortedCountries.map((country) => country.id),
    [sortedCountries],
  );
  const validCountryIds = useMemo(
    () => new Set<CountryId>(countryIds),
    [countryIds],
  );
  const hasCountries = countryIds.length > 0;
  const hasExactAllSelection =
    hasCountries &&
    selectedIds.size === countryIds.length &&
    countryIds.every((countryId) => selectedIds.has(countryId));

  const handleSelectAll = useCallback((): void => {
    replaceSelection(countryIds);
  }, [countryIds, replaceSelection]);

  const handleCountryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const countryId = event.currentTarget.value;

      if (validCountryIds.has(countryId)) {
        toggleSelection(countryId);
      }
    },
    [toggleSelection, validCountryIds],
  );

  return (
    <section className="country-list" aria-labelledby={`${listId}-heading`}>
      <div className="country-list__header">
        <h2 id={`${listId}-heading`}>Countries</h2>
        <div className="country-list__bulk-actions">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={isDisabled || !hasCountries || hasExactAllSelection}
          >
            Select All Countries
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={isDisabled || selectedIds.size === 0}
          >
            Clear Selection
          </button>
        </div>
      </div>

      <ul className="country-list__items">
        {sortedCountries.map((country) => {
          const countryColor = colors[country.id] ?? DEFAULT_COLOR;
          const countryName = country.properties.name;

          return (
            <li key={country.id} className="country-list__item">
              <label className="country-list__label" title={countryName}>
                <input
                  type="checkbox"
                  value={country.id}
                  checked={selectedIds.has(country.id)}
                  onChange={handleCountryChange}
                  disabled={isDisabled}
                />
                <span className="country-list__name">{countryName}</span>
                <span
                  className="country-list__color-swatch"
                  style={{ backgroundColor: countryColor }}
                  role="img"
                  aria-label={`Current color ${countryColor}`}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
