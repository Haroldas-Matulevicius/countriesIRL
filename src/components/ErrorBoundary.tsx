import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /** Rendered instead of the children once a descendant throws during render. */
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

export interface ErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * The scene composers assert unique identities by throwing during render
 * (`composeEffectiveScene`, `createWrappedSceneModel`,
 * `getSelectableSceneFeatures`). Without a boundary those throws unmount the
 * whole React tree and leave a blank page, which contradicts the CLAUDE.md
 * guardrail "Validate on load; skip malformed entries with a warning (don't
 * crash)". This degrades them to the designed error surface instead.
 *
 * Renders `children` untouched (no wrapper element), so it can sit inside a
 * grid without changing layout.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    globalThis.console.error(
      'CountriesIRL could not render the map workspace.',
      error,
      errorInfo.componentStack,
    );
  }

  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
