import { useRef } from 'react';

import { ResetColorsAction } from './ResetColorsAction';

const EXPORT_IDLE_LABEL = 'Export PNG';
const EXPORT_BUSY_LABEL = 'Exporting PNG…';

/**
 * Where the strip is composed, which decides whether it carries
 * `Reset All Colors` (UI-SPEC 8/11):
 *
 * - `app-bar`: the desktop app bar action group - Undo, Redo, Save or Load
 *   Maps, Export PNG. `Reset All Colors` is rendered by the selection/color
 *   section instead, so content reset can never be read as a pair with
 *   `Reset View`.
 * - `strip`: the compact/mobile action strip, which does carry it.
 */
export type ControlsVariant = 'app-bar' | 'strip';

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
          Content reset, not camera reset: never beside CompositionBar's
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
        <button
          type="button"
          data-action="export"
          className="controls__action controls__action--primary"
          onClick={() => void handleExport()}
          disabled={!isMapReady || isExporting}
          aria-busy={isExporting}
        >
          {isExporting ? EXPORT_BUSY_LABEL : EXPORT_IDLE_LABEL}
        </button>
      </div>
    </section>
  );
}
