import { describe, expect, it } from 'vitest';

import {
  WCAG_AA_BODY_RATIO,
  contrastRatio,
  parseHexColor,
} from '../utils/contrast';
import { APPROVED_PERIOD_ANNOUNCEMENTS } from '../utils/periods';

/**
 * The executable half of the Phase 3 UI contract (`03-UI-SPEC.md`, `Design.md`).
 *
 * The sole CSS contract test. It succeeded the Phase 2 file, which `03-04`
 * deleted once every one of that file's 29 assertions had either been carried
 * forward here or retired against a named decision - the mapping is recorded in
 * `03-04-SUMMARY.md`, per assertion, with the count delta accounted for.
 *
 * The parser and helpers below are ported from the Phase 2 file VERBATIM. They
 * are infrastructure, not policy, and a hand-rewritten parser is how a
 * successor contract test quietly gets weaker than the one it replaces.
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

/*
 * `parseHexColor`, `relativeLuminance`, and `contrastRatio` used to live here as
 * file-private helpers. `04-01` moved them VERBATIM to `src/utils/contrast.ts`
 * because Phase 4 gates every shipped water preset against the same arithmetic,
 * and two independent copies of a luminance transfer function is the drift this
 * project already paid for once. This file now imports them; it must never
 * redeclare them.
 */

/*
 * The one deliberate change to the ported infrastructure: the Phase 2 file
 * hard-coded four stylesheet filenames, so a stylesheet added after it was
 * written escaped every assertion in it. `03-10` split `Controls.css` into
 * eight files under `src/styles/controls/`, which is exactly that failure
 * waiting to happen, so discovery is a directory walk from here on. Assertion
 * 20 below closes the other direction, comparing this set against the entry
 * module's import list AS SETS.
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
 * Assertion 20 - the globbed stylesheet set equals the imported set
 * ------------------------------------------------------------------ */

/**
 * The entry module is the ONLY place a stylesheet enters the bundle, so it is
 * the only list worth comparing against. Parsed rather than restated: a second
 * hand-maintained list would need the same gate this one is.
 */
const ENTRY_MODULE = 'main.tsx';
const STYLES_IMPORT_PREFIX = './styles/';

function entrySource(): string {
  const found = COMPONENT_SOURCES.find(
    ([name]): boolean => name === ENTRY_MODULE,
  );
  if (found === undefined) {
    throw new Error(`"${ENTRY_MODULE}" is not in the discovered source set.`);
  }
  return found[1];
}

/** Every `.css` specifier `main.tsx` imports, verbatim and in source order. */
function rawStyleSheetImports(): string[] {
  return [
    ...entrySource().matchAll(
      /import\s+['"](?<specifier>[^'"]+\.css)['"]/gu,
    ),
  ].map((match): string => match.groups?.specifier ?? '');
}

describe('Phase 3 stylesheet discovery equals stylesheet import (assertion 20)', (): void => {
  /**
   * The Phase 2 contract test hard-coded four filenames, so a fifth stylesheet
   * was invisible to every assertion in it while still shipping to a creator.
   * `03-03` replaced that with the directory walk above, which fixes discovery.
   *
   * This fixes the other direction. A file that is globbed and asserted but
   * never imported is dead weight that LOOKS covered: every rule in it passes
   * every gate here, and none of it reaches a browser. `03-10` split one
   * stylesheet into eight, which is exactly the moment one of the eight gets
   * left out of the entry module.
   */
  it('imports every discovered stylesheet, and discovers every imported one', (): void => {
    const raw = rawStyleSheetImports();

    // A regex that matched nothing would make both sets empty and the
    // comparison below vacuously true, so the parse is checked first.
    expect(raw.length).toBeGreaterThan(3);

    raw.forEach((specifier): void => {
      expect(
        specifier.startsWith(STYLES_IMPORT_PREFIX),
        `${ENTRY_MODULE} imports "${specifier}" from outside ` +
          `${STYLES_IMPORT_PREFIX}, where nothing in this file can see it.`,
      ).toBe(true);
    });

    const imported = raw
      .map((specifier): string => specifier.slice(STYLES_IMPORT_PREFIX.length))
      .sort();

    /*
     * Compared as SETS of paths, not as counts. A count equality is satisfied
     * by any rename that swaps one file for another - which is precisely what a
     * split like this one does file by file - and it would report the swap as
     * covered.
     */
    expect(
      imported,
      'The stylesheets under src/styles and the stylesheets main.tsx imports ' +
        'must be the same set. A globbed file that nothing imports ships no ' +
        'CSS while passing every assertion here; an imported file that the ' +
        'walk cannot see ships CSS that no assertion here has read.',
    ).toStrictEqual([...STYLE_SHEET_NAMES]);
  });

  /**
   * The import list is also a cascade decision. `editor.css` must be last, so
   * the shell's structural rules win over the surface rules of equal
   * specificity, and an alphabetised list would move it into the middle.
   */
  it('imports the shell sheet last', (): void => {
    const raw = rawStyleSheetImports();

    expect(raw[raw.length - 1]).toBe(`${STYLES_IMPORT_PREFIX}editor.css`);
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 21 - the distinct-selector inventory is a ceiling
 * ------------------------------------------------------------------ */

/**
 * Measured after the `03-10` sweep, on the eight files `Controls.css` split
 * into plus the four that were already here. The pre-sweep number was **339**;
 * thirteen distinct selectors were deleted and none was added, so the shrink is
 * a stated number rather than an impression.
 *
 * **It is a ceiling, not an equality.** An exact match forces a test edit on
 * every legitimate deletion, which trains people to bump the number reflexively
 * - and a number that gets bumped reflexively stops being a gate. A ceiling
 * fails only on GROWTH, which is the behaviour worth catching.
 *
 * **Maintenance rule** (also recorded in `coding-rules/frontend.md`): lower it
 * when rules are deleted; raise it only with a stated reason in the commit that
 * raises it.
 *
 * **Raised 326 -> 341 by `04-01` (D4-07).** Both numbers were MEASURED by
 * running this assertion before and after, not estimated: the pre-change
 * inventory was 326 and the post-change inventory is 341. The delta is one new
 * per-surface sheet, `src/styles/controls/mapStyle.css`, for the `Map style`
 * flyout - 15 selectors, and nothing else moved. The rail contributes ZERO new
 * selectors because `ToolRailRow` styles rows by id rather than by position, so
 * a seventh row needed no rule at all.
 *
 * **LOWERED 341 -> 331 by `04-07` (D4-04), and lowering is the half of the
 * maintenance rule that usually goes unread.** Both totals were MEASURED by
 * running this assertion with the ceiling set to 0, once against the pre-plan
 * stylesheets and once against these; neither is an estimate. Per file, also
 * measured:
 *
 * | sheet | before | after |
 * |---|---|---|
 * | `controls/colorPicker.css` | 17 | 12 |
 * | `controls/mapStyle.css` | 15 | 1 |
 * | `controls/selectionPanel.css` | 11 | 11 |
 * | `editor.css` | 94 | 105 |
 *
 * `colorPicker.css` lost the card, the `auto-fit` preset grid, the tile and its
 * hairline, the tile label, the active modifier, the check positioning, and the
 * custom-preview box, and gained the strip, its segments, three state rules,
 * the check, and the readout. `mapStyle.css`'s fourteen are a **MOVE, not a
 * deletion**, and are reported as one: its private section / label / pill /
 * swatch / field / error / ghost rules went into `editor.css`'s shared
 * `.panel-*` block rather than being copied into the Colors panel, which
 * `04-UI-SPEC.md` section 11 rule 1 names as a defect by name.
 * `selectionPanel.css` landing on the same number is a coincidence of the card
 * being replaced by one Porcelain row, not a sign it was untouched.
 *
 * The per-file numbers do not sum to the totals, and that is the metric
 * working: the inventory is DISTINCT selectors across every sheet, so a part
 * two sheets share is counted once.
 *
 * A ceiling that only ever goes up is not being read. This one went down.
 */
const SELECTOR_INVENTORY_CEILING = 331;

/**
 * Every selector a rule declares, one per comma-separated part.
 *
 * Counting parts rather than rules is what makes the metric independent of how
 * a rule happens to be grouped: `03-10` both split grouped selectors apart and
 * folded others together, and a rule count would have moved on that alone.
 *
 * `@keyframes` steps are excluded. `to` and `0%` parse as rule selectors here
 * because the walk does not special-case at-rules, but a keyframe step is not
 * something the stylesheet styles.
 */
function selectorsOf(rules: readonly CssRule[]): string[] {
  return rules
    .filter(
      (rule): boolean =>
        !rule.conditions.some((condition): boolean =>
          condition.startsWith('@keyframes'),
        ),
    )
    .flatMap((rule): string[] => rule.selector.split(','))
    .map((selector): string => selector.trim().replaceAll(/\s+/gu, ' '))
    .filter((selector): boolean => selector.length > 0);
}

function distinctSelectorInventory(): string[] {
  return [
    ...new Set(ALL_RULES.flatMap(([, rules]): string[] => selectorsOf(rules))),
  ].sort();
}

describe('Phase 3 selector inventory is a ceiling (assertion 21)', (): void => {
  it('keeps the distinct-selector inventory at or below the recorded ceiling', (): void => {
    const inventory = distinctSelectorInventory();

    /*
     * A ceiling is satisfied by ZERO, so the floor is asserted structurally
     * rather than as a second magic number: every discovered stylesheet must
     * contribute at least one selector. A walk that silently resolved to
     * nothing, or a parser that consumed a whole file, fails here instead of
     * reporting a very tidy inventory.
     */
    STYLE_SHEET_NAMES.forEach((name): void => {
      expect(
        selectorsOf(rulesOf(name)).length,
        `${name} contributed no selectors, so the inventory below is not ` +
          'measuring it.',
      ).toBeGreaterThan(0);
    });

    expect(
      inventory.length,
      `The distinct-selector inventory is ${inventory.length}, above the ` +
        `recorded ceiling of ${SELECTOR_INVENTORY_CEILING}. CSS mass ` +
        're-accumulates one reasonable rule at a time. Delete something, or ' +
        'raise the ceiling in the same commit and say why.',
    ).toBeLessThanOrEqual(SELECTOR_INVENTORY_CEILING);
  });

  /**
   * The count is taken from the parser, which strips comments, and NOT from a
   * text scan. A raw `grep -c` over a stylesheet counts comment text: a header
   * comment naming a class would inflate this number, and - the real hazard -
   * a comment naming a token or property that a neighbouring negative gate
   * greps for would satisfy or defeat that gate. This asserts the mechanism
   * directly, so swapping the parser for a text scan fails here rather than
   * quietly changing what every number in this file means.
   */
  it('counts parsed selectors and never comment text', (): void => {
    const fixture = [
      '/* .commented-out-selector { color: red; } */',
      '.real-one,',
      '.real-two {',
      '  color: inherit;',
      '}',
      '@keyframes probe-spin {',
      '  to {',
      '    transform: rotate(1turn);',
      '  }',
      '}',
    ].join('\n');

    expect(selectorsOf(parseRules(fixture))).toStrictEqual([
      '.real-one',
      '.real-two',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 10 - the panel track (D-19)
 * ------------------------------------------------------------------ */

const PANEL_STATE_ATTRIBUTE = 'data-panel-open';
const PANEL_STATE_VALUES = ['false', 'true'] as const;
const CLOSED_PANEL_WIDTH = '0px';
/**
 * `280px` -> `360px` under D4-05, which widens every flyout uniformly so the
 * panel edge never jumps between tools. **The literal moved; the mechanism did
 * not** - `CLOSED_PANEL_WIDTH` is unchanged, the `@property --panel-width`
 * `initial-value` is still the closed width, and the track is still
 * `grid-template-columns: var(--rail-width) var(--panel-width) 1fr`.
 *
 * The open value is now reached through a NAMED token rather than a literal,
 * because `editor.css` already spells `360px` for the compact sheet's height
 * cap and for a viewport discussion. `resolveEditorLength` below follows the
 * one alias so this assertion still rates the RESOLVED width - a `var()` that
 * resolved to nothing would otherwise read as a pass.
 */
const OPEN_PANEL_WIDTH = '360px';
const OPEN_PANEL_WIDTH_TOKEN = '--panel-width-open';
const RAIL_WIDTH = '56px';

/** Resolves one level of `var(--x)` against the tokens declared on `:root`. */
function resolveEditorLength(
  rootTokens: ReadonlyMap<string, string>,
  declared: string | undefined,
): string | undefined {
  if (declared === undefined) {
    return undefined;
  }
  const alias = /^var\(\s*(?<token>--[\w-]+)\s*\)$/u.exec(declared)?.groups
    ?.token;
  return alias === undefined ? declared : rootTokens.get(alias);
}

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

  it('resolves the track to 0px closed and 360px open', (): void => {
    const editorRules = rulesOf('editor.css');
    const rootTokens = tokensOf(findRule(editorRules, ':root'));
    const openTokens = tokensOf(
      findRule(editorRules, `.map-editor[${PANEL_STATE_ATTRIBUTE}='true']`),
    );

    expect(rootTokens.get('--rail-width')).toBe(RAIL_WIDTH);
    expect(rootTokens.get('--panel-width')).toBe(CLOSED_PANEL_WIDTH);
    expect(rootTokens.get(OPEN_PANEL_WIDTH_TOKEN)).toBe(OPEN_PANEL_WIDTH);
    expect(
      resolveEditorLength(rootTokens, openTokens.get('--panel-width')),
      'the open track does not resolve to the flyout width.',
    ).toBe(OPEN_PANEL_WIDTH);

    // The token is only the track if the track actually reads it.
    const shell = new Map(declarationsOf(findRule(editorRules, '.map-editor').body));
    expect(shell.get('grid-template-columns')).toBe(
      'var(--rail-width) var(--panel-width) 1fr',
    );
    expect(shell.get('block-size')).toBe('100dvh');
  });

  /**
   * D4-05's other half. The width is only *uniform* if every consumer reads the
   * same name: the panel body sizes the content column, and the help block's
   * cap is documented as "the panel's own measure", which makes it a DERIVED
   * value. A derived value written as a second literal drifts the next time the
   * panel moves - silently, because nothing renders wrong until someone
   * compares the two numbers.
   *
   * The negative half is what makes this a gate rather than a description: no
   * rule in `editor.css` may size a surface with a bare `360px`, so a future
   * reader cannot reintroduce the collision the token exists to prevent.
   *
   * Scoped to `editor.css` deliberately, and the scope is the point rather than
   * a convenience: the collision this token resolves is a THREE-WAY one inside
   * this one file. `MapCanvas.css:.map-workspace__warning` legitimately caps a
   * banner at `360px`, and reddening that rule would make the probe prove a
   * different claim than the one written above it.
   */
  it('reaches the open width through the token at all three consumers', (): void => {
    const editorRules = rulesOf('editor.css');
    const rootTokens = tokensOf(findRule(editorRules, ':root'));

    const body = new Map(
      declarationsOf(findRule(editorRules, '.tool-panel__body').body),
    );
    const help = new Map(
      declarationsOf(findRule(editorRules, '.map-workspace > .editor-help').body),
    );

    expect(resolveEditorLength(rootTokens, body.get('width'))).toBe(
      OPEN_PANEL_WIDTH,
    );
    expect(resolveEditorLength(rootTokens, help.get('max-inline-size'))).toBe(
      OPEN_PANEL_WIDTH,
    );

    const panelSizingProperties = new Set([
      'width',
      'inline-size',
      'max-inline-size',
      'min-inline-size',
      '--panel-width',
    ]);
    editorRules.forEach((rule): void => {
      declarationsOf(rule.body).forEach(([property, value]): void => {
        if (!panelSizingProperties.has(property)) {
          return;
        }
        expect(
          value.trim(),
          `editor.css: "${rule.selector}" sizes with a bare ${OPEN_PANEL_WIDTH}. ` +
            `In this stylesheet ${OPEN_PANEL_WIDTH} also means the compact ` +
            'sheet height cap and the narrowest contained viewport; the ' +
            `flyout width is var(${OPEN_PANEL_WIDTH_TOKEN}).`,
        ).not.toBe(OPEN_PANEL_WIDTH);
      });
    });
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
    /*
     * Production source only, for the same reason assertion 8 scans it: a test
     * that ASSERTS the attribute is doing its job, and counting it as a writer
     * would mean the gate goes red the first time anyone covers the rule it
     * enforces. `03-06` hit exactly that - a new `App.test.tsx` assertion on
     * `data-panel-open="false"` read as a second writer.
     *
     * This narrows WHO is scanned, never WHAT is required: the subject is still
     * "exactly one production file writes this attribute, and it writes only
     * the two enumerated literals".
     */
    const writers = productionComponentSources().filter(([, source]): boolean =>
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
 * D-20 - the narrow arrangement (plan 03-09)
 * ------------------------------------------------------------------ */

const LAYOUT_ATTRIBUTE = 'data-layout';
const LAYOUT_VALUES = ['compact', 'desktop'] as const;
const COMPACT_SHELL = `.map-editor[${LAYOUT_ATTRIBUTE}='compact']`;

function layoutValuesStyled(): string[] {
  const values = new Set<string>();

  everyRule().forEach((rule): void => {
    [
      ...rule.selector.matchAll(
        new RegExp(`\\[${LAYOUT_ATTRIBUTE}(?:=['"]?([^\\]'"]*)['"]?)?\\]`, 'gu'),
      ),
    ].forEach((match): void => {
      values.add(match[1] ?? '');
    });
  });

  return [...values].sort();
}

describe('Phase 3 narrow arrangement (D-20)', (): void => {
  /**
   * The narrow layout keys on an attribute, not on a media query, so the app
   * keeps exactly ONE 1200px literal - the one `useResponsiveLayout.ts` owns
   * and the one every focus-order and camera-owner assertion crosses. A CSS
   * copy of that number is a second breakpoint the moment either moves.
   */
  it('introduces no second breakpoint anywhere in the stylesheets', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        rule.conditions.forEach((condition): void => {
          expect(
            /\b1[12]\d\d(?:\.\d+)?px\b/u.test(condition),
            `${file}: "${rule.selector}" is conditioned on ${condition}, which ` +
              'restates the layout breakpoint. `useResponsiveLayout.ts` owns ' +
              'the only copy of it and publishes `data-layout`.',
          ).toBe(false);
        });
      });
    });
  });

  it('styles exactly the two layouts the attribute is allowed to hold', (): void => {
    const styled = layoutValuesStyled();

    expect(styled.length).toBeGreaterThan(0);
    styled.forEach((value): void => {
      expect(
        (LAYOUT_VALUES as ReadonlyArray<string>).includes(value),
        `"${value}" is styled off the layout attribute, which is two-valued so ` +
          'a contract assertion can enumerate it.',
      ).toBe(true);
    });
  });

  /**
   * Same shape as assertion 10's writer half, and for the same reason: two
   * writers is how two surfaces come to disagree about which layout is on
   * screen while both of them "work".
   */
  it('has exactly one writer, and it writes only the layout hook value', (): void => {
    const writers = productionComponentSources().filter(([, source]): boolean =>
      source.includes(`${LAYOUT_ATTRIBUTE}=`),
    );

    expect(
      writers.map(([file]): string => file),
      'the layout attribute must have exactly one writer.',
    ).toHaveLength(1);

    const [file, source] = writers[0];
    expect(
      new RegExp(`${LAYOUT_ATTRIBUTE}=\\{layout\\}`, 'u').test(source),
      `${file}: the layout attribute must be written straight from the ` +
        'responsive hook, so it cannot go absent or take a third value.',
    ).toBe(true);
  });

  /**
   * D-20's three structural claims, read off the stylesheet: one column with
   * the bar as its own row, the sheet placed in the CANVAS cell (which is what
   * makes it an overlay rather than a fourth track), and the sheet's height
   * driven by the registered property so it interpolates instead of snapping.
   */
  it('collapses to one column with the sheet over the canvas cell', (): void => {
    const editorRules = rulesOf('editor.css');
    const shell = new Map(declarationsOf(findRule(editorRules, COMPACT_SHELL).body));

    expect(shell.get('grid-template-columns')).toBe('1fr');
    expect(shell.get('grid-template-rows')).toBe('1fr auto');

    const bar = new Map(
      declarationsOf(findRule(editorRules, `${COMPACT_SHELL} .tool-rail`).body),
    );
    const sheet = new Map(
      declarationsOf(findRule(editorRules, `${COMPACT_SHELL} .tool-panel`).body),
    );
    const canvas = new Map(
      declarationsOf(
        findRule(editorRules, `${COMPACT_SHELL} .map-workspace`).body,
      ),
    );

    expect(bar.get('grid-row')).toBe('2');
    // The sheet and the canvas region share one cell: that is the overlay.
    expect(sheet.get('grid-row')).toBe(canvas.get('grid-row'));
    expect(sheet.get('grid-column')).toBe(canvas.get('grid-column'));
    expect(sheet.get('align-self')).toBe('end');
    expect(sheet.get('block-size')).toBe('var(--panel-height)');

    const openTokens = tokensOf(
      findRule(
        editorRules,
        `${COMPACT_SHELL}[${PANEL_STATE_ATTRIBUTE}='true']`,
      ),
    );
    expect(openTokens.get('--panel-height')).toBeDefined();
    expect(
      tokensOf(findRule(editorRules, ':root')).get('--panel-height'),
    ).toBe(CLOSED_PANEL_WIDTH);
  });

  it('registers the sheet height and animates that, not the track list', (): void => {
    const editorCss = readStyleSheet('./editor.css');
    const registration =
      /@property\s+--panel-height\s*\{(?<body>[^}]*)\}/u.exec(editorCss)?.groups
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
      animated.some((value): boolean => value.includes('--panel-height')),
      'nothing transitions the registered sheet height, so the bottom sheet ' +
        'snaps up instead of rising.',
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 27 - exactly one roving-tabindex writer
 * ------------------------------------------------------------------ */

/**
 * A tabindex WRITE, wherever it is spelled: the JSX attribute, d3's `.attr`,
 * and the raw DOM setter. Line-scoped because every one of these is written on
 * one line in this codebase, and a multi-line window would have to guess where
 * the value ends.
 */
const TAB_INDEX_WRITE_PATTERN =
  /(?:\.attr\(\s*['"]tabindex['"]\s*,|setAttribute\(\s*['"]tabindex['"]\s*,|tabIndex=\{)(?<value>.*)$/u;

/**
 * A STATIC tab stop writes a bare literal `0` or `-1` and nothing else.
 * Anything that computes the value per element - a callback, a ternary, a
 * variable - is a roving writer.
 */
const STATIC_TAB_INDEX_PATTERN = /^\s*['"]?-?[01]['"]?\s*[),}]/u;

function rovingTabIndexWriters(): ReadonlyArray<string> {
  const writers = new Set<string>();

  productionComponentSources().forEach(([file, source]): void => {
    stripSourceComments(source)
      .split('\n')
      .forEach((line): void => {
        const match = TAB_INDEX_WRITE_PATTERN.exec(line);
        if (match === null) {
          return;
        }
        if (STATIC_TAB_INDEX_PATTERN.test(match.groups?.value ?? '')) {
          return;
        }
        writers.add(file);
      });
  });

  return [...writers].sort();
}

describe('Phase 3 one roving-tabindex writer (assertion 27)', (): void => {
  /**
   * There is exactly one, restored in commit `074173e`
   * (`applyRovingTabStop` in `MapCanvas.tsx`), and a second is the regression
   * class that commit fixed: two writers disagree about which element holds
   * the single tab stop, so the creator tabs into a control that then hands
   * focus somewhere else, and every individual control still "works".
   *
   * The rail is the obvious place for a second one to appear - six
   * near-identical icon rows look like a roving group - so its rows are plain
   * tab stops instead. This is asserted as the SET of files, not as a count:
   * a count is satisfied by moving the writer, and the point is which file
   * owns it.
   *
   * **`04-07` added the second name, deliberately and with its reason.** The
   * defect this gate covers is an UNNAMED writer - two files silently
   * disagreeing about which element holds the single tab stop - not the
   * existence of a second roving GROUP. `RampStrip.tsx` is one: A5 requires the
   * five segments to be a single tab stop with arrow-key traversal, the
   * alternative (a focusable container plus `aria-activedescendant`) would put
   * the focus ring on the container rather than on the segment and break the
   * inset-ring requirement, and the two groups can never contend because the
   * canvas and the panel own disjoint elements. Because this is a SET, adding a
   * third still fails here and still has to say why.
   */
  it('has exactly one per roving group, and both owners are named', (): void => {
    expect(
      rovingTabIndexWriters(),
      'a production file computes a tabindex per element and is not one of the ' +
        'two named owners. The rail rows are plain tab stops; a roving group ' +
        'there is the regression commit 074173e fixed.',
    ).toStrictEqual(['components/MapCanvas.tsx', 'components/RampStrip.tsx']);
  });

  /**
   * The classifier has to be able to tell the two apart, or the assertion
   * above passes by never recognising anything. Both halves are exercised
   * against strings in the same test, so `['components/MapCanvas.tsx']` is a
   * measurement rather than a value the helper can only ever return.
   */
  it('separates a computed tabindex from a literal one', (): void => {
    const classify = (line: string): boolean => {
      const match = TAB_INDEX_WRITE_PATTERN.exec(line);
      return (
        match !== null &&
        !STATIC_TAB_INDEX_PATTERN.test(match.groups?.value ?? '')
      );
    };

    expect(classify('        tabIndex={0}')).toBe(false);
    expect(classify('        tabIndex={-1}')).toBe(false);
    expect(classify("    element.setAttribute('tabindex', '-1');")).toBe(false);
    expect(classify('      tabIndex={isActive ? 0 : -1}')).toBe(true);
    expect(
      classify("  paths.attr('tabindex', (candidate): number =>"),
    ).toBe(true);
    expect(classify("  row.setAttribute('tabindex', String(next));")).toBe(true);
    expect(classify('        aria-expanded={isOpen}')).toBe(false);
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
 * Assertion 13 (source half) - the period surface is manifest-driven
 * ------------------------------------------------------------------ */

describe('Phase 3 period surface source (assertion 13)', (): void => {
  const periodHudSource = (): string => {
    const entry = COMPONENT_SOURCES.find(
      ([name]): boolean => name === 'components/editor/PeriodHud.tsx',
    );
    if (entry === undefined) {
      throw new Error('PeriodHud.tsx is missing from the component sources.');
    }
    return entry[1];
  };

  /**
   * `SNAPSHOT_CATALOG` is a five-entry LABEL registry, not an approval list.
   * A period surface that read it directly would make four deferred snapshots
   * nameable in the UI (Immutable Safety Constraint 3, Live Invariant 6). The
   * surface renders `resolvePeriodOptions` output only, which its owner hands
   * it through the `periods` prop.
   */
  it('never references the snapshot label registry', (): void => {
    expect(
      stripSourceComments(periodHudSource()).includes(
        ['SNAPSHOT', 'CATALOG'].join('_'),
      ),
      'PeriodHud reads the five-entry label registry directly. The surface ' +
        'renders resolved manifest options only; the registry would name ' +
        'four deferred snapshots.',
    ).toBe(false);
  });

  /**
   * D-15: the ids are byte-identical to their Phase 2 values. The status id is
   * an `aria-describedby` target as well as a live region, and the select id
   * is queried by the e2e fixture's NFR3 diagnostics.
   */
  it('keeps both period ids byte-identical to their Phase 2 values', (): void => {
    const source = periodHudSource();

    expect(source).toContain("'composition-bar-period-status'");
    expect(source).toContain("'composition-bar-period'");
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });

  /**
   * D-14: the interactive `<select>` path must remain REACHABLE IN CODE, not
   * deleted - a second approved manifest entry returns the surface to a
   * select with no copy change and no component rewrite.
   */
  it('keeps the interactive select path reachable in code', (): void => {
    expect(periodHudSource()).toContain('<select');
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 23 - the ToastRegion allowlist is pinned by hard numbers
 * ------------------------------------------------------------------ */

/**
 * The counts are LITERALS, deliberately not derived from the tables they
 * count: `03-06` and `03-07` both claim "this phase introduces no new toast,
 * status, or live-region message", and the way that claim stays true is that
 * growing the allowlist - or its positive-test file - fails a hard number
 * here. If the allowlist grows, a message was introduced without a test.
 */
const APPROVED_STATIC_MESSAGE_SOURCE_ENTRIES = 25;
const APPROVED_LOAD_WARNING_SOURCE_ENTRIES = 7;
const APPROVED_PERIOD_ANNOUNCEMENT_COUNT = 11;
const TOAST_REGION_POSITIVE_TEST_COUNT = 14;
const TOAST_DYNAMIC_PATTERN_NAMES = [
  'CENTERED_MESSAGE_PATTERN',
  'COLOR_MESSAGE_PATTERN',
  'LEGEND_REORDER_MESSAGE_PATTERN',
  'SELECTION_MESSAGE_PATTERN',
] as const;

/**
 * An allowlist ENTRY line: a quoted or template string literal, a spread, or
 * a named constant.
 */
const ALLOWLIST_ENTRY_PATTERN =
  /^\s*(?:'.*',|`.*`,|\.\.\.[A-Za-z_]\w*,|[A-Z][A-Z_]*,)$/u;

function componentSource(name: string): string {
  const entry = COMPONENT_SOURCES.find(([file]): boolean => file === name);
  if (entry === undefined) {
    throw new Error(`${name} is missing from the component sources.`);
  }
  return entry[1];
}

function countAllowlistEntries(source: string, setName: string): number {
  const block = new RegExp(
    `const ${setName} = (?:new Set<string>\\()?\\[(?<body>[\\s\\S]*?)\\]`,
    'u',
  ).exec(source)?.groups?.body;
  if (block === undefined) {
    throw new Error(`${setName} block not found.`);
  }
  return stripSourceComments(block)
    .split('\n')
    .filter((line): boolean => ALLOWLIST_ENTRY_PATTERN.test(line)).length;
}

describe('Phase 3 toast allowlist is unchanged (assertion 23)', (): void => {
  it('pins the allowlist entry counts as hard numbers', (): void => {
    const source = componentSource('components/ToastRegion.tsx');

    expect(
      countAllowlistEntries(source, 'APPROVED_STATIC_MESSAGES'),
      'APPROVED_STATIC_MESSAGES grew or shrank. A new entry is a new ' +
        'creator-facing message: it needs its own positive test, and this ' +
        'phase claims to introduce none.',
    ).toBe(APPROVED_STATIC_MESSAGE_SOURCE_ENTRIES);

    expect(
      countAllowlistEntries(source, 'APPROVED_LOAD_WARNING_MESSAGES'),
    ).toBe(APPROVED_LOAD_WARNING_SOURCE_ENTRIES);

    expect(APPROVED_PERIOD_ANNOUNCEMENTS).toHaveLength(
      APPROVED_PERIOD_ANNOUNCEMENT_COUNT,
    );
  });

  it('pins the dynamic patterns as an enumerated set', (): void => {
    const source = componentSource('components/ToastRegion.tsx');
    const declared = [
      ...source.matchAll(/const ([A-Z_]+_MESSAGE_PATTERN)\s*=/gu),
    ]
      .map((match): string => match[1])
      .sort();

    expect(declared).toStrictEqual([...TOAST_DYNAMIC_PATTERN_NAMES]);

    // The guard consults exactly the enumerated checks - a pattern declared
    // but not consulted would be an allowlist entry that allows nothing.
    const guard = /function getSafeMessage[\s\S]*?\n\}/u.exec(source)?.[0] ?? '';
    expect(guard).toContain('APPROVED_STATIC_MESSAGES.has');
    expect(guard).toContain('SELECTION_MESSAGE_PATTERN.test');
    expect(guard).toContain('COLOR_MESSAGE_PATTERN.test');
    expect(guard).toContain('CENTERED_MESSAGE_PATTERN.test');
    expect(guard).toContain('isApprovedLegendReorderMessage');
  });

  it('pins the positive-test count of the allowlist suite', (): void => {
    const testSource = componentSource('components/ToastRegion.test.tsx');
    const testCount = [...testSource.matchAll(/^\s*it\(/gmu)].length;

    expect(
      testCount,
      'ToastRegion.test.tsx changed size. If the allowlist grew, a message ' +
        'was introduced without a test; if a test disappeared, an approved ' +
        'message lost its evidence.',
    ).toBe(TOAST_REGION_POSITIVE_TEST_COUNT);
  });

  /**
   * The entry classifier exercised both ways in the same test, so the pinned
   * counts are measurements rather than the only values the helper can
   * return.
   */
  it('separates an allowlist entry line from a non-entry line', (): void => {
    expect(ALLOWLIST_ENTRY_PATTERN.test("  'Saved map loaded.',")).toBe(true);
    expect(
      ALLOWLIST_ENTRY_PATTERN.test('  `template-composed warning entry`,'),
    ).toBe(true);
    expect(
      ALLOWLIST_ENTRY_PATTERN.test('  ...APPROVED_PERIOD_ANNOUNCEMENTS,'),
    ).toBe(true);
    expect(ALLOWLIST_ENTRY_PATTERN.test('  EXPORT_FAILURE_MESSAGE,')).toBe(
      true,
    );
    expect(ALLOWLIST_ENTRY_PATTERN.test('  // a comment about a message')).toBe(
      false,
    );
    expect(ALLOWLIST_ENTRY_PATTERN.test('] as const;')).toBe(false);
    expect(ALLOWLIST_ENTRY_PATTERN.test('')).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Export isolation - carried forward from Phase 2 at high priority
 * ------------------------------------------------------------------ */

/**
 * Everything the export clone can carry.
 *
 * **The reason, restated for the post-D-34 world.** The Phase 2 justification
 * for this guard was a rasterizer-mismatch argument about the retired
 * third-party rasterizer, and that argument went false when D-34 removed it
 * from the export path.
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
  /**
   * The "declared nowhere else" half of this claim moved into assertion 4,
   * which now guards the whole mode-invariant family rather than these two
   * alone. What stays here is the shape of the two frame values: they are the
   * creator's only signal of what the PNG crops to, and a hex here would mean
   * the scrim stopped being a scrim.
   */
  it('declares the frame tokens as translucent values in the unconditioned root', (): void => {
    const themeRules = rulesOf('theme.css');
    const rootTokens = tokensOf(findRule(themeRules, ':root'));

    FRAME_TOKENS.forEach((token): void => {
      expect(resolveTokenValue(rootTokens, token)).toMatch(/^rgba\(/u);
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

/*
 * Kept exported-by-use so the ported helpers cannot rot unnoticed. Since `04-01`
 * the contrast half is imported from `src/utils/contrast.ts` rather than defined
 * here, so this also asserts the import is wired to the same arithmetic Phase 2
 * shipped - a module swap that changed the numbers would surface here as well as
 * in `contrast.test.ts`.
 */
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

/* ------------------------------------------------------------------ *
 * The Phase 3 token system - assertions 1-6 and 26
 * ------------------------------------------------------------------ */

/**
 * Assembled rather than written out, for the same reason the observer
 * identifier above is. This file is a `.ts` and the scan below reads `.css`, so
 * spelling it would not currently poison the gate - but `03-09` and `03-10` add
 * more scanners over more file kinds, and a gate that greps for a literal it
 * also contains is one glob change away from being unable to fail.
 */
const OS_COLOR_SCHEME_FEATURE = ['prefers', 'color', 'scheme'].join('-');

/**
 * Assertion 2's subject: every token name the Phase 3 system RETIRED. They are
 * deleted, never aliased, so a stale reference fails here instead of resolving
 * to a compatibility shim and looking migrated.
 *
 * Matching is name-boundary aware on purpose. A plain substring test would
 * report `--accent-fill` as the retired `--accent`, and `--accent-fill` is a
 * token this phase deliberately ADDS - a scan that cannot tell them apart would
 * have to be loosened or deleted, and a loosened scan is how the retired name
 * comes back.
 */
const RETIRED_TOKENS = [
  '--accent',
  '--accent-hover',
  '--accent-contrast',
  '--surface-page',
  '--surface-card',
  '--surface-hover',
  '--surface-pressed',
  '--surface-accent-tint',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--border-default',
  '--border-strong',
  '--glass-app-bar',
  '--glass-inspector',
  '--glass-navigation',
  '--glass-blur-app-bar',
  '--glass-blur-inspector',
  '--glass-blur-navigation',
  '--shadow-inspector',
  '--shadow-navigation',
  '--modal-shadow',
  '--toast-shadow',
  '--font-label',
  '--font-body',
  '--font-heading',
  '--font-display',
  '--weight-regular',
  '--weight-semibold',
  '--radius-large',
  '--map-shadow',
  '--mixed-color-light',
  '--mixed-color-dark',
  '--active-check-border',
  '--active-check-surface',
  '--active-check-text',
  '--motion-fast',
  '--motion-camera',
  '--easing-camera',
  '--easing-control',
  /*
   * CF-7 / D-05, retired by `03-10`. The toast severity surfaces that consumed
   * them are neutral now and the partial-data banner is Porcelain chrome, so
   * the product carries exactly two semantic colours: Apple Blue and the
   * destructive family. Listed here rather than merely deleted from
   * `theme.css`, because a deleted declaration and a stale `var()` reference
   * look identical at run time - the reference just resolves to nothing.
   */
  '--success',
  '--success-tint',
  '--warning',
  '--warning-tint',
] as const;

/** Identical in both modes by contract, so parity is an equality, not a flip. */
const FIXED_TRIO = [
  '--themely-media-backdrop',
  '--themely-on-accent',
  '--themely-on-media',
] as const;

/**
 * The export firewall. Every one of these is declared exactly once, in the
 * unconditioned `:root`, and nowhere else - not in `.dark`, not in a media
 * query, not in a supports block. One of them redefined elsewhere makes the
 * exported PNG follow the viewer's theme, which no rendering test catches
 * (Live Invariant 9).
 *
 * The last two are chrome rather than export, and share the mechanism for a
 * different reason: white on `#0071e3` is 4.70:1 while the flipping accent
 * would give 3.02:1 in dark. Assertion 26 states that reason as a measurement.
 */
const MODE_INVARIANT_TOKENS = [
  '--map-surface',
  '--map-fill-default',
  '--map-border-default',
  '--map-border-hover',
  '--map-border-selected',
  '--map-border-focus',
  '--map-fixed-text',
  '--map-skeleton-fill',
  '--map-skeleton-stroke',
  '--map-frame-edge',
  '--map-frame-scrim',
  '--swatch-border',
  '--tooltip-surface',
  '--tooltip-text',
  '--tooltip-border',
  '--tooltip-shadow',
  '--accent-fill',
  '--accent-fill-hover',
] as const;

/** Zeroed under `prefers-reduced-motion`. The easings are curves, not times. */
const MOTION_DURATION_TOKENS = [
  '--motion-duration-fast',
  '--motion-duration-base',
  '--motion-duration-slow',
  '--motion-scene',
] as const;

const REDUCED_MOTION_CONDITION = '@media (prefers-reduced-motion: reduce)';

function themeRules(): CssRule[] {
  return rulesOf('theme.css');
}

function unconditionedRootTokens(): Map<string, string> {
  return tokensOf(findRule(themeRules(), ':root'));
}

function unconditionedDarkTokens(): Map<string, string> {
  return tokensOf(findRule(themeRules(), '.dark'));
}

/** Every stylesheet's source with comments removed, joined once. */
function allStyleSheetSource(): string {
  return STYLE_SHEETS.map(([, css]): string => stripComments(css)).join('\n');
}

/**
 * Resolves the palette THROUGH THE REAL CASCADE for one mode and one set of
 * matching preference at-rules.
 *
 * Ported from `resolveRootTokens` in the Phase 2 contract test and extended for
 * the class-based flip. Two properties matter and both are load-bearing:
 *
 * - `.dark` and `:root` have EQUAL specificity (a class and a pseudo-class are
 *   both 0-1-0), so source order decides. Iterating the rules in file order and
 *   letting later writes win is therefore the browser's own resolution, not an
 *   approximation of it.
 * - That is precisely why a preference block must override a literal for BOTH
 *   `:root` and `.dark`: a `:root` override authored inside `prefers-contrast`
 *   comes AFTER the top-level `.dark` block and wins in dark mode unless the
 *   same at-rule answers it. This resolver reproduces that, so the matrix can
 *   actually fail on the defect rather than describing it.
 */
function resolvePaletteTokens(
  mode: 'light' | 'dark',
  active: readonly string[],
): Map<string, string> {
  const selectors = mode === 'dark' ? [':root', '.dark'] : [':root'];
  const resolved = new Map<string, string>();

  themeRules()
    .filter(
      (rule): boolean =>
        selectors.includes(rule.selector) &&
        rule.conditions.every((condition): boolean =>
          active.includes(condition),
        ),
    )
    .forEach((rule): void => {
      tokensOf(rule).forEach((value, token): void => {
        resolved.set(token, value);
      });
    });

  return resolved;
}

/** A rule that paints something, as opposed to one that declares tokens. */
function isRenderingRule(rule: CssRule): boolean {
  return rule.selector !== ':root' && rule.selector !== '.dark';
}

describe('Phase 3 dark mode is a class, not a preference (assertion 1)', (): void => {
  /**
   * D-30. The theme is an explicit control the creator operates, persisted
   * through the storage adapter, defaulting to light when the key is absent.
   * An operating-system query anywhere in the dark path would give a second,
   * invisible writer of the same state - and it would silently un-do the whole
   * reason the flip became a class, which is that a host embedding this editor
   * decides its own theme.
   *
   * Scanned as raw text as well as through parsed conditions: an at-rule with
   * no rules inside it produces no conditions at all, so the parser alone would
   * not see a query that is one edit away from being populated.
   */
  it('carries no operating-system colour preference in any stylesheet', (): void => {
    STYLE_SHEETS.forEach(([file, css]): void => {
      expect(
        stripComments(css).includes(OS_COLOR_SCHEME_FEATURE),
        `${file}: the dark palette flips from a class on the editor mount ` +
          'root. An OS colour preference here is a second writer of the theme ' +
          'that no control can override.',
      ).toBe(false);
    });

    everyRule().forEach((rule): void => {
      rule.conditions.forEach((condition): void => {
        expect(condition.includes(OS_COLOR_SCHEME_FEATURE)).toBe(false);
      });
    });
  });

  /**
   * The other half of the same rule. `03-06` puts the theme in React state and
   * gives it a control, so from here on the cheapest way to reintroduce the
   * defect is a one-line `matchMedia('(prefers-color-scheme: dark)')` in a
   * hook - which reads as a helpful default and is invisible to the stylesheet
   * scan above.
   *
   * Production source only: the assertions that FORBID the query have to be
   * able to name it, and counting a test as a violation is how a gate goes red
   * the first time anyone covers the rule it enforces.
   */
  it('reads no operating-system colour preference in any production module', (): void => {
    const offenders = [
      ...collectFiles(SOURCE_DIRECTORY, '.ts'),
      ...collectFiles(SOURCE_DIRECTORY, '.tsx'),
    ]
      .filter((name): boolean => !/\.test\.tsx?$/u.test(name))
      .filter((name): boolean =>
        stripSourceComments(
          fileSystem().readFileSync(new URL(name, SOURCE_DIRECTORY), 'utf8'),
        ).includes(OS_COLOR_SCHEME_FEATURE),
      )
      .sort();

    expect(
      offenders,
      'D-30: the theme is an explicit creator choice persisted through the ' +
        'storage adapter, and light is the absent-key default. An OS query ' +
        'here is a second writer no control and no host can override.',
    ).toStrictEqual([]);
  });

  it('keeps the four legitimate preference queries', (): void => {
    const source = allStyleSheetSource();

    [
      'prefers-reduced-motion',
      'prefers-reduced-transparency',
      'prefers-contrast',
      'forced-colors',
    ].forEach((feature): void => {
      expect(
        source.includes(feature),
        `"${feature}" is orthogonal to the colour scheme and D-30 does not ` +
          'touch it. Losing it here is an accessibility regression that looks ' +
          'like a cleanup.',
      ).toBe(true);
    });
  });

  /**
   * The class has to be spelled the same way everywhere or the flip is a no-op
   * on half the palette. `.dark` is Themely's own selector, which is what lets
   * a host's `globals.css` become the token source with no shim.
   */
  it('declares the dark palette on the class the mount root carries', (): void => {
    const darkTokens = unconditionedDarkTokens();

    expect(darkTokens.size).toBeGreaterThan(0);
    expect(
      new Map(declarationsOf(findRule(themeRules(), '.dark').body)).get(
        'color-scheme',
      ),
      'native controls and scrollbars follow `color-scheme`, so the dark ' +
        'palette without it leaves white scrollbars on a black wall.',
    ).toBe('dark');
  });
});

describe('Phase 3 retired tokens are deleted, not aliased (assertion 2)', (): void => {
  it('references no retired token name in any stylesheet', (): void => {
    STYLE_SHEETS.forEach(([file, css]): void => {
      const source = stripComments(css);

      RETIRED_TOKENS.forEach((token): void => {
        const boundary = new RegExp(
          `(?<![\\w-])${token}(?![\\w-])`,
          'u',
        );
        expect(
          boundary.test(source),
          `${file}: "${token}" was retired by the Phase 3 token system and ` +
            'deleted rather than aliased, so this reference resolves to ' +
            'nothing. Migrate it to its replacement.',
        ).toBe(false);
      });
    });
  });

  /**
   * The list above is only as good as its ability to tell a retired name from
   * the token that replaced it. `--accent` and `--accent-fill` share a prefix
   * and have opposite dispositions, so the boundary matching is asserted
   * directly - if it ever degrades to a substring test, this fails before the
   * assertion above starts reporting the new token as the old one.
   */
  it('distinguishes a retired name from the token that replaced it', (): void => {
    const boundary = new RegExp('(?<![\\w-])--accent(?![\\w-])', 'u');

    expect(boundary.test('background: var(--accent-fill);')).toBe(false);
    expect(boundary.test('.onboarding__action--accent {')).toBe(false);
    expect(boundary.test('background: var(--accent);')).toBe(true);
  });
});

describe('Phase 3 palette parity (assertion 3)', (): void => {
  /**
   * Every `--themely-*` token declared in one mode must be declared in the
   * other. A token present in `:root` and missing from `.dark` does not fail
   * loudly - it inherits the light value and paints a light chip on a black
   * wall, which is exactly the class of defect a palette split across two
   * blocks invites.
   */
  it('declares the same token set in both modes', (): void => {
    const light = [...unconditionedRootTokens().keys()]
      .filter((token): boolean => token.startsWith('--themely-'))
      .sort();
    const dark = [...unconditionedDarkTokens().keys()]
      .filter((token): boolean => token.startsWith('--themely-'))
      .sort();

    expect(light.length).toBe(14);
    expect(dark, 'the light and dark palettes must declare the same names').
      toStrictEqual(light);
  });

  it('keeps the fixed trio identical and every other token genuinely flipped', (): void => {
    const light = unconditionedRootTokens();
    const dark = unconditionedDarkTokens();

    let compared = 0;

    [...light.keys()]
      .filter((token): boolean => token.startsWith('--themely-'))
      .forEach((token): void => {
        const isFixed = (FIXED_TRIO as ReadonlyArray<string>).includes(token);

        if (isFixed) {
          expect(
            dark.get(token),
            `"${token}" is identical in both modes by contract.`,
          ).toBe(light.get(token));
        } else {
          expect(
            dark.get(token),
            `"${token}" holds the same value in both modes. Either it should ` +
              'be in the fixed trio, or the dark value was pasted from light.',
          ).not.toBe(light.get(token));
        }
        compared += 1;
      });

    expect(compared).toBe(14);
    expect(FIXED_TRIO).toHaveLength(3);
  });
});

describe('Phase 3 export firewall (assertions 4 and 5)', (): void => {
  /**
   * Live Invariant 9, extended to `.dark`. Phase 2 guarded media and supports
   * blocks because those were the only places a redefinition could hide; the
   * class-based flip adds a third, and it is the likeliest one - `.dark` is
   * where every other colour token legitimately gets a second value.
   */
  it('declares no export token outside the unconditioned root', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        if (rule.conditions.length === 0 && rule.selector === ':root') {
          return;
        }
        declarationsOf(rule.body).forEach(([property]): void => {
          expect(
            (MODE_INVARIANT_TOKENS as ReadonlyArray<string>).includes(property),
            `${file}: "${property}" is mode-invariant and must stay fixed; ` +
              `found under [${rule.conditions.join(' > ')}] ${rule.selector}. ` +
              'Redefining it makes the exported PNG follow the viewer theme.',
          ).toBe(false);
        });
      });
    });
  });

  it('declares every export token exactly once, and gives each one a consumer', (): void => {
    const themeSource = stripComments(readStyleSheet('./theme.css'));
    const source = allStyleSheetSource();
    const root = unconditionedRootTokens();

    MODE_INVARIANT_TOKENS.forEach((token): void => {
      const declarations = [...themeSource.matchAll(/(--[\w-]+)\s*:/gu)].filter(
        (match): boolean => match[1] === token,
      );
      expect(declarations, `"${token}" is declared more than once`).toHaveLength(
        1,
      );

      expect(root.has(token), `"${token}" is not in the light root`).toBe(true);

      expect(
        source.includes(`var(${token})`),
        `"${token}" is declared and gated as a fixed export token but nothing ` +
          'reads it, so the guard describes a treatment the map does not have.',
      ).toBe(true);
    });

    expect(MODE_INVARIANT_TOKENS).toHaveLength(18);
  });
});

describe('Phase 3 motion tokens (assertion 6)', (): void => {
  /**
   * A reduced-motion assertion on a token nothing reads proves nothing: three
   * motion tokens were once declared, gated, and read only by the TS mirror,
   * while the gate that "covered" them accepted the mirror as a consumer.
   * `03-04` gave all three a rendering consumer, so the consumer set here is
   * back to Phase 2's: a `var()` in a rule that paints, or a named read in
   * `utils/motion.ts`. The mirror is excluded on purpose.
   */
  it('gives every motion token a consumer that actually renders', (): void => {
    const motionUtils = readStyleSheet('../utils/motion.ts');
    const renderingSource = ALL_RULES.flatMap(([, rules]): string[] =>
      rules.filter(isRenderingRule).map((rule): string => rule.body),
    ).join('\n');

    const motionTokens = [...unconditionedRootTokens().keys()].filter(
      (token): boolean => token.startsWith('--motion-'),
    );

    expect(motionTokens).toHaveLength(7);

    motionTokens.forEach((token): void => {
      expect(
        renderingSource.includes(`var(${token})`) ||
          motionUtils.includes(token),
        `"${token}" is declared and reduced-motion-gated but nothing renders ` +
          'with it and no runtime read resolves it.',
      ).toBe(true);
    });
  });

  it('zeroes every motion duration under reduced motion', (): void => {
    const reduced = tokensOf(
      findRule(themeRules(), ':root', [REDUCED_MOTION_CONDITION]),
    );

    MOTION_DURATION_TOKENS.forEach((token): void => {
      expect(reduced.get(token), `${token} under reduced motion`).toBe('0ms');
    });
    expect(MOTION_DURATION_TOKENS).toHaveLength(4);
  });

  /**
   * **A8, `04-07`: hover paint on a palette is INSTANT.** Themely's own words,
   * carried into D-29 — an ease here is "a regression, not polish". A 150ms
   * fade between two five-step shades is not a flourish; it is the creator
   * waiting to find out what colour they just picked.
   *
   * The subject is real and the default is against us: `theme.css` gives every
   * `button` a `background-color` transition, so the ramp segments inherit one
   * unless something cancels it. Two halves, because either alone is weak —
   * the surfaces must RESOLVE to `transition: none`, AND no rule anywhere may
   * transition a background on a selector that reaches them.
   *
   * Counted from the PARSER, never `grep -c`: a comment naming a property
   * would satisfy a text scan, and this very file's comments name several.
   */
  it('lets no transition touch the ramp strip or the family pills', (): void => {
    const instantSurfaces = ['.ramp-strip__step', '.panel-pill'] as const;

    instantSurfaces.forEach((selector): void => {
      const declared = ALL_RULES.flatMap(([, rules]): string[] =>
        rules
          .filter((rule): boolean =>
            rule.selector
              .split(',')
              .some((part): boolean => part.trim() === selector),
          )
          .flatMap((rule): string[] =>
            declarationsOf(rule.body)
              .filter(([property]): boolean => property === 'transition')
              .map(([, value]): string => value.trim()),
          ),
      );

      expect(
        declared,
        `"${selector}" declares no transition at all, so it inherits the ` +
          "global button background fade from theme.css. Hover paint on a " +
          'palette is instant; declare `transition: none`.',
      ).toContain('none');
    });

    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        const touchesStrip = instantSurfaces.some((selector): boolean =>
          rule.selector.includes(selector),
        );
        if (!touchesStrip) {
          return;
        }

        declarationsOf(rule.body).forEach(([property, value]): void => {
          if (!property.startsWith('transition')) {
            return;
          }
          expect(
            value.trim(),
            `${file}: "${rule.selector}" animates "${value.trim()}". An ease ` +
              'between two ramp shades is a regression, not polish.',
          ).toBe('none');
        });
      });
    });
  });
});

describe('Phase 3 accent fill is mode-invariant (assertion 26)', (): void => {
  /**
   * The measurement, not the preference: white on `#0071e3` is 4.70:1 and
   * clears AA; white on the dark accent `#2997ff` is 3.02:1 and does not, and
   * neither does its hover pair at 4.18:1. `Export PNG` is a filled primary in
   * both modes, so its fill cannot be the flipping token.
   *
   * This resolves the DECLARATION rather than the token, in both modes, so
   * pointing `--accent-fill` at `var(--themely-apple-blue)` fails here as well
   * as in the contrast matrix - the tidy-looking change has two gates on it.
   */
  it('resolves the Export fill to the light Apple Blue in both modes', (): void => {
    const primary = new Map(
      declarationsOf(
        findRule(rulesOf('controls/controls.css'), '.controls__action--primary')
          .body,
      ),
    );

    const background = primary.get('background') ?? '';
    const reference = /^var\((--[\w-]+)\)$/u.exec(background);
    expect(
      reference,
      `the Export fill is "${background}"; it must resolve through a token so ` +
        'both modes can be checked.',
    ).not.toBeNull();

    (['light', 'dark'] as const).forEach((mode): void => {
      const tokens = resolvePaletteTokens(mode, []);
      expect(
        resolveTokenValue(tokens, (reference as RegExpExecArray)[1]),
        `the Export fill resolves to a value below AA in ${mode} mode`,
      ).toBe('#0071e3');
    });
  });

  it('declares the accent fill pair once, in the light root, off the flipping token', (): void => {
    const root = unconditionedRootTokens();
    const dark = unconditionedDarkTokens();

    (['--accent-fill', '--accent-fill-hover'] as const).forEach(
      (token): void => {
        expect(root.get(token)).not.toContain('var(');
        expect(
          dark.has(token),
          `"${token}" must not appear in .dark - that is the whole point of it.`,
        ).toBe(false);
      },
    );

    expect(root.get('--accent-fill')).toBe('#0071e3');
    expect(root.get('--accent-fill-hover')).toBe('#005db8');
  });

  /**
   * **The accent BUDGET, asserted rather than reviewed (D-05, `04-07`).**
   *
   * One accent surface per panel. The Colors panel spends its on `Apply Color`,
   * so `Reset All Colors` is a GHOST - transparent fill, Midnight Ink label,
   * hairline, hover Porcelain - and the ramp strip and family pills carry no
   * accent at all. Asserted in the CSS source rather than by eye, because a
   * second filled button in a 360px column is exactly the kind of change that
   * looks deliberate in a diff and reads as a mistake on screen.
   *
   * The enumeration is two-way: the shared ghost declares each ghost property,
   * AND the set of rules that fill from `--accent-fill` is pinned to a literal
   * list. A one-way check would let a third accent surface appear silently.
   */
  it('keeps the shared panel action a ghost and the accent surfaces enumerated', (): void => {
    const ghost = new Map(
      declarationsOf(findRule(rulesOf('editor.css'), '.panel-action').body),
    );

    expect(ghost.get('background')).toBe('transparent');
    expect(ghost.get('color')).toBe('var(--themely-midnight-ink)');
    expect(ghost.get('border')).toBe(
      'var(--border-width) solid var(--hairline-color)',
    );
    expect(
      new Map(
        declarationsOf(
          findRule(rulesOf('editor.css'), '.panel-action:hover:not(:disabled)')
            .body,
        ),
      ).get('background'),
    ).toBe('var(--themely-porcelain)');

    const accentFilled = ALL_RULES.flatMap(([file, rules]): string[] =>
      rules
        .filter((rule): boolean =>
          declarationsOf(rule.body).some(
            ([property, value]): boolean =>
              (property === 'background' || property === 'background-color') &&
              value.includes('--accent-fill'),
          ),
        )
        .map((rule): string => `${file} ${rule.selector}`),
    ).sort();

    expect(
      accentFilled,
      'a new surface fills from the accent. D-05 is one accent per surface: ' +
        'the rail spends its on Export PNG and the Colors panel on Apply Color.',
    ).toStrictEqual([
      'controls/colorPicker.css .color-picker__submit:not(:disabled)',
      'controls/colorPicker.css .color-picker__submit:not(:disabled):hover',
      'controls/controls.css .controls__action--primary',
      'controls/controls.css .controls__action--primary:hover:not(:disabled)',
      // The Saved Maps panel's own single primary, `Save Map` (03-UI-SPEC :198).
      'controls/saveLoad.css .save-load-submit:not(:disabled)',
      'controls/saveLoad.css .save-load-submit:not(:disabled):hover',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 19 - the contrast matrix, resolved through the real cascade
 * ------------------------------------------------------------------ */

const CONTRAST_CONDITION = '@media (prefers-contrast: more)';
const FORCED_COLORS_CONDITION = '@media (forced-colors: active)';
const REDUCED_TRANSPARENCY_CONDITION =
  '@media (prefers-reduced-transparency: reduce)';

/**
 * Every (mode x preference) combination the palette can be resolved in.
 *
 * `forced-colors` overrides no colour at all - the user agent owns paint there -
 * so its rows repeat the default palette on purpose. That is not padding: the
 * combination exists so that the day someone DOES add a colour literal to the
 * forced-colors block, it is already being resolved and rated.
 */
const PREFERENCE_CASES: ReadonlyArray<{
  readonly name: string;
  readonly mode: 'light' | 'dark';
  readonly active: readonly string[];
}> = [
  { name: 'light', mode: 'light', active: [] },
  { name: 'dark', mode: 'dark', active: [] },
  {
    name: 'light + more contrast',
    mode: 'light',
    active: [CONTRAST_CONDITION],
  },
  { name: 'dark + more contrast', mode: 'dark', active: [CONTRAST_CONDITION] },
  {
    name: 'light + forced colors',
    mode: 'light',
    active: [FORCED_COLORS_CONDITION],
  },
  {
    name: 'dark + forced colors',
    mode: 'dark',
    active: [FORCED_COLORS_CONDITION],
  },
];

/**
 * The text-on-surface pairs the design contract actually produces, taken from
 * `Design.md` sections 2, 6, 7.3-7.10 rather than from a cartesian product of
 * every colour token. A product would rate pairs the design never draws, and
 * "no exceptions are enumerated" would then have to become a list of them.
 *
 * `--themely-ghost-gray` is DELIBERATELY ABSENT and that absence is gated
 * separately below, not waived here: measured against this palette it is
 * 3.88:1 on Porcelain and 3.60:1 on Powder in dark mode, so it cannot carry
 * text in this app at all. It stays declared for D-04 palette parity, its value
 * unadjusted, and a separate assertion proves nothing paints text with it.
 */
const TEXT_ON_SURFACE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['--themely-midnight-ink', '--themely-platinum'],
  ['--themely-midnight-ink', '--themely-porcelain'],
  ['--themely-midnight-ink', '--themely-powder'],
  ['--themely-slate-blue', '--themely-platinum'],
  ['--themely-slate-blue', '--themely-porcelain'],
  ['--themely-slate-blue', '--themely-powder'],
  ['--themely-nav-ink', '--themely-platinum'],
  ['--themely-nav-ink', '--themely-porcelain'],
  ['--themely-nav-ink', '--themely-powder'],
  ['--destructive', '--themely-platinum'],
  ['--destructive', '--themely-porcelain'],
  ['--destructive', '--themely-powder'],
  ['--destructive', '--destructive-tint'],
  /*
   * `04-07`, A3. The ONE genuinely new pair the two redesigned panels
   * introduce, and it is easy to miss: `.panel-field[aria-invalid="true"]`
   * repaints the field's background to the destructive tint while the text
   * inside it is still the creator's own typing in Midnight Ink. Every other
   * pair the flat vocabulary produces - Midnight Ink and Slate Blue on
   * Platinum, Porcelain, and Powder, and `--destructive` for the error line -
   * was already rated above, so the row count moves by exactly one. Recorded
   * as one rather than padded: a matrix that grows to look thorough is not a
   * stronger gate than a matrix that grows by what actually changed.
   */
  ['--themely-midnight-ink', '--destructive-tint'],
  // Mode-invariant by declaration; rated in BOTH modes anyway, so a `.dark`
  // redefinition would surface here as a failing ratio and not only as a
  // firewall violation.
  ['--themely-on-accent', '--accent-fill'],
  ['--themely-on-accent', '--accent-fill-hover'],
  ['--tooltip-text', '--tooltip-surface'],
];

/**
 * Six mode-by-preference combinations times SEVENTEEN pairs (`04-07` added the
 * Midnight-Ink-on-destructive-tint pair the invalid hex field produces),
 * written as a LITERAL and deliberately not derived from the two tables above.
 *
 * `PREFERENCE_CASES.length * TEXT_ON_SURFACE_PAIRS.length` reads like the same
 * claim and is not one: emptying either table would move the expectation with
 * the matrix and leave the count "correct" at zero. That is the exact vacuous
 * pass this assertion exists to prevent, and it was measured - the first probe
 * against this matrix, run with the derived form, failed only on a secondary
 * table-length check while the row count itself stayed green at zero rows.
 */
const EXPECTED_CONTRAST_ROWS = 102;

describe('Phase 3 contrast matrix (assertion 19)', (): void => {
  /**
   * The whole point of this shape is that a token contract asserts a
   * RELATIONSHIP, not a shape. `expect(token).not.toContain('rgba')` was green
   * through the 1.0:1 defect, because a light hex satisfies it perfectly.
   *
   * It also asserts its own row count. A matrix that iterates whatever it finds
   * can resolve to nothing and still pass, which is this repo's recurring
   * "gate that cannot fail" shape - and it is the exact failure mode a
   * cascade-resolving matrix invites, because a selector that stops matching
   * silently yields an empty set rather than an error.
   *
   * There are NO enumerated exceptions. The draft contract carried one for the
   * Export label in dark mode; the owner removed it and chose a mode-invariant
   * `--accent-fill` instead, so adding an exception back is a change to the
   * contract rather than a fix to this test.
   */
  it('meets AA for every text-on-surface pair in every mode and preference', (): void => {
    let rows = 0;

    PREFERENCE_CASES.forEach((preference): void => {
      const tokens = resolvePaletteTokens(preference.mode, preference.active);

      expect(
        tokens.size,
        `${preference.name}: the palette resolved to nothing.`,
      ).toBeGreaterThan(0);

      TEXT_ON_SURFACE_PAIRS.forEach(([textToken, surfaceToken]): void => {
        const text = resolveTokenValue(tokens, textToken);
        const surface = resolveTokenValue(tokens, surfaceToken);

        expect(
          parseHexColor(surface),
          `${preference.name}: "${surfaceToken}" resolves to "${surface}", ` +
            'which is not an opaque colour and cannot be rated.',
        ).not.toBeNull();

        const ratio = contrastRatio(text, surface);
        expect(
          ratio,
          `${preference.name}: ${textToken} (${text}) on ${surfaceToken} ` +
            `(${surface}) is ${ratio.toFixed(2)}:1.`,
        ).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);

        rows += 1;
      });
    });

    expect(rows).toBe(EXPECTED_CONTRAST_ROWS);
    expect(PREFERENCE_CASES).toHaveLength(6);
    expect(TEXT_ON_SURFACE_PAIRS).toHaveLength(17);
  });

  /**
   * The ghost gray exclusion above, converted from a paragraph into a gate.
   *
   * Recording "this token cannot carry text" in a document and then leaving
   * nothing to enforce it is how the tertiary meta role ends up at 3.60:1 two
   * plans from now, with the matrix still green because the pair was never in
   * it. The token keeps its verbatim Themely value; what is forbidden is
   * painting text with it.
   */
  it('paints no text with the palette token that misses AA', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.filter(isRenderingRule).forEach((rule): void => {
        declarationsOf(rule.body).forEach(([property, value]): void => {
          if (property !== 'color' && property !== '-webkit-text-fill-color') {
            return;
          }
          expect(
            value.includes('--themely-ghost-gray'),
            `${file}: "${rule.selector}" paints text with ` +
              '--themely-ghost-gray, which measures 3.88:1 on Porcelain and ' +
              '3.60:1 on Powder in dark mode. Use --themely-slate-blue for ' +
              'tertiary meta; the ghost value stays declared for palette parity.',
          ).toBe(false);
        });
      });
    });
  });

  /**
   * The structural backstop for the same defect the matrix rates. A preference
   * block is authored AFTER the palette at equal specificity, so a `:root`
   * literal inside `prefers-contrast` wins in dark mode too unless the same
   * at-rule answers it for `.dark`. That is the defect that once painted a
   * light bar under light text at 1.0:1 for the user who asked for contrast.
   *
   * Only colour-carrying overrides are compared: `--border-width: 2px` is
   * mode-independent and requiring a `.dark` copy of it would be noise that
   * teaches the next reader to ignore this gate.
   */
  it('answers every preference colour override for both modes in the same at-rule', (): void => {
    const isColourOverride = (token: string, value: string): boolean =>
      token.startsWith('--themely-') ||
      parseHexColor(value) !== null ||
      value.includes('var(--themely-');

    let atRulesChecked = 0;

    [
      CONTRAST_CONDITION,
      FORCED_COLORS_CONDITION,
      REDUCED_TRANSPARENCY_CONDITION,
    ].forEach((condition): void => {
      const overriddenIn = (selector: string): string[] =>
        themeRules()
          .filter(
            (rule): boolean =>
              rule.selector === selector &&
              rule.conditions.length === 1 &&
              rule.conditions[0] === condition,
          )
          .flatMap((rule): string[] =>
            [...tokensOf(rule).entries()]
              .filter(([token, value]): boolean => isColourOverride(token, value))
              .map(([token]): string => token),
          )
          .sort();

      expect(
        overriddenIn('.dark'),
        `${condition}: the light and dark blocks override different colour ` +
          'tokens. A literal answered for only one mode silently wins in the ' +
          'other.',
      ).toStrictEqual(overriddenIn(':root'));

      atRulesChecked += 1;
    });

    expect(atRulesChecked).toBe(3);
  });

  /**
   * `prefers-reduced-transparency` is asserted STATICALLY and only statically:
   * Playwright cannot emulate it, and emulation a browser does not support is
   * not evidence. The physical cell belongs to the owner acceptance matrix,
   * exactly as Phase 2 left it.
   *
   * Added by `03-09` because the both-modes gate above cannot see a DELETED
   * block - two empty override sets are equal, so removing the at-rule outright
   * passes it. `findRule` throws when the rule is absent, which is what makes
   * this one able to fail on the thing it covers.
   */
  it('restores the one translucent surface under reduced transparency, in both modes', (): void => {
    [':root', '.dark'].forEach((selector): void => {
      const rule = findRule(themeRules(), selector, [
        REDUCED_TRANSPARENCY_CONDITION,
      ]);
      expect(
        tokensOf(rule).get('--overlay'),
        `${REDUCED_TRANSPARENCY_CONDITION} must restore the scrim for ` +
          `"${selector}". Readability may never depend on what is behind a ` +
          'surface, and this preference is never simulated as browser proof.',
      ).toBe('var(--themely-media-backdrop)');
    });
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 8 - no colour literal in a component, closed exemption
 * ------------------------------------------------------------------ */

const COLOR_LITERAL_PATTERN = /#[0-9A-Fa-f]{3,8}\b|rgba?\(/u;

/**
 * A CLOSED list of exactly one file, with its reason recorded here rather than
 * only in a comment inside the component. `LegendOverlay.tsx` hard-codes
 * `THEME_COLORS` and the swatch stroke because those values are EXPORT-FIXED:
 * they are serialised into the PNG, so they must not follow the editor theme,
 * and `--swatch-border: #9ca3af` mirrors the last of them.
 *
 * Note the name collision recorded in P-3: the legend's `light` / `dark` is a
 * creator-chosen LEGEND THEME, not the app's colour scheme. A future reader who
 * conflates the two would "fix" this file into following the app theme and
 * change every creator's exported pixels.
 */
const COLOR_LITERAL_EXEMPTIONS: ReadonlyArray<readonly [string, string]> = [
  [
    'components/LegendOverlay.tsx',
    'THEME_COLORS and the swatch stroke are export-fixed values serialised ' +
      'into the PNG; they must not follow the editor theme.',
  ],
];

/** Component source only. A test asserting a colour value is doing its job. */
function productionComponentSources(): ReadonlyArray<readonly [string, string]> {
  return COMPONENT_SOURCES.filter(
    ([name]): boolean => !name.endsWith('.test.tsx'),
  );
}

/**
 * Block comments and whole-line `//` comments only. A partial-line strip would
 * need to know about string literals, and getting that wrong would silently
 * remove real code from the scan - the failure mode is a gate that stops
 * seeing violations, which is worse than one that reports a comment.
 */
function stripSourceComments(source: string): string {
  return source
    .replaceAll(/\/\*[\S\s]*?\*\//gu, '')
    .split('\n')
    .filter((line): boolean => !/^\s*\/\//u.test(line))
    .join('\n');
}

describe('Phase 3 component colour literals (assertion 8)', (): void => {
  it('keeps every colour literal out of component source, bar the closed exemption', (): void => {
    const offenders = productionComponentSources()
      .filter(([, source]): boolean =>
        COLOR_LITERAL_PATTERN.test(stripSourceComments(source)),
      )
      .map(([name]): string => name)
      .sort();

    expect(
      offenders,
      'a component hard-codes a colour. Chrome colours come from tokens; the ' +
        'only file allowed a literal is the one whose literals are exported ' +
        'into the PNG.',
    ).toStrictEqual(
      COLOR_LITERAL_EXEMPTIONS.map(([name]): string => name).sort(),
    );
  });

  /**
   * An exemption for a file that no longer carries a literal is a licence
   * nobody is using, and the next literal added to it would inherit the
   * licence silently. Both directions are checked.
   */
  it('keeps the exemption list closed, current, and reasoned', (): void => {
    expect(COLOR_LITERAL_EXEMPTIONS).toHaveLength(1);

    COLOR_LITERAL_EXEMPTIONS.forEach(([name, reason]): void => {
      const entry = productionComponentSources().find(
        ([file]): boolean => file === name,
      );
      expect(entry, `${name} is exempted but does not exist`).toBeDefined();
      expect(
        COLOR_LITERAL_PATTERN.test(
          stripSourceComments((entry as readonly [string, string])[1]),
        ),
        `${name} no longer carries a colour literal, so its exemption is a ` +
          'standing licence for the next one. Remove it.',
      ).toBe(true);
      expect(reason.length).toBeGreaterThan(40);
    });
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 9 - the type-role consumer exemption is closed at two
 * ------------------------------------------------------------------ */

const TYPE_ROLES = [
  '--text-display',
  '--text-h1',
  '--text-h2',
  '--text-h3',
  '--text-subheading',
  '--text-body',
  '--text-body-sm',
  '--text-caption',
  '--text-eyebrow',
  '--text-stat',
] as const;

/**
 * A CLOSED set of exactly two. There is no marketing hero and no stat card in
 * this app, but D-09 vendors the whole Themely scale, so these two are declared
 * with the reason recorded and nothing else may join them.
 *
 * This is also why `theme.css` ships a `.text-<role>` class for eight roles and
 * not for ten: a class for all ten would make every role trivially "consumed"
 * and this assertion would pass no matter what.
 */
const TYPE_ROLE_CONSUMER_EXEMPTIONS = ['--text-display', '--text-stat'] as const;

/** The four tokens a role bundles, matched exactly so siblings cannot count. */
function roleTokenFamily(role: string): string[] {
  return [role, `${role}-line-height`, `${role}-weight`, `${role}-tracking`];
}

describe('Phase 3 type-role consumers (assertion 9)', (): void => {
  it('declares no type role without a consumer, bar the closed exemption', (): void => {
    const renderingSource = ALL_RULES.flatMap(([, rules]): string[] =>
      rules.filter(isRenderingRule).map((rule): string => rule.body),
    ).join('\n');

    const unconsumed = TYPE_ROLES.filter(
      (role): boolean =>
        !roleTokenFamily(role).some((token): boolean =>
          renderingSource.includes(`var(${token})`),
        ),
    ).sort();

    expect(
      unconsumed,
      'a declared token needs a consumer, or its contract assertion is ' +
        'theatre. The exemption is a closed set of exactly two roles - adding ' +
        'a third is a change to the design contract, not a test fix.',
    ).toStrictEqual([...TYPE_ROLE_CONSUMER_EXEMPTIONS].sort());

    expect(TYPE_ROLES).toHaveLength(10);
    expect(TYPE_ROLE_CONSUMER_EXEMPTIONS).toHaveLength(2);
  });

  it('declares all four parts of every role bundle', (): void => {
    const root = unconditionedRootTokens();

    TYPE_ROLES.forEach((role): void => {
      roleTokenFamily(role).forEach((token): void => {
        expect(root.has(token), `${token} is missing from the role bundle`).toBe(
          true,
        );
      });
    });
  });
});

/* ------------------------------------------------------------------ *
 * Assertion 17 - the export-unsafe guard, and the outright backdrop ban
 * ------------------------------------------------------------------ */

/**
 * D-06 replaced the approved-glass-surface allowlist with a blanket ban, and
 * the simplification is the point: an allowlist has to be maintained, so it
 * rots, and a rotted allowlist reads exactly like an enforced one. A ban cannot
 * rot.
 *
 * The at-rule condition is scanned too. `@supports (backdrop-filter: blur(1px))`
 * declares no `backdrop-filter` of its own, so a declaration-only scan would
 * leave the whole progressive-enhancement scaffold standing with nothing but a
 * missing body to distinguish it from working glass.
 */
describe('Phase 3 backdrop-filter is banned outright (assertion 17)', (): void => {
  it('declares backdrop-filter nowhere, in no rule and no at-rule', (): void => {
    ALL_RULES.forEach(([file, rules]): void => {
      rules.forEach((rule): void => {
        declarationsOf(rule.body).forEach(([property]): void => {
          expect(
            property,
            `${file}: "${rule.selector}" declares ${property}. D-06 bans it ` +
              'outright - flat surfaces with hairlines, no glass.',
          ).not.toBe('backdrop-filter');
        });

        rule.conditions.forEach((condition): void => {
          expect(
            condition.includes('backdrop-filter'),
            `${file}: "${condition}" still guards a glass surface that no ` +
              'longer exists.',
          ).toBe(false);
        });
      });
    });
  });
});

/* ------------------------------------------------------------------ *
 * Carried forward from the retired Phase 2 contract test
 *
 * These are the Phase 2 assertions that survive `03-04` unchanged in subject.
 * They are re-homed rather than re-derived: deleting the Phase 2 contract file
 * without them would have shrunk the contract by six live rules while the
 * commit message said "superseded".
 * ------------------------------------------------------------------ */

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

/** The declared exceptions. Everything else comes from the token scale. */
const ALLOWED_RAW_SPACING_PX = new Set(['0px', '44px', '1440px']);

/** A control padded below the token scale would fall under the 48px target. */
const UNDERSIZED_HEIGHT_PATTERN = /--space-(?:xs|sm|md|lg|xl)\b|\d+px/u;

const GRADIENT_PATTERN = /(?:linear|radial|conic|repeating-[a-z-]+)-gradient\(/u;

describe('Phase 3 carried-forward layout rules', (): void => {
  /**
   * The weights are tokens for exactly this reason: one place strengthens every
   * boundary and every focus ring for a user who asked for more contrast. A
   * rule that writes `1px solid` opts out with nothing failing.
   */
  it('strengthens boundaries and focus under contrast and forced colors', (): void => {
    [CONTRAST_CONDITION, FORCED_COLORS_CONDITION].forEach((condition): void => {
      const tokens = tokensOf(findRule(themeRules(), ':root', [condition]));
      expect(tokens.get('--border-width'), condition).toBe('2px');
      expect(tokens.get('--focus-width'), condition).toBe('3px');
    });
  });

  /**
   * `overflow-x: hidden` on a NON-VIEWPORT element computes `overflow-y: auto`,
   * which makes that element its own scroll container and silently kills
   * `position: sticky` inside it. On `body` the value propagates to the viewport
   * and leaves stickiness intact.
   *
   * Generalised from the Phase 2 form, which named `.app`. `.app` is dissolved
   * by `03-05`, and a rule that names a disappearing selector disappears with
   * it - so this states the ownership instead: `body` and nothing else.
   */
  it('keeps horizontal containment on the viewport element alone', (): void => {
    const owners: string[] = [];

    ALL_RULES.forEach(([, rules]): void => {
      rules.forEach((rule): void => {
        declarationsOf(rule.body).forEach(([property]): void => {
          if (property === 'overflow-x') {
            owners.push(rule.selector);
          }
        });
      });
    });

    expect(
      [...new Set(owners)].sort(),
      'horizontal containment belongs on `body`. On any other element it makes ' +
        'that element a scroll container and sticky positioning inside it stops ' +
        'working, with nothing failing.',
    ).toStrictEqual(['body']);

    const shell = new Map(
      declarationsOf(findRule(rulesOf('editor.css'), '.map-editor').body),
    );
    expect(shell.has('overflow')).toBe(false);
    expect(shell.has('overflow-x')).toBe(false);
    expect(shell.has('overflow-y')).toBe(false);
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
      declarationsOf(findRule(themeRules(), 'button').body),
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

  /**
   * On the page, the workspace, or any ancestor panel, `touch-action: none`
   * swallows the creator's normal vertical scroll on touch - which is the only
   * way a mobile user reaches anything below the map. Asserted as an ownership
   * set rather than as a value on one selector, so a second owner fails.
   */
  it('scopes touch-action to the interactive square alone', (): void => {
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
        declarationsOf(findRule(rulesOf('MapCanvas.css'), '.map-canvas').body),
      ).get('touch-action'),
    ).toBe('none');
  });

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
});
