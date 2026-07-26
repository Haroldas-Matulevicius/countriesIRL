import { expect, type Page } from '@playwright/test';

import { STORAGE_KEY } from '../../../src/constants/config';

export const LOGICAL_CORE_COUNT = 195;
export const CAMERA_GROUP_SELECTOR = '[data-layer="camera"]';
export const LOGICAL_PATH_SELECTOR = 'path.country-path[role="option"]';
export const CAMERA_OWNER_SENTINEL = 'data-camera-owner-sentinel';

export interface CameraTransform {
  readonly k: number;
  readonly x: number;
  readonly y: number;
}

export async function waitForApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
    LOGICAL_CORE_COUNT,
  );
  const startCreating = page.getByRole('button', { name: 'Start Creating' });
  if (await startCreating.isVisible()) {
    await startCreating.click();
  }
}

export async function clearSavedMaps(page: Page): Promise<void> {
  await page.evaluate(
    (storageKey): void => localStorage.removeItem(storageKey),
    STORAGE_KEY,
  );
}

/**
 * The sentinel is written onto the live SVG once and never re-applied. It
 * survives a layout change only while the same DOM node does, so it is the
 * evidence that the 1200px transition *moved* the canvas instead of remounting
 * a second camera owner.
 */
export async function stampCameraOwnerSentinel(page: Page): Promise<void> {
  await page.locator('svg.map-canvas').evaluate((svg, attribute): void => {
    svg.setAttribute(attribute, 'stable-owner');
  }, CAMERA_OWNER_SENTINEL);
}

export async function expectOneCameraOwner(page: Page): Promise<void> {
  await expect(page.locator('svg.map-canvas')).toHaveCount(1);
  await expect(page.locator(CAMERA_GROUP_SELECTOR)).toHaveCount(1);
  await expect(page.locator('svg.map-canvas')).toHaveAttribute(
    CAMERA_OWNER_SENTINEL,
    'stable-owner',
  );
}

export async function readCameraTransform(page: Page): Promise<CameraTransform> {
  return page
    .locator(CAMERA_GROUP_SELECTOR)
    .first()
    .evaluate((element): CameraTransform => {
      const group = element as SVGGElement;
      const matrix = group.transform.baseVal.consolidate()?.matrix;
      if (matrix === undefined) {
        throw new Error('Camera transform is unavailable');
      }
      return { k: matrix.a, x: matrix.e, y: matrix.f };
    });
}

export async function expectD3ZoomSynchronized(page: Page): Promise<void> {
  const synchronization = await page
    .locator('svg.map-canvas')
    .evaluate((element) => {
      const svg = element as SVGSVGElement & {
        __zoom?: { readonly k: number; readonly x: number; readonly y: number };
      };
      const cameraGroup = svg.querySelector<SVGGElement>('[data-layer="camera"]');
      const matrix = cameraGroup?.transform.baseVal.consolidate()?.matrix;
      if (svg.__zoom === undefined || matrix === undefined) {
        throw new Error('D3 zoom state is unavailable.');
      }
      return {
        zoom: svg.__zoom,
        transform: { k: matrix.a, x: matrix.e, y: matrix.f },
      };
    });

  expect(synchronization.zoom.k).toBeCloseTo(synchronization.transform.k, 4);
  expect(synchronization.zoom.x).toBeCloseTo(synchronization.transform.x, 2);
  expect(synchronization.zoom.y).toBeCloseTo(synchronization.transform.y, 2);
}

/** Waits on real frames rather than a sleep, so transitions are never raced. */
export async function waitForSettledCamera(
  page: Page,
): Promise<CameraTransform> {
  let previous = await readCameraTransform(page);
  await expect
    .poll(async (): Promise<boolean> => {
      await page.evaluate(
        (): Promise<void> =>
          new Promise((resolve): void => {
            requestAnimationFrame((): void => {
              requestAnimationFrame((): void => resolve());
            });
          }),
      );
      const current = await readCameraTransform(page);
      const isSettled =
        Math.abs(current.k - previous.k) < 0.000001 &&
        Math.abs(current.x - previous.x) < 0.000001 &&
        Math.abs(current.y - previous.y) < 0.000001;
      previous = current;
      return isSettled;
    })
    .toBe(true);
  return readCameraTransform(page);
}
