import { expect, type Page } from '@playwright/test';

import { STORAGE_KEY } from '../../../src/constants/config';
import { createWorldProjection } from '../../../src/utils/mapProjection';

/**
 * D4-10: the count of COLORABLE units, not of core states. 195 core states
 * plus the twelve self-colorable units. `waitForApp` gates on it and every
 * spec inherits it, so this constant is what reddens the whole suite if the
 * data and the runtime fall out of step.
 */
export const LOGICAL_CORE_COUNT = 207;
export const CAMERA_GROUP_SELECTOR = '[data-layer="camera"]';
export const LOGICAL_PATH_SELECTOR = 'path.country-path[role="option"]';
export const CAMERA_OWNER_SENTINEL = 'data-camera-owner-sentinel';

export interface CameraTransform {
  readonly k: number;
  readonly x: number;
  readonly y: number;
}

export async function waitForApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator(LOGICAL_PATH_SELECTOR)).toHaveCount(
    LOGICAL_CORE_COUNT,
  );
  const startCreating = page.getByRole('button', { name: 'Start Creating' });
  if (await startCreating.isVisible()) {
    await startCreating.click();
  }
}

/**
 * `03-06` put every editor tool behind a rail row, and D-18 opens a first run
 * with the panel CLOSED. Anything that reaches for a colour swatch, the country
 * list, the legend editor, or Save/Load has to open its tool first.
 *
 * Declared here rather than re-declared per spec: two existing specs already
 * carry duplicated camera helpers as a recorded pending todo, and a rail helper
 * copied into eight files is the same debt with eight places to drift.
 */
export type RailToolLabel =
  | 'Colors'
  | 'Map style'
  | 'Countries'
  | 'Legend'
  | 'Saved Maps';

export async function openRailTool(
  page: Page,
  label: RailToolLabel,
): Promise<void> {
  const row = page.getByRole('button', { name: label, exact: true });
  if ((await row.getAttribute('aria-expanded')) === 'true') {
    return;
  }
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
}

/**
 * The Colors panel's ramp strip, which replaced the ten-tile preset grid in
 * `04-07`.
 *
 * **Declared here rather than re-declared per spec.** Eight specs painted a
 * country with `getByRole('button', { name: 'Apply Red' })` before the presets
 * were deleted; eight private replacements is the same debt with eight places
 * to drift, and `persistence.spec.ts` / `phase2-composition.spec.ts` already
 * carry duplicated camera helpers as a recorded wart.
 *
 * It selects the family first, because only the selected family's strip is
 * rendered. `step` is 1-based, exactly as the accessible name reads it.
 */
export const RAMP_FAMILY_LABELS = [
  'Blues',
  'Reds',
  'Greens',
  'Purples',
  'Greys',
] as const;
export type RampFamilyLabel = (typeof RAMP_FAMILY_LABELS)[number];

/** `04-02`'s `reds` step 4. What `Apply Red` used to be, in ramp terms. */
export const RAMP_RED_STEP = 4;
export const RAMP_RED_HEX = '#DE2D26';

export async function applyRampShade(
  page: Page,
  family: RampFamilyLabel,
  step: number,
): Promise<void> {
  const pill = page.getByRole('radio', { name: family, exact: true });
  await pill.check();
  await expect(pill).toBeChecked();

  const segment = page.getByRole('button', {
    name: `Apply ${family} shade ${String(step)} of 5`,
    exact: true,
  });
  await segment.click();
  await expect(segment).toHaveAttribute('aria-pressed', 'true');
}

/**
 * The single most-copied line in the suite: paint the current selection red.
 * A named helper so a later palette change is one edit rather than eight.
 */
export async function applyRampRed(page: Page): Promise<void> {
  await applyRampShade(page, 'Reds', RAMP_RED_STEP);
}

/**
 * Select ONE country on the map and paint it a named ramp shade — the whole
 * five-line sequence, in one place (`04-15`).
 *
 * Three specs already spelled it out by hand and `04-15` needed a fourth
 * spelling with a per-call STEP, which is the point at which a copied sequence
 * becomes a drift hazard rather than a convenience. Two details it gets right
 * that a hand-rolled copy keeps getting wrong:
 *
 * - it names `[data-path-kind="logical"]`. Every visible unit is drawn three
 *   times (-360 deg, 0, +360 deg) so the Pacific composition has no date-line
 *   seam, and a bare `[data-country-id]` selector matches all three copies.
 * - it opens the Colors tool AFTER the selection. D-18 opens a first run with
 *   the panel CLOSED, so a colour can only be applied through its rail tool,
 *   and focusing the path first is what makes `Enter` select rather than
 *   re-target.
 *
 * Selection REPLACES rather than accumulates, so consecutive calls paint
 * different countries different shades — which is what makes a multi-shade
 * composition buildable through the real UI.
 */
export async function paintCountryWithRampShade(
  page: Page,
  countryId: string,
  family: RampFamilyLabel,
  step: number,
): Promise<void> {
  const country = page.locator(
    `path.country-path[data-country-id="${countryId}"][data-path-kind="logical"]`,
  );
  await country.focus();
  await country.press('Enter');
  await openRailTool(page, 'Colors');
  await applyRampShade(page, family, step);
}

/**
 * The legend DISCLOSURE inside the open Legend panel.
 *
 * `getByRole('button', { name: /^Legend/ })` now matches two controls - the
 * rail's `Legend` row and the disclosure's `Legend · N entries · Top left` -
 * so every caller scopes to the panel content rather than picking one by index.
 * An ordinal here would silently start clicking the rail row the next time the
 * rail's order changed.
 */
export function legendDisclosure(page: Page): ReturnType<Page['getByRole']> {
  return page
    .locator('.tool-panel__content')
    .getByRole('button', { name: /^Legend/ });
}

/**
 * Walks the sequential focus order from the top of the document.
 *
 * Promoted here from `rail.spec.ts` by `03-09`, which needed the same walk for
 * the narrow layout. A second copy would have drifted on the two things this
 * helper gets right and a naive one does not:
 *
 * - the STARTING POINT is reset for real. Blurring leaves the browser resuming
 *   `Tab` from wherever focus last was, so the walk "proves" an order that
 *   begins in the middle of the document. A temporary `tabindex="-1"` on `body`
 *   makes `focus()` take effect without adding a tab stop.
 * - `aria-hidden` children are EXCLUDED. Every rail control carries its label
 *   twice - once as the accessible name and once in the hidden tooltip chip -
 *   so a raw `textContent` reads `Export PNGExport PNG`, and an assertion
 *   written against that string pins the duplication as if it were the label.
 * - form controls resolve through `aria-labelledby` and their associated
 *   `<label>` (`04-07`). A radio inside a pill and a text field named by its
 *   section legend both have NO child text of their own, so the walk used to
 *   report them as `''` - and an order asserted against a run of empty strings
 *   is an order nobody can read and nothing can catch a swap in.
 */
export async function collectTabOrder(
  page: Page,
  steps: number,
): Promise<ReadonlyArray<string>> {
  await page.evaluate((): void => {
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });

  const order: string[] = [];
  for (let step = 0; step < steps; step += 1) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate((): string => {
        const active = document.activeElement;
        if (active === null) {
          return '';
        }
        if (active.hasAttribute('aria-label')) {
          return active.getAttribute('aria-label') ?? '';
        }
        const labelledBy = active.getAttribute('aria-labelledby');
        if (labelledBy !== null) {
          const named = labelledBy
            .split(/\s+/u)
            .map((id): string => document.getElementById(id)?.textContent ?? '')
            .join(' ')
            .trim();
          if (named !== '') {
            return named;
          }
        }
        const labels = (
          active as HTMLInputElement & { labels?: NodeListOf<HTMLLabelElement> }
        ).labels;
        if (labels !== undefined && labels !== null && labels.length > 0) {
          const labelled = labels[0].textContent?.trim() ?? '';
          if (labelled !== '') {
            return labelled.slice(0, 40);
          }
        }
        return [...active.childNodes]
          .filter(
            (node): boolean =>
              !(
                node instanceof Element &&
                node.getAttribute('aria-hidden') === 'true'
              ),
          )
          .map((node): string => node.textContent ?? '')
          .join('')
          .trim()
          .slice(0, 40);
      }),
    );
  }
  return order;
}

/* ------------------------------------------------------------------ *
 * Named geography -> exported PNG pixels (`04-15` promoted these here)
 *
 * Every sample point in every pixel gate is derived from a named lon/lat
 * through the REAL projection and the LIVE camera transform, never pasted as a
 * pixel. `export.spec.ts` owned these three functions until a second spec — the
 * composite reference frame — needed the same derivation; a copied projection
 * is the same drift shape as a copied decode path, with the added trap that the
 * copy still "works" while silently sampling a different place.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Named sample GEOGRAPHY (`04-15` promoted these here too)
 *
 * Each point below carries the derivation that chose it, and each was chosen
 * because a nearby alternative measured WRONG — `04-09` moved the coastline
 * sample after the interior mesh contaminated Cabo da Roca, and `04-10` had to
 * reject the Bellingshausen meridian because it reads water. A copy of one of
 * these in a second spec would not move when the original does, and the copy
 * would keep passing while sampling the wrong place.
 * ------------------------------------------------------------------ */

/**
 * Two sample points, converted through the real projection rather than
 * hard-coded as pixels. If either classification is wrong the gate goes RED —
 * a mislabelled "ocean" point fails the colour assertion and a mislabelled
 * "land" point fails the inequality — so a geography mistake here cannot
 * become a false pass.
 */
export const PACIFIC_LON_LAT: readonly [number, number] = [-140, 0];
export const SAHARA_LON_LAT: readonly [number, number] = [20, 26];

/**
 * A point that is certainly ON a coastline at the default world camera, derived
 * through `createWorldProjection()` rather than hard-coded.
 *
 * **MOVED by `04-09`, and the move is a repair rather than a re-baseline.**
 * `04-08` sampled Cabo da Roca (-9.5, 38.78), the western tip of mainland
 * Portugal, on the stated ground that a 6px radius "excludes the neighbouring
 * Spanish border". That was true only while nothing drew interior borders. It
 * is 1.5 degrees of longitude to the Portugal/Spain line, which at 1080px for
 * 360 degrees is **4.5 PNG pixels** - inside the band. Once `04-09` rendered
 * the interior mesh, the band measured interior ink at `coastlineWeight: none`
 * and the gate stopped measuring its advertised subject.
 *
 * The repair is a coastline with **no interior border anywhere in the country**:
 * Australia's west coast near North West Cape. Australia has no land neighbours
 * at all, so the exclusion is structural rather than a distance that has to be
 * re-checked whenever a line layer is added. Cabo da Roca measured **23** ink
 * pixels at `coastlineWeight: none` once the mesh rendered; this point measures
 * **0**. See `MIN_COASTLINE_BAND_INK_PIXELS` for the restated table.
 *
 * `COASTLINE_BAND_RADIUS` is in PNG pixels and is UNCHANGED. The viewBox is
 * 1080 over an EXPORT_SIZE of 1080, so a viewBox coordinate IS a PNG pixel; a
 * radius of 6 comfortably contains a `bold` (2 user unit -> 4px) stroke plus
 * its anti-aliasing.
 */
export const AUSTRALIA_WEST_COAST_LON_LAT: readonly [number, number] = [113.7, -22.3];
export const COASTLINE_BAND_RADIUS = 6;

/**
 * `04-09` Gate A's INLAND sample: the Franco-German Rhine, a boundary between
 * two large neighbours, so the sample survives sub-pixel placement. It is
 * nowhere near a coast, so ink measured here at `coastlineWeight: none` can
 * only have come from the interior mesh.
 *
 * The pairing with `AUSTRALIA_WEST_COAST_LON_LAT` is what makes Gate A an
 * INEQUALITY rather than two separate claims: the two samples are read from the
 * SAME export, through the same counter, at the same band radius.
 */
export const FRANCO_GERMAN_BORDER_LON_LAT: readonly [number, number] = [7.8, 48.7];

/**
 * Queen Maud Land. Antarctica fills the whole bottom band (y 960..1080 is
 * 80.3 S to 85 S) at this meridian, and unlike the Arctic it is continental
 * rather than a scatter of islands. Measured: `#E5E7EB` at every sampled row.
 *
 * Not every meridian works - the Bellingshausen Sea at about 73 W reads WATER
 * at y 958..970 - which is exactly why the land check below is an assertion
 * rather than a comment.
 */
export const BOTTOM_BAND_MERIDIAN = 0;

/** A named lon/lat in the camera's own user space, rounded to whole units. */
export function projectLonLat(
  lonLat: readonly [number, number],
): readonly [number, number] {
  const projected = createWorldProjection()([lonLat[0], lonLat[1]]);
  if (projected === null) {
    throw new Error(`(${String(lonLat[0])}, ${String(lonLat[1])}) does not project.`);
  }
  return [Math.round(projected[0]), Math.round(projected[1])];
}

/**
 * Camera user space -> the SVG's 0..1080 viewBox space, read from the live
 * document rather than assumed to be the identity. The PNG is 1080 wide over a
 * `0 0 1080 1080` viewBox, so a viewBox coordinate IS a PNG pixel.
 */
export async function toExportPixels(
  page: Page,
  points: ReadonlyArray<readonly [number, number]>,
): Promise<ReadonlyArray<readonly [number, number]>> {
  return page.evaluate(
    (cameraPoints: ReadonlyArray<readonly [number, number]>) => {
      const svg = document.querySelector('svg.map-canvas');
      const camera = document.querySelector('[data-layer="camera"]');
      if (
        !(svg instanceof SVGSVGElement) ||
        !(camera instanceof SVGGraphicsElement)
      ) {
        throw new Error('The canonical canvas or its camera layer is absent.');
      }
      const svgToScreen = svg.getScreenCTM();
      const cameraToScreen = camera.getScreenCTM();
      if (svgToScreen === null || cameraToScreen === null) {
        throw new Error('The canvas is not rendered, so it has no CTM.');
      }
      const cameraToViewBox = svgToScreen.inverse().multiply(cameraToScreen);
      return cameraPoints.map(([x, y]): readonly [number, number] => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const mapped = point.matrixTransform(cameraToViewBox);
        return [Math.round(mapped.x), Math.round(mapped.y)];
      });
    },
    points,
  );
}

/** The one-point convenience over the two functions above. */
export async function projectToExportPixel(
  page: Page,
  lonLat: readonly [number, number],
): Promise<readonly [number, number]> {
  const [pixel] = await toExportPixels(page, [projectLonLat(lonLat)]);
  if (pixel === undefined) {
    throw new Error(
      `(${String(lonLat[0])}, ${String(lonLat[1])}) did not map into the frame.`,
    );
  }
  return pixel;
}

export async function clearSavedMaps(page: Page): Promise<void> {
  await page.evaluate(
    (storageKey): void => localStorage.removeItem(storageKey),
    STORAGE_KEY,
  );
}

/**
 * The sentinel is written onto the live SVG once and never re-applied. It
 * survives a layout change only while the same DOM node does, so it is the
 * evidence that the 1200px transition *moved* the canvas instead of remounting
 * a second camera owner.
 */
export async function stampCameraOwnerSentinel(page: Page): Promise<void> {
  await page.locator('svg.map-canvas').evaluate((svg, attribute): void => {
    svg.setAttribute(attribute, 'stable-owner');
  }, CAMERA_OWNER_SENTINEL);
}

export async function expectOneCameraOwner(page: Page): Promise<void> {
  await expect(page.locator('svg.map-canvas')).toHaveCount(1);
  await expect(page.locator(CAMERA_GROUP_SELECTOR)).toHaveCount(1);
  await expect(page.locator('svg.map-canvas')).toHaveAttribute(
    CAMERA_OWNER_SENTINEL,
    'stable-owner',
  );
}

export async function readCameraTransform(page: Page): Promise<CameraTransform> {
  return page
    .locator(CAMERA_GROUP_SELECTOR)
    .first()
    .evaluate((element): CameraTransform => {
      const group = element as SVGGElement;
      const matrix = group.transform.baseVal.consolidate()?.matrix;
      if (matrix === undefined) {
        throw new Error('Camera transform is unavailable');
      }
      return { k: matrix.a, x: matrix.e, y: matrix.f };
    });
}

export async function expectD3ZoomSynchronized(page: Page): Promise<void> {
  const synchronization = await page
    .locator('svg.map-canvas')
    .evaluate((element) => {
      const svg = element as SVGSVGElement & {
        __zoom?: { readonly k: number; readonly x: number; readonly y: number };
      };
      const cameraGroup = svg.querySelector<SVGGElement>('[data-layer="camera"]');
      const matrix = cameraGroup?.transform.baseVal.consolidate()?.matrix;
      if (svg.__zoom === undefined || matrix === undefined) {
        throw new Error('D3 zoom state is unavailable.');
      }
      return {
        zoom: svg.__zoom,
        transform: { k: matrix.a, x: matrix.e, y: matrix.f },
      };
    });

  expect(synchronization.zoom.k).toBeCloseTo(synchronization.transform.k, 4);
  expect(synchronization.zoom.x).toBeCloseTo(synchronization.transform.x, 2);
  expect(synchronization.zoom.y).toBeCloseTo(synchronization.transform.y, 2);
}

/** Waits on real frames rather than a sleep, so transitions are never raced. */
export async function waitForSettledCamera(
  page: Page,
): Promise<CameraTransform> {
  let previous = await readCameraTransform(page);
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
      const current = await readCameraTransform(page);
      const isSettled =
        Math.abs(current.k - previous.k) < 0.000001 &&
        Math.abs(current.x - previous.x) < 0.000001 &&
        Math.abs(current.y - previous.y) < 0.000001;
      previous = current;
      return isSettled;
    })
    .toBe(true);
  return readCameraTransform(page);
}
