import { useRef } from 'react';

export const RESET_STATUS_MESSAGE =
  'All colors reset. Use Undo Color Change to restore them.';

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
    <section aria-labelledby="map-actions-heading">
      <h2 id="map-actions-heading">Map actions</h2>
      <div>
        <button
          type="button"
          onClick={onUndo}
          disabled={!isMapReady || !canUndo}
          title="Undo the most recent color change (Ctrl/Cmd+Z)"
        >
          Undo Color Change
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!isMapReady || !canRedo}
          title="Redo the most recently undone color change (Ctrl/Cmd+Shift+Z)"
        >
          Redo Color Change
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!isMapReady || !canReset}
        >
          Reset All Colors
        </button>
        <button
          type="button"
          onClick={onOpenSaveLoad}
          disabled={!isMapReady || !isStorageAvailable}
        >
          Save or Load Maps
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={!isMapReady || isExporting}
          aria-busy={isExporting}
        >
          {isExporting ? 'Exporting PNG…' : 'Export PNG'}
        </button>
      </div>
    </section>
  );
}
