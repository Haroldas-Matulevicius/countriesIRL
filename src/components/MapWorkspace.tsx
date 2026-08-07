import { useState } from 'react';
import type { ReactNode, Ref } from 'react';

import type {
  CameraState,
  MapCanvasHandle,
  SnapshotId,
  StrokeWeight,
} from '../types/composition';
import type {
  ColorMap,
  CountryId,
  SceneFeature,
  SelectedCountryIds,
} from '../types/map';
import type { WorldGeoDataState } from '../hooks/useGeoData';
import { PERIOD_COPY } from '../utils/periods';
import { MAP_PREVIEW_LABEL_ID } from './editor/PeriodHud';
import { FatalErrorState } from './FatalErrorState';
import { MapCanvas, type MapTooltipData } from './MapCanvas';
import { Tooltip } from './Tooltip';

interface MapWorkspaceProps {
  geoData: WorldGeoDataState;
  /**
   * The period HUD owns the preview label, the period surface, and the period
   * status live region; it sits in the canvas region and outside the export
   * subtree (UI-SPEC section 4). `Reset View` left for the floating cluster in
   * `03-08`.
   */
  periodHud: ReactNode;
  /**
   * The onboarding card and `Show Help` (UI-SPEC 10). A SIBLING of the export
   * source, exactly like `periodHud` and `navigationSlot`: the export
   * clones `svg.map-canvas`, so nothing placed here can reach the PNG.
   *
   * It lives in the canvas region rather than in the tool panel because D-18
   * opens a first run with the panel CLOSED, and onboarding a creator has not
   * dismissed cannot be hidden behind a panel they have not opened.
   */
  helpSlot?: ReactNode;
  snapshotId: SnapshotId;
  periodLabel: string;
  /**
   * The composed effective scene, or `null` when it is unavailable. Required
   * and explicitly nullable: falling back to the modern world would render
   * modern borders while the composition state claims a historical snapshot.
   */
  features: ReadonlyArray<SceneFeature> | null;
  colors: ColorMap;
  /** D4-03: the composition water colour, forwarded verbatim to `MapCanvas`. */
  surfaceColor?: string;
  uncoloredFill?: string;
  borderColor?: string;
  coastlineWeight?: StrokeWeight;
  interiorWeight?: StrokeWeight;
  selectedIds: SelectedCountryIds;
  exportSourceRef: Ref<MapCanvasHandle>;
  legendSlot?: ReactNode;
  /**
   * The editor-only camera cluster (D-21). It renders INSIDE
   * `.map-workspace__canvas` and always as a SIBLING of the export source: the
   * export clones `svg.map-canvas`, so nothing placed here can reach the PNG,
   * and nothing here may be moved under `MapCanvas`.
   *
   * Inside the canvas region rather than beside it, because the region is the
   * `container-type: size` box `.map-frame` measures itself against. Placing
   * the cluster in the SAME container is what lets its inset math and the
   * frame's `--frame-side: min(100cqw, 100cqh)` be one shared expression rather
   * than two that happen to agree today.
   *
   * It used to overlay the square's top-left corner, which put it on top of a
   * `top-left` legend - the default position. That collision is not fixable by
   * reserving canvas space for the cluster: the cluster is sized in SCREEN
   * pixels while the legend is positioned in 1080-unit CANVAS space, so the
   * cluster's canvas-space footprint changes with the square's width (about 173
   * units at a 934px square, about 270 at a 600px one). No fixed rectangle in
   * the export's coordinate system can contain it, so the chrome moves off the
   * square instead of the legend moving out of the corner.
   *
   * After the map rather than before it: UI-SPEC 20 orders the focus sequence
   * period HUD -> map -> map navigation -> tools, and rendering the cluster
   * ahead of the square would put the camera controls before the map.
   */
  navigationSlot?: ReactNode;
  onCameraCommit?: (camera: CameraState) => void;
  onSelectCountry: (countryId: CountryId) => void;
  onClearSelection: () => void;
  onReload: () => void;
}

export function MapWorkspace({
  geoData,
  periodHud,
  helpSlot,
  snapshotId,
  periodLabel,
  features,
  colors,
  surfaceColor,
  uncoloredFill,
  borderColor,
  coastlineWeight,
  interiorWeight,
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
  const isSceneReady = geoData.status === 'ready' && features !== null;

  return (
    <section className="map-workspace" aria-labelledby={MAP_PREVIEW_LABEL_ID}>
      {periodHud}

      <div className="map-workspace__canvas">
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

        {isSceneReady ? (
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
              surfaceColor={surfaceColor}
              uncoloredFill={uncoloredFill}
              borderColor={borderColor}
              coastlineWeight={coastlineWeight}
              interiorWeight={interiorWeight}
              selectedIds={selectedIds}
              onSelectCountry={onSelectCountry}
              onClearSelection={onClearSelection}
              onTooltipChange={setTooltipData}
              legendSlot={legendSlot}
              onCameraCommit={onCameraCommit}
            />
            {/*
              D-32: the export frame. A structural SIBLING of
              `div.map-export-source`, never a descendant of `svg.map-canvas` -
              the export clones the canonical SVG, so placement is what keeps
              the frame out of the PNG and `data-editor-only` is the second line
              of defence, not the first.

              It is deliberately NOT a slot. `legendSlot` and `navigationSlot`
              are a composition contract; the frame is structural chrome that
              marks what the 1080 square will crop to, and a caller that could
              replace it could remove the creator's only WYSIWYG signal.
            */}
            <div
              className="map-frame"
              data-editor-only="true"
              aria-hidden="true"
            />
            {/*
              The camera cluster, in the same container the frame measures
              itself against and still a sibling of `div.map-export-source`.
              It is gated on the ready scene with the frame and the tooltip:
              there is no camera to zoom, pan, or reset before one exists, and
              a disabled cluster floating over a loading skeleton would be
              chrome for a map that is not there.
            */}
            {navigationSlot}
            <Tooltip data={tooltipData} />
          </>
        ) : null}
      </div>

      {helpSlot}
    </section>
  );
}
