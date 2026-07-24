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
export const CAMERA_MOTION_DURATION_MS = 240;
export const SCENE_CROSSFADE_DURATION_MS = 160;

export const INITIAL_WORLD_CAMERA: CameraState = Object.freeze({
  zoom: MIN_ZOOM,
  centerLongitude: 0,
  centerLatitude: 0,
});
