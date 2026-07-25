import { expect, test } from '@playwright/test';

const NAVIGATION_FIXTURE_URL = '/tests/e2e/fixtures/navigation.html';

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
    await expect(navigationButtons).toHaveCount(7);
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
    // The map navigation cluster must not own Reset View: CompositionBar is its
    // sole owner, and `tests/e2e/history.spec.ts` asserts exactly one in the
    // composed workspace.
    await expect(page.getByRole('button', { name: 'Reset View' })).toHaveCount(0);
  });
});
