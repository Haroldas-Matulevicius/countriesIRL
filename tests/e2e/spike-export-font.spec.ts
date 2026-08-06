/**
 * OQ-1 spike (03-01 Task 2) — THROWAWAY.
 *
 * Question: does a base64 `@font-face` declared in a `<style>` *inside* an SVG
 * resolve when that SVG is rasterised as an `<img>` whose `src` is
 * `"data:image/svg+xml," + encodeURIComponent(XMLSerializer output)`?
 *
 * That serialisation shape is exactly what `src/utils/export.ts` now performs
 * itself (D-34, plan 03-11): `serialiseCloneToImageUrl` builds the same
 * `encodeURIComponent`'d data URL. The escaping is `encodeURIComponent`, not
 * base64, and a very long base64 `src` inside an `encodeURIComponent`'d data
 * URL is the unusual shape OQ-1 doubted. So the spike reproduces the shape
 * verbatim rather than approximating it.
 *
 * Scope: installed Google Chrome only. Edge is not installed on this machine
 * (D-33) and is deliberately not run. WebKit/Safari is the documented exception
 * for this technique — it treats data URIs in SVG-as-image as external files — and
 * is outside this project's certification scope; that fact is recorded, not solved.
 *
 * Why three assertions and not one: asserting only that the two rasters DIFFER is
 * satisfied by two blank canvases. This repository already shipped a pixel probe
 * with exactly that defect (`coding-rules/general.md` §Testing Expectations). The
 * blank control and the non-blankness checks are what make the difference
 * assertion mean something.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

const PROBE_FAMILY = 'OQ1ProbeFace';
// Distinctive advance widths between an embedded face and the generic fallback.
const PROBE_LABEL = 'Wig 111 fjord';
const PROBE_WIDTH = 1024;
const PROBE_HEIGHT = 96;
const PROBE_FONT_SIZE = 56;
// A pixel counts as different only past this per-channel delta, so anti-aliasing
// jitter alone cannot manufacture a difference.
const CHANNEL_DELTA_THRESHOLD = 8;
// The probe paints black text on a white rect; anything darker than this is ink.
const INK_LUMINANCE_THRESHOLD = 200;
const MIN_DIFFERING_PIXELS = 200;
const MIN_INK_PIXELS = 500;

interface ProbeFont {
  readonly label: string;
  readonly path: string;
}

interface ProbeResult {
  readonly diffPresentVsAbsent: number;
  readonly inkPresent: number;
  readonly inkAbsent: number;
  readonly inkBlank: number;
  readonly diffBlankVsPresent: number;
  readonly diffBlankVsAbsent: number;
  readonly dataUrlLength: number;
  readonly userAgent: string;
}

interface ProbeInput {
  readonly fontBase64: string;
  readonly family: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly channelDelta: number;
  readonly inkLuminance: number;
}

const FONT_CANDIDATES: readonly ProbeFont[] = [
  {
    label: 'Inter Variable, latin subset (src/assets/inter-latin-variable.woff2)',
    path: resolve('src/assets/inter-latin-variable.woff2'),
  },
  {
    label:
      'Iosevka Light, monospace (node_modules/mapshaper/www/assets/iosevka-light.woff2)',
    path: resolve('node_modules/mapshaper/www/assets/iosevka-light.woff2'),
  },
];

const AVAILABLE_FONTS = FONT_CANDIDATES.filter((font) => existsSync(font.path));

/**
 * Without this the whole file passes vacuously when no candidate is on disk —
 * zero tests generated, green run, nothing probed.
 */
test('OQ-1 spike: at least one probe font is on disk', () => {
  expect(
    AVAILABLE_FONTS.length,
    `no probe woff2 found; looked for:\n${FONT_CANDIDATES.map((f) => f.path).join('\n')}`,
  ).toBeGreaterThan(0);
});

for (const font of AVAILABLE_FONTS) {
  test(`OQ-1: base64 @font-face resolves inside SVG-as-image [${font.label}]`, async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const fontBytes = readFileSync(font.path);
    const fontBase64 = fontBytes.toString('base64');

    await page.goto('/');

    const result = await page.evaluate(async (input: ProbeInput): Promise<ProbeResult> => {
      const {
        fontBase64: base64,
        family,
        label,
        width,
        height,
        fontSize,
        channelDelta,
        inkLuminance,
      } = input;

      type ProbeMode = 'font' | 'nofont' | 'blank';

      const styleBlock =
        `<style>@font-face{font-family:'${family}';` +
        `src:url(data:font/woff2;base64,${base64}) format('woff2');` +
        `font-weight:100 900;font-style:normal;}</style>`;

      // Both text variants name the SAME family with the SAME fallback. The only
      // difference between them is whether the @font-face rule exists, so any
      // pixel difference is attributable to the embedded face and nothing else.
      const textBlock =
        `<text x="8" y="${Math.round(height * 0.72)}" ` +
        `font-family="'${family}', serif" font-size="${fontSize}" ` +
        `fill="#000000">${label}</text>`;

      const buildMarkup = (mode: ProbeMode): string =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" ` +
        `height="${height}" viewBox="0 0 ${width} ${height}">` +
        `${mode === 'font' ? styleBlock : ''}` +
        `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>` +
        `${mode === 'blank' ? '' : textBlock}` +
        `</svg>`;

      // The exact shape `src/utils/export.ts` `serialiseCloneToImageUrl` uses:
      //   "data:image/svg+xml," + encodeURIComponent(s.serializeToString(img))
      // encodeURIComponent, NOT base64 — the escaping is part of the question.
      const serialiseLikeHtml2Canvas = (markup: string): string => {
        const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
        const parseError = parsed.querySelector('parsererror');
        if (parseError !== null) {
          throw new Error(`probe SVG failed to parse: ${parseError.textContent}`);
        }
        const serialised = new XMLSerializer().serializeToString(
          parsed.documentElement,
        );
        return `data:image/svg+xml,${encodeURIComponent(serialised)}`;
      };

      const rasterise = async (mode: ProbeMode): Promise<Uint8ClampedArray> => {
        const dataUrl = serialiseLikeHtml2Canvas(buildMarkup(mode));
        const image = new Image();
        image.width = width;
        image.height = height;
        await new Promise<void>((resolveLoad, rejectLoad) => {
          image.onload = (): void => resolveLoad();
          image.onerror = (): void =>
            rejectLoad(new Error(`SVG-as-image failed to load for mode ${mode}`));
          image.src = dataUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (context === null) {
          throw new Error('2d context unavailable');
        }
        context.drawImage(image, 0, 0, width, height);
        return context.getImageData(0, 0, width, height).data;
      };

      const countDiffering = (
        a: Uint8ClampedArray,
        b: Uint8ClampedArray,
      ): number => {
        let differing = 0;
        for (let index = 0; index < a.length; index += 4) {
          if (
            Math.abs(a[index] - b[index]) > channelDelta ||
            Math.abs(a[index + 1] - b[index + 1]) > channelDelta ||
            Math.abs(a[index + 2] - b[index + 2]) > channelDelta
          ) {
            differing += 1;
          }
        }
        return differing;
      };

      const countInk = (raster: Uint8ClampedArray): number => {
        let ink = 0;
        for (let index = 0; index < raster.length; index += 4) {
          const luminance =
            0.2126 * raster[index] +
            0.7152 * raster[index + 1] +
            0.0722 * raster[index + 2];
          if (luminance < inkLuminance) {
            ink += 1;
          }
        }
        return ink;
      };

      const present = await rasterise('font');
      const absent = await rasterise('nofont');
      const blank = await rasterise('blank');

      return {
        diffPresentVsAbsent: countDiffering(present, absent),
        inkPresent: countInk(present),
        inkAbsent: countInk(absent),
        inkBlank: countInk(blank),
        diffBlankVsPresent: countDiffering(blank, present),
        diffBlankVsAbsent: countDiffering(blank, absent),
        dataUrlLength: serialiseLikeHtml2Canvas(buildMarkup('font')).length,
        userAgent: navigator.userAgent,
      };
    }, {
      fontBase64,
      family: PROBE_FAMILY,
      label: PROBE_LABEL,
      width: PROBE_WIDTH,
      height: PROBE_HEIGHT,
      fontSize: PROBE_FONT_SIZE,
      channelDelta: CHANNEL_DELTA_THRESHOLD,
      inkLuminance: INK_LUMINANCE_THRESHOLD,
    } satisfies ProbeInput);

    const fontStat = statSync(font.path);
    console.log(
      `\n[OQ-1 spike] ${font.label}\n` +
        `  woff2 bytes                : ${fontStat.size}\n` +
        `  base64 chars               : ${fontBase64.length}\n` +
        `  data URL chars (font mode) : ${result.dataUrlLength}\n` +
        `  userAgent                  : ${result.userAgent}\n` +
        `  diff present vs absent     : ${result.diffPresentVsAbsent}\n` +
        `  ink present                : ${result.inkPresent}\n` +
        `  ink absent                 : ${result.inkAbsent}\n` +
        `  ink blank control          : ${result.inkBlank}\n` +
        `  diff blank vs present      : ${result.diffBlankVsPresent}\n` +
        `  diff blank vs absent       : ${result.diffBlankVsAbsent}\n`,
    );

    // (1) The embedded face changed the raster. If Chrome ignored the data-URI
    //     font both runs fall back to serif and this goes to ~0.
    expect(
      result.diffPresentVsAbsent,
      'font-present and font-absent rasters are identical — the embedded @font-face did not resolve',
    ).toBeGreaterThan(MIN_DIFFERING_PIXELS);

    // (2) Discrimination control: neither text raster is blank, so (1) cannot be
    //     satisfied by two empty canvases.
    expect(result.inkPresent, 'font-present raster is blank').toBeGreaterThan(
      MIN_INK_PIXELS,
    );
    expect(result.inkAbsent, 'font-absent raster is blank').toBeGreaterThan(
      MIN_INK_PIXELS,
    );

    // (3) A deliberately blank raster IS blank and differs from both text rasters
    //     — this is what proves the ink counts above are measuring real glyphs.
    expect(result.inkBlank, 'blank control raster is not blank').toBe(0);
    expect(result.diffBlankVsPresent).toBeGreaterThan(MIN_INK_PIXELS);
    expect(result.diffBlankVsAbsent).toBeGreaterThan(MIN_INK_PIXELS);
  });
}
