import { describe, expect, it } from 'vitest';

/**
 * The executable half of the Phase 3 UI contract (`03-UI-SPEC.md`, `Design.md`).
 *
 * Successor to `phase2CssContract.test.ts`. The parser and helpers below are
 * ported from it VERBATIM - they are infrastructure, not policy, and a
 * hand-rewritten parser is how a successor contract test quietly gets weaker
 * than the one it replaces. The two files run side by side until `03-04` lands
 * the new token system and retires the Phase 2 assertions; deleting the old one
 * here would leave the Phase 2 token rules unguarded during the very wave the
 * tokens are being replaced in.
 *
 * Everything asserted here is a rule that would otherwise fail silently: the
 * map still renders, the panel still opens, and the PNG still downloads while
 * the contract is broken.
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

interface CssRule {
  /** Enclosing at-rule preludes, outermost first. Empty at the top level. */
  readonly conditions: readonly string[];
  readonly selector: string;
  readonly body: string;
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

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\S\s]*?\*\//gu, '');
}

/**
 * A brace-matching walk rather than a regular expression: nested at-rules
 * (`@supports` wrapping `@media`) are exactly where an accidental `--map-*`
 * override would hide, and a flat regex cannot see the nesting it lives in.
 *
 * **Known limitation, enforced rather than assumed.** This walk is not aware of
 * strings or `url()`, so a `background: url("data:image/svg+xml;base64,…")` or a
 * `content: "}"` would desynchronise brace depth and silently corrupt every
 * assertion in this file rather than failing. `assertParsableStyleSheet` below
 * rejects those constructs up front, so the parser's assumptions are checked
 * instead of hoped for. If one is ever genuinely needed, replace this walk with
 * a real tokenizer - do not relax the check.
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

/**
 * The parser above splits on `;` and counts braces with no string awareness.
 * Rather than trust that no stylesheet ever contains a quoted `;`, `{`, or `}`,
 * assert it - and assert the parse produced something, so a walk that silently
 * consumed the whole file cannot pass as "no violations found".
 */
function assertParsableStyleSheet(file: string, css: string): void {
  const source = stripComments(css);

  [...source.matchAll(/(?<quote>["'])(?<value>.*?)\k<quote>/gsu)].forEach(
    (match): void => {
      const value = match.groups?.value ?? '';
      expect(
        /[;{}]/u.test(value),
        `${file}: the quoted value ${match[0]} contains a ; { or }, which this ` +
          'file\'s brace-counting parser cannot see. Every assertion here would ' +
          'silently read the wrong rules.',
      ).toBe(false);
    },
  );

  expect(
    (source.match(/\{/gu) ?? []).length,
    `${file}: unbalanced braces after parsing.`,
  ).toBe((source.match(/\}/gu) ?? []).length);

  expect(parseRules(css).length, `${file}: parsed to zero rules.`).toBeGreaterThan(
    0,
  );
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
  const matches = rules.filter(
    (rule): boolean =>
      rule.selector === selector &&
      rule.conditions.length === conditions.length &&
      rule.conditions.every(
        (condition, position): boolean => condition === conditions[position],
      ),
  );

  if (matches.length === 0) {
    throw new Error(
      `Missing rule "${selector}" under [${conditions.join(' > ')}].`,
    );
  }

  /*
   * Returning the first match made duplicates invisible: `@media
   * (max-width: 767px)` declared `.app > header` twice and any assertion on the
   * mobile header would have read only half its declarations. Worse, the
   * `.app { overflow-x }` guard could be defeated simply by appending a second
   * `.app` rule later in the file - the exact regression it exists to prevent.
   */
  if (matches.length > 1) {
    throw new Error(
      `"${selector}" is declared ${matches.length} times under ` +
        `[${conditions.join(' > ')}]. Merge them: findRule reads one block, so ` +
        'a split rule hides half its declarations from every assertion here.',
    );
  }

  return matches[0];
}

function tokensOf(rule: CssRule): Map<string, string> {
  return new Map(
    declarationsOf(rule.body).filter(([property]): boolean =>
      property.startsWith('--'),
    ),
  );
}

/** Follows a `var(--token)` alias chain to the literal it bottoms out at. */
function resolveTokenValue(
  tokens: Map<string, string>,
  token: string,
  seen: ReadonlySet<string> = new Set(),
): string {
  const raw = tokens.get(token);
  if (raw === undefined) {
    throw new Error(`"${token}" is never declared on :root.`);
  }

  const alias = /^var\(\s*(--[\w-]+)\s*\)$/u.exec(raw);
  if (alias === null) {
    return raw;
  }
  if (seen.has(token)) {
    throw new Error(`"${token}" resolves through a cyclic var() chain.`);
  }
  return resolveTokenValue(tokens, alias[1], new Set([...seen, token]));
}

function parseHexColor(value: string): [number, number, number] | null {
  const match = /^#(?<digits>[\da-f]{6}|[\da-f]{3})$/iu.exec(value.trim());
  if (match?.groups === undefined) {
    return null;
  }

  const digits = match.groups.digits;
  const expanded =
    digits.length === 3
      ? [...digits].map((digit): string => digit + digit).join('')
      : digits;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

/** WCAG 2.2 relative luminance. */
function relativeLuminance([red, green, blue]: readonly [
  number,
  number,
  number,
]): number {
  const channel = (raw: number): number => {
    const srgb = raw / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (foregroundRgb === null || backgroundRgb === null) {
    throw new Error(
      `Contrast needs two hex colors, got "${foreground}" on "${background}".`,
    );
  }

  const first = relativeLuminance(foregroundRgb);
  const second = relativeLuminance(backgroundRgb);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

/*
 * The one deliberate change to the ported infrastructure: the Phase 2 file
 * hard-coded four stylesheet filenames, so a stylesheet added after it was
 * written escaped every assertion in it. `03-10` splits `Controls.css` into
 * `src/styles/controls/*.css`, which is exactly that failure waiting to happen,
 * so discovery is a directory walk from here on. Assertion 20 (this set's size
 * equals the import count in the entry module) lands in `03-10` on top of this
 * seam.
 */
function collectFiles(directory: URL, extension: string): string[] {
  return fileSystem()
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): string[] => {
      if (entry.isDirectory()) {
        return collectFiles(
          new URL(`${entry.name}/`, directory),
          extension,
        ).map((nested): string => `${entry.name}/${nested}`);
      }
      return entry.name.endsWith(extension) ? [entry.name] : [];
    })
    .sort();
}

const STYLES_DIRECTORY = new URL('./', import.meta.url);
const SOURCE_DIRECTORY = new URL('../', import.meta.url);

const STYLE_SHEET_NAMES = collectFiles(STYLES_DIRECTORY, '.css');

const STYLE_SHEETS: ReadonlyArray<readonly [string, string]> =
  STYLE_SHEET_NAMES.map(
    (name): readonly [string, string] => [name, readStyleSheet(`./${name}`)],
  );

const ALL_RULES: ReadonlyArray<readonly [string, CssRule[]]> = STYLE_SHEETS.map(
  ([name, css]): readonly [string, CssRule[]] => [name, parseRules(css)],
);

function rulesOf(name: string): CssRule[] {
  const found = ALL_RULES.find(([file]): boolean => file === name);
  if (found === undefined) {
    throw new Error(`"${name}" is not in the discovered stylesheet set.`);
  }
  return found[1];
}

function everyRule(): CssRule[] {
  return ALL_RULES.flatMap(([, rules]): CssRule[] => rules);
}

/** Every `.tsx` under `src/`, read once. Component source, not stylesheets. */
const COMPONENT_SOURCES: ReadonlyArray<readonly [string, string]> = collectFiles(
  SOURCE_DIRECTORY,
  '.tsx',
).map(
  (name): readonly [string, string] => [
    name,
    fileSystem().readFileSync(new URL(name, SOURCE_DIRECTORY), 'utf8'),
  ],
);

describe('Phase 3 UI contract parser', (): void => {
  it('discovers stylesheets by walking the directory, not from a fixed list', (): void => {
    // A list that has to be edited by hand is a list that will not be, and the
    // rules in the file nobody added would be unguarded rather than failing.
    expect(STYLE_SHEET_NAMES.length).toBeGreaterThan(3);
    expect(STYLE_SHEET_NAMES).toContain('theme.css');
    expect(STYLE_SHEET_NAMES).toContain('editor.css');
  });

  it('parses every discovered stylesheet under the assumptions it actually makes', (): void => {
    STYLE_SHEETS.forEach(([file, css]): void => {
      assertParsableStyleSheet(file, css);
    });
  });

  it('reads component source it can bind assertions back to', (): void => {
    expect(COMPONENT_SOURCES.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 10 - the panel track (D-19)
 * ------------------------------------------------------------------ */

const PANEL_STATE_ATTRIBUTE = 'data-panel-open';
const PANEL_STATE_VALUES = ['false', 'true'] as const;
const CLOSED_PANEL_WIDTH = '0px';
const OPEN_PANEL_WIDTH = '280px';
const RAIL_WIDTH = '56px';

function panelStateValuesStyled(): string[] {
  const values = new Set<string>();

  everyRule().forEach((rule): void => {
    [
      ...rule.selector.matchAll(
        new RegExp(`\\[${PANEL_STATE_ATTRIBUTE}(?:=['"]?([^\\]'"]*)['"]?)?\\]`, 'gu'),
      ),
    ].forEach((match): void => {
      values.add(match[1] ?? '');
    });
  });

  return [...values].sort();
}

describe('Phase 3 panel track (assertion 10)', (): void => {
  it('styles exactly the two states the attribute is allowed to hold', (): void => {
    const styled = panelStateValuesStyled();

    expect(styled.length).toBeGreaterThan(0);
    styled.forEach((value): void => {
      expect(
        (PANEL_STATE_VALUES as ReadonlyArray<string>).includes(value),
        `"${value}" is styled off the panel state attribute. The attribute is ` +
          'two-valued so a contract assertion can enumerate it; a third value ' +
          'is a state no gate and no reader knows about.',
      ).toBe(true);
    });
  });

  it('resolves the track to 0px closed and 280px open', (): void => {
    const editorRules = rulesOf('editor.css');
    const rootTokens = tokensOf(findRule(editorRules, ':root'));
    const openTokens = tokensOf(
      findRule(editorRules, `.map-editor[${PANEL_STATE_ATTRIBUTE}='true']`),
    );

    expect(rootTokens.get('--rail-width')).toBe(RAIL_WIDTH);
    expect(rootTokens.get('--panel-width')).toBe(CLOSED_PANEL_WIDTH);
    expect(openTokens.get('--panel-width')).toBe(OPEN_PANEL_WIDTH);

    // The token is only the track if the track actually reads it.
    const shell = new Map(declarationsOf(findRule(editorRules, '.map-editor').body));
    expect(shell.get('grid-template-columns')).toBe(
      'var(--rail-width) var(--panel-width) 1fr',
    );
    expect(shell.get('block-size')).toBe('100dvh');
  });

  /**
   * An unregistered custom property has no type, so it cannot interpolate and
   * the panel snaps. Registering it is what makes the animation possible at
   * all - and it is the reason the grid's track list, which would cost many
   * layout passes per frame across a 248 x 3-path SVG, is not the thing being
   * animated.
   */
  it('registers the width property and animates that, not the track list', (): void => {
    const editorCss = readStyleSheet('./editor.css');
    const registration =
      /@property\s+--panel-width\s*\{(?<body>[^}]*)\}/u.exec(editorCss)?.groups
        ?.body ?? '';
    const registered = new Map(declarationsOf(registration));

    expect(registered.get('syntax')).toBe("'<length>'");
    expect(registered.get('inherits')).toBe('true');
    expect(registered.get('initial-value')).toBe(CLOSED_PANEL_WIDTH);

    const animated = everyRule()
      .flatMap((rule): Array<[string, string]> => declarationsOf(rule.body))
      .filter(([property]): boolean => property.startsWith('transition'))
      .map(([, value]): string => value);

    expect(
      animated.some((value): boolean => value.includes('--panel-width')),
      'nothing transitions the registered panel width, so the reserved track ' +
        'snaps instead of opening.',
    ).toBe(true);
    animated.forEach((value): void => {
      expect(
        /grid-template/u.test(value),
        `"${value}" animates the grid's track list. Animate the registered ` +
          'width property instead; the track list relayouts the whole SVG.',
      ).toBe(false);
    });
  });

  /**
   * The CSS half above proves what is *styled*. This is the other half: the
   * attribute must have exactly one writer, and that writer must be incapable
   * of producing a third value. Two writers is how two surfaces come to
   * disagree about which panel is open, with both of them "working".
   */
  it('has exactly one writer, and it writes only those two values', (): void => {
    const writers = COMPONENT_SOURCES.filter(([, source]): boolean =>
      source.includes(PANEL_STATE_ATTRIBUTE),
    );

    expect(
      writers.map(([file]): string => file),
      'the panel state attribute must have exactly one writer.',
    ).toHaveLength(1);

    const [file, source] = writers[0];
    const written = [
      ...source.matchAll(
        new RegExp(`${PANEL_STATE_ATTRIBUTE}=\\{(?<expression>[^}]*)\\}`, 'gu'),
      ),
    ].flatMap((match): string[] =>
      [...(match.groups?.expression ?? '').matchAll(/'([^']*)'/gu)].map(
        (literal): string => literal[1],
      ),
    );

    expect(
      [...new Set(written)].sort(),
      `${file}: the attribute is written from something other than the two ` +
        'literal states, so it can go absent or take a third value.',
    ).toStrictEqual([...PANEL_STATE_VALUES]);
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 16 - no positional selector on an interactive element
 * ------------------------------------------------------------------ */

const POSITIONAL_PSEUDO_PATTERN =
  /:(?:nth-child|nth-last-child|nth-of-type|nth-last-of-type|first-child|last-child|only-child|first-of-type|last-of-type|only-of-type)\b/u;

/** Anything a creator can activate. Order among these is copy, never identity. */
const INTERACTIVE_SELECTOR_PATTERN =
  /\b(?:button|input|select|textarea|a|summary)\b|__action|\[role="button"\]/u;

describe('Phase 3 selector discipline (assertion 16)', (): void => {
  /**
   * `02-22` found `Controls.css` keying the destructive tint on
   * `button:nth-child(3)` and the filled CTA on `button:last-child`. A required
   * reorder would have tinted `Save or Load Maps` red, and nothing would have
   * failed - the map still renders and every button still works.
   *
   * A rail of near-identical icon rows is the ideal place to reintroduce that
   * bug: the rows differ only by order until you give them a `data-tool`.
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
              'role class or a stable data attribute instead.',
          ).toBe(false);
        });
      });
    });
  });
});

/* ------------------------------------------------------------------ *
 * Export isolation - carried forward from Phase 2 at high priority
 * ------------------------------------------------------------------ */

/**
 * Everything the export clone can carry.
 *
 * **The reason, restated for the post-D-34 world.** The Phase 2 justification
 * for this guard was a rasterizer-mismatch argument about html2canvas, and that
 * argument goes false the moment D-34 removes html2canvas from the export path.
 * The true reason is stronger, not weaker: the clone is serialised into a
 * `data:image/svg+xml` URL and rasterised as an image, and that image is an
 * ISOLATED DOCUMENT which sees none of the host page's stylesheets. An effect
 * applied through an external rule therefore does not render approximately - it
 * renders NOT AT ALL. The only signal is a PNG that quietly lost something the
 * editor shows on screen, which is a harder failure to notice than a mismatch.
 *
 * `sanitizeExportClone` hard-sets stroke and stroke-width inline for exactly
 * this reason; it does not neutralise an inherited effect. D-06 makes hairline
 * shadows pervasive across chrome, so this guard is MORE load-bearing after
 * this phase than before it.
 */
const EXPORT_CONTENT_PATTERN =
  /\.map-canvas|\.country-path|\.scene-path|\.map-unit-path|\[data-layer=|\.map-export-source/u;

/**
 * Every path class `MapCanvas` can put on a rendered element. All of them reach
 * the export clone, so all of them must be in `EXPORT_CONTENT_PATTERN` - which
 * is a hand-maintained list, and `.map-unit-path` was missing from it for a
 * whole phase. Bind it to the component instead of trusting the list.
 */
const EXPORTED_PATH_CLASSES = [
  'scene-path',
  'country-path',
  'country-path--decorative',
  'map-unit-path',
] as const;

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

describe('Phase 3 export isolation contract', (): void => {
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

  it('covers every path class MapCanvas can render', (): void => {
    const mapCanvasSource = readStyleSheet('../components/MapCanvas.tsx');

    EXPORTED_PATH_CLASSES.forEach((className): void => {
      expect(
        mapCanvasSource.includes(`'${className}'`),
        `"${className}" is no longer rendered by MapCanvas. Drop it here too, ` +
          'or the guard is protecting a class that does not exist.',
      ).toBe(true);
      expect(
        EXPORT_CONTENT_PATTERN.test(`.${className}`),
        `".${className}" reaches the export clone but is not matched by ` +
          'EXPORT_CONTENT_PATTERN, so an export-unsafe rule on it would ship.',
      ).toBe(true);
    });
  });
});

/* ------------------------------------------------------------------ *
 * D-32 - the export frame and the observer that is not needed
 * ------------------------------------------------------------------ */

const FRAME_TOKENS = ['--map-frame-edge', '--map-frame-scrim'] as const;

/**
 * `Tooltip.tsx` has observed its own element since Phase 2 to keep the chip
 * inside the viewport, and its test doubles the observer. That is fine and
 * unrelated to the map's geometry.
 *
 * The rule this asserts is the one D-32 actually needs: no observer enters the
 * projection, camera, or export path. `MapCanvas.tsx:839-840` fixes the viewBox
 * and `useCameraController.ts:310-313` pins d3-zoom's extent to the 1080 square
 * rather than the element rect, so a rail or panel reflow cannot disturb any of
 * the three. Written as an ownership set rather than "grep returns nothing",
 * because a gate that is red on arrival gets deleted instead of obeyed.
 */
const RESIZE_OBSERVER_OWNERS = [
  'components/Tooltip.test.ts',
  'components/Tooltip.tsx',
] as const;

/**
 * Assembled rather than written out. This file is inside the tree it scans, so
 * spelling the identifier here would put the gate in its own result set and the
 * only way to make it green again would be to add itself to the owner list -
 * which is how a gate ends up asserting its own presence.
 */
const RESIZE_OBSERVER_IDENTIFIER = ['Resize', 'Observer'].join('');

describe('Phase 3 export frame (D-32)', (): void => {
  it('declares the frame tokens once, in the unconditioned root', (): void => {
    const themeRules = rulesOf('theme.css');
    const rootTokens = tokensOf(findRule(themeRules, ':root'));

    FRAME_TOKENS.forEach((token): void => {
      expect(resolveTokenValue(rootTokens, token)).toMatch(/^rgba\(/u);
    });

    everyRule().forEach((rule): void => {
      if (rule.conditions.length === 0 && rule.selector === ':root') {
        return;
      }
      declarationsOf(rule.body).forEach(([property]): void => {
        expect(
          (FRAME_TOKENS as ReadonlyArray<string>).includes(property),
          `"${property}" marks the exported square and must stay fixed; found ` +
            `under [${rule.conditions.join(' > ')}] ${rule.selector}`,
        ).toBe(false);
      });
    });
  });

  /**
   * The Phase 2 squareness assertion, relocated rather than retired. The canvas
   * region went full-bleed so it is no longer square, and the frame is what now
   * marks the square the PNG crops to; asserting only the renamed region would
   * have dropped the claim on the rename.
   */
  it('moves the squareness to the frame and keeps the region opaque', (): void => {
    const mapCanvasRules = rulesOf('MapCanvas.css');
    const region = new Map(
      declarationsOf(findRule(mapCanvasRules, '.map-workspace__canvas').body),
    );
    const frame = new Map(
      declarationsOf(findRule(mapCanvasRules, '.map-frame').body),
    );

    expect(region.get('background')).toBe('var(--map-surface)');
    expect(region.get('overflow')).toBe('hidden');
    expect(region.get('container-type')).toBe('size');
    expect(region.has('aspect-ratio')).toBe(false);

    expect(frame.get('aspect-ratio')).toBe('1');
    expect(frame.get('--frame-side')).toBe('min(100cqw, 100cqh)');
    expect(frame.get('inset')).toBe('0');
    expect(frame.get('margin')).toBe('auto');
    expect(frame.get('pointer-events')).toBe('none');
  });

  it('keeps every resize observer out of the projection path', (): void => {
    const owners = collectFiles(SOURCE_DIRECTORY, '.tsx')
      .concat(collectFiles(SOURCE_DIRECTORY, '.ts'))
      .filter((name): boolean =>
        fileSystem()
          .readFileSync(new URL(name, SOURCE_DIRECTORY), 'utf8')
          .includes(RESIZE_OBSERVER_IDENTIFIER),
      )
      .sort();

    expect(
      owners,
      'a resize observer appeared outside the tooltip. The viewBox is fixed ' +
        "and d3-zoom's extent is pinned to the 1080 square, so a rail or panel " +
        'reflow cannot disturb the projection - an observer here means the ' +
        'geometry was re-derived somewhere it should not have been.',
    ).toStrictEqual([...RESIZE_OBSERVER_OWNERS]);
  });
});

/* Kept exported-by-use so the ported helpers cannot rot unnoticed. */
describe('Phase 3 ported helpers', (): void => {
  it('resolves alias chains and WCAG ratios the same way Phase 2 did', (): void => {
    const tokens = new Map([
      ['--alias', 'var(--literal)'],
      ['--literal', '#ffffff'],
    ]);

    expect(resolveTokenValue(tokens, '--alias')).toBe('#ffffff');
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });
});
