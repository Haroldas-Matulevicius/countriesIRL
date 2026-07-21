interface AppHeaderProps {
  isHelpVisible: boolean;
  isHelpAvailable: boolean;
  onShowHelp: () => void;
}

export function AppHeader({
  isHelpVisible,
  isHelpAvailable,
  onShowHelp,
}: AppHeaderProps): JSX.Element {
  return (
    <header>
      <div>
        <h1>CountriesIRL Map Generator</h1>
        <p>Color countries and export an Instagram-ready map.</p>
      </div>
      <button
        type="button"
        onClick={onShowHelp}
        disabled={!isHelpAvailable}
        aria-controls="onboarding-help"
        aria-expanded={isHelpVisible}
      >
        Show Help
      </button>
    </header>
  );
}
