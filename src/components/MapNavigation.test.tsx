import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  MAP_NAVIGATION_PAN_FRACTION,
  MAP_NAVIGATION_ZOOM_FACTOR,
  MapNavigation,
  getMapNavigationDisabledState,
} from './MapNavigation';

const DEFAULT_PROPS = {
  currentZoom: 6,
  isMoveMapOpen: false,
  onMoveMapOpenChange: vi.fn(),
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onPan: vi.fn(),
  onResetView: vi.fn(),
};

describe('MapNavigation semantics', (): void => {
  it('renders exactly the four editor-only camera actions with project-owned icons', (): void => {
    const markup = renderToStaticMarkup(<MapNavigation {...DEFAULT_PROPS} />);

    expect(markup.match(/<button/g)).toHaveLength(4);
    expect(markup).toContain('aria-label="Zoom In"');
    expect(markup).toContain('aria-label="Zoom Out"');
    expect(markup).toContain('aria-label="Move Map"');
    // D-21: `Reset View` is CAMERA reset and this cluster is its home as of
    // `03-08`. It is icon-only, so it contributes exactly one accessible name
    // and no visible text - assertion 15 counts the accessible name.
    expect(markup).toContain('aria-label="Reset View"');
    expect(markup.match(/aria-label="Reset View"/gu)).toHaveLength(1);
    expect(markup).toContain('data-editor-only="true"');
    expect(markup).toContain('inline-size:44px');
    expect(markup).toContain('block-size:44px');
    expect(markup.match(/width="20"/g)).toHaveLength(4);
    expect(markup.match(/height="20"/g)).toHaveLength(4);
  });

  /*
   * D-05: the canvas region's entry in the accent budget is `none`. The one
   * global exemption is the `:focus-visible` ring, which is authored in
   * `theme.css` and never here - so a component-authored Apple Blue is always
   * a regression, whatever state it claims to paint.
   */
  it('spends no accent anywhere in the cluster', (): void => {
    const markup = renderToStaticMarkup(
      <MapNavigation {...DEFAULT_PROPS} isMoveMapOpen />,
    );

    expect(markup).not.toMatch(/apple-blue/iu);
    expect(markup).not.toMatch(/accent/iu);
    expect(markup).not.toMatch(/#0071e3/iu);
    expect(markup).not.toMatch(/#2997ff/iu);
  });

  it('renders exactly four pan alternatives in the controlled Move map popover', (): void => {
    const markup = renderToStaticMarkup(
      <MapNavigation {...DEFAULT_PROPS} isMoveMapOpen />,
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Move map"');
    expect(markup).toContain('aria-label="Pan Up"');
    expect(markup).toContain('aria-label="Pan Right"');
    expect(markup).toContain('aria-label="Pan Down"');
    expect(markup).toContain('aria-label="Pan Left"');
    expect(markup.match(/<button/g)).toHaveLength(8);
    expect(markup.match(/inline-size:44px/g)).toHaveLength(8);
    expect(markup.match(/block-size:44px/g)).toHaveLength(8);
  });

  it('derives truthful native zoom limits and exposes bounded camera steps', (): void => {
    expect(getMapNavigationDisabledState(1)).toEqual({
      isZoomInDisabled: false,
      isZoomOutDisabled: true,
    });
    expect(getMapNavigationDisabledState(24)).toEqual({
      isZoomInDisabled: true,
      isZoomOutDisabled: false,
    });
    expect(MAP_NAVIGATION_ZOOM_FACTOR).toBe(1.5);
    expect(MAP_NAVIGATION_PAN_FRACTION).toBe(0.125);

    const minimumMarkup = renderToStaticMarkup(
      <MapNavigation {...DEFAULT_PROPS} currentZoom={1} />,
    );
    const maximumMarkup = renderToStaticMarkup(
      <MapNavigation {...DEFAULT_PROPS} currentZoom={24} />,
    );

    expect(minimumMarkup).toMatch(/aria-label="Zoom Out"[^>]*disabled=""/);
    expect(maximumMarkup).toMatch(/aria-label="Zoom In"[^>]*disabled=""/);
  });
});
