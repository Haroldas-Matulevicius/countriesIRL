import { describe, expect, it } from 'vitest';

import type { ColorMap, ColorValue } from '../types/map';
import {
  applyColorToCountries,
  areColorMapsEqual,
  canonicalizeColorMap,
  customColor,
  getEffectiveCountryColor,
  hasEffectiveColorChange,
  normalizeColor,
  rampColor,
  resolveColorMapHexes,
  resolveColorValue,
} from './colors';
import { RAMPS, shadeForValue, type Ramp } from './ramps';

describe('normalizeColor', (): void => {
  it.each([
    ['#abc', '#AABBCC'],
    ['#000', '#000000'],
    ['#fff', '#FFFFFF'],
    ['#A1b2C3', '#A1B2C3'],
    ['  #A1b2C3  ', '#A1B2C3'],
    ['rgb(0,0,0)', '#000000'],
    ['rgb(255, 255, 255)', '#FFFFFF'],
    ['rgb(0, 255, 16)', '#00FF10'],
    ['  rgb(255,0,128)  ', '#FF0080'],
  ])('normalizes %s to %s', (input: string, expected: string): void => {
    expect(normalizeColor(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    '',
    '   ',
    'abc',
    '#ab',
    '#abcd',
    '#12345',
    '#1234567',
    '#GGG',
    'rgb()',
    'rgb(0, 0)',
    'rgb(0, 0, 0, 0)',
    'rgba(0, 0, 0, 1)',
    'rgb(-1, 0, 0)',
    'rgb(0, -1, 0)',
    'rgb(0, 0, -1)',
    'rgb(256, 0, 0)',
    'rgb(0, 256, 0)',
    'rgb(0, 0, 256)',
    'rgb(0, 255.5, 0)',
    'rgb(0%, 0%, 0%)',
    'rgb(0 0 0)',
    'rgb(0, 0, 0); color: red',
  ])('rejects invalid input %j without a fallback color', (input: string): void => {
    const result = normalizeColor(input);

    expect(result.ok).toBe(false);
    expect('value' in result).toBe(false);
  });
});

describe('effective color changes', (): void => {
  it('treats every supported white form as default and deletes assignments', (): void => {
    const colors: ColorMap = { FR: customColor('#DC2626'), DE: customColor('#FFFFFF') };

    expect(hasEffectiveColorChange(colors, ['IT'], customColor('#fff'))).toBe(false);
    expect(
      hasEffectiveColorChange(colors, ['IT'], customColor(' rgb(255, 255, 255) ')),
    ).toBe(false);
    expect(hasEffectiveColorChange(colors, ['FR', 'IT'], customColor('#FFFFFF'))).toBe(
      true,
    );
    expect(applyColorToCountries(colors, ['FR', 'IT'], customColor(' #fff '))).toEqual({});
    expect(canonicalizeColorMap(colors)).toEqual({ FR: customColor('#DC2626') });
  });

  it('canonicalizes equivalent raw colors and rejects invalid strings', (): void => {
    const colors: ColorMap = { FR: customColor('#DC2626') };

    expect(hasEffectiveColorChange(colors, ['FR'], customColor('  #dc2626  '))).toBe(
      false,
    );
    expect(hasEffectiveColorChange(colors, ['FR'], customColor('rgb(220, 38, 38)'))).toBe(
      false,
    );
    expect(hasEffectiveColorChange(colors, ['FR'], customColor('not-a-color'))).toBe(
      false,
    );
    expect(applyColorToCountries({}, ['FR'], customColor(' rgb(1, 2, 3) '))).toEqual({
      FR: customColor('#010203'),
    });
    expect(applyColorToCountries(colors, ['FR'], customColor('not-a-color'))).toBe(colors);
    expect(
      canonicalizeColorMap({
        FR: customColor(' #abc '),
        DE: customColor('rgb(255, 255, 255)'),
        IT: customColor('#ffffff'),
        ES: customColor('not-a-color'),
      }),
    ).toEqual({ FR: customColor('#AABBCC') });
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'keeps reserved ID %s out of color reads, writes, and change detection',
    (reservedId): void => {
      const ownReservedColors = JSON.parse(
        `{"${reservedId}":{"kind":"custom","hex":"#2563EB"},"FR":{"kind":"custom","hex":"#DC2626"}}`,
      ) as ColorMap;
      const inheritedColors = Object.create({
        [reservedId]: customColor('#2563EB'),
      }) as ColorMap;
      const canonicalColors = canonicalizeColorMap(ownReservedColors);

      expect(canonicalColors).toEqual({ FR: customColor('#DC2626') });
      expect(Object.getPrototypeOf(canonicalColors)).toBeNull();
      expect(getEffectiveCountryColor(ownReservedColors, reservedId)).toBe('#FFFFFF');
      expect(getEffectiveCountryColor(inheritedColors, reservedId)).toBe('#FFFFFF');
      expect(
        hasEffectiveColorChange(inheritedColors, [reservedId], customColor('#DC2626')),
      ).toBe(false);
      expect(applyColorToCountries({}, [reservedId], customColor('#DC2626'))).toEqual({});
      expect(areColorMapsEqual({}, inheritedColors)).toBe(true);
    },
  );

  it.each(['__proto__', 'constructor', 'prototype'])(
    'keeps reserved ID %s out of RAMP reads and writes too',
    (reservedId): void => {
      // The union nests an object under each key, so the reserved-key guard is
      // MORE load-bearing than it was against bare strings (T-04-05-02).
      const ownReservedRamps = JSON.parse(
        `{"${reservedId}":{"kind":"ramp","rampId":"blues","t":1},"FR":{"kind":"ramp","rampId":"blues","t":1}}`,
      ) as ColorMap;
      const canonicalColors = canonicalizeColorMap(ownReservedRamps);

      expect(canonicalColors).toEqual({ FR: rampColor('blues', 1) });
      expect(Object.getPrototypeOf(canonicalColors)).toBeNull();
      expect(getEffectiveCountryColor(ownReservedRamps, reservedId)).toBe('#FFFFFF');
      expect(applyColorToCountries({}, [reservedId], rampColor('blues', 1))).toEqual({});
    },
  );
});

describe('areColorMapsEqual', (): void => {
  it('compares normalized ID-keyed records independent of insertion order', (): void => {
    const first = Object.freeze({ FR: customColor('#DC2626'), DE: customColor('#16A34A') });
    const second = Object.freeze({ DE: customColor('#16A34A'), FR: customColor('#DC2626') });

    expect(areColorMapsEqual(first, second)).toBe(true);
    expect(first).toEqual({ FR: customColor('#DC2626'), DE: customColor('#16A34A') });
    expect(second).toEqual({ DE: customColor('#16A34A'), FR: customColor('#DC2626') });
  });

  it('rejects records with different IDs or normalized colors', (): void => {
    expect(
      areColorMapsEqual({ FR: customColor('#DC2626') }, { DE: customColor('#DC2626') }),
    ).toBe(false);
    expect(
      areColorMapsEqual({ FR: customColor('#DC2626') }, { FR: customColor('#2563EB') }),
    ).toBe(false);
    expect(
      areColorMapsEqual(
        { FR: customColor('#DC2626') },
        { FR: customColor('#DC2626'), DE: customColor('#16A34A') },
      ),
    ).toBe(false);
  });
});

describe('the generalized colour identity (D4-02)', (): void => {
  it('resolves a custom variant to canonical uppercase hex', (): void => {
    expect(resolveColorValue(customColor('  #dc2626  '))).toBe('#DC2626');
    expect(resolveColorValue(customColor('rgb(1, 2, 3)'))).toBe('#010203');
  });

  it('resolves a ramp variant through the ramp step set', (): void => {
    const blues = RAMPS.find((ramp) => ramp.id === 'blues');

    expect(blues).toBeDefined();
    expect(resolveColorValue(rampColor('blues', 0))).toBe(
      shadeForValue(blues as Ramp, 0),
    );
    expect(resolveColorValue(rampColor('blues', 0.5))).toBe('#6BAED6');
    expect(resolveColorValue(rampColor('blues', 1))).toBe('#08519C');
  });

  it('resolves an unknown rampId to the default colour without throwing', (): void => {
    const storedUnknownRamp = JSON.parse(
      '{"kind":"ramp","rampId":"sunsets","t":0.5}',
    ) as ColorValue;

    expect(() => resolveColorValue(storedUnknownRamp)).not.toThrow();
    expect(resolveColorValue(storedUnknownRamp)).toBe('#FFFFFF');
  });

  it('resolves two ramp positions that snap to the same step to one hex', (): void => {
    expect(resolveColorValue(rampColor('blues', 0.5))).toBe(
      resolveColorValue(rampColor('blues', 0.51)),
    );
  });

  it('resolves late: the SAME stored value follows the ramp table it is given', (): void => {
    const restyledRamps: ReadonlyArray<Ramp> = [
      {
        id: 'blues',
        name: 'Blues',
        shades: ['#000001', '#000002', '#000003', '#000004', '#000005'],
      },
    ];

    // The proof that hex is NOT frozen into the stored value: one assignment,
    // two ramp tables, two fills. A resolved-hex model cannot do this, and it
    // is what lets a later plan re-skin every ramp-painted country at once.
    expect(resolveColorValue(rampColor('blues', 0.5), restyledRamps)).toBe(
      '#000003',
    );
    expect(resolveColorValue(rampColor('blues', 0.5))).toBe('#6BAED6');
  });

  it('reads a ramp assignment back through getEffectiveCountryColor', (): void => {
    const colors: ColorMap = { FR: rampColor('reds', 1), DE: customColor('#16a34a') };

    expect(getEffectiveCountryColor(colors, 'FR')).toBe('#A50F15');
    expect(getEffectiveCountryColor(colors, 'DE')).toBe('#16A34A');
    expect(getEffectiveCountryColor(colors, 'IT')).toBe('#FFFFFF');
  });

  it('keeps a ramp assignment a ramp assignment through canonicalization', (): void => {
    const canonical = canonicalizeColorMap({
      FR: rampColor('greens', 0.25),
      DE: customColor(' #abc '),
    });

    expect(canonical.FR).toEqual({ kind: 'ramp', rampId: 'greens', t: 0.25 });
    expect(canonical.DE).toEqual({ kind: 'custom', hex: '#AABBCC' });
    expect(Object.getPrototypeOf(canonical)).toBeNull();
  });

  it('compares ramp assignments structurally, not by resolved hex', (): void => {
    const base: ColorMap = { FR: rampColor('blues', 0.5) };

    expect(areColorMapsEqual(base, { FR: rampColor('blues', 0.5) })).toBe(true);
    // 0.5 and 0.51 SNAP TO THE SAME STEP - same pixels, different assignment.
    // Structural comparison is what lets undo tell them apart; resolving first
    // would silently swallow the edit.
    expect(resolveColorValue(rampColor('blues', 0.5))).toBe(
      resolveColorValue(rampColor('blues', 0.51)),
    );
    expect(areColorMapsEqual(base, { FR: rampColor('blues', 0.51) })).toBe(false);
    expect(areColorMapsEqual(base, { FR: rampColor('reds', 0.5) })).toBe(false);
    // A custom hex that resolves identically is still a different assignment.
    expect(areColorMapsEqual(base, { FR: customColor('#6BAED6') })).toBe(false);
  });

  it('detects a ramp repaint as an effective change and applies it', (): void => {
    const colors: ColorMap = { FR: customColor('#6BAED6') };

    expect(hasEffectiveColorChange(colors, ['FR'], rampColor('blues', 0.5))).toBe(true);
    expect(
      hasEffectiveColorChange({ FR: rampColor('blues', 0.5) }, ['FR'], rampColor('blues', 0.5)),
    ).toBe(false);
    expect(applyColorToCountries(colors, ['FR', 'DE'], rampColor('blues', 0.5))).toEqual({
      FR: { kind: 'ramp', rampId: 'blues', t: 0.5 },
      DE: { kind: 'ramp', rampId: 'blues', t: 0.5 },
    });
  });

  it('refuses a malformed ramp assignment as a write instead of storing it', (): void => {
    const outOfRange = JSON.parse(
      '{"kind":"ramp","rampId":"blues","t":1.5}',
    ) as ColorValue;
    const colors: ColorMap = { FR: customColor('#DC2626') };

    expect(applyColorToCountries(colors, ['FR'], outOfRange)).toBe(colors);
    expect(hasEffectiveColorChange(colors, ['FR'], outOfRange)).toBe(false);
  });

  it('hands the legend resolved hexes, never union variants', (): void => {
    expect(
      resolveColorMapHexes({
        FR: rampColor('blues', 0.5),
        DE: customColor(' #dc2626 '),
      }),
    ).toEqual(['#6BAED6', '#DC2626']);
  });
});
