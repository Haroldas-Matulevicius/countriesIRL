import { describe, expect, it } from 'vitest';

/**
 * The exact-value half of the Phase 3 token contract (`Design.md` sections 2
 * and 3, `03-UI-SPEC.md` section "Design Tokens").
 *
 * `uiContract.test.ts` asserts RELATIONSHIPS - parity, firewall membership,
 * contrast, consumers. This file asserts the VALUES those relationships are
 * computed from, because a palette that is internally consistent and wrong is
 * exactly as consistent as one that is right. The values below are vendored
 * verbatim from Themely and no value here may be adjusted; a surface that needs
 * a different colour gets its own token instead (`--accent-fill`,
 * `--destructive`).
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

function readStyleSheet(relativePath: string): string {
  return fileSystem().readFileSync(
    new URL(relativePath, import.meta.url),
    'utf8',
  );
}

/**
 * Every stylesheet under `src/styles` EXCEPT `theme.css`, keyed by its path.
 *
 * Walked, never listed. The colour-literal sweep below used to name two files;
 * `03-10` split one of them into eight, and a two-name list would have gone on
 * passing while six new files went unscanned - which is the same defect the
 * retired Phase 2 contract test shipped.
 */
function collectStyleSheets(
  directory: URL,
  prefix = '',
): Array<[string, string]> {
  return fileSystem()
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): Array<[string, string]> => {
      if (entry.isDirectory()) {
        return collectStyleSheets(
          new URL(`${entry.name}/`, directory),
          `${prefix}${entry.name}/`,
        );
      }
      if (!entry.name.endsWith('.css')) {
        return [];
      }
      return [
        [
          `${prefix}${entry.name}`,
          fileSystem().readFileSync(new URL(entry.name, directory), 'utf8'),
        ],
      ];
    })
    .sort(([left], [right]): number => left.localeCompare(right));
}

const COMPONENT_STYLE_SHEETS = collectStyleSheets(
  new URL('./', import.meta.url),
).filter(([name]): boolean => name !== 'theme.css');

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\S\s]*?\*\//gu, '');
}

/**
 * The block for `selector` at the TOP LEVEL only, found by brace counting.
 * Deliberately not a regular expression: the palette blocks are the ones a
 * preference at-rule also declares, and a flat match would happily return the
 * override instead of the base declaration.
 */
function topLevelBlock(css: string, selector: string): string {
  const source = stripComments(css);
  let index = 0;
  let prelude = '';

  while (index < source.length) {
    const character = source[index];

    if (character === '{') {
      const name = prelude.trim().replaceAll(/\s+/gu, ' ');
      prelude = '';
      index += 1;

      const start = index;
      let depth = 1;
      while (index < source.length && depth > 0) {
        if (source[index] === '{') {
          depth += 1;
        } else if (source[index] === '}') {
          depth -= 1;
        }
        index += 1;
      }

      if (name === selector) {
        return source.slice(start, index - 1);
      }
      continue;
    }

    if (character === '}') {
      prelude = '';
      index += 1;
      continue;
    }

    prelude += character;
    index += 1;
  }

  throw new Error(`theme.css declares no top-level "${selector}" block.`);
}

function tokensIn(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  block
    .split(';')
    .map((declaration): string => declaration.trim())
    .filter((declaration): boolean => declaration.startsWith('--'))
    .forEach((declaration): void => {
      const separator = declaration.indexOf(':');
      tokens.set(
        declaration.slice(0, separator).trim(),
        declaration
          .slice(separator + 1)
          .replaceAll(/\s+/gu, ' ')
          .trim(),
      );
    });
  return tokens;
}

const THEME_CSS = readStyleSheet('./theme.css');
const ROOT = tokensIn(topLevelBlock(THEME_CSS, ':root'));
const DARK = tokensIn(topLevelBlock(THEME_CSS, '.dark'));

/** Verbatim from `themely/src/app/globals.css` :root. No value may be adjusted. */
const THEMELY_LIGHT: ReadonlyArray<readonly [string, string]> = [
  ['--themely-platinum', '#ffffff'],
  ['--themely-porcelain', '#f8fafd'],
  ['--themely-powder', '#e5edf5'],
  ['--themely-apple-blue', '#0071e3'],
  ['--themely-apple-blue-hover', '#005db8'],
  ['--themely-midnight-ink', '#061b31'],
  ['--themely-slate-blue', '#50617a'],
  ['--themely-nav-ink', '#0d0d0d'],
  ['--themely-ghost-gray', '#64748d'],
  ['--themely-stone-gray', '#d8d6df'],
  ['--themely-red', '#ff5252'],
  ['--themely-on-accent', '#ffffff'],
  ['--themely-media-backdrop', '#000000'],
  ['--themely-on-media', '#ffffff'],
];

/** Verbatim from `themely/src/app/globals.css` .dark ("Lights Out"). */
const THEMELY_DARK: ReadonlyArray<readonly [string, string]> = [
  ['--themely-platinum', '#000000'],
  ['--themely-porcelain', '#16181c'],
  ['--themely-powder', '#1d1f23'],
  ['--themely-apple-blue', '#2997ff'],
  ['--themely-apple-blue-hover', '#1a7fd4'],
  ['--themely-midnight-ink', '#e7e9ea'],
  ['--themely-slate-blue', '#8b9099'],
  ['--themely-nav-ink', '#ffffff'],
  ['--themely-ghost-gray', '#71767b'],
  ['--themely-stone-gray', '#2f3336'],
  ['--themely-red', '#ff6b6b'],
];

/** Identical in both modes by contract - see `Design.md` section 2. */
const FIXED_TRIO = [
  '--themely-on-accent',
  '--themely-media-backdrop',
  '--themely-on-media',
] as const;

const MODE_INVARIANT: ReadonlyArray<readonly [string, string]> = [
  ['--map-surface', '#ffffff'],
  ['--map-fill-default', '#ffffff'],
  ['--map-border-default', '#000000'],
  ['--map-border-hover', '#000000'],
  ['--map-border-selected', '#000000'],
  ['--map-border-focus', '#0071e3'],
  ['--map-fixed-text', '#111827'],
  ['--map-skeleton-fill', '#e5e7eb'],
  ['--map-skeleton-stroke', '#d1d5db'],
  ['--map-frame-edge', 'rgba(6, 27, 49, 0.55)'],
  ['--map-frame-scrim', 'rgba(6, 27, 49, 0.06)'],
  ['--swatch-border', '#9ca3af'],
  ['--tooltip-surface', '#061b31'],
  ['--tooltip-text', '#ffffff'],
  ['--tooltip-border', 'rgba(255, 255, 255, 0.14)'],
  ['--tooltip-shadow', '0 4px 12px -2px rgba(6, 27, 49, 0.1)'],
  ['--accent-fill', '#0071e3'],
  ['--accent-fill-hover', '#005db8'],
];

/** Each role's size, line height, weight, and tracking - `Design.md` section 4. */
const TYPE_ROLES: ReadonlyArray<
  readonly [string, string, string, string, string]
> = [
  ['--text-display', '40px', '1.1', '700', '-0.025em'],
  ['--text-h1', '30px', '1.2', '600', '-0.02em'],
  ['--text-h2', '24px', '1.25', '600', '-0.015em'],
  ['--text-h3', '18px', '1.4', '600', '-0.01em'],
  ['--text-subheading', '16px', '1.4', '500', '0'],
  ['--text-body', '15px', '1.55', '400', '0'],
  ['--text-body-sm', '14px', '1.5', '400', '0'],
  ['--text-caption', '12px', '1.4', '400', '0'],
  ['--text-eyebrow', '11px', '1.3', '500', '0.08em'],
  ['--text-stat', '30px', '1', '600', '-0.02em'],
];

const EXACT_SCALE: ReadonlyArray<readonly [string, string]> = [
  ['--space-xs', '4px'],
  ['--space-sm', '8px'],
  ['--space-md', '16px'],
  ['--space-lg', '24px'],
  ['--space-xl', '32px'],
  ['--space-2xl', '48px'],
  ['--space-3xl', '64px'],
  ['--target-compact', '44px'],
  ['--radius-control', '8px'],
  ['--radius-row', '10px'],
  ['--radius-card', '14px'],
  ['--radius-modal', '18px'],
  ['--radius-pill', '9999px'],
  ['--focus-width', '2px'],
  ['--focus-offset', '2px'],
  ['--border-width', '1px'],
  ['--popover-shadow', '0 4px 12px -2px rgba(6, 27, 49, 0.1)'],
  ['--dialog-shadow', '0 10px 40px -10px rgba(6, 27, 49, 0.2)'],
];

const COMPONENT_COLOR_LITERAL = /#[0-9A-Fa-f]{3,8}\b|rgba?\(/u;

/**
 * The namespace allowlist (D-03). Every custom property `theme.css` declares
 * must match one of these, so a retired un-namespaced name - `--accent`,
 * `--surface-card`, `--text-primary` - cannot quietly reappear beside the
 * tokens that replaced it. Prefixes are for families; the accent fill is listed
 * by its exact two names so that `--accent-` cannot become a family again.
 */
const TOKEN_NAMESPACE_PREFIXES = [
  '--space-',
  '--radius-',
  '--text-',
  '--motion-',
  '--themely-',
  '--map-',
  '--tooltip-',
] as const;

const TOKEN_EXACT_NAMES = [
  '--target-compact',
  '--focus-width',
  '--focus-offset',
  '--border-width',
  '--font-sans',
  '--hairline',
  '--hairline-color',
  '--popover-shadow',
  '--dialog-shadow',
  '--swatch-border',
  '--accent-fill',
  '--accent-fill-hover',
  '--destructive',
  /*
   * 03-07: the committed destructive step (`Delete Map`) is a filled surface,
   * and it follows the `--accent-fill` precedent for the same measured reason:
   * white on `--themely-red` is 3.19:1 light / 2.78:1 dark, below AA, while
   * white on the fixed `#b42318` is 6.57:1 in both modes.
   */
  '--destructive-fill',
  '--destructive-tint',
  '--overlay',
] as const;

describe('Phase 3 palette values (D-03, D-04)', (): void => {
  it('declares the Themely cool palette verbatim in the light root', (): void => {
    THEMELY_LIGHT.forEach(([token, value]): void => {
      expect(ROOT.get(token), `${token} in :root`).toBe(value);
    });
    expect(THEMELY_LIGHT).toHaveLength(14);
  });

  it('declares the Lights Out palette verbatim under the dark class', (): void => {
    THEMELY_DARK.forEach(([token, value]): void => {
      expect(DARK.get(token), `${token} in .dark`).toBe(value);
    });
    expect(THEMELY_DARK).toHaveLength(11);
  });

  /**
   * Three tokens carry the same value in both modes ON PURPOSE: text on an
   * accent fill, the scrim, and text on dark media. Restating them in `.dark`
   * rather than letting them inherit is what lets the parity gate read their
   * presence as the claim, and what makes "don't flip `--themely-on-accent`"
   * a checked rule rather than a Don't in a document.
   */
  it('keeps the fixed trio identical in both modes', (): void => {
    FIXED_TRIO.forEach((token): void => {
      expect(ROOT.get(token), `${token} must be declared in :root`).toBeDefined();
      expect(
        DARK.get(token),
        `${token} is contractually identical in both modes, so it is restated ` +
          'in .dark rather than inherited.',
      ).toBe(ROOT.get(token));
    });
  });

  it('declares the mode-invariant export set once, in the light root only', (): void => {
    MODE_INVARIANT.forEach(([token, value]): void => {
      expect(ROOT.get(token), `${token} in :root`).toBe(value);
      expect(
        DARK.has(token),
        `${token} is mode-invariant and must not appear in .dark.`,
      ).toBe(false);

      const declarations = [
        ...stripComments(THEME_CSS).matchAll(/(--[\w-]+)\s*:/gu),
      ].filter((match): boolean => match[1] === token);
      expect(declarations, `${token} is declared more than once`).toHaveLength(1);
    });
  });

  /**
   * The Export label is the whole reason this pair exists. White on `#0071e3`
   * is 4.70:1; the flipping accent would give 3.02:1 in dark. Pointing these at
   * `var(--themely-apple-blue)` looks tidier and silently reintroduces the
   * failing label.
   */
  it('keeps the accent fill off the flipping accent token', (): void => {
    expect(ROOT.get('--accent-fill')).toBe('#0071e3');
    expect(ROOT.get('--accent-fill-hover')).toBe('#005db8');
    expect(ROOT.get('--accent-fill')).not.toContain('var(');
    expect(ROOT.get('--accent-fill-hover')).not.toContain('var(');
  });

  it('declares the ten type roles with all four parts of each bundle', (): void => {
    TYPE_ROLES.forEach(([role, size, lineHeight, weight, tracking]): void => {
      expect(ROOT.get(role), `${role} size`).toBe(size);
      expect(ROOT.get(`${role}-line-height`), `${role} line height`).toBe(
        lineHeight,
      );
      expect(ROOT.get(`${role}-weight`), `${role} weight`).toBe(weight);
      expect(ROOT.get(`${role}-tracking`), `${role} tracking`).toBe(tracking);
    });
    expect(TYPE_ROLES).toHaveLength(10);
  });

  it('declares the exact spacing, radius, focus, and elevation scale', (): void => {
    EXACT_SCALE.forEach(([token, value]): void => {
      expect(ROOT.get(token), token).toBe(value);
    });
  });

  /**
   * The dark popover shadow is NOT an export token, so unlike the fixed set it
   * is expected to be redefined here - a 10 % ink shadow is invisible against a
   * near-black wall.
   */
  it('swaps the popover shadow for the dark wall', (): void => {
    expect(DARK.get('--popover-shadow')).toBe(
      '0 4px 12px -2px rgba(0, 0, 0, 0.45)',
    );
  });

  /**
   * Measured, not assumed: `#ff5252` on Porcelain is 3.05:1 and white on a
   * `#ff5252` fill is 3.19:1. The Themely value stays verbatim and the
   * destructive SURFACE consumes its own token, which is the same move the
   * owner already made for the Export fill. In dark, `#ff6b6b` clears AA on
   * every chrome surface, so the token derives from the palette there.
   */
  it('keeps destructive off the Themely red where the red misses AA', (): void => {
    expect(ROOT.get('--destructive')).toBe('#b42318');
    expect(DARK.get('--destructive')).toBe('var(--themely-red)');
  });

  /**
   * Delete-don't-alias only holds if the deleted NAME cannot come back. Every
   * custom property this file declares - in any block, conditioned or not -
   * must match the namespace allowlist, so re-adding `--accent: #0f766e` beside
   * the tokens that replaced it fails here rather than resolving quietly.
   */
  it('declares every custom property inside the namespace allowlist', (): void => {
    const declared = [
      ...new Set(
        [...stripComments(THEME_CSS).matchAll(/(--[\w-]+)\s*:/gu)].map(
          (match): string => match[1],
        ),
      ),
    ].sort();

    expect(declared.length).toBeGreaterThan(0);

    declared.forEach((token): void => {
      const allowed =
        TOKEN_NAMESPACE_PREFIXES.some((prefix): boolean =>
          token.startsWith(prefix),
        ) || (TOKEN_EXACT_NAMES as ReadonlyArray<string>).includes(token);

      expect(
        allowed,
        `"${token}" is outside the token namespace allowlist. Colour tokens use ` +
          'the --themely-* names verbatim; the export set keeps --map-* / ' +
          '--tooltip-*. An un-namespaced name here is a retired token coming back.',
      ).toBe(true);
    });
  });
});

describe('component theme tokens', (): void => {
  /**
   * **REPLACED by `04-07` (D4-04), because its subject was deleted.**
   *
   * This slot used to hold "sizes preset columns from a minimum track and never
   * clips a label", which asserted `repeat(auto-fit, minmax(76px, 1fr))` on the
   * ten-tile preset grid. That grid is GONE - the ramp model replaces the
   * presets - so the old assertion would have matched nothing and passed
   * vacuously, which is the exact shape this repository keeps shipping. It was
   * not renumbered onto the ramp strip either: the strip's geometry is a
   * different claim with its own gate.
   *
   * What replaces it is the claim `G-3` is actually about. The owner's third
   * complaint - *"hate the multi boxes within"* - was already off-contract
   * against `Design.md` section 9 (*"Don't put a border on top of a border.
   * Stack by background shift"*), so it is gated rather than left to review:
   * **the two Colors-panel surface sheets declare no card and no hairline
   * box-shadow.** Elevation runs Platinum -> Porcelain, one step, never two.
   */
  it('keeps the Colors panel flat - no card, no border on top of a border', (): void => {
    const colorsPanelSheets: ReadonlyArray<readonly [string, string]> = [
      ['controls/colorPicker.css', readStyleSheet('./controls/colorPicker.css')],
      [
        'controls/selectionPanel.css',
        readStyleSheet('./controls/selectionPanel.css'),
      ],
    ];

    // A walk that resolved to nothing satisfies every negative below.
    expect(colorsPanelSheets).toHaveLength(2);

    colorsPanelSheets.forEach(([name, css]): void => {
      const declarations = stripComments(css);

      expect(declarations.length, name).toBeGreaterThan(0);
      expect(
        declarations,
        `${name} declares a hairline. Inside a Platinum panel the Porcelain ` +
          'background IS the elevation step; a hairline on top of it is the ' +
          'second border the owner reported.',
      ).not.toContain('--hairline');
      expect(
        declarations,
        `${name} paints a card surface. A section is type plus a rule, not a box.`,
      ).not.toContain('--radius-card');

      /*
       * An INSET shadow is a state ring drawn inside a control - the ramp
       * strip's hover, selection, and focus rings are all one. An OUTSET one is
       * elevation, which is the thing being deleted. Distinguished rather than
       * banned outright, because banning `box-shadow` would have forced the
       * strip's rings back onto borders and reintroduced a per-segment edge:
       * exactly the "multi boxes" this test exists to prevent.
       */
      [...declarations.matchAll(/box-shadow:\s*([^;]*);/gu)].forEach(
        (match): void => {
          expect(
            match[1],
            `${name} declares an OUTSET box-shadow ("${match[1]}"). Elevation ` +
              'in this panel is a background step, not a shadow.',
          ).toContain('inset');
        },
      );
    });

    // The deleted markup, gated so it cannot come back by copy-paste.
    const colorPickerCss = stripComments(colorsPanelSheets[0][1]);
    ['__preset', '__custom-preview', '__custom-swatch', '__active-check'].forEach(
      (fragment): void => {
        expect(
          colorPickerCss,
          `controls/colorPicker.css still styles "${fragment}", which 04-07 deleted.`,
        ).not.toContain(fragment);
      },
    );
  });

  /**
   * Comments are stripped first. The rule is that a component stylesheet
   * DECLARES no colour literal; a comment recording the measured ratio that
   * made a token mode-invariant is the reason the rule exists, and scanning it
   * would make writing the reason down the thing that fails.
   */
  it('keeps component colors tokenized while fixed colors stay in theme.css', (): void => {
    /*
     * A walk that resolved to nothing would satisfy every `not.toMatch` below
     * without reading a byte, so the discovered set is asserted first. The
     * bound is the eight surface sheets `03-10` produced plus the three that
     * predate them, minus `theme.css`.
     */
    expect(COMPONENT_STYLE_SHEETS.length).toBeGreaterThan(4);

    COMPONENT_STYLE_SHEETS.forEach(([name, css]): void => {
      expect(stripComments(css), name).not.toMatch(COMPONENT_COLOR_LITERAL);
    });

    MODE_INVARIANT.forEach(([token]): void => {
      expect(THEME_CSS).toContain(`${token}:`);
    });
  });
});
