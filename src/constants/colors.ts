import type { ColorPreset } from '../types/ui';

export const DEFAULT_COLOR = '#FFFFFF';
export const DEFAULT_BORDER_COLOR = '#9CA3AF';
export const SELECTED_BORDER_COLOR = '#111827';

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
