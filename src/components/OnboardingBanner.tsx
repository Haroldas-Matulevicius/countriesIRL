interface OnboardingBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  onStartCreating: () => void;
}

export function OnboardingBanner({
  isVisible,
  onDismiss,
  onStartCreating,
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
      <h2 id="onboarding-heading">Create your map</h2>
      <p id="onboarding-description">
        Color countries, move the world to frame your view, and export a square
        PNG with a polished legend.
      </p>
      <ol>
        <li>Select countries and apply colors.</li>
        <li>Move the map or choose a historical period.</li>
        <li>Edit the legend, then export the exact view.</li>
      </ol>
      <div>
        <button type="button" onClick={onStartCreating}>
          Start Creating
        </button>
        <button type="button" onClick={onDismiss}>
          Dismiss Help
        </button>
      </div>
    </aside>
  );
}
