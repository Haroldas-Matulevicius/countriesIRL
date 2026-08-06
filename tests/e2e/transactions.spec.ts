import { expect, test, type Locator, type Page } from '@playwright/test';

import { STORAGE_KEY } from '../../src/constants/config';
import {
  CAMERA_GROUP_SELECTOR,
  clearSavedMaps,
  expectD3ZoomSynchronized,
  expectOneCameraOwner,
  legendDisclosure,
  openRailTool,
  readCameraTransform,
  stampCameraOwnerSentinel,
  waitForApp,
  waitForSettledCamera,
} from './support/appHarness';
import {
  HISTORICAL_ASSET_PATH,
  HISTORICAL_ENTITY_ID,
  createHistoricalBrowserFixture,
  createHistoricalSavedRecord,
} from './support/historicalFixture';

const DESKTOP_VIEWPORT = { width: 1300, height: 900 };
const COMPACT_VIEWPORT = { width: 900, height: 900 };
const EXPORT_SUCCESS = 'PNG downloaded at 1080 × 1080.';
const EXPORT_GENERIC_FAILURE =
  'The PNG could not be created. Your map is unchanged. Try Export PNG again.';
const EXPORT_LAYOUT_FAILURE =
  'The map layout could not be captured. Your map is unchanged. Move the legend, then try Export PNG again.';
const LEGEND_BLOCKED =
  'Shorten this label so it fits in the exported legend.';

function workspace(page: Page): Locator {
  return page.getByRole('main', { name: 'Map creator workspace' });
}

async function expectLayout(
  page: Page,
  layout: 'desktop' | 'compact',
): Promise<void> {
  await expect(workspace(page)).toHaveClass(
    layout === 'desktop' ? /workspace--desktop/ : /workspace--compact/,
  );
}

/**
 * The only proof that a callback reached the *visible* canvas: the transform on
 * the mounted camera group moved. Reading a hook's return value would pass even
 * if App were driving a canvas that is no longer on screen.
 */
async function expectCameraInputRenewed(
  page: Page,
  action: 'Zoom In' | 'Zoom Out',
): Promise<void> {
  const before = await waitForSettledCamera(page);
  await page.getByRole('button', { name: action }).click();
  const zoomPoll = expect.poll(
    async (): Promise<number> => (await readCameraTransform(page)).k,
  );
  if (action === 'Zoom In') {
    await zoomPoll.toBeGreaterThan(before.k);
  } else {
    await zoomPoll.toBeLessThan(before.k);
  }
  await expectD3ZoomSynchronized(page);
}

test('every camera callback reaches the one bound handle across the 1200px remount', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await waitForApp(page);
  await clearSavedMaps(page);
  await stampCameraOwnerSentinel(page);

  await expectOneCameraOwner(page);
  // UI-SPEC: Reset View belongs to the composition bar and nowhere else, and
  // the navigation cluster exposes exactly three actions.
  await expect(page.getByRole('button', { name: 'Reset View' })).toHaveCount(1);
  await expect(
    page.locator('[aria-label="Map navigation"]').getByRole('button'),
  ).toHaveCount(3);

  const baseline = await waitForSettledCamera(page);
  await page.getByRole('button', { name: 'Zoom In' }).click();
  const zoomed = await waitForSettledCamera(page);
  expect(zoomed.k).toBeGreaterThan(baseline.k);
  await expectD3ZoomSynchronized(page);

  await page.setViewportSize(COMPACT_VIEWPORT);
  await expectLayout(page, 'compact');
  await expectOneCameraOwner(page);
  // The remount preserves the camera exactly; it does not reset or re-fit it.
  expect(await readCameraTransform(page)).toEqual(zoomed);

  // Reset View is the first callback after the rebind: if App were still
  // holding the pre-remount handle, the visible transform would not move.
  await page.getByRole('button', { name: 'Reset View' }).click();
  await expect(page.getByText('Map view reset.')).toBeVisible();
  const reset = await waitForSettledCamera(page);
  expect(reset.k).toBeCloseTo(baseline.k, 2);
  expect(reset.x).toBeCloseTo(baseline.x, 1);
  await expectD3ZoomSynchronized(page);

  await openRailTool(page, 'Countries');
  const locateInput = page.getByRole('combobox', { name: 'Find a country' });
  await locateInput.fill('Germany');
  await locateInput.press('Enter');
  await page.getByRole('button', { name: 'Locate Country' }).click();
  await expect(page.getByText('Centered on Germany.')).toBeVisible();
  const located = await waitForSettledCamera(page);
  expect(located.k).toBeGreaterThan(reset.k);
  await expectD3ZoomSynchronized(page);

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expectLayout(page, 'desktop');
  await expectOneCameraOwner(page);
  expect(await readCameraTransform(page)).toEqual(located);

  await page.getByRole('button', { name: 'Move Map' }).click();
  await page.getByRole('button', { name: 'Pan Right' }).click();
  const panned = await waitForSettledCamera(page);
  expect(panned.x).not.toBeCloseTo(located.x, 3);
  expect(panned.k).toBeCloseTo(located.k, 4);
  await expectD3ZoomSynchronized(page);
  await expectOneCameraOwner(page);
});

test('every export refusal class releases the camera lease in one session', async ({
  page,
}): Promise<void> => {
  const downloadNames: string[] = [];
  page.on('download', (download): void => {
    downloadNames.push(download.suggestedFilename());
    void download.cancel();
  });
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await waitForApp(page);
  await clearSavedMaps(page);
  await stampCameraOwnerSentinel(page);

  const francePath = page.locator('path.country-path[data-country-id="FRA"]');
  await francePath.focus();
  await francePath.press('Enter');
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Apply Red' }).click();
  await expect(page.locator('[data-layer="legend"] text')).toHaveText('#DC2626');
  const refusalToast = page.locator('[data-severity="error"]');

  // 1 - legend-blocked: a synchronous refusal before the lease is ever taken.
  await openRailTool(page, 'Legend');
  await legendDisclosure(page).click();
  await page.getByLabel('Large').check();
  const legendLabel = page.getByLabel('Legend label for #DC2626');
  await legendLabel.fill('12345678901234567890123456789012');
  await legendLabel.press('Enter');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(refusalToast).toContainText(LEGEND_BLOCKED);
  await expect(page.getByText(EXPORT_GENERIC_FAILURE)).toHaveCount(0);
  expect(downloadNames).toHaveLength(0);
  await expectCameraInputRenewed(page, 'Zoom In');

  await legendLabel.fill('Visited');
  await legendLabel.press('Enter');
  await expect(page.locator('[data-layer="legend"] text')).toHaveText('Visited');

  // 2 - invalid-composition: the legend is outside the canonical SVG, which the
  // export must refuse rather than silently ship a legend-less PNG.
  await expect(
    page.locator('svg.map-canvas > [data-layer="legend"]'),
  ).toHaveCount(1);
  await page.locator('svg.map-canvas').evaluate((element): void => {
    const legend = element.querySelector('[data-layer="legend"]');
    if (legend === null || element.parentElement === null) {
      throw new Error('The legend layer is not inside the canonical SVG.');
    }
    element.parentElement.appendChild(legend);
  });
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(refusalToast).toContainText(EXPORT_LAYOUT_FAILURE);
  // The composition is browser-memory only: a refresh would destroy the map.
  await expect(refusalToast).not.toContainText('Refresh the page');
  await expect(
    refusalToast.getByRole('button', { name: 'Try Export Again' }),
  ).toHaveCount(0);
  expect(downloadNames).toHaveLength(0);
  await page.locator('svg.map-canvas').evaluate((element): void => {
    const legend = element.parentElement?.querySelector(
      ':scope > [data-layer="legend"]',
    );
    if (legend === undefined || legend === null) {
      throw new Error('The detached legend layer is missing.');
    }
    element.appendChild(legend);
  });
  await expect(
    page.locator('svg.map-canvas > [data-layer="legend"]'),
  ).toHaveCount(1);
  await expectCameraInputRenewed(page, 'Zoom Out');

  // 3 - export-failed: the lease is taken and must be released in the
  // outermost finally, on the failure path too.
  await page.evaluate((): void => {
    const prototype = HTMLCanvasElement.prototype as HTMLCanvasElement & {
      __originalToBlob?: typeof HTMLCanvasElement.prototype.toBlob;
    };
    prototype.__originalToBlob = prototype.toBlob;
    prototype.toBlob = function failingToBlob(callback: BlobCallback): void {
      callback(null);
    };
  });
  await page.getByRole('button', { name: 'Dismiss Message' }).click();
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(refusalToast).toContainText(EXPORT_GENERIC_FAILURE);
  expect(downloadNames).toHaveLength(0);
  await expectCameraInputRenewed(page, 'Zoom In');

  // 4 - success, after three refusals in the same session.
  await page.evaluate((): void => {
    const prototype = HTMLCanvasElement.prototype as HTMLCanvasElement & {
      __originalToBlob?: typeof HTMLCanvasElement.prototype.toBlob;
    };
    if (prototype.__originalToBlob === undefined) {
      throw new Error('The original toBlob was not captured.');
    }
    prototype.toBlob = prototype.__originalToBlob;
  });
  await page.getByRole('button', { name: 'Dismiss Message' }).click();
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.getByText(EXPORT_SUCCESS)).toBeVisible({ timeout: 20_000 });
  await expect.poll((): number => downloadNames.length).toBe(1);
  await expectCameraInputRenewed(page, 'Zoom Out');
  await expectOneCameraOwner(page);
});

test('a historical entity keeps its color through undo, redo, a remount, and a reload', async ({
  page,
}): Promise<void> => {
  const fixture = createHistoricalBrowserFixture();
  await page.route(
    '**/data/snapshots/index.json',
    async (route): Promise<void> => {
      await route.fulfill({ json: fixture.manifest });
    },
  );
  await page.route(`**${HISTORICAL_ASSET_PATH}`, async (route): Promise<void> => {
    await route.fulfill({
      body: fixture.assetBody,
      contentType: 'application/geo+json',
    });
  });
  await page.addInitScript(
    ({ storageKey, record }): void => {
      localStorage.setItem(storageKey, JSON.stringify([record]));
    },
    { storageKey: STORAGE_KEY, record: createHistoricalSavedRecord() },
  );

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await waitForApp(page);
  await stampCameraOwnerSentinel(page);

  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('button', { name: 'Load This Map: Historical composition' })
    .click();

  const historicalPath = page.locator(
    `path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`,
  );
  const legendText = page.locator('[data-layer="legend"] text');
  await expect(historicalPath).toHaveCount(1);
  await expect(historicalPath).toHaveAttribute('fill', '#DC2626');
  await expect(legendText).toHaveText('Imperial lands');

  await historicalPath.press('Enter');
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Apply Blue' }).click();
  await expect(historicalPath).toHaveAttribute('fill', '#2563EB');
  await expect(legendText).toHaveText('#2563EB');

  await page.getByRole('button', { name: 'Undo Color Change' }).click();
  await expect(historicalPath).toHaveAttribute('fill', '#DC2626');
  await expect(legendText).toHaveText('Imperial lands');
  // History carries colors and never selection: undo cannot resurrect - or
  // clear - a selection, so the entity is still the one selected target.
  await expect(
    page.locator('[data-selection-live-region="true"]'),
  ).toHaveText(/1 country selected\./);

  await page.getByRole('button', { name: 'Redo Color Change' }).click();
  await expect(historicalPath).toHaveAttribute('fill', '#2563EB');
  await expect(legendText).toHaveText('#2563EB');

  await openRailTool(page, 'Saved Maps');
  await page.getByRole('textbox', { name: 'Map name' }).fill('Historical redo');
  await page.getByRole('button', { name: 'Save Map' }).click();

  await page.setViewportSize(COMPACT_VIEWPORT);
  await expectLayout(page, 'compact');
  await expectOneCameraOwner(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expectLayout(page, 'desktop');
  await expectOneCameraOwner(page);
  await expect(historicalPath).toHaveAttribute('fill', '#2563EB');

  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Reset All Colors' }).click();
  await expect(legendText).toHaveCount(0);

  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('button', { name: 'Load This Map: Historical redo' })
    .click();
  const replaceConfirm = page.getByRole('heading', {
    name: 'Replace the current map?',
  });
  await expect(replaceConfirm).toBeVisible();
  await page.getByRole('button', { name: 'Load Saved Map' }).click();
  await expect(replaceConfirm).toHaveCount(0);

  await expect(historicalPath).toHaveAttribute('fill', '#2563EB');
  await expect(legendText).toHaveText('#2563EB');
  await expect(
    page.locator('path.country-path[data-country-id="FRA"]'),
  ).toHaveCount(0);
  // The browser keeps the modern 195-core catalog, disabled rather than
  // filtered, so a scene without France still cannot be given a French color.
  await openRailTool(page, 'Countries');
  await page
    .getByRole('searchbox', { name: 'Search countries' })
    .fill('France');
  await expect(
    page.getByRole('checkbox', { name: /France Current color/ }),
  ).toBeDisabled();
  await expect(page.locator(CAMERA_GROUP_SELECTOR)).toHaveCount(1);
  await expectOneCameraOwner(page);
});
