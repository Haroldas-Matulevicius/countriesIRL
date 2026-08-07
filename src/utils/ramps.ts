/**
 * The ramp data model (D4-01).
 *
 * A ramp is a hue family plus a FIXED, BOUNDED, ORDERED set of shades — not a
 * continuous gradient. That distinction is the whole point of this module:
 * because the step set is bounded, the palette strip can show exactly the
 * shades that can ever appear, the legend's row count is knowable, and the
 * WCAG contrast gate checks a finite set rather than sampling a curve.
 *
 * `shadeForValue(ramp, t)` is the accessor Phase 5's classing engine calls with
 * a COMPUTED normalized position instead of a click-derived one. The owner's
 * framing, recorded verbatim in `04-CONTEXT.md` D4-03: "if Poland is 100% for
 * something and Lithuania gets entered as 50% for something, it needs to
 * understand that Lithuanias shade is half of what polands should be". Nothing
 * on the render, storage, legend, or export path has to change when that day
 * comes — the accessor already speaks `t`.
 *
 * Every shade in this table satisfies four constraints that `ramps.test.ts`
 * gates rather than asserts by eye (`04-UI-SPEC.md § 6.3.4`):
 *   1. canonical uppercase `#RRGGBB` — the form `normalizeColor` returns and
 *      the legend dedupes on;
 *   2. strictly monotone decreasing relative luminance, light to dark;
 *   3. globally disjoint across all five ramps, so `normalizeLegendEntries`
 *      can never collapse two ramps' legend entries into one;
 *   4. `max(contrast(shade, '#FFFFFF'), contrast(shade, '#111827')) >= 4.5`.
 */

export type RampId = 'blues' | 'reds' | 'greens' | 'purples' | 'greys';

/**
 * The ONE home for the ramp vocabulary, mirroring `LEGEND_TEXT_SIZES`. Storage
 * validation, the reducer, and the panel all import this set; a value added in
 * only one place is a drift bug, not a feature.
 */
export const RAMP_IDS: ReadonlySet<RampId> = new Set<RampId>([
  'blues',
  'reds',
  'greens',
  'purples',
  'greys',
]);

export interface Ramp {
  readonly id: RampId;
  readonly name: string;
  /** Light to dark. The order IS the contract; index 0 is always the lightest. */
  readonly shades: readonly string[];
}

/**
 * Five steps per ramp, uniform across every ramp — and the number is DERIVED,
 * not chosen.
 *
 * Panel content width at 360px is `360 - 2 x 16 = 328px`. A strip segment has
 * to remain a legitimate touch target, so `328 / N >= 44` bounds `N <= 7`
 * (`328/7 = 46.9` passes; `328/8 = 41.0` fails). `N = 5` yields
 * `328 / 5 = 65.6px` segments — headroom if the panel ever narrows — and keeps
 * the label-contrast gate to a bounded `5 ramps x 5 shades = 25` assertions.
 *
 * If someone narrows the panel, recompute `contentWidth / N >= 44` before
 * assuming 5 still fits; that inequality, not this literal, is the rule.
 *
 * Uniform N is deliberate. A per-ramp N would make strip geometry, legend row
 * count, and gate arity vary per ramp for no product gain.
 */
export const RAMP_STEP_COUNT = 5;

/**
 * ColorBrewer sequential 5-class schemes, which are perceptually vetted — but
 * provenance is not the binding constraint here; `ramps.test.ts` is. One shade
 * was substituted on merit rather than loosening a gate:
 *
 * **`blues` step 3 is `#2171B5`, not ColorBrewer 5-class Blues' `#3182BD`.**
 * `#3182BD` has relative luminance 0.202924, which lands inside the band where
 * a shade clears NEITHER label colour: white needs `L <= 0.183333` and the
 * `#111827` ink needs `L >= 0.216351`. It measures 4.1515:1 on white and
 * 4.2731:1 on ink — best case 4.2731:1, short of AA. `#2171B5` (ColorBrewer
 * Blues 9-class, same family) sits at `L = 0.154698` and measures 5.1295:1
 * against white.
 */
export const RAMPS: ReadonlyArray<Ramp> = Object.freeze([
  Object.freeze({
    id: 'blues',
    name: 'Blues',
    shades: Object.freeze([
      '#EFF3FF',
      '#BDD7E7',
      '#6BAED6',
      '#2171B5',
      '#08519C',
    ]),
  }),
  Object.freeze({
    id: 'reds',
    name: 'Reds',
    shades: Object.freeze([
      '#FEE5D9',
      '#FCAE91',
      '#FB6A4A',
      '#DE2D26',
      '#A50F15',
    ]),
  }),
  Object.freeze({
    id: 'greens',
    name: 'Greens',
    shades: Object.freeze([
      '#EDF8E9',
      '#BAE4B3',
      '#74C476',
      '#31A354',
      '#006D2C',
    ]),
  }),
  Object.freeze({
    id: 'purples',
    name: 'Purples',
    shades: Object.freeze([
      '#F2F0F7',
      '#CBC9E2',
      '#9E9AC8',
      '#756BB1',
      '#54278F',
    ]),
  }),
  Object.freeze({
    id: 'greys',
    name: 'Greys',
    shades: Object.freeze([
      '#F7F7F7',
      '#CCCCCC',
      '#969696',
      '#636363',
      '#252525',
    ]),
  }),
] as const satisfies ReadonlyArray<Ramp>);

/**
 * Step `index` of `count`, mapped onto the ramp's own step set.
 *
 * `count` is the CALLER's class count, which need not equal `RAMP_STEP_COUNT` —
 * a three-class legend asks for `0 of 3`, `1 of 3`, `2 of 3` and gets the
 * ramp's lightest, middle, and darkest. An out-of-range index clamps to an end
 * rather than reading past the array, so no caller can be handed `undefined`.
 */
export function shadeForIndex(
  ramp: Ramp,
  index: number,
  count: number,
): string {
  if (!Number.isFinite(index)) {
    throw new Error(`A ramp step index must be finite, got ${String(index)}.`);
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(
      `A ramp class count must be a positive integer, got ${String(count)}.`,
    );
  }

  // A single class carries the whole ramp, so it takes the darkest shade: the
  // lightest is near-white and would be invisible against the uncolored fill.
  if (count === 1) {
    return shadeForValue(ramp, 1);
  }

  const clampedIndex = Math.min(count - 1, Math.max(0, index));
  return shadeForValue(ramp, clampedIndex / (count - 1));
}

/**
 * The shade for a normalized position `t` in `[0, 1]`, snapped to the NEAREST
 * step. Snapping to the nearest rather than flooring is what keeps the mapping
 * symmetric: at N = 5 both 0.49 and 0.51 name the middle step, where flooring
 * would give the middle only to values at or above 0.5 and hand step 1 an
 * oversized slice of the domain.
 *
 * `t` outside `[0, 1]` clamps to an end. A non-finite `t` THROWS rather than
 * quietly resolving to step 0 — the same loud-at-test-time posture
 * `contrastRatio` takes on an unparseable colour.
 */
export function shadeForValue(ramp: Ramp, t: number): string {
  if (!Number.isFinite(t)) {
    throw new Error(`A ramp position must be finite, got ${String(t)}.`);
  }

  const clamped = Math.min(1, Math.max(0, t));
  const lastStep = ramp.shades.length - 1;
  return ramp.shades[Math.round(clamped * lastStep)];
}
