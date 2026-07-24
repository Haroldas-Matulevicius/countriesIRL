import { DEFAULT_COLOR } from '../constants/colors';
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
    (feature.interactionMode === 'modern-core' ||
      feature.interactionMode === 'historical-entity') &&
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

  const features =
    input.snapshotId === 'modern'
      ? input.modernFeatures.map((feature) => withBoundaryMode(feature, 'modern'))
      : [
          ...input.modernFeatures
            .filter(
              (feature) =>
                !replacedModernSourceFeatureIds.has(feature.sourceFeatureId),
            )
            .map((feature) => withBoundaryMode(feature, 'modern-fallback')),
          ...historicalFeatures.map((feature) =>
            withBoundaryMode(feature, 'historical'),
          ),
        ];

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
  if (
    feature.colorOwnerId === null ||
    !isSafeStableCountryId(feature.colorOwnerId)
  ) {
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
