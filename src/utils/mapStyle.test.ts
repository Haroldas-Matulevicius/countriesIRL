import { describe, expect, it } from 'vitest';

import { EXPORT_BORDER_WIDTH } from './export';
import {
  BORDER_COLOR_PRESETS,
  CUSTOM_SURFACE_COLOR_PLACEHOLDER,
  DEFAULT_COASTLINE_WEIGHT,
  DEFAULT_COMPOSITION_SETTINGS,
  DEFAULT_INTERIOR_WEIGHT,
  DEFAULT_SURFACE_COLOR,
  DEFAULT_UNCOLORED_FILL,
  STROKE_WEIGHTS,
  STROKE_WEIGHT_LABELS,
  STROKE_WEIGHT_ORDER,
  STROKE_WEIGHT_UNITS,
  UNCOLORED_FILL_PRESETS,
  WATER_PRESETS,
  hasStroke,
  strokeWidthFor,
} from '../constants/mapStyle';
import type { StrokeWeight } from '../types/composition';
import {
  COMPOSITION_INK_COLOR,
  MIN_COMPOSITION_SURFACE_LUMINANCE,
  WCAG_AA_BODY_RATIO,
  contrastRatio,
  parseHexColor,
  relativeLuminance,
} from './contrast';

/**
 * The water preset gate (D4-03, `04-UI-SPEC.md § 4.2` and § 6.4).
 *
 * Owner Decision A at `04-01`'s Task 2 gate chose `preset-set-a`: four pills
 * plus a custom `#RRGGBB` entry. The list is the owner's; the floor is this
 * file's, and the plan is explicit that the executor refuses any preset below
 * it rather than shipping the owner's hex unmeasured.
 */

/**
 * A literal, deliberately. A count written as a product of two lengths is
 * satisfied by zero rows, and this repository has already shipped that defect.
 * Adding a preset must force this number to move.
 */
const EXPECTED_WATER_PRESET_COUNT = 4;

function luminanceOf(hex: string): number {
  const rgb = parseHexColor(hex);
  if (rgb === null) {
    throw new Error(`"${hex}" is not a hex colour.`);
  }
  return relativeLuminance(rgb);
}

describe('WATER_PRESETS', (): void => {
  it('ships exactly the set the owner named', (): void => {
    expect(
      WATER_PRESETS,
      'the preset list is an OWNER decision (OPEN QUESTION 1). Adding or ' +
        'removing one is not an implementation detail.',
    ).toHaveLength(EXPECTED_WATER_PRESET_COUNT);

    expect(WATER_PRESETS.map((preset): string => preset.name)).toStrictEqual([
      'White',
      'Warm paper',
      'Cool tint',
      'Soft grey',
    ]);
  });

  it('clears the composition-ink luminance floor, once per preset', (): void => {
    let checked = 0;

    WATER_PRESETS.forEach((preset): void => {
      const luminance = luminanceOf(preset.value);

      expect(
        luminance,
        `"${preset.name}" (${preset.value}) measures ${luminance.toFixed(6)}, ` +
          `below the ${MIN_COMPOSITION_SURFACE_LUMINANCE} floor. The single ` +
          `composition ink ${COMPOSITION_INK_COLOR} would stop clearing ` +
          'WCAG AA 4.5:1 on it.',
      ).toBeGreaterThanOrEqual(MIN_COMPOSITION_SURFACE_LUMINANCE);

      // The floor is a proxy; this is the property it stands for.
      expect(
        contrastRatio(COMPOSITION_INK_COLOR, preset.value),
        `"${preset.name}" fails AA against the composition ink.`,
      ).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);

      checked += 1;
    });

    expect(
      checked,
      'a per-preset loop that ran zero times passes every assertion inside ' +
        'it. This is the count that stops that.',
    ).toBe(EXPECTED_WATER_PRESET_COUNT);
  });

  it('spells every value in canonical uppercase #RRGGBB', (): void => {
    WATER_PRESETS.forEach((preset): void => {
      expect(
        preset.value,
        `"${preset.name}" is not canonical uppercase. normalizeColor returns ` +
          'that form and the legend dedupes on it, so a lowercase entry ' +
          'round-trips into a second distinct colour.',
      ).toMatch(/^#[0-9A-F]{6}$/u);
    });
  });

  it('has no duplicate values', (): void => {
    const values = WATER_PRESETS.map((preset): string => preset.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('rejects the candidates the floor is there to exclude', (): void => {
    // The discrimination control. Without it, a floor of 0 would pass the gate
    // above just as happily as the real one.
    const steelBlue = '#4682B4';
    expect(luminanceOf(steelBlue)).toBeLessThan(
      MIN_COMPOSITION_SURFACE_LUMINANCE,
    );
    expect(
      WATER_PRESETS.some((preset): boolean => preset.value === steelBlue),
      '#4682B4 measures 0.2056 and fails the floor. It must never be a ' +
        'shipped preset (04-UI-SPEC.md § 6.4).',
    ).toBe(false);
  });
});

describe('DEFAULT_SURFACE_COLOR', (): void => {
  it('is a member of the shipped preset set', (): void => {
    expect(
      WATER_PRESETS.some(
        (preset): boolean => preset.value === DEFAULT_SURFACE_COLOR,
      ),
      'the default must be reachable as a pill, or a creator who changes the ' +
        'water can never get back to it except through Reset Map Style.',
    ).toBe(true);
  });

  it('is the owner reference white, and seeds the default settings', (): void => {
    expect(DEFAULT_SURFACE_COLOR).toBe('#FFFFFF');
    expect(DEFAULT_COMPOSITION_SETTINGS.surfaceColor).toBe(
      DEFAULT_SURFACE_COLOR,
    );
    // CD-6: the V2 opacity field stays pinned white. Colour rides on
    // `surfaceColor`; the three white export layers still guarantee opacity.
    expect(DEFAULT_COMPOSITION_SETTINGS.backgroundColor).toBe('#FFFFFF');
  });

  it('keeps its colour literals out of the components', (): void => {
    expect(CUSTOM_SURFACE_COLOR_PLACEHOLDER).toBe('#RRGGBB');
  });
});

/* ------------------------------------------------------------------ *
 * 04-08 - the named stroke-weight vocabulary (D4-08)
 * ------------------------------------------------------------------ */

/**
 * A LITERAL, for the same reason `EXPECTED_WATER_PRESET_COUNT` is one. Writing
 * `STROKE_WEIGHTS.size` here would make the table its own expectation, and
 * emptying the table would leave the count "correct" at zero.
 */
const EXPECTED_STROKE_WEIGHT_COUNT = 5;

describe('the stroke-weight vocabulary', (): void => {
  it('is exactly five named steps', (): void => {
    expect(STROKE_WEIGHTS.size).toBe(EXPECTED_STROKE_WEIGHT_COUNT);
    expect([...STROKE_WEIGHTS]).toStrictEqual([
      'none',
      'hairline',
      'thin',
      'medium',
      'bold',
    ]);
    expect(Object.keys(STROKE_WEIGHT_UNITS)).toHaveLength(
      EXPECTED_STROKE_WEIGHT_COUNT,
    );
    expect(STROKE_WEIGHT_ORDER).toHaveLength(EXPECTED_STROKE_WEIGHT_COUNT);
  });

  it('maps each step to its user-unit width', (): void => {
    expect(STROKE_WEIGHT_UNITS).toStrictEqual({
      none: 0,
      hairline: 0.5,
      thin: 0.75,
      medium: 1.25,
      bold: 2,
    });
  });

  it('makes `thin` exactly the pre-04-08 export border width', (): void => {
    // Imported, never retyped: this is the assertion that keeps `thin` the
    // no-visual-change step rather than a number that merely looks familiar.
    expect(strokeWidthFor('thin')).toBe(Number(EXPORT_BORDER_WIDTH));
  });

  it('increases strictly from none to bold, with no repeated width', (): void => {
    const widths = STROKE_WEIGHT_ORDER.map((weight): number =>
      strokeWidthFor(weight),
    );
    expect(widths).toHaveLength(EXPECTED_STROKE_WEIGHT_COUNT);
    expect(new Set(widths).size).toBe(EXPECTED_STROKE_WEIGHT_COUNT);
    widths.forEach((width, index): void => {
      if (index === 0) {
        return;
      }
      const previous = widths[index - 1];
      expect(
        width,
        `${STROKE_WEIGHT_ORDER[index]} (${width}) is not heavier than ` +
          `${STROKE_WEIGHT_ORDER[index - 1]} (${previous}). Two steps that ` +
          'rasterise the same are two pills a creator cannot tell apart.',
      ).toBeGreaterThan(previous ?? Number.NaN);
    });
  });

  /**
   * `none` OMITS the stroke; it is not a width of zero. The renderer decides
   * that through `hasStroke`, and this asserts the DECISION FUNCTION rather
   * than the number — a caller that re-derives it from `=== 0` would keep
   * writing `stroke-width="0"` into the clone, and the export gate that asserts
   * absence would then be asserting the wrong thing.
   */
  it('signals omit-the-stroke for `none` through the renderer decision', (): void => {
    expect(hasStroke('none')).toBe(false);
    expect(strokeWidthFor('none')).toBe(0);

    STROKE_WEIGHT_ORDER.filter(
      (weight): boolean => weight !== 'none',
    ).forEach((weight): void => {
      expect(hasStroke(weight), `${weight} must render a stroke`).toBe(true);
      expect(strokeWidthFor(weight)).toBeGreaterThan(0);
    });
  });

  it('labels every step byte-exactly as 04-UI-SPEC.md section 9 spells it', (): void => {
    expect(
      STROKE_WEIGHT_ORDER.map(
        (weight): string => STROKE_WEIGHT_LABELS[weight],
      ),
    ).toStrictEqual(['None', 'Hairline', 'Thin', 'Medium', 'Bold']);
  });

  it('draws its pills lightest-first and covers the whole vocabulary', (): void => {
    expect(new Set(STROKE_WEIGHT_ORDER).size).toBe(STROKE_WEIGHTS.size);
    STROKE_WEIGHT_ORDER.forEach((weight: StrokeWeight): void => {
      expect(STROKE_WEIGHTS.has(weight)).toBe(true);
    });
  });
});

describe('the Map style defaults', (): void => {
  it('leaves no control un-set', (): void => {
    expect(DEFAULT_COMPOSITION_SETTINGS.surfaceColor).toBe('#FFFFFF');
    expect(DEFAULT_COMPOSITION_SETTINGS.uncoloredFill).toBe('#E5E7EB');
    expect(DEFAULT_COMPOSITION_SETTINGS.borderColor).toBe('#000000');
    expect(DEFAULT_COMPOSITION_SETTINGS.interiorWeight).toBe('thin');
    // U-3: the phase goal is "outlines all but disappear against water".
    expect(DEFAULT_COMPOSITION_SETTINGS.coastlineWeight).toBe('none');
  });

  it('seeds those defaults from the named constants, not from copies', (): void => {
    expect(DEFAULT_COMPOSITION_SETTINGS.uncoloredFill).toBe(
      DEFAULT_UNCOLORED_FILL,
    );
    expect(DEFAULT_COMPOSITION_SETTINGS.interiorWeight).toBe(
      DEFAULT_INTERIOR_WEIGHT,
    );
    expect(DEFAULT_COMPOSITION_SETTINGS.coastlineWeight).toBe(
      DEFAULT_COASTLINE_WEIGHT,
    );
  });

  it('offers the default uncoloured fill as a reachable pill', (): void => {
    expect(
      UNCOLORED_FILL_PRESETS.some(
        (preset): boolean => preset.value === DEFAULT_UNCOLORED_FILL,
      ),
      'a creator who changes the uncoloured fill can otherwise never get back ' +
        'to the default except through Reset Map Style.',
    ).toBe(true);
    expect(
      BORDER_COLOR_PRESETS.some(
        (preset): boolean =>
          preset.value === DEFAULT_COMPOSITION_SETTINGS.borderColor,
      ),
    ).toBe(true);
  });

  it('spells every new preset in canonical uppercase #RRGGBB', (): void => {
    [...UNCOLORED_FILL_PRESETS, ...BORDER_COLOR_PRESETS].forEach(
      (preset): void => {
        expect(preset.value, `"${preset.name}" is not canonical`).toMatch(
          /^#[0-9A-F]{6}$/u,
        );
      },
    );
  });

  /**
   * D4-09's whole reason for existing: with white water and coastlines at
   * `none`, a white country vanishes. A `#FFFFFF` preset would ship exactly
   * that as a one-click option.
   */
  it('ships no white uncoloured-fill preset', (): void => {
    expect(
      UNCOLORED_FILL_PRESETS.some(
        (preset): boolean => preset.value === DEFAULT_SURFACE_COLOR,
      ),
    ).toBe(false);
  });
});
