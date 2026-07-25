import { expect, test } from '@playwright/test';

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
      const panel = element.querySelector('rect');
      const transform = element.getAttribute('transform') ?? '';
      const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform);
      if (panel === null || match === null) {
        throw new Error(`Legend frame is unavailable: ${transform}`);
      }
      return {
        x: Number(match[1]),
        y: Number(match[2]),
        width: Number(panel.getAttribute('width')),
        height: Number(panel.getAttribute('height')),
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
    '3 entries · Top right',
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

  test('legend style controls, historical colors, and editor-only export cleanup are exact', async ({
    page,
  }): Promise<void> => {
    await openLegend(page);

    await expect(page.locator('[data-historical-color="true"]')).toHaveText(
      HISTORICAL,
    );
    await expect(page.getByLabel(`Legend label for ${HISTORICAL}`)).toHaveValue(
      HISTORICAL,
    );

    await page.getByLabel('Dark').check();
    await page.getByLabel('Large').check();
    await page.locator('input[type="range"]').fill('70');
    await page.getByLabel('Strong').check();
    await expect(page.locator('[data-style="true"]')).toHaveText(
      'dark,large,70,strong',
    );

    const legendGroup = page.locator('g[data-layer="legend"]');
    await expect(legendGroup.locator('rect').first()).toHaveAttribute(
      'fill',
      '#111827',
    );
    await expect(legendGroup.locator('rect').first()).toHaveAttribute(
      'fill-opacity',
      '0.7',
    );
    await expect(legendGroup.locator('rect').first()).toHaveAttribute(
      'stroke-width',
      '4',
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

    await redLabel.fill('Readable label');
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

    // 8 colors: one column (width 336), so the far-right legal x is 712.
    await page.getByRole('button', { name: 'Use 8 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(8);
    await dragLegendToRightEdge(page);

    const oneColumn = await readLegendFrame(page);
    expect(oneColumn.width).toBe(336);
    expect(oneColumn.x).toBe(712);
    expectInsideExportFrame(oneColumn);
    await expect(page.locator('[data-position="true"]')).toContainText('Custom');

    // The 9th color reflows to two columns (width 648): the stored x of 712
    // would put 280px of the legend outside the 1080 viewBox, and the export
    // used to succeed anyway.
    await page.getByRole('button', { name: 'Use 9 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(9);

    const twoColumns = await readLegendFrame(page);
    expect(twoColumns.width).toBe(648);
    expect(twoColumns.x).toBe(400);
    expectInsideExportFrame(twoColumns);

    // 16 -> 17 is the worse step: three columns (width 960) leave only x <= 88.
    await page.getByRole('button', { name: 'Use 16 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(16);
    await dragLegendToRightEdge(page);
    expectInsideExportFrame(await readLegendFrame(page));

    await page.getByRole('button', { name: 'Use 17 colors' }).click();
    await expect(page.locator('g[data-layer="legend"] text')).toHaveCount(17);

    const threeColumns = await readLegendFrame(page);
    expect(threeColumns.width).toBe(960);
    expect(threeColumns.x).toBe(88);
    expectInsideExportFrame(threeColumns);

    // The export gate stays clear (no invalid-position), and the clone the
    // exporter captures carries the whole legend, not a clipped one.
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeEnabled();
    await page.getByRole('button', { name: 'Export PNG' }).click();
    await expect(page.locator('[data-export-legend-frame="true"]')).toHaveText(
      `${threeColumns.x},${threeColumns.y},${threeColumns.width},${threeColumns.height}`,
    );
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
    expect(threeColumns.width).toBe(960);
    expect(threeColumns.x + threeColumns.width).toBe(CANVAS_SIZE - SAFE_INSET);
    expect(threeColumns.y + threeColumns.height).toBe(CANVAS_SIZE - SAFE_INSET);
    expectInsideExportFrame(threeColumns);
    await expect(page.locator('[data-position="true"]')).toContainText(
      'Bottom right',
    );
  });
});
