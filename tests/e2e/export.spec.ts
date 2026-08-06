import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, type Download, type Page } from '@playwright/test';

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

interface CloneSummary {
  readonly svgCount: number;
  readonly frameBackgroundColor: string;
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
      selectCountry(countryId: string): void;
      showDateLine(): boolean;
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
    throw new Error('No export clone was handed to html2canvas.');
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
    expect(clone.layerOrder).toEqual(['camera', 'legend']);
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
