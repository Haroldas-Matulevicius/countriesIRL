import { describe, expect, it } from 'vitest';

import { MAP_VIEWBOX_SIZE } from '../constants/config';
import { DEFAULT_SURFACE_COLOR } from '../constants/mapStyle';
import {
  BAND_DEFAULT_HEIGHT,
  BAND_FALLBACK_STOP_COLOR,
  BAND_KEYBOARD_STEP,
  BAND_MAX_HEIGHT,
  bandGradientStops,
  clampBandHeight,
  resolveBandExtents,
} from './bands';

/*
 * Every expected value below is a LITERAL, never an expression that recomputes
 * the thing under test. A clamp asserted against `Math.min(x, BAND_MAX_HEIGHT)`
 * is the self-comparing gate this repository has already shipped once: it
 * passes against its own implementation no matter what the implementation
 * does. The module writes the DERIVATION (`MAP_VIEWBOX_SIZE / 7`), the test
 * writes the NUMBER, and the two disagreeing is the signal.
 */

describe('band geometry constants', (): void => {
  it('caps a band at one seventh of the square', (): void => {
    expect(BAND_MAX_HEIGHT).toBe(154);
  });

  it('defaults a band to one ninth of the square', (): void => {
    expect(BAND_DEFAULT_HEIGHT).toBe(120);
  });

  it('moves a band by eight units per arrow press (A7)', (): void => {
    expect(BAND_KEYBOARD_STEP).toBe(8);
  });

  /*
   * The cap and the default are DERIVED from the viewBox, so moving the
   * viewBox must move them. Asserting the two literals above alone would stay
   * green against a module that hard-coded 154 and 120 and never read
   * `MAP_VIEWBOX_SIZE` at all.
   */
  it('derives both from the viewBox rather than from a pasted 1080', (): void => {
    expect(BAND_MAX_HEIGHT * 7).toBeLessThanOrEqual(MAP_VIEWBOX_SIZE);
    expect((BAND_MAX_HEIGHT + 1) * 7).toBeGreaterThan(MAP_VIEWBOX_SIZE);
    expect(BAND_DEFAULT_HEIGHT * 9).toBe(MAP_VIEWBOX_SIZE);
  });

  /*
   * `bands.ts` declares its own fallback stop colour rather than importing
   * `DEFAULT_SURFACE_COLOR`, because `constants/mapStyle.ts` imports
   * `BAND_DEFAULT_HEIGHT` from `bands.ts` and the reverse edge would be a
   * cycle. A TEST can import both without creating one, which turns the
   * duplicated literal into a CHECKED claim instead of a comment — the same
   * shape `04-09` used for `HOVERED_BORDER_COLOR` against its token.
   */
  it('keeps the fallback stop colour equal to the default surface colour', (): void => {
    expect(BAND_FALLBACK_STOP_COLOR).toBe(DEFAULT_SURFACE_COLOR);
  });
});

describe('clampBandHeight', (): void => {
  it('clamps a request for one fifth of the square down to the cap', (): void => {
    expect(clampBandHeight(MAP_VIEWBOX_SIZE / 5)).toBe(154);
  });

  it('leaves the default height untouched', (): void => {
    expect(clampBandHeight(120)).toBe(120);
  });

  it('accepts zero as a real height', (): void => {
    expect(clampBandHeight(0)).toBe(0);
  });

  it('floors a negative request at zero', (): void => {
    expect(clampBandHeight(-40)).toBe(0);
  });

  it('returns the default for a non-finite request', (): void => {
    expect(clampBandHeight(Number.NaN)).toBe(120);
    expect(clampBandHeight(Number.POSITIVE_INFINITY)).toBe(120);
    expect(clampBandHeight(Number.NEGATIVE_INFINITY)).toBe(120);
  });

  it('admits the cap itself', (): void => {
    expect(clampBandHeight(154)).toBe(154);
  });
});

describe('bandGradientStops', (): void => {
  it('fades the surface colour from fully opaque to fully transparent', (): void => {
    expect(bandGradientStops('#F5EFE6')).toStrictEqual([
      { offset: '0%', stopColor: '#F5EFE6', stopOpacity: 1 },
      { offset: '100%', stopColor: '#F5EFE6', stopOpacity: 0 },
    ]);
  });

  it('returns the canonical uppercase form in BOTH stops', (): void => {
    const stops = bandGradientStops('#f5efe6');

    expect(stops[0].stopColor).toBe('#F5EFE6');
    expect(stops[1].stopColor).toBe('#F5EFE6');
  });

  it('expands a short hex and accepts rgb, exactly as every other colour does', (): void => {
    expect(bandGradientStops('#fff')[0].stopColor).toBe('#FFFFFF');
    expect(bandGradientStops('rgb(245, 239, 230)')[0].stopColor).toBe(
      '#F5EFE6',
    );
  });

  /*
   * V5, the applicable ASVS chapter for this plan: the stop colour is written
   * into a serialised SVG attribute, so a value `normalizeColor` rejects must
   * never reach it. The reducer canonicalises first; this is the second line.
   */
  it('falls back rather than writing unparseable text into a gradient stop', (): void => {
    expect(bandGradientStops('javascript:alert(1)')[0].stopColor).toBe(
      '#FFFFFF',
    );
    expect(bandGradientStops('')[1].stopColor).toBe('#FFFFFF');
  });
});

describe('resolveBandExtents', (): void => {
  /*
   * The ONE reader of band visibility and height. `04-12`'s band-aware legend
   * inset consumes this rather than re-deriving `visible ? height : 0`, so the
   * legend and the drawn rect cannot disagree about where the band ends.
   */
  it('reports the shipped defaults: top band on, bottom band off', (): void => {
    expect(
      resolveBandExtents({
        topBandVisible: true,
        topBandHeight: 120,
        bottomBandVisible: false,
        bottomBandHeight: 120,
      }),
    ).toStrictEqual({ top: 120, bottom: 0 });
  });

  it('reports zero for a hidden band whatever its stored height', (): void => {
    expect(
      resolveBandExtents({
        topBandVisible: false,
        topBandHeight: 154,
        bottomBandVisible: true,
        bottomBandHeight: 96,
      }),
    ).toStrictEqual({ top: 0, bottom: 96 });
  });

  it('clamps through the same cap the drag handle obeys', (): void => {
    expect(
      resolveBandExtents({
        topBandVisible: true,
        topBandHeight: 400,
        bottomBandVisible: true,
        bottomBandHeight: -12,
      }),
    ).toStrictEqual({ top: 154, bottom: 0 });
  });
});
