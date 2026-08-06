import { useRef } from 'react';

import { DownloadIcon } from './icons/DownloadIcon';
import { ResetColorsAction } from './ResetColorsAction';

const EXPORT_IDLE_LABEL = 'Export PNG';
const EXPORT_BUSY_LABEL = 'Exporting PNG…';
const EXPORT_GLYPH_SIZE = 20;

/**
 * Where the strip is composed, which decides what it carries (UI-SPEC 3/8/11).
 *
 * - `rail`: the D-13 HUD footer. It carries `Export PNG` and nothing else,
 *   because the rail gives Undo and Redo their own icon rows, `Save or Load
 *   Maps` its own tool, and `Reset All Colors` the Colors panel. Export stays
 *   here rather than being rebuilt in the footer, which is the whole mechanism:
 *   `controls__action--primary` exists in exactly one component, so "exactly
 *   one filled action in the composed DOM" is true by construction rather than
 *   by review.
 * - `app-bar`: the retired desktop app bar action group - Undo, Redo, Save or
 *   Load Maps, Export PNG. D-11 retired its container in `03-05` and `03-06`
 *   retired its last mount site; the variant is kept declared and tested rather
 *   than deleted, because deleting a rendering path is `03-09`'s call to make
 *   when it rewrites the responsive layout.
 * - `strip`: the compact/mobile action strip, which does carry `Reset All
 *   Colors`. Also unmounted as of `03-06` - the rail is present at every width -
 *   and also `03-09`'s to keep or replace with the D-20 bottom sheet.
 *
 * EXACTLY ONE INSTANCE IS MOUNTED AT A TIME. That is not a convention; it is
 * what keeps the accent budget and the single `Reset All Colors` countable.
 */
export type ControlsVariant = 'rail' | 'app-bar' | 'strip';

interface ControlsProps {
  variant: ControlsVariant;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  isMapReady: boolean;
  isStorageAvailable: boolean;
  isExporting: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onOpenSaveLoad: () => void;
  onExport: () => void | Promise<void>;
  onStatusMessage: (message: string) => void;
}

export function Controls({
  variant,
  canUndo,
  canRedo,
  canReset,
  isMapReady,
  isStorageAvailable,
  isExporting,
  onUndo,
  onRedo,
  onReset,
  onOpenSaveLoad,
  onExport,
  onStatusMessage,
}: ControlsProps): JSX.Element {
  const exportActivationLocked = useRef(false);

  // Synchronous activation lock: `isExporting` only becomes true after the
  // owner re-renders, so a second activation in the same tick would otherwise
  // start a second export while the first still holds the camera lease.
  //
  // This only means what it says while `onExport` returns the export's promise.
  // An owner that discards it (`(): void => { void exportPng(); }`) makes the
  // await below resolve one microtask after the click, releasing the lock long
  // before the export finishes. `App.handleExport` returns it deliberately.
  const handleExport = async (): Promise<void> => {
    if (isExporting || exportActivationLocked.current) {
      return;
    }

    exportActivationLocked.current = true;

    try {
      await onExport();
    } finally {
      exportActivationLocked.current = false;
    }
  };

  /*
   * D-13: the rail footer carries the primary action and nothing else. Written
   * as one early return rather than four `variant === 'rail' ? null : …`
   * guards, so the footer's contents are readable as a list of one instead of
   * as the residue of four conditions.
   */
  const exportAction = (
    <button
      type="button"
      data-action="export"
      className="controls__action controls__action--primary"
      onClick={() => void handleExport()}
      disabled={!isMapReady || isExporting}
      aria-busy={isExporting}
    >
      {variant === 'rail' ? <DownloadIcon size={EXPORT_GLYPH_SIZE} /> : null}
      <span className="controls__action-label">
        {isExporting ? EXPORT_BUSY_LABEL : EXPORT_IDLE_LABEL}
      </span>
      {variant === 'rail' ? (
        <span
          className="rail-tooltip"
          data-editor-only="true"
          aria-hidden="true"
        >
          {isExporting ? EXPORT_BUSY_LABEL : EXPORT_IDLE_LABEL}
        </span>
      ) : null}
    </button>
  );

  if (variant === 'rail') {
    return (
      <section
        className="controls controls--rail"
        aria-labelledby="map-actions-heading"
      >
        <h2 className="controls__heading" id="map-actions-heading">
          Map actions
        </h2>
        <div className="controls__actions">{exportAction}</div>
      </section>
    );
  }

  return (
    <section
      className={`controls controls--${variant}`}
      aria-labelledby="map-actions-heading"
    >
      <h2 className="controls__heading" id="map-actions-heading">
        Map actions
      </h2>
      <div className="controls__actions">
        <button
          type="button"
          data-action="undo"
          className="controls__action"
          onClick={onUndo}
          disabled={!isMapReady || !canUndo}
          title="Undo the most recent color change"
        >
          Undo Color Change
        </button>
        <button
          type="button"
          data-action="redo"
          className="controls__action"
          onClick={onRedo}
          disabled={!isMapReady || !canRedo}
          title="Redo the most recently undone color change"
        >
          Redo Color Change
        </button>
        <button
          type="button"
          data-action="save-load"
          data-save-load-control="true"
          className="controls__action"
          onClick={onOpenSaveLoad}
          disabled={!isMapReady || !isStorageAvailable}
        >
          Save or Load Maps
        </button>
        {/*
          Content reset, not camera reset: never beside the period HUD's
          `Reset View`, so the two cannot be read as one pair (D-17, D-18). The
          desktop app bar omits it entirely - UI-SPEC 8 keeps it in the
          selection/color section there.
        */}
        {variant === 'strip' ? (
          <ResetColorsAction
            isDisabled={!isMapReady || !canReset}
            onReset={onReset}
            onStatusMessage={onStatusMessage}
          />
        ) : null}
        {exportAction}
      </div>
    </section>
  );
}
