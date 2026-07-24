import { expect, test } from '@playwright/test';

const PHASE_ONE_PATH_COUNT = 57;
const COMPACT_VIEWPORT = { width: 360, height: 800 };

test.describe('Phase 1 baseline before the world cutover', (): void => {
  test(
    'Phase 1 baseline: preserves 57-path pre-cutover evidence until Plan 02-07 replaces this runtime assertion',
    async ({ page }): Promise<void> => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message): void => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      page.on('pageerror', (error): void => {
        pageErrors.push(error.message);
      });

      await page.setViewportSize(COMPACT_VIEWPORT);
      await page.goto('/');

      const workspace = page.locator('main.workspace');
      const mapListbox = page.getByRole('listbox', {
        name: 'Interactive map of modern Europe',
      });
      const countryPaths = mapListbox.locator('path.country-path');

      await expect(workspace).toHaveCount(1);
      await expect(mapListbox).toHaveCount(1);
      await expect(countryPaths).toHaveCount(PHASE_ONE_PATH_COUNT);
      await expect(mapListbox).toBeVisible();

      const isMapConnected = await mapListbox.evaluate(
        (element): boolean => element.isConnected,
      );
      expect(isMapConnected).toBe(true);

      const pathEvidence = await countryPaths.evaluateAll(
        (elements): ReadonlyArray<{
          id: string | null;
          pathData: string | null;
          label: string | null;
        }> =>
          elements.map((element) => ({
            id: element.getAttribute('data-country-id'),
            pathData: element.getAttribute('d'),
            label: element.getAttribute('aria-label'),
          })),
      );
      const countryIds = pathEvidence.map(({ id }): string => id ?? '');

      expect(new Set(countryIds).size).toBe(PHASE_ONE_PATH_COUNT);
      expect(
        pathEvidence.every(
          ({ id, pathData, label }): boolean =>
            id !== null &&
            id.trim().length > 0 &&
            pathData !== null &&
            pathData.trim().length > 0 &&
            label !== null &&
            label.trim().length > 0,
        ),
      ).toBe(true);

      const isContainedAt360 = await page.evaluate((): boolean => {
        const workspaceElement = document.querySelector('main.workspace');
        const mapElement = document.querySelector('svg[role="listbox"]');
        if (workspaceElement === null || mapElement === null) {
          return false;
        }

        const workspaceBounds = workspaceElement.getBoundingClientRect();
        const mapBounds = mapElement.getBoundingClientRect();
        return (
          document.documentElement.scrollWidth <= window.innerWidth &&
          workspaceBounds.left >= 0 &&
          workspaceBounds.right <= window.innerWidth &&
          mapBounds.left >= 0 &&
          mapBounds.right <= window.innerWidth
        );
      });

      expect(isContainedAt360).toBe(true);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    },
  );
});
