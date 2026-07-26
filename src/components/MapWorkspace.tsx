import { useState } from 'react';
import type { ReactNode, Ref } from 'react';

import type {
  CameraState,
  MapCanvasHandle,
  SnapshotId,
} from '../types/composition';
import type {
  ColorMap,
  CountryId,
  SceneFeature,
  SelectedCountryIds,
} from '../types/map';
import type { WorldGeoDataState } from '../hooks/useGeoData';
import { PERIOD_COPY } from '../utils/periods';
import { MAP_PREVIEW_LABEL_ID } from './CompositionBar';
import { FatalErrorState } from './FatalErrorState';
import { MapCanvas, type MapTooltipData } from './MapCanvas';
import { Tooltip } from './Tooltip';

interface MapWorkspaceProps {
  geoData: WorldGeoDataState;
  /**
   * The composition bar owns the preview label, the period selector, and the
   * only Reset View control; it sits above the square and outside the export
   * subtree (UI-SPEC section 9).
   */
  compositionBar: ReactNode;
  snapshotId: SnapshotId;
  periodLabel: string;
  /**
   * The composed effective scene, or `null` when it is unavailable. Required
   * and explicitly nullable: falling back to the modern world would render
   * modern borders while the composition state claims a historical snapshot.
   */
  features: ReadonlyArray<SceneFeature> | null;
  colors: ColorMap;
  selectedIds: SelectedCountryIds;
  exportSourceRef: Ref<MapCanvasHandle>;
  legendSlot?: ReactNode;
  /**
   * The editor-only camera cluster (UI-SPEC 10). It is rendered inside the
   * square but as a SIBLING of the export source, never inside it: the export
   * clones `svg.map-canvas`, so anything placed in here can never reach the PNG,
   * and nothing in here may be moved under `MapCanvas`.
   */
  navigationSlot?: ReactNode;
  onCameraCommit?: (camera: CameraState) => void;
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onReload: () => void;
}

export function MapWorkspace({
  geoData,
  compositionBar,
  snapshotId,
  periodLabel,
  features,
  colors,
  selectedIds,
  exportSourceRef,
  legendSlot,
  navigationSlot,
  onCameraCommit,
  onSelectCountry,
  onClearSelection,
  onReload,
}: MapWorkspaceProps): JSX.Element {
  const [tooltipData, setTooltipData] = useState<MapTooltipData | null>(null);

  return (
    <section className="map-workspace" aria-labelledby={MAP_PREVIEW_LABEL_ID}>
      {compositionBar}

      <div className="map-workspace__square">
        {geoData.status === 'loading' ? (
          <div
            className="map-workspace__loading"
            aria-live="polite"
            role="status"
          >
            <svg
              className="map-workspace__skeleton"
              viewBox="0 0 360 240"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <path d="M72 151L88 126L112 120L128 96L155 91L174 73L206 79L228 67L252 78L292 77L324 99L316 120L286 126L263 145L231 148L211 166L177 158L151 169L121 158L96 166Z" />
              <path d="M151 83L144 58L157 25L170 18L178 42L170 66Z" />
              <path d="M181 75L184 45L200 19L213 15L211 38L196 67Z" />
              <path d="M112 109L101 89L106 72L118 77L122 96Z" />
              <path d="M91 123L69 119L52 134L57 153L77 156Z" />
              <path d="M177 159L190 174L196 199L187 220L178 193L166 177Z" />
              <path d="M213 163L226 176L241 183L235 194L217 187L204 174Z" />
              <circle cx="136" cy="177" r="5" />
              <circle cx="154" cy="188" r="4" />
            </svg>
            <p>{PERIOD_COPY.worldLoading}</p>
          </div>
        ) : null}

        {geoData.status === 'error' ? (
          <FatalErrorState onReload={onReload} />
        ) : null}

        {geoData.status === 'ready' && features === null ? (
          <FatalErrorState onReload={onReload} />
        ) : null}

        {geoData.status === 'ready' && features !== null ? (
          <>
            {geoData.warnings.length > 0 ? (
              <p className="map-workspace__warning" role="status">
                Some country shapes could not be loaded. You can continue with
                the available map.
              </p>
            ) : null}
            <MapCanvas
              ref={exportSourceRef}
              snapshotId={snapshotId}
              periodLabel={periodLabel}
              features={features}
              locateFeatures={geoData.features}
              colors={colors}
              selectedIds={selectedIds}
              onSelectCountry={onSelectCountry}
              onClearSelection={onClearSelection}
              onTooltipChange={setTooltipData}
              legendSlot={legendSlot}
              onCameraCommit={onCameraCommit}
            />
            <Tooltip data={tooltipData} />
            {navigationSlot}
          </>
        ) : null}
      </div>
    </section>
  );
}
