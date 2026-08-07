import { useId, useMemo } from 'react';

import type { CountryId, GeoFeature } from '../types/map';
import { useMapState } from '../hooks/useMapState';
import { getEffectiveCountryColor } from '../utils/colors';

const SELECTION_SECTION_LABEL = 'Selection';
/** `04-UI-SPEC.md § 9`, byte-exact. Both strings are asserted against it. */
const EMPTY_SELECTION_HEADING = 'No countries selected';
const EMPTY_SELECTION_BODY = 'Click a country on the map to start coloring.';
const MIXED_COLOR_LABEL = 'Mixed colors';
const CURRENT_COLOR_PREFIX = 'Current color';
const CLEAR_SELECTION_LABEL = 'Clear Selection';
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

/**
 * The Colors panel's first flat section (`04-UI-SPEC.md § 6.3.3`).
 *
 * **It is not a card and it carries no `<h2>`.** D4-04 inverted the elevation:
 * the panel body is Platinum, a section is a weight-500 label plus its content
 * plus a hairline on the *next* section, and only the leaf row is Porcelain.
 * The panel already has one heading — its own title — so a second `<h2>` inside
 * a surface titled `Colors` was itself the information-architecture half of the
 * owner's `G-3` report.
 *
 * The empty state keeps a real heading (`<h3>`, one level below the panel
 * title) rather than a styled paragraph: it is the answer to "what do I do
 * now", and a screen-reader user navigating by heading has to be able to find
 * it. What it must not be is a second `<h2>`.
 */
export function SelectionPanel({
  countryLookup,
}: SelectionPanelProps): JSX.Element {
  const {
    state: { colors, selectedIds },
    clearSelection,
  } = useMapState();
  const labelId = useId();

  const selectedCountries = useMemo(
    () => getSelectedCountries(selectedIds, countryLookup),
    [countryLookup, selectedIds],
  );

  const selectedColors = useMemo(
    () =>
      selectedCountries.map((country) =>
        getEffectiveCountryColor(colors, country.id),
      ),
    [colors, selectedCountries],
  );

  const firstColor = selectedColors[0];
  const hasMixedColors = selectedColors.some((color) => color !== firstColor);
  const selectedCount = selectedCountries.length;

  if (selectedCount === 0) {
    return (
      <section className="panel-section" aria-labelledby={labelId}>
        <span className="panel-section__label" id={labelId}>
          {SELECTION_SECTION_LABEL}
        </span>
        <h3 className="selection-panel__empty-heading">
          {EMPTY_SELECTION_HEADING}
        </h3>
        <p className="selection-panel__empty-body">{EMPTY_SELECTION_BODY}</p>
      </section>
    );
  }

  const visibleCountries = selectedCountries.slice(0, MAX_VISIBLE_COUNTRY_NAMES);
  const remainingCount = selectedCount - visibleCountries.length;
  const title =
    selectedCount === 1
      ? (visibleCountries[0]?.name ?? '')
      : `${selectedCount} countries selected`;
  const detail =
    selectedCount === 1
      ? ''
      : `${visibleCountries.map((country) => country.name).join(', ')}${
          remainingCount > 0 ? ` and ${remainingCount} more` : ''
        }`;

  return (
    <section className="panel-section" aria-labelledby={labelId}>
      <span className="panel-section__label" id={labelId}>
        {SELECTION_SECTION_LABEL}
      </span>

      <div className="selection-panel__row">
        {hasMixedColors ? (
          <span
            className="selection-panel__preview selection-panel__preview--mixed"
            aria-hidden="true"
          >
            <span className="selection-panel__mixed-half selection-panel__mixed-half--light" />
            <span className="selection-panel__mixed-half selection-panel__mixed-half--dark" />
          </span>
        ) : (
          <span
            className="selection-panel__preview"
            style={{ backgroundColor: firstColor }}
            aria-hidden="true"
          />
        )}

        <span className="selection-panel__identity">
          <span className="selection-panel__title">{title}</span>
          <span className="selection-panel__meta tabular-nums">
            {hasMixedColors
              ? MIXED_COLOR_LABEL
              : `${CURRENT_COLOR_PREFIX} ${firstColor}`}
          </span>
          {detail === '' ? null : (
            <span className="selection-panel__detail">{detail}</span>
          )}
        </span>
      </div>

      <button type="button" className="panel-action" onClick={clearSelection}>
        {CLEAR_SELECTION_LABEL}
      </button>
    </section>
  );
}
