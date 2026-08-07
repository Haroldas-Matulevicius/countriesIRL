import { expect, test, type Page } from '@playwright/test';

import { MAP_VIEWBOX_SIZE } from '../../src/constants/config';
import { DEFAULT_COMPOSITION_SETTINGS } from '../../src/constants/mapStyle';
import { BAND_DEFAULT_HEIGHT, resolveBandExtents } from '../../src/utils/bands';
import {
  LEGEND_BAR_WIDTH,
  LEGEND_SAFE_INSET,
  LEGEND_SWATCH_SIZE,
  createDefaultLegendState,
  reconcileLegend,
  resolveLegendRender,
} from '../../src/utils/legend';
import {
  RAMP_RED_HEX,
  RAMP_RED_STEP,
  applyRampRed,
  applyRampShade,
  legendDisclosure,
  openRailTool,
  waitForApp,
} from './support/appHarness';
/*
 * `04-13`: the SHARED decode path. `04-12` put its per-property PNG gate in
 * `export.spec.ts` because every counter was private there; `04-13` moved them
 * into `support/pngProbe.ts` instead, so this spec and `export.spec.ts` run
 * every pixel claim through one `createImageBitmap`.
 */
import {
  DARK_INK_THRESHOLD,
  countInkAroundRegion,
  expectBlankControlReadsZeroInk,
  expectRegionInsideFrame,
  exportRealAppPng,
  hexToRgb,
  readPngDimensions,
  samplePngPoints,
} from './support/pngProbe';
import type { PngRegion } from './support/pngProbe';

/**
 * DERIVED floors, not round numbers.
 *
 * A one-entry bar at the default text size is a 48 x 32 segment plus a ~7
 * character boundary label at 32 units — well over 1,500 painted pixels. The
 * floor is set at 400, comfortably under a quarter of that, so it catches
 * "the legend did not render" without being sensitive to anti-aliasing or to a
 * later change in the label.
 */
const MIN_LEGEND_INK_PIXELS = 400;
/**
 * A sampled column runs the full height of a two-mark stack: 64 units for the
 * bar, 104 for rows. Half of the SMALLER is the floor, so a column that
 * sampled paper the whole way down cannot pass as "no gap".
 */
const MIN_SAMPLED_COLUMN_INK = 32;

const LEGEND_FIXTURE_URL = '/tests/e2e/fixtures/legend.html';
const RED = '#DC2626';
const BLUE = '#2563EB';
const HISTORICAL = '#B45309';
const CANVAS_SIZE = 1080;
const SAFE_INSET = 32;

interface LegendFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

async function readLegendFrame(
  page: import('@playwright/test').Page,
): Promise<LegendFrame> {
  return page
    .locator('g[data-layer="legend"]')
    .evaluate((element): LegendFrame => {
      /*
       * D4-11 removed the background rect this used to read. The hit target
       * carries the SAME `layout.width` / `layout.height`, and it is the one
       * rect whose box is the legend's box rather than a swatch's — reading
       * `querySelector('rect')` now returns a 24x24 swatch and would silently
       * shrink every containment assertion in this file to something trivially
       * true.
       */
      const frame = element.querySelector('[data-editor-only="true"]');
      const transform = element.getAttribute('transform') ?? '';
      const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform);
      if (frame === null || match === null) {
        throw new Error(`Legend frame is unavailable: ${transform}`);
      }
      return {
        x: Number(match[1]),
        y: Number(match[2]),
        width: Number(frame.getAttribute('width')),
        height: Number(frame.getAttribute('height')),
      };
    });
}

function expectInsideExportFrame(frame: LegendFrame): void {
  expect(frame.x).toBeGreaterThanOrEqual(SAFE_INSET);
  expect(frame.y).toBeGreaterThanOrEqual(SAFE_INSET);
  expect(frame.x + frame.width).toBeLessThanOrEqual(CANVAS_SIZE - SAFE_INSET);
  expect(frame.y + frame.height).toBeLessThanOrEqual(CANVAS_SIZE - SAFE_INSET);
}

async function dragLegendToRightEdge(
  page: import('@playwright/test').Page,
): Promise<void> {
  const moveTarget = page.getByRole('button', { name: 'Move legend' });
  const canvas = page.locator('svg[data-legend-canvas="true"]');
  const handleBox = await moveTarget.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (handleBox === null || canvasBox === null) {
    throw new Error('Legend drag targets are not measurable.');
  }

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvasBox.x + canvasBox.width - 2,
    handleBox.y + handleBox.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
}

async function openLegend(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(LEGEND_FIXTURE_URL);
  await expect(page.getByRole('button', { name: /Legend/ })).toContainText(
    '3 entries · Top left',
  );
  await page.getByRole('button', { name: /Legend/ }).click();
  await expect(page.getByLabel(`Legend label for ${RED}`)).toBeVisible();
}

test.describe('legend browser interactions', (): void => {
  test('legend label commit, Escape restore, and keyboard reorder retain focus', async ({
    page,
  }): Promise<void> => {
    await openLegend(page);

    const redLabel = page.getByLabel(`Legend label for ${RED}`);
    await redLabel.fill('Allies');
    await redLabel.press('Enter');
    await expect(redLabel).toHaveValue('Allies');
    await expect(page.locator('g[data-layer="legend"] text')).toContainText([
      'Allies',
    ]);

    await redLabel.fill('Uncommitted draft');
    await redLabel.press('Escape');
    await expect(redLabel).toHaveValue('Allies');

    const redRow = page.locator(`[data-legend-row-color="${RED}"]`);
    await redRow.getByRole('button', { name: 'Move Down' }).click();
    await expect(redRow).toBeFocused();
    await expect(
      page.locator('[data-legend-row-color]').nth(1),
    ).toHaveAttribute('data-legend-row-color', RED);
    await expect(page.locator('[data-status="true"]')).toHaveText(
      'Moved Allies to position 2 of 3.',
    );

    await redRow.press('Alt+ArrowUp');
    await expect(redRow).toBeFocused();
    await expect(
      page.locator('[data-legend-row-color]').first(),
    ).toHaveAttribute('data-legend-row-color', RED);
  });

  test('legend pointer reorder and drag stay isolated from the map camera', async ({
    page,
  }): Promise<void> => {
    await openLegend(page);

    const redHandle = page.getByRole('button', {
      name: 'Drag #DC2626 to reorder',
    });
    const historicalRow = page.locator(
      `[data-legend-row-color="${HISTORICAL}"]`,
    );
    await redHandle.dragTo(historicalRow);
    await expect(
      page.locator('[data-legend-row-color]').last(),
    ).toHaveAttribute('data-legend-row-color', RED);

    const moveTarget = page.getByRole('button', { name: 'Move legend' });
    const before = await page.locator('[data-position="true"]').textContent();
    const box = await moveTarget.boundingBox();
    if (box === null) {
      throw new Error('Legend move target was not measurable.');
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2 + 24);
    await page.mouse.up();

    await expect(page.locator('[data-position="true"]')).not.toHaveText(
      before ?? '',
    );
    await expect(page.locator('[data-position="true"]')).toContainText('Custom');
    await expect(page.locator('[data-camera-events="true"]')).toHaveText('0');

    await moveTarget.focus();
    const customBefore = await page.locator('[data-position="true"]').textContent();
    await moveTarget.press('ArrowRight');
    await expect(page.locator('[data-position="true"]')).not.toHaveText(
      customBefore ?? '',
    );
    await page.getByRole('button', { name: 'Nudge Right' }).click();
    await expect(page.locator('[data-status="true"]')).toHaveText(
      'Legend position updated.',
    );

    await page.getByLabel('Top left').check();
    await expect(page.locator('[data-position="true"]')).toHaveText(
      '32,32,Top left',
    );
    await expect(page.locator('[data-status="true"]')).toHaveText(
      'Legend moved to Top left.',
    );
  });

  test('the legend has no box chrome, only text size survives, and editor-only export cleanup is exact', async ({
    page,
  }): Promise<void> => {
    await openLegend(page);

    await expect(page.locator('[data-historical-color="true"]')).toHaveText(
      HISTORICAL,
    );
    await expect(page.getByLabel(`Legend label for ${HISTORICAL}`)).toHaveValue(
      HISTORICAL,
    );

    /*
     * D4-11. The three chrome controls are asserted ABSENT, by the accessible
     * names and the input type they had — a deleted `check()` call proves
     * nothing, and these reopen the moment a theme picker, an opacity slider,
     * or a border picker returns.
     */
    await expect(page.getByLabel('Legend theme')).toHaveCount(0);
    await expect(page.getByLabel('Legend border')).toHaveCount(0);
    await expect(page.locator('input[type="range"]')).toHaveCount(0);
    await expect(page.getByLabel('Dark')).toHaveCount(0);
    await expect(page.getByLabel('Strong')).toHaveCount(0);

    // The one surviving style control still works end to end.
    await page.getByLabel('Large').check();
    await expect(page.locator('[data-style="true"]')).toHaveText('large');

    /*
     * The rendered legend: bare marks and type. Every remaining rect inside
     * the layer is a swatch at the swatch size — a background panel would be
     * wider than a swatch and this goes red on it — and no rect carries a
     * `fill-opacity` or a border stroke.
     */
    const legendGroup = page.locator('g[data-layer="legend"]');
    const painted = legendGroup.locator('rect:not([data-editor-only])');
    await expect(painted).toHaveCount(3);
    const paintedBoxes = await painted.evaluateAll(
      (nodes: Element[]): ReadonlyArray<Record<string, string | null>> =>
        nodes.map((node) => ({
          width: node.getAttribute('width'),
          fillOpacity: node.getAttribute('fill-opacity'),
          stroke: node.getAttribute('stroke'),
        })),
    );
    expect(paintedBoxes).toEqual([
      { width: '24', fillOpacity: null, stroke: '#9CA3AF' },
      { width: '24', fillOpacity: null, stroke: '#9CA3AF' },
      { width: '24', fillOpacity: null, stroke: '#9CA3AF' },
    ]);
    /*
     * ⚠ The ORDINAL is gone (`04-13`). This read `locator('text').first()`,
     * which was unambiguous while a legend `<text>` could only be an entry
     * label. The bar form adds a CAPTION as the first text in the layer, and
     * `04-12` shipped three helpers that silently retargeted onto the wrong
     * element for exactly this reason. Asserting EVERY text carries the one
     * composition ink is both stronger and ordinal-free.
     */
    const inks = await legendGroup
      .locator('text')
      .evaluateAll((nodes: Element[]): ReadonlyArray<string | null> =>
        nodes.map((node): string | null => node.getAttribute('fill')),
      );
    expect(inks.length, 'the legend rendered no type at all').toBe(3);
    expect(new Set(inks)).toEqual(new Set(['#111827']));

    /*
     * `04-13`: the rows swatch is FLAT, matching a bar segment. The reference
     * uses flat marks and this is the restyle the owner asked for — row 6 of
     * `04-12`'s open-property table.
     */
    expect(
      await painted.evaluateAll((nodes: Element[]): ReadonlyArray<string | null> =>
        nodes.map((node): string | null => node.getAttribute('rx')),
      ),
    ).toEqual([null, null, null]);
    await expect(page.locator('[data-editor-only]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Export PNG' }).click();
    await expect(page.locator('[data-export-editor-only="true"]')).toHaveText('0');
    await expect(page.locator('[data-status="true"]')).toHaveText(
      'PNG downloaded at 1080 × 1080.',
    );
  });

  test('non-fitting labels and more than 30 colors block export without omissions', async ({
    page,
  }): Promise<void> => {
    await openLegend(page);

    await page.getByLabel('Large').check();
    const redLabel = page.getByLabel(`Legend label for ${RED}`);
    await redLabel.fill('12345678901234567890123456789012');
    await redLabel.press('Enter');
    await expect(page.getByText('Shorten this label so it fits in the exported legend.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeDisabled();

    // 10 characters: within two 'large' lines under the Inter-derived wrap
    // (6/line). 'Readable label' (14) is now blocked at 'large' by design;
    // re-baselined deliberately by 03-11 (D-25/OQ-5).
    await redLabel.fill('Neat label');
    await redLabel.press('Enter');
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeEnabled();

    await page.getByRole('button', { name: 'Use 31 colors' }).click();
    await expect(
      page.getByText(
        'This map uses more than 30 legend colors. Reduce the number of colors so every label stays readable in the export.',
      ),
    ).toBeVisible();
    await expect(page.locator('[data-legend-row-color]')).toHaveCount(31);
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(31);
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeDisabled();

    await page.getByRole('button', { name: 'Use standard colors' }).click();
    await expect(page.locator('[data-legend-row-color]')).toHaveCount(3);
    await expect(page.getByLabel(`Legend label for ${BLUE}`)).toBeVisible();
  });

  test('a legend parked at the right edge never leaves the export frame when a column is added', async ({
    page,
  }): Promise<void> => {
    await page.goto(LEGEND_FIXTURE_URL);

    // 8 colors: one column. RE-BASELINED by `04-13`: the rows form lost
    // `LEGEND_INTERNAL_PADDING` (24 a side) in the restyle-to-the-bar, so the
    // width is 288, not 336, and the far-right legal x is 760, not 712.
    await page.getByRole('button', { name: 'Use 8 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(8);
    await dragLegendToRightEdge(page);

    const oneColumn = await readLegendFrame(page);
    expect(oneColumn.width).toBe(288);
    expect(oneColumn.x).toBe(760);
    expectInsideExportFrame(oneColumn);
    await expect(page.locator('[data-position="true"]')).toContainText('Custom');

    // The 9th color reflows to two columns (width 600): the stored x of 760
    // would put 232 units of the legend outside the 1080 viewBox, and the
    // export used to succeed anyway.
    await page.getByRole('button', { name: 'Use 9 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(9);

    const twoColumns = await readLegendFrame(page);
    expect(twoColumns.width).toBe(600);
    expect(twoColumns.x).toBe(448);
    expectInsideExportFrame(twoColumns);

    // 16 -> 17 is the worse step: three columns (width 912) leave only x <= 136.
    await page.getByRole('button', { name: 'Use 16 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(16);
    await dragLegendToRightEdge(page);
    expectInsideExportFrame(await readLegendFrame(page));

    await page.getByRole('button', { name: 'Use 17 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(17);

    const threeColumns = await readLegendFrame(page);
    expect(threeColumns.width).toBe(912);
    expect(threeColumns.x).toBe(136);
    expectInsideExportFrame(threeColumns);

    /*
     * The export gate stays clear (no invalid-position), and the clone the
     * exporter captures carries the whole legend, not a clipped one.
     *
     * D4-11 re-baseline, deliberate: the clone no longer contains a background
     * rect to read a frame off, so the fixture reports the MEASURED union of
     * the surviving swatch boxes plus their count. That is a measurement of
     * the clone rather than a restatement of the derivation the position came
     * from — a clipped clone reports fewer swatches and a smaller extent.
     */
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeEnabled();
    await page.getByRole('button', { name: 'Export PNG' }).click();
    const exported = await page
      .locator('[data-export-legend-frame="true"]')
      .textContent();
    const [inkX, inkY, inkWidth, inkHeight, swatchCount] = (exported ?? '')
      .split(',')
      .map(Number);

    expect(swatchCount, 'the clone lost legend entries').toBe(17);
    expect(inkX).toBeGreaterThanOrEqual(threeColumns.x);
    expect(inkY).toBeGreaterThanOrEqual(threeColumns.y);
    expect(inkWidth).toBeGreaterThan(0);
    expect(inkHeight).toBeGreaterThan(0);
    // Bounded to the 1080 frame absolutely, never to a box derived from the
    // legend's own layout (the 04-11 phantom-pixel shape).
    expect(inkX + inkWidth).toBeLessThanOrEqual(CANVAS_SIZE - SAFE_INSET);
    expect(inkY + inkHeight).toBeLessThanOrEqual(CANVAS_SIZE - SAFE_INSET);
  });

  test('a preset legend tracks its corner as entries grow', async ({
    page,
  }): Promise<void> => {
    await page.goto(LEGEND_FIXTURE_URL);
    await page.getByRole('button', { name: /Legend/ }).click();
    await page.getByLabel('Bottom right').check();

    await page.getByRole('button', { name: 'Use 8 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(8);
    const oneColumn = await readLegendFrame(page);
    expect(oneColumn.x + oneColumn.width).toBe(CANVAS_SIZE - SAFE_INSET);
    expect(oneColumn.y + oneColumn.height).toBe(CANVAS_SIZE - SAFE_INSET);

    await page.getByRole('button', { name: 'Use 17 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(17);
    const threeColumns = await readLegendFrame(page);
    expect(threeColumns.width).toBe(912);
    expect(threeColumns.x + threeColumns.width).toBe(CANVAS_SIZE - SAFE_INSET);
    expect(threeColumns.y + threeColumns.height).toBe(CANVAS_SIZE - SAFE_INSET);
    expectInsideExportFrame(threeColumns);
    await expect(page.locator('[data-position="true"]')).toContainText(
      'Bottom right',
    );
  });
});

/* ------------------------------------------------------------------ *
 * G-1 investigation — what the legend measurably IS (04-12 Task 2)
 * ------------------------------------------------------------------ */

/**
 * `G-1` is carried forward from `03-UAT.md` § Gaps, verbatim: *"the legend is a
 * bit too high"*, followed by *"I dont know the entire legend is off and just
 * not write"*. Neither sentence is a measurement, and `04-CONTEXT.md`
 * OPEN QUESTION 3 records that *"position was the defect"* is an ASSUMPTION.
 *
 * This block does not fix `G-1` and does not claim it is resolved. It records
 * what the legend measurably is, **from the running editor**, as assertions
 * rather than as a note in a SUMMARY that nothing re-checks. Whether the owner
 * considers `G-1` answered is a `checkpoint:human-verify` in `04-13`, after
 * both the position change and the new bar form exist. **OQ-3 stays OPEN.**
 *
 * **CD-7 correction, recorded here because this is where a reader will look.**
 * `04-CONTEXT.md` OQ-3 attributes a known-wrong placement formula in
 * `03-UI-SPEC.md` to the legend. It is not the legend's: the RED-proved defect
 * is `.map-navigation`'s `inset-inline-end`, which lands the floating camera
 * cluster inside the frame corner at every aspect ratio. The ADVICE — verify
 * against the running editor before committing to a cause — stands, and this
 * block is that verification. The stated CAUSE does not apply to `G-1`.
 */
interface MeasuredLegend {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly swatchWidth: number;
  readonly swatchHeight: number;
  readonly labelFontSize: number;
  readonly topBandHeight: number;
}

async function measureRunningLegend(page: Page): Promise<MeasuredLegend> {
  const layer = page.locator('svg.map-canvas [data-layer="legend"]');
  await expect(layer).toHaveCount(1);

  // The hit target carries the layout's own width and height, and it is the
  // ONE rect that survives whatever the legend's chrome does — reading
  // `rect:first-of-type` would be reading a background panel that the design
  // may or may not draw.
  const frame = layer.getByRole('button', { name: 'Move legend' });
  const swatch = layer.locator(`rect[fill="${RAMP_RED_HEX}"]`);
  /*
   * ⚠ RETARGETED by `04-13`, and this is the `04-12` defect class repeating.
   * This read `layer.locator('text').first()`. Once the ramp-painted map
   * resolves to the BAR form, the first `<text>` in the layer is the CAPTION
   * whenever one is set — 24 units, not the 32 this measurement is about — and
   * the assertion would have silently started reporting the caption's size as
   * the label's. It now names the boundary label explicitly, which is the one
   * element whose type this block is measuring.
   */
  const label = layer.locator('[data-legend-boundary="true"]').first();
  const band = page.locator(
    'svg.map-canvas [data-layer="bands"] rect[data-band="top"]',
  );

  const readNumber = async (
    locator: ReturnType<Page['locator']>,
    attribute: string,
  ): Promise<number> =>
    Number(
      await locator.evaluate(
        (node: Element, name: string): string | null =>
          node.getAttribute(name),
        attribute,
      ),
    );

  const transform = await layer.getAttribute('transform');
  const match = /translate\(([-\d.]+) ([-\d.]+)\)/u.exec(transform ?? '');
  if (match === null) {
    throw new Error(`The legend layer carries no transform: ${transform}`);
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
    width: await readNumber(frame, 'width'),
    height: await readNumber(frame, 'height'),
    swatchWidth: await readNumber(swatch, 'width'),
    swatchHeight: await readNumber(swatch, 'height'),
    labelFontSize: await readNumber(label, 'font-size'),
    topBandHeight: await readNumber(band, 'height'),
  };
}

test.describe('G-1 investigation — the legend, measured from the running editor', (): void => {
  test('records the default legend geometry, its type, and its overlap with the top band', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);

    const france = page.locator(
      'path.country-path[data-country-id="FRA"][data-path-kind="logical"]',
    );
    await france.focus();
    await france.press('Enter');
    await openRailTool(page, 'Colors');
    await applyRampRed(page);

    const measured = await measureRunningLegend(page);

    /*
     * 1. The rendered position agrees with `resolveLegendRender`. This runs
     *    FIRST: every fraction below is only a measurement of the legend if
     *    the derivation and the DOM agree about where the legend is.
     */
    const render = resolveLegendRender(
      reconcileLegend([RAMP_RED_HEX], createDefaultLegendState()),
      [RAMP_RED_HEX],
      resolveBandExtents(DEFAULT_COMPOSITION_SETTINGS),
      // `applyRampRed` writes a RAMP assignment, so the real app infers `bar`.
      // Passing `rows` here would make every measurement below a measurement
      // of a rectangle the legend is not in.
      'bar',
    );
    expect(
      { x: measured.x, y: measured.y },
      'the rendered legend and `resolveLegendRender` disagree about the ' +
        'legend position, so nothing measured below is about the legend',
    ).toEqual({ x: render.position.x, y: render.position.y });
    expect({
      width: measured.width,
      height: measured.height,
    }).toEqual({ width: render.bounds.width, height: render.bounds.height });

    /*
     * 2. The top edge as a fraction of the 1080 square, at the default preset.
     *
     *    ⚠ Both forms are asserted on purpose. The LITERAL catches a change to
     *    the arithmetic; the DERIVED form catches a change to
     *    `LEGEND_SAFE_INSET` or to the band inset that the literal alone would
     *    hide. An assertion written only against a constant it imports cannot
     *    fail on its own subject.
     *
     *    **RE-BASELINED ONCE, DELIBERATELY, by this plan's Task 4 (D4-13).**
     *    The Task 2 measurement — taken on installed Chrome 151.0.7922.76
     *    before the inset landed — was `y = 32`, **2.96 % of the square**,
     *    directly under the title band. That was the measurement `G-1` never
     *    had, and it is what the fix was aimed at. The band-aware inset moves
     *    it to **152, 14.07 %**, below the title block.
     */
    expect(measured.y).toBe(152);
    expect(measured.y).toBe(LEGEND_SAFE_INSET + BAND_DEFAULT_HEIGHT);
    expect(measured.y / MAP_VIEWBOX_SIZE).toBeCloseTo(0.1407, 4);

    /*
     * 3. The left edge hugs the same 32-unit rule the title, the subtitle, and
     *    the attribution align on (`TEXT_SAFE_INSET`, 04-11).
     */
    expect(measured.x).toBe(LEGEND_SAFE_INSET);

    /*
     * 4. Footprint at a representative entry count (ONE coloured country, the
     *    commonest first-run state).
     *
     *    **RE-BASELINED BY A FORM CHANGE, NOT BY A NUMBER CHANGE** — this is
     *    the honest description. Task 2's measurement, `336 x 96` (8.89 % of
     *    frame height), was of the ROWS form, which was the only form that
     *    existed. `applyRampRed` writes a ramp assignment, so the map now
     *    resolves to the **BAR** form, and the thing being measured is a
     *    different object: `297 x 32`, **2.96 %** of frame height.
     *
     *    That is the row-2 item in `04-12`'s "every property that could read
     *    as off" table — *"total footprint versus the reference's ~8 % of frame
     *    height"* — and it moved from 8.89 % to 2.96 % at one entry. **It is
     *    NOT a claim that `G-1` is answered.** Whether the legend now reads
     *    right is a human judgement; `04-VALIDATION.md` lists cartographic
     *    resemblance as manual-only, and OQ-3 is OPEN.
     */
    expect(render.form).toBe('bar');
    expect(measured.width).toBe(297);
    expect(measured.height).toBe(32);
    expect(measured.height / MAP_VIEWBOX_SIZE).toBeCloseTo(0.0296, 4);

    /*
     * 5. Overlap with the top band's extent at Phase 4 defaults.
     *
     *    **RE-BASELINED ONCE, DELIBERATELY, by Task 4.** Task 2 measured the
     *    legend's top edge (32) sitting **88 units inside** the 120-unit title
     *    band — the band and the legend competing for one strip of the square.
     *    The overlap is now exactly zero, and asserted as a `>=` so a legend
     *    that merely lands somewhere else cannot satisfy it.
     */
    expect(measured.topBandHeight).toBe(BAND_DEFAULT_HEIGHT);
    expect(
      measured.y,
      'the legend has re-entered the top band — the band-aware inset is not ' +
        'reaching the rendered position',
    ).toBeGreaterThanOrEqual(measured.topBandHeight);
    expect(measured.y - measured.topBandHeight).toBe(LEGEND_SAFE_INSET);

    /*
     * 6. Type and swatch, read from the live DOM rather than from the source.
     *
     *    RE-BASELINED with the form: the mark is a BAR SEGMENT (48 x 32), not
     *    a 24 x 24 row swatch, and it carries **no stroke** — a per-segment
     *    hairline would draw a line between adjacent swatches and destroy the
     *    contiguity that defines the bar. Rows 3 and 6 of `04-12`'s table
     *    (*"`LEGEND_COLUMN_WIDTH: 288` row layout versus the reference's
     *    contiguous bar"* and *"swatch size and shape ... the reference uses
     *    flat bar segments with no stroke"*) are addressed by this change.
     *    The boundary label's type is unchanged at 32, weight 600 — row 5 of
     *    that table is **still open**.
     */
    expect(measured.labelFontSize).toBe(32);
    expect(measured.swatchWidth).toBe(48);
    expect(measured.swatchHeight).toBe(32);
    await expect(
      page.locator('svg.map-canvas [data-legend-bar-segment="true"]'),
    ).not.toHaveAttribute('stroke', /.*/u);
    // ONE hairline, around the WHOLE bar.
    await expect(
      page.locator('svg.map-canvas [data-legend-bar-outline="true"]'),
    ).toHaveCount(1);
    // N + 1 tick leaders for N segments: one entry, two ticks.
    await expect(
      page.locator('svg.map-canvas [data-legend-bar-tick="true"]'),
    ).toHaveCount(2);

    /*
     * 7. Everything stays inside the exported square. A derived crop that
     *    moves with its subject is the `04-11` phantom-pixel shape; the frame
     *    bound is absolute and does not move.
     */
    expect(measured.x + measured.width).toBeLessThanOrEqual(
      MAP_VIEWBOX_SIZE - LEGEND_SAFE_INSET,
    );
    expect(measured.y + measured.height).toBeLessThanOrEqual(
      MAP_VIEWBOX_SIZE - LEGEND_SAFE_INSET,
    );
  });
});

/* ------------------------------------------------------------------ *
 * 04-13 — the legend on REAL PNG pixels (D4-12, roadmap 04-08)
 * ------------------------------------------------------------------ *
 *
 * Three gates, all on bytes the browser actually downloaded, and **no image
 * baseline anywhere**. A re-baselined diff can never be RED-provable on its own
 * subject, because *"the baseline changed because my plan changed it"* is
 * unfalsifiable; the acceptance criteria assert that no new `.png` appears
 * under any snapshot or baseline directory (T-04-13-04).
 *
 * Every legend region below is DERIVED from `resolveLegendRender` — the same
 * pure function the renderer calls — cross-checked against the live DOM, and
 * bounded to the 1080 frame by `expectRegionInsideFrame` before anything is
 * sampled. `04-11` measured what the last step is worth: 28,050 phantom pixels
 * from an off-bitmap crop that `drawImage` filled with transparent black and an
 * ink counter read as solid ink.
 *
 * The decode path is `support/pngProbe.ts`, shared with `export.spec.ts`. There
 * is exactly one `createImageBitmap` behind every pixel claim in the suite.
 */

const LEGEND_LAYER = 'svg.map-canvas [data-layer="legend"]';

interface DerivedLegend {
  readonly render: ReturnType<typeof resolveLegendRender>;
  readonly region: PngRegion;
}

/**
 * Derive the legend's geometry from live composition state and CROSS-CHECK it
 * against the rendered DOM before returning it.
 *
 * The cross-check is what makes a derived crop safe: a derivation that drifted
 * would sample a box the legend is not in and report a tidy zero, which every
 * "there is no ink here" assertion would pass.
 */
async function deriveLegendGeometry(
  page: Page,
  legend: Parameters<typeof resolveLegendRender>[0],
  effectiveColors: ReadonlyArray<string>,
  inferredForm: 'bar' | 'rows',
): Promise<DerivedLegend> {
  const render = resolveLegendRender(
    legend,
    effectiveColors,
    resolveBandExtents(DEFAULT_COMPOSITION_SETTINGS),
    inferredForm,
  );
  const layer = page.locator(LEGEND_LAYER);
  await expect(layer).toHaveAttribute(
    'transform',
    `translate(${String(render.position.x)} ${String(render.position.y)})`,
  );
  await expect(layer.locator('[data-editor-only="true"]')).toHaveAttribute(
    'width',
    String(render.bounds.width),
  );
  await expect(layer.locator('[data-editor-only="true"]')).toHaveAttribute(
    'height',
    String(render.bounds.height),
  );

  const region: PngRegion = {
    x: render.position.x,
    y: render.position.y,
    width: render.bounds.width,
    height: render.bounds.height,
  };
  expectRegionInsideFrame(region);
  return { render, region };
}

async function paintFranceFromTheRedRamp(page: Page): Promise<void> {
  /*
   * Scoped to `svg.map-canvas`. Gate C paints AFTER an export, and the export
   * path mounts a detached clone frame in the body whose paths carry the same
   * attributes — an unscoped locator resolves to two elements there and to one
   * everywhere else, which is a strict-mode violation that only appears in the
   * one ordering.
   */
  const france = page.locator(
    'svg.map-canvas path.country-path[data-country-id="FRA"][data-path-kind="logical"]',
  );
  await france.focus();
  await france.press('Enter');
  await openRailTool(page, 'Colors');
  await applyRampRed(page);
}

async function openLegendPanel(page: Page): Promise<void> {
  await openRailTool(page, 'Legend');
  await legendDisclosure(page).click();
}

/**
 * An interior point of an UNCOLOURED country, chosen structurally rather than
 * by eye: `getBBox` on a logical path the composition never painted, sampled at
 * a point the browser itself confirms is inside the shape. Guessing a latitude
 * is how a "sample the uncoloured fill" probe ends up sampling water.
 */
async function findUncoloredCountryPoint(
  page: Page,
  countryId: string,
): Promise<readonly [number, number]> {
  const point = await page
    .locator(
      `svg.map-canvas path.country-path[data-country-id="${countryId}"][data-path-kind="logical"]`,
    )
    .first()
    .evaluate((node: Element): { x: number; y: number } | null => {
      const path = node as SVGPathElement;
      const svg = path.ownerSVGElement;
      if (svg === null) {
        return null;
      }
      const box = path.getBBox();
      const canvasPoint = svg.createSVGPoint();
      const toCanvas = path.getCTM();
      if (toCanvas === null) {
        return null;
      }
      /*
       * Walk a grid inside the bounding box and take the first point the path
       * itself reports as filled. A bbox centre lands outside a concave country
       * often enough that this has to be checked rather than assumed.
       */
      for (let row = 1; row < 8; row += 1) {
        for (let column = 1; column < 8; column += 1) {
          canvasPoint.x = box.x + (box.width * column) / 8;
          canvasPoint.y = box.y + (box.height * row) / 8;
          if (path.isPointInFill(canvasPoint)) {
            const projected = canvasPoint.matrixTransform(toCanvas);
            return { x: projected.x, y: projected.y };
          }
        }
      }
      return null;
    });

  if (point === null) {
    throw new Error(
      `No interior point of ${countryId} could be located, so the uncoloured ` +
        'fill sample below would be sampling whatever happens to be there.',
    );
  }
  return [Math.round(point.x), Math.round(point.y)];
}

test.describe('04-13 legend gates on real PNG pixels', (): void => {
  /* ---------------------------------------------------------------- *
   * Gate A — the "no data" swatch IS the uncoloured fill
   * ---------------------------------------------------------------- */

  /**
   * T-04-13-03. **One value, two consumers** — `settings.uncoloredFill` paints
   * every uncoloured country AND the "no data" swatch — and the whole point of
   * the row is that a reader can match them by eye. The gate asserts both
   * halves on the same downloaded frame:
   *
   * 1. the swatch pixel equals `settings.uncoloredFill`;
   * 2. an interior pixel of an uncoloured COUNTRY equals the same value;
   * 3. therefore the two equal each other, which is the binding itself.
   *
   * Claim 3 alone would be satisfied by two identical wrong colours — the
   * "cross-context equality that three blank canvases satisfy" shape this
   * repository has shipped once — so claims 1 and 2 are named separately
   * against the imported constant.
   *
   * **RED-proved by DIVERGING them**, which is the divergence
   * `04-UI-SPEC.md § 6.7` names as the gate's subject.
   */
  test('Gate A: the "no data" swatch equals settings.uncoloredFill on real pixels', async ({
    page,
  }): Promise<void> => {
    test.slow();
    await waitForApp(page);
    await paintFranceFromTheRedRamp(page);

    await openLegendPanel(page);
    await page.getByLabel('Show no data row').check();
    await expect(page.getByLabel('Show no data row')).toBeChecked();

    const legend = {
      ...reconcileLegend([RAMP_RED_HEX], createDefaultLegendState()),
      showNoData: true,
    };
    const { render, region } = await deriveLegendGeometry(
      page,
      legend,
      [RAMP_RED_HEX],
      'bar',
    );

    const noData = render.layout.noData;
    if (noData === null) {
      throw new Error(
        'the "no data" row is off, so this gate has no subject. The toggle ' +
          'did not reach the composition.',
      );
    }

    // The swatch's centre, DERIVED — never a guessed coordinate — and inside
    // the frame by construction because the whole region already is.
    const swatchCentre: readonly [number, number] = [
      Math.round(render.position.x + noData.swatchX + noData.swatchSize / 2),
      Math.round(render.position.y + noData.swatchY + noData.swatchSize / 2),
    ];
    // Brazil: large, uncoloured, and nowhere near the top-left legend.
    const countryPoint = await findUncoloredCountryPoint(page, 'BRA');

    const bytes = await exportRealAppPng(page, 'legend-no-data-binding');

    // 0. THE SIZE CONTRACT, from the IHDR, before anything is sampled.
    expect(readPngDimensions(bytes)).toEqual({
      width: MAP_VIEWBOX_SIZE,
      height: MAP_VIEWBOX_SIZE,
    });

    // 1. CONTENT FLOOR FIRST. A legend that rendered nothing at all would
    //    satisfy every equality below by sampling paper twice.
    await expectBlankControlReadsZeroInk(
      page,
      region,
      DEFAULT_COMPOSITION_SETTINGS.surfaceColor,
    );
    const legendInk = await countInkAroundRegion(
      page,
      bytes,
      region,
      DARK_INK_THRESHOLD,
    );
    expect(
      legendInk.inside,
      `the legend inked ${legendInk.inside} pixels against a floor of ` +
        `${MIN_LEGEND_INK_PIXELS}. It did not reach the PNG, so the colour ` +
        'equalities below are not about a legend.',
    ).toBeGreaterThan(MIN_LEGEND_INK_PIXELS);

    const sample = await samplePngPoints(page, bytes, [
      swatchCentre,
      countryPoint,
    ]);
    const swatchPixel = (sample.pixels[0] ?? []).slice(0, 3);
    const countryPixel = (sample.pixels[1] ?? []).slice(0, 3);
    const expected = [...hexToRgb(DEFAULT_COMPOSITION_SETTINGS.uncoloredFill)];

    // 2. THE SWATCH IS THE UNCOLOURED FILL.
    expect(
      swatchPixel,
      `the "no data" swatch at (${swatchCentre[0]}, ${swatchCentre[1]}) does ` +
        `not read ${DEFAULT_COMPOSITION_SETTINGS.uncoloredFill}.`,
    ).toEqual(expected);

    // 3. AND SO IS AN UNCOLOURED COUNTRY.
    expect(
      countryPixel,
      `an interior point of Brazil at (${countryPoint[0]}, ` +
        `${countryPoint[1]}) does not read the uncoloured fill, so the ` +
        'equality below would be comparing the swatch against water.',
    ).toEqual(expected);

    // 4. THE BINDING ITSELF — and it is the third claim, not the only one.
    expect(
      swatchPixel,
      'the "no data" swatch and the map\'s uncoloured countries have drifted ' +
        'apart. They are one value with two consumers.',
    ).toEqual(countryPixel);
  });

  /* ---------------------------------------------------------------- *
   * Gate B — the bar has no gaps and the rows do
   * ---------------------------------------------------------------- */

  /**
   * **Two forms, one property, opposite expectations, in the same run.**
   * Neither direction can pass by accident: a legend that vanished would fail
   * the rows half, and a legend that painted one solid block would fail
   * nothing on the bar half but everything on the rows half.
   *
   * A column is sampled straight down the swatch stack at the marks' horizontal
   * centre. For the **bar** no paper-coloured pixel may appear between two
   * adjacent swatches — that is what "contiguous" means. For **rows** at least
   * one must, because `LEGEND_ENTRY_GAP` is 8.
   */
  test('Gate B: the bar stack has no gaps and the rows stack does', async ({
    page,
  }): Promise<void> => {
    test.slow();
    await waitForApp(page);

    // TWO colours, so there is an adjacency to have a gap in at all.
    const france = page.locator(
      'svg.map-canvas path.country-path[data-country-id="FRA"][data-path-kind="logical"]',
    );
    await france.focus();
    await france.press('Enter');
    await openRailTool(page, 'Colors');
    await applyRampShade(page, 'Reds', RAMP_RED_STEP);
    const germany = page.locator(
      'svg.map-canvas path.country-path[data-country-id="DEU"][data-path-kind="logical"]',
    );
    await germany.focus();
    await germany.press('Enter');
    await applyRampShade(page, 'Blues', RAMP_RED_STEP);

    const activeColors = await page
      .locator(`${LEGEND_LAYER} rect:not([data-editor-only])`)
      .evaluateAll((nodes: Element[]): ReadonlyArray<string> =>
        nodes
          .map((node): string | null => node.getAttribute('fill'))
          .filter((fill): fill is string => fill !== null && fill !== 'none'),
      );
    expect(
      activeColors,
      'the legend does not carry two marks, so there is no adjacency to ' +
        'measure a gap in.',
    ).toHaveLength(2);

    const legendState = reconcileLegend(
      activeColors,
      createDefaultLegendState(),
    );

    const measureColumn = async (
      inferredForm: 'bar' | 'rows',
      label: string,
    ): Promise<{
      readonly paperRuns: number;
      readonly inkPixels: number;
    }> => {
      const { render, region } = await deriveLegendGeometry(
        page,
        { ...legendState, form: inferredForm },
        activeColors,
        inferredForm,
      );
      const bytes = await exportRealAppPng(page, label);
      expect(readPngDimensions(bytes)).toEqual({
        width: MAP_VIEWBOX_SIZE,
        height: MAP_VIEWBOX_SIZE,
      });
      await expectBlankControlReadsZeroInk(
        page,
        region,
        DEFAULT_COMPOSITION_SETTINGS.surfaceColor,
      );

      /*
       * The sampled column and its vertical span are DERIVED from the layout,
       * per form — the bar's marks are a 48-unit strip, the rows' are 24-unit
       * swatches, and a shared literal x would sample the label column in one
       * of the two.
       */
      const marks =
        render.layout.form === 'bar'
          ? {
              x: LEGEND_BAR_WIDTH / 2,
              top: render.layout.segments[0].y,
              bottom:
                render.layout.segments[1].y + render.layout.segments[1].height,
            }
          : {
              x: LEGEND_SWATCH_SIZE / 2,
              top: render.layout.items[0].y,
              bottom:
                render.layout.items[1].y + render.layout.items[1].height,
            };
      const points: Array<readonly [number, number]> = [];
      for (
        let y = Math.ceil(render.position.y + marks.top);
        y < Math.floor(render.position.y + marks.bottom);
        y += 1
      ) {
        points.push([Math.round(render.position.x + marks.x), y]);
      }
      expect(points.length, 'the sampled column is empty').toBeGreaterThan(16);
      // Bounded to the frame absolutely, like every other derived crop here.
      points.forEach(([x, y]): void => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(MAP_VIEWBOX_SIZE);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(MAP_VIEWBOX_SIZE);
      });

      const sampled = await samplePngPoints(page, bytes, points);
      const paper = [
        ...hexToRgb(DEFAULT_COMPOSITION_SETTINGS.surfaceColor),
      ];
      let paperRuns = 0;
      let inkPixels = 0;
      let wasPaper = false;
      sampled.pixels.forEach((pixel): void => {
        const isPaper =
          pixel[0] === paper[0] && pixel[1] === paper[1] && pixel[2] === paper[2];
        if (isPaper && !wasPaper) {
          paperRuns += 1;
        }
        if (!isPaper) {
          inkPixels += 1;
        }
        wasPaper = isPaper;
      });
      return { paperRuns, inkPixels };
    };

    await openLegendPanel(page);
    await page.getByRole('radio', { name: 'Bar', exact: true }).check();
    await expect(
      page.getByRole('radio', { name: 'Bar', exact: true }),
    ).toBeChecked();
    const bar = await measureColumn('bar', 'legend-form-bar');

    await page.getByRole('radio', { name: 'Rows', exact: true }).check();
    await expect(
      page.getByRole('radio', { name: 'Rows', exact: true }),
    ).toBeChecked();
    const rows = await measureColumn('rows', 'legend-form-rows');

    // CONTENT FLOOR on both, so "no paper between the swatches" cannot be
    // satisfied by a column that sampled a solid block of nothing.
    expect(
      bar.inkPixels,
      'the bar column carries almost no painted pixels, so its zero gap count ' +
        'is not about a bar.',
    ).toBeGreaterThan(MIN_SAMPLED_COLUMN_INK);
    expect(
      rows.inkPixels,
      'the rows column carries almost no painted pixels.',
    ).toBeGreaterThan(MIN_SAMPLED_COLUMN_INK);

    // THE PROPERTY, in both directions.
    expect(
      bar.paperRuns,
      `the bar column shows ${bar.paperRuns} run(s) of paper between its ` +
        'swatches. A contiguous stack has none — that is the form.',
    ).toBe(0);
    expect(
      rows.paperRuns,
      'the rows column shows no paper between its swatches, so the two forms ' +
        'are rendering identically and the bar half proves nothing.',
    ).toBeGreaterThan(0);
  });

  /* ---------------------------------------------------------------- *
   * Gate C — an empty legend renders nothing
   * ---------------------------------------------------------------- */

  /**
   * The lift-block truth: *"the legend layer renders nothing into the exported
   * PNG when there are no active colours."*
   *
   * The region is the one the legend WOULD occupy with a colour — derived from
   * `resolveLegendRender` on a one-entry legend — so the crop is a real legend
   * box rather than an arbitrary rectangle, and the claim is "nothing is there"
   * rather than "nothing is somewhere".
   *
   * The counter is proved able to see by the SAME crop on the SAME frame with a
   * colour applied: content floor first, then zero.
   *
   * ⚠ **A limitation this gate's own RED probe exposed, recorded rather than
   * hidden.** The pixel claim counts at `DARK_INK_THRESHOLD` (100), so it is
   * blind to a LIGHT empty container: the first probe rendered a `#9CA3AF`
   * hairline box and the pixel claim stayed green at zero — (156, 163, 175) is
   * not dark ink. Raising the threshold to 240 is not available, because the
   * uncoloured land under this crop is `#E5E7EB` and would then count as
   * thousands of ink pixels in every frame. So the pixel claim covers DARK
   * legend ink — a caption, a label, a boundary number, a dark rule — and the
   * structural `toHaveCount(0)` at step 5 is what covers a light one. Both
   * ship; neither is presented as covering the other. The probe that DOES
   * redden step 4 renders the container in `COMPOSITION_INK_COLOR` and
   * measures **1,316** pixels against a floor of zero.
   */
  test('Gate C: with no active colours the legend region carries zero ink', async ({
    page,
  }): Promise<void> => {
    test.slow();
    await waitForApp(page);

    const populated = resolveLegendRender(
      reconcileLegend([RAMP_RED_HEX], createDefaultLegendState()),
      [RAMP_RED_HEX],
      resolveBandExtents(DEFAULT_COMPOSITION_SETTINGS),
      'bar',
    );
    const region: PngRegion = {
      x: populated.position.x,
      y: populated.position.y,
      width: populated.bounds.width,
      height: populated.bounds.height,
    };
    expectRegionInsideFrame(region);

    /*
     * 1. THE LAYER EXISTS, and its child count is READ here while the legend
     *    is genuinely empty. The count is asserted at the END — see step 5 —
     *    but it has to be MEASURED now: step 3 paints a country to establish
     *    the content floor, so by step 5 the layer is legitimately populated.
     *    Asserting a live locator there would have been reading the wrong
     *    state, and the full suite caught exactly that.
     */
    await expect(page.locator(LEGEND_LAYER)).toHaveCount(1);
    const emptyLayerChildCount = await page
      .locator(`${LEGEND_LAYER} > *`)
      .count();
    const emptyBytes = await exportRealAppPng(page, 'legend-empty');
    expect(readPngDimensions(emptyBytes)).toEqual({
      width: MAP_VIEWBOX_SIZE,
      height: MAP_VIEWBOX_SIZE,
    });
    /*
     * Real synchronisation, not a sleep: the export mounts a detached clone
     * frame under `body` and removes it when the download settles. Painting
     * before it goes leaves TWO `svg.map-canvas` in the document and every
     * country locator below resolves to two elements. This is the only gate
     * here that paints AFTER an export, which is why it is the only one that
     * needs the wait — and asserting the cleanup is worth having anyway.
     */
    await expect(page.locator('body > div[aria-hidden="true"]')).toHaveCount(0);

    // 2. THE COUNTER'S OWN CONTROL, at the same region and threshold.
    await expectBlankControlReadsZeroInk(
      page,
      region,
      DEFAULT_COMPOSITION_SETTINGS.surfaceColor,
    );

    const emptyInk = await countInkAroundRegion(
      page,
      emptyBytes,
      region,
      DARK_INK_THRESHOLD,
    );

    // 3. THE CONTENT FLOOR, on the SAME crop with a colour applied. Without
    //    it, a counter that cannot see anything satisfies the zero below.
    await paintFranceFromTheRedRamp(page);
    const paintedBytes = await exportRealAppPng(page, 'legend-empty-control');
    const paintedInk = await countInkAroundRegion(
      page,
      paintedBytes,
      region,
      DARK_INK_THRESHOLD,
    );
    expect(
      paintedInk.inside,
      `with a colour applied the same crop reads ${paintedInk.inside} ink ` +
        `pixels against a floor of ${MIN_LEGEND_INK_PIXELS}. The counter ` +
        'cannot see the legend at all, so the zero above proves nothing.',
    ).toBeGreaterThan(MIN_LEGEND_INK_PIXELS);

    // 4. THE CLAIM, on real pixels.
    expect(
      emptyInk.inside,
      `the empty legend inked ${emptyInk.inside} pixels into its own region. ` +
        'With no active colours the layer must render nothing at all.',
    ).toBe(0);

    /*
     * 5. The STRUCTURAL half, and it runs LAST on purpose.
     *
     *    It was written first, and the RED probe for this gate — rendering an
     *    empty legend's container anyway — reddened it instead of the pixel
     *    claim above. That is the *"a probe reddens a DIFFERENT gate"* shape
     *    this repository has already shipped: with the DOM check first, the
     *    pixel gate never ran, so nothing proved the pixel gate could fail at
     *    all. Reordered, the same mutation reddens step 4 on its own subject
     *    and this assertion corroborates rather than pre-empts.
     */
    expect(
      emptyLayerChildCount,
      'the empty legend layer carried children, so it rendered marks with no ' +
        'active colours even if they were too light for the counter above.',
    ).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * T-04-13-04 — baselines are forbidden, and the absence is ASSERTED
 * ------------------------------------------------------------------ */

/**
 * **A re-baselined image can never be RED-provable on its own subject**,
 * because *"the baseline changed because my plan changed it"* is unfalsifiable.
 * Every pixel claim in this repository is a PROPERTY — a colour equality, a gap
 * count, an ink floor — measured on bytes the browser downloaded.
 *
 * `04-13`'s plan asks for the absence to be asserted rather than merely
 * observed, so this scans the suite for the two ways a baseline gets in: a
 * committed image under `tests/`, and a call to Playwright's own snapshot
 * matchers. A deleted `expect` proves nothing and reads as coverage; this one
 * goes red the moment either appears.
 */
test.describe('no image baseline exists anywhere in the e2e suite', (): void => {
  test('neither a committed image nor a snapshot matcher is present', async (): Promise<void> => {
    const { readdir, readFile } = await import('node:fs/promises');
    const { join, extname } = await import('node:path');

    const IMAGE_EXTENSIONS = new Set([
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.gif',
      '.bmp',
    ]);
    const SNAPSHOT_MATCHERS = [
      'toHaveScreenshot',
      'toMatchSnapshot',
      'toMatchAriaSnapshot',
    ];

    const images: string[] = [];
    const matcherHits: string[] = [];

    const walk = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(path);
          continue;
        }
        if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
          images.push(path);
          continue;
        }
        if (!/\.(?:ts|tsx|html)$/u.test(entry.name)) {
          continue;
        }
        const source = await readFile(path, 'utf8');
        SNAPSHOT_MATCHERS.forEach((matcher): void => {
          if (source.includes(`.${matcher}(`)) {
            matcherHits.push(`${path}: ${matcher}`);
          }
        });
      }
    };

    // `tests/e2e` only. `.artifacts/` holds the downloads a run produces and is
    // gitignored — those are EVIDENCE, not baselines, and deleting them changes
    // no assertion.
    await walk('tests/e2e');

    expect(
      images,
      'an image file appeared under tests/e2e. A baseline cannot be ' +
        'RED-proved on its own subject — assert a property instead.',
    ).toEqual([]);
    expect(
      matcherHits,
      "Playwright's snapshot matchers are baselines by another name.",
    ).toEqual([]);

    // The scan must have looked at something, or the two empty arrays above
    // are the emptiness of a walk that found no files at all.
    const scanned = await readdir('tests/e2e');
    expect(scanned.length, 'the baseline scan walked nothing').toBeGreaterThan(
      5,
    );
  });
});
