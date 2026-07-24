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

export interface MapCanvasHandle {
  readCurrentCamera(): CameraState;
  freezeAndSnapshot(): CameraFreezeLease;
  resetView(): void;
  locate(countryId: CountryId): void;
  restore(camera: CameraState): void;
  focusCountry(countryId: CountryId): void;
  getExportSource(): HTMLDivElement | null;
}

export interface EffectiveScene {
  readonly snapshotId: SnapshotId;
  readonly features: ReadonlyArray<SceneFeature>;
  readonly selectableEntityIds: ReadonlySet<CountryId>;
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

export interface VisibleCompositionSettings {
  readonly backgroundColor: '#FFFFFF';
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
