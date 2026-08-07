import { describe, expect, it } from 'vitest';

import type { Ramp, RampId } from './ramps';
import {
  RAMPS,
  RAMP_IDS,
  RAMP_STEP_COUNT,
  shadeForIndex,
  shadeForValue,
} from './ramps';

/**
 * The canonical form `normalizeColor` returns and `getCanonicalActiveColors` /
 * `normalizeLegendEntries` compare on. A lowercase shade would dedupe as a
 * SECOND legend entry rather than matching the first.
 */
const CANONICAL_HEX_PATTERN = /^#[0-9A-F]{6}$/u;

/**
 * Literals, never `RAMPS.length * RAMP_STEP_COUNT`. A count written as a
 * product of two `.length` reads is green at zero rows, which is one of the
 * gate shapes this repository has already shipped.
 */
const EXPECTED_RAMP_COUNT = 5;
const EXPECTED_SHADES_PER_RAMP = 5;

function rampById(id: RampId): Ramp {
  const ramp = RAMPS.find((candidate): boolean => candidate.id === id);
  if (ramp === undefined) {
    throw new Error(`RAMPS has no ramp with id "${id}".`);
  }
  return ramp;
}

describe('the ramp table', (): void => {
  it('holds exactly five ramps of exactly five shades each', (): void => {
    expect(RAMPS.length).toBe(EXPECTED_RAMP_COUNT);
    expect(RAMP_STEP_COUNT).toBe(EXPECTED_SHADES_PER_RAMP);

    for (const ramp of RAMPS) {
      expect(
        ramp.shades.length,
        `ramp "${ramp.id}" carries ${String(ramp.shades.length)} shades`,
      ).toBe(EXPECTED_SHADES_PER_RAMP);
    }
  });

  it('declares its vocabulary once, and the table matches it exactly', (): void => {
    expect(RAMP_IDS.size).toBe(EXPECTED_RAMP_COUNT);

    for (const ramp of RAMPS) {
      expect(
        RAMP_IDS.has(ramp.id),
        `ramp "${ramp.id}" is in RAMPS but missing from RAMP_IDS`,
      ).toBe(true);
    }

    expect(new Set(RAMPS.map((ramp): RampId => ramp.id)).size).toBe(
      EXPECTED_RAMP_COUNT,
    );
  });

  it('names every ramp with a creator-facing label', (): void => {
    for (const ramp of RAMPS) {
      expect(ramp.name.trim().length, `ramp "${ramp.id}" has no name`).
        toBeGreaterThan(0);
    }
  });

  it('writes every shade in canonical uppercase #RRGGBB', (): void => {
    let assertedShades = 0;

    for (const ramp of RAMPS) {
      for (const shade of ramp.shades) {
        expect(
          shade,
          `ramp "${ramp.id}" carries a non-canonical shade "${shade}"`,
        ).toMatch(CANONICAL_HEX_PATTERN);
        assertedShades += 1;
      }
    }

    expect(assertedShades).toBe(25);
  });

  it('is frozen, so no caller can mutate the shared table', (): void => {
    expect(Object.isFrozen(RAMPS)).toBe(true);

    for (const ramp of RAMPS) {
      expect(Object.isFrozen(ramp), `ramp "${ramp.id}" is not frozen`).toBe(
        true,
      );
      expect(
        Object.isFrozen(ramp.shades),
        `ramp "${ramp.id}"'s shades are not frozen`,
      ).toBe(true);
    }
  });
});

describe('shadeForIndex', (): void => {
  it('picks the lightest shade at step 0 and the darkest at the last step', (): void => {
    for (const ramp of RAMPS) {
      expect(shadeForIndex(ramp, 0, RAMP_STEP_COUNT)).toBe(ramp.shades[0]);
      expect(shadeForIndex(ramp, 4, RAMP_STEP_COUNT)).toBe(ramp.shades[4]);
    }
  });

  it('walks the ramp in declared order at the ramp’s own step count', (): void => {
    const blues = rampById('blues');

    for (let index = 0; index < RAMP_STEP_COUNT; index += 1) {
      expect(shadeForIndex(blues, index, RAMP_STEP_COUNT)).toBe(
        blues.shades[index],
      );
    }
  });

  it('maps a coarser class count onto the ramp’s own steps', (): void => {
    const greys = rampById('greys');

    expect(shadeForIndex(greys, 0, 3)).toBe(greys.shades[0]);
    expect(shadeForIndex(greys, 1, 3)).toBe(greys.shades[2]);
    expect(shadeForIndex(greys, 2, 3)).toBe(greys.shades[4]);
  });

  it('clamps an out-of-range index to the ends rather than returning undefined', (): void => {
    const reds = rampById('reds');

    expect(shadeForIndex(reds, -7, RAMP_STEP_COUNT)).toBe(reds.shades[0]);
    expect(shadeForIndex(reds, 99, RAMP_STEP_COUNT)).toBe(reds.shades[4]);
  });

  it('rejects a non-finite index or an unusable class count', (): void => {
    const greens = rampById('greens');

    expect((): string => shadeForIndex(greens, Number.NaN, 5)).toThrow();
    expect((): string =>
      shadeForIndex(greens, Number.POSITIVE_INFINITY, 5),
    ).toThrow();
    expect((): string => shadeForIndex(greens, 0, 0)).toThrow();
    expect((): string => shadeForIndex(greens, 0, 2.5)).toThrow();
  });
});

describe('shadeForValue', (): void => {
  it('is order-preserving across its domain', (): void => {
    for (const ramp of RAMPS) {
      expect(shadeForValue(ramp, 0)).toBe(ramp.shades[0]);
      expect(shadeForValue(ramp, 1)).toBe(ramp.shades[4]);
      expect(shadeForValue(ramp, 0.5)).toBe(ramp.shades[2]);
    }
  });

  it('snaps t to the NEAREST step, not the floor', (): void => {
    for (const ramp of RAMPS) {
      expect(
        shadeForValue(ramp, 0.49),
        `ramp "${ramp.id}" floored 0.49 instead of snapping to the nearest step`,
      ).toBe(ramp.shades[2]);
      expect(
        shadeForValue(ramp, 0.51),
        `ramp "${ramp.id}" did not snap 0.51 to the nearest step`,
      ).toBe(ramp.shades[2]);
    }
  });

  it('honours the owner’s proportional-shading framing', (): void => {
    const blues = rampById('blues');

    // "if Poland is 100% for something and Lithuania gets entered as 50% ...
    // it needs to understand that Lithuanias shade is half of what polands
    // should be" (04-CONTEXT.md D4-03).
    expect(shadeForValue(blues, 1)).toBe(blues.shades[4]);
    expect(shadeForValue(blues, 0.5)).toBe(blues.shades[2]);
    expect(shadeForValue(blues, 0.25)).toBe(blues.shades[1]);
    expect(shadeForValue(blues, 0.75)).toBe(blues.shades[3]);
  });

  it('clamps t outside [0, 1] to the ends', (): void => {
    const purples = rampById('purples');

    expect(shadeForValue(purples, -3)).toBe(purples.shades[0]);
    expect(shadeForValue(purples, 4.2)).toBe(purples.shades[4]);
  });

  it('rejects a non-finite t rather than reading out of bounds', (): void => {
    const greys = rampById('greys');

    expect((): string => shadeForValue(greys, Number.NaN)).toThrow();
    expect((): string =>
      shadeForValue(greys, Number.POSITIVE_INFINITY),
    ).toThrow();
    expect((): string =>
      shadeForValue(greys, Number.NEGATIVE_INFINITY),
    ).toThrow();
  });
});
