import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY } from '../constants/config';
import { createStorageAdapter } from '../utils/storage';
import { getLoadFeedback, restoreSaveLoadFocus } from './SaveLoad';
import { ToastRegion } from './ToastRegion';

class LoadFeedbackStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('SaveLoad load feedback', () => {
  it('reports a warning instead of success-only feedback for a valid subset load', () => {
    const storage = new LoadFeedbackStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Partially corrupt map',
          colors: { FRA: '#123456', DEU: 'not-a-color' },
          timestamp: 100,
        },
      ]),
    );

    const result = createStorageAdapter(storage).load(
      'Partially corrupt map',
      new Set(['FRA', 'DEU']),
    );

    expect(result).toEqual({
      ok: true,
      value: { FRA: '#123456' },
      warnings: [{ code: 'corrupt-data', recordIndex: 0 }],
    });
    if (!result.ok) {
      throw new Error('Expected the valid subset to load.');
    }

    const feedback = getLoadFeedback(result.warnings);
    expect(feedback).toEqual({
      message: 'Saved map loaded, but some invalid saved colors were omitted.',
      severity: 'warning',
    });

    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{ id: 'partial-load', ...feedback }}
        onDismiss={vi.fn()}
      />,
    );
    expect(markup).toContain('role="status"');
    expect(markup).toContain('data-severity="warning"');
    expect(markup).toContain(feedback.message);
  });

  it('uses success feedback only when the load has no warnings', () => {
    expect(getLoadFeedback([])).toEqual({
      message: 'Saved map loaded.',
      severity: 'success',
    });
  });
});

describe('SaveLoad focus restoration', () => {
  it('focuses the current responsive control when the original opener disconnected', () => {
    const originalOpener = { isConnected: false, focus: vi.fn() };
    const currentControl = { isConnected: true, focus: vi.fn() };
    const focusMap = vi.fn();

    restoreSaveLoadFocus(originalOpener, currentControl, focusMap);

    expect(originalOpener.focus).not.toHaveBeenCalled();
    expect(currentControl.focus).toHaveBeenCalledOnce();
    expect(focusMap).not.toHaveBeenCalled();
  });

  it('falls back to the map when neither control is connected', () => {
    const originalOpener = { isConnected: false, focus: vi.fn() };
    const currentControl = { isConnected: false, focus: vi.fn() };
    const focusMap = vi.fn();

    restoreSaveLoadFocus(originalOpener, currentControl, focusMap);

    expect(originalOpener.focus).not.toHaveBeenCalled();
    expect(currentControl.focus).not.toHaveBeenCalled();
    expect(focusMap).toHaveBeenCalledOnce();
  });
});
