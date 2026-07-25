import { zoomIdentity, type ZoomTransform } from 'd3';
import type { Polygon } from 'geojson';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_WORLD_CAMERA } from '../constants/camera';
import type { GeoFeature, SceneFeature } from '../types/map';
import {
  createCameraController,
  type CameraControllerDriver,
} from '../hooks/useCameraController';
import {
  MapCanvas,
  createWrappedSceneModel,
  getSceneFeatureColor,
  getSelectableSceneFeatures,
} from './MapCanvas';
import { cameraToTransform, transformToCamera } from '../utils/camera';

const FRANCE: GeoFeature = {
  type: 'Feature',
  id: 'FRA',
  properties: { name: 'France' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-5, 42],
        [8, 42],
        [8, 51],
        [-5, 51],
        [-5, 42],
      ],
    ] as Polygon['coordinates'],
  },
};

interface DriverHarness {
  readonly driver: CameraControllerDriver;
  readonly getPaintedTransform: () => ZoomTransform;
  readonly getInputEnabled: () => boolean;
  readonly runTransitionFrame: (transform: ZoomTransform) => void;
  readonly finishTransition: () => void;
  readonly commitCamera: ReturnType<typeof vi.fn>;
  readonly interrupt: ReturnType<typeof vi.fn>;
  readonly setInputEnabled: ReturnType<typeof vi.fn>;
  readonly cleanup: ReturnType<typeof vi.fn>;
}

function createDriverHarness(): DriverHarness {
  let paintedTransform = cameraToTransform(INITIAL_WORLD_CAMERA);
  let isInputEnabled = true;
  let transitionFrame: ((transform: ZoomTransform) => void) | null = null;
  let transitionEnd: (() => void) | null = null;
  const commitCamera = vi.fn();
  const interrupt = vi.fn();
  const setInputEnabled = vi.fn((isEnabled: boolean): void => {
    isInputEnabled = isEnabled;
  });
  const cleanup = vi.fn();

  return {
    driver: {
      readPaintedTransform: (): ZoomTransform => paintedTransform,
      paintTransform: (transform): void => {
        paintedTransform = transform;
      },
      setInputEnabled,
      interrupt,
      transitionTo: (target, onFrame, onEnd): void => {
        transitionFrame = onFrame;
        transitionEnd = onEnd;
        onFrame(target);
      },
      getFeature: (countryId): GeoFeature | undefined =>
        countryId === FRANCE.id ? FRANCE : undefined,
      commitCamera,
      cleanup,
    },
    getPaintedTransform: (): ZoomTransform => paintedTransform,
    getInputEnabled: (): boolean => isInputEnabled,
    runTransitionFrame: (transform): void => transitionFrame?.(transform),
    finishTransition: (): void => transitionEnd?.(),
    commitCamera,
    interrupt,
    setInputEnabled,
    cleanup,
  };
}

describe('live camera controller', (): void => {
  it('updates the visible transform for wheel frames and commits only when settled', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);
    const wheelTransform = zoomIdentity.translate(-320, -180).scale(2);

    controller.onGestureFrame(wheelTransform);

    expect(harness.getPaintedTransform()).toMatchObject({
      k: 2,
      x: -320,
      y: -180,
    });
    expect(harness.commitCamera).not.toHaveBeenCalled();

    controller.onGestureEnd(wheelTransform);

    expect(harness.commitCamera).toHaveBeenCalledTimes(1);
    expect(harness.commitCamera).toHaveBeenLastCalledWith(
      transformToCamera(harness.getPaintedTransform()),
    );
  });

  it('zooms around the viewport center and pans by a viewport fraction', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);

    controller.zoomBy(1.5);

    expect(harness.getPaintedTransform()).toMatchObject({
      k: 1.5,
      x: -270,
      y: -270,
    });
    expect(harness.commitCamera).toHaveBeenCalledTimes(1);

    controller.pan('right', 0.125);

    expect(harness.getPaintedTransform()).toMatchObject({
      k: 1.5,
      x: -405,
      y: -270,
    });
    expect(harness.commitCamera).toHaveBeenCalledTimes(2);
  });

  it('blocks navigation and restore while an export lease is active', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);
    const lease = controller.freezeAndSnapshot();
    const frozenTransform = harness.getPaintedTransform();

    controller.zoomBy(1.5);
    controller.pan('right', 0.125);
    const didRestore = controller.restore({
      zoom: 3,
      centerLongitude: 20,
      centerLatitude: 10,
    });

    expect(didRestore).toBe(false);
    expect(harness.getPaintedTransform()).toEqual(frozenTransform);

    lease.release();
    expect(controller.restore({
      zoom: 3,
      centerLongitude: 20,
      centerLatitude: 10,
    })).toBe(true);
  });

  it('animates Locate through the shared constrained transition boundary', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);

    controller.locate(FRANCE.id);

    expect(harness.getPaintedTransform().k).toBeGreaterThanOrEqual(2);
    expect(harness.commitCamera).not.toHaveBeenCalled();

    harness.finishTransition();

    expect(harness.commitCamera).toHaveBeenCalledTimes(1);
  });

  it('freezes the last painted frame, settles it, and renews input after release', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);
    const visibleTransform = zoomIdentity.translate(-540, -270).scale(3);
    controller.onGestureFrame(visibleTransform);

    const lease = controller.freezeAndSnapshot();

    expect(harness.getInputEnabled()).toBe(false);
    expect(harness.interrupt).toHaveBeenCalledTimes(1);
    expect(lease.camera).toEqual(transformToCamera(visibleTransform));
    expect(controller.readCurrentCamera()).toEqual(lease.camera);
    expect(harness.commitCamera).toHaveBeenLastCalledWith(lease.camera);

    lease.release();
    controller.onGestureFrame(zoomIdentity.translate(-120, 0).scale(2));

    expect(harness.getInputEnabled()).toBe(true);
    expect(harness.getPaintedTransform()).toMatchObject({ k: 2, x: -120, y: 0 });
  });

  it('takes no freeze lease when a driver side effect throws', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);
    harness.interrupt.mockImplementationOnce((): void => {
      throw new Error('interrupt failed');
    });

    expect((): void => {
      controller.freezeAndSnapshot();
    }).toThrow('interrupt failed');

    // Input is renewed and the camera is not locked: a later freeze/release
    // pair still works, so the camera never gets stuck without a lease holder.
    expect(harness.getInputEnabled()).toBe(true);
    controller.zoomBy(2);
    expect(harness.getPaintedTransform().k).toBeGreaterThan(1);

    const lease = controller.freezeAndSnapshot();
    expect(harness.getInputEnabled()).toBe(false);
    lease.release();
    expect(harness.getInputEnabled()).toBe(true);
  });

  it('keeps nested and repeated lease release exact-once in effect', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);
    const firstLease = controller.freezeAndSnapshot();
    const secondLease = controller.freezeAndSnapshot();

    firstLease.release();
    firstLease.release();
    expect(harness.getInputEnabled()).toBe(false);

    secondLease.release();
    secondLease.release();
    expect(harness.getInputEnabled()).toBe(true);
  });

  it('renews input after a thrown frozen callback releases from finally', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);
    const lease = controller.freezeAndSnapshot();

    expect((): void => {
      try {
        throw new Error('capture failed');
      } finally {
        lease.release();
      }
    }).toThrow('capture failed');

    expect(harness.getInputEnabled()).toBe(true);
  });

  it('cleans pending work and handlers without leaving input locked', (): void => {
    const harness = createDriverHarness();
    const controller = createCameraController(harness.driver);
    controller.freezeAndSnapshot();

    controller.destroy();

    expect(harness.getInputEnabled()).toBe(true);
    expect(harness.interrupt).toHaveBeenCalled();
    expect(harness.cleanup).toHaveBeenCalledTimes(1);
  });
});

function createSceneFeature(
  id: string,
  interactionMode: SceneFeature['interactionMode'],
): SceneFeature {
  const base = {
    ...FRANCE,
    id: `unit-${id}`,
    sourceFeatureId: `source-${id}`,
    entityId: id,
    boundaryMode: 'modern' as const,
    provenanceId: 'fixture',
  };

  if (interactionMode === 'modern-core' || interactionMode === 'historical-entity') {
    return {
      ...base,
      interactionMode,
      colorOwnerId: id,
      isSelectable: true,
    };
  }

  if (interactionMode === 'inherited-dependency') {
    return {
      ...base,
      interactionMode,
      colorOwnerId: 'FRA',
      isSelectable: false,
    };
  }

  return {
    ...base,
    interactionMode,
    colorOwnerId: null,
    isSelectable: false,
  };
}

describe('MapCanvas accessibility structure', (): void => {
  it('keeps the editable legend outside the country listbox', (): void => {
    const markup = renderToStaticMarkup(
      <MapCanvas
        features={[]}
        colors={{}}
        selectedIds={new Set()}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onTooltipChange={vi.fn()}
        legendSlot={
          <g data-layer="legend">
            <rect role="button" aria-label="Move legend" tabIndex={0} />
          </g>
        }
      />,
    );
    const svgStart = markup.indexOf('<svg');
    const svgOpeningEnd = markup.indexOf('>', svgStart);
    const listboxStart = markup.indexOf('role="listbox"');
    const listboxEnd = markup.indexOf('</g>', listboxStart);
    const legendStart = markup.indexOf('data-layer="legend"');

    expect(markup.slice(svgStart, svgOpeningEnd)).not.toContain('role="listbox"');
    expect(markup.match(/role="listbox"/gu)).toHaveLength(1);
    expect(markup.match(/role="button"/gu)).toHaveLength(1);
    expect(listboxStart).toBeGreaterThan(svgOpeningEnd);
    expect(listboxEnd).toBeLessThan(legendStart);
  });
});

describe('wrapped effective scene model', (): void => {
  it('creates one logical path and two decorative repeats per selectable entity', (): void => {
    const model = createWrappedSceneModel([
      createSceneFeature('FRA', 'modern-core'),
      createSceneFeature('HIST-PLC', 'historical-entity'),
    ]);

    expect(model).toHaveLength(6);
    expect(model.filter((path) => path.kind === 'logical')).toHaveLength(2);
    expect(model.filter((path) => path.kind === 'decorative')).toHaveLength(4);
    expect(
      model.filter((path) => path.kind === 'logical').map((path) => path.entityId),
    ).toEqual(['FRA', 'HIST-PLC']);
    expect(
      model.filter((path) => path.kind === 'decorative').every(
        (path) => path.isAccessible === false && path.isFocusable === false,
      ),
    ).toBe(true);
  });

  it('rejects duplicate selectable identities before rendering', (): void => {
    const primary = createSceneFeature('HIST-PLC', 'historical-entity');
    const duplicate: SceneFeature = {
      ...primary,
      id: 'unit-HIST-PLC-duplicate',
      sourceFeatureId: 'source-HIST-PLC-duplicate',
    };

    expect((): ReadonlyArray<unknown> =>
      createWrappedSceneModel([primary, duplicate]),
    ).toThrow('duplicate-scene-selectable-entity-id');
    expect((): ReadonlyArray<SceneFeature> =>
      getSelectableSceneFeatures([primary, duplicate]),
    ).toThrow('duplicate-scene-selectable-entity-id');
  });

  it('keeps inherited, disputed, and neutral geometry unfocusable', (): void => {
    const model = createWrappedSceneModel([
      createSceneFeature('ABW', 'inherited-dependency'),
      createSceneFeature('DISPUTED', 'disputed'),
      createSceneFeature('NEUTRAL', 'neutral'),
    ]);

    expect(model).toHaveLength(9);
    expect(model.every((path) => path.kind === 'decorative')).toBe(true);
    expect(model.every((path) => !path.isAccessible && !path.isFocusable)).toBe(
      true,
    );
  });

  it('uses entity colors for selectable history and parent colors for dependencies', (): void => {
    const historical = createSceneFeature('HIST-PLC', 'historical-entity');
    const dependency = createSceneFeature('ABW', 'inherited-dependency');
    const neutral = createSceneFeature('NEUTRAL', 'neutral');
    const colors = { 'HIST-PLC': '#AA0000', FRA: '#0000AA' };

    expect(getSceneFeatureColor(historical, colors)).toBe('#AA0000');
    expect(getSceneFeatureColor(dependency, colors)).toBe('#0000AA');
    expect(getSceneFeatureColor(neutral, colors)).toBe('#FFFFFF');
  });

  it('models the reviewed modern world as 195 logical options and 248 units', (): void => {
    const selectable = Array.from({ length: 195 }, (_, index) =>
      createSceneFeature(`CORE-${index}`, 'modern-core'),
    );
    const nonSelectable = Array.from({ length: 53 }, (_, index) =>
      createSceneFeature(`UNIT-${index}`, 'neutral'),
    );
    const features = [...selectable, ...nonSelectable];
    const model = createWrappedSceneModel(features);

    expect(features).toHaveLength(248);
    expect(model.filter((path) => path.kind === 'logical')).toHaveLength(195);
    expect(new Set(model.map((path) => path.sceneUnitId)).size).toBe(248);
  });
});
