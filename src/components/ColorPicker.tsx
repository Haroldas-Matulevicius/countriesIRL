import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import {
  CUSTOM_COLOR_ERROR_MESSAGE,
  CUSTOM_COLOR_PLACEHOLDER,
} from '../constants/colors';
import type { CountryId } from '../types/map';
import { useMapState } from '../hooks/useMapState';
import {
  customColor,
  hasEffectiveColorChange,
  normalizeColor,
} from '../utils/colors';
import { TOAST_MESSAGES } from './ToastRegion';

const CUSTOM_COLOR_LABEL = 'Custom color';
const APPLY_COLOR_LABEL = 'Apply Color';

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

/**
 * The Colors panel's `Custom color` section (`04-UI-SPEC.md § 6.3.3`).
 *
 * **`04-07` (D4-04) deleted three things from this component and none of them
 * came back as a smaller version of itself:**
 *
 * - the `<h2>Choose a color</h2>`. One `<h2>` per panel and it is the panel
 *   title; a second heading inside a surface already titled `Colors` was the
 *   information-architecture half of the owner's `G-3` report;
 * - the ten-tile `COLOR_PRESETS` grid. The ramp model replaces it, and the grid
 *   resolved to exactly 3 × 76 = 232px inside 232px of content — literally zero
 *   slack, which is the density half of the same report;
 * - the custom-colour preview box. The applied colour is read back from the
 *   `Selection` row, so there is one place a creator looks for "what colour is
 *   this" instead of two that can disagree.
 *
 * What is left is a flat `<fieldset>`: a weight-500 label, the hex field beside
 * `Apply Color`, and the error. The `<fieldset>` survives as **semantic
 * grouping only** — it carries `disabled` for the whole group and is stripped
 * of border, padding, and margin. A disabled group is `<fieldset disabled>`,
 * never `aria-disabled` on a still-clickable control.
 *
 * `Apply Color` remains the panel's **one** accent surface (D-05), which is why
 * the ramp strip and the family pills carry none.
 */
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
  const labelId = `${inputId}-label`;

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
      customColor(customColorResult.value),
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
    <fieldset className="panel-section" disabled={controlsDisabled}>
      <legend className="panel-section__label" id={labelId}>
        {CUSTOM_COLOR_LABEL}
      </legend>

      <form className="color-picker__custom" onSubmit={handleCustomSubmit} noValidate>
        {/*
          The field's accessible name is the section label itself, so the panel
          does not print `Custom color` twice at 328px of content width. The id
          reference is what keeps `getByLabel('Custom color')` working.
        */}
        <input
          id={inputId}
          type="text"
          className="panel-field"
          aria-labelledby={labelId}
          value={customDraft}
          placeholder={CUSTOM_COLOR_PLACEHOLDER}
          onChange={handleCustomDraftChange}
          aria-invalid={hasInvalidCustomDraft}
          aria-describedby={hasInvalidCustomDraft ? errorId : undefined}
          autoComplete="off"
          spellCheck="false"
        />

        {hasInvalidCustomDraft ? (
          <p id={errorId} className="panel-error">
            {CUSTOM_COLOR_ERROR_MESSAGE}
          </p>
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
    </fieldset>
  );
}
