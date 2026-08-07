import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import worldManifest from '../../public/data/world-manifest.json';
import type { WorldCountryMetadata } from '../hooks/useGeoData';
import {
  LocateCountry,
  createInitialLocateState,
  filterLocateCountries,
  getLocateEmptyState,
  reduceLocateState,
} from './LocateCountry';

/**
 * The catalog the app actually browses after D4-10: 195 core states plus the
 * twelve self-colorable units. It is derived from the manifest so a
 * reclassification reaches this fixture, and its length is asserted against the
 * literal 207 rather than against its own `.length`.
 */
const COUNTRY_CATALOG: ReadonlyArray<WorldCountryMetadata> = [
  ...worldManifest.coreStates,
  ...worldManifest.nonCoreUnits.filter(
    (unit) => unit.colorPolicy === 'self-colorable',
  ),
  ...worldManifest.supplements.filter(
    (unit) => unit.colorPolicy === 'self-colorable',
  ),
].map(({ id, name }) => ({ id, name }));
const HISTORICAL_ENTITY_ID = 'HIST-PLC';
const NATIVE_DISABLED_ATTRIBUTE = /\sdisabled(?:=""|(?=[\s>]))/;

describe('LocateCountry', () => {
  it('exposes a semantic combobox and keeps Locate disabled before a commit', () => {
    const markup = renderToStaticMarkup(
      <LocateCountry
        countries={COUNTRY_CATALOG}
        state={createInitialLocateState()}
        dispatch={vi.fn()}
        onLocate={vi.fn()}
      />,
    );
    const locateButton = markup.match(
      /<button\b[^>]*type="button"[^>]*>Locate Country<\/button>/,
    )?.[0];

    expect(COUNTRY_CATALOG).toHaveLength(207);
    expect(markup).toContain('aria-label="Find a country"');
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-autocomplete="list"');
    expect(markup).toContain('placeholder="Search by country name"');
    expect(locateButton).toMatch(NATIVE_DISABLED_ATTRIBUTE);
    expect(markup).not.toContain(HISTORICAL_ENTITY_ID);
  });

  it('filters the fixed modern catalog and rejects historical-only IDs', () => {
    expect(filterLocateCountries(COUNTRY_CATALOG, '')).toHaveLength(207);
    // Locate can find the twelve by name (D4-10); before it, it could not.
    expect(filterLocateCountries(COUNTRY_CATALOG, 'kosovo')).toEqual([
      { id: 'KOS', name: 'Kosovo' },
    ]);
    expect(filterLocateCountries(COUNTRY_CATALOG, 'fiji')).toEqual([
      { id: 'FJI', name: 'Fiji' },
    ]);
    expect(
      filterLocateCountries(COUNTRY_CATALOG, HISTORICAL_ENTITY_ID),
    ).toEqual([]);
  });

  it('invalidates a committed target as soon as the draft is edited', () => {
    const initial = createInitialLocateState();
    const opened = reduceLocateState(initial, { type: 'open' }, 195);
    const moved = reduceLocateState(opened, { type: 'move', delta: 1 }, 195);
    const committed = reduceLocateState(
      moved,
      { type: 'commit', countryId: 'FRA', countryName: 'France' },
      195,
    );
    const edited = reduceLocateState(
      committed,
      { type: 'change', draft: 'Francex' },
      0,
    );

    expect(opened).toMatchObject({ isOpen: true, activeIndex: 0 });
    expect(moved.activeIndex).toBe(1);
    expect(committed).toMatchObject({
      draft: 'France',
      committedTargetId: 'FRA',
      isOpen: false,
    });
    expect(edited).toMatchObject({
      draft: 'Francex',
      committedTargetId: null,
      isOpen: true,
      activeIndex: -1,
    });
  });

  it('supports bounded Up/Down, Escape, and clear state transitions', () => {
    const initial = createInitialLocateState();
    const opened = reduceLocateState(initial, { type: 'open' }, 2);
    const movedUp = reduceLocateState(opened, { type: 'move', delta: -1 }, 2);
    const movedDown = reduceLocateState(movedUp, { type: 'move', delta: 1 }, 2);
    const escaped = reduceLocateState(movedDown, { type: 'escape' }, 2);
    const cleared = reduceLocateState(escaped, { type: 'clear' }, 2);

    expect(movedUp.activeIndex).toBe(1);
    expect(movedDown.activeIndex).toBe(0);
    expect(escaped).toMatchObject({ isOpen: false, activeIndex: -1 });
    expect(cleared).toEqual(createInitialLocateState());
  });

  it('provides the exact scoped no-match copy', () => {
    expect(getLocateEmptyState('Atlantis')).toEqual({
      heading: 'No country matches “Atlantis”.',
      body: 'Try a different country name.',
      clearLabel: 'Clear Locate Search',
    });
  });
});
