import { describe, expect, it, vi } from 'vitest';

import {
  calculateTooltipPosition,
  observeKeyboardTooltipAnchor,
  type TooltipAnchorElement,
} from './Tooltip';

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
