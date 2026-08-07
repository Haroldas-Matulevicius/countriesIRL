import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, type Download, type Page } from '@playwright/test';

import { DEFAULT_COLOR } from '../../src/constants/colors';
import {
  DEFAULT_SURFACE_COLOR,
  WATER_PRESETS,
} from '../../src/constants/mapStyle';
import { BAND_DEFAULT_HEIGHT, resolveBandExtents } from '../../src/utils/bands';
import {
  LEGEND_BAR_WIDTH,
  LEGEND_SAFE_INSET,
  createDefaultLegendState,
  reconcileLegend,
  resolveLegendRender,
} from '../../src/utils/legend';
import { RAMPS } from '../../src/utils/ramps';
import type { LegendForm } from '../../src/types/composition';

/**
 * `04-08` / D4-09: what an UNCOLOURED country paints. A hand-written literal,
 * never imported: importing the constant the app renders from would make this
 * assertion and its subject move together.
 */
const DEFAULT_UNCOLORED_FILL = '#E5E7EB';
import {
  AUSTRALIA_WEST_COAST_LON_LAT,
  BOTTOM_BAND_MERIDIAN,
  COASTLINE_BAND_RADIUS,
  FRANCO_GERMAN_BORDER_LON_LAT,
  PACIFIC_LON_LAT,
  SAHARA_LON_LAT,
  type RampFamilyLabel,
  LOGICAL_PATH_SELECTOR,
  chooseStrokeWeight,
  chooseWaterPreset,
  clearSavedMaps,
  legendDisclosure,
  openRailTool,
  paintCountryWithRampShade,
  projectLonLat,
  projectToExportPixel,
  readCameraTransform,
  setBandVisible,
  setCompositionTitle,
  toExportPixels,
  waitForApp,
  waitForSettledCamera,
  type CameraTransform,
} from './support/appHarness';
/*
 * `04-13` moved the suite's PNG decode path into `support/pngProbe.ts`; `04-15`
 * finished the job for this file. `measurePng` below used to carry a SECOND
 * `createImageBitmap` + `getImageData` implementation, which is precisely the
 * drift shape `04-12` named — two sampled-pixel assertions quietly measuring
 * differently decoded images. It now delegates, and the new reference-frame
 * gate uses the same helpers rather than growing a third.
 */
import {
  DARK_INK_THRESHOLD,
  compositionTitleInkRegion,
  countExactColorsInRegions,
  countInkAroundRegion,
  expectBlankControlReadsZeroInk,
  expectRegionInsideFrame,
  exportRealAppPng,
  hexToRgb,
  readPngDimensions,
  rec709Luminance,
  regionAround,
  samplePngPoints,
} from './support/pngProbe';
import type { PngRegion } from './support/pngProbe';

/**
 * Cross-domain journey coverage. The six focused specs each prove one domain,
 * and several prove it against a fixture that re-implements App's wiring. What
 * none of them can see is the *interaction* between domains across one
 * continuous session:
 *
 * - history position -> exported pixels (undo must un-export a color);
 * - a real browser reload -> localStorage -> load -> exported pixels;
 * - legend labels, legend placement, and the camera surviving the whole chain
 *   all the way into the downloaded PNG bytes.
 *
 * Nothing here re-asserts a claim a focused spec already owns.
 */

const DOWNLOAD_ROOT = resolve('.artifacts/playwright/downloads');
const EXPORT_SIZE = 1080;
const DESKTOP_VIEWPORT = { width: 1300, height: 900 };
const LOGICAL_CORE_COUNT = 207;

/*
 * `04-07` replaced the ten-tile preset grid with the ramp model, so the two
 * colours this session paints are now ramp shades: `Reds` step 4 and `Blues`
 * step 4.
 *
 * `04-15` deleted the parallel `RED_RGB` / `BLUE_RGB` triples. They existed
 * because the private pixel counter compared channels, and two spellings of one
 * colour is exactly the drift they were commented as preventing;
 * `countExactColorsInRegions` takes the hex and converts it through the shared
 * `hexToRgb`, so there is now one spelling and nothing to keep in step.
 */
const RED_FAMILY = 'Reds' as const;
const BLUE_FAMILY = 'Blues' as const;
const RAMP_STEP = 4;
const RED = '#DE2D26';
const BLUE = '#2171B5';

const COMPOSITION_NAME = 'Grand tour';
const EXPORTED_FILENAME_PATTERN = /^Grand_tour_\d{4}-\d{2}-\d{2}\.png$/u;

/**
 * Corner boxes for the legend, and a map column that starts to the right of
 * both the legend's inset and its widest label. Keeping the regions disjoint is
 * what stops the legend swatch - painted in the country's own color - from
 * being counted as evidence that the country itself reached the PNG, and vice
 * versa.
 */
const CORNER_FRACTION = 0.32;
/**
 * `04-13` — a SEPARATE, wider box for the bottom-right corner, and the number
 * is DERIVED rather than picked.
 *
 * The ramp-painted map now resolves to the **bar** form, whose marks are a
 * 48-unit strip at the legend's LEFT edge while its boundary labels run to the
 * right. A bottom-right-anchored bar therefore puts its coloured pixels
 * `legendWidth` units in from the frame edge, and the 0.32 corner box — sized
 * for a 24-unit row swatch — misses them entirely and reports a tidy zero.
 *
 * The widest legend this test can produce is
 * `LEGEND_BAR_WIDTH (48) + LEGEND_BAR_TICK_LENGTH (12) +
 *  LEGEND_BAR_TICK_LABEL_GAP (8) + legendTextWidth('Visited France', 32)` =
 * **526** units, so the box has to reach at least 526 in from the right edge.
 * `0.52 x 1080 = 561`, which clears it with 35 units to spare.
 *
 * The TOP-LEFT box is deliberately NOT widened: it stays at 0.32 so it remains
 * disjoint from the map column (`MAP_REGION_START_FRACTION`), which is what
 * stops a painted country being counted as legend evidence.
 *
 * The VERTICAL bound is tightened to compensate, and it too is derived from a
 * measurement: at 0.52 on both axes the box swallowed **8 pixels of France**,
 * so a `toBe(0)` on "the legend is not down here" would have been reporting a
 * country rather than a legend. A bottom-right-anchored bar sits at
 * `y = 1048 - 32 = 1016`; `1 - 0.25 = 0.75 x 1080 = 810` contains it with 206
 * units to spare and clears every painted pixel of Europe absolutely.
 */
const BOTTOM_RIGHT_CORNER_FRACTION = 0.52;
const BOTTOM_RIGHT_CORNER_Y_FRACTION = 0.25;
const MAP_REGION_START_FRACTION = 0.35;

/** France and Germany at a 1.5x world camera; both are far above this. */
const MIN_COUNTRY_PIXELS = 120;
/** A legend swatch is 24x24 user units on a 1080 square. */
const MIN_SWATCH_PIXELS = 200;
/** Well under a percent of the frame means nothing rasterized at all. */
const MIN_TOTAL_NON_WHITE_PIXELS = 10_000;

interface ColorCounts {
  readonly red: number;
  readonly blue: number;
}

interface PngRegions {
  /** Applied fills inside the map column only. */
  readonly map: ColorCounts;
  /** Legend swatches, identified by color, in each corner box. */
  readonly topLeft: ColorCounts;
  readonly bottomRight: ColorCounts;
  readonly totalNonWhitePixels: number;
}

async function saveDownloadedPng(
  download: Download,
  label: string,
): Promise<Buffer> {
  const target = resolve(
    DOWNLOAD_ROOT,
    `final-integration-${label}-${download.suggestedFilename()}`,
  );
  await download.saveAs(target);
  return readFile(target);
}

/**
 * The three disjoint boxes this journey counts in, as explicit HALF-OPEN
 * rectangles rather than four fractions threaded into a private loop.
 *
 * They are byte-for-byte the regions the private counter used: `x >= mapStartX`
 * becomes `[mapStartX, 1080)`, `x < cornerX && y < cornerY` becomes
 * `[0, cornerX) x [0, cornerY)`, and the bottom-right pair becomes
 * `[1080 - w, 1080) x [1080 - h, 1080)`.
 */
const MAP_COLUMN_REGION: PngRegion = {
  x: EXPORT_SIZE * MAP_REGION_START_FRACTION,
  y: 0,
  width: EXPORT_SIZE * (1 - MAP_REGION_START_FRACTION),
  height: EXPORT_SIZE,
};
const TOP_LEFT_CORNER_REGION: PngRegion = {
  x: 0,
  y: 0,
  width: EXPORT_SIZE * CORNER_FRACTION,
  height: EXPORT_SIZE * CORNER_FRACTION,
};
const BOTTOM_RIGHT_CORNER_REGION: PngRegion = {
  x: EXPORT_SIZE * (1 - BOTTOM_RIGHT_CORNER_FRACTION),
  y: EXPORT_SIZE * (1 - BOTTOM_RIGHT_CORNER_Y_FRACTION),
  width: EXPORT_SIZE * BOTTOM_RIGHT_CORNER_FRACTION,
  height: EXPORT_SIZE * BOTTOM_RIGHT_CORNER_Y_FRACTION,
};

async function measurePng(page: Page, bytes: Buffer): Promise<PngRegions> {
  expect(readPngDimensions(bytes)).toEqual({
    width: EXPORT_SIZE,
    height: EXPORT_SIZE,
  });

  const counted = await countExactColorsInRegions(
    page,
    bytes,
    [RED, BLUE],
    [MAP_COLUMN_REGION, TOP_LEFT_CORNER_REGION, BOTTOM_RIGHT_CORNER_REGION],
  );
  const [map, topLeft, bottomRight] = counted.regions;
  if (map === undefined || topLeft === undefined || bottomRight === undefined) {
    throw new Error('the region counter returned fewer boxes than requested.');
  }

  const read = (counts: ReadonlyArray<number>): ColorCounts => ({
    red: counts[0] ?? 0,
    blue: counts[1] ?? 0,
  });
  return {
    map: read(map),
    topLeft: read(topLeft),
    bottomRight: read(bottomRight),
    totalNonWhitePixels: counted.totalNonWhitePixels,
  };
}

interface ExportMeasurement {
  readonly filename: string;
  readonly regions: PngRegions;
}

async function exportAndMeasure(
  page: Page,
  label: string,
): Promise<ExportMeasurement> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const download = await downloadPromise;
  await expect(page.getByText('PNG downloaded at 1080 × 1080.')).toBeVisible({
    timeout: 15_000,
  });
  const bytes = await saveDownloadedPng(download, label);
  return {
    filename: download.suggestedFilename(),
    regions: await measurePng(page, bytes),
  };
}

async function colorCountry(
  page: Page,
  countryId: string,
  family: RampFamilyLabel,
): Promise<void> {
  await paintCountryWithRampShade(page, countryId, family, RAMP_STEP);
}

async function labelLegendEntry(
  page: Page,
  color: string,
  label: string,
): Promise<void> {
  await openRailTool(page, 'Legend');
  const input = page.getByLabel(`Legend label for ${color}`);
  await input.fill(label);
  await input.press('Enter');
}

function expectCamerasEqual(
  actual: CameraTransform,
  expected: CameraTransform,
): void {
  expect(actual.k).toBeCloseTo(expected.k, 5);
  expect(actual.x).toBeCloseTo(expected.x, 4);
  expect(actual.y).toBeCloseTo(expected.y, 4);
}

test('a full creator session survives a browser reload and exports what the screen shows', async ({
  page,
}): Promise<void> => {
  test.slow();

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await waitForApp(page);
  await clearSavedMaps(page);

  const france = page.locator('path.country-path[data-country-id="FRA"]');
  const germany = page.locator('path.country-path[data-country-id="DEU"]');
  const legendTexts = page.locator('svg.map-canvas [data-layer="legend"] text');
  const undo = page.getByRole('button', { name: 'Undo Color Change' });
  const redo = page.getByRole('button', { name: 'Redo Color Change' });

  await colorCountry(page, 'FRA', RED_FAMILY);
  await colorCountry(page, 'DEU', BLUE_FAMILY);
  await expect(france).toHaveAttribute('fill', RED);
  await expect(germany).toHaveAttribute('fill', BLUE);

  await openRailTool(page, 'Legend');
  await legendDisclosure(page).click();
  // 14 characters each — the maximum two 'medium' lines hold under the
  // Inter-derived wrap (7/line). 'Visited Germany' (15) is now export-blocked
  // by design; re-baselined deliberately by 03-11 (D-25/OQ-5).
  await labelLegendEntry(page, RED, 'Visited France');
  await labelLegendEntry(page, BLUE, 'Visited Berlin');
  await expect(legendTexts).toHaveText(['Visited France', 'Visited Berlin']);

  await page.getByRole('button', { name: 'Zoom In' }).click();
  const authoredCamera = await waitForSettledCamera(page);
  expect(authoredCamera.k).toBeGreaterThan(1);

  // The dialog dissolved into the `saved` panel (03-07); its close control is
  // the panel's own, and the accessible name is unique again (D-4 closed).
  await openRailTool(page, 'Saved Maps');
  await page.getByRole('textbox', { name: 'Map name' }).fill(COMPOSITION_NAME);
  await page.getByRole('button', { name: 'Save Map' }).click();
  await page.getByRole('button', { name: 'Close Saved Maps' }).click();

  /*
   * Invariant 4, at the only moment it matters: a legend rendered as a sibling
   * of the canonical SVG is dropped by `cloneNode` *and* still satisfies
   * `isSingleCanonicalComposition`, so the export would succeed and silently
   * ship a legend-less PNG. Asserted against the real composition root,
   * immediately before a real export.
   */
  await expect(
    page.locator('svg.map-canvas > [data-layer="legend"]'),
  ).toHaveCount(1);

  const authored = await exportAndMeasure(page, 'authored');
  expect(authored.filename).toMatch(EXPORTED_FILENAME_PATTERN);
  expect(
    authored.regions.totalNonWhitePixels,
    'the exported PNG is blank: nothing rasterized into the frame.',
  ).toBeGreaterThan(MIN_TOTAL_NON_WHITE_PIXELS);
  expect(
    authored.regions.map.red,
    'the red applied to France did not reach the exported map.',
  ).toBeGreaterThan(MIN_COUNTRY_PIXELS);
  expect(
    authored.regions.map.blue,
    'the blue applied to Germany did not reach the exported map.',
  ).toBeGreaterThan(MIN_COUNTRY_PIXELS);
  // Only the legend paints a country color into the top-left corner box; the
  // map column starts well to its right. These two counts are the swatches.
  expect(
    authored.regions.topLeft.red,
    'the legend did not rasterize into the exported PNG.',
  ).toBeGreaterThan(MIN_SWATCH_PIXELS);
  expect(authored.regions.topLeft.blue).toBeGreaterThan(MIN_SWATCH_PIXELS);

  /*
   * History -> export. Undo is proven against the DOM elsewhere; nothing proves
   * that the *bytes a creator ships* follow the history position. An exporter
   * that captured the saved baseline, or a stale scene, passes every focused
   * spec and posts the wrong map.
   */
  await undo.click();
  /*
   * `04-08` / D4-09: the undone country PAINTS the uncoloured fill while its
   * STORED value returns to the `#FFFFFF` sentinel (`DEFAULT_COLOR`). Both are
   * asserted; the paint alone could not tell "undone" from "painted white".
   */
  await expect(germany).toHaveAttribute('fill', DEFAULT_UNCOLORED_FILL);
  await expect(germany).toHaveAttribute(
    'aria-label',
    new RegExp(`current color ${DEFAULT_COLOR}$`, 'u'),
  );
  await expect(legendTexts).toHaveText(['Visited France']);

  const undone = await exportAndMeasure(page, 'undone');
  expect(
    undone.regions.map.blue,
    'the undone blue is still in the exported PNG.',
  ).toBe(0);
  expect(
    undone.regions.topLeft.blue,
    'the undone color still has a legend swatch in the exported PNG.',
  ).toBe(0);
  expect(undone.regions.map.red).toBe(authored.regions.map.red);
  /*
   * `04-13`: a TOLERANCE, derived from a measurement, replacing exact
   * equality — and the reason is a real behavioural change, not a fudge.
   *
   * In the bar form the segments are CONTIGUOUS. While red and blue are both
   * painted, the red segment's lower edge abuts the blue one and antialiases
   * against it; once the blue is undone, that same edge antialiases against
   * the paper instead. The measured disagreement is **46 pixels** — one
   * antialiased row across a 48-unit-wide bar — so the bound is
   * `LEGEND_BAR_WIDTH`, which is what one such row can cost. Exact equality
   * was a valid proxy while the swatches were detached; it is not one now.
   *
   * The CLAIM is unchanged: undo removed the blue and left the red alone.
   */
  expect(
    Math.abs(undone.regions.topLeft.red - authored.regions.topLeft.red),
    'undo changed the red legend mark by more than one antialiased bar edge',
  ).toBeLessThanOrEqual(LEGEND_BAR_WIDTH);
  expect(undone.regions.topLeft.red).toBeGreaterThan(MIN_SWATCH_PIXELS);

  // Redo restores the color; the label is composition state, not history, so it
  // was never lost while its color was undone.
  await redo.click();
  await expect(germany).toHaveAttribute('fill', BLUE);
  await expect(legendTexts).toHaveText(['Visited France', 'Visited Berlin']);

  await page.reload();
  await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
    LOGICAL_CORE_COUNT,
  );
  const startCreating = page.getByRole('button', { name: 'Start Creating' });
  if (await startCreating.isVisible()) {
    await startCreating.click();
  }

  // The composition lives only in memory, so a reload really is a blank page.
  await expect(france).toHaveAttribute('fill', DEFAULT_UNCOLORED_FILL);
  await expect(germany).toHaveAttribute('fill', DEFAULT_UNCOLORED_FILL);
  await expect(legendTexts).toHaveCount(0);

  /*
   * Discrimination control. The restored export below is compared for equality,
   * and equality between two blank squares is perfect. This export pins what
   * "not the saved composition" measures, so that comparison cannot be
   * trivially satisfied.
   */
  const blank = await exportAndMeasure(page, 'reloaded-blank');
  expect(blank.filename).not.toMatch(EXPORTED_FILENAME_PATTERN);
  expect(blank.regions.map.red).toBe(0);
  expect(blank.regions.map.blue).toBe(0);
  expect(blank.regions.topLeft.red).toBe(0);
  expect(blank.regions.topLeft.blue).toBe(0);
  expect(blank.regions.totalNonWhitePixels).not.toBe(
    authored.regions.totalNonWhitePixels,
  );

  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('button', { name: `Load This Map: ${COMPOSITION_NAME}` })
    .click();
  // Nothing was authored since the reload, so the load is not destructive and
  // is never gated behind the replace confirmation.
  await expect(
    page.getByRole('heading', { name: 'Replace the current map?' }),
  ).toHaveCount(0);

  await expect(france).toHaveAttribute('fill', RED);
  await expect(germany).toHaveAttribute('fill', BLUE);
  await expect(legendTexts).toHaveText(['Visited France', 'Visited Berlin']);
  expectCamerasEqual(await readCameraTransform(page), authoredCamera);
  // A load replaces history rather than appending to it, so there is nothing
  // behind the restored composition to undo back into.
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  const restored = await exportAndMeasure(page, 'restored');
  // The saved name is composition identity: it is restored by the load and read
  // by the exporter, so the round trip is visible in the filename too.
  expect(restored.filename).toBe(authored.filename);
  expect(restored.regions.map.red).toBe(authored.regions.map.red);
  expect(restored.regions.map.blue).toBe(authored.regions.map.blue);
  expect(restored.regions.topLeft.red).toBe(authored.regions.topLeft.red);
  expect(restored.regions.topLeft.blue).toBe(authored.regions.topLeft.blue);
  /*
   * The strongest single assertion in this file. It fails if the load restores
   * the camera imprecisely, if a legend label comes back as its hex fallback,
   * if the reload/load path leaves a selection border the exporter no longer
   * normalizes, or if any of those drift apart later. The `blank` export above
   * is what proves it is not satisfiable by two identical empty frames.
   */
  expect(restored.regions.totalNonWhitePixels).toBe(
    authored.regions.totalNonWhitePixels,
  );
});

test('the legend follows its position into the exported PNG', async ({
  page,
}): Promise<void> => {
  test.slow();

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await waitForApp(page);
  await clearSavedMaps(page);

  await colorCountry(page, 'FRA', RED_FAMILY);
  await openRailTool(page, 'Legend');
  await legendDisclosure(page).click();
  await labelLegendEntry(page, RED, 'Visited France');
  await expect(
    page.locator('svg.map-canvas [data-layer="legend"] text'),
  ).toHaveText(['Visited France']);

  const topLeft = await exportAndMeasure(page, 'legend-top-left');
  expect(
    topLeft.regions.topLeft.red,
    'the legend did not rasterize into the top-left corner.',
  ).toBeGreaterThan(MIN_SWATCH_PIXELS);
  expect(topLeft.regions.bottomRight.red).toBe(0);

  await page.getByRole('radio', { name: 'Bottom right' }).check();
  await expect(page.getByRole('radio', { name: 'Bottom right' })).toBeChecked();

  const bottomRight = await exportAndMeasure(page, 'legend-bottom-right');
  /*
   * `resolveLegendPosition` is the only path a render or an export may read the
   * position through. If an export ever reads `legend.position` raw, or clamps
   * the corner away, the legend stays where it was and these measurements do
   * not move - the shape of the clipped-legend defect this phase shipped once.
   */
  expect(
    bottomRight.regions.topLeft.red,
    'the legend did not leave the top-left corner of the exported PNG.',
  ).toBe(0);
  expect(
    bottomRight.regions.bottomRight.red,
    'the legend did not arrive in the bottom-right corner of the exported PNG.',
  ).toBeGreaterThan(MIN_SWATCH_PIXELS);
  expect(bottomRight.regions.totalNonWhitePixels).toBeGreaterThan(
    MIN_TOTAL_NON_WHITE_PIXELS,
  );
});

/* ================================================================== *
 * `04-15` — THE PHASE 4 REFERENCE FRAME, built once and inspected in bytes
 *
 * Fourteen plans each proved their own slice against its own subject. Nothing
 * had yet proved they COMPOSE. This gate builds the owner's reference-style
 * frame through the real UI — ramp fills at different steps, a grey uncoloured
 * country, quiet coastlines, a present interior mesh, both gradient bands, a
 * title, and the bar legend — exports it ONCE, and asserts the union of the
 * per-property claims on the downloaded bytes.
 *
 * **There is no whole-image baseline here and none anywhere in this phase**
 * (D4-14). "The baseline changed because my plan changed it" is unfalsifiable,
 * so every claim below is a named property with its own discrimination control.
 *
 * ⛔ **This gate does NOT claim cartographic RESEMBLANCE to the Eurostat
 * reference.** Building the frame and measuring its pixels is not a human
 * comparing it side by side, which `04-VALIDATION.md` lists as manual-only and
 * schedules in `04-16`. It also claims nothing about whether latin-ext
 * diacritics are the RIGHT GLYPHS (A12, also physical, also `04-16`). The claim
 * made here is narrower and exact: **specific pixels have specific values.**
 * ================================================================== */

/**
 * The reference frame runs on **`Warm paper`**, not on the reference's white
 * water, and the reason is measured rather than aesthetic.
 *
 * `04-10` measured that a band fades from `settings.surfaceColor` to
 * transparent, so on white water it fades from white TO white: **239.626 with
 * the band on and 239.626 with it off.** A band claim sampled on white water
 * measures nothing and passes. The owner's reference having no visible bands is
 * therefore CORRECT behaviour, and it is also exactly why the composite frame
 * cannot be built on white if the band property is to be asserted at all.
 *
 * Recorded here and in `04-15-SUMMARY.md`, per the plan's requirement to state
 * which of the two escapes was taken. This gate takes **both**: a non-white
 * surface AND a sample column that crosses land.
 */
const REFERENCE_WATER_PRESET_NAME = 'Warm paper';

/**
 * Sixteen characters, and the length is load-bearing twice. It has to be long
 * enough that the derived glyph box is a real crop, and short enough that the
 * box stays over the Arctic Ocean at the default world camera — where the
 * title-free control measures a hard ZERO because coastlines ship at `none` and
 * there is no interior land border up there to ink.
 */
const REFERENCE_TITLE = 'Europe by visits';

/**
 * **Three paints, at three DIFFERENT ramp steps, on three countries chosen so
 * that no sample region contains a colour it is not measuring.**
 *
 * - `BRA` / `KAZ` are the SAME family at steps 2 and 5, which is what makes
 *   "different steps produce different exported fills" a claim about the step
 *   rather than about the hue.
 * - none of the three touches the Franco-German Rhine, Australia's west coast,
 *   Libya, or Antarctica — the four places this gate samples for something
 *   else. `#DE2D26`-class shades read as dark ink at `DARK_INK_THRESHOLD`, so a
 *   painted country inside the interior-border band would silently satisfy that
 *   band's floor with a fill instead of a stroke.
 * - all three sit well below the legend, which is what lets the map region and
 *   the legend region be genuinely disjoint.
 */
const REFERENCE_PAINTS = [
  {
    countryId: 'BRA',
    family: 'Reds' as RampFamilyLabel,
    step: 2,
    lonLat: [-52, -10] as readonly [number, number],
  },
  {
    countryId: 'KAZ',
    family: 'Reds' as RampFamilyLabel,
    step: 5,
    lonLat: [67, 48] as readonly [number, number],
  },
  {
    countryId: 'IND',
    family: 'Blues' as RampFamilyLabel,
    step: 4,
    lonLat: [79, 22] as readonly [number, number],
  },
] as const;

/**
 * D4-12: `inferLegendForm` returns `bar` for any composition holding a ramp
 * assignment, and all three paints above write one. Named rather than retyped
 * at each derivation — two spellings of the form is how a derived crop starts
 * measuring the other form's box — and ASSERTED against the resolved layout
 * plus the live DOM before a single pixel is read.
 */
const REFERENCE_LEGEND_FORM: LegendForm = 'bar';

/**
 * Queen Maud Land, three rows in from the bottom edge. `04-10` measured the
 * BOTTOM band's signal at **7.481** near-to-far against the top band's
 * **3.490**, because Antarctica fills the whole bottom band while the top band
 * is open Arctic Ocean except for one island group. The larger signal is the
 * one worth composing against.
 */
const BOTTOM_BAND_SAMPLE_ROWS: readonly [number, number, number] = [
  1070, 1020, 970,
];

/*
 * ------------------------------------------------------------------
 * Floors. Every one is DERIVED FROM A MEASUREMENT taken in this change,
 * installed Chrome 151.0.7922.76, and every one sits under half its
 * measurement. The measured values are restated in `04-15-SUMMARY.md`.
 * ------------------------------------------------------------------
 */
/**
 * Measured **85** dark pixels in the Franco-German band in this very frame, at
 * interior `thin` — the same 85 `04-09` measured in isolation, which is itself
 * a small integration result. The floor is `04-09`'s **8**: unchanged, under a
 * tenth of the measurement, and eight times the zero a flood fill produces.
 */
const MIN_INTERIOR_BORDER_INK_PIXELS = 8;
/** Measured **4,188** for the 16-character title inside the top band. */
const MIN_REFERENCE_TITLE_INK_PIXELS = 1_500;
/** Measured **6,981** of dark ink inside the three-entry bar's own bounds. */
const MIN_REFERENCE_LEGEND_INK_PIXELS = 1_500;
/**
 * Measured **1,426 / 1,472 / 1,426** for the three bar segments in the
 * reference frame, and **941 / 1,119 / 1,104** for the same three segments in
 * the band-free positive control, where the bar is clipped by the strip's own
 * 120-unit height. The floor is **400** — under half the smallest of the six.
 */
const MIN_LEGEND_MARK_PIXELS = 400;
/** Measured **6,135 / 4,019 / 2,378** for Brazil, Kazakhstan and India. */
const MIN_PAINTED_COUNTRY_PIXELS = 1_000;
/**
 * The band floors, and this composite frame REPRODUCES `04-10`'s isolated
 * numbers to three decimals: near-to-far **7.4814** against a floor of 1.5,
 * presence **12.1072** against a floor of 2.5, and a bands-off column flat at
 * exactly **230.8636** in all three rows — a measured disagreement of
 * **0.000**, against a tolerance of 0.25.
 */
const MIN_BAND_NEAR_TO_FAR_DELTA = 1.5;
const MIN_BAND_PRESENCE = 2.5;
const BAND_NOISE_FLOOR = 0.25;

function referenceWaterHex(): string {
  const preset = WATER_PRESETS.find(
    (candidate): boolean => candidate.name === REFERENCE_WATER_PRESET_NAME,
  );
  if (preset === undefined) {
    throw new Error(
      `The shipped water presets no longer include ${REFERENCE_WATER_PRESET_NAME}.`,
    );
  }
  return preset.value;
}

function rampShade(family: RampFamilyLabel, step: number): string {
  const ramp = RAMPS.find((candidate): boolean => candidate.name === family);
  if (ramp === undefined) {
    throw new Error(`No shipped ramp is named ${family}.`);
  }
  const shade = ramp.shades[step - 1];
  if (shade === undefined) {
    throw new Error(`${family} has no step ${String(step)}.`);
  }
  return shade;
}

function expectRegionsDisjoint(
  first: PngRegion,
  second: PngRegion,
  message: string,
): void {
  const overlaps =
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height;
  expect(overlaps, message).toBe(false);
}

function rgbOf(sample: ReadonlyArray<number> | undefined): ReadonlyArray<number> {
  if (sample === undefined) {
    throw new Error('the sampler returned fewer pixels than it was asked for.');
  }
  return sample.slice(0, 3);
}

test.describe('phase 4 reference frame', (): void => {
  test('every property this phase promised lands in ONE downloaded 1080 PNG', async ({
    page,
  }): Promise<void> => {
    test.slow();

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await clearSavedMaps(page);

    const water = referenceWaterHex();
    expect(
      water,
      'the reference frame needs a NON-WHITE surface: a white-to-transparent ' +
        'band on white water is a no-op, and the band claim below would pass ' +
        'while measuring nothing at all.',
    ).not.toBe(DEFAULT_SURFACE_COLOR);
    const shades = REFERENCE_PAINTS.map((paint): string =>
      rampShade(paint.family, paint.step),
    );

    /* -------------------------------------------------------------- *
     * BUILD THE FRAME THROUGH THE REAL UI, never by poking state.
     * -------------------------------------------------------------- */
    for (const paint of REFERENCE_PAINTS) {
      await paintCountryWithRampShade(
        page,
        paint.countryId,
        paint.family,
        paint.step,
      );
      await expect(
        page.locator(
          `path.country-path[data-country-id="${paint.countryId}"][data-path-kind="logical"]`,
        ),
      ).toHaveAttribute('fill', rampShade(paint.family, paint.step));
    }

    await openRailTool(page, 'Map style');
    await chooseWaterPreset(page, REFERENCE_WATER_PRESET_NAME);
    // The reference: coastlines doing no work, a thin dark interior mesh.
    await chooseStrokeWeight(page, 'Coastlines', 'None');
    await chooseStrokeWeight(page, 'Interior', 'Thin');
    await setBandVisible(page, 'Top band', true);
    await setBandVisible(page, 'Bottom band', true);
    await setCompositionTitle(page, REFERENCE_TITLE);

    /* -------------------------------------------------------------- *
     * DERIVE EVERY REGION, AND PROVE EACH IS WHERE IT CLAIMS TO BE.
     *
     * `04-13` measured why this half is not optional: this file's own corner
     * box was sized for a 24-unit row swatch, missed the bar's marks entirely,
     * and reported a tidy ZERO while the legend was right there. A region that
     * samples the wrong place passes vacuously and looks authoritative doing
     * it, so every region below is cross-checked against the live DOM before a
     * pixel is read.
     * -------------------------------------------------------------- */
    const bandedExtents = resolveBandExtents({
      topBandVisible: true,
      topBandHeight: BAND_DEFAULT_HEIGHT,
      bottomBandVisible: true,
      bottomBandHeight: BAND_DEFAULT_HEIGHT,
    });
    const legendRender = resolveLegendRender(
      reconcileLegend(shades, createDefaultLegendState()),
      shades,
      bandedExtents,
      REFERENCE_LEGEND_FORM,
    );
    expect(
      legendRender.layout.form,
      'a ramp-painted map did not resolve to the bar form, so every crop ' +
        'derived from the bar geometry below is measuring the wrong box.',
    ).toBe('bar');

    const legendRegion: PngRegion = {
      x: legendRender.position.x,
      y: legendRender.position.y,
      width: legendRender.bounds.width,
      height: legendRender.bounds.height,
    };
    expectRegionInsideFrame(legendRegion);

    const legendLayer = page.locator('svg.map-canvas [data-layer="legend"]');
    await expect(legendLayer).toHaveAttribute(
      'transform',
      `translate(${String(legendRender.position.x)} ${String(legendRender.position.y)})`,
    );
    const legendBox = legendLayer.locator('[data-editor-only="true"]');
    await expect(legendBox).toHaveAttribute(
      'width',
      String(legendRender.bounds.width),
    );
    await expect(legendBox).toHaveAttribute(
      'height',
      String(legendRender.bounds.height),
    );
    // The bar's own mark, so "the legend region" is provably the BAR's region.
    for (const shade of shades) {
      await expect(legendLayer.locator(`rect[fill="${shade}"]`)).toHaveAttribute(
        'width',
        String(LEGEND_BAR_WIDTH),
      );
    }

    const titleRegion = compositionTitleInkRegion(REFERENCE_TITLE);
    const titleNode = page.locator(
      'svg.map-canvas > [data-layer="text"] > [data-text-role="title"]',
    );
    await expect(titleNode).toHaveText(REFERENCE_TITLE);

    const topBandRegion: PngRegion = {
      x: 0,
      y: 0,
      width: EXPORT_SIZE,
      height: BAND_DEFAULT_HEIGHT,
    };
    expectRegionInsideFrame(topBandRegion);
    await expect(
      page.locator('svg.map-canvas [data-layer="bands"] rect[data-band="top"]'),
    ).toHaveAttribute('height', String(BAND_DEFAULT_HEIGHT));
    await expect(
      page.locator(
        'svg.map-canvas [data-layer="bands"] rect[data-band="bottom"]',
      ),
    ).toHaveAttribute('height', String(BAND_DEFAULT_HEIGHT));

    /** Everything below the legend's foot — where all three paints live. */
    const legendFoot = legendRegion.y + legendRegion.height;
    const mapRegion: PngRegion = {
      x: 0,
      y: legendFoot,
      width: EXPORT_SIZE,
      height: EXPORT_SIZE - legendFoot,
    };
    expectRegionInsideFrame(mapRegion);

    /*
     * THE ARRANGEMENT ITSELF, before any pixel: the title sits INSIDE the top
     * band, the legend sits entirely BELOW it at the band-derived inset, and
     * the three regions this gate counts colours in do not overlap. `04-10`
     * recorded that at Phase 4 defaults the legend was 88 units inside the
     * title band before `04-12` moved it; this is that fix, composed.
     */
    expect(
      titleRegion.y + titleRegion.height,
      'the title has left the top band, so this frame is not the reference ' +
        'arrangement any more.',
    ).toBeLessThanOrEqual(BAND_DEFAULT_HEIGHT);
    expect(legendRegion.y).toBe(LEGEND_SAFE_INSET + BAND_DEFAULT_HEIGHT);
    expect(
      legendRegion.y,
      'the legend reaches into the top band, which is the collision D4-13 ' +
        "exists to prevent and the shape of `04-10`'s 88-unit finding.",
    ).toBeGreaterThanOrEqual(topBandRegion.height);
    expectRegionsDisjoint(
      titleRegion,
      legendRegion,
      'the title box and the legend box OVERLAP in the composition geometry.',
    );
    expectRegionsDisjoint(
      legendRegion,
      mapRegion,
      'the legend box and the map region overlap, so a bar segment would be ' +
        'counted as a painted country and vice versa.',
    );

    /* -------------------------------------------------------------- *
     * SAMPLE POINTS, every one from a named lon/lat through the real
     * projection and the live camera — never a pasted pixel.
     * -------------------------------------------------------------- */
    const [oceanPoint, uncolouredPoint, ...paintedPoints] =
      await toExportPixels(page, [
        projectLonLat(PACIFIC_LON_LAT),
        projectLonLat(SAHARA_LON_LAT),
        ...REFERENCE_PAINTS.map((paint): readonly [number, number] =>
          projectLonLat(paint.lonLat),
        ),
      ]);
    if (oceanPoint === undefined || uncolouredPoint === undefined) {
      throw new Error('The reference sample points did not map into the frame.');
    }
    const coastRegion = regionAround(
      await projectToExportPixel(page, AUSTRALIA_WEST_COAST_LON_LAT),
      COASTLINE_BAND_RADIUS,
    );
    const inlandRegion = regionAround(
      await projectToExportPixel(page, FRANCO_GERMAN_BORDER_LON_LAT),
      COASTLINE_BAND_RADIUS,
    );
    expectRegionInsideFrame(coastRegion);
    expectRegionInsideFrame(inlandRegion);
    const [bandColumn] = await projectToExportPixel(page, [
      BOTTOM_BAND_MERIDIAN,
      0,
    ]);

    /* -------------------------------------------------------------- *
     * FOUR EXPORTS, one composition. A is the reference frame; B, C and D
     * are its three discrimination controls, all in THIS run.
     * -------------------------------------------------------------- */
    const referenceBytes = await exportRealAppPng(page, 'reference-frame');

    // B — the title cleared. Nothing else moves.
    await setCompositionTitle(page, '');
    await expect(titleNode).toHaveCount(0);
    const titleFreeBytes = await exportRealAppPng(
      page,
      'reference-frame-no-title',
    );
    await setCompositionTitle(page, REFERENCE_TITLE);
    await expect(titleNode).toHaveText(REFERENCE_TITLE);

    /*
     * C — both bands off. It earns its export twice: it is the bands-OFF
     * control the band column needs, AND it is the POSITIVE control for the
     * "no legend inside the top band" claim, because with the top band gone
     * `04-12`'s inset drops the legend to y = 32 and its marks land squarely
     * inside the strip that must read zero in the reference frame.
     */
    await setBandVisible(page, 'Top band', false);
    await setBandVisible(page, 'Bottom band', false);
    const bandFreeRender = resolveLegendRender(
      reconcileLegend(shades, createDefaultLegendState()),
      shades,
      resolveBandExtents({
        topBandVisible: false,
        topBandHeight: BAND_DEFAULT_HEIGHT,
        bottomBandVisible: false,
        bottomBandHeight: BAND_DEFAULT_HEIGHT,
      }),
      REFERENCE_LEGEND_FORM,
    );
    expect(bandFreeRender.position.y).toBe(LEGEND_SAFE_INSET);
    await expect(legendLayer).toHaveAttribute(
      'transform',
      `translate(${String(bandFreeRender.position.x)} ${String(bandFreeRender.position.y)})`,
    );
    const bandFreeBytes = await exportRealAppPng(
      page,
      'reference-frame-no-bands',
    );

    /*
     * D — `02-27`'s known-different control, unchanged in technique: the
     * composition lives only in memory, so a real reload really is a blank
     * page. Run through the SAME counters at the SAME thresholds as every
     * measurement above.
     */
    await page.reload();
    await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
      LOGICAL_CORE_COUNT,
    );
    const startCreating = page.getByRole('button', { name: 'Start Creating' });
    if (await startCreating.isVisible()) {
      await startCreating.click();
    }
    await expect(
      page.locator('svg.map-canvas [data-layer="legend"] text'),
    ).toHaveCount(0);
    await expect(titleNode).toHaveCount(0);
    const blankBytes = await exportRealAppPng(page, 'reference-frame-blank');

    /* -------------------------------------------------------------- *
     * 0. THE SIZE CONTRACT, from the IHDR of every downloaded file.
     * -------------------------------------------------------------- */
    for (const bytes of [
      referenceBytes,
      titleFreeBytes,
      bandFreeBytes,
      blankBytes,
    ]) {
      expect(readPngDimensions(bytes)).toEqual({
        width: EXPORT_SIZE,
        height: EXPORT_SIZE,
      });
    }

    /*
     * THE INSTRUMENT ITSELF, first. A flat frame in the water colour, run
     * through the same `countInkAroundRegion` at the same threshold, must read
     * zero ink ANYWHERE — the helper sums inside and outside, so one call
     * validates the counter for every region below rather than only for one.
     */
    await expectBlankControlReadsZeroInk(page, legendRegion, water);

    /* -------------------------------------------------------------- *
     * 1. WATER (04-01 / D4-03)
     * -------------------------------------------------------------- */
    const referenceSamples = await samplePngPoints(page, referenceBytes, [
      oceanPoint,
      uncolouredPoint,
      ...paintedPoints,
    ]);
    const oceanSample = rgbOf(referenceSamples.pixels[0]);
    const uncolouredSample = rgbOf(referenceSamples.pixels[1]);
    const paintedSamples = REFERENCE_PAINTS.map((_, index): ReadonlyArray<number> =>
      rgbOf(referenceSamples.pixels[index + 2]),
    );

    expect(
      oceanSample,
      `the mid-Pacific pixel is rgb(${oceanSample.join(', ')}), not the ` +
        `chosen ${REFERENCE_WATER_PRESET_NAME} ${water}. The creator's water ` +
        'never reached the serialized clone, or was stripped from it.',
    ).toEqual([...hexToRgb(water)]);
    expect(referenceSamples.pixels[0]?.[3], 'the ocean pixel is not opaque.').toBe(
      255,
    );

    /* -------------------------------------------------------------- *
     * 2. THE UNCOLOURED FILL (04-08 / D4-09)
     *
     * Three conjuncts, and the third is what stops a blank map satisfying
     * this: an UNPAINTED world is all uncoloured fill, so "the uncoloured
     * country is grey" is true of a frame with nothing in it. The claim is
     * that the grey is DISTINGUISHABLE — from the water, and from every paint
     * in the same frame.
     * -------------------------------------------------------------- */
    expect(
      uncolouredSample,
      `the Libyan interior is rgb(${uncolouredSample.join(', ')}), not the ` +
        `uncoloured fill ${DEFAULT_UNCOLORED_FILL}.`,
    ).toEqual([...hexToRgb(DEFAULT_UNCOLORED_FILL)]);
    expect(
      uncolouredSample,
      'the uncoloured land and the water are the same colour, so the frame ' +
        'is a flood fill rather than a map.',
    ).not.toEqual([...hexToRgb(water)]);
    paintedSamples.forEach((sample: ReadonlyArray<number>, index: number): void => {
      expect(
        sample,
        `${REFERENCE_PAINTS[index].countryId} exported the UNCOLOURED fill, ` +
          'so nothing in this frame distinguishes painted land from unpainted.',
      ).not.toEqual([...hexToRgb(DEFAULT_UNCOLORED_FILL)]);
    });

    /* -------------------------------------------------------------- *
     * 3. RAMP FILLS AT DIFFERENT STEPS (04-02 / 04-05 / D4-01)
     * -------------------------------------------------------------- */
    paintedSamples.forEach((sample: ReadonlyArray<number>, index: number): void => {
      const paint = REFERENCE_PAINTS[index];
      const expected = rampShade(paint.family, paint.step);
      expect(
        sample,
        `${paint.countryId} exported rgb(${sample.join(', ')}) instead of ` +
          `${paint.family} step ${String(paint.step)} (${expected}).`,
      ).toEqual([...hexToRgb(expected)]);
    });
    expect(
      paintedSamples[0],
      'the two countries painted at DIFFERENT steps of the same ramp exported ' +
        'the same colour, so the step never reached the PNG.',
    ).not.toEqual(paintedSamples[1]);

    /* -------------------------------------------------------------- *
     * 4. QUIET COASTLINE, PRESENT INTERIOR BORDER — in ONE export
     *    (04-08 / 04-09 / D4-07)
     * -------------------------------------------------------------- */
    const coastInk = await countInkAroundRegion(
      page,
      referenceBytes,
      coastRegion,
      DARK_INK_THRESHOLD,
    );
    const inlandInk = await countInkAroundRegion(
      page,
      referenceBytes,
      inlandRegion,
      DARK_INK_THRESHOLD,
    );
    expect(
      coastInk.inside,
      `Australia's west coast carries ${coastInk.inside} dark pixels. ` +
        'Coastlines are set to `none`, so the exporter is painting a stroke ' +
        'the composition did not ask for — the pre-04-08 hard-set defect.',
    ).toBe(0);
    expect(
      inlandInk.inside,
      `the Franco-German border carries ${inlandInk.inside} dark pixels ` +
        `against a floor of ${MIN_INTERIOR_BORDER_INK_PIXELS}. The interior ` +
        'mesh did not reach the PNG.',
    ).toBeGreaterThan(MIN_INTERIOR_BORDER_INK_PIXELS);
    expect(
      inlandInk.inside,
      'the inland border and the coastline carry the same ink, so the two ' +
        'weights are not distinguishable in this export.',
    ).toBeGreaterThan(coastInk.inside);

    /* -------------------------------------------------------------- *
     * 5. THE BAND (04-10 / D4-16), on the bottom band over Antarctica.
     *
     * Presence FIRST and blind to orientation, then the ordering: a deleted
     * band flattens the column, which would otherwise trip the ordering
     * assertion and report an INVERSION — one mutation reddening a claim it is
     * not about.
     * -------------------------------------------------------------- */
    const landLuminance = rec709Luminance(hexToRgb(DEFAULT_UNCOLORED_FILL));
    const waterLuminance = rec709Luminance(hexToRgb(water));
    const sampleBandColumn = async (
      bytes: Buffer,
    ): Promise<ReadonlyArray<number>> => {
      const sample = await samplePngPoints(
        page,
        bytes,
        BOTTOM_BAND_SAMPLE_ROWS.map(
          (row): readonly [number, number] => [bandColumn, row],
        ),
      );
      return sample.pixels.map(rec709Luminance);
    };
    const withBand = await sampleBandColumn(referenceBytes);
    const withoutBand = await sampleBandColumn(bandFreeBytes);
    const [near, mid, far] = withBand;
    if (near === undefined || mid === undefined || far === undefined) {
      throw new Error('the band sampler returned fewer than three rows.');
    }

    withoutBand.forEach((value: number, index: number): void => {
      expect(
        value,
        `bands-off sample ${String(index)} reads ${value.toFixed(3)}, not the ` +
          `uncoloured land at ${landLuminance.toFixed(3)}. LIGHTER means the ` +
          'column has drifted onto ocean, where a band fading from the water ' +
          'colour is invisible by design and every assertion below would be ' +
          'measuring nothing.',
      ).toBeCloseTo(landLuminance, 2);
    });
    expect(
      Math.max(...withoutBand) - Math.min(...withoutBand),
      'the bands-off column is not flat, so the ordering below cannot be ' +
        'attributed to the band.',
    ).toBeLessThanOrEqual(BAND_NOISE_FLOOR);

    const presence = withBand.reduce(
      (total: number, value: number, index: number): number =>
        total + Math.abs(value - (withoutBand[index] ?? value)),
      0,
    );
    expect(
      presence,
      `the band column moved ${presence.toFixed(3)} from its bands-off ` +
        `control against a floor of ${MIN_BAND_PRESENCE}: no band reached the ` +
        'exported PNG at all.',
    ).toBeGreaterThan(MIN_BAND_PRESENCE);
    expect(
      near,
      `the row nearest the bottom edge (${near.toFixed(3)}) is not lighter ` +
        `than the middle row (${mid.toFixed(3)}) — the band is upside down.`,
    ).toBeGreaterThan(mid);
    expect(
      mid,
      `the middle row (${mid.toFixed(3)}) is not lighter than the far row ` +
        `(${far.toFixed(3)}), so the fade is not monotone.`,
    ).toBeGreaterThan(far);
    expect(
      near - far,
      `near-to-far spans only ${(near - far).toFixed(3)} against a floor of ` +
        `${MIN_BAND_NEAR_TO_FAR_DELTA}.`,
    ).toBeGreaterThan(MIN_BAND_NEAR_TO_FAR_DELTA);
    expect(
      near,
      `the most-covered row (${near.toFixed(3)}) did not move towards the ` +
        `creator's water at ${waterLuminance.toFixed(3)}.`,
    ).toBeLessThanOrEqual(waterLuminance + BAND_NOISE_FLOOR);

    /* -------------------------------------------------------------- *
     * 6. THE TITLE (04-11 / D4-15), and the LEGEND/TITLE NON-COLLISION
     *    proven on the bytes rather than in the DOM.
     * -------------------------------------------------------------- */
    const titleInk = await countInkAroundRegion(
      page,
      referenceBytes,
      titleRegion,
      DARK_INK_THRESHOLD,
    );
    const titleFreeInk = await countInkAroundRegion(
      page,
      titleFreeBytes,
      titleRegion,
      DARK_INK_THRESHOLD,
    );
    expect(
      titleInk.inside,
      `the title region carries ${titleInk.inside} ink pixels against a floor ` +
        `of ${MIN_REFERENCE_TITLE_INK_PIXELS}: the title did not reach the PNG.`,
    ).toBeGreaterThan(MIN_REFERENCE_TITLE_INK_PIXELS);
    expect(
      titleFreeInk.inside,
      `with the title cleared the region still carries ${titleFreeInk.inside} ` +
        'ink pixels, so it is measuring geography rather than type.',
    ).toBe(0);

    const legendInk = await countInkAroundRegion(
      page,
      referenceBytes,
      legendRegion,
      DARK_INK_THRESHOLD,
    );
    const legendInkWithoutTitle = await countInkAroundRegion(
      page,
      titleFreeBytes,
      legendRegion,
      DARK_INK_THRESHOLD,
    );
    expect(
      legendInk.inside,
      `the legend's own bounds carry ${legendInk.inside} ink pixels against a ` +
        `floor of ${MIN_REFERENCE_LEGEND_INK_PIXELS}: the legend did not ` +
        'rasterise, so the non-collision claim below would be about an empty ' +
        'box.',
    ).toBeGreaterThan(MIN_REFERENCE_LEGEND_INK_PIXELS);
    /*
     * THE NON-COLLISION, in the exported bytes. Removing the title changed
     * nothing inside the legend's bounds — which it could not do unless the
     * two are genuinely disjoint in the RASTER, not merely in the geometry
     * asserted above. The control that stops this being vacuous is the pair
     * immediately above it: the same counter, the same two frames, saw the
     * title appear and disappear in its own region.
     */
    expect(
      legendInk.inside,
      `clearing the title moved ${Math.abs(legendInk.inside - legendInkWithoutTitle.inside)} ` +
        "pixels inside the legend's own bounds. The title's glyphs are " +
        'overlapping the legend in the exported PNG.',
    ).toBe(legendInkWithoutTitle.inside);

    /* -------------------------------------------------------------- *
     * 7. THE LEGEND (04-12 / 04-13 / D4-12, D4-13), counted in DISJOINT
     *    regions by the marks' own exact colours.
     * -------------------------------------------------------------- */
    const referenceCounts = await countExactColorsInRegions(
      page,
      referenceBytes,
      shades,
      [legendRegion, mapRegion, topBandRegion, titleRegion],
    );
    const [legendCounts, mapCounts, topBandCounts, titleCounts] =
      referenceCounts.regions;
    if (
      legendCounts === undefined ||
      mapCounts === undefined ||
      topBandCounts === undefined ||
      titleCounts === undefined
    ) {
      throw new Error('the region counter returned fewer boxes than requested.');
    }

    shades.forEach((shade: string, index: number): void => {
      expect(
        legendCounts[index],
        `the bar segment for ${shade} measures ${String(legendCounts[index])} ` +
          `pixels inside the legend's bounds against a floor of ` +
          `${MIN_LEGEND_MARK_PIXELS}.`,
      ).toBeGreaterThan(MIN_LEGEND_MARK_PIXELS);
      expect(
        mapCounts[index],
        `${REFERENCE_PAINTS[index].countryId} measures ` +
          `${String(mapCounts[index])} pixels in the map region against a ` +
          `floor of ${MIN_PAINTED_COUNTRY_PIXELS}.`,
      ).toBeGreaterThan(MIN_PAINTED_COUNTRY_PIXELS);
      expect(
        topBandCounts[index],
        `${String(topBandCounts[index])} pixels of ${shade} are inside the ` +
          "top band's extent. The legend has climbed into the title band — " +
          "the collision 04-12's band-derived inset exists to prevent.",
      ).toBe(0);
      expect(
        titleCounts[index],
        `${String(titleCounts[index])} pixels of ${shade} are inside the ` +
          "title's glyph box, so the legend and the title collide.",
      ).toBe(0);
    });

    /*
     * THE POSITIVE CONTROL for the two zeroes above, and it is the one this
     * gate would be worthless without: with the top band OFF the legend drops
     * to y = 32 and its marks land INSIDE the very strip that measured zero.
     * The counter can see legend marks there; in the reference frame there are
     * none to see.
     */
    const bandFreeCounts = await countExactColorsInRegions(
      page,
      bandFreeBytes,
      shades,
      [topBandRegion],
    );
    const [bandFreeTopBandCounts] = bandFreeCounts.regions;
    if (bandFreeTopBandCounts === undefined) {
      throw new Error('the region counter returned no box for the top band.');
    }
    shades.forEach((shade: string, index: number): void => {
      expect(
        bandFreeTopBandCounts[index],
        `with the top band off the legend should sit at y = ` +
          `${String(LEGEND_SAFE_INSET)}, inside the strip — but the counter ` +
          `found ${String(bandFreeTopBandCounts[index])} pixels of ${shade} ` +
          'there. The zero measured in the reference frame proves nothing, ' +
          'because this counter cannot see a legend in this region at all.',
      ).toBeGreaterThan(MIN_LEGEND_MARK_PIXELS);
    });

    /* -------------------------------------------------------------- *
     * 8. `02-27`'s KNOWN-DIFFERENT COMPOSITION, through the same machinery.
     * -------------------------------------------------------------- */
    const blankCounts = await countExactColorsInRegions(
      page,
      blankBytes,
      shades,
      [legendRegion, mapRegion, topBandRegion, titleRegion],
    );
    blankCounts.regions.forEach(
      (counts: ReadonlyArray<number>, region: number): void => {
        counts.forEach((count: number, index: number): void => {
          expect(
            count,
            `the blank composition carries ${String(count)} pixels of ` +
              `${shades[index]} in region ${String(region)}. A reloaded page ` +
              'has no colours at all, so the counter is reading something ' +
              'that is not the composition.',
          ).toBe(0);
        });
      },
    );
    const blankTitleInk = await countInkAroundRegion(
      page,
      blankBytes,
      titleRegion,
      DARK_INK_THRESHOLD,
    );
    expect(blankTitleInk.inside).toBe(0);
    const blankSamples = await samplePngPoints(page, blankBytes, [
      oceanPoint,
      paintedPoints[0] ?? oceanPoint,
    ]);
    expect(
      rgbOf(blankSamples.pixels[0]),
      'the blank export sampled the CHOSEN water at the ocean point, so the ' +
        "water assertion above is not measuring the creator's choice.",
    ).toEqual([...hexToRgb(DEFAULT_SURFACE_COLOR)]);
    expect(
      rgbOf(blankSamples.pixels[1]),
      'the blank export sampled a ramp shade where nothing is painted.',
    ).toEqual([...hexToRgb(DEFAULT_UNCOLORED_FILL)]);
    expect(
      blankCounts.totalNonWhitePixels,
      'the blank export and the reference frame carry the same amount of ' +
        'non-white paint, so the two compositions are indistinguishable.',
    ).not.toBe(referenceCounts.totalNonWhitePixels);
  });
});
