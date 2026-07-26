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
 * The browser half of the Phase 2 UI contract. `phase2CssContract.test.ts`
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

    const order: string[] = [];
    for (let step = 0; step < 20; step += 1) {
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

    const positionOf = (label: string): number => {
      const index = order.indexOf(label);
      expect(index, `"${label}" is not in the tab order: ${order.join(' > ')}`)
        .toBeGreaterThanOrEqual(0);
      return index;
    };

    /*
     * UI-SPEC 7.4/20: the compact order is action strip, composition bar, map,
     * then the inspector sections - never the country browser before the map.
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
    const country = order.findIndex((label): boolean =>
      label.startsWith('Afghanistan, current color'),
    );
    const countrySearch = positionOf('Search countries');

    expect(saveLoad).toBeLessThan(exportPng);
    expect(exportPng).toBeLessThan(resetView);
    expect(resetView).toBeLessThan(country);
    expect(country).toBeLessThan(countrySearch);
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
   * asserted statically in `phase2CssContract.test.ts` and belongs to the
   * physical acceptance matrix in `02-28`. It is deliberately not simulated here
   * as if it were browser evidence.
   */
});

interface PngProbe {
  readonly width: number;
  readonly height: number;
  readonly samples: ReadonlyArray<ReadonlyArray<number>>;
}

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

    return page.evaluate(async (base64: string): Promise<PngProbe> => {
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

      return { width: bitmap.width, height: bitmap.height, samples };
    }, bytes.toString('base64'));
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
  });
});
