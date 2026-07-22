import { describe, expect, it } from 'vitest';

import { calculateTooltipPosition } from './Tooltip';

describe('calculateTooltipPosition', () => {
  it('places pointer tooltips down and right when space is available', () => {
    expect(
      calculateTooltipPosition({
        anchorX: 100,
        anchorY: 100,
        tooltipWidth: 120,
        tooltipHeight: 60,
        viewportWidth: 360,
        viewportHeight: 640,
        inputMethod: 'pointer',
      }),
    ).toEqual({ left: 112, top: 112 });
  });

  it('flips pointer tooltips at the right and bottom edges', () => {
    expect(
      calculateTooltipPosition({
        anchorX: 350,
        anchorY: 630,
        tooltipWidth: 120,
        tooltipHeight: 60,
        viewportWidth: 360,
        viewportHeight: 640,
        inputMethod: 'pointer',
      }),
    ).toEqual({ left: 218, top: 558 });
  });

  it('clamps a wide tooltip within a 360px viewport', () => {
    expect(
      calculateTooltipPosition({
        anchorX: 350,
        anchorY: 100,
        tooltipWidth: 328,
        tooltipHeight: 60,
        viewportWidth: 360,
        viewportHeight: 640,
        inputMethod: 'pointer',
      }),
    ).toEqual({ left: 10, top: 112 });
  });

  it('flips keyboard tooltips below top-edge anchors and clamps horizontally', () => {
    expect(
      calculateTooltipPosition({
        anchorX: 4,
        anchorY: 4,
        tooltipWidth: 120,
        tooltipHeight: 60,
        viewportWidth: 360,
        viewportHeight: 640,
        inputMethod: 'keyboard',
      }),
    ).toEqual({ left: 8, top: 16 });
  });
});
