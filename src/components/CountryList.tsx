import { useCallback, useId, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';

import { DEFAULT_COLOR } from '../constants/colors';
import type { WorldCountryMetadata } from '../hooks/useGeoData';
import type { CountryId } from '../types/map';
import { useMapState } from '../hooks/useMapState';
import { getEffectiveCountryColor } from '../utils/colors';

const COUNTRY_SEARCH_MAX_LENGTH = 100;
const COUNTRY_SEARCH_PLACEHOLDER = 'Type a country name';
/**
 * The inspector carries two search surfaces and they do different jobs, so each
 * one says which. Without this line the list filter and Locate read as the same
 * control twice and the creator has to guess.
 */
const COUNTRY_LIST_HINT =
  'Tick a country to add it to your selection, then choose a color.';
const COUNTRY_SEARCH_EMPTY_BODY = 'Try a different country name.';
const COUNTRY_SEARCH_CLEAR_LABEL = 'Clear Country Search';
export const COUNTRY_NOT_IN_SCENE_HINT = 'Not in this map';

interface CountryListProps {
  countries: ReadonlyArray<WorldCountryMetadata>;
  /**
   * Entities the active scene can actually select. The browsable catalog stays
   * the modern colorable list - 195 core states plus the twelve self-colorable
   * units, 207 in all since D4-10 (historical entities are never searchable) -
   * so rows outside the scene are shown but rejected instead of being hidden.
   */
  selectableCountryIds: ReadonlySet<CountryId>;
  /**
   * Owned by `App`, not by this component: crossing the 1200px breakpoint
   * moves this subtree into and out of the inspector shell, which remounts it.
   * Component-local search state would be silently discarded on every resize.
   */
  query: string;
  onQueryChange: (query: string) => void;
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

/**
 * Bulk selection must never reach past the active scene: a historical snapshot
 * that replaced France still lists France in the browser, but selecting it
 * would produce a selection the map, the selection panel, and the legend all
 * disagree about.
 */
export function getSelectableVisibleCountryIds(
  countries: ReadonlyArray<WorldCountryMetadata>,
  selectableCountryIds: ReadonlySet<CountryId>,
): ReadonlyArray<CountryId> {
  return getVisibleCountryIds(countries).filter((countryId) =>
    selectableCountryIds.has(countryId),
  );
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
  selectableCountryIds,
  query,
  onQueryChange,
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
  const filteredCountries = useMemo(
    () => filterCountryCatalog(countries, query),
    [countries, query],
  );
  const visibleCountryIds = useMemo(
    () => getVisibleCountryIds(filteredCountries),
    [filteredCountries],
  );
  const selectableVisibleCountryIds = useMemo(
    () =>
      getSelectableVisibleCountryIds(filteredCountries, selectableCountryIds),
    [filteredCountries, selectableCountryIds],
  );
  const validCountryIds = useMemo(
    () =>
      new Set<CountryId>(
        countries
          .map((country) => country.id)
          .filter((countryId) => selectableCountryIds.has(countryId)),
      ),
    [countries, selectableCountryIds],
  );
  const hasVisibleCountries = visibleCountryIds.length > 0;
  const hasSelectableVisibleCountries = selectableVisibleCountryIds.length > 0;
  const hasExactVisibleSelection =
    hasSelectableVisibleCountries &&
    selectedIds.size === selectableVisibleCountryIds.length &&
    selectableVisibleCountryIds.every((countryId) => selectedIds.has(countryId));
  const emptyState = useMemo(
    () => getCountrySearchEmptyState(query),
    [query],
  );

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onQueryChange(
        event.currentTarget.value.slice(0, COUNTRY_SEARCH_MAX_LENGTH),
      );
    },
    [onQueryChange],
  );

  const handleClearSearch = useCallback((): void => {
    onQueryChange('');
    searchInputRef.current?.focus();
  }, [onQueryChange]);

  const handleSelectVisible = useCallback((): void => {
    replaceSelection(selectableVisibleCountryIds);
  }, [replaceSelection, selectableVisibleCountryIds]);

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
      {/*
        A stack, not a row. As `heading | search | two buttons` in one flex row
        the buttons were clipped to their first letter inside the 376px
        inspector and the column grew its own horizontal scrollbar - a row of
        four full-phrase controls has no width at which it fits.
      */}
      <div className="country-list__header">
        <div className="country-list__intro">
          <h2 id={`${listId}-heading`}>Countries</h2>
          <p className="country-list__hint">{COUNTRY_LIST_HINT}</p>
        </div>
        <label className="country-list__search">
          <span className="country-list__search-label">Search countries</span>
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
              isDisabled ||
              !hasSelectableVisibleCountries ||
              hasExactVisibleSelection
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
            const isInActiveScene = selectableCountryIds.has(country.id);
            /*
             * `canonicalizeColorMap` deletes any entry equal to DEFAULT_COLOR,
             * so in this model "white" and "not coloured yet" are the same
             * state. Painting every row with a filled chip made an untouched
             * map read as fully coloured; an unset row now shows an empty
             * outline instead.
             *
             * The accessible name is deliberately unchanged: the country really
             * is rendered white on the map, so `Current color #FFFFFF` stays
             * true, and every row locator keyed on it keeps working.
             */
            const hasColor = countryColor !== DEFAULT_COLOR;

            return (
              <li key={country.id} className="country-list__item">
                <label
                  className="country-list__label"
                  title={
                    isInActiveScene
                      ? country.name
                      : `${country.name} — ${COUNTRY_NOT_IN_SCENE_HINT}`
                  }
                >
                  <input
                    type="checkbox"
                    value={country.id}
                    checked={selectedIds.has(country.id)}
                    onChange={handleCountryChange}
                    disabled={isDisabled || !isInActiveScene}
                  />
                  <span className="country-list__name">{country.name}</span>
                  <span
                    className={
                      hasColor
                        ? 'country-list__color-swatch'
                        : 'country-list__color-swatch country-list__color-swatch--unset'
                    }
                    style={hasColor ? { backgroundColor: countryColor } : undefined}
                    role="img"
                    aria-label={`Current color ${countryColor}`}
                  />
                  {isInActiveScene ? null : (
                    <span className="country-list__unavailable">
                      {COUNTRY_NOT_IN_SCENE_HINT}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
