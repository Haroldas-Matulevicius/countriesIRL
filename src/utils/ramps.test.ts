import { describe, expect, it } from 'vitest';

import {
  COMPOSITION_INK_COLOR,
  COMPOSITION_PAPER_COLOR,
  WCAG_AA_BODY_RATIO,
  contrastRatio,
  labelInkForShade,
  parseHexColor,
  relativeLuminance,
} from './contrast';
import type { Ramp, RampId } from './ramps';
import {
  RAMPS,
  RAMP_IDS,
  RAMP_STEP_COUNT,
  rampStepAccessibleName,
  rampStepPosition,
  rampStepReadout,
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
const EXPECTED_TOTAL_SHADES = 25;
const EXPECTED_ADJACENT_PAIRS = 20;

/**
 * The ONE luminance implementation, imported from `src/utils/contrast.ts`
 * (extracted by `04-01`). A second copy here is exactly the drift the
 * `LEGEND_CHARACTERS_PER_LINE` / `LABEL_CHARACTERS_PER_LINE` split already cost
 * this project. `parseHexColor` returns `null` on bad input and this helper
 * throws on it, so a typo in a shade is loud rather than silently rated black.
 */
function luminanceOf(hex: string): number {
  const rgb = parseHexColor(hex);
  if (rgb === null) {
    throw new Error(`"${hex}" is not a hex colour.`);
  }
  return relativeLuminance(rgb);
}

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

    expect(assertedShades).toBe(EXPECTED_TOTAL_SHADES);
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

/**
 * The five ramps Gate 1 writes out step by step. Enumerated rather than
 * looped: the plan requires each of the twenty comparisons to be individually
 * visible, and a loop bound that is off by one is green while covering four
 * steps instead of five. `covers every ramp id exactly once` below is what
 * keeps a sixth ramp from shipping unasserted.
 */
const MONOTONE_COVERED_IDS: ReadonlyArray<RampId> = [
  'blues',
  'reds',
  'greens',
  'purples',
  'greys',
];

/**
 * Not a formality. If `map` produced a shorter array, every comparison below
 * would read `undefined` and `toBeLessThan` would throw rather than fail —
 * which is the "probe that never runs the assertion" shape. Asserting the
 * mapped length against BOTH the ramp's own count and the literal 5 makes a
 * vacuous pass unrepresentable.
 */
function stepLuminances(ramp: Ramp): ReadonlyArray<number> {
  const luminances = ramp.shades.map(luminanceOf);
  expect(
    luminances.length,
    `ramp "${ramp.id}" mapped ${String(luminances.length)} luminances for ${String(ramp.shades.length)} shades`,
  ).toBe(ramp.shades.length);
  expect(luminances.length).toBe(EXPECTED_SHADES_PER_RAMP);
  return luminances;
}

function darkerThanPredecessor(ramp: Ramp, step: number): string {
  return `ramp "${ramp.id}" step ${String(step)} (${ramp.shades[step]}) is not strictly darker than step ${String(step - 1)} (${ramp.shades[step - 1]})`;
}

describe('Gate 1 — strictly monotone decreasing luminance, light to dark', (): void => {
  it('blues darkens at every one of its four transitions', (): void => {
    const ramp = rampById('blues');
    const steps = stepLuminances(ramp);

    expect(steps[1], darkerThanPredecessor(ramp, 1)).toBeLessThan(steps[0]);
    expect(steps[2], darkerThanPredecessor(ramp, 2)).toBeLessThan(steps[1]);
    expect(steps[3], darkerThanPredecessor(ramp, 3)).toBeLessThan(steps[2]);
    expect(steps[4], darkerThanPredecessor(ramp, 4)).toBeLessThan(steps[3]);
  });

  it('reds darkens at every one of its four transitions', (): void => {
    const ramp = rampById('reds');
    const steps = stepLuminances(ramp);

    expect(steps[1], darkerThanPredecessor(ramp, 1)).toBeLessThan(steps[0]);
    expect(steps[2], darkerThanPredecessor(ramp, 2)).toBeLessThan(steps[1]);
    expect(steps[3], darkerThanPredecessor(ramp, 3)).toBeLessThan(steps[2]);
    expect(steps[4], darkerThanPredecessor(ramp, 4)).toBeLessThan(steps[3]);
  });

  it('greens darkens at every one of its four transitions', (): void => {
    const ramp = rampById('greens');
    const steps = stepLuminances(ramp);

    expect(steps[1], darkerThanPredecessor(ramp, 1)).toBeLessThan(steps[0]);
    expect(steps[2], darkerThanPredecessor(ramp, 2)).toBeLessThan(steps[1]);
    expect(steps[3], darkerThanPredecessor(ramp, 3)).toBeLessThan(steps[2]);
    expect(steps[4], darkerThanPredecessor(ramp, 4)).toBeLessThan(steps[3]);
  });

  it('purples darkens at every one of its four transitions', (): void => {
    const ramp = rampById('purples');
    const steps = stepLuminances(ramp);

    expect(steps[1], darkerThanPredecessor(ramp, 1)).toBeLessThan(steps[0]);
    expect(steps[2], darkerThanPredecessor(ramp, 2)).toBeLessThan(steps[1]);
    expect(steps[3], darkerThanPredecessor(ramp, 3)).toBeLessThan(steps[2]);
    expect(steps[4], darkerThanPredecessor(ramp, 4)).toBeLessThan(steps[3]);
  });

  it('greys darkens at every one of its four transitions', (): void => {
    const ramp = rampById('greys');
    const steps = stepLuminances(ramp);

    expect(steps[1], darkerThanPredecessor(ramp, 1)).toBeLessThan(steps[0]);
    expect(steps[2], darkerThanPredecessor(ramp, 2)).toBeLessThan(steps[1]);
    expect(steps[3], darkerThanPredecessor(ramp, 3)).toBeLessThan(steps[2]);
    expect(steps[4], darkerThanPredecessor(ramp, 4)).toBeLessThan(steps[3]);
  });

  it('covers every ramp id exactly once', (): void => {
    expect(MONOTONE_COVERED_IDS.length).toBe(EXPECTED_RAMP_COUNT);
    expect(new Set(MONOTONE_COVERED_IDS)).toStrictEqual(RAMP_IDS);
  });
});

describe('Gate 2 — globally disjoint shade sets', (): void => {
  it('no hex appears in two ramps', (): void => {
    const owners = new Map<string, RampId>();
    const collisions: string[] = [];
    let collectedShades = 0;

    for (const ramp of RAMPS) {
      for (const shade of ramp.shades) {
        collectedShades += 1;
        const owner = owners.get(shade);
        if (owner === undefined) {
          owners.set(shade, ramp.id);
        } else {
          collisions.push(`${shade} appears in "${owner}" and in "${ramp.id}"`);
        }
      }
    }

    // The literal 25, never `RAMPS.length * RAMP_STEP_COUNT` — a product of
    // two `.length` reads is satisfied by zero rows.
    expect(collectedShades).toBe(EXPECTED_TOTAL_SHADES);
    expect(collisions.join('; ')).toBe('');
    expect(
      owners.size,
      `the ramp table holds ${String(owners.size)} distinct hexes, not 25 — a duplicate would collapse two ramps' legend entries in normalizeLegendEntries`,
    ).toBe(EXPECTED_TOTAL_SHADES);
  });
});

describe('Gate 3 — every shade carries a readable label', (): void => {
  /**
   * **Repointed by `04-07` at `labelInkForShade`, which is the function the
   * strip's check glyph actually calls.**
   *
   * It used to inline `Math.max(onPaper, onInk)`. That rates a HYPOTHETICAL
   * best case: it would stay green if the renderer picked the other colour,
   * because the max is a property of the shade rather than of the choice. One
   * function decides both sides now, so the gate asserts the renderer's real
   * pick.
   */
  it('clears 4.5:1 against whichever of paper / ink the strip actually picks', (): void => {
    let assertedShades = 0;

    for (const ramp of RAMPS) {
      for (const shade of ramp.shades) {
        const onPaper = contrastRatio(shade, COMPOSITION_PAPER_COLOR);
        const onInk = contrastRatio(shade, COMPOSITION_INK_COLOR);

        expect(
          contrastRatio(labelInkForShade(shade), shade),
          `ramp "${ramp.id}" shade ${shade} measures ${onPaper.toFixed(4)}:1 on ${COMPOSITION_PAPER_COLOR} and ${onInk.toFixed(4)}:1 on ${COMPOSITION_INK_COLOR}; the label the strip would draw is not readable on it`,
        ).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);
        assertedShades += 1;
      }
    }

    expect(assertedShades).toBe(EXPECTED_TOTAL_SHADES);
  });
});

/* ------------------------------------------------------------------ *
 * `04-07` — the ramp strip's pure vocabulary
 *
 * Vitest runs on `node` with NO DOM, so the strip's rendering is Playwright's
 * job. What CAN be gated here is everything the strip is made of: the position
 * a segment writes, the accessible name it carries, and the readout under it.
 * They live in `ramps.ts` because it is the ONE home for the ramp vocabulary -
 * putting them beside the component would make them untestable in this runner
 * and would invite a second, drifting copy of the `Step i of n` format.
 * ------------------------------------------------------------------ */

describe('rampStepPosition', (): void => {
  /**
   * **The round trip is the whole contract.** A creator clicks segment `i` and
   * the country stores `{rampId, t}`; if `shadeForValue` does not snap that `t`
   * back to segment `i`, the strip highlights one shade and the map paints
   * another. Asserted against `shadeForValue` itself rather than against a
   * table of expected positions, so the two cannot drift apart.
   */
  it('round-trips every step through shadeForValue for every ramp', (): void => {
    let checked = 0;

    for (const ramp of RAMPS) {
      for (let step = 1; step <= RAMP_STEP_COUNT; step += 1) {
        const position = rampStepPosition(step, RAMP_STEP_COUNT);

        expect(position).toBeGreaterThanOrEqual(0);
        expect(position).toBeLessThanOrEqual(1);
        expect(
          shadeForValue(ramp, position),
          `ramp "${ramp.id}" step ${String(step)} resolves to the wrong shade`,
        ).toBe(ramp.shades[step - 1]);
        checked += 1;
      }
    }

    expect(checked).toBe(EXPECTED_TOTAL_SHADES);
  });

  it('pins the ends, so step 1 is the lightest and step n the darkest', (): void => {
    expect(rampStepPosition(1, RAMP_STEP_COUNT)).toBe(0);
    expect(rampStepPosition(RAMP_STEP_COUNT, RAMP_STEP_COUNT)).toBe(1);
  });

  /**
   * A single-class strip carries the whole ramp and takes the DARKEST shade -
   * the same choice `shadeForIndex` makes, and for the same reason: the
   * lightest is near-white and would be invisible against the uncolored fill.
   */
  it('gives a one-step strip the darkest shade', (): void => {
    expect(rampStepPosition(1, 1)).toBe(1);
  });

  it('throws on a step outside the strip rather than resolving to an end', (): void => {
    expect((): number => rampStepPosition(0, RAMP_STEP_COUNT)).toThrow();
    expect((): number =>
      rampStepPosition(RAMP_STEP_COUNT + 1, RAMP_STEP_COUNT),
    ).toThrow();
    expect((): number => rampStepPosition(1.5, RAMP_STEP_COUNT)).toThrow();
  });
});

describe('rampStepAccessibleName and rampStepReadout', (): void => {
  /**
   * Byte-exact against `04-UI-SPEC.md § 9`. The separator is U+00B7 MIDDLE DOT,
   * written as an escape here so a copy-paste through an editor that
   * normalises punctuation fails this assertion instead of shipping a
   * different glyph into every screen reader.
   */
  it('formats both strings exactly as the copy contract specifies', (): void => {
    expect(rampStepAccessibleName('Blues', 3, 5)).toBe(
      'Apply Blues shade 3 of 5',
    );
    expect(rampStepReadout(3, 5, '#6BAED6')).toBe(
      `Step 3 of 5 \u00b7 #6BAED6`,
    );
  });

  it('canonicalises the readout hex to uppercase', (): void => {
    expect(rampStepReadout(1, 5, '#eff3ff')).toContain('#EFF3FF');
  });

  /**
   * Every shipped ramp, so a family whose name breaks the pattern - a trailing
   * space, a stray article - is caught by the gate rather than by a listener.
   */
  it('names every step of every shipped ramp', (): void => {
    let named = 0;

    for (const ramp of RAMPS) {
      for (let step = 1; step <= RAMP_STEP_COUNT; step += 1) {
        expect(rampStepAccessibleName(ramp.name, step, RAMP_STEP_COUNT)).toBe(
          `Apply ${ramp.name} shade ${String(step)} of ${String(RAMP_STEP_COUNT)}`,
        );
        named += 1;
      }
    }

    expect(named).toBe(EXPECTED_TOTAL_SHADES);
  });
});

describe('adjacent-step separation — a MEASUREMENT, not a gate', (): void => {
  /**
   * Deliberately unthresholded (`04-UI-SPEC.md § 6.3.4` constraint 5). A
   * 5-step sequential ramp cannot hold 3:1 between every neighbour inside
   * sRGB for most hues, so a 3:1 gate would be red on arrival and would get
   * loosened rather than obeyed. Distinguishability is the legend's job. The
   * only assertion here is that a full table was produced — adding a floor
   * would turn a measurement into the very threshold the spec forbids.
   */
  it('records the full adjacent-pair contrast table', (): void => {
    const rows: string[] = [];
    let minimumRatio = Number.POSITIVE_INFINITY;
    let minimumLabel = '';

    for (const ramp of RAMPS) {
      for (let step = 1; step < ramp.shades.length; step += 1) {
        const ratio = contrastRatio(
          ramp.shades[step - 1],
          ramp.shades[step],
        );
        const label = `${ramp.id} ${String(step - 1)}->${String(step)} ${ramp.shades[step - 1]}/${ramp.shades[step]}`;
        rows.push(`${label} = ${ratio.toFixed(4)}:1`);
        if (ratio < minimumRatio) {
          minimumRatio = ratio;
          minimumLabel = label;
        }
      }
    }

    expect(rows.length).toBe(EXPECTED_ADJACENT_PAIRS);
    console.log(
      `adjacent-step contrast (MEASUREMENT, no threshold):\n  ${rows.join('\n  ')}\n  minimum = ${minimumRatio.toFixed(4)}:1 at ${minimumLabel}`,
    );
  });
});
