import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Locator,
  type Page,
} from '@playwright/test';

import {
  clearSavedMaps,
  expectOneCameraOwner,
  stampCameraOwnerSentinel,
  waitForApp,
} from './support/appHarness';

/**
 * The browser half of the Phase 2 UI contract. The static CSS contract test
 * proves the stylesheet says the right thing; this file proves the browser does
 * the right thing, which is a different claim - a correct rule that never
 * matches, or is overridden three files later, passes the static contract.
 */

const DOWNLOAD_ROOT = resolve('.artifacts/playwright/downloads');
const EXPORT_SIZE = 1080;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
/** 900-1199: the compact two-column lower workspace. */
const COMPACT_TWO_COLUMN_VIEWPORT = { width: 1024, height: 900 };
/** 768-899: the compact single-column workspace. */
const COMPACT_SINGLE_COLUMN_VIEWPORT = { width: 800, height: 900 };
const MOBILE_VIEWPORT = { width: 360, height: 740 };
/**
 * 200% browser zoom halves the CSS-pixel viewport. Playwright cannot drive the
 * browser's own zoom control, so this is the CSS-pixel *equivalent* of 200% on a
 * 1280x800 window - it exercises the same layout math, and it is deliberately
 * not labelled as physical zoom evidence. `02-28` still owns the physical cell.
 */
const ZOOM_200_EQUIVALENT_VIEWPORT = { width: 640, height: 400 };

const STANDARD_TARGET_HEIGHT = 48;
const COMPACT_TARGET_SIZE = 44;
const ICON_ONLY_LABELS = new Set([
  'Zoom In',
  'Zoom Out',
  'Move Map',
  'Pan Up',
  'Pan Right',
  'Pan Down',
  'Pan Left',
]);

interface ElementBox {
  readonly label: string;
  readonly right: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

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
 * The landmark census. A silently deleted landmark was a real defect in this
 * phase, and it fails nothing else: every control still renders and works.
 */
async function expectLandmarks(
  page: Page,
  layout: 'desktop' | 'compact',
): Promise<void> {
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('complementary')).toHaveCount(
    layout === 'desktop' ? 1 : 0,
  );
  await expect(page.getByRole('main', { name: 'Map creator workspace' })).toHaveCount(
    1,
  );
}

/**
 * Measures every element that must fit the viewport.
 *
 * Deliberately NOT `scrollWidth <= clientWidth`: `body` sets
 * `overflow-x: hidden`, so the page-level assertion is vacuously true no matter
 * how far a control overflows. Measuring the elements themselves is the only
 * version of this check that can fail.
 */
async function findHorizontalOverflow(page: Page): Promise<ElementBox[]> {
  return page.evaluate((): ElementBox[] => {
    const limit = document.documentElement.clientWidth;
    const selectors = [
      '.app > header',
      'main.workspace',
      '.workspace__actions',
      '.workspace__map',
      '.workspace__control-column',
      '.workspace__selection-color',
      '.workspace__country-list',
      '.workspace__legend',
      '.map-workspace__square',
      '.controls__action',
      '.composition-bar__row',
    ];

    return selectors
      .flatMap((selector): Element[] => [...document.querySelectorAll(selector)])
      .map((element): ElementBox => {
        const rect = element.getBoundingClientRect();
        return {
          label: `${element.tagName.toLowerCase()}.${element.className}`,
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(
        (box): boolean =>
          box.width > 0 && (box.right > limit + 1 || box.left < -1),
      );
  });
}

/**
 * Walks the sequential focus order from the current starting point.
 *
 * The caller must move the starting point first (click the product title):
 * blurring leaves it wherever focus last was, so `Tab` resumes from the middle
 * of the document and "proves" an order that begins at an arbitrary control.
 */
async function collectTabOrder(
  page: Page,
  steps: number,
): Promise<ReadonlyArray<string>> {
  const order: string[] = [];
  for (let step = 0; step < steps; step += 1) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate((): string => {
        const active = document.activeElement;
        if (active === null) {
          return '';
        }
        return (
          active.getAttribute('aria-label') ??
          active.textContent?.trim().slice(0, 40) ??
          ''
        );
      }),
    );
  }
  return order;
}

function positionIn(
  order: ReadonlyArray<string>,
): (label: string) => number {
  return (label: string): number => {
    const index = order.indexOf(label);
    expect(index, `"${label}" is not in the tab order: ${order.join(' > ')}`)
      .toBeGreaterThanOrEqual(0);
    return index;
  };
}

async function measureTargets(page: Page): Promise<ElementBox[]> {
  return page.evaluate((): ElementBox[] =>
    [...document.querySelectorAll('button')]
      .filter((button): boolean => button.getClientRects().length > 0)
      .map((button): ElementBox => {
        const rect = button.getBoundingClientRect();
        return {
          label:
            button.getAttribute('aria-label') ??
            button.textContent?.trim() ??
            '',
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }),
  );
}

test.describe('responsive world workspace', (): void => {
  test('the desktop workspace is map-first with one camera owner and exact landmarks', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await clearSavedMaps(page);
    await stampCameraOwnerSentinel(page);

    await expectLayout(page, 'desktop');
    await expectLandmarks(page, 'desktop');
    await expectOneCameraOwner(page);

    const square = await page
      .locator('.map-workspace__square')
      .boundingBox();
    const inspector = await page
      .locator('.workspace__control-column')
      .boundingBox();
    if (square === null || inspector === null) {
      throw new Error('The workspace columns are not laid out.');
    }

    // UI-SPEC 3: the white square is the dominant element, and it is square.
    expect(square.width).toBeCloseTo(square.height, 0);
    expect(square.width).toBeGreaterThan(inspector.width);
    expect(square.width * square.height).toBeGreaterThan(
      inspector.width * inspector.height,
    );
    // UI-SPEC 7.1: DOM/focus order is map column first, inspector second.
    expect(square.x).toBeLessThan(inspector.x);
    // UI-SPEC 7.1: the inspector column is exactly 376px.
    expect(Math.round(inspector.width)).toBe(376);

    // UI-SPEC 6: one shell, not a stack of cards - the shell owns the only
    // border-and-shadow in the column.
    const shadowedSections = await page.evaluate((): number =>
      [
        ...document.querySelectorAll(
          '.workspace__control-column .controls, .workspace__control-column .selection-panel, .workspace__control-column .color-picker, .workspace__control-column .country-list',
        ),
      ].filter((element): boolean => {
        const style = getComputedStyle(element);
        return style.boxShadow !== 'none' || style.borderTopWidth !== '0px';
      }).length,
    );
    expect(shadowedSections).toBe(0);
  });

  test('the app bar stays pinned while the responsive workspace scrolls', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);

    const header = page.locator('.app > header');
    const before = await header.boundingBox();
    await page.mouse.wheel(0, 600);
    await expect
      .poll(async (): Promise<number> => page.evaluate((): number => window.scrollY))
      .toBeGreaterThan(0);
    const after = await header.boundingBox();

    if (before === null || after === null) {
      throw new Error('The app bar is not rendered.');
    }
    expect(Math.round(before.y)).toBe(0);
    expect(Math.round(after.y)).toBe(0);
  });

  test('the compact sub-layouts respond at 1024 and 768 without a second DOM', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await stampCameraOwnerSentinel(page);
    await expectOneCameraOwner(page);

    await page.setViewportSize(COMPACT_TWO_COLUMN_VIEWPORT);
    await expectLayout(page, 'compact');
    await expectLandmarks(page, 'compact');
    // The same DOM node moved; it was not remounted as a second camera owner.
    await expectOneCameraOwner(page);

    const twoColumn = await page.evaluate((): ReadonlyArray<number> =>
      [
        '.workspace__actions',
        '.workspace__map',
        '.workspace__selection-color',
        '.workspace__country-list',
        '.workspace__legend',
      ].map((selector): number =>
        Math.round(
          document.querySelector(selector)?.getBoundingClientRect().width ?? -1,
        ),
      ),
    );
    const [actions, map, selection, countries, legend] = twoColumn;
    // UI-SPEC 7.2: actions, map, and legend span both columns; selection/color
    // and the country browser share a row at equal width.
    expect(actions).toBe(map);
    expect(legend).toBe(map);
    expect(selection).toBe(countries);
    expect(selection).toBeLessThan(map);

    await page.setViewportSize(COMPACT_SINGLE_COLUMN_VIEWPORT);
    await expectLayout(page, 'compact');
    await expectLandmarks(page, 'compact');
    await expectOneCameraOwner(page);

    const singleColumn = await page.evaluate((): ReadonlyArray<number> =>
      ['.workspace__map', '.workspace__selection-color'].map(
        (selector): number =>
          Math.round(
            document.querySelector(selector)?.getBoundingClientRect().width ??
              -1,
          ),
      ),
    );
    // UI-SPEC 7.3: one page column - every section is the same width.
    expect(singleColumn[0]).toBe(singleColumn[1]);
  });

  test('the complete UI contains at 360px with no overflow and full-size targets', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForApp(page);
    await expectLayout(page, 'compact');
    await expectLandmarks(page, 'compact');

    expect(await findHorizontalOverflow(page)).toStrictEqual([]);

    const square = await page.locator('.map-workspace__square').boundingBox();
    if (square === null) {
      throw new Error('The composition square is not rendered.');
    }
    expect(square.width).toBeCloseTo(square.height, 0);
    expect(square.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);

    const undersized = (await measureTargets(page)).filter(
      (target): boolean =>
        ICON_ONLY_LABELS.has(target.label)
          ? target.height < COMPACT_TARGET_SIZE ||
            target.width < COMPACT_TARGET_SIZE
          : target.height < STANDARD_TARGET_HEIGHT,
    );
    expect(undersized).toStrictEqual([]);

    // UI-SPEC 8: the compact strip is three rows, and Export spans the width.
    const exportButton = await page
      .getByRole('button', { name: 'Export PNG' })
      .boundingBox();
    const undoButton = await page
      .getByRole('button', { name: 'Undo Color Change' })
      .boundingBox();
    if (exportButton === null || undoButton === null) {
      throw new Error('The action strip is not rendered.');
    }
    expect(exportButton.width).toBeGreaterThan(undoButton.width);
    expect(exportButton.y).toBeGreaterThan(undoButton.y);
  });

  test('core controls stay usable at the 200% zoom equivalent viewport', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(ZOOM_200_EQUIVALENT_VIEWPORT);
    await waitForApp(page);
    await expectLayout(page, 'compact');
    await expectLandmarks(page, 'compact');

    expect(await findHorizontalOverflow(page)).toStrictEqual([]);

    // UI-SPEC 20: the map may scale down; typography does not.
    const labelFontSize = await page
      .getByRole('button', { name: 'Undo Color Change' })
      .evaluate((element): string => getComputedStyle(element).fontSize);
    expect(labelFontSize).toBe('14px');

    for (const name of [
      'Undo Color Change',
      'Redo Color Change',
      'Save or Load Maps',
      'Reset All Colors',
      'Export PNG',
      'Reset View',
    ]) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
  });

  test('the map navigation cluster sits below the square outside the export source', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);

    /*
     * UI-SPEC 10: editor-only camera chrome in the map column, below the square.
     *
     * It used to overlay the square's top-left corner, where it rendered on top
     * of a `top-left` legend - the default legend position - hiding the first
     * entry's swatch. That collision has no fix on the legend side: the cluster
     * is sized in screen pixels while the legend is positioned in 1080-unit
     * canvas space, so the cluster's canvas-space footprint changes with the
     * square's width (about 173 units at a 934px square, about 270 at 600px).
     * No fixed rectangle in the export's coordinate system can reserve room for
     * it, so the chrome moved off the square instead.
     */
    await expect(page.locator('.map-workspace > .map-navigation')).toHaveCount(
      1,
    );
    await expect(
      page.locator('.map-workspace__square .map-navigation'),
    ).toHaveCount(0);
    /*
     * The export clones `svg.map-canvas`, so this is the assertion that keeps
     * chrome out of every PNG. `data-editor-only` would strip the cluster from
     * the clone, but only if it were in the clone at all - placement is the
     * primary guard and the attribute is the second one. This is the mirror of
     * the legend containment assertion: the legend must be inside that SVG, the
     * overlay must be outside it.
     */
    await expect(page.locator('.map-export-source .map-navigation')).toHaveCount(
      0,
    );
    await expect(page.locator('svg.map-canvas > [data-layer="legend"]')).toHaveCount(
      1,
    );

    const square = await page.locator('.map-workspace__square').boundingBox();
    const cluster = await page
      .locator('.map-navigation__cluster')
      .boundingBox();
    if (square === null || cluster === null) {
      throw new Error('The navigation cluster is not composed in the map column.');
    }
    // Below the square, aligned to its left edge - not over any part of it.
    expect(cluster.y).toBeGreaterThanOrEqual(square.y + square.height);
    expect(cluster.x).toBeGreaterThanOrEqual(square.x);
    expect(cluster.x + cluster.width).toBeLessThanOrEqual(
      square.x + square.width + 1,
    );
  });

  /**
   * The collision this layout exists to prevent, measured rather than assumed.
   * `Top left` is the default legend position, so the overlay and the legend
   * collided for every creator who added a colour, and no existing test noticed:
   * both elements were present, visible, and correctly placed by their own
   * rules.
   */
  test('the navigation cluster never overlaps the legend at any legend position', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);

    await page
      .getByRole('checkbox', { name: /^France Current color/ })
      .check();
    await page.getByRole('button', { name: 'Apply Red' }).click();

    await page.getByRole('button', { name: /^Legend/ }).click();

    for (const corner of ['Top left', 'Top right', 'Bottom left', 'Bottom right']) {
      await page.getByRole('radio', { name: corner }).check();

      const overlap = await page.evaluate((): boolean => {
        const cluster = document.querySelector('.map-navigation__cluster');
        const legend = document.querySelector(
          'svg.map-canvas > [data-layer="legend"]',
        );
        if (cluster === null || legend === null) {
          throw new Error('The cluster and the legend must both be rendered.');
        }
        const a = cluster.getBoundingClientRect();
        const b = legend.getBoundingClientRect();
        return (
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom
        );
      });

      expect(overlap, `the cluster overlaps the legend at "${corner}"`).toBe(
        false,
      );
    }
  });

  /**
   * The 376px inspector clipped `Magenta` at its tile edge and clipped both bulk
   * actions to their first letter, and the column grew a horizontal scrollbar.
   * Presence assertions cannot see any of that - every control was rendered and
   * visible. Measure the content box against the container instead.
   */
  test('no inspector control is clipped by its container', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);

    const clipped = await page.evaluate((): ReadonlyArray<string> => {
      const failures: string[] = [];

      const inspector = document.querySelector('.workspace__control-column');
      if (inspector === null) {
        throw new Error('The inspector is not composed.');
      }
      if (inspector.scrollWidth > inspector.clientWidth) {
        failures.push(
          `inspector scrolls horizontally: ${inspector.scrollWidth} > ${inspector.clientWidth}`,
        );
      }

      document
        .querySelectorAll('.color-picker__preset-name')
        .forEach((label): void => {
          const tile = label.closest('.color-picker__preset');
          if (tile === null) {
            return;
          }
          const labelBox = label.getBoundingClientRect();
          const tileBox = tile.getBoundingClientRect();
          if (
            label.scrollWidth > Math.ceil(labelBox.width) ||
            labelBox.right > tileBox.right + 0.5 ||
            labelBox.left < tileBox.left - 0.5
          ) {
            failures.push(`preset label clipped: ${label.textContent ?? ''}`);
          }
        });

      inspector.querySelectorAll('button').forEach((button): void => {
        if (button.scrollWidth > Math.ceil(button.clientWidth)) {
          failures.push(
            `action clipped: ${button.textContent?.trim() ?? ''}`,
          );
        }
      });

      return failures;
    });

    expect(clipped).toStrictEqual([]);
  });

  test('the desktop app bar carries the global actions in the declared order', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await expectLayout(page, 'desktop');
    await expectLandmarks(page, 'desktop');

    // UI-SPEC 8: Undo, Redo, Save or Load Maps, Export PNG - on the bar, in
    // that order, and nowhere else in the composed DOM.
    const barActions = page.locator('.app > header [data-action]');
    expect(
      await barActions.evaluateAll((elements): ReadonlyArray<string> =>
        elements.map((element): string =>
          element.getAttribute('data-action') ?? '',
        ),
      ),
    ).toStrictEqual(['undo', 'redo', 'save-load', 'export']);
    await expect(page.locator('[data-action="export"]')).toHaveCount(1);
    await expect(page.locator('.workspace__actions')).toHaveCount(0);

    // UI-SPEC 11: content reset stays in the selection/color section, never on
    // the bar and never beside Reset View.
    await expect(
      page.locator('.workspace__selection-color [data-action="reset-colors"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-action="reset-colors"]')).toHaveCount(1);
    await expect(
      page.locator('.app > header [data-action="reset-colors"]'),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reset View' })).toHaveCount(1);

    expect(await findHorizontalOverflow(page)).toStrictEqual([]);

    const undersized = (await measureTargets(page)).filter(
      (target): boolean =>
        ICON_ONLY_LABELS.has(target.label)
          ? target.height < COMPACT_TARGET_SIZE ||
            target.width < COMPACT_TARGET_SIZE
          : target.height < STANDARD_TARGET_HEIGHT,
    );
    expect(undersized).toStrictEqual([]);
  });

  test('the desktop focus order runs bar, composition bar, map, navigation, inspector', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await page.locator('.app > header h1').click();

    const order = await collectTabOrder(page, 32);
    const at = positionIn(order);

    /*
     * UI-SPEC 20, desktop: app/global actions, map composition bar, map
     * countries, map navigation, inspector controls.
     *
     * Undo, Redo, and Reset All Colors are absent because they are natively
     * disabled with no color history yet.
     */
    expect(order[0]).toBe('Save or Load Maps');
    expect(at('Save or Load Maps')).toBeLessThan(at('Export PNG'));
    expect(at('Export PNG')).toBeLessThan(at('Show Help'));
    expect(at('Show Help')).toBeLessThan(at('Reset View'));
    expect(at('Reset View')).toBeLessThan(at('Zoom In'));
    expect(at('Zoom In')).toBeLessThan(at('Move Map'));

    const country = order.findIndex((label): boolean =>
      label.startsWith('Afghanistan, current color'),
    );
    expect(country, `no country in the tab order: ${order.join(' > ')}`)
      .toBeGreaterThanOrEqual(0);
    // The map comes before its navigation overlay, and both come before the
    // inspector - the overlay is part of the map column, not the inspector.
    expect(at('Reset View')).toBeLessThan(country);
    expect(country).toBeLessThan(at('Zoom In'));
    expect(at('Move Map')).toBeLessThan(at('Search countries'));
  });

  test('the responsive focus order follows the declared workflow', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForApp(page);

    /*
     * `waitForApp` dismisses onboarding, which parks focus on the map. Blurring
     * is not enough - the sequential navigation starting point stays where
     * focus was, so tabbing would begin halfway down the order and "prove" a
     * sequence starting wherever focus happened to land. Clicking the product
     * title moves the starting point to the top of the document.
     */
    await page.locator('.app > header h1').click();

    const order = await collectTabOrder(page, 32);
    const positionOf = positionIn(order);

    /*
     * UI-SPEC 20, compact/mobile: action strip, composition bar, map, map
     * navigation, selection/color, countries/Locate, legend.
     *
     * This asserts the SPEC'd order, not the order that happens to exist. Until
     * `MapNavigation` became an overlay on the square it rendered inside
     * `workspace__actions`, which put the camera cluster ahead of the
     * composition bar and the map; this file previously named that deviation
     * instead of failing on it.
     *
     * Undo, Redo, and Reset All Colors are absent because they are natively
     * disabled with no color history yet (UI-SPEC 8: disabled states are
     * truthful and native, not `aria-disabled` on a reachable control).
     */
    expect(order[0]).toBe('Show Help');
    ['Undo Color Change', 'Redo Color Change', 'Reset All Colors'].forEach(
      (label): void => {
        expect(order).not.toContain(label);
      },
    );

    const saveLoad = positionOf('Save or Load Maps');
    const exportPng = positionOf('Export PNG');
    const resetView = positionOf('Reset View');
    const zoomIn = positionOf('Zoom In');
    const moveMap = positionOf('Move Map');
    const country = order.findIndex((label): boolean =>
      label.startsWith('Afghanistan, current color'),
    );
    const countrySearch = positionOf('Search countries');

    expect(country, `no country in the tab order: ${order.join(' > ')}`)
      .toBeGreaterThanOrEqual(0);
    expect(saveLoad).toBeLessThan(exportPng);
    expect(exportPng).toBeLessThan(resetView);
    expect(resetView).toBeLessThan(country);
    // The map navigation follows the map and precedes the inspector.
    expect(country).toBeLessThan(zoomIn);
    expect(zoomIn).toBeLessThan(moveMap);
    expect(moveMap).toBeLessThan(countrySearch);
    // Zoom Out is natively disabled at the whole-world fit, so it is correctly
    // absent from the sequence rather than a reachable no-op.
    expect(order).not.toContain('Zoom Out');
  });

  test('every disabled action in the responsive strip is natively disabled', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForApp(page);

    // A control that spoofs its state with `aria-disabled` stays reachable and
    // clickable (T-02-53); the tab-order assertion above depends on this.
    const spoofed = await page.evaluate((): ReadonlyArray<string> =>
      [...document.querySelectorAll('button[aria-disabled]')].map(
        (button): string => button.textContent?.trim() ?? '',
      ),
    );
    expect(spoofed).toStrictEqual([]);

    for (const name of ['Undo Color Change', 'Redo Color Change', 'Reset All Colors']) {
      await expect(page.getByRole('button', { name })).toBeDisabled();
    }
  });
});

test.describe('preference emulation', (): void => {
  test('dark preference restyles chrome and leaves the composition square white', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ colorScheme: 'light' });
    await waitForApp(page);

    const probe = async (): Promise<Record<string, string>> =>
      page.evaluate((): Record<string, string> => {
        const square = document.querySelector('.map-workspace__square');
        const canvas = document.querySelector('svg.map-canvas');
        const border = document.querySelector(
          'path.country-path[data-country-id="FRA"]',
        );
        if (square === null || canvas === null || border === null) {
          throw new Error('The composition square is not rendered.');
        }
        return {
          page: getComputedStyle(document.body).backgroundColor,
          square: getComputedStyle(square).backgroundColor,
          canvas: getComputedStyle(canvas).backgroundColor,
          border: getComputedStyle(border).stroke,
        };
      });

    /*
     * Country paths carry a 150ms stroke transition, so an immediate read after
     * a preference flip samples a colour that is on its way somewhere. Poll to a
     * settled value instead of asserting a frame that happens to be in flight.
     */
    const readSurfaces = async (): Promise<Record<string, string>> => {
      let previous = await probe();
      await expect
        .poll(async (): Promise<boolean> => {
          const current = await probe();
          const isSettled =
            JSON.stringify(current) === JSON.stringify(previous);
          previous = current;
          return isSettled;
        })
        .toBe(true);
      return previous;
    };

    const light = await readSurfaces();
    await page.emulateMedia({ colorScheme: 'dark' });
    const dark = await readSurfaces();

    // Chrome follows the preference...
    expect(dark.page).not.toBe(light.page);
    // ...and the exportable composition does not.
    expect(dark.square).toBe(light.square);
    expect(dark.square).toBe('rgb(255, 255, 255)');
    expect(dark.canvas).toBe(light.canvas);
    expect(dark.border).toBe(light.border);
  });

  test('reduced-motion preference removes every authored transition', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitForApp(page);

    const durations = await page.evaluate((): ReadonlyArray<string> =>
      ['path.country-path', '.controls__action', '.country-list__label']
        .map((selector): Element | null => document.querySelector(selector))
        .filter((element): element is Element => element !== null)
        .map((element): string => getComputedStyle(element).transitionDuration),
    );

    expect(durations.length).toBeGreaterThan(0);
    durations.forEach((duration): void => {
      expect(duration).toBe('0s');
    });

    /*
     * The scene crossfade and the camera transition are d3 transitions, not CSS
     * ones, so the loop above cannot see them. They read `--motion-scene` and
     * `--motion-duration-base` off this element, which is the only reason the
     * preference reaches them at all - previously the crossfade honoured it
     * through a separate JS branch and the camera ignored it entirely.
     *
     * `03-04` absorbed `--motion-camera` into `--motion-duration-base` and
     * `--easing-camera` into `--motion-ease-out`, byte-identically, and deleted
     * the old names. Only the token names moved here; the values asserted are
     * the same bytes, which is what makes this a rename rather than a retime.
     */
    const motion = await page.evaluate((): Record<string, string> => {
      const canvas = document.querySelector('svg.map-canvas');
      if (canvas === null) {
        throw new Error('The map canvas is not rendered.');
      }
      const style = getComputedStyle(canvas);
      return {
        scene: style.getPropertyValue('--motion-scene').trim(),
        camera: style.getPropertyValue('--motion-duration-base').trim(),
      };
    });

    expect(motion.scene).toBe('0ms');
    expect(motion.camera).toBe('0ms');
  });

  test('the map reads the SPEC motion tokens when motion is not reduced', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await waitForApp(page);

    // The counterpart of the assertion above: without it, "0ms under reduced
    // motion" would also pass if the tokens were 0ms unconditionally.
    const motion = await page.evaluate((): Record<string, string> => {
      const canvas = document.querySelector('svg.map-canvas');
      if (canvas === null) {
        throw new Error('The map canvas is not rendered.');
      }
      const style = getComputedStyle(canvas);
      return {
        scene: style.getPropertyValue('--motion-scene').trim(),
        camera: style.getPropertyValue('--motion-duration-base').trim(),
        easing: style.getPropertyValue('--motion-ease-out').trim(),
      };
    });

    expect(motion.scene).toBe('160ms');
    expect(motion.camera).toBe('240ms');
    expect(motion.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  });

  test('increased-contrast preference strengthens boundaries and focus rings', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ contrast: 'more' });
    await waitForApp(page);

    const widths = await page.evaluate((): Record<string, string> => {
      const root = getComputedStyle(document.documentElement);
      return {
        border: root.getPropertyValue('--border-width').trim(),
        focus: root.getPropertyValue('--focus-width').trim(),
        square: getComputedStyle(
          document.querySelector('.map-workspace__square') as Element,
        ).borderTopWidth,
      };
    });

    expect(widths.border).toBe('2px');
    expect(widths.focus).toBe('3px');
    expect(widths.square).toBe('2px');
  });

  test('forced-colors preference drops every glass surface to opaque', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ forcedColors: 'active' });
    await waitForApp(page);

    const backdrops = await page.evaluate((): ReadonlyArray<string> =>
      ['.app > header', '.workspace__control-column']
        .map((selector): Element | null => document.querySelector(selector))
        .filter((element): element is Element => element !== null)
        .map((element): string => {
          const style = getComputedStyle(element);
          return style.backdropFilter === '' ? 'none' : style.backdropFilter;
        }),
    );

    expect(backdrops.length).toBe(2);
    backdrops.forEach((backdrop): void => {
      expect(backdrop).toMatch(/^(?:none|blur\(0(?:px)?\))$/u);
    });
  });

  /*
   * `prefers-reduced-transparency` has no Playwright emulation. Its fallback is
   * asserted statically in the CSS contract test and belongs to the
   * physical acceptance matrix in `02-28`. It is deliberately not simulated here
   * as if it were browser evidence.
   */
});

interface PngProbe {
  readonly width: number;
  readonly height: number;
  readonly samples: ReadonlyArray<ReadonlyArray<number>>;
  /**
   * Cross-context equality alone is satisfied by three identical blank squares.
   * These two say the export has content at all, independent of where the 8x8
   * grid happens to land: a full-image count of pixels that are not the white
   * frame, and a count of the exact fill the test applied.
   */
  readonly nonWhitePixels: number;
  readonly appliedRedPixels: number;
}

/** `Apply Red` in the palette, and therefore what must reach the PNG. */
const APPLIED_RED: readonly [number, number, number] = [0xdc, 0x26, 0x26];

/**
 * The map does not fill the square edge to edge, but it is never a hairline
 * either. Well under a percent of the frame means the composition did not
 * rasterize.
 */
const MIN_NON_WHITE_PIXELS = 10_000;
/** France at the whole-world fit is small, but it is not a dozen pixels. */
const MIN_APPLIED_RED_PIXELS = 200;

async function probeExportedPng(
  browser: Browser,
  options: BrowserContextOptions,
): Promise<PngProbe> {
  const context = await browser.newContext({
    ...options,
    viewport: DESKTOP_VIEWPORT,
    acceptDownloads: true,
  });

  try {
    const page = await context.newPage();
    await waitForApp(page);
    await clearSavedMaps(page);

    const france = page.locator('path.country-path[data-country-id="FRA"]');
    await france.focus();
    await france.press('Enter');
    await page.getByRole('button', { name: 'Apply Red' }).click();
    await expect(page.locator('[data-layer="legend"] text')).toHaveText(
      '#DC2626',
    );

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PNG' }).click();
    const download = await downloadPromise;
    const target = resolve(
      DOWNLOAD_ROOT,
      `responsive-${download.suggestedFilename()}`,
    );
    await download.saveAs(target);
    const bytes = await readFile(target);

    return page.evaluate(async ({ base64, red }): Promise<PngProbe> => {
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        buffer[index] = binary.charCodeAt(index);
      }
      const bitmap = await createImageBitmap(
        new Blob([buffer], { type: 'image/png' }),
      );
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const rendering = canvas.getContext('2d');
      if (rendering === null) {
        throw new Error('2D context is unavailable for PNG inspection.');
      }
      rendering.drawImage(bitmap, 0, 0);

      const step = Math.floor(bitmap.width / 8);
      const samples: number[][] = [];
      for (let row = 0; row < 8; row += 1) {
        for (let column = 0; column < 8; column += 1) {
          samples.push([
            ...rendering.getImageData(column * step, row * step, 1, 1).data,
          ]);
        }
      }

      const all = rendering.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let nonWhitePixels = 0;
      let appliedRedPixels = 0;
      for (let offset = 0; offset < all.length; offset += 4) {
        const [pixelRed, pixelGreen, pixelBlue] = [
          all[offset],
          all[offset + 1],
          all[offset + 2],
        ];
        if (pixelRed !== 255 || pixelGreen !== 255 || pixelBlue !== 255) {
          nonWhitePixels += 1;
        }
        if (
          pixelRed === red[0] &&
          pixelGreen === red[1] &&
          pixelBlue === red[2]
        ) {
          appliedRedPixels += 1;
        }
      }

      return {
        width: bitmap.width,
        height: bitmap.height,
        samples,
        nonWhitePixels,
        appliedRedPixels,
      };
    }, { base64: bytes.toString('base64'), red: [...APPLIED_RED] });
  } finally {
    await context.close();
  }
}

test.describe('preference-independent export', (): void => {
  test('the PNG is identical across theme, forced colors, and device pixel ratio', async ({
    browser,
  }): Promise<void> => {
    test.slow();

    // The single most fragile invariant in a styling change: a theme token that
    // leaks into the export makes dark-mode creators silently ship a different
    // PNG, and no rendering test notices.
    const baseline = await probeExportedPng(browser, {
      colorScheme: 'light',
      deviceScaleFactor: 1,
    });
    expect(baseline.width).toBe(EXPORT_SIZE);
    expect(baseline.height).toBe(EXPORT_SIZE);

    /*
     * Assert content BEFORE comparing contexts. Equality is satisfied by three
     * identical all-white squares - the exact shape a foreignObject/CORS or
     * `isolation: isolate` regression produces, in every context at once, with
     * the 1080x1080 frame intact. The gate would stay green while every creator
     * shipped a blank PNG.
     */
    expect(
      baseline.nonWhitePixels,
      'the exported PNG is blank: nothing rasterized into the frame.',
    ).toBeGreaterThan(MIN_NON_WHITE_PIXELS);
    expect(
      baseline.appliedRedPixels,
      'the applied #DC2626 fill did not reach the PNG.',
    ).toBeGreaterThan(MIN_APPLIED_RED_PIXELS);

    const dark = await probeExportedPng(browser, {
      colorScheme: 'dark',
      deviceScaleFactor: 3,
    });
    const forced = await probeExportedPng(browser, {
      colorScheme: 'light',
      forcedColors: 'active',
      deviceScaleFactor: 2,
    });

    expect(dark.width).toBe(EXPORT_SIZE);
    expect(dark.height).toBe(EXPORT_SIZE);
    expect(forced.width).toBe(EXPORT_SIZE);
    expect(forced.height).toBe(EXPORT_SIZE);
    expect(dark.samples).toStrictEqual(baseline.samples);
    expect(forced.samples).toStrictEqual(baseline.samples);
    [dark, forced].forEach((probe): void => {
      expect(probe.nonWhitePixels).toBe(baseline.nonWhitePixels);
      expect(probe.appliedRedPixels).toBe(baseline.appliedRedPixels);
    });
  });
});
