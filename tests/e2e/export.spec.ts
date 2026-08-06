import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, type Download, type Page } from '@playwright/test';

import { EXPORT_FONT_FACE_SUPPRESSION_FLAG } from '../../src/constants/config';
import {
  LEGEND_CHARACTERS_PER_LINE,
  resolveLegendRender,
} from '../../src/utils/legend';
import type { LegendState } from '../../src/types/composition';

const EXPORT_FIXTURE_URL = '/tests/e2e/fixtures/export.html';
const EXPORT_ARTIFACT_ROOT = resolve('.artifacts/playwright/downloads');
const EXPORT_SIZE = 1080;
const LOGICAL_CORE_COUNT = 195;
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

interface CloneFontStyleSummary {
  readonly isFirstChild: boolean;
  readonly hasFontFace: boolean;
  readonly hasWoff2DataUrl: boolean;
}

interface CloneSummary {
  readonly svgCount: number;
  readonly frameBackgroundColor: string;
  readonly fontStyle: CloneFontStyleSummary | null;
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

async function samplePngCorners(
  page: Page,
  bytes: Buffer,
): Promise<CornerSample> {
  return page.evaluate(async (base64: string): Promise<CornerSample> => {
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
    const points = [
      [0, 0],
      [bitmap.width - 1, 0],
      [0, bitmap.height - 1],
      [bitmap.width - 1, bitmap.height - 1],
    ];
    return {
      width: bitmap.width,
      height: bitmap.height,
      corners: points.map(([x, y]): ReadonlyArray<number> => [
        ...context.getImageData(x as number, y as number, 1, 1).data,
      ]),
    };
  }, bytes.toString('base64'));
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
      threshold: INK_CHANNEL_THRESHOLD,
    },
  );
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
    sample.corners.forEach((corner): void => {
      expect(corner).toEqual([255, 255, 255, 255]);
    });

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
    expect(clone.layerOrder).toEqual([null, 'camera', 'legend']);
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

    const measured = await page.evaluate(
      async ({ normal, suppressed, box, threshold }) => {
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
          canvas.width = box.width;
          canvas.height = box.height;
          const context = canvas.getContext('2d');
          if (context === null) {
            throw new Error('2D context is unavailable for PNG inspection.');
          }
          // Crop to the legend region while drawing.
          context.drawImage(
            bitmap,
            box.x,
            box.y,
            box.width,
            box.height,
            0,
            0,
            box.width,
            box.height,
          );
          return context.getImageData(0, 0, box.width, box.height);
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

        const normalCrop = await decode(normal);
        const suppressedCrop = await decode(suppressed);
        // The deliberately blank crop: an all-white buffer of the same size,
        // run through the SAME counting machinery. It validates the
        // instrument — a counter that reads ink into anything fails on it —
        // and it is what the two real crops must both differ from.
        const blankCrop = new ImageData(box.width, box.height);
        blankCrop.data.fill(255);

        return {
          inkNormal: countInk(normalCrop),
          inkSuppressed: countInk(suppressedCrop),
          inkBlank: countInk(blankCrop),
          diffNormalVsSuppressed: countDiff(normalCrop, suppressedCrop),
          diffNormalVsBlank: countDiff(normalCrop, blankCrop),
          diffSuppressedVsBlank: countDiff(suppressedCrop, blankCrop),
        };
      },
      {
        normal: normalBytes.toString('base64'),
        suppressed: suppressedBytes.toString('base64'),
        box: region,
        threshold: INK_CHANNEL_THRESHOLD,
      },
    );

    // Content floor FIRST: two blank corners satisfy "they differ" perfectly,
    // and that exact defect shape has shipped here once.
    expect(
      measured.inkNormal,
      'the Inter-embedded legend crop is blank',
    ).toBeGreaterThan(500);
    expect(
      measured.inkSuppressed,
      'the font-suppressed legend crop is blank',
    ).toBeGreaterThan(500);

    // The load-bearing inequality: suppressing the embedded @font-face must
    // CHANGE the rasterised legend pixels. If Chrome ignored the data-URI
    // font, both runs fall back identically and this reads ~0.
    expect(
      measured.diffNormalVsSuppressed,
      'the embedded @font-face did not change the rasterised legend — ' +
        'Inter never resolved in the exported PNG',
    ).toBeGreaterThan(200);

    // Blank-crop discrimination control: the counting machinery reads the
    // blank as blank, and both real crops differ from it.
    expect(measured.inkBlank).toBe(0);
    expect(measured.diffNormalVsBlank).toBeGreaterThan(500);
    expect(measured.diffSuppressedVsBlank).toBeGreaterThan(500);
  });

  test('CF-2: a latin-ext glyph falls back mid-string — observed, documented behaviour', async ({
    page,
  }): Promise<void> => {
    /*
     * The vendored Inter subset is latin-only (stops at U+00FF). This test
     * pins the consequence as an observed fact rather than a surprise:
     * embedding the font changes latin glyphs ('sss') and does NOT change
     * latin-ext glyphs ('ššš') — 'š' falls back to the same generic face
     * with or without the embedded font. No full-Unicode claim is made.
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
