import { useRef } from 'react';

export const RESET_STATUS_MESSAGE =
  'All colors reset. Use Undo Color Change to restore them.';

const EXPORT_IDLE_LABEL = 'Export PNG';
const EXPORT_BUSY_LABEL = 'Exporting PNG…';

interface ControlsProps {
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

  const handleReset = (): void => {
    onReset();
    onStatusMessage(RESET_STATUS_MESSAGE);
  };

  // Synchronous activation lock: `isExporting` only becomes true after the
  // owner re-renders, so a second activation in the same tick would otherwise
  // start a second export while the first still holds the camera lease.
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
    <section className="controls" aria-labelledby="map-actions-heading">
      <h2 id="map-actions-heading">Map actions</h2>
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
          Content reset, not camera reset: it sits in its own destructive group
          inside the inspector, never beside CompositionBar's `Reset View`, so
          the two cannot be read as one pair (D-17, D-18).
        */}
        <button
          type="button"
          data-action="reset-colors"
          className="controls__action controls__action--destructive"
          onClick={handleReset}
          disabled={!isMapReady || !canReset}
        >
          Reset All Colors
        </button>
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
