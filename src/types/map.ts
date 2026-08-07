import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { RampId } from '../utils/ramps';

export type CountryId = string;

/**
 * D4-02. What a country's colour assignment IS.
 *
 * The ramp variant is the PRIMARY representation: a painted country stores the
 * ramp identity plus a normalized position, and the hex is resolved at render
 * time by `resolveColorValue`. The custom variant is one variant of the same
 * union - a one-off hex is a special case of the general representation, not a
 * parallel model. Phase 5's CSV classing engine produces the ramp variant
 * directly, with no adapter, because `t` is a computed position there and a
 * click-derived one here.
 *
 * `kind` is an explicit discriminant so narrowing is a property read. The
 * previous model was a bare `string`, which every consumer narrowed with
 * `typeof value === 'string'`; that shape is what invited each new call site to
 * grow its own branch, and it is deliberately gone.
 */
export interface CustomColorValue {
  readonly kind: 'custom';
  readonly hex: string;
}

export interface RampColorValue {
  readonly kind: 'ramp';
  readonly rampId: RampId;
  /** A normalized position in `[0, 1]`, snapped to a step at resolution time. */
  readonly t: number;
}

export type ColorValue = CustomColorValue | RampColorValue;

export type ColorMap = Readonly<Record<CountryId, ColorValue>>;
/**
 * Colours only. Live Invariant 2: selection is never in a history snapshot, and
 * Live Invariant 1 holds BECAUSE of that. Widening a snapshot is not a local
 * change - it reopens the whole class.
 */
export type ColorHistory = ReadonlyArray<ColorMap>;
export type SelectedCountryIds = ReadonlySet<CountryId>;

export interface GeoFeatureProperties {
  readonly name: string;
}

export interface GeoFeature
  extends Feature<Polygon | MultiPolygon, GeoFeatureProperties> {
  readonly type: 'Feature';
  readonly id: CountryId;
  readonly properties: GeoFeatureProperties;
  readonly geometry: Polygon | MultiPolygon;
}

export type BoundaryMode = 'modern' | 'historical' | 'modern-fallback';

interface SceneFeatureBase extends GeoFeature {
  readonly sourceFeatureId: string;
  readonly entityId: CountryId;
  readonly boundaryMode: BoundaryMode;
  readonly provenanceId: string;
}

export type SceneFeature =
  | (SceneFeatureBase & {
      readonly interactionMode: 'modern-core' | 'historical-entity';
      readonly colorOwnerId: CountryId;
      readonly isSelectable: true;
    })
  /**
   * D4-10: a non-core unit that owns its own color - Kosovo, Taiwan, Western
   * Sahara and the nine others. It is a fourth variant rather than a loosened
   * third one: widening the neutral variant to `colorOwnerId: string | null`
   * would make every narrowing site accept both and delete the type's value.
   */
  | (SceneFeatureBase & {
      readonly interactionMode: 'self-colorable';
      readonly colorOwnerId: CountryId;
      readonly isSelectable: true;
    })
  | (SceneFeatureBase & {
      readonly interactionMode: 'inherited-dependency';
      readonly colorOwnerId: CountryId;
      readonly isSelectable: false;
    })
  | (SceneFeatureBase & {
      readonly interactionMode: 'disputed' | 'neutral';
      readonly colorOwnerId: null;
      readonly isSelectable: false;
    });

export interface MapState {
  colors: ColorMap;
  history: ColorHistory;
  historyIndex: number;
  selectedIds: SelectedCountryIds;
}

export type MapAction =
  | {
      type: 'SET_COLOR';
      payload: { countryId: CountryId; color: ColorValue };
    }
  | {
      type: 'SET_COLORS';
      payload: { countryIds: ReadonlyArray<CountryId>; color: ColorValue };
    }
  | { type: 'RESET_ALL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'SELECT_COUNTRY';
      payload: { countryId: CountryId | null };
    }
  | {
      type: 'SET_SELECTION';
      payload: { countryIds: ReadonlyArray<CountryId> };
    }
  | {
      type: 'TOGGLE_SELECTION';
      payload: { countryId: CountryId };
    }
  | { type: 'CLEAR_SELECTION' }
  | {
      type: 'LOAD_STATE';
      payload: { colors: ColorMap };
    }
  | {
      type: 'RESTORE_STATE';
      payload: { state: MapState };
    };

export type GeoJsonWarningCode =
  | 'invalid-feature'
  | 'missing-id'
  | 'sentinel-id'
  | 'duplicate-id'
  | 'missing-name'
  | 'unsupported-geometry'
  | 'invalid-geometry';

export interface GeoJsonWarning {
  featureIndex: number;
  code: GeoJsonWarningCode;
}

export type GeoJsonNormalizationResult =
  | {
      ok: true;
      features: ReadonlyArray<GeoFeature>;
      warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      ok: false;
      reason: 'invalid-collection' | 'no-valid-features';
      warnings: ReadonlyArray<GeoJsonWarning>;
    };

export type GeoDataState =
  | { status: 'loading' }
  | {
      status: 'ready';
      features: ReadonlyArray<GeoFeature>;
      lookup: ReadonlyMap<CountryId, GeoFeature>;
      warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      status: 'error';
      reason: 'fetch-failed' | 'invalid-data';
    };
