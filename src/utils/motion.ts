/**
 * One source of truth for animation durations: the UI-SPEC motion tokens in
 * `theme.css`.
 *
 * Before this module, `--motion-scene: 160ms` and `--motion-camera: 240ms` were
 * declared, gated by `phase2CssContract.test.ts`, and referenced by nothing;
 * the real durations were the literals `CROSSFADE_DURATION_MS = 160` and
 * `CAMERA_MOTION_DURATION_MS = 240`. The contract test asserted both tokens fall
 * to `0ms` under `prefers-reduced-motion` and read as proof that scene and
 * camera motion are suppressed. It proved nothing about either: the crossfade
 * honoured the preference through a separate JS branch, and the camera
 * transition did not honour it at all, despite UI-SPEC 17/18 requiring Locate
 * and Reset View to be immediate under reduced motion.
 *
 * Reading the token makes the CSS the source of truth, so the reduced-motion
 * block genuinely reaches both transitions and the contract assertion becomes
 * load-bearing.
 */

import {
  CAMERA_MOTION_DURATION_MS,
  EASE_OUT,
  SCENE_CROSSFADE_DURATION_MS,
} from '../lib/motion/tokens';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const MOTION_SCENE_TOKEN = '--motion-scene';
export const MOTION_CAMERA_TOKEN = '--motion-camera';

/**
 * Used only when the token cannot be read at all - a detached element, or a
 * test environment with no stylesheet. Never used to override a token that
 * resolved, so `0ms` under reduced motion always wins.
 */
export const MOTION_FALLBACK_MS: Readonly<Record<string, number>> = {
  [MOTION_SCENE_TOKEN]: SCENE_CROSSFADE_DURATION_MS,
  [MOTION_CAMERA_TOKEN]: CAMERA_MOTION_DURATION_MS,
};

/** `160ms`, `0.16s`, and `0` are all valid CSS <time> spellings of a duration. */
export function parseMotionDuration(value: string): number | null {
  const match = /^\s*(?<amount>[+-]?(?:\d+\.?\d*|\.\d+))(?<unit>ms|s)?\s*$/u.exec(
    value,
  );
  if (match?.groups === undefined) {
    return null;
  }

  const amount = Number.parseFloat(match.groups.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  // A unitless value is only a valid <time> when it is zero.
  if (match.groups.unit === undefined) {
    return amount === 0 ? 0 : null;
  }

  return match.groups.unit === 's' ? amount * 1000 : amount;
}

export const EASING_CAMERA_TOKEN = '--easing-camera';

/**
 * UI-SPEC 4.4: the camera and scene-completion curve.
 *
 * Read from the Phase 3 mirror rather than restated. `--easing-camera` is
 * byte-identical to `--motion-ease-out` (D-26), and keeping a second literal of
 * the same four control points here is exactly the drift the lockstep test
 * exists to prevent.
 */
const FALLBACK_EASING: readonly [number, number, number, number] = EASE_OUT;

function bezierAxis(
  progress: number,
  first: number,
  second: number,
): number {
  const inverse = 1 - progress;
  return (
    3 * inverse * inverse * progress * first +
    3 * inverse * progress * progress * second +
    progress * progress * progress
  );
}

const BEZIER_SOLVE_ITERATIONS = 8;
const BEZIER_EPSILON = 1e-6;

/**
 * d3 transitions take an easing *function*, so a `cubic-bezier()` token has to
 * be solved rather than handed over. Newton-Raphson on x, then evaluate y - the
 * same approach browsers use for a CSS `transition-timing-function`.
 */
export function createCubicBezierEasing(
  [x1, y1, x2, y2]: readonly [number, number, number, number],
): (time: number) => number {
  return (time: number): number => {
    if (time <= 0) {
      return 0;
    }
    if (time >= 1) {
      return 1;
    }

    let guess = time;
    for (let step = 0; step < BEZIER_SOLVE_ITERATIONS; step += 1) {
      const error = bezierAxis(guess, x1, x2) - time;
      if (Math.abs(error) < BEZIER_EPSILON) {
        break;
      }
      const inverse = 1 - guess;
      const slope =
        3 * inverse * inverse * x1 +
        6 * inverse * guess * (x2 - x1) +
        3 * guess * guess * (1 - x2);
      if (Math.abs(slope) < BEZIER_EPSILON) {
        break;
      }
      guess -= error / slope;
    }

    return bezierAxis(guess, y1, y2);
  };
}

export function parseCubicBezier(
  value: string,
): [number, number, number, number] | null {
  const match =
    /^\s*cubic-bezier\(\s*(?<values>[^)]*)\)\s*$/u.exec(value);
  if (match?.groups === undefined) {
    return null;
  }

  const numbers = match.groups.values
    .split(',')
    .map((part): number => Number.parseFloat(part.trim()));
  if (numbers.length !== 4 || numbers.some((n): boolean => !Number.isFinite(n))) {
    return null;
  }

  // The x control points are clamped to [0,1] by the CSS grammar; an out-of-
  // range x makes the curve non-monotonic and the solver meaningless.
  if (numbers[0] < 0 || numbers[0] > 1 || numbers[2] < 0 || numbers[2] > 1) {
    return null;
  }

  return [numbers[0], numbers[1], numbers[2], numbers[3]];
}

/**
 * Resolves the SPEC'd camera/scene curve from its token. Without this, both d3
 * transitions ran on d3's default `easeCubic` (cubic in-out) while
 * `--easing-camera` sat unread, so the declared curve was never the curve.
 */
export function resolveCameraEasing(
  element: Element | null,
): (time: number) => number {
  if (element !== null && typeof globalThis.getComputedStyle === 'function') {
    const declared = parseCubicBezier(
      globalThis.getComputedStyle(element).getPropertyValue(EASING_CAMERA_TOKEN),
    );
    if (declared !== null) {
      return createCubicBezierEasing(declared);
    }
  }

  return createCubicBezierEasing(FALLBACK_EASING);
}

export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
}

/**
 * Resolves a motion token against a rendered element. Falls back to the SPEC
 * default only when the token is unreadable, and applies the reduced-motion
 * preference in that fallback path so an unstyled environment still cannot
 * animate for a user who asked it not to.
 */
export function resolveMotionDuration(
  token: string,
  element: Element | null,
): number {
  const fallback = MOTION_FALLBACK_MS[token] ?? 0;

  if (element !== null && typeof globalThis.getComputedStyle === 'function') {
    const declared = parseMotionDuration(
      globalThis.getComputedStyle(element).getPropertyValue(token),
    );
    if (declared !== null) {
      return declared;
    }
  }

  return prefersReducedMotion() ? 0 : fallback;
}
