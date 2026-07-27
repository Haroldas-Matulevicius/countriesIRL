import { describe, expect, it } from 'vitest';

interface FileSystemModule {
  readFileSync: (path: URL, encoding: 'utf8') => string;
}

interface NodeProcess {
  getBuiltinModule: (name: 'fs') => FileSystemModule;
}

const COMPONENT_COLOR_LITERAL = /#[0-9A-Fa-f]{3,8}\b|rgba?\(/u;
const REQUIRED_FIXED_TOKENS = [
  '--map-fixed-text',
  '--map-skeleton-fill',
  '--map-skeleton-stroke',
  '--tooltip-border',
  '--tooltip-surface',
  '--tooltip-text',
  '--tooltip-shadow',
  '--swatch-border',
  '--mixed-color-light',
  '--mixed-color-dark',
  '--active-check-border',
  '--active-check-surface',
  '--active-check-text',
  '--modal-shadow',
  '--toast-shadow',
] as const;

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

describe('component theme tokens', (): void => {
  /**
   * This test used to assert `repeat(5, minmax(0, 1fr))`, `width: max-content`
   * and (implicitly) the tile's `overflow: hidden`, under the name "keeps preset
   * labels complete". That combination is precisely what cut `Magenta` off at
   * the tile edge in the 376px inspector: a fixed five-column count produced
   * 65px tracks, `max-content` made the label wider than its track, and
   * `overflow: hidden` turned the resulting overflow from visible into silent.
   * The test asserted the defect and read as proof against it.
   *
   * It now asserts the property that actually keeps labels whole - the column
   * count is derived from a minimum track wide enough for the longest name, and
   * nothing clips - while keeping the original no-mid-word-break intent. The
   * behavioural proof that no label is cut lives in the responsive E2E suite,
   * which measures the rendered label against its tile.
   */
  it('sizes preset columns from a minimum track and never clips a label', (): void => {
    const controlsCss = readStyleSheet('./Controls.css');
    const gridRule = controlsCss.match(
      /\.color-picker__preset-grid\s*\{([^}]*)\}/u,
    )?.[1] ?? '';
    const presetRule = controlsCss.match(
      /\.color-picker__preset\s*\{([^}]*)\}/u,
    )?.[1] ?? '';
    const nameRule = controlsCss.match(
      /\.color-picker__preset-name\s*\{([^}]*)\}/u,
    )?.[1] ?? '';

    // Derived, not fixed: a hard column count cannot know how wide the longest
    // preset name is at the current container width.
    expect(gridRule).toMatch(
      /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(\d+px,\s*1fr\)\);/u,
    );
    expect(gridRule).not.toContain('repeat(5,');
    expect(presetRule).toContain('min-height: var(--space-3xl);');
    // Clipping is what made "too narrow" invisible. The tile must not hide
    // overflow, and the label must not opt out of its track's width.
    expect(presetRule).not.toContain('overflow: hidden;');
    expect(nameRule).not.toContain('width: max-content;');
    expect(nameRule).toContain('max-width: 100%;');
    // Unchanged intent: a preset name is one unbroken word on one line.
    expect(nameRule).toContain('overflow-wrap: normal;');
    expect(nameRule).toContain('white-space: nowrap;');
    expect(nameRule).not.toContain('overflow-wrap: anywhere;');
  });

  it('keeps component colors tokenized while fixed colors stay in theme.css', (): void => {
    const mapCanvasCss = readStyleSheet('./MapCanvas.css');
    const controlsCss = readStyleSheet('./Controls.css');
    const themeCss = readStyleSheet('./theme.css');

    expect(mapCanvasCss).not.toMatch(COMPONENT_COLOR_LITERAL);
    expect(controlsCss).not.toMatch(COMPONENT_COLOR_LITERAL);

    REQUIRED_FIXED_TOKENS.forEach((token): void => {
      expect(themeCss).toContain(`${token}:`);
    });
  });
});
