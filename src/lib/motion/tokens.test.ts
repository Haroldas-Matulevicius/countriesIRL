import { describe, expect, it } from 'vitest';

import {
  CAMERA_MOTION_DURATION_MS,
  DURATION_BASE,
  MOTION_TOKEN_MIRROR,
  SCENE_CROSSFADE_DURATION_MS,
} from './tokens';
import * as motionTokens from './tokens';

/**
 * Assertion 7 — the CSS <-> TS motion lockstep (D-26).
 *
 * `src/styles/theme.css` is the runtime source of truth; `./tokens.ts` mirrors
 * it for `motion/react` call sites and d3 transitions. Two layers holding the
 * same seven numbers is a drift machine unless something fails when one of them
 * moves alone, so this test reads the stylesheet as TEXT and compares.
 *
 * It runs in the `node` Vitest environment (pure constants plus a file read, no
 * DOM), which is why this shape fits this repo at all.
 *
 * **It asserts its own row count.** A gate that iterates only what it happens to
 * find proves nothing when a row disappears: this repo already shipped three
 * tests that could not fail, and one of them "covered" three motion tokens that
 * nothing read. Every count below is checked against an independent source.
 */

interface FileSystemModule {
  readFileSync: (path: URL, encoding: 'utf8') => string;
}

interface NodeProcess {
  getBuiltinModule: (name: 'fs') => FileSystemModule;
}

function readRepoFile(relativePath: string): string {
  const nodeProcess = Reflect.get(globalThis, 'process') as
    | NodeProcess
    | undefined;

  if (nodeProcess === undefined) {
    throw new Error('Expected the Vitest Node process.');
  }

  return nodeProcess
    .getBuiltinModule('fs')
    .readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

const THEME_CSS = readRepoFile('../../styles/theme.css');
const TOKENS_SOURCE = readRepoFile('./tokens.ts');
const MOTION_UTILS_SOURCE = readRepoFile('../../utils/motion.ts');
const APP_CSS = readRepoFile('../../styles/App.css');
const CONTROLS_CSS = readRepoFile('../../styles/Controls.css');
const MAP_CANVAS_CSS = readRepoFile('../../styles/MapCanvas.css');

/**
 * The number of rows the mirror is supposed to have, written independently of
 * the mirror itself. Dropping a row from `MOTION_TOKEN_MIRROR` shrinks the
 * comparison set; without this literal that shrink is silent.
 */
const EXPECTED_MIRROR_ROWS = 7;

/**
 * Exports of `./tokens.ts` that are deliberately NOT lockstep rows. A closed
 * list: anything else this module exports must appear in the mirror, so a new
 * constant cannot be added without being classified.
 */
const NON_MIRRORED_EXPORTS: readonly string[] = [
  // Derived from DURATION_BASE, not a token of its own.
  'CAMERA_MOTION_DURATION_MS',
  // The mirror table itself.
  'MOTION_TOKEN_MIRROR',
];

/**
 * Phase 2 names that the Phase 3 tokens ABSORB byte-identically. They stay
 * declared through this plan because `03-04` owns the retirement and a deletion
 * here would collide with its retired-token gate. Asserting the byte-identity
 * is what makes "absorbs" a checked claim rather than a comment: if a later edit
 * moves one of the pair, the absorption stops being true and this fails.
 */
const ABSORBED_BYTE_IDENTICAL: ReadonlyArray<readonly [string, string]> = [
  ['--motion-fast', '--motion-duration-fast'],
  ['--motion-camera', '--motion-duration-base'],
  ['--easing-camera', '--motion-ease-out'],
];

/**
 * The one reconciliation that is NOT byte-equal: `--easing-control: ease-out`
 * maps onto `--motion-ease-snappy`, which is a deliberate RETIME of control
 * micro-feedback (research assumption A8), not a rename. Asserting the values
 * DIFFER stops a later reader "simplifying" the two into one and silently
 * shipping a retime as a cleanup.
 */
const RETIMED_NOT_BYTE_EQUAL: ReadonlyArray<readonly [string, string]> = [
  ['--easing-control', '--motion-ease-snappy'],
];

function stripCssComments(css: string): string {
  return css.replaceAll(/\/\*[\S\s]*?\*\//gu, '');
}

/** The unconditioned `:root` block, by brace counting. */
function extractUnconditionedRoot(css: string): string {
  const source = stripCssComments(css);
  const start = source.indexOf(':root');
  if (start < 0) {
    throw new Error('theme.css declares no :root block.');
  }
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(open + 1, index);
      }
    }
  }
  throw new Error('Unbalanced braces in theme.css :root.');
}

function declaredMotionTokens(rootBlock: string): Map<string, string> {
  const declared = new Map<string, string>();
  rootBlock
    .split(';')
    .map((declaration): string => declaration.trim())
    .filter(
      (declaration): boolean =>
        declaration.startsWith('--motion-') ||
        declaration.startsWith('--easing-'),
    )
    .forEach((declaration): void => {
      const separator = declaration.indexOf(':');
      const name = declaration.slice(0, separator).trim();
      const value = declaration
        .slice(separator + 1)
        .replaceAll(/\s+/gu, ' ')
        .trim();
      if (declared.has(name)) {
        throw new Error(`"${name}" is declared twice in theme.css :root.`);
      }
      declared.set(name, value);
    });
  return declared;
}

/** `cubic-bezier(0.22, 1, 0.36, 1)` -> `[0.22, 1, 0.36, 1]`. */
function parseCubicBezierValue(value: string): number[] | null {
  const match = /^cubic-bezier\((?<points>[^)]*)\)$/u.exec(value);
  if (match?.groups === undefined) {
    return null;
  }
  const points = match.groups.points
    .split(',')
    .map((part): number => Number.parseFloat(part.trim()));
  return points.length === 4 && points.every((n): boolean => Number.isFinite(n))
    ? points
    : null;
}

/** `150ms` -> `150`; `0.15s` -> `150`. */
function parseDurationValue(value: string): number | null {
  const match = /^(?<amount>[\d.]+)(?<unit>ms|s)$/u.exec(value);
  if (match?.groups === undefined) {
    return null;
  }
  const amount = Number.parseFloat(match.groups.amount);
  if (!Number.isFinite(amount)) {
    return null;
  }
  return match.groups.unit === 's' ? amount * 1000 : amount;
}

const ROOT_BLOCK = extractUnconditionedRoot(THEME_CSS);
const DECLARED = declaredMotionTokens(ROOT_BLOCK);

describe('motion token lockstep (theme.css :root <-> lib/motion/tokens.ts)', () => {
  it('mirrors every token value across both layers after normalisation', () => {
    const compared: string[] = [];

    Object.entries(MOTION_TOKEN_MIRROR).forEach(([token, entry]): void => {
      const declaredValue = DECLARED.get(token);
      expect(
        declaredValue,
        `"${token}" is exported by tokens.ts but not declared in theme.css :root.`,
      ).toBeDefined();

      if (entry.kind === 'easing') {
        expect(
          parseCubicBezierValue(declaredValue as string),
          `"${token}" in theme.css is not a cubic-bezier(): "${declaredValue}"`,
        ).toEqual([...entry.controlPoints]);
      } else {
        expect(
          parseDurationValue(declaredValue as string),
          `"${token}" in theme.css disagrees with ${entry.constant}.`,
        ).toBe(entry.milliseconds);
      }

      compared.push(token);
    });

    // Row count, asserted three independent ways so a dropped token cannot
    // shrink the comparison in silence.
    expect(compared).toHaveLength(EXPECTED_MIRROR_ROWS);
    expect(Object.keys(MOTION_TOKEN_MIRROR)).toHaveLength(
      EXPECTED_MIRROR_ROWS,
    );
    expect(new Set(compared).size).toBe(EXPECTED_MIRROR_ROWS);
  });

  it('keeps the declared token set and the accounted-for token set two-way equal', () => {
    const declaredNames = [...DECLARED.keys()].sort();
    const accountedFor = [
      ...Object.keys(MOTION_TOKEN_MIRROR),
      ...ABSORBED_BYTE_IDENTICAL.map(([legacy]): string => legacy),
      ...RETIMED_NOT_BYTE_EQUAL.map(([legacy]): string => legacy),
    ].sort();

    // Two-way, not a subset in either direction. A `--motion-*` / `--easing-*`
    // token declared in CSS with no row here is exactly the dead token this gate
    // exists to catch; a row with no declaration is a constant pretending to be
    // a token.
    expect(declaredNames).toEqual(accountedFor);
  });

  it('holds the three absorbed Phase 2 names byte-identical to their Phase 3 tokens', () => {
    expect(ABSORBED_BYTE_IDENTICAL).toHaveLength(3);

    ABSORBED_BYTE_IDENTICAL.forEach(([legacy, absorbing]): void => {
      expect(
        DECLARED.get(legacy),
        `"${legacy}" is documented as byte-identical to "${absorbing}".`,
      ).toBe(DECLARED.get(absorbing));
    });
  });

  it('keeps the one deliberate retime visibly different from the name it replaces', () => {
    RETIMED_NOT_BYTE_EQUAL.forEach(([legacy, retimedOnto]): void => {
      expect(
        DECLARED.get(legacy),
        `"${legacy}" -> "${retimedOnto}" is a deliberate retime (A8), not a ` +
          'rename. Equal values would mean the retime was quietly undone.',
      ).not.toBe(DECLARED.get(retimedOnto));
    });

    expect(THEME_CSS).toMatch(/deliberate RETIME of control micro-feedback/u);
  });

  it('classifies every export of tokens.ts as mirrored or explicitly derived', () => {
    const exportedConstants = Object.keys(motionTokens).filter(
      (name): boolean => !NON_MIRRORED_EXPORTS.includes(name),
    );
    const mirroredConstants = Object.values(MOTION_TOKEN_MIRROR).map(
      (entry): string => entry.constant,
    );

    expect([...exportedConstants].sort()).toEqual(
      [...mirroredConstants].sort(),
    );
    expect(mirroredConstants).toHaveLength(EXPECTED_MIRROR_ROWS);
  });

  it('keeps the scene crossfade deliberately local at 160ms', () => {
    expect(SCENE_CROSSFADE_DURATION_MS).toBe(160);
    expect(DECLARED.get('--motion-scene')).toBe('160ms');

    // The value is only half of it: without the recorded reason, a later reader
    // sees a 160 beside a 150 token and "tidies" it. Themely's do-not-snap idiom.
    expect(TOKENS_SOURCE).toMatch(/Deliberately local at 160ms/u);
  });

  it('derives CAMERA_MOTION_DURATION_MS from DURATION_BASE instead of restating 240', () => {
    expect(CAMERA_MOTION_DURATION_MS).toBe(DURATION_BASE * 1000);
    expect(TOKENS_SOURCE).not.toMatch(
      /CAMERA_MOTION_DURATION_MS\s*(?::[^=]*)?=\s*240/u,
    );
  });

  /**
   * Assertion 6's TS half. Its CSS half — a real `var()` consumer for every new
   * `--motion-*` token — lands in `03-04` with the stylesheet rewrite. Until
   * then `--motion-ease-snappy`, `--motion-ease-in`, and `--motion-duration-slow`
   * are consumed only by this mirror, which is a knowingly weaker state than
   * Phase 2's and is recorded rather than hidden.
   */
  it('gives every declared --motion-* token a consumer', () => {
    const styleSheets = [THEME_CSS, APP_CSS, CONTROLS_CSS, MAP_CANVAS_CSS].join(
      '\n',
    );

    expect(DECLARED.size).toBeGreaterThan(0);

    [...DECLARED.keys()].forEach((token): void => {
      const consumed =
        styleSheets.includes(`var(${token})`) ||
        TOKENS_SOURCE.includes(token) ||
        MOTION_UTILS_SOURCE.includes(token);
      expect(
        consumed,
        `"${token}" is declared and reduced-motion-gated but nothing reads it.`,
      ).toBe(true);
    });
  });
});
