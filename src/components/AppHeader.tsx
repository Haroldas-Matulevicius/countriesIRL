import type { ReactNode } from 'react';

/**
 * D-11 retired the top app bar as a container. This is what is left of it: the
 * panel header, carrying the product identity, the global action group, and
 * `Show Help` inside the tool panel track. Every one of those has a named
 * destination in `03-06`; none of them is deleted here.
 */
interface AppHeaderProps {
  isHelpVisible: boolean;
  isHelpAvailable: boolean;
  /**
   * The desktop global action group (UI-SPEC 8): Undo, Redo, Save or Load Maps,
   * Export PNG. `null` at compact and mobile widths, where the same actions
   * compose as the workspace action strip instead - the header there carries
   * only the product copy and `Show Help` (UI-SPEC 7.4).
   */
  globalActions?: ReactNode;
  onShowHelp: () => void;
}

export function AppHeader({
  isHelpVisible,
  isHelpAvailable,
  globalActions,
  onShowHelp,
}: AppHeaderProps): JSX.Element {
  return (
    <header className="panel-header">
      <div className="panel-header__identity">
        <h1>CountriesIRL Map Generator</h1>
        <p>Color the world, frame your view, and export a polished map.</p>
      </div>
      <div className="panel-header__actions">
        {globalActions}
        <button
          type="button"
          onClick={onShowHelp}
          disabled={!isHelpAvailable}
          aria-controls="onboarding-help"
          aria-expanded={isHelpVisible}
        >
          Show Help
        </button>
      </div>
    </header>
  );
}
