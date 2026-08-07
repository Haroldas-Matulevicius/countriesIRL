/*
 * Why this file exists: the export clone is rasterised from a
 * `data:image/svg+xml` URL, and an SVG loaded as an image is an isolated
 * document — it cannot see the host document's `@font-face` rules (including
 * the ones in `theme.css`) and it cannot issue any request, same-origin
 * included. The ONLY way Inter reaches the exported PNG is as bytes inside
 * the serialised SVG subtree, which is what this module provides: the vendored
 * woff2 files as build-time data URLs, wrapped in `@font-face` rules that
 * `injectExportFontFace` (src/utils/export.ts) inserts into the clone.
 *
 * The `?inline` suffix makes Vite bake the bytes into the bundle as a
 * `data:font/woff2;base64,…` string at build time: no runtime fetch, no async
 * failure mode, deterministic across dev and build.
 *
 * TWO faces, ONE family (04-04, D4-15). Google Fonts always splits Inter by
 * `unicode-range`, so a single file covering latin AND latin-ext is not
 * obtainable from it and producing one needs a subsetting toolchain that is
 * measured absent on this machine. The answer is two vendored subsets scoped
 * by their own ranges — which is also why the LATIN face must carry an
 * explicit range: without one it matches every codepoint, and the two faces
 * (same family, same weight, same style) collapse to "last declaration wins"
 * instead of dividing the character space between them.
 *
 * Both ranges below are pasted VERBATIM from the live Google Fonts CSS2
 * response recorded in `src/assets/README.md` alongside each file's byte size,
 * SHA-256, fetch URL, and user agent. Do not retype, reorder, or "tidy" one: a
 * hand-typed range is a silent coverage hole — the rule still parses, the face
 * is still present, and the glyphs still fall back.
 *
 * Both faces are ALWAYS inlined, never conditionally on composition content.
 * `src/utils/export.ts` is the most safety-critical file in the repo and a
 * content-dependent branch there trades determinism for a saving that does not
 * change the PNG at all: the base64 rides in the intermediate SVG and the
 * bundle, and the PNG encoder is handed a raster. (The family-level
 * conditionality in `collectCompositionFonts` is a different, structural
 * thing, and it stays.)
 *
 * Coverage after this: latin-1 plus latin-ext. Greek, Cyrillic, Vietnamese
 * precomposed forms, and CJK are NOT vendored. No claim of full Unicode
 * coverage may be made anywhere.
 */
import interLatinDataUrl from '../assets/inter-latin-variable.woff2?inline';
import interLatinExtDataUrl from '../assets/inter-latin-ext-variable.woff2?inline';

export const EXPORT_FONT_FAMILY = 'Inter';

const INTER_LATIN_UNICODE_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, ' +
  'U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, ' +
  'U+2212, U+2215, U+FEFF, U+FFFD';

const INTER_LATIN_EXT_UNICODE_RANGE =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, ' +
  'U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, ' +
  'U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

function buildFontFace(dataUrl: string, unicodeRange: string): string {
  return (
    `@font-face{font-family:'${EXPORT_FONT_FAMILY}';` +
    `src:url(${dataUrl}) format('woff2');` +
    `font-weight:100 900;font-style:normal;font-display:block;` +
    `unicode-range:${unicodeRange};}`
  );
}

export function buildExportFontFaceCss(): string {
  return (
    buildFontFace(interLatinDataUrl, INTER_LATIN_UNICODE_RANGE) +
    buildFontFace(interLatinExtDataUrl, INTER_LATIN_EXT_UNICODE_RANGE)
  );
}
