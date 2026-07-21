interface FatalErrorStateProps {
  onReload: () => void;
}

export function FatalErrorState({
  onReload,
}: FatalErrorStateProps): JSX.Element {
  return (
    <div className="map-fatal-error" role="alert">
      <h2>We couldn&apos;t load the Europe map</h2>
      <p>
        Refresh the page to try the bundled map data again. Your saved maps will
        stay in this browser.
      </p>
      <button type="button" onClick={onReload}>
        Reload Map
      </button>
    </div>
  );
}
