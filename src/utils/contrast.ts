/**
 * The ONE WCAG contrast implementation in this repository.
 *
 * Moved VERBATIM out of `src/styles/uiContract.test.ts` by plan `04-01`, where
 * these three functions were file-private. Phase 4 needs the same arithmetic in
 * production-adjacent code (`src/utils/mapStyle.test.ts` gates every shipped
 * water preset against the composition-ink floor below), and a second copy is
 * the drift this project already paid for once with the
 * `LEGEND_CHARACTERS_PER_LINE` / `LABEL_CHARACTERS_PER_LINE` split. The bodies
 * are unchanged so the numbers cannot move; only the signatures were widened to
 * `readonly` tuples.
 *
 * The behavioural split is deliberate and is part of the contract:
 * `parseHexColor` returns `null` on bad input, while `contrastRatio` THROWS on a
 * null parse. The throw is what makes a typo in a ramp hex or a preset hex loud
 * instead of silently rating an unparseable colour as black.
 */

/** WCAG 2.2 AA minimum contrast for body-sized text. */
export const WCAG_AA_BODY_RATIO = 4.5;

/**
 * The single fixed composition ink. Written inline into the exported SVG, never
 * as a class or a `var()` — `theme.css:260` declares the matching
 * `--map-fixed-text` for the editor-side preview only.
 */
export const COMPOSITION_INK_COLOR = '#111827';

/**
 * The luminance floor a creator-chosen composition surface (water, uncolored
 * fill, band background) must clear so `COMPOSITION_INK_COLOR` still reads at
 * WCAG AA on it.
 *
 * Derivation, not a taste call. `#111827` has relative luminance
 * `L_ink = 0.00918913...`. Requiring `(L + 0.05) / (L_ink + 0.05) >= 4.5` solves
 * to `L >= 4.5 * (L_ink + 0.05) - 0.05` = **0.21635148683120853**.
 *
 * `04-UI-SPEC.md § 4.2` states this floor as `0.216`, which is the exact value
 * rounded DOWN and is therefore very slightly PERMISSIVE: a surface sitting at
 * exactly 0.216 measures 4.4941:1 against the ink and fails AA by 0.006. The
 * shipped constant rounds UP instead, so clearing it always implies clearing
 * 4.5:1. `contrast.test.ts` recomputes the exact floor from the ink rather than
 * restating this literal, which is what makes the correction hold if the ink
 * ever moves.
 *
 * Reference points measured with `relativeLuminance` below: mid-grey `#808080`
 * is 0.215861 (fails, 4.4917:1) and steel blue `#4682B4` is 0.205626 (fails,
 * 4.3188:1). A second ink at `#4B5563` would raise this floor to 0.575 and
 * leave only near-white surfaces legal — which is why there is one ink.
 */
export const MIN_COMPOSITION_SURFACE_LUMINANCE = 0.2164;

export function parseHexColor(
  value: string,
): readonly [number, number, number] | null {
  const match = /^#(?<digits>[\da-f]{6}|[\da-f]{3})$/iu.exec(value.trim());
  if (match?.groups === undefined) {
    return null;
  }

  const digits = match.groups.digits;
  const expanded =
    digits.length === 3
      ? [...digits].map((digit): string => digit + digit).join('')
      : digits;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

/** WCAG 2.2 relative luminance. */
export function relativeLuminance([red, green, blue]: readonly [
  number,
  number,
  number,
]): number {
  const channel = (raw: number): number => {
    const srgb = raw / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (foregroundRgb === null || backgroundRgb === null) {
    throw new Error(
      `Contrast needs two hex colors, got "${foreground}" on "${background}".`,
    );
  }

  const first = relativeLuminance(foregroundRgb);
  const second = relativeLuminance(backgroundRgb);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}
