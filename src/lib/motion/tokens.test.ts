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

interface DirectoryEntry {
  readonly name: string;
  isDirectory: () => boolean;
}

interface FileSystemModule {
  readFileSync: (path: URL, encoding: 'utf8') => string;
  readdirSync: (
    path: URL,
    options: { readonly withFileTypes: true },
  ) => DirectoryEntry[];
}

interface NodeProcess {
  getBuiltinModule: (name: 'fs') => FileSystemModule;
}

function fileSystem(): FileSystemModule {
  const nodeProcess = Reflect.get(globalThis, 'process') as
    | NodeProcess
    | undefined;

  if (nodeProcess === undefined) {
    throw new Error('Expected the Vitest Node process.');
  }

  return nodeProcess.getBuiltinModule('fs');
}

function readRepoFile(relativePath: string): string {
  return fileSystem().readFileSync(
    new URL(relativePath, import.meta.url),
    'utf8',
  );
}

/**
 * Every stylesheet under `src/styles`, discovered by walking the directory.
 *
 * This list used to be four hard-coded filenames, which is the same defect
 * `uiContract.test.ts` records against the retired Phase 2 contract test: the
 * consumer check below would have gone on passing while a token's only `var()`
 * lived in a file nobody added to the list. `03-10` split one of those four
 * into eight, so the list would have gone stale in the same commit.
 */
function collectStyleSheets(directory: URL): string[] {
  return fileSystem()
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): string[] => {
      if (entry.isDirectory()) {
        return collectStyleSheets(new URL(`${entry.name}/`, directory));
      }
      return entry.name.endsWith('.css')
        ? [
            fileSystem().readFileSync(
              new URL(entry.name, directory),
              'utf8',
            ),
          ]
        : [];
    });
}

const THEME_CSS = readRepoFile('../../styles/theme.css');
const TOKENS_SOURCE = readRepoFile('./tokens.ts');
const MOTION_UTILS_SOURCE = readRepoFile('../../utils/motion.ts');
const STYLE_SHEETS = collectStyleSheets(
  new URL('../../styles/', import.meta.url),
);

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
 * The Phase 2 names are DELETED as of `03-04`, so the absorption can no longer
 * be asserted as an equality between two live declarations. It is asserted
 * against the absorbed VALUE instead: each Phase 3 token must still hold the
 * exact bytes its Phase 2 predecessor held, so "absorbs, byte-identical" stays
 * a checked claim after the predecessor's name is gone.
 *
 * Dropping the claim with the name would have been the quiet failure: a rename
 * and a retime look identical in a diff, and the retirement commit is precisely
 * where a retime could ride along unnoticed.
 */
const ABSORBED_BYTE_IDENTICAL: ReadonlyArray<readonly [string, string, string]> =
  [
    ['--motion-duration-fast', '150ms', 'the Phase 2 fast duration'],
    ['--motion-duration-base', '240ms', 'the Phase 2 camera duration'],
    [
      '--motion-ease-out',
      'cubic-bezier(0.22, 1, 0.36, 1)',
      'the Phase 2 camera easing',
    ],
  ];

/**
 * The one reconciliation that is NOT byte-equal: the Phase 2 control easing was
 * the keyword `ease-out`, and `--motion-ease-snappy` is a deliberate RETIME of
 * control micro-feedback onto Themely's curve (research assumption A8), not a
 * rename. Asserting the value is NOT that keyword stops a later reader
 * "simplifying" the token back and shipping a timing change as a cleanup.
 */
const RETIMED_NOT_BYTE_EQUAL: ReadonlyArray<readonly [string, string]> = [
  ['--motion-ease-snappy', 'ease-out'],
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
    const accountedFor = [...Object.keys(MOTION_TOKEN_MIRROR)].sort();

    // Two-way, not a subset in either direction. A `--motion-*` / `--easing-*`
    // token declared in CSS with no row here is exactly the dead token this gate
    // exists to catch; a row with no declaration is a constant pretending to be
    // a token.
    expect(declaredNames).toEqual(accountedFor);
  });

  it('holds the three absorbed Phase 2 values byte-identical after the rename', () => {
    expect(ABSORBED_BYTE_IDENTICAL).toHaveLength(3);

    ABSORBED_BYTE_IDENTICAL.forEach(([absorbing, value, absorbed]): void => {
      expect(
        DECLARED.get(absorbing),
        `"${absorbing}" absorbed ${absorbed} byte-identically. A different ` +
          'value here means the retirement commit shipped a retime.',
      ).toBe(value);
    });
  });

  it('keeps the one deliberate retime visibly different from the value it replaces', () => {
    RETIMED_NOT_BYTE_EQUAL.forEach(([retimedOnto, previousValue]): void => {
      expect(
        DECLARED.get(retimedOnto),
        `"${retimedOnto}" is a deliberate retime (A8), not a rename of the ` +
          'Phase 2 control easing. Restoring the old keyword would undo it.',
      ).not.toBe(previousValue);
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
   * Assertion 6's TS half, at PHASE 2 STRENGTH again.
   *
   * `03-02` widened this to accept a named read in the mirror itself, which for
   * `--motion-ease-snappy`, `--motion-ease-in`, and `--motion-duration-slow`
   * meant the only "consumer" was the file being compared - a token read by
   * nothing while a gate read as proof, which is the exact shape this repo has
   * shipped before. `03-04` gave all three a real rendering consumer and the
   * mirror is removed from the consumer set here: a CSS `var()` or a named read
   * in `utils/motion.ts`, nothing else.
   */
  it('gives every declared --motion-* token a consumer', () => {
    const styleSheets = STYLE_SHEETS.join('\n');

    // A walk that found nothing would make every token below vacuously
    // unconsumed, which fails loudly - but a walk that found only theme.css
    // would fail QUIETLY, on tokens whose consumer moved. Assert the shape.
    expect(STYLE_SHEETS.length).toBeGreaterThan(4);
    expect(DECLARED.size).toBeGreaterThan(0);

    [...DECLARED.keys()].forEach((token): void => {
      const consumed =
        styleSheets.includes(`var(${token})`) ||
        MOTION_UTILS_SOURCE.includes(token);
      expect(
        consumed,
        `"${token}" is declared and reduced-motion-gated but nothing renders ` +
          'with it. The TS mirror does not count - it is the layer under test.',
      ).toBe(true);
    });
  });
});
