import { useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';

const LEGEND_PANEL_ID = 'legend-editor-panel';
const EMPTY_LEGEND_SUMMARY = 'Appears after you add color';
const LEGEND_ADDED_MESSAGE = 'Legend added. Open Legend to edit labels.';

interface LegendDisclosureProps extends PropsWithChildren {
  entryCount: number;
  positionLabel: string;
  /**
   * Owned by `App`: the 1200px transition remounts this subtree, so a panel
   * the user opened would otherwise snap shut on resize.
   */
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  onStatusMessage?: (message: string) => void;
}

export function getLegendDisclosureSummary(
  entryCount: number,
  positionLabel: string,
): string {
  return entryCount === 0
    ? EMPTY_LEGEND_SUMMARY
    : `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} · ${positionLabel}`;
}

export function LegendDisclosure({
  entryCount,
  positionLabel,
  isExpanded,
  onExpandedChange,
  onStatusMessage,
  children,
}: LegendDisclosureProps): JSX.Element {
  const previousEntryCountRef = useRef(entryCount);

  useEffect((): void => {
    if (previousEntryCountRef.current === 0 && entryCount > 0) {
      onStatusMessage?.(LEGEND_ADDED_MESSAGE);
    }
    previousEntryCountRef.current = entryCount;
  }, [entryCount, onStatusMessage]);

  return (
    <section className="legend-disclosure" aria-labelledby="legend-disclosure-label">
      <button
        id="legend-disclosure-label"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={LEGEND_PANEL_ID}
        onClick={(): void => onExpandedChange(!isExpanded)}
      >
        <span>Legend</span>
        <span>{getLegendDisclosureSummary(entryCount, positionLabel)}</span>
      </button>
      {isExpanded ? <div id={LEGEND_PANEL_ID}>{children}</div> : null}
    </section>
  );
}
