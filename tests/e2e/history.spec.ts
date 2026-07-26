import { createHash } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

const HISTORY_FIXTURE_URL = '/tests/e2e/fixtures/history.html';
const LOGICAL_CORE_COUNT = 195;
const LOGICAL_PATH_SELECTOR = 'path.country-path[role="option"]';
const MODERN_PERIOD_LABEL = 'Modern — current borders';
const HISTORICAL_PERIOD_LABEL = '1700 — Post-Westphalia Europe';
const HISTORICAL_ENTITY_ID = 'HIST-HRE';
const HISTORICAL_ASSET_PATH = '/data/snapshots/1700.geojson';
const MANIFEST_URL = '**/data/snapshots/index.json';
const WORLD_ASSET_URL = '**/data/world-modern.geojson';
const NFR3_WARM_SAMPLES = 5;
const HISTORICAL_REGIONS = [
  'poland',
  'lithuania',
  'hungary',
  'balkans',
  'iberia',
  'scandinavia',
] as const;

interface OutgoingSceneObservation {
  readonly ariaHidden: string | null;
  readonly pointerEvents: string;
  readonly role: string | null;
  readonly countryIdCount: number;
  readonly titleCount: number;
  readonly focusableCount: number;
  readonly pathCount: number;
}

interface HistoryFixtureApi {
  readSelectedIds(): ReadonlyArray<string>;
  readOutgoingObservations(): ReadonlyArray<OutgoingSceneObservation>;
  readCamera(): {
    zoom: number;
    centerLongitude: number;
    centerLatitude: number;
  } | null;
  finalizeSelectedScene(): void;
}

declare global {
  interface Window {
    __historyFixture?: HistoryFixtureApi;
  }
}

function createHistoricalFixture(): {
  readonly assetBody: string;
  readonly manifest: Record<string, unknown>;
} {
  const assetBody = JSON.stringify({
    type: 'FeatureCollection',
    snapshotId: '1700',
    asOf: '1700-01-01',
    replacedModernSourceFeatureIds: ['FRA'],
    features: [
      {
        type: 'Feature',
        id: 'historical-hre-1700',
        properties: { name: 'Holy Roman Empire' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [5, 45],
              [5, 55],
              [18, 55],
              [18, 45],
              [5, 45],
            ],
          ],
        },
        sourceFeatureId: 'historical-hre-1700',
        entityId: HISTORICAL_ENTITY_ID,
        colorOwnerId: HISTORICAL_ENTITY_ID,
        isSelectable: true,
        interactionMode: 'historical-entity',
        boundaryMode: 'historical',
        provenanceId: 'history-browser-fixture-1700',
      },
    ],
  });

  return {
    assetBody,
    manifest: {
      version: 1,
      snapshots: [
        {
          id: 'modern',
          label: 'Modern — current borders',
          asOf: 'Current',
          assetPath: '/data/world-modern.geojson',
          sha256: 'a'.repeat(64),
          coverageRegions: [],
          sourceRecords: [],
          reviewStatus: 'source-reviewed',
          fallbackLabel: 'Modern boundaries',
        },
        {
          id: '1700',
          label: '1700 — manifest label that must never be shown',
          asOf: '1700-01-01',
          assetPath: HISTORICAL_ASSET_PATH,
          sha256: createHash('sha256').update(assetBody).digest('hex'),
          coverageRegions: [...HISTORICAL_REGIONS],
          sourceRecords: [
            {
              url: 'https://example.test/history-browser-fixture',
              license: 'Test fixture only',
              accessedOn: '2026-07-25',
              attribution: null,
            },
          ],
          reviewStatus: 'historian-reviewed',
          fallbackLabel: 'Modern fallback outside fixture coverage',
        },
      ],
    },
  };
}

async function routeHistoricalCatalog(page: Page): Promise<void> {
  const fixture = createHistoricalFixture();
  await page.route(MANIFEST_URL, async (route): Promise<void> => {
    await route.fulfill({ json: fixture.manifest });
  });
  await page.route(`**${HISTORICAL_ASSET_PATH}`, async (route): Promise<void> => {
    await route.fulfill({
      body: fixture.assetBody,
      contentType: 'application/geo+json',
    });
  });
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

function periodSelect(page: Page): ReturnType<Page['getByLabel']> {
  return page.getByLabel('Map period');
}

test.describe('world period selector', (): void => {
  test('ships the live Modern-only catalog with no deferred teasers', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);

    const select = periodSelect(page);
    await expect(select).toHaveValue('modern');
    await expect(select.locator('option')).toHaveCount(1);
    await expect(select.locator('option')).toHaveText([MODERN_PERIOD_LABEL]);
    await expect(page.getByText('Modern borders worldwide.')).toBeVisible();
    await expect(
      page.getByText('1080 × 1080 composition preview'),
    ).toBeVisible();
    await expect(
      page.getByRole('listbox', {
        name: `Interactive world map, ${MODERN_PERIOD_LABEL}`,
      }),
    ).toHaveCount(1);
    await expect(page.locator('svg.map-canvas')).toHaveCount(1);
  });

  test('owns exactly one Reset View and delegates it to the single camera', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);

    const resetView = page.getByRole('button', { name: 'Reset View' });
    await expect(resetView).toHaveCount(1);

    const zoomIn = page.getByRole('button', { name: 'Zoom In' });
    const zoomOut = page.getByRole('button', { name: 'Zoom Out' });
    await expect(zoomOut).toBeDisabled();
    await zoomIn.click();
    await expect(zoomOut).toBeEnabled();

    await resetView.click();

    await expect(page.getByText('Map view reset.')).toBeVisible();
    await expect(zoomOut).toBeDisabled();
    // One camera owner: the reset ran through the same handle the navigation
    // cluster uses, so a second controller would have left this stale.
    await expect(page.locator('svg.map-canvas')).toHaveCount(1);
  });

  test('disables period and Reset View while the world map is loading', async ({
    page,
  }): Promise<void> => {
    let releaseWorld = (): void => undefined;
    const worldGate = new Promise<void>((resolve): void => {
      releaseWorld = resolve;
    });
    await page.route(WORLD_ASSET_URL, async (route): Promise<void> => {
      await worldGate;
      await route.continue();
    });

    await page.goto('/');

    await expect(page.getByText('Loading world map…')).toBeVisible();
    await expect(periodSelect(page)).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reset View' })).toBeDisabled();

    releaseWorld();
    await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
      LOGICAL_CORE_COUNT,
    );
    await expect(periodSelect(page)).toBeEnabled();
  });

  test('offers the exact world recovery state when the map cannot load', async ({
    page,
  }): Promise<void> => {
    await page.route(WORLD_ASSET_URL, async (route): Promise<void> => {
      await route.fulfill({ status: 500, body: 'unavailable' });
    });

    await page.goto('/');

    const fatal = page.getByRole('alert');
    await expect(fatal).toContainText("We couldn't load the world map");
    await expect(fatal).toContainText(
      'Refresh the page to try the bundled map data again. Your saved maps will stay in this browser.',
    );
    await expect(fatal.getByRole('button', { name: 'Reload Map' })).toBeVisible();
    await expect(fatal).not.toContainText('Europe');
  });
});

test.describe('approved period switching', (): void => {
  test('surfaces an approved catalog entry under its approved label only', async ({
    page,
  }): Promise<void> => {
    await routeHistoricalCatalog(page);
    await waitForApp(page);

    const select = periodSelect(page);
    await expect(select.locator('option')).toHaveText([
      MODERN_PERIOD_LABEL,
      HISTORICAL_PERIOD_LABEL,
    ]);
    await expect(select.locator('option')).not.toContainText([
      'manifest label',
      'manifest label',
    ]);

    await select.selectOption('1700');

    await expect(
      page.locator(`path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`),
    ).toHaveCount(1);
    await expect(
      page.locator('path.country-path[data-country-id="FRA"]'),
    ).toHaveCount(0);
    await expect(
      page.getByText(`Showing ${HISTORICAL_PERIOD_LABEL}.`),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Historical borders: Poland, Lithuania, Hungary, the Balkans, Iberia, Scandinavia. Modern borders remain elsewhere.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('listbox', {
        name: `Interactive world map, ${HISTORICAL_PERIOD_LABEL}`,
      }),
    ).toHaveCount(1);
  });

  test('drops out-of-scene selections and keeps continuing ones', async ({
    page,
  }): Promise<void> => {
    await routeHistoricalCatalog(page);
    await waitForApp(page);

    const countrySearch = page.getByRole('searchbox', {
      name: 'Search countries',
    });
    await countrySearch.fill('France');
    await page.getByRole('checkbox', { name: /France Current color/ }).check();
    await countrySearch.fill('Germany');
    await page.getByRole('checkbox', { name: /Germany Current color/ }).check();
    await expect(
      page.locator('[data-selection-live-region="true"]'),
    ).toContainText('2 countries selected.');

    await periodSelect(page).selectOption('1700');
    await expect(
      page.locator(`path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`),
    ).toHaveCount(1);

    // France is not in the 1700 scene: it must leave the selection with the
    // switch, or colouring would write a country the map cannot show.
    await expect(
      page.locator('[data-selection-live-region="true"]'),
    ).toContainText('1 country selected.');
    await expect(
      page.locator('path.country-path[data-country-id="DEU"]'),
    ).toHaveAttribute('aria-selected', 'true');

    await countrySearch.fill('France');
    const franceRow = page.getByRole('checkbox', {
      name: /France Current color/,
    });
    await expect(franceRow).toBeDisabled();
    await expect(franceRow).not.toBeChecked();

    // Colouring now applies to the continuing selection only.
    await page.getByRole('button', { name: 'Apply Red' }).click();
    await expect(
      page.locator('path.country-path[data-country-id="DEU"]'),
    ).toHaveAttribute('fill', '#DC2626');

    await periodSelect(page).selectOption('modern');
    await expect(
      page.locator('path.country-path[data-country-id="FRA"]'),
    ).toHaveCount(1);
    // Returning to Modern does not resurrect the dropped selection.
    await expect(
      page.locator('path.country-path[data-country-id="FRA"]'),
    ).toHaveAttribute('aria-selected', 'false');
    await expect(
      page.locator('path.country-path[data-country-id="FRA"]'),
    ).toHaveAttribute('fill', '#FFFFFF');
  });

  test('keeps the previous scene and the previous option when a period fails', async ({
    page,
  }): Promise<void> => {
    const fixture = createHistoricalFixture();
    await page.route(MANIFEST_URL, async (route): Promise<void> => {
      await route.fulfill({ json: fixture.manifest });
    });
    await page.route(
      `**${HISTORICAL_ASSET_PATH}`,
      async (route): Promise<void> => {
        await route.fulfill({ status: 500, body: 'unavailable' });
      },
    );
    await waitForApp(page);

    await periodSelect(page).selectOption('1700');

    await expect(
      page.getByText(
        `We couldn't load ${HISTORICAL_PERIOD_LABEL}. The previous map period is still shown. Try again.`,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Try Period Again' }),
    ).toBeVisible();
    await expect(periodSelect(page)).toHaveValue('modern');
    await expect(
      page.locator('path.country-path[data-country-id="FRA"]'),
    ).toHaveCount(1);
    await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
      LOGICAL_CORE_COUNT,
    );
  });
});

test.describe('scene crossfade and tooltip context', (): void => {
  test('leaves the incoming scene as the only reachable scene', async ({
    page,
  }): Promise<void> => {
    await page.goto(HISTORY_FIXTURE_URL);
    await expect(
      page.locator('path.country-path[data-country-id="FRA"]'),
    ).toHaveCount(1);

    await periodSelect(page).selectOption('1700');
    await expect(
      page.locator(`path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`),
    ).toHaveCount(1);

    const observations = await page.evaluate(
      (): ReadonlyArray<OutgoingSceneObservation> =>
        window.__historyFixture?.readOutgoingObservations() ?? [],
    );

    expect(observations).toHaveLength(1);
    expect(observations[0]?.pathCount).toBeGreaterThan(0);
    expect(observations[0]?.ariaHidden).toBe('true');
    expect(observations[0]?.pointerEvents).toBe('none');
    expect(observations[0]?.role).toBeNull();
    expect(observations[0]?.countryIdCount).toBe(0);
    expect(observations[0]?.titleCount).toBe(0);
    expect(observations[0]?.focusableCount).toBe(0);

    // Exactly one scene answers to a country identity while the fade runs.
    await expect(
      page.locator(`[data-country-id="${HISTORICAL_ENTITY_ID}"]`),
    ).toHaveCount(1);
    await expect(page.locator('[role="listbox"]')).toHaveCount(1);
    await expect(page.locator('svg.map-canvas')).toHaveCount(1);
    await expect(page.locator('[data-layer="outgoing-scene"]')).toHaveCount(0, {
      timeout: 5_000,
    });
  });

  test('finalizes the selected scene synchronously for export', async ({
    page,
  }): Promise<void> => {
    await page.goto(HISTORY_FIXTURE_URL);
    await expect(
      page.locator('path.country-path[data-country-id="FRA"]'),
    ).toHaveCount(1);

    const finalized = await page.evaluate(async (): Promise<{
      outgoingCount: number;
      opacity: string;
    }> => {
      const select = document.querySelector('select');
      if (select === null) {
        throw new Error('Period select is unavailable.');
      }
      select.value = '1700';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise<void>((resolve): void => {
        requestAnimationFrame((): void => resolve());
      });

      window.__historyFixture?.finalizeSelectedScene();

      const countries = document.querySelector<SVGGElement>(
        '[data-layer="countries"]',
      );
      return {
        outgoingCount: document.querySelectorAll('[data-layer="outgoing-scene"]')
          .length,
        opacity: countries?.style.opacity ?? '',
      };
    });

    expect(finalized.outgoingCount).toBe(0);
    expect(finalized.opacity).toBe('1');
  });

  test('names modern, historical, and fallback boundaries in the tooltip', async ({
    page,
  }): Promise<void> => {
    await page.goto(HISTORY_FIXTURE_URL);

    const tooltip = page.getByRole('tooltip');
    await page.locator('path.country-path[data-country-id="FRA"]').hover();
    await expect(tooltip).toContainText('France');
    await expect(tooltip).toContainText('Current color: #FFFFFF');
    await expect(tooltip).toContainText('Modern boundary');

    await periodSelect(page).selectOption('1700');
    await expect(
      page.locator(`path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`),
    ).toHaveCount(1);

    await page
      .locator(`path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`)
      .hover();
    await expect(tooltip).toContainText('Historical boundary · 1700');

    await page.locator('path.country-path[data-country-id="DEU"]').hover();
    await expect(tooltip).toContainText('Modern fallback · 1700 composition');
  });
});

test.describe('NFR3 warm switch diagnostics', (): void => {
  test('records warm period switches as advisory samples', async ({
    page,
  }): Promise<void> => {
    await routeHistoricalCatalog(page);
    await waitForApp(page);

    const select = periodSelect(page);
    const historicalPath = page.locator(
      `path.country-path[data-country-id="${HISTORICAL_ENTITY_ID}"]`,
    );
    const francePath = page.locator('path.country-path[data-country-id="FRA"]');

    // Prewarm: the first switch pays the network cost and is discarded.
    await select.selectOption('1700');
    await expect(historicalPath).toHaveCount(1);
    await select.selectOption('modern');
    await expect(francePath).toHaveCount(1);

    const samples: number[] = [];
    for (let sample = 0; sample < NFR3_WARM_SAMPLES; sample += 1) {
      // Measured in-page across the real transition — committed activation to
      // incoming painted plus outgoing removed — rather than with harness
      // wall-clock, which would fold in Playwright's polling interval and
      // measure the test runner instead of the product.
      const duration = await page.evaluate(
        async ({ entityId }): Promise<number> => {
          const selectElement =
            document.querySelector<HTMLSelectElement>('#composition-bar-period');
          if (selectElement === null) {
            throw new Error('Period select not found.');
          }

          const isSettled = (): boolean =>
            document.querySelector(
              `path.country-path[data-country-id="${entityId}"]`,
            ) !== null &&
            document.querySelector('[data-layer="outgoing-scene"]') === null;

          const settled = new Promise<number>((resolve): void => {
            const observer = new MutationObserver((): void => {
              if (!isSettled()) {
                return;
              }
              observer.disconnect();
              // Resolve on the frame that paints the settled scene.
              requestAnimationFrame((): void => {
                resolve(performance.now());
              });
            });
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          });

          const start = performance.now();
          selectElement.value = '1700';
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          const end = await settled;
          return end - start;
        },
        { entityId: HISTORICAL_ENTITY_ID },
      );

      await expect(historicalPath).toHaveCount(1);
      await expect(page.locator('[data-layer="outgoing-scene"]')).toHaveCount(0);
      samples.push(duration);

      await select.selectOption('modern');
      await expect(francePath).toHaveCount(1);
      await expect(page.locator('[data-layer="outgoing-scene"]')).toHaveCount(0);
    }

    // Every warm switch must complete, settle, and yield a real positive
    // measurement of the product's own transition.
    expect(samples).toHaveLength(NFR3_WARM_SAMPLES);
    samples.forEach((duration): void => {
      expect(Number.isFinite(duration)).toBe(true);
      expect(duration).toBeGreaterThan(0);
    });

    // NO THRESHOLD IS ASSERTED, and this is deliberately NOT justified by D-63.
    // D-63 is scoped to Phase 1 ("the user explicitly directs that Phase 1 stop
    // gating on millisecond timing") and does not carry into Phase 2 on its own.
    // The samples are recorded as advisory evidence so the owner can set an
    // NFR3 threshold from real numbers. Until they do, no timing value gates
    // this phase — that is an open decision, not a settled one.
    const sorted = [...samples].sort((left, right): number => left - right);
    test.info().annotations.push({
      type: 'nfr3-warm-switch-samples-ms',
      description: samples.map((value): string => value.toFixed(1)).join(', '),
    });
    test.info().annotations.push({
      type: 'nfr3-warm-switch-median-ms',
      description: sorted[Math.floor(sorted.length / 2)].toFixed(1),
    });
  });
});
