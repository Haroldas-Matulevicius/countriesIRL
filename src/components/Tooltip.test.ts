import { describe, expect, it, vi } from 'vitest';

import { TOOLTIP_SPACING } from '../constants/config';
import type { GeoFeature } from '../types/map';
import {
  keyboardTooltipData,
  pointerLeaveTooltipData,
  pointerTooltipData,
} from './MapCanvas';
import {
  calculateTooltipPosition,
  getTooltipMeasurementPosition,
  observeKeyboardTooltipAnchor,
  type TooltipAnchorElement,
} from './Tooltip';

const TOOLTIP_TEST_FEATURE: GeoFeature = {
  type: 'Feature',
  id: 'TST',
  properties: { name: 'Testland' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
};

describe('observeKeyboardTooltipAnchor', () => {
  it('refreshes moved anchor coordinates once per frame and cleans up listeners', () => {
    const listeners = new Map<string, EventListener>();
    const addEventListener = vi.fn(
      (
        type: 'scroll' | 'resize',
        listener: EventListener,
      ): void => {
        listeners.set(type, listener);
      },
    );
    const removeEventListener = vi.fn(
      (
        type: 'scroll' | 'resize',
        listener: EventListener,
      ): void => {
        if (listeners.get(type) === listener) {
          listeners.delete(type);
        }
      },
    );
    const frames = new Map<number, FrameRequestCallback>();
    const requestFrame = vi.fn((callback: FrameRequestCallback): number => {
      const handle = frames.size + 1;
      frames.set(handle, callback);
      return handle;
    });
    const cancelFrame = vi.fn((handle: number): void => {
      frames.delete(handle);
    });
    const disconnect = vi.fn();
    const observe = vi.fn();
    const resizeObserverState: { callback: (() => void) | null } = {
      callback: null,
    };
    let bounds = { left: 10, top: 20, width: 30, height: 40 };
    const anchorElement: TooltipAnchorElement = {
      getBoundingClientRect: () => bounds,
    };
    const onPositionChange = vi.fn();

    const cleanup = observeKeyboardTooltipAnchor({
      anchorElement,
      onPositionChange,
      eventTarget: { addEventListener, removeEventListener },
      requestFrame,
      cancelFrame,
      createResizeObserver: (callback) => {
        resizeObserverState.callback = callback;
        return { observe, disconnect };
      },
    });

    expect(addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true,
    );
    expect(addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(observe).toHaveBeenCalledWith(anchorElement);

    bounds = { left: 100, top: 200, width: 40, height: 60 };
    listeners.get('scroll')?.({} as Event);
    listeners.get('resize')?.({} as Event);
    expect(requestFrame).toHaveBeenCalledOnce();

    frames.get(1)?.(0);
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 120, y: 230 });

    resizeObserverState.callback?.();
    expect(requestFrame).toHaveBeenCalledTimes(2);
    cleanup();

    expect(removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true,
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cancelFrame).toHaveBeenCalledWith(2);
    expect(listeners.size).toBe(0);
  });

  it('restores a focused path to keyboard tracking after pointer leave', () => {
    const listeners = new Map<string, EventListener>();
    const addEventListener = vi.fn(
      (type: 'scroll' | 'resize', listener: EventListener): void => {
        listeners.set(type, listener);
      },
    );
    const removeEventListener = vi.fn(
      (type: 'scroll' | 'resize', listener: EventListener): void => {
        if (listeners.get(type) === listener) {
          listeners.delete(type);
        }
      },
    );
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrameHandle = 1;
    const requestFrame = vi.fn((callback: FrameRequestCallback): number => {
      const handle = nextFrameHandle;
      nextFrameHandle += 1;
      frames.set(handle, callback);
      return handle;
    });
    const cancelFrame = vi.fn((handle: number): void => {
      frames.delete(handle);
    });
    const disconnect = vi.fn();
    const observe = vi.fn();
    const resizeObserverState: { callback: (() => void) | null } = {
      callback: null,
    };
    let bounds = { left: 10, top: 20, width: 30, height: 40 };
    const pathElement = {
      getBoundingClientRect: (): typeof bounds => bounds,
    } as unknown as SVGPathElement;

    const initialKeyboardData = keyboardTooltipData(
      pathElement,
      TOOLTIP_TEST_FEATURE,
      '#123456',
    );
    expect(initialKeyboardData).toMatchObject({
      inputMethod: 'keyboard',
      position: { x: 25, y: 40 },
    });

    const pointerEnterData = pointerTooltipData(
      { clientX: 50, clientY: 60 } as PointerEvent,
      TOOLTIP_TEST_FEATURE,
      '#123456',
    );
    const pointerMoveData = pointerTooltipData(
      { clientX: 70, clientY: 80 } as PointerEvent,
      TOOLTIP_TEST_FEATURE,
      '#123456',
    );
    expect(pointerEnterData.inputMethod).toBe('pointer');
    expect(pointerMoveData).toMatchObject({
      inputMethod: 'pointer',
      position: { x: 70, y: 80 },
    });

    bounds = { left: 100, top: 200, width: 40, height: 60 };
    const restoredData = pointerLeaveTooltipData(
      pathElement,
      pathElement,
      TOOLTIP_TEST_FEATURE,
      '#123456',
    );
    expect(restoredData).toMatchObject({
      countryId: 'TST',
      countryName: 'Testland',
      color: '#123456',
      inputMethod: 'keyboard',
      anchorElement: pathElement,
      position: { x: 120, y: 230 },
    });
    expect(
      pointerLeaveTooltipData(
        pathElement,
        null,
        TOOLTIP_TEST_FEATURE,
        '#123456',
      ),
    ).toBeNull();
    if (restoredData?.inputMethod !== 'keyboard') {
      throw new Error('Expected focused pointer leave to restore keyboard data.');
    }

    const onPositionChange = vi.fn();
    const cleanup = observeKeyboardTooltipAnchor({
      anchorElement: restoredData.anchorElement,
      onPositionChange,
      eventTarget: { addEventListener, removeEventListener },
      requestFrame,
      cancelFrame,
      createResizeObserver: (callback) => {
        resizeObserverState.callback = callback;
        return { observe, disconnect };
      },
    });

    expect(observe).toHaveBeenCalledWith(pathElement);

    bounds = { left: 150, top: 250, width: 50, height: 70 };
    listeners.get('scroll')?.({} as Event);
    frames.get(1)?.(0);
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 175, y: 285 });

    bounds = { left: 200, top: 300, width: 60, height: 80 };
    listeners.get('resize')?.({} as Event);
    frames.get(2)?.(0);
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 230, y: 340 });

    bounds = { left: 300, top: 400, width: 80, height: 100 };
    resizeObserverState.callback?.();
    frames.get(3)?.(0);
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 340, y: 450 });

    listeners.get('scroll')?.({} as Event);
    cleanup();

    expect(removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true,
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cancelFrame).toHaveBeenCalledWith(4);
    expect(listeners.size).toBe(0);
  });
});

describe('tooltip measurement', () => {
  it('uses the approved 8px spacing at the stable measurement origin', () => {
    expect(TOOLTIP_SPACING).toBe(8);
    expect(getTooltipMeasurementPosition()).toEqual({ left: 8, top: 8 });
  });
});

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
    ).toEqual({ left: 108, top: 108 });
  });

  it('flips pointer tooltips at the right and bottom edges', () => {
    const tooltipWidth = 120;
    const position = calculateTooltipPosition({
      anchorX: 350,
      anchorY: 630,
      tooltipWidth,
      tooltipHeight: 60,
      viewportWidth: 360,
      viewportHeight: 640,
      inputMethod: 'pointer',
    });

    expect(position).toEqual({ left: 222, top: 562 });
    expect(position.left + tooltipWidth).toBeLessThanOrEqual(352);
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
    ).toEqual({ left: 14, top: 108 });
  });

  it('contains the maximum mobile tooltip width inside 8px margins', () => {
    const tooltipWidth = 360 - TOOLTIP_SPACING * 2;
    const position = calculateTooltipPosition({
      anchorX: 359,
      anchorY: 320,
      tooltipWidth,
      tooltipHeight: 80,
      viewportWidth: 360,
      viewportHeight: 640,
      inputMethod: 'pointer',
    });

    expect(position.left).toBe(TOOLTIP_SPACING);
    expect(position.left + tooltipWidth).toBe(360 - TOOLTIP_SPACING);
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
    ).toEqual({ left: 8, top: 12 });
  });
});
