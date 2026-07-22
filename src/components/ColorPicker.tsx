import {
  useCallback,
  useId,
  useMemo,
  useState,
} from 'react';
import type {
  ChangeEvent,
  FormEvent,
  MouseEvent,
} from 'react';

import { COLOR_PRESETS, DEFAULT_COLOR } from '../constants/colors';
import { useMapState } from '../hooks/useMapState';
import { hasEffectiveColorChange, normalizeColor } from '../utils/colors';

const CUSTOM_COLOR_LABEL = 'Custom color';
const CUSTOM_COLOR_PLACEHOLDER = '#RRGGBB or rgb(0, 0, 0)';
const CUSTOM_COLOR_ERROR =
  'Enter #RGB, #RRGGBB, or rgb values from 0 to 255.';

interface ColorPickerProps {
  isDisabled?: boolean;
  onStatus: (message: string) => void;
}

function buildAppliedMessage(colorLabel: string, selectedCount: number): string {
  return `Applied ${colorLabel} to ${selectedCount} countries.`;
}

export function ColorPicker({
  isDisabled = false,
  onStatus,
}: ColorPickerProps): JSX.Element {
  const {
    state: { colors, selectedIds },
    setColors,
  } = useMapState();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [customDraft, setCustomDraft] = useState('');

  const selectedCountryIds = useMemo(
    () => Array.from(selectedIds),
    [selectedIds],
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
        onStatus(buildAppliedMessage(colorName, selectedCountryIds.length));
      }
    },
    [onStatus, selectedCountryIds, setColors],
  );

  const handleCustomDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setCustomDraft(event.currentTarget.value);
    },
    [],
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

      setCustomDraft(customColorResult.value);
      onStatus(
        buildAppliedMessage(
          customColorResult.value,
          selectedCountryIds.length,
        ),
      );
    },
    [
      controlsDisabled,
      customColorResult,
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
                  (colors[countryId] ?? DEFAULT_COLOR) === preset.value,
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
                <span>{preset.name}</span>
                {isActive ? (
                  <span className="color-picker__active-check" aria-hidden="true">
                    ✓
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

        <button
          type="submit"
          disabled={controlsDisabled || !hasCustomColorChange}
        >
          Apply Custom Color
        </button>
      </form>
    </section>
  );
}
