import { describe, expect, it } from 'vitest';

import {
  applyColorToCountries,
  areColorMapsEqual,
  canonicalizeColorMap,
  hasEffectiveColorChange,
  normalizeColor,
} from './colors';

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
    const colors = { FR: '#DC2626', DE: '#FFFFFF' };

    expect(hasEffectiveColorChange(colors, ['IT'], '#fff')).toBe(false);
    expect(hasEffectiveColorChange(colors, ['IT'], ' rgb(255, 255, 255) ')).toBe(false);
    expect(hasEffectiveColorChange(colors, ['FR', 'IT'], '#FFFFFF')).toBe(true);
    expect(applyColorToCountries(colors, ['FR', 'IT'], ' #fff ')).toEqual({});
    expect(canonicalizeColorMap(colors)).toEqual({ FR: '#DC2626' });
  });

  it('canonicalizes equivalent raw colors and rejects invalid strings', (): void => {
    const colors = { FR: '#DC2626' };

    expect(hasEffectiveColorChange(colors, ['FR'], '  #dc2626  ')).toBe(false);
    expect(hasEffectiveColorChange(colors, ['FR'], 'rgb(220, 38, 38)')).toBe(false);
    expect(hasEffectiveColorChange(colors, ['FR'], 'not-a-color')).toBe(false);
    expect(applyColorToCountries({}, ['FR'], ' rgb(1, 2, 3) ')).toEqual({
      FR: '#010203',
    });
    expect(applyColorToCountries(colors, ['FR'], 'not-a-color')).toBe(colors);
    expect(
      canonicalizeColorMap({
        FR: ' #abc ',
        DE: 'rgb(255, 255, 255)',
        IT: '#ffffff',
        ES: 'not-a-color',
      }),
    ).toEqual({ FR: '#AABBCC' });
  });
});

describe('areColorMapsEqual', (): void => {
  it('compares normalized ID-keyed records independent of insertion order', (): void => {
    const first = Object.freeze({ FR: '#DC2626', DE: '#16A34A' });
    const second = Object.freeze({ DE: '#16A34A', FR: '#DC2626' });

    expect(areColorMapsEqual(first, second)).toBe(true);
    expect(first).toEqual({ FR: '#DC2626', DE: '#16A34A' });
    expect(second).toEqual({ DE: '#16A34A', FR: '#DC2626' });
  });

  it('rejects records with different IDs or normalized colors', (): void => {
    expect(areColorMapsEqual({ FR: '#DC2626' }, { DE: '#DC2626' })).toBe(false);
    expect(areColorMapsEqual({ FR: '#DC2626' }, { FR: '#2563EB' })).toBe(false);
    expect(
      areColorMapsEqual({ FR: '#DC2626' }, { FR: '#DC2626', DE: '#16A34A' }),
    ).toBe(false);
  });
});
