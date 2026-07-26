import type { ReactNode } from 'react';

interface AppHeaderProps {
  isHelpVisible: boolean;
  isHelpAvailable: boolean;
  /**
   * The desktop app bar action group (UI-SPEC 8): Undo, Redo, Save or Load
   * Maps, Export PNG. `null` at compact and mobile widths, where the same
   * actions compose as the workspace action strip instead - the app bar there
   * carries only the product copy and `Show Help` (UI-SPEC 7.4).
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
    <header>
      <div className="app-bar__identity">
        <h1>CountriesIRL Map Generator</h1>
        <p>Color the world, frame your view, and export a polished map.</p>
      </div>
      <div className="app-bar__actions">
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
