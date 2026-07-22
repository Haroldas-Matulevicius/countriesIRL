import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Controls } from './Controls';

describe('Controls shortcut labels', () => {
  it('does not advertise keyboard shortcuts that are not implemented', () => {
    const markup = renderToStaticMarkup(
      <Controls
        canUndo
        canRedo
        canReset
        isMapReady
        isStorageAvailable
        isExporting={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onReset={vi.fn()}
        onOpenSaveLoad={vi.fn()}
        onExport={vi.fn()}
        onStatusMessage={vi.fn()}
      />,
    );

    expect(markup).toContain('title="Undo the most recent color change"');
    expect(markup).toContain('title="Redo the most recently undone color change"');
    expect(markup).toContain('data-save-load-control="true"');
    expect(markup).not.toMatch(/Ctrl|Cmd|⌘/i);
  });
});
