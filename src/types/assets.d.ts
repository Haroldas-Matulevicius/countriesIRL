/*
 * Vite's `?inline` asset suffix returns the file as a data URL string baked
 * into the bundle at build time. `vite/client`'s wildcard declarations cover
 * bare `*.woff2` specifiers but not query-suffixed ones, so the export font
 * import in `src/styles/interFontFace.ts` needs this declaration to typecheck.
 */
declare module '*.woff2?inline' {
  const dataUrl: string;
  export default dataUrl;
}
