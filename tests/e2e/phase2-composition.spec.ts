import { expect, test, type Page } from '@playwright/test';

import { STORAGE_KEY } from '../../src/constants/config';

const LOGICAL_CORE_COUNT = 195;
const VISIBLE_MODERN_UNIT_COUNT = 248;
const WRAPPED_PATH_COUNT = VISIBLE_MODERN_UNIT_COUNT * 3;
const CAMERA_FIXTURE_URL = '/tests/e2e/fixtures/camera.html';
const CAMERA_GROUP_SELECTOR = '[data-layer="camera"]';
const LOGICAL_PATH_SELECTOR = 'path.country-path[role="option"]';
const PRIMARY_UNIT_SELECTOR = 'path.scene-path[data-primary-unit="true"]';
const ALL_SCENE_PATH_SELECTOR = 'path.scene-path';

interface CameraFixtureApi {
  readonly controllerFactoryCalls: number;
  readonly selectedCount: number;
  readCamera(): {
    zoom: number;
    centerLongitude: number;
    centerLatitude: number;
  } | null;
  locate(countryId: string): void;
  resetView(): void;
  freeze(): unknown;
  release(): void;
  getExportSourceConnected(): boolean;
  focusCountry(countryId: string): void;
}

async function waitForWorld(page: Page): Promise<void> {
  await page.goto(CAMERA_FIXTURE_URL);
  await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
    LOGICAL_CORE_COUNT,
  );
}

async function waitForApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
    LOGICAL_CORE_COUNT,
  );
  const startColoring = page.getByRole('button', { name: 'Start Coloring' });
  if (await startColoring.isVisible()) {
    await startColoring.click();
  }
}

async function readCameraTransform(
  page: Page,
): Promise<{ k: number; x: number; y: number }> {
  return page.locator(CAMERA_GROUP_SELECTOR).first().evaluate((element) => {
    const group = element as SVGGElement;
    const matrix = group.transform.baseVal.consolidate()?.matrix;
    if (matrix === undefined) {
      throw new Error('Camera transform is unavailable');
    }
    return { k: matrix.a, x: matrix.e, y: matrix.f };
  });
}

async function readWorldPointAtClient(
  page: Page,
  clientX: number,
  clientY: number,
): Promise<{ x: number; y: number }> {
  return page.locator(CAMERA_GROUP_SELECTOR).evaluate(
    (element, clientPoint) => {
      const group = element as SVGGElement;
      const svg = group.ownerSVGElement;
      const matrix = group.transform.baseVal.consolidate()?.matrix;
      if (svg === null || matrix === undefined) {
        throw new Error('Camera matrix is unavailable');
      }
      const bounds = svg.getBoundingClientRect();
      const localPoint = new DOMPoint(
        ((clientPoint.x - bounds.left) / bounds.width) * 1080,
        ((clientPoint.y - bounds.top) / bounds.height) * 1080,
      );
      const worldPoint = localPoint.matrixTransform(matrix.inverse());
      return { x: worldPoint.x, y: worldPoint.y };
    },
    { x: clientX, y: clientY },
  );
}

test('world baseline exposes 195 logical states and 248 modern units', async ({
  page,
}): Promise<void> => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message): void => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error): void => {
    pageErrors.push(error.message);
  });

  await page.goto('/');

  const mapListbox = page.getByRole('listbox', {
    name: 'Interactive map of the world',
  });
  const logicalPaths = mapListbox.locator(LOGICAL_PATH_SELECTOR);
  const primaryUnits = mapListbox.locator(PRIMARY_UNIT_SELECTOR);
  const allPaths = mapListbox.locator(ALL_SCENE_PATH_SELECTOR);

  await expect(mapListbox).toHaveCount(1);
  await expect(logicalPaths).toHaveCount(LOGICAL_CORE_COUNT);
  await expect(primaryUnits).toHaveCount(VISIBLE_MODERN_UNIT_COUNT);
  await expect(allPaths).toHaveCount(WRAPPED_PATH_COUNT);

  const logicalEvidence = await logicalPaths.evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.getAttribute('data-country-id'),
      label: element.getAttribute('aria-label'),
      role: element.getAttribute('role'),
      pathData: element.getAttribute('d'),
    })),
  );
  const logicalIds = logicalEvidence.map(({ id }) => id ?? '');
  expect(new Set(logicalIds).size).toBe(LOGICAL_CORE_COUNT);
  expect(
    logicalEvidence.every(
      ({ id, label, role, pathData }): boolean =>
        id !== null &&
        id.length > 0 &&
        label !== null &&
        label.length > 0 &&
        role === 'option' &&
        pathData !== null &&
        pathData.length > 0,
    ),
  ).toBe(true);

  const nonLogicalSemantics = await mapListbox
    .locator('path.scene-path:not([role="option"])')
    .evaluateAll((elements) =>
      elements.every(
        (element) =>
          element.getAttribute('role') === null &&
          element.getAttribute('data-country-id') === null &&
          element.getAttribute('tabindex') === '-1' &&
          element.getAttribute('aria-hidden') === 'true',
      ),
    );
  expect(nonLogicalSemantics).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('camera input anchors wheel, wraps, clamps poles, and never regenerates geometry', async ({
  page,
}): Promise<void> => {
  await waitForWorld(page);

  const logicalPaths = page.locator(LOGICAL_PATH_SELECTOR);
  const firstLogical = logicalPaths.first();
  const firstId = await firstLogical.getAttribute('data-country-id');
  const firstBounds = await firstLogical.boundingBox();
  const initialPathData = await logicalPaths.evaluateAll((elements) =>
    elements.slice(0, 12).map((element) => element.getAttribute('d')),
  );
  if (firstId === null || firstBounds === null) {
    throw new Error('Logical path fixture is unavailable');
  }

  await page.evaluate((countryId): void => {
    (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.focusCountry(countryId);
  }, firstId);
  await expect(firstLogical).toBeFocused();

  await page.mouse.move(
    firstBounds.x + firstBounds.width / 2,
    firstBounds.y + firstBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    firstBounds.x + firstBounds.width / 2 + 120,
    firstBounds.y + firstBounds.height / 2 + 20,
    { steps: 6 },
  );
  await page.mouse.up();

  expect(
    await page.evaluate((): number => (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.selectedCount),
  ).toBe(0);
  await expect(firstLogical).toBeFocused();

  const svgBounds = await page.locator('svg.map-canvas').boundingBox();
  if (svgBounds === null) {
    throw new Error('Camera SVG is unavailable');
  }
  const anchorX = svgBounds.x + svgBounds.width * 0.72;
  const anchorY = svgBounds.y + svgBounds.height * 0.31;
  const worldBeforeWheel = await readWorldPointAtClient(page, anchorX, anchorY);

  await page.mouse.move(anchorX, anchorY);
  await page.mouse.wheel(0, -500);
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(1);

  const worldAfterWheel = await readWorldPointAtClient(page, anchorX, anchorY);
  const wrappedAnchorDelta =
    ((((worldAfterWheel.x - worldBeforeWheel.x + 540) % 1080) + 1080) %
      1080) -
    540;
  expect(Math.abs(wrappedAnchorDelta)).toBeLessThan(0.5);
  expect(Math.abs(worldAfterWheel.y - worldBeforeWheel.y)).toBeLessThan(0.5);

  await page.mouse.move(svgBounds.x + svgBounds.width / 2, svgBounds.y + 80);
  await page.mouse.down();
  await page.mouse.move(svgBounds.x + svgBounds.width / 2, svgBounds.y - 800, {
    steps: 8,
  });
  await page.mouse.up();

  const constrained = await readCameraTransform(page);
  expect(constrained.x).toBeLessThanOrEqual(0);
  expect(constrained.x).toBeGreaterThan(-1080 * constrained.k);
  expect(constrained.y).toBeGreaterThanOrEqual(1080 - 1080 * constrained.k);
  expect(constrained.y).toBeLessThanOrEqual(0);

  await expect(logicalPaths).toHaveCount(LOGICAL_CORE_COUNT);
  expect(
    await logicalPaths.evaluateAll((elements) =>
      elements.slice(0, 12).map((element) => element.getAttribute('d')),
    ),
  ).toEqual(initialPathData);
});

test('camera freeze uses one visible controller handle and renews input', async ({
  page,
}): Promise<void> => {
  await waitForWorld(page);

  expect(
    await page.evaluate((): number => (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.controllerFactoryCalls),
  ).toBe(1);
  expect(
    await page.evaluate((): boolean =>
      (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.getExportSourceConnected(),
    ),
  ).toBe(true);

  const initialTransform = await readCameraTransform(page);
  await page.evaluate((): void => (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.locate('FRA'));
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(initialTransform.k);

  const frozenCamera = await page.evaluate((): unknown =>
    (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.freeze(),
  );
  expect(frozenCamera).not.toBeNull();
  const frozenTransform = await readCameraTransform(page);

  const svgBounds = await page.locator('svg.map-canvas').boundingBox();
  if (svgBounds === null) {
    throw new Error('Camera SVG is unavailable');
  }
  await page.mouse.move(
    svgBounds.x + svgBounds.width / 2,
    svgBounds.y + svgBounds.height / 2,
  );
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(200);
  expect(await readCameraTransform(page)).toEqual(frozenTransform);

  await page.evaluate((): void => {
    (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.release();
    (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.release();
  });
  await page.mouse.wheel(0, -600);
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(frozenTransform.k);

  expect(
    await page.evaluate((): number => (window as typeof window & { readonly __cameraFixture: CameraFixtureApi }).__cameraFixture.controllerFactoryCalls),
  ).toBe(1);
});

test('real app navigation controls move the sole live D3 camera accessibly', async ({
  page,
}): Promise<void> => {
  await waitForApp(page);

  const navigation = page.getByLabel('Map navigation');
  const zoomIn = page.getByRole('button', { name: 'Zoom In' });
  const zoomOut = page.getByRole('button', { name: 'Zoom Out' });
  const moveMap = page.getByRole('button', { name: 'Move Map' });

  await expect(navigation).toBeVisible();
  await expect(zoomOut).toBeDisabled();
  await zoomIn.focus();
  await expect(zoomIn).toBeFocused();
  await zoomIn.press('Enter');

  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBe(1.5);
  const zoomed = await readCameraTransform(page);
  expect(zoomed.x).toBeCloseTo(-270, 5);
  expect(zoomed.y).toBeCloseTo(-270, 5);

  await moveMap.click();
  await expect(page.getByRole('group', { name: 'Move map' })).toBeVisible();
  await page.getByRole('button', { name: 'Pan Right' }).click();

  const panned = await readCameraTransform(page);
  expect(panned.k).toBeCloseTo(1.5, 5);
  expect(panned.x - zoomed.x).toBeCloseTo(-135, 5);
  expect(panned.y).toBeCloseTo(zoomed.y, 5);
});

test('real app saves and loads the complete composition after responsive rebinding', async ({
  page,
}): Promise<void> => {
  await waitForApp(page);
  await page.evaluate((storageKey): void => localStorage.removeItem(storageKey), STORAGE_KEY);

  const francePath = page.locator(
    'path.country-path[data-country-id="FRA"]',
  );
  await francePath.focus();
  await francePath.press('Enter');
  await page.getByRole('button', { name: 'Apply Red' }).click();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await page.getByRole('button', { name: 'Move Map' }).click();
  await page.getByRole('button', { name: 'Pan Right' }).click();
  const savedTransform = await readCameraTransform(page);

  await page.getByRole('button', { name: 'Save or Load Maps' }).click();
  await page.getByRole('textbox', { name: 'Map name' }).fill('Integrated view');
  await page.getByRole('button', { name: 'Save Current Map' }).click();

  const savedEvidence = await page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) {
      throw new Error('Saved composition is missing.');
    }
    const records = JSON.parse(raw) as Array<{
      schemaVersion: number;
      composition: {
        colors: Record<string, string>;
        camera: { zoom: number };
        snapshotId: string;
        legend: { entries: unknown[] };
        settings: { backgroundColor: string };
      };
    }>;
    const record = records[0];
    if (record === undefined) {
      throw new Error('Saved composition record is missing.');
    }
    return {
      schemaVersion: record.schemaVersion,
      color: record.composition.colors.FRA,
      zoom: record.composition.camera.zoom,
      snapshotId: record.composition.snapshotId,
      hasLegend: Array.isArray(record.composition.legend.entries),
      backgroundColor: record.composition.settings.backgroundColor,
    };
  }, STORAGE_KEY);

  expect(savedEvidence).toMatchObject({
    schemaVersion: 2,
    zoom: 1.5,
    snapshotId: 'modern',
    hasLegend: true,
    backgroundColor: '#FFFFFF',
  });
  expect(savedEvidence.color).toMatch(/^#[0-9A-F]{6}$/);

  await page.getByRole('button', { name: 'Close Saved Maps' }).first().click();
  await page.getByRole('button', { name: 'Reset All Colors' }).click();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(page.getByRole('main', { name: 'Map creator workspace' })).toHaveClass(
    /workspace--compact/,
  );
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect(page.getByRole('main', { name: 'Map creator workspace' })).toHaveClass(
    /workspace--desktop/,
  );

  await page.getByRole('button', { name: 'Save or Load Maps' }).click();
  await page.getByRole('button', { name: 'Load This Map: Integrated view' }).click();
  await expect(page.getByRole('dialog', { name: 'Save or load maps' })).toHaveCount(0);

  const loadedTransform = await readCameraTransform(page);
  expect(loadedTransform.k).toBeCloseTo(savedTransform.k, 5);
  expect(loadedTransform.x).toBeCloseTo(savedTransform.x, 5);
  expect(loadedTransform.y).toBeCloseTo(savedTransform.y, 5);
  await expect(
    page.locator('path.country-path[data-country-id="FRA"]'),
  ).toHaveAttribute('fill', savedEvidence.color);

  await page.getByRole('button', { name: 'Zoom In' }).click();
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(savedTransform.k);
});

test('real app export failure and frozen load both release without false success', async ({
  page,
}): Promise<void> => {
  page.on('download', (download): void => {
    void download.cancel();
  });
  await waitForApp(page);
  await page.evaluate((storageKey): void => localStorage.removeItem(storageKey), STORAGE_KEY);

  await page.getByRole('button', { name: 'Zoom In' }).click();
  await page.getByRole('button', { name: 'Save or Load Maps' }).click();
  await page.getByRole('textbox', { name: 'Map name' }).fill('Freeze baseline');
  await page.getByRole('button', { name: 'Save Current Map' }).click();
  await page.getByRole('button', { name: 'Close Saved Maps' }).first().click();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  const beforeFrozenLoad = await readCameraTransform(page);

  await page.evaluate((): void => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function delayedToBlob(
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ): void {
      window.setTimeout((): void => {
        originalToBlob.call(this, callback, type, quality);
      }, 1_000);
    };
  });

  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.getByRole('button', { name: 'Exporting PNG…' })).toBeVisible();
  await page.getByRole('button', { name: 'Save or Load Maps' }).click();
  await page.getByRole('button', { name: 'Load This Map: Freeze baseline' }).click();
  await expect(page.getByText('Finish the current export before loading a saved composition.')).toBeVisible();
  expect(await readCameraTransform(page)).toEqual(beforeFrozenLoad);

  await expect(page.getByRole('button', { name: 'Export PNG' })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('button', { name: 'Close Saved Maps' }).first().click();
  await page.getByRole('button', { name: 'Zoom Out' }).click();
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeLessThan(beforeFrozenLoad.k);

  await page.evaluate((): void => {
    HTMLCanvasElement.prototype.toBlob = function failedToBlob(
      callback: BlobCallback,
    ): void {
      callback(null);
    };
  });
  const beforeFailedExport = await readCameraTransform(page);
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(
    page.getByText(
      'The PNG could not be created. Refresh the page and try Export PNG again.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(beforeFailedExport.k);
});
