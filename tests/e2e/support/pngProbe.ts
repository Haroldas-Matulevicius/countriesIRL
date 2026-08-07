import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, type Download, type Page } from '@playwright/test';

import { MAP_VIEWBOX_SIZE } from '../../../src/constants/config';
import {
  WIDEST_CHARACTER_ADVANCE_EM,
  compositionTextLength,
  resolveCompositionTextLines,
} from '../../../src/utils/compositionText';

/**
 * The ONE PNG decode path for the whole Playwright suite (`04-13`).
 *
 * These functions lived inside `export.spec.ts` until `04-13` needed them in
 * `legend.spec.ts` too. `04-12` hit the same wall and resolved it by moving the
 * gate INTO `export.spec.ts`, on the stated ground that *"two PNG decode paths
 * in one spec is how a sampled-pixel assertion quietly starts measuring a
 * differently decoded image."* That reasoning is right and it does not stop at
 * the file boundary: two decode paths in two specs is the same defect with a
 * longer fuse, because the two drift silently and nothing compares them.
 *
 * So the helpers moved HERE instead, and `export.spec.ts` imports them rather
 * than declaring them. There is exactly one `createImageBitmap`, one canvas,
 * one `getImageData`, and one ink predicate behind every pixel claim this
 * repository makes.
 *
 * ⚠ **`tests/e2e/support/` is the home for shared browser helpers**
 * (`coding-rules/general.md`): import from here, never re-declare.
 */

/** The export contract, and the only size any of this is valid for. */
export const EXPORT_PNG_SIZE = MAP_VIEWBOX_SIZE;

/** Any channel below this is ink; above it is white or an anti-alias halo. */
export const INK_CHANNEL_THRESHOLD = 240;

/**
 * The MAP-ink threshold. A light water tint such as `#F5EFE6` has two channels
 * below 240, so at the default threshold the whole ocean counts as content and
 * a content floor stops measuring anything. `04-12` recorded the trap by
 * number: at 240 a legend crop measured 36,225 — the entire rectangle.
 */
export const DARK_INK_THRESHOLD = 100;

export interface PngRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RegionInkCounts {
  readonly inside: number;
  readonly outside: number;
}

export interface PointSample {
  readonly width: number;
  readonly height: number;
  readonly pixels: ReadonlyArray<ReadonlyArray<number>>;
}

export function readPngDimensions(bytes: Buffer): {
  width: number;
  height: number;
} {
  const signature = bytes.subarray(0, 8).toString('hex');
  expect(signature).toBe('89504e470d0a1a0a');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

export function hexToRgb(hex: string): readonly [number, number, number] {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

/**
 * Every derived crop is bounded to the 1080 frame ABSOLUTELY.
 *
 * `04-11` measured what happens without this: a crop derived from its
 * subject's own layout moved with the subject, `drawImage` read off-bitmap,
 * and the transparent black it returned was counted as solid ink — **28,050
 * phantom pixels** passing a content floor. Every legend crop goes through
 * here before anything is sampled.
 */
export function expectRegionInsideFrame(region: PngRegion): void {
  expect(region.width, 'a derived crop has no width').toBeGreaterThan(0);
  expect(region.height, 'a derived crop has no height').toBeGreaterThan(0);
  expect(
    region.x,
    'a derived crop starts left of the frame',
  ).toBeGreaterThanOrEqual(0);
  expect(
    region.y,
    'a derived crop starts above the frame',
  ).toBeGreaterThanOrEqual(0);
  expect(
    region.x + region.width,
    'a derived crop runs off the right of the 1080 frame — off-bitmap ' +
      'samples read as transparent black and count as ink (04-11)',
  ).toBeLessThanOrEqual(EXPORT_PNG_SIZE);
  expect(
    region.y + region.height,
    'a derived crop runs off the bottom of the 1080 frame — off-bitmap ' +
      'samples read as transparent black and count as ink (04-11)',
  ).toBeLessThanOrEqual(EXPORT_PNG_SIZE);
}

/**
 * Rec. 709 relative luminance on the **0..255** scale — the ONE definition
 * behind every band and luminance-ordering claim in the suite.
 *
 * ⚠ It is deliberately NOT `src/utils/contrast.ts`'s `relativeLuminance`, which
 * is the gamma-linearised WCAG quantity on 0..1. The two answer different
 * questions and a caller that swaps one for the other silently changes every
 * threshold. `04-15` moved this here from `export.spec.ts` because a second
 * spec needed it, and two spellings of a luminance is the same drift shape as
 * two decode paths.
 */
export function rec709Luminance(pixel: ReadonlyArray<number>): number {
  return (
    0.2126 * (pixel[0] ?? 0) +
    0.7152 * (pixel[1] ?? 0) +
    0.0722 * (pixel[2] ?? 0)
  );
}

/** Breathing room around a derived glyph box, in viewBox user units. */
export const TEXT_REGION_MARGIN = 8;

/**
 * The crop a composition TITLE's glyphs must land in, DERIVED from the same
 * pure function `MapCanvas` renders from — never a pasted rectangle. The width
 * is the worst-case run of the string at the recorded 1.0202em advance, so the
 * box provably contains the whole line however it sets.
 *
 * Bounded to the 1080 frame before it is returned: `04-11` measured 28,050
 * phantom pixels from a derived crop that moved off-bitmap with its own
 * subject.
 */
export function compositionTitleInkRegion(value: string): PngRegion {
  const [line] = resolveCompositionTextLines(
    { title: value, subtitle: '', attribution: '' },
    { title: 'medium', subtitle: 'medium' },
    'left',
  );
  if (line === undefined) {
    throw new Error('the gate title produced no line at all.');
  }
  const region: PngRegion = {
    x: line.x - TEXT_REGION_MARGIN,
    y: line.y - line.fontSize,
    width:
      Math.ceil(
        compositionTextLength(value) *
          line.fontSize *
          WIDEST_CHARACTER_ADVANCE_EM,
      ) +
      2 * TEXT_REGION_MARGIN,
    height: Math.ceil(line.fontSize * 1.25),
  };
  expectRegionInsideFrame(region);
  return region;
}

/**
 * The ONE arbitrary-point sampler. `null` for the point list means the four
 * corners.
 */
export async function samplePngPoints(
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
      const resolved =
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
        pixels: resolved.map(([x, y]): ReadonlyArray<number> => [
          ...context.getImageData(x, y, 1, 1).data,
        ]),
      };
    },
    { base64: bytes.toString('base64'), requested: points },
  );
}

/**
 * Count ink pixels inside vs outside a region, with a four-pixel margin for
 * centred strokes and anti-aliasing.
 *
 * One counter, two thresholds — a second counting function is how a blank
 * control ends up validating a different counter from the one it polices.
 */
export async function countInkAroundRegion(
  page: Page,
  bytes: Buffer,
  region: PngRegion,
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
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height)
        .data;

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

export interface RegionColorCounts {
  /**
   * One row per requested region, in order; one column per requested colour,
   * in order. `regions[r][c]` is how many pixels inside region `r` match
   * colour `c` EXACTLY.
   */
  readonly regions: ReadonlyArray<ReadonlyArray<number>>;
  readonly totalNonWhitePixels: number;
}

/**
 * Count EXACT colour matches inside arbitrary, caller-chosen regions.
 *
 * *"Count colors in disjoint regions, never in the whole frame"*
 * (`coding-rules/export.md`). A legend swatch is painted in the country's own
 * colour, so a whole-frame count cannot tell "the country reached the PNG"
 * from "its legend mark did". This is the ONE implementation of that count:
 * `04-15` generalised `final-integration.spec.ts`'s private corner-box counter
 * rather than adding a third `createImageBitmap` beside it.
 *
 * Regions are HALF-OPEN — `x <= px < x + width` — and every one of them is
 * bounded to the 1080 frame before a pixel is read (`04-11`).
 */
export async function countExactColorsInRegions(
  page: Page,
  bytes: Buffer,
  colors: ReadonlyArray<string>,
  regions: ReadonlyArray<PngRegion>,
): Promise<RegionColorCounts> {
  regions.forEach((region: PngRegion): void => {
    expectRegionInsideFrame(region);
  });

  return page.evaluate(
    async ({
      base64,
      wanted,
      boxes,
    }: {
      base64: string;
      wanted: ReadonlyArray<ReadonlyArray<number>>;
      boxes: ReadonlyArray<PngRegion>;
    }): Promise<RegionColorCounts> => {
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
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height)
        .data;

      const counts = boxes.map((): number[] => wanted.map((): number => 0));
      let totalNonWhitePixels = 0;

      for (let offset = 0; offset < pixels.length; offset += 4) {
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        if (red !== 255 || green !== 255 || blue !== 255) {
          totalNonWhitePixels += 1;
        }

        let matched = -1;
        for (let index = 0; index < wanted.length; index += 1) {
          const triple = wanted[index];
          if (red === triple[0] && green === triple[1] && blue === triple[2]) {
            matched = index;
            break;
          }
        }
        if (matched < 0) {
          continue;
        }

        const pixelIndex = offset / 4;
        const x = pixelIndex % bitmap.width;
        const y = (pixelIndex - x) / bitmap.width;
        for (let box = 0; box < boxes.length; box += 1) {
          const region = boxes[box];
          if (
            x >= region.x &&
            x < region.x + region.width &&
            y >= region.y &&
            y < region.y + region.height
          ) {
            counts[box][matched] += 1;
          }
        }
      }

      return { regions: counts, totalNonWhitePixels };
    },
    {
      base64: bytes.toString('base64'),
      wanted: colors.map((hex): ReadonlyArray<number> => {
        const value = hex.replace('#', '');
        return [
          Number.parseInt(value.slice(0, 2), 16),
          Number.parseInt(value.slice(2, 4), 16),
          Number.parseInt(value.slice(4, 6), 16),
        ];
      }),
      boxes: regions,
    },
  );
}

/** A flat frame in one colour, encoded through the browser's own PNG encoder. */
export async function makeFloodFilledPng(
  page: Page,
  hex: string,
): Promise<Buffer> {
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
    { color: hex, size: EXPORT_PNG_SIZE },
  );
  return Buffer.from(base64, 'base64');
}

/**
 * `02-27`'s discrimination control, run through the SAME function and threshold
 * as every measurement beside it. A flat frame in the water colour must read
 * ZERO ink, or a "no dark ink here" assertion is satisfied by a counter that
 * cannot see anything at all.
 */
export async function expectBlankControlReadsZeroInk(
  page: Page,
  region: PngRegion,
  surfaceColor: string,
): Promise<void> {
  const blank = await makeFloodFilledPng(page, surfaceColor);
  expect(readPngDimensions(blank)).toEqual({
    width: EXPORT_PNG_SIZE,
    height: EXPORT_PNG_SIZE,
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

const DOWNLOAD_ROOT = resolve('.artifacts/playwright/downloads');

export async function saveDownloadedPng(
  download: Download,
  name: string,
): Promise<Buffer> {
  const target = resolve(DOWNLOAD_ROOT, name);
  await download.saveAs(target);
  return readFile(target);
}

/** Click `Export PNG` in the real app and return the downloaded bytes. */
export async function exportRealAppPng(
  page: Page,
  label: string,
): Promise<Buffer> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const download = await downloadPromise;
  return saveDownloadedPng(download, `${label}.png`);
}
