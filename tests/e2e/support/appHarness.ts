import { expect, type Page } from '@playwright/test';

import { STORAGE_KEY } from '../../../src/constants/config';

/**
 * D4-10: the count of COLORABLE units, not of core states. 195 core states
 * plus the twelve self-colorable units. `waitForApp` gates on it and every
 * spec inherits it, so this constant is what reddens the whole suite if the
 * data and the runtime fall out of step.
 */
export const LOGICAL_CORE_COUNT = 207;
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

/**
 * `03-06` put every editor tool behind a rail row, and D-18 opens a first run
 * with the panel CLOSED. Anything that reaches for a colour swatch, the country
 * list, the legend editor, or Save/Load has to open its tool first.
 *
 * Declared here rather than re-declared per spec: two existing specs already
 * carry duplicated camera helpers as a recorded pending todo, and a rail helper
 * copied into eight files is the same debt with eight places to drift.
 */
export type RailToolLabel =
  | 'Colors'
  | 'Map style'
  | 'Countries'
  | 'Legend'
  | 'Saved Maps';

export async function openRailTool(
  page: Page,
  label: RailToolLabel,
): Promise<void> {
  const row = page.getByRole('button', { name: label, exact: true });
  if ((await row.getAttribute('aria-expanded')) === 'true') {
    return;
  }
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
}

/**
 * The legend DISCLOSURE inside the open Legend panel.
 *
 * `getByRole('button', { name: /^Legend/ })` now matches two controls - the
 * rail's `Legend` row and the disclosure's `Legend · N entries · Top left` -
 * so every caller scopes to the panel content rather than picking one by index.
 * An ordinal here would silently start clicking the rail row the next time the
 * rail's order changed.
 */
export function legendDisclosure(page: Page): ReturnType<Page['getByRole']> {
  return page
    .locator('.tool-panel__content')
    .getByRole('button', { name: /^Legend/ });
}

/**
 * Walks the sequential focus order from the top of the document.
 *
 * Promoted here from `rail.spec.ts` by `03-09`, which needed the same walk for
 * the narrow layout. A second copy would have drifted on the two things this
 * helper gets right and a naive one does not:
 *
 * - the STARTING POINT is reset for real. Blurring leaves the browser resuming
 *   `Tab` from wherever focus last was, so the walk "proves" an order that
 *   begins in the middle of the document. A temporary `tabindex="-1"` on `body`
 *   makes `focus()` take effect without adding a tab stop.
 * - `aria-hidden` children are EXCLUDED. Every rail control carries its label
 *   twice - once as the accessible name and once in the hidden tooltip chip -
 *   so a raw `textContent` reads `Export PNGExport PNG`, and an assertion
 *   written against that string pins the duplication as if it were the label.
 */
export async function collectTabOrder(
  page: Page,
  steps: number,
): Promise<ReadonlyArray<string>> {
  await page.evaluate((): void => {
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });

  const order: string[] = [];
  for (let step = 0; step < steps; step += 1) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate((): string => {
        const active = document.activeElement;
        if (active === null) {
          return '';
        }
        if (active.hasAttribute('aria-label')) {
          return active.getAttribute('aria-label') ?? '';
        }
        return [...active.childNodes]
          .filter(
            (node): boolean =>
              !(
                node instanceof Element &&
                node.getAttribute('aria-hidden') === 'true'
              ),
          )
          .map((node): string => node.textContent ?? '')
          .join('')
          .trim()
          .slice(0, 40);
      }),
    );
  }
  return order;
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
