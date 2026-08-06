export const HISTORY_LIMIT = 50;
export const MAX_SAVED_MAPS = 10;
export const MAX_MAP_NAME_LENGTH = 100;
export const STORAGE_KEY = 'countriesirl_maps';
export const ONBOARDING_DISMISSED_KEY = 'countriesirl_onboarding_dismissed';

/*
 * Two small Phase 3 preference keys, following the ONBOARDING_DISMISSED_KEY
 * precedent rather than widening the composition record. The composition record
 * is the creator's MAP: it is saved, loaded, and exported under a name, and
 * putting editor UI state in it would make every saved map carry whichever tool
 * panel happened to be open when it was written.
 */
export const LAST_OPEN_TOOL_KEY = 'countriesirl_last_open_tool';
export const THEME_MODE_KEY = 'countriesirl_theme_mode';

/**
 * Both preference values are short enum words. The bound is checked on the RAW
 * string BEFORE it is interpreted at all - the same discipline the composition
 * record's pre-parse budget enforces, applied to a value that is never parsed.
 * Stored bytes are untrusted whatever wrote them.
 */
export const MAX_PREFERENCE_VALUE_LENGTH = 32;

export const MAP_VIEWBOX_SIZE = 1080;
export const MAP_EXTENT = [
  [64, 64],
  [1016, 1016],
] as const;

export const EXPORT_FRAME_SIZE = 540;
export const EXPORT_SCALE = 2;
export const EXPORT_SIZE = 1080;

export const TOOLTIP_SPACING = 8;
