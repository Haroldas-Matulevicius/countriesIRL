export const RESET_STATUS_MESSAGE =
  'All colors reset. Use Undo Color Change to restore them.';

/**
 * Where the action is composed, declared rather than inferred.
 *
 * `Controls` set the precedent (`03-06`, D-16): one component with a DECLARED
 * variant, never two copies that drift in label, status copy, or disabled
 * logic. The two variants differ only in treatment, because the surfaces do —
 * the Colors panel is a column of flat sections, the compact strip is a row of
 * peer actions.
 */
export type ResetColorsVariant = 'panel' | 'strip';

interface ResetColorsActionProps {
  isDisabled: boolean;
  onReset: () => void;
  onStatusMessage: (message: string) => void;
  variant?: ResetColorsVariant;
}

/**
 * Content reset, never camera reset (UI-SPEC 8/11). It lives in the Colors
 * panel on desktop and inside the compact action strip, so it is one component
 * rendered in two places rather than two copies.
 *
 * `04-07` (D4-04) made the `panel` variant the Colors panel's fourth and last
 * flat section: **ghost, full width, at the bottom.** Transparent fill,
 * Midnight Ink label, a hairline, hover Porcelain — and no accent, because the
 * panel's one accent is spent on `Apply Color` (D-05). The `--destructive`
 * colour class stays off that variant deliberately: the action is already
 * guarded by `canReset` and by `Undo Color Change`, and a red full-width button
 * at the foot of every Colors session reads as a warning the creator has to
 * dismiss mentally each time. The `strip` variant keeps it, because there the
 * action sits in a row of peers with nothing else to distinguish it.
 *
 * It stays in the Colors panel **at every width** because it is a *content*
 * reset and must never sit beside `Reset View` (assertion 15).
 */
export function ResetColorsAction({
  isDisabled,
  onReset,
  onStatusMessage,
  variant = 'panel',
}: ResetColorsActionProps): JSX.Element {
  const handleReset = (): void => {
    onReset();
    onStatusMessage(RESET_STATUS_MESSAGE);
  };

  const action = (
    <button
      type="button"
      data-action="reset-colors"
      className={
        variant === 'panel'
          ? 'panel-action'
          : 'controls__action controls__action--destructive'
      }
      onClick={handleReset}
      disabled={isDisabled}
    >
      Reset All Colors
    </button>
  );

  if (variant === 'strip') {
    return action;
  }

  return <div className="panel-section">{action}</div>;
}
