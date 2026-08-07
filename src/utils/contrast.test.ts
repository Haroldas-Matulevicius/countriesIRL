import { describe, expect, it } from 'vitest';

import {
  COMPOSITION_INK_COLOR,
  MIN_COMPOSITION_SURFACE_LUMINANCE,
  WCAG_AA_BODY_RATIO,
  contrastRatio,
  parseHexColor,
  relativeLuminance,
} from './contrast';

/**
 * The floor recomputed from first principles, NOT restated from the module.
 * Comparing the shipped constant against a copy of itself would be the
 * self-comparing gate this project has already shipped once.
 */
function exactSurfaceLuminanceFloor(inkHex: string): number {
  const ink = parseHexColor(inkHex);
  if (ink === null) {
    throw new Error(`The composition ink "${inkHex}" is not a hex colour.`);
  }
  return WCAG_AA_BODY_RATIO * (relativeLuminance(ink) + 0.05) - 0.05;
}

function luminanceOf(hex: string): number {
  const rgb = parseHexColor(hex);
  if (rgb === null) {
    throw new Error(`"${hex}" is not a hex colour.`);
  }
  return relativeLuminance(rgb);
}

describe('parseHexColor', (): void => {
  it('parses six-digit and three-digit hex, case-insensitively', (): void => {
    expect(parseHexColor('#FFFFFF')).toStrictEqual([255, 255, 255]);
    expect(parseHexColor('#000000')).toStrictEqual([0, 0, 0]);
    expect(parseHexColor('#abc')).toStrictEqual([170, 187, 204]);
    expect(parseHexColor('  #4682b4  ')).toStrictEqual([70, 130, 180]);
  });

  it('returns null rather than throwing for a malformed string', (): void => {
    expect(
      parseHexColor('not-a-colour'),
      'a null return is what lets a caller decide whether a bad value is ' +
        'fatal; changing this to a throw breaks the token scan that uses it ' +
        'as a predicate.',
    ).toBeNull();
    expect(parseHexColor('#12345')).toBeNull();
    expect(parseHexColor('rgb(1, 2, 3)')).toBeNull();
    expect(parseHexColor('')).toBeNull();
  });
});

describe('contrastRatio', (): void => {
  it('rates black on white as exactly 21', (): void => {
    expect(
      Math.abs(contrastRatio('#000000', '#FFFFFF') - 21),
      'the WCAG maximum is 21:1 by definition; any drift here means the ' +
        'channel transfer function moved.',
    ).toBeLessThan(1e-9);
  });

  it('is symmetric and rates a mid-grey pair the WCAG way', (): void => {
    // #767676 on white is the canonical WCAG "smallest passing grey" example.
    const greyOnWhite = contrastRatio('#767676', '#FFFFFF');
    expect(greyOnWhite).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);
    expect(greyOnWhite).toBeLessThan(4.6);
    expect(
      contrastRatio('#FFFFFF', '#767676'),
      'order must not matter — the formula normalises lighter/darker.',
    ).toBeCloseTo(greyOnWhite, 12);
  });

  it('throws on the same string parseHexColor merely rejects', (): void => {
    expect(parseHexColor('nope')).toBeNull();
    expect(
      (): number => contrastRatio('nope', '#FFFFFF'),
      'the throw is the loud half of the split: a typo in a ramp hex or a ' +
        'preset hex must not be silently rated as black.',
    ).toThrow(/Contrast needs two hex colors/u);
    expect((): number => contrastRatio('#FFFFFF', 'nope')).toThrow();
  });
});

describe('MIN_COMPOSITION_SURFACE_LUMINANCE', (): void => {
  it('is the floor the composition ink actually requires, re-derived', (): void => {
    const exact = exactSurfaceLuminanceFloor(COMPOSITION_INK_COLOR);

    expect(
      MIN_COMPOSITION_SURFACE_LUMINANCE,
      `the shipped floor must never be permissive: #111827 requires ` +
        `L >= ${exact}. 04-UI-SPEC.md § 4.2 rounds this DOWN to 0.216, which ` +
        'passes a surface measuring 4.4941:1. The constant rounds up instead.',
    ).toBeGreaterThanOrEqual(exact);

    expect(
      MIN_COMPOSITION_SURFACE_LUMINANCE,
      'nor gratuitously strict — it must stay within a rounding step of the ' +
        'exact requirement, or it starts excluding legal surfaces.',
    ).toBeLessThan(exact + 0.001);
  });

  it('guarantees the property it exists for: ink clears AA at the floor', (): void => {
    const ink = luminanceOf(COMPOSITION_INK_COLOR);
    const ratioAtFloor =
      (MIN_COMPOSITION_SURFACE_LUMINANCE + 0.05) / (ink + 0.05);

    expect(
      ratioAtFloor,
      'a surface sitting exactly on the floor must still clear 4.5:1 — this ' +
        'is the whole reason the constant exists.',
    ).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);
  });

  it('discriminates in the right direction at real colours', (): void => {
    // Measured, not estimated. Each pair is (luminance, ratio against the ink).
    const midGrey = luminanceOf('#808080');
    const steelBlue = luminanceOf('#4682B4');
    const lightBlue = luminanceOf('#ADD8E6');

    expect(midGrey).toBeLessThan(MIN_COMPOSITION_SURFACE_LUMINANCE);
    expect(contrastRatio(COMPOSITION_INK_COLOR, '#808080')).toBeLessThan(
      WCAG_AA_BODY_RATIO,
    );

    expect(
      steelBlue,
      '04-UI-SPEC.md § 4.2 names #4682B4 as the near-miss: 0.2056, below the ' +
        'floor by less than a first pass suggests.',
    ).toBeLessThan(MIN_COMPOSITION_SURFACE_LUMINANCE);
    expect(contrastRatio(COMPOSITION_INK_COLOR, '#4682B4')).toBeLessThan(
      WCAG_AA_BODY_RATIO,
    );

    expect(lightBlue).toBeGreaterThan(MIN_COMPOSITION_SURFACE_LUMINANCE);
    expect(
      contrastRatio(COMPOSITION_INK_COLOR, '#ADD8E6'),
    ).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);
  });

  it('would move if the ink moved — a second ink is not free', (): void => {
    expect(
      exactSurfaceLuminanceFloor('#4B5563'),
      'a secondary grey ink would raise the floor to ~0.575 and leave only ' +
        'near-white water legal. This is why the composition has one ink.',
    ).toBeGreaterThan(0.5);
  });
});
