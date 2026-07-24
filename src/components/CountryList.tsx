import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent } from 'react';

import type { WorldCountryMetadata } from '../hooks/useGeoData';
import type { CountryId } from '../types/map';
import { useMapState } from '../hooks/useMapState';
import { getEffectiveCountryColor } from '../utils/colors';

const COUNTRY_SEARCH_MAX_LENGTH = 100;
const COUNTRY_SEARCH_PLACEHOLDER = 'Type a country name';
const COUNTRY_SEARCH_EMPTY_BODY = 'Try a different country name.';
const COUNTRY_SEARCH_CLEAR_LABEL = 'Clear Country Search';

interface CountryListProps {
  countries: ReadonlyArray<WorldCountryMetadata>;
  isDisabled?: boolean;
}

export interface CountrySearchEmptyState {
  readonly heading: string;
  readonly body: string;
  readonly clearLabel: string;
}

export function filterCountryCatalog(
  countries: ReadonlyArray<WorldCountryMetadata>,
  query: string,
): ReadonlyArray<WorldCountryMetadata> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const seenCountryIds = new Set<CountryId>();

  return countries
    .filter((country): boolean => {
      if (seenCountryIds.has(country.id)) {
        return false;
      }

      seenCountryIds.add(country.id);
      return country.name.toLocaleLowerCase().includes(normalizedQuery);
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getVisibleCountryIds(
  countries: ReadonlyArray<WorldCountryMetadata>,
): ReadonlyArray<CountryId> {
  return countries.map((country) => country.id);
}

export function getCountrySearchEmptyState(
  query: string,
): CountrySearchEmptyState {
  return {
    heading: `No countries match “${query}”.`,
    body: COUNTRY_SEARCH_EMPTY_BODY,
    clearLabel: COUNTRY_SEARCH_CLEAR_LABEL,
  };
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const filteredCountries = useMemo(
    () => filterCountryCatalog(countries, query),
    [countries, query],
  );
  const visibleCountryIds = useMemo(
    () => getVisibleCountryIds(filteredCountries),
    [filteredCountries],
  );
  const validCountryIds = useMemo(
    () => new Set<CountryId>(countries.map((country) => country.id)),
    [countries],
  );
  const hasVisibleCountries = visibleCountryIds.length > 0;
  const hasExactVisibleSelection =
    hasVisibleCountries &&
    selectedIds.size === visibleCountryIds.length &&
    visibleCountryIds.every((countryId) => selectedIds.has(countryId));
  const emptyState = useMemo(
    () => getCountrySearchEmptyState(query),
    [query],
  );

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setQuery(event.currentTarget.value.slice(0, COUNTRY_SEARCH_MAX_LENGTH));
    },
    [],
  );

  const handleClearSearch = useCallback((): void => {
    setQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleSelectVisible = useCallback((): void => {
    replaceSelection(visibleCountryIds);
  }, [replaceSelection, visibleCountryIds]);

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
        <label className="country-list__search">
          <span>Search countries</span>
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder={COUNTRY_SEARCH_PLACEHOLDER}
            aria-label="Search countries"
            maxLength={COUNTRY_SEARCH_MAX_LENGTH}
            disabled={isDisabled}
          />
        </label>
        <div className="country-list__bulk-actions">
          <button
            type="button"
            onClick={handleSelectVisible}
            disabled={
              isDisabled || !hasVisibleCountries || hasExactVisibleSelection
            }
          >
            Select Visible
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

      {query.length > 0 && !hasVisibleCountries ? (
        <div className="country-list__empty" role="status">
          <h3>{emptyState.heading}</h3>
          <p>{emptyState.body}</p>
          <button type="button" onClick={handleClearSearch}>
            {emptyState.clearLabel}
          </button>
        </div>
      ) : (
        <ul className="country-list__items">
          {filteredCountries.map((country) => {
            const countryColor = getEffectiveCountryColor(colors, country.id);

            return (
              <li key={country.id} className="country-list__item">
                <label className="country-list__label" title={country.name}>
                  <input
                    type="checkbox"
                    value={country.id}
                    checked={selectedIds.has(country.id)}
                    onChange={handleCountryChange}
                    disabled={isDisabled}
                  />
                  <span className="country-list__name">{country.name}</span>
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
      )}
    </section>
  );
}
