import type { VisibleCompositionSettings } from '../types/composition';
import type { WaterPreset } from '../types/ui';

/**
 * The composition's water/background surface (D4-03, `04-UI-SPEC.md § 6.4`).
 *
 * Every colour literal for this surface lives here and never in a `.tsx` — the
 * contract test's colour-literal exemption list is closed at
 * `LegendOverlay.tsx` (`src/constants/colors.ts:18-22`).
 *
 * The default is the owner's Eurostat reference: plain white. The other three
 * are the set chosen at `04-01`'s Task 2 owner gate (`preset-set-a`), with the
 * roadmap straw man's "light blue" deliberately dropped — a saturated blue such
 * as `#4682B4` measures 0.2056 and fails the luminance floor below.
 *
 * Every value is canonical uppercase `#RRGGBB`: `normalizeColor` returns that
 * form and the legend dedupes on it, so a lowercase entry would round-trip into
 * a second distinct colour.
 *
 * `src/utils/mapStyle.test.ts` gates each entry against
 * `MIN_COMPOSITION_SURFACE_LUMINANCE`; the measured luminances at the time of
 * writing are recorded beside each row so a later reader can tell a checked
 * value from an assumed one.
 */
export const DEFAULT_SURFACE_COLOR = '#FFFFFF';

export const WATER_PRESETS: ReadonlyArray<WaterPreset> = [
  { name: 'White', value: DEFAULT_SURFACE_COLOR }, // L = 1.000000
  { name: 'Warm paper', value: '#F5EFE6' }, //        L = 0.868587
  { name: 'Cool tint', value: '#EAF2F7' }, //         L = 0.877121
  { name: 'Soft grey', value: '#E9EBEE' }, //         L = 0.829133
];

/** The `#RRGGBB` shape hint for the custom water entry. Never in a `.tsx`. */
export const CUSTOM_SURFACE_COLOR_PLACEHOLDER = '#RRGGBB';

/**
 * The ONE default `settings` object. The provider, the legacy save-migration
 * path, and the storage reader all seed from this rather than each spelling
 * their own literal — three copies of a default is how two "default"
 * compositions end up disagreeing, which this project has already paid for once
 * with the legend position.
 */
export const DEFAULT_COMPOSITION_SETTINGS: VisibleCompositionSettings =
  Object.freeze({
    backgroundColor: '#FFFFFF',
    surfaceColor: DEFAULT_SURFACE_COLOR,
  });
