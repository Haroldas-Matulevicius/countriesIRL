import { expect, test, type Page } from '@playwright/test';

import {
  applyRampShade,
  collectTabOrder,
  openRailTool,
  waitForApp,
} from './support/appHarness';

/**
 * The redesigned Colors panel (`04-07`, D4-04 / D4-05) — target sizes, keyboard
 * operability, focus order, and the focus ring.
 *
 * **What this file does NOT claim.** `G-3` is the owner's subjective judgement
 * — *"too squished, not organized well, hate the multi boxes within"* — and a
 * green suite here does not resolve it. A9 (screen-reader pass over the strip),
 * A10 (physical 200 % zoom at 360px), and A11 (dark-theme visual review) are
 * PHYSICAL checks scheduled in `04-16`. None of them was ever performed in
 * Phase 3 either: nine of its twelve UAT cells were skipped, and skipped is not
 * passed. Nothing below may be cited as covering any of them.
 *
 * Browser scope: **installed Chrome only.** Microsoft Edge is not installed on
 * this machine, so the `msedge` project cannot launch and no Edge result may be
 * produced or cited.
 */

/** D-20's narrow arrangement, where `--target-compact` (44px) is the floor. */
const COMPACT_VIEWPORT = { width: 900, height: 900 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** Literals, never a `.length` read. `RAMP_STEP_COUNT` is derived from
 * `328 / N >= 44` and Phase 4 ships five; the families are `04-02`'s five. */
const RAMP_STEP_COUNT = 5;
const RAMP_FAMILY_COUNT = 5;
const TARGET_FLOOR_PX = 44;

/** `theme.css:214`, the light-mode focus ring. */
const FOCUS_BLUE: readonly [number, number, number] = [0x00, 0x71, 0xe3];

async function selectFrance(page: Page): Promise<void> {
  const france = page.locator('path.country-path[data-country-id="FRA"]');
  await france.focus();
  await france.press('Enter');
  await openRailTool(page, 'Colors');
}

test.describe('the Colors panel', (): void => {
  test.beforeEach(async ({ page }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
  });

  /**
   * **A4 — target size, read from Playwright's own bounding boxes.**
   *
   * A CSS-value read is not the same claim: `min-height: 44px` on a control
   * whose parent constrains it renders at 30 and still reads back as declared.
   * The count is asserted against literals so a strip that rendered zero
   * segments could not satisfy a `forEach` over nothing.
   */
  test('every ramp segment and family pill clears 44x44 at the compact breakpoint', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(COMPACT_VIEWPORT);
    await expect(page.locator('.map-editor')).toHaveAttribute(
      'data-layout',
      'compact',
    );
    await selectFrance(page);

    const segments = page.locator('.ramp-strip__step');
    const pills = page.locator('.panel-pill');

    await expect(segments).toHaveCount(RAMP_STEP_COUNT);
    await expect(pills).toHaveCount(RAMP_FAMILY_COUNT);

    for (const [name, locator, expectedCount] of [
      ['ramp segment', segments, RAMP_STEP_COUNT],
      ['family pill', pills, RAMP_FAMILY_COUNT],
    ] as const) {
      let measured = 0;

      for (let index = 0; index < expectedCount; index += 1) {
        const box = await locator.nth(index).boundingBox();
        if (box === null) {
          throw new Error(`${name} ${String(index)} has no box.`);
        }
        expect(
          box.width,
          `${name} ${String(index)} is ${String(Math.round(box.width))}px wide`,
        ).toBeGreaterThanOrEqual(TARGET_FLOOR_PX);
        expect(
          box.height,
          `${name} ${String(index)} is ${String(Math.round(box.height))}px tall`,
        ).toBeGreaterThanOrEqual(TARGET_FLOOR_PX);
        measured += 1;
      }

      expect(measured, `${name}s measured`).toBe(expectedCount);
    }
  });

  /**
   * **A5 — keyboard operability, and one of the plan's three backstops.**
   *
   * RED-proved against the arrangement it replaces: `RampStrip.tsx` copied to
   * the scratchpad, every segment given `tabIndex={0}`, this spec run, the
   * one-tab-stop assertion observed red, then restored by copy-back. The
   * verbatim message is in `04-07-SUMMARY.md`. A focus-order claim with no RED
   * probe is a comment, not a test.
   */
  test('the ramp strip is one tab stop, walks on arrows, and applies on Enter and Space', async ({
    page,
  }): Promise<void> => {
    await selectFrance(page);

    const segments = page.locator('.ramp-strip__step');
    await expect(segments).toHaveCount(RAMP_STEP_COUNT);

    // ONE tab stop: exactly one segment is reachable by sequential navigation.
    const tabbable = await page.evaluate(
      (): number =>
        [...document.querySelectorAll('.ramp-strip__step')].filter(
          (step): boolean => step.getAttribute('tabindex') === '0',
        ).length,
    );
    expect(
      tabbable,
      'the strip must be ONE tab stop with a roving tabindex, not five stops ' +
        'a creator has to walk past to reach Custom color.',
    ).toBe(1);

    await segments.first().focus();
    await expect(segments.nth(0)).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(segments.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(segments.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(segments.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(segments.nth(RAMP_STEP_COUNT - 1)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(segments.nth(0)).toBeFocused();

    const france = page.locator('path.country-path[data-country-id="FRA"]');

    // Enter applies, and the map is what proves it - not the button's own class.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(segments.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(france).toHaveAttribute('fill', '#BDD7E7');

    // Space applies too, on a different step so the assertion cannot pass on
    // the state Enter already produced.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press(' ');
    await expect(segments.nth(3)).toHaveAttribute('aria-pressed', 'true');
    await expect(france).toHaveAttribute('fill', '#2171B5');

    // Selection is never carried by colour alone (A6).
    await expect(page.locator('.ramp-strip__check')).toHaveCount(1);
    await expect(page.locator('.ramp-strip__readout')).toHaveText(
      'Step 4 of 5 · #2171B5',
    );
  });

  /**
   * **Focus order — the second backstop, and a HELD-OUT one at verify time.**
   *
   * It asserts the SPEC'd order (`04-UI-SPEC.md § 6.3.3`), including the
   * controls a disabled state REMOVES: with nothing selected, both `<fieldset>`
   * groups are natively disabled, so neither the family pills nor the segments
   * nor `Apply Color` are tab stops at all — and asserting their ABSENCE is the
   * difference between knowing why and not noticing.
   *
   * RED-proved against the arrangement it replaces by moving
   * `ResetColorsAction` above `ColorPicker` in `App.tsx`; verbatim message in
   * the summary.
   */
  test('the panel focus order matches the specified section order', async ({
    page,
  }): Promise<void> => {
    await openRailTool(page, 'Colors');

    /*
     * Nothing selected, nothing coloured. MEASURED, not assumed: the panel
     * contributes ZERO tab stops in this state. Both `<fieldset>` groups are
     * natively disabled, `Clear Selection` is not rendered, and
     * `Reset All Colors` is disabled because `canReset` is false - so the walk
     * goes straight from `Close Colors` into the map.
     *
     * Asserting the ABSENCES is the point. A group left present-but-inert with
     * `aria-disabled` would still appear here, and that is exactly the pattern
     * `04-UI-SPEC.md § 6.3.2` forbids.
     */
    const emptyOrder = await collectTabOrder(page, 14);
    expect(emptyOrder).toContain('Close Colors');
    ['Apply Color', 'Apply Blues shade 1 of 5', 'Blues', 'Reset All Colors'].forEach(
      (label): void => {
        expect(
          emptyOrder,
          `"${label}" is a tab stop while its group is disabled. A disabled ` +
            'group must be absent from the sequence, not present and inert.',
        ).not.toContain(label);
      },
    );

    /*
     * Now the fully populated order. Both of the panel's two conditionally
     * enabled controls have to be REAL tab stops for this to assert anything:
     * `Apply Color` needs a valid draft that differs from the current colour,
     * and `Reset All Colors` needs something to reset. Without both, the walk
     * silently skips them and the order below would be asserting four anchors
     * while claiming six.
     */
    await selectFrance(page);
    await applyRampShade(page, 'Blues', 1);
    await page.locator('.panel-field').fill('#123456');

    const filledOrder = await collectTabOrder(page, 18);
    const positionOf = (label: string): number => {
      const index = filledOrder.indexOf(label);
      expect(index, `"${label}" never appeared in ${filledOrder.join(' > ')}`)
        .toBeGreaterThanOrEqual(0);
      return index;
    };

    // Selection -> Ramp (pills, then the strip's one stop) -> Custom color ->
    // Reset All Colors. Relative positions, so an unrelated rail change
    // upstream of the panel does not rewrite this expectation.
    const clearSelection = positionOf('Clear Selection');
    const familyPill = positionOf('Blues');
    const segment = positionOf('Apply Blues shade 1 of 5');
    const hexField = positionOf('Custom color');
    const applyColor = positionOf('Apply Color');
    const reset = positionOf('Reset All Colors');

    expect(clearSelection).toBeLessThan(familyPill);
    expect(familyPill).toBeLessThan(segment);
    expect(segment).toBeLessThan(hexField);
    expect(hexField).toBeLessThan(applyColor);
    expect(applyColor).toBeLessThan(reset);

    // The strip contributes exactly one stop, in the middle of that order.
    expect(
      filledOrder.filter((label): boolean =>
        label.startsWith('Apply Blues shade'),
      ),
    ).toHaveLength(1);
  });

  /**
   * **The focus ring is INSET, so the band's `overflow: hidden` cannot clip it
   * — the third backstop, and it IS measurable.**
   *
   * Measured on rendered pixels rather than on a computed value, because the
   * defect is geometric: the global ring is an `outline`, which paints OUTSIDE
   * the border box and is therefore clipped away at the first and last segment
   * by the band that contains them. A computed-style read would report the
   * outline as present in exactly the case where the creator cannot see it.
   *
   * The probe samples a narrow column just inside each end of the band and
   * requires focus blue in it. RED-proved by putting the strip's focus back on
   * the global outline; the verbatim message is in the summary.
   */
  test('the focus ring is visible at the first and last segment, unclipped', async ({
    page,
  }): Promise<void> => {
    await selectFrance(page);

    const strip = page.locator('.ramp-strip');
    const segments = page.locator('.ramp-strip__step');

    const ringPixelsAtEdge = async (edge: 'start' | 'end'): Promise<number> => {
      const shot = await strip.screenshot();
      return page.evaluate(
        async ({
          base64,
          side,
          blue,
        }: {
          readonly base64: string;
          readonly side: 'start' | 'end';
          readonly blue: readonly [number, number, number];
        }): Promise<number> => {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
          }
          const bitmap = await createImageBitmap(
            new Blob([bytes], { type: 'image/png' }),
          );
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext('2d');
          if (context === null) {
            throw new Error('No 2D context for the ring probe.');
          }
          context.drawImage(bitmap, 0, 0);

          /*
           * A six-pixel column just inside the band's own edge. Narrow enough
           * that the ring is the only thing that can be in it, wide enough to
           * survive sub-pixel placement and the band's corner radius - which is
           * also why the vertical span excludes the rounded corners.
           */
          const columnWidth = 6;
          const x = side === 'start' ? 1 : Math.max(0, bitmap.width - 1 - columnWidth);
          const top = Math.round(bitmap.height * 0.3);
          const height = Math.max(1, Math.round(bitmap.height * 0.4));
          const { data } = context.getImageData(x, top, columnWidth, height);

          let matched = 0;
          for (let index = 0; index < data.length; index += 4) {
            const isBlue =
              Math.abs(data[index] - blue[0]) <= 24 &&
              Math.abs(data[index + 1] - blue[1]) <= 24 &&
              Math.abs(data[index + 2] - blue[2]) <= 24;
            if (isBlue) {
              matched += 1;
            }
          }
          return matched;
        },
        { base64: shot.toString('base64'), side: edge, blue: FOCUS_BLUE },
      );
    };

    /*
     * THE PROBE'S OWN CONTROL, first. Without it, "there is blue at the edge"
     * would be satisfied by a `blues` shade - and this strip is literally full
     * of blue. `Greys` puts a near-white shade under the ring, so a match in
     * the UNFOCUSED control would mean the probe is measuring the wrong thing.
     */
    await applyRampShade(page, 'Greys', 1);
    await page.locator('.panel-field').focus();
    expect(
      await ringPixelsAtEdge('start'),
      'the unfocused control already matches focus blue, so this probe would ' +
        'pass without a ring.',
    ).toBe(0);

    /*
     * Reached by KEYBOARD, deliberately. Chrome only matches `:focus-visible`
     * when focus arrived from the keyboard, so `locator.focus()` produces a
     * focused segment with no ring at all - a probe that would report the
     * defect it is looking for on a perfectly correct implementation.
     */
    await page.keyboard.press('Shift+Tab');
    await expect(segments.first()).toBeFocused();
    expect(
      await ringPixelsAtEdge('start'),
      'the focus ring on the FIRST segment is clipped by the band. Render it ' +
        'inset; an outline paints outside the border box and overflow:hidden ' +
        'removes it.',
    ).toBeGreaterThan(0);

    await page.keyboard.press('End');
    await expect(segments.nth(RAMP_STEP_COUNT - 1)).toBeFocused();
    expect(
      await ringPixelsAtEdge('end'),
      'the focus ring on the LAST segment is clipped by the band.',
    ).toBeGreaterThan(0);
  });

  /**
   * The panel is 360px wide and its content measure is 328px — the number every
   * width claim in `04-UI-SPEC.md § 6` derives from, including
   * `RAMP_STEP_COUNT`'s `328 / N >= 44`. Measured on the rendered box, because
   * a token that resolves correctly and a track that renders at that width are
   * two different claims.
   */
  test('the open flyout is 360px and the strip fills its content measure', async ({
    page,
  }): Promise<void> => {
    await selectFrance(page);

    const body = await page.locator('.tool-panel__body').boundingBox();
    const strip = await page.locator('.ramp-strip').boundingBox();
    if (body === null || strip === null) {
      throw new Error('The panel is not composed.');
    }

    expect(Math.round(body.width)).toBe(360);
    // 360 - 2 x --space-md (16px).
    expect(Math.round(strip.width)).toBe(328);
    expect(Math.round(strip.height)).toBe(48);
  });
});

/**
 * The `Map style` panel's `04-08` sections. They live beside the Colors panel
 * suite because they are the same flat vocabulary, measured the same way, at
 * the same 360px flyout.
 *
 * **What this does NOT claim.** These are geometry and label assertions on a
 * rendered box. Whether the panel READS well at 360px is `G-3`'s subjective
 * territory and the physical review scheduled in `04-16`; a green run here is
 * not a substitute for either.
 */
test.describe('the Map style panel', (): void => {
  /** `04-UI-SPEC.md § 9`, byte-exact. Literals, never derived from the app. */
  const WEIGHT_LABELS = ['None', 'Hairline', 'Thin', 'Medium', 'Bold'] as const;

  test('spells the five weight options exactly as the spec does', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);
    await openRailTool(page, 'Map style');

    const coastlines = page.getByRole('radiogroup', { name: 'Coastlines' });
    await expect(coastlines.getByRole('radio')).toHaveCount(
      WEIGHT_LABELS.length,
    );
    // The label wraps the visually-hidden input, so the STRING lives on the
    // pill and the accessible NAME is derived from it. Both are asserted: a
    // pill whose text drifted from its accessible name is a real defect.
    await expect(coastlines.locator('.panel-pill')).toHaveText([
      ...WEIGHT_LABELS,
    ]);
    for (const label of WEIGHT_LABELS) {
      await expect(
        coastlines.getByRole('radio', { name: label, exact: true }),
      ).toHaveCount(1);
    }

    const interior = page.getByRole('radiogroup', { name: 'Interior' });
    await expect(interior.locator('.panel-pill')).toHaveText([
      ...WEIGHT_LABELS,
    ]);

    // No un-set state: the defaults are `thin` interior, `none` coastlines.
    await expect(interior.getByRole('radio', { name: 'Thin' })).toBeChecked();
    await expect(coastlines.getByRole('radio', { name: 'None' })).toBeChecked();
  });

  /**
   * FIVE PILLS WRAP TO TWO ROWS. Measured on bounding boxes rather than
   * asserted from the stylesheet: `flex-wrap: wrap` resolving correctly and
   * five pills actually landing on two rows at 328px are different claims, and
   * only the second one is the contract.
   *
   * The discrimination control is the row count itself — `toBeGreaterThan(1)`
   * would pass on five rows, so the distinct `y` values are asserted to be
   * exactly two.
   */
  test('wraps the five weight pills onto two rows at 360px', async ({
    page,
  }): Promise<void> => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await waitForApp(page);
    await openRailTool(page, 'Map style');

    const body = await page.locator('.tool-panel__body').boundingBox();
    expect(body === null ? 0 : Math.round(body.width)).toBe(360);

    const pills = page
      .getByRole('radiogroup', { name: 'Coastlines' })
      .locator('.panel-pill');
    await expect(pills).toHaveCount(WEIGHT_LABELS.length);

    const boxes = await pills.evaluateAll((nodes: Element[]) =>
      nodes.map((node): { y: number; right: number } => {
        const rect = node.getBoundingClientRect();
        return { y: Math.round(rect.y), right: Math.round(rect.right) };
      }),
    );
    expect(boxes).toHaveLength(WEIGHT_LABELS.length);

    const rows = [...new Set(boxes.map((box): number => box.y))];
    expect(
      rows,
      `the five weight pills landed on ${rows.length} row(s). Two is the ` +
        'contract: one row means the type was shrunk to force it, and three ' +
        'or more means the pill padding has drifted.',
    ).toHaveLength(2);

    const first = boxes[0];
    const last = boxes[boxes.length - 1];
    if (first === undefined || last === undefined) {
      throw new Error('The pill row measured nothing.');
    }
    expect(
      last.y,
      'the first and last pill share a row, so nothing wrapped.',
    ).toBeGreaterThan(first.y);

    // Nothing overflows the 328px content measure on either row.
    const panelRight = (body?.x ?? 0) + 360;
    boxes.forEach((box): void => {
      expect(box.right).toBeLessThanOrEqual(panelRight);
    });
  });

  test('spends no accent on this panel and keeps every control defaulted', async ({
    page,
  }): Promise<void> => {
    await waitForApp(page);
    await openRailTool(page, 'Map style');

    // D-05: one accent per surface, and `Map style` has no primary action.
    await expect(
      page.locator('.workspace__map-style .panel-action'),
    ).toHaveCount(3);
    await expect(
      page.getByRole('button', { name: 'Reset Map Style' }),
    ).toBeDisabled();

    for (const section of ['Water', 'Uncolored countries']) {
      await expect(
        page.locator('.workspace__map-style fieldset', { hasText: section }),
      ).not.toHaveCount(0);
    }
  });
});
