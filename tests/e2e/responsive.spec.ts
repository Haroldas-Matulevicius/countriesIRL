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
  applyRampRed,
  clearSavedMaps,
  collectTabOrder,
  expectOneCameraOwner,
  legendDisclosure,
  openRailTool,
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
/**
 * The rail-height floor, stated as a number instead of discovered (`04-01`
 * U-5 / OQ-2, `04-UI-SPEC.md § 6.1`).
 *
 * ⚠ **MEASURED at 552px, not the 540px the spec estimated.** `04-UI-SPEC.md
 * § 6.1` predicted "6 rows ~492px today; the seventh makes it ~540px". Driven in
 * installed Chrome at 1280 wide, the rail's minimum content height with the
 * seventh row is **552px**: at a 540px viewport the rail's bottom edge lands at
 * 552, i.e. **12px past the fold**. The estimate was optimistic and the number
 * here is the one the browser produced. The seven ROWS are not the part that
 * overflows - the last row's bottom sits at 432px - the pinned HUD footer is.
 *
 * **Below this floor the rail overflows and its footer is unreachable. That is
 * a documented floor, not a fix** - the rail cannot become a scroll container,
 * because `overflow-y: auto` computes `overflow-x: auto` and would clip every
 * rail tooltip out of the 48px column (`coding-rules/frontend.md:1338-1339`),
 * and compressing, grouping, or shrinking rows is forbidden with reasons in the
 * spec. **OQ-2 stays OPEN, and is 12px worse than the spec assumed.**
 */
const RAIL_HEIGHT_FLOOR_VIEWPORT = { width: 1280, height: 552 };

const STANDARD_TARGET_HEIGHT = 48;
const COMPACT_TARGET_SIZE = 44;
/**
 * The rail's spec'd tab sequence with no colour history yet, exactly as
 * `rail.spec.ts` pins it at desktop. Undo and Redo are absent because a
 * natively `disabled` button is removed from the tab order, which is the half
 * of the contract a documented deviation would have skipped.
 */
const RAIL_TAB_STOPS = [
  'Colors',
  // `04-01` (D4-07): second, immediately after `Colors` (U-4, an ASSUMPTION).
  'Map style',
  'Countries',
  'Legend',
  'Saved Maps',
  'Export PNG',
  'Switch to dark theme',
] as const;
const ICON_ONLY_LABELS = new Set([
  // Every one of these spells its label only in `aria-label` + `title`.
  'Reset View',
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
 *
 * `03-05` retired the app bar and `03-06` retired the panel header that was
 * left of it, so there is no `banner` any more, and the inspector's
 * `complementary` went with the column that carried it. Both are asserted as
 * ABSENT rather than dropped from the census: "the banner is gone" has to keep
 * failing if one comes back, or this helper stops being a census.
 *
 * `main` is now the panel track itself, which stays mounted at every panel
 * state - the landmark used to live inside the panel body, which `03-06`
 * unmounts whenever no tool is open.
 */
async function expectLandmarks(page: Page): Promise<void> {
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByRole('complementary')).toHaveCount(0);
  await expect(page.getByRole('main')).toHaveCount(1);
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
    /*
     * REWRITTEN by `03-09`. Every selector this used to name was retired
     * between `03-03` and `03-07` - `.app > header`, `main.workspace`, the four
     * `.workspace__*` sections, `.map-workspace__square`, `.composition-bar__row`
     * - so the helper measured NOTHING and returned an empty list at every
     * viewport. That is the worst possible state for a containment check: it
     * reads exactly like a pass.
     *
     * The list below names the shell that exists, and it is paired with a sweep
     * of every visible control, so a clipped button is caught even if its
     * container is not on the list.
     */
    const selectors = [
      '.map-editor',
      '.tool-rail',
      '.tool-rail__header',
      '.tool-rail__tools',
      '.tool-rail__footer',
      '.tool-panel',
      '.tool-panel__body',
      '.tool-panel__content',
      '.tool-panel__title-row',
      '.map-workspace',
      '.map-workspace__canvas',
      '.map-frame',
      '.map-navigation__cluster',
      '.period-hud',
      '.editor-help',
      'button',
      'input',
      'select',
    ];

    return selectors
      .flatMap((selector): Element[] => [...document.querySelectorAll(selector)])
      .filter((element): boolean => {
        const style = getComputedStyle(element);
        // Visually hidden landmarks are 1px clipped boxes, not layout.
        return style.visibility !== 'hidden' && style.display !== 'none';
      })
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
 * The elements inside the panel column that actually scroll.
 *
 * Asserted as an OWNERSHIP SET rather than as "the body scrolls": a second
 * scroll container inside the panel is invisible until a creator reaches the
 * bottom of one and finds the other, and it passes any presence check.
 */
async function findPanelScrollContainers(
  page: Page,
): Promise<ReadonlyArray<string>> {
  return page.evaluate((): ReadonlyArray<string> =>
    [...document.querySelectorAll('.tool-panel, .tool-panel *')]
      .filter((element): boolean => {
        const style = getComputedStyle(element);
        const scrolls = /(auto|scroll)/u.test(
          `${style.overflowY} ${style.overflowX}`,
        );
        return scrolls && element.scrollHeight > element.clientHeight;
      })
      .map((element): string => `${element.tagName.toLowerCase()}.${element.className}`),
  );
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

/**
 * The theme axis (D-30 / D-35).
 *
 * `.dark` on the editor mount root is what drives the palette, and the rail
 * footer's toggle is its ONLY writer. Every theme flip in this file goes
 * through that control, so the gate exercises the shipped path; nothing here
 * sets the class directly and nothing emulates an operating-system preference,
 * which this app deliberately never reads.
 *
 * The labels name the DESTINATION, matching `ThemeToggle.tsx`.
 */
const THEME_TOGGLE_LABELS = {
  dark: 'Switch to dark theme',
  light: 'Switch to light theme',
} as const;

const DARK_MOUNT_ROOT = /(?:^|\s)dark(?:\s|$)/u;

type EditorTheme = keyof typeof THEME_TOGGLE_LABELS;

async function setEditorTheme(page: Page, mode: EditorTheme): Promise<void> {
  const toggle = page.getByRole('button', {
    name: THEME_TOGGLE_LABELS[mode],
  });
  // The control names where it GOES, so its label is absent once the editor is
  // already in the requested mode. Idempotent on purpose: callers say what they
  // want, not what to press.
  if ((await toggle.count()) > 0) {
    await toggle.click();
  }

  const mount = page.locator('.map-editor');
  if (mode === 'dark') {
    await expect(mount).toHaveClass(DARK_MOUNT_ROOT);
  } else {
    await expect(mount).not.toHaveClass(DARK_MOUNT_ROOT);
  }
}

interface ThemeSurfaces {
  /** Mount-root wall and ink: chrome, and it MUST follow the theme. */
  readonly wall: string;
  readonly ink: string;
  /** The export-bound surfaces: they must NOT follow it (Live Invariant 9). */
  readonly region: string;
  readonly canvas: string;
  readonly border: string;
}

/**
 * Waits for the theme crossfade to be OVER, deterministically.
 *
 * The obvious "poll to two equal consecutive reads" is unsound here and was
 * measured to be: the mount root crossfades its wall over 360ms and the class
 * change registers the transition on the next style flush, so two samples taken
 * before that flush are equal and the loop declares a crossfade settled at its
 * starting colour. That reports the dark wall as still white - a flake that
 * fails an honest assertion for a dishonest reason.
 *
 * Two frames let any pending transition register; `getAnimations()` then names
 * exactly the transitions in flight and their `finished` promises say when they
 * are not. Scoped to the two elements under test rather than the document, so
 * an unrelated animation elsewhere can never hang this.
 */
async function settleThemeSurfaces(page: Page): Promise<void> {
  await page.evaluate(async (): Promise<void> => {
    const targets = [
      document.querySelector('.map-editor'),
      document.querySelector('path.country-path[data-country-id="FRA"]'),
    ].filter((element): element is Element => element !== null);
    if (targets.length !== 2) {
      throw new Error('The editor shell is not rendered.');
    }

    await new Promise<void>((resolve): void => {
      requestAnimationFrame((): void => {
        requestAnimationFrame((): void => resolve());
      });
    });

    await Promise.all(
      targets
        .flatMap((element): ReadonlyArray<Animation> => element.getAnimations())
        .map((animation): Promise<void> =>
          animation.finished.then(
            (): void => undefined,
            (): void => undefined,
          ),
        ),
    );
  });
}

interface ShellRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface ShellGeometry {
  readonly rail: ShellRect;
  readonly panel: ShellRect;
  readonly region: ShellRect;
  readonly frame: ShellRect;
}

/**
 * The four boxes the shell contract is written in, read in one round trip so
 * they cannot be sampled at different moments of a transition.
 */
async function readShellGeometry(page: Page): Promise<ShellGeometry> {
  return page.evaluate((): ShellGeometry => {
    const read = (selector: string): ShellRect => {
      const element = document.querySelector(selector);
      if (element === null) {
        throw new Error(`"${selector}" is not rendered.`);
      }
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
    };
    return {
      rail: read('.tool-rail'),
      panel: read('.tool-panel'),
      region: read('.map-workspace'),
      frame: read('.map-frame'),
    };
  });
}

/**
 * The panel track and the bottom sheet are both registered custom properties,
 * so they INTERPOLATE (D-19/D-20) - `aria-expanded="true"` is true a quarter of
 * a second before the shell has finished moving. Measuring geometry on that
 * frame reads a mid-transition shape, which is how `03-08` once failed an
 * assertion on the animation rather than on the placement.
 */
async function settleShell(page: Page): Promise<void> {
  await page.evaluate(async (): Promise<void> => {
    const shell = document.querySelector('.map-editor');
    if (shell === null) {
      throw new Error('The editor mount root is not rendered.');
    }
    await new Promise<void>((resolve): void => {
      requestAnimationFrame((): void => {
        requestAnimationFrame((): void => resolve());
      });
    });
    await Promise.all(
      shell
        .getAnimations()
        .map((animation): Promise<void> =>
          animation.finished.then(
            (): void => undefined,
            (): void => undefined,
          ),
        ),
    );
  });
}

async function readThemeSurfaces(page: Page): Promise<ThemeSurfaces> {
  return page.evaluate((): ThemeSurfaces => {
    const mount = document.querySelector('.map-editor');
    const region = document.querySelector('.map-workspace__canvas');
    const canvas = document.querySelector('svg.map-canvas');
    const border = document.querySelector(
      'path.country-path[data-country-id="FRA"]',
    );
    if (
      mount === null ||
      region === null ||
      canvas === null ||
      border === null
    ) {
      throw new Error('The editor shell is not rendered.');
    }
    const mountStyle = getComputedStyle(mount);
    return {
      wall: mountStyle.backgroundColor,
      ink: mountStyle.color,
      region: getComputedStyle(region).backgroundColor,
      canvas: getComputedStyle(canvas).backgroundColor,
      border: getComputedStyle(border).stroke,
    };
  });
}

test.describe('responsive world workspace', (): void => {
  /**
   * REWRITTEN by `03-09`, not repaired. The claim was measured against
   * `.map-workspace__square` (renamed by `03-03`) and `.workspace__control-column`
   * (dissolved by `03-05`), so every selector in it resolved to nothing. What
   * survives is the claim itself, re-pointed at the shell that exists: the
   * canvas region dominates, and the export frame inside it is square.
   */
  test('the desktop shell is map-first with one camera owner and exact landmarks', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await clearSavedMaps(page);
    await stampCameraOwnerSentinel(page);

    await expectLayout(page, 'desktop');
    await expectLandmarks(page);
    await expectOneCameraOwner(page);

    await openRailTool(page, 'Colors');
    const chrome = await readShellGeometry(page);

    // UI-SPEC 3: the map is the dominant element, even with a tool open.
    expect(chrome.region.width).toBeGreaterThan(chrome.rail.width + chrome.panel.width);
    expect(chrome.region.width * chrome.region.height).toBeGreaterThan(
      (chrome.rail.width + chrome.panel.width) * chrome.rail.height,
    );
    // D-11: three tracks in one row, in that order, with no gap between them.
    expect(Math.round(chrome.rail.x)).toBe(0);
    expect(Math.round(chrome.panel.x)).toBe(Math.round(chrome.rail.x + chrome.rail.width));
    expect(Math.round(chrome.region.x)).toBe(
      Math.round(chrome.panel.x + chrome.panel.width),
    );
    // D-32: `aspect-ratio: 1` moved from the region to the frame, so the
    // squareness claim moved with it rather than being dropped on the rename.
    expect(chrome.frame.width).toBeCloseTo(chrome.frame.height, 0);
    expect(chrome.frame.width).toBeGreaterThan(100);
  });

  /**
   * REWRITTEN by `03-09`. The original asserted `.app > header` stayed at y=0
   * while the page scrolled; `03-05` retired the bar as a container, so "stays
   * pinned" became a claim about something that does not exist.
   *
   * The successor claim is the one D-12/D-13 actually make, and it is stronger:
   * the shell itself never scrolls, the panel body is the ONE scroll container,
   * and the HUD blocks are its siblings - so identity and Export cannot scroll
   * away no matter how far the panel's content runs.
   */
  test('the shell never scrolls and the pinned HUD blocks never move', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    // The country browser is the longest panel content in the app.
    await openRailTool(page, 'Countries');

    const body = page.locator('.tool-panel__body');
    const header = page.locator('.tool-rail__header');
    const footer = page.locator('.tool-rail__footer');
    const before = {
      header: await header.boundingBox(),
      footer: await footer.boundingBox(),
    };
    if (before.header === null || before.footer === null) {
      throw new Error('The pinned HUD blocks are not rendered.');
    }

    // There has to be something to scroll, or "it did not move" proves nothing.
    const overflow = await body.evaluate(
      (element): number => element.scrollHeight - element.clientHeight,
    );
    expect(
      overflow,
      'the panel body does not overflow, so this test cannot observe a scroll.',
    ).toBeGreaterThan(100);

    await body.hover();
    await page.mouse.wheel(0, 600);
    await expect
      .poll(async (): Promise<number> =>
        body.evaluate((element): number => element.scrollTop),
      )
      .toBeGreaterThan(0);

    const after = {
      header: await header.boundingBox(),
      footer: await footer.boundingBox(),
    };
    if (after.header === null || after.footer === null) {
      throw new Error('The pinned HUD blocks are not rendered.');
    }
    expect(Math.round(after.header.y)).toBe(Math.round(before.header.y));
    expect(Math.round(after.footer.y)).toBe(Math.round(before.footer.y));
    // The shell is 100dvh and declares no overflow: the window never scrolls.
    expect(await page.evaluate((): number => window.scrollY)).toBe(0);
  });

  /**
   * REWRITTEN by `03-09` for D-20. The original asserted a two-column and then
   * a single-column arrangement of `.workspace__*` sections that `03-05` and
   * `03-06` dissolved into the rail and its panel.
   *
   * What replaces it is D-20's actual contract: below 1200px the three-track
   * row becomes one column with the rail lying down as a bottom bar under the
   * canvas region - and the canvas is MOVED, never remounted, which is what
   * keeps Live Invariant 4 true across the transition.
   */
  /**
   * D4-07's cost to the rail, gated rather than assumed. The rail is NOT a
   * scroll container, so an overflow here means chrome is simply unreachable
   * with nothing on screen saying so.
   *
   * Two subjects, because either one alone passes while the other is broken:
   * the tools list must not clip internally, AND the rail box must fit the
   * viewport. The Phase 3 failure mode is the second - the tools list measured
   * clean at 540px while the pinned footer hung 12px below the fold.
   */
  const railOverflowAt = async (
    page: Page,
    height: number,
  ): Promise<{
    toolsScroll: number;
    toolsClient: number;
    railHeight: number;
    viewport: number;
    lastRowBottom: number;
  }> => {
    await page.setViewportSize({
      width: RAIL_HEIGHT_FLOOR_VIEWPORT.width,
      height,
    });
    return page.evaluate(() => {
      const tools = document.querySelector('.tool-rail__tools');
      const rail = document.querySelector('.tool-rail');
      const allRows = document.querySelectorAll('.tool-rail__row');
      const lastRow = allRows[allRows.length - 1];
      if (tools === null || rail === null || lastRow === undefined) {
        throw new Error('The rail, its tools list, or its last row is absent.');
      }
      return {
        toolsScroll: tools.scrollHeight,
        toolsClient: tools.clientHeight,
        railHeight: rail.getBoundingClientRect().height,
        viewport: window.innerHeight,
        lastRowBottom: lastRow.getBoundingClientRect().bottom,
      };
    });
  };

  test('fits all seven rail rows with no overflow at the measured height floor', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(RAIL_HEIGHT_FLOOR_VIEWPORT);
    await waitForApp(page);
    await expectLayout(page, 'desktop');

    const rows = page.locator('.tool-rail__row');
    expect(
      await rows.count(),
      'seven rows: five tools plus the two pinned history rows. If this is ' +
        'six, the map-style row is missing and every measurement below is of ' +
        'the Phase 3 rail.',
    ).toBe(7);

    const atFloor = await railOverflowAt(
      page,
      RAIL_HEIGHT_FLOOR_VIEWPORT.height,
    );

    expect(
      atFloor.toolsScroll,
      `the rail's tools list needs ${atFloor.toolsScroll}px but has ` +
        `${atFloor.toolsClient}px. The rail has no scroll container by design ` +
        '(a tooltip must escape the 48px column), so this is rows the creator ' +
        'cannot reach.',
    ).toBeLessThanOrEqual(atFloor.toolsClient);

    expect(
      Math.round(atFloor.railHeight),
      `the rail needs ${Math.round(atFloor.railHeight)}px at a ` +
        `${atFloor.viewport}px viewport. Anything above the viewport height is ` +
        'chrome below the fold - the pinned Export and theme controls first.',
    ).toBeLessThanOrEqual(atFloor.viewport);

    expect(
      atFloor.lastRowBottom,
      'the last rail row is below the fold at the stated floor.',
    ).toBeLessThanOrEqual(atFloor.viewport);

    /*
     * The discrimination control. Without it the floor could be any comfortably
     * large number and this test would still be green - which is how a "floor"
     * stops describing anything. One pixel below it, the rail must overflow.
     *
     * If this fails because the rail now FITS one pixel lower, that is an
     * improvement: lower `RAIL_HEIGHT_FLOOR_VIEWPORT` to the new measurement
     * rather than deleting the control.
     */
    const belowFloor = await railOverflowAt(
      page,
      RAIL_HEIGHT_FLOOR_VIEWPORT.height - 1,
    );
    expect(
      Math.round(belowFloor.railHeight),
      'the recorded floor is not tight - the rail still fits a pixel below ' +
        'it, so the number is describing nothing.',
    ).toBeGreaterThan(belowFloor.viewport);

    await page.setViewportSize(RAIL_HEIGHT_FLOOR_VIEWPORT);
    // The new row is reachable and opens its panel, not just present in the DOM.
    await openRailTool(page, 'Map style');
    await expect(page.locator('.map-editor')).toHaveAttribute(
      'data-panel-open',
      'true',
    );
  });

  test('the narrow layout collapses to a bottom bar without a second DOM', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await stampCameraOwnerSentinel(page);
    await expectOneCameraOwner(page);

    for (const viewport of [
      COMPACT_TWO_COLUMN_VIEWPORT,
      COMPACT_SINGLE_COLUMN_VIEWPORT,
    ]) {
      await page.setViewportSize(viewport);
      await expectLayout(page, 'compact');
      await expectLandmarks(page);
      // The same DOM node moved; it was not remounted as a second camera owner.
      await expectOneCameraOwner(page);
      await expect(page.locator('.map-editor')).toHaveAttribute(
        'data-layout',
        'compact',
      );

      const { rail, region } = await readShellGeometry(page);
      const label = `${viewport.width}x${viewport.height}`;

      // The rail is a full-width bar at the thumb end...
      expect(Math.round(rail.x), label).toBe(0);
      expect(Math.round(rail.width), label).toBe(viewport.width);
      expect(Math.round(rail.y + rail.height), label).toBe(viewport.height);
      // ...and the canvas region takes everything above it, with no gap and no
      // overlap: a bar drawn OVER the map would satisfy "the bar is at the
      // bottom" perfectly.
      expect(Math.round(region.x), label).toBe(0);
      expect(Math.round(region.y), label).toBe(0);
      expect(Math.round(region.y + region.height), label).toBe(
        Math.round(rail.y),
      );
    }

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await expectLayout(page, 'desktop');
    await expectOneCameraOwner(page);
    await expect(page.locator('.map-editor')).toHaveAttribute(
      'data-layout',
      'desktop',
    );
  });

  /**
   * D-20's bottom sheet: the ONE surface allowed to overlay the canvas. It
   * rises from just above the bar, it does not push the map, and its body stays
   * the single scroll container.
   */
  test('a tapped tool raises a bottom sheet over the map, above the bar', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForApp(page);

    const closed = await readShellGeometry(page);
    /*
     * The closed sheet is its own 1px top hairline and nothing else: the
     * registered height is 0 and the BODY is unmounted, which is the claim that
     * matters - a clipped 0px surface still holds live tab stops otherwise, and
     * that is a keyboard trap with nothing visible in it.
     */
    expect(closed.panel.height).toBeLessThanOrEqual(2);
    await expect(page.locator('.tool-panel__body')).toHaveCount(0);

    await openRailTool(page, 'Countries');
    await settleShell(page);
    const open = await readShellGeometry(page);

    // It OVERLAYS: the canvas region is exactly where it was.
    expect(Math.round(open.region.height)).toBe(Math.round(closed.region.height));
    expect(Math.round(open.region.y)).toBe(Math.round(closed.region.y));
    // It is a sheet: full width, real height, ending exactly at the bar.
    expect(Math.round(open.panel.width)).toBe(MOBILE_VIEWPORT.width);
    expect(open.panel.height).toBeGreaterThan(100);
    expect(Math.round(open.panel.y + open.panel.height)).toBe(
      Math.round(open.rail.y),
    );
    // And it is over the map, not beside it.
    expect(open.panel.y).toBeGreaterThan(open.region.y);
    expect(open.panel.y).toBeLessThan(open.region.y + open.region.height);

    const body = page.locator('.tool-panel__body');
    expect(
      await body.evaluate(
        (element): number => element.scrollHeight - element.clientHeight,
      ),
    ).toBeGreaterThan(0);
    expect(
      await body.evaluate(
        (element): string => getComputedStyle(element).overscrollBehavior,
      ),
    ).toBe('contain');
  });

  /**
   * REWRITTEN by `03-09`. Its overflow helper named eleven selectors, ALL of
   * which had been retired by `03-07`, so it measured an empty list and passed
   * at every viewport - and it asserted a three-row action strip that no longer
   * exists. The claim is re-pointed at the D-20 chrome and, more importantly,
   * the helper now measures elements that are actually on screen.
   */
  test('the complete UI contains at 360px with no overflow and full-size targets', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await waitForApp(page);
    await expectLayout(page, 'compact');
    await expectLandmarks(page);

    expect(await findHorizontalOverflow(page)).toStrictEqual([]);

    // D-32: the export frame is the square, and it fits.
    const frame = await page.locator('.map-frame').boundingBox();
    if (frame === null) {
      throw new Error('The export frame is not rendered.');
    }
    expect(frame.width).toBeCloseTo(frame.height, 0);
    expect(frame.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
    expect(frame.width).toBeGreaterThan(100);

    const undersized = (await measureTargets(page)).filter(
      (target): boolean =>
        ICON_ONLY_LABELS.has(target.label)
          ? target.height < COMPACT_TARGET_SIZE ||
            target.width < COMPACT_TARGET_SIZE
          : target.height < STANDARD_TARGET_HEIGHT,
    );
    expect(undersized).toStrictEqual([]);

    /*
     * D-20: `Export PNG` stays PINNED and visible in the bar. "Visible" is not
     * enough on its own - a control pushed under the fold is still `visible` to
     * a locator - so its rect is measured against the viewport too.
     */
    const exportButton = await page
      .getByRole('button', { name: 'Export PNG' })
      .boundingBox();
    if (exportButton === null) {
      throw new Error('Export is not composed in the bottom bar.');
    }
    expect(exportButton.width).toBeGreaterThanOrEqual(COMPACT_TARGET_SIZE);
    expect(exportButton.x).toBeGreaterThanOrEqual(0);
    expect(exportButton.x + exportButton.width).toBeLessThanOrEqual(
      MOBILE_VIEWPORT.width + 1,
    );
    expect(exportButton.y + exportButton.height).toBeLessThanOrEqual(
      MOBILE_VIEWPORT.height + 1,
    );

    /*
     * Every tool is still reachable at this width, and each one's landmark
     * control is measured rather than merely present. The country browser is
     * checked last because it is the longest content and therefore the one that
     * proves the panel body is the SINGLE scroll container.
     */
    await openRailTool(page, 'Saved Maps');
    await expect(page.getByRole('button', { name: 'Save Map' })).toBeVisible();
    await openRailTool(page, 'Legend');
    await expect(legendDisclosure(page)).toBeVisible();
    await openRailTool(page, 'Colors');
    await expect(
      page.getByRole('button', { name: 'Reset All Colors' }),
    ).toBeVisible();
    await openRailTool(page, 'Countries');
    await settleShell(page);

    expect(await findHorizontalOverflow(page)).toStrictEqual([]);
    expect(await findPanelScrollContainers(page)).toStrictEqual([
      'div.tool-panel__body',
    ]);
  });

  test('core controls stay usable at the 200% zoom equivalent viewport', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(ZOOM_200_EQUIVALENT_VIEWPORT);
    await waitForApp(page);
    await expectLayout(page, 'compact');
    await expectLandmarks(page);

    expect(await findHorizontalOverflow(page)).toStrictEqual([]);

    // UI-SPEC 20: the map may scale down; typography does not.
    const labelFontSize = await page
      .getByRole('button', { name: 'Undo Color Change' })
      .evaluate((element): string => getComputedStyle(element).fontSize);
    expect(labelFontSize).toBe('14px');

    /*
      `03-06` moved these behind rail tools: Undo/Redo are rail rows, Export is
      the HUD footer, `Reset View` is the canvas region, and `Save or Load
      Maps` / `Reset All Colors` live in the `saved` and `colors` panels. Every
      one is still reachable - the tool it lives in is opened first. `03-09`
      owns the wider rewrite of this file (CF-3); this is the minimal repair
      that keeps its red list at the 12 it already owned rather than growing it.
    */
    for (const name of ['Undo Color Change', 'Redo Color Change', 'Export PNG', 'Reset View']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
    await openRailTool(page, 'Saved Maps');
    await expect(page.getByRole('button', { name: 'Save Map' })).toBeVisible();
    await openRailTool(page, 'Colors');
    await expect(
      page.getByRole('button', { name: 'Reset All Colors' }),
    ).toBeVisible();
  });

  /**
   * REWRITTEN by `03-09`, and the rewrite drops half the claim on purpose.
   *
   * "Below the square" stopped being true when D-21 moved the cluster into the
   * letterbox gutter INSIDE `.map-workspace__canvas`, and repairing the
   * measurement here would have re-asserted a placement no decision supports.
   * `navigation.spec.ts`'s assertion 12 is the replacement for the geometry -
   * non-intersection with `.map-frame` at every gate viewport x every legend
   * preset, which is strictly stronger than "below".
   *
   * What stays here is the EXPORT-MEMBERSHIP half, which assertion 12 does not
   * make: placement, not `data-editor-only`, is what keeps chrome out of every
   * PNG, and the export clones `svg.map-canvas`.
   */
  test('the map navigation cluster is a sibling of the export source, never inside it', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);

    await expect(
      page.locator('.map-workspace__canvas > .map-navigation'),
    ).toHaveCount(1);
    await expect(page.locator('.map-export-source .map-navigation')).toHaveCount(
      0,
    );
    await expect(page.locator('svg.map-canvas .map-navigation')).toHaveCount(0);
    // The mirror image of the same rule: the legend must be INSIDE that SVG.
    await expect(page.locator('svg.map-canvas > [data-layer="legend"]')).toHaveCount(
      1,
    );

    /*
     * Placement is the primary guard, so it is asserted as an ORDER rather
     * than as an attribute: the cluster renders after `div.map-export-source`
     * in the region. `data-editor-only` is the second line of defence and
     * would only help if the cluster were in the clone at all.
     */
    const order = await page.evaluate((): ReadonlyArray<string> => {
      const region = document.querySelector('.map-workspace__canvas');
      if (region === null) {
        throw new Error('The canvas region is not rendered.');
      }
      return [...region.children].map((child): string =>
        child.classList.contains('map-export-source')
          ? 'export-source'
          : child.classList.contains('map-navigation')
            ? 'navigation'
            : 'other',
      );
    });
    expect(order.indexOf('navigation')).toBeGreaterThan(
      order.indexOf('export-source'),
    );
    expect(order.indexOf('export-source')).toBeGreaterThanOrEqual(0);

    await expect(page.locator('.map-navigation')).toHaveAttribute(
      'data-editor-only',
      'true',
    );
  });

  /*
   * DELETED by `03-09`: "the navigation cluster never overlaps the legend at
   * any legend position".
   *
   * Superseded in substance, not dropped. The legend lives inside the export
   * frame, so `navigation.spec.ts`'s assertion 12 - non-intersection with
   * `.map-frame` at every gate viewport x every legend preset, enumerated
   * two-way from `LEGEND_CORNER_OPTIONS` - implies non-intersection with the
   * legend at every preset and covers four more viewports than this ever did.
   * Keeping a weaker second copy here would have meant maintaining the
   * `openRailTool` + disclosure flow and the panel-settle poll twice.
   */
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
    // The inspector column is gone; the tool panel is where these controls
    // live now, and the Colors panel is the one that holds the preset grid.
    await openRailTool(page, 'Colors');

    const clipped = await page.evaluate((): ReadonlyArray<string> => {
      const failures: string[] = [];

      const inspector = document.querySelector('.tool-panel__content');
      if (inspector === null) {
        throw new Error('The tool panel is not composed.');
      }
      if (inspector.scrollWidth > inspector.clientWidth) {
        failures.push(
          `inspector scrolls horizontally: ${inspector.scrollWidth} > ${inspector.clientWidth}`,
        );
      }

      /*
       * `04-07`: the ten-tile preset grid is gone. The equivalent claim on the
       * surface that replaced it is that the ramp family PILLS wrap rather than
       * being clipped - `Purples` is the longest shipped name - and that no
       * segment of the strip escapes the band that clips it.
       */
      document.querySelectorAll('.panel-pill').forEach((pill): void => {
        if (pill.scrollWidth > Math.ceil(pill.getBoundingClientRect().width)) {
          failures.push(`ramp family pill clipped: ${pill.textContent ?? ''}`);
        }
      });

      const strip = document.querySelector('.ramp-strip');
      if (strip !== null) {
        const stripBox = strip.getBoundingClientRect();
        strip.querySelectorAll('.ramp-strip__step').forEach((step): void => {
          const stepBox = step.getBoundingClientRect();
          if (
            stepBox.right > stripBox.right + 0.5 ||
            stepBox.left < stripBox.left - 0.5
          ) {
            failures.push('a ramp segment overflows its band');
          }
        });
      }

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

  /*
   * DELETED by `03-09`: "the desktop app bar carries the global actions in the
   * declared order" and "the desktop focus order runs bar, composition bar,
   * map, navigation, inspector".
   *
   * Both were claims about `.app > header`, which `03-05` retired as a
   * container - not assertions that broke, assertions whose SUBJECT stopped
   * existing. Repairing them would have meant inventing a bar to assert.
   *
   * Their replacements are landed and passing in `tests/e2e/rail.spec.ts`:
   * `runs the spec'd focus order, with disabled controls removed` (which also
   * covers the half a documented deviation would skip - the controls a
   * `disabled` state removes from the sequence) and `assertion 15: one Reset
   * View, one Reset All Colors, one filled action`. Deleting rather than
   * skipping, because a skipped gate is a gate that cannot fail wearing a
   * different hat.
   */

  /**
   * REWRITTEN by `03-09` for D-20, and the claim is now the LOAD-BEARING half
   * of the bottom bar: the rail paints at the thumb end through `grid-row: 2`
   * and keeps its DOM position, so the focus order is layout-INVARIANT.
   *
   * That is worth its own gate. Moving the bar with `order` or by reordering
   * the composition root would look identical on screen and would silently put
   * the camera controls, the map, and the help card ahead of the tools at every
   * narrow width - which is precisely the class of regression UI-SPEC 20 exists
   * to pin, and one that no visual check catches.
   */
  test('the narrow focus order is the desktop order, unchanged by the bar', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);

    /*
     * `waitForApp` dismisses onboarding, and App then moves focus to the map
     * from a `requestAnimationFrame` callback. Resetting the sequential
     * starting point before that callback runs lets the map take it straight
     * back, and the walk silently begins at the camera cluster instead of at
     * the rail - an order that looks plausible and is not the spec'd one.
     * Waiting for the app's own focus to land first is what makes the reset
     * deterministic.
     */
    await expect
      .poll(async (): Promise<string> =>
        page.evaluate((): string => document.activeElement?.tagName ?? ''),
      )
      .toBe('path');

    // `collectTabOrder` resets the sequential starting point itself; see the
    // helper for why blurring is not enough.
    const restart = async (): Promise<ReadonlyArray<string>> =>
      collectTabOrder(page, 24);

    const desktop = await restart();
    expect(desktop.slice(0, RAIL_TAB_STOPS.length)).toEqual([
      ...RAIL_TAB_STOPS,
    ]);

    await page.setViewportSize(MOBILE_VIEWPORT);
    await expectLayout(page, 'compact');
    const compact = await restart();
    const at = positionIn(compact);

    // The bar paints last and focuses first: byte-identical to the desktop
    // sequence, which is the whole point of placing it with `grid-row`.
    expect(compact.slice(0, RAIL_TAB_STOPS.length)).toEqual([
      ...RAIL_TAB_STOPS,
    ]);

    /*
     * And the canvas region still follows the rail. UI-SPEC 20 orders the map
     * before its camera controls, so a cluster that drifted ahead of the map it
     * controls fails here rather than reading as a placement preference.
     */
    const country = compact.findIndex((label): boolean =>
      label.startsWith('Afghanistan, current color'),
    );
    expect(country, `no country in the tab order: ${compact.join(' > ')}`)
      .toBeGreaterThanOrEqual(0);
    expect(country).toBeGreaterThan(at('Switch to dark theme'));
    expect(country).toBeLessThan(at('Zoom In'));
    expect(at('Zoom In')).toBeLessThan(at('Move Map'));

    /*
     * Natively disabled controls are ABSENT rather than reachable no-ops
     * (UI-SPEC 8). `Zoom Out` is disabled at the whole-world fit and Undo,
     * Redo, and Reset All Colors are disabled with no colour history yet -
     * asserting their absence is the difference between knowing why a label is
     * missing and not noticing.
     */
    [
      'Zoom Out',
      'Undo Color Change',
      'Redo Color Change',
      'Reset All Colors',
    ].forEach((label): void => {
      expect(compact).not.toContain(label);
    });
  });

  test('every disabled action in the narrow bar is natively disabled', async ({
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

    for (const name of ['Undo Color Change', 'Redo Color Change']) {
      await expect(page.getByRole('button', { name })).toBeDisabled();
    }
    await openRailTool(page, 'Colors');
    await expect(
      page.getByRole('button', { name: 'Reset All Colors' }),
    ).toBeDisabled();
  });
});

test.describe('theme and preference behaviour', (): void => {
  /**
   * REWRITTEN by `03-09` (D-35, CF-6), not repaired.
   *
   * The old version flipped the OS colour-scheme through `page.emulateMedia`
   * and read `.map-workspace__square`. Neither is a live claim: `03-03`
   * renamed the region to `.map-workspace__canvas`, and D-30 moved the dark
   * flip onto a `.dark` class on the editor mount root with NO stylesheet
   * reading the operating-system query at all. Emulating the OS preference
   * therefore changes nothing in the page - the assertion would have gone on
   * passing while proving nothing, which is this repo's recorded worst failure
   * mode for a gate.
   *
   * The theme axis is driven through the SHIPPED control instead, so the gate
   * exercises the path a creator uses rather than a test-only backdoor.
   */
  test('the dark theme class restyles chrome and leaves the composition surface fixed', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);

    /*
     * Country paths carry a 150ms stroke transition and the mount root
     * crossfades its wall on `--motion-duration-slow`, so an immediate read
     * after a theme flip samples a colour that is on its way somewhere.
     */
    const readSurfaces = async (): Promise<ThemeSurfaces> => {
      await settleThemeSurfaces(page);
      return readThemeSurfaces(page);
    };

    const light = await readSurfaces();
    await setEditorTheme(page, 'dark');
    const dark = await readSurfaces();

    // Chrome follows the creator's choice...
    expect(dark.wall).not.toBe(light.wall);
    expect(dark.ink).not.toBe(light.ink);
    // ...and the exportable composition does not (Live Invariant 9).
    expect(dark.region).toBe(light.region);
    expect(dark.region).toBe('rgb(255, 255, 255)');
    expect(dark.canvas).toBe(light.canvas);
    expect(dark.border).toBe(light.border);

    // And back: a one-way check would pass against a toggle that latches.
    await setEditorTheme(page, 'light');
    const relit = await readSurfaces();
    expect(relit.wall).toBe(light.wall);
    expect(relit.region).toBe(light.region);
  });

  /**
   * D (task 1): the emulation is genuinely gone, asserted rather than assumed.
   * A leftover `colorScheme` call is harmless on its own and deeply misleading
   * - the next reader takes it as evidence the theme axis is covered.
   */
  test('drives the theme by class and never by an operating-system query', async (): Promise<void> => {
    const source = await readFile(resolve('tests/e2e/responsive.spec.ts'), 'utf8');

    expect(
      /emulateMedia\(\s*\{[^}]*colorScheme/u.test(source),
      'D-30 forbids the colour-scheme query; emulating it changes nothing in ' +
        'this app, so a theme axis built on it is a gate that cannot fail.',
    ).toBe(false);
    expect(source).toContain(THEME_TOGGLE_LABELS.dark);
    expect(source).toContain(THEME_TOGGLE_LABELS.light);

    /*
     * And the other half of the same rule: Playwright cannot emulate
     * `prefers-reduced-transparency`, so simulating it here and reporting the
     * result would be labelling a fiction as browser evidence. The real
     * assertion is static, in `uiContract.test.ts`, and the physical cell
     * belongs to the owner acceptance matrix.
     */
    expect(
      /emulateMedia\(\s*\{[^}]*[Rr]educedTransparency/u.test(source),
      'emulation a browser does not support is not evidence.',
    ).toBe(false);
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

  /**
   * REWRITTEN by `03-09`. The token half was fine; the third assertion read
   * `.map-workspace__square`, renamed by `03-03`, and `querySelector(...) as
   * Element` on a missing node made the whole `page.evaluate` throw - so the
   * two assertions that WOULD have passed never ran either. A probe that
   * throws before its assertions is a gate that cannot fail, wearing an error
   * message.
   *
   * The observable half is re-pointed at boundaries that still exist, and it
   * is checked in BOTH modes: D-30 authors the preference block after the
   * palette at equal specificity, so a literal written for one mode silently
   * wins in the other - the defect that once painted a light bar under light
   * text at 1.0:1 for the user who asked for MORE contrast.
   */
  test('increased-contrast preference strengthens boundaries and focus rings in both modes', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ contrast: 'more' });
    await waitForApp(page);
    /*
     * `Map style` rather than `Colors` since `04-07`: the swatch this probe
     * reads is the shared `.panel-swatch`, and after the preset grid was
     * deleted the only one always rendered is the water pill's. Re-pointed
     * rather than dropped - a `querySelector` that returns null makes the whole
     * `page.evaluate` throw, which is precisely the "gate wearing an error
     * message" this test was rewritten to stop being.
     */
    await openRailTool(page, 'Map style');

    const probe = async (): Promise<Record<string, string>> =>
      page.evaluate((): Record<string, string> => {
        const mount = document.querySelector('.map-editor');
        const rail = document.querySelector('.tool-rail');
        const panel = document.querySelector('.tool-panel');
        const swatch = document.querySelector('.panel-swatch');
        if (
          mount === null ||
          rail === null ||
          panel === null ||
          swatch === null
        ) {
          throw new Error('The editor shell is not rendered.');
        }
        const tokens = getComputedStyle(mount);
        return {
          border: tokens.getPropertyValue('--border-width').trim(),
          focus: tokens.getPropertyValue('--focus-width').trim(),
          // The declared weight is only real if a painted boundary reads it.
          rail: getComputedStyle(rail).borderInlineEndWidth,
          panel: getComputedStyle(panel).borderInlineEndWidth,
          swatch: getComputedStyle(swatch).borderTopWidth,
        };
      });

    const light = await probe();
    expect(light.border).toBe('2px');
    expect(light.focus).toBe('3px');
    expect(light.rail).toBe('2px');
    expect(light.panel).toBe('2px');
    expect(light.swatch).toBe('2px');

    await setEditorTheme(page, 'dark');
    const dark = await probe();
    expect(dark, 'the preference block answers for only one mode').toStrictEqual(
      light,
    );
  });

  /**
   * REWRITTEN by `03-09`. Its subject was the `--glass-*` family, which D-06
   * DELETED outright - there is no glass surface left to drop to opaque, and
   * the two selectors it read (`.app > header`, `.workspace__control-column`)
   * were both retired, so it asserted a length of 2 against an empty list.
   *
   * What forced colors actually has to do here now: hand every paint decision
   * to the user agent by removing the effects a forced palette cannot express,
   * and strengthen the two weights. `backdrop-filter` is asserted absent
   * everywhere rather than "0 on two surfaces", because D-06 banned it
   * outright and a ban is an ownership claim, not a per-surface one.
   */
  test('forced-colors preference removes the effects a forced palette cannot express', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.emulateMedia({ forcedColors: 'active' });
    await waitForApp(page);
    await openRailTool(page, 'Colors');

    const forced = await page.evaluate((): {
      readonly border: string;
      readonly focus: string;
      readonly hairline: string;
      readonly popover: string;
      readonly dialog: string;
      readonly backdrops: ReadonlyArray<string>;
      readonly railEdge: string;
      readonly panelEdge: string;
    } => {
      const mount = document.querySelector('.map-editor');
      const rail = document.querySelector('.tool-rail');
      const panel = document.querySelector('.tool-panel');
      if (mount === null || rail === null || panel === null) {
        throw new Error('The editor shell is not rendered.');
      }
      const tokens = getComputedStyle(mount);
      const backdrops: string[] = [];

      document.querySelectorAll('.map-editor, .map-editor *').forEach(
        (element): void => {
          const backdrop = getComputedStyle(element).backdropFilter;
          if (backdrop !== '' && !/^(?:none|blur\(0(?:px)?\))$/u.test(backdrop)) {
            backdrops.push(`${element.className}: ${backdrop}`);
          }
        },
      );

      return {
        border: tokens.getPropertyValue('--border-width').trim(),
        focus: tokens.getPropertyValue('--focus-width').trim(),
        hairline: tokens.getPropertyValue('--hairline').trim(),
        popover: tokens.getPropertyValue('--popover-shadow').trim(),
        dialog: tokens.getPropertyValue('--dialog-shadow').trim(),
        backdrops,
        railEdge: getComputedStyle(rail).borderInlineEndWidth,
        panelEdge: getComputedStyle(panel).borderInlineEndWidth,
      };
    });

    expect(forced.hairline).toBe('none');
    expect(forced.popover).toBe('none');
    expect(forced.dialog).toBe('none');
    // D-06 banned `backdrop-filter` outright; forced colors is where a
    // surviving one would be most obviously wrong.
    expect(forced.backdrops).toStrictEqual([]);

    /*
     * The weights are the OBSERVABLE half, and they are observable precisely
     * because forced colors does not touch them: the user agent overrides
     * colour, so a boundary that survives has to survive at the width the
     * token asks for. A `1px solid` literal opts out here with nothing else
     * failing.
     *
     * A shadow sweep was written here first and DELETED after it was probed:
     * Chrome removes every `box-shadow` in forced-colors mode itself, so
     * "nothing paints a shadow" is guaranteed by the user agent and stays
     * green against a rule that hard-codes one. It read as proof of the three
     * token assertions above and proved nothing about them.
     */
    expect(forced.border).toBe('2px');
    expect(forced.focus).toBe('3px');
    expect(forced.railEdge).toBe('2px');
    expect(forced.panelEdge).toBe('2px');
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

/**
 * `Reds` step 4 on the ramp strip, and therefore what must reach the PNG.
 * `04-07` replaced the ten-tile preset grid with the ramp model; this is the
 * nearest shade to the `Apply Red` preset the probe used to click.
 */
const APPLIED_RED: readonly [number, number, number] = [0xde, 0x2d, 0x26];

/**
 * The map does not fill the square edge to edge, but it is never a hairline
 * either. Well under a percent of the frame means the composition did not
 * rasterize.
 */
const MIN_NON_WHITE_PIXELS = 10_000;
/** France at the whole-world fit is small, but it is not a dozen pixels. */
const MIN_APPLIED_RED_PIXELS = 200;

/**
 * REWRITTEN by `03-09` (D-35). The theme axis was `colorScheme` on the browser
 * context; after D-30 that emulation changes nothing in this app, so the three
 * exports became trivially identical and Live Invariant 9's only browser-level
 * guard silently stopped guarding. `theme` now drives the shipped toggle.
 *
 * The other two axes are unchanged and are still REAL emulations: forced
 * colors and device pixel ratio both genuinely alter what the browser paints.
 */
async function probeExportedPng(
  browser: Browser,
  options: BrowserContextOptions,
  theme: EditorTheme,
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
    await setEditorTheme(page, theme);

    const france = page.locator('path.country-path[data-country-id="FRA"]');
    await france.focus();
    await france.press('Enter');
    await openRailTool(page, 'Colors');
    await applyRampRed(page);
    await expect(page.locator('[data-layer="legend"] text')).toHaveText(
      '#DE2D26',
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
    const baseline = await probeExportedPng(
      browser,
      { deviceScaleFactor: 1 },
      'light',
    );
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
      'the applied #DE2D26 fill did not reach the PNG.',
    ).toBeGreaterThan(MIN_APPLIED_RED_PIXELS);

    const dark = await probeExportedPng(
      browser,
      { deviceScaleFactor: 3 },
      'dark',
    );
    const forced = await probeExportedPng(
      browser,
      { forcedColors: 'active', deviceScaleFactor: 2 },
      'light',
    );

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
