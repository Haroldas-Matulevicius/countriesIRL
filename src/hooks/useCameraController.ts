import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  select,
  zoom,
  type ZoomBehavior,
  type ZoomTransform,
} from 'd3';

import {
  DRAG_CLICK_DISTANCE,
  INITIAL_WORLD_CAMERA,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_SIZE,
} from '../constants/camera';
import type {
  CameraFreezeLease,
  CameraPanDirection,
  CameraState,
} from '../types/composition';
import type { CountryId, GeoFeature } from '../types/map';
import {
  MOTION_DURATION_BASE_TOKEN,
  resolveCameraEasing,
  resolveMotionDuration,
} from '../utils/motion';
import {
  cameraToTransform,
  constrainCameraTransform,
  createLocateTransform,
  createResetTransform,
  panCameraTransform,
  transformToCamera,
  zoomCameraTransform,
} from '../utils/camera';

export interface CameraControllerDriver {
  readPaintedTransform(): ZoomTransform;
  paintTransform(transform: ZoomTransform): void;
  setInputEnabled(isEnabled: boolean): void;
  interrupt(): void;
  transitionTo(
    target: ZoomTransform,
    onFrame: (transform: ZoomTransform) => void,
    onEnd: () => void,
  ): void;
  getFeature(countryId: CountryId): GeoFeature | undefined;
  commitCamera(camera: CameraState): void;
  cleanup(): void;
}

export interface CameraController {
  readCurrentCamera(): CameraState;
  freezeAndSnapshot(): CameraFreezeLease;
  zoomBy(factor: number): void;
  pan(direction: CameraPanDirection, viewportFraction: number): void;
  resetView(): void;
  locate(countryId: CountryId): boolean;
  restore(camera: CameraState): boolean;
  onGestureFrame(transform: ZoomTransform): void;
  onGestureEnd(transform: ZoomTransform): void;
  destroy(): void;
}

export type CameraControllerFactory = (
  driver: CameraControllerDriver,
) => CameraController;

interface UseCameraControllerOptions {
  readonly svgRef: React.RefObject<SVGSVGElement | null>;
  readonly cameraLayerRef: React.RefObject<SVGGElement | null>;
  readonly locateFeatures: ReadonlyArray<GeoFeature>;
  readonly onCameraCommit?: (camera: CameraState) => void;
  readonly controllerFactory?: CameraControllerFactory;
}

interface ProgrammaticTransition {
  readonly onFrame: (transform: ZoomTransform) => void;
  readonly onEnd: () => void;
}

const CAMERA_TRANSITION_NAME = 'camera';
const CAMERA_EVENT_NAMESPACE = '.camera';
const ZOOM_EVENT_NAMESPACE = '.zoom';
const LEGEND_SELECTOR = '[data-layer="legend"], [data-legend]';

function isPrimaryCameraInput(event: Event): boolean {
  const candidate = event as Event & { readonly button?: number };
  return candidate.button === undefined || candidate.button === 0;
}

export function createCameraController(
  driver: CameraControllerDriver,
): CameraController {
  let activeFreezeCount = 0;
  let isDestroyed = false;
  let currentTransform = constrainCameraTransform(
    driver.readPaintedTransform(),
  );

  const paint = (transform: ZoomTransform): ZoomTransform => {
    const constrained = constrainCameraTransform(transform);
    currentTransform = constrained;
    driver.paintTransform(constrained);
    return constrained;
  };

  const commit = (transform: ZoomTransform): CameraState => {
    const constrained = paint(transform);
    const camera = transformToCamera(constrained);
    driver.commitCamera(camera);
    return camera;
  };

  const isLocked = (): boolean => activeFreezeCount > 0 || isDestroyed;

  const controller: CameraController = {
    readCurrentCamera: (): CameraState =>
      transformToCamera(
        constrainCameraTransform(driver.readPaintedTransform()),
      ),
    freezeAndSnapshot: (): CameraFreezeLease => {
      if (isDestroyed) {
        const camera = transformToCamera(currentTransform);
        return { camera, release: (): void => undefined };
      }

      // Count the lease only after the driver side effects succeed: a throwing
      // setInputEnabled/interrupt used to leave the camera locked forever
      // because no lease was ever returned to release.
      if (activeFreezeCount === 0) {
        try {
          driver.setInputEnabled(false);
          driver.interrupt();
          currentTransform = constrainCameraTransform(
            driver.readPaintedTransform(),
          );
          driver.paintTransform(currentTransform);
          driver.commitCamera(transformToCamera(currentTransform));
        } catch (error) {
          try {
            driver.setInputEnabled(true);
          } catch (renewError) {
            globalThis.console.error(
              'CountriesIRL could not renew camera input after a failed freeze.',
              renewError,
            );
          }
          throw error;
        }
      }
      activeFreezeCount += 1;

      let isReleased = false;
      const camera = transformToCamera(currentTransform);
      return {
        camera,
        release: (): void => {
          if (isReleased || isDestroyed) {
            return;
          }
          isReleased = true;
          activeFreezeCount = Math.max(0, activeFreezeCount - 1);
          if (activeFreezeCount === 0) {
            driver.setInputEnabled(true);
          }
        },
      };
    },
    zoomBy: (factor): void => {
      if (isLocked() || !Number.isFinite(factor) || factor <= 0) {
        return;
      }
      driver.interrupt();
      const paintedTransform = constrainCameraTransform(
        driver.readPaintedTransform(),
      );
      commit(zoomCameraTransform(paintedTransform, paintedTransform.k * factor));
    },
    pan: (direction, viewportFraction): void => {
      if (
        isLocked() ||
        !Number.isFinite(viewportFraction) ||
        viewportFraction <= 0
      ) {
        return;
      }
      driver.interrupt();
      commit(
        panCameraTransform(
          driver.readPaintedTransform(),
          direction,
          viewportFraction,
        ),
      );
    },
    resetView: (): void => {
      if (isLocked()) {
        return;
      }
      driver.interrupt();
      driver.transitionTo(
        createResetTransform(),
        controller.onGestureFrame,
        (): void => controller.onGestureEnd(driver.readPaintedTransform()),
      );
    },
    locate: (countryId): boolean => {
      if (isLocked()) {
        return false;
      }
      const feature = driver.getFeature(countryId);
      if (feature === undefined) {
        return false;
      }
      driver.interrupt();
      driver.transitionTo(
        createLocateTransform(feature, controller.readCurrentCamera()),
        controller.onGestureFrame,
        (): void => controller.onGestureEnd(driver.readPaintedTransform()),
      );
      return true;
    },
    restore: (camera): boolean => {
      if (isLocked()) {
        return false;
      }
      driver.interrupt();
      commit(cameraToTransform(camera));
      return true;
    },
    onGestureFrame: (transform): void => {
      if (!isLocked()) {
        paint(transform);
      }
    },
    onGestureEnd: (transform): void => {
      if (!isLocked()) {
        commit(transform);
      }
    },
    destroy: (): void => {
      if (isDestroyed) {
        return;
      }
      isDestroyed = true;
      activeFreezeCount = 0;
      driver.interrupt();
      driver.setInputEnabled(true);
      driver.cleanup();
    },
  };

  return controller;
}

function createInactiveController(): CameraController {
  const camera = INITIAL_WORLD_CAMERA;
  return {
    readCurrentCamera: (): CameraState => camera,
    freezeAndSnapshot: (): CameraFreezeLease => ({
      camera,
      release: (): void => undefined,
    }),
    zoomBy: (): void => undefined,
    pan: (): void => undefined,
    resetView: (): void => undefined,
    locate: (): boolean => false,
    restore: (): boolean => false,
    onGestureFrame: (): void => undefined,
    onGestureEnd: (): void => undefined,
    destroy: (): void => undefined,
  };
}

export function useCameraController({
  svgRef,
  cameraLayerRef,
  locateFeatures,
  onCameraCommit,
  controllerFactory = createCameraController,
}: UseCameraControllerOptions): CameraController {
  const controllerRef = useRef<CameraController | null>(null);
  const locateFeaturesRef = useRef(locateFeatures);
  const commitRef = useRef(onCameraCommit);

  useLayoutEffect((): void => {
    locateFeaturesRef.current = locateFeatures;
    commitRef.current = onCameraCommit;
  }, [locateFeatures, onCameraCommit]);

  useLayoutEffect((): (() => void) | undefined => {
    const svgElement = svgRef.current;
    const cameraLayerElement = cameraLayerRef.current;
    if (svgElement === null || cameraLayerElement === null) {
      return undefined;
    }

    const svgSelection = select<SVGSVGElement, unknown>(svgElement);
    const cameraLayer = select<SVGGElement, unknown>(cameraLayerElement);
    const initialTransform = cameraToTransform(INITIAL_WORLD_CAMERA);
    let paintedTransform = initialTransform;
    let isInputEnabled = true;
    let activeTransition: ProgrammaticTransition | null = null;

    const zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<
      SVGSVGElement,
      unknown
    >()
      .extent([
        [0, 0],
        [WORLD_SIZE, WORLD_SIZE],
      ])
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .clickDistance(DRAG_CLICK_DISTANCE)
      .constrain((transform): ZoomTransform =>
        constrainCameraTransform(transform),
      )
      .filter((event: Event): boolean => {
        const target = event.target;
        return (
          isInputEnabled &&
          isPrimaryCameraInput(event) &&
          (!(target instanceof Element) || target.closest(LEGEND_SELECTOR) === null)
        );
      })
      .on('zoom.camera', (event): void => {
        const transition = activeTransition;
        if (transition === null) {
          controller.onGestureFrame(event.transform);
        } else {
          transition.onFrame(event.transform);
        }
      })
      .on('end.camera', (event): void => {
        const transition = activeTransition;
        if (transition === null) {
          controller.onGestureEnd(event.transform);
          return;
        }
        activeTransition = null;
        transition.onEnd();
      });

    const attachInput = (): void => {
      svgSelection.call(zoomBehavior);
    };

    const driver: CameraControllerDriver = {
      readPaintedTransform: (): ZoomTransform => paintedTransform,
      paintTransform: (transform): void => {
        paintedTransform = constrainCameraTransform(transform);
        cameraLayer.attr('transform', paintedTransform.toString());
        svgSelection.property('__zoom', paintedTransform);
      },
      setInputEnabled: (isEnabled): void => {
        isInputEnabled = isEnabled;
        if (isEnabled) {
          attachInput();
          svgSelection.property('__zoom', paintedTransform);
        } else {
          svgSelection.on(ZOOM_EVENT_NAMESPACE, null);
        }
      },
      interrupt: (): void => {
        activeTransition = null;
        svgSelection.interrupt(CAMERA_TRANSITION_NAME);
      },
      transitionTo: (target, onFrame, onEnd): void => {
        activeTransition = { onFrame, onEnd };
        // UI-SPEC 17/18: Locate and Reset View are immediate under reduced
        // motion. That was declared in `--motion-camera` and asserted by the CSS
        // contract, but this transition read the literal and animated for 240ms
        // regardless. Reading the token is what makes the preference reach here.
        svgSelection
          .transition(CAMERA_TRANSITION_NAME)
          .duration(resolveMotionDuration(MOTION_DURATION_BASE_TOKEN, svgElement))
          .ease(resolveCameraEasing(svgElement))
          .call(zoomBehavior.transform, constrainCameraTransform(target));
      },
      getFeature: (countryId): GeoFeature | undefined =>
        locateFeaturesRef.current.find(
          (feature): boolean =>
            feature.id === countryId ||
            ('entityId' in feature && feature.entityId === countryId),
        ),
      commitCamera: (camera): void => {
        commitRef.current?.(camera);
      },
      cleanup: (): void => {
        zoomBehavior.on(CAMERA_EVENT_NAMESPACE, null);
        svgSelection.on(ZOOM_EVENT_NAMESPACE, null);
        cameraLayer.interrupt();
      },
    };

    const controller = controllerFactory(driver);
    controllerRef.current = controller;
    driver.paintTransform(initialTransform);
    svgSelection.property('__zoom', initialTransform);
    attachInput();

    return (): void => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [cameraLayerRef, controllerFactory, svgRef]);

  return useMemo<CameraController>(() => {
    const inactive = createInactiveController();
    return {
      readCurrentCamera: (): CameraState =>
        controllerRef.current?.readCurrentCamera() ??
        inactive.readCurrentCamera(),
      freezeAndSnapshot: (): CameraFreezeLease =>
        controllerRef.current?.freezeAndSnapshot() ??
        inactive.freezeAndSnapshot(),
      zoomBy: (factor): void => controllerRef.current?.zoomBy(factor),
      pan: (direction, viewportFraction): void =>
        controllerRef.current?.pan(direction, viewportFraction),
      resetView: (): void => controllerRef.current?.resetView(),
      locate: (countryId): boolean =>
        controllerRef.current?.locate(countryId) ?? false,
      restore: (camera): boolean =>
        controllerRef.current?.restore(camera) ?? false,
      onGestureFrame: (transform): void =>
        controllerRef.current?.onGestureFrame(transform),
      onGestureEnd: (transform): void =>
        controllerRef.current?.onGestureEnd(transform),
      destroy: (): void => controllerRef.current?.destroy(),
    };
  }, []);
}
