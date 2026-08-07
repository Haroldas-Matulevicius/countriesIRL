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

export type LegendTextSize = 'small' | 'medium' | 'large';

/**
 * D4-12 — the two legend forms, and the whole reason `04-13` exists.
 *
 * **`bar`** is the owner's Eurostat reference: one contiguous vertical stack of
 * the ramp's shades with NO gaps between them, a single hairline around the
 * WHOLE bar, short tick leaders to the right, and the labels read as **break
 * boundaries** between ticks rather than printed as literal range text.
 *
 * **`rows`** is swatch-plus-label, `LEGEND_ENTRY_GAP` between rows, a hairline
 * per swatch. It is NOT the Phase 3 legend left alone — `04-13` restyled it to
 * the bar's restraint (flat swatches, no vestigial container padding), because
 * the owner asked for both forms to be *"just as subtle"*.
 *
 * The vocabulary's one home is `LEGEND_FORMS` in `utils/legend.ts`, in the
 * style `LEGEND_TEXT_SIZES` and `RAMP_IDS` already use.
 */
export type LegendForm = 'bar' | 'rows';

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

/**
 * D4-11 — the legend has **no box chrome**, and that is structural rather than
 * a default a creator can undo.
 *
 * `theme`, `backgroundOpacity`, and `borderStyle` were deleted on 2026-08-07.
 * The reference this phase implements against puts its legend directly on the
 * map surface with no container at all, and keeping the fields would have
 * meant keeping a parallel legacy renderer with its own gates — the
 * two-models-coexisting complexity that produced the `G-3` complaint. Removing
 * them makes the "big ass box" unreachable rather than unfashionable.
 *
 * **This is one-way and creator-visible.** Every saved map reopens with no
 * legend box regardless of what it was saved with, and its exported PNG
 * differs from one the creator may already have posted. There is nothing to
 * restore the fields from. Owner gate answered `legend-delete-chrome` under a
 * blanket, in-advance, sight-unseen proceed-authorization (Immutable Safety
 * Constraint 8).
 *
 * `textSize`, `position`, entry labels, and entry ordering all survive.
 *
 * **`04-13` added three fields back** — `form`, `caption`, and `showNoData`.
 * None of them is chrome: they are what the legend *says*, not a box around it.
 */
export interface LegendState {
  readonly entries: ReadonlyArray<LegendEntryState>;
  readonly position: LegendPosition;
  readonly textSize: LegendTextSize;
  /**
   * D4-12 — the creator's EXPLICIT override, or `null` for "follow the
   * colouring technique".
   *
   * `null` is not a missing value: it is the shipped default, and it resolves
   * through `inferLegendForm` at render time (`resolveLegendForm`). Storing the
   * inferred value instead would freeze the form the first time a map is saved,
   * so a creator who later repaints a categorical map with a ramp would keep a
   * rows legend and have no way to know why.
   */
  readonly form: LegendForm | null;
  /**
   * D4-12 — the one bold line above the marks (`04-UI-SPEC.md § 6.7`), the
   * reference's `EU = 6.0%, euro area = 6.3%`.
   *
   * Empty renders NO `<text>` element at all and reserves NO vertical space —
   * the same discipline `04-11` applied to the title, the subtitle, and the
   * attribution. Sanitised at the state boundary, never on the way to the
   * attribute.
   */
  readonly caption: string;
  /**
   * `ROADMAP.md § Phase 4 04-08`'s **optional** "no data" row. Its swatch is
   * bound to `settings.uncoloredFill` — ONE value, two consumers, and the
   * divergence is what `legend.spec.ts`'s Gate A exists to catch.
   */
  readonly showNoData: boolean;
}

/**
 * D4-08 — the five named border weights, in the same shape `LegendTextSize`
 * already uses. Discrete steps rather than a slider because each step is then
 * individually gateable on real exported pixels; a slider can only be asserted
 * to round-trip. `src/constants/mapStyle.ts` owns the name-to-user-unit table.
 */
export type StrokeWeight = 'none' | 'hairline' | 'thin' | 'medium' | 'bold';

/**
 * D4-15 — the composition-text vocabulary, declared HERE beside `StrokeWeight`
 * and `LegendTextSize` rather than in `utils/compositionText.ts`.
 *
 * The reason is structural, not stylistic: `compositionText.ts` imports
 * `LEGEND_SAFE_INSET` from `utils/legend.ts`, which imports this module. Naming
 * the types here keeps that edge one-way — `general.md` forbids a circular
 * dependency, and a `import type` cycle that only survives because the compiler
 * erases it is still a cycle in the module graph.
 */
export type CompositionTextSize = 'small' | 'medium' | 'large';
export type CompositionTextAlignment = 'left' | 'center' | 'right';
export type CompositionTextAnchor = 'start' | 'middle' | 'end';

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
  /**
   * D4-16 — the title band, ON by default. CountriesIRL is full-bleed, so a
   * title has to overlay the map; the band is what gives it something to sit
   * on. It fades from `surfaceColor`, so on white water it is invisible by
   * design and the out-of-the-box export is unchanged.
   */
  readonly topBandVisible: boolean;
  /**
   * D4-16 — user units of the 1080 viewBox, clamped to `[0, BAND_MAX_HEIGHT]`
   * by `clampBandHeight`. Adjusted by the on-canvas drag handle and its
   * keyboard equivalents (A7), never by a second control in the panel.
   *
   * **`04-12`'s legend inset derives from this**, through
   * `resolveBandExtents` — so changing a band height moves exported pixels.
   */
  readonly topBandHeight: number;
  /** D4-16 — the footer band, OFF by default. */
  readonly bottomBandVisible: boolean;
  /** D4-16, the bottom twin of `topBandHeight`. Same clamp, same cap. */
  readonly bottomBandHeight: number;
  /**
   * D4-15 — the creator's title, sanitised by `sanitizeCompositionText` at the
   * reducer boundary. It reaches the exported PNG as the **text content** of a
   * `<text>` in `g[data-layer="text"]`, never as markup and never through a
   * class: the clone is rasterised as an isolated document with no host
   * stylesheet, so the ink, the size, and the weight are inline attributes.
   *
   * An empty string renders NO element at all — not an empty one, which would
   * still register a family in `collectCompositionFonts`.
   *
   * **In-memory only**, exactly like `surfaceColor` and the bands. `04-14`
   * owns the V3 record.
   */
  readonly title: string;
  /** D4-15 — S 36 / M 44 / L 56 at weight 600 (`04-UI-SPEC.md` § 4.2). */
  readonly titleSize: CompositionTextSize;
  /** D4-15 — the optional second line, same sanitisation, same layer. */
  readonly subtitle: string;
  /** D4-15 — S 22 / M 26 / L 32 at weight 400. */
  readonly subtitleSize: CompositionTextSize;
  /**
   * D4-15 — the bottom-corner credit line. Fixed at 20 units, weight 400, and
   * **no size step**: it is meta, and a size control on meta is a control
   * nobody uses.
   */
  readonly attribution: string;
  /**
   * D4-15 — one alignment for the whole composition, `Left` / `Center` /
   * `Right` mapped to `text-anchor` `start` / `middle` / `end`.
   *
   * ONE control rather than one per field: `04-UI-SPEC.md` § 6.8's control
   * contract lists exactly one Alignment row with three pills and no per-field
   * qualifier, and § 4.2's per-row "Anchor" column describes where each line
   * can sit rather than prescribing a second control. Reported as a spec
   * disagreement in `04-11-SUMMARY.md` rather than resolved silently.
   */
  readonly textAlignment: CompositionTextAlignment;
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
