import { useState } from 'react';
import type { Ref } from 'react';

import type {
  ColorMap,
  CountryId,
  GeoDataState,
  SelectedCountryIds,
} from '../types/map';
import { FatalErrorState } from './FatalErrorState';
import { MapCanvas, type MapTooltipData } from './MapCanvas';
import { Tooltip } from './Tooltip';

interface MapWorkspaceProps {
  geoData: GeoDataState;
  colors: ColorMap;
  selectedIds: SelectedCountryIds;
  exportSourceRef: Ref<HTMLDivElement>;
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onReload: () => void;
}

export function MapWorkspace({
  geoData,
  colors,
  selectedIds,
  exportSourceRef,
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
            <div className="map-workspace__skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
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
              features={geoData.features}
              colors={colors}
              selectedIds={selectedIds}
              onSelectCountry={onSelectCountry}
              onClearSelection={onClearSelection}
              onTooltipChange={setTooltipData}
            />
            <Tooltip data={tooltipData} />
          </>
        ) : null}
      </div>
    </section>
  );
}
