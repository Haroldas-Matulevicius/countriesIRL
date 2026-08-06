import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Controls, type ControlsVariant } from './Controls';

function readSource(fileName: string): string {
  const nodeProcess = Reflect.get(globalThis, 'process') as
    | {
        getBuiltinModule: (name: 'fs') => {
          readFileSync: (path: URL, encoding: 'utf8') => string;
          readdirSync: (
            path: URL,
            options: { readonly withFileTypes: true },
          ) => Array<{ name: string; isDirectory: () => boolean }>;
        };
      }
    | undefined;

  if (nodeProcess === undefined) {
    throw new Error('Expected the Vitest Node process.');
  }

  return nodeProcess
    .getBuiltinModule('fs')
    .readFileSync(new URL(fileName, import.meta.url), 'utf8');
}

function collectTsxFiles(directory: URL): string[] {
  const nodeProcess = Reflect.get(globalThis, 'process') as {
    getBuiltinModule: (name: 'fs') => {
      readdirSync: (
        path: URL,
        options: { readonly withFileTypes: true },
      ) => Array<{ name: string; isDirectory: () => boolean }>;
    };
  };

  return nodeProcess
    .getBuiltinModule('fs')
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): string[] => {
      if (entry.isDirectory()) {
        return collectTsxFiles(new URL(`${entry.name}/`, directory)).map(
          (nested): string => `${entry.name}/${nested}`,
        );
      }
      return entry.name.endsWith('.tsx') ? [entry.name] : [];
    });
}

interface RenderOverrides {
  readonly variant?: ControlsVariant;
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly canReset?: boolean;
  readonly isMapReady?: boolean;
  readonly isStorageAvailable?: boolean;
  readonly isExporting?: boolean;
}

function renderControls(overrides: RenderOverrides = {}): string {
  return renderToStaticMarkup(
    <Controls
      variant={overrides.variant ?? 'strip'}
      canUndo={overrides.canUndo ?? true}
      canRedo={overrides.canRedo ?? true}
      canReset={overrides.canReset ?? true}
      isMapReady={overrides.isMapReady ?? true}
      isStorageAvailable={overrides.isStorageAvailable ?? true}
      isExporting={overrides.isExporting ?? false}
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      onReset={vi.fn()}
      onOpenSaveLoad={vi.fn()}
      onExport={vi.fn()}
      onStatusMessage={vi.fn()}
    />,
  );
}

function getActionOrder(markup: string): ReadonlyArray<string> {
  return [...markup.matchAll(/data-action="([a-z-]+)"/gu)].map(
    (match): string => match[1] ?? '',
  );
}

describe('Controls is one component with a declared variant', (): void => {
  /*
   * UI-SPEC 3. The accent budget and the single `Reset All Colors` are kept
   * true BY CONSTRUCTION: `controls__action--primary` exists in exactly one
   * component, and exactly one instance of that component is mounted. A copy
   * would make both facts a matter of review instead - which is how a control
   * got duplicated in this repo before (P-5's sibling defect).
   */
  it('declares exactly three variants and adds `rail` rather than a copy', (): void => {
    const source = readSource('./Controls.tsx');
    const declared =
      /export type ControlsVariant =([^;]*);/u.exec(source)?.[1] ?? '';

    expect(
      [...declared.matchAll(/'([a-z-]+)'/gu)].map((match): string => match[1]),
    ).toStrictEqual(['rail', 'app-bar', 'strip']);
  });

  it('has no second implementation anywhere under src/', (): void => {
    /*
     * Scanned as a set of FILES that render the primary role class, not as a
     * count of occurrences: a copy is a new file, and a count would be
     * satisfied by moving the class rather than by removing the copy.
     *
     * It is a plain text scan with no parser between the rule and the file, so
     * it reads comments too. It has already fired on prose once (`App.tsx`
     * naming the class while explaining why only one component may render it),
     * and the COMMENT was reworded rather than the gate loosened - the same
     * discipline `03-03` and `03-05` recorded for their own text gates.
     */
    const sourceRoot = new URL('../', import.meta.url);
    const owners = collectTsxFiles(sourceRoot)
      .filter((name): boolean => !name.endsWith('.test.tsx'))
      .filter((name): boolean =>
        readSource(`../${name}`).includes('controls__action--primary'),
      )
      .sort();

    expect(
      owners,
      'a second file renders the filled primary action. Add a variant to ' +
        'Controls instead - the accent budget is countable only while one ' +
        'component owns the role class.',
    ).toStrictEqual(['components/Controls.tsx']);
  });

  it('carries only the primary action in the rail variant', (): void => {
    const rail = renderControls({ variant: 'rail' });

    expect(getActionOrder(rail)).toEqual(['export']);
    expect(rail.match(/controls__action--primary/gu)).toHaveLength(1);
    expect(rail).toContain('controls controls--rail');
    expect(rail).not.toContain('Reset All Colors');
    expect(rail).not.toContain('Undo Color Change');
    expect(rail).not.toContain('Save or Load Maps');
    // The section keeps its accessible name in every variant.
    expect(rail).toContain('aria-labelledby="map-actions-heading"');
  });

  it('gives the rail export a glyph, a label, and a tooltip that all agree', (): void => {
    const idle = renderControls({ variant: 'rail' });
    const busy = renderControls({ variant: 'rail', isExporting: true });

    expect(idle).toContain('class="icon-glyph"');
    expect(
      idle.match(/<span class="controls__action-label">Export PNG<\/span>/gu),
    ).toHaveLength(1);
    expect(
      idle.match(
        /<span class="rail-tooltip" data-editor-only="true" aria-hidden="true">Export PNG<\/span>/gu,
      ),
    ).toHaveLength(1);

    // The busy label swaps EXACTLY, in both places, with no third string.
    expect(busy).toContain(
      '<span class="controls__action-label">Exporting PNG…</span>',
    );
    expect(busy).not.toContain('>Export PNG<');
    expect(busy).toMatch(/data-action="export"[^>]*aria-busy="true"/u);
    expect(busy).toMatch(/data-action="export"[^>]*disabled/u);
    expect(busy).not.toContain('aria-disabled');
  });

  it('fills the export from the mode-invariant accent, never the flipping one', (): void => {
    const controlsCss = readSource('../styles/controls/controls.css');
    const primaryRule =
      /\.controls__action--primary \{(?<body>[^}]*)\}/u.exec(controlsCss)?.groups
        ?.body ?? '';

    /*
     * White on `--themely-apple-blue` is 3.02:1 in dark mode; white on the
     * fixed `--accent-fill` is 4.70:1 in both. Pointing this at the flipping
     * token looks tidier and ships a label below AA that no rendering test
     * catches.
     */
    expect(primaryRule).toContain('background: var(--accent-fill)');
    expect(primaryRule).not.toContain('--themely-apple-blue');
  });
});

describe('Controls global action strip', (): void => {
  it('renders the exact UI-SPEC labels in the approved order', (): void => {
    const markup = renderControls();

    expect(getActionOrder(markup)).toEqual([
      'undo',
      'redo',
      'save-load',
      'reset-colors',
      'export',
    ]);
    ['Undo Color Change', 'Redo Color Change', 'Save or Load Maps', 'Reset All Colors'].forEach(
      (label): void => {
        expect(markup).toContain(`>${label}</button>`);
      },
    );
    // Export carries its label in a span so the rail can hide it visually at
    // 56px without `display: none` taking it out of the accessible name.
    expect(markup).toContain(
      '<span class="controls__action-label">Export PNG</span>',
    );
  });

  it('drops Reset All Colors from the desktop app bar group', (): void => {
    const appBar = renderControls({ variant: 'app-bar' });

    // UI-SPEC 8: the app bar carries exactly Undo, Redo, Save or Load Maps and
    // Export PNG. `Reset All Colors` is content reset and belongs to the
    // selection/color section on desktop, so composing it here would put it one
    // control away from `Reset View`, which is exactly the pairing D-17/D-18
    // forbid.
    expect(getActionOrder(appBar)).toEqual([
      'undo',
      'redo',
      'save-load',
      'export',
    ]);
    expect(appBar).not.toContain('Reset All Colors');
    expect(appBar).not.toContain('controls__action--destructive');
    expect(appBar).toContain('controls controls--app-bar');
    // The section keeps its accessible name; only its visible presentation
    // changes, so the group is still announced as "Map actions".
    expect(appBar).toContain('aria-labelledby="map-actions-heading"');
    expect(appBar).toContain('class="controls__heading" id="map-actions-heading"');
  });

  it('disables every app-bar action while the world map is not ready', (): void => {
    const markup = renderControls({ variant: 'app-bar', isMapReady: false });

    expect(markup.match(/disabled=""/gu)).toHaveLength(4);
    expect(markup).not.toContain('aria-disabled');
  });

  it('makes Export the only filled action and marks the reset as its own destructive group', (): void => {
    const markup = renderControls();

    expect(markup.match(/controls__action--primary/gu)).toHaveLength(1);
    expect(markup).toMatch(
      /data-action="export"[^>]*class="[^"]*controls__action--primary/u,
    );
    expect(markup.match(/controls__action--destructive/gu)).toHaveLength(1);
    expect(markup).toMatch(
      /data-action="reset-colors"[^>]*class="[^"]*controls__action--destructive/u,
    );
  });

  it('reports export busy state natively and swaps to the exact busy label', (): void => {
    const busy = renderControls({ isExporting: true });

    expect(busy).toContain('Exporting PNG…');
    expect(busy).not.toContain('>Export PNG</button>');
    expect(busy).toMatch(/data-action="export"[^>]*aria-busy="true"/u);
    expect(busy).toMatch(/data-action="export"[^>]*disabled/u);

    const idle = renderControls();
    expect(idle).toContain(
      '<span class="controls__action-label">Export PNG</span>',
    );
    expect(idle).not.toContain('Exporting PNG…');
    expect(idle).not.toMatch(/aria-busy="true"/u);
  });

  it('uses native disabled state, never a spoofed aria-disabled', (): void => {
    const markup = renderControls({
      canUndo: false,
      canRedo: false,
      canReset: false,
      isStorageAvailable: false,
    });

    expect(markup).not.toContain('aria-disabled');
    ['undo', 'redo', 'save-load', 'reset-colors'].forEach((action): void => {
      expect(markup).toMatch(
        new RegExp(`data-action="${action}"[^>]*disabled`, 'u'),
      );
    });
  });

  it('disables every strip action while the world map is not ready', (): void => {
    const markup = renderControls({ isMapReady: false });

    expect(markup.match(/disabled=""/gu)).toHaveLength(5);
  });

  it('does not advertise keyboard shortcuts that are not implemented', (): void => {
    const markup = renderControls();

    expect(markup).toContain('title="Undo the most recent color change"');
    expect(markup).toContain(
      'title="Redo the most recently undone color change"',
    );
    expect(markup).toContain('data-save-load-control="true"');
    expect(markup).not.toMatch(/Ctrl|Cmd|⌘/i);
  });

  it('owns no camera reset, no period control, and no region selector', (): void => {
    const markup = renderControls();

    // Reset View belongs to the period HUD (UI-SPEC section 4); the composed
    // DOM must contain exactly one visible Reset View action.
    expect(markup).not.toMatch(/Reset View/iu);
    expect(markup).not.toMatch(/Map period/iu);
    expect(markup).not.toMatch(/<select/u);
    // Phase 2 has no region variants: the scene is one world, filtered by
    // period only.
    expect(markup).not.toMatch(/region/iu);
  });
});
