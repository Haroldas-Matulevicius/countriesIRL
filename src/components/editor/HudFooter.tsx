import type { ReactNode } from 'react';

interface HudFooterProps {
  /**
   * `Controls variant="rail"` - the rail's ONE Apple Blue surface (D-13, D-05).
   * It arrives as a slot rather than being constructed here so that `Controls`
   * stays one component with a declared variant: a footer that built its own
   * export button would be the second implementation the accent budget is kept
   * true by NOT having.
   */
  readonly exportAction: ReactNode;
  /** D-30. Neutral by contract - the accent is spent on Export. */
  readonly themeToggle?: ReactNode;
}

/**
 * Pinned at the bottom of the rail (D-13), always visible regardless of which
 * tool is open or how far its panel has scrolled. It is a sibling of
 * `.tool-rail__tools` - the only scrolling element in the rail - so "never
 * scrolls away" is structural rather than a styling promise.
 */
export function HudFooter({
  exportAction,
  themeToggle,
}: HudFooterProps): JSX.Element {
  return (
    <div className="tool-rail__footer">
      {exportAction}
      {themeToggle}
    </div>
  );
}
