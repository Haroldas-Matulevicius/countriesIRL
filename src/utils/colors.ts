import { COLOR_PRESETS } from '../constants/colors';
import type { ColorMap } from '../types/map';
import type { ColorNormalizationResult } from '../types/ui';

const HEX_COLOR_PATTERN = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const RGB_COLOR_PATTERN = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
const RGB_CHANNEL_MAX = 255;
const HEX_RADIX = 16;
const HEX_CHANNEL_LENGTH = 2;
const PRESET_COLOR_VALUES = new Set<string>(COLOR_PRESETS.map((preset) => preset.value));

function expandShortHex(hex: string): string {
  return hex
    .slice(1)
    .split('')
    .map((character) => `${character}${character}`)
    .join('');
}

function channelToHex(channel: number): string {
  return channel
    .toString(HEX_RADIX)
    .padStart(HEX_CHANNEL_LENGTH, '0')
    .toUpperCase();
}

export function normalizeColor(input: string): ColorNormalizationResult {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return { ok: false, reason: 'empty-input' };
  }

  if (HEX_COLOR_PATTERN.test(trimmedInput)) {
    const hexDigits =
      trimmedInput.length === 4 ? expandShortHex(trimmedInput) : trimmedInput.slice(1);

    return { ok: true, value: `#${hexDigits.toUpperCase()}` };
  }

  const rgbMatch = RGB_COLOR_PATTERN.exec(trimmedInput);
  if (rgbMatch === null) {
    return { ok: false, reason: 'invalid-format' };
  }

  const channels = rgbMatch.slice(1).map(Number);
  if (channels.some((channel) => channel > RGB_CHANNEL_MAX)) {
    return { ok: false, reason: 'channel-out-of-range' };
  }

  return {
    ok: true,
    value: `#${channels.map(channelToHex).join('')}`,
  };
}

export function isPresetColor(input: string): boolean {
  const result = normalizeColor(input);
  return result.ok && PRESET_COLOR_VALUES.has(result.value);
}

export function areColorMapsEqual(left: ColorMap, right: ColorMap): boolean {
  const leftCountryIds = Object.keys(left);
  const rightCountryIds = Object.keys(right);

  if (leftCountryIds.length !== rightCountryIds.length) {
    return false;
  }

  return leftCountryIds.every(
    (countryId) =>
      Object.prototype.hasOwnProperty.call(right, countryId) &&
      left[countryId] === right[countryId],
  );
}
