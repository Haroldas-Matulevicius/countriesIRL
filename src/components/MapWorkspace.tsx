import { useState } from 'react';
import type { ReactNode, Ref } from 'react';

import type { CameraState, MapCanvasHandle } from '../types/composition';
import type {
  ColorMap,
  CountryId,
  SceneFeature,
  SelectedCountryIds,
} from '../types/map';
import type { WorldGeoDataState } from '../hooks/useGeoData';
import { FatalErrorState } from './FatalErrorState';
import { MapCanvas, type MapTooltipData } from './MapCanvas';
import { Tooltip } from './Tooltip';

interface MapWorkspaceProps {
  geoData: WorldGeoDataState;
  features?: ReadonlyArray<SceneFeature>;
  colors: ColorMap;
  selectedIds: SelectedCountryIds;
  exportSourceRef: Ref<MapCanvasHandle>;
  legendSlot?: ReactNode;
  onCameraCommit?: (camera: CameraState) => void;
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onReload: () => void;
}

export function MapWorkspace({
  geoData,
  features,
  colors,
  selectedIds,
  exportSourceRef,
  legendSlot,
  onCameraCommit,
  onSelectCountry,
  onClearSelection,
  onReload,
}: MapWorkspaceProps): JSX.Element {
  const [tooltipData, setTooltipData] = useState<MapTooltipData | null>(null);

  return (
    <section className="map-workspace" aria-labelledby="map-preview-label">
      <p className="map-workspace__label" id="map-preview-label">
        1080 × 1080 PNG preview
      </p>

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
            <p>Loading Europe map…</p>
          </div>
        ) : null}

        {geoData.status === 'error' ? (
          <FatalErrorState onReload={onReload} />
        ) : null}

        {geoData.status === 'ready' ? (
          <>
            {geoData.warnings.length > 0 ? (
              <p className="map-workspace__warning" role="status">
                Some country shapes could not be loaded. You can continue with
                the available map.
              </p>
            ) : null}
            <MapCanvas
              ref={exportSourceRef}
              features={features ?? geoData.features}
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
          </>
        ) : null}
      </div>
    </section>
  );
}
