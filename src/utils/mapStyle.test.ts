import { describe, expect, it } from 'vitest';

import {
  CUSTOM_SURFACE_COLOR_PLACEHOLDER,
  DEFAULT_COMPOSITION_SETTINGS,
  DEFAULT_SURFACE_COLOR,
  WATER_PRESETS,
} from '../constants/mapStyle';
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
