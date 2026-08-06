import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { waitForApp } from './support/appHarness';

/**
 * The shell, measured in a real browser (D-11 / D-16 / D-19 / D-32).
 *
 * Two of these three claims are unprovable in the `node` unit environment:
 * "the frame marks the exported square" is a statement about projected
 * geometry, and "the panel reserves space rather than covering the map" is a
 * statement about two rects. A class assertion satisfies both while the layout
 * is wrong.
 *
 * Chrome only. Edge is not installed on this machine (D-33) and no Edge,
 * Firefox, or Safari result is claimed anywhere in this suite.
 */

const EXPORT_ARTIFACT_ROOT = resolve('.artifacts/playwright/downloads');
const EXPORT_SIZE = 1080;
const VIEWBOX_SIZE = 1080;
const RAIL_WIDTH = 56;
const OPEN_PANEL_WIDTH = 280;
const CLOSED_PANEL_WIDTH = 0;

/**
 * A twentieth of a CSS pixel, and the number is chosen from a measurement
 * rather than from caution.
 *
 * The two rects come from different engines - the SVG viewport algorithm places
 * the viewBox square, the layout engine places an absolutely positioned box
 * from a `min(100cqw, 100cqh)` container query - so some disagreement is
 * expected. Measured in installed Chrome at all three shapes below, the largest
 * disagreement on any edge is **6e-14 px**: floating-point noise, nothing more.
 * Blink's layout unit is 1/64 px (0.015625), so 0.05 leaves room for rounding
 * that a correct implementation could legitimately produce.
 *
 * **The tolerance the plan proposed - 1px - could not fail its own RED probe.**
 * Insetting the frame by 1px moves each edge by exactly 1px, which a `<= 1`
 * check passes. It was measured, observed green, and tightened; the probe is
 * recorded in `03-03-SUMMARY.md`.
 */
const FRAME_TOLERANCE_PX = 0.05;

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface FrameGeometry {
  readonly projected: Rect;
  readonly frame: Rect;
}

const VIEWPORT_SHAPES = [
  { name: 'wide', width: 1440, height: 820 },
  { name: 'tall', width: 900, height: 1200 },
  { name: 'near-square', width: 1000, height: 980 },
] as const;

async function readFrameGeometry(page: Page): Promise<FrameGeometry> {
  return page.evaluate((viewBoxSize: number): FrameGeometry => {
    const svg = document.querySelector<SVGSVGElement>('svg.map-canvas');
    const frame = document.querySelector<HTMLElement>('.map-frame');
    if (svg === null || frame === null) {
      throw new Error('The canvas or the export frame is missing.');
    }

    const matrix = svg.getScreenCTM();
    if (matrix === null) {
      throw new Error('The canvas has no screen transform.');
    }

    const project = (x: number, y: number): DOMPoint =>
      new DOMPoint(x, y).matrixTransform(matrix);
    const origin = project(0, 0);
    const opposite = project(viewBoxSize, viewBoxSize);
    const frameRect = frame.getBoundingClientRect();

    return {
      projected: {
        left: origin.x,
        top: origin.y,
        right: opposite.x,
        bottom: opposite.y,
      },
      frame: {
        left: frameRect.left,
        top: frameRect.top,
        right: frameRect.right,
        bottom: frameRect.bottom,
      },
    };
  }, VIEWBOX_SIZE);
}

async function readGridTracks(page: Page): Promise<number[]> {
  return page
    .locator('.map-editor')
    .evaluate((element): number[] =>
      globalThis
        .getComputedStyle(element)
        .gridTemplateColumns.split(' ')
        .map((track): number => Number.parseFloat(track)),
    );
}

/**
 * The track animates, so a measurement taken immediately after the click reads
 * a frame of the transition rather than the contract. Polling the used value is
 * the honest wait - it does not depend on knowing the duration.
 */
async function waitForPanelTrack(page: Page, width: number): Promise<number[]> {
  await expect
    .poll(async (): Promise<number> => (await readGridTracks(page))[1])
    .toBeCloseTo(width, 1);
  return readGridTracks(page);
}

/**
 * `03-06` replaced the one interim `Map tools` trigger with the four real tool
 * rows, so opening the track means opening a TOOL. The row is addressed by its
 * stable `data-tool` rather than by an index: assertion 16's whole subject is
 * that a rail of near-identical icon rows must never be keyed on order.
 */
async function setPanelOpen(page: Page, isOpen: boolean): Promise<void> {
  const trigger = page.locator('.tool-rail__row[data-tool="colors"]');
  if ((await trigger.getAttribute('aria-expanded')) !== String(isOpen)) {
    await trigger.click();
  }
  await expect(page.locator('.map-editor')).toHaveAttribute(
    'data-panel-open',
    String(isOpen),
  );
  await waitForPanelTrack(page, isOpen ? OPEN_PANEL_WIDTH : CLOSED_PANEL_WIDTH);
}

function readPngDimensions(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test.describe('editor shell', (): void => {
  test('the export frame is exactly the projected viewBox square at every shape', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);

    for (const shape of VIEWPORT_SHAPES) {
      await page.setViewportSize({ width: shape.width, height: shape.height });
      // The frame is placed by container query math, so it settles with layout
      // rather than on a timer; the geometry read below is what waits for it.
      await expect(page.locator('.map-frame')).toBeVisible();

      const { projected, frame } = await readFrameGeometry(page);

      (['left', 'top', 'right', 'bottom'] as const).forEach((edge): void => {
        expect(
          Math.abs(projected[edge] - frame[edge]),
          `${shape.name}: the frame's ${edge} edge is ${frame[edge]} but the ` +
            `viewBox square projects to ${projected[edge]}. The frame is the ` +
            'creator\'s only signal of what lands in the PNG, so it has to be ' +
            'the same square, not a similar one.',
        ).toBeLessThanOrEqual(FRAME_TOLERANCE_PX);
      });

      // And it is a square with a real side, so a collapsed frame that happens
      // to sit at the projected origin cannot pass the four edge checks above.
      const side = frame.right - frame.left;
      expect(side).toBeGreaterThan(100);
      expect(Math.abs(side - (frame.bottom - frame.top))).toBeLessThanOrEqual(
        FRAME_TOLERANCE_PX,
      );
      expect(side).toBeLessThanOrEqual(Math.min(shape.width, shape.height));
    }
  });

  test('the panel reserves its track and the canvas reflows instead of being covered', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize({ width: 1440, height: 820 });
    await waitForApp(page);

    await setPanelOpen(page, false);
    const closedTracks = await readGridTracks(page);
    const closedCanvas = await page.locator('.map-workspace').boundingBox();

    expect(closedTracks[0]).toBeCloseTo(RAIL_WIDTH, 1);
    expect(closedTracks[1]).toBeCloseTo(CLOSED_PANEL_WIDTH, 1);

    await setPanelOpen(page, true);
    const openTracks = await readGridTracks(page);
    const openCanvas = await page.locator('.map-workspace').boundingBox();

    expect(openTracks[0]).toBeCloseTo(RAIL_WIDTH, 1);
    expect(openTracks[1]).toBeCloseTo(OPEN_PANEL_WIDTH, 1);

    if (closedCanvas === null || openCanvas === null) {
      throw new Error('The canvas region has no box.');
    }

    /*
     * D-19, and the reason this is measured rather than asserted as a class:
     * an overlay panel is equally "visible" and equally 280px wide. Only the
     * canvas region's own left edge can tell the two apart.
     */
    expect(openCanvas.x - closedCanvas.x).toBeCloseTo(OPEN_PANEL_WIDTH, 0);
    expect(closedCanvas.width - openCanvas.width).toBeCloseTo(
      OPEN_PANEL_WIDTH,
      0,
    );
  });

  test('an export after a panel open and close cycle is still exactly 1080 square', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize({ width: 1440, height: 820 });
    await waitForApp(page);

    // The cheap end-to-end confirmation of D-32's verified claim: the viewBox
    // is fixed and d3-zoom's extent is pinned to the 1080 square, so no reflow
    // of the rail or the panel can reach the projection or the export.
    await setPanelOpen(page, false);
    await setPanelOpen(page, true);
    await setPanelOpen(page, false);
    await setPanelOpen(page, true);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PNG' }).click();
    const download = await downloadPromise;
    const target = resolve(EXPORT_ARTIFACT_ROOT, 'shell-after-reflow.png');
    await download.saveAs(target);

    const { readFile } = await import('node:fs/promises');
    const dimensions = readPngDimensions(await readFile(target));

    expect(dimensions.width).toBe(EXPORT_SIZE);
    expect(dimensions.height).toBe(EXPORT_SIZE);
  });
});
