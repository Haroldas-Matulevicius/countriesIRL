/**
 * Barrel for the vendored animated icon set (D-28).
 *
 * Every glyph exports a `forwardRef` component AND a structurally identical
 * `*IconHandle` carrying `{ startAnimation, stopAnimation }`. The row that
 * hosts an icon holds the handle and drives it from ROW hover, never icon
 * hover — hooks cannot live in a `.map` loop, which is why the row component
 * exists.
 *
 * `src/components/icons/PROVENANCE.md` carries a dated `read in full` line for
 * every file in this directory, and `iconContract.test.ts` asserts the two sets
 * are equal in BOTH directions. A file with no provenance line may not be
 * vendored.
 */
export { PaletteIcon } from './PaletteIcon';
export type { PaletteIconHandle, PaletteIconProps } from './PaletteIcon';
export { ListIcon } from './ListIcon';
export type { ListIconHandle, ListIconProps } from './ListIcon';
export { LayersIcon } from './LayersIcon';
export type { LayersIconHandle, LayersIconProps } from './LayersIcon';
export { FolderIcon } from './FolderIcon';
export type { FolderIconHandle, FolderIconProps } from './FolderIcon';
export { DownloadIcon } from './DownloadIcon';
export type { DownloadIconHandle, DownloadIconProps } from './DownloadIcon';
export { UndoIcon } from './UndoIcon';
export type { UndoIconHandle, UndoIconProps } from './UndoIcon';
export { RedoIcon } from './RedoIcon';
export type { RedoIconHandle, RedoIconProps } from './RedoIcon';
export { SunIcon } from './SunIcon';
export type { SunIconHandle, SunIconProps } from './SunIcon';
export { MoonIcon } from './MoonIcon';
export type { MoonIconHandle, MoonIconProps } from './MoonIcon';
export { MapIcon } from './MapIcon';
export type { MapIconHandle, MapIconProps } from './MapIcon';
export { CheckIcon } from './CheckIcon';
export type { CheckIconHandle, CheckIconProps } from './CheckIcon';
export { PlusIcon } from './PlusIcon';
export type { PlusIconHandle, PlusIconProps } from './PlusIcon';
export { MinusIcon } from './MinusIcon';
export type { MinusIconHandle, MinusIconProps } from './MinusIcon';
export { CrosshairIcon } from './CrosshairIcon';
export type { CrosshairIconHandle, CrosshairIconProps } from './CrosshairIcon';
