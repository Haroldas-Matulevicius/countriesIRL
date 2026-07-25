import { useCallback, useMemo, useReducer, useState } from 'react';

import {
  createInitialLocateState,
  filterLocateCountries,
  reduceLocateState,
} from '../components/LocateCountry';
import type { LocateAction, LocateState } from '../components/LocateCountry';
import type { WorldCountryMetadata } from './useGeoData';

export interface InspectorUiState {
  readonly countryQuery: string;
  readonly setCountryQuery: (query: string) => void;
  readonly customColorDraft: string;
  readonly setCustomColorDraft: (draft: string) => void;
  readonly isLegendExpanded: boolean;
  readonly setLegendExpanded: (isExpanded: boolean) => void;
  readonly locateState: LocateState;
  readonly dispatchLocate: (action: LocateAction) => void;
}

/**
 * The inspector's transient UI state, held above the responsive branch.
 *
 * Desktop renders `[map, <aside>{actions, selection+color, legend, countries}]`
 * while compact renders those four as flat siblings of the map. `map` keeps its
 * key at the same level so the camera keeps exactly one owner, but the four
 * inspector sections change *parent* across the 1200px transition, so React
 * unmounts and remounts them. Anything they owned locally - the country search
 * query, the custom colour draft, the Legend disclosure expansion, the Locate
 * combobox - was therefore discarded on every resize across the breakpoint.
 *
 * Holding it here, next to the map and composition state that were already held
 * above the branch, keeps the shell free to wrap without owning the state.
 */
export function useInspectorUiState(
  countries: ReadonlyArray<WorldCountryMetadata>,
): InspectorUiState {
  const [countryQuery, setCountryQuery] = useState('');
  const [customColorDraft, setCustomColorDraft] = useState('');
  const [isLegendExpanded, setLegendExpanded] = useState(false);
  const locateReducer = useCallback(
    (state: LocateState, action: LocateAction): LocateState =>
      reduceLocateState(
        state,
        action,
        filterLocateCountries(
          countries,
          action.type === 'change' ? action.draft : state.draft,
        ).length,
      ),
    [countries],
  );
  const [locateState, dispatchLocate] = useReducer(
    locateReducer,
    undefined,
    createInitialLocateState,
  );

  return useMemo(
    (): InspectorUiState => ({
      countryQuery,
      setCountryQuery,
      customColorDraft,
      setCustomColorDraft,
      isLegendExpanded,
      setLegendExpanded,
      locateState,
      dispatchLocate,
    }),
    [countryQuery, customColorDraft, isLegendExpanded, locateState],
  );
}
