import type { ColorMap, CountryId, SceneFeature } from './map';

export type SnapshotId = 'modern' | HistoricalSnapshotId;
export type HistoricalSnapshotId = '1492' | '1700' | '1815' | '1914';
export type SnapshotReviewStatus =
  | 'draft'
  | 'source-reviewed'
  | 'historian-reviewed';
export type HistoricalRegionId =
  | 'poland'
  | 'lithuania'
  | 'hungary'
  | 'balkans'
  | 'iberia'
  | 'scandinavia';

export interface CameraState {
  readonly zoom: number;
  readonly centerLongitude: number;
  readonly centerLatitude: number;
}

export interface CameraFreezeLease {
  readonly camera: CameraState;
  /** Idempotent; transaction owners release the lease from their outermost finally. */
  release(): void;
}

export type CameraPanDirection = 'up' | 'right' | 'down' | 'left';

export interface MapCanvasHandle {
  readCurrentCamera(): CameraState;
  freezeAndSnapshot(): CameraFreezeLease;
  zoomBy(factor: number): void;
  pan(direction: CameraPanDirection, viewportFraction: number): void;
  resetView(): void;
  locate(countryId: CountryId): boolean;
  restore(camera: CameraState): boolean;
  focusCountry(countryId: CountryId): void;
  /**
   * Removes the outgoing crossfade scene and paints the selected scene at full
   * opacity before the caller reads the DOM. Synchronous by contract: export
   * captures the frame it returns on.
   */
  finalizeSelectedScene(): void;
  getExportSource(): HTMLDivElement | null;
}

export interface EffectiveScene {
  readonly snapshotId: SnapshotId;
  readonly features: ReadonlyArray<SceneFeature>;
  readonly selectableEntityIds: ReadonlySet<CountryId>;
  /**
   * Entries the historical asset validator dropped while building this scene.
   * Carried on the scene so the load transaction can surface them instead of
   * handing the user a silently partial map.
   */
  readonly assetWarnings?: ReadonlyArray<string>;
}

export interface SnapshotSourceRecord {
  readonly url: string;
  readonly license: string;
  readonly accessedOn: string;
  readonly attribution: string | null;
}

export interface SnapshotManifestEntry {
  readonly id: SnapshotId;
  readonly label: string;
  readonly asOf: string;
  readonly assetPath: string;
  readonly sha256: string;
  readonly coverageRegions: ReadonlyArray<HistoricalRegionId>;
  readonly sourceRecords: ReadonlyArray<SnapshotSourceRecord>;
  readonly reviewStatus: SnapshotReviewStatus;
  readonly fallbackLabel: string;
}

export type ReviewDisposition = 'approved' | 'blocked';

export interface ApprovalReviewer {
  readonly name: string;
  readonly role: string;
  readonly reviewedOn: string;
  readonly isExecutor: false;
  readonly isImplementer: false;
}

export interface EvidenceArchiveMember {
  readonly path: string;
  readonly sha256: string;
}

export interface RegionalSourceDecision {
  readonly regionId: HistoricalRegionId;
  readonly disposition: ReviewDisposition;
  readonly rightsDisposition: string;
  readonly attribution: string | null;
  readonly uncertainties: ReadonlyArray<string>;
}

export type HistoricalPreparationEvidence =
  | {
      readonly mode: 'vector-extraction';
      readonly extractionSpecificationSha256: string;
    }
  | {
      readonly mode: 'manual-trace';
      readonly evidenceSha256: string;
      readonly procedureSha256: string;
      readonly operatorRecordSha256: string;
      readonly controlPointSha256: string;
    };

export interface SnapshotSourceApproval {
  readonly snapshotId: HistoricalSnapshotId;
  readonly reviewer: ApprovalReviewer;
  readonly regionalDecisions: Readonly<
    Record<HistoricalRegionId, RegionalSourceDecision>
  >;
  readonly sourceManifestSha256: string;
  readonly evidenceArchiveSha256: string;
  readonly memberInventorySha256: string;
  readonly memberInventory: ReadonlyArray<EvidenceArchiveMember>;
  readonly inputGeometrySha256: string;
  readonly preparation: HistoricalPreparationEvidence;
}

export interface RegionalFactualDecision {
  readonly regionId: HistoricalRegionId;
  readonly disposition: ReviewDisposition;
  readonly uncertainties: ReadonlyArray<string>;
}

export interface SnapshotFactualApproval {
  readonly snapshotId: HistoricalSnapshotId;
  readonly reviewer: ApprovalReviewer;
  readonly regionalDecisions: Readonly<
    Record<HistoricalRegionId, RegionalFactualDecision>
  >;
  readonly sourceApprovalSha256: string;
  readonly sourceManifestSha256: string;
  readonly inputGeometrySha256: string;
  readonly outputOverlaySha256: string;
  readonly reviewJsonSha256: string;
  readonly reviewHtmlSha256: string;
}

export interface LegendEntryState {
  readonly color: string;
  readonly label: string;
  readonly order: number;
}

export type LegendTheme = 'light' | 'dark' | 'soft';
export type LegendTextSize = 'small' | 'medium' | 'large';
export type LegendBorderStyle = 'none' | 'hairline' | 'strong';
export type LegendCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface LegendPosition {
  readonly x: number;
  readonly y: number;
  readonly preset: LegendCorner | null;
}

export interface LegendState {
  readonly entries: ReadonlyArray<LegendEntryState>;
  readonly position: LegendPosition;
  readonly theme: LegendTheme;
  readonly textSize: LegendTextSize;
  readonly backgroundOpacity: number;
  readonly borderStyle: LegendBorderStyle;
}

/**
 * D4-08 — the five named border weights, in the same shape `LegendTextSize`
 * already uses. Discrete steps rather than a slider because each step is then
 * individually gateable on real exported pixels; a slider can only be asserted
 * to round-trip. `src/constants/mapStyle.ts` owns the name-to-user-unit table.
 */
export type StrokeWeight = 'none' | 'hairline' | 'thin' | 'medium' | 'bold';

export interface VisibleCompositionSettings {
  /**
   * The V2 persisted field, pinned to white and read by nothing that renders.
   * It is the schema's record that the composition is opaque; `04-14` decides
   * its fate when the V3 record lands. Do not repurpose it as the water colour.
   */
  readonly backgroundColor: '#FFFFFF';
  /**
   * D4-03 — the creator-chosen water/background colour, canonical uppercase
   * `#RRGGBB`. It reaches the exported PNG through a serialized inline `fill`
   * on `rect[data-layer="surface"]`, never through a CSS token.
   *
   * **In-memory only in Phase 4 wave 1.** Persistence is `04-14`'s V3 work;
   * `src/utils/storage.ts` neither validates nor restores this field, so a
   * saved composition reloads with the default surface.
   */
  readonly surfaceColor: string;
  /**
   * D4-09 — what a country with NO creator colour renders as, canonical
   * uppercase `#RRGGBB`. The country's **stored** value stays the `#FFFFFF`
   * sentinel; only the render maps it, exactly as `getEffectiveFeatureColor`
   * already maps a null-owner unit. It exists because D4-08 makes coastlines
   * quiet: with white water and no coastline stroke, a white country vanishes.
   */
  readonly uncoloredFill: string;
  /**
   * D4-08 — the stroke colour every country boundary draws in, canonical
   * uppercase `#RRGGBB`. Unchanged default (`DEFAULT_BORDER_COLOR`).
   */
  readonly borderColor: string;
  /**
   * D4-08 — the weight of the shared interior boundaries. Rendered by `04-09`'s
   * `world-borders-modern` layer; declared here so the vocabulary, the panel,
   * and the props boundary land together rather than in three plans.
   */
  readonly interiorWeight: StrokeWeight;
  /**
   * D4-08 — the weight of the country outline itself. Defaults to `none` (U-3):
   * `ROADMAP.md § Phase 4`'s goal sentence is an interior-borders-only stroke
   * system *"so country outlines all but disappear against water"*.
   *
   * **In-memory only, exactly like `surfaceColor`.** `04-14` owns the V3 record;
   * a saved composition reloads with these defaults.
   */
  readonly coastlineWeight: StrokeWeight;
}

export interface Composition {
  readonly camera: CameraState;
  readonly snapshotId: SnapshotId;
  readonly legend: LegendState;
  readonly settings: VisibleCompositionSettings;
}

export interface CompositionState extends Composition {
  readonly savedBaseline: Composition;
}

export interface CompositionSnapshot extends Composition {
  readonly colors: ColorMap;
}

export interface LegacySavedComposition {
  readonly name: string;
  readonly colors: ColorMap;
  readonly timestamp: number;
}

export interface SavedCompositionV2 {
  readonly schemaVersion: 2;
  readonly name: string;
  readonly timestamp: number;
  readonly composition: CompositionSnapshot;
}

export type SavedCompositionRecord =
  | LegacySavedComposition
  | SavedCompositionV2;

export type CompositionLoadWarningCode =
  | 'legacy-migrated'
  | 'composition-repaired';

export interface CompositionLoadWarning {
  readonly code: CompositionLoadWarningCode;
  readonly path?: string;
}

export type CompositionLoadOutcome =
  | {
      readonly ok: true;
      readonly value: CompositionSnapshot;
      readonly sourceVersion: 1 | 2;
      readonly warnings: ReadonlyArray<CompositionLoadWarning>;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'invalid-record'
        | 'unsupported-version'
        | 'snapshot-unavailable';
    };
