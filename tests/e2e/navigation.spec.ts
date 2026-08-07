import { expect, test, type Page } from '@playwright/test';

import {
  LEGEND_CORNER_OPTIONS,
  LEGEND_CUSTOM_POSITION_LABEL,
} from '../../src/components/LegendEditor';
import { NEUTRAL_UNIT_COLOR } from '../../src/constants/colors';
import { TOOLTIP_NOT_COLORABLE_REASON } from '../../src/components/Tooltip';
import { LEGEND_CORNERS } from '../../src/utils/legend';
import {
  legendDisclosure,
  openRailTool,
  waitForApp,
} from './support/appHarness';

const NAVIGATION_FIXTURE_URL = '/tests/e2e/fixtures/navigation.html';

/**
 * The viewport set assertion 12 measures. Every one is a shape the responsive
 * suite already declares, and every one has a real letterbox: the canvas
 * region's width and height differ by more than the cluster's short side plus
 * its margin (~124px), which is the documented bound in `MapCanvas.css`.
 *
 * RE-MEASURED by `03-09`, and two rows changed places. D-20 replaces the 56px
 * side rail below 1200px with a bottom bar, which takes height from the canvas
 * region instead of width - so every compact shape's region changed and the
 * membership of this list follows the measurement rather than the other way
 * round. Chrome 151, this branch:
 *
 * | viewport   | canvas region | difference | verdict |
 * |------------|---------------|-----------|---------|
 * | 1440 x 900 | 1384 x 900    | 484       | inline gutter |
 * | 1300 x 900 | 1244 x 900    | 344       | inline gutter |
 * | 1024 x 900 | 1024 x 843    | 181       | inline gutter, 90px per side |
 * |  800 x 900 |  800 x 843    |  43       | NEAR-SQUARE - the exception |
 * |  640 x 400 |  640 x 343    | 297       | inline gutter, 148px per side |
 * |  360 x 740 |  360 x 631    | 271       | block gutter, 135px per side |
 *
 * - `1024 x 900` ARRIVES. It used to be the near-square case (a 968 x 900
 *   region under the side rail); the bar makes it a genuine 181px letterbox.
 * - `800 x 900` LEAVES, to the bounded-exception test below, for the mirror
 *   reason: the bar takes 57px of height off a region the rail used to take
 *   56px of width off, and 800 x 843 is inside the band.
 * - `640 x 400` RETURNS. Its exclusion was deferred item D-5 - the rail was not
 *   a scroll container, so a viewport shorter than ~436px overflowed it and
 *   stretched the grid row to a 584 x 500 region. The bar has no column to
 *   overflow, the region measures the 640 x 343 the viewport implies, and the
 *   inline gutter is 148px. This row is the observable evidence D-5 is closed
 *   below 1200px, which is the condition `deferred-items.md` recorded.
 *
 * No row was removed to make an assertion pass: the exception test below
 * asserts its own precondition (`difference < 124`), so a viewport in the wrong
 * list fails on that rather than passing quietly.
 */
const GUTTER_VIEWPORTS = [
  { name: 'desktop 1440x900', width: 1440, height: 900 },
  { name: 'desktop 1300x900', width: 1300, height: 900 },
  { name: 'compact 1024x900', width: 1024, height: 900 },
  { name: 'compact 640x400 (the 200% equivalent)', width: 640, height: 400 },
  { name: 'mobile 360x740', width: 360, height: 740 },
] as const;

const NEAR_SQUARE_VIEWPORT = { width: 800, height: 900 };

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

async function readRects(page: Page): Promise<{
  cluster: Rect;
  frame: Rect;
  region: Rect;
}> {
  return page.evaluate((): { cluster: Rect; frame: Rect; region: Rect } => {
    const read = (selector: string): Rect => {
      const element = document.querySelector(selector);
      if (element === null) {
        throw new Error(`"${selector}" is not rendered.`);
      }
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
      };
    };

    return {
      cluster: read('.map-navigation__cluster'),
      frame: read('.map-frame'),
      region: read('.map-workspace__canvas'),
    };
  });
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * Colours one country so the legend has an entry to place, then opens the
 * Legend tool. Reaching a tool control means opening its rail row first
 * (`03-06`), and the panel takes a 280px track out of the canvas region - so
 * every measurement below is taken with the panel CLOSED again.
 */
async function prepareLegend(page: Page): Promise<void> {
  const france = page.locator('path.country-path[data-country-id="FRA"]');
  await france.focus();
  await france.press('Enter');
  await openRailTool(page, 'Colors');
  await page.getByRole('button', { name: 'Apply Red' }).click();
}

async function closeRailTool(page: Page, label: string): Promise<void> {
  const row = page.getByRole('button', { name: label, exact: true });
  if ((await row.getAttribute('aria-expanded')) === 'true') {
    await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'false');
  }
  await waitForSettledRegion(page);
}

/**
 * `--panel-width` is a registered custom property and it INTERPOLATES (D-19),
 * so `aria-expanded="false"` is true a quarter of a second before the canvas
 * region has finished widening. Measuring the cluster against the frame in that
 * window measures a transient layout: at 1300x900 the mid-transition region is
 * near-square and the assertion failed on the animation rather than on the
 * placement. Poll real frames to two equal consecutive reads.
 */
async function waitForSettledRegion(page: Page): Promise<void> {
  let previous = -1;
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
      const width = await page
        .locator('.map-workspace__canvas')
        .evaluate((element): number => element.getBoundingClientRect().width);
      const isSettled = Math.abs(width - previous) < 0.01;
      previous = width;
      return isSettled;
    })
    .toBe(true);
}

async function openNavigationFixture(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.goto(NAVIGATION_FIXTURE_URL);
  await expect(page.locator('[aria-label="Map navigation"]')).toBeVisible();
}

test.describe('camera controls browser interactions', (): void => {
  test('Move Map closes with Escape and restores focus to its opener', async ({
    page,
  }): Promise<void> => {
    await openNavigationFixture(page);

    const moveMapButton = page.getByRole('button', { name: 'Move Map' });
    await moveMapButton.click();
    await expect(page.getByRole('group', { name: 'Move map' })).toBeVisible();

    const panUpButton = page.getByRole('button', { name: 'Pan Up' });
    await panUpButton.focus();
    await panUpButton.press('Escape');

    await expect(page.getByRole('group', { name: 'Move map' })).toHaveCount(0);
    await expect(moveMapButton).toBeFocused();
  });

  test('Move Map closes on outside pointer activation without hiding the opener', async ({
    page,
  }): Promise<void> => {
    await openNavigationFixture(page);

    const moveMapButton = page.getByRole('button', { name: 'Move Map' });
    await moveMapButton.click();
    await expect(page.getByRole('group', { name: 'Move map' })).toBeVisible();

    await page.getByRole('button', { name: 'Outside target' }).click();

    await expect(page.getByRole('group', { name: 'Move map' })).toHaveCount(0);
    await expect(moveMapButton).toBeVisible();
    await expect(moveMapButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('camera controls expose truthful limits and bounded repeated callbacks', async ({
    page,
  }): Promise<void> => {
    await openNavigationFixture(page);

    const zoomInButton = page.getByRole('button', { name: 'Zoom In' });
    const zoomOutButton = page.getByRole('button', { name: 'Zoom Out' });
    const moveMapButton = page.getByRole('button', { name: 'Move Map' });

    await expect(zoomOutButton).toBeDisabled();
    await expect(zoomInButton).toBeEnabled();

    await page.getByRole('button', { name: 'Set maximum zoom' }).click();
    await expect(zoomInButton).toBeDisabled();
    await expect(zoomOutButton).toBeEnabled();

    await page.getByRole('button', { name: 'Set middle zoom' }).click();
    await zoomInButton.click();
    await zoomInButton.click();
    await zoomOutButton.click();
    await expect(page.locator('[data-zoom-events="true"]')).toHaveText(
      'in:1.5|in:1.5|out:1.5',
    );

    await moveMapButton.click();
    const panRightButton = page.getByRole('button', { name: 'Pan Right' });
    const panUpButton = page.getByRole('button', { name: 'Pan Up' });
    await panRightButton.click();
    await panRightButton.click();
    await panRightButton.click();
    await panUpButton.click();
    await panUpButton.click();
    await expect(page.locator('[data-pan-events="true"]')).toHaveText(
      'right:0.125|right:0.125|right:0.125|up:0.125|up:0.125',
    );

    const navigationButtons = page
      .locator('[data-navigation-fixture="true"]')
      .getByRole('button');
    // Four cluster controls (D-21, with `Move Map` retained as the deliberate
    // fourth) plus the four pan alternatives in the open popover.
    await expect(navigationButtons).toHaveCount(8);
    await expect(zoomInButton).toHaveCSS('width', '44px');
    await expect(zoomInButton).toHaveCSS('height', '44px');
    expect(
      await navigationButtons.evaluateAll((buttons): boolean =>
        buttons.every(
          (button): boolean =>
            button.closest('[data-editor-only="true"]') !== null,
        ),
      ),
    ).toBe(true);
  });

  /*
   * D-21: `Reset View` is the cluster's fourth control as of `03-08`. It is
   * CAMERA reset, so it is wired to the camera callbacks the rest of the
   * cluster uses and not to any content action - `Reset All Colors` lives in
   * the Colors panel and the two never sit together.
   */
  test('resets the camera from inside the cluster', async ({
    page,
  }): Promise<void> => {
    await openNavigationFixture(page);

    await page.getByRole('button', { name: 'Set maximum zoom' }).click();
    await expect(page.locator('[data-current-zoom="true"]')).toHaveText('24');

    const cluster = page.locator('.map-navigation__cluster');
    await expect(cluster.getByRole('button')).toHaveCount(4);
    await cluster.getByRole('button', { name: 'Reset View' }).click();

    await expect(page.locator('[data-current-zoom="true"]')).toHaveText('1');
    await expect(page.locator('[data-zoom-events="true"]')).toContainText(
      'reset',
    );
    await expect(
      page.getByRole('button', { name: 'Reset All Colors' }),
    ).toHaveCount(0);
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 12 - the cluster never intersects the export frame
 * ------------------------------------------------------------------ */

test.describe('the floating cluster stays in the letterbox gutter', (): void => {
  /*
   * The enumeration guard. `resolveLegendPosition` gates on `LEGEND_CORNERS`,
   * and the position grid renders `LEGEND_CORNER_OPTIONS`; the cross-product
   * below walks the second. If the two ever drift, the cross-product silently
   * stops covering a preset that the product can still reach - so they are
   * asserted equal in BOTH directions, which a one-way subset check would miss.
   */
  test('enumerates every legend preset the resolver accepts', (): void => {
    const rendered = LEGEND_CORNER_OPTIONS.map((option): string => option.value)
      .slice()
      .sort();
    const resolvable = [...LEGEND_CORNERS].slice().sort();

    expect(rendered).toStrictEqual(resolvable);
    expect(LEGEND_CUSTOM_POSITION_LABEL).toBe('Custom');
  });

  for (const viewport of GUTTER_VIEWPORTS) {
    test(`assertion 12: no intersection with .map-frame at ${viewport.name}, at every legend preset`, async ({
      page,
    }): Promise<void> => {
      test.slow();

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await waitForApp(page);
      await prepareLegend(page);

      const presets = [
        ...LEGEND_CORNER_OPTIONS.map((option): string => option.label),
        LEGEND_CUSTOM_POSITION_LABEL,
      ];

      for (const preset of presets) {
        await openRailTool(page, 'Legend');
        // The position grid lives inside the legend disclosure; opening the
        // rail row alone leaves it collapsed.
        if ((await legendDisclosure(page).getAttribute('aria-expanded')) !== 'true') {
          await legendDisclosure(page).click();
        }
        await page.getByRole('radio', { name: preset, exact: true }).check();
        await expect(
          page.getByRole('radio', { name: preset, exact: true }),
        ).toBeChecked();
        await closeRailTool(page, 'Legend');

        const { cluster, frame, region } = await readRects(page);

        /*
         * NON-INTERSECTION, not placement. "The cluster is bottom-right" and
         * "the legend is at its preset" were both true throughout the
         * collision this project already shipped once; only measuring the two
         * rects against each other goes red when a regression re-anchors the
         * cluster into the frame at a normal viewport.
         */
        expect(
          intersects(cluster, frame),
          `the cluster intersects .map-frame at ${viewport.name} / "${preset}" — ` +
            `cluster ${JSON.stringify(cluster)} frame ${JSON.stringify(frame)}`,
        ).toBe(false);

        // And it is still on screen: a cluster pushed out of the clipped
        // region would satisfy non-intersection perfectly.
        expect(
          intersects(cluster, region),
          `the cluster left the canvas region at ${viewport.name} / "${preset}"`,
        ).toBe(true);
        expect(cluster.right).toBeLessThanOrEqual(region.right + 1);
        expect(cluster.bottom).toBeLessThanOrEqual(region.bottom + 1);
      }
    });
  }

  /*
   * The bounded exception, asserted rather than described. Inside the
   * near-square band no gutter can hold the cluster, so it does rest over the
   * frame's bottom-inline-end corner. What must stay true is the BOUND: the
   * overlap is confined to that corner and never reaches the legend's default
   * top-left preset, and nothing underneath loses hit area.
   */
  test('bounds the near-square exception to the frame corner opposite the default legend', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(NEAR_SQUARE_VIEWPORT);
    await waitForApp(page);

    const { cluster, frame, region } = await readRects(page);

    expect(
      Math.abs(region.right - region.left - (region.bottom - region.top)),
      'this viewport is no longer near-square; the exception moved and this ' +
        'test is measuring the wrong thing',
    ).toBeLessThan(124);

    const frameMidX = (frame.left + frame.right) / 2;
    const frameMidY = (frame.top + frame.bottom) / 2;
    expect(cluster.left).toBeGreaterThan(frameMidX);
    expect(cluster.top).toBeGreaterThan(frameMidY);

    // (b) of the recorded reason: the wrapper passes pointer events through
    // and only the control rects take them back.
    const pointerEvents = await page.evaluate((): {
      wrapper: string;
      control: string;
    } => {
      const wrapper = document.querySelector('.map-navigation');
      const control = document.querySelector('.map-navigation__control');
      if (wrapper === null || control === null) {
        throw new Error('the cluster is not rendered.');
      }
      return {
        wrapper: getComputedStyle(wrapper).pointerEvents,
        control: getComputedStyle(control).pointerEvents,
      };
    });
    expect(pointerEvents.wrapper).toBe('none');
    expect(pointerEvents.control).toBe('auto');
  });

  /*
   * D-21 + the singleton half of assertion 15, re-measured in the cluster's new
   * home. `Reset View` is CAMERA reset; `Reset All Colors` is CONTENT reset and
   * lives in the Colors panel. The two never sit together, and the cluster is
   * where the camera reset is now.
   */
  test('owns exactly one Reset View, in the cluster, never beside Reset All Colors', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);

    await expect(page.getByRole('button', { name: 'Reset View' })).toHaveCount(
      1,
    );
    await expect(
      page
        .locator('.map-navigation__cluster')
        .getByRole('button', { name: 'Reset View' }),
    ).toHaveCount(1);

    await openRailTool(page, 'Colors');
    await expect(
      page.getByRole('button', { name: 'Reset All Colors' }),
    ).toHaveCount(1);
    await expect(
      page
        .locator('.map-navigation')
        .getByRole('button', { name: 'Reset All Colors' }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reset View' })).toHaveCount(
      1,
    );
  });

  /*
   * `Zoom Out`'s absence at the whole-world fit, ASSERTED rather than assumed.
   * The control is rendered and natively `disabled` at MIN_ZOOM, which is what
   * removes it from the sequential navigation order - so the absence claim is
   * made where it is observable: the keyboard sequence. Asserting only
   * `toBeDisabled()` would leave the focus-order consequence unmeasured, which
   * is the difference between knowing why and not noticing.
   */
  test('keeps Zoom Out out of the keyboard sequence at the whole-world fit', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);

    const zoomIn = page.getByRole('button', { name: 'Zoom In' });
    const zoomOut = page.getByRole('button', { name: 'Zoom Out' });
    await expect(zoomOut).toBeDisabled();
    await expect(zoomIn).toBeEnabled();

    const reachable = async (): Promise<ReadonlyArray<string>> => {
      await zoomIn.focus();
      const labels: string[] = [];
      for (let step = 0; step < 3; step += 1) {
        await page.keyboard.press('Tab');
        labels.push(
          await page.evaluate(
            (): string =>
              document.activeElement?.getAttribute('aria-label') ?? '',
          ),
        );
      }
      return labels;
    };

    expect(await reachable()).not.toContain('Zoom Out');

    // And it rejoins the sequence the moment the camera leaves the fit, which
    // is what proves the absence was the fit and not the traversal.
    await zoomIn.click();
    await expect(zoomOut).toBeEnabled();
    expect(await reachable()).toContain('Zoom Out');
  });
});

/* ------------------------------------------------------------------ *
 * D-23 - cursor and copy discipline for non-colourable units
 * ------------------------------------------------------------------ */

/**
 * D4-10 reversed the neutral-unit policy: the twelve units that used to carry
 * `colorOwnerId === null` now own their own colour, so on the Modern scene the
 * null-owner bucket is EMPTY. The count is pinned at zero for the same reason
 * it was pinned at twelve - a silent reclassification stays visible.
 */
const NON_COLORABLE_UNIT_COUNT = 0;
/** The unit the defect was reported against, and the one D4-10 unblocks. */
const SELF_COLORABLE_UNIT_ID = 'KOS';
/**
 * The unit the tooltip half hovers. Kosovo is enclaved and, at the whole-world
 * fit, its bounding-box centre lands on Serbia - Playwright's hit test resolves
 * to the neighbour and the hover never reaches the unit under test. Western
 * Sahara is in the same self-colorable bucket, resolved through the same two
 * resolvers, and is large enough for a real pointer to land on it.
 */
const SELF_COLORABLE_HOVER_ID = 'SAH';
/** Compact enough that its bounding-box centre is inside its own polygon. */
const COLORABLE_UNIT_ID = 'POL';

/**
 * A REAL pointer hover on a map path, aimed at a point the browser's own hit
 * test resolves to that path.
 *
 * `locator.hover()` aims at the bounding-box centre, and on a world map that is
 * routinely a different country: France's box centre lands on Mali, Kosovo's on
 * Serbia, Western Sahara's on Morocco. Playwright then reports "intercepts
 * pointer events" and the hover never reaches the unit under test. Sampling the
 * outline and asking `elementFromPoint` keeps this a genuine pointer event
 * rather than a dispatched one - the browser still decides what was hovered.
 */
async function hoverUnit(page: Page, selector: string): Promise<void> {
  const point = await page.evaluate((pathSelector): {
    x: number;
    y: number;
  } => {
    const element = document.querySelector<SVGPathElement>(pathSelector);
    if (element === null) {
      throw new Error(`"${pathSelector}" is not rendered.`);
    }
    const box = element.getBoundingClientRect();
    const centreX = box.left + box.width / 2;
    const centreY = box.top + box.height / 2;
    const total = element.getTotalLength();
    const candidates: Array<{ x: number; y: number }> = [
      { x: centreX, y: centreY },
    ];

    for (let step = 0; step < 64; step += 1) {
      const onOutline = element.getPointAtLength((total * step) / 64);
      const screen = onOutline.matrixTransform(element.getScreenCTM() ?? undefined);
      // Pull each sample a little toward the centre so it lands inside the
      // polygon rather than on its own stroke.
      for (const pull of [0.12, 0.25, 0.4]) {
        candidates.push({
          x: screen.x + (centreX - screen.x) * pull,
          y: screen.y + (centreY - screen.y) * pull,
        });
      }
    }

    for (const candidate of candidates) {
      if (document.elementFromPoint(candidate.x, candidate.y) === element) {
        return candidate;
      }
    }
    throw new Error(`no point on "${pathSelector}" resolves to it.`);
  }, selector);

  await page.mouse.move(point.x, point.y);
}

async function computedCursor(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((element): string => getComputedStyle(element).cursor);
}

test.describe('every unit is colourable (D4-10)', (): void => {
  test('Kosovo takes a colour where the click used to be swallowed', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);

    const colorable = `path.country-path[data-country-id="${COLORABLE_UNIT_ID}"]`;
    /*
     * The selector itself is half the assertion. Before D4-10 Kosovo rendered
     * as `.map-unit-path` - a class with zero CSS rules - and was absent from
     * `[role="option"]`. Finding it as a `.country-path` option is what proves
     * the reclassification reached the DOM, not just the manifest.
     */
    const kosovo = `path.country-path[data-country-id="${SELF_COLORABLE_UNIT_ID}"]`;

    await expect(page.locator(kosovo)).toHaveCount(1);
    await expect(
      page.locator(`path.map-unit-path[data-scene-unit-id="${SELF_COLORABLE_UNIT_ID}"]`),
      'Kosovo is still rendered as a non-selectable unit path.',
    ).toHaveCount(0);

    /*
     * The null-owner bucket is now EMPTY on the Modern scene. Counting by fill
     * is the browser-side proof that both colour resolvers agree: a resolver
     * that still returned the neutral fill for one of the twelve would push
     * this count off zero.
     */
    await expect(
      page.locator(
        `path.scene-path[data-primary-unit="true"][fill="${NEUTRAL_UNIT_COLOR}"]`,
      ),
      'a unit still resolves to the neutral fill - D4-10 says no Modern unit ' +
        'has a null colour owner. Reclassifying a unit is a DATA decision ' +
        'and needs the approval chain in coding-rules/data.md.',
    ).toHaveCount(NON_COLORABLE_UNIT_COUNT);

    /*
     * A. The cursor is the honest signal. It read `default` over Kosovo while
     * the click was swallowed; now it promises an interaction the map performs.
     */
    expect(await computedCursor(page, colorable)).toBe('pointer');
    expect(await computedCursor(page, kosovo)).toBe('pointer');

    /*
     * B. The tooltip announces a colour and no longer states a refusal reason.
     * The NEGATIVE half is the load-bearing one: a tooltip that showed both
     * would pass a presence-only check. Both halves are read from ONE
     * `innerText` snapshot - two retrying assertions can straddle a tooltip
     * teardown and the second then passes on an absent element.
     */
    const tooltip = page.locator('.map-tooltip');
    const hoverTarget = `path.country-path[data-country-id="${SELF_COLORABLE_HOVER_ID}"]`;
    await expect(page.locator(hoverTarget)).toHaveCount(1);
    await hoverUnit(page, hoverTarget);
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('.map-tooltip__color')).toHaveCount(1);
    const tooltipText = await tooltip.innerText();
    expect(tooltipText).toContain('Current color:');
    expect(tooltipText).not.toContain(TOOLTIP_NOT_COLORABLE_REASON);

    /*
     * C. The click itself - the exact interaction the debug note recorded as
     * producing "literally nothing, not even a selection clear" - followed by
     * a real paint.
     */
    await page.locator(kosovo).click();
    await expect(page.locator(kosovo)).toHaveAttribute('aria-selected', 'true');

    await openRailTool(page, 'Colors');
    await page.getByRole('button', { name: 'Apply Red' }).click();

    const appliedFill = await page.locator(kosovo).getAttribute('fill');
    expect(appliedFill).not.toBe(NEUTRAL_UNIT_COLOR);
    expect(appliedFill).not.toBe('#FFFFFF');
    expect(appliedFill?.toUpperCase()).toBe('#DC2626');
  });
});
