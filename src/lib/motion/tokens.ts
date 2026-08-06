/**
 * Phase 3 (D-26) — the TS mirror of the `--motion-*` CSS custom properties.
 *
 * CSS is the runtime source of truth; this module exists so `motion/react` call
 * sites and d3 transitions can read the same numbers without a second copy of
 * them. `src/lib/motion/tokens.test.ts` pins the two layers in lockstep: it
 * reads `src/styles/theme.css` as text and fails when either layer moves alone.
 *
 * Durations are SECONDS-typed numbers (the `motion/react` convention); the CSS
 * side spells them in ms. Easings are cubic-bezier control-point tuples.
 *
 * Shape mirrored from `/Users/matul/claudeprojects/themely/src/lib/motion/tokens.ts`
 * (sibling repo, read-only, read in full 2026-08-06).
 */

/** Default entrance/settle curve — mirrors `--motion-ease-out`. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Hover/press micro-feedback curve — mirrors `--motion-ease-snappy`. */
export const EASE_SNAPPY = [0.2, 0.8, 0.2, 1] as const;

/** Exit curve (bottom sheet down) — mirrors `--motion-ease-in`. */
export const EASE_IN = [0.4, 0, 1, 1] as const;

/** Micro-motion — mirrors `--motion-duration-fast`. */
export const DURATION_FAST = 0.15;

/** Structural motion (panel open/close) — mirrors `--motion-duration-base`. */
export const DURATION_BASE = 0.24;

/** Deliberate full-surface fade (theme crossfade) — mirrors `--motion-duration-slow`. */
export const DURATION_SLOW = 0.36;

/**
 * The scene crossfade, mirroring `--motion-scene`.
 *
 * **Deliberately local at 160ms — NOT retimed onto `DURATION_FAST` (150ms).**
 * This is Themely's "do-not-snap" idiom: a kept duration literal that is close
 * to a token but is not that token. Retiming the scene crossfade to 150ms would
 * be a visible change to the map nobody asked for, dressed up as a rename.
 */
export const SCENE_CROSSFADE_DURATION_MS = 160;

/**
 * Camera pan/zoom duration, in ms.
 *
 * DERIVED from `DURATION_BASE` rather than restating `240`. The camera motion
 * and the structural panel motion are the same beat by design; writing the
 * number twice is how they drift apart, and a later reader cannot tell whether
 * a `240` beside a `0.24` is a mirror or a coincidence.
 */
export const CAMERA_MOTION_DURATION_MS = DURATION_BASE * 1000;

/** A CSS `cubic-bezier()` value, as its four control points. */
export type EasingControlPoints = readonly [number, number, number, number];

export type MotionMirrorEntry =
  | {
      readonly kind: 'easing';
      readonly constant: string;
      readonly controlPoints: EasingControlPoints;
    }
  | {
      readonly kind: 'duration';
      readonly constant: string;
      readonly milliseconds: number;
    };

/**
 * The lockstep table: CSS custom property -> the TS constant that mirrors it.
 *
 * This is the row set `tokens.test.ts` compares, and it asserts its own count
 * against the module's own exports — so a constant added here without a CSS
 * declaration (or vice versa) fails rather than silently shrinking the
 * comparison. Three motion tokens were once declared, reduced-motion-gated, and
 * read by nothing, and the gate that "covered" them iterated only what it found.
 *
 * `CAMERA_MOTION_DURATION_MS` is deliberately absent: it is derived from
 * `DURATION_BASE`, not a token of its own. The test's classification check
 * carries it in a closed derived-exports list so it cannot be forgotten either.
 */
export const MOTION_TOKEN_MIRROR: Readonly<Record<string, MotionMirrorEntry>> = {
  '--motion-ease-out': {
    kind: 'easing',
    constant: 'EASE_OUT',
    controlPoints: EASE_OUT,
  },
  '--motion-ease-snappy': {
    kind: 'easing',
    constant: 'EASE_SNAPPY',
    controlPoints: EASE_SNAPPY,
  },
  '--motion-ease-in': {
    kind: 'easing',
    constant: 'EASE_IN',
    controlPoints: EASE_IN,
  },
  '--motion-duration-fast': {
    kind: 'duration',
    constant: 'DURATION_FAST',
    milliseconds: DURATION_FAST * 1000,
  },
  '--motion-duration-base': {
    kind: 'duration',
    constant: 'DURATION_BASE',
    milliseconds: DURATION_BASE * 1000,
  },
  '--motion-duration-slow': {
    kind: 'duration',
    constant: 'DURATION_SLOW',
    milliseconds: DURATION_SLOW * 1000,
  },
  '--motion-scene': {
    kind: 'duration',
    constant: 'SCENE_CROSSFADE_DURATION_MS',
    milliseconds: SCENE_CROSSFADE_DURATION_MS,
  },
};
