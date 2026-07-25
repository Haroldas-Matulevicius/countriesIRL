import { useCallback, useId, useMemo, useRef } from 'react';
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react';

import type { WorldCountryMetadata } from '../hooks/useGeoData';
import type { CountryId } from '../types/map';
import { filterCountryCatalog } from './CountryList';

const LOCATE_DRAFT_MAX_LENGTH = 100;
const LOCATE_SEARCH_PLACEHOLDER = 'Search by country name';
const LOCATE_EMPTY_BODY = 'Try a different country name.';
const LOCATE_CLEAR_LABEL = 'Clear Locate Search';

interface LocateCountryProps {
  countries: ReadonlyArray<WorldCountryMetadata>;
  /**
   * Owned by `App`: the 1200px transition remounts this subtree, so the
   * combobox draft and its committed target would otherwise be lost on resize.
   */
  state: LocateState;
  dispatch: (action: LocateAction) => void;
  isDisabled?: boolean;
  onLocate: (countryId: CountryId) => void;
}

export interface LocateState {
  readonly draft: string;
  readonly committedTargetId: CountryId | null;
  readonly isOpen: boolean;
  readonly activeIndex: number;
}

export type LocateAction =
  | { readonly type: 'open' }
  | { readonly type: 'change'; readonly draft: string }
  | { readonly type: 'move'; readonly delta: -1 | 1 }
  | {
      readonly type: 'commit';
      readonly countryId: CountryId;
      readonly countryName: string;
    }
  | { readonly type: 'escape' }
  | { readonly type: 'clear' };

export interface LocateEmptyState {
  readonly heading: string;
  readonly body: string;
  readonly clearLabel: string;
}

export function createInitialLocateState(): LocateState {
  return {
    draft: '',
    committedTargetId: null,
    isOpen: false,
    activeIndex: -1,
  };
}

function getInitialActiveIndex(optionCount: number): number {
  return optionCount > 0 ? 0 : -1;
}

export function reduceLocateState(
  state: LocateState,
  action: LocateAction,
  optionCount: number,
): LocateState {
  switch (action.type) {
    case 'open':
      return {
        ...state,
        isOpen: true,
        activeIndex:
          state.activeIndex >= 0 && state.activeIndex < optionCount
            ? state.activeIndex
            : getInitialActiveIndex(optionCount),
      };

    case 'change':
      return {
        draft: action.draft,
        committedTargetId: null,
        isOpen: true,
        activeIndex: getInitialActiveIndex(optionCount),
      };

    case 'move': {
      if (optionCount === 0) {
        return {
          ...state,
          isOpen: true,
          activeIndex: -1,
        };
      }

      const baseIndex = state.activeIndex < 0 ? 0 : state.activeIndex;
      const activeIndex =
        (baseIndex + action.delta + optionCount) % optionCount;

      return {
        ...state,
        isOpen: true,
        activeIndex,
      };
    }

    case 'commit':
      return {
        draft: action.countryName,
        committedTargetId: action.countryId,
        isOpen: false,
        activeIndex: -1,
      };

    case 'escape':
      return {
        ...state,
        isOpen: false,
        activeIndex: -1,
      };

    case 'clear':
      return createInitialLocateState();
  }
}

export function filterLocateCountries(
  countries: ReadonlyArray<WorldCountryMetadata>,
  draft: string,
): ReadonlyArray<WorldCountryMetadata> {
  return filterCountryCatalog(countries, draft);
}

export function getLocateEmptyState(query: string): LocateEmptyState {
  return {
    heading: `No country matches “${query}”.`,
    body: LOCATE_EMPTY_BODY,
    clearLabel: LOCATE_CLEAR_LABEL,
  };
}

export function LocateCountry({
  countries,
  state,
  dispatch,
  isDisabled = false,
  onLocate,
}: LocateCountryProps): JSX.Element {
  const comboboxId = useId();
  const popupId = `${comboboxId}-popup`;
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressNextFocusOpenRef = useRef(false);
  const options = useMemo(
    () => filterLocateCountries(countries, state.draft),
    [countries, state.draft],
  );
  const activeOption =
    state.activeIndex >= 0 ? options[state.activeIndex] : undefined;
  const emptyState = useMemo(
    () => getLocateEmptyState(state.draft),
    [state.draft],
  );

  const commitOption = useCallback(
    (country: WorldCountryMetadata): void => {
      dispatch({
        type: 'commit',
        countryId: country.id,
        countryName: country.name,
      });
    },
    [dispatch],
  );

  const handleDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      dispatch({
        type: 'change',
        draft: event.currentTarget.value.slice(0, LOCATE_DRAFT_MAX_LENGTH),
      });
    },
    [dispatch],
  );

  const handleInputFocus = useCallback((): void => {
    if (suppressNextFocusOpenRef.current) {
      suppressNextFocusOpenRef.current = false;
      return;
    }

    dispatch({ type: 'open' });
  }, [dispatch]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        dispatch({
          type: 'move',
          delta: event.key === 'ArrowDown' ? 1 : -1,
        });
        return;
      }

      if (event.key === 'Enter' && activeOption !== undefined) {
        event.preventDefault();
        commitOption(activeOption);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        dispatch({ type: 'escape' });
      }
    },
    [activeOption, commitOption, dispatch],
  );

  const handleContainerBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>): void => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        containerRef.current?.contains(nextTarget) === true
      ) {
        return;
      }

      dispatch({ type: 'escape' });
    },
    [dispatch],
  );

  const handleOptionMouseDown = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
    },
    [],
  );

  const handleClear = useCallback((): void => {
    dispatch({ type: 'clear' });
    suppressNextFocusOpenRef.current = true;
    inputRef.current?.focus();
  }, [dispatch]);

  const handleLocate = useCallback((): void => {
    if (state.committedTargetId !== null) {
      onLocate(state.committedTargetId);
    }
  }, [onLocate, state.committedTargetId]);

  return (
    <div
      ref={containerRef}
      className="locate-country"
      onBlur={handleContainerBlur}
    >
      <label htmlFor={comboboxId}>Find a country</label>
      <input
        ref={inputRef}
        id={comboboxId}
        type="text"
        role="combobox"
        value={state.draft}
        onChange={handleDraftChange}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
        placeholder={LOCATE_SEARCH_PLACEHOLDER}
        aria-label="Find a country"
        aria-autocomplete="list"
        aria-expanded={state.isOpen}
        aria-controls={popupId}
        aria-activedescendant={
          state.isOpen && activeOption !== undefined
            ? `${popupId}-option-${activeOption.id}`
            : undefined
        }
        autoComplete="off"
        maxLength={LOCATE_DRAFT_MAX_LENGTH}
        disabled={isDisabled}
      />

      {state.isOpen ? (
        options.length > 0 ? (
          <ul id={popupId} className="locate-country__options" role="listbox">
            {options.map((country, index) => (
              <li
                id={`${popupId}-option-${country.id}`}
                key={country.id}
                role="option"
                aria-selected={index === state.activeIndex}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={handleOptionMouseDown}
                  onClick={(): void => commitOption(country)}
                >
                  {country.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div id={popupId} className="locate-country__empty" role="status">
            <h3>{emptyState.heading}</h3>
            <p>{emptyState.body}</p>
            <button type="button" onClick={handleClear}>
              {emptyState.clearLabel}
            </button>
          </div>
        )
      ) : null}

      <button
        type="button"
        onClick={handleLocate}
        disabled={isDisabled || state.committedTargetId === null}
      >
        Locate Country
      </button>
    </div>
  );
}
