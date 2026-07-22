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
  it('keeps preset labels complete and non-breaking in the mobile grid', (): void => {
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

    expect(gridRule).toContain('grid-template-columns: repeat(5, minmax(0, 1fr));');
    expect(gridRule).toContain('gap: var(--space-xs) 0;');
    expect(presetRule).toContain('min-height: var(--space-3xl);');
    expect(presetRule).toContain('padding: var(--space-xs) 0;');
    expect(nameRule).toContain('width: max-content;');
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
