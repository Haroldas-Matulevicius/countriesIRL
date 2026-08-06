import { expect, test, type Page } from '@playwright/test';
import { zoomIdentity } from 'd3';

import { STORAGE_KEY } from '../../src/constants/config';
import { legendDisclosure, openRailTool } from './support/appHarness';
import { transformToCamera } from '../../src/utils/camera';
import {
  HISTORICAL_ASSET_PATH,
  HISTORICAL_ENTITY_ID,
  HISTORICAL_LABEL,
  createHistoricalBrowserFixture,
  createHistoricalSavedRecord,
} from './support/historicalFixture';

const LOGICAL_CORE_COUNT = 195;
const VISIBLE_MODERN_UNIT_COUNT = 248;
const WRAPPED_PATH_COUNT = VISIBLE_MODERN_UNIT_COUNT * 3;
const CAMERA_FIXTURE_URL = '/tests/e2e/fixtures/camera.html';
const CAMERA_GROUP_SELECTOR = '[data-layer="camera"]';
const LOGICAL_PATH_SELECTOR = 'path.country-path[role="option"]';
const PRIMARY_UNIT_SELECTOR = 'path.scene-path[data-primary-unit="true"]';
const ALL_SCENE_PATH_SELECTOR = 'path.scene-path';
// UI-SPEC section 20: the map label names the active period.
const MODERN_MAP_LISTBOX_NAME =
  'Interactive world map, Modern — current borders';

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
  const startCreating = page.getByRole('button', { name: 'Start Creating' });
  if (await startCreating.isVisible()) {
    await startCreating.click();
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

async function expectD3ZoomSynchronized(page: Page): Promise<void> {
  const synchronization = await page.locator('svg.map-canvas').evaluate((element) => {
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

async function waitForSettledCamera(
  page: Page,
): Promise<{ k: number; x: number; y: number }> {
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

/**
 * `03-06` dissolved the inspector shell into four rail tools, so there is no
 * section list to read any more: the workspace landmark IS the panel track and
 * it holds one tool's content at a time. `openRailTool` is imported from the
 * shared harness rather than re-declared here - two specs already carry
 * duplicated camera helpers as a recorded pending todo.
 */
/**
 * D-11/D-32 moved the canvas region out of the workspace landmark and into the
 * shell's third grid track, so it is no longer a workspace section at either
 * layout. It is asserted here as a singleton OUTSIDE the workspace instead of
 * dropped: "the map is not in this list" has to be paired with "the map is
 * still exactly once in the document", or the pair passes with no map at all.
 */
async function expectOneCanvasRegionOutsideTheWorkspace(
  page: Page,
): Promise<void> {
  await expect(page.locator('.map-editor > section.map-workspace')).toHaveCount(
    1,
  );
  await expect(page.locator('main.tool-panel .map-workspace')).toHaveCount(0);
  await expect(page.locator('svg.map-canvas')).toHaveCount(1);
}

/**
 * The rail is present at EVERY width and carries the same six rows in the same
 * order, so this replaces the two layout-specific shell helpers `03-05` left
 * behind. The layout hook stays asserted because `03-09` still keys the
 * responsive suite on it.
 */
async function expectRailShell(
  page: Page,
  layoutModifier: 'workspace--desktop' | 'workspace--compact',
): Promise<void> {
  await expect(page.getByRole('main', { name: 'Map creator workspace' })).toHaveClass(
    new RegExp(layoutModifier),
  );
  expect(
    await page
      .locator('.tool-rail__row')
      .evaluateAll((elements): string[] =>
        elements.map((element): string => element.getAttribute('data-tool') ?? ''),
      ),
  ).toEqual(['colors', 'countries', 'legend', 'saved', 'undo', 'redo']);

  // D-12/D-13: identity above the tools, Export below them, neither inside the
  // element that scrolls.
  await expect(page.locator('.tool-rail__header')).toHaveCount(1);
  await expect(
    page.locator('.tool-rail__footer [data-action="export"]'),
  ).toHaveCount(1);
  await expect(page.locator('.controls__action--primary')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Reset View' })).toHaveCount(1);

  await expectOneCanvasRegionOutsideTheWorkspace(page);
}

/**
 * Scroll containment, still asserted where it lives. `03-05` re-pointed this
 * from the retired inspector card to the panel body; `03-06` keeps the body as
 * the ONE scroll container and sticks the title row to its top rather than
 * hoisting the row out, so the pair below keeps exactly one subject.
 */
async function expectPanelBodyIsTheScrollContainer(page: Page): Promise<void> {
  const panelBody = page.locator('.tool-panel__body');
  expect(
    await panelBody.evaluate((element): string =>
      globalThis.getComputedStyle(element).overscrollBehaviorY,
    ),
  ).toBe('contain');
  expect(
    await panelBody.evaluate((element): string =>
      globalThis.getComputedStyle(element).overflowY,
    ),
  ).toBe('auto');
  expect(
    await page
      .locator('.tool-panel__title-row')
      .evaluate((element): string =>
        globalThis.getComputedStyle(element).position,
      ),
  ).toBe('sticky');
}

/**
 * Two units that normalize cleanly but share a `sourceFeatureId`, so
 * `composeEffectiveScene` throws `duplicate-scene-source-feature-id` inside
 * App's own `useMemo`. Only the `main.tsx` boundary can catch that.
 */
function createDuplicateIdentityWorldAsset(): string {
  const createUnit = (
    id: string,
  ): Record<string, unknown> => ({
    type: 'Feature',
    id,
    properties: { name: `Duplicate ${id}` },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 10],
          [10, 0],
          [0, 0],
        ],
      ],
    },
    sourceFeatureId: 'DUPLICATE-SOURCE',
    entityId: id,
    colorOwnerId: id,
    isSelectable: true,
    interactionMode: 'modern-core',
    boundaryMode: 'modern',
    provenanceId: 'duplicate-identity-fixture',
  });

  return JSON.stringify({
    type: 'FeatureCollection',
    features: [createUnit('DUPA'), createUnit('DUPB')],
  });
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
    name: MODERN_MAP_LISTBOX_NAME,
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

  const svgBounds = await page.locator('svg.map-canvas').boundingBox();
  if (svgBounds === null) {
    throw new Error('Map bounds are unavailable.');
  }
  await page.mouse.move(
    svgBounds.x + svgBounds.width / 2,
    svgBounds.y + svgBounds.height / 2,
  );
  await page.mouse.wheel(0, -300);
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(panned.k);

  const beforeDrag = await readCameraTransform(page);
  await page.mouse.down();
  await page.mouse.move(
    svgBounds.x + svgBounds.width / 2 + 80,
    svgBounds.y + svgBounds.height / 2 + 20,
    { steps: 5 },
  );
  await page.mouse.up();
  const afterDrag = await readCameraTransform(page);
  expect(afterDrag.x).not.toBeCloseTo(beforeDrag.x, 3);
  await expectD3ZoomSynchronized(page);
});

test('a duplicate-identity scene degrades to the fatal error state instead of a blank page', async ({
  page,
}): Promise<void> => {
  const consoleErrors: string[] = [];
  page.on('console', (message): void => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  await page.route('**/data/world-modern.geojson', async (route): Promise<void> => {
    await route.fulfill({
      body: createDuplicateIdentityWorldAsset(),
      contentType: 'application/geo+json',
    });
  });

  await page.goto('/');

  // `composeEffectiveScene` throws during App's own render, so App's boundary
  // cannot catch it - this is the failure only the `main.tsx` boundary covers,
  // and it must reach a real error surface rather than an empty document.
  const fatalError = page.getByRole('alert');
  await expect(fatalError).toContainText("We couldn't load the world map");
  await expect(
    fatalError.getByRole('button', { name: 'Reload Map' }),
  ).toBeVisible();
  await expect(page.locator('svg.map-canvas')).toHaveCount(0);
  await expect(page.locator('.app')).toHaveCount(0);
  expect(
    consoleErrors.some((message): boolean =>
      message.includes('CountriesIRL could not render the map workspace.'),
    ),
  ).toBe(true);
});

test('tool drafts survive both a tool switch and the 1200px transition', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1300, height: 900 });
  await waitForApp(page);
  await page.evaluate((storageKey): void => localStorage.removeItem(storageKey), STORAGE_KEY);
  await page.locator('svg.map-canvas').evaluate((svg): void => {
    svg.setAttribute('data-camera-owner-sentinel', 'stable-owner');
  });
  await expectRailShell(page, 'workspace--desktop');

  /*
   * `03-05` proved this claim by crossing the 1200px branch, which remounted
   * the four inspector sections together. `03-06` gives each of them its own
   * tool, so switching tools unmounts them ONE AT A TIME - a strictly stronger
   * exercise of the same invariant, and the reason `useInspectorUiState` is
   * held above the composition root's layout branch.
   */
  const francePath = page.locator('path.country-path[data-country-id="FRA"]');
  await francePath.focus();
  await francePath.press('Enter');

  await openRailTool(page, 'Colors');
  await expectPanelBodyIsTheScrollContainer(page);
  await page.getByRole('button', { name: 'Apply Red' }).click();
  await page.getByLabel('Custom color').fill('#123456');

  await openRailTool(page, 'Countries');
  await page.getByRole('searchbox', { name: 'Search countries' }).fill('Ger');
  await page.getByRole('combobox', { name: 'Find a country' }).fill('Spa');

  await openRailTool(page, 'Legend');
  await legendDisclosure(page).click();
  await expect(page.getByLabel('Legend label for #DC2626')).toBeVisible();

  const expectPreservedToolState = async (): Promise<void> => {
    await openRailTool(page, 'Colors');
    await expect(page.getByLabel('Custom color')).toHaveValue('#123456');

    await openRailTool(page, 'Countries');
    await expect(
      page.getByRole('searchbox', { name: 'Search countries' }),
    ).toHaveValue('Ger');
    await expect(
      page.getByRole('combobox', { name: 'Find a country' }),
    ).toHaveValue('Spa');

    await openRailTool(page, 'Legend');
    await expect(legendDisclosure(page)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.getByLabel('Legend label for #DC2626')).toBeVisible();

    await expect(page.locator('svg.map-canvas')).toHaveAttribute(
      'data-camera-owner-sentinel',
      'stable-owner',
    );
  };

  await expectPreservedToolState();

  await page.setViewportSize({ width: 900, height: 900 });
  await expectRailShell(page, 'workspace--compact');
  await expectPreservedToolState();

  await page.setViewportSize({ width: 1300, height: 900 });
  await expectRailShell(page, 'workspace--desktop');
  await expectPreservedToolState();
});

test('real app export failure and frozen load both release without false success', async ({
  page,
}): Promise<void> => {
  page.on('download', (download): void => {
    void download.cancel();
  });
  await waitForApp(page);
  await page.evaluate((storageKey): void => localStorage.removeItem(storageKey), STORAGE_KEY);

  const francePath = page.locator(
    'path.country-path[data-country-id="FRA"]',
  );
  await francePath.focus();
  await francePath.press('Enter');
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Apply Red' }).click();
  await expect(page.locator('[data-layer="legend"] text')).toHaveText('#DC2626');
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await openRailTool(page, 'Saved Maps');
  await page.getByRole('textbox', { name: 'Map name' }).fill('Freeze baseline');
  await page.getByRole('button', { name: 'Save Map' }).click();
  await page.getByRole('button', { name: 'Close Saved Maps' }).click();
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
  await expect(page.locator('[data-layer="legend"] text')).toHaveCount(2);
  expect(await page.locator('[data-layer="legend"] text').allTextContents()).toEqual([
    '#DC2626',
    '#DC2626',
  ]);
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(page.getByRole('main', { name: 'Map creator workspace' })).toHaveClass(
    /workspace--compact/,
  );
  expect(await readCameraTransform(page)).toEqual(beforeFrozenLoad);
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect(page.getByRole('main', { name: 'Map creator workspace' })).toHaveClass(
    /workspace--desktop/,
  );
  expect(await readCameraTransform(page)).toEqual(beforeFrozenLoad);
  await openRailTool(page, 'Saved Maps');
  await page.getByRole('button', { name: 'Load This Map: Freeze baseline' }).click();
  // The extra Zoom In after saving left unsaved work, so the load is confirmed
  // before it can reach the frozen camera.
  await expect(page.getByRole('heading', { name: 'Replace the current map?' })).toBeVisible();
  await page.getByRole('button', { name: 'Load Saved Map' }).click();
  await expect(page.getByText('Finish the current export before loading a saved composition.')).toBeVisible();
  expect(await readCameraTransform(page)).toEqual(beforeFrozenLoad);

  await expect(page.getByRole('button', { name: 'Export PNG' })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole('button', { name: 'Close Saved Maps' }).click();
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
      'The PNG could not be created. Your map is unchanged. Try Export PNG again.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(beforeFailedExport.k);
});

test('a collapsed Legend panel never leaves Export PNG permanently blocked', async ({
  page,
}): Promise<void> => {
  page.on('download', (download): void => {
    void download.cancel();
  });
  await waitForApp(page);
  await page.evaluate((storageKey): void => localStorage.removeItem(storageKey), STORAGE_KEY);

  const francePath = page.locator('path.country-path[data-country-id="FRA"]');
  await francePath.focus();
  await francePath.press('Enter');
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Apply Red' }).click();
  await expect(page.locator('[data-layer="legend"] text')).toHaveText('#DC2626');

  await openRailTool(page, 'Legend');
  const legendToggle = legendDisclosure(page);
  await legendToggle.click();
  await page.getByLabel('Large').check();
  const legendLabel = page.getByLabel('Legend label for #DC2626');
  await legendLabel.fill('12345678901234567890123456789012');
  await legendLabel.press('Enter');
  await expect(
    page.getByText('Shorten this label so it fits in the exported legend.'),
  ).toBeVisible();

  // The gate is live, so a genuinely invalid legend still blocks the export -
  // and it names the actual problem instead of telling the user to refresh,
  // which would destroy this unsaved map without fixing the label.
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const legendBlockedToast = page.locator('[data-severity="error"]');
  await expect(legendBlockedToast).toContainText(
    'Shorten this label so it fits in the exported legend.',
  );
  await expect(
    page.getByText(
      'The PNG could not be created. Your map is unchanged. Try Export PNG again.',
    ),
  ).toHaveCount(0);
  await expect(
    legendBlockedToast.getByRole('button', { name: 'Try Export Again' }),
  ).toHaveCount(0);

  // Collapsing the disclosure unmounts the editor; resetting the colors makes
  // the legend trivially valid again. The gate must follow the live state.
  await legendToggle.click();
  await expect(page.getByLabel('Legend label for #DC2626')).toHaveCount(0);
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Reset All Colors' }).click();
  await expect(page.locator('[data-layer="legend"] text')).toHaveCount(0);

  await page.getByRole('button', { name: 'Dismiss Message' }).click();
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.getByText('PNG downloaded at 1080 × 1080.')).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText(
      'The PNG could not be created. Your map is unchanged. Try Export PNG again.',
    ),
  ).toHaveCount(0);
});

test('real app round-trips a historical scene with live catalog and exported legend', async ({
  page,
}): Promise<void> => {
  const fixture = createHistoricalBrowserFixture();
  await page.route('**/data/snapshots/index.json', async (route): Promise<void> => {
    await route.fulfill({ json: fixture.manifest });
  });
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
  page.on('download', (download): void => {
    void download.cancel();
  });

  await waitForApp(page);
  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('button', { name: 'Load This Map: Historical composition' })
    .click();

  const historicalPath = page.locator(
    `path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`,
  );
  await expect(historicalPath).toHaveCount(1);
  await expect(historicalPath).toBeFocused();
  await expect(
    page.locator('path.country-path[data-country-id="FRA"]'),
  ).toHaveCount(0);
  await expect(historicalPath).toHaveAttribute('fill', '#DC2626');
  await expect(page.locator('[data-layer="legend"] text')).toHaveText(
    'Imperial lands',
  );

  await openRailTool(page, 'Countries');
  const countrySearch = page.getByRole('searchbox', { name: 'Search countries' });
  await countrySearch.fill('France');
  const franceRow = page.getByRole('checkbox', { name: /France Current color/ });
  await expect(franceRow).toBeVisible();
  // The catalog stays the modern 195-core list, but a scene without FRA must
  // not let the browser create a selection the map cannot show.
  await expect(franceRow).toBeDisabled();
  await expect(franceRow).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Select Visible' })).toBeDisabled();
  await openRailTool(page, 'Colors');
  await expect(page.getByRole('button', { name: 'Apply Red' })).toBeDisabled();
  await openRailTool(page, 'Countries');
  await expect(page.locator('[data-selection-live-region="true"]')).not.toHaveText(
    /country selected\./,
  );
  await openRailTool(page, 'Colors');
  await expect(
    page.getByRole('heading', { name: 'Select countries to color' }),
  ).toBeVisible();

  await openRailTool(page, 'Countries');
  await countrySearch.fill(HISTORICAL_LABEL);
  await expect(
    page.getByText(`No countries match “${HISTORICAL_LABEL}”.`),
  ).toBeVisible();

  const locateInput = page.getByRole('combobox', { name: 'Find a country' });
  await locateInput.fill(HISTORICAL_LABEL);
  await expect(
    page.getByText(`No country matches “${HISTORICAL_LABEL}”.`),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Locate Country' })).toBeDisabled();
  await page.getByRole('button', { name: 'Clear Locate Search' }).click();
  await locateInput.fill('Germany');
  await locateInput.press('Enter');
  await page.getByRole('button', { name: 'Locate Country' }).click();
  await expect(page.getByText('Centered on Germany.')).toBeVisible();
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(2);
  const settledTransform = await waitForSettledCamera(page);
  await expectD3ZoomSynchronized(page);
  const settledCamera = transformToCamera(
    zoomIdentity
      .translate(settledTransform.x, settledTransform.y)
      .scale(settledTransform.k),
  );

  await openRailTool(page, 'Saved Maps');
  await page.getByRole('textbox', { name: 'Map name' }).fill('Historical resaved');
  await page.getByRole('button', { name: 'Save Map' }).click();
  const roundTrip = await page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    const records = raw === null
      ? []
      : (JSON.parse(raw) as Array<{
          name: string;
          composition?: {
            snapshotId: string;
            colors: Record<string, string>;
            legend: { entries: Array<{ label: string }> };
            camera: {
              zoom: number;
              centerLongitude: number;
              centerLatitude: number;
            };
          };
        }>);
    const record = records.find((candidate) => candidate.name === 'Historical resaved');
    return record?.composition ?? null;
  }, STORAGE_KEY);
  expect(roundTrip).toMatchObject({
    snapshotId: '1700',
    colors: { [HISTORICAL_ENTITY_ID]: '#DC2626' },
    legend: { entries: [{ label: 'Imperial lands' }] },
  });
  // No phantom color for an entity the scene never contained.
  expect(roundTrip?.colors).toEqual({ [HISTORICAL_ENTITY_ID]: '#DC2626' });
  expect(roundTrip?.camera.zoom).toBeCloseTo(settledCamera.zoom, 4);
  expect(roundTrip?.camera.centerLongitude).toBeCloseTo(
    settledCamera.centerLongitude,
    4,
  );
  expect(roundTrip?.camera.centerLatitude).toBeCloseTo(
    settledCamera.centerLatitude,
    4,
  );
  await page.getByRole('button', { name: 'Close Saved Maps' }).click();

  await page.evaluate((): void => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function delayedHistoricalToBlob(
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ): void {
      window.setTimeout((): void => {
        originalToBlob.call(this, callback, type, quality);
      }, 600);
    };
  });
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.locator('[data-layer="legend"] text')).toHaveCount(2);
  expect(await page.locator('[data-layer="legend"] text').allTextContents()).toEqual([
    'Imperial lands',
    'Imperial lands',
  ]);
  await expect(page.getByRole('button', { name: 'Export PNG' })).toBeVisible({
    timeout: 10_000,
  });
});

test('a saved composition exports under its sanitized name in the real app', async ({
  page,
}): Promise<void> => {
  const downloadNames: string[] = [];
  page.on('download', (download): void => {
    downloadNames.push(download.suggestedFilename());
    void download.cancel();
  });
  await waitForApp(page);
  await page.evaluate(
    (storageKey): void => localStorage.removeItem(storageKey),
    STORAGE_KEY,
  );

  // Unnamed first: the composition has no identity until a save or load
  // commits one.
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.getByText('PNG downloaded at 1080 × 1080.')).toBeVisible({
    timeout: 10_000,
  });
  expect(downloadNames).toHaveLength(1);
  expect(downloadNames[0]).toMatch(/^CountriesIRL_\d{4}-\d{2}-\d{2}\.png$/u);

  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('textbox', { name: 'Map name' })
    .fill('Baltic  Tour /2026!');
  await page.getByRole('button', { name: 'Save Map' }).click();
  await page.getByRole('button', { name: 'Close Saved Maps' }).click();

  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.getByText('PNG downloaded at 1080 × 1080.')).toBeVisible({
    timeout: 10_000,
  });
  await expect.poll((): number => downloadNames.length).toBe(2);
  expect(downloadNames[1]).toMatch(/^Baltic_Tour_2026_\d{4}-\d{2}-\d{2}\.png$/u);

  /*
   * Identity outlives edits, but not the disappearance of what it names.
   * Deleting the saved map used to leave the name set, so this export shipped
   * `Baltic_Tour_2026_<date>.png` for a composition with no stored counterpart.
   */
  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('button', { name: 'Delete Saved Map: Baltic Tour /2026!' })
    .click();
  await page
    .getByRole('button', { name: 'Delete Map: Baltic Tour /2026!' })
    .click();
  await expect(page.getByText('Saved map deleted.')).toBeVisible();
  await page.getByRole('button', { name: 'Close Saved Maps' }).click();

  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.getByText('PNG downloaded at 1080 × 1080.')).toBeVisible({
    timeout: 10_000,
  });
  await expect.poll((): number => downloadNames.length).toBe(3);
  expect(downloadNames[2]).toMatch(/^CountriesIRL_\d{4}-\d{2}-\d{2}\.png$/u);
});

test('a legend detached from the canonical SVG refuses the export without a refresh instruction', async ({
  page,
}): Promise<void> => {
  const downloadNames: string[] = [];
  page.on('download', (download): void => {
    downloadNames.push(download.suggestedFilename());
    void download.cancel();
  });
  await waitForApp(page);

  const francePath = page.locator('path.country-path[data-country-id="FRA"]');
  await francePath.focus();
  await francePath.press('Enter');
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Apply Red' }).click();
  await expect(page.locator('[data-layer="legend"] text')).toHaveText('#DC2626');
  await expect(
    page.locator('svg.map-canvas > [data-layer="legend"]'),
  ).toHaveCount(1);

  // Exactly the regression the composition tripwire exists to catch: the legend
  // rendered as a sibling of the canonical SVG instead of inside it.
  const moveLegendOutOfCanvas = async (): Promise<void> => {
    await page.locator('svg.map-canvas').evaluate((element): void => {
      const legend = element.querySelector('[data-layer="legend"]');
      if (legend === null || element.parentElement === null) {
        throw new Error('The legend layer is not inside the canonical SVG.');
      }
      element.parentElement.appendChild(legend);
    });
  };
  await moveLegendOutOfCanvas();
  await expect(
    page.locator('svg.map-canvas > [data-layer="legend"]'),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Export PNG' }).click();
  const refusalToast = page.locator('[data-severity="error"]');
  await expect(refusalToast).toContainText(
    'The map layout could not be captured. Your map is unchanged. Move the legend, then try Export PNG again.',
  );
  // Refreshing destroys the in-memory composition and repairs nothing, and the
  // retry re-enters the same synchronous refusal forever.
  await expect(refusalToast).not.toContainText('Refresh the page');
  await expect(
    refusalToast.getByRole('button', { name: 'Try Export Again' }),
  ).toHaveCount(0);
  await expect(page.getByText('PNG downloaded at 1080 × 1080.')).toHaveCount(0);
  expect(downloadNames).toHaveLength(0);
  // The colors survive the refusal, which is what "Your map is unchanged" says.
  await expect(francePath).toHaveAttribute('fill', '#DC2626');

  // The gate is not stuck: restoring the composition exports on the next click.
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
  await page.getByRole('button', { name: 'Dismiss Message' }).click();
  await page.getByRole('button', { name: 'Export PNG' }).click();
  await expect(page.getByText('PNG downloaded at 1080 × 1080.')).toBeVisible({
    timeout: 20_000,
  });
  expect(downloadNames).toHaveLength(1);
});
