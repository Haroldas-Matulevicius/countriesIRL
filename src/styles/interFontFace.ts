/*
 * Why this file exists: the export clone is rasterised from a
 * `data:image/svg+xml` URL, and an SVG loaded as an image is an isolated
 * document — it cannot see the host document's `@font-face` rules (including
 * the one in `theme.css`) and it cannot issue any request, same-origin
 * included. The ONLY way Inter reaches the exported PNG is as bytes inside
 * the serialised SVG subtree, which is what this module provides: the vendored
 * woff2 as a build-time data URL, wrapped in an `@font-face` rule that
 * `injectExportFontFace` (src/utils/export.ts) inserts into the clone.
 *
 * The `?inline` suffix makes Vite bake the bytes into the bundle as a
 * `data:font/woff2;base64,…` string at build time: no runtime fetch, no async
 * failure mode, deterministic across dev and build. The vendored file's
 * provenance, byte size, SHA-256, and latin-only coverage gap are recorded in
 * `src/assets/README.md` — the subset stops at U+00FF, so latin-ext glyphs
 * (Polish, Lithuanian, Czech, Balkan, Latvian, Romanian orthographies) fall
 * back to the generic serif/system stack mid-string in exported text. That is
 * a recorded, deliberate Phase 3 trade, not full Unicode coverage.
 */
import interDataUrl from '../assets/inter-latin-variable.woff2?inline';

export const EXPORT_FONT_FAMILY = 'Inter';

export function buildExportFontFaceCss(): string {
  return (
    `@font-face{font-family:'${EXPORT_FONT_FAMILY}';` +
    `src:url(${interDataUrl}) format('woff2');` +
    `font-weight:100 900;font-style:normal;font-display:block;}`
  );
}
