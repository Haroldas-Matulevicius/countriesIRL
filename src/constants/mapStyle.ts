import type {
  StrokeWeight,
  VisibleCompositionSettings,
} from '../types/composition';
import type { MapStyleColorPreset, WaterPreset } from '../types/ui';
import { BAND_DEFAULT_HEIGHT } from '../utils/bands';
import { DEFAULT_BORDER_COLOR, NEUTRAL_UNIT_COLOR } from './colors';

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
 * The uncoloured-country fill choices (D4-09, `04-UI-SPEC.md § 6.4`). Neutrals
 * only: this is the colour every unpainted country wears at once, so a hue here
 * competes with the creator's own palette across the whole map.
 *
 * `#FFFFFF` is deliberately ABSENT as a preset. With white water and coastlines
 * at `none` a white country is invisible, which is the defect D4-09 exists to
 * prevent; a creator who wants it can still type it into the custom field, and
 * that is a choice rather than a default.
 */
export const UNCOLORED_FILL_PRESETS: ReadonlyArray<MapStyleColorPreset> = [
  { name: 'Light grey', value: NEUTRAL_UNIT_COLOR }, // #E5E7EB
  { name: 'Mid grey', value: '#D1D5DB' },
  { name: 'Warm grey', value: '#E7E5E4' },
  { name: 'Cool grey', value: '#E2E8F0' },
];

/**
 * The border-colour choices (D4-08). Black is the unchanged default; the other
 * two are the quieter greys the phase's reference maps use for interior lines.
 */
export const BORDER_COLOR_PRESETS: ReadonlyArray<MapStyleColorPreset> = [
  { name: 'Black', value: DEFAULT_BORDER_COLOR }, // #000000
  { name: 'Graphite', value: '#4B5563' },
  { name: 'Silver', value: '#9CA3AF' },
];

/**
 * The ONE home for the stroke-weight vocabulary (D4-08).
 *
 * Imported by the composition reducer's canonicaliser, the renderer, and the
 * export clone's sanitizer — **a value added in only one place is a drift bug,
 * not a feature**, exactly as `LEGEND_TEXT_SIZES` records for the legend.
 *
 * Discrete named steps rather than a continuous slider is deliberate: each step
 * is **individually gateable** on exported pixels, whereas a slider can only be
 * asserted to round-trip.
 *
 * Two properties the rest of the system depends on:
 *
 * - **`thin` is exactly today's `EXPORT_BORDER_WIDTH` (0.75)**, so it is the
 *   no-visual-change step. `src/utils/mapStyle.test.ts` asserts that equality
 *   against the imported constant rather than a retyped literal.
 * - **`none` means OMIT the stroke entirely**, not `stroke-width="0"`. The two
 *   are different in a serialised SVG, and the distinction is what lets the
 *   export gate assert *absence* rather than a number. `hasStroke` is the
 *   renderer's decision function; nothing may re-derive it from `=== 0`.
 *
 * The values are user units of the 1080 viewBox. Every scene path carries
 * `vector-effect: non-scaling-stroke`, so they resolve in the 540-unit export
 * viewport and rasterise at `EXPORT_SCALE` 2 — see `coding-rules/export.md`.
 */
export const STROKE_WEIGHTS: ReadonlySet<StrokeWeight> = new Set([
  'none',
  'hairline',
  'thin',
  'medium',
  'bold',
]);

export const STROKE_WEIGHT_UNITS: Readonly<Record<StrokeWeight, number>> = {
  none: 0,
  hairline: 0.5,
  thin: 0.75,
  medium: 1.25,
  bold: 2,
};

export function strokeWidthFor(weight: StrokeWeight): number {
  return STROKE_WEIGHT_UNITS[weight];
}

/**
 * The renderer's decision, kept out of every call site. `none` is an OMITTED
 * stroke; a zero width would still serialise a `stroke-width="0"` attribute and
 * an export gate asserting absence would then be asserting the wrong thing.
 */
export function hasStroke(weight: StrokeWeight): boolean {
  return weight !== 'none';
}

/** `04-UI-SPEC.md § 9`, byte-exact. The panel renders these, never a `toUpperCase`. */
export const STROKE_WEIGHT_LABELS: Readonly<Record<StrokeWeight, string>> = {
  none: 'None',
  hairline: 'Hairline',
  thin: 'Thin',
  medium: 'Medium',
  bold: 'Bold',
};

/** The order the pills are drawn in — lightest to heaviest, never Set order. */
export const STROKE_WEIGHT_ORDER: ReadonlyArray<StrokeWeight> = [
  'none',
  'hairline',
  'thin',
  'medium',
  'bold',
];

export const DEFAULT_UNCOLORED_FILL = NEUTRAL_UNIT_COLOR;
export const DEFAULT_INTERIOR_WEIGHT: StrokeWeight = 'thin';
/**
 * U-3. `none`, not `hairline`: the phase's headline visual change is that
 * *"country outlines all but disappear against water"*, and anything softer
 * fails to deliver it. `04-09`'s interior-borders layer is what puts lines back
 * where a creator still needs them.
 */
export const DEFAULT_COASTLINE_WEIGHT: StrokeWeight = 'none';

/**
 * D4-16, stated as two separate constants because the two defaults DIFFER and a
 * single shared `DEFAULT_BAND_VISIBLE` would hide that.
 *
 * Top ON: the title is the reason the band exists, and `04-11`'s text tools
 * ship into a band that is already there. Bottom OFF: an attribution line is
 * opt-in, and two bands out of the box would frame every creator's first export
 * whether they asked for it or not. On the default white water both are
 * invisible anyway — which is why turning the top one on costs the shipped
 * export nothing.
 */
export const DEFAULT_TOP_BAND_VISIBLE = true;
export const DEFAULT_BOTTOM_BAND_VISIBLE = false;

/** The `Bands` section's own labels. `04-UI-SPEC.md § 9` vocabulary. */
export const BAND_LABELS = {
  top: 'Top band',
  bottom: 'Bottom band',
} as const;

/**
 * The ONE default `settings` object. The provider, the legacy save-migration
 * path, and the storage reader all seed from this rather than each spelling
 * their own literal — three copies of a default is how two "default"
 * compositions end up disagreeing, which this project has already paid for once
 * with the legend position.
 *
 * **Every Map style control has a default, so the panel has no un-set state.**
 */
export const DEFAULT_COMPOSITION_SETTINGS: VisibleCompositionSettings =
  Object.freeze({
    backgroundColor: '#FFFFFF',
    surfaceColor: DEFAULT_SURFACE_COLOR,
    uncoloredFill: DEFAULT_UNCOLORED_FILL,
    borderColor: DEFAULT_BORDER_COLOR,
    interiorWeight: DEFAULT_INTERIOR_WEIGHT,
    coastlineWeight: DEFAULT_COASTLINE_WEIGHT,
    topBandVisible: DEFAULT_TOP_BAND_VISIBLE,
    topBandHeight: BAND_DEFAULT_HEIGHT,
    bottomBandVisible: DEFAULT_BOTTOM_BAND_VISIBLE,
    bottomBandHeight: BAND_DEFAULT_HEIGHT,
  });
