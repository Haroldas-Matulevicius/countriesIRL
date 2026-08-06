import type { CameraState } from '../types/composition';

export const WORLD_SIZE = 1080;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 24;
export const MERCATOR_MAX_LATITUDE = 85.05112878;
export const DRAG_CLICK_DISTANCE = 4;
export const ZOOM_FACTOR = 1.5;
export const PAN_FRACTION = 0.125;
export const LOCATE_PADDING = 0.12;
export const LOCATE_MIN_ZOOM = 2;
/*
 * Both durations moved to `src/lib/motion/tokens.ts` in Phase 3 (D-26) and are
 * re-exported here so the existing camera call sites keep one import home.
 * `CAMERA_MOTION_DURATION_MS` is now DERIVED from `DURATION_BASE` instead of
 * restating `240`; re-exporting rather than re-declaring is what keeps this file
 * from becoming a second copy of the number.
 */
export {
  CAMERA_MOTION_DURATION_MS,
  SCENE_CROSSFADE_DURATION_MS,
} from '../lib/motion/tokens';

export const INITIAL_WORLD_CAMERA: CameraState = Object.freeze({
  zoom: MIN_ZOOM,
  centerLongitude: 0,
  centerLatitude: 0,
});
