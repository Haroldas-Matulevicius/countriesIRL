import { useCallback } from 'react';
import type { ChangeEvent } from 'react';

import type { SnapshotId } from '../../types/composition';
import {
  MODERN_PERIOD_OPTION,
  PERIOD_COPY,
  type PeriodOption,
} from '../../utils/periods';

/*
 * Both ids are BYTE-IDENTICAL to their Phase 2 values on purpose. The status id
 * is a `role="status"` live region AND the period control's `aria-describedby`
 * target, and it is referenced by assertions and by the e2e fixture through the
 * select id. Renaming either to match this component's name would orphan the
 * description with no visual signal at all (D-15, assertion 14).
 */
export const COMPOSITION_PERIOD_SELECT_ID = 'composition-bar-period';
export const COMPOSITION_PERIOD_STATUS_ID = 'composition-bar-period-status';
export const MAP_PREVIEW_LABEL_ID = 'map-preview-label';

interface PeriodHudProps {
  /**
   * Resolved from the live catalog by the owner (`useSnapshotCatalog` over the
   * approved manifest). The HUD never fetches and never reads the label
   * registry: it has no way to tell an approved period from a deferred one, so
   * rendering anything but these resolved options would make a deferred
   * snapshot nameable in the UI (Immutable Safety Constraint 3).
   */
  periods: ReadonlyArray<PeriodOption>;
  selectedPeriodId: SnapshotId;
  statusMessage: string;
  isPeriodDisabled: boolean;
  onPeriodChange: (snapshotId: SnapshotId) => void;
  /** Present only while a period load has failed and can be retried. */
  onRetryPeriod?: (() => void) | undefined;
}

/**
 * The `.period-hud` surface in the CANVAS region (D-14, D-15). `CompositionBar`
 * dissolved here: identity went to the HUD header in `03-06`; the period
 * surface, the preview label, and the period status live region land here.
 *
 * `Reset View` was an INTERIM tenant of this surface and left in `03-08` for
 * the floating cluster, which is its D-21 home. Nothing in this file may
 * reintroduce it: `Reset View` is camera chrome and belongs beside the other
 * camera controls, and a second copy would break the singleton assertion 15
 * counts.
 *
 * It lives in the canvas region, NOT in the rail, because the status region is
 * an `aria-describedby` target as well as a live region and must sit next to
 * the control it describes.
 *
 * With exactly one resolved option the surface is a visibly inert read-only
 * pill - no dropdown affordance, no chevron, no "coming soon", no count of
 * hidden periods. The interactive `<select>` path below stays reachable in
 * code: if a second approved entry ever reaches the manifest, the surface
 * returns to a select with no copy change.
 */
export function PeriodHud({
  periods,
  selectedPeriodId,
  statusMessage,
  isPeriodDisabled,
  onPeriodChange,
  onRetryPeriod,
}: PeriodHudProps): JSX.Element {
  const handlePeriodChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onPeriodChange(event.currentTarget.value as SnapshotId);
    },
    [onPeriodChange],
  );

  const isInertPill = periods.length <= 1;
  const soleLabel = periods[0]?.label ?? MODERN_PERIOD_OPTION.label;

  return (
    <div className="period-hud" data-editor-only="true">
      {/*
        The workspace landmark's accessible name (`aria-labelledby` on
        `section.map-workspace`). Visually hidden, never `display: none`, so the
        landmark keeps its name in the accessibility tree.
      */}
      <p className="period-hud__preview" id={MAP_PREVIEW_LABEL_ID}>
        {PERIOD_COPY.previewLabel}
      </p>

      <div className="period-hud__row">
        {isInertPill ? (
          /*
            One approved option: an inert read-only pill, not a disabled
            select. `aria-describedby` still points at the status region, so
            the surface keeps its accessible description across both shapes.
          */
          <div
            className="period-hud__pill"
            aria-describedby={COMPOSITION_PERIOD_STATUS_ID}
          >
            <span className="period-hud__eyebrow">
              {PERIOD_COPY.periodLabel}
            </span>
            <span className="period-hud__value">{soleLabel}</span>
          </div>
        ) : (
          <div className="period-hud__period">
            <label htmlFor={COMPOSITION_PERIOD_SELECT_ID}>
              {PERIOD_COPY.periodLabel}
            </label>
            <select
              id={COMPOSITION_PERIOD_SELECT_ID}
              value={selectedPeriodId}
              disabled={isPeriodDisabled}
              aria-describedby={COMPOSITION_PERIOD_STATUS_ID}
              onChange={handlePeriodChange}
            >
              {periods.map(
                (period): JSX.Element => (
                  <option key={period.id} value={period.id}>
                    {period.label}
                  </option>
                ),
              )}
            </select>
          </div>
        )}
      </div>

      <p
        className="period-hud__status"
        id={COMPOSITION_PERIOD_STATUS_ID}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
        {onRetryPeriod === undefined ? null : (
          <button
            type="button"
            className="period-hud__retry"
            onClick={onRetryPeriod}
          >
            {PERIOD_COPY.retryPeriod}
          </button>
        )}
      </p>
    </div>
  );
}
