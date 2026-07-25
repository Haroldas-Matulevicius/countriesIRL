import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';
import { FatalErrorState } from './FatalErrorState';

describe('ErrorBoundary', (): void => {
  it('swaps to the fallback once a descendant throws during render', (): void => {
    const fallback = <FatalErrorState onReload={vi.fn()} />;
    const boundary = new ErrorBoundary({
      fallback,
      children: <p>workspace</p>,
    });

    expect(boundary.render()).toEqual(<p>workspace</p>);

    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({
      hasError: true,
    });
    boundary.state = ErrorBoundary.getDerivedStateFromError();

    expect(boundary.render()).toBe(fallback);
    expect(renderToStaticMarkup(<>{boundary.render()}</>)).toContain(
      'role="alert"',
    );
  });

  it('reports the failure instead of silently blanking the page', (): void => {
    const consoleError = vi
      .spyOn(globalThis.console, 'error')
      .mockImplementation((): void => undefined);
    const boundary = new ErrorBoundary({
      fallback: null,
      children: null,
    });

    boundary.componentDidCatch(new Error('duplicate-scene-feature-id'), {
      componentStack: '\n    in MapCanvas',
    });

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]?.[0]).toBe(
      'CountriesIRL could not render the map workspace.',
    );
    consoleError.mockRestore();
  });
});
