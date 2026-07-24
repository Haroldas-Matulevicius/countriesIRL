import { expect, test } from '@playwright/test';

const LEGEND_FIXTURE_URL = '/tests/e2e/fixtures/legend.html';
const RED = '#DC2626';
const BLUE = '#2563EB';
const HISTORICAL = '#B45309';

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
});
