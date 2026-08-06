import type { ColorPreset } from '../types/ui';

export const DEFAULT_COLOR = '#FFFFFF';
// Country boundaries are black at every state. Once the resting border is
// black, hover and selection cannot differentiate by going darker - they
// differentiate by weight, and the CSS stroke-widths carry that hierarchy.
// Keep these in sync with `--map-border-default` / `--map-border-selected`.
export const DEFAULT_BORDER_COLOR = '#000000';
export const SELECTED_BORDER_COLOR = '#000000';
// Solid fill for units nobody can color (colorOwnerId === null: disputed and
// neutral territories such as Kosovo, Western Sahara, Antarctica). White made
// them indistinguishable from an uncolored colorable country, which read as
// "this country is broken". A solid fill, never a CSS filter - a filter
// applied through external CSS never reaches the serialised export clone,
// which is rasterised as an isolated SVG-as-image document.
export const NEUTRAL_UNIT_COLOR = '#E5E7EB';

// The accepted-syntax hint for the custom colour field. It lives here rather
// than in `ColorPicker.tsx` because it spells a colour value, and no component
// `.tsx` may carry one - the contract test's exemption list is closed at
// `LegendOverlay.tsx`, whose literals are deliberate export-fixed values.
export const CUSTOM_COLOR_PLACEHOLDER = '#RRGGBB or rgb(0, 0, 0)';

export const COLOR_PRESETS = [
  { name: 'Red', value: '#DC2626' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Yellow', value: '#FACC15' },
  { name: 'Magenta', value: '#C026D3' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Gray', value: '#6B7280' },
] as const satisfies ReadonlyArray<ColorPreset>;
