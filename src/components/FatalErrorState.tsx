import { PERIOD_COPY } from '../utils/periods';

interface FatalErrorStateProps {
  onReload: () => void;
}

export function FatalErrorState({
  onReload,
}: FatalErrorStateProps): JSX.Element {
  return (
    <div className="map-fatal-error" role="alert">
      <h2>{PERIOD_COPY.fatalHeading}</h2>
      <p>{PERIOD_COPY.fatalBody}</p>
      <button type="button" onClick={onReload}>
        {PERIOD_COPY.fatalAction}
      </button>
    </div>
  );
}
