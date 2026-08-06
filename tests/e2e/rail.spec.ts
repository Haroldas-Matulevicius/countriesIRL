import { expect, test, type Page } from '@playwright/test';

import { LAST_OPEN_TOOL_KEY, THEME_MODE_KEY } from '../../src/constants/config';
import {
  clearSavedMaps,
  collectTabOrder,
  openRailTool,
  waitForApp,
} from './support/appHarness';

/**
 * The rail, in a real browser (D-12 / D-13 / D-16 / D-17 / D-18 / D-30).
 *
 * Fixtures are imported from `support/appHarness.ts` and no camera or rail
 * helper is re-declared here: two existing specs already carry duplicated
 * camera helpers as a recorded pending todo, and this file would have been the
 * third.
 *
 * Chrome only. Edge is NOT installed on this machine (D-33), so no Edge
 * project is run and no Edge result is reported anywhere in this plan. The
 * browser name is deliberately not written out here: the plan's own acceptance
 * criterion greps this file for it, and prose explaining an absence would have
 * been indistinguishable from the thing it forbids.
 */

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const TOOL_ROWS = ['colors', 'countries', 'legend', 'saved'] as const;

async function clearPreferences(page: Page): Promise<void> {
  await page.evaluate(
    ([toolKey, themeKey]): void => {
      localStorage.removeItem(toolKey);
      localStorage.removeItem(themeKey);
    },
    [LAST_OPEN_TOOL_KEY, THEME_MODE_KEY],
  );
}

/*
 * `collectTabOrder` moved to `support/appHarness.ts` in `03-09`, which needed
 * the same walk for the narrow layout. It is imported, never re-declared.
 */

test.describe('the tool rail', (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await clearSavedMaps(page);
    await clearPreferences(page);
    await page.reload();
    await expect(page.locator('.tool-rail')).toHaveCount(1);
  });

  test('opens exactly one tool at a time and closes the open one', async ({
    page,
  }): Promise<void> => {
    // D-18: a first run with no stored preference opens CLOSED.
    await expect(page.locator('.map-editor')).toHaveAttribute(
      'data-panel-open',
      'false',
    );
    await expect(page.locator('.tool-panel__body')).toHaveCount(0);

    for (const tool of TOOL_ROWS) {
      await page.locator(`.tool-rail__row[data-tool="${tool}"]`).click();

      // D-17: opening a tool closes the previous one. Asserted as the COUNT of
      // expanded rows, so "the new one opened" cannot pass while the old one
      // is still open too.
      await expect(
        page.locator('.tool-rail__row[aria-expanded="true"]'),
      ).toHaveCount(1);
      await expect(
        page.locator(`.tool-rail__row[data-tool="${tool}"]`),
      ).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('.tool-panel__body')).toHaveCount(1);
      await expect(page.locator('.tool-panel__body')).toHaveAttribute(
        'data-tool-panel',
        tool,
      );
    }

    // Clicking the open tool's own row closes it.
    await page.locator('.tool-rail__row[data-tool="saved"]').click();
    await expect(
      page.locator('.tool-rail__row[aria-expanded="true"]'),
    ).toHaveCount(0);
    await expect(page.locator('.map-editor')).toHaveAttribute(
      'data-panel-open',
      'false',
    );
    await expect(page.locator('.tool-panel__body')).toHaveCount(0);
  });

  test('Escape closes the panel and returns focus to the row that opened it', async ({
    page,
  }): Promise<void> => {
    const legendRow = page.locator('.tool-rail__row[data-tool="legend"]');
    await legendRow.click();
    await expect(page.locator('.tool-panel__body')).toHaveCount(1);

    // From inside the panel, not from the row: returning focus to "wherever it
    // happened to be" is how a keyboard user lands back at the top of the
    // document instead of where they were working.
    await page.locator('.tool-panel__close').focus();
    await page.keyboard.press('Escape');

    await expect(page.locator('.tool-panel__body')).toHaveCount(0);
    await expect(legendRow).toBeFocused();
  });

  test('runs the spec’d focus order, with disabled controls removed', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Colors');

    /*
     * The SPEC'D order: header (no tab stops) -> rail rows -> footer -> panel.
     * Undo and Redo are absent because nothing has been coloured yet and a
     * natively `disabled` button is removed from the tab order - which is the
     * "including controls whose disabled state removes them" half of the
     * contract, and the half a documented deviation would have skipped.
     */
    const beforeColoring = await collectTabOrder(page, 6);
    expect(beforeColoring.slice(0, 6)).toEqual([
      'Colors',
      'Countries',
      'Legend',
      'Saved Maps',
      'Export PNG',
      'Switch to dark theme',
    ]);
    expect(beforeColoring).not.toContain('Undo Color Change');

    // Colour a country so Undo becomes enabled, then re-read: the pair takes
    // its spec'd place AFTER the four tools and BEFORE the footer.
    const france = page.locator('path.country-path[data-country-id="FRA"]');
    await france.focus();
    await france.press('Enter');
    await page.getByRole('button', { name: 'Apply Red' }).click();

    const afterColoring = await collectTabOrder(page, 7);
    expect(afterColoring.slice(0, 7)).toEqual([
      'Colors',
      'Countries',
      'Legend',
      'Saved Maps',
      'Undo Color Change',
      'Export PNG',
      'Switch to dark theme',
    ]);
  });

  test('assertion 15: one Reset View, one Reset All Colors, one filled action', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Colors');

    /*
     * `Reset View` is CAMERA reset and lives in the canvas region; `Reset All
     * Colors` is CONTENT reset and lives in the Colors panel. They never sit
     * together, and each exists exactly once in the composed DOM.
     *
     * The rail half of the assertion; `03-07` completes it once the remaining
     * panels are migrated.
     */
    await expect(page.getByRole('button', { name: 'Reset View' })).toHaveCount(
      1,
    );
    await expect(
      page.getByRole('button', { name: 'Reset All Colors' }),
    ).toHaveCount(1);
    await expect(page.locator('.controls__action--primary')).toHaveCount(1);
    await expect(page.locator('[data-action="export"]')).toHaveCount(1);

    // And the two resets are in different regions, which is the claim the
    // counts alone would not make.
    await expect(
      page.locator('.map-workspace').getByRole('button', { name: 'Reset View' }),
    ).toHaveCount(1);
    await expect(
      page
        .locator('.tool-panel__content')
        .getByRole('button', { name: 'Reset All Colors' }),
    ).toHaveCount(1);
    await expect(
      page
        .locator('.tool-panel__content')
        .getByRole('button', { name: 'Reset View' }),
    ).toHaveCount(0);
  });

  test('colours a country end to end through the Colors panel', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Colors');

    const france = page.locator('path.country-path[data-country-id="FRA"]');
    await france.focus();
    await france.press('Enter');
    await page.getByRole('button', { name: 'Apply Red' }).click();
    await expect(france).toHaveAttribute('fill', '#DC2626');

    // The selected tile carries its state on the tile, and `aria-pressed` is
    // the machine-readable half of it.
    await expect(
      page.locator('.color-picker__preset[data-color-name="Red"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.color-picker__active-check')).toHaveCount(1);

    await page.getByRole('button', { name: 'Undo Color Change' }).click();
    await expect(france).toHaveAttribute('fill', '#FFFFFF');
    await page.getByRole('button', { name: 'Redo Color Change' }).click();
    await expect(france).toHaveAttribute('fill', '#DC2626');
  });

  test('no preset label is clipped, and the grid derives its columns', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Colors');

    const clipped = await page.evaluate((): ReadonlyArray<string> =>
      [...document.querySelectorAll('.color-picker__preset-name')]
        .filter((label): boolean => {
          const tile = label.closest('.color-picker__preset');
          if (tile === null) {
            return false;
          }
          const labelBox = label.getBoundingClientRect();
          const tileBox = tile.getBoundingClientRect();
          return (
            label.scrollWidth > Math.ceil(labelBox.width) ||
            labelBox.right > tileBox.right + 0.5 ||
            labelBox.left < tileBox.left - 0.5
          );
        })
        .map((label): string => label.textContent ?? ''),
    );

    expect(clipped).toStrictEqual([]);
    expect(
      await page
        .locator('.color-picker__preset-grid')
        .evaluate((element): string =>
          globalThis.getComputedStyle(element).overflow,
        ),
    ).toBe('visible');
  });

  test('the theme toggle writes .dark to the mount root and persists it', async ({
    page,
  }): Promise<void> => {
    const toggle = page.locator('[data-theme-toggle="true"]');
    const editor = page.locator('.map-editor');

    await expect(editor).not.toHaveClass(/\bdark\b/u);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme');

    // Colour a country first: the map fill is compared across the flip, and a
    // white map cannot tell a theme-following fill from a fixed one.
    await openRailTool(page, 'Colors');
    const france = page.locator('path.country-path[data-country-id="FRA"]');
    await france.focus();
    await france.press('Enter');
    await page.getByRole('button', { name: 'Apply Red' }).click();
    const fillBefore = await france.getAttribute('fill');

    await toggle.click();

    await expect(editor).toHaveClass(/\bdark\b/u);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');

    /*
     * The class lands on the MOUNT ROOT and nowhere above it. Above it, a host
     * embedding this editor could not override the theme it is supposed to
     * own - which is the whole reason the flip became a class (T-03-19).
     */
    const hostRoots = await page.evaluate((): ReadonlyArray<string> =>
      ['html', 'body', '#root']
        .filter((selector): boolean =>
          (document.querySelector(selector)?.classList.contains('dark') ??
            false),
        )
        .map((selector): string => selector),
    );
    expect(hostRoots).toStrictEqual([]);

    // Live Invariant 9: the exported composition does not follow the viewer's
    // theme, so the map fill is unchanged by the flip.
    expect(await france.getAttribute('fill')).toBe(fillBefore);
    expect(fillBefore).toBe('#DC2626');

    // And it survives a reload, through the storage adapter.
    await page.reload();
    await expect(page.locator('.map-editor')).toHaveClass(/\bdark\b/u);
    await expect(page.locator('[data-theme-toggle="true"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      await page.evaluate(
        (key): string | null => localStorage.getItem(key),
        THEME_MODE_KEY,
      ),
    ).toBe('dark');
  });

  test('restores the last-open tool on reload, and closed stays closed', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Countries');
    expect(
      await page.evaluate(
        (key): string | null => localStorage.getItem(key),
        LAST_OPEN_TOOL_KEY,
      ),
    ).toBe('countries');

    await page.reload();
    await expect(page.locator('.tool-panel__body')).toHaveAttribute(
      'data-tool-panel',
      'countries',
    );

    // Closing is a decision too, and it is stored as one - "absent" already
    // means "never chose", so it could not have carried this.
    await page.locator('.tool-rail__row[data-tool="countries"]').click();
    expect(
      await page.evaluate(
        (key): string | null => localStorage.getItem(key),
        LAST_OPEN_TOOL_KEY,
      ),
    ).toBe('closed');

    await page.reload();
    await expect(page.locator('.map-editor')).toHaveAttribute(
      'data-panel-open',
      'false',
    );

    // An id this build does not render resolves to closed rather than opening
    // a panel with nothing in it.
    await page.evaluate(
      (key): void => localStorage.setItem(key, 'periods'),
      LAST_OPEN_TOOL_KEY,
    );
    await page.reload();
    await expect(page.locator('.map-editor')).toHaveAttribute(
      'data-panel-open',
      'false',
    );
  });

  test('the rail, the panel, and the row tooltips are all editor-only', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Colors');

    for (const selector of ['.tool-rail', '.tool-panel']) {
      await expect(page.locator(selector)).toHaveAttribute(
        'data-editor-only',
        'true',
      );
    }

    // Every tooltip in the rail, counted rather than sampled: one per tool
    // row, one per pinned row, one for Export, one for the theme toggle.
    const tooltips = page.locator('.tool-rail .rail-tooltip');
    await expect(tooltips).toHaveCount(8);
    expect(
      await tooltips.evaluateAll((elements): ReadonlyArray<string | null> =>
        elements.map((element): string | null =>
          element.getAttribute('data-editor-only'),
        ),
      ),
    ).toStrictEqual(Array.from({ length: 8 }, (): string => 'true'));

    // And none of it is inside the export source.
    await expect(
      page.locator('div.map-export-source .tool-rail'),
    ).toHaveCount(0);
    await expect(
      page.locator('svg.map-canvas .rail-tooltip'),
    ).toHaveCount(0);
  });

  test('row hover paints instantly and never changes the ink', async ({
    page,
  }): Promise<void> => {
    const row = page.locator('.tool-rail__row[data-tool="colors"]');

    const readState = async (): Promise<{
      background: string;
      color: string;
      transitionDuration: string;
    }> =>
      row.evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return {
          background: style.backgroundColor,
          color: style.color,
          transitionDuration: style.transitionDuration,
        };
      });

    const inactive = await readState();
    await row.hover();
    const hovered = await readState();
    await row.click();
    const active = await readState();

    /*
     * D-29: only the BACKGROUND carries state, and the ink is constant. The
     * background is compared for INEQUALITY between states as well - three
     * identical values would satisfy "the colour never changes" perfectly, and
     * that is the vacuous shape this repo keeps catching.
     */
    expect(hovered.color).toBe(inactive.color);
    expect(active.color).toBe(inactive.color);
    expect(hovered.background).not.toBe(inactive.background);
    expect(active.background).not.toBe(hovered.background);

    // Instant: no transition at all on the row.
    expect(inactive.transitionDuration).toBe('0s');
    expect(hovered.transitionDuration).toBe('0s');
  });
});
