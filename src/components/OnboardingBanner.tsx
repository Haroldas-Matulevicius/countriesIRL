interface OnboardingBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  onStartColoring: () => void;
}

export function OnboardingBanner({
  isVisible,
  onDismiss,
  onStartColoring,
}: OnboardingBannerProps): JSX.Element | null {
  if (!isVisible) {
    return null;
  }

  return (
    <aside
      id="onboarding-help"
      aria-labelledby="onboarding-heading"
      aria-describedby="onboarding-description"
    >
      <h2 id="onboarding-heading">Start your map</h2>
      <p id="onboarding-description">
        Select countries, choose a color, then export a square PNG for
        Instagram.
      </p>
      <ol>
        <li>Select one country on the map or several from the list.</li>
        <li>Choose a preset or enter a custom color.</li>
        <li>Export PNG when the map is ready.</li>
      </ol>
      <div>
        <button type="button" onClick={onStartColoring}>
          Start Coloring
        </button>
        <button type="button" onClick={onDismiss}>
          Dismiss Help
        </button>
      </div>
    </aside>
  );
}
