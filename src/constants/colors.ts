export const DEFAULT_COLOR = '#FFFFFF';
// Country boundaries are black at every state. Once the resting border is
// black, hover and selection cannot differentiate by going darker - they
// differentiate by weight, and the CSS stroke-widths carry that hierarchy.
// Keep these in sync with `--map-border-default` / `--map-border-selected`.
export const DEFAULT_BORDER_COLOR = '#000000';
export const SELECTED_BORDER_COLOR = '#000000';
/*
 * `04-09`. The hover twin of `SELECTED_BORDER_COLOR`, added when hover and
 * selection moved onto `g[data-layer="highlight"]`.
 *
 * All three are the same black, and they stay three names for the reason the
 * comment above gives: a future re-tint needs a seam to open at. The
 * TS-versus-token duplication is no longer only a comment - `uiContract.test.ts`
 * asserts each constant equals its `--map-border-*` token, in both directions.
 */
export const HOVERED_BORDER_COLOR = '#000000';
/*
 * `04-10`. The band drag handle's line, written as an INLINE `stroke` attribute
 * on an element that carries `data-editor-only`.
 *
 * The inline route is not decoration and it is not a duplicate of a CSS rule -
 * it is what makes the export gate able to fail. `04-09` measured the trap: an
 * editor-only affordance painted only from `MapCanvas.css` survives the clone
 * and renders NOTHING in the isolated export document, so deleting
 * `data-editor-only` moves zero pixels and the gate that exists to catch it
 * measures 0 either way. One inline paint attribute is the whole fix.
 *
 * It is deliberately NOT named `*_BORDER_COLOR`: it paints editor chrome on the
 * canvas, not map geometry, so it is not part of the mode-invariant
 * `--map-border-*` set `uiContract.test.ts` gates against its tokens.
 */
export const BAND_HANDLE_COLOR = '#000000';
// The neutral fill for a feature with no colour owner. D4-10 made every Modern
// unit self-colorable, so on the Modern scene nothing resolves to it any more;
// it still covers historical scenes and malformed records, and `04-08` adopts
// it as the default meaning of *uncoloured*.
// A solid fill, never a CSS filter - a filter applied through external CSS
// never reaches the serialised export clone, which is rasterised as an
// isolated SVG-as-image document.
export const NEUTRAL_UNIT_COLOR = '#E5E7EB';

// The accepted-syntax hint for the custom colour field. It lives here rather
// than in `ColorPicker.tsx` because it spells a colour value, and no component
// `.tsx` may carry one - the contract test's exemption list is closed at
// `LegendOverlay.tsx`, whose literals are deliberate export-fixed values.
export const CUSTOM_COLOR_PLACEHOLDER = '#RRGGBB or rgb(0, 0, 0)';

/**
 * `04-UI-SPEC.md § 9`, byte-exact. Here for the same reason the placeholder is:
 * it spells a colour value, and assertion 8 allows a hex literal in exactly one
 * component file - the one whose literals are exported into the PNG.
 */
export const CUSTOM_COLOR_ERROR_MESSAGE = 'Enter a hex color like #2563EB';

/*
 * `COLOR_PRESETS` and its ten-tile grid were DELETED by plan `04-07` (D4-01 /
 * D4-04). The palette is the ramp model now: `src/utils/ramps.ts` holds five
 * bounded five-step ramps, a country stores `{rampId, t}` rather than a frozen
 * hex, and the Colors panel paints from a contiguous ramp strip.
 *
 * The presets are not archived here as a commented-out block. A creator's
 * existing saved map is unaffected - a stored hex is still a valid `ColorValue`
 * (the `custom` variant), and the hex field still produces one.
 */
