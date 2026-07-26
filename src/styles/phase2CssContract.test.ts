import { describe, expect, it } from 'vitest';

/**
 * The executable half of the Phase 2 UI contract (`02-UI-SPEC.md`).
 *
 * A design contract that lives only in prose is advisory: a reviewer has to
 * notice the drift. Everything asserted here is a rule that would otherwise
 * fail silently - the map still renders, the buttons still click, and the PNG
 * still downloads while the contract is broken.
 */

interface FileSystemModule {
  readFileSync: (path: URL, encoding: 'utf8') => string;
}

interface NodeProcess {
  getBuiltinModule: (name: 'fs') => FileSystemModule;
}

interface CssRule {
  /** Enclosing at-rule preludes, outermost first. Empty at the top level. */
  readonly conditions: readonly string[];
  readonly selector: string;
  readonly body: string;
}

function readStyleSheet(relativePath: string): string {
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

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\S\s]*?\*\//gu, '');
}

/**
 * A brace-matching walk rather than a regular expression: nested at-rules
 * (`@supports` wrapping `@media`) are exactly where an accidental `--map-*`
 * override would hide, and a flat regex cannot see the nesting it lives in.
 */
function parseRules(css: string): CssRule[] {
  const source = stripComments(css);
  const rules: CssRule[] = [];
  const conditions: string[] = [];
  let prelude = '';
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (character === '{') {
      const selector = prelude.trim().replaceAll(/\s+/gu, ' ');
      prelude = '';
      index += 1;

      if (selector.startsWith('@')) {
        conditions.push(selector);
        continue;
      }

      let depth = 1;
      const start = index;
      while (index < source.length && depth > 0) {
        if (source[index] === '{') {
          depth += 1;
        } else if (source[index] === '}') {
          depth -= 1;
        }
        index += 1;
      }
      rules.push({
        conditions: [...conditions],
        selector,
        body: source.slice(start, index - 1),
      });
      continue;
    }

    if (character === '}') {
      conditions.pop();
      prelude = '';
      index += 1;
      continue;
    }

    prelude += character;
    index += 1;
  }

  return rules;
}

function declarationsOf(body: string): Array<[string, string]> {
  return body
    .split(';')
    .map((declaration): string => declaration.trim())
    .filter((declaration): boolean => declaration.length > 0)
    .map((declaration): [string, string] => {
      const separator = declaration.indexOf(':');
      return [
        declaration.slice(0, separator).trim(),
        declaration.slice(separator + 1).trim(),
      ];
    })
    .filter(([property]): boolean => property.length > 0);
}

function findRule(
  rules: readonly CssRule[],
  selector: string,
  conditions: readonly string[] = [],
): CssRule {
  const match = rules.find(
    (rule): boolean =>
      rule.selector === selector &&
      rule.conditions.length === conditions.length &&
      rule.conditions.every(
        (condition, position): boolean => condition === conditions[position],
      ),
  );

  if (match === undefined) {
    throw new Error(
      `Missing rule "${selector}" under [${conditions.join(' > ')}].`,
    );
  }

  return match;
}

function tokensOf(rule: CssRule): Map<string, string> {
  return new Map(
    declarationsOf(rule.body).filter(([property]): boolean =>
      property.startsWith('--'),
    ),
  );
}

const THEME_CSS = readStyleSheet('./theme.css');
const APP_CSS = readStyleSheet('./App.css');
const CONTROLS_CSS = readStyleSheet('./Controls.css');
const MAP_CANVAS_CSS = readStyleSheet('./MapCanvas.css');

const THEME_RULES = parseRules(THEME_CSS);
const ALL_RULES: ReadonlyArray<readonly [string, CssRule[]]> = [
  ['theme.css', THEME_RULES],
  ['App.css', parseRules(APP_CSS)],
  ['Controls.css', parseRules(CONTROLS_CSS)],
  ['MapCanvas.css', parseRules(MAP_CANVAS_CSS)],
];

const DARK_CONDITION = '@media (prefers-color-scheme: dark)';
const SUPPORTS_GLASS_CONDITION = '@supports (backdrop-filter: blur(1px))';
const REDUCED_TRANSPARENCY_CONDITION =
  '@media (prefers-reduced-transparency: reduce)';
const CONTRAST_CONDITION = '@media (prefers-contrast: more)';
const FORCED_COLORS_CONDITION = '@media (forced-colors: active)';
const REDUCED_MOTION_CONDITION = '@media (prefers-reduced-motion: reduce)';

const ROOT_TOKENS = tokensOf(findRule(THEME_RULES, ':root'));

const EXACT_SCALE_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ['--space-xs', '4px'],
  ['--space-sm', '8px'],
  ['--space-md', '16px'],
  ['--space-lg', '24px'],
  ['--space-xl', '32px'],
  ['--space-2xl', '48px'],
  ['--space-3xl', '64px'],
  ['--target-compact', '44px'],
  ['--font-label', '14px'],
  ['--font-body', '16px'],
  ['--font-heading', '20px'],
  ['--font-display', '28px'],
  ['--weight-regular', '400'],
  ['--weight-semibold', '600'],
  ['--radius-control', '8px'],
  ['--radius-large', '16px'],
  ['--motion-fast', '150ms'],
  ['--motion-scene', '160ms'],
  ['--motion-camera', '240ms'],
  ['--easing-camera', 'cubic-bezier(0.22, 1, 0.36, 1)'],
  ['--focus-width', '2px'],
  ['--focus-offset', '2px'],
  ['--border-width', '1px'],
];

const EXACT_LIGHT_COLOR_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ['--surface-page', '#eef1f3'],
  ['--surface-card', '#ffffff'],
  ['--surface-hover', '#e2e8f0'],
  ['--surface-pressed', '#cbd5e1'],
  ['--surface-accent-tint', '#ccfbf1'],
  ['--text-primary', '#111827'],
  ['--text-secondary', '#475569'],
  ['--text-muted', '#64748b'],
  ['--border-default', '#cbd5e1'],
  ['--border-strong', '#1f2937'],
  ['--accent', '#0f766e'],
  ['--destructive', '#b42318'],
  ['--destructive-tint', '#fef3f2'],
  ['--success', '#067647'],
  ['--success-tint', '#ecfdf3'],
  ['--warning', '#b54708'],
  ['--warning-tint', '#fffaeb'],
  ['--overlay', 'rgba(15, 23, 42, 0.72)'],
];

const EXACT_DARK_CHROME_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ['--surface-page', '#0b0f12'],
  ['--surface-card', '#151b20'],
  ['--surface-hover', '#1e293b'],
  ['--surface-pressed', '#334155'],
  ['--surface-accent-tint', '#134e4a'],
  ['--text-primary', '#f8fafc'],
  ['--text-secondary', '#cbd5e1'],
  ['--text-muted', '#94a3b8'],
  ['--border-default', '#334155'],
  ['--accent', '#5eead4'],
  ['--accent-contrast', '#042f2e'],
];

/**
 * Every token the exported PNG can depend on. These are the tokens whose
 * redefinition inside any conditional block would make the export follow the
 * viewer's theme, contrast, or forced-colors preference.
 */
const FIXED_EXPORT_TOKENS = [
  '--map-surface',
  '--map-fill-default',
  '--map-fill-non-selectable',
  '--map-border-default',
  '--map-border-historical',
  '--map-border-hover',
  '--map-border-selected',
  '--map-border-focus',
  '--map-fixed-text',
  '--swatch-border',
] as const;

const OPAQUE_GLASS_FALLBACKS: ReadonlyArray<readonly [string, string]> = [
  ['--glass-app-bar', '#f8fafc'],
  ['--glass-inspector', '#ffffff'],
  ['--glass-navigation', '#ffffff'],
  ['--glass-blur-app-bar', '0'],
  ['--glass-blur-inspector', '0'],
  ['--glass-blur-navigation', '0'],
];

const GRADIENT_PATTERN = /(?:linear|radial|conic|repeating-[a-z-]+)-gradient\(/u;

const POSITIONAL_PSEUDO_PATTERN =
  /:(?:nth-child|nth-last-child|nth-of-type|nth-last-of-type|first-child|last-child|only-child|first-of-type|last-of-type|only-of-type)\b/u;
/** Anything a creator can activate. Order among these is copy, never identity. */
const INTERACTIVE_SELECTOR_PATTERN =
  /\b(?:button|input|select|textarea|a|summary)\b|__action|\[role="button"\]/u;

describe('Phase 2 token contract', (): void => {
  it('declares the exact spacing, type, radius, and motion scale', (): void => {
    EXACT_SCALE_TOKENS.forEach(([token, value]): void => {
      expect(ROOT_TOKENS.get(token)).toBe(value);
    });
  });

  it('declares the exact light color contract', (): void => {
    EXACT_LIGHT_COLOR_TOKENS.forEach(([token, value]): void => {
      expect(ROOT_TOKENS.get(token)).toBe(value);
    });
  });

  it('declares the exact dark chrome contract', (): void => {
    const darkTokens = tokensOf(
      findRule(THEME_RULES, ':root', [DARK_CONDITION]),
    );

    EXACT_DARK_CHROME_TOKENS.forEach(([token, value]): void => {
      expect(darkTokens.get(token)).toBe(value);
    });
  });

  it('never redefines an export token outside the unconditioned root', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        if (rule.conditions.length === 0 && rule.selector === ':root') {
          return;
        }
        declarationsOf(rule.body).forEach(([property]): void => {
          expect(
            FIXED_EXPORT_TOKENS.includes(
              property as (typeof FIXED_EXPORT_TOKENS)[number],
            ),
            `${file}: "${property}" is an export token and must stay fixed; ` +
              `found under [${rule.conditions.join(' > ')}] ${rule.selector}`,
          ).toBe(false);
        });
      });
    });
  });

  it('declares every export token exactly once', (): void => {
    FIXED_EXPORT_TOKENS.forEach((token): void => {
      const declarations = [...THEME_CSS.matchAll(/(--[\w-]+)\s*:/gu)].filter(
        (match): boolean => match[1] === token,
      );
      expect(declarations).toHaveLength(1);
    });
  });
});

describe('Phase 2 glass and preference contract', (): void => {
  it('keeps the opaque fallback as the root value', (): void => {
    OPAQUE_GLASS_FALLBACKS.forEach(([token, value]): void => {
      expect(ROOT_TOKENS.get(token)).toBe(value);
    });
  });

  it('applies translucency only under a backdrop-filter supports query', (): void => {
    const enhanced = tokensOf(
      findRule(THEME_RULES, ':root', [SUPPORTS_GLASS_CONDITION]),
    );

    expect(enhanced.get('--glass-app-bar')).toBe('rgba(248, 250, 252, 0.86)');
    expect(enhanced.get('--glass-inspector')).toBe('rgba(255, 255, 255, 0.88)');
    expect(enhanced.get('--glass-navigation')).toBe('rgba(255, 255, 255, 0.9)');
    expect(enhanced.get('--glass-blur-app-bar')).toBe('16px');
    expect(enhanced.get('--glass-blur-inspector')).toBe('18px');
    expect(enhanced.get('--glass-blur-navigation')).toBe('14px');
  });

  it('restores opaque surfaces under every accessibility preference', (): void => {
    [
      REDUCED_TRANSPARENCY_CONDITION,
      CONTRAST_CONDITION,
      FORCED_COLORS_CONDITION,
    ].forEach((condition): void => {
      const tokens = tokensOf(findRule(THEME_RULES, ':root', [condition]));
      expect(tokens.get('--glass-blur-app-bar')).toBe('0');
      expect(tokens.get('--glass-blur-inspector')).toBe('0');
      expect(tokens.get('--glass-blur-navigation')).toBe('0');
      expect(tokens.get('--glass-app-bar')).not.toContain('rgba');
      expect(tokens.get('--glass-inspector')).not.toContain('rgba');
      expect(tokens.get('--glass-navigation')).not.toContain('rgba');
    });
  });

  it('strengthens boundaries and focus under contrast and forced colors', (): void => {
    [CONTRAST_CONDITION, FORCED_COLORS_CONDITION].forEach((condition): void => {
      const tokens = tokensOf(findRule(THEME_RULES, ':root', [condition]));
      expect(tokens.get('--border-width')).toBe('2px');
      expect(tokens.get('--focus-width')).toBe('3px');
    });
  });

  it('zeroes every motion duration under reduced motion', (): void => {
    const tokens = tokensOf(
      findRule(THEME_RULES, ':root', [REDUCED_MOTION_CONDITION]),
    );
    expect(tokens.get('--motion-fast')).toBe('0ms');
    expect(tokens.get('--motion-scene')).toBe('0ms');
    expect(tokens.get('--motion-camera')).toBe('0ms');
  });
});

const COMPACT_BREAKPOINT = '@media (max-width: 1199px)';
const SINGLE_COLUMN_BREAKPOINT = '@media (max-width: 899px)';
const MOBILE_BREAKPOINT = '@media (max-width: 767px)';

/** Only these three surfaces may carry glass (UI-SPEC 5.5). */
const GLASS_SELECTORS = [
  '.app > header',
  '.workspace--desktop .workspace__control-column',
  '.map-navigation__cluster',
] as const;

const SPACING_PROPERTIES = [
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-block',
  'margin-inline',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-block',
  'padding-block-end',
  'padding-inline',
  'gap',
  'row-gap',
  'column-gap',
] as const;

/**
 * 44px is the single declared exception in UI-SPEC 4.1: compact icon-only map
 * controls. Everything else must come from the token scale.
 */
const ALLOWED_RAW_SPACING_PX = new Set([
  '0px',
  '44px',
  // The declared 1440px content measure, used to center the full-bleed app bar.
  '1440px',
]);

/** A control padded below the token scale would fall under the 48px target. */
const UNDERSIZED_HEIGHT_PATTERN = /--space-(?:xs|sm|md|lg|xl)\b|\d+px/u;

describe('Phase 2 responsive layout contract', (): void => {
  const appRules = parseRules(APP_CSS);

  it('uses the exact desktop measure and grid', (): void => {
    const workspace = new Map(
      declarationsOf(findRule(appRules, '.workspace').body),
    );
    const desktop = new Map(
      declarationsOf(findRule(appRules, '.workspace--desktop').body),
    );

    expect(workspace.get('max-width')).toBe('1440px');
    expect(desktop.get('grid-template-columns')).toBe('minmax(0, 1fr) 376px');
    expect(desktop.get('gap')).toBe('var(--space-lg)');
  });

  it('branches CSS sub-layouts only at the declared breakpoints', (): void => {
    const breakpoints = new Set<string>();
    ALL_RULES.forEach(([, rules]): void => {
      rules.forEach((rule): void => {
        rule.conditions
          .filter((condition): boolean => condition.includes('width'))
          .forEach((condition): void => {
            breakpoints.add(condition);
          });
      });
    });

    expect([...breakpoints].sort()).toStrictEqual(
      [
        COMPACT_BREAKPOINT,
        SINGLE_COLUMN_BREAKPOINT,
        MOBILE_BREAKPOINT,
      ].sort(),
    );
  });

  it('spans the action strip, map, and legend across the compact grid', (): void => {
    const spanning = findRule(
      appRules,
      '.workspace--compact .workspace__actions, .workspace--compact .workspace__map, .workspace--compact .workspace__legend',
    );
    expect(
      new Map(declarationsOf(spanning.body)).get('grid-column'),
    ).toBe('1 / -1');
  });

  it('gives the desktop inspector one shell and no card-in-card sections', (): void => {
    const shell = new Map(
      declarationsOf(
        findRule(appRules, '.workspace--desktop .workspace__control-column')
          .body,
      ),
    );
    expect(shell.get('border-radius')).toBe('var(--radius-large)');
    expect(shell.get('box-shadow')).toBe('var(--shadow-inspector)');
    expect(shell.get('padding')).toBe('var(--space-lg)');

    const flattened = new Map(
      declarationsOf(
        findRule(
          parseRules(CONTROLS_CSS),
          '.workspace--desktop .workspace__control-column .selection-panel, .workspace--desktop .workspace__control-column .color-picker, .workspace--desktop .workspace__control-column .country-list',
        ).body,
      ),
    );
    expect(flattened.get('border')).toBe('0');
    expect(flattened.get('background')).toBe('transparent');
    expect(flattened.get('padding')).toBe('0');
  });

  it('never makes .app a scroll container, which would kill the sticky bar', (): void => {
    const app = new Map(declarationsOf(findRule(appRules, '.app').body));
    expect(app.has('overflow')).toBe(false);
    expect(app.has('overflow-x')).toBe(false);
    expect(app.has('overflow-y')).toBe(false);
  });

  it('authors application spacing only from the token scale', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        declarationsOf(rule.body).forEach(([property, value]): void => {
          if (
            !(SPACING_PROPERTIES as ReadonlyArray<string>).includes(property)
          ) {
            return;
          }
          [...value.matchAll(/\d+(?:\.\d+)?px/gu)].forEach((match): void => {
            expect(
              ALLOWED_RAW_SPACING_PX.has(match[0]),
              `${file}: "${rule.selector}" sets ${property}: ${value}. ` +
                'Use a --space-* token.',
            ).toBe(true);
          });
        });
      });
    });
  });

  it('keeps every standard control at the 48px minimum target height', (): void => {
    const themeButton = new Map(
      declarationsOf(findRule(THEME_RULES, 'button').body),
    );
    expect(themeButton.get('min-height')).toBe('var(--space-2xl)');

    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        const minHeight = new Map(declarationsOf(rule.body)).get('min-height');
        if (minHeight === undefined) {
          return;
        }
        expect(
          UNDERSIZED_HEIGHT_PATTERN.test(minHeight),
          `${file}: "${rule.selector}" sets min-height: ${minHeight}, which ` +
            'is below the 48px target or bypasses the token scale.',
        ).toBe(false);
      });
    });
  });
});

/**
 * Everything the export clone can carry. `sanitizeExportClone` hard-sets stroke
 * and stroke-width inline, but it does not neutralize an inherited `filter`,
 * `box-shadow`, or blend mode - those would rasterize into the PNG, and
 * html2canvas approximates them differently than the browser paints them.
 */
const EXPORT_CONTENT_PATTERN =
  /\.map-canvas|\.country-path|\.scene-path|\[data-layer=|\.map-export-source/u;

const EXPORT_UNSAFE_PROPERTIES = [
  'filter',
  'backdrop-filter',
  'box-shadow',
  'text-shadow',
  'mix-blend-mode',
  'mask',
  'mask-image',
  'clip-path',
] as const;

describe('Phase 2 export isolation contract', (): void => {
  it('authors no export-unsafe effect on exported content', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        const touchesExport = rule.selector
          .split(',')
          .some((part): boolean => EXPORT_CONTENT_PATTERN.test(part));
        if (!touchesExport) {
          return;
        }
        declarationsOf(rule.body).forEach(([property, value]): void => {
          if (
            !(EXPORT_UNSAFE_PROPERTIES as ReadonlyArray<string>).includes(
              property,
            )
          ) {
            return;
          }
          expect(
            value,
            `${file}: "${rule.selector}" sets ${property}: ${value} on ` +
              'exported content.',
          ).toBe('none');
        });
      });
    });
  });

  it('scopes touch-action: none to the interactive square alone', (): void => {
    const owners: string[] = [];
    ALL_RULES.forEach(([, rules]): void => {
      rules.forEach((rule): void => {
        declarationsOf(rule.body).forEach(([property, value]): void => {
          if (property === 'touch-action' && value !== 'auto') {
            owners.push(rule.selector);
          }
        });
      });
    });

    expect(owners).toStrictEqual(['.map-canvas']);
    expect(
      new Map(
        declarationsOf(findRule(parseRules(MAP_CANVAS_CSS), '.map-canvas').body),
      ).get('touch-action'),
    ).toBe('none');
  });

  it('keeps the composition square exactly square and opaque', (): void => {
    const square = new Map(
      declarationsOf(
        findRule(parseRules(MAP_CANVAS_CSS), '.map-workspace__square').body,
      ),
    );
    expect(square.get('aspect-ratio')).toBe('1');
    expect(square.get('background')).toBe('var(--map-surface)');
    expect(square.get('overflow')).toBe('hidden');
  });
});

describe('Phase 2 prohibited visual treatments', (): void => {
  it('authors no gradient anywhere', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        expect(
          GRADIENT_PATTERN.test(rule.body),
          `${file}: "${rule.selector}" authors a gradient.`,
        ).toBe(false);
      });
    });
  });

  /**
   * `02-22` found `Controls.css` keying the destructive tint on
   * `button:nth-child(3)` and the filled CTA on `button:last-child`. A required
   * reorder would have tinted `Save or Load Maps` red, and nothing would have
   * failed - the map still renders and every button still works. Order among
   * actions is a copy decision, so it can never carry identity.
   */
  it('never styles an interactive control by its position', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        rule.selector.split(',').forEach((part): void => {
          const selector = part.trim();
          if (!INTERACTIVE_SELECTOR_PATTERN.test(selector)) {
            return;
          }
          expect(
            POSITIONAL_PSEUDO_PATTERN.test(selector),
            `${file}: "${selector}" styles a control by position. Key on a ` +
              'role class such as `--primary` or `--destructive` instead.',
          ).toBe(false);
        });
      });
    });
  });

  it('applies backdrop-filter only inside the supports query', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        // `backdrop-filter: none` disables glass; only an applied blur needs
        // the supports guard.
        const usesBackdropFilter = declarationsOf(rule.body).some(
          ([property, value]): boolean =>
            property === 'backdrop-filter' && value !== 'none',
        );
        if (!usesBackdropFilter) {
          return;
        }
        expect(
          rule.conditions.includes(SUPPORTS_GLASS_CONDITION),
          `${file}: "${rule.selector}" blurs without a supports guard.`,
        ).toBe(true);
        expect(
          (GLASS_SELECTORS as ReadonlyArray<string>).includes(rule.selector),
          `${file}: "${rule.selector}" is not an approved glass surface.`,
        ).toBe(true);
      });
    });
  });
});
