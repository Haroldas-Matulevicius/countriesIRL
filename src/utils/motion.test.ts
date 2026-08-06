import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CAMERA_MOTION_DURATION_MS,
  SCENE_CROSSFADE_DURATION_MS,
} from '../constants/camera';
import {
  createCubicBezierEasing,
  MOTION_EASE_OUT_TOKEN,
  MOTION_DURATION_BASE_TOKEN,
  MOTION_FALLBACK_MS,
  MOTION_SCENE_TOKEN,
  parseCubicBezier,
  parseMotionDuration,
  resolveCameraEasing,
  resolveMotionDuration,
} from './motion';

interface ComputedStyleStub {
  getPropertyValue: (property: string) => string;
}

function stubComputedStyle(values: Record<string, string>): void {
  vi.stubGlobal(
    'getComputedStyle',
    (): ComputedStyleStub => ({
      getPropertyValue: (property: string): string => values[property] ?? '',
    }),
  );
}

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (): { matches: boolean } => ({ matches }),
  );
}

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('parseMotionDuration', (): void => {
  it('accepts every CSS <time> spelling a computed value can take', (): void => {
    expect(parseMotionDuration('160ms')).toBe(160);
    expect(parseMotionDuration(' 240ms ')).toBe(240);
    expect(parseMotionDuration('0ms')).toBe(0);
    expect(parseMotionDuration('0.16s')).toBe(160);
    expect(parseMotionDuration('0')).toBe(0);
  });

  it('rejects anything that is not a non-negative duration', (): void => {
    // A unitless non-zero number is not a valid <time>; treating it as ms
    // would silently animate on a typo.
    expect(parseMotionDuration('160')).toBeNull();
    expect(parseMotionDuration('')).toBeNull();
    expect(parseMotionDuration('-160ms')).toBeNull();
    expect(parseMotionDuration('fast')).toBeNull();
    expect(parseMotionDuration('var(--motion-scene)')).toBeNull();
  });
});

describe('resolveMotionDuration', (): void => {
  const element = {} as Element;

  it('reads the declared token rather than the TypeScript default', (): void => {
    stubComputedStyle({
      [MOTION_SCENE_TOKEN]: '160ms',
      [MOTION_DURATION_BASE_TOKEN]: '240ms',
    });

    expect(resolveMotionDuration(MOTION_SCENE_TOKEN, element)).toBe(
      SCENE_CROSSFADE_DURATION_MS,
    );
    expect(resolveMotionDuration(MOTION_DURATION_BASE_TOKEN, element)).toBe(
      CAMERA_MOTION_DURATION_MS,
    );
  });

  /**
   * The whole point of the wiring: `theme.css` zeroes both tokens under
   * `prefers-reduced-motion`, and that must be what suppresses the scene
   * crossfade and the camera transition. Before this, the tokens were dead and
   * the camera animated for 240ms regardless of the preference.
   */
  it('honours a zeroed token even when the media query says otherwise', (): void => {
    stubComputedStyle({
      [MOTION_SCENE_TOKEN]: '0ms',
      [MOTION_DURATION_BASE_TOKEN]: '0ms',
    });
    stubReducedMotion(false);

    expect(resolveMotionDuration(MOTION_SCENE_TOKEN, element)).toBe(0);
    expect(resolveMotionDuration(MOTION_DURATION_BASE_TOKEN, element)).toBe(0);
  });

  it('falls back to the SPEC default only when the token is unreadable', (): void => {
    stubComputedStyle({});
    stubReducedMotion(false);

    expect(resolveMotionDuration(MOTION_SCENE_TOKEN, element)).toBe(
      MOTION_FALLBACK_MS[MOTION_SCENE_TOKEN],
    );
    expect(resolveMotionDuration(MOTION_DURATION_BASE_TOKEN, null)).toBe(
      MOTION_FALLBACK_MS[MOTION_DURATION_BASE_TOKEN],
    );
  });

  it('still suppresses motion on the fallback path for a reduced-motion user', (): void => {
    stubComputedStyle({});
    stubReducedMotion(true);

    expect(resolveMotionDuration(MOTION_SCENE_TOKEN, element)).toBe(0);
    expect(resolveMotionDuration(MOTION_DURATION_BASE_TOKEN, null)).toBe(0);
  });

  it('keeps the TypeScript fallbacks equal to the declared token values', (): void => {
    expect(MOTION_FALLBACK_MS[MOTION_SCENE_TOKEN]).toBe(160);
    expect(MOTION_FALLBACK_MS[MOTION_DURATION_BASE_TOKEN]).toBe(240);
  });
});

describe('camera easing', (): void => {
  const element = {} as Element;

  it('parses the SPEC curve and rejects malformed or non-monotonic ones', (): void => {
    expect(parseCubicBezier('cubic-bezier(0.22, 1, 0.36, 1)')).toStrictEqual([
      0.22, 1, 0.36, 1,
    ]);
    expect(parseCubicBezier(' cubic-bezier(0,0,1,1) ')).toStrictEqual([
      0, 0, 1, 1,
    ]);
    expect(parseCubicBezier('ease-out')).toBeNull();
    expect(parseCubicBezier('cubic-bezier(0.22, 1, 0.36)')).toBeNull();
    // x outside [0,1] makes the curve non-monotonic; the solver would be lying.
    expect(parseCubicBezier('cubic-bezier(1.5, 1, 0.36, 1)')).toBeNull();
  });

  it('solves the curve at its fixed points and stays monotonic between them', (): void => {
    const ease = createCubicBezierEasing([0.22, 1, 0.36, 1]);

    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    // An ease-out curve front-loads progress: half the time, well past half way.
    expect(ease(0.5)).toBeGreaterThan(0.5);

    let previous = 0;
    for (let step = 1; step <= 20; step += 1) {
      const current = ease(step / 20);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
    expect(previous).toBe(1);
  });

  it('reads the token, and falls back to the SPEC curve when it is unreadable', (): void => {
    stubComputedStyle({ [MOTION_EASE_OUT_TOKEN]: 'cubic-bezier(0, 0, 1, 1)' });
    const linear = resolveCameraEasing(element);
    // A linear curve is the one thing the SPEC curve is not, so this proves the
    // token was read rather than the default returned.
    expect(linear(0.5)).toBeCloseTo(0.5, 5);

    stubComputedStyle({});
    expect(resolveCameraEasing(element)(0.5)).toBeGreaterThan(0.5);
    expect(resolveCameraEasing(null)(0.5)).toBeGreaterThan(0.5);
  });
});
