import { describe, expect, it } from 'vitest';

import {
  COMPOSITION_INK_COLOR,
  COMPOSITION_PAPER_COLOR,
  MIN_COMPOSITION_SURFACE_LUMINANCE,
  WCAG_AA_BODY_RATIO,
  contrastRatio,
  labelInkForShade,
  parseHexColor,
  relativeLuminance,
} from './contrast';
import { RAMPS } from './ramps';

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

/* ------------------------------------------------------------------ *
 * `labelInkForShade` - `04-07`, the check glyph on a selected ramp step
 * ------------------------------------------------------------------ */

describe('labelInkForShade', (): void => {
  /**
   * **One function decides the renderer's ink AND the ramp gate's expectation.**
   *
   * `ramps.test.ts` Gate 3 used to inline `Math.max(onPaper, onInk)`, which
   * rates a hypothetical best case rather than the choice the strip actually
   * makes. Two expressions of the same rule is the drift the
   * `LEGEND_CHARACTERS_PER_LINE` / `LABEL_CHARACTERS_PER_LINE` split already
   * cost this project once; the gate now calls this.
   */
  it('picks whichever of paper and ink measures higher against the shade', (): void => {
    expect(labelInkForShade('#08519C')).toBe(COMPOSITION_PAPER_COLOR);
    expect(labelInkForShade('#EFF3FF')).toBe(COMPOSITION_INK_COLOR);
    expect(labelInkForShade('#000000')).toBe(COMPOSITION_PAPER_COLOR);
    expect(labelInkForShade('#FFFFFF')).toBe(COMPOSITION_INK_COLOR);
  });

  /**
   * Asserted as a RELATIONSHIP, not as a table of expected answers: a table
   * would have to be kept in step with the palette by hand, and a stale row
   * would read as proof.
   */
  it('never returns the losing colour, for every shade in every ramp', (): void => {
    let ratedShades = 0;

    for (const ramp of RAMPS) {
      for (const shade of ramp.shades) {
        const chosen = labelInkForShade(shade);
        const rejected =
          chosen === COMPOSITION_PAPER_COLOR
            ? COMPOSITION_INK_COLOR
            : COMPOSITION_PAPER_COLOR;

        expect(
          [COMPOSITION_PAPER_COLOR, COMPOSITION_INK_COLOR],
          `ramp "${ramp.id}" shade ${shade} got label ink "${chosen}", which is neither of the two label colours`,
        ).toContain(chosen);
        expect(
          contrastRatio(chosen, shade),
          `ramp "${ramp.id}" shade ${shade}: the renderer picked ${chosen} over ${rejected}, but ${rejected} measures higher`,
        ).toBeGreaterThanOrEqual(contrastRatio(rejected, shade));
        expect(
          contrastRatio(chosen, shade),
          `ramp "${ramp.id}" shade ${shade}: the chosen label ink misses AA`,
        ).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);

        ratedShades += 1;
      }
    }

    // The literal 25, never `RAMPS.length * RAMP_STEP_COUNT` - a product of two
    // `.length` reads is satisfied by zero rows.
    expect(ratedShades).toBe(25);
  });

  /**
   * **It takes only a shade, so the same shade cannot get two answers.** The
   * check glyph on a selected ramp segment must be identical in light and dark
   * mode, and this is what makes that true BY CONSTRUCTION rather than by a
   * rule someone has to remember: there is no theme parameter to pass.
   *
   * A per-mode signature is the shape that would let a `.dark` override creep
   * in later, so the arity is asserted rather than described.
   */
  it('is a pure function of the shade, with nowhere to put a theme', (): void => {
    expect(labelInkForShade).toHaveLength(1);
    expect(labelInkForShade('#6BAED6')).toBe(labelInkForShade('#6BAED6'));
  });

  /**
   * The dead band `04-02` measured: between these two luminances NEITHER label
   * colour clears AA. `labelInkForShade` still returns the better of the two -
   * it is a chooser, not a validator - so a shade inside the band is caught by
   * the gate above rather than silently rated legible here.
   */
  it('still returns the better colour inside the dead luminance band', (): void => {
    const inBand = '#3182BD';
    const luminance = luminanceOf(inBand);

    expect(luminance).toBeGreaterThan(0.183333);
    expect(luminance).toBeLessThan(MIN_COMPOSITION_SURFACE_LUMINANCE);
    expect(labelInkForShade(inBand)).toBe(COMPOSITION_INK_COLOR);
    expect(contrastRatio(labelInkForShade(inBand), inBand)).toBeLessThan(
      WCAG_AA_BODY_RATIO,
    );
  });
});
