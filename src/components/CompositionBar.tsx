import { useCallback } from 'react';
import type { ChangeEvent } from 'react';

import type { SnapshotId } from '../types/composition';
import { PERIOD_COPY, type PeriodOption } from '../utils/periods';

export const COMPOSITION_PERIOD_SELECT_ID = 'composition-bar-period';
export const COMPOSITION_PERIOD_STATUS_ID = 'composition-bar-period-status';
export const MAP_PREVIEW_LABEL_ID = 'map-preview-label';

interface CompositionBarProps {
  /**
   * Resolved from the live catalog by the owner. The bar never fetches: it has
   * no way to tell an approved period from an unreviewed one.
   */
  periods: ReadonlyArray<PeriodOption>;
  selectedPeriodId: SnapshotId;
  statusMessage: string;
  isPeriodDisabled: boolean;
  isResetViewDisabled: boolean;
  onPeriodChange: (snapshotId: SnapshotId) => void;
  onResetView: () => void;
  /** Present only while a period load has failed and can be retried. */
  onRetryPeriod?: (() => void) | undefined;
}

export function CompositionBar({
  periods,
  selectedPeriodId,
  statusMessage,
  isPeriodDisabled,
  isResetViewDisabled,
  onPeriodChange,
  onResetView,
  onRetryPeriod,
}: CompositionBarProps): JSX.Element {
  const handlePeriodChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onPeriodChange(event.currentTarget.value as SnapshotId);
    },
    [onPeriodChange],
  );

  return (
    <div className="composition-bar" data-editor-only="true">
      <div className="composition-bar__row">
        <p className="composition-bar__preview" id={MAP_PREVIEW_LABEL_ID}>
          {PERIOD_COPY.previewLabel}
        </p>

        <div className="composition-bar__period">
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

        <button
          type="button"
          className="composition-bar__reset-view"
          disabled={isResetViewDisabled}
          onClick={onResetView}
        >
          {PERIOD_COPY.resetView}
        </button>
      </div>

      <p
        className="composition-bar__status"
        id={COMPOSITION_PERIOD_STATUS_ID}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
        {onRetryPeriod === undefined ? null : (
          <button
            type="button"
            className="composition-bar__retry"
            onClick={onRetryPeriod}
          >
            {PERIOD_COPY.retryPeriod}
          </button>
        )}
      </p>
    </div>
  );
}
