import { useCallback } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { getToolLabel } from '../../constants/tools';
import type { ToolId } from '../../types/ui';

interface ToolPanelProps {
  readonly panelId: string;
  readonly openTool: ToolId | null;
  /**
   * `workspace--desktop` / `workspace--compact`. `03-05` kept these as naming
   * hooks with no container styling behind them, because `03-09` still keys the
   * responsive suite on them and owns their replacement.
   */
  readonly layoutModifier: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * The single flyout (D-17, D-19). 280px, reserving a layout track rather than
 * overlaying the map, with at most one tool open at a time.
 *
 * The body is UNMOUNTED while the track is 0px. A clipped 0px column still
 * holds live tab stops otherwise, which is a keyboard trap with nothing visible
 * in it.
 *
 * `.tool-panel__body` is the one scroll container in this column; the title row
 * sticks to its top rather than living outside it, so the landed scroll-
 * containment claim (`overflow-y: auto` + `overscroll-behavior: contain` on the
 * body) keeps exactly one subject.
 */
export function ToolPanel({
  panelId,
  openTool,
  layoutModifier,
  onClose,
  children,
}: ToolPanelProps): JSX.Element {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== 'Escape') {
        return;
      }
      // Only when something is open: an Escape that closes nothing must still
      // reach whatever else is listening for it.
      if (openTool === null) {
        return;
      }
      event.stopPropagation();
      onClose();
    },
    [onClose, openTool],
  );

  const label = openTool === null ? null : getToolLabel(openTool);

  /*
   * The panel track IS the workspace landmark. It stays mounted at every panel
   * state, so the document never loses its `main` - the landmark used to sit
   * inside the panel body, which `03-06` unmounts whenever the track is 0px,
   * and a landmark that comes and goes with a tool is a landmark a screen
   * reader user cannot rely on. Empty is fine; absent is not.
   */
  return (
    <main
      className={`tool-panel ${layoutModifier}`}
      id={panelId}
      data-editor-only="true"
      aria-label="Map creator workspace"
      onKeyDown={handleKeyDown}
    >
      {openTool === null || label === null ? null : (
        <div className="tool-panel__body" data-tool-panel={openTool}>
          <div className="tool-panel__title-row">
            <h2 className="tool-panel__title">{label}</h2>
            <button
              type="button"
              className="tool-panel__close tool-rail__action"
              aria-label={`Close ${label}`}
              onClick={onClose}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="tool-panel__content">{children}</div>
        </div>
      )}
    </main>
  );
}
