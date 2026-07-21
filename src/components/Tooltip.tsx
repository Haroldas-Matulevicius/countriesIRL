import type { CSSProperties } from 'react';

import type { MapTooltipData } from './MapCanvas';

interface TooltipProps {
  data: MapTooltipData | null;
}

export function Tooltip({ data }: TooltipProps): JSX.Element | null {
  if (data === null) {
    return null;
  }

  const positionStyle: CSSProperties = {
    left: data.position.x,
    top: data.position.y,
  };

  return (
    <div
      className="map-tooltip"
      data-input-method={data.inputMethod}
      role="tooltip"
      style={positionStyle}
    >
      <strong className="map-tooltip__country">{data.countryName}</strong>
      <span className="map-tooltip__color">Current color: {data.color}</span>
    </div>
  );
}
