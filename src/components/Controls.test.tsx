import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Controls } from './Controls';

interface RenderOverrides {
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
    ['Undo Color Change', 'Redo Color Change', 'Save or Load Maps', 'Reset All Colors', 'Export PNG'].forEach(
      (label): void => {
        expect(markup).toContain(`>${label}</button>`);
      },
    );
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
    expect(idle).toContain('>Export PNG</button>');
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

  it('disables every action while the world map is not ready', (): void => {
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

    // Reset View belongs to CompositionBar (UI-SPEC section 9); the composed
    // DOM must contain exactly one visible Reset View action.
    expect(markup).not.toMatch(/Reset View/iu);
    expect(markup).not.toMatch(/Map period/iu);
    expect(markup).not.toMatch(/<select/u);
    // Phase 2 has no region variants: the scene is one world, filtered by
    // period only.
    expect(markup).not.toMatch(/region/iu);
  });
});
