import { expect, test, type Page } from '@playwright/test';

import { STORAGE_KEY } from '../../src/constants/config';
/*
 * `04-14`: the recorded wart in this file is CLOSED. It used to re-declare
 * `LOGICAL_CORE_COUNT`, `CAMERA_GROUP_SELECTOR`, `LOGICAL_PATH_SELECTOR`,
 * `waitForApp`, `readCameraTransform`, and `expectD3ZoomSynchronized` verbatim
 * beside the shared fixtures it already imported. Six copies that drift
 * independently is not a pattern; the shared module is.
 */
import {
  LOGICAL_CORE_COUNT,
  LOGICAL_PATH_SELECTOR,
  RAMP_RED_HEX,
  applyRampRed,
  expectD3ZoomSynchronized,
  legendDisclosure,
  openRailTool,
  readCameraTransform,
  waitForApp,
} from './support/appHarness';

// UI-SPEC section 20: the map label names the active period.
const MODERN_MAP_LISTBOX_NAME =
  'Interactive world map, Modern — current borders';
const PERSISTENCE_FIXTURE_URL = '/tests/e2e/fixtures/persistence.html';
// The locate transition runs for 240ms, so a save at 120ms lands mid-flight
// with roughly half of the eased travel already painted.
const MID_MOTION_SAVE_DELAY_MS = 120;

interface FixtureCamera {
  readonly zoom: number;
  readonly centerLongitude: number;
  readonly centerLatitude: number;
}

interface FixtureSaveResult {
  readonly painted: FixtureCamera;
  readonly committed: FixtureCamera;
  readonly nextFramePainted: FixtureCamera;
  readonly ok: boolean;
  readonly reason: string | null;
}

interface FixtureLoadResult {
  readonly ok: boolean;
  readonly reason: string | null;
  readonly sourceVersion: 1 | 2 | 3 | null;
  readonly compositionWarnings: ReadonlyArray<string>;
}

interface PersistenceFixtureApi {
  readonly status: string;
  readPaintedCamera(): FixtureCamera | null;
  getCommittedCamera(): FixtureCamera;
  getColors(): Record<string, unknown>;
  getSnapshotId(): string;
  getLegendEntryCount(): number;
  setColor(countryId: string, color: string): void;
  locate(countryId: string): boolean;
  saveNow(name: string): Promise<FixtureSaveResult>;
  saveAfter(delayMs: number, name: string): Promise<FixtureSaveResult>;
  load(name: string): Promise<FixtureLoadResult>;
  listSummaries(): ReadonlyArray<{
    name: string;
    timestamp: number;
    sourceVersion: 1 | 2 | 3;
    snapshotId: string | null;
    legendEntryCount: number;
    isWholeWorldView: boolean;
  }> | null;
}

declare global {
  var __persistenceFixture: PersistenceFixtureApi | undefined;
}

async function waitForFixture(page: Page): Promise<void> {
  await page.goto(PERSISTENCE_FIXTURE_URL);
  await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
    LOGICAL_CORE_COUNT,
  );
}

async function readSettledFixtureCamera(page: Page): Promise<FixtureCamera> {
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

  return page.evaluate((): FixtureCamera => {
    const fixture = globalThis.__persistenceFixture;
    const camera = fixture?.readPaintedCamera() ?? null;
    if (camera === null) {
      throw new Error('The fixture camera is unavailable.');
    }
    return camera;
  });
}

async function readStoredCamera(
  page: Page,
  name: string,
): Promise<FixtureCamera> {
  return page.evaluate(
    ({ storageKey, mapName }): FixtureCamera => {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) {
        throw new Error('No saved compositions were written.');
      }
      const records = JSON.parse(raw) as Array<{
        name: string;
        composition?: { camera: FixtureCamera };
      }>;
      const record = records.find((candidate) => candidate.name === mapName);
      if (record?.composition === undefined) {
        throw new Error(`Saved composition "${mapName}" is missing.`);
      }
      return record.composition.camera;
    },
    { storageKey: STORAGE_KEY, mapName: name },
  );
}

function expectCamerasClose(
  actual: FixtureCamera,
  expected: FixtureCamera,
): void {
  expect(actual.zoom).toBeCloseTo(expected.zoom, 4);
  expect(actual.centerLongitude).toBeCloseTo(expected.centerLongitude, 4);
  expect(actual.centerLatitude).toBeCloseTo(expected.centerLatitude, 4);
}

function expectCamerasApart(
  actual: FixtureCamera,
  other: FixtureCamera,
): void {
  const isApart =
    Math.abs(actual.zoom - other.zoom) > 0.001 ||
    Math.abs(actual.centerLongitude - other.centerLongitude) > 0.01 ||
    Math.abs(actual.centerLatitude - other.centerLatitude) > 0.01;
  expect(
    isApart,
    `Expected ${JSON.stringify(actual)} to differ from ${JSON.stringify(other)}`,
  ).toBe(true);
}

function createLegacyRecord(): Record<string, unknown> {
  return { name: 'Phase 1 map', colors: { FRA: '#2563EB' }, timestamp: 1_600_000_000_000 };
}

function createCustomViewRecord(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'Custom view map',
    timestamp: 1_700_000_000_000,
    composition: {
      colors: { DEU: '#DC2626' },
      camera: { zoom: 3, centerLongitude: 11, centerLatitude: 50 },
      snapshotId: 'modern',
      /*
       * A PRE-D4-11 V2 record, kept carrying `theme`, `backgroundOpacity`,
       * and `borderStyle` on purpose. This is what a creator's saved map
       * actually looks like on disk, and loading it must not raise a repair
       * warning for fields this version simply no longer models.
       */
      legend: {
        entries: [{ color: '#DC2626', label: 'Visited', order: 0 }],
        position: { x: 64, y: 720, preset: null },
        theme: 'light',
        textSize: 'medium',
        backgroundOpacity: 85,
        borderStyle: 'hairline',
      },
      settings: { backgroundColor: '#FFFFFF' },
    },
  };
}

test('save during an animated Locate stores the visible frame and load restores it', async ({
  page,
}): Promise<void> => {
  await waitForFixture(page);
  await page.evaluate(
    (storageKey): void => localStorage.removeItem(storageKey),
    STORAGE_KEY,
  );

  const startCamera = await page.evaluate((): FixtureCamera => {
    const fixture = globalThis.__persistenceFixture;
    if (fixture === undefined) {
      throw new Error('The persistence fixture is unavailable.');
    }
    fixture.setColor('FRA', '#DC2626');
    return fixture.getCommittedCamera();
  });

  const saved = await page.evaluate(
    async ({ delayMs }): Promise<FixtureSaveResult> => {
      const fixture = globalThis.__persistenceFixture;
      if (fixture === undefined) {
        throw new Error('The persistence fixture is unavailable.');
      }
      const pending = fixture.saveAfter(delayMs, 'Motion save');
      fixture.locate('RUS');
      return pending;
    },
    { delayMs: MID_MOTION_SAVE_DELAY_MS },
  );

  expect(saved.ok, saved.reason ?? '').toBe(true);
  // The camera was still travelling when the save ran, so this is genuinely a
  // mid-animation save rather than a settled one.
  expectCamerasApart(saved.nextFramePainted, saved.painted);
  // The committed composition camera only advances on gesture end, so it was
  // still the pre-Locate value. Storing it would have been the stale-save bug.
  expectCamerasClose(saved.committed, startCamera);
  expectCamerasApart(saved.painted, saved.committed);

  const storedCamera = await readStoredCamera(page, 'Motion save');
  expectCamerasClose(storedCamera, saved.painted);

  const settledCamera = await readSettledFixtureCamera(page);
  // The Locate destination is not what was saved either.
  expectCamerasApart(storedCamera, settledCamera);

  const loaded = await page.evaluate(async (): Promise<FixtureLoadResult> => {
    const fixture = globalThis.__persistenceFixture;
    if (fixture === undefined) {
      throw new Error('The persistence fixture is unavailable.');
    }
    return fixture.load('Motion save');
  });
  expect(loaded.ok, loaded.reason ?? '').toBe(true);
  // RE-BASELINED by `04-14`: a save written by THIS build is a V3 record, so
  // reading it back reports 3. A V2 record on disk still reports 2 - that is
  // the branch `storage.test.ts` covers on hand-built bytes.
  expect(loaded.sourceVersion).toBe(3);
  expect(loaded.compositionWarnings).toEqual([]);

  const restoredCamera = await readSettledFixtureCamera(page);
  expectCamerasClose(restoredCamera, saved.painted);
  await expectD3ZoomSynchronized(page);
  // D4-02: a colour assignment is a `ColorValue` union in memory. A one-off hex
  // is the CUSTOM variant of it, so a saved V2 hex reloads as this shape.
  expect(await page.evaluate((): Record<string, unknown> => {
    const fixture = globalThis.__persistenceFixture;
    if (fixture === undefined) {
      throw new Error('The persistence fixture is unavailable.');
    }
    return fixture.getColors();
  })).toEqual({ FRA: { kind: 'custom', hex: '#DC2626' } });
});

test('save during active wheel movement stores the live painted camera', async ({
  page,
}): Promise<void> => {
  await waitForFixture(page);
  await page.evaluate(
    (storageKey): void => localStorage.removeItem(storageKey),
    STORAGE_KEY,
  );

  const mapBounds = await page.locator('svg.map-canvas').boundingBox();
  if (mapBounds === null) {
    throw new Error('Map bounds are unavailable.');
  }
  await page.mouse.move(
    mapBounds.x + mapBounds.width / 2,
    mapBounds.y + mapBounds.height / 2,
  );
  await page.mouse.wheel(0, -400);
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(1);

  // d3 only ends a wheel gesture after its idle delay, so the composition
  // camera is still unset while the wheel is active.
  const saved = await page.evaluate(async (): Promise<FixtureSaveResult> => {
    const fixture = globalThis.__persistenceFixture;
    if (fixture === undefined) {
      throw new Error('The persistence fixture is unavailable.');
    }
    return fixture.saveNow('Wheel save');
  });

  expect(saved.ok, saved.reason ?? '').toBe(true);
  expect(saved.painted.zoom).toBeGreaterThan(1);
  expect(saved.committed.zoom).toBe(1);
  expectCamerasApart(saved.painted, saved.committed);

  const storedCamera = await readStoredCamera(page, 'Wheel save');
  expectCamerasClose(storedCamera, saved.painted);
});

test('real app saves and loads the complete composition after responsive rebinding', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1300, height: 900 });
  await waitForApp(page);
  await page.evaluate(
    (storageKey): void => localStorage.removeItem(storageKey),
    STORAGE_KEY,
  );
  await page.locator('svg.map-canvas').evaluate((svg): void => {
    svg.setAttribute('data-camera-owner-sentinel', 'stable-owner');
  });

  const francePath = page.locator('path.country-path[data-country-id="FRA"]');
  await francePath.focus();
  await francePath.press('Enter');
  await openRailTool(page, 'Colors');
  await applyRampRed(page);
  await expect(page.locator('[data-layer="legend"] text')).toHaveText('#DE2D26');
  await openRailTool(page, 'Legend');
  await legendDisclosure(page).click();
  const legendLabel = page.getByLabel('Legend label for #DE2D26');
  await legendLabel.fill('Visited France');
  await legendLabel.press('Enter');
  await expect(page.locator('[data-layer="legend"] text')).toHaveText(
    'Visited France',
  );
  const moveLegend = page.getByRole('button', { name: 'Move legend' });

  // Legend placement, asserted against the REAL app and not against a fixture:
  // `fixtures/export.html` re-implements App's `legendSlot` wiring, so it can
  // only prove that MapCanvas fills the slot it is handed. If a composition-root
  // refactor renders <LegendOverlay/> as a sibling of the canvas instead, every
  // export refuses with `invalid-composition` and only this assertion notices.
  const mapListbox = page.getByRole('listbox', {
    name: MODERN_MAP_LISTBOX_NAME,
  });
  await expect(mapListbox).toHaveCount(1);
  await expect(mapListbox.locator('[data-layer="legend"]')).toHaveCount(0);
  await expect(
    page.locator('svg.map-canvas > [data-layer="legend"]'),
  ).toHaveCount(1);
  // A legend inside the countries listbox is announced as a map option and is
  // refused by the direct-children composition check.
  expect(
    await moveLegend.evaluate(
      (element): boolean => element.closest('[role="listbox"]') !== null,
    ),
  ).toBe(false);

  await moveLegend.focus();
  await moveLegend.press('ArrowRight');
  await expect(page.getByText('Legend position updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await page.getByRole('button', { name: 'Move Map' }).click();
  await page.getByRole('button', { name: 'Pan Right' }).click();
  const savedTransform = await readCameraTransform(page);

  // The dialog dissolved into the `saved` panel (03-07): opening the tool IS
  // opening Save/Load.
  await openRailTool(page, 'Saved Maps');
  await page.getByRole('textbox', { name: 'Map name' }).fill('Integrated view');
  await page.getByRole('button', { name: 'Save Map' }).click();

  const savedEvidence = await page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) {
      throw new Error('Saved composition is missing.');
    }
    const records = JSON.parse(raw) as Array<{
      schemaVersion: number;
      composition: {
        colors: Record<string, unknown>;
        camera: { zoom: number };
        snapshotId: string;
        legend: Record<string, unknown> & {
          entries: Array<{ label: string }>;
        };
        settings: Record<string, unknown>;
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
      legendLabel: record.composition.legend.entries[0]?.label,
      /*
       * D4-11 re-baseline, deliberate and itemised: this used to read
       * `legendTheme: record.composition.legend.theme` and assert `'light'`.
       * `theme`, `backgroundOpacity`, and `borderStyle` no longer exist in
       * `LegendState`, so the SAVE path no longer writes them into the V2
       * record. Asserting the saved KEY SET rather than a dropped value is
       * what makes the boundary change visible: a field creeping back into
       * the persisted record reddens this.
       *
       * **RE-BASELINED AGAIN by `04-13`, deliberately: three keys -> SIX.**
       * `form`, `caption`, and `showNoData` join the persisted legend, and
       * `04-14`'s V3 work inherits exactly these six. The three DELETED chrome
       * keys are still absent, which is the half this assertion has always
       * protected, and the assertion form is unchanged — it is the same key-set
       * comparison, not a loosened one.
       */
      legendKeys: Object.keys(record.composition.legend).sort().join(','),
      /*
       * **RE-BASELINED by `04-14`, deliberately and itemised.** `settings` was
       * `{ backgroundColor: '#FFFFFF' }` and the assertion read that one value.
       * V3 persists every Phase 4 field and DROPS `backgroundColor` — it was
       * V2's record that the composition is opaque, nothing renders from it,
       * and `surfaceColor` is what actually paints. Asserting the key SET is
       * what makes a field silently leaving the record visible, the same shape
       * `legendKeys` has protected since D4-11.
       */
      settingsKeys: Object.keys(record.composition.settings).sort().join(','),
      surfaceColor: record.composition.settings.surfaceColor,
    };
  }, STORAGE_KEY);

  expect(savedEvidence).toMatchObject({
    // RE-BASELINED: `04-14` bumps the record to V3 (D4-17, one rendering path).
    schemaVersion: 3,
    zoom: 1.5,
    snapshotId: 'modern',
    legendLabel: 'Visited France',
    legendKeys: 'caption,entries,form,position,showNoData,textSize',
    settingsKeys:
      'attribution,borderColor,bottomBandHeight,bottomBandVisible,' +
      'coastlineWeight,interiorWeight,subtitle,subtitleSize,surfaceColor,' +
      'textAlignment,title,titleSize,topBandHeight,topBandVisible,uncoloredFill',
    surfaceColor: '#FFFFFF',
  });
  /*
   * **The headline of `04-14`, asserted on the real app's bytes.** France was
   * painted through `applyRampRed`, and before this plan the record held the
   * RESOLVED hex — `04-05`'s interim, lossy in the ramp identity. It now holds
   * the assignment itself, so a reopened map can still be re-skinned.
   */
  expect(savedEvidence.color).toEqual({
    kind: 'ramp',
    rampId: 'reds',
    t: expect.any(Number),
  });

  // Saving marks the composition clean, so this row shows what was just saved.
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Integrated view' }),
  ).toContainText('Modern · 1 legend entry · Custom view');

  // D-4 closed: `Close Saved Maps` is ONE control now - the panel's close.
  await expect(
    page.getByRole('button', { name: 'Close Saved Maps' }),
  ).toHaveCount(1);
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Reset All Colors' }).click();
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await francePath.focus();
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(
    page.getByRole('main', { name: 'Map creator workspace' }),
  ).toHaveClass(/workspace--compact/);
  await expect(page.locator('svg.map-canvas')).toHaveAttribute(
    'data-camera-owner-sentinel',
    'stable-owner',
  );
  await expect(francePath).toBeFocused();
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect(
    page.getByRole('main', { name: 'Map creator workspace' }),
  ).toHaveClass(/workspace--desktop/);
  await expect(page.locator('svg.map-canvas')).toHaveAttribute(
    'data-camera-owner-sentinel',
    'stable-owner',
  );
  await expect(francePath).toBeFocused();
  await expect(page.locator('svg.map-canvas')).toHaveCount(1);

  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('button', { name: 'Load This Map: Integrated view' })
    .click();
  // The reset and the extra zoom left unsaved work, so the load is confirmed -
  // inline in the row now, not in a modal.
  await expect(
    page.getByRole('heading', { name: 'Replace the current map?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Load Saved Map' }).click();
  await expect(
    page.getByRole('heading', { name: 'Replace the current map?' }),
  ).toHaveCount(0);

  const loadedTransform = await readCameraTransform(page);
  expect(loadedTransform.k).toBeCloseTo(savedTransform.k, 5);
  expect(loadedTransform.x).toBeCloseTo(savedTransform.x, 5);
  expect(loadedTransform.y).toBeCloseTo(savedTransform.y, 5);
  await expectD3ZoomSynchronized(page);
  // The ramp assignment came back as a ramp assignment, and it still resolves
  // to the same paint — lossless AND visually identical, which is the pair.
  await expect(
    page.locator('path.country-path[data-country-id="FRA"]'),
  ).toHaveAttribute('fill', RAMP_RED_HEX);
  await expect(page.locator('[data-layer="legend"] text')).toHaveText(
    'Visited France',
  );

  const mapBounds = await page.locator('svg.map-canvas').boundingBox();
  if (mapBounds === null) {
    throw new Error('Map bounds are unavailable after load.');
  }
  await page.mouse.move(
    mapBounds.x + mapBounds.width / 2,
    mapBounds.y + mapBounds.height / 2,
  );
  await page.mouse.wheel(0, -300);
  await expect
    .poll(async (): Promise<number> => (await readCameraTransform(page)).k)
    .toBeGreaterThan(savedTransform.k);
});

test('Saved Maps rows describe stored compositions and never rewrite a V1 record', async ({
  page,
}): Promise<void> => {
  await page.addInitScript(
    ({ storageKey, records }): void => {
      localStorage.setItem(storageKey, JSON.stringify(records));
    },
    {
      storageKey: STORAGE_KEY,
      records: [createCustomViewRecord(), createLegacyRecord()],
    },
  );
  await waitForApp(page);
  await openRailTool(page, 'Saved Maps');

  const customRow = page
    .getByRole('listitem')
    .filter({ hasText: 'Custom view map' });
  await expect(customRow).toContainText('Modern · 1 legend entry · Custom view');
  const legacyRow = page
    .getByRole('listitem')
    .filter({ hasText: 'Phase 1 map' });
  await expect(legacyRow).toContainText(
    'Legacy map · Opens with modern borders and whole-world view',
  );

  await page.getByRole('button', { name: 'Load This Map: Phase 1 map' }).click();
  await expect(
    page.getByText(
      'Older saved map loaded with a modern world view. Save it again to keep the full composition.',
    ),
  ).toBeVisible();
  await expect(
    page.locator('path.country-path[data-country-id="FRA"]'),
  ).toHaveAttribute('fill', '#2563EB');

  const storedAfterLoad = await page.evaluate(
    (storageKey) => JSON.parse(localStorage.getItem(storageKey) ?? 'null'),
    STORAGE_KEY,
  );
  expect(storedAfterLoad).toEqual([
    createCustomViewRecord(),
    createLegacyRecord(),
  ]);
});

test('Saved Maps require a two-step delete and confirm loading over unsaved work', async ({
  page,
}): Promise<void> => {
  await page.addInitScript(
    ({ storageKey, records }): void => {
      localStorage.setItem(storageKey, JSON.stringify(records));
    },
    { storageKey: STORAGE_KEY, records: [createCustomViewRecord()] },
  );
  await waitForApp(page);

  const francePath = page.locator('path.country-path[data-country-id="FRA"]');
  await francePath.focus();
  await francePath.press('Enter');
  await openRailTool(page, 'Colors');
  await applyRampRed(page);
  await expect(page.locator('[data-layer="legend"] text')).toHaveText('#DE2D26');

  await openRailTool(page, 'Saved Maps');
  const loadButton = page.getByRole('button', {
    name: 'Load This Map: Custom view map',
  });
  await loadButton.click();

  // The dirty-load confirmation swapped in place of the row's actions -
  // a sibling of the surface it interrupts, never a modal.
  const loadConfirm = page.locator('.saved-map-load-confirm');
  await expect(loadConfirm).toContainText('Replace the current map?');
  await expect(loadConfirm).toContainText(
    'Loading “Custom view map” will replace unsaved colors, view, period, and legend changes.',
  );
  const keepEditing = page.getByRole('button', { name: 'Keep Editing' });
  await expect(page.getByRole('button', { name: 'Load Saved Map' })).toBeFocused();

  // The row's own actions swapped OUT while its confirmation is open: the
  // confirmation replaces them in place, so neither can be activated past it.
  await expect(
    page.getByRole('button', { name: 'Delete Saved Map: Custom view map' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Load This Map: Custom view map' }),
  ).toHaveCount(0);

  await keepEditing.click();
  await expect(loadConfirm).toHaveCount(0);
  await expect(loadButton).toBeFocused();
  await expect(francePath).toHaveAttribute('fill', '#DE2D26');

  // Escape declines the confirmation without closing the panel behind it.
  await loadButton.click();
  await expect(loadConfirm).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(loadConfirm).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save Map' })).toBeVisible();
  await expect(loadButton).toBeFocused();

  /*
   * Clicking the confirmation's body text is the ordinary act of reading it.
   * The confirmation carries `tabIndex={-1}` so mouse-down focus targeting
   * stops there; without it focus falls to `document.body`, the panel's
   * `onKeyDown` never fires, and Escape goes dead with the prompt stuck open.
   */
  await loadButton.click();
  await expect(loadConfirm).toBeVisible();
  await loadConfirm.getByText('will replace unsaved colors').click();
  await expect(
    page.locator('.saved-map-load-confirm:focus, .saved-map-load-confirm :focus'),
  ).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(loadConfirm).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save Map' })).toBeVisible();
  await expect(francePath).toHaveAttribute('fill', '#DE2D26');

  const deleteButton = page.getByRole('button', {
    name: 'Delete Saved Map: Custom view map',
  });
  await deleteButton.click();
  await expect(
    page.getByText('Delete “Custom view map”? This saved map cannot be recovered.'),
  ).toBeVisible();
  const confirmDelete = page.getByRole('button', {
    name: 'Delete Map: Custom view map',
  });
  await expect(confirmDelete).toBeFocused();

  // Escape cancels the innermost confirmation only: closing the whole panel
  // would silently discard the delete prompt and force a reopen.
  await page.keyboard.press('Escape');
  await expect(confirmDelete).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save Map' })).toBeVisible();
  await expect(deleteButton).toBeFocused();

  await deleteButton.click();
  await expect(confirmDelete).toBeFocused();
  await page.getByRole('button', { name: 'Keep Map: Custom view map' }).click();
  await expect(confirmDelete).toHaveCount(0);
  await expect(deleteButton).toBeFocused();
  expect(
    await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      STORAGE_KEY,
    ),
  ).not.toBeNull();

  await deleteButton.click();
  await confirmDelete.click();
  await expect(page.getByText('Saved map deleted.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No saved maps yet' })).toBeVisible();
  await expect(
    page.getByText(
      'Name the current map above to keep its colors, view, period, and legend in this browser.',
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (storageKey) => JSON.parse(localStorage.getItem(storageKey) ?? 'null'),
      STORAGE_KEY,
    ),
  ).toEqual([]);
  // Deleting a saved map never touches the working composition.
  await expect(francePath).toHaveAttribute('fill', '#DE2D26');
});

test('the saved panel closes back to its rail row and a load focuses the map', async ({
  page,
}): Promise<void> => {
  await page.addInitScript(
    ({ storageKey, records }): void => {
      localStorage.setItem(storageKey, JSON.stringify(records));
    },
    { storageKey: STORAGE_KEY, records: [createCustomViewRecord()] },
  );
  await page.setViewportSize({ width: 1300, height: 900 });
  await waitForApp(page);

  /*
   * The dialog and its opener retired in `03-07`: the `saved` panel IS
   * Save/Load, so dismissal is the tool panel's own Escape, which returns
   * focus to the rail row that opened it. With no confirmation open, Escape
   * propagates past SaveLoad's innermost-first handler to the panel.
   */
  await openRailTool(page, 'Saved Maps');
  await page.getByRole('textbox', { name: 'Map name' }).focus();
  await page.keyboard.press('Escape');
  const savedRow = page.getByRole('button', {
    name: 'Saved Maps',
    exact: true,
  });
  await expect(savedRow).toHaveAttribute('aria-expanded', 'false');
  await expect(savedRow).toBeFocused();

  // Survives the responsive crossing: one panel at every width.
  await openRailTool(page, 'Saved Maps');
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(
    page.getByRole('main', { name: 'Map creator workspace' }),
  ).toHaveClass(/workspace--compact/);
  await expect(page.getByRole('button', { name: 'Save Map' })).toBeVisible();

  // A successful load is the intentional exception: focus goes to the map.
  await page
    .getByRole('button', { name: 'Load This Map: Custom view map' })
    .click();
  await expect
    .poll(async (): Promise<string | null> =>
      page.evaluate((): string | null => {
        const active = document.activeElement;
        return active === null ? null : active.getAttribute('data-path-kind');
      }),
    )
    .toBe('logical');
  await expect(
    page.locator('path.country-path[data-country-id="DEU"]'),
  ).toHaveAttribute('fill', '#DC2626');
});

/*
 * OPEN ITEM 4, RED-provable: `storage.ts` builds `SNAPSHOT_IDS` from all five
 * catalog entries and its record validator admits any id in that set, so this
 * hand-crafted record VALIDATES. The approved-id filter on the short-label
 * resolver is what keeps the deferred period off the row.
 */
test('a stored record naming a deferred period renders no period label on its row', async ({
  page,
}): Promise<void> => {
  await page.addInitScript(
    ({ storageKey, record }): void => {
      localStorage.setItem(storageKey, JSON.stringify([record]));
    },
    {
      storageKey: STORAGE_KEY,
      record: {
        ...createCustomViewRecord(),
        name: 'Hand-crafted period map',
        composition: {
          ...(createCustomViewRecord().composition as Record<string, unknown>),
          snapshotId: '1914',
        },
      },
    },
  );
  await waitForApp(page);
  await openRailTool(page, 'Saved Maps');

  const row = page
    .getByRole('listitem')
    .filter({ hasText: 'Hand-crafted period map' });
  await expect(row).toContainText('1 legend entry · Custom view');
  // The row must not name the deferred period, and it is not a legacy map
  // either - it is a V2 record whose period the approved manifest does not
  // yield.
  await expect(row.locator('.saved-map-metadata')).not.toContainText('1914');
  await expect(row).not.toContainText('Legacy map');
});

/*
 * `04-14` (D4-17) - the creator-visible half of the V3 round trip, in the REAL
 * app and across a genuine page reload.
 *
 * The unit suite proves the bytes; this proves the loop a creator actually
 * runs: paint with a ramp, choose water, turn a band on, type a title, save,
 * **reload the browser**, load it back. The reload is the point - nothing can
 * be carried across in memory, so anything that comes back came off disk.
 */
const V3_ROUND_TRIP_NAME = 'V3 round trip';
const V3_WATER_PRESET_NAME = 'Warm paper';
const V3_WATER_HEX = '#F5EFE6';
const V3_TITLE = 'Populated title';

test('a saved composition survives a page reload with its ramp, water, bands, and text', async ({
  page,
}): Promise<void> => {
  await waitForApp(page);
  await page.evaluate(
    (storageKey): void => localStorage.removeItem(storageKey),
    STORAGE_KEY,
  );

  const francePath = page.locator('path.country-path[data-country-id="FRA"]');
  await francePath.focus();
  await francePath.press('Enter');
  await openRailTool(page, 'Colors');
  await applyRampRed(page);
  await expect(francePath).toHaveAttribute('fill', RAMP_RED_HEX);

  await openRailTool(page, 'Map style');
  const water = page.getByRole('radio', {
    name: V3_WATER_PRESET_NAME,
    exact: true,
  });
  await water.check();
  await expect(water).toBeChecked();
  const bottomBand = page.getByRole('checkbox', {
    name: 'Bottom band',
    exact: true,
  });
  await bottomBand.setChecked(true);
  await expect(bottomBand).toBeChecked();
  const title = page.getByLabel('Title', { exact: true });
  await title.fill(V3_TITLE);
  await expect(title).toHaveValue(V3_TITLE);

  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('textbox', { name: 'Map name' })
    .fill(V3_ROUND_TRIP_NAME);
  await page.getByRole('button', { name: 'Save Map' }).click();

  // The reload. Everything below came off disk.
  await waitForApp(page);
  await openRailTool(page, 'Saved Maps');
  await page
    .getByRole('button', { name: `Load This Map: ${V3_ROUND_TRIP_NAME}` })
    .click();

  // No corruption toast: a V3 record read by a V3 reader is not a repair.
  await expect(page.getByText('Saved map loaded.')).toBeVisible();

  // The RAMP assignment, not just the hex it happens to resolve to. The stored
  // record is checked directly because a matching `fill` alone is exactly what
  // `04-05`'s lossy interim also produced.
  const storedColor = await page.evaluate((storageKey): unknown => {
    const raw = localStorage.getItem(storageKey);
    const records = JSON.parse(raw ?? 'null') as Array<{
      composition: { colors: Record<string, unknown> };
    }>;
    return records[0]?.composition.colors.FRA;
  }, STORAGE_KEY);
  expect(storedColor).toEqual({
    kind: 'ramp',
    rampId: 'reds',
    t: expect.any(Number),
  });
  await expect(
    page.locator('path.country-path[data-country-id="FRA"]'),
  ).toHaveAttribute('fill', RAMP_RED_HEX);

  // The water, straight off the serialized surface rect the exporter reads.
  await expect(page.locator('rect[data-layer="surface"]')).toHaveAttribute(
    'fill',
    V3_WATER_HEX,
  );

  // Both bands: the top is on by default and the bottom was turned on, so a
  // reader that dropped `bottomBandVisible` would show one band, not two.
  await expect(
    page.locator('svg.map-canvas [data-layer="bands"] rect'),
  ).toHaveCount(2);

  // The title, as text content of the exported layer rather than a form value.
  await expect(
    page.locator(
      'svg.map-canvas > [data-layer="text"] > [data-text-role="title"]',
    ),
  ).toHaveText(V3_TITLE);

  // And the controls agree with the canvas after the reload.
  await openRailTool(page, 'Map style');
  await expect(
    page.getByRole('radio', { name: V3_WATER_PRESET_NAME, exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Bottom band', exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(V3_TITLE);
});
