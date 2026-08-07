import { MAP_VIEWBOX_SIZE } from '../constants/config';
import { normalizeColor } from './colors';

/**
 * D4-16 — the title and footer gradient bands (`04-UI-SPEC.md` §§ 3, 6.6).
 *
 * The band exists because CountriesIRL has been **full-bleed since Phase 3**:
 * the map reaches every edge, so a title has to *overlay* it. The band is the
 * thing that gives overlaid type something to sit on, and it fades from the
 * creator's own water colour rather than from hardcoded white — on white water
 * it is a no-op and invisible, which is correct behaviour and matches the
 * owner's Eurostat reference.
 *
 * The two heights below are **derivations, never pasted literals**. 1080/7 is
 * 154.28…, so a plan that says "one seventh" beside a test that says "154" will
 * disagree the first time the viewBox moves; the arithmetic lives here and the
 * test asserts the number, in the style `LEGEND_CHARACTERS_PER_LINE` already
 * uses in `legend.ts`.
 */

/**
 * The cap, `Math.floor(MAP_VIEWBOX_SIZE / 7)` = `floor(154.2857…)` = **154**
 * user units of the 1080 viewBox. Beyond one seventh of the square per edge the
 * two bands together start eating the map rather than framing it.
 */
export const BAND_MAX_HEIGHT = Math.floor(MAP_VIEWBOX_SIZE / 7);

/**
 * The default, `MAP_VIEWBOX_SIZE / 9` = **120** — an exact integer at ~78 % of
 * the cap. It is derived rather than chosen: 120 is tall enough for a title at
 * size L (56) plus a subtitle at size M (26) with `TEXT_SAFE_INSET` (32)
 * breathing room, which is the tallest stack `04-11`'s text tools can put in a
 * band.
 *
 * **Changing it moves exported pixels**, and `04-12`'s legend inset derives
 * from the resolved height through `resolveBandExtents` below.
 */
export const BAND_DEFAULT_HEIGHT = MAP_VIEWBOX_SIZE / 9;

/**
 * A7 (`04-UI-SPEC.md` § 8): one arrow press moves a band by eight user units.
 * `Home` and `End` jump to 0 and `BAND_MAX_HEIGHT`. Exported so the Playwright
 * gate compares against this rather than a retyped 8.
 */
export const BAND_KEYBOARD_STEP = 8;

/**
 * The stop colour used when `normalizeColor` rejects the composition's surface
 * colour outright. It is white, and it is the same white as
 * `DEFAULT_SURFACE_COLOR` — but it is **declared here rather than imported**,
 * because `constants/mapStyle.ts` imports `BAND_DEFAULT_HEIGHT` from this
 * module and the reverse edge would be a circular dependency.
 *
 * `bands.test.ts` imports both and asserts they are equal, so the duplication
 * is a checked claim rather than a comment that goes stale.
 */
export const BAND_FALLBACK_STOP_COLOR = '#FFFFFF';

export interface BandGradientStop {
  /** `0%` is the band's ANCHORED edge; the gradient's own `y1`/`y2` aims it. */
  readonly offset: string;
  readonly stopColor: string;
  readonly stopOpacity: number;
}

export interface BandLayoutSettings {
  readonly topBandVisible: boolean;
  readonly topBandHeight: number;
  readonly bottomBandVisible: boolean;
  readonly bottomBandHeight: number;
}

export interface BandExtents {
  readonly top: number;
  readonly bottom: number;
}

/**
 * Bound every path that can set a band height to `[0, BAND_MAX_HEIGHT]`
 * (T-04-10-01). Zero is a real height — a band a creator has dragged shut — so
 * it is returned as itself; a non-finite request is not a height at all and
 * falls back to the default rather than to an edge of the range.
 */
export function clampBandHeight(requested: number): number {
  if (!Number.isFinite(requested)) {
    return BAND_DEFAULT_HEIGHT;
  }
  if (requested <= 0) {
    return 0;
  }

  return Math.min(requested, BAND_MAX_HEIGHT);
}

/**
 * The two `<stop>` descriptors the renderer writes **inline** on a
 * `<linearGradient>` inside `defs[data-layer="paint"]`.
 *
 * This is what makes the band colour DERIVED STATE rather than a token read at
 * export time. The serialised clone is rasterised as an isolated document that
 * sees no host stylesheet, so a `stop-color="var(--map-surface)"` renders
 * nothing at all in the PNG while the editor still looks perfectly correct —
 * the measured trap `04-01` recorded for the water rect, applied to a gradient.
 *
 * V5: the colour is normalised here, so a value the reducer somehow let past
 * cannot be written raw into a serialised SVG attribute.
 */
export function bandGradientStops(
  surfaceColor: string,
): readonly [BandGradientStop, BandGradientStop] {
  const normalized = normalizeColor(surfaceColor);
  const stopColor = normalized.ok ? normalized.value : BAND_FALLBACK_STOP_COLOR;

  return [
    { offset: '0%', stopColor, stopOpacity: 1 },
    { offset: '100%', stopColor, stopOpacity: 0 },
  ];
}

/**
 * The ONE reader of "how far into the square does each band actually reach".
 *
 * `MapCanvas` places the rects from this, and `04-12`'s band-aware legend inset
 * consumes it rather than re-deriving `visible ? height : 0` beside it. Two
 * copies of that expression is how the legend ends up sitting under a band the
 * creator has grown — the drift `04-UI-SPEC.md § 6.7` names.
 */
export function resolveBandExtents(settings: BandLayoutSettings): BandExtents {
  return {
    top: settings.topBandVisible ? clampBandHeight(settings.topBandHeight) : 0,
    bottom: settings.bottomBandVisible
      ? clampBandHeight(settings.bottomBandHeight)
      : 0,
  };
}
