import { DEFAULT_COLOR } from '../constants/colors';
import type {
  ColorMap,
  ColorValue,
  CustomColorValue,
  RampColorValue,
} from '../types/map';
import type { ColorNormalizationResult } from '../types/ui';
import { isSafeStableCountryId } from './countryIds';
import { RAMP_IDS, RAMPS, shadeForValue, type Ramp, type RampId } from './ramps';

const HEX_COLOR_PATTERN = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const RGB_COLOR_PATTERN = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
const RGB_CHANNEL_MAX = 255;
const HEX_RADIX = 16;
const HEX_CHANNEL_LENGTH = 2;
const MIN_RAMP_POSITION = 0;
const MAX_RAMP_POSITION = 1;

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

export function customColor(hex: string): CustomColorValue {
  return { kind: 'custom', hex };
}

export function rampColor(rampId: RampId, t: number): RampColorValue {
  return { kind: 'ramp', rampId, t };
}

/**
 * The structural gate for an UNTRUSTED colour value - a value read back out of
 * a stored record, out of a `JSON.parse`, or handed in by a host. A ramp
 * position is a normalized position by definition, so `[0, 1]` is part of the
 * shape rather than something a later caller clamps: one rule, checked once.
 */
export function isColorValue(raw: unknown): raw is ColorValue {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }

  const candidate = raw as {
    readonly kind?: unknown;
    readonly hex?: unknown;
    readonly rampId?: unknown;
    readonly t?: unknown;
  };

  if (candidate.kind === 'custom') {
    return typeof candidate.hex === 'string';
  }

  if (candidate.kind === 'ramp') {
    return (
      typeof candidate.rampId === 'string' &&
      (RAMP_IDS as ReadonlySet<string>).has(candidate.rampId) &&
      typeof candidate.t === 'number' &&
      Number.isFinite(candidate.t) &&
      candidate.t >= MIN_RAMP_POSITION &&
      candidate.t <= MAX_RAMP_POSITION
    );
  }

  return false;
}

/**
 * THE single place a stored colour value becomes a hex.
 *
 * This is `resolveLegendPosition`'s counterpart for colour (Live Invariant 3).
 * Nothing else may narrow a `ColorValue` on a render, legend, storage, or
 * export path. If a second reader appears, the six call sites that used to
 * assume a bare `string` each grow their own branch again, and they drift: the
 * canvas resolves a ramp one way, the legend another, and the exported PNG a
 * third. One reader is what makes "the hex is resolved at render time" a
 * property of the system rather than a convention.
 *
 * `ramps` is a parameter, not a module read, because that is the whole point of
 * storing the ramp IDENTITY: the same stored value follows whichever ramp table
 * it is resolved against, so switching the active ramp re-skins every country
 * painted with it. A resolved-hex model cannot do that.
 *
 * An unknown `rampId` resolves to the default colour and does NOT throw. A
 * stored value naming a ramp this build does not have is a data problem, and a
 * creator's saved map must still open.
 */
export function resolveColorValue(
  value: ColorValue,
  ramps: ReadonlyArray<Ramp> = RAMPS,
): string {
  if (value.kind === 'ramp') {
    const ramp = ramps.find((candidate) => candidate.id === value.rampId);
    if (ramp === undefined || !Number.isFinite(value.t)) {
      return DEFAULT_COLOR;
    }

    return shadeForValue(ramp, value.t);
  }

  const colorResult = normalizeColor(value.hex);
  return colorResult.ok ? colorResult.value : DEFAULT_COLOR;
}

/**
 * Every hex the legend is allowed to see. `reconcileLegend` keys and DEDUPES by
 * hex, so it must never be handed a union variant; two ramp positions that snap
 * to the same step are one legend row, exactly as two equal hexes always were.
 */
export function resolveColorMapHexes(colors: ColorMap): ReadonlyArray<string> {
  return Object.values(colors).map((value) =>
    isColorValue(value) ? resolveColorValue(value) : DEFAULT_COLOR,
  );
}

/**
 * Structural identity, deliberately NOT resolved identity. Two ramp variants
 * that differ only in `t` are different assignments even when they snap to the
 * same step and paint the same pixels - resolving first would make a creator's
 * edit invisible to undo.
 */
export function areColorValuesEqual(left: ColorValue, right: ColorValue): boolean {
  if (left.kind === 'ramp' || right.kind === 'ramp') {
    return (
      left.kind === 'ramp' &&
      right.kind === 'ramp' &&
      left.rampId === right.rampId &&
      Object.is(left.t, right.t)
    );
  }

  return resolveColorValue(left) === resolveColorValue(right);
}

export function createEmptyColorMap(): Record<string, ColorValue> {
  return Object.create(null) as Record<string, ColorValue>;
}

/**
 * The stored variant for a country, or `null` when the map holds nothing usable
 * for it. Keeps the reserved-key guard (`isSafeStableCountryId`) and the
 * own-property check on ONE path: the union nests an object under each key, so
 * an inherited or reserved key now smuggles in a structure rather than a
 * string, which makes this guard more load-bearing, not less.
 */
function readColorValue(colors: ColorMap, countryId: string): ColorValue | null {
  if (
    !isSafeStableCountryId(countryId) ||
    !Object.prototype.hasOwnProperty.call(colors, countryId)
  ) {
    return null;
  }

  const rawValue: unknown = Reflect.get(colors, countryId);
  return isColorValue(rawValue) ? rawValue : null;
}

/**
 * The canonical form of a value, or `null` if it cannot be stored. A custom
 * variant canonicalizes its hex; a ramp variant is already canonical, because
 * its identity IS `rampId` plus `t`.
 */
function canonicalizeColorValue(value: ColorValue): ColorValue | null {
  if (value.kind === 'ramp') {
    return isColorValue(value) ? value : null;
  }

  const colorResult = normalizeColor(value.hex);
  return colorResult.ok ? customColor(colorResult.value) : null;
}

export function getEffectiveCountryColor(
  colors: ColorMap,
  countryId: string,
): string {
  const value = readColorValue(colors, countryId);
  return value === null ? DEFAULT_COLOR : resolveColorValue(value);
}

export function canonicalizeColorMap(colors: ColorMap): ColorMap {
  const canonicalColors = createEmptyColorMap();

  for (const countryId of Object.keys(colors)) {
    const value = readColorValue(colors, countryId);
    if (value === null) {
      continue;
    }

    const canonicalValue = canonicalizeColorValue(value);
    if (canonicalValue === null) {
      continue;
    }

    if (resolveColorValue(canonicalValue) !== DEFAULT_COLOR) {
      canonicalColors[countryId] = canonicalValue;
    }
  }

  return canonicalColors;
}

export function hasEffectiveColorChange(
  colors: ColorMap,
  countryIds: ReadonlyArray<string>,
  color: ColorValue,
): boolean {
  const canonicalValue = canonicalizeColorValue(color);
  if (canonicalValue === null) {
    return false;
  }

  const clearsAssignment = resolveColorValue(canonicalValue) === DEFAULT_COLOR;

  return countryIds.some((countryId) => {
    if (!isSafeStableCountryId(countryId)) {
      return false;
    }

    const current = readColorValue(colors, countryId);
    if (current === null) {
      return !clearsAssignment;
    }

    return !areColorValuesEqual(current, canonicalValue);
  });
}

export function applyColorToCountries(
  colors: ColorMap,
  countryIds: ReadonlyArray<string>,
  color: ColorValue,
): ColorMap {
  const canonicalValue = canonicalizeColorValue(color);
  if (canonicalValue === null) {
    return colors;
  }

  const nextColors = createEmptyColorMap();
  Object.assign(nextColors, canonicalizeColorMap(colors));

  for (const countryId of countryIds) {
    if (!isSafeStableCountryId(countryId)) {
      continue;
    }

    if (resolveColorValue(canonicalValue) === DEFAULT_COLOR) {
      delete nextColors[countryId];
    } else {
      nextColors[countryId] = canonicalValue;
    }
  }

  return nextColors;
}

export function areColorMapsEqual(left: ColorMap, right: ColorMap): boolean {
  const canonicalLeft = canonicalizeColorMap(left);
  const canonicalRight = canonicalizeColorMap(right);
  const leftCountryIds = Object.keys(canonicalLeft);
  const rightCountryIds = Object.keys(canonicalRight);

  if (leftCountryIds.length !== rightCountryIds.length) {
    return false;
  }

  return leftCountryIds.every(
    (countryId) =>
      Object.prototype.hasOwnProperty.call(canonicalRight, countryId) &&
      areColorValuesEqual(canonicalLeft[countryId], canonicalRight[countryId]),
  );
}
