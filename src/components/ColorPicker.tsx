import { useCallback, useId, useMemo } from 'react';
import type {
  ChangeEvent,
  FormEvent,
  MouseEvent,
} from 'react';

import { COLOR_PRESETS, CUSTOM_COLOR_PLACEHOLDER } from '../constants/colors';
import { CheckIcon } from './icons/CheckIcon';
import type { CountryId } from '../types/map';
import { useMapState } from '../hooks/useMapState';
import {
  getEffectiveCountryColor,
  hasEffectiveColorChange,
  normalizeColor,
} from '../utils/colors';
import { TOAST_MESSAGES } from './ToastRegion';

const CUSTOM_COLOR_LABEL = 'Custom color';
const APPLY_COLOR_LABEL = 'Apply Color';
/** UI-SPEC 6: 16px, on the TILE background rather than on the swatch. */
const SELECTED_CHECK_SIZE = 16;
const CUSTOM_COLOR_ERROR =
  'Enter #RGB, #RRGGBB, or rgb values from 0 to 255.';

interface ColorPickerProps {
  /**
   * Entities the active scene can render. Defence in depth behind the map and
   * browser gates: a period switch reconciles the selection, but colouring must
   * never write a country the scene does not contain even for one render.
   */
  selectableCountryIds: ReadonlySet<CountryId>;
  /**
   * Owned by `App`: the 1200px transition remounts this subtree, so an
   * in-progress custom color would otherwise be lost on resize.
   */
  customDraft: string;
  onCustomDraftChange: (draft: string) => void;
  isDisabled?: boolean;
  onStatus: (message: string) => void;
}

export function ColorPicker({
  selectableCountryIds,
  customDraft,
  onCustomDraftChange,
  isDisabled = false,
  onStatus,
}: ColorPickerProps): JSX.Element {
  const {
    state: { colors, selectedIds },
    setColors,
  } = useMapState();
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const selectedCountryIds = useMemo(
    () =>
      Array.from(selectedIds).filter((countryId): boolean =>
        selectableCountryIds.has(countryId),
      ),
    [selectableCountryIds, selectedIds],
  );
  const selectedCount = selectedCountryIds.length;
  const controlsDisabled = isDisabled || selectedCount === 0;
  const customColorResult = useMemo(
    () => normalizeColor(customDraft),
    [customDraft],
  );
  const hasCustomDraft = customDraft.trim().length > 0;
  const hasInvalidCustomDraft = hasCustomDraft && !customColorResult.ok;
  const hasCustomColorChange =
    customColorResult.ok &&
    hasEffectiveColorChange(
      colors,
      selectedCountryIds,
      customColorResult.value,
    );

  const handlePresetClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const colorName = event.currentTarget.dataset.colorName;
      const colorValue = event.currentTarget.value;

      if (colorName === undefined || selectedCountryIds.length === 0) {
        return;
      }

      if (setColors(selectedCountryIds, colorValue)) {
        onStatus(
          TOAST_MESSAGES.presetApplied(colorName, selectedCountryIds.length),
        );
      }
    },
    [onStatus, selectedCountryIds, setColors],
  );

  const handleCustomDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onCustomDraftChange(event.currentTarget.value);
    },
    [onCustomDraftChange],
  );

  const handleCustomSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (
        controlsDisabled ||
        !customColorResult.ok ||
        selectedCountryIds.length === 0
      ) {
        return;
      }

      if (!setColors(selectedCountryIds, customColorResult.value)) {
        return;
      }

      onCustomDraftChange(customColorResult.value);
      onStatus(
        TOAST_MESSAGES.customColorApplied(
          customColorResult.value,
          selectedCountryIds.length,
        ),
      );
    },
    [
      controlsDisabled,
      customColorResult,
      onCustomDraftChange,
      onStatus,
      selectedCountryIds,
      setColors,
    ],
  );

  return (
    <section className="color-picker" aria-labelledby="color-picker-heading">
      <h2 id="color-picker-heading">Choose a color</h2>

      <fieldset className="color-picker__presets" disabled={controlsDisabled}>
        <legend>Preset colors</legend>
        <div className="color-picker__preset-grid">
          {COLOR_PRESETS.map((preset) => {
            const isActive =
              selectedCount > 0 &&
              selectedCountryIds.every(
                (countryId) =>
                  getEffectiveCountryColor(colors, countryId) === preset.value,
              );

            return (
              <button
                key={preset.value}
                type="button"
                className={`color-picker__preset${
                  isActive ? ' color-picker__preset--active' : ''
                }`}
                value={preset.value}
                data-color-name={preset.name}
                aria-label={`Apply ${preset.name}`}
                aria-pressed={isActive}
                disabled={controlsDisabled || isActive}
                onClick={handlePresetClick}
              >
                <span
                  className="color-picker__preset-swatch"
                  style={{ backgroundColor: preset.value }}
                  aria-hidden="true"
                />
                <span className="color-picker__preset-name">{preset.name}</span>
                {/*
                  On the tile background, never on the swatch: the swatch
                  carries a creator-chosen colour, and a glyph drawn on it is
                  invisible against roughly half of them. This replaces the
                  deleted `--active-check-*` trio, whose fixed
                  `#111827`-on-white values went invisible under `.dark`.
                */}
                {isActive ? (
                  <span className="color-picker__active-check" aria-hidden="true">
                    <CheckIcon size={SELECTED_CHECK_SIZE} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <form className="color-picker__custom" onSubmit={handleCustomSubmit} noValidate>
        <label htmlFor={inputId}>{CUSTOM_COLOR_LABEL}</label>
        <input
          id={inputId}
          type="text"
          value={customDraft}
          placeholder={CUSTOM_COLOR_PLACEHOLDER}
          onChange={handleCustomDraftChange}
          disabled={controlsDisabled}
          aria-invalid={hasInvalidCustomDraft}
          aria-describedby={hasInvalidCustomDraft ? errorId : undefined}
          autoComplete="off"
          spellCheck="false"
        />

        {hasInvalidCustomDraft ? (
          <p id={errorId} className="color-picker__error">
            {CUSTOM_COLOR_ERROR}
          </p>
        ) : null}

        {customColorResult.ok ? (
          <div className="color-picker__custom-preview">
            <span
              className="color-picker__custom-swatch"
              style={{ backgroundColor: customColorResult.value }}
              aria-hidden="true"
            />
            <span>{customColorResult.value}</span>
          </div>
        ) : null}

        {/*
          The Colors panel's ONE accent surface (D-05: Apple Blue is one thing
          per surface). Filled from the mode-invariant `--accent-fill` rather
          than `--themely-apple-blue`, which would give white-on-blue at 3.02:1
          in dark mode. Keyed on a role class, never on position.
        */}
        <button
          type="submit"
          className="color-picker__submit"
          disabled={controlsDisabled || !hasCustomColorChange}
        >
          {APPLY_COLOR_LABEL}
        </button>
      </form>
    </section>
  );
}
