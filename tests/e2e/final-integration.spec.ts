import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, type Download, type Page } from '@playwright/test';

import { DEFAULT_COLOR } from '../../src/constants/colors';
import {
  applyRampShade,
  type RampFamilyLabel,
  LOGICAL_PATH_SELECTOR,
  clearSavedMaps,
  legendDisclosure,
  openRailTool,
  readCameraTransform,
  waitForApp,
  waitForSettledCamera,
  type CameraTransform,
} from './support/appHarness';

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
 * step 4. The hexes and their RGB triples are declared together and derived
 * from the same pair, so a palette change cannot move one and leave the other.
 */
const RED_FAMILY = 'Reds' as const;
const BLUE_FAMILY = 'Blues' as const;
const RAMP_STEP = 4;
const RED = '#DE2D26';
const BLUE = '#2171B5';
const RED_RGB: readonly [number, number, number] = [0xde, 0x2d, 0x26];
const BLUE_RGB: readonly [number, number, number] = [0x21, 0x71, 0xb5];

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

function readPngHeader(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function measurePng(page: Page, bytes: Buffer): Promise<PngRegions> {
  expect(readPngHeader(bytes)).toEqual({
    width: EXPORT_SIZE,
    height: EXPORT_SIZE,
  });

  return page.evaluate(
    async ({
      base64,
      red,
      blue,
      cornerFraction,
      mapStartFraction,
    }): Promise<PngRegions> => {
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        buffer[index] = binary.charCodeAt(index);
      }
      const bitmap = await createImageBitmap(
        new Blob([buffer], { type: 'image/png' }),
      );
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const rendering = canvas.getContext('2d');
      if (rendering === null) {
        throw new Error('2D context is unavailable for PNG inspection.');
      }
      rendering.drawImage(bitmap, 0, 0);

      const pixels = rendering.getImageData(
        0,
        0,
        bitmap.width,
        bitmap.height,
      ).data;
      const cornerX = bitmap.width * cornerFraction;
      const cornerY = bitmap.height * cornerFraction;
      const mapStartX = bitmap.width * mapStartFraction;

      const counts = {
        mapRed: 0,
        mapBlue: 0,
        topLeftRed: 0,
        topLeftBlue: 0,
        bottomRightRed: 0,
        bottomRightBlue: 0,
        totalNonWhite: 0,
      };

      for (let offset = 0; offset < pixels.length; offset += 4) {
        const pixelIndex = offset / 4;
        const x = pixelIndex % bitmap.width;
        const y = (pixelIndex - x) / bitmap.width;
        const pixelRed = pixels[offset];
        const pixelGreen = pixels[offset + 1];
        const pixelBlue = pixels[offset + 2];

        if (pixelRed !== 255 || pixelGreen !== 255 || pixelBlue !== 255) {
          counts.totalNonWhite += 1;
        }

        const isRed =
          pixelRed === red[0] &&
          pixelGreen === red[1] &&
          pixelBlue === red[2];
        const isBlue =
          pixelRed === blue[0] &&
          pixelGreen === blue[1] &&
          pixelBlue === blue[2];
        if (!isRed && !isBlue) {
          continue;
        }

        if (x >= mapStartX) {
          if (isRed) {
            counts.mapRed += 1;
          } else {
            counts.mapBlue += 1;
          }
        }
        if (x < cornerX && y < cornerY) {
          if (isRed) {
            counts.topLeftRed += 1;
          } else {
            counts.topLeftBlue += 1;
          }
        }
        if (
          x >= bitmap.width - cornerX &&
          y >= bitmap.height - cornerY
        ) {
          if (isRed) {
            counts.bottomRightRed += 1;
          } else {
            counts.bottomRightBlue += 1;
          }
        }
      }

      return {
        map: { red: counts.mapRed, blue: counts.mapBlue },
        topLeft: { red: counts.topLeftRed, blue: counts.topLeftBlue },
        bottomRight: {
          red: counts.bottomRightRed,
          blue: counts.bottomRightBlue,
        },
        totalNonWhitePixels: counts.totalNonWhite,
      };
    },
    {
      base64: bytes.toString('base64'),
      red: [...RED_RGB],
      blue: [...BLUE_RGB],
      cornerFraction: CORNER_FRACTION,
      mapStartFraction: MAP_REGION_START_FRACTION,
    },
  );
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
  const country = page.locator(
    `path.country-path[data-country-id="${countryId}"]`,
  );
  await country.focus();
  await country.press('Enter');
  // D-18 opens the panel CLOSED, so a colour is applied through its rail tool.
  await openRailTool(page, 'Colors');
  await applyRampShade(page, family, RAMP_STEP);
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
  await expect(germany).toHaveAttribute('fill', DEFAULT_COLOR);
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
  expect(undone.regions.topLeft.red).toBe(authored.regions.topLeft.red);

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
  await expect(france).toHaveAttribute('fill', DEFAULT_COLOR);
  await expect(germany).toHaveAttribute('fill', DEFAULT_COLOR);
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
