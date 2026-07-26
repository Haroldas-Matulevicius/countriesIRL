export const RESET_STATUS_MESSAGE =
  'All colors reset. Use Undo Color Change to restore them.';

interface ResetColorsActionProps {
  isDisabled: boolean;
  onReset: () => void;
  onStatusMessage: (message: string) => void;
}

/**
 * Content reset, never camera reset (UI-SPEC 8/11). It lives in the
 * selection/color section on desktop and inside the compact action strip, so it
 * is one component rendered in two places rather than two copies that can drift
 * in label, status copy, or disabled logic.
 */
export function ResetColorsAction({
  isDisabled,
  onReset,
  onStatusMessage,
}: ResetColorsActionProps): JSX.Element {
  const handleReset = (): void => {
    onReset();
    onStatusMessage(RESET_STATUS_MESSAGE);
  };

  return (
    <button
      type="button"
      data-action="reset-colors"
      className="controls__action controls__action--destructive"
      onClick={handleReset}
      disabled={isDisabled}
    >
      Reset All Colors
    </button>
  );
}
