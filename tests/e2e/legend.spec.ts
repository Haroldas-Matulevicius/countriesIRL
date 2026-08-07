import { expect, test, type Page } from '@playwright/test';

import { MAP_VIEWBOX_SIZE } from '../../src/constants/config';
import { DEFAULT_COMPOSITION_SETTINGS } from '../../src/constants/mapStyle';
import { BAND_DEFAULT_HEIGHT, resolveBandExtents } from '../../src/utils/bands';
import {
  LEGEND_SAFE_INSET,
  createDefaultLegendState,
  reconcileLegend,
  resolveLegendRender,
} from '../../src/utils/legend';
import {
  RAMP_RED_HEX,
  applyRampRed,
  openRailTool,
  waitForApp,
} from './support/appHarness';

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
    await expect(legendGroup.locator('text').first()).toHaveAttribute(
      'fill',
      '#111827',
    );
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
