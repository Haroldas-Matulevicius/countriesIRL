import { describe, expect, it } from 'vitest';

import { MAP_VIEWBOX_SIZE } from '../constants/config';
import {
  ATTRIBUTION_FONT_SIZE,
  ATTRIBUTION_TEXT_FIT_MESSAGE,
  BODY_FONT_WEIGHT,
  COMPOSITION_TEXT_LINE_WIDTH,
  MAX_COMPOSITION_TEXT_LENGTH,
  SUBTITLE_FONT_SIZES,
  SUBTITLE_TEXT_FIT_MESSAGE,
  TEXT_SAFE_INSET,
  TITLE_FONT_SIZES,
  TITLE_FONT_WEIGHT,
  TITLE_TEXT_FIT_MESSAGE,
  WIDEST_CHARACTER_ADVANCE_EM,
  characterBoundFor,
  compositionTextFillRatio,
  compositionTextLength,
  compositionTextWidth,
  getCompositionTextBlockingMessage,
  hasCompositionText,
  isCompositionTextOverBound,
  resolveCompositionTextLines,
  sanitizeCompositionText,
} from './compositionText';
import {
  RESIDUAL_KERN_EM,
  WIDEST_KNOWN_ADVANCE_EM,
  advanceEmFor,
  kernEmFor,
  measureTextEm,
} from './interMetrics';
import { LEGEND_CHARACTERS_PER_LINE, LEGEND_SAFE_INSET } from './legend';

const MEDIUM_SIZES = { title: 'medium', subtitle: 'medium' } as const;

function contentOf(
  title: string,
  subtitle = '',
  attribution = '',
): { title: string; subtitle: string; attribution: string } {
  return { title, subtitle, attribution };
}

describe('characterBoundFor', (): void => {
  /*
   * The LITERALS from `04-UI-SPEC.md` section 4.2, asserted as literals. The
   * derivation is checked separately below, because a test that only recomputed
   * the formula would agree with any formula the module happened to hold - the
   * "gate asserting a constant the test imports" shape this phase keeps finding.
   */
  it('returns the tabulated title bounds', (): void => {
    expect(characterBoundFor('title', 'small')).toBe(27);
    expect(characterBoundFor('title', 'medium')).toBe(22);
    expect(characterBoundFor('title', 'large')).toBe(17);
  });

  it('returns the tabulated subtitle bounds', (): void => {
    expect(characterBoundFor('subtitle', 'small')).toBe(45);
    expect(characterBoundFor('subtitle', 'medium')).toBe(38);
    expect(characterBoundFor('subtitle', 'large')).toBe(31);
  });

  it('returns one attribution bound and ignores the size step', (): void => {
    expect(characterBoundFor('attribution')).toBe(49);
    expect(characterBoundFor('attribution', 'small')).toBe(49);
    expect(characterBoundFor('attribution', 'large')).toBe(49);
  });

  /**
   * The DERIVATION half. `1016` is computed from the viewBox and the inset
   * rather than pasted, so a module that hard-coded seven numbers and never
   * read either fails here while the literals above still pass.
   */
  it('derives every bound from the viewBox, the inset, and the recorded advance', (): void => {
    expect(TEXT_SAFE_INSET).toBe(LEGEND_SAFE_INSET);
    expect(COMPOSITION_TEXT_LINE_WIDTH).toBe(
      MAP_VIEWBOX_SIZE - 2 * TEXT_SAFE_INSET,
    );

    const expected = (fontSize: number): number =>
      Math.floor(
        (MAP_VIEWBOX_SIZE - 2 * LEGEND_SAFE_INSET) /
          (fontSize * WIDEST_CHARACTER_ADVANCE_EM),
      );

    (['small', 'medium', 'large'] as const).forEach((size): void => {
      expect(characterBoundFor('title', size)).toBe(
        expected(TITLE_FONT_SIZES[size]),
      );
      expect(characterBoundFor('subtitle', size)).toBe(
        expected(SUBTITLE_FONT_SIZES[size]),
      );
    });
    expect(characterBoundFor('attribution')).toBe(
      expected(ATTRIBUTION_FONT_SIZE),
    );
  });

  /**
   * **The recorded advance is LOAD-BEARING, and this is the assertion that can
   * fail on it.**
   *
   * A first draft tried to recover `1.0202` from `LEGEND_CHARACTERS_PER_LINE` -
   * and it went GREEN against a stub whose advance was `1`, because `floor()`
   * eats the difference at all three legend sizes (10 / 7 / 6 either way). It
   * was a gate that could not fail on its own subject, so it was replaced
   * rather than kept.
   *
   * This one names the difference instead: a naive 1.0-em advance would hand
   * the creator a title bound of 23 where the measurement gives 22. That is the
   * clipped-PNG defect `LEGEND_CHARACTERS_PER_LINE`'s own comment records, one
   * character wide.
   */
  it('uses the recorded 1.0202em advance, not a naive one-em assumption', (): void => {
    expect(WIDEST_CHARACTER_ADVANCE_EM).toBe(1.0202);

    const naive = Math.floor(
      (MAP_VIEWBOX_SIZE - 2 * LEGEND_SAFE_INSET) / TITLE_FONT_SIZES.medium,
    );
    expect(naive).toBe(23);
    expect(
      characterBoundFor('title', 'medium'),
      'the bound equals the naive one-em derivation, so the measured ' +
        'worst-case advance is not being applied.',
    ).toBeLessThan(naive);

    // ...and the legend's own table still agrees with this advance.
    expect(
      Math.floor(248 / (40 * WIDEST_CHARACTER_ADVANCE_EM)),
    ).toBe(LEGEND_CHARACTERS_PER_LINE.large);
  });

  it('pairs each role with the weight section 4.2 gives it', (): void => {
    expect(TITLE_FONT_WEIGHT).toBe(600);
    expect(BODY_FONT_WEIGHT).toBe(400);
  });
});

describe('sanitizeCompositionText', (): void => {
  it('leaves ordinary latin-ext characters intact', (): void => {
    expect(sanitizeCompositionText('Košice · Łódź · Magyarország')).toBe(
      'Košice · Łódź · Magyarország',
    );
  });

  it('strips control characters, newlines, and bidi overrides', (): void => {
    expect(sanitizeCompositionText('Bal\u0000tic\nTour‮')).toBe(
      'BalticTour',
    );
  });

  /**
   * The value is set as SVG TEXT CONTENT, and `XMLSerializer` escapes `<`, `>`,
   * and `&` in a text node on its own. Pre-escaping here would double-escape and
   * put literal `&amp;` in the exported PNG, so the sanitiser deliberately does
   * not touch them.
   */
  it('leaves the markup characters in the returned string, because escaping is the serializer job', (): void => {
    expect(sanitizeCompositionText('Allies & <Central> Powers')).toBe(
      'Allies & <Central> Powers',
    );
  });

  it('bounds the length in code points, above the largest character bound', (): void => {
    expect(MAX_COMPOSITION_TEXT_LENGTH).toBeGreaterThan(
      characterBoundFor('attribution'),
    );
    expect(
      compositionTextLength(
        sanitizeCompositionText('W'.repeat(MAX_COMPOSITION_TEXT_LENGTH + 50)),
      ),
    ).toBe(MAX_COMPOSITION_TEXT_LENGTH);
  });

  it('never splits a surrogate pair at the bound', (): void => {
    const clipped = sanitizeCompositionText(
      '🌍'.repeat(MAX_COMPOSITION_TEXT_LENGTH + 5),
    );
    expect(compositionTextLength(clipped)).toBe(MAX_COMPOSITION_TEXT_LENGTH);
    expect(clipped).toBe('🌍'.repeat(MAX_COMPOSITION_TEXT_LENGTH));
  });
});

describe('getCompositionTextBlockingMessage', (): void => {
  it('returns null when everything fits', (): void => {
    expect(
      getCompositionTextBlockingMessage(
        contentOf('Baltic Tour', 'Summer 2026', 'Made with CountriesIRL'),
        MEDIUM_SIZES,
      ),
    ).toBeNull();
  });

  it('returns the title message for an over-bound title', (): void => {
    const overBound = 'W'.repeat(characterBoundFor('title', 'medium') + 1);
    expect(
      getCompositionTextBlockingMessage(contentOf(overBound), MEDIUM_SIZES),
    ).toBe('Shorten the title so it fits in the exported map.');
    expect(TITLE_TEXT_FIT_MESSAGE).toBe(
      'Shorten the title so it fits in the exported map.',
    );
  });

  it('returns the subtitle message for an over-bound subtitle', (): void => {
    const overBound = 'W'.repeat(characterBoundFor('subtitle', 'medium') + 1);
    expect(
      getCompositionTextBlockingMessage(
        contentOf('Baltic Tour', overBound),
        MEDIUM_SIZES,
      ),
    ).toBe('Shorten the subtitle so it fits in the exported map.');
    expect(SUBTITLE_TEXT_FIT_MESSAGE).toBe(
      'Shorten the subtitle so it fits in the exported map.',
    );
  });

  /*
   * RE-BASELINED 2026-08-07, itemised: was `characterBoundFor('attribution') + 1`
   * = 50 `W`s. Under the measured fit rule 50 `W`s render at 1010.5 units and
   * genuinely FIT inside the 1016-unit line, so the old subject no longer
   * refuses — the bound moved because it was wrong, not because the test was.
   * 51 is the first count that actually overflows (1030.7 units).
   */
  it('returns the attribution message for an over-bound attribution', (): void => {
    const overBound = 'W'.repeat(51);
    expect(
      getCompositionTextBlockingMessage(
        contentOf('Baltic Tour', '', overBound),
        MEDIUM_SIZES,
      ),
    ).toBe('Shorten the attribution so it fits in the exported map.');
    expect(ATTRIBUTION_TEXT_FIT_MESSAGE).toBe(
      'Shorten the attribution so it fits in the exported map.',
    );
  });

  /** The bound is per size step, so the SAME string blocks at L and fits at S. */
  it('blocks on the size step in force, not on a single fixed length', (): void => {
    const value = 'W'.repeat(characterBoundFor('title', 'large') + 1);
    expect(
      getCompositionTextBlockingMessage(contentOf(value), {
        title: 'large',
        subtitle: 'medium',
      }),
    ).toBe(TITLE_TEXT_FIT_MESSAGE);
    expect(
      getCompositionTextBlockingMessage(contentOf(value), {
        title: 'small',
        subtitle: 'medium',
      }),
    ).toBeNull();
  });

  it('never blocks on an empty field, however long its bound', (): void => {
    expect(
      getCompositionTextBlockingMessage(contentOf('', '', ''), MEDIUM_SIZES),
    ).toBeNull();
    expect(hasCompositionText('')).toBe(false);
    expect(hasCompositionText('   ')).toBe(false);
    expect(hasCompositionText('Baltic')).toBe(true);
  });
});

describe('resolveCompositionTextLines', (): void => {
  it('renders nothing at all for an all-empty composition', (): void => {
    expect(
      resolveCompositionTextLines(contentOf('', '', ''), MEDIUM_SIZES, 'left'),
    ).toStrictEqual([]);
  });

  it('omits only the empty field, keeping the others', (): void => {
    const lines = resolveCompositionTextLines(
      contentOf('Baltic Tour', '', 'CountriesIRL'),
      MEDIUM_SIZES,
      'left',
    );
    expect(lines.map((line): string => line.role)).toStrictEqual([
      'title',
      'attribution',
    ]);
  });

  it('places the title and subtitle at the top inset and stacks them', (): void => {
    const [title, subtitle] = resolveCompositionTextLines(
      contentOf('Baltic Tour', 'Summer 2026'),
      MEDIUM_SIZES,
      'left',
    );
    expect(title?.y).toBe(TEXT_SAFE_INSET + TITLE_FONT_SIZES.medium);
    expect(subtitle?.y).toBeGreaterThan(title?.y ?? 0);
    expect(title?.x).toBe(TEXT_SAFE_INSET);
    expect(subtitle?.x).toBe(TEXT_SAFE_INSET);
    expect(title?.fontWeight).toBe(TITLE_FONT_WEIGHT);
    expect(subtitle?.fontWeight).toBe(BODY_FONT_WEIGHT);
  });

  /** A subtitle with no title above it takes the title's own baseline. */
  it('promotes a lone subtitle to the top inset', (): void => {
    const [subtitle] = resolveCompositionTextLines(
      contentOf('', 'Summer 2026'),
      MEDIUM_SIZES,
      'left',
    );
    expect(subtitle?.y).toBe(TEXT_SAFE_INSET + SUBTITLE_FONT_SIZES.medium);
  });

  it('anchors the attribution to the bottom inset at the fixed size', (): void => {
    const [attribution] = resolveCompositionTextLines(
      contentOf('', '', 'CountriesIRL'),
      MEDIUM_SIZES,
      'left',
    );
    expect(attribution?.y).toBe(MAP_VIEWBOX_SIZE - TEXT_SAFE_INSET);
    expect(attribution?.fontSize).toBe(ATTRIBUTION_FONT_SIZE);
  });

  it('maps the three alignments onto text-anchor and the matching x', (): void => {
    const cases = [
      ['left', 'start', TEXT_SAFE_INSET],
      ['center', 'middle', MAP_VIEWBOX_SIZE / 2],
      ['right', 'end', MAP_VIEWBOX_SIZE - TEXT_SAFE_INSET],
    ] as const;

    cases.forEach(([alignment, anchor, x]): void => {
      const [line] = resolveCompositionTextLines(
        contentOf('Baltic Tour'),
        MEDIUM_SIZES,
        alignment,
      );
      expect(line?.textAnchor).toBe(anchor);
      expect(line?.x).toBe(x);
    });
  });

  /** Whatever the creator typed, verbatim - never a truncation. */
  it('carries the value verbatim, refusing rather than clipping', (): void => {
    const overBound = 'W'.repeat(characterBoundFor('title', 'medium') + 5);
    const [line] = resolveCompositionTextLines(
      contentOf(overBound),
      MEDIUM_SIZES,
      'left',
    );
    expect(line?.value).toBe(overBound);
    expect(
      getCompositionTextBlockingMessage(contentOf(overBound), MEDIUM_SIZES),
    ).toBe(TITLE_TEXT_FIT_MESSAGE);
  });
});

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * The fit rule measures REAL advances (2026-08-07).
 *
 * These exist because the change that introduced them broke NOTHING in the
 * 875-test suite, which was the warning sign rather than the reassurance: every
 * pre-existing refusal test builds its subject with `'W'.repeat(...)`, and `W`
 * is the one character where the old worst-case-count rule and the new measured
 * rule agree by construction. A rule can be replaced wholesale without a single
 * all-`W` assertion noticing.
 *
 * So each test below is built to fail if the fix is reverted, and the two that
 * matter most assert OPPOSITE directions of the same defect:
 *   - ordinary text that the old rule wrongly REFUSED must now pass, and
 *   - latin-ext digraphs that the old rule wrongly ACCEPTED must now refuse.
 * A rule that is merely "looser" satisfies the first and fails the second.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe('composition text fits by measurement, not by character count', (): void => {
  /*
   * The owner's own Phase 4 finding: a title well inside the line was refused.
   * 34 characters against a `medium` bound of 22 - and it uses under 94% of the
   * line, so it was never close to overflowing.
   */
  it('accepts ordinary text the worst-case count refused', (): void => {
    const title = 'Countries I have visited in Europe';

    expect(compositionTextLength(title)).toBeGreaterThan(
      characterBoundFor('title', 'medium'),
    );
    expect(isCompositionTextOverBound('title', title, 'medium')).toBe(false);
    expect(
      getCompositionTextBlockingMessage(contentOf(title), MEDIUM_SIZES),
    ).toBeNull();
    expect(compositionTextWidth('title', title, 'medium')).toBeLessThan(
      COMPOSITION_TEXT_LINE_WIDTH,
    );
  });

  /*
   * The other half, and the one a "just raise the limit" fix would miss.
   *
   * `U+01F1 DZ` is 1.3745em - 35% wider than `W`. At EXACTLY the old bound of
   * 22 characters the old rule returned "fits" (22 > 22 is false), while the
   * string really renders ~46% past the line. `04-04` introduced this exposure
   * when it added the latin-ext face and nobody re-derived "widest character".
   */
  it('refuses latin-ext digraphs the worst-case count wrongly accepted', (): void => {
    const oldBound = characterBoundFor('title', 'medium');
    const title = 'Ǳ'.repeat(oldBound);

    // Precondition: the OLD rule's own comparison would have passed this.
    expect(compositionTextLength(title)).toBe(oldBound);
    expect(compositionTextLength(title) > oldBound).toBe(false);

    // The new rule refuses it, because it genuinely overflows.
    expect(advanceEmFor(0x1f1, TITLE_FONT_WEIGHT)).toBeGreaterThan(
      WIDEST_CHARACTER_ADVANCE_EM,
    );
    expect(isCompositionTextOverBound('title', title, 'medium')).toBe(true);
    expect(
      getCompositionTextBlockingMessage(contentOf(title), MEDIUM_SIZES),
    ).toBe(TITLE_TEXT_FIT_MESSAGE);
  });

  /** Genuinely too-wide text is still refused - the rule loosened, not lifted. */
  it('still refuses text that truly overflows', (): void => {
    const title = 'W'.repeat(60);
    expect(isCompositionTextOverBound('title', title, 'medium')).toBe(true);
    expect(compositionTextWidth('title', title, 'medium')).toBeGreaterThan(
      COMPOSITION_TEXT_LINE_WIDTH,
    );
  });

  /**
   * The safety property the whole design rests on: the estimate may never come
   * in UNDER the real rendered width, because under-stating clips the exported
   * PNG. Summing advances alone does not have this property - some pairs kern
   * apart - so the bound adds the worst observed pair kerning once per gap.
   */
  it('never under-states: the bound exceeds the bare advance sum', (): void => {
    const sample = 'Košice / Łódź / Magyarország';
    const characters = [...sample];
    const bareSum = characters.reduce(
      (total, character) =>
        total + advanceEmFor(character.codePointAt(0) ?? 0, TITLE_FONT_WEIGHT),
      0,
    );
    const kernSum = characters.slice(1).reduce(
      (total, character, index) =>
        total +
        kernEmFor(
          characters[index].codePointAt(0) ?? 0,
          character.codePointAt(0) ?? 0,
          TITLE_FONT_WEIGHT,
        ),
      0,
    );

    expect(measureTextEm(sample, TITLE_FONT_WEIGHT)).toBeGreaterThan(bareSum);
    expect(measureTextEm(sample, TITLE_FONT_WEIGHT)).toBeCloseTo(
      bareSum + kernSum,
      10,
    );
  });

  /**
   * The kern table exists to stop a blunt margin causing FALSE REFUSALS, and
   * this is the case that forced it: an e2e refused `'W'.repeat(22)`, a title
   * that genuinely renders at 22.92em — 1008 of the 1016 available units.
   *
   * It is asserted against the browser-measured value, so it fails in both
   * directions: too blunt a kern charge refuses a fitting title, and dropping
   * the kern charge entirely under-states a real one.
   */
  it('does not refuse a full line of W, which measures 1008 of 1016 units', (): void => {
    const title = 'W'.repeat(22);
    const measuredInChrome = 22.9191845703125;

    expect(measureTextEm(title, TITLE_FONT_WEIGHT)).toBeGreaterThanOrEqual(
      measuredInChrome,
    );
    // ...but not blunt: within 1% of the truth, not the 13% a flat worst-case
    // pair charge produced.
    expect(measureTextEm(title, TITLE_FONT_WEIGHT)).toBeLessThan(
      measuredInChrome * 1.01,
    );
    expect(isCompositionTextOverBound('title', title, 'medium')).toBe(false);
  });

  /** Untabulated pairs are charged the measured maximum, never zero. */
  it('charges the residual kern to untabulated pairs', (): void => {
    // 'W' + 'W' kerns above the threshold, so it is tabulated exactly.
    expect(kernEmFor(0x57, 0x57, TITLE_FONT_WEIGHT)).toBeGreaterThan(
      RESIDUAL_KERN_EM,
    );
    // A pair with no meaningful kerning falls back to the residual maximum.
    expect(kernEmFor(0x6f, 0x6f, TITLE_FONT_WEIGHT)).toBe(RESIDUAL_KERN_EM);
    expect(RESIDUAL_KERN_EM).toBeGreaterThan(0);
  });

  /** An unmeasured codepoint costs the widest known glyph, never zero. */
  it('charges unknown codepoints the widest known advance', (): void => {
    // U+4E00 (CJK) is outside both vendored subsets.
    expect(advanceEmFor(0x4e00, TITLE_FONT_WEIGHT)).toBe(
      WIDEST_KNOWN_ADVANCE_EM,
    );
    expect(measureTextEm('一', TITLE_FONT_WEIGHT)).toBe(WIDEST_KNOWN_ADVANCE_EM);
  });

  /**
   * The vendored table must not silently drift below the measurement the
   * repository already recorded. Stored advances are rounded UP, so `W` should
   * sit at or just above 1.0202 - never under it.
   */
  it('agrees with the recorded W measurement, rounding upward', (): void => {
    const w = advanceEmFor(0x57, TITLE_FONT_WEIGHT);
    expect(w).toBeGreaterThanOrEqual(WIDEST_CHARACTER_ADVANCE_EM);
    expect(w).toBeLessThan(WIDEST_CHARACTER_ADVANCE_EM + 0.001);
  });

  /** Empty is zero width, and zero width never blocks. */
  it('measures empty text as zero', (): void => {
    expect(measureTextEm('', TITLE_FONT_WEIGHT)).toBe(0);
    expect(compositionTextFillRatio('title', '', 'medium')).toBe(0);
    expect(isCompositionTextOverBound('title', '', 'medium')).toBe(false);
  });

  /**
   * The readout and the refusal are ONE derivation: the counter crosses 100%
   * exactly when the export starts refusing. If these ever disagree, a creator
   * sees a green counter on a map that will not export.
   */
  it('crosses 100% exactly when the export refuses', (): void => {
    const sizes = ['small', 'medium', 'large'] as const;
    for (const size of sizes) {
      for (let length = 1; length <= 60; length++) {
        const value = 'Wi'.repeat(length).slice(0, length);
        const overByRatio = compositionTextFillRatio('title', value, size) > 1;
        expect(overByRatio).toBe(
          isCompositionTextOverBound('title', value, size),
        );
      }
    }
  });

  /**
   * Bigger size step, same string, less room - the step still governs.
   *
   * 45 characters: 793 units at `small`, 970 at `medium` (both inside the
   * 1016-unit line), 1234 at `large`. Worth stating plainly, because it is the
   * measure of the fix: a 45-character title now fits at the DEFAULT size,
   * where the worst-case count refused anything past 22.
   */
  it('keeps the size step meaningful', (): void => {
    const value = 'Countries I have visited across all of Europe';
    expect(compositionTextLength(value)).toBe(45);
    expect(compositionTextWidth('title', value, 'large')).toBeGreaterThan(
      compositionTextWidth('title', value, 'small'),
    );
    expect(isCompositionTextOverBound('title', value, 'small')).toBe(false);
    expect(isCompositionTextOverBound('title', value, 'medium')).toBe(false);
    expect(isCompositionTextOverBound('title', value, 'large')).toBe(true);
  });
});
