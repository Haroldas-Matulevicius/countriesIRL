import type { Feature, MultiPolygon, Polygon } from 'geojson';

export type CountryId = string;
export type ColorMap = Readonly<Record<CountryId, string>>;
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
      payload: { countryId: CountryId; color: string };
    }
  | {
      type: 'SET_COLORS';
      payload: { countryIds: ReadonlyArray<CountryId>; color: string };
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
