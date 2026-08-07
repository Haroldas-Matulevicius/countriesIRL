import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, type Download, type Page } from '@playwright/test';

import { EXPORT_FONT_FACE_SUPPRESSION_FLAG } from '../../src/constants/config';
import {
  DEFAULT_SURFACE_COLOR,
  WATER_PRESETS,
} from '../../src/constants/mapStyle';
import { createWorldProjection } from '../../src/utils/mapProjection';
import {
  LEGEND_CHARACTERS_PER_LINE,
  resolveLegendRender,
} from '../../src/utils/legend';
import type { LegendState } from '../../src/types/composition';
import { openRailTool, waitForApp } from './support/appHarness';

const EXPORT_FIXTURE_URL = '/tests/e2e/fixtures/export.html';
const EXPORT_ARTIFACT_ROOT = resolve('.artifacts/playwright/downloads');
const EXPORT_SIZE = 1080;
const LOGICAL_CORE_COUNT = 207;
const VISIBLE_MODERN_UNIT_COUNT = 248;
// Every visible unit is drawn three times (-360°, 0°, +360°) so a Pacific
// composition has no seam at the date line.
const WRAPPED_PATH_COUNT = VISIBLE_MODERN_UNIT_COUNT * 3;
// Mirrors `src/constants/colors.ts`. Restated here so the E2E asserts the
// literal the PNG must carry rather than importing the value under test.
const DEFAULT_BORDER_COLOR = '#000000';
const UNNAMED_FILENAME = 'CountriesIRL_2026-07-21.png';
const LEGEND_LABEL = 'Pacific route';
const DATE_LINE_COUNTRY = 'FJI';
/*
 * Restated here rather than imported, exactly like `DEFAULT_BORDER_COLOR` and
 * for the same reason the suppression flag's NAME lives in `constants/config`:
 * importing from `src/styles/interFontFace.ts` would drag two base64-inlined
 * woff2 files into this node-side spec. This is the literal the PNG must carry.
 */
const EXPORT_FONT_FAMILY = 'Inter';
/** The first block of the vendored latin-ext subset's range (04-04). */
const LATIN_EXT_RANGE_START = 'U+0100-02BA';
/**
 * Every INKED character is latin-ext (U+0100-02BA); the spaces are latin-1 but
 * draw nothing. See the claim-2 test for why a realistic mixed string such as
 * `Košice` would make that assertion unable to fail on its own subject.
 */
const LATIN_EXT_PROBE_LABEL = 'ŠŁŹČĘȘ šłźčęș';

interface CloneFontStyleSummary {
  readonly isFirstChild: boolean;
  readonly hasFontFace: boolean;
  readonly hasWoff2DataUrl: boolean;
}

interface CloneFontFace {
  readonly family: string | null;
  readonly unicodeRange: string | null;
  readonly hasWoff2DataUrl: boolean;
}

interface CloneSummary {
  readonly svgCount: number;
  readonly frameBackgroundColor: string;
  readonly fontStyle: CloneFontStyleSummary | null;
  readonly fontFaces: ReadonlyArray<CloneFontFace>;
  readonly layerOrder: ReadonlyArray<string | null>;
  readonly cameraTransform: string | null;
  readonly legendTransform: string | null;
  readonly legendTexts: ReadonlyArray<string | null>;
  readonly legendEditorOnly: number;
  readonly scenePathCount: number;
  readonly pathKindCounts: Record<string, number>;
  readonly emptyGeometryCount: number;
  readonly strokes: ReadonlyArray<string | null>;
  readonly strokeWidths: ReadonlyArray<string | null>;
  readonly vectorEffects: number;
  readonly roles: number;
  readonly tabStops: number;
  readonly focusables: number;
  readonly titles: number;
  readonly ariaAttributes: number;
  readonly ids: number;
  readonly editorOnly: number;
  readonly outgoingScenes: number;
  readonly selectionClasses: number;
}

type ExportOutcome =
  | { ok: true; filename: string }
  | { ok: false; reason: string };

declare global {
  interface Window {
    __exportFixture: {
      readonly lastClone: CloneSummary | null;
      readonly bodyFrameCount: number;
      readonly anchorCount: number;
      readonly legendState: LegendState;
      setLegendLabel(label: string): void;
      setLegendTextSize(textSize: LegendState['textSize']): void;
      selectCountry(countryId: string): void;
      showDateLine(): boolean;
      showOcean(): boolean;
      run(mapName?: string): Promise<ExportOutcome>;
      moveLegendOutsideCanvas(): boolean;
      failBlobEncoding(): void;
      failObjectUrl(): void;
      failAnchorClick(): void;
      failCanvasContext(): void;
    };
  }
}

async function openExportFixture(page: Page): Promise<void> {
  await page.goto(EXPORT_FIXTURE_URL);
  await expect(page.locator('path.country-path[role="option"]')).toHaveCount(
    LOGICAL_CORE_COUNT,
  );
  await expect(page.locator('path.scene-path')).toHaveCount(WRAPPED_PATH_COUNT);
  await expect(page.locator('[data-layer="legend"] text')).toHaveText(
    LEGEND_LABEL,
  );
}

async function runExport(page: Page, mapName?: string): Promise<ExportOutcome> {
  return page.evaluate(
    (name): Promise<ExportOutcome> => window.__exportFixture.run(name),
    mapName,
  );
}

async function readClone(page: Page): Promise<CloneSummary> {
  const summary = await page.evaluate(
    (): CloneSummary | null => window.__exportFixture.lastClone,
  );
  if (summary === null) {
    throw new Error('No export clone was handed to the rasteriser.');
  }
  return summary;
}

function readPngDimensions(bytes: Buffer): { width: number; height: number } {
  const signature = bytes.subarray(0, 8).toString('hex');
  expect(signature).toBe('89504e470d0a1a0a');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

interface CornerSample {
  readonly width: number;
  readonly height: number;
  readonly corners: ReadonlyArray<ReadonlyArray<number>>;
}

interface PointSample {
  readonly width: number;
  readonly height: number;
  readonly pixels: ReadonlyArray<ReadonlyArray<number>>;
}

/**
 * The ONE arbitrary-point sampler. `04-01` generalised it out of
 * `samplePngCorners`, which now calls it: two PNG decode paths in one spec is
 * how a "sampled pixel" assertion quietly starts measuring a differently
 * decoded image from the one beside it.
 *
 * `null` for the point list means the four corners.
 */
async function samplePngPoints(
  page: Page,
  bytes: Buffer,
  points: ReadonlyArray<readonly [number, number]> | null,
): Promise<PointSample> {
  return page.evaluate(
    async ({
      base64,
      requested,
    }: {
      base64: string;
      requested: ReadonlyArray<readonly [number, number]> | null;
    }): Promise<PointSample> => {
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
      const context = canvas.getContext('2d');
      if (context === null) {
        throw new Error('2D context is unavailable for PNG inspection.');
      }
      context.drawImage(bitmap, 0, 0);
      const points =
        requested ??
        ([
          [0, 0],
          [bitmap.width - 1, 0],
          [0, bitmap.height - 1],
          [bitmap.width - 1, bitmap.height - 1],
        ] as ReadonlyArray<readonly [number, number]>);
      return {
        width: bitmap.width,
        height: bitmap.height,
        pixels: points.map(([x, y]): ReadonlyArray<number> => [
          ...context.getImageData(x, y, 1, 1).data,
        ]),
      };
    },
    { base64: bytes.toString('base64'), requested: points },
  );
}

async function samplePngCorners(
  page: Page,
  bytes: Buffer,
): Promise<CornerSample> {
  const sample = await samplePngPoints(page, bytes, null);
  return {
    width: sample.width,
    height: sample.height,
    corners: sample.pixels,
  };
}

async function saveDownload(download: Download, name: string): Promise<Buffer> {
  const target = resolve(EXPORT_ARTIFACT_ROOT, name);
  await download.saveAs(target);
  return readFile(target);
}

const LEGEND_ENTRY_COLOR = '#DC2626';
/** Any channel below this is ink; above it is white or anti-alias halo. */
const INK_CHANNEL_THRESHOLD = 240;

interface RegionInkCounts {
  readonly inside: number;
  readonly outside: number;
}

interface LegendRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Count ink pixels inside vs outside a region (with a small margin for the
 * centered border stroke and anti-aliasing). Used by the overflow backstop:
 * with only ocean in frame, ALL ink belongs to the legend, so `outside`
 * measures exactly the overflow that would clip a real composition.
 */
async function countInkAroundRegion(
  page: Page,
  bytes: Buffer,
  region: LegendRegion,
  /**
   * `04-01` made this a parameter. The legend backstop wants "anything not
   * white" (240); the water gate wants "map ink" (`DARK_INK_THRESHOLD`),
   * because a light water tint such as #F5EFE6 has two channels below 240 and
   * would otherwise count the entire ocean as content. One counter, two
   * thresholds - a second counting function is how a blank control ends up
   * validating a different counter from the one it is meant to police.
   */
  inkThreshold: number = INK_CHANNEL_THRESHOLD,
): Promise<RegionInkCounts> {
  return page.evaluate(
    async ({ base64, box, threshold }): Promise<RegionInkCounts> => {
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
      const context = canvas.getContext('2d');
      if (context === null) {
        throw new Error('2D context is unavailable for PNG inspection.');
      }
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;

      const margin = 4;
      const counts = { inside: 0, outside: 0 };
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const isInk =
          pixels[offset] < threshold ||
          pixels[offset + 1] < threshold ||
          pixels[offset + 2] < threshold;
        if (!isInk) {
          continue;
        }
        const pixelIndex = offset / 4;
        const x = pixelIndex % bitmap.width;
        const y = (pixelIndex - x) / bitmap.width;
        const inRegion =
          x >= box.x - margin &&
          x <= box.x + box.width + margin &&
          y >= box.y - margin &&
          y <= box.y + box.height + margin;
        if (inRegion) {
          counts.inside += 1;
        } else {
          counts.outside += 1;
        }
      }
      return counts;
    },
    {
      base64: bytes.toString('base64'),
      box: region,
      threshold: inkThreshold,
    },
  );
}

interface LegendCropMeasurement {
  readonly inkA: number;
  readonly inkB: number;
  readonly inkBlank: number;
  readonly diffAB: number;
  readonly diffABlank: number;
  readonly diffBBlank: number;
}

/**
 * The ONE legend-crop comparator. Both font gates run through it: assertion 25
 * (does the embedded font change the raster at all?) and `04-04`'s latin-ext
 * claim (do the embedded faces draw the latin-ext glyphs?). Extracted rather
 * than copied, for the same reason `samplePngPoints` was generalised — two PNG
 * decode paths in one spec is how a "sampled pixel" assertion quietly starts
 * measuring a differently decoded image from the one beside it.
 *
 * The blank crop is an all-white buffer of the SAME size run through the SAME
 * counter, so it validates the instrument rather than merely sitting beside it.
 */
async function measureLegendCrops(
  page: Page,
  a: Buffer,
  b: Buffer,
  box: LegendRegion,
): Promise<LegendCropMeasurement> {
  return page.evaluate(
    async ({
      first,
      second,
      region,
      threshold,
    }: {
      first: string;
      second: string;
      region: LegendRegion;
      threshold: number;
    }): Promise<LegendCropMeasurement> => {
      const decode = async (base64: string): Promise<ImageData> => {
        const binary = atob(base64);
        const buffer = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          buffer[index] = binary.charCodeAt(index);
        }
        const bitmap = await createImageBitmap(
          new Blob([buffer], { type: 'image/png' }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = region.width;
        canvas.height = region.height;
        const context = canvas.getContext('2d');
        if (context === null) {
          throw new Error('2D context is unavailable for PNG inspection.');
        }
        // Crop to the legend region while drawing.
        context.drawImage(
          bitmap,
          region.x,
          region.y,
          region.width,
          region.height,
          0,
          0,
          region.width,
          region.height,
        );
        return context.getImageData(0, 0, region.width, region.height);
      };

      const countInk = (crop: ImageData): number => {
        let ink = 0;
        for (let offset = 0; offset < crop.data.length; offset += 4) {
          if (
            crop.data[offset] < threshold ||
            crop.data[offset + 1] < threshold ||
            crop.data[offset + 2] < threshold
          ) {
            ink += 1;
          }
        }
        return ink;
      };

      const countDiff = (left: ImageData, right: ImageData): number => {
        let differing = 0;
        for (let offset = 0; offset < left.data.length; offset += 4) {
          if (
            Math.abs(left.data[offset] - right.data[offset]) > 8 ||
            Math.abs(left.data[offset + 1] - right.data[offset + 1]) > 8 ||
            Math.abs(left.data[offset + 2] - right.data[offset + 2]) > 8
          ) {
            differing += 1;
          }
        }
        return differing;
      };

      const cropA = await decode(first);
      const cropB = await decode(second);
      // The deliberately blank crop: an all-white buffer of the same size, run
      // through the SAME counting machinery. It validates the instrument — a
      // counter that reads ink into anything fails on it — and it is what the
      // two real crops must both differ from.
      const blankCrop = new ImageData(region.width, region.height);
      blankCrop.data.fill(255);

      return {
        inkA: countInk(cropA),
        inkB: countInk(cropB),
        inkBlank: countInk(blankCrop),
        diffAB: countDiff(cropA, cropB),
        diffABlank: countDiff(cropA, blankCrop),
        diffBBlank: countDiff(cropB, blankCrop),
      };
    },
    {
      first: a.toString('base64'),
      second: b.toString('base64'),
      region: box,
      threshold: INK_CHANNEL_THRESHOLD,
    },
  );
}

/** The legend crop bounds, derived from `resolveLegendRender` — never hard-coded. */
async function resolveLegendRegion(page: Page): Promise<LegendRegion> {
  const legendState = await page.evaluate(
    (): LegendState => window.__exportFixture.legendState,
  );
  const render = resolveLegendRender(legendState, [LEGEND_ENTRY_COLOR]);
  return {
    x: render.position.x,
    y: render.position.y,
    width: render.bounds.width,
    height: render.bounds.height,
  };
}

test.describe('PNG export', (): void => {
  test('a Pacific composition downloads an exact opaque 1080 square PNG', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    await page.evaluate((): void => {
      window.__exportFixture.selectCountry('FRA');
    });
    expect(await page.evaluate((): boolean => window.__exportFixture.showDateLine())).toBe(
      true,
    );
    await expect(
      page.locator(`path.country-path[data-country-id="${DATE_LINE_COUNTRY}"]`),
    ).toHaveCount(1);

    const downloadPromise = page.waitForEvent('download');
    const result = await runExport(page);
    expect(result).toEqual({ ok: true, filename: UNNAMED_FILENAME });

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(UNNAMED_FILENAME);

    const bytes = await saveDownload(download, UNNAMED_FILENAME);
    expect(readPngDimensions(bytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });

    const sample = await samplePngCorners(page, bytes);
    expect(sample.width).toBe(EXPORT_SIZE);
    expect(sample.height).toBe(EXPORT_SIZE);
    /*
     * OPACITY is the claim this corner sample has always carried - the three
     * white export layers, proven on real bytes rather than on a `toBlob`
     * success. It is asserted on every corner, unchanged.
     *
     * The COLOUR half moved with `04-09`, and the assertion got SHARPER rather
     * than looser. MEASURED, not assumed: in the Pacific framing the two TOP
     * corners sit over uncoloured land (northern Russia / Alaska) and the two
     * BOTTOM corners over the Southern Ocean. Both read `#FFFFFF` before this
     * plan, because an uncoloured country and the water were the same white -
     * so this sample could not tell land from sea at all. Since D4-10 every
     * Modern unit is colourable and since D4-09 an uncoloured one paints
     * `#E5E7EB`, so the four corners now discriminate: two prove the uncoloured
     * fill reached the rasterised pixels and two prove the water did.
     */
    sample.corners.forEach((corner): void => {
      expect(corner[3], 'the PNG is not opaque at a corner.').toBe(255);
    });
    const [topLeft, topRight, bottomLeft, bottomRight] = sample.corners;
    const uncoloredCorner = [...hexToRgb(DEFAULT_UNCOLORED_FILL_HEX), 255];
    const waterCorner = [...hexToRgb(DEFAULT_SURFACE_COLOR), 255];
    expect(uncoloredCorner).not.toEqual(waterCorner);
    expect(topLeft, 'the top-left corner is over uncoloured land').toEqual(
      uncoloredCorner,
    );
    expect(topRight, 'the top-right corner is over uncoloured land').toEqual(
      uncoloredCorner,
    );
    expect(bottomLeft, 'the bottom-left corner is open water').toEqual(
      waterCorner,
    );
    expect(bottomRight, 'the bottom-right corner is open water').toEqual(
      waterCorner,
    );

    // Every resource the transaction created is gone once it resolves.
    expect(await page.evaluate((): number => window.__exportFixture.bodyFrameCount)).toBe(0);
    expect(await page.evaluate((): number => window.__exportFixture.anchorCount)).toBe(0);
  });

  test('a named composition downloads under its sanitized filename', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);

    const downloadPromise = page.waitForEvent('download');
    const result = await runExport(page, 'Baltic  Tour /2026!');
    expect(result).toEqual({ ok: true, filename: 'Baltic_Tour_2026_2026-07-21.png' });

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Baltic_Tour_2026_2026-07-21.png');
    const bytes = await saveDownload(download, 'Baltic_Tour_2026_2026-07-21.png');
    expect(readPngDimensions(bytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });
  });

  test('the captured clone keeps wrapped geography and drops duplicate semantics', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    await page.evaluate((): void => {
      window.__exportFixture.selectCountry('FRA');
    });
    await expect(page.locator('path.country-path.selected')).toHaveCount(1);
    // The live legend is inside the canonical SVG, never a sibling overlay.
    await expect(
      page.locator('div.map-export-source > [data-layer="legend"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('svg.map-canvas > [data-layer="legend"]'),
    ).toHaveCount(1);

    const legendTransform = await page
      .locator('svg.map-canvas > [data-layer="legend"]')
      .getAttribute('transform');
    page.on('download', (download): void => {
      void download.cancel();
    });
    const result = await runExport(page);
    expect(result.ok).toBe(true);

    const clone = await readClone(page);

    expect(clone.svgCount).toBe(1);
    // Chromium serializes the opaque white frame background as rgb().
    expect(clone.frameBackgroundColor).toBe('rgb(255, 255, 255)');
    // The leading null is the injected export `<style>` (no data-layer): it
    // shifts the camera and legend indices EQUALLY, so camera-before-legend
    // still holds. Re-baselined deliberately by 03-11 (D-34/D-25).
    // `04-01` adds `rect[data-layer="surface"]` (D4-03): a sibling inserted
    // BEFORE the camera, so it shifts camera and legend equally too and the
    // order check still holds. Re-baselined with the layer named, not widened
    // to a "contains" check - the ORDER is the contract.
    expect(clone.layerOrder).toEqual([null, 'surface', 'camera', 'legend']);
    expect(clone.legendTransform).toBe(legendTransform);
    expect(clone.legendTexts).toEqual([LEGEND_LABEL]);
    expect(clone.legendEditorOnly).toBe(0);

    // Geometry: nothing visible was dropped, nothing is an empty path.
    expect(clone.scenePathCount).toBe(WRAPPED_PATH_COUNT);
    expect(clone.pathKindCounts).toEqual({
      logical: LOGICAL_CORE_COUNT,
      decorative: WRAPPED_PATH_COUNT - LOGICAL_CORE_COUNT,
    });
    expect(clone.emptyGeometryCount).toBe(0);
    expect(clone.cameraTransform).not.toBeNull();

    // Seam-free borders: the selected country's wrapped repeats are normalized
    // to the same default border as its primary copy.
    expect(clone.strokes).toEqual([DEFAULT_BORDER_COLOR]);
    expect(clone.strokeWidths).toEqual(['0.75']);
    // Every scene path keeps `non-scaling-stroke`. The camera layer wraps them
    // in `scale(zoom)`; without it a border is drawn `zoom` user units wide and
    // a composition framed at 8x downloads outlines eight times heavier than
    // the ones on screen.
    expect(clone.vectorEffects).toBe(WRAPPED_PATH_COUNT);
    expect(clone.selectionClasses).toBe(0);

    // Semantics: no duplicate accessibility tree, no editor state, no outgoing
    // crossfade scene.
    expect(clone.roles).toBe(0);
    expect(clone.tabStops).toBe(0);
    expect(clone.focusables).toBe(0);
    expect(clone.titles).toBe(0);
    expect(clone.ariaAttributes).toBe(0);
    expect(clone.ids).toBe(0);
    expect(clone.editorOnly).toBe(0);
    expect(clone.outgoingScenes).toBe(0);
  });

  test('a legend rendered beside the canonical SVG is refused before capture', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    expect(
      await page.evaluate((): boolean =>
        window.__exportFixture.moveLegendOutsideCanvas(),
      ),
    ).toBe(true);

    expect(await runExport(page)).toEqual({
      ok: false,
      reason: 'invalid-composition',
    });

    expect(await page.evaluate((): CloneSummary | null => window.__exportFixture.lastClone)).toBeNull();
    expect(await page.evaluate((): number => window.__exportFixture.bodyFrameCount)).toBe(0);
  });

  test('a blocked canvas context fails as capture-failed and cleans the frame', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    await page.evaluate((): void => {
      window.__exportFixture.failCanvasContext();
    });

    expect(await runExport(page)).toEqual({
      ok: false,
      reason: 'capture-failed',
    });

    expect(await page.evaluate((): number => window.__exportFixture.bodyFrameCount)).toBe(0);
    expect(await page.evaluate((): number => window.__exportFixture.anchorCount)).toBe(0);
  });

  test('a null PNG blob fails as encoding-failed without a download', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    await page.evaluate((): void => {
      window.__exportFixture.failBlobEncoding();
    });

    expect(await runExport(page)).toEqual({
      ok: false,
      reason: 'encoding-failed',
    });

    expect(await page.evaluate((): number => window.__exportFixture.bodyFrameCount)).toBe(0);
    expect(await page.evaluate((): number => window.__exportFixture.anchorCount)).toBe(0);
  });

  test('a blocked object URL fails without leaking the export frame', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    await page.evaluate((): void => {
      window.__exportFixture.failObjectUrl();
    });

    expect(await runExport(page)).toEqual({
      ok: false,
      reason: 'encoding-failed',
    });

    expect(await page.evaluate((): number => window.__exportFixture.bodyFrameCount)).toBe(0);
    expect(await page.evaluate((): number => window.__exportFixture.anchorCount)).toBe(0);
  });

  test('a blocked anchor click never reports a false success', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    await page.evaluate((): void => {
      window.__exportFixture.failAnchorClick();
    });

    expect(await runExport(page)).toEqual({
      ok: false,
      reason: 'encoding-failed',
    });

    expect(await page.evaluate((): number => window.__exportFixture.bodyFrameCount)).toBe(0);
    expect(await page.evaluate((): number => window.__exportFixture.anchorCount)).toBe(0);
  });

  test('assertion 25: the exported legend renders in Inter, measured on rasterised pixels', async ({
    page,
  }): Promise<void> => {
    /*
     * The cheap version — "the clone's markup names Inter" — is green whether
     * or not the font resolves; the legend has named Inter since Phase 2
     * while the export silently fell back. So the gate is two-part, and the
     * pixel half is the load-bearing one.
     */
    await openExportFixture(page);
    // A label with distinctive Inter advance widths (the OQ-1 probe string).
    const probeLabel = 'Wig 111 fjord';
    await page.evaluate((label: string): void => {
      window.__exportFixture.setLegendLabel(label);
    }, probeLabel);
    await expect(page.locator('[data-layer="legend"] text')).toHaveText(
      probeLabel,
    );

    // Export 1 — the normal path.
    const normalDownload = page.waitForEvent('download');
    expect((await runExport(page)).ok).toBe(true);
    const normalBytes = await saveDownload(
      await normalDownload,
      `assertion25-font-${UNNAMED_FILENAME}`,
    );

    // Part 1 — structural, via the fixture's MutationObserver on the REAL
    // clone: svg.map-canvas > style, first child, @font-face with inline
    // woff2 bytes. Soft, so a single injection deletion reports BOTH parts
    // red in one run instead of aborting before the pixel half.
    const normalClone = await readClone(page);
    expect
      .soft(normalClone.fontStyle)
      .toEqual({
        isFirstChild: true,
        hasFontFace: true,
        hasWoff2DataUrl: true,
      });

    // Export 2 — the SAME browser context, with the embedded @font-face
    // suppressed through the test-only seam.
    await page.evaluate((flag: string): void => {
      Reflect.set(window, flag, true);
    }, EXPORT_FONT_FACE_SUPPRESSION_FLAG);
    const suppressedDownload = page.waitForEvent('download');
    expect((await runExport(page)).ok).toBe(true);
    const suppressedBytes = await saveDownload(
      await suppressedDownload,
      `assertion25-suppressed-${UNNAMED_FILENAME}`,
    );
    const suppressedClone = await readClone(page);
    expect(suppressedClone.fontStyle).toBeNull();
    await page.evaluate((flag: string): void => {
      Reflect.deleteProperty(window, flag);
    }, EXPORT_FONT_FACE_SUPPRESSION_FLAG);

    // Part 2 — crop both PNGs to the legend region, derived from
    // resolveLegendRender applied to the live legend state. Never hard-coded.
    const region = await resolveLegendRegion(page);
    const measured = await measureLegendCrops(
      page,
      normalBytes,
      suppressedBytes,
      region,
    );

    // Content floor FIRST: two blank corners satisfy "they differ" perfectly,
    // and that exact defect shape has shipped here once.
    expect(
      measured.inkA,
      'the Inter-embedded legend crop is blank',
    ).toBeGreaterThan(500);
    expect(
      measured.inkB,
      'the font-suppressed legend crop is blank',
    ).toBeGreaterThan(500);

    // The load-bearing inequality: suppressing the embedded @font-face must
    // CHANGE the rasterised legend pixels. If Chrome ignored the data-URI
    // font, both runs fall back identically and this reads ~0.
    expect(
      measured.diffAB,
      'the embedded @font-face did not change the rasterised legend — ' +
        'Inter never resolved in the exported PNG',
    ).toBeGreaterThan(200);

    // Blank-crop discrimination control: the counting machinery reads the
    // blank as blank, and both real crops differ from it.
    expect(measured.inkBlank).toBe(0);
    expect(measured.diffABlank).toBeGreaterThan(500);
    expect(measured.diffBBlank).toBeGreaterThan(500);
  });

  test('04-04 claim 1: the clone carries two unicode-range font faces for one family', async ({
    page,
  }): Promise<void> => {
    /*
     * Structural half of the latin-ext gate (D4-15). Read off the REAL clone
     * as it lands in the body, via the fixture's MutationObserver — never by
     * stubbing and never off the source file.
     *
     * Two faces for ONE family is the whole shape: Google Fonts splits Inter
     * by codepoint range, so latin and latin-ext are separate vendored files.
     * Every part of that sentence is asserted, because each can break
     * silently and separately: the COUNT (a dropped face), the FAMILY (two
     * families instead of one split family), the inlined BYTES (an
     * un-inlined face draws nothing in an isolated document that can issue no
     * request), and the RANGES (a second face repeating the first's range is
     * a no-op that still counts as two).
     */
    await openExportFixture(page);
    expect((await runExport(page)).ok).toBe(true);
    const clone = await readClone(page);

    expect(
      clone.fontFaces,
      'the export clone does not carry exactly two @font-face rules — ' +
        'latin-ext coverage is missing from the rasterised PNG',
    ).toHaveLength(2);
    expect(
      clone.fontFaces.map((face: CloneFontFace): string | null => face.family),
      'the two faces do not both name Inter, so a second FAMILY was added ' +
        'rather than one family split by codepoint range',
    ).toStrictEqual([EXPORT_FONT_FAMILY, EXPORT_FONT_FAMILY]);
    expect(
      clone.fontFaces.every(
        (face: CloneFontFace): boolean => face.hasWoff2DataUrl,
      ),
      'a face is not carrying inlined woff2 bytes — the isolated export ' +
        'document can issue no request, so that face draws nothing',
    ).toBe(true);

    const ranges = clone.fontFaces.map(
      (face: CloneFontFace): string | null => face.unicodeRange,
    );
    expect(
      ranges.every((range: string | null): boolean => range !== null),
      'a face is missing its unicode-range — without one the two faces ' +
        'collapse to "last declaration wins" instead of dividing the ' +
        'character space between them',
    ).toBe(true);
    expect(
      ranges[0],
      'both faces carry the SAME unicode-range, so the second can never be ' +
        'selected and ships bytes for nothing',
    ).not.toBe(ranges[1]);
    expect(
      ranges.some((range: string | null): boolean =>
        (range ?? '').includes(LATIN_EXT_RANGE_START),
      ),
      `no face covers ${LATIN_EXT_RANGE_START} — the latin-ext diacritics ` +
        'D4-15 exists for still fall back mid-string',
    ).toBe(true);
  });

  test('04-04 claim 2: the embedded faces draw a latin-ext string, measured on font pixels', async ({
    page,
  }): Promise<void> => {
    /*
     * Rasterisation half of the latin-ext gate. Same shape as assertion 25 —
     * content floor, then the inequality, then the blank control — through
     * the same `measureLegendCrops` machinery.
     *
     * WHY THE LABEL IS PURE LATIN-EXT, and not `Košice / Łódź / Magyarország`
     * as 04-04-PLAN.md Task 3 suggested. Those strings are mostly latin-1, so
     * embedding the font changes their raster whether or not the latin-ext
     * face resolves — the assertion would stay GREEN with the latin-ext range
     * narrowed to nothing, which is precisely the "cannot fail on its own
     * subject" shape this repo keeps shipping. Every INKED glyph below sits in
     * U+0100-02BA, so the only thing that can draw it is the latin-ext face:
     * š (Košice), ł and ź (Łódź), plus č ę ș. `ó` and `á` are deliberately
     * EXCLUDED — they are latin-1 and would contaminate the measurement.
     * Spaces are latin-1 but contribute no ink.
     *
     * ⚠ WHAT THIS DOES AND DOES NOT PROVE. It proves the embedded faces
     * CHANGED the raster for a latin-ext string — i.e. these vendored bytes,
     * not the fallback stack, are what drew those glyphs. It does NOT prove
     * the glyphs are CORRECT. Only a human opening an exported PNG and
     * looking at the diacritics can say that. That is requirement A12
     * (`04-UI-SPEC.md` § 8), a ⛔ PHYSICAL CHECK scheduled in plan 04-16 and
     * one of the nine Phase 3 UAT cells that were NEVER PERFORMED. Skipped is
     * not passed, it cannot be inherited, and this automated result may never
     * be substituted for it.
     */
    await openExportFixture(page);
    await page.evaluate((label: string): void => {
      window.__exportFixture.setLegendLabel(label);
    }, LATIN_EXT_PROBE_LABEL);
    await expect(page.locator('[data-layer="legend"] text')).toHaveText(
      LATIN_EXT_PROBE_LABEL,
    );

    // Export 1 — both faces embedded.
    const embeddedDownload = page.waitForEvent('download');
    expect((await runExport(page)).ok).toBe(true);
    const embeddedBytes = await saveDownload(
      await embeddedDownload,
      `latin-ext-embedded-${UNNAMED_FILENAME}`,
    );

    // Export 2 — the SAME composition with the font embedding suppressed, so
    // every glyph falls back. Same browser context, same run.
    await page.evaluate((flag: string): void => {
      Reflect.set(window, flag, true);
    }, EXPORT_FONT_FACE_SUPPRESSION_FLAG);
    const suppressedDownload = page.waitForEvent('download');
    expect((await runExport(page)).ok).toBe(true);
    const suppressedBytes = await saveDownload(
      await suppressedDownload,
      `latin-ext-suppressed-${UNNAMED_FILENAME}`,
    );
    await page.evaluate((flag: string): void => {
      Reflect.deleteProperty(window, flag);
    }, EXPORT_FONT_FACE_SUPPRESSION_FLAG);

    const region = await resolveLegendRegion(page);
    const measured = await measureLegendCrops(
      page,
      embeddedBytes,
      suppressedBytes,
      region,
    );

    /*
     * Thresholds are derived from THIS change's measurement, never guessed.
     * Measured 2026-08-06 on installed Chrome 151.0.7922.75, this exact
     * composition and this exact label:
     *
     *   inkA (both faces embedded) = 6,268   inkB (font suppressed) = 6,065
     *   diffAB                     = 2,979   inkBlank               = 0
     *   diffABlank                 = 6,877   diffBBlank             = 6,685
     *
     * Every floor below sits at roughly a third of its measured value — margin
     * for anti-aliasing and font-version drift, not a number chosen to pass.
     * (`diffABlank` exceeds `inkA` because the diff counter registers any
     * channel moving more than 8 from white, which includes the red swatch and
     * pale anti-alias haloes that the <240 ink counter correctly ignores.)
     */
    expect(
      measured.inkA,
      'the latin-ext legend crop is blank with the faces embedded — two ' +
        'blank crops satisfy "they differ" perfectly, so this floor comes first',
    ).toBeGreaterThan(2000);
    expect(
      measured.inkB,
      'the latin-ext legend crop is blank with the font suppressed — the ' +
        'fallback must still draw something for the comparison to mean anything',
    ).toBeGreaterThan(2000);

    // The load-bearing inequality. Every inked glyph here is latin-ext, so
    // this can only move if the latin-ext face is SELECTED, not merely present.
    expect(
      measured.diffAB,
      'suppressing the embedded faces did not change the rasterised ' +
        'latin-ext string — the latin-ext face is present but never selected, ' +
        'and those glyphs are still being drawn by the fallback stack',
    ).toBeGreaterThan(1000);

    // Blank-crop discrimination control, through the same counter.
    expect(
      measured.inkBlank,
      'the ink counter reads ink into an all-white buffer, so every count ' +
        'above is untrustworthy',
    ).toBe(0);
    expect(measured.diffABlank).toBeGreaterThan(2000);
    expect(measured.diffBBlank).toBeGreaterThan(2000);
  });

  test('CF-2: the latin subset FILE alone cannot draw latin-ext — why 04-04 added a second face', async ({
    page,
  }): Promise<void> => {
    /*
     * This test's SUBJECT is one file: `inter-latin-variable.woff2`, embedded
     * on its own. That file stops at U+00FF and always will, so embedding it
     * changes latin glyphs ('sss') and does NOT change latin-ext glyphs
     * ('ššš') — 'š' falls back to the same generic face either way.
     *
     * 04-04 UPDATE (D4-15). Written in Phase 3 this pinned a shipped
     * limitation; it now pins the MEASUREMENT that justified widening. The
     * export path no longer behaves this way — it embeds a second,
     * latin-ext-scoped face beside this one, and `04-04 claim 2` above proves
     * that face is what draws those glyphs. Keep both: this one still catches
     * a latin subset that silently changes coverage, and it is deliberately
     * NOT routed through the export builder, so it cannot go green just
     * because the second face exists.
     *
     * Still no full-Unicode claim: Greek, Cyrillic, Vietnamese precomposed
     * forms and CJK are not vendored at all.
     */
    await page.goto('/');
    const fontBase64 = readFileSync(
      resolve('src/assets/inter-latin-variable.woff2'),
    ).toString('base64');

    const measured = await page.evaluate(
      async (base64: string) => {
        const rasterise = async (
          label: string,
          withFont: boolean,
        ): Promise<Uint8ClampedArray> => {
          const styleBlock = withFont
            ? `<style>@font-face{font-family:'CF2Probe';` +
              `src:url(data:font/woff2;base64,${base64}) format('woff2');` +
              `font-weight:100 900;font-style:normal;}</style>`
            : '';
          const markup =
            `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="96" viewBox="0 0 512 96">` +
            styleBlock +
            `<rect width="512" height="96" fill="#ffffff"/>` +
            `<text x="8" y="64" font-family="'CF2Probe', serif" font-size="48" fill="#000">${label}</text>` +
            `</svg>`;
          const image = new Image();
          await new Promise<void>((resolveLoad, rejectLoad) => {
            image.onload = (): void => resolveLoad();
            image.onerror = (): void => rejectLoad(new Error('load failed'));
            image.src = `data:image/svg+xml,${encodeURIComponent(markup)}`;
          });
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 96;
          const context = canvas.getContext('2d');
          if (context === null) {
            throw new Error('2d context unavailable');
          }
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, 512, 96).data;
        };

        const countDiff = (
          a: Uint8ClampedArray,
          b: Uint8ClampedArray,
        ): number => {
          let differing = 0;
          for (let index = 0; index < a.length; index += 4) {
            if (
              Math.abs(a[index] - b[index]) > 8 ||
              Math.abs(a[index + 1] - b[index + 1]) > 8 ||
              Math.abs(a[index + 2] - b[index + 2]) > 8
            ) {
              differing += 1;
            }
          }
          return differing;
        };

        const countInk = (raster: Uint8ClampedArray): number => {
          let ink = 0;
          for (let index = 0; index < raster.length; index += 4) {
            if (raster[index] < 200) {
              ink += 1;
            }
          }
          return ink;
        };

        const latinWith = await rasterise('sss', true);
        const latinWithout = await rasterise('sss', false);
        const latinExtWith = await rasterise('ššš', true);
        const latinExtWithout = await rasterise('ššš', false);

        return {
          latinDiff: countDiff(latinWith, latinWithout),
          latinExtDiff: countDiff(latinExtWith, latinExtWithout),
          latinExtInk: countInk(latinExtWith),
        };
      },
      fontBase64,
    );

    // The subset covers latin: embedding the font CHANGES 's'.
    expect(measured.latinDiff).toBeGreaterThan(200);
    // The subset does NOT cover latin-ext: 'š' renders the same with or
    // without the embedded font — it falls back either way. This is the
    // recorded CF-2 limitation, asserted so a future subset change is
    // noticed here.
    expect(measured.latinExtDiff).toBeLessThan(50);
    // And the fallback genuinely renders glyphs (not blank tofu-nothing).
    expect(measured.latinExtInk).toBeGreaterThan(200);
  });

  test('a maximum-length large label stays inside the legend region in the rendered export', async ({
    page,
  }): Promise<void> => {
    /*
     * The OQ-5 backstop, asserted on the RASTER: the string-length check is
     * what the old constants already encoded, and it is what passed while the
     * PNG clipped. The camera is parked over empty ocean so the frame is
     * white except the legend — every ink pixel outside the legend region is
     * overflow that would clip a real composition.
     */
    await openExportFixture(page);
    expect(
      await page.evaluate((): boolean => window.__exportFixture.showOcean()),
    ).toBe(true);
    await page.evaluate((): void => {
      window.__exportFixture.setLegendTextSize('large');
    });
    // The maximum label the wrap supports at 'large': two full lines of the
    // measured widest common character. Derived from the SAME collapsed
    // constant the renderer uses, so a re-derivation moves this test with it.
    const maxLengthLabel = 'W'.repeat(LEGEND_CHARACTERS_PER_LINE.large * 2);
    await page.evaluate((label: string): void => {
      window.__exportFixture.setLegendLabel(label);
    }, maxLengthLabel);
    await expect(page.locator('[data-layer="legend"] text')).toHaveText(
      maxLengthLabel,
    );

    // Crop bounds derive from resolveLegendRender applied to the LIVE legend
    // state — never a hard-coded rectangle.
    const legendState = await page.evaluate(
      (): LegendState => window.__exportFixture.legendState,
    );
    const render = resolveLegendRender(legendState, [LEGEND_ENTRY_COLOR]);
    const region: LegendRegion = {
      x: render.position.x,
      y: render.position.y,
      width: render.bounds.width,
      height: render.bounds.height,
    };
    expect(region.width).toBeGreaterThan(0);
    expect(region.height).toBeGreaterThan(0);

    const downloadPromise = page.waitForEvent('download');
    const result = await runExport(page);
    expect(result.ok).toBe(true);
    const bytes = await saveDownload(
      await downloadPromise,
      `max-length-label-${UNNAMED_FILENAME}`,
    );
    expect(readPngDimensions(bytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });

    const counts = await countInkAroundRegion(page, bytes, region);
    // Content floor first: a blank frame satisfies "no overflow" perfectly.
    expect(
      counts.inside,
      'the legend did not rasterize: the region is blank.',
    ).toBeGreaterThan(500);
    expect(
      counts.outside,
      'legend ink rendered OUTSIDE the resolved legend region — the ' +
        'characters-per-line constant lets a line overflow the box.',
    ).toBe(0);
  });

  test('a renewed fixture exports again after a failure', async ({
    page,
  }): Promise<void> => {
    await openExportFixture(page);
    await page.evaluate((): void => {
      window.__exportFixture.failBlobEncoding();
    });
    expect(await runExport(page)).toEqual({
      ok: false,
      reason: 'encoding-failed',
    });

    await openExportFixture(page);
    const downloadPromise = page.waitForEvent('download');
    expect(await runExport(page)).toEqual({
      ok: true,
      filename: UNNAMED_FILENAME,
    });

    const download = await downloadPromise;
    const bytes = await saveDownload(download, `renewed-${UNNAMED_FILENAME}`);
    expect(readPngDimensions(bytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });
    expect(await page.evaluate((): number => window.__exportFixture.bodyFrameCount)).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * 04-01 TRACER - water colour, composition state to sampled PNG pixels
 * ------------------------------------------------------------------ */

/**
 * Anything darker than this in EVERY channel is map ink: the #000000 country
 * boundaries at `EXPORT_BORDER_WIDTH`. Deliberately not the legend backstop's
 * 240, which a light water tint trips on two channels - #F5EFE6 is
 * (245, 239, 230) - and which would therefore count a flood-filled blank as
 * a full frame of content.
 */
const DARK_INK_THRESHOLD = 100;
/**
 * DERIVED FROM A MEASUREMENT taken in this same change, not guessed. The
 * default world composition exported **45,188** pixels below
 * `DARK_INK_THRESHOLD` in installed Chrome 151.0.7922.75. The floor is set at
 * 20,000 - under half the measured value, so ordinary rendering variation and
 * a future lighter stroke weight do not make it flap, and two orders of
 * magnitude above the zero a blank or flood-filled frame produces.
 *
 * **`04-08` moved the default coastline weight to `none`** (U-3), which is what
 * `04-01` anticipated when it wrote "RE-MEASURE and restate the number then; do
 * not delete the floor" — it named `04-05` as the plan, and it was `04-08`.
 * The floor was NOT deleted and it was NOT weakened: the water gate now chooses
 * `Thin` before exporting, which is exactly the pre-`04-08` weight, so the
 * measurement below is still describing the same picture. Re-measured in
 * installed Chrome 151.0.7922.76 after the change: **45,190** pixels below
 * `DARK_INK_THRESHOLD`, against 45,188 before it. The floor stays at 20,000.
 */
const MEASURED_BOUNDARY_INK_PIXELS = 45_190;
const MIN_BOUNDARY_INK_PIXELS = 20_000;
/**
 * The floor for a 12x12 coastline band (`04-08`).
 *
 * **RE-MEASURED by `04-09` because the sample point moved** - see
 * `AUSTRALIA_WEST_COAST_LON_LAT` for why Cabo da Roca stopped being a pure
 * coastline sample. `04-08`'s table at Cabo da Roca read hairline **42**, thin
 * **68**, bold **185**, none **0**; those numbers described a band that also
 * contained the Portugal/Spain line, which is exactly why they are restated
 * rather than carried. Measured in installed Chrome 151.0.7922.76 at the
 * default world camera, at the new point:
 *
 * | weight | user units | ink pixels in the band |
 * |---|---|---|
 * | `hairline` | 0.5 | **27** |
 * | `thin` | 0.75 | **37** |
 * | `bold` | 2 | **113** |
 * | `none` | 0 | **0** |
 *
 * The floor STAYS at 8 - still under the lightest real step, and eight times
 * the zero a blank or flood-filled frame produces. It was not lowered to
 * accommodate the smaller counts, and the numbers are smaller because the band
 * now contains one line instead of two. Restate these if the sample point or
 * the band radius ever moves; do not delete the floor.
 */
const MIN_COASTLINE_BAND_INK_PIXELS = 8;
/**
 * `04-09` Gate A's whole-frame content floor, and it is a DIFFERENT number from
 * `MIN_BOUNDARY_INK_PIXELS` on purpose.
 *
 * That floor (20,000, from a measured 45,190) describes a frame whose coastlines
 * are stroked at `thin`. Gate A runs at the SHIPPED DEFAULTS — coastlines
 * `none`, interior `thin` — where the only ink in the frame is the interior
 * mesh, which is a fraction of the total boundary length. Reusing the 20,000
 * floor there would be red on arrival and would then get loosened rather than
 * obeyed, which is how a floor stops being one.
 *
 * MEASURED in installed Chrome 151.0.7922.76 at the default world camera:
 * **8,400** pixels below `DARK_INK_THRESHOLD` across the whole frame, against
 * the 45,190 the same frame measures with coastlines at `thin`. The floor is
 * **4,000** - under half the measured value, so ordinary rendering variation
 * does not make it flap, and three orders of magnitude above the zero a blank
 * or flood-filled frame produces. In the same run the Franco-German band
 * measured **85** and the Australian coastline band **0**.
 */
const MEASURED_MESH_INK_PIXELS = 8_400;
const MIN_MESH_INK_PIXELS = 4_000;
/**
 * `04-09` Gate B. Derived from a measurement in this same change, not guessed:
 * the unselected control and the selected export both measured **0** ink around
 * Australia's coast, and the RED proof that deletes `data-editor-only`
 * measured **132**. A tolerance of 2 leaves room for anti-aliasing jitter while
 * sitting sixty-six times below the real signal.
 *
 * The inline stroke on the highlight path is what makes that 132 exist at all.
 * With the colour coming only from `MapCanvas.css`, the surviving ring rendered
 * NOTHING in the isolated export document and this gate measured 0 either way -
 * a gate the sandbox neutralised. Recorded because the fix is easy to undo.
 */
const SELECTION_INK_TOLERANCE = 2;
const WHOLE_FRAME_REGION: LegendRegion = {
  x: 0,
  y: 0,
  width: EXPORT_SIZE,
  height: EXPORT_SIZE,
};

/**
 * Two sample points, converted through the real projection rather than
 * hard-coded as pixels. If either classification is wrong the gate goes RED -
 * a mislabelled "ocean" point fails the colour assertion and a mislabelled
 * "land" point fails the inequality - so a geography mistake here cannot
 * become a false pass.
 */
const PACIFIC_LON_LAT: readonly [number, number] = [-140, 0];
const SAHARA_LON_LAT: readonly [number, number] = [20, 26];

function hexToRgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function project(
  lonLat: readonly [number, number],
): readonly [number, number] {
  const projected = createWorldProjection()([lonLat[0], lonLat[1]]);
  if (projected === null) {
    throw new Error(`(${lonLat[0]}, ${lonLat[1]}) does not project.`);
  }
  return [Math.round(projected[0]), Math.round(projected[1])];
}

/**
 * Camera user space -> the SVG's 0..1080 viewBox space, read from the live
 * document rather than assumed to be the identity. The PNG is 1080 wide over a
 * `0 0 1080 1080` viewBox, so a viewBox coordinate IS a PNG pixel.
 */
async function toExportPixels(
  page: Page,
  points: ReadonlyArray<readonly [number, number]>,
): Promise<ReadonlyArray<readonly [number, number]>> {
  return page.evaluate(
    (cameraPoints: ReadonlyArray<readonly [number, number]>) => {
      const svg = document.querySelector('svg.map-canvas');
      const camera = document.querySelector('[data-layer="camera"]');
      if (
        !(svg instanceof SVGSVGElement) ||
        !(camera instanceof SVGGraphicsElement)
      ) {
        throw new Error('The canonical canvas or its camera layer is absent.');
      }
      const svgToScreen = svg.getScreenCTM();
      const cameraToScreen = camera.getScreenCTM();
      if (svgToScreen === null || cameraToScreen === null) {
        throw new Error('The canvas is not rendered, so it has no CTM.');
      }
      const cameraToViewBox = svgToScreen.inverse().multiply(cameraToScreen);
      return cameraPoints.map(([x, y]): readonly [number, number] => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const mapped = point.matrixTransform(cameraToViewBox);
        return [Math.round(mapped.x), Math.round(mapped.y)];
      });
    },
    points,
  );
}

/**
 * A genuinely flat 1080 square in the water colour, produced through the same
 * canvas machinery the real export uses. It is the control the content floor
 * has to survive: a counter that reads content into a flood fill fails here.
 */
async function makeFloodFilledPng(page: Page, hex: string): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ color, size }: { color: string; size: number }) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (context === null) {
        throw new Error('2D context is unavailable.');
      }
      context.fillStyle = color;
      context.fillRect(0, 0, size, size);
      const blob = await new Promise<Blob | null>((settle): void => {
        canvas.toBlob(settle, 'image/png');
      });
      if (blob === null) {
        throw new Error('The control PNG did not encode.');
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      bytes.forEach((byte): void => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    },
    { color: hex, size: EXPORT_SIZE },
  );
  return Buffer.from(base64, 'base64');
}

async function exportRealApp(page: Page, label: string): Promise<Buffer> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const download = await downloadPromise;
  return saveDownload(download, `${label}-${UNNAMED_FILENAME}`);
}

/**
 * Deliberately asserts only that the CONTROL took the choice, never that the
 * rect carries the right `fill`. A markup assertion here would short-circuit
 * every RED probe below: breaking the fill would redden this helper instead of
 * the pixel gate it is meant to prove, which is the "probe reddens a DIFFERENT
 * gate" shape this repository has already shipped once. The rect's fill is the
 * pixel assertion's subject and is left entirely to it.
 *
 * Waiting on `toBeChecked` is real synchronisation: the input is controlled, so
 * it flips only after React has committed the render that also repaints the
 * rect.
 */
async function chooseWaterPreset(page: Page, name: string): Promise<void> {
  const pill = page.getByRole('radio', { name, exact: true });
  await pill.check();
  await expect(pill).toBeChecked();
}

/**
 * The same shape as `chooseWaterPreset`, scoped to one `Borders` sub-group, and
 * deliberately asserting only that the CONTROL took the choice. The pixels are
 * every gate's own subject; a markup assertion here would redden instead of
 * them.
 */
async function chooseStrokeWeight(
  page: Page,
  group: 'Interior' | 'Coastlines',
  name: string,
): Promise<void> {
  const pill = page
    .getByRole('radiogroup', { name: group })
    .getByRole('radio', { name, exact: true });
  await pill.check();
  await expect(pill).toBeChecked();
}

/** `04-08`, and it must stay a hand-written literal — see `hexToRgb`. */
const DEFAULT_UNCOLORED_FILL_HEX = '#E5E7EB';

test.describe('water preset', (): void => {
  /**
   * **The Phase 4 tracer.** One creator-visible path through every layer the
   * phase touches - a new rail tool and flyout, composition state, a new
   * serialized SVG layer, the owned export clone - proven on the bytes of a
   * real download rather than at any single layer.
   *
   * The risk it retires: `04-RESEARCH.md` Export Fidelity Envelope measured
   * that a serialised SVG rasterised as an image sees NO host stylesheet, so a
   * `var()` renders as nothing and a class rule renders as SVG default black.
   * If a serialized inline layer did not survive this repo's own
   * `sanitizeExportClone` / `isPreservedComposition`, every later Phase 4 plan
   * would be built on a dead architecture.
   */
  test('a chosen water colour reaches the exported PNG ocean pixels', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const [pacific, sahara] = await toExportPixels(page, [
      project(PACIFIC_LON_LAT),
      project(SAHARA_LON_LAT),
    ]);
    if (pacific === undefined || sahara === undefined) {
      throw new Error('The sample points did not map into the export frame.');
    }

    const chosen = WATER_PRESETS.find(
      (preset): boolean => preset.value !== DEFAULT_SURFACE_COLOR,
    );
    const alternate = WATER_PRESETS.filter(
      (preset): boolean => preset.value !== DEFAULT_SURFACE_COLOR,
    )[1];
    if (chosen === undefined || alternate === undefined) {
      throw new Error(
        'This gate needs two non-default presets to discriminate with.',
      );
    }

    await openRailTool(page, 'Map style');
    /*
     * `04-08`: DECLARED, not defaulted. This gate's subject is the WATER, and
     * its content floor needs country boundaries in frame to be a floor at all.
     * The app now ships `none` coastlines, so an unstroked export would carry
     * no dark ink and the floor would have to be deleted to keep this green -
     * which is the wrong repair. `Thin` is exactly the pre-04-08 weight, so the
     * measured 45,190 below is the same picture 04-01 measured at 45,188.
     */
    await chooseStrokeWeight(page, 'Coastlines', 'Thin');
    await chooseWaterPreset(page, chosen.name);

    const firstBytes = await exportRealApp(page, 'water-first');

    /*
     * 1. CONTENT FLOOR, FIRST. Two blank squares satisfy "they differ"
     *    perfectly, and this repository has shipped exactly that defect. Assert
     *    the frame carries map ink before asserting anything about its colour.
     */
    const firstInk = await countInkAroundRegion(
      page,
      firstBytes,
      WHOLE_FRAME_REGION,
      DARK_INK_THRESHOLD,
    );
    expect(
      firstInk.inside,
      `the exported frame measured ${firstInk.inside} ink pixels against a ` +
        `floor of ${MIN_BOUNDARY_INK_PIXELS} (derived from ` +
        `${MEASURED_BOUNDARY_INK_PIXELS} measured when this gate landed). It ` +
        'carries no country boundaries, so every colour assertion below would ' +
        'be about a blank square.',
    ).toBeGreaterThan(MIN_BOUNDARY_INK_PIXELS);

    /*
     * 2. THE PROPERTY. Exactly 1080x1080 from the IHDR of the downloaded
     *    bytes, then the ocean pixel itself.
     */
    expect(readPngDimensions(firstBytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });

    const firstSample = await samplePngPoints(page, firstBytes, [
      pacific,
      sahara,
    ]);
    const [firstOcean, firstLand] = firstSample.pixels;
    if (firstOcean === undefined || firstLand === undefined) {
      throw new Error('The sampler returned fewer pixels than it was asked for.');
    }

    const chosenRgb = hexToRgb(chosen.value);
    expect(
      firstOcean.slice(0, 3),
      `the mid-Pacific pixel is rgb(${firstOcean.slice(0, 3).join(', ')}), not ` +
        `the chosen ${chosen.name} ${chosen.value}. The water either never ` +
        'reached the serialized clone or was stripped from it.',
    ).toEqual([...chosenRgb]);
    // Opaque, because the three white export layers are the opacity floor.
    expect(firstOcean[3]).toBe(255);

    expect(
      firstLand.slice(0, 3),
      'the Sahara pixel is the water colour too, so the frame is a flood ' +
        'fill rather than a map with coloured water.',
    ).not.toEqual([...chosenRgb]);

    /*
     * 3. THE DISCRIMINATION CONTROL. Without a second, different preset the
     *    assertion above is satisfiable by any two identical whites.
     */
    await chooseWaterPreset(page, alternate.name);
    const secondBytes = await exportRealApp(page, 'water-second');
    const secondSample = await samplePngPoints(page, secondBytes, [pacific]);
    const [secondOcean] = secondSample.pixels;
    if (secondOcean === undefined) {
      throw new Error('The second export produced no sample.');
    }

    expect(secondOcean.slice(0, 3)).toEqual([...hexToRgb(alternate.value)]);
    expect(
      secondOcean.slice(0, 3),
      `both exports sampled rgb(${secondOcean.slice(0, 3).join(', ')}) at the ` +
        'same point, so the assertion above is not measuring the creator ' +
        'choice at all.',
    ).not.toEqual([...chosenRgb]);

    /*
     * 4. THE COUNTER'S OWN CONTROL. A flood fill in the water colour, through
     *    the SAME counting function and the SAME threshold. A counter that
     *    reads content into anything reports ink here and fails.
     */
    const floodFilled = await makeFloodFilledPng(page, chosen.value);
    const floodInk = await countInkAroundRegion(
      page,
      floodFilled,
      WHOLE_FRAME_REGION,
      DARK_INK_THRESHOLD,
    );
    expect(
      floodInk.inside + floodInk.outside,
      'the content floor counts a flat flood fill as content, so passing it ' +
        'proves nothing about the real export.',
    ).toBe(0);

    // And the flood fill would pass the ocean assertion, which is exactly why
    // the content floor above runs first.
    const floodSample = await samplePngPoints(page, floodFilled, [pacific]);
    expect(floodSample.pixels[0]?.slice(0, 3)).toEqual([...chosenRgb]);
  });
});

/* ------------------------------------------------------------------ *
 * 04-08 - border weight and the uncolored fill, on downloaded PNG bytes
 * ------------------------------------------------------------------ */

/**
 * A point that is certainly ON a coastline at the default world camera, derived
 * through `createWorldProjection()` rather than hard-coded.
 *
 * **MOVED by `04-09`, and the move is a repair rather than a re-baseline.**
 * `04-08` sampled Cabo da Roca (-9.5, 38.78), the western tip of mainland
 * Portugal, on the stated ground that a 6px radius "excludes the neighbouring
 * Spanish border". That was true only while nothing drew interior borders. It
 * is 1.5 degrees of longitude to the Portugal/Spain line, which at 1080px for
 * 360 degrees is **4.5 PNG pixels** - inside the band. Once `04-09` rendered
 * the interior mesh, the band measured interior ink at `coastlineWeight: none`
 * and the gate stopped measuring its advertised subject.
 *
 * The repair is a coastline with **no interior border anywhere in the country**:
 * Australia's west coast near North West Cape. Australia has no land neighbours
 * at all, so the exclusion is structural rather than a distance that has to be
 * re-checked whenever a line layer is added. Cabo da Roca measured **23** ink
 * pixels at `coastlineWeight: none` once the mesh rendered; this point measures
 * **0**. See `MIN_COASTLINE_BAND_INK_PIXELS` for the restated table.
 *
 * `COASTLINE_BAND_RADIUS` is in PNG pixels and is UNCHANGED. The viewBox is
 * 1080 over an EXPORT_SIZE of 1080, so a viewBox coordinate IS a PNG pixel; a
 * radius of 6 comfortably contains a `bold` (2 user unit -> 4px) stroke plus
 * its anti-aliasing.
 */
const AUSTRALIA_WEST_COAST_LON_LAT: readonly [number, number] = [113.7, -22.3];
const COASTLINE_BAND_RADIUS = 6;
/**
 * `04-09` Gate A's INLAND sample: the Franco-German Rhine, a boundary between
 * two large neighbours, so the sample survives sub-pixel placement. It is
 * nowhere near a coast, so ink measured here at `coastlineWeight: none` can
 * only have come from the interior mesh.
 *
 * The pairing with `AUSTRALIA_WEST_COAST_LON_LAT` is what makes Gate A an
 * INEQUALITY rather than two separate claims: the two samples are read from the
 * SAME export, through the same counter, at the same band radius.
 */
const FRANCO_GERMAN_BORDER_LON_LAT: readonly [number, number] = [7.8, 48.7];

/** An interior point of a large country, well clear of any boundary. */
const CENTRAL_BRAZIL_LON_LAT: readonly [number, number] = [-52, -10];
const CENTRAL_BRAZIL_COUNTRY_ID = 'BRA';

function bandAround(
  point: readonly [number, number],
  radius: number,
): LegendRegion {
  return {
    x: point[0] - radius,
    y: point[1] - radius,
    width: radius * 2,
    height: radius * 2,
  };
}

async function projectToExportPixel(
  page: Page,
  lonLat: readonly [number, number],
): Promise<readonly [number, number]> {
  const [pixel] = await toExportPixels(page, [project(lonLat)]);
  if (pixel === undefined) {
    throw new Error(`(${lonLat[0]}, ${lonLat[1]}) did not map into the frame.`);
  }
  return pixel;
}

/**
 * The counter's own control, run through the SAME function and threshold as
 * every measurement beside it. A flat frame in the water colour must read ZERO
 * ink, or a "no dark ink here" assertion is satisfied by a counter that cannot
 * see anything at all.
 */
async function expectBlankControlReadsZeroInk(
  page: Page,
  region: LegendRegion,
): Promise<void> {
  const blank = await makeFloodFilledPng(page, DEFAULT_SURFACE_COLOR);
  expect(readPngDimensions(blank)).toEqual({
    width: EXPORT_SIZE,
    height: EXPORT_SIZE,
  });
  const blankInk = await countInkAroundRegion(
    page,
    blank,
    region,
    DARK_INK_THRESHOLD,
  );
  expect(
    blankInk.inside + blankInk.outside,
    'the blank control reads ink, so the counter below is measuring noise.',
  ).toBe(0);
}

/* ------------------------------------------------------------------ *
 * 04-09 - the interior-border mesh, structurally
 * ------------------------------------------------------------------ */

/**
 * `04-06` measured 327 geometries, and `MapCanvas` draws all of them as ONE
 * `d` per wrapped copy. `WRAP_OFFSETS` is `[-1080, 0, 1080]`, so three.
 *
 * The count is compared against the wrap set the POLYGONS actually rendered
 * rather than against this literal alone: an offset added to or removed from
 * `WRAP_OFFSETS` moves both sides together, and the literal is what stops the
 * comparison being satisfied at zero.
 */
const MESH_WRAP_COPY_COUNT = 3;

test.describe('interior borders', (): void => {
  test('draw over the fills, inside the camera, wrapped at the date line', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const layout = await page.evaluate(() => {
      const camera = document.querySelector('svg.map-canvas [data-layer="camera"]');
      if (camera === null) {
        throw new Error('The camera layer is absent.');
      }
      const cameraChildren = [...camera.children].map((child) =>
        child.getAttribute('data-layer'),
      );
      const borders = camera.querySelector(':scope > [data-layer="borders"]');
      const meshPaths = [
        ...(borders?.querySelectorAll(':scope > path') ?? []),
      ];
      const scenePaths = [
        ...document.querySelectorAll('svg.map-canvas path.scene-path'),
      ];

      return {
        cameraChildren,
        // A layer nested anywhere else would still "exist"; the containment is
        // the contract, so it is read as a direct child of the camera.
        bordersIsCameraChild: borders !== null,
        bordersPointerEvents: borders?.getAttribute('pointer-events') ?? null,
        bordersAriaHidden: borders?.getAttribute('aria-hidden') ?? null,
        bordersFill: borders?.getAttribute('fill') ?? null,
        meshCount: meshPaths.length,
        meshClasses: [
          ...new Set(meshPaths.map((path) => path.getAttribute('class'))),
        ],
        meshVectorEffects: meshPaths.filter(
          (path) => path.getAttribute('vector-effect') === 'non-scaling-stroke',
        ).length,
        meshEmptyGeometry: meshPaths.filter(
          (path) => (path.getAttribute('d') ?? '') === '',
        ).length,
        meshTransforms: [
          ...new Set(meshPaths.map((path) => path.getAttribute('transform'))),
        ].sort(),
        sceneTransforms: [
          ...new Set(scenePaths.map((path) => path.getAttribute('transform'))),
        ].sort(),
        meshStrokes: [
          ...new Set(meshPaths.map((path) => path.getAttribute('stroke'))),
        ],
        meshStrokeWidths: [
          ...new Set(meshPaths.map((path) => path.getAttribute('stroke-width'))),
        ],
      };
    });

    // ORDER inside the camera: countries first, then borders, or the fills
    // paint over the lines.
    expect(layout.bordersIsCameraChild).toBe(true);
    expect(layout.cameraChildren).toEqual([
      'outgoing-scenes',
      'countries',
      'borders',
      'highlight',
    ]);

    // NON-INTERACTIVE, as attributes rather than a stylesheet rule.
    expect(layout.bordersPointerEvents).toBe('none');
    expect(layout.bordersAriaHidden).toBe('true');
    expect(layout.bordersFill).toBe('none');

    // WRAPPED at the date line, on the same offsets the polygons use. A mesh
    // that rendered once would show fills with no interior borders on the
    // Pacific-framed copies.
    expect(layout.meshCount).toBe(MESH_WRAP_COPY_COUNT);
    expect(layout.meshEmptyGeometry).toBe(0);
    expect(
      layout.sceneTransforms.length,
      'the polygons rendered a single wrap offset, so the comparison below ' +
        'would be satisfied by a mesh that does not wrap either.',
    ).toBe(MESH_WRAP_COPY_COUNT);
    expect(
      layout.meshTransforms,
      'the mesh does not repeat at the same offsets as the polygons, so a ' +
        'Pacific-framed composition shows filled countries with no interior ' +
        'borders on the wrapped copies.',
    ).toEqual(layout.sceneTransforms);

    // ZOOM-PINNED, as an attribute: the camera wraps this layer in
    // `scale(zoom)`, so without the pin a creator framed at 8x downloads
    // 8x-thick borders.
    expect(layout.meshVectorEffects).toBe(MESH_WRAP_COPY_COUNT);

    // Its own class: neither of the two the exporter's stroke normaliser
    // claims, or the interior weight would be overwritten by the coastline's.
    expect(layout.meshClasses).toEqual(['border-mesh-path']);

    // The composition's own choice, inline, from the one weight table:
    // `interiorWeight` defaults to `thin` (0.75).
    expect(layout.meshStrokes).toEqual(['#000000']);
    expect(layout.meshStrokeWidths).toEqual(['0.75']);
  });

  test('follow the creator choice of interior weight and border colour', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);
    await openRailTool(page, 'Map style');

    const readMesh = (): Promise<{
      strokes: ReadonlyArray<string | null>;
      widths: ReadonlyArray<string | null>;
    }> =>
      page.evaluate(() => {
        const meshPaths = [
          ...document.querySelectorAll(
            'svg.map-canvas [data-layer="borders"] > path',
          ),
        ];
        return {
          strokes: [
            ...new Set(meshPaths.map((path) => path.getAttribute('stroke'))),
          ],
          widths: [
            ...new Set(meshPaths.map((path) => path.getAttribute('stroke-width'))),
          ],
        };
      });

    await chooseStrokeWeight(page, 'Interior', 'Bold');
    await expect
      .poll(async (): Promise<ReadonlyArray<string | null>> => (await readMesh()).widths)
      .toEqual(['2']);

    // `none` OMITS the stroke rather than writing a zero width, exactly as the
    // coastline does — so the gate asserts absence, not a number.
    await chooseStrokeWeight(page, 'Interior', 'None');
    await expect
      .poll(async (): Promise<{
        strokes: ReadonlyArray<string | null>;
        widths: ReadonlyArray<string | null>;
      }> => readMesh())
      .toEqual({ strokes: [null], widths: [null] });

    await chooseStrokeWeight(page, 'Interior', 'Thin');
    // The swatch pills carry no `role="radiogroup"` (only the weight groups
    // do), so the radio is reached by its own accessible name.
    const silver = page.getByRole('radio', { name: 'Silver', exact: true });
    await silver.check();
    await expect(silver).toBeChecked();
    await expect
      .poll(async (): Promise<ReadonlyArray<string | null>> => (await readMesh()).strokes)
      .toEqual(['#9CA3AF']);
  });
});

/* ------------------------------------------------------------------ *
 * 04-09 - hover and selection on a carrier that is not the coastline
 * ------------------------------------------------------------------ */

/** `04-UI-SPEC.md § 6.9`, in user units of the 1080 viewBox. */
const HIGHLIGHT_SELECTED_WIDTH = '2.5';
const HIGHLIGHT_HOVERED_WIDTH = '1.5';

test.describe('highlight layer', (): void => {
  /**
   * **The decoupling, asserted as an inequality between two carriers.**
   *
   * `04-08` made `coastlineWeight: none` the default, and the editor's
   * selection feedback was a heavier stroke on the country path itself. At the
   * shipped default there is no stroke to make heavier, so a creator selecting
   * a coastal country saw nothing at all. The gate therefore asserts BOTH
   * halves in one run: the country path carries exactly the creator's chosen
   * weight (zero at `none`) AND the highlight layer carries the feedback.
   *
   * A single "the highlight exists" check would stay green with the old
   * selection stroke still painted on the geometry beside it.
   */
  test('carries selection at the shipped default, where the coastline cannot', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    /*
     * Park the pointer over the tool rail. Playwright starts the mouse at
     * (0, 0), and Chrome fires `pointerenter` when content appears under a
     * stationary cursor - on a full-bleed canvas that is a hovered country,
     * and the layer would carry ITS three paths beside the selected ones.
     */
    await page.mouse.move(28, 400);

    /*
     * Selected by KEYBOARD, then blurred. A `.click()` targets the bounding-box
     * centre, and France's bbox centre lands in Mali; and focus itself paints
     * `.country-path.focused` at 3px, which would contaminate the resting-width
     * assertion below with a state that is neither hover nor selection.
     */
    const france = page.locator(
      'path.country-path[data-country-id="FRA"][data-path-kind="logical"]',
    );
    await france.focus();
    await france.press('Enter');
    await expect(france).toHaveAttribute('aria-selected', 'true');
    await page.evaluate((): void => {
      const active = document.activeElement;
      if (active instanceof SVGElement || active instanceof HTMLElement) {
        active.blur();
      }
    });
    await expect(france).not.toHaveClass(/\bfocused\b/u);

    const readState = (): Promise<{
      highlightCount: number;
      highlightClasses: ReadonlyArray<string | null>;
      highlightWidths: ReadonlyArray<string | null>;
      highlightTransforms: ReadonlyArray<string | null>;
      highlightVectorEffects: number;
      highlightComputedStroke: string | null;
      highlightPointerEvents: string | null;
      groupEditorOnly: string | null;
      cameraChildren: ReadonlyArray<string | null>;
      countryStrokeWidthAttribute: string | null;
      countryComputedStrokeWidth: string | null;
    }> =>
      page.evaluate(() => {
        const camera = document.querySelector(
          'svg.map-canvas [data-layer="camera"]',
        );
        const group = camera?.querySelector(
          ':scope > [data-layer="highlight"]',
        );
        const paths = [...(group?.querySelectorAll(':scope > path') ?? [])];
        const first = paths[0] ?? null;
        const country = document.querySelector(
          'path.country-path[data-country-id="FRA"][data-path-kind="logical"]',
        );

        return {
          highlightCount: paths.length,
          highlightClasses: [
            ...new Set(paths.map((path) => path.getAttribute('class'))),
          ],
          highlightWidths: [
            ...new Set(paths.map((path) => path.getAttribute('stroke-width'))),
          ],
          highlightTransforms: [
            ...new Set(paths.map((path) => path.getAttribute('transform'))),
          ].sort(),
          highlightVectorEffects: paths.filter(
            (path) =>
              path.getAttribute('vector-effect') === 'non-scaling-stroke',
          ).length,
          highlightComputedStroke:
            first === null ? null : getComputedStyle(first).stroke,
          highlightPointerEvents:
            group === null || group === undefined
              ? null
              : getComputedStyle(group).pointerEvents,
          groupEditorOnly: group?.getAttribute('data-editor-only') ?? null,
          cameraChildren: [...(camera?.children ?? [])].map((child) =>
            child.getAttribute('data-layer'),
          ),
          countryStrokeWidthAttribute:
            country?.getAttribute('stroke-width') ?? null,
          countryComputedStrokeWidth:
            country === null ? null : getComputedStyle(country).strokeWidth,
        };
      });

    /*
     * `.country-path` transitions `stroke-width` over 150ms, so an immediate
     * read after the blur samples a value in flight - measured at 1.17854px
     * between the focus ring's 3px and the resting 0. Poll until it settles,
     * then take ONE snapshot for every assertion below.
     */
    await expect
      .poll(async (): Promise<string | null> =>
        (await readState()).countryComputedStrokeWidth,
      )
      .toBe('0px');
    const selected = await readState();

    // 1. THE HIGHLIGHT IS THE CARRIER. Wrapped like everything else inside the
    //    camera, so a Pacific-framed selection keeps its feedback.
    expect(selected.highlightCount).toBe(MESH_WRAP_COPY_COUNT);
    expect(selected.highlightClasses).toEqual([
      'map-highlight-path map-highlight-path--selected',
    ]);
    expect(selected.highlightWidths).toEqual([HIGHLIGHT_SELECTED_WIDTH]);
    expect(selected.highlightTransforms).toEqual([
      'translate(-1080 0)',
      'translate(0 0)',
      'translate(1080 0)',
    ]);
    expect(selected.highlightVectorEffects).toBe(MESH_WRAP_COPY_COUNT);
    // The mode-invariant `--map-border-selected`, resolved by the browser.
    expect(selected.highlightComputedStroke).toBe('rgb(0, 0, 0)');

    // 2. IT NEVER INTERCEPTS THE CLICK it is drawing feedback for, and it is
    //    marked for wholesale removal by the sanitizer.
    expect(selected.highlightPointerEvents).toBe('none');
    expect(selected.groupEditorOnly).toBe('true');
    expect(selected.cameraChildren).toEqual([
      'outgoing-scenes',
      'countries',
      'borders',
      'highlight',
    ]);

    // 3. THE COUNTRY PATH DID NOT MOVE. At the shipped `coastlineWeight: none`
    //    the attribute is ABSENT and the computed width is zero - so the old
    //    2px selection stroke provably is not there beside the new carrier.
    expect(selected.countryStrokeWidthAttribute).toBeNull();
    expect(selected.countryComputedStrokeWidth).toBe('0px');

    // 4. AND IT FOLLOWS THE CREATOR, NOT THE SELECTION. Choosing `Bold` moves
    //    the country path to 2 and leaves the highlight at 2.5: two carriers,
    //    two inputs, asserted in the same run.
    await openRailTool(page, 'Map style');
    await chooseStrokeWeight(page, 'Coastlines', 'Bold');
    await expect
      .poll(async (): Promise<string | null> =>
        (await readState()).countryComputedStrokeWidth,
      )
      .toBe('2px');
    const bold = await readState();
    expect(bold.countryStrokeWidthAttribute).toBe('2');
    expect(bold.highlightWidths).toEqual([HIGHLIGHT_SELECTED_WIDTH]);
  });

  test('draws hover feedback, and selection outranks it', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const readHighlight = (): Promise<
      ReadonlyArray<{ readonly cls: string | null; readonly width: string | null }>
    > =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll(
            'svg.map-canvas [data-layer="highlight"] > path',
          ),
        ].map((path) => ({
          cls: path.getAttribute('class'),
          width: path.getAttribute('stroke-width'),
        })),
      );

    /*
     * Park the pointer over the tool rail first. Chrome fires `pointerenter`
     * when content appears UNDER a stationary cursor, and Playwright starts the
     * mouse at (0, 0) - which on a full-bleed canvas is over the map. Without
     * this the "empty layer" baseline below is measuring whichever country
     * happened to load beneath the corner.
     */
    await page.mouse.move(28, 400);

    // Nothing hovered, nothing selected: an EMPTY layer, never all 207.
    await expect
      .poll(async (): Promise<number> => (await readHighlight()).length)
      .toBe(0);

    const brazil = page.locator(
      'path.country-path[data-country-id="BRA"][data-path-kind="logical"]',
    );
    await brazil.hover();
    await expect
      .poll(async (): Promise<ReadonlyArray<string | null>> =>
        (await readHighlight()).map((entry): string | null => entry.width),
      )
      .toEqual([
        HIGHLIGHT_HOVERED_WIDTH,
        HIGHLIGHT_HOVERED_WIDTH,
        HIGHLIGHT_HOVERED_WIDTH,
      ]);
    expect(
      (await readHighlight()).every((entry): boolean =>
        (entry.cls ?? '').includes('map-highlight-path--hovered'),
      ),
    ).toBe(true);

    /*
     * SELECTED OUTRANKS HOVERED, and the click leaves the pointer on the same
     * country - so this is the exact overlap. Without the precedence the
     * feedback would get LIGHTER the moment a creator selected what they were
     * hovering.
     */
    await brazil.click();
    await expect
      .poll(async (): Promise<ReadonlyArray<string | null>> =>
        (await readHighlight()).map((entry): string | null => entry.width),
      )
      .toEqual([
        HIGHLIGHT_SELECTED_WIDTH,
        HIGHLIGHT_SELECTED_WIDTH,
        HIGHLIGHT_SELECTED_WIDTH,
      ]);
    expect(
      (await readHighlight()).every((entry): boolean =>
        (entry.cls ?? '').includes('map-highlight-path--selected'),
      ),
    ).toBe(true);
  });
});

test.describe('border weight', (): void => {
  /**
   * **GATE A — the coastline is quiet, and the same point inks when it is not.**
   *
   * The measured defect this covers: until `04-08`, `sanitizeExportClone`
   * hard-set `stroke: #000000; stroke-width: 0.75` on every country path in the
   * clone, so the editor could show an unstroked coast while the download
   * shipped a black one. RED-proved by restoring exactly that hard-set — see
   * `04-08-SUMMARY.md`.
   *
   * Both directions in one run, because "no dark pixel here" alone is satisfied
   * by a blank export.
   */
  test('a coastline at none carries no dark ink, and at bold it does', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const coastline = await projectToExportPixel(page, AUSTRALIA_WEST_COAST_LON_LAT);
    const band = bandAround(coastline, COASTLINE_BAND_RADIUS);

    await openRailTool(page, 'Map style');

    // 1. THE DISCRIMINATION CONTROL FIRST, because it is also the content
    //    floor: `bold` must put real ink in this band, or "quiet at none" is a
    //    claim about a band that never had ink in it.
    await chooseStrokeWeight(page, 'Coastlines', 'Bold');
    const boldBytes = await exportRealApp(page, 'coastline-bold');
    expect(readPngDimensions(boldBytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });
    const boldInk = await countInkAroundRegion(
      page,
      boldBytes,
      band,
      DARK_INK_THRESHOLD,
    );
    expect(
      boldInk.inside,
      `the bold coastline band at (${coastline[0]}, ${coastline[1]}) measured ` +
        `${boldInk.inside} ink pixels. The sample point is not on a coastline, ` +
        'so the `none` assertion below would pass on empty water.',
    ).toBeGreaterThan(MIN_COASTLINE_BAND_INK_PIXELS);

    // 2. THE PROPERTY. Same point, same band, same counter, weight `none`.
    await chooseStrokeWeight(page, 'Coastlines', 'None');
    const quietBytes = await exportRealApp(page, 'coastline-none');
    expect(readPngDimensions(quietBytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });
    const quietInk = await countInkAroundRegion(
      page,
      quietBytes,
      band,
      DARK_INK_THRESHOLD,
    );
    expect(
      quietInk.inside,
      `the coastline band still carries ${quietInk.inside} dark pixels at ` +
        'weight `none`. Either the editor kept a stroke or the export clone ' +
        're-painted one - which is exactly the defect 04-08 replaced.',
    ).toBe(0);

    // 3. THE COUNTER'S OWN CONTROL.
    await expectBlankControlReadsZeroInk(page, band);
  });

  /**
   * **GATE B — three distinct steps are three distinct widths.**
   *
   * A single-step check passes on a renderer that ignores the value entirely.
   * The thresholds are the counts measured in this same change, recorded in
   * `04-08-SUMMARY.md`, never guesses.
   */
  test('ink at a coastline increases strictly with the named weight', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const coastline = await projectToExportPixel(page, AUSTRALIA_WEST_COAST_LON_LAT);
    const band = bandAround(coastline, COASTLINE_BAND_RADIUS);

    await openRailTool(page, 'Map style');

    const steps = ['Hairline', 'Thin', 'Bold'] as const;
    const counts: number[] = [];
    for (const step of steps) {
      await chooseStrokeWeight(page, 'Coastlines', step);
      const bytes = await exportRealApp(page, `coastline-${step.toLowerCase()}`);
      expect(readPngDimensions(bytes)).toEqual({
        width: EXPORT_SIZE,
        height: EXPORT_SIZE,
      });
      const ink = await countInkAroundRegion(
        page,
        bytes,
        band,
        DARK_INK_THRESHOLD,
      );
      counts.push(ink.inside);
    }

    // A literal, not `steps.length`: a loop that ran zero times would satisfy
    // every assertion below.
    expect(counts).toHaveLength(3);
    expect(
      counts[0],
      `the lightest step measured ${counts[0]} ink pixels, below the floor. ` +
        'Every comparison below would then be between two empty bands.',
    ).toBeGreaterThan(MIN_COASTLINE_BAND_INK_PIXELS);

    counts.forEach((count, index): void => {
      if (index === 0) {
        return;
      }
      const previous = counts[index - 1];
      expect(
        count,
        `${steps[index]} measured ${count} ink pixels and ${steps[index - 1]} ` +
          `measured ${previous}. The steps must be strictly heavier, or two ` +
          'pills paint a picture a creator cannot tell apart.',
      ).toBeGreaterThan(previous ?? Number.NaN);
    });

    await expectBlankControlReadsZeroInk(page, band);
  });

  /**
   * **GATE A (04-09) — inland INKED and coastline QUIET, in the SAME export.**
   *
   * This is the phase's headline picture stated as an inequality: the Eurostat
   * reference has thin dark lines clearly present BETWEEN countries and
   * effectively nothing around the coasts. Either half alone is satisfiable by
   * a mistake — "the coastline is quiet" by a blank frame, "the inland border
   * is inked" by a frame where everything is inked — so both are read from one
   * export, through one counter, at one band radius.
   *
   * It runs at the SHIPPED DEFAULTS (`coastlineWeight: none`,
   * `interiorWeight: thin`), so it is a claim about what a creator downloads
   * without touching a control.
   */
  test('an inland border inks while the coastline stays quiet, in one export', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const inland = await projectToExportPixel(page, FRANCO_GERMAN_BORDER_LON_LAT);
    const coastline = await projectToExportPixel(
      page,
      AUSTRALIA_WEST_COAST_LON_LAT,
    );
    const inlandBand = bandAround(inland, COASTLINE_BAND_RADIUS);
    const coastlineBand = bandAround(coastline, COASTLINE_BAND_RADIUS);

    const bytes = await exportRealApp(page, 'mesh-defaults');
    expect(readPngDimensions(bytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });

    // 1. CONTENT FLOOR FIRST, on the whole frame. Coastlines are `none` here,
    //    so the ink this counts is the interior mesh — which makes the floor
    //    the mesh's own presence check as well as the frame's.
    const frameInk = await countInkAroundRegion(
      page,
      bytes,
      WHOLE_FRAME_REGION,
      DARK_INK_THRESHOLD,
    );
    expect(
      frameInk.inside,
      `the exported frame measured ${frameInk.inside} ink pixels against a ` +
        `floor of ${MIN_MESH_INK_PIXELS} (derived from ` +
        `${MEASURED_MESH_INK_PIXELS} measured when this gate landed). At the ` +
        'shipped defaults that ink IS the interior mesh, so the frame is ' +
        'carrying no borders at all and both samples below would be about a ' +
        'blank square.',
    ).toBeGreaterThan(MIN_MESH_INK_PIXELS);

    // 2. THE INEQUALITY. Same export, same counter, same radius.
    const inlandInk = await countInkAroundRegion(
      page,
      bytes,
      inlandBand,
      DARK_INK_THRESHOLD,
    );
    expect(
      inlandInk.inside,
      `the Franco-German border band at (${inland[0]}, ${inland[1]}) measured ` +
        `${inlandInk.inside} ink pixels. The interior mesh did not reach the ` +
        'PNG, so the map downloads with no lines between countries.',
    ).toBeGreaterThan(MIN_COASTLINE_BAND_INK_PIXELS);

    const coastlineInk = await countInkAroundRegion(
      page,
      bytes,
      coastlineBand,
      DARK_INK_THRESHOLD,
    );
    expect(
      coastlineInk.inside,
      `the Australian coastline band at (${coastline[0]}, ${coastline[1]}) ` +
        `measured ${coastlineInk.inside} dark pixels at ` +
        '`coastlineWeight: none`. Either the mesh is drawing coastlines - it ' +
        'is derived from edges present in exactly TWO polygons, so it cannot - ' +
        'or a country outline came back.',
    ).toBe(0);

    // 3. THE COUNTER'S OWN CONTROL, over both bands.
    await expectBlankControlReadsZeroInk(page, inlandBand);
    await expectBlankControlReadsZeroInk(page, coastlineBand);
  });

  /**
   * **GATE B (04-09) — interaction state is absent from the PNG, structurally.**
   *
   * Australia is the subject because it has no land neighbours: at the shipped
   * defaults the band around its west coast carries EXACTLY ZERO ink, so a
   * selection ring there is not a small delta against a busy background - it is
   * the difference between nothing and something.
   *
   * The comparison is against an unselected control export of the same region
   * in the same run, so "no selection stroke" cannot be satisfied by an export
   * that failed to draw anything.
   */
  test('a selected country ships no selection stroke into the PNG', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const coastline = await projectToExportPixel(
      page,
      AUSTRALIA_WEST_COAST_LON_LAT,
    );
    const band = bandAround(coastline, COASTLINE_BAND_RADIUS);
    const inland = await projectToExportPixel(page, FRANCO_GERMAN_BORDER_LON_LAT);
    const inlandBand = bandAround(inland, COASTLINE_BAND_RADIUS);

    // 1. THE UNSELECTED CONTROL, first and in the same run.
    const controlBytes = await exportRealApp(page, 'selection-control');
    const controlInk = await countInkAroundRegion(
      page,
      controlBytes,
      band,
      DARK_INK_THRESHOLD,
    );

    // 2. SELECT AUSTRALIA. By keyboard: a `.click()` targets the bounding-box
    //    centre, and the editor's own roving tab stop is the real path anyway.
    const australia = page.locator(
      'path.country-path[role="option"][data-country-id="AUS"]',
    );
    await australia.focus();
    await australia.press('Enter');
    await expect(australia).toHaveAttribute('aria-selected', 'true');
    // The editor really IS drawing the ring, or the absence below is about
    // nothing at all. This is the discrimination control for the whole gate.
    await expect(
      page.locator(
        'svg.map-canvas [data-layer="highlight"] path.map-highlight-path--selected',
      ),
    ).toHaveCount(MESH_WRAP_COPY_COUNT);

    const selectedBytes = await exportRealApp(page, 'selection-selected');
    expect(readPngDimensions(selectedBytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });

    // 3. CONTENT FLOOR on the SELECTED export specifically, so the comparison
    //    below is between two real maps rather than between two failures.
    const selectedFrameInk = await countInkAroundRegion(
      page,
      selectedBytes,
      WHOLE_FRAME_REGION,
      DARK_INK_THRESHOLD,
    );
    expect(
      selectedFrameInk.inside,
      `the selected export measured ${selectedFrameInk.inside} ink pixels ` +
        `against a floor of ${MIN_MESH_INK_PIXELS}.`,
    ).toBeGreaterThan(MIN_MESH_INK_PIXELS);
    const selectedInlandInk = await countInkAroundRegion(
      page,
      selectedBytes,
      inlandBand,
      DARK_INK_THRESHOLD,
    );
    expect(
      selectedInlandInk.inside,
      'the selected export carries no interior border ink, so the counter is ' +
        'reading a frame with no geography in it.',
    ).toBeGreaterThan(MIN_COASTLINE_BAND_INK_PIXELS);

    // 4. THE PROPERTY. The selected export's coastline band matches the
    //    unselected control's, within a tolerance derived from a measurement
    //    recorded in this change: both measured EXACTLY 0, and the RED proof
    //    that deletes `data-editor-only` measured 132. The tolerance is 2 -
    //    room for anti-aliasing jitter, sixty-six times below the real signal.
    const selectedInk = await countInkAroundRegion(
      page,
      selectedBytes,
      band,
      DARK_INK_THRESHOLD,
    );
    expect(
      Math.abs(selectedInk.inside - controlInk.inside),
      `the selected export measured ${selectedInk.inside} ink pixels around ` +
        `Australia's coast against the unselected control's ` +
        `${controlInk.inside}. The editor's selection ring reached the ` +
        "creator's published image - which means `sanitizeExportClone` " +
        'stopped removing `data-editor-only` elements wholesale.',
    ).toBeLessThanOrEqual(SELECTION_INK_TOLERANCE);
    // Stated absolutely as well as as a delta: two equal NON-zero counts would
    // satisfy the difference above while still meaning a ring shipped twice.
    expect(controlInk.inside).toBe(0);
    expect(selectedInk.inside).toBe(0);

    // 5. THE COUNTER'S OWN CONTROL.
    await expectBlankControlReadsZeroInk(page, band);
  });
});

test.describe('uncolored fill', (): void => {
  /**
   * **GATE C — an uncoloured country is grey in the PNG, and its stored value
   * is still the `#FFFFFF` sentinel.**
   *
   * With white water and an unstroked coast a white country would vanish, which
   * is the whole reason D4-09 exists — so "the interior sample is not the water
   * colour" is the load-bearing half, not decoration.
   */
  test('an uncolored country exports the creator fill, not the water', async ({
    page,
  }): Promise<void> => {
    await page.goto('/');
    await waitForApp(page);

    const interior = await projectToExportPixel(page, CENTRAL_BRAZIL_LON_LAT);

    // 1. CONTENT FLOOR FIRST, on a frame that provably carries geography.
    //    Coastlines default to `none`, so the floor is taken at `Thin` — the
    //    pre-04-08 weight — and then the fill is measured at the default.
    await openRailTool(page, 'Map style');
    await chooseStrokeWeight(page, 'Coastlines', 'Thin');
    const inkedBytes = await exportRealApp(page, 'uncolored-floor');
    const floorInk = await countInkAroundRegion(
      page,
      inkedBytes,
      WHOLE_FRAME_REGION,
      DARK_INK_THRESHOLD,
    );
    expect(
      floorInk.inside,
      `the exported frame measured ${floorInk.inside} ink pixels against a ` +
        `floor of ${MIN_BOUNDARY_INK_PIXELS}. It carries no geography, so ` +
        'every colour assertion below would be about a blank square.',
    ).toBeGreaterThan(MIN_BOUNDARY_INK_PIXELS);

    // 2. THE PROPERTY, at the shipped defaults.
    await chooseStrokeWeight(page, 'Coastlines', 'None');
    const bytes = await exportRealApp(page, 'uncolored-default');
    expect(readPngDimensions(bytes)).toEqual({
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
    });

    const sample = await samplePngPoints(page, bytes, [interior]);
    const [pixel] = sample.pixels;
    if (pixel === undefined) {
      throw new Error('The sampler returned no pixel.');
    }
    expect(
      pixel.slice(0, 3),
      `central Brazil is rgb(${pixel.slice(0, 3).join(', ')}), not the ` +
        `uncolored fill ${DEFAULT_UNCOLORED_FILL_HEX}.`,
    ).toEqual([...hexToRgb(DEFAULT_UNCOLORED_FILL_HEX)]);
    expect(pixel[3]).toBe(255);
    expect(
      pixel.slice(0, 3),
      'the uncoloured country is the water colour, so it is invisible against ' +
        'the ocean. That is the exact defect D4-09 exists to prevent.',
    ).not.toEqual([...hexToRgb(DEFAULT_SURFACE_COLOR)]);

    // 3. THE STORED VALUE NEVER MOVED. The render maps the sentinel; the map
    //    itself is read-only. A refactor that "simplified" the sentinel away
    //    would put every uncoloured country into the legend.
    const stored = await page.evaluate(
      (countryId: string): string | null => {
        const path = document.querySelector(
          `path.country-path[data-country-id="${countryId}"]`,
        );
        return path === null ? null : path.getAttribute('aria-label');
      },
      CENTRAL_BRAZIL_COUNTRY_ID,
    );
    expect(
      stored,
      'the announced colour followed the render. #FFFFFF is what storage ' +
        'holds and what reconcileLegend excludes; only the paint is mapped.',
    ).toContain('current color #FFFFFF');
    // ...and no grey legend row appeared. `reconcileLegend` excludes exactly
    // `#FFFFFF`, so a render-time fill leaking into its feed would auto-add one
    // entry per uncoloured country to every composition on earth.
    await expect(page.locator('[data-layer="legend"] text')).toHaveCount(0);

    // 4. THE COUNTER'S OWN CONTROL, through the same machinery.
    await expectBlankControlReadsZeroInk(page, WHOLE_FRAME_REGION);
  });
});
