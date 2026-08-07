import { DEFAULT_COLOR, NEUTRAL_UNIT_COLOR } from '../constants/colors';
import type { EffectiveScene, SnapshotId } from '../types/composition';
import type {
  ColorMap,
  CountryId,
  SceneFeature,
  SelectedCountryIds,
} from '../types/map';
import { getEffectiveCountryColor } from './colors';
import { isSafeStableCountryId } from './countryIds';

export interface EffectiveSceneInput {
  readonly snapshotId: SnapshotId;
  readonly modernFeatures: ReadonlyArray<SceneFeature>;
  readonly historicalFeatures?: ReadonlyArray<SceneFeature>;
  readonly replacedModernSourceFeatureIds?: ReadonlySet<string>;
}

function hasSelectableIdentity(feature: SceneFeature): boolean {
  return (
    feature.isSelectable &&
    // `self-colorable` joins the set under exactly the same two conditions the
    // other two satisfy - it is selectable and it owns its own colour (D4-10).
    // The identity clauses below are unchanged and still gate all three.
    (feature.interactionMode === 'modern-core' ||
      feature.interactionMode === 'historical-entity' ||
      feature.interactionMode === 'self-colorable') &&
    isSafeStableCountryId(feature.entityId) &&
    feature.colorOwnerId === feature.entityId
  );
}

function withBoundaryMode(
  feature: SceneFeature,
  boundaryMode: SceneFeature['boundaryMode'],
): SceneFeature {
  return {
    ...feature,
    boundaryMode,
  };
}

/**
 * One mechanism, two callers with two deliberate keys. Scene composition
 * asserts with the strict `hasSelectableIdentity` (its selectable-set
 * contract); `MapCanvas` asserts with plain `isSelectable`, because that is
 * the key it builds logical interactive paths from - a duplicate there means
 * a duplicate `data-country-id` in the DOM even when the strict identity
 * check would not fire.
 */
export function assertUniqueSceneIdentities(
  features: ReadonlyArray<SceneFeature>,
  isInteractive: (feature: SceneFeature) => boolean = hasSelectableIdentity,
): void {
  const featureIds = new Set<string>();
  const sourceFeatureIds = new Set<string>();
  const selectableEntityIds = new Set<CountryId>();

  for (const feature of features) {
    if (featureIds.has(feature.id)) {
      throw new Error('duplicate-scene-feature-id');
    }
    if (sourceFeatureIds.has(feature.sourceFeatureId)) {
      throw new Error('duplicate-scene-source-feature-id');
    }
    if (isInteractive(feature) && selectableEntityIds.has(feature.entityId)) {
      throw new Error('duplicate-scene-selectable-entity-id');
    }

    featureIds.add(feature.id);
    sourceFeatureIds.add(feature.sourceFeatureId);
    if (isInteractive(feature)) {
      selectableEntityIds.add(feature.entityId);
    }
  }
}

export function getSelectableEntityIds(
  features: ReadonlyArray<SceneFeature>,
): ReadonlySet<CountryId> {
  const selectableEntityIds = new Set<CountryId>();

  for (const feature of features) {
    if (hasSelectableIdentity(feature)) {
      selectableEntityIds.add(feature.entityId);
    }
  }

  return selectableEntityIds;
}

export function composeEffectiveScene(input: EffectiveSceneInput): EffectiveScene {
  const historicalFeatures = input.historicalFeatures ?? [];
  const replacedModernSourceFeatureIds = input.replacedModernSourceFeatureIds ?? new Set();

  const retainedModernFeatures = input.modernFeatures.filter(
    (feature): boolean =>
      !replacedModernSourceFeatureIds.has(feature.sourceFeatureId),
  );
  if (input.snapshotId !== 'modern') {
    const retainedSelectableEntityIds = getSelectableEntityIds(
      retainedModernFeatures,
    );
    const hasSelectableCollision = historicalFeatures.some(
      (feature): boolean =>
        hasSelectableIdentity(feature) &&
        retainedSelectableEntityIds.has(feature.entityId),
    );
    if (hasSelectableCollision) {
      throw new Error('historical-selectable-entity-collision');
    }
  }

  const features =
    input.snapshotId === 'modern'
      ? input.modernFeatures.map((feature) => withBoundaryMode(feature, 'modern'))
      : [
          ...retainedModernFeatures.map((feature) =>
            withBoundaryMode(feature, 'modern-fallback'),
          ),
          ...historicalFeatures.map((feature) =>
            withBoundaryMode(feature, 'historical'),
          ),
        ];
  assertUniqueSceneIdentities(features);

  return {
    snapshotId: input.snapshotId,
    features,
    selectableEntityIds: getSelectableEntityIds(features),
  };
}

export function getEffectiveFeatureColor(
  feature: SceneFeature,
  colors: ColorMap,
): string {
  // A null owner takes the neutral fill. After D4-10 no Modern unit has a null
  // owner, so on the Modern scene this branch no longer fires - it stays for
  // historical scenes and for malformed records, which still need it. An
  // unsafe owner id is a data defect and stays white rather than borrowing the
  // neutral treatment.
  if (feature.colorOwnerId === null) {
    return NEUTRAL_UNIT_COLOR;
  }
  if (!isSafeStableCountryId(feature.colorOwnerId)) {
    return DEFAULT_COLOR;
  }

  return getEffectiveCountryColor(colors, feature.colorOwnerId);
}

export function getEffectiveSceneColors(
  scene: EffectiveScene,
  colors: ColorMap,
): ReadonlyArray<string> {
  return scene.features
    .filter((feature) => feature.colorOwnerId !== null)
    .map((feature) => getEffectiveFeatureColor(feature, colors));
}

export function reconcileSelectionForScene(
  selectedIds: SelectedCountryIds,
  scene: EffectiveScene,
): SelectedCountryIds {
  const nextSelection = new Set<CountryId>();

  for (const selectedId of selectedIds) {
    if (scene.selectableEntityIds.has(selectedId)) {
      nextSelection.add(selectedId);
    }
  }

  return nextSelection;
}
