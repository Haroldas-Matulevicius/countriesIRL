import { expect, test, type Page } from '@playwright/test';

import { LAST_OPEN_TOOL_KEY, THEME_MODE_KEY } from '../../src/constants/config';
import {
  applyRampRed,
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
    const beforeColoring = await collectTabOrder(page, 7);
    expect(beforeColoring.slice(0, 7)).toEqual([
      'Colors',
      // `04-01` (D4-07): second, immediately after `Colors` (U-4). The order is
      // an ASSUMPTION recorded in the plan, not an owner decision - reversing
      // it is one array move in `constants/tools.ts` and this line.
      'Map style',
      'Countries',
      'Legend',
      'Saved Maps',
      'Export PNG',
      'Switch to dark theme',
    ]);
    expect(beforeColoring).not.toContain('Undo Color Change');

    // Colour a country so Undo becomes enabled, then re-read: the pair takes
    // its spec'd place AFTER the five tools and BEFORE the footer.
    const france = page.locator('path.country-path[data-country-id="FRA"]');
    await france.focus();
    await france.press('Enter');
    await applyRampRed(page);

    const afterColoring = await collectTabOrder(page, 8);
    expect(afterColoring.slice(0, 8)).toEqual([
      'Colors',
      'Map style',
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
    await applyRampRed(page);
    await expect(france).toHaveAttribute('fill', '#DE2D26');

    /*
     * Selection is carried by THREE things, not by colour alone (A6): the
     * machine-readable `aria-pressed`, the check glyph, and the readout. All
     * three are asserted, because the measured minimum separation between
     * neighbouring shades is 1.2944:1 and colour genuinely is not enough.
     */
    await expect(
      page.locator('.ramp-strip__step[data-ramp-step="4"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.ramp-strip__check')).toHaveCount(1);
    await expect(page.locator('.ramp-strip__readout')).toHaveText(
      'Step 4 of 5 \u00b7 #DE2D26',
    );

    await page.getByRole('button', { name: 'Undo Color Change' }).click();
    await expect(france).toHaveAttribute('fill', '#FFFFFF');
    await page.getByRole('button', { name: 'Redo Color Change' }).click();
    await expect(france).toHaveAttribute('fill', '#DE2D26');
  });

  /**
   * **Re-pointed by `04-07`, not deleted.** Its subject - the ten-tile preset
   * grid and its clippable labels - is gone with the redesign, so the old body
   * would have iterated an empty list and passed. The equivalent claim on the
   * surface that replaced it: the family pills WRAP rather than clip
   * (`Purples` is the longest shipped name), and the strip is one contiguous
   * band whose segments tile it exactly with no gaps.
   */
  test('the ramp family pills wrap and the strip is one contiguous band', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Colors');

    const clipped = await page.evaluate((): ReadonlyArray<string> =>
      [...document.querySelectorAll('.panel-pill')]
        .filter(
          (pill): boolean =>
            pill.scrollWidth > Math.ceil(pill.getBoundingClientRect().width),
        )
        .map((pill): string => pill.textContent ?? ''),
    );
    expect(clipped).toStrictEqual([]);

    const band = await page.evaluate((): {
      readonly segments: number;
      readonly gaps: ReadonlyArray<number>;
      readonly borderedSegments: number;
      readonly bandBorder: string;
    } => {
      const strip = document.querySelector('.ramp-strip');
      if (strip === null) {
        throw new Error('The ramp strip is not rendered.');
      }
      const steps = [...strip.querySelectorAll('.ramp-strip__step')];
      const boxes = steps.map((step): DOMRect => step.getBoundingClientRect());

      return {
        segments: steps.length,
        gaps: boxes
          .slice(1)
          .map((box, index): number => box.left - boxes[index].right),
        borderedSegments: steps.filter(
          (step): boolean =>
            globalThis.getComputedStyle(step).borderTopWidth !== '0px',
        ).length,
        bandBorder: globalThis.getComputedStyle(strip).borderTopWidth,
      };
    });

    // The literal 5, never a `.length` read - `RAMP_STEP_COUNT` is derived
    // from `328 / N >= 44` and Phase 4 ships five.
    expect(band.segments).toBe(5);
    band.gaps.forEach((gap): void => {
      expect(Math.abs(gap), 'the strip is one band, so segments do not gap').toBeLessThan(
        0.5,
      );
    });
    // ONE border, on the band. A border per segment is the row of boxes the
    // owner reported about the surface this replaced.
    expect(band.borderedSegments).toBe(0);
    expect(band.bandBorder).not.toBe('0px');
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
    await applyRampRed(page);
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
    expect(fillBefore).toBe('#DE2D26');

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

    /*
     * Every tooltip in the rail, counted rather than sampled: one per tool row
     * (five since `04-01` added `map-style`), one per pinned row, one for
     * Export, one for the theme toggle. A literal, and the same literal drives
     * the shape below - `Array.from({ length: n })` off `await count()` would
     * be green against zero tooltips.
     */
    const expectedTooltipCount = 9;
    const tooltips = page.locator('.tool-rail .rail-tooltip');
    await expect(tooltips).toHaveCount(expectedTooltipCount);
    expect(
      await tooltips.evaluateAll((elements): ReadonlyArray<string | null> =>
        elements.map((element): string | null =>
          element.getAttribute('data-editor-only'),
        ),
      ),
    ).toStrictEqual(
      Array.from({ length: expectedTooltipCount }, (): string => 'true'),
    );

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
