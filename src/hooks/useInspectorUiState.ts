import { useCallback, useMemo, useReducer, useState } from 'react';

import {
  createInitialLocateState,
  filterLocateCountries,
  reduceLocateState,
} from '../components/LocateCountry';
import type { LocateAction, LocateState } from '../components/LocateCountry';
import type { RampId } from '../utils/ramps';
import type { WorldCountryMetadata } from './useGeoData';

/** The strip a fresh session opens on. `04-02`'s first family. */
const DEFAULT_RAMP_ID: RampId = 'blues';

export interface InspectorUiState {
  readonly countryQuery: string;
  readonly setCountryQuery: (query: string) => void;
  readonly customColorDraft: string;
  readonly setCustomColorDraft: (draft: string) => void;
  /**
   * The Colors panel's selected ramp family, held here for the same reason the
   * drafts are: the 1200px transition remounts the panel, and a creator who
   * picked `Greens` should not find `Blues` again after resizing the window.
   * It is UI state, never composition state - the ramp a country is PAINTED
   * with lives in its own `ColorValue`.
   */
  readonly rampId: RampId;
  readonly setRampId: (rampId: RampId) => void;
  /** The `Map style` panel's custom water hex, held here for the same reason. */
  readonly customSurfaceDraft: string;
  readonly setCustomSurfaceDraft: (draft: string) => void;
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
  const [rampId, setRampId] = useState<RampId>(DEFAULT_RAMP_ID);
  const [customSurfaceDraft, setCustomSurfaceDraft] = useState('');
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
      rampId,
      setRampId,
      customSurfaceDraft,
      setCustomSurfaceDraft,
      isLegendExpanded,
      setLegendExpanded,
      locateState,
      dispatchLocate,
    }),
    [
      countryQuery,
      customColorDraft,
      rampId,
      customSurfaceDraft,
      isLegendExpanded,
      locateState,
    ],
  );
}
