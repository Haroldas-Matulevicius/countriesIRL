import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

import { CheckIcon } from './icons/CheckIcon';
import type { Ramp } from '../utils/ramps';
import {
  RAMP_STEP_COUNT,
  rampStepAccessibleName,
  rampStepPosition,
  rampStepReadout,
  shadeForValue,
} from '../utils/ramps';
import { labelInkForShade } from '../utils/contrast';

/** UI-SPEC § 6.3.4: 16px, centred ON the shade rather than beside it. */
const CHECK_GLYPH_SIZE = 16;

interface RampStripProps {
  readonly ramp: Ramp;
  /**
   * The 1-based step the whole selection currently carries, or `null` when it
   * carries something else (a custom hex, a different ramp, or a mix).
   */
  readonly appliedStep: number | null;
  readonly onApplyStep: (step: number) => void;
}

/**
 * The ramp strip — the component that carries Phase 4's visual identity
 * (`04-UI-SPEC.md § 6.3.4`).
 *
 * **It must visually rhyme with the exported legend bar**: one contiguous band,
 * no gaps between segments, and exactly one border — on the band, never per
 * segment. Same idiom, one drawn in chrome tokens and one in composition ink.
 * That rhyme is what makes the palette read as cartographic rather than as a
 * colour picker.
 *
 * **The shades do not flip in dark mode and the check glyph does not either.**
 * A shade is the product, not a token. The glyph's colour comes from
 * `labelInkForShade`, which takes only a shade and therefore has nowhere to put
 * a theme — so light and dark are identical *by construction* rather than by a
 * rule someone has to remember. This component authors zero dark overrides.
 *
 * **Colour is never the sole carrier of selection (A6).** Three things carry
 * it: `aria-pressed`, the check glyph, and the `Step i of n · HEX` readout. The
 * measured minimum separation between neighbouring shades across the shipped
 * ramps is 1.2944:1, so a creator genuinely cannot rely on colour alone here.
 *
 * **No accent anywhere.** D-05 spends the Colors panel's Apple Blue on
 * `Apply Color`, so selection is a 2px Midnight Ink inset ring rather than a
 * blue one, and hover is the same ring — instant, with no transition. An ease
 * on a palette swatch is a regression, not polish.
 *
 * **One tab stop, roving.** Arrow keys move between segments and Enter/Space
 * applies (native `<button>` activation — no key handler re-implements it).
 * This makes the file the app's SECOND roving-tabindex writer, which assertion
 * 27 pins as a named set rather than a count; the second name was added with
 * this component and its reason. The rail's rows remain plain tab stops.
 */
export function RampStrip({
  ramp,
  appliedStep,
  onApplyStep,
}: RampStripProps): JSX.Element {
  const [focusedStep, setFocusedStep] = useState(1);
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shouldRestoreFocus = useRef(false);

  useEffect((): void => {
    if (!shouldRestoreFocus.current) {
      return;
    }
    shouldRestoreFocus.current = false;
    stepRefs.current[focusedStep - 1]?.focus();
  }, [focusedStep]);

  /*
   * The single tab stop. It follows the APPLIED step when there is one, so
   * tabbing back into the strip lands on the shade the map is wearing rather
   * than on wherever the pointer last went.
   *
   * `focusedStep` is clamped on READ rather than reconciled in an effect.
   * Uniform N makes the clamp a no-op today; it is here so a later per-ramp N
   * cannot hand `rampStepPosition` an out-of-range index, which throws.
   */
  const tabStopStep = appliedStep ?? Math.min(focusedStep, RAMP_STEP_COUNT);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      const current = Number(
        (event.target as HTMLElement).dataset.rampStep ?? tabStopStep,
      );
      const next = ((): number | null => {
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            return Math.min(RAMP_STEP_COUNT, current + 1);
          case 'ArrowLeft':
          case 'ArrowUp':
            return Math.max(1, current - 1);
          case 'Home':
            return 1;
          case 'End':
            return RAMP_STEP_COUNT;
          default:
            return null;
        }
      })();

      if (next === null) {
        return;
      }

      event.preventDefault();
      shouldRestoreFocus.current = true;
      setFocusedStep(next);
    },
    [tabStopStep],
  );

  const activeStep = tabStopStep;
  const activeShade = shadeForValue(
    ramp,
    rampStepPosition(activeStep, RAMP_STEP_COUNT),
  );

  return (
    <>
      {/*
        `--ramp-steps` is the ONE place the segment count reaches the grid, so
        the geometry follows `RAMP_STEP_COUNT` instead of a CSS literal that
        would have to be edited alongside it.
      */}
      <div
        className="ramp-strip"
        style={{ '--ramp-steps': RAMP_STEP_COUNT } as CSSProperties}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: RAMP_STEP_COUNT }, (_unused, index): JSX.Element => {
          const step = index + 1;
          const shade = shadeForValue(
            ramp,
            rampStepPosition(step, RAMP_STEP_COUNT),
          );
          const isApplied = appliedStep === step;

          return (
            <button
              key={shade}
              ref={(element): void => {
                stepRefs.current[index] = element;
              }}
              type="button"
              className="ramp-strip__step"
              data-ramp-step={step}
              aria-label={rampStepAccessibleName(
                ramp.name,
                step,
                RAMP_STEP_COUNT,
              )}
              aria-pressed={isApplied}
              tabIndex={step === tabStopStep ? 0 : -1}
              style={{ background: shade }}
              onClick={(): void => {
                setFocusedStep(step);
                onApplyStep(step);
              }}
              onFocus={(): void => setFocusedStep(step)}
            >
              {isApplied ? (
                <span
                  className="ramp-strip__check"
                  style={{ color: labelInkForShade(shade) }}
                  aria-hidden="true"
                >
                  <CheckIcon size={CHECK_GLYPH_SIZE} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/*
        `aria-live="off"`: it must not announce on every arrow press. It is a
        readout the creator can go and read, not an interruption.
      */}
      <p className="ramp-strip__readout tabular-nums" aria-live="off">
        {rampStepReadout(activeStep, RAMP_STEP_COUNT, activeShade)}
      </p>
    </>
  );
}
