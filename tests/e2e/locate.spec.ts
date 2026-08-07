import { expect, test, type Page } from '@playwright/test';

const LOCATE_FIXTURE_URL = '/tests/e2e/fixtures/locate.html';
const MODERN_CORE_COUNT = 207;
const HISTORICAL_ENTITY_ID = 'HIST-PLC';

interface FixtureMapState {
  readonly selectedIds: ReadonlyArray<string>;
  readonly colors: Readonly<Record<string, string>>;
  readonly historyIndex: number;
  readonly historyLength: number;
}

interface FixtureCamera {
  readonly zoom: number;
  readonly centerLongitude: number;
  readonly centerLatitude: number;
}

interface LocateFixtureApi {
  readonly controllerFactoryCalls: number;
  readonly locateCalls: number;
  readMapState(): FixtureMapState;
  readCamera(): FixtureCamera | null;
}

async function openLocateFixture(page: Page): Promise<void> {
  await page.goto(LOCATE_FIXTURE_URL);
  await expect(page.getByLabel('Search countries')).toBeEnabled();
}

async function readMapState(page: Page): Promise<FixtureMapState> {
  return page.evaluate((): FixtureMapState =>
    (
      window as typeof window & { readonly __locateFixture: LocateFixtureApi }
    ).__locateFixture.readMapState(),
  );
}

async function readCamera(page: Page): Promise<FixtureCamera | null> {
  return page.evaluate((): FixtureCamera | null =>
    (
      window as typeof window & { readonly __locateFixture: LocateFixtureApi }
    ).__locateFixture.readCamera(),
  );
}

async function readLocateCalls(page: Page): Promise<number> {
  return page.evaluate((): number =>
    (
      window as typeof window & { readonly __locateFixture: LocateFixtureApi }
    ).__locateFixture.locateCalls,
  );
}

async function readControllerFactoryCalls(page: Page): Promise<number> {
  return page.evaluate((): number =>
    (
      window as typeof window & { readonly __locateFixture: LocateFixtureApi }
    ).__locateFixture.controllerFactoryCalls,
  );
}

test('country search filters the 195-country catalog and selects visible only', async ({
  page,
}): Promise<void> => {
  await openLocateFixture(page);

  const countrySearch = page.getByLabel('Search countries');
  const countryRows = page.locator('.country-list__item');
  const cameraBefore = await readCamera(page);

  await expect(countryRows).toHaveCount(MODERN_CORE_COUNT);
  await countrySearch.fill('guinea');
  await expect(countryRows).toHaveCount(4);
  expect((await readMapState(page)).selectedIds).toEqual([]);

  await page.getByRole('button', { name: 'Select Visible' }).click();
  expect((await readMapState(page)).selectedIds).toEqual([
    'GIN',
    'GNB',
    'GNQ',
    'PNG',
  ]);
  expect(await readCamera(page)).toEqual(cameraBefore);

  await countrySearch.fill('Atlantis');
  await expect(
    page.getByRole('heading', { name: 'No countries match “Atlantis”.' }),
  ).toBeVisible();
  await expect(page.getByText('Try a different country name.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear Country Search' }).click();
  await expect(countrySearch).toBeFocused();
  await expect(countryRows).toHaveCount(MODERN_CORE_COUNT);
});

test('Locate Country keyboard flow commits explicitly and invalidates edited targets', async ({
  page,
}): Promise<void> => {
  await openLocateFixture(page);

  const combobox = page.getByRole('combobox', { name: 'Find a country' });
  const locateButton = page.getByRole('button', { name: 'Locate Country' });

  await combobox.focus();
  const locateListbox = page.locator('.locate-country__options');
  const options = locateListbox.getByRole('option');
  await expect(options).toHaveCount(MODERN_CORE_COUNT);
  await expect(
    locateListbox.getByRole('option', { name: HISTORICAL_ENTITY_ID }),
  ).toHaveCount(0);

  await combobox.press('ArrowUp');
  await expect(combobox).toHaveAttribute(
    'aria-activedescendant',
    /-option-ZWE$/,
  );
  await combobox.press('Escape');
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');

  await combobox.fill('Fiji');
  await combobox.press('Enter');
  await expect(combobox).toHaveValue('Fiji');
  await expect(locateButton).toBeEnabled();

  await combobox.fill('Fijix');
  await expect(locateButton).toBeDisabled();
  await expect(
    page.getByRole('heading', { name: 'No country matches “Fijix”.' }),
  ).toBeVisible();
  await combobox.press('Escape');
  await expect(combobox).toHaveValue('Fijix');
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
});

test('Locate Country clears no-match state and returns focus to the combobox', async ({
  page,
}): Promise<void> => {
  await openLocateFixture(page);

  const combobox = page.getByRole('combobox', { name: 'Find a country' });
  await combobox.fill('Atlantis');
  await expect(
    page.getByRole('heading', { name: 'No country matches “Atlantis”.' }),
  ).toBeVisible();
  await expect(page.getByText('Try a different country name.')).toBeVisible();

  await page.getByRole('button', { name: 'Clear Locate Search' }).click();
  await expect(combobox).toBeFocused();
  await expect(combobox).toHaveValue('');
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Locate Country' })).toBeDisabled();
});

test('Locate Country centers a small island without selection, color, or history effects', async ({
  page,
}): Promise<void> => {
  await openLocateFixture(page);

  const combobox = page.getByRole('combobox', { name: 'Find a country' });
  const locateButton = page.getByRole('button', { name: 'Locate Country' });
  const stateBefore = await readMapState(page);
  const cameraBefore = await readCamera(page);

  await combobox.fill('Nauru');
  await combobox.press('Enter');
  await locateButton.click();
  await expect(locateButton).toBeFocused();
  await expect.poll(() => readLocateCalls(page)).toBe(1);
  await expect
    .poll(async (): Promise<number | null> => {
      const camera = await readCamera(page);
      return camera?.zoom ?? null;
    })
    .toBeGreaterThan(cameraBefore?.zoom ?? 0);

  expect(await readMapState(page)).toEqual(stateBefore);
  expect(await readControllerFactoryCalls(page)).toBe(1);
});
