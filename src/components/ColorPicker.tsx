import { useCallback, useId, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import {
  CUSTOM_COLOR_ERROR_MESSAGE,
  CUSTOM_COLOR_PLACEHOLDER,
} from '../constants/colors';
import type { ColorValue, CountryId } from '../types/map';
import { RampStrip } from './RampStrip';
import type { Ramp, RampId } from '../utils/ramps';
import {
  RAMPS,
  RAMP_STEP_COUNT,
  rampStepPosition,
  shadeForValue,
} from '../utils/ramps';
import { useMapState } from '../hooks/useMapState';
import {
  customColor,
  hasEffectiveColorChange,
  rampColor,
} from '../utils/colors';
import { normalizeColor } from '../utils/colors';
import { TOAST_MESSAGES } from './ToastRegion';

const RAMP_SECTION_LABEL = 'Ramp';
const CUSTOM_COLOR_LABEL = 'Custom color';
const APPLY_COLOR_LABEL = 'Apply Color';

/**
 * The 1-based strip step the WHOLE selection carries, or `null`.
 *
 * `null` for a mixed selection is deliberate rather than "show the first one":
 * the check glyph and the readout are what carry selection when colour cannot,
 * so claiming a step that only some countries have would be the one thing this
 * component must not do.
 */
function appliedRampStep(
  colors: Readonly<Record<string, ColorValue | undefined>>,
  countryIds: ReadonlyArray<CountryId>,
  ramp: Ramp,
): number | null {
  if (countryIds.length === 0) {
    return null;
  }

  let agreedStep: number | null = null;

  for (const countryId of countryIds) {
    const value = colors[countryId];
    if (value === undefined || value.kind !== 'ramp' || value.rampId !== ramp.id) {
      return null;
    }

    const shade = shadeForValue(ramp, value.t);
    const step = ramp.shades.indexOf(shade) + 1;
    if (step === 0 || (agreedStep !== null && agreedStep !== step)) {
      return null;
    }
    agreedStep = step;
  }

  return agreedStep;
}

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
  /**
   * Owned by `App` for the same reason `customDraft` is: the 1200px transition
   * remounts this subtree, and a creator who picked `Greens` should not find
   * `Blues` again after resizing the window.
   */
  rampId: RampId;
  onRampIdChange: (rampId: RampId) => void;
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
  rampId,
  onRampIdChange,
  isDisabled = false,
  onStatus,
}: ColorPickerProps): JSX.Element {
  const {
    state: { colors, selectedIds },
    setColors,
    setColorValues,
  } = useMapState();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const labelId = `${inputId}-label`;
  const rampLabelId = `${inputId}-ramp`;

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

  const ramp = useMemo(
    (): Ramp => RAMPS.find((candidate) => candidate.id === rampId) ?? RAMPS[0],
    [rampId],
  );
  const appliedStep = useMemo(
    (): number | null => appliedRampStep(colors, selectedCountryIds, ramp),
    [colors, ramp, selectedCountryIds],
  );

  const handleApplyStep = useCallback(
    (step: number): void => {
      if (controlsDisabled || selectedCountryIds.length === 0) {
        return;
      }

      /*
       * The country stores the ramp IDENTITY, never the resolved hex - that is
       * what lets a later ramp swap re-skin every country painted with it, and
       * it is what Phase 5's classing engine writes with no adapter. It goes
       * through the provider's value seam rather than being flattened to a hex
       * and re-parsed, so there is still exactly one `resolveColorValue`.
       */
      const value = rampColor(ramp.id, rampStepPosition(step, RAMP_STEP_COUNT));
      if (!setColorValues(selectedCountryIds, value)) {
        return;
      }

      onStatus(
        TOAST_MESSAGES.customColorApplied(
          shadeForValue(ramp, value.t),
          selectedCountryIds.length,
        ),
      );
    },
    [controlsDisabled, onStatus, ramp, selectedCountryIds, setColorValues],
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
    <>
      {/*
        `Ramp` and `Custom color` are PEERS, not a hierarchy. D4-06 moved
        everything about how the *map* looks to `Map style`, and that
        relocation is what makes a flat information architecture fit here.
      */}
      <fieldset className="panel-section" disabled={controlsDisabled}>
        <legend className="panel-section__label" id={rampLabelId}>
          {RAMP_SECTION_LABEL}
        </legend>

        <div className="panel-pills">
          {RAMPS.map((candidate): JSX.Element => (
            <label key={candidate.id} className="panel-pill">
              <input
                type="radio"
                name={rampLabelId}
                value={candidate.id}
                checked={candidate.id === ramp.id}
                onChange={(): void => onRampIdChange(candidate.id)}
              />
              {candidate.name}
            </label>
          ))}
        </div>

        <RampStrip
          ramp={ramp}
          appliedStep={appliedStep}
          onApplyStep={handleApplyStep}
        />
      </fieldset>

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
    </>
  );
}
