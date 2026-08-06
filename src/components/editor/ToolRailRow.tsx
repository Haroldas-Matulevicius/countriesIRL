import { useCallback, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';

import { prefersReducedMotion } from '../../utils/motion';

/**
 * The subset of every vendored icon's imperative handle that the rail drives.
 *
 * Structurally identical to `PaletteIconHandle`, `ListIconHandle`, and the
 * rest, which is what lets one row component own the ref for any of them
 * without the row importing all fourteen icon types.
 */
export interface ToolRailIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ToolRailRowProps {
  /**
   * Stable identity for CSS and for locators. Assertion 16 forbids styling a
   * rail row by its position, and a rail of near-identical icon rows is the
   * ideal place to reintroduce that bug: the rows differ only by order until
   * they carry this.
   */
  readonly rowId: string;
  /** The accessible name and the tooltip text. The rail is icon-only at 56px. */
  readonly label: string;
  /** Omitted entirely for the pinned non-tool rows, which expand nothing. */
  readonly isExpanded?: boolean;
  readonly controlsId?: string;
  readonly isDisabled?: boolean;
  readonly renderIcon: (iconRef: RefObject<ToolRailIconHandle>) => ReactNode;
  readonly onActivate: () => void;
  readonly rowRef?: (element: HTMLButtonElement | null) => void;
}

/**
 * The signature component (D-16, D-29), translated from Themely's
 * `PrimaryNavRow` - never copied. CountriesIRL has no Tailwind, so a copied
 * `className` string produces an element that looks wired up and renders
 * unstyled (P-5). The utility-to-CSS translation lives in `editor.css`.
 *
 * Three binding behaviours, each a decision rather than a default:
 *
 * 1. **Hover paint is instant.** No transition on the row background; Themely
 *    calls an ease here "a regression, not polish". Only the glyph animates.
 * 2. **Colour is constant** across inactive / hover / active. No accent bar, no
 *    blue active icon, no weight bump - only the background carries state.
 * 3. The glyph animation is triggered from **row** hover through the imperative
 *    handle, not from icon hover. `startAnimation()` is reduced-motion-gated;
 *    `stopAnimation()` is unconditional, because a glyph left mid-animation
 *    when the preference flips is a stuck animation, not a respected
 *    preference.
 *
 * The row is a plain tab stop. It does NOT write a roving `tabindex`: there is
 * exactly one roving-tabindex writer in this app, restored in commit `074173e`,
 * and a second is the regression class that commit fixed (assertion 27).
 */
export function ToolRailRow({
  rowId,
  label,
  isExpanded,
  controlsId,
  isDisabled = false,
  renderIcon,
  onActivate,
  rowRef,
}: ToolRailRowProps): JSX.Element {
  const iconRef = useRef<ToolRailIconHandle>(null);

  const handleMouseEnter = useCallback((): void => {
    if (prefersReducedMotion()) {
      return;
    }
    iconRef.current?.startAnimation();
  }, []);

  const handleMouseLeave = useCallback((): void => {
    iconRef.current?.stopAnimation();
  }, []);

  return (
    <button
      ref={rowRef}
      type="button"
      className="tool-rail__row"
      data-tool={rowId}
      aria-label={label}
      aria-expanded={isExpanded}
      aria-controls={controlsId}
      disabled={isDisabled}
      onClick={onActivate}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="tool-rail__row-icon">{renderIcon(iconRef)}</span>
      <span className="rail-tooltip" data-editor-only="true" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
